---
name: Playwright test.step & Reporting
description: Teaches the agent to structure tests with test.step, attach evidence and annotations via test.info, use soft assertions, and produce readable, debuggable Playwright HTML reports.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, test-step, reporting, annotations, attachments, soft-assertions, test-info, traceability]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Playwright test.step & Reporting

This skill makes the agent produce tests that *explain themselves in the report*. Instead of a flat wall of actions, the agent groups logical phases with `test.step`, attaches screenshots/JSON/diffs via `testInfo.attach`, records `annotations` for traceability, and uses `expect.soft` to collect multiple failures in one run. When a test fails in CI, a human should understand what happened from the HTML report alone.

Use this skill when writing non-trivial flows, when a test is hard to debug from its output, or when the user mentions reports, steps, annotations, attachments, or issue traceability.

## Core Principles

1. **Every logical phase is a `test.step`.** Steps appear as a collapsible tree in the HTML report with timings, turning a failure into "which step failed" instead of "which line number."
2. **Attach evidence, do not just log it.** `console.log` is invisible in the report; `testInfo.attach` puts screenshots, JSON, and text into the report next to the step.
3. **Use `expect.soft` to gather multiple defects** in one execution, but end critical paths with a hard assertion or `expect.poll` so the test still fails.
4. **Annotate for traceability.** Link tests to issues/requirements with `annotation`, and use `test.info().annotations` to surface skips/known-issues in the report.
5. **Steps should be named like a test plan** — imperative, business-readable ("Add Pro plan to cart"), not "click button #3".
6. **Box internal helper steps** so a failure points at the caller, not deep inside the helper.

## Workflow / Patterns

### Pattern 1 — Structure a flow with `test.step`

Steps nest and report their own duration. Return values from a step to chain them.

```typescript
import { test, expect } from '@playwright/test';

test('checkout flow', async ({ page }) => {
  await test.step('Sign in', async () => {
    await page.goto('https://shop.example.com/login');
    await page.getByLabel('Email').fill('buyer@example.com');
    await page.getByLabel('Password').fill('Secret123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Welcome back')).toBeVisible();
  });

  const orderId = await test.step('Place order for Pro plan', async () => {
    await page.getByRole('link', { name: 'Pro plan' }).click();
    await page.getByRole('button', { name: 'Buy now' }).click();
    await page.getByRole('button', { name: 'Confirm purchase' }).click();
    const id = await page.getByTestId('order-id').textContent();
    return id!.trim();
  });

  await test.step(`Verify order ${orderId} in history`, async () => {
    await page.goto('https://shop.example.com/orders');
    await expect(page.getByText(orderId)).toBeVisible();
  });
});
```

### Pattern 2 — Attach evidence with `testInfo.attach`

Attachments render inline in the HTML report. Attach a screenshot, the API response, or a computed diff at the moment it matters.

```typescript
test('attaches evidence to the report', async ({ page }, testInfo) => {
  await page.goto('https://example.com/dashboard');

  await test.step('Capture dashboard state', async () => {
    // Screenshot attachment (shown inline in the report).
    await testInfo.attach('dashboard.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    // JSON attachment — the raw API payload behind the screen.
    const widgets = await page.evaluate(() => (window as any).__WIDGETS__ ?? []);
    await testInfo.attach('widgets.json', {
      body: JSON.stringify(widgets, null, 2),
      contentType: 'application/json',
    });

    // Plain-text attachment for a human-readable note.
    await testInfo.attach('environment.txt', {
      body: `Project: ${testInfo.project.name}\nBase URL: ${page.url()}`,
      contentType: 'text/plain',
    });
  });
});
```

### Pattern 3 — Soft assertions to collect multiple failures

`expect.soft` records the failure and keeps going. End the test with `expect(test.info().errors).toHaveLength(0)` or a hard check so it still fails — and the report shows *every* problem at once.

