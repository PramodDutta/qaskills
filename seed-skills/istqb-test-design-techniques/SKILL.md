---
name: ISTQB Test Design Techniques
description: Apply classic test design techniques the ISTQB way, equivalence partitioning, boundary value analysis, decision tables, state transition testing, and pairwise combinations, to derive minimal high-coverage test sets from requirements.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [istqb, test-design, equivalence-partitioning, boundary-value-analysis, decision-tables, state-transition, pairwise, black-box, manual-testing]
testingTypes: [strategy, acceptance, regression]
frameworks: []
languages: [typescript, python]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# ISTQB Test Design Techniques Skill

You are an expert test analyst trained in ISTQB black-box test design. When the user gives you a requirement, form, API, or state machine and asks for test cases, derive them with these techniques instead of brainstorming randomly.

## Core Principles

1. **Techniques replace guessing.** Each technique is an algorithm from requirement to test set; apply them systematically, then add exploratory intuition on top.
2. **Minimal sets, maximal coverage.** The goal is the FEWEST cases that cover every partition, boundary, rule, and transition; more cases is not more quality.
3. **Name the technique in the test.** A case titled "BVA: max order amount upper boundary" is reviewable; "test order amount" is not.
4. **Invalid partitions are half the work.** Most escapes live in rejected-input handling.
5. **Combine techniques.** Partition first, boundaries on numeric partitions, decision tables for rule interactions, state transitions for lifecycles, pairwise for config spreads.

## Equivalence Partitioning (EP)

Split inputs into classes where the system should behave identically; test ONE value per class.

Example requirement: discount code field accepts 6-10 alphanumeric characters.

| Partition | Class | Representative |
|---|---|---|
| 6-10 alphanumerics | Valid | SAVE2026 |
| Under 6 chars | Invalid | SAVE |
| Over 10 chars | Invalid | SAVEALOT2026X |
| Non-alphanumeric | Invalid | SAVE-26! |
| Empty | Invalid | "" |

Five cases cover what a random tester hits with twenty. Rule: every input gets valid AND invalid partitions; combine one-invalid-at-a-time so failures attribute cleanly.

## Boundary Value Analysis (BVA)

Bugs cluster at edges (off-by-one comparisons). For each numeric/ordered partition, test the boundary and its neighbors.

Requirement: order quantity 1-100.

Two-value BVA: 0, 1, 100, 101. Three-value (stricter): 0, 1, 2 and 99, 100, 101.

```typescript
// the exact bug class BVA catches
if (quantity > 100) reject();     // dev wrote >, spec said >=? case "100" decides
test.each([[0, 'rejected'], [1, 'accepted'], [100, 'accepted'], [101, 'rejected']])(
  'BVA: quantity %i is %s', (qty, outcome) => { /* ... */ });
```

Apply to: lengths, amounts, dates (month ends, leap day, DST), pagination (page 0, 1, last, last+1), file sizes, rate limits.

## Decision Tables

For rules that interact. Columns = rules, rows = conditions then actions. Requirement: free shipping if order >= $50 AND member, expedited option only for members in-country.

| Condition | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| Order >= $50 | Y | Y | N | N |
| Is member | Y | N | Y | N |
| Free shipping | Y | N | N | N |
| Expedited offered | Y | N | Y | N |

Each column becomes one test. Full table = 2^conditions columns; collapse columns whose outcome is decided by one condition (mark others "-"). Any cell the requirement does not answer is a REQUIREMENT BUG; file it before testing.

## State Transition Testing

For lifecycles: orders, subscriptions, user accounts, documents.

```text
States: Draft -> Submitted -> Approved -> Shipped -> Delivered
                    |            |
                    v            v
                 Rejected     Cancelled
```

Coverage levels: 0-switch = every valid transition once (minimum); 1-switch = every pair of consecutive transitions (catches state corruption). The high-yield cases are INVALID transitions: Ship a Draft, Cancel a Delivered, Approve a Rejected. Build the full state x event matrix; every empty cell is a test expecting rejection.

## Pairwise (Combinatorial) Testing

For configuration spreads: 4 browsers x 3 OS x 3 roles x 2 locales = 72 combos; pairwise covers every PAIR of values in ~12 to 15 cases, catching the interaction bugs that single-factor tests miss.

```bash
# PICT (free, Microsoft) generates the minimal pair-covering set
cat > model.txt <<'EOF'
Browser: Chrome, Firefox, Safari, Edge
OS: Windows, macOS, Android
Role: Admin, Member, Guest
Locale: en-US, de-DE
EOF
pict model.txt
```

Use for: platform matrices, feature-flag combinations, pricing-plan x role permissions. Escalate specific known-risky pairs to explicit full cases.

## Choosing the Technique

| Situation | Technique |
|---|---|
| Input field or parameter with ranges/formats | EP, then BVA on numeric edges |
| Business rules with multiple conditions | Decision table |
| Entity with a lifecycle | State transition + invalid-transition matrix |
| Config/platform matrix | Pairwise |
| Everything, afterwards | Error guessing + exploratory charter on top |

## Worked Micro-Example (API)

POST /transfer, amount 0.01-10000, requires verified account, daily cap 20000.

1. EP: valid amount, below min, above max, non-numeric, missing; verified vs unverified account
2. BVA: 0.00, 0.01, 0.02, 9999.99, 10000.00, 10000.01; daily cap at 19999.99/20000.00/20000.01 (two transfers)
3. Decision table: verified x within-cap x valid-amount (8 columns, collapse to 4)
4. State: account Frozen/Closed attempting transfer = invalid transitions

Roughly 18 cases, each traceable to a technique, instead of 60 ad hoc ones.

## Common Mistakes

- Testing three values inside the same partition (redundant) while an invalid partition has zero coverage
- BVA on requirements, not implementation: test spec boundaries AND obvious internal ones (page size, batch limits)
- Decision tables with "impossible" columns silently dropped; confirm impossibility with the product owner, half are real
- State tests that only walk the happy path; the invalid-transition matrix is where crashes live
- Reporting "N test cases" as coverage; report partitions/rules/transitions covered

## Checklist

- [ ] Every input: valid + invalid partitions enumerated, one representative each
- [ ] Every numeric/ordered partition: boundary neighbors tested
- [ ] Multi-condition rules: decision table built, unanswered cells filed as requirement bugs
- [ ] Lifecycles: transition diagram, 0-switch coverage, invalid-transition matrix
- [ ] Config spreads: pairwise-generated set, risky pairs promoted to explicit cases
- [ ] Each test names its technique for reviewability
