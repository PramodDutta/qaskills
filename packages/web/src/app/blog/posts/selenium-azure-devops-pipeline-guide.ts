import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Azure DevOps Pipeline Complete Guide 2026',
  description:
    'Master Selenium with Azure DevOps Pipelines in 2026. Cover YAML syntax, parallel jobs, Microsoft-hosted vs self-hosted agents, Grid integration, and reporting.',
  date: '2026-05-20',
  category: 'Reference',
  content: `
# Selenium Azure DevOps Pipeline Complete Guide 2026

Azure DevOps Pipelines (formerly Azure Pipelines, formerly VSTS) is Microsoft's CI/CD service. For organizations standardized on the Microsoft ecosystem (Azure, .NET, Office 365, Active Directory) it integrates more cleanly than alternative CI tools. For Selenium test suites it offers managed Windows, Linux, and macOS agents, parallel job execution, native test result publishing, and tight integration with Azure Resource Manager for spinning up test infrastructure.

This guide covers Selenium + Azure DevOps Pipelines end-to-end in 2026. We walk through YAML pipeline syntax, Microsoft-hosted agents, self-hosted agent pools, parallel jobs, matrix strategies for cross-browser runs, Selenium Grid integration, publishing JUnit and Allure results, artifact handling, deployment gates, and integration with Azure Test Plans. For Selenium fundamentals see [Selenium Java TestNG](/blog/selenium-java-testng-page-object-guide) and for Grid see [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide). Browse the [skills directory](/skills).

## Why Azure DevOps

Three reasons. First, Microsoft integration. If your org runs on Azure, AAD, Teams, and SQL Server, Azure DevOps is the lowest-friction CI. Second, mature test reporting. Azure Test Plans plus Pipelines provides traceability from a planned test case to a CI run that executed it. Third, parallel job scaling. Free tiers include 1800 minutes/month of Microsoft-hosted agents; paid tiers scale linearly.

The trade-off is the learning curve. Azure DevOps has accumulated many concepts (organizations, projects, pipelines, releases, environments, agent pools). For first-time users this is overwhelming. Once internalized the platform is productive.

| Component | Purpose |
|---|---|
| Pipeline | YAML or classic definition |
| Job | Sequence of steps running on one agent |
| Stage | Logical phase containing jobs |
| Variable | Pipeline-scoped value |
| Variable group | Org-scoped reusable variables |
| Service connection | Auth to external services |
| Agent pool | Set of agents (hosted or self-hosted) |
| Environment | Deployment target with approval gates |

## Basic Pipeline

A minimal YAML pipeline for Selenium tests.

\`\`\`yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - 'src/**'
      - 'tests/**'

pr:
  branches:
    include:
      - main

variables:
  - name: GRID_URL
    value: 'http://selenium-grid.internal:4444'
  - group: 'selenium-secrets'

pool:
  vmImage: 'ubuntu-latest'

jobs:
  - job: SeleniumTests
    displayName: 'Run Selenium Tests'
    timeoutInMinutes: 60

    steps:
      - task: Cache@2
        inputs:
          key: 'maven | "$(Agent.OS)" | **/pom.xml'
          restoreKeys: |
            maven | "$(Agent.OS)"
            maven
          path: '$(HOME)/.m2/repository'

      - task: JavaToolInstaller@0
        inputs:
          versionSpec: '17'
          jdkArchitectureOption: 'x64'
          jdkSourceOption: 'PreInstalled'

      - script: |
          mvn test -DgridUrl=$(GRID_URL) -Dbrowser=chrome
        displayName: 'Run tests'
        env:
          LOAD_TEST_PASSWORD: $(LoadTestPassword)

      - task: PublishTestResults@2
        condition: always()
        inputs:
          testResultsFormat: 'JUnit'
          testResultsFiles: '**/target/surefire-reports/TEST-*.xml'
          failTaskOnFailedTests: true

      - task: PublishBuildArtifacts@1
        condition: failed()
        inputs:
          PathtoPublish: '$(System.DefaultWorkingDirectory)/target/screenshots'
          ArtifactName: 'screenshots'
\`\`\`

This pipeline triggers on PRs and main branch pushes, caches Maven dependencies, runs tests, publishes JUnit results, and uploads screenshots on failure.

## Hosted vs Self-Hosted Agents

Microsoft-hosted agents are managed VMs that Microsoft provisions on demand. They are pre-installed with common toolchains (JDK, .NET, Node, Python). Use them for most workloads.

Self-hosted agents run on your infrastructure. Use them when you need:

- Access to internal networks
- Larger VMs than Microsoft offers
- Persistent state across runs
- Custom OS or hardware

\`\`\`yaml
# Microsoft-hosted agent
pool:
  vmImage: 'ubuntu-latest'  # or 'windows-latest', 'macos-latest'

# Self-hosted pool
pool:
  name: 'self-hosted-linux'
  demands:
    - selenium-grid
    - docker
\`\`\`

\`demands\` filter which agents in the pool can run the job. Agents declare capabilities; jobs declare demands; Azure matches them.

## Parallel Jobs

For cross-browser runs.

\`\`\`yaml
jobs:
  - job: ChromeTests
    pool: { vmImage: 'ubuntu-latest' }
    steps:
      - script: mvn test -Dbrowser=chrome

  - job: FirefoxTests
    pool: { vmImage: 'ubuntu-latest' }
    steps:
      - script: mvn test -Dbrowser=firefox

  - job: EdgeTests
    pool: { vmImage: 'windows-latest' }
    steps:
      - script: mvn test -Dbrowser=edge
\`\`\`

Each job runs in parallel on its own agent. Total time is the slowest job.

## Matrix Strategy

For more variants use matrix.

\`\`\`yaml
jobs:
  - job: CrossBrowser
    pool: { vmImage: 'ubuntu-latest' }
    strategy:
      matrix:
        Chrome_Stable:
          BROWSER: 'chrome'
          BROWSER_VERSION: 'stable'
        Chrome_Beta:
          BROWSER: 'chrome'
          BROWSER_VERSION: 'beta'
        Firefox_ESR:
          BROWSER: 'firefox'
          BROWSER_VERSION: 'esr'
        Firefox_Latest:
          BROWSER: 'firefox'
          BROWSER_VERSION: 'latest'
      maxParallel: 4

    steps:
      - script: |
          mvn test \\
            -Dbrowser=$(BROWSER) \\
            -DbrowserVersion=$(BROWSER_VERSION) \\
            -DgridUrl=$(GRID_URL)
        displayName: 'Test $(BROWSER) $(BROWSER_VERSION)'
\`\`\`

Matrix creates one job per row. \`maxParallel\` caps concurrent runs to control Grid load.

## Multi-Stage Pipeline

For end-to-end pipelines with build, test, deploy stages.

\`\`\`yaml
stages:
  - stage: Build
    jobs:
      - job: Compile
        steps:
          - script: mvn clean compile -DskipTests
          - task: PublishPipelineArtifact@1
            inputs:
              path: '$(System.DefaultWorkingDirectory)/target'
              artifact: 'build-output'

  - stage: Test
    dependsOn: Build
    jobs:
      - job: SmokeTest
        steps:
          - task: DownloadPipelineArtifact@2
            inputs:
              artifact: 'build-output'
              path: 'target'
          - script: mvn test -Dgroups=smoke

      - job: RegressionTest
        dependsOn: SmokeTest
        steps:
          - script: mvn test -Dgroups=regression

  - stage: Deploy
    dependsOn: Test
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: ToStaging
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: ./deploy.sh staging
\`\`\`

Stages run sequentially by default. \`dependsOn\` controls order. \`condition\` filters when stages execute.

## Selenium Grid in Pipeline

Spin up a Grid container per pipeline.

\`\`\`yaml
- job: SeleniumWithGrid
  pool: { vmImage: 'ubuntu-latest' }

  services:
    grid:
      image: selenium/hub:4.27.0
      ports:
        - '4444:4444'
        - '4442:4442'
        - '4443:4443'
    chrome:
      image: selenium/node-chrome:4.27.0
      env:
        SE_EVENT_BUS_HOST: grid
        SE_EVENT_BUS_PUBLISH_PORT: '4442'
        SE_EVENT_BUS_SUBSCRIBE_PORT: '4443'

  steps:
    - script: |
        until curl -sSL http://localhost:4444/wd/hub/status | jq -r '.value.ready' | grep -q true; do
          sleep 2
        done
      displayName: 'Wait for Grid'

    - script: |
        mvn test -DgridUrl=http://localhost:4444
      displayName: 'Run tests'
\`\`\`

Service containers run alongside the job container with shared networking. The job container can reach \`http://grid:4444\` (using the service name).

## Variable Groups and Secrets

Store secrets in a variable group (or Azure Key Vault for higher security).

\`\`\`yaml
variables:
  - group: 'selenium-secrets'        # Set in Library
  - name: PUBLIC_VAR
    value: 'http://staging.example.com'

steps:
  - script: |
      echo "URL: $(PUBLIC_VAR)"
      mvn test -Dpassword=$(SECRET_PASSWORD)
\`\`\`

Variables in groups marked as secrets don't appear in logs and need explicit \`\\$(...)\` to use.

## Publishing Test Results

Azure DevOps natively renders JUnit XML.

\`\`\`yaml
- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: '**/target/surefire-reports/TEST-*.xml'
    testRunTitle: 'Selenium - $(BROWSER) - $(Build.BuildNumber)'
    failTaskOnFailedTests: true
\`\`\`

Results appear in the Tests tab. You see pass/fail counts, duration trends, and flaky test detection automatically.

For Allure reports use a custom step that copies allure-results to an artifact:

\`\`\`yaml
- script: |
    allure generate target/allure-results -o target/allure-report --clean
  condition: always()
  displayName: 'Generate Allure report'

- task: PublishHtmlReport@1
  condition: always()
  inputs:
    reportDir: 'target/allure-report'
    tabName: 'Allure'
\`\`\`

The HTML Report extension renders Allure inline in the pipeline run.

## Deployment Gates

For deployment stages add approval gates.

\`\`\`yaml
- deployment: ToProduction
  environment:
    name: 'production'
    resourceType: 'Kubernetes'
  strategy:
    runOnce:
      preDeploy:
        steps:
          - script: ./smoke-test.sh production
      deploy:
        steps:
          - script: ./deploy.sh production
      routeTraffic:
        steps:
          - script: ./route-traffic.sh
      postRouteTraffic:
        steps:
          - script: ./smoke-test.sh production
\`\`\`

Environments configured with approval gates pause the pipeline until a designated approver clicks Approve.

## Azure Test Plans Integration

For organizations using Azure Test Plans, pipelines can publish test results that map back to planned test cases. This gives manual and automated tests a unified report.

\`\`\`yaml
- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: '**/target/surefire-reports/*.xml'
    publishRunAttachments: true
    mergeTestResults: true
    testRunTitle: 'Selenium Run $(Build.BuildNumber)'

# Linking to Test Plan
- task: AssociateAutomation@0
  inputs:
    azureTestPlanId: 'YOUR_TEST_PLAN_ID'
    azureTestSuiteId: 'YOUR_SUITE_ID'
\`\`\`

This creates traceability: a planned test case can show its automation history across builds.

## Container Jobs

Run the entire job inside a Docker container.

\`\`\`yaml
jobs:
  - job: TestInContainer
    pool: { vmImage: 'ubuntu-latest' }
    container:
      image: 'eclipse-temurin:17-jdk'
      options: '--shm-size=2g'

    steps:
      - script: mvn test
\`\`\`

The job's working directory mounts into the container. Useful when your pipeline needs a specific OS or toolchain not available on Microsoft-hosted agents.

## Templates

For pipelines shared across projects use templates.

\`\`\`yaml
# templates/selenium-test.yml
parameters:
  - name: browser
    type: string
    default: 'chrome'
  - name: gridUrl
    type: string
  - name: tags
    type: string
    default: '@smoke'

jobs:
  - job: Test_\${{ parameters.browser }}
    pool: { vmImage: 'ubuntu-latest' }
    steps:
      - script: |
          mvn test \\
            -Dbrowser=\${{ parameters.browser }} \\
            -DgridUrl=\${{ parameters.gridUrl }} \\
            -Dgroups=\${{ parameters.tags }}
\`\`\`

In the main pipeline:

\`\`\`yaml
extends:
  template: templates/selenium-test.yml
  parameters:
    browser: 'chrome'
    gridUrl: 'http://grid:4444'
    tags: '@smoke,@critical'
\`\`\`

Templates centralize common pipeline logic.

## Scheduling

Run tests on a schedule.

\`\`\`yaml
schedules:
  - cron: '0 6 * * 1-5'
    displayName: 'Daily 6 AM weekday smoke'
    branches:
      include:
        - main
    always: true   # Run even if no code changes
  - cron: '0 22 * * *'
    displayName: 'Nightly regression'
    branches:
      include:
        - main
\`\`\`

Cron in UTC. Different schedules can trigger different sets of stages via conditions.

## Common Patterns

\`\`\`yaml
# Skip CI for docs-only changes
trigger:
  paths:
    exclude:
      - '*.md'
      - 'docs/**'

# Use specific commit message to skip
- script: |
    if [[ "$(Build.SourceVersionMessage)" == *"[skip ci]"* ]]; then
      echo "Skipping due to commit message"
      exit 0
    fi
    mvn test

# Conditional steps based on branch
- script: ./deploy-staging.sh
  condition: eq(variables['Build.SourceBranch'], 'refs/heads/develop')

# Retry on transient failures
- script: mvn test
  retryCountOnTaskFailure: 2
\`\`\`

## Conclusion

Azure DevOps Pipelines is the right CI for organizations embedded in the Microsoft ecosystem in 2026. YAML syntax, hosted and self-hosted agents, native test result publishing, and Azure Test Plans integration make it a complete platform for Selenium test suites. For organizations not on Azure, GitHub Actions (same parent company) is often a simpler choice for new projects.

If you are building an Azure DevOps pipeline for Selenium, start with a single-job pipeline, add matrix and parallel jobs as you scale, factor common logic into templates, and use Azure Test Plans for traceability. Browse the [skills directory](/skills) for Selenium AI agent skills and read [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide) for distributed test runtime.
`,
};
