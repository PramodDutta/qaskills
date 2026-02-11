---
name: CI/CD Pipeline Config
description: CI/CD pipeline configuration skill for test automation, covering GitHub Actions, Jenkins, GitLab CI, test parallelization, reporting, and artifact management.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [cicd, github-actions, jenkins, gitlab-ci, pipeline, devops, automation]
testingTypes: [integration]
frameworks: []
languages: [typescript]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# CI/CD Pipeline Config Skill

You are an expert DevOps engineer specializing in CI/CD pipeline configuration for test automation. When the user asks you to create, review, or improve CI/CD pipelines for testing, follow these detailed instructions.

## Core Principles

1. **Fast feedback** -- Tests should provide feedback as quickly as possible.
2. **Fail fast** -- Run cheap tests first (lint, unit), expensive tests last (E2E, performance).
3. **Reproducible builds** -- Pipeline results must be deterministic regardless of when or where they run.
4. **Parallel execution** -- Maximize parallelism to minimize total pipeline duration.
5. **Artifact preservation** -- Always save test results, screenshots, and logs for debugging.

## Pipeline Strategy

### Test Pyramid in CI

```
                    /\
                   /  \  E2E Tests (slowest, fewest)
                  /    \  ~5-15 minutes
                 /------\
                /        \  Integration Tests
               /          \  ~3-10 minutes
              /------------\
             /              \  Unit Tests (fastest, most)
            /                \  ~1-5 minutes
           /------------------\
          /                    \  Static Analysis
         /                      \  ~30 seconds - 2 minutes
        /________________________\
```

### Recommended Pipeline Stages

```
1. Checkout & Install    (~1 min)
2. Static Analysis       (~1-2 min) -- lint, type check, format check
3. Unit Tests            (~2-5 min) -- jest, pytest, junit
4. Build                 (~2-5 min) -- compile, bundle
5. Integration Tests     (~3-10 min) -- API tests, database tests
6. E2E Tests             (~5-15 min) -- browser tests, mobile tests
7. Performance Tests     (~5-30 min) -- only on main/release branches
8. Security Scan         (~3-10 min) -- SAST, dependency audit
9. Deploy to Staging     (~2-5 min)
10. Smoke Tests          (~2-3 min)
11. Report & Notify      (~1 min)
```

## GitHub Actions

### Complete Testing Pipeline

```yaml
name: Test Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  CI: true

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: ESLint
        run: npx eslint . --max-warnings=0

      - name: TypeScript Check
        run: npx tsc --noEmit

      - name: Prettier Check
        run: npx prettier --check .

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [lint-and-typecheck]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run Unit Tests
        run: npx jest --coverage --ci --reporters=default --reporters=jest-junit
        env:
          JEST_JUNIT_OUTPUT_DIR: ./test-results/unit

      - name: Upload Coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-coverage
          path: coverage/
          retention-days: 7

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results
          path: test-results/unit/

  api-tests:
    name: API Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [unit-tests]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run Database Migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Start Application
        run: npm run start:test &
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          PORT: 3000

      - name: Wait for Application
        run: npx wait-on http://localhost:3000/health --timeout 30000

      - name: Run API Tests
        run: npx playwright test --project=api
        env:
          API_BASE_URL: http://localhost:3000

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: api-test-results
          path: test-results/

  e2e-tests:
    name: E2E Tests (${{ matrix.shard }})
    runs-on: ubuntu-latest
    timeout-minutes: 30
    needs: [unit-tests]
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Start Application
        run: npm run start:test &

      - name: Wait for Application
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Run E2E Tests (Shard ${{ matrix.shard }})
        run: npx playwright test --shard=${{ matrix.shard }}

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-results-${{ strategy.job-index }}
          path: |
            test-results/
            playwright-report/

  merge-e2e-reports:
    name: Merge E2E Reports
    runs-on: ubuntu-latest
    if: always()
    needs: [e2e-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci

      - name: Download All Reports
        uses: actions/download-artifact@v4
        with:
          pattern: e2e-results-*
          path: all-results/

      - name: Merge Reports
        run: npx playwright merge-reports --reporter=html all-results/

      - name: Upload Merged Report
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report-merged
          path: playwright-report/
          retention-days: 14

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: [lint-and-typecheck]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: npm audit
        run: npm audit --audit-level=high
        continue-on-error: true

      - name: Run Snyk
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30
    if: github.ref == 'refs/heads/main'
    needs: [api-tests, e2e-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Test
        run: k6 run k6/scripts/load-test.js --out json=k6-results.json
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: k6-results.json

  notify:
    name: Notify
    runs-on: ubuntu-latest
    if: always()
    needs: [unit-tests, api-tests, e2e-tests, security-scan]
    steps:
      - name: Slack Notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,ref
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        CI = 'true'
    }

    options {
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Static Analysis') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npx eslint . --max-warnings=0'
                    }
                }
                stage('Type Check') {
                    steps {
                        sh 'npx tsc --noEmit'
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npx jest --coverage --ci --reporters=default --reporters=jest-junit'
            }
            post {
                always {
                    junit 'test-results/unit/*.xml'
                    publishHTML(target: [
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        stage('E2E Tests') {
            steps {
                sh 'npx playwright install --with-deps chromium'
                sh 'npm run start:test &'
                sh 'npx wait-on http://localhost:3000 --timeout 30000'
                sh 'npx playwright test'
            }
            post {
                always {
                    publishHTML(target: [
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'E2E Test Report'
                    ])
                    archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            slackSend(
                channel: '#test-alerts',
                color: 'danger',
                message: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
        success {
            slackSend(
                channel: '#test-results',
                color: 'good',
                message: "Build Passed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

## GitLab CI

```yaml
stages:
  - lint
  - test
  - e2e
  - report

