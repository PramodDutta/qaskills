import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Config Options: Complete 2026 Reference',
  description: 'Every Playwright config option in 2026: testDir, retries, projects, use, webServer, reporter, snapshotPath, and full TypeScript reference.',
  date: '2026-05-22',
  category: 'Reference',
  content: `
# Playwright Test Config Options: Complete 2026 Reference

\`playwright.config.ts\` is the single source of truth for how your test suite runs. Every flag you can pass on the command line, every project you can target, every artifact you can produce, every fixture you can configure, lives here. The default config that Playwright generates is intentionally minimal; the real config you ship to production carries dozens of options whose effects compound across hundreds of tests.

This reference enumerates every option available on \`defineConfig\` in Playwright 1.49+, with examples for each. Every option is grouped by purpose; every value is a real production setting from the QAskills.sh team's own pipelines.

For broader fundamentals, see the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). The [playwright-e2e skill](/skills/playwright-e2e) helps AI assistants choose sensible defaults when generating configs.

## Top-level structure

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
\`\`\`

## Test discovery options

| Option | Type | Default | Purpose |
|---|---|---|---|
| \`testDir\` | string | \`.\` | Root directory for tests |
| \`testMatch\` | string \\| RegExp \\| Array | \`**/*.@(spec|test).?(c|m)[jt]s?(x)\` | Files to include |
| \`testIgnore\` | string \\| RegExp \\| Array | \`**/node_modules/**\` | Files to exclude |
| \`fullyParallel\` | boolean | false | Tests within a file run in parallel |
| \`forbidOnly\` | boolean | false | Fail if \`test.only\` is committed |
| \`globalSetup\` | string | (none) | Path to global setup script |
| \`globalTeardown\` | string | (none) | Path to global teardown script |

\`forbidOnly: !!process.env.CI\` is the recommended setting; CI fails when \`test.only\` slips into a PR.

## Execution options

| Option | Type | Default | Purpose |
|---|---|---|---|
| \`workers\` | number \\| string | (half cores) | Worker process count |
| \`timeout\` | number | 30_000 | Per-test timeout (ms) |
| \`globalTimeout\` | number | 0 (disabled) | Total suite timeout (ms) |
| \`retries\` | number | 0 | Retries on failure |
| \`maxFailures\` | number | 0 (disabled) | Stop after N failures |
| \`expect.timeout\` | number | 5000 | Default expect timeout (ms) |
| \`updateSnapshots\` | string | 'missing' | Snapshot update mode |
| \`quiet\` | boolean | false | Suppress stdout |
| \`shard\` | object | (none) | Sharding via CLI usually |

\`\`\`typescript
export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  maxFailures: process.env.CI ? 10 : 0,
});
\`\`\`

## Project structure

\`\`\`typescript
projects: [
  { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    dependencies: ['setup'],
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
],
\`\`\`

Each project can override almost every config field for its tests.

| Project field | Purpose |
|---|---|
| \`name\` | Project identifier |
| \`testDir\` | Override testDir |
| \`testMatch\` / \`testIgnore\` | Override discovery |
| \`use\` | Per-project options |
| \`dependencies\` | Run other projects first |
| \`teardown\` | Project to run after |
| \`grep\` / \`grepInvert\` | Filter tests by tag |
| \`metadata\` | Free-form key/value |
| \`outputDir\` | Override outputDir |
| \`snapshotDir\` | Override snapshotDir |
| \`fullyParallel\` | Override parallel mode |
| \`retries\` | Override retries |
| \`timeout\` | Override timeout |

## \`use\` options (per-test context)

The \`use\` block configures every browser context the test sees.

| Option | Purpose |
|---|---|
| \`baseURL\` | Prefix for relative URLs in \`page.goto\` |
| \`viewport\` | Initial viewport (\`{ width, height }\` or null) |
| \`deviceScaleFactor\` | DPI ratio |
| \`isMobile\` | Mobile emulation |
| \`hasTouch\` | Touch support |
| \`userAgent\` | Override User-Agent |
| \`locale\` | BCP 47 locale |
| \`timezoneId\` | IANA timezone |
| \`geolocation\` | \`{ latitude, longitude }\` |
| \`permissions\` | Array of permissions |
| \`colorScheme\` | 'light' / 'dark' / 'no-preference' |
| \`reducedMotion\` | 'reduce' / 'no-preference' |
| \`forcedColors\` | 'active' / 'none' |
| \`storageState\` | Path or object |
| \`extraHTTPHeaders\` | Per-context headers |
| \`httpCredentials\` | Basic auth |
| \`offline\` | Simulate offline |
| \`ignoreHTTPSErrors\` | Bypass TLS (testing) |
| \`acceptDownloads\` | Allow downloads (default true) |
| \`serviceWorkers\` | 'allow' / 'block' |
| \`bypassCSP\` | Skip Content Security Policy |
| \`proxy\` | HTTP proxy |
| \`trace\` | Trace mode |
| \`video\` | Video mode |
| \`screenshot\` | Screenshot mode |
| \`launchOptions\` | Browser launch flags |
| \`contextOptions\` | Additional context options |
| \`testIdAttribute\` | Attribute for \`getByTestId\` |
| \`actionTimeout\` | Per-action timeout |
| \`navigationTimeout\` | Per-navigation timeout |

## Reporter options

\`\`\`typescript
reporter: [
  ['list'],
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['blob'],
  ['junit', { outputFile: 'test-results/junit.xml' }],
  process.env.CI ? ['github'] : ['null'],
],
\`\`\`

For deeper coverage, see [Playwright Test Reporters HTML Allure JUnit Guide](/blog/playwright-test-reporters-html-allure-junit-guide).

## Output options

| Option | Default | Purpose |
|---|---|---|
| \`outputDir\` | \`test-results\` | Where artifacts go |
| \`snapshotDir\` | (next to test) | Where snapshots live |
| \`snapshotPathTemplate\` | (auto) | Custom snapshot path |
| \`preserveOutput\` | 'always' | When to clear output |

\`\`\`typescript
outputDir: './test-results',
snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
preserveOutput: process.env.CI ? 'never' : 'failures-only',
\`\`\`

## webServer

Spin up the app before tests; tear down after.

\`\`\`typescript
webServer: {
  command: 'pnpm start',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
  stdout: 'pipe',
  stderr: 'pipe',
  env: {
    PORT: '3000',
    NODE_ENV: 'test',
  },
  cwd: './',
}
\`\`\`

| Option | Purpose |
|---|---|
| \`command\` | Shell command to start the server |
| \`url\` | Wait for HTTP 200 here before tests |
| \`port\` | Alternative: wait for port to open |
| \`reuseExistingServer\` | Skip starting if already up |
| \`timeout\` | Max wait time |
| \`stdout\` / \`stderr\` | Pipe or ignore output |
| \`env\` | Environment overrides |
| \`cwd\` | Working directory |
| \`ignoreHTTPSErrors\` | TLS bypass |

For multiple servers:

\`\`\`typescript
webServer: [
  { command: 'pnpm --filter @qaskills/api start', port: 4000 },
  { command: 'pnpm --filter @qaskills/web start', port: 3000 },
],
\`\`\`

## metadata

Arbitrary key/value for reporters or downstream tools.

\`\`\`typescript
metadata: {
  appVersion: process.env.GITHUB_SHA ?? 'local',
  environment: process.env.ENV ?? 'dev',
  team: 'QASkills',
},
\`\`\`

## expect block

\`\`\`typescript
expect: {
  timeout: 10_000,
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.005,
    threshold: 0.2,
    animations: 'disabled',
  },
  toMatchSnapshot: {
    maxDiffPixelRatio: 0.005,
  },
},
\`\`\`

| Sub-option | Purpose |
|---|---|
| \`timeout\` | Default for web-first assertions |
| \`toHaveScreenshot\` | Defaults for screenshot diffs |
| \`toMatchSnapshot\` | Defaults for text snapshot diffs |

## Snapshot updates

| Mode | Behavior |
|---|---|
| \`missing\` (default) | Write only when no baseline exists |
| \`none\` | Never write; always compare |
| \`all\` | Always write |

CLI override: \`npx playwright test --update-snapshots\`.

## Global setup and teardown

\`\`\`typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(config.projects[0].use.baseURL!);
  await browser.close();
}

export default globalSetup;
\`\`\`

\`\`\`typescript
// playwright.config.ts
globalSetup: require.resolve('./global-setup'),
globalTeardown: require.resolve('./global-teardown'),
\`\`\`

Global setup runs once before all workers; teardown runs once after.

## Environment-aware patterns

\`\`\`typescript
const isCI = !!process.env.CI;

export default defineConfig({
  fullyParallel: true,
  workers: isCI ? 4 : undefined,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['blob'], ['github']]
    : [['list'], ['html', { open: 'on-failure' }]],
  use: {
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  },
});
\`\`\`

The \`isCI\` switch keeps local development fast while CI gets full instrumentation.

## A production config

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    process.env.CI ? ['blob'] : ['null'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    reducedMotion: 'reduce',
    testIdAttribute: 'data-testid',
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.005, animations: 'disabled' },
  },
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 8'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
\`\`\`

## Common pitfalls

**Pitfall 1: \`forbidOnly: true\` everywhere.** Disables \`test.only\` locally too. Gate on CI.

**Pitfall 2: Hard-coded \`baseURL\`.** Use env var fallback for portability.

**Pitfall 3: Forgetting \`webServer.reuseExistingServer\`.** Without it, every CI run starts a fresh server; locally you cannot iterate fast.

**Pitfall 4: \`workers: 1\` in CI.** Defeats parallelism. Use 4+ on standard runners.

**Pitfall 5: Reporters not adapting to CI.** Open the HTML report locally; pipe to blob in CI.

## Anti-patterns

- Putting test logic in the config. Configs configure; specs test.
- Hard-coding paths that should be relative.
- Skipping the \`projects\` array. Even single-project runs benefit from named projects.
- Setting \`timeout\` per-test instead of globally. Defaults apply across the suite.

## Conclusion and next steps

A well-tuned \`playwright.config.ts\` is the difference between a fast, reliable test suite and a slow, fragile one. Match settings to environment, project to browser, and instrument liberally in CI while keeping local runs lean.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate configs that follow these patterns. For broader CI scaffolding, see [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). For reporters, [Playwright Test Reporters HTML Allure JUnit Guide](/blog/playwright-test-reporters-html-allure-junit-guide).
`,
};
