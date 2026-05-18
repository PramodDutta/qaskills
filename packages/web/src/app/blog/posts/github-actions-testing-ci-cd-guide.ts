import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GitHub Actions for Test Automation: Complete CI/CD Pipeline Guide',
  description:
    'Build production-grade CI/CD pipelines for test automation with GitHub Actions. Covers workflow syntax, matrix testing, caching, parallel shards, artifact uploads, and reusable workflows for Playwright, Cypress, and Selenium.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
GitHub Actions has become the standard CI/CD platform for test automation in 2026. Its tight integration with GitHub repositories, generous free tier, and powerful workflow features make it the natural choice for running automated tests. This guide covers everything from basic workflow setup to advanced patterns like matrix strategies, parallel sharding, and reusable workflows.

## Table of Contents

1. Why GitHub Actions for Test Automation
2. Workflow Syntax Fundamentals
3. Setting Up Playwright in GitHub Actions
4. Setting Up Cypress in GitHub Actions
5. Setting Up Selenium in GitHub Actions
6. Matrix Strategy for Cross-Browser Testing
7. Caching Dependencies for Faster Pipelines
8. Parallel Test Sharding
9. Uploading Artifacts (Screenshots, Videos, Traces)
10. Secrets Management
11. Deployment Gates and Branch Protection
12. Reusable Workflows and Composite Actions
13. Advanced Patterns and Optimization
14. Monitoring and Debugging Workflows
15. Complete Production Pipeline Example

---

## 1. Why GitHub Actions for Test Automation

GitHub Actions offers several advantages over other CI/CD platforms for test automation:

**Native GitHub integration**: Triggers on pull requests, pushes, comments, and releases without any external configuration. Test results appear directly in the PR conversation.

**Matrix strategy**: Run the same tests across multiple operating systems, browsers, and Node versions simultaneously with a single configuration block.

**Generous free tier**: Public repositories get unlimited minutes. Private repositories get 2,000 minutes per month on the free plan, with additional minutes available on paid plans.

**Marketplace of actions**: Thousands of pre-built actions for common tasks like setting up Node.js, caching dependencies, uploading artifacts, and deploying to cloud providers.

**Self-hosted runners**: When the free runners are not enough, you can set up your own machines as runners for custom hardware requirements or cost optimization.

---

## 2. Workflow Syntax Fundamentals

