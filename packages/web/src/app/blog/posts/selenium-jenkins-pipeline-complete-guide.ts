import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Jenkins Pipeline Complete Guide for 2026',
  description:
    'Master Selenium with Jenkins pipelines in 2026. Cover Jenkinsfile syntax, parallel stages, Grid integration, Docker agents, Allure publishing, and shared libraries.',
  date: '2026-05-19',
  category: 'Reference',
  content: `
# Selenium Jenkins Pipeline Complete Guide for 2026

Jenkins is the most-deployed CI server in enterprise software in 2026. For Selenium test pipelines it offers things newer CI systems struggle with: long-running agents, parameterized builds, complex matrix strategies, and the freedom to host your own infrastructure. With the Pipeline plugin (Jenkinsfile) you express the entire test workflow as code that lives in your repo. The combination of Jenkins agents, Docker images for browsers and tests, and the Selenium Grid plugin makes Jenkins a powerful host for Selenium suites at any scale.

This guide covers Selenium + Jenkins end-to-end in 2026. We walk through Jenkinsfile basics, declarative vs scripted syntax, parallel stages, Docker agents, Selenium Grid integration, Allure plugin publishing, shared libraries for reusable pipeline code, parameterized builds for cross-browser runs, retry strategies, and notifications. For Selenium fundamentals see [Selenium Java TestNG](/blog/selenium-java-testng-page-object-guide) and for Grid see [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide). Browse the [skills directory](/skills).

## Why Jenkins for Selenium

Three reasons. First, control. You own the agents, the network, the data, the storage. For regulated workloads this is non-negotiable. Second, scale. Jenkins runs on hardware you own; bursty test loads don't have minute-by-minute SaaS billing. Third, ecosystem. Twenty years of plugins. The Allure plugin, the Selenium Grid plugin, the Email Ext plugin, the GitHub Branch Source plugin, all production-grade and free.

The trade-off is operational overhead. You patch Jenkins. You upgrade plugins. You scale agents. Compared to GitHub Actions or CircleCI, Jenkins requires more SRE attention. For organizations with existing Jenkins fleets that overhead is amortized; for new projects, managed CI is often easier.

| Capability | Jenkins | GitHub Actions | CircleCI |
|---|---|---|---|
| Self-hosted | Yes (default) | Optional | Optional |
| Pipeline as code | Yes (Jenkinsfile) | Yes (workflow YAML) | Yes (config YAML) |
| Matrix builds | Yes | Yes | Yes |
| Shared libraries | Yes | Reusable workflows | Orbs |
| Long-running agents | Yes | No (timeout 6h) | Limited |
| Plugin ecosystem | Huge | Moderate | Moderate |
| Cost (self-hosted) | Free | N/A | N/A |
| Cost (managed) | N/A | Per-minute | Per-minute |

## Declarative Pipeline Syntax

The modern Jenkinsfile uses declarative syntax.

\`\`\`groovy
// Jenkinsfile
pipeline {
    agent any

    tools {
        jdk 'JDK17'
        maven 'Maven3'
    }

    parameters {
        choice(name: 'BROWSER', choices: ['chrome', 'firefox', 'edge'], description: 'Browser to test against')
        choice(name: 'ENV', choices: ['staging', 'qa', 'prod'], description: 'Target environment')
        booleanParam(name: 'HEADLESS', defaultValue: true, description: 'Run headless')
        string(name: 'TAGS', defaultValue: '@smoke', description: 'TestNG groups or Cucumber tags')
    }

    options {
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30'))
    }

    environment {
        GRID_URL = 'http://selenium-grid.internal:4444'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'mvn clean compile -DskipTests'
            }
        }

        stage('Test') {
            steps {
                sh """
                    mvn test \\
                        -Dbrowser=\${params.BROWSER} \\
                        -DgridUrl=\${GRID_URL} \\
                        -Dheadless=\${params.HEADLESS} \\
                        -Dgroups=\${params.TAGS}
                """
            }
        }

        stage('Report') {
            steps {
                allure([
                    includeProperties: false,
                    jdk: '',
                    properties: [],
                    reportBuildPolicy: 'ALWAYS',
                    results: [[path: 'target/allure-results']]
                ])
            }
        }
    }

    post {
        always {
            junit testResults: '**/target/surefire-reports/*.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'target/screenshots/**/*.png, target/logs/**/*.log', allowEmptyArchive: true
        }
        failure {
            emailext(
                subject: "FAILED: \${env.JOB_NAME} #\${env.BUILD_NUMBER}",
                body: "Tests failed. See \${env.BUILD_URL}",
                to: '\${DEFAULT_RECIPIENTS}'
            )
        }
    }
}
\`\`\`

This pipeline runs Selenium tests against a Grid, publishes Allure results, archives screenshots, and emails on failure.

## Parallel Stages

For cross-browser runs use parallel stages.

\`\`\`groovy
stage('Cross-browser') {
    parallel {
        stage('Chrome') {
            steps {
                sh 'mvn test -Dbrowser=chrome -DgridUrl=$GRID_URL'
            }
        }
        stage('Firefox') {
            steps {
                sh 'mvn test -Dbrowser=firefox -DgridUrl=$GRID_URL'
            }
        }
        stage('Edge') {
            steps {
                sh 'mvn test -Dbrowser=edge -DgridUrl=$GRID_URL'
            }
        }
    }
}
\`\`\`

Each browser runs in parallel. The job total time equals the slowest browser. Grid must have capacity to handle all three simultaneously.

## Docker Agents

For reproducible test environments use Docker agents.

\`\`\`groovy
pipeline {
    agent {
        docker {
            image 'maven:3.9-eclipse-temurin-17'
            args '-v /var/run/docker.sock:/var/run/docker.sock -u root'
        }
    }

    stages {
        stage('Build') {
            steps {
                sh 'mvn clean compile -DskipTests'
            }
        }
        stage('Test') {
            steps {
                sh 'mvn test'
            }
        }
    }
}
\`\`\`

Mounting the Docker socket lets the test container start Selenium containers as sibling containers. Useful when tests want their own Grid.

## Matrix Strategy

Run the same pipeline across multiple dimensions (browsers, environments, OS).

\`\`\`groovy
pipeline {
    agent none

    stages {
        stage('Matrix Tests') {
            matrix {
                axes {
                    axis {
                        name 'BROWSER'
                        values 'chrome', 'firefox', 'edge'
                    }
                    axis {
                        name 'ENV'
                        values 'staging', 'qa'
                    }
                }

                stages {
                    stage('Test') {
                        agent { label 'linux' }
                        steps {
                            sh """
                                mvn test \\
                                    -Dbrowser=\${BROWSER} \\
                                    -Denv=\${ENV} \\
                                    -DgridUrl=\$GRID_URL
                            """
                        }
                    }
                }
            }
        }
    }
}
\`\`\`

This creates 6 parallel test cells (3 browsers x 2 envs). Excellent for cross-cutting regression.

## Selenium Grid Plugin

The Selenium plugin starts a local Grid on the Jenkins agent if you don't have a persistent Grid.

\`\`\`groovy
stage('Test with embedded Grid') {
    steps {
        script {
            def grid = docker.image('selenium/standalone-chrome:4.27.0').run(
                '-p 4444:4444 --shm-size=2g'
            )
            try {
                // Wait for Grid to be ready
                sh '''
                    until curl -sS http://localhost:4444/wd/hub/status | jq -r '.value.ready' | grep -q "true"; do
                        sleep 2
                    done
                '''
                sh 'mvn test -DgridUrl=http://localhost:4444'
            } finally {
                grid.stop()
            }
        }
    }
}
\`\`\`

The container starts before tests, gets cleaned up after. For larger Grids start the Grid in a persistent cluster and just point tests at it.

## Allure Publishing

The Allure plugin publishes the interactive report.

\`\`\`groovy
stage('Generate Allure Report') {
    steps {
        allure([
            includeProperties: false,
            jdk: '',
            properties: [],
            reportBuildPolicy: 'ALWAYS',
            results: [[path: 'target/allure-results']]
        ])
    }
}
\`\`\`

The plugin is configured in Jenkins global tools. After the stage runs, the report is available at \`<JENKINS_URL>/job/<JOB>/<BUILD>/allure/\`.

## Shared Libraries

For pipelines that share code across many projects use a shared library.

\`\`\`
shared-library/
├── vars/
│   ├── seleniumTest.groovy
│   └── runWithGrid.groovy
└── src/com/example/
    └── TestHelpers.groovy
\`\`\`

\`\`\`groovy
// vars/seleniumTest.groovy
def call(Map config) {
    pipeline {
        agent { label config.label ?: 'linux' }

        stages {
            stage('Build') {
                steps { sh 'mvn clean compile -DskipTests' }
            }
            stage('Test') {
                steps {
                    sh "mvn test -Dbrowser=\${config.browser} -DgridUrl=\${config.gridUrl}"
                }
            }
            stage('Report') {
                steps {
                    allure(results: [[path: 'target/allure-results']])
                }
            }
        }
    }
}
\`\`\`

In a downstream Jenkinsfile:

\`\`\`groovy
@Library('selenium-shared-library@main') _

seleniumTest(
    browser: 'chrome',
    gridUrl: 'http://selenium-grid:4444',
    label: 'linux-large'
)
\`\`\`

The downstream project's Jenkinsfile becomes three lines. All complexity lives in the shared library.

## Parameterized Build

Build parameters let users trigger tests with custom settings.

\`\`\`groovy
parameters {
    choice(name: 'BROWSER', choices: ['chrome', 'firefox', 'edge'], description: 'Browser')
    choice(name: 'ENV', choices: ['staging', 'qa'], description: 'Environment')
    string(name: 'TAGS', defaultValue: '@smoke', description: 'Test tags to run')
    booleanParam(name: 'CAPTURE_VIDEO', defaultValue: false, description: 'Record video')
    text(name: 'BASE_URL', defaultValue: 'https://staging.example.com', description: 'Override base URL')
}
\`\`\`

Triggering the job from the Jenkins UI shows a form. Parameters are accessible as \`params.BROWSER\` etc.

## Retry Strategies

For flaky tests at the pipeline level use retry blocks.

\`\`\`groovy
stage('Test') {
    steps {
        retry(2) {
            sh 'mvn test'
        }
    }
}
\`\`\`

This retries the entire mvn test command up to 2 times. Better: configure surefire to rerun failed tests.

\`\`\`xml
<plugin>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <rerunFailingTestsCount>2</rerunFailingTestsCount>
    </configuration>
</plugin>
\`\`\`

Surefire reruns individual failing tests, which is more efficient than retrying the entire build.

## Notifications

Jenkins integrates with Slack, Teams, email, and webhooks.

\`\`\`groovy
post {
    success {
        slackSend(
            channel: '#qa-builds',
            color: 'good',
            message: "PASSED: \${env.JOB_NAME} #\${env.BUILD_NUMBER} - \${env.BUILD_URL}"
        )
    }
    failure {
        slackSend(
            channel: '#qa-builds',
            color: 'danger',
            message: "FAILED: \${env.JOB_NAME} #\${env.BUILD_NUMBER} - \${env.BUILD_URL}\\n\${currentBuild.description ?: 'No description'}"
        )
        emailext(
            subject: "FAILED: \${env.JOB_NAME} #\${env.BUILD_NUMBER}",
            body: '''
                <p>Build failed.</p>
                <p><a href="\${BUILD_URL}">View Build</a></p>
                <p><a href="\${BUILD_URL}allure/">View Allure Report</a></p>
            ''',
            to: '\${DEFAULT_RECIPIENTS}',
            mimeType: 'text/html'
        )
    }
}
\`\`\`

## Multi-branch Pipeline

For repos with multiple feature branches, configure a Multibranch Pipeline. Jenkins scans the repo, discovers branches with Jenkinsfiles, and creates a sub-job for each.

In the Jenkinsfile, use \`env.BRANCH_NAME\` to vary behavior.

\`\`\`groovy
stages {
    stage('Test') {
        when {
            anyOf {
                branch 'main'
                branch 'develop'
                branch 'release/*'
            }
        }
        steps {
            sh 'mvn test'
        }
    }

    stage('Deploy report') {
        when { branch 'main' }
        steps {
            sh 'aws s3 sync target/allure-report s3://reports/main/'
        }
    }
}
\`\`\`

## Cron Triggers

Schedule periodic runs.

\`\`\`groovy
pipeline {
    triggers {
        cron('H 6 * * 1-5')  // Every weekday at 6 AM
        pollSCM('H/15 * * * *')  // Poll every 15 min
        upstream(upstreamProjects: 'backend-build', threshold: hudson.model.Result.SUCCESS)
    }
    // ...
}
\`\`\`

The H expression randomizes within the slot to spread load on the Jenkins controller.

## Common Patterns

\`\`\`groovy
// Skip tests for documentation-only PRs
when {
    not {
        changeset pattern: '**/*.md', caseSensitive: false
    }
}

// Run only on weekday nights
when {
    expression {
        def now = new Date()
        def cal = Calendar.getInstance()
        cal.setTime(now)
        return cal.get(Calendar.DAY_OF_WEEK) in [Calendar.MONDAY..Calendar.FRIDAY]
            && cal.get(Calendar.HOUR_OF_DAY) >= 22
    }
}

// Lock a shared resource
options {
    lock resource: 'staging-env'
}
\`\`\`

## Conclusion

Jenkins remains the right CI choice for Selenium pipelines in 2026 when you need control, scale, or have existing Jenkins fleets. The Pipeline DSL covers parallel browser matrices, Docker agents, Grid integration, and Allure publishing cleanly. For new teams without existing Jenkins infrastructure, managed CI like GitHub Actions or CircleCI is often easier.

If you are building a Jenkins pipeline today, start declarative, factor common code into a shared library early, and use parameterized builds for cross-cutting test variants. Browse the [skills directory](/skills) for Selenium AI agent skills and read [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide) for distributed runtime.
`,
};
