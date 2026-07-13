import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Shard Playwright Tests by Duration in GitHub Actions',
  description:
    'Shard Playwright tests by historical duration in GitHub Actions using a deterministic bin-packing script, dynamic matrices, and timing feedback controls.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Shard Playwright Tests by Duration in GitHub Actions

Shard 3 is still running nine minutes after shards 1, 2, and 4 have uploaded their reports. The suite was divided evenly by test count, but one shard inherited checkout, visual comparison, and report-export specs while another received short validation cases. CI finishes when the slowest shard finishes, so three idle runners do nothing for pull-request latency.

Playwright's built-in \`--shard=x/y\` is the correct starting point, especially with \`fullyParallel: true\`. It balances runnable tests by count, not by your repository's historical wall time. When duration variance remains material, an external planner can assign whole spec files to GitHub matrix jobs using observed timings. Whole-file assignment preserves file-level setup assumptions and makes the plan easy to audit.

This tutorial creates that planner without inventing a Playwright flag. It records spec duration through the documented reporter API, applies longest-processing-time greedy bin packing, emits a dynamic GitHub Actions matrix, and feeds completed timings back carefully. For conventional matrix syntax first, read the [GitHub Actions Playwright matrix guide](/blog/github-actions-playwright-matrix-guide-2026). For native count-based behavior and blob report merging, use the [Playwright parallel sharding guide](/blog/playwright-parallel-sharding-execution-guide).

## Confirm that imbalance, not test runtime, is the bottleneck

Duration-aware scheduling does not make any test faster. It reduces the gap between the earliest and latest shard by distributing expensive files. Measure shard execution from the start of the Playwright command to its exit. Browser installation, application boot, and artifact upload may be common overhead that bin packing cannot fix.

Define imbalance as the slowest shard duration divided by the mean shard duration. A perfectly balanced run approaches 1.0. Also inspect the absolute tail gap, because a 1.3 ratio on a two-minute suite may not justify custom infrastructure, while the same ratio on a forty-minute suite often does.

| Signal | Interpretation | Scheduling response |
|---|---|---|
| One file exceeds the target shard duration | Unsplittable long pole | Refactor file or allow test-level assignment |
| All shards spend most time in setup | Shared overhead dominates | Optimize boot and dependency preparation |
| Slow shard changes randomly each run | Flakiness or environment variance | Stabilize tests before trusting history |
| Same files repeatedly dominate | Predictable duration skew | Historical bin packing is suitable |
| Shards balanced but merge job is slow | Reporting is the tail | Optimize artifacts and report merge |
| More shards stop improving elapsed time | Coordination overhead reached | Cap parallelism |

Use several successful main-branch runs, not one exceptional build. Exclude retries from the baseline initially or store them separately. A flaky test that sometimes consumes a retry budget needs quarantine and repair; letting its worst run distort every future assignment is an expensive workaround.

## Pick the scheduling unit deliberately

