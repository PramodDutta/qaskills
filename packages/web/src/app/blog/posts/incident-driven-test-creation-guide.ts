import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Incident-Driven Test Creation Guide',
  description:
    'Turn production incidents into focused regression tests by preserving triggers, oracles, fixtures, and ownership without bloating QA suites.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Incident-Driven Test Creation Guide

The incident review ends with "add tests" in the action items, and two weeks later the repository contains a slow end-to-end scenario that nobody trusts. It clicks through the UI, waits for a queue, checks a database row, and still does not reproduce the bug that caused the outage. That is not incident-driven testing. That is guilt-driven automation.

Incident-driven test creation starts from the failure mechanism. What input, state, timing, dependency behavior, or deployment condition made the system unsafe? Which assertion would have failed before the release? Which layer can catch that failure with the least noise? The answer may be a unit test, contract test, migration test, synthetic monitor, property test, or one small end-to-end test. The incident decides the shape.

This guide gives QA leads and senior SDETs a practical way to convert outages, escaped bugs, support escalations, and data defects into durable coverage. It pairs well with [AI bug reproduction workflows](/blog/ai-bug-reproduction-guide-2026) when an agent helps isolate the failing path, and with [regression testing strategy](/blog/regression-testing-strategies-guide) when the new tests need to fit a larger suite.

## Start with the incident trigger, not the symptom

The symptom is what users saw. The trigger is the smallest condition that made the bug appear. A checkout page showing a spinner is a symptom. A PaymentIntent webhook arriving before the order write committed is a trigger. A dashboard showing negative revenue is a symptom. A refund row joined without account_id is a trigger.

| Incident symptom | Likely trigger to investigate | Test shape that may fit |
|---|---|---|
| User saw paid order as pending | Webhook arrived before local order transaction completed | Integration test around event ordering and idempotent state transition |
| Search page returned no results | Empty query cache entry persisted after provider timeout | Unit or service test for cache write policy on error |
| Report doubled revenue | Replay file processed without stable event dedupe | Data transformation test with duplicate source rows |
| Login failed for invited users | User record existed without accepted_terms timestamp | API test for invite-created account state |
| Mobile checkout button was hidden | Responsive layout broke at one viewport width | Component or visual regression test at exact breakpoint |

Do not ask "what test can we add?" too early. Ask "what would have made this release obviously unsafe?" The answer may be an assertion in a place the team already tests.

## Incident timeline to test hypothesis

A useful incident timeline has more than timestamps. It shows state transitions. Capture the deployment version, configuration, data shape, external dependency behavior, and user action that mattered.

| Timeline fact | Testing value | Example |
|---|---|---|
| First bad deploy | Identifies code diff under test | Release 2026.07.09 changed tax calculation |
| First affected input | Becomes fixture seed | Cart with coupon plus shipping country CA |
| External event order | Becomes ordering scenario | invoice.paid arrived before customer.updated |
| Missing observability | Becomes assertion or monitor | No metric for retry exhaustion |
| Recovery action | Reveals invariant | Recomputing balances from ledger fixed totals |

If the timeline cannot name the trigger, pause before writing automation. A vague regression test will be expensive and weak. A precise reproduction may take longer today and save many false failures later.

## Write the failing test before broadening coverage

The first test should fail on the buggy build. If you cannot run the old build, make the test fail against a local reproduction branch or a small extracted function. This is how you prove the test is tied to the incident rather than nearby behavior.

The following example comes from a common incident pattern: duplicate webhook delivery created duplicate entitlements. The correct behavior is that the second delivery is accepted but does not repeat the side effect.

