import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Classify Uncovered Changed Lines by Risk',
  description:
    'Learn to classify uncovered changed lines as blockers, named waivers, or debt using behavior risk, exact evidence, ownership, and fail-closed gates.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'classify uncovered changed lines',
  keywords: [
    'classify uncovered changed lines',
    'coverage gap classification',
    'release blocker coverage gap',
    'named coverage waiver',
    'coverage debt evidence',
    'changed line quality gate',
    'fail closed release verdict',
    'AI Release Guardian review',
  ],
  relatedSlugs: [
    'empty-related-test-set-release-blocker',
    'changed-line-coverage-diff-hunks-gate',
    'git-diff-behavior-risk-blast-radius-map',
    'deleted-tests-weakened-assertions-release-risk',
  ],
  sources: [
    'https://git-scm.com/docs/git-diff',
    'https://github.com/istanbuljs/nyc',
    'https://docs.sonarsource.com/sonarqube-server/user-guide/about-new-code',
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
  ],
  content: `
To classify uncovered changed lines, find whether each uncovered executable line introduces risky behavior, exposes a narrow Low-risk case, or only touches untested code that existed at the base revision. New untested branches on High-risk surfaces are blockers; specifically named Low-risk cases may be waived by an owner; verified existing gaps remain visible debt.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) applies these labels only after scope, flow risk, selected tests, and changed-line coverage are established. It never turns missing files into debt, and it never accepts urgency as waiver proof. Its verdict is advisory to humans, not a merge or deployment action.

Use the [diff-hunk coverage tutorial](/blog/changed-line-coverage-diff-hunks-gate) to produce normalized zero-hit lines first. This guide starts with that valid proof and builds the label record that drives the release gate.

## How Does Coverage Gap Classification Work?

Coverage gap classification helps teams classify uncovered changed lines as a Blocker, a waiverable item, or known debt based on origin and risk. These labels are not severity synonyms. Each one states when the gap entered the code, which flow it affects, and what release choice remains possible. A sound label must cite the diff, line hits, risk, and owner.

| Label | Required proof | Release treatment |
| --- | --- | --- |
| Blocker | New or changed untested flow on a High surface, or missing required proof | NO-GO until repaired |
| Open to waiver | Narrow Low-risk case, named item, owner, and clear sign-off | GO WITH WAIVERS only after sign-off |
| Debt | Gap demonstrably existed on the base and the diff did not create risky flow | Record without blocking this change |
| Unknown | Base, coverage, path mapping, or flow proof is incomplete | NO-GO, never default to debt |

The Guardian's reference contract requires each GO WITH WAIVERS entry to have a non-null owner and accepted status. It also says the verdict must be derivable from gate results and waivers. A report cannot call an item open to waiver in prose while emitting an unqualified GO in JSON.

Debt requires the strongest temporal distinction. The line may appear in a changed hunk because surrounding code moved or formatting changed, but the flow and lack of test execution must predate the pull request. If that cannot be shown from base proof, classify the state as unknown and block.

When teams classify uncovered changed lines consistently, trend data becomes meaningful. Blockers show where a change lacks release proof, waivers show accepted cases, and debt shows older test exposure encountered during current work. Combining those counts hides who must act and when.

SonarQube describes new code as recently added or modified code and defines pull request new code by diff with the target branch ([SonarQube new code documentation](https://docs.sonarsource.com/sonarqube-server/user-guide/about-new-code)). That diff is useful input, while the Guardian adds flow surface and owner requirements.

## Gather Traceable Evidence Before Labeling

Labeling begins only after the measurement itself is valid. The patch and coverage must name the same full HEAD SHA. Each source path must normalize unambiguously, each required coverage producer must complete, and the analyzer must retain exact new-side line numbers.

Follow this proof procedure:

1. Record the base reference, merge base, full HEAD SHA, Git command, and coverage command.
2. Save rename-aware status and unified patches, including deleted tests and excluded built files.
3. Build a flow risk map from actual hunks, then trace one caller level for changed exports.
4. Run selected tests and each required suite at the judged HEAD.
5. Intersect runnable new-side lines with positive coverage hits and retain unknown mappings separately.
6. Compare candidate debt with the base commit and document whether flow changed.
7. Assign label, reason, owner state, proof paths, and work required for GO.
8. Recompute the verdict from gate results instead of trusting a manually typed summary.

Git documents status letters for added, copied, deleted, modified, renamed, type-changed, unmerged, unknown, and broken-pair paths. It also supports rename detection through the find-renames option ([Git diff documentation](https://git-scm.com/docs/git-diff)). Preserve those statuses because a deletion or rename can change label even without added lines.

Coverage config belongs in the proof bundle. The nyc project states that it records visited source files by default and can instrument all eligible files with its all option. Include and exclude filters shape that set ([Istanbul nyc documentation](https://github.com/istanbuljs/nyc)). An omitted file may indicate config, not safe debt.

Use this compact finding shape before deciding a label:

\`\`\`typescript
type GapClass = 'blocker' | 'waiverable' | 'debt' | 'unknown';

type GapEvidence = {
  file: string;
  lines: number[];
  headSha: string;
  baseSha: string;
  surface: 'money' | 'auth' | 'data-shape' | 'public-contract' | 'business' | 'ui' | 'low';
  behaviorAtRisk: string;
  blastRadius: string;
  headHits: number[];
  baseBehaviorPresent: boolean | null;
  baseCoverageMissing: boolean | null;
  evidence: string[];
};
\`\`\`

A null base field means unknown, not false. Avoid defaults that accidentally convert absent review into a reassuring boolean. The [empty related-test set guide](/blog/empty-related-test-set-release-blocker) applies the same fail-closed rule before coverage exists.

## When Is a Gap a Release Blocker Coverage Gap?

A release blocker coverage gap is a new lack of release-critical proof that the current change must fix. The clearest case is an untested branch in money, auth, access, data shape, or a public contract. A migration can also block when rollback or compatibility proof is missing, even if its SQL lines are not tracked.

The affected flow determines the classification. A zero-hit line that returns an access control denial is not only one missed statement. It controls whether users cross a protected boundary. The finding should name that flow, its callers, affected users or requests, and the test needed to demonstrate both permitted and denied outcomes.

Use Blocker for these proof patterns:

- A new High-surface branch has zero selected or required-suite hits.
- A changed public response or event shape lacks a contract check.
- Coverage for a required changed path is unknown because mapping or collection failed.
- A Medium flow has no related or mapped runnable test proof.
- Test deletion or check weakening removes the only proof for changed flow.
- Required tests, coverage, static checks, or migration proof did not run at HEAD.

Do not reduce a Blocker because the uncovered line is short. A one-line boolean inversion can control an entire access control route. Similarly, do not inflate presentation-only text into a Blocker only because it sits in a TypeScript file. The [behavior and blast-radius mapping guide](/blog/git-diff-behavior-risk-blast-radius-map) supplies the semantic context.

When you classify uncovered changed lines as blockers, define the required fix at a public boundary. "Increase coverage" is vague. "Add a request-level test proving a suspended member receives 403 and no write occurs" finds the scenario, observable result, and protected side effect.

A blocker remains open until new proof is built at the judged HEAD. A proposed test, local screenshot, or run from an earlier commit does not close it. The Guardian may suggest a test, but it cannot grade its own unreviewed output or perform an approval.

Closing proof must include checks that correspond to the stated flow. A test that reaches an access control denial line but never checks status, response shape, audit event, or absence of a write may raise coverage without resolving the finding. Review the test diff, captured result, and key side effect together. If the flow spans a public route and a service, prefer a check at the public boundary plus focused lower-level cases for branch detail.

A blocker fix can expose a second gap. For example, adding a denied-access case may reveal that allowed access no longer writes the expected owner field. Do not close the original finding by narrowing its flow statement after seeing that result. Record the new proof, update the risk map, and keep both required outcomes visible until the suite demonstrates them at one HEAD.

## When Is a Named Coverage Waiver Valid?

A named coverage waiver is valid only for one clear Low-risk gap that an authorized person accepts for this release. It is not a softer word for a blocker or a pass for a whole folder. The report keeps the item, owner, reason, cited proof, scope, and any follow-up date required by team rules.

Potential waiver candidates include an uncovered diagnostic log, a defensive fallback that cannot be induced in the supported environment, or a presentation-only branch with no state effect. Even these examples require hunk review. Logging can expose secrets, and a supposed defensive branch may actually handle real malformed input.

Reject these waiver patterns:

- "Coverage is close enough" without named files and lines.
- A team alias without an accountable accepting owner.
- Sign-off copied from a previous release or older HEAD.
- A High money, auth, data-shape, or public-contract branch.
- An unknown mapping, missing suite, parser error, or stale file.
- A blanket case created after CI failed without rule set review.

To classify uncovered changed lines as open to waiver, record why the flow is Low, what users could observe, why old tests cannot reasonably exercise it now, and what monitor or follow-up exists when required. The owner should accept the actual item, not a general risk label.

The machine report should keep accepted and proposed states separate. GO WITH WAIVERS requires each waiver to be accepted. One null owner or false sign-off changes the derivable verdict to NO-GO, even if all other gates pass.

Waivers should be easy to audit and hard to reuse accidentally. Bind them to HEAD, file, line range, hunk fingerprint, label, and release report. If the line moves or flow changes, require a fresh choice rather than matching only a path string.

Revalidate a waiver when any premise changes. A diagnostic line may become security-sensitive after it begins including request data, while a previously unreachable fallback may become reachable through a new caller. The revalidation record should compare the old and current flow statements, not only confirm that the same filename appears. Expired or unmatched waivers return to an unaccepted state and make the verdict NO-GO.

Keep fix separate from sign-off. An owner can accept a narrow release case while still assigning a test or refactor afterward. The report should distinguish the release choice from the follow-up commitment, because a backlog item does not itself reduce current risk. Conversely, completing the follow-up does not close the report until fresh runnable proof passes at the judged commit.

## How Do You Prove Coverage Debt Evidence?

Coverage debt evidence must show that the same untested flow existed at the base commit and was not made worse by this change. This label keeps a focused patch from owning each old gap while keeping the proof visible. It must never become a bin for unclear findings.

Prove three facts before assigning debt. First, the key flow existed on the base commit. Second, equivalent test proof was absent on the base. Third, the current diff did not add a branch, change an outcome, broaden callers, alter data shape, or weaken checks for that flow.

Pure movement and formatting can satisfy those facts when rename-aware and whitespace-aware review confirms semantic equivalence. Mechanical refactoring may also qualify, but only after caller and flow review. A changed function signature, reordered side effect, new error translation, or updated default is flow work even when the author calls it refactoring.

\`\`\`bash
BASE_SHA=$(cat artifacts/merge-base.txt)
HEAD_SHA=$(cat artifacts/head-sha.txt)

git show "$BASE_SHA:src/orders/service.ts" > artifacts/base-orders-service.ts
git show "$HEAD_SHA:src/orders/service.ts" > artifacts/head-orders-service.ts

git diff --no-index --word-diff=porcelain \
  artifacts/base-orders-service.ts artifacts/head-orders-service.ts \
  > artifacts/base-head-orders.word-diff || test "$?" -eq 1
\`\`\`

This command preserves diff proof but does not prove semantic equivalence by itself. Git documents \`--word-diff=porcelain\` as a line-based format for scripts, with runs prefixed by \`+\`, \`-\`, or a space and input newlines represented by \`~\` ([Git diff documentation](https://git-scm.com/docs/git-diff)). A reviewer still needs the risk map and caller context.

When teams classify uncovered changed lines as debt, include an owner or backlog reference if the rule set expects a fix. The release can remain GO when no other gate fails, but the debt must appear in the report rather than disappearing from the denominator.

If base coverage was never collected, do not infer absence from a missing file. Use past proof if it is commit-matched and compatible, or run the base in a controlled checkout with the same coverage config. Otherwise, keep provenance unknown and do not assign the debt label; this blocks the current verdict, not the product permanently.

Replaying the base requires the base's dependency lock, built files, schema state, and test config. Running old source against current dependencies can create misleading failures or line maps. Preserve the replay environment and explain any component that cannot be reproduced. If a past migration or external service prevents faithful run, use source and test history as supporting proof but retain unknown coverage provenance unless rule set defines another accepted method.

Debt can become a Blocker within the same pull request when later commits change its flow. Reclassify the gap after each HEAD update and compare finding identities by stable hunk proof, not line number alone. A line that was only moved in one commit may gain a new condition in the next. The current release state, rather than the first review, controls the final verdict.

## Apply a Deterministic Decision Record

Label logic should be small enough to review and strict enough to reject incomplete inputs. It receives a valid gap, risk surface, temporal proof, and waiver choice. It does not fetch data, rewrite rule set, or update the pull request.

The following function reflects the Guardian rules. It deliberately returns unknown when proof is incomplete and reserves the open-to-waiver label for Low-surface items.

\`\`\`typescript
type DecisionInput = GapEvidence & {
  measurementValid: boolean;
  behaviorChanged: boolean | null;
  waiverCandidateReason: string | null;
  waiverOwner: string | null;
  waiverAccepted: boolean;
};

export function classifyGap(input: DecisionInput): GapClass {
  if (!input.measurementValid || input.evidence.length === 0) return 'unknown';
  if (input.behaviorChanged === null) return 'unknown';

  const highSurface = ['money', 'auth', 'data-shape', 'public-contract'].includes(
    input.surface,
  );

  if (highSurface && input.behaviorChanged) return 'blocker';
  if (input.behaviorChanged && input.surface !== 'low') return 'blocker';

  const provenDebt =
    input.baseBehaviorPresent === true &&
    input.baseCoverageMissing === true &&
    input.behaviorChanged === false;
  if (provenDebt) return 'debt';

  const acceptedLowWaiver =
    input.surface === 'low' &&
    Boolean(input.waiverCandidateReason) &&
    Boolean(input.waiverOwner) &&
    input.waiverAccepted;
  if (acceptedLowWaiver) return 'waiverable';

  return input.behaviorChanged ? 'blocker' : 'unknown';
}
\`\`\`

Do not add numerical scoring that overrides these hard conditions. Scores can order review, but they should not average missing proof with low severity. A High branch with unknown coverage remains a blocker condition, regardless of how small the patch appears.

Version the choice schema and rule set. Store the classifier version in each finding so later audits can explain changed outcomes. When rule set changes, re-evaluate active reports instead of silently interpreting old labels with new rules.

The exact instruction to classify uncovered changed lines should produce one record per gap or cohesive line range. Avoid one finding that mixes a blocker branch, open to waiver log, and old debt only because they share a file. Different labels require different owners and release actions.

Group adjacent lines only when they implement one flow, share one class, and rely on the same proof. Split a range when one line changes a return value while another adds telemetry, even if both are uncovered. Stable grouping prevents a Low waiver from absorbing a neighboring High branch. Record the grouping rule in the analyzer version so reruns do not rearrange findings unpredictably.

Add invariants around classifier output. Each blocker needs flow, blast radius, and fix; each waiver needs owner and sign-off state; each debt item needs base proof; each unknown needs a named missing input. Reject records that violate those requirements before verdict calculation. This validation makes it possible to classify uncovered changed lines consistently across human and CI renderings.

## Bind Waivers and Debt to Ownership

Owner turns labels into work. A Blocker needs the engineer or team responsible for producing test proof. A waiver needs a named person authorized by rule set to accept it. Debt needs a discoverable owner or queue if the team expects later fix.

Record owner identity in a stable form used by the repo, such as a platform username or team identifier. Display names alone can collide or change. The report should also record when sign-off occurred, which HEAD it covered, and which proof the owner reviewed.

Waiver sign-off should be a clear event, not inferred from silence, a passing check, or authorship. The person proposing the waiver may supply rationale, while rule set can require another reviewer for sensitive repositories. The Guardian records the choice but does not impersonate human sign-off.

Debt review benefits from an aging rule. A gap encountered repeatedly may indicate that the flow changes often enough to deserve tests now. Rule set can escalate debt after a deadline or when the same lines become behaviorally modified. Keep that escalation separate from rewriting past reports.

Use the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) to establish ownership and surface rules before release pressure. Use the [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) to repair missing mappings that repeatedly create unknown findings.

When test setup is the barrier, the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) can derive fixed factories and cleanup from schemas. The [test data management guide](/blog/test-data-management-strategies) adds rules for suite isolation and data lifecycle. A difficult fixture is a fix problem, not waiver proof by itself.

Audit label transitions. A finding may move from unknown to blocker after path mapping is repaired, from blocker to closed after a test runs, or from proposed waiver to accepted waiver after owner action. Preserve the event history rather than overwriting the original proof.

## Enforce a Changed Line Quality Gate

Repo rule set should define zero allowed Blocker-class changed-line gaps by default. It may also define a minimum changed-line percentage, but percentage cannot cancel a blocker. Required suites, lint, type checks, new security findings, migration rollback, and risk-map review continue to affect the verdict.

\`\`\`yaml
gates:
  tests:
    required_suites: [unit, integration, e2e-smoke]
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
  process:
    risk_map_reviewed: true
\`\`\`

GitHub documents that enabled required status checks must pass before changes can merge into a protected branch. It also supports selecting an expected App as the source for a required check ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Expose the Guardian verdict through a stable required check, while retaining its underlying files.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers job dependencies and file flow. Do not let the verdict job continue with empty defaults when coverage or risk-map jobs fail. Emit a proof-validity gate failure first, then leave dependent threshold gates not evaluated.

The human report names each gap, flow, blast radius, class, owner state, and fix. JSON carries the same risk map, coverage gaps, gate results, blockers, waivers, debt, and work required for GO. CI should recompute the verdict and reject contradictions.

Review report changes as proof changes, not as ordinary copy edits. If a blocker disappears between runs, the new report should cite the test, coverage hit, or corrected mapping that closed it. If only the label changed, require a label rationale and reviewer. This diff-oriented adjudication catches accidental record loss and discourages manual editing that is not backed by regenerated files.

When you classify uncovered changed lines in the report, use file citations such as file paths, line ranges, test run identifiers, and coverage record locations. "One waiver accepted" is weaker than a record naming the diagnostic fallback, accepting owner, HEAD, and hunk fingerprint.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) shows how to present this gate with the full release choice. Review the [deleted-test risk guide](/blog/deleted-tests-weakened-assertions-release-risk) whenever coverage appears acceptable but test proof itself changed.

## Complete the AI Release Guardian Review

Before publishing a verdict, verify the proof chain from hunk to flow, test, coverage, label, gate, and report. A label without one of those links needs more review.

At this final checkpoint, classify uncovered changed lines with the same versioned rule set used by CI, then compare each rendered label with its machine record. This prevents a reviewer summary from drifting away from the proof that actually derives the verdict.

Use this final review checklist:

1. Patch, test, and coverage files identify the same base and HEAD.
2. Each required path maps uniquely to original source, with no hidden unknown lines.
3. High and Medium gaps name the user-facing flow and blast radius.
4. Each debt item proves base flow, base test absence, and no new risky flow.
5. Each waiver is Low, narrow, named, owned, explicitly accepted, and bound to HEAD.
6. Deleted tests and weakened checks were reviewed independently of percentages.
7. Gate results derive the same verdict shown in Markdown and JSON.
8. Fix states the exact proof required to close each blocker.

The safest workflow does not argue over labels after the fact. It makes the required proof so clear that two reviewers using the same files reach the same initial label. Human judgment remains necessary for flow and waiver sign-off, but missing proof never receives a favorable default.

Browse the [QASkills directory](/skills), install AI Release Guardian, and run its label stage on a real pull request with at least one changed branch. Require file-backed proof for each label, then commit the agreed gate rule set before using the verdict as a protected-branch check.

## Frequently Asked Questions

### Can a High-risk uncovered line ever be waived?

Not under the Guardian's default label. New untested flow in money, authentication, data shape, or a public contract is a Blocker. A team may change its repo rule set through normal review, but it should not disguise that rule set change as a routine Low-risk waiver after a failed release run.

### Is pre-existing code automatically debt?

No. You must prove the flow existed on the base, lacked equivalent coverage there, and was not changed or exposed differently by the current diff. Missing base files, broadened callers, altered outcomes, or check removal make the label unknown or blocking rather than safe debt.

### Does 100 percent changed-line coverage remove every blocker?

No. Line hits do not prove each branch outcome, check quality, migration rollback, public contract, or required suite. A test can execute a condition without checking its result. The Guardian joins coverage with flow risk and all configured gates before deriving GO, GO WITH WAIVERS, or NO-GO.

### Who should own a waiver?

Use a named person authorized by repo rule set to accept that release risk. Record stable identity, sign-off time, judged HEAD, exact item, and reviewed proof. A team alias can help routing, but silence, code owner, pull request authorship, or an old approval should not count as current sign-off.

### What if base coverage is unavailable?

Do not label the gap as debt from absence alone. Run the base commit with compatible coverage config when practical, find commit-matched past proof, or keep temporal provenance unknown. An unknown label is NO-GO until enough proof exists to distinguish existing debt from behavior introduced by the release.

### Should a fail closed release verdict show debt?

Yes. Debt does not block the current release by default, but hiding it destroys auditability and trend information. Include file, lines, flow, base proof, owner or backlog reference when required, and the reason it is not newly introduced risk. Escalate it later through rule set without rewriting history.
`,
};
