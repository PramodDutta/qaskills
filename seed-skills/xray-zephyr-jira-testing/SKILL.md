---
name: Xray Zephyr Jira Testing
description: Teach agents to manage Jira test cases and executions with Xray and Zephyr, including issue modeling, JQL, and CI result publishing through REST APIs.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [jira, xray, zephyr, test-management, reporting, rest-api]
testingTypes: [strategy, reporting, acceptance]
frameworks: []
languages: [python, typescript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Xray Zephyr Jira Testing Skill

You are a test management engineer who organizes Jira-based test cases, links them to requirements, and publishes automated execution results to Xray or Zephyr with traceable REST integrations.

## Core Principles

1. **Model intent before tooling**: Define requirement, test, execution, defect, and release relationships before writing API code.
2. **Keep test cases atomic**: One test case should verify one behavior or acceptance rule.
3. **Use JQL as an operating tool**: Every dashboard and report should be backed by reviewable JQL.
4. **Automate result publishing**: CI should push pass, fail, skipped, and evidence links without manual copy paste.
5. **Preserve traceability**: Link tests to stories, defects, releases, and automation identifiers.
6. **Separate manual and automated status**: A manual test case can have automated executions without losing review ownership.
7. **Avoid duplicate cases**: Search existing test repositories before creating new cases.
8. **Report decision-ready signals**: Managers need coverage, execution status, defects, and risk, not raw noise.

## Setup

Create API credentials and store them in CI secrets.

```bash
export JIRA_BASE_URL='https://example.atlassian.net'
export JIRA_EMAIL='qa@example.com'
export JIRA_API_TOKEN='replace-me'
export XRAY_CLIENT_ID='replace-me'
export XRAY_CLIENT_SECRET='replace-me'
```

Install local helper dependencies.

```bash
python -m venv .venv
. .venv/bin/activate
pip install requests pydantic python-dotenv
npm install --save-dev @playwright/test
```

## Test Management Structure

Keep mapping files in source control.

```text
test-management/
  mappings/
    playwright-to-jira.json
    requirements-to-tests.csv
  queries/
    release-readiness.jql
  scripts/
    publish-xray-results.py
    publish-zephyr-results.ts
  reports/
    .gitkeep
```

## Jira Issue Model

Use this minimum model.

| Entity | Xray Name | Zephyr Name | Purpose |
|---|---|---|---|
| Requirement | Story or Task | Story or Task | Business behavior |
| Test case | Test | Test Case | Reusable verification |
| Test execution | Test Execution | Test Cycle | Run instance |
| Defect | Bug | Bug | Failed behavior |
| Release | Fix Version | Version | Reporting boundary |
| Automation id | Custom field or label | Custom field or label | CI mapping |

## JQL Examples

Use JQL to find coverage and execution gaps.

```text
project = QA AND issuetype = Test AND labels in (checkout) ORDER BY updated DESC
project = QA AND issuetype = Bug AND priority in (Highest, High) AND statusCategory != Done
project = QA AND fixVersion = "2026.07" AND issuetype = Test AND status != Deprecated
project = QA AND labels = automated AND "Automation Status" = Ready
```

## Xray Result Publishing

Publish JUnit XML or structured results to Xray after CI.

```python
# test-management/scripts/publish_xray_results.py
import os
import requests

base_url = os.environ["JIRA_BASE_URL"]
client_id = os.environ["XRAY_CLIENT_ID"]
client_secret = os.environ["XRAY_CLIENT_SECRET"]
junit_path = os.environ.get("JUNIT_PATH", "test-results/junit.xml")

token_response = requests.post(
    "https://xray.cloud.getxray.app/api/v2/authenticate",
    json={"client_id": client_id, "client_secret": client_secret},
    timeout=30,
)
token_response.raise_for_status()
token = token_response.json()

with open(junit_path, "rb") as report:
    response = requests.post(
        "https://xray.cloud.getxray.app/api/v2/import/execution/junit",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": report},
        timeout=60,
    )

response.raise_for_status()
print(response.json())
```

## Zephyr Result Publishing

Use a typed script for Zephyr Scale or Zephyr Squad integrations.

```typescript
// test-management/scripts/publish-zephyr-results.ts
type TestResult = {
  testCaseKey: string;
  status: 'Pass' | 'Fail' | 'Blocked' | 'Not Executed';
  comment?: string;
};

async function publishResult(result: TestResult): Promise<void> {
  const response = await fetch(`${process.env.JIRA_BASE_URL}/rest/atm/1.0/testrun`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ZEPHYR_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      testCaseKey: result.testCaseKey,
      status: result.status,
      comment: result.comment,
    }),
  });

  if (!response.ok) {
    throw new Error(`Zephyr publish failed: ${response.status}`);
  }
}

await publishResult({ testCaseKey: 'QA-T123', status: 'Pass', comment: 'CI run passed' });
```

## CI Workflow

Run tests, upload JUnit, then publish to Jira.

```yaml
name: acceptance-reporting
on:
  workflow_dispatch:
  push:
    branches: [main]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright test --reporter=junit
      - run: python test-management/scripts/publish_xray_results.py
        env:
          JIRA_BASE_URL: ${{ secrets.JIRA_BASE_URL }}
          XRAY_CLIENT_ID: ${{ secrets.XRAY_CLIENT_ID }}
          XRAY_CLIENT_SECRET: ${{ secrets.XRAY_CLIENT_SECRET }}
          JUNIT_PATH: test-results/junit.xml
```

## Common Mistakes

1. Creating duplicate test cases for the same requirement.
2. Publishing results without an automation id mapping.
3. Marking a test passed when setup failed.
4. Losing evidence links from CI.
5. Mixing release versions in one execution report.
6. Using dashboards with hidden JQL.
7. Forgetting skipped and blocked status.
8. Letting old cases stay active forever.
9. Creating test cases that are too broad.
10. Treating Jira as the only source of quality truth.

## Checklist

- [ ] Requirements link to test cases.
- [ ] Test cases have owners and clear steps.
- [ ] Automated tests map to Jira case keys.
- [ ] CI publishes result status and evidence.
- [ ] JQL queries support release dashboards.
- [ ] Failed executions link to defects.
- [ ] Skipped and blocked results are intentional.
- [ ] Duplicate cases are reviewed.
- [ ] Deprecated cases are archived.
- [ ] Release reports show coverage and risk.
