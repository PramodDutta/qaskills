import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Match Partial Call Arguments with Jest',
  description:
    'Match partial call arguments with Jest objectContaining and toHaveBeenCalledWith while keeping mock assertions precise, readable, and resilient to extra fields.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Match Partial Call Arguments with Jest

An analytics callback receives fourteen properties, but the behavior under test owns only three of them: the event name, account identifier, and trial state. Comparing the complete argument turns unrelated metadata additions into failures. Comparing too little can let the wrong call pass. Jest's asymmetric matchers solve that tension by letting an expected fragment participate inside \`toHaveBeenCalledWith\`.

The central pattern is \`expect.objectContaining({...})\` for an object argument. It means the received object must contain the specified key-value pairs, while additional keys are allowed. This article goes beyond the one-line syntax into multiple arguments, nested structures, call selection, negative checks, and the places where partial matching becomes dangerously permissive.

## Put objectContaining at the argument's actual position

\`toHaveBeenCalledWith\` compares an expected argument list against every recorded invocation of a mock or spy. The assertion passes when at least one call matches all expected positions. If the second argument is the partial object, the asymmetric matcher belongs in the second position. It does not search all arguments for a matching object.

\`\`\`typescript
import { describe, expect, it, jest } from '@jest/globals';

type AuditRecord = {
  action: string;
  actorId: string;
  requestId: string;
  occurredAt: string;
  source: 'web' | 'api';
};

function approveInvoice(
  invoiceId: string,
  actorId: string,
  writeAudit: (topic: string, record: AuditRecord) => void,
) {
  writeAudit('invoice-events', {
    action: 'invoice.approved',
    actorId,
    requestId: 'req-fixed-for-example',
    occurredAt: new Date().toISOString(),
    source: 'web',
  });
  return { invoiceId, status: 'approved' };
}

describe('approveInvoice', () => {
  it('writes the owned audit fields', () => {
    const writeAudit = jest.fn();

    approveInvoice('inv-42', 'user-7', writeAudit);

    expect(writeAudit).toHaveBeenCalledWith(
      'invoice-events',
      expect.objectContaining({
        action: 'invoice.approved',
        actorId: 'user-7',
        source: 'web',
      }),
    );
  });
});
\`\`\`

The timestamp and request ID remain free to vary, but the test still checks the topic argument exactly. That combination is stronger than extracting only the record and ignoring the channel to which it was written.

| Expected expression | What the received value may add | What still must match |
|---|---|---|
| Plain object literal | Nothing | Every enumerable compared property and nested value |
| \`expect.objectContaining({ id: '7' })\` | Any other object keys | The \`id\` property with value \`'7'\` |
| \`expect.arrayContaining(['admin'])\` | Other elements and different ordering | At least the supplied member |
| \`expect.any(Date)\` | No property comparison is requested | Value is an instance of \`Date\` |
| \`expect.stringMatching(/^req-/)\` | Any characters allowed by the expression | String satisfies the regular expression |

## Partial matching is shallow until you compose it

\`objectContaining\` applies to the keys of the object passed to it. If one expected key contains another object and you provide a plain literal there, that nested object is compared normally. To permit extra nested fields, place another \`objectContaining\` at that level.

\`\`\`typescript
import { expect, it, jest } from '@jest/globals';

it('publishes a partially matched nested payload', () => {
  const publish = jest.fn();

  publish({
    type: 'order.shipped',
    payload: {
      order: {
        id: 'ord-18',
        total: { amount: 82.5, currency: 'USD' },
        lineItems: [
          { sku: 'keyboard-1', quantity: 1, warehouse: 'west' },
          { sku: 'cable-2', quantity: 2, warehouse: 'east' },
        ],
      },
      schemaVersion: 3,
    },
  });

  expect(publish).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'order.shipped',
      payload: expect.objectContaining({
        order: expect.objectContaining({
          id: 'ord-18',
          total: expect.objectContaining({ currency: 'USD' }),
          lineItems: expect.arrayContaining([
            expect.objectContaining({ sku: 'cable-2', quantity: 2 }),
          ]),
        }),
      }),
    }),
  );
});
\`\`\`

This assertion says that the event contains a USD order and includes the required cable line, regardless of other lines or warehouse metadata. It does not say the cable appears once, the array has two entries, or the total is 82.5. If those facts define the behavior, assert them separately.

Composed asymmetric matchers read like a contract only when each relaxed dimension is deliberate. Nesting \`objectContaining\` at every level by habit makes an assertion look substantial while checking very little.

## Choose the right call when the mock is invoked repeatedly

A mock that records “started,” “retried,” and “completed” can satisfy \`toHaveBeenCalledWith\` even if the matching completion call occurs at the wrong time. The matcher asks whether any call matched. It does not require that call to be first, last, or unique.

Jest provides call-specific matchers:

| Intent | Matcher | Important behavior |
|---|---|---|
| At least one invocation has these arguments | \`toHaveBeenCalledWith(...)\` | Searches all recorded calls |
| Invocation number two has these arguments | \`toHaveBeenNthCalledWith(2, ...)\` | Call numbering starts at 1 |
| Final invocation has these arguments | \`toHaveBeenLastCalledWith(...)\` | Selects the most recent call |
| Exactly three invocations occurred | \`toHaveBeenCalledTimes(3)\` | Says nothing about their arguments |

Combine count and argument assertions when duplication matters. For a payment publisher, “a matching call occurred” is insufficient if the same payment event was emitted twice. Assert \`toHaveBeenCalledTimes(1)\`, then match the call.

When order is the behavior, \`toHaveBeenNthCalledWith\` is clearer than indexing \`mock.calls\`. Direct call-array inspection remains useful for unusual relationships, such as verifying every retry delay increases, but it should not be the default for ordinary argument matching.

## Distinguish missing, undefined, and null

Partial object matching can expose a subtle JavaScript contract question. A key absent from an object is not always equivalent to a key present with \`undefined\`, and neither is equivalent to \`null\`. Serialization, database clients, and patch semantics may treat all three differently.

If the callback must receive a nullable value, specify \`{ deletedAt: null }\`. If the property must be present but its value is unrestricted, Jest's general matchers do not turn \`expect.anything()\` into that check because \`anything\` excludes both \`null\` and \`undefined\`. A direct \`Object.hasOwn(received, 'key')\` check may communicate the contract better.

Avoid writing \`objectContaining({ optional: undefined })\` without confirming the Jest equality semantics you intend and the project's configuration. If presence matters operationally, inspect presence explicitly. If absence matters, assert on the actual recorded argument rather than relying on a broad negated partial matcher.

## Negative partial assertions need a precise scope

\`expect.not.objectContaining(fragment)\` means the received object must not contain all properties in that fragment with matching values. It does not mean that none of those individual properties may appear. For example, negating \`{ role: 'admin', active: true }\` passes for an active non-admin and for an inactive admin.

There are two different questions:

1. Did no call contain this prohibited combination?
2. Did a particular selected call omit a sensitive key or value?

For the first, examine every entry in \`mock.calls\` and assert the policy for each payload. For the second, select the exact call, then use a direct property assertion. A single \`not.toHaveBeenCalledWith(expect.objectContaining(...))\` can be valid, but reviewers should read it as “no invocation matched this complete expected argument list.”

This matters for security tests. Checking that a logger was not called with \`objectContaining({ password: 'secret' })\` does not prevent a different password value, a nested credential, or a serialized JSON string. Sensitive-data assertions need purpose-built traversal or redaction tests.

## When partial call assertions are the right abstraction

Use partial matching when the unit owns only part of a collaborator's input or when nondeterministic fields are generated correctly elsewhere. Examples include timestamps, correlation identifiers, tracing context, generated version IDs, and additive metadata managed by middleware.

Exact matching remains preferable for small commands whose complete shape is the contract. If a function sends \`{ accountId, enabled }\` to a repository, allowing arbitrary extra fields might conceal an accidental privilege or persistence property. The test should fail when the command shape changes.

| Collaborator input | Recommended strictness | Reason |
|---|---|---|
| Analytics envelope enriched by shared middleware | Partial envelope plus exact owned event fields | Middleware may add trace and device metadata |
| Database update command | Usually exact | Extra writable columns can change stored state |
| HTTP client options assembled by the unit | Exact for method and URL, selective for headers | Standard clients may add benign headers |
| Domain event with versioned schema | Match required fields and assert schema separately | Additive evolution may be supported |
| Authorization decision request | Exact or explicitly enumerated partial | Unchecked context can affect access |

The [Jest custom matchers guide](/blog/jest-custom-matchers-guide) is useful when a repeated domain rule, rather than a simple subset, deserves its own readable assertion.

## Mock configuration and call assertions solve different problems

\`mockImplementation\` defines what a mock does when called. \`toHaveBeenCalledWith\` inspects what happened after execution. Do not embed argument assertions inside a mock implementation unless the mock must simulate branching behavior. Inline assertions can stop the subject midway and make call history harder to interpret.

A stubbed repository might return a record with \`mockResolvedValue\` while a later expectation checks that it received the correct partial query. The behavior setup and interaction verification remain separate. For a full distinction among replacement options, see the [Jest mock and mockImplementation guide](/blog/jest-mock-vs-mockimplementation-guide).

Clear or recreate mocks between tests. A call left by a prior example can satisfy a broad \`toHaveBeenCalledWith\` and produce a false positive. Jest configuration can clear mocks automatically, but explicit local setup often makes ownership obvious.

## Make failure output help the investigator

One advantage of Jest asymmetric matchers is focused diffs. A huge exact object diff can bury the field that matters, while \`objectContaining\` limits the expected side to the contract under test. Still, a deeply nested matcher tree can be hard to parse.

Name expected fragments when they have domain meaning:

\`\`\`typescript
const expectedRetryEvent = expect.objectContaining({
  type: 'delivery.retry_scheduled',
  payload: expect.objectContaining({
    attempt: 2,
    reason: 'provider_timeout',
  }),
});

expect(publish).toHaveBeenNthCalledWith(2, expectedRetryEvent);
\`\`\`

Keep the fragment near the assertion unless several assertions share it for a real reason. A giant global “expected common object” often accumulates irrelevant fields and couples unrelated tests.

If the failure still lacks context, assert count first, then the selected call. “Expected two calls, received zero” is more actionable than an argument diff against a mock that never ran. For asynchronous code, await the subject before inspecting the mock. Jest does not wait merely because the expectation mentions a mock.

## Review a partial assertion as a coverage statement

During review, translate the matcher into plain language. “At least one call used topic X and had an actor ID Y; every other property and every other call is unconstrained.” That wording exposes missing constraints quickly.

Ask whether call count matters, whether position matters, whether nested extras are intentionally allowed, and whether an ignored field belongs to another unit's tests. Partial does not mean vague. It means the accepted variation has been chosen rather than copied wholesale from a volatile object.

Mutation is another concern. Jest records argument references, and later mutation of the same object can affect what inspection sees. Prefer passing immutable commands or fresh objects to collaborators. If production code deliberately mutates shared data after a call, test snapshots of values at the proper boundary instead of assuming the mock is an audit log.

The strongest partial call assertion is narrow for a stated reason, surrounded by exact assertions on routing, cardinality, and sequence where those define correctness.

## Preserve useful TypeScript constraints in expected fragments

An asymmetric matcher is a runtime value, so TypeScript cannot always prove that the keys inside a large fragment belong to the collaborator's argument type. A misspelled \`accoundId\` may fail at runtime rather than at compile time. For important command shapes, define the literal fragment separately with \`satisfies Partial<Command>\`, then pass it to \`expect.objectContaining\`.

That pattern checks property names and value types while retaining the partial nature of the assertion. It does not validate nested partials automatically; create domain-specific fragment types when nested structure matters. Avoid casting the expected value to the full command type because a cast can claim missing required fields exist and defeats the compiler's help.

Generated API types can be useful here, but do not let a broad transport model weaken a domain assertion. If the production function accepts a discriminated union, include the discriminator in the fragment. Matching \`{ status: 'failed' }\` without the event type can accidentally accept a different branch whose status happens to share the same spelling.

## Test call relationships that one matcher cannot express

Sometimes correctness lives between arguments or calls. A callback may receive a record and a deduplication key that must equal the record ID. Another mock may need the same correlation ID that the first mock received. \`objectContaining\` cannot declare those cross-value relationships by itself.

Select the relevant entries from \`mock.calls\`, destructure them, and write ordinary equality assertions. First assert the count so indexing cannot produce a confusing \`undefined\` failure. This direct approach is more readable than trying to capture a value inside a custom asymmetric matcher with mutable test state.

For calls made concurrently, do not assert ordering unless the product promises it. Instead, map calls by a stable identifier and compare each record with its expected fragment. An order assertion in a concurrency test can fail because scheduling changed even though every collaborator request is correct.

## Guard against vacuous asymmetric matchers

\`expect.objectContaining({})\` matches any object and provides almost no evidence. An \`arrayContaining([])\` expectation is similarly vacuous. These can appear after a fixture refactor removes the last expected field. A code review should reject them, and a small lint rule or test-helper guard can prevent empty fragments if the pattern recurs.

\`expect.anything()\` is also broader than its name first suggests: it accepts every value except \`null\` and \`undefined\`. Use \`expect.any(String)\` when type matters and a regular expression when format matters. Matching any string for an idempotency key proves much less than matching the service's required prefix and length.

Treat a partial matcher as executable documentation of accepted variation. Every asymmetric leaf should answer “why is exact equality inappropriate here?” If the answer is merely that the fixture is large, shrink the production interface or build a focused expected object rather than relaxing it wholesale.

## Verify promise-based collaborators after settlement

Mock call recording happens when the function is invoked, but the subject may not invoke it until an awaited prerequisite completes. If the production method returns a promise, await that promise before checking calls. Otherwise the expectation can run while the relevant microtask or timer is pending and report that the mock received zero calls.

For a rejected collaborator, configure \`mockRejectedValue\` and assert the subject's failure or recovery first. Then inspect the arguments that caused the attempt. A call assertion alone cannot prove that the subject awaited the rejection, surfaced it, or avoided subsequent side effects.

Fake timers require the same care. Advancing a retry timer may schedule promise continuations that need to settle before call history reaches the expected count. Use Jest's timer APIs supported by the pinned version and await the subject's observable completion. Do not add a real delay to make the mock “catch up.”

When the function intentionally starts work without awaiting it, expose a completion signal for tests or move the assertion to the component responsible for the background job. Repeated polling of \`mock.calls.length\` is a sign that ownership of asynchronous completion is unclear.

## Frequently Asked Questions

### Does \`objectContaining\` recursively ignore extra nested keys?

The relaxation applies only at the object level where the matcher appears. Put another \`expect.objectContaining\` around a nested object when that nested level may also contain additional keys.

### Why does \`toHaveBeenCalledWith\` pass when the matching call was not last?

It searches all recorded calls for one matching argument list. Use \`toHaveBeenLastCalledWith\` or \`toHaveBeenNthCalledWith\` when position is part of the behavior.

### Can I combine exact and partial arguments in one expectation?

Exact and partial arguments can coexist in one expectation. Keep exact primitives or objects in their positions and use asymmetric matchers only where variation is allowed. The audit example matches the topic exactly and the record partially.

### How do I assert that every call has a required field?

Iterate over \`mock.calls\` and assert the relevant argument for each call, optionally asserting the total first. A single \`toHaveBeenCalledWith\` proves only that at least one invocation matched.

### Is partial matching better than snapshotting mock calls?

For behavioral contracts, usually. A focused matcher states which fields matter and produces less churn. Snapshots can help inspect a stable, intentionally complete protocol, but broad call snapshots often approve unrelated metadata changes without thoughtful review.
`,
};
