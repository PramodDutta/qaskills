import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest-benchmark: The Complete Performance Testing Guide (2026)',
  description:
    'Master pytest-benchmark for Python performance testing: the benchmark fixture, pedantic mode, saving and comparing runs, histograms, CI regression gates, and more.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# pytest-benchmark: The Complete Performance Testing Guide

Unit tests tell you whether your code is correct. They say nothing about whether it is fast. A function can pass every assertion you throw at it and still be ten times slower than it was last release, and you would never know until a customer complains about a sluggish API or a batch job that suddenly blows past its scheduling window. Performance regressions are insidious precisely because they are invisible to the green checkmark culture most teams live in.

[pytest-benchmark](https://pypi.org/project/pytest-benchmark/) closes that gap. It is a pytest plugin that turns micro-benchmarking into something that looks and feels exactly like writing a normal test. You request a \`benchmark\` fixture, you hand it a function to measure, and the plugin runs that function many times, throws away outliers, computes statistics, and prints a clean comparison table. Crucially, it can save those results to disk and fail your CI build when a function gets measurably slower than a baseline you recorded earlier. That single capability turns "we think it is fast enough" into an automated, enforceable contract.

This guide walks through everything you need to use pytest-benchmark in real projects: installation, the fixture API, pedantic mode for fine-grained control, reading the statistics table without guessing what the numbers mean, saving and comparing runs, grouping and histograms for visual analysis, garbage-collection control, calibration, marking benchmarks so they do not slow your normal test runs, and a complete GitHub Actions integration. We will also cover the pitfalls that trip people up, especially the noise problem on shared CI runners, and finish with a set of battle-tested best practices. By the end you will be able to add meaningful, regression-proof performance checks to any Python codebase. If you want a broader refresher on pytest itself first, keep the [pytest cheat sheet](/blog/pytest-official-reference-cheatsheet-2026) open in another tab.

## Installing pytest-benchmark

Installation is a single pip command. The plugin auto-registers with pytest, so there is nothing to configure to get started.

\`\`\`bash
pip install pytest-benchmark
\`\`\`

If you use a requirements file or a Poetry/PDM project, pin it for reproducibility:

\`\`\`bash
# requirements-dev.txt
pytest>=8.0
pytest-benchmark>=4.0
\`\`\`

Verify the plugin loaded by asking pytest which plugins it sees:

\`\`\`bash
pytest --version -V
# Look for "benchmark-x.y.z" in the registered plugins list
\`\`\`

Once installed, the \`benchmark\` fixture is available in every test function. You do not import anything in your test files. Drop the fixture name into a test signature and the plugin injects it for you, the same way pytest injects \`tmp_path\` or \`capsys\`. This zero-import design is intentional: benchmarks should read like ordinary tests so the rest of your team can maintain them without learning a new framework.

## The benchmark fixture basics

The core of the plugin is the \`benchmark\` fixture. You call it with the function you want to measure as the first argument, followed by any positional or keyword arguments that function needs. The fixture runs the function repeatedly, times each run, and returns the function's return value so you can still assert on correctness.

Here is a complete, runnable example. Suppose we want to compare two implementations of a function that sums the squares of a list.

\`\`\`python
# test_sum_squares.py

def sum_squares_loop(n):
    total = 0
    for i in range(n):
        total += i * i
    return total


def sum_squares_comprehension(n):
    return sum(i * i for i in range(n))


def test_sum_squares_loop(benchmark):
    result = benchmark(sum_squares_loop, 10_000)
    # The fixture returns the function's result, so you can still assert correctness.
    assert result == sum(i * i for i in range(10_000))


def test_sum_squares_comprehension(benchmark):
    result = benchmark(sum_squares_comprehension, 10_000)
    assert result == sum(i * i for i in range(10_000))
\`\`\`

Run it like any other test:

\`\`\`bash
pytest test_sum_squares.py
\`\`\`

The key insight is the dual purpose of \`benchmark(func, *args, **kwargs)\`: it measures performance and returns the result so the test still validates behavior. A benchmark that does not also assert correctness is dangerous, because the fastest way to make a function fast is to make it wrong. Always pair timing with at least one assertion.

If your function takes keyword arguments, pass them straight through:

\`\`\`python
def render(template, *, rows, escape=True):
    return "\\n".join(f"{r}" for r in range(rows)) if escape else str(rows)


def test_render(benchmark):
    out = benchmark(render, "table", rows=500, escape=True)
    assert out.count("\\n") == 499
\`\`\`

## Fine-grained control with benchmark.pedantic

The default fixture is convenient but makes decisions for you about how many times to call your function. When you need explicit control, reach for \`benchmark.pedantic\`. It exposes the round and iteration counts directly, lets you specify warmup rounds, and accepts a \`setup\` callable that runs before each round without being timed.

\`\`\`python
def process(data):
    return sorted(data, reverse=True)


def test_process_pedantic(benchmark):
    def setup():
        # Build fresh input for each round. The return value becomes the
        # args/kwargs passed to the measured function, and setup time is NOT counted.
        import random
        data = [random.random() for _ in range(1000)]
        return (data,), {}

    result = benchmark.pedantic(
        process,
        setup=setup,
        rounds=100,        # number of measured rounds
        iterations=10,     # calls per round (the per-call time is rounds-averaged)
        warmup_rounds=5,   # untimed rounds to warm caches/JIT before measuring
    )
    assert result == sorted(result, reverse=True)
\`\`\`

The parameters map onto a simple timing loop. For each of the \`rounds\`, the plugin calls your function \`iterations\` times and divides the total by \`iterations\` to get a per-call estimate. More iterations smooth out timer resolution noise for very fast functions; more rounds give you a larger sample for the statistics. The \`setup\` callable is the right place to generate fresh, non-cached input so you are measuring the work itself rather than the cost of operating on warm data. The \`warmup_rounds\` run the function without recording timings, which matters for code paths that lazily initialize state on first use.

Use \`pedantic\` whenever you need deterministic, reproducible numbers, or when your function has expensive per-call setup that must be excluded from the measurement. For everyday checks, the plain \`benchmark(func, ...)\` form is simpler and auto-calibrates the iteration count for you.

## Reading the statistics table

When the run finishes, pytest-benchmark prints a results table. Understanding each column is essential, because the wrong column will lead you to the wrong conclusion. Here is what the plugin reports for every benchmark.

| Column | Meaning | When to use it |
|--------|---------|----------------|
| Min | Fastest observed time | Best-case; least affected by noise, good for stable comparisons |
| Max | Slowest observed time | Surfaces worst-case spikes and GC pauses |
| Mean | Arithmetic average of all rounds | General sense of typical performance |
| Median | Middle value of all rounds | Robust against outliers; often more honest than mean |
| StdDev | Standard deviation across rounds | Measures noise; high StdDev means unreliable results |
| IQR | Interquartile range | Outlier-resistant spread measure |
| OPS | Operations per second (1 / mean) | Throughput framing; bigger is better |
| Rounds | Number of measured rounds | Sample size; more rounds equal more confidence |
| Iterations | Calls per round | Used internally for very fast functions |

A typical table looks like this (abbreviated):

\`\`\`text
------------------------------------------- benchmark: 2 tests -------------------------------------------
Name (time in us)              Min       Max      Mean    StdDev    Median       OPS    Rounds  Iterations
---------------------------------------------------------------------------------------------------------
test_sum_squares_compreh    412.30    998.10    438.71    21.44    431.05    2.28K       1842          1
test_sum_squares_loop       501.77  1,210.40    540.02    34.90    528.10    1.85K       1503          1
---------------------------------------------------------------------------------------------------------
\`\`\`

For comparing two implementations, the **Min** column is usually the most trustworthy single number: it represents the run least disturbed by background activity, and the theoretical best your code can do on that machine. The **Median** is the best choice for describing "typical" behavior because it ignores the occasional GC pause or scheduler hiccup that inflates the mean. Treat **StdDev** as a quality signal: if it is large relative to the mean, your numbers are noisy and any conclusion you draw is shaky. **OPS** is just a throughput-friendly inversion of the mean; some teams prefer it because higher-is-better reads more naturally on dashboards.

## Saving benchmark results

A single run is a snapshot. To detect regressions you need a baseline to compare against, which means saving results to disk. The plugin stores JSON files under \`.benchmarks/\` keyed by machine and Python version.

Save a run under a name you choose:

\`\`\`bash
pytest --benchmark-save=baseline
\`\`\`

Or let the plugin name it automatically with a timestamp and commit-based identifier:

\`\`\`bash
pytest --benchmark-autosave
\`\`\`

Each saved file lives somewhere like \`.benchmarks/Linux-CPython-3.12-64bit/0001_baseline.json\`. The directory layout separates results by platform so you never accidentally compare numbers from a fast workstation against numbers from a slow CI container. List everything you have saved:

\`\`\`bash
pytest-benchmark list
\`\`\`

You can also control where results go and what metadata gets attached:

\`\`\`bash
pytest --benchmark-save=baseline --benchmark-storage=./perf-history
\`\`\`

Commit a baseline to your repository (or to a dedicated performance-history branch) when you want a stable reference point that everyone compares against. Many teams save a fresh baseline whenever they cut a release, so each release's performance is captured as a durable record. The JSON is human-readable, so you can diff it, archive it, or feed it into your own plotting scripts if you outgrow the built-in tools.

## Comparing runs to catch regressions

Saving results pays off when you compare a new run against an old one. The \`--benchmark-compare\` flag loads a saved run and shows a side-by-side delta for every benchmark.

\`\`\`bash
# Compare the current run against saved run 0001
pytest --benchmark-compare=0001
\`\`\`

The output annotates each row with the percentage change, so a function that got 12% slower is impossible to miss. But eyeballing percentages does not stop a regression from merging. For that, use \`--benchmark-compare-fail\`, which makes pytest exit non-zero when any benchmark degrades beyond a threshold you set.

\`\`\`bash
# Fail the build if the mean of any benchmark is more than 5% slower than baseline
pytest --benchmark-compare=0001 --benchmark-compare-fail=mean:5%
\`\`\`

You can stack multiple gates and mix percentage thresholds with absolute ones:

\`\`\`bash
pytest \\
  --benchmark-compare=0001 \\
  --benchmark-compare-fail=mean:5% \\
  --benchmark-compare-fail=median:5% \\
  --benchmark-compare-fail=min:10%
\`\`\`

The syntax is \`statistic:threshold\`. The threshold can be a percentage (\`5%\`) or an absolute time value (\`min:0.001\` to fail when min exceeds one millisecond of regression). Choosing which statistic to gate on matters. Gating on **min** is the strictest and least noisy because the best-case time is hard to fake and rarely inflated by environmental jitter. Gating on **mean** or **median** catches regressions that show up in typical behavior but tolerates an unchanged best case. Most teams gate on \`min\` with a generous threshold (10 to 15%) on noisy CI runners, and tighten it on dedicated benchmarking hardware. This compare-and-fail loop is the single most valuable feature of the plugin: it converts performance from an afterthought into an enforced quality gate, the same way assertions enforce correctness.

## Grouping benchmarks for analysis

When you have many related benchmarks, a flat table is hard to read. The \`--benchmark-group-by\` flag reorganizes the output so related results sit together and the plugin can compute relative speeds within each group.

\`\`\`bash
# Group all benchmarks that share a parametrized group label
pytest --benchmark-group-by=group

# Group by the function (test name) being benchmarked
pytest --benchmark-group-by=func

# Group by parameter value (useful with parametrize)
pytest --benchmark-group-by=param
\`\`\`

You assign a group explicitly with the \`@pytest.mark.benchmark\` marker, which is handy when comparing competing implementations of the same operation:

\`\`\`python
import pytest


@pytest.mark.benchmark(group="serialize")
def test_json_serialize(benchmark):
    import json
    payload = {"items": list(range(1000))}
    benchmark(json.dumps, payload)


@pytest.mark.benchmark(group="serialize")
def test_repr_serialize(benchmark):
    payload = {"items": list(range(1000))}
    benchmark(repr, payload)
\`\`\`

\`\`\`bash
pytest --benchmark-group-by=group
\`\`\`

Within the "serialize" group, the plugin prints each benchmark relative to the fastest one in the group, so you immediately see that, say, \`repr\` is 1.0x (the baseline) and \`json.dumps\` is 3.4x slower. Grouping turns a wall of numbers into a ranked leaderboard, which is exactly what you want when the question is "which approach is fastest" rather than "did this get slower." It pairs naturally with parametrized benchmarks, a technique covered in depth in our [pytest patterns cheat sheet](/blog/pytest-official-reference-cheatsheet-2026).

## Generating histograms

Summary statistics hide the shape of your data. Two functions can share an identical mean while one is rock-steady and the other swings wildly between fast and slow. Histograms reveal that distribution. The \`--benchmark-histogram\` flag renders SVG histograms (one per benchmark, plus a comparison plot) so you can see the spread visually.

\`\`\`bash
# Generate histogram SVGs into the default location
pytest --benchmark-histogram

# Write them to a specific path prefix
pytest --benchmark-histogram=./perf-charts/run
\`\`\`

This produces files like \`./perf-charts/run-test_sum_squares_loop.svg\`. Each chart shows a box plot of the rounds, making outliers, bimodal distributions, and tight clusters obvious at a glance. Histograms require the optional plotting dependency, which you install with the \`histogram\` extra:

\`\`\`bash
pip install "pytest-benchmark[histogram]"
\`\`\`

Use histograms during investigation rather than in every CI run. When a benchmark is mysteriously noisy or a comparison is borderline, the histogram usually explains why: you will spot a long tail caused by garbage collection, or a bimodal split caused by a cache that is sometimes warm and sometimes cold. They are a diagnostic tool, not a gate, and they are most valuable when a number surprises you and you need to understand the underlying distribution before trusting it.

## Disabling garbage collection and calibration

Python's cyclic garbage collector can fire in the middle of a timed round and add a pause that has nothing to do with your code. For micro-benchmarks where you want to isolate raw execution time, disable GC during measurement:

\`\`\`bash
pytest --benchmark-disable-gc
\`\`\`

With GC off during timing, your StdDev usually drops noticeably because the periodic collection pauses disappear from the samples. Be deliberate about this choice: disabling GC gives you cleaner numbers for CPU-bound logic, but if your real workload allocates heavily and triggers GC in production, the GC-free benchmark is measuring an idealized scenario. For algorithm micro-benchmarks, disable it; for end-to-end-ish benchmarks of allocation-heavy code, leave it on so the measurement reflects reality.

Calibration is how the plugin decides how many iterations to run per round for the auto fixture. For functions faster than the timer's resolution, a single call cannot be measured accurately, so the plugin automatically increases the iteration count until each round is long enough to time precisely. You normally do not touch this, but you can influence it:

\`\`\`bash
# Set a minimum total time per round so very fast functions get enough iterations
pytest --benchmark-min-time=0.000005

# Cap how long a single benchmark may spend calibrating and measuring
pytest --benchmark-max-time=2.0

# Force a minimum number of rounds for statistical confidence
pytest --benchmark-min-rounds=50
\`\`\`

These knobs trade run time against statistical confidence. On a tight CI budget you lower \`max-time\`; when you need rock-solid numbers for a release sign-off you raise \`min-rounds\` and accept a longer run. If you find yourself fighting calibration constantly, that is a signal to switch the offending tests to \`benchmark.pedantic\` where you set rounds and iterations explicitly.

## Marking and selecting benchmarks

Benchmarks are slow by nature, so you rarely want them running on every \`pytest\` invocation during normal development. The cleanest approach is to mark them and run them separately. Register a custom marker in your configuration:

\`\`\`ini
# pytest.ini (or the [tool.pytest.ini_options] table in pyproject.toml)
[pytest]
markers =
    benchmark_suite: performance benchmarks, run on demand only
\`\`\`

Tag your benchmark tests:

\`\`\`python
import pytest


@pytest.mark.benchmark_suite
def test_hot_path(benchmark):
    benchmark(sum, range(100_000))
\`\`\`

Then exclude or include them by marker:

\`\`\`bash
# Normal dev run: skip benchmarks entirely
pytest -m "not benchmark_suite"

# Performance run: only benchmarks
pytest -m benchmark_suite --benchmark-only
\`\`\`

The plugin also ships first-class flags for this. \`--benchmark-only\` runs nothing but benchmark tests, while \`--benchmark-skip\` skips them, and \`--benchmark-disable\` runs benchmark tests as plain tests without timing (useful when you just want the correctness assertions). Separating benchmarks from your fast unit suite keeps the inner development loop quick while still giving you a dedicated, comprehensive performance run on demand or in CI.

## A complete CLI flag reference

The plugin has a large surface area. This table collects the flags you will reach for most, so you do not have to dig through \`--help\` every time.

| Flag | Purpose |
|------|---------|
| \`--benchmark-only\` | Run only benchmark tests |
| \`--benchmark-skip\` | Skip benchmark tests |
| \`--benchmark-disable\` | Run benchmarks as normal tests (no timing) |
| \`--benchmark-save=NAME\` | Save results under a chosen name |
| \`--benchmark-autosave\` | Auto-save with a generated name |
| \`--benchmark-compare=ID\` | Compare against a saved run |
| \`--benchmark-compare-fail=STAT:THRESH\` | Fail when a statistic regresses past threshold |
| \`--benchmark-group-by=KEY\` | Group output by group/func/param/etc. |
| \`--benchmark-histogram[=PATH]\` | Emit SVG histograms |
| \`--benchmark-disable-gc\` | Disable GC during timing |
| \`--benchmark-min-rounds=N\` | Force a minimum number of rounds |
| \`--benchmark-min-time=SECONDS\` | Minimum time per round (calibration) |
| \`--benchmark-max-time=SECONDS\` | Cap total time per benchmark |
| \`--benchmark-sort=COLUMN\` | Sort the results table by a column |
| \`--benchmark-storage=PATH\` | Where to read/write saved runs |
| \`--benchmark-columns=LIST\` | Choose which stat columns to display |

You can persist any of these in your pytest configuration so they apply automatically. For example, to always disable GC and sort by min:

\`\`\`ini
[pytest]
addopts = --benchmark-disable-gc --benchmark-sort=min
\`\`\`

## CI integration with GitHub Actions

Running benchmarks in CI is where regression gating earns its keep. The pattern is: restore a saved baseline, run the benchmarks, compare against the baseline, and fail the job if anything regressed. Here is a complete workflow.

\`\`\`yaml
# .github/workflows/benchmarks.yml
name: Performance Benchmarks

on:
  pull_request:
    paths:
      - "src/**"
      - "tests/**"

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pytest pytest-benchmark
          pip install -e .

      - name: Restore saved baseline
        uses: actions/cache@v4
        with:
          path: .benchmarks
          key: benchmarks-baseline

      - name: Run benchmarks and fail on regression
        run: |
          pytest -m benchmark_suite \\
            --benchmark-only \\
            --benchmark-disable-gc \\
            --benchmark-compare \\
            --benchmark-compare-fail=min:15%

      - name: Upload benchmark results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: .benchmarks
\`\`\`

The threshold here is intentionally generous at \`min:15%\` because shared GitHub-hosted runners are noisy. To establish the baseline in the first place, run a one-time job on the main branch that does \`pytest --benchmark-only --benchmark-save=baseline\` and caches the \`.benchmarks\` directory. From then on, every pull request compares against it. If you also run a parallel test suite, see how to keep benchmark jobs isolated from parallel workers in our [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide), because running benchmarks under xdist will corrupt your timing data.

## Pitfalls and the noise problem

The single biggest mistake teams make is trusting absolute numbers from shared CI runners. GitHub-hosted, GitLab shared, and most cloud CI machines are multi-tenant: your job shares CPU, memory bandwidth, and cache with whatever else the provider scheduled on that hardware. The result is that the same code can benchmark 30% faster or slower between two runs with no code change at all. This is why you compare relative deltas against a baseline measured on the same kind of runner, never absolute milliseconds, and why your fail threshold has to be wide enough to absorb that jitter.

A few more traps to avoid. First, do not run benchmarks under pytest-xdist; parallel workers contend for the same cores and destroy the measurement, so always run the benchmark suite single-process. Second, watch for warm-cache bias: if your \`setup\` reuses the same input object, the CPU cache and any internal memoization make the second call artificially fast, so generate fresh input per round when realism matters. Third, beware dead-code elimination at the Python level is not really a thing, but a benchmark whose result is never used can still mislead you if the function lazily defers work, so always consume the return value. Fourth, beware comparing across Python versions or machines; the plugin partitions saved results by platform for exactly this reason, and you should respect those partitions. Finally, a high StdDev is a red flag, not a number to average away: if your spread is large, fix the noise source before drawing any conclusion.

## Best practices

Treat benchmarks as a first-class but separate suite. Mark them, exclude them from the fast inner loop, and run the full performance run in CI and before releases. Always gate on \`min\` with a threshold tuned to your runner's noise floor, because the best-case time is the most stable signal you have. Pair every benchmark with a correctness assertion so a fast-but-wrong implementation cannot sneak through. Disable GC for CPU-bound micro-benchmarks and leave it on for allocation-heavy ones, matching the measurement to what you actually care about.

Save a baseline at every release and keep the history; the \`.benchmarks\` JSON is a durable record of how your performance evolves, and it is invaluable when a customer asks "when did this get slow." Use histograms when a number surprises you, grouping when you are comparing implementations, and pedantic mode when you need deterministic, reproducible figures. Above all, prefer relative comparisons over absolute numbers, especially in CI. The point of pytest-benchmark is not to know that a function takes 412 microseconds; it is to know, automatically and before merge, that it did not get slower than it was last week. To go deeper on fixtures, parametrization, and the rest of the pytest ecosystem these benchmarks build on, browse the [QA skills directory](/skills) where dozens of ready-to-install testing skills live.

## Frequently Asked Questions

### What is the pytest benchmark fixture and how do I use it?

The \`benchmark\` fixture is injected automatically into any test function that names it as a parameter, with no import required. You call it as \`benchmark(func, *args, **kwargs)\`, and it runs your function many times, computes timing statistics, prints a results table, and returns the function's return value so you can still assert correctness in the same test.

### How does pytest-benchmark compare two runs to catch regressions?

Save a baseline with \`pytest --benchmark-save=baseline\`, then run \`pytest --benchmark-compare=0001\` to see a per-benchmark percentage delta. Add \`--benchmark-compare-fail=mean:5%\` to make pytest exit non-zero when any benchmark regresses beyond your threshold. This turns performance into an enforced CI gate rather than a manual eyeball check.

### What is the difference between benchmark() and benchmark.pedantic()?

The plain \`benchmark(func, ...)\` auto-calibrates how many iterations to run and is best for everyday checks. \`benchmark.pedantic()\` gives you explicit control over \`rounds\`, \`iterations\`, and \`warmup_rounds\`, plus an untimed \`setup\` callable for generating fresh input. Use pedantic mode when you need deterministic, reproducible numbers or must exclude expensive per-call setup from the timing.

### Which statistic should I use for python performance testing in pytest?

For comparing implementations, \`min\` is the most trustworthy single number because it is the least disturbed by background noise. For describing typical behavior, prefer \`median\` over \`mean\` since it ignores occasional GC or scheduler spikes. Watch \`StdDev\` as a quality signal: a large spread relative to the mean means your results are too noisy to trust.

### How do I generate a benchmark histogram in pytest?

Install the optional plotting dependency with \`pip install "pytest-benchmark[histogram]"\`, then run \`pytest --benchmark-histogram=./charts/run\`. The plugin writes one SVG box plot per benchmark plus a comparison chart, revealing the distribution shape, outliers, and bimodal patterns that summary statistics hide. Use histograms as a diagnostic tool when a number surprises you, not as a CI gate.

### Why are my benchmark results so noisy on CI?

Shared CI runners are multi-tenant, so your job competes for CPU, cache, and memory bandwidth with other tenants, producing swings of 30% or more with no code change. Always compare relative deltas against a baseline measured on the same runner type, set a generous fail threshold like \`min:15%\`, disable GC during timing, and never run benchmarks under pytest-xdist parallel workers.

### Can I run benchmarks separately from my normal test suite?

Yes. Mark benchmark tests with a custom marker and exclude them in your fast loop using \`pytest -m "not benchmark_suite"\`. For a dedicated run use \`pytest -m benchmark_suite --benchmark-only\`. The plugin also offers \`--benchmark-skip\` to skip and \`--benchmark-disable\` to run benchmark tests as plain correctness tests without timing.

### Should I disable garbage collection during benchmarks?

Disable GC with \`--benchmark-disable-gc\` for CPU-bound micro-benchmarks, where cyclic collection pauses add noise unrelated to your code and inflate StdDev. Leave GC enabled for allocation-heavy code whose real-world behavior triggers collection, so the measurement reflects production reality. Match the GC setting to the kind of workload you are actually trying to characterize.

## Conclusion

Performance regressions slip past correctness tests every day, and the only reliable defense is to measure performance automatically and fail the build when it degrades. pytest-benchmark makes that practical: a fixture that reads like an ordinary test, statistics you can trust once you know which column to look at, saved baselines, and a compare-and-fail gate that stops slow code before it merges. Start small, benchmark your hottest path, save a baseline, and wire up a \`--benchmark-compare-fail\` step in CI. From there, expand coverage to the functions that matter most.

Ready to make performance a permanent part of your testing discipline? Explore the [QA skills directory](/skills) for installable pytest and performance-testing skills your AI coding agent can use, keep the [pytest reference cheat sheet](/blog/pytest-official-reference-cheatsheet-2026) handy for fixtures and markers, and read the [pytest-xdist parallel testing guide](/blog/pytest-xdist-parallel-testing-guide) so you know exactly when to keep parallelism away from your benchmarks. Measure what matters, gate on regressions, and ship fast code with confidence.
`,
};
