import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for Svelte: Complete 2026 Guide',
  description:
    'Test Svelte and SvelteKit components with Playwright Component Testing in real browsers. Mount, props, stores, fixtures, and visual snapshots in TypeScript.',
  date: '2026-05-09',
  category: 'Guide',
  content: `
# Playwright Component Testing for Svelte: Complete 2026 Guide

Svelte's compiler produces tight, fast components that often need lightweight test setup. Vitest in jsdom handles most unit needs, but for the components that touch real DOM events, browser APIs, or visual styling, Playwright Component Testing is the right tool. It mounts your Svelte component in a real browser, exercises it with the same locators as your end-to-end suite, and captures full UI Mode traces for debugging.

This guide covers Svelte 4 and Svelte 5 (with runes). Examples use TypeScript and Playwright 1.49+.

For React patterns, see [Playwright Component Testing for React](/blog/playwright-component-testing-react-guide-2026). For Vue, [Playwright Component Testing Vue Complete Guide](/blog/playwright-component-testing-vue-complete-guide). The [playwright-e2e skill](/skills/playwright-e2e) automates these patterns in AI-generated tests.

## Installation

\`\`\`bash
pnpm create playwright --ct
# select Svelte when prompted
\`\`\`

Scaffolded files:

| File | Purpose |
|---|---|
| \`playwright-ct.config.ts\` | CT-specific config |
| \`playwright/index.html\` | Vite shell |
| \`playwright/index.ts\` | Optional global providers |
| \`tests/component/example.spec.ts\` | Starter spec |

## The CT config

\`\`\`typescript
import { defineConfig, devices } from '@playwright/experimental-ct-svelte';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  testDir: './tests/component',
  fullyParallel: true,
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      plugins: [svelte()],
      resolve: {
        alias: {
          $lib: resolve(__dirname, './src/lib'),
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

The plugin registration is required because the CT adapter does not auto-detect Svelte plugins from your real Vite config.

## Your first Svelte component test

\`\`\`svelte
<!-- src/lib/Counter.svelte -->
<script lang="ts">
  export let initial = 0;
  let count = initial;
  function increment() {
    count += 1;
  }
</script>

<div>
  <p>Count: {count}</p>
  <button on:click={increment} aria-label="Increment">+</button>
</div>
\`\`\`

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-svelte';
import Counter from '../../src/lib/Counter.svelte';

test('renders initial value', async ({ mount }) => {
  const component = await mount(Counter, { props: { initial: 5 } });
  await expect(component.getByText('Count: 5')).toBeVisible();
});

test('increments on click', async ({ mount }) => {
  const component = await mount(Counter);
  await component.getByRole('button', { name: 'Increment' }).click();
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(component.getByText('Count: 2')).toBeVisible();
});
\`\`\`

## Svelte 5 runes

For Svelte 5 components using \`$state\` and \`$props\`, the API is identical at the test level. The compiler handles the rune translation.

\`\`\`svelte
<!-- src/lib/CounterRunes.svelte (Svelte 5) -->
<script lang="ts">
  let { initial = 0 } = $props();
  let count = $state(initial);
</script>

<button onclick={() => count++} aria-label="Increment">+</button>
<p>Count: {count}</p>
\`\`\`

Tests do not change; you mount and assert exactly as before.

## Event handling

Svelte's custom events bubble to the host. Capture them via the \`on\` option.

\`\`\`svelte
<!-- src/lib/RangeInput.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let value = 0;
  const dispatch = createEventDispatcher<{ change: { value: number } }>();
  function handle(e: Event) {
    const next = Number((e.target as HTMLInputElement).value);
    value = next;
    dispatch('change', { value: next });
  }
</script>

<input type="range" min="0" max="100" {value} on:input={handle} aria-label="Range" />
\`\`\`

\`\`\`typescript
test('dispatches change event', async ({ mount }) => {
  const events: number[] = [];
  const component = await mount(RangeInput, {
    on: {
      change: (e: CustomEvent<{ value: number }>) => events.push(e.detail.value),
    },
  });
  await component.getByLabel('Range').fill('42');
  expect(events).toEqual([42]);
});
\`\`\`

## Slots

Slots accept render functions or strings.

\`\`\`svelte
<!-- src/lib/Modal.svelte -->
<script lang="ts">
  export let open = false;
</script>

{#if open}
  <div role="dialog" aria-modal="true">
    <slot name="title" />
    <slot />
    <slot name="footer" />
  </div>
{/if}
\`\`\`

\`\`\`typescript
test('renders slot content', async ({ mount }) => {
  const component = await mount(Modal, {
    props: { open: true },
    slots: {
      title: '<h2>Confirm</h2>',
      default: '<p>Are you sure?</p>',
      footer: '<button aria-label="Close">Cancel</button>',
    },
  });
  await expect(component.getByRole('heading', { name: 'Confirm' })).toBeVisible();
  await expect(component.getByText('Are you sure?')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Close' })).toBeVisible();
});
\`\`\`

## Stores

Svelte stores are subscribed-to at the component level. Provide a value via context or mount.

\`\`\`typescript
import { writable } from 'svelte/store';

test('renders user from context store', async ({ mount }) => {
  const user = writable({ name: 'Asha Patel', role: 'admin' });
  const component = await mount(UserBadge, {
    hooksConfig: { user },
  });
  await expect(component.getByText('Asha Patel')).toBeVisible();
});
\`\`\`

Wire context in \`playwright/index.ts\`:

\`\`\`typescript
import { beforeMount } from '@playwright/experimental-ct-svelte/hooks';

export type HooksConfig = {
  user?: import('svelte/store').Writable<{ name: string; role: string }>;
};

beforeMount<HooksConfig>(async ({ App, hooksConfig }) => {
  if (hooksConfig?.user) {
    // Pass via setContext or wrap App in a provider component
  }
  return App;
});
\`\`\`

## Mocking network

Same \`page.route\` API as everywhere else in Playwright.

\`\`\`typescript
test('user list renders mocked users', async ({ mount, page }) => {
  await page.route('**/api/users', (route) =>
    route.fulfill({
      json: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Grace' },
      ],
    })
  );

  const component = await mount(UserList);
  await expect(component.getByRole('listitem')).toHaveCount(2);
});
\`\`\`

## Fixtures

Add typed fixtures for shared setup.

\`\`\`typescript
import { test as base, expect } from '@playwright/experimental-ct-svelte';

type Fixtures = {
  adminUser: { name: string; role: 'admin' };
};

export const test = base.extend<Fixtures>({
  adminUser: async ({}, use) => {
    await use({ name: 'Admin Alex', role: 'admin' });
  },
});

export { expect };
\`\`\`

## Visual snapshots

\`\`\`typescript
test('counter visual baseline', async ({ mount }) => {
  const component = await mount(Counter, { props: { initial: 42 } });
  await expect(component).toHaveScreenshot('counter-42.png');
});
\`\`\`

See [Playwright Visual Comparison Snapshots Guide](/blog/playwright-visual-comparison-snapshots-guide) for full snapshot configuration.

## Forms and input

\`\`\`svelte
<script lang="ts">
  let email = '';
</script>

<form>
  <label>
    Email
    <input bind:value={email} aria-describedby="email-help" />
  </label>
  <p id="email-help">We never share your email.</p>
  <p>You typed: {email}</p>
</form>
\`\`\`

\`\`\`typescript
test('echoes typed email', async ({ mount }) => {
  const component = await mount(EmailForm);
  await component.getByLabel('Email').fill('asha@example.com');
  await expect(component.getByText('You typed: asha@example.com')).toBeVisible();
});
\`\`\`

## SvelteKit considerations

Component tests run components, not full SvelteKit pages. For pages with \`+page.server.ts\` data loading, you must mock the load function or pass props directly.

\`\`\`typescript
test('page renders with mocked data', async ({ mount }) => {
  const component = await mount(PageContent, {
    props: {
      data: { items: [{ id: 1, name: 'Item' }] },
    },
  });
  await expect(component.getByRole('listitem')).toHaveCount(1);
});
\`\`\`

For full-page SvelteKit tests with routing, use end-to-end tests instead.

## Migrating from @testing-library/svelte

| Testing Library | Playwright CT |
|---|---|
| \`render(Component, { props })\` | \`mount(Component, { props })\` |
| \`screen.getByRole(...)\` | \`component.getByRole(...)\` |
| \`fireEvent.click(button)\` | \`component.getByRole('button').click()\` |
| \`waitFor(() => ...)\` | \`expect(locator).toBeVisible()\` |
| \`act()\` | Not needed |

## Common pitfalls

**Pitfall 1: \`tick()\` confusion.** Svelte's micro-task scheduler updates the DOM after \`tick()\`. Playwright's auto-waiting locators handle this, so you rarely need \`tick\` directly.

**Pitfall 2: SSR-only components.** Components designed for server-side rendering may rely on \`onMount\` to populate state. They mount blank in CT until the lifecycle fires.

**Pitfall 3: Two-way binding tests.** \`bind:value\` updates synchronously but assertions still need auto-waiting.

**Pitfall 4: Transitions and animations.** Svelte's built-in transitions can produce diff churn. Disable with \`use: { reducedMotion: 'reduce' }\`.

**Pitfall 5: Component import paths.** Svelte components must be imported with the \`.svelte\` extension; TypeScript types are inferred.

## Anti-patterns

- Mounting full pages instead of components. Use e2e tests for pages.
- Asserting on internal state. Test what the user sees.
- Skipping the picker. UI Mode regenerates correct locators in two clicks.
- Mixing CT and SvelteKit's own \`vitest\` tests in one file. Keep them separate.

## CI integration

Add to your CI pipeline alongside e2e tests:

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

Playwright Component Testing for Svelte brings real browsers to your component layer with minimal setup. Use it for design system components, complex widgets, and visual regression. Pair with end-to-end tests for full-page flows.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate Svelte CT tests that follow these patterns. For React, see [Playwright Component Testing for React](/blog/playwright-component-testing-react-guide-2026); for Vue, [Playwright Component Testing Vue Complete Guide](/blog/playwright-component-testing-vue-complete-guide).
`,
};
