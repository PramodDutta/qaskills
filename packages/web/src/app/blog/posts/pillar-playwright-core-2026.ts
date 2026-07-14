import type { SeoClusterArticle } from './seo-cluster-article';

export const playwrightCorePillar2026: SeoClusterArticle = {
  slug: 'playwright-e2e-complete-guide',
  clusterId: 'playwright-core',
  post: {
    title: 'Playwright Testing Complete Guide for Reliable E2E Automation in 2026',
    description:
      'Build reliable Playwright E2E automation with current setup, locators, fixtures, isolation, auth, API testing, mocking, debugging, CI, and Playwright 1.61 guidance.',
    date: '2026-02-13',
    updated: '2026-07-14',
    category: 'Guide',
    image: '/blog/pillars/playwright-core.png',
    imageAlt:
      'Playwright end-to-end test architecture connecting browser contexts, semantic locators, API setup, traces, and parallel CI shards',
    primaryKeyword: 'playwright testing guide',
    keywords: [
      'playwright testing guide',
      'playwright e2e testing',
      'playwright tutorial 2026',
      'playwright test automation',
      'playwright best practices',
      'playwright fixtures',
      'playwright browser context',
      'playwright ci',
      'playwright 1.61',
      'reliable e2e automation',
    ],
    contentKind: 'pillar',
    relatedSlugs: [
      'playwright-1-61-webauthn-passkeys-guide-2026',
      'playwright-1-61-web-storage-api-guide-2026',
      'playwright-locators-best-practices-2026',
      'playwright-browser-context-guide-2026',
    ],
    sources: [
      'https://playwright.dev/docs/intro',
      'https://playwright.dev/docs/release-notes',
      'https://playwright.dev/docs/test-configuration',
      'https://playwright.dev/docs/browsers',
      'https://playwright.dev/docs/locators',
      'https://playwright.dev/docs/actionability',
      'https://playwright.dev/docs/test-assertions',
      'https://playwright.dev/docs/test-fixtures',
      'https://playwright.dev/docs/browser-contexts',
      'https://playwright.dev/docs/auth',
      'https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state',
      'https://playwright.dev/docs/api-testing',
      'https://playwright.dev/docs/mock',
      'https://playwright.dev/docs/mock-browser-apis',
      'https://playwright.dev/docs/network',
      'https://playwright.dev/docs/accessibility-testing',
      'https://playwright.dev/docs/test-snapshots',
      'https://playwright.dev/docs/debug',
      'https://playwright.dev/docs/trace-viewer',
      'https://playwright.dev/docs/videos',
      'https://playwright.dev/docs/test-parallel',
      'https://playwright.dev/docs/test-sharding',
      'https://playwright.dev/docs/test-retries',
      'https://playwright.dev/docs/ci',
      'https://playwright.dev/docs/docker',
      'https://playwright.dev/docs/best-practices',
    ],
    content: `
**Playwright is a complete end-to-end testing framework for modern web applications. To make it reliable in 2026, give every test a fresh BrowserContext, locate controls through user-visible semantics, assert with retrying web matchers, create state through APIs or fixtures, and preserve traces for failed attempts.** Pin Playwright and its browser binaries together, keep tests independent enough to run in any order, and use retries as evidence of flakiness rather than as a substitute for synchronization. That combination produces fast feedback without hiding real defects.

This Playwright testing guide targets the Node.js and TypeScript Playwright Test runner at version 1.61, with the important 1.60 changes called out explicitly. It follows the current [official installation requirements](https://playwright.dev/docs/intro), [Playwright Test documentation](https://playwright.dev/docs/test-configuration), and [1.60/1.61 release notes](https://playwright.dev/docs/release-notes). Examples use an imaginary commerce application at \`http://127.0.0.1:3000\`; replace its routes and data contracts with your own.

Use the focused companion guides when one part of the system deserves more depth:

- [Playwright 1.61 WebAuthn and passkeys](/blog/playwright-1-61-webauthn-passkeys-guide-2026)
- [Playwright 1.61 Web Storage API](/blog/playwright-1-61-web-storage-api-guide-2026)
- [Playwright locator best practices](/blog/playwright-locators-best-practices-2026)
- [Playwright BrowserContext guide](/blog/playwright-browser-context-guide-2026)

You can also browse reusable testing instructions in the [QA skills directory](/skills). For agent-operated exploratory browser work, use the author-qualified [Playwright CLI skill](/skills/Pramod/playwright-cli); committed regression coverage should still run through \`npx playwright test\`.

---

## The reliable Playwright model in one table

Reliable E2E automation is not created by a clever selector or a larger retry count. It comes from boundaries that make failures local and explainable. The following table is the operating model used throughout this guide.

| Layer | Reliable default | Failure it prevents | Evidence when it fails |
| --- | --- | --- | --- |
| Test intent | Verify one user-observable business outcome | Tests coupled to implementation details | Clear test title and step names |
| Browser state | Fresh BrowserContext for each test | Cookie, storage, permission, and cache leakage | Context options in trace metadata |
| Element targeting | Role, label, text, or explicit test-id contract | DOM-refactor selector breakage | Locator call log and ARIA state |
| Synchronization | Locator actions plus web-first assertions | Arbitrary sleeps and race conditions | Actionability and assertion logs |
| Data | Unique records created through an API or fixture | Parallel workers editing the same account | Test-specific IDs and API responses |
| External systems | Controlled test double or explicit integration environment | Third-party outages and nondeterminism | Route log, HAR, or captured response |
| Diagnostics | Trace on first retry, focused screenshots or video | Unreproducible CI-only failures | Trace, report, attachments |
| Scale | Independent tests, measured workers, then shards | Shared-state failures under concurrency | Per-shard blob reports and worker IDs |
| Delivery | Version-pinned package, browsers, and container | Browser executable mismatch | Lockfile, image tag, install log |

Playwright supplies the mechanisms, but your suite must define the contracts. A browser context cannot isolate two tests that deliberately mutate the same backend customer. A semantic locator cannot help when an accessible name is duplicated. A trace cannot recover a secret that was never available in CI. Treat framework features as components in a testing system, not as automatic guarantees.

## Version baseline, support, and hard limitations

As of July 14, 2026, this guide uses Playwright 1.61. The [official system requirements](https://playwright.dev/docs/intro#system-requirements) list current Node.js 22.x, 24.x, or 26.x releases, Windows 11 or Windows Server 2019 and later, macOS 14 and later, and supported Debian or Ubuntu versions. Check that page during upgrades rather than preserving an old runtime assumption in a wiki.

Playwright 1.61 bundles Chromium 149.0.7827.55, Firefox 151.0, and WebKit 26.5 according to the [1.61 release notes](https://playwright.dev/docs/release-notes#version-161). Those are Playwright-managed browser builds. They do not mean that the suite runs the branded desktop Firefox or Safari binaries. The [browser documentation](https://playwright.dev/docs/browsers) explains that Playwright uses patched Firefox and WebKit builds, can use installed Chrome or Edge channels, and cannot drive branded Safari. Run WebKit on macOS when platform behavior such as codecs makes proximity to Safari important, but still describe the result accurately as WebKit coverage.

Keep these limitations visible in test strategy reviews:

- Mobile projects emulate viewport, user agent, touch, and related device settings; they do not become tests on physical phones, mobile radios, or vendor browser shells.
- Automated accessibility rules find only a subset of accessibility defects. Keyboard exploration, screen-reader testing, manual assessment, and testing with disabled users remain necessary.
- Screenshot comparisons are environment-sensitive. Operating system, browser build, fonts, graphics, headless mode, and rendering settings can change pixels.
- Playwright pierces open Shadow DOM for its normal locators, but closed shadow roots are not supported; XPath also does not pierce shadow roots.
- BrowserContext isolation covers browser-side state, not a shared database, mailbox, object store, queue, or third-party account.
- A passing E2E journey shows that one represented path worked. It does not replace unit, component, contract, API, performance, security, resilience, or exploratory testing.
- Virtual WebAuthn in 1.61 exercises browser ceremonies without physical hardware. It does not certify a particular biometric sensor, authenticator firmware, or operating-system passkey UI.

These are boundaries, not reasons to avoid Playwright. They tell you where to add other forms of evidence.

## Should your team choose Playwright?

Choose Playwright Test when the risk lives in a web journey that spans the real browser, frontend code, network calls, and backend state. It is especially strong when one team wants Chromium, Firefox, and WebKit projects behind one API; when browser and API setup should share a test runner; when isolated contexts are a useful concurrency primitive; or when CI diagnostics need to include DOM snapshots, network activity, console output, and source steps in one trace.

Do not choose it merely because E2E tests appear more realistic than smaller tests. A large browser suite is costly to understand if every validation starts from the home page. Keep parsing, calculations, reducers, validation rules, and service contracts below the browser layer. Put only valuable user workflows, browser integration risks, and a small number of cross-system contracts in E2E.

| Situation | Playwright fit | Better companion or alternative |
| --- | --- | --- |
| Critical web purchase, signup, or permissions journey | Strong | Add API and contract checks for edge cases |
| Multi-browser frontend behavior | Strong | Add real-device/cloud coverage where required |
| REST or GraphQL contract matrix with no browser behavior | Possible, but browser fixtures add no value | Direct API or contract tests |
| Native iOS or Android application | Not a native-app driver | Use a native mobile framework |
| Visual component states with many permutations | Use selectively | Component tests or Storybook-style coverage |
| Third-party payment or identity provider | Test your boundary and a minimal sandbox journey | Provider contract tests and controlled mocks |
| Load and capacity | Wrong abstraction | Protocol-level performance tooling |
| Manual discovery of an unfamiliar workflow | Useful through UI mode, codegen, or CLI | Convert only stable discoveries into tests |

For direct framework comparisons, see [Playwright vs Cypress](/blog/cypress-vs-playwright-2026) and [Playwright vs Selenium](/blog/selenium-vs-playwright-2026). The decision should follow application risk, team language, browser matrix, and operating constraints, not an unsupported speed claim.

---

## Install Playwright 1.61 reproducibly

For a new repository, the official initializer creates a config, test directory, example test, optional GitHub Actions workflow, and browser installation. Run it with the package manager the repository already uses:

\`\`\`bash
# npm
npm init playwright@latest

# pnpm
pnpm create playwright

# Verify the installed runner, install matching browsers, and list tests.
npx playwright --version
npx playwright install
npx playwright test --list
\`\`\`

The initializer defaults to TypeScript. Keep that default unless the project has a deliberate JavaScript-only policy; typed fixtures and page objects catch many wiring errors before a browser starts. The [installation guide](https://playwright.dev/docs/intro) also confirms that rerunning the initializer later does not overwrite existing tests.

For an existing package, pin the runner through the package manifest and lockfile, then install browser binaries for that version:

\`\`\`bash
npm install --save-dev @playwright/test@1.61.0
npx playwright install --with-deps
npx playwright --version
\`\`\`

\`--with-deps\` installs supported Linux system dependencies as well as browser binaries, which is useful in a clean CI image. On developer machines, \`npx playwright install\` is usually enough after the package install. Do not cache browser folders without also keying the cache to the Playwright package version and operating system. Each Playwright update can require new browser builds.

A healthy initial repository separates framework plumbing from business tests:

\`\`\`text
playwright.config.ts
playwright/
  .auth/                 # generated secrets, ignored by Git
  fixtures.ts            # typed test and expect exports
tests/
  auth.setup.ts
  e2e/
    checkout.spec.ts
    account.spec.ts
  pages/
    checkout.page.ts
  support/
    data-factory.ts
    api-client.ts
    assertions.ts
test-results/            # generated artifacts, ignored by Git
\`\`\`

Do not create every directory on day one. The important rule is dependency direction: specs may use fixtures, domain helpers, and small page/component objects; those helpers must not import individual specs. Generated auth and result data stay out of source control.

### Pin packages, browsers, and images as one unit

The npm package and Playwright browser builds are version-coupled. A lockfile pins the package; \`npx playwright install\` resolves the matching browsers. In Docker, pin the official image to the same version as \`@playwright/test\`. The [official Docker guide](https://playwright.dev/docs/docker) warns that mismatched project and image versions can prevent Playwright from locating browser executables.

This matters during partial upgrades. If a pull request changes \`@playwright/test\` but a CI job keeps an old image or browser cache, failures may look like application regressions even though the runner cannot launch its expected binary. Make the package bump, image bump, browser install, and baseline review one change.

## Configure the runner around observable policy

Playwright configuration has two broad levels. Runner policy such as \`testDir\`, \`retries\`, \`workers\`, \`reporter\`, and \`projects\` belongs at the top level. Browser-context defaults such as \`baseURL\`, \`trace\`, \`video\`, \`locale\`, and \`storageState\` belong under \`use\`. The [official configuration reference](https://playwright.dev/docs/test-configuration) explicitly warns not to put runner options inside \`use\`.

This baseline is intentionally conservative in CI. It gives pull requests broad browser coverage, one worker per shard for predictable resource use, useful diagnostics, and no hidden local server dependency:

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure-and-retries',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
\`\`\`

The \`retain-on-failure-and-retries\` video mode is new in 1.61. If the project has not upgraded, use a mode supported by its installed version, such as \`retain-on-failure\` or \`on-first-retry\`. More importantly, do not copy the config without deciding its cost. Video is useful for motion and multi-page behavior, but traces usually contain better action, DOM, console, and network evidence.

\`fullyParallel: true\` makes individual tests eligible for parallel scheduling and improves test-level shard balancing. It also exposes bad shared-state assumptions sooner. If enabling it causes failures, diagnose accounts, records, ports, global variables, and backend state. Disabling parallelism can be a temporary containment step, but it is not proof that the suite is reliable.

### Environment values belong outside test logic

Use environment variables for deployment-specific origins, credentials, feature flags, and API keys. Keep defaults only for safe local values. A spec should call \`page.goto('/checkout')\`, not choose among staging URLs. This makes the same test code runnable against a local server or an ephemeral deployment while keeping the selected target visible in job configuration.

Never provide production credentials to a routine E2E job. Use synthetic accounts with least privilege, test payment modes, bounded quotas, and cleanup ownership. Store generated \`storageState\` under \`playwright/.auth\` or the project output directory and ignore it in Git. The [authentication guide](https://playwright.dev/docs/auth) warns that these files may contain cookies and headers capable of impersonating the account.

### Projects are test matrices, not browser decorations

A Playwright project can represent a browser, device profile, authenticated role, locale, feature flag, or a setup dependency. Keep project dimensions purposeful. Multiplying three browsers by four locales by three roles creates 36 executions of every test even when most scenarios do not need that matrix.

Use broad Chromium coverage on every pull request, targeted Firefox and WebKit risk coverage where practical, and a scheduled or release matrix for the rest if pipeline budget is constrained. Tests for layout, downloads, browser permissions, media, date inputs, and platform integration deserve the widest matrix. A backend-driven status label may not.

The default \`Desktop Chrome\` device descriptor uses Playwright's Chromium unless a \`channel\` is configured. Add \`channel: 'chrome'\` or \`channel: 'msedge'\` only when branded-browser behavior, codecs, or a testing policy requires it. The [browser guide](https://playwright.dev/docs/browsers) documents the channel differences and enterprise-policy caveats.

---

## Write a first test around a business result

A useful first test proves a small vertical slice: the page loads, a user performs a meaningful action, and a visible result confirms the server accepted it. It does not need a base page class, a global hook, or a custom assertion library.

\`\`\`ts
// tests/e2e/cart.spec.ts
import { test, expect } from '@playwright/test';

test('adds an available product to the cart', async ({ page }) => {
  await page.goto('/products');

  const product = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Canvas Backpack' }) });

  await product.getByRole('button', { name: 'Add to cart' }).click();

  await expect(page.getByRole('status')).toHaveText('Added Canvas Backpack');
  await expect(page.getByRole('link', { name: /cart/i })).toContainText('1');
});
\`\`\`

This test has no sleep and no CSS chain. The locator is evaluated when each action or assertion needs it, and the web-first assertions retry until their conditions pass or the assertion timeout expires. The behavior also exposes accessibility problems early: if a button has no stable accessible name or the confirmation is not represented meaningfully, the test author has to confront the same interface ambiguity a user may encounter.

Use \`test.step()\` when a scenario has several business phases, such as reserving inventory, entering an address, and confirming an order. Steps should describe intent, not restate every API call. A report that says "Submit paid order" is useful; a report with separate "click button" and "wait for text" steps adds noise already present in the trace.

## Locators are live queries, not cached elements

A Playwright \`Locator\` describes how to find an element at the moment an operation runs. It is central to retryability and auto-waiting. If React replaces a button between two actions, a locator resolves again; a stale element handle would continue pointing at old DOM state. The [official locator guide](https://playwright.dev/docs/locators) recommends user-facing attributes and explicit contracts.

Use this priority as a decision process, not a rigid ranking:

| Locator | Best use | Contract it checks | Common misuse |
| --- | --- | --- | --- |
| \`getByRole(role, { name })\` | Buttons, links, headings, tabs, dialogs, lists | Accessible role and name | Omitting \`name\` when many roles match |
| \`getByLabel(text)\` | Labeled form controls | Label-control association | Using placeholder when a label should exist |
| \`getByText(text)\` | User-visible copy and non-interactive content | Rendered text | Targeting a generic word repeated across the page |
| \`getByPlaceholder(text)\` | Inputs where placeholder is intentional UI | Placeholder text | Treating placeholder as a substitute for accessible labeling |
| \`getByAltText(text)\` | Informative images and image controls | Text alternative | Locating decorative images |
| \`getByTitle(text)\` | Elements whose title is a real user contract | Title attribute | Adding title only to satisfy tests |
| \`getByTestId(id)\` | Stable explicit automation contract | Agreed test-id | Encoding styling or DOM position in the id |
| \`locator(css)\` | Canvas wrappers, generated widgets, structural edge cases | DOM implementation | Long descendant or \`:nth-child\` chains |

Role locators are strict about accessible semantics. A native button usually has the correct role automatically; adding \`role="button"\` to a non-interactive element does not give it keyboard behavior. Tests should encourage the application to use correct native controls rather than papering over a poor interface.

### Narrow repeated structures by meaning

Repeated cards and rows are where weak suites reach for \`.nth(3)\`. Filter the container by a child users can identify, then locate the action inside that container:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('removes the annual support line from a quote', async ({ page }) => {
  await page.goto('/quote');

  const supportLine = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'Annual support' }) });

  await expect(supportLine).toContainText('$240');
  await supportLine.getByRole('button', { name: 'Remove' }).click();
  await expect(supportLine).toHaveCount(0);
});
\`\`\`

The [filtering documentation](https://playwright.dev/docs/locators#filtering-locators) supports filtering by text or descendant locators. Prefer \`has\` when the descendant itself has a semantic contract. Reserve \`first()\`, \`last()\`, and \`nth()\` for cases where position is genuinely the requirement, such as the first result after an explicit sort. Playwright locators are strict for single-element actions; an ambiguity error is usually a prompt to express intent more precisely, not to append \`.first()\`.

### Auto-waiting is action-specific

Before \`locator.click()\`, Playwright verifies that one element resolves, is visible, stable, receives events, and is enabled. Different actions have different checks. \`fill()\`, for example, also requires editability but does not use the exact click matrix. The [actionability table](https://playwright.dev/docs/actionability) is the source of truth.

Auto-waiting does not know your business condition. A button can be actionable while the inventory request it triggers is still pending. Clicking it waits for click readiness, not for a later order to appear. Express that later condition with a web assertion, a URL assertion, or a specific response/event wait.

Avoid \`force: true\` unless the test deliberately needs to bypass normal actionability. A forced click can turn a real overlay or disabled-control defect into a false pass. Likewise, avoid \`page.evaluate(() => element.click())\` as a routine escape hatch; it no longer represents how a user activates the control.

### CSS, XPath, Shadow DOM, and test IDs

CSS and XPath remain available, but the [locator docs](https://playwright.dev/docs/locators#locate-by-css-or-xpath) explain why long structural selectors are brittle. Use a short CSS locator when the element has no meaningful exposed semantics and changing the markup really should trigger test maintenance. If the element is part of a product-owned widget, an explicit test id is often the cleaner contract.

Normal Playwright locators pierce open shadow roots. XPath does not, and closed roots cannot be traversed. If a third-party closed-shadow component blocks required testing, validate behavior through its public user interactions and integration events or ask the component owner for a testable interface. Do not promise full internal coverage that the browser intentionally hides.

Read the dedicated [Playwright locator best-practices guide](/blog/playwright-locators-best-practices-2026) for advanced composition, alternatives, strictness, and migration patterns.

## Assertions should observe eventual user state

Generic assertions evaluate immediately:

\`\`\`ts
expect(response.status()).toBe(201);
\`\`\`

Web-first assertions accept a page or locator and retry:

\`\`\`ts
await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+$/);
await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
await expect(page.getByTestId('order-total')).toHaveText('$84.00');
\`\`\`

The distinction matters. This pattern is racy:

\`\`\`ts
// Do not copy: isVisible() samples once, then a generic assertion runs immediately.
expect(await page.getByRole('status').isVisible()).toBe(true);
\`\`\`

Use \`await expect(locator).toBeVisible()\` instead. The [assertion reference](https://playwright.dev/docs/test-assertions) documents auto-retrying matchers and their default assertion timeout. Set the project default around normal UI convergence, then grant a longer timeout only to a named operation that legitimately takes longer. Raising every timeout makes broken expectations slower to report.

### Wait for the evidence closest to the requirement

After submitting a form, decide what proves success:

- A URL change proves navigation, not necessarily persistence.
- A response proves the server replied, not necessarily that the UI rendered the accepted result.
- A success alert proves the page claims success, not necessarily that data survived a reload.
- A record fetched through the API proves server state, not the browser presentation.

Strong critical-path tests often use two adjacent signals: a user-visible confirmation plus a server postcondition or a reload. Do not assert every internal request. Choose the smallest evidence set that would catch the expensive failure.

When an action and a browser event must be coordinated, start waiting before the trigger:

\`\`\`ts
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download invoice' }).click();
const download = await downloadPromise;

await expect(download.suggestedFilename()).toMatch(/^invoice-.*\.pdf$/);
await download.saveAs(test.info().outputPath(download.suggestedFilename()));
\`\`\`

This avoids missing a fast event. The same pattern applies to popups and carefully selected network responses. Do not blanket the suite with \`waitForLoadState('networkidle')\`; modern pages may keep analytics, polling, or sockets active, and network quietness is usually not the business outcome.

### Poll external convergence deliberately

Use \`expect.poll()\` when the value comes from repeated non-locator work, such as an eventually consistent API. Define the deadline and intervals that match the system's contract:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('shows a fulfilled order after asynchronous processing', async ({ page, request }) => {
  const createResponse = await request.post('/api/orders', {
    data: { sku: 'BACKPACK-01', quantity: 1 },
  });
  expect(createResponse.status()).toBe(202);

  const { id } = (await createResponse.json()) as { id: string };

  await expect
    .poll(
      async () => {
        const response = await request.get(\`/api/orders/\${id}\`);
        return (await response.json()) as { status: string };
      },
      {
        message: \`order \${id} should be fulfilled\`,
        timeout: 30_000,
        intervals: [500, 1_000, 2_000],
      },
    )
    .toMatchObject({ status: 'fulfilled' });

  await page.goto(\`/orders/\${id}\`);
  await expect(page.getByText('Fulfilled', { exact: true })).toBeVisible();
});
\`\`\`

Playwright 1.61 also supports \`expect.soft.poll(...)\`. Soft assertions let a test collect several failures, but they still mark the test failed. Use them for independent diagnostics, not when later actions depend on the failed condition. After a group of soft checks, inspect \`test.info().errors\` before continuing into a destructive or misleading action.

---

## BrowserContext is the real isolation boundary

The browser process is expensive enough to reuse. A browser context is cheap enough to recreate. Playwright Test therefore launches worker browsers and gives each test a new context plus a default page in that context. Cookies, local storage, session storage, permissions, and visited-page state do not leak from one test's context into the next. The [official isolation guide](https://playwright.dev/docs/browser-contexts) describes contexts as incognito-like profiles and explains why starting clean is safer than trying to clear selected state.

That distinction corrects a common mental model:

- \`browser\` is worker-scoped infrastructure and can serve multiple tests.
- \`context\` is the isolated browser profile for one test.
- \`page\` is one tab inside that context.
- Popups and additional tabs in the same context share that context's cookies and storage.
- A second context inside one test represents a different isolated user.

Do not create a new browser for every test to "improve isolation." It spends startup time without adding a stronger browser-state boundary than a fresh context. Do not reuse one context across an entire spec to "improve speed." That removes the default clean-slate guarantee and makes order dependence much easier to introduce.

### Use multiple contexts for real multi-user workflows

A collaboration test should not log an admin out, clear cookies, and log a user in on the same page. Model both actors at once:

\`\`\`ts
// tests/e2e/order-approval.spec.ts
import { test, expect } from '@playwright/test';

test('manager approval becomes visible to the requester', async ({ browser }) => {
  const managerContext = await browser.newContext({
    storageState: 'playwright/.auth/manager.json',
  });
  const requesterContext = await browser.newContext({
    storageState: 'playwright/.auth/requester.json',
  });

  try {
    const managerPage = await managerContext.newPage();
    const requesterPage = await requesterContext.newPage();

    await requesterPage.goto('/purchase-requests/new');
    await requesterPage.getByLabel('Purpose').fill('Accessibility test devices');
    await requesterPage.getByRole('button', { name: 'Submit request' }).click();
    const requestId = await requesterPage.getByTestId('request-id').innerText();

    await managerPage.goto(\`/purchase-requests/\${requestId}\`);
    await managerPage.getByRole('button', { name: 'Approve' }).click();
    await expect(managerPage.getByRole('status')).toHaveText('Request approved');

    await requesterPage.reload();
    await expect(requesterPage.getByText('Approved', { exact: true })).toBeVisible();
  } finally {
    await managerContext.close();
    await requesterContext.close();
  }
});
\`\`\`

Manual contexts are your responsibility to close. The \`finally\` block prevents leaked pages and videos when an assertion fails. The two actors remain isolated in the browser, but the request ID deliberately connects them through application state.

For a detailed lifecycle and option reference, use the [BrowserContext companion guide](/blog/playwright-browser-context-guide-2026).

### Browser isolation does not isolate the backend

Suppose two parallel tests use the same customer:

1. One changes the customer's default address.
2. Another verifies the original default address at checkout.

Fresh contexts cannot prevent that collision. Server-side data needs its own ownership model. Common safe patterns are a unique account per worker, unique records per test, immutable seeded reference data, transactional test APIs, namespace prefixes, or disposable environments. Put the owner in record metadata so cleanup can identify exactly what the run created.

Avoid a single global "test-user@example.com" for mutating tests. It may work with one worker and fail only under sharding, developer overlap, or a retry. The correct question is not "does each test have a new page?" but "can every test run at the same time against the same backend without observing another test's writes?"

## Fixtures make dependencies and cleanup explicit

Fixtures are Playwright Test's dependency-injection system. A test asks for \`page\`, \`request\`, or a custom domain fixture by naming it in its argument. Playwright resolves only what is needed, sets dependencies up in order, and tears them down after use. The [fixtures reference](https://playwright.dev/docs/test-fixtures) documents built-in, test-scoped, worker-scoped, automatic, option, and composed fixtures.

| Scope | Created | Good fit | Dangerous fit |
| --- | --- | --- | --- |
| Test-scoped | Once per test that needs it | Mutable records, pages, inboxes, temporary routes | Expensive immutable service startup |
| Worker-scoped | Once per worker process | Dedicated account, service, proxy, or namespace per worker | One mutable entity shared across parallel workers |
| Automatic test fixture | For every test in scope | Diagnostic attachment or invariant check | Heavy setup unrelated to most tests |
| Project setup dependency | Before dependent projects | Shared auth state or environment readiness | Mutable data every test will change |

Worker fixtures are not global singletons. A failed test causes Playwright to shut down its worker and create a clean worker for subsequent work; worker setup and teardown can therefore run again. Write provisioning and cleanup so a retry or replacement worker is safe.

### A typed fixture that owns test data

The following fixture creates a unique customer through a test-support API, exposes it to the test, and deletes it afterward. The email includes the parallel index and a random UUID so local developers, workers, retries, and shards do not collide:

\`\`\`ts
// playwright/fixtures.ts
import { randomUUID } from 'node:crypto';
import {
  test as base,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

type Customer = {
  id: string;
  email: string;
};

class Storefront {
  constructor(readonly page: Page) {}

  async openFor(customerId: string) {
    await this.page.goto(\`/test-login?customer=\${customerId}\`);
    await expect(this.page.getByRole('heading', { name: 'Products' })).toBeVisible();
  }

  async addProduct(name: string) {
    const card = this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('heading', { name }) });
    await card.getByRole('button', { name: 'Add to cart' }).click();
  }
}

async function deleteCustomer(request: APIRequestContext, id: string) {
  const response = await request.delete(\`/api/test-support/customers/\${id}\`);
  expect([204, 404]).toContain(response.status());
}

type AppFixtures = {
  customer: Customer;
  storefront: Storefront;
};

export const test = base.extend<AppFixtures>({
  customer: async ({ request }, use, testInfo) => {
    const email = \`pw-\${testInfo.parallelIndex}-\${randomUUID()}@example.test\`;
    const response = await request.post('/api/test-support/customers', {
      data: { email, name: 'Playwright Customer' },
    });
    expect(response).toBeOK();

    const customer = (await response.json()) as Customer;
    try {
      await use(customer);
    } finally {
      await deleteCustomer(request, customer.id);
    }
  },

  storefront: async ({ page }, use) => {
    await use(new Storefront(page));
  },
});

export { expect } from '@playwright/test';
\`\`\`

The test imports the project fixture, not the base runner:

\`\`\`ts
// tests/e2e/customer-cart.spec.ts
import { test, expect } from '../../playwright/fixtures';

test('new customer can add a product', async ({ customer, storefront, page }) => {
  await storefront.openFor(customer.id);
  await storefront.addProduct('Canvas Backpack');
  await expect(page.getByRole('link', { name: /cart/i })).toContainText('1');
});
\`\`\`

This example assumes a protected test-support API exists only in non-production environments. That is an application contract, not a Playwright feature. Authenticate the request context through safe CI secrets, constrain what the endpoint can create, and reject it entirely in production.

### Keep fixtures composable

A good fixture provides a capability with a clear lifecycle: a customer, authenticated page, mailbox, seeded order, or feature-flag context. A bad fixture silently navigates through half the application and leaves the test in a mysterious state. If a test title says "customer can cancel an order," readers should be able to see how the order was obtained and where the cancellation starts.

Avoid putting ordinary assertions deep inside page objects. It is reasonable for a fixture to verify that setup succeeded or for a domain helper to expose \`expectLoaded()\`, but the test should retain the outcome assertions that explain its purpose. This keeps failure reports connected to requirements rather than to generic helper methods.

Use automatic fixtures sparingly. They are excellent for attaching a server log after failure or checking that no severe browser errors occurred, but they execute even when not listed. Heavy automatic setup makes every test pay for a dependency it may not need.

## Authentication and state without cross-test leakage

Logging in through the UI is essential when the login journey itself is under test. Repeating that journey before every unrelated test is usually unnecessary. The recommended [authentication pattern](https://playwright.dev/docs/auth) is a setup project that signs in, waits for the final authenticated state, saves it to \`playwright/.auth\`, and supplies that state to dependent projects.

First ignore the secret-bearing directory:

\`\`\`gitignore
playwright/.auth/
\`\`\`

Then create the state:

\`\`\`ts
// tests/auth.setup.ts
import path from 'node:path';
import { test as setup, expect } from '@playwright/test';

const authFile = path.join(__dirname, '../playwright/.auth/customer.json');

setup('authenticate customer', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_USER_EMAIL and E2E_USER_PASSWORD are required');
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/account');
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
\`\`\`

Waiting for the final URL and an authenticated control matters because some identity flows set cookies across redirects. Saving state immediately after clicking can capture an incomplete session.

Declare the setup project as a dependency:

\`\`\`ts
// Relevant projects in playwright.config.ts
projects: [
  {
    name: 'setup',
    testMatch: /.*\.setup\.ts/,
  },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/customer.json',
    },
    dependencies: ['setup'],
  },
],
\`\`\`

Use one shared account only when every dependent test can run concurrently without changing state that another test reads. For mutating scenarios, authenticate one unique account per worker or create an account per test. The official guide demonstrates a worker-scoped \`storageState\` override keyed by \`test.info().parallelIndex\`.

### Treat storage state as a credential

A storage-state JSON file may contain cookies, local-storage values, and IndexedDB data that can impersonate the test account. Never commit it, publish it in an unrestricted artifact, or reuse a developer's personal session. Prefer short-lived synthetic users and write generated state under a directory that CI deletes.

If a state file expires between jobs, regenerate it; do not keep adding retries around the first authenticated navigation. If authentication is browser-specific, create state per browser project rather than assuming a Chromium session applies to WebKit.

### What storageState includes and excludes

A storage snapshot includes cookies and local storage. It can also include IndexedDB when you call \`storageState({ indexedDB: true, path })\`, which is required for applications that keep authentication tokens there. \`sessionStorage\` is deliberately different: it belongs to a tab and is not persisted by \`storageState\`. Playwright 1.61's new \`page.sessionStorage\` API makes current-origin reads and writes convenient, but it does not turn session storage into an automatic saved-state format. See the [official storageState API](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state) for the serialized fields and opt-in.

Use the [Playwright 1.61 Web Storage guide](/blog/playwright-1-61-web-storage-api-guide-2026) when a test needs direct \`page.localStorage\` or \`page.sessionStorage\` control. If authentication truly depends on session storage, load the value with an initialization script before application code runs, scope it to the expected hostname, and protect the serialized value like any other credential.

Tests for signed-out behavior can reset inherited project auth for a file:

\`\`\`ts
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('guest is redirected from account settings', async ({ page }) => {
  await page.goto('/account/settings');
  await expect(page).toHaveURL(/\/login\?returnTo=/);
});
\`\`\`

### Passkeys in Playwright 1.61

Playwright 1.61 introduces \`browserContext.credentials\`, a virtual WebAuthn authenticator that works across supported browsers. A fixture can seed a backend-provisioned credential with \`credentials.create(rpId, credential)\`, call \`credentials.install()\`, and then let the page complete \`navigator.credentials.get()\`. A setup test can instead install the authenticator, let the application register a passkey, read it with \`credentials.get()\`, and seed it into later contexts. These flows are documented in the [official authentication guide](https://playwright.dev/docs/auth#passkeys-webauthn).

The saved passkey includes private key material. Store it under the same restricted auth directory and never commit it. For complete setup, security boundaries, and ceremony examples, read the [Playwright 1.61 passkeys guide](/blog/playwright-1-61-webauthn-passkeys-guide-2026).

---

## Combine API setup with UI verification

The browser should exercise the behavior under test, not every precondition. Playwright's \`APIRequestContext\` can create server state before navigation and verify postconditions afterward. The [official API testing guide](https://playwright.dev/docs/api-testing) names these exact use cases.

This test creates an order directly, verifies it through the UI, performs the user action in the browser, then confirms server state:

\`\`\`ts
// tests/e2e/order-cancellation.spec.ts
import { test, expect } from '@playwright/test';

test('customer cancels an unshipped order', async ({ page, request }) => {
  const createResponse = await request.post('/api/test-support/orders', {
    data: {
      customerEmail: 'cancel-flow@example.test',
      sku: 'BACKPACK-01',
      status: 'paid',
    },
  });
  expect(createResponse).toBeOK();
  const order = (await createResponse.json()) as { id: string };

  try {
    await page.goto(\`/orders/\${order.id}\`);
    await expect(page.getByRole('heading', { name: \`Order \${order.id}\` })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel order' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm cancellation' }).click();
    await expect(page.getByRole('status')).toHaveText('Order cancelled');

    const orderResponse = await request.get(\`/api/test-support/orders/\${order.id}\`);
    expect(orderResponse).toBeOK();
    const savedOrder = (await orderResponse.json()) as { status: string };
    expect(savedOrder).toMatchObject({ status: 'cancelled' });
  } finally {
    await request.delete(\`/api/test-support/orders/\${order.id}\`);
  }
});
\`\`\`

The built-in \`request\` fixture uses \`use\` configuration such as \`baseURL\` and \`extraHTTPHeaders\`. By contrast, \`page.request\` and \`context.request\` share the BrowserContext cookie jar: API responses with \`Set-Cookie\` update browser cookies, and browser cookies populate outgoing API requests. Use an isolated \`request.newContext()\` when a setup client needs a different identity or must not affect browser authentication.

Do not use an internal database call to bypass the same contract you want to verify. An API is appropriate for arranging a paid order when the test is about cancellation UI. It is not appropriate if the test claims to prove checkout creates the order correctly.

## Control network dependencies at the correct boundary

Network interception can make an application state deterministic, reproduce a server error, or remove a third-party dependency. It can also create a false world where the frontend never meets a real backend. Decide whether each test is a UI behavior test with controlled data or an end-to-end integration test, and label the suite accordingly.

Install routes before navigation or before the action that triggers the request:

\`\`\`ts
// tests/e2e/inventory-error.spec.ts
import { test, expect } from '@playwright/test';

test('shows a retryable message when inventory is unavailable', async ({ page }) => {
  await page.route('**/api/inventory?sku=BACKPACK-01', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      json: { code: 'INVENTORY_UNAVAILABLE' },
    });
  });

  await page.goto('/products/BACKPACK-01');
  await page.getByRole('button', { name: 'Check availability' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'Availability is temporarily unavailable',
  );
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
\`\`\`

The [mock API guide](https://playwright.dev/docs/mock) supports full fulfillment, aborting, continuing, fetching the real response and patching it, HAR replay, and WebSocket routing. Prefer the narrowest URL and method contract that expresses the test. A catch-all \`**/*\` route can accidentally mock fonts, telemetry, unrelated APIs, or a new endpoint added later.

### Patch a real response when the contract still matters

\`route.fetch()\` performs the underlying request. You can then modify one field and fulfill with the original response metadata:

\`\`\`ts
await page.route('**/api/profile', async (route) => {
  const response = await route.fetch();
  const profile = (await response.json()) as {
    name: string;
    plan: string;
    features: string[];
  };

  await route.fulfill({
    response,
    json: {
      ...profile,
      features: [...profile.features, 'advanced-reports'],
    },
  });
});
\`\`\`

This is useful for a difficult feature-flag state while retaining the server's other fields. It is not a substitute for a contract test: if the server removes \`features\`, a loose cast could hide the mismatch. Validate important mock payloads against the same schema used at the application boundary.

### Use HAR replay for coherent multi-request scenarios

\`page.routeFromHAR()\` or \`browserContext.routeFromHAR()\` can serve matching responses from an HTTP Archive. HAR is useful when a page depends on a coordinated set of requests that would be tedious to hand-code. Commit only sanitized recordings from synthetic accounts. HAR files can contain URLs, headers, cookies, request bodies, response bodies, and timing information.

Set \`notFound: 'abort'\` when unmatched requests should fail rather than escape to a live service:

\`\`\`ts
await page.routeFromHAR('./tests/hars/catalog-empty.har', {
  url: '**/api/catalog/**',
  notFound: 'abort',
  update: false,
});
\`\`\`

Playwright 1.60 also adds \`context.tracing.startHar(path)\` and \`stopHar()\` as first-class recording APIs. In 1.61, HAR and trace recordings include WebSocket requests. Those additions improve diagnosis and replay inputs, but a recorded socket transcript is still data that may contain secrets.

### Account for service workers and browser APIs

If a service worker intercepts a request before Playwright's routing layer, a route may appear not to fire. The [network guide](https://playwright.dev/docs/network) recommends blocking service workers when routing is required. Set \`serviceWorkers: 'block'\` in the relevant project rather than assuming every network call reaches \`page.route\`.

Network routes cannot replace browser APIs such as geolocation or a read-only \`navigator\` property. Use context options for supported capabilities and \`page.addInitScript()\` for a controlled browser-API mock that must exist before application scripts. The [browser API mocking guide](https://playwright.dev/docs/mock-browser-apis) demonstrates initialization scripts and warns, implicitly through its patterns, that the mock must match the actual surface the application consumes.

Always remove or scope long-lived routes in helpers. A route registered on a reused manually created context can affect later pages. Default test contexts make cleanup easier because closing the context removes its routes with the rest of the browser state.

---

## Add accessibility checks without pretending they are complete

Semantic locators improve testability, but they do not run an accessibility audit. The [official accessibility guide](https://playwright.dev/docs/accessibility-testing) uses \`@axe-core/playwright\` for automatically detectable violations and explicitly states that automated checks must be combined with manual assessment and inclusive user testing.

Install the adapter, then scan high-value stable states:

\`\`\`bash
npm install --save-dev @axe-core/playwright
\`\`\`

\`\`\`ts
// tests/e2e/checkout-accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('checkout has no automatically detectable serious violations', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'),
  ).toEqual([]);
});
\`\`\`

Choose and document the gate deliberately. A filtered serious/critical gate is not a claim of full conformance. Track excluded rules or regions as owned debt with a reason and expiry; broad permanent \`exclude()\` calls can hide all rules under a large subtree.

Add keyboard journeys for menus, dialogs, forms, focus restoration, and error summaries. Use ARIA snapshots to review semantic structure where that contract matters. Keep visual contrast and zoom checks, screen-reader behavior, cognitive clarity, and touch-target assessment in the wider accessibility program. The dedicated [Playwright accessibility guide](/blog/playwright-accessibility-testing-axe-complete-guide) develops that layered approach.

## Use visual checks for visual contracts

\`expect(page).toHaveScreenshot()\` creates a reference image on the first baseline run and compares later runs against it. The [visual comparison docs](https://playwright.dev/docs/test-snapshots) warn that operating system, browser version, hardware, settings, power source, and headless mode can affect rendering. Generate and compare baselines in the same pinned environment.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('checkout summary preserves its approved layout', async ({ page }) => {
  await page.goto('/checkout?fixture=single-item');
  await expect(page.getByTestId('checkout-summary')).toHaveScreenshot(
    'single-item-summary.png',
    {
      animations: 'disabled',
      caret: 'hide',
      mask: [page.getByTestId('generated-order-reference')],
    },
  );
});
\`\`\`

Prefer component or region screenshots over full-page snapshots when the risk is local. Mask only data that is intentionally variable; masking the area under test makes the comparison meaningless. Freeze application time and test data when timestamps or random content are part of the component contract. Review every baseline update like source code. \`--update-snapshots\` accepts a new image; it does not decide whether the change is correct.

Use assertions for text, role, state, and values, then visual comparison for layout, clipping, spacing, and rendering. A screenshot should not be the only proof that an order total equals the expected amount. See the full [Playwright visual regression guide](/blog/playwright-visual-regression-testing-guide) for baseline governance and environment control.

## Debug from evidence, not from added sleeps

When a test fails, first classify the boundary: locator resolution, actionability, assertion timing, navigation, browser console, network, test data, environment, or product behavior. Then reproduce the narrowest command:

\`\`\`bash
# Run one test by line in one project.
npx playwright test tests/e2e/checkout.spec.ts:42 --project=chromium

# Open UI mode for interactive reruns and time-travel inspection.
npx playwright test --ui

# Launch the Inspector and step through the selected test.
npx playwright test tests/e2e/checkout.spec.ts:42 --project=chromium --debug

# Open a retained CI trace.
npx playwright show-trace test-results/checkout/trace.zip
\`\`\`

The [Inspector](https://playwright.dev/docs/debug#playwright-inspector) supports stepping, locator editing, picking, and actionability logs. \`page.pause()\` is useful at a known breakpoint in a local debug run; remove it before commit. Headed or debug timing can hide races, so prove the fix again in the normal headless command.

### Choose the smallest useful artifact

| Artifact | Best question | Strength | Limitation |
| --- | --- | --- | --- |
| HTML report | Which tests, projects, attempts, and steps failed? | Run-level index and attachments | Limited causal detail alone |
| Screenshot | What did one viewport look like at failure? | Small and fast to inspect | One instant, no network or action history |
| Video | How did motion, focus, popup, or multi-page behavior unfold? | Human-readable sequence | Weak DOM and request detail |
| Trace | What action, locator, DOM state, console output, and request preceded failure? | Rich causal evidence | Larger and may contain sensitive data |
| Server log attachment | What did the application do for this test ID? | Backend correlation | Requires reliable request/run identifiers |

The [trace guide](https://playwright.dev/docs/trace-viewer) recommends \`trace: 'on-first-retry'\` for CI. The viewer exposes source, calls, logs, errors, console, network, metadata, and attachments. Recording every trace can be expensive, so retain evidence according to failure policy. Playwright 1.61 adds video modes that mirror more trace-retention choices, including \`on-all-retries\`, \`retain-on-first-failure\`, and \`retain-on-failure-and-retries\`.

Manual contexts must be closed before their video becomes available. Traces, videos, screenshots, HAR files, and reports can contain credentials, personal data, request bodies, and page content. Apply access control, redaction, and retention limits. The [screenshots, videos, and traces guide](/blog/playwright-screenshots-videos-traces-complete-guide) covers artifact strategy in depth.

## Parallelism, sharding, and retries solve different problems

Playwright runs test files in parallel worker processes by default. Tests within one file run in order unless fully parallel mode is enabled. Each worker is an independent operating-system process with its own browser; workers cannot share in-memory variables. After a test failure, Playwright discards that worker to give later tests a pristine process. These semantics are defined in the [parallelism documentation](https://playwright.dev/docs/test-parallel).

Parallelism uses more workers on one machine. Sharding divides eligible tests across multiple Playwright invocations, usually on multiple CI jobs. Retries rerun a failed test in a new worker. None of them repairs shared data:

- Increase workers only after the application server, database, and runner have enough CPU, memory, connections, ports, and accounts.
- Enable \`fullyParallel\` only for independent tests. It improves test-level shard balancing because Playwright can distribute individual tests rather than whole files.
- Use \`--shard=x/y\` for horizontal CI scale. Each shard must receive the same source, config, environment contract, and Playwright version.
- Merge blob reports after all shards finish so the run has one result rather than several unrelated artifact pages.
- Enable a small retry count to capture intermittent evidence and contain transient infrastructure faults, not to normalize failures.

The [retry model](https://playwright.dev/docs/test-retries) classifies a first-attempt pass as passed, a failure followed by a retry pass as flaky, and exhausted attempts as failed. A flaky result is still a quality signal. Set \`failOnFlakyTests: true\` when the team is ready to keep intermittent tests from silently making the gate green.

Use \`testInfo.retry\` only for diagnostics or narrowly justified cleanup behavior. Do not make assertions weaker on a retry. If attempt two tests a different requirement, the runner can no longer tell you whether the original behavior recovered or the test changed its rules.

Measure shard duration, not just test counts. With \`fullyParallel: true\`, Playwright balances individual tests; without it, files are the shard unit and one large file can dominate a shard. The [official sharding guide](https://playwright.dev/docs/test-sharding) explains both modes and blob-report merging. See [parallel and sharded Playwright execution](/blog/playwright-parallel-sharding-execution-guide) for topology design.

## Run the same contract in CI

A CI job needs three essential stages: install locked dependencies, install matching browsers and operating-system dependencies, and run tests. The [official CI guide](https://playwright.dev/docs/ci) recommends one worker for stability on typical CI agents and sharding across jobs for wider parallelization. Treat that as a starting policy, then measure on your infrastructure.

This compact GitHub Actions workflow runs three shards and preserves each blob report:

\`\`\`yaml
name: Playwright E2E

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=\${{ matrix.shard }}/3 --reporter=blob
        env:
          PLAYWRIGHT_BASE_URL: \${{ vars.PLAYWRIGHT_BASE_URL }}
          E2E_USER_EMAIL: \${{ secrets.E2E_USER_EMAIL }}
          E2E_USER_PASSWORD: \${{ secrets.E2E_USER_PASSWORD }}
      - uses: actions/upload-artifact@v5
        if: \${{ !cancelled() }}
        with:
          name: blob-report-\${{ matrix.shard }}
          path: blob-report
          retention-days: 1

  merge-report:
    if: \${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - uses: actions/download-artifact@v5
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - run: npx playwright merge-reports --reporter=html ./all-blob-reports
      - uses: actions/upload-artifact@v5
        with:
          name: playwright-html-report
          path: playwright-report
          retention-days: 14
\`\`\`

Use a unique deployment URL for each pull request when tests mutate state. Wait for deployment health before launching browsers, and expose a version endpoint or page marker so the job can verify it is testing the intended commit. Upload artifacts even when tests fail, but not after cancellation if incomplete files would mislead triage.

### Docker without version drift

The official image includes Playwright browser binaries and Linux dependencies, but not your project's npm dependency. Pin the image to the same runner version:

\`\`\`dockerfile
FROM mcr.microsoft.com/playwright:v1.61.0-noble

WORKDIR /work
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

CMD ["npx", "playwright", "test"]
\`\`\`

The [Docker guide](https://playwright.dev/docs/docker) recommends \`--init\` to handle PID 1 and \`--ipc=host\` for Chromium memory behavior. The root default disables Chromium's sandbox; that may be acceptable for trusted E2E application code, but the image is not recommended for untrusted browsing. Use a separate user and the documented seccomp profile for crawling untrusted sites. Alpine/musl images do not support Playwright's Firefox and WebKit builds.

Containers are particularly useful for visual baselines because they standardize browsers, libraries, and fonts. They do not standardize a remote application, database, feature flags, or external services. Capture all of those inputs in the run record.

## A practical reference architecture

The maintainable unit is not "one page, one class." It is a test-facing domain contract. A checkout page object may be useful, but a reusable address form component and an order API client may model the application more accurately. Organize by responsibility:

\`\`\`text
tests/e2e/                 business outcomes and final assertions
tests/setup/               auth or environment dependency projects
tests/pages/               page-level navigation and user actions
tests/components/          reusable UI regions such as dialogs and tables
playwright/fixtures.ts     lifecycles, identities, data ownership, custom test export
playwright/api/            typed setup and postcondition clients
playwright/data/           deterministic builders and unique-value factories
playwright/assertions/     small domain matchers used across features
playwright.config.ts       execution, projects, timeouts, evidence, server policy
\`\`\`

Specs should read like decisions: arrange a unique order, open it as the customer, cancel it, verify visible and server outcomes. Fixtures own setup and teardown. Page or component objects own locators and user actions. API clients own endpoint details. The config owns environment-wide execution policy. This separation keeps a selector change out of every spec without hiding the test's purpose behind a giant automation framework.

### Maintenance rules that survive growth

1. Make every test runnable alone, in a random order, and concurrently with itself unless the requirement explicitly forbids it.
2. Keep data identity visible. Include the test or worker owner in names and logs, and make cleanup idempotent.
3. Prefer a little readable duplication over a generic helper with flags for unrelated workflows.
4. Keep locators inside the smallest stable component boundary, but keep outcome assertions in the spec.
5. Validate generated or codegen output before commit. Replace positional selectors, remove duplicated navigation, and add the missing business assertion.
6. Quarantine only with an owner, reason, and removal condition. A permanently skipped test is undocumented missing coverage.
7. Review retries and duration distributions. A retry pass is not "fixed," and a slow tail often reveals polling, contention, or oversized scenarios.
8. Delete tests whose risk has moved to a lower layer or whose requirement no longer exists. Suite size is not a quality metric.
9. Keep framework upgrades routine. Small version steps make browser and API changes easier to isolate.
10. Triage product defects, test defects, data collisions, and environment failures separately so the right team owns the fix.

The [official best-practices guide](https://playwright.dev/docs/best-practices) centers user-visible behavior, isolation, locator resilience, web-first assertions, tooling, browser coverage, and current dependencies. The extended [Playwright best-practices article](/blog/playwright-best-practices-2026) applies those principles to reviews and suite governance.

## What Playwright 1.60 and 1.61 change

Do not label every suite "1.61-ready" because the package installs. Review new capability, removed APIs, browser changes, and artifact policy.

| Version | Important addition | Practical use | Boundary |
| --- | --- | --- | --- |
| 1.60 | \`tracing.startHar()\` / \`stopHar()\` | Scope HAR capture with tracing APIs | Recordings may contain secrets |
| 1.60 | \`locator.drop()\` | External file or data drops with synthetic DataTransfer | Different from dragging one page element to another |
| 1.60 | Page-level ARIA snapshots and optional boxes | Semantic review and agent-readable geometry | Not a full accessibility audit |
| 1.60 | \`test.abort(message)\` | Stop on unrecoverable fixture, hook, or route misuse | Not routine assertion control flow |
| 1.60 | Role \`description\` matching and pseudo-element CSS assertions | Express richer accessible/CSS contracts | Use only when those are product requirements |
| 1.61 | \`browserContext.credentials\` | Virtual WebAuthn registration and authentication | Does not test physical authenticators |
| 1.61 | \`page.localStorage\` and \`page.sessionStorage\` | Direct current-origin Web Storage control | Session storage is still absent from \`storageState\` |
| 1.61 | Expanded video retention modes | Keep the attempts useful for flaky comparison | More evidence costs storage and review time |
| 1.61 | WebSockets in HAR and traces | Diagnose real-time request flows | Content may be sensitive |

The [1.60 notes](https://playwright.dev/docs/release-notes#version-160) also add BrowserContext lifecycle events mirrored from pages, \`browser.on('context')\`, \`webSocketRoute.protocols()\`, better error/reporting context, and HTML/Trace Viewer improvements. They remove long-deprecated \`Locator.ariaRef()\`, the \`handle\` expose-binding option, connect loggers, and old \`videosPath\`/\`videoSize\` context options. Replace those before upgrading.

The [1.61 notes](https://playwright.dev/docs/release-notes#version-161) add \`APIResponse.securityDetails()\` and \`serverAddr()\`, \`artifactsDir\` for CDP attachment, screencast cursor and frame timestamps, \`expect.soft.poll()\`, \`fullConfig.argv\`, reporter visibility into \`failOnFlakyTests\`, separate AggregateError entries in \`testInfo.errors\`, and the \`-G\` alias for inverted grep. Ubuntu 26.04 is supported. Adopt only features that simplify a real contract; new APIs do not require rewriting stable tests.

When upgrading:

1. Change the package, lockfile, browser install, and Docker tag together.
2. Read every release note between the old and new versions.
3. Run a small browser matrix and critical paths before the full suite.
4. Regenerate visual baselines only after reviewing rendering changes.
5. Check trace, video, report, and HAR retention because new modes can change artifact volume.
6. Search for removed or deprecated APIs and compile TypeScript before browser execution.
7. Verify custom reporters and fixtures against new error and configuration fields.

## Frequently asked questions

### 1. What is Playwright testing?

Playwright testing uses Microsoft's Playwright browser automation APIs and, in this guide, the Playwright Test runner to verify modern web applications. The runner supplies isolated browser contexts, fixtures, assertions, projects, parallel workers, retries, reporters, and tracing around Chromium, Firefox, and WebKit automation. It can also send direct API requests, but browser tests should remain focused on user and integration risks.

### 2. Is Playwright only for end-to-end tests?

No. Playwright provides a browser library, API request contexts, and an experimental component-testing family in addition to Playwright Test. Its strongest default package is full web application testing. Use API checks for setup and service verification, and keep logic-heavy cases in unit or component layers when a browser adds no useful evidence.

### 3. Why are Playwright tests still flaky if it auto-waits?

Auto-waiting handles element actionability, not every application condition. Tests still become intermittent through shared accounts, nondeterministic data, eventually consistent services, unstable environments, broad network mocks, incorrect assertions, or requirements that depend on time. Locate the boundary in a trace and wait for the closest business evidence instead of adding \`waitForTimeout()\`.

### 4. What is the difference between BrowserContext and Page?

A BrowserContext is an isolated browser profile with its own cookies, storage, cache, and permissions. A Page is one tab within that context. Pages in the same context share profile state; pages in different contexts do not. Playwright Test creates a new context and default page for every test, while reusing browsers at the worker level.

### 5. Does storageState save sessionStorage?

No. A storage snapshot includes cookies and local storage, and optionally IndexedDB when \`indexedDB: true\` is requested. Session storage is tab-specific and is not serialized by \`storageState\`. Playwright 1.61 adds direct \`page.sessionStorage\` operations, but persistence across contexts still requires an explicit, origin-scoped setup technique. Protect any exported value as a credential.

### 6. Which Playwright locator should I use first?

Use the locator that best expresses how a user or accessibility client identifies the target. \`getByRole()\` with an accessible name is usually strongest for controls; \`getByLabel()\` is natural for form fields; visible text and explicit test IDs cover other contracts. Avoid selecting by DOM ancestry when a stable semantic or test contract exists.

### 7. Should I use page.waitForTimeout in Playwright?

Not in normal regression tests. A fixed sleep is simultaneously too long when the condition is ready early and too short when the environment is slower. Use locator actionability, web-first assertions, event promises, a specific response, or \`expect.poll()\` for an external eventual condition. A short timeout can be acceptable during local investigation, but it should not become the fix.

### 8. How many retries should Playwright use in CI?

Start with zero locally and a small CI allowance, commonly one or two, only when retained evidence helps classify intermittent failures. The exact count depends on infrastructure and release policy. Report retry passes as flaky and fix their cause. Large retry counts increase latency and can turn an unreliable gate green by chance.

### 9. How many Playwright workers should CI use?

The official CI guidance starts with one worker for stability on typical hosted agents, then recommends sharding across jobs for broader parallelization. A capable self-hosted runner can use more after measuring CPU, memory, browser crashes, backend capacity, and test-data collisions. Worker count is an infrastructure setting, not a universal framework constant.

### 10. Is Playwright mobile emulation the same as real-device testing?

No. Device descriptors emulate settings such as viewport, user agent, touch, and device scale factor in Playwright's supported desktop browser builds. They do not reproduce physical hardware, mobile operating-system browser chrome, radio conditions, biometric hardware, or every platform codec. Use real devices or a device service when those risks matter.

### 11. When should I use Playwright CLI instead of Playwright Test?

Use \`npx playwright test\` for committed, deterministic specs, fixtures, projects, retries, and CI gates. Use the agent-oriented Playwright CLI for interactive browser operation, exploration, evidence capture, or agent workflows. The [Playwright CLI complete guide](/blog/playwright-cli-complete-guide-2026) and [author-qualified CLI skill](/skills/Pramod/playwright-cli) cover that surface.

### 12. What should a team implement first?

Start with one critical Chromium journey, a fresh default context, semantic locators, web-first outcome assertions, unique API-created data, and a trace on first retry. Run it in CI with pinned dependencies and browsers. Add authentication reuse, other browsers, accessibility, visual checks, workers, and shards only after the first path is independently repeatable and easy to diagnose.

## Final implementation checklist

- Pin \`@playwright/test\`, browsers, lockfile, and Docker image together.
- Keep deployment origin and credentials outside test code.
- Give every test clean browser state and unique mutable backend data.
- Use semantic locators, strictness, and web-first assertions.
- Put setup and cleanup in typed fixtures with clear scope.
- Save authentication state only for synthetic accounts and never commit it.
- Use direct API calls for preconditions, not for behavior the test claims to verify.
- Mock the narrowest network boundary and keep at least one real integration path.
- Combine automated accessibility checks with manual and inclusive testing.
- Generate and compare visual baselines in one pinned rendering environment.
- Retain traces and selected video or screenshots according to failure policy.
- Treat retries as flaky evidence, then scale independent tests through shards.
- Merge reports and correlate browser artifacts with application logs.
- Review Playwright release notes on every upgrade.

Build the smallest trustworthy path first, then widen it. Continue with the [locator guide](/blog/playwright-locators-best-practices-2026), [BrowserContext guide](/blog/playwright-browser-context-guide-2026), [GitHub Actions CI guide](/blog/playwright-ci-github-actions-complete-guide-2026), and [Playwright beginner tutorial](/blog/playwright-tutorial-beginners-2026). Use the [QA skills directory](/skills) for reusable agent instructions, while keeping this guide's central rule intact: a reliable suite makes state ownership, user intent, and failure evidence explicit.
`,
  },
};
