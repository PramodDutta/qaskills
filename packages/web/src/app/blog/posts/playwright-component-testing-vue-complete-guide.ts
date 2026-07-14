import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for Vue: Complete 2026 Guide',
  description:
    'Test Vue 3 components in real browsers with Playwright Component Testing. Setup, mounting with stores, router, fixtures, and visual snapshots in TypeScript.',
  date: '2026-05-08',
  category: 'Guide',
  content: `
# Playwright Component Testing for Vue: Complete 2026 Guide

Playwright Component Testing brings real browsers to Vue 3 component tests. Where Vitest plus \`@vue/test-utils\` runs your components in jsdom (fast but synthetic), Playwright mounts them in Chromium, Firefox, or WebKit and exercises them with the same locators, traces, and UI Mode that drive your end-to-end suite. Same runner, same configuration, same CI; richer signal at the component layer.

This guide is a complete walkthrough for Vue 3 with the Composition API and the \`<script setup>\` syntax. Examples assume TypeScript and Playwright 1.49+. You will learn setup, mounting patterns, stores (Pinia), router integration, network mocking, fixtures, and visual snapshots.

For React patterns, see [Playwright Component Testing for React](/blog/playwright-component-testing-react-guide-2026). For Svelte, [Playwright Component Testing Svelte Guide](/blog/playwright-component-testing-svelte-guide). Install the [playwright-e2e skill](/skills/playwright-e2e) for AI-generated tests that follow these patterns.

## Installation

\`\`\`bash
pnpm create playwright --ct
# choose Vue 3 when prompted
\`\`\`

The installer scaffolds:

| File | Purpose |
|---|---|
| \`playwright-ct.config.ts\` | CT-specific config |
| \`playwright/index.html\` | Vite shell |
| \`playwright/index.ts\` | Global providers (Pinia, router, i18n) |
| \`tests/component/example.spec.ts\` | Starter spec |

## The CT config

\`\`\`typescript
import { defineConfig, devices } from '@playwright/experimental-ct-vue';
import { resolve } from 'path';

export default defineConfig({
  testDir: './tests/component',
  snapshotDir: './__snapshots__',
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
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

The \`ctViteConfig\` forwards your real Vite config: aliases, PostCSS plugins, and global imports.

## Your first component test

\`\`\`vue
<!-- src/components/Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ initial?: number }>();
const count = ref(props.initial ?? 0);
const increment = () => count.value++;
</script>

<template>
  <div>
    <p :id="'counter-value'">Count: {{ count }}</p>
    <button @click="increment" aria-label="Increment">+</button>
  </div>
</template>
\`\`\`

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-vue';
import Counter from '../../src/components/Counter.vue';

test('counter renders initial value', async ({ mount }) => {
  const component = await mount(Counter, { props: { initial: 5 } });
  await expect(component.getByText('Count: 5')).toBeVisible();
});

test('counter increments on click', async ({ mount }) => {
  const component = await mount(Counter, { props: { initial: 0 } });
  await component.getByRole('button', { name: 'Increment' }).click();
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(component.getByText('Count: 2')).toBeVisible();
});
\`\`\`

\`mount\` accepts \`props\`, \`slots\`, \`emit\` handlers, and \`hooksConfig\` for global setup.

## Mounting with Pinia

Most Vue 3 apps use Pinia for state. Configure the store globally in \`playwright/index.ts\`.

\`\`\`typescript
import { beforeMount } from '@playwright/experimental-ct-vue/hooks';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';

export type HooksConfig = {
  initialState?: Record<string, any>;
  locale?: 'en' | 'es' | 'fr';
};

beforeMount<HooksConfig>(async ({ app, hooksConfig }) => {
  const pinia = createPinia();
  if (hooksConfig?.initialState) {
    pinia.state.value = hooksConfig.initialState;
  }
  app.use(pinia);

  const i18n = createI18n({
    legacy: false,
    locale: hooksConfig?.locale ?? 'en',
    messages: {
      en: { welcome: 'Welcome' },
      es: { welcome: 'Bienvenido' },
      fr: { welcome: 'Bienvenue' },
    },
  });
  app.use(i18n);
});
\`\`\`

Tests pass per-mount state:

\`\`\`typescript
test('cart shows items from Pinia state', async ({ mount }) => {
  const component = await mount(CartList, {
    hooksConfig: {
      initialState: {
        cart: { items: [{ sku: 'KB-001', quantity: 1 }] },
      },
    },
  });
  await expect(component.getByRole('listitem')).toHaveCount(1);
});
\`\`\`

## Router integration

For components that consume \`useRouter\` or \`useRoute\`, install vue-router globally.

\`\`\`typescript
import { createRouter, createMemoryHistory } from 'vue-router';

beforeMount<HooksConfig>(async ({ app, hooksConfig }) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  if (hooksConfig?.route) {
    await router.push(hooksConfig.route);
  }
  app.use(router);
});
\`\`\`

\`createMemoryHistory\` keeps the router silent during component tests (no URL bar manipulation).

## Slots and scoped slots

\`\`\`typescript
import { h } from 'vue';

test('slot content renders', async ({ mount }) => {
  const component = await mount(Modal, {
    slots: {
      default: () => h('p', 'Hello from slot'),
      footer: () => h('button', { 'aria-label': 'Close' }, 'X'),
    },
  });
  await expect(component.getByText('Hello from slot')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Close' })).toBeVisible();
});
\`\`\`

Slots can be plain strings or render functions.

## Emit assertions

When testing emit events, capture them via \`on\` handlers.

\`\`\`typescript
test('emits update event with value', async ({ mount }) => {
  const events: { name: string; payload: any }[] = [];
  const component = await mount(SearchInput, {
    on: {
      'update:modelValue': (value: string) => events.push({ name: 'update', payload: value }),
    },
  });
  await component.getByRole('textbox').fill('keyboard');
  expect(events).toEqual([{ name: 'update', payload: 'keyboard' }]);
});
\`\`\`

## Mocking network

Use \`page.route\` exactly like in browser tests.

\`\`\`typescript
test('user list fetches from API', async ({ mount, page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Grace' },
      ],
    });
  });

  const component = await mount(UserList);
  await expect(component.getByRole('listitem')).toHaveCount(2);
});
\`\`\`

For advanced mocking, see the [Playwright Network Mocking Route Handler Guide](/blog/playwright-network-mocking-route-handler-guide).

## Fixtures

Create typed fixtures the same way as in React/Vanilla CT.

\`\`\`typescript
import { test as base, expect } from '@playwright/experimental-ct-vue';

type Fixtures = {
  authedState: Record<string, any>;
};

export const test = base.extend<Fixtures>({
  authedState: async ({}, use) => {
    await use({
      auth: { user: { id: 1, email: 'asha@example.com', role: 'admin' } },
    });
  },
});

export { expect };
\`\`\`

\`\`\`typescript
test('admin sees admin panel', async ({ mount, authedState }) => {
  const component = await mount(AdminPanel, {
    hooksConfig: { initialState: authedState },
  });
  await expect(component.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
});
\`\`\`

## Visual snapshots

\`\`\`typescript
test('counter matches baseline', async ({ mount }) => {
  const component = await mount(Counter, { props: { initial: 42 } });
  await expect(component).toHaveScreenshot('counter-42.png');
});
\`\`\`

The first run writes \`counter-42-chromium-darwin.png\` (or platform variant). Subsequent runs diff against it. See [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide).

## Composition API testing

For composables, you can test them in isolation by mounting a thin wrapper.

\`\`\`vue
<!-- tests/component/__helpers__/useDarkModeHarness.vue -->
<script setup lang="ts">
import { useDarkMode } from '../../../src/composables/useDarkMode';
const { isDark, toggle } = useDarkMode();
defineExpose({ isDark, toggle });
</script>

<template>
  <div>{{ isDark ? 'dark' : 'light' }}</div>
  <button @click="toggle" aria-label="toggle">toggle</button>
</template>
\`\`\`

\`\`\`typescript
test('useDarkMode toggles', async ({ mount }) => {
  const component = await mount(Harness);
  await expect(component.getByText('light')).toBeVisible();
  await component.getByRole('button', { name: 'toggle' }).click();
  await expect(component.getByText('dark')).toBeVisible();
});
\`\`\`

## Provide/inject

\`\`\`typescript
import { ref, provide } from 'vue';

test('inherits theme via inject', async ({ mount }) => {
  const component = await mount({
    components: { ThemedButton },
    setup() {
      provide('theme', ref('dark'));
    },
    template: '<ThemedButton label="OK" />',
  });
  await expect(component.getByRole('button', { name: 'OK' })).toHaveCSS('background-color', 'rgb(15, 23, 42)');
});
\`\`\`

## Migrating from Vue Test Utils

| Vue Test Utils | Playwright CT |
|---|---|
| \`mount(Comp, { props })\` | \`mount(Comp, { props })\` |
| \`wrapper.find('button').trigger('click')\` | \`component.getByRole('button').click()\` |
| \`wrapper.text()\` | \`component.textContent()\` (or \`toContainText\`) |
| \`wrapper.emitted('event')\` | Capture via \`on\` handlers |
| \`wrapper.setProps({ x: 2 })\` | \`mount\` again or use \`update\` |
| \`flushPromises()\` | \`expect(locator).toBeVisible()\` |

The mental shift: stop introspecting the wrapper, start asserting on what the user sees.

## Common pitfalls

**Pitfall 1: Forgetting global providers.** A component that uses \`useStore\` or \`useRouter\` throws on mount without setup. Wire them in \`playwright/index.ts\`.

**Pitfall 2: Mutating store state in tests.** Pinia state persists across mounts unless reset. Use \`hooksConfig.initialState\` per test.

**Pitfall 3: Async props.** Props that resolve via async setup may not appear in the first render. Assert with \`toBeVisible\` to leverage auto-retry.

**Pitfall 4: Top-level \`<script setup>\` await.** Components with top-level \`await\` must be wrapped in \`<Suspense>\` to mount.

**Pitfall 5: Strict mode locator violations.** If your component renders the same role twice, scope with parent locators.

## Anti-patterns

- Mounting components that depend on the full application shell. Use end-to-end tests for those.
- Asserting on internal refs. Test what the user sees.
- Skipping the picker. Use UI Mode to verify your locators against real renders.
- Sharing one global Pinia instance across tests. Reset per mount.

## CI integration

Add CT tests alongside e2e tests in CI for proper attribution.

\`\`\`yaml
- name: Component tests
  run: pnpm test-ct
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: ct-traces
    path: test-results
\`\`\`

For full CI patterns, see [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026).

## Conclusion and next steps

Playwright Component Testing for Vue gives you real browsers, real events, and real traces at the component layer. Use it for design system components and complex widgets; reserve end-to-end tests for whole-page flows.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate Vue CT tests that follow these patterns. For React parity, see the [Playwright Component Testing for React](/blog/playwright-component-testing-react-guide-2026).
`,
};
