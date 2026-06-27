import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "CircleCI Test Automation: Parallelism, Orbs & Caching (2026)",
  description: "CircleCI test automation guide for 2026 — split tests across parallel containers, reuse orbs, cache dependencies, and gate merges on store_test_results.",
  date: "2026-06-26",
  category: "CI/CD",
  content: `# CircleCI Test Automation: Parallelism, Orbs & Caching (2026)

CircleCI test automation means running your test suite inside CircleCI's \`config.yml\` pipeline so every push gets verified before merge — and doing it fast. The three levers that matter are **parallelism** (split tests across N containers with \`circleci tests split\`), **orbs** (reusable config packages that wire up Node, Python, or browsers in one line), and **caching** (\`save_cache\` / \`restore_cache\` so you do not reinstall dependencies on every run). This guide shows the exact \`config.yml\` keys, the timing-based test split that actually balances your containers, and the \`store_test_results\` step that turns raw output into the per-test data CircleCI needs to split intelligently. Every key is verified against CircleCI's 2.1 configuration.

One framing note up front: CircleCI's config has been on schema **\`version: 2.1\`** for years, which unlocks orbs, reusable commands, and parameters. If you see a \`version: 2\` config without orbs, it is the older syntax — everything below assumes 2.1, which is what new projects should use.

## The Minimal Test Pipeline

A CircleCI pipeline is a set of **jobs** composed into **workflows**. Each job runs in an executor (a Docker image, a Linux/Windows VM, or macOS) and is a list of **steps**. Here is the smallest config that checks out code, installs dependencies, and runs tests:

\`\`\`yaml
# .circleci/config.yml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - run: npm ci
      - run: npm test

workflows:
  build-and-test:
    jobs:
      - test
\`\`\`

A few things are doing real work here. \`checkout\` is a built-in step that clones your repo. \`cimg/node:20.11\` is one of CircleCI's **convenience images** (the \`cimg/\` namespace) — they come pre-loaded with the language runtime plus common build tools, so you skip a lot of \`apt-get\`. \`npm ci\` (not \`npm install\`) installs exactly what the lockfile pins, which is the correct choice in CI for reproducibility.

This works, but it is slow and naive: it reinstalls \`node_modules\` from scratch every run and runs the entire suite in one container. The next three sections fix that.

## Parallelism: Splitting Tests Across Containers

The single biggest speedup for a large suite is **parallelism** — CircleCI spins up N identical copies of the job, and you divide the test files among them. You opt in with one key:

\`\`\`yaml
jobs:
  test:
    docker:
      - image: cimg/node:20.11
    parallelism: 4 # run this job across 4 containers
    steps:
      - checkout
      - run: npm ci
      - run: npx jest $(circleci tests glob "tests/**/*.test.js" | circleci tests split)
\`\`\`

Setting \`parallelism: 4\` alone does nothing useful — all four containers would run the *same* tests. The work happens in \`circleci tests split\`, the CLI command that reads the full list of test files on stdin and prints back only the subset this container should run. Inside each container, the environment variables \`CIRCLE_NODE_TOTAL\` (here \`4\`) and \`CIRCLE_NODE_INDEX\` (\`0\`–\`3\`) tell \`tests split\` which slice to emit. \`circleci tests glob\` is a helper that expands a glob into the file list to feed it.

### Split by Timing, Not by Name

The default split divides files by name, which is nearly worthless — one container can land all your slow integration files while another gets fast unit files, and your pipeline is only as quick as the slowest container. The fix is \`--split-by=timings\`, which uses **historical timing data** to balance containers so each finishes at roughly the same wall-clock time:

\`\`\`bash
# Balance the split using past run timings
circleci tests glob "tests/**/*.test.js" | circleci tests split --split-by=timings
\`\`\`

| Split strategy | Flag | When to use |
|---|---|---|
| By file name | (default) | Quick start, suites with uniform test durations |
| By file size | \`--split-by=filesize\` | Heuristic when no timing data exists yet |
| By timing | \`--split-by=timings\` | Production default — needs \`store_test_results\` |

Timing-based splitting only works if CircleCI *has* timing data, and it gets that from the \`store_test_results\` step (next section). The first run with no history falls back to an even file split, then every subsequent run gets smarter. This is the same balance-by-history idea behind sharding in other runners; if you are coming from Playwright, the [GitHub Actions CI/CD testing guide](/blog/github-actions-testing-ci-cd-guide) covers the matrix-sharding equivalent.

## Storing Test Results: The Key That Unlocks Everything

\`store_test_results\` ingests a directory of **JUnit XML** reports. It does two things: it powers the timing-based split above, and it surfaces individual test failures in the CircleCI UI (the "Tests" tab) instead of forcing you to scroll raw logs. Almost every test runner can emit JUnit XML.

\`\`\`yaml
steps:
  - checkout
  - run: npm ci
  - run:
      name: Run tests with JUnit output
      command: |
        npx jest \\
          --ci \\
          --reporters=default \\
          --reporters=jest-junit \\
          $(circleci tests glob "tests/**/*.test.js" | circleci tests split --split-by=timings)
      environment:
        JEST_JUNIT_OUTPUT_DIR: ./test-results
  - store_test_results:
      path: ./test-results
  - store_artifacts:
      path: ./test-results
\`\`\`

The path you give \`store_test_results\` must be a **directory** containing the XML files, not a single file. \`store_artifacts\` is a separate, complementary step: it uploads files (reports, screenshots, coverage HTML) for download from the build page, but it does *not* feed timing data — only \`store_test_results\` does. A common mistake is storing JUnit XML as an artifact and wondering why \`--split-by=timings\` never improves; the report must go through \`store_test_results\`.

Here is how the major runners produce the JUnit XML that this step consumes:

| Runner | How to emit JUnit XML |
|---|---|
| Jest | \`jest-junit\` reporter + \`JEST_JUNIT_OUTPUT_DIR\` |
| pytest | \`pytest --junitxml=test-results/results.xml\` |
| Playwright | \`reporter: [['junit', { outputFile: 'results.xml' }]]\` |
| PHPUnit | \`phpunit --log-junit test-results/results.xml\` |

## Orbs: Reusable Config Packages

An **orb** is a shareable package of jobs, commands, and executors published to the CircleCI registry. Instead of hand-writing the Node-install-and-cache dance, you import the official \`circleci/node\` orb and call its commands. Orbs are how you stop copy-pasting boilerplate between repos.

\`\`\`yaml
version: 2.1

orbs:
  node: circleci/node@5.2.0 # pin the version

jobs:
  test:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - node/install-packages:
          cache-path: ~/project/node_modules
      - run: npm test

workflows:
  build-and-test:
    jobs:
      - test
\`\`\`

\`node/install-packages\` is a command the orb exposes — it runs \`npm ci\` *and* manages dependency caching for you with a lockfile-aware cache key, replacing the manual \`save_cache\`/\`restore_cache\` block in the next section. **Always pin the orb version** (\`@5.2.0\`), not a floating major, so a new orb release never silently changes your pipeline's behavior.

A few orbs worth knowing:

- **\`circleci/node\`** — install + cache for npm, yarn, pnpm.
- **\`circleci/python\`** — pip/poetry/pipenv install with caching.
- **\`circleci/browser-tools\`** — installs Chrome, Chromedriver, Firefox for browser tests.

The \`browser-tools\` orb is the fast path for end-to-end suites. It provides \`browser-tools/install-chrome\` and \`browser-tools/install-chromedriver\`, which pull matched browser/driver versions so Selenium or WebDriver tests do not break on a version mismatch:

\`\`\`yaml
orbs:
  browser-tools: circleci/browser-tools@1.4.8

jobs:
  e2e:
    docker:
      - image: cimg/node:20.11-browsers # the -browsers variant
    steps:
      - browser-tools/install-chrome
      - browser-tools/install-chromedriver
      - checkout
      - run: npm ci
      - run: npm run test:e2e
\`\`\`

Note the \`-browsers\` image variant — the \`cimg/*-browsers\` tags include the shared libraries a real browser needs. Pairing the variant with the orb is the reliable combination for headed/headless browser testing.

## Caching: Stop Reinstalling Dependencies

Caching saves a directory after one run and restores it on the next, keyed by a hash of your lockfile. Done right, it cuts a minute or more off every build. If you use the \`node\` or \`python\` orb's install command you get this automatically — but understanding the raw mechanism matters for custom toolchains.

\`\`\`yaml
steps:
  - checkout
  - restore_cache:
      keys:
        - v1-deps-{{ checksum "package-lock.json" }}
        - v1-deps- # fallback to the newest partial match
  - run: npm ci
  - save_cache:
      key: v1-deps-{{ checksum "package-lock.json" }}
      paths:
        - ~/.npm
\`\`\`

The mechanics that trip people up:

- **Cache keys are immutable.** Once \`v1-deps-<hash>\` is written, CircleCI will never overwrite it. When the lockfile changes, the \`{{ checksum }}\` produces a new key and a fresh cache is saved. To force a clean cache without changing the lockfile, bump the \`v1-\` prefix to \`v2-\`.
- **\`restore_cache\` tries keys in order** and uses the first hit. The partial-prefix fallback (\`v1-deps-\`) restores the most recent cache when the exact lockfile hash misses — a near-complete cache still beats reinstalling everything.
- **Cache the package manager's store, not always \`node_modules\`.** Caching \`~/.npm\` (npm's download cache) plus running \`npm ci\` is robust; caching \`node_modules\` directly is faster but riskier across image changes.

| Concept | Key / Step | Lifetime |
|---|---|---|
| Dependency cache | \`save_cache\` / \`restore_cache\` | Persists across pipelines, keyed by content |
| Workspace | \`persist_to_workspace\` / \`attach_workspace\` | One workflow run — passes files between jobs |
| Artifact | \`store_artifacts\` | Stored per-build for download/inspection |

Do not confuse caching with **workspaces**. A cache survives across pipeline runs and is keyed by a checksum (good for dependencies). A workspace lives only within a single workflow and moves files *between jobs in that run* — for example, a \`build\` job compiles assets, \`persist_to_workspace\` saves them, and a downstream \`test\` job calls \`attach_workspace\` to reuse them without rebuilding.

## A Full Workflow: Lint, Test, Deploy

Putting the pieces together, here is a realistic workflow with fan-out parallel testing, job dependencies, and a deploy gated on tests passing:

\`\`\`yaml
version: 2.1

orbs:
  node: circleci/node@5.2.0

jobs:
  lint:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - node/install-packages
      - run: npm run lint

  test:
    docker:
      - image: cimg/node:20.11
    parallelism: 4
    steps:
      - checkout
      - node/install-packages
      - run:
          command: |
            npx jest --ci --reporters=default --reporters=jest-junit \\
              $(circleci tests glob "tests/**/*.test.js" | circleci tests split --split-by=timings)
          environment:
            JEST_JUNIT_OUTPUT_DIR: ./test-results
      - store_test_results:
          path: ./test-results

  deploy:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - run: ./scripts/deploy.sh

workflows:
  ci:
    jobs:
      - lint
      - test
      - deploy:
          requires:
            - lint
            - test
          filters:
            branches:
              only: main
\`\`\`

The \`requires\` key makes \`deploy\` wait for both \`lint\` and \`test\`, so a broken test blocks the release. The \`filters\` block restricts \`deploy\` to the \`main\` branch — feature branches run lint and test but never deploy. This \`requires\` + \`filters\` pattern is the backbone of safe CI: parallel where independent, sequential where there is a real dependency, deploy only from trusted branches.

### Resource Classes for Heavier Jobs

When a job is CPU- or memory-bound (think a large compile or a browser farm), bump its \`resource_class\` to allocate more CPU and RAM to that container:

\`\`\`yaml
jobs:
  test:
    docker:
      - image: cimg/node:20.11
    resource_class: large # more vCPU + RAM than the default medium
    parallelism: 4
\`\`\`

Resource classes range from \`small\` up through \`xlarge\` and beyond (availability depends on your plan and executor). Combining a larger \`resource_class\` with \`parallelism\` multiplies cost, so size it deliberately — a flaky out-of-memory failure is worth \`large\`, but throwing \`xlarge\` at fast unit tests just burns credits. If flakiness rather than resources is your problem, the [guide to fixing flaky tests](/blog/fix-flaky-tests-guide) tackles the root causes before you pay for bigger machines.

## Dynamic Config and Path Filtering

CircleCI can generate config at runtime via **dynamic configuration** (\`setup: true\`), and it can run jobs only when relevant paths change via the \`path-filtering\` orb. In a monorepo this means a change to the docs folder does not trigger the whole backend test suite:

\`\`\`yaml
version: 2.1
setup: true # this is a setup pipeline

orbs:
  path-filtering: circleci/path-filtering@1.0.0

workflows:
  setup:
    jobs:
      - path-filtering/filter:
          mapping: |
            backend/.* run-backend-tests true
            frontend/.* run-frontend-tests true
          base-revision: main
          config-path: .circleci/continue-config.yml
\`\`\`

The setup pipeline runs first, decides which path-based parameters are true, and then triggers a \`continue-config.yml\` with only the relevant jobs. This is the idiomatic CircleCI answer to "don't run everything on every commit" — it keeps a large monorepo's CI bill and queue times sane.

## Migration and Tool Choice

If you are weighing CircleCI against other runners, the trade-offs are concrete: GitHub Actions is free and native for public GitHub repos but leans on community actions; Jenkins is self-hosted and infinitely flexible at the cost of maintaining it yourself. CircleCI sits in between — managed, with first-class test splitting and a strong orb ecosystem. The side-by-side breakdowns in [CircleCI vs GitLab CI](/compare/circleci-vs-gitlab-ci) and [Jenkins vs CircleCI](/compare/jenkins-vs-circleci) lay out the pricing, hosting model, and config-language differences in detail.

Whichever runner you land on, the testing discipline is the same: produce JUnit XML, split slow suites across containers, cache dependencies aggressively, and gate merges on results. CircleCI just gives you \`circleci tests split --split-by=timings\` and the orb registry to do it with less YAML. Browse the [QA skills directory](/skills) for ready-made CircleCI, parallel-testing, and CI/CD skills you can drop straight into an AI coding agent's workflow.

## Frequently Asked Questions

### How does parallelism actually split my tests in CircleCI?

You set \`parallelism: N\` on the job, then run your tests through \`circleci tests split\`, which reads the full file list on stdin and prints only the subset for the current container. CircleCI injects \`CIRCLE_NODE_TOTAL\` and \`CIRCLE_NODE_INDEX\` into each container so the split command knows which slice to emit. Without the \`tests split\` command, all N containers run the identical full suite and you gain nothing.

### Why is my CircleCI cache not being used between builds?

The most common cause is a cache key that changes every run, or a lockfile checksum that never matches because the file path is wrong. Remember that cache keys are immutable — once written for a given checksum they are never overwritten, so a fresh cache only appears when the lockfile (and thus the \`{{ checksum }}\`) changes. Add a partial-prefix fallback key like \`v1-deps-\` so a near-match still restores instead of reinstalling from scratch.

### What is the difference between store_test_results and store_artifacts?

\`store_test_results\` ingests JUnit XML and uses it for two things: surfacing per-test results in the UI and powering timing-based parallel splitting. \`store_artifacts\` just uploads arbitrary files (reports, screenshots, coverage) for download from the build page and does not affect test splitting at all. If you want \`--split-by=timings\` to work, the JUnit report must go through \`store_test_results\`, not \`store_artifacts\`.

### Do I have to pin orb versions in CircleCI?

Yes, you should always pin to an exact version like \`circleci/node@5.2.0\` rather than a floating major. Orbs are remote code that runs in your pipeline, so an unpinned reference can pull a new release that silently changes install behavior, cache keys, or step names and breaks builds with no commit on your side. Pinning makes upgrades a deliberate, reviewable change.

### How do I run browser tests like Selenium or Playwright on CircleCI?

Use a \`cimg/*-browsers\` image variant (which bundles the shared libraries a real browser needs) together with the \`circleci/browser-tools\` orb. Call \`browser-tools/install-chrome\` and \`browser-tools/install-chromedriver\` to get a matched browser and driver, avoiding the version-mismatch errors that plague WebDriver in CI. Then run your e2e command as a normal step after \`checkout\` and dependency install.

### Can I avoid running every job on every commit in a monorepo?

Yes — use dynamic configuration with \`setup: true\` plus the \`circleci/path-filtering\` orb. The setup pipeline maps changed file paths to boolean parameters and only continues into the jobs that match, so a docs-only change does not trigger the full backend suite. This keeps queue times and credit usage down on large repositories where most commits touch a small slice of the tree.
`,
};