File-level scheduling is the safest custom unit. Passing spec paths to \`playwright test\` uses Playwright's normal test selection API, and tests inside each file still use configured workers. It also keeps \`beforeAll\` and serial groups together.

Test-level scheduling can balance more precisely, but selecting individual titles is fragile when names collide or change. It may repeat file-level setup across shards, and serial suites cannot be split. Native sharding with \`fullyParallel\` already offers fine-grained count distribution. Use a custom test-level system only after demonstrating that one or two files are unavoidable long poles and restructuring them is impractical.

| Unit | Balance precision | Operational risk | Best fit |
|---|---:|---:|---|
| Directory | Low | Low | Teams with naturally equal feature areas |
| Spec file | Good | Low to moderate | Most duration-aware CI suites |
| Individual test | High | High | Independent tests with stable IDs |
| Native \`--shard\` | Count-based | Lowest | Default for balanced test costs |
| Project | Usually poor for time | Low | Browser or environment separation, not load balance |

Do not confuse browser projects with shards. Running Chromium and WebKit in different jobs isolates environments, but their durations may differ significantly. Generate a separate timing plan per project when browser cost is part of the matrix.

## Capture file timings with a Playwright reporter

Playwright reporters receive \`onTestEnd(test, result)\`. The \`TestCase\` exposes its source location, and \`TestResult.duration\` reports elapsed milliseconds for that result. Aggregate durations per source file and write JSON at the end of the run.

This reporter produces one observation file for a shard. It includes all attempts, so a retried test contributes each attempt's time. If you want clean expected duration, store retry time separately rather than quietly discarding it.

\`\`\`typescript
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class DurationReporter implements Reporter {
  private readonly milliseconds = new Map<string, number>();

  onTestEnd(test: TestCase, result: TestResult) {
    const file = path.relative(process.cwd(), test.location.file).split(path.sep).join('/');
    this.milliseconds.set(file, (this.milliseconds.get(file) ?? 0) + result.duration);
  }

  onEnd() {
    mkdirSync('test-results', { recursive: true });
    writeFileSync(
      'test-results/durations.json',
      JSON.stringify(Object.fromEntries(this.milliseconds), null, 2),
    );
  }
}

export default DurationReporter;
\`\`\`

Configure it alongside a blob or HTML reporter:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: process.env.CI
    ? [['blob'], ['./reporters/duration-reporter.ts']]
    : [['html', { open: 'never' }]],
  use: { trace: 'on-first-retry' },
});
\`\`\`

Because parallel matrix jobs each write a partial file, merge those maps by summing values for distinct specs and resolving duplicates deliberately. A spec should normally appear in one duration-planned shard. If the same spec runs in multiple projects, namespace the history by project instead of summing browser engines into one ambiguous value.

## Smooth history without hiding real changes

Raw last-run timing reacts too aggressively to transient load. Use a rolling median or an exponentially weighted moving average over successful non-cancelled runs. Median resists one-off infrastructure stalls. Exponential weighting adapts faster when a file genuinely becomes more expensive.

Store sample count and dispersion, not only a single estimate. A planner can give uncertain files a safety multiplier or distribute them across bins. New files need a fallback estimate. A reasonable fallback is the median known spec duration, while assigning zero guarantees new work piles arbitrarily into one shard.

Timing data is build output, not hand-maintained truth. Keep a versioned baseline JSON in the repository if code review and reproducibility matter, or download the latest trusted main-branch artifact through GitHub's APIs. Do not let an untrusted pull request overwrite the baseline later consumed by privileged workflows.

## Pack longest files into the lightest bin

Exact multiprocessor scheduling is computationally expensive, but a simple greedy heuristic works well for CI. Sort files from longest to shortest, then place each into the currently lightest bin. This is commonly called longest processing time first. It is deterministic when ties use the file path.

The following script reads \`test-timings.json\`, accepts the shard count as an argument, and prints the compact matrix JSON GitHub needs. Its output includes estimated load for debugging.

\`\`\`typescript
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

type TimingMap = Record<string, number>;
type Bin = { shard: number; specs: string[]; estimatedMs: number };

const shardCount = Number(process.argv[2] ?? 4);
if (!Number.isInteger(shardCount) || shardCount < 1) throw new Error('Invalid shard count');

const timings = JSON.parse(readFileSync('test-timings.json', 'utf8')) as TimingMap;
const known = Object.entries(timings).filter(([, ms]) => Number.isFinite(ms) && ms > 0);
if (known.length === 0) throw new Error('No valid historical timings');

const sortedValues = known.map(([, ms]) => ms).sort((a, b) => a - b);
const fallbackMs = sortedValues[Math.floor(sortedValues.length / 2)];

function discoverSpecs(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return discoverSpecs(absolute);
    if (!/\.(spec|test)\.[cm]?[jt]sx?$/.test(entry.name)) return [];
    return [path.relative(process.cwd(), absolute).split(path.sep).join('/')];
  });
}

const candidates = discoverSpecs('tests/e2e')
  .map((file) => ({ file, ms: timings[file] ?? fallbackMs }))
  .sort((a, b) => b.ms - a.ms || a.file.localeCompare(b.file));

const bins: Bin[] = Array.from({ length: shardCount }, (_, index) => ({
  shard: index + 1,
  specs: [],
  estimatedMs: 0,
}));

for (const candidate of candidates) {
  bins.sort((a, b) => a.estimatedMs - b.estimatedMs || a.shard - b.shard);
  bins[0].specs.push(candidate.file);
  bins[0].estimatedMs += candidate.ms;
}

bins.sort((a, b) => a.shard - b.shard);
process.stdout.write(JSON.stringify({ include: bins }));
\`\`\`

The recursive discovery matches conventional \`.spec\` and \`.test\` files below \`tests/e2e\`. Adapt the directory and matcher to the project's Playwright configuration. Deleted files disappear, and newly added files enter with the fallback. Avoid parsing \`playwright test --list\` console formatting, which is intended for people and can change.

## Feed the plan into a dynamic Actions matrix

GitHub evaluates a downstream matrix from a job output. The planning job writes one-line JSON to \`GITHUB_OUTPUT\`, then each test job receives an array of spec paths. Passing that array directly through a shell risks quoting errors, so the workflow exposes JSON to a Node runner that uses \`spawnSync\` with an argument array.

\`\`\`yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      matrix: \${{ steps.balance.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - id: balance
        name: Build duration-balanced matrix
        run: echo "matrix=$(npx tsx scripts/balance-shards.ts 4)" >> "$GITHUB_OUTPUT"

  playwright:
    needs: plan
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix: \${{ fromJSON(needs.plan.outputs.matrix) }}
    name: Playwright shard \${{ matrix.shard }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run assigned specs
        env:
          SPECS_JSON: \${{ toJSON(matrix.specs) }}
        run: node scripts/run-playwright-shard.mjs
      - name: Upload blob and timing data
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: shard-\${{ matrix.shard }}
          path: |
            blob-report/
            test-results/durations.json
\`\`\`

The wrapper is intentionally small and treats spec names as data rather than shell source:

\`\`\`javascript
import { spawnSync } from 'node:child_process';

const specs = JSON.parse(process.env.SPECS_JSON ?? '[]');
if (!Array.isArray(specs) || specs.some((value) => typeof value !== 'string')) {
  throw new Error('SPECS_JSON must be a string array');
}
if (specs.length === 0) process.exit(0);

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['playwright', 'test', '--project=chromium', ...specs],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
\`\`\`

The plan job installs the locked development dependencies before invoking \`tsx\`. In a locked-down pipeline, \`npm exec tsx\` can make the intent to use the installed binary clearer and avoid an implicit package download.

## Handle new, renamed, and quarantined specs

History is always incomplete. File discovery should establish the current set, while history only supplies weights. A new file gets the median fallback, a renamed file looks new, and a deleted file vanishes. This behavior is safe and understandable.

Quarantined tests need an explicit policy. If they run in a separate job, exclude them from the normal plan and maintain separate timing. If they remain in the suite with retries, their duration can dominate. Do not silently cap their weight, because the predicted completion time then becomes dishonest. Fix or isolate them.

Generated tests complicate discovery because their files may not exist until a build step. Either run generation in the planner and upload the result, or schedule at a stable manifest level. The test job must execute exactly the revision and generated inputs used by the plan.

## Prevent global setup from multiplying unexpectedly

Every shard is a separate Playwright invocation. Global setup, web-server startup, authentication-state creation, and database seeding may run once per shard. Adding shards can therefore increase load even if test execution balances perfectly.

Make global setup idempotent or move expensive environment provisioning into a predecessor job. Use worker-scoped fixtures for resources that truly belong to a worker and shard-specific namespaces for mutable data. Never point parallel shards at one account whose tests change shared state.

A timing estimate based only on test results omits global setup. If setup varies by shard content, add a fixed overhead to every bin or record invocation wall time separately. Fixed overhead does not affect which file enters which bin, but it matters when choosing the number of shards.

## Merge results without losing shard identity

Use Playwright's blob reporter for the test jobs and merge blobs after every shard completes. Keep \`fail-fast: false\` so one failed shard does not cancel timing and result collection from its siblings. Run the merge job under \`if: \${{ !cancelled() }}\` semantics so failures still produce a readable report.

The timing artifact is not the test report. Blob data is for outcome merging; duration JSON is planner input. Retain the actual shard number and estimated load in metadata so a dashboard can compare predicted and actual values. Large persistent error for one file is a signal to refresh or split it.

Do not publish failed-run timing directly as the next trusted baseline without a rule. A fail-fast assertion early in a spec can make a slow file appear cheap, while retries can make it appear abnormally expensive. Update history from completed results, annotate status, and choose aggregation consciously.

## Test the planner as production scheduling code

The bin packer influences CI coverage, so unit-test it. Required invariants include every current file appearing exactly once, no unknown file appearing, exactly N bins when enough work exists, deterministic output for equal inputs, positive fallback for unseen files, and empty bins handled without invoking Playwright.

Property-based tests are valuable here: generate random file lists and timings, then assert no duplication or loss. A golden test can show the expected distribution for a known skewed suite. Do not assert the mathematically optimal makespan unless the algorithm promises one; greedy packing is a heuristic.

Security also matters. Spec paths from the repository must remain arguments, not interpolated shell fragments. The Node wrapper above closes that gap. Timing artifacts from forks should not become a writable trusted input for default-branch or deployment workflows.

## Know when native sharding is the better answer

Custom scheduling has ownership cost. Playwright's native sharding understands its test graph and integrates naturally with reports. With \`fullyParallel: true\`, it distributes individual tests by count, which is often adequate after oversized specs are split. Native sharding also includes new tests automatically without a separate discovery and history system.

| Approach | Advantages | Tradeoff |
|---|---|---|
| Native sharding with \`fullyParallel\` | Minimal maintenance, fine-grained count balance | Ignores historical duration |
| Duration-balanced spec files | Predictable, auditable, setup-friendly | History and planner must be maintained |
| Static hand-curated groups | Simple runtime behavior | Drifts quickly and creates review chores |
| One job with more workers | No cross-job report merge | Limited by one runner's CPU and memory |
| Split oversized specs plus native shards | Removes long poles with little infrastructure | Requires test refactoring |

Start with native sharding, inspect the tail, split pathological files, and adopt historical packing only when the remaining skew has a measurable cost. Complexity should earn its place on the critical path.

## Frequently Asked Questions

### Does Playwright have a built-in flag that shards by historical duration?

The documented \`--shard=x/y\` mechanism distributes tests by count and granularity controlled by \`fullyParallel\`. The duration-aware method here is an external scheduler that passes assigned spec paths to normal Playwright selection.

### Should retry duration be included in the history?

Store it, but separate expected first-attempt cost from flaky retry cost. Scheduling around repeated failures can stabilize today’s tail while hiding the defect that should be quarantined or fixed.

### What estimate should a newly added spec receive?

Use a nonzero fallback such as the median duration of known specs, then replace it after trusted observations arrive. Zero-weight files cluster unpredictably and make the matrix estimate falsely optimistic.

### Why not put each individual test into a duration-balanced bin?

Individual selection complicates stable identity, serial groups, duplicate titles, and file-level setup. Spec files usually deliver enough precision while preserving Playwright's normal execution semantics.

### How often should the timing baseline change?

Update it from trusted, sufficiently complete main-branch runs and smooth multiple observations. Trigger a faster refresh after major fixture, environment, or application changes, but keep the update reviewable and reversible.
`,
};
