import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest 4 JSON Reporter: Output Schema, Changelog Changes, and CI Parsing',
  description:
    'The Vitest JSON reporter now writes to a file instead of stdout, breaking piped CI scripts. The new default paths, the stdout opt-in, the full payload schema, and safe parsing.',
  date: '2026-08-23',
  category: 'Reference',
  content: `
# Vitest 4 JSON Reporter: Output Schema, Changelog Changes, and CI Parsing

The change that breaks existing pipelines: **the \`json\` reporter now writes to a file by default instead of printing to stdout.** If your CI does \`vitest --reporter=json | jq\`, that pipe now receives nothing useful, because the report went to \`.vitest/json/output.json\` on disk.

You have two ways to fix it. Read the artifact file instead of piping, or explicitly opt back into stdout:

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Restores the old piping behavior.
    reporters: [['json', { stdout: true }]],
  },
});
\`\`\`

An explicit \`outputFile\` is still respected and behaves as it always did, so any setup that already named its own path is unaffected. Only the default moved.

Before acting on any of this, confirm which line you are actually on, because the reporter defaults differ between major versions:

\`\`\`bash
npx vitest --version
\`\`\`

## What moved, exactly

| Reporter | Old default | New default |
|---|---|---|
| \`json\` | stdout | \`.vitest/json/output.json\` |
| \`junit\` | stdout | \`.vitest/junit/output.xml\` |
| \`blob\` | \`.vitest-reports/blob-*.json\` | \`.vitest/blob/blob-*.json\` |
| \`html\` | \`html/index.html\` | \`.vitest/index.html\` |

The HTML reporter has a second, sharper change: its option was renamed from \`outputFile\` (which named a file) to \`outputDir\` (which names a directory). A config still passing \`outputFile\` to the HTML reporter is not doing what it looks like it is doing, and this one is easy to miss in review because the old key does not read as wrong.

The consolidation under a single \`.vitest/\` directory is the theme. If your \`.gitignore\` lists \`.vitest-reports/\` and \`html/\` but not \`.vitest/\`, generated artifacts will start showing up as untracked files:

\`\`\`bash
# .gitignore
.vitest/
\`\`\`

## The JSON payload schema

The payload keeps the Jest-compatible shape, which is why so much tooling can read it. The top level:

| Field | Type | Notes |
|---|---|---|
| \`success\` | boolean | False if any test failed |
| \`startTime\` | number | Epoch milliseconds |
| \`numTotalTestSuites\` | number | Files, not \`describe\` blocks |
| \`numTotalTests\` | number | Individual test cases |
| \`numPassedTests\` | number | |
| \`numFailedTests\` | number | |
| \`numPendingTests\` | number | Skipped or todo |
| \`testResults\` | array | One entry per test file |
| \`coverageMap\` | object | Present only when coverage is enabled |

Each entry in \`testResults\` describes one file and contains \`assertionResults\`, one per test case:

\`\`\`json
{
  "success": false,
  "startTime": 1756000000000,
  "numTotalTests": 3,
  "numPassedTests": 2,
  "numFailedTests": 1,
  "testResults": [
    {
      "name": "/repo/src/cart.test.ts",
      "status": "failed",
      "startTime": 1756000000100,
      "endTime": 1756000000420,
      "assertionResults": [
        {
          "ancestorTitles": ["cart", "totals"],
          "title": "applies percentage discounts",
          "fullName": "cart > totals > applies percentage discounts",
          "status": "failed",
          "duration": 12,
          "failureMessages": ["AssertionError: expected 90 to be 85"],
          "location": { "line": 42, "column": 5 }
        }
      ]
    }
  ]
}
\`\`\`

Three fields deserve attention because they are the ones parsers get wrong.

**\`numTotalTestSuites\` counts files, not \`describe\` blocks.** A file with four \`describe\` blocks contributes one. Dashboards that label this number "suites" and expect it to track nesting will report something meaningless.

**\`fullName\` joins the suite chain and the test name with \` > \`.** This matters beyond display: the \`-t\` / \`--testNamePattern\` flag now matches against that same joined string. Previously the segments were joined with a single space, mirroring Jest. Any stored filter written against the old spacing silently matches nothing after the upgrade, and a pattern that matches nothing is not an error, it is an empty run that exits zero.

**\`location\` is only populated when the reporter can resolve it.** Treat it as optional in every consumer.

## Parsing it safely in CI

The naive parser breaks the first time a run fails to start, because a crashed run may leave no file at all.

\`\`\`ts
// scripts/parse-vitest-json.ts
import { readFileSync, existsSync } from 'node:fs';

interface AssertionResult {
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'todo' | 'skipped';
  duration?: number;
  failureMessages?: string[];
}

interface FileResult {
  name: string;
  status: string;
  assertionResults: AssertionResult[];
}

interface VitestJson {
  success: boolean;
  numTotalTests: number;
  numFailedTests: number;
  testResults: FileResult[];
}

const REPORT = process.env.VITEST_JSON ?? '.vitest/json/output.json';

if (!existsSync(REPORT)) {
  // A missing report means the run never produced one: config error,
  // crash before collection, or a path that changed under you.
  console.error('No Vitest report at ' + REPORT + '. Did the run start?');
  process.exit(2);
}

const report = JSON.parse(readFileSync(REPORT, 'utf8')) as VitestJson;

const failures = report.testResults.flatMap((file) =>
  file.assertionResults
    .filter((a) => a.status === 'failed')
    .map((a) => ({ file: file.name, name: a.fullName, messages: a.failureMessages ?? [] })),
);

for (const f of failures) {
  console.error(f.file + ' :: ' + f.name);
  for (const m of f.messages) console.error('    ' + m.split('\\n')[0]);
}

console.log(report.numTotalTests - report.numFailedTests + '/' + report.numTotalTests + ' passed');
process.exit(report.success ? 0 : 1);
\`\`\`

Exiting 2 on a missing file rather than 0 is the important detail. A pipeline that treats "no report" as "no failures" reports green on a run that never executed, which is the worst possible outcome for a test reporter.

## Running JSON alongside a readable reporter

You almost always want both: something human-readable in the log and a machine-readable artifact on disk.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: process.env.CI
      ? ['default', ['json', { outputFile: '.vitest/json/output.json' }]]
      : ['default'],
  },
});
\`\`\`

Naming \`outputFile\` explicitly is worth doing even when it matches the current default. It pins the path against future default changes, and it documents for the next reader where the artifact lands. That single line would have made this entire migration a no-op.

From the command line the equivalent is:

\`\`\`bash
npx vitest run --reporter=default --reporter=json --outputFile=.vitest/json/output.json
\`\`\`

When you pass multiple reporters and want distinct paths, \`outputFile\` accepts an object keyed by reporter name:

\`\`\`ts
export default defineConfig({
  test: {
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: '.vitest/json/output.json',
      junit: '.vitest/junit/output.xml',
    },
  },
});
\`\`\`

## Uploading the artifact from GitHub Actions

\`\`\`yaml
name: Test
on: [push, pull_request]

jobs:
  vitest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx vitest run --reporter=default --reporter=json --outputFile=.vitest/json/output.json
      - name: Upload test report
        # Without always(), a failing test run skips this and you lose the
        # artifact that explains the failure.
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: vitest-json
          path: .vitest/json/output.json
\`\`\`

\`if: always()\` is not optional here. The report exists precisely because tests failed, and the default \`success()\` condition throws it away exactly when you need it.

## Coverage inside the same payload

With coverage enabled, the JSON report gains a \`coverageMap\` keyed by absolute file path. That lets one artifact answer both "what failed" and "what is covered" without correlating two files.

\`\`\`bash
npx vitest run --coverage --reporter=json --outputFile=.vitest/json/output.json
\`\`\`

\`coverageMap\` is large. A mid-sized project can turn a 200 KB report into several megabytes, which matters if you upload it on every push. When you only need pass and fail data, leave coverage off in that invocation and produce coverage as its own artifact.

\`\`\`ts
// Reading a single file's coverage without pulling the whole map into memory
// is not possible from JSON, so gate on size before parsing in a hot path.
import { statSync } from 'node:fs';

const MAX_BYTES = 25 * 1024 * 1024;
if (statSync(REPORT).size > MAX_BYTES) {
  throw new Error('Vitest report is unexpectedly large; is coverage enabled by accident?');
}
\`\`\`

## Turning the report into a PR comment

The JSON payload is well shaped for a summary comment, and the fields you need are stable across the Jest-compatible schema.

\`\`\`ts
// scripts/vitest-summary.ts
import { readFileSync } from 'node:fs';

const r = JSON.parse(readFileSync('.vitest/json/output.json', 'utf8'));

const slowest = r.testResults
  .flatMap((f) => f.assertionResults.map((a) => ({ name: a.fullName, ms: a.duration ?? 0 })))
  .sort((a, b) => b.ms - a.ms)
  .slice(0, 5);

const lines = [
  '### Vitest',
  '',
  '| Metric | Value |',
  '|---|---|',
  '| Total | ' + r.numTotalTests + ' |',
  '| Passed | ' + r.numPassedTests + ' |',
  '| Failed | ' + r.numFailedTests + ' |',
  '| Skipped | ' + (r.numPendingTests ?? 0) + ' |',
  '',
  '**Slowest tests**',
  '',
  ...slowest.map((t) => '- ' + t.ms + 'ms ' + t.name),
];

console.log(lines.join('\\n'));
\`\`\`

The \`?? 0\` on \`duration\` is not defensive padding. Skipped and todo tests have no duration, and sorting \`undefined\` values puts them at unpredictable positions in the list.

## Reporter comparison for CI

| Reporter | Machine readable | Good for | Default destination |
|---|---|---|---|
| \`default\` | No | Human logs | stdout |
| \`json\` | Yes | Custom tooling, PR comments | \`.vitest/json/output.json\` |
| \`junit\` | Yes | CI test tabs, flaky-test tracking | \`.vitest/junit/output.xml\` |
| \`blob\` | Yes | Merging sharded runs | \`.vitest/blob/blob-*.json\` |
| \`html\` | No | Local debugging | \`.vitest/\` via \`outputDir\` |

If your CI provider renders a native test tab, \`junit\` usually feeds it better than \`json\`, because the XML schema is what those integrations expect. Use \`json\` when you are writing your own logic against the results, and run both when you want each.

The \`blob\` reporter deserves a mention in sharded setups. Each shard writes a blob, and a follow-up invocation merges them into one report, which is how you get a single accurate total across shards rather than several partial ones:

\`\`\`bash
# In each shard
npx vitest run --reporter=blob --shard=1/4

# After all shards complete
npx vitest --merge-reports --reporter=json --outputFile=.vitest/json/output.json
\`\`\`

Merging matters for correctness, not just tidiness: summing \`numTotalTests\` across four separate JSON reports double-counts nothing, but it also loses any test that was retried in one shard and passed in another.

## A realistic failure: the green build that ran nothing

Symptom: CI turns green in eleven seconds. The JSON report says \`success: true\` and \`numTotalTests: 0\`.

Diagnosis: a stored filter in the CI command used \`-t "cart totals applies discounts"\`, written when \`fullName\` joined segments with a single space. After the upgrade the full name is \`cart > totals > applies discounts\`, the pattern matches no test, and a run with zero matching tests succeeds.

Nothing in the output looks like an error, which is what makes it dangerous. The guard is to assert on the count, not just the status:

\`\`\`ts
if (report.numTotalTests === 0) {
  console.error('Vitest ran zero tests. Check --testNamePattern and include globs.');
  process.exit(3);
}
\`\`\`

Add that check once and it protects against filter typos, broken glob patterns, and misconfigured workspaces forever. The same class of problem shows up in workspace setups, where a bad alias silently excludes a package; the [Vitest alias and workspace resolution guide](/blog/vitest-alias-monorepo-workspace-resolution) covers that side of it.

## Verifying the reporter before you rely on it

Run this once after any Vitest upgrade. It takes seconds and answers the only questions that matter.

\`\`\`bash
rm -rf .vitest
npx vitest run --reporter=json
echo "exit=$?"
find .vitest -type f
\`\`\`

If \`find\` prints \`.vitest/json/output.json\`, the file default is in effect and any piping in your scripts is dead. If nothing is printed and the JSON appeared in your terminal, you are on an older line or \`stdout: true\` is set somewhere. Either way you now know which behavior you have, rather than assuming.

## Why the default changed at all

Printing structured data to stdout is convenient until it is not. Three problems drove the move to a file, and understanding them makes the new default easier to live with.

**Interleaving.** Under parallel execution, worker output, console statements from tests, and the report itself all compete for the same stream. A single stray \`console.log\` in a test file can land in the middle of the JSON document and make it unparseable. Writing to a file removes that entire class of corruption.

**Truncation.** CI providers cap log length. A large report with a \`coverageMap\` can exceed that cap, and a truncated JSON document fails to parse with an error that points at the end of the file rather than at the real cause. Artifacts are not subject to log limits.

**Discoverability.** An artifact on disk can be uploaded, downloaded, diffed between runs, and attached to a PR. A stream can only be piped once, in the moment.

The tradeoff is exactly the migration cost you are paying: piping was a one-liner, and reading a file needs a path everyone agrees on. That is why pinning \`outputFile\` explicitly is worth doing even when it duplicates the default.

## What people get wrong

The first mistake is treating the reporter change as cosmetic. It is a silent behavioral break: piping still exits zero, still prints something, and still looks like it worked. Nothing fails loudly. The pipeline just stops seeing test data, and the dashboards it feeds go stale without an alert.

The second is parsing \`testResults\` as though each entry were a test. Each entry is a **file**; the tests are in \`assertionResults\` inside it. A parser that counts \`testResults.length\` and calls it a test count under-reports by an order of magnitude on any real suite, and because the number is plausible, nobody notices.

The broader upgrade picture, including the changes that are not reporter-related, is covered in the [Vitest 4 migration guide](/blog/vitest-4-migration-guide-breaking-changes).

For teams standardizing this across repositories, ready-made QA skills install from qaskills.sh with the qaskills CLI, including Vitest skills that scaffold reporter configuration with explicit output paths.

## Migrating an existing pipeline, step by step

The upgrade is mechanical once you know what to look for. Work through these in order.

1. **Find every consumer of reporter output.** Search the repository for the patterns that break:

\`\`\`bash
grep -rn -- "--reporter=json\|--reporter json\|reporter: *\['json'\]" \
  .github/ scripts/ package.json 2>/dev/null
\`\`\`

2. **Decide file or stdout, once, for the whole repo.** Mixing the two across scripts is how half a pipeline ends up silently broken. Reading a file is the better default: it survives log truncation, it can be uploaded as an artifact, and it does not interleave with other stdout writers under parallelism.

3. **Pin \`outputFile\` explicitly** even where it matches today's default, so the next default change is a no-op for you.

4. **Add \`.vitest/\` to \`.gitignore\`** and remove the now-stale \`.vitest-reports/\` and \`html/\` entries if nothing else writes there.

5. **Assert on \`numTotalTests\`** in whatever consumes the report, so a filter that matches nothing fails loudly.

6. **Run the verification block above** and confirm the artifact lands where you expect.

| Symptom after upgrade | Likely cause | Fix |
|---|---|---|
| Pipe produces empty output | File default in effect | Read the file, or set \`stdout: true\` |
| HTML report missing | \`outputFile\` passed to HTML reporter | Switch that reporter to \`outputDir\` |
| Untracked files appear in git | \`.vitest/\` not ignored | Add it to \`.gitignore\` |
| Build green in seconds, zero tests | Stored \`-t\` pattern no longer matches | Rewrite the pattern using \` > \` separators |
| Sharded totals look wrong | Reports summed instead of merged | Use \`blob\` plus \`--merge-reports\` |

## Keeping the schema stable for your consumers

If several teams read your report, the JSON is now an interface, and interfaces need a contract test. A small fixture check catches upstream shape changes on the upgrade PR rather than in production dashboards.

\`\`\`ts
// test/report-contract.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const REPORT = '.vitest/json/output.json';

describe.skipIf(!existsSync(REPORT))('vitest json report contract', () => {
  const r = JSON.parse(readFileSync(REPORT, 'utf8'));

  it('keeps the top-level fields our tooling depends on', () => {
    for (const key of ['success', 'startTime', 'numTotalTests', 'testResults']) {
      expect(r, 'missing ' + key).toHaveProperty(key);
    }
  });

  it('nests assertion results under each file entry', () => {
    expect(Array.isArray(r.testResults)).toBe(true);
    if (r.testResults.length > 0) {
      expect(Array.isArray(r.testResults[0].assertionResults)).toBe(true);
    }
  });
});
\`\`\`

\`describe.skipIf\` keeps this from failing on a fresh checkout where no report has been generated yet, while still running in the CI job that produces one. Note that this test reads the report from a previous run, so it belongs in a follow-up step rather than the same invocation that writes the file.

## Frequently Asked Questions

### Why did my vitest --reporter=json pipe stop working?

Because the JSON reporter now writes to a file by default rather than stdout, so the pipe receives no report. The run itself is fine; only the destination changed. Fix it by reading the artifact at \`.vitest/json/output.json\`, which is the more robust pattern anyway, or restore the old behavior with \`reporters: [['json', { stdout: true }]]\` in your config. If you had already set an explicit \`outputFile\`, nothing changed for you: that option is still honored exactly as before.

### What is the difference between outputFile and outputDir?

\`outputFile\` names a single destination file and is used by the \`json\` and \`junit\` reporters; it also accepts an object keyed by reporter name when you run several at once. \`outputDir\` names a directory and is what the HTML reporter now takes, because it emits multiple assets rather than one document. The rename is easy to miss: passing \`outputFile\` to the HTML reporter does not read as a mistake, but it will not place the output where you expect.

### Does numTotalTestSuites count describe blocks?

No, it counts test files. A single file containing five \`describe\` blocks contributes one to \`numTotalTestSuites\`. If you want a count of individual test cases, use \`numTotalTests\`, and if you want per-file detail, iterate \`testResults\` and read the \`assertionResults\` array inside each entry. Mislabeling this field as "suites" in a dashboard is common and produces a number that looks reasonable but tracks nothing anyone cares about.

### How do I stop a filter typo from producing a green build?

Assert on \`numTotalTests\` in whatever script consumes the report, and fail when it is zero. A \`--testNamePattern\` that matches nothing is not an error condition in Vitest: the run completes, no tests fail, and \`success\` is true. This bites hardest after upgrades that change how \`fullName\` is constructed, since stored patterns written against the old format quietly stop matching. One explicit zero-test check catches that, along with broken include globs and misconfigured workspaces.
`,
};
