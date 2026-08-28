import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest expectTypeOf Matchers Reference: toEqualTypeOf and Friends',
  description: 'Vitest expectTypeOf and toEqualTypeOf reference for type tests: matcher choice, failure diagnosis, and CI workflows that catch API type drift.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Vitest expectTypeOf Matchers Reference: toEqualTypeOf and Friends

\`vitest expectTypeOf toEqualTypeOf docs\` answer: \`expectTypeOf\` is Vitest's compile-time assertion API, and \`toEqualTypeOf\` checks that two TypeScript types are exactly equivalent for the assertion being made. It does nothing useful at runtime unless Vitest typechecking is enabled, so run it with \`vitest --typecheck\`.

Official API reference: https://main.vitest.dev/api/expect-typeof

Official type testing guide: https://github.com/vitest-dev/vitest/blob/main/docs/guide/testing-types.md

## The Mental Model: These Are Compiler Assertions

\`expectTypeOf\` tests the public shape of TypeScript types. It is not a runtime assertion API. The official Vitest docs warn that during runtime this function does not do anything and that typechecking must be enabled with \`--typecheck\`. That warning is the difference between useful type tests and a green suite that never checked a type.

Use type assertions when a type is part of your product contract: exported SDK functions, page object helpers, API client return types, custom matchers, test data builders, schema inference, fixture factories, and utility types that agents often edit. Runtime tests prove behavior for values. \`expectTypeOf\` proves what TypeScript users are allowed to write.

| Need | Matcher or helper | What it proves |
| --- | --- | --- |
| Exact public API shape | \`toEqualTypeOf\` | Both sides are the same type |
| Assignability | \`toExtend\` | Actual type is assignable to expected type |
| Object subset with stricter object checks | \`toMatchObjectType\` | Object has required shape, with stricter object handling |
| Function argument type | \`parameter(0)\` or \`parameters\` | Function accepts expected inputs |
| Function return type | \`returns\` | Function returns expected type |
| Promise result type | \`resolves\` | Promise resolves to expected value type |
| Property type | \`toHaveProperty\` | Object exposes a property and its type |
| Any, unknown, never checks | \`toBeAny\`, \`toBeUnknown\`, \`toBeNever\` | Type-level failure modes are explicit |

The high-value habit is writing type tests close to the exported boundary. Do not litter every internal generic with assertions. That creates brittle compiler theater. Put type tests where a consumer would feel pain: a helper that used to infer literal keys now widens to \`string\`, a page object method stops returning a discriminated union, or an API client turns \`null\` into \`undefined\` during refactor.

If you maintain AI-generated tests, type assertions pull extra weight. Agents can produce code that "looks TypeScript" but erases useful types with \`any\`, broad \`Record<string, unknown>\`, or accidental widening. A small \`expectTypeOf\` file catches that drift before runtime tests become vague.

For full-suite policy, pair this reference with [Vitest Typecheck Mode for Type Tests](/blog/vitest-typecheck-mode-type-tests). For mock setup hazards, especially with imports and hoisting, keep the separate mental model from [Vitest vi.hoisted Complete Guide](/blog/vitest-vi-hoisted-complete-guide) so type tests do not get mixed with runtime mock timing.

## Install the Habit in CI First

Before choosing matchers, make sure the tests actually run as type tests. Vitest supports \`--typecheck\`. The docs also note that CLI filters such as \`-t\` are supported for type checking. Do not copy Playwright's \`--grep\` into Vitest scripts. Vitest filters by test name with \`-t\` or \`--testNamePattern\`.

\`\`\`json
{
  "scripts": {
    "test": "vitest",
    "test:type": "vitest --typecheck",
    "test:type:api": "vitest --typecheck -t public-api-types"
  }
}
\`\`\`

A tiny type test looks like a runtime test because it still lives in a test file and can use \`test\`. The assertion itself is compiled away in practice. The compiler result is the signal.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type UserSummary = {
  id: string;
  name: string;
  role: 'admin' | 'member';
};

function summarizeUser(input: UserSummary): Pick<UserSummary, 'id' | 'role'> {
  return {
    id: input.id,
    role: input.role,
  };
}

test('public-api-types: summarizeUser return type', () => {
  expectTypeOf(summarizeUser).returns.toEqualTypeOf<Pick<UserSummary, 'id' | 'role'>>();
});
\`\`\`

If \`role\` accidentally widens to \`string\`, this test catches it. A runtime test might still pass with one fixture value. The type test protects the API contract across all callers.

## toEqualTypeOf: Exactness for Exported Contracts

\`toEqualTypeOf\` is the matcher for exact type equality. The official docs show that values with different literal values but the same type can still pass, while missing object properties fail. That distinction matters. You are asserting type shape, not object identity.

Use it when the type must not widen, narrow, or lose fields:

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type ApiProblem = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

function buildProblem(status: number, title: string): ApiProblem {
  return {
    type: 'about:blank',
    title,
    status,
  };
}

test('public-api-types: buildProblem returns ApiProblem exactly', () => {
  expectTypeOf(buildProblem).returns.toEqualTypeOf<ApiProblem>();
});
\`\`\`

This is the matcher I reach for when a library export has a documented type alias. If a function claims to return \`ApiProblem\`, I want exact equality because downstream code may depend on optional fields, required fields, and literal unions staying intact.

Where \`toEqualTypeOf\` becomes too strict is object extension. Suppose a page object method returns a rich internal type, but consumers only need a stable subset. Exact equality would make harmless additions fail. Use \`toExtend\` or \`toMatchObjectType\` there.

| Situation | Use \`toEqualTypeOf\`? | Reason |
| --- | --- | --- |
| Exported SDK response alias | Yes | Public contract should not drift |
| Internal helper return with extra metadata | Usually no | Additions may be harmless |
| Literal union from a parser | Yes | Widening loses safety |
| Object builder used only in tests | Maybe | Depends whether callers rely on exact keys |
| Function overload surface | Often yes, with \`parameters\` and \`returns\` | Consumers feel exact signature changes |

A useful rule: if changing the type would require a changelog entry, assert exactness. If changing the type would only require updating one implementation file, exactness may be overkill.

## toExtend: Assignability Without Over-Specification

\`toExtend\` checks that the actual type extends the expected type. It is closer to "can be used where this expected type is required." The official docs describe it as different from equality and similar in spirit to object matching.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type BasicUser = {
  id: string;
  email: string;
};

type AdminUser = BasicUser & {
  permissions: string[];
};

function loadAdmin(): AdminUser {
  return {
    id: 'u_1',
    email: 'admin@example.test',
    permissions: ['users:read'],
  };
}

test('public-api-types: admin can be used as a basic user', () => {
  expectTypeOf(loadAdmin).returns.toExtend<BasicUser>();
});
\`\`\`

This test says consumers that expect \`BasicUser\` can accept \`loadAdmin()\`. It does not say \`loadAdmin()\` returns only \`BasicUser\`. That is the point.

What people get wrong: they use \`toEqualTypeOf\` for every object and then complain that type tests are fragile. Type tests are only as useful as the contract you encode. If you do not care about extra fields, do not assert equality. Assert assignability. If you care about exact public output, use equality and accept the stricter failure.

Vitest's docs mark \`toMatchTypeOf\` as deprecated since \`expect-type\` v1.2.0 and say to use \`toExtend\` instead. That is a small but important documentation detail. New tests should prefer \`toExtend\`. If you inherit \`toMatchTypeOf\`, do not panic, but avoid spreading it.

## toMatchObjectType: Useful for Plain Object Shapes

\`toMatchObjectType\` performs a strict check on object types and is recommended by the docs for object type matching because it can catch issues like readonly properties. It only works with plain object types, so do not reach for it on unions and deep conditional tricks.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type SearchResult = {
  id: string;
  title: string;
  score: number;
  metadata: {
    source: 'docs' | 'tickets';
  };
};

const result = {
  id: 'r_1',
  title: 'Reset password',
  score: 0.87,
  metadata: {
    source: 'docs',
  },
} satisfies SearchResult;

test('public-api-types: result exposes searchable object fields', () => {
  expectTypeOf(result).toMatchObjectType<{
    id: string;
    title: string;
    metadata: {
      source: 'docs' | 'tickets';
    };
  }>();
});
\`\`\`

This matcher is good for QA utilities that return objects consumed by many tests. You may not care about every diagnostic field, but you do care that the stable search fields remain available and typed.

Do not use it as a replacement for runtime schema validation. A type test does not parse a network response. It only checks your TypeScript declarations. If your API client lies about its parsed value, runtime tests still need to catch that.

## Function Matchers: parameter, parameters, returns

Function type assertions catch drift in helpers that test suites depend on. Page objects, API clients, fixture factories, and custom commands are all good targets.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type LoginOptions = {
  rememberDevice?: boolean;
  redirectTo?: string;
};

async function loginAs(email: string, options: LoginOptions = {}): Promise<{ userId: string }> {
  return {
    userId: options.rememberDevice ? \`\${email}:remembered\` : email,
  };
}

test('public-api-types: loginAs signature', () => {
  expectTypeOf(loginAs).parameter(0).toEqualTypeOf<string>();
  expectTypeOf(loginAs).parameter(1).toEqualTypeOf<LoginOptions | undefined>();
  expectTypeOf(loginAs).returns.resolves.toEqualTypeOf<{ userId: string }>();
  expectTypeOf(loginAs).toBeCallableWith('qa@example.test');
  expectTypeOf(loginAs).toBeCallableWith('qa@example.test', { rememberDevice: true });
});
\`\`\`

The second parameter includes \`undefined\` because the function provides a default value and callers may omit it. That is the sort of detail type tests make visible during review.

Use \`parameters\` when tuple shape matters:

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

function trackEvent(name: string, properties: Record<string, string | number>): void {
  console.log(name, properties);
}

test('public-api-types: trackEvent parameters stay stable', () => {
  expectTypeOf(trackEvent).parameters.toEqualTypeOf<
    [name: string, properties: Record<string, string | number>]
  >();
});
\`\`\`

That labeled tuple is readable in failure messages and editor hovers. It also makes code review easier. If someone changes \`properties\` to \`Record<string, unknown>\`, the test fails and the review discussion is about the contract, not the implementation.

## Property and Item Matchers

\`toHaveProperty\` checks that an object type exposes a property and returns matchers for that property's type. \`items\` extracts an array item type. These are good when exact whole-object comparisons are too noisy.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type AuditEvent = {
  id: string;
  actorId: string;
  action: 'created' | 'updated' | 'deleted';
  tags: string[];
};

const event: AuditEvent = {
  id: 'evt_1',
  actorId: 'user_1',
  action: 'created',
  tags: ['smoke'],
};

test('public-api-types: audit event fields', () => {
  expectTypeOf(event).toHaveProperty('actorId').toBeString();
  expectTypeOf(event).toHaveProperty('action').toEqualTypeOf<'created' | 'updated' | 'deleted'>();
  expectTypeOf(event.tags).items.toBeString();
});
\`\`\`

This style reads like a contract checklist. It is also less brittle than asserting the entire object type when the object has ten fields and only three are public.

The danger is writing a property assertion that is too weak. \`toHaveProperty('action')\` alone proves the key exists, but not the union. Chain the assertion when the property type matters.

## Any, Unknown, Never, and Nullable Checks

Some of the most valuable type tests are negative space. They prove your API did not collapse into \`any\`, did not return \`unknown\` past a validation boundary, and did not leak \`never\` from a conditional type.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type ParseSuccess<T> = {
  ok: true;
  value: T;
};

type ParseFailure = {
  ok: false;
  issues: string[];
};

type ParseResult<T> = ParseSuccess<T> | ParseFailure;

function parseJsonObject(text: string): ParseResult<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ok: true, value: value as Record<string, unknown> };
    }
    return { ok: false, issues: ['expected object'] };
  } catch {
    return { ok: false, issues: ['invalid json'] };
  }
}

test('public-api-types: parser does not erase result type', () => {
  expectTypeOf(parseJsonObject).returns.not.toBeAny();
  expectTypeOf(parseJsonObject).returns.not.toBeUnknown();
  expectTypeOf(parseJsonObject).returns.toEqualTypeOf<ParseResult<Record<string, unknown>>>();
});
\`\`\`

This is where type tests catch agent mistakes quickly. An agent under pressure may add \`as any\` to quiet a compiler error. Runtime tests may still pass. \`not.toBeAny()\` turns that shortcut into a visible regression.

Use \`toBeNullable\` only when the contract intentionally allows \`null\` or \`undefined\`. Do not use it as a vague check for optional data. Optional object properties and nullable values have different caller behavior.

| Type shape | Caller must handle | Good assertion |
| --- | --- | --- |
| \`string | null\` | Explicit null value | \`toBeNullable\` plus equality or extension |
| \`name?: string\` | Missing property | \`toHaveProperty\` is not enough if absence matters |
| \`unknown\` | Validation required | \`toBeUnknown\` at boundary, not after parser |
| \`any\` | No safety | Usually \`not.toBeAny\` on public exports |
| \`never\` | Impossible path | \`toBeNever\` for exhaustiveness helpers |

## Extract, Exclude, Guards, and Asserts

Vitest exposes \`extract\` and \`exclude\` for narrowing unions inside type assertions. It also exposes \`guards\` and \`asserts\` to inspect type guard and assertion functions. These are specialized, but they shine in validation-heavy QA code.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type ApiResponse =
  | { kind: 'ok'; body: { id: string } }
  | { kind: 'retry'; afterSeconds: number }
  | { kind: 'error'; message: string };

function isRetry(response: ApiResponse): response is Extract<ApiResponse, { kind: 'retry' }> {
  return response.kind === 'retry';
}

function assertOk(response: ApiResponse): asserts response is Extract<ApiResponse, { kind: 'ok' }> {
  if (response.kind !== 'ok') {
    throw new Error('expected ok response');
  }
}

test('public-api-types: response narrowing helpers', () => {
  expectTypeOf<ApiResponse>().extract<{ kind: 'retry' }>().toEqualTypeOf<{
    kind: 'retry';
    afterSeconds: number;
  }>();

  expectTypeOf<ApiResponse>().exclude<{ kind: 'error' }>().toEqualTypeOf<
    { kind: 'ok'; body: { id: string } } | { kind: 'retry'; afterSeconds: number }
  >();

  expectTypeOf(isRetry).guards.toEqualTypeOf<{ kind: 'retry'; afterSeconds: number }>();
  expectTypeOf(assertOk).asserts.toEqualTypeOf<{ kind: 'ok'; body: { id: string } }>();
});
\`\`\`

These assertions are worth it when your runtime code branches on discriminated unions. If the union changes, the tests force you to update narrowing helpers instead of letting them silently fall behind.

Do not overuse these matchers on opaque third-party types. If the type comes from a dependency and you only consume a subset, assert your wrapper's public contract. Pinning every detail of a dependency's conditional type can create noisy failures during harmless upgrades.

## Failure Story: The Green Suite That Stopped Checking Types

Symptom: an SDK package shipped a minor release where \`createClient().request()\` returned \`Promise<any>\` instead of \`Promise<ApiResult<T>>\`. Runtime tests passed. Customers lost autocomplete and started filing issues about unsafe response handling.

Wrong theory: the team blamed a TypeScript version mismatch in customer projects. The local test suite had several \`expectTypeOf\` assertions, so engineers assumed type tests were covered.

Actual cause: the CI script ran \`vitest\`, not \`vitest --typecheck\`. The \`expectTypeOf\` calls executed at runtime but did not enforce compiler failures. A refactor introduced \`as any\` in a generic helper, and the green runtime suite never noticed.

Fix: the package added a separate \`test:type\` script using \`vitest --typecheck\`, marked public type tests with \`public-api-types\`, and added \`not.toBeAny()\` assertions around exported client methods. The team also updated agent instructions: never silence public generic errors with \`any\`; add a type test that proves the intended inference.

The lesson is blunt: \`expectTypeOf\` without typecheck mode is decoration. Wire the command first.

## Matcher Selection Cheat Sheet

Use this table during review when a contributor adds or changes a type assertion:

| Review question | Better matcher | Example target |
| --- | --- | --- |
| Does this export need exact shape? | \`toEqualTypeOf\` | SDK response, schema-inferred model |
| Is a richer type acceptable? | \`toExtend\` | Admin user usable as basic user |
| Is this plain object subset important? | \`toMatchObjectType\` | Fixture factory output |
| Did a helper lose a literal union? | \`toEqualTypeOf\` on property or return | \`'draft' | 'published'\` |
| Did a public export become \`any\`? | \`not.toBeAny\` | Generated API client method |
| Does a function accept the documented args? | \`toBeCallableWith\` or \`parameters\` | Page object command |
| Does async output remain typed? | \`returns.resolves\` | API client promise |

When in doubt, write the assertion that would fail for the exact regression you fear. That sentence sounds obvious, but it prevents a lot of vague type tests. If the risk is "the return type widens," equality is right. If the risk is "callers can no longer pass this options object," callable assertions are right. If the risk is "we forgot a property," property assertions are right.

## Type Tests for QA Utilities

QA code has its own public APIs. Page objects, custom fixtures, test data builders, mock servers, and reporting helpers are used across hundreds of tests. Break their types and you create slow, confusing failures. A few type assertions protect the suite itself.

\`\`\`typescript
import { expectTypeOf, test } from 'vitest';

type TestUser = {
  id: string;
  email: string;
  traits: Record<string, string | number | boolean>;
};

function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: overrides.id ?? 'user_1',
    email: overrides.email ?? 'qa@example.test',
    traits: overrides.traits ?? {},
  };
}

test('public-api-types: makeUser supports partial overrides', () => {
  expectTypeOf(makeUser).toBeCallableWith();
  expectTypeOf(makeUser).toBeCallableWith({ email: 'lead@example.test' });
  expectTypeOf(makeUser).parameter(0).toEqualTypeOf<Partial<TestUser> | undefined>();
  expectTypeOf(makeUser).returns.toEqualTypeOf<TestUser>();
});
\`\`\`

This protects the ergonomics of test authors. If someone changes \`traits\` to \`Record<string, string>\`, a runtime fixture test may still pass with string-only traits. The type test catches the narrower contract before dozens of tests need updates.

## How to Keep Type Tests Maintainable

Name type tests by contract, not implementation. \`public-api-types: makeUser supports partial overrides\` is better than \`makeUser type test\`. It tells a reviewer why the assertion exists. Keep them near the code they protect or in a dedicated \`*.test-d.ts\` style location if your project already uses one. Follow the project's Vitest include settings rather than inventing a new pattern.

Avoid type tests that restate obvious implementation details. If a function has an explicit return type and the test asserts the same alias, the value is limited unless the function body uses inference elsewhere. The better target is inferred public output, overload behavior, conditional utilities, and exported generics.

Add one failing-example comment only when it clarifies intent. \`@ts-expect-error\` can be useful, but Vitest's guide warns about false positives from typos if files are not also run appropriately. If you use \`@ts-expect-error\`, keep the example tiny and make sure the file is included in the right Vitest and TypeScript paths.

## Frequently Asked Questions

### Does expectTypeOf run at runtime?

No, not in the way runtime \`expect\` assertions do. Vitest's docs warn that \`expectTypeOf\` does not do useful runtime work and requires typechecking to be enabled. Run \`vitest --typecheck\` in CI or your type assertions can sit in a green suite without protecting anything. Treat the command as part of the feature, not an optional speed knob.

### When should I choose toEqualTypeOf instead of toExtend?

Use \`toEqualTypeOf\` when exact type shape is the contract: exported response aliases, literal unions, overloaded function signatures, or schema-inferred types. Use \`toExtend\` when assignability is enough and extra fields are acceptable. Many fragile type suites come from using equality where the product only needed compatibility. Match the assertion to the breaking change you are trying to catch.

### Is toMatchTypeOf still recommended?

New tests should use \`toExtend\` for assignability-style checks. The Vitest API page marks \`toMatchTypeOf\` as deprecated through the underlying \`expect-type\` package and points to \`toExtend\` instead. Existing tests using \`toMatchTypeOf\` are not automatically broken, but spreading deprecated matcher usage makes future maintenance harder. Update opportunistically when touching those files.

### Can type tests replace runtime tests?

No. Type tests prove TypeScript contracts, not production values. They cannot prove that a server returned valid JSON, that a parser handled bad input, or that a browser interaction worked. Use \`expectTypeOf\` for compile-time API drift and runtime \`expect\` for behavior. The best QA suites use both, especially around API clients and shared test utilities.
`,
};
