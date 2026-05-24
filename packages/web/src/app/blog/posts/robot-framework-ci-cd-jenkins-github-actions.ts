import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework CI/CD with Jenkins and GitHub Actions',
  description:
    'Run Robot Framework in CI/CD with Jenkins and GitHub Actions. Parallel execution, Docker, reports, artifacts, Slack notifications, and production patterns.',
  date: '2026-05-15',
  category: 'Guide',
  content: `
# Robot Framework CI/CD with Jenkins and GitHub Actions

Running Robot Framework tests on your local machine is good. Running them in CI/CD is essential. Without a pipeline that executes every Robot suite on every commit, you have no safety net - the tests will rot, the suite will break, and engineers will lose trust in automation. This guide walks through setting up production-grade Robot Framework pipelines in both Jenkins and GitHub Actions, with patterns for parallel execution, Docker-based browser images, artifact uploads, Slack notifications, and integration with reporting tools like Allure and TestRail.

You'll find complete pipeline configurations you can copy and adapt, plus deep dives on the patterns that matter most: caching dependencies for fast builds, sharding tests across multiple workers, handling secrets, retrying flaky tests intelligently, and surfacing results in a way that PR reviewers can actually act on. By the end you'll have a production-quality Robot Framework pipeline that runs on every commit, posts results to Slack, and lets you confidently ship code to production.

## Key Takeaways

- Run Robot in Docker for consistent, reproducible builds
- Use Pabot for parallel execution across CPU cores
- Cache pip dependencies for faster pipeline starts
- Upload output.xml, log.html, report.html, and screenshots as artifacts
- Post failures to Slack with linked log URLs
- Tag tests for selective CI runs (smoke on PR, full on main)
- Integrate with Allure or ReportPortal for trend tracking

---

## GitHub Actions: Basic Workflow

\`\`\`yaml
name: Robot Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install robotframework robotframework-seleniumlibrary \\
                      robotframework-requests robotframework-pabot

      - name: Setup Chrome
        uses: browser-actions/setup-chrome@v1

      - name: Run tests
        run: |
          robot --outputdir results \\
                --variable BROWSER:headlesschrome \\
                tests/

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: robot-results
          path: results/
\`\`\`

## GitHub Actions: Smoke vs Full

\`\`\`yaml
name: Robot Tests
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'

jobs:
  smoke:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-seleniumlibrary
      - run: robot --include smoke --outputdir results tests/

  regression:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-seleniumlibrary robotframework-pabot
      - run: pabot --processes 4 --include "smokeORregression" --outputdir results tests/

  nightly:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-seleniumlibrary robotframework-pabot
      - run: pabot --processes 8 --outputdir results tests/
\`\`\`

## GitHub Actions: Matrix Across Browsers

\`\`\`yaml
jobs:
  test:
    runs-on: \${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        browser: [chrome, firefox]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-seleniumlibrary
      - run: robot --variable BROWSER:\${{ matrix.browser }} --outputdir results tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results-\${{ matrix.os }}-\${{ matrix.browser }}
          path: results/
\`\`\`

## GitHub Actions: Slack Notification

\`\`\`yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: \${{ job.status }}
    text: |
      Robot tests failed!
      Log: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}
  env:
    SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK }}
\`\`\`

## Jenkins: Declarative Pipeline

\`\`\`groovy
pipeline {
    agent {
        docker {
            image 'python:3.11-slim'
            args '-u root:root'
        }
    }
    stages {
        stage('Setup') {
            steps {
                sh '''
                    apt-get update
                    apt-get install -y wget chromium
                    pip install robotframework robotframework-seleniumlibrary \\
                                robotframework-requests robotframework-pabot
                '''
            }
        }
        stage('Smoke') {
            when { changeRequest() }
            steps {
                sh 'robot --include smoke --outputdir results tests/'
            }
        }
        stage('Regression') {
            when { branch 'main' }
            steps {
                sh 'pabot --processes 4 --outputdir results tests/'
            }
        }
    }
    post {
        always {
            robot outputPath: 'results/',
                  outputFileName: 'output.xml',
                  logFileName: 'log.html',
                  reportFileName: 'report.html',
                  passThreshold: 95.0,
                  unstableThreshold: 80.0
            archiveArtifacts artifacts: 'results/**', allowEmptyArchive: true
        }
        failure {
            slackSend channel: '#qa-alerts',
                      message: "Robot tests failed in \${env.JOB_NAME} (\${env.BUILD_URL})"
        }
    }
}
\`\`\`

## Jenkins: Robot Plugin

Install the Robot Framework plugin in Jenkins. It adds:
- Test trend graphs
- Pass/fail tables embedded in build page
- Direct links to log.html and report.html
- Configurable thresholds for unstable/failed builds

## Docker For Robot

\`\`\`dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \\
    wget \\
    gnupg \\
    chromium \\
    fonts-liberation \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["robot", "--outputdir", "results", "tests/"]
\`\`\`

\`\`\`yaml
# requirements.txt
robotframework>=6.0
robotframework-seleniumlibrary>=6.0
robotframework-requests>=0.9
robotframework-pabot>=2.0
\`\`\`

Build and run:

\`\`\`bash
docker build -t my-robot-tests .
docker run --rm -v $(pwd)/results:/app/results my-robot-tests
\`\`\`

## Docker Compose For Integration Tests

\`\`\`yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: appdb

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:testpass@postgres/appdb
    depends_on: [postgres]

  robot:
    build: ./tests
    environment:
      API_URL: http://app:8000
    depends_on: [app]
    command: robot --outputdir /results tests/integration/
    volumes:
      - ./results:/results
\`\`\`

\`\`\`bash
docker compose -f docker-compose.test.yml up --abort-on-container-exit
\`\`\`

## Caching Dependencies

\`\`\`yaml
- name: Cache pip
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: \${{ runner.os }}-pip-\${{ hashFiles('requirements.txt') }}

- name: Cache browsers (Browser library)
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: \${{ runner.os }}-playwright-1.40
\`\`\`

## Reporting Tools

### Allure

\`\`\`bash
pip install robotframework-allure
robot --listener allure_robotframework tests/
allure generate allure-results -o allure-report
\`\`\`

\`\`\`yaml
- name: Generate Allure
  if: always()
  uses: simple-elf/allure-report-action@v1
  with:
    allure_results: allure-results
    gh_pages: allure-report
\`\`\`

### ReportPortal

\`\`\`bash
pip install robotframework-reportportal
robot --listener robotframework_reportportal.listener \\
      --variable RP_UUID:\${RP_TOKEN} \\
      --variable RP_ENDPOINT:https://rp.example.com \\
      --variable RP_PROJECT:my-project \\
      --variable RP_LAUNCH:Robot-PR-\${PR_NUMBER} \\
      tests/
\`\`\`

## Flaky Test Retry

\`\`\`yaml
- name: Run tests with retry
  run: |
    robot --outputdir results tests/ || \\
    robot --rerunfailed results/output.xml --output results/rerun.xml tests/
    rebot --merge results/output.xml results/rerun.xml
\`\`\`

## Secrets Management

\`\`\`yaml
- run: robot tests/
  env:
    API_KEY: \${{ secrets.API_KEY }}
    DB_PASS: \${{ secrets.DB_PASS }}
    TWILIO_TOKEN: \${{ secrets.TWILIO_TOKEN }}
\`\`\`

In Robot:

\`\`\`robot
*** Variables ***
\${API_KEY}    %{API_KEY}
\`\`\`

## Pipeline Performance Patterns

| Pattern | Impact |
|---------|--------|
| Cache pip dependencies | -30s per run |
| Use headless browsers | -50% RAM |
| Use Pabot --testlevelsplit | up to 4x speedup |
| Pre-built Docker image with deps | -45s setup |
| Reuse browser at suite level | -10s per test |
| Skip slow tests on PR | 5-10x faster PR builds |

## Multi-Stage GitHub Actions

\`\`\`yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install robotframework
      - run: robot --dryrun tests/

  smoke:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: robot --include smoke tests/

  regression:
    needs: smoke
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pabot --processes 4 --variable SHARD:\${{ matrix.shard }} tests/
\`\`\`

## Comparison

| CI System | Pros | Cons |
|-----------|------|------|
| GitHub Actions | Free for OSS, integrated, matrix builds | Limited runners on free tier |
| Jenkins | Self-hosted, rich plugins, Robot plugin | Complex maintenance |
| GitLab CI | Integrated with repo | Less Robot-specific tooling |
| CircleCI | Fast, Docker-native | Less free tier |

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Running everything on every PR | Tag-based selective runs |
| No artifact uploads | Always upload results/ on failure |
| Secrets in robot files | Env vars from CI secrets |
| Ignoring flaky tests | Retry pattern with tracking |
| No Slack alerts | Post failures to a dedicated channel |

## Real Pipeline Example

\`\`\`yaml
name: Robot CI
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install robotframework
      - run: robot --dryrun tests/

  smoke:
    needs: lint
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - uses: browser-actions/setup-chrome@v1
      - run: robot --include smoke --outputdir results tests/
        env:
          API_URL: \${{ secrets.STAGING_API_URL }}
          API_TOKEN: \${{ secrets.STAGING_TOKEN }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-results
          path: results/
      - name: Notify Slack
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK }}

  regression:
    needs: lint
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - uses: browser-actions/setup-chrome@v1
      - run: pabot --processes 4 --include "smokeORregression" --variable SHARD:\${{ matrix.shard }} --outputdir results tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: regression-shard-\${{ matrix.shard }}
          path: results/
\`\`\`

## Conclusion

A well-designed Robot Framework CI pipeline pays for itself within weeks. Every PR gets fast smoke tests; every merge gets thorough regression; every night gets the full suite plus slow integrations. Pabot speeds things up by 4x or more. Slack and reporting integrations turn raw test output into actionable signal. Docker ensures reproducibility. The investment in tooling is modest, and the return - confident, fast deployments - is enormous.

Start with the basic GitHub Actions workflow at the top of this guide. Layer in Pabot for parallelism, then matrix builds across browsers, then Slack notifications. Within a sprint or two you'll have a production-quality pipeline. Visit our [skills directory](/skills) or read the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) for adjacent patterns.
`,
};
