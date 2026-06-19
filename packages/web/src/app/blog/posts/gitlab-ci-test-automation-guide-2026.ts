import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "GitLab CI Test Automation Guide: Pipelines & Caching (2026)",
  description: "Master GitLab CI for test automation: stages, jobs, caching, parallel matrix jobs, artifacts, and JUnit reports to run fast, reliable test pipelines in 2026.",
  date: "2026-06-15",
  category: "CI/CD",
  content: `# GitLab CI Test Automation Guide: Pipelines & Caching (2026)

GitLab CI runs your test automation from a single file, \`.gitlab-ci.yml\`, at the root of your repository. You define **stages** (ordered phases like build → test → deploy), **jobs** (units of work that run scripts inside a Docker image on a runner), and the dependencies between them. GitLab reads the file on every push, builds a **pipeline**, and runs the jobs — caching dependencies so installs are fast, running jobs in **parallel** to cut wall-clock time, and collecting **artifacts** and JUnit reports so results show up directly in the merge request. The result is an automated gate where failing tests block the merge.

This guide covers the pipeline anatomy, a real test job, dependency caching, parallel and matrix jobs, artifacts and JUnit test reports, and the mistakes that quietly break pipelines.

## Pipeline anatomy: stages, jobs, runners

A pipeline is a collection of jobs grouped into stages. Jobs in the same stage run in parallel; stages run sequentially. If any job in a stage fails, later stages do not start (by default). A **runner** is the agent that executes a job — GitLab.com provides shared runners, or you self-host your own.

Here is the smallest useful test pipeline:

\`\`\`yaml
# .gitlab-ci.yml
stages:
  - build
  - test

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build

unit-tests:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test
\`\`\`

The \`image\` keyword picks the Docker image the job runs in. \`script\` is the list of shell commands. This works, but it reinstalls dependencies in every job — the first thing to fix.

## Caching dependencies for speed

Without caching, every job does a fresh \`npm ci\` (or \`pip install\`, or \`bundle install\`), which dominates pipeline time. The \`cache\` keyword persists a directory between jobs and pipelines, keyed so it only restores when the lockfile is unchanged.

\`\`\`yaml
cache:
  key:
    files:
      - package-lock.json
  paths:
    - .npm/

unit-tests:
  stage: test
  image: node:20
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
\`\`\`

The \`key.files\` directive ties the cache to \`package-lock.json\`: when the lockfile changes, GitLab computes a new key and rebuilds the cache; otherwise it restores the existing one. Pointing npm's cache at \`.npm\` and adding \`--prefer-offline\` makes installs nearly instant on a cache hit.

The same pattern works for any ecosystem:

\`\`\`yaml
# Python
cache:
  key:
    files: [requirements.txt]
  paths: [.cache/pip]
# then: pip install --cache-dir .cache/pip -r requirements.txt

# Java / Gradle
cache:
  key:
    files: [build.gradle, gradle/wrapper/gradle-wrapper.properties]
  paths: [.gradle/caches, .gradle/wrapper]
\`\`\`

### cache vs artifacts — a critical distinction

These are easy to confuse but serve opposite purposes:

| | \`cache\` | \`artifacts\` |
|---|---|---|
| Purpose | Speed up jobs (deps, build cache) | Pass outputs between stages / download |
| Lifetime | Best-effort, can be evicted | Reliable, retained by \`expire_in\` |
| Direction | Restored at job start, saved at end | Produced by a job, consumed by later jobs |
| Use for | \`node_modules\`, \`.npm\`, \`.gradle\` | Test reports, coverage, build bundles |

Rule of thumb: cache is an optimization you can lose without breaking correctness; artifacts are data later jobs depend on.

## A real test job with services

Integration tests often need a database or other backing service. The \`services\` keyword spins up additional containers networked to your job:

\`\`\`yaml
integration-tests:
  stage: test
  image: node:20
  services:
    - name: postgres:16
      alias: db
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: 'postgresql://test:test@db:5432/test'
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run migrate
    - npm run test:integration
\`\`\`

The service is reachable at its \`alias\` hostname (\`db\`) over the job's network. \`variables\` configures both the service container and your app. This is how you run tests against a real database without mocking the data layer — related patterns live in our [QA skills directory](/skills).

## Parallel jobs: cutting wall-clock time

GitLab has two ways to parallelize. The simplest is \`parallel: N\`, which clones a job into N instances. Combined with a test runner that shards by \`CI_NODE_INDEX\` / \`CI_NODE_TOTAL\`, you split a slow suite across runners:

\`\`\`yaml
e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.50.0-noble
  parallel: 4
  script:
    - npm ci --cache .npm --prefer-offline
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
\`\`\`

GitLab injects \`CI_NODE_INDEX\` (1..N) and \`CI_NODE_TOTAL\` (N) into each instance. Playwright, Jest (\`--shard\`), pytest (\`pytest-split\`), and most modern runners understand sharding, so four parallel jobs finish in roughly a quarter of the time.

### Matrix jobs: testing combinations

\`parallel: matrix\` runs a job once per combination of variable values — ideal for cross-version or cross-browser testing:

\`\`\`yaml
unit-tests:
  stage: test
  image: node:$NODE_VERSION
  parallel:
    matrix:
      - NODE_VERSION: ['18', '20', '22']
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
\`\`\`

This generates three jobs — Node 18, 20, and 22 — each in its own container. Add a second dimension and GitLab runs the Cartesian product:

\`\`\`yaml
parallel:
  matrix:
    - NODE_VERSION: ['20', '22']
      DB: ['postgres:16', 'mysql:8']
\`\`\`

That is four jobs (2 × 2). Matrix jobs are the GitLab equivalent of a build matrix and keep your \`.gitlab-ci.yml\` compact while expanding coverage. For how this compares to other CI platforms' matrix support, see our [CI/CD comparisons](/compare).

## Artifacts and JUnit test reports

To see test results inside the merge request — not buried in job logs — emit a JUnit XML report and declare it under \`artifacts.reports.junit\`:

\`\`\`yaml
unit-tests:
  stage: test
  image: node:20
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test -- --reporters=default --reporters=jest-junit
  artifacts:
    when: always
    reports:
      junit: junit.xml
    paths:
      - coverage/
    expire_in: 1 week
\`\`\`

Key points:

- \`when: always\` keeps artifacts even when the job fails — exactly when you need the report.
- \`reports.junit\` makes GitLab parse the XML and render a **Tests** tab on the merge request, with new failures highlighted.
- \`paths\` retains arbitrary files (coverage HTML, screenshots) for download.
- \`expire_in\` controls retention so storage does not grow unbounded.

Most runners produce JUnit XML: Jest via \`jest-junit\`, pytest via \`--junitxml=report.xml\`, Playwright via the \`junit\` reporter, Go via \`gotestsum --junitfile\`, JUnit/Gradle natively. Point \`reports.junit\` at whatever your tool emits.

### Coverage reports

GitLab can also parse coverage. Extract a coverage percentage with \`coverage\` (a regex over job output) and surface line-by-line coverage in diffs with the Cobertura/coverage report format:

\`\`\`yaml
unit-tests:
  # ...
  coverage: '/Lines\\s*:\\s*(\\d+\\.\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
\`\`\`

The \`coverage\` regex pulls the number into the MR widget; the \`coverage_report\` shows which changed lines are covered.

## Controlling when jobs run with rules

\`rules\` decide whether a job is created for a given pipeline. This is how you run the full suite on merge requests but only smoke tests on feature branches, or skip jobs when irrelevant files change:

\`\`\`yaml
e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.50.0-noble
  rules:
    # Run on merge requests
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    # Run on the default branch
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
  script:
    - npm ci --cache .npm --prefer-offline
    - npx playwright test
\`\`\`

You can also scope by changed paths so a job only runs when relevant files change:

\`\`\`yaml
rules:
  - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    changes:
      - 'src/**/*'
      - 'tests/**/*'
\`\`\`

\`rules\` replaced the older \`only\`/\`except\` keywords; prefer \`rules\` in new pipelines for its richer conditions.

## The needs keyword: DAG pipelines

By default a job waits for its entire previous stage. \`needs\` lets a job start as soon as its specific dependencies finish, turning the pipeline into a directed acyclic graph (DAG) and shaving idle time:

\`\`\`yaml
unit-tests:
  stage: test
  needs: ['build']
  script: [npm test]

lint:
  stage: test
  needs: [] # starts immediately, no dependencies
  script: [npm run lint]
\`\`\`

\`needs: []\` lets \`lint\` run from the very start instead of waiting for \`build\`. On large pipelines, \`needs\` is one of the biggest wall-clock wins.

## A complete example pipeline

Putting it together — cache, parallel e2e, matrix unit tests, services, JUnit reports, and rules:

\`\`\`yaml
stages:
  - build
  - test

default:
  image: node:20
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]
  before_script:
    - npm ci --cache .npm --prefer-offline

build:
  stage: build
  script: [npm run build]

lint:
  stage: test
  needs: []
  script: [npm run lint]

unit-tests:
  stage: test
  needs: ['build']
  parallel:
    matrix:
      - NODE_VERSION: ['20', '22']
  image: node:$NODE_VERSION
  script:
    - npm test -- --reporters=default --reporters=jest-junit
  coverage: '/Lines\\s*:\\s*(\\d+\\.\\d+)%/'
  artifacts:
    when: always
    reports:
      junit: junit.xml
    expire_in: 1 week

e2e-tests:
  stage: test
  needs: ['build']
  image: mcr.microsoft.com/playwright:v1.50.0-noble
  parallel: 4
  services:
    - name: postgres:16
      alias: db
  variables:
    DATABASE_URL: 'postgresql://test:test@db:5432/test'
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
  script:
    - npm run migrate
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    reports:
      junit: results/junit.xml
    paths: [results/]
    expire_in: 1 week
\`\`\`

The \`default\` block applies \`image\`, \`cache\`, and \`before_script\` to every job, so each job only specifies what is different. More end-to-end pipeline patterns are on the [QASkills blog](/blog).

## Common errors and troubleshooting

**Cache never hits.** Usually the \`key\` is wrong. If you use a static \`key\` it is shared across all branches and may collide; if you use \`key.files\` but the listed file path is wrong, every pipeline rebuilds. Confirm the cached \`paths\` actually contain what you install (npm caches to \`~/.npm\` by default — redirect it with \`--cache .npm\`).

**Artifacts not appearing in the MR test tab.** You produced JUnit XML but declared it under \`artifacts.paths\` instead of \`artifacts.reports.junit\`. Only \`reports.junit\` is parsed into the Tests tab; \`paths\` just makes files downloadable. Also add \`when: always\` or failed runs drop the report.

**Service container unreachable.** Services are reached by their \`alias\` (or image name) over the job network, not \`localhost\`. Connecting to \`localhost:5432\` fails; use the alias hostname (\`db:5432\`). Also ensure the service had time to start — some images need a readiness check or a short wait.

**Parallel shards run the same tests.** Your test runner is not consuming \`CI_NODE_INDEX\`/\`CI_NODE_TOTAL\`. \`parallel: N\` only clones the job — the runner must shard. Pass the shard flag (\`--shard=$CI_NODE_INDEX/$CI_NODE_TOTAL\` for Playwright, \`--shard\` for Jest, \`pytest-split\` for pytest).

**Job runs when it should not (or vice versa).** Mixing \`rules\` with the legacy \`only\`/\`except\` in the same job is not allowed and behaves unpredictably. Use \`rules\` exclusively. Remember \`rules\` are evaluated top to bottom and the first match wins.

**Pipeline does not start at all.** A YAML syntax error or invalid keyword. Use GitLab's CI Lint tool (CI/CD → Editor → Validate) to catch errors before pushing — it validates \`.gitlab-ci.yml\` against the schema and shows the merged configuration.

## Recommended practices

Pin your \`image\` tags (never bare \`node\`), key caches to lockfiles, use \`needs: []\` to start independent jobs early, shard slow suites with \`parallel\` + a sharding runner, always emit JUnit via \`reports.junit\` with \`when: always\`, and gate expensive jobs behind \`rules\`. For comparisons of GitLab CI against other platforms and a catalog of CI-ready testing tools, see [our comparisons](/compare) and the [skills directory](/skills).

## Frequently Asked Questions

### What is the difference between cache and artifacts in GitLab CI?

Cache speeds up jobs by persisting dependency directories (like \`node_modules\` or \`.npm\`) between runs; it is best-effort and can be evicted without breaking your pipeline. Artifacts pass real outputs — test reports, coverage, build bundles — from one job to later jobs or to download, and are reliably retained according to \`expire_in\`. Use cache for things you can safely regenerate, and artifacts for data later stages actually depend on.

### How do I run tests in parallel in GitLab CI?

Add \`parallel: N\` to a job to clone it into N instances, then have your test runner shard work using the injected \`CI_NODE_INDEX\` and \`CI_NODE_TOTAL\` variables — for example \`npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL\`. For testing combinations like multiple language versions or databases, use \`parallel: matrix\`, which generates one job per combination of variable values.

### How do I show test results in the GitLab merge request?

Have your test runner emit a JUnit XML report and declare it under \`artifacts.reports.junit\` in the job, for example \`reports: { junit: junit.xml }\`. GitLab parses the XML and renders a Tests tab on the merge request, highlighting new failures. Add \`when: always\` so the report is kept even when the job fails, which is exactly when you need it.

### Why does my GitLab CI cache never hit?

The most common cause is a \`key\` that does not match between runs, or a \`paths\` entry that does not actually contain the installed files. Tie the cache to your lockfile with \`key.files: [package-lock.json]\` so it only rebuilds when dependencies change, and make sure your install command writes to the cached directory — for npm, redirect with \`npm ci --cache .npm\` because npm caches to \`~/.npm\` by default.

### How do I make a job run only on merge requests?

Use the \`rules\` keyword with a condition on the pipeline source: \`rules: - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'\`. You can add more conditions, such as running on the default branch too, or scope by changed files with a \`changes\` clause so the job only runs when relevant paths are modified. Prefer \`rules\` over the legacy \`only\`/\`except\` keywords in new pipelines.

### What does the needs keyword do in GitLab CI?

\`needs\` lets a job start as soon as its specific listed dependencies complete, instead of waiting for the entire previous stage — turning the pipeline into a directed acyclic graph (DAG). Setting \`needs: []\` lets a job begin immediately at the start of the pipeline. On large pipelines this is one of the biggest wall-clock improvements because independent jobs no longer block each other.
`,
};
