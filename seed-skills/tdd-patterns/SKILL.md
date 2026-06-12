---
name: TDD Patterns
description: Practice strict red-green-refactor test-driven development — write one failing test first, make it pass with the minimum code, then refactor under green, with worked cycles in Jest and pytest, AAA structure, and behavior-based test naming.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [tdd, red-green-refactor, unit-testing, jest, pytest, test-first, refactoring, aaa, design]
testingTypes: [tdd, unit]
frameworks: [jest, pytest]
languages: [typescript, javascript, python]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# TDD Patterns

This skill makes an AI agent develop features test-first: write exactly one failing test, watch it fail for the right reason, write the minimum production code to pass, then refactor while green. It enforces the discipline most "TDD" sessions skip — never writing production code without a failing test demanding it. Trigger it when the user asks for TDD, test-first development, or when implementing new logic in a codebase that already has a test runner wired up.

## Core Principles

1. **One failing test at a time.** Not a suite of ten pending tests — one. Multiple red tests mean you are designing in your head instead of letting tests drive.
2. **Watch the test fail before making it pass.** A test you never saw red might be passing vacuously (wrong assertion, testing the mock, typo'd import). The red step verifies the test itself.
3. **Write the minimum code that passes — even if it is embarrassingly dumb.** Returning a hardcoded value is legal; the next test forces the generalization. "Fake it till the tests make you make it."
4. **Refactor only on green, and refactor both sides.** Production code and test code rot equally. Duplication in tests is a design smell exactly as it is in `src/`.
5. **Test behavior through the public API, never internals.** If renaming a private method breaks tests, the tests are coupled to implementation and will resist every refactor instead of enabling it.
6. **Name tests as behavioral sentences.** `rejects expired coupons at the boundary minute` tells the next reader the rule; `test_coupon_3` tells them nothing.
7. **The cycle is minutes, not hours.** If you have been red for 20 minutes, the step was too big — delete, take a smaller bite.

## Workflow: One Full Cycle in Jest (TypeScript)

Feature: a `PriceCalculator` that applies tiered bulk discounts.

**RED — write the smallest failing test:**

```typescript
// src/price-calculator.test.ts
import { describe, expect, it } from '@jest/globals';
import { calculateTotal } from './price-calculator';

describe('calculateTotal', () => {
  it('returns unit price times quantity with no discount under 10 units', () => {
    // Arrange
    const unitPrice = 4.0;
    const quantity = 3;

    // Act
    const total = calculateTotal(unitPrice, quantity);

    // Assert
    expect(total).toBe(12.0);
  });
});
```

```bash
npx jest price-calculator
# FAIL — Cannot find module './price-calculator'  <- failing for the RIGHT reason
```

**GREEN — minimum code, no speculation:**

```typescript
// src/price-calculator.ts
export function calculateTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}
```

**RED again — the next test forces the discount rule:**

```typescript
it('applies a 10 percent discount at 10 units or more', () => {
  expect(calculateTotal(4.0, 10)).toBe(36.0); // 40 - 10%
});

it('applies a 20 percent discount at 50 units or more', () => {
  expect(calculateTotal(2.0, 50)).toBe(80.0); // 100 - 20%
});
```

**GREEN:**

```typescript
export function calculateTotal(unitPrice: number, quantity: number): number {
  const subtotal = unitPrice * quantity;
  if (quantity >= 50) return subtotal * 0.8;
  if (quantity >= 10) return subtotal * 0.9;
  return subtotal;
}
```

**REFACTOR — under green, extract the tier table:**

```typescript
const DISCOUNT_TIERS: ReadonlyArray<{ minQty: number; multiplier: number }> = [
  { minQty: 50, multiplier: 0.8 },
  { minQty: 10, multiplier: 0.9 },
  { minQty: 0, multiplier: 1.0 },
];

export function calculateTotal(unitPrice: number, quantity: number): number {
  const tier = DISCOUNT_TIERS.find((t) => quantity >= t.minQty)!;
  return unitPrice * quantity * tier.multiplier;
}
```

Run the suite after the refactor. Still green, behavior unchanged, structure improved. That is one complete cycle.

## Workflow: Same Discipline in pytest

Feature: a password strength validator, driven boundary-first.

```python
# tests/test_password_policy.py
import pytest

from app.password_policy import validate


class TestValidate:
    def test_rejects_passwords_shorter_than_12_chars(self):
        # Arrange / Act
        result = validate("Short1!aaaa")  # 11 chars

        # Assert
        assert result.ok is False
        assert "at least 12 characters" in result.errors

    def test_accepts_a_12_char_password_meeting_all_rules(self):
        result = validate("Sturdy-Pass1")  # exactly 12

        assert result.ok is True
        assert result.errors == []
```

```bash
pytest tests/test_password_policy.py -x
# ModuleNotFoundError: No module named 'app.password_policy'  <- correct red
```

Minimum green:

```python
# app/password_policy.py
from dataclasses import dataclass, field


@dataclass
class Result:
    ok: bool
    errors: list[str] = field(default_factory=list)


def validate(password: str) -> Result:
    if len(password) < 12:
        return Result(ok=False, errors=["at least 12 characters"])
    return Result(ok=True)
```

Next red drives the remaining rules — and `parametrize` keeps each rule one logical test:

```python
    @pytest.mark.parametrize(
        ("password", "missing"),
        [
            ("alllowercase-12", "an uppercase letter"),
            ("ALLUPPERCASE-12", "a lowercase letter"),
            ("NoDigitsHere-Ab", "a digit"),
        ],
    )
    def test_reports_each_missing_character_class(self, password, missing):
        result = validate(password)

        assert result.ok is False
        assert missing in result.errors
```

Green, then refactor the rule checks into a table of `(predicate, message)` pairs — same move as the discount tiers above.

## Patterns

### Triangulation
When one example lets you fake it (`return 36.0`), add a second example with different inputs. Two data points force the general implementation; that is exactly when to generalize, not before.

### Arrange-Act-Assert, enforced by whitespace
Every test reads as three blocks separated by blank lines. One Act per test. If you need a second Act, you need a second test.

### Test list as a scratchpad
Before starting, jot the behaviors as comments; convert one at a time into a real failing test:

```typescript
// TODO test list — price-calculator
// [x] no discount under 10 units
// [x] 10% at 10+
// [x] 20% at 50+
// [ ] rejects negative quantity with RangeError
// [ ] rounds to 2 decimal places (0.1 + 0.2 money bugs)
```

### Boundary-first ordering
Write the boundary test (exactly 10 units, exactly 12 chars) before the comfortable middle. Off-by-one bugs live at boundaries; TDD that skips them certifies nothing.

## Best Practices

- Run only the focused test file during the cycle (`jest price-calculator --watch`, `pytest -x -k password`); run the full suite before commit.
- Commit on every green — `git commit` after each cycle gives you a bisectable history and a free undo for failed refactors.
- When a bug report arrives, write the failing test that reproduces it before touching the fix. The bug becomes a permanent regression guard.
- Keep unit tests free of I/O. If a test needs the network or filesystem, it is an integration test; move it and mock the port in unit tests.
- Treat a hard-to-write test as design feedback: too many mocks means too many dependencies; a huge Arrange block means the unit does too much.

## Anti-Patterns

- **Writing the implementation first, then backfilling tests.** That is test-after; you lose the design pressure and the verified-red guarantee. The tests will mirror the code's bugs.
- **A batch of failing tests before any implementation.** You committed to a design before feedback. One red at a time.
- **Skipping the refactor step for weeks.** Red-green-red-green without refactoring produces working spaghetti; the third step is where design happens.
- **Asserting on mocks of your own code** (`expect(repo.save).toHaveBeenCalled()` as the only assertion). Verify observable outcomes; interaction-only tests pass while behavior is broken.
- **100%-coverage worship.** Coverage is a byproduct of TDD, not a goal. Chasing the last 4% on getters produces brittle, valueless tests.
- **Changing the test and the code in the same step** when something fails. Change one side, rerun, then the other — otherwise you cannot tell which change fixed (or masked) the failure.

## When to Trigger This Skill

- The user says TDD, test-first, red-green-refactor, or "write the test before the code".
- Implementing a new pure-logic module (pricing, validation, parsing, date math) where fast unit cycles shine.
- A bug fix is requested — drive it with a reproducing failing test first.
- The user wants to learn or enforce AAA structure and behavioral test naming in Jest or pytest.
- A code review reveals tests coupled to internals or written after the fact, and the team wants to reverse the habit.
