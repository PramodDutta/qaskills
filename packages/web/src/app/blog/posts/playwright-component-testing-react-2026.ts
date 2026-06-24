import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for React: 2026 Complete Tutorial',
  description:
    'Learn Playwright component testing for React in 2026. Set up experimental-ct, mount components in a real browser, mock props, and run fast isolated tests.',
  date: '2026-06-24',
  category: 'Tutorial',
  content: `
# Playwright Component Testing for React: The 2026 Complete Tutorial

Playwright component testing lets you mount a single React component inside a real browser and assert on its behavior without spinning up your entire application. For years, React teams reached for jsdom-based runners like Jest or React Testing Library, which simulate a DOM in Node instead of running in a genuine rendering engine. That simulation is fast, but it lies: jsdom does not lay out elements, does not compute styles the way Chromium does, and famously cannot tell you whether a button is actually clickable. Playwright component testing closes that gap by rendering your component in Chromium, Firefox, or WebKit and driving it with the exact same locator and assertion APIs you already use for end-to-end tests.

In this tutorial you will set up the experimental component testing harness (\`@playwright/experimental-ct-react\`), mount your first component, pass and mock props, test user interactions, handle network requests, and wire everything into CI. By the end you will understand when component testing beats both unit tests and full end-to-end tests, and how to structure a suite that stays fast and trustworthy through 2026 and beyond. If you have already read our [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide), this article is the missing middle layer of your testing pyramid: faster than E2E, far more realistic than jsdom.

Component testing matters more than ever because modern React apps lean on browser-only behavior: \`ResizeObserver\`, \`IntersectionObserver\`, CSS container queries, focus trapping, and pointer events. None of those work reliably in jsdom. Running components in a real engine means the test you write is the test of what users experience. Let us build it from scratch.

## Why Playwright Component Testing Instead of jsdom?

The core argument is fidelity. A jsdom test for a dropdown can pass while the real dropdown is invisible, off-screen, or covered by an overlay, because jsdom has no concept of layout or paint. Playwright runs your component in a headless (or headed) browser, so \`toBeVisible()\`, \`click()\`, and \`hover()\` mean what they say.

Here is how the three common approaches compare for a React component suite in 2026:

| Dimension | Playwright CT | React Testing Library (jsdom) | Full E2E (Playwright) |
| --- | --- | --- | --- |
| Rendering engine | Real Chromium/Firefox/WebKit | Simulated jsdom | Real browser |
| Setup cost | Medium (Vite + ct config) | Low | Medium-high |
| Speed per test | Fast (~50-150ms) | Fastest (~10-40ms) | Slow (~1-5s) |
| Catches layout/CSS bugs | Yes | No | Yes |
| Catches routing/integration bugs | No | No | Yes |
| Real network mocking | Yes (route interception) | Mock at module level | Yes |
| Cross-browser coverage | Yes | No | Yes |

The sweet spot for Playwright CT is testing a component's behavior in isolation with real browser semantics. Reach for end-to-end tests when you need to verify flows across pages, and keep a thin layer of pure-function unit tests for logic that has nothing to do with the DOM. This three-tier split keeps your suite both fast and meaningful.

## Prerequisites and Project Assumptions

This tutorial assumes you have an existing React project built with Vite (the default and best-supported bundler for Playwright CT) or Next.js using a Vite-compatible component config. You need:

- Node.js 18 or newer (Node 20 LTS recommended for 2026)
- A package manager: npm, pnpm, or yarn
- React 18 or React 19 (both are supported by the 2026 experimental-ct package)
- TypeScript (optional but used throughout this tutorial)

Verify your Node version before starting:

\`\`\`bash
node --version
# v20.x.x or newer is ideal
\`\`\`

Component testing in Playwright is still shipped under the \`experimental-ct\` namespace as of 2026. "Experimental" here means the public API may shift between major versions, not that it is unstable in practice. Thousands of teams run it in CI daily. Pin your Playwright version in \`package.json\` so an unexpected upgrade does not change behavior mid-sprint.

## Installing the Playwright Experimental-CT Setup

The fastest way to scaffold component testing is the official initializer. From the root of your React project, run:

\`\`\`bash
npm init playwright@latest -- --ct
\`\`\`

The \`--ct\` flag tells the initializer to set up component testing rather than end-to-end testing. It will ask which framework you use (choose React) and which language (choose TypeScript). When it finishes, your project gains several new files:

\`\`\`text
playwright-ct.config.ts        # The component test runner config
playwright/index.html          # The HTML shell each component mounts into
playwright/index.ts            # Setup file: global CSS, providers, polyfills
tests/                         # Where your .spec.tsx files live
\`\`\`

If you prefer to install manually, add the package directly and create the config yourself:

\`\`\`bash
npm install --save-dev @playwright/experimental-ct-react
npx playwright install --with-deps
\`\`\`

The \`playwright install --with-deps\` step downloads the browser binaries and their OS-level dependencies. On CI you will run this same command before your tests. The \`--with-deps\` flag installs missing system libraries on Linux runners, which saves you from cryptic "missing shared library" failures.

## Configuring playwright-ct.config.ts

The component config looks similar to a normal Playwright config but uses \`defineConfig\` from the experimental-ct package. Here is a production-ready 2026 configuration:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.spec.tsx',
  snapshotDir: './__snapshots__',
  timeout: 10_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
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

The \`ctViteConfig\` block is the key to a happy setup. Because Playwright bundles each component with Vite under the hood, you must mirror any path aliases, plugins, or environment defines that your app's own Vite config uses. If your app resolves \`@/components/Button\`, the test bundler needs the same alias or the import will fail. Keep \`fullyParallel\` on so independent component tests run across worker processes, and use \`retries\` on CI to absorb the occasional infrastructure hiccup without masking real flakiness.

## Setting Up playwright/index.ts for Providers

Real components rarely render in a vacuum. They expect a theme provider, a router context, a query client, or global CSS. The \`playwright/index.ts\` file runs once before your components mount, making it the right place to register global styles and shared setup:

\`\`\`typescript
// playwright/index.ts
import '../src/styles/global.css';
import '../src/styles/tokens.css';

// Polyfill APIs some components touch during mount.
import 'intersection-observer';
\`\`\`

For per-test providers like a theme or a query client, Playwright CT offers a \`beforeMount\` hook. Create \`playwright/index.tsx\` (note the \`.tsx\`) and wrap mounted components:

\`\`\`tsx
// playwright/index.tsx
import { beforeMount } from '@playwright/experimental-ct-react/hooks';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

beforeMount(async ({ App }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme="light">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  );
});
\`\`\`

Every component you mount is now wrapped in your providers automatically. This mirrors how the component behaves inside the real app and saves you from repeating boilerplate in each spec file.

## Mounting Your First Component

Let us test a simple \`Button\` component. Here is the component under test:

\`\`\`tsx
// src/components/Button.tsx
interface ButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, disabled, variant = 'primary' }: ButtonProps) {
  return (
    <button
      type="button"
      className={\\\`btn btn-\\\${variant}\\\`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
\`\`\`

And here is its component test. The \`mount\` fixture renders the component into the real browser and returns a locator scoped to the mounted root:

\`\`\`tsx
// src/components/Button.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test('renders the label and is visible', async ({ mount }) => {
  const component = await mount(<Button label="Save changes" />);
  await expect(component).toContainText('Save changes');
  await expect(component).toBeVisible();
});

test('applies the secondary variant class', async ({ mount }) => {
  const component = await mount(<Button label="Cancel" variant="secondary" />);
  await expect(component).toHaveClass(/btn-secondary/);
});
\`\`\`

Run it:

\`\`\`bash
npx playwright test -c playwright-ct.config.ts
\`\`\`

The first run downloads nothing extra and bundles your component with Vite. Notice that you are writing the same \`expect(locator).toBeVisible()\` assertions you would use in an end-to-end test. That shared vocabulary is one of the biggest practical wins of Playwright CT: your team learns one API for both layers.

## Passing Props and Mocking Callbacks

Component testing shines when you verify how a component reacts to props and emits events. Because the test runs in Node but the component runs in the browser, callbacks need a small bridge. Playwright CT lets you pass functions as props and observe their calls through the \`onEvent\`-style pattern or by capturing state in the test:

\`\`\`tsx
// src/components/Button.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';

test('fires onClick when pressed', async ({ mount }) => {
  let clicks = 0;
  const component = await mount(
    <Button
      label="Increment"
      onClick={() => {
        clicks += 1;
      }}
    />,
  );

  await component.click();
  await component.click();

  expect(clicks).toBe(2);
});

test('does not fire onClick when disabled', async ({ mount }) => {
  let clicked = false;
  const component = await mount(
    <Button label="Submit" disabled onClick={() => (clicked = true)} />,
  );

  await component.click({ force: true });
  expect(clicked).toBe(false);
});
\`\`\`

The closure variable \`clicks\` is incremented by the prop function that Playwright serializes and runs in the browser context. This pattern replaces jest's \`vi.fn()\` mocks: instead of asserting on a mock's call count, you observe a real value the component mutated. For the disabled case, note the \`force: true\` option, which bypasses Playwright's actionability checks so you can prove a disabled button truly ignores clicks.

## Updating Props and Re-rendering

Components change over their lifecycle. The \`mount\` result exposes an \`update\` method so you can re-render with new props and assert that the component responds correctly:

\`\`\`tsx
// src/components/Counter.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from './Counter';

test('reflects updated props', async ({ mount }) => {
  const component = await mount(<Counter count={1} />);
  await expect(component).toContainText('Count: 1');

  await component.update(<Counter count={5} />);
  await expect(component).toContainText('Count: 5');
});
\`\`\`

This is invaluable for testing components that derive UI from props, such as progress bars, badges, and controlled inputs. You drive the component through several prop states in a single test and confirm each render is correct, all in a real browser.

## Mocking Network Requests in Component Tests

Components that fetch data are where Playwright CT decisively beats jsdom. Instead of mocking \`fetch\` at the module level, you intercept real network requests with \`router.route\`, exactly like in end-to-end tests. The \`page\` and \`router\` fixtures are available in component tests:

\`\`\`tsx
// src/components/UserCard.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { UserCard } from './UserCard';

test('renders user data from the API', async ({ mount, router }) => {
  await router.route('**/api/users/42', async (route) => {
    await route.fulfill({
      json: { id: 42, name: 'Ada Lovelace', role: 'Engineer' },
    });
  });

  const component = await mount(<UserCard userId={42} />);

  await expect(component).toContainText('Ada Lovelace');
  await expect(component).toContainText('Engineer');
});

test('shows an error state when the API fails', async ({ mount, router }) => {
  await router.route('**/api/users/42', (route) =>
    route.fulfill({ status: 500, json: { error: 'boom' } }),
  );

  const component = await mount(<UserCard userId={42} />);
  await expect(component).toContainText('Something went wrong');
});
\`\`\`

Because the interception happens at the network layer, your component uses its real \`fetch\` or \`axios\` code path. You are testing the actual data-loading logic, not a hand-rolled mock that might drift from reality. If you also maintain a full API suite, our [API testing complete guide](/blog/api-testing-complete-guide) covers contract-level checks that complement these component-level mocks.

## Testing Forms, Focus, and Keyboard Interaction

Forms expose the biggest fidelity gap between jsdom and a real browser. Focus order, \`Tab\` traversal, native validation, and \`Enter\`-to-submit all behave correctly in Playwright CT. Here is a login form test that exercises keyboard flow:

\`\`\`tsx
// src/components/LoginForm.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { LoginForm } from './LoginForm';

test('submits via the Enter key after filling fields', async ({ mount }) => {
  let submitted: { email: string; password: string } | null = null;
  const component = await mount(
    <LoginForm onSubmit={(values) => (submitted = values)} />,
  );

  await component.getByLabel('Email').fill('ada@example.com');
  await component.getByLabel('Password').fill('s3cret!');
  await component.getByLabel('Password').press('Enter');

  expect(submitted).toEqual({ email: 'ada@example.com', password: 's3cret!' });
});

test('moves focus through fields with Tab', async ({ mount, page }) => {
  const component = await mount(<LoginForm onSubmit={() => {}} />);

  await component.getByLabel('Email').focus();
  await page.keyboard.press('Tab');

  await expect(component.getByLabel('Password')).toBeFocused();
});
\`\`\`

The \`toBeFocused()\` assertion is impossible to trust in jsdom because jsdom does not manage real focus. Here it reflects exactly what a keyboard user experiences. This is also where accessibility regressions hide, so component tests double as a guardrail for keyboard usability.

## Visual and Snapshot Testing of Components

Playwright CT can capture screenshots of a mounted component and compare them against a baseline, giving you per-component visual regression coverage without rendering the whole app:

\`\`\`tsx
// src/components/Badge.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Badge } from './Badge';

test('matches the visual baseline', async ({ mount }) => {
  const component = await mount(<Badge status="success">Active</Badge>);
  await expect(component).toHaveScreenshot('badge-success.png');
});
\`\`\`

The first run writes the baseline; later runs compare against it and fail on visual diffs. Component-level screenshots are smaller and far more stable than full-page screenshots because there is less surrounding chrome to shift. For a deeper treatment of baselines, thresholds, and review workflows, see our [visual regression testing guide](/blog/visual-regression-testing-guide).

Here is how the assertion styles you have seen so far map to their jsdom equivalents:

| Goal | Playwright CT | React Testing Library |
| --- | --- | --- |
| Find by label | \`component.getByLabel('Email')\` | \`screen.getByLabelText('Email')\` |
| Assert visible | \`await expect(loc).toBeVisible()\` | \`expect(el).toBeVisible()\` (limited) |
| Assert focused | \`await expect(loc).toBeFocused()\` | unreliable in jsdom |
| Click | \`await loc.click()\` | \`fireEvent.click(el)\` |
| Mock network | \`router.route(...)\` | \`vi.mock\` / MSW |
| Visual snapshot | \`toHaveScreenshot()\` | not built in |

## Running Component Tests in CI

Component tests belong in CI so regressions are caught before merge. A minimal GitHub Actions job looks like this:

\`\`\`yaml
name: Component Tests
on: [push, pull_request]
jobs:
  ct:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test -c playwright-ct.config.ts
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
\`\`\`

To keep CI fast, you can run only Chromium on every push and reserve Firefox and WebKit for nightly runs or pre-release branches. Uploading the HTML report on failure means a developer can open a trace, watch the component mount, and see exactly which assertion failed without reproducing locally. If you want a broader pipeline blueprint, our guide on CI/CD testing with GitHub Actions explains caching, sharding, and matrix strategies that apply directly here.

## Common Pitfalls and How to Avoid Them

A few issues trip up teams adopting Playwright CT. First, importing server-only modules into a component pulls Node APIs into the browser bundle and breaks the build; keep component files free of \`fs\`, \`path\`, and other server imports. Second, forgetting to mirror your app's Vite aliases in \`ctViteConfig\` causes import resolution failures that look mysterious until you compare configs. Third, passing complex non-serializable objects as props can fail because Playwright serializes props across the Node-browser boundary; prefer plain data and bridge behavior through callbacks. Finally, do not over-mount: if a test needs three pages of navigation, it is an end-to-end test, not a component test.

Discoverable, reusable testing patterns like these are exactly what we catalog in the [QASkills skill directory](/skills), where you can install ready-made Playwright component testing recipes straight into your AI coding agent.

## Structuring a Component Test Suite That Scales

As your suite grows past a few dozen components, organization starts to matter as much as the individual tests. The most maintainable convention is to colocate each spec file next to its component, so \`Button.tsx\` and \`Button.spec.tsx\` live in the same folder. Colocation means a developer renaming or moving a component sees its test move with it, and a reviewer reading a pull request sees behavior changes and their tests side by side. It also makes orphaned tests obvious: if a component is deleted, its lonely spec file stands out immediately.

Inside each spec, group related assertions with \`test.describe\` blocks so the runner output reads like a specification of the component. Reserve one describe block per behavioral concern, such as rendering, interaction, and error states, rather than one giant test with a dozen assertions. Smaller, focused tests fail with precise messages and let Playwright parallelize aggressively, since each test gets its own worker slot. When several tests share setup, lean on the \`beforeMount\` provider wrapper you configured earlier instead of repeating provider boilerplate in every file.

Be deliberate about what belongs at the component layer versus the end-to-end layer. A component test should answer "does this component behave correctly given these props and interactions?" The moment a test needs to navigate between routes, persist data across reloads, or coordinate several pages, it has outgrown the component layer and belongs in your end-to-end suite. Drawing that boundary clearly keeps component tests fast and prevents the slow, brittle mega-tests that erode a team's trust in its suite. Pair this discipline with the actionability-aware locators Playwright gives you, and your component suite will stay green and meaningful as the codebase evolves through 2026.

A final scaling tip: standardize on accessibility-first locators like \`getByRole\` and \`getByLabel\` rather than CSS selectors or test IDs wherever possible. Role-based queries survive markup refactors, double as a lightweight accessibility check, and read like the way a real user perceives the interface. When you genuinely need a stable hook that has no semantic role, fall back to \`getByTestId\` with a clearly named attribute, but treat it as the exception rather than the default. This single convention, applied consistently, removes the most common source of locator churn in large component suites.

## Frequently Asked Questions

### What is Playwright component testing for React?

Playwright component testing mounts a single React component inside a real Chromium, Firefox, or WebKit browser using the \`@playwright/experimental-ct-react\` package. You assert on the component with the same locator and expect APIs used in end-to-end tests, getting real layout, styling, and focus behavior that jsdom-based runners cannot reproduce.

### How do I set up Playwright experimental-ct for a React project?

Run \`npm init playwright@latest -- --ct\` in your project root, choose React and TypeScript, and the initializer creates \`playwright-ct.config.ts\`, \`playwright/index.html\`, and \`playwright/index.ts\`. Then run \`npx playwright install --with-deps\` to download browsers. Mirror your app's Vite aliases in the config's \`ctViteConfig\` block so imports resolve correctly.

### Is Playwright CT a replacement for React Testing Library in 2026?

Not entirely. Playwright CT excels at testing real browser behavior such as layout, focus, and network mocking, while React Testing Library remains faster for pure logic and tiny presentational components. Many 2026 teams run both: jsdom tests for quick logic checks and Playwright CT for components where real rendering fidelity matters.

### How do I mock API calls in Playwright component tests?

Use the \`router.route\` fixture inside the test to intercept network requests and call \`route.fulfill\` with a JSON response. Because interception happens at the network layer, your component runs its real \`fetch\` or \`axios\` code path. This is more realistic than module-level mocks and matches how you mock requests in Playwright end-to-end tests.

### Why is Playwright component testing still called experimental?

The package ships under the \`experimental-ct\` namespace because its public API may change between major Playwright versions, not because it is unreliable. In practice many teams run it in production CI daily. Pin your Playwright version in \`package.json\` so an upgrade does not silently change behavior between releases.

### Can Playwright component tests run across multiple browsers?

Yes. Define \`chromium\`, \`firefox\`, and \`webkit\` projects in \`playwright-ct.config.ts\` and each component test runs in all three engines. To keep CI fast, many teams run only Chromium on every push and reserve Firefox and WebKit for nightly or pre-release runs, balancing cross-browser confidence against pipeline speed.

### How fast are Playwright component tests compared to end-to-end tests?

Component tests typically run in 50 to 150 milliseconds each because they mount one component instead of loading an entire application across multiple pages. Full end-to-end tests usually take one to five seconds each. This speed makes component testing practical for hundreds of components while still running in a real browser engine.

## Conclusion

Playwright component testing gives React teams the missing middle of the testing pyramid: tests that mount a single component in a real browser, run in milliseconds, and use the same trustworthy locator and assertion API as your end-to-end suite. You learned how to install the experimental-ct setup, configure Vite aliases and providers, mount components, pass and observe props, mock real network requests, exercise keyboard and focus behavior, capture visual snapshots, and run everything in CI. Adopt it as the layer between fast jsdom logic checks and slow full-flow end-to-end tests, and your suite will catch the layout, styling, and focus bugs that jsdom silently misses.

Ready to ship better React tests faster? Browse install-ready Playwright component testing recipes and dozens of other QA automation skills in the [QASkills skill directory](/skills) and drop them straight into your AI coding agent today.
`,
};
