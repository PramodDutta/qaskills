import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AI Test Generation Review Checklist: Approve Behavior, Not Plausible Code',
  description: 'Use this AI test generation review checklist to reject hollow assertions, verify behavior coverage, control test data, and merge trustworthy agent-written tests.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# AI Test Generation Review Checklist: Approve Behavior, Not Plausible Code

An effective AI test generation review checklist asks one question first: would this test fail for the defect it claims to detect? Generated code can compile, look idiomatic, and still prove nothing. Reviewers must trace the requirement to an observable behavior, inspect the oracle, verify that the failure path is reachable, and run the test against a controlled defect before approving it.

Use a layered review. Confirm scope and provenance, compile and execute the change, inspect setup and isolation, challenge every assertion, test negative paths, and compare coverage with risk. Automated gates catch syntax and repetition, while a human or a separately prompted review agent evaluates intent. This article turns those layers into a concrete workflow for QA and test-automation teams.

The checklist applies whether an AI assistant wrote one Vitest case, generated a Playwright spec, or proposed an evaluation harness for an autonomous agent. The details differ, but the acceptance standard remains stable: the test must create a meaningful condition, observe the correct boundary, fail for a relevant regression, and remain deterministic in the suite.

## Record the test contract before reading the implementation

Review the request, acceptance criteria, and changed production behavior before reading the generated test. Otherwise, polished code can anchor the reviewer’s interpretation of what should have been tested. Write a compact test contract that names the trigger, observable outcome, oracle, and excluded scope.

For a cart rule, the contract might be: “Given a signed-in wholesale customer with an order subtotal of 10,000 cents, applying the wholesale discount produces a 9,000-cent total and records the discount code once. Shipping calculation is outside this change.” The values are illustrative. The point is that every important noun can be located in setup, action, or assertion.

| Contract field | Reviewer question | Evidence required |
|---|---|---|
| Trigger | What exact state causes the behavior? | Fixture values and action call |
| Observable | Which public result should change? | Return value, rendered state, event, or persisted record |
| Oracle | How does the test know the result is correct? | Independent expected value or trusted contract |
| Boundary | Which neighboring behavior must stay unchanged? | Targeted regression or paired case |
| Exclusion | What is intentionally outside this test? | Clear scope note, not silent omission |

Do not accept “add tests for discounts” as a sufficient contract. An agent will fill ambiguity with common patterns and may test a feature your application does not have. If the request lacks an oracle, pause generation and obtain one from requirements, existing interfaces, product policy, or a domain expert.

Representing review metadata in the test plan keeps the intent near the generated change:

