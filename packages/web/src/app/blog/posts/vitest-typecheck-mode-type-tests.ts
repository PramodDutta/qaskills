import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Typecheck Mode Type Tests That Catch API Regressions',
  description: 'Use vitest typecheck mode type tests to lock down TypeScript APIs, verify expected errors, avoid false positives, and make type regressions actionable in CI.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Vitest Typecheck Mode Type Tests That Catch API Regressions

Vitest typecheck mode type tests verify compile-time contracts that ordinary runtime assertions cannot see. Put type-focused cases in \`*.test-d.ts\` files, express positive relationships with \`expectTypeOf\` or \`assertType\`, express intended rejections with carefully targeted \`@ts-expect-error\` directives, and run Vitest with \`--typecheck\`. Vitest invokes the configured TypeScript checker, parses diagnostics, and reports type failures through the test interface.

The payoff is a regression suite for the developer experience of your API: inferred return types, generic constraints, overload selection, readonly guarantees, discriminated unions, and invalid calls. The suite should complement runtime tests, not replace them. Runtime tests prove values and side effects. Type tests prove what consumers can and cannot compile.

This guide builds a small typed query helper, protects its public contract, shows how to integrate type checking into CI, and diagnoses a dangerous false positive where an expected-error test passes for the wrong reason.

## Identify Contracts That Exist Only at Compile Time

Type tests are valuable when a breaking change can occur without changing runtime output. A helper may still return the same object, but a generic widening could turn a precise property into \`unknown\`. A library may still execute, while a parameter that used to reject an invalid key now accepts any string. A discriminated union can lose exhaustiveness even though current fixtures cover only one variant.

Begin with consumer-facing promises. Phrase them as capabilities and prohibitions:

| API promise | Positive type case | Negative type case |
|---|---|---|
| Selected keys remain precise | Selecting \`id\` returns \`Pick<User, 'id'>\` | Missing properties are not exposed |
| Keys belong to the source type | \`id\` and \`name\` compile | \`password\` is rejected |
| Result is readonly | Reading selected values compiles | Reassignment is rejected |
| Empty selection is supported | Empty tuple returns empty shape | Arbitrary output keys do not appear |
| Runtime validation still works | Existing keys return values | Missing runtime keys are handled by design |

These statements lead to stable tests. Testing the internal conditional-type spelling would make harmless refactors expensive. Test the public behavior a TypeScript consumer observes.

Here is the implementation under test:

\`\`\`typescript
// src/select-fields.ts
export function selectFields<
  Source extends object,
  const Keys extends readonly (keyof Source)[],
>(source: Source, keys: Keys): Readonly<Pick<Source, Keys[number]>> {
  const result: Partial<Pick<Source, Keys[number]>> = {}

  for (const key of keys) {
    result[key] = source[key]
  }

  return result as Readonly<Pick<Source, Keys[number]>>
}
\`\`\`

The assertion at the return boundary is an implementation detail worth reviewing, but the public signature carries the contract. Type tests should verify inference from real calls rather than restating the generic declaration.

## Establish Runtime Correctness Separately

Static analysis does not execute the type-test file. It cannot prove that the loop copies the correct values, that getters behave as expected, or that the function avoids mutation. Write ordinary runtime tests for those claims.

\`\`\`typescript
// src/select-fields.test.ts
import { expect, test } from 'vitest'
import { selectFields } from './select-fields'

test('copies only selected fields', () => {
  const user = { id: 7, name: 'Asha', active: true }

  expect(selectFields(user, ['id', 'name'])).toEqual({
    id: 7,
    name: 'Asha',
  })
})

test('does not mutate the source object', () => {
  const user = { id: 7, name: 'Asha' }

  selectFields(user, ['id'])

  expect(user).toEqual({ id: 7, name: 'Asha' })
})
\`\`\`

Notice what this suite does not prove. It does not prove that \`password\` is rejected as a key, because a runtime test file is transpiled and executed. It does not prove the returned type contains only \`id\` and \`name\`. Those claims belong in typecheck mode.

| Question | Runtime test | Type test |
|---|---:|---:|
| Are selected values copied correctly? | Yes | No |
| Does inference preserve literal keys? | No | Yes |
| Is an invalid key rejected by the compiler? | No | Yes |
| Does the function mutate its input? | Yes | No |
| Is the result statically readonly? | No | Yes |
| Does an error throw at execution time? | Yes | Only if modeled in types |

A mature suite often pairs the two around the same API. This is not duplicate coverage because each test uses a different oracle.

## Write Positive Type Assertions From Consumer Calls

Vitest exposes \`expectTypeOf\` and \`assertType\` for type testing. Prefer assertions based on inferred variables. They exercise the compiler path a user takes and catch accidental widening.

\`\`\`typescript
// src/select-fields.test-d.ts
import { assertType, expectTypeOf, test } from 'vitest'
import { selectFields } from './select-fields'

type User = {
  id: number
  name: string
  active: boolean
}

const user: User = {
  id: 7,
  name: 'Asha',
  active: true,
}

test('preserves selected key types', () => {
  const selected = selectFields(user, ['id', 'name'])

  expectTypeOf(selected).toEqualTypeOf<
    Readonly<Pick<User, 'id' | 'name'>>
  >()
  assertType<number>(selected.id)
  assertType<string>(selected.name)
})

test('supports an empty key tuple', () => {
  const selected = selectFields(user, [])
  expectTypeOf(selected).toEqualTypeOf<Readonly<Pick<User, never>>>()
})
\`\`\`

The explicit generic expected type produces more useful diagnostics than comparing against a concrete object expression. When an assertion fails, read the reported expected and actual property types rather than stopping at a generic “constraint not satisfied” message.

Use exact equality when exactness is the contract. Use an extension relationship only when additional properties are allowed by design. An assertion that is too permissive can approve a widened or polluted result.

## Test Rejected Usage Without Creating False Confidence

Negative type tests prove that invalid consumer code fails to compile. TypeScript’s \`@ts-expect-error\` directive is useful because it itself becomes an error when the following line no longer produces a diagnostic. That lets the suite detect accidental acceptance.

\`\`\`typescript
// src/select-fields-negative.test-d.ts
import { test } from 'vitest'
import { selectFields } from './select-fields'

type User = {
  id: number
  name: string
}

const user: User = { id: 7, name: 'Asha' }

test('rejects keys outside the source type', () => {
  // @ts-expect-error password is not a key of User
  selectFields(user, ['password'])
})

test('returns a readonly selection', () => {
  const selected = selectFields(user, ['name'])

  // @ts-expect-error selected fields are readonly
  selected.name = 'Changed'
})
\`\`\`

What people get wrong is assuming any diagnostic on the next line proves the intended restriction. Consider a typo:

\`\`\`typescript
import { test } from 'vitest'
import { selectFields } from './select-fields'

type User = { id: number; name: string }
const user: User = { id: 7, name: 'Asha' }

test('bad negative test passes for the wrong reason', () => {
  // @ts-expect-error intended to reject password
  selectFieldz(user, ['password'])
})
\`\`\`

The compiler reports that \`selectFieldz\` does not exist, so the expected-error directive is satisfied. The test says nothing about invalid keys. Vitest’s documentation explicitly warns about this category of false positive. Review the line so it contains one intended error source, keep identifiers simple, and pair negative tests with positive assertions against the real symbol.

If a negative line combines several potentially invalid operations, split it. A missing import, wrong argument count, and invalid key on one line make the diagnostic ambiguous. Small negative cases are easier to audit when TypeScript evolves.

## Configure Discovery Without Hiding Runtime Tests

By default, Vitest treats files ending in \`*.test-d.ts\` as type tests. The \`typecheck.include\` configuration can change the pattern. Use a naming convention that clearly separates compile-time cases from executable tests, and confirm both groups appear in output.

A minimal configuration is:

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    typecheck: {
      include: ['src/**/*.test-d.ts'],
    },
  },
})
\`\`\`

Use the documented CLI flag in the package script:

\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:types": "vitest --typecheck.only --run"
  }
}
\`\`\`

Then run the suites:

\`\`\`bash
npm run test
npm run test:types
npx vitest --typecheck.only --run -t "preserves selected key types"
\`\`\`

Vitest supports \`-t\` for typechecking, but type-test files are statically analyzed rather than executed. Dynamic test names, \`test.each\`, and similar runtime name generation do not behave like ordinary executed tests because the compiler does not evaluate them. Prefer literal, stable names in type-test files.

Vitest reports source type errors it finds as well as errors in the type-test file. The \`typecheck.ignoreSourceErrors\` option can suppress source errors, but enabling it casually can make a green type suite coexist with a broken project. Leave source errors visible unless the repository has a deliberate migration strategy and a separately enforced typecheck for production source.

## Make CI Fail on the Right Type Contract

CI should run runtime and type suites as explicit checks or through a combined documented command. Separate jobs can improve diagnosis and ownership. They also prevent a long browser suite from obscuring a fast compiler regression.

\`\`\`yaml
name: test

on:
  pull_request:

jobs:
  runtime-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run test

  type-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:types
\`\`\`

Pin the TypeScript and Vitest versions through the lockfile. Compiler upgrades can intentionally improve or alter inference and diagnostics. Treat that as a compatibility event: run the entire type suite, inspect failures, and decide whether each is a real API regression, a newly detected bug, or an assertion that depended on an incidental compiler detail.

The [complete JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps position type checks alongside other runners and layers. The [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) addresses runtime UI targeting, which solves a different problem. A locator can be perfectly typed and still select the wrong user-facing element, so preserve browser assertions where behavior crosses into the DOM.

## Diagnose the Type Test That Suddenly Goes Green

The most dangerous type regression can turn a negative test green. Imagine an agent simplifies the function signature to accept \`readonly string[]\` and returns \`Record<string, unknown>\`. The invalid \`password\` call now compiles. A correctly written \`@ts-expect-error\` directive becomes unused, so typecheck mode fails. That failure is the desired alarm.

If CI instead stays green, investigate four possibilities:

1. The negative test file no longer matches \`typecheck.include\`.
2. The expected-error line still contains another diagnostic, such as a typo.
3. The relevant test was filtered out by a name or file argument.
4. Source errors or type-test failures were suppressed by configuration or command flow.

Compare collected type-test files before and after configuration changes. Run the file without a name filter. Temporarily replace the invalid key with a valid one and verify the expected-error directive becomes unused. That controlled perturbation proves the line is capable of detecting acceptance.

| Symptom | Diagnosis | Corrective action |
|---|---|---|
| Negative case passes after API widening | Another error satisfies the directive | Fix identifiers and isolate one invalid operation |
| No type tests reported | Discovery pattern misses files | Restore \`*.test-d.ts\` or correct \`typecheck.include\` |
| Runtime suite passes, CI type job fails | Compile-time contract changed | Inspect expected versus actual inferred type |
| Type test name prints literally | Dynamic naming used in static file | Replace with literal test names |
| Many unrelated failures after upgrade | Compiler inference or lib definitions changed | Triage upgrade separately from feature diff |
| Green type suite with broken source | Source errors ignored | Remove suppression or enforce source checking elsewhere |

Do not “fix” a difficult type error by replacing an exact assertion with \`any\`. That disables the oracle. If the API intentionally widened, update the expected public contract and add a negative or positive case that expresses the new boundary.

## Protect Generic Inference Across Realistic Calls

Generic APIs often behave differently with literals, widened variables, unions, and readonly tuples. Add cases only when those call shapes are supported public usage. A concise matrix is more valuable than dozens of type puzzles.

For \`selectFields\`, test an inline tuple, a separately declared readonly tuple, and an empty tuple. If callers commonly pass a variable typed as \`(keyof User)[]\`, decide whether the result is intentionally broad. Do not demand literal precision after the caller has already widened the input.

\`\`\`typescript
// src/select-fields-inference.test-d.ts
import { expectTypeOf, test } from 'vitest'
import { selectFields } from './select-fields'

type User = { id: number; name: string; active: boolean }
const user: User = { id: 7, name: 'Asha', active: true }

test('preserves a separately declared readonly tuple', () => {
  const keys = ['id', 'active'] as const
  const selected = selectFields(user, keys)

  expectTypeOf(selected).toEqualTypeOf<
    Readonly<Pick<User, 'id' | 'active'>>
  >()
})

test('reflects an intentionally widened key array', () => {
  const keys: (keyof User)[] = ['id', 'active']
  const selected = selectFields(user, keys)

  expectTypeOf(selected).toEqualTypeOf<Readonly<Pick<User, keyof User>>>()
})
\`\`\`

The second result is broader because the variable type permits any User key. That is TypeScript doing exactly what the caller declared. A good type suite teaches maintainers the distinction and prevents an agent from “improving” the generic by adding an unsafe assertion.

## Test Discriminated Unions and Exhaustiveness at the Consumer Edge

For SDKs and domain models, a discriminated union is often the real compatibility surface. Protect both available variants and exhaustive handling. If a new variant is intentionally added, the type test should force consumer-style switches to be reviewed.

\`\`\`typescript
// src/payment-result.test-d.ts
import { assertType, test } from 'vitest'

type PaymentResult =
  | { status: 'approved'; authorizationId: string }
  | { status: 'declined'; reason: string }

function message(result: PaymentResult): string {
  switch (result.status) {
    case 'approved':
      return result.authorizationId
    case 'declined':
      return result.reason
    default: {
      const unreachable: never = result
      return unreachable
    }
  }
}

test('consumer can exhaustively handle payment results', () => {
  assertType<(result: PaymentResult) => string>(message)
})
\`\`\`

If the public union gains a \`pending\` variant and this consumer-style function imports the real type, the \`never\` assignment fails until the new case is handled. That failure signals an intentional review point rather than proving the new variant is wrong.

## Review AI-Generated Type Tests for Oracle Strength

AI coding agents are good at producing fluent type assertions, but fluent syntax can disguise a weak relationship. Review the actual expected type. Watch for \`any\`, overly broad \`unknown\`, generic \`object\`, or extension checks where exact equality is required. Ensure every expected-error directive explains the intended diagnostic in a short comment.

Ask the agent to report:

- the public contract each test protects,
- whether the assertion is exact or assignable and why,
- the command used,
- the type-test files collected,
- one controlled change that makes the new test fail.

That last request is a type-level sensitivity check. For a negative key test, temporarily broaden the key constraint and confirm the unused expected-error directive fails. For readonly output, temporarily remove \`Readonly\` and confirm the reassignment line is no longer rejected. Revert immediately and rerun clean.

Keep type-test diffs close to public API changes. When an agent rewrites many type assertions while changing the implementation, reviewers cannot tell whether failures were adapted away. A strong sequence adds or updates the contract test, observes the meaningful failure, changes the API, and then preserves the final expectation.

## Maintain Type Tests as API Documentation

Type tests are executable examples for library authors and application-platform teams. Give them scenario names that describe consumer capabilities. Organize them by public symbol or contract, not by TypeScript trick. When deprecating behavior, keep old expectations until the supported compatibility window closes.

Review the suite during compiler upgrades. Remove redundant cases only after confirming another assertion catches the same regression. Avoid snapshots of full compiler error text because wording and formatting can change. Prefer structural type assertions and expected diagnostics at narrow lines.

Official Vitest guidance for type testing is at https://vitest.dev/guide/testing-types. Use the documentation that matches the installed version. In particular, verify discovery behavior and configuration during upgrades rather than assuming examples from another major release are interchangeable.

A definition of done for a new type contract is straightforward:

1. At least one positive consumer call proves intended inference.
2. Each important prohibition has a narrow negative case.
3. Runtime behavior has separate executable coverage.
4. Type-test discovery is visible in local and CI output.
5. A controlled signature change makes the relevant type test fail.
6. No assertion relies on \`any\` to pass.
7. The lockfile fixes the compiler and runner used by CI.

With that discipline, typecheck mode becomes more than an extra compiler command. It becomes a regression harness for the API your editors, agents, and human consumers experience before any JavaScript runs.

## Verify Declaration-File Consumption, Not Only Source Imports

Library authors have an additional risk: source-based type tests can pass while the published declaration surface is broken. Build configuration may omit an export, resolve a path differently, or generate a declaration that widens a carefully inferred signature. A type test that imports directly from \`src\` never exercises that packaging boundary.

Keep the fast source-level suite for iteration, then add a release check that builds declarations and compiles a tiny consumer against the package entry point or packed artifact. The exact command depends on the repository’s build system, so use its existing package and declaration scripts. Do not invent a second publishing configuration only for tests.

The consumer should import the public name exactly as users do:

\`\`\`typescript
// test-consumer/index.ts
import { selectFields } from 'typed-query-kit'

type User = {
  id: number
  name: string
}

const user: User = { id: 1, name: 'Mira' }
const selected = selectFields(user, ['id'])

const id: number = selected.id
void id

// @ts-expect-error name was not selected
selected.name
\`\`\`

This file checks export resolution and consumer inference together. Compile it with the repository’s supported consumer-test configuration after producing the declarations. If the package supports multiple module-resolution modes, create one small consumer project for each officially supported mode instead of mutating a single compiler configuration between runs.

Review failures in layers. If the source type test passes but the consumer import fails, inspect package exports and emitted declaration paths. If the import works but inference widens, compare the emitted signature with the source signature. If both work locally but the packed artifact fails, inspect which declaration files are actually included in the package. These are packaging regressions, not reasons to weaken the source assertion.

Application repositories that never publish declarations usually do not need this extra layer. Their public boundary may instead be a shared workspace package, generated API client, or framework route type. Place the consumer test at the real compilation boundary so it proves something the ordinary source suite cannot.

## Keep Compiler Performance Separate From Type Correctness

Complex generics can make the compiler slow even when all type assertions pass. Typecheck mode reports correctness, but a slower job is not automatically a type-contract failure. Track compiler performance separately if editor latency or CI duration matters, using stable projects and documented compiler diagnostics appropriate to the repository.

Avoid simplifying a public type merely because one noisy CI run was slow. First reproduce on the same compiler version, identify the expensive instantiation or project boundary, and measure the proposed improvement. A type API can be semantically correct yet operationally painful, but the two claims need different evidence and different acceptance thresholds.

## Frequently Asked Questions

### Are Vitest type tests executed like normal tests?

No. Files treated as type tests are statically analyzed by TypeScript rather than executed as JavaScript. That means they are suitable for inference and diagnostic contracts, but not for proving returned values, exceptions, mutations, timers, or network behavior. Dynamic test-name generation is also not evaluated in the ordinary way. Pair type tests with runtime tests around the same public API when both compile-time and execution behavior matter. Read the Vitest output to confirm each category is discovered by the intended configuration.

### When should I use expectTypeOf instead of assertType?

Use \`expectTypeOf\` when you want fluent relationships such as exact type equality, extension, or function parameter inspection. Use \`assertType\` for a simpler assignability statement when that expresses the contract clearly. Exact generic expected types often produce more actionable diagnostics than concrete expected objects. Whichever API you choose, avoid broad placeholders that weaken the oracle. The important decision is not stylistic consistency, but whether the assertion would fail for the specific widening, narrowing, or property change you want to prevent.

### How can I trust a test that uses @ts-expect-error?

Keep the following line small enough to have one intended diagnostic, use correct imports and identifiers, and explain the expected rejection in a comment. Then perform a sensitivity check: temporarily make the usage valid and confirm TypeScript reports an unused expected-error directive. Pair the negative case with a positive call to the same real symbol. A directive can otherwise pass because of an unrelated typo, wrong argument count, or missing name. Review negative tests as carefully as runtime assertions because their success is intentionally based on a compiler failure.

### Should typecheck mode replace a separate tsc command in CI?

Vitest documents that typecheck mode uses \`tsc --noEmit\` or \`vue-tsc --noEmit\` according to configuration and can report source errors. Whether it replaces an existing command depends on project references, build-specific configurations, emitted declaration checks, and the exact scope your current script validates. Compare both commands before removing one. Ensure production source remains checked, avoid casually enabling source-error suppression, and keep any declaration-build or multi-project validation that the Vitest command does not demonstrably cover.
`,
};
