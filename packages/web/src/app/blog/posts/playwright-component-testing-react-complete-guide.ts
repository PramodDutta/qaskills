import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for React: Complete 2026 Guide',
  description: 'Test React components in a real browser with Playwright Component Testing. Setup, mounting, fixtures, mocks, and best practices for 2026 with TypeScript.',
  date: '2026-05-02',
  category: 'Guide',
  content: `
# Playwright Component Testing for React: Complete 2026 Guide

Component testing sits between unit tests and end-to-end tests. Unit tests with Jest or Vitest run components in jsdom, which is fast but does not actually paint pixels or fire real browser events. End-to-end tests with the full Playwright stack run against a built app, which is realistic but slow and requires routes, layouts, and data flow. Playwright Component Testing (CT) splits the difference: it mounts a real React component in a real Chromium, Firefox, or WebKit, lets you assert with real locators, and captures real traces, all without standing up the full app.

In 2026 Playwright CT is the recommended replacement for Cypress Component Testing for teams that have standardized on Playwright. It uses the same API, the same locators, the same UI Mode, and the same CI pipelines. This guide walks through setup, mounting patterns, fixtures, mocking, snapshot testing, and the common pitfalls that teams hit when they migrate from Testing Library or Cypress.

Every example is TypeScript. Every code block uses the Playwright 1.49+ API. If you need an end-to-end primer first, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) is the starting point. The [playwright-e2e skill](/skills/playwright-e2e) gives Claude Code, Cursor, and Aider the patterns from this guide.

## Installing component testing

Playwright CT installs as a peer of \`@playwright/test\` and ships an adapter for each supported framework.

\`\`\`bash
pnpm create playwright --ct
# choose React when prompted
\`\`\`

The installer creates four artifacts:

| File | Purpose |
|---|---|
| \`playwright-ct.config.ts\` | Separate config from your e2e suite |
| \`playwright/index.html\` | The Vite-rendered shell that hosts mounted components |
| \`playwright/index.tsx\` | Optional global providers (theme, router, store) |
| \`tests/component/*.spec.tsx\` | Example component specs |

Your \`package.json\` gets two scripts:

\`\`\`json
{
  "scripts": {
    "test-ct": "playwright test -c playwright-ct.config.ts",
    "test-ct:ui": "playwright test -c playwright-ct.config.ts --ui"
  }
}
\`\`\`

## The component config file

\`playwright-ct.config.ts\` looks almost identical to a regular Playwright config, with a CT preset.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/experimental-ct-react';
import { resolve } from 'path';

export default defineConfig({
  testDir: './tests/component',
  snapshotDir: './__snapshots__',
  timeout: 10_000,
  fullyParallel: true,
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': resolve(__dirname, './src'),
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

The \`ctViteConfig\` block forwards a Vite config to the in-process bundler, so any path aliases, plugins, or PostCSS settings you use in production also apply during CT runs.

## Your first component test

Let's mount a simple button and assert on accessibility.

\`\`\`tsx
// src/components/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { children, variant = 'primary', loading, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      data-variant={variant}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
});
\`\`\`

\`\`\`tsx
// tests/component/button.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from '../../src/components/Button';

test.describe('Button', () => {
  test('renders accessible label', async ({ mount }) => {
    const component = await mount(<Button>Save</Button>);
    await expect(component).toHaveRole('button');
    await expect(component).toHaveAccessibleName('Save');
  });

  test('shows loading state', async ({ mount }) => {
    const component = await mount(<Button loading>Save</Button>);
    await expect(component).toHaveAttribute('aria-busy', 'true');
    await expect(component).toBeDisabled();
    await expect(component).toHaveText('Loading...');
  });

  test('invokes onClick when clicked', async ({ mount }) => {
    let clicked = 0;
    const component = await mount(
      <Button onClick={() => clicked++}>Save</Button>
    );
    await component.click();
    expect(clicked).toBe(1);
  });
});
\`\`\`

Run with \`pnpm test-ct\` and Playwright opens a hidden Chromium, mounts the component in the configured shell, and runs the test. Open with \`pnpm test-ct:ui\` for UI Mode and you see DOM snapshots for every step.

## Mounting components with providers

Most React components depend on context: a theme provider, a router, a query client, or a Zustand store. Wire global providers in \`playwright/index.tsx\` so every test inherits them.

\`\`\`tsx
// playwright/index.tsx
import { beforeMount, afterMount } from '@playwright/experimental-ct-react/hooks';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export type HooksConfig = {
  route?: string;
  theme?: 'light' | 'dark';
};

beforeMount<HooksConfig>(async ({ App, hooksConfig }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
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

afterMount(async () => {
  // Optional cleanup; usually unused.
});
\`\`\`

Tests can pass per-mount config via \`hooksConfig\`:

\`\`\`tsx
test('dark theme adjusts background', async ({ mount }) => {
  const component = await mount(<Card title="Hello" />, {
    hooksConfig: { theme: 'dark', route: '/dashboard' },
  });
  await expect(component).toHaveCSS('background-color', 'rgb(15, 23, 42)');
});
\`\`\`

## Mocking network requests

Component tests run in a real browser, so any \`fetch\` calls actually hit the network. Mock them with \`page.route\` in a before-each hook.

\`\`\`tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { UserList } from '../../src/components/UserList';

test.describe('UserList', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users', async (route) => {
      await route.fulfill({
        json: [
          { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
          { id: 2, name: 'Grace Hopper', email: 'grace@example.com' },
        ],
      });
    });
  });

  test('renders the list of users', async ({ mount }) => {
    const component = await mount(<UserList />);
    await expect(component.getByRole('listitem')).toHaveCount(2);
    await expect(component.getByText('Ada Lovelace')).toBeVisible();
  });

  test('shows empty state when no users', async ({ mount, page }) => {
    await page.route('**/api/users', (route) => route.fulfill({ json: [] }));
    const component = await mount(<UserList />);
    await expect(component.getByRole('status', { name: 'No users yet' })).toBeVisible();
  });
});
\`\`\`

The \`route\` handler intercepts every matching request before it reaches the wire and fulfills with the json payload. See [Playwright Network Mocking Route Handler Guide](/blog/playwright-network-mocking-route-handler-guide) for advanced patterns including partial responses, slow networks, and conditional matching.

## Fixtures for shared setup

Define a typed fixture once and reuse it across many tests.

\`\`\`tsx
import { test as base, expect } from '@playwright/experimental-ct-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type Fixtures = {
  authedClient: QueryClient;
};

export const test = base.extend<Fixtures>({
  authedClient: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('access_token', 'test-token-abc');
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await use(client);
  },
});

export { expect };
\`\`\`

\`\`\`tsx
import { test, expect } from './fixtures';
import { Dashboard } from '../../src/components/Dashboard';

test('dashboard greets the user', async ({ mount, authedClient }) => {
  const component = await mount(
    <QueryClientProvider client={authedClient}>
      <Dashboard />
    </QueryClientProvider>
  );
  await expect(component.getByRole('heading', { name: /welcome/i })).toBeVisible();
});
\`\`\`

For deeper fixture patterns, read [Playwright Fixtures Complete Reference](/blog/playwright-fixtures-complete-reference-2026).

## Visual snapshots

Component testing pairs naturally with visual regression. Capture a baseline image, and Playwright diffs it on every subsequent run.

\`\`\`tsx
test('button matches visual baseline', async ({ mount }) => {
  const component = await mount(<Button variant="primary">Save</Button>);
  await expect(component).toHaveScreenshot('button-primary.png', {
    maxDiffPixelRatio: 0.005,
  });
});

test('disabled button matches visual baseline', async ({ mount }) => {
  const component = await mount(<Button disabled>Save</Button>);
  await expect(component).toHaveScreenshot('button-disabled.png');
});
\`\`\`

Run \`pnpm test-ct -- --update-snapshots\` after the first pass to write baselines. Subsequent runs fail on diff and produce a PNG showing the difference.

## Locator strategies for components

Use the same locators you would in e2e: accessible roles, names, labels, and text. Component tests can also use \`data-testid\` because you control the rendered output, but prefer role-based locators when an accessible structure exists.

| Locator | When to use |
|---|---|
| \`getByRole('button', { name: 'Save' })\` | Default; resolves through accessibility tree |
| \`getByLabel('Email')\` | Inputs with an associated \`<label>\` |
| \`getByPlaceholder('Search')\` | Search inputs |
| \`getByText('Welcome back')\` | Static text without a role |
| \`getByTestId('user-avatar')\` | Last resort when no semantic option exists |

Refer to [Playwright Locator Strategies Guide](/blog/playwright-locator-strategies-getbyrole-guide) for the complete decision tree.

## Testing controlled inputs

Forms remain the most common interaction. Use \`fill\` for typing and \`getByLabel\` for the locator.

\`\`\`tsx
import { useState } from 'react';

function NameForm() {
  const [name, setName] = useState('');
  return (
    <form>
      <label>
        Your name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby="name-help"
        />
      </label>
      <p id="name-help">Use your full name as it appears on your ID.</p>
      <p>You typed: {name}</p>
    </form>
  );
}
\`\`\`

\`\`\`tsx
test('echoes typed name', async ({ mount }) => {
  const component = await mount(<NameForm />);
  await component.getByLabel('Your name').fill('Asha Patel');
  await expect(component.getByText('You typed: Asha Patel')).toBeVisible();
});
\`\`\`

## Common pitfalls

**Pitfall 1: Forgetting providers.** Mounting a component that consumes a context outside any provider throws at render time. Wrap globally in \`playwright/index.tsx\` rather than per-test.

**Pitfall 2: Asynchronous data.** Components that fetch data asynchronously need a network mock. Without one, the first render shows a loading skeleton and the assertion fails. Mock with \`page.route\` and assert on the post-fetch state.

**Pitfall 3: Server components.** React Server Components do not run in the browser. Component testing only covers client components. For server components, write an end-to-end test against the rendered route.

**Pitfall 4: Window globals.** Any code that reads \`window.localStorage\`, \`document.cookie\`, or other browser globals at import time can break inside the CT host. Use \`page.addInitScript\` to set storage before mount.

**Pitfall 5: CSS module flakiness.** If your component depends on CSS that loads from a separate request, the first paint may not include styles. Configure your CSS loader in \`ctViteConfig\`.

## Anti-patterns

- Using component testing as a substitute for end-to-end testing. CT does not exercise data fetching, routing, or authentication; e2e does.
- Mounting entire pages. If a "component" requires every provider in your tree, it is a page; test it end-to-end instead.
- Asserting on internal state. Test what the user sees, not what the React DevTools show.
- Disabling React Strict Mode. Strict Mode catches double-render bugs; leaving it on in CT is fine and surfaces real issues.
- Using \`waitForTimeout\` for re-renders. Use \`expect(locator).toBeVisible()\` and rely on auto-waiting.

## Migrating from Testing Library

The mental model translates directly. Replace \`render\` with \`mount\`, \`screen.getByRole\` with \`component.getByRole\`, and assertions are \`expect(locator)\` rather than \`expect(element)\`.

| Testing Library | Playwright CT |
|---|---|
| \`render(<Component />)\` | \`mount(<Component />)\` |
| \`screen.getByText(...)\` | \`component.getByText(...)\` |
| \`userEvent.click(button)\` | \`component.getByRole('button').click()\` |
| \`waitFor(() => ...)\` | \`expect(locator).toBeVisible()\` |
| \`act(...)\` | (not needed; CT handles it) |
| \`fireEvent.change(input, { target: { value }})\` | \`input.fill(value)\` |

## Migrating from Cypress Component Testing

The closer relative is Cypress, which had similar mount semantics. The key differences:

- Playwright runs in a fresh browser context per test; Cypress shares state aggressively.
- Playwright assertions are auto-waiting via locators; Cypress chains commands.
- Playwright traces are richer; Cypress has its own time-travel UI.

For teams choosing between them, read [Cypress vs Playwright 2026](/blog/cypress-vs-playwright-2026).

## CI integration

Component tests sit alongside e2e tests in CI. Add a job that runs the CT suite separately to keep failure attribution clean.

\`\`\`yaml
- name: Component tests
  run: pnpm test-ct
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: ct-traces
    path: test-results
\`\`\`

For full CI scaffolding, see [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026).

## Conclusion and next steps

Playwright Component Testing brings real browsers, real events, and real traces to the component layer. Use it for design system components, complex form widgets, and interactive UI logic; reserve end-to-end tests for whole-page flows and authentication boundaries.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate CT specs that follow these patterns. For Vue, read [Playwright Component Testing Vue Complete Guide](/blog/playwright-component-testing-vue-complete-guide). For Svelte, [Playwright Component Testing Svelte Guide](/blog/playwright-component-testing-svelte-guide).
`,
};
