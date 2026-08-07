import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Coverage Thresholds per Directory: Enforce Risk-Based Quality Gates',
  description: 'Configure vitest coverage thresholds per directory, include untouched files, diagnose glob mismatches, and enforce meaningful risk-based CI quality gates.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Vitest Coverage Thresholds per Directory: Enforce Risk-Based Quality Gates

Vitest coverage thresholds per directory are configured by putting glob-pattern keys inside \`test.coverage.thresholds\`. Each matching directory can require its own percentages for lines, functions, branches, and statements, while top-level numbers continue to enforce aggregate coverage across the complete report. The useful outcome is a risk-based gate: payment rules can demand stronger branch coverage than generated adapters or low-risk presentation code.

A threshold is only trustworthy when the report includes the source files you intended to govern. Configure \`coverage.include\` explicitly, verify the matched paths, and decide whether each directory rule is an aggregate or a per-file policy. Otherwise a well-tested large file can hide an untouched neighbor, or a glob can match nothing and create a reassuring but meaningless green build.

This guide builds a production-ready policy for a TypeScript service. It covers baseline selection, positive and negative thresholds, provider choices, monorepo roots, CI output, and a methodical diagnosis for the classic failure: the terminal shows good global coverage, yet the directory gate fails.

## Translate application risk into directory budgets

Coverage is a measurement of executed structure, not proof of correct behavior. Its best use is as a change detector and omission alarm. Directory-specific gates make that alarm proportional to consequence.

Consider this source tree:

\`\`\`text
src/
  billing/
    calculate-total.ts
    apply-credit.ts
  auth/
    permissions.ts
    session.ts
  ui/
    format-status.ts
    empty-state.ts
  integrations/
    warehouse-client.ts
    generated/
      schema.ts
\`\`\`

The billing and authorization directories contain branching business rules. The UI directory contains simple formatting. The integration client mostly translates between systems, while generated code should not be evaluated as if humans maintained it. One global target erases those differences.

| Directory | Primary risk | Useful emphasis | Example starting gate |
|---|---|---|---|
| \`src/billing/**\` | Incorrect money movement | Branches and functions | 90 branches, 95 lines |
| \`src/auth/**\` | Privilege mistakes | Branches and statements | 95 branches, 95 statements |
| \`src/ui/**\` | Presentation regressions | Lines and functions | 75 lines, 70 functions |
| \`src/integrations/**\` | Contract translation errors | Statements and error branches | 80 statements, 75 branches |
| Generated sources | Generator fidelity, not handwritten behavior | Exclude with written rationale | Not gated here |

These numbers are examples, not universal targets. Establish a baseline from the current report, inspect untested behavior, then choose a target that is achievable but difficult to regress accidentally. A team starting at 42 percent branch coverage should not copy a 95 percent gate merely because it sounds rigorous. That produces either permanent red builds or broad exclusions.

## Configure glob-scoped thresholds in Vitest

Vitest supports V8 and Istanbul coverage providers. Install the package for the provider your repository selects. The example uses V8 and defines both global and directory-specific thresholds.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/generated/**',
        'src/**/index.ts',
      ],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        'src/billing/**': {
          lines: 95,
          functions: 90,
          branches: 90,
          statements: 95,
        },
        'src/auth/**': {
          lines: 95,
          functions: 95,
          branches: 95,
          statements: 95,
        },
        'src/ui/**': {
          lines: 75,
          functions: 70,
          branches: 65,
          statements: 75,
        },
      },
    },
  },
});
\`\`\`

Glob-pattern thresholds do not inherit omitted top-level metrics. If \`src/ui/**\` specifies only \`lines\`, that scoped rule checks only lines for those matches. The same UI files still contribute to the global calculation, but the global numbers are a separate gate. Write all four scoped metrics when reviewers should see a complete directory policy.

Vitest also counts files matched by directory globs in the global totals. That is important for engineers coming from Jest, whose glob-threshold accounting behaves differently. In Vitest, the billing files are not subtracted from the global pool merely because they have their own rule.

Keep paths relative to the configured project root. A leading slash, a package prefix copied from a workspace-level command, or a pattern based on the report's absolute path may match nothing. Use the HTML report's displayed relative paths and the effective Vitest root as your reference.

## Include untouched files before trusting the percentage

By default, current Vitest coverage reports include files imported during the test run. That can make a new, completely untested module invisible. An explicit \`coverage.include\` pattern asks the provider to consider the whole intended source surface, including files no test imported.

Compare the interpretations:

| Report setup | Untested \`src/billing/refunds.ts\` imported nowhere | Meaning of 90% lines |
|---|---|---|
| No explicit coverage include | May be absent from report | 90% of discovered/imported files |
| \`include: ['src/**/*.{ts,tsx}']\` | Included with zero coverage | 90% of the selected source tree |
| Include plus broad exclusion | Possibly hidden again | Depends on exclusion accuracy |

This is where teams most often get coverage wrong. They optimize the percentage before fixing the denominator. A smaller denominator makes the badge greener without testing another behavior.

Run coverage through a dedicated package script so local and CI commands stay aligned:

\`\`\`json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "<use-the-version-aligned-with-your-repository>",
    "vitest": "<use-your-pinned-version>"
  }
}
\`\`\`

The placeholders are deliberate. The coverage provider package should be compatible with the Vitest version selected by the repository; an article should not prescribe a stale release number. Use the package manager and lockfile already adopted by the project.

After running \`npm run test:coverage\`, inspect the terminal summary and open the generated HTML report. Confirm at least one known untouched source file appears at zero. If it does not, fix inclusion before negotiating any threshold.

Exclusions deserve the same scrutiny. Declaration files, generated clients, and pure barrel exports can be reasonable exclusions. Do not exclude directories because they are hard to test. A difficult database adapter may need integration tests or a refactoring seam, not disappearance from the report.

## Decide between aggregate and per-file enforcement

A directory threshold normally evaluates the combined coverage for files matching its glob. That answers, “Is the billing directory sufficiently exercised overall?” It does not necessarily answer, “Is every billing file above the target?”

Vitest exposes \`coverage.thresholds.perFile\` for checking thresholds per file. A top-level per-file policy is much stricter because every included file must satisfy the configured limits.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      thresholds: {
        perFile: true,
        lines: 90,
        functions: 85,
        branches: 80,
        statements: 90,
      },
    },
  },
});
\`\`\`

Use a global per-file gate only when the selected files share a sensible risk profile. Tiny modules are volatile: one uncovered branch in a four-branch file produces a sharp percentage change. An aggregate directory policy often gives feature teams room to concentrate tests on complex logic while still preventing broad regression.

| Policy | Strength | Weakness | Suitable use |
|---|---|---|---|
| Global aggregate | Simple trend guard | Strong directories can hide weak ones | Early adoption |
| Directory aggregate | Risk-sensitive ownership | Large files can hide small untouched files | Most mature services |
| Per-file | Finds isolated holes immediately | Noisy for tiny or generated modules | Small critical core |
| Maximum uncovered count | Stable as code size grows | Less intuitive as a badge | Legacy modules with known debt |

Review the configuration reference for the installed Vitest release before combining scoped glob rules with per-file behavior. The exact shape supported inside a glob rule can change across release lines. The stable, portable choices are scoped numeric thresholds for directory aggregates and a documented top-level \`perFile\` gate when the whole selected file set should be strict.

## Use negative numbers to cap uncovered code

Positive values are minimum percentages. Vitest also interprets a negative threshold as the maximum number of uncovered items. For example, \`lines: -20\` means no more than twenty lines may remain uncovered.

This is useful for a legacy directory where the percentage changes strangely as generated or repetitive code shifts. A fixed uncovered budget turns the policy into a ratchet: new work should not add to the known gap.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      include: ['src/legacy/**/*.ts'],
      thresholds: {
        'src/legacy/**': {
          lines: -40,
          functions: -8,
          branches: -15,
          statements: -45,
        },
      },
    },
  },
});
\`\`\`

Do not mix up the sign. A positive \`80\` requires at least 80 percent; a negative \`-80\` allows up to 80 uncovered items. Record the rationale beside the configuration or in the owning team's quality policy so nobody “fixes” the negative number into a percentage later.

A debt budget becomes useful when paired with a burn-down plan. Review the HTML report, select behaviorally meaningful gaps, and reduce the allowed count after tests land. Avoid using automatic updates without review. A tool can raise thresholds to observed numbers, but it cannot judge whether the observed exercise represents meaningful scenarios or incidental execution.

## Build branch-focused tests for risk-heavy directories

Line coverage is often generous to decision logic. A line containing a conditional expression may execute while one outcome remains untested. Branch coverage better reflects authorization, pricing, retries, and fallback behavior.

Suppose billing has this function:

\`\`\`ts
export type Customer = {
  plan: 'standard' | 'enterprise';
  creditCents: number;
};

export function amountDue(subtotalCents: number, customer: Customer): number {
  if (subtotalCents < 0) {
    throw new RangeError('subtotal must be non-negative');
  }

  const discounted = customer.plan === 'enterprise'
    ? Math.floor(subtotalCents * 0.9)
    : subtotalCents;

  return Math.max(0, discounted - customer.creditCents);
}
\`\`\`

A single standard-customer test executes most lines but ignores the enterprise discount, invalid subtotal, and credit floor. Cover decisions with examples named after the business consequence:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { amountDue } from './calculate-total';

describe('amountDue', () => {
  it('charges a standard customer the subtotal after credit', () => {
    expect(amountDue(10_000, { plan: 'standard', creditCents: 1_000 }))
      .toBe(9_000);
  });

  it('applies the enterprise discount before account credit', () => {
    expect(amountDue(10_000, { plan: 'enterprise', creditCents: 1_000 }))
      .toBe(8_000);
  });

  it('never returns a negative amount due', () => {
    expect(amountDue(500, { plan: 'standard', creditCents: 900 })).toBe(0);
  });

  it('rejects a negative subtotal', () => {
    expect(() => amountDue(-1, { plan: 'standard', creditCents: 0 }))
      .toThrow('subtotal must be non-negative');
  });
});
\`\`\`

These tests would be valuable without a coverage gate. The gate identifies the missing structural path; the names and assertions prove the intended rules. Do not write hollow calls solely to turn lines green. An AI coding agent asked to increase coverage should receive the domain invariant, excluded integration boundaries, and required observable outcomes, not just a target percentage.

## Diagnose a directory gate that fails unexpectedly

Imagine the console reports global line coverage above 85 percent, yet \`src/auth/**\` fails its 95 percent threshold. That is not contradictory. Global success and directory failure are independent evaluations.

Work through this sequence:

1. Read the exact failing metric and glob from Vitest output.
2. Open the HTML report and filter mentally to files under the directory.
3. Check whether source maps place compiled behavior back under a different path.
4. Confirm the command loaded the intended config and root.
5. Verify all source files appear, including never-imported files.
6. Inspect uncovered branches, not just red lines.
7. Run the same locked dependency set locally and in CI.

For machine-assisted investigation, parse \`coverage-summary.json\` without asserting that it replaces Vitest's own gate:

\`\`\`ts
import { readFile } from 'node:fs/promises';

type Metric = { total: number; covered: number; skipped: number; pct: number };
type Summary = Record<string, Record<'lines' | 'branches' | 'functions' | 'statements', Metric>>;

const raw = await readFile('coverage/coverage-summary.json', 'utf8');
const summary = JSON.parse(raw) as Summary;

for (const [file, metrics] of Object.entries(summary)) {
  if (file.includes('/src/auth/')) {
    console.log(file, {
      lines: metrics.lines.pct,
      branches: metrics.branches.pct,
      functions: metrics.functions.pct,
    });
  }
}
\`\`\`

The JSON summary uses absolute or environment-dependent file keys in many reports, so the diagnostic checks a path segment. Do not build a second long-term threshold engine casually. Vitest already owns matching and failure semantics; this script simply exposes which file is dragging the directory aggregate down.

If local passes and CI fails, compare Node runtime, lockfile installation, test selection, environment-dependent branches, and working directory. Coverage can change when a conditional path depends on environment variables. The correct fix is usually to make configuration explicit and tests deterministic, not to add a CI-only threshold reduction.

## Handle monorepo roots and packages deliberately

Monorepos create two coordinate systems: repository-relative paths and project-relative paths. A glob written for the workspace root may be wrong inside a package-level Vitest project.

Assume this layout:

\`\`\`text
repo/
  packages/
    checkout/
      src/domain/
      vitest.config.ts
    identity/
      src/policy/
      vitest.config.ts
\`\`\`

In the checkout package configuration, \`src/domain/**\` is clearer than \`packages/checkout/src/domain/**\` when the project root is that package. Keep thresholds with the owning project whenever teams release independently. A single workspace-wide percentage can let a heavily tested utility package subsidize a weak checkout package.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'checkout-unit',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reportsDirectory: '../../coverage/checkout',
      thresholds: {
        'src/domain/**': {
          lines: 92,
          functions: 90,
          branches: 88,
          statements: 92,
        },
      },
    },
  },
});
\`\`\`

The custom reports directory is documented and prevents package reports from overwriting each other when jobs share a workspace. Still run package coverage in isolated CI steps where possible. Merging coverage across heterogeneous packages is a reporting choice, not a substitute for package-owned gates.

## Make the CI failure useful to reviewers

A coverage job should run the locked install, execute the same script developers use, retain a human-readable report when appropriate, and fail directly on Vitest's exit status. Do not pipe the command through a formatter that hides or replaces the exit code.

\`\`\`yaml
coverage:
  image: node:22
  script:
    - npm ci
    - npm run test:coverage
  artifacts:
    when: always
    paths:
      - coverage/
    expire_in: 7 days
\`\`\`

Choose a container tag compatible with your repository policy. The example shows normal GitLab CI syntax, not a mandatory runtime. If reports can expose source paths or code, apply the project’s artifact access controls and retention rules.

Coverage is only one signal in a busy pipeline. Canceling superseded jobs reduces feedback delay without weakening the gate; the workflow choices in [cancel stale end-to-end runs](/blog/ci-cancel-stale-e2e-runs-on-new-commit) help when new commits make old results irrelevant. When a failure is actually intermittent rather than a consistent coverage regression, preserve test-case reporting and use the diagnosis approach in [GitLab CI JUnit flaky-test reporting](/blog/gitlab-ci-junit-report-flaky-tests).

Do not mark the coverage job as allowed to fail indefinitely. If adoption must be gradual, begin with a truthful baseline and ratchet it. A visible, enforced 68 percent is more useful than an aspirational 90 percent that everybody ignores.

## Review thresholds as architecture changes

Directory gates encode assumptions about ownership and risk. Refactors can invalidate those assumptions even when the config still parses.

| Change | Coverage-policy review |
|---|---|
| Business logic moves from UI into domain | Raise domain emphasis and verify the old UI glob no longer owns it |
| New generated SDK directory appears | Exclude only generated output, keep handwritten wrappers included |
| Package splits into two projects | Give each project an explicit include set and local gates |
| Critical incident reveals an untested branch | Add a regression test, then consider raising that metric |
| Directory is renamed | Update glob and prove it matches with a known file |

Schedule a lightweight review when teams reorganize source folders, change coverage providers, upgrade Vitest, or alter transpilation. Capture the baseline report before and after. Differences may be legitimate, but they should be understood rather than absorbed through a hurried threshold reduction.

What people get wrong is treating the configured number as the quality policy. The actual policy is the combination of source inclusion, exclusions, glob scope, metric selection, test semantics, and CI enforcement. A high number with an incomplete source set is weak. A moderate branch target over a complete, risk-selected directory with meaningful assertions can be strong.

## Ratchet a legacy directory without freezing delivery

A new threshold policy often meets a directory with hundreds of untested branches. Blocking every pull request at an ideal target is not credible, but leaving the directory entirely ungated allows debt to grow. Establish a ratchet from a reproducible baseline.

First, run the complete suite on the main branch with the intended include and exclude patterns. Save the text summary and HTML report as review evidence. Confirm that deterministic reruns produce materially the same totals. If results drift, find environment-dependent tests before choosing a number.

Second, set each metric just below or at the verified baseline, using deliberate rounding. If branch coverage is 61.84 percent, a 61 percent gate leaves a small measurement margin while still rejecting a large decline. Do not round to 50 merely because it is visually tidy. For a maximum-uncovered budget, record the observed uncovered count and reduce it as tests land.

Third, assign improvement work by behavior rather than by colored line. A batch could cover refund eligibility, the next account lockout transitions, and the next warehouse timeout mapping. Each batch should assert outcomes, raise the relevant directory metric, and then tighten the threshold in the same change. This prevents later changes from consuming the gain.

| Ratchet stage | Repository change | Evidence reviewers need |
|---|---|---|
| Baseline | Explicit source include and honest exclusions | Report includes known untouched files |
| Initial gate | Threshold at stable current level | Repeated main-branch runs agree |
| Behavior batch | Focused tests for named rules | Assertions cover success and failure paths |
| Tightening | Raise percentage or lower uncovered budget | Before-and-after directory summary |
| Maintenance | Update on source reorganization | Glob still matches intended owners |

Avoid a separate scheduled job with tougher thresholds that nobody watches. If an aspirational report is useful, give it an owner and a visible trend, but keep the enforced pull-request gate truthful. A ratchet works because every accepted improvement becomes the new floor.

## Review exclusions as carefully as tests

Every exclusion changes the denominator and therefore deserves code-review scrutiny. Classify exclusions into generated output, declarations, unreachable platform variants, trivial re-export files, and temporary debt. Only the first few categories are normally durable.

A temporary exclusion needs an owner, explanation, and removal condition. For example, excluding an old adapter until its external service can run in a hermetic test environment is at least auditable. Excluding \`src/integrations/**\` because those tests fail in CI discards precisely the risk the directory policy was supposed to expose.

Barrel files are nuanced. An \`index.ts\` containing only exports may add noisy statements without behavior. An index that selects implementations, initializes telemetry, or conditionally exports platform code has behavior and should remain. Inspect contents instead of applying a universal \`**/index.ts\` exclusion without thought.

Generated code also needs a boundary test even when excluded from unit coverage. Validate generation in CI, compile the output, and exercise handwritten wrappers against representative contracts. Coverage exclusion means “this metric is not the right control,” not “this code cannot break.”

Ask reviewers to challenge any threshold reduction or exclusion expansion with three questions: Which files leave the measured set? Which risk is now controlled elsewhere? When will the exception be removed? That conversation is more valuable than arguing over a one-point percentage change.

Before merging the policy, run one controlled failure. Temporarily raise a single directory metric on a branch, confirm Vitest exits unsuccessfully, and verify CI marks the job failed while retaining the report. Revert the temporary value afterward. This proves the gate is connected to the pipeline, not merely present in a configuration file that another command ignores. Repeat this wiring check when test scripts, workspace projects, or coverage commands are reorganized.

## Frequently Asked Questions

### Do Vitest directory thresholds replace the global thresholds?

No. Glob-scoped files still contribute to Vitest's global coverage totals, and the scoped rule adds another check for the matched set. A billing directory can therefore pass its 95 percent line target while the overall project fails at 80 percent, or the project can pass globally while billing fails. This dual evaluation is useful: the global values prevent broad decline, while directory rules protect high-risk areas. Remember that metrics omitted from a scoped object are not automatically inherited as scoped thresholds, so list each metric the directory must explicitly satisfy.

### Why does a new untested file not lower my coverage?

The usual reason is that the file was never imported and the report is only considering files discovered during execution. Add an explicit \`coverage.include\` pattern for the maintained source extensions, then confirm the file appears at zero in the HTML report. Also inspect \`coverage.exclude\` for an overly broad match. Test-discovery \`exclude\` and coverage \`exclude\` solve different problems. A trustworthy percentage begins with the intended denominator, so resolve file selection before changing tests or lowering a threshold.

### Should I use line or branch coverage for each directory?

Use all four metrics as complementary signals, then emphasize the one tied to the directory's failure modes. Branch coverage is especially informative for permission rules, validation, pricing, fallbacks, and retries. Function coverage reveals unused handlers or strategies. Line and statement coverage provide a broad execution baseline. Avoid selecting only the easiest metric to raise. Inspect uncovered code and ask which observable behavior is missing. A small formatter may reasonably emphasize lines, while an authorization policy should demand strong branches and tests for both permitted and denied outcomes.

### Can an AI coding agent safely raise a failing coverage threshold?

It can help when the task includes behavioral constraints, but “make coverage pass” is underspecified. Give the agent the failing directory, uncovered report, domain invariants, prohibited network calls, and expected edge cases. Require it to add meaningful assertions and preserve production behavior. Review whether tests exercise outcomes or merely invoke lines, and run mutation or targeted negative checks when risk justifies them. The agent should not lower thresholds, widen exclusions, or mock the function under test unless you explicitly approve that policy change.
`,
};
