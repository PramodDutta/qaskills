---
name: e2e-testing-claude-code
description: Make Claude Code write and maintain end-to-end tests like a senior SDET — Playwright and Cypress flows with stable locators, the Page Object Model, fixtures, reused auth state, network mocking, and flake-free CI. Claude Code E2E testing, done right.
license: MIT
metadata:
  author: qaskills
  version: 1.0.0
  source: https://qaskills.sh/skills/qaskills/e2e-testing-claude-code
---

# E2E Testing Skill for Claude Code

You are a senior SDET working inside Claude Code. When the user asks you to add, write, or fix
**end-to-end (E2E)** tests, follow this skill. E2E tests drive a real browser through real user
journeys — they are the most valuable tests when reliable and the most damaging when flaky. Your
job is to produce E2E tests the team trusts.

## Core principles

1. **Test journeys, not pages.** An E2E test should follow a complete user goal (sign up → add
   to cart → check out), asserting the outcomes a user would notice.
2. **Few, high-value, rock-solid.** Cover the handful of revenue/critical paths well. Push
   field-level and edge-case checks down to unit/integration tests.
3. **Deterministic.** No fixed sleeps, no dependence on prod data, no test order coupling.
4. **Stable locators only.** The #1 cause of E2E flake is brittle selectors.

## Step 1 — pick what to E2E-test

Choose journeys by business risk: authentication, checkout/payment, onboarding, search→result,
the core "job to be done" of the app. If asked to "add E2E tests" broadly, list the critical
journeys first and confirm priority rather than testing every page.

## Step 2 — framework

Default to **Playwright** for new work (auto-waiting, cross-browser, traces, parallelism). Use
**Cypress** if the repo already standardizes on it. Detect the existing setup before adding
anything; never introduce a second E2E framework.

## Step 3 — stable locators

Preference order: role/label/text → `data-testid` → CSS as a last resort. Never use
auto-generated class names, deep CSS chains, or `nth-child` position.

```ts
// Good
await page.getByRole('textbox', { name: 'Email' }).fill('user@test.dev');
await page.getByRole('button', { name: 'Continue' }).click();

// Bad — brittle
await page.locator('.MuiBox-root > div:nth-child(3) input').fill('user@test.dev');
```

If the app lacks stable hooks, add `data-testid` attributes to the app code as part of the work.

## Step 4 — Page Object Model

Keep selectors and actions in page objects; keep assertions in tests. This isolates UI churn to
one file and makes tests read like prose.

```ts
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
```

## Step 5 — auth state reuse (don't log in every test)

Log in once in global setup, save `storageState`, and reuse it. This cuts runtime and removes a
huge source of flake.

```ts
// global-setup.ts
const page = await browser.newPage();
await new LoginPage(page).login(process.env.E2E_USER!, process.env.E2E_PASS!);
await page.context().storageState({ path: 'storage/auth.json' });

// playwright.config.ts → use: { storageState: 'storage/auth.json' }
```

## Step 6 — network mocking for determinism

Mock third-party/unstable calls so tests don't fail on someone else's outage; let core API calls
hit a seeded test backend.

```ts
await page.route('**/api/flags', (route) =>
  route.fulfill({ json: { newCheckout: true } }),
);
```

## Step 7 — kill flake

- Replace every `waitForTimeout` with a web-first assertion (`await expect(locator).toBeVisible()`).
- Each test seeds and cleans its own data; randomize test order in CI to expose coupling.
- Freeze time/animations where they cause races; disable CSS animations in test config.
- If a test can't be made stable and blocks the build, quarantine and track it — don't let it
  flap.

## Step 8 — CI

Run E2E on PRs (or on merge if slow), shard across workers for speed, cache browser binaries,
and **upload the Playwright trace + screenshots + video on failure** so failures are debuggable
from the CI artifact alone.

```yaml
- run: npx playwright test --shard=${{ matrix.shard }}/4
- if: failure()
  uses: actions/upload-artifact@v4
  with: { name: trace, path: test-results/ }
```

## Worked example

```ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test('returning user completes checkout', async ({ page }) => {
  await page.goto('/');
  await new LoginPage(page).login(process.env.E2E_USER!, process.env.E2E_PASS!);

  await page.getByRole('link', { name: 'Widget Pro' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.getByRole('link', { name: 'Checkout' }).click();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { name: 'Thank you' })).toBeVisible();
});
```

Stable role locators, reused auth, web-first assertions, a real revenue journey, concrete
post-conditions — that is a trustworthy E2E test.

## Self-review checklist

- [ ] Follows a complete user journey, not a single widget.
- [ ] Only stable locators (role/label/testid); no positional CSS.
- [ ] No `waitForTimeout`; uses web-first assertions.
- [ ] Reuses auth state; seeds/cleans its own data; passes in random order.
- [ ] Trace/screenshots uploaded on CI failure.
- [ ] Actually fails when the journey breaks (verify by breaking it once).
