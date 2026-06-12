---
name: "Vue Test Utils Testing"
description: "Vue.js component testing using Vue Test Utils with mount/shallow mount, event simulation, Vuex/Pinia store testing, and composition API testing."
version: 1.0.0
author: qaskills
license: MIT
tags: [vue, test-utils, component, pinia, vuex]
testingTypes: [unit, integration]
frameworks: [vue]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Vue Test Utils Testing

This skill makes the agent write Vue 3 component tests with Vue Test Utils (VTU) + Vitest that assert on rendered output and user-observable behavior, not implementation internals. Trigger it whenever you see `.vue` SFCs, `@vue/test-utils`, `mount`/`shallowMount`, Pinia/Vuex stores under test, or a Vitest config in a Vue project.

## Core Principles

1. **Prefer `mount` over `shallowMount`.** Full `mount` renders children so you test real behavior. Reach for `shallowMount` only to isolate a component from an expensive/irrelevant child — and know that stubbing children hides integration bugs.
2. **Query by accessible roles and `data-testid`, not by CSS classes.** Classes are styling and churn constantly; `find('[data-testid="submit"]')` and `getByRole` survive refactors and assert what users actually see.
3. **`await` every state change.** Vue's DOM updates are asynchronous. After `trigger`, `setValue`, `setProps`, or a store mutation you must `await wrapper.vm.$nextTick()` (or `await trigger(...)`, which returns nextTick) before asserting, or you assert against stale DOM.
4. **Test the component's contract: props in, events/DOM out.** Assert emitted events with `wrapper.emitted()`, assert rendered text/attributes, and pass props. Do not assert on private `data`/refs or call internal methods.
5. **Use a real Pinia instance with `createTestingPinia`, not hand-mocked stores.** It gives you real getters, auto-spied actions, and `initialState` — far more faithful than stubbing the store object.
6. **Stub the network, render the component.** Mock `fetch`/axios at the module boundary with `vi.mock`; never let component tests hit a live API.

## Setup

```bash
npm install -D vitest @vue/test-utils@2 @vitest/coverage-v8 jsdom \
  @pinia/testing pinia
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true, // describe/it/expect without imports
    setupFiles: ['./tests/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

```ts
// tests/setup.ts
import { config } from '@vue/test-utils';
// Global stubs/plugins for every test, e.g. stub <RouterLink>
config.global.stubs = { RouterLink: { template: '<a><slot /></a>' } };
```

## Patterns / Workflow

### 1. Render and assert on output

```ts
// Counter.vue exposes a button that increments a label
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Counter from '@/components/Counter.vue';

describe('Counter', () => {
  it('renders the initial count from a prop', () => {
    const wrapper = mount(Counter, { props: { start: 3 } });
    expect(wrapper.get('[data-testid="count"]').text()).toBe('3');
  });

  it('increments when the button is clicked', async () => {
    const wrapper = mount(Counter, { props: { start: 0 } });
    await wrapper.get('[data-testid="increment"]').trigger('click');
    expect(wrapper.get('[data-testid="count"]').text()).toBe('1');
  });
});
```

### 2. Form input, v-model, and emitted events

```ts
import { mount } from '@vue/test-utils';
import SearchBox from '@/components/SearchBox.vue';

it('emits "search" with the trimmed query on submit', async () => {
  const wrapper = mount(SearchBox);

  await wrapper.get('input[type="search"]').setValue('  vue testing  ');
  await wrapper.get('form').trigger('submit.prevent');

  // emitted() returns arrays of arrays: one entry per emission
  const events = wrapper.emitted('search');
  expect(events).toHaveLength(1);
  expect(events![0]).toEqual(['vue testing']);
});

it('disables the button while the query is empty', async () => {
  const wrapper = mount(SearchBox);
  const button = wrapper.get('button[type="submit"]');
  expect(button.attributes('disabled')).toBeDefined();

  await wrapper.get('input[type="search"]').setValue('x');
  expect(button.attributes('disabled')).toBeUndefined();
});
```

### 3. Props, slots, and conditional rendering

```ts
import { mount } from '@vue/test-utils';
import Alert from '@/components/Alert.vue';

it('renders the danger variant and the default slot', () => {
  const wrapper = mount(Alert, {
    props: { variant: 'danger' },
    slots: { default: 'Something broke' },
  });
  expect(wrapper.classes()).toContain('alert--danger');
  expect(wrapper.text()).toContain('Something broke');
});

it('reacts to a prop change', async () => {
  const wrapper = mount(Alert, { props: { variant: 'info' } });
  await wrapper.setProps({ variant: 'danger' });
  expect(wrapper.classes()).toContain('alert--danger');
});

it('hides itself when "open" is false', () => {
  const wrapper = mount(Alert, { props: { open: false } });
  expect(wrapper.find('[data-testid="alert"]').exists()).toBe(false);
});
```

### 4. Testing a component backed by Pinia

```ts
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';
import CartSummary from '@/components/CartSummary.vue';
import { useCartStore } from '@/stores/cart';

