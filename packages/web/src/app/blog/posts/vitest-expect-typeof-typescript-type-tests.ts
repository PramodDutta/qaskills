import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Write TypeScript Type Tests with Vitest expectTypeOf()',
  description:
    'Write precise TypeScript type tests with Vitest expectTypeOf(), catch public API regressions, and separate compile-time assertions from runtime tests.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Write TypeScript Type Tests with Vitest expectTypeOf()

An overload still returns the right value at runtime, but a refactor widens its inferred type from \`User\` to \`User | undefined\`. JavaScript assertions stay green. Downstream TypeScript consumers now need a guard they did not need yesterday. That is a public API regression, and \`expectTypeOf()\` can pin it down beside the runtime suite.

Vitest's type expectation API is modeled for compile-time relationships: equality, assignability, properties, parameters, returns, constructors, and common type categories. These assertions are checked by TypeScript when Vitest performs type checking. They do not inspect runtime values.

## Type assertions are a separate execution lane

Running \`vitest\` normally executes transformed JavaScript tests. TypeScript syntax is removed during transformation, so ordinary execution is not a full type check. Vitest provides \`vitest --typecheck\` for type tests, and files conventionally use \`.test-d.ts\` or \`.spec-d.ts\` names.

| Command | What it evaluates | Finds a widened return type? | Runs application code? |
|---|---|---:|---:|
| \`vitest run\` | Runtime suites | Not by itself | Yes |
| \`vitest --typecheck\` | Typecheck suites | Yes | No |
| \`tsc --noEmit\` | Project compiler graph | Yes | No |
| Package consumer fixture | Published declarations in a sample project | Yes | Only if separately executed |

Keep runtime and type checks in CI. A function can have the promised type but calculate the wrong value, or return the right value while exposing a harmful inferred type.

## Pinning inference on a generic API

Consider a typed event registry. Its value is the correlation between the event name and payload, not merely that both arguments are individually valid.

\`\`\`ts
// src/events.ts
export type AppEvents = {
  'user.created': { id: string; email: string };
  'invoice.paid': { invoiceId: string; amountCents: number };
};

export function emit<K extends keyof AppEvents>(
  name: K,
  payload: AppEvents[K],
): { name: K; payload: AppEvents[K] } {
  return { name, payload };
}

export function handler<K extends keyof AppEvents>(
  name: K,
  callback: (payload: AppEvents[K]) => void,
): void {
  void name;
  void callback;
}
\`\`\`

The type test checks exact inference and invalid calls:

\`\`\`ts
// src/events.test-d.ts
import { expectTypeOf, test } from 'vitest';
import { emit, handler } from './events';

test('event names preserve their matching payload types', () => {
  const result = emit('user.created', {
    id: 'u_1',
    email: 'reader@example.test',
  });

  expectTypeOf(result).toEqualTypeOf<{
    name: 'user.created';
    payload: { id: string; email: string };
  }>();

  handler('invoice.paid', (payload) => {
    expectTypeOf(payload).toEqualTypeOf<{
      invoiceId: string;
      amountCents: number;
    }>();
  });

  // @ts-expect-error invoice payload cannot be used for user.created
  emit('user.created', { invoiceId: 'inv_1', amountCents: 2500 });
});
\`\`\`

The negative case uses TypeScript's \`@ts-expect-error\`. It succeeds only when the following line produces an error and fails if the directive becomes unnecessary. That is appropriate when the contract is "this program must not compile." Do not use \`@ts-ignore\`, which does not complain when the error disappears.

## Equality and assignability answer different questions

\`toEqualTypeOf<T>()\` is strict about structural equality. \`toMatchTypeOf<T>()\` checks assignability, making it suitable when extra properties or narrower literal values are acceptable.

\`\`\`ts
import { expectTypeOf, test } from 'vitest';

type PublicUser = { id: string; role: 'admin' | 'member' };

test('distinguishes exact shape from assignable shape', () => {
  const administrator = {
    id: 'u_7',
    role: 'admin' as const,
    permissions: ['billing'],
  };

  expectTypeOf(administrator).toMatchTypeOf<PublicUser>();
  expectTypeOf<PublicUser>().not.toEqualTypeOf<typeof administrator>();
});
\`\`\`

Use equality for exported aliases, overload returns, and intentional tuples. Use assignability for implementations satisfying a public surface. An equality assertion against every internal object shape makes refactoring noisy without protecting consumers.

| Contract question | Matcher | Example intent |
|---|---|---|
| Are these types structurally identical? | \`toEqualTypeOf\` | Generated DTO matches declared DTO |
| Can this value be supplied there? | \`toMatchTypeOf\` | Adapter satisfies a port |
| Is a property present with a specific type? | \`toHaveProperty\` then chained assertion | Response exposes \`requestId: string\` |
| Does a function accept these arguments? | \`parameter(n)\` or \`parameters\` | Callback signature remains stable |
| What does an async function resolve to? | \`returns.resolves\` | Client resolves to a domain object |

## Testing function parameters and returns

The fluent API can target parts of a callable type. This is clearer than reconstructing utility types for every assertion.

\`\`\`ts
import { expectTypeOf, test } from 'vitest';
import { createClient } from './client';

test('client method keeps its consumer-facing signature', () => {
  const client = createClient({ baseUrl: 'https://api.example.test' });

  expectTypeOf(client.findUser).parameter(0).toEqualTypeOf<string>();
  expectTypeOf(client.findUser)
    .returns.resolves.toEqualTypeOf<{ id: string; displayName: string }>();
  expectTypeOf(client.close).returns.toEqualTypeOf<void>();
});
\`\`\`

The call chain describes the contract directly. For overloaded functions, be cautious: TypeScript utilities and introspection often observe the final overload signature rather than proving every overload. Exercise each overload with a real typed call and assert each inferred result.

## Overloads need call-site tests

Suppose \`parse\` returns a different type for two format literals. A declaration-level assertion can miss correlation. Call-site checks model what an editor and consumer see.

\`\`\`ts
import { expectTypeOf, test } from 'vitest';
import { parse } from './parse';

test('format overloads infer distinct results', () => {
  const json = parse('{"ok":true}', 'json');
  const text = parse('hello', 'text');

  expectTypeOf(json).toEqualTypeOf<unknown>();
  expectTypeOf(text).toEqualTypeOf<string>();

  const format: 'json' | 'text' = Math.random() > 0.5 ? 'json' : 'text';
  const dynamic = parse('payload', format);
  expectTypeOf(dynamic).toEqualTypeOf<unknown>();
});
\`\`\`

The exact dynamic result depends on the implementation signatures. The point is to encode intended consumer behavior, including union inputs. If the overload set rejects a union that callers legitimately have, the test will expose that usability issue.

## Generic constraints and negative space

Positive assertions show what an API accepts. Mature type suites also define what must be rejected: unknown field names, incompatible serializers, missing discriminants, and mutable values where readonly inputs are promised.

Keep the erroneous expression minimal. A line with three independent mistakes can keep producing an error after the contract you cared about breaks. Whenever TypeScript supports it, use \`@ts-expect-error\` with a short explanation and one deliberate violation.

Do not assert compiler diagnostic wording. TypeScript error text can change between versions. The stable requirement is that the program is rejected at the annotated line.

The \`satisfies\` operator complements type tests. It checks assignability without replacing the inferred type of an expression. For a route table, \`satisfies RouteMap\` can preserve literal keys, and \`expectTypeOf\` can then prove that those keys remain a useful union.

## Configuring Vitest typecheck files

Vitest's \`typecheck\` configuration controls the checker and include patterns. Defaults have changed across releases, so keep intent explicit and confirm against the installed Vitest version.

\`\`\`ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.ts'],
      tsconfig: './tsconfig.type-tests.json',
    },
  },
});
\`\`\`

\`enabled: true\` makes type checking part of the configured run. Many teams instead keep it as an explicit CI command to make timing and failures separate. Either is valid if the lane cannot be accidentally skipped.

A dedicated TypeScript config can include source and type-test files while excluding build output:

\`\`\`json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "skipLibCheck": false
  },
  "include": ["src/**/*.ts", "src/**/*.test-d.ts"],
  "exclude": ["dist", "node_modules"]
}
\`\`\`

Turning \`skipLibCheck\` off catches declaration conflicts but can add noise and time from dependencies. Decide whether the type-test lane owns dependency declaration health. The [Vitest configuration and setup guide](/blog/vitest-config-setup-guide-2026) covers environment and include behavior, while the [Vitest workspace monorepo guide](/blog/vitest-workspace-monorepo-testing-guide) shows how package-specific compiler contexts fit together.

## Testing the declarations consumers receive

Source type tests can pass while emitted \`.d.ts\` files are wrong. A build may omit declarations, rewrite module paths incorrectly, or hide a type that an exported signature references. Libraries should add a consumer-level check against packed or built output.

One approach is a small fixture package whose dependency points to the produced tarball. Its \`tsconfig.json\` uses the same module resolution modes supported by consumers, and its source imports only from the package's public entry point. Run \`tsc --noEmit\` there after packaging.

Source tests and consumer fixtures protect different boundaries:

| Layer | Imports from | Best at catching |
|---|---|---|
| Vitest type test | Source module | Inference and generic design regressions |
| Declaration build check | Generated \`.d.ts\` | Emitter and bundler problems |
| Packed consumer fixture | Public package name | Exports maps and resolution failures |
| Runtime Vitest suite | Executable module | Behavioral defects |

Do not make type tests import private paths if the contract is public. That can bless APIs consumers cannot legally resolve.

## Version-sensitive contracts

TypeScript inference changes between compiler releases. A library supporting several TypeScript versions may need a version matrix. Avoid assuming one \`expectTypeOf\` result is stable across unsupported compilers. State the supported range and test its lower bound plus the current version when practical.

Dependency types also influence inference. Pin test dependencies in the lockfile, and review type-only upgrades with the same seriousness as runtime upgrades. A framework's new overload can change which branch TypeScript selects without changing emitted JavaScript.

If exact equality fails with an unreadable mismatch, assign the types to named aliases and compare smaller components. Conditional and mapped types can produce huge diagnostics. A narrow assertion on keys, property values, or call results gives a reviewer a more actionable failure.

## Compile time is part of type API quality

A type can be correct yet painfully expensive for editors and CI. Deep recursive conditional types and large unions can cause slow checking or instantiation-depth errors. \`expectTypeOf\` proves semantics, not performance.

For heavily typed libraries, track \`tsc --extendedDiagnostics\` in a representative consumer fixture. Treat timings as environment-sensitive trends, not universal thresholds. Include pathological but realistic call sites, such as a router with many endpoints, rather than benchmarking an empty import.

Type tests themselves can inflate cost if they repeat enormous inline types. Extract meaningful aliases, but do not hide the call site whose inference is under test.

## Review rules that keep type suites useful

Assert contracts users depend on: inference from literals, preservation of discriminated unions, readonly behavior, overload selection, and rejection of invalid combinations. Avoid pinning incidental implementation types or every property of an internal helper.

Pair a type assertion with a runtime test when both claims matter. \`expectTypeOf(result).toEqualTypeOf<number>()\` cannot prove the value is 42. \`expect(result).toBe(42)\` cannot prove a generic call inferred the intended branded number.

Read failures as design feedback. If an assertion requires several casts to compile, it may be testing the cast rather than the API. Build representative values through the public interface and let inference operate naturally.

## React and framework component contracts

Component libraries often expose type behavior that runtime rendering cannot prove. A polymorphic button might accept an href only when rendered as an anchor, or a callback payload may narrow from another prop. Test those relationships through representative JSX call sites in a type-test file configured for the project's JSX mode.

Do not assert a framework component's entire inferred implementation type. Framework upgrades add internal properties and overloads. Instead, prove consumer actions: a documented prop combination compiles, a prohibited combination has an expected error, and event handlers receive the intended element or domain value.

For generic components, inference from children can differ from inference from an explicit type argument. Include both if the library promises both. A cast such as as any defeats the contract and should not appear merely to make the type test convenient.

## Branded types and type guards

Branded identifiers prevent mixing structurally identical strings. A type suite should prove that a validated value gains the brand, an ordinary string cannot enter a protected API, and separate brands remain incompatible.

Type guards deserve call-site narrowing tests. Create an unknown value, branch on the guard, and assert its type inside both branches. A runtime suite must separately prove the guard rejects malformed values. TypeScript trusts a declared type predicate even when its implementation always returns true, so only the pairing catches a dishonest guard.

Assertion functions using an asserts return type follow the same principle. After the call, assert the narrowed type. Before the call, retain a negative case showing the original unknown value cannot be used.

## Type tests in a monorepo dependency graph

In a workspace, a package can accidentally typecheck against sibling source through path aliases while consumers receive built declarations. Decide which boundary each lane targets. Source-level tests should use the package compiler context. Consumer tests should resolve through package exports and built output.

Run upstream declaration builds before downstream consumer checks when project references require them. Avoid one root type-test configuration that merges incompatible DOM, Node, React Native, and server globals. Package-specific configurations expose the same environment consumers see and prevent accidental ambient types from making invalid code compile.

When two packages intentionally support different TypeScript versions, do not hoist that fact away in the test design. Run each supported compiler against a small consumer fixture. Vitest's current process uses one resolved compiler, so a version matrix belongs in separate package-manager or CI commands.

## Diagnosing a failed equality assertion

Start by deciding whether equality was truly the contract. If assignability was intended, change the matcher rather than forcing types through helper aliases. If equality matters, break the type into keys, optionality, readonly status, and property types.

Optional properties are not the same as properties whose values include undefined, especially under exact optional property semantics. Readonly tuples are not identical to mutable tuples. Literal widening can turn a string literal into string when an object lacks a const assertion or suitable generic constraint. These are meaningful API differences, not matcher noise.

Create a tiny local assignment in both directions when diagnostics remain opaque. The compiler's error at the assignment often identifies the first incompatible member more clearly than a deeply nested fluent assertion. Remove that temporary probe after encoding the focused permanent expectation.

## Type-only imports and module side effects

A type-test file should use \`import type\` when it needs only a declaration. This documents intent and prevents compiler settings from preserving an unnecessary runtime import in adjacent executable tests. For call-site inference, import the value normally because its callable type comes from the real export.

Be alert to barrel files. Importing a symbol from a package root can expose a different type than importing its implementation path because the barrel may wrap, rename, or omit generics. Public contract tests should use the supported public entry point even when a relative source import gives prettier diagnostics.

Type checking does not execute module side effects, so it cannot prove that a runtime export exists or that an ESM and CommonJS interop shape matches the declaration. Add a runtime import smoke test against built output. This is particularly important when a default export is synthesized by one bundler configuration but the declaration advertises another shape.

## Snapshotting types is rarely the best default

Large serialized type snapshots look comprehensive, but a small compiler or dependency change can rewrite them without changing consumer capability. Reviewers then approve opaque diffs. Prefer focused assertions on calls and relationships.

A snapshot can be valuable for a generated declaration file when the generation output itself is the product. Normalize unstable paths and headers, review it as an artifact, and still compile a consumer example. Text equality cannot determine whether two differently printed conditional types behave equivalently.

When an exported surface is intentionally large, API extraction tools can complement Vitest type assertions. Use Vitest for executable type scenarios and the extractor for declaration-review workflow, rather than forcing one mechanism to cover both jobs.

## Frequently Asked Questions

### Do \`expectTypeOf()\` assertions run at runtime?

They are compile-time assertions. Use Vitest's typecheck mode for \`.test-d.ts\` files and keep ordinary runtime assertions for executed behavior.

### When should I choose \`toMatchTypeOf\` over \`toEqualTypeOf\`?

Choose matching when assignability is the contract, such as an implementation satisfying a public interface. Choose equality when an exact exported alias, tuple, or inferred return shape must remain unchanged.

### How do I test that a call must be rejected?

Place \`// @ts-expect-error\` immediately before one intentionally invalid expression. The type test then fails if the expression becomes legal. Keep each negative case focused on one violation.

### Why did my overload assertion inspect only one signature?

TypeScript's type-level view of overloaded functions often favors the last signature. Test overloads through actual calls with different arguments, then assert the inferred type of each result.

### Is a passing source type test enough for an npm library?

No. Also typecheck a consumer fixture against built or packed output. That catches broken declaration emission, package exports, and module-resolution behavior that source imports bypass.
`,
};
