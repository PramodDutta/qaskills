---
name: WebdriverIO E2E Testing
description: Build WebdriverIO E2E suites — wdio.conf.ts setup, $ and $$ selectors, auto-wait and waitUntil, Mocha framework structure, page objects, parallel capabilities, and services for visual testing and Appium mobile.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [webdriverio, wdio, e2e, selenium, appium, mocha, page-object, parallel, typescript]
testingTypes: [e2e, integration]
frameworks: [webdriverio, mocha, appium]
languages: [typescript, javascript]
domains: [web, mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# WebdriverIO E2E Testing

This skill makes an AI agent write and configure WebdriverIO (WDIO) end-to-end tests: a correct `wdio.conf.ts`, `$`/`$$` selector usage with auto-waiting, `waitUntil` for custom conditions, Mocha-structured specs, page objects, parallel execution via `maxInstances` and multiple capabilities, and service wiring (visual regression, Appium for mobile). Trigger it when a repo contains `@wdio/cli` in devDependencies, a `wdio.conf.*` file, or the user asks for WebdriverIO/WDIO tests.

## Core Principles

1. **WDIO commands auto-wait — do not add manual pauses.** `$('button').click()` retries until the element is interactable (governed by `waitforTimeout`). `browser.pause()` in committed code is a bug, not a fix.
2. **`$` returns a chainable element, not a handle.** Re-locating happens on each command, so stale-element errors are rare. Store the selector chain, never an awaited snapshot, in page objects.
3. **Use WDIO selector strengths in priority order:** accessibility-ish text selectors (`button=Submit`, `*=partial`), then `data-testid` via `[data-testid="x"]`, then CSS. Reach for XPath only for parent-axis traversal.
4. **One spec = one user-visible behavior.** WDIO workers isolate per spec file; long multi-journey specs serialize your suite and hide which behavior broke.
5. **Parallelism is config, not code.** `maxInstances` + the `capabilities` array fan out across browsers; specs must not share accounts or mutable server state.
6. **Services do the heavy lifting.** Visual diffs (`@wdio/visual-service`), Appium (`@wdio/appium-service`), and Selenium Grid wiring belong in `services:`, not hand-rolled in hooks.

## Setup

```bash
npm init wdio@latest .   # interactive scaffold
# or manual:
npm install --save-dev @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter tsx
```

```typescript
// wdio.conf.ts
import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  runner: 'local',
  specs: ['./test/specs/**/*.ts'],
  maxInstances: 5,
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: process.env.CI ? ['--headless=new', '--disable-gpu', '--window-size=1366,900'] : [],
      },
    },
  ],
  logLevel: 'warn',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  waitforTimeout: 10_000,        // default $ auto-wait budget
  connectionRetryTimeout: 120_000,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 60_000 },

  // Fail fast in CI, keep full runs locally
  bail: process.env.CI ? 1 : 0,

  afterTest: async function (_test, _context, { passed }) {
    if (!passed) {
      await browser.takeScreenshot(); // attached to the runner log dir
    }
  },
};
```

## Selectors and Auto-Wait

```typescript
// test/specs/login.spec.ts
import { browser, $, expect } from '@wdio/globals';

describe('login', () => {
  beforeEach(async () => {
    await browser.url('/login'); // resolves against baseUrl
  });

  it('signs in with valid credentials', async () => {
    await $('[data-testid="email"]').setValue('user@example.com');
    await $('[data-testid="password"]').setValue('s3cret!');
    await $('button=Sign in').click();           // text selector, auto-waits

    // expect-webdriverio assertions retry until timeout — no manual waits
    await expect($('h1')).toHaveText('Dashboard');
    await expect(browser).toHaveUrl(expect.stringContaining('/dashboard'));
  });

  it('shows a validation error for a bad password', async () => {
    await $('[data-testid="email"]').setValue('user@example.com');
    await $('[data-testid="password"]').setValue('wrong');
    await $('button=Sign in').click();

    const alert = $('[role="alert"]');
    await expect(alert).toBeDisplayed();
    await expect(alert).toHaveText(expect.stringContaining('Invalid credentials'));
  });
});
```

`$$` for collections:

```typescript
const rows = $$('[data-testid="cart-row"]');
await expect(rows).toBeElementsArrayOfSize(3);
const titles = await rows.map((row) => row.$('.title').getText());
```

## waitUntil for Custom Conditions

Use only when no built-in matcher fits (e.g., polling app state):

```typescript
await browser.waitUntil(
  async () => (await $('[data-testid="job-status"]').getText()) === 'COMPLETE',
  {
    timeout: 30_000,
    interval: 500,
    timeoutMsg: 'job never reached COMPLETE',
  },
);
```

## Page Objects

```typescript
// test/pageobjects/login.page.ts
import { $, browser } from '@wdio/globals';

class LoginPage {
  // getters return fresh chainable selectors — never cache awaited elements
  get email()    { return $('[data-testid="email"]'); }
  get password() { return $('[data-testid="password"]'); }
  get submit()   { return $('button=Sign in'); }

  async open() {
    await browser.url('/login');
  }

  async login(email: string, password: string) {
    await this.email.setValue(email);
    await this.password.setValue(password);
    await this.submit.click();
  }
}

export default new LoginPage();
```

```typescript
// usage
import LoginPage from '../pageobjects/login.page';

it('logs in', async () => {
  await LoginPage.open();
  await LoginPage.login('user@example.com', 's3cret!');
  await expect($('h1')).toHaveText('Dashboard');
});
```

## Parallel + Multi-Browser Capabilities

```typescript
// wdio.conf.ts (excerpt)
maxInstances: 6,
capabilities: [
  { browserName: 'chrome',  'goog:chromeOptions': { args: ['--headless=new'] } },
  { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] }, maxInstances: 2 },
],
```

Each spec file runs in its own worker; `maxInstances` caps concurrency globally, the per-capability `maxInstances` caps per browser. Shard further in CI with `--spec` globs per job.

## Services

```typescript
// visual regression
// npm i -D @wdio/visual-service
services: [['visual', {
  baselineFolder: './test/baseline',
  screenshotPath: './test/screenshots',
  blockOutStatusBar: true,
}]],
```

```typescript
// in a spec
await expect(browser).toMatchFullPageSnapshot('dashboard', { misMatchTolerance: 0.2 });
```

```typescript
// Appium mobile (native or mobile web)
// npm i -D @wdio/appium-service
services: ['appium'],
capabilities: [{
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Pixel_8_API_34',
  'appium:app': './apps/app-release.apk',
}],
```

## CI (GitHub Actions)

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 20, cache: npm }
    - run: npm ci
    - run: npm run start:test &   # app under test
    - run: npx wait-on http://localhost:3000
    - run: npx wdio run wdio.conf.ts
      env: { CI: 'true' }
    - uses: actions/upload-artifact@v4
      if: failure()
      with: { name: wdio-screenshots, path: ./test/screenshots }
