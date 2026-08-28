import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Guardrail Latency in LLM Pipelines: Budgets and Degradation',
  description: 'Guardrail latency LLM testing guide for setting budgets, measuring overhead, and degrading safely when moderation and policy checks slow down.',
  date: '2026-08-28',
  category: 'AI Testing',
  content: `
# Testing Guardrail Latency in LLM Pipelines: Budgets and Degradation

Guardrail latency in an LLM pipeline is the time added by safety, policy, retrieval, validation, and tool-permission checks before, during, or after model generation. Testing it means measuring that added time separately from model latency, enforcing budgets for each guardrail stage, and proving the product degrades predictably when those checks are slow or unavailable.

For QA engineers, the winning move is not one big end-to-end timer. You need stage timers, percentile budgets, concurrency tests, failure injection, and assertions about user-visible behavior. A pipeline can be safe and still unusable if guardrails turn every answer into a queue.

## Build A Latency Map Before You Set Budgets

Start by naming every place where a request can wait. Most teams talk about "the guardrail" as if it is one box. It is usually several boxes: input moderation, prompt-injection screening, policy classification, retrieval filtering, tool authorization, output moderation, structured-output validation, and audit logging. Some run in parallel. Some block the model. Some can run after the response is streamed.

A useful latency map separates wall-clock user wait from background cost. If an audit write happens after the response returns, it belongs in reliability and data-loss testing, not in the visible latency budget. If output moderation blocks token release, it belongs in the user wait budget even if the model already finished.

| Stage | Blocks user response | Typical measurement | Test concern |
|---|---:|---|---|
| Input moderation | Yes | request start to moderation result | Cold starts, provider retries, timeout handling |
| Prompt-injection screening | Usually yes | screening call duration | Long prompts, multilingual attacks, malformed markup |
| Retrieval filtering | Yes when RAG is enabled | filter duration plus vector query delay | High fan-out, empty allowlists, slow metadata joins |
| Tool authorization | Yes before tool call | policy lookup duration | Cache misses, tenant-scoped permissions |
| Output moderation | Often yes | model finish to release decision | Stream buffering, blocked partial output |
| Audit logging | Usually no | enqueue or write duration | Backpressure, dropped events, privacy fields |

The table is not paperwork. It tells you where degradation is allowed. Input moderation cannot be skipped for most public products. Audit logging might be queued. Tool authorization might fall back to "deny tool call, answer without action." Retrieval filtering might fall back to fewer documents. Output moderation might switch to sentence-level streaming if your safety model supports it. The details depend on your risk model, but the QA shape is the same: every stage gets an explicit policy.

Use three budgets per stage:

| Budget | Meaning | Example action when exceeded |
|---|---|---|
| Target | The number you expect under normal load | Track regression, do not fail the request |
| SLO ceiling | The number that should almost never be crossed | Fail CI performance gate or alert |
| Timeout | The hard stop that triggers fallback | Return degraded answer, deny action, or ask user to retry |

Target budgets help teams see drift. SLO ceilings catch user harm. Timeouts protect capacity. Do not collapse those three into one value. A 300 ms target, 900 ms p95 ceiling, and 1500 ms timeout express a much better operating contract than "moderation must be fast."

Here is a minimal budget file that is specific enough to test:

\`\`\`yaml
pipeline: support-agent
visible_response_budget_ms: 4500
stages:
  input_moderation:
    target_p95_ms: 250
    slo_p95_ms: 600
    timeout_ms: 1000
    timeout_policy: block_with_retry_message
  injection_screen:
    target_p95_ms: 180
    slo_p95_ms: 450
    timeout_ms: 700
    timeout_policy: continue_without_tools
  retrieval_filter:
    target_p95_ms: 300
    slo_p95_ms: 800
    timeout_ms: 1200
    timeout_policy: answer_from_model_only
  tool_authorization:
    target_p95_ms: 80
    slo_p95_ms: 200
    timeout_ms: 300
    timeout_policy: deny_tool
  output_moderation:
    target_p95_ms: 220
    slo_p95_ms: 700
    timeout_ms: 1000
    timeout_policy: safe_completion_message
\`\`\`

That file gives QA something to automate. It also forces product and safety owners to say what the user should see when latency goes bad.

## Measure Guardrail Overhead, Not Just Request Time

End-to-end p95 matters, but it hides the cause. If p95 jumps from 3 seconds to 7 seconds, you need to know whether the model slowed down, the input screen started retrying, the retrieval filter hit a new database path, or output moderation began buffering entire responses.

Instrument guardrails as spans or structured events. Each event needs a stable stage name, start time, duration, outcome, timeout flag, fallback name, model or service identifier when allowed, and request correlation id. Avoid high-cardinality payloads such as full prompt text, user email, document id lists, or raw policy reason strings. Your metrics can answer latency questions without leaking sensitive material.

\`\`\`ts
type GuardrailStage =
  | "input_moderation"
  | "injection_screen"
  | "retrieval_filter"
  | "tool_authorization"
  | "output_moderation";

type GuardrailEvent = {
  requestId: string;
  stage: GuardrailStage;
  durationMs: number;
  outcome: "allow" | "block" | "degrade" | "error";
  timedOut: boolean;
  fallback: "none" | "deny_tool" | "model_only" | "retry_message" | "safe_message";
};

export function recordGuardrailEvent(event: GuardrailEvent): void {
  if (event.durationMs < 0) {
    throw new Error("durationMs must be non-negative");
  }

  console.log(JSON.stringify({
    type: "guardrail_latency",
    request_id: event.requestId,
    stage: event.stage,
    duration_ms: Math.round(event.durationMs),
    outcome: event.outcome,
    timed_out: event.timedOut,
    fallback: event.fallback
  }));
}
\`\`\`

The test harness should assert that every configured stage emits exactly one terminal event per request path. Missing telemetry is a product bug because it makes latency regressions invisible. Duplicate terminal events are also a bug because percentiles get distorted.

For local and CI tests, wrap guardrail functions with timers rather than trusting every service implementation to remember timing. The wrapper below works for asynchronous policy calls and records the fallback chosen on timeout:

\`\`\`ts
type StageName = "input_moderation" | "tool_authorization";

type TimedResult<T> = {
  value: T | null;
  timedOut: boolean;
  durationMs: number;
};

export async function withTimeout<T>(
  stage: StageName,
  timeoutMs: number,
  work: () => Promise<T>
): Promise<TimedResult<T>> {
  const started = performance.now();
  let timer: ReturnType<typeof setTimeout>;

  // A unique sentinel, not null: if work() legitimately resolves to null,
  // a null sentinel would misclassify that success as a timeout.
  const TIMEOUT = Symbol('timeout');
  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), timeoutMs);
  });

  const result = await Promise.race([work(), timeout]);
  clearTimeout(timer!);
  const timedOut = result === TIMEOUT;

  return {
    value: timedOut ? null : (result as T),
    timedOut,
    durationMs: performance.now() - started
  };
}
\`\`\`

Notice the wrapper does not decide whether to allow or block. Timing and policy are separate concerns. Tests become easier when timeout detection is one small piece and product behavior is asserted somewhere else.

## Percentiles Beat Averages For Guardrail Decisions

Average guardrail latency is a comforting number and a poor release gate. Users experience tails. The unhappy customer is not sitting at mean latency. The agent that lost a sale or timed out in CI usually hit p95 or p99 behavior.

Use p50 to understand the common path, p95 for release gates, and p99 for capacity planning. For smaller CI samples, p95 can be noisy, so pair it with a confidence-aware evaluation method. If your team already tests model quality with intervals, apply the same discipline to performance samples and connect it to [LLM eval sample size confidence intervals](/blog/llm-eval-sample-size-confidence-intervals). The principle is the same: do not make a confident release decision from a tiny, unstable sample.

| Metric | Use it for | Do not use it for |
|---|---|---|
| p50 | Typical path and local development checks | Release safety on user-visible latency |
| p90 | Early warning on drift | Hard contractual limits |
| p95 | CI gate and service objective | Root-cause diagnosis by itself |
| p99 | Capacity and incident review | Small test runs with 20 samples |
| Timeout rate | Degradation correctness | Replacing stage latency histograms |

Here is a small percentile calculator for exported JSON events. It expects one event per line, which is easy to produce from tests and staging traffic.

\`\`\`python
import json
import math
import sys

def percentile(values, pct):
    if not values:
        raise ValueError("no values")
    ordered = sorted(values)
    rank = math.ceil((pct / 100) * len(ordered)) - 1
    return ordered[max(0, min(rank, len(ordered) - 1))]

durations_by_stage = {}

for line in sys.stdin:
    event = json.loads(line)
    if event.get("type") != "guardrail_latency":
        continue
    stage = event["stage"]
    durations_by_stage.setdefault(stage, []).append(event["duration_ms"])

for stage, values in sorted(durations_by_stage.items()):
    print(stage, {
        "count": len(values),
        "p50": percentile(values, 50),
        "p95": percentile(values, 95),
        "p99": percentile(values, 99)
    })
\`\`\`

The script is intentionally plain. It can run in CI, on a staging export, or against a local log file. The important bit is not the math library. It is the habit of looking at stage-specific tails before arguing about whether the LLM feels slow.

## Test The Degradation Contract

Latency testing is incomplete until you assert what happens after a budget is missed. A timeout that returns a blank assistant message is not graceful degradation. A timeout that silently skips a required safety check is not graceful either. Degradation means the system enters a known, approved mode with a known user experience and a traceable event.

Define fallback behavior per stage before writing tests:

| Slow stage | Safer fallback | Expected UI or API behavior |
|---|---|---|
| Input moderation | Block and invite retry | 503 or safe retry message, no model call |
| Injection screen | Disable tools | Text answer allowed, tool calls denied |
| Retrieval filter | Reduce context or answer without private docs | Response includes no sourced private claims |
| Tool authorization | Deny the action | Assistant explains it cannot perform the action |
| Output moderation | Return safe completion message | No partial unsafe output released |

You can test this with fake guardrail services that delay on demand. The key is to inject latency at the boundary, not by sleeping randomly inside the application. Deterministic delays make failures debuggable.

\`\`\`ts
import { describe, expect, test } from "vitest";

type Reply = {
  text: string;
  toolCalls: string[];
  fallback: string;
};

async function answerWithGuardrail(delayMs: number): Promise<Reply> {
  const timed = await withTimeout("tool_authorization", 50, async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { allowedTools: ["create_ticket"] };
  });

  if (timed.timedOut) {
    return {
      text: "I can answer, but I cannot perform account actions right now.",
      toolCalls: [],
      fallback: "deny_tool"
    };
  }

  return {
    text: "I created the ticket.",
    toolCalls: ["create_ticket"],
    fallback: "none"
  };
}

describe("tool authorization latency fallback", () => {
  test("denies tool calls when authorization times out", async () => {
    const reply = await answerWithGuardrail(100);
    expect(reply.toolCalls).toEqual([]);
    expect(reply.fallback).toBe("deny_tool");
  });
});
\`\`\`

That test is small, but it checks the behavior users actually experience. It also guards against a common future regression: someone sees tool authorization as "only a policy lookup" and moves the tool call before the timeout result is known.

## Put Parallel Guardrails Under Load

Many LLM stacks run guardrails beside retrieval, model calls, or tool preparation. Parallelism helps, but it can also hide queue starvation. A stage that takes 200 ms alone can take 2 seconds when 50 requests all call the same policy service, vector database, and audit sink at once.

Test at three levels. Unit tests verify timeout and fallback branches. Integration tests verify the pipeline emits telemetry and preserves policy. Load tests verify queueing behavior and shared limits. If your agent can call multiple tools, include the guardrail path in your parallelism tests rather than treating safety checks as a separate category. The same scheduling issues show up in [LLM tool-call parallelism testing](/blog/llm-tool-call-parallelism-testing), especially when each tool call needs authorization.

A basic k6 test can drive the latency shape without pretending to judge model quality:

\`\`\`js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

export const guardrailTimeoutRate = new Rate("guardrail_timeout_rate");
export const visibleLatency = new Trend("visible_latency_ms");

export const options = {
  vus: 20,
  duration: "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    visible_latency_ms: ["p(95)<4500"],
    guardrail_timeout_rate: ["rate<0.05"]
  }
};

export default function () {
  const started = Date.now();
  const response = http.post("http://localhost:3000/api/agent", JSON.stringify({
    message: "Summarize my open invoices and create a follow-up task."
  }), {
    headers: { "Content-Type": "application/json" }
  });

  visibleLatency.add(Date.now() - started);

  const body = response.json();
  guardrailTimeoutRate.add(Boolean(body.guardrailTimedOut));

  check(response, {
    "status is 200 or degraded 503": (res) => res.status === 200 || res.status === 503,
    "has fallback field": () => typeof body.fallback === "string"
  });

  sleep(1);
}
\`\`\`

Run this against a staging-like stack, not a mocked no-op policy server. You can still keep model calls cheap by using a test model or deterministic fixture, but the guardrail dependencies need realistic latency. Otherwise you test only your HTTP router.

## CI Gates That Catch Regressions Without Flaking

Performance gates fail teams when they are too strict, too global, or based on tiny samples. A good CI guardrail latency suite has deterministic component tests on every pull request and a larger scheduled performance run against staging. Pull requests should catch obvious mistakes: missing timeout, sequentialized checks, telemetry drop, or an accidental full-document scan. Nightly or pre-release runs should catch percentile drift.

Use fixtures that separate model behavior from guardrail overhead. For example, stub the model response but call the real policy service in a test environment. Or stub the policy service with configured delays when you are testing fallback logic. Do not mix every uncertainty into one flaky end-to-end test and then blame performance testing.

\`\`\`yaml
name: guardrail-latency

on:
  pull_request:
  workflow_dispatch:

jobs:
  component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test -- --testNamePattern "guardrail latency|fallback"

  staging-load:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:guardrail-load
      - uses: actions/upload-artifact@v4
        with:
          name: guardrail-latency-report
          path: reports/guardrail-latency.json
\`\`\`

The Vitest filter is testNamePattern, not grep. Keep that distinction straight when your repo also uses Playwright, where the common filter is --grep or -g. Small accuracy details matter because CI examples tend to get copied everywhere.

## Failure Story: The Slow Safety Layer Was Not Slow

One team I worked with saw support-agent p95 jump from about 4 seconds to more than 11 seconds after enabling a new output moderation stage. The symptom was obvious: users watched the assistant type nothing for a long pause, then the whole answer appeared at once. The first theory was that the moderation provider had poor latency. That theory sounded right because the regression started on the same day output moderation shipped.

The trace told a different story. The moderation call itself was usually under 300 ms. The actual cause was buffering. The pipeline waited for the full model response, then sent the entire answer to moderation, then released it. Before the change, tokens streamed immediately. The perceived latency was not the moderation call alone. It was model generation time plus moderation time plus a UI that had no progress state.

The fix had three parts. First, the team changed the metric from "moderation duration" to "time to first visible token" and "model finish to release decision." Second, the UI showed an explicit safety-check state after generation finished. Third, high-risk categories stayed fully buffered, while low-risk internal summaries used sentence-chunk moderation. That last change required policy approval, but the testing lesson was simple: guardrail latency is user-visible waiting, not only vendor call duration.

## What People Get Wrong In Practice

The most common mistake is treating guardrail latency as a tax that should be minimized everywhere. Some guardrails should be moved, cached, or parallelized. Some should remain blocking because their job is to prevent harm before it happens. QA should not argue "faster is always better." QA should prove the stage behaves inside its approved budget and enters the approved fallback when it does not.

Another mistake is testing only happy-path prompts. Long prompts, pasted logs, hostile markdown, large retrieved contexts, and tool-heavy requests stress guardrails differently. A prompt-injection screen that is fast on a 20-word request may crawl on a 40 KB issue description. A retrieval filter that is fine with five candidate chunks may be slow with 200 candidate chunks and tenant-level ACL checks.

Use a prompt set that includes latency stressors:

\`\`\`json
[
  {
    "name": "short_support_question",
    "message": "Why did my invoice fail?",
    "expectsTools": false
  },
  {
    "name": "long_log_paste",
    "message": "Please inspect this CI failure log. ERROR line repeated many times.",
    "repeat": 400,
    "expectsTools": false
  },
  {
    "name": "tool_request_with_permission",
    "message": "Create a refund ticket for customer 1042.",
    "expectsTools": true
  },
  {
    "name": "retrieval_heavy_policy_question",
    "message": "Compare our refund policy, enterprise SLA, and data retention terms.",
    "expectsTools": false
  }
]
\`\`\`

That fixture is not a quality benchmark. It is a latency probe. Keep quality evaluation separate unless your test is explicitly studying the tradeoff between speed and accuracy.

## A Runnable Guardrail Latency Checklist

Use the checklist below as an implementation target. If an item cannot be automated, it should still be made observable.

| Check | Automation level | Pass condition |
|---|---|---|
| Every stage has target, SLO, and timeout values | Config test | Missing values fail the build |
| Every request emits one terminal event per executed stage | Integration test | No missing or duplicate stage events |
| Required guardrails do not silently skip on timeout | Unit and integration | Approved fallback appears |
| Optional guardrails degrade into named modes | Unit | Fallback name and user behavior match config |
| p95 visible latency stays below product budget | Load test | Scheduled run passes threshold |
| Timeout rate stays below allowed level | Load test | Rate threshold passes |
| High-cardinality fields stay out of metrics | Static or log test | No prompt, email, raw document ids in metric labels |

Here is a compact config assertion that prevents unnamed stages from slipping into the pipeline:

\`\`\`ts
import { describe, expect, test } from "vitest";

const requiredStages = [
  "input_moderation",
  "injection_screen",
  "retrieval_filter",
  "tool_authorization",
  "output_moderation"
];

const budgets = {
  input_moderation: { targetP95Ms: 250, sloP95Ms: 600, timeoutMs: 1000 },
  injection_screen: { targetP95Ms: 180, sloP95Ms: 450, timeoutMs: 700 },
  retrieval_filter: { targetP95Ms: 300, sloP95Ms: 800, timeoutMs: 1200 },
  tool_authorization: { targetP95Ms: 80, sloP95Ms: 200, timeoutMs: 300 },
  output_moderation: { targetP95Ms: 220, sloP95Ms: 700, timeoutMs: 1000 }
};

describe("guardrail latency budget config", () => {
  test("all required stages have ordered budgets", () => {
    for (const stage of requiredStages) {
      const budget = budgets[stage as keyof typeof budgets];
      expect(budget.targetP95Ms).toBeGreaterThan(0);
      expect(budget.sloP95Ms).toBeGreaterThanOrEqual(budget.targetP95Ms);
      expect(budget.timeoutMs).toBeGreaterThanOrEqual(budget.sloP95Ms);
    }
  });
});
\`\`\`

The ordered-budget assertion looks basic, but it catches sloppy configs. A timeout below an SLO ceiling means your service will never be allowed to meet the SLO under tail conditions. A target above a timeout means the budget is fiction.

## Budget Numbers Need Product Semantics

There is no universal "good" guardrail latency number. A background document classifier can take seconds. A chat turn after a user presses Enter cannot. A tool authorization check in an IDE agent might need to be under a few hundred milliseconds because it sits inside a rapid edit-test loop. A medical or financial advice screen might accept more delay for stricter review. QA should ask which product moment owns the wait.

The clean way to set budgets is to start with a user-visible response target, subtract known model and network time, then allocate the remaining time across required guardrails. If the math does not fit, do not hide it. The product has to choose: faster model, fewer blocking stages, parallel execution, streaming with staged release, or a different user promise.

Keep a small budget review in every release that changes prompts, tool permissions, retrieval, moderation policy, or safety providers. Prompt changes can alter guardrail latency because they change token volume and classification difficulty. Retrieval changes can alter guardrail latency because they change candidate count. Tool changes can alter guardrail latency because they add authorization and validation. The safety layer is part of the performance surface.

Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the useful part is still your local contract: named stages, measured overhead, tested fallbacks, and percentiles that match how users wait.

## Streaming Changes The Measurement Surface

Streaming creates two latency numbers that matter more than total request time: time to first visible token and time to final moderated answer. A pipeline can have a respectable total duration and still feel broken if the user sees nothing for three seconds. It can also feel responsive while hiding a dangerous output-moderation delay at the end. QA should measure both.

For streamed agents, classify guardrails by where they sit in the stream:

| Guardrail placement | What user sees | Test assertion |
|---|---|---|
| Before model call | No tokens until check passes | Time to first token includes the check |
| During retrieval | No tokens until context is selected | Retrieved context count and filter time are recorded |
| Before tool call | Stream may pause before action | Tool denial fallback is visible |
| After each sentence | Tokens arrive in chunks | Unsafe chunk is never released |
| After full answer | User waits after generation | UI exposes a reviewing state |

The reviewing state is not cosmetic. It prevents a user from interpreting silence as a crash. It also gives QA a visible hook for tests. A Playwright test can assert that the page moves from "thinking" to "reviewing" to "complete" instead of freezing after generation.

\`\`\`ts
type StreamState = "thinking" | "reviewing" | "complete" | "degraded";

export function nextStreamState(event: string): StreamState {
  if (event === "model_started") {
    return "thinking";
  }
  if (event === "model_finished") {
    return "reviewing";
  }
  if (event === "moderation_timeout") {
    return "degraded";
  }
  if (event === "moderation_allowed") {
    return "complete";
  }
  throw new Error("unknown stream event");
}
\`\`\`

Cold starts deserve their own test bucket. Serverless policy functions, first-use model connections, and empty permission caches can add seconds to the first request after deploy. Do not mix cold-start runs into ordinary p95 gates unless your production traffic pattern really exposes users to frequent cold starts. Track them as a named scenario: warm path, cold path, cache miss, dependency retry, and injected timeout.

Finally, assert trace completeness. A request that times out before emitting a stage event is worse than a slow request because the next incident has no evidence. Your integration test should fail when a stage starts but never records allow, block, degrade, or error. That single invariant makes latency dashboards much harder to corrupt.

## Frequently Asked Questions

### What is guardrail latency in an LLM pipeline?

Guardrail latency is the time added by safety and policy checks around an LLM request. It can include input moderation, prompt-injection detection, retrieval filtering, tool authorization, output moderation, schema validation, and audit steps. QA should measure it per stage because a single end-to-end number hides which check caused the wait. The practical goal is not zero overhead. The goal is a known budget, observable behavior, and an approved fallback when a stage exceeds its limit.

### Should guardrail timeouts fail open or fail closed?

Required safety checks should usually fail closed, meaning the system blocks, denies the risky action, or asks the user to retry. Optional enrichment checks may fail into a degraded mode, such as answering without tools or without private retrieved context. The right behavior depends on the risk of the specific stage. QA should not decide this alone. Product, security, legal, and safety owners should approve the timeout policy, then tests should enforce that exact policy.

### How many samples do I need for latency testing?

For pull request checks, use enough deterministic samples to catch obvious regressions in timeout logic and sequential execution. For percentile gates, run larger scheduled tests because p95 and p99 are unstable with tiny samples. Treat 20 samples as a smoke test, not proof. A useful pattern is fast component tests on every PR and a scheduled staging run with hundreds or thousands of requests, depending on traffic shape and cost.

### Can I cache guardrail decisions to reduce latency?

Sometimes. Cache stable policy lookups, tenant permission metadata, or repeated classification of identical low-risk content when your privacy and safety model allows it. Be careful with user-specific prompts, rapidly changing permissions, and anything where stale results could authorize an action incorrectly. Tests should cover cache hits, cache misses, stale entries, and tenant isolation. A cache that makes p95 look better while mixing decisions across users is a serious security bug.
`,
};
