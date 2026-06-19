import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Decision Table Testing Guide with Examples (2026)",
  description: "Learn decision table testing step by step with worked examples. Build condition/action tables, collapse rules, handle don't-care entries, and convert tables to tests.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Decision Table Testing: A Step-by-Step Guide with Examples

Decision table testing is a black-box test-design technique for systems whose behavior depends on combinations of input conditions. You build a table where each column is a **rule** — a unique combination of condition values mapped to the action(s) the system should take — and then derive one test case per rule. It is the right tool whenever business logic reads like "if A and B but not C, then do X," because the table forces you to enumerate every combination so none of the logic is silently left untested.

This guide shows you how to construct a decision table from scratch, walks through two complete worked examples, explains how to collapse rules with don't-care entries, and turns the final table into parametrized automated tests.

## When to use a decision table

Reach for decision tables when:

- Output depends on a **combination** of conditions, not a single input range (that is what boundary value analysis covers).
- The rules read as nested if/else or business policy ("loan approved if income > X **and** credit score > Y **and** not flagged").
- You suspect missing logic — the table mechanically reveals combinations the spec forgot.

If behavior depends on a sequence of events over time instead of a static combination, use state transition testing instead. If it depends on numeric ranges, use equivalence partitioning and boundary value analysis. Decision tables are specifically for **combinational logic**.

## Anatomy of a decision table

A decision table has four quadrants:

| | Rule 1 | Rule 2 | ... |
|---|---|---|---|
| **Conditions** (inputs) | values | values | |
| **Actions** (outputs) | results | results | |

