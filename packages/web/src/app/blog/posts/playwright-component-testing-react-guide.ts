import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for React: The Complete 2026 Guide',
  description:
    'Learn Playwright component testing for React with @playwright/experimental-ct-react: setup, mounting, props, events, hooks, network mocking, and visual snapshots.',
  date: '2026-06-14',
  category: 'Guide',
  content: `
# Playwright Component Testing for React: The Complete 2026 Guide

Playwright is best known as an end-to-end testing tool, but it also ships an experimental component testing runner that lets you mount and test individual React components inside a real browser. Component testing with \`@playwright/experimental-ct-react\` sits in the sweet spot between fast-but-fake unit tests (jsdom) and slow-but-realistic E2E tests. Your component renders in an actual Chromium, Firefox, or WebKit instance, so layout, CSS, animations, and browser APIs all behave exactly as they would in production, while you still mount one component at a time without booting your whole app.

This guide is a practical, code-first walkthrough of Playwright component testing for React in 2026. We cover installation and the \`playwright-ct.config.ts\` file, how mounting works under the hood, passing props and asserting on rendered output, wiring up event handlers and callbacks, the \`beforeMount\` and \`afterMount\` hooks for injecting providers, testing component state and React hooks, mocking network requests from inside a component test, capturing visual snapshots, and how component testing compares with E2E and unit testing. We finish with CI configuration and an honest look at the limitations of the experimental runner so you know exactly what you are signing up for. If you are coming from full-page automation, the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) pairs well with everything below, and the [Playwright best practices for 2026](/blog/playwright-best-practices-2026) post applies to component tests too.

## What Is Playwright Component Testing?

Component testing renders a single React component in isolation inside a real browser controlled by Playwright. Instead of navigating to a URL with \`page.goto()\`, you import the component directly into your test file and \`mount()\` it. Playwright spins up a tiny dev server (powered by Vite), bundles your component plus its real dependencies, serves it on a blank page, and gives you back a \`Locator\` pointing at the mounted root. From that point on you use the exact same Playwright API you already know: \`getByRole\`, \`getByText\`, \`click\`, \`fill\`, \`toBeVisible\`, and so on.

The key difference from jsdom-based runners like Jest or Vitest is fidelity. jsdom is a JavaScript reimplementation of the DOM. It does not lay out elements, does not compute styles, does not run real CSS, and stubs many browser APIs. Playwright component tests run in a genuine browser engine, so \`getBoundingClientRect()\`, \`IntersectionObserver\`, CSS \`:hover\` states, focus management, and scroll behavior are all real. That makes component testing ideal for UI components where rendering correctness matters.

\`\`\`bash
# Component tests live next to your components and end in .spec.tsx by convention
src/
  components/
    Button.tsx
    Button.spec.tsx      <- Playwright component test
    Counter.tsx
    Counter.spec.tsx
\`\`\`

## Setup and Installation

Add the experimental React component testing package to an existing React project. It works with Vite-based apps and with Create React App-style projects, since the runner uses its own Vite pipeline regardless of your app bundler.

\`\`\`bash
npm init playwright@latest -- --ct
# or add it manually to an existing project
npm install --save-dev @playwright/experimental-ct-react
npx playwright install --with-deps chromium
\`\`\`

The \`--ct\` flag scaffolds three files: \`playwright-ct.config.ts\`, \`playwright/index.html\`, and \`playwright/index.ts\`. The \`index.html\` is the blank page your component mounts into, and \`index.ts\` is where you import global CSS and register anything that must exist before mounting. Your \`package.json\` gets a script so you can run the suite.

\`\`\`json
{
  "scripts": {
    "test-ct": "playwright test -c playwright-ct.config.ts"
  }
}
\`\`\`

A minimal \`playwright/index.ts\` looks like this. Import your global stylesheet here so components render with their real styles, and import any CSS frameworks (Tailwind, design-system tokens) that your components assume are present.

\`\`\`typescript
// playwright/index.ts
import '../src/styles/globals.css';
import '../src/styles/tokens.css';
\`\`\`

## The playwright-ct.config.ts File

The configuration file is almost identical to a regular \`playwright.config.ts\`, with one important addition: the \`ctViteConfig\` and \`ctPort\` options that control the embedded Vite bundler. Here is a production-ready config for 2026.

\`\`\`typescript
// playwright-ct.config.ts
import { defineConfig, devices } from '@playwright/experimental-ct-react';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './src',
  testMatch: /.*\\.spec\\.tsx$/,
  snapshotDir: './__snapshots__',
  timeout: 10_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
        },
      },
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

The \`ctViteConfig\` block is where you mirror the path aliases, plugins, and module resolution rules from your real app's Vite or webpack config. If your component imports \`@/lib/format\` and that alias is missing here, the test bundle will fail to resolve it. The \`ctPort\` lets you pin the dev server port so it does not collide with other local services.

## Mounting Components

The heart of component testing is the \`mount\` fixture. You import \`test\` and \`expect\` from the CT package rather than from \`@playwright/test\`, and your test function receives a \`mount\` function alongside the usual \`page\`. Calling \`mount(<Component />)\` renders the component and returns a \`Locator\` scoped to its root element.

\`\`\`typescript
// src/components/Button.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test('renders the label text', async ({ mount }) => {
  const component = await mount(<Button>Click me</Button>);
  await expect(component).toContainText('Click me');
});

test('renders with the primary variant class', async ({ mount }) => {
  const component = await mount(<Button variant="primary">Save</Button>);
  await expect(component).toHaveClass(/btn-primary/);
});
\`\`\`

Because \`mount\` returns a \`Locator\`, every assertion is auto-retrying. \`expect(component).toContainText('Click me')\` polls until the text appears or the timeout fires, so you rarely need explicit waits. You can also reach into the component with \`page\` for things outside the mounted root, such as a portal-rendered modal appended to \`document.body\`.

## Passing Props and Asserting Output

Props are passed exactly as you would in real JSX. Playwright serializes the JSX you write in the test, ships it to the browser, and renders it there. Primitive props (strings, numbers, booleans, arrays, plain objects) cross the boundary cleanly. This makes data-driven tests with \`test.describe\` loops natural.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { Badge } from './Badge';

const cases = [
  { status: 'success', label: 'Passed', cls: /badge-green/ },
  { status: 'error', label: 'Failed', cls: /badge-red/ },
  { status: 'pending', label: 'Running', cls: /badge-amber/ },
] as const;

for (const { status, label, cls } of cases) {
  test(\`renders \${status} badge\`, async ({ mount }) => {
    const component = await mount(<Badge status={status} label={label} />);
    await expect(component).toContainText(label);
    await expect(component).toHaveClass(cls);
  });
}
\`\`\`

For accessibility-first assertions, prefer role-based locators over CSS classes. \`component.getByRole('button', { name: 'Save' })\` is resilient to refactors and verifies that your component is actually accessible, which class-based selectors never do.

## Testing Events and Callbacks

React components communicate upward through callback props like \`onClick\`, \`onChange\`, and \`onSubmit\`. You cannot pass a raw browser-side function from your Node test directly, but Playwright provides two clean patterns. The simplest is to assert on the visible side effect. The more precise is to capture callback invocations and inspect their arguments after interacting.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { SearchBox } from './SearchBox';

test('fires onSearch with the typed query', async ({ mount }) => {
  const calls: string[] = [];
  const component = await mount(
    <SearchBox onSearch={(q: string) => calls.push(q)} />,
  );

  await component.getByRole('searchbox').fill('playwright');
  await component.getByRole('button', { name: 'Search' }).click();

  // The closure runs in the browser; read its captured state back
  expect(calls).toEqual(['playwright']);
});
\`\`\`

Under the hood, Playwright exposes the function to the page and marshals each call back to Node. Arguments must be serializable, so a click event object will not survive, but the primitive query string will. For complex event objects, have the component pass only the data you need (for example \`onChange={(value) => ...}\` instead of \`onChange={(event) => ...}\`), which is good component design anyway.

## Hooks: beforeMount and afterMount

Real components almost never render naked. They expect a Redux store, a React Query client, a theme provider, a router, or an i18n context above them in the tree. The \`beforeMount\` and \`afterMount\` hooks let you wrap every mounted component in the providers it needs, configured once in \`playwright/index.tsx\`.

\`\`\`tsx
// playwright/index.tsx
import { beforeMount, afterMount } from '@playwright/experimental-ct-react/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme';
import { MemoryRouter } from 'react-router-dom';
import '../src/styles/globals.css';

export type HooksConfig = {
  theme?: 'light' | 'dark';
  route?: string;
};

beforeMount<HooksConfig>(async ({ App, hooksConfig }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={hooksConfig?.theme ?? 'light'}>
        <MemoryRouter initialEntries={[hooksConfig?.route ?? '/']}>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
});

afterMount<HooksConfig>(async () => {
  // place for post-mount instrumentation if needed
});
\`\`\`

In the test, pass per-test configuration through the \`hooksConfig\` option of \`mount\`. This is the canonical way to test a component under both the light and dark themes, or at a specific route, without duplicating provider boilerplate in every spec.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import type { HooksConfig } from '../../playwright/index';
import { UserMenu } from './UserMenu';

test('renders dark theme styling', async ({ mount }) => {
  const component = await mount<HooksConfig>(<UserMenu />, {
    hooksConfig: { theme: 'dark', route: '/dashboard' },
  });
  await expect(component).toHaveAttribute('data-theme', 'dark');
});
\`\`\`

## Testing State, Hooks, and Re-renders

Because the component runs in a real browser, testing stateful behavior is just driving the UI and asserting the result. You do not reach into React internals; you interact like a user and verify the rendered output. The \`component.update()\` method re-renders with new props, which is how you test that a controlled component reacts to prop changes from a parent.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from './Counter';

test('increments and decrements local state', async ({ mount }) => {
  const component = await mount(<Counter initial={0} step={2} />);

  await expect(component.getByTestId('count')).toHaveText('0');
  await component.getByRole('button', { name: 'Increment' }).click();
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(component.getByTestId('count')).toHaveText('4');
  await component.getByRole('button', { name: 'Decrement' }).click();
  await expect(component.getByTestId('count')).toHaveText('2');
});

test('reacts to a prop change via update()', async ({ mount }) => {
  const component = await mount(<Counter initial={5} step={1} />);
  await expect(component.getByTestId('count')).toHaveText('5');

  await component.update(<Counter initial={10} step={1} />);
  await expect(component.getByTestId('count')).toHaveText('10');
});
\`\`\`

Custom hooks that own data-fetching or subscriptions are best tested through a small host component rather than in isolation. Mount a tiny wrapper that uses the hook and renders its output, then assert on what the user would see. This keeps your tests behavior-focused and avoids brittle coupling to hook return shapes.

## Network Mocking in Component Tests

Components that fetch data are common, and the \`page.route()\` API works inside component tests exactly as it does in E2E tests. Because \`mount\` happens after route handlers can be installed, register your mocks on \`page\` before mounting so the component's effects see the stubbed responses. For a deep dive on interception patterns, see the dedicated [API mocking and service virtualization guide](/blog/api-mocking-service-virtualization-guide).

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { UserCard } from './UserCard';

test('renders fetched user data', async ({ mount, page }) => {
  await page.route('**/api/users/42', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 42, name: 'Ada Lovelace', role: 'admin' }),
    });
  });

  const component = await mount(<UserCard userId={42} />);
  await expect(component.getByRole('heading')).toHaveText('Ada Lovelace');
  await expect(component.getByText('admin')).toBeVisible();
});

test('renders an error state on 500', async ({ mount, page }) => {
  await page.route('**/api/users/42', (route) =>
    route.fulfill({ status: 500, body: 'boom' }),
  );
  const component = await mount(<UserCard userId={42} />);
  await expect(component.getByRole('alert')).toContainText('Something went wrong');
});
\`\`\`

One caveat: requests are intercepted at the network layer of the browser page. If your component imports a mocked module or uses a service that bypasses \`fetch\`/\`XMLHttpRequest\` (for example, a WebSocket), \`page.route()\` may not apply. For those, you mock at the module level through \`ctViteConfig\` aliases or test the behavior in E2E instead.

## Visual Snapshots in Component Tests

Visual regression is one of the strongest reasons to use Playwright for components: you get pixel-accurate screenshots from a real browser. \`expect(component).toHaveScreenshot()\` captures the mounted component and compares it against a committed baseline, failing the test on visual drift. This is far more reliable than DOM-only assertions for catching CSS regressions.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { PriceCard } from './PriceCard';

test('matches the visual baseline', async ({ mount }) => {
  const component = await mount(
    <PriceCard plan="Pro" price={29} period="month" featured />,
  );
  await expect(component).toHaveScreenshot('price-card-pro.png', {
    maxDiffPixelRatio: 0.01,
    animations: 'disabled',
  });
});
\`\`\`

Generate baselines with \`npx playwright test -c playwright-ct.config.ts --update-snapshots\` and commit the resulting PNGs. The \`animations: 'disabled'\` option freezes CSS animations so screenshots are deterministic, and \`maxDiffPixelRatio\` allows a small tolerance for anti-aliasing differences across machines. For a full strategy on baselines, masking dynamic regions, and cross-platform stability, read the [visual regression testing guide](/blog/visual-regression-testing-guide).

## CT vs E2E vs Unit Testing

Choosing the right layer for each test is what keeps a suite fast and trustworthy. The table below summarizes where component testing fits relative to its neighbors.

| Dimension | Unit (Vitest/jsdom) | Component (Playwright CT) | E2E (Playwright) |
|---|---|---|---|
| Environment | jsdom (simulated DOM) | Real browser engine | Real browser + full app |
| Render scope | Single function/component | Single component + providers | Whole application |
| CSS / layout fidelity | None | Full | Full |
| Speed per test | Fastest (ms) | Medium (tens of ms) | Slowest (seconds) |
| Network | Mocked in JS | page.route() interception | page.route() or real backend |
| Routing / navigation | Stubbed | MemoryRouter via hooks | Real router + URLs |
| Best for | Pure logic, utils, reducers | UI components, visual states | User journeys, integration |
| Flake risk | Low | Low-medium | Medium |

A healthy React project uses all three. Keep pure logic (formatters, reducers, validators) in fast Vitest unit tests. Use Playwright component tests for visual states, accessibility, and component-level interaction. Reserve E2E for critical user journeys that span pages and a real backend. If you are weighing tools more broadly, the [Cypress vs Playwright comparison for 2026](/blog/cypress-vs-playwright-2026) covers the trade-offs in depth.

## Running Component Tests in CI

Component tests run in headless browsers and parallelize cleanly, so they are well suited to CI. The main jobs are installing browser binaries, running the suite with retries, and uploading the HTML report and any screenshot diffs as artifacts for debugging.

\`\`\`yaml
# .github/workflows/component-tests.yml
name: Component Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ct:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium firefox webkit
      - run: npm run test-ct
        env:
          CI: 'true'
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-ct-report
          path: playwright-report/
          retention-days: 14
\`\`\`

Two CI tips matter for visual snapshots. First, generate and review baselines on the same OS that CI uses, because font rendering differs between macOS, Windows, and Linux; the cleanest fix is to update snapshots inside the official Playwright Docker image. Second, set \`retries: 2\` only for genuinely flaky integration points, not as a way to paper over real bugs. The broader CI advice in [Playwright best practices for 2026](/blog/playwright-best-practices-2026) applies here without modification.

## Limitations of the Experimental Runner

Component testing is powerful but still labeled experimental in 2026, and it has real constraints you should understand before adopting it broadly. The table below lists the most common gotchas and how to work around them.

| Limitation | Impact | Workaround |
|---|---|---|
| Marked experimental | API may change between minor versions | Pin Playwright version; review release notes before upgrading |
| Props must be serializable | Functions and class instances lose identity across the bridge | Pass primitives; capture callbacks via closures that push to arrays |
| Vite-based bundling only | Non-Vite resolution quirks must be mirrored in ctViteConfig | Replicate aliases, env, and plugins in ctViteConfig |
| No deep React internals access | Cannot assert on hooks state directly | Test via rendered output and user-visible behavior |
| Slower than jsdom | More overhead per test than Vitest | Keep pure logic in unit tests; use CT for UI fidelity |
| Module mocking is limited | jest.mock-style mocking is not first-class | Mock network via page.route(); inject deps via props/providers |

The most important mindset shift is to treat component tests as behavior tests, not implementation tests. You verify what a user sees and does, not internal state. Components designed with serializable props, callbacks that emit data rather than DOM events, and clear provider boundaries are dramatically easier to test this way, and that design discipline pays off across your whole codebase. To accelerate adoption, browse ready-made Playwright and React testing skills in the [QASkills directory](/skills) and drop them straight into your AI coding agent.

## Frequently Asked Questions

### Is Playwright component testing production-ready in 2026?

The \`@playwright/experimental-ct-react\` package is still officially experimental, meaning its API can change between minor releases. That said, many teams use it in production for visual and interaction testing. The safe approach is to pin your Playwright version, read release notes before upgrading, and keep the experimental runner scoped to UI components rather than your entire test strategy.

### How is Playwright component testing different from React Testing Library?

React Testing Library runs in jsdom, a simulated DOM with no real layout, styling, or browser APIs. Playwright component testing mounts your component in an actual Chromium, Firefox, or WebKit browser, so CSS, focus, scrolling, and visual snapshots are real. RTL is faster for pure logic; Playwright CT is more accurate for anything where rendering, layout, or cross-browser behavior matters.

### Can I pass functions as props to a mounted component?

Yes, but with a caveat. Functions cross the Node-to-browser bridge, and you can capture their invocations through a closure that pushes arguments into an array you assert on later. The arguments themselves must be serializable, so pass primitive values like strings or numbers rather than raw DOM event objects. Design callbacks to emit data, for example \`onChange={(value) => ...}\`, for the cleanest tests.

### How do I mock API calls in a Playwright component test?

Use \`page.route()\` exactly as in end-to-end tests. Register the route handler on the \`page\` fixture before calling \`mount\`, so the component's effects see the stubbed response. You can fulfill with mock JSON, return error statuses, or abort requests. Interception happens at the browser network layer, so anything using \`fetch\` or \`XMLHttpRequest\` is covered automatically.

### Do I need Vite to use Playwright component testing?

The runner uses its own embedded Vite pipeline to bundle components, regardless of what bundler your application uses. So you can test components from a webpack or Create React App project. The catch is that any custom resolution, aliases, or plugins from your real build must be mirrored in the \`ctViteConfig\` block of \`playwright-ct.config.ts\`, or the test bundle will fail to resolve imports.

### How do I add providers like Redux or React Query to every test?

Use the \`beforeMount\` hook in \`playwright/index.tsx\`. It receives your component as \`App\` and lets you wrap it in any providers, returning the wrapped tree. You can also read a per-test \`hooksConfig\` object passed through the \`mount\` options to vary theme, route, or store state on a test-by-test basis without duplicating boilerplate.

### Are visual snapshots reliable across operating systems?

Screenshots are pixel-accurate but font rendering and anti-aliasing differ between macOS, Windows, and Linux, which can cause false diffs. Generate and review baselines on the same OS your CI uses, ideally inside the official Playwright Docker image. Disable animations with \`animations: 'disabled'\` and allow a small \`maxDiffPixelRatio\` tolerance to keep snapshots deterministic.

### When should I use component testing instead of E2E?

Reach for component testing when you want to verify a single component's rendering, visual states, accessibility, or local interaction without booting the whole app. It is faster and less flaky than E2E for these cases. Use E2E when you need to test a real user journey that spans multiple pages, real routing, authentication, and a live or fully mocked backend working together.

## Conclusion

Playwright component testing for React gives you real-browser fidelity at the component level: accurate CSS and layout, true browser APIs, network interception through \`page.route()\`, and pixel-perfect visual snapshots, all without the cost of full end-to-end runs. Set up \`playwright-ct.config.ts\`, mount components with real props, wire providers through \`beforeMount\`, and you have a fast, trustworthy middle layer in your testing pyramid. Keep pure logic in unit tests, reserve E2E for journeys, and let component tests own your UI correctness.

Ready to level up your QA workflow with AI coding agents? Explore the full library of Playwright, React, and testing skills in the [QASkills directory](/skills) and install battle-tested patterns directly into Claude Code, Cursor, and other agents in seconds.
`,
};
