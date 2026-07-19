import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Release Gates YAML Policy Guide',
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
  content: `A release gates yaml policy is the team's versioned rule set defining which release proof must exist, which measurements meet their limits, and which failures block. Store it beside the code, check its exact schema, map each field to a named CI result, and require the checker on protected branches without letting automation approve releases.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) says gates come from team config rather than an agent's judgment. Its companion reference supplies the complete field vocabulary used here. The [QASkills directory](/skills) offers focused skills for producing test, test reach, data, and safety proof consumed by those gates.

## Why Use a Quality Gate Team Policy?

A gate file is useful only when authors can predict its effect. Each field needs a stable name, defined failure condition, proof job, owner, and enforcement path. A limit copied into a wiki or workflow conditional can drift from the file and create two contradictory release bars.

The rule set does not decide whether a feature is valuable or whether commercial urgency justifies risk. It defines what proof the team requires before a human release decision. The Guardian checks that proof and recommends GO, GO_WITH_WAIVERS, or NO_GO. It never merges, deploys, tags, or grants formal approval.

Keep the release gates yaml policy in the repo root unless the build system has a clear shared-rule set location. Review changes through pull requests, require code-owner review, and include rule-set diffs in release scope. A pull request that weakens a limit is a process change, not routine config noise.

Separate rule set from setup. The file says \`type_errors: 0\`; a workflow job runs the repo's type checker and emits proof. The checker compares result with limit. This design lets teams replace a tool without renaming the meaning of the gate.

SonarQube describes quality gates as sets of conditions measured against code during analysis in its [quality-gate documentation](https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates). The repo contract follows the same rule set-versus-measurement separation while covering test execution, changed-line test reach, static checks, schema change proof, and human review.

Avoid boolean fields whose proof cannot be inspected. \`risk_map_reviewed: true\` has a defined failure condition: no human acknowledgment recorded in the pull request. A vague field such as \`quality_ok: true\` cannot tell a checker what to collect, why it failed, or how to reach GO.

The [release readiness scorecard](/blog/ai-release-readiness-scorecard-2026) can present the resulting proof to humans. The YAML file remains the normative limit source, while the scorecard and JSON report are views of one evaluated result.

## What Must a release-gates.yaml Schema Define?

Start with the full contract rather than inventing aliases. Exact names allow one policy file, checker, and report schema to agree across repos and workflows.

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

\`new_security_findings\` is a delta against the base from the repo's scanner. It is not a claim that no historical finding exists. \`migration_rollback_documented\` fails when a schema change lacks a down path or deploy note. \`risk_map_reviewed\` requires named human acknowledgment rather than an agent setting a Boolean.

\`max_diff_lines\` defines an honest-analysis budget. The assigned skill recommends splitting a larger source diff rather than pretending it was reviewed completely. Generated, lockfile, and vendored changes can be listed separately, but they remain visible in the report with their exclusion reason.

The chosen \`flake_policy\` must be one of the three declared values. Under \`quarantine-lane\`, a non-quarantined failure blocks, while quarantined failures remain reported. Under \`zero-tolerance\`, failures block. Under \`rerun-once\`, the setup may rerun according to rule set, but it still records both attempts and classification.

A release gates yaml policy should not rename \`changed_line_blockers\` to \`coverage_failures\` merely because one CI provider uses that label. Translate provider output at the bridge boundary. Stable domain names make reports portable and stop vendor config from defining team intent.

Document the release gates yaml policy check order as well. Check config first, verify job registration second, inspect fresh proof third, and derive the report last. This order prevents a malformed limit from being mistaken for a normal failed test.

## How Should a Machine-Readable Release Policy Define Failure?

For each field, write one sentence describing failure and one sentence describing acceptable proof. The companion reference already provides failure meaning for the main fields. Add repository-specific file locations and job names without changing those meanings.

| Rule set field | Fails when | Minimum clear proof |
|---|---|---|
| \`tests.required_suites\` | Any named suite is missing, red, or stale | Suite name, run ID, result, HEAD SHA |
| \`tests.max_new_skips\` | Diff adds skips beyond limit | Diff locations and counted additions |
| \`coverage.changed_line_blockers\` | Blocker gaps exceed limit | File, lines, surface, reason, test reach file |
| \`static.type_errors\` | Type errors exceed limit | Tool result and run ID at HEAD |
| \`static.new_security_findings\` | New findings exceed limit | Base and HEAD scanner file |
| \`data.migration_rollback_documented\` | Schema change lacks down path or deploy note | Schema change ID and document path |
| \`process.risk_map_reviewed\` | No named acknowledgment exists | Reviewer identity and pull request event |
| \`process.max_diff_lines\` | Source diff exceeds analysis budget | Count command, base, HEAD, exclusions |

Proof must find files rather than restate status. "Tests passed" cannot be traced. "Unit run #882 at \`head_sha=abc1234\` passed" gives the consumer a run and revision. A blocker should name a file range, schema change, or failed run rather than a general concern.

Freshness is part of each gate even though it is not repeated under each field. The report contract declares stale files bad by rule. A new commit means suite, test reach, scanner, and review proof must be checked against the new \`head_sha\`; a checker cannot assume relevance.

Use the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) to classify user-facing surfaces, then keep classifications in the report. High-risk money, authentication, data-shape, and public-contract branches can become blocker test reach gaps. Do not invent risk scores unsupported by repo rule set.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) can produce the chosen-test proof. Selection accelerates feedback, but the gate still runs each required suite. A selector returning no tests for a medium or high change is a test reach finding rather than an automatic pass.

When a bridge cannot produce required proof, fail closed. "Test reach unknown" and "suite not run" produce NO_GO under the Guardian's two governing rules. This keeps tool outages and parsing errors visible instead of converting them into green statuses.

## Who Owns a Release Waiver Policy?

Ownership should follow proof expertise. A test-platform team may own suite bridges, security engineers may own scanner delta interpretation, database owners may own schema-change proof, and the repository team may own schema validation. The human release owner remains separate from each tool owner.

Create a review matrix for rule set changes:

| Change type | Required reviewer knowledge | Main review question |
|---|---|---|
| Add or remove required suite | Test architecture and runtime | Does the suite cover a declared release path? |
| Change test reach limit | Test reach collection and risk classification | Can the metric be reproduced at changed lines? |
| Change flake rule set | Test reliability and quarantine process | Are failures still visible and owned? |
| Change safety delta | Safety scanner and baseline | Does the bridge compare the same base and HEAD? |
| Change schema change rule | Database deployment and recovery | Is old-code tolerance still required and evidenced? |
| Change analysis budget | Repo structure and review capacity | Can reviewers honestly inspect the larger scope? |

Do not permit the same workflow that fails a gate to edit the rule set and rerun itself. Rule set changes should require normal pull-request review and protected-branch controls. This reduces the chance that untrusted code weakens its own enforcement path.

OWASP lists Insufficient Flow Control Mechanisms, Inadequate Identity and Access Management, Poisoned Pipeline Execution, and Insufficient PBAC (Pipeline-Based Access Controls) in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Apply least privilege to rule set readers, check writers, file stores, and branch-setting credentials.

Record the reason for each limit change in the pull request. Avoid unsupported claims such as "80 is industry standard." In this contract, 80 is an optional starter value for changed lines, while blocker gaps remain zero. A team may choose another percentage after reviewing its own risk and collection quality.

The [dependency upgrade review guide](/blog/dependency-upgrade-changelog-api-usage-release-review) shows why config changes and dependencies are medium risk by default, with higher treatment for secrets or deployment. A rule set-parser dependency update should receive that same proof-based review.

Rule set versioning can use repo history and schema versions. Do not add a version field unless consumers define its meaning. The commit SHA already finds the exact file evaluated; a separate schema version becomes useful when checkers support controlled contract evolution.

## How Do You Check a Changed Line Coverage Gate?

Parsing success is not schema validity. A misspelled \`required_suite\` key can be valid YAML while silently escaping a checker that ignores unknown fields. The checker should reject unknown keys, missing required sections, bad enum values, negative counts, percentages outside their allowed range, and repeated suite names.

The following TypeScript uses Zod to encode the assigned contract. It is intentionally strict so a rule set typo fails before any release proof runs.

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

Schema validity does not prove the rule set is enforceable. After parsing, check that each required suite maps to exactly one registered job. Check that static and test reach bridges declare output paths. Check that the report checker understands each set field.

Do not silently apply defaults for omitted gate fields unless the contract defines them. The assigned reference gives a full file and describes one percentage as optional, but the other fields should appear clearly. Visible rule set is easier to review than logic hidden inside a checker package.

Test the checker with valid rule set, each unknown key, each missing section, out-of-range values, empty suites, repeated suites, and malformed YAML. Also test checker behavior when a bridge is missing. These cases protect the rule set boundary before application tests begin.

Build fixtures by changing one rule at a time. A misspelled gate proves unknown-key rejection, a negative limit proves range validation, and a stale suite file proves freshness handling. Single-purpose fixtures make failures explainable and prevent one malformed document from appearing to test several rules.

Then add interaction fixtures. Combine a failed suite with an accepted waiver and confirm the verdict remains NO_GO. Combine zero blocker gaps with one waiverable gap and confirm owner controls GO_WITH_WAIVERS. Combine complete passing proof with a mismatched job verdict and confirm separate derivation rejects it.

For the release gates yaml policy, test job registration as rule enforcement rather than deployment wiring. Each required suite should resolve to one job, each set metric should resolve to one bridge, and repeated identities should fail. A newly valid YAML field cannot become enforceable until that registry and the report consumer understand it.

Preserve checker error text as files. Report the rule set path, JSON-style field path, rejected value category, checker version, and HEAD without printing secrets from unrelated config. An author should know whether to fix YAML syntax, contract shape, missing proof, or the measured code result.

Run these fixtures whenever the schema, YAML parser, checker library, bridge registry, or verdict logic changes. Normal application tests cannot protect rule set interpretation if they never load malformed or contradictory release inputs.

Include fixture names in checker error text so the team can link each failed case to its rule and proof bridge. This context makes the next fix clear.

The [machine-verifiable NO-GO report guide](/blog/machine-verifiable-no-go-release-report-json) applies the same strictness to output. Check rule set first, proof second, and report match last. A parser exception should produce a final failed check with a clear file location.

## How Do Required CI Checks Map to Gate Jobs?

Create a registry that maps domain fields to workflow jobs and file parsers. Avoid deriving identity from display text that authors can change casually. Stable suite IDs such as \`unit\`, \`integration\`, and \`e2e-smoke\` should map to unique CI jobs with final results.

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

  check-release:
    needs: [validate-policy, unit, integration, e2e-smoke]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm release-gates:check --head "$GITHUB_SHA"
      - uses: actions/upload-artifact@v4
        with:
          name: release-readiness-report
          path: artifacts/release-report.json
\`\`\`

This workflow fragment assumes the named suite jobs exist elsewhere in the same workflow. The checker uses \`if: always()\` so it runs after both successful and failed dependencies and can report missing proof. Its setup must still fail when required proof is absent; \`always()\` controls scheduling, not the verdict.

Give each check a unique name. GitHub warns that repeated job names across workflows can create ambiguous required status results in its [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches). A stable \`release/policy-evaluator\` result is easier to protect than several similarly named jobs.

Bridges should produce normalized proof with \`head_sha\`, run ID, status, and file reference. The checker rejects a bridge whose SHA differs. Never let the bridge set the final verdict; it reports one measurement, and the central checker applies team rule set.

The [GitHub Actions testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers checkout, dependency installation, files, and test jobs. Keep the rule set checker small and deterministic. It should not rerun all tools internally when their dedicated jobs already produce signed or trusted files.

Handle non-applicable gates clearly. A pull request with no schema change can pass the rollback-docs gate with proof such as "diff inventory found no schema change files at HEAD." It should not omit the gate result, because omission is indistinguishable from checker failure.

## How Does a Branch Protection Quality Gate Enforce Rules?

Policy checks matter only when the merge path enforces them. GitHub allows protected branches to require status checks before merge and, where configured, require an expected app source. It also supports required reviews and settings that apply protections to administrators, as described in the same official documentation.

Require one aggregate rule set status after its jobs are reliable. Individual suite checks may also remain required, but the aggregate report adds test reach gaps, schema change proof, risk review, and waiver match. Document which check is normative so authors do not interpret a green subset as release readiness.

The release gates yaml policy check should fail closed for malformed config, missing jobs, stale files, failed gates, bad waivers, or mismatched verdicts. It should produce a passing final status when no relevant change exists and each applicable gate passes. Avoid workflow path filters that prevent the required check from appearing.

Expose the release gates yaml policy revision in the report by citing its commit SHA and path. Reviewers can then distinguish a measurement change from a rule set change when identical proof produces a different verdict after limits evolve.

Protect the check-writing identity. A pull request should not be able to replace the trusted checker with a script that always exits zero while retaining the same status source. Repo rules, workflow review, environment controls, and app-source restrictions should match the platform's available features.

Branch protection is not a release command. Passing required checks allows an authorized human or process to continue according to repo rule set. The Guardian still does not merge or deploy. Keep that separation visible in check wording and operator runbooks.

The [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) demonstrates a specialized proof job for the data fields. Its matrix report can feed the central checker without introducing a second source of rule set.

## Govern Waivers and Rule set Evolution

The report contract permits GO_WITH_WAIVERS only when each waiver has a non-null owner and \`accepted: true\`. It does not allow a job to relabel a blocker as waiverable. Classification comes from changed-line risk and committed team rule set.

Keep waiver data in the report, not in \`release-gates.yaml\`. The file defines whether a class requires or permits a waiver; a report names the exact item, owner, and acceptance for one judged SHA. Mixing instances into rule set would make the rule set file change for each release.

The sibling guide on [release waiver ownership](/blog/release-waiver-ownership-acceptance-contract) explains the acceptance contract. A debug-log test reach gap may be waiverable, while a failed required suite, missing proof, stale file, or blocker-class gap remains NO_GO under the assigned rules.

Change rule set through an ordered process:

1. Open a pull request containing the rule set and checker changes together.
2. Explain the old and new failure meaning with sample proof.
3. Run the checker against both valid and bad fixtures.
4. Confirm each checker and report consumer supports the new schema.
5. Obtain review from the owners of affected proof and enforcement.
6. Merge through the same protected path the rule set governs.

When retiring a field, keep consumers synchronized. A transition can support two schema versions only when selection is explicit and tested. Silently ignoring an unknown old or new field is unsafe because the apparent rule set may differ from enforced behavior.

The [dependency API usage review](/blog/dependency-upgrade-changelog-api-usage-release-review) should cover checker-library upgrades. A parsing or check change can alter rule set interpretation, so map the exact APIs used and run malformed-input cases before accepting it.

## Roll Out the Rule set With a Clear Baseline

Inventory existing CI before enabling a required aggregate check. Map current suites, test reach files, scanner outputs, schema change paths, and review events to contract fields. Missing bridges should initially produce visible NO_GO reports in an observation branch, not silent passes.

Commit the full starter file, strict checker, bridge registry, report schema, and human docs together. Run them on sample feature, schema change, dependency, test-only, and docs pull requests. Verify that each path reaches a final, explainable status.

After the observation runs are accurate, require the unique checker on the protected branch. Track failures by gate name and fix, not as a score to optimize. If one field creates false results, fix its proof bridge or meaning through review rather than bypassing the entire rule set.

Roll out one gate family at a time when the current CI is hard to map. Start with named test suites, prove that pass, fail, skip, and missing states all reach the checker, then add coverage and data gates. Keep the full target file in review so no temporary gap is mistaken for the final rule set.

Use the exact term release gates yaml policy in team docs and check descriptions so authors can locate the source file. Keep examples synchronized with the checker. A copied wiki snippet should link back to the committed file rather than becoming a second editable version.

Test the release gates yaml policy against realistic proof bundles before enforcement. Include one complete pass, one failure per gate family, one missing bridge, one stale file, and one bad waiver so error text remains useful under each final verdict.

For a first setup, install the [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian), commit the exact gate vocabulary, and connect its JSON report to one protected status. That real QASkills route provides the proof-first workflow and guardrails used by this rule set.

## Frequently Asked Questions

### Why store release rule set in YAML beside code?

Repo storage makes limits, reviews, and history visible with the changes they govern. YAML is only the serialization; strict check supplies the contract. The important property is one versioned source consumed by CI, not the filename alone. Human release authority remains outside the file.

### Can a team change the starter limits?

Yes. The starter values are proposed defaults, not universal facts. Change them through reviewed rule set with defined failure meaning, proof bridges, checker tests, and updated consumers. Do not weaken a limit inside one workflow run or claim an unsupported number is an external standard.

### Should each CI job become a required suite?

No. \`required_suites\` should name suites the team requires for release readiness. Formatting, docs, packaging, or environment jobs can remain separate required checks when appropriate. Each listed suite must have exactly one identifiable job and fresh proof at the judged HEAD.

### What if a pull request has no database schema change?

Emit an applicable pass result with proof that the diff inventory found no schema change. Do not omit the data gate entirely, because omission can also mean the bridge failed. If a schema change exists, require a down path or deploy note according to the exact contract.

### How are flaky failures handled by the rule set?

Use the set \`flake_policy\` and retain each attempt. Quarantine-lane failures remain reported, while non-quarantined failures block. A rerun-once rule set records both runs and still needs classification. Repeated execution without diagnosis must not convert a required failure into unexplained green proof.

### Can administrators bypass the aggregate release check?

That depends on set repo protections and authorized bypass roles. GitHub provides settings that can apply protections to administrators, but teams must configure them intentionally. Regardless of platform bypass, the Guardian report remains proof and never grants approval, merges code, or initiates deployment.
`,
};
