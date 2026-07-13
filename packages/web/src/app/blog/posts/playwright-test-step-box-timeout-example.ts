import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright test.step() Box and Timeout Example',
  description:
    'Use Playwright test.step() box and timeout options to produce readable traces, precise failures, and bounded setup or workflow steps in TypeScript tests.',
  date: '2026-07-13',
  category: 'Reference',
  content: `
# Playwright test.step() Box and Timeout Example

The trace says the checkout test failed, but the useful question is where: while adding the delivery address, while authorizing the card, or while waiting for the confirmation state. A flat sequence of Playwright calls forces the reader to reconstruct that workflow from dozens of actions. \`test.step()\` gives those actions named boundaries, and its \`box\` and \`timeout\` options decide where failures are reported and how long a boundary may run.

This reference focuses on those two options in \`@playwright/test\`. It shows their exact call shape, explains how step timeouts interact with test and action timeouts, and demonstrates patterns that remain useful in HTML reports and Trace Viewer. The aim is not to wrap every click. It is to expose business phases and risky infrastructure operations without hiding the line that actually broke.

## The step callback is the execution boundary

\`test.step(title, body, options)\` runs the asynchronous callback immediately and returns whatever that callback resolves to. A step is not a separate test, hook, worker, or retry unit. It shares the current page, fixtures, test timeout, and retry attempt. Nested steps are allowed, which makes them suitable for a short hierarchy such as \`Checkout\` -> \`Enter payment\` -> \`Submit challenge\`.

The options relevant here are compact:

| Option | Type | Effect | Best reason to use it |
|---|---|---|---|
| \`box\` | \`boolean\` | Reports errors at the step call site instead of the failing operation inside it | Present a reusable workflow as one diagnostic unit |
| \`timeout\` | \`number\` | Fails the step if its callback does not finish within the given milliseconds | Put a stricter budget around a known phase |

The title should describe an observable activity, not an implementation detail. \`Choose next-day delivery\` is more useful than \`Call selectOption\` because the title survives a locator or UI refactor. Titles appear in reports and traces, so include dynamic values only when they help identify the case, such as an order reference or region. Never place access tokens, card numbers, or customer secrets in a title.

Here is a complete example using both options. The inner function returns the order identifier, demonstrating that a step can provide data to the rest of the test.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('guest can complete checkout', async ({ page }) => {
  await page.goto('/cart');

  const orderId = await test.step(
    'Submit guest checkout',
    async () => {
      await page.getByRole('button', { name: 'Checkout' }).click();
      await page.getByLabel('Email').fill('buyer@example.test');
      await page.getByLabel('Card number').fill('4242424242424242');
      await page.getByRole('button', { name: 'Place order' }).click();

      const confirmation = page.getByTestId('order-confirmation');
      await expect(confirmation).toBeVisible();
      return (await confirmation.getAttribute('data-order-id'))!;
    },
    { box: true, timeout: 20_000 },
  );

  await expect(page.getByText(\`Order \${orderId} confirmed\`)).toBeVisible();
});
\`\`\`

The callback must be awaited. Omitting \`await\` lets the test continue while the step is still running, which can create overlapping actions and misleading reports. Returning a promise from the callback is fine because \`test.step\` awaits it.

## What boxed reporting changes

Without boxing, Playwright points to the operation or assertion inside the callback. That precision is excellent when the test body owns the code. With \`box: true\`, the failure points to the \`test.step(...)\` invocation. The internal actions still exist in the trace, but the prominent stack location identifies the workflow boundary.

Imagine a page object method named \`signInAs\`. Its implementation may contain seven locators and assertions. A consumer test usually wants to know that the sign-in operation failed at its call site. A maintainer debugging the page object may prefer the exact failing line. Boxing deliberately chooses the first perspective.

| Situation | Box the step? | Diagnostic consequence |
|---|---:|---|
| Three actions written directly in one test | Usually no | Failure highlights the exact action the test author can edit |
| Shared authentication workflow used by many specs | Often yes | Each caller points at the failed workflow invocation |
| Broad end-to-end phase with several nested steps | Box only the outer public phase | Report stays readable while inner steps retain precision |
| Experimental test under active locator debugging | No | Direct source locations speed iteration |
| Helper that catches and replaces errors | Avoid that design | Boxing cannot recover stack detail already discarded by custom error handling |

Boxing is a presentation choice, not exception handling. It does not swallow an error, change its class, take another screenshot, or rerun the callback. It also does not make an atomic transaction. If the callback creates a record and later fails, cleanup is still your responsibility.

A practical compromise is a boxed public method with unboxed nested phases. The report shows the page-object call as the headline while Trace Viewer retains the internal map.

\`\`\`typescript
import { expect, test, type Page } from '@playwright/test';

class TransferPage {
  constructor(private readonly page: Page) {}

  async send(amount: string, recipient: string) {
    return test.step(
      \`Send \${amount} to \${recipient}\`,
      async () => {
        await test.step('Enter transfer details', async () => {
          await this.page.getByLabel('Recipient').fill(recipient);
          await this.page.getByLabel('Amount').fill(amount);
        });

        await test.step('Review and authorize', async () => {
          await this.page.getByRole('button', { name: 'Review' }).click();
          await expect(this.page.getByText(recipient, { exact: true })).toBeVisible();
          await this.page.getByRole('button', { name: 'Authorize' }).click();
        });

        const receipt = this.page.getByTestId('transfer-receipt');
        await expect(receipt).toBeVisible();
        return receipt;
      },
      { box: true, timeout: 15_000 },
    );
  }
}

test('operator sends a transfer', async ({ page }) => {
  await page.goto('/transfers/new');
  const receipt = await new TransferPage(page).send('25.00', 'QA Sandbox');
  await expect(receipt).toContainText('Completed');
});
\`\`\`

This use of a dynamic title is safe because the values are controlled test data. If a title comes from production-like input, sanitize it and keep it short.

## Step-specific timeouts versus the other clocks

Playwright has several independent time budgets. Confusing them produces tests that fail at a different layer than intended. A step timeout limits the entire callback, including actions, assertions, API calls, nested steps, and ordinary awaited promises. Its clock starts when the callback begins.

| Clock | Typical configuration point | What it bounds |
|---|---|---|
| Test timeout | \`timeout\` in config or \`test.setTimeout()\` | Test body, fixture setup, and associated lifecycle according to runner rules |
| Step timeout | \`{ timeout: milliseconds }\` on \`test.step\` | One step callback as a whole |
| Action timeout | \`use.actionTimeout\` or action option | A click, fill, check, and other Playwright actions |
| Navigation timeout | \`use.navigationTimeout\` or navigation option | Navigation operations |
| Assertion timeout | \`expect.timeout\` or matcher option | Retrying web-first assertions |

The first expiring applicable clock wins. Suppose a step has 8 seconds remaining and starts an assertion with a nominal 15-second timeout. The step cannot grant time beyond its own deadline. Conversely, a 30-second step does not make a click with a 5-second action timeout wait longer.

Use this layering intentionally. The test might have a 60-second overall budget, checkout a 20-second phase budget, and the final confirmation assertion a 10-second convergence budget. A failure then communicates which service-level expectation was violated.

Do not put an aggressive step timeout around cold startup without controlling the environment. Browser launch, first database connection, or a lazily built frontend can vary widely on a shared CI runner. A useful timeout describes a product or infrastructure expectation, not the speed of a developer laptop.

## Timing a nested step without creating a race

A timeout should cancel the test's wait, but external work may already have happened. If a click submits a payment at 9.9 seconds and the step expires at 10 seconds, retrying the entire test can submit twice unless the system uses an idempotency key or isolated data. This is not unique to Playwright. It is the usual difference between abandoning a wait and rolling back a distributed operation.

For mutation-heavy steps:

1. Generate a unique business identifier before the step.
2. Send it through the UI or API as an idempotency key where supported.
3. On failure, query durable state before deciding whether to retry manually.
4. Make afterEach cleanup tolerant of partially created data.

Nested timeouts need similar thought. Give an inner phase a smaller budget than its parent and leave room for subsequent phases. If an outer step has 20 seconds and the first nested step also has 20 seconds, the second nested step may never receive a meaningful opportunity to run.

## Reading steps in Trace Viewer and reports

Steps become most valuable when the title hierarchy matches the user's path. In Trace Viewer, select the failed step and inspect its actions, snapshots, network activity, and console entries. A boxed location gets you to the workflow call; the trace gets you back to the locator and browser state. For a deeper tour of these artifacts, use the [Playwright Trace Viewer guide](/blog/playwright-trace-viewer-guide-2026).

The HTML report also displays annotations and attachments associated with the test. Keep step names stable enough that humans can scan retries, but do not depend on titles as a machine-readable metrics format. Report schemas and reporters can evolve. If you need latency telemetry, measure it explicitly and publish a structured attachment or metric.

When a timed-out step appears, inspect the last completed action. If there is no Playwright action near the deadline, the callback may be awaiting application code, a custom polling loop, or an unresolved promise. If one locator consumes the budget, check whether it is correct before raising the limit. The trace frequently distinguishes “element never existed” from “element existed but remained covered or disabled.”

## Decorators, page objects, and step ownership

Playwright documentation demonstrates decorators as one way to wrap page-object methods in steps. That technique can reduce repetition, but explicit \`test.step\` calls are easier to search and allow each method to choose a title, timeout, and boxing policy. A decorator also needs careful TypeScript configuration and must preserve \`this\`, arguments, return values, and thrown errors.

Prefer steps at the orchestration layer when a page object exposes small mechanical methods. If every \`fill()\` and \`click()\` becomes its own step, the report duplicates Playwright's action log. A useful step adds domain meaning that the raw action cannot provide.

Good boundaries include:

- Provision an account through an API and open its dashboard.
- Configure shipping for a hazardous item.
- Complete a WebAuthn challenge in a test authenticator.
- Verify eventual replication in a secondary region.

Weak boundaries include “click button,” “wait,” and “assert text.” Those are already visible as actions. A full list of runner settings that affect these examples is in the [Playwright test config options reference](/blog/playwright-test-config-options-complete-reference).

## Failure patterns that step options cannot fix

Step metadata makes failures legible; it does not repair synchronization. Avoid using a long step timeout to mask a locator that targets a transient spinner or a network request that is never awaited correctly. Likewise, \`box: true\` should not be used to conceal poor helper design.

Review these common smells:

| Smell | Why the step still fails | Better response |
|---|---|---|
| Fixed sleep inside the callback | Time passes without observing readiness | Wait on a user-visible state or relevant response |
| One 90-second step for the full scenario | The boundary conveys no locality | Split around real workflow phases |
| Catching every error and throwing “Checkout failed” | Original matcher and stack context disappear | Add a meaningful step title and let the error propagate |
| Boxing every nested helper | All arrows point to wrappers | Box only the public boundary that consumers own |
| Raising the step budget after CI failures | Incorrect waits remain incorrect for longer | Use trace evidence to locate the consumed time |

If cleanup must run after an error, use normal test fixtures, hooks, or \`try/finally\` where local ownership is clear. Do not catch merely to rename the error; the step title already supplies context.

## A review checklist for step boundaries

Before merging a step-heavy test, read only the titles. They should tell a coherent scenario without reproducing every DOM operation. Then inspect the deadlines. Each should represent a defensible phase budget and fit within the surrounding test timeout. Finally, force one internal assertion to fail and confirm the report points where the team expects.

Pay special attention to return types. A callback returning a locator is safe because locators are lazy, but returning an \`ElementHandle\` can couple later code to stale DOM state. Return business data or locators when possible. If the callback returns nothing, let TypeScript infer \`Promise<void>\`.

The best outcome is a report that says “Review and authorize” failed, highlights the correct public workflow call, and still lets the investigator drill into the exact assertion. That is the value of combining deliberate boundaries with selective boxing.

## Attach evidence to the step that owns it

A named phase is also a useful place to collect narrowly relevant evidence. For an API-assisted setup step, attach the sanitized request identifier or created entity ID after the call succeeds. For a visual workflow, a screenshot may clarify a state that the automatic failure capture misses. Use \`test.info().attach()\` with an explicit content type, and keep attachments small enough that retries do not overwhelm the report.

Attachment timing matters. Evidence recorded after the callback returns belongs to the test but may be visually separated from the step that produced it. When investigators need a tight association, create the attachment inside that callback. Never attach raw session storage, authorization headers, or unredacted backend responses merely because the test is failing.

Annotations and steps serve different readers. A step explains what the running scenario is doing; an annotation can classify a known issue, risk, or test property. Do not encode ticket numbers into every step title. Stable domain titles remain readable after the ticket closes, while annotations can carry lifecycle metadata.

When a timeout is under investigation, attach structured timing only if it measures real milestones. A JSON record with phase start, phase finish, request ID, and observed status is better than a prose dump. Avoid deriving an SLA from report duration because reporter overhead, tracing, screenshots, and retries affect it.

## Version awareness for box and timeout

Suites pinned to older Playwright releases may not accept every step option. Check the installed \`@playwright/test\` version and its matching documentation before copying a configuration from a newer project. TypeScript normally flags an unknown option when the package types and editor use the same installation.

Do not work around a type error with \`as any\`. That can turn a version mismatch into an option silently ignored at runtime. Upgrade deliberately, review release notes, rebuild the lockfile through the project's normal dependency process, and run a deliberately failing example to confirm the report location and deadline behavior.

If a library publishes page objects for several consumer repositories, its public methods should not assume all consumers have the same runner version. Declare the compatible Playwright range and test the oldest supported release. Step calls happen in runner context, so a helper compiled successfully against one version can still surprise a consumer resolving another.

## Frequently Asked Questions

### Does a \`test.step()\` timeout replace the test timeout?

The step deadline is an additional, narrower clock rather than a replacement. The containing test timeout still applies, as do action, navigation, and assertion timeouts. Whichever relevant deadline expires first determines the failure.

### Does \`box: true\` hide actions from Trace Viewer?

Boxing changes the prominent reported source location without removing trace actions. Everything performed inside the callback remains available, which is why a boxed page-object boundary can still be investigated at action level.

### Can a step return a value?

A step can return any value its callback resolves. \`await test.step(...)\` can therefore provide an order ID, API response, or locator needed by the next phase. Preserve type inference by returning the value directly.

### Should every page-object method be boxed?

Selective boxing produces better diagnostics. Box methods that form a public workflow boundary and whose callers benefit from seeing the invocation site. Leave low-level or actively debugged helpers unboxed so the failing line remains immediate.

### Will Playwright retry only the failed step?

Runner retries operate at test level, never at an isolated step boundary. A failed step fails its test attempt, and a configured retry starts a new attempt with the normal fixture lifecycle. Design state-changing steps with that replay behavior in mind.
`,
};
