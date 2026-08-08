import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Tracing Group Custom Steps: Build Traces That Explain Failures',
  description: 'Use Playwright tracing group custom steps to organize noisy traces, expose business intent, and shorten failure diagnosis with runnable patterns.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Tracing Group Custom Steps: Build Traces That Explain Failures

Playwright tracing group custom steps turn a flat stream of clicks, requests, and assertions into a readable diagnostic story. In Playwright Test, the normal solution is \`test.step()\`: wrap each meaningful business action in a named step, nest related work, and let the runner place those steps in both reports and Trace Viewer. When you use Playwright as a library without the test runner, use \`context.tracing.group()\` and \`context.tracing.groupEnd()\` around the browser operations you want grouped.

The result is not merely a prettier report. A reviewer can open a failed trace, expand "Submit an international refund," and distinguish a locator failure from an authorization response without reconstructing intent from twenty low-level calls. Good grouping also gives AI coding agents semantic boundaries. An agent can reason about a failed checkout phase much more reliably than an undifferentiated action log.

This guide builds a concrete trace taxonomy, reusable step helpers, nested page-object steps, safe low-level groups, and a diagnosis workflow. The official API references are https://playwright.dev/docs/api/class-test and https://playwright.dev/docs/api/class-tracing. If you are comparing Playwright with other runners, use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). If a trace points to an ambiguous selector, continue with [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Choose the grouping API that matches the execution model

Two APIs can produce visually grouped trace activity, but they serve different layers. Treating them as interchangeable is the first mistake to avoid.

| Execution model | Preferred API | Appears in test report | Captures Playwright assertions as test steps | Cleanup model |
|---|---|---:|---:|---|
| Playwright Test | \`test.step(title, body)\` | Yes | Yes | Step closes when callback settles |
| Playwright library with \`BrowserContext\` | \`context.tracing.group(name)\` | No runner report | No | Close with disposable or \`groupEnd()\` |
| Page object called by Playwright Test | \`test.step()\` inside public business methods | Yes | Yes | Callback-scoped |
| One-off trace collection script | Low-level tracing start, group, stop | Not applicable | No | Explicit tracing lifecycle |

Playwright explicitly recommends \`test.step\` when it is available. The low-level \`context.tracing\` API records browser operations and network activity, but it does not record test-runner assertions such as \`expect\`. Configuration-level tracing in Playwright Test produces the fuller debugging artifact. That makes this a clean architectural decision, not a style preference.

For a Playwright Test project, enable tracing in configuration and add semantic steps in the test:

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  reporter: [['html', { open: 'never' }]],
});
\`\`\`

\`trace: 'on-first-retry'\` preserves the fast path for passing tests while collecting the artifact when a retry begins. Other documented modes may fit a different CI policy, but do not start and stop \`context.tracing\` manually inside a normal Playwright Test just to recreate what the runner already manages.

## Design step names as an incident timeline

A useful step name answers what the user or system intended to accomplish. A weak step name repeats the implementation. Compare "Click Submit" with "Submit refund for approval." The first becomes misleading when the UI changes from a button to a keyboard shortcut. The second remains meaningful because it describes the stable business action.

Use a compact vocabulary that exposes phase, object, and expected transition:

| Weak name | Diagnostic name | Signal added |
|---|---|---|
| Fill fields | Enter shipping address for Canada | Data domain and destination |
| Click save | Save draft invoice INV-1042 | State transition and entity |
| Wait for API | Confirm inventory reservation | Dependency purpose |
| Check text | Verify refund is pending approval | Expected state |
| Setup | Create merchant with EUR settlement | Fixture intent and currency |

Avoid secrets and high-cardinality noise. Step titles are diagnostics, so they may land in HTML reports, traces, CI artifacts, and logs. Do not include access tokens, full customer addresses, raw payment details, or session cookies. Prefer stable public identifiers that a tester can search, and mask any identifier governed by your retention policy.

Here is a test whose outer steps read like a support timeline while inner actions remain available on expansion:

\`\`\`ts
// tests/refunds/international-refund.spec.ts
import { test, expect } from '@playwright/test';

test('finance approves an international refund', async ({ page }) => {
  await test.step('Open refund RF-204 in finance queue', async () => {
    await page.goto('/finance/refunds');
    await page.getByRole('row', { name: /RF-204/ })
      .getByRole('link', { name: 'Review' })
      .click();
    await expect(page.getByRole('heading', { name: 'Refund RF-204' })).toBeVisible();
  });

  await test.step('Approve refund for EUR settlement', async () => {
    await page.getByLabel('Approval note').fill('Verified against original charge');
    await page.getByRole('button', { name: 'Approve refund' }).click();
    await expect(page.getByRole('status')).toHaveText('Refund approved');
  });

  await test.step('Verify approved state survives reload', async () => {
    await page.reload();
    await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  });
});
\`\`\`

Each callback is awaited. That detail matters. If an engineer forgets \`await\`, the test can move into the next phase while the previous promise is unresolved. The resulting trace hierarchy and failure location become confusing, and concurrent page operations may race.

## Nest custom steps around decisions, not every click

Trace grouping has diminishing returns. If every \`fill\`, \`click\`, and \`expect\` receives its own wrapper, the custom layer duplicates Playwright's built-in action records. The useful unit is a decision or transaction containing several technical actions.

A checkout test provides a practical three-level ceiling:

1. The test title names the outcome.
2. Outer steps name business phases such as cart, delivery, and payment.
3. Inner steps exist only when a phase contains an independently diagnosable decision.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('guest checks out with address validation', async ({ page }) => {
  await test.step('Prepare cart for checkout', async () => {
    await page.goto('/products/desk-lamp');
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page.getByText('Desk lamp')).toBeVisible();
  });

  await test.step('Resolve shipping address', async () => {
    await page.getByLabel('Email').fill('qa-buyer@example.test');
    await page.getByLabel('Postal code').fill('SW1A 1AA');

    await test.step('Accept normalized address', async () => {
      await page.getByRole('button', { name: 'Validate address' }).click();
      const dialog = page.getByRole('dialog', { name: 'Confirm address' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Use suggested address' }).click();
    });
  });

  await test.step('Place order and verify receipt', async () => {
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  });
});
\`\`\`

The nested "Accept normalized address" step deserves its level because it isolates a third-party or internal validation decision. A failure there has different ownership from a general form-fill failure.

## Return values from steps to keep data flow explicit

\`test.step\` returns the value returned by its callback. Use that behavior instead of declaring mutable outer variables. Explicit data flow makes the trace and the code easier for a human or agent to inspect.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('new project appears in the audit log', async ({ page }) => {
  const projectId = await test.step('Create an isolated project', async () => {
    await page.goto('/projects/new');
    await page.getByLabel('Project name').fill('Trace validation project');
    await page.getByRole('button', { name: 'Create project' }).click();

    const heading = page.getByRole('heading', { name: /Project PRJ-/ });
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    const match = text?.match(/PRJ-[0-9]+/);
    if (!match) throw new Error('Project identifier was not shown after creation');
    return match[0];
  });

  await test.step('Find creation event in audit log', async () => {
    await page.goto('/admin/audit');
    await page.getByLabel('Search events').fill(projectId);
    await expect(page.getByRole('row', { name: new RegExp(projectId) }))
      .toContainText('project.created');
  });
});
\`\`\`

What people get wrong is assuming a step is only a visual label. They keep state in an uninitialized variable, mutate it inside the callback, and add a non-null assertion afterward. Returning the value enforces that the creation phase actually produced what the verification phase needs.

## Put stable steps inside page objects without hiding assertions

Public page-object methods often match business operations and are excellent step boundaries. The page object should keep the title stable, expose inputs that help diagnosis, and return domain results. It should not wrap tiny private helpers because Playwright already displays underlying locator actions.

\`\`\`ts
// pages/subscription-page.ts
import { expect, Page, test } from '@playwright/test';

export class SubscriptionPage {
  constructor(private readonly page: Page) {}

  async changePlan(planName: 'Starter' | 'Team'): Promise<void> {
    await test.step('Change subscription to ' + planName, async () => {
      await this.page.goto('/settings/subscription');
      await this.page.getByRole('radio', { name: planName }).check();
      await this.page.getByRole('button', { name: 'Confirm plan change' }).click();
      await expect(this.page.getByRole('status'))
        .toHaveText('Subscription changed to ' + planName);
    }, { box: true });
  }

  async currentPlan(): Promise<string> {
    return test.step('Read current subscription plan', async () => {
      await this.page.goto('/settings/subscription');
      return this.page.getByTestId('current-plan').innerText();
    });
  }
}
\`\`\`

The documented \`box\` option reports failures at the step call site rather than deep inside the helper. That is useful for a business operation with a clear public contract. It can be counterproductive on exploratory helper code where the inner line is the most useful location, so apply it deliberately.

A corresponding test remains short without becoming vague:

\`\`\`ts
import { test, expect } from '@playwright/test';
import { SubscriptionPage } from '../pages/subscription-page';

test('account owner upgrades to Team', async ({ page }) => {
  const subscription = new SubscriptionPage(page);
  await subscription.changePlan('Team');
  await expect(await subscription.currentPlan()).toBe('Team');
});
\`\`\`

Do not bury every expectation in page objects. Assertions that define the scenario's final contract should remain visible in the test when possible. Assertions that verify a page-object operation completed safely can live with the operation.

## Add custom locations only when wrappers obscure ownership

Both \`test.step\` and low-level tracing groups support a documented custom \`location\`. Most tests should accept the default call site. A custom location is justified when a framework wrapper would otherwise make hundreds of steps point to the same helper file.

The location object contains \`file\`, with optional \`line\` and \`column\`. Use real source coordinates, not a fabricated product URL. This example creates a wrapper whose caller supplies the location explicitly:

\`\`\`ts
import { test } from '@playwright/test';

type SourceLocation = {
  file: string;
  line?: number;
  column?: number;
};

export async function businessStep<T>(
  title: string,
  location: SourceLocation,
  body: () => Promise<T>,
): Promise<T> {
  return test.step(title, body, { location });
}

test('operator releases a shipment', async ({ page }) => {
  await businessStep(
    'Release shipment SHP-88',
    { file: 'tests/shipping/release.spec.ts', line: 14, column: 3 },
    async () => {
      await page.goto('/shipments/SHP-88');
      await page.getByRole('button', { name: 'Release' }).click();
    },
  );
});
\`\`\`

Hard-coded line numbers drift as files change. If your wrapper cannot reliably derive or maintain the call site, default locations are more truthful. A wrong location wastes more time than a generic helper location.

## Use tracing groups safely in library-mode scripts

Low-level groups matter when a browser script does not run under \`@playwright/test\`. Start tracing on the context, open groups around operations, and stop tracing to a zip file. Always close a group in \`finally\`, otherwise an exception can leave subsequent actions visually nested under the wrong phase.

\`\`\`ts
// scripts/capture-account-trace.ts
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();

try {
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
    title: 'Account settings smoke flow',
  });

  const page = await context.newPage();

  await context.tracing.group('Open profile settings');
  try {
    await page.goto('http://127.0.0.1:3000/profile');
    await page.getByRole('link', { name: 'Settings' }).click();
  } finally {
    await context.tracing.groupEnd();
  }

  await context.tracing.group('Update display name');
  try {
    await page.getByLabel('Display name').fill('Trace Tester');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await page.getByRole('status').waitFor();
  } finally {
    await context.tracing.groupEnd();
  }

  await context.tracing.stop({ path: 'account-settings-trace.zip' });
} finally {
  await context.close();
  await browser.close();
}
\`\`\`

This script has no test-runner assertion record. \`waitFor()\` is a browser synchronization action, not a claim about the status text. If you need assertion-rich test output, move the flow into Playwright Test and use \`expect\` plus \`test.step\`.

Low-level groups can nest. The closing order is last-in, first-out:

\`\`\`ts
await context.tracing.group('Checkout');
try {
  await page.goto('http://127.0.0.1:3000/checkout');

  await context.tracing.group('Apply promotion');
  try {
    await page.getByLabel('Promotion code').fill('QA-SAVE');
    await page.getByRole('button', { name: 'Apply code' }).click();
  } finally {
    await context.tracing.groupEnd();
  }

  await page.getByRole('button', { name: 'Continue to payment' }).click();
} finally {
  await context.tracing.groupEnd();
}
\`\`\`

| Grouping failure | Trace symptom | Root cause | Correction |
|---|---|---|---|
| Missing \`groupEnd()\` | Later phases appear inside an earlier group | Exception skipped cleanup | Close in \`finally\` |
| Extra \`groupEnd()\` | Close operation has no matching intent | Helper and caller both own cleanup | Assign ownership to one layer |
| Parallel work in one context | Calls interleave under surprising groups | Global stack is shared by concurrent operations | Avoid overlapping manual groups on the same context |
| Manual tracing inside runner-managed trace | Incomplete or conflicting artifact lifecycle | Two owners manage one context trace | Let Playwright Test configuration own tracing |

## Diagnose a trace whose steps look correct but point to the wrong failure

Consider a CI failure in "Confirm inventory reservation." The trace shows the step, but the visible error is a timeout on the success banner. A weak triage concludes that the banner locator is flaky. The actual network panel shows \`POST /reservations\` returned 409 because test data reused an order id.

Use this sequence:

1. Confirm which semantic step failed and whether earlier sibling steps completed.
2. Inspect the last successful locator action, then the network requests within the same time window.
3. Compare request payload identifiers with setup output or attached fixture data.
4. Inspect DOM snapshots before and after the triggering action.
5. Re-run the single test with the same seed or entity id when your environment supports deterministic data.
6. Fix the ownership boundary. In this case, creation of a unique order belongs in a setup step, while 409 handling belongs to reservation diagnostics.

The realistic failure mode is not a bad group API. It is a truthful UI timeout masking an earlier business rejection. Semantic grouping narrows the investigation, but the investigator still needs network, DOM, and action evidence.

## Set a step budget that keeps traces scannable

There is no universal correct number of steps. Use a review heuristic based on information value. For an ordinary end-to-end scenario, an illustrative target might be three to eight top-level business steps, with nesting only for a complicated phase. The number is illustrative, not a Playwright limit.

| Review question | Keep separate when... | Merge when... |
|---|---|---|
| Can ownership differ? | Failure routes to another service or team | Same owner and same corrective action |
| Can the phase be retried conceptually? | It is a self-contained transaction | It is merely the next locator call |
| Does the name add domain meaning? | It explains state or intent | It restates \`click\`, \`fill\`, or \`expect\` |
| Does it expose sensitive data? | The identifier is safe and useful | The title would leak credentials or personal data |
| Will it remain stable after UI refactoring? | It names user intent | It names CSS or current layout |

Ask an AI coding agent to justify each custom step with one of three reasons: business phase, external dependency boundary, or diagnosable state transition. Delete wrappers that have no reason. Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want repeatable review instructions for agent-generated tests.

## Review custom steps as executable documentation

A code review should check more than whether the test passes. Verify that titles describe observable work, callbacks are awaited, returned data is explicit, and cleanup cannot be skipped. Then open at least one trace locally. A hierarchy that looks elegant in source can still be noisy when Playwright's automatic action steps are expanded beneath it.

Use this review checklist:

- The test title states the scenario outcome.
- Top-level steps describe stable business phases.
- Nested steps isolate decisions or dependencies, not individual clicks.
- Every asynchronous step is awaited or returned.
- Page-object steps use public operations as boundaries.
- \`box: true\` is used only when the call site is the better failure location.
- Custom locations are accurate and maintainable.
- Low-level groups close in \`finally\` and do not overlap concurrently.
- Titles contain no secrets or regulated personal data.
- The trace configuration matches artifact cost and CI retention policy.

The most valuable review question is simple: if this step fails at 2 a.m., does its title tell the on-call engineer what changed state? If not, rewrite it before adding more instrumentation.

## Validate trace usefulness in the same environment as CI

A locally readable trace can become incomplete in CI when source files are omitted, artifacts expire too quickly, or retries overwrite one another. Run a controlled failing test in the pipeline and verify the retained zip opens, contains the expected semantic steps, shows network and DOM evidence, and points to source that matches the tested commit.

Give every artifact an unambiguous association with project, shard, retry, and test result through the reporter and CI artifact layout. Do not build names by inserting customer data or secret environment values. When multiple browser projects run the same scenario, reviewers need to identify Chromium, Firefox, or WebKit before drawing conclusions from rendering and timing.

Retention should follow investigation needs and data policy. Traces can contain page text, request details, screenshots, and source code. Restrict artifact access, redact or avoid sensitive fixture data, and expire files according to your organization's policy. A custom step title that avoids secrets does not sanitize the DOM snapshot underneath it.

Test artifact failure behavior too. If upload fails, the test result should remain truthful and the pipeline should expose that diagnostics are missing. It should not turn a product pass into a product failure unless artifact retention is itself a required compliance control. Conversely, a failed test with a missing trace must not be relabeled flaky simply because evidence is unavailable. Fix the artifact path, reproduce with the same inputs, and preserve the original outcome.

## Frequently Asked Questions

### Should I use test.step or context.tracing.group for Playwright tests?

Use \`test.step()\` in tests executed by \`@playwright/test\`. It integrates with the test report and Trace Viewer, includes runner-managed assertion context, supports nesting, and automatically closes when its callback settles. Use \`context.tracing.group()\` for Playwright library scripts that manage a \`BrowserContext\` directly. In that lower-level mode, you must manage trace start, group closure, and trace stop. Mixing both lifecycle owners in a normal runner test adds complexity without improving the artifact.

### How many custom steps should one end-to-end test contain?

Use enough steps to expose distinct business phases, but not enough to duplicate every built-in Playwright action. A typical transaction might have setup, input, submission, and persistence verification phases. Add a nested step when a phase contains a separate decision, integration, or ownership boundary. Treat any numeric target as illustrative. The better test is whether a failed step title narrows diagnosis. If "Click button" and its contained click say the same thing, remove the wrapper.

### Can a custom Playwright step return data to the rest of the test?

Yes. \`test.step()\` returns the value produced by its callback, so a creation step can return an order id, token-safe alias, or parsed domain object. Await the step and assign that value directly. This pattern is clearer than mutating an outer variable and using a non-null assertion later. It also makes the dependency between phases explicit. Avoid returning locators that depend on a page state likely to change before the next phase; return stable domain data when possible.

### Why are later actions nested under the wrong tracing group?

The usual cause is an unclosed low-level group. An exception occurred after \`context.tracing.group()\`, so execution skipped \`groupEnd()\` and the group's stack remained active. Put each manual group closure in a \`finally\` block, and ensure either the helper or its caller owns cleanup, not both. Also avoid overlapping manual groups from concurrent tasks on the same browser context. In Playwright Test, prefer callback-scoped \`test.step()\`, whose lifetime naturally follows the awaited callback.
`,
};
