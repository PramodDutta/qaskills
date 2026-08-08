import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Matrix Exclude Include Patterns That Keep Test Jobs Intentional',
  description: 'Apply CI matrix exclude include patterns to cut invalid jobs, add targeted coverage, control failures, and verify every generated test combination.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# CI Matrix Exclude Include Patterns That Keep Test Jobs Intentional

CI matrix exclude include patterns let a QA team begin with a Cartesian product, remove combinations the product does not support, enrich selected jobs with metadata, and add exceptional jobs that do not belong to the base grid. In GitHub Actions, put partial objects under \`strategy.matrix.exclude\` to remove every generated combination that matches those values. Put objects under \`include\` to add fields to compatible original combinations or create new combinations when values would overwrite the base axes.

The payoff is a matrix that communicates the support policy rather than simply multiplying YAML arrays. Treat the generated job set as test data: calculate it, review it, and assert it. Pair matrix design with [cancelling stale E2E runs](/blog/ci-cancel-stale-e2e-runs-on-new-commit) so obsolete commits do not consume the expanded fleet, and use [CI test selection by Git diff](/blog/ci-test-selection-by-git-diff) when changed files should choose suites before the matrix fans out.

## Think in Rows, Not YAML Decorations

A matrix is a row generator. With two operating systems, two Node lines, and two suites, the base product contains eight rows. Each job receives one value from each axis. \`exclude\` removes rows. \`include\` either annotates compatible original rows or appends new rows. If reviewers cannot list the final rows, the configuration is too implicit.

| Axis | Values | QA reason |
|---|---|---|
| \`os\` | \`ubuntu-latest\`, \`windows-latest\` | Platform-sensitive filesystem and browser behavior |
| \`node\` | \`20\`, \`22\` | Supported runtime lines |
| \`suite\` | \`unit\`, \`e2e\` | Different cost and environment needs |

The base eight are illustrative and derive exactly from this example: 2 x 2 x 2. The workflow is runnable GitHub Actions YAML:

\`\`\`yaml
name: test matrix

on:
  pull_request:

jobs:
  test:
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [20, 22]
        suite: [unit, e2e]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run test:\${{ matrix.suite }}
\`\`\`

The official matrix behavior is documented at https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations. Keep that reference close when an \`include\` entry appears to merge in a surprising way.

## Remove Unsupported Regions With Partial Excludes

An \`exclude\` object only needs to match part of a row. If Windows does not run browser E2E in this repository, matching \`os\` and \`suite\` removes both Node variants. You do not need to list each complete combination.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [20, 22]
    suite: [unit, e2e]
    exclude:
      - os: windows-latest
        suite: e2e
\`\`\`

The final set has six rows: all four Ubuntu rows plus the two Windows unit rows. This is a support-policy statement. Add a short YAML comment when the reason is not obvious, ideally with an issue identifier and a removal condition. Do not encode a temporary outage as a permanent product limitation without an owner.

| Exclude object | Rows removed from the example | Interpretation |
|---|---:|---|
| \`{ os: windows-latest }\` | 4 | Remove all Windows coverage |
| \`{ suite: e2e }\` | 4 | Remove E2E everywhere |
| \`{ os: windows-latest, suite: e2e }\` | 2 | Remove Windows E2E for both Node lines |
| \`{ os: windows-latest, node: 20, suite: e2e }\` | 1 | Remove one precise row |
| \`{ node: 24 }\` | 0 | No base row matches, likely stale intent |

Broad partial matching is powerful and risky. Adding a new browser, database, or suite axis later can cause an old partial exclusion to remove the new values too. Review exclusions whenever an axis grows.

## Use Include to Attach Per-Row Metadata

An \`include\` entry can add keys to original combinations where it does not overwrite an existing matrix value. This is useful for timeouts, artifact retention labels, experimental flags, commands, and runner choices that vary by a subset of the grid.

Suppose all rows receive \`experimental: false\`, Node 22 rows get a longer timeout, and one extra Node 24 canary is allowed to fail. Do not make an overridable default such as timeout a one-value base axis. An include that changes a base-axis value cannot enrich that original row, so it can create an incomplete additional combination. Use defaults as included metadata instead:

\`\`\`yaml
jobs:
  test:
    runs-on: \${{ matrix.os }}
    continue-on-error: \${{ matrix.experimental }}
    timeout-minutes: \${{ matrix.timeout }}
    strategy:
      fail-fast: true
      matrix:
        os: [ubuntu-latest]
        node: [20, 22]
        include:
          - timeout: 15
            experimental: false
          - node: 22
            timeout: 25
          - os: ubuntu-latest
            node: 24
            timeout: 25
            experimental: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: npm ci
      - run: npm test
\`\`\`

The first include adds defaults to every compatible original combination. The second changes \`timeout\` for original Node 22 combinations because \`timeout\` was added by a previous include rather than defined as a base matrix axis. The third cannot merge without overwriting \`node\`, so it creates the experimental row.

## Know the Include Merge Rules Precisely

GitHub applies each include object to original matrix combinations where none of its values would overwrite original matrix values. If it cannot apply the object to any original combination, the object becomes an additional combination. Include entries do not merge into newly added combinations as if those new rows were another base matrix.

Consider the canonical fruit-and-animal style behavior in a QA setting:

\`\`\`yaml
strategy:
  matrix:
    browser: [chromium, firefox]
    shard: [1, 2]
    include:
      - retries: 1
      - browser: firefox
        retries: 2
      - browser: webkit
      - browser: webkit
        shard: 1
\`\`\`

The first item gives every original row \`retries: 1\`. The second gives original Firefox rows \`retries: 2\`. The third adds \`{ browser: webkit }\` because changing the browser would overwrite every original row. The fourth adds its own \`{ browser: webkit, shard: 1 }\` row; it does not enrich the WebKit row introduced immediately before it.

| Include shape | Result | Review question |
|---|---|---|
| Only new keys | Added to all original rows | Should every row receive this default? |
| Base key plus new key | New key added to matching original rows | Is the base-key subset correct? |
| New value for a base key | Additional row | Does it define every key used by the job? |
| Two additions with same new base value | Two independent additional rows | Was accidental merging expected? |
| Override of metadata from earlier include | Later value wins on compatible originals | Is order clear enough to maintain? |

What people get wrong is reading \`include\` as a straightforward append-only list or a generic deep merge. It is neither. Its behavior depends on whether an entry overwrites base values and whether the target row is original.

## Add Back an Excluded Combination Deliberately

GitHub processes include combinations after exclusions, so an include can add back a configuration removed by a partial exclude. This can express a broad prohibition with one audited exception.

For example, remove all Windows E2E combinations, then add one Windows and Node 22 smoke job with an explicit project:

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [20, 22]
    suite: [unit, e2e]
    exclude:
      - os: windows-latest
        suite: e2e
    include:
      - os: windows-latest
        node: 22
        suite: e2e
        project: windows-smoke
\`\`\`

Because the added row supplies a new value for \`project\`, any job step that reads \`matrix.project\` must handle its absence on ordinary rows or assign a default to them. Matrix objects are not schema-checked like TypeScript objects. Missing keys can silently become empty strings in expressions and shell commands.

A safer design gives every row a project value, then overrides the exception:

\`\`\`yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [20, 22]
    suite: [unit, e2e]
    exclude:
      - os: windows-latest
        suite: e2e
    include:
      - project: default
      - os: windows-latest
        node: 22
        suite: e2e
        project: windows-smoke
\`\`\`

Use add-back patterns sparingly. If exceptions dominate, an explicit list is easier to audit.

## Prefer Include-Only Matrices for Irregular Support

Some compatibility policies are not Cartesian. A mobile web project might support Chromium on Linux, WebKit on macOS, and Firefox only for a smoke suite. Creating every possible axis product and excluding most rows obscures the actual promise. Use an include-only matrix instead.

\`\`\`yaml
jobs:
  browser-test:
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: ubuntu-latest
            browser: chromium
            suite: full
          - os: macos-latest
            browser: webkit
            suite: full
          - os: ubuntu-latest
            browser: firefox
            suite: smoke
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=\${{ matrix.browser }} tests/\${{ matrix.suite }}
\`\`\`

This is not less sophisticated. It is an explicit relation. A reviewer can see all three jobs without mentally subtracting exclusions from a large product.

| Matrix shape | Use it when | Avoid it when |
|---|---|---|
| Cartesian axes | Most combinations are supported | Most generated rows are removed |
| Axes plus excludes | A few invalid regions exist | Exclusions encode many one-off exceptions |
| Axes plus metadata includes | Shared grid has small per-row differences | Metadata keys are missing unpredictably |
| Include-only rows | Support is sparse or irregular | Many rows differ by only one regular axis |
| Dynamic JSON | Repository state chooses rows | Generator is untested or opaque |

## Generate Dynamic Matrices as Validated Data

A discovery job can emit JSON and a downstream job can parse it with \`fromJSON()\`. This is appropriate when repository packages, changed services, or an external inventory determine work. The producer must emit compact valid JSON through \`GITHUB_OUTPUT\` and should validate empty results explicitly.

The script below scans a controlled array, filters changed packages, and emits an include-only object. It can run as written with Node.js:

\`\`\`js
import { appendFileSync } from 'node:fs';

const outputFile = process.env.GITHUB_OUTPUT;
if (!outputFile) throw new Error('GITHUB_OUTPUT is required');

const changed = new Set(
  (process.env.CHANGED_PACKAGES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const catalog = [
  { package: 'api', suite: 'integration', os: 'ubuntu-latest' },
  { package: 'web', suite: 'e2e', os: 'ubuntu-latest' },
  { package: 'cli', suite: 'unit', os: 'windows-latest' },
];
const include = catalog.filter((entry) => changed.has(entry.package));
const matrix = JSON.stringify({ include });
appendFileSync(outputFile, \`matrix=\${matrix}\\n\`, 'utf8');
\`\`\`

Wire the output into a workflow:

\`\`\`yaml
jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      matrix: \${{ steps.matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - id: matrix
        env:
          CHANGED_PACKAGES: api,web
        run: node .github/scripts/build-matrix.mjs

  test:
    needs: discover
    if: \${{ fromJSON(needs.discover.outputs.matrix).include[0] != null }}
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix: \${{ fromJSON(needs.discover.outputs.matrix) }}
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:\${{ matrix.suite }} --workspace=\${{ matrix.package }}
\`\`\`

The empty case deserves a repository-specific design. A skipped test job may be acceptable, but branch protection can expect a named check. Often a small gate job should report that no test rows were selected. Do not copy the example condition without checking how required checks behave in the repository.

## Make Artifact Names and Shell Variables Unambiguous

Matrix values frequently enter artifact names, cache keys, and shell environment variables. Pass expressions through \`env\` when practical, quote them, and separate variable names with braces. This avoids greedy shell parsing such as treating \`$CI_PIPELINE_ID_$CI_NODE_INDEX\` as two different variable names than intended.

\`\`\`yaml
- name: Run selected suite
  env:
    TEST_OS: \${{ matrix.os }}
    TEST_NODE: \${{ matrix.node }}
    TEST_SUITE: \${{ matrix.suite }}
    CI_PIPELINE_ID: \${{ github.run_id }}
    RUN_ATTEMPT: \${{ github.run_attempt }}
  shell: bash
  run: |
    set -euo pipefail
    artifact_name="result_\${CI_PIPELINE_ID}_\${RUN_ATTEMPT}_\${TEST_OS}_\${TEST_NODE}"
    printf 'artifact=%s\\n' "\${artifact_name}"
    npm run "test:\${TEST_SUITE}"
\`\`\`

Do not interpolate untrusted event data directly into a shell program. Matrix values defined in the repository are controlled, but a dynamic generator that consumes issue titles, branch names, or dispatch payloads must validate its vocabulary.

## Control Failure and Concurrency Separately

\`strategy.fail-fast\` controls whether a failing non-tolerated matrix job cancels queued and in-progress siblings. \`continue-on-error\` belongs at the job level and can be driven by a matrix field for experimental rows. \`max-parallel\` limits how many matrix jobs run concurrently. These settings solve different problems.

| Setting | Scope | QA use |
|---|---|---|
| \`fail-fast: true\` | Whole matrix reaction | Stop expensive siblings after a definitive supported-row failure |
| \`fail-fast: false\` | Whole matrix reaction | Collect the complete compatibility picture |
| \`continue-on-error\` | One generated job | Mark a canary as informative, not required |
| \`max-parallel\` | Matrix scheduling | Protect device labs, rate-limited services, or databases |

Do not label unsupported rows experimental merely to keep the workflow green. An experimental row should have an owner and a promotion or removal condition. Conversely, use \`fail-fast: false\` for compatibility sweeps where all failures provide diagnostic value.

## Diagnose a Missing Browser Job

A realistic failure occurs after adding WebKit to a browser axis. The workflow syntax passes, but no Windows WebKit smoke job appears. The team assumes runner capacity cancelled it. The actual cause is an old partial exclusion:

\`\`\`yaml
exclude:
  - os: windows-latest
\`\`\`

That object removes every Windows row, including future browsers. Diagnose generated-job gaps systematically:

1. Write out the base Cartesian rows.
2. Apply each partial exclusion and record which rows disappear.
3. Apply include entries in order, distinguishing annotations from additions.
4. Check every job-level \`if\` expression after matrix expansion.
5. Inspect concurrency cancellation and fail-fast only after proving the row existed.
6. Compare the final set with the support policy, not with the previous run's job count.

For a static matrix, a small local enumerator makes the review concrete:

\`\`\`js
const axes = {
  os: ['ubuntu-latest', 'windows-latest'],
  browser: ['chromium', 'firefox', 'webkit'],
};
const excluded = [{ os: 'windows-latest', browser: 'firefox' }];

const rows = axes.os.flatMap((os) =>
  axes.browser.map((browser) => ({ os, browser })),
);
const matches = (row, pattern) =>
  Object.entries(pattern).every(([key, value]) => row[key] === value);
const finalRows = rows.filter(
  (row) => !excluded.some((pattern) => matches(row, pattern)),
);

console.table(finalRows);
if (finalRows.length !== 5) throw new Error('Unexpected matrix size');
\`\`\`

This script models exclusions only, so do not claim it emulates all GitHub include semantics. Its purpose is to test the policy region being changed.

## Prevent Duplicate Rows and Artifact Collisions

Two different include entries can produce jobs that run the same effective test command. GitHub still sees different matrix objects, while the test system sees duplicate work. This happens when metadata differs but the command ignores it, or when an add-back recreates a row that another include already added. Duplicates waste runner time and can race on artifacts, test accounts, or deployment environments.

Define a canonical identity for each job. For a browser suite it might be operating system, browser, project, shard index, and runtime. Metadata such as timeout or experimental status should not create a second identity unless it changes execution. A matrix policy test can serialize those identity fields, insert them into a set, and fail on repetition. It should also assert that every required support tuple appears exactly once.

Artifact naming must use the same distinguishing dimensions. If two shards both upload results under “chromium-e2e,” one can overwrite or conflict with the other depending on the upload strategy. Include run ID, attempt, platform, suite, browser, and shard where applicable. Do not depend on job completion order. For human readability, keep the name stable enough to map back to the matrix row printed in logs.

Caches have a different identity. A dependency cache may intentionally be shared across suites but should distinguish incompatible operating systems, architecture, lockfile content, and runtime where required. A browser binary cache can follow yet another policy. Do not mechanically reuse the artifact identity as the cache key. Write down which inputs make cached content compatible and which make result artifacts unique.

Shared external resources also need a row identity. Generate test database names, tenant IDs, and device reservations from controlled matrix values plus the workflow run. Shell variables should use braces, be quoted, and pass through environment mappings. Validate length and allowed characters before sending names to systems with stricter rules. A browser label containing punctuation should not become an unsafe database identifier.

## Layer the Matrix by Feedback Purpose

One giant matrix rarely serves pull-request feedback, compatibility confidence, and release certification equally well. Build layers with explicit objectives. A pull request can use one primary runtime and browser plus targeted changed-component expansion. A scheduled workflow can run the full supported grid. A release workflow can add packaging, upgrade, or production-like database combinations.

The support contract remains consistent across layers, but selection differs. Avoid copying three matrices by hand because exclusions drift. Store a small support catalog in code or a reusable workflow interface, then have each layer select rows using reviewed criteria. If the repository cannot justify that abstraction, keep duplicated YAML small and add a test that compares essential support rows.

Cost is not merely the number of rows. A macOS UI job, a five-shard Chromium run, and a Linux unit job have different durations and resource prices. Capture observed duration by canonical row and use it when deciding max-parallel or pull-request coverage. Do not fabricate an average. Repository history provides the evidence. Also consider scarce capacity such as licensed mobile devices or a rate-limited staging API.

Sharding belongs in the matrix only when each shard is independently addressable and artifacts merge reliably. Add a shard axis for regular expansion, or add explicit shard rows for irregular projects. Every shard needs the total and index, and the runner command must consume both. A matrix that creates four shard jobs while the command ignores the index executes the full suite four times. Assert the command line or publish a small manifest showing selected tests per shard.

When a row is excluded for cost rather than incompatibility, say so. “Unsupported” and “not run on every pull request” are different claims. The former defines product coverage; the latter defines feedback cadence. Scheduled coverage can preserve a supported combination that is too expensive for every commit.

## Audit Conditions Applied After Expansion

Matrix design does not end under the matrix key. Job-level conditions, step-level conditions, environments, and concurrency groups can alter effective execution after rows are generated. A row may appear in the UI but skip the test step because a condition compares a numeric matrix value with a string. Another may wait for an environment approval that its siblings do not require.

Review every expression that reads matrix fields. GitHub expression coercion can be surprising, and step outputs are strings unless converted. Keep boolean fields boolean in static YAML. For dynamic JSON, emit actual JSON booleans and numbers, then use fromJSON() at the matrix boundary. Avoid encoding “false” as a nonempty string and assuming it behaves like false.

Conditions should express policy with positive names. A field such as run_destructive: true is clearer than a long expression that excludes three environments. If a step is mandatory for every row, do not guard it redundantly. If only a subset uploads a special report, add an explicit metadata field and ensure all rows receive a default.

Concurrency groups can serialize or cancel rows with the same key. Include enough matrix identity when parallel execution is safe, and intentionally omit identity when rows must share a lock. For example, UI jobs using one fixed staging tenant may need a common group even though their browsers differ. A group accidentally based only on workflow name can make unrelated matrix jobs cancel each other and look like exclusions.

Environment protection can also change timing. A release matrix with three deployment targets may create all jobs, but each environment can have different reviewers and secrets. Keep test matrices separate from deployment fan-out when the permissions and failure meanings differ. A test failure should not be confused with an approval wait.

During diagnosis, classify a missing result precisely: never generated, generated then skipped, queued without capacity, cancelled by fail-fast, cancelled by concurrency, allowed to fail, or completed without publishing its artifact. Each state points to a different part of the workflow. Counting visible job boxes without inspecting conclusions and logs is not a sufficient matrix audit.

## Make Matrix Changes Reviewable by Coding Agents

An agent modifying a matrix needs more than the YAML file. Provide the supported platform table, runner inventory, required checks, suite commands, artifact naming policy, and known temporary exclusions. Ask it to output the final canonical rows before editing. That intermediate result lets a human catch a misunderstood partial exclusion early.

After editing, require a second enumeration and a set difference: rows added, rows removed, and rows whose metadata changed. Changes to timeout, experimental status, runner label, or suite command can be as important as additions. A zero row-count difference does not imply a no-op.

The agent should not guess action versions, runner labels, or package scripts. Those identifiers must come from the repository or official documentation. It should preserve comments that explain business intent and update a comment only when the associated exception changes. Temporary exclusions need an owner and a removal condition that survives beyond a chat transcript.

Finally, make the policy test part of CI. An agent-generated matrix can pass YAML parsing while omitting a required row. A small executable contract that checks uniqueness, required tuples, allowed values, and complete metadata provides a fast guard before expensive jobs begin. This turns matrix correctness from reviewer intuition into repository evidence.

## Review the Final Job Set as a Contract

Matrix YAML should be reviewed with the same rigor as parameterized test data. Require a change description to list added and removed rows. Keep a machine-readable support table when the matrix is business-critical. Test dynamic generators with ordinary unit tests, including an empty selection and unknown input.

Useful review questions are:

- Does each exclusion correspond to an unsupported or intentionally deferred combination?
- Is a partial exclusion wider than its comment suggests?
- Does every added include row define all fields consumed by steps?
- Are defaults represented as metadata rather than accidental single-value axes?
- Could an include-only list state the policy more directly?
- Are experimental failures visible and owned?
- Does concurrency reflect finite browsers, devices, accounts, and database capacity?
- Will artifact and cache names remain unique for every final row?

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when teams want an agent to enumerate matrix rows and review changes consistently. The agent still needs the repository's support policy. YAML alone cannot explain whether an omitted combination is intentional.

## Frequently Asked Questions

### Does a partial exclude remove every matching matrix job?

Yes. An excluded configuration only needs to match part of a generated combination. If an object specifies \`os: windows-latest\`, it removes all original rows with that OS across every other axis. This is convenient for removing an unsupported region, but it can silently affect new axis values added later. Enumerate the final rows whenever a matrix axis changes, and make narrow exclusions when only one browser, runtime, or suite is unsupported.

### When does include create a new job instead of modifying jobs?

An include object enriches compatible original combinations when its values do not overwrite original matrix values. If it cannot be added to any original combination without overwriting, GitHub adds it as a new combination. Newly added combinations are not treated as original rows for later include merging. Define every field consumed by the job on exceptional rows, or establish defaults through an include that applies to all original combinations.

### Should a sparse compatibility policy use many excludes?

Usually not. If most Cartesian combinations are invalid, an include-only matrix is clearer. Each object becomes one supported job with explicit OS, runtime, browser, suite, and metadata. Axes plus a few exclusions work best when support is mostly regular. Choose the representation that lets a reviewer list the final jobs with the least mental subtraction, then validate the list with a script or policy test.

### How should experimental matrix jobs affect workflow status?

Add an \`experimental\` boolean to every row and drive job-level \`continue-on-error\` from it. Keep supported rows false and canary rows true. Decide \`fail-fast\` separately: it controls the response of sibling jobs to a non-tolerated failure. Experimental must not mean invisible. Publish its result, retain artifacts, assign an owner, and state when the row graduates to required coverage or is removed.
`,
};
