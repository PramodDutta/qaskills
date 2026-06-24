import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Browser Mode: The Complete 2026 Browser Testing Guide',
  description:
    'Master Vitest browser mode in 2026: configure the Playwright provider, run component and unit tests in a real browser, mock APIs, and ship a fast CI suite.',
  date: '2026-06-24',
  category: 'Guide',
  content: `
# Vitest Browser Mode: The Complete 2026 Browser Testing Guide

Vitest browser mode runs your tests inside a real browser instead of the simulated jsdom or happy-dom environment that Vitest uses by default. For most of Vitest's history, "browser testing" meant pointing your unit tests at a fake DOM implemented in Node. That approach is fast, but it cannot reproduce real layout, real CSS, real focus management, or real pointer events. Vitest browser mode replaces the fake DOM with an actual rendering engine driven by Playwright (or, alternatively, WebDriverIO), so the test you write executes in the same environment your users do.

In 2026, browser mode has matured from an early experiment into a first-class, stable feature that many teams ship in production CI. This guide walks you through everything: why browser mode exists, how to install and configure the Playwright provider, how to write component tests with the built-in locators and interactivity API, how to mock network requests, how to capture screenshots, and how to keep the whole thing fast in continuous integration. If you have been weighing test runners, our [Jest vs Vitest comparison](/blog/jest-vs-vitest-2026) explains why so many teams migrated to Vitest in the first place; browser mode is one of the biggest reasons that momentum continued.

The headline benefit is fidelity without leaving the Vitest ecosystem. You keep Vitest's instant watch mode, its Vite-native transform pipeline, its \`expect\` API, and its config, but your tests now run against Chromium, Firefox, or WebKit. That means \`getByRole\`, \`toBeVisible\`, and \`click\` mean exactly what they say, and bugs that only appear in a real browser stop slipping through. Let us set it up properly.

## What Is Vitest Browser Mode and Why Use It?

By default, Vitest runs tests in Node and simulates the DOM with jsdom or happy-dom. Those libraries reimplement browser APIs in JavaScript, which is impressively complete but fundamentally incomplete: there is no layout engine, no real CSS cascade computation, no genuine focus stack, and no actual paint. Browser mode swaps that simulation for a real browser instance controlled by a provider. Your component renders, the engine lays it out, and Vitest drives it through Playwright's locator and action APIs.

You should reach for browser mode when your tests depend on browser-only behavior: visibility and overlap, computed styles, scroll position, \`IntersectionObserver\`, \`ResizeObserver\`, focus traps, drag-and-drop, clipboard, and pointer events. For pure logic that never touches the DOM, the default Node environment is still faster and perfectly adequate.

Here is how the three environments compare:

| Capability | Browser mode (Playwright) | jsdom | happy-dom |
| --- | --- | --- | --- |
| Rendering engine | Real Chromium/Firefox/WebKit | Simulated | Simulated |
| Layout and computed CSS | Accurate | None | None |
| Focus and tab order | Accurate | Unreliable | Unreliable |
| Real pointer/keyboard events | Yes | Synthetic | Synthetic |
| Network interception | Real (route handlers) | Module mock only | Module mock only |
| Speed per test | Fast (real browser) | Fastest | Very fast |
| Screenshot/visual testing | Built in | No | No |

The point of this table is not that one column wins. It is that browser mode and the simulated environments serve different jobs, and a healthy 2026 suite uses both.

## Vitest Browser Mode vs the Default jsdom Environment

A practical way to understand the difference is to look at a test that passes in jsdom but should fail. Consider a tooltip that is positioned off-screen due to a CSS bug. In jsdom there is no layout, so the tooltip's text is present in the DOM tree and \`toBeVisible()\` returns true even though a real user sees nothing. In browser mode the engine computes that the element is outside the viewport or has zero size, and \`toBeVisible()\` correctly returns false. That single difference catches an entire class of real-world regressions.

Browser mode also changes how you think about mocking. In jsdom you typically mock \`fetch\` or use a library to intercept at the module level. In browser mode you intercept actual network traffic with route handlers, exactly as you would in an end-to-end Playwright suite. Your component runs its real data-fetching code instead of a hand-rolled stand-in, which keeps the test honest as the component evolves.

## Installing the Vitest Browser Provider

Browser mode requires two pieces: the Vitest browser package and a provider that controls the browser. The Playwright provider is the recommended choice in 2026 because it supports all three engines and ships the richest interactivity API. Install everything in one step:

\`\`\`bash
npm install --save-dev vitest @vitest/browser playwright
\`\`\`

If you are testing React components you also want the framework bindings and the browser-aware testing utilities:

\`\`\`bash
npm install --save-dev @vitest/browser vitest-browser-react
\`\`\`

Then download the browser binaries that Playwright drives:

\`\`\`bash
npx playwright install --with-deps chromium
\`\`\`

The \`--with-deps\` flag installs the OS-level libraries Chromium needs on Linux, which matters on CI runners. You can install \`firefox\` and \`webkit\` too, but starting with Chromium keeps your first run lean. Pin the versions of \`vitest\` and \`@vitest/browser\` to the same release line in \`package.json\`; mismatched versions are the single most common source of confusing startup errors.

## Configuring the Vitest Playwright Provider

Browser mode is configured under the \`test.browser\` key in \`vitest.config.ts\`. Here is a complete, modern 2026 configuration using the Playwright provider:

\`\`\`typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
\`\`\`

The \`instances\` array is the 2026 way to declare which browsers run; each entry becomes its own project so a single test file executes across every listed engine. Set \`headless: true\` for CI and flip it to \`false\` locally when you want to watch tests run. The \`provider: 'playwright'\` line is what wires Vitest to Playwright's locator and action APIs. If you would rather drive Selenium-style sessions, you can set the provider to \`'webdriverio'\`, but Playwright is the smoother default.

Your \`vitest.setup.ts\` is where global CSS and shared setup live:

\`\`\`typescript
// vitest.setup.ts
import './src/styles/global.css';
import { afterEach } from 'vitest';
import { cleanup } from 'vitest-browser-react';

afterEach(() => {
  cleanup();
});
\`\`\`

The \`cleanup()\` call unmounts rendered components between tests so state does not leak. This mirrors the hygiene you already practice with testing-library-style renderers.

## Writing Your First Browser Test

With the config in place, writing a test feels familiar but runs in a real engine. Here is a component and its browser test using \`vitest-browser-react\`, which renders into the live page and returns Playwright-style locators:

\`\`\`tsx
// src/components/Greeting.tsx
export function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}
\`\`\`

\`\`\`tsx
// src/components/Greeting.test.tsx
import { test, expect } from 'vitest';
import { render } from 'vitest-browser-react';
import { Greeting } from './Greeting';

test('renders the greeting in a real browser', async () => {
  const screen = render(<Greeting name="Ada" />);

  await expect.element(screen.getByRole('heading')).toBeVisible();
  await expect.element(screen.getByRole('heading')).toHaveText('Hello, Ada!');
});
\`\`\`

Two things are worth noting. First, you use \`expect.element(locator)\` rather than \`expect(element)\`; the \`expect.element\` form retries until the assertion passes or times out, which eliminates the flakiness of asserting on async UI. Second, \`getByRole\` queries the accessibility tree, the same query strategy recommended for end-to-end tests. Run it with:

\`\`\`bash
npx vitest --browser
\`\`\`

The first run launches Chromium, renders your component, and reports results in the terminal with Vitest's familiar output.

## Interacting With the Page: Clicks, Typing, and Hover

Browser mode gives you a real interactivity API through the \`userEvent\` object exported from \`@vitest/browser/context\`. These actions dispatch genuine browser events, so your component sees exactly what a user produces:

\`\`\`tsx
// src/components/Counter.test.tsx
import { test, expect } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from '@vitest/browser/context';
import { Counter } from './Counter';

test('increments when the button is clicked', async () => {
  const screen = render(<Counter />);

  await expect.element(screen.getByTestId('count')).toHaveText('0');

  await userEvent.click(screen.getByRole('button', { name: 'Increment' }));
  await userEvent.click(screen.getByRole('button', { name: 'Increment' }));

  await expect.element(screen.getByTestId('count')).toHaveText('2');
});

test('fills and submits a search form', async () => {
  const screen = render(<SearchBox onSearch={() => {}} />);

  await userEvent.fill(screen.getByRole('textbox'), 'playwright');
  await userEvent.keyboard('{Enter}');

  await expect.element(screen.getByText('Results for: playwright')).toBeVisible();
});
\`\`\`

Because \`userEvent.click\` performs Playwright's actionability checks first, it waits for the element to be visible, enabled, and stable before clicking. That built-in waiting is why browser-mode tests are dramatically less flaky than the synthetic \`fireEvent\` calls used in jsdom-based suites.

## Mocking Network Requests in Browser Mode

Components that fetch data are where browser mode pays off most. You intercept real network requests rather than stubbing a module. With the Playwright provider you can use the page's route handler, and many teams pair browser mode with a service-worker mock library for ergonomic request stubbing. Here is the route-handler approach:

\`\`\`tsx
// src/components/UserProfile.test.tsx
import { test, expect } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from '@vitest/browser/context';
import { UserProfile } from './UserProfile';

test('renders profile data from the API', async () => {
  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      json: { name: 'Grace Hopper', title: 'Rear Admiral' },
    });
  });

  const screen = render(<UserProfile />);

  await expect.element(screen.getByText('Grace Hopper')).toBeVisible();
  await expect.element(screen.getByText('Rear Admiral')).toBeVisible();
});

test('shows an error banner when the request fails', async () => {
  await page.route('**/api/me', (route) =>
    route.fulfill({ status: 500, json: { error: 'server down' } }),
  );

  const screen = render(<UserProfile />);
  await expect.element(screen.getByRole('alert')).toHaveText(/could not load/i);
});
\`\`\`

Because the interception happens at the network layer, the component exercises its real \`fetch\` or \`axios\` code path. The test stays meaningful even when you refactor the data layer, which is something module-level mocks rarely manage. If you maintain a dedicated request-contract suite, our [API testing complete guide](/blog/api-testing-complete-guide) pairs neatly with these UI-level mocks.

## Visual and Screenshot Testing

Running in a real engine means you can capture screenshots and assert on pixels. Browser mode exposes a screenshot API on the page context that you can wire into a visual regression workflow:

\`\`\`tsx
// src/components/PriceTag.test.tsx
import { test, expect } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from '@vitest/browser/context';
import { PriceTag } from './PriceTag';

test('matches the visual baseline', async () => {
  render(<PriceTag amount={4999} currency="USD" />);

  const screenshot = await page.screenshot({ path: './__screenshots__/price-tag.png' });
  expect(screenshot).toBeDefined();
});
\`\`\`

For full baseline comparison with thresholds and review tooling, integrate a visual testing service or assertion plugin; the concepts of baselines, diff thresholds, and approval flow are covered end to end in our [visual regression testing guide](/blog/visual-regression-testing-guide). Component-scoped screenshots are smaller and more stable than full-page captures, which keeps your visual suite low-maintenance.

## Browser Mode vs Playwright Component Testing

A common 2026 question is how Vitest browser mode differs from Playwright's own component testing. Both mount components in a real browser; the difference is which runner orchestrates them. Vitest browser mode keeps you inside the Vitest ecosystem, sharing one config and one \`expect\` API across your unit and browser tests. Playwright component testing lives inside the Playwright runner, which is appealing if your team already standardizes on Playwright for end-to-end work.

| Factor | Vitest browser mode | Playwright component testing |
| --- | --- | --- |
| Runner | Vitest | Playwright Test |
| Config sharing with unit tests | Single Vite/Vitest config | Separate ct config |
| Watch mode | Instant Vitest watch | Playwright watch |
| Assertion API | Vitest \`expect\` | Playwright \`expect\` |
| Best fit | Vitest-first teams | Playwright-first teams |
| Providers | Playwright or WebDriverIO | Playwright only |

Neither is strictly better. Choose browser mode if Vitest is already your runner of record; choose Playwright CT if Playwright is the center of your testing strategy. Both run real browsers, so the fidelity you gain over jsdom is identical.

## Running Vitest Browser Mode in CI

Browser mode runs cleanly on CI as long as the browsers are installed. Here is a GitHub Actions job that installs Chromium and runs the browser suite headlessly:

\`\`\`yaml
name: Browser Tests
on: [push, pull_request]
jobs:
  browser:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx vitest --browser --run
\`\`\`

The \`--run\` flag disables watch mode so the job exits after one pass. To keep CI quick, declare only \`chromium\` in the \`instances\` array for pull-request runs and add \`firefox\` and \`webkit\` on a scheduled nightly job. If a test fails, Vitest's browser UI and trace output let a developer reproduce the failure without guessing. For caching, sharding, and matrix strategies that apply directly to this job, our CI/CD pipeline guide is a useful companion.

## Migrating an Existing jsdom Suite to Browser Mode

You do not have to convert everything at once. The pragmatic path is to keep your pure-logic tests in the default Node environment and move only the DOM-heavy tests into browser mode. Vitest supports per-file environment selection, so you can run both kinds in the same project. Start by identifying tests that assert on visibility, focus, or layout, since those are the ones jsdom handles poorly, and migrate them first. Replace \`fireEvent\` with \`userEvent\`, swap \`expect(el)\` for \`expect.element(locator)\`, and convert module-level \`fetch\` mocks to \`page.route\` handlers. Each migrated test becomes more trustworthy because it now runs where your users live.

Reusable migration recipes and ready-to-install Vitest browser-mode skills for AI coding agents are cataloged in the [QASkills skill directory](/skills), so you can hand your agent a proven pattern instead of writing setup from scratch.

## Performance Tuning and Avoiding Common Pitfalls

Browser mode is fast, but a few habits keep it fast as the suite grows. The single biggest lever is browser reuse: launching a fresh browser per test would be ruinously slow, so Vitest keeps a browser instance alive across tests within a worker and resets page state between them. Lean into that by keeping the \`cleanup()\` call in your setup file so each test starts from a clean DOM without paying the cost of a full relaunch. Avoid spawning extra browser contexts inside individual tests unless you specifically need isolation, since each context carries real overhead.

Be intentional about which engines run where. Declaring \`chromium\`, \`firefox\`, and \`webkit\` in your \`instances\` array triples the work for every test file, which is the right trade-off for a nightly run but wasteful on every pull request. The pragmatic pattern is to gate the extra engines behind an environment variable so local and pull-request runs use only Chromium while the scheduled job opts into the full matrix. This keeps the developer feedback loop tight without sacrificing cross-browser confidence before a release.

Several pitfalls trip up teams new to browser mode. Mismatched versions of \`vitest\` and \`@vitest/browser\` produce confusing startup errors, so pin them to the same release line. Forgetting \`expect.element\` and reaching for a plain \`expect\` on a locator skips the built-in retry, reintroducing the flakiness browser mode was meant to remove, so always use the \`expect.element\` form for async UI. Importing server-only modules such as \`fs\` or \`path\` into a component pulls Node APIs into the browser bundle and breaks the build; keep component files free of server imports. And resist the urge to test full multi-page flows here. If a test needs routing, persistence across reloads, or several pages, it is an end-to-end test, not a browser-mode unit or component test.

Finally, prefer accessibility-first queries like \`getByRole\` and \`getByLabelText\` over brittle CSS selectors. Role-based locators survive markup refactors, read like the way a user perceives the page, and quietly enforce a baseline of accessibility. Reserve \`getByTestId\` for the rare element that has no meaningful role. Applied consistently, these conventions keep a large browser-mode suite both fast and resilient as your application changes through 2026.

## Frequently Asked Questions

### What is Vitest browser mode?

Vitest browser mode runs your tests inside a real browser such as Chromium, Firefox, or WebKit instead of the simulated jsdom or happy-dom environment. It is driven by a provider, usually Playwright, and gives you accurate layout, computed CSS, focus management, and real pointer events while keeping Vitest's familiar config, watch mode, and \`expect\` API.

### How do I set up the Vitest Playwright provider?

Install \`vitest\`, \`@vitest/browser\`, and \`playwright\`, then add a \`test.browser\` block to \`vitest.config.ts\` with \`enabled: true\` and \`provider: 'playwright'\`. List the engines under \`instances\`, run \`npx playwright install --with-deps chromium\` to download browsers, and start the suite with \`npx vitest --browser\`. The Playwright provider supports all three engines and the full interactivity API.

### Is Vitest browser mode stable for production use in 2026?

Yes. While browser mode began as an experiment, by 2026 it is a first-class, stable Vitest feature that many teams ship in production CI. The main requirement is keeping \`vitest\` and \`@vitest/browser\` on matching version lines and installing the browser binaries. Pin your versions to avoid the configuration drift that causes most startup errors.

### When should I use browser mode instead of jsdom?

Use browser mode when tests depend on real browser behavior: element visibility, computed styles, focus and tab order, scroll position, drag-and-drop, and observers like IntersectionObserver. Keep using the default Node environment with jsdom or happy-dom for pure logic that never touches the DOM, since that path is faster and perfectly adequate for non-visual assertions.

### How do I mock API requests in Vitest browser mode?

Use \`page.route\` from \`@vitest/browser/context\` to intercept real network requests and respond with \`route.fulfill\`, passing a \`json\` payload or a status code. Because interception happens at the network layer, your component runs its real \`fetch\` or \`axios\` code path. Many teams also pair browser mode with a service-worker mocking library for ergonomic request stubbing.

### What is the difference between Vitest browser mode and Playwright component testing?

Both mount components in a real browser, but the runner differs. Vitest browser mode keeps you inside Vitest with one shared config and \`expect\` API across unit and browser tests. Playwright component testing runs inside the Playwright test runner. Choose browser mode if Vitest is your primary runner and Playwright CT if Playwright already anchors your testing strategy.

### Can Vitest browser mode run tests across multiple browsers?

Yes. Add multiple entries to the \`instances\` array in \`vitest.config.ts\`, such as \`chromium\`, \`firefox\`, and \`webkit\`, and each entry becomes its own project so a test file runs across all of them. To keep CI fast, many teams run only Chromium on pull requests and reserve Firefox and WebKit for a scheduled nightly job.

## Conclusion

Vitest browser mode brings real-browser fidelity into the Vitest ecosystem without forcing you to leave the runner, config, and watch loop your team already loves. You learned why simulated DOMs miss layout, focus, and visibility bugs, how to install and configure the Playwright provider, how to render and interact with components using \`expect.element\` and \`userEvent\`, how to intercept real network requests, how to capture screenshots, and how to run the whole suite in CI. Keep pure logic in the fast Node environment and route your DOM-heavy tests through browser mode, and you get a layered suite that is both quick and genuinely representative of what users experience.

Want proven Vitest browser-mode setups you can drop straight into your AI coding agent? Explore install-ready browser testing recipes and dozens more QA automation skills in the [QASkills skill directory](/skills) and start shipping more reliable tests today.
`,
};
