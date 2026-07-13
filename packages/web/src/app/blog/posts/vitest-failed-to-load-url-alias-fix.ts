import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest “Failed to Load URL” Path Alias Fix',
  description:
    'Fix Vitest Failed to Load URL path alias errors by aligning Vite resolution with TypeScript, handling monorepo roots, and testing the resolved config.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Vitest “Failed to Load URL” Path Alias Fix

The editor happily jumps from \`@/domain/cart\` to \`src/domain/cart.ts\`, yet Vitest stops during collection with “Failed to load url @/domain/cart”. No test has run. TypeScript knew how to type-check the import, but the runtime transformer did not know how to resolve it.

That split is the entire diagnosis. A \`compilerOptions.paths\` entry teaches TypeScript and language tooling about a mapping. Vitest loads modules through Vite, whose resolver needs the equivalent mapping or a plugin that reads tsconfig paths. Fixing the error means identifying which resolver owns the failing import, expressing an absolute mapping at the right configuration root, and proving that the same rule applies in tests, source code, setup files, and workspace packages.

## Read the error as a module-resolution trace

“Failed to load url” often includes the unresolved specifier and the importing file. Start there. If the specifier is \`@/services/user\`, investigate aliases. If it is \`./services/user\`, check spelling, case, extension rules, and whether the file exists. If it names a package, inspect that package's \`exports\`, build output, and ESM or CommonJS compatibility.

Do not add an alias until the import category supports that conclusion. Similar messages can come from very different layers.

| Failing specifier shape | Likely owner | First evidence to inspect | Typical correction |
|---|---|---|---|
| \`@/feature/a\` | Vite alias configuration | \`resolve.alias\` and tsconfig paths | Add an absolute alias or tsconfig-paths plugin |
| \`src/feature/a\` | TypeScript \`baseUrl\` assumption | Compiler options and Vitest plugins | Install and configure path mapping support |
| \`./Feature\` | Filesystem resolution | Actual case on disk | Match filename case exactly |
| \`@workspace/model\` | Package manager and package exports | package.json \`exports\`, workspace link, build state | Export the subpath or consume source intentionally |
| \`library/internal\` | Dependency subpath contract | Dependency's published \`exports\` | Import a public exported path |

Case mistakes frequently pass on a case-insensitive developer filesystem and fail on Linux CI. An alias plugin cannot correct \`UserStore.ts\` imported as \`userStore\`. Confirm the exact path before changing configuration.

## Why tsconfig paths do not configure Vitest automatically

TypeScript path mappings were designed to describe resolution to the compiler. They do not rewrite emitted import strings. Another tool must make those specifiers work at runtime. In a Vite application that tool is usually Vite's resolver. Vitest reuses that pipeline, but it does not infer every \`baseUrl\` or \`paths\` rule solely because the TypeScript compiler accepts the program.

This explains a common asymmetry: \`tsc --noEmit\` passes, the application may pass if its Vite config has an alias, and Vitest still fails if it loads a separate config without that alias. The three successful-looking surfaces are not proof of one shared resolver.

The reverse also happens. Vitest passes because \`vitest.config.ts\` defines \`@\`, while the editor reports an error because tsconfig lacks the corresponding mapping. Duplicated configuration can work, but it must be kept aligned.

## Fix a single alias with an absolute filesystem path

Vite expects filesystem replacements to be absolute. Relative alias replacements can be interpreted relative to an importing file and produce confusing results. In an ESM TypeScript config, derive the directory from \`import.meta.url\` and map the alias to the source directory.

\`\`\`ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@fixtures': fileURLToPath(new URL('./test/fixtures', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
  },
});
\`\`\`

This uses supported Vite configuration under \`resolve.alias\` and Vitest configuration under \`test\`. It avoids \`__dirname\`, which is not available in native ESM without recreating it. In a CommonJS config, \`resolve(__dirname, 'src')\` is equally valid.

Match the alias semantics deliberately. An alias key of \`@\` is convenient but broad. A regular expression such as \`/^@\//\` can be used when you want to match only the \`@/\` prefix, avoiding accidental replacement inside another package name. For a small application, the object form is often sufficient and readable.

The corresponding tsconfig should describe the same public import vocabulary:

\`\`\`json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@fixtures/*": ["test/fixtures/*"]
    }
  },
  "include": ["src", "test", "vitest.config.ts"]
}
\`\`\`

Vite uses \`@\`; TypeScript uses \`@/*\` because TypeScript's wildcard syntax describes the remaining path segment. These syntaxes are related but not interchangeable.

## Let vite-tsconfig-paths synchronize a larger mapping set

When an application has many path entries, copying them into Vite is a drift risk. The \`vite-tsconfig-paths\` plugin reads TypeScript path configuration and exposes it to Vite resolution. Install it as a development dependency, add \`tsconfigPaths()\` to \`plugins\`, and retain one source of truth.

This is especially useful for mappings already shared by application builds and tests. It is not a universal repair button. The plugin must discover the intended tsconfig, the importing file must be covered by project discovery, and a workspace may have several configs with different roots.

| Strategy | Strongest use case | Maintenance profile | Diagnostic downside |
|---|---|---|---|
| Explicit \`resolve.alias\` | One to three stable prefixes | Two configs may need matching edits | Mapping is visible in the Vitest config |
| \`vite-tsconfig-paths\` | Many existing TypeScript paths | TypeScript config remains authoritative | Project discovery can be less obvious |
| Relative imports | Small local module clusters | No alias configuration | Deep traversals become hard to refactor |
| Workspace package exports | Cross-package public APIs | Clear package boundary and versioning | Requires valid exports and often a build strategy |

Use package exports for package boundaries. An alias from \`@billing/*\` directly into another package's private \`src\` tree bypasses its declared API and can make publishing behavior diverge from tests. Aliases are best for paths inside an application or for explicitly designed source-based monorepos.

For a conventional plugin configuration:

\`\`\`ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
\`\`\`

If it still fails, determine which tsconfig the plugin found rather than stacking a second alias over it. Monorepo roots, references, and include patterns are more likely causes than a broken Vitest cache.

## Monorepos: resolve from the package that runs Vitest

The word “root” becomes ambiguous in a workspace. There is a repository root, a package root, a Vite root, and the directory containing each tsconfig. A mapping \`@/* -> src/*\` in \`packages/storefront/tsconfig.json\` should resolve to \`packages/storefront/src\`, not the repository's \`src\` directory.

Run the failing command from the same directory as CI and note the config Vitest reports. Package scripts usually make ownership clearer than a root command with implicit config discovery. If the monorepo uses a Vitest workspace, give each project the configuration appropriate to its package rather than forcing one global alias to mean different directories.

Also decide whether tests consume sibling packages as compiled artifacts or source. Compiled consumption exercises package exports and build order. Source consumption is faster during development but needs explicit aliases, transpilation coverage, and agreement about private boundaries. Mixing both modes creates errors that appear dependent on whether \`dist\` happens to exist.

The [Vitest workspace monorepo testing guide](/blog/vitest-workspace-monorepo-testing-guide) discusses project isolation and root selection. For alias failures, print a mental equation: importing file + active Vite root + alias replacement = expected absolute file. Any unresolved term deserves inspection.

## Configuration-merging mistakes that erase aliases

A project may already have a \`vite.config.ts\` used by the app. Creating a standalone \`vitest.config.ts\` can unintentionally discard it. Vitest can read Vite configuration, so prefer adding a \`test\` block to the shared config when application and tests need the same plugins and aliases. If separation is required, use Vite's supported configuration merging rather than JavaScript object spreads that shallowly overwrite nested sections.

Object spread is particularly dangerous with \`resolve\`:

- The base config contains \`resolve.alias\`.
- A test config spreads the base object.
- A later \`resolve: { conditions: [...] }\` replaces the entire resolve object.
- Application imports work, but test aliases disappear.

The same can happen inside mode-dependent callbacks. Compare the resolved branch for \`mode: 'test'\`, not only the default development branch. Keep alias construction outside conditional sections unless the difference is intentional.

The [Vitest configuration and setup guide](/blog/vitest-config-setup-guide-2026) is the natural companion when setup files, environments, and plugin ordering interact with module loading.

## Setup files and mocks can be the first failing importer

Vitest loads setup files before test modules. If \`test/setup.ts\` imports \`@/server\`, an alias failure points there even though every test import is relative. Likewise, a mock factory can dynamically import an aliased module during collection. Read the importer in the stack rather than assuming the named test file caused the issue.

\`vi.mock()\` does not exempt a module from resolution. The specifier still needs to identify a module. If a mock uses one spelling and production code another, Vitest may treat them as distinct identities. Standardize import specifiers so mocks intercept the same resolved URL used by the system under test.

Dynamic imports built from runtime strings are a separate concern. Static alias mappings can replace a known prefix, but Vite needs enough information to transform a dynamic import. Avoid constructing arbitrary module paths in application code. Use an explicit lookup map when the set of implementations is finite; it is easier to bundle and to test.

## A disciplined five-minute diagnosis

First, copy the exact unresolved specifier and importer from the failure. Confirm the target file and filename case. Then inspect the active config, not merely the nearest config in the editor. Search for \`resolve.alias\`, \`paths\`, \`baseUrl\`, and \`vite-tsconfig-paths\` across the workspace.

Next, reduce one import to a minimal test. If a relative import succeeds and the aliased form fails, the target module itself is probably valid. Resolve the alias replacement to an absolute path manually. Check whether the test command's working directory changes that calculation.

Finally, restart the Vitest process after configuration changes. Watch mode retains a module graph, so a clean restart removes uncertainty. Clearing every dependency cache should be a late step, supported by evidence, not the opening ritual.

Avoid “fixes” that conceal the root cause:

- Do not add \`any\` declarations for the alias. That changes type checking, not runtime resolution.
- Do not mock every failing module. The mock specifier still resolves, and the suite stops exercising real boundaries.
- Do not rewrite one import to a long relative path while leaving the rest inconsistent.
- Do not publish private source folders through package exports solely to satisfy a test misconfiguration.
- Do not add several alias plugins at once. Overlapping resolvers make precedence harder to understand.

## Prove the mapping will not drift again

Once fixed, keep a tiny resolver smoke test that imports one representative module from each important prefix. It should assert a meaningful exported value, not simply compile. This test fails during collection if the runtime mapping disappears. The normal TypeScript check independently catches editor-side drift.

In a monorepo, CI should execute the package command from its intended root on a case-sensitive environment. If package exports are part of the design, add a consumer test against the built package as well as source-level unit tests. These checks answer different questions.

Document only the non-obvious rule: which file owns aliases and whether sibling packages are consumed from source or output. A long cache-cleaning runbook is less useful than one explicit resolution policy.

The durable fix is alignment. TypeScript, Vite, Vitest, package exports, and the filesystem must agree on what the specifier means. Once that is true, “Failed to load URL” becomes a precise signal again rather than a recurring mystery.

## Package exports can masquerade as alias failures

Suppose \`@acme/accounts\` resolves, but \`@acme/accounts/testing\` produces “Failed to load URL.” The prefix looks like a path alias, yet the package may be found correctly and reject only the subpath. Modern packages often use an \`exports\` map that permits declared entry points and blocks undeclared internal files. Adding a Vite alias around that restriction makes tests diverge from real consumers.

Inspect the package's \`package.json\`. If \`./testing\` is intended public API, declare it in \`exports\` with targets that actually exist for the active module conditions. If it is private, change the test to use a public entry point or move shared test utilities into an explicit package. A passing deep import into \`node_modules/package/src\` is not a durable fix.

Conditional exports introduce another dimension. A package can offer different files for \`import\`, \`require\`, \`browser\`, or custom conditions. Vitest runs through Vite but executes tests in a Node-oriented environment unless configured otherwise. An application browser build and a Node test may legitimately select different entries. When one entry is missing or has incompatible syntax, the failure appears near resolution even though the alias itself is correct.

Use the package manager to confirm the installed version and inspect the exported files. In a workspace, confirm that build output referenced by \`exports\` exists before tests if the design consumes compiled packages. Alternatively, point a documented development condition at source and configure both the app and tests to use that condition. Do not rely on stale \`dist\` left by a previous local build.

Node's package imports field, whose keys begin with \`#\`, is another option for internal mappings. It is interpreted by Node according to package boundaries and must be reflected in the tools and TypeScript settings used by the project. It can reduce custom aliasing for server packages, but changing from \`@\` to \`#\` is an architectural choice, not a quick error workaround.

This distinction gives a useful diagnostic rule: if no part of the specifier resolves, inspect Vite alias or tsconfig integration; if the package resolves but one subpath fails, inspect \`exports\`, conditions, and build artifacts. The error text can be similar, while the correct ownership is completely different.

Symlink behavior can add one final surprise in pnpm and linked-package development. The apparent path under a workspace package may resolve to a real filesystem location with a different nearest package boundary. Avoid toggling Vite's symlink preservation option without understanding how it changes module identity, deduplication, and package lookup. Two resolved paths to the same dependency can create duplicate React instances or separate singleton state, which is a much harder failure than the original missing import.

When debugging, ask Vite to show resolver activity through its supported debug logging for the installed version and compare the final resolved IDs. A resolver trace is better evidence than repeatedly changing file extensions. Once the responsible layer is clear, make the smallest mapping or package-manifest correction and remove diagnostic overrides.

## Frequently Asked Questions

### Why does tsc pass while Vitest cannot load the alias?

\`paths\` guides TypeScript's resolver but does not rewrite the runtime import. Vitest relies on Vite resolution, so configure \`resolve.alias\` or a tsconfig-paths plugin as well.

### Is vite-tsconfig-paths required for every Vitest project?

No. An explicit absolute \`resolve.alias\` is often simpler for a small mapping set. The plugin is valuable when TypeScript already owns many mappings and duplication would drift.

### Why does the alias work in the app but fail only in tests?

Vitest may be loading a separate config, a test-mode branch may omit the alias, or nested config merging may replace \`resolve.alias\`. Confirm the active config used by the failing command.

### Can an alias point into another workspace package's src directory?

Technically yes, but it bypasses package exports and couples the consumer to internals. Prefer declared workspace package entry points unless the repository intentionally uses source-based package resolution.

### Does deleting node_modules fix Failed to Load URL?

Only when installation state is actually corrupt or a workspace link is missing. For a stable alias failure, deleting dependencies does not align TypeScript and Vite configuration, so inspect resolution first.
`,
};