\`\`\`ts
export type TestContract = {
  requirementId: string;
  behavior: string;
  trigger: string;
  observable: string;
  oracleSource: string;
  excludedScope: string[];
};

export const wholesaleDiscountContract: TestContract = {
  requirementId: "CART-142",
  behavior: "Wholesale customers receive a ten-percent item discount",
  trigger: "Authenticated wholesale customer and eligible cart",
  observable: "Cart total and one discount audit event",
  oracleSource: "Approved pricing rule CART-142",
  excludedScope: ["shipping", "tax", "coupon stacking"],
};
\`\`\`

This record is not a substitute for assertions. It gives reviewers a stable map for checking them.

## Run a mechanical gate before spending expert attention

Generated tests should pass the same basic checks as human-written code: formatting, type checking, linting, test discovery, and an isolated run of the affected file. Inspect the test-runner output to confirm the new cases actually executed. A green command that reports no matching tests is not success.

Then run the affected package or project. An isolated pass cannot reveal shared-state leakage, port collisions, global mock contamination, or changed snapshots elsewhere. If the repository uses coverage, compare the changed lines and branches, but do not use coverage percentage as proof of assertion quality.

\`\`\`json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:changed": "vitest run src/cart/discount.test.ts"
  }
}
\`\`\`

Every command above is a documented command of its corresponding tool. In a different repository, use its existing scripts instead of inventing new runner flags. For Vitest name filtering, use \`-t\` or \`--testNamePattern\`, not Mocha’s \`--grep\`.

| Mechanical check | Reject when | Why it matters |
|---|---|---|
| Test discovery | New file or named case does not appear | Undiscovered tests provide zero protection |
| Type check | Agent bypassed errors with broad casts | Casts can hide an invented API contract |
| Isolated run | Case flakes or depends on order | Local reliability is the minimum bar |
| Package run | Existing tests fail or shared state leaks | The suite is the integration surface |
| Diff review | Unrelated snapshots or fixtures changed | Wide churn hides semantic mistakes |

Automate the gate, but retain the command output as review evidence. An AI agent may state that tests pass without having executed them, or it may summarize stale output. Trust the reproducible command, exit status, and discovered case count.

## Trace every setup value to the condition under test

Generated fixtures often contain realistic-looking fields that do not affect the branch. A test might set \`customerType: "wholesale"\` while the production function actually reads \`pricingTier\`. The expected amount may still pass because the default price coincidentally equals the asserted value.

Read from the assertion backward. Identify the source line that produces the observed value, then follow each branch condition back into setup. Delete or perturb a critical setup value temporarily. If behavior does not change, the fixture is not activating the intended path.

Consider this production unit:

\`\`\`ts
// src/cart/price.ts
export type Cart = {
  subtotalCents: number;
  pricingTier: "retail" | "wholesale";
};

export function totalCents(cart: Cart): number {
  if (cart.pricingTier === "wholesale") {
    return Math.round(cart.subtotalCents * 0.9);
  }
  return cart.subtotalCents;
}
\`\`\`

A generated test that builds a large customer object through \`as unknown as Cart\` deserves suspicion. It may contain the wrong property and silence the compiler. The direct fixture exposes the contract:

\`\`\`ts
// src/cart/price.test.ts
import { describe, expect, it } from "vitest";
import { totalCents, type Cart } from "./price";

describe("totalCents", () => {
  it("applies the wholesale rate", () => {
    const cart: Cart = {
      subtotalCents: 10_000,
      pricingTier: "wholesale",
    };

    expect(totalCents(cart)).toBe(9_000);
  });

  it("does not discount a retail cart", () => {
    const cart: Cart = {
      subtotalCents: 10_000,
      pricingTier: "retail",
    };

    expect(totalCents(cart)).toBe(10_000);
  });
});
\`\`\`

The paired retail case proves that the wholesale setup matters. It also protects the neighboring branch from an implementation that discounts every cart.

## Interrogate the oracle, especially duplicated logic

The highest-value review work is checking how expected results were derived. Generated tests frequently repeat the implementation in the assertion. If production sorts, filters, rounds, or maps a collection, the generated expected value may apply the identical algorithm. The same mistake can then exist on both sides and produce a green test.

Prefer explicit expected examples for small cases, invariant assertions for broad inputs, and a separately trusted reference implementation only when its independence is clear. Avoid calculating the expected result with the function under test, the same helper used by production, or a copied formula whose correctness is the issue.

| Weak oracle | Failure it can miss | Stronger alternative |
|---|---|---|
| \`expect(result).toBeDefined()\` | Wrong but present value | Assert exact domain value |
| Snapshot of a huge object | Important field change hidden in churn | Assert selected contract fields |
| Recomputed production formula | Same defect on both sides | Hand-derived example or invariant |
| Only status code | Incorrect body or side effect | Assert status, schema, and state transition |
| Mock called without arguments | Wrong request content | Assert meaningful arguments and count |

Review assertions for direction as well. \`not.toThrow()\` says almost nothing about output. \`array.length > 0\` can pass with the wrong item. \`toContain\` can pass when duplicates violate the contract. Strong does not mean verbose; it means tied to a user-visible or system-visible requirement.

## Prove the test can turn red

A test should be demonstrated against a relevant defect. The most direct technique is a temporary local mutation: invert the target condition, remove the state change, alter a comparison boundary, or return the pre-change value. Run the new test and confirm it fails for the expected reason. Revert the temporary mutation immediately and run again.

For the cart example, change the wholesale multiplier from \`0.9\` to \`1\`. The wholesale case should fail with a value mismatch, while the retail case remains meaningful. If the test stays green, it is not connected to the implementation branch it claims to protect.

You can also use a small pure function to audit whether proposed cases kill known illustrative mutants:

\`\`\`ts
type PriceRule = (subtotalCents: number, wholesale: boolean) => number;

const correct: PriceRule = (subtotal, wholesale) =>
  wholesale ? Math.round(subtotal * 0.9) : subtotal;

const ignoresTier: PriceRule = (subtotal) => subtotal;
const discountsEveryone: PriceRule = (subtotal) => Math.round(subtotal * 0.9);

const cases = [
  { subtotal: 10_000, wholesale: true, expected: 9_000 },
  { subtotal: 10_000, wholesale: false, expected: 10_000 },
];

function passes(rule: PriceRule): boolean {
  return cases.every(
    (item) => rule(item.subtotal, item.wholesale) === item.expected,
  );
}

console.log({
  correct: passes(correct),
  ignoresTier: passes(ignoresTier),
  discountsEveryone: passes(discountsEveryone),
});
\`\`\`

The expected output is \`true\`, \`false\`, and \`false\`. This is an illustrative mutation check, not a replacement for a full mutation-testing tool. Its purpose is to make the review question concrete: which plausible wrong implementations does this test set reject?

## Audit negative paths for reachable and precise failure

Agents tend to generate happy paths because the APIs are visible and examples are abundant. Negative tests require a domain decision about what must fail, how it fails, and what must not happen afterward. A proper negative test creates the invalid condition, observes the documented error surface, and confirms prohibited side effects did not occur.

The common async mistake is a \`try/catch\` test that can pass when the promise unexpectedly resolves because no assertion runs. Use the runner’s rejection matcher instead:

\`\`\`ts
// src/account/register.ts
export async function register(email: string): Promise<{ email: string }> {
  if (!email.includes("@")) {
    throw new Error("email must contain @");
  }
  return { email };
}
\`\`\`

\`\`\`ts
// src/account/register.test.ts
import { expect, it } from "vitest";
import { register } from "./register";

it("rejects an address without @", async () => {
  await expect(register("invalid.example")).rejects.toThrow(
    "email must contain @",
  );
});

it("accepts a minimal valid address", async () => {
  await expect(register("qa@example.test")).resolves.toEqual({
    email: "qa@example.test",
  });
});
\`\`\`

The matching success case checks that validation is not universally rejecting. In service-level tests, also assert that a rejected request did not publish an event, charge a card, or persist partial state.

## Check boundaries instead of adding random examples

More generated cases do not necessarily add information. Ten arbitrary prices may all exercise the same branch. Review the partition model: valid and invalid classes, lower and upper boundaries, empty and singleton states, repeated operations, and transitions before and after the threshold.

For a maximum of five retry attempts, useful values are zero, one, four, five, and six only if the requirement defines all those states. The exact boundary may be “five attempts allowed” or “block on the fifth attempt,” and the tests must encode the approved interpretation. Never let the agent infer that difference from a variable name alone.

Test matrices help expose holes:

| Risk dimension | Representative cases | Review prompt |
|---|---|---|
| Quantity | Empty, one, boundary, over boundary | Are comparisons correct at the edge? |
| Identity | Owner, authorized peer, unrelated user | Is access based on the authenticated subject? |
| Time | Before, exactly at, after expiry | Which clock and timezone define the boundary? |
| Repetition | First call, retry, duplicate request | Is the operation idempotent where required? |
| Partial failure | Dependency fails before and after side effect | Is state rolled back or recoverable? |

Ask the generation agent to explain which partition each test covers, then verify that explanation against code. Explanations are review aids, not evidence by themselves.

## Reject mocks that test the mock arrangement

Over-mocking is a signature risk in generated tests. An agent may mock the unit under test, mock every helper, then assert that the configured value comes back. Such a test verifies the mock framework and nothing else. The production decision never runs.

Mock across a real boundary: network, filesystem, clock, random source, expensive service, or an injected collaborator. Keep pure domain logic real. Assert the externally meaningful call only when collaboration is part of the contract. Do not assert every internal helper call, because harmless refactoring will break the test without changing behavior.

Use fakes when stateful behavior matters. An in-memory repository can prove that a record was stored and later retrieved, while a bare \`vi.fn\` only proves a method was invoked. Keep the fake small and contract-driven so it does not become a second production implementation.

\`\`\`ts
type User = { id: string; email: string };

class InMemoryUsers {
  private readonly users = new Map<string, User>();

  save(user: User): void {
    this.users.set(user.id, user);
  }

  find(id: string): User | undefined {
    return this.users.get(id);
  }
}

const users = new InMemoryUsers();
users.save({ id: "u-1", email: "qa@example.test" });
console.log(users.find("u-1"));
\`\`\`

This fake is runnable and transparent. A real repository contract suite can execute the same behavioral cases against both the fake and production adapter.

## Inspect isolation, cleanup, and deterministic inputs

Generated tests often pass locally by inheriting machine state. Look for current time, random IDs, ambient environment variables, developer credentials, shared databases, fixed ports, locale-dependent formatting, and network access. A trustworthy test either controls those inputs or explicitly belongs to an integration environment that provisions them.

Each test should own the records it creates and use collision-resistant identifiers when parallelism is possible. Cleanup must target only owned data. A broad “delete all users” teardown is unsafe in shared test environments. Prefer transaction rollback, per-test namespaces, or an isolated container depending on the layer.

Check for sleeps. A fixed delay guesses when asynchronous work will finish and makes the suite both slow and flaky. Wait on an observable condition with a bounded timeout using the real framework’s documented API. Do not accept invented polling helpers simply because their names sound plausible.

For browser tests, review locators as contracts. Prefer roles, accessible names, labels, and purpose-built test IDs over fragile DOM ancestry or generated classes. Ensure actions are awaited and that assertions observe the user-facing state after the action, not a mocked implementation detail.

## Review agent and tool tests as traces, not only final text

When AI-generated tests target an agent, the response string is only one output. The agent may call tools, mutate files, send messages, request approval, retry, or stop early. Capture the trace and assert permissions, argument schemas, ordering constraints, side effects, and the final result.

An [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026) provides the broader test pyramid for planners and tool-using systems. At review time, require at least one forbidden-tool case, one tool-error case, and one successful case where the state change is independently verified. A mocked “success” return from a tool does not prove the agent sent correct arguments.

Protocol integrations need contract checks at the transport boundary. The guide to [MCP servers for test automation](/blog/mcp-servers-test-automation-2026) is relevant when generated tests invoke MCP tools or validate resources. Confirm that the test uses documented tool schemas and captures protocol errors, rather than chaining invented convenience methods onto a client.

## Score the generated change with a merge rubric

A checklist is easier to apply consistently when blockers are explicit. Separate correctness blockers from improvement suggestions. A missing red test, unreachable failure path, invented API, leaked credential, or destructive cleanup should block. Naming polish can be a follow-up if intent remains clear.

| Review area | Pass evidence | Blocking defect |
|---|---|---|
| Requirement trace | Every case maps to an approved behavior | Test asserts an inferred requirement |
| Oracle strength | Expected result is independent and specific | Assertion cannot distinguish a relevant defect |
| Reachability | Setup activates the named branch | Critical fixture field is unused or misspelled |
| Red proof | Relevant mutation makes the case fail | Test stays green against target defect |
| Isolation | Inputs and cleanup are owned | Shared state, real credential, or broad deletion |
| API accuracy | Methods and flags are documented | Fabricated matcher, flag, or client method |
| Maintainability | Names explain behavior and duplication is controlled | Generated bulk obscures intent |

Review agents can help perform a second pass, but use a prompt different from the generation prompt. Ask the reviewer to find counterexamples and specify what defect each test would miss. The authoring agent is biased toward defending its structure; an adversarial review role is more useful.

## Put the checklist into the pull-request workflow

Require generated-test pull requests to include the test contract, commands executed, result summary, and red-proof description. Tag generated sections if your governance policy requires provenance, but judge the code by the same quality bar as human work. AI involvement is a risk signal for review depth, not automatic evidence of low quality.

A concise pull-request checklist can be machine-readable and human-verifiable:

\`\`\`markdown
## Generated test evidence

- [ ] Requirement and excluded scope are named
- [ ] New tests were discovered and executed
- [ ] A relevant temporary mutation made the new test fail
- [ ] Full affected package passed after reverting the mutation
- [ ] Negative and boundary behavior were reviewed
- [ ] Mocks cross real boundaries and are reset correctly
- [ ] Test data, time, network, and cleanup are controlled
- [ ] No undocumented APIs, flags, or packages were introduced
\`\`\`

Do not allow the checkboxes to become ceremony. Link each checked item to diff lines, command logs, or a short explanation. Sample merged tests periodically by inserting known mutations or reviewing production defects they should have caught. Feedback from escaped defects should update the checklist and generation prompt.

The strongest organizational metric is not the number of generated tests. Track useful defects caught, mutation resistance, flaky reruns, review rejections by category, and maintenance churn. Counts reward volume, while these signals reward protection.

## Frequently Asked Questions

### Can code coverage validate AI-generated tests?

Coverage shows which statements or branches executed, not whether assertions can detect incorrect behavior. A generated test can reach every line and assert only that a result exists. Use coverage to find unexecuted risk, then inspect the oracle and perform a red proof with a relevant temporary mutation. Branch coverage is often more informative than line coverage for boundary logic, but neither replaces requirement traceability, negative cases, deterministic setup, or independent expected values.

### Should reviewers trust tests that an AI agent says it ran?

Trust reproducible evidence, not the claim. Re-run the documented repository commands, inspect exit status, confirm the new cases were discovered, and verify that output belongs to the current diff. An agent can summarize stale logs, run only a focused happy path, or overlook a no-tests-found condition. For higher-risk changes, retain CI artifacts and require the affected package or project to pass in addition to the isolated file. Execution evidence still does not replace semantic review of the assertions.

### What is the fastest way to detect a hollow generated assertion?

Introduce a small, relevant defect locally and run the new test. Invert the target condition, remove the intended side effect, change a boundary operator, or return the old behavior. The test should fail for a reason connected to its contract. Revert immediately and rerun. Also replace critical setup values to confirm they activate the branch. Assertions such as “defined,” broad snapshots, and mock-call checks without meaningful arguments deserve extra scrutiny because they often survive realistic defects.

### How much generated test code should be accepted in one review?

Limit a change to the amount a reviewer can trace from requirement through setup, action, oracle, and red proof. The right size depends on risk and familiarity, not a universal line count. Prefer several small, behavior-focused pull requests over a bulk suite generated from broad instructions. Large additions create correlated mistakes, duplicated fixtures, and review fatigue. If a broad generation is necessary, partition review by behavior family and require evidence for each group before merging any of it.
`,
};
