import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Composite Action Shared Steps for Reusable Test Workflows',
  description: 'Design ci composite action shared steps that package install, browsers, and tests into versioned reusable actions without hiding secrets or breaking callers.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# CI Composite Action Shared Steps for Reusable Test Workflows

CI composite action shared steps are GitHub Actions composite actions: a reusable bundle of steps defined in an \`action.yml\` with \`runs.using: composite\`, called from many workflows as if they were a single step. For QA and test-automation teams, composite actions are how you standardize "install Node, cache dependencies, install Playwright browsers, run the suite, upload artifacts" without copy-pasting twenty lines into every repository workflow.

They are not Docker container actions and not JavaScript actions, though all three are reusable action types. Composite actions shine when the reusable unit is a sequence of existing actions and shell steps that should stay transparent, reviewable, and easy for QA engineers to edit. Official docs start at https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action.

This guide focuses on test pipelines: inputs and outputs design, caching correctly, browser install patterns, failing fast, artifact uploads, versioning, monorepo paths, and the failure modes that appear when shared steps drift from caller expectations. Pair shared steps with pipeline hygiene from [cancel stale e2e runs on new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit) and with selective execution from [CI test selection by git diff](/blog/ci-test-selection-by-git-diff) so reuse does not mean "always run everything slowly."

## When composite actions beat workflow templates and copy-paste

GitHub offers multiple reuse mechanisms. Pick deliberately.

| Mechanism | What it reuses | Coupling | Best for QA teams |
|---|---|---|---|
| Copy-paste steps | Nothing | None | Spikes only |
| Reusable workflows (\`workflow_call\`) | Whole jobs | High (job boundary) | Standard pipelines across repos |
| Composite actions | Steps inside a job | Medium | Shared install/test sequences |
| Container actions | Packaged environment | Medium-high | Complex toolchains |
| JS/TS actions | Custom Node logic | Medium | API-heavy custom steps |

Reusable workflows are ideal when the entire job shape is standard (permissions, services, matrix). Composite actions are ideal when different jobs need the same middle steps but different triggers, matrices, or surrounding steps (for example one job runs unit tests, another runs e2e, both need the same Node setup flavor).

**What people get wrong:** stuffing an entire multi-job pipeline into a composite action. Composite actions cannot define jobs or a matrix of jobs; they run steps inside the caller's job. If you need job-level structure, use a reusable workflow that may itself call composite actions.

## Anatomy of a composite action for Playwright e2e

Repository layout for a private shared actions repo or an internal path:

\`\`\`text
.github/
  actions/
    playwright-e2e/
      action.yml
      README.md
\`\`\`

\`\`\`yaml
name: Playwright E2E Shared Steps
description: Install dependencies, install browsers, run Playwright, upload reports
inputs:
  node-version:
    description: Node.js version
    required: false
    default: "22"
  working-directory:
    description: Directory that contains package.json
    required: false
    default: "."
  playwright-project:
    description: Optional --project value
    required: false
    default: ""
  run-command:
    description: Override test command
    required: false
    default: ""
  upload-report:
    description: Whether to upload the HTML report
    required: false
    default: "true"
outputs:
  report-path:
    description: Path to the Playwright HTML report directory
    value: \${{ steps.meta.outputs.report-path }}
runs:
  using: composite
  steps:
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: \${{ inputs.node-version }}
        cache: npm
        cache-dependency-path: \${{ inputs.working-directory }}/package-lock.json

    - name: Install npm dependencies
      shell: bash
      working-directory: \${{ inputs.working-directory }}
      run: npm ci

    - name: Install Playwright browsers
      shell: bash
      working-directory: \${{ inputs.working-directory }}
      run: npx playwright install --with-deps chromium

    - name: Compute metadata
      id: meta
      shell: bash
      working-directory: \${{ inputs.working-directory }}
      run: |
        echo "report-path=\${{ inputs.working-directory }}/playwright-report" >> "\${GITHUB_OUTPUT}"

    - name: Run Playwright tests
      shell: bash
      working-directory: \${{ inputs.working-directory }}
      run: |
        set -euo pipefail
        if [ -n "\${{ inputs.run-command }}" ]; then
          eval "\${{ inputs.run-command }}"
        elif [ -n "\${{ inputs.playwright-project }}" ]; then
          npx playwright test --project="\${{ inputs.playwright-project }}"
        else
          npx playwright test
        fi

    - name: Upload Playwright report
      if: \${{ always() && inputs.upload-report == 'true' }}
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report-\${{ github.job }}
        path: \${{ steps.meta.outputs.report-path }}
        if-no-files-found: warn
        retention-days: 7
\`\`\`

Caller workflow:

\`\`\`yaml
name: e2e
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: e2e-\${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - name: Run shared Playwright e2e steps
        uses: ./.github/actions/playwright-e2e
        with:
          node-version: "22"
          playwright-project: chromium
        env:
          BASE_URL: \${{ vars.BASE_URL }}
          E2E_USER_EMAIL: \${{ secrets.E2E_USER_EMAIL }}
          E2E_USER_PASSWORD: \${{ secrets.E2E_USER_PASSWORD }}
\`\`\`

Notes that prevent silent breakage:

- Every \`run\` step in a composite action must declare \`shell\`.
- Secrets are not defined inside the composite action; callers pass \`env\` or inputs (prefer env for secrets so they do not render in process lists as inputs dumps).
- \`working-directory\` on steps must be supported carefully; set it on each step that needs it.
- \`eval\` of \`run-command\` is powerful and dangerous; restrict who can change workflows that pass it.

## Design inputs like a public API

Inputs are a contract. Changing defaults can break every caller.

| Input | Guidance | Breaking change example |
|---|---|---|
| node-version | Default to an LTS your org supports | Jumping default 20 -> 22 mid-quarter without notice |
| working-directory | Default \`.\` | Assuming monorepo subfolder without input |
| browser set | Explicit input if not always chromium | Quietly installing all browsers (time cost) |
| cache key seeds | Document lockfile name | Switching npm to pnpm without input |
| upload flags | Boolean strings (\`true\`/\`false\`) | Interpreting empty as true inconsistently |

Version your action: for private path actions, rely on commit SHAs or repo tags when using external repos (\`org/qa-actions/playwright-e2e@v3\`). For same-repo path actions (\`./.github/actions/...\`), versioning is the git history of that folder; use CODEOWNERS so random refactors cannot land unnoticed.

\`\`\`yaml
# External shared actions repo style
- uses: acme-qa/actions/playwright-e2e@v3
  with:
    node-version: "22"
\`\`\`

Pinning to a moving \`main\` branch for shared actions is convenient until a drive-by change breaks every product pipeline on Monday morning. Prefer tags or SHAs for production pipelines.

## Cache correctly or your "shared speedup" becomes shared slowness

Caching is the first place composite actions help and the first place they lie.

**npm cache via setup-node** needs a correct \`cache-dependency-path\` in monorepos. If the lockfile is at \`apps/web/package-lock.json\`, caching the root lockfile does nothing useful.

**Playwright browser cache** is separate from npm. Teams often cache \`~/.cache/ms-playwright\`. If you add caching, key it by OS and Playwright version from \`package-lock.json\` or \`npx playwright --version\`.

Illustrative browser cache steps you might add carefully:

\`\`\`yaml
- name: Get Playwright version
  id: pwver
  shell: bash
  working-directory: \${{ inputs.working-directory }}
  run: |
    VER="$(npx playwright --version | awk '{print $2}')"
    echo "version=\${VER}" >> "\${GITHUB_OUTPUT}"

- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-\${{ runner.os }}-\${{ steps.pwver.outputs.version }}
\`\`\`

Place version detection after \`npm ci\` so the local package resolves. If cache restores browsers already, \`npx playwright install\` becomes faster; keep install in the action so missing caches still work.

Do not cache \`node_modules\` casually across OS or Node versions. Prefer \`npm ci\` with setup-node's dependency cache.

## Outputs and tokens for downstream steps

Composite actions can set outputs via \`GITHUB_OUTPUT\` in a step and map them in \`action.yml\`. Use outputs for report paths, detected test counts, or selection flags from a git-diff step.

\`\`\`yaml
outputs:
  should-run-e2e:
    description: Whether e2e tests should run based on diff selection
    value: \${{ steps.select.outputs.should-run-e2e }}
runs:
  using: composite
  steps:
    - id: select
      shell: bash
      run: |
        # Illustrative: real selection tools vary by repo
        if git diff --name-only "\${{ github.event.before }}" "\${{ github.sha }}" | grep -q '^apps/web/'; then
          echo "should-run-e2e=true" >> "\${GITHUB_OUTPUT}"
        else
          echo "should-run-e2e=false" >> "\${GITHUB_OUTPUT}"
        fi
\`\`\`

Caller:

\`\`\`yaml
- id: e2e
  uses: ./.github/actions/playwright-e2e
- name: Comment on PR
  if: steps.e2e.outputs.should-run-e2e == 'true'
  run: echo "E2E ran for web changes"
\`\`\`

Remember that outputs are strings. Compare accordingly in expressions.

## Failure mode: hidden \`cd\` and wrong working directory

**Failure mode:** The composite action runs \`npm ci\` successfully at repo root, then Playwright cannot find tests because the app lives in \`packages/web\`. Locally, developers run commands from \`packages/web\`. CI fails with "no tests found."

**Diagnosis:**

1. Print \`pwd\` and \`ls\` in the action temporarily.
2. Confirm where \`playwright.config.ts\` lives.
3. Check whether \`defaults.run.working-directory\` in the caller applies to composite action steps (do not assume it does for all nested uses).
4. Fix by adding a \`working-directory\` input and applying it to every relevant step.

**Prevention:** Accept \`working-directory\` as a first-class input from day one, even if the first caller is monorepo-root. Document it in the action README with examples for single-package and monorepo layouts.

## Shell selection, bashisms, and Windows runners

Composite steps must set \`shell\`. If your org still has Windows runners for some jobs, bash-only scripts fail. Either:

- Restrict the action's documented runners to Ubuntu, or
- Write PowerShell steps when \`runner.os == Windows\`, or
- Use \`shell: bash\` only on runners that provide bash.

QA e2e for web is commonly Ubuntu-only. Document that constraint at the top of the README so someone does not attach the action to a Windows matrix for "completeness."

\`\`\`yaml
- name: Assert Linux runner
  shell: bash
  run: |
    if [ "\${{ runner.os }}" != "Linux" ]; then
      echo "This composite action supports Linux runners only" >&2
      exit 1
    fi
\`\`\`

## Permissions, tokens, and least privilege

Composite actions inherit the job's permissions. If your shared steps open issues, comment on PRs, or push artifacts to a third-party store, document required \`permissions:\` for callers.

| Operation | Typical permission | Notes |
|---|---|---|
| Upload Actions artifacts | default often enough | Artifact APIs |
| PR comments | \`pull-requests: write\` | Avoid if optional |
| Checkout private submodules | \`contents: read\` + token | Document token input carefully |
| OIDC to cloud | \`id-token: write\` | For cloud test envs |

Do not hardcode PATs inside \`action.yml\`. Accept \`GITHUB_TOKEN\` from the environment or a documented secret name passed by the caller.

## Keep steps observable: logs are part of the product

Shared actions that swallow errors produce ghost failures. Patterns:

- Use \`set -euo pipefail\` in bash steps.
- Prefer explicit commands over silent redirects.
- On failure, list the test output directory.
- Use \`if: always()\` only for uploads and cleanup, not for the main test step.

\`\`\`yaml
- name: Run tests
  shell: bash
  working-directory: \${{ inputs.working-directory }}
  run: |
    set -euo pipefail
    npx playwright test | tee playwright-console.log
\`\`\`

Artifact the console log as well as the HTML report so agents and humans can grep failures without downloading large traces first.

## Compose small actions rather than one mega-action

A single "do everything for any test type" action becomes a maze of inputs. Prefer a small toolbox:

1. \`setup-node-app\` : checkout already done, Node + npm ci
2. \`playwright-install\` : browsers + OS deps
3. \`playwright-run\` : run + upload

Jobs compose them:

\`\`\`yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-node-app
    with:
      working-directory: apps/web
  - uses: ./.github/actions/playwright-install
    with:
      working-directory: apps/web
      browsers: chromium
  - uses: ./.github/actions/playwright-run
    with:
      working-directory: apps/web
\`\`\`

Mega-actions hide which stage failed and encourage sprawling conditionals. Small actions unit-test better in isolation (you can even run actionlint and smoke workflows).

## Validate with actionlint and a smoke workflow

Install or use \`actionlint\` in a CI job that targets your action wrappers. Also keep a smoke workflow that calls the composite action against a tiny fixture app or the repo itself on a schedule.

\`\`\`yaml
name: composite-action-smoke
on:
  workflow_dispatch:
  schedule:
    - cron: "0 7 * * 1"

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/playwright-e2e
        with:
          working-directory: fixtures/tiny-playwright-app
          upload-report: "true"
\`\`\`

When the smoke goes red, treat it as a production incident for the shared CI platform, not a random fixture toy.

## Parameterize test selection without baking product logic forever

Your composite action might accept a \`grep\` or project input, but product-specific path filters should often stay in the caller or in a dedicated selection action. That keeps the Playwright runner action reusable across repos.

Example caller that combines selection with shared steps:

\`\`\`yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      e2e: \${{ steps.filter.outputs.e2e }}
    steps:
      - uses: actions/checkout@v4
      - id: filter
        # Example uses a filter action; any documented path filter mechanism works
        run: |
          if git diff --name-only origin/main...HEAD | grep -qE '^(apps/web|packages/ui)/'; then
            echo "e2e=true" >> "\${GITHUB_OUTPUT}"
          else
            echo "e2e=false" >> "\${GITHUB_OUTPUT}"
          fi

  playwright:
    needs: changes
    if: needs.changes.outputs.e2e == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/playwright-e2e
\`\`\`

This is where composite actions meet selective CI. Shared steps should not force e2e on docs-only changes.

## Environment files, dotenv, and secret hygiene

Composite actions often need \`.env\` values for local-like e2e. Generate them in the caller or in an explicit step:

\`\`\`yaml
- name: Write e2e env file
  shell: bash
  working-directory: \${{ inputs.working-directory }}
  env:
    E2E_USER_EMAIL: \${{ env.E2E_USER_EMAIL }}
    E2E_USER_PASSWORD: \${{ env.E2E_USER_PASSWORD }}
  run: |
    umask 077
    {
      echo "E2E_USER_EMAIL=\${E2E_USER_EMAIL}"
      echo "E2E_USER_PASSWORD=\${E2E_USER_PASSWORD}"
    } > .env.e2e
\`\`\`

Never \`echo\` secrets to logs. Mask values with \`::add-mask::\` if you must read them from intermediate tools. Prefer environment variables consumed directly by the test runner when the app supports it, avoiding files on disk.

## Monorepo matrix jobs calling one composite action

Matrices stay in the caller. The composite action remains dumb and reliable.

\`\`\`yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        package: [web, admin]
        project: [chromium]
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/playwright-e2e
        with:
          working-directory: apps/\${{ matrix.package }}
          playwright-project: \${{ matrix.project }}
\`\`\`

Artifact names must include matrix values or uploads collide. Use \`github.job\` and matrix dimensions in artifact names inside the action, or accept an \`artifact-name\` input.

\`\`\`yaml
inputs:
  artifact-name:
    description: Unique artifact name for report upload
    required: false
    default: playwright-report
\`\`\`

## Local parity with act or make targets

Engineers should not need GitHub to learn what the composite action runs. Mirror the commands in a \`Makefile\` or \`package.json\` script, and keep the action as a thin wrapper around those scripts.

\`\`\`json
{
  "scripts": {
    "ci:e2e": "npm ci && npx playwright install --with-deps chromium && npx playwright test"
  }
}
\`\`\`

\`\`\`yaml
- name: Run Playwright tests
  shell: bash
  working-directory: \${{ inputs.working-directory }}
  run: npm run ci:e2e
\`\`\`

Now fixing CI locally is \`npm run ci:e2e\`. The composite action adds caching, artifacts, and runner assertions around a known script. Ready-made QA skills from qaskills.sh (via the qaskills CLI) can help generate first-pass action scaffolds, but the long-term contract is the npm script your developers run.

## Migration plan from duplicated workflow blobs

1. Identify the longest duplicated step block across workflows.
2. Extract it to \`.github/actions/<name>/action.yml\` without behavior changes.
3. Replace one non-critical workflow first (nightly, not release).
4. Compare logs and timings for a week.
5. Roll out to PR workflows.
6. Delete duplicated YAML and add CODEOWNERS for the actions folder.
7. Only then optimize caches and split mega-actions.

Resist rewriting commands during extraction. Behavior-preserving moves first, optimizations second.

## Observability metrics for shared CI steps

Track (illustrative):

| Metric | Why |
|---|---|
| Median duration of composite action | Detect cache or install regressions |
| Failure rate attributed to setup vs tests | Know where to invest |
| Artifact download count | Are reports useful? |
| Version adoption of \`@v3\` vs old tags | Lagging callers |

If setup failures dominate, improve the action. If test failures dominate, stop blaming CI packaging.

## Security considerations specific to composite reuse

- **Supply chain:** External actions should pin versions; review updates.
- **Expression injection:** Do not interpolate untrusted PR titles into \`run: echo \${{ github.event... }}\` unsafely. Prefer env blocks.
- **\`pull_request_target\`:** Dangerous with reusable steps that checkout PR code and run it with secrets. Keep privileged workflows separate.
- **eval inputs:** If you accept a freeform command input, treat it as code execution by anyone who can edit workflows in the repo.

\`\`\`yaml
# Safer pattern: fixed commands + small allowlisted inputs
- name: Run Playwright
  shell: bash
  env:
    PROJECT: \${{ inputs.playwright-project }}
  run: |
    set -euo pipefail
    if [ -n "\${PROJECT}" ]; then
      npx playwright test --project="\${PROJECT}"
    else
      npx playwright test
    fi
\`\`\`

Passing project through env avoids nesting quotes inside GitHub expressions awkwardly and reduces injection surface from exotic input characters.

## Documentation that callers actually read

Every composite action README should include:

1. Purpose in one paragraph
2. Supported runners
3. Required secrets and variables
4. Inputs table with defaults
5. Outputs table
6. Minimal caller example
7. Monorepo example
8. Failure troubleshooting (no tests found, cache miss, browser download fail)
9. Ownership and support channel

Without that page, teams fork the YAML again and your shared steps die.

## Putting ci composite action shared steps into a QA platform mindset

Composite actions are productized CI. They need versioning, owners, smoke tests, docs, and careful input design. Used well, they make every repo's e2e job look familiar: checkout, shared action, artifacts. Used poorly, they hide working-directory bugs and secret requirements behind a single green checkbox labeled "uses: magic."

Standardize the boring middle of the pipeline. Keep product-specific selection, matrices, and deploy gates in the caller. Connect concurrency cancellation and diff-based selection so shared steps run often enough to stay healthy, not so often they waste minutes. That balance is the operational heart of ci composite action shared steps for test automation teams.

## Frequently Asked Questions

### Can a composite action define multiple jobs or a matrix?

No. A composite action only contributes steps to the job that calls it. Matrices, services, and job-level permissions stay in the caller workflow or in a reusable workflow (\`workflow_call\`). If you need a standardized multi-job pipeline, write a reusable workflow that calls one or more composite actions inside its jobs. Trying to overload a composite action with pseudo-job logic usually produces brittle inputs and unclear logs.

### Why must every run step in a composite action set shell?

GitHub Actions requires composite action \`run\` steps to declare \`shell\` explicitly. Unlike some workflow defaults, you should not assume bash is applied automatically inside the composite context the way you might in a job with \`defaults.run.shell\`. Set \`shell: bash\` (or another supported shell) on each run step. Forgetting it fails at workflow validation or runtime and blocks adoption of the shared action.

### Should secrets be action inputs or environment variables?

Prefer environment variables for secret values. Inputs are convenient for non-secret configuration (node version, project name, working directory). Secrets passed as inputs can be easier to mishandle in logs or debugging dumps. Callers can supply \`env:\` on the step that uses the composite action, and steps inside the action inherit those environment variables. Document required env vars in the action README next to required secrets for the job.

### How do I version composite actions used across many repositories?

Publish them from a dedicated actions repository or from a monorepo path, and reference immutable versions: tags like \`v3\` that move only for compatible releases, or full commit SHAs for maximum pin. Avoid floating on \`main\`. Communicate breaking changes with a new major tag and a changelog. Inside a single application repo, path-based actions (\`./.github/actions/...\`) version with the application commit; protect them with CODEOWNERS so shared CI behavior cannot change silently on an unrelated feature PR.
`,
};
