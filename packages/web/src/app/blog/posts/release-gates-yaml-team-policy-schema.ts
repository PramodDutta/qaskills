import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Make release-gates.yaml Team Policy',
  description:
    'Define a release gates yaml policy with owned thresholds, exact evidence rules, protected-branch enforcement, waiver controls, and reviewable changes.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'release gates yaml policy',
  keywords: [
    'release gates yaml policy',
    'release-gates.yaml schema',
    'quality gate team policy',
    'required CI checks',
    'changed line coverage gate',
    'release waiver policy',
    'branch protection quality gate',
    'machine-readable release policy',
  ],
  relatedSlugs: [
    'database-migration-rolling-deploy-compatibility-gate',
    'dependency-upgrade-changelog-api-usage-release-review',
    'machine-verifiable-no-go-release-report-json',
    'release-waiver-ownership-acceptance-contract',
  ],
  sources: [
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
    'https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates',
    'https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html',
  ],
  content: `A release gates yaml policy is the team's versioned agreement about which release evidence must exist, which thresholds pass, and which failures block. Store it beside the code, validate its exact schema, map every field to a named CI result, and require the evaluator on protected branches without letting automation approve releases.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) says gates come from team configuration rather than an agent's judgment. Its companion reference supplies the complete field vocabulary used here. The [QASkills directory](/skills) offers focused skills for producing test, coverage, data, and security evidence consumed by those gates.

## Treat the File as an Executable Agreement

A gate file is useful only when contributors can predict its effect. Every field needs a stable name, defined failure condition, evidence producer, owner, and enforcement path. A threshold copied into a wiki or workflow conditional can drift from the file and create two contradictory release bars.

The policy does not decide whether a feature is valuable or whether commercial urgency justifies risk. It defines what evidence the team requires before a human release decision. The Guardian evaluates that evidence and recommends GO, GO_WITH_WAIVERS, or NO_GO. It never merges, deploys, tags, or grants formal approval.

Keep the release gates yaml policy in the repository root unless the build system has a clear shared-policy location. Review changes through pull requests, apply ordinary code ownership, and include policy diffs in release scope. A pull request that weakens a threshold is a process change, not routine configuration noise.

Separate policy from implementation. The file says \`type_errors: 0\`; a workflow job runs the repository's type checker and emits evidence. The evaluator compares result with threshold. This design lets teams replace a tool without renaming the meaning of the gate.

SonarQube describes quality gates as sets of conditions measured against code during analysis in its [quality-gate documentation](https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates). The repository contract follows the same policy-versus-measurement separation while covering test execution, changed-line coverage, static checks, migration evidence, and human review.

Avoid boolean fields whose evidence cannot be inspected. \`risk_map_reviewed: true\` has a defined failure condition: no human acknowledgment recorded in the pull request. A vague field such as \`quality_ok: true\` cannot tell an evaluator what to collect, why it failed, or how to reach GO.

The [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) can present the resulting evidence to humans. The YAML file remains the normative threshold source, while the scorecard and JSON report are views of one evaluated result.

## Use the Exact Repository Gate Vocabulary

Start with the full contract rather than inventing aliases. Exact names allow one validator, evaluator, and report schema to agree across repositories and workflows.

\`\`\`yaml
gates:
  tests:
    required_suites: [unit, integration, e2e-smoke]
    flake_policy: quarantine-lane   # quarantine-lane | zero-tolerance | rerun-once
    max_new_skips: 0
  coverage:
    changed_line_blockers: 0
    changed_line_min_pct: 80
  static:
    lint_errors: 0
    type_errors: 0
    new_security_findings: 0
  data:
    migration_rollback_documented: true
    destructive_migration_requires_waiver: true
  process:
    risk_map_reviewed: true
    max_diff_lines: 2000
\`\`\`

\`required_suites\` fails when a listed suite is missing, red, or not run at the judged HEAD. \`max_new_skips\` concerns skips added by the diff, not a hidden count of historical skips. \`changed_line_blockers\` limits uncovered changed lines classified as blocker risk, while the optional percentage sets a broader execution floor.

\`new_security_findings\` is a delta against the base from the repository's scanner. It is not a claim that no historical finding exists. \`migration_rollback_documented\` fails when a migration lacks a down path or deploy note. \`risk_map_reviewed\` requires named human acknowledgment rather than an agent setting a Boolean.

\`max_diff_lines\` defines an honest-analysis budget. The assigned skill recommends splitting a larger source diff rather than pretending it was reviewed completely. Generated, lockfile, and vendored changes can be listed separately, but they remain visible in the report with their exclusion reason.

The chosen \`flake_policy\` must be one of the three declared values. Under \`quarantine-lane\`, a non-quarantined failure blocks, while quarantined failures remain reported. Under \`zero-tolerance\`, failures block. Under \`rerun-once\`, the implementation may rerun according to policy, but it still records both attempts and classification.

A release gates yaml policy should not rename \`changed_line_blockers\` to \`coverage_failures\` merely because one CI provider uses that label. Translate provider output at the adapter boundary. Stable domain names make reports portable and stop vendor configuration from defining team intent.

Document the release gates yaml policy evaluation order as well. Validate configuration first, verify producer registration second, inspect fresh evidence third, and derive the report last. This order prevents a malformed threshold from being mistaken for an ordinary failed test.

## Define Failure Semantics and Evidence Together

For every field, write one sentence describing failure and one sentence describing acceptable evidence. The companion reference already provides failure semantics for the main fields. Add repository-specific artifact locations and job names without changing those meanings.

| Policy field | Fails when | Minimum concrete evidence |
|---|---|---|
| \`tests.required_suites\` | Any named suite is missing, red, or stale | Suite name, run ID, result, HEAD SHA |
| \`tests.max_new_skips\` | Diff adds skips beyond limit | Diff locations and counted additions |
| \`coverage.changed_line_blockers\` | Blocker gaps exceed threshold | File, lines, surface, reason, coverage artifact |
| \`static.type_errors\` | Type errors exceed threshold | Tool result and run ID at HEAD |
| \`static.new_security_findings\` | New findings exceed threshold | Base and HEAD scanner artifact |
| \`data.migration_rollback_documented\` | Migration lacks down path or deploy note | Migration ID and document path |
| \`process.risk_map_reviewed\` | No named acknowledgment exists | Reviewer identity and pull request event |
| \`process.max_diff_lines\` | Source diff exceeds analysis budget | Count command, base, HEAD, exclusions |

Evidence must identify artifacts rather than restate status. "Tests passed" cannot be traced. "Unit run #882 at \`head_sha=abc1234\` passed" gives the consumer a run and revision. A blocker should name a file range, migration, or failed run rather than a general concern.

Freshness is part of every gate even though it is not repeated under each field. The report contract declares stale artifacts invalid by definition. A new commit means suite, coverage, scanner, and review evidence must be checked against the new \`head_sha\`; an evaluator cannot assume relevance.

Use the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) to classify user-facing surfaces, then keep classifications in the report. High-risk money, authentication, data-shape, and public-contract branches can become blocker coverage gaps. Do not invent risk scores unsupported by repository policy.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) can produce the selected-test evidence. Selection accelerates feedback, but the gate still runs every required suite. A selector returning no tests for a medium or high change is a coverage finding rather than an automatic pass.

When an adapter cannot produce required evidence, fail closed. "Coverage unknown" and "suite not run" produce NO_GO under the Guardian's two governing rules. This keeps tool outages and parsing errors visible instead of converting them into green statuses.

## Assign Owners and Review Policy Changes

Ownership should follow evidence expertise. Test-platform maintainers may own suite adapters, security engineers may own scanner delta interpretation, database owners may own migration evidence, and repository maintainers may own schema validation. Human release ownership remains separate from tool ownership.

Create a review matrix for policy changes:

| Change type | Required reviewer knowledge | Main review question |
|---|---|---|
| Add or remove required suite | Test architecture and runtime | Does the suite cover a declared release behavior? |
| Change coverage threshold | Coverage collection and risk classification | Can the metric be reproduced at changed lines? |
| Change flake policy | Test reliability and quarantine process | Are failures still visible and owned? |
| Change security delta | Security scanner and baseline | Does the adapter compare the same base and HEAD? |
| Change migration rule | Database deployment and recovery | Is old-code tolerance still required and evidenced? |
| Change analysis budget | Repository structure and review capacity | Can reviewers honestly inspect the larger scope? |

Do not permit the same workflow that fails a gate to edit the policy and rerun itself. Policy changes should require ordinary pull-request review and protected-branch controls. This reduces the chance that untrusted code weakens its own enforcement path.

OWASP identifies insufficient flow control mechanisms, inadequate identity and access management, poisoned pipeline execution, and insufficient pipeline-based access controls in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Apply least privilege to policy readers, check writers, artifact stores, and branch-setting credentials.

Record the reason for every threshold change in the pull request. Avoid unsupported claims such as "80 is industry standard." In this contract, 80 is an optional starter value for changed lines, while blocker gaps remain zero. A team may choose another percentage after reviewing its own risk and collection quality.

The [dependency upgrade review guide](/blog/dependency-upgrade-changelog-api-usage-release-review) shows why configuration changes and dependencies are medium risk by default, with higher treatment for secrets or deployment. A policy-parser dependency update should receive that same evidence-based review.

Policy versioning can use repository history and schema versions. Do not add a version field unless consumers define its semantics. The commit SHA already identifies the exact file evaluated; a separate schema version becomes useful when validators support controlled contract evolution.

## Validate YAML Before Evaluating Results

Parsing success is not schema validity. A misspelled \`required_suite\` key can be valid YAML while silently escaping an evaluator that ignores unknown fields. The validator should reject unknown keys, missing required sections, invalid enum values, negative counts, percentages outside their allowed range, and duplicate suite names.

The following TypeScript uses Zod to encode the assigned contract. It is intentionally strict so a policy typo fails before any release evidence runs.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';

const nonNegativeInteger = z.number().int().min(0);

const releaseGatesSchema = z
  .object({
    gates: z
      .object({
        tests: z
          .object({
            required_suites: z.array(z.string().min(1)).min(1),
            flake_policy: z.enum(['quarantine-lane', 'zero-tolerance', 'rerun-once']),
            max_new_skips: nonNegativeInteger,
          })
          .strict(),
        coverage: z
          .object({
            changed_line_blockers: nonNegativeInteger,
            changed_line_min_pct: z.number().min(0).max(100).optional(),
          })
          .strict(),
        static: z
          .object({
            lint_errors: nonNegativeInteger,
            type_errors: nonNegativeInteger,
            new_security_findings: nonNegativeInteger,
          })
          .strict(),
        data: z
          .object({
            migration_rollback_documented: z.boolean(),
            destructive_migration_requires_waiver: z.boolean(),
          })
          .strict(),
        process: z
          .object({
            risk_map_reviewed: z.boolean(),
            max_diff_lines: z.number().int().positive(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const source = await readFile('release-gates.yaml', 'utf8');
const parsed = releaseGatesSchema.parse(parse(source));

const suites = parsed.gates.tests.required_suites;
if (new Set(suites).size !== suites.length) {
  throw new Error('required_suites contains duplicate names');
}

process.stdout.write(JSON.stringify(parsed, null, 2));
\`\`\`

Schema validity does not prove the policy is enforceable. After parsing, check that every required suite maps to exactly one registered producer. Check that static and coverage adapters declare output paths. Check that the report evaluator understands every configured field.

Do not silently apply defaults for omitted gate fields unless the contract defines them. The assigned reference gives a full file and describes one percentage as optional, but the other fields should appear explicitly. Visible policy is easier to review than behavior supplied inside a validator package.

Test the validator with valid policy, each unknown key, each missing section, out-of-range values, empty suites, duplicate suites, and malformed YAML. Also test evaluator behavior when an adapter is missing. These cases protect the policy boundary before application tests begin.

Build fixtures by changing one semantic at a time. A misspelled gate proves unknown-key rejection; a negative threshold proves range validation; a stale suite artifact proves freshness handling. Single-purpose fixtures make failures explainable and prevent one malformed document from claiming coverage of several rules.

Then add interaction fixtures. Combine a failed suite with an accepted waiver and confirm the verdict remains NO_GO. Combine zero blocker gaps with one waiverable gap and confirm ownership controls GO_WITH_WAIVERS. Combine complete passing evidence with an inconsistent producer verdict and confirm independent derivation rejects it.

For the release gates yaml policy, test producer registration as policy behavior rather than deployment wiring. Every required suite should resolve to one producer, every configured metric should resolve to one adapter, and duplicate identities should fail. A newly valid YAML field cannot become enforceable until that registry and the report consumer understand it.

Preserve validation diagnostics as artifacts. Report the policy path, JSON-style field path, rejected value category, validator version, and HEAD without printing secrets from unrelated configuration. A contributor should know whether to fix YAML syntax, contract shape, missing evidence, or the measured code result.

Run these fixtures whenever the schema, YAML parser, validator library, adapter registry, or verdict logic changes. Ordinary application tests cannot protect policy interpretation if they never load malformed or contradictory release inputs.

Include fixture names in validator diagnostics so maintainers can connect each failed regression case to its contract rule and responsible evidence adapter.

The [machine-verifiable NO-GO report guide](/blog/machine-verifiable-no-go-release-report-json) applies the same strictness to output. Validate policy first, evidence second, and report consistency last. A parser exception should produce a terminal failed check with a clear file location.

## Map Every Gate to a Unique CI Producer

Create a registry that maps domain fields to workflow jobs and artifact parsers. Avoid deriving identity from display text that contributors can change casually. Stable suite IDs such as \`unit\`, \`integration\`, and \`e2e-smoke\` should map to unique CI jobs with terminal results.

\`\`\`yaml
name: release-policy

on:
  pull_request:

jobs:
  validate-policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm release-gates:validate

  evaluate-release:
    needs: [validate-policy, unit, integration, e2e-smoke]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm release-gates:evaluate --head "$GITHUB_SHA"
      - uses: actions/upload-artifact@v4
        with:
          name: release-readiness-report
          path: artifacts/release-report.json
\`\`\`

This workflow fragment assumes the named suite jobs exist elsewhere in the same workflow. The evaluator uses \`if: always()\` so it can report missing or failed dependencies rather than staying skipped. Its implementation must still fail when required evidence is absent; \`always()\` is scheduling behavior, not a verdict.

Give every check a unique name. GitHub warns that duplicate job names across workflows can create ambiguous required status results in its [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches). A stable \`release/policy-evaluator\` result is easier to protect than several similarly named jobs.

Adapters should produce normalized evidence with \`head_sha\`, run ID, status, and artifact reference. The evaluator rejects an adapter whose SHA differs. Never let the adapter set the final verdict; it reports one measurement, and the central evaluator applies team policy.

The [GitHub Actions testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers checkout, dependency installation, artifacts, and test jobs. Keep the policy evaluator small and deterministic. It should not rerun all tools internally when their dedicated jobs already produce signed or trusted artifacts.

Handle non-applicable gates explicitly. A pull request with no migration can pass the rollback-documentation gate with evidence such as "diff inventory found no migration files at HEAD." It should not omit the gate result, because omission is indistinguishable from evaluator failure.

## Enforce Policy With Branch Protection

Validation and evaluation matter only when the merge path honors them. GitHub allows protected branches to require status checks before merge and, where configured, identify the expected app source. It also supports requiring reviews and applying protections to administrators through branch settings described in the same official documentation.

Require one aggregate policy status after its producers are reliable. Individual suite checks may also remain required, but the aggregate report adds coverage gaps, migration evidence, risk review, and waiver consistency. Document which check is normative so contributors do not interpret a green subset as release readiness.

The release gates yaml policy check should fail closed for malformed config, missing producers, stale artifacts, failed gates, invalid waivers, or inconsistent verdicts. It should produce a successful terminal status when no relevant change exists and every applicable gate passes. Avoid workflow path filters that prevent the required check from appearing.

Expose the release gates yaml policy revision in the report by citing its commit SHA and path. Reviewers can then distinguish a measurement change from a policy change when identical evidence produces a different verdict after thresholds evolve.

Protect the check-writing identity. A pull request should not be able to replace the trusted evaluator with a script that always exits zero while retaining the same status source. Repository rules, workflow review, environment controls, and app-source restrictions should match the platform's available features.

Branch protection is not a release command. Passing required checks allows an authorized human or process to continue according to repository policy. The Guardian still does not merge or deploy. Keep that separation visible in check wording and operator runbooks.

The [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) demonstrates a specialized evidence producer for the data fields. Its matrix report can feed the central evaluator without introducing a second source of policy.

## Govern Waivers and Policy Evolution

The report contract permits GO_WITH_WAIVERS only when every waiver has a non-null owner and \`accepted: true\`. It does not allow a producer to relabel a blocker as waiverable. Classification comes from changed-line risk and committed team policy.

Keep waiver data in the report, not in \`release-gates.yaml\`. The file defines whether a class requires or permits a waiver; a report names the specific item, owner, and acceptance for one judged SHA. Mixing instances into policy would make the policy file change for every release.

The sibling guide on [release waiver ownership](/blog/release-waiver-ownership-acceptance-contract) explains the acceptance contract. A debug-log coverage gap may be waiverable, while a failed required suite, missing evidence, stale artifact, or blocker-class gap remains NO_GO under the assigned rules.

Change policy through an ordered process:

1. Open a pull request containing the policy and validator changes together.
2. Explain the old and new failure semantics with sample evidence.
3. Run the validator against both valid and invalid fixtures.
4. Confirm every evaluator and report consumer supports the new schema.
5. Obtain review from the owners of affected evidence and enforcement.
6. Merge through the same protected path the policy governs.

When retiring a field, keep consumers synchronized. A transition can support two schema versions only when selection is explicit and tested. Silently ignoring an unknown old or new field is unsafe because the apparent policy may differ from enforced behavior.

The [dependency API usage review](/blog/dependency-upgrade-changelog-api-usage-release-review) should cover validator-library upgrades. A parsing or validation change can alter policy interpretation, so map the exact APIs used and run malformed-input cases before accepting it.

## Roll Out the Policy With a Concrete Baseline

Inventory existing CI before enabling a required aggregate check. Map current suites, coverage artifacts, scanner outputs, migration paths, and review events to contract fields. Missing adapters should initially produce visible NO_GO reports in an observation branch, not silent passes.

Commit the full starter file, strict validator, adapter registry, report schema, and human documentation together. Run them on representative feature, migration, dependency, test-only, and documentation pull requests. Verify that every path reaches a terminal, explainable status.

After the observation runs are accurate, require the unique evaluator on the protected branch. Track failures by gate name and remediation, not as a score to optimize. If one field creates false results, fix its evidence adapter or semantics through review rather than bypassing the entire policy.

Use the exact term release gates yaml policy in team documentation and check descriptions so contributors can locate the source file. Keep examples synchronized with the validator. A copied wiki snippet should link back to the committed file rather than becoming a second editable version.

Test the release gates yaml policy against realistic evidence bundles before enforcement. Include one complete pass, one failure per gate family, one missing adapter, one stale artifact, and one invalid waiver so diagnostics remain useful under every terminal verdict.

For a first implementation, install the [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian), commit the exact gate vocabulary, and connect its JSON report to one protected status. That real QASkills route provides the evidence-first workflow and guardrails used by this policy.

## Frequently Asked Questions

### Why store release policy in YAML beside code?

Repository storage makes thresholds, reviews, and history visible with the changes they govern. YAML is only the serialization; strict validation supplies the contract. The important property is one versioned source consumed by CI, not the filename alone. Human release authority remains outside the file.

### Can a team change the starter thresholds?

Yes. The starter values are proposed defaults, not universal facts. Change them through reviewed policy with defined failure semantics, evidence adapters, validator tests, and updated consumers. Do not weaken a threshold inside one workflow run or claim an unsupported number is an external standard.

### Should every CI job become a required suite?

No. \`required_suites\` should name suites the team requires for release readiness. Formatting, documentation, packaging, or environment jobs can remain separate required checks when appropriate. Each listed suite must have exactly one identifiable producer and fresh evidence at the judged HEAD.

### What if a pull request has no database migration?

Emit an applicable pass result with evidence that the diff inventory found no migration. Do not omit the data gate entirely, because omission can also mean the adapter failed. If a migration exists, require a down path or deploy note according to the exact contract.

### How are flaky failures handled by the policy?

Use the configured \`flake_policy\` and retain every attempt. Quarantine-lane failures remain reported, while non-quarantined failures block. A rerun-once policy records both runs and still needs classification. Repeated execution without diagnosis must not convert a required failure into unexplained green evidence.

### Can administrators bypass the aggregate release check?

That depends on configured repository protections and authorized bypass roles. GitHub provides settings that can apply protections to administrators, but teams must configure them intentionally. Regardless of platform bypass, the Guardian report remains evidence and never grants approval, merges code, or initiates deployment.
`,
};
