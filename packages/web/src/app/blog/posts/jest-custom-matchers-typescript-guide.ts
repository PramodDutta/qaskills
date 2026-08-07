import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Custom Matchers: A TypeScript Guide for Better Test Failures',
  description: 'This Jest custom matchers TypeScript guide shows how to build typed sync and async assertions, register them safely, and produce diagnostic failure messages.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Jest Custom Matchers: A TypeScript Guide for Better Test Failures

A Jest custom matcher turns a repeated assertion concept into a named, typed operation with a useful failure message. In TypeScript, the complete implementation has three pieces: a matcher function that returns \`pass\` and \`message\`, registration through \`expect.extend\`, and module augmentation so editors and the compiler recognize the new method. Tests can then say \`expect(response).toHaveValidPagination()\` instead of repeating a long chain of generic checks.

The payoff is not shorter syntax alone. A strong matcher captures a domain invariant, prints the evidence needed to diagnose a failure, supports \`.not\` honestly, and avoids hiding which condition failed. A weak matcher merely bundles unrelated assertions and returns "expected value to be valid." The latter makes a red CI run harder to understand.

This guide builds synchronous and asynchronous matchers using Jest’s documented extension API, adds TypeScript declarations for regular and asymmetric use, registers them through test setup, and tests the matchers themselves. The examples focus on API and test-automation work where precise diagnostics save investigation time.

## Decide Whether the Assertion Deserves a Matcher

Create a matcher when the assertion represents a stable concept that appears across tests and needs domain-specific diagnostics. Examples include a response satisfying a pagination contract, a timestamp being within tolerance, an audit event containing required fields, or a job reaching a terminal state.

Do not create one merely to remove three lines. A helper that returns structured data may be clearer when callers need several outputs. A test-data builder is better for setup. A plain function is better when the behavior is production validation rather than an assertion. And built-in matchers remain preferable for familiar conditions because engineers already understand their failure output.

| Repeated test need | Best abstraction | Reason |
| --- | --- | --- |
| Assert one domain invariant with tailored diff | Custom matcher | Reads as a claim and owns failure formatting |
| Construct a complex request | Builder or factory | Setup is not assertion behavior |
| Wait for a distributed job | Polling helper plus matcher | Separate observation from final assertion |
| Validate runtime input in production | Schema or validator | Production code should not depend on Jest |
| Compare ordinary arrays or objects | Built-in Jest matcher | Existing semantics and diffs are familiar |
| Calculate values later asserted in several ways | Plain helper | Returning data is clearer than hidden assertions |

Name a matcher as a predicate that completes \`expect(received)...\`. \`toHaveValidPagination\`, \`toBeWithinDuration\`, and \`toContainAuditEvent\` describe claims. \`checkResponse\` and \`validateThing\` do not reveal what passed.

## Start With a Typed Matcher Function

Jest’s \`expect\` package exports a \`MatcherFunction\` type. Its generic tuple describes arguments after the received value. Use a normal function expression when you need Jest’s matcher context through \`this\`. Arrow functions do not bind their own \`this\`.

The first matcher checks whether a number is within an inclusive range:

\`\`\`ts
import type { MatcherFunction } from 'expect';

export const toBeWithinRange: MatcherFunction<[
  floor: number,
  ceiling: number,
]> = function (received, floor, ceiling) {
  if (typeof received !== 'number') {
    return {
      pass: false,
      message: () =>
        \`\${this.utils.matcherHint('toBeWithinRange')}\\n\\n\` +
        \`Received value must be a number.\\n\` +
        \`Received: \${this.utils.printReceived(received)}\`,
    };
  }

  const pass = received >= floor && received <= ceiling;
  return {
    pass,
    message: () =>
      \`\${this.utils.matcherHint('toBeWithinRange')}\\n\\n\` +
      \`Expected range: \${this.utils.printExpected([floor, ceiling])}\\n\` +
      \`Received value: \${this.utils.printReceived(received)}\`,
  };
};
\`\`\`

The matcher checks the received type at runtime because TypeScript does not control values returned by APIs, parsed JSON, or JavaScript callers.

The function returns \`pass\` plus a lazy \`message\`. Jest decides whether an assertion succeeds after considering negation. The message must therefore make sense when Jest displays it for either a positive or negated failure. State the expected condition and actual evidence, not "the test failed."

## Register the Matcher in One Explicit Module

Registration connects a matcher name to its implementation. Keep it in a small module imported by Jest setup or directly by the tests that use it.

\`\`\`ts
import { expect } from '@jest/globals';
import { toBeWithinRange } from './to-be-within-range';

expect.extend({
  toBeWithinRange,
});
\`\`\`

For a shared suite, load the module through \`setupFilesAfterEnv\`. Jest runs those modules after its testing framework is installed in the environment, which is the appropriate point for adding matchers.

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/test/setup-matchers.ts'],
};

export default config;
\`\`\`

If a repository has several Jest projects, confirm that each project needing the matcher includes the setup module. A common failure is that TypeScript sees the declaration globally while one runtime project never executes \`expect.extend\`. The test compiles, then fails because the matcher function is undefined.

Local registration is valid when only one narrow test group needs the extension. It makes dependency scope obvious and avoids adding methods to every test environment. The tradeoff is repeated imports.

## Augment the Correct TypeScript Module

Runtime registration does not teach TypeScript the method name. Augment the \`expect\` module with regular and asymmetric matcher interfaces. Keep the declaration near the implementation so a signature change is reviewed with its runtime code.

\`\`\`ts
declare module 'expect' {
  interface Matchers<R> {
    toBeWithinRange(floor: number, ceiling: number): R;
  }

  interface AsymmetricMatchers {
    toBeWithinRange(floor: number, ceiling: number): void;
  }
}

export {};
\`\`\`

The \`export {}\` makes the declaration file or module an external module, allowing augmentation rather than accidentally creating unrelated ambient declarations. Ensure the file is included by the TypeScript configuration used for tests. Inclusion can come from an import, the project’s \`include\` patterns, or the setup module.

The \`Matchers<R>\` return type preserves Jest’s chaining type behavior. Do not declare it as \`boolean\`; assertion methods do not return the matcher’s \`pass\` flag to the test. The \`AsymmetricMatchers\` declaration enables uses such as placing the matcher inside \`expect.objectContaining\`.

Use the matcher in both forms:

\`\`\`ts
import { expect, test } from '@jest/globals';

test('returns an estimated duration', () => {
  expect(148).toBeWithinRange(140, 160);

  expect({ status: 'queued', estimateSeconds: 148 }).toEqual(
    expect.objectContaining({
      estimateSeconds: expect.toBeWithinRange(140, 160),
    }),
  );
});
\`\`\`

If an editor still reports that the property does not exist, verify which TypeScript project owns the test, whether the augmentation file is included, and whether duplicate versions of the \`expect\` types are installed. Restarting the language server may refresh state, but it does not fix an incorrect project boundary.

## Design Failure Messages for the CI Reader

The failure message is the matcher’s primary product. A developer sees it when context is limited, perhaps in a collapsed CI log hours after the change. Include the matcher hint, expected invariant, actual relevant values, and a short reason. Exclude secrets and unrelated payload bulk.

Jest exposes formatting utilities on the matcher context. \`matcherHint\`, \`printExpected\`, \`printReceived\`, and \`diff\` help output resemble built-in matchers. Use them instead of raw \`JSON.stringify\` when a Jest-formatted representation or diff is useful.

Consider a pagination contract:

\`\`\`ts
import type { MatcherFunction } from 'expect';

type Page = {
  items?: unknown[];
  page?: number;
  pageSize?: number;
  total?: number;
};

export const toHaveValidPagination: MatcherFunction = function (received) {
  const page = received as Page;
  const problems: string[] = [];

  if (!page || typeof page !== 'object') problems.push('response is not an object');
  if (!Array.isArray(page?.items)) problems.push('items is not an array');
  if (!Number.isInteger(page?.page) || Number(page.page) < 1) {
    problems.push('page is not a positive integer');
  }
  if (!Number.isInteger(page?.pageSize) || Number(page.pageSize) < 1) {
    problems.push('pageSize is not a positive integer');
  }
  if (!Number.isInteger(page?.total) || Number(page.total) < 0) {
    problems.push('total is not a non-negative integer');
  }
  if (Array.isArray(page?.items) && Number.isInteger(page?.pageSize)) {
    if (page.items.length > Number(page.pageSize)) problems.push('items exceeds pageSize');
  }

  return {
    pass: problems.length === 0,
    message: () =>
      \`\${this.utils.matcherHint('toHaveValidPagination')}\\n\\n\` +
      \`Expected a consistent pagination envelope.\\n\` +
      \`Problems: \${problems.length ? problems.join('; ') : 'none'}\\n\` +
      \`Received: \${this.utils.printReceived(received)}\`,
  };
};
\`\`\`

This matcher reports all cheap structural problems in one run. That is helpful for an envelope. For complex validation with many nested fields, use a schema validator and format its issue paths instead of reproducing a schema system inside a matcher.

Do not dump an entire HTTP response if it can contain tokens or customer data. Select status, relevant headers, and safe body fields. Failure diagnostics should reduce risk as well as time.

## Keep Domain Semantics Narrow and Stable

A matcher should have one coherent reason to change. \`toHaveValidPagination\` changes when the pagination contract changes. A hypothetical \`toBeGoodApiResponse\` that checks authentication, latency, accessibility text, schema, and business totals has no stable meaning.

| Matcher design | Review verdict | Reason |
| --- | --- | --- |
| \`toHaveStatusClass('success')\` | Focused | One HTTP-level concept |
| \`toContainAuditEvent(type)\` | Focused | One domain observation with useful diagnostics |
| \`toBeAValidCheckout\` | Too broad | Could hide totals, inventory, payment, and UI concerns |
| \`toMatchEverything\` | Unusable | No domain meaning or predictable failure output |
| \`toBeWithinDuration(target, tolerance)\` | Focused with documented units | Numeric contract is clear |

Avoid matcher names that embed implementation details when the invariant is user-facing. If the assertion checks that a control has an accessible name, say so. Browser interactions themselves may belong in Playwright rather than Jest; the [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) explains user-facing selector contracts for that layer.

Keep hidden work minimal. A synchronous matcher should inspect its received value, not fetch new state, alter fixtures, or retry for thirty seconds. Assertions are easier to reason about when observation and comparison are distinct.

## Validate Arguments and Received Values Separately

TypeScript protects typed callers but runtime arguments may still be invalid. A matcher should distinguish misuse from a legitimate assertion failure. A range whose floor exceeds its ceiling is a matcher usage error, not evidence that the received value is outside a valid range.

Throwing a \`TypeError\` for invalid matcher configuration is appropriate:

\`\`\`ts
import type { MatcherFunction } from 'expect';

export const toBeWithinDuration: MatcherFunction<[
  expectedMs: number,
  toleranceMs?: number,
]> = function (received, expectedMs, toleranceMs = 0) {
  if (expectedMs < 0 || toleranceMs < 0) {
    throw new TypeError('expectedMs and toleranceMs must be non-negative');
  }
  if (typeof received !== 'number' || !Number.isFinite(received)) {
    return {
      pass: false,
      message: () => \`Received duration must be a finite number in milliseconds\`,
    };
  }

  const difference = Math.abs(received - expectedMs);
  const pass = difference <= toleranceMs;
  return {
    pass,
    message: () =>
      \`\${this.utils.matcherHint('toBeWithinDuration')}\\n\\n\` +
      \`Expected: \${this.utils.printExpected(expectedMs)} ms ± \${toleranceMs} ms\\n\` +
      \`Received: \${this.utils.printReceived(received)} ms\\n\` +
      \`Difference: \${difference} ms\`,
  };
};
\`\`\`

Document units in the method name, parameter names, message, or all three. Many custom numeric matchers fail because callers confuse seconds and milliseconds. A branded duration type can help in production code, but runtime messages still need units.

For an invalid received type, returning \`pass: false\` usually produces a normal assertion failure. For invalid matcher arguments, throwing highlights test-author misuse. Apply the distinction consistently across the library.

## Make Negation Tell the Truth

Jest inverts the result for \`.not\`. The matcher implementation still reports whether the positive predicate holds. That means the message can be requested when \`pass\` is true, because a negated assertion failed.

A message that says only "expected the value to be within range" is misleading for \`expect(5).not.toBeWithinRange(1, 10)\`. The reader needs to know that the value unexpectedly satisfied the range.

Use matcher context when wording must differ:

\`\`\`ts
import type { MatcherFunction } from 'expect';

export const toHaveHeader: MatcherFunction<[
  name: string,
  expectedValue: string,
]> = function (received, name, expectedValue) {
  const headers = received instanceof Headers ? received : new Headers();
  const actual = headers.get(name);
  const pass = actual === expectedValue;

  return {
    pass,
    message: () => {
      const expectation = this.isNot
        ? \`Expected header \${name} not to equal \${expectedValue}\`
        : \`Expected header \${name} to equal \${expectedValue}\`;
      return \`\${this.utils.matcherHint('toHaveHeader')}\\n\\n\${expectation}\\n\` +
        \`Received: \${this.utils.printReceived(actual)}\`;
    },
  };
};
\`\`\`

Test positive pass, positive fail, negated pass, and negated fail. Negation often exposes ambiguous predicate names. Some assertions should not support a negative form conceptually; in those cases, a more explicit pair of matchers may be easier to read, but Jest will still offer \`.not\` for an extension, so make its behavior coherent.

## Build Async Matchers Without Hiding Polling

A matcher can return a promise. This is useful when the assertion’s domain concept inherently requires asynchronous observation, such as checking a stored audit event. The test must await the expectation.

\`\`\`ts
import type { MatcherFunction } from 'expect';

type AuditStore = {
  findByCorrelationId(id: string): Promise<Array<{ type: string; actor: string }>>;
};

export const toContainAuditEvent: MatcherFunction<[
  store: AuditStore,
  eventType: string,
]> = async function (correlationId, store, eventType) {
  if (typeof correlationId !== 'string') {
    return { pass: false, message: () => 'correlationId must be a string' };
  }

  const events = await store.findByCorrelationId(correlationId);
  const pass = events.some((event) => event.type === eventType);
  return {
    pass,
    message: () =>
      \`\${this.utils.matcherHint('toContainAuditEvent')}\\n\\n\` +
      \`Expected event type: \${this.utils.printExpected(eventType)}\\n\` +
      \`Observed types: \${this.utils.printReceived(events.map((event) => event.type))}\`,
  };
};
\`\`\`

Add the matching declaration with a promise-aware return type:

\`\`\`ts
declare module 'expect' {
  interface Matchers<R> {
    toContainAuditEvent(store: AuditStore, eventType: string): Promise<R>;
  }
}

export {};
\`\`\`

Then await it:

\`\`\`ts
await expect(correlationId).toContainAuditEvent(auditStore, 'order.created');
\`\`\`

Avoid hiding a long polling loop inside a matcher unless the timeout, interval, and observed attempts are part of a clearly documented contract. A separate \`waitForAuditEvents\` helper can gather evidence and return it, followed by a synchronous matcher. Separation produces better timeout diagnostics and makes waiting policy reusable.

If the received value is already a promise, built-in \`.resolves\` or \`.rejects\` may express the intent without a custom async matcher. Prefer the existing vocabulary when it fits.

## Test the Matcher as Test Infrastructure

Matchers execute in every consuming test, so a bug can create false confidence or confusing failures across the suite. Test both their boolean behavior and their messages. The simplest approach registers the matcher in a dedicated test file and exercises it through Jest. For exact message inspection, call the matcher with a suitable context only if you can do so without constructing a brittle imitation of Jest internals.

Behavior tests provide strong value:

\`\`\`ts
import { describe, expect, test } from '@jest/globals';
import { toBeWithinRange } from '../matchers/to-be-within-range';

expect.extend({ toBeWithinRange });

describe('toBeWithinRange', () => {
  test.each([
    [1, 1, 3],
    [2, 1, 3],
    [3, 1, 3],
  ])('accepts %s inside [%s, %s]', (received, floor, ceiling) => {
    expect(received).toBeWithinRange(floor, ceiling);
  });

  test('rejects a value below the boundary', () => {
    expect(() => expect(0).toBeWithinRange(1, 3)).toThrow(/Expected range/);
  });

  test('supports negation', () => {
    expect(8).not.toBeWithinRange(1, 3);
  });

  test('reports an invalid received type', () => {
    expect(() => expect('2').toBeWithinRange(1, 3)).toThrow(/must be a number/);
  });
});
\`\`\`

Also add a small TypeScript compilation fixture that uses every public signature. Runtime tests can pass while declaration arguments drift. Package libraries should test consumption from a clean sample project so accidental reliance on repository globals is detected.

Treat message text as user interface. Avoid snapshotting huge ANSI-formatted output unless stable formatting is itself important. Assert key diagnostic fragments: expected condition, actual value, and failure reason.

## Package Matchers Without Creating Type Collisions

Inside one repository, a setup module and adjacent augmentation are usually enough. A published matcher package needs an export map and type declarations that consumers can load through their normal TypeScript and Jest setup. Keep runtime registration explicit. Surprise side effects on importing a utility type are difficult to debug.

Separate these concerns:

| Package surface | Responsibility | Consumer action |
| --- | --- | --- |
| Matcher functions | Runtime predicate and message | Import for local extension or library setup |
| Registration module | Calls \`expect.extend\` | Add to Jest setup |
| Type augmentation | Declares matcher signatures | Include through package types or setup import |
| Shared domain types | Describes matcher arguments | Import only when authoring helpers |

Avoid declaring a method name likely to collide with another matcher library. Domain-specific names reduce collisions and improve readability. If two packages augment the same name with incompatible signatures, TypeScript errors may be confusing and runtime registration order can overwrite behavior.

Version matcher semantics like an API. Changing inclusive range behavior to exclusive, changing milliseconds to seconds, or broadening a schema check can alter hundreds of tests without changing call sites. Document and review those changes deliberately.

If an AI coding agent proposes a matcher, ask it to list all call sites it intends to replace, show the positive and negative failure output, and explain the invariant in one sentence. Ready-made QA skills install from qaskills.sh with the qaskills CLI and can give agents repeatable review steps, but the project still owns domain language and compatibility.

## Diagnose the Two Most Common Integration Failures

The first failure is compile-time: \`Property 'toHaveValidPagination' does not exist\`. Runtime registration may be correct, but the augmentation is outside the test TypeScript project, targets the wrong module, or is shadowed by dependency duplication.

Diagnose in order:

1. Confirm the declaration augments \`expect\` and exports an empty module marker.
2. Confirm the file is imported or included by the test TypeScript configuration.
3. Confirm the test imports Jest globals in the same style the project expects.
4. Inspect the dependency tree for multiple incompatible copies of relevant types.
5. Restart the editor language service only after fixing configuration.

The second failure is runtime: \`expect(...).toHaveValidPagination is not a function\`. Here the types loaded, but registration did not. Confirm \`expect.extend\` executes in that Jest project, the setup path resolves, and the test is actually running under Jest rather than another runner. Monorepos often have a unit project and an integration project with separate configs.

Do not solve either failure with an untyped cast such as casting \`expect\` to \`any\`. That suppresses the symptom while leaving runtime behavior uncertain.

## What People Get Wrong About Custom Matchers

One mistake is putting assertions inside a matcher and catching every error. This often discards Jest’s useful diff and returns a generic message. Compute the predicate directly or preserve the relevant diagnostic.

Another is doing setup or mutation inside the matcher. \`toHaveCreatedUser\` should observe evidence, not create the user it claims to find. Hidden side effects make repeated or negated assertions surprising.

Teams also overgeneralize. A single matcher with an options object containing twelve flags is a miniature assertion framework. Several focused matchers compose better and fail more precisely.

A fourth error is trusting TypeScript instead of checking received runtime values. API payloads, JavaScript consumers, and casts cross the type boundary. A matcher must fail cleanly rather than throw an accidental property-access exception.

A fifth is ignoring \`.not\` and asymmetric use. The positive case passes, but negative failures print the wrong instruction or TypeScript omits the asymmetric signature. Test every supported calling form.

Finally, teams make matchers for every one-line comparison. Familiar built-in matchers produce predictable output. Extend Jest only when domain vocabulary and diagnostics are materially better.

## Roll Out a Shared Matcher Library Carefully

Start with one high-frequency, high-friction assertion pattern. Capture examples of current failure output and define the new invariant. Implement runtime checks, precise messages, declarations, registration, and matcher tests in one change.

Migrate a handful of call sites and compare failures by intentionally breaking a fixture on a branch. The custom output should answer what was expected, what was received, and which subcondition failed. If it does not, improve the matcher before broad adoption.

Document the matcher signature, units, sync or async behavior, negation meaning, and one example. Include it in a central Jest setup only when use is broad enough. Keep specialized matchers local to their domain package.

Review usage after migration. If tests immediately unpack values and repeat extra checks, the matcher may expose the wrong boundary. If failures need payload logs from elsewhere, improve safe diagnostics. If the invariant changes frequently by product area, split the matcher or return to local assertions.

The broader [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps clarify when Jest is the right runner and when browser or integration tools should own an assertion. A custom matcher improves expression inside a boundary; it does not make that boundary appropriate.

The result should feel boring in the best way: a test reads like the domain, a red result explains itself, TypeScript guides the caller, and runtime behavior matches the declaration.

Before merging a new matcher, capture one intentional failure in a local run and read it without opening the test source. If the output does not identify the broken invariant and the relevant received value, the abstraction is not finished. This small exercise catches vague wording, excessive payload dumps, missing units, and negation mistakes far more effectively than reviewing the passing example alone.

## Frequently Asked Questions

### Why does TypeScript recognize my matcher while Jest cannot run it?

The declaration and runtime extension are separate systems. TypeScript can load a module augmentation even when the Jest project never imports the registration module. Ensure the project’s \`setupFilesAfterEnv\` includes the module that calls \`expect.extend\`, or import that module directly in the affected tests. In a monorepo, check every Jest project configuration separately. Also confirm the file is actually executed under Jest. Do not add a cast to silence the runtime problem; verify registration with a minimal test that imports the setup and invokes the matcher.

### Should a custom matcher throw or return a failed result for bad input?

Return \`pass: false\` when the received value legitimately fails the asserted condition, including a wrong runtime type that the test is meant to detect. Throw a clear \`TypeError\` when the test author configures the matcher impossibly, such as a negative tolerance or reversed bounds that the API forbids. This separates product evidence from matcher misuse. Apply the policy consistently, document it for shared matchers, and test both paths. Avoid accidental throws from reading properties before validating the received value.

### Can Jest custom matchers perform retries or network calls?

They can return promises, so asynchronous observation is possible, but hidden network access and polling often make assertions slow and opaque. Prefer a helper that waits or fetches with an explicit timeout, returns structured evidence, and then passes that evidence to a synchronous matcher. Use an async matcher when the asynchronous operation is inseparable from the domain assertion and its diagnostics clearly show attempts, timeout, and observed state. Always await the expectation. Matchers should not mutate fixtures or conceal setup, because negation and repeated evaluation would become surprising.

### How many conditions should one domain matcher verify?

Include conditions that jointly define one stable invariant and can be explained in a single sentence. A pagination-envelope matcher can reasonably check that items is an array, numeric fields are valid, and item count does not exceed page size. It should not also verify authorization, latency, business totals, and UI labels. Report all cheap subcondition failures when that helps diagnosis, but split independent concepts into separate matchers. If the condition set resembles a full schema, use a schema validator and let the matcher format its structured issues rather than rebuilding validation machinery.
`,
};