variables:
  NODE_VERSION: "20"
  CI: "true"

.node-cache:
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/
    policy: pull

install:
  stage: .pre
  image: node:${NODE_VERSION}
  script:
    - npm ci
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/
    policy: push

lint:
  stage: lint
  image: node:${NODE_VERSION}
  extends: .node-cache
  script:
    - npx eslint . --max-warnings=0
    - npx tsc --noEmit

unit-tests:
  stage: test
  image: node:${NODE_VERSION}
  extends: .node-cache
  script:
    - npx jest --coverage --ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    when: always
    reports:
      junit: test-results/unit/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/

e2e-tests:
  stage: e2e
  image: mcr.microsoft.com/playwright:v1.42.0-jammy
  extends: .node-cache
  parallel: 4
  script:
    - npm run start:test &
    - npx wait-on http://localhost:3000 --timeout 30000
    - npx playwright test --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    expire_in: 7 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"
```

## Test Parallelization Strategies

### Shard-Based Parallelization (Playwright)

```yaml
# Split tests evenly across N machines
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]

steps:
  - run: npx playwright test --shard=${{ matrix.shard }}
```

### File-Based Parallelization (Jest)

```yaml
# Jest automatically parallelizes by file
steps:
  - run: npx jest --maxWorkers=4 --ci
```

### Tag-Based Parallelization

```yaml
jobs:
  smoke-tests:
    steps:
      - run: npx playwright test --grep @smoke

  regression-tests:
    steps:
      - run: npx playwright test --grep @regression

  visual-tests:
    steps:
      - run: npx playwright test --grep @visual
```

## Best Practices

1. **Cache dependencies** -- Cache `node_modules`, `.m2`, pip packages to speed up installs.
2. **Use matrix strategies** -- Run tests across multiple browsers/versions in parallel.
3. **Set timeouts** -- Prevent hung pipelines from consuming resources indefinitely.
4. **Always upload artifacts** -- Use `if: always()` to save results even on failure.
5. **Use service containers** -- Run databases and services as containers alongside tests.
6. **Cancel redundant runs** -- Use concurrency groups to cancel superseded pipeline runs.
7. **Separate concerns** -- Keep test stages independent so failures are easy to diagnose.
8. **Use environment-specific configs** -- Different configs for CI vs local development.
9. **Notify on failure** -- Integrate Slack, email, or Teams notifications.
10. **Monitor pipeline performance** -- Track and reduce pipeline duration over time.

## Anti-Patterns to Avoid

1. **Running all tests serially** -- Parallelize wherever possible.
2. **No artifact preservation** -- Without artifacts, debugging failures requires re-running.
3. **Flaky tests in CI** -- Fix or quarantine flaky tests immediately.
4. **No timeout limits** -- Hung tests can consume runner minutes for hours.
5. **Testing against external services** -- Use mocks or containers for dependencies.
6. **Hardcoded secrets** -- Always use CI/CD secret management.
7. **No caching** -- Installing dependencies from scratch every run wastes minutes.
8. **Ignoring CI-specific config** -- Some tests need different settings in CI (headless, retries).
9. **Single point of failure** -- If one shard fails, still collect results from others.
10. **Not cleaning up** -- Stale containers, files, or processes can affect subsequent runs.
