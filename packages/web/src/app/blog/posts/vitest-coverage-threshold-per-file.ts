import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Set Per-File Coverage Thresholds in Vitest',
  description:
    'Set per-file coverage thresholds in Vitest, add glob-specific exceptions, enforce CI gates, and diagnose line, branch, function, and statement failures.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Set Per-File Coverage Thresholds in Vitest

A project reports 91 percent line coverage and still contains a new parser with three untested error branches. The aggregate looks healthy because mature files dilute the weak one. Per-file thresholds reverse that accounting trick: every included source file must meet the configured floor on its own. One neglected module can fail the run even when the repository total remains comfortably above target.

Vitest exposes this gate through \`coverage.thresholds.perFile\`. The switch is small, but a useful policy also needs deliberate include rules, sensible branch targets, treatment for generated and structural files, CI commands, and a migration plan for legacy modules. This tutorial assembles those pieces and explains what a failure actually means.

For provider selection and report behavior, read the [Vitest V8 and Istanbul coverage guide](/blog/vitest-coverage-v8-istanbul-guide-2026). For the conceptual difference among line, branch, function, and mutation evidence, use the [code coverage types guide](/blog/code-coverage-types-line-branch-mutation-explained). This article stays focused on per-file enforcement.

## Why a Repository-Wide Percentage Hides Local Risk

Suppose a codebase has two files. A stable utility has 950 covered lines out of 1,000. A new authorization mapper has 10 covered lines out of 50. Together they produce 91.4 percent line coverage, passing a global 90 percent gate. The mapper itself is only 20 percent covered, and its untested lines may contain the behavior most likely to change.

| Policy | Utility result | Mapper result | Overall result | Gate outcome |
|---|---:|---:|---:|---|
| Global lines at 90% | 95% | 20% | 91.4% | Pass |
| Per-file lines at 90% | 95% pass | 20% fail | 91.4% | Fail |
| Global branches at 80% | Combined only | Combined only | 84% | Pass |
| Per-file branches at 80% | Evaluated alone | Evaluated alone | 84% | Depends on each file |

Per-file enforcement makes the unit of accountability match the unit engineers edit. It does not prove behavior is correct, and it can encourage shallow assertions if treated as the only quality measure. Its practical value is narrower: coverage debt in one module cannot be paid invisibly by unrelated tests elsewhere.

## Install a Coverage Provider and Establish a Baseline

Vitest does not collect coverage just because tests run. Install one provider matching your Vitest version. V8 uses runtime coverage from the JavaScript engine. Istanbul instruments code before execution. Both feed the same threshold configuration, though their mapping and ignore behavior can differ.

\`\`\`bash
npm install --save-dev @vitest/coverage-v8
npx vitest run --coverage
\`\`\`

Use \`@vitest/coverage-istanbul\` and \`provider: 'istanbul'\` if that provider better matches your environment. Keep Vitest and provider versions aligned. A mismatched major version can produce dependency or runtime errors that have nothing to do with the threshold.

Run coverage once without raising targets. Inspect the text report and generated report files, then identify the lowest files and the reasons they are included. This prevents a policy rollout from becoming a blind sequence of exclusions.

## The Minimal perFile Configuration

Set the four percentage floors under \`test.coverage.thresholds\` and enable \`perFile\`. The following \`vitest.config.ts\` is a working baseline for a TypeScript library whose source lives under \`src\`.

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      enabled: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__fixtures__/**',
        'src/**/generated/**',
      ],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        perFile: true,
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 80,
      },
    },
  },
});
\`\`\`

With \`enabled: true\`, an ordinary \`vitest run\` collects coverage. Some teams omit it locally and use \`vitest run --coverage\` only in the coverage script. Either is valid, but CI must execute the form that actually turns collection on.

The branch target is often lower than the line target because a single line can contain multiple outcomes. That is not a universal recommendation. Use baseline evidence and risk to choose values. A policy engine may deserve 100 percent branches, while a thin platform adapter may justify a different target.

## Understand How Each File Is Judged

When \`perFile\` is false or absent, Vitest sums coverage before comparing it with the numeric thresholds. When it is true, Vitest applies those same numbers to each file in the coverage set. A file passes only if it clears every configured metric.

| Metric | What commonly lowers it | Example test gap |
|---|---|---|
| Lines | Executable source line never runs | Error mapping block is untouched |
| Statements | Statement counter never executes | Assignment in a fallback path is missed |
| Functions | Declared function never invokes | Callback supplied to retry logic is unused |
| Branches | One outcome of a decision never runs | Only the truthy side of \`value ?? default\` executes |

Lines and statements often move together but are not identical. Branches can fail on a file whose lines look complete because the same line represents both outcomes of a conditional expression. Functions can expose exported helpers that no test or covered path calls.

A file with no executable statements needs careful interpretation. Type-only modules, declaration files, and barrels can produce provider-specific entries with unhelpful percentages. Exclude only files that genuinely carry no runtime behavior. Do not exclude a difficult adapter merely because its initial report is low.

## Control the Denominator With include and exclude

Threshold quality depends on which files are measured. If coverage includes only files imported by tests, an entirely untested new file may be absent and therefore cannot fail. An explicit \`include\` glob asks the provider to consider the intended production surface, including files not reached during the run.

Start with a narrow source root such as \`src/**/*.ts\`. Exclude declarations, generated clients, build artifacts, fixtures, and code copied from external specifications when tests would not provide useful feedback. Document why each category is exempt.

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'src/domain/**/*.ts',
        'src/application/**/*.ts',
        'src/adapters/**/*.ts',
      ],
      exclude: [
        'src/**/index.ts',
        'src/contracts/generated/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        perFile: true,
        lines: 90,
        statements: 90,
        functions: 85,
        branches: 80,
      },
    },
  },
});
\`\`\`

Blanket exclusion of every \`index.ts\` is appropriate only when those files contain exports and no initialization. If a barrel registers plugins, reads environment variables, or selects implementations, it has behavior and should remain covered. Review exclusions like production code because they determine what the gate cannot see.

Do not include test files in application coverage unless you have a specific reason. Executing test setup can inflate totals and create confusing per-file failures that measure the harness rather than the product.

## Apply Stricter or Transitional Rules With Glob Thresholds

Vitest threshold configuration can associate glob patterns with nested threshold objects. This lets critical modules have stronger floors and gives a legacy area an explicit temporary baseline without weakening the whole repository.

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: {
        perFile: true,
        lines: 90,
        statements: 90,
        functions: 85,
        branches: 80,
        'src/security/**/*.ts': {
          perFile: true,
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 100,
        },
        'src/legacy/**/*.ts': {
          perFile: true,
          lines: 70,
          statements: 70,
          functions: 65,
          branches: 60,
        },
      },
    },
  },
});
\`\`\`

Current Vitest versions require each glob rule to opt into its own \`perFile: true\`; it does not inherit the top-level switch. Glob-specific metrics also form that pattern's threshold set, so list every metric the exception should enforce. Verify matching against paths relative to the project root, especially in a monorepo. A pattern that matches nothing creates the appearance of policy without enforcement. Intentionally lower one covered line in a sample file or inspect output to prove each special rule activates.

Exceptions should have an owner and removal condition. “Legacy” is not a permanent technical category. Record the current minimum, prevent regression, and raise the floor as relevant tests are added. Do not allow a broad legacy glob to swallow new modules.

## Percentages and Maximum Uncovered Counts

Positive thresholds represent minimum percentages. Vitest also supports negative threshold numbers to represent a maximum number of uncovered entities. For example, \`lines: -5\` allows at most five uncovered lines. This can be useful for very small files where one uncovered line causes a large percentage swing, or for a controlled debt budget.

| Rule style | Example | Meaning | Useful when |
|---|---|---|---|
| Minimum percentage | \`branches: 80\` | At least 80% of branches covered | Files have comparable size and policy is stable |
| Maximum misses | \`lines: -3\` | No more than 3 uncovered lines | Small modules make percentages noisy |
| Perfect coverage | \`functions: 100\` | Every function covered | Narrow critical utility surface |
| Transitional floor | Glob with \`lines: 65\` | Legacy area cannot fall below baseline | Incremental adoption |

With \`perFile\`, a negative allowance applies to each evaluated file under that rule, not as one shared repository budget. Five files with \`lines: -3\` could each leave three lines uncovered. If your goal is a total debt budget, use aggregate thresholds or a separate report check instead.

Avoid mixing rule styles casually. A negative branch threshold means a count, while a positive one means a percentage. Add a comment explaining unusual negative values so maintainers do not “correct” them to an unintended percentage.

## Put the Gate in a Repeatable CI Script

Developers and CI should invoke the same command. Add a dedicated script instead of relying on a remembered flag.

\`\`\`json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
\`\`\`

Then make the CI test job run \`npm run test:coverage\` and preserve the HTML or JSON summary as an artifact when useful. A threshold violation causes a nonzero process exit, so no custom parser is needed for the basic gate.

In a workspace, decide whether each package owns its configuration or a root project enforces all source files. Per-package gates usually produce clearer ownership and avoid one package's paths or environment affecting another. If tests run in shards, do not enforce thresholds independently on partial execution unless each shard collects a complete file set. Merge coverage output first or run a separate full coverage job.

Coverage collection is slower than an ordinary unit run. A practical pipeline often runs fast tests on every push and one coverage job per pull request. The quality gate still blocks merging, but developers are not forced to collect coverage during every watch-mode cycle.

## Migrate Without Normalizing Bad Exceptions

Turning on a 90 percent per-file gate in an established repository may produce hundreds of failures. Disabling the policy is not the only response. Inventory files, group them by risk and ownership, and select a baseline strategy.

One approach is to set broad thresholds at the current sustainable minimum, add strict globs for new or security-sensitive code, and raise the broad values in planned increments. Another is to exclude a precisely named legacy directory while requiring any touched file to move into a covered location. The first approach keeps old code visible in reports; the second is simpler but can hide degradation.

Do not add per-file ignores inside source merely to silence the first run. Coverage ignore comments are appropriate for genuinely unreachable platform guards or defensive assertions, but each one should explain the condition. If a branch is merely awkward to test, that is evidence about design and dependencies, not proof that the branch is irrelevant.

Review thresholds when modules split or merge. A large well-tested file split into two can expose one weaker responsibility, which is useful information. Resist lowering the gate automatically. Add focused tests or reconsider whether the extracted module has an unnecessarily broad surface.

## Diagnose a Per-File Threshold Failure

Start with the text report's failing file and metric. Open the HTML report to see uncovered lines and branch markers. For branch failures, inspect conditional expressions, optional chaining, defaults, switch cases, and short-circuit operators on otherwise green lines.

If the report names a file you expected to exclude, test the glob relative to the config's project root and check path separators in your environment. If a source file is missing entirely, verify \`include\`, provider support, transforms, and whether another config overrides coverage settings.

Source maps matter for TypeScript. Provider output should map executed JavaScript back to TypeScript, but unusual transpilation plugins can distort locations. Reproduce with the smallest configuration, keep provider and Vitest versions aligned, and compare V8 with Istanbul only as a diagnostic. Do not switch providers solely to obtain a more flattering number.

When a one-line function fails both function and line thresholds, adding one meaningful behavior test may fix multiple metrics. Read the code before chasing counters. The goal is evidence around decisions and outcomes, not merely turning report cells green.

## Per-File Coverage Is a Guardrail, Not a Test Strategy

A test can execute every line without checking any result. Per-file thresholds cannot detect weak assertions, missing requirements, unrealistic test data, or equivalent mutants. They also do not rank uncovered code by business impact.

Use the gate to prevent silent local decay. Pair it with reviews that ask what behavior is demonstrated, mutation testing on critical logic, integration tests at dependency boundaries, and defect analysis. High coverage is valuable when it is a byproduct of deliberate examples. It becomes harmful when engineers contort design or write no-op tests to satisfy a number.

The best threshold is strict enough to change behavior and stable enough that teams trust failures. Begin from measured reality, make exceptions explicit, protect new code, and raise standards as the suite improves.

Review the report alongside changed lines during pull requests. A file can clear its floor while newly added branches remain uncovered because older tests provide enough percentage headroom. Per-file gates constrain the whole module, not the delta. If preventing new debt is the primary goal, combine the Vitest gate with a changed-lines coverage check in CI and keep the definitions of generated or ignored code aligned.

Refactoring can change counters without changing behavior. Moving a conditional into a helper adds a function counter; compiling optional chaining can affect provider mappings; deleting dead code may raise the percentage without adding tests. Treat threshold movement as a prompt to inspect the report, not an automatic verdict on engineering quality. The nonzero exit is a gate, while the review explains whether the new evidence is meaningful.

Package maintainers should own exceptions close to the relevant configuration. A central preset can establish defaults, but local overrides need comments and periodic review. Otherwise, teams discover an inherited glob only after a file moves directories and suddenly uses a different floor. A tiny configuration test or deliberate canary module can confirm that shared presets merge as expected after Vitest upgrades.

## Frequently Asked Questions

### What does thresholds.perFile do in Vitest?

It applies configured line, statement, function, and branch thresholds to every covered source file individually. Without it, Vitest normally compares the thresholds with aggregated project coverage, allowing strong files to offset weak ones.

### Does per-file coverage work with both V8 and Istanbul?

Yes, threshold enforcement is available with both providers. The measured results can differ because collection and source mapping differ, so establish baselines with the provider used in CI and avoid comparing numbers as if they were identical.

### Why did an untested file not fail my Vitest threshold?

It may not be part of the coverage set. Configure \`coverage.include\` to cover the intended production glob, then verify that exclusions do not remove it. A provider cannot enforce a threshold against a file it never reports.

### Can one folder have a lower threshold during migration?

Yes, use a glob-specific threshold object for a narrowly defined legacy path. Give the exception an owner and planned exit, and ensure the glob actually matches reported paths. Keep new and critical areas under the stronger default or dedicated strict rules.

### Should every metric be set to 100 percent per file?

Not automatically. Perfect coverage can be appropriate for small critical modules, but universal 100 percent gates may reward trivial tests and unnecessary ignore comments. Choose floors from risk, architecture, and baseline evidence, then supplement coverage with tests that verify meaningful outcomes.
`,
};
