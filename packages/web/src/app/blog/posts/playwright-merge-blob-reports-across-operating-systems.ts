import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Merge Playwright Blob Reports Across Operating Systems',
  description:
    'Merge Playwright blob reports from Windows, Linux, and macOS into one reliable HTML report with stable paths, tags, artifacts, and diagnostics.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Merge Playwright Blob Reports Across Operating Systems

A Windows runner records a test path with backslashes, the Linux shard uploads a ZIP from a different checkout root, and the macOS job contributes WebKit traces. Dropping those files into one directory is necessary, but it is not the whole merge. A useful combined report also needs a common test root, distinguishable environments, intact attachments, and a merge job that runs even when a shard fails.

Playwright's blob reporter is designed for this handoff. It serializes test results and attachments into ZIP files which \`playwright merge-reports\` can later read and convert to HTML, JUnit, JSON, GitHub annotations, or multiple reporters. Cross-operating-system execution adds path and identity questions that same-image sharding can often ignore. This guide builds a three-OS GitHub Actions pipeline and explains the failure modes hidden behind a superficially successful merge.

## What crosses the runner boundary

A blob is not an HTML report bundled for transport. It is an intermediate representation of a Playwright run. The merge command reconstructs a unified suite and sends that suite through the output reporter selected at merge time. That distinction lets execution jobs stay small and lets one downstream job decide which human-readable and machine-readable artifacts to publish.

The following items affect whether records from separate hosts line up coherently:

