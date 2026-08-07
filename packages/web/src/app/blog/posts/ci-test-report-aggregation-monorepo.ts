import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Test Report Aggregation in a Monorepo: One Failure Story Across Many Packages',
  description: 'Build ci test report aggregation monorepo workflows that merge JUnit, HTML, traces, and flaky-test signals into one debuggable CI view.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# CI Test Report Aggregation in a Monorepo: One Failure Story Across Many Packages

CI test report aggregation in a monorepo means every package, shard, browser project, and service-level test job publishes evidence in a format that can be collected into one readable failure story. The goal is not only "one report artifact." The real payoff is faster triage: a QA engineer should be able to answer which package failed, which test failed, what commit introduced it, whether it is flaky, and which screenshot, trace, log, or request payload explains the failure.

In a small repository, a single test command can print enough detail. In a monorepo, that stops working quickly. Frontend packages emit Playwright HTML reports, API packages emit JUnit XML, library packages emit Vitest JSON or JUnit, mobile-web smoke tests attach videos, and performance checks publish threshold summaries. If CI leaves those outputs scattered across thirty jobs, the team pays the coordination tax after every red build.

This guide gives QA and test-automation engineers a concrete aggregation workflow for GitHub Actions, GitLab CI, Playwright, Jest, Vitest, and mixed test runners. It covers report contracts, artifact naming, JUnit normalization, flaky-test detection, summary generation, and failure diagnosis. Pair it with [Cancel Stale E2E Runs on New Commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit) when old monorepo pipelines waste runners, and use [GitLab CI JUnit Report Flaky Tests](/blog/gitlab-ci-junit-report-flaky-tests) when GitLab is the system of record for test trends.

## Define the report contract before touching CI YAML

Aggregation fails when every package invents its own output shape. Before changing CI, define a report contract that every job can satisfy. The contract should answer five questions: where the machine-readable report is written, where human evidence is written, how package identity is encoded, how shard identity is encoded, and which fields are required for trend analysis.