Every GitHub Actions workflow lives in a YAML file under \`.github/workflows/\` in your repository. Here is the anatomy of a workflow file:

\`\`\`yaml
# .github/workflows/tests.yml
name: Test Automation Pipeline

# When should this workflow run?
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1-5'  # Weekdays at 6 AM UTC
  workflow_dispatch:  # Allow manual triggering

# Environment variables available to all jobs
env:
  NODE_VERSION: '20'
  CI: true

# The jobs to run
jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
\`\`\`

### Key Concepts

**Triggers (\`on\`)**: Define what events start the workflow. The most common for testing are \`push\`, \`pull_request\`, \`schedule\`, and \`workflow_dispatch\`.

**Jobs**: Independent units of work that run on separate virtual machines. Jobs run in parallel by default unless you specify dependencies with \`needs\`.

**Steps**: Sequential commands within a job. Each step is either a shell command (\`run\`) or a pre-built action (\`uses\`).

**Runners**: The virtual machines where jobs execute. GitHub provides \`ubuntu-latest\`, \`windows-latest\`, and \`macos-latest\`.

### Trigger Filtering

You can filter triggers to run only when specific files change:

\`\`\`yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
      - 'playwright.config.ts'
  pull_request:
    branches: [main]
    paths-ignore:
      - '*.md'
      - 'docs/**'
\`\`\`

This prevents test runs when only documentation changes, saving CI minutes and reducing noise.

---

## 3. Setting Up Playwright in GitHub Actions

Playwright is the most CI-friendly testing framework. Here is a production-ready workflow:

\`\`\`yaml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  playwright:
    name: Playwright Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test
        env:
          BASE_URL: https://staging.example.com

      - name: Upload HTML report
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload test results
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
          retention-days: 7
\`\`\`

**Key details:**
- \`npx playwright install --with-deps\` installs browsers and system dependencies
- \`if: \${{ !cancelled() }}\` ensures artifacts upload even when tests fail (critical for debugging)
- The \`cache: 'npm'\` option in setup-node caches the npm dependency cache
- \`timeout-minutes\` prevents runaway tests from consuming your CI minutes

---

## 4. Setting Up Cypress in GitHub Actions

Cypress provides an official GitHub Action that simplifies setup:

\`\`\`yaml
name: Cypress Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  cypress:
    name: Cypress Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          build: npm run build
          start: npm start
          wait-on: 'http://localhost:3000'
          wait-on-timeout: 120
          browser: chrome
          record: true
        env:
          CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-screenshots
          path: cypress/screenshots/

      - name: Upload videos
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: cypress-videos
          path: cypress/videos/
\`\`\`

The official Cypress action handles dependency installation, caching, and browser setup automatically. The \`wait-on\` option ensures the development server is ready before tests begin.

---

## 5. Setting Up Selenium in GitHub Actions

Selenium requires more manual setup because you need to manage browser drivers:

\`\`\`yaml
name: Selenium Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  selenium-java:
    name: Selenium Java Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: 'maven'

      - name: Install Chrome
        uses: browser-actions/setup-chrome@v1
        with:
          chrome-version: stable

      - name: Run Selenium tests
        run: mvn test -Dheadless=true

      - name: Upload test reports
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: surefire-reports
          path: target/surefire-reports/

  selenium-python:
    name: Selenium Python Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Install Chrome
        uses: browser-actions/setup-chrome@v1
        with:
          chrome-version: stable

      - name: Run tests
        run: pytest tests/ --headless --junitxml=results.xml

      - name: Upload test results
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: pytest-results
          path: results.xml
\`\`\`

---

## 6. Matrix Strategy for Cross-Browser Testing

The matrix strategy is one of the most powerful features of GitHub Actions. It lets you run the same test job across multiple configurations simultaneously.

### Basic Browser Matrix

\`\`\`yaml
jobs:
  test:
    name: Tests (\${{ matrix.browser }})
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps \${{ matrix.browser }}

      - name: Run tests
        run: npx playwright test --project=\${{ matrix.browser }}

      - name: Upload report
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: report-\${{ matrix.browser }}
          path: playwright-report/
\`\`\`

**Important**: Set \`fail-fast: false\` so that a failure in Chrome does not cancel Firefox and WebKit tests. You want to see the full picture of failures across all browsers.

### Multi-Dimensional Matrix

Combine multiple dimensions for comprehensive coverage:

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    browser: [chromium, firefox]
    node-version: [18, 20, 22]
    exclude:
      # WebKit on Linux has known issues with certain tests
      - os: ubuntu-latest
        browser: webkit
    include:
      # Add WebKit only on macOS
      - os: macos-latest
        browser: webkit
        node-version: 20
\`\`\`

Use \`exclude\` to remove specific combinations and \`include\` to add specific combinations that are not part of the standard matrix multiplication.

### Dynamic Matrix

For advanced use cases, generate the matrix dynamically:

\`\`\`yaml
jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      matrix: \${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: |
          echo "matrix={\\\"browser\\\":[\\\"chromium\\\",\\\"firefox\\\",\\\"webkit\\\"]}" >> "\$GITHUB_OUTPUT"

  test:
    needs: prepare
    strategy:
      matrix: \${{ fromJson(needs.prepare.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing \${{ matrix.browser }}"
\`\`\`

---

## 7. Caching Dependencies for Faster Pipelines

Caching is critical for reducing pipeline execution time. Without caching, every run downloads and installs all dependencies from scratch.

### npm Cache

\`\`\`yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
\`\`\`

This caches the npm global cache directory. Dependencies are restored on cache hit and only new or updated packages are downloaded.

### Playwright Browser Cache

Playwright browsers are large (hundreds of megabytes). Caching them saves significant time:

\`\`\`yaml
- name: Get Playwright version
  id: playwright-version
  run: echo "version=\$(npx playwright --version)" >> "\$GITHUB_OUTPUT"

- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-\${{ runner.os }}-\${{ steps.playwright-version.outputs.version }}

- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps

- name: Install system dependencies only
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: npx playwright install-deps
\`\`\`

When the cache hits, only the system dependencies (OS-level libraries) need to be installed, skipping the large browser downloads.

### Maven Cache

\`\`\`yaml
- uses: actions/setup-java@v4
  with:
    java-version: '17'
    distribution: 'temurin'
    cache: 'maven'
\`\`\`

### pip Cache

\`\`\`yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'
\`\`\`

### Cache Sizing Strategy

GitHub Actions provides 10 GB of cache per repository. Monitor your cache usage and set appropriate cache keys to avoid bloat. Use specific version numbers in cache keys so that version upgrades create new cache entries rather than using stale ones.

---

## 8. Parallel Test Sharding

For large test suites, running all tests in a single job is too slow. Sharding splits your tests across multiple parallel jobs.

### Playwright Sharding

Playwright has built-in sharding support:

\`\`\`yaml
jobs:
  test:
    name: Shard \${{ matrix.shard }}
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test --shard=\${{ matrix.shard }}

      - name: Upload blob report
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-\${{ strategy.job-index }}
          path: blob-report/
          retention-days: 1

  merge-reports:
    name: Merge Reports
    needs: test
    if: \${{ !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
\`\`\`

This runs 4 shards in parallel. Each shard uploads its results as a blob report. A final job merges all blob reports into a single HTML report.

### Cypress Parallel with Split

\`\`\`yaml
jobs:
  test:
    name: Tests (\${{ matrix.container }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        container: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - name: Run Cypress
        uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          record: true
          parallel: true
          group: 'CI Tests'
        env:
          CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
\`\`\`

Cypress parallelization requires the Cypress Dashboard service for intelligent test distribution.

### Determining the Right Number of Shards

**Rule of thumb**: Each shard should take 3-8 minutes. If your total test suite takes 20 minutes sequentially, 4 shards bring it down to roughly 5 minutes per shard plus the merge step overhead.

More shards means more parallelism but also more overhead (job startup, browser installation, artifact upload). Beyond 8-10 shards, you typically see diminishing returns.

---

## 9. Uploading Artifacts (Screenshots, Videos, Traces)

Test artifacts are essential for debugging failures. Here is how to capture and upload them effectively.

### Playwright Artifacts

Configure Playwright to capture artifacts on failure:

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results',
});
\`\`\`

Upload them in your workflow:

\`\`\`yaml
- name: Upload test artifacts
  if: \${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: test-artifacts
    path: |
      test-results/
      playwright-report/
    retention-days: 14
\`\`\`

### Viewing Traces

Playwright traces are the most powerful debugging tool. They capture a complete recording of the test execution including DOM snapshots, network requests, console logs, and screenshots at every step.

After downloading the trace artifact, view it at \`trace.playwright.dev\` by uploading the zip file, or run:

\`\`\`bash
npx playwright show-trace test-results/my-test/trace.zip
\`\`\`

### Artifact Retention Strategy

| Artifact Type | Retention Days | Reasoning |
|---------------|---------------|-----------|
| HTML report | 14 | Reference for recent test runs |
| Screenshots | 7 | Debugging recent failures |
| Videos | 3 | Large files, only needed for active debugging |
| Traces | 7 | Most useful for recent debugging |
| JUnit XML | 30 | Small files, useful for trend analysis |

Set \`retention-days\` to manage storage costs. GitHub provides 500 MB to 2 GB of artifact storage depending on your plan.

---

## 10. Secrets Management

Test automation often requires credentials for test environments, API keys, and service tokens. Never commit these to your repository.

### Setting Secrets

Navigate to your repository Settings, then Secrets and variables, then Actions. Add secrets here. They are encrypted and only exposed to workflow runs.

### Using Secrets in Workflows

\`\`\`yaml
steps:
  - name: Run tests
    run: npx playwright test
    env:
      TEST_USER_EMAIL: \${{ secrets.TEST_USER_EMAIL }}
      TEST_USER_PASSWORD: \${{ secrets.TEST_USER_PASSWORD }}
      API_BASE_URL: \${{ secrets.STAGING_API_URL }}

  - name: Deploy and test
    run: npm run test:e2e
    env:
      DATABASE_URL: \${{ secrets.TEST_DATABASE_URL }}
\`\`\`

### Environment-Specific Secrets

Use GitHub Environments for different deployment targets:

\`\`\`yaml
jobs:
  test-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: npx playwright test
        env:
          BASE_URL: \${{ vars.BASE_URL }}
          API_KEY: \${{ secrets.API_KEY }}

  test-production:
    needs: test-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: npx playwright test --project=smoke
        env:
          BASE_URL: \${{ vars.BASE_URL }}
          API_KEY: \${{ secrets.API_KEY }}
\`\`\`

Environments can have separate secrets, protection rules (required reviewers), and deployment restrictions.

### Security Best Practices

- Never echo or log secrets. GitHub Actions automatically masks them in logs, but be careful with commands that might expose them indirectly
- Use fine-grained tokens with minimum required permissions
- Rotate secrets regularly, especially after team member departures
- Use \`GITHUB_TOKEN\` (automatically provided) for GitHub API calls instead of personal access tokens
- Never pass secrets to third-party actions you do not trust

---

## 11. Deployment Gates and Branch Protection

Use test results as quality gates to prevent broken code from reaching production.

### Branch Protection Rules

Configure your repository to require passing checks before merging:

1. Go to Settings then Branches then Branch protection rules
2. Add a rule for \`main\`
3. Enable "Require status checks to pass before merging"
4. Select your test workflow jobs as required checks
5. Enable "Require branches to be up to date before merging"

### Deployment Gates Workflow

\`\`\`yaml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test

  deploy-staging:
    needs: [unit-tests, e2e-tests]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "Deploying to staging"

  smoke-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=smoke
        env:
          BASE_URL: https://staging.example.com

  deploy-production:
    needs: smoke-tests
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Deploying to production"
\`\`\`

This pipeline ensures that code passes unit tests and E2E tests before deploying to staging, then passes smoke tests on staging before deploying to production.

---

## 12. Reusable Workflows and Composite Actions

As your test automation grows, you will want to share workflow logic across repositories and reduce duplication.

### Reusable Workflows

Create a workflow that other workflows can call:

\`\`\`yaml
# .github/workflows/reusable-playwright.yml
name: Reusable Playwright Tests

on:
  workflow_call:
    inputs:
      node-version:
        description: 'Node.js version'
        required: false
        default: '20'
        type: string
      base-url:
        description: 'Base URL for tests'
        required: true
        type: string
      shard-count:
        description: 'Number of shards'
        required: false
        default: '1'
        type: string
    secrets:
      test-credentials:
        required: false

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        shard: \${{ fromJson(format('[{0}]', inputs.shard-count == '1' && '"1/1"' || '"1/4","2/4","3/4","4/4"')) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=\${{ matrix.shard }}
        env:
          BASE_URL: \${{ inputs.base-url }}
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: report-\${{ strategy.job-index }}
          path: playwright-report/
\`\`\`

Call it from another workflow:

\`\`\`yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  tests:
    uses: ./.github/workflows/reusable-playwright.yml
    with:
      base-url: https://staging.example.com
      shard-count: '4'
    secrets:
      test-credentials: \${{ secrets.TEST_CREDENTIALS }}
\`\`\`

### Composite Actions

For smaller reusable pieces, create composite actions:

\`\`\`yaml
# .github/actions/setup-playwright/action.yml
name: Setup Playwright
description: Install Node.js, dependencies, and Playwright browsers

inputs:
  node-version:
    description: 'Node.js version'
    default: '20'

runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: \${{ inputs.node-version }}
        cache: 'npm'

    - name: Install npm dependencies
      shell: bash
      run: npm ci

    - name: Get Playwright version
      id: pw-version
      shell: bash
      run: echo "version=\$(npx playwright --version)" >> "\$GITHUB_OUTPUT"

    - name: Cache Playwright browsers
      uses: actions/cache@v4
      id: pw-cache
      with:
        path: ~/.cache/ms-playwright
        key: pw-\${{ runner.os }}-\${{ steps.pw-version.outputs.version }}

    - name: Install Playwright browsers
      if: steps.pw-cache.outputs.cache-hit != 'true'
      shell: bash
      run: npx playwright install --with-deps

    - name: Install system deps only
      if: steps.pw-cache.outputs.cache-hit == 'true'
      shell: bash
      run: npx playwright install-deps
\`\`\`

Use it in any workflow:

\`\`\`yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./.github/actions/setup-playwright
    with:
      node-version: '20'
  - run: npx playwright test
\`\`\`

---

## 13. Advanced Patterns and Optimization

### Conditional Test Execution

Run different test suites based on what changed:

\`\`\`yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: \${{ steps.filter.outputs.frontend }}
      backend: \${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'src/components/**'
              - 'src/pages/**'
            backend:
              - 'src/api/**'
              - 'src/db/**'

  frontend-tests:
    needs: changes
    if: \${{ needs.changes.outputs.frontend == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=chromium tests/frontend/

  api-tests:
    needs: changes
    if: \${{ needs.changes.outputs.backend == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test tests/api/
\`\`\`

### Retry Failed Tests

Use the retry action for flaky test recovery:

\`\`\`yaml
- name: Run tests with retry
  uses: nick-fields/retry@v3
  with:
    timeout_minutes: 15
    max_attempts: 2
    command: npx playwright test
\`\`\`

**Warning**: Retrying is a band-aid, not a solution. Track which tests need retries and fix the underlying flakiness.

### Test Result Comments on PRs

Automatically post test results as PR comments:

\`\`\`yaml
- name: Post test results
  if: \${{ !cancelled() && github.event_name == 'pull_request' }}
  uses: daun/playwright-report-summary@v3
  with:
    report-file: results.json
    comment-title: 'Test Results'
\`\`\`

### Scheduled Full Regression

Run comprehensive tests on a schedule, not just on PRs:

\`\`\`yaml
name: Nightly Regression
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily

jobs:
  full-regression:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run full test suite
        run: npx playwright test --project=chromium --project=firefox --project=webkit
        env:
          BASE_URL: https://staging.example.com
\`\`\`

---

## 14. Monitoring and Debugging Workflows

### Viewing Workflow Runs

Navigate to the Actions tab in your repository to see all workflow runs. Each run shows the trigger, duration, status, and logs for every step.

### Debugging Failed Steps

**Step 1**: Click the failed job to see step-level logs.

**Step 2**: Look for the error message in the failing step. Common issues include:
- Missing dependencies (add a setup step)
- Timeout exceeded (increase timeout or optimize tests)
- Flaky tests (check test artifacts for screenshots/traces)
- Permission denied (check secrets configuration)

**Step 3**: Download artifacts to inspect screenshots, videos, and traces locally.

### Enable Debug Logging

For deeper debugging, enable step debug logging by setting these repository secrets:

\`ACTIONS_STEP_DEBUG\` = \`true\`
\`ACTIONS_RUNNER_DEBUG\` = \`true\`

This produces verbose output for every step. Remember to disable these after debugging to avoid log noise.

### Monitoring Pipeline Health

Track these metrics over time:
- **Average pipeline duration**: Should stay consistent; sudden increases indicate a problem
- **Failure rate**: Track the percentage of failed runs; flaky tests inflate this
- **Time to feedback**: How long from push to test results; aim for under 10 minutes
- **Cache hit rate**: Monitor how often caches are used; low hit rates mean slow pipelines

---

## 15. Complete Production Pipeline Example

Here is a comprehensive pipeline that combines all the patterns discussed in this guide:

\`\`\`yaml
name: Complete CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  e2e-tests:
    name: E2E (\${{ matrix.shard }})
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test --shard=\${{ matrix.shard }}
        env:
          BASE_URL: \${{ secrets.STAGING_URL }}

      - name: Upload artifacts
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results-\${{ strategy.job-index }}
          path: |
            test-results/
            playwright-report/
          retention-days: 7

  merge-reports:
    name: Merge E2E Reports
    needs: e2e-tests
    if: \${{ !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          path: all-reports
          pattern: e2e-results-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter html ./all-reports
      - uses: actions/upload-artifact@v4
        with:
          name: merged-e2e-report
          path: playwright-report/
          retention-days: 14

  deploy:
    name: Deploy
    needs: [lint-and-typecheck, unit-tests, e2e-tests]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploying to production"
\`\`\`

This pipeline runs linting, unit tests, and 4 E2E test shards in parallel. The deploy job only runs on the main branch after all checks pass. Reports are merged and uploaded for easy debugging.

---

## Summary

GitHub Actions provides everything you need to build a world-class test automation pipeline. Start with a simple workflow that runs your tests on pull requests, then incrementally add caching, parallelization, cross-browser matrix testing, and deployment gates as your test suite grows.

**Key takeaways:**
- Use \`fail-fast: false\` in matrix strategies to see all failures
- Cache dependencies and Playwright browsers aggressively
- Shard tests for suites that take longer than 10 minutes
- Always upload artifacts with \`if: \${{ !cancelled() }}\`
- Use reusable workflows to share patterns across repositories
- Set up branch protection rules to enforce passing tests before merge
- Monitor pipeline health metrics over time

Install the CI/CD testing skill for your AI agent to get expert pipeline configuration assistance:

\`\`\`bash
npx @qaskills/cli add ci-cd-testing
\`\`\`

Browse all testing skills at [qaskills.sh/skills](/skills).
`,
};
