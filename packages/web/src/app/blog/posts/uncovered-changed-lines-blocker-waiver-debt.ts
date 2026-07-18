import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Classify Changed-Line Coverage Gaps',
  description:
    'Learn to classify uncovered changed lines as blockers, named waivers, or debt using behavior risk, exact evidence, ownership, and fail-closed gates.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'classify uncovered changed lines',
  keywords: [
    'classify uncovered changed lines',
    'coverage gap classification',
    'release blocker coverage',
    'named coverage waiver',
    'coverage debt evidence',
    'changed line quality gate',
    'fail closed release verdict',
    'AI Release Guardian',
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
To classify uncovered changed lines, determine whether each zero-hit executable line introduces risky behavior, exposes a narrow Low-risk exception, or merely touches proven pre-existing untested code. New untested branches on High surfaces are blockers; specifically named Low exceptions may be waived by an owner; verified pre-existing gaps remain visible debt.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) applies these labels only after scope, behavior risk, selected tests, and changed-line coverage are established. It never turns missing artifacts into debt, and it never accepts urgency as waiver evidence. Its verdict is advisory to humans, not a merge or deployment action.

Use the [diff-hunk coverage tutorial](/blog/changed-line-coverage-diff-hunks-gate) to produce normalized zero-hit lines first. This guide starts with that valid evidence and builds the classification record that drives the release gate.

## Use Three Categories with Different Proof

Blocker, waiverable item, and debt are not severity synonyms. Each category states when the gap entered the code, what behavior it affects, and what release action remains possible. A useful label is therefore a claim backed by diff, coverage, risk, and ownership evidence.

| Category | Required proof | Release treatment |
| --- | --- | --- |
| Blocker | New or changed untested behavior on a High surface, or missing required evidence | NO-GO until repaired |
| Waiverable | Narrow Low-risk exception, named item, owner, and explicit acceptance | GO WITH WAIVERS only after acceptance |
| Debt | Gap demonstrably existed on the base and the diff did not create risky behavior | Record without blocking this change |
| Unknown | Base, coverage, path mapping, or behavior evidence is incomplete | NO-GO, never default to debt |

The Guardian's reference contract requires every GO WITH WAIVERS entry to have a non-null owner and accepted status. It also says the verdict must be derivable from gate results and waivers. A report cannot call an item waiverable in prose while emitting an unqualified GO in JSON.

Debt requires the strongest temporal distinction. The line may appear in a changed hunk because surrounding code moved or formatting changed, but the behavior and absence of test execution must predate the pull request. If that cannot be shown from base evidence, classify the state as unknown and block.

When teams classify uncovered changed lines consistently, trend data becomes meaningful. Blockers show where a change lacks release evidence, waivers show accepted exceptions, and debt shows older test exposure encountered during current work. Combining those counts hides who must act and when.

