import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Boundary Value Analysis & Equivalence Partitioning Guide",
  description: "Master boundary value analysis and equivalence partitioning with worked examples, tables, and code. Learn 2-value vs 3-value BVA and how to combine both techniques.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Boundary Value Analysis & Equivalence Partitioning: A Worked Guide

Equivalence partitioning (EP) and boundary value analysis (BVA) are two black-box test-design techniques used together to reduce the number of test cases without losing coverage. Equivalence partitioning divides every input into groups (partitions) that the software should treat identically, so you test just one representative value per group instead of all of them. Boundary value analysis then targets the *edges* of those partitions — the minimum, maximum, and just-outside values — because off-by-one and range errors cluster at boundaries. Used together, they turn an unbounded input space into a small, high-yield set of tests.

This guide defines both techniques precisely, walks through several worked examples with tables, shows 2-value versus 3-value BVA, and gives you parametrized code you can drop into a real suite.

## Equivalence partitioning: the core idea

The assumption behind EP is that if a program handles one value in a partition correctly, it almost certainly handles every other value in that partition the same way. So testing more than one value per partition is wasted effort. Every partition is either **valid** (should be accepted) or **invalid** (should be rejected).

### Worked example: an age field that accepts 18-60

A registration form accepts an integer age between 18 and 60 inclusive. The input domain partitions into three classes:

| Partition | Range | Type | Representative value |
|---|---|---|---|
| Below range | age < 18 | Invalid | 10 |
| In range | 18 <= age <= 60 | Valid | 35 |
| Above range | age > 60 | Invalid | 75 |

Pure equivalence partitioning gives you **three** test cases — one per partition — instead of testing every integer from negative infinity to positive infinity. Each representative stands in for its whole class.

