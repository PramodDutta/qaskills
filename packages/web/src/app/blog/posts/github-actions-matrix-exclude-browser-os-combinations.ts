import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Exclude Browser and OS Combinations from a GitHub Actions Matrix",
  description:
    "Exclude browser and OS combinations from a GitHub Actions matrix while preserving targeted Playwright coverage, readable jobs, and intentional failure policy.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Exclude Browser and OS Combinations from a GitHub Actions Matrix

Nine jobs appear when three operating systems meet three browsers, even if WebKit on Windows and Firefox on macOS add no planned coverage. GitHub Actions creates that Cartesian product automatically. \`strategy.matrix.exclude\` removes exact combinations before runners are allocated.

## See the expanded matrix before trimming it

A matrix with \`os: [ubuntu-latest, windows-latest, macos-latest]\` and \`browser: [chromium, firefox, webkit]\` produces these nine cells:

| Runner | chromium | firefox | webkit |
|---|---:|---:|---:|
| ubuntu-latest | Run | Run | Run |
| windows-latest | Run | Run | Run |
| macos-latest | Run | Run | Run |

The goal is not minimum job count. It is an explicit coverage set tied to browser engines, operating-system behavior, installation support, and product risk.

## Exclude exact object matches

This workflow removes WebKit on Windows and Firefox on macOS while retaining the other seven jobs:

\`\`\`yaml
name: browser tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    name: e2e / \${{ matrix.browser }} / \${{ matrix.os }}
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        browser: [chromium, firefox, webkit]
        exclude:
          - os: windows-latest
            browser: webkit
          - os: macos-latest
            browser: firefox
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps \${{ matrix.browser }}
      - run: pnpm exec playwright test --project=\${{ matrix.browser }}
\`\`\`

Inside this TypeScript template the GitHub expressions are escaped, but the generated YAML contains the usual expression syntax. Each exclude entry is a partial matrix object. A generated combination is removed when its matching keys have those values.

The [GitHub Actions Playwright matrix guide](/blog/github-actions-playwright-matrix-guide-2026) covers the full workflow around reporting and artifacts.

## Verify what partial matching removes

If a matrix also contains \`node: [20, 22]\`, excluding only \`os\` and \`browser\` removes both Node variants for that pair. Add \`node\` to the exclusion when only one runtime should disappear.

| Exclusion | Matrix axes | Cells removed |
|---|---|---:|
| \`{ os: windows, browser: webkit }\` | os, browser | 1 |
| Same exclusion | os, browser, node with 2 values | 2 |
| \`{ os: windows }\` | os, browser, node | Every Windows cell |
| Full object including node 22 | os, browser, node | 1 |

Use exact values as declared in the matrix. \`windows\` does not match \`windows-latest\`, and exclusions do not behave as glob patterns.

## Prefer include-only matrices for sparse coverage

When most Cartesian cells are invalid, listing the intended jobs is clearer than generating dozens and excluding most of them.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - os: ubuntu-latest
        browser: chromium
        project: chromium
      - os: ubuntu-latest
        browser: firefox
        project: firefox
      - os: ubuntu-latest
        browser: webkit
        project: webkit
      - os: windows-latest
        browser: chromium
        project: chromium
      - os: macos-latest
        browser: webkit
        project: webkit

runs-on: \${{ matrix.os }}
steps:
  - uses: actions/checkout@v4
  - run: pnpm exec playwright test --project=\${{ matrix.project }}
\`\`\`

| Matrix style | Best when | Review characteristic |
|---|---|---|
| Axes plus few exclusions | Most combinations are useful | New axis values expand coverage automatically |
| Include-only objects | Coverage is intentionally sparse | Every job is visible and deliberate |
| Axes plus include metadata | Mostly Cartesian plus exceptional jobs | Powerful but requires careful expansion review |

Be cautious with \`include\`. GitHub applies include objects according to whether values can be added to original combinations without overwriting matrix values; objects that cannot merge can create additional combinations. For a sparse list, a matrix containing only \`include\` avoids ambiguity.

## Separate Playwright browser projects from runner operating systems

Playwright's \`--project\` selects a project name from \`playwright.config.ts\`; it is not automatically the same as a browser executable name. Map matrix values explicitly when projects are called \`desktop-chrome\`, \`mobile-safari\`, or \`firefox-enterprise\`.

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

Playwright's bundled Chromium channel is not installed Google Chrome, and WebKit is not the Safari application. Engine coverage remains valuable, but label reports accurately. The [Playwright multi-browser projects guide](/blog/playwright-projects-multi-browser-guide-2026) explains project-level device and context configuration.

## Design the coverage set from failure modes

Operating systems matter for fonts, file paths, native dependencies, line endings, permissions, and platform UI. Browser engines matter for layout, web APIs, events, and rendering. Repeating every engine on every OS is sometimes justified, but often a targeted set plus one broad Linux sweep is more efficient.

| Risk | Valuable cell |
|---|---|
| Windows path and download behavior | Chromium on Windows |
| Safari-like engine compatibility | WebKit, often on Linux and macOS for selected coverage |
| Gecko-specific layout | Firefox on a stable runner |
| macOS font screenshots | Chosen engine on macOS with committed baselines |
| General engine regression | All three engines on one primary OS |

Record why each exclusion exists in nearby comments or engineering documentation. “Too slow” should lead to a deliberate tier, perhaps pull-request smoke coverage and nightly breadth, rather than permanent invisible loss.

## Add dimensions without accidental multiplication

Adding locale, shard, Node version, or test tier multiplies every remaining cell. A 7-cell browser-OS matrix with two Node versions and four shards creates 56 jobs.

Model only dimensions that require separate jobs. Playwright can run multiple projects within one job, and application-level data can be parameterized inside a test. Sharding is a job dimension because it splits work; locale may be a Playwright project instead.

\`\`\`yaml
matrix:
  os: [ubuntu-latest, windows-latest, macos-latest]
  browser: [chromium, firefox, webkit]
  shard: [1, 2, 3, 4]
  exclude:
    - os: windows-latest
      browser: webkit
    - os: macos-latest
      browser: firefox

steps:
  - run: pnpm exec playwright test --project=\${{ matrix.browser }} --shard=\${{ matrix.shard }}/4
\`\`\`

Because shard is omitted from each exclusion, all four shards for those browser-OS pairs are removed, which is normally intended.

## Validate matrix changes before merging

GitHub's workflow visualization shows jobs after a run begins, but review can catch mistakes earlier. Parse the YAML and expand combinations in a small repository script, or use a trusted workflow linter for syntax. Keep a human-readable coverage table in the pull request when changing multiple exclusions.

Assertions for a custom expander should check total job count and named required cells, not duplicate GitHub's entire matrix algorithm. For example: Chromium must run on all three OS values, all engines must run on Ubuntu, and WebKit-Windows must not exist.

| Invariant | Reason |
|---|---|
| At least one job per browser engine | Prevent total engine loss |
| At least one job per supported OS | Preserve platform signal |
| Required release cell present | Protect production target |
| No duplicate include objects | Avoid paying twice for same coverage |
| Expected job count reviewed | Detect accidental multiplication |

## Handle failure policy separately from exclusion

\`fail-fast: false\` lets other matrix jobs continue after one fails. It does not make failures optional. \`continue-on-error\` changes whether a job failure fails the workflow and should be driven by explicit experimental metadata, not used to silence a flaky combination.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - os: ubuntu-latest
        browser: chromium
        experimental: false
      - os: macos-latest
        browser: webkit
        experimental: true
runs-on: \${{ matrix.os }}
continue-on-error: \${{ matrix.experimental }}
\`\`\`

An excluded job produces no result. An allowed-to-fail job produces evidence but does not gate. Those are different governance choices.

## Install only the browser needed by each cell

\`playwright install --with-deps\` without a browser argument installs all default browsers, wasting time in a job that runs one project. Passing the matrix browser installs the selected engine. Linux system dependencies are handled by \`--with-deps\`; behavior on hosted macOS and Windows runners differs, so keep commands tested on each selected runner.

Cache package-manager dependencies according to supported setup action behavior, but be careful caching browser binaries across Playwright version changes. The browser revision is coupled to the installed Playwright package.

## Artifacts need collision-free names

Every matrix cell may upload a report or blob. Include all distinguishing axes in artifact names, especially shard.

\`\`\`yaml
- name: Upload Playwright blob
  if: \${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: blob-\${{ matrix.os }}-\${{ matrix.browser }}-\${{ matrix.shard }}
    path: blob-report
    retention-days: 7
\`\`\`

An excluded combination naturally has no artifact. Report-merging jobs must discover available artifacts rather than waiting for names that can never be created.

## Common exclusion mistakes

| Mistake | Result | Correction |
|---|---|---|
| Wrong capitalization or alias | Cell still runs | Copy exact matrix value |
| Excluding only one shard accidentally | Remaining shards run | Omit shard to remove pair, or list intent clearly |
| Assuming exclude supports expressions as patterns | Unexpected expansion | Use literal combinations or include-only list |
| Adding Node axis without recounting | Job count doubles | Review expanded count |
| Excluding a flaky cell permanently | Coverage disappears | Fix or quarantine with ownership and expiry |
| Project name differs from browser value | Playwright says project not found | Add a project field mapping |

## Evolve pull-request and scheduled matrices

One workflow can choose a compact matrix for pull requests and a wider matrix for scheduled runs, but dynamic matrix construction becomes harder to review. Two jobs or reusable workflows with explicit include lists are often clearer.

Pull requests might run all engines on Ubuntu plus Chromium on Windows. A nightly job might add macOS and extra browser channels. Required branch checks should use stable job names or a gate job that aggregates matrix outcomes, because individual generated job names change with the matrix.

## Review matrix changes as coverage code

A pull request that adds an exclusion changes the tested product surface, even though no test file changed. Require the author to name the unsupported or redundant behavior, the remaining cell that covers it, and whether the decision expires. This makes cost decisions visible and prevents a temporary runner incident from becoming permanent absence.

Runner labels can change meaning over time. \`ubuntu-latest\`, \`windows-latest\`, and \`macos-latest\` advance when GitHub updates their mappings. Pin a specific image label when visual baselines or native behavior require stability, then schedule deliberate upgrades. Browser binaries installed by Playwright are separately versioned through the package lockfile.

Architecture is another axis on self-hosted or supported hosted runners. Adding \`arch: [x64, arm64]\` doubles cells, but \`runs-on\` needs labels that actually select each architecture. Exclusions cannot make an invalid runner label valid. Use include objects to map logical architecture to concrete runner labels when the mapping is irregular.

Secrets and environment protection may differ by operating system or event. Pull requests from forks do not receive normal secrets. A matrix cell that requires a protected credential can fail before browser tests begin. Keep untrusted pull-request coverage secretless, and route privileged environment tests through an appropriately controlled workflow rather than excluding random OS cells.

Timeouts can be metadata in include-only objects. macOS jobs or WebKit suites may need a different tested limit, but do not inflate all jobs globally. Pass a numeric \`timeout-minutes\` field into the job. Similarly, set project-specific artifact retention only when policy permits it.

Conditional steps are not the same as excluding jobs. A matrix job that starts and then skips its test step still consumes scheduling overhead and may produce a misleading success. Exclude or omit a genuinely invalid combination. Use step conditions when setup or reporting differs inside a valid job.

Required checks deserve special design. Branch protection that names one generated matrix job can become brittle when an exclusion removes it. A stable aggregation job can depend on the matrix job and fail if required cells fail. Confirm how skipped dependencies affect that gate, and keep the gate name constant.

When a browser-OS cell flakes, preserve traces and classify the cause before changing coverage. Platform-only failures often reveal real path, font, timing, or native-dialog bugs. If quarantine is necessary, attach an owner and removal condition. \`continue-on-error\` retains evidence; \`exclude\` does not run anything.

Review billing with measured job minutes, not only cell count. Hosted runner cost multipliers and queue times vary by operating system and plan. Those values are time-sensitive, so consult current GitHub documentation rather than embedding prices in a durable workflow comment.

Finally, periodically compare the matrix to production analytics and support policy. If the product drops an OS, remove coverage intentionally. If a browser gains material usage or a platform-specific feature ships, add the relevant cell. The matrix is a risk model expressed as YAML, not a one-time optimization puzzle.

Reusable workflows can accept a JSON matrix, but parsing and permissions become less visible. Validate the input, log expanded coverage, and guard against an empty include list producing no browser jobs.

Matrix metadata used in expressions should have consistent types. Quote version-like labels and inspect YAML boolean coercion. One include object with a string \`"false"\` does not behave like the boolean used by other jobs.

Use \`max-parallel\` when a valid matrix would overwhelm a shared test environment. Excluding browser-OS pairs is a coverage decision, not a substitute for controlling concurrent load and isolating data.

Shell syntax differs across runners. PowerShell does not accept every Bash assignment or path idiom. Keep commands portable, choose an installed shell explicitly, or map OS-specific commands as metadata. A setup syntax failure provides no browser evidence.

Print the final runner, browser project, Node version, and shard at the start of each job. This diagnostic makes mapping mistakes and mislabeled artifacts visible before lengthy installation output.

Environment URLs can be matrix metadata when cells intentionally target different deployments, but never mix production and destructive test jobs in one expansion. Protect environments through GitHub's environment controls and make the target visible in the job name. An exclusion should not be the only barrier preventing a write suite from reaching production.

Container jobs add another compatibility layer. A Linux container cannot turn a Windows runner cell into genuine Windows browser coverage, and macOS runners do not run Linux job containers in the same way. If browsers run inside a container, label reports with the container OS and browser environment, not merely the host runner.

Service containers are supported only in compatible runner contexts. PostgreSQL or mock-service setup that works on Ubuntu may require a different approach on Windows or macOS. Use include metadata to select setup steps, or keep backend services remote and isolated. Do not exclude platform coverage solely because an unrelated fixture script assumes Linux.

Matrix outputs are difficult to aggregate directly because generated jobs can overwrite the same named output. Prefer artifacts with unique names and a downstream merger that enumerates them. The merger should validate expected required cells against a manifest so a missing artifact cannot look like an empty successful report.

Cancellation behavior matters with \`fail-fast\`. When it is true, one failure can cancel siblings and reduce diagnostic coverage. When false, all cells continue, which costs more but gives a complete cross-platform picture. Choose based on feedback goals, and do not confuse cancellation with an excluded combination.

Finally, test workflow syntax on a branch or with a non-destructive trigger after substantial matrix edits. Static review can count cells, but only an Actions run proves runner availability, shell behavior, browser installation, and artifact naming together.

## Frequently Asked Questions

### Does exclude run after the Cartesian product is created?

Conceptually yes. GitHub generates combinations from matrix variables, applies include and exclude behavior, then creates jobs from the resulting set.

### Must an exclude entry list every matrix key?

No. It can list a subset. Every generated combination matching those key-value pairs is removed, including all values of omitted dimensions.

### When is include-only clearer than exclude?

Use include-only when valid coverage is sparse or each job needs unique metadata. It makes every intended browser-OS pair visible without a large negative list.

### Is WebKit on Playwright equivalent to testing desktop Safari?

No. It tests Playwright's WebKit build, which is useful engine coverage but not the installed Safari application. Keep labels and release claims precise.

### Why did adding four shards remove four times as many jobs as expected?

An exclusion that omits the shard key matches every shard value for that browser-OS pair. Add shard to the exclusion only when one particular shard should be removed.
`,
};
