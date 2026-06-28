import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for React: Complete Guide 2026',
  description:
    'Playwright component testing for React in 2026: mount real components in a real browser with @playwright/experimental-ct-react, props, events, page.route mocking, and config.',
  date: '2026-06-28',
  category: 'Guide',
  content: `
# Playwright Component Testing for React: Complete Guide 2026

Playwright component testing for React lets you mount a real React component inside a real browser engine (Chromium, Firefox, or WebKit) and drive it exactly as a user would. Instead of rendering into jsdom like React Testing Library, Playwright component testing boots a real browser, mounts the component you point at, and runs your assertions against the actual rendered DOM with real CSS, real layout, real event dispatch, and real network. If you have ever chased a test that passed in jsdom but broke in production because a CSS \`:focus-visible\` rule or an \`IntersectionObserver\` behaved differently, this is the testing model that closes that gap.

This guide is the complete 2026 reference for teams evaluating or running Playwright component testing for React. We cover the full setup with \`@playwright/experimental-ct-react\`, the \`playwright-ct.config.ts\` file, the \`playwright/index.html\` and \`playwright/index.tsx\` entry points, the \`mount\` fixture, passing props and asserting on events, mocking network with \`page.route\`, asserting on hook and state behavior through rendered output, handling slots and children, and the honest limitations of an experimental feature. Along the way we compare it to React Testing Library on jsdom and to Cypress component testing so you can choose deliberately. To browse installable QA skills for Claude Code and other agents, see [browse QA skills](/skills).

## Does Playwright support component testing for React?

Yes. Playwright ships an experimental component testing runner under the package \`@playwright/experimental-ct-react\`. The word "experimental" in the package name is deliberate and matters, but the feature is real, actively maintained, and used in production by many teams. The core idea: instead of starting your full app and navigating with \`page.goto\`, you import a single component into a test file and call \`mount(<Button />)\`. Playwright transpiles your component, bundles it with Vite, serves it inside a real browser, and hands you a locator pointing at the mounted root.

The mental model is "E2E ergonomics, component scope." You get the same \`expect(locator).toBeVisible()\` assertions, the same \`getByRole\` queries, the same auto-waiting, the same trace viewer, and the same cross-browser matrix you already use for [Playwright E2E tests](/blog/playwright-e2e-complete-guide) — but scoped to one component rather than a whole page flow. That is the headline benefit: one assertion API and one runner for both component and end-to-end layers.

## Setup: installing @playwright/experimental-ct-react

Component testing for React installs as its own package alongside core Playwright. For a Vite-based React project run:

\`\`\`bash
npm install --save-dev @playwright/experimental-ct-react
npx playwright install --with-deps
\`\`\`

The first command pulls in the component test runner and its Vite-based bundler. The second installs the browser binaries (Chromium, Firefox, WebKit) plus their OS dependencies. If you are scaffolding from scratch, Playwright can generate the config and entry files for you:

\`\`\`bash
npm init playwright@latest -- --ct
\`\`\`

The \`--ct\` flag tells the initializer to wire up component testing instead of, or in addition to, the standard E2E setup. It creates three files you will edit constantly: \`playwright-ct.config.ts\`, \`playwright/index.html\`, and \`playwright/index.tsx\`. Let us walk through each one.

## The config file: playwright-ct.config.ts

The component testing config looks almost identical to a normal Playwright config, except you import \`defineConfig\` and \`devices\` from \`@playwright/experimental-ct-react\` rather than from \`@playwright/test\`. That import swap is what activates the component-mounting machinery.

\`\`\`ts
import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src',
  testMatch: /.*\\.spec\\.tsx$/,
  snapshotDir: './__snapshots__',
  timeout: 10_000,
  fullyParallel: true,
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': '/src',
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

A few fields are component-specific. \`ctPort\` is the local port Playwright uses to serve the mounted component bundle. \`ctViteConfig\` accepts a partial Vite config — this is where you re-declare path aliases, plugins, or CSS preprocessors that your real \`vite.config.ts\` defines, because the component runner uses its own Vite instance and does not automatically inherit your app config. \`testMatch\` here targets \`.spec.tsx\` files so component specs stay distinct from your E2E \`.spec.ts\` files.

## The entry points: playwright/index.html and index.tsx

Two small files control the environment your component mounts into. \`playwright/index.html\` is the HTML shell. It must contain an element your component mounts into and a script tag pointing at the TSX entry:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Playwright Component Tests</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
\`\`\`

\`playwright/index.tsx\` is the most important customization point in the whole setup. It runs once before every mounted component and is where you inject global providers, theme context, global CSS, fonts, and i18n — anything your components assume exists in the app tree.

\`\`\`tsx
import { beforeMount } from '@playwright/experimental-ct-react/hooks';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import '../src/styles/global.css';

beforeMount(async ({ App }) => {
  return (
    <ThemeProvider theme="light">
      <App />
    </ThemeProvider>
  );
});
\`\`\`

The \`beforeMount\` hook receives \`App\` — the component the test is about to mount — and lets you wrap it in providers. This is the Playwright equivalent of React Testing Library's custom \`render\` wrapper. Import your real \`global.css\` here so components render with production styles. Because everything runs in a real browser, those styles actually apply, unlike jsdom which loads but does not compute CSS.

## Writing a component: Button.tsx

Let us build a small but realistic component to test. It has props, a click handler, a disabled state, and a variant that maps to a CSS class — enough surface to exercise the whole testing API.

\`\`\`tsx
import { type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={\`btn btn--\${variant}\`}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}
\`\`\`

Notice the accessibility-friendly markup: a real \`<button>\` element, an \`aria-busy\` attribute, and visible text. This matters because Playwright component testing strongly favors \`getByRole\` and \`getByText\` queries that mirror how users and assistive technology perceive the component, not brittle class selectors.

## The mount fixture: Button.spec.tsx

Here is a complete spec that mounts the button, queries it by role, and asserts on its rendered output. The key import is \`test\` from \`@playwright/experimental-ct-react\`, which extends the base test with a \`mount\` fixture.

\`\`\`tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test('renders its children as the accessible name', async ({ mount }) => {
  const component = await mount(<Button>Save changes</Button>);
  await expect(component).toHaveText('Save changes');
});

test('exposes a button role', async ({ mount, page }) => {
  await mount(<Button>Submit</Button>);
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});

test('reflects the variant in its class', async ({ mount }) => {
  const component = await mount(<Button variant="danger">Delete</Button>);
  await expect(component).toHaveClass(/btn--danger/);
});

test('is disabled when the disabled prop is set', async ({ mount, page }) => {
  await mount(<Button disabled>Submit</Button>);
  await expect(page.getByRole('button')).toBeDisabled();
});

test('shows the loading label and is not clickable while loading', async ({ mount, page }) => {
  await mount(<Button loading>Submit</Button>);
  await expect(page.getByRole('button')).toHaveText('Loading…');
  await expect(page.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('button')).toBeDisabled();
});
\`\`\`

The \`mount\` fixture returns a \`Locator\` pointing at the component's root element. You can assert on it directly (\`expect(component).toHaveText(...)\`) or fall back to the \`page\` fixture for role-based queries that search the whole rendered document. Auto-waiting is built in: \`toBeVisible\` retries until the element appears or the timeout fires, so you rarely write explicit waits.

## Asserting on events with a callback prop

Testing that a click handler fires is where the component model shines, because you bridge a real browser click to a real JavaScript callback. Playwright lets you pass functions as props directly; calls into them are serialized back to the Node test process.

\`\`\`tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test('calls onClick exactly once when clicked', async ({ mount }) => {
  let clicks = 0;
  const component = await mount(
    <Button onClick={() => { clicks += 1; }}>Save</Button>
  );

  await component.click();
  expect(clicks).toBe(1);
});

test('does not call onClick when disabled', async ({ mount }) => {
  let clicked = false;
  const component = await mount(
    <Button disabled onClick={() => { clicked = true; }}>Save</Button>
  );

  await component.click({ force: true });
  expect(clicked).toBe(false);
});
\`\`\`

The closure variable \`clicks\` lives in the Node process, but the click happens in the browser. Playwright marshals the prop function across that boundary so your assertion sees the real invocation count. For richer event payloads, capture the arguments into an array and assert on its contents after the interaction. This is the direct analog of a React Testing Library \`vi.fn()\` spy, but driven by a genuine browser click rather than a synthetic event.

## Mocking network with page.route inside a component test

Components that fetch data are the most valuable to test in a real browser, and the most awkward to mock. Playwright gives you the same \`page.route\` interception you use in E2E tests, scoped to the component under test. Suppose we have a component that loads a user profile on mount:

\`\`\`tsx
import { useEffect, useState } from 'react';

interface User { id: number; name: string; }

export function UserCard({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(\`/api/users/\${userId}\`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setUser)
      .catch(() => setError(true));
  }, [userId]);

  if (error) return <p role="alert">Failed to load user</p>;
  if (!user) return <p>Loading…</p>;
  return <h2>{user.name}</h2>;
}
\`\`\`

The test intercepts the request with \`page.route\` before mounting, so the real \`fetch\` call hits a fake response instead of a live server:

\`\`\`tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { UserCard } from './UserCard';

test('renders the user name from the API', async ({ mount, page }) => {
  await page.route('**/api/users/7', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 7, name: 'Ada Lovelace' }),
    });
  });

  const component = await mount(<UserCard userId={7} />);
  await expect(component.getByRole('heading')).toHaveText('Ada Lovelace');
});

test('shows an error alert when the API fails', async ({ mount, page }) => {
  await page.route('**/api/users/7', (route) =>
    route.fulfill({ status: 500, body: 'boom' })
  );

  const component = await mount(<UserCard userId={7} />);
  await expect(component.getByRole('alert')).toHaveText('Failed to load user');
});
\`\`\`

Register the route before \`mount\` so the interception is active when the \`useEffect\` fires its request. This is genuine network mocking at the browser level — no module mocking, no swapping out \`fetch\`, no MSW worker. The component runs exactly the code it runs in production; only the wire response is faked. For deeper API mocking strategies that also apply to component tests, the [Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers \`route.fulfill\` and \`route.continue\` in detail.

## Asserting on hooks and state through rendered output

Playwright component testing is deliberately black-box. You do not reach into \`useState\` or inspect a hook's internals; you assert on what the rendered DOM shows after an interaction, which is exactly what a user experiences. Consider a counter that exercises \`useState\`:

\`\`\`tsx
import { useState } from 'react';

export function Counter({ start = 0 }: { start?: number }) {
  const [count, setCount] = useState(start);
  return (
    <div>
      <output aria-label="count">{count}</output>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

\`\`\`tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from './Counter';

test('increments state on each click', async ({ mount }) => {
  const component = await mount(<Counter start={3} />);
  const value = component.getByLabel('count');

  await expect(value).toHaveText('3');
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(value).toHaveText('4');
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(value).toHaveText('5');
});
\`\`\`

The \`useState\` updates are never inspected directly. Each click triggers a real re-render, and the assertion reads the new text. This forces tests that survive refactors: change the hook to \`useReducer\` and the test still passes, because it only cares about behavior. That black-box discipline is one of the strongest arguments for the component-testing approach over implementation-coupled unit tests.

## Slots and children: composing components

React's children prop is the equivalent of slots, and it mounts naturally. You can pass JSX children, multiple named regions via props, or render-prop functions. Here is a card that accepts a header slot and body children:

\`\`\`tsx
import { type ReactNode } from 'react';

export function Card({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <header className="card__header">{header}</header>
      <div className="card__body">{children}</div>
    </section>
  );
}
\`\`\`

\`\`\`tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Card } from './Card';

test('renders header and body slots independently', async ({ mount }) => {
  const component = await mount(
    <Card header={<h3>Billing</h3>}>
      <p>Your plan renews on the 1st.</p>
    </Card>
  );

  await expect(component.getByRole('heading', { name: 'Billing' })).toBeVisible();
  await expect(component.getByText('Your plan renews on the 1st.')).toBeVisible();
});
\`\`\`

One real constraint: anything you pass as a prop or child crosses the Node-to-browser boundary, so JSX children must be serializable React elements, not arbitrary closures referencing Node-only objects. Functions as props work (Playwright marshals the calls), but you cannot, for example, pass a live database handle as a prop. In practice this rarely bites, because well-designed components already take serializable props.

## npm scripts and CI

Wire the runner into \`package.json\` so the component suite runs locally and in CI:

\`\`\`json
{
  "scripts": {
    "test-ct": "playwright test -c playwright-ct.config.ts",
    "test-ct:ui": "playwright test -c playwright-ct.config.ts --ui",
    "test-ct:update": "playwright test -c playwright-ct.config.ts --update-snapshots"
  }
}
\`\`\`

In CI, run \`npm run test-ct\` after installing browsers with \`npx playwright install --with-deps\`. Because the runner is the same as core Playwright, you reuse the same reporters, the same trace viewer for debugging failures, the same sharding (\`--shard=1/3\`), and the same HTML report. The component suite and the E2E suite share infrastructure, which is a meaningful operational saving compared to maintaining a separate Jest stack alongside Playwright.

## Playwright CT vs React Testing Library vs Cypress CT

The choice between these three tools comes down to fidelity versus speed and the rest of your stack. The table below summarizes the trade-offs.

| Dimension | Playwright CT | React Testing Library (jsdom) | Cypress CT |
|---|---|---|---|
| Render target | Real browser (Chromium/Firefox/WebKit) | jsdom (simulated DOM) | Real browser (Chromium-family/WebKit) |
| Real CSS and layout | Yes | No | Yes |
| Cross-browser | Yes, all three engines | No | Limited |
| Speed per test | Slower (browser boot) | Fastest | Slower (browser boot) |
| Network mocking | \`page.route\` (browser-level) | Module mock or MSW | \`cy.intercept\` |
| Maturity | Experimental | Very mature | GA, mature |
| Shares runner with E2E | Yes (Playwright) | No | Yes (Cypress) |
| Best for | Layout/CSS-sensitive components, cross-browser | Pure logic, huge fast suites | Teams already on Cypress |

If your suite is mostly pure-logic components and you value raw speed, React Testing Library on jsdom is still excellent. If you need real CSS, real browser APIs, or cross-browser coverage, Playwright CT is compelling. If your team already lives in Cypress, its component runner is more mature today. For a deeper runner-level comparison, see [Cypress vs Playwright](/blog/cypress-vs-playwright-2026).

## What the mount fixture returns and the fixture API

The \`mount\` fixture is the heart of the API. It returns a \`Locator\`, which means everything you know about Playwright locators applies to the mounted component. The table below maps the most common operations.

| API | Returns / does | Typical use |
|---|---|---|
| \`mount(<Component />)\` | A \`Locator\` for the component root | Render and get a handle |
| \`component.getByRole(role, opts)\` | Scoped \`Locator\` | Query inside the component |
| \`component.getByText(text)\` | Scoped \`Locator\` | Query by visible text |
| \`component.click()\` | Performs a real click | Trigger event handlers |
| \`component.update(<Component />)\` | Re-mounts with new props | Test prop changes |
| \`component.unmount()\` | Removes the component | Test cleanup/teardown effects |
| \`page.route(url, handler)\` | Intercepts network | Mock APIs before mount |
| \`expect(locator).toBeVisible()\` | Auto-waiting assertion | Verify rendered output |

The \`component.update()\` method deserves a callout: it re-renders the same mounted root with new props, which is how you test how a component reacts to changing props without a full re-mount, mirroring a React re-render in the parent.

## When to choose component tests vs E2E tests

Component testing is not a replacement for end-to-end testing; the two answer different questions. Use this table to place each test at the right layer.

| Question to answer | Component test | E2E test |
|---|---|---|
| Does this button render the right label when disabled? | Yes | Overkill |
| Does the variant prop apply the right CSS class? | Yes | No |
| Does clicking through checkout actually charge a card? | No | Yes |
| Does a fetch error show an inline alert? | Yes | Possible but slower |
| Does routing between three pages preserve auth? | No | Yes |
| Does this date picker handle keyboard navigation? | Yes | Possible |
| Do all microservices integrate end to end? | No | Yes |

The rule of thumb: component tests verify a single component's contract in isolation with mocked boundaries; E2E tests verify that real systems integrate across pages and services. A healthy suite has many fast component tests and a smaller set of high-value E2E journeys. Pairing component tests with [visual regression testing](/blog/visual-regression-testing-guide) also catches styling drift that behavioral assertions miss, since the real browser renders pixels you can snapshot.

## Limitations: it is experimental, and the transpile boundary

Two honest caveats define the edges of Playwright component testing in 2026.

First, the package is \`@playwright/experimental-ct-react\`. The \`experimental\` prefix signals that the public API can change between minor versions, configuration keys may be renamed, and the feature is not covered by the same stability guarantees as core Playwright. In practice it has been stable enough for production use for years, but you should pin versions and read the changelog before upgrading, rather than treating it as a frozen contract.

Second, there is a transpile and serialization boundary between your Node test code and the browser-mounted component. Your test file runs in Node; the component runs in the browser. Props and children cross that boundary and must be serializable React elements. You cannot import a Node-only module into the component path, and complex non-serializable props (live sockets, Node streams, class instances with methods that close over Node state) will not survive the crossing. Functions as props work because Playwright marshals their invocations, but the rule of thumb is: keep props plain and serializable, and keep Node-specific logic out of the component bundle. Build-tool config also lives separately in \`ctViteConfig\`, so aliases and plugins must be re-declared rather than inherited from your app's Vite config.

These constraints are manageable, but knowing them up front prevents a frustrating afternoon debugging why a perfectly reasonable-looking prop refuses to reach the browser.

## Conclusion

Playwright component testing for React gives you the fidelity of a real browser engine with the scope and speed of component tests, all on the same runner and assertion API you already use for end-to-end tests. You mount real components with \`@playwright/experimental-ct-react\`, pass props and callbacks, assert behavior through \`getByRole\` and rendered output, and mock the network with the same \`page.route\` you use in E2E. The cost is browser boot time and an experimental API surface; the payoff is tests that behave like production because they run in production browsers. For most teams the right move is a layered strategy: fast component tests for component contracts, a handful of E2E journeys for system integration, and visual snapshots where styling matters.

Ready to put these patterns to work faster? Install ready-made Playwright and component-testing skills for Claude Code and other AI coding agents from the QA Skills directory — [browse QA skills](/skills) to add mount fixtures, route-mocking helpers, and config templates to your agent in one command.

## Frequently Asked Questions

### Does Playwright support component testing for React?

Yes. Playwright provides component testing through the \`@playwright/experimental-ct-react\` package. It mounts a real React component inside a real browser engine, rather than in a simulated DOM, and exposes a mount fixture plus the standard Playwright locator and assertion API. The feature is experimental in name but is actively maintained and widely used in production by teams that want real-browser fidelity at component scope.

### How is Playwright component testing different from React Testing Library?

The biggest difference is the render target. React Testing Library renders into jsdom, a simulated DOM that is fast but cannot compute real CSS, layout, or many browser APIs. Playwright mounts components into a real browser, so styles apply, layout is genuine, and cross-browser engines are testable. Testing Library is faster per test and better for huge pure-logic suites; Playwright wins on fidelity, real CSS, and sharing one runner with end-to-end tests.

### Is Playwright component testing production ready?

It is production capable but officially experimental. The package name carries the experimental prefix, which means the API can shift between minor releases and is not covered by core Playwright's stability guarantees. Many teams run it successfully in production today. The pragmatic approach is to pin your Playwright version, read the changelog before upgrading, and treat configuration keys as potentially mutable rather than a frozen, long-term contract.

### How do I mock APIs in Playwright component tests?

Use the same page.route interception that Playwright provides for end-to-end tests. Register a route handler that matches the request URL before you call mount, then fulfill it with a fake status, headers, and body. Because the component runs in a real browser, its real fetch or XHR call hits your intercepted response with no module mocking or service worker required. Always register the route before mounting so the interception is active when effects fire.

### Can I test event handlers and click callbacks with Playwright?

Yes, and it is one of the strongest features. You pass a function as a prop, and Playwright marshals calls to it across the Node-to-browser boundary. A real browser click on the mounted component invokes your callback, and you assert on a counter or captured arguments in your Node test code. This gives you genuine browser event dispatch rather than synthetic events, which catches issues that simulated event systems can miss.

### When should I use component tests instead of end-to-end tests?

Use component tests to verify a single component's contract in isolation: props rendering correctly, variants applying styles, callbacks firing, and error states showing. Mock the network and other boundaries. Reserve end-to-end tests for verifying that real systems integrate across pages and services, such as login preserving auth across routes or a checkout flow actually charging a card. A healthy suite has many fast component tests and a smaller set of high-value end-to-end journeys.

### What are the main limitations of Playwright component testing?

Two stand out. First, the experimental status means the API can change between versions, so pin and watch the changelog. Second, there is a serialization boundary: your test runs in Node while the component runs in the browser, so props and children must be serializable React elements. Functions as props work because Playwright marshals their calls, but non-serializable values like live sockets or Node streams will not cross. Build config also lives separately in ctViteConfig and must be re-declared.
`,
};