SonarQube describes new code as recently added or modified code and defines pull request new code by comparison with the target branch ([SonarQube new code documentation](https://docs.sonarsource.com/sonarqube-server/user-guide/about-new-code)). That comparison is useful input, while the Guardian adds behavior surface and ownership requirements.

## Gather Traceable Evidence Before Labeling

Classification begins only after the measurement itself is valid. The patch and coverage must name the same full HEAD SHA. Every source path must normalize unambiguously, every required coverage producer must complete, and the analyzer must retain exact new-side line numbers.

Follow this evidence procedure:

1. Record the base reference, merge base, full HEAD SHA, Git command, and coverage command.
2. Save rename-aware status and unified patches, including deleted tests and excluded generated files.
3. Build a behavior risk map from actual hunks, then trace one caller level for changed exports.
4. Run selected tests and every required suite at the judged HEAD.
5. Intersect executable new-side lines with positive coverage hits and retain unknown mappings separately.
6. Compare candidate debt with the base revision and document whether behavior changed.
7. Assign category, reason, owner state, evidence paths, and work required for GO.
8. Recompute the verdict from gate results instead of trusting a manually typed summary.

Git documents status letters for added, copied, deleted, modified, renamed, type-changed, unmerged, unknown, and broken-pair paths. It also supports rename detection through the find-renames option ([Git diff documentation](https://git-scm.com/docs/git-diff)). Preserve those statuses because a deletion or rename can change classification even without added lines.

Coverage configuration belongs in the evidence bundle. The nyc project states that it records visited source files by default and can instrument all eligible files with its all option. Include and exclude filters shape that set ([Istanbul nyc documentation](https://github.com/istanbuljs/nyc)). An omitted file may indicate configuration, not safe debt.

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

A null base field means unknown, not false. Avoid defaults that accidentally convert absent analysis into a reassuring boolean. The [empty related-test set guide](/blog/empty-related-test-set-release-blocker) applies the same fail-closed rule before coverage exists.

## Mark New High-Risk Gaps as Blockers

A Blocker is a release-relevant absence of evidence that the current change must repair. The clearest case is an untested new branch in money, authentication, permissions, data shape, or a public contract. Migrations without rollback or compatibility evidence can also block through the data gate, even if their changed SQL lines are not instrumented.

Behavior determines the decision. A zero-hit line that returns an authorization denial is not merely one missed statement. It controls whether users cross a protected boundary. The finding should name that behavior, its callers, affected users or requests, and the test needed to demonstrate both permitted and denied outcomes.

Use Blocker for these evidence patterns:

- A new High-surface branch has zero selected or required-suite hits.
- A changed public response or event shape lacks a contract assertion.
- Coverage for a required changed path is unknown because mapping or collection failed.
- A Medium behavior has no related or mapped executable test evidence.
- Test deletion or assertion weakening removes the only evidence for changed behavior.
- Required tests, coverage, static checks, or migration evidence did not run at HEAD.

Do not reduce a Blocker because the uncovered line is short. A one-line boolean inversion can control an entire authorization route. Similarly, do not inflate presentation-only text into a Blocker merely because it sits in a TypeScript file. The [behavior and blast-radius mapping guide](/blog/git-diff-behavior-risk-blast-radius-map) supplies the semantic context.

When you classify uncovered changed lines as blockers, give remediation a public boundary. "Increase coverage" is vague. "Add a request-level test proving a suspended member receives 403 and no write occurs" identifies the scenario, observable result, and protected side effect.

A blocker remains open until new evidence is generated at the judged HEAD. A proposed test, local screenshot, or run from an earlier commit does not close it. The Guardian may suggest a test, but it cannot grade its own unreviewed output or perform an approval.

Closing evidence must include assertions that correspond to the stated behavior. A test that reaches an authorization denial line but never checks status, response shape, audit event, or absence of a write may raise coverage without resolving the finding. Review the test diff, captured result, and relevant side effect together. If the behavior spans a public route and a service, prefer an assertion at the public boundary plus focused lower-level cases for branch detail.

Blocker remediation can expose a second gap. For example, adding a denied-access case may reveal that allowed access no longer writes the expected ownership field. Do not close the original finding by narrowing its behavior statement after seeing that result. Record the new evidence, update the risk map, and keep both required outcomes visible until the suite demonstrates them at one HEAD.

## Permit Only Narrow, Named Waivers

A waiver is an explicit human acceptance of a specific Low-risk exception for this release. It is not a softer word for a blocker and not an authorization to ignore a whole directory. The item remains visible in the report, along with owner, acceptance, reason, evidence, and any follow-up date required by policy.

Potential waiver candidates include an uncovered diagnostic log, a defensive fallback that cannot be induced in the supported environment, or a presentation-only branch with no state effect. Even these examples require hunk review. Logging can expose secrets, and a supposed defensive branch may actually handle real malformed input.

Reject these waiver patterns:

- "Coverage is close enough" without named files and lines.
- A team alias without an accountable accepting owner.
- Acceptance copied from a previous release or older HEAD.
- A High money, auth, data-shape, or public-contract branch.
- An unknown mapping, missing suite, parser error, or stale artifact.
- A blanket exception created after CI failed without policy review.

To classify uncovered changed lines as waiverable, record why the behavior is Low, what users could observe, why existing tests cannot reasonably exercise it now, and what monitor or follow-up exists when required. The owner should accept the actual item, not a general risk category.

The machine report should keep accepted and proposed states separate. GO WITH WAIVERS requires every waiver to be accepted. One null owner or false acceptance changes the derivable verdict to NO-GO, even if all other gates pass.

Waivers should be easy to audit and hard to reuse accidentally. Bind them to HEAD, file, line range, hunk fingerprint, category, and release report. If the line moves or behavior changes, require a fresh decision rather than matching only a path string.

Revalidate a waiver when any premise changes. A diagnostic line may become security-relevant after it begins including request data, while a previously unreachable fallback may become reachable through a new caller. The revalidation record should compare the old and current behavior statements, not merely confirm that the same filename appears. Expired or unmatched waivers return to an unaccepted state and make the verdict NO-GO.

Keep remediation separate from acceptance. An owner can accept a narrow release exception while still assigning a test or refactor afterward. The report should distinguish the release decision from the follow-up commitment, because a backlog item does not itself reduce current risk. Conversely, completing the follow-up does not close the report until fresh executable evidence passes at the judged revision.

## Prove Debt Against the Base Revision

Debt is pre-existing untested behavior encountered by the current diff but not introduced as release risk by it. This category prevents a focused change from becoming responsible for every old gap while keeping the evidence visible. It must not become a storage bin for ambiguous findings.

Prove three facts before assigning debt. First, the relevant behavior existed on the base revision. Second, equivalent test evidence was absent on the base. Third, the current diff did not add a branch, change an outcome, broaden callers, alter data shape, or weaken assertions for that behavior.

Pure movement and formatting can satisfy those facts when rename-aware and whitespace-aware review confirms semantic equivalence. Mechanical refactoring may also qualify, but only after caller and behavior analysis. A changed function signature, reordered side effect, new error translation, or updated default is behavior work even when the author calls it refactoring.

\`\`\`bash
BASE_SHA=$(cat artifacts/merge-base.txt)
HEAD_SHA=$(cat artifacts/head-sha.txt)

git show "$BASE_SHA:src/orders/service.ts" > artifacts/base-orders-service.ts
git show "$HEAD_SHA:src/orders/service.ts" > artifacts/head-orders-service.ts

git diff --no-index --word-diff=porcelain \
  artifacts/base-orders-service.ts artifacts/head-orders-service.ts \
  > artifacts/base-head-orders.word-diff || test "$?" -eq 1
\`\`\`

This command preserves comparison evidence but does not prove semantic equivalence by itself. Git documents word-diff porcelain as a line-based form intended for script consumption, while warning that its delimiters and implementation have defined behavior ([Git diff documentation](https://git-scm.com/docs/git-diff)). A reviewer still needs the risk map and caller context.

When teams classify uncovered changed lines as debt, include an owner or backlog reference if policy expects remediation. The release can remain GO when no other gate fails, but the debt must appear in the report rather than disappearing from the denominator.

If base coverage was never collected, do not infer absence from a missing file. Use historical evidence if it is revision-matched and compatible, or run the base in a controlled checkout with the same coverage configuration. Otherwise mark provenance unknown and block classification, not necessarily the product forever.

Replaying the base requires the base's dependency lock, generated artifacts, schema state, and test configuration. Running old source against current dependencies can create misleading failures or line maps. Preserve the replay environment and explain any component that cannot be reproduced. If a historical migration or external service prevents faithful execution, use source and test history as supporting evidence but retain unknown coverage provenance unless policy defines another accepted method.

Debt can become a Blocker within the same pull request when later commits change its behavior. Re-run classification after every HEAD update and compare finding identities by stable hunk evidence, not line number alone. A line that was merely moved in one commit may gain a new condition in the next. The current release state, rather than the first analysis, controls the final verdict.

## Apply a Deterministic Decision Record

Classification logic should be small enough to review and strict enough to reject incomplete inputs. It receives a valid gap, risk surface, temporal proof, and waiver decision. It does not fetch data, rewrite policy, or update the pull request.

The following function reflects the Guardian rules. It deliberately returns unknown when evidence is incomplete and reserves waiverable for Low-surface items.

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

Do not add numerical scoring that overrides these hard conditions. Scores can order review, but they should not average missing evidence with low severity. A High branch with unknown coverage remains a blocker condition, regardless of how small the patch appears.

Version the decision schema and policy. Store the classifier version in each finding so later audits can explain changed outcomes. When policy changes, re-evaluate active reports instead of silently interpreting old labels with new rules.

The exact instruction to classify uncovered changed lines should produce one record per gap or cohesive line range. Avoid one finding that mixes a blocker branch, waiverable log, and old debt merely because they share a file. Different categories require different owners and release actions.

Group adjacent lines only when they implement one behavior, share one class, and rely on the same evidence. Split a range when one line changes a return value while another adds telemetry, even if both are uncovered. Stable grouping prevents a Low waiver from absorbing a neighboring High branch. Record the grouping rule in the analyzer version so reruns do not rearrange findings unpredictably.

Add invariants around classifier output. Every blocker needs behavior, blast radius, and remediation; every waiver needs owner and acceptance state; every debt item needs base proof; every unknown needs a named missing input. Reject records that violate those requirements before verdict calculation. This validation makes it possible to classify uncovered changed lines consistently across human and CI renderings.

## Bind Waivers and Debt to Ownership

Ownership turns labels into work. A Blocker needs the engineer or team responsible for producing test evidence. A waiver needs a named person authorized by policy to accept it. Debt needs a discoverable owner or queue if the organization expects later remediation.

Record owner identity in a stable form used by the repository, such as a platform username or team identifier. Display names alone can collide or change. The report should also record when acceptance occurred, which HEAD it covered, and which evidence the owner reviewed.

Waiver acceptance should be an explicit event, not inferred from silence, a passing check, or authorship. The person proposing the waiver may supply rationale, while policy can require another reviewer for sensitive repositories. The Guardian records the decision but does not impersonate human acceptance.

Debt review benefits from an aging rule. A gap encountered repeatedly may indicate that the behavior changes often enough to deserve tests now. Policy can escalate debt after a deadline or when the same lines become behaviorally modified. Keep that escalation separate from rewriting historical reports.

Use the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) to establish ownership and surface policy before release pressure. Use the [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) to repair missing mappings that repeatedly create unknown findings.

When test setup is the barrier, the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) can derive deterministic factories and cleanup from schemas. The [test data management guide](/blog/test-data-management-strategies) adds policy for suite isolation and data lifecycle. A difficult fixture is a remediation problem, not waiver proof by itself.

Audit category transitions. A finding may move from unknown to blocker after path mapping is repaired, from blocker to closed after a test runs, or from proposed waiver to accepted waiver after owner action. Preserve the event history rather than overwriting the original evidence.

## Enforce Gates and Emit Matching Reports

Repository policy should define zero allowed Blocker-class changed-line gaps by default. It may also define a minimum changed-line percentage, but percentage cannot cancel a blocker. Required suites, lint, type checks, new security findings, migration rollback, and risk-map review continue to affect the verdict.

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

GitHub documents that enabled required status checks must pass before changes can merge into a protected branch. It also supports selecting an expected App as the source for a required check ([GitHub protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)). Expose the Guardian verdict through a stable required check, while retaining its underlying artifacts.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) covers job dependencies and artifact flow. Do not let the verdict job continue with empty defaults when coverage or risk-map jobs fail. Emit an evidence-validity gate failure first, then leave dependent threshold gates not evaluated.

The human report names each gap, behavior, blast radius, class, owner state, and remediation. JSON carries the same risk map, coverage gaps, gate results, blockers, waivers, debt, and work required for GO. CI should recompute the verdict and reject contradictions.

Review report changes as evidence changes, not as ordinary copy edits. If a blocker disappears between runs, the new report should cite the test, coverage hit, or corrected mapping that closed it. If only the label changed, require a classification rationale and reviewer. This diff-oriented adjudication catches accidental record loss and discourages manual editing that is not backed by regenerated artifacts.

When you classify uncovered changed lines in the report, use artifact citations such as file paths, line ranges, test run identifiers, and coverage record locations. "One waiver accepted" is weaker than a record naming the diagnostic fallback, accepting owner, HEAD, and hunk fingerprint.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) shows how to present this gate with the full release decision. Review the [deleted-test risk guide](/blog/deleted-tests-weakened-assertions-release-risk) whenever coverage appears acceptable but test evidence itself changed.

## Complete the Review and Act on Findings

Before publishing a verdict, verify the evidence chain from hunk to behavior, test, coverage, classification, gate, and report. A category without one of those links needs more analysis.

At this final checkpoint, classify uncovered changed lines with the same versioned policy used by CI, then compare every rendered category with its machine record. This prevents a reviewer summary from drifting away from the evidence that actually derives the verdict.

Use this final review checklist:

1. Patch, test, and coverage artifacts identify the same base and HEAD.
2. Every required path maps uniquely to original source, with no hidden unknown lines.
3. High and Medium gaps name the user-facing behavior and blast radius.
4. Every debt item proves base behavior, base test absence, and no new risky behavior.
5. Every waiver is Low, narrow, named, owned, explicitly accepted, and bound to HEAD.
6. Deleted tests and weakened assertions were reviewed independently of percentages.
7. Gate results derive the same verdict shown in Markdown and JSON.
8. Remediation states the exact evidence required to close each blocker.

The safest workflow does not argue over labels after the fact. It makes the required proof so explicit that two reviewers using the same artifacts reach the same initial category. Human judgment remains necessary for behavior and waiver acceptance, but missing evidence never receives a favorable default.

Browse the [QASkills directory](/skills), install AI Release Guardian, and run its classification stage on a real pull request with at least one changed branch. Require artifact-backed proof for every category, then commit the agreed gate policy before using the verdict as a protected-branch check.

## Frequently Asked Questions

### Can a High-risk uncovered line ever be waived?

Not under the Guardian's default classification. New untested behavior in money, authentication, data shape, or a public contract is a Blocker. A team may change its repository policy through normal review, but it should not disguise that policy change as a routine Low-risk waiver after a failed release run.

### Is pre-existing code automatically debt?

No. You must prove the behavior existed on the base, lacked equivalent coverage there, and was not changed or exposed differently by the current diff. Missing base artifacts, broadened callers, altered outcomes, or assertion removal make the classification unknown or blocking rather than safe debt.

### Does 100 percent changed-line coverage remove every blocker?

No. Line hits do not prove every branch outcome, assertion quality, migration rollback, public contract, or required suite. A test can execute a condition without checking its result. The Guardian joins coverage with behavior risk and all configured gates before deriving GO, GO WITH WAIVERS, or NO-GO.

### Who should own a waiver?

Use a named person authorized by repository policy to accept that release risk. Record stable identity, acceptance time, judged HEAD, exact item, and reviewed evidence. A team alias can help routing, but silence, code ownership, pull request authorship, or an old approval should not count as current acceptance.

### What if base coverage is unavailable?

Do not label the gap debt from absence alone. Run the base revision with compatible coverage configuration when practical, find revision-matched historical evidence, or keep temporal provenance unknown. Unknown classification is NO-GO until enough evidence exists to distinguish pre-existing debt from behavior introduced by the release.

### Should debt appear in the release report?

Yes. Debt does not block the current release by default, but hiding it destroys auditability and trend information. Include file, lines, behavior, base proof, owner or backlog reference when required, and the reason it is not newly introduced risk. Escalate it later through policy without rewriting history.
`,
};
