import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Benchmark Mode Regression Tracking That Works in CI',
  description: 'Build reliable vitest benchmark mode regression tracking with stored baselines, noise controls, CI gates, and diagnostics that expose real performance losses.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Vitest Benchmark Mode Regression Tracking That Works in CI

Vitest benchmark mode regression tracking means measuring a stable workload, saving a trustworthy reference result, and comparing later code against that reference in the same controlled environment. In current Vitest, benchmark files run through the dedicated benchmark project and the \`vitest bench\` command. The benchmark context can write result artifacts and replay them with \`bench.from()\`, which makes historical comparison practical without inventing a custom timing harness.

The hard part is not collecting a faster or slower number. It is deciding whether a difference belongs to the code or to CPU contention, runtime drift, JIT behavior, garbage collection, input changes, or a flawed benchmark. A useful CI gate therefore combines relative comparison, an explicitly illustrative tolerance, environment metadata, a baseline-update policy, and a human-readable diagnosis path.

This guide builds that system around a deterministic log parser. The examples use the current context-fixture benchmark API, where a benchmark is registered inside \`test()\` and executed with \`.run()\` or \`bench.compare()\`.

## Choose a Workload That Represents the Cost You Care About

A benchmark should represent a user-visible or system-visible cost, not merely a convenient function call. For a parser, that may be throughput on realistic log batches. For a UI library, it may be rendering a fixed component tree in Browser Mode. For a serializer, it may be latency across small, medium, and large payloads. State the performance claim in a sentence before writing code.

Our claim is: parsing a fixed batch of application log lines must not become materially slower on the designated CI runner. Here is a small implementation with observable output.

\`\`\`typescript
// src/parse-log.ts
export type ParsedLog = {
  level: string
  service: string
  message: string
}

export function parseLog(line: string): ParsedLog {
  const parts = line.split('|')
  if (parts.length !== 3) {
    throw new Error('invalid log line')
  }

  return {
    level: parts[0],
    service: parts[1],
    message: parts[2],
  }
}
\`\`\`

The benchmark input must be fixed and representative. Random data generated inside the timed callback adds work and makes runs incomparable. Construct the corpus outside the measured function and consume the result so an optimizing engine cannot treat the calculation as irrelevant.

| Workload decision | Stable choice | Misleading choice |
|---|---|---|
| Input | Fixed corpus with documented shape | New random strings per iteration |
| Timed boundary | Parser call and result consumption | Fixture creation plus parser plus logging |
| Artifact | Built package or consistently loaded module | Source in one run, bundle in another |
| Output | Deterministic checksum or count | Unused return value |
| Scale | Several named, realistic sizes | One tiny case generalized to all traffic |

Use a correctness test beside the benchmark. Performance data from a wrong implementation has no release value.

\`\`\`typescript
// src/parse-log.test.ts
import { expect, test } from 'vitest'
import { parseLog } from './parse-log'

test('parses a valid log line', () => {
  expect(parseLog('WARN|billing|payment delayed')).toEqual({
    level: 'WARN',
    service: 'billing',
    message: 'payment delayed',
  })
})

test('rejects malformed input', () => {
  expect(() => parseLog('missing separators')).toThrow('invalid log line')
})
\`\`\`

The correctness suite answers whether the parser works. The benchmark answers how expensive a fixed valid workload is. Keeping those claims separate prevents teams from weakening correctness checks to stabilize a timing test.

## Build a Benchmark File Vitest Will Actually Collect

Vitest discovers benchmark files through \`benchmark.include\`. The documented default matches filenames containing \`.bench\` or \`.benchmark\` with supported JavaScript or TypeScript extensions. The \`bench\` fixture is available only in files assigned to the benchmark project. Putting the fixture into an ordinary \`.test.ts\` file can fail even though the code appears syntactically valid.

The following benchmark creates 500 illustrative input lines outside the timed callback, parses the whole batch, and returns a checksum. The number is a workload choice, not a universal recommendation.

\`\`\`typescript
// benchmarks/parse-log.bench.ts
import { expect, test } from 'vitest'
import { parseLog } from '../src/parse-log'

const input = Array.from(
  { length: 500 },
  (_, index) => 'INFO|checkout|processed item ' + index,
)

function parseBatch(): number {
  let checksum = 0
  for (const line of input) {
    const parsed = parseLog(line)
    checksum += parsed.message.length
  }
  return checksum
}

test('parses a medium log batch', async ({ bench }) => {
  const result = await bench('current parser', () => parseBatch()).run()
  expect(result.throughput.mean).toBeGreaterThan(0)
})
\`\`\`

The absolute assertion only proves that Vitest produced a positive throughput. It is not a meaningful regression threshold. A fixed throughput limit becomes stale when runner hardware or runtime versions change. The later baseline comparison will carry the release signal.

Run regular tests and benchmarks deliberately:

\`\`\`bash
npx vitest run src/parse-log.test.ts
npx vitest bench benchmarks/parse-log.bench.ts
npx vitest bench -t "parses a medium log batch"
\`\`\`

The last command uses Vitest’s \`-t\` test-name filter. Do not substitute Mocha’s \`--grep\`. A filename filter and a test-name filter solve different problems: the first narrows files, and the second narrows collected test names.

## Turn One Run Into a Versioned Baseline

Vitest provides two key primitives for tracking results. The \`writeResult\` benchmark option writes a JSON result relative to the project root. \`bench.from(name, source)\` registers a previously stored result without executing the original function. The source can be a local path or a function that supplies data. Vitest’s own guidance warns that results vary across environments, so designate one environment to generate committed reference files.

A safe pattern uses an environment variable to select exactly one of two paths: refresh the baseline, or compare current code with the stored baseline. Never overwrite the reference before reading it during an ordinary CI comparison.

\`\`\`typescript
// benchmarks/parse-log-regression.bench.ts
import { expect, test } from 'vitest'
import { parseLog } from '../src/parse-log'

const input = Array.from(
  { length: 500 },
  (_, index) => 'INFO|checkout|processed item ' + index,
)

function parseBatch(): number {
  let checksum = 0
  for (const line of input) {
    checksum += parseLog(line).message.length
  }
  return checksum
}

test('tracks parser throughput', async ({ bench }) => {
  if (import.meta.env.VITE_WRITE_BENCH) {
    await bench(
      'parser baseline',
      { writeResult: './benchmarks/results/parse-log.json' },
      () => parseBatch(),
    ).run()
    return
  }

  const comparison = await bench.compare(
    bench('current parser', () => parseBatch()),
    bench.from('parser baseline', './benchmarks/results/parse-log.json'),
  )

  const current = comparison.get('current parser')
  const baseline = comparison.get('parser baseline')

  expect(current.throughput.mean).toBeGreaterThanOrEqual(
    baseline.throughput.mean * 0.92,
  )
})
\`\`\`

The 8 percent allowance here is illustrative. A team must calibrate its tolerance from repeated runs on its own runner. The assertion compares the documented mean-throughput values and permits current throughput down to 92 percent of the reference. A production policy may instead use Vitest’s relative benchmark matchers, but confirm their delta semantics against the version the repository actually pins, especially during a major-version migration.

Generate the first reference only on the designated machine, inspect the new artifact, and commit it with the workload code:

\`\`\`bash
VITE_WRITE_BENCH=1 npx vitest bench benchmarks/parse-log-regression.bench.ts
git diff -- benchmarks/results/parse-log.json
npx vitest bench benchmarks/parse-log-regression.bench.ts
\`\`\`

The third command is essential. It proves the comparison path can read the artifact immediately after creation. If it fails, do not normalize the failure by increasing the tolerance. Check the result identity, workload, path, and environment first.

## Calibrate Noise Before You Pick a Gate

A performance threshold chosen from one pair of runs is guesswork. Repeat the benchmark on the intended runner with no code changes. Record central tendency, spread, runtime metadata, and abnormal host activity. The threshold should exceed ordinary noise while remaining lower than the smallest slowdown that matters to users or capacity.

Use an illustrative calibration worksheet like this:

| Signal | What it tells you | Release use |
|---|---|---|
| Mean throughput | Overall work completed per unit time | Primary comparison when workload is throughput-oriented |
| Mean time | Average operation duration | Easier to discuss for latency budgets |
| Percentiles | Tail behavior in measured samples | Detects unstable or spiky work |
| Relative margin of error | Estimate uncertainty | Warns when the result is too noisy to gate |
| Sample count | Amount of measured evidence | Helps compare run quality |
| Environment fingerprint | Runtime, OS, runner class, lockfile | Determines whether baseline comparison is valid |

Suppose unchanged runs vary by an illustrative 3 percent on the fixed runner, and product owners consider an 8 percent parser slowdown meaningful. An 8 percent gate may be defensible, but only after enough unchanged observations show that ordinary variation rarely crosses it. If unchanged runs vary by 12 percent, a tighter matcher will create random failures. Fix the environment or workload before declaring a threshold.

Do not confuse retries with evidence. Vitest supports test retries, and retrying a noisy failure can reduce transient disruption. It can also hide an unstable benchmark if the policy is “pass once out of several attempts.” Retain the failed measurements and investigate repeated first-attempt failures.

## Keep CI Comparisons on the Same Measuring Stick

Run benchmark gates on a consistent runner image and runtime family. Pin dependencies with the lockfile and install them reproducibly. Avoid matrix jobs that compare a baseline from one operating system against current results from another. If multiple runtimes matter, maintain separate baselines and interpret them as distinct performance contracts.

A minimal GitHub Actions workflow can run correctness first and the benchmark second. The example uses documented action inputs and ordinary package scripts.

\`\`\`yaml
name: performance-regression

on:
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --run
      - run: npm run bench -- benchmarks/parse-log-regression.bench.ts
\`\`\`

The corresponding scripts stay simple:

\`\`\`json
{
  "scripts": {
    "test": "vitest",
    "bench": "vitest bench"
  }
}
\`\`\`

Do not let pull requests update the committed baseline automatically. If a slower implementation overwrites its own reference and then compares against it, the gate becomes self-approving. Baseline refresh should be a separately authorized action, ideally after a reviewed performance change lands or when the standard runner intentionally changes.

| CI event | Baseline action | Required review |
|---|---|---|
| Ordinary pull request | Read only and compare | Investigate failures |
| Accepted optimization | Refresh after merge on standard runner | Confirm workload is unchanged |
| Intentional algorithm tradeoff | Refresh with written rationale | Product and performance ownership |
| Runner image migration | Recalibrate all affected baselines | Compare old and new environments separately |
| Dependency update | Compare first, refresh only if justified | Inspect runtime and transitive changes |

The [complete JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps place benchmark checks beside unit, component, and integration suites. The [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) is useful when the performance scenario also has browser-facing correctness checks. Keep microbenchmarks out of end-to-end tests, but use end-to-end evidence to decide which operations deserve performance budgets.

## Diagnose a Regression Without Blaming the Last Commit Too Soon

A realistic failure looks like this: the benchmark is 11 percent slower on a pull request, but the parser code did not change. The tempting conclusion is that a nearby dependency refactor caused the slowdown. The actual cause may be runner contention, a Node runtime change, different built artifacts, an input fixture edit, or module-loading overhead.

Diagnose in a fixed order:

1. Re-run on the same commit and same runner class. If the result swings across the gate, treat it as instability.
2. Compare environment fingerprints: runtime, operating system image, CPU information exposed by the runner, dependency lockfile, and relevant configuration.
3. Confirm the benchmark file and stored result names identify the same workload.
4. Run the correctness suite and inspect the checksum or consumed output.
5. Compare the base and head commits on the same machine in alternating order.
6. Profile only after the slowdown reproduces reliably.

The alternating order matters because thermal and host load trends can favor whichever commit runs first. Current Vitest comparison runs can interleave benchmark candidates to reduce environmental bias inside a comparison. Historical artifacts are still sensitive to the conditions under which they were recorded.

One common measurement defect is timing an imported binding through transformation overhead rather than the code of interest. Current Vitest documentation notes that module-runner getters can dominate very small operations. For a library, benchmark the built artifact consistently. For a tiny imported function, capture the function reference outside the timed callback when appropriate, or use the documented benchmark project configuration suited to native execution. Do not silence warnings until you understand them.

Another defect is dead-code elimination. If the benchmark parses data but never consumes the result, an optimizing engine may remove or simplify work. Returning a checksum, accumulating a value, or passing the result to a real consumer makes the outcome observable.

## What Teams Get Wrong About Historical Numbers

The biggest misconception is that a committed JSON file is an eternal truth. It is evidence from one workload on one environment at one time. Change the runtime, CPU class, bundling mode, input distribution, or benchmark implementation, and the old number may no longer answer the same question.

Treat a baseline like a test fixture with provenance. Review changes to it. Document why it moved. Never combine an intentional workload change and an implementation optimization without retaining enough history to separate their effects. Versioned artifacts are useful when you need to compare releases, while a single moving baseline is appropriate for a main-branch guard.

Also avoid turning every microbenchmark into a blocking gate. Gate only costs tied to a performance budget or a repeatedly expensive code path. Informational benchmarks can trend experimental operations until their variance and product relevance are understood. Too many fragile gates train developers to rerun jobs until they pass.

## Operate the Benchmark as a Maintained Test Asset

Assign ownership. A named team should know what the workload represents, which environment writes baselines, and what level of change needs approval. Add a comment near the benchmark explaining the user or capacity consequence. Keep input fixtures small enough to review but representative enough to matter.

On an intentional update, use this sequence:

1. Reproduce the old comparison on the standard runner.
2. Explain the accepted tradeoff or verified optimization.
3. Generate a new artifact without changing the workload in the same step.
4. Inspect the artifact diff and rerun comparison mode.
5. Preserve older versioned results when release-to-release analysis matters.
6. Record runtime and runner changes in the pull request.

Vitest’s official benchmark documentation is available at https://vitest.dev/guide/benchmarking.html. Read the documentation matching the pinned repository version before copying newer APIs into an older codebase. The benchmark API has changed across major versions, so a top-level \`bench\` example from an older guide may not match the current context-fixture model.

## Distinguish a Merge Gate From a Performance Trend

A baseline comparison answers a local question: did this revision cross an agreed boundary relative to a reference? A trend answers a different question: how has the metric moved across many main-branch revisions? Do not force one artifact to serve both purposes.

For a merge gate, keep the reference close to the benchmark and make failure immediate. For a trend, retain the current-result artifact with commit identity, runtime metadata, and workload version in an external artifact store or CI retention system. Plotting every pull-request run without separating runner classes creates a persuasive but meaningless line.

Use a trend record with explicit provenance. The following script creates a small metadata document after the benchmark command. It reads only documented Node process values and a commit value supplied by CI.

\`\`\`javascript
// scripts/benchmark-metadata.mjs
import { writeFile } from 'node:fs/promises'
import os from 'node:os'

const record = {
  commit: process.env.GIT_COMMIT || 'local',
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  cpuModel: os.cpus()[0]?.model || 'unknown',
  workload: 'parse-log-medium-v1',
}

await writeFile(
  'benchmarks/results/metadata.json',
  JSON.stringify(record, null, 2) + '\\n',
)
\`\`\`

This metadata does not make different hosts comparable. It helps reviewers detect that they are different. A useful dashboard filters by workload identity and canonical runner, shows the accepted baseline changes as annotations, and retains raw results long enough to investigate a slow drift.

Gradual regressions deserve special attention. Five changes may each remain inside an illustrative 8 percent gate while their combined slowdown is material. A moving baseline updated after every merge can normalize that drift. Keep a release baseline or a fixed service-level budget alongside the immediate main-branch comparison. Review trends on a schedule even when no single pull request fails.

## Design Multiple Sizes to Reveal Algorithmic Changes

A single medium input can detect a constant-factor slowdown but conceal a complexity change until production data grows. Add a small number of named sizes based on real operating ranges. Keep each size as a distinct test so failures identify the affected scale.

\`\`\`typescript
import { expect, test } from 'vitest'
import { parseLog } from '../src/parse-log'

function corpus(size: number): string[] {
  return Array.from(
    { length: size },
    (_, index) => 'INFO|search|indexed document ' + index,
  )
}

for (const size of [50, 500, 5_000]) {
  test('parses batch size ' + size, async ({ bench }) => {
    const lines = corpus(size)
    const result = await bench('current size ' + size, () => {
      let checksum = 0
      for (const line of lines) {
        checksum += parseLog(line).message.length
      }
      return checksum
    }).run()

    expect(result.throughput.mean).toBeGreaterThan(0)
  })
}
\`\`\`

The three sizes are illustrative. Choose values from production distributions or capacity models. Avoid an enormous case that makes every pull request expensive if it adds no diagnostic power. If the largest case behaves disproportionately worse, profile allocations and loops before changing the threshold. The purpose of size coverage is to expose scaling behavior, not to award a single “fastest” score.

When input size changes the semantic operation, split benchmarks by scenario instead. Cached and uncached requests, ASCII and Unicode parsing, successful and rejected validation, or shallow and deeply nested objects may exercise different paths. Name those paths explicitly and keep their baselines separate.

## Frequently Asked Questions

### How often should a Vitest benchmark baseline be updated?

Update it when the accepted implementation performance changes, the standard measuring environment intentionally changes, or the workload is deliberately revised. Do not refresh it on every pull request or simply because a gate failed. First reproduce and explain the difference. Generate the replacement on the designated runner, review the artifact diff, and immediately run comparison mode against the new file. If the workload changed, preserve the previous artifact or history so reviewers do not mistake a new question for an optimization.

### Should benchmark regressions block every pull request?

Only stable, product-relevant benchmarks should block merges. A gate needs a controlled runner, a calibrated tolerance, a deterministic workload, and an owner who can diagnose failures. Experimental or highly variable measures are better reported as informational trends until their noise is understood. Blocking on an unstable microbenchmark creates rerun culture and reduces trust in CI. Tie each blocking benchmark to latency, throughput, cost, or capacity impact that the team has agreed matters, then document the response expected when it fails.

### Why does a benchmark pass locally but fail in CI?

Local and CI machines differ in CPU scheduling, power behavior, runtime versions, background load, operating systems, and dependency state. A baseline produced locally may therefore be invalid on CI. Compare environment metadata, verify the same lockfile and command, and run base plus head on the same CI runner class. Also inspect whether one path benchmarks source while the other benchmarks a built artifact. The goal is not to make local numbers match CI, but to ensure every regression decision compares like with like.

### Can I use a single baseline across Node, browsers, and operating systems?

That is rarely defensible because engines, timer resolution, JIT tiers, module loading, and host scheduling differ. Maintain separate performance contracts for environments that matter, or select one canonical environment for the merge gate and run others informationally. Name artifacts so their project and runtime identity is unambiguous. When migrating the canonical environment, collect overlapping measurements on old and new systems before resetting references. A faster number on different hardware does not demonstrate an implementation improvement, and a slower one does not prove a regression.
`,
};
