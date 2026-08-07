import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Component Testing for Vue: A Real-Browser Workflow for QA Engineers',
  description: 'Use this playwright component testing vue guide to test Vue states in real browsers with stories, locators, fixtures, CI evidence, and migration patterns.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Component Testing for Vue: A Real-Browser Workflow for QA Engineers

Playwright component testing for Vue is most useful when a QA team wants real browser signal without the cost of a full end-to-end journey. You mount one Vue component state, interact with it through Playwright locators, and assert what the user can see or do. That catches layout, focus, event, slot, conditional rendering, and browser behavior that unit tests may not expose.

The current Playwright component testing model is story-gallery based. A component test is still a Playwright test. The component runs in a browser page served by your own dev server, while the test runs in Node.js and uses the built-in \`mount\` fixture from \`@playwright/test\`. The framework-specific piece is the gallery page and story resolver that your Vue project owns. The official docs describe this model at https://playwright.dev/docs/test-components.

This guide gives QA and test-automation engineers a concrete Vue workflow: decide what belongs in component tests, create stable stories, mount them with Playwright, test props and emitted behavior, wrap providers, mock network boundaries, capture evidence, and avoid the failure mode where the component test is secretly an end-to-end test with a smaller screen. For framework selection context, use [JavaScript Testing Frameworks Complete Guide 2026](/blog/javascript-testing-frameworks-complete-guide-2026). For locator discipline inside mounted components, use [Playwright Best Practices Locators 2026](/blog/playwright-best-practices-locators-2026).

## Use component tests for dense UI state, not full journeys

Vue component tests earn their keep when one component has many states that are expensive to reach through the full app. A billing card may need free, trial, active, past-due, canceled, loading, retrying, and permission-denied states. Driving the entire app into each state through login, navigation, seeding, and backend calls makes end-to-end tests slow and brittle. Mounting the component directly with controlled props makes those states cheap to cover.

That does not make component testing a replacement for end-to-end testing. Component tests prove the component behaves in isolation with its wrappers and mocks. End-to-end tests prove routes, authentication, backend integration, deployment configuration, and real user journeys. A healthy Vue test strategy uses both.

| Risk to test | Vue component test | End-to-end Playwright test |
|---|---:|---:|
| Conditional rendering for many states | Strong fit | Usually too slow for full matrix |
| Browser focus and keyboard behavior | Strong fit | Good for one critical journey |
| Route guard and auth redirect | Possible with wrapper | Strong fit |
| Backend integration and persistence | Mock or fake only | Strong fit |
| Visual regression for a component | Strong fit | Strong fit for full page |
| Cross-service checkout | Poor fit | Strong fit |

The decision is not about which layer is "better." It is about which layer gives the clearest failure. If a button's disabled state is wrong, a component test should fail close to the component. If checkout does not create an order, an end-to-end test should fail at the integration boundary.

## Think in stories before thinking in tests

In the Playwright story-gallery model, a story is a named component scenario. It hard-codes the props, slots, mocks, and providers needed to render one state. The test mounts that story and interacts with the returned root locator. This is valuable for QA because the story becomes a shared contract between component authors, test authors, and AI coding agents.

Start with a small Vue component:

\`\`\`vue
<template>
  <section aria-label="Plan summary">
    <h2>{{ planName }}</h2>
    <p v-if="status === 'active'">Your subscription is active.</p>
    <p v-else-if="status === 'past_due'">Update your payment method.</p>
    <p v-else>Choose a plan to continue.</p>

    <button :disabled="status === 'past_due'" @click="$emit('manage')">
      Manage plan
    </button>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  planName: string;
  status: 'active' | 'past_due' | 'none';
}>();

defineEmits<{
  manage: [];
}>();
</script>
\`\`\`

Then define story entries that describe meaningful states. The exact story resolver is owned by your gallery setup, but the story module should stay plain and easy to inspect:

\`\`\`ts
import PlanSummary from './PlanSummary.vue';

export const ActiveTeamPlan = {
  component: PlanSummary,
  props: {
    planName: 'Team',
    status: 'active',
  },
};

export const PastDueTeamPlan = {
  component: PlanSummary,
  props: {
    planName: 'Team',
    status: 'past_due',
  },
};

export const NoPlanSelected = {
  component: PlanSummary,
  props: {
    planName: 'No plan',
    status: 'none',
  },
};
\`\`\`

A good story is not a test yet. It is a reproducible component state. That distinction matters. Stories can also help designers, developers, and AI agents see the exact state under discussion without navigating through the product.

## Configure Playwright around your own Vue dev server

The built-in component testing model expects your own dev server to serve the gallery. For a Vite-powered Vue app, that normally means adding a gallery route or small gallery entry that the existing dev server can load. Playwright points \`baseURL\` at that page and the \`mount\` fixture drives it.

A typical Playwright config uses \`webServer\` to start the app and \`baseURL\` to tell tests where the gallery lives:

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/components',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:5173/playwright/gallery/',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173/playwright/gallery/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
\`\`\`

Treat this config as an example of the moving parts, not a universal drop-in file. Your port, dev command, gallery path, aliases, CSS loading, and project matrix may differ. The important point is ownership: Playwright is not compiling Vue for you. Your project serves the component gallery with the same build pipeline that already understands your Vue single-file components, CSS, plugins, and aliases.

## Mount Vue stories and query inside the component root

The \`mount\` fixture returns a locator for the mounted component root. Scope queries through that locator whenever possible. This prevents a component test from accidentally finding something in the gallery shell, a leftover notification, or a dev overlay.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('active plan allows management', async ({ mount }) => {
  const component = await mount('components/PlanSummary/ActiveTeamPlan');

  await expect(component.getByRole('heading', { name: 'Team' })).toBeVisible();
  await expect(component.getByText('Your subscription is active.')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Manage plan' })).toBeEnabled();
});

test('past due plan blocks management', async ({ mount }) => {
  const component = await mount('components/PlanSummary/PastDueTeamPlan');

  await expect(component.getByText('Update your payment method.')).toBeVisible();
  await expect(component.getByRole('button', { name: 'Manage plan' })).toBeDisabled();
});
\`\`\`

Notice the assertions are user-facing. They do not inspect Vue internals, component instance properties, or implementation-specific classes. The browser renders the component, Playwright finds accessible elements, and the test asserts behavior visible to the user.

This pattern also creates better prompts for AI coding agents. If a failure says the \`Manage plan\` button is enabled in the \`PastDueTeamPlan\` story, the agent has a small, specific component state to inspect. It does not need to understand a full checkout path.

## Test props, slots, and events through visible behavior

Vue components often combine props, slots, and emitted events. In component tests, resist the urge to reproduce unit-test internals. Test what changes in the browser. If the component emits an event that the parent would normally handle, create a story that records the callback result in visible text.

\`\`\`vue
<template>
  <div>
    <PlanSummary
      plan-name="Team"
      status="active"
      @manage="managed = true"
    />
    <p data-testid="manage-event">{{ managed ? 'managed' : 'idle' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PlanSummary from './PlanSummary.vue';

const managed = ref(false);
</script>
\`\`\`

Then test the event through the wrapper story:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('manage event updates the wrapper state', async ({ mount }) => {
  const component = await mount('components/PlanSummary/ManageEventStory');

  await expect(component.getByTestId('manage-event')).toHaveText('idle');
  await component.getByRole('button', { name: 'Manage plan' }).click();
  await expect(component.getByTestId('manage-event')).toHaveText('managed');
});
\`\`\`

This keeps the test in the browser contract. The component emits, the wrapper responds, and the user-visible state changes. You do not need a mock function assertion unless your gallery design exposes callback recording another way.

For slots, build stories that render realistic slot content. Do not pass abstract placeholder text if the component's layout depends on actual copy length, icons, or interactive children.

## Wrap Pinia, router, i18n, and design-system providers deliberately

Most real Vue components are not pure prop renderers. They may need Pinia stores, a router instance, i18n messages, injected services, or design-system plugins. Component testing stays reliable when those providers are explicit in the story or gallery layer.

| Dependency | Where to provide it | Testing note |
|---|---|---|
| Pinia store | Story wrapper or gallery app setup | Seed state per story, reset between mounts |
| Vue Router | Story wrapper with memory-style route setup | Assert links and route-aware rendering, not full navigation unless needed |
| i18n | Gallery app setup or story wrapper | Test important locales as separate stories |
| Design system plugin | Gallery app setup | Match production registration as closely as practical |
| API client | Mocked service or page route | Avoid real network calls for component state matrix |
| Feature flags | Story props, store state, or injected service | Make flags visible in the story name |

Here is a Pinia-oriented story wrapper pattern:

\`\`\`vue
<template>
  <PlanLimitNotice />
</template>

<script setup lang="ts">
import { createPinia, setActivePinia } from 'pinia';
import { useAccountStore } from '../../stores/account';
import PlanLimitNotice from './PlanLimitNotice.vue';

const pinia = createPinia();
setActivePinia(pinia);

const account = useAccountStore();
account.plan = 'free';
account.membersUsed = 3;
account.membersLimit = 3;
</script>
\`\`\`

The wrapper makes the store state local to the story. The test does not need to know how the store is created. It only verifies what the component shows:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('free plan limit notice explains the member cap', async ({ mount }) => {
  const component = await mount('components/PlanLimitNotice/FreeLimitReached');

  await expect(component.getByText('You have used all 3 team seats.')).toBeVisible();
  await expect(component.getByRole('link', { name: 'Upgrade plan' })).toBeVisible();
});
\`\`\`

Provider setup is where component tests often get messy. If every story manually creates the same providers, introduce a small wrapper factory in the gallery code. If every component needs a different store shape, keep it local so the story remains honest.

## Mock network at the browser boundary

Component tests should not depend on live APIs for ordinary state coverage. If a component fetches suggestions, validates a field, or loads a preview, mock that network boundary with Playwright routing or inject a fake service through the story. Use real APIs only when the point of the test is integration, and then consider whether the test belongs in the end-to-end suite instead.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('user search displays the empty state', async ({ page, mount }) => {
  await page.route('**/api/users/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users: [] }),
    });
  });

  const component = await mount('components/UserSearch/Default');

  await component.getByRole('searchbox', { name: 'Search users' }).fill('nobody');
  await expect(component.getByText('No users found')).toBeVisible();
});
\`\`\`

The mock belongs near the test when it is part of the scenario. For repeated responses, move it to a helper. Keep mock payloads small and aligned with the API contract. A component test with a fake response that no longer resembles production can give false confidence.

## Add visual checks only where pixels carry risk

Playwright component tests can support visual assertions because the component runs in a real browser. Use them selectively. Visual snapshots are valuable for design-system primitives, chart labels, responsive cards, dense tables, and components where CSS regressions are common. They are less valuable for content that changes often or states already covered by strong semantic assertions.

| Component type | Visual check value | Semantic check value | Recommendation |
|---|---|---|---|
| Button and form controls | Medium | High | Use semantic checks plus a small visual baseline for design system |
| Pricing card | High | High | Use both for critical layouts |
| Toast notification | Medium | High | Prefer semantic, add visual for animation-free final state |
| Chart or map | High | Medium | Use visual with stable data |
| User avatar list | Low if images vary | Medium | Mock images or avoid visual check |

Example:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('pricing card visual state is stable', async ({ mount }) => {
  const component = await mount('components/PricingCard/TeamAnnual');

  await expect(component.getByRole('heading', { name: 'Team' })).toBeVisible();
  await expect(component).toHaveScreenshot('team-annual-pricing-card.png');
});
\`\`\`

Keep the component state deterministic before taking a screenshot. Freeze test data, avoid real time, turn off animations when your project normally does that for tests, and use stable fonts in CI. A screenshot that fails every week because the story uses live dates is not useful.

## Keep component tests small enough to diagnose

A component test should fail with a narrow explanation. If a test mounts a page shell, real router, live store, real API, and several child workflows, it has become an end-to-end test with a different entry point. That may still be useful, but it should be named and maintained as integration coverage.

Use this scope table:

| Test smell | What it suggests | Better shape |
|---|---|---|
| Test navigates through several routes | It is testing app flow | Move to end-to-end or create a router-specific component test |
| Story calls live backend by default | State is not deterministic | Mock API or seed through a controlled fake |
| One test checks six component states | Failure will be vague | One story and one test per important state |
| Assertions use CSS classes only | Test knows implementation details | Prefer role, label, text, and stable test IDs |
| Component root is ignored | Test may query gallery shell | Scope from the returned locator |

This is where many teams get component testing wrong. They adopt it to make tests faster, then rebuild the entire application around the component. The result is neither fast nor clear. The better approach is to make stories small, providers explicit, and assertions user-centered.

## Diagnose the blank gallery failure

A realistic Vue component testing failure looks like this: the Playwright test calls \`mount\`, the page opens, but the component root stays blank or the mount call fails. The stack trace may point at the gallery rather than the component. Diagnose the pipeline in layers.

First, open the gallery URL in a browser and confirm the dev server serves it. If the page itself does not load, fix \`webServer\`, \`baseURL\`, or your dev command. Second, confirm the story id passed to \`mount\` matches what the gallery resolver exposes. A typo in the story path should fail at mount time. Third, check Vue compile errors in the dev server output. Since your own dev server compiles the component, alias and plugin problems are build problems, not Playwright locator problems. Fourth, check provider setup. A component that expects Pinia, router, or i18n can render blank if the story did not provide the dependency correctly.

Add a tiny smoke story and test to isolate the gallery:

\`\`\`vue
<template>
  <main>
    <h1>Gallery smoke story</h1>
    <button>Ready</button>
  </main>
</template>
\`\`\`

\`\`\`ts
import { test, expect } from '@playwright/test';

test('gallery can mount a smoke story', async ({ mount }) => {
  const component = await mount('components/GallerySmoke/Default');

  await expect(component.getByRole('heading', { name: 'Gallery smoke story' })).toBeVisible();
  await expect(component.getByRole('button', { name: 'Ready' })).toBeVisible();
});
\`\`\`

If the smoke story works, the gallery pipeline is alive and the failing component likely has a story, provider, alias, or runtime error. If the smoke story fails, fix the gallery before debugging component code.

## Make failures useful for AI-assisted repair

AI coding agents perform better when component tests expose small, named states. A failure called \`past due plan blocks management\` with a story named \`PastDueTeamPlan\` gives the agent a direct path: inspect the component, inspect the story, compare expected disabled behavior. A failure called \`billing works\` gives it very little.

Attach concise context for complex stories:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('localized upgrade banner uses German copy', async ({ mount }, testInfo) => {
  const story = {
    id: 'components/UpgradeBanner/GermanFreePlan',
    locale: 'de-DE',
    plan: 'free',
  };

  const component = await mount(story.id);

  await testInfo.attach('component-story-context.json', {
    body: JSON.stringify(story, null, 2),
    contentType: 'application/json',
  });

  await expect(component.getByRole('link', { name: 'Tarif upgraden' })).toBeVisible();
});
\`\`\`

The attachment is small, deterministic, and tied to the story. It does not dump the whole page or expose secrets. It gives a human reviewer and an agent enough context to reproduce the state.

## Build the Vue component test outline deliberately

For a new Vue component, define the test outline before writing code. This keeps coverage focused and prevents the matrix from exploding.

| Coverage area | Example for a Vue billing banner | Test layer |
|---|---|---|
| Default render | Free plan shows upgrade prompt | Component |
| Important variants | Trial, active, past due, canceled | Component |
| User interaction | Clicking manage emits or changes wrapper state | Component |
| Provider behavior | Store state controls banner copy | Component |
| Route integration | Billing page displays the banner for real account | End-to-end |
| Backend update | Payment status changes after provider event | API or end-to-end |

This outline also clarifies ownership. Component tests can be written before the full route is finished, as long as the component and story contract exist. End-to-end tests can stay lean and cover only the route-level confidence.

## Cover keyboard and accessibility states at the component layer

Vue component tests are a strong place to catch accessibility regressions because the component is small enough to inspect and the browser behavior is real. Focus order, button disabled state, labels, accessible names, and keyboard activation can all be tested without logging into the full application. This is especially valuable for design-system components that appear on many pages.

Start with the component's public contract. A combobox story should prove the input has the right accessible name, arrow keys expose options, escape closes the list, and selection updates visible text. A modal story should prove initial focus, close behavior, and disabled background interactions where your component supports them. A form-field story should prove label association, error announcement, and disabled state.

| Component pattern | Accessibility behavior to test | Useful locator |
|---|---|---|
| Modal dialog | Dialog name, initial focus, close action | \`getByRole('dialog')\` |
| Combobox | Label, option visibility, keyboard selection | \`getByRole('combobox')\` |
| Toast | Status or alert text appears | \`getByText\` or role-based query when appropriate |
| Tab list | Selected tab and panel content | \`getByRole('tab')\` |
| Form field | Label, error text, disabled state | \`getByLabel\` and visible error text |

Example keyboard test:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('country combobox supports keyboard selection', async ({ mount }) => {
  const component = await mount('components/CountryCombobox/Default');
  const combobox = component.getByRole('combobox', { name: 'Country' });

  await combobox.focus();
  await combobox.press('ArrowDown');
  await expect(component.getByRole('option', { name: 'Canada' })).toBeVisible();
  await combobox.press('Enter');

  await expect(combobox).toHaveValue('Canada');
});
\`\`\`

This test would be noisy as an end-to-end scenario if the only goal is combobox behavior. As a component test, it is direct and fast. It also catches regressions that a plain snapshot would miss.

Do not confuse accessible queries with a complete accessibility audit. Role and label assertions are strong signals, but they do not replace automated scans, manual keyboard review, or assistive technology checks for critical flows. The component layer is where you prevent obvious regressions from spreading.

## Migrate older Vue component tests one slice at a time

Many Vue projects adopted an older Playwright component testing setup or a different component runner before the story-gallery model became the documented path. Migration should be incremental. Do not stop the whole QA program to rewrite every component test at once. Choose one component family, create the gallery pattern, prove it in CI, then convert the next slice.

Use this migration map:

| Existing pattern | Migration move | Risk to watch |
|---|---|---|
| Direct component mount through an older package | Create equivalent story exports and mount story ids | Event assertion style may need wrapper stories |
| Storybook-only browser tests | Reuse story concepts, but keep Playwright gallery deterministic | Storybook decorators may hide dependencies |
| Vue Test Utils unit tests | Keep logic tests, add Playwright only for browser behavior | Duplicating low-value assertions |
| End-to-end tests for every UI state | Move dense state matrix to stories | Losing route-level integration coverage |
| Manual QA state checklist | Convert stable states to stories | Over-automating states that change weekly |

A good first migration target has several visible states, few provider dependencies, and known UI risk. Bad first targets include components with live websockets, complicated app boot, or unclear ownership. Migration should prove the pattern, not stress every edge on day one.

When converting an old test, preserve the assertion intent before changing the mechanics. If the old test proved "past due accounts cannot manage plan," the new story and Playwright test should still prove that behavior. Do not blindly copy implementation selectors or internal state checks into the new layer.

## Keep the gallery boring and observable

The gallery is infrastructure. It should be small, deterministic, and easy to debug. Avoid turning it into a product surface with navigation, themes, analytics, or stateful controls unless those pieces are required to mount stories correctly. Every extra behavior in the gallery is another possible reason a component test can fail before the component even renders.

Make the gallery observable enough for failure diagnosis. If an unknown story id is requested, fail with a clear error. If a story throws during render, let the error surface instead of swallowing it and leaving a blank root. If providers are missing, prefer a visible error during story setup over a component that silently renders nothing.

\`\`\`ts
type MountParams = {
  story: string;
  props?: Record<string, unknown>;
};

declare global {
  interface Window {
    mount(params: MountParams): Promise<void>;
    unmount(): Promise<void>;
  }
}

window.mount = async (params: MountParams) => {
  if (!params.story) {
    throw new Error('Story id is required');
  }

  await renderStoryIntoRoot(params.story, params.props || {});
};

window.unmount = async () => {
  await clearRoot();
};
\`\`\`

The example leaves \`renderStoryIntoRoot\` and \`clearRoot\` as gallery-owned functions because each Vue project resolves stories differently. The important contract is explicit: Playwright calls \`window.mount\`, the gallery renders into the root, and errors reject the mount call.

## Decide when not to use Playwright component testing

Playwright component testing is powerful, but using it for every assertion can slow the team down. Keep pure formatting functions, composables with no browser behavior, and simple prop transformations in unit tests. Keep full auth flows, persistence, and deployment smoke checks in end-to-end tests. Use component tests for the middle layer where browser-rendered UI state matters.

| Work item | Better layer | Reason |
|---|---|---|
| Currency formatting utility | Unit test | No browser behavior |
| Vue composable that calculates limits | Unit test | Fast logic feedback |
| Dropdown keyboard behavior | Component test | Real focus and events matter |
| Billing page route after login | End-to-end | Auth, route, and backend integration matter |
| Provider webhook changes account state | API or end-to-end | Server behavior is the risk |
| Design-system button variants | Component test | Visual and accessible states are user-visible |

This restraint keeps component testing valuable. A QA suite with fewer, sharper component tests is easier to maintain than a suite that mounts every component for trivial assertions. The goal is not maximum count. The goal is fast, clear signal at the right layer.

## Frequently Asked Questions

### Is Playwright component testing for Vue a replacement for Vue Test Utils?

No. Vue Test Utils is still useful for fast unit-level checks, emitted event assertions, and component internals in a simulated DOM environment. Playwright component testing is useful when real browser behavior matters: layout, focus, keyboard interaction, accessible queries, visual snapshots, and cross-browser rendering. Many teams use both: Vue Test Utils for pure component logic and Playwright for browser-visible behavior.

### Do I need the old experimental Vue component testing package?

For the current story-gallery model, tests import from \`@playwright/test\` and use the built-in \`mount\` fixture. The official Playwright docs say this model replaces the older experimental React and Vue component testing packages. If your project already uses an older package, treat migration as a planned test-infrastructure change: read the Playwright docs, update the gallery model, and verify CI before broad conversion.

### Should Vue component tests call real APIs?

Usually no. Component tests should keep state deterministic with props, stores, injected fakes, or Playwright route mocks. Real APIs introduce authentication, network, data cleanup, and environment failures that belong in end-to-end or API tests. Use a real API only when the integration itself is the subject, and then ask whether a full Playwright journey would communicate the risk more clearly.

### How many stories should a complex Vue component have?

Create one story for each meaningful user-visible state, not for every possible prop combination. A billing component may need free, trial, active, past-due, and canceled stories. It probably does not need every color, copy, and account-size permutation. Use risk to choose states: permissions, disabled controls, error messages, empty data, and localization usually deserve explicit stories.
`,
};