JUnit XML remains the most portable machine-readable format. GitHub Actions, GitLab CI, Jenkins, CircleCI, Buildkite, and many dashboard tools understand it. It is not perfect. Different reporters disagree about the meaning of \`classname\`, \`file\`, \`name\`, and \`time\`. Still, it is the most practical common denominator for monorepo aggregation because every major JavaScript test runner can produce it through a built-in reporter or a maintained reporter package.

Use richer artifacts beside JUnit instead of trying to cram everything into XML. Playwright traces, screenshots, videos, HTML reports, coverage, browser console logs, API payload captures, and service logs are evidence artifacts. JUnit should point to the failure and carry enough metadata to find the evidence.

| Output | Role in aggregation | Required naming data | Typical producer |
|---|---|---|---|
| JUnit XML | Machine-readable pass, fail, skip, duration, failure text | package, runner, shard, attempt | Jest, Vitest, Playwright, Cypress |
| HTML report | Human navigation and screenshots | package, runner, attempt | Playwright, Cypress, custom dashboards |
| Trace or video | Reproduce browser failure | test id, project, shard | Playwright, Cypress |
| Coverage file | Package quality signal | package, language, job | Istanbul, V8 coverage, nyc |
| Raw logs | Debug setup, teardown, service state | job id, service, shard | CI shell, app services |
| Manifest JSON | Describes artifact bundle | package, command, commit, job URL | Custom script |

The manifest is the piece many teams skip. A simple JSON file beside every JUnit output lets the aggregator avoid guessing. It can map a package path to a product area, link a shard to the CI job URL, record the command that produced the report, and mark whether retry attempts were enabled.

\`\`\`json
{
  "package": "apps/checkout-web",
  "runner": "playwright",
  "command": "pnpm --filter checkout-web test:e2e",
  "report": "reports/junit.xml",
  "evidenceDir": "test-results",
  "shard": "2/6",
  "attempt": 1,
  "commit": "CI_COMMIT_SHA",
  "jobUrl": "CI_JOB_URL"
}
\`\`\`

That manifest is deliberately boring. It does not need to mirror the whole CI provider schema. It needs enough stable fields for a post-processing script, a dashboard, or an AI coding agent to locate the right package and failure context without scraping terminal output.

## Standardize package scripts without forcing one test runner

Monorepos usually contain mixed test technology. A React package may use Vitest, a Node API may use Jest, an end-to-end suite may use Playwright, and a legacy app may still use Cypress. Aggregation works best when you standardize script names and output locations, not when you force every package onto one runner at once.

A practical convention is to make each package write into \`reports/<runner>/\` and \`test-results/<runner>/\`. The top-level CI job can then collect predictable directories regardless of runner.

\`\`\`json
{
  "scripts": {
    "test:unit": "vitest run --reporter=default --reporter=junit --outputFile=reports/vitest/junit.xml",
    "test:e2e": "playwright test",
    "test:ci": "pnpm run test:unit"
  }
}
\`\`\`

For Playwright, keep the JUnit and blob or HTML reporters in configuration so local and CI behavior do not diverge too much. The blob reporter is useful for merging Playwright shard reports with \`npx playwright merge-reports\`. JUnit is useful for provider-native test tabs and cross-runner aggregation.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: process.env.CI
    ? [
        ['list'],
        ['junit', { outputFile: 'reports/playwright/junit.xml' }],
        ['blob', { outputDir: 'reports/playwright/blob' }]
      ]
    : 'html',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
\`\`\`

For Jest, do not rely on terminal output alone. Use a JUnit reporter package that your project already accepts, or configure the reporter through the documented package you install. Avoid copying configuration keys from blog posts without checking the reporter documentation, because Jest itself and third-party JUnit reporters do not share one universal option schema.

\`\`\`js
module.exports = {
  testEnvironment: 'node',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports/jest',
        outputName: 'junit.xml'
      }
    ]
  ]
};
\`\`\`

What people get wrong: they standardize the CI command but not the report path. A root command like \`pnpm -r test\` is useful, but if each package writes JUnit to a different place, aggregation still becomes a scavenger hunt. The contract is the report path and metadata, not only the command name.

## Give every artifact a collision-proof name

Artifact names must survive concurrent branches, matrix jobs, retries, and reruns. In a monorepo, two packages can both have a shard named \`1/4\`, and two pipelines can run for the same branch at the same time. If artifact names only include \`junit\` or \`playwright-report\`, later uploads can overwrite earlier evidence or make downloads ambiguous.

Use a name that includes package identity, runner, shard, and attempt. Keep the package path readable by replacing slashes with a safe separator in the shell or in a small Node helper.

| Field | Why it matters | Example |
|---|---|---|
| Package path | Routes ownership and triage | \`apps-checkout-web\` |
| Runner | Explains report format and evidence type | \`playwright\` |
| Shard | Prevents parallel job collisions | \`shard-2-of-6\` |
| Attempt | Separates reruns from first failures | \`attempt-1\` |
| Commit or pipeline id | Prevents cross-pipeline confusion | \`run-123456\` |

A GitHub Actions shard job can upload a bundle per package or per matrix cell. The important detail is that the aggregation job downloads all bundles into a single directory and then parses manifests rather than relying on file names alone.

\`\`\`yaml
name: monorepo-tests

on:
  pull_request:

jobs:
  package-tests:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        package: [apps/checkout-web, apps/admin-web, packages/api-client]
        shard_index: [1, 2]
        shard_total: [2]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Run package tests
        run: npm run test:ci --workspace \${{ matrix.package }}
        env:
          TEST_SHARD: \${{ matrix.shard_index }}/\${{ matrix.shard_total }}
      - name: Upload test evidence
        if: \${{ always() }}
        uses: actions/upload-artifact@v4
        with:
          name: test-\${{ matrix.package }}-\${{ matrix.shard_index }}-of-\${{ matrix.shard_total }}-attempt-\${{ github.run_attempt }}
          path: |
            \${{ matrix.package }}/reports
            \${{ matrix.package }}/test-results
          if-no-files-found: ignore
\`\`\`

GitHub artifact names can contain slashes in some contexts but they are awkward to read and automate. A tiny package-name normalizer in your workflow or manifest script avoids that mess. The exact implementation can be as simple as replacing non-alphanumeric separators with hyphens. Do that in the artifact name and keep the original package path inside the manifest.

## Merge JUnit without losing package identity

Naively concatenating XML files produces invalid XML. Even when an XML builder creates a valid document, it can accidentally erase the context a triager needs. A good merger preserves each \`testsuite\`, prefixes or annotates ambiguous names, sums counts, and carries failure text as-is.

Use a real XML parser. String replacement is fragile because JUnit XML may contain escaped characters, CDATA, nested properties, and reporter-specific elements. The following TypeScript script reads all JUnit files under an input directory, normalizes arrays, injects a package property, and writes a merged \`testsuites\` document. It is intentionally conservative: it does not try to rewrite every testcase name.

\`\`\`ts
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { globSync } from 'glob';

type AnyRecord = Record<string, unknown>;

const inputDir = process.argv[2] || 'downloaded-artifacts';
const outputFile = process.argv[3] || 'reports/merged-junit.xml';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '' });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function numberAttr(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

const suites: AnyRecord[] = [];

for (const file of globSync(inputDir + '/**/junit.xml')) {
  const xml = readFileSync(file, 'utf8');
  const parsed = parser.parse(xml) as AnyRecord;
  const root = parsed.testsuites || parsed.testsuite;
  const sourceSuites = parsed.testsuites
    ? asArray((root as AnyRecord).testsuite as AnyRecord | AnyRecord[])
    : asArray(root as AnyRecord);

  for (const suite of sourceSuites) {
    const packagePath = file.split('/reports/')[0].replace(inputDir + '/', '');
    suite.properties = suite.properties || {};
    const existing = asArray((suite.properties as AnyRecord).property as AnyRecord | AnyRecord[]);
    (suite.properties as AnyRecord).property = [
      ...existing,
      { name: 'monorepo.package', value: packagePath }
    ];
    suites.push(suite);
  }
}

const totals = suites.reduce(
  (acc, suite) => {
    acc.tests += numberAttr(suite.tests);
    acc.failures += numberAttr(suite.failures);
    acc.errors += numberAttr(suite.errors);
    acc.skipped += numberAttr(suite.skipped);
    acc.time += numberAttr(suite.time);
    return acc;
  },
  { tests: 0, failures: 0, errors: 0, skipped: 0, time: 0 }
);

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(
  outputFile,
  builder.build({
    testsuites: {
      ...totals,
      testsuite: suites
    }
  })
);

console.log('Merged ' + suites.length + ' JUnit suites into ' + join(process.cwd(), outputFile));
\`\`\`

This merger is a starting point, not a universal JUnit validator. If your organization relies on a specific dashboard, run the merged XML through that dashboard in a test branch. Some consumers expect attributes to stay as strings. Some expect \`testsuite\` children under \`testsuites\`. Some ignore \`properties\`. Validate against the consumer you actually use.

## Keep Playwright report merging separate from JUnit merging

Playwright blob reports should be merged with Playwright's own merge command, because the blob format includes attachments and metadata that a generic XML script cannot understand. The usual pattern is simple: every shard writes a blob report, CI uploads those blob files, a merge job downloads them into one directory, and \`npx playwright merge-reports\` generates the combined HTML report.

\`\`\`yaml
jobs:
  merge-playwright:
    if: \${{ always() }}
    needs: [package-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          path: all-test-artifacts
          pattern: test-*
          merge-multiple: true
      - name: Merge Playwright blob reports
        run: npx playwright merge-reports --reporter html ./all-test-artifacts
      - uses: actions/upload-artifact@v4
        if: \${{ always() }}
        with:
          name: playwright-html-report
          path: playwright-report
\`\`\`

Do not make the Playwright HTML report your only aggregation result. It is excellent for browser tests, but it does not know about API unit tests, contract tests, migration tests, or package-level ownership. Use it as one evidence bundle inside the larger monorepo report.

## Publish one CI summary that points to everything else

The aggregation job should write a concise markdown summary. In GitHub Actions, appending to \`GITHUB_STEP_SUMMARY\` gives reviewers a visible panel on the run page. In GitLab, a generated markdown artifact or job log section can serve the same purpose. The summary should not duplicate every failure stack trace. It should list failing packages, test counts, slowest suites, links to artifacts, and the recommended owner path.

\`\`\`ts
import { readFileSync, writeFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { globSync } from 'glob';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const files = globSync('all-test-artifacts/**/junit.xml');
const rows: string[] = [];

for (const file of files) {
  const xml = readFileSync(file, 'utf8');
  const parsed = parser.parse(xml);
  const suites = parsed.testsuites?.testsuite || parsed.testsuite || [];
  const list = Array.isArray(suites) ? suites : [suites];

  for (const suite of list) {
    const failures = Number(suite.failures || 0) + Number(suite.errors || 0);
    if (failures > 0) {
      rows.push('| ' + file + ' | ' + suite.name + ' | ' + failures + ' |');
    }
  }
}

const body = [
  '## Monorepo test summary',
  '',
  '| Report | Suite | Failures |',
  '|---|---|---:|',
  rows.length ? rows.join('\\n') : '| all | all suites | 0 |',
  ''
].join('\\n');

writeFileSync('reports/test-summary.md', body);
\`\`\`

This is also where AI coding agents become useful. A summary that names package paths, commands, and evidence files lets an agent open the correct failing area without scanning the whole repository. If your team uses ready-made QA skills, they install from qaskills.sh with the qaskills CLI, but the same principle applies to any agent workflow: structured evidence beats a long console transcript.

## GitLab CI aggregation with native JUnit reports

GitLab CI has strong native support for JUnit report artifacts. A job can publish XML under \`artifacts:reports:junit\`, and GitLab can show test results in merge request and pipeline views. For monorepos, still upload the full evidence directory as normal artifacts, because JUnit alone will not carry traces or screenshots.

\`\`\`yaml
stages:
  - test
  - aggregate

unit_tests:
  stage: test
  parallel:
    matrix:
      - PACKAGE: ['apps/checkout-web', 'packages/api-client']
  script:
    - npm ci
    - npm run test:ci --workspace $PACKAGE
  artifacts:
    when: always
    paths:
      - $PACKAGE/reports
      - $PACKAGE/test-results
    reports:
      junit:
        - $PACKAGE/reports/**/junit.xml

aggregate_reports:
  stage: aggregate
  needs:
    - job: unit_tests
      artifacts: true
  script:
    - npm ci
    - node tools/merge-junit.js .
    - node tools/write-test-summary.js
  artifacts:
    when: always
    paths:
      - reports/merged-junit.xml
      - reports/test-summary.md
\`\`\`

GitLab variable expansion in artifact paths is useful, but do not let it hide a missing report. Add a post-test check that fails only after artifacts are saved, or make the aggregation job flag missing manifests. Missing reports should be visible as infrastructure failures, not silently treated as zero tests.

## Detect flaky tests from report history, not one rerun

Retries can hide flakes from developers while still preserving productivity. Aggregation should surface the pattern: passed after retry, failed on shard 4 twice this week, or failed only in WebKit on the payment package. That requires storing enough history to compare current failures with previous runs.

Start with a small JSON summary per pipeline. Keep it in durable storage if you have one, or publish it as an artifact consumed by a scheduled trend job. The summary should include a stable test id. For Playwright, a practical id is project name plus file plus title path. For Jest and Vitest, use classname plus test name plus package. Avoid relying only on the human title because duplicated titles are common.

| Signal | Meaning | Triage action |
|---|---|---|
| Failed first attempt, passed retry | Probable flake or environment issue | Inspect trace, mark quarantine only with owner approval |
| Failed same test across packages | Shared fixture, service, or dependency | Check recent common package changes |
| Failed only one shard repeatedly | Data collision, shard-specific setup, or runner capacity | Compare env vars and seed data |
| Missing XML from one package | Setup crash before reporter wrote output | Check install, build, and test discovery logs |
| Duration doubled without failures | Performance regression or CI contention | Compare slowest test list and runner load |

\`\`\`ts
type TestResult = {
  id: string;
  packageName: string;
  runner: string;
  status: 'passed' | 'failed' | 'skipped';
  attempt: number;
  durationMs: number;
};

export function classifyFlake(results: TestResult[]): Map<string, string> {
  const byId = new Map<string, TestResult[]>();
  for (const result of results) {
    const group = byId.get(result.id) || [];
    group.push(result);
    byId.set(result.id, group);
  }

  const labels = new Map<string, string>();
  for (const [id, group] of byId) {
    const failed = group.some(result => result.status === 'failed');
    const passed = group.some(result => result.status === 'passed');
    const attempts = new Set(group.map(result => result.attempt));
    if (failed && passed && attempts.size > 1) {
      labels.set(id, 'passed-after-retry');
    } else if (failed) {
      labels.set(id, 'consistent-failure');
    }
  }
  return labels;
}
\`\`\`

The dangerous mistake is treating "passed on rerun" as "not a problem." In a monorepo, one flaky test can burn minutes across every package pipeline and block unrelated teams. Aggregation should make flakes visible without forcing every developer to read every retry log.

## Diagnose the common empty aggregate failure

A realistic failure mode looks like this: the merge job runs, uploads \`merged-junit.xml\`, and the summary says zero failures. But a package job clearly failed. The root cause is often that the failing job exited before writing JUnit, uploaded artifacts only on success, or wrote reports outside the collected path.

Diagnose it in this order:

1. Check whether the package job has an artifact bundle at all.
2. Check whether the bundle includes the manifest JSON.
3. Check whether the manifest points to an XML file that exists.
4. Check whether the XML parses and contains at least one testcase.
5. Check whether the aggregator logs report a skipped or malformed file.

\`\`\`bash
find all-test-artifacts -name manifest.json -print
find all-test-artifacts -name junit.xml -print
node tools/merge-junit.js all-test-artifacts reports/merged-junit.xml
node tools/write-test-summary.js
\`\`\`

If the first command is empty, the CI upload step is wrong. If manifests exist but XML files do not, the package reporter configuration is wrong. If XML exists but has zero tests, test discovery or filtering is wrong. If only the merge job is wrong, inspect parser assumptions before blaming the test runner.

## Make the report useful to package owners

Aggregation is not finished until ownership is visible. A monorepo failure summary that lists \`tests/login.spec.ts\` without package ownership still forces a reviewer to search. Add a simple owner mapping file that resolves package paths to teams, Slack channels, or code owners. Keep it separate from the CI script so ownership can change without editing parser code.

\`\`\`yaml
owners:
  apps/checkout-web:
    team: payments-frontend
    slack: '#qa-payments'
  apps/admin-web:
    team: internal-tools
    slack: '#qa-internal'
  packages/api-client:
    team: platform-api
    slack: '#qa-platform'
\`\`\`

Use the mapping to sort failures by owner and package. This makes the report align with how work is assigned. It also prevents the aggregation page from becoming a chronological dump of whatever shard finished first.

## Keep artifact retention intentional

Large monorepos can generate massive evidence folders. Retaining every trace, video, coverage file, and HTML report for months is expensive and noisy. Retaining too little makes intermittent failures impossible to investigate. Separate short-lived bulky artifacts from longer-lived summaries.

| Artifact class | Suggested retention logic | Reason |
|---|---|---|
| HTML reports and traces from pull requests | Short, enough for active review | Useful during review, expensive later |
| Merged JUnit and JSON summaries | Longer | Needed for trend analysis |
| Main-branch failure evidence | Longer than pull request evidence | Supports release and regression audits |
| Passing-run videos | Usually disabled | High cost, low diagnostic value |
| Coverage summaries | Medium | Useful for quality trend reports |

Provider defaults change, so declare retention deliberately where the CI system supports it. Also remember that privacy rules may apply. Browser traces can contain customer-like data, tokens from test fixtures, or internal URLs. Treat test artifacts as production-adjacent evidence, not harmless logs.

## A reference workflow for the whole loop

The stable version of monorepo aggregation has four stages. First, each package runs its own tests and writes contract-compliant reports. Second, every job uploads artifacts even when tests fail. Third, an aggregate job downloads all artifacts, validates manifests, merges JUnit, merges runner-specific rich reports, and writes a concise summary. Fourth, a trend job or dashboard consumes the normalized output over time.

| Stage | Owner | Output | Failure should mean |
|---|---|---|---|
| Package test | Package team | JUnit, evidence, manifest | Product or package-level test issue |
| Artifact upload | CI platform owner | Downloadable bundle | Evidence preservation issue |
| Aggregation | QA platform team | Merged XML and summary | Report contract issue |
| Trend analysis | QA leadership or quality platform | Flake and duration history | Regression in reliability or runtime |

This separation matters because it keeps ownership clear. A broken test should not be hidden as an aggregation failure. A broken aggregation script should not be counted as a product regression. A missing artifact should not quietly disappear from the summary.

When the workflow is working well, the red build page tells a coherent story: package, runner, shard, test id, failure message, evidence link, owner, and whether the same test has been unstable before. That is the standard worth aiming for.

## Frequently Asked Questions

### Should a monorepo have one global test report or one report per package?

Use both. Keep one report per package because package owners need focused evidence and runner-native details. Also produce one global summary because reviewers and release managers need to understand the whole pipeline quickly. The global report should link to package-level artifacts rather than flattening every log into one enormous page. JUnit aggregation gives machines a common view, while package artifacts preserve the context needed to debug.

### Is JUnit XML enough for CI test report aggregation monorepo workflows?

JUnit XML is enough for pass, fail, skip, duration, and basic failure text across many tools. It is not enough for rich debugging. Browser traces, screenshots, videos, API payload logs, coverage summaries, and package manifests should travel beside JUnit as normal artifacts. Treat JUnit as the index, not the full case file. The index tells you where to look, and the evidence artifacts explain what happened.

### How do I prevent missing reports from looking like passing tests?

Require every package job to upload a manifest and make the aggregation job validate it. A missing manifest should be reported as an infrastructure failure. A manifest that points to a missing XML file should be reported separately from test failures. Do not silently ignore absent report paths unless the package explicitly declares that a test type is not applicable. Zero tests and missing reports are different conditions.

### Where should flaky-test data live?

Keep flaky-test data outside a single CI job's temporary filesystem. A JSON summary artifact is a good start, but durable trend analysis needs a database, object storage, or a test analytics system that survives pipeline cleanup. Store stable test ids, package names, attempts, statuses, durations, branch type, and commit metadata. Avoid storing full traces forever unless policy and storage budget allow it.
`,
};
