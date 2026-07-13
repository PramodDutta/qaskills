import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Fail CI Only on New Coverage Regressions",
  description:
    "Enforce changed-code coverage in CI while leaving legacy gaps visible, using diff-aware line checks, stable baselines, and actionable pull request failures.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# Fail CI Only on New Coverage Regressions

A pull request adds six executable lines and tests five. The repository still reports 47 percent coverage, but that historical number says almost nothing about whether this change is safe. A global 80 percent gate would block every useful patch for months. A diff-aware gate asks the narrower question that reviewers actually need answered: did this pull request exercise the behavior it introduced or modified?

Changed-code coverage is a ratchet. It prevents the tested surface from shrinking without pretending that yesterday's untested code disappeared. The implementation is more subtle than comparing two headline percentages. CI must identify changed executable lines, map those lines to an instrumented report from the exact revision under review, handle renames and deletions, and produce a failure a developer can fix without reverse-engineering the gate.

This guide builds that policy from Jest's Istanbul-compatible JSON output and a small TypeScript checker. The same reasoning applies to Cobertura, LCOV, and language-specific tools, but the example stays concrete.

## Define regression at line level, not repository level

Suppose main has 10,000 covered lines out of 20,000. A pull request adds 100 thoroughly tested lines, then deletes 200 covered lines during cleanup. Total coverage can fall even though every new line is covered. Conversely, a pull request can add an untested error path while total coverage rises because an unrelated integration test happens to execute a large old module.

The useful denominator is the set of coverable lines added or modified by the diff. Deleted lines are not in the new program, blank lines cannot execute, and type-only declarations should not count if the coverage provider does not instrument them. For each changed line that appears in the coverage report, inspect its execution count. Lines absent from the report are non-coverable for this measurement, not automatically uncovered.

| Signal | What it measures | Appropriate CI decision |
|---|---|---|
| Global line percentage | Entire instrumented source tree | Trend and modernization target |
| Percentage-point delta | Head report compared with base report | Warning for broad unexpected movement |
| Changed coverable lines | Executed lines intersecting the PR diff | Hard gate for new behavior |
| Uncovered changed branch | A new decision outcome never taken | Separate branch-quality gate if tooling maps branches precisely |
| Test count | Number of executed test cases | Diagnostic only, not evidence of behavioral coverage |

Call the policy “new coverage regression” only after deciding whether modification means every line in a changed hunk or only added lines. Most teams use added and replacement lines from the head revision. That makes the result reproducible from the pull request diff and current coverage artifact.

## Produce coverage that lines up with the reviewed commit

