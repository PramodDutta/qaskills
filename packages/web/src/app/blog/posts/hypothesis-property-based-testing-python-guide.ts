import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Hypothesis: Property-Based Testing in Python (2026)',
  description:
    'Find edge-case bugs with Hypothesis property-based testing in Python — strategies, @given, shrinking, stateful testing, settings, and pytest integration. Runnable examples.',
  date: '2026-06-21',
  category: 'Tutorial',
  content: `
# Hypothesis: Property-Based Testing in Python (2026)

Most Python test suites are built from examples. You pick a handful of inputs you can think of, compute the expected output by hand, and assert that your function produces it. This works, but it has a fundamental blind spot: you only test the cases you imagined. The empty string, the negative zero, the Unicode surrogate, the list with a billion elements, the integer that overflows a downstream API — these are exactly the inputs that cause production incidents, and they are exactly the inputs a human writing example tests forgets. Example-based testing checks that your code works for the inputs you thought of; it says nothing about the inputs you didn't.

Property-based testing flips this around. Instead of writing specific inputs and outputs, you describe the *space* of valid inputs and a *property* that must hold for all of them, and the testing library generates hundreds of examples to try to break that property. Hypothesis is the dominant property-based testing library for Python, and in 2026 it is a mature, production-grade tool used by everything from small libraries to the CPython standard library itself. When Hypothesis finds an input that violates your property, it does something remarkable: it *shrinks* that input to the smallest, simplest counterexample that still triggers the failure, then saves it so the bug is reproduced deterministically on every subsequent run.

This tutorial is a complete, code-first guide to using Hypothesis effectively. We will start with the difference between example-based and property-based thinking, install the library, and learn the \`@given\` decorator and the strategy system that generates data — integers, text, lists, floats, dictionaries, sampled values, and objects built from constructors. We will write composite strategies with \`@composite\`, use \`assume()\` to filter inputs, and understand how shrinking finds minimal counterexamples. We will cover the classic property patterns — round-trip, idempotence, commutativity — that make properties easy to discover. Then we will tune behavior with \`settings\`, replay failures from the Hypothesis database, drive complex systems with stateful testing via \`RuleBasedStateMachine\`, integrate cleanly with pytest and \`parametrize\`, and finish with performance and flakiness notes. Every section has runnable code. If you want to go deeper on the testing stack around this, the [QA skills directory](/skills) has installable testing skills for AI coding agents.

## Example-Based vs Property-Based Testing

The distinction is best seen with a concrete function. Suppose you write a function to round-trip a list through JSON-like serialization. An example-based test looks like this:

\`\`\`python
def encode(data): ...
def decode(blob): ...

def test_roundtrip_example():
    assert decode(encode([1, 2, 3])) == [1, 2, 3]
    assert decode(encode([])) == []
    assert decode(encode([0])) == [0]
\`\`\`

These three assertions pass, and you move on — never discovering that \`encode\` mangles negative numbers, or chokes on a list of 100,000 elements, or loses precision on floats. The example test only ever exercises the three inputs you typed.

A property-based test describes the rule instead: "for any list of integers, decoding the encoding returns the original list." Hypothesis then generates that list for you — empty lists, huge lists, lists of giant negative numbers, lists with duplicates — searching for any input that breaks the rule.

| Aspect | Example-based | Property-based |
|---|---|---|
| You write | Specific inputs + expected outputs | A rule that holds for all inputs |
| Coverage | Only inputs you imagined | Hundreds of generated inputs incl. edge cases |
| Edge cases | Manually enumerated | Discovered automatically |
| On failure | Shows the input you wrote | Shrinks to minimal counterexample |
| Maintenance | Update outputs when logic changes | Property often stays stable |
| Best for | Known specific cases, regressions | Invariants, parsers, data structures, math |

The two approaches are complementary. Keep example tests for specific known behaviors and regressions; add property tests to flush out the edge cases you cannot enumerate by hand.

## Installing Hypothesis

Hypothesis is a pure-Python package available on PyPI and works with any Python test runner, though it integrates most smoothly with pytest.

\`\`\`bash
pip install hypothesis

# Optional extras pull in strategies for popular libraries:
pip install "hypothesis[numpy,pandas,django,pytz]"
\`\`\`

It requires no configuration to start. Import the \`@given\` decorator and the \`strategies\` module (conventionally aliased as \`st\`) and you are ready to write your first property test.

\`\`\`python
from hypothesis import given
from hypothesis import strategies as st

@given(st.integers())
def test_negation_is_involution(n):
    # Negating twice returns the original number — a property of all integers.
    assert -(-n) == n
\`\`\`

Run it with \`pytest\`. Hypothesis generates many integers — zero, large positives, large negatives, boundary values around machine word sizes — and checks the property for each.

## The @given Decorator and Strategies

\`@given\` is how you connect strategies to a test. Each argument to \`@given\` is a strategy that produces values for the correspondingly-named test parameter. A *strategy* is Hypothesis's term for a recipe that knows how to generate (and shrink) a particular kind of data.

The core built-in strategies cover the primitive and collection types. \`st.integers()\` generates integers (optionally bounded with \`min_value\`/\`max_value\`); \`st.text()\` generates Unicode strings; \`st.lists()\` generates lists of another strategy; \`st.floats()\` generates floating-point numbers including the troublesome \`nan\` and \`inf\`; \`st.dictionaries()\` builds dicts from key and value strategies; \`st.sampled_from()\` picks from a fixed set; and \`st.builds()\` constructs objects by calling a function or class with strategy-generated arguments.

\`\`\`python
from hypothesis import given
from hypothesis import strategies as st

@given(st.lists(st.integers()))
def test_reverse_twice_is_identity(xs):
    assert list(reversed(list(reversed(xs)))) == xs

@given(st.text())
def test_upper_then_lower_is_idempotent(s):
    assert s.upper().lower().lower() == s.upper().lower()

@given(st.dictionaries(keys=st.text(), values=st.integers()))
def test_dict_roundtrips_through_items(d):
    assert dict(d.items()) == d

@given(st.floats(allow_nan=False, allow_infinity=False))
def test_float_abs_is_nonnegative(x):
    assert abs(x) >= 0
\`\`\`

Strategies compose. \`st.lists(st.tuples(st.integers(), st.text()))\` generates lists of (int, str) pairs. \`st.one_of(st.integers(), st.text())\` generates either an integer or a string. This composability is what lets you describe arbitrarily complex input spaces. Below is a quick reference for the most-used built-ins.

| Strategy | Generates | Common arguments |
|---|---|---|
| \`st.integers()\` | Python ints (unbounded by default) | \`min_value\`, \`max_value\` |
| \`st.floats()\` | Floats incl. nan/inf | \`allow_nan\`, \`allow_infinity\`, \`min_value\` |
| \`st.text()\` | Unicode strings | \`alphabet\`, \`min_size\`, \`max_size\` |
| \`st.booleans()\` | True / False | — |
| \`st.lists(s)\` | Lists of strategy \`s\` | \`min_size\`, \`max_size\`, \`unique\` |
| \`st.dictionaries(k, v)\` | Dicts | \`min_size\`, \`max_size\` |
| \`st.tuples(a, b, ...)\` | Fixed-shape tuples | positional strategies |
| \`st.sampled_from(seq)\` | One element from \`seq\` | the sequence/enum |
| \`st.one_of(a, b)\` | Value from any given strategy | the strategies |
| \`st.builds(Cls, ...)\` | Objects via constructor | callable + arg strategies |
| \`st.none()\` | \`None\` | — |
| \`st.datetimes()\` | datetime objects | \`min_value\`, \`max_value\`, \`timezones\` |

## Composite Strategies and @composite

Sometimes the data you need has interdependent parts that the basic combinators cannot express — for example, a list together with a valid index into that list, or a start date that must precede an end date. The \`@composite\` decorator lets you write a strategy imperatively, drawing values one at a time and using earlier draws to constrain later ones.

\`\`\`python
from hypothesis import given
from hypothesis import strategies as st

@st.composite
def list_and_index(draw):
    # Draw a non-empty list first...
    xs = draw(st.lists(st.integers(), min_size=1))
    # ...then draw a valid index into it, using its length.
    i = draw(st.integers(min_value=0, max_value=len(xs) - 1))
    return xs, i

@given(list_and_index())
def test_index_is_always_valid(pair):
    xs, i = pair
    # The drawn index is guaranteed in-range, so this never raises IndexError.
    assert xs[i] in xs

@st.composite
def ordered_dates(draw):
    start = draw(st.dates())
    end = draw(st.dates(min_value=start))   # end is constrained to be >= start
    return start, end
\`\`\`

The \`draw\` callable is the key: it pulls a value from a strategy and lets you branch on it. Composite strategies still shrink correctly, because Hypothesis tracks the draws and shrinks each one.

## assume() and Filtering Inputs

Occasionally a generated input is technically valid but irrelevant to the property under test. The \`assume()\` function tells Hypothesis to discard the current example and try another if a condition is not met. It is the right tool when you need to exclude a small fraction of inputs.

\`\`\`python
from hypothesis import given, assume
from hypothesis import strategies as st

@given(st.integers(), st.integers())
def test_division_is_inverse_of_multiplication(a, b):
    assume(b != 0)               # discard examples where b is zero
    assert (a * b) // b == a
\`\`\`

Use \`assume()\` sparingly. If you discard most generated inputs, Hypothesis wastes effort and may give up with a \`Unsatisfiable\` error. When you find yourself filtering out the majority of cases, it is almost always better to generate the right data directly — for example with a bounded strategy (\`st.integers(min_value=1)\`) or a composite strategy — rather than generating broadly and rejecting.

## How Shrinking Finds Minimal Counterexamples

Shrinking is the feature that makes Hypothesis failures actionable. When a property fails, the raw counterexample is often huge and noisy — a list of 73 random integers, say. Hypothesis does not report that. Instead it repeatedly tries simpler versions of the failing input — shorter lists, smaller numbers, earlier elements — keeping any that still fail, until it reaches a *minimal* example that can no longer be simplified while preserving the failure.

Consider a buggy function that crashes on any list containing a number greater than 100:

\`\`\`python
from hypothesis import given
from hypothesis import strategies as st

def process(xs):
    for x in xs:
        if x > 100:
            raise ValueError("too big")  # the bug
    return sum(xs)

@given(st.lists(st.integers()))
def test_process_never_crashes(xs):
    process(xs)  # property: this should never raise
\`\`\`

Hypothesis might first fail on \`[42, -17, 9999, 3, 800, ...]\`. Through shrinking it strips away every element that is not needed to trigger the crash and minimizes the offending number, ultimately reporting the minimal counterexample \`[101]\` — the smallest list with the smallest number that still raises. A one-element list pointing at exactly the boundary tells you the bug instantly. This minimization is automatic and is why Hypothesis failures are far easier to debug than a fuzzer dumping a giant random input.

## Classic Property Patterns

The hardest part of property-based testing is not the API — it is inventing properties. A handful of reusable patterns cover the majority of real cases.

**Round-trip (encode/decode)** is the most productive pattern: if you have a pair of inverse functions, the property is that applying one then the other returns the original. This catches serialization bugs, parser bugs, and encoding bugs.

\`\`\`python
import json
from hypothesis import given
from hypothesis import strategies as st

@given(st.lists(st.integers()))
def test_json_roundtrip(xs):
    assert json.loads(json.dumps(xs)) == xs
\`\`\`

**Idempotence** asserts that applying an operation twice equals applying it once — true of sorting, normalization, deduplication, and \`abs\`.

\`\`\`python
@given(st.lists(st.integers()))
def test_sorting_is_idempotent(xs):
    once = sorted(xs)
    twice = sorted(once)
    assert once == twice
\`\`\`

**Commutativity** asserts that operand order does not change the result — true of addition, multiplication, set union, and \`max\`.

\`\`\`python
@given(st.integers(), st.integers())
def test_addition_is_commutative(a, b):
    assert a + b == b + a
\`\`\`

| Pattern | Property | Example targets |
|---|---|---|
| Round-trip | \`decode(encode(x)) == x\` | JSON, base64, parsers, ORMs |
| Idempotence | \`f(f(x)) == f(x)\` | sort, dedupe, normalize, abs |
| Commutativity | \`f(a, b) == f(b, a)\` | add, multiply, union, max |
| Invariant | \`len(sorted(x)) == len(x)\` | data structure operations |
| Oracle / reference | \`fast(x) == slow_reference(x)\` | optimized vs naive implementations |
| Metamorphic | \`f(x) relates to f(transform(x))\` | search, ranking, ML inference |

The oracle pattern — comparing a fast implementation against a simple, obviously-correct reference — is especially powerful when you are optimizing existing code. For more on the testing foundations behind these, see [Python vs pytest explained](/blog/python-vs-pytest-explained).

## Tuning Behavior with settings

The \`@settings\` decorator controls how Hypothesis runs a test. The most important knobs are \`max_examples\` (how many inputs to generate — default 100), \`deadline\` (per-example time limit, defaulting to 200ms, which raises if an example is too slow), and \`derandomize\` (use a fixed seed so runs are reproducible).

\`\`\`python
from hypothesis import given, settings
from hypothesis import strategies as st

@settings(max_examples=500, deadline=None)
@given(st.lists(st.integers()))
def test_with_more_examples(xs):
    assert sorted(xs) == sorted(xs)

# Reproducible runs in CI: same inputs every time.
@settings(derandomize=True)
@given(st.text())
def test_deterministic(s):
    assert s.encode().decode() == s
\`\`\`

| Setting | Default | What it controls |
|---|---|---|
| \`max_examples\` | 100 | Number of generated inputs per test |
| \`deadline\` | 200ms | Max time per example; \`None\` disables it |
| \`derandomize\` | False | Fixed seed for reproducible generation |
| \`max_examples\` (CI) | raise to 500-1000 | More thorough nightly runs |
| \`phases\` | all | Which phases run (reuse, generate, shrink, etc.) |
| \`suppress_health_check\` | — | Silence specific health-check warnings |

A common pattern is a fast default in CI (\`max_examples=100\`) and a thorough nightly profile (\`max_examples=1000\`, \`deadline=None\`) registered via \`settings.register_profile\`.

## The Hypothesis Database and Replaying Failures

When Hypothesis finds a failing example, it saves the minimal counterexample to a local database (by default \`.hypothesis/examples\`). On the next run, it replays saved failures *first*, before generating new ones. This means a bug found once is reproduced deterministically on every subsequent run until it is fixed — there is no flaky "it failed in CI but I can't reproduce it" problem with the discovered counterexample.

You should commit the \`.hypothesis\` directory's example database to share found failures across a team and CI, or configure a shared database backend. To pin a specific counterexample permanently as a regression test, copy it into an \`@example\` decorator so it always runs regardless of the database:

\`\`\`python
from hypothesis import given, example
from hypothesis import strategies as st

@example([101])               # always test this known-bad input
@given(st.lists(st.integers()))
def test_process(xs):
    # Once the bug is fixed, this guards against regressions forever.
    result = sum(x for x in xs if x <= 100)
    assert isinstance(result, int)
\`\`\`

## Stateful Testing with RuleBasedStateMachine

Some bugs only appear in a *sequence* of operations, not in any single call — think of a cache, a connection pool, a queue, or any object with mutable state. Hypothesis models this with \`RuleBasedStateMachine\`: you declare rules (operations) and invariants, and Hypothesis generates random sequences of rule calls, shrinking failing sequences to the shortest reproducer.

\`\`\`python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
from hypothesis import strategies as st

class BoundedStack:
    def __init__(self, capacity=3):
        self.capacity = capacity
        self.items = []
    def push(self, x):
        if len(self.items) < self.capacity:
            self.items.append(x)
    def pop(self):
        return self.items.pop() if self.items else None

class StackMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.stack = BoundedStack(capacity=3)

    @rule(x=st.integers())
    def push(self, x):
        self.stack.push(x)

    @rule()
    def pop(self):
        self.stack.pop()

    @invariant()
    def never_exceeds_capacity(self):
        # This must hold after every operation in every sequence.
        assert len(self.stack.items) <= self.stack.capacity

TestStack = StackMachine.TestCase
\`\`\`

Hypothesis will fire random interleavings of \`push\` and \`pop\`, checking the invariant after each step. If any sequence violates it, Hypothesis shrinks the sequence to the minimal series of operations that reproduces the failure.

## Pytest Integration and Combining with parametrize

Hypothesis tests *are* pytest tests — a function decorated with \`@given\` is collected and run by pytest like any other. You can use fixtures, markers, and assertions exactly as usual. You can also combine \`@given\` with \`@pytest.mark.parametrize\` to run the same property across several fixed configurations.

\`\`\`python
import pytest
from hypothesis import given
from hypothesis import strategies as st

@pytest.mark.parametrize("base", [2, 8, 10, 16])
@given(n=st.integers(min_value=0))
def test_int_base_roundtrip(base, n):
    # For each base, the property holds for all non-negative integers.
    digits = []
    x = n
    if x == 0:
        digits = [0]
    while x:
        digits.append(x % base)
        x //= base
    rebuilt = sum(d * base**i for i, d in enumerate(digits))
    assert rebuilt == n
\`\`\`

Here pytest runs four parametrized variants, and within each, Hypothesis generates many integers — multiplying coverage cheaply. Note the ordering: \`@pytest.mark.parametrize\` goes outermost. For scaling these runs across cores, see [pytest-xdist parallel testing](/blog/pytest-xdist-parallel-testing-guide), and for async properties, [pytest-asyncio async testing](/blog/pytest-asyncio-async-testing-guide).

## Performance and Flakiness Notes

Property-based tests do more work than example tests — by default 100 generations per test — so they are slower. Keep individual examples fast: the 200ms \`deadline\` exists to catch examples that are accidentally expensive, but if your code is legitimately slow per call, set \`deadline=None\` rather than letting it raise spuriously. Use a modest \`max_examples\` in PR-blocking CI and a larger value in a nightly job.

Beware of non-determinism in the *code under test*: if your function depends on the wall clock, network, or unseeded randomness, the property may pass or fail unpredictably and Hypothesis will warn with a \`Flaky\` error when a previously-failing example no longer reproduces. Make the code under test deterministic — inject clocks and seeds — so that a found counterexample reproduces reliably. Finally, avoid overusing \`assume()\`: heavy filtering wastes generation budget and can trigger \`Unsatisfiable\`; generate the right data with bounded or composite strategies instead. For agent-ready testing skills covering pytest and Hypothesis, browse the [QA skills directory](/skills).

## Frequently Asked Questions

### What is property-based testing in Python?
Property-based testing is a style where you describe a rule (property) that should hold for all valid inputs, and a library generates many inputs to try to break it. In Python, Hypothesis is the standard library for this. Instead of writing specific input-output examples, you write invariants like "decoding the encoding returns the original," and Hypothesis searches hundreds of generated cases, including edge cases you would never enumerate by hand.

### How is Hypothesis different from regular pytest tests?
Regular pytest tests check fixed inputs you write manually, so they only cover cases you imagined. Hypothesis tests use the @given decorator with strategies to generate inputs automatically, covering edge cases like empty collections, huge numbers, and Unicode quirks. Crucially, when Hypothesis finds a failure it shrinks the input to a minimal counterexample and saves it for deterministic replay. Hypothesis tests run inside pytest and can use fixtures and markers normally.

### What is shrinking in Hypothesis?
Shrinking is the process by which Hypothesis reduces a failing input to the smallest, simplest version that still triggers the failure. When a property fails on a large random input like a 73-element list, Hypothesis repeatedly tries shorter lists and smaller numbers, keeping any that still fail, until it reaches a minimal counterexample such as [101]. This makes failures dramatically easier to debug than raw fuzzer output.

### What are strategies in Hypothesis?
Strategies are recipes that tell Hypothesis how to generate and shrink a kind of data. Built-in strategies include st.integers(), st.text(), st.lists(), st.floats(), st.dictionaries(), st.sampled_from(), and st.builds(). They compose: st.lists(st.tuples(st.integers(), st.text())) generates lists of int-string pairs. For interdependent data, the @composite decorator lets you draw values imperatively and constrain later draws based on earlier ones.

### How do I make Hypothesis tests reproducible?
Use the @settings decorator with derandomize=True to fix the random seed so the same inputs are generated each run. Hypothesis also maintains a local database (.hypothesis/examples) that replays previously-found failing examples first, so a discovered bug reproduces deterministically until fixed. Commit that database or pin specific counterexamples with the @example decorator to guard against regressions permanently regardless of the database state.

### When should I use stateful testing?
Use stateful testing when bugs only appear across a sequence of operations rather than in a single call — for caches, connection pools, queues, state machines, or any object with mutable internal state. With RuleBasedStateMachine you declare rules (operations) and invariants, and Hypothesis generates random sequences of operations, checking invariants after each step and shrinking any failing sequence to the shortest reproducing series of calls.

### Can I combine Hypothesis with pytest parametrize?
Yes. A @given function is a normal pytest test, so you can stack @pytest.mark.parametrize on top of it to run the property across several fixed configurations. Put parametrize as the outermost decorator and @given beneath it. Pytest runs one variant per parameter, and within each variant Hypothesis generates many inputs, multiplying coverage cheaply. You can also freely use pytest fixtures and markers with Hypothesis tests.

### How many examples does Hypothesis generate per test?
By default Hypothesis generates 100 examples per test, controlled by the max_examples setting. You can lower it for fast PR-blocking CI or raise it to 500 or 1000 for thorough nightly runs using @settings or registered profiles. Because property tests do more work than example tests, keep each example fast; the 200ms deadline catches accidentally slow examples, and you can set deadline=None when per-call cost is legitimately high.

## Conclusion

Hypothesis changes the question your tests answer. Example-based tests ask "does my code work for the inputs I thought of?" Property-based tests ask "does my code work for all inputs?" — and then Hypothesis goes looking for the ones that break it, shrinks the failure to a minimal counterexample, and saves it so the bug is reproduced on every future run. With strategies for generating data, @composite for interdependent inputs, the round-trip, idempotence, and commutativity patterns for inventing properties, settings for tuning, and RuleBasedStateMachine for stateful systems, you can flush out the edge-case bugs that example tests structurally cannot find.

Start small: add one round-trip property to a serialization or parsing function in your codebase today and watch what Hypothesis surfaces. Then explore the [QA skills directory](/skills) for installable pytest and Hypothesis testing skills, and level up the rest of your stack with [Python vs pytest explained](/blog/python-vs-pytest-explained), [pytest-xdist parallel testing](/blog/pytest-xdist-parallel-testing-guide), and [pytest-asyncio async testing](/blog/pytest-asyncio-async-testing-guide). Test the rules, not just the examples.
`,
};
