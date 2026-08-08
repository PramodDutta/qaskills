import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Copilot Workspace Test Planning: A Modern Plan-First QA Workflow',
  description: 'Use copilot workspace test planning principles in today’s GitHub agent workflow to turn issues into reviewable test maps, executable checks, and safer pull requests.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# Copilot Workspace Test Planning: A Modern Plan-First QA Workflow

Copilot Workspace test planning is a plan-first method for converting a GitHub issue into explicit risks, test scenarios, implementation steps, and verification evidence before an agent edits code. The original Copilot Workspace technical preview was sunset on May 30, 2025. In 2026, teams should apply the same planning discipline through GitHub’s current Copilot cloud-agent planning workflow, where repository research, plan review, branch changes, diff inspection, and pull-request creation remain distinct stages.

The payoff is not an AI-generated list of generic tests. It is a reviewable contract that connects each requirement to an observable example, assigns the example to the right test layer, names the fixture and oracle, and states the exact command that will run it. QA engineers should refine that contract before implementation, then compare the eventual diff and CI evidence against it.

This guide uses a shipping-quote change to show the full workflow. The examples are runnable TypeScript and Vitest artifacts, while the planning techniques apply equally to API, browser, mobile, contract, and data-pipeline work.

## Start With the Product Decision, Not “Add Tests”

An agent can search a repository, but it cannot recover a missing business decision from code with certainty. A useful issue explains the behavior in domain language and exposes decisions that would otherwise be guessed. For shipping, imagine this rule: standard shipping is free for eligible domestic baskets with a subtotal of at least 75 currency units, except oversized orders. Everything below that threshold costs 8. Express shipping always costs 18.

Before planning tests, resolve ambiguity in five dimensions: inputs, boundary, precedence, output, and failure behavior. Does 75 qualify, or only values above 75? Does oversized override the free threshold? Is an empty basket valid? Are prices represented as decimals or integer minor units? Is the quote pure, or does it depend on a remote carrier?

| Planning dimension | Decision for this example | Test consequence |
|---|---|---|
| Money model | Integer minor units | Use 7,500 for the free-shipping boundary |
| Boundary | Greater than or equal to 7,500 | Cover 7,499 and 7,500 |
| Precedence | Oversized overrides free eligibility | Add high-subtotal oversized case |
| Express | Always 1,800 | Test below and above standard threshold only if risk warrants |
| Invalid input | Negative subtotal throws | Assert exact error message |
| Side effects | None | Prefer fast unit tests, no network fixture |

The phrase “add coverage for free shipping” misses most of this table. If given that vague task, an agent may test only a happy path at 10,000 and never exercise the off-by-one boundary or precedence rule. The issue should be precise enough that a plan can be judged wrong before code exists.

A GitHub issue form can collect these decisions consistently. Save this as an issue-form YAML file in a repository that uses GitHub issue forms.