```typescript
test('validates a form with soft assertions', async ({ page }) => {
  await page.goto('https://example.com/profile');

  await test.step('Verify all profile fields at once', async () => {
    await expect.soft(page.getByLabel('Display name')).toHaveValue('Ada Lovelace');
    await expect.soft(page.getByLabel('Email')).toHaveValue('ada@example.com');
    await expect.soft(page.getByLabel('Timezone')).toHaveValue('UTC');
    await expect.soft(page.getByRole('img', { name: 'Avatar' })).toBeVisible();
  });

  // Hard gate: fail the test if any soft assertion failed.
  expect(test.info().errors).toHaveLength(0);
});
```

### Pattern 4 — Annotations for traceability and known issues

Annotations attach metadata to a test; they show up in the report and JSON output. Use them to link issues and to document why something is skipped.

```typescript
test('payment retries on gateway 503', async ({ page }) => {
  test.info().annotations.push(
    { type: 'issue', description: 'https://github.com/acme/app/issues/4821' },
    { type: 'suite', description: 'payments-regression' },
  );

  await page.goto('https://example.com/pay');
  await expect(page.getByRole('button', { name: 'Pay' })).toBeEnabled();
});

test('legacy export still works', async ({ page }) => {
  test.skip(process.env.LEGACY !== 'on', 'Legacy export disabled in this env');
  test.info().annotations.push({ type: 'known-issue', description: 'Slow > 5s, tracked in #5102' });
  await page.goto('https://example.com/export');
  await expect(page.getByText('Export ready')).toBeVisible({ timeout: 30_000 });
});
```

### Pattern 5 — Box helper steps so failures point at the caller

A `boxed` step collapses its internals in the report; the error is reported at the step call site, not buried in shared helper code.

```typescript
import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await test.step(
    `Log in as ${email}`,
    async () => {
      await page.goto('https://example.com/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByTestId('user-menu')).toBeVisible();
    },
    { box: true }, // failure surfaces at this step, internals collapsed
  );
}

test('admin can open settings', async ({ page }) => {
  await loginAs(page, 'admin@example.com', 'Admin123!');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
```

### Pattern 6 — Configure rich reporters

Wire up reporters in `playwright.config.ts`. The HTML reporter consumes the steps, attachments, and annotations above; JSON/JUnit feed CI dashboards.

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    // Auto-capture trace + screenshot on failure — they attach to the report.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

## Best Practices

1. **Wrap each logical phase in `test.step`** with a business-readable, imperative name — the report becomes a living test plan.
2. **Attach the artifact that explains the failure** (screenshot, response JSON, diff) at the step where it is relevant, via `testInfo.attach`.
3. **Set `trace: 'retain-on-failure'` and `screenshot: 'only-on-failure'`** so failing tests carry full debugging context automatically.
4. **Use `expect.soft` for grouped, independent checks**, then add a hard `expect(test.info().errors).toHaveLength(0)` gate.
5. **Push `issue`/`known-issue` annotations** to keep traceability between tests and tickets visible in the report.
6. **Box shared helpers** so a failure inside login/setup points at the calling test, not the helper internals.
7. **Return values from steps** to pass IDs/tokens forward and keep the flow linear.

## Anti-Patterns

1. **A 60-line test with no steps.** A failure gives a line number and nothing else; reviewers cannot tell which phase broke.
2. **`console.log` for evidence.** Logs are not in the HTML report. Use `testInfo.attach`.
3. **`expect.soft` everywhere with no hard gate.** The test goes green while assertions silently failed. Always end with a hard check.
4. **Steps named after mechanics** ("click", "fill input") instead of intent ("Submit signup form").
5. **Attaching full-page screenshots on every step of a passing test** — bloats the report. Attach on failure or at key checkpoints.
6. **Skipping tests with bare `test.skip()` and no reason** — the report shows a skip with no explanation. Always pass a reason string.
7. **Deep nesting of unnamed anonymous steps** that obscure rather than clarify the flow.

## When to Trigger This Skill

- "Make my Playwright test report readable / easier to debug"
- "Group my test into steps" / "use `test.step`"
- "Attach a screenshot or JSON to the Playwright report"
- "How do I do soft assertions in Playwright?"
- "Add annotations / link tests to Jira or GitHub issues"
- "Why can't I tell which step failed in CI?"
- "Set up the HTML / JUnit / JSON reporter"
- "Capture a trace only when a test fails"