But EP alone has a blind spot: it picks values from the *middle* of each partition (10, 35, 75). The most common defects — using \`<\` where \`<=\` was meant, fence-post errors, inclusive-versus-exclusive mistakes — happen at the *edges* (17, 18, 60, 61). That is exactly what BVA fixes.

## Boundary value analysis: testing the edges

BVA tests the values at and immediately around each partition boundary, because experience shows bugs concentrate there. There are two standard variants.

### 2-value BVA (boundary + adjacent outside)

For each boundary, test the boundary value itself and the value just on the *other* side. For the 18-60 field, the boundaries are 18 (lower) and 60 (upper):

| Boundary | Values to test | Expected |
|---|---|---|
| Lower (18) | 17, 18 | reject, accept |
| Upper (60) | 60, 61 | accept, reject |

That is **4** boundary tests: 17, 18, 60, 61.

### 3-value BVA (below, at, above)

The more thorough variant tests three values per boundary: one below, the boundary itself, and one above.

| Boundary | Values to test | Expected |
|---|---|---|
| Lower (18) | 17, 18, 19 | reject, accept, accept |
| Upper (60) | 59, 60, 61 | accept, accept, reject |

That is **6** boundary tests: 17, 18, 19, 59, 60, 61. Three-value BVA catches a wider class of off-by-one bugs (for example, code that accidentally accepts 19 as the real lower bound) at the cost of two extra cases per boundary. Use 3-value BVA for critical numeric logic; 2-value is fine for low-risk fields.

### Combining EP + BVA

The standard practice is to use EP to find the partitions, then BVA to test their boundaries, plus one mid-partition value for each valid class as a sanity check. For the age field, the combined minimal set (3-value BVA) is:

| Test | Input | Partition | Expected |
|---|---|---|---|
| 1 | 10 | below (mid) | reject |
| 2 | 17 | lower boundary -1 | reject |
| 3 | 18 | lower boundary | accept |
| 4 | 19 | lower boundary +1 | accept |
| 5 | 35 | valid (mid) | accept |
| 6 | 59 | upper boundary -1 | accept |
| 7 | 60 | upper boundary | accept |
| 8 | 61 | upper boundary +1 | reject |
| 9 | 75 | above (mid) | reject |

Nine deliberate cases give you far more confidence than ninety random ones.

## Worked example 2: a string-length field

EP and BVA are not just for numbers. A username field accepts 3 to 15 characters. The partitions are by *length*:

| Partition | Length | Type |
|---|---|---|
| Too short | 0-2 | Invalid |
| Valid | 3-15 | Valid |
| Too long | 16+ | Invalid |

The boundaries are at length 3 and length 15. Three-value BVA gives lengths 2, 3, 4 and 14, 15, 16. Always remember the often-forgotten boundary: the **empty string** (length 0) and frequently a **null/undefined** value, which belong to the invalid partition but behave specially in many languages. A complete set:

| Test | Username | Length | Expected |
|---|---|---|---|
| 1 | "" | 0 | reject (empty) |
| 2 | "ab" | 2 | reject |
| 3 | "abc" | 3 | accept |
| 4 | "abcd" | 4 | accept |
| 5 | "abcdefghijklmno" | 15 | accept |
| 6 | "abcdefghijklmnop" | 16 | reject |

## Worked example 3: multiple inputs and output partitioning

When a function takes several inputs, partition each input independently, then decide whether to test combinations (this is where [pairwise/combinatorial testing](/blog) comes in). Consider a shipping-cost calculator: weight in kg (0.1-30) and destination zone (1, 2, 3).

You partition weight into below (<0.1), valid (0.1-30), above (>30), and zone into its three valid values plus invalid (0, 4). Then you can apply **output partitioning** too: if shipping cost has tiers (e.g. cost bands at 0-5 kg, 5-20 kg, 20-30 kg), the *boundaries of the output bands* (5 kg, 20 kg) become additional input boundaries to test. Output-based partitioning catches tier-calculation bugs that input partitioning alone misses.

## Turning the analysis into code

Once you have the table, parametrize it so each row is a real, named test. In Python with pytest:

\`\`\`python
import pytest

def validate_age(age):
    return 18 <= age <= 60

@pytest.mark.parametrize(
    "age, expected",
    [
        (10, False),   # below partition (mid)
        (17, False),   # lower boundary - 1
        (18, True),    # lower boundary
        (19, True),    # lower boundary + 1
        (35, True),    # valid (mid)
        (59, True),    # upper boundary - 1
        (60, True),    # upper boundary
        (61, False),   # upper boundary + 1
        (75, False),   # above partition (mid)
    ],
)
def test_validate_age(age, expected):
    assert validate_age(age) is expected
\`\`\`

The same idea in TypeScript with Vitest, including the empty-string and length boundaries:

\`\`\`ts
import { describe, it, expect } from 'vitest';

function validateUsername(name: string): boolean {
  return name.length >= 3 && name.length <= 15;
}

describe('username boundary value analysis', () => {
  const cases: [string, boolean][] = [
    ['', false],                  // empty
    ['ab', false],                // length 2
    ['abc', true],                // length 3 (lower boundary)
    ['abcd', true],               // length 4
    ['abcdefghijklmno', true],    // length 15 (upper boundary)
    ['abcdefghijklmnop', false],  // length 16
  ];

  it.each(cases)('validateUsername(%j) -> %s', (input, expected) => {
    expect(validateUsername(input)).toBe(expected);
  });
});
\`\`\`

Parametrized cases keep the partition/boundary reasoning visible in the test names, so a failure tells you *which* boundary broke. For a deeper library of test-design and automation skills you can wire into agents like Claude Code or Cursor, browse the [skills directory](/skills).

## A repeatable process you can follow

1. **Identify every input** (and relevant outputs) and its allowed range or set.
2. **Partition each input** into valid and invalid equivalence classes.
3. **Pick one representative** per partition (EP) — usually a mid value.
4. **Find the boundaries** of each partition.
5. **Apply BVA** — 2-value (boundary + just outside) or 3-value (below/at/above) depending on risk.
6. **Add special values**: empty, null, zero, negative, max int, whitespace where applicable.
7. **Combine inputs** with pairwise where multiple parameters interact.
8. **Parametrize** the resulting table into automated tests.

## Common mistakes and troubleshooting

**Only testing valid partitions.** Half the value of EP is the *invalid* classes — they verify the system rejects bad input gracefully. A suite that only proves the happy path passes is incomplete.

**Picking boundary-adjacent values as your "mid" representative.** If your valid range is 18-60 and you choose 19 as the representative, you have accidentally retested a boundary and left the middle untested. Use a genuinely central value (35).

**Forgetting the implicit boundaries.** Empty string, null, zero, and the maximum representable integer are boundaries even when the spec does not mention them. They are where crashes and overflow bugs live.

**Wrong granularity of boundary.** For integers the adjacent value is +/-1; for currency it might be +/-0.01; for dates it is the next/previous day. Use the smallest meaningful increment for the data type, not always 1.

**Treating EP partitions as truly equivalent when they are not.** If the code branches differently for, say, even versus odd values inside a range, those are separate partitions. EP only works when the software genuinely treats the whole class identically — verify that assumption against the logic.

## How these techniques relate to others

| Technique | What it reduces | Output |
|---|---|---|
| Equivalence partitioning | Redundant values within a class | One value per partition |
| Boundary value analysis | Missed edge bugs | Values at and around boundaries |
| Decision table testing | Untested logic combinations | Rules for condition combos |
| Pairwise testing | Combinatorial explosion | All 2-way value pairs |

EP and BVA decide *which values* to test for each input. Decision tables and pairwise decide *which combinations* of those values to test together. You can compare these and related approaches on the [comparison hub](/compare).

## Frequently Asked Questions

### What is the difference between equivalence partitioning and boundary value analysis?

Equivalence partitioning divides inputs into groups the software treats the same and tests one representative value per group, usually from the middle. Boundary value analysis targets the edges of those same groups — the minimum, maximum, and adjacent out-of-range values — because defects cluster at boundaries. They are complementary: EP reduces redundancy, BVA catches off-by-one errors, and you normally apply both.

### Should I use 2-value or 3-value boundary value analysis?

Use 2-value BVA (the boundary plus the value just outside it) for low-risk fields where you mainly want to confirm the range limit. Use 3-value BVA (below, at, and above each boundary) for critical numeric logic where off-by-one errors are costly, because it catches a wider class of bugs. Three-value BVA adds two cases per boundary, which is usually a worthwhile trade for important inputs.

### How many test cases do EP and BVA produce?

For a single numeric range, equivalence partitioning gives three cases (below, valid, above) and 3-value BVA adds six boundary cases, for roughly nine deliberate tests. The exact count scales with the number of inputs and partitions, but the whole point is that it stays small and predictable compared with random or exhaustive testing.

### Are equivalence partitioning and BVA only for numeric inputs?

No. They apply to any input with definable classes: string lengths, dates, enumerated sets, file sizes, collection counts, and even output ranges. For strings you partition by length or format; for dates the boundaries are the first and last valid day. The technique is about classes and edges, not specifically numbers.

### What special values should I always include in boundary testing?

Always consider the empty string, null or undefined, zero, negative numbers, the maximum representable integer, and whitespace-only input, even when the specification does not list them. These implicit boundaries are where crashes, overflow, and unhandled-exception bugs commonly hide. Add the ones relevant to each input's data type.

### Can I automate EP and BVA?

Yes. The standard approach is to build the partition/boundary table by hand (the analysis is human judgment) and then encode each row as a parametrized test using pytest's parametrize, Vitest's it.each, or JUnit's parameterized tests. This keeps the reasoning visible in the test names and lets a single failure point you straight to the broken boundary.
`,
};
