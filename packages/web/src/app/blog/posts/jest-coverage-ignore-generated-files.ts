import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Exclude Generated Files from Jest Coverage',
  description:
    'Exclude generated files from Jest coverage without hiding authored code, using precise collection rules, Istanbul directives, and auditable thresholds.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Exclude Generated Files from Jest Coverage

Your schema compiler emits 18,000 lines of TypeScript, Jest counts them as uncovered, and the coverage gate falls even though nobody is expected to hand-test generated switch branches. The wrong response is to lower the global threshold. The useful response is to define which artifacts are authored, which are generated, and where that distinction belongs in the coverage pipeline.

Jest can exclude generated sources at collection time through \`collectCoverageFrom\`, at module instrumentation time through \`coveragePathIgnorePatterns\`, or locally through Istanbul ignore comments. Those controls operate at different stages. Choosing the narrowest honest control keeps genuine application gaps visible while removing code whose correctness is owned by a generator or upstream schema.

## Inventory the files before writing a glob

Generated code is not a single category. Some repositories commit API clients, some build them into \`dist\`, and others generate sources into the same directory as handwritten modules. Start by listing actual paths in the coverage JSON or HTML report. Record the generator, regeneration command, source-of-truth input, and whether humans modify the output.

| Artifact | Usually exclude? | Reasoning checkpoint |
|---|---|---|
| OpenAPI client regenerated in CI | Yes | Test the generator input and a small integration surface instead |
| Protobuf message classes | Yes | Branches reflect serialization machinery, not product decisions |
| Database migration produced then reviewed | Not automatically | It may contain edited production logic that deserves execution |
| Checked-in GraphQL operation types | Yes | Types vanish at runtime, emitted helpers may be mechanical |
| Handwritten adapter beside generated client | No | It contains mapping, retry, and error decisions |
| Generated parser customized after creation | No | Human changes have made the file authored code |

The key test is ownership, not file size. A large file can be authored, and a seven-line generated barrel can still distort file counts. Put generated artifacts under a recognizable directory or suffix when the tool allows it. Clear boundaries make coverage, linting, review, and code search more reliable.

## Use collectCoverageFrom for the intended source universe

\`collectCoverageFrom\` tells Jest which source files should be included even if tests never import them. Its ordered glob list can include broad authored sources and negate generated locations. Negations must appear after inclusive patterns because later patterns can override earlier matches.

\`\`\`typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/**/__generated__/**',
    '!src/**/*.generated.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

export default config;
\`\`\`

The barrel-file exclusion in this example is a policy choice, not a universal recommendation. If an \`index.ts\` performs initialization or exposes conditional exports, excluding every barrel could hide behavior. Delete that negation unless your repository has established that barrels are declarative only.

Run Jest with coverage and inspect the exact file set, not just the final percentage. A passing number can conceal an overbroad pattern such as \`!src/**/gen*/**\`, which might also remove a handwritten \`general-ledger\` directory depending on the glob.

## Know when coveragePathIgnorePatterns is different

\`coveragePathIgnorePatterns\` contains regular-expression strings matched against full file paths. Jest skips coverage information for matching files. It is useful when generated modules are imported during tests but should not be instrumented or reported. By contrast, \`collectCoverageFrom\` defines which otherwise unrequired files enter the report.

\`\`\`typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}', '!<rootDir>/src/**/*.d.ts'],
  coveragePathIgnorePatterns: [
    '<rootDir>/src/generated/',
    '<rootDir>/src/clients/billing/schema-types\\.ts$',
  ],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
};

export default config;
\`\`\`

Do not confuse \`testPathIgnorePatterns\` with coverage exclusion. It controls which test files Jest runs. Likewise, \`modulePathIgnorePatterns\` affects module visibility. Using either to manipulate coverage can remove tests or modules from execution, which is a much larger semantic change.

| Jest setting | Input form | Primary job | Typical generated-code use |
|---|---|---|---|
| \`collectCoverageFrom\` | Glob list | Defines reportable source universe | Negate generated directories and suffixes |
| \`coveragePathIgnorePatterns\` | Regex list | Prevents matching paths from coverage | Ignore imported generated runtime helpers |
| \`testPathIgnorePatterns\` | Regex list | Skips matching test paths | Exclude copied tests in build output, not sources |
| \`modulePathIgnorePatterns\` | Regex list | Hides module paths from resolver | Rarely appropriate for a coverage concern |
| \`coverageThreshold\` | Percentage or uncovered-count limits | Fails runs below policy | Apply gates after the file universe is correct |

Using \`<rootDir>\` reduces accidental matches in absolute paths. A bare \`generated\` regex can match a dependency cache, workspace name, or unrelated parent directory. Path separators also matter on Windows, so prefer directory fragments Jest normalizes reliably and validate on every CI operating system you support.

## Exclude a generated file without excluding its neighbors

Mixed directories need exact targeting. Suppose \`src/clients/billing/client.ts\` is generated while \`src/clients/billing/retry-policy.ts\` is handwritten. Excluding the whole billing directory destroys signal from retry decisions. Target the known filename, suffix, or generated header.

If the generator supports an output directory, move the client into \`src/clients/billing/generated/\`. If it supports a filename template, use \`.generated.ts\`. This is more maintainable than growing a config list of individual names. The convention should be enforced in the generation command so a new output cannot silently land outside the exclusion.

Generated headers are useful for review but Jest globs cannot match file contents. A custom script can audit that every file under an excluded directory contains the expected “do not edit” marker, while every matching generated suffix is reproducible. Keep that audit separate from test execution so the coverage config remains understandable.

Do not exclude a file solely because it has low coverage. Low coverage is the observation that starts review, not proof of generation. Trace it back to a schema compiler, code generator, or build artifact before changing policy.

## Istanbul directives for unavoidable mixed output

Jest's coverage implementation understands Istanbul ignore hints in instrumented JavaScript. These include \`/* istanbul ignore next */\` for the next function or statement, \`/* istanbul ignore if */\` and \`/* istanbul ignore else */\` for a branch, and file-level \`/* istanbul ignore file */\` when placed before executable code.

File-level directives are a last resort for generated output that cannot be isolated by path. They are fragile if a generator strips comments, moves banners, or emits code before the directive. Never manually add the comment after each generation. Configure the generator template or post-generation step, then test reproducibility.

Branch directives can be legitimate inside generated compatibility shims where one platform path cannot execute in the test environment. They are a poor substitute for testing handwritten error handling. Each directive should carry a nearby explanation in source or generator template so reviewers can distinguish a tooling limitation from coverage gaming.

The coverage provider matters. Jest supports Babel-based instrumentation and V8 coverage. Ignore-hint behavior and source mapping can differ, particularly after TypeScript transformation. Verify the rendered report for the provider used in CI rather than assuming a comment seen in source was honored.

## Keep source maps from resurrecting generated paths

Transpilers can make one physical JavaScript file report against several TypeScript sources. If a generated source map points into \`src/generated\`, coverage may appear there even when runtime code lives in \`dist\`. Conversely, broken source maps can attribute authored code to a generated bundle.

Inspect the coverage JSON's keys and the compiled file's \`sourceMappingURL\`. Ensure Jest transforms the intended source files only once. Avoid collecting both \`src/**/*.ts\` and emitted \`dist/**/*.js\`, which double-counts equivalent logic. A clean setup normally ignores build output entirely and reports through source maps to the original authored TypeScript.

Monorepos add another wrinkle: each Jest project may resolve \`<rootDir>\` differently. A root configuration copied into package projects can point at the wrong generated folder. Run \`jest --showConfig\` for the affected project and inspect expanded roots and patterns. Configuration truth is what Jest resolved, not what a shared preset appeared to say.

## Test the boundary around generated clients

Excluding generated internals does not mean ignoring the integration. Test the code your application owns where it meets the generated surface. For an OpenAPI client, that might be authentication injection, base URL selection, error normalization, and mapping from transport DTOs to domain models.

\`\`\`typescript
// src/orders/order-gateway.test.ts
import { OrderGateway } from './order-gateway';
import type { OrdersApi } from '../generated/orders-api';

test('maps a generated 404 response to a domain-level missing order', async () => {
  const api = {
    getOrder: jest.fn().mockRejectedValue({ response: { status: 404 } }),
  } as unknown as OrdersApi;

  const gateway = new OrderGateway(api);

  await expect(gateway.findById('order-42')).resolves.toBeNull();
  expect(api.getOrder).toHaveBeenCalledWith({ orderId: 'order-42' });
});
\`\`\`

This test deliberately avoids asserting the generator's serialization branches. It asserts an application decision: transport 404 becomes a nullable lookup. Add a small contract or integration test against a representative server response so generation drift is caught. The [JavaScript coverage guide for Istanbul and nyc](/blog/istanbul-nyc-code-coverage-javascript-guide) provides more detail about instrumentation when a non-Jest package shares the same reporting pipeline.

## Recalculate thresholds after cleaning the denominator

Removing thousands of generated lines can make coverage jump. That does not mean the suite suddenly improved; the denominator changed. Record the before-and-after file inventory in the pull request, then set thresholds based on authored code. Avoid celebrating the percentage delta as new test coverage.

Jest permits global thresholds and path-specific thresholds. Negative values represent a maximum number of uncovered entities rather than a percentage. Path-specific gates can protect critical adapters more strictly, although glob behavior and subtraction from the global calculation deserve careful review in the Jest version you use.

Coverage types convey different risks. Generated property assignments might inflate line coverage, while a handwritten policy function needs meaningful branch cases. The [explanation of line, branch, and mutation coverage](/blog/code-coverage-types-line-branch-mutation-explained) helps set a policy that does not collapse all signals into one percentage.

Treat thresholds as alarms. They should fail when authored behavior loses execution, not when a schema adds 500 mechanical accessors. Once generated files are removed, raise the gate only to a level the team can sustain with useful tests. A near-perfect line target can still encourage trivial assertions and ignore fault detection.

## Make the exclusion auditable in CI

A coverage exclusion is production test policy, so review it like code. Require generated paths to be explicit, narrow, and paired with a reproducible generation command. In CI, generate from a clean checkout and fail if committed output differs. That proves the excluded files really derive from reviewed inputs.

Store the JSON summary as an artifact when troubleshooting changes. HTML is excellent for human exploration, but JSON lets a small audit script compare file keys and detect a sudden disappearance of an authored directory. The audit need not enforce a brittle full snapshot. It can reject suspicious conditions such as zero files under \`src/domain\` or any coverage key under \`dist\`.

When a new generator enters the repository, update three things together: its output convention, its coverage treatment, and the tests at its application boundary. That small design review prevents a blanket ignore from arriving weeks later in response to a broken dashboard.

Finally, document why each pattern exists. \`!src/generated/**\` is self-explanatory only until someone finds a manually edited file there. A comment in a JavaScript or TypeScript Jest config can name the generator and source schema. JSON configs cannot carry comments, which is one reason a typed config is often preferable for a nuanced policy.

## Migrate an existing repository without losing trend history

Cleaning a long-lived coverage configuration changes the denominator and breaks naive comparisons with previous percentages. Treat the change as a measurement migration. Produce one baseline report from the old configuration and another from the proposed configuration at the same commit. Archive the file lists, uncovered counts, and thresholds with the pull request. That shows exactly what the policy change removed.

Review every disappearing path. Generated directories should map to a known command and source input. Build output should map back to covered source rather than simply vanish. Any handwritten file removed by a broad pattern is a release blocker for the configuration change. Pay particular attention to files that contain both emitted constants and manual wrappers, because directory naming alone may misclassify them.

Then classify historical dashboards. Either start a new series at the migration commit or recalculate a limited comparison window using the new configuration. Do not splice an 87 percent post-cleanup value onto an 81 percent old-denominator chart and describe six points of test improvement. A note marking the methodology break is honest and keeps management reporting useful.

Threshold transitions should avoid both surprise failures and permanent weakening. Calculate current authored-code coverage, choose a gate just below a stable observed value if normal line movement creates small fluctuations, and open separate work for genuine uncovered risks. Do not preserve the old lower threshold merely because it still passes after generated code disappears. The cleaned denominator should make the gate describe the current test policy.

Check every Jest project in a monorepo. Frontend, backend, worker, and shared-library projects may inherit a preset but use different roots and generators. Generate separate JSON summaries and union their file keys only if reports are intentionally merged. Duplicate source paths under different transpilation outputs can inflate totals or make one project appear to cover another.

Coverage upload services add another mapping layer. Confirm their ignore settings do not contradict Jest. Prefer excluding at the instrumentation source and uploading a clean report, while keeping service-side rules minimal. If the service rewrites paths or merges parallel jobs, verify one generated file does not reappear from an older artifact.

Finally, add a review test for the configuration itself. A lightweight CI script can assert that representative authored files are present, representative generated files are absent, declaration files are absent, and the report contains a nonzero number of source files. These are sentinel assertions, not a full snapshot. They catch a missing root, reordered negation, or renamed generator directory before an implausible 100 percent report reaches the dashboard.

The migration is complete when the generation boundary is reproducible, the report universe is reviewed, thresholds reflect authored code, and trend consumers understand the reset. At that point future exclusions should require the same evidence instead of becoming routine percentage maintenance.

Revisit the boundary after generator upgrades. A new major version may emit runtime validation, custom hooks, or adapter code that your application now relies on differently. Compare output layout and responsibility before carrying the old exclusion forward. Generated does not always mean irrelevant, and an exclusion decision remains valid only while ownership and verification remain unchanged.

## Frequently Asked Questions

### Why is a generated file still present after I negated it in collectCoverageFrom?

It may be imported by a test and instrumented through another path, or a source map may attribute compiled code to it. Add a precise \`coveragePathIgnorePatterns\` entry if the file truly should not be instrumented, then inspect resolved Jest configuration and report keys.

### Does testPathIgnorePatterns remove a source file from coverage?

That setting skips test paths. It is not the correct control for source coverage and can accidentally stop tests from running. Use collection globs or coverage path patterns for generated source artifacts.

### Should generated migrations be excluded?

Not by default. A migration changes real production data and may include reviewed or edited SQL. Test that it applies, preserves required data, and rolls back when rollback is supported, even if a tool created the initial draft.

### Is an Istanbul ignore file comment enough for TypeScript?

Only if the active transform and coverage provider preserve and honor it in the right location. Confirm in the CI-generated report. A path-based exclusion is clearer when the whole file is reproducibly generated.

### How do we stop exclusions from expanding silently?

Review config changes, keep generated output under a strict naming convention, and audit coverage file keys in CI. Pair exclusions with clean-regeneration checks so a manually maintained source cannot hide inside an ignored tree.
`,
};
