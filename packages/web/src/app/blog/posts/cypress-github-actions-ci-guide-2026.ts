import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress on GitHub Actions: Complete CI Guide for 2026',
  description:
    'Run Cypress on GitHub Actions in 2026. cypress-io/github-action, caching, parallelization, sharding, Docker, artifacts, secrets, and CI best practices.',
  date: '2026-05-19',
  category: 'Guide',
  content: `
# Cypress on GitHub Actions: Complete CI Guide for 2026

GitHub Actions is the most common CI platform for Cypress suites in 2026. The official \`cypress-io/github-action\` does most of the heavy lifting: installs dependencies with caching, installs Cypress, starts the app server, runs tests, uploads artifacts, and reports back to the PR. But the surface area is wider than the README suggests. To get fast, reliable, debuggable Cypress runs on GitHub Actions, you need to understand caching strategy, parallelization, sharding, Docker images, retries, artifacts, and how to handle secrets.

This guide is the complete 2026 reference for running Cypress on GitHub Actions. We cover the official action, build caching, Cypress Cloud integration, self-managed sharding, Docker setup, parallel matrix builds, artifact uploads, conditional execution, secrets, scheduled runs, and the best practices distilled from running real Cypress suites at scale.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Minimal workflow

The simplest possible Cypress + GHA workflow:

\`\`\`yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: cypress-io/github-action@v6
        with:
          start: npm run dev
          wait-on: 'http://localhost:3000'
          browser: chrome
\`\`\`

The action installs dependencies, installs Cypress, starts the dev server, waits for it, runs the tests, and uploads videos and screenshots on failure.

## Caching strategy

Without caching, each run installs dependencies from scratch (60 to 120 seconds). With proper caching, that drops to 5 to 10 seconds.

\`cypress-io/github-action\` uses \`actions/cache\` under the hood. Override the cache key for explicit control:

\`\`\`yaml
- uses: cypress-io/github-action@v6
  with:
    cache-key: \${{ runner.os }}-cypress-\${{ hashFiles('**/package-lock.json') }}
\`\`\`

For maximum speed, install Cypress binaries separately:

\`\`\`yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/Cypress
    key: \${{ runner.os }}-cypress-\${{ hashFiles('**/package-lock.json') }}
- run: npm ci
- run: npx cypress install
\`\`\`

## Browser matrix

Run the same specs across Chrome, Firefox, and Edge:

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chrome, firefox, edge]
steps:
  - uses: cypress-io/github-action@v6
    with:
      browser: \${{ matrix.browser }}
      start: npm run dev
\`\`\`

\`fail-fast: false\` ensures all browsers run even if one fails.

## Parallelization with Cypress Cloud

For paid Cypress Cloud accounts, parallelization is automatic.

\`\`\`yaml
strategy:
  matrix:
    containers: [1, 2, 3, 4]
steps:
  - uses: cypress-io/github-action@v6
    with:
      record: true
      parallel: true
      group: 'CI on Chrome'
      start: npm run dev
    env:
      CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
      GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

Each container picks up the next available spec; Cloud distributes work by past timing.

## Self-managed sharding

Without Cloud, use \`cypress-split\` or similar to shard specs across runners.

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - uses: cypress-io/github-action@v6
    with:
      start: npm run dev
      command: npx cypress run --env split=\${{ matrix.shard }},splitIndex=\${{ matrix.shard }}
\`\`\`

The \`cypress-split\` plugin reads the env vars and runs only the matching subset.

## Docker setup

For consistent environments across runners, use the official Cypress Docker images.

\`\`\`yaml
container:
  image: cypress/included:13.x
steps:
  - uses: actions/checkout@v4
  - run: npm ci
  - run: npx cypress run
\`\`\`

\`cypress/included\` ships Chrome, Firefox, Edge, and Cypress pre-installed. No setup-node, no install step. The trade-off is image pull time on first run.

## Artifacts

Upload videos, screenshots, and reports for debugging failed runs:

\`\`\`yaml
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: cypress-screenshots
    path: cypress/screenshots
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: cypress-videos
    path: cypress/videos
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: cypress-report
    path: cypress/reports
\`\`\`

The artifacts appear in the GitHub Actions UI for the run.

## Secrets

Store secrets in GitHub Actions secrets, not in the repo. Access via \`\${{ secrets.NAME }}\`.

\`\`\`yaml
env:
  CYPRESS_TEST_USER_EMAIL: \${{ secrets.TEST_USER_EMAIL }}
  CYPRESS_TEST_USER_PASSWORD: \${{ secrets.TEST_USER_PASSWORD }}
  CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
\`\`\`

Inside Cypress, read with \`Cypress.env('TEST_USER_EMAIL')\`.

## Conditional execution

Run Cypress only when relevant files change:

\`\`\`yaml
on:
  push:
    paths:
      - 'src/**'
      - 'cypress/**'
      - 'package*.json'
\`\`\`

Or use \`paths-ignore\` for the inverse.

## Scheduled smoke tests

Run a subset of tests on a schedule to catch environment-specific failures:

\`\`\`yaml
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cypress-io/github-action@v6
        with:
          spec: cypress/e2e/smoke/**/*.cy.ts
          config-file: cypress/config/production.json
\`\`\`

## Conditional artifact retention

For PR-triggered runs, retain artifacts for a shorter period to save storage:

\`\`\`yaml
- uses: actions/upload-artifact@v4
  with:
    name: cypress-screenshots
    path: cypress/screenshots
    retention-days: \${{ github.event_name == 'pull_request' && 7 || 90 }}
\`\`\`

## Status badges

Add a status badge to your README:

\`\`\`markdown
![Cypress](https://github.com/your-org/your-repo/actions/workflows/cypress.yml/badge.svg)
\`\`\`

## Slow test reporting

Combine with \`mochawesome\` or \`junit\` reporters for richer CI integration:

\`\`\`typescript
// cypress.config.ts
export default defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: true,
    json: true,
  },
});
\`\`\`

Then upload the report directory as an artifact.

## Speed optimizations

| Optimization | Speedup |
|---|---|
| \`npm ci\` cache | 50-90s saved per run |
| Cypress binary cache | 30-60s saved per run |
| Skip \`cypress install\` when cached | 10-20s saved |
| Parallel matrix | linear by worker count |
| Cypress Cloud auto-sharding | optimal by timing data |
| Smaller specs (fewer steps) | each saves seconds |
| Programmatic login (cy.session) | 2-5s saved per test |
| API-driven seed data | seconds per test |
| \`--quiet\` reporter | reduces stdout overhead |

## Best practices

1. **Cache aggressively.** \`actions/cache\` for node_modules and Cypress binary.
2. **Fail-fast off.** \`fail-fast: false\` so one bad browser does not cancel the rest.
3. **Upload artifacts on failure.** Screenshots and videos for debugging.
4. **Use the official action.** \`cypress-io/github-action\` handles caching, install, server start, and waiting.
5. **Secrets via GitHub Secrets.** Never inline.
6. **Conditional runs.** \`paths\` filter saves CI minutes on doc-only PRs.
7. **Parallelize.** Either Cypress Cloud or self-managed sharding.
8. **Pin action versions.** \`@v6\` not \`@main\`; reproducible builds.
9. **Set timeouts.** \`timeout-minutes\` on each job.
10. **Report flake.** Track flake rate via Cypress Cloud or custom reporting.

## Gotchas

1. **\`wait-on\` does not always work.** Sometimes the server is up but not ready; add a healthcheck endpoint.
2. **\`actions/checkout@v4\` does shallow clones.** Some plugins need full history; set \`fetch-depth: 0\`.
3. **\`runs-on: ubuntu-latest\` changes over time.** Pin to specific versions for stability.
4. **Cypress binary cache is per-runner-os.** Linux and macOS caches do not share.
5. **\`cypress install\` requires writable home.** Default works; custom runners may not.
6. **Headless mode is the default in CI.** Use \`--headed\` only for debugging locally.
7. **Browser versions update.** Pin via Docker if you need exact reproducibility.
8. **\`record\` requires \`group\`.** Without it, Cloud cannot distinguish runs.
9. **Cypress Cloud has free-tier limits.** Plan ahead.
10. **PR comments from forks have limited token permissions.** Adjust the workflow accordingly.

## Workflow templates

### Single browser, parallel via Cloud

\`\`\`yaml
strategy:
  matrix:
    containers: [1, 2, 3, 4]
steps:
  - uses: cypress-io/github-action@v6
    with:
      record: true
      parallel: true
      group: 'PR Chrome'
      start: npm run dev
\`\`\`

### Multi-browser, single container

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    browser: [chrome, firefox]
steps:
  - uses: cypress-io/github-action@v6
    with:
      browser: \${{ matrix.browser }}
      start: npm run dev
\`\`\`

### Component testing

\`\`\`yaml
steps:
  - uses: cypress-io/github-action@v6
    with:
      component: true
\`\`\`

## Conclusion and next steps

GitHub Actions plus Cypress is the most ergonomic CI setup for browser testing in 2026. The official action handles 80% of what you need, and the remaining 20%, caching, parallelization, artifacts, secrets, scheduled smoke runs, has well-documented patterns. A well-configured pipeline runs your full Cypress suite on every PR in under 5 minutes with proper parallelism.

Start with the minimal workflow. Add caching. Layer in matrix builds, artifact uploads, secrets, and either Cloud or self-managed parallelization. Review quarterly to keep pace with Cypress and GitHub Actions improvements.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for sessions, config, and Cloud guides.
`,
};