it('shows the item count from the store and dispatches checkout', async () => {
  const wrapper = mount(CartSummary, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn, // actions are auto-stubbed + spied
          initialState: { cart: { items: [{ id: 1 }, { id: 2 }] } },
        }),
      ],
    },
  });

  expect(wrapper.get('[data-testid="count"]').text()).toBe('2');

  const store = useCartStore();
  await wrapper.get('[data-testid="checkout"]').trigger('click');
  expect(store.checkout).toHaveBeenCalledOnce();
});

it('updates the DOM when a getter-backed value changes', async () => {
  const wrapper = mount(CartSummary, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
  });
  const store = useCartStore();
  store.items.push({ id: 9 }); // mutate real state
  await wrapper.vm.$nextTick();
  expect(wrapper.get('[data-testid="count"]').text()).toBe('1');
});
```

### 5. Async component with a mocked fetch

```ts
import { mount, flushPromises } from '@vue/test-utils';
import { vi, beforeEach } from 'vitest';
import UserCard from '@/components/UserCard.vue';

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: 1, name: 'Ada Lovelace' }),
  } as Response);
});

it('renders a loading state then the fetched user', async () => {
  const wrapper = mount(UserCard, { props: { userId: 1 } });
  expect(wrapper.text()).toContain('Loading');

  await flushPromises(); // resolve fetch + re-render
  expect(wrapper.text()).toContain('Ada Lovelace');
  expect(fetch).toHaveBeenCalledWith('/api/users/1');
});

it('shows an error message when the request fails', async () => {
  (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });
  const wrapper = mount(UserCard, { props: { userId: 1 } });
  await flushPromises();
  expect(wrapper.get('[data-testid="error"]').text()).toMatch(/failed/i);
});
```

### 6. Testing a composable in isolation

Composables that use lifecycle hooks (`onMounted`) need a host component; pure ones can be called directly.

```ts
import { withSetup } from './withSetup'; // tiny mount helper
import { useCounter } from '@/composables/useCounter';

it('increments and exposes a reactive count', async () => {
  const [result, app] = withSetup(() => useCounter(5));
  expect(result.count.value).toBe(5);
  result.increment();
  expect(result.count.value).toBe(6);
  app.unmount();
});
```

```ts
// tests/withSetup.ts — runs a composable inside a real app instance
import { createApp } from 'vue';

export function withSetup<T>(composable: () => T): [T, ReturnType<typeof createApp>] {
  let result!: T;
  const app = createApp({ setup() { result = composable(); return () => {}; } });
  app.mount(document.createElement('div'));
  return [result, app];
}
```

## Best Practices

- **Add `data-testid` to elements you assert on.** It decouples tests from markup/classes and makes intent explicit.
- **Use `wrapper.get()` when an element must exist** (it throws a clear error if missing) and `wrapper.find().exists()` when checking for absence.
- **Prefer `findComponent(ChildStub)` with a `name`/`ref`** over CSS selectors when asserting child props: `wrapper.findComponent(ProductCard).props('price')`.
- **Reset mocks between tests** with `vi.clearAllMocks()` in `afterEach` (or `clearMocks: true` in config) so spy call counts don't leak.
- **Use `createTestingPinia({ stubActions: false })`** when you need actions to actually run (e.g. testing a store-driven flow end to end).
- **Test the rendered text/role a user would perceive**, then layer in emitted-event assertions for the parent contract.

## Anti-Patterns

1. **Forgetting `await` after a state change.** `wrapper.trigger('click'); expect(...)` asserts before Vue re-renders and gives flaky, confusing failures. Always `await` the trigger/`$nextTick`/`flushPromises`.
2. **Asserting on internal `wrapper.vm` data or calling private methods.** Tests coupled to implementation break on every refactor. Drive via the DOM and assert via the DOM/emitted events.
3. **Selecting by CSS class.** `find('.btn-primary')` shatters the moment a designer renames a class. Use `data-testid` or roles.
4. **Defaulting to `shallowMount` everywhere.** Stubbing all children means you never test that the pieces actually work together; bugs slip through the seams.
5. **Hand-rolling a fake store object.** It drifts from the real store's getters/actions. Use `createTestingPinia` so getters compute and actions are spied for free.
6. **Letting tests hit a real API or a real router.** Mock `fetch`/axios with `vi.mock` and stub `RouterLink`/`router-view`; otherwise tests are slow, flaky, and network-dependent.

## When to Trigger This Skill

- "Write Vue component tests" / "test this `.vue` component" / "add unit tests for my Vue app"
- Anything mentioning `@vue/test-utils`, `mount`, `shallowMount`, `flushPromises`, `createTestingPinia`
- "Test my Pinia / Vuex store" or "test this composable"
- "My Vue test is flaky / asserts the wrong DOM" (usually a missing `await`)
- Setting up Vitest + jsdom for a Vue 3 project
