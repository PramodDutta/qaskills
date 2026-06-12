---
name: Vue Testing Utils
description: Test Vue 3 components with Vue Test Utils and Vitest — mount vs shallowMount, finding and triggering DOM, asserting props and emitted events, awaiting async updates, and mocking Pinia stores and Vue Router.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [vue, vue-test-utils, component-testing, vitest, pinia, vue-router, jsdom, unit-testing, emits]
testingTypes: [unit, integration]
frameworks: [vue-test-utils, vitest, vue]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Vue Testing Utils

This skill makes an AI agent write Vue 3 component tests with `@vue/test-utils` on Vitest: mounting with props and slots, querying via `data-testid`, triggering events and awaiting the render queue, asserting `emitted()` payloads, and wiring `createTestingPinia` and mocked routers through `global.plugins`. Trigger it on any Vue 3 + Vite project where components need unit or integration tests.

## Core Principles

1. **Default to `mount`, reach for `shallowMount` rarely.** Stubbing all children tests a skeleton, not the component. Shallow-render only when a child is genuinely heavy (charts, maps) — and stub that one child explicitly instead.
2. **Test the rendered contract: props in, DOM and emitted events out.** Never reach into `wrapper.vm` internals or assert on `ref` values; those tests survive refactors only by accident.
3. **`await` every interaction.** Vue batches DOM updates; `trigger`, `setValue`, and `setProps` all return promises that resolve after the next tick. A missing `await` asserts against the stale DOM.
4. **Use `data-testid` or roles, not class selectors.** Tailwind/scoped-CSS classes change with styling work; test IDs change only when behavior does.
5. **Emitted events are the component's API — assert names and payloads.** `wrapper.emitted('save')` returns the calls array; check both that it fired and what it carried.
6. **Real Pinia logic, fake server.** With `createTestingPinia({ stubActions: false })` plus mocked HTTP you test store-component integration honestly; stubbed actions are for pure-render tests only.

## Setup

```bash
npm install --save-dev @vue/test-utils vitest jsdom @pinia/testing @vitejs/plugin-vue
```

```typescript
// vitest.config.ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
```

A component worth testing:

```vue
<!-- src/components/QuantityPicker.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ modelValue: number; max?: number }>(), { max: 10 });
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const atMax = computed(() => props.modelValue >= props.max);

function increment(): void {
  if (!atMax.value) emit('update:modelValue', props.modelValue + 1);
}
</script>

<template>
  <div>
    <span data-testid="qty">{{ modelValue }}</span>
    <button data-testid="inc" :disabled="atMax" @click="increment">+</button>
  </div>
</template>
```

The test:

```typescript
// src/components/QuantityPicker.test.ts
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import QuantityPicker from './QuantityPicker.vue';

describe('QuantityPicker', () => {
  it('emits update:modelValue with the incremented quantity', async () => {
    const wrapper = mount(QuantityPicker, { props: { modelValue: 2 } });

    await wrapper.find('[data-testid="inc"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[3]]);
  });

  it('disables the button at max and emits nothing on click', async () => {
    const wrapper = mount(QuantityPicker, { props: { modelValue: 5, max: 5 } });
    const button = wrapper.find('[data-testid="inc"]');

    expect(button.attributes('disabled')).toBeDefined();
    await button.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('re-renders when the parent updates the prop', async () => {
    const wrapper = mount(QuantityPicker, { props: { modelValue: 1 } });
    await wrapper.setProps({ modelValue: 7 });
    expect(wrapper.get('[data-testid="qty"]').text()).toBe('7');
  });
});
```

## Patterns

### Forms with setValue and v-model

```typescript
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import LoginForm from './LoginForm.vue';

it('submits trimmed credentials as the submit event payload', async () => {
  const wrapper = mount(LoginForm);

  await wrapper.get('[data-testid="email"]').setValue('  mira@example.com ');
  await wrapper.get('[data-testid="password"]').setValue('hunter2hunter2');
  await wrapper.get('form').trigger('submit.prevent');

  expect(wrapper.emitted('submit')).toEqual([
    [{ email: 'mira@example.com', password: 'hunter2hunter2' }],
  ]);
});
```

### Async Components: flushPromises after Mocked Fetch

