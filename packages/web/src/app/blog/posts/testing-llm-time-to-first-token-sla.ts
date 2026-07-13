import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing an LLM Time-to-First-Token SLA',
  description:
    'Test an LLM time-to-first-token SLA with precise streaming boundaries, controlled workloads, percentile gates, concurrency, warmups, and diagnostic telemetry.',
  date: '2026-07-13',
  category: 'Performance',
  content: `
# Testing an LLM Time-to-First-Token SLA

The HTTP response opens in 180 ms, a stream event arrives at 420 ms, and visible answer text does not appear until 1.7 seconds. Which number is time to first token? Unless the service-level objective names its start and finish events precisely, three teams can report three different green dashboards for the same sluggish interaction.

Time to first token (TTFT) is a boundary metric for streaming generation. It includes work before useful output reaches the client: connection and request transport, admission control, prompt processing, model scheduling, and initial decoding. It normally excludes the time required to finish the answer. Testing it well requires a defined clock, a representative workload, and enough samples to evaluate a percentile rather than a memorable fastest run.

## Define the clock in observable events

Start at the instant the client begins the measured request, after any test-only fixture construction. Stop at the first stream item containing user-visible generated text. Do not stop on HTTP headers, a keepalive, a role-only delta, usage metadata, or a provider event that contains no text.

| Boundary choice | Suitable for an end-user TTFT SLO? | Reason |
|---|---:|---|
| Request method invoked -> first non-empty text delta read | Yes, for client-observed service | Includes transport and queueing visible to the caller |
| Server receives request -> first token written | Useful server metric | Excludes client network and connection setup |
| Headers received -> first text | Diagnostic segment only | Omits admission and pre-header delay |
| Request start -> first SSE event of any kind | Usually no | Metadata or heartbeat can arrive before content |
| Request start -> complete response | No | That is end-to-end latency, not TTFT |

Specify whether connection establishment is in scope. A browser user may reuse an HTTP/2 connection, while a cold command-line client pays DNS, TCP, and TLS. Both are real, but they answer different questions. A product SLA might measure a realistic mix; a model-serving SLO may begin at the gateway after transport.

Document cancellation behavior too. Once the first token is observed, the harness can continue consuming the stream to avoid leaving connections and billed generation hanging, or it can cancel if the provider supports safe cancellation and the test's purpose is TTFT only. The policy changes cost and server load.

## Measure useful text with the streaming client

The following Python function uses the official-style \`AsyncOpenAI\` chat completions streaming interface. It records a monotonic start, waits for the first non-empty \`delta.content\`, drains the stream, and returns both TTFT and full completion latency. The model is supplied by environment so the test does not invent a deployment name.

\`\`\`python
import asyncio
import os
import time
from dataclasses import dataclass

from openai import AsyncOpenAI


@dataclass(frozen=True)
class Timing:
    ttft_ms: float
    total_ms: float
    characters: int


async def measure_once(client: AsyncOpenAI, prompt: str) -> Timing:
    started = time.perf_counter()
    first_text_at: float | None = None
    text_parts: list[str] = []

    stream = await client.chat.completions.create(
        model=os.environ["OPENAI_MODEL"],
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=120,
        stream=True,
    )

    async for chunk in stream:
        content = chunk.choices[0].delta.content if chunk.choices else None
        if content:
            if first_text_at is None:
                first_text_at = time.perf_counter()
            text_parts.append(content)

    finished = time.perf_counter()
    if first_text_at is None:
        raise AssertionError("stream completed without a text delta")

    return Timing(
        ttft_ms=(first_text_at - started) * 1000,
        total_ms=(finished - started) * 1000,
        characters=len("".join(text_parts)),
    )


async def main() -> None:
    timing = await measure_once(AsyncOpenAI(), "Explain row-level locking in three sentences.")
    print(timing)


if __name__ == "__main__":
    asyncio.run(main())
\`\`\`

Pin the client-library version in the real test environment. Streaming event shapes can differ across endpoints, providers, and SDK generations. If your production application uses another endpoint, measure through that same path rather than copying this client solely for the benchmark.

Do not use wall-clock time such as \`datetime.now()\` for durations. A monotonic performance counter is not disturbed by clock synchronization. Store wall-clock timestamps separately if correlation with server logs is needed.

## Design a workload that exercises prompt processing

TTFT grows with input length because the model must process the prompt before generating. It also changes with cached prefixes, model size, region, tool definitions, image inputs, safety processing, and queue depth. One ten-word prompt cannot represent a RAG application that regularly submits 12,000 tokens of context.

Build workload classes from production traces after removing sensitive content. If traces are unavailable, create synthetic prompts with known token bands and realistic structure. Tokenize using the deployed model's tokenizer where possible; character counts are a weak proxy across languages and code.

| Workload class | Controlled dimensions | Product question |
|---|---|---|
| Short chat | Small system prompt, under a few hundred input tokens | Is basic interaction immediately responsive? |
| RAG median | Typical retrieved chunk count and prompt length | Does the normal answer path meet the target? |
| RAG high percentile | Long accepted context near operational limit | Is prompt ingestion bounded for heavy queries? |
| Tool-enabled request | Same declared tools as production | Does schema processing add unacceptable delay? |
| Multilingual slice | Representative scripts and token counts | Are language-specific paths materially slower? |
| Prefix-cache hit and miss | Identical stable prefix versus changed prefix | Is the SLO relying on cache behavior? |

Fix output limits so total cost is controlled, but remember output length should have limited direct effect on the first token. A large requested maximum may still influence provider scheduling or policy, so match production settings. Set temperature consistently to reduce content variation, though decoding infrastructure can remain nondeterministic.

## Warm, cold, and cached measurements answer different questions

The first request after a deployment may load weights, establish connections, populate DNS, or initialize an application client. Excluding it can hide the experience during scale-from-zero. Including one cold request in a mostly warm sample can also make a percentile unstable.

Report cold-start scenarios separately. For steady-state TTFT, perform warmup requests that are not included in the sample and then preserve the same connection behavior production uses. For prefix caching, use distinct prompt groups so an accidental cache hit does not make every test look excellent.

Do not warm by sending the exact measured prompt repeatedly unless that is representative. A provider may cache prompt prefixes or complete responses. Use controlled unique suffixes and record whether the test intends a hit or miss. Unique text should not include timestamps in a way that changes token count unpredictably.

## Load changes TTFT through queueing

A serial loop measures an idle service. An SLA that applies under 25 concurrent conversations must be exercised near that concurrency with an arrival pattern the system expects. Closed-loop workers, where each user sends the next request after the prior one completes, can understate queueing because slow responses automatically reduce offered load. An open arrival-rate test exposes overload more directly but requires careful rate control.

The next script executes bounded concurrent measurements, computes a nearest-rank percentile, and fails if either errors occur or p95 exceeds the configured budget. For a serious load test, use the same measurement logic in a load framework and retain every sample rather than relying on one process.

\`\`\`python
import asyncio
import math
import os

from openai import AsyncOpenAI


def percentile(values: list[float], percentile_value: float) -> float:
    ordered = sorted(values)
    index = max(0, math.ceil(percentile_value / 100 * len(ordered)) - 1)
    return ordered[index]


async def run_workload(samples: int, concurrency: int) -> list[Timing]:
    client = AsyncOpenAI()
    semaphore = asyncio.Semaphore(concurrency)

    async def one(sample_id: int) -> Timing:
        async with semaphore:
            prompt = (
                "Summarize the transaction isolation notes below in four bullets. "
                + "Serializable execution may abort conflicting transactions. " * 80
                + "Sample identifier: "
                + str(sample_id)
            )
            return await measure_once(client, prompt)

    return await asyncio.gather(*(one(sample_id) for sample_id in range(samples)))


async def assert_sla() -> None:
    timings = await run_workload(samples=60, concurrency=6)
    p95 = percentile([timing.ttft_ms for timing in timings], 95)
    budget = float(os.environ.get("TTFT_P95_BUDGET_MS", "2500"))
    print({"samples": len(timings), "ttft_p95_ms": round(p95, 1), "budget_ms": budget})
    if p95 > budget:
        raise AssertionError(f"TTFT p95 {p95:.1f} ms exceeded {budget:.1f} ms")


if __name__ == "__main__":
    asyncio.run(assert_sla())
\`\`\`

The default 2,500 ms in the example is illustrative, not a universal recommendation. Set the environment value from the published service objective. Sixty samples provide only coarse tail evidence; a release-grade run should use enough observations for a stable target percentile and report uncertainty or repeated-run variation.

## Percentile gates need an error policy

Decide whether failed streams are excluded, assigned an infinite latency, or gated separately. Silently dropping them makes the remaining TTFT distribution look better as reliability worsens. A clear policy is to require an error-rate ceiling and compute TTFT only for successful streams, with both results reported together.

Small samples make p99 nearly equivalent to the maximum and highly volatile. If CI cannot afford enough requests, gate p90 or p95 in a controlled environment and monitor p99 continuously in production. Avoid averaging percentiles from separate workers. Merge raw histograms or samples with compatible buckets, then calculate the aggregate.

Track median as well as the tail. A candidate can improve p95 by shedding slow requests while making the common experience worse, or improve the median while worsening queue saturation. The full distribution gives reviewers context.

## Segment TTFT to find the owner

Client-observed TTFT is the contract, but it does not identify the bottleneck. Add server timestamps or trace spans for gateway admission, authentication, retrieval, prompt assembly, provider request start, response headers, and first text forwarded. Keep one authoritative end-to-end measurement and use segments for diagnosis.

| Segment increase | Likely area | Confirming signal |
|---|---|---|
| DNS/TLS/connect | Network path or connection reuse | Connection timing and pool state |
| Gateway queue | Rate limiter or worker saturation | Admission queue depth |
| Retrieval before model call | Vector store or reranker | Retrieval span duration |
| Provider request to headers | Scheduling, prompt ingestion, or provider queue | Provider and model telemetry |
| Headers to first text | Stream buffering or initial decoding | Raw event timestamps at both hops |
| Server first text to client read | Proxy buffering or client backpressure | Matched trace timestamps |

Some reverse proxies buffer streaming responses. A model can produce quickly while the browser receives a batch seconds later. Test through the production ingress and CDN path, not only against the model gateway on localhost.

## Keep network geography explicit

TTFT measured from a runner next to the model endpoint excludes the round trip users pay. Run at least one service benchmark in a stable near-region environment for regression sensitivity, then geographic probes from important user regions for the external objective.

Record runner region, model region, endpoint, protocol, connection reuse, and proxy path. Do not compare a laptop over Wi-Fi with a data-center baseline. For cross-provider evaluation, hold the client location and workload constant and state what cannot be controlled.

Network jitter can dominate small model improvements. Repeated runs and a stable runner help. If a release gate fails only from one region, compare server-side first-token timestamps to client readings before attributing the regression to inference.

## Prevent benchmark traffic from contaminating itself

Use dedicated quotas or carefully bounded schedules. A performance job that runs alongside another load test can create its own regression. Tag requests through supported metadata or headers so server telemetry can identify the cohort, without changing routing or priority compared with production.

Randomize workload order to prevent every long prompt from running during the hottest period. Keep the exact corpus and runner code versioned. Store raw results with model revision, endpoint configuration, deployment ID, and concurrency so a failed comparison can be reproduced.

Cost is part of test design. Drain only as many output tokens as needed to exercise realistic streaming, and budget benchmark spend. The [LLM evaluation cost and latency guide](/blog/llm-eval-cost-latency-testing-guide-2026) connects this performance metric to broader model tradeoffs.

## Put TTFT in CI at the right cadence

Per-commit remote-model performance gates are noisy, slow, and potentially expensive. Use a layered schedule. Unit tests validate event parsing and the “first non-empty text” rule with a fake stream. A small deployment smoke detects gross buffering or configuration failures. A larger scheduled or pre-release run evaluates percentiles under controlled concurrency.

Compare against both an absolute SLA and a recent stable baseline. The absolute threshold protects users; the relative threshold catches a smaller regression before it consumes the remaining budget. Require repeated confirmation for marginal failures, but fail immediately for severe breaches or reliability errors.

The [load testing CI/CD integration guide](/blog/load-testing-ci-cd-integration-guide) describes how to isolate runners, archive artifacts, and manage release gates. For LLM streams, include prompt bands and provider revisions in that artifact set.

## Investigate a TTFT breach before tuning the threshold

First verify the measurement endpoint still stops on text, not a new metadata event. Split results by workload class, region, connection state, and model deployment. Compare total latency: if TTFT rises but completion time does not, initial queueing or buffering is likely; if both rise, broader capacity or model changes may be involved.

Check error and cancellation rates. Inspect queue depth, prompt token counts, cache hit rate, retrieval duration, and proxy buffering. Reproduce with a raw streaming client near the service and through the user-facing edge. Change the budget only when the user expectation or workload contract changed, not because the new release missed it.

## Relate transport TTFT to perceived rendering

The first text read by a benchmark client may still precede pixels in the user interface. A web application can buffer deltas, batch state updates, parse markdown, or wait for a sentence before rendering. Add a browser measurement from user action to the first non-empty answer node when perceived responsiveness is the product promise.

Keep both metrics. Transport TTFT isolates the service contract, while time to first rendered text includes frontend scheduling and rendering. If the service remains stable and the browser metric regresses, inspect stream parsing and update cadence rather than adding model capacity.

Avoid using a typing animation as the stop event unless that animation represents actual content availability. Some interfaces intentionally reveal already-buffered text character by character. In that case, record first rendered text and the buffering delay as separate spans so visual design does not get attributed to inference.

## Validate the harness with synthetic streams

Before trusting percentile output, feed the parser a deterministic sequence containing headers, an empty delta, a role-only event, a delayed text event, and a normal finish. Assert that only the text event stops the TTFT clock. Add a stream that never emits text and confirm it counts as an error rather than a zero or missing sample.

Test chunk fragmentation too. Unicode characters and JSON events can be split across transport reads below the SDK layer. If the production benchmark parses SSE itself, use a standards-aware parser and test fragmented frames. A naive line splitter can report parse failures under real packet boundaries.

Finally, introduce a known delay before the first text and confirm the measured distribution shifts by approximately that amount within scheduler tolerance. This calibration catches clocks started after request admission or stopped on the wrong event.

## Frequently Asked Questions

### Does the first SSE event count as the first token?

Only if it contains the user-visible text your definition names. Role metadata, heartbeats, empty deltas, and usage events should not stop a text TTFT clock.

### Should connection setup be included in TTFT?

Include it for client-observed measurements in the proportion users experience it. Exclude or segment it for a server-internal inference SLO. State the choice so results remain comparable.

### Can I gate p99 with fifty requests?

That makes p99 effectively the slowest observation and produces unstable evidence. Gather a much larger sample, or gate a lower percentile in CI and monitor p99 with sustained production volume.

### Why is TTFT fast locally but slow through the application URL?

Retrieval, authentication, gateway queues, geographic distance, and response buffering exist on the application path. Compare timestamped segments and test through the same ingress used by clients.

### Do I need to consume the stream after recording the first token?

Usually yes, unless safe cancellation is part of the test. Draining avoids abandoned generation, connection leaks, and distorted server load. Keep output limits controlled so the measurement remains affordable.
`,
};
