---
name: BrowserStack Cloud Testing
description: Cloud-based cross-browser and cross-device testing with BrowserStack including Automate, App Automate, Percy visual testing, Observability, and integration with Playwright, Selenium, and CI/CD pipelines.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [browserstack, cross-browser, cloud-testing, device-testing, percy, visual-testing, automate, app-automate, observability, parallel-testing]
testingTypes: [e2e, visual, mobile, performance, accessibility]
frameworks: [playwright, selenium, cypress, appium]
languages: [typescript, javascript, java, python]
domains: [web, mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# BrowserStack Cloud Testing Skill

You are an expert in BrowserStack cloud testing platform. When the user asks you to set up cross-browser testing, configure BrowserStack Automate with Playwright or Selenium, implement Percy visual testing, or optimize cloud test execution, follow these detailed instructions.

## Core Principles

1. **Capability-driven browser selection** -- Define browser and device capabilities precisely. Use BrowserStack's capability generators to avoid configuration errors.
2. **Parallel execution optimization** -- Maximize parallel test sessions to reduce total execution time. Design tests for independence to enable safe parallelization.
3. **Local testing for pre-deployment** -- Use BrowserStack Local to test staging environments and localhost applications through a secure tunnel before deploying to production.
4. **Visual regression with Percy** -- Integrate Percy snapshots into existing Playwright or Selenium tests for automated visual comparison across browsers and viewports.
5. **Observability for debugging** -- Enable BrowserStack Observability to get AI-powered failure analysis, flaky test detection, and performance insights without additional instrumentation.
6. **Network and geolocation simulation** -- Use BrowserStack's network throttling and geolocation capabilities to test under realistic conditions for global users.
7. **Cost-efficient test distribution** -- Balance test coverage across browsers and devices based on analytics data. Test the top 80% of user configurations, not every possible combination.

## Project Structure

```
browserstack-tests/
  config/
    browserstack.config.ts
    capabilities.ts
    local-config.ts
  tests/
    e2e/
      login.spec.ts
      checkout.spec.ts
      search.spec.ts
    visual/
      homepage-visual.spec.ts
      product-page-visual.spec.ts
    mobile/
      mobile-navigation.spec.ts
      mobile-checkout.spec.ts
  helpers/
    browserstack-client.ts
    local-tunnel.ts
    capability-builder.ts
  percy/
    percy-config.ts
    snapshot-helpers.ts
  scripts/
    run-parallel.sh
    check-session-status.ts
  reports/
    .gitkeep
```

## Playwright + BrowserStack Configuration

```typescript
// config/browserstack.config.ts
import { defineConfig, devices } from '@playwright/test';

const BS_CAPS = {
  'browserstack.username': process.env.BROWSERSTACK_USERNAME || '',
  'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY || '',
  'browserstack.local': process.env.BROWSERSTACK_LOCAL || 'false',
  'browserstack.playwrightVersion': '1.latest',
  'browserstack.debug': 'true',
  'browserstack.networkLogs': 'true',
  'browserstack.consoleLogs': 'info',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 1,
  workers: 5,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome-latest-windows',
      use: {
        connectOptions: {
          wsEndpoint: buildWSEndpoint({
            ...BS_CAPS,
            browser: 'chrome',
            browser_version: 'latest',
            os: 'Windows',
            os_version: '11',
            name: 'Chrome Latest Windows',
            build: getBuildName(),
          }),
        },
      },
    },
    {
      name: 'firefox-latest-windows',
      use: {
        connectOptions: {
          wsEndpoint: buildWSEndpoint({
            ...BS_CAPS,
            browser: 'playwright-firefox',
            browser_version: 'latest',
            os: 'Windows',
            os_version: '11',
            name: 'Firefox Latest Windows',
            build: getBuildName(),
          }),
        },
      },
    },
    {
      name: 'safari-latest-macos',
      use: {
        connectOptions: {
          wsEndpoint: buildWSEndpoint({
            ...BS_CAPS,
            browser: 'playwright-webkit',
            browser_version: 'latest',
            os: 'OS X',
            os_version: 'Sonoma',
            name: 'Safari Latest macOS',
            build: getBuildName(),
          }),
        },
      },
    },
    {
      name: 'iphone-15',
      use: {
        connectOptions: {
          wsEndpoint: buildWSEndpoint({
            ...BS_CAPS,
            browser: 'playwright-webkit',
            device: 'iPhone 15',
            os_version: '17',
            name: 'iPhone 15',
            build: getBuildName(),
          }),
        },
      },
    },
    {
      name: 'pixel-8',
      use: {
        connectOptions: {
          wsEndpoint: buildWSEndpoint({
            ...BS_CAPS,
            browser: 'chrome',
            device: 'Google Pixel 8',
            os_version: '14.0',
            name: 'Pixel 8',
            build: getBuildName(),
          }),
        },
      },
    },
  ],
});

function buildWSEndpoint(caps: Record<string, string>): string {
  const encoded = encodeURIComponent(JSON.stringify(caps));
  return `wss://cdp.browserstack.com/playwright?caps=${encoded}`;
}

