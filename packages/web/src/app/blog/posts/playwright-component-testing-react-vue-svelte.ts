import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for React, Vue and Svelte (2026)',
  description:
    'A hands-on 2026 tutorial for Playwright component testing in React, Vue, and Svelte. Setup, config, mounting, props, events, slots, mocking, and CI.',
  date: '2026-07-03',
  category: 'Tutorial',
  content: `
# Playwright Component Testing for React, Vue and Svelte

Playwright is best known for full end-to-end browser tests, but it also ships an experimental component testing runner that mounts a single component in a real browser and lets you drive it with the same powerful locator and assertion API. This tutorial is a complete, framework-by-framework walkthrough covering React, Vue, and Svelte, with runnable code for setup, mounting, props, events, slots, network mocking, and CI.

Component testing sits in the sweet spot between unit tests, which never touch a real DOM, and E2E tests, which boot the whole app. You get real browser rendering and real event handling without the cost and flakiness of a full stack. By the end of this guide you will have a working \`playwright-ct\` configuration and specs for all three frameworks.

## What Component Testing Is

A component test renders one component in isolation inside a real browser, interacts with it, and asserts on the result. Unlike a jsdom-based unit test, the component runs in Chromium, Firefox, or WebKit, so CSS, layout, focus, and real event dispatch all behave exactly as they would for a user. Unlike an E2E test, you do not navigate a running application; you mount the component directly and control its props.

Playwright achieves this by bundling your component with Vite at test time, mounting it into a blank page, and exposing a \`mount\` fixture. Because the runner reuses Playwright's core, every locator, auto-wait, and web-first assertion you know from E2E works unchanged. That shared API is the biggest practical advantage over other component runners.

The feature is explicitly experimental. The mounting contract and package names have shifted between releases, and the team documents that breaking changes can land. It is production-usable today for many teams, but you should pin versions and read the changelog before upgrading. For the broader context of what shipped recently, see [what's new in Playwright 2026](/blog/whats-new-playwright-2026).

## Setup: Installing the Component Test Runner

Start from a project that already uses React, Vue, or Svelte with Vite. The Playwright CT runner relies on your existing Vite configuration to bundle components, so a Vite-based app is the smoothest path.

Scaffold Playwright and add the component testing packages. The base initializer gives you the E2E structure; the CT packages add the framework-specific mount fixtures.

\`\`\`bash
# Scaffold the base Playwright setup
npm init playwright@latest

# Then add the experimental component testing runner for your framework
# React:
npm install --save-dev @playwright/experimental-ct-react
# Vue:
npm install --save-dev @playwright/experimental-ct-vue
# Svelte:
npm install --save-dev @playwright/experimental-ct-svelte
\`\`\`

Each package pulls in the correct Vite plugin for its framework. You only install the one that matches your app. If you maintain a multi-framework monorepo, you can install more than one and point separate config files at each.

## Configuring playwright-ct.config.ts

Component testing uses its own config file, conventionally \`playwright-ct.config.ts\`, so it does not collide with your E2E config. The key difference from an E2E config is the \`ctViteConfig\` block, which lets you inject aliases, plugins, and any Vite settings your components need to compile.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/experimental-ct-react';

export default defineConfig({
  testDir: './src',
  // Component specs live next to components, e.g. Button.spec.tsx
  testMatch: /.*\\.spec\\.(ts|tsx)$/,
  snapshotDir: './__snapshots__',
  timeout: 10_000,
  fullyParallel: true,
  use: {
    trace: 'on-first-retry',
    // ctPort must be free; the runner serves the bundle here
    ctPort: 3100,
    // Inject Vite config so components compile exactly like production
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
  ],
});
\`\`\`

For Vue or Svelte, change the import source to \`@playwright/experimental-ct-vue\` or \`@playwright/experimental-ct-svelte\` respectively, and match \`.spec.ts\` files (Vue and Svelte specs are plain \`.ts\`, not \`.tsx\`). The runner also generates a \`playwright/index.html\` and \`playwright/index.ts\` on first run; those files are where you register global styles or providers that every mounted component should inherit.

## Mounting a React Component

Here is a minimal React component and its test. The component is a counter button that accepts a starting value and an \`onChange\` callback.

\`\`\`tsx
// Counter.tsx
import { useState } from 'react';

export interface CounterProps {
  start?: number;
  onChange?: (value: number) => void;
}

export function Counter({ start = 0, onChange }: CounterProps) {
  const [count, setCount] = useState(start);

  function increment() {
    const next = count + 1;
    setCount(next);
    onChange?.(next);
  }

  return (
    <button aria-label="counter" onClick={increment}>
      Count: {count}
    </button>
  );
}
\`\`\`

The spec imports \`test\` and \`expect\` from the React CT package, then uses the \`mount\` fixture to render the component with props.

\`\`\`tsx
// Counter.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from './Counter';

test('renders the starting value', async ({ mount }) => {
  const component = await mount(<Counter start={5} />);
  await expect(component).toHaveText('Count: 5');
});

test('increments on click', async ({ mount }) => {
  const component = await mount(<Counter start={0} />);
  await component.getByRole('button', { name: 'counter' }).click();
  await expect(component).toHaveText('Count: 1');
});
\`\`\`

The value returned by \`mount\` is a Playwright \`Locator\` scoped to the mounted component, so every locator method and web-first assertion applies. Notice there is no manual waiting: \`toHaveText\` retries until the assertion passes or times out.

## Mounting Vue and Svelte Components

The mounting API is nearly identical across frameworks; only the component syntax and the import source change. Here is the same counter idea in Vue.

\`\`\`vue
<!-- Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ start?: number }>();
const emit = defineEmits<{ (e: 'change', value: number): void }>();

const count = ref(props.start ?? 0);

function increment() {
  count.value += 1;
  emit('change', count.value);
}
</script>

<template>
  <button aria-label="counter" @click="increment">Count: {{ count }}</button>
</template>
\`\`\`

\`\`\`typescript
// Counter.spec.ts (Vue)
import { test, expect } from '@playwright/experimental-ct-vue';
import Counter from './Counter.vue';

test('vue counter increments', async ({ mount }) => {
  const component = await mount(Counter, { props: { start: 3 } });
  await expect(component).toHaveText('Count: 3');
  await component.getByRole('button', { name: 'counter' }).click();
  await expect(component).toHaveText('Count: 4');
});
\`\`\`

Svelte follows the same shape. Props are passed through the same options object.

\`\`\`svelte
<!-- Counter.svelte -->
<script lang="ts">
  export let start = 0;
  let count = start;
  const increment = () => (count += 1);
</script>

<button aria-label="counter" on:click={increment}>Count: {count}</button>
\`\`\`

\`\`\`typescript
// Counter.spec.ts (Svelte)
import { test, expect } from '@playwright/experimental-ct-svelte';
import Counter from './Counter.svelte';

test('svelte counter increments', async ({ mount }) => {
  const component = await mount(Counter, { props: { start: 7 } });
  await expect(component).toHaveText('Count: 7');
  await component.getByRole('button', { name: 'counter' }).click();
  await expect(component).toHaveText('Count: 8');
});
\`\`\`

The consistency is the point: once you learn the pattern in one framework, the other two require almost no new knowledge. That portability is a strong argument for standardizing component tests on Playwright across a polyglot organization.

## Testing Props, Events, and Slots

Props you have already seen. Events and slots are where component testing earns its keep, because they exercise the component's public contract.

For **events**, React passes callbacks as props, so you assert on a spy. Playwright provides a clean way to capture callback invocations without a separate mocking library.

\`\`\`tsx
// events.spec.tsx (React)
import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from './Counter';

test('fires onChange with the new value', async ({ mount }) => {
  const values: number[] = [];
  const component = await mount(
    <Counter start={0} onChange={(v) => values.push(v)} />,
  );
  await component.getByRole('button', { name: 'counter' }).click();
  await component.getByRole('button', { name: 'counter' }).click();
  expect(values).toEqual([1, 2]);
});
\`\`\`

Vue emits events rather than calling prop callbacks, so you pass an \`on\` handler in the mount options:

\`\`\`typescript
// events.spec.ts (Vue)
import { test, expect } from '@playwright/experimental-ct-vue';
import Counter from './Counter.vue';

test('emits change event', async ({ mount }) => {
  const emitted: number[] = [];
  const component = await mount(Counter, {
    props: { start: 0 },
    on: { change: (v: number) => emitted.push(v) },
  });
  await component.getByRole('button', { name: 'counter' }).click();
  expect(emitted).toEqual([1]);
});
\`\`\`

For **slots** (Vue) and **children** (React), you pass content through the mount options so you can verify the component composes correctly:

\`\`\`typescript
// slots.spec.ts (Vue)
import { test, expect } from '@playwright/experimental-ct-vue';
import Card from './Card.vue';

test('renders default slot content', async ({ mount }) => {
  const component = await mount(Card, {
    slots: { default: 'Hello from a slot' },
  });
  await expect(component).toContainText('Hello from a slot');
});
\`\`\`

## Mocking Network with page.route

Components that fetch data need their network mocked so tests stay deterministic and fast. Playwright CT exposes the \`page\` fixture, and \`page.route\` intercepts requests exactly as it does in E2E. Register the route before mounting so the interception is live when the component's effect fires.

\`\`\`tsx
// UserBadge.spec.tsx (React)
import { test, expect } from '@playwright/experimental-ct-react';
import { UserBadge } from './UserBadge';

test('renders the fetched user name', async ({ mount, page }) => {
  await page.route('**/api/user/42', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 42, name: 'Ada Lovelace' }),
    });
  });

  const component = await mount(<UserBadge userId={42} />);
  await expect(component).toContainText('Ada Lovelace');
});

test('shows an error state on 500', async ({ mount, page }) => {
  await page.route('**/api/user/42', (route) =>
    route.fulfill({ status: 500, body: 'boom' }),
  );

  const component = await mount(<UserBadge userId={42} />);
  await expect(component).toContainText('Could not load user');
});
\`\`\`

Because \`page.route\` runs in the real browser, it intercepts \`fetch\`, \`XMLHttpRequest\`, and any client transport the component uses, giving you full control over success, error, and slow-response scenarios. This is the same interception technique used across the broader Playwright suite, covered in depth in the [complete Playwright end-to-end guide](/blog/playwright-e2e-complete-guide).

## Hooks: beforeMount and afterMount

Most real components need providers: a router, a theme, a state store, an i18n context. You register those globally in \`playwright/index.tsx\` using the \`beforeMount\` and \`afterMount\` hooks, so every mounted component inherits them without repetition in each spec.

\`\`\`tsx
// playwright/index.tsx (React)
import { beforeMount, afterMount } from '@playwright/experimental-ct-react/hooks';
import { ThemeProvider } from '../src/theme';

export type HooksConfig = {
  theme?: 'light' | 'dark';
};

beforeMount<HooksConfig>(async ({ App, hooksConfig }) => {
  // Wrap every mounted component in shared providers
  return (
    <ThemeProvider theme={hooksConfig?.theme ?? 'light'}>
      <App />
    </ThemeProvider>
  );
});

afterMount(async () => {
  // Runs after the component is in the DOM; good for global setup logging
  // eslint-disable-next-line no-console
  console.log('component mounted');
});
\`\`\`

A spec then passes \`hooksConfig\` to toggle provider behavior per test, keeping providers centralized while allowing per-test overrides:

\`\`\`tsx
import { test, expect } from '@playwright/experimental-ct-react';
import type { HooksConfig } from '../playwright';
import { ThemedButton } from './ThemedButton';

test('renders in dark theme', async ({ mount }) => {
  const component = await mount<HooksConfig>(<ThemedButton />, {
    hooksConfig: { theme: 'dark' },
  });
  await expect(component).toHaveCSS('background-color', 'rgb(17, 17, 17)');
});
\`\`\`

## Running Component Tests in CI

Component tests run in CI exactly like E2E tests: install dependencies, install the browsers, then invoke the runner with your CT config. Because the runner bundles with Vite, CI needs Node and the browser binaries but not a running dev server.

\`\`\`yaml
# .github/workflows/component-tests.yml
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
      - run: npx playwright install --with-deps chromium firefox
      - run: npx playwright test -c playwright-ct.config.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ct-report
          path: playwright-report/
\`\`\`

The \`--with-deps\` flag installs the OS libraries the browsers need on Ubuntu runners, which is the most common source of CI failures. Uploading the HTML report on \`always()\` means you get a traceable report even when the run fails. Pin the Playwright version in \`package.json\` because, as an experimental feature, the mounting contract can change between releases.

## Component Testing vs E2E: When to Use Which

Component and E2E tests are complementary, not competing. The table below summarizes where each shines so you can allocate effort sensibly.

| Aspect | Component Testing | End-to-End Testing |
|---|---|---|
| Scope | One component in isolation | Full app across pages |
| Speed | Fast (no app boot, no navigation) | Slower (real backend, routing) |
| Real browser | Yes (Chromium/Firefox/WebKit) | Yes |
| Backend needed | No (mock via page.route) | Usually yes |
| Best for | Props, events, slots, edge states | User journeys, integration, auth |
| Flakiness risk | Low | Higher (network, data, timing) |
| Debugging | Isolated, fast feedback | Wider blast radius |
| Maturity | Experimental | Stable |

The practical rule: push logic and edge-case coverage down into component tests where they run fast and stay stable, and reserve E2E for a handful of critical user journeys that prove the pieces integrate. This mirrors the testing-pyramid thinking that keeps suites fast without sacrificing confidence. If you are weighing frameworks more broadly, our [Cypress vs Playwright 2026](/blog/cypress-vs-playwright-2026) comparison covers component testing support on both sides.

## Supported Frameworks and Feature Matrix

Support varies slightly across frameworks. This matrix reflects the experimental runner's capabilities in 2026.

| Framework | Package | Props | Events | Slots/Children | Hooks | Spec Ext |
|---|---|---|---|---|---|---|
| React | experimental-ct-react | Yes | Callback props | children prop | beforeMount/afterMount | .tsx |
| Vue 3 | experimental-ct-vue | Yes | on handlers + emits | slots option | beforeMount/afterMount | .ts |
| Svelte | experimental-ct-svelte | Yes | Component events | slots (limited) | beforeMount/afterMount | .ts |
| Solid | experimental-ct-solid | Yes | Callback props | children | beforeMount/afterMount | .tsx |

All framework packages share the same \`mount\` fixture, the same locator API, and the same assertions, so the learning curve is paid once. Svelte slot support is the most limited of the three primary frameworks, so verify complex slot scenarios against your target Svelte version before relying on them.

## Limitations to Keep in Mind

The runner is experimental, and that word carries weight. The mounting API and package names have changed across releases, so upgrades can break specs; pin versions and read release notes. Because components are bundled with Vite at test time, any Vite plugin or alias your app relies on must be replicated in \`ctViteConfig\`, or the component will fail to compile.

Component tests also cannot catch cross-page integration bugs, real backend contract mismatches, or full authentication flows; those remain the job of E2E. And while \`page.route\` mocking is powerful, over-mocking can let a component pass tests against a network shape that no longer matches the real API, so keep contract tests or a few unmocked E2E paths as a safety net. Used with these limits in mind, Playwright component testing is a fast, high-confidence layer that pairs well with a lean E2E suite. Explore the full library of automation [skills](/skills) to give your agents ready-made testing patterns.

## Frequently Asked Questions

### What is Playwright component testing?

Playwright component testing is an experimental runner that mounts a single UI component in a real browser (Chromium, Firefox, or WebKit) and drives it with Playwright's locator and assertion API. It bundles the component with Vite, renders it into a blank page via a \`mount\` fixture, and lets you test props, events, slots, and network behavior in isolation without booting the whole application.

### Does Playwright component testing support React, Vue, and Svelte?

Yes. Playwright ships dedicated packages: \`@playwright/experimental-ct-react\`, \`@playwright/experimental-ct-vue\`, and \`@playwright/experimental-ct-svelte\`, plus a Solid package. All three share the same \`mount\` fixture, locator API, and assertions, so the pattern you learn in one framework transfers directly to the others. Only the component syntax and the import source differ between them.

### How do I mock network requests in component tests?

Use the \`page\` fixture and \`page.route\` to intercept requests before mounting the component. Register the route with a glob pattern and call \`route.fulfill\` to return a mocked status, headers, and body. Because interception runs in the real browser, it captures \`fetch\` and \`XMLHttpRequest\` alike, letting you deterministically test success, error, and slow-response states.

### What is the difference between component testing and E2E in Playwright?

Component testing renders one component in isolation with mocked network, so it is fast, stable, and ideal for props, events, and edge cases. E2E boots the full application and exercises real user journeys across pages, which is slower and more prone to flakiness but essential for integration and authentication. Use component tests for logic coverage and E2E for a few critical end-to-end flows.

### Is Playwright component testing production-ready in 2026?

It is usable in production for many teams but officially remains experimental. The mounting contract and package names have changed across releases, so you should pin the Playwright version, read release notes before upgrading, and avoid depending on the most fragile features like complex Svelte slots without verifying them against your version. Treat it as a fast, valuable layer alongside a stable E2E suite.

### How do I set up providers like a router or theme for every component?

Register them once in \`playwright/index.tsx\` using the \`beforeMount\` and \`afterMount\` hooks. In \`beforeMount\` you wrap the mounted \`App\` in shared providers such as a theme or router, and you can accept a typed \`hooksConfig\` so individual specs override behavior per test. This centralizes provider setup and keeps each spec focused on the component under test.

### Do I need a running dev server to run component tests in CI?

No. The runner bundles components with Vite at test time, so CI only needs Node, your installed dependencies, and the Playwright browser binaries installed via \`npx playwright install --with-deps\`. You then invoke \`npx playwright test -c playwright-ct.config.ts\`. There is no separate application server to start, which makes component tests simpler to run in CI than full E2E suites.

### Why do my components fail to compile in component tests?

The most common cause is that a Vite plugin or path alias your app depends on is missing from \`ctViteConfig\` in \`playwright-ct.config.ts\`. The CT runner uses its own Vite pipeline, so it does not automatically inherit your app's full Vite config. Replicate the required aliases, plugins, and resolve settings in \`ctViteConfig\`, and the components will compile exactly as they do in your application build.

## Conclusion

Playwright component testing gives React, Vue, and Svelte teams a fast, real-browser layer that covers props, events, slots, and network behavior without the cost of full end-to-end runs. The setup is a single \`playwright-ct.config.ts\`, the mount API is consistent across frameworks, and \`page.route\` plus \`beforeMount\` hooks handle the two hardest parts, network and providers. Keep the experimental caveats in mind, pin your version, and let component tests carry your edge-case coverage while a lean E2E suite proves integration.

Want ready-made testing patterns your AI coding agents can install directly? Explore the full catalog of QA automation [skills](/skills) and equip your agents to write Playwright component and E2E tests from day one.
`,
};
