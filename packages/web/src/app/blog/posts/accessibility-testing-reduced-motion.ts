import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Reduced Motion for Real Product Flows',
  description: 'Apply accessibility testing reduced motion workflows that verify prefers-reduced-motion, remove motion traps, and keep animated UIs usable in CI.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Accessibility Testing Reduced Motion for Real Product Flows

Accessibility testing reduced motion verifies that users who request less animation can still complete the same product flows without vestibular triggers, hidden timing dependencies, or controls that only make sense while animated. The practical target is the \`prefers-reduced-motion\` media feature: when the operating system or browser context reports \`reduce\`, your UI should suppress or replace non-essential motion while preserving feedback, state changes, and task completion.

For QA engineers, reduced motion is not a visual polish check. It is a functional accessibility requirement that touches route transitions, modals, drawers, charts, skeleton loading, confetti, smooth scrolling, autoplay video, carousels, toast stacks, and component tests that wait for animations to finish. If your automation only checks that a CSS media query exists, it misses the failures users feel: a page that scrolls smoothly despite the setting, a wizard that waits for a transition event that never fires, or a focus trap that breaks when a drawer opens instantly.

This guide shows how to build accessibility testing reduced motion coverage with browser emulation, component assertions, CSS audits, and CI checks. Use your existing [JavaScript testing framework](/blog/javascript-testing-frameworks-complete-guide-2026) for pure helpers and component-level tests, then lean on resilient Playwright selectors from [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) for the end-to-end flows where reduced motion has to prove real usability.

## Reduced Motion Is a User Preference, Not a Disable Animation Flag

The web platform exposes a preference through \`prefers-reduced-motion\`. It does not say every animated value must become static. It says the user has requested that non-essential motion be minimized. A loading spinner that changes to a progress label, a drawer that appears without sliding, or a chart that renders its final state without counting upward can all satisfy the intent if the user receives equivalent information.

The official CSS media feature is documented at https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion and in CSS Media Queries specifications. In automation, treat it as an input to the rendered experience. You are not certifying intent by reading source files. You are checking what the browser computes and what the user can operate.

| Motion pattern | Reduced-motion expectation | Testable outcome |
|---|---|---|
| Page route transition | Replace long slide or zoom with instant or subtle fade | New page heading is visible without waiting on long animation |
| Modal entrance | Avoid scale, bounce, or large movement | Dialog opens, focus lands inside, backdrop is stable |
| Smooth scrolling | Use instant scroll or no automatic scroll unless necessary | Target is reachable and no animated scroll is triggered |
| Skeleton loader | Avoid shimmering movement | Loading state has static affordance or text |
| Data visualization | Skip animated drawing and counters | Final values are visible and announced |
| Celebration effects | Suppress confetti, particle bursts, and shaking | Success message remains clear |

The phrase "non-essential" is where product judgment enters. A small progress indicator may be essential feedback, but it does not need to pulse, shimmer, or sweep across the page. Write tests against outcomes rather than arguing whether a specific animation name is allowed.

## Build a Motion Inventory Before Writing Assertions

Start by inventorying motion sources in the app. Reduced-motion bugs often come from places nobody calls "animation": CSS \`scroll-behavior: smooth\`, JavaScript interval counters, chart libraries, toast stacking transitions, route libraries, and browser autoplay. A simple inventory turns an open-ended accessibility concern into finite coverage.

| Source | Where to look | Risk to users | Example assertion |
|---|---|---|---|
| CSS animations | \`animation-name\`, keyframes, design tokens | Repeated movement, shimmer, shaking | Reduced mode removes non-essential animation |
| CSS transitions | \`transition-property\`, component library defaults | Large movement during open or close | Drawer state changes without layout wait |
| JavaScript animations | Web Animations API, timers, animation libraries | Motion bypasses CSS media query | No active non-essential document animations |
| Scrolling | CSS smooth scroll, router restoration | Vestibular discomfort and disorientation | Reduced mode uses instant positioning |
| Media | Autoplay video, GIF-like loops, Lottie | Continuous motion | Autoplay is paused or replaced |
| Test waits | Waiting for transition end | Flaky tests and broken flows | Tests wait for semantic state |

You can ask an AI coding agent to generate a first inventory, but review it against the live DOM. Agents are good at finding obvious CSS files and less reliable at identifying runtime motion produced by dependencies. The acceptance source is the rendered app under \`reduce\`.

\`\`\`ts
export type MotionSurface = {
  area: string;
  selector: string;
  source: 'css' | 'javascript' | 'scroll' | 'media';
  reducedExpectation: string;
};

export const motionSurfaces: MotionSurface[] = [
  {
    area: 'checkout drawer',
    selector: '[data-testid="checkout-drawer"]',
    source: 'css',
    reducedExpectation: 'opens without slide distance or bounce',
  },
  {
    area: 'dashboard revenue chart',
    selector: '[data-testid="revenue-chart"]',
    source: 'javascript',
    reducedExpectation: 'renders final bars without animated growth',
  },
  {
    area: 'success celebration',
    selector: '[data-testid="order-success"]',
    source: 'javascript',
    reducedExpectation: 'shows static success message with no confetti',
  },
];
\`\`\`

Keep this file close to the test suite. When a designer adds a motion-heavy component, the inventory change should arrive with reduced-motion acceptance criteria.

## Emulate Reduced Motion in Playwright

Playwright can create browser contexts with a reduced motion preference, and tests can also emulate media settings. The reliable pattern is to run a small accessibility project with \`reducedMotion: 'reduce'\` and keep the assertions focused on user-visible behavior. Do not turn every E2E test into a second reduced-motion copy. Pick flows where motion is part of state change.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'chromium-reduced-motion',
      use: {
        browserName: 'chromium',
        reducedMotion: 'reduce',
      },
    },
  ],
});
\`\`\`

Then assert that the preference is active before checking behavior. This catches configuration drift, especially when tests are moved between projects.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('browser context reports reduced motion', async ({ page }) => {
  await page.goto('/settings');

  const prefersReduce = await page.evaluate(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  expect(prefersReduce).toBe(true);
});
\`\`\`

When a reduced-motion test fails, first confirm the context reports the preference. If it does not, the bug is test configuration. If it does, inspect computed styles and active animations on the target component.

## Assert Flows, Not Animation Durations

The most durable reduced-motion tests verify that a flow works with reduced motion enabled. Avoid brittle assertions such as "transition duration equals 0ms" for every component. Some teams use very short fades in reduced mode, and that can be acceptable if it does not create spatial motion or timing traps. Functional assertions also survive component library changes.

\`\`\`ts
import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('checkout drawer remains operable with reduced motion', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();

  const drawer = page.getByRole('dialog', { name: 'Checkout' });
  await expect(drawer).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();

  await page.getByLabel('Email').fill('qa@example.test');
  await page.getByRole('button', { name: 'Continue to shipping' }).click();

  await expect(page.getByRole('heading', { name: 'Shipping address' })).toBeVisible();
});
\`\`\`

That test catches several real defects. If the drawer only sets focus after a transition event, reduced mode may skip the transition and focus never moves. If the component relies on animation end to mark itself open, the Continue button may be hidden from the accessibility tree. If the drawer opens instantly but focus remains behind the overlay, keyboard users are blocked.

## Inspect Computed Styles for Known Motion Tokens

For design-system components, add focused computed-style assertions. These are useful when your policy says specific tokens must change under reduced motion. Test the components that generate the most motion: shimmer loaders, carousels, drawers, navigation transitions, and chart containers.

\`\`\`ts
import { expect, Locator } from '@playwright/test';

export async function expectNoCssAnimation(locator: Locator) {
  const styles = await locator.evaluate((node) => {
    const computed = window.getComputedStyle(node);
    return {
      animationName: computed.animationName,
      animationDuration: computed.animationDuration,
      transitionProperty: computed.transitionProperty,
      scrollBehavior: computed.scrollBehavior,
    };
  });

  expect(styles.animationName).toBe('none');
  expect(styles.scrollBehavior).not.toBe('smooth');
}
\`\`\`

Use this helper sparingly. It is too blunt for every element on the page because many components may keep harmless opacity transitions or internal browser effects. It is excellent for named motion surfaces where your team has an explicit reduced-motion contract.

| Assertion type | Strength | Weakness | Best use |
|---|---|---|---|
| Flow completion | Proves user can finish task | May not catch subtle remaining motion | Checkout, onboarding, auth, admin actions |
| Computed style | Pinpoints CSS policy drift | Can overfit implementation | Design-system motion tokens |
| Active animation scan | Finds runtime animation leaks | Needs allowlist for harmless cases | Pages with third-party widgets |
| Screenshot comparison | Catches final visual differences | Poor at proving movement | Static fallback state |

Reduced-motion automation should combine these types. One style assertion cannot prove accessibility, and one flow test cannot catch every rogue animation.

## Scan Active Web Animations When CSS Is Not Enough

CSS media queries do not control every animation. JavaScript can call the Web Animations API, a chart library can tween values, and a Lottie player can run outside your main stylesheet. The browser exposes active animations through \`document.getAnimations()\`, which gives you a practical diagnostic signal.

\`\`\`ts
import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('dashboard does not keep non-essential animations running', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Revenue' })).toBeVisible();

  const runningAnimations = await page.evaluate(() =>
    document.getAnimations()
      .filter((animation) => animation.playState === 'running')
      .map((animation) => {
        const effect = animation.effect;
        const target =
          effect instanceof KeyframeEffect && effect.target instanceof Element
            ? effect.target.getAttribute('data-testid') ?? effect.target.tagName
            : 'unknown';
        return { target, playState: animation.playState };
      }),
  );

  expect(runningAnimations).toEqual([]);
});
\`\`\`

If that assertion is too strict for your app, filter to surfaces that should be static. For example, allow a native progress indicator during a real upload, but reject continuous decorative movement on the dashboard once data has loaded. The test should enforce your product policy, not pretend all animation is forbidden.

## Replace Motion With Equivalent State Feedback

Reduced motion does not mean reduced information. If a normal mode uses animation to communicate progress, success, error, or spatial change, reduced mode needs another cue. This is where QA can add meaningful acceptance criteria instead of only asking developers to delete transitions.

| Normal-motion cue | Reduced-motion replacement | Test oracle |
|---|---|---|
| Button morphs into spinner | Button text changes to "Saving" and busy state is set | Accessible name or status region updates |
| Chart bars animate upward | Bars render final values and table summary is present | Values visible without waiting |
| Card shakes on validation error | Inline error text and focus move to field | Error is announced and field is focused |
| Route slides from right | New heading appears and breadcrumb updates | Navigation state is clear |
| Confetti on completion | Static success icon and message | Success is visible without continuous motion |

A good reduced-motion bug report says what information was lost. "Turn off animation" is vague. "When reduced motion is active, save progress has no visible or announced feedback because the spinner is suppressed without replacement" gives engineering and design a concrete repair.

\`\`\`tsx
type SaveButtonProps = {
  status: 'idle' | 'saving' | 'saved';
  reducedMotion: boolean;
};

export function SaveButton({ status, reducedMotion }: SaveButtonProps) {
  const label = status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : 'Save';

  return (
    <button aria-busy={status === 'saving'} className={reducedMotion ? 'static' : 'animated'}>
      {label}
    </button>
  );
}
\`\`\`

Component tests can verify this logic without launching a full browser suite. End-to-end tests should then prove the same user-facing state in the real app.

## Test Scroll and Focus Together

Smooth scrolling is one of the most common reduced-motion misses. Teams add \`scroll-behavior: smooth\` globally, then forget that users requesting reduced motion should not be forced through animated viewport travel. The failure is worse when focus movement and scroll movement disagree, because keyboard and screen magnifier users can lose context.

\`\`\`css
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    transition-duration: 0.01ms;
  }
}
\`\`\`

That CSS pattern is common, but do not copy it blindly. Some teams prefer explicit component tokens instead of global overrides. The testable point is that reduced mode should not perform long smooth viewport movement. Also be careful with near-zero durations: if application code waits for \`transitionend\`, very short transitions may still behave differently across browsers.

\`\`\`ts
import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('skip link moves focus without smooth-scroll dependency', async ({ page }) => {
  await page.goto('/reports');
  await page.keyboard.press('Tab');
  await page.getByRole('link', { name: 'Skip to content' }).press('Enter');

  await expect(page.getByRole('main')).toBeFocused();

  const behavior = await page.evaluate(() =>
    window.getComputedStyle(document.documentElement).scrollBehavior,
  );
  expect(behavior).not.toBe('smooth');
});
\`\`\`

This test asserts both semantics and motion policy. Focus reaches main content, and the document does not keep smooth scrolling active under reduced motion.

## Diagnose the Failure Where Tests Hang Forever

A realistic reduced-motion failure is a test that times out only in the reduced-motion project. The component opens a modal, reduced CSS sets transition duration to zero, and the JavaScript waits for a transition completion callback before setting \`data-state="open"\`. No event arrives in the way the code expects, so the test waits for a button that remains hidden.

Diagnose in this order. First, confirm \`matchMedia('(prefers-reduced-motion: reduce)')\` returns true. Second, inspect whether the target exists but is hidden, detached, or disabled. Third, inspect whether state attributes changed. Fourth, look for code that listens to animation or transition events before enabling the next state.

\`\`\`ts
test('debug reduced-motion modal state', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('button', { name: 'Delete account' }).click();

  const state = await page.locator('[data-testid="delete-modal"]').evaluate((node) => {
    const element = node as HTMLElement;
    const computed = window.getComputedStyle(element);
    return {
      dataState: element.dataset.state,
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      activeAnimations: document.getAnimations().length,
    };
  });

  console.log(state);
});
\`\`\`

The fix is usually to separate logical state from animation lifecycle. Opening the modal should set semantic open state and focus immediately. Animation can decorate that transition in normal mode, but it should not be the gate that makes the dialog usable.

## What People Get Wrong About Reduced Motion

The first mistake is assuming reduced motion is only for animations that move across a large distance. Vestibular triggers can include zooming, parallax, bouncing, shaking, spinning, sweeping shimmer, and sudden perspective changes. A tiny but continuous shimmer across every skeleton row can be worse than a single short fade.

The second mistake is hiding the problem behind test timeouts. Teams often add arbitrary waits because animations are flaky. That makes normal tests pass while reduced-motion users still get broken state. Replace duration waits with semantic waits: a dialog is visible, a button is enabled, a status region has text, or a route heading appears.

The third mistake is shipping CSS-only fixes while JavaScript animation remains active. If a chart library animates values using requestAnimationFrame, your \`@media\` block may not touch it. Use component props or library configuration where documented, and verify the rendered outcome.

## CI Strategy for Reduced-Motion Coverage

Run a small reduced-motion browser project on pull requests and a broader scheduled pass for high-motion pages. Keep the pull request set focused so developers respect the signal. A good CI suite includes pure tests for motion preference helpers, component tests for fallback state, and end-to-end tests for a handful of user journeys.

\`\`\`yaml
name: accessibility-motion

on:
  pull_request:
  push:
    branches: [main]

jobs:
  reduced-motion:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:unit -- --run
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=chromium-reduced-motion
\`\`\`

If your app has a ready-made QA skill for reduced-motion checks, install it from qaskills.sh with the qaskills CLI and adapt the generated selectors to your product flows. The generated test should still be reviewed against your motion inventory because accessibility policy is product-specific.

## Reporting Reduced-Motion Bugs So They Get Fixed

Reduced-motion bugs need evidence that designers and engineers can act on. Include the active preference, the flow, the expected replacement cue, the observed motion or broken state, and the user impact. Attach a short trace or video only if it helps. For continuous motion, a screenshot is often insufficient because it cannot show movement.

\`\`\`json
{
  "preference": "prefers-reduced-motion: reduce",
  "flow": "checkout drawer",
  "expected": "drawer opens immediately, focus moves to Email, no slide animation",
  "observed": "drawer remains hidden to keyboard navigation until transition callback",
  "impact": "keyboard user cannot continue checkout when reduced motion is active",
  "test": "checkout drawer remains operable with reduced motion"
}
\`\`\`

Avoid vague tickets such as "animation still happens." State whether the issue is harmful motion, missing equivalent feedback, or broken functionality caused by skipped animation lifecycle. Those are different fixes.

One useful review habit is to ask whether the reduced-motion experience still has a beginning, middle, and end. In normal mode, motion often supplies that narrative: the drawer comes from the cart, the saved badge settles into place, or the chart grows from zero to its final value. In reduced mode, the same story can be told through headings, focus placement, status text, disabled and enabled states, and final rendered values. QA should verify those replacement cues explicitly. A static screen that appears instantly but leaves the user unsure what changed is still a reduced-motion defect, even if no animation remains.

## Frequently Asked Questions

### Is reduced motion required for every animation?

Reduced motion does not require deleting every visual transition. It requires minimizing non-essential motion for users who ask for it and preserving the information the motion conveyed. A small opacity change may be acceptable, while parallax, zoom, spinning, shaking, shimmer, and large sliding movement often need removal or replacement. Test the user outcome: can the person complete the flow without forced motion or lost feedback?

### Can Playwright test prefers-reduced-motion?

Yes. Playwright supports reduced-motion emulation through browser context options, and tests can assert the active media query with \`window.matchMedia('(prefers-reduced-motion: reduce)').matches\`. Use that as a setup check, then test real behavior such as dialog focus, route completion, scroll behavior, and suppressed non-essential animations. The valuable assertion is not that emulation exists, but that the application honors it.

### Should I assert transition-duration is zero?

Only for components with a specific design-system contract that says reduced motion must remove that transition. A blanket zero-duration assertion creates noise and may reject harmless opacity changes. Prefer flow-level assertions for product paths and computed-style checks for known motion surfaces like shimmer loaders, drawers, route transitions, and animated charts. Tie each assertion to user impact or an explicit token policy.

### Why do reduced-motion tests find flaky waits?

Reduced-motion tests expose code that uses animation lifecycle as application state. If a modal becomes usable only after a transition event, removing or shortening the transition can leave focus, visibility, or enabled state stuck. The fix is to make logical state independent from animation completion. Tests should wait for semantic outcomes such as visible dialogs, enabled buttons, focused fields, and status text instead of sleeping for animation durations.
`,
};
