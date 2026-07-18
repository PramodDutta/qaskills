import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Empty Related-Test Sets Block Releases',
  description:
    'Treat an empty related test set as missing release evidence, apply fail-closed risk gates, and issue an auditable NO-GO verdict before approval.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'empty related test set',
  keywords: [
    'empty related test set',
    'related test selection',
    'fail closed release gate',
    'Jest findRelatedTests',
    'Vitest related tests',
    'release evidence',
    'NO-GO verdict',
    'test impact analysis',
  ],
  relatedSlugs: [
    'changed-line-coverage-diff-hunks-gate',
    'uncovered-changed-lines-blocker-waiver-debt',
    'git-diff-behavior-risk-blast-radius-map',
    'deleted-tests-weakened-assertions-release-risk',
  ],
  sources: [
    'https://jestjs.io/docs/cli',
    'https://vitest.dev/guide/cli',
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
  ],
  content: `
An empty related test set must block a release whenever the diff changes Medium or High risk behavior, because the selector produced no evidence that relevant behavior was exercised. A zero result can pass only when a reviewed risk map proves the change is Low risk and the configured gate explicitly permits that outcome.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) makes this decision fail closed. It recommends a verdict but never merges, deploys, tags, or approves. Its key distinction is simple: test selection is an evidence-gathering stage, while the release gate decides whether that evidence is sufficient.

This guide turns that distinction into a reviewable CI contract. It covers scope, selector output, risk classification, required checks, report evidence, and repair work. For the broader selection model, read the [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) alongside this focused procedure.

## Treat Zero as a Finding, Not a Passing Test

A test process can exit successfully for several different reasons. Tests may have run and passed, a command may have matched no test files, or a wrapper may have swallowed an execution failure. Those outcomes share an exit code in some configurations, but they provide very different release evidence.

Jest documents that \`--findRelatedTests\` finds tests covering a space-separated list of source files. It also documents that \`--passWithNoTests\` allows a suite to pass when no files are found. Those two official behaviors are useful together only when CI records the discovered count before interpreting success ([Jest CLI documentation](https://jestjs.io/docs/cli)).

Vitest offers a related command that follows static imports, but its documentation says dynamic imports are not supported by that relationship analysis. It also requires \`--run\` when a non-watch process must exit normally ([Vitest CLI documentation](https://vitest.dev/guide/cli)). A zero result can therefore reveal a real absence of tests, an unsupported dynamic edge, an incorrect root, or an incomplete source-file list.

| Selector outcome | What it proves | Guardian treatment |
| --- | --- | --- |
| Related tests found and passed | Named tests exercised their normal paths | Continue to coverage and required gates |
| Related tests found and failed | A selected check contradicted readiness | NO-GO with run evidence |
| Zero tests for a Low presentation change | No related executable test was discovered | Review risk map and explicit policy |
| Zero tests for Medium or High behavior | No relevant test evidence exists | NO-GO until evidence is added |
| Selector crashed or input was incomplete | Selection evidence is unavailable | NO-GO because evidence is missing |

An empty related test set is not automatically proof that the product is untested. A route might be covered through an end-to-end suite that lacks a static import edge. That possibility still does not justify GO. It identifies the next evidence source to inspect: per-test coverage, an import graph, a maintained behavior map, or an explicit end-to-end route mapping.

The release report should state exactly what zero means. Avoid statements such as "all related tests passed" when none ran. Prefer "selected tests: 0; selector completed; Medium auth behavior changed; required evidence absent." That language keeps a green process status from becoming a false quality claim.

## Pin the Exact Release Scope First

Selection is only meaningful for a defined change. The Guardian starts with the pull request diff when possible, because it should match what will merge. A commit range is acceptable when the base and HEAD are recorded and all evidence comes from that exact HEAD.

Follow this procedure before invoking any runner:

1. Resolve and record the base reference, merge base, and full HEAD SHA used for judgment.
2. Generate both a patch and a name-status list, retaining additions, deletions, renames, and type changes.
3. Separate generated, vendored, and lock files from risk analysis, while listing every exclusion and reason.
4. Classify each remaining hunk by change surface before deciding whether zero selected tests could be acceptable.
5. Invalidate previous artifacts whenever HEAD changes, then repeat selection and all dependent gates.

The sibling guide to a [git diff behavior risk map](/blog/git-diff-behavior-risk-blast-radius-map) explains how to translate hunks into customer-facing behavior. That translation matters because file count is not risk. One changed permission condition may have a wider effect than a page of static copy.

Use a command sequence that preserves both human-readable and machine-readable inputs:

\`\`\`bash
BASE_REF=origin/main
HEAD_SHA=$(git rev-parse HEAD)
MERGE_BASE=$(git merge-base "$BASE_REF" "$HEAD_SHA")

git diff --find-renames --name-status "$MERGE_BASE" "$HEAD_SHA" > artifacts/change-status.txt
git diff --find-renames --unified=3 "$MERGE_BASE" "$HEAD_SHA" > artifacts/release.diff
git diff --stat "$MERGE_BASE" "$HEAD_SHA" > artifacts/change-stat.txt

printf '%s\n' "$HEAD_SHA" > artifacts/head-sha.txt
printf '%s\n' "$MERGE_BASE" > artifacts/merge-base.txt
\`\`\`

Do not use a stale successful run after a force push. The gate and report schema require evidence from the judged \`head_sha\`. If the stored selector record names a different revision, the evidence is invalid by definition, even when the files appear unchanged.

A broad [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026) helps teams define surfaces before a pressured release. The per-change Guardian then applies that agreed policy rather than improvising a convenient risk label after seeing an empty result.

## Run Related-Test Selectors Without Hiding Zero

Run the selector as a distinct stage from test execution. The selector should output discovered test paths, source inputs, strategy, warnings, and its own status. The executor should consume that recorded set and publish a separate test result.

For Jest, list related tests first and capture the list. Then run those exact tests if the count is positive. The official CLI supports \`--listTests\` to print matching test files and exit, while \`--findRelatedTests\` can also collect coverage for passed source files ([Jest CLI documentation](https://jestjs.io/docs/cli)). Avoid treating a convenience flag as release policy.

For Vitest, run \`vitest related --run\` with repository-relative source paths. Because documented relationship discovery follows static imports, record a warning when changed code uses runtime-computed imports. A maintained mapping to integration or browser suites can close that known edge, but the mapping itself needs review.

\`\`\`bash
mapfile -t CHANGED_TS < <(
  git diff --name-only "$MERGE_BASE" "$HEAD_SHA" -- '*.ts' '*.tsx'
)

if [ "\${#CHANGED_TS[@]}" -eq 0 ]; then
  printf '%s\n' '{"strategy":"jest-related","selected":0,"reason":"no-typescript-input"}' \
    > artifacts/selection.json
  exit 0
fi

npx jest --findRelatedTests "\${CHANGED_TS[@]}" --listTests \
  > artifacts/selected-tests.txt

SELECTED=$(grep -cve '^$' artifacts/selected-tests.txt || true)
printf '{"strategy":"jest-related","selected":%s,"head_sha":"%s"}\n' \
  "$SELECTED" "$HEAD_SHA" > artifacts/selection.json

if [ "$SELECTED" -gt 0 ]; then
  npx jest --runTestsByPath $(cat artifacts/selected-tests.txt) --coverage
fi
\`\`\`

This shell example illustrates the contract, not a portable drop-in script. Bash arrays, paths containing newlines, monorepo project selection, and runner configuration need repository-specific handling. The important behavior is observable zero selection followed by a policy decision, not an unconditional pass.

An empty related test set should also trigger a search for mapped end-to-end flows and required suites. It does not replace them. Selection orders fast feedback; release configuration still determines which complete suites must run.

## Decide Empty-Set Severity from Behavior Risk

The Guardian classifies changed surfaces before evaluating the count. Money, authentication, permissions, data shapes, public contracts, migrations, and secret-handling configuration begin High. Business logic and stateful interface behavior begin Medium. Presentation-only changes usually begin Low, while deleted tests begin High regardless of directory.

Risk belongs to behavior, not merely to file extension. A JSON file can change authorization policy, a Markdown file can define executable agent instructions, and a TypeScript change can alter only an exported type comment. Read hunks and trace one caller level for changed exported functions.

Use these decision rules consistently:

| Change evidence | Selected count | Required decision |
| --- | ---: | --- |
| High behavior or data surface | 0 | Block and name the missing behavior test |
| Medium business or UI behavior | 0 | Block unless another cited suite demonstrably exercises it |
| Low presentation-only change | 0 | Permit only if policy allows and risk map is reviewed |
| Test deletion or assertion removal | Any | Review as High finding before interpreting count |
| Unknown surface or unclassified path | 0 | Block because the risk map is incomplete |

The exact phrase empty related test set should appear in the finding so teams can measure this failure mode. The report also needs the behavior at risk and blast radius. "No tests for service.ts" is weaker than "No selected test exercises the refund authorization branch used by every refund request."

Coverage can refine the decision but cannot invent a test run. The [changed-line coverage from diff hunks guide](/blog/changed-line-coverage-diff-hunks-gate) shows how to intersect executed source lines with additions. If zero selected tests produced no coverage artifact, coverage is unknown rather than zero percent. Both outcomes fail a High gate, but the report should distinguish them.

When a schema or migration causes the empty result, use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to derive deterministic relational cases from declared constraints. Its schema-first method prevents a quick fixture from silently violating the database contract while trying to satisfy the release gate.

## Implement a Fail-Closed Selection Contract

A reliable contract separates discovery facts from gate policy. Discovery reports the count and warnings. Policy receives the risk map, mapped suites, required suites, and discovery record. It returns pass or fail with evidence, without modifying repository state.

The following TypeScript function models the narrow empty-set decision from the Guardian. Real implementations should validate parsed JSON with the repository's schema library and preserve all input artifact paths.

\`\`\`typescript
type Risk = 'low' | 'medium' | 'high' | 'unknown';

type SelectionEvidence = {
  headSha: string;
  judgedHeadSha: string;
  selected: number;
  selectorCompleted: boolean;
  highestRisk: Risk;
  alternateEvidence: string[];
  lowRiskEmptyAllowed: boolean;
  riskMapReviewed: boolean;
};

type GateResult = {
  gate: 'tests.related_selection';
  status: 'pass' | 'fail';
  evidence: string;
};

export function evaluateRelatedSelection(input: SelectionEvidence): GateResult {
  if (!input.selectorCompleted || input.headSha !== input.judgedHeadSha) {
    return { gate: 'tests.related_selection', status: 'fail', evidence: 'missing-or-stale-selection' };
  }

  if (input.selected > 0 || input.alternateEvidence.length > 0) {
    return { gate: 'tests.related_selection', status: 'pass', evidence: 'executable-evidence-present' };
  }

  const acceptedLowRiskEmpty =
    input.highestRisk === 'low' && input.lowRiskEmptyAllowed && input.riskMapReviewed;

  return {
    gate: 'tests.related_selection',
    status: acceptedLowRiskEmpty ? 'pass' : 'fail',
    evidence: acceptedLowRiskEmpty ? 'reviewed-low-risk-empty-set' : 'empty-related-test-set',
  };
}
\`\`\`

Do not add a fallback that changes unknown risk to Low. Unknown means the analysis did not establish safety. Similarly, an alternate evidence string must identify a concrete suite, run, and behavior mapping. A free-form note saying "covered elsewhere" should fail validation.

The Guardian's broader contract remains stricter than this single function. Required suites, changed-line blockers, lint, types, security findings, migration rollback, and human risk-map review still contribute to the verdict. Passing selection merely allows the evaluation to continue.

The companion [classification guide for uncovered changed lines](/blog/uncovered-changed-lines-blocker-waiver-debt) handles evidence that exists but contains gaps. Keep that state separate from no evidence. Clear categories make remediation and trend reporting useful.

## Connect the Result to Required Branch Checks

CI must expose the Guardian verdict through a stable required check if the organization expects it to block merges. GitHub documents that enabled required status checks must pass before collaborators can merge into a protected branch. It also permits selecting an expected GitHub App as the check source ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)).

Configure the repository gate first, then make the workflow implement it. The skill's starter policy allows zero Blocker-class changed-line gaps and requires named suites. Add an explicit empty-selection field only after the team agrees on its semantics.

\`\`\`yaml
gates:
  tests:
    required_suites: [unit, e2e-smoke]
    flake_policy: quarantine-lane
    max_new_skips: 0
    medium_high_empty_related_tests: block
    low_risk_empty_requires_review: true
  coverage:
    changed_line_blockers: 0
  static:
    lint_errors: 0
    type_errors: 0
    new_security_findings: 0
  process:
    risk_map_reviewed: true
\`\`\`

Do not collapse the selector, unit suite, and Guardian verdict into one ambiguous job name. Separate checks make failures diagnosable, while the final Guardian check aggregates policy. The [GitHub Actions testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers the surrounding workflow mechanics.

Required checks are enforcement plumbing, not proof by themselves. A successful check can represent a skipped or neutral state under platform rules, depending on configuration. The Guardian report must therefore carry the underlying count, strategy, HEAD, warnings, and risk finding rather than citing only a green badge.

An empty related test set discovered after a required check already passed indicates an ordering or dependency error. Make the verdict job depend on selection, execution, coverage, and static evidence. If any required artifact is absent, the verdict should be NO-GO rather than waiting indefinitely or substituting a default.

## Record Matching Human and Machine Evidence

The Guardian always emits Markdown for reviewers and JSON for CI. Both forms should describe the same verdict, blockers, waivers, risk map, selected tests, coverage, gate results, and work required for GO. CI should recompute the verdict from gate results and reject disagreement.

For an empty related test set on a Medium behavior change, the Markdown evidence can be concise:

- Verdict: NO-GO, with one missing-test blocker.
- Change: session refresh error handling changed in \`auth/session.ts\`.
- Behavior at risk: signed-in users may lose their session during refresh failure.
- Selection: zero tests, Jest related strategy, completed at the judged HEAD.
- Evidence gap: no mapped integration or end-to-end run exercises refresh failure.
- To reach GO: add or map a test that drives the failure through the public session boundary.

The corresponding JSON should name concrete artifacts rather than prose alone:

\`\`\`json
{
  "verdict": "NO_GO",
  "head_sha": "<judged-head-sha>",
  "selected_tests": {
    "strategy": "jest-related",
    "selected": 0,
    "result": "empty",
    "artifact": "artifacts/selection.json"
  },
  "blockers": [
    "auth/session.ts refresh-failure behavior has no selected or mapped test evidence"
  ],
  "gate_results": [
    {
      "gate": "tests.related_selection",
      "status": "fail",
      "evidence": "artifacts/selection.json: selected=0"
    }
  ],
  "to_reach_go": [
    "Add or map a test that drives session refresh failure through the public boundary"
  ]
}
\`\`\`

Store a small artifact manifest beside the report. It should list each file's path, producing command, HEAD SHA, creation time, and checksum. That manifest lets reviewers distinguish a missing artifact from a parser omission and discourages accidental evidence mixing across jobs. Do not place secrets, tokens, or production records in the evidence bundle.

Retention should cover the normal review and incident window defined by team policy. A report whose linked run expired cannot support a later audit by itself, so preserve the compact selector, gate, and coverage records even when large logs use shorter retention. If artifacts are regenerated, record the new run rather than silently replacing cited evidence.

Use the [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) to present this result with other gates. Never change NO-GO to a waiver merely because a release is urgent. Urgency belongs to the human decision after evidence, not to evidence classification.

If test files were removed or assertions changed, inspect the [deleted tests and weakened assertions guide](/blog/deleted-tests-weakened-assertions-release-risk) before accepting an alternate suite. A nonempty count elsewhere does not prove the removed behavior remains protected.

## Repair the Cause Instead of Bypassing the Gate

Most zero selections point to one of four repair paths. The behavior may truly lack a test, static analysis may miss a dynamic relationship, the selector may receive the wrong paths, or the change may be genuinely presentation-only. Each cause needs different work.

When the test is absent, add the smallest test that proves the behavior through a stable public boundary. A High authorization change usually needs both allowed and denied outcomes. A migration needs compatibility and rollback evidence, not merely an ORM unit test.

When a dynamic import or runtime registry hides the edge, add a reviewed mapping from source behavior to suite. Include an owner and explain why static discovery cannot see it. Periodically compare mapped selection with coverage or full-suite results so the map does not become stale.

When paths are wrong, preserve the failed selector record before fixing the script. Common causes include absolute paths passed to a repository-relative command, missing rename destinations, shallow history, an incorrect merge base, and monorepo roots evaluated from the wrong directory. Add a regression test for the selector itself.

Selector regression tests should exercise more than successful discovery. Build fixtures for a changed exported function with a direct unit test, a transitive importer, a runtime-computed import, a renamed source file, a deleted test, and an unowned path. Assert the selected paths, warning codes, strategy name, and zero-result reason. A fixture that expects an empty related test set should also declare its risk class, so a later policy test proves whether the gate blocks or accepts it.

Run the selector in shadow mode before relying on narrow feedback for a new package. Continue executing the required suite, but compare failures outside the selected set with the stored selection record. A missed failing test reveals an absent dependency edge, hidden runtime relationship, or incorrect ownership rule. Repair that cause and preserve the incident as a permanent fixture rather than simply adding the missed test to a broad hard-coded list.

Changes to selector code, ownership maps, test-runner configuration, aliases, workspace manifests, or generated-module rules can invalidate previous selection assumptions. Treat those files as global inputs and require a broad validation run when they change. The report should say why the fallback expanded, which mapping version was judged, and whether shadow comparison found any failure beyond the selected set.

Keep selector quality separate from product quality. A perfectly implemented selector can correctly discover that no relevant test exists, while a flawed selector can accidentally return the same count. Only the surrounding scope, risk, alternate evidence, and contract tests distinguish those cases. That distinction is why the gate records both discovery facts and the policy decision.

When the change is Low presentation work, document why user behavior, public contracts, data shapes, configuration, and tests are unchanged. Then require the risk-map reviewer named by policy. This is a controlled pass, not a generic exception.

Use schema-derived data when the missing test needs relational state. The [test data management guide](/blog/test-data-management-strategies) explains suite-level strategy, while the Secure Test Data Engineer provides deterministic factory and cleanup rules. Evidence created with production rows is never an acceptable shortcut.

Track recurrence by cause, surface, owner, and selector strategy. Frequent empty results in one package suggest missing ownership metadata or hidden dependencies. Frequent Low-risk approvals suggest the selector is spending effort on files that should use a separate documentation or presentation lane.

## Apply the Review Checklist and Produce a Verdict

Before reporting GO, verify that scope, selection, execution, and policy refer to the same revision. Check that every Medium or High behavior has named test evidence, every required suite ran, and every gate cites an artifact. Confirm the Guardian only recommends and has not performed a merge or approval action.

Use this final checklist:

1. The base, merge base, and full HEAD SHA are recorded.
2. Added, modified, deleted, and renamed paths entered risk analysis.
3. The selector completed and published its strategy, inputs, count, and warnings.
4. Every empty related test set has a risk-based disposition rather than a generic pass.
5. Medium and High behavior changes have selected or explicitly mapped executable evidence.
6. Required suites ran at the judged HEAD even when narrow selection passed.
7. Markdown and JSON verdicts agree with gate results and waiver ownership.
8. Remediation names the behavior and evidence needed to reach GO.

The standard is deliberately strict because missing evidence cannot support a release claim. A selector is valuable when it accelerates the first useful run and exposes mapping gaps. It becomes dangerous when its zero output is translated into confidence.

Start by installing or reviewing the [AI Release Guardian in the QA skills directory](/skills), then commit a repository-owned gate policy that blocks Medium and High empty selections. Run the first report against an actual pull request, preserve every artifact, and have a named human review the risk map before changing the verdict.

## Frequently Asked Questions

### Does zero related tests always mean NO-GO?

No. A reviewed presentation-only change may produce zero executable tests and still satisfy an explicit Low-risk policy. Medium, High, unknown, deleted-test, and missing-scope cases remain NO-GO. The report must record the selector result, risk rationale, reviewer, policy field, and judged HEAD rather than calling zero tests a pass.

### Can passWithNoTests remain in the Jest command?

Yes, when process control needs it and a later gate interprets the recorded test count. The flag only changes Jest's no-file exit behavior; it does not establish release readiness. Publish the selected count separately, then let the Guardian fail an unacceptable empty related test set according to risk and repository policy.

### What if an end-to-end test covers the changed behavior?

Name that suite, map it to the behavior, run it at the judged HEAD, and cite its result. An unsupported static import edge can explain zero related unit tests, but explanation alone is not evidence. The alternate run must exercise the relevant path and remain subject to all configured required-suite gates.

### Should selected tests replace the full required suite?

No. Selection puts likely tests first so developers receive focused feedback quickly. The Guardian still runs every suite named by the team's gate configuration. This separation protects against selector mistakes, hidden dependencies, and broad integration failures while retaining the speed benefit of an early narrow run.

### How should CI handle a selector crash?

Record the command, inputs, stderr, exit status, and HEAD, then return NO-GO for missing evidence. Do not convert an infrastructure failure into an empty success or reuse an earlier artifact. Repair the selector, rerun it, and regenerate every downstream result that depended on its output.

### Who may approve a Low-risk empty result?

Use the named human review required by the repository's process gate, not an implicit bot decision. The reviewer should confirm that the hunks are presentation-only, no executable contract changed, and policy permits zero tests. Their acknowledgment belongs in the risk map and report evidence.
`,
};
