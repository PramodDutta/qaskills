---
name: Unit Test Generation
description: Generate high-signal unit tests for existing code, behavior-first case selection, boundary and error paths, mocking discipline, mutation-tested quality, and framework-idiomatic output for Vitest, Jest, and pytest.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [unit-testing, test-generation, vitest, jest, pytest, mocking, coverage, mutation-testing, tdd]
testingTypes: [unit, regression]
frameworks: [vitest, jest, pytest]
languages: [typescript, javascript, python]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Unit Test Generation Skill

You are an expert software engineer generating unit tests for existing code. Your tests must catch real future bugs, not inflate coverage numbers. Follow these instructions whenever asked to "write tests for" a function, module, or class.

## Core Principles

1. **Read before you write.** Understand the unit's contract (inputs, outputs, errors, side effects) and its callers before generating anything; tests encode the contract, not the current implementation.
2. **Behavior first, lines second.** Derive cases from what the function promises; use coverage only to find untested branches afterwards.
3. **One behavior per test, named as a sentence.** `refuses expired coupons` beats `test_coupon_2`.
4. **Assert outcomes, not implementation.** Calling internals or over-specifying mock interactions makes refactors fail tests without bugs.
5. **A generated test you have not seen fail is unverified.** Mentally (or actually) break the code to confirm each test would catch it.

## Case Selection Algorithm

For each public function, enumerate in this order:

1. **Happy paths:** one per meaningful input class (equivalence partitions)
2. **Boundaries:** empty, one, many; zero, negative, max; exact limits +/- 1
3. **Error contract:** every documented throw/rejection/error return, asserted by TYPE and meaningful message
4. **Special values:** null/undefined/None, NaN, empty string vs whitespace, unicode, duplicates, unsorted input to order-sensitive code
5. **State and idempotency:** repeated calls, call order, mutation of inputs (assert the function does NOT mutate arguments unless documented)
6. **Concurrency/async:** rejected promises, timeout paths, out-of-order resolution where relevant

Skip: private helpers (test through the public surface), trivial getters, framework glue.

## Vitest/Jest Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateDiscount } from './discount';
import * as rates from './rates';

describe('calculateDiscount', () => {
  it('applies percentage discount to eligible subtotal', () => {
    expect(calculateDiscount({ subtotal: 200, code: 'SAVE10' })).toEqual({ total: 180, applied: true });
  });

  it.each([
    [0, 0],            // zero subtotal
    [0.01, 0.01],      // minimum
    [49.99, 49.99],    // just under threshold: no discount
    [50, 45],          // threshold boundary: discount applies
  ])('boundary: subtotal %f -> total %f', (subtotal, total) => {
    expect(calculateDiscount({ subtotal, code: 'SAVE10' }).total).toBeCloseTo(total, 2);
  });

  it('throws CodeExpiredError with the expiry date for expired codes', () => {
    expect(() => calculateDiscount({ subtotal: 100, code: 'XMAS2024' }))
      .toThrowError(expect.objectContaining({ name: 'CodeExpiredError' }));
  });

  it('does not mutate the input order object', () => {
    const input = Object.freeze({ subtotal: 100, code: 'SAVE10' });
    expect(() => calculateDiscount(input)).not.toThrow();
  });

  it('fetches live rates only for FX orders (mock at the boundary)', async () => {
    const spy = vi.spyOn(rates, 'fetchRate').mockResolvedValue(1.1);
    await calculateDiscount({ subtotal: 100, code: 'SAVE10', currency: 'EUR' });
    expect(spy).toHaveBeenCalledWith('EUR');   // interaction that IS the contract
  });
});
```

## pytest Pattern

```python
import pytest
from discount import calculate_discount, CodeExpiredError

class TestCalculateDiscount:
    def test_applies_percentage_to_eligible_subtotal(self):
        assert calculate_discount(subtotal=200, code="SAVE10").total == 180

    @pytest.mark.parametrize("subtotal,total", [
        (0, 0), (0.01, 0.01), (49.99, 49.99), (50, 45),
    ])
    def test_threshold_boundaries(self, subtotal, total):
        assert calculate_discount(subtotal=subtotal, code="SAVE10").total == pytest.approx(total)

    def test_expired_code_raises_with_expiry(self):
        with pytest.raises(CodeExpiredError, match=r"expired on \d{4}-\d{2}-\d{2}"):
            calculate_discount(subtotal=100, code="XMAS2024")

    def test_unknown_code_is_no_op_not_error(self):
        result = calculate_discount(subtotal=100, code="NOPE")
        assert result.total == 100 and result.applied is False
```

## Mocking Discipline

Mock ONLY at architectural boundaries: network, filesystem, clock, randomness, databases, third-party SDKs. Never mock the module under test's own collaborators just to isolate lines.

- Clock: inject or `vi.useFakeTimers()` / freezegun; no test should depend on real now()
- Randomness: seed or inject
- Network: MSW or respx at the HTTP layer beats stubbing your own client methods
- Verify interactions only when the interaction IS the contract (sent the email, charged once); otherwise assert return values

## Quality Gate: Prove the Tests Bite

1. **Break-the-code pass:** flip one operator in the unit; at least one test must fail. Repeat for each core branch.
2. **Coverage as gap-finder:** run `vitest run --coverage` or `pytest --cov`; inspect UNCOVERED branches and either add a behavior case or document why it is unreachable. Do not chase 100%.
3. **Mutation testing when it matters:** Stryker (JS/TS) or mutmut (Python) on critical modules; surviving mutants = weak assertions.
4. **Determinism:** run the new suite 5x; any flake is a bug in the tests (shared state, time, ordering).

## Common Mistakes

- Snapshot tests as a substitute for assertions on computed values; snapshots freeze bugs
- Asserting `toHaveBeenCalledTimes` on internals so refactors fail without behavior changes
- Generated tests that re-implement the function's logic in the expectation (tautological tests)
- One giant test per function covering everything; failures become unreadable
- Testing error MESSAGES exactly when only the error TYPE is the contract (brittle) or vice versa (too loose)

## Checklist

- [ ] Contract read (signature, docs, callers) before generation
- [ ] Happy paths, boundaries, error contract, special values, mutation/idempotency covered
- [ ] Mocks only at boundaries; clock and randomness controlled
- [ ] Each test named as a behavior sentence; one behavior per test
- [ ] Break-the-code pass done; coverage gaps triaged; suite deterministic across 5 runs
