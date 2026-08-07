import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Browser Context Permissions Geolocation: A Reliable Guide for Location-Aware Tests',
  description: 'Use playwright browser context permissions geolocation workflows to test maps, delivery zones, prompts, and permission failures with reliable contexts.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Browser Context Permissions Geolocation: A Reliable Guide for Location-Aware Tests

Playwright browser context permissions geolocation testing means two separate things must be configured together: the browser context must have a synthetic location, and the relevant origin must be allowed to read it. Setting coordinates without granting the \`geolocation\` permission usually leaves the application in the same state as a real user who has not accepted the browser prompt. Granting the permission without setting coordinates gives the app permission to ask for a position, but not a useful deterministic answer.

For QA engineers, the payoff is a repeatable way to test maps, store finders, rideshare pickup flows, delivery-zone gates, fraud checks, travel search defaults, regional tax or content rules, and location-aware onboarding. The right pattern is not one global coordinate in every test. It is a small catalog of named locations, granted at the browser-context boundary, paired with assertions that prove the app consumed the location rather than merely rendering a happy path.

This guide shows concrete TypeScript workflows for Playwright Test. It covers context-level configuration, per-test overrides, origin-specific permission grants, negative cases, diagnosis for common failures, and the way AI coding agents should be guided when they generate location tests. It also connects the topic to broader framework selection in [JavaScript testing frameworks for 2026](/blog/javascript-testing-frameworks-complete-guide-2026) and selector discipline in [Playwright locator best practices](/blog/playwright-best-practices-locators-2026), because reliable location tests still fail if the suite drives the wrong boundary or uses brittle selectors.

## Treat Permission and Position as Different Contracts

The first mistake teams make is talking about geolocation as if it were one switch. In a browser, location access is a permission decision and a sensor value. Playwright mirrors that split. A browser context can be created with \`geolocation\` coordinates, and permissions can be granted through \`permissions\` in test options or by calling \`browserContext.grantPermissions()\`. The official Playwright docs show both parts together for location tests: a context geolocation value plus the \`geolocation\` permission.

That separation is useful. It lets a QA suite verify four behaviors instead of one. The application should handle allowed location, denied location, unavailable location, and changed location. A delivery app might show local restaurants when allowed, a ZIP code input when denied, a nonblocking error when the position is unavailable, and refreshed availability after the user moves.

| Browser state | Playwright setup | What the test should prove |
| --- | --- | --- |
| User allowed location | Coordinates plus \`geolocation\` permission | App reads position and renders location-specific output |
| User has not granted permission | Coordinates only, or no permission grant | App does not assume access and shows a prompt path or fallback |
| Location is unavailable | \`context.setGeolocation(null)\` after creating a context | App handles the browser reporting no position |
| User moves during session | \`context.setGeolocation()\` with new coordinates | App refreshes distance, eligibility, or map viewport correctly |
| Permission is cleared | \`context.clearPermissions()\` | App returns to a denied or prompt-dependent path |

The wording matters in test names. A test named \`finds nearby stores\` hides several contracts. A better test name is \`uses granted geolocation to rank nearby stores\`. Another useful name is \`falls back to postal-code search when geolocation permission is not granted\`. Those names tell maintainers which half of the browser contract is under test.

Playwright's context model also protects isolation. Each test normally receives a fresh browser context, so permission and geolocation settings should not leak from one test to the next. If a suite manually creates contexts or shares state in fixtures, it must preserve that isolation intentionally. Shared location state is one of those failures that looks harmless until tests start passing locally and failing on CI because a previous test granted a permission on the same origin.

## Build a Named Location Catalog Instead of Scattering Coordinates

Raw latitude and longitude values age poorly in tests. They are hard to review, easy to transpose, and meaningless when an assertion later says a restaurant is available or a warehouse is out of range. A named catalog gives your suite the language of the product. Use real coordinates only when the business meaning is explicit and the data belongs to a test environment.

\`\`\`ts
export type TestLocationName =
  | 'downtownServiceArea'
  | 'suburbanEdge'
  | 'outsideDeliveryZone'
  | 'airportPickup';

export const testLocations: Record<
  TestLocationName,
  { latitude: number; longitude: number; accuracy: number; label: string }
> = {
  downtownServiceArea: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 25,
    label: 'Downtown San Francisco service area',
  },
  suburbanEdge: {
    latitude: 37.3382,
    longitude: -121.8863,
    accuracy: 40,
    label: 'San Jose edge case',
  },
  outsideDeliveryZone: {
    latitude: 36.7783,
    longitude: -119.4179,
    accuracy: 80,
    label: 'Central California out of range',
  },
  airportPickup: {
    latitude: 37.6213,
    longitude: -122.379,
    accuracy: 30,
    label: 'SFO pickup flow',
  },
};
\`\`\`

The \`accuracy\` field is optional in Playwright's geolocation object, but including it in fixtures can expose application assumptions. Some apps treat a low-accuracy position differently from a precise position. Others ignore accuracy entirely. Either behavior may be acceptable, but tests should document the intended contract.

Avoid using coordinates copied from a random production user or a private address. A synthetic coordinate near a known city center is usually enough for UI behavior. If the app uses polygons, warehouses, or tax boundaries, ask the product team for test-safe points with names tied to those rules. "Boundary point A" is not a QA-friendly fixture. "Inside zone, 200 meters from west boundary" is.

| Coordinate source | Reviewability | Data risk | Recommended use |
| --- | --- | --- | --- |
| Named synthetic point from test data | High | Low | Default for automated suites |
| Public landmark coordinate | Medium | Low | Useful for map viewport and locale checks |
| Production customer coordinate | Low | High | Avoid in committed tests |
| Random map click | Low | Low to medium | Acceptable only for exploratory reproduction |
| Boundary fixture from product rules | High | Low | Best for eligibility and regional pricing tests |

Keep the catalog small. A suite with fifty named locations often signals that tests are encoding business data in the wrong place. The location fixture should identify the browser input. Server-side coverage for every zone, polygon, and radius belongs in API, database, or service tests where the rules can be asserted directly.

## Configure Geolocation at Project Scope When the Whole Suite Shares a Region

Project-level \`use\` options are the cleanest fit when an entire project exercises the app from one location. Playwright passes those options into the browser context for each test. The context starts with the configured coordinates and permissions, and each test can focus on user behavior.

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';
import { testLocations } from './tests/support/locations';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-sf-location',
      use: {
        ...devices['Desktop Chrome'],
        geolocation: testLocations.downtownServiceArea,
        permissions: ['geolocation'],
      },
    },
    {
      name: 'mobile-sf-location',
      use: {
        ...devices['Pixel 7'],
        geolocation: testLocations.downtownServiceArea,
        permissions: ['geolocation'],
      },
    },
  ],
});
\`\`\`

This pattern is good for smoke tests that must run under a stable region. For example, a retail site may need one project that always behaves as "inside primary market" on desktop and mobile. It is also useful when screenshots, locale, timezone, and geolocation need to form one coherent simulated user.

The risk is accidental overreach. A global permission grant can hide product bugs in flows where the user has not accepted location access. It can also make a non-location test depend on a local catalog entry. If a checkout test only needs a signed-in account and does not care about location, do not place it in a project whose identity is "San Francisco with location allowed" unless that is truly the baseline user.

| Scope | Use it when | Avoid it when |
| --- | --- | --- |
| Global \`use\` in config | Every test in the repository assumes the same region | Some tests must verify denied or unavailable location |
| Project-level \`use\` | A browser/device matrix maps to a location scenario | Tests inside the project have mixed permission expectations |
| File-level \`test.use\` | One spec file owns a location behavior family | The file contains unrelated account or checkout tests |
| Runtime \`context.grantPermissions()\` | The test needs to change or scope permission mid-flow | Static setup would communicate the scenario more clearly |
| Manual \`browser.newContext()\` | Library-mode tests or custom context orchestration | Normal Playwright Test fixtures already provide isolation |

When using AI coding agents to generate Playwright tests, ask for the scope explicitly. "Add a location-aware checkout test" is vague. "Create a new spec that uses file-level \`test.use\` with the named \`outsideDeliveryZone\` fixture and asserts the delivery warning" is much harder for the agent to misinterpret.

## Use File-Level or Test-Level Overrides for Location Scenarios

Many location tests belong closer to the spec than the global config. Playwright Test supports \`test.use()\` at the file level, and it can also be placed inside a \`describe\` block. That makes it easy to group scenarios without building an oversized project matrix.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { testLocations } from '../support/locations';

test.describe('delivery-zone messaging', () => {
  test.use({
    geolocation: testLocations.outsideDeliveryZone,
    permissions: ['geolocation'],
  });

  test('shows a clear out-of-zone message after reading browser location', async ({ page }) => {
    await page.goto('/delivery');
    await page.getByRole('button', { name: 'Use my current location' }).click();

    await expect(page.getByRole('heading', { name: 'Delivery is not available here' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'See pickup options' })).toBeVisible();
  });
});
\`\`\`

This example asserts product behavior rather than implementation detail. It does not check whether \`navigator.geolocation.getCurrentPosition\` was called. It checks the result the user sees after clicking the control that should use the browser location. That is the correct boundary for a browser test.

For permission-denied paths, leave the permission out and assert the fallback. Depending on the product, the browser may present a prompt in headed mode, or the app may handle a denied callback. Automated tests should avoid interacting with a real browser permission prompt when Playwright can set the context state directly. The goal is to test the app's response to permission state, not to test the browser vendor's prompt UI.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { testLocations } from '../support/locations';

test.use({
  geolocation: testLocations.downtownServiceArea,
});

test('offers manual address entry when geolocation permission is not granted', async ({ page }) => {
  await page.goto('/delivery');
  await page.getByRole('button', { name: 'Use my current location' }).click();

  await expect(page.getByRole('textbox', { name: 'Street address' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check address' })).toBeEnabled();
});
\`\`\`

What people get wrong here is adding \`permissions: ['geolocation']\` to a shared base fixture because one location test needed it. That turns denial coverage into theater. The fallback test may still pass if the app exposes manual address entry in multiple states, but it no longer proves permission behavior. Keep allowed and denied scenarios visibly separate in setup.

## Grant Permissions for the Correct Origin

Playwright's \`browserContext.grantPermissions()\` can grant permissions broadly to the context or only for a given origin. Origin scoping is important for applications that use multiple hosts: an app shell on \`app.example.test\`, an embedded checkout on \`checkout.example.test\`, a map frame, or a local development server with a different port.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { testLocations } from '../support/locations';

test('allows location only on the application origin', async ({ context, page }) => {
  await context.setGeolocation(testLocations.airportPickup);
  await context.grantPermissions(['geolocation'], {
    origin: 'https://app.example.test',
  });

  await page.goto('https://app.example.test/pickup');
  await page.getByRole('button', { name: 'Use current location' }).click();

  await expect(page.getByText('SFO pickup area')).toBeVisible();
});
\`\`\`

Use a full origin, not a path. An origin is the scheme, host, and port. \`https://app.example.test\` and \`http://app.example.test\` are different origins. \`http://127.0.0.1:3000\` and \`http://localhost:3000\` are different origins. \`http://localhost:3000\` and \`http://localhost:5173\` are different origins. This distinction explains many "but I granted permission" failures.

If your test navigates with \`baseURL\`, make the permission origin match the resolved page URL. Do not grant permission to the marketing site when the app redirects to a signed-in dashboard on another host. Do not grant permission to \`localhost\` when CI serves the app on \`127.0.0.1\`.

| Symptom | Likely cause | Diagnostic move |
| --- | --- | --- |
| App still shows manual entry after permission grant | Permission granted for the wrong origin | Log \`page.url()\` after navigation and compare scheme, host, and port |
| Works locally but fails in CI | Different base URL or redirected host | Print the configured \`BASE_URL\` and final page URL in the trace |
| Chromium passes, another browser fails | Browser behavior or app code depends on unsupported prompt assumptions | Remove prompt UI interaction and assert app fallback from context state |
| First test passes, second behaves as already allowed | Shared context or reused app storage | Confirm each test receives a fresh context and clear app-side location cache |
| Location changes but UI does not refresh | App reads position once and caches it | Trigger the product's refresh action or reload the page intentionally |

Origin scoping also gives you a security-oriented check. If an embedded frame should not receive location access, grant permission only to the top-level app origin and assert that the embedded feature takes the no-location path. That test is not a full browser permission security audit, but it catches accidental overbroad setup in the suite.

## Change Geolocation During a Test Without Rebuilding the Browser

Playwright exposes \`browserContext.setGeolocation()\`, so you can change the synthetic coordinates after a context already exists. This is useful for flows where a user moves, edits a pickup point, or retries after a permission state changes. It is also useful for diagnosing whether the app reads geolocation once at startup or in response to a user action.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { testLocations } from '../support/locations';

test.use({
  geolocation: testLocations.downtownServiceArea,
  permissions: ['geolocation'],
});

test('refreshes pickup choices after the browser location changes', async ({ context, page }) => {
  await page.goto('/pickup');
  await page.getByRole('button', { name: 'Use current location' }).click();
  await expect(page.getByRole('heading', { name: 'Stores near downtown' })).toBeVisible();

  await context.setGeolocation(testLocations.airportPickup);
  await page.getByRole('button', { name: 'Refresh location' }).click();

  await expect(page.getByRole('heading', { name: 'SFO pickup area' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Terminal pickup' })).toBeVisible();
});
\`\`\`

Changing the context geolocation does not automatically prove the page requested it again. The application may store the first result in memory, local storage, a cookie, or a backend profile. Your test must trigger whatever user action is supposed to read location again. If the product has no such action, a reload may be a valid behavior, but write that into the test name.

For unavailable location, call \`setGeolocation(null)\` or pass \`undefined\` according to the documented behavior. The application should handle the error path without turning it into a generic failure toast.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('keeps search usable when browser position is unavailable', async ({ context, page }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(null);

  await page.goto('/stores');
  await page.getByRole('button', { name: 'Find stores near me' }).click();

  await expect(page.getByText('We could not detect your current location')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'City or ZIP code' })).toBeVisible();
});
\`\`\`

Do not overuse mid-test movement. If a scenario starts in one place and asserts one result, a static \`test.use\` block is clearer. Reserve \`context.setGeolocation()\` for behavior that genuinely changes inside the session.

## Assert Observable Product Outcomes, Not Permission Plumbing

A browser permission test should still read like a user workflow. The user clicks "Use current location", sees a nearby result, changes a pickup point, or receives a meaningful fallback. Tests that only evaluate \`navigator.permissions.query\` are brittle and often miss product bugs. They can be useful for diagnostics, but not as the main assertion.

Use locators that express the rendered contract. If the app exposes accessible names for buttons, forms, headings, and map controls, Playwright's role and text locators make the intent readable. That is especially important in AI-generated tests, where brittle CSS selectors can mask the real scenario. A generated test that clicks \`.btn:nth-child(3)\` may still pass after geolocation is broken because it is clicking the wrong control.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { testLocations } from '../support/locations';

test.use({
  geolocation: testLocations.downtownServiceArea,
  permissions: ['geolocation'],
});

test('ranks nearby service centers by browser location', async ({ page }) => {
  await page.goto('/service-centers');
  await page.getByRole('button', { name: 'Use current location' }).click();

  const results = page.getByRole('list', { name: 'Nearby service centers' });
  await expect(results.getByRole('listitem').first()).toContainText('Market Street');
  await expect(results.getByRole('listitem').first()).toContainText('0.4 miles');
});
\`\`\`

The distance assertion is deliberately approximate in product language, not a floating-point formula in the browser test. If your application calculates distance client-side and the formula is critical, test that calculation separately with unit tests over known coordinates. The browser test should prove that the location result enters the workflow and affects what the user sees.

| Assertion type | Good browser-test example | Usually better elsewhere |
| --- | --- | --- |
| Permission outcome | Fallback address form appears when permission is absent | Browser prompt rendering details |
| Location consumption | Nearby stores reorder after using current location | Haversine formula edge cases |
| Regional eligibility | Out-of-zone message appears for a named fixture point | Every polygon boundary in the country |
| UI refresh | A refreshed location changes pickup choices | Internal cache invalidation implementation |
| Accessibility | Location button has a role and useful name | Visual-only map pin color as the only signal |

Map canvases deserve special care. Many maps render text and pins inside a canvas or third-party widget, which can be hard to assert through accessible locators. Prefer asserting surrounding product UI: selected address, result list, pickup card, delivery warning, or distance label. If the map itself is the product, add visual regression or screenshot checks with stable masks for dynamic tile content.

## Diagnose the Failure Before Rewriting the Test

Location failures are often misdiagnosed because they sit at the intersection of browser permissions, app state, data rules, and network responses. Before changing selectors or increasing timeouts, answer three questions: did the browser context have the right permission, did it have the right coordinates, and did the app request or consume them during this flow?

Start with the Playwright trace. Retain traces on failure and inspect the action before the wrong UI appeared. Confirm the final URL, the clicked control, console errors, network responses, and screenshots. If the app redirected to a different origin, the permission grant may not apply. If the UI never clicked the location button, the coordinate setup is irrelevant.

\`\`\`ts
import { test } from '@playwright/test';

test('diagnoses current browser location state', async ({ context, page }) => {
  await context.grantPermissions(['geolocation'], {
    origin: 'http://127.0.0.1:3000',
  });
  await context.setGeolocation({ latitude: 37.7749, longitude: -122.4194, accuracy: 25 });

  await page.goto('http://127.0.0.1:3000/delivery');

  const position = await page.evaluate(
    () =>
      new Promise<{
        latitude: number;
        longitude: number;
        accuracy: number;
        href: string;
      }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              href: window.location.href,
            }),
          reject,
        );
      }),
  );

  console.log(position);
});
\`\`\`

Use this diagnostic only while investigating. It tests browser plumbing, not your product. Once you learn that Playwright is providing the expected location, remove or quarantine the diagnostic and fix the product-level test.

Another realistic failure mode is app-side caching. Suppose a user has a saved home address in local storage. The app may skip \`navigator.geolocation\` entirely and render the saved address. The Playwright setup is correct, but the scenario is wrong. Clear the relevant app state, use a new account, or assert the saved-address behavior directly. Do not fight the cache by adding arbitrary waits.

Network drift can also look like a geolocation problem. The browser may send coordinates to an API, and the API may return no stores because test data changed. Capture the request payload through Playwright routing when necessary, but keep the handler narrow and transparent.

\`\`\`ts
import { expect, test } from '@playwright/test';
import { testLocations } from '../support/locations';

test.use({
  geolocation: testLocations.downtownServiceArea,
  permissions: ['geolocation'],
});

test('sends browser-derived coordinates to the availability endpoint', async ({ page }) => {
  const requests: Array<{ url: string; body: string | null }> = [];

  page.on('request', (request) => {
    if (request.url().includes('/api/availability')) {
      requests.push({ url: request.url(), body: request.postData() });
    }
  });

  await page.goto('/delivery');
  await page.getByRole('button', { name: 'Use current location' }).click();

  await expect(page.getByRole('heading', { name: 'Delivery options' })).toBeVisible();
  expect(requests.some((request) => request.body?.includes('37.7749'))).toBe(true);
});
\`\`\`

The request assertion is intentionally secondary. It helps diagnose whether the app forwarded the coordinates. It should not replace the visible user assertion. If the endpoint contract is important, add API contract tests with explicit schema and business-rule checks.

## Keep Permission Tests Deterministic in CI

CI adds three pressures: parallelism, environment differences, and test-data churn. Location tests need deliberate boundaries so those pressures do not turn into flaky failures. Run each test in a fresh context, avoid depending on a browser prompt UI, use stable base URLs, and keep test accounts independent when location changes are saved server-side.

GitHub Actions and GitLab CI both support running Playwright commands as ordinary shell steps. There is no special geolocation flag required at the CI level for the examples in this guide. The important part is that the application base URL and test data match the origins and scenarios used by the tests.

\`\`\`yaml
name: location-e2e

on:
  pull_request:
  workflow_dispatch:

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e -- --project=chromium-sf-location
        env:
          BASE_URL: http://127.0.0.1:3000
\`\`\`

If your app persists a "current location" to the user profile, use separate users for tests that mutate it. If it stores location in local storage, rely on Playwright's fresh context per test and avoid reusing storage state after the app writes location. If authentication storage state is required, generate it before location is set, or clear the app's location keys during setup with product-owned utilities.

| CI risk | How it appears | Stabilizing action |
| --- | --- | --- |
| Base URL mismatch | Permission is granted to a different origin than the page | Derive the grant origin from the same config value used for navigation |
| Shared account writes location | Later tests start from the wrong saved place | Use per-worker accounts or reset profile location between tests |
| Overbroad project setup | Denied-permission tests accidentally run with granted permission | Split projects or use file-level overrides for negative coverage |
| Dynamic map tiles | Screenshot diffs change without product regressions | Assert product UI around the map or mask volatile regions |
| Third-party availability data | Nearby results disappear | Seed provider fixtures or test against a controlled backend |

One useful pattern is a tiny helper that derives an origin from \`baseURL\` and grants only that origin. It prevents copy-paste mistakes when local, preview, and CI hosts differ.

\`\`\`ts
import type { BrowserContext, TestInfo } from '@playwright/test';

export async function grantGeolocationForBaseURL(
  context: BrowserContext,
  baseURL: string | undefined,
  testInfo: TestInfo,
) {
  if (!baseURL) {
    throw new Error('baseURL is required for origin-scoped geolocation permission');
  }

  const origin = new URL(baseURL).origin;
  await context.grantPermissions(['geolocation'], { origin });
  await testInfo.attach('geolocation-origin.txt', {
    body: origin,
    contentType: 'text/plain',
  });
}
\`\`\`

The attachment gives reviewers a simple clue in failed reports. When a location test fails only in preview environments, seeing the exact origin often cuts the investigation from an hour to a minute.

## Give AI Coding Agents a Narrow Geolocation Brief

AI coding agents can write useful Playwright location tests, but they need constraints that match browser reality. Without those constraints, agents commonly create tests that set coordinates but forget permissions, click browser prompt UI, hard-code a wrong origin, or assert implementation details that the product does not promise.

Give the agent a short brief with the named fixture, the permission state, the user action, the expected UI, and the selectors to prefer. Include the rule that no global config should be changed unless the whole project needs the location. Ask for a trace-friendly failure message or attachment only when it helps diagnosis.

\`\`\`text
Create one Playwright Test spec for the delivery page.

Scenario:
- Location fixture: outsideDeliveryZone from tests/support/locations.ts.
- Permission state: geolocation granted only for the baseURL origin.
- User action: click the "Use my current location" button.
- Expected UI: heading "Delivery is not available here" and link "See pickup options".
- Use getByRole locators where possible.
- Do not change global Playwright config.
- Do not interact with the browser permission prompt UI.
\`\`\`

That prompt is more valuable than a generic "write e2e tests for geolocation." It anchors scope and avoids hidden suite-wide permission changes. If the agent proposes a helper, check that it does not centralize too much policy. A helper that grants permission for a supplied origin is fine. A helper that always grants location to every test is a regression waiting to happen.

Review generated tests as you would review production code. Does the test name say allowed, denied, unavailable, or changed? Does the origin match navigation? Are coordinates named? Does the assertion prove user-visible behavior? Are negative cases separate from positive setup? These review questions matter more than whether the code compiles on the first attempt.

## Pick the Right Layer for Each Location Rule

Browser geolocation tests are powerful because they exercise the real browser API and the real UI. They are not the cheapest or most precise way to test every rule involving coordinates. A healthy suite spreads coverage across layers.

Use unit tests for pure coordinate math, API tests for server eligibility, browser tests for permission and user-flow behavior, and a small smoke path for the integrated happy path. This prevents the browser suite from becoming a slow geospatial rule engine.

| Rule or behavior | Best primary layer | Browser test role |
| --- | --- | --- |
| Distance calculation | Unit test | One representative UI assertion |
| Delivery polygon boundary | API or service test | One in-zone and one out-of-zone user path |
| Browser permission fallback | Playwright browser test | Primary coverage |
| Address form validation | Component or browser test | Verify keyboard and accessibility behavior |
| Regional pricing display | API plus browser smoke | Confirm the displayed price source |
| Map marker rendering | Visual or browser test | Assert stable product signals around the map |

This layering is also where broader tool choice matters. If a team is comparing Playwright with other JavaScript tools, evaluate whether the framework makes browser context setup, permission state, trace inspection, and per-test isolation straightforward. The best tool for location-aware QA is the one that lets engineers model the browser state directly and then assert the product behavior without ceremony.

## Frequently Asked Questions

### Do I need both permissions and geolocation in Playwright?

Yes, for the common allowed-location path you need both. The geolocation value gives the browser a deterministic position, while the \`geolocation\` permission lets the page read that position without relying on a real prompt interaction. If you set only coordinates, you can still test the not-granted path, but the app should not receive a successful position. If you grant only permission, the page has access but no useful deterministic coordinates for assertions.

### Should geolocation permissions be configured globally?

Only configure them globally when every test in that project represents a user who has granted location access. Many suites need both allowed and denied coverage, so file-level \`test.use\` or runtime \`context.grantPermissions()\` is usually clearer. A global grant can hide fallback bugs and make unrelated tests depend on a regional setup. Project-level configuration is a good compromise when the project name and test selection clearly communicate the location scenario.

### Why does my geolocation test pass locally but fail in CI?

The most common cause is origin mismatch. Locally you may navigate to \`http://localhost:3000\`, while CI uses \`http://127.0.0.1:3000\` or a preview URL. Permission grants are origin-sensitive, so scheme, host, and port must match. Other common causes are shared accounts that persist location, test data that changed, or map assertions tied to volatile third-party tiles. Inspect the Playwright trace and compare the final page URL with the granted origin.

### How should I test users who deny location access?

Do not grant the \`geolocation\` permission for that scenario, then drive the product flow that asks for current location and assert the fallback. Good fallback assertions include a manual address form, explanatory copy, a retry option, or a nonblocking alert. Avoid depending on the browser permission prompt UI itself. Your application owns the fallback experience, while the browser owns the prompt chrome. Keep denied-location tests separate from allowed-location tests so setup cannot blur the contract.
`,
};
