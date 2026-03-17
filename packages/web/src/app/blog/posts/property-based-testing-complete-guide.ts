import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Property-Based Testing: Finding Bugs You Never Thought to Look For',
  description:
    'Complete guide to property-based testing with fast-check and Hypothesis. Covers generative testing, shrinking strategies, custom arbitraries, stateful testing, and integrating property tests into existing test suites.',
  date: '2026-03-17',
  category: 'Tutorial',
  content: `
Property-based testing is one of the most powerful yet underutilized techniques in modern software quality assurance. Instead of writing individual test cases with specific inputs and expected outputs, you describe **properties** that should hold true for *all* valid inputs -- and let the testing framework generate hundreds or thousands of random examples to verify those properties.

This approach consistently finds edge cases that human testers never think to check. Off-by-one errors, integer overflow, Unicode handling issues, empty collection behavior, and concurrency bugs are all regularly surfaced by property-based testing frameworks like **fast-check** for TypeScript/JavaScript and **Hypothesis** for Python.

This comprehensive guide covers everything you need to go from beginner to expert with property-based testing in 2026.

## Key Takeaways

- **Property-based testing** generates random inputs to verify that general properties hold true, complementing traditional example-based tests by exploring the input space far more thoroughly
- **fast-check** is the premier property-based testing library for TypeScript and JavaScript, integrating seamlessly with Vitest, Jest, and other test runners
- **Hypothesis** is the gold standard for Python property-based testing, offering strategies, stateful testing, and database-backed example storage
- **Shrinking** is the killer feature: when a failing input is found, the framework automatically reduces it to the smallest possible counterexample, making debugging dramatically easier
- Property-based testing excels at testing **serialization roundtrips**, **parser correctness**, **mathematical invariants**, **data pipeline transformations**, and **API contract validation**
- Combining property-based testing with AI-assisted QA skills from **qaskills.sh** lets you generate sophisticated property tests tuned to your specific domain and framework

---

## What is Property-Based Testing?

Traditional **example-based testing** requires you to think of specific inputs and manually specify the expected output for each:

\`\`\`typescript
// Example-based: you pick the cases
test('sorts numbers ascending', () => {
  expect(sort([3, 1, 2])).toEqual([1, 2, 3]);
  expect(sort([5, -1, 0])).toEqual([-1, 0, 5]);
  expect(sort([])).toEqual([]);
});
\`\`\`

**Property-based testing** takes a fundamentally different approach. You describe a general *property* that should always be true, and the framework generates random inputs to test it:

\`\`\`typescript
import { fc } from 'fast-check';

// Property-based: the framework picks hundreds of cases
test('sort produces an ordered array', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = sort(arr);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
      }
    })
  );
});
\`\`\`

The framework runs this property against 100 (or more) randomly generated arrays, checking that your sorting function always produces ordered output. If it finds a failing case, it **shrinks** the input to the minimal counterexample.

### Comparison: Example-Based vs Property-Based

| Aspect | Example-Based | Property-Based |
|--------|--------------|----------------|
| **Input selection** | Manual, human-chosen | Automatic, randomly generated |
| **Coverage** | Limited to cases you think of | Explores the input space broadly |
| **Edge cases** | Only if explicitly written | Naturally discovered by generators |
| **Debugging** | Exact input/output visible | Shrunk to minimal counterexample |
| **Maintenance** | Many individual assertions | Fewer, more general properties |
| **Best for** | Known requirements, regression | Invariants, contracts, edge cases |
| **Weakness** | Misses unexpected inputs | Properties can be hard to articulate |

The key insight is that these approaches are **complementary**, not competing. Example-based tests verify specific business requirements. Property-based tests explore the vast input space you could never cover manually.

---

## Core Concepts

### Generators (Arbitraries)

Generators are the engine of property-based testing. They produce random values of specific types. In fast-check, these are called **arbitraries**:

\`\`\`typescript
import { fc } from 'fast-check';

// Primitive arbitraries
fc.integer()                    // random integers
fc.float()                      // random floats
fc.string()                     // random strings
fc.boolean()                    // true or false
fc.date()                       // random Date objects

// Constrained arbitraries
fc.integer({ min: 0, max: 100 }) // 0 to 100
fc.string({ minLength: 1, maxLength: 50 })
fc.array(fc.integer(), { minLength: 1, maxLength: 20 })

// Composite arbitraries
fc.record({
  name: fc.string({ minLength: 1 }),
  age: fc.integer({ min: 0, max: 150 }),
  email: fc.emailAddress(),
})
\`\`\`

In Hypothesis (Python), generators are called **strategies**:

\`\`\`python
from hypothesis import strategies as st

# Primitive strategies
st.integers()
st.floats()
st.text()
st.booleans()

# Constrained strategies
st.integers(min_value=0, max_value=100)
st.text(min_size=1, max_size=50)
st.lists(st.integers(), min_size=1, max_size=20)

# Composite strategies
st.fixed_dictionaries({
    'name': st.text(min_size=1),
    'age': st.integers(min_value=0, max_value=150),
    'email': st.emails(),
})
\`\`\`

### Shrinking

Shrinking is arguably the most valuable feature of property-based testing. When a test fails, the framework does not just report the random input that caused the failure. It systematically **reduces** that input to the simplest possible counterexample.

For example, if your sorting function fails on the array \`[847, -23, 0, 451, -999, 12, 73]\`, the shrinker might reduce it to \`[1, 0]\` -- the minimal input that still triggers the bug.

Fast-check and Hypothesis both provide built-in shrinking for all standard generators. Custom generators can define custom shrink trees.

### Reproducibility

Both fast-check and Hypothesis support **seed-based reproducibility**. When a test fails, the framework reports a seed value that you can use to reproduce the exact same sequence of inputs:

\`\`\`typescript
// fast-check: reproduce a failing test
fc.assert(
  fc.property(fc.integer(), (n) => {
    return myFunction(n) >= 0;
  }),
  { seed: 1234567890 } // replay exact sequence
);
\`\`\`

\`\`\`python
# Hypothesis: reproduce via database
# Hypothesis stores failing examples in .hypothesis/
# and automatically replays them on subsequent runs
@given(st.integers())
def test_non_negative(n):
    assert my_function(n) >= 0
\`\`\`

Hypothesis goes further with its **example database**: failing inputs are stored in a \`.hypothesis/\` directory and automatically replayed on every subsequent test run, ensuring regressions are caught even before new random exploration begins.

---

## fast-check for TypeScript/JavaScript

### Setup

Install fast-check alongside your preferred test runner:

\`\`\`bash
# With Vitest (recommended)
npm install --save-dev fast-check vitest

# With Jest
npm install --save-dev fast-check jest
\`\`\`

### Writing Your First Property Test

Let us test a simple \`encode\`/\`decode\` pair:

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { fc } from 'fast-check';
import { encode, decode } from './codec';

describe('encode/decode roundtrip', () => {
  it('should roundtrip any string', () => {
    fc.assert(
      fc.property(fc.fullUnicodeString(), (original) => {
        const encoded = encode(original);
        const decoded = decode(encoded);
        expect(decoded).toBe(original);
      })
    );
  });

  it('should roundtrip any object', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1 }),
          name: fc.string(),
          tags: fc.array(fc.string()),
          active: fc.boolean(),
        }),
        (original) => {
          const encoded = encode(JSON.stringify(original));
          const decoded = JSON.parse(decode(encoded));
          expect(decoded).toEqual(original);
        }
      )
    );
  });
});
\`\`\`

### Custom Arbitraries

Build domain-specific generators by composing primitives:

\`\`\`typescript
// Custom arbitrary for a User object
const userArbitrary = fc.record({
  id: fc.uuid(),
  username: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{2,19}\$/),
  email: fc.emailAddress(),
  age: fc.integer({ min: 13, max: 130 }),
  roles: fc.uniqueArray(
    fc.constantFrom('admin', 'editor', 'viewer'),
    { minLength: 1, maxLength: 3 }
  ),
  createdAt: fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2026-12-31'),
  }),
});

// Custom arbitrary using map and chain
const positiveEvenArbitrary = fc
  .integer({ min: 1, max: 1000 })
  .map((n) => n * 2);

const nonEmptyTrimmedString = fc
  .string({ minLength: 1, maxLength: 100 })
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// Use in property tests
it('should handle any valid user', () => {
  fc.assert(
    fc.property(userArbitrary, (user) => {
      const result = validateUser(user);
      expect(result.valid).toBe(true);
    })
  );
});
\`\`\`

### Controlling Test Runs

\`\`\`typescript
fc.assert(
  fc.property(fc.integer(), (n) => {
    return isPrime(n) || !isPrime(n); // tautology for demonstration
  }),
  {
    numRuns: 1000,          // run 1000 iterations (default: 100)
    seed: 42,               // deterministic seed for reproducibility
    endOnFailure: true,     // stop at first failure
    verbose: true,          // log all generated values
    markInterruptAsFailure: true,
  }
);
\`\`\`

---

## Hypothesis for Python

### Setup and Basic Usage

\`\`\`bash
pip install hypothesis
\`\`\`

\`\`\`python
from hypothesis import given, settings, assume
from hypothesis import strategies as st

@given(st.lists(st.integers()))
def test_sort_is_idempotent(xs):
    """Sorting an already sorted list should produce the same result."""
    sorted_once = sorted(xs)
    sorted_twice = sorted(sorted_once)
    assert sorted_once == sorted_twice

@given(st.text(), st.text())
def test_concatenation_length(a, b):
    """Length of concatenation equals sum of lengths."""
    assert len(a + b) == len(a) + len(b)
\`\`\`

### Strategies and Composition

\`\`\`python
from hypothesis import strategies as st

# Composite strategy using @st.composite
@st.composite
def user_strategy(draw):
    name = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(
        whitelist_categories=('L', 'N', 'Z')
    )))
    age = draw(st.integers(min_value=13, max_value=130))
    email = draw(st.emails())
    roles = draw(st.lists(
        st.sampled_from(['admin', 'editor', 'viewer']),
        min_size=1,
        max_size=3,
        unique=True,
    ))
    return {'name': name.strip() or 'default', 'age': age, 'email': email, 'roles': roles}

@given(user_strategy())
def test_user_validation(user):
    result = validate_user(user)
    assert result['valid'] is True
\`\`\`

### Stateful Testing

Hypothesis supports **stateful testing** via rule-based state machines, which is incredibly powerful for testing APIs and data structures:

\`\`\`python
from hypothesis.stateful import RuleBasedStateMachine, rule, precondition, invariant
from hypothesis import strategies as st

class SetOperations(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.model = set()
        self.actual = MyCustomSet()

    @rule(value=st.integers())
    def add_element(self, value):
        self.model.add(value)
        self.actual.add(value)

    @rule(value=st.integers())
    def remove_element(self, value):
        self.model.discard(value)
        self.actual.discard(value)

    @rule(value=st.integers())
    def check_contains(self, value):
        assert (value in self.model) == self.actual.contains(value)

    @invariant()
    def size_matches(self):
        assert len(self.model) == self.actual.size()

TestSetOperations = SetOperations.TestCase
\`\`\`

### Database Integration

Hypothesis stores failing examples in a local database (\`.hypothesis/examples\`). This means:

1. Once a bug is found, the exact failing input is replayed on every subsequent test run
2. You commit the \`.hypothesis/\` directory to version control so teammates benefit from discovered counterexamples
3. Even if the random seed changes, previously found bugs are always re-tested

\`\`\`python
from hypothesis import settings, HealthCheck

@settings(
    max_examples=500,
    database=None,  # disable database (not recommended in general)
    suppress_health_check=[HealthCheck.too_slow],
    deadline=1000,  # milliseconds per example
)
@given(st.binary())
def test_compression_roundtrip(data):
    assert decompress(compress(data)) == data
\`\`\`

---

## Common Properties to Test

Understanding which properties to test is the key skill in property-based testing. Here are the most important categories:

### 1. Idempotency

Applying an operation twice produces the same result as applying it once:

\`\`\`typescript
it('sorting is idempotent', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const once = sort(arr);
      const twice = sort(sort(arr));
      expect(twice).toEqual(once);
    })
  );
});

it('deduplication is idempotent', () => {
  fc.assert(
    fc.property(fc.array(fc.string()), (arr) => {
      const once = deduplicate(arr);
      const twice = deduplicate(deduplicate(arr));
      expect(twice).toEqual(once);
    })
  );
});
\`\`\`

### 2. Roundtrip (Encode/Decode)

Encoding then decoding returns the original value:

\`\`\`typescript
it('JSON roundtrip preserves data', () => {
  fc.assert(
    fc.property(fc.jsonValue(), (value) => {
      const json = JSON.stringify(value);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(value);
    })
  );
});

it('URL encoding roundtrip', () => {
  fc.assert(
    fc.property(fc.fullUnicodeString(), (str) => {
      expect(decodeURIComponent(encodeURIComponent(str))).toBe(str);
    })
  );
});
\`\`\`

### 3. Invariants

Properties that must always hold true regardless of input:

\`\`\`typescript
it('filter never increases array length', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer()),
      fc.func(fc.boolean()),
      (arr, predicate) => {
        expect(arr.filter(predicate).length).toBeLessThanOrEqual(arr.length);
      }
    )
  );
});

it('map preserves array length', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer()),
      fc.func(fc.integer()),
      (arr, fn) => {
        expect(arr.map(fn).length).toBe(arr.length);
      }
    )
  );
});
\`\`\`

### 4. Commutativity

Order of operations does not affect the result:

\`\`\`typescript
it('set union is commutative', () => {
  fc.assert(
    fc.property(
      fc.uniqueArray(fc.integer()),
      fc.uniqueArray(fc.integer()),
      (a, b) => {
        const setA = new Set(a);
        const setB = new Set(b);
        const unionAB = new Set([...setA, ...setB]);
        const unionBA = new Set([...setB, ...setA]);
        expect(unionAB).toEqual(unionBA);
      }
    )
  );
});
\`\`\`

### 5. Oracle (Test Against a Reference)

Compare your implementation against a known-correct reference:

\`\`\`python
from hypothesis import given
from hypothesis import strategies as st

@given(st.lists(st.integers()))
def test_custom_sort_matches_builtin(xs):
    """Our custom sort should produce same result as Python's built-in sort."""
    assert my_custom_sort(xs) == sorted(xs)

@given(st.integers(min_value=0, max_value=1000))
def test_fast_fibonacci_matches_naive(n):
    """Optimized fibonacci should match the naive recursive version."""
    # Only test small values for the naive version
    if n <= 20:
        assert fast_fibonacci(n) == naive_fibonacci(n)
\`\`\`

---

## Testing Data Structures with Properties

Property-based testing is exceptionally well-suited for testing data structure implementations:

\`\`\`typescript
describe('immutable list', () => {
  const listAndIndex = fc
    .array(fc.integer(), { minLength: 1 })
    .chain((arr) =>
      fc.tuple(
        fc.constant(arr),
        fc.integer({ min: 0, max: arr.length - 1 })
      )
    );

  it('get after set returns the set value', () => {
    fc.assert(
      fc.property(listAndIndex, fc.integer(), ([arr, index], value) => {
        const list = ImmutableList.from(arr);
        const updated = list.set(index, value);
        expect(updated.get(index)).toBe(value);
      })
    );
  });

  it('set does not modify original', () => {
    fc.assert(
      fc.property(listAndIndex, fc.integer(), ([arr, index], value) => {
        const list = ImmutableList.from(arr);
        const originalValue = list.get(index);
        list.set(index, value);
        expect(list.get(index)).toBe(originalValue);
      })
    );
  });

  it('length is preserved after set', () => {
    fc.assert(
      fc.property(listAndIndex, fc.integer(), ([arr, index], value) => {
        const list = ImmutableList.from(arr);
        const updated = list.set(index, value);
        expect(updated.length).toBe(list.length);
      })
    );
  });
});
\`\`\`

### Serialization Testing

\`\`\`typescript
describe('serialization', () => {
  const complexObject = fc.record({
    id: fc.uuid(),
    data: fc.dictionary(fc.string(), fc.jsonValue()),
    nested: fc.array(
      fc.record({
        key: fc.string(),
        values: fc.array(fc.oneof(fc.integer(), fc.string(), fc.boolean())),
      })
    ),
  });

  it('protobuf roundtrip', () => {
    fc.assert(
      fc.property(complexObject, (obj) => {
        const serialized = serialize(obj);
        const deserialized = deserialize(serialized);
        expect(deserialized).toEqual(obj);
      })
    );
  });

  it('serialized size is bounded', () => {
    fc.assert(
      fc.property(complexObject, (obj) => {
        const serialized = serialize(obj);
        expect(serialized.length).toBeLessThan(10_000_000); // 10MB limit
      })
    );
  });
});
\`\`\`

---

## Testing API Contracts with Properties

Property-based testing is powerful for validating API contracts and schema compliance:

\`\`\`typescript
import { fc } from 'fast-check';
import { z } from 'zod';

// Generate data matching a Zod schema
const userSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

const userArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  age: fc.integer({ min: 0, max: 150 }),
});

describe('API contract', () => {
  it('valid users pass schema validation', () => {
    fc.assert(
      fc.property(userArbitrary, (user) => {
        const result = userSchema.safeParse(user);
        expect(result.success).toBe(true);
      })
    );
  });

  it('API returns consistent response shape', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary, async (user) => {
        const response = await api.createUser(user);
        expect(response).toHaveProperty('id');
        expect(response).toHaveProperty('createdAt');
        expect(response.name).toBe(user.name);
        expect(response.email).toBe(user.email);
      }),
      { numRuns: 20 } // fewer runs for API tests
    );
  });
});
\`\`\`

### Edge Case Generation for APIs

\`\`\`typescript
// Generate adversarial inputs to test API robustness
const adversarialString = fc.oneof(
  fc.constant(''),
  fc.constant(' '),
  fc.constant('\\0'),
  fc.fullUnicodeString(),
  fc.string({ minLength: 10000 }),  // very long strings
  fc.constant('<script>alert(1)</script>'),
  fc.constant("'; DROP TABLE users; --"),
  fc.stringMatching(/^[\\x00-\\x1f]+\$/),  // control characters
);

it('API handles adversarial input gracefully', async () => {
  await fc.assert(
    fc.asyncProperty(adversarialString, async (input) => {
      const response = await api.search(input);
      expect(response.status).not.toBe(500);
    }),
    { numRuns: 50 }
  );
});
\`\`\`

---

## Stateful Testing

Stateful testing verifies that a sequence of operations on a stateful system always produces correct results. This is the most advanced form of property-based testing and is extraordinarily effective at finding concurrency bugs, state corruption, and missing edge case handling.

### Model-Based Testing in TypeScript

\`\`\`typescript
import { fc } from 'fast-check';

// Commands for a shopping cart
class AddItemCommand implements fc.Command<CartModel, Cart> {
  constructor(readonly item: string, readonly qty: number) {}

  check() { return true; }

  run(model: CartModel, real: Cart) {
    model.items[this.item] = (model.items[this.item] || 0) + this.qty;
    real.addItem(this.item, this.qty);

    expect(real.getQuantity(this.item)).toBe(model.items[this.item]);
  }

  toString() { return \`AddItem(\${this.item}, \${this.qty})\`; }
}

class RemoveItemCommand implements fc.Command<CartModel, Cart> {
  constructor(readonly item: string) {}

  check(model: CartModel) {
    return this.item in model.items;
  }

  run(model: CartModel, real: Cart) {
    delete model.items[this.item];
    real.removeItem(this.item);

    expect(real.getQuantity(this.item)).toBe(0);
  }

  toString() { return \`RemoveItem(\${this.item})\`; }
}

const commands = [
  fc.tuple(fc.constantFrom('apple', 'banana', 'cherry'), fc.integer({ min: 1, max: 10 }))
    .map(([item, qty]) => new AddItemCommand(item, qty)),
  fc.constantFrom('apple', 'banana', 'cherry')
    .map((item) => new RemoveItemCommand(item)),
];

it('cart operations are consistent', () => {
  fc.assert(
    fc.property(
      fc.commands(commands, { size: '+1' }),
      (cmds) => {
        const model: CartModel = { items: {} };
        const real = new Cart();
        fc.modelRun(() => ({ model, real }), cmds);
      }
    )
  );
});
\`\`\`

### State Machine Testing in Python

\`\`\`python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
from hypothesis import strategies as st

class DatabaseStateMachine(RuleBasedStateMachine):
    """Test a key-value store against a dict reference model."""

    def __init__(self):
        super().__init__()
        self.model = {}
        self.db = KeyValueStore()

    @rule(key=st.text(min_size=1), value=st.binary())
    def put(self, key, value):
        self.model[key] = value
        self.db.put(key, value)

    @rule(key=st.text(min_size=1))
    def get(self, key):
        expected = self.model.get(key)
        actual = self.db.get(key)
        assert actual == expected

    @rule(key=st.text(min_size=1))
    def delete(self, key):
        self.model.pop(key, None)
        self.db.delete(key)

    @invariant()
    def size_consistent(self):
        assert self.db.size() == len(self.model)

    @invariant()
    def keys_consistent(self):
        assert set(self.db.keys()) == set(self.model.keys())

TestDatabase = DatabaseStateMachine.TestCase
\`\`\`

---

## Integration with Existing Test Suites

Property-based tests integrate naturally with standard test runners. You do not need to restructure your test suite.

### With Vitest

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { fc } from 'fast-check';

describe('string utils', () => {
  // Standard example-based test
  it('capitalizes hello', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  // Property-based test alongside example tests
  it('capitalize always produces a non-empty string from non-empty input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (str) => {
          const result = capitalize(str);
          expect(result.length).toBeGreaterThan(0);
        }
      )
    );
  });

  it('capitalize first char is uppercase when alphabetic', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]/).chain((first) =>
          fc.string().map((rest) => first + rest)
        ),
        (str) => {
          const result = capitalize(str);
          expect(result[0]).toBe(str[0].toUpperCase());
        }
      )
    );
  });
});
\`\`\`

### With pytest

\`\`\`python
import pytest
from hypothesis import given, example
from hypothesis import strategies as st

class TestStringUtils:
    # Standard example-based test
    def test_capitalize_hello(self):
        assert capitalize('hello') == 'Hello'

    # Property test in the same class
    @given(st.text(min_size=1))
    def test_capitalize_preserves_length(self, s):
        assert len(capitalize(s)) == len(s)

    # Mix: property test with explicit examples
    @given(st.text())
    @example('')          # always test empty string
    @example('a')         # single character
    @example('ALREADY')   # already capitalized
    def test_capitalize_idempotent_on_first_char(self, s):
        if s:
            once = capitalize(s)
            twice = capitalize(once)
            assert once[0] == twice[0]
\`\`\`

---

## When Property-Based Testing Shines

Property-based testing delivers the highest value in these scenarios:

### Parsing and Serialization

Any time you convert data between formats, roundtrip properties are essential. JSON parsers, CSV readers, protocol buffer encoders, URL parsers, YAML serializers -- all benefit enormously.

### Mathematical Operations

Functions with mathematical properties (associativity, commutativity, distributivity, identity elements) are perfect candidates. Currency calculations, statistical functions, and geometric computations all have well-defined properties.

### Data Pipelines

ETL processes, data transformations, and stream processors should preserve certain invariants: record counts, null handling, data type preservation, and ordering guarantees.

### Compression and Encryption

Roundtrip properties (compress/decompress, encrypt/decrypt) and size properties (compressed output is bounded) are natural fits.

### State Machines and Protocols

Network protocols, database operations, and any system with state transitions benefit from stateful property-based testing that verifies invariants across operation sequences.

---

## AI-Assisted Property Testing with QASkills

AI coding agents can dramatically accelerate property-based testing when given the right context. The **qaskills.sh** directory offers skills specifically designed to help agents generate sophisticated property tests:

\`\`\`bash
# Install property-based testing skills
npx @qaskills/cli search "property testing"
npx @qaskills/cli add property-based-testing

# Install complementary skills for your domain
npx @qaskills/cli add api-testing-rest
npx @qaskills/cli add data-validation-testing

# Browse all available skills
npx @qaskills/cli search "generative"
\`\`\`

Once installed, AI agents gain deep knowledge of property-based testing patterns, common properties for different domains, and framework-specific idioms. This transforms generic test generation into expert-level property test creation tuned to your specific codebase.

You can also combine multiple skills for comprehensive coverage:

\`\`\`bash
# Stack skills for maximum testing depth
npx @qaskills/cli add property-based-testing
npx @qaskills/cli add typescript-unit-testing
npx @qaskills/cli add api-contract-testing

# List installed skills
npx @qaskills/cli list
\`\`\`

---

## 10 Best Practices

1. **Start with roundtrip properties.** They are the easiest to write and catch the most bugs. If you encode and decode, serialize and deserialize, or compress and decompress, write a roundtrip property test first.

2. **Constrain generators to valid inputs.** Use \`filter()\` and constrained ranges to ensure generated values match your function's actual domain. Testing with truly invalid inputs belongs in separate negative-testing properties.

3. **Keep properties simple and focused.** Each property should test one thing. "Sorting produces an ordered array" is a good property. "Sorting produces an ordered array of the same length with the same elements" is three properties that should be separate tests.

4. **Use shrinking to your advantage.** When a test fails, the shrunk counterexample is invaluable. Do not immediately fix the bug -- first, write an example-based regression test using the shrunk input, then fix the code.

5. **Increase numRuns in CI.** Run 100 iterations locally for fast feedback, but run 1000 or more in CI where time is less constrained. More iterations means more explored input space.

6. **Combine with example-based tests.** Property tests and example tests serve different purposes. Use example tests for specific business requirements and property tests for general invariants.

7. **Name properties descriptively.** "sort is idempotent" and "encode/decode roundtrip preserves data" are good names. "sort test 1" is not. The property name should describe the invariant being verified.

8. **Test against a reference implementation.** Oracle testing -- comparing your fast implementation against a slow but known-correct reference -- is one of the most effective property-based testing patterns.

9. **Commit Hypothesis databases to version control.** The \`.hypothesis/\` directory contains previously found counterexamples. Committing it ensures the entire team benefits from discovered edge cases.

10. **Profile and tune generator distributions.** Use \`fc.statistics()\` or Hypothesis health checks to verify that your generators produce a good distribution of inputs. A generator that mostly produces empty arrays is not testing much.

---

## 8 Anti-Patterns to Avoid

1. **Testing implementation details instead of properties.** If your property test asserts that \`sort([3,1,2])\` equals \`[1,2,3]\`, you have written an example-based test with extra steps. Focus on universal truths: the output is ordered, the length is preserved, the elements are the same.

2. **Overly broad generators.** Using \`fc.anything()\` or \`st.from_type(type)\` without constraints produces inputs that your function was never designed to handle. This leads to noisy failures that obscure real bugs.

3. **Ignoring shrinking failures.** If a test fails but the shrunk example seems unrelated to the actual bug, your property or generator might be wrong. Investigate before dismissing.

4. **Writing tautological properties.** A property like \`sort(arr).length >= 0\` is always true and tests nothing useful. Properties should be specific enough to catch real bugs.

5. **Excessive use of assume/filter.** If you filter out more than 50% of generated values, rewrite your generator to produce valid inputs directly. Heavy filtering wastes computation and can cause health check warnings.

6. **Not setting a seed in CI.** Without a fixed seed, test failures become non-reproducible across runs. Either use seed-based reproducibility or commit the Hypothesis example database.

7. **Skipping stateful testing.** If your code has mutable state, sequence-dependent behavior, or complex state transitions, stateful testing will find bugs that no amount of stateless property testing will catch.

8. **Treating property tests as a replacement for all other tests.** Property-based testing is a complement, not a replacement. Integration tests, end-to-end tests, and manual exploratory testing all remain necessary for comprehensive quality assurance.

---

## Conclusion

Property-based testing fundamentally changes how you think about software correctness. Instead of asking "does my code work for these five inputs?", you ask "does my code satisfy this invariant for *all* valid inputs?" The frameworks then systematically explore your input space, finding edge cases you never considered, and shrinking failures to the minimal reproduction case.

Whether you are using **fast-check** in a TypeScript project or **Hypothesis** in Python, the investment in learning property-based testing pays dividends quickly. Start with roundtrip properties on your serialization code, add invariant checks to your data structures, and gradually work up to stateful testing of your most complex systems.

Combined with the QA skills available at **qaskills.sh**, AI coding agents can help you write sophisticated property tests tailored to your specific domain, framework, and testing needs -- finding the bugs you never thought to look for.
`,
};
