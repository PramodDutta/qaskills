import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest “No Test Suite Found” Fix',
  description:
    'Fix Vitest No Test Suite Found errors by tracing discovery roots, include patterns, workspaces, CLI filters, and files that define no runnable tests.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Vitest “No Test Suite Found” Fix

Vitest found a file, transformed it, and still reported that no suite exists. That message is different from finding no test files at all. The distinction narrows the investigation: discovery decides which files enter the runner, while collection decides whether an entered module registers \`test\` or \`it\` calls.

Treat the exact terminal output as evidence. A path listed beside “No test suite found” usually reached collection but declared nothing runnable. “No test files found” points earlier, toward roots, globs, exclusions, projects, or command-line filters. Fixing the wrong layer produces broad patterns that accidentally execute fixtures, generated code, or browser examples.

## Separate file discovery from suite collection

Vitest discovers candidates using its configured root and \`test.include\` patterns, then removes matches covered by exclusions. It loads each remaining module through Vite. During evaluation, calls such as \`describe()\` and \`test()\` register suites and cases. A module that only exports helper functions can match the glob yet collect zero tests.

| Output symptom | Pipeline stage | First place to inspect |
| --- | --- | --- |
| No test files found | Discovery | \`root\`, \`include\`, \`exclude\`, CLI path filter |
| No test suite found in file | Collection | Imports and actual \`test()\` declarations |
| Failed to load module | Transform or import | Aliases, environment, syntax, dependencies |
| Tests are skipped | Collection and selection | \`skip\`, \`todo\`, name filters |
| Wrong package runs tests | Project selection | Workspace/project config and working directory |

Do not use \`passWithNoTests\` as the first repair. It changes the exit behavior when discovery legitimately returns nothing, which can be appropriate for optional packages. It cannot turn a helper file into a test suite, and in a required CI job it can hide a broken glob.

## Inspect the effective root and include glob

Glob paths are evaluated relative to the configured project root. In a repository-root config, \`src/**/*.test.ts\` looks under the repository's \`src\`. In a package config whose root is that package, the same pattern looks under the package. Copying a glob without understanding that base directory is the most frequent monorepo mistake.

A focused configuration makes discovery legible:

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.*/**'],
    environment: 'node',
  },
});
\`\`\`

Run \`vitest list\` to inspect collected tests without executing them. Add the same config flag and project selection used in CI. Then compare an expected file's path with each include pattern. Globs use forward slashes, and braces or extglobs must be syntactically valid for the matcher. A shell may expand an unquoted command-line glob before Vitest sees it, so quote path patterns passed in a terminal.

Start narrow. If \`src/math.test.ts\` should run, temporarily include that literal path. Once collection works, widen to the smallest correct family. A catch-all such as \`**/*.ts\` merely converts discovery problems into thousands of empty-suite and side-effect problems.

## Correct files that look like tests but register nothing

Naming alone does not make a module a test. A file might have been reduced to shared factories during refactoring, wrap declarations in a function that nobody calls, or import a framework API from the wrong package. It may also conditionally declare tests only when an environment variable is set.

This file is discoverable but empty:

\`\`\`typescript
import { expect, test } from 'vitest';

export function registerCurrencyContract() {
  test('formats whole euros', () => {
    expect(new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(12)).toContain('12');
  });
}
\`\`\`

The \`test()\` call happens only if another module invokes \`registerCurrencyContract()\` during collection. Either call it at module scope in a real spec, or rename the file as a helper and import it from actual tests. A clearer arrangement is \`currency.contract.ts\` for the registration function plus \`currency.test.ts\` that calls it with an implementation.

Conditional definition is similarly risky. Do not put suite declarations inside asynchronous setup, callbacks, or runtime branches whose condition differs across machines. Register the test consistently and use \`test.skipIf(condition)\` when the skip is intentional and visible.

## Stop helper modules matching test conventions

Directories named \`test\` often contain data builders, fake servers, setup files, and actual specs. An include such as \`test/**/*.ts\` makes all of them candidates. Rename helpers to extensions outside the test convention or tighten the pattern to \`test/**/*.spec.ts\`.

| Repository artifact | Recommended naming | Discovery treatment |
| --- | --- | --- |
| Executable unit test | \`price.test.ts\` | Include |
| Executable integration spec | \`checkout.integration.test.ts\` | Include in integration project |
| Test data builder | \`order-builder.ts\` | Do not match |
| Global setup module | \`vitest.setup.ts\` | Reference through \`setupFiles\`, do not include |
| Type-only test | Tool-specific suffix | Route to the appropriate type checker |
| Generated fixture | \`generated/catalog.ts\` | Exclude or keep outside test glob |

An explicit exclusion can stabilize a legacy layout, but naming is easier for humans and tools. Remember that replacing \`exclude\` can discard defaults depending on Vitest version and configuration composition. Specify the directories you truly need excluded, and verify the effective result with listing rather than assuming inherited defaults.

## Trace CLI filters before editing configuration

Vitest accepts file path filters as positional arguments. They are substring-like path filters, not necessarily shell globs with the same semantics as \`include\`. A CI command copied from Jest may select nothing. The test name filter \`-t\` or \`--testNamePattern\` acts later and can make a collected run appear empty for a different reason.

Reproduce the exact command from the failing job. Remove filters one at a time. If the unfiltered configuration collects the expected case, the config is not the primary defect. Check quoting, changed working directories, environment variables used to construct paths, and whether a package manager forwarded arguments as intended.

Watch mode can also retain a confusing mental model after files move. Exit and run once in non-watch mode. This does not repair configuration, but it makes the experiment repeatable.

The [Vitest configuration and setup guide](/blog/vitest-config-setup-guide-2026) provides the broader context for config loading, setup files, aliases, and environments. For this error, keep the investigation centered on selection and collection until evidence moves it elsewhere.

## Resolve config precedence and accidental shadowing

Vitest can read a dedicated \`vitest.config.*\` or use Vite configuration. A command can select another file with \`--config\`. In a monorepo, a package script may run from a different directory and load a nearer configuration than the one being edited. Before changing globs, confirm which configuration the failing command actually uses.

Merging config objects can replace arrays rather than append them. A package override that sets one \`include\` entry may remove a base project's conventions. Conversely, a base Vite config can set a root intended for application bundling that is unsuitable for tests. Prefer explicit project configs with local roots over clever deep merging that nobody can explain from the job log.

Aliases can produce a different but adjacent failure. If collection loads the file and an import throws, Vitest reports the import error rather than a pure empty suite. Fix the first error. An exception before module-level \`test()\` calls can prevent later declarations from registering, but hiding the import does not make the suite correct.

## Make monorepo projects own their boundaries

Large repositories benefit from named Vitest projects. Each package or test class can define its root, environment, includes, and setup. The root project then selects projects instead of using one repository-wide glob that crosses compiled output and examples.

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api-unit',
          root: './packages/api',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'ui-dom',
          root: './packages/ui',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
\`\`\`

Use the syntax supported by the repository's installed Vitest version, because workspace configuration evolved across major versions. The important architecture is stable: each project owns a root and a non-overlapping test family. Select a named project in CI and confirm it lists cases.

The [Vitest workspace monorepo guide](/blog/vitest-workspace-monorepo-testing-guide) addresses package-level setup and shared configuration in more depth. Do not solve one missing suite by letting every project discover every other package's tests. That creates duplicate execution and environment mismatches.

## Account for generated and transformed tests

Some teams generate spec files during a pretest step. A clean CI checkout lacks them unless generation runs first, while a developer's stale local files make discovery look healthy. Verify the generator output directory, command ordering, and artifact presence. Prefer generating into a dedicated directory whose inclusion is intentional, and clean it before generation so deleted cases do not linger.

Macro systems and custom transforms can also create test calls. If the plugin is absent from the selected config, the source may transform into a module with no registrations or fail earlier. Keep at least one ordinary smoke test per project. It proves that discovery and Vitest itself work independently of code generation.

Type checking is not runtime test collection. A \`*.test-d.ts\` file intended for a type assertion tool should not be swept into ordinary Vitest unless the chosen Vitest feature explicitly supports its form. Route each artifact to the tool that understands it.

## A disciplined repair sequence

Capture the full command, current directory, Vitest version, and loaded config. Run the list command. If no file appears, test a literal include path. If the file appears but has no cases, open it and trace top-level registration. If it imports a shared suite factory, confirm the factory is invoked synchronously. If helper files appear, narrow conventions or rename them.

Next, test from the same package directory and repository root to expose root assumptions. Select each named project separately. Remove positional and name filters. Confirm generated specs exist before Vitest starts. Only after the expected case appears in the list should you execute it.

Add a small CI assertion through normal Vitest exit behavior: required projects must contain tests and should not set \`passWithNoTests\`. Optional template packages may use that option, but document why zero cases is valid. The desired outcome is not silence. It is a discovery boundary that fails when expected tests disappear and ignores files that were never suites.

## Check global APIs and imported test functions

Vitest can expose \`describe\`, \`test\`, and \`expect\` as globals when \`globals: true\` is configured. Without that option, a file relying on globals normally throws a reference error rather than quietly collecting nothing. Importing APIs from \`node:test\`, Jest globals, or another runner creates an equally confusing boundary: the file may execute tests under the wrong registry or fail before Vitest sees them.

Standardize imports or global policy per project. TypeScript global types do not enable runtime globals; adding \`vitest/globals\` to compiler types only makes the names type-check. The runtime configuration must agree. Conversely, an explicit \`import { test, expect } from 'vitest'\` is self-documenting and portable across editor configurations.

Search the empty file's imports and verify the call is the Vitest function. Wrapper libraries that expose a domain-specific \`scenario()\` must call Vitest synchronously during module evaluation. If they defer registration until an event or promise resolves, collection finishes first.

## Treat dynamic test generation as collection code

Reading a JSON case file synchronously and declaring one test per row is valid. Fetching cases asynchronously from a service at module scope is brittle and can make collection dependent on the network. Prefer checked-in datasets, generate them before the runner starts, or register one test that performs the remote interaction as test behavior.

An empty dataset can legitimately generate zero tests, but required datasets should fail with a direct message. Assert that parsed cases have positive length before the declaration loop. That error is far more actionable than an empty-suite message. Include dataset validation for unique case IDs and required fields so malformed rows do not silently disappear.

When using \`describe.each\` or \`test.each\`, confirm the table is the expected type and not filtered to an empty array by an environment flag. Keep filtering decisions visible in test output through skips or separate project selection.

## Investigate changed files and related-test modes

Commands that select changed or related tests add a dependency-analysis filter on top of discovery. A file may match \`include\` but be omitted because Vitest cannot relate it to the supplied source path. Generated imports, dynamic paths, or aliases can make that graph incomplete.

Run the same project without changed-file selection. If collection returns, the include pattern is healthy. Then verify the source path exists in the selected root and that imports are statically traceable. CI diff bases also matter: a shallow checkout or incorrect base commit can produce an empty changed set.

Do not globally enable \`passWithNoTests\` to accommodate one optimization job. Keep the full required job strict and allow zero only in a specifically named affected-tests job whose empty result is meaningful.

## Make discovery observable in repository maintenance

Add a lightweight scheduled or pull-request check that lists tests for each required project and stores the count by project. Counts are not quality metrics, but a sudden drop to zero catches renamed directories, config shadowing, and missing generated artifacts. Review intentional count changes rather than enforcing an ever-increasing number.

Document conventions beside the config: accepted suffixes, root, project names, setup paths, and how integration tests differ from units. Developers then know where a new file belongs without broadening globs by trial and error.

When reorganizing directories, change one boundary at a time and compare listed canonical test names before and after. This detects accidental duplicate execution as well as missing suites. A healthy fix yields the same intended cases under clearer ownership.

## Watch for case sensitivity and ignored files

A path can succeed on a case-insensitive developer filesystem and fail on a case-sensitive Linux runner. Match directory and filename case exactly in imports, includes, and CLI filters. Git may also preserve a case-only rename unexpectedly depending on filesystem settings, so inspect the committed path rather than only the editor tab.

Vitest discovery is influenced by explicit configuration, while repository tools can add another layer around it. A task runner may omit a package from its graph because changed-file metadata, workspace membership, or cached outputs say nothing changed. Prove the package script itself collects tests before debugging orchestration. Then invalidate only the relevant cache through the task runner's supported mechanism.

Symlinked packages deserve caution. Their real path can sit outside the selected root, and dependency inlining or Vite server restrictions may affect loading. Prefer workspace projects with clear physical roots. If symlinks are intentional, add one targeted discovery test in CI on the same operating system and package-manager layout used for releases.

An ignored file should be ignored for a reason. Keep exclusions specific enough that a new directory named \`build\` inside source fixtures does not vanish unexpectedly. Review include and exclude changes together, list the resulting cases, and record any intentional additions or removals in the pull request.

## Frequently Asked Questions

### Why does Vitest name a file and then say no suite was found?

The file matched discovery and was loaded, but module evaluation registered no runnable tests. Look for helper-only content, uncalled suite factories, conditional declarations, or refactoring that moved the final test elsewhere.

### Will passWithNoTests fix an empty-suite file?

No. It controls whether a run with no discovered tests is allowed to succeed. It does not create test cases and should not conceal missing tests in a required CI project.

### Are include paths relative to the config file?

They are interpreted from the effective project root. That root may be influenced by configuration and monorepo project boundaries, so verify it rather than inferring it from the config file's location.

### Why does the spec run locally but not from the package script?

The two commands may have different current directories, config files, project selections, or forwarded path filters. Compare the literal commands and use test listing in both contexts.

### Should setup files end in .test.ts?

No. Give setup modules a non-test name and load them with \`setupFiles\`. Otherwise the discovery glob may execute them as standalone candidates and report that they contain no suite.
`,
};