| Input property | Windows example | Linux or macOS example | Merge consequence |
|---|---|---|---|
| Checkout location | \`D:\\a\\shop\\shop\` | \`/home/runner/work/shop/shop\` | Absolute roots cannot be treated as test identity |
| Separator | \`tests\\cart.spec.ts\` | \`tests/cart.spec.ts\` | A shared configured \`testDir\` disambiguates the suite root |
| Browser availability | Chromium, Firefox | Chromium, Firefox, WebKit | Project names should show what actually ran |
| Blob filename | Hash plus shard suffix | Hash plus shard suffix | Artifact extraction must not overwrite files |
| Attachments | Trace, screenshot, video | Trace, screenshot, video | The ZIP must remain intact until merge |

Do not unzip a blob report itself. CI artifact systems may wrap or unwrap directories, but the \`report-*.zip\` files produced by Playwright are the merge inputs. Also avoid merging HTML directories. HTML is a terminal presentation format, whereas blob is the supported merge format.

## Give each operating system an identity

If the same test runs on all three operating systems, a merged report can otherwise show three results whose titles look identical. A global tag makes the environment visible in the reconstructed suite and contributes to unique blob names. Set it from a CI variable instead of maintaining three nearly identical configuration files.

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: process.env.CI
    ? [['blob', { outputDir: 'blob-report' }]]
    : [['html', { open: 'never' }]],
  tag: process.env.PW_OS ? \`@os:\${process.env.PW_OS}\` : undefined,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

The tag describes the execution environment, not the browser project. Keep project names such as \`chromium\` and \`webkit\` intact because they answer a different diagnostic question. If Windows only runs Chromium while macOS runs WebKit, the report should expose both dimensions rather than collapsing them into a label such as \`desktop\`.

Playwright calculates a stable hash from filters, projects, tags, and related selection inputs. That helps avoid filename collisions when environment runs differ. Treat unique artifact names as a second line of defense, particularly when an artifact downloader flattens several directories.

## A three-OS GitHub Actions workflow

The execution matrix below runs the suite once per operating system. It uploads each blob directory even after test failure, unless the workflow has been cancelled. The merge job waits for all matrix children and also runs after ordinary failures.

\`\`\`yaml
name: cross-os-playwright

on:
  pull_request:
  workflow_dispatch:

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: ubuntu-latest
            label: linux
          - os: windows-latest
            label: windows
          - os: macos-latest
            label: macos
    runs-on: \${{ matrix.os }}
    env:
      CI: 'true'
      PW_OS: \${{ matrix.label }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Playwright
        run: npx playwright test
      - name: Upload blob
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-\${{ matrix.label }}
          path: blob-report
          if-no-files-found: error
          retention-days: 2

  merge:
    if: \${{ !cancelled() }}
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v5
        with:
          path: all-blob-reports
          pattern: blob-*
          merge-multiple: true
      - name: Merge reports
        run: npx playwright merge-reports --config=merge.config.ts all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: cross-os-html-report
          path: playwright-report
          if-no-files-found: error
          retention-days: 14
\`\`\`

The \`fail-fast: false\` setting matters. Without it, one early Windows failure may cancel Linux and macOS, leaving the final report incomplete. The \`if: \${{ !cancelled() }}\` condition preserves evidence for failed tests while respecting a deliberate workflow cancellation. GitHub expression syntax is escaped in this TypeScript article because the markdown lives inside a template literal; in the rendered article readers see the normal workflow syntax.

Installing \`--with-deps\` on every OS is simple but can be slower than necessary. A mature pipeline can select projects per OS or use prebuilt images on Linux. Whatever optimization is chosen, report metadata must reflect the actual project selection.

For a broader treatment of distributing suites rather than environments, see the [Playwright sharding and merge guide](/blog/playwright-sharding-merge-reports-guide-2026).

## The merge config is the path anchor

Playwright specifically requires an explicit merge configuration when reports come from different operating systems. The important value is \`testDir\`. It gives the merge process a repository-relative root from which suite paths can be reconciled, independent of drive letters and runner workspace prefixes.

\`\`\`ts
// merge.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/cross-os.xml' }],
  ],
});
\`\`\`

Keep this file in the checked-out repository and run the merge from the same package context used to resolve \`@playwright/test\`. A merge job needs project dependencies even though it launches no browser. Pinning the same lockfile and Playwright version across producers and consumer removes a class of serialization compatibility surprises.

The merge configuration can differ from the execution configuration. It should contain output-reporter choices, their output paths, and the canonical test directory. It does not need retries, workers, web servers, devices, or credentials because no tests execute in the merge phase.

## Shards and environments are different axes

A matrix may contain both an operating system and a shard index. That creates, for example, twelve producers for three OS values times four shards. Every producer should receive a stable OS tag, and every producer should execute a valid \`--shard=i/n\` pair.

| Matrix dimension | Example values | Encoded by | Why retain it |
|---|---|---|---|
| Environment | Windows, Linux, macOS | \`tag\` or project metadata | Reveals platform-specific failures |
| Shard position | 1/4 through 4/4 | \`--shard\` and blob filename | Proves suite partition completeness |
| Browser project | chromium, firefox, webkit | Playwright project name | Separates engine behavior |
| Retry attempt | first run, retry | Result metadata | Distinguishes flaky recovery from a clean pass |

Do not use a different total on one matrix row. A \`1/4\` Linux report cannot be interpreted as equivalent coverage to a Windows set accidentally launched as \`1/3\` through \`3/3\`. The merge tool combines supplied facts; it is not a coverage oracle for an incorrectly generated matrix.

When \`fullyParallel\` is enabled, sharding can balance at individual-test granularity. Without it, Playwright assigns whole files, which can produce uneven durations. This changes scheduling efficiency, not the cross-OS merge mechanics.

## Preventing artifact loss and collisions

Most failed merges are artifact plumbing failures. First inspect the downloaded directory. It should contain multiple \`report-*.zip\` files, not nested CI archives, empty platform directories, or three files overwritten to one common name. A shell-neutral validation script avoids relying on \`find\` on Windows because the merge job itself is Linux:

\`\`\`js
// scripts/check-blobs.mjs
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve(process.argv[2] ?? 'all-blob-reports');
const entries = await readdir(directory, { withFileTypes: true });
const blobs = entries
  .filter((entry) => entry.isFile() && /^report-.*\\.zip$/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

if (blobs.length !== 3) {
  throw new Error(\`Expected 3 Playwright blobs, found \${blobs.length}: \${blobs.join(', ')}\`);
}

console.log(blobs.join('\\n'));
\`\`\`

Run \`node scripts/check-blobs.mjs all-blob-reports\` immediately before merging. If there are shards as well as OS jobs, calculate the expected count from both dimensions. This check cannot prove that each expected platform is present unless filenames or a separately uploaded manifest expose that information. A small manifest per producer, containing OS, shard, commit SHA, and Playwright package version, makes provenance auditable without modifying the blob.

Avoid reusing artifacts from earlier workflow attempts. A run-attempt suffix in the final report name is useful, while producer downloads should remain scoped to the current workflow run by the artifact action. Never merge blobs from different commits simply because their filenames fit the glob.

## Reading the combined report without hiding platform defects

A merged pass count can mislead when the suite intentionally differs by environment. Filter by tag and project before concluding that a feature passed everywhere. A test skipped on Windows and passed on Linux is not cross-platform proof. Review expected skips as policy, preferably with annotations explaining the unsupported condition.

Trace and screenshot links deserve a smoke check after publishing. Open one failure from each operating system and confirm that the attachment loads. A report with correct counters but broken trace references has lost much of its debugging value. Because blob ZIPs carry attachments, failures usually indicate damaged upload/download handling, premature cleanup, or output publication that omitted generated assets.

JUnit consumers add another concern: test-case names may collide if the external dashboard ignores tags and project fields. Inspect the resulting XML in the target system. The HTML reporter is Playwright-aware, but a generic XML importer may group records differently.

## Merge strategies and their tradeoffs

| Strategy | Strength | Limitation | Suitable use |
|---|---|---|---|
| Playwright blob plus \`merge-reports\` | Preserves Playwright results and attachments | Producers and merger should use compatible Playwright versions | Canonical multi-run Playwright report |
| Separate HTML report per OS | Platform boundaries are obvious | No unified search, totals, or consolidated artifact | Teams triaging platforms independently |
| JUnit from every producer | Works with many CI dashboards | Usually loses rich trace and screenshot navigation | Organization-wide test analytics |
| Custom reporter to a database | Can model environment and history exactly | Requires ownership, schema evolution, and retry semantics | Large internal quality platforms |

Generating HTML on every producer and trying to concatenate it later is not an alternative. There is no supported HTML merge contract. If local triage demands per-OS HTML, configure both blob and HTML reporters during execution, then upload both, but use only blobs for the combined artifact.

## Diagnostics for the failures that matter

If merge reports zero tests, verify that the input argument points to the directory containing blob ZIPs. If it reports path ambiguity, pass the explicit merge config and confirm \`testDir\` matches the repository layout. If only one platform appears, inspect downloaded file count and artifact names before investigating Playwright.

When the command fails after a dependency upgrade, compare \`npm ls @playwright/test\` output from every producer manifest with the merger. Lockfile drift or jobs built from different commits is more plausible than random ZIP corruption. When tests appear duplicated, determine whether they genuinely ran on each OS. Duplication is expected for an environment matrix; missing platform tags are what make it confusing.

For workflow permissions, browser caching, service containers, and pull-request security boundaries around this setup, the [Playwright GitHub Actions guide](/blog/playwright-github-actions-guide-2026) covers the surrounding CI concerns.

## A production readiness checklist

Before making the combined report required evidence, exercise the unhappy paths deliberately:

1. Fail one assertion on each operating system and verify all three jobs upload blobs.
2. Cancel a workflow and confirm the chosen cancellation policy does not publish a misleading partial report.
3. Break the expected blob count so the validation script stops the merge.
4. Open a trace and screenshot from each platform in the published HTML artifact.
5. Run two attempts of the same commit and ensure their final artifacts remain distinguishable.
6. Change a test file path and confirm the next report shows the new identity rather than unexplained duplicates.
7. Verify JUnit naming in the actual CI dashboard if XML is a required output.

The central design is simple: execution jobs produce immutable blob evidence, artifact transport preserves every ZIP, and one version-aligned consumer applies a repository-relative test root. Cross-OS paths then become metadata to normalize, not reasons to maintain isolated reporting pipelines.

## Prove which platforms contributed

File count cannot prove platform provenance. Write a small JSON manifest beside each blob containing OS label, commit SHA, workflow attempt, Node version, and installed Playwright version. After download, require exactly Windows, Linux, and macOS, one commit, and one attempt. Keep this record independent from Playwright's internal ZIP format.

\`\`\`js
import { writeFile } from 'node:fs/promises';

const record = {
  os: process.env.PW_OS,
  commit: process.env.GITHUB_SHA,
  attempt: process.env.GITHUB_RUN_ATTEMPT,
  node: process.version,
};
if (!record.os || !record.commit) throw new Error('Missing blob provenance');
await writeFile(
  \`blob-report/provenance-\${record.os}.json\`,
  JSON.stringify(record, null, 2),
);
\`\`\`

Unique manifest names survive artifact flattening and explain a row omitted by workflow conditions. A timed-out producer may leave a directory but no valid final blob. Preserve corrupt input for diagnosis, fail completeness validation, and never publish an incomplete report under the normal artifact name.

Blob retention also needs security review. Traces can include page content, network metadata, console output, and screenshots. Apply access controls and short retention appropriate to that evidence. A sanitized JUnit summary can be retained longer than raw debugging artifacts when trend reporting requires it.

## Rehearse the merger outside pull requests

Run the collector and merge command against saved blobs in a maintenance pipeline before changing reporter configuration or Playwright versions. This validates report generation without consuming browser minutes. Never use those historical results as a current quality signal; label the exercise as format compatibility. When upgrading, produce all blobs and merge them with the same candidate version in one branch pipeline. The rehearsal should confirm test titles, OS tags, attachments, project filters, JUnit paths, and HTML navigation, not merely command exit code.

## Frequently Asked Questions

### Why does Playwright need a merge config only when operating systems differ?

Different runners can record unrelated absolute checkout roots and path separators. An explicit \`testDir\` supplies the common suite root that the merge process can use to reconcile those paths. Same-image shards often happen to share an equivalent root, but relying on that accident is brittle.

### Can blob reports from different Playwright versions be combined?

Use the same locked \`@playwright/test\` version for every producer and the merge job. Blob is an internal reporting format rather than a promised long-term interchange standard. Even when mixed versions appear to work, uniform versions make the artifact reproducible and supportable.

### Should each operating system use the same browsers?

Only if that matches the product's support claim. A useful report can combine different project selections, provided project names and OS tags make coverage explicit. Do not interpret an absent browser-platform combination as a pass.

### Why are traces missing after a successful merge?

Check that the original \`report-*.zip\` files were uploaded intact, that the merge output directory was published recursively, and that trace collection was enabled for the relevant result. Counters can merge even when attachment handling in the CI pipeline is incomplete.

### Can I merge blobs from reruns of different commits?

Do not do that for a release-quality report. The reconstructed suite would mix different source definitions and could pair results with the wrong expectations. Scope downloads to one workflow run and record the commit SHA beside the blobs.
`,
};