function getBuildName(): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const ci = process.env.CI ? 'CI' : 'local';
  const commit = process.env.GITHUB_SHA?.substring(0, 7) || 'dev';
  return `${ci}-${timestamp}-${commit}`;
}
```

## BrowserStack Local Tunnel

```typescript
// helpers/local-tunnel.ts
import * as BrowserStackLocal from 'browserstack-local';

export class LocalTunnel {
  private bsLocal: any;

  constructor() {
    this.bsLocal = new BrowserStackLocal.Local();
  }

  async start(options?: {
    key?: string;
    localIdentifier?: string;
    verbose?: boolean;
    force?: boolean;
    forceLocal?: boolean;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = {
        key: options?.key || process.env.BROWSERSTACK_ACCESS_KEY,
        localIdentifier: options?.localIdentifier || `local-${Date.now()}`,
        verbose: options?.verbose ? '1' : '0',
        force: options?.force ? 'true' : 'false',
        forceLocal: options?.forceLocal ? 'true' : 'false',
      };

      this.bsLocal.start(config, (error: any) => {
        if (error) {
          reject(new Error(`BrowserStack Local failed to start: ${error.message}`));
        } else {
          console.log('BrowserStack Local tunnel started');
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.bsLocal.isRunning()) {
        this.bsLocal.stop(() => {
          console.log('BrowserStack Local tunnel stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isRunning(): boolean {
    return this.bsLocal.isRunning();
  }
}
```

## Percy Visual Testing Integration

```typescript
// tests/visual/homepage-visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test('homepage renders correctly on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take Percy snapshot
    await page.evaluate(() => {
      // Percy snapshot via CLI or SDK
      (window as any).__percy_snapshot_name = 'Homepage - Desktop';
    });

    // Fallback assertions
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('homepage renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Mobile hamburger menu should be visible
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
  });
});
```

## BrowserStack Session Management

```typescript
// helpers/browserstack-client.ts
interface SessionInfo {
  name: string;
  duration: number;
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
  status: 'passed' | 'failed' | 'error';
  reason: string;
  public_url: string;
  video_url: string;
  logs: string;
}

export class BrowserStackClient {
  private username: string;
  private accessKey: string;
  private baseUrl = 'https://api.browserstack.com';

  constructor() {
    this.username = process.env.BROWSERSTACK_USERNAME || '';
    this.accessKey = process.env.BROWSERSTACK_ACCESS_KEY || '';
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.accessKey}`).toString('base64')}`;
  }

  async updateSessionStatus(
    sessionId: string,
    status: 'passed' | 'failed',
    reason?: string
  ): Promise<void> {
    await fetch(`${this.baseUrl}/automate/sessions/${sessionId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
      },
      body: JSON.stringify({ status, reason }),
    });
  }

  async getSession(sessionId: string): Promise<SessionInfo> {
    const response = await fetch(
      `${this.baseUrl}/automate/sessions/${sessionId}.json`,
      { headers: { Authorization: this.authHeader } }
    );
    const data = await response.json();
    return data.automation_session;
  }

  async getBuilds(limit = 10): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/automate/builds.json?limit=${limit}`,
      { headers: { Authorization: this.authHeader } }
    );
    const data = await response.json();
    return data;
  }

  async getBuildSessions(buildId: string): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/automate/builds/${buildId}/sessions.json`,
      { headers: { Authorization: this.authHeader } }
    );
    return response.json();
  }

  async getAccountUsage(): Promise<{ parallel_sessions_running: number; parallel_sessions_max: number }> {
    const response = await fetch(`${this.baseUrl}/automate/plan.json`, {
      headers: { Authorization: this.authHeader },
    });
    return response.json();
  }
}
```

## GitHub Actions Integration

```yaml
# .github/workflows/browserstack-tests.yml
name: BrowserStack Cross-Browser Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  browserstack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Start BrowserStack Local
        uses: browserstack/github-actions/setup-local@master
        with:
          local-testing: start
          local-identifier: github-${{ github.run_id }}

      - name: Run Playwright tests on BrowserStack
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
          BROWSERSTACK_LOCAL: 'true'
          BROWSERSTACK_LOCAL_IDENTIFIER: github-${{ github.run_id }}
        run: npx playwright test --config=config/browserstack.config.ts

      - name: Stop BrowserStack Local
        if: always()
        uses: browserstack/github-actions/setup-local@master
        with:
          local-testing: stop

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: browserstack-reports
          path: reports/
```

## Capability Builder Utility

```typescript
// helpers/capability-builder.ts
interface BrowserCapability {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceName?: string;
  buildName: string;
  sessionName: string;
}

export class CapabilityBuilder {
  private baseCapabilities: Record<string, string> = {};

  constructor() {
    this.baseCapabilities = {
      'browserstack.username': process.env.BROWSERSTACK_USERNAME || '',
      'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY || '',
      'browserstack.debug': 'true',
      'browserstack.networkLogs': 'true',
      'browserstack.consoleLogs': 'info',
    };
  }

  desktop(browser: string, version: string, os: string, osVersion: string): Record<string, string> {
    return {
      ...this.baseCapabilities,
      browser,
      browser_version: version,
      os,
      os_version: osVersion,
      resolution: '1920x1080',
    };
  }

  mobile(device: string, osVersion: string, browser = 'chrome'): Record<string, string> {
    return {
      ...this.baseCapabilities,
      device,
      os_version: osVersion,
      browser,
      realMobile: 'true',
    };
  }

  withLocal(identifier: string): this {
    this.baseCapabilities['browserstack.local'] = 'true';
    this.baseCapabilities['browserstack.localIdentifier'] = identifier;
    return this;
  }

  withBuild(name: string): this {
    this.baseCapabilities['build'] = name;
    return this;
  }

  withGeolocation(country: string): this {
    this.baseCapabilities['browserstack.geoLocation'] = country;
    return this;
  }

  withNetworkProfile(profile: 'no-throttling' | '4g' | '3g' | '2g'): this {
    const profiles: Record<string, string> = {
      'no-throttling': 'no-throttling',
      '4g': '4g-lte-advanced-good',
      '3g': '3g-umts-good',
      '2g': '2g-gprs-good',
    };
    this.baseCapabilities['browserstack.networkProfile'] = profiles[profile];
    return this;
  }
}

// Usage examples
const builder = new CapabilityBuilder()
  .withBuild('PR-123-smoke')
  .withLocal('github-12345');

const chromeWindows = builder.desktop('chrome', 'latest', 'Windows', '11');
const safariMac = builder.desktop('safari', 'latest', 'OS X', 'Sonoma');
const iPhone15 = builder.mobile('iPhone 15', '17');
const pixel8 = builder.mobile('Google Pixel 8', '14.0');
```

## Cross-Browser Test Strategy

Not every test needs to run on every browser. Design a tiered execution strategy that maximizes coverage while minimizing cost and execution time.

Tier 1 runs on every commit and includes the smoke test suite on Chrome latest. This catches obvious regressions quickly.

Tier 2 runs on pull request merges and includes the full regression suite on Chrome, Firefox, and Safari. This catches cross-browser issues before code reaches the main branch.

Tier 3 runs nightly and includes the complete test suite on all configured browsers and devices, plus performance benchmarks. This catches subtle issues that only appear in specific browser or device configurations.

Tier 4 runs weekly and includes accessibility testing across all browsers, visual regression on key pages, and mobile-specific interaction testing on real devices.

Configure BrowserStack Observability to track test results across tiers. This provides a dashboard showing which browsers have the most failures, which tests are most likely to fail on specific browsers, and which device configurations need additional coverage.

## Best Practices

1. **Use BrowserStack's capability generator** -- Avoid guessing browser and OS combinations. Use the official capability generator to produce correct configurations.
2. **Set meaningful build and session names** -- Include CI build number, branch name, and timestamp in build names for easy identification in the dashboard.
3. **Enable BrowserStack Local for pre-production testing** -- Test against staging and localhost environments using the secure tunnel before deploying to production.
4. **Parallelize based on your plan** -- Check your BrowserStack plan's parallel session limit and configure workers accordingly to maximize throughput.
5. **Use Percy for visual regression** -- Integrate Percy snapshots into critical page tests. Configure responsive widths to catch layout issues across breakpoints.
6. **Enable network and console logs** -- Always enable logging in capabilities for debugging. Logs are invaluable when tests fail on specific browsers.
7. **Mark session status after test completion** -- Use the BrowserStack API to mark sessions as passed or failed so the dashboard accurately reflects test results.
8. **Test on real devices for mobile** -- BrowserStack real device testing is more reliable than emulators for mobile-specific bugs.
9. **Monitor session usage** -- Track parallel session utilization to identify opportunities to optimize test distribution.
10. **Cache BrowserStack Local binary** -- In CI, cache the BrowserStack Local binary to avoid re-downloading it on every run.

## Anti-Patterns

1. **Testing every browser combination** -- Testing on 50+ browser/OS combinations is wasteful. Analyze user analytics to identify the top 5-10 configurations that cover 90% of users.
2. **Running all tests on all browsers** -- Run the full suite on Chrome, smoke tests on Firefox and Safari, and critical paths on mobile devices.
3. **Not using BrowserStack Local for staging** -- Skipping local testing means bugs are only found after deployment. Always test pre-production environments.
4. **Hardcoding credentials in config files** -- Use environment variables for BrowserStack username and access key. Never commit credentials.
5. **Ignoring flaky test detection** -- BrowserStack Observability identifies flaky tests. Ignoring these leads to unreliable CI pipelines.
6. **Not setting timeouts appropriately** -- Cloud execution is slower than local. Set generous timeouts for element waits and page loads.
7. **Running sequential tests on cloud** -- Sequential execution wastes parallel session capacity. Always run tests in parallel on BrowserStack.
8. **Skipping session cleanup** -- Orphaned sessions consume your parallel quota. Always clean up sessions in afterAll hooks.
9. **Not reviewing video recordings** -- BrowserStack provides video recordings of every session. Review failed test videos before debugging code.
10. **Using stale browser versions** -- Browser capabilities change with updates. Regularly update your browser version targets to match current releases.
