import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Empty Related Test Set: Release Blocker',
  description:
    'Treat an empty related test set as missing release evidence, apply fail-closed risk gates, and issue an auditable NO-GO verdict before approval.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'empty related test set',
  keywords: [
    'empty related test set',
    'related test selection rules',
    'fail closed release gate',
    'Jest related test selection',
    'Vitest related test selection',
    'empty test release evidence',
    'no go release verdict',
    'test impact analysis scope',
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
An empty related test set must block a release whenever the diff changes behavior classified as Medium or High risk, because the test selector produced no evidence that the affected behavior was exercised. A zero result can pass only when a reviewed risk map proves the change is Low risk and the configured gate explicitly permits that outcome.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) makes this choice fail closed. It recommends a verdict but never merges, deploys, tags, or approves. Its key split is simple: test choice is a proof-gathering stage, while the release gate decides whether that proof is sufficient.

This guide turns that split into a reviewable CI contract. It covers scope, test finder output, risk label, required checks, report proof, and repair work. For the broader selection model, read the [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) alongside this focused procedure.

## What Do Related Test Selection Rules Prove?

Related test selection rules prove which tests a tool found for the stated source paths. They do not prove that a zero result is safe. A test process can exit successfully after tests pass, after no files match, or after a wrapper hides a run failure. Those outcomes can share an exit code but provide very distinct release proof.

