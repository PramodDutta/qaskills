import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cursor Composer Test Refactoring: A Safe, Reviewable Workflow',
  description: 'Master cursor composer test refactoring with scoped prompts, characterization tests, mutation checks, and review gates that preserve behavior while cutting test debt.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# Cursor Composer Test Refactoring: A Safe, Reviewable Workflow

Cursor Composer test refactoring works best when you treat the agent as a fast change author inside a tightly specified verification loop. Give it a bounded test smell, explicit invariants, the exact commands that prove correctness, and permission to change only named files. Then inspect the diff and test the behavior, not merely the syntax. That pattern turns a vague request such as “clean up these tests” into a controlled engineering task.

The practical sequence is: establish a green baseline, freeze observable behavior, ask Cursor to propose a small refactor, run focused tests, inspect the diff, perform a deliberate fault-injection check, and only then expand to the full suite. Composer can search, edit, and use a terminal, but it cannot decide which accidental details are contractual unless you supply that judgment. The engineer owns the oracle and the merge decision.

This guide builds a runnable TypeScript example and a repeatable operating model for QA teams. It also shows how to diagnose the most dangerous failure mode in AI-assisted test cleanup: a suite that becomes prettier while losing its ability to catch defects.

## Define Refactoring Success Before Cursor Touches a Test

Test refactoring changes test structure without intentionally changing production behavior or the behavioral claims made by the suite. That definition is stricter than “all tests still pass.” Passing after a refactor only proves that the current implementation satisfies the remaining assertions. It does not prove that the agent preserved every assertion, boundary case, fixture distinction, or failure-path observation.

A useful refactoring contract contains four kinds of invariants. Behavioral invariants name the outcomes that must remain covered. Structural limits identify files the agent may edit. Execution invariants specify the commands and environment. Review invariants identify suspicious transformations, such as replacing exact assertions with truthiness checks or moving mutable state into a shared fixture.

| Contract area | Concrete instruction | Evidence to collect |
|---|---|---|
| Behavior | Preserve success, validation, and not-found cases | Test names and assertions remain traceable |
| Scope | Edit only the selected test file and a new helper | Diff contains no production changes |
| Execution | Run the focused Vitest file, then the suite | Exit codes and test totals |
| Independence | Each test must pass alone and in random order | Focused runs do not depend on predecessors |
| Sensitivity | A seeded production defect must fail a relevant test | Fault-injection result names the expected test |

Start from a small system under test. The following module validates an order and calculates a subtotal. It is self-contained and can be copied into a Vitest project.

