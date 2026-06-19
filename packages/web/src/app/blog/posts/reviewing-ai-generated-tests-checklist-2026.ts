import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Reviewing AI-Generated Tests: A Code-Review Checklist 2026",
  description: "A practical code-review checklist for AI-generated tests from Claude Code, Cursor, and Copilot — catch tautologies, weak assertions, and fake coverage.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Reviewing AI-Generated Tests: A Code-Review Checklist

AI coding agents like Claude Code, Cursor, and GitHub Copilot now write a large share of new test code, and reviewing those tests requires a different eye than reviewing human-written ones. The core risk is that AI-generated tests look thorough and pass green while proving almost nothing — tautological assertions, tests that re-implement the code they test, mocked-away logic, and high line coverage with zero behavioral coverage. The fix is a deliberate review checklist: verify each test would actually fail if the behavior broke, check that assertions are specific, and confirm edge cases and error paths are real, not decorative.

This guide gives you that checklist, with concrete examples of the failure modes AI tools produce most often and how to catch them in review.

## Why AI-generated tests need their own review process

A human writing a test usually has a behavior in mind first and writes an assertion to pin it down. An AI generates tests by pattern-matching on the code in front of it, which produces a characteristic set of weaknesses: it tends to mirror the implementation, assert on whatever the code happens to return, and optimize for "tests that pass" rather than "tests that would catch a regression." It is also confidently verbose — a 40-line test that exercises one trivial getter looks like diligence but is noise.

The single most useful mental model when reviewing AI tests: **a test is only valuable if it can fail.** A test that passes no matter what the code does is worse than no test, because it adds maintenance cost and false confidence. Most of the checklist below is variations on that one question.

