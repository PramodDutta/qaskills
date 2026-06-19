import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "State Transition Testing Guide with Diagrams & Examples",
  description: "Learn state transition testing with diagrams, state tables, and worked examples. Cover 0-switch and 1-switch coverage, invalid transitions, and parametrized tests.",
  date: "2026-06-15",
  category: "Testing",
  content: `# State Transition Testing: A Guide with Diagrams and Examples

State transition testing is a black-box test-design technique for systems whose behavior depends on their current state and the sequence of events applied to them. You model the system as a finite set of states connected by transitions (each triggered by an event and producing an action), then derive test cases that exercise valid transitions, invalid transitions, and paths through the state graph. It is the right technique whenever order and history matter — login lockouts, order lifecycles, media players, ATMs, checkout flows — because a decision table or boundary analysis cannot capture "what happened before."

This guide explains the four building blocks, draws state diagrams and state tables, walks through worked examples, defines coverage levels (0-switch and 1-switch), and turns transitions into parametrized automated tests.

## The four building blocks

Every state model is described by four things:

1. **States** — the distinct conditions the system can be in (e.g. \`LoggedOut\`, \`LoggedIn\`, \`Locked\`).
2. **Transitions** — movements from one state to another.
3. **Events** — the triggers that cause a transition (e.g. \`submitValidPassword\`, \`submitWrongPassword\`).
4. **Actions** — the output or side effect produced by a transition (e.g. "increment failed-attempt counter").

A transition is read as: *in state S, event E occurs, the system performs action A and moves to state S'.*

## Worked example 1: a login lockout

Specification: a user starts logged out. A correct password logs them in. Three consecutive wrong passwords lock the account. From locked, the account stays locked until a reset.

### State diagram

\`\`\`
              wrong password (1st)            wrong password (2nd)
  ┌──────────┐ ───────────────► ┌──────────┐ ──────────────► ┌──────────┐
  │ LoggedOut│                  │  Try1    │                 │  Try2    │
  │ (0 fails)│ ◄─────────────── │ (1 fail) │                 │ (2 fails)│
  └────┬─────┘   correct pwd    └────┬─────┘                 └────┬─────┘
       │                             │ correct pwd                │ wrong pwd (3rd)
       │ correct password            ▼                            ▼
       │                        ┌──────────┐                 ┌──────────┐
       └──────────────────────► │ LoggedIn │                 │  Locked  │
                                └──────────┘                 └────┬─────┘
                                                                  │ admin reset
                                                                  ▼
                                                             LoggedOut
\`\`\`

The diagram shows the happy path (a single correct password to \`LoggedIn\`) and the failure path (wrong passwords escalating through \`Try1\`, \`Try2\`, to \`Locked\`). A correct password from any try-state recovers to \`LoggedIn\`; only the third consecutive failure locks the account.

### State table

The diagram is great for humans; the **state table** is what you derive tests from. It lists every (state, event) pair and the resulting state — including the empty cells that represent invalid transitions:

| Current state | Event: correct pwd | Event: wrong pwd | Event: admin reset |
|---|---|---|---|
| LoggedOut | LoggedIn | Try1 | — |
| Try1 | LoggedIn | Try2 | — |
| Try2 | LoggedIn | Locked | — |
| Locked | — (rejected) | — (rejected) | LoggedOut |
| LoggedIn | — | — | — |

The dashes are as important as the filled cells. They define **invalid transitions** — events that should be ignored or rejected in a given state (e.g. submitting a password while \`Locked\` must not unlock the account). Untested invalid transitions are a classic source of security bugs, so a complete state table forces you to consider every cell.

## Coverage levels: 0-switch and 1-switch

State transition testing has well-defined coverage criteria based on **switches** (sequences of consecutive transitions).

### 0-switch coverage (all transitions)

0-switch coverage, also called **all-transitions** coverage, requires that every valid transition is exercised at least once. Each filled cell in the state table becomes one test. For the login example the valid transitions are:

| # | From | Event | To |
|---|---|---|---|
| 1 | LoggedOut | correct pwd | LoggedIn |
| 2 | LoggedOut | wrong pwd | Try1 |
| 3 | Try1 | correct pwd | LoggedIn |
| 4 | Try1 | wrong pwd | Try2 |
| 5 | Try2 | correct pwd | LoggedIn |
| 6 | Try2 | wrong pwd | Locked |
| 7 | Locked | admin reset | LoggedOut |

Seven tests give 0-switch coverage. This is the practical minimum baseline most teams target.

### 1-switch coverage (all transition pairs)

1-switch coverage requires testing every valid *pair* of consecutive transitions — every two-transition sequence. This catches bugs that only appear after a specific prior transition (for example, a counter that resets incorrectly). One important 1-switch sequence here is: \`LoggedOut --wrong--> Try1 --correct--> LoggedIn\`, then verify a subsequent wrong password starts a *fresh* count at \`Try1\` rather than resuming at \`Try2\`. That kind of "does the counter reset?" bug is invisible to 0-switch testing but caught by 1-switch.

Higher levels (2-switch, n-switch) test longer sequences and grow quickly; reserve them for safety-critical state machines.

## Worked example 2: an e-commerce order lifecycle

A second, richer model. An order moves through statuses:

\`\`\`
  Created ──pay──► Paid ──ship──► Shipped ──deliver──► Delivered
     │              │
     │ cancel       │ cancel/refund
     ▼              ▼
  Cancelled ◄─── Refunded
\`\`\`

State table (with invalid transitions shown as dashes):

| Current | pay | ship | deliver | cancel |
|---|---|---|---|---|
| Created | Paid | — | — | Cancelled |
| Paid | — | Shipped | — | Refunded |
| Shipped | — | — | Delivered | — |
| Delivered | — | — | — | — |
| Cancelled | — | — | — | — |
| Refunded | — | — | — | — |

The interesting invalid transitions: you cannot \`ship\` an order that is still \`Created\` (not yet paid), you cannot \`cancel\` an order that is already \`Shipped\`, and \`Delivered\`/\`Cancelled\`/\`Refunded\` are **terminal states** with no outgoing transitions. Each of those rejected events deserves an explicit negative test, because skipping a state ("ship before pay") is exactly the kind of bug that lets goods leave the warehouse without payment.

## Converting transitions to automated tests

Model the machine, then parametrize over the transition table. A minimal state machine and 0-switch tests in Python with pytest:

\`\`\`python
import pytest

TRANSITIONS = {
    ("Created", "pay"):     "Paid",
    ("Created", "cancel"):  "Cancelled",
    ("Paid", "ship"):       "Shipped",
    ("Paid", "cancel"):     "Refunded",
    ("Shipped", "deliver"): "Delivered",
}

class Order:
    def __init__(self):
        self.state = "Created"

    def apply(self, event):
        key = (self.state, event)
        if key not in TRANSITIONS:
            raise ValueError(f"invalid transition: {event} in {self.state}")
        self.state = TRANSITIONS[key]
        return self.state

# 0-switch: every valid transition exactly once
@pytest.mark.parametrize(
    "start, event, expected",
    [
        ("Created", "pay", "Paid"),
        ("Created", "cancel", "Cancelled"),
        ("Paid", "ship", "Shipped"),
        ("Paid", "cancel", "Refunded"),
        ("Shipped", "deliver", "Delivered"),
    ],
)
def test_valid_transition(start, event, expected):
    order = Order()
    order.state = start
    assert order.apply(event) == expected

# Invalid transitions must be rejected
@pytest.mark.parametrize(
    "start, event",
    [
        ("Created", "ship"),     # ship before pay
        ("Shipped", "cancel"),   # cancel after shipped
        ("Delivered", "pay"),    # terminal state
    ],
)
def test_invalid_transition_rejected(start, event):
    order = Order()
    order.state = start
    with pytest.raises(ValueError):
        order.apply(event)
\`\`\`

A 1-switch test simply chains two \`apply\` calls and asserts the state after the pair. The same pattern works in TypeScript with Vitest's \`it.each\` or JUnit's parameterized tests. For test-design and browser-automation skills you can wire into agents like Claude Code or Cursor, browse the [skills directory](/skills).

## A repeatable process

1. **Identify the states** — the meaningful, distinct conditions of the system.
2. **Identify the events** — every trigger that can change state.
3. **Draw the state diagram** — for human review and to spot missing transitions.
4. **Build the state table** — every (state, event) cell, including invalid ones.
5. **Pick a coverage level** — 0-switch as a baseline, 1-switch for stateful counters and order-dependent logic.
6. **Add negative tests** for every invalid-transition cell.
7. **Test terminal states** — confirm no event escapes them.
8. **Parametrize** the transitions into automated tests.

## Common mistakes and troubleshooting

**Only testing the happy path.** The valid transitions are the easy half. The invalid-transition cells (the dashes) are where security and data-integrity bugs live — skipping payment, double-refunding, unlocking a locked account. Test every rejected event explicitly.

**Forgetting terminal states.** \`Delivered\`, \`Cancelled\`, and \`Refunded\` have no outgoing transitions. Verify the system rejects all events from them; a bug that lets a delivered order be cancelled can trigger an erroneous refund.

**State explosion.** Real systems can have many states and events, making full n-switch coverage impractical. Keep the model at the right abstraction level, group equivalent states, and use 0-switch plus targeted 1-switch instead of exhaustive paths.

**Hidden state.** If behavior depends on a variable not represented in your model (a retry counter, a timestamp), your state machine is incomplete and tests will miss bugs. Promote that hidden variable into an explicit state or guard condition.

**Confusing states with data.** A state is a behavioral mode, not just a field value. "Cart has 3 items" is data; "Cart is in checkout" is a state. Model behavioral modes, and use [equivalence partitioning and boundary value analysis](/blog) for the data values within each state.

## How state transition testing compares

| Technique | Models | Catches |
|---|---|---|
| State transition | Sequences of events over time | Order-dependent and lifecycle bugs |
| Decision table | Static combinations of conditions | Missing logic combinations |
| Equivalence partitioning | Input value classes | Redundant value testing |
| Pairwise | Parameter interactions | Two-way config interaction bugs |

The defining question is *time*: if the outcome depends on what happened before, you need state transitions; if it depends only on the current combination of inputs, a decision table is simpler. You can compare these and related techniques on the [comparison hub](/compare).

## Frequently Asked Questions

### What is state transition testing?

State transition testing is a black-box technique that models a system as a finite set of states connected by event-triggered transitions, then derives test cases from that model. You test valid transitions, invalid transitions, and sequences of transitions to verify the system behaves correctly based on its current state and history. It suits any system where order and prior events affect behavior, such as login flows, order lifecycles, and ATMs.

### What is the difference between 0-switch and 1-switch coverage?

0-switch coverage, also called all-transitions coverage, requires exercising every single valid transition at least once. 1-switch coverage requires testing every valid pair of consecutive transitions, so it catches bugs that only appear after a specific prior transition, like a counter that fails to reset. 1-switch produces more tests than 0-switch and is worth the cost for stateful or order-dependent logic.

### What is the difference between a state diagram and a state table?

A state diagram is a visual graph of states and the transitions between them, ideal for human review and spotting missing paths. A state table is a grid listing every combination of current state and event with the resulting state, including the empty cells that represent invalid transitions. You typically draw the diagram to understand the system and use the table to derive complete test coverage, because the table makes invalid transitions explicit.

### Why are invalid transitions important to test?

Invalid transitions are events that should be rejected in a given state, and they are a common source of security and data-integrity bugs. Examples include shipping an order before it is paid, unlocking a locked account by submitting a password, or cancelling an already-delivered order to trigger a wrongful refund. Testing only valid transitions leaves these failure modes unchecked, so every empty cell in the state table deserves a negative test.

### When should I use state transition testing instead of a decision table?

Use state transition testing when behavior depends on the sequence of events and the system's history, such as a workflow or lifecycle. Use a decision table when behavior depends on a static combination of conditions evaluated together at one moment. The deciding factor is whether order and prior state matter; if they do, choose state transitions, and if only the current inputs matter, a decision table is simpler.

### How do I handle state explosion in large systems?

Keep the model at an appropriate abstraction level rather than enumerating every micro-state, and group behaviorally equivalent states together. Target 0-switch coverage as a baseline and apply 1-switch coverage selectively to the parts with order-dependent logic instead of pursuing exhaustive n-switch paths. If a hidden variable like a counter is driving behavior, model it as an explicit guard condition so the machine stays accurate without ballooning.
`,
};