\`\`\`typescript
// src/order.ts
export type OrderLine = {
  sku: string
  quantity: number
  unitPrice: number
}

export function orderSubtotal(lines: OrderLine[]): number {
  if (lines.length === 0) {
    throw new Error('order must contain at least one line')
  }

  return lines.reduce((total, line) => {
    if (line.quantity <= 0) {
      throw new Error('quantity must be positive')
    }
    return total + line.quantity * line.unitPrice
  }, 0)
}
\`\`\`

The first test suite is intentionally repetitive. Repetition alone is not a defect. It becomes a refactoring candidate when it obscures the different reasons each scenario exists or makes safe additions expensive.

\`\`\`typescript
// src/order.test.ts
import { describe, expect, test } from 'vitest'
import { orderSubtotal } from './order'

describe('orderSubtotal', () => {
  test('prices one line', () => {
    const lines = [{ sku: 'BOOK', quantity: 1, unitPrice: 25 }]
    expect(orderSubtotal(lines)).toBe(25)
  })

  test('adds multiple lines', () => {
    const lines = [
      { sku: 'BOOK', quantity: 2, unitPrice: 25 },
      { sku: 'PEN', quantity: 3, unitPrice: 2 },
    ]
    expect(orderSubtotal(lines)).toBe(56)
  })

  test('rejects an empty order', () => {
    expect(() => orderSubtotal([])).toThrow(
      'order must contain at least one line',
    )
  })

  test('rejects zero quantity', () => {
    const lines = [{ sku: 'BOOK', quantity: 0, unitPrice: 25 }]
    expect(() => orderSubtotal(lines)).toThrow('quantity must be positive')
  })
})
\`\`\`

Record the baseline with commands that another engineer and the agent can repeat. Use Vitest’s documented test-name filter, \`-t\` or \`--testNamePattern\`, when narrowing by name. A filename argument filters files.

\`\`\`bash
npx vitest run src/order.test.ts
npx vitest run src/order.test.ts -t "rejects zero quantity"
npx vitest run
\`\`\`

Capture more than “green.” Note the number of collected tests, skipped tests, duration, runtime version, and any warnings. A refactor that accidentally changes file naming or collection patterns can produce a green run with zero relevant tests. Always read the collection summary.

## Give Composer a Refactoring Brief It Can Verify

Cursor’s Agent tooling can inspect files, edit code, and run terminal commands. Project Rules can provide persistent repository guidance, while AGENTS.md is also supported as an instruction source. For a one-off refactor, put task-specific acceptance criteria in the prompt and stable conventions in repository instructions. Do not bury the crucial oracle in a long style guide.

A strong brief identifies the smell and desired shape without dictating every line. It also distinguishes allowed semantic edits from prohibited ones. For the order example, a good request reads like this:

\`\`\`text
Refactor src/order.test.ts only.

Goal:
- remove repeated OrderLine object construction with a local factory
- keep the four existing behavioral scenarios visible as separate tests
- preserve exact error-message assertions
- keep every test independent with fresh arrays and objects

Verification:
1. Run: npx vitest run src/order.test.ts
2. Run the zero-quantity test alone with -t
3. Report the commands, test counts, and any warnings

Do not edit src/order.ts, configuration, snapshots, or package files.
Before editing, summarize the intended diff in three bullets.
\`\`\`

That brief reduces three common agent errors. First, it prevents scope expansion into production code merely to make tests easier. Second, it protects exact exception assertions from being weakened. Third, it makes fresh test data an explicit property, avoiding hidden coupling through shared objects.

Prompt quality is not about adding more words. It is about supplying constraints the repository cannot infer. The following matrix helps decide what belongs in the prompt.

| Information | Include when | Example |
|---|---|---|
| Behavioral oracle | Always | Exact error text and returned subtotal |
| Allowed files | Always | One test plus one local helper |
| Runner syntax | Always | \`npx vitest run path\` and \`-t\` |
| Existing convention | When not obvious locally | Factories return new mutable objects |
| Non-goal | When an attractive detour exists | Do not redesign production types |
| Evidence format | For reviewable agent work | Commands, counts, warnings, remaining risk |

For recurring work, a concise rule can encode the team’s test-refactoring guardrails. Keep it observable and tool-neutral enough to survive changes in implementation style.

\`\`\`markdown
# Test refactoring rules

- Never weaken an assertion to make a failing test pass.
- Do not edit production files during a test-only refactor.
- Factories must return fresh nested objects.
- Preserve boundary and failure-path cases as named tests.
- Run the smallest relevant test target before the full suite.
- Report skipped, todo, and collected test counts.
\`\`\`

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a team wants a reusable agent workflow. Whether instructions come from a skill, a rule, or the task prompt, keep the repository’s actual commands authoritative.

## Review the Proposed Shape, Not Just the Green Check

Suppose Composer extracts a factory and converts the happy paths into a table. The result can be an improvement if scenario intent stays legible and each generated value is fresh.

\`\`\`typescript
// src/order.test.ts
import { describe, expect, test } from 'vitest'
import { orderSubtotal, type OrderLine } from './order'

function line(overrides: Partial<OrderLine> = {}): OrderLine {
  return {
    sku: 'BOOK',
    quantity: 1,
    unitPrice: 25,
    ...overrides,
  }
}

describe('orderSubtotal', () => {
  test.each([
    {
      name: 'prices one line',
      lines: [line()],
      expected: 25,
    },
    {
      name: 'adds multiple lines',
      lines: [line({ quantity: 2 }), line({ sku: 'PEN', quantity: 3, unitPrice: 2 })],
      expected: 56,
    },
  ])('$name', ({ lines, expected }) => {
    expect(orderSubtotal(lines)).toBe(expected)
  })

  test('rejects an empty order', () => {
    expect(() => orderSubtotal([])).toThrow(
      'order must contain at least one line',
    )
  })

  test('rejects zero quantity', () => {
    expect(() => orderSubtotal([line({ quantity: 0 })])).toThrow(
      'quantity must be positive',
    )
  })
})
\`\`\`

The diff deserves semantic questions. Did \`Partial<OrderLine>\` permit an invalid override that hides a required field? In this case, the return type and defaults guarantee a complete line. Does spreading overrides after defaults allow each intended property to change? Yes. Does the table collapse distinct failure modes? No, only two straightforward successful calculations are parameterized. Are error assertions still exact? Yes.

Cursor’s review interface allows file-by-file and selective acceptance of generated changes. Use that granularity. If a refactor contains a useful helper plus an unrelated configuration edit, accept the helper and reject the detour. Checkpoints can restore Agent-made changes, but Cursor documents that checkpoints are local, track Agent edits rather than manual edits, and are not a substitute for Git. Commit or branch before consequential work.

Review categories make multi-file diffs less tiring:

| Diff lens | Question | Red flag |
|---|---|---|
| Oracle | Would the same defects still fail? | \`toBeTruthy()\` replaces an exact value |
| Data | Does every case construct what its name claims? | A default silently supplies the boundary value |
| Isolation | Can one case mutate another case’s input? | Shared object or array outside the test |
| Discovery | Will the runner still collect every case? | File suffix or include pattern changed |
| Diagnostics | Will a failure identify the scenario? | Anonymous loop with one generic test name |
| Scope | Is every changed file necessary? | Product logic edited during test cleanup |

## Prove the Refactor Still Detects a Real Defect

What people get wrong is treating a green before-and-after comparison as sufficient proof. Both versions can pass even when the refactored suite dropped its strongest assertion. The fastest practical countermeasure is fault injection: make a temporary, obviously wrong production change and confirm the expected test fails for the expected reason.

For example, temporarily change the reducer to ignore quantity:

\`\`\`diff
-    return total + line.quantity * line.unitPrice
+    return total + line.unitPrice
\`\`\`

Run the focused suite. The multiple-line scenario should fail because it expects 56 while the faulty implementation returns 27. Then revert that temporary change and rerun. This is a manual mutation test, not a substitute for a full mutation-testing system, but it quickly validates that the refactor retained sensitivity to the multiplication behavior.

Choose faults from the contract, not randomly. Flip a boundary comparison, return a default, remove a throw, or alter a unit conversion. Each seeded fault should map to a named test. If no test fails, do not ask the agent to patch the test blindly. First determine whether the behavior was never covered, the assertion was weakened, or the test was not collected.

A small fault ledger makes review evidence durable:

\`\`\`text
Fault: ignore line quantity in subtotal
Expected detector: adds multiple lines
Observed: failed, expected 56 and received 27
Action: reverted fault
Clean rerun: 4 tests passed
Remaining gap: negative unitPrice policy is unspecified
\`\`\`

The last line matters. Refactoring often exposes unclear requirements. Do not let the agent invent a rule for negative prices because the type permits them. Record the gap and take it to the product owner or domain engineer.

## Diagnose the Green Suite That Lost Coverage

The most realistic failure mode is deceptively calm. Composer consolidates several tests into a parameterized table, all commands exit successfully, and the diff looks smaller. A later production bug reaches users because one boundary row disappeared. The team assumed a smaller file represented equivalent coverage.

Diagnose this in layers. First compare collection totals and names, not just exits. Second map every pre-refactor behavioral claim to a post-refactor test row. Third inspect assertion strength. Fourth seed a fault for the missing boundary. Fifth check discovery configuration and skipped markers. This sequence separates a missing scenario from a non-collected file or a weak assertion.

Another failure appears when a helper returns a shared nested object. Tests pass in their original order but fail alone or after another case mutates a property. The repair is to build nested objects inside the factory call, not cache a default object at module scope.

\`\`\`typescript
type Customer = {
  id: string
  preferences: { currency: string }
}

function customer(currency = 'USD'): Customer {
  return {
    id: 'customer-1',
    preferences: { currency },
  }
}

const first = customer()
const second = customer()
first.preferences.currency = 'EUR'

if (second.preferences.currency !== 'USD') {
  throw new Error('factory leaked mutable nested state')
}
\`\`\`

That snippet is runnable with a TypeScript executor and proves the freshness property directly. A spread of a cached nested default would not.

## Scale From One Test File to a Refactoring Queue

Large cleanup requests encourage broad, hard-to-review edits. Instead, create a queue of independently valuable slices. Rank candidates by pain and semantic risk. Duplicate setup with stable behavior is a good early target. Snapshot rewrites, time-sensitive concurrency suites, and tests around poorly understood legacy rules deserve smaller steps and stronger characterization.

Each queue item should fit one review cycle: baseline, plan, edit, focused run, sensitivity check, full run, and diff approval. When an item changes more than the reviewer can explain without rereading the whole subsystem, split it.

An agentic workflow becomes more reliable when tests are observable through tools and stable repository context. The [agentic AI testing guide for 2026](/blog/agentic-ai-testing-guide-2026) expands the human-agent control loop, while [MCP servers for test automation](/blog/mcp-servers-test-automation-2026) covers controlled access to external systems and evidence. For refactoring, grant only the tools needed for the slice. Database or browser access is unnecessary when restructuring a pure unit test.

Use a definition of done that a reviewer can falsify:

1. The original suite passed and its collected cases were recorded.
2. The approved plan named the exact files and non-goals.
3. Each old behavioral claim maps to a new test or documented removal decision.
4. Focused tests pass independently.
5. At least one relevant temporary defect was detected and reverted.
6. The full required checks pass without new skips or warnings.
7. The final diff contains no unrelated production or configuration change.

This discipline does not remove the speed advantage of Composer. It channels speed into small changes with strong evidence. The agent handles search, repetition, and mechanical editing. The QA engineer defines behavioral truth, chooses adversarial checks, and rejects attractive simplifications that erase intent.

## Refactor Mock-Heavy Tests Without Recreating the Implementation

Mock-heavy suites require a different brief from pure calculation tests. The danger is not only shared data. An agent may consolidate mocks until the test asserts the exact sequence of private calls, turning an observable behavior test into a copy of the implementation. That suite becomes brittle during harmless refactors and may still miss a wrong user result.

Classify each collaborator before asking Composer to edit. A boundary mock represents something slow, nondeterministic, or externally owned, such as a payment gateway. A state observer captures a meaningful outbound effect, such as a published event. An internal helper usually should remain real. If every internal function is mocked, the test proves that the implementation follows its own wiring diagram rather than proving the feature works.

For an asynchronous notification service, keep the dependency small and assert both returned behavior and the meaningful call:

\`\`\`typescript
import { expect, test, vi } from 'vitest'

type Mailer = {
  send(recipient: string, subject: string): Promise<void>
}

async function welcomeUser(email: string, mailer: Mailer): Promise<string> {
  await mailer.send(email, 'Welcome')
  return 'queued'
}

test('queues the welcome message for the registered address', async () => {
  const send = vi.fn<Mailer['send']>().mockResolvedValue(undefined)
  const mailer: Mailer = { send }

  await expect(welcomeUser('qa@example.test', mailer)).resolves.toBe('queued')
  expect(send).toHaveBeenCalledWith('qa@example.test', 'Welcome')
  expect(send).toHaveBeenCalledTimes(1)
})
\`\`\`

When Composer extracts a reusable mock builder, verify that each invocation creates a new spy. Reusing one spy across cases can carry call history and make results depend on clearing behavior in hooks. Fresh construction inside each test is easier to reason about than a global mock plus an automatic reset policy.

Async refactors also invite a subtle defect: dropping \`await\`. A test can finish before a rejection is observed, or an assertion on a promise may never be tied to the test lifecycle. Require the agent to preserve awaited promises, return chains where appropriate, and explicit rejection assertions. Run a deliberate failure in the dependency and verify that the failure-path test observes the promised contract rather than producing an unhandled-rejection warning after the test ends.

Review mock refactors with three questions. Is the asserted interaction part of the feature contract? Does the test also observe the outcome consumers care about? Can the test fail if the dependency rejects, returns a malformed value, or is called twice? Those questions keep deduplication from erasing important temporal and error behavior.

## Keep Snapshots Narrow During Agent Cleanup

Large snapshots are attractive refactoring targets because an agent can regenerate them quickly. Regeneration is not proof. A changed snapshot often records the agent’s new output without deciding whether that output is correct. During a test-only refactor, prohibit snapshot updates unless the expected representation itself is in scope.

If the suite uses snapshots, identify what each snapshot protects and replace broad snapshots only in a separate reviewed slice. Stable semantic fields can often become explicit assertions, while a focused snapshot may remain useful for a structured rendering. Compare snapshot entry counts and inspect every changed line. Never accept a newly generated snapshot merely because the runner asks for an update.

For nondeterministic values such as timestamps or generated identifiers, control the source or assert the relevant shape. Do not make the entire assertion vague. The goal is to remove incidental volatility while retaining exact claims about status, totals, labels, and error content. Ask Composer to explain which fields are intentionally ignored and why each ignored field is not part of the contract.

## Frequently Asked Questions

### Can Cursor Composer safely refactor an entire test suite at once?

It can edit many files, but an entire-suite request is usually too large for meaningful semantic review. Start with one behaviorally coherent slice, such as one test file or one fixture family. Record the collected tests, constrain allowed files, and require focused plus full-suite commands. After reviewing the diff and proving defect sensitivity, move to the next slice. Broad mechanical transformations are safer only when the rule is simple, every affected test is well understood, and automated checks can expose collection, isolation, and assertion regressions.

### Should the agent be allowed to change production code during test refactoring?

Not by default. A test-only refactor needs a stable subject so before-and-after results are comparable. If production design genuinely prevents a useful test structure, separate that work into another reviewed change with its own acceptance criteria. Mixing both concerns lets an agent make tests pass by modifying behavior, which destroys the refactoring oracle. State the allowed files explicitly and reject unrelated hunks. An exception is a pre-approved seam, such as dependency injection, when the team has separately agreed that production change is part of the task.

### How do I know an AI-refactored test still catches bugs?

Map old behavioral claims to new cases, compare collected test names and totals, inspect assertion strength, and perform a temporary fault-injection check. Seed a small defect that violates a named requirement, run the focused suite, and confirm the intended test fails for the intended reason. Revert the defect immediately and rerun clean. This gives stronger evidence than two green runs because it measures sensitivity. For high-risk code, add systematic mutation testing or a set of reviewed fault seeds to the CI strategy.

### What should I put in a Cursor rule versus the task prompt?

Put stable repository conventions in rules: approved test commands, fixture freshness requirements, prohibited assertion weakening, naming patterns, and scope expectations. Put the current behavior, allowed files, exact failure modes, and task-specific verification in the prompt. Rules should remain useful across many changes, while prompts should describe the concrete slice. Avoid duplicating a long handbook in both places. After the agent responds, verify which commands it actually ran and review the resulting diff, because instructions guide behavior but do not replace evidence.
`,
};
