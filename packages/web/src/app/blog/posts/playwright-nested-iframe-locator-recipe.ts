import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Playwright Nested iframe Locator Recipe",
  description:
    "Use Playwright nested iframe locators to cross multiple frame boundaries reliably, assert the right document, and diagnose dynamic embed failures.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Playwright Nested iframe Locator Recipe

The payment button is visible in DevTools, yet Playwright insists it does not exist. The missing detail is architectural: the button lives inside a card form iframe, which itself is mounted inside a checkout iframe. A page locator starts in the top document, so it cannot see through either boundary. The durable solution is to model each boundary explicitly with Playwright's \`frameLocator()\` API.

Nested frames appear in payment widgets, identity checks, advertising consoles, document viewers, support tools, and older enterprise portals. They are also unusually easy to test badly. A broad selector may hit a similarly named element in the wrong document. A cached \`Frame\` can become detached after a widget reload. A fixed sleep can hide the actual synchronization requirement until CI runs under different network conditions.

This recipe builds a locator one frame at a time, explains what Playwright waits for at each step, and shows how to investigate the boundary that failed. It assumes Playwright Test with TypeScript and a web application that is permitted to automate the embedded content.

## Reading the document tree before writing selectors

An iframe is not a regular container. Its element belongs to the parent document, while its loaded page creates another browsing context with its own DOM. CSS and XPath selectors do not cross that boundary. If a second iframe exists inside the first frame's document, the test must cross a second boundary.

Consider this simplified checkout tree:

\`\`\`html
<main>
  <iframe title="Checkout">
    #document
      <section>
        <iframe title="Secure card entry">
          #document
            <button>Pay now</button>
        </iframe>
      </section>
  </iframe>
</main>
\`\`\`

The target is not a descendant of either iframe element in the DOM selector sense. Playwright therefore needs three operations: locate the outer iframe, enter its document and locate the inner iframe, then query the inner document for the button.

Before automating an unfamiliar embed, inspect every frame element from the top page. Record stable attributes such as \`title\`, a product-owned \`data-testid\`, or a documented URL pattern. Avoid generated names and positional selectors unless the page contract guarantees them.

| Boundary | Good identity signal | Fragile signal | Why it matters |
|---|---|---|---|
| Host page to checkout | \`iframe[title="Checkout"]\` | \`iframe:nth-child(2)\` | Layout insertions should not redirect the test |
| Checkout to card widget | \`iframe[title="Secure card entry"]\` | A changing provider-generated \`name\` | Widget remounts often regenerate opaque identifiers |
| Card document to action | \`getByRole('button', { name: 'Pay now' })\` | \`.btn.primary\` | An accessible role reflects the user-facing contract |

Browser same-origin restrictions do not prevent Playwright from automating a cross-origin iframe. Playwright operates through the browser automation protocol rather than page JavaScript. Cross-origin content can still impose bot defenses, authentication, or environment restrictions, but it does not require the test to inject JavaScript across origins.

## Chaining frameLocator through two iframe levels

The shortest correct recipe is a locator chain. \`FrameLocator\` represents content inside the matching iframe and stays lazy, just like a normal locator. Playwright resolves it when an action or assertion runs, which is valuable when React or a third-party widget replaces the iframe during startup.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('submits a card payment from a nested secure frame', async ({ page }) => {
  await page.goto('http://localhost:3000/checkout');

  const checkout = page.frameLocator('iframe[title="Checkout"]');
  const card = checkout.frameLocator('iframe[title="Secure card entry"]');

  await card.getByLabel('Card number').fill('4242 4242 4242 4242');
  await card.getByLabel('Expiry date').fill('12/30');
  await card.getByLabel('Security code').fill('123');
  await card.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
});
\`\`\`

Each variable names a document boundary rather than a visual region. That distinction makes reviews easier: a reader can immediately see that \`card\` is not a locator for an ordinary \`div\`. It also gives failure messages a logical path.

Do not call \`contentFrame()\` merely to make this example work. In modern Playwright, locator-based traversal is normally the better default because it retains retryability. A direct \`Frame\` reference is useful when the work genuinely needs frame-level methods such as evaluating frame-specific state, but it introduces lifecycle concerns that a locator chain handles for you.

The final assertion intentionally runs against \`page\`. Many embedded flows signal completion in the host application, not inside the provider frame. Assert at the location where the user observes the result. A click completing without error proves only that Playwright dispatched the action.

## Choosing strict selectors for iframe elements

Frame locators are strict. If the selector matches two frames, an operation inside the frame fails rather than silently selecting one. This behavior protects a test from acting in an unexpected advertisement, duplicate responsive embed, or stale frame.

Prefer selectors in this order when the application permits it:

1. A product-owned test id on the iframe element.
2. A stable, meaningful \`title\` used for accessibility.
3. A documented \`name\` that the integration contract controls.
4. A constrained \`src\` pattern when the origin and path are stable.
5. A structural selector only when structure is itself the tested contract.

A URL selector deserves care. Query strings may contain sessions, locale codes, experiments, or cache busters. \`iframe[src^="https://pay.example.test/card"]\` is usually less brittle than an exact URL, but it still couples the test to provider routing. A title owned by the host integration can be clearer.

If duplicate frames are intentional, narrow from a stable parent or use an explicit locator filter before entering the frame. Reaching for \`.first()\` suppresses strictness but often converts an actionable ambiguity into intermittent behavior. Use it only when ordering is a stated page invariant.

| Selector strategy | Survives iframe reload | Handles cross-origin content | Detects duplicate matches | Main risk |
|---|---:|---:|---:|---|
| Chained \`frameLocator()\` | Yes, it resolves lazily | Yes | Yes | Requires a selector for every boundary |
| \`page.frames()\` plus URL search | Only if reacquired | Yes | Only when coded explicitly | Stale references after navigation |
| CSS selector from the top page | No traversal occurs | Not applicable | Normal locator strictness | Cannot cross an iframe document boundary |
| Evaluate DOM from page JavaScript | No reliable traversal | No for cross-origin frames | Depends on script | Violates the browser origin model |

## Synchronizing with frames that attach and navigate late

An iframe element can exist before its document finishes navigating. It can also load an initial blank document, redirect, and then render the real controls. Locator actions wait for the target element to satisfy actionability checks, so a direct fill or click often supplies enough synchronization. Assertions such as \`toBeVisible()\` also retry until their timeout.

Use a semantic readiness condition when the widget has an explicit loaded state. For a card frame, that might be the visible card-number input. For a document editor, it might be a toolbar button. Waiting for a generic \`networkidle\` state is a poor substitute when the embed keeps polling or opens persistent connections.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('waits for a reloaded identity widget at each boundary', async ({ page }) => {
  await page.goto('http://localhost:3000/identity');

  const portal = page.frameLocator('[data-testid="identity-portal-frame"]');
  const documentStep = portal.frameLocator('iframe[title="Document verification"]');
  const continueButton = documentStep.getByRole('button', { name: 'Continue' });

  await expect(continueButton).toBeVisible();
  await continueButton.click();

  await expect(
    documentStep.getByRole('heading', { name: 'Choose a document' }),
  ).toBeVisible();
});
\`\`\`

This test remains meaningful if the provider replaces its inner iframe between steps. The locator describes how to find the current frame rather than holding a reference to the previous one.

There are cases where waiting for a frame URL is the actual requirement. For example, an OAuth embed may redirect from an initialization origin to an authenticated application origin. Then inspect \`page.frames()\` or use a frame-level URL assertion after obtaining the current frame. Keep URL synchronization close to the behavior it represents, and do not add a two-second delay that merely happens to cover the redirect on one machine.

Timeout placement matters. Raising the global timeout because a provider occasionally takes 45 seconds makes every failure slower. Prefer a focused assertion timeout on the readiness signal, and preserve the default timeout elsewhere. If a third-party sandbox has an explicit service-level expectation, encode that value with a comment linking it to the integration requirement.

## Diagnosing which iframe boundary failed

When a nested chain times out, first determine whether Playwright failed to find the outer frame, the inner frame, or the target control. A monolithic expression hides that distinction. Named locators and boundary assertions produce better traces and more useful CI artifacts.

Start with the iframe elements themselves. \`FrameLocator.owner()\` returns a locator for the iframe element associated with a frame locator in current Playwright versions. That can verify host-level attributes without entering the document. If the project supports older Playwright releases, keep a separate locator for the iframe element instead of depending on that convenience.

A practical investigation sequence is:

1. Assert that the outer iframe element is attached or visible in the host page.
2. Inside it, assert that the inner iframe element exists.
3. Inside the second frame, assert a distinctive heading or input.
4. Open the trace and inspect snapshots around the first failed boundary.
5. Review browser console and failed network requests for widget initialization errors.

Add temporary frame inventory logging when a provider changes its hierarchy:

\`\`\`ts
import { test } from '@playwright/test';

test('prints the frame tree for investigation', async ({ page }) => {
  await page.goto('http://localhost:3000/checkout');

  for (const frame of page.frames()) {
    console.log({ name: frame.name(), url: frame.url() });
  }
});
\`\`\`

This is diagnostic code, not the preferred selector strategy. Frame URLs may contain sensitive values, so sanitize logs before enabling them broadly in CI. Do not print payment tokens, authorization codes, or customer identifiers.

Playwright's trace viewer is especially useful because it preserves DOM snapshots, action logs, and network activity. A screenshot alone may show a blank rectangle without explaining whether the iframe never attached, its navigation failed, or an overlay blocked the control. Enable traces on the first retry in the project configuration to balance evidence with storage.

## Handling nested frames alongside shadow DOM

Some integrations combine iframe boundaries with web components. Playwright locators pierce open shadow roots automatically, but they do not pierce iframes automatically. The order is therefore important: cross each frame with \`frameLocator()\`, then use ordinary role, label, text, or CSS locators inside that document. If another iframe appears inside an open shadow root, locate that iframe from the current document and cross it explicitly.

Closed shadow roots remain inaccessible to normal Playwright locators. That is a component testability decision, not a reason to use brittle coordinate clicks. Ask the component owner for an accessible public surface, a test mode, or a higher-level integration signal.

For a deeper treatment of mixed boundaries, the [iframe and shadow DOM guide](/blog/playwright-iframe-shadow-dom-guide) explains how locator piercing differs between the two browser primitives. Broader selector, isolation, and waiting guidance belongs in [Playwright best practices](/blog/playwright-best-practices-2026), especially when deciding what belongs in page objects.

## Packaging the traversal without hiding the page structure

A helper can reduce repetition, but it should not disguise where the test crosses documents. Page-object APIs such as \`checkout.cardNumber\` can expose useful intent while constructing the frame chain in one place. Avoid a universal helper that accepts an arbitrary array of selectors. That abstraction saves a few lines while making trace failures harder to read and encouraging callers to treat frames like ordinary nested containers.

One reasonable component object owns the provider boundary:

\`\`\`ts
import type { FrameLocator, Page } from '@playwright/test';

export class SecureCardWidget {
  readonly cardFrame: FrameLocator;

  constructor(page: Page) {
    const checkoutFrame = page.frameLocator('iframe[title="Checkout"]');
    this.cardFrame = checkoutFrame.frameLocator(
      'iframe[title="Secure card entry"]',
    );
  }

  async enterCard(number: string, expiry: string, cvc: string) {
    await this.cardFrame.getByLabel('Card number').fill(number);
    await this.cardFrame.getByLabel('Expiry date').fill(expiry);
    await this.cardFrame.getByLabel('Security code').fill(cvc);
  }

  async submit() {
    await this.cardFrame.getByRole('button', { name: 'Pay now' }).click();
  }
}
\`\`\`

The class keeps selectors and navigation together without swallowing the business assertion. A checkout test can still verify the host page's receipt, rejected-card message, or retry behavior. If the provider changes its frame topology, the component object changes in one place.

Test data also deserves separation. Never use real cardholder data merely because the browser crosses a provider frame. Use documented sandbox numbers and verify that the test environment cannot create real charges. When a provider's hosted field refuses automation in production, respect that boundary and test production integration through safe monitoring or API-level evidence instead.

## Failure modes that deserve dedicated tests

A happy path proves traversal but not resilience. Nested embeds often fail at the seams between the host application and provider. Add targeted cases based on the risks your integration owns:

| Scenario | Controlled stimulus | Assertion location |
|---|---|---|
| Inner frame never becomes ready | Route or sandbox setting that withholds widget initialization | Host shows a recoverable timeout message |
| Provider rejects entered data | Documented invalid sandbox value | Error is announced inside the secure frame |
| Outer frame reloads during entry | Product-supported refresh or remount trigger | Fields return to a known state and stale data is not submitted |
| Third-party request is blocked | Browser context route for a non-sensitive test endpoint | Host fallback and support guidance appear |
| Duplicate embed is accidentally rendered | Test fixture that mounts the integration twice | Strict locator failure exposes the regression |

Do not mock away the iframe in every suite. A host-only component test can validate fallback UI quickly, while at least one browser integration test should exercise the real boundary in a provider sandbox. Conversely, making every test depend on a remote sandbox increases latency and exposes the suite to outages you do not control. Split responsibilities deliberately.

The key design principle is explicit ownership. Your test owns the host page contract and the selectors the integration exposes. The provider owns its internal markup unless it publishes automation hooks or accessible labels as a supported interface. Minimize assertions against undocumented provider internals, because they can change without your deployment.

## Testing an iframe that is removed during navigation

Some host pages remove the entire checkout iframe after a successful submission. An assertion against the old inner document can then race with detachment. Treat removal as the expected state transition and move the assertion to the host page. For example, wait for the receipt heading and optionally assert that the outer iframe element is no longer attached.

If the disappearance is unexpected, preserve evidence before retrying the action. Repeating a payment click after a detached-frame error can create a duplicate side effect. The application should protect submission with an idempotency key, and the browser test should use a sandbox plus a unique transaction identifier. A locator retry is appropriate for finding a remounted input, not for blindly repeating a non-idempotent business command.

Frame detachment errors often reveal that a test asserted inside the provider after the host had already accepted the callback. Establish which document owns completion. When both surfaces show a result, prefer the host's durable state for the end-to-end assertion and cover the provider's intermediate display only when it is a supported customer-visible contract.

## Frequently Asked Questions

### Can Playwright enter a cross-origin nested iframe?

Yes. Use \`frameLocator()\` at every iframe boundary. The browser's same-origin restriction applies to JavaScript running in the page, while Playwright drives the browser through automation APIs. Authentication, bot protection, and provider policy can still affect the test.

### Why does a nested frame locator report a strict-mode violation?

The iframe selector matched more than one element. Inspect the rendered page for duplicate desktop and mobile embeds, stale frames, or overly broad \`src\` matching. Narrow the selector using a stable attribute or parent context instead of immediately adding \`.first()\`.

### Should I store a Frame object in my page object?

Usually not for routine element actions. A chained \`FrameLocator\` is re-resolved and tolerates iframe replacement better. Store or obtain a \`Frame\` only when frame-specific operations justify it, and account for detachment or navigation.

### How many frameLocator calls are needed for three nested iframes?

Three. Each call crosses exactly one iframe boundary. After the third \`frameLocator()\`, use a normal locator for content in the innermost document.

### Why is the iframe visible while the button still times out?

The frame element and its document have separate lifecycles. The element may be rendered while the inner page is blank, redirecting, blocked by CSP or network failure, or still initializing. Assert a semantic readiness element inside the frame and inspect the trace plus failed requests.
`,
};
