import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Run Playwright Shards with GitLab CI parallel:matrix',
  description:
    'Run Playwright shards with GitLab CI parallel:matrix across browser projects, map shard indexes safely, preserve failed blobs, and merge one report.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Run Playwright Shards with GitLab CI parallel:matrix

Six GitLab jobs appear in the pipeline: Chromium shards 1 through 3 and WebKit shards 1 through 3. Each must receive the correct Playwright project and a one-based \`--shard=index/total\` argument, then upload a uniquely named blob even when tests fail. A final job should download every producer artifact and merge the blobs into one report without rerunning a browser.

GitLab's \`parallel:matrix\` expresses those explicit combinations. It differs from numeric \`parallel\`, which creates N copies and supplies \`CI_NODE_INDEX\` and \`CI_NODE_TOTAL\`. With a matrix, named variables make the intended browser and shard visible in job names and scripts.

## Model the matrix as valid Playwright arguments

Playwright shard numbering is one-based: \`1/3\`, \`2/3\`, \`3/3\`. Put strings in GitLab YAML to avoid accidental numeric coercion and keep one total for every index in a browser group.

\`\`\`yaml
stages:
  - test
  - report

playwright:
  stage: test
  image: mcr.microsoft.com/playwright:v1.54.1-noble
  parallel:
    matrix:
      - PW_PROJECT: ['chromium', 'webkit']
        SHARD_INDEX: ['1', '2', '3']
        SHARD_TOTAL: ['3']
  variables:
    CI: 'true'
  script:
    - npm ci
    - npx playwright test --project="$PW_PROJECT" --shard="$SHARD_INDEX/$SHARD_TOTAL"
  artifacts:
    when: always
    expire_in: 2 days
    paths:
      - blob-report/
\`\`\`

Pin the container tag to the Playwright package version in the lockfile. The exact tag above is illustrative for a repository using that version, not a recommendation to copy an old version. A version mismatch between browser image and installed package can cause browser executable errors.

GitLab generates job names from matrix values. Duplicate value combinations can overwrite job definitions, so ensure each row expands uniquely. Large matrices also create long names, which can interact with GitLab job-name limits, especially when referenced by \`needs\`.

| Variable | Example | Consumer | Validation |
|---|---|---|---|
| \`PW_PROJECT\` | \`webkit\` | \`--project\` | Must match configured Playwright project |
| \`SHARD_INDEX\` | \`2\` | Numerator of \`--shard\` | Integer from 1 through total |
| \`SHARD_TOTAL\` | \`3\` | Denominator of \`--shard\` | Same across the group |
| \`CI\` | \`true\` | Reporter and retry config | String environment value |

## Configure blob output for every producer

The sharded jobs should emit blob reports, not separate HTML directories intended for later concatenation. Blob ZIPs preserve results and attachments in a format \`merge-reports\` understands.

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['blob', { outputDir: 'blob-report' }]]
    : [['html', { open: 'never' }]],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

\`fullyParallel\` lets Playwright distribute individual tests across shards for better balancing. Without it, sharding works at file granularity. Choose based on test isolation and duration distribution, not because the CI matrix requires it.

Blob filenames include selection-derived information and shard number. Because each matrix job has its own workspace and artifact, producer-side collisions are unlikely. The download and merge phase must preserve every ZIP.

## Make artifact identity inspectable

Uploading six identically named \`blob-report\` artifacts can be hard to audit in the GitLab UI. Give each artifact a name containing project and shard while leaving the internal path unchanged.

\`\`\`yaml
  artifacts:
    name: "blob-$PW_PROJECT-$SHARD_INDEX-of-$SHARD_TOTAL"
    when: always
    expire_in: 2 days
    paths:
      - blob-report/
    reports:
      dotenv: shard.env
  after_script:
    - printf 'PRODUCER=%s-%s-of-%s\\n' "$PW_PROJECT" "$SHARD_INDEX" "$SHARD_TOTAL" > shard.env
\`\`\`

Be cautious with dotenv reports from parallel jobs because identical variable names can conflict downstream and they are unnecessary for the merge itself. A plain manifest artifact per job is often clearer. The core requirement is that blob files download without one overwriting another.

Use \`artifacts:when: always\` so assertion failures still yield evidence. A hard runner loss can still prevent upload; the merge job should detect missing producers and label a partial report rather than silently presenting it as complete.

## Merge artifacts in a browser-free job

When a downstream job fetches artifacts from dependencies, their directory structures can overlap. Collect all \`report-*.zip\` files into one directory, reject duplicate basenames, validate the expected count, and run the merge with the same installed Playwright package.

\`\`\`yaml
merge-playwright-report:
  stage: report
  image: node:22-bookworm
  needs:
    - job: playwright
      artifacts: true
  when: always
  script:
    - npm ci
    - node scripts/collect-blob-reports.mjs
    - npx playwright merge-reports --config=merge.config.ts all-blob-reports
  artifacts:
    when: always
    expire_in: 14 days
    paths:
      - playwright-report/
      - test-results/
\`\`\`

Depending on GitLab version and matrix configuration, use supported matrix expressions or explicit needs entries when a job must depend on selected matrix children. For one merger consuming the whole matrix, test artifact download behavior in your GitLab instance. GitLab features evolve, so lint the configuration and inspect a pipeline graph before relying on implicit artifact flow.

The collector uses Node APIs and fails on overwrite:

\`\`\`js
// scripts/collect-blob-reports.mjs
import { cp, mkdir, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const root = process.cwd();
const output = join(root, 'all-blob-reports');
await mkdir(output, { recursive: true });

async function walk(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'all-blob-reports') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (/^report-.*\\.zip$/.test(entry.name)) found.push(path);
  }
  return found;
}

const blobs = await walk(root);
if (blobs.length !== 6) {
  throw new Error(\`Expected 6 blob reports, found \${blobs.length}\`);
}

const names = blobs.map(basename);
if (new Set(names).size !== names.length) {
  throw new Error(\`Blob filename collision: \${names.join(', ')}\`);
}

await Promise.all(blobs.map((source) => cp(source, join(output, basename(source)))));
\`\`\`

An exact count is appropriate for a fixed two-by-three matrix. If rules conditionally omit a browser, derive the expected manifest from the same pipeline policy rather than weakening the check to “at least one.”

## Keep merge-only settings separate

\`\`\`ts
// merge.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright.xml' }],
  ],
});
\`\`\`

The merge job needs no browser installation because it does not execute tests. It does need repository code, dependencies, blob inputs, and a consistent test root. Separate configuration prevents web-server startup or execution options from leaking into report generation.

For broader runner, cache, security, and pipeline architecture, see the [GitLab CI test automation guide](/blog/gitlab-ci-test-automation-guide-2026).

## Numeric parallel versus parallel:matrix

Numeric \`parallel: 3\` is sufficient when only shard index changes. GitLab gives every copy \`CI_NODE_INDEX\` and \`CI_NODE_TOTAL\`. \`parallel:matrix\` is more readable when combining browser, device group, environment, or feature pack.

| Shape | Configuration strength | Main drawback |
|---|---|---|
| \`parallel: 4\` | Minimal sharding syntax, built-in node variables | Extra dimensions need separate jobs or derived logic |
| \`parallel:matrix\` | Named valid combinations appear in graph | Cartesian products can create too many jobs |
| Manually listed jobs | Complete control over every variant | Duplication and drift |
| Dynamic child pipeline | Matrix generated from repository data | More pipeline machinery and debugging |

Avoid adding a matrix axis for values that do not change test selection. Every axis multiplies jobs. Runner scarcity can turn “parallel” jobs into a long pending queue, adding coordination overhead without shortening wall time.

## Shard balance and project duration

Equal shard counts do not guarantee equal duration. WebKit might be slower, and file-level sharding can place a large spec on one worker. Read durations from reports, then decide whether \`fullyParallel\` is safe or whether tests should be reorganized. Do not give Chromium three shards and WebKit two unless the matrix and expected artifact logic explicitly model those distinct totals.

The [Playwright parallel sharding guide](/blog/playwright-parallel-sharding-execution-guide) covers worker isolation and balancing. GitLab only schedules jobs; Playwright determines which tests belong to each shard.

## Rules, retries, and matrix consistency

Apply \`rules\` to the matrix job as a whole unless specific variants genuinely have different eligibility. If a browser is skipped for documentation-only changes, the merger's expected count must follow the same decision. A manual retry replaces or adds job artifacts according to GitLab behavior; verify that the merger consumes one coherent attempt rather than stale and new blobs.

Playwright retries occur inside the blob result and are distinct from retrying the GitLab job. A job retry reruns its entire shard. Keep attempt provenance in artifact names or manifests so a report is not assembled from ambiguous executions.

## Failure modes visible from the pipeline

| Symptom | Likely cause | First inspection |
|---|---|---|
| Every job runs shard 1 | Shell variable quoting or matrix variable absent | Job log command line |
| Tests repeated across browser jobs | Expected, if both projects include same tests | Filter report by project |
| Merge contains only last shard | Artifact paths overwrote identical blob names | Collector input tree and basenames |
| Merge job skipped after test failure | Downstream policy lacks always execution | Job \`when\` and needs behavior |
| Browser executable missing | Image and package versions differ | Lockfile version and image tag |
| One shard much slower | Uneven files or serial suites | Per-test durations and sharding mode |

Add a small pipeline canary with intentionally failing tests distributed across known files. Confirm all producer artifacts arrive, the merge runs, failure details and traces open, and JUnit is imported. Do this before making the report the only retained evidence.

## Avoid Cartesian products that include invalid pairs

The compact matrix form creates every combination. That is correct when both browser projects use all three shards. If mobile Chromium uses two shards and WebKit uses three, list valid groups separately instead of generating empty jobs.

\`\`\`yaml
parallel:
  matrix:
    - PW_PROJECT: ['mobile-chromium']
      SHARD_INDEX: ['1', '2']
      SHARD_TOTAL: ['2']
    - PW_PROJECT: ['webkit']
      SHARD_INDEX: ['1', '2', '3']
      SHARD_TOTAL: ['3']
\`\`\`

Every expanded row now represents actual work. Empty jobs waste runners and make expected-artifact calculations ambiguous. Validate that each group contains all indexes from one through its total.

## Prove completeness with a shard manifest

Blob names contain selection information, but a separate manifest is easier to audit and can include GitLab identity.

\`\`\`js
// scripts/write-shard-manifest.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const manifest = {
  project: process.env.PW_PROJECT,
  index: Number(process.env.SHARD_INDEX),
  total: Number(process.env.SHARD_TOTAL),
  commit: process.env.CI_COMMIT_SHA,
  pipeline: process.env.CI_PIPELINE_ID,
  job: process.env.CI_JOB_ID,
};

if (!manifest.project || manifest.index < 1 || manifest.index > manifest.total) {
  throw new Error(\`Invalid shard manifest: \${JSON.stringify(manifest)}\`);
}

await mkdir('blob-report', { recursive: true });
await writeFile(
  \`blob-report/manifest-\${manifest.project}-\${manifest.index}.json\`,
  JSON.stringify(manifest, null, 2),
);
\`\`\`

The merger should require one commit and pipeline ID, unique project/index pairs, and complete index ranges. This catches blobs copied from an earlier pipeline or a retried job mixed with current outputs.

## Quote variables for the runner shell

The examples use a Linux container and POSIX expansion. A Windows shell runner needs different syntax. Keep the entire shard fraction quoted as one argument and validate generated values before starting Playwright.

\`\`\`sh
case "$SHARD_INDEX/$SHARD_TOTAL" in
  1/3|2/3|3/3) ;;
  *) echo "Unexpected shard $SHARD_INDEX/$SHARD_TOTAL" >&2; exit 2 ;;
esac
npx playwright test --project="$PW_PROJECT" --shard="$SHARD_INDEX/$SHARD_TOTAL"
\`\`\`

For variable totals, use a small Node validator rather than complex shell arithmetic. Configuration errors should fail before browser or web-server setup consumes runner time.

## Isolate service data per matrix job

All matrix jobs may target one deployed environment or start independent local services. A shared environment requires unique accounts and namespaces per job. Build the prefix from pipeline ID, project, and shard index. Project names alone collide across concurrent pipelines.

If each job starts a local app, fixed host ports can collide on shell executors. Container executors give stronger network isolation, but a shared database still needs per-job schemas or tenants. Failures appearing only during matrix execution often indicate data collision rather than faulty sharding.

## Keep reports out of caches

GitLab caches can accelerate dependencies, but blob and HTML outputs are artifacts. Caching \`blob-report\` risks restoring stale ZIPs and inflating the merge count. Remove the output directory before each producer and never include it in a cache path.

The Playwright browser image already contains browsers. If a plain Node image downloads browsers, key that cache by operating system and Playwright version. An executable restored for another package version is not valid.

## Preserve failure without weakening the gate

The matrix should fail when any shard fails while the merger still publishes evidence. Do not set \`allow_failure: true\` merely to allow report generation. Artifact retention, downstream \`when: always\` behavior, and quality-gate status are separate concerns.

Inspect how GitLab presents the merged JUnit. Project identity and retry details may be simplified there, so retain Playwright HTML for trace-rich diagnosis. Avoid uploading both six producer JUnit files and the merged JUnit unless duplicate test ingestion is intended.

## Review runner capacity before adding shards

Six matrix jobs shorten the critical path only when runners can execute them concurrently and the shared application can sustain the load. If four wait in \`pending\`, extra shards add checkout, dependency installation, and artifact overhead without useful parallelism. Compare queued duration, setup duration, test duration, and merge duration from actual pipelines.

Browser projects can require different resources. WebKit and video capture may use more memory than a light Chromium API suite. Set runner sizes from observed peaks with safety margin, not one copied value. An out-of-memory termination often leaves no valid blob, which the completeness validator should report as missing evidence rather than a merge defect.

## Keep matrix configuration reviewable

Comment why each axis exists and who owns changes to shard total. When adding a fourth shard, update indexes, total, expected manifests, and capacity assumptions together. A generated child pipeline may be worthwhile when repository packages determine projects dynamically, but static YAML is easier to inspect for a modest stable suite.

GitLab's CI lint and merged-configuration view can catch YAML expansion mistakes before runtime. Still run a branch pipeline because linting cannot prove artifact collection, browser-image compatibility, or test-data isolation.

## Security boundaries for fork pipelines

Protected variables may be unavailable to merge-request pipelines from forks. Do not weaken service authentication so matrix shards can run. Use synthetic local services, a restricted public test environment, or rules that select an unprivileged subset. Ensure blob traces do not publish secrets from privileged jobs to users who cannot access the environment directly.

Artifact access follows project and pipeline permissions, but report content deserves explicit review. Headers, screenshots, and console logs can expose tokens if the application prints them. Redact at source and keep retention short; hiding the HTML link does not sanitize the underlying blob.

Finally, rehearse a runner interruption rather than only an assertion failure. Stop one matrix job after tests begin and confirm the pipeline distinguishes “tests failed with a blob” from “execution evidence missing.” The merger may still create a diagnostic artifact from surviving shards, but its name and summary must say partial. A release gate should remain failed until the absent project-shard pair is rerun and a coherent complete report is produced.

## Frequently Asked Questions

### Are GitLab matrix shard indexes zero-based?

They are whatever strings you define, but Playwright expects one-based shard numerators. Define \`1\` through the total and pass them directly to \`--shard=index/total\`. Do not subtract one.

### Why use \`parallel:matrix\` instead of numeric \`parallel\`?

Use the matrix when named dimensions such as browser project and shard index should form explicit combinations. Numeric parallel is simpler for one dimension and provides \`CI_NODE_INDEX\` plus \`CI_NODE_TOTAL\` automatically.

### Should each shard generate an HTML report?

Generate blob reports for the combined result. HTML directories are not designed to be concatenated. You may retain per-shard HTML for special diagnostics, but it adds storage and does not replace blob merging.

### How can the merge job run when a shard fails?

Upload producer artifacts with \`when: always\` and configure the downstream merge job to run regardless of ordinary upstream failure. Then validate the expected blob count so missing artifacts are reported honestly.

### Does the merge job need the Playwright browser image?

No browser launches during \`merge-reports\`. A compatible Node image plus the repository's locked \`@playwright/test\` dependency is enough. Keep producer images aligned with that same package version.
`,
};
