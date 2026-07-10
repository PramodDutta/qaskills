import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Custom Matchers Guide',
  description:
    'Jest custom matchers guide for building expressive domain assertions that cut noisy test code and make failures faster to diagnose in TypeScript suites.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Jest Custom Matchers Guide

The first smell is an assertion block that reads like data plumbing instead of intent. A payment test checks five fields, parses two dates, normalizes a currency string, and finally compares a status. The failure says expected false to be true. Everyone then opens the helper, the fixture, and the serializer just to learn that the receipt total was rounded incorrectly.

Jest custom matchers are a better place for that knowledge. They let a test say what matters in the language of the system: toHaveLedgerEntry, toBeAValidWebhookSignature, toContainAccessibleName, toMatchMoneyAmount. The matcher owns the comparison and the failure message. The spec owns the scenario. That separation matters when tests are reviewed by people who know the product domain better than Jest internals.

This tutorial assumes you already know basic Jest assertions. It focuses on designing matchers that are worth keeping: typed, debuggable, async when needed, and specific to the domain. For adjacent mocking decisions, see [the Jest mock versus mockImplementation guide](/blog/jest-mock-vs-mockimplementation-guide). For promise behavior and rejected flows, use [the async await testing promises guide](/blog/jest-async-await-testing-promises-guide) alongside the async matcher section here.

## Picking matcher boundaries that earn their name

A custom matcher should hide comparison mechanics, not hide the scenario. If a matcher accepts half the world as arguments, it becomes a second test language. If it only aliases toEqual, it adds ceremony. The sweet spot is a repeated assertion pattern with a domain-specific failure mode.

Good matcher candidates usually have one of these traits:

| Repeated assertion pattern | Better matcher shape | Why it helps |
|---|---|---|
| Object contains several required semantic fields | toHavePublishedEvent(eventName, partialPayload) | Failure can name the missing event and show payload mismatch |
| Number requires tolerance and unit conversion | toEqualMoney({ amount, currency }) | Avoids scattered rounding and currency normalization |
| HTTP response must satisfy a contract slice | toHaveProblemJson(status, code) | Keeps RFC 7807 shape checks consistent |
| DOM accessibility requires role and name checks | toExposeControl({ role, name }) | Produces a product-facing failure message |
| Audit log entry depends on actor, action, target | toContainAuditEntry(entry) | Makes ordering and partial matching explicit |

Avoid custom matchers for one-off expectations. Also avoid matchers that perform actions before asserting. A matcher should inspect received values. If it clicks buttons, writes files, or mutates global state, it will surprise readers and make retries harder to reason about.

## Anatomy of expect.extend

Jest exposes expect.extend for adding matchers. A matcher receives the value under test as the first parameter, followed by any matcher arguments. It returns an object with pass and message. The message is a function so Jest can lazily print the right text for normal and negated assertions.

Here is a practical matcher for money values. It accepts either a number or string amount from application output and compares it against an expected amount in minor units. The example uses Jest's matcher utilities for readable output.

