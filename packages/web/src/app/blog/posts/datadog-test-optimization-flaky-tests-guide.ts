import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Datadog Test Optimization: Flaky Test Detection and Test Impact Analysis',
  description: 'datadog test optimization guide for flaky test detection, retries, Test Impact Analysis, JUnit upload, pricing, and CI rollout decisions for QA teams.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Datadog Test Optimization: Flaky Test Detection and Test Impact Analysis

Datadog Test Optimization is Datadog's current product surface for test visibility, flaky-test management, Early Flake Detection, Auto Test Retries, and Test Impact Analysis. The product sits inside Datadog's broader CI/CD Optimization area, and the docs still mention older names in places: CI Visibility remains the billing and historical umbrella, while Test Impact Analysis was formerly called Intelligent Test Runner and some tags still contain \`itr\`.

For QA and test-automation engineers, the practical answer is this: use Datadog tracer instrumentation when you want rich test sessions, flaky detection, retries, code coverage based selection, and distributed trace context. Use \`datadog-ci junit upload\` when you only have JUnit XML and need visibility without runtime instrumentation. JUnit upload is useful, but it does not unlock every optimization feature that tracer-backed Test Optimization can provide.

As of the official docs I checked on September 28, 2026, Datadog supports .NET, Java/JVM, JavaScript and TypeScript, Python, Ruby, Swift, Go, and JUnit XML reporting across the Test Optimization surface, with feature support varying by language and tracer version. Pricing is listed by Datadog as Test Optimization per active Git committer per month, with Datadog's billing docs defining an active committer as a Git author email that makes at least three commits in a month. If your immediate pain is flaky triage, compare this guide with the [Trunk flaky tests detection guide](/blog/trunk-flaky-tests-detection-guide). If you are building model-assisted triage, the companion [AI flaky test detection guide](/blog/ai-flaky-test-detection-guide) is the better next read.

## The Current Datadog Surface Area

Datadog's test product has grown by layering. That is why names can be confusing. The UI area is CI/CD Optimization. The test-specific product is Test Optimization. Billing docs may still say CI Visibility. Some code and tags refer to \`civisibility\`, and Test Impact Analysis keeps traces of the old Intelligent Test Runner naming. None of that means the product is abandoned. It means your implementation should normalize names in your own codebase while preserving the environment variables and APIs Datadog actually documents.

| Capability | Current Datadog name | What it needs |
| --- | --- | --- |
| Test run visibility | Test Optimization | Tracer instrumentation or JUnit XML upload |
| Flaky status and lifecycle | Flaky Tests Management | Test history with stable test identifiers and Git metadata |
| New-test stress retries | Early Flake Detection | Supported tracer version and UI setting enabled |
| Failed-test automatic retries | Auto Test Retries | Supported tracer version and UI setting enabled |
| Selection by covered code | Test Impact Analysis | Tracer support, Git metadata, and coverage collection |
| Plain report ingestion | JUnit XML upload | \`datadog-ci junit upload\`, API key, service name, environment |
| Billing unit | Test Optimization committer | Active Git committer counted by Datadog billing rules |

\`\`\`bash
npm install --save-dev @datadog/datadog-ci@5.24.1
npx datadog-ci --version
\`\`\`

The \`@datadog/datadog-ci\` npm package is actively maintained, and npm listed \`5.24.1\` as latest when checked. Datadog recommends pinning an exact CLI version rather than floating on latest, which is good advice for CI. For tracer libraries, pin according to your language's normal dependency policy and upgrade deliberately because feature compatibility changes by tracer major.

## Instrumentation Versus JUnit Upload

The most important architecture choice is whether tests run with Datadog instrumentation or whether CI uploads test reports afterward. Instrumentation can capture session, module, suite, test, Git, duration, retry, coverage, and distributed trace data at runtime. JUnit upload parses XML after the fact. Both are valid, but they are not equivalent.

| Path | Strength | Limitation | Best use |
| --- | --- | --- | --- |
| JavaScript tracer | Automatic support for Jest, Mocha, Cucumber, Cypress, Playwright, Vitest, and WebdriverIO within documented versions | Requires correct \`NODE_OPTIONS\` and compatible Node or \`dd-trace\` major | Frontend and Node services with active test frameworks |
| Python tracer | Pytest via \`--ddtrace\`, unittest via \`ddtrace-run\` or patching | Fixture and retry behavior has framework-specific limits | Pytest-heavy service repos |
| Java tracer | Maven, Gradle, SBT, and JVM test frameworks with \`-javaagent\` | Build-tool injection can expose compiler plugin or offline repository issues | JVM monorepos and integration suites |
| JUnit XML upload | Works when a tool can produce JUnit reports | Not the same as full runtime Test Impact Analysis support | Legacy runners, phased adoption, external systems |
| Manual API | Covers custom frameworks | More code to own and subject to API specifics | Internal test harnesses |

\`\`\`yaml
name: datadog-junit-upload

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v7
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --reporter=junit --outputFile=junit.xml

      - name: Upload JUnit report to Datadog
        if: always()
        env:
          DATADOG_API_KEY: \${{ secrets.DATADOG_API_KEY }}
          DATADOG_SITE: datadoghq.com
          DD_ENV: ci
        run: npx datadog-ci junit upload --service web-app junit.xml
\`\`\`

That upload step intentionally uses \`if: always()\`. Datadog's JUnit upload docs call this out because CI often aborts after a failing test command. If failed XML never uploads, flaky detection and failure analysis become biased toward passing runs.

## JavaScript And TypeScript Setup

Datadog's JavaScript docs currently describe two compatibility tracks. \`dd-trace\` v6 requires Node.js 22 or later and supports modern versions of Jest, Mocha, Cucumber, Cypress, Playwright, Vitest, and WebdriverIO. \`dd-trace\` v5 supports older Node ranges and older framework versions. For new work on Node 22+, use the current major your organization has approved and follow the v6 initialization form from the docs.

\`\`\`json
{
  "scripts": {
    "test:unit": "vitest run --reporter=default",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "dd-trace": "6.10.0",
    "vitest": "5.0.2"
  }
}
\`\`\`

\`\`\`yaml
name: datadog-js-test-optimization

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DD_CIVISIBILITY_AGENTLESS_ENABLED: 'true'
      DD_API_KEY: \${{ secrets.DATADOG_API_KEY }}
      DD_SITE: datadoghq.com
      DD_ENV: ci
      DD_SERVICE: checkout-web
      DD_TEST_SESSION_NAME: unit-tests
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v7
        with:
          node-version: '22'

      - run: npm ci

      - name: Run instrumented Vitest
        env:
          NODE_OPTIONS: --import dd-trace/register.js -r dd-trace/ci/init
        run: npm run test:unit
\`\`\`

Datadog's docs warn against setting \`NODE_OPTIONS\` globally for the whole job because install steps can run before \`dd-trace\` exists. Keep \`NODE_OPTIONS\` on the test step. For Playwright, remember that Datadog can instrument test results, but browser-session visibility requires RUM instrumentation when you want network calls, user actions, page loads, and session replay linked to tests.

## Python And Java Setup Patterns

Python setup is straightforward for pytest: install \`ddtrace\`, set the Datadog environment variables, and run pytest with \`--ddtrace\`. If you want APM integrations inside tests, add \`--ddtrace-patch-all\`. For unittest, Datadog documents \`ddtrace-run python -m unittest\`.

\`\`\`yaml
name: datadog-python-test-optimization

on:
  pull_request:

jobs:
  pytest:
    runs-on: ubuntu-latest
    env:
      DD_CIVISIBILITY_AGENTLESS_ENABLED: 'true'
      DD_API_KEY: \${{ secrets.DATADOG_API_KEY }}
      DD_SITE: datadoghq.com
      DD_ENV: ci
      DD_SERVICE: billing-api
      DD_TEST_SESSION_NAME: pytest-unit
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v7
        with:
          python-version: '3.13'

      - run: python -m pip install -U pip ddtrace pytest

      - name: Run pytest with Datadog
        run: pytest --ddtrace --junitxml=reports/junit.xml
\`\`\`

Java and JVM setup uses the Datadog Java tracer as a \`-javaagent\`. Datadog docs list common variables such as \`DD_CIVISIBILITY_ENABLED=true\`, \`DD_CIVISIBILITY_AGENTLESS_ENABLED=true\`, \`DD_API_KEY\`, \`DD_SITE\`, \`DD_ENV\`, \`DD_SERVICE\`, and \`DD_TEST_SESSION_NAME\`. The exact injection differs for Maven, Gradle, SBT, and direct JVM commands.

\`\`\`yaml
name: datadog-java-test-optimization

on:
  pull_request:

jobs:
  maven:
    runs-on: ubuntu-latest
    env:
      DD_CIVISIBILITY_ENABLED: 'true'
      DD_CIVISIBILITY_AGENTLESS_ENABLED: 'true'
      DD_API_KEY: \${{ secrets.DATADOG_API_KEY }}
      DD_SITE: datadoghq.com
      DD_ENV: ci
      DD_SERVICE: payments-service
      DD_TEST_SESSION_NAME: maven-tests
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: '21'

      - name: Download Datadog Java tracer
        run: |
          mkdir -p .datadog
          curl -L --fail https://dtdg.co/latest-java-tracer -o .datadog/dd-java-agent.jar

      - name: Run Maven tests
        env:
          MAVEN_OPTS: -javaagent:.datadog/dd-java-agent.jar
        run: mvn test
\`\`\`

If Java tests fail only with the agent attached, do not immediately disable Test Optimization. Datadog documents several diagnostic angles: verify the tracer configuration line appears in logs, enable debug logging, check agentless keys, and disable optional integrations or compiler plugin auto-configuration only when they are the confirmed cause.

## Flaky Tests Management, Early Flake Detection, And Auto Retries

Datadog defines a flaky test as one that shows both passing and failing status for the same commit. That commit-specific definition matters. It separates nondeterminism from "the code is actually broken." Flaky Tests Management then helps prioritize by failure rate, first and last flaked dates, average duration, and failure impact.

Early Flake Detection is prevention. It retries newly added tests before they merge so Datadog can mark a new test flaky when at least one attempt fails. Datadog docs say new tests can be retried up to ten times, and tests slower than five minutes are not retried by the mechanism. Auto Test Retries is damage control. It retries failing tests up to a configured count so a known or newly observed flake does not immediately fail the build.

| Feature | Primary question | Key setup | Risk if misused |
| --- | --- | --- | --- |
| Flaky Tests Management | Which tests are already untrustworthy? | Consistent test IDs and Git metadata | Treating the dashboard as a backlog nobody owns |
| Early Flake Detection | Is this new test flaky before merge? | Enable in CI/CD Optimization settings and use compatible tracer | Slower PRs if many new tests are expensive |
| Auto Test Retries | Can CI survive nondeterministic failures? | Enable in settings and tune retry env vars | Masking real regressions if retries are treated as fixes |
| Dynamic Auto Test Retries for Python | How many retries should each failing pytest receive? | \`ddtrace\` version support and \`DD_CIVISIBILITY_DYNAMIC_ATR_ENABLED=true\` | Retry budgets become opaque without reporting |

\`\`\`bash
export DD_CIVISIBILITY_FLAKY_RETRY_ENABLED=true
export DD_CIVISIBILITY_FLAKY_RETRY_COUNT=3
export DD_CIVISIBILITY_TOTAL_FLAKY_RETRY_COUNT=100
export DD_CIVISIBILITY_FLAKY_RETRY_ONLY_KNOWN_FLAKES=true
pytest --ddtrace
\`\`\`

For JavaScript, Ruby, .NET, Go, Python, Java, and Swift, Datadog documents feature compatibility by tracer version. Always check your language page before adding retry variables. A variable that exists for one tracer may be ignored or behave differently elsewhere.

## Test Impact Analysis Without False Confidence

Test Impact Analysis selects tests based on the code changed and the code each test covers. Datadog's docs describe it as automatically running only relevant tests for a commit, using coverage and Git metadata. The old Intelligent Test Runner name still appears in some tags, so seeing \`itr\` in configuration or facets does not mean you are on an obsolete feature.

The strong version of Test Impact Analysis requires runtime instrumentation and coverage support. JUnit XML upload can show results, but it cannot infer per-test code coverage after execution in the same way a tracer can. Your rollout should prove three things before letting skipped tests affect merge decisions: Git metadata is present, coverage is being collected for the supported framework, and skipped-test accounting is visible in Datadog.

\`\`\`bash
export DD_CIVISIBILITY_AGENTLESS_ENABLED=true
export DD_API_KEY=\${DATADOG_API_KEY}
export DD_SITE=datadoghq.com
export DD_ENV=ci
export DD_SERVICE=checkout-web
export DD_CIVISIBILITY_ITR_ENABLED=true
export NODE_OPTIONS='--import dd-trace/register.js -r dd-trace/ci/init'
npm run test:unit
\`\`\`

What people get wrong: they evaluate Test Impact Analysis by wall-clock time alone. A faster job is not proof that the right tests ran. Inspect Datadog's skipped-test facets, compare against changed files, and run scheduled full suites. Selection systems need a truth source, and full runs remain that source.

## JUnit XML Upload For Gradual Adoption

JUnit upload is the easiest first step for teams with existing reports. Install \`@datadog/datadog-ci\`, set \`DATADOG_API_KEY\`, \`DATADOG_SITE\`, and \`DD_ENV\`, then upload with \`datadog-ci junit upload --service <service> <path>\`. Datadog's docs list \`--tags\`, \`--measures\`, \`--report-measures\`, and \`--xpath-tag\` for richer metadata.

\`\`\`bash
export DATADOG_API_KEY=\${DATADOG_API_KEY}
export DATADOG_SITE=datadoghq.com
export DD_ENV=ci
npx datadog-ci junit upload --service inventory-api --tags team:platform reports/junit
\`\`\`

The main failure mode is invalid or incomplete XML. Datadog troubleshooting docs say reports may be discarded when timestamps are too old or a testsuite lacks a name. Reports larger than 250 MiB may not process completely. For generated XML, validate that each testcase has a stable suite and name, and include source file metadata when you want code owners.

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="checkout.unit" tests="1" failures="0" time="0.042">
  <testcase classname="checkout.pricing" name="applies_member_discount" time="0.042" file="tests/checkout/pricing.test.ts" />
</testsuite>
\`\`\`

If your uploader succeeds but Test Health is empty, check Git metadata. Datadog uses CI variables and the local \`.git\` folder to associate runs with repositories, branches, commits, and committers. In GitHub Actions, shallow checkout can reduce available context. Use full checkout when test optimization data quality matters.

## Pricing And Cost Controls

Datadog's official pricing page lists Test Optimization starting at a per-committer monthly price, with annual and on-demand numbers shown on the page. The pricing comparison page lists Test Optimization separately from Pipeline Visibility and Code Coverage, also by active Git committer. Billing docs define a billable committer as a Git author email that makes at least three commits in a month, and note that verified bots or actions performed directly in the GitHub UI are automatically excluded.

Do not estimate cost from test count alone. The test session volume can affect ingestion limits and operational noise, but the public pricing unit for Test Optimization is active committers. Cost planning should therefore include repository scope, bot identity hygiene, contractors, mono-repo commit patterns, and whether Code Coverage or Pipeline Visibility are separate line items in your Datadog account.

| Cost lever | Why it matters | Control |
| --- | --- | --- |
| Active human committers | Primary public Test Optimization billing unit | Review Billing & Committers in Datadog |
| Bot commits | Verified bots are excluded by Datadog billing docs | Use verified bot identities and avoid shared human emails |
| Repository scope | More repos can mean more active committers | Roll out by service tier, not all at once |
| JUnit-only noise | Low-quality uploads reduce value | Require stable suite names and Git metadata |
| Coverage add-ons | Code Coverage is listed separately | Confirm account-level packaging before promising savings |

Cost control should not mean hiding failed tests from Datadog. It should mean onboarding the repositories where the signal will be used, fixing metadata quality, and removing duplicate uploads from the same logical run.

## Failure Mode: Tests Run But Datadog Shows Nothing Useful

The most common bad rollout looks successful in CI: the job passes, the tracer package installed, and no one sees an obvious error. Then Datadog shows missing sessions, ungrouped tests, no Test Health, or no flaky history. The likely causes are environment variables scoped to the wrong step, \`NODE_OPTIONS\` set before dependencies exist, no Git metadata, unsupported framework versions, or JUnit reports missing suite names.

Diagnosis should be boring. Confirm the test process itself receives Datadog env vars. Confirm \`DD_CIVISIBILITY_AGENTLESS_ENABLED=true\` is paired with a valid \`DD_API_KEY\`. Confirm \`DD_SITE\` matches your Datadog site. Confirm checkout includes Git history. Confirm tests are within documented framework versions. Then enable tracer debug logging only long enough to capture configuration and transport errors.

\`\`\`bash
node -e "console.log(process.env.DD_SERVICE || 'missing DD_SERVICE')"
node -e "console.log(process.env.NODE_OPTIONS || 'missing NODE_OPTIONS')"
git rev-parse HEAD
git log -1 --pretty=format:%ae
npx datadog-ci junit upload --service debug-service --dry-run reports/junit
\`\`\`

AI coding agents tend to "fix" this by moving env vars to the job level. That can break Node installs or leak instrumentation into helper scripts. Prefer the smallest scope that reaches the test process, then add an explicit smoke check that verifies the variables are present immediately before the runner starts.

## A Rollout Sequence For QA Teams

Start with visibility, then prevention, then acceleration. Uploading JUnit XML or enabling tracer instrumentation gives the team a shared view of failures and durations. Flaky Tests Management helps choose repair work. Early Flake Detection prevents new flaky tests from entering main. Auto Test Retries reduces disruption while owners fix known flakes. Test Impact Analysis belongs later, once coverage, Git metadata, and full-suite comparison are trustworthy.

| Phase | Datadog feature | Done when |
| --- | --- | --- |
| Visibility | Tracer setup or JUnit upload | Test sessions show service, env, branch, commit, suite, and test names |
| Ownership | CODEOWNERS and tags | Teams can filter their own tests and triage failures |
| Flake cleanup | Flaky Tests Management | Top offenders have owners and tickets |
| Prevention | Early Flake Detection | New flaky tests are visible before merge |
| Resilience | Auto Test Retries | Retry behavior is measured, not used to ignore debt |
| Acceleration | Test Impact Analysis | Skips are explainable and full-run audits remain healthy |

This sequence works well with Claude Code, Cursor, and Copilot because each phase has verifiable artifacts. Ask the agent for one small CI change, one metadata improvement, or one flaky-test workflow at a time. Large, cross-language rewrites are where test observability integrations become brittle.

## Frequently Asked Questions

### Is Datadog Test Optimization the same as CI Visibility?

Not exactly. CI Visibility is the older and broader wording still visible in billing, environment variables, and some docs. Test Optimization is the current product area for test-level visibility, flaky-test workflows, retries, and Test Impact Analysis. CI/CD Optimization is the larger Datadog UI area. In implementation, keep the documented variables such as \`DD_CIVISIBILITY_AGENTLESS_ENABLED\`, but describe the initiative to engineers as Datadog Test Optimization.

### Can JUnit XML upload enable Test Impact Analysis?

JUnit XML upload is useful for sending test results to Datadog, especially during gradual adoption, but it is not equivalent to tracer-backed instrumentation. Test Impact Analysis relies on knowing which code each test covers and comparing that with Git changes. For that, use the Datadog library setup documented for your language and framework. Keep JUnit upload for visibility, legacy runners, or migration phases where runtime instrumentation is not available yet.

### Should Auto Test Retries fail the build after all retries fail?

Yes. Auto Test Retries is meant to reduce disruption from nondeterministic failures, not make failures disappear. A test that fails every retry should still fail the build because it is likely a real regression or a severe flake that cannot be trusted. Track retry counts as a quality signal. If retries become normal for a service, assign ownership and fix the tests instead of raising retry limits indefinitely.

### How do I estimate Datadog Test Optimization cost?

Use Datadog's current pricing and billing pages, not test count guesses. Public pricing lists Test Optimization by active Git committer per month, and billing docs define active committers as Git author emails with at least three commits in the month. Review CI/CD Optimization Billing & Committers inside Datadog, verify bot exclusions, and confirm whether Pipeline Visibility or Code Coverage are separate products in your contract.
`,
};