```

## Best Practices

- Keep `waitforTimeout` at 10-15s; raise per-call (`{ timeout }` arg) for known-slow flows instead of globally.
- Use `expect-webdriverio` matchers (`toHaveText`, `toBeDisplayed`) — they retry; bare `getText()` + chai does not.
- Reset state via API calls in `before` hooks, not UI click-throughs.
- Name specs by behavior: `checkout-applies-coupon.spec.ts`, not `test1.spec.ts`.
- Pin browser versions in CI (chrome-for-testing) to stop drive-by breakage.

## Anti-Patterns

1. `browser.pause(3000)` anywhere in committed code — replace with a matcher or `waitUntil`.
2. Caching `const el = await $(sel)` in a variable across navigations — re-locate via getters.
3. One mega-spec covering login→cart→checkout→refund — kills parallelism and triage.
4. Asserting with non-retrying chai on async UI — flake factory.
5. Driving Appium and desktop web in one capability set without separating configs — split `wdio.web.conf.ts` / `wdio.mobile.conf.ts` sharing a base.

## When to Trigger This Skill

- "Write WebdriverIO tests for X" / "add a wdio spec"
- Repo has `wdio.conf.ts|js` or `@wdio/cli` dependency
- Migrating Selenium JS or Protractor suites to WDIO
- Setting up visual regression or Appium through WDIO services
