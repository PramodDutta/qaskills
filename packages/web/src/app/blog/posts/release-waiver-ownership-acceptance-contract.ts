import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Release Waiver Ownership Guide',
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
  content: `Release waiver ownership means one named person accepts one precisely classified, evidenced risk for the exact release being judged. The report may return GO_WITH_WAIVERS only after all configured gates pass and each remaining waiver has a non-null owner with \`accepted: true\`. Missing ownership, stale proof, failed gates, blockers, or unresolved test-reach gaps must return NO_GO.

The [AI Release Guardian skill](/skills/thetestingacademy/ai-release-guardian) distinguishes blocker, waiverable, and debt test-reach gaps, then applies the team's configured gates. It never grants its own waiver or approves a release. Browse the [QASkills directory](/skills) for focused proof jobs, but keep sign-off with authorized humans.

## What Does Release Risk Acceptance Cover?

A waiver is not a general permission to ship with red CI. It is a clear record that a named owner accepts an exact item already classified as allowed under committed team policy. The item remains clear in the report and does not become a pass.

Under release waiver ownership, the assigned contract supports three verdicts: GO means each gate passes and no waiver remains. GO_WITH_WAIVERS means no blocker or failed gate remains, each open item is allowed, and each waiver has a named owner with clear sign-off. NO_GO covers any blocker, missing proof, failed required suite, stale file, or bad waiver.

Release waiver ownership should answer five questions without relying on private conversation:

1. What exact item is being accepted?
2. Why is that item allowed rather than a blocker?
3. Which proof finds the affected code, flow, and release SHA?
4. Who accepts responsibility for this release call?
5. Where is clear sign-off recorded for the current report?

The report's minimal waiver object contains \`item\`, \`owner\`, and \`accepted\`. Teams can maintain split ops records for end date, fix tracking, or ticket references, but must not silently change the core JSON contract. Extensions need schema review and consumer support.

Do not use team names, queues, or unmonitored aliases as the only owner when the contract expects a named human. A team can remain responsible for the fix, while one authorized person accepts the risk for that exact release. The ID should be stable enough for audit and traceable to the pull request or sign-off system.

The [release readiness scorecard guide](/blog/ai-release-readiness-scorecard-2026) can present waivers beside blockers and gate proof. Keep the waiver clear rather than subtracting it from a score. Team members need to know what remains open and who accepted it.

## Which Quality Gate Exception Can Be Waived?

Class precedes sign-off, and the Guardian classifies an untested new branch on a high surface such as money, sign-in, data shape, or public contract as a blocker. Untested logging, a defensive fallback, or a low-surface change may be allowed. Pre-existing untested code merely touched by the diff is debt and should be listed without misattributing it.

| Class | Example from the assigned contract | Release treatment | Can ownership change it? |
|---|---|---|---|
| Blocker | New refund branch is not executed by any test | NO_GO until remediated | No |
| Blocker | Required suite missing or failed | NO_GO | No |
| Blocker | Schema change lacks required rollback proof | NO_GO | No |
| Allowed | Changed debug log line is uncovered | Named accepted waiver may permit GO_WITH_WAIVERS | An owner may accept risk but cannot reclassify it |
| Debt | Pre-existing untested branch touched by diff | Report and track under rule set | Not a release waiver by default |

Urgency does not alter class because the Guardian clearly says not to soften NO_GO when a change is urgent. Humans may change team rule set through its reviewed process, but an individual report cannot rewrite the release bar while evaluating itself.

Use the [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) to connect changed lines with user flow and blast radius. A file location alone does not explain whether a gap affects money movement, a public response, or internal error text. That context supports class without invented numeric risk.

Test reach gaps are not the only findings, but the same rule applies across gates. A new scanner finding beyond the set limit is a failed gate, not an allowed item by default. A destructive schema change may require a waiver when the exact data rule set says so, yet it still needs rollback or deploy proof under its split field.

The [rolling-deploy migration gate](/blog/database-migration-rolling-deploy-compatibility-gate) shows this distinction. A configured destructive-operation waiver records accepted risk, while failed old-code/new-schema compatibility remains clear proof of a blocker. One gap cannot clear a separate failed test gate.

When class within release waiver ownership is disputed, report NO_GO until the responsible rule set owner resolves it. The checker should not choose the more permissive category. Preserve the diff hunk, test reach file, test selection, and reasoning so team members can decide using the same facts.

## What Must a GO With Waivers Contract Store?

The reference report uses a small waiver object, which is useful because verdict derivation remains deterministic. An owner is either a nonempty ID or null, and sign-off is a clear Boolean rather than inferred from presence.

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

The reserved \`example.test\` ID keeps this example synthetic. Actual reports should use the repo's approved ID form and access controls. Never place secret tokens or sensitive personal data in the report.

This abbreviated example omits the required \`risk_map\`, \`selected_tests\`, and \`coverage\` fields. A schema-valid report must include them before the waiver checker derives a verdict.

An \`item\` needs clear proof. "Minor test reach issue" cannot be traced or distinguished from another waiver. File and line, run ID, schema change ID, scanner finding, or diff hunk makes the accepted scope inspectable. The item should also state enough flow to support its allowed class.

\`owner: null\` means ownership is missing. An empty string should also fail semantic check even if a structural schema allows strings. \`accepted: false\` means the owner has not accepted. Neither state can produce GO_WITH_WAIVERS.

Do not infer acceptance from a pull-request approval unless team rule set clearly maps that event to this exact item and SHA. A general code review may approve implementation quality without accepting an uncovered path. Record a purpose-specific acknowledgment tied to waiver ID.

The [machine-verifiable NO-GO report tutorial](/blog/machine-verifiable-no-go-release-report-json) supplies strict JSON Schema and verdict checks. Waiver check belongs in the central checker, not in a comment parser that can return a different verdict.

## How Should a Named Waiver Owner Accept Risk?

Keep sign-off after proof collection and class. Asking for a waiver before tests and test reach run encourages broad preapproval, while the final item may differ from the anticipated risk.

1. **Pin release ID.** Record base reference and candidate \`head_sha\`; discard earlier sign-off after the relevant diff or proof changes.
2. **Collect gate proof.** Run selected tests, each required suite, changed-line test reach, static checks, schema change checks, and process checks from committed rule set.
3. **Classify open findings.** Split blockers, allowed items, and pre-existing debt using risk surfaces and set semantics.
4. **Write each waiver item.** Name the behavior, evidence file, code path, or schema change, and why the item is within an allowed waiver class.
5. **Request a named owner.** Route the item to an allowed person who understands its blast radius and fix.
6. **Record clear sign-off.** Bind the acknowledgment to waiver ID and current SHA, then set \`accepted: true\` only from trusted proof.
7. **Recompute the verdict.** Any blocker, failed gate, ownerless item, refusal, or stale file yields NO_GO.
8. **Publish human and JSON reports.** Show accepted risk and steps required to reach an unwaived GO.

The owner should see the same risk map, selected tests, test reach gaps, and gate proof used by the checker. A checkbox without context cannot show informed sign-off. Keep links stable and access-controlled so future team members can reconstruct the call.

If the owner requests code or test changes, leave sign-off false and update \`to_reach_go\`. After a new commit, rerun affected proof. Do not carry the earlier request forward as sign-off for a changed item.

The [test impact analysis guide](/blog/test-impact-analysis-ci-guide-2026) can explain why selected tests cover an affected path. Selection proof helps an owner understand what was tested, but required suites still run under rule set. An empty selection for a meaningful risk becomes a finding rather than a waiver shortcut.

Keep fix precise even for accepted items. GO_WITH_WAIVERS is not the same as completed work. A future unwaived GO should have a clear path, such as adding one public-boundary assertion and rerunning test reach at the new HEAD.

## How Does NO-GO Release Policy Control the Verdict?

The consumer recomputes the verdict from gates, blockers, and waivers and should not trust a report job's label or transform bad waivers into passes. Duplicate waiver items should also fail because repeated records can obscure whether different owners accepted different risks.

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

  const items = report.waivers.map((waiver) => waiver.item.trim());
  if (new Set(items).size !== items.length) throw new Error('duplicate waiver item');

  const expected = deriveVerdict(report);
  if (report.verdict !== expected) throw new Error('mismatched waiver verdict');
}
\`\`\`

This function intentionally checks nonempty ownership but does not decide whether an ID is allowed. A trusted adapter should resolve ID against repo rule set or the sign-off system. Keep access check outside untrusted report input.

Test GO with no findings, GO_WITH_WAIVERS with one accepted owner, and NO_GO for each bad state. Include null owner, empty owner, false sign-off, failed gate, blocker, stale SHA, repeat item, and job-supplied mismatched verdict.

Also test multiple waivers. Each item must pass; one accepted item cannot cover another ownerless item. Order should not alter derivation. If two entries represent the same underlying finding, reject duplication and ask the job to emit one precise record.

The [release-gates.yaml team policy guide](/blog/release-gates-yaml-team-policy-schema) explains how set gate names and report gate results align. Check the complete report after waiver checks so missing gates cannot disappear behind an accepted gap.

## What Counts as Waiver Acceptance Evidence?

For release waiver ownership, sign-off proof should come from a trusted, authorized action. Examples include a purpose-specific pull-request review command handled by a trusted app, an approval record in a controlled release system, or a signed decision event. The exact acceptance mechanism belongs in the team rule set; the JSON report stores only the normalized outcome and ID.

Do not let pull-request code set \`accepted: true\` by editing a generated report. The trusted checker should combine untrusted findings with trusted acceptance events after verifying item ID and SHA. Generated files remain inputs, not authority.

GitHub's [protected branch documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) describes required reviews, required status checks, expected app sources, and settings that can apply protections to administrators. Use available controls so a trusted app writes the aggregate result and ordinary contributors cannot impersonate it.

Bind sign-off to a stable waiver identifier derived from item content, proof ID, and HEAD, or store an equivalent server-side record. If the line range, run, risk, or SHA changes, require new sign-off. Avoid mutable comment text as the only key.

The release waiver ownership record should show who accepted, what they accepted, and which proof they reviewed. A timestamp may be useful in the trusted sign-off store, but adding it to the core report requires schema evolution. Keep optional ops metadata outside the required object until consumers support it.

OWASP lists Inadequate Identity and Access Management, Insufficient PBAC (Pipeline-Based Access Controls), Poisoned Pipeline Execution, and Insufficient Logging and Visibility among CI/CD concerns in its [CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html). Apply least privilege to waiver readers, event writers, file access, and status publication.

Do not expose private sign-off details in public files. The normalized owner ID and accepted state may be enough for the report, while protected systems retain sign-in and audit records. Follow repo privacy and retention rules.

## Integrate Waivers With Quality Gates

Waivers are evaluated after all set gates and do not replace required suites, type checks, scanner deltas, schema change proof, or risk-map review. The central checker first determines whether blockers or failed gates exist, then checks whether remaining allowed items have valid sign-off.

SonarQube describes a quality gate as a set of conditions evaluated against analysis in its [quality-gate documentation](https://docs.sonarsource.com/sonarqube-server/2026.1/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates). If a Sonar condition feeds \`static.new_security_findings\`, preserve its analysis ID and SHA. Do not convert a failed condition into a waiver unless committed team rule set defines that path.

Use the exact repo gate names:

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

The destructive-migration field requires a waiver for drop or narrowing operations under the reference. That requirement does not negate \`migration_rollback_documented\`. Both gate results appear, and a missing down path or deploy note still fails its own gate.

Flaky tests also remain clear. Under a quarantine-lane rule set, quarantined failures report without blocking, while non-quarantined failures block. Repeated retries without diagnosis should not create a waiverable label. Preserve attempts and class proof.

The [dependency API usage review](/blog/dependency-upgrade-changelog-api-usage-release-review) can produce blockers when official release proof is missing or a used API changed. An owner cannot waive a fact the team rule set classifies as failed required proof merely by accepting package risk.

For release waiver ownership, expose one aggregate protected status derived from the checked report. Individual jobs may also remain required, but team members should know which aggregate status applies the rule set and validates waiver acceptance. Give it a unique name and trusted source.

## Track Fix Without Hiding Accepted Risk

GO_WITH_WAIVERS should remain distinct in reports, release records, and metrics. Do not render it as ordinary green GO. The accepted item stays in \`waivers\`, while \`to_reach_go\` explains how a later change can remove it.

Teams often need end date or follow-up ownership. The core contract does not include an end date field, so store lifecycle data in an issue, release system, or separately versioned extension. Link it by stable waiver ID. Do not add ad hoc keys that a strict report schema will reject.

Fix ownership may differ from sign-off ownership. One person accepts release risk; another team implements a test or code change. Keep both clear in the ops tracker. The report's \`owner\` remains the named person accepting the waiver for that release.

Review recurring waivers as rule set or test-design signals. Repeated sign-off of the same debug path may justify adding the missing assertion, changing class through rule set review, or removing obsolete code. Do not auto-renew based on history; each release and SHA needs current proof.

Use the [machine-verifiable report tutorial](/blog/machine-verifiable-no-go-release-report-json) to keep accepted items clear in JSON and Markdown. Its strict verdict derivation prevents a stale or unresolved waiver from appearing as GO.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) can host report files and protected checks. Set retention long enough for the team's audit period while keeping sensitive logs access controlled.

## How Does a Release Governance Audit Keep Risk Clear?

Release waiver ownership needs an auditable trail because the report captures a deliberate gap, not a passing measurement. Preserve the checked JSON, human view, rule set revision, proof references, trusted acceptance event, and protected-check result under the team's retention rules.

An audit should reconstruct the call without relying on memory. Start from \`head_sha\`, load the exact gate rule set, resolve each run and file, verify the waiver item and class, then confirm the named ID accepted that item. A missing link is an audit finding even when the release completed without an incident.

An audit of release waiver ownership should not ask whether the owner predicted each possible outcome. It should ask whether the report applied the committed rule set, presented current proof, limited the gap to an allowed item, recorded authenticated sign-off, and kept separate blockers at NO_GO.

Use a simple review table:

| Audit question | Proof to retain | Bad state |
|---|---|---|
| Which release was judged? | Base and full HEAD SHA | Branch name alone |
| What risk was accepted? | Exact waiver item and file references | General risk statement |
| Who accepted it? | Signed-in named ID | Team alias or null owner |
| Was sign-off current? | Event bound to item and SHA | Sign-off from an earlier commit |
| Did other gates pass? | Complete gate results and job runs | Missing required gate |
| What remained to fix? | Exact \`to_reach_go\` action | Empty or generic fix |

Release waiver ownership records should also support fix review. Link the accepted item to the ops tracker, but keep the report fixed for that SHA. When the test or code fix lands, create new proof showing the gap is closed rather than editing the historical waiver into a pass.

Track recurring categories without exposing private details. Repeated low-surface waivers may show a missing test pattern, unclear rule set, or obsolete branch. Use that signal to improve proof production through reviewed changes, never to auto-accept future items.

Treat release waiver ownership as complete only when both call and follow-up paths are clear. Sign-off explains why one release may proceed under rule set; fix explains how a later report reaches ordinary GO. Neither path permits the Guardian or its checker to approve or deploy.

Review access to historical records separately from current sign-off permissions. A person may need read access for audit without authority to accept a new waiver. Keep those roles distinct in the sign-off system and avoid granting check-writing credentials merely to support report viewing.

When a retained file becomes missing under normal expiration, preserve enough normalized proof to explain the original call under rule set. Do not rewrite the report or substitute a later run. If retention requirements demand longer access, configure that before relying on the file as sign-off proof.

Audit samples should include ordinary GO and NO_GO reports as controls. Comparing only waived releases can miss a validator that always records owner data or a status publisher that renders each terminal result alike. The derived verdict, clear label, and protected status should remain consistent for all three outcomes.

Periodically verify that retained owner IDs still resolve to the signed-in event recorded at call time. ID-directory changes should not alter the fixed report, but the audit system should preserve the original identifier and explain any later account rename or deactivation.

## Adopt Named Acceptance on the Next Release

Begin with one allowed waiver class, such as a low-surface changed-line test reach gap. Define its proof shape, allowed owners, sign-off event, SHA binding, and validator tests. Keep each other unknown or failed state at NO_GO while the means matures.

Run dry examples for accepted, rejected, ownerless, stale, repeat, and blocker-containing reports. Confirm the protected check reaches a terminal result and links to both human and JSON views. Verify that pull-request code cannot manufacture an allowed sign-off event.

Use the phrase release waiver ownership in runbooks and check error text so contributors can find the governing process. Explain that owners accept one item, not the whole diff, and that GO_WITH_WAIVERS remains distinct from GO.

For the next release gap, run the [AI Release Guardian](/skills/thetestingacademy/ai-release-guardian), classify the finding from proof, and require a waiver accepted by a named owner before the derived verdict can change. That real QASkills route supplies the report contract and non-sign-off guardrails used here.

## Frequently Asked Questions

### Can a team or mailing list own a release waiver?

The assigned contract requires a non-null owner, and this guide recommends one named allowed person for sign-off. A team or queue can own fix, but shared identity weakens accountability for the release call. Store the named owner in the report and team assignment in the follow-up system.

### Does accepting a waiver turn its gate result into pass?

No. The item remains clear as accepted risk, and separate gate results retain their measured status. GO_WITH_WAIVERS is distinct from GO. A waiver can apply only to a class allowed by rule set; it cannot rewrite a failed required gate or erase a blocker.

### Must sign-off be renewed after each commit?

Renew when the judged HEAD or relevant proof changes. A new commit can alter the item, blast radius, tests, or test reach even within the same pull request. Bind sign-off to waiver ID and SHA, then reject stale records rather than guessing whether earlier intent still applies.

### Can urgent business need justify waiving a blocker?

Not under the assigned Guardian contract. Urgency is a human tradeoff but does not soften NO_GO or change blocker class. Teams can revise rule set through its reviewed process, yet one release report must apply the committed rules and present missing proof or failed gates honestly.

### Should waiver records include an end date?

End date is useful for fix tracking, but the core report object contains item, owner, and accepted. Store end date in a linked ops record or introduce a reviewed schema extension supported by each consumer. Never add an unrecognized field to a strict contract during one release.

### Who is allowed to set accepted to true?

Only a trusted adapter should normalize an authenticated action from an authorized human into \`accepted: true\`. Pull-request code and report jobs must not self-approve. Team rule set defines eligible owners, while branch protection and least-privilege credentials protect the event and aggregate status paths.
`,
};