```typescript
import { flushPromises, mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import SkillList from './SkillList.vue';
import * as api from '../api/skills';

it('renders fetched skills after the loading state', async () => {
  vi.spyOn(api, 'fetchSkills').mockResolvedValue([
    { slug: 'vitest-testing', name: 'Vitest' },
    { slug: 'msw-mocking', name: 'MSW' },
  ]);

  const wrapper = mount(SkillList);
  expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true);

  await flushPromises(); // resolves the fetch AND the subsequent render

  expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false);
  expect(wrapper.findAll('[data-testid="skill-row"]')).toHaveLength(2);
  expect(wrapper.text()).toContain('Vitest');
});
```

### Pinia Stores with createTestingPinia

```typescript
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import CartBadge from './CartBadge.vue';
import { useCartStore } from '../stores/cart';

it('shows the item count from the store and calls clear on click', async () => {
  const wrapper = mount(CartBadge, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: { cart: { items: [{ sku: 'A1' }, { sku: 'B2' }] } },
        }),
      ],
    },
  });
  const store = useCartStore(); // the same instance the component uses

  expect(wrapper.get('[data-testid="count"]').text()).toBe('2');

  await wrapper.get('[data-testid="clear"]').trigger('click');
  expect(store.clear).toHaveBeenCalledOnce(); // actions auto-stubbed as spies
});
```

### Router: Mock It, Do Not Mount It

```typescript
import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import SkillCard from './SkillCard.vue';

it('navigates to the skill detail page on card click', async () => {
  const push = vi.fn();
  const wrapper = mount(SkillCard, {
    props: { slug: 'supertest-api', name: 'SuperTest' },
    global: {
      mocks: { $router: { push } },
      stubs: { RouterLink: { template: '<a><slot /></a>' } },
    },
  });

  await wrapper.get('[data-testid="card"]').trigger('click');

  expect(push).toHaveBeenCalledWith({ name: 'skill-detail', params: { slug: 'supertest-api' } });
});
```

### Slots and Scoped Slots

```typescript
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import DataTable from './DataTable.vue';

it('renders the scoped row slot with each item', () => {
  const wrapper = mount(DataTable, {
    props: { items: [{ id: 1, name: 'alpha' }] },
    slots: {
      row: `<template #row="{ item }"><td data-testid="cell">{{ item.name }}</td></template>`,
    },
  });

  expect(wrapper.get('[data-testid="cell"]').text()).toBe('alpha');
});
```

## Best Practices

- Use `wrapper.get()` when the element must exist (throws with a clear message); `wrapper.find()` + `.exists()` only for asserting absence.
- Share mount defaults via a factory: `const factory = (props = {}) => mount(Comp, { props: { ...defaults, ...props } })` — not via a mutable module-level wrapper.
- Assert `emitted()` payload equality on the whole calls array (`toEqual([[3]])`) to catch double-fires for free.
- For components using `<Teleport>`, target the teleport destination with `document.querySelector` or stub teleport with `global.stubs: { teleport: true }`.
- Test accessibility-relevant output: `attributes('aria-expanded')`, `attributes('disabled')` — these are behavior, not styling.
- Keep one component per test file mounted fresh per test; `restoreMocks: true` plus fresh mounts eliminates 90% of cross-test pollution.

## Anti-Patterns

- **`wrapper.vm.someRef = 5` to set state.** Mutating internals bypasses the component contract; drive state through props, interactions, or store initial state.
- **Missing `await` on `trigger`/`setValue`/`setProps`.** The assertion sees the previous DOM and passes or fails for the wrong reason.
- **`shallowMount` as the default everywhere.** Stub names in snapshots (`<child-component-stub>`) verify nothing about integration.
- **Mounting the full real router and `await router.isReady()` for a unit test.** Mock `$router.push` instead; real-router tests belong in a small dedicated navigation suite.
- **Asserting CSS classes as behavior** (`expect(wrapper.classes()).toContain('text-red-500')`). Assert the state that drives the class (`aria-invalid`, emitted validation event) instead.
- **One `beforeEach` that mounts with a kitchen-sink global config** for every test in the file — slot, store, and router config should appear in the tests that need them.

## When to Trigger This Skill

- A Vue 3 project needs component tests, or `@vue/test-utils` is in `devDependencies`.
- The user asks how to test props, emits, v-model, slots, or async data fetching in a Vue component.
- Tests are flaky from missing `await`/`flushPromises` or pollute each other through shared wrappers.
- Components depend on Pinia or Vue Router and the user needs them mocked or stubbed in tests.
- Migrating Vue 2 (`createLocalVue`, `propsData`) tests to the Vue 3 `global`/`props` API.
