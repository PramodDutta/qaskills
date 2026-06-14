import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Browser Mode: The Complete Guide (2026)',
  description:
    'Vitest 4 Browser Mode is stable. Learn setup with Playwright, component tests with page and userEvent, locators, assertions, headless CI, screenshots, and jsdom vs E2E.',
  date: '2026-06-14',
  category: 'Guide',
  content: `
# Vitest Browser Mode: The Complete Guide

For years, front-end testing forced an uncomfortable choice. You either tested components in a simulated DOM like jsdom, which is fast but a fake browser that lies about layout, focus, and real events, or you reached for a full end-to-end tool like Playwright that drives a real browser but is heavier and slower to spin up per component. Vitest Browser Mode collapses that gap. It runs your component tests in a real browser, using the same Vitest runner, config, and watch mode you already use for unit tests, while giving you real rendering, real events, and real DOM APIs.

The big news for 2026 is that Browser Mode went fully stable in Vitest 4.0. It is no longer experimental, the API surface has settled, and the configuration shape is final. That means you can adopt it for production component suites without worrying that the next minor release will rewrite your config. This guide is a complete, hands-on reference: installation, the new stable config, writing component tests with the \`@vitest/browser/context\` API (\`page\`, \`userEvent\`, locators), rendering with framework adapters like \`vitest-browser-react\` and \`vitest-browser-vue\`, simulating interactivity, asserting with the browser matchers, running headless in CI, controlling \`maxWorkers\`, taking screenshots, and a clear-eyed comparison of Browser Mode versus Playwright E2E versus jsdom.

If you are migrating from Jest, our [Jest to Vitest migration guide](/blog/jest-to-vitest-migration-guide) and the broader [Jest vs Vitest comparison for 2026](/blog/jest-vs-vitest-2026) pair well with this article. For full-app testing in React and Next.js, see our [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide).

## What Is Vitest Browser Mode?

Browser Mode is a Vitest runtime that executes your test files inside an actual browser tab rather than in Node with a simulated DOM. A provider (Playwright or WebdriverIO) launches and controls real browser instances, Vitest serves your code through Vite, and your tests interact with the page using a small, ergonomic API. Because it is still Vitest, you keep instant Vite-powered transforms, hot module reload in watch mode, the same \`expect\`, and the same project and coverage configuration.

The headline benefits: components render with real CSS and layout, \`focus\`, \`hover\`, pointer events, and clipboard behave like production, and you stop writing brittle workarounds for jsdom gaps such as missing \`IntersectionObserver\` or fake \`getBoundingClientRect\`. The trade-off is that a real browser is heavier than jsdom, so you typically keep pure logic in jsdom unit tests and move DOM-heavy component tests into Browser Mode.

## Installing and Initializing Browser Mode

The fastest path is the init command, which installs the browser provider, adds the config, and offers to install browser binaries.

\`\`\`bash
npx vitest init browser
\`\`\`

This scaffolds the dependencies and a starter config. In CI you usually want the browser binaries installed explicitly, including OS dependencies, which the Playwright CLI handles with the \`--with-deps\` flag:

\`\`\`bash
# Install Vitest, the browser context, and the Playwright provider
npm install -D vitest @vitest/browser @vitest/browser-playwright playwright

# In CI, install the actual browser binaries plus system deps
npx playwright install --with-deps chromium
\`\`\`

If you prefer WebdriverIO as the provider, install \`@vitest/browser-webdriverio\` instead of the Playwright package. Most teams pick Playwright because the binaries are easy to manage and the cross-browser story is excellent.

## The Stable Vitest 4 Configuration

This is the configuration shape that shipped stable in Vitest 4. You import the provider factory, then enable Browser Mode under \`test.browser\` with one or more \`instances\`, each naming a browser. Note the explicit \`provider: playwright()\` call and the \`instances\` array, which replaces older single-browser config.

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      // Run the same suite across several real browsers.
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
      // headless is auto-detected: false locally, true in CI.
      headless: false,
    },
  },
});
\`\`\`

Each entry in \`instances\` becomes its own test project, so a single \`vitest\` run executes your component tests in Chromium, Firefox, and WebKit. You can attach per-instance options such as a custom viewport or Playwright launch arguments:

\`\`\`typescript
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        {
          browser: 'chromium',
          context: { viewport: { width: 1280, height: 720 } },
          launch: { args: ['--disable-gpu'] },
        },
      ],
    },
  },
});
\`\`\`

## Writing Your First Component Test

The interaction API lives in \`@vitest/browser/context\`. It gives you \`page\` (locators and screenshots), \`userEvent\` (realistic user interactions), and helpers. You render a component with a framework adapter, then query it with locators, exactly like Playwright and Testing Library users expect.

\`\`\`typescript
// counter.test.tsx
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from '@vitest/browser/context';
import { Counter } from './Counter';

test('increments when the button is clicked', async () => {
  render(<Counter initial={0} />);

  // Locators are role- and text-based, resilient to markup changes.
  const button = page.getByRole('button', { name: 'Increment' });
  await expect.element(page.getByText('Count: 0')).toBeInTheDocument();

  await userEvent.click(button);

  await expect.element(page.getByText('Count: 1')).toBeInTheDocument();
});
\`\`\`

A few things to notice. \`render\` comes from \`vitest-browser-react\` and mounts the component into the real document. \`page.getByRole\` returns a locator, not an element, so it re-queries lazily and works with retrying assertions. And \`expect.element(...)\` is the retrying assertion that waits for the DOM to reach the expected state, which removes the manual \`waitFor\` boilerplate that plagued jsdom tests.

## Locators, page, and the Query API

\`page\` exposes the same family of accessible locators Testing Library popularized, which keeps tests readable and tied to what users actually perceive. Prefer role and label queries; fall back to test IDs only when nothing semantic exists.

| Locator | Finds elements by | Example |
|---|---|---|
| \`page.getByRole\` | ARIA role and accessible name | \`page.getByRole('button', { name: 'Save' })\` |
| \`page.getByText\` | Visible text content | \`page.getByText('Welcome back')\` |
| \`page.getByLabelText\` | Associated form label | \`page.getByLabelText('Email')\` |
| \`page.getByPlaceholder\` | Input placeholder | \`page.getByPlaceholder('Search...')\` |
| \`page.getByTestId\` | \`data-testid\` attribute | \`page.getByTestId('cart-total')\` |
| \`page.getByAltText\` | Image alt text | \`page.getByAltText('Company logo')\` |

Locators support chaining and filtering, so you can scope a query inside a region:

\`\`\`typescript
import { page } from '@vitest/browser/context';

const dialog = page.getByRole('dialog');
const confirm = dialog.getByRole('button', { name: 'Confirm' });
await confirm.click();
\`\`\`

## Simulating Interactivity with userEvent

\`userEvent\` dispatches real browser events through the provider, not synthetic ones. Clicks move a real pointer, typing fires real key events, and focus follows the same rules as production. This catches bugs jsdom cannot, such as a button covered by an overlay or an input that loses focus on re-render.

\`\`\`typescript
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page, userEvent } from '@vitest/browser/context';
import { LoginForm } from './LoginForm';

test('submits valid credentials', async () => {
  const onSubmit = vi.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  await userEvent.fill(page.getByLabelText('Email'), 'ada@example.com');
  await userEvent.fill(page.getByLabelText('Password'), 'hunter2');
  await userEvent.click(page.getByRole('button', { name: 'Log in' }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'ada@example.com',
    password: 'hunter2',
  });
});
\`\`\`

The API covers \`click\`, \`dblClick\`, \`fill\`, \`type\`, \`keyboard\`, \`hover\`, \`tab\`, \`selectOptions\`, \`upload\`, and clipboard actions. Because these are genuine events, you rarely need to reach below the API to dispatch raw events yourself.

## Assertions with the Browser Matchers

Browser Mode bundles DOM matchers (the jest-dom family) so assertions read naturally and target real rendered state. Combine them with \`expect.element\`, the retrying assertion that polls the DOM until the condition holds or times out, which is essential for async UI.

\`\`\`typescript
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from '@vitest/browser/context';
import { Profile } from './Profile';

test('shows the loaded user after fetch resolves', async () => {
  render(<Profile userId="42" />);

  // Retries until the spinner disappears and the name appears.
  await expect.element(page.getByText('Loading...')).not.toBeInTheDocument();
  await expect.element(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
  await expect.element(page.getByRole('img')).toHaveAttribute('alt', 'Ada Lovelace');
});
\`\`\`

| Matcher | Asserts that the element |
|---|---|
| \`toBeInTheDocument()\` | Is attached to the DOM |
| \`toBeVisible()\` | Is rendered and visible to a user |
| \`toBeDisabled()\` / \`toBeEnabled()\` | Has the disabled state |
| \`toHaveTextContent(text)\` | Contains the given text |
| \`toHaveAttribute(name, value)\` | Carries the attribute |
| \`toHaveClass(name)\` | Has the CSS class |
| \`toHaveValue(value)\` | Holds the form value |
| \`toBeChecked()\` | Is a checked checkbox or radio |

## Testing Vue (and Other Frameworks)

The pattern is identical across frameworks; only the render adapter changes. For Vue, install and import \`vitest-browser-vue\`. Svelte, Solid, and others have equivalent adapters, and the \`page\`, \`userEvent\`, and matcher APIs stay the same.

\`\`\`typescript
// toggle.test.ts
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-vue';
import { page, userEvent } from '@vitest/browser/context';
import Toggle from './Toggle.vue';

test('toggles the switch on click', async () => {
  render(Toggle, { props: { label: 'Notifications' } });

  const sw = page.getByRole('switch', { name: 'Notifications' });
  await expect.element(sw).not.toBeChecked();

  await userEvent.click(sw);
  await expect.element(sw).toBeChecked();
});
\`\`\`

Because the interaction and assertion layer is shared, a team running both React and Vue gets one consistent testing vocabulary across the whole monorepo.

## Mocking and Network Control

Component tests usually need to isolate the component from real network calls. Browser Mode keeps Vitest's familiar mocking primitives, so \`vi.fn\`, \`vi.spyOn\`, and \`vi.mock\` all work as you expect, and you can intercept fetch at the boundary. Because tests run in a real browser, the cleanest approach is to mock the module that performs the request, or to stub the global \`fetch\` for the duration of a test.

\`\`\`typescript
import { expect, test, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from '@vitest/browser/context';
import { UserList } from './UserList';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify([{ id: 1, name: 'Ada' }]), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
});

test('renders fetched users', async () => {
  render(<UserList />);
  await expect.element(page.getByText('Ada')).toBeInTheDocument();
});
\`\`\`

For richer scenarios, point the component at a mock server such as MSW (Mock Service Worker), which intercepts requests in the browser without touching your component code. This keeps the component honest, exercising its real fetch logic, while you control the responses. Mocking at the network boundary rather than stubbing internal functions makes the test resilient to refactors and closer to production behavior.

## Debugging Failing Browser Tests

When a Browser Mode test fails, you have powerful debugging tools that jsdom never offered. Run without \`headless\` locally and the browser stays open so you can inspect the DOM, the console, and the network panel directly. Add a \`page.screenshot()\` right before the failing assertion to capture the exact rendered state, and check whether an element is present but covered, off-screen, or not yet rendered, three failure modes jsdom silently hides.

A common gotcha is forgetting to \`await\` an interaction or assertion. Every \`userEvent\` action and every \`expect.element\` returns a promise; skip the \`await\` and the test races ahead of the browser. Another is querying an element that has not appeared yet with a non-retrying assertion; switching to \`expect.element\` fixes it because it polls until the condition holds or times out. When CI fails but local passes, the difference is almost always headless rendering or timing, so reproduce locally with \`--browser.headless\` to match the CI environment exactly.

## Running Headless in CI and Tuning maxWorkers

Locally you want a visible browser to debug; in CI you want headless for speed and no display server. Vitest auto-detects CI and runs headless, but you can force it. Browser Mode parallelizes across instances and files, and \`maxWorkers\` caps how many browser tabs run at once, which matters because each tab consumes real memory.

\`\`\`bash
# Force headless and limit concurrency for a constrained CI runner
npx vitest --browser.headless --maxWorkers=2
\`\`\`

\`\`\`typescript
// vitest.config.ts (CI-friendly settings)
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    // Cap parallel browser tabs to avoid OOM on small runners.
    maxWorkers: process.env.CI ? 2 : undefined,
    browser: {
      enabled: true,
      provider: playwright(),
      headless: Boolean(process.env.CI),
      instances: [{ browser: 'chromium' }],
    },
  },
});
\`\`\`

A typical GitHub Actions step installs the browser with system deps first, then runs the suite:

\`\`\`bash
- run: npx playwright install --with-deps chromium
- run: npx vitest run --browser.headless
\`\`\`

Start \`maxWorkers\` low on shared runners and raise it until the runner saturates. Each worker is a real browser context, so memory, not CPU, is usually the limiting factor.

## Taking Screenshots

\`page.screenshot()\` captures the current state, which is invaluable for debugging failures and for visual checks. You can capture the whole page or a single locator, and save to a path.

\`\`\`typescript
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from '@vitest/browser/context';
import { PriceCard } from './PriceCard';

test('renders the pricing card', async () => {
  render(<PriceCard plan="Pro" price={29} />);

  // Full-page capture saved relative to the test file.
  await page.screenshot({ path: 'price-card.png' });

  // Element-scoped capture returns the buffer for further processing.
  const card = page.getByRole('article');
  const buffer = await card.screenshot({ base64: false });
  expect(buffer.length).toBeGreaterThan(0);
});
\`\`\`

On failure, Browser Mode can also auto-capture a screenshot so CI artifacts show exactly what the browser rendered when the assertion failed. For full visual-regression workflows you would feed these into a dedicated diffing tool.

## Browser Mode vs Playwright E2E vs jsdom

These three approaches solve overlapping but distinct problems. Use jsdom for fast pure-logic and lightweight component tests, Browser Mode for real-browser component and integration tests, and Playwright E2E for full user journeys across a running app.

| Dimension | jsdom (unit) | Vitest Browser Mode | Playwright E2E |
|---|---|---|---|
| Environment | Simulated DOM in Node | Real browser, isolated components | Real browser, full deployed app |
| Speed | Fastest | Fast (real browser, but per-component) | Slowest (boots the whole app) |
| Rendering fidelity | Low (no real layout/CSS) | High (real layout, CSS, events) | High |
| Scope | A function or component | A component or feature in isolation | End-to-end user flows |
| Network | Mocked | Mocked or real | Usually real or staged |
| Best for | Reducers, utils, simple props | Interaction, focus, a11y, visual states | Login -> checkout journeys |
| Runner | Vitest | Vitest | Playwright Test |

A healthy strategy uses all three: a wide base of jsdom unit tests, a focused layer of Browser Mode component tests for anything touching real DOM behavior, and a thin top layer of Playwright E2E for critical journeys. Browser Mode does not replace E2E; it replaces the unreliable jsdom component tests that used to pass while production broke. For the E2E layer, our [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) goes deeper.

## Migration Tips from jsdom

Moving existing component tests into Browser Mode is usually mechanical. Swap the render import to the browser adapter, replace Testing Library queries on \`screen\` with \`page\` locators, and replace \`waitFor\` blocks with \`expect.element\` retrying assertions. Synchronous \`fireEvent\` calls become awaited \`userEvent\` calls. Most tests get shorter because the retrying assertions absorb the timing boilerplate. If you are coming from Jest entirely, run the [Jest to Vitest migration](/blog/jest-to-vitest-migration-guide) first, then layer Browser Mode on top once your suite is green under Vitest.

## Frequently Asked Questions

### Is Vitest Browser Mode stable in 2026?

Yes. Browser Mode reached stable status in Vitest 4.0, so it is no longer experimental. The configuration shape is final, you enable it under \`test.browser\` with \`provider: playwright()\` and an \`instances\` array, and you can adopt it for production component suites without fear that a minor release will rewrite your config. It is a supported, first-class part of the Vitest runtime.

### What is the difference between Vitest Browser Mode and jsdom?

jsdom simulates a DOM inside Node, so it is fast but lacks real layout, CSS, focus, and pointer behavior, which means tests can pass while production breaks. Browser Mode runs the same tests in a real browser through Playwright or WebdriverIO, giving real rendering and real events. Keep jsdom for pure logic and simple components; use Browser Mode for anything that depends on real DOM behavior.

### Does Vitest Browser Mode replace Playwright end-to-end tests?

No. Browser Mode tests components and features in isolation inside a real browser, while Playwright E2E boots your whole deployed app and drives full user journeys like login to checkout. They are complementary: Browser Mode replaces unreliable jsdom component tests, and Playwright E2E covers critical end-to-end flows. A healthy suite uses jsdom units, Browser Mode component tests, and a thin layer of E2E.

### Which providers does Vitest Browser Mode support?

Two providers are supported: Playwright and WebdriverIO. Most teams choose Playwright because its browser binaries are easy to install with \`npx playwright install --with-deps\` and it offers strong cross-browser coverage across Chromium, Firefox, and WebKit. You select the provider in config with \`provider: playwright()\` or the WebdriverIO equivalent, then list browsers in the \`instances\` array.

### How do I run Vitest Browser Mode headless in CI?

Vitest auto-detects CI and runs headless, but you can force it with the \`--browser.headless\` flag or by setting \`headless: true\` in config. In CI, first install the browser binaries with system dependencies using \`npx playwright install --with-deps chromium\`, then run \`npx vitest run --browser.headless\`. Cap concurrency with \`maxWorkers\` because each browser tab consumes real memory.

### How do I render React or Vue components in Vitest Browser Mode?

Use a framework render adapter. For React, import \`render\` from \`vitest-browser-react\`; for Vue, import it from \`vitest-browser-vue\`. The adapter mounts the component into the real document, and you then query it with \`page\` locators and interact via \`userEvent\`. The interaction and assertion APIs are identical across frameworks, so a mixed React and Vue codebase shares one testing vocabulary.

### What does maxWorkers do in Vitest Browser Mode?

\`maxWorkers\` caps how many browser tabs run in parallel. Because each tab is a real browser context that consumes real memory, raising it speeds up the suite but can exhaust a small CI runner. Start low, around two on constrained runners, and increase until the machine saturates. Memory, not CPU, is usually the limiting factor when tuning browser concurrency.

### Can I take screenshots in Vitest Browser Mode?

Yes. Call \`page.screenshot({ path: 'name.png' })\` for a full-page capture or call \`screenshot\` on a locator to capture a single element. You can return the image as a buffer for further processing. Browser Mode can also auto-capture a screenshot on test failure so CI artifacts show exactly what the browser rendered, which makes debugging flaky UI far easier.

## Conclusion

Vitest Browser Mode reaching stable status in Vitest 4 is a genuine inflection point for front-end testing. You finally get real-browser fidelity, real events, and real layout for your component tests without leaving the Vitest workflow, and without the per-journey overhead of full E2E. Configure it with \`provider: playwright()\` and an \`instances\` array, write tests with \`page\` locators and \`userEvent\`, assert with \`expect.element\` and the DOM matchers, run headless with a sensible \`maxWorkers\` cap in CI, and keep jsdom for pure logic while reserving Playwright E2E for full journeys.

Want agent-ready Vitest, Playwright, and component-testing skills you can drop straight into your AI coding workflow? Explore the curated [QASkills directory](/skills). And to round out your toolkit, read our [Jest vs Vitest 2026 comparison](/blog/jest-vs-vitest-2026), the [Jest to Vitest migration guide](/blog/jest-to-vitest-migration-guide), and the [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide).
`,
};
