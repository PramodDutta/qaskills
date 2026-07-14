import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright locator.describe() and tracing.group() Guide 2026',
  description:
    'Master Playwright locator.describe() and tracing.group() to make trace viewer, HTML reports, and error messages readable. Real 2026 TypeScript examples.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# Playwright locator.describe() and tracing.group(): Readable Traces and Reports

If you have ever opened a Playwright trace for a failing test and stared at a wall of \`getByRole('button').nth(2)\` and \`locator('div > span.actions a')\` entries, you already understand the problem this guide solves. Traces are an incredible debugging tool, but by default they describe *what* Playwright did in raw selector terms, not *why* it did it. A senior engineer who wrote the test might decode \`page.locator('table tr').filter({ hasText: 'Invoice' }).getByRole('checkbox')\` in a few seconds. The on-call engineer paged at 2 a.m. who has never seen that page object will not. The trace becomes noise instead of signal, and the time-to-understanding for a failure balloons.

Playwright's 2026 releases (around v1.60) ship two complementary APIs that fix this without forcing you to restructure your tests: \`locator.describe()\` and \`tracing.group()\`. The first attaches a human-readable label to any locator so it shows up clearly in the trace viewer, the HTML report, and crucially inside error messages. The second lets you wrap a sequence of actions into a named, collapsible group that visually nests in the trace viewer timeline. Used together, they turn a flat, cryptic action log into something that reads like a narrated walkthrough of your test.

In this guide we will cover why traces and reports get noisy in the first place, the exact signatures and semantics of both APIs, before-and-after examples you can run, how to describe chained and role-based locators, how to nest groups for layered flows, how to combine the two inside page objects, and where \`test.step()\` fits in versus \`tracing.group()\`. We will finish with naming conventions, CI artifact handling, best practices, and common pitfalls. Every code block is runnable Playwright TypeScript. If you want a broader foundation first, the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) pairs well with this deep dive.

## Why Traces and Reports Get Noisy

A Playwright trace records every action, every network call, every DOM snapshot, and every console message your test produced. That richness is exactly what makes the trace viewer powerful, but it is also what makes an unlabeled trace overwhelming. The default action label is derived from the locator's selector engine query. For simple cases like \`getByText('Sign in')\` that label is perfectly readable. For real applications, locators are rarely that simple.

Consider a typical e-commerce checkout test. By the time you have filtered a table, scoped to a card, and reached for a nested control, your locator might look like this:

\`\`\`typescript
await page
  .getByTestId('cart-summary')
  .locator('div.line-item')
  .filter({ hasText: 'Premium Plan' })
  .getByRole('button', { name: 'Remove' })
  .click();
\`\`\`

In the trace viewer, the action shows up as the full chained selector. There is no indication that the *intent* was "remove the Premium Plan from the cart." Multiply that by 40 actions in a checkout flow and a debugging session turns into selector archaeology. The same problem shows up in the HTML report's error attachments and in the assertion error text printed to your CI logs. The fix is to give Playwright the intent directly, which is what the two APIs below do.

## locator.describe(): Signature and Semantics

\`locator.describe(description)\` returns a **new locator** with a human-readable description attached. It does not change which element is matched, the selector engine, or any timing behavior. It is purely metadata that Playwright surfaces in three places: the trace viewer action list, the HTML report, and locator error messages.

\`\`\`typescript
// Signature (conceptual)
// locator.describe(description: string): Locator

const removeButton = page
  .getByTestId('cart-summary')
  .locator('div.line-item')
  .filter({ hasText: 'Premium Plan' })
  .getByRole('button', { name: 'Remove' })
  .describe('Remove "Premium Plan" line item');

await removeButton.click();
\`\`\`

Because \`describe()\` returns a locator, it is chainable and lazy just like every other locator method. The description travels with the locator, so any action or assertion you run against it inherits the label. If the click above times out, the error message reads something like \`locator.click: Timeout 30000ms exceeded ... waiting for Remove "Premium Plan" line item\` instead of dumping the raw chained selector. That single change is often the difference between a 30-second diagnosis and a 30-minute one.

A key mental model: \`describe()\` is to locators what \`test.step()\` titles are to action groups. It names the *thing being acted on*, not the *action itself*.

## Before and After: A Readable Trace

Let us look at a small but realistic login-and-navigate flow, first without descriptions and then with them. Here is the noisy version most teams start with:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('user reaches the billing page (noisy)', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.locator('#email').fill('jane@example.com');
  await page.locator('#password').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('tablist').getByRole('tab', { name: 'Billing' }).click();
  await expect(page.locator('[data-status]')).toHaveText('Active');
});
\`\`\`

In the trace, the last assertion appears as \`expect.toHaveText\` against \`[data-status]\`, which tells you nothing about what \`[data-status]\` represents. Now the described version:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('user reaches the billing page (readable)', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.locator('#email').describe('Email field').fill('jane@example.com');
  await page.locator('#password').describe('Password field').fill('hunter2');
  await page.getByRole('button', { name: 'Sign in' }).describe('Sign in button').click();

  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Settings' })
    .describe('Settings nav link')
    .click();

  await page
    .getByRole('tablist')
    .getByRole('tab', { name: 'Billing' })
    .describe('Billing tab')
    .click();

  await expect(
    page.locator('[data-status]').describe('Subscription status badge'),
  ).toHaveText('Active');
});
\`\`\`

The trace now reads like prose: "Email field, Password field, Sign in button, Settings nav link, Billing tab, Subscription status badge." Anyone can follow the flow without knowing the markup. The behavior is byte-for-byte identical; only the labels changed.

## Describing Chained and Role-Based Locators

The biggest readability wins come from the most complex locators, because those are the ones whose default labels are unreadable. The rule of thumb: apply \`describe()\` at the **end** of the chain, right before you act, so the description represents the final resolved element.

\`\`\`typescript
// A deeply chained locator: describe the final intent
const inviteRow = page
  .getByRole('table', { name: 'Team members' })
  .getByRole('row')
  .filter({ hasText: 'pending invite' })
  .filter({ hasText: 'jane@example.com' })
  .describe("Jane's pending-invite row");

await inviteRow.getByRole('button', { name: 'Resend' }).describe('Resend invite').click();
await inviteRow.getByRole('button', { name: 'Revoke' }).describe('Revoke invite').click();
\`\`\`

Notice that you can describe an intermediate locator (the row) and then describe a child action separately. This produces two clean trace entries: "Resend invite" and "Revoke invite," both scoped to a row you already understand. If you build locators dynamically in a loop, attach the description with the loop variable so each iteration is distinct:

\`\`\`typescript
const plans = ['Free', 'Pro', 'Enterprise'];
for (const plan of plans) {
  await page
    .getByRole('listitem')
    .filter({ hasText: plan })
    .getByRole('button', { name: 'Select' })
    .describe(\`Select \${plan} plan\`)
    .click();
}
\`\`\`

Without the template-literal description, the trace would show three identical "Select" clicks. With it, you get "Select Free plan," "Select Pro plan," and "Select Enterprise plan." For more on building robust role-based locators in the first place, see the [Playwright testing best practices for 2026](/blog/playwright-testing-best-practices-2026).

## tracing.group(): Grouping Actions in the Trace Viewer

Where \`describe()\` labels a single locator, \`tracing.group()\` labels a *sequence* of actions and renders them as a collapsible node in the trace viewer timeline. The signature pairs a \`group(name)\` call with a matching \`groupEnd()\` call:

\`\`\`typescript
// Signature (conceptual)
// await context.tracing.group(name: string, options?): Promise<void>
// await context.tracing.groupEnd(): Promise<void>

test('checkout with grouped actions', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  await context.tracing.group('Add items to cart');
  await page.goto('https://shop.example.com');
  await page.getByRole('button', { name: 'Add Widget' }).click();
  await page.getByRole('button', { name: 'Add Gadget' }).click();
  await context.tracing.groupEnd();

  await context.tracing.group('Complete checkout');
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await context.tracing.groupEnd();

  await context.tracing.stop({ path: 'trace.zip' });
});
\`\`\`

In the trace viewer you now see two top-level rows, "Add items to cart" and "Complete checkout," each expandable to reveal the underlying actions. For a 50-action test this collapses to a handful of meaningful phases you can scan at a glance and drill into only where the failure occurred. The group is also reflected in the action sidebar, so jumping to "Complete checkout" instantly filters the timeline to that segment.

Tracing must be active for groups to be recorded. In most projects you do not call \`tracing.start\` manually because the Playwright test runner manages it via the \`trace\` config option; the group/groupEnd calls still work and nest correctly under the runner-managed trace.

## Nesting Groups for Layered Flows

Groups nest, which is what makes them powerful for composite journeys. A high-level "Onboarding" group can contain "Create account," "Verify email," and "Set up workspace" subgroups, each containing their own actions. The trace viewer renders the full tree.

\`\`\`typescript
import { test } from '@playwright/test';

test('full onboarding journey', async ({ page, context }) => {
  await context.tracing.group('Onboarding');

  await context.tracing.group('Create account');
  await page.goto('https://app.example.com/signup');
  await page.getByLabel('Email').fill('new@example.com');
  await page.getByLabel('Password').fill('s3cretP@ss');
  await page.getByRole('button', { name: 'Create account' }).click();
  await context.tracing.groupEnd();

  await context.tracing.group('Verify email');
  await page.goto('https://app.example.com/verify?token=test-token');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await context.tracing.groupEnd();

  await context.tracing.group('Set up workspace');
  await page.getByLabel('Workspace name').fill('Acme QA');
  await page.getByRole('button', { name: 'Finish' }).click();
  await context.tracing.groupEnd();

  await context.tracing.groupEnd(); // closes "Onboarding"
});
\`\`\`

The single most common bug with grouping is an unbalanced \`group\`/\`groupEnd\` pair. Every \`group()\` needs exactly one \`groupEnd()\`. If you open three groups and close two, the trace tree is malformed and subsequent actions land under the wrong node. A try/finally wrapper makes this safe, which we will use in the page-object pattern next.

## Combining describe() and group() in Page Objects

Page objects are where these two APIs really shine, because you can encode both the action grouping and the locator labels once and get readable traces for free in every test that uses the object. Here is a checkout page object that wraps each public method in a group and describes every locator:

\`\`\`typescript
import { type Page, type Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly cardNumber: Locator;
  readonly expiry: Locator;
  readonly cvc: Locator;
  readonly payButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cardNumber = page.getByLabel('Card number').describe('Card number field');
    this.expiry = page.getByLabel('Expiry').describe('Card expiry field');
    this.cvc = page.getByLabel('CVC').describe('Card CVC field');
    this.payButton = page.getByRole('button', { name: 'Pay now' }).describe('Pay now button');
  }

  async pay(card: { number: string; expiry: string; cvc: string }) {
    await this.page.context().tracing.group('CheckoutPage.pay');
    try {
      await this.cardNumber.fill(card.number);
      await this.expiry.fill(card.expiry);
      await this.cvc.fill(card.cvc);
      await this.payButton.click();
    } finally {
      await this.page.context().tracing.groupEnd();
    }
  }
}
\`\`\`

The \`try/finally\` guarantees \`groupEnd()\` runs even if an action throws, keeping the trace tree balanced on failures, which is exactly when you need it most. Locator descriptions are set once in the constructor and reused by every method, so the labels stay consistent across the whole suite. A test using this object produces a tidy trace with a "CheckoutPage.pay" group containing four clearly named field interactions, no matter how gnarly the underlying selectors are. This composes naturally with mocking approaches from the [Playwright network interception and mocking guide](/blog/playwright-network-mocking-route-handler-guide) when you want to stub the payment API.

## test.step() vs tracing.group(): When to Use Which

This is the question every team asks, because the two features overlap visually. Both create named, nestable nodes. The difference is in scope and in where the structure shows up.

\`test.step()\` is a **test-runner** construct. It groups code, appears in the HTML report and the trace, and can carry a return value and a \`box\` option to control how failures are attributed. \`tracing.group()\` is a **tracing** construct. It only affects the trace artifact, not the HTML report's step tree, and it can be called from non-test code such as fixtures or shared helpers that do not have access to the \`test\` object.

\`\`\`typescript
// test.step(): reported in HTML report AND trace, ideal in test bodies
test('with steps', async ({ page }) => {
  await test.step('Log in', async () => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('jane@example.com');
    await page.getByRole('button', { name: 'Sign in' }).click();
  });

  const total = await test.step('Read cart total', async () => {
    return page.getByTestId('total').textContent();
  });
  expect(total).toBe('$120.00');
});

// tracing.group(): trace-only, callable from helpers without 'test'
export async function seedData(page: Page) {
  await page.context().tracing.group('Seed test data');
  // ... API calls, fixtures setup
  await page.context().tracing.groupEnd();
}
\`\`\`

Here is a comparison of all three readability APIs side by side:

| Feature | What it labels | Shows in HTML report | Shows in trace viewer | Shows in error messages | Callable outside test body |
|---|---|---|---|---|---|
| \`locator.describe()\` | A single locator/element | Yes (action label) | Yes (action label) | Yes | Yes |
| \`test.step()\` | A block of actions | Yes (step tree) | Yes (group node) | Attributed to step | No (needs \`test\`) |
| \`tracing.group()\` | A block of actions | No | Yes (group node) | No | Yes |

The practical decision: use \`test.step()\` inside test bodies when you want the structure in both the report and the trace; use \`tracing.group()\` in fixtures, page objects, and shared helpers where you only need trace structure or do not have the \`test\` object; and use \`locator.describe()\` everywhere a locator is non-trivial. They are complementary, not competing. A common high-end setup uses \`test.step()\` for the top-level phases, \`tracing.group()\` inside page-object methods, and \`describe()\` on every locator.

## Capturing and Opening Traces

None of this matters if you are not actually recording traces. The Playwright config controls when traces are captured. The recommended production setting captures on the first retry so passing tests stay fast and only failures pay the recording cost.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
\`\`\`

Here is the reference for every trace recording mode:

| Mode | Records when | Disk cost | Best for |
|---|---|---|---|
| \`off\` | Never | None | Local fast iteration |
| \`on\` | Every test, always | High | Deep local debugging |
| \`retain-on-failure\` | Records all, keeps only failures | Medium | Local + small suites |
| \`on-first-retry\` | Only on the first retry of a failing test | Low | CI (recommended) |
| \`on-all-retries\` | On every retry attempt | Medium | Flaky-test investigation |

To open a trace locally, point the trace viewer at the \`.zip\`:

\`\`\`bash
# Open a specific trace file
npx playwright show-trace trace.zip

# Open the trace embedded in the last HTML report
npx playwright show-report

# Open a trace downloaded from CI artifacts
npx playwright show-trace ./artifacts/trace-checkout-chromium.zip
\`\`\`

Inside the viewer, your \`tracing.group()\` nodes appear in the left action list as expandable rows, and your \`locator.describe()\` labels appear as the action titles. The "Source," "Network," and "Console" tabs are still there, but now you can navigate by intent first and drill into raw data only when needed.

## CI Artifacts: Making Traces Survive the Pipeline

A trace recorded in CI is useless if it does not get uploaded. The standard pattern is to record with \`on-first-retry\` and upload the \`playwright-report\` and \`test-results\` directories as build artifacts so engineers can download and open them with \`show-trace\`.

\`\`\`yaml
# .github/workflows/e2e.yml
name: E2E
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-traces
          path: |
            playwright-report/
            test-results/
          retention-days: 14
\`\`\`

The \`if: \${{ !cancelled() }}\` condition ensures artifacts upload even when the test step fails, which is precisely when you want the trace. Once downloaded, the named groups and described locators make a CI failure understandable without re-running the test locally. Because the descriptions are also in the error messages printed to the CI log, many failures can be triaged from the log alone before anyone opens a trace.

## Naming Conventions That Scale

Readable labels are only readable if they follow a consistent grammar. After labeling thousands of locators and groups, these conventions hold up well across large suites:

\`\`\`typescript
// Locators: describe the ELEMENT as a noun phrase, scoped by content
page.getByRole('button', { name: 'Delete' }).describe('Delete account button'); // good
page.getByRole('button', { name: 'Delete' }).describe('click delete'); // avoid (verb + vague)

// Include the distinguishing value for repeated elements
row.getByRole('button', { name: 'Edit' }).describe(\`Edit \${userName}\`); // good

// Groups: describe the PHASE as a short imperative or PageObject.method
await tracing.group('Apply discount code'); // good for test phases
await tracing.group('CheckoutPage.pay'); // good for page-object methods
\`\`\`

Three rules that prevent label rot. First, describe locators as nouns ("Delete account button"), not actions ("click delete") since the action already shows in the action verb. Second, always include the distinguishing value for repeated elements so identical controls are disambiguated. Third, use the \`Class.method\` form for page-object groups so the trace mirrors your code structure and engineers can jump from a trace node straight to the source. Keep descriptions under roughly 50 characters so they do not get truncated in the viewer.

## Best Practices and Pitfalls

A few hard-won lessons from rolling these APIs out on real suites.

**Do** apply \`describe()\` only to non-trivial locators. A \`getByRole('button', { name: 'Save' })\` already reads cleanly; adding \`.describe('Save button')\` is redundant noise. Reserve descriptions for chained, filtered, or testid-based locators whose default label is opaque.

**Do** wrap \`tracing.group()\` in \`try/finally\` whenever the grouped actions can throw, so \`groupEnd()\` always runs and the tree stays balanced.

**Don't** rely on \`tracing.group()\` to show up in the HTML report; it will not. If you need report-level structure, use \`test.step()\`.

**Don't** put dynamic data you do not want leaked into descriptions; the trace and report are artifacts that may be shared. Never describe a locator with a real password or token value.

**Don't** forget that \`describe()\` returns a new locator. Calling \`describe()\` without using the return value is a no-op:

\`\`\`typescript
// WRONG: return value discarded, original locator unchanged
const btn = page.getByRole('button', { name: 'Pay' });
btn.describe('Pay button'); // does nothing useful
await btn.click(); // trace shows the raw selector, not the description

// RIGHT: use the returned locator
const btn = page.getByRole('button', { name: 'Pay' }).describe('Pay button');
await btn.click();
\`\`\`

**Watch out** for grouping across navigations that reset the context; groups belong to the browser context's tracing, so as long as you stay in the same context they nest correctly. Finally, browse the QA automation library at [/skills](/skills) for ready-made Playwright skills that bake these conventions into reusable patterns.

## Frequently Asked Questions

### What is the difference between locator.describe() and test.step() in Playwright?

\`locator.describe()\` labels a single locator so its description appears in the trace, report, and error messages. \`test.step()\` wraps a block of actions into a named node that appears in both the HTML report and the trace. Use \`describe()\` for elements and \`test.step()\` for grouping a sequence of actions inside a test body.

### Does locator.describe() change how the element is matched?

No. \`describe()\` is purely metadata. It returns a new locator with the same selector engine, same matching behavior, and same timing as the original. The only effect is the human-readable label that shows up in the trace viewer, HTML report, and locator error messages. Your test behaves identically whether or not you call it.

### How do I make tracing.group() show up in the trace viewer?

Tracing must be active when you call \`tracing.group()\`. In the Playwright test runner, set \`trace: 'on-first-retry'\` (or another mode) in your config so the runner records a trace, then call \`context.tracing.group('Name')\` and \`context.tracing.groupEnd()\` around your actions. The named, collapsible group will appear in the trace viewer's action list.

### Why is my trace missing some tracing.group() nodes?

The most common cause is unbalanced \`group()\` and \`groupEnd()\` calls. Every \`group()\` needs exactly one matching \`groupEnd()\`. If an action throws before \`groupEnd()\` runs, the tree becomes malformed. Wrap grouped actions in \`try/finally\` and call \`groupEnd()\` in the \`finally\` block so it always executes, even on failure.

### Can I use tracing.group() inside a page object or fixture?

Yes, and that is a primary use case. Unlike \`test.step()\`, \`tracing.group()\` does not need the \`test\` object, so you can call \`page.context().tracing.group()\` from page-object methods, fixtures, and shared helpers. This lets you encode trace structure once in your page objects and get readable traces in every test that uses them.

### Which trace mode should I use in CI?

Use \`on-first-retry\`. It records a trace only when a test fails and is retried, so passing tests stay fast and you only pay the disk and time cost for failures. Combine it with \`retries: 2\` in CI and upload \`playwright-report\` and \`test-results\` as build artifacts so engineers can open the traces with \`npx playwright show-trace\`.

### Do locator descriptions appear in error messages?

Yes. This is one of the biggest benefits. When an action or assertion on a described locator times out or fails, the description appears in the error message instead of the raw selector. So a timeout reads "waiting for Pay now button" rather than dumping a chained CSS or role selector, which makes CI log triage dramatically faster.

### What Playwright version do I need for these APIs?

\`tracing.group()\` and \`locator.describe()\` are part of Playwright's 2026 releases around v1.60. Upgrade with \`npm install -D @playwright/test@latest\` and run \`npx playwright install\` to refresh browsers. If you are on an older version, the methods will not exist; check your installed version with \`npx playwright --version\` before relying on them.

## Conclusion

Readable traces and reports are not a luxury; they are the difference between a test suite that helps your team and one that quietly drains it. \`locator.describe()\` gives every non-trivial element an intent-revealing label that follows it into the trace viewer, the HTML report, and error messages. \`tracing.group()\` collapses long action sequences into named, nestable phases you can scan and drill into. Layered with \`test.step()\` for report-level structure, the three turn a cryptic action log into a narrated walkthrough that anyone on the team can follow at 2 a.m.

Start small: add \`describe()\` to your gnarliest chained locators, wrap your page-object methods in \`tracing.group()\` with \`try/finally\`, and set \`trace: 'on-first-retry'\` in CI. The next failing test will tell you exactly what it was trying to do.

Ready to go further? Explore the curated [Playwright skills library](/skills) for reusable, agent-ready automation patterns, then deepen your foundations with the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the [2026 best practices guide](/blog/playwright-testing-best-practices-2026).
`,
};