Run the test suite after checking out the pull request head, not an arbitrary merge result, if the diff service reports line numbers for the head. Jest can write \`coverage-final.json\`, where each file includes a statement map and statement counters. It can also write LCOV, but the JSON preserves exact statement locations without another parser dependency.

\`\`\`typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text-summary', 'json'],
  testPathIgnorePatterns: ['/dist/'],
};

export default config;
\`\`\`

Do not mix a base-revision coverage artifact with source from the head revision and then compare raw line numbers. A three-line import inserted near the top shifts downstream locations. Diff coverage normally needs only the head report plus the diff's head-side line numbers. Baseline coverage is useful for trend reporting, but it is not required to decide whether new lines executed.

Source maps deserve an explicit check. With transformed TypeScript, open \`coverage-final.json\` and confirm that keys identify \`.ts\` or \`.tsx\` source paths and that statement locations match the original files. If the report points at generated JavaScript, the intersection will be meaningless. Coverage exclusions also need to match repository policy; [excluding generated files from Jest coverage](/blog/jest-coverage-ignore-generated-files) explains how to remove mechanical output without hiding handwritten adapters.

## Extract head-side line numbers from a zero-context diff

A normal patch contains context lines that were not changed. Ask Git for zero lines of context and parse hunk headers such as \`@@ -21,0 +22,3 @@\`. On the plus side, the first number is the starting line in the head file and the optional second number is its length. A missing length means one line. A length of zero contributes no head lines, which is how a pure deletion appears.

Renames need the current path from the \`+++ b/...\` header. Binary files have no text hunks. Quoted paths and unusual characters complicate a hand-rolled parser, so either constrain source paths or consume a maintained diff parser in a larger implementation. The compact script below is intentionally scoped to ordinary UTF-8 repository paths.

\`\`\`typescript
// scripts/check-diff-coverage.ts
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

type FileCoverage = {
  statementMap: Record<string, { start: { line: number }; end: { line: number } }>;
  s: Record<string, number>;
};

const base = process.env.COVERAGE_BASE ?? 'origin/main';
const minimum = Number(process.env.DIFF_COVERAGE_MINIMUM ?? '90');
const diff = execFileSync(
  'git',
  ['diff', '--unified=0', '--no-color', \`\${base}...HEAD\`, '--', 'src'],
  { encoding: 'utf8' },
);
const report = JSON.parse(
  readFileSync('coverage/coverage-final.json', 'utf8'),
) as Record<string, FileCoverage>;

const changed = new Map<string, Set<number>>();
let current: string | undefined;
for (const line of diff.split('\\n')) {
  if (line.startsWith('+++ b/')) {
    current = line.slice(6);
    changed.set(current, changed.get(current) ?? new Set());
    continue;
  }
  const hunk = line.match(/^@@ -\\d+(?:,\\d+)? \\+(\\d+)(?:,(\\d+))? @@/);
  if (!current || !hunk) continue;
  const start = Number(hunk[1]);
  const length = hunk[2] === undefined ? 1 : Number(hunk[2]);
  for (let offset = 0; offset < length; offset += 1) {
    changed.get(current)?.add(start + offset);
  }
}

let coverable = 0;
let covered = 0;
const misses: string[] = [];
for (const [absolutePath, file] of Object.entries(report)) {
  const repoPath = relative(process.cwd(), resolve(absolutePath)).replaceAll('\\', '/');
  const changedLines = changed.get(repoPath);
  if (!changedLines) continue;

  const lineHits = new Map<number, number>();
  for (const [id, location] of Object.entries(file.statementMap)) {
    const line = location.start.line;
    lineHits.set(line, Math.max(lineHits.get(line) ?? 0, file.s[id] ?? 0));
  }
  for (const line of changedLines) {
    const hits = lineHits.get(line);
    if (hits === undefined) continue;
    coverable += 1;
    if (hits > 0) covered += 1;
    else misses.push(\`\${repoPath}:\${line}\`);
  }
}

const percent = coverable === 0 ? 100 : (covered / coverable) * 100;
console.log(\`Changed-line coverage: \${covered}/\${coverable} (\${percent.toFixed(1)}%)\`);
if (percent < minimum) {
  console.error(\`Uncovered changed lines:\\n\${misses.join('\\n')}\`);
  process.exitCode = 1;
}
\`\`\`

This is a line gate derived from statement starts. A multi-line statement is associated with its starting line, matching the convention used by many line reports. It does not calculate branch coverage. Treating every line spanned by a statement as separately coverable would inflate the denominator and can report misleading misses on formatting-only lines.

## Wire the ratchet into a pull request job

The checkout must have enough history to resolve the merge base. A shallow clone with only the head commit cannot evaluate \`origin/main...HEAD\`. Fetching the base branch explicitly makes the dependency visible. Pin third-party actions according to your organization's supply-chain policy; the version labels below illustrate the workflow, not a promise about future marketplace releases.

\`\`\`yaml
name: Changed coverage

on:
  pull_request:

jobs:
  diff-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage --runInBand
      - name: Enforce coverage on changed executable lines
        env:
          COVERAGE_BASE: origin/\${{ github.base_ref }}
          DIFF_COVERAGE_MINIMUM: '90'
        run: pnpm exec tsx scripts/check-diff-coverage.ts
\`\`\`

The workflow contains \`\${{ ... }}\`, so in this TypeScript article source it must be escaped to prevent template-literal interpolation. In the rendered Markdown, readers see the normal GitHub Actions expression.

For forked pull requests, this job only needs read access if it computes locally. Do not expose repository secrets to execute untrusted code. Coverage runs the contributor's tests and build hooks, so a privileged workflow is unnecessary and risky.

## Choose a threshold that describes acceptable evidence

A 100 percent changed-line rule sounds clean, yet compiler helpers, defensive assertions, and environment-specific branches can create exceptions that are expensive without improving confidence. On the other hand, a 50 percent gate is easy to game by testing only the success path. Start from risk: require full execution for small security or billing changes, permit a documented tolerance for broad UI refactors, and consider branch coverage separately where decision outcomes matter.

| Policy shape | Advantage | Failure mode to watch |
|---|---|---|
| Fixed 90 percent changed lines | Predictable and easy to explain | One uncovered line fails a nine-line patch but not a large patch |
| Maximum one uncovered changed line | Fair for small changes | Becomes too weak for very large diffs |
| 100 percent for selected directories | Strong protection for critical code | Path movement can accidentally change enforcement |
| Warning first, gate after trial period | Reveals noisy cases before blocking | Warning can become permanent if no owner sets a date |
| Branch plus line thresholds | Catches untested decisions | Requires reliable branch-to-source mapping |

Avoid rounding before the comparison. If the true result is 89.95 and the minimum is 90, displaying 90.0 while failing is confusing. Compare the raw value, and show enough precision to make the decision legible.

## Make failures useful during review

A red check named “coverage” is insufficient. Print the number of coverable changed lines, the number executed, the configured threshold, and every uncovered \`path:line\`. Cap very long lists in the console while attaching a complete artifact. A pull request annotation is helpful, but the checker must remain usable outside one hosting vendor.

There are three legitimate resolutions to a miss: add a test that executes the behavior, remove dead or accidental code, or approve a narrowly scoped exclusion with reasoning. Lowering the repository-wide minimum for one awkward line damages the ratchet. Blanket ignore comments are worse because they disappear from the changed-line denominator and future global reports.

Formatting-only changes should normally yield zero coverable lines and pass. A test-only pull request should also pass the source gate while still running tests. A source file absent from the report deserves investigation: perhaps Jest never collected it, perhaps it is a type-only file, or perhaps a path normalization bug silently removed it. Consider failing when a changed source file has plausible executable syntax but no coverage entry, though implementing that robustly requires a parser, not a filename guess.

## Separate the ratchet from legacy remediation

Diff coverage stops additional debt; it does not pay down old debt. Keep a global report visible, assign coverage improvements to risky modules, and use mutation or targeted integration testing where line execution overstates confidence. The companion [pytest coverage guide](/blog/pytest-coverage-pytest-cov-guide-2026) shows how another ecosystem collects and reports coverage, which is useful when a monorepo needs one policy across JavaScript and Python.

A mature dashboard can show both figures without conflating them: “changed lines 96 percent, repository lines 47 percent.” The first is a merge decision. The second is a planning signal. If leadership turns the global number into an immediate gate, teams often respond by excluding files or writing assertion-free tests. Keep incentives aligned with evidence.

## Test the coverage gate as production code

The checker controls releases, so give it fixtures. Include a diff with one-line hunks, omitted hunk lengths, pure deletions, a renamed file, Windows path separators, and a report where multiple statements start on one line. Test a zero-coverable-line change and the exact threshold boundary. Run those unit tests without invoking Git by passing diff text and coverage objects into pure functions.

Also perform one end-to-end repository check: introduce a temporary uncovered executable line in a fixture branch and confirm the job fails at that location. Then cover it and confirm the job passes. This catches disagreement among checkout strategy, source maps, report paths, and merge-base selection that unit tests cannot see.

Monitor denominator movement after dependency or transformer upgrades. A switch from Babel to V8 coverage can change what counts as a statement and how branches map. That is not necessarily wrong, but it is a policy change and should be reviewed like one.

## Partition monorepo coverage without losing changed files

A monorepo often produces one coverage report per package. If the checker reads only the package selected by a path filter, a shared library changed by the pull request may disappear even though several consumers ran. Build a manifest of report paths after all relevant test jobs finish, normalize their source paths to the repository root, and merge line hits by maximum execution count. Summing hits is harmless for the covered-or-not decision but can mislead diagnostic counts.

Package selection and coverage enforcement answer different questions. An affected-project tool decides which tests should run. The diff checker decides whether changed executable lines appear in the resulting reports and were executed. If selection omits a package containing changed source, fail with “no coverage report for changed package” rather than interpreting absence as a perfect zero-line change.

Generated reports from parallel shards may describe the same file. Merge them before intersecting the diff so a statement covered on shard two is not marked missed because shard one ran a different test subset. Istanbul libraries can merge coverage maps, or a small implementation can combine counters only when statement maps are identical. Mismatched maps usually indicate different builds or source-map configuration and should stop the gate.

Path filters also need rename awareness. Moving a rules file between packages can appear as delete plus add depending on similarity detection. The head-side path is what must match the current report. Do not require coverage for the deleted path, and do not assume a rename carries proof from the old location if the current test run never imports the new package.

For changes spanning multiple languages, publish one check per ecosystem plus a small aggregate status. A single percentage mixing JavaScript statements and Python lines has no stable semantic denominator. Reviewers benefit more from “TypeScript changed lines 94 percent, Python changed lines 100 percent” than from a weighted number dominated by whichever report happens to contain more instrumented lines.

## Frequently Asked Questions

### Should changed-code coverage compare the base and head percentages?

Not for the primary gate. Generate coverage on the head commit, derive head-side changed lines from the merge-base diff, and measure their execution. Base and head totals are valuable as a separate trend because line movement makes direct percentage deltas noisy.

### What happens when a pull request only deletes code?

It contributes no head-side changed lines, so the diff gate should pass with a clearly reported zero-line denominator. The normal test suite still has to pass, and the global coverage trend may move.

### Can Jest coverageThreshold enforce changed lines by itself?

No. Jest supports global thresholds and path or glob thresholds, including limits on uncovered entities, but it does not intersect coverage locations with a Git diff. A checker or coverage service must perform that intersection.

### Should generated code count toward the pull request gate?

Only if the team owns and tests that generated output as production logic. Usually generated artifacts are excluded consistently from collection, while handwritten adapters and generator inputs receive tests. The exception policy must match the global report.

### How should stacked pull requests choose a base?

Compare against the actual target branch of each pull request, not always the default branch. Otherwise a child change inherits its parent's lines and can fail for coverage outside its review scope. Fetch that target and use the merge-base three-dot diff.
`,
};
