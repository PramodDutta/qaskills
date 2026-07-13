import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress “Uncaught Exception” Test Failure Fix',
  description:
    'Fix Cypress uncaught exception failures with scoped, evidence-based handling that suppresses only known noise while preserving real application defects.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Cypress “Uncaught Exception” Test Failure Fix

The checkout assertion never ran. A marketing widget rejected a promise during page load, Cypress reported an uncaught application exception, and the test stopped before it could inspect the cart. Returning \`false\` for every exception would make the build green, but it would also silence a null dereference in the payment form tomorrow.

The durable fix is to identify the exception's owner, reproduce it, and choose the narrowest handling scope. Cypress fails the current test when an application error reaches the window's global \`error\` or \`unhandledrejection\` handling. Its \`uncaught:exception\` event lets you observe that error and, by returning \`false\`, prevent that specific event from failing the test. That control is powerful enough to remove noise and dangerous enough to erase product defects.

## First determine whose exception it is

An "uncaught exception" describes how the error escaped, not why it happened. The stack and timing determine the response. Before editing Cypress support code, collect the error message, stack frames, page URL, browser, and action immediately preceding failure.

| Origin | Typical evidence | Preferred response |
|---|---|---|
| First-party application bundle | Stack points to deployed app source | Fix the application and retain failure |
| Third-party analytics or chat script | Vendor host or identifiable SDK frame | Stub vendor, block script, or narrowly suppress known signature |
| Browser extension | Extension URL in interactive Chrome only | Run a clean browser profile or CI browser |
| Cypress test code | Stack points to spec/support command | Fix command chain or assertion, not exception handling |
| Expected deliberate crash scenario | Test triggers known window error | Capture it with a test-scoped listener and assert its identity |
| Unhandled rejected network promise | Rejection message follows failed API call | Repair app rejection handling or control the dependency |

Re-run once with the browser console and network panel open. If source maps are available, resolve minified frames. An error that appears only in CI may depend on blocked third-party network access, a stricter Content Security Policy, or timing under load. Preserve the actual evidence before adding a conditional rule.

Record whether the exception happens before or after \`cy.visit()\` resolves. A load-time crash may prevent the page from establishing its normal error boundary, while an action-time crash belongs to a specific user path. Reproduction timing helps the owning developer choose a repair and keeps the test waiver attached to the smallest meaningful scenario.

## Understand Cypress's default failure boundary

Cypress distinguishes failures in the application under test from failures in Cypress commands, but both normally fail the test. The \`uncaught:exception\` application event yields the error and current Mocha runnable. For an unhandled promise rejection, a third argument can identify the promise.

Returning \`false\` tells Cypress not to fail because of that application exception. Returning nothing preserves the default failure. Throwing another error also fails. The safe pattern is therefore an allowlist with a narrow positive match and no catch-all return.


\`\`\`typescript
// cypress/support/e2e.ts
const ignoredThirdPartyErrors = [
  {
    message: /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/,
    stackOrigin: /widgets\.example-cdn\.test/,
  },
] as const;

Cypress.on('uncaught:exception', (error) => {
  const rule = ignoredThirdPartyErrors.find(
    ({ message, stackOrigin }) =>
      message.test(error.message) && stackOrigin.test(error.stack ?? ''),
  );

  if (rule) {
    return false;
  }

  // No return means Cypress keeps its normal fail-the-test behavior.
});
\`\`\`

Even this rule needs ownership and review. A message-only substring such as \`ResizeObserver\` could suppress first-party layout code with the same symptom. Route, stack origin, browser, and a linked vendor issue can make a waiver more precise. Remove the rule after the dependency is upgraded or isolated. If production source maps rewrite the stack, test the predicate against the stack shape Cypress actually receives.

## Choose global Cypress.on or test-scoped cy.on

\`Cypress.on()\` registers a global listener that persists for the test run. If it is placed in a \`beforeEach\` hook, another listener is added on every test and Cypress does not automatically remove those global registrations. That can cause one exception to invoke the handler many times.

\`cy.on()\` binds to the current test's \`cy\` instance and is automatically removed when that test ends. Use it for a single scenario that intentionally causes or tolerates a known error.

| Listener | Lifetime | Appropriate placement | Cleanup behavior |
|---|---|---|---|
| \`Cypress.on('uncaught:exception', handler)\` | Entire run | Support file, registered once | Must be manually removed if temporary |
| \`cy.on('uncaught:exception', handler)\` | Current test | Inside the owning test | Automatically unbound after test |
| \`Cypress.once(...)\` | First matching emission globally | Short diagnostic experiment | Removes itself after invocation |
| \`Cypress.off(...)\` | Explicit removal | Paired with a stored handler reference | Requires the same event and callback |

Global policy is suitable only for a truly suite-wide, documented condition. A one-page widget failure should not change exception behavior for account settings, billing, and administration specs.

## Assert an expected crash instead of merely ignoring it

Some tests intentionally trigger broken input in legacy code or validate a global error boundary. In that case, the exception is part of the expected outcome. Capture its exact signature and prove it occurred.

\`\`\`typescript
describe('legacy tax calculator error boundary', () => {
  it('reports an unsupported jurisdiction and preserves the order', () => {
    let observed = false;

    cy.on('uncaught:exception', (error) => {
      expect(error.message).to.eq('Unsupported jurisdiction: AQ');
      observed = true;
      return false;
    });

    cy.visit('/checkout?jurisdiction=AQ');
    cy.get('[data-testid="calculate-tax"]').click();
    cy.get('[role="alert"]').should('contain.text', 'Tax calculation is unavailable');
    cy.then(() => {
      expect(observed, 'expected application exception was observed').to.eq(true);
    });
  });
});
\`\`\`

The queued \`cy.then()\` runs after the earlier commands and verifies the event was observed. The important points are test scope, an exact message, a visible recovery assertion, and proof that the expected event actually happened. Without the \`observed\` check, the scenario could pass after the application stops throwing, leaving obsolete exception suppression behind.

Do not call \`cy.get()\`, \`cy.task()\`, or other Cypress commands from a global \`Cypress.on()\` callback. Global callbacks execute outside the ordinary command queue. Capture synchronous facts and assert them later within the test chain.

## Prefer controlling the failing dependency

If an advertising, analytics, consent, or chat script is irrelevant to the scenario, excluding it from the test environment is often cleaner than accepting its crashes. Possible controls include a feature flag, a test Content Security Policy, a network intercept for the vendor endpoint, or a stub injected before application code loads.

Suppose the application calls a telemetry endpoint and mishandles a rejected response. A deterministic intercept can expose the first-party bug:

\`\`\`typescript
describe('telemetry isolation', () => {
  it('continues checkout when telemetry is unavailable', () => {
    cy.intercept('POST', 'https://telemetry.example.net/v2/events', {
      forceNetworkError: true,
    }).as('telemetryFailure');

    cy.visit('/checkout');
    cy.get('[data-testid="place-order"]').click();

    cy.wait('@telemetryFailure');
    cy.get('[data-testid="confirmation-number"]').should('be.visible');
  });
});
\`\`\`

This test should pass only if application code handles the rejected telemetry request. If it throws globally, Cypress fails and the product defect is clear. By contrast, globally ignoring all promise rejections would incorrectly certify resilience.

Network interception cannot replace every third-party script cleanly. Scripts may use dynamic URLs, iframes, or integrity attributes. A product-owned feature switch is usually the most maintainable test seam because it expresses that the external feature is outside the scenario. Keep at least one separate integration check with the real dependency if the widget matters to customers.

## Handle cross-origin exceptions where they execute

When an exception originates inside a \`cy.origin()\` block, register the handler within that block. A listener in the primary origin does not automatically govern the secondary origin's Cypress execution context.

\`\`\`typescript
it('returns from the partner portal despite its known unload error', () => {
  cy.visit('/integrations/partner');

  cy.origin('https://partner.example.test', () => {
    cy.on('uncaught:exception', (error) => {
      if (error.message === 'Known partner unload callback failure') {
        return false;
      }
    });

    cy.get('a').contains('Return to merchant').click();
  });

  cy.location('pathname').should('eq', '/integrations/partner/complete');
});
\`\`\`

The equality check is intentionally strict and local to the partner scenario. If the partner changes its error, the waiver stops matching. That creates maintenance pressure in the correct direction: investigate the new behavior rather than silently expanding the filter.

Cross-origin code also complicates stack inspection and source mapping. Record which origin emitted the exception in the waiver comment and confirm the handler is registered in the correct scope. A primary-origin wildcard that appears not to work may simply be attached to the wrong execution context.

## Treat unhandled promise rejections as first-class defects

It is tempting to suppress every exception whose third callback argument is a promise. That is far too broad. Modern applications use promises for critical payment, authentication, and persistence work. An unhandled rejection means no application code accepted responsibility for that failure.

Use the promise argument for classification, not blanket permission. If a browser-specific library produces a documented, harmless rejection, match its error signature and scenario. Otherwise let Cypress fail. Then add application error handling and assert the user-visible fallback.

The quality question is not "did the page stay open?" It is "did the application preserve its contract when an asynchronous dependency failed?" A checkout may remain visible while losing the order. Assert durable outcome, notification, retry affordance, and duplicate prevention as appropriate.

## Keep a waiver register with an exit condition

Exception suppression is operational debt. Each accepted signature should have an owner, reason, scope, and removal trigger. This can live beside the rules in code rather than in a distant spreadsheet.

| Waiver field | Example | Why it matters |
|---|---|---|
| Exact signature | \`Known partner unload callback failure\` | Prevents wildcard masking |
| Affected route | Partner return flow | Limits blast radius |
| Owner | Integrations team | Gives triage a destination |
| External reference | Vendor issue identifier | Preserves evidence without inventing context |
| Expiry or removal event | Next SDK upgrade | Stops permanent accumulation |
| Recovery assertion | Completion route visible | Proves customer outcome remains intact |

Review the register when updating Cypress or the dependency. An error may disappear, change shape, or become harmful. An unused test-scoped handler with an \`observed\` assertion will fail when the exception disappears, prompting removal. A global handler cannot prove its rule was exercised as easily, another reason to keep global policy sparse.

## Common fixes that create larger problems

The shortest internet answer is often a support-file handler that always returns \`false\`. It disables Cypress's application exception safety net for every test. Avoid it.

Likewise, binding to the \`fail\` event and not rethrowing is broader than handling application exceptions. It can suppress failed assertions, missing elements, command timeouts, and Cypress errors. The Cypress documentation strongly discourages turning legitimate failures into passes this way.

Adding arbitrary waits may change timing enough to hide the exception, but does not repair ownership or recovery. Retrying the whole spec can produce intermittent green builds while customers still encounter the crash. Disabling source maps makes triage harder. Catching errors in application code without a fallback can be just as misleading as ignoring them in Cypress.

Use the [Cypress best practices guide](/blog/cypress-best-practices-2026-guide) to keep selectors, state control, and retry behavior maintainable. If your exception policy is wrapped in shared test utilities, the [Cypress custom commands guide](/blog/cypress-custom-commands-best-practices) helps avoid hiding global behavior behind an innocent-looking command.

## Preserve a sanitized exception record

A narrowly ignored exception should still be observable. Otherwise the vendor error can grow from harmless noise into a frequent customer problem without any signal. Capture a sanitized counter or synchronous record, then publish it after the test through an ordinary queued command or reporter integration.

Do not serialize the full Error object blindly. Stack traces can contain query strings, local paths, source snippets, or customer data embedded in messages. Retain an approved error code, normalized signature, origin, browser name, route template, and waiver id. Hashing a normalized stack can help correlate repeats without storing every frame.

The reporting path must not make a suppressed exception fail unrelated tests unless that is the explicit budget policy. A scheduled audit can aggregate waived signatures and fail if an allowlisted error suddenly appears on new routes or exceeds an agreed threshold. Mark approximate thresholds as operational policy, not universal Cypress behavior.

## Verify the handler itself with a deliberate neighbor error

For every conditional waiver, test both the accepted signature and a nearby unexpected signature. If the rule matches \`Known partner unload callback failure\`, inject or simulate \`Known partner payment callback failure\` and confirm Cypress still fails. This negative neighbor protects against broad regular expressions added during incident pressure.

You can unit-test a pure predicate outside Cypress:

\`\`\`typescript
export function isAllowedPartnerException(error: Error, pathname: string): boolean {
  return (
    pathname === '/integrations/partner/return' &&
    error.message === 'Known partner unload callback failure'
  );
}

describe('partner exception policy', () => {
  it('does not accept a payment callback failure', () => {
    expect(
      isAllowedPartnerException(
        new Error('Known partner payment callback failure'),
        '/integrations/partner/return',
      ),
    ).to.eq(false);
  });
});
\`\`\`

The Cypress event handler can call this predicate and return false only when it returns true. Pure policy tests are fast, but retain one browser test proving Cypress wiring and the user-visible fallback. Do not claim a predicate test proves the browser event fires.

## A triage sequence for CI-only failures

Start by reproducing with the same browser family and viewport used in CI. Confirm whether the error occurs in open mode, run mode, or both. Compare environment variables and network reachability. A blocked third-party request can produce an unhandled rejection that local networks never see.

Next, run the spec alone. If isolation passes but the full suite fails, inspect leaked global listeners and application state. Search support files and hooks for every \`Cypress.on('uncaught:exception')\` registration. Duplicate handlers can change observation counts and make a later rule appear to suppress an unrelated error.

Then control the dependency. Stub its response to success, HTTP failure, and forced network failure. If first-party code throws for only one condition, create a deterministic regression test around that condition. If the error is truly inside a vendor script and user behavior remains sound, write the narrow waiver with an expiration event.

Finally, inspect a deliberate unexpected exception. Temporarily trigger a distinct first-party error in a safe branch and verify the suite still goes red. This is the exception-policy equivalent of testing an alarm. A filter is safe only if adjacent defects still cross it.

## Frequently Asked Questions

### Why did Cypress fail before reaching my first assertion?

Application code can throw during page load or an earlier command. Cypress detects a global error or unhandled rejection immediately and fails the current test, regardless of where the next assertion appears.

Check the video, command log, stack, and network sequence preceding the event. The first assertion's location does not establish causality, and moving that assertion earlier will not correct an exception raised by application startup.

### Is returning false from uncaught:exception always unsafe?

No. It is appropriate for a precisely identified, noncritical exception when the handler is narrowly scoped and the test asserts the required recovery. A catch-all return is unsafe because it hides unrelated defects.

### Why does my handler run multiple times for one error?

You may be registering \`Cypress.on()\` repeatedly in \`beforeEach\`. Global listeners persist and accumulate. Register once in the support file, explicitly remove the same handler, or use the automatically cleaned-up \`cy.on()\` listener.

### Can I execute Cypress commands inside the exception callback?

Do not execute commands inside a global \`Cypress.on()\` listener because it runs outside the command queue. Capture synchronous information and assert it later in the test. Test-scoped handling should still keep the callback simple.

### How should I handle an exception thrown inside cy.origin()?

Register the \`uncaught:exception\` handler within the \`cy.origin()\` callback where the secondary-origin code runs. Match the known error tightly and assert the return journey or recovery outside it.
`,
};
