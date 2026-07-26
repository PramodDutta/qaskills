import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Destructive tool confirmation testing',
  description:
    'Destructive tool confirmation testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'AI Testing',
  primaryKeyword: 'Destructive tool confirmation testing',
  keywords: [
    'Destructive tool confirmation testing',
    'how to destructive tool confirmation testing',
    'destructive tool confirmation testing example',
    'agent human approval test',
    'confirm destructive function call',
    'stale tool consent rejection',
  ],
  relatedSlugs: [
    'how-to-test-llm-tool-calling-accuracy',
    'agent-tool-use-regression-testing-guide-2026',
    'ai-agent-eval-testing-guide',
    'testing-agent-permission-boundary-violations',
  ],
  sources: [
    'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
    'https://platform.openai.com/docs/guides/function-calling',
    'https://www.nist.gov/itl/ai-risk-management-framework',
  ],
  repoEvidence: [
    'seed-skills/ai-system-quality-engineer/SKILL.md',
    'seed-skills/ai-release-guardian/SKILL.md',
  ],
  content: `Destructive tool confirmation testing gives each approved act a fresh, one-use consent record that names the act, target, scope, and end time. The test passes only when an exact match lets one fake tool run, while vague, stale, used, old, or mismatched consent asks again and leaves the safe resource unchanged.

## What must Destructive tool confirmation testing prove?

Destructive tool confirmation testing must prove that access and fresh consent are two distinct gates. A user may have the right to delete an item but still lack consent for the exact delete plan now shown, requiring independent authorization evidence for the current proposal.

The pass path starts with a clear view of the planned act and ends with one fake tool run. The consent record must match the act, target, scope, ask ID, and set clock before the gate can use it, with canonical proposal serialization binding every displayed parameter.

Each mismatch should make a clear new consent ask, not a guess about what the user meant. The fake item, run count, and consent log must show that no delete effect took place in that case, preserving observable nonexecution across every rejection classification.

Fresh means the user gave consent after the current plan was made and before its short time window closed. Scoped means it cannot allow some other target, act, tenant, batch, or broad wildcard, preventing privilege expansion through ambiguous parameter interpretation.

One use means a good tool run marks the consent as used in the same safe step. A second ask with that token must fail even when all other fields still match the plan, requiring atomic consumption under concurrent execution.

The [OpenAI function calling guide](https://platform.openai.com/docs/guides/function-calling) splits model tool calls from tool output made by the app and joins them with call IDs. The app, not model prose, must check consent state before it calls any risky tool code, retaining deterministic correlation across proposal, confirmation, execution, and receipt events.

The [OWASP Excessive Agency guidance](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/) names too much tool power, access, and free choice as root causes. A fresh consent gate cuts that free choice, but it does not replace least access or input checks, so authorization layers remain independently testable.

This scope starts after the access check passes for the user. The [permission boundary guide](/blog/testing-agent-permission-boundary-violations) covers whether the caller may use the act at all.

Use the [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) for tool choice and input shape. Here, the planned tool call is valid but cannot run until the app stores a human match for that exact plan.

## Which repository behavior defines the test contract?

The repo has no consent service, so this guide must not claim that one is live. Instead, two skill files give safe-use rules that the new state flow turns into facts a test can see, clearly separating repository evidence from proposed implementation details.

\`seed-skills/ai-system-quality-engineer/SKILL.md\` says tools with side effects should run in dry-run mode or a safe box for checks. It also asks tests to check tool ID, schema, step order, step cap, and final state, establishing deterministic execution invariants before model evaluation.

That rule shapes the test rig gate. All risky tool code becomes a fake that logs calls, while a separate safe-item copy proves the base state never changes in fail cases, providing measurable isolation from production resources.

\`seed-skills/ai-release-guardian/SKILL.md\` says the guard gives advice but never merges, ships, tags, or grants consent. It also treats lost proof as a no-go, not as an unknown state that can pass, supporting explicit rejection when confirmation evidence is unavailable.

Apply that rule to consent proof in each case. A missing, unreadable, vague, or unmatched record must ask for consent again, and no agent-made line can stand in for the human choice, preserving trusted-origin verification at the security boundary.

The input rules hold a plan ID, act, set target, small scope, issue time, and ask owner. The consent adds a nonce, user ID, consent time, end time, and exact hash of the plan shown, enabling replay detection and audit reconstruction.

The output is one clear state, such as \`executed\`, \`needs-confirmation\`, or \`rejected\`. Add one stable reason to each state that did not run, and one tool-run receipt to the pass path, with mutually exclusive terminal classifications for reliable aggregation.

The trace should keep plan, call, and consent IDs without storing user text that is not needed. The [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) can add step-path and end-state checks around these exact state changes, while privacy minimization limits diagnostic retention.

Destructive tool confirmation testing succeeds when a reviewer can show why one fake act ran and why each close case did not. The final assistant words matter less than the plan, consent, log, and receipt facts, because structured evidence supports reproducible authorization decisions.

## How to destructive tool confirmation testing?

How to destructive tool confirmation testing starts with a pure match function and an in-memory log. Keep time, IDs, and plan hashes fixed, so each pass or fail can be run again with the same facts, independent of conversational wording or provider variability.

Put targets in one set form before you show the consent ask, then freeze the plan. Never turn consent text into a wider target after the user has seen and approved a smaller one, since canonicalization must precede approval and signature creation.

Store consent as data rather than scan chat text for words such as "yes." The record must point to the exact fixed plan and hold an end time plus a nonce that can be used once, creating verifiable freshness, scope, and replay semantics.

Run the access check before you ask for consent, then run key access checks again just before the fake tool call. A role or item rule may change while the consent screen stays open, so authorization revocation must override earlier confirmation.

The first TypeScript and Vitest sample uses a fake risky tool and a fixed clock. It shows the pass path while it keeps the repo's safe-box rule and leaves all real files alone.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';

type Proposal = {
  id: string;
  action: 'delete-file';
  target: string;
  scope: 'single-file';
  digest: string;
};

type Consent = {
  proposalId: string;
  digest: string;
  approvedAt: number;
  expiresAt: number;
  nonce: string;
  consumed: boolean;
};

function confirmAndRun(
  proposal: Proposal,
  consent: Consent,
  now: number,
  execute: (target: string) => void,
) {
  const matches =
    consent.proposalId === proposal.id &&
    consent.digest === proposal.digest &&
    consent.approvedAt <= now &&
    now < consent.expiresAt &&
    !consent.consumed;

  if (!matches) return { state: 'needs-confirmation' as const };
  consent.consumed = true;
  execute(proposal.target);
  return { state: 'executed' as const, nonce: consent.nonce };
}

describe('fresh scoped confirmation', () => {
  it('executes the exact fake action once', () => {
    const execute = vi.fn();
    const proposal: Proposal = {
      id: 'proposal-7',
      action: 'delete-file',
      target: '/sandbox/report.txt',
      scope: 'single-file',
      digest: 'sha256:exact-proposal',
    };
    const consent: Consent = {
      proposalId: proposal.id,
      digest: proposal.digest,
      approvedAt: 1_000,
      expiresAt: 1_300,
      nonce: 'nonce-9',
      consumed: false,
    };

    expect(confirmAndRun(proposal, consent, 1_100, execute)).toEqual({
      state: 'executed',
      nonce: 'nonce-9',
    });
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith('/sandbox/report.txt');
    expect(consent.consumed).toBe(true);
  });
});
\`\`\`

The plan hash binds all fields shown to the user, not just the target string. If the act or scope changes, make a new plan and ask for a new consent record before any run, preventing post-approval mutation of security-sensitive parameters.

In a live service, mark consent used and run through one safe state gate or a repeat-safe work flow. The unit test can model this with one log step and two calls that race, verifying transactional consumption and idempotent receipt generation.

Do not use a live path as an easy test target. The [agent tool regression guide](/blog/agent-tool-use-regression-testing-guide-2026) supports wider flows, while this small suite should stay cut off from all real items.

## Destructive tool confirmation testing example: scenario and assertion matrix

A destructive tool confirmation testing example needs close states around one valid plan. If each fail row changes the act in a broad way, small replay and scope bugs can stay out of sight.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Fresh exact approval | Matching proposal digest before expiry | Fake executes once and nonce is consumed | No receipt or duplicate call | Repository sandbox rule |
| Vague chat reply | Text says yes without consent record | New structured confirmation requested | Prose authorizes execution | Guardian missing-evidence rule |
| Target mismatch | Consent covers file A, proposal names file B | Mismatch reason, zero fake calls | Approval crosses targets | Application consent contract |
| Expired approval | Clock equals or exceeds expiry | Expired reason, unchanged resource | Old consent still runs | Deterministic clock |
| Replayed nonce | Accepted consent is submitted again | Replay reason, execution count stays one | Second destructive call runs | Single-use ledger |
| Wider scope | Single-file consent applied to directory delete | Scope reason and new proposal | Narrow consent expands | OWASP autonomy guidance |

Run the exact consent first and check for one receipt. This proves the fake, log, clock, and match code can reach the pass state before fail rows test each block path, establishing fixture validity before negative-case interpretation.

The vague reply row should have a real yes-style phrase but no set consent record. The test must ignore those words and ask the consent gate for proof that maps to the plan, enforcing trusted-channel attribution instead of linguistic inference.

Target mismatch needs targets in a set form. Compare stable item IDs when you can, since aliases and short paths may make two strings name the same item or one string name a new one, requiring canonical identity before digest comparison.

At the end-time gate, state if an equal clock value can pass. This sample needs \`now < expiresAt\`, so equality is old consent and has one clear fail case.

The replay row should call the match code twice with the same record. Check that the first receipt stays the same and the fake tool run count can never rise past one, proving atomic replay prevention and deterministic reconciliation.

The [permission boundary guide](/blog/testing-agent-permission-boundary-violations) stays as a distinct layer in this grid. Valid consent cannot grant an act that the access check denies for that user and item.

Store plan, consent, and receipt IDs in the case log. Destructive tool confirmation testing should explain each block without keeping free chat text or the contents of the safe item.

## What failures expose agent human approval test?

An agent human approval test fails when assistant words become the source of trust. Only a consent record made by the trusted user gate should pass the match code and reach the fake tool.

Vague consent includes "go ahead," "do it," or a bare yes with no plan hash. Those phrases may sound clear to a person, but the app cannot prove which queued act or target they cover.

Stale consent includes a record for an old plan, old session, or changed target. Test the same words with distinct plan IDs, so a close text match cannot hide old state from the gate.

Old consent uses a fixed clock one tick before, right at, and one tick after the end time. These three cases catch an inclusive gate bug and keep the test report clear.

Used consent is a state-flow bug when it can pass twice. The first call may pass as planned while a second call gets through because the log reads \`consumed\` too late.

Two calls at once make that race clear in a short test. Start both match calls for one nonce and require one receipt, one fake run, and one used-consent result.

The fail sample below uses a table to keep the safe-state copy. Each row must return \`needs-confirmation\` and keep both the tool run count and consent state at their planned values.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it.each([
  ['wrong target', { proposalId: 'p1', digest: 'digest:file-a', approvedAt: 10, expiresAt: 50, nonce: 'n1', consumed: false }],
  ['expired', { proposalId: 'p2', digest: 'digest:file-b', approvedAt: 10, expiresAt: 20, nonce: 'n2', consumed: false }],
  ['replayed', { proposalId: 'p2', digest: 'digest:file-b', approvedAt: 10, expiresAt: 50, nonce: 'n3', consumed: true }],
])('rejects %s consent without executing', (_name, consent) => {
  const execute = vi.fn();
  const proposal = {
    id: 'p2',
    action: 'delete-file' as const,
    target: '/sandbox/file-b',
    scope: 'single-file' as const,
    digest: 'digest:file-b',
  };
  const protectedState = ['file-a', 'file-b'];

  expect(confirmAndRun(proposal, consent, 30, execute)).toEqual({
    state: 'needs-confirmation',
  });
  expect(execute).not.toHaveBeenCalled();
  expect(protectedState).toEqual(['file-a', 'file-b']);
});
\`\`\`

The wrong-target row binds a new hash, while the old and used rows keep the exact target. Distinct rows make the failed match clear without showing any real delete data or private file text.

Add a changed-act row where the target stays fixed but \`delete-file\` becomes \`delete-directory\`. The hash match must fail before the fake tool code can see or run that request.

Remove access after consent but before the tool run. The result should be \`rejected\`, not \`needs-confirmation\`, since fresh consent cannot fix an access right that is now gone.

The [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) can check act inputs before this gate. Destructive tool confirmation testing owns the later consent state, used mark, receipt, and fake run count.

## How should confirm destructive function call run in CI?

To confirm destructive function call flow in CI, swap each side effect for a fake that logs calls and reset the log for each case. No key should let the test process reach a real delete path.

Run pure match tests first, then state-flow and race tests. Keep the browser consent view in a distinct layer that checks the shown plan fields against the signed hash.

Use a fixed clock and set test IDs that do not change. Real sleeps make end-time tests slow and may move a check past the gate at a time the test did not plan.

The report should list case ID, plan ID, act, set target hash, scope, consent state, block reason, tool run count, and receipt ID. Do not log raw secrets or target text that the test does not need, preserving diagnostic utility through privacy-aware minimization.

Fail CI on lost consent, vague text that passes, target mismatch, wider scope, old records, reuse, repeat receipts, lost access, or zero found cases. Skipped race tests must stay clear in the report and count.

Run at least one two-call race many times under a fixed start gate. The core rule is one used nonce and one tool run, no matter which call wins the race.

NIST describes its [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) as voluntary guidance for trust in design, build, use, and tests. Case logs and reviewed owners make this gate easy to audit without a false claim that NIST sets one consent time limit, translating governance principles into reproducible engineering evidence.

Use the [agent regression guide](/blog/agent-tool-use-regression-testing-guide-2026) to place the gate before any safe-box tool run. A live-like end-to-end test should still use items that can be reset and accounts kept apart.

Destructive tool confirmation testing blocks release when untrusted or stale state reaches the fake tool. View bugs also block when users cannot see the exact act, target, scope, or end time they are asked to approve.

## Which assertions verify stale tool consent rejection?

Stale tool consent rejection needs more than a check that some error exists. Check which match failed and prove no later tool run state, receipt, or item change was made.

Check the plan ID and hash first. A mismatch must stop before end time, reuse, or access checks can yield a wrong main reason in the case report, preserving deterministic validation precedence across failure categories.

Check the set form of act, target, and scope in the hash. Unit tests should change each field on its own and show that each change makes the old consent fail.

Check that consent time is not in the future and that end time is after consent. Then test the set pass gate with a fixed clock on both sides and right at the edge, covering temporal invariants without nondeterministic wall-clock dependence.

Check that each nonce is sole and read its used state from the trusted log. Client data that says \`consumed: false\` must not override the used record stored by the server.

Check that one tool run receipt maps to one plan and one nonce. Receipt count finds repeat work even when the fake tool can take the same call twice with no new state, enabling exact transaction reconciliation after concurrent attempts.

Check that safe state stays byte-for-byte or has the same shape on each block. A returned error cannot excuse a side effect that took place before the match code was done.

Check that the consent screen matches the plan hash in all key fields. This finds a user view that shows one target but signs some other target or wider scope.

Check access just before the tool run and give that result its own label. The [AI agent evaluation guide](/blog/ai-agent-eval-testing-guide) can check step order, but this consent test must keep the access result in view, maintaining separation between authorization and confirmation diagnostics.

Check the full report after all rows have run. Tool-run, consent-needed, and blocked counts must sum to all found cases, with no repeat plan ID or lost result row.

Destructive tool confirmation testing is sound when these exact checks stay green as prompts and assistant words change. The trusted state flow, not the tone of a chat reply, decides if the fake tool may run.

## Step-by-step test implementation

Build the state machine around immutable proposals and fake execution before adding any user interface. This order makes the security boundary testable without browser timing or live resources.

1. Read \`seed-skills/ai-system-quality-engineer/SKILL.md\` and record its sandbox, valid-tool, trajectory, step-budget, and asserted-final-state requirements.
2. Read \`seed-skills/ai-release-guardian/SKILL.md\`, then define missing, vague, or unmatched consent as a blocking evidence failure.
3. Create immutable proposal, consent, and receipt shapes with canonical action, target, scope, digest, times, nonce, and consumed state.
4. Implement pure matching with a deterministic clock, then call only a recording fake after authorization and every consent comparison pass.
5. Inject vague text, target and action mismatches, expiry boundaries, replay, wider scope, revocation, and two-caller races.
6. Run the focused suite in CI, assert report and receipt cardinality, preserve safe artifacts, reset the ledger, and route failures by layer.

Start with one single-file delete in a list held in memory. A small case lets reviewers inspect each state step and check the safe copy before and after the run.

Add a plan-builder test that puts the target in set form before hash and display. The hash should change when any field shown for consent changes by even one key value.

Add a consent-view rule after the match code is stable. Check the shown act, target, scope, effect, and end time against the same fixed plan and signed hash.

Add a code change that accepts any yes-style chat line. The vague-text row should then reach the fake and fail, proving the suite guards the trusted user gate.

Add a code change that does not mark the nonce used. The reuse or race case should make two fake calls and fail on exact receipt and tool run counts.

Use the [QA skills directory](/skills) for more safety and access test plans. Keep this gate on fresh consent for one risky plan that has already passed the access check.

## Failure triage and regression ownership

Start triage with the first state step that did not match the planned case. Do not inspect model words before you check the plan, consent log, and fake tool run records.

If the shown plan differs from stored plan data, give the bug to view or wire code. No consent from that screen should be used once, much less used again.

If the hash differs while shown fields look the same, inspect set-form code and its build tag. Record both safe forms without showing the contents of the safe item.

If old consent passes, inspect the fake clock and edge match. Prove the test did not mix seconds with milliseconds before you change the rule for how long consent lasts.

If reused consent passes one call at a time, inspect log read and used state. If it fails only in a race, inspect the one-step guard and repeat-safe receipt code.

If a wider act passes, inspect which fields the hash covers. A target-only sign cannot bind act type, scope, tenant, or the effect shown to the user.

If fresh consent fails after access changed, check that the result is an access block. A new consent prompt would give the wrong cause and would not make the act safe.

If a block still changes safe state, inspect tool run order at once. The match code must finish before any step starts that cannot be rolled back in the test.

If all rows vanish in CI, give the issue to test search or filters. Lost safety proof is itself a release block under the repo guard rule, even when the job is green.

Use the [permission boundary guide](/blog/testing-agent-permission-boundary-violations) when the access check causes the stop. Destructive tool confirmation testing should own only consent match, used state, screen, receipt, and fake tool order.

## Frequently Asked Questions

### How do you prove destructive agent actions require fresh, scoped human confirmation and cannot reuse stale approval or ambiguous language?

Create a fixed plan with act, set target, scope, hash, and end time, then accept only a trusted one-use consent record for that plan. Run a fake tool. Vague text, mismatch, old state, or reuse must ask again and leave tool count plus safe state unchanged.

### What fixture best tests how to destructive tool confirmation testing?

Use one file in memory, one fixed delete plan, a fixed clock, a trusted consent log, and a fake that saves calls. Derive target, act, scope, old, reused, and vague-text cases from that control. The small state makes each planned step, receipt, and safe item easy to review.

### Which failure signal proves destructive tool confirmation testing example?

The key sign is any fake tool run with no exact fresh consent record, or more than one run for one nonce. Other signs include a wrong screen, wider scope, old consent that passes, lost block reason, repeat receipt, or safe-state change in a blocked case.

### How should CI report agent human approval test?

Report case, plan, act, target hash, scope, consent time, end time, nonce state, access result, next step, tool run count, and receipt ID. Keep free chat and safe item text out of logs. The record should show why the fake ran or why fresh consent was needed.

### When should confirm destructive function call block a release?

Block release when vague, stale, old, reused, mismatched, or broad consent reaches the tool run. Also block lost cases, repeat receipts, screen-to-hash mismatch, split used-state updates, and side effects after denial. New assistant words can pass only when trusted state and the shown plan stay exact.

### How can teams keep stale tool consent rejection repeatable?

Pin the clock, plan-form build, case IDs, and consent-log flow. Reset state per case, use fakes that save calls, and repeat fixed race tests. Review each schema or screen change with hash cases, then keep small logs that omit secrets and real delete data.

## Conclusion

Destructive tool confirmation testing turns fresh human intent into a one-use state step that tests can see. The release gate rejects vague words, stale plans, old records, scope change, reuse, lost access, and any blocked path that touches the fake tool or safe copy.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [tool calling accuracy guide](/blog/how-to-test-llm-tool-calling-accuracy) before you build this gate. This order keeps the first run safe, small, and clear for the team that owns each failed case.`,
};
