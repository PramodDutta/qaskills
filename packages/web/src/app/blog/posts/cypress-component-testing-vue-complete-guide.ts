import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Component Testing for Vue: Complete Guide 2026',
  description:
    'Complete guide to Cypress Component Testing for Vue 3 in 2026. Mount, slots, Pinia, Vue Router, fixtures, intercepts, CI patterns, and best practices.',
  date: '2026-05-16',
  category: 'Reference',
  content: `
# Cypress Component Testing for Vue: Complete Guide 2026

Cypress Component Testing supports Vue 3 (Composition API and Options API) with a mount API that closely mirrors \`@vue/test-utils\`. Where \`@vue/test-utils\` plus Vitest gives you fast unit-style tests in jsdom, Cypress Component Testing renders your component in a real browser with real CSS, real fonts, real animations, and a Cypress UI for interactive debugging.

This guide is the complete 2026 reference for Vue 3 teams running, or evaluating, Cypress Component Testing. We cover the mental model, \`cy.mount\` for Vue, Pinia store injection, Vue Router setup, slots and named slots, scoped slots, fixtures, network interception, MSW integration, theming with CSS variables, debugging with the Cypress UI, CI configuration, and the gotchas distilled from running real Vue suites.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## When to use Cypress Component Testing for Vue

Cypress Component Testing for Vue shines when:

1. **Real CSS matters.** Components depending on \`@media\` queries, container queries, or grid layouts behave correctly only in a real browser.
2. **Animations and transitions.** \`<transition>\` and \`<transition-group>\` execute with real timing.
3. **Layout fidelity.** Tooltips, modals, popovers, charts.
4. **Visual regression.** Combined with \`cypress-image-snapshot\` or Percy.

Where Vitest plus \`@vue/test-utils\` is a better fit:

1. **Pure logic composables.** Tens of milliseconds per test.
2. **Large suites.** Vitest parallelizes more aggressively.
3. **Snapshot-heavy workflows.**

Most teams use both.

## Setup

\`\`\`bash
npm install --save-dev cypress @cypress/vue @cypress/vite-dev-server
\`\`\`

\`cypress.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{ts,vue}',
  },
});
\`\`\`

Add a \`cypress/support/component.ts\` file that imports global styles and registers \`cy.mount\`:

\`\`\`typescript
import { mount } from 'cypress/vue';
import '../../src/assets/main.css';

Cypress.Commands.add('mount', mount);

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}
\`\`\`

## Your first component test

\`\`\`typescript
import Button from './Button.vue';

describe('<Button />', () => {
  it('renders the slot and fires click', () => {
    const onClick = cy.stub();
    cy.mount(Button, {
      props: { onClick },
      slots: { default: 'Click me' },
    });
    cy.contains('Click me').click().then(() => {
      expect(onClick).to.have.been.calledOnce;
    });
  });
});
\`\`\`

\`cy.mount(Component, options)\` mirrors the \`@vue/test-utils\` mount signature. \`props\`, \`slots\`, and \`global\` are the most common options.

## Mounting with Pinia

Most real components depend on stores. Pinia integrates cleanly.

\`\`\`typescript
import { createPinia, setActivePinia } from 'pinia';
import { mount } from 'cypress/vue';
import UserCard from './UserCard.vue';
import { useUserStore } from '@/stores/user';

it('shows the current user', () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useUserStore();
  store.setUser({ id: 1, name: 'Alice' });

  cy.mount(UserCard, {
    global: { plugins: [pinia] },
  });
  cy.contains('Alice').should('be.visible');
});
\`\`\`

For a reusable wrapper:

\`\`\`typescript
export const mountWithPinia = (component, options = {}) => {
  const pinia = createPinia();
  return cy.mount(component, {
    ...options,
    global: {
      ...(options.global || {}),
      plugins: [pinia, ...(options.global?.plugins || [])],
    },
  });
};
\`\`\`

## Mounting with Vue Router

\`\`\`typescript
import { createMemoryHistory, createRouter } from 'vue-router';
import { routes } from '@/router';

it('navigates on click', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });
  router.push('/users');

  cy.mount(UserList, {
    global: { plugins: [router] },
  });
  cy.contains('View profile').click();
  cy.location('pathname').should('eq', '/users/1');
});
\`\`\`

## Slots and named slots

The \`slots\` option accepts strings, render functions, or full Vue components.

\`\`\`typescript
cy.mount(Card, {
  slots: {
    default: '<p>Body content</p>',
    header: '<h2>Title</h2>',
    footer: () => h('button', 'Close'),
  },
});
\`\`\`

For scoped slots, pass a render function:

\`\`\`typescript
cy.mount(UserList, {
  props: { users: [{ id: 1, name: 'Alice' }] },
  slots: {
    item: (slotProps) => h('span', \`Hello \${slotProps.user.name}\`),
  },
});
cy.contains('Hello Alice').should('be.visible');
\`\`\`

## Network interception

\`cy.intercept\` works identically to E2E tests. Real network calls hit the interceptor.

\`\`\`typescript
it('loads users from the API', () => {
  cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers');
  cy.mount(UserList);
  cy.wait('@getUsers');
  cy.get('[data-testid=user-row]').should('have.length', 3);
});
\`\`\`

## Composables testing

Composables that wrap reactive state can be tested in isolation with a tiny wrapper component, or directly with \`@vue/test-utils\`'s \`renderComposable\` pattern. For composables that depend on a DOM API (\`useElementBounding\`, \`useResizeObserver\`), Cypress Component Testing produces more accurate results than Vitest plus jsdom.

\`\`\`typescript
import { defineComponent, h } from 'vue';
import { useCounter } from './useCounter';

const HarnessComponent = defineComponent({
  setup() {
    return useCounter(0);
  },
  template: '<button @click="increment">{{ count }}</button>',
});

it('counts up on click', () => {
  cy.mount(HarnessComponent);
  cy.get('button').click().should('contain', '1');
  cy.get('button').click().should('contain', '2');
});
\`\`\`

## Custom commands

\`\`\`typescript
Cypress.Commands.add('byTestId', (id) => cy.get(\`[data-testid="\${id}"]\`));
Cypress.Commands.add('mountWithStore', (component, options = {}) => {
  const pinia = createPinia();
  return cy.mount(component, {
    ...options,
    global: { ...(options.global || {}), plugins: [pinia] },
  });
});
\`\`\`

## CSS variables and theming

Vue 3 teams often use CSS variables for theming. Cypress Component Tests inherit any imported global stylesheets, including variable definitions.

\`\`\`css
/* main.css */
:root {
  --color-primary: #0d6efd;
  --color-background: #ffffff;
}
[data-theme='dark'] {
  --color-background: #1a1a1a;
}
\`\`\`

Toggle theme per test:

\`\`\`typescript
it('renders correctly in dark mode', () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  cy.mount(Card);
  cy.get('[data-testid=card]').should('have.css', 'background-color', 'rgb(26, 26, 26)');
});
\`\`\`

## Debugging with the Cypress UI

\`npx cypress open --component\` opens the interactive UI. Each command in the test log is replayable, the DOM snapshot shows the component before and after each step, and the network panel shows intercepted requests. For Vue components with reactive state, this is materially better than the Vitest UI.

## CI configuration

\`\`\`yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm ci
- uses: cypress-io/github-action@v6
  with:
    component: true
    record: true
    parallel: true
    group: 'component-tests'
\`\`\`

## Best practices

1. **Co-locate specs.** \`Button.cy.ts\` next to \`Button.vue\`.
2. **Share mount wrappers.** \`mountWithPinia\`, \`mountWithRouter\` reduce boilerplate.
3. **Prefer text and role selectors.** Use \`data-testid\` only when accessibility cannot guide.
4. **Intercept all network calls.** No real backend during component tests.
5. **One assertion per behavior.** Multi-assertion tests obscure failure points.
6. **Stub callback props with \`cy.stub\`.** Assert on \`calledOnce\`, \`calledWith\`.
7. **Test what the user sees and does.** Not the component's internal state.
8. **Co-locate fixtures.** Or share via \`cypress/fixtures/\`.
9. **Run on every PR.** Parallelize with Cypress Cloud if needed.
10. **Keep tests under one second each.** Slower tests are warning signs.

## Gotchas

1. **\`@vue/test-utils\` mount differs slightly from \`cypress/vue\` mount.** Names and options are similar but not identical.
2. **Pinia must be installed per test or via custom command.** Stale state between tests is a common bug.
3. **Vue Router needs memory history in tests.** \`createMemoryHistory\` rather than \`createWebHistory\`.
4. **Reactive props may not update after mount.** Use \`cy.get(...).vue()\` to access the component instance.
5. **Async \`setup\` requires await in mount.** Wrap in \`Suspense\`.
6. **Global directives must be registered.** \`global.directives\` in mount options.
7. **TypeScript autocompletion for \`cy.mount\` requires the \`declare\` block.** Otherwise IntelliSense fails.
8. **Hot reload can cause stale tests.** Restart on code edits.

## Comparison: Cypress Component vs Vitest + Test Utils

| Dimension | Cypress Component | Vitest + @vue/test-utils |
|---|---|---|
| Speed (per test) | ~1 second | ~10 milliseconds |
| Fidelity | Real browser | jsdom or happy-dom |
| Network mocking | \`cy.intercept\` | MSW or module mocks |
| Visual debugging | Excellent | Limited |
| CSS support | Full | Partial |
| Animation support | Real | Stubbed |
| Snapshot testing | Visual via plugin | Built-in HTML |
| Parallelism | Cloud or DIY | Built-in workers |

## Conclusion and next steps

Cypress Component Testing for Vue 3 is the right choice for layout-sensitive, visually-rich, and animation-heavy components in 2026. The cost is slower execution; the benefit is fidelity and debugging that Vitest plus jsdom cannot match. Use it alongside Vitest plus \`@vue/test-utils\`, not as a replacement.

Start with one component. Build the mount wrapper with Pinia and Router. Add intercepts and fixtures. Migrate visually complex components first.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for visual testing and CI guides.
`,
};
