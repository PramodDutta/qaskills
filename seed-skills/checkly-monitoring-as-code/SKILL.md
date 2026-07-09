---
name: Checkly Monitoring as Code
description: Teach agents to build synthetic monitoring as code with Checkly, including Playwright browser checks, API checks, alerting, and CI deploy workflows.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [checkly, monitoring-as-code, synthetic-monitoring, playwright, api-checks, ci]
testingTypes: [e2e, performance, regression]
frameworks: [playwright]
languages: [typescript]
domains: [web, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Checkly Monitoring as Code Skill

You are a synthetic monitoring engineer who defines Checkly browser and API checks as code, keeps them close to product journeys, and deploys monitors through reviewable CI workflows.

## Core Principles

1. **Monitor customer outcomes**: A check should prove a user can complete an important action, not only that a server returns 200.
2. **Keep checks deterministic**: Synthetic traffic needs stable test data, idempotent actions, and predictable cleanup.
3. **Use Playwright skills carefully**: Browser checks should be short, resilient, and focused on availability and regression signals.
4. **Separate alerts from noise**: Alert only on failures that need response from an owner.
5. **Deploy checks through CI**: Treat monitor changes like application code.
6. **Use regions intentionally**: Pick regions that represent customers and dependencies.
7. **Measure latency budgets**: Track response time and page interaction time, not only pass or fail.
8. **Write operational runbooks**: Every critical check should tell responders what to inspect first.

## Setup

Install the Checkly CLI and Playwright dependency.

```bash
npm create checkly@latest synthetic-monitoring
cd synthetic-monitoring
npm install
npm install --save-dev @playwright/test
npx checkly --version
```

Authenticate locally only when needed.

```bash
npx checkly login
npx checkly test
npx checkly deploy
```

## Project Structure

Use a structure that separates checks, groups, snippets, and utilities.

```text
checkly/
  checks/
    browser/
      checkout.check.ts
      login.check.ts
    api/
      health.check.ts
      search.check.ts
  groups/
    production.group.ts
  snippets/
    auth.ts
    runbook.ts
  checkly.config.ts
package.json
```

## Browser Check

Keep browser checks short and user-centered.

```typescript
// checkly/checks/browser/login.check.ts
import { BrowserCheck, Frequency } from 'checkly/constructs';

new BrowserCheck('login-browser-check', {
  name: 'Login journey',
  activated: true,
  frequency: Frequency.EVERY_10M,
  locations: ['us-east-1', 'eu-west-1'],
  code: {
    entrypoint: './login.spec.ts',
  },
  environmentVariables: [
    { key: 'BASE_URL', value: 'https://example.com' },
  ],
});
```

```typescript
// checkly/checks/browser/login.spec.ts
import { expect, test } from '@playwright/test';

test('user can reach dashboard after login', async ({ page }) => {
  await page.goto(process.env.BASE_URL || 'https://example.com');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill(process.env.CHECKLY_USER || 'synthetic@example.com');
  await page.getByLabel('Password').fill(process.env.CHECKLY_PASSWORD || 'change-me');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

## API Check

Use API checks for fast service-level confidence.

```typescript
// checkly/checks/api/health.check.ts
import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs';

new ApiCheck('api-health-check', {
  name: 'API health',
  activated: true,
  frequency: Frequency.EVERY_1M,
  request: {
    method: 'GET',
    url: 'https://api.example.com/health',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('status').equals('ok'),
      AssertionBuilder.responseTime().lessThan(500),
    ],
  },
});
```

## Alerting Workflow

Route alerts to the right owner.

1. Production checkout failures page the on-call team.
2. Non-critical marketing page failures notify Slack only.
3. API latency budget failures open an incident if repeated.
4. Flaky checks are disabled only with a tracking issue.
5. Every alert message includes a runbook link.
6. Alert channels are tested after deployment.

## CI Deploy

Deploy checks after code review.

```yaml
name: checkly
on:
  push:
    branches: [main]
  pull_request:
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx checkly test
        env:
          CHECKLY_API_KEY: ${{ secrets.CHECKLY_API_KEY }}
          CHECKLY_ACCOUNT_ID: ${{ secrets.CHECKLY_ACCOUNT_ID }}
      - run: npx checkly deploy --force
        if: github.ref == 'refs/heads/main'
        env:
          CHECKLY_API_KEY: ${{ secrets.CHECKLY_API_KEY }}
          CHECKLY_ACCOUNT_ID: ${{ secrets.CHECKLY_ACCOUNT_ID }}
```

## Reference Table

| Check Type | Best For | Keep It Healthy |
|---|---|---|
| Browser check | Critical user journey | Use role locators and few steps |
| API check | Availability and contracts | Assert status, body, and latency |
| Heartbeat | Scheduled jobs | Alert on missing signal |
| Multistep check | Business workflow | Use stable synthetic accounts |
| Private location | Internal apps | Keep runners patched |
| Frequency setting | Cost and signal control | Match business criticality |

## Common Mistakes

1. Reusing long E2E regression tests as monitors.
2. Alerting on pages that no one owns.
3. Using real customer accounts.
4. Skipping cleanup for created data.
5. Running every check from one region only.
6. Not setting response time expectations.
7. Deploying monitor edits manually.
8. Hiding flaky checks without a ticket.
9. Forgetting runbooks.
10. Treating passing monitors as complete test coverage.

## Checklist

- [ ] Browser checks cover critical outcomes.
- [ ] API checks assert response body and latency.
- [ ] Synthetic accounts are safe and stable.
- [ ] Checkly changes run in pull requests.
- [ ] Main branch deploys monitors automatically.
- [ ] Alert routing matches service ownership.
- [ ] Regions match customer traffic.
- [ ] Runbooks are linked from alerts.
- [ ] Flaky checks have owners.
- [ ] Monitoring is reviewed with release readiness.
