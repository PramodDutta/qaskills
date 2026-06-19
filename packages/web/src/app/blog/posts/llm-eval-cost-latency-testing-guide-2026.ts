import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "LLM Cost & Latency Testing Guide: Tokens, p95, Throughput (2026)",
  description: "Measure LLM cost and latency in 2026: token budgets, TTFT, p95/p99, throughput, and regression gates so a prompt change never blows up your bill.",
  date: "2026-06-15",
  category: "AI Evals",
  content: `# LLM Cost & Latency Testing Guide: Tokens, p95, Throughput (2026)

**Testing LLM cost and latency means measuring three things on a representative workload and gating regressions on them: tokens (input + output, which drive cost), latency (time-to-first-token and total time, reported at p50/p95/p99 — never as an average), and throughput (requests or tokens per second under concurrency).** Quality is only half of an LLM evaluation; a prompt change that raises accuracy by 1% but doubles output tokens or pushes p95 latency past your SLA is a regression. This guide shows how to instrument each metric, set budgets, and wire cost/latency gates into CI alongside your quality checks.

## Why cost and latency need their own tests

LLM behavior is non-deterministic in *length* as well as content. The same prompt can produce a 200-token answer one run and an 800-token answer the next, and a model upgrade or a system-prompt tweak can quietly change the distribution. Because cost is \`tokens × price-per-token\` and latency scales with output length, every prompt and model change is potentially a cost/latency change — even when accuracy looks flat.

Three failure modes that quality tests miss entirely:

- **Token creep.** A reworded prompt adds 150 tokens to every request; multiplied across millions of calls, that is a real bill increase.
- **Latency regression.** A higher-effort reasoning setting improves answers but adds seconds to p95, breaking an interactive UX.
- **Throughput collapse.** A change that is fine at one request at a time falls over at production concurrency.

Treat cost and latency as first-class metrics with budgets and regression gates, exactly the way you treat accuracy.

## The metrics that matter

### Tokens (the cost driver)

Cost is almost entirely a function of token counts and the model's per-token price. The two numbers you must capture per request are **input tokens** (prompt + system + context + tool definitions) and **output tokens** (the generated response, including any reasoning/thinking tokens, which are billed as output). Get these from the API response's usage object rather than estimating with a generic tokenizer — token counts are model-specific, and an OpenAI-style tokenizer will miscount for other model families.

Pricing is asymmetric: output tokens cost several times more than input tokens. As a concrete 2026 reference point, a current Opus-tier model (\`claude-opus-4-8\`) is priced at $5 per million input tokens and $25 per million output tokens — a 5× output premium — while a Haiku-tier model is far cheaper per token. That asymmetry means **output length is usually your biggest cost lever**: trimming a verbose response saves 5× what trimming the prompt does.

Two more factors change the real bill:

- **Prompt caching.** Cached input tokens are billed at a fraction of the base input rate (cache reads ~0.1× on supporting models), so a stable, cacheable prefix can dramatically cut input cost. Track cache-read vs uncached input tokens separately or your cost model will be wrong.
- **Batch processing.** Asynchronous batch APIs commonly run at ~50% of standard price for latency-tolerant work.

### Latency (the UX driver)

For streaming, interactive apps, two latency metrics matter:

- **Time to first token (TTFT)** — how long until the user sees *anything*. This dominates perceived responsiveness in a chat UI.
- **Total generation time** — TTFT plus the time to stream the rest, which scales with output length.

Report both as **percentiles, not averages**. An average hides the tail; p95 and p99 are what your slowest 5% and 1% of users actually experience, and tail latency is where SLAs break. A mean of 1.2s can coexist with a p99 of 9s.

### Throughput (the scale driver)

Throughput is requests-per-second or tokens-per-second your system sustains under concurrency. A change can look fast at one-request-at-a-time and degrade sharply when 50 requests run at once (rate limits, queueing, contention). Measure latency *at your target concurrency*, not in isolation.

| Metric | What it measures | How to report | Primarily affects |
|---|---|---|---|
| Input tokens | Prompt size | Mean + total per run | Cost |
| Output tokens | Response size | Mean + p95 | Cost (5× weight) |
| Cache-read tokens | Cached input reuse | % of input tokens | Cost |
| TTFT | Responsiveness | p50 / p95 / p99 | UX |
| Total latency | End-to-end time | p50 / p95 / p99 | UX |
| Throughput | Capacity under load | req/s, tokens/s | Scale |
| Cost per request | tokens × price | Mean + total | Budget |

## Measuring cost per request

Pull token counts from the response usage object and apply the model's price. The pattern, in Python:

\`\`\`python
# cost_meter.py — compute per-request cost from usage
PRICES = {  # USD per 1M tokens; confirm current values with your provider
    "opus":  {"input": 5.00, "output": 25.00, "cache_read": 0.50},
    "haiku": {"input": 1.00, "output": 5.00,  "cache_read": 0.10},
}

def request_cost(usage, tier: str) -> float:
    p = PRICES[tier]
    uncached_in = usage.input_tokens            # full-price input
    cached_in   = getattr(usage, "cache_read_input_tokens", 0)
    out         = usage.output_tokens           # includes reasoning tokens
    return (
        uncached_in * p["input"]      / 1_000_000
        + cached_in * p["cache_read"] / 1_000_000
        + out       * p["output"]     / 1_000_000
    )
\`\`\`

Run this across a representative dataset and report the **mean cost per request** and the **projected monthly cost** at your expected request volume. The dataset matters: a handful of toy prompts will not reflect real input sizes. Use a sample drawn from (or modeled on) production traffic.

To catch token creep before it ships, count tokens for a prompt across two versions and diff them:

\`\`\`python
# Count tokens with the provider's own counter (model-specific), not a generic tokenizer.
before = count_tokens(model, old_prompt)   # provider count_tokens endpoint
after  = count_tokens(model, new_prompt)
delta  = after - before
print(f"Prompt token delta: {delta:+d} ({delta / before:+.1%})")
\`\`\`

## Measuring latency correctly

For streaming requests, record the timestamp when the stream opens, when the first token arrives (TTFT), and when it completes. Aggregate into percentiles — do not average.

\`\`\`python
# latency_bench.py — collect TTFT and total time, report percentiles
import time, statistics

def measure_once(prompt: str) -> dict:
    t0 = time.perf_counter()
    first = None
    for i, _chunk in enumerate(stream_model(prompt)):  # your streaming call
        if i == 0:
            first = time.perf_counter()
    end = time.perf_counter()
    return {"ttft": first - t0, "total": end - t0}

def percentile(values, p):
    s = sorted(values)
    k = int(round((p / 100) * (len(s) - 1)))
    return s[k]

samples = [measure_once(p) for p in DATASET for _ in range(3)]  # repeat for stability
ttft = [s["ttft"] for s in samples]
total = [s["total"] for s in samples]
print(f"TTFT  p50={percentile(ttft,50):.2f}s p95={percentile(ttft,95):.2f}s p99={percentile(ttft,99):.2f}s")
print(f"Total p50={percentile(total,50):.2f}s p95={percentile(total,95):.2f}s p99={percentile(total,99):.2f}s")
\`\`\`

Three things make latency numbers trustworthy:

1. **Repeat each case** several times — single-shot latency is noisy.
2. **Warm up first.** Discard the first request or two; cold caches and connection setup skew them.
3. **Measure at target concurrency.** If production runs 20 concurrent requests, benchmark at 20, because queueing and rate limits only appear under load.

## Throughput under concurrency

To measure sustained throughput, fire a fixed number of requests at a fixed concurrency and divide by wall-clock time:

\`\`\`python
# throughput_bench.py — requests/sec at target concurrency
import asyncio, time

CONCURRENCY = 20
TOTAL = 200

async def worker(queue, results):
    while not queue.empty():
        prompt = await queue.get()
        t0 = time.perf_counter()
        await async_model_call(prompt)      # your async client call
        results.append(time.perf_counter() - t0)
        queue.task_done()

async def run():
    queue = asyncio.Queue()
    for i in range(TOTAL):
        queue.put_nowait(DATASET[i % len(DATASET)])
    results = []
    t0 = time.perf_counter()
    await asyncio.gather(*[worker(queue, results) for _ in range(CONCURRENCY)])
    wall = time.perf_counter() - t0
    print(f"Throughput: {TOTAL / wall:.1f} req/s, mean latency {sum(results)/len(results):.2f}s")

asyncio.run(run())
\`\`\`

Watch for the point where adding concurrency stops increasing throughput (you have hit a rate limit or a bottleneck) and where latency starts climbing steeply. That knee is your practical capacity ceiling.

## Setting budgets and regression gates

A measurement is only useful if it can fail a build. Set explicit budgets and assert against them in CI, the same way you gate accuracy:

\`\`\`python
# cost_latency_gate.py — fail CI on budget breach
BUDGETS = {
    "mean_cost_usd":   0.012,   # per request
    "ttft_p95_s":      1.5,
    "total_p95_s":     6.0,
    "mean_output_tok": 450,
}

def gate(report: dict):
    failures = []
    for k, limit in BUDGETS.items():
        if report[k] > limit:
            failures.append(f"{k}={report[k]:.4g} exceeds budget {limit}")
    assert not failures, "Cost/latency regression:\\n" + "\\n".join(failures)
\`\`\`

Practical tips for budgets that hold up:

- **Gate the tail, not the mean, for latency.** p95/p99 is what users feel; a stable mean can hide a growing tail.
- **Budget output tokens directly.** Since output drives cost, a \`mean_output_tok\` ceiling catches verbosity regressions even when prices change.
- **Allow a tolerance band.** LLM output length is noisy run to run; a hard equality gate will flap. Set budgets a sensible margin above your baseline.
- **Re-baseline on model changes.** A new model has a different price, tokenizer, and latency profile — reset budgets when you switch, do not carry the old ones blindly.

You can run these gates next to your quality suite so a single CI job reports accuracy, cost, and latency together. For the quality side of the picture, see our guides on golden datasets and taming non-determinism, and compare evaluation tools on the [comparison hub](/compare). Runnable evaluation skills live in the [skills directory](/skills), and more deep dives are on the [blog](/blog).

## Levers to pull when you blow the budget

When a gate fails, the highest-leverage fixes, in rough order:

1. **Cut output length.** Output tokens carry the price premium. Constrain \`max_tokens\`, instruct for concision, or use structured outputs to avoid rambling.
2. **Enable or fix prompt caching.** A stable, cacheable prefix turns expensive input tokens into cheap cache reads. If cache-read tokens are zero across repeated requests, a silent cache invalidator (a timestamp or UUID in the prefix) is the culprit.
3. **Right-size the model.** Not every request needs the most capable model. Route easy cases to a cheaper, faster tier and reserve the expensive model for hard ones.
4. **Batch latency-tolerant work.** Offline scoring, bulk classification, and report generation can use a ~50%-cheaper async batch path.
5. **Tune the reasoning/effort setting.** Higher effort improves hard tasks but spends more tokens and time; lower it where the quality gain is not worth the cost.

## Frequently Asked Questions

### Why report p95 latency instead of average latency?

Because the average hides the tail, and the tail is what breaks user experience and SLAs. A mean latency of 1.2s can coexist with a p99 of 9s — meaning 1% of users wait nine seconds. Percentiles (p50, p95, p99) show the distribution, so you can gate on the slow experiences your average would never reveal. Always report and budget on percentiles for latency.

### Do reasoning/thinking tokens count toward cost?

Yes. On models that produce internal reasoning, those tokens are billed as output tokens even when they are summarized or hidden from the response. Since output tokens carry the price premium, a higher reasoning-effort setting can raise cost substantially without changing the visible answer length. Always read token counts from the API usage object, which includes reasoning tokens, rather than counting only the visible response.

### How do I estimate LLM cost before running anything?

Use the provider's own token-counting endpoint (token counts are model-specific) to count input tokens for a representative prompt, estimate output length from similar past responses, then apply the model's per-token prices — remembering output is several times more expensive than input. Multiply by expected request volume for a monthly projection. For accuracy, validate the estimate against a small live run, since real output lengths vary.

### Does prompt caching actually lower the bill?

It can, significantly, when you have a large stable prefix reused across requests — cached input tokens bill at roughly a tenth of the base input rate on supporting models. The catch is that caching is a prefix match: any change in the cached region (a timestamp, a reordered tool list, a per-request ID) invalidates it silently. Verify by checking that cache-read tokens are non-zero across repeated identical-prefix requests.

### Should cost and latency gates live in the same CI job as quality gates?

Yes — running them together gives you a complete picture of every change in one place: a prompt tweak that lifts accuracy but doubles output tokens or blows past your latency SLA shows up immediately as a failed gate. Keep the budgets in version control next to the quality thresholds, and re-baseline all of them whenever you change models, since a new model shifts price, tokenizer, and latency at once.

### What concurrency should I benchmark at?

Benchmark at your actual production target concurrency, not at one request at a time. Latency and throughput behave very differently under load because of rate limits, queueing, and contention — a change that is fast in isolation can collapse at 50 concurrent requests. Find the knee where added concurrency stops improving throughput and latency starts climbing; that is your practical capacity ceiling.
`,
};
