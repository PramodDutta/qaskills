import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Kiwi TCMS: Open-Source Test Management Guide',
  description: 'Kiwi TCMS guide for QA teams: deploy the open-source TCMS, model plans and runs, connect automation, and avoid migration traps in CI pipelines.',
  date: '2026-09-28',
  category: 'Guide',
  content: `
# Kiwi TCMS: Open-Source Test Management Guide

Kiwi TCMS is an active open-source test management system for manual and automated testing. The latest official release I verified is Kiwi TCMS 16.5, published on September 17, 2026. It is not renamed or abandoned. The core repository is maintained under the \`kiwitcms/Kiwi\` GitHub organization, the documentation is published as Kiwi TCMS 16.5 docs, and the project still publishes release notes, container information, automation plugins, and commercial subscription options.

For QA engineers, the direct value is that Kiwi TCMS gives you a self-hostable system for test plans, test cases, test runs, execution results, bug tracker links, dashboards, reports, and automation imports. It is especially attractive when you want more ownership than a SaaS-only test-management tool gives you, or when your AI coding agents need a structured source of truth for regression scenarios, exploratory charters, and automation coverage.

The important caveat is packaging. The official Community Edition container image is a rolling public image, while version-tagged, multi-arch, and Enterprise images are available to subscribers. That is not a small operational detail. If your organization requires pinned production artifacts, you should plan either for a subscription, your own internal image mirroring policy, or a clearly documented rolling-image upgrade process.

## Release And Packaging Reality

Kiwi TCMS 16.5 is a minor release with security-related updates and improvements. The release notes call out dependency updates, permission checks for uploaded files, visual login-page changes, and support for showing TestExecution attachments on the Test Run page when attachments are uploaded through the API. Enterprise 16.5-mt is based on Kiwi TCMS 16.5 and adds downstream features such as password-reset configuration, container tooling additions, and multi-tenant packaging changes.

| Item | Verified current status | Planning impact |
| --- | --- | --- |
| Latest release | Kiwi TCMS 16.5, September 17, 2026 | Use 16.5 docs for new evaluations |
| Core source | \`kiwitcms/Kiwi\` on GitHub | Community code is inspectable and active |
| Core license | GPL-2.0 in the main repository | Review compatibility before embedding or redistributing modified versions |
| Public container | \`pub.kiwitcms.eu/kiwitcms/kiwi:latest\` rolling image | Easy trial, weaker reproducibility |
| Versioned images | Subscriber-only according to release and container pages | Needed for regulated pinned deployments |
| Enterprise | Downstream edition with PostgreSQL, add-ons, tenants, and GitHub app support | Consider for hosted, private tenant, or support needs |

That packaging split is what many teams miss. "Open source" does not automatically mean "free versioned production container images forever." Kiwi TCMS is open source, and you can run Community Edition free of charge, but the project funds sustainability through subscriptions, private repositories, Enterprise images, hosted/private tenant options, support, and add-ons.

## Deployment Shape With Docker

The official Docker installation docs recommend running Kiwi TCMS as a containerized production instance. Their examples use Docker Compose because it is the easiest way to get started, not because Compose is the only production shape. The docs point Kubernetes users toward the Helm directory in the source code.

For Community Edition, the Docker setup creates a web container and a MariaDB container. Enterprise uses PostgreSQL. Docker Compose also creates persistent volumes for the database and uploaded files. That split is the first operational decision to document: backups must include both structured data and uploads.

| Deployment concern | Community Edition default | Enterprise note |
| --- | --- | --- |
| Web application | Kiwi TCMS container | Enterprise container includes downstream add-ons |
| Database | MariaDB in official compose example | PostgreSQL in Enterprise |
| Public access | Can be reached through host FQDN or localhost for setup | Enterprise requires FQDN, not raw IP address |
| Persistent data | Database volume and uploads volume | Same concern, often with tenant-aware storage |
| Upgrade command | Pull image, restart, then run \`/Kiwi/manage.py upgrade\` | Test upgrade on staging first |

This minimal Compose file is intentionally conservative. It mirrors the documentation concept without pretending to replace the official examples. Use the official repository files as your baseline when building a production stack.

\`\`\`yaml
services:
  kiwi_web:
    image: pub.kiwitcms.eu/kiwitcms/kiwi:latest
    container_name: kiwi_web
    depends_on:
      - kiwi_db
    ports:
      - "8443:8443"
    environment:
      KIWI_DB_HOST: kiwi_db
      KIWI_DB_PORT: 3306
      KIWI_DB_NAME: kiwi
      KIWI_DB_USER: kiwi
      KIWI_DB_PASSWORD: kiwi
    volumes:
      - kiwi_uploads:/Kiwi/uploads

  kiwi_db:
    image: mariadb:latest
    container_name: kiwi_db
    environment:
      MARIADB_DATABASE: kiwi
      MARIADB_USER: kiwi
      MARIADB_PASSWORD: kiwi
      MARIADB_ROOT_PASSWORD: root-password
    volumes:
      - kiwi_db_data:/var/lib/mysql

volumes:
  kiwi_db_data:
  kiwi_uploads:
\`\`\`

After the containers start, a new installation needs interactive initial setup. The docs use \`docker exec -it kiwi_web /Kiwi/manage.py initial_setup\`, and they warn that \`-t\` is often wrong for automated scripts because it allocates a pseudo-TTY. In CI or infrastructure automation, remove \`-t\` unless the command truly needs an interactive terminal.

\`\`\`bash
docker compose up -d
docker exec -it kiwi_web /Kiwi/manage.py initial_setup
docker exec -it kiwi_web /Kiwi/manage.py showmigrations
\`\`\`

For upgrades, the official flow is straightforward but non-negotiable: stop, pull, start, run \`upgrade\`, then check migrations. Skipping \`upgrade\` is the classic failure mode. The site may appear to boot while the database schema no longer matches the code.

\`\`\`bash
docker compose down
docker compose pull
docker compose up -d
docker exec -it kiwi_web /Kiwi/manage.py upgrade
docker exec -it kiwi_web /Kiwi/manage.py showmigrations
\`\`\`

The reader-visible command is simple, but the process around it is not. Take a database backup, preserve uploaded files, test the upgrade on staging, and record which image digest was running before and after. If you use the public rolling image, digest capture is your best reproducibility evidence.

## Data Model That QA Teams Actually Use

Kiwi TCMS has many entities, but most teams live in a smaller workflow: Product, Version, Build, Test Plan, Test Case, Test Run, Test Execution, and Bug. Understanding the difference between a plan, a case, and a run prevents messy migration imports and unhelpful dashboards.

| Entity | What it represents | Anti-pattern |
| --- | --- | --- |
| Product | The system or component under test | Creating a product for every sprint |
| Version | Product release line or branch | Using free-text version labels inconsistently |
| Build | Concrete tested build or deploy | Reusing one build forever |
| Test Plan | High-level strategy and grouping | Putting every step in the plan document |
| Test Case | Specific scenario with expected result | Duplicating the same case for every run |
| Test Run | Execution container for selected cases against a build | Treating a run as a permanent backlog |
| Test Execution | Result of a case inside a run | Updating status without comments or bug links |

The official guide says a Test Plan should identify which features of a product will be tested and describe the overall strategy. It should not become the place for detailed execution steps. Put those in Test Cases. Test Runs are then created from selected, confirmed cases attached to a plan and a build.

This structure helps AI coding agents because it separates intent from execution. A plan can tell Cursor or Claude Code what business capability is under test. Cases provide scenario-level acceptance detail. Runs provide the current execution state. Without that separation, an agent sees a pile of inconsistent issue descriptions and produces automation that mirrors the mess.

## Writing Cases That Survive Automation

A useful Kiwi TCMS case should be readable by a manual tester and reusable by automation. The docs emphasize setup instructions, clear actions, measurable expected results, and breakdown instructions. The measurable part is where teams often underinvest.

| Case field | Weak content | Strong content |
| --- | --- | --- |
| Summary | Login test | Locked user cannot create a session |
| Setup | User exists | User \`locked-user@example.com\` exists and account status is locked |
| Action | Try login | Submit valid password for locked account from the web login form |
| Expected result | It fails | Response shows locked-account message, no session cookie is issued, audit event is written |
| Breakdown | None | Delete generated audit fixture if the environment does not auto-clean |

If you are migrating from spreadsheets, do not import every row as a separate long-lived case. Normalize first. Remove duplicate variants that differ only by browser unless browser is the behavior under test. Use tags, components, categories, and plan membership to represent dimensions. Otherwise your first automation import will create hundreds of near-identical records that nobody trusts.

Here is a compact YAML format that a team can keep beside Playwright or pytest tests before syncing to Kiwi TCMS through the API. It is a team-owned staging format, not an official Kiwi import schema.

\`\`\`yaml
product: Billing Portal
version: 2026.09
plan: Subscription regression
cases:
  - external_id: billing-cancel-locked-user
    summary: Locked user cannot cancel a subscription
    category: security
    priority: high
    setup:
      - Account exists with active subscription
      - User account status is locked
    steps:
      - Open subscription settings
      - Attempt cancellation using valid credentials
    expected:
      - No cancellation request is created
      - User sees locked-account message
      - Audit event contains account_locked
\`\`\`

The value is reviewability. A coding agent can transform that into UI tests, API tests, or API synchronization scripts, but a test lead can still judge whether the scenario is meaningful.

## API And Plugin Automation

Kiwi TCMS exposes XML-RPC at \`https://your-kiwi-instance.com/xml-rpc/\` and JSON-RPC at \`https://your-kiwi-instance.com/json-rpc/\`. The official docs strongly recommend \`tcms-api\` as the Python client instead of hand-coding direct RPC calls. The latest \`tcms-api\` docs show installation with \`pip install tcms-api\`, optional Kerberos support, a minimal \`~/.tcms.conf\`, and direct constructor arguments supported after \`tcms-api\` v13.2.

\`\`\`ini
[tcms]
url = https://tcms.example.com/xml-rpc/
username = api-bot
password = replace-with-secret
\`\`\`

\`\`\`python
from tcms_api import TCMS

rpc = TCMS().exec

cases = rpc.TestCase.filter({'summary__startswith': 'Locked user'})
for case in cases:
    print(case['id'], case['summary'])
\`\`\`

The server-side API docs show methods such as \`TestPlan.create(values)\`, \`TestPlan.add_case(plan_id, case_id)\`, \`TestRun.create(values)\`, \`TestRun.filter(query)\`, and \`TestRun.get_cases(run_id)\`. That is enough to build a CI importer, but do not let an agent invent field IDs. Products, versions, builds, users, and plans should be looked up or created deliberately.

Kiwi also maintains automation framework plugins. The official organization pins repositories for \`junit.xml-plugin\`, \`pytest-plugin\`, \`robotframework-plugin\`, TAP, and JUnit. These plugins are not magic test runners. The project describes them as result parsers that talk back to Kiwi TCMS through \`tcms-api\`.

| Plugin | Verified install or usage | Best fit |
| --- | --- | --- |
| \`kiwitcms-pytest-plugin\` | \`pip install kiwitcms-pytest-plugin\`, then \`pytest -p tcms_pytest_plugin --kiwitcms\` | Python test suites that want direct reporting |
| \`kiwitcms-junit.xml-plugin\` | \`pip install kiwitcms-junit.xml-plugin\`, then \`tcms-junit.xml-plugin /path/to/junit.xml\` | Any tool that exports JUnit XML |
| \`kiwitcms-robotframework-plugin\` | \`pip install kiwitcms-robotframework-plugin\`, then Robot listener \`zealand.listener.KiwiTCMS\` | Robot Framework suites |
| \`tcms-api\` | \`pip install tcms-api\` | Custom synchronization, migration, and reporting scripts |

The pytest plugin currently documents v15.4 as its latest release from April 27, 2026. The JUnit XML plugin documents v15.0 from September 23, 2025. The Robot Framework plugin page I verified still lists v12.7 from December 10, 2023 as its latest changelog entry, which is older but still an official repository. Pin and test plugin behavior before rolling it into release reporting.

\`\`\`bash
python -m pip install tcms-api kiwitcms-pytest-plugin
pytest -p tcms_pytest_plugin --kiwitcms tests/
\`\`\`

\`\`\`bash
python -m pip install kiwitcms-junit.xml-plugin
pytest --junitxml reports/junit.xml tests/
tcms-junit.xml-plugin reports/junit.xml
\`\`\`

The JUnit XML path is often the most portable because Playwright, Cypress, pytest, Jest, Maven, Gradle, and many CI systems can produce or transform into JUnit XML. The tradeoff is that XML loses some framework-specific context unless you encode it into names, properties, or failure text.

## Robot And Pytest Mapping Details

Robot Framework has a convenient mapping pattern: test cases may specify a \`TC-xyz\` tag to map to an existing Kiwi TCMS TestCase. The plugin docs also show suite variables such as \`\${plan_id}\`, \`\${product}\`, and \`\${build_user_email}\`. If those are missing, the plugin attempts environment discovery based on the documented plugin behavior.

\`\`\`robotframework
*** Settings ***
Documentation   Billing portal smoke suite
Library         OperatingSystem

*** Variables ***
\${plan_id}      234
\${product}      Billing Portal

*** Test Cases ***
Locked User Cannot Cancel Subscription
    [Tags]    TC-607    billing    security
    Should Be Equal    locked    locked
\`\`\`

For pytest, decide whether the plugin should create or reuse cases from test names, docstrings, or explicit conventions. The v15.4 changelog says function docstrings are published as \`TestCase.text\`, which makes docstrings more important than usual. A generated test with a lazy docstring pollutes your TCMS. A precise docstring becomes useful living documentation.

\`\`\`python
def test_locked_user_cannot_cancel_subscription(api_client):
    """Locked user cannot cancel an active subscription.

    Expected result: the cancellation request is rejected, no subscription
    status changes are written, and an account_locked audit event exists.
    """
    response = api_client.post('/subscriptions/current/cancel', json={'reason': 'qa'})
    assert response.status_code == 423
    body = response.json()
    assert body['code'] == 'account_locked'
\`\`\`

The test example asserts a side effect through the application response only. In a real suite, also query the subscription record or audit endpoint before reporting success. A result imported into Kiwi TCMS is only as trustworthy as the assertions that produced it.

## GitHub, Jira, And Bug Tracker Integration

Kiwi TCMS supports internal bug tracking and external bug tracker integrations. The configuration docs list external tracker classes including Azure Boards, Bugzilla, JIRA, GitHub, GitLab, and Redmine, with Kiwi TCMS internal bug tracking available when the internal bug app is enabled. The administration docs say external bug trackers are configured through the admin interface under bug tracker settings, and implementation details live under \`tcms.issuetracker\`.

The integration scope is pragmatic:

| Capability | How Kiwi frames it | QA workflow |
| --- | --- | --- |
| 1-click bug report | Create a bug from TestExecution when possible, fall back to a pre-filled browser window | Failed manual execution becomes a linked defect |
| Automatic bug update | Link existing bug reports back to TestExecution, often by comment | Automation failures can carry traceability |
| Bug info display | Show contextual information on pages that display bugs | Test run review does not require opening every tracker tab |
| Configurable trackers | Dotted classes in \`EXTERNAL_BUG_TRACKERS\` | Admins can restrict or extend tracker options |

For GitHub specifically, there is an official \`kiwitcms/github-app\` repository. Its README states that the add-on is designed for Kiwi TCMS Enterprise and multi-tenant environments, communicates from GitHub through webhooks, and can add repositories as products, configure BugSystem records, skip forks, and add git tags as product versions. That is materially different from the simpler built-in GitHub issue tracker class.

For Jira, verify your actual deployment configuration. Kiwi TCMS has a JIRA integration class in the documented tracker list, and additional tracker integration is provided through add-ons. But Jira instances vary wildly across Cloud, Data Center, permissions, custom required fields, and workflow validators. A 1-click bug flow that works in a demo can fail in production if Jira requires fields Kiwi cannot infer.

## CI Reporting Pattern

The safest CI pattern is to treat Kiwi TCMS as the durable test-management record, not as the place where flaky automation is laundered into legitimacy. Run your tests, produce trustworthy results, import them, and fail the pipeline based on the test runner or a verified API response.

This GitHub Actions workflow uses current action majors and imports JUnit XML after pytest runs. It avoids shell variables inside \`with:\` inputs and keeps secrets in GitHub Actions secrets.

\`\`\`yaml
name: python-tests-to-kiwi

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-python@v7
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          python -m pip install pytest kiwitcms-junit.xml-plugin

      - name: Run tests
        run: pytest --junitxml reports/junit.xml tests/

      - name: Report to Kiwi TCMS
        env:
          TCMS_API_URL: \${{ secrets.TCMS_API_URL }}
          TCMS_USERNAME: \${{ secrets.TCMS_USERNAME }}
          TCMS_PASSWORD: \${{ secrets.TCMS_PASSWORD }}
          TCMS_PRODUCT: Billing Portal
          TCMS_PRODUCT_VERSION: main
          TCMS_BUILD: \${{ github.sha }}
        run: tcms-junit.xml-plugin reports/junit.xml
\`\`\`

If you use this with an AI coding agent, ask it to preserve the source of truth. It may add a new test file and a workflow, but it should not silently create new product names, versions, or builds on every run without your naming rules.

## Migration From TestRail, Spreadsheets, Or SaaS Tools

Kiwi TCMS is a realistic destination when your team wants open-source control, self-hosted data, and automation import options. It is not automatically a drop-in replacement for every SaaS workflow. Before migration, map concepts.

| Source concept | Kiwi TCMS target | Migration decision |
| --- | --- | --- |
| Suite | Product, plan type, or parent plan | Avoid creating one product per suite unless suites are separate products |
| Section | Test Plan hierarchy, category, component, or tag | Pick one primary navigation model |
| Case | Test Case | Deduplicate variants before import |
| Milestone | Version or Build depending on meaning | Use Version for release line, Build for tested artifact |
| Run | Test Run | Import only active or historically valuable runs |
| Defect link | Bug linked to TestExecution | Validate tracker URLs and permissions first |

Teams comparing tools should read broader market context like [best test management tools beyond TestRail](/blog/best-test-management-tools-beyond-testrail-2026), then evaluate Kiwi against their constraints. If the priority is managed workflow, vendor support, and a polished SaaS experience, a commercial platform such as PractiTest may be a better fit. The [PractiTest test management guide](/blog/practitest-test-management-guide-2026) is the right comparison point for that path.

The open-source advantage is control. The cost is operations. Someone owns the database, backups, upgrades, authentication, email, TLS, bug tracker credentials, plugin versions, and data hygiene. If nobody wants that job, hosted or commercial options may be cheaper in practice.

## Failure Mode: The Upgrade That Looks Fine Until Execution

A realistic Kiwi TCMS failure mode goes like this: the team uses the rolling Community image, runs \`docker compose pull\`, restarts containers, sees the login page, and assumes the upgrade is complete. Two days later, testers cannot update executions or automation imports fail with server errors. The root cause is that \`/Kiwi/manage.py upgrade\` was skipped, so migrations and post-upgrade adjustments did not finish.

Diagnosis should be systematic:

1. Check the running image digest and release notes.
2. Run \`showmigrations\` and verify no migrations are pending.
3. Inspect web container logs around the failing request.
4. Reproduce with a small API call, not the full automation plugin.
5. Restore staging from backup and replay the documented upgrade flow.

\`\`\`bash
docker inspect kiwi_web --format '{{.Image}}'
docker exec -it kiwi_web /Kiwi/manage.py showmigrations
docker logs kiwi_web --tail 200
\`\`\`

That first command uses Docker's Go template syntax, not a shell variable. It should print the image ID for the running container. Capture it with your release evidence when using rolling images.

## What People Get Wrong With Kiwi TCMS

The biggest mistake is treating Kiwi TCMS as a passive document dump. If you import messy spreadsheets, never confirm cases, never close obsolete plans, and let automation create inconsistent products or versions, the tool will faithfully preserve confusion. Test management systems amplify discipline. They do not create it by themselves.

The second mistake is over-automating the wrong layer. Automation plugins should report trustworthy results. They should not be the only place your test taxonomy exists. Keep naming rules, product/version/build semantics, and case ownership explicit. AI coding agents can help maintain those conventions, but they need the conventions in writing.

The third mistake is ignoring operational ownership because the software is open source. Backups, upgrades, SMTP, authentication, TLS certificates, uploaded artifacts, and bug tracker credentials are production responsibilities. If Kiwi TCMS becomes the official release evidence system, treat it like production infrastructure.

## Frequently Asked Questions

### Is Kiwi TCMS really free to use?

Kiwi TCMS Community Edition is open source and can be run free of charge, but the project also sells subscriptions, hosted/private tenant options, support, Enterprise packaging, and access to versioned or multi-arch container images. The public Community container is a rolling image. If you need pinned vendor images, warranty, or Enterprise add-ons, plan for a paid subscription rather than assuming all production conveniences are free.

### Can Kiwi TCMS replace TestRail?

It can replace TestRail for many teams that need plans, cases, runs, execution results, reports, bug links, and automation imports. The decision depends on hosting appetite, migration quality, permissions, reporting expectations, and integrations. Kiwi gives more control and open-source transparency. SaaS tools may offer less operational burden and more polished managed workflows. Run a pilot with real data before committing.

### Which automation plugin should a new team start with?

Start with the JUnit XML plugin if your ecosystem already emits JUnit XML because it works across many languages and CI systems. Use the pytest plugin when your Python suite should report directly and you are comfortable with plugin behavior. Use the Robot Framework plugin for Robot suites, especially when you can map tests to existing cases with \`TC-xyz\` tags. Pin plugin versions and test imports on staging.

### What should AI coding agents read from Kiwi TCMS?

Agents should read well-structured plans, cases, expected results, tags, components, and recent execution failures. That context helps them generate focused Playwright, pytest, API, or integration tests. Do not let agents treat Kiwi TCMS as an unchecked source of truth if the data is stale. Give them current case IDs, product/version rules, and explicit instructions for whether they may create, update, or only read records.
`,
};
