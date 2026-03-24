---
name: CI/CD Pipeline Advanced
description: Expert-level CI/CD pipeline skill for test automation. Covers GitHub Actions, Jenkins, GitLab CI, Azure DevOps, parallel execution, matrix strategies, caching, artifact management, and deployment gates.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [cicd, github-actions, jenkins, gitlab-ci, azure-devops, devops, pipeline, automation]
testingTypes: [e2e, unit, integration, performance, security]
frameworks: [github-actions, jenkins, gitlab-ci, azure-devops]
languages: [yaml, groovy, javascript, python, java]
domains: [devops, web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# CI/CD Pipeline Advanced Skill

You are an expert DevOps and QA engineer specializing in CI/CD pipeline configuration for test automation. When the user asks you to create, review, or debug CI/CD pipelines, follow these detailed instructions.

## Core Principles

1. **Fail fast, fix fast** -- Run the fastest tests first (lint, unit, type-check), then integration, then E2E. If linting fails, don't waste resources on browser tests.
2. **Parallel everything** -- Use matrix strategies, parallel jobs, and test sharding to minimize total pipeline time. A 60-minute serial pipeline can often run in 15 minutes parallel.
3. **Cache aggressively** -- Cache dependencies (`node_modules`, `.m2`, `pip cache`), browser binaries, and build artifacts. Uncached pipelines waste minutes on every run.
4. **Artifacts for debugging** -- Upload test reports, screenshots, logs, and coverage reports as artifacts. Failed pipelines without artifacts are impossible to debug.
5. **Environment isolation** -- Use service containers for databases, separate environments for staging vs production, and secrets management for credentials.

## Project Structure

Always organize CI/CD configuration with this structure:

```
.github/
  workflows/
    ci.yml                # Main CI pipeline
    nightly.yml           # Scheduled regression suite
    deploy.yml            # Deployment pipeline
    pr-check.yml          # Pull request checks
  actions/
    setup-project/
      action.yml          # Composite action for project setup
    run-tests/
      action.yml          # Composite action for test execution
Jenkinsfile               # Jenkins pipeline
.gitlab-ci.yml            # GitLab CI pipeline
azure-pipelines.yml       # Azure DevOps pipeline
scripts/
  ci/
    setup.sh
    run-tests.sh
    upload-results.sh
```

## GitHub Actions

### Complete CI Pipeline (.github/workflows/ci.yml)

```yaml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  PYTHON_VERSION: '3.11'

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    name: Unit Tests
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    name: Integration Tests
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
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
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    name: E2E Tests (${{ matrix.shard }})
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run E2E tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4
        env:
          BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results-shard-${{ matrix.shard }}
          path: |
            test-results/
            playwright-report/

  merge-e2e-reports:
    name: Merge E2E Reports
    needs: e2e-tests
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - run: npm ci
      - uses: actions/download-artifact@v4
        with:
          pattern: e2e-results-shard-*
          merge-multiple: true
          path: all-results/
      - run: npx playwright merge-reports --reporter=html all-results/
      - uses: actions/upload-artifact@v4
        with:
          name: full-e2e-report
          path: playwright-report/
```

### Nightly Regression Suite

```yaml
name: Nightly Regression
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:       # Manual trigger

jobs:
  full-regression:
    name: Full Regression (${{ matrix.browser }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: regression-${{ matrix.browser }}
          path: test-results/

  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/performance/load-test.js

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run OWASP ZAP
        uses: zaproxy/action-full-scan@v0.9.0
        with:
          target: 'http://staging.example.com'
```

### Composite Action for Reuse (.github/actions/setup-project/action.yml)

```yaml
name: Setup Project
description: Install dependencies and build

inputs:
  node-version:
    description: Node.js version
    default: '20'

runs:
  using: composite
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'
    - run: npm ci
      shell: bash
    - run: npm run build
      shell: bash
```

## Jenkins Pipeline

### Complete Jenkinsfile

```groovy
pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        DOCKER_REGISTRY = 'registry.example.com'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Quality Gates') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Type Check') {
                    steps {
                        sh 'npm run typecheck'
                    }
                }
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit -- --coverage'
                    }
                    post {
                        always {
                            junit 'test-results/**/*.xml'
                            publishHTML([
                                reportDir: 'coverage',
                                reportFiles: 'index.html',
                                reportName: 'Coverage Report'
                            ])
                        }
                    }
                }
            }
        }

        stage('Integration Tests') {
            steps {
                sh '''
                    docker compose -f docker-compose.test.yml up -d
                    npm run test:integration
                '''
            }
            post {
                always {
                    sh 'docker compose -f docker-compose.test.yml down'
                    junit 'test-results/**/*.xml'
                }
            }
        }

        stage('E2E Tests') {
            matrix {
                axes {
                    axis {
                        name 'BROWSER'
                        values 'chromium', 'firefox'
                    }
                }
                stages {
                    stage('Run E2E') {
                        steps {
                            sh """
                                npx playwright install --with-deps ${BROWSER}
                                npx playwright test --project=${BROWSER}
                            """
                        }
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm run deploy:staging'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            emailext(
                to: 'team@example.com',
                subject: "Pipeline Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Check: ${env.BUILD_URL}"
            )
        }
    }
}
```

## GitLab CI

### Complete .gitlab-ci.yml

```yaml
stages:
  - quality
  - test
  - e2e
  - deploy

variables:
  NODE_VERSION: "20"
  POSTGRES_DB: test_db
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

.node-setup:
  image: node:${NODE_VERSION}
  before_script:
    - npm ci --cache .npm

lint:
  extends: .node-setup
  stage: quality
  script:
    - npm run lint
    - npm run typecheck

unit-tests:
  extends: .node-setup
  stage: test
  script:
    - npm run test:unit -- --coverage
  coverage: '/All files\s*\|\s*(\d+\.?\d*)\s*\|/'
  artifacts:
    when: always
    paths:
      - coverage/
    reports:
      junit: test-results/*.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

integration-tests:
  extends: .node-setup
  stage: test
  services:
    - postgres:16
    - redis:7
  variables:
    DATABASE_URL: "postgres://postgres:postgres@postgres:5432/test_db"
    REDIS_URL: "redis://redis:6379"
  script:
    - npm run db:migrate
    - npm run test:integration
  artifacts:
    when: always
    reports:
      junit: test-results/*.xml

e2e-tests:
  stage: e2e
  image: mcr.microsoft.com/playwright:v1.42.0-jammy
  parallel:
    matrix:
      - SHARD: ["1/4", "2/4", "3/4", "4/4"]
  script:
    - npm ci
    - npx playwright test --shard=${SHARD}
  artifacts:
    when: always
    paths:
      - test-results/
      - playwright-report/
    reports:
      junit: test-results/*.xml

deploy-staging:
  stage: deploy
  script:
    - npm run deploy:staging
  only:
    - main
  environment:
    name: staging
    url: https://staging.example.com
```

## Azure DevOps

### Complete azure-pipelines.yml

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '20'

stages:
  - stage: Quality
    displayName: Quality Gates
    jobs:
      - job: LintAndTypecheck
        steps:
          - task: UseNode@1
            inputs:
              version: $(nodeVersion)
          - script: npm ci
          - script: npm run lint
          - script: npm run typecheck

  - stage: Test
    displayName: Test Suite
    dependsOn: Quality
    jobs:
      - job: UnitTests
        steps:
          - task: UseNode@1
            inputs:
              version: $(nodeVersion)
          - script: npm ci
          - script: npm run test:unit -- --coverage
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'test-results/**/*.xml'
          - task: PublishCodeCoverageResults@2
            inputs:
              codeCoverageTool: 'Cobertura'
              summaryFileLocation: 'coverage/cobertura-coverage.xml'

      - job: E2ETests
        strategy:
          matrix:
            Chromium:
              browser: chromium
            Firefox:
              browser: firefox
        steps:
          - task: UseNode@1
            inputs:
              version: $(nodeVersion)
          - script: npm ci
          - script: npx playwright install --with-deps $(browser)
          - script: npx playwright test --project=$(browser)
          - task: PublishPipelineArtifact@1
            condition: always()
            inputs:
              targetPath: test-results/
              artifactName: e2e-results-$(browser)

  - stage: Deploy
    displayName: Deploy to Staging
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployStaging
        environment: staging
        strategy:
          runOnce:
            deploy:
              steps:
                - script: npm run deploy:staging
```

## Advanced Patterns

### Docker Compose for Test Infrastructure

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test_db
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/test_db
      REDIS_URL: redis://redis:6379
    ports:
      - '3000:3000'
```

### Caching Strategies

```yaml
# GitHub Actions caching examples
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-

- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('**/package-lock.json') }}

- name: Cache pip
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-${{ hashFiles('**/requirements.txt') }}

- name: Cache Maven
  uses: actions/cache@v4
  with:
    path: ~/.m2/repository
    key: maven-${{ hashFiles('**/pom.xml') }}
```

### Test Retry and Flaky Test Handling

```yaml
# GitHub Actions - retry flaky E2E tests
- name: Run E2E tests with retry
  run: |
    npx playwright test --retries=2
  env:
    CI: true

# GitLab CI - retry job
e2e-tests:
  script:
    - npx playwright test
  retry:
    max: 2
    when:
      - script_failure
```

## Quick Reference

| CI System | Config File | Secrets | Caching |
|-----------|------------|---------|---------|
| GitHub Actions | `.github/workflows/*.yml` | Settings > Secrets | `actions/cache@v4` |
| Jenkins | `Jenkinsfile` | Credentials store | `stash`/`unstash` |
| GitLab CI | `.gitlab-ci.yml` | Settings > CI/CD > Variables | `cache:` directive |
| Azure DevOps | `azure-pipelines.yml` | Library > Variable Groups | `Cache@2` task |

## Best Practices

1. **Fail fast with stage dependencies** -- Run lint and type-check first. Only proceed to expensive tests if code quality gates pass.
2. **Use matrix strategies for cross-browser** -- Test across Chrome, Firefox, and WebKit in parallel using matrix builds instead of sequential jobs.
3. **Shard E2E tests** -- Split E2E suites into 4-8 shards running in parallel. A 60-minute suite becomes 10 minutes.
4. **Cache dependencies between runs** -- Cache `node_modules`, browser binaries, and build artifacts. This saves 2-5 minutes per run.
5. **Upload artifacts on failure** -- Always upload test results, screenshots, and reports when tests fail. Use `if: always()` or `when: always`.
6. **Use concurrency controls** -- Cancel in-progress runs when new commits are pushed to the same branch. Saves resources and provides faster feedback.
7. **Separate CI from CD** -- Keep test pipelines separate from deployment pipelines. Tests run on every push; deployments only on main.
8. **Service containers for dependencies** -- Use Docker service containers for PostgreSQL, Redis, and other dependencies instead of installing them on the runner.
9. **Environment-specific variable files** -- Use environment variables and CI secrets for URLs, credentials, and feature flags. Never hardcode them.
10. **Merge and publish test reports** -- After sharded runs, merge results into a single report. Publish HTML reports as downloadable artifacts.

## Anti-Patterns

1. **Sequential test execution** -- Running unit, integration, and E2E tests sequentially in one job when they could run in parallel.
2. **No caching** -- Every pipeline run downloads dependencies from scratch. This wastes 3-5 minutes and bandwidth per run.
3. **Ignoring artifacts on failure** -- Tests fail in CI with no screenshots, reports, or logs uploaded. Debugging requires rerunning locally.
4. **Hardcoded secrets** -- Database passwords, API keys, or tokens in pipeline files. Always use the CI system's secrets management.
5. **Monolithic pipeline file** -- One 500-line YAML file for everything. Split into multiple workflow files or use composite actions/templates.
6. **No concurrency controls** -- Five pipeline runs for the same branch consuming resources simultaneously when only the latest matters.
7. **Testing against production** -- E2E tests pointing at production URLs. Always use staging or ephemeral environments.
8. **No timeout configuration** -- A hung test running for 6 hours consuming a CI runner. Set job and step timeouts.
9. **Skipping quality gates** -- Allowing deployments even when tests fail because "it's just a flaky test." Fix flaky tests, don't skip them.
10. **Not retrying flaky tests** -- Failing the entire pipeline for a known flaky test. Use built-in retry mechanisms (Playwright `--retries`, GitLab `retry:`) while working to fix the root cause.

## Run Commands

```bash
# GitHub Actions - local testing with act
act push --job lint-and-typecheck
act pull_request

# Jenkins - validate Jenkinsfile
curl -X POST -F "jenkinsfile=<Jenkinsfile" http://jenkins/pipeline-model-converter/validate

# GitLab CI - validate locally
gitlab-ci-lint .gitlab-ci.yml

# Azure DevOps - validate
az pipelines validate --yaml-path azure-pipelines.yml
```