| AI test failure mode | What it looks like | Why it's dangerous |
|---|---|---|
| Tautology | Asserts the code equals itself | Never fails; pure noise |
| Weak assertion | \`expect(result).toBeDefined()\` | Passes for wrong values |
| Over-mocking | Every dependency mocked | Tests wiring, not logic |
| Fake coverage | Calls code, asserts trivia | High coverage, no behavior |
| Mirrored logic | Test re-computes the algorithm | Same bug in test and code |
| Happy-path only | No error/edge cases | Misses the bugs that matter |

## The review checklist

Work through these in order. The first three catch the highest-severity problems.

### 1. Would this test fail if the behavior broke?

This is the master check. For each test, ask: if I introduced the obvious bug this test should catch, would it go red? If you cannot answer yes immediately, the test is suspect.

A fast way to verify in practice is **mutation thinking** — mentally (or with a mutation-testing tool) flip a \`+\` to a \`-\`, an \`==\` to a \`!=\`, or return a wrong constant, and check the test catches it.

\`\`\`python
# AI-generated. Does it catch a real bug?
def test_discount():
    price = apply_discount(100, 0.1)
    assert price is not None        # NO. Passes for 90, 0, -5, "banana"
\`\`\`

If \`apply_discount\` returned \`0\` or \`1000\`, this still passes. It cannot fail in any useful way. Reject it.

\`\`\`python
# What it should be
def test_ten_percent_discount():
    assert apply_discount(100, 0.1) == 90   # fails the moment math breaks
\`\`\`

### 2. Is the assertion specific?

Vague assertions are the most common AI weakness. Flag any of these unless there is a clear reason:

- \`assert x is not None\` / \`expect(x).toBeDefined()\` / \`expect(x).toBeTruthy()\`
- \`assert len(result) > 0\` (when you know the exact length)
- \`expect(result).toEqual(expect.anything())\`
- asserting a type but not a value: \`assert isinstance(r, dict)\`

\`\`\`javascript
// Weak: passes for any non-empty array
test('search returns results', () => {
  const r = search('claude');
  expect(r.length).toBeGreaterThan(0);
});

// Specific: pins the actual contract
test('search returns the matching skill first', () => {
  const r = search('claude');
  expect(r[0].slug).toBe('claude-code-qa');
  expect(r).toHaveLength(3);
});
\`\`\`

A specific assertion documents the contract; a vague one documents nothing and tolerates regressions.

### 3. Does the test mock away the thing it claims to test?

AI tools love to mock. Check that the *unit under test* is real, and only its *external* collaborators are doubled. The giveaway is a test whose only assertions are \`toHaveBeenCalled\` on mocks.

\`\`\`javascript
// AI-generated: mocks the function it's "testing"
test('calculateTotal sums line items', () => {
  const calc = jest.spyOn(cart, 'calculateTotal').mockReturnValue(42);
  expect(cart.calculateTotal()).toBe(42);   // tests the mock, not the code
});
\`\`\`

This asserts that a mock returns what you told it to return. It is a tautology with extra steps. The real test must call the *actual* \`calculateTotal\` and assert on a computed total.

### 4. Does the test re-implement the code's logic?

A subtle, dangerous pattern: the AI computes the expected value using the same algorithm as the production code. If the algorithm is wrong, both the code and the test are wrong in the same way, and the test passes.

\`\`\`python
# Mirrored logic: test re-derives the formula instead of using a known value
def test_compound_interest():
    expected = principal * (1 + rate) ** years   # same formula as the code!
    assert compound_interest(principal, rate, years) == expected
\`\`\`

If the production formula has a bug (say it should compound monthly), the test inherits it. Use **known, hand-verified values** instead:

\`\`\`python
def test_compound_interest_known_value():
    # $1000 at 5% for 2 years, annual compounding = $1102.50 (verified by hand)
    assert compound_interest(1000, 0.05, 2) == 1102.50
\`\`\`

### 5. Are edge cases and error paths real?

AI defaults to the happy path. Check that the suite covers:

- **Boundaries:** empty input, single element, max length, zero, negative.
- **Errors:** does the code raise/return errors for bad input, and does a test assert *that specific* error?
- **Nulls/undefined:** does it handle missing fields?

\`\`\`python
# Good error-path test: asserts the specific failure, not just "it throws"
def test_discount_rejects_rate_above_one():
    with pytest.raises(ValueError, match="rate must be between 0 and 1"):
        apply_discount(100, 1.5)
\`\`\`

A \`try/except: pass\` around the call, or \`with pytest.raises(Exception)\` (too broad), is a smell — it passes for the *wrong* exception. Require the specific exception type and message.

### 6. Is the test deterministic and isolated?

AI-generated tests sometimes leak real time, randomness, network, or shared state. Check for:

- Real \`Date.now()\` / \`datetime.now()\` without a frozen clock.
- Unseeded randomness in assertions.
- Real network/database calls (should be a fake or fixture).
- Dependence on other tests' state or execution order.

These cause flakiness, which destroys trust in the whole suite. Pair this review with a [flaky-test quarantine](/blog) process so any flake that slips through is caught and isolated rather than re-run blindly.

### 7. Does the test name describe the behavior?

\`test_function_1\`, \`test_works\`, \`test_calculateTotal\` (named after the method, not the behavior) are AI defaults. A good name reads as a specification: \`test_applies_ten_percent_discount_to_subtotal\`. If you cannot tell what a test verifies from its name, that is feedback that the test may be doing too much or proving too little.

### 8. Is there fake coverage hiding gaps?

High line coverage with low behavioral coverage is the trap AI tools spring most often. A test that *executes* a function but only asserts something trivial "covers" the lines without testing them. When the coverage report is green, ask whether the *assertions* actually exercise the branches, not just whether the lines ran. Coverage measures execution; it does not measure verification.

## A worked review: spotting the problems

Here is a realistic AI-generated test block. Find the issues before reading the verdict.

\`\`\`javascript
import { processOrder } from './orders';

describe('processOrder', () => {
  test('test 1', () => {
    const result = processOrder({ items: [{ price: 10, qty: 2 }] });
    expect(result).toBeDefined();
  });

  test('test 2', () => {
    const spy = jest.spyOn(orders, 'processOrder').mockReturnValue({ total: 20 });
    expect(orders.processOrder({})).toEqual({ total: 20 });
  });

  test('test 3', () => {
    const items = [{ price: 10, qty: 2 }];
    const expected = items.reduce((s, i) => s + i.price * i.qty, 0);
    expect(processOrder({ items }).total).toBe(expected);
  });
});
\`\`\`

**Verdict:**
- \`test 1\` — weak assertion (\`toBeDefined\`) and a useless name. Passes for any non-undefined value. Reject.
- \`test 2\` — tautology: mocks \`processOrder\` and asserts the mock. Tests nothing. Reject.
- \`test 3\` — mirrored logic: re-implements the total formula. If the real code forgets tax, the test agrees. Replace with a known value: \`expect(processOrder({ items }).total).toBe(20)\`.

All three "pass," coverage looks good, and not one of them would catch a real regression. This is exactly why AI tests need a dedicated review pass.

## Integrating the checklist into your workflow

Make the checklist cheap to apply:

- **Put it in your PR template** as a collapsible checklist so reviewers tick each item for AI-authored test files.
- **Prompt the AI better up front.** Ask the agent to write tests with specific assertions and known expected values, to cover error paths, and to avoid mocking the unit under test. Better prompts reduce review burden.
- **Run mutation testing on critical modules.** Tools like Stryker (JS/TS), \`mutmut\` or \`cosmic-ray\` (Python), and PIT (Java) automatically verify whether tests catch injected bugs — the empirical version of checklist item 1.
- **Require known values for any calculation.** Make "no formula re-implementation in tests" a team rule.
- **Treat coverage as necessary, not sufficient.** Gate on coverage, but review assertions separately.

The broader [QA skills directory](/skills) curates agent skills specifically aimed at producing higher-quality tests, and you can compare testing tools and approaches on the [comparison hub](/compare). The goal is not to stop using AI to write tests — it is enormously productive — but to review its output for the specific ways it cuts corners.

## Frequently Asked Questions

### Why can't I trust AI-generated tests that pass?

Because a passing test only proves the code ran without error on that input, not that the behavior is correct. AI tools frequently produce tautological or weakly-asserted tests that pass regardless of what the code does, so a green suite can hide real regressions. The reliable check is whether each test would *fail* if you broke the behavior it claims to cover.

### What is the most common problem with AI-generated tests?

Weak assertions are the most frequent issue — checks like \`toBeDefined\`, \`not None\`, or \`length > 0\` that tolerate wrong values. The second most common is tautology, where the test mocks the very function it claims to test and then asserts the mock's return value. Both look like coverage while proving nothing about real behavior.

### How do I verify a test would actually catch a bug?

Use mutation thinking: mentally or automatically introduce a small bug — flip an operator, return a wrong constant, off-by-one a boundary — and confirm the test goes red. Mutation-testing tools like Stryker, mutmut, and PIT automate this by injecting many such changes and reporting which ones your tests fail to catch, giving you an empirical measure of test strength.

### Should AI write tests at all if I have to review them so carefully?

Yes. AI is highly productive at scaffolding test structure, generating fixtures, and covering many input variations quickly. The review checklist does not undo that value; it just catches the specific corners AI tends to cut. A reviewed AI-authored suite is typically faster to produce and broader than a hand-written one, as long as you verify the assertions are meaningful.

### How is reviewing AI-generated tests different from reviewing human tests?

The failure modes differ. Humans tend to write too few tests or forget edge cases, while AI tends to write many tests that look thorough but assert weakly, mock excessively, or mirror the implementation. Reviewing AI tests therefore focuses less on "is there coverage" and more on "does this coverage actually verify behavior" — checking assertion specificity and whether each test can fail.

### Can mutation testing replace manual review of AI tests?

It complements but does not fully replace it. Mutation testing objectively measures whether tests catch injected bugs, which directly addresses tautologies and weak assertions. But it will not flag unclear test names, over-mocking that happens to still catch mutants, or missing test scenarios for behaviors that have no code yet. Use both: mutation testing for assertion strength, human review for design and completeness.
`,
};
