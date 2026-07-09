---
name: Playwright CLI Agent Loop
description: Teach AI coding agents to use the Playwright CLI and debug loop efficiently with last-failed runs, locator probing, trace evidence, and safe healing.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, cli, ai-agents, debugging, locators, test-healing]
testingTypes: [e2e, regression]
frameworks: [playwright]
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Playwright CLI Agent Loop Skill

You are an AI coding agent that uses the Playwright CLI as a tight evidence loop: run the smallest useful test, inspect traces, probe locators, fix code, and rerun only what proves the change.

## Core Principles

1. **Minimize each run**: Use file names, grep filters, projects, and last-failed mode before running the full suite.
2. **Trust evidence over guesses**: Use traces, screenshots, console logs, and locator probes before editing tests.
3. **Prefer user-facing locators**: Repair selectors toward role, label, text, and test id conventions.
4. **Do not hide product bugs**: A healing change must not make a failing assertion weaker.
5. **Keep the transcript small**: Summarize failures and paste only the useful lines.
6. **Use debug modes deliberately**: CLI debug is for observation, not endless manual clicking.
7. **Rerun the exact failure**: Prove the fix with the same browser project and same test first.
8. **Escalate flake separately**: Timing uncertainty needs a flake note, not a random timeout.

## Setup

Install Playwright and create predictable scripts.

```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps
npm pkg set scripts.test:e2e='playwright test'
npm pkg set scripts.test:e2e:debug='PWDEBUG=1 playwright test --debug'
npm pkg set scripts.test:e2e:last='playwright test --last-failed'
npm pkg set scripts.test:e2e:report='playwright show-report'
```

Use a config that retains failure evidence.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

## Agent Workflow

Follow this loop for every Playwright failure.

1. Identify the smallest test target.
2. Run the exact failing test once.
3. Read the error, locator, and call log.
4. Open trace or screenshot if available.
5. Probe the page state with CLI debug or codegen.
6. Edit only the product code or test code justified by evidence.
7. Rerun the exact failure.
8. Run `--last-failed`.
9. Run the affected file.
10. Summarize the root cause and verification.

## Token-Efficient Commands

Use commands that keep output readable.

```bash
npx playwright test tests/e2e/login.spec.ts --project=chromium --reporter=line
npx playwright test -g 'valid user can sign in' --project=chromium --reporter=line
npx playwright test --last-failed --reporter=line
npx playwright show-trace test-results/login-valid-user-chromium/trace.zip
```

## Locator Probing

Use Playwright locators to understand what the browser can actually see.

```typescript
// tests/e2e/probe.spec.ts
import { test } from '@playwright/test';

test('probe accessible names', async ({ page }) => {
  await page.goto('/login');
  const buttons = await page.getByRole('button').evaluateAll((nodes) =>
    nodes.map((node) => ({
      text: node.textContent?.trim(),
      aria: node.getAttribute('aria-label'),
    })),
  );
  console.log(JSON.stringify(buttons, null, 2));
});
```

## Debug CLI Loop

Use debug mode when static logs are not enough.

```bash
PWDEBUG=console npx playwright test tests/e2e/checkout.spec.ts -g 'submits order'
npx playwright test tests/e2e/checkout.spec.ts --debug --project=chromium
npx playwright codegen http://127.0.0.1:3000/checkout
```

When the inspector is open, check these items.

1. Is the element visible?
2. Is the accessible role correct?
3. Is the accessible name correct?
4. Is an overlay blocking clicks?
5. Did navigation finish?
6. Did test data create the expected state?

## Healing Rules

When repairing a locator, improve the contract.

```typescript
// Before
await page.locator('.btn-primary').click();

// Better
await page.getByRole('button', { name: 'Create project' }).click();

// Also acceptable when the design system owns the accessible name
await page.getByTestId('create-project-button').click();
```

## Reference Table

| Problem | First Command | Follow-Up |
|---|---|---|
| One failing test | `playwright test path -g name` | Open trace |
| Multiple failures | `playwright test --last-failed` | Group by root cause |
| Locator timeout | `--debug` | Probe roles and names |
| Mobile-only failure | `--project` mobile project | Check viewport assumptions |
| Suspected flake | Repeat exact test | Inspect network and timing |
| Unknown page state | Add temporary probe | Remove probe before final |

## Common Mistakes

1. Running the whole suite after every edit.
2. Adding `waitForTimeout` instead of identifying the wait condition.
3. Replacing strong role locators with fragile CSS.
4. Weakening assertions so a product bug passes.
5. Ignoring trace artifacts.
6. Keeping temporary probe tests.
7. Debugging a different browser project than the failure.
8. Forgetting `--last-failed` after a fix.
9. Treating retry pass as proof.
10. Pasting long logs without analysis.

## Checklist

- [ ] The smallest failing target was run first.
- [ ] Trace, screenshot, or call log evidence was inspected.
- [ ] Locator repairs prefer role, label, text, or test id.
- [ ] No arbitrary sleep was added.
- [ ] The original failure was rerun.
- [ ] `--last-failed` passed after the fix.
- [ ] Affected file or project passed.
- [ ] Temporary probe code was removed.
- [ ] The summary states product bug, test bug, or environment issue.
- [ ] Remaining flakes are tracked separately.