\`\`\`ts
// test/matchers/money.ts
import type { MatcherFunction } from 'expect';

type ExpectedMoney = {
  amountInCents: number;
  currency: string;
};

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Math.round(value * 100);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

export const toEqualMoney: MatcherFunction<[ExpectedMoney]> = function (
  received,
  expected,
) {
  const actual = received as { amount?: unknown; currency?: unknown };
  const actualAmount = parseAmount(actual.amount);
  const actualCurrency = String(actual.currency ?? '').toUpperCase();
  const expectedCurrency = expected.currency.toUpperCase();

  const pass =
    actualAmount === expected.amountInCents &&
    actualCurrency === expectedCurrency;

  return {
    pass,
    message: () => {
      const expectedText = this.utils.printExpected({
        amountInCents: expected.amountInCents,
        currency: expectedCurrency,
      });
      const receivedText = this.utils.printReceived(received);

      return [
        'expected value to equal money amount',
        'Expected: ' + expectedText,
        'Received: ' + receivedText,
      ].join('\\n');
    },
  };
};
\`\`\`

Register matchers in a Jest setup file so every test can use them without importing assertion utilities in each spec.

\`\`\`ts
// test/setup-matchers.ts
import { expect } from '@jest/globals';
import { toEqualMoney } from './matchers/money';

expect.extend({
  toEqualMoney,
});

declare module 'expect' {
  interface Matchers<R> {
    toEqualMoney(expected: {
      amountInCents: number;
      currency: string;
    }): R;
  }
}
\`\`\`

Then configure setupFilesAfterEnv in Jest. The exact config file format depends on the project, but the setting name is stable.

\`\`\`ts
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup-matchers.ts'],
};

export default config;
\`\`\`

The test becomes short without becoming vague.

\`\`\`ts
// invoice.test.ts
it('calculates the captured payment total', () => {
  const receipt = {
    amount: '$42.10',
    currency: 'usd',
    processorId: 'pi_123',
  };

  expect(receipt).toEqualMoney({
    amountInCents: 4210,
    currency: 'USD',
  });
});
\`\`\`

That is not just prettier. The matcher centralizes rounding, currency case, and failure text. When a failure occurs, the message points at money semantics, not at a boolean helper returning false.

## TypeScript declarations without test pollution

Matcher typing is where many Jest setups become awkward. The declaration must augment the matcher interface used by the expect package. Keep it close to matcher registration, or put it in a dedicated test types file included by tsconfig for tests.

Do not put broad any signatures in the type declaration just to make the compiler quiet. If the matcher expects a narrow object, type the expected argument. If the received value is intentionally broad, leave that as the runtime responsibility of the matcher, but keep matcher parameters precise.

| Typing decision | Good outcome | Bad shortcut to avoid |
|---|---|---|
| Declare matcher return as R | Works with .not, .resolves, and normal expect chains | Returning void from the interface |
| Type expected arguments | Call sites get useful editor feedback | Using any for every matcher parameter |
| Keep runtime guards | Bad received values produce matcher failures | Trusting TypeScript for JSON or API output |
| Include setup file in test tsconfig | Declarations load consistently | Importing setup files into production code |

One reliable pattern is to place matcher registration under test/setup-matchers.ts and include that path in Jest setupFilesAfterEnv. If TypeScript still does not see the declaration in spec files, check the tsconfig include list used by your test runner.

## Writing failure messages for humans under pressure

The failure message is the real product of a matcher. A custom matcher with a vague message is worse than explicit expectations because it hides details. A good message states the domain expectation, prints the expected shape, prints the received shape, and calls out the most useful mismatch when possible.

For a matcher such as toContainAuditEntry, do not simply print the entire audit log. Say which actor, action, and target were searched for. Then show nearby entries or the entries with the same actor. For toHaveProblemJson, mention the expected status and application code before dumping the response body. For toEqualMoney, show both minor units and the raw received value because rounding bugs often live in formatting boundaries.

Negated assertions need attention too. In Jest, this.isNot tells you whether .not was used. If your message reads naturally only for the positive case, a .not failure will be confusing. You do not need elaborate prose, but you should ensure the message describes what was unexpectedly present.

## Async matchers for external verification

Some domain assertions require async work. A webhook signature matcher may need to load a public key. A database matcher may query for an eventually written audit row. An accessibility matcher may call an async parser. Jest supports async custom matchers by returning a Promise of the matcher result.

Use async matchers sparingly. They can make tests elegant, but they can also hide slow polling. Make timeouts, retries, or external calls explicit in matcher arguments when the cost is meaningful.

\`\`\`ts
// test/matchers/audit-log.ts
import type { MatcherFunction } from 'expect';

type AuditEntry = {
  actorId: string;
  action: string;
  targetId: string;
};

type AuditStore = {
  findRecentEntries(actorId: string): Promise<AuditEntry[]>;
};

export function createAuditMatchers(store: AuditStore) {
  const toHaveRecentAuditEntry: MatcherFunction<[AuditEntry]> = async function (
    received,
    expected,
  ) {
    const subject = received as { actorId?: string };
    const actorId = subject.actorId ?? expected.actorId;
    const entries = await store.findRecentEntries(actorId);

    const pass = entries.some(
      (entry) =>
        entry.actorId === expected.actorId &&
        entry.action === expected.action &&
        entry.targetId === expected.targetId,
    );

    return {
      pass,
      message: () =>
        [
          'expected recent audit log to contain entry',
          'Expected: ' + this.utils.printExpected(expected),
          'Recent entries: ' + this.utils.printReceived(entries),
        ].join('\\n'),
    };
  };

  return { toHaveRecentAuditEntry };
}
\`\`\`

The store is injected, which keeps the matcher testable. In a unit test, pass a fake store. In integration tests, pass the real repository. Avoid importing a global database client directly inside the matcher because that makes test order and cleanup harder to control.

## Testing the matchers themselves

Custom matchers deserve tests. A matcher can produce false confidence if it passes too broadly, mishandles .not, or crashes on malformed input. The tests should call the matcher through expect, not only invoke the function directly, because you want to exercise Jest integration and type declarations.

For the money matcher, test these cases: numeric amounts, formatted string amounts, lowercase currency, wrong currency, missing amount, and a .not assertion. For async matchers, test a resolved pass, a resolved failure, and a rejected dependency if that error should surface.

Snapshotting matcher messages is tempting, but full snapshots can become noisy. Prefer targeted assertions on the important fragments. For example, assert that a failure message includes the expected currency and the received object. You want message regressions caught without turning copy edits into needless churn.

## When asymmetric matchers are enough

Jest already has powerful asymmetric matchers such as expect.objectContaining, expect.arrayContaining, expect.any, and expect.stringMatching. Do not create custom matchers just to avoid those. The custom matcher earns its place when there is a named domain rule or a better failure message.

For example, expect.objectContaining({ status: 'paid' }) is fine. A matcher called toBePaidInvoice might be justified if paid means status is paid, capturedAt is present, refundedAt is absent, amount is positive, and every line item has a recognized tax code. That matcher represents business semantics. It is not just shorter syntax.

## Keeping matcher packages maintainable

Large codebases often collect matchers over years. Without ownership, the matcher folder turns into a museum of assertions nobody trusts. Treat matchers as a small public API for tests.

Give each matcher a README comment or examples near the implementation. Keep names consistent: toHave for containment or property checks, toBe for identity or state, toEqual for normalized deep equality. Remove matchers that have only one caller after the related feature is rewritten. Version shared matcher packages if multiple repositories consume them.

Also make matchers deterministic. A matcher should not depend on wall-clock time unless the time source is injected. It should not read process.env halfway through an assertion unless environment is the subject under test. It should not log during a normal pass. Small amounts of discipline keep custom assertions from becoming a hidden source of suite instability.

## Matchers for API response contracts

API test suites are a strong place for custom matchers because the same response rules appear across many endpoints. A product may standardize problem responses, pagination envelopes, idempotency headers, or audit metadata. Repeating those checks in every test makes failures noisy and encourages drift. A matcher can encode the contract in one place while still letting each spec focus on the endpoint scenario.

For example, toHaveProblemJson can verify content-type, HTTP status, type, title, application code, and a request id. It should not decide whether the endpoint should fail. The spec decides that. The matcher decides whether the failure is shaped according to the API contract. That difference keeps the matcher reusable without hiding business intent.

Be careful when a matcher accepts the whole HTTP response. It is convenient, but it can become too powerful. Limit the matcher to a stable response shape and make optional checks explicit. A matcher that checks status, body, headers, tracing, schema, and database side effects is no longer an assertion. It is a mini framework that will be hard to debug.

Useful API matcher names tend to mention the contract artifact directly: toHaveProblemJson, toHavePaginationLinks, toHaveRateLimitHeaders, toHaveJsonApiError, toHaveWebhookSignature. Those names tell reviewers which shared rule is being enforced. A vague name such as toBeValidResponse does not.

When responses include generated values, compare shape and semantic constraints instead of exact values. A request id should match your id format. A timestamp should be parseable and within a controlled clock window if the clock is part of the test. A signature should be recomputed from the raw payload, not merely checked for presence.

## Snapshot serializers versus custom matchers

Jest snapshot serializers and custom matchers solve different problems. A serializer changes how values are printed in snapshots. A matcher decides whether a value satisfies a rule. If the test's main question is did this rendered tree or object change, a serializer can make snapshots readable. If the question is does this invoice obey the paid invoice rule, use a matcher.

Mixing the two is acceptable. A matcher can use a serializer indirectly through Jest's print utilities, and a snapshot can benefit from domain-specific formatting. The boundary should remain clear: serializers improve representation, matchers enforce expectations.

For example, a serializer that redacts UUIDs in large event payload snapshots may be useful. A matcher called toContainDomainEvent should still perform the event lookup and produce a targeted failure when the expected event is missing. Do not force reviewers to inspect a 500-line snapshot just to find out that the order_placed event never appeared.

## Migration strategy for existing helpers

Most teams already have assertion helpers before they introduce matchers. Do not rewrite them all at once. Start with the helpers that return booleans or throw vague errors. Convert one helper into a matcher, improve its failure message, and update the highest-value call sites. Leave simple builders and fixture utilities alone.

A good migration candidate has at least three call sites, a domain name people recognize, and failure messages that currently waste debugging time. After conversion, the test should read better at the call site. If the matcher makes the test harder to understand, keep the helper.

During migration, keep the helper implementation if it contains useful pure logic. The matcher can call that function and add Jest-specific messaging. That approach avoids coupling domain comparison code to Jest and makes it possible to reuse the same comparison in other runners later.

## Frequently Asked Questions

### Should custom matchers live beside production code?

Usually no. Keep them in test utilities or a dedicated internal testing package. Matchers depend on Jest and encode assertion behavior, so production bundles should not import them. If a matcher uses a pure domain parser, put the parser in shared code and keep the Jest wrapper in test code.

### How specific should a matcher name be?

Specific enough that the failure reads like a product rule. toBeValid is too vague. toHaveValidCheckoutTotals or toContainAuditEntryForActor is easier to review and easier to debug. Long names are acceptable when they remove ambiguity.

### Can I use custom matchers with expect(...).resolves?

Yes, typed matcher declarations should return R so chaining works with normal, .not, .resolves, and .rejects usage. Test at least one promise-based call if your project relies heavily on resolves or rejects.

### Should matcher messages include diffs?

Use Jest utilities such as this.utils.diff when the received and expected values are structured and comparable. For domain assertions, a targeted message is often better than a huge diff. Show the rule, the expected semantic value, and the smallest useful received data.

### Is an async matcher a good place for polling?

Only when the matcher name and arguments make the cost obvious. A matcher that silently waits five seconds can make a suite feel haunted. Prefer an explicit timeout argument or a separate wait helper followed by a synchronous matcher.
`,
};
