import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Module Name Mapper Path Alias Fix: Resolve TypeScript Imports Reliably',
  description: 'Apply this jest module name mapper path alias fix to align TypeScript and Jest resolution, debug regex mappings, and stop module-not-found failures in CI.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Jest Module Name Mapper Path Alias Fix: Resolve TypeScript Imports Reliably

The reliable Jest module name mapper path alias fix is to translate every source alias into an anchored regular-expression mapping whose target starts from Jest's \`<rootDir>\`. TypeScript's \`compilerOptions.paths\` helps the compiler understand imports, but Jest has its own resolver. If production code imports \`@domain/order\`, Jest must know that \`@domain/(.*)\` points to the actual source directory.

For a project with \`@app/* -> src/*\`, the essential mapping is \`'^@app/(.*)$': '<rootDir>/src/$1'\`. That one line is only correct when \`rootDir\` is the repository directory containing \`src\`. In monorepos, preset-based configs, and ESM builds, the root and emitted import shape can differ, so the real fix starts by tracing which tool resolves which path.

This guide provides a reproducible debugging sequence, working TypeScript configurations, multiple-alias patterns, monorepo examples, asset mappings, CI checks, and failure analysis for cases where the mapping looks correct but Jest still reports “Cannot find module.”

## Separate the three module resolvers in your toolchain

An alias can work in the editor and fail in tests because the editor, test runner, and production build do not share one resolver automatically.

| Layer | Reads aliases from | Responsible for | Typical failure signal |
|---|---|---|---|
| TypeScript | \`tsconfig.json\` \`baseUrl\` and \`paths\` | Type checking and editor navigation | Compiler cannot find module |
| Jest | \`moduleNameMapper\`, resolver settings, package exports | Resolving imports during tests | Jest cannot find module |
| Bundler/runtime | Bundler alias, package imports, or runtime rules | Shipping or executing built code | Build failure or runtime import error |

Passing TypeScript does not prove Jest can load the module. Passing Jest does not prove Node can execute emitted JavaScript. A path alias is a contract that must be represented at every layer that sees the unresolved alias.

Use a minimal tree while debugging:

\`\`\`text
project/
  jest.config.ts
  tsconfig.json
  src/
    domain/
      price.ts
    services/
      checkout.ts
  tests/
    checkout.test.ts
\`\`\`

The production import is intentionally simple:

\`\`\`ts
// src/services/checkout.ts
import { calculatePrice } from '@domain/price';

export function createCheckout(quantity: number): number {
  return calculatePrice(quantity, 2_500);
}
\`\`\`

If the editor resolves \`@domain/price\` but Jest cannot, do not rewrite the application import to a long relative path. Confirm the TypeScript alias, then give Jest the equivalent rule.

## Map one TypeScript alias end to end

The TypeScript configuration declares a base and a wildcard substitution. \`paths\` values are interpreted relative to \`baseUrl\` when it is present.

\`\`\`json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@domain/*": ["src/domain/*"]
    },
    "strict": true
  },
  "include": ["src", "tests", "jest.config.ts"]
}
\`\`\`

Now add Jest's regular expression and replacement:

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
  },
};

export default config;
\`\`\`

Read the rule from left to right. The caret anchors the beginning. \`@domain/\` is literal. \`(.*)\` captures the remaining path. The dollar anchor prevents suffix surprises. The target replaces \`$1\` with that capture. Therefore \`@domain/price\` becomes \`<rootDir>/src/domain/price\`, after which Jest applies its normal extension resolution.

The rendered configuration should contain the ordinary JavaScript syntax readers paste into their own file.

Test the behavior, not merely the configuration:

\`\`\`ts
// tests/checkout.test.ts
import { describe, expect, it } from '@jest/globals';
import { createCheckout } from '@app/services/checkout';

describe('createCheckout', () => {
  it('prices every requested item', () => {
    expect(createCheckout(3)).toBe(7_500);
  });
});
\`\`\`

This test introduces a second alias, \`@app/*\`, so both TypeScript and Jest need it. That is intentional: real suites often fix the first failing import only to reveal the next unresolved alias.

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@app/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
\`\`\`

Add the matching \`@app/*\` path entry to \`tsconfig.json\`. A passing Jest resolver with a failing type checker is still a broken developer workflow.

## Anchor patterns and order them from specific to broad

\`moduleNameMapper\` keys are regular-expression strings, not TypeScript path patterns. The distinction changes how wildcards, anchors, dots, and ordering behave.

| Intended import family | Correct Jest key | Common incorrect key | Problem |
|---|---|---|---|
| \`@app/anything\` | \`^@app/(.*)$\` | \`@app/*\` | Regex star repeats only the slash-adjacent token, not a TS wildcard |
| Exact \`config\` package | \`^config$\` | \`config\` | Unanchored text also matches unrelated package names |
| CSS extensions | \`\\\\.(css|less)$\` | \`.(css|less)\` | Unescaped dot matches any character |
| Specific testing helper | \`^@app/testing/(.*)$\` | Broad rule first | Earlier broad match can shadow special target |

Jest checks mappings in order until a pattern matches. Put a special alias before the broader family:

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  moduleNameMapper: {
    '^@app/testing/(.*)$': '<rootDir>/tests/support/$1',
    '^@app/(.*)$': '<rootDir>/src/$1',
    '\\\\.(css|less)$': '<rootDir>/tests/mocks/style-mock.ts',
  },
};

export default config;
\`\`\`

If the broad \`^@app/(.*)$\` appears first, \`@app/testing/factory\` maps into \`src/testing/factory\`, and Jest never considers the testing-specific rule. This often presents as a missing module even though both mappings look reasonable in isolation.

Avoid mapping a bare common word without anchors. A key such as \`relay\` can match \`react-relay\` and other package names containing that substring. Exact aliases should use both \`^\` and \`$\`.

## Derive mappings from tsconfig without hiding the root

Repositories using \`ts-jest\` can use its documented \`pathsToModuleNameMapper\` helper to translate TypeScript path entries. This reduces duplicate wildcard conversion, but the prefix still needs to point from Jest's root to the TypeScript base.

\`\`\`ts
import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import tsconfig from './tsconfig.json';

const config: Config = {
  rootDir: '.',
  moduleNameMapper: pathsToModuleNameMapper(
    tsconfig.compilerOptions.paths,
    { prefix: '<rootDir>/' },
  ),
};

export default config;
\`\`\`

This example assumes the TypeScript path targets already include \`src/\`, such as \`"@domain/*": ["src/domain/*"]\`. If \`baseUrl\` is \`"src"\` and targets are \`"domain/*"\`, the prefix must account for that base. A helper cannot infer an architectural intention that the configuration does not express clearly.

Manual and generated mappings each have tradeoffs:

| Approach | Advantage | Risk | Choose it when |
|---|---|---|---|
| Manual mapper | Explicit, no transformer coupling | Duplicated alias list can drift | Few stable aliases |
| \`pathsToModuleNameMapper\` | Converts TS patterns consistently | Prefix and config loading still matter | Project already uses \`ts-jest\` |
| Shared JavaScript alias object | One programmatic source | Every tool needs an adapter | Many build/test consumers |
| Package-level exports/imports | Runtime-native contract | Migration requires package design | Monorepo packages are publishable units |

Do not add \`ts-jest\` solely for this helper if the suite transforms TypeScript through Babel, SWC, or another supported pipeline. A five-line explicit mapper may be less operationally expensive than another transformation dependency.

Also remember that \`moduleNameMapper\` resolves names; it does not compile TypeScript. Jest still needs a transformation or execution setup suitable for the project's source syntax. A resolver error and a syntax-transform error require different fixes.

## Make rootDir explicit in monorepos

The token \`<rootDir>\` expands to Jest's configured \`rootDir\`. It does not mean “Git repository root” by definition. Most single-package projects happen to make those locations identical. Monorepos often do not.

Assume this layout:

\`\`\`text
repo/
  packages/
    payments/
      jest.config.ts
      src/
    identity/
      jest.config.ts
      src/
  shared/
    test-builders/
\`\`\`

For the payments package, keep its aliases package-relative:

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  rootDir: __dirname,
  displayName: 'payments',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@payments/(.*)$': '<rootDir>/src/$1',
    '^@test-builders/(.*)$': '<rootDir>/../../shared/test-builders/$1',
  },
};

export default config;
\`\`\`

The second alias crosses a package boundary, which should prompt an architecture question. If production packages consume that shared directory directly, turning it into a declared workspace package may provide a clearer dependency graph. For test-only builders, a cross-root mapper can be acceptable as long as CI checks out the complete repository and Jest's project boundaries allow the files.

A root-level multi-project configuration can instead point to package configs. Each child config should be reviewable on its own. Do not assume a mapper from the parent is merged automatically into every project; Jest project configuration deserves an explicit effective-config check.

Use Jest's documented \`--showConfig\` option to inspect the resolved configuration:

\`\`\`bash
npx jest --showConfig
\`\`\`

Search the output for \`rootDir\` and \`moduleNameMapper\`. If the expected rule is absent, you may be editing a config that the current command does not load, or a preset/project layer may be replacing it. This single check prevents hours spent tuning a regular expression that never reaches Jest.

## Keep alias mapping distinct from mocks and assets

\`moduleNameMapper\` is also used to replace non-JavaScript resources and selected modules. That power can obscure whether a rule is a path alias or a test double.

For a React-style project, a configuration might contain both:

\`\`\`ts
import type { Config } from 'jest';

const config: Config = {
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '\\\\.(png|jpg|svg)$': '<rootDir>/tests/mocks/file-mock.ts',
    '\\\\.(css|scss)$': 'identity-obj-proxy',
  },
};

export default config;
\`\`\`

The alias points to production source. The extension rules deliberately substitute test-friendly modules. They should be reviewed differently. A too-broad asset expression can capture source imports unexpectedly, while a too-broad alias can redirect third-party packages.

Create the simplest useful file mock:

\`\`\`ts
// tests/mocks/file-mock.ts
const assetPath = 'test-file-stub';

export default assetPath;
\`\`\`

Whether default export syntax works depends on the project's transform and interop setup. Match the mock's module shape to how application code imports the asset. The mapper only chooses the replacement file; it cannot repair an incompatible export contract.

Mapped modules are unmocked by default even when automocking is enabled. Most modern suites avoid broad automocking, but this documented behavior can explain a surprising real implementation in an older repository.

## Diagnose “Cannot find module” in a fixed order

Treat the resolver error as evidence, not as a request to add random directories to \`moduleDirectories\`. The following order narrows the problem quickly.

1. Copy the exact unresolved import from the error.
2. Confirm the target source file exists with the expected capitalization.
3. Run the TypeScript compiler without emitting and resolve its errors first.
4. Run \`npx jest --showConfig\` and inspect the active root and mapper.
5. Apply the mapper regular expression mentally to the exact import.
6. Resolve the replacement path from \`rootDir\` on disk.
7. Check that Jest recognizes the target extension and can transform its syntax.
8. Clear Jest's cache only after a configuration change if stale behavior remains.

Case sensitivity causes the classic local-pass, CI-fail result. macOS or Windows development file systems may resolve \`@domain/Price\` to \`price.ts\`, while a Linux CI file system rejects the mismatch. Correct the import casing; do not create duplicate mapper rules.

The transformation boundary produces another realistic failure:

\`\`\`text
Cannot find module '@domain/price' from 'src/services/checkout.ts'
\`\`\`

If the mapper converts that name to a real \`.ts\` file but Jest then reports unexpected syntax, alias resolution is fixed and transformation is now failing. Preserve that distinction in bug reports. Changing the mapper repeatedly after the error class changes can introduce a second problem.

Jest documents \`--clearCache\` for removing its cache:

\`\`\`bash
npx jest --clearCache
npx jest tests/checkout.test.ts --runInBand
\`\`\`

Use \`--runInBand\` for a focused diagnostic when serial output is easier to read, not as the permanent alias fix. If clearing the cache is required every run, investigate generated configuration, inconsistent transforms, or environment-dependent paths.

## Handle ESM import shapes without a catch-all rewrite

ESM-oriented TypeScript projects sometimes write relative imports with \`.js\` extensions in source so emitted JavaScript is valid for Node. Jest may execute transformed TypeScript where the source file on disk ends in \`.ts\`. That is a relative-extension concern, not the same issue as an \`@app/*\` alias.

Keep the diagnosis precise:

| Import that fails | Likely boundary | First configuration to inspect |
|---|---|---|
| \`@app/service\` | Alias mapping | \`moduleNameMapper\`, root |
| \`./service.js\` while source is TS | ESM transform/resolution | Transformer ESM guidance and relative import handling |
| Package subpath | Package \`exports\` | Dependency/package metadata |
| CSS or image | Non-code module replacement | Extension mapper |

Do not install a broad rule that strips \`.js\` from every specifier unless it matches the documented setup for your transformer and passes package-import tests. Such a rule can rewrite third-party or already-valid imports. Consult the official ESM guidance for Jest and the chosen transformer, then test the smallest failing relative import.

If a library exposes conditional package exports, \`moduleNameMapper\` should not casually bypass them by reaching into its internal files. That couples tests to a package structure consumers cannot use. Fix the test environment or package configuration so Jest resolves the supported public entry point.

## Prevent alias drift in CI

A mapping failure should be caught before a large test suite starts. Add a small resolver smoke suite covering one import from each alias family, and run the normal type check before or alongside Jest.

\`\`\`ts
import { describe, expect, it } from '@jest/globals';
import { calculatePrice } from '@domain/price';
import { createCheckout } from '@app/services/checkout';

describe('configured path aliases', () => {
  it('loads domain exports', () => {
    expect(typeof calculatePrice).toBe('function');
  });

  it('loads application service exports', () => {
    expect(typeof createCheckout).toBe('function');
  });
});
\`\`\`

This suite is intentionally shallow. Behavioral tests belong with each module. The smoke suite gives a direct error when alias configuration drifts, instead of surfacing as hundreds of unrelated module-load failures.

A conventional CI script can enforce both contracts:

\`\`\`yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: npm
    - run: npm ci
    - run: npm run typecheck
    - run: npm test -- --runInBand
\`\`\`

Use the runtime and command conventions already supported by the repository. Serial Jest is shown for simple CI resource use, not because aliases require it. The fix should behave identically with worker parallelism.

When deciding whether Jest remains the right runner, compare transformation, mocking, and ecosystem requirements in the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). Do not apply module-name mapping to browser element selectors; end-to-end test stability is a different layer, covered by [Playwright locator practices](/blog/playwright-best-practices-locators-2026).

## What people get wrong about a passing alias test

The first mistake is believing one resolved import proves every alias. Wildcard rules can differ, exact aliases can be shadowed, and package configs can load different roots. Test one representative import per family.

The second is using \`moduleDirectories: ['node_modules', 'src']\` as a substitute for named aliases. That may enable absolute-looking source imports, but it broadens resolution and can collide with packages. Explicit prefixes such as \`@domain/\` make ownership visible and reduce ambiguity.

The third is forcing Jest to mirror a broken production contract. If emitted JavaScript retains an alias that plain Node cannot resolve, making Jest green only hides the release failure. Run a build or runtime smoke check in addition to tests.

Finally, teams often duplicate twenty aliases manually and never compare them again. If aliases change weekly, generate Jest mappings from the authoritative TypeScript configuration or extract a shared definition with adapters. If there are only two stable aliases, manual configuration may be clearer. Choose the least magical approach that makes drift observable.

## Prove the replacement path before changing dependencies

When an import still fails, reduce the mapper to a concrete substitution on paper. For \`^@domain/(.*)$\` and the import \`@domain/tax/rate\`, capture one is \`tax/rate\`. The replacement becomes \`<rootDir>/src/domain/tax/rate\`. Substitute the effective root from \`--showConfig\`, then check whether \`rate.ts\`, \`rate.tsx\`, a supported JavaScript extension, or a directory entry point actually exists.

This exercise separates four error classes:

| Concrete result | Meaning | Correct next action |
|---|---|---|
| Pattern does not match | Regex or import family is wrong | Fix anchors, prefix, or rule order |
| Replacement points to wrong directory | Root or target is wrong | Correct \`rootDir\` relationship |
| File exists but syntax fails | Resolution succeeded | Fix transformer or module mode |
| File is missing only by case | Cross-platform path defect | Correct import and filename casing |

Do this before installing resolver packages. Most alias defects are path arithmetic, not missing capabilities. An additional resolver may make the local test pass while increasing divergence from the production runtime.

A focused Node check can document expected file existence without trying to reproduce Jest's complete resolver:

\`\`\`ts
import { existsSync } from 'node:fs';
import path from 'node:path';

const expected = path.resolve(process.cwd(), 'src/domain/tax/rate.ts');

if (!existsSync(expected)) {
  throw new Error(\`Expected alias target is missing: \${expected}\`);
}
\`\`\`

This is a temporary diagnostic, not a replacement for the smoke test. Jest can resolve supported extensions and package entry points beyond a literal \`.ts\` path. Its value is forcing the team to state the expected target precisely.

## Refactor aliases without breaking every test at once

Alias migrations are easiest when type checking, Jest, and production build changes land together. Suppose \`@app/*\` is being replaced by narrower \`@domain/*\` and \`@ui/*\` prefixes. Add the new contracts first, migrate imports in reviewable batches, then remove the old mapping after repository search shows no consumers.

During the transition, avoid mapping old and new names to subtly different trees. Both should resolve to the same source of truth until the old name disappears. Add smoke imports for the new families and keep a CI search or lint rule for forbidden old imports if the repository already has an appropriate enforcement mechanism.

| Migration phase | TypeScript | Jest | Production build |
|---|---|---|---|
| Introduce | Add new path keys | Add matching anchored rules | Add equivalent resolver aliases |
| Move consumers | Both old and new resolve | Smoke-test new families | Build changed entry points |
| Enforce | Reject new old-prefix imports | Keep compatibility briefly | Monitor release output |
| Remove | Delete old key | Delete old mapper | Delete old runtime alias |

Do not leave compatibility mappings indefinitely. Dead aliases create ambiguity about module ownership and invite new uses through autocomplete. The final removal pull request should run type checking, unit tests, build, and a runtime smoke test so each resolver proves the old contract is gone.

If an AI coding agent performs the migration, give it the authoritative alias table and require it to report unresolved imports rather than inventing relative-path exceptions. Review generated regex keys closely. A mechanical conversion can miss ordering constraints, exact aliases, or package-boundary rules even when most files compile.

## Record alias ownership so configuration stays coherent

Aliases are architectural names. A prefix such as domain, platform, or test-support tells readers which layer owns a module and which dependencies should be allowed. When prefixes become arbitrary shortcuts for deeply nested folders, mapper configuration grows while design clarity shrinks.

Maintain a compact ownership table near the engineering architecture documentation. For each alias, record its TypeScript target, Jest replacement, production resolver, owning team, and whether application code may import it. Test-only aliases should be clearly prohibited from production source. Package-boundary aliases should point to public entry points instead of private implementation directories.

| Review signal | Healthy state | Drift warning |
|---|---|---|
| Prefix meaning | Describes a stable layer or package | Mirrors a temporary folder name |
| Resolver parity | Type check, Jest, and build agree | One tool has an extra exception |
| Ownership | A team reviews target changes | Alias points to an orphaned shared folder |
| Boundary | Public modules are explicit | Tests reach private package internals |

When moving a directory, update the authoritative contract first and let failing checks reveal consumers. Avoid adding a second mapper target as an array merely to search old and new locations unless that fallback is an intentional, temporary migration. Search-order fallbacks can load different implementations depending on which files exist in a checkout.

Code review should reject an alias fix that only changes Jest when the alias is also used by shipped code. Ask for evidence from type checking and the production build. Conversely, a Jest-only alias for test fixtures should not leak into the application TypeScript configuration if production source must never import those fixtures.

This ownership view also improves AI-assisted changes. An agent can migrate imports safely when it knows allowed dependency directions and the one authoritative target. Without those constraints, it may make tests green by mapping around a boundary the architecture intended to enforce.

## Frequently Asked Questions

### Why does my TypeScript path alias work in VS Code but not Jest?

The TypeScript language service reads \`baseUrl\` and \`paths\`, so editor navigation and type checking can succeed without changing Jest. Jest resolves modules independently during test execution. Add an anchored \`moduleNameMapper\` rule or use the documented helper provided by an existing transformer integration. Then inspect \`npx jest --showConfig\` to verify the rule and \`rootDir\` are active. Also ensure Jest can transform the resolved TypeScript file; resolving a path and compiling its syntax are separate stages.

### What should rootDir be for a Jest path alias?

Set \`rootDir\` to a stable directory from which mapper targets are easy to express, commonly the package directory containing \`src\` and the Jest config. In a monorepo, that may be a package root rather than the Git repository root. Verify the effective value with \`--showConfig\`, then resolve \`<rootDir>/src/example\` on disk exactly as CI would. Avoid assuming the token has a universal location. Explicit package-level roots make configs portable across shells and reduce dependence on the current working directory.

### Does moduleNameMapper need the same wildcard syntax as tsconfig paths?

No. TypeScript path keys use path-pattern wildcards, while Jest mapper keys are regular-expression strings. Convert \`@app/*\` into an anchored expression such as \`^@app/(.*)$\`, then use \`$1\` in the replacement. Escape regex punctuation and order specific patterns before broader ones. A literal TypeScript-style star pasted into Jest does not capture the remaining path the same way. Test the rule with an exact import and inspect the active configuration rather than judging the pattern by appearance.

### Can moduleNameMapper fix runtime aliases in built Node code?

No. \`moduleNameMapper\` affects Jest's resolver, not the JavaScript your application executes after build. Your compiler, bundler, package metadata, loader, or runtime must also understand the import, or the build must rewrite it into a resolvable path. Add a build and runtime smoke check so a Jest-only mapping cannot mask a deployment failure. For publishable monorepo packages, declared package entry points are often clearer than cross-package source aliases. Treat test, type-check, build, and runtime resolution as related but independent contracts.
`,
};