The top half lists the conditions (usually as yes/no questions); the bottom half lists the actions. Each column is one complete rule. With \`n\` binary conditions there are \`2^n\` possible rules — this is the table's size before any collapsing.

## Worked example 1: a login system

Specification: a user can log in only if (a) the account exists, (b) the password is correct, and (c) the account is not locked. There are three binary conditions, so the full table has 2^3 = 8 rules.

| Condition | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| Account exists? | T | T | T | T | F | F | F | F |
| Password correct? | T | T | F | F | T | T | F | F |
| Account locked? | T | F | T | F | T | F | T | F |
| **Action: Grant access** |  | X |  |  |  |  |  |  |
| **Action: Show "locked"** | X |  | X |  |  |  |  |  |
| **Action: Show "bad credentials"** |  |  |  | X |  |  |  |  |
| **Action: Show "no such user"** |  |  |  |  | X | X | X | X |

Reading rule R2: account exists (T), password correct (T), not locked (F) -> grant access. That is the only path to success. Rule R4: exists and not locked but wrong password -> "bad credentials." Rules R5-R8: the account does not exist, so the other conditions are irrelevant and the system shows "no such user" regardless.

This immediately surfaces a design question the prose hid: **when the account does not exist, should the system reveal nothing about password or lock state?** The table makes that explicit (R5-R8 all collapse to one message), which is also the secure choice — never leak whether an account exists.

### Collapsing with don't-care entries

Rules R5-R8 produce the same action and differ only in conditions that do not matter when "Account exists?" is F. We can **collapse** them into a single rule using a don't-care symbol (\`-\`):

| Condition | R1 | R2 | R3 | R4 | R5' |
|---|---|---|---|---|---|
| Account exists? | T | T | T | T | F |
| Password correct? | T | T | F | F | - |
| Account locked? | T | F | T | F | - |
| **Grant access** |  | X |  |  |  |
| **Show "locked"** | X |  | X |  |  |
| **Show "bad credentials"** |  |  |  | X |  |
| **Show "no such user"** |  |  |  |  | X |

We went from 8 rules to 5. A don't-care entry means "the action is the same regardless of this condition's value." Collapsing keeps full logical coverage while removing redundant columns — but be careful: only collapse when the action truly does not depend on the condition. When in doubt, keep the rules expanded.

Notice we can collapse further: R1 and R3 both show "locked" and differ only in password correctness, so if the spec says a locked account shows "locked" regardless of password, R1+R3 merge into one don't-care rule. Always re-read the spec before collapsing — the "locked beats bad-password" precedence is a real product decision.

## Worked example 2: a loan-approval engine

A more realistic policy with mixed outcomes. Conditions:

- Income >= 50k?
- Credit score >= 700?
- Existing customer?

Actions: Approve, Approve with higher rate, Manual review, Reject.

Full table (2^3 = 8 rules):

| Condition | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| Income >= 50k? | T | T | T | T | F | F | F | F |
| Credit >= 700? | T | T | F | F | T | T | F | F |
| Existing customer? | T | F | T | F | T | F | T | F |
| **Approve** | X | X |  |  |  |  |  |  |
| **Approve, higher rate** |  |  | X |  | X |  |  |  |
| **Manual review** |  |  |  | X |  | X | X |  |
| **Reject** |  |  |  |  |  |  |  | X |

This table encodes nuanced policy: high income plus good credit is an instant approve (R1, R2) regardless of existing-customer status; good income but weak credit gets a higher rate if you are an existing customer (R3) but manual review otherwise (R4); low income with great credit still gets a higher-rate approve only for existing customers (R5). The single clean reject is R8 — fails all three. Without the table, R6 and R7 (the "manual review" edge cases) are exactly the rules a developer forgets.

## Converting the table to test cases

Each non-collapsed rule becomes one test case. Encode the table directly as parametrized data. In Python with pytest:

\`\`\`python
import pytest
from enum import Enum

class Decision(Enum):
    APPROVE = "approve"
    APPROVE_HIGHER_RATE = "approve_higher_rate"
    MANUAL_REVIEW = "manual_review"
    REJECT = "reject"

def evaluate_loan(income_ok: bool, credit_ok: bool, existing: bool) -> Decision:
    if income_ok and credit_ok:
        return Decision.APPROVE
    if income_ok and not credit_ok:
        return Decision.APPROVE_HIGHER_RATE if existing else Decision.MANUAL_REVIEW
    if not income_ok and credit_ok:
        return Decision.APPROVE_HIGHER_RATE if existing else Decision.MANUAL_REVIEW
    return Decision.REJECT

# One row per rule R1..R8 from the decision table
@pytest.mark.parametrize(
    "income_ok, credit_ok, existing, expected",
    [
        (True,  True,  True,  Decision.APPROVE),              # R1
        (True,  True,  False, Decision.APPROVE),              # R2
        (True,  False, True,  Decision.APPROVE_HIGHER_RATE),  # R3
        (True,  False, False, Decision.MANUAL_REVIEW),        # R4
        (False, True,  True,  Decision.APPROVE_HIGHER_RATE),  # R5
        (False, True,  False, Decision.MANUAL_REVIEW),        # R6
        (False, False, True,  Decision.MANUAL_REVIEW),        # R7
        (False, False, False, Decision.REJECT),              # R8
    ],
)
def test_loan_rules(income_ok, credit_ok, existing, expected):
    assert evaluate_loan(income_ok, credit_ok, existing) is expected
\`\`\`

Because each parametrized row maps to a labelled rule, a failure tells you precisely which business rule the code got wrong. Notice that R7 in this implementation returns MANUAL_REVIEW (not REJECT) — exactly the kind of subtle rule the table forces you to pin down. The same approach works in TypeScript with Vitest's \`it.each\` or JUnit's \`@ParameterizedTest\`. For ready-made testing skills you can plug into AI coding agents, see the [skills directory](/skills).

## Generating the table programmatically

For many conditions you can generate all 2^n combinations rather than typing them. This guarantees you never miss a rule:

\`\`\`python
from itertools import product

conditions = ["income_ok", "credit_ok", "existing"]
for combo in product([True, False], repeat=len(conditions)):
    row = dict(zip(conditions, combo))
    expected = evaluate_loan(**row)
    print(row, "->", expected.value)
\`\`\`

Generating the combinations exhaustively and then asserting the expected action per row is the safest way to build a decision-table suite for logic with up to a handful of conditions. Beyond about six or seven conditions (128+ rules) the table becomes unwieldy — that is the signal to either split the logic or switch to [pairwise combinatorial testing](/blog) for the lower-risk condition combinations.

## Common mistakes and troubleshooting

**Missing rules.** The whole benefit is exhaustiveness. If your table has fewer than 2^n columns and you did not deliberately collapse equivalent rules, you have a gap. Generate combinations programmatically to be sure.

**Over-aggressive collapsing.** Don't-care entries are only valid when the action genuinely does not depend on the condition. Collapsing rules that actually differ hides a real test case. Verify each merge against the specification.

**Conflicting rules.** If two rules have the same condition values but different actions, your specification is contradictory — that is a finding, not a table error. Surface it to the product owner.

**Treating multi-valued conditions as binary.** If a condition has three states (e.g. account status = active/suspended/closed), it contributes three values, not two, so the table is 3 x 2^(n-1), not 2^n. Model each condition's real cardinality.

**Confusing decision tables with state machines.** Decision tables capture a single combinational decision. If the outcome depends on what happened previously (order of events), you need state transition testing, not a decision table.

## How decision tables compare to other techniques

| Technique | Models | Test unit |
|---|---|---|
| Decision table | Combinations of conditions | One test per rule |
| State transition | Sequences of events | One test per transition |
| Equivalence partitioning | Input value classes | One test per partition |
| Pairwise | Parameter interactions | All 2-way value pairs |

Decision tables and pairwise both deal with combinations, but a decision table guarantees *every* combination (good for tight business logic), while pairwise guarantees only *two-way* combinations (good for taming large config spaces). Compare these and related approaches side by side on the [comparison hub](/compare).

## Frequently Asked Questions

### What is decision table testing used for?

Decision table testing is used for logic whose output depends on combinations of input conditions, such as business rules, eligibility checks, pricing tiers, and access control. You enumerate every combination of conditions as a rule and map each to the expected action, then test one case per rule. It is especially good at exposing combinations the specification forgot to define.

### How many test cases does a decision table produce?

A table with n binary conditions has 2^n possible rules, so three conditions give eight rules and four give sixteen. You can reduce that count by collapsing rules whose action does not depend on certain conditions, using don't-care entries. Conditions with more than two values increase the count further, so a three-state condition multiplies the rule count by three rather than two.

### What does a don't-care entry mean in a decision table?

A don't-care entry, usually written as a dash, means the rule's action is the same regardless of that condition's value, so the condition can be ignored for that rule. It lets you merge several rules that share an action into one collapsed column, reducing the table size while keeping full logical coverage. Only use it when the action truly is independent of the condition; otherwise you hide a real test case.

### When should I use a decision table instead of state transition testing?

Use a decision table when the outcome depends on a static combination of conditions evaluated together, like "approve the loan if income and credit and customer-status meet the rules." Use state transition testing when the outcome depends on the sequence of events over time, like a vending machine or an order moving through statuses. The distinguishing question is whether order and history matter; if they do, choose state transitions.

### Can decision table testing be automated?

Yes. The standard approach is to encode each rule as a row in a parametrized test using pytest's parametrize, Vitest's it.each, or JUnit's parameterized tests, with the expected action as the assertion. For many conditions you can generate all combinations programmatically with a Cartesian product so no rule is missed. This keeps each business rule visible in the test names.

### What happens when conditions have more than two values?

When a condition is not binary — for example an account status of active, suspended, or closed — it contributes that many values to the table, so the total rule count is the product of every condition's cardinality rather than 2^n. Model each condition's real number of states. If the resulting table grows too large to manage, split the logic into smaller tables or apply pairwise combinatorial testing to the lower-risk combinations.
`,
};
