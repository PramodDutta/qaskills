import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cursor Rules Test Generation Patterns That Produce Reviewable Tests',
  description: 'Apply cursor rules test generation patterns that encode test intent, repository conventions, and verification steps so agent-written tests stay reviewable.',
  date: '2026-08-07',
  category: 'AI Testing',
  content: `
# Cursor Rules Test Generation Patterns That Produce Reviewable Tests

Effective cursor rules test generation patterns turn repeated review comments into scoped, executable guidance. Put repository-wide testing invariants in small project rules, attach framework rules only to relevant files, show one representative test pattern, and require the agent to run the narrowest useful verification command. The result is not automatic correctness. It is a controlled generation workflow in which a reviewer can see why each test exists and reproduce the evidence.

The most useful rule does not say "write comprehensive tests." It tells Cursor how this repository expresses behavior: which runner to use, where fixtures come from, what makes a selector acceptable, how state is reset, which failure paths deserve tests, and what command proves the change. Those facts remove ambiguity without freezing the agent into copying one brittle template.

This guide builds a practical rule set for TypeScript repositories, then exercises it against a real service change. The same design applies to Playwright, Vitest, Jest, Cypress, and API test suites. If you are building a broader operating model around agents, the [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026) explains where generation fits within planning, execution, and human review.

## Turn repository knowledge into a test contract

Cursor project rules are version-controlled files under \`.cursor/rules\`. A rule can be always included, attached when matching files are referenced, made available based on its description, or invoked manually. That makes rules useful for dividing stable knowledge by scope instead of placing every convention in one giant prompt.

Begin by separating invariants from preferences. An invariant protects correctness, isolation, or maintainability. A preference merely makes code look familiar. Agents need the invariant and the reason behind it. They usually do not need a page of formatting rules that a formatter already enforces.

| Repository fact | Weak instruction | Test contract with evidence |
|---|---|---|
| Tests use Vitest | "Use our test stack" | "Use Vitest imports already present in neighboring specs; run the affected spec before reporting success" |
| Time is injectable | "Avoid flaky tests" | "Use the injected clock; do not wait for wall-clock time; cover the exact expiry boundary" |
| Database state is shared | "Clean up data" | "Create records through the fixture and delete only IDs created by the current test" |
| API errors have a schema | "Test errors" | "Assert status plus stable error code; do not snapshot request IDs or timestamps" |
| UI selectors are reviewed | "Use good selectors" | "Prefer accessible roles and labels; use test IDs only where the UI has no stable user-facing identity" |

A compact base rule can state the universal contract. Cursor documents MDC files with frontmatter and Markdown content. Keep the wording direct and avoid assuming that an instruction can enforce a hard security boundary. Rules guide model behavior; tests, permissions, and CI provide enforcement.

\`\`\`mdc
---
description: Repository-wide contract for generating and changing automated tests
alwaysApply: true
---

- Read the implementation, its public types, and the nearest existing test before editing.
- Add tests for observable behavior, not private helper calls.
- Preserve the repository's current test runner, assertion style, and fixture layer.
- Include one ordinary case, one meaningful boundary, and one relevant failure path.
- Do not weaken an assertion, skip a test, or increase a timeout to make a failure disappear.
- Run the narrowest affected test command, then run the package-level check when practical.
- Report the commands run and any verification that could not be completed.
\`\`\`

This rule creates a reviewable definition of done. It does not prescribe a particular mocking library, file suffix, or command because those may differ between packages. Package-scoped rules can add those details.

## Scope framework rules to the files they can improve

An always-loaded rule for every framework wastes context and can introduce contradictory advice. A Playwright rule should become relevant when the agent works on browser specs or Playwright fixtures. A Vitest rule should attach to unit and component specs. In a monorepo, nested \`.cursor/rules\` directories can place instructions close to their package.

| Rule scope | Good content | Content to keep elsewhere | Typical failure when oversized |
|---|---|---|---|
| Repository-wide | Safety, evidence, naming philosophy | Full fixture APIs | Important instructions become hard to notice |
| Framework-specific | Locators, retries, mocking boundary | Product behavior | Advice leaks into unrelated suites |
| Package-specific | Commands, factories, architecture seams | Organization-wide policy | Paths become stale after package moves |
| Workflow-specific | Generation checklist and output format | Every coding standard | Manual workflow becomes hard to invoke |

Here is a browser-test rule that applies only when relevant files are in context. The glob should reflect the repository's real layout, so treat this as a pattern to adapt rather than a universal path.

\`\`\`mdc
---
description: Generate and review Playwright browser tests for customer workflows
globs:
  - "tests/e2e/**/*.spec.ts"
  - "tests/e2e/fixtures/**/*.ts"
alwaysApply: false
---

- Import test and expect from tests/e2e/fixtures/test.ts.
- Start each scenario from a fixture-defined account and tenant.
- Prefer getByRole, getByLabel, and getByText when the text is a stable product contract.
- Assert the user-visible result and one durable backend effect when the scenario changes data.
- Never use waitForTimeout as synchronization.
- Keep each test independent of execution order.
- Run: npx playwright test <changed-spec-path> --project=chromium
\`\`\`

The quoted glob and command contain no invented Cursor behavior. They are content inside your rule. Cursor decides whether an auto-attached rule is relevant from its configured scope, while Playwright interprets the command when the agent runs it.

A separate unit-test rule can encode a different isolation boundary:

\`\`\`mdc
---
description: Generate Vitest tests for TypeScript domain modules
globs:
  - "src/**/*.test.ts"
  - "src/**/*.ts"
alwaysApply: false
---

- Place tests beside the module when that is the neighboring convention.
- Use public exports; do not export internals only to test them.
- Prefer small fakes for owned ports and adapters.
- Restore spies and fake timers in cleanup.
- Use test.each only when every row expresses the same behavior.
- Run the affected test file with the package's existing test script.
\`\`\`

Notice what is absent: generic advice about descriptive names, maximal coverage, and "edge cases." A useful rule names the specific edge boundary or tells the agent where to discover it.

## Make the agent inspect before it generates

The highest-leverage pattern is a discovery gate. Test generation fails when the agent sees only a function and invents the surrounding conventions. Require a brief inspection pass: nearest tests, public interface, fixture definitions, package scripts, and recent changes touching the same subsystem.

The prompt can ask for a test inventory before allowing edits:

\`\`\`text
Inspect src/billing/calculate-renewal.ts and the nearest related tests.
Before editing, summarize:
1. Observable branches and boundary values.
2. Existing fixture and assertion conventions.
3. Dependencies that should be real, faked, or mocked, with reasons.
4. The smallest commands that can verify the new tests.

Then propose a test matrix. Do not modify files until the matrix has no duplicate rows.
\`\`\`

This is not ceremony. It exposes misunderstandings while they are cheap. If the agent claims a database must be mocked but existing tests use a Testcontainers fixture, the reviewer can correct the plan before receiving 200 lines of incompatible tests.

Use a test matrix that maps risks to observations. Coverage percentages do not communicate this relationship.

| Risk or contract | Setup | Action | Durable observation | Bad substitute |
|---|---|---|---|---|
| Trial expires at the boundary | Clock fixed at exact expiry | Calculate renewal | Paid price applies | Assert private date helper call |
| Coupon is tenant-scoped | Coupon belongs to another tenant | Calculate renewal | Stable rejection code | Snapshot whole error object |
| Currency rounding is deterministic | Amount has fractional minor unit | Calculate renewal | Exact integer minor units | Use close-to comparison |
| Disabled plan cannot renew | Plan marked disabled | Request renewal | No invoice is created | Only assert HTTP status |

The generation prompt should name the matrix row it is implementing. That creates traceability between intent and code, especially when an AI agent produces a large diff.

## Give examples that teach decisions, not copy-and-paste shapes

One representative example is often more valuable than ten prose rules. The example should reveal a decision: use the injected clock, create owned data through a builder, assert a stable code, and verify a side effect. Avoid enormous golden files because agents can imitate incidental details.

Suppose the production boundary looks like this:

\`\`\`ts
export type RenewalInput = {
  planId: string;
  accountId: string;
  now: Date;
};

export type RenewalResult =
  | { kind: 'renewed'; invoiceId: string; amountMinor: number }
  | { kind: 'rejected'; code: 'PLAN_DISABLED' | 'ACCOUNT_BLOCKED' };

export interface RenewalService {
  renew(input: RenewalInput): Promise<RenewalResult>;
}
\`\`\`

An example test can show what "observable" means without overfitting implementation details:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { buildRenewalHarness } from './testing/build-renewal-harness';

describe('renewal', () => {
  it('rejects a disabled plan without creating an invoice', async () => {
    const harness = buildRenewalHarness();
    const plan = await harness.givenPlan({ status: 'disabled' });
    const account = await harness.givenAccount({ status: 'active' });

    const result = await harness.service.renew({
      planId: plan.id,
      accountId: account.id,
      now: new Date('2026-08-07T10:00:00Z'),
    });

    expect(result).toEqual({ kind: 'rejected', code: 'PLAN_DISABLED' });
    expect(harness.invoices.created).toHaveLength(0);
  });
});
\`\`\`

The rule should explain why this is the reference: the test makes its time explicit, owns its setup, and observes both the result and absence of a side effect. It should not say every test must use exactly four blank lines or the variable name \`harness\`.

What people get wrong is treating examples as a source-code macro. An agent then reproduces a service harness in a component test or asserts "no invoices" in a read-only calculation. A rule needs a selection principle: copy the isolation and observation strategy, not the surface syntax.

## Split generation into behavior, implementation, and mutation review

A reliable workflow uses three passes. First identify behaviors. Then write tests. Finally review the diff as if it came from an unfamiliar contributor. Asking for all three in one broad message encourages the model to rationalize its own output.

| Pass | Agent task | Reviewer question | Exit signal |
|---|---|---|---|
| Behavior model | Build a finite risk-based matrix | Are important contracts missing or duplicated? | Matrix approved |
| Test implementation | Add the smallest tests for selected rows | Does each assertion fail for the intended defect? | Focused suite passes |
| Mutation review | Challenge tests by proposing plausible code changes | Would a false positive survive? | Weak assertions revised |

For the third pass, do not require a mutation-testing product if the repository does not have one. Ask the agent to reason through concrete mutations and, where safe, temporarily demonstrate one locally before reverting it. The source tree should end with production code intact.

\`\`\`text
Review only the test diff. For each new test, name one plausible production mutation
that should make it fail. Flag assertions that would still pass if the implementation:
- returned a hard-coded success result,
- skipped the persistence call,
- used the wrong tenant,
- changed the boundary from inclusive to exclusive.

Do not edit production code. Tighten tests only when the risk is part of the approved matrix.
\`\`\`

This prompt catches a common AI-generated pattern: a test invokes the subject, then asserts that its input fixture still exists. The code executes, coverage rises, and no product behavior is actually verified.

## Require verification evidence without overloading the prompt

Rules should define an evidence ladder. The narrow command gives fast feedback. The package command catches shared types and setup. A broader CI workflow provides the final integration signal. An agent should never claim all tests pass when it ran only one file.

Use repository scripts rather than inventing commands in prose. A small checked-in helper can make the intended path unambiguous:

\`\`\`json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  }
}
\`\`\`

Then write a rule that tells the agent how to choose, not a made-up flag:

\`\`\`mdc
When changing a unit spec:
1. Run the affected file using the existing test:unit script and supported arguments.
2. Run the package typecheck after imports or public types change.
3. If shared fixtures changed, run every suite that imports that fixture.
4. In the final response, distinguish passed, failed, and not-run checks.
\`\`\`

Verification output should be summarized, not pasted by the thousand-line. Ask for command, result, and relevant failure. For CI-only dependencies, the honest result may be "not run locally because the service is unavailable." That is more useful than a green-sounding conclusion based on no execution.

## Diagnose the realistic failure: passing tests that verify the mock

Consider a generated test for a payment retry service. The agent mocks \`chargeCard\` to reject twice and resolve once, invokes the service, and asserts that the mock was called three times. The test passes even if the service returns the wrong receipt, records no attempt history, or retries a non-retryable decline. It verifies the scripted mock more strongly than the product contract.

Diagnose this failure in four moves:

1. Remove the call-count assertion mentally. Ask what customer-visible or persisted fact remains.
2. Read the production branch conditions. Determine which error categories should and should not retry.
3. Inspect the boundary type. Find stable result fields or repository records that express the contract.
4. Introduce a plausible defect locally, such as returning the second failed attempt instead of the successful result, and confirm the test fails.

A better test can retain the interaction assertion while grounding it in an outcome:

\`\`\`ts
import { expect, it, vi } from 'vitest';

it('returns the successful receipt after retryable gateway failures', async () => {
  const charge = vi.fn()
    .mockRejectedValueOnce({ kind: 'temporary', code: 'TIMEOUT' })
    .mockRejectedValueOnce({ kind: 'temporary', code: 'UNAVAILABLE' })
    .mockResolvedValueOnce({ receiptId: 'receipt-42' });
  const attempts: Array<{ outcome: string }> = [];
  const service = createPaymentService({ charge, attempts });

  const result = await service.pay({ orderId: 'order-7', amountMinor: 2500 });

  expect(result).toEqual({ kind: 'paid', receiptId: 'receipt-42' });
  expect(attempts.map((attempt) => attempt.outcome)).toEqual([
    'temporary-failure',
    'temporary-failure',
    'success',
  ]);
  expect(charge).toHaveBeenCalledTimes(3);
});
\`\`\`

The call count is now supporting evidence, not the sole oracle. A companion test should prove that a permanent decline is not retried. Do not generate every permutation unless the matrix shows a distinct risk.

## Keep rules healthy as the repository changes

Rules are code-adjacent assets. They can become stale, contradict neighboring rules, or direct the agent to commands that no longer exist. Give them owners and review them alongside the test infrastructure they describe.

| Trigger | Rule maintenance action | Verification |
|---|---|---|
| Runner migration | Update imports, commands, and examples | Generate one representative test in a scratch branch |
| Fixture API change | Replace old setup pattern | Search rule files for removed identifiers |
| Directory move | Adjust globs and referenced paths | Open a target file and confirm the rule is available |
| Flaky-test incident | Add the narrow causal guardrail | Reproduce the old failure before accepting wording |
| Repeated ignored instruction | Make it specific or split it | Ask Cursor to restate applicable constraints before editing |

Do not solve every mistake by adding another sentence to an always-loaded file. Sometimes the right fix is a linter, a typed fixture, a test builder, or a CI check. If a rule says "never import from internal adapters," an ESLint boundary rule can enforce that invariant deterministically. Keep the Cursor rule as an explanation and let tooling be the gate.

The official Cursor rules documentation is available at https://docs.cursor.com/context/rules. Recheck it when changing rule metadata or relying on a newly introduced behavior. Project rules are an integration surface that can evolve.

## Connect rules to tools without confusing guidance and access

Rules tell an agent how to work. Tools give it access to browsers, issue systems, databases, or test services. Model Context Protocol servers can extend that access, but they do not make a vague test objective precise. Define the test contract first, then expose the minimum useful tools.

For example, a browser automation tool can help inspect an accessibility tree before generating selectors. A database tool can verify a durable side effect. Neither should receive production credentials just because the rule asks for realistic data. Use a dedicated test environment, read-only access where sufficient, and explicit approval boundaries.

| Need | Rule contribution | Tool contribution | Control |
|---|---|---|---|
| Stable UI locator | Prefer role and accessible name | Inspect rendered accessibility data | Test-only environment |
| API schema | State which response fields are contracts | Retrieve current schema | Pin reviewed schema artifact |
| Test data | Describe ownership and cleanup | Provision isolated records | Per-run namespace |
| Failure triage | Require evidence bundle | Read trace or CI log | Redact secrets and tokens |

The [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026) covers that separation in depth. Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when a reusable workflow is a better fit than another always-loaded repository rule.

## Use a pull-request checklist that reviews the rule and its output

A rule change is incomplete until someone inspects what it causes an agent to produce. Review the wording, then run a small generation exercise against a known module. The exercise should contain a tempting trap, such as an unstable timestamp, a private helper, or a shared database record.

Use this acceptance checklist:

- The rule has one clear scope and no conflicting instruction in a broader location.
- Every named path, script, fixture, and import exists in the branch.
- The rule says what evidence to collect and prohibits misleading success claims.
- The example teaches an isolation or observation decision.
- The generated test fails under at least one plausible implementation defect.
- The final diff contains no unexplained production edits.
- The reviewer can connect each test to a risk in the matrix.

The goal is not to make Cursor generate the same code every time. It is to constrain the important decisions while preserving room to respond to the module under test. When rules encode discovery, risk selection, isolation, durable assertions, and verification, agent-generated tests become smaller, more relevant, and much easier to trust.

## Prove a rule change with a controlled prompt benchmark

A rule should earn its place by changing observable output. Before editing it, save three to five compact prompts that represent the failure you want to prevent. Include one ordinary case, one boundary case, and one misleading case that tempts the agent toward the old mistake. Keep the implementation files and repository revision fixed while comparing the old and new rule. Otherwise a source change may be mistaken for an instruction improvement.

For a clock-related rule, the ordinary prompt might request expiry coverage, the boundary prompt might target the exact expiry instant, and the misleading prompt might mention waiting two seconds. Score whether the generated patch uses the injected clock, preserves the exact boundary, avoids real waiting, and reports the focused command. Do not score prose fluency. The artifact and execution evidence are what matter.

Run each prompt more than once when the behavior is important. Agent output varies, so one compliant sample can hide an unstable instruction. Record the number of runs that produce a runnable patch, choose the intended fixture, preserve the oracle, and stay inside the requested files. A useful rule improves those decisions consistently without causing unrelated test tasks to inherit irrelevant constraints.

Keep benchmark results lightweight. A review note can list the prompt identifier, active rule, changed files, focused command, and pass or failure reason. Preserve one rejected output when it illustrates the original problem. Reviewers can then see why a sentence was added instead of accepting a vague claim that the agent performs better.

When the revised rule still fails, inspect the failure category before adding more text. If Cursor never received the rule, fix its location or scope. If the agent received two conflicting instructions, remove the conflict. If it knows the convention but the repository API makes the safe path difficult, improve the fixture or helper. If the requested behavior is ambiguous, fix the task specification. These are different systems problems and should not be collapsed into increasingly forceful wording.

Retire benchmark cases when the underlying repository feature disappears, but keep a stable core that covers the most expensive mistakes. Over time, the prompt set becomes a regression suite for the team’s agent guidance. It cannot prove every future generation correct, yet it gives rule changes the same discipline expected from changes to test infrastructure: a defined failure, a bounded intervention, reproducible observations, and an explicit decision about whether the result improved.

## Frequently Asked Questions

### Should every testing rule in Cursor use alwaysApply?

No. Reserve always-applied rules for repository-wide invariants such as not weakening assertions, preserving test independence, and reporting verification honestly. Framework APIs, fixture paths, selector conventions, and package commands are better in scoped rules because they are irrelevant elsewhere and consume context. If an instruction is used only during a special audit, a manually invoked workflow may be clearer. Confirm rule attachment by opening a representative target file and checking that the relevant guidance is available before judging the wording itself.

### How many examples should a test generation rule include?

Usually one small representative example per important testing style is enough. Choose an example that demonstrates a decision the agent cannot infer from syntax alone, such as using an injected clock or asserting both an API result and persisted record. Several near-identical examples add noise and encourage copying incidental names. If the repository has many elaborate patterns, reference a maintained fixture or nearby canonical spec and tell the agent what feature of it to follow. Keep examples synchronized through normal code review.

### Can Cursor rules guarantee that generated tests are correct?

No. Rules improve consistency and context, but they remain instructions to a probabilistic coding agent. Correctness still comes from executable assertions, meaningful oracles, isolation, code review, and CI. A strong workflow asks which production mutation should break each test, runs the focused suite, and distinguishes actual evidence from assumptions. Put enforceable boundaries in deterministic tooling where possible. For example, use a linter for forbidden imports and CI for mandatory commands, while the rule explains why those constraints exist.

### What should I do when Cursor repeatedly ignores a testing instruction?

First confirm that the intended rule is loaded for the file and that its scope matches. Then look for conflicting rules, obsolete paths, or vague language such as "write robust tests." Rewrite the instruction as an observable action with a reason and an exit condition. If failure would create serious risk, move enforcement out of the prompt into a typed API, linter, permission boundary, or CI check. Finally, test the revised rule on a small known task so you can separate rule-loading problems from model interpretation problems.
`,
};