\`\`\`yaml
name: Behavior change
description: Define an observable product change and its verification
title: "[Behavior]: "
labels:
  - enhancement
body:
  - type: textarea
    id: behavior
    attributes:
      label: Observable behavior
      description: Describe inputs, outputs, errors, and precedence.
    validations:
      required: true
  - type: textarea
    id: boundaries
    attributes:
      label: Boundaries and counterexamples
      description: List values immediately below, at, and above key boundaries.
    validations:
      required: true
  - type: textarea
    id: verification
    attributes:
      label: Required verification
      description: Name relevant test layers and commands if known.
    validations:
      required: true
\`\`\`

This does not force product managers to design test code. It ensures the issue contains enough observable truth for QA and the agent to develop a plan.

## Research the Repository Before Asking for a Plan

The retired Workspace experience emphasized a task-oriented path from issue to plan to implementation. GitHub’s current cloud agent supports repository research and explicit plan creation before changes. Use the research stage to discover conventions, not to begin editing prematurely.

Ask focused questions in sequence. Where is shipping price calculated? Which public function or endpoint exposes it? What numeric convention represents money? Which existing tests cover delivery modes? What commands does CI execute? Which fixtures already model oversized items? Are there repository instructions for agents?

The answers should include file paths and evidence. If the agent says “shipping probably lives in the checkout service,” ask it to identify the symbol and callers. If it proposes Playwright tests for a pure calculation, ask why a slower browser layer is necessary.

| Research target | Evidence expected | Planning use |
|---|---|---|
| Behavior owner | Public function, route, or component | Select the assertion boundary |
| Existing coverage | Test files and named scenarios | Avoid duplication and find gaps |
| Data builders | Fixture factories and defaults | Reuse valid representative data |
| Test runner | Package scripts and CI workflow | Use real commands and flags |
| Change surface | Callers and dependent types | Estimate regression radius |
| Instructions | Repository agent guidance | Respect local conventions |

For the example, create a minimal package and verify its current behavior. The production module has no free-shipping rule yet.

\`\`\`typescript
// src/shipping.ts
export type DeliveryMode = 'standard' | 'express'

export type ShippingRequest = {
  subtotalMinor: number
  oversized: boolean
  mode: DeliveryMode
}

export function shippingCost(request: ShippingRequest): number {
  if (request.subtotalMinor < 0) {
    throw new Error('subtotal cannot be negative')
  }

  if (request.mode === 'express') {
    return 1_800
  }

  return 800
}
\`\`\`

Its existing tests describe the legacy contract:

\`\`\`typescript
// src/shipping.test.ts
import { describe, expect, test } from 'vitest'
import { shippingCost } from './shipping'

describe('shippingCost', () => {
  test('charges for standard delivery', () => {
    expect(shippingCost({
      subtotalMinor: 5_000,
      oversized: false,
      mode: 'standard',
    })).toBe(800)
  })

  test('charges for express delivery', () => {
    expect(shippingCost({
      subtotalMinor: 10_000,
      oversized: false,
      mode: 'express',
    })).toBe(1_800)
  })

  test('rejects a negative subtotal', () => {
    expect(() => shippingCost({
      subtotalMinor: -1,
      oversized: false,
      mode: 'standard',
    })).toThrow('subtotal cannot be negative')
  })
})
\`\`\`

Run the baseline and read the collected count:

\`\`\`bash
npx vitest run src/shipping.test.ts
npx vitest run src/shipping.test.ts -t "rejects a negative subtotal"
\`\`\`

The second command uses Vitest’s supported test-name filter. The baseline establishes that future failures are caused by the planned change rather than an already broken branch.

## Convert Requirements Into a Test Map Before Implementation

A test plan should be more specific than “update unit tests.” Build a map with requirement, counterexample, layer, fixture, oracle, and command. The map becomes the QA review surface. It also prevents the implementation agent from silently narrowing scope after encountering a hard case.

For the shipping change, the core map is:

| Scenario | Input distinction | Expected result | Primary layer |
|---|---|---|---|
| Below boundary | Standard, 7,499, not oversized | 800 | Unit |
| Exact boundary | Standard, 7,500, not oversized | 0 | Unit |
| Above boundary | Standard, 9,000, not oversized | 0 | Unit |
| Precedence | Standard, 9,000, oversized | 800 | Unit |
| Express override | Express, 9,000, not oversized | 1,800 | Unit |
| Invalid subtotal | Standard, negative value | Throws exact message | Unit |

Only add integration or browser coverage when a distinct risk exists, such as incorrect mapping from API payload to \`subtotalMinor\`, stale UI copy, or a checkout component that fails to refresh the quote. Test-layer diversity is not a goal by itself. Repeating the same calculation through three layers creates maintenance without three independent signals.

Now ask the agent to propose a plan, explicitly prohibiting edits. A useful prompt can be written in the issue discussion as ordinary prose:

> Research the current shipping quote path and propose a test-first implementation plan. Do not edit files yet. Map every acceptance rule to a named test, include 7,499 and 7,500, cover oversized precedence, preserve the negative-subtotal behavior, identify exact files, and list focused plus full verification commands. Call out any unresolved product decision.

Review the resulting plan for ordering. Tests that express the new contract should be added before or alongside the smallest production change. Focused checks should precede the full suite. Documentation or UI changes should appear only if the repository research showed they are in scope.

## Make the Plan Falsifiable

What people get wrong about agent planning is accepting a list of activities rather than a set of falsifiable outcomes. “Update shipping tests, implement logic, run CI” sounds organized but cannot be evaluated until the agent has already made broad changes. A stronger plan predicts file-level edits and named observations.

Each plan step should answer four questions:

1. What file and symbol change?
2. Which behavior becomes observable?
3. Which command checks it?
4. What result distinguishes success from failure?

For example: “Add parameterized standard-shipping cases to \`src/shipping.test.ts\` for 7,499, 7,500, and oversized 9,000. Run the file and expect the new exact-boundary case to fail before production logic changes.” That step is reviewable and supports a genuine test-first sequence.

The first implementation edit can extend the tests as follows:

\`\`\`typescript
// src/shipping.test.ts
import { describe, expect, test } from 'vitest'
import { shippingCost, type ShippingRequest } from './shipping'

describe('shippingCost', () => {
  test.each([
    { name: 'charges below the boundary', subtotalMinor: 7_499, oversized: false, expected: 800 },
    { name: 'is free at the boundary', subtotalMinor: 7_500, oversized: false, expected: 0 },
    { name: 'is free above the boundary', subtotalMinor: 9_000, oversized: false, expected: 0 },
    { name: 'charges oversized above the boundary', subtotalMinor: 9_000, oversized: true, expected: 800 },
  ])('$name', ({ subtotalMinor, oversized, expected }) => {
    const request: ShippingRequest = {
      subtotalMinor,
      oversized,
      mode: 'standard',
    }
    expect(shippingCost(request)).toBe(expected)
  })

  test('always charges for express delivery', () => {
    expect(shippingCost({
      subtotalMinor: 9_000,
      oversized: false,
      mode: 'express',
    })).toBe(1_800)
  })

  test('rejects a negative subtotal', () => {
    expect(() => shippingCost({
      subtotalMinor: -1,
      oversized: false,
      mode: 'standard',
    })).toThrow('subtotal cannot be negative')
  })
})
\`\`\`

This file should initially fail at the boundary and above-boundary cases. That red result is evidence that the new tests can distinguish legacy behavior from the requested behavior. If every new case passes before implementation, investigate whether the behavior already exists, the tests call the wrong symbol, or the expected values are ineffective.

The smallest production change is explicit about precedence:

\`\`\`typescript
// src/shipping.ts
export type DeliveryMode = 'standard' | 'express'

export type ShippingRequest = {
  subtotalMinor: number
  oversized: boolean
  mode: DeliveryMode
}

export function shippingCost(request: ShippingRequest): number {
  if (request.subtotalMinor < 0) {
    throw new Error('subtotal cannot be negative')
  }

  if (request.mode === 'express') {
    return 1_800
  }

  if (!request.oversized && request.subtotalMinor >= 7_500) {
    return 0
  }

  return 800
}
\`\`\`

The order of conditions communicates the policy: invalid input is rejected, express wins, then eligible standard orders become free. The oversized counterexample proves that a high subtotal alone is insufficient.

## Separate Agent Evidence From Agent Narrative

An agent may report that “all tests pass,” but the reviewer needs reproducible evidence. Ask for commands, exit status, collected tests, failed or skipped counts, and any warnings. Inspect the diff independently. Current GitHub Copilot cloud-agent sessions allow the user to review the diff and iterate before creating a pull request, so use that pause as a quality gate.

A compact evidence file can be generated by ordinary shell commands in CI or copied into the pull-request description:

\`\`\`bash
npx vitest run src/shipping.test.ts
npx vitest run src/shipping.test.ts -t "is free at the boundary"
npx vitest run
git diff --check
\`\`\`

Do not accept a transcript as proof if the diff changes after the transcript was produced. Evidence belongs to a commit or branch state. CI on the pull request is stronger because it evaluates the reviewed revision in a known environment.

For repositories that use GitHub Actions, a simple job can encode the required checks:

\`\`\`yaml
name: shipping-verification

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npx vitest run src/shipping.test.ts
      - run: npm test -- --run
\`\`\`

The focused command provides fast, targeted diagnostics. The full command protects against dependent behavior elsewhere. In a monorepo, replace them with repository-owned scripts rather than guessing workspace flags.

## Diagnose the Plan That Produced the Wrong Tests

A realistic failure appears when the agent implements \`subtotalMinor > 7_500\` instead of \`>= 7_500\`. Most generated cases use 10,000, so the suite passes. The exact-boundary scenario was present in the issue but vanished from the final test map during plan simplification.

Diagnosis starts with traceability, not debugging the implementation. Compare the acceptance table with the reviewed plan, then the plan with test names, then test names with collected output. The missing 7,500 row identifies a planning failure. Add the boundary case, observe it fail, correct the comparison, and preserve the scenario permanently.

A second failure occurs when the oversized rule is implemented after the free-shipping return. A 9,000 oversized order incorrectly returns zero. Again, a happy-path-only suite misses it. The counterexample forces the precedence decision into executable form.

Use this diagnosis matrix:

| Symptom | Likely cause | First check |
|---|---|---|
| New tests all pass before implementation | Ineffective oracle or behavior already exists | Inspect expected values and called symbol |
| Boundary bug reaches review | Plan omitted exact boundary | Trace requirement to named test |
| Focused suite passes, full suite fails | Unmapped dependent behavior | Research callers and shared fixtures |
| CI collects fewer tests | Discovery or naming change | Compare collected files and counts |
| Agent claims green, PR is red | Evidence came from older revision or different command | Re-run on reviewed commit |
| Test passes alone but fails in suite | Shared mutable state or environment leakage | Inspect fixtures and setup lifecycle |

The core lesson is that plans drift unless each requirement retains an identifier or unmistakable scenario name. A QA reviewer should be able to point from issue sentence to test without relying on the agent’s summary.

## Add Repository Instructions Without Freezing the Plan

Stable instructions improve repeatability. GitHub supports repository custom instructions for Copilot, and agent workflows may also read repository guidance. Keep those instructions about enduring practice: test commands, money representation, fixture policy, required boundary analysis, and prohibited shortcuts. Do not encode a one-time shipping threshold as a permanent agent rule.

An example repository instruction is concise:

\`\`\`markdown
# Testing guidance

- Use integer minor units for money in tests.
- For numeric boundaries, cover immediately below and exactly at the boundary.
- Preserve exact error assertions unless the product contract changes.
- Run the smallest relevant Vitest file before the complete suite.
- Never add skipped tests to make a required check pass.
- Report the exact commands and collected test counts.
\`\`\`

This guidance narrows routine ambiguity but does not replace issue-specific acceptance criteria. Plans must still identify the current risk, files, scenarios, and non-goals.

The [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026) explains broader supervision patterns for coding agents. The [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026) covers controlled tool access when planning requires external test systems. For a pure shipping function, repository and terminal context are sufficient. Do not expand agent permissions merely because integrations are available.

## Close the Loop at Pull-Request Review

The final plan is not complete when code exists. Close it against the diff and CI result. Reviewers should verify that planned files changed, unplanned files did not, each named scenario appears, failure assertions remain strong, and evidence corresponds to the latest commit.

Add a short pull-request checklist:

1. Requirement decisions are captured, including boundaries and precedence.
2. Research evidence names the behavior owner and existing tests.
3. The approved plan maps every rule to a test.
4. New tests demonstrated a meaningful red state where feasible.
5. Focused and complete commands pass on the reviewed revision.
6. No required test is skipped, weakened, or hidden in an uncollected file.
7. Residual risks and deliberately omitted layers are stated.

That last point prevents ritual browser testing. If the change is a pure function and the API or UI mapping is already contract-tested, say why unit coverage is sufficient. If a checkout display formats the returned minor units, add a distinct integration or component assertion for that mapping.

Copilot Workspace contributed a useful interaction idea: the plan is an editable artifact, not an invisible prelude to code generation. Its product preview is gone, but the idea remains valuable. In modern agent workflows, QA engineers gain leverage by investing review effort before a broad diff exists, then demanding executable evidence afterward.

## Plan for Failure Paths the Happy Issue Does Not Mention

Product issues often describe the successful outcome and leave operational failures implicit. During research, QA should ask which dependencies, parsers, stores, and asynchronous boundaries sit between input and result. Add a failure scenario only when the code path owns a meaningful response, such as retrying, mapping an error, preserving state, or displaying recovery guidance.

For the pure shipping function, remote carrier failure is out of scope because there is no carrier call. Inventing a mock server would test an architecture that does not exist. Negative subtotal is in scope because the function explicitly owns validation. This distinction keeps the plan grounded in repository evidence.

When a dependency does exist, specify the failure oracle as carefully as the happy path. “Handles an error” is insufficient. State whether the operation rejects, returns a typed result, logs a sanitized event, avoids a partial write, or offers a retry. Then identify which layer can observe that contract without mocking away the behavior under test.

A practical planning review asks:

1. Which failure originates inside the changed component?
2. Which failure crosses a boundary the component must translate?
3. What state must remain unchanged after failure?
4. What evidence would prove no duplicate side effect occurred?
5. Which failures belong to a lower-level contract and need not be repeated here?

This produces a proportionate negative test set. It also stops an agent from adding catch-all exception handling merely to make a planned test green. If the issue does not define the expected recovery, flag the decision and pause that plan item rather than inventing user-facing behavior.

## Estimate Test Cost in the Plan

Plans improve when they include feedback time and fixture cost. A five-second unit suite and a twenty-minute end-to-end environment should not be listed as interchangeable checks. Mark which command runs during iteration, which runs before handoff, and which runs only in CI because it requires services or credentials.

Cost also includes diagnosis. Prefer a focused contract test that identifies the violated rule over a broad browser flow that ends with “checkout failed.” Keep the broad flow when it protects system wiring, but do not use it as the first or only oracle for a pure boundary calculation. The reviewed plan should make this test pyramid decision explicit, so later implementation pressure does not silently drop the only precise check.

## Frequently Asked Questions

### Is Copilot Workspace still available in 2026?

No. GitHub’s Copilot Workspace technical preview was sunset on May 30, 2025. The relevant current path is GitHub Copilot’s cloud-agent workflow, which supports repository research, plan creation and refinement, branch changes, diff review, and pull-request creation. When teams use the phrase “Copilot Workspace test planning” today, they should treat it as the plan-first methodology associated with that preview, not as an available product surface. Check current GitHub documentation before designing organization-wide procedures because agent interfaces and eligibility can change.

### What makes an agent-generated test plan reviewable?

A reviewable plan names files and symbols, maps every acceptance rule to a scenario, specifies fixtures and exact oracles, chooses a justified test layer, and lists real repository commands. It also exposes unresolved decisions instead of guessing. The reviewer should be able to predict which new test fails before implementation and what result makes it pass afterward. Generic steps such as “add coverage” or “run CI” are activities, not evidence. Ask the agent to include boundary values, counterexamples, precedence cases, and non-goals.

### Should QA engineers ask Copilot to implement immediately after planning?

Only after a human reviews and refines the plan. Confirm that repository research is accurate, acceptance rules are traceable, commands exist, and the proposed layer matches the risk. For consequential behavior, prefer a test-first step that demonstrates a meaningful failure before production code changes. Then request implementation in a bounded branch, inspect the diff, and run focused plus full checks. Planning reduces wasted edits only when it is a real approval gate, not a decorative response the agent immediately ignores.

### How detailed should test cases be in the GitHub issue?

Capture observable business decisions and high-risk examples, especially exact boundaries, invalid inputs, and rule precedence. You do not need to prescribe every test helper or assertion style unless repository conventions require it. The issue should let QA and engineering distinguish correct from incorrect behavior without asking the agent to invent product policy. During repository research, the plan can add implementation-specific file paths, fixtures, and commands. Keep one-time requirements in the issue and stable testing conventions in repository instructions.
`,
};
