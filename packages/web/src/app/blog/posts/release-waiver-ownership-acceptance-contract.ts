import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Release Waivers Need Named Owners',
  description:
    'Define release waiver ownership with named accountable owners, explicit acceptance, expiry, evidence, audit checks, and strict NO-GO defaults.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'release waiver ownership',
  keywords: [
    'release waiver ownership',
    'named waiver owner',
    'release risk acceptance',
    'GO with waivers contract',
    'quality gate exception',
    'NO-GO release policy',
    'waiver acceptance evidence',
    'release governance audit',
  ],
  relatedSlugs: [
    'database-migration-rolling-deploy-compatibility-gate',
    'dependency-upgrade-changelog-api-usage-release-review',
    'release-gates-yaml-team-policy-schema',
    'machine-verifiable-no-go-release-report-json',
  ],
  sources: [
    'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
    'https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates',
    'https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html',
  ],
  content: `Release waiver ownership means one identifiable person accepts one specifically classified, evidenced risk for the exact release being judged. The report may return GO_WITH_WAIVERS only when every waiver has a non-null owner and \`accepted: true\`. Missing ownership, missing acceptance, blockers, failed gates, or stale evidence must return NO_GO.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) distinguishes blocker, waiverable, and debt coverage gaps, then applies the team's configured gates. It never grants its own exception or approves a release. Browse the [QASkills directory](/skills) for focused evidence producers, but keep acceptance with authorized humans.

## Define a Waiver as Narrow Risk Acceptance

A waiver is not a general permission to ship with red CI. It is an explicit record that a named owner accepts a specific item already classified as waiverable under committed team policy. The item remains visible in the report and does not become a pass.

Under release waiver ownership, the assigned contract supports three verdicts: GO means every gate passes and no waiver remains. GO_WITH_WAIVERS means no blocker or failed gate remains, every open item is waiverable, and each waiver has a named owner with explicit acceptance. NO_GO covers any blocker, missing evidence, failed required suite, stale artifact, or invalid waiver.

Release waiver ownership should answer five questions without relying on private conversation:

1. What exact item is being accepted?
2. Why is that item waiverable rather than a blocker?
3. Which evidence identifies the affected code, behavior, and release SHA?
4. Who accepts responsibility for this release decision?
5. Where is explicit acceptance recorded for the current report?

The report's minimal waiver object contains \`item\`, \`owner\`, and \`accepted\`. Teams can maintain separate operational records for expiry, remediation tracking, or ticket references, but must not silently change the core JSON contract. Extensions need schema review and consumer support.

Do not use team names, queues, or unmonitored aliases as the only owner when the contract expects a named human. A team can remain responsible for remediation, while one authorized person accepts the release-specific risk. Identity should be stable enough for audit and traceable to the pull request or approval system.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) can present waivers beside blockers and gate evidence. Keep the waiver visible rather than subtracting it from a score. Reviewers need to know what remains open and who accepted it.

## Separate Blockers, Waiverable Gaps, and Debt

Classification precedes acceptance, and the Guardian classifies an untested new branch on a high surface such as money, authentication, data shape, or public contract as a blocker. Untested logging, a defensive fallback, or a low-surface change may be waiverable. Pre-existing untested code merely touched by the diff is debt and should be listed without misattributing it.

| Class | Example from the assigned contract | Release treatment | Can ownership change it? |
|---|---|---|---|
| Blocker | New refund branch has zero executing tests | NO_GO until remediated | No |
| Blocker | Required suite missing or failed | NO_GO | No |
| Blocker | Migration lacks required rollback evidence | NO_GO | No |
| Waiverable | Changed debug log line is uncovered | Named accepted waiver may permit GO_WITH_WAIVERS | Ownership accepts, not reclassifies |
| Debt | Pre-existing untested branch touched by diff | Report and track according to policy | Not a release waiver by default |

Urgency does not alter classification because the Guardian explicitly says not to soften NO_GO when a change is urgent. Humans may change team policy through its reviewed process, but an individual report cannot rewrite the release bar while evaluating itself.

Use the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) to connect changed lines with user behavior and blast radius. A file location alone does not explain whether a gap affects money movement, a public response, or internal diagnostics. That context supports classification without invented numeric risk.

Coverage gaps are not the only findings, but the same rule applies across gates. A new scanner finding beyond the configured limit is a failed gate, not a waiverable item by default. A destructive migration may require a waiver when the exact data policy says so, yet it still needs rollback or deploy evidence under its separate field.

The [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) shows this distinction. A configured destructive-operation waiver records accepted risk, while failed old-code/new-schema compatibility remains concrete blocker evidence. One exception cannot clear an independent failed test gate.

When classification within release waiver ownership is disputed, report NO_GO until the responsible policy owner resolves it. The evaluator should not choose the more permissive category. Preserve the diff hunk, coverage artifact, test selection, and reasoning so reviewers can decide using the same facts.

## Use the Exact Acceptance Object

The reference report uses a small waiver object, which is useful because verdict derivation remains deterministic. An owner is either a nonempty identity or null, and acceptance is an explicit Boolean rather than inferred from presence.

\`\`\`json
{
  "verdict": "GO_WITH_WAIVERS",
  "head_sha": "a91c4e2",
  "base_ref": "origin/main",
  "gate_results": [
    {
      "gate": "coverage.changed_line_blockers",
      "status": "pass",
      "evidence": "coverage run #8841 found 0 blocker gaps at a91c4e2"
    },
    {
      "gate": "tests.required_suites",
      "status": "pass",
      "evidence": "unit, integration, and e2e-smoke run #8842 at a91c4e2"
    }
  ],
  "blockers": [],
  "waivers": [
    {
      "item": "uncovered debug log orders/service.ts:140 in coverage run #8841",
      "owner": "release-owner@example.test",
      "accepted": true
    }
  ],
  "to_reach_go": [
    "add an assertion covering the debug-log branch at orders/service.ts:140"
  ]
}
\`\`\`

The reserved \`example.test\` identity keeps this example synthetic. Actual reports should use the repository's approved identity form and access controls. Never place secret tokens or sensitive personal data in the report.

An \`item\` needs concrete evidence. "Minor coverage issue" cannot be traced or distinguished from another waiver. File and line, run ID, migration ID, scanner finding, or diff hunk makes the accepted scope inspectable. The item should also state enough behavior to support its waiverable classification.

\`owner: null\` means ownership is missing. An empty string should also fail semantic validation even if a structural schema allows strings. \`accepted: false\` means the owner has not accepted. Neither state can produce GO_WITH_WAIVERS.

Do not infer acceptance from a pull-request approval unless team policy explicitly maps that event to this exact item and SHA. A general code review may approve implementation quality without accepting an uncovered path. Record a purpose-specific acknowledgment tied to waiver identity.

The [machine-verifiable NO-GO report tutorial](/blog/machine-verifiable-no-go-release-report-json) supplies strict JSON Schema and verdict checks. Waiver validation belongs in the central evaluator, not in a comment parser that can return a different verdict.

## Follow an Ordered Waiver Procedure

Keep acceptance after evidence collection and classification. Asking for a waiver before tests and coverage run encourages broad preapproval, while the final item may differ from the anticipated risk.

1. **Pin release identity.** Record base reference and candidate \`head_sha\`; discard earlier acceptance after the relevant diff or evidence changes.
2. **Collect gate evidence.** Run selected tests, every required suite, changed-line coverage, static checks, migration checks, and process checks from committed policy.
3. **Classify open findings.** Separate blockers, waiverable items, and pre-existing debt using risk surfaces and configured semantics.
4. **Write each waiver item.** Name behavior, artifact, file or migration, and why the item is within a permitted waiver class.
5. **Request a named owner.** Route the item to an authorized person who understands its blast radius and remediation.
6. **Record explicit acceptance.** Bind the acknowledgment to waiver identity and current SHA, then set \`accepted: true\` only from trusted evidence.
7. **Recompute the verdict.** Any blocker, failed gate, ownerless item, refusal, or stale artifact yields NO_GO.
8. **Publish human and JSON reports.** Show accepted risk and steps needed to reach an unwaived GO.

The owner should see the same risk map, selected tests, coverage gaps, and gate evidence used by the evaluator. A checkbox without context cannot show informed acceptance. Keep links stable and access-controlled so future reviewers can reconstruct the decision.

If the owner requests code or test changes, leave acceptance false and update \`to_reach_go\`. After a new commit, rerun affected evidence. Do not carry the earlier request forward as acceptance for a changed item.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) can explain why selected tests cover an affected path. Selection evidence helps an owner understand what was tested, but required suites still run according to policy. An empty selection for a meaningful risk becomes a finding rather than a waiver shortcut.

Keep remediation precise even for accepted items. GO_WITH_WAIVERS is not the same as completed work. A future unwaived GO should have a concrete path, such as adding one public-boundary assertion and rerunning coverage at the new HEAD.

## Validate Ownership and Verdict in Code

The consumer recomputes the verdict from gates, blockers, and waivers and should not trust a report producer's label or transform invalid waivers into passes. Duplicate waiver items should also fail because duplicate records can obscure whether separate owners accepted separate risks.

\`\`\`typescript
type Verdict = 'GO' | 'GO_WITH_WAIVERS' | 'NO_GO';

type Waiver = {
  item: string;
  owner: string | null;
  accepted: boolean;
};

type GateResult = {
  gate: string;
  status: 'pass' | 'fail';
  evidence: string;
};

type ReleaseReport = {
  verdict: Verdict;
  head_sha: string;
  blockers: string[];
  waivers: Waiver[];
  gate_results: GateResult[];
};

function waiverIsAccepted(waiver: Waiver): boolean {
  return waiver.item.trim() !== ''
    && waiver.owner !== null
    && waiver.owner.trim() !== ''
    && waiver.accepted;
}

export function deriveVerdict(report: ReleaseReport): Verdict {
  const failedGate = report.gate_results.some((result) => result.status === 'fail');
  if (failedGate || report.blockers.length > 0) return 'NO_GO';

  if (report.waivers.length === 0) return 'GO';
  return report.waivers.every(waiverIsAccepted) ? 'GO_WITH_WAIVERS' : 'NO_GO';
}

export function validateWaivers(report: ReleaseReport, expectedSha: string): void {
  if (report.head_sha !== expectedSha) throw new Error('stale waiver report');

  const items = report.waivers.map((waiver) => waiver.item);
  if (new Set(items).size !== items.length) throw new Error('duplicate waiver item');

  const expected = deriveVerdict(report);
  if (report.verdict !== expected) throw new Error('inconsistent waiver verdict');
}
\`\`\`

This function intentionally checks nonempty ownership but does not decide whether an identity is authorized. A trusted adapter should resolve identity against repository policy or the approval system. Keep authorization outside untrusted report input.

Test GO with no findings, GO_WITH_WAIVERS with one accepted owner, and NO_GO for every invalid state. Include null owner, empty owner, false acceptance, failed gate, blocker, stale SHA, duplicate item, and producer-supplied inconsistent verdict.

Also test multiple waivers. Every item must pass; one accepted item cannot cover another ownerless item. Order should not alter derivation. If two entries represent the same underlying finding, reject duplication and ask the producer to emit one precise record.

The [release-gates.yaml team policy guide](/blog/release-gates-yaml-team-policy-schema) explains how configured gate names and report gate results align. Validate the complete report after waiver checks so missing gates cannot disappear behind an accepted exception.

## Record Acceptance Through a Trusted Path

For release waiver ownership, acceptance evidence should come from an authenticated, authorized action. Examples include a purpose-specific pull-request review command handled by a trusted app, an approval record in a controlled release system, or a signed internal decision event. The exact mechanism is team policy; the JSON report stores only normalized outcome and identity.

Do not let pull-request code set \`accepted: true\` by editing a generated report. The trusted evaluator should combine untrusted findings with authenticated acceptance events after verifying item identity and SHA. Generated artifacts remain inputs, not authority.

GitHub's [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) describes required reviews, required status checks, expected app sources, and settings that can apply protections to administrators. Use available controls so a trusted app writes the aggregate result and ordinary contributors cannot impersonate it.

Bind acceptance to a stable waiver identifier derived from item content, evidence identity, and HEAD, or store an equivalent server-side record. If the line range, run, risk, or SHA changes, require new acceptance. Avoid mutable comment text as the only key.

The release waiver ownership record should show who accepted, what they accepted, and which evidence they reviewed. A timestamp may be useful in the trusted approval store, but adding it to the core report requires schema evolution. Keep optional operational metadata outside the required object until consumers support it.

OWASP identifies inadequate identity and access management, insufficient pipeline-based access controls, poisoned pipeline execution, and insufficient logging among CI/CD concerns in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Apply least privilege to waiver readers, event writers, artifact access, and status publication.

Do not expose private approval details in public artifacts. The normalized owner identity and accepted state may be enough for the report, while protected systems retain authentication and audit records. Follow repository privacy and retention rules.

## Integrate Waivers With Quality Gates

Waivers are evaluated after all configured gates and do not replace required suites, type checks, scanner deltas, migration evidence, or risk-map review. The central evaluator first determines whether blockers or failed gates exist, then checks whether remaining waiverable items have valid acceptance.

SonarQube describes a quality gate as a set of conditions evaluated against analysis in its [quality-gate documentation](https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates). If a Sonar condition feeds \`static.new_security_findings\`, preserve its analysis identity and SHA. Do not convert a failed condition into a waiver unless committed team policy defines that path.

Use the exact repository gate names:

\`\`\`yaml
gates:
  tests:
    required_suites: [unit, integration, e2e-smoke]
    flake_policy: quarantine-lane
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

The destructive-migration field requires a waiver for drop or narrowing operations according to the reference. That requirement does not negate \`migration_rollback_documented\`. Both gate results appear, and a missing down path or deploy note still fails its own gate.

Flaky tests also remain visible. Under a quarantine-lane policy, quarantined failures report without blocking, while non-quarantined failures block. Repeated retries without diagnosis should not create a waiverable label. Preserve attempts and classification evidence.

The [dependency API usage review](/blog/dependency-upgrade-changelog-api-usage-release-review) can produce blockers when official release evidence is missing or a used API changed. An owner cannot waive a fact the team policy classifies as failed required evidence merely by accepting package risk.

For release waiver ownership, expose one aggregate protected status derived from the validated report. Individual jobs may also remain required, but reviewers should know which status applies policy and waiver consistency. Give it a unique name and trusted source.

## Track Remediation Without Hiding Accepted Risk

GO_WITH_WAIVERS should remain distinguishable in reports, release records, and metrics. Do not render it as ordinary green GO. The accepted item stays in \`waivers\`, while \`to_reach_go\` explains how a later change can remove it.

Teams often need expiry or follow-up ownership. The core contract does not include an expiry field, so store lifecycle data in an issue, release system, or separately versioned extension. Link it by stable waiver identity. Do not add ad hoc keys that a strict report schema will reject.

Remediation ownership may differ from acceptance ownership. One person accepts release risk; another team implements a test or code change. Keep both clear in the operational tracker. The report's \`owner\` remains the named person accepting the waiver for that release.

Review recurring waivers as policy or test-design signals. Repeated acceptance of the same debug path may justify adding the missing assertion, changing classification through policy review, or removing obsolete code. Do not auto-renew based on history; each release and SHA needs current evidence.

Use the [machine-verifiable report tutorial](/blog/machine-verifiable-no-go-release-report-json) to keep accepted items visible in JSON and Markdown. Its strict verdict derivation prevents a stale or unresolved waiver from appearing as GO.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can host report artifacts and protected checks. Retention should preserve enough evidence for the team's audit period without exposing sensitive logs broadly.

## Audit Named Decisions After the Release

Release waiver ownership needs an auditable trail because the report captures a deliberate exception, not a passing measurement. Preserve the validated JSON, human view, policy revision, evidence references, authenticated acceptance event, and protected-check result according to the team's retention rules.

An audit should reconstruct the decision without relying on memory. Start from \`head_sha\`, load the exact gate policy, resolve every run and artifact, verify the waiver item and classification, then confirm the named identity accepted that item. A missing link is an audit finding even when the release completed without an incident.

An audit of release waiver ownership should not ask whether the owner predicted every possible outcome. It should ask whether the report applied committed policy, presented current evidence, limited the exception to a waiverable item, authenticated acceptance, and kept independent blockers at NO_GO.

Use a simple review table:

| Audit question | Evidence to retain | Invalid state |
|---|---|---|
| Which release was judged? | Base and full HEAD SHA | Branch name alone |
| What risk was accepted? | Exact waiver item and artifact references | General risk statement |
| Who accepted it? | Authenticated named identity | Team alias or null owner |
| Was acceptance current? | Event bound to item and SHA | Approval from an earlier commit |
| Did other gates pass? | Complete gate results and producer runs | Missing required gate |
| What remained to fix? | Specific \`to_reach_go\` action | Empty or generic remediation |

Release waiver ownership records should also support remediation review. Link the accepted item to the operational tracker, but keep the report immutable for that SHA. When the test or code fix lands, create new evidence showing the gap is closed rather than editing the historical waiver into a pass.

Track recurring categories without exposing private details. Repeated low-surface waivers may show a missing test pattern, unclear policy, or obsolete branch. Use that signal to improve evidence production through reviewed changes, never to auto-accept future items.

Treat release waiver ownership as complete only when both decision and follow-up paths are visible. Acceptance explains why one release may proceed under policy; remediation explains how a later report reaches ordinary GO. Neither path permits the Guardian or its evaluator to approve or deploy.

Review access to historical records separately from current acceptance permissions. A person may need read access for audit without authority to accept a new waiver. Keep those roles distinct in the approval system and avoid granting check-writing credentials merely to support report viewing.

When a retained artifact becomes unavailable under normal expiration, preserve enough normalized evidence to explain the original decision according to policy. Do not rewrite the report or substitute a later run. If retention requirements demand longer access, configure that before relying on the artifact as acceptance evidence.

Audit samples should include ordinary GO and NO_GO reports as controls. Comparing only waived releases can miss a validator that always records owner data or a status publisher that renders every terminal result alike. The derived verdict, visible label, and protected status should remain consistent for all three outcomes.

Periodically verify that retained owner identities still resolve to the authenticated event recorded at decision time. Identity-directory changes should not alter the immutable report, but the audit system should preserve the original identifier and explain any later account rename or deactivation.

## Adopt Named Acceptance on the Next Release

Begin with one permitted waiver class, such as a low-surface changed-line coverage gap. Define its evidence shape, authorized owners, acceptance event, SHA binding, and validator tests. Keep every other unknown or failed state at NO_GO while the mechanism matures.

Run dry examples for accepted, rejected, ownerless, stale, duplicate, and blocker-containing reports. Confirm the protected check reaches a terminal result and links to both human and JSON views. Verify that pull-request code cannot manufacture an authorized acceptance event.

Use the phrase release waiver ownership in runbooks and check diagnostics so contributors can find the governing process. Explain that owners accept one item, not the whole diff, and that GO_WITH_WAIVERS remains distinct from GO.

For the next release exception, run the [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian), classify the finding from evidence, and require a named accepted waiver before the derived verdict can change. That real QASkills route supplies the report contract and non-approval guardrails used here.

## Frequently Asked Questions

### Can a team or mailing list own a release waiver?

The assigned contract requires a non-null owner, and this guide recommends one identifiable authorized person for acceptance. A team or queue can own remediation, but shared identity weakens accountability for the release decision. Store the named owner in the report and team assignment in the follow-up system.

### Does accepting a waiver turn its gate result into pass?

No. The item remains visible as accepted risk, and independent gate results retain their measured status. GO_WITH_WAIVERS is distinct from GO. A waiver can apply only to a class permitted by policy; it cannot rewrite a failed required gate or erase a blocker.

### Must acceptance be renewed after every commit?

Renew when the judged HEAD or relevant evidence changes. A new commit can alter the item, blast radius, tests, or coverage even within the same pull request. Bind acceptance to waiver identity and SHA, then reject stale records rather than guessing whether earlier intent still applies.

### Can urgent business need justify waiving a blocker?

Not under the assigned Guardian contract. Urgency is a human tradeoff but does not soften NO_GO or change blocker classification. Teams can revise policy through its reviewed process, yet one release report must apply the committed rules and present missing evidence or failed gates honestly.

### Should waiver records include an expiry date?

Expiry is useful for remediation tracking, but the core report object contains item, owner, and accepted. Store expiry in a linked operational record or introduce a reviewed schema extension supported by every consumer. Never add an unrecognized field to a strict contract during one release.

### Who is allowed to set accepted to true?

Only a trusted adapter should normalize an authenticated action from an authorized human into \`accepted: true\`. Pull-request code and report producers must not self-approve. Team policy defines eligible owners, while branch protection and least-privilege credentials protect the event and aggregate status paths.
`,
};