Jest documents that \`--findRelatedTests\` finds tests covering a space-separated list of source files. It also documents that \`--passWithNoTests\` allows a suite to pass when no files are found. Those two official flows are helpful together only when CI records the discovered count before interpreting the exit status ([Jest CLI documentation](https://jestjs.io/docs/cli)).

Vitest offers a related command that follows static imports, but its docs say runtime-computed imports are not supported by that analysis. It also requires \`--run\` when a non-watch process must exit normally ([Vitest CLI documentation](https://vitest.dev/guide/cli)). A zero result can therefore reveal a real absence of tests, an unsupported dynamic edge, an incorrect root, or an incomplete source-file list.

| Test finder outcome | What it proves | Guardian treatment |
| --- | --- | --- |
| Related tests found and passed | The selected related tests ran and passed | Continue to coverage and required gates |
| Related tests found and failed | A selected check contradicted readiness | NO-GO with run proof |
| Zero tests for a Low display change | No related runnable test was discovered | Review risk map and the release rule set |
| Zero tests for Medium or High flow | No related test evidence was discovered for the key flow | NO-GO until proof is added |
| Test finder crashed or input was incomplete | Selection proof is unavailable | NO-GO because proof is missing |

An empty related test set is not automatically proof that the product is untested. A route might be covered through an end-to-end suite that lacks a static import edge. That possibility still does not justify GO. It identifies the next proof source to inspect: per-test coverage, an import graph, a maintained flow map, or a clear end-to-end route mapping.

The release report should state exactly what zero means. Avoid statements such as "all related tests passed" when none ran. Prefer "selected tests: 0; test finder completed; Medium auth flow changed; required proof absent." That language keeps a green process status from becoming a false quality claim.

## How Do You Set Test Impact Analysis Scope?

Test impact analysis scope starts with one defined change and one judged revision. The Guardian uses the pull request diff when possible because it should match what will merge. A commit range also works when the report records the base and HEAD, and all proof comes from that exact HEAD.

Follow these steps before invoking any runner:

1. Resolve and record the base reference, merge base, and full HEAD SHA used for judgment.
2. Generate both a patch and a name-status list, retaining additions, deletions, renames, and type changes.
3. Separate built, vendored, and lock files from risk analysis, while listing each exclusion and reason.
4. Classify each remaining hunk by change surface before deciding whether zero selected tests could be acceptable.
5. Invalidate previous files whenever HEAD changes, then repeat selection and all dependent gates.

The sibling guide to a [git diff behavior risk map](/blog/git-diff-behavior-risk-blast-radius-map) explains how to translate hunks into customer-facing flow. That translation matters because file count is not risk. One changed permission condition may have a wider effect than a page of static copy.

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

Do not use a stale successful run after a force push. The gate and report schema require proof from the judged \`head_sha\`. If the stored test finder record names a distinct revision, the proof is invalid by definition, even when the files appear unchanged.

A broad [risk-based testing strategy](/blog/risk-based-testing-strategy-guide-2026) helps teams define surfaces before a pressured release. The per-change Guardian then applies that agreed rule set rather than improvising a convenient risk label after seeing an empty result.

## How Should Jest Related Test Selection and Vitest Related Test Selection Run?

Jest related test selection can be listed before execution; Vitest related test selection with \`vitest related --run\` selects and runs the tests in one command. Each path should save its source inputs, method, warnings, selected count, and result as a distinct record.

For Jest, list related tests first and capture the list. Then run those exact tests if the count is positive. The official CLI supports \`--listTests\` to print matching test files and exit, while \`--findRelatedTests\` can also collect coverage for passed source files ([Jest CLI documentation](https://jestjs.io/docs/cli)). Avoid treating a convenience flag as release rule set.

For Vitest, run \`vitest related --run\` with repo-relative source paths. Because the documented link scan follows static imports, record a warning when changed code uses runtime-computed imports. A maintained mapping to integration or browser suites can close that known edge, but the mapping itself needs review.

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
  mapfile -t SELECTED_TESTS < artifacts/selected-tests.txt
  npx jest --runTestsByPath "\${SELECTED_TESTS[@]}" --coverage
fi
\`\`\`

This shell example illustrates the contract, not a portable drop-in script. Bash arrays, paths containing newlines, monorepo project selection, and runner config need repo-specific handling. The important flow is observable zero selection followed by a rule set choice, not an unconditional pass.

An empty related test set should also trigger a search for mapped end-to-end flows and required suites. It does not replace them. Selection orders fast feedback; release config still determines which complete suites must run.

## When Does Empty Test Release Evidence Block a Release?

Empty test release evidence blocks a release when the changed flow is Medium, High, or still unknown. The Guardian labels the changed surface before it judges the count. Money, auth, access, data shapes, public contracts, migrations, and secret handling start High. Business rules and stateful user flows start Medium.

Risk belongs to flow, not only to file extension. A JSON file can change an access control rule set, a Markdown file can define runnable agent instructions, and a TypeScript change can alter only an exported type comment. Read hunks and trace one caller level for changed exported functions.

Use these choice rules consistently:

| Change proof | Selected count | Required choice |
| --- | ---: | --- |
| High flow or data surface | 0 | Block and name the missing flow test |
| Medium business or UI flow | 0 | Block unless another cited suite demonstrably exercises it |
| Low display-only change | 0 | Permit only if rule set allows and risk map is reviewed |
| Test deletion or assertion removal | Any | Review as High finding before reading count |
| Unknown surface or unclassified path | 0 | Block because the risk map is incomplete |

The exact phrase empty related test set should appear in the finding so teams can measure this failure mode. The report also needs the flow at risk and blast radius. "No tests for service.ts" is weaker than "No selected test exercises the refund access control branch used by each refund request."

Coverage can refine the choice but cannot invent a test run. The [changed-line coverage from diff hunks guide](/blog/changed-line-coverage-diff-hunks-gate) shows how to intersect executed source lines with additions. If zero selected tests produced no coverage artifact, coverage is unknown rather than zero percent. Both outcomes fail a High-risk gate, but the report should distinguish them.

When a schema or migration causes the empty result, use the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to derive deterministic relational cases from declared constraints. Its schema-first method prevents a quick fixture from silently violating the database contract while trying to satisfy the release gate.

## How Does a Fail Closed Release Gate Work?

A fail closed release gate keeps test scan facts apart from the release rules. The scan reports the count and warnings. The gate reads the risk map, mapped suites, required suites, and scan record. It returns pass or fail with cited proof and does not change repo state.

The following TypeScript function models the narrow empty-set choice from the Guardian. Real implementations should validate parsed JSON with the repo's schema library and preserve all input file paths.

\`\`\`typescript
type Risk = 'low' | 'medium' | 'high' | 'unknown';

type AlternateEvidence = {
  suite: string;
  run: string;
  flow: string;
};

type SelectionEvidence = {
  headSha: string;
  judgedHeadSha: string;
  selected: number;
  selectorCompleted: boolean;
  highestRisk: Risk;
  alternateEvidence: AlternateEvidence[];
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

  const hasValidAlternateEvidence = input.alternateEvidence.some(
    (evidence) =>
      evidence.suite.trim() !== '' && evidence.run.trim() !== '' && evidence.flow.trim() !== '',
  );

  if (input.selected > 0 || hasValidAlternateEvidence) {
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

Do not add a fallback that changes unknown risk to Low. Unknown means the analysis did not establish safety. Similarly, another proof string must identify a concrete suite, run, and flow mapping. A free-form note saying "covered elsewhere" should fail validation.

The Guardian's broader contract remains stricter than this single function. Required suites, changed-line blockers, lint, types, security findings, migration rollback, and human risk-map review still contribute to the verdict. Passing selection only allows the evaluation to continue.

The companion [classification guide for uncovered changed lines](/blog/uncovered-changed-lines-blocker-waiver-debt) handles proof that exists but contains gaps. Keep that state separate from no proof. Clear categories make fix and trend reporting helpful.

## Connect the Result to Required Branch Checks

CI must expose the Guardian verdict through a stable required check if the team expects it to block merges. GitHub documents that enabled required status checks must pass before collaborators can merge into a protected branch. It also permits selecting an expected GitHub App as the check source ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)).

Configure the repo gate first, then make the workflow implement it. The skill's starter rule set allows zero Blocker-class changed-line gaps and requires named suites. Add a clear empty-selection field only after the team agrees on its semantics.

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

Do not collapse the test selector, unit suite, and Guardian verdict into one ambiguous job name. Separate checks make failures diagnosable, while the final Guardian check applies the policy. The [GitHub Actions testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers the surrounding workflow mechanics.

Required checks are enforcement plumbing, not proof by themselves. A successful check can represent a skipped or neutral state under platform rules, depending on config. The Guardian report must therefore carry the underlying count, method, HEAD, warnings, and risk finding rather than citing only a green badge.

An empty related test set discovered after a required check already passed indicates an ordering or dependency error. Make the verdict job depend on selection, test run, coverage, and static proof. If any required file is absent, the verdict should be NO-GO rather than waiting indefinitely or substituting a default.

## Record a No Go Release Verdict

The Guardian always emits Markdown for reviewers and JSON for CI. Both forms should describe the same verdict, blockers, waivers, risk map, selected tests, coverage, gate results, and work required for GO. CI should recompute the verdict from gate results and reject disagreement.

For an empty related test set on a Medium flow change, the Markdown proof can be concise. State the verdict first, then list the missing proof:

- Verdict: NO-GO, with one missing-test blocker.
- Change: session refresh error handling changed in \`auth/session.ts\`.
- Flow at risk: signed-in users may lose their session during refresh failure.
- Selection: zero tests, Jest related method, completed at the judged HEAD.
- Proof gap: no mapped integration or end-to-end run exercises refresh failure.
- To reach GO: add or map a test that drives the failure through the public session boundary.

The corresponding JSON should name concrete files rather than prose alone:

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

Store a small file manifest beside the report. It should list each file's path, the command that produced it, HEAD SHA, creation time, and checksum. That manifest lets reviewers distinguish a missing file from a parser omission and discourages accidental proof mixing across jobs. Do not place secrets, tokens, or production records in the proof bundle.

Retention should cover the normal review and incident window defined by team rule set. A report whose linked run expired cannot support a later audit by itself, so preserve the compact test finder, gate, and coverage records even when large logs use shorter retention. If files are regenerated, record the new run rather than silently replacing cited proof.

Use the [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) to present this result with other gates. Never change NO-GO to a waiver only because a release is urgent. Urgency belongs to the human choice after proof, not to the proof label.

If test files were removed or assertions changed, inspect the [deleted tests and weakened assertions guide](/blog/deleted-tests-weakened-assertions-release-risk) before accepting another suite. A nonempty count elsewhere does not prove the removed flow remains protected.

## Repair the Cause Instead of Bypassing the Gate

Most zero selections point to one of four repair paths. The flow may truly lack a test, static analysis may miss a dynamic link, the test finder may receive the wrong paths, or the change may be genuinely display-only. Each cause needs distinct work.

When the test is absent, add the smallest test that proves the flow through a stable public boundary. A High access control change usually needs both allowed and denied outcomes. A migration needs compatibility and rollback proof, not only an ORM unit test.

When a dynamic import or runtime registry hides the edge, add a reviewed mapping from source flow to suite. Include an owner and explain why static scan cannot see it. Periodically compare mapped selection with coverage or full-suite results so the map does not become stale.

When paths are wrong, preserve the failed test finder record before fixing the script. Common causes include absolute paths passed to a repo-relative command, missing rename destinations, shallow history, an incorrect merge base, and monorepo roots evaluated from the wrong folder. Add a regression test for the test finder itself.

Test finder regression tests should exercise more than a successful scan. Build fixtures for a changed exported function with a direct unit test, a transitive importer, a runtime-computed import, a renamed source file, a deleted test, and an unowned path. Assert the selected paths, warning codes, method name, and zero-result reason. A fixture that expects an empty related test set should also declare its risk class, so a later rule set test proves whether the gate blocks or accepts it.

Run the test finder in shadow mode before relying on narrow feedback for a new package. Continue executing the required suite, but compare failures outside the selected set with the stored selection record. A missed failing test reveals an absent dependency edge, hidden runtime link, or incorrect owner rule. Repair that cause and preserve the incident as a permanent fixture rather than simply adding the missed test to a broad hard-coded list.

Changes to test finder code, owner maps, test-runner config, aliases, workspace manifests, or built-module rules can invalidate previous selection assumptions. Treat those files as global inputs and require a broad validation run when they change. The report should say why the fallback expanded, which mapping version was judged, and whether shadow comparison found any failure beyond the selected set.

Keep test finder quality separate from product quality. A perfectly implemented test finder can correctly discover that no key test exists, while a flawed test finder can accidentally return the same count. Only the surrounding scope, risk, other proof, and contract tests distinguish those cases. That split is why the gate records both scan facts and the rule set choice.

When the change is Low display work, document why user flow, public contracts, data shapes, config, and tests are unchanged. Then require the risk-map reviewer named by rule set. This is a controlled pass, not a generic exception.

Use schema-derived data when the missing test needs relational state. The [test data management guide](/blog/test-data-management-strategies) explains suite-level method, while the Secure Test Data Engineer provides deterministic factory and cleanup rules. Proof created with production rows is never an acceptable shortcut.

Track recurrence by cause, surface, owner, and test finder method. Frequent empty results in one package suggest missing owner metadata or hidden dependencies. Frequent Low-risk approvals suggest the test finder is spending effort on files that should use a separate docs or display lane.

## Apply the Review Checklist and Produce a Verdict

Before reporting GO, verify that scope, selection, test run, and policy refer to the same revision. Check that each Medium or High flow has named test proof, each required suite ran, and each gate cites a file. Confirm the Guardian only recommends and has not performed a merge or approval action.

Use this final checklist:

1. The base, merge base, and full HEAD SHA are recorded.
2. Added, modified, deleted, and renamed paths entered risk analysis.
3. The test finder completed and published its method, inputs, count, and warnings.
4. Each empty related test set has a risk-based disposition rather than a generic pass.
5. Medium and High flow changes have selected or explicitly mapped runnable proof.
6. Required suites ran at the judged HEAD even when narrow selection passed.
7. Markdown and JSON verdicts agree with gate results and waiver owner.
8. Fix names the flow and proof needed to reach GO.

The standard is deliberately strict because missing proof cannot support a release claim. A test finder is valuable when it accelerates the first helpful run and exposes mapping gaps. It becomes dangerous when its zero output is translated into confidence.

Start by installing or reviewing the [AI Release Guardian in the QA skills directory](/skills), then commit a repo-owned gate rule set that blocks Medium and High empty selections. Run the first report against an actual pull request, preserve each file, and have a named human review the risk map before changing the verdict.

## Frequently Asked Questions

### Does zero related tests always mean NO-GO?

No. A reviewed display-only change may produce zero runnable tests and still satisfy a clear Low-risk rule set. Medium, High, unknown, deleted-test, and missing-scope cases remain NO-GO. The report must record the test finder result, risk rationale, reviewer, rule set field, and judged HEAD rather than calling zero tests a pass.

### Can passWithNoTests remain in the Jest command?

Yes, when process control needs it and a later gate interprets the recorded test count. The flag only changes Jest's no-file exit flow; it does not establish release readiness. Publish the selected count separately, then let the Guardian fail an unacceptable empty related test set according to risk and repo rule set.

### What if an end-to-end test covers the changed behavior?

Name that suite, map it to the flow, run it at the judged HEAD, and cite its result. An unsupported static import edge can explain zero related unit tests, but explanation alone is not proof. The other run must exercise the key path and remain subject to all configured required-suite gates.

### Should selected tests replace the full required suite?

No. Selection puts likely tests first so developers receive focused feedback quickly. The Guardian still runs each suite named by the team's gate config. This separation protects against test finder mistakes, hidden dependencies, and broad integration failures while retaining the speed benefit of an early narrow run.

### How should CI handle a selector crash?

Record the command, inputs, stderr, exit status, and HEAD, then return NO-GO for missing proof. Do not convert an infrastructure failure into an empty success or reuse an earlier file. Repair the test finder, rerun it, and regenerate each downstream result that depended on its output.

### Who may approve a Low-risk empty result?

Use the named human review required by the repo's process gate, not an implicit bot choice. The reviewer should confirm that the hunks are display-only, no executable behavior or public contract changed, and the rule set permits zero tests. Their acknowledgment belongs in the risk map and report proof.
`,
};