\`\`\`ts
import assert from 'node:assert/strict';

type Order = {
  id: string;
  paid: boolean;
  entitlementCount: number;
  processedEvents: Set<string>;
};

function applyCheckoutCompleted(order: Order, eventId: string) {
  if (order.processedEvents.has(eventId)) {
    return order;
  }

  order.processedEvents.add(eventId);
  order.paid = true;
  order.entitlementCount += 1;
  return order;
}

function testDuplicateWebhookDoesNotGrantTwice() {
  const order: Order = {
    id: 'order_1001',
    paid: false,
    entitlementCount: 0,
    processedEvents: new Set(),
  };

  applyCheckoutCompleted(order, 'evt_checkout_1');
  applyCheckoutCompleted(order, 'evt_checkout_1');

  assert.equal(order.paid, true);
  assert.equal(order.entitlementCount, 1);
  assert.deepEqual([...order.processedEvents], ['evt_checkout_1']);
}

testDuplicateWebhookDoesNotGrantTwice();
\`\`\`

This is not pretending to test Stripe, the HTTP server, or the database. It tests the recovered invariant: one provider event grants one entitlement. A separate integration test can verify signature handling and persistence. The incident test is small because the failure mechanism is small.

## Pick the lowest layer that still proves the incident

End-to-end tests are tempting after incidents because they feel realistic. They are also slow, broad, and often vague. Use the lowest layer that can fail for the same reason the incident happened. If the bug was in a pure calculation, write a unit test. If the bug was between services, write a contract or integration test. If the bug was visible only through real browser layout, write a UI or visual test.

| Failure mechanism | Lowest useful layer | Why |
|---|---|---|
| Incorrect tax rounding for one jurisdiction | Unit or service test | Browser adds no evidence |
| API accepted invalid status transition | API integration test | Database and domain state must be observed |
| Consumer ignored duplicate message | Message-handler test plus broker integration | Need idempotency and ack behavior |
| CSS hid critical button on small screen | Component, visual, or browser test | Layout engine matters |
| Migration dropped nullable legacy values | Migration test against database | ORM unit test cannot prove SQL behavior |
| CDN cached private response | Environment or synthetic test | Local unit test cannot model edge caching |

The phrase "lowest useful layer" matters. The lowest layer is not always a unit test. A race between a queue and a database transaction may require an integration harness. A browser-only rendering issue needs a browser.

## Preserve the incident artifact as a fixture

Every incident has artifacts: payloads, logs, screenshots, SQL rows, traces, HAR files, message envelopes, feature flag settings, or customer state. Convert the smallest safe artifact into a fixture. Redact secrets and personal data. Keep the fields that caused the failure.

For a data incident, the fixture might be three rows. For an API incident, it might be one JSON payload with an unexpected null. For a UI incident, it might be a viewport and a feature flag combination.

\`\`\`ts
import assert from 'node:assert/strict';

type InvoiceRow = {
  invoiceId: string;
  accountId: string | null;
  amountCents: number;
  kind: 'charge' | 'refund';
};

function accountNetRevenue(rows: InvoiceRow[]) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    if (!row.accountId) {
      continue;
    }

    const sign = row.kind === 'refund' ? -1 : 1;
    totals.set(row.accountId, (totals.get(row.accountId) ?? 0) + sign * row.amountCents);
  }

  return totals;
}

function testRefundWithoutAccountDoesNotCreateNegativeUnknownBucket() {
  const incidentRows: InvoiceRow[] = [
    { invoiceId: 'inv_1', accountId: 'acct_1', amountCents: 5000, kind: 'charge' },
    { invoiceId: 'inv_2', accountId: null, amountCents: 5000, kind: 'refund' },
  ];

  const totals = accountNetRevenue(incidentRows);

  assert.equal(totals.get('acct_1'), 5000);
  assert.equal(totals.has('unknown'), false);
}

testRefundWithoutAccountDoesNotCreateNegativeUnknownBucket();
\`\`\`

The fixture is tiny, but it preserves the important fact: a refund row without accountId should not be joined into a fake bucket that changes customer revenue. That beats a large anonymized production export nobody understands.

## Translate root cause into an oracle

An oracle is how the test knows pass from fail. Incident action items often skip this. "Test checkout webhooks" is not an oracle. "A duplicate checkout.session.completed event does not create a second entitlement" is an oracle.

Good incident oracles are observable and stable:

| Weak action item | Strong oracle |
|---|---|
| Add tests for billing webhooks | Same event ID processed twice leaves one entitlement and one audit record |
| Cover mobile checkout | At 390 by 844 viewport, Pay button is visible and enabled after address entry |
| Test late data | Event with older event_time but newer ingestion_time updates the correct partition |
| Check search timeout | Provider timeout does not write empty result to shared cache |
| Add migration test | Legacy null display_name migrates to account email fallback |

The stronger version says what must be true. That is what belongs in code.

## Avoid permanent incident museums

Not every incident needs a forever test. Some tests should be deleted after architecture changes remove the risk. Others should become general coverage instead of keeping incident-specific names. Keep the first regression test precise, then decide later whether it belongs in a broader suite.

Mark incident tests with an issue ID or postmortem link in the test name, tag, or comment only when your repository convention supports it. Do not paste the whole postmortem into the test. The test should explain the invariant.

## When AI agents help with incident-driven coverage

AI coding agents can accelerate reproduction, but they need constraints. Ask the agent to identify the smallest failing input, not to "add more tests." Provide logs, stack traces, payloads, and the suspected commit range. Review the generated test for the same standards: it must fail on the buggy behavior, assert the incident oracle, and live at the right layer.

Useful agent prompts:

1. "Given this payload and handler, produce the smallest test that fails before the idempotency fix."
2. "Extract a fixture from this log line, redacting personal data, and write an API test for the rejected status transition."
3. "Find the lowest layer where this timezone boundary bug can be tested without a browser."

Reject generated tests that only snapshot broad output or add sleeps. Incident-driven tests should get sharper, not larger.

## CI placement after the fix

Once the test proves the fix, decide where it runs. A critical payment idempotency test should run on every pull request touching billing. A slow synthetic CDN cache test may run after deployment. A data reconciliation test may run nightly. The incident severity does not automatically mean every test belongs in the fastest pipeline.

| Test created from incident | Suggested run location | Reason |
|---|---|---|
| Pure calculation regression | Pull request unit suite | Fast and deterministic |
| API state transition regression | Pull request service integration | Catches endpoint and persistence behavior |
| Broker redelivery handling | Component integration or nightly if broker setup is heavy | Needs infrastructure |
| Visual breakpoint regression | Pull request browser suite for affected component | Layout was the failure mechanism |
| Data backfill validation | Migration pipeline | Must run with database migration context |
| Edge cache behavior | Post-deploy synthetic check | Requires deployed environment |

CI placement is part of test design. A perfect test in the wrong pipeline becomes either invisible or disruptive.

## Measuring whether incident tests help

Track incident-derived tests separately for a while. Useful metrics are not vanity counts. Ask whether the test failed during fix development, whether it would have caught the bad release, and whether it has produced false positives since being added.

If incident tests often flake, the team is choosing too high a layer or writing vague oracles. If incident tests never fail before fixes, they may be added after the fact without proving reproduction. If incident tests keep catching related bugs, promote the pattern into standard coverage.

## Assigning ownership after the postmortem

An incident test without an owner becomes suite debris. The owner should be the team that can interpret and fix a failure, not necessarily the person who wrote the test. A payment idempotency test belongs with the billing service. A viewport regression belongs with the frontend area. A migration regression belongs with the data or platform team that owns the schema.

Write the owner into the test metadata if the repository supports tags, CODEOWNERS, or suite directories. Make failure routing explicit in CI. When an incident-derived test fails six months later, the alert should reach people who understand the invariant. Otherwise the test becomes a slow reminder of a past incident and nobody knows whether to fix the product or delete the check.

Ownership also includes review of fixture freshness. If the business rule changes, the incident test may need to change. That is healthy. What is not healthy is a test blocking a release because it preserves an old policy nobody owns.

## The follow-up review thirty days later

Schedule a short review after the incident action items land. Ask four questions: did the regression test fail before the fix, is it running in the right pipeline, has it flaked, and does the team understand the oracle? This review catches the common failure mode where an action item is marked done because code was merged, not because coverage became useful.

If the test is too slow, move it or narrow it. If it is too broad, split the incident oracle from surrounding setup. If it did not actually reproduce the bug, reopen the action item. Incident-driven testing improves only when teams are honest about whether the new coverage would have changed the outcome.

## Keeping the suite from growing without limit

Escaped bugs can create fear-driven accumulation. Every incident adds three tests, no one removes old ones, and the regression suite becomes expensive. Counter that with a retirement policy. When a component is replaced, review incident tests attached to it. When a broader invariant test covers the same failure, delete the narrower duplicate. When monitoring becomes the better control, move the check out of pre-merge CI.

The goal is not a museum of every outage. The goal is a living safety net shaped by real failures. Tests created from incidents should be among the clearest tests in the repository because they have a story, an owner, and a known consequence.

## Writing the action item so it can be verified

Phrase the postmortem action item as a verifiable deliverable. "Improve tests" is impossible to close honestly. "Add a regression test that fails when duplicate event IDs create more than one entitlement" is clear. Include the layer, fixture, oracle, and pipeline location if they are known.

A good action item also names the evidence required for closure: failing run before fix, passing run after fix, and link to the committed test. That keeps the team from confusing activity with risk reduction.

This wording makes closure auditable.
It also makes missed follow-through visible.
Immediately.

## Frequently Asked Questions

### Does every production incident need a new automated test?

No. Every incident needs a test decision. Some risks are better handled by monitoring, alerting, feature flag controls, migration checks, or runbook changes. Add an automated test when it can catch the same failure mechanism with acceptable cost.

### How do I prove an incident regression test is valid?

Run it against the buggy behavior or a faithful reproduction and confirm it fails. Then apply the fix and confirm it passes. Without that red-green evidence, the test may only cover nearby behavior.

### Should incident tests be end-to-end by default?

No. Use the lowest layer that proves the incident oracle. End-to-end is appropriate when the failure mechanism depends on browser behavior, deployed infrastructure, or several services interacting.

### How much production data should become a fixture?

As little as possible. Keep the fields that caused the failure, redact sensitive values, and shrink the fixture until removing any more data would lose the bug.

### When should an incident-specific test be deleted?

Delete or replace it when the architecture removes the risk or a broader test covers the same oracle more clearly. Keep the postmortem record, but do not keep obsolete tests as memorials.
`,
};
