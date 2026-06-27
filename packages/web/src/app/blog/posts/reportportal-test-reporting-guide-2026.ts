import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "ReportPortal Setup: AI-Powered Test Reporting & Analytics (2026)",
  description: "ReportPortal test reporting guide: self-host with Docker, wire up pytest, Java, and JS agents, push launches via the REST API, and use ML auto-analysis.",
  date: "2026-06-26",
  category: "CI/CD",
  content: `# ReportPortal Setup: AI-Powered Test Reporting & Analytics (2026)

ReportPortal is an open-source test reporting server that aggregates results from every framework into one dashboard and uses machine learning to triage failures. You self-host it with Docker Compose, point a language **agent** at it with an API token and project name, and each test run becomes a **launch** the UI groups, trends, and analyzes. The headline feature is **Auto-Analysis**: a built-in ML service compares new failures against your history and labels each a Product Bug, Automation Bug, or System Issue before a human looks. The rest of this guide covers Docker setup, agents, the REST API, and the analyzer.

ReportPortal is sponsored by EPAM and ships under Apache 2.0, so the full platform — including the ML analyzer — is free to self-host with no per-seat cost. That is why it shows up in so many enterprise QA stacks: the depth of a commercial TestOps tool without the licensing.

## What ReportPortal Actually Does

Most CI runners give you a wall of pass/fail logs that vanish when the job rotates out. ReportPortal is the layer that *persists and reasons about* those results, built around a small vocabulary worth learning before you touch the config:

| Concept | What it is |
|---|---|
| **Launch** | One execution of a test suite (one CI run). The top-level grouping unit. |
| **Test item** | A suite, test, or step nested inside a launch (arbitrarily deep). |
| **Log** | A message or attachment (screenshot, har, stack trace) attached to a test item. |
| **Defect type** | The classification of a failure: Product Bug, Automation Bug, System Issue, No Defect, To Investigate. |
| **Filter** | A saved query over launches/items that powers dashboards and widgets. |

Every framework agent maps its own concepts onto this model — a pytest module becomes a suite test item, a Cypress spec becomes a launch, a JUnit \`@Test\` becomes a step. Once data is in this shape, ReportPortal can do the things raw logs cannot: trend a flaky test across 200 runs, diff two launches, and feed failures to the analyzer.

## Self-Hosting with Docker Compose

The supported way to run ReportPortal is the official \`docker-compose.yml\` — a multi-service stack (API gateway, core Java services, UI, PostgreSQL, OpenSearch for logs, RabbitMQ, MinIO for binary storage, and the Python \`analyzer\`). You do not install these piecemeal; you pull the composed file and bring it up.

\`\`\`bash
# Pull the official compose file
curl -LO https://raw.githubusercontent.com/reportportal/reportportal/master/docker-compose.yml

# Bring the whole stack up
docker compose -p reportportal up -d --force-recreate
\`\`\`

The first boot takes a few minutes while PostgreSQL migrations and OpenSearch indices initialize. Once it settles, the UI is on \`http://localhost:8080\`; log in with the seeded superadmin (\`superadmin\` / \`erebus\` by default — **change this immediately** in Administrate → Users).

A few production-grade adjustments you almost always make in the compose file:

\`\`\`yaml
# excerpt from docker-compose.yml — resource & retention tuning
services:
  api:
    environment:
      JAVA_OPTS: '-Xmx1g -XX:+UseG1GC'
  opensearch:
    environment:
      OPENSEARCH_JAVA_OPTS: -Xms512m -Xmx512m # logs index — size to your volume
  analyzer:
    image: reportportal/service-auto-analyzer:5.13.0 # pin the analyzer version
\`\`\`

OpenSearch is the memory hog — it holds every log line you ship, so give it real heap and a persistent volume or log search degrades as the suite grows. **Pin image tags** to a specific release (the \`5.x\` line is current) instead of \`latest\`, since the services share a schema and a half-upgraded stack refuses to start.

> One gotcha: ReportPortal's services must all be on the same minor version. If you upgrade the API but leave the analyzer or UI on an older tag, the API rejects requests with a version-mismatch error. Bump every \`reportportal/service-*\` image together.

## Generating an API Token

Every agent and every API call authenticates with a personal **API token** (an access token), not your password. Generate one in the UI under your **Profile** page, in the "API Keys" / "Access token" section, and pass it as a Bearer token:

\`\`\`http
Authorization: Bearer rp_9f3a...your-token...
\`\`\`

Treat this token like a password — it carries your permissions on every project you belong to. In CI, inject it as a masked secret (\`RP_API_KEY\`) and never commit it; revoke and regenerate from the same page if one leaks.

## Wiring Up Framework Agents

ReportPortal does not scrape stdout — you install a first-party **agent** for your framework that streams results over the API as the run happens. There are 40+ official agents; here are the three highest-traffic ecosystems.

### Python — pytest

Install \`pytest-reportportal\`, then configure a \`pytest.ini\` (or \`pyproject.toml\`) with the four required keys:

\`\`\`ini
# pytest.ini
[pytest]
rp_endpoint = http://localhost:8080
rp_project  = my_team
rp_api_key  = \${RP_API_KEY}     # from env / CI secret
rp_launch   = Regression Suite
\`\`\`

\`\`\`bash
pip install pytest-reportportal

# the --reportportal flag activates the plugin for this run
pytest --reportportal -v
\`\`\`

The plugin maps pytest's collection tree onto launches and test items, ships \`logging\` records as ReportPortal logs, and attaches anything you log via the \`pytest_reportportal\` log handler. Failures with tracebacks arrive as ERROR-level logs on the corresponding test item, which is exactly what the analyzer reads.

### Java — TestNG / JUnit

For the JVM, ReportPortal provides \`agent-java-testng\`, \`agent-java-junit5\`, and others, all driven by a single \`reportportal.properties\` on the classpath:

\`\`\`properties
# src/test/resources/reportportal.properties
rp.endpoint = http://localhost:8080
rp.project  = my_team
rp.api.key  = \${env.RP_API_KEY}
rp.launch   = Regression Suite
rp.enable   = true
\`\`\`

\`\`\`xml
<!-- TestNG listener wiring (testng.xml) -->
<suite name="Regression">
  <listeners>
    <listener class-name="com.epam.reportportal.testng.ReportPortalTestNGListener"/>
  </listeners>
  <!-- your <test>/<classes> entries -->
</suite>
\`\`\`

The listener hooks TestNG's lifecycle so \`@BeforeMethod\`, \`@Test\`, and assertion failures all map to nested test items. ReportPortal ships maintained agents for both TestNG and JUnit 5, so the harness choice does not constrain your reporting.

### JavaScript — Jest, Playwright, Cypress

The JS agents live under the \`@reportportal/*\` npm scope. Jest uses a custom reporter:

\`\`\`js
// jest.config.js
module.exports = {
  reporters: [
    'default',
    [
      '@reportportal/agent-js-jest',
      {
        endpoint: 'http://localhost:8080/api/v1',
        project: 'my_team',
        apiKey: process.env.RP_API_KEY,
        launch: 'Regression Suite',
      },
    ],
  ],
};
\`\`\`

Playwright (\`@reportportal/agent-js-playwright\`) and Cypress (\`@reportportal/agent-js-cypress\`) follow the same shape — a reporter/plugin entry with \`endpoint\`, \`project\`, \`apiKey\`, and \`launch\`. The Playwright agent is particularly useful because it ships traces and screenshots as attachments, so a failed visual step is one click from its evidence.

| Ecosystem | Agent package | Config file |
|---|---|---|
| pytest | \`pytest-reportportal\` | \`pytest.ini\` / \`pyproject.toml\` |
| TestNG / JUnit 5 | \`agent-java-testng\` / \`agent-java-junit5\` | \`reportportal.properties\` |
| Jest | \`@reportportal/agent-js-jest\` | \`jest.config.js\` |
| Playwright | \`@reportportal/agent-js-playwright\` | \`playwright.config.ts\` |
| Cypress | \`@reportportal/agent-js-cypress\` | \`cypress.config.js\` |

## The REST API: Custom Integrations

When no agent fits — a bespoke runner, a shell harness, or enriching a launch from CI — you talk to the REST API directly. ReportPortal exposes a versioned API (the interactive Swagger contract lives at \`http://<host>:8080/api\`). The core flow is: **start a launch → log items → finish the launch.**

\`\`\`bash
HOST=http://localhost:8080
PROJECT=my_team
TOKEN=$RP_API_KEY

# 1. Start a launch — returns the launch UUID
LAUNCH=$(curl -s -X POST "$HOST/api/v1/$PROJECT/launch" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
        "name": "nightly-smoke",
        "startTime": "'"$(date -u +%FT%TZ)"'",
        "mode": "DEFAULT",
        "attributes": [{"key": "branch", "value": "main"}]
      }' | jq -r '.id')

# 2. Finish the launch
curl -s -X PUT "$HOST/api/v1/$PROJECT/launch/$LAUNCH/finish" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "endTime": "'"$(date -u +%FT%TZ)"'" }'
\`\`\`

Note the path shape: \`/api/v1/{projectName}/launch\` — the project name is part of the URL, not a query param. The \`attributes\` array tags launches with metadata (branch, environment, commit SHA) that you later filter and group dashboards by, which is the single most useful habit for keeping a busy project navigable.

### Importing JUnit XML

If your runner already produces **JUnit XML** (and almost all do), you can skip the agent entirely and POST the report as a zip to the import endpoint — ReportPortal parses it into a full launch:

\`\`\`bash
# Zip the JUnit report and import it as a launch
zip -r results.zip ./test-results/*.xml

curl -X POST "$HOST/api/v1/$PROJECT/launch/import" \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "file=@results.zip"
\`\`\`

This is the pragmatic on-ramp: wire up nothing in your test code, just have CI zip the JUnit output and curl it after the run. You lose live streaming and rich logs, but get launches, trends, and analysis from data you already generate. JUnit XML is the lingua franca of most CI dashboards — the [GitHub Actions CI/CD testing guide](/blog/github-actions-testing-ci-cd-guide) covers the upstream side of producing it.

## AI-Powered Auto-Analysis: How It Decides

The feature that distinguishes ReportPortal from a plain dashboard is the **Auto-Analysis** service (\`service-auto-analyzer\`, a Python service backed by OpenSearch). When a launch finishes, the analyzer takes each failed test item and asks: *have I seen a failure that looks like this before, and how was it classified?* A confident match in your history auto-applies that defect type and links to the prior occurrence. The mechanics:

- **Indexing.** Every failure's log message and stack trace is tokenized and stored in OpenSearch as you classify launches over time. This index *is* the analyzer's memory.
- **Similarity matching.** On a new failure, the analyzer runs a similarity query (term frequency over the error text, with configurable thresholds) against that index.
- **Classification.** A match above the confidence threshold inherits the prior **defect type** — \`PB\` (Product Bug), \`AB\` (Automation Bug), \`SI\` (System Issue), \`ND\` (No Defect). No match stays **\`TI\` (To Investigate)** for a human.

You tune the behavior per-project under **Project Settings → Auto-Analysis**:

| Setting | Effect |
|---|---|
| **Auto-Analysis on/off** | Run the analyzer automatically when a launch finishes. |
| **Minimum should match (%)** | Similarity threshold — higher = fewer, more confident matches. |
| **Analyzer mode** | \`ALL_LAUNCHES\`, \`LAUNCH_NAME\` (only same-named launches), or \`CURRENT_LAUNCH\`. |
| **Number of log lines** | How much of the stack trace to compare (or \`-1\` for the full message). |

There is also **Pattern Analysis** — define a regex or string (e.g. \`Connection refused\`) and ReportPortal flags every failure whose log matches it, regardless of history. That is the deterministic complement to the ML analyzer: Pattern Analysis for *known* infrastructure signatures, Auto-Analysis for the fuzzy "this looks like that flaky test from Tuesday" judgement.

The honest framing: this is similarity-based ML, not a large language model reasoning about your code. It is excellent at deduplicating recurring failures and terrible at novel ones (which is correct — novel failures *should* land in To Investigate). The value compounds: the more you classify by hand early on, the more the analyzer gets right later. For teams drowning in flaky-test triage, that recurring-failure dedup is the entire payoff.

## A Realistic CI Integration

Here is how a GitHub Actions job runs pytest, ships to ReportPortal, and gates on the result:

\`\`\`yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      RP_API_KEY: \${{ secrets.RP_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt pytest-reportportal
      - name: Run tests and report to ReportPortal
        run: |
          pytest --reportportal \\
            -o rp_endpoint=https://reportportal.acme.internal \\
            -o rp_project=web_team \\
            -o rp_launch="CI \${{ github.ref_name }} #\${{ github.run_number }}"
\`\`\`

The \`-o\` flags override \`pytest.ini\` keys inline, letting you template the launch name from the branch and run number so every launch in the UI is self-describing. Because the agent streams live, you can open the launch and watch tests turn green or red while the job is still running.

## ReportPortal vs Allure vs Plain CI Dashboards

A common question is where ReportPortal sits relative to Allure (a report *generator*) and a CI runner's native test tab. They solve overlapping but distinct problems:

| Tool | Model | Persistence | ML triage |
|---|---|---|---|
| **ReportPortal** | Live server, central DB | Permanent, cross-run trends | Yes (analyzer) |
| **Allure** | Static HTML generated per run | Per-run artifact (you host history) | No |
| **CI native (Actions/GitLab)** | Tab on the build page | Until the build rotates out | No |

Allure produces a beautiful self-contained report for a single run with zero infrastructure. ReportPortal is a stateful service you operate, and in exchange you get cross-run trending, a queryable history, team-wide dashboards, and the analyzer. Pick Allure when you want a polished artifact attached to each build with no server to run; pick ReportPortal when failure triage across hundreds of runs is the bottleneck and you can host the stack. Many teams run both — Allure for the per-PR artifact, ReportPortal for the org-wide source of truth.

If you are still assembling the reporting layer of your stack, browse the [QA skills directory](/skills) for ReportPortal, pytest, Playwright, and CI/CD skills you can hand straight to an AI coding agent, or compare reporting and analytics tooling on the [comparisons hub](/compare).

## Frequently Asked Questions

### Is ReportPortal free, and what does self-hosting actually cost?

ReportPortal is fully open source under Apache 2.0, including the ML auto-analyzer — no per-seat or feature licenses. Your real cost is the infrastructure to run the Docker Compose stack: a few CPU cores and several GB of RAM (OpenSearch and the JVM services are the heavy consumers), plus persistent volumes for PostgreSQL, OpenSearch, and MinIO. A small team fits on one mid-size VM; large suites with deep log retention need more OpenSearch memory and disk.

### How does ReportPortal's auto-analysis differ from an LLM analyzing my tests?

The auto-analyzer is a similarity-matching service backed by OpenSearch, not a large language model. It tokenizes each failure's error message and stack trace, compares them against failures you have already classified, and inherits the defect type of confident matches above your configured threshold. It excels at deduplicating recurring and flaky failures but intentionally leaves novel failures in "To Investigate" — it pattern-matches history rather than reasoning about your source code.

### Do I have to use a ReportPortal agent, or can I just send JUnit XML?

You can do either. The richest experience comes from a framework agent (\`pytest-reportportal\`, \`agent-java-testng\`, \`@reportportal/agent-js-jest\`, etc.) that streams results live with logs and attachments. But if you already produce JUnit XML, you can zip it and POST to the \`/api/v1/{project}/launch/import\` endpoint with no test-code changes — you trade live streaming and rich logs for a zero-instrumentation on-ramp.

### What is a "launch" in ReportPortal?

A launch is one execution of a test suite — typically one CI run — and it is the top-level unit everything else nests under. Inside a launch you have test items (suites, tests, steps) and logs (messages and attachments), and ReportPortal trends, diffs, and analyzes data at the launch level. Tagging launches with attributes like branch, environment, and commit SHA is what keeps a busy project's history navigable.

### Why does ReportPortal refuse to start after I upgrade?

The most common cause is a version mismatch between services. ReportPortal's API, UI, and analyzer share a schema and must all run on the same minor version, so bumping one \`reportportal/service-*\` image while leaving others on an older tag causes startup failures. Always upgrade every service image together and pin exact tags rather than using \`latest\`, since \`latest\` can pull mismatched versions across services.

### Can ReportPortal integrate with Jira to file bugs from failures?

Yes — ReportPortal has a built-in Bug Tracking System integration (Jira, Azure DevOps, Rally) configured per project. Once connected, you can create or link a ticket directly from a failed test item, and the analyzer's defect-type classification feeds that workflow by surfacing which failures are genuine Product Bugs worth filing. The integration posts the failure context (logs, attachments, launch link) into the ticket so the developer has evidence without leaving the tracker.
`,
};
