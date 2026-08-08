import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Alias Monorepo Workspace Resolution Without Import Surprises',
  description: 'Master vitest alias monorepo workspace resolution with shared configs, project roots, package exports, and CI checks that prevent broken test imports.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Vitest Alias Monorepo Workspace Resolution Without Import Surprises

Reliable Vitest alias monorepo workspace resolution starts by deciding what each import means. A package import such as \`@acme/billing\` should resolve through the package manager and the package's published exports. A private source alias such as \`@billing/*\` should resolve through Vite's \`resolve.alias\` or Vitest's \`test.alias\`. TypeScript's \`paths\` help the type checker, but Vitest does not automatically treat them as runtime resolution rules.

In current Vitest configuration, use \`test.projects\` for a monorepo test matrix. The older workspace name is deprecated. Each project needs a deliberate root and must either define its own resolution settings or inherit and merge a shared configuration. The most common failure is a root config that appears to define an alias globally while package projects run with isolated project configurations that never inherited it.

This guide builds a runnable pattern, shows how to test the resolver itself, and explains failures that only appear in CI. It treats aliases as executable architecture rather than a convenience mapping.

## Model the three resolvers before editing configuration

A TypeScript monorepo commonly has at least three consumers of an import specifier: TypeScript, Vite/Vitest, and Node or the package manager. An editor can report no error while Vitest fails because the editor followed \`compilerOptions.paths\` and the runtime did not. Vitest can pass while a built package fails because an alias pointed directly at source that consumers cannot see.

| Resolver | Primary input | Used during tests? | What a green result proves |
|---|---|---|---|
| TypeScript | \`baseUrl\`, \`paths\`, package metadata | Type checking and editor navigation | The compiler can associate the specifier with types |
| Vite/Vitest | Plugins, \`resolve.alias\`, \`test.alias\`, project root | Yes | The test transform can load the module |
| Node/package manager | \`exports\`, workspace links, file extensions | Often, especially for externalized packages | The package is consumable outside the test transform |

The official alias reference at https://vitest.dev/config/alias notes two boundaries worth preserving. Aliases affect imports processed through Vite's SSR machinery, and they do not alias CommonJS \`require\` calls. Aliasing an external dependency is also different from aliasing inlined source. Do not make a test-only rewrite compensate for invalid package metadata.

Use this illustrative layout:

\`\`\`text
repo/
  package.json
  tsconfig.base.json
  vitest.config.ts
  packages/
    billing/
      package.json
      src/index.ts
      src/money.ts
      tests/money.test.ts
      vitest.config.ts
    checkout/
      package.json
      src/quote.ts
      tests/quote.test.ts
      vitest.config.ts
  test/
    resolution.test.ts
\`\`\`

There are two intentionally different import styles. Cross-package code imports \`@acme/billing\`, a real workspace package. Tests inside billing may use \`@billing/money\`, a private alias for concise source imports. Keeping those roles distinct prevents an alias from masking a package that cannot actually be published or consumed.

## Make workspace packages real packages first

Define package identity and exports before adding test aliases. The following package exposes one public entry point:

\`\`\`json
{
  "name": "@acme/billing",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
\`\`\`

This source-oriented export is suitable for a private monorepo where the build and test tools process TypeScript. A publishable library would usually export built files and declarations instead. That packaging decision is separate from Vitest. The important point is that checkout should not need a root alias from \`@acme/billing\` to \`packages/billing/src\` merely to make tests pass.

The package source can stay ordinary:

\`\`\`ts
// packages/billing/src/money.ts
export function formatCents(cents: number, currency = 'USD'): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError('cents must be an integer');
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

// packages/billing/src/index.ts
export { formatCents } from './money.js';
\`\`\`

Whether \`.js\` source specifiers are appropriate depends on the repository's TypeScript module settings and build design. Use one convention consistently. Vitest's successful transform should agree with the production build rather than establish a second import dialect.

| Import | Intended ownership | Resolution mechanism | Should work after publishing? |
|---|---|---|---|
| \`@acme/billing\` | Public package API | Workspace link plus package \`exports\` | Yes |
| \`@billing/money\` | Billing-private source shorthand | Project alias | No |
| \`./money.js\` | Relative module edge | Module resolver | Yes, after a compatible build |
| \`packages/billing/src/money.ts\` | Repository filesystem detail | Accidental root-relative lookup | No |

This division also improves tests selected from a Git diff. If package relationships are declared through manifests and normal imports, dependency-aware tooling has something stable to analyze. The workflow in [CI test selection by Git diff](/blog/ci-test-selection-by-git-diff) can then select relevant projects without parsing a collection of ad hoc aliases.

## Put shared alias definitions in one executable module

Vite recommends absolute filesystem paths for alias replacements. Build them from the configuration module's URL so the result does not depend on the shell's current working directory.

\`\`\`ts
// test/vite-aliases.ts
import { fileURLToPath, URL } from 'node:url';
import type { AliasOptions } from 'vite';

export const repositoryAliases: AliasOptions = [
  {
    find: /^@billing\\/(.+)$/,
    replacement: fileURLToPath(
      new URL('../packages/billing/src/$1', import.meta.url),
    ),
  },
  {
    find: /^@checkout\\/(.+)$/,
    replacement: fileURLToPath(
      new URL('../packages/checkout/src/$1', import.meta.url),
    ),
  },
];
\`\`\`

The regexes are anchored. Without \`^\`, an alias can rewrite an unexpected substring. Without \`$\`, an exact-name alias may capture prefixes it does not own. The replacement uses Vite's capture substitution and an absolute base derived from the file location.

For simpler mappings, an object is valid too:

\`\`\`ts
// packages/billing/vitest.config.ts
import { fileURLToPath, URL } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    alias: {
      '@billing': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    name: 'billing',
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
\`\`\`

With that prefix mapping, \`@billing/money\` resolves under the source directory. Use the array form when exact versus prefix behavior, regex anchoring, or ordering needs to be obvious.

## Configure test.projects with inheritance as an explicit choice

Vitest's project guide at https://vitest.dev/guide/projects explains that root-level project options are not automatically inherited. The root still owns global options such as reporters and coverage, but a project entry must opt into inheritance with \`extends: true\` or merge a shared configuration itself.

Here is a root configuration with inline projects:

\`\`\`ts
// vitest.config.ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { repositoryAliases } from './test/vite-aliases.js';

const billingRoot = fileURLToPath(
  new URL('./packages/billing', import.meta.url),
);
const checkoutRoot = fileURLToPath(
  new URL('./packages/checkout', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: repositoryAliases,
  },
  test: {
    reporters: ['default'],
    projects: [
      {
        extends: true,
        test: {
          name: 'billing',
          root: billingRoot,
          include: ['tests/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'checkout',
          root: checkoutRoot,
          include: ['tests/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
\`\`\`

\`extends: true\` is doing meaningful work: it brings the root's Vite resolution settings into each inline project. Without it, the root alias can look correct during config review while imports fail inside the project.

An alternative is one config file per package with a shared merge:

\`\`\`ts
// test/vitest.shared.ts
import { defineConfig } from 'vitest/config';
import { repositoryAliases } from './vite-aliases.js';

export default defineConfig({
  resolve: {
    alias: repositoryAliases,
  },
  test: {
    environment: 'node',
    clearMocks: true,
  },
});

// packages/checkout/vitest.config.ts
import { fileURLToPath, URL } from 'node:url';
import { defineProject, mergeConfig } from 'vitest/config';
import shared from '../../test/vitest.shared.js';

export default mergeConfig(
  shared,
  defineProject({
    test: {
      name: 'checkout',
      root: fileURLToPath(new URL('.', import.meta.url)),
      include: ['tests/**/*.test.ts'],
    },
  }),
);
\`\`\`

This pattern is verbose but locally inspectable. A package test run can point directly at its config, and the merge shows where shared aliases originate. Choose one pattern and enforce it. Mixing inherited inline projects, standalone project configs, and implicit Vite config discovery makes resolution difficult to predict.

| Project strategy | Alias source | Strength | Risk |
|---|---|---|---|
| Inline project with \`extends: true\` | Root config | Compact centralized matrix | A missing \`extends\` silently changes behavior |
| Per-package config plus \`mergeConfig\` | Shared module | Explicit package ownership | Merge order needs review |
| Alias repeated in each package | Each project | Maximum local control | Drift and inconsistent regexes |
| Only TypeScript \`paths\` | Type checker | Editor convenience | Runtime imports can fail |

## Keep TypeScript paths synchronized, but know their limit

TypeScript path mappings remain useful for editor navigation and type checking. They should mirror private aliases, while package imports should normally be understood through package metadata.

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@billing/*": ["packages/billing/src/*"],
      "@checkout/*": ["packages/checkout/src/*"]
    }
  }
}
\`\`\`

This file does not rewrite emitted imports. It tells TypeScript how to resolve them while checking. If the Vitest config disappears, the path entry alone does not promise the test runtime can load \`@billing/money\`.

Some teams use a Vite plugin to read tsconfig paths. That can reduce duplication, but it also adds plugin scope, config-discovery, and project-root questions. If you adopt one, use its official package documentation and add a resolution contract test. Do not assume every tsconfig in a monorepo is discovered in the intended order.

An agent changing an alias should update three places only when each place is genuinely responsible: Vite/Vitest runtime configuration, TypeScript checking configuration, and package exports for public API. Blindly copying every alias into all three systems can turn a private shortcut into an accidental public contract.

## Test resolution as a contract, not as incidental coverage

A business test importing an alias proves resolution only indirectly. Add a small contract suite that imports through each supported boundary and asserts module identity or behavior.

\`\`\`ts
// packages/checkout/tests/resolution.test.ts
import { describe, expect, test } from 'vitest';
import { formatCents as fromPackage } from '@acme/billing';
import { quoteTotal } from '@checkout/quote';

describe('checkout module resolution', () => {
  test('loads the billing public package entry', () => {
    expect(fromPackage(2599)).toBe('$25.99');
  });

  test('loads checkout private source through its project alias', () => {
    expect(quoteTotal([{ quantity: 2, unitCents: 300 }])).toBe(600);
  });
});
\`\`\`

The implementation referenced above is complete:

\`\`\`ts
// packages/checkout/src/quote.ts
export interface QuoteLine {
  quantity: number;
  unitCents: number;
}

export function quoteTotal(lines: QuoteLine[]): number {
  return lines.reduce((total, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new RangeError('quantity must be a non-negative integer');
    }
    if (!Number.isInteger(line.unitCents) || line.unitCents < 0) {
      throw new RangeError('unitCents must be a non-negative integer');
    }
    return total + line.quantity * line.unitCents;
  }, 0);
}
\`\`\`

Run the intended project explicitly:

\`\`\`bash
npx vitest run --project checkout
npx vitest list --project checkout --filesOnly
\`\`\`

\`vitest run\` provides a single non-watch execution. \`--project\` selects the named project, and \`vitest list --filesOnly\` confirms collection without making you infer it from a business assertion. When filtering test names, Vitest documents \`-t\` and \`--testNamePattern\`, not Mocha's \`--grep\`.

## Diagnose the classic CI-only alias failure

Imagine checkout tests pass on a developer's macOS laptop but fail in Linux CI with \"Failed to load url @Billing/money.\" The configured alias is \`@billing\` in lowercase. A developer's case-insensitive filesystem may conceal the mismatch in a related path or import, while Linux exposes it. Increasing dependency installation retries or clearing Vitest's cache will not correct the contract.

Use a layered diagnosis:

1. Copy the exact unresolved specifier from the first error, including case.
2. Identify which Vitest project collected the failing file.
3. Inspect that project's resolved root and whether it inherited or merged the alias.
4. Compare the import with the alias's exact or prefix matching rule.
5. Confirm the target path exists with identical case.
6. Run the project by name in a clean checkout.
7. Type-check and build the consuming package to detect a test-only success.

A tiny filesystem guard catches case drift before the suite:

\`\`\`ts
// test/alias-targets.test.ts
import { access } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { describe, test } from 'vitest';

const targets = [
  new URL('../packages/billing/src', import.meta.url),
  new URL('../packages/checkout/src', import.meta.url),
];

describe('alias targets', () => {
  for (const target of targets) {
    test(fileURLToPath(target) + ' exists', async () => {
      await access(target);
    });
  }
});
\`\`\`

The more subtle failure is an inheritance gap. Root Vitest config defines \`resolve.alias\`, root-level tests pass, and package tests fail only when \`test.projects\` is enabled. The project entries lack \`extends: true\`. The root configuration is not a project simply because it contains the projects list. Add explicit inheritance or merge the shared config.

## What people get wrong: aliases are not dependency declarations

An alias that maps \`@acme/billing\` directly to \`packages/billing/src/index.ts\` may make tests green while bypassing the workspace package's \`exports\`. That hides missing dependencies, invalid build output, and accidental internal imports. A consuming package can then pass Vitest yet fail when installed or executed normally.

Use aliases for private shorthand, controlled substitutions, and test-specific module replacement. Use workspace dependencies and package exports for package boundaries. If checkout depends on billing, declare the dependency in checkout's package manifest according to the package manager's workspace protocol and import the public name.

Another mistake is assuming project \`root\` changes every relative path in the same way. Configuration fields document their own path bases. Resolve important filesystem locations from \`import.meta.url\`, and confirm behavior with \`vitest list\` plus a contract test rather than relying on intuition.

Finally, avoid wildcard aliases that swallow public package names. An alias such as \`@acme/*\` aimed at a source tree can take precedence over actual package exports. Prefer a private namespace or explicit entries. Narrow rules are easier to review, cache, and migrate.

## Make the monorepo matrix resilient in CI

Resolution checks should run in the same install mode used for releases. A permissive developer workspace can retain stale links or undeclared packages. CI should install from the lockfile, run type checking, list or execute each Vitest project, and build publishable packages.

| CI check | Defect it catches | Failure interpretation |
|---|---|---|
| Frozen lockfile install | Undeclared or stale workspace dependency | Manifest and lockfile disagree |
| Type check | Missing type mapping or incompatible public type | Compiler resolver cannot honor contract |
| Named Vitest project | Missing inherited alias or wrong project root | Runtime test resolver cannot load target |
| Package build | Source-only shortcut or invalid emitted specifier | Production artifact is not coherent |
| Consumer smoke test | Broken \`exports\` or undeclared runtime dependency | Installed package boundary fails |

When newer commits supersede expensive test runs, cancellation can reduce wasted CI while keeping the latest resolution signal. The techniques in [canceling stale end-to-end runs](/blog/ci-cancel-stale-e2e-runs-on-new-commit) apply to the orchestration layer. Do not let cancellation hide a required check on the newest commit.

Cache keys should include the lockfile and relevant config inputs. If aliases are defined in \`test/vite-aliases.ts\`, a cache strategy that hashes only package manifests can reuse stale transformed modules after an alias change. Treat resolver configuration as build input.

## An agent-friendly change protocol

Give AI coding agents a short sequence for any import-resolution change:

1. Classify the import as public package, private alias, or relative module.
2. Modify the owning resolver only.
3. Keep alias replacements absolute and matching rules narrow.
4. Preserve project inheritance or shared-config merge.
5. Update TypeScript paths when the alias must type-check.
6. Add or update a direct resolution contract test.
7. Run \`vitest list --project <name> --filesOnly\` and the named project.
8. Build the affected package when a public import is involved.
9. Report whether the change works in a clean, case-sensitive environment.

This protocol prevents the common agent behavior of adding successive mappings until one test command passes. A resolution fix is complete only when the test runtime, compiler, and package boundary agree on the import's role.

## Review cache and watch behavior after an alias change

Resolver changes have a wider invalidation surface than an ordinary source edit. The configuration file, any shared alias module, package manifests, and TypeScript project references can all affect the module graph. After changing one of them, restart the Vitest process instead of trusting a watch session that began under the old graph. In CI, include those inputs in cache keys for transformed test artifacts.

Run the smallest named project once from a clean process, then run a consuming project that imports the changed package boundary. This two-step check distinguishes a package's private alias from its public consumption path. If only the owner project passes, inspect package exports and workspace dependency declarations before adding another alias.

Also review mocks. A test that mocks a public package name while production source resolves through a private alias may exercise a different module identity. Import the same canonical specifier everywhere a single module instance is required. Duplicate identities can create separate singleton state, separate mock registrations, or different dependency copies even when both paths reach similar source files.

## Frequently Asked Questions

### Does Vitest automatically use TypeScript paths for aliases?

Not by itself. TypeScript \`paths\` primarily guide the compiler and editor. Vitest resolves transformed imports through Vite, so configure \`resolve.alias\` or \`test.alias\`, use a documented plugin that reads tsconfig paths, or rely on valid package resolution. A test can type-check and still fail at runtime when only \`paths\` exists. Whichever mechanism you choose, add a direct import test and run it inside the intended named project, because monorepo config discovery and roots can change which tsconfig or alias rules are active.

### Should a monorepo use test.projects or a vitest.workspace file?

Use \`test.projects\` for current Vitest configuration. The workspace terminology and separate workspace configuration were deprecated in favor of projects. Projects may be inline objects, configuration files, folders, or supported glob patterns. Remember that project configurations do not automatically inherit every root option. For inline projects that need root Vite settings, opt in with \`extends: true\`. For package-owned config files, merge a shared configuration explicitly. This makes alias ownership visible and avoids a migration depending on deprecated discovery behavior.

### Why does an alias work in the root project but fail in a package project?

The package project may not inherit the root's \`resolve.alias\`, its \`root\` may change how a relative replacement is interpreted, or its own config may override the root Vite configuration. First run \`vitest list --project <name> --filesOnly\` to confirm collection. Then inspect whether the project uses \`extends: true\` or \`mergeConfig\` and whether replacement paths are absolute. Also check alias order, case, and exact versus prefix matching. A root config that lists projects is not automatically the effective project configuration for every package.

### When should I use a package export instead of a Vitest alias?

Use package exports for imports that represent a real boundary other packages or external consumers should use. They exercise the package's declared API and make builds, editors, Node, and tests converge. Use a Vitest or Vite alias for private source shorthand, controlled test substitutions, or paths owned by the application build. Do not alias a public workspace package directly to its source just to get tests passing. That can bypass exports and hide missing dependencies. Verify public imports with a package build or consumer smoke test as well as Vitest.
`,
};
