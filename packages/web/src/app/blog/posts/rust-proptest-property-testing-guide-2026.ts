import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Rust proptest Tutorial 2026: Property-Based Testing in Rust",
  description: "Learn Rust proptest for property-based testing in 2026: write strategies, shrink failures, derive Arbitrary, tune ProptestConfig, and run regressions.",
  date: "2026-06-26",
  category: "Testing",
  content: `Property-based testing in Rust with **proptest** generates hundreds of randomized inputs per test, asserts an invariant ("a property") holds for all of them, and automatically *shrinks* any failing case to a minimal counterexample. You add \`proptest\` as a dev-dependency, wrap assertions in the \`proptest!\` macro, and describe inputs with *strategies* like \`any::<u32>()\` or \`0..100i32\`. proptest 1.11 (the current stable release in 2026) is pure Rust, needs no external runner, and persists failing seeds to a \`.proptest-regressions\` file so bugs stay caught. This guide walks through setup, strategies, shrinking, \`Arbitrary\` derivation, and CI tuning.

## Why property-based testing beats example-based tests

A traditional unit test pins one input to one expected output. You write \`assert_eq!(add(2, 2), 4)\` and move on. The trouble is you only test the cases you *thought* of, and bugs hide in the cases you didn't: empty slices, overflow at \`i32::MAX\`, Unicode that splits across byte boundaries, or the off-by-one that only triggers at length 7.

Property-based testing flips the model. Instead of "for this input, expect this output," you state a rule that must hold for *every* valid input, then let the framework throw randomized data at it. proptest is the most widely used property-testing crate for Rust (over 140 million downloads on crates.io), maintained under the \`proptest-rs\` organization. It descends from the QuickCheck lineage but borrows its shrinking design from Python's Hypothesis, which makes its counterexamples noticeably smaller and more readable than classic QuickCheck.

The payoff is three-fold:

| Capability | Example-based test | proptest |
|---|---|---|
| Input coverage | Only hand-picked cases | Hundreds of randomized cases per run |
| Edge cases | You must remember them | Generated automatically (boundaries, empties) |
| Failure diagnosis | The input you wrote | Shrunk to a minimal counterexample |
| Regression safety | Manual | Persisted seeds in \`.proptest-regressions\` |

If you are coming from Python, the model is identical to the one covered in our [Hypothesis property-based testing guide](/blog/hypothesis-property-based-testing-python-guide); proptest is the Rust-native equivalent. For the language-agnostic theory, see the [property-based testing complete guide](/blog/property-based-testing-complete-guide).

## Installing proptest

proptest lives entirely in dev-dependencies because you only need it at test time. Add it to \`Cargo.toml\`:

\`\`\`toml
[dev-dependencies]
proptest = "1.11"
\`\`\`

Or from the command line with cargo-edit:

\`\`\`bash
cargo add --dev proptest
\`\`\`

That single crate gives you the \`proptest!\` macro, the \`proptest::prelude::*\` glob, the strategy combinators, and the shrinking engine. No build script, no nightly toolchain, no external binary. proptest builds on stable Rust and supports \`no_std\` via the \`alloc\` feature for embedded work.

## Your first property test

Here is the canonical first example: an addition function and the *commutativity* property. Create or open a test module and write:

\`\`\`rust
use proptest::prelude::*;

fn add(a: i32, b: i32) -> i32 {
    a.wrapping_add(b)
}

proptest! {
    #[test]
    fn add_is_commutative(a in any::<i32>(), b in any::<i32>()) {
        prop_assert_eq!(add(a, b), add(b, a));
    }
}
\`\`\`

Run it with the normal test runner:

\`\`\`bash
cargo test
\`\`\`

The \`proptest!\` macro is the heart of the crate. Notice the \`in\` syntax: each parameter is bound to a *strategy* (\`any::<i32>()\` produces arbitrary 32-bit signed integers). proptest runs this body 256 times by default, each time with fresh random \`a\` and \`b\`. Inside the block you use \`prop_assert_eq!\` rather than \`assert_eq!\` — the \`prop_\` variants return a test failure instead of panicking, which lets the shrinking machinery catch the failure and retry with smaller inputs.

A more useful property is a *round-trip*: encoding then decoding should return the original value. Round-trip properties find an enormous share of real serialization bugs.

\`\`\`rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn parse_roundtrips(n in any::<u64>()) {
        let text = n.to_string();
        let parsed: u64 = text.parse().unwrap();
        prop_assert_eq!(n, parsed);
    }
}
\`\`\`

## Strategies: describing valid inputs

A **strategy** is proptest's term for an input generator that also knows how to shrink itself. Strategies compose, which is the whole point — you build complex generators from simple ones. The common building blocks:

\`\`\`rust
use proptest::prelude::*;

proptest! {
    // Integer range (half-open, like Rust ranges)
    #[test]
    fn in_range(n in 0..100i32) {
        prop_assert!(n >= 0 && n < 100);
    }

    // ASCII-ish string from a regex
    #[test]
    fn from_regex(s in "[a-z]{1,8}") {
        prop_assert!(s.len() >= 1 && s.len() <= 8);
    }

    // A vector of 0..=10 booleans
    #[test]
    fn a_vector(v in prop::collection::vec(any::<bool>(), 0..=10)) {
        prop_assert!(v.len() <= 10);
    }
}
\`\`\`

The regex-string strategy is one of proptest's nicest features: a string literal in strategy position is compiled as a regular expression and used to generate matching strings. \`"[a-z]{1,8}"\` yields lowercase words of length 1 to 8.

To transform or constrain a strategy, use the combinator methods:

- \`.prop_map(f)\` — apply a function to every generated value (e.g. build a struct from a tuple).
- \`.prop_filter("reason", pred)\` — reject values failing a predicate. Use sparingly; heavy rejection slows generation.
- \`.prop_flat_map(f)\` — generate a value, then use it to choose the *next* strategy (dependent generation, like a length that then sizes a vector).
- \`prop_oneof![a, b, c]\` — pick uniformly among sub-strategies, the standard way to generate an enum.

Here is a strategy that builds a valid \`Point\` where \`y\` always depends on \`x\`:

\`\`\`rust
use proptest::prelude::*;

#[derive(Debug, Clone)]
struct Point { x: i32, y: i32 }

fn point_strategy() -> impl Strategy<Value = Point> {
    (0..1000i32)
        .prop_flat_map(|x| (Just(x), x..(x + 100)))
        .prop_map(|(x, y)| Point { x, y })
}

proptest! {
    #[test]
    fn y_follows_x(p in point_strategy()) {
        prop_assert!(p.y >= p.x);
    }
}
\`\`\`

\`Just(x)\` is a strategy that always yields the same value — handy for threading a generated value through a tuple. This pairs well with the patterns in our [Rust integration testing with Testcontainers guide](/blog/testcontainers-rust-integration-testing-guide) when you need property-driven inputs against real services.

## Shrinking: the killer feature

When a property fails, proptest does not just report the random input that broke it. It *shrinks*: it repeatedly tries smaller, simpler variants of the failing input until it finds the minimal case that still fails. A vector that broke at length 412 shrinks toward \`[0]\`; an integer that broke at 2,147,000,003 shrinks toward 0.

Watch it work. This buggy function mishandles the empty slice:

\`\`\`rust
fn first_or_zero(xs: &[i32]) -> i32 {
    xs[0] // panics on empty input
}

proptest! {
    #[test]
    fn first_is_safe(xs in prop::collection::vec(any::<i32>(), 0..50)) {
        let _ = first_or_zero(&xs);
        prop_assert!(true);
    }
}
\`\`\`

proptest will quickly find a failing vector, then shrink it all the way to the empty vector and report:

\`\`\`text
Test failed: index out of bounds: the len is 0 but the index is 0.
minimal failing input: xs = []
\`\`\`

On the *next* run proptest re-tries this exact seed first, because it wrote it to \`.proptest-regressions\`:

\`\`\`text
# Seeds for failure cases proptest has generated in the past.
cc 1a2b3c4d... # shrinks to xs = []
\`\`\`

**Commit this file to version control.** It turns every property failure into a permanent regression test that runs before any random cases, so a fixed bug cannot silently come back.

## Deriving Arbitrary for your own types

Writing a strategy by hand for every struct gets tedious. The companion crate \`proptest-derive\` provides a \`#[derive(Arbitrary)]\` macro that generates a default strategy for your type from its fields.

\`\`\`toml
[dev-dependencies]
proptest = "1.11"
proptest-derive = "0.6"
\`\`\`

\`\`\`rust
use proptest::prelude::*;
use proptest_derive::Arbitrary;

#[derive(Debug, Clone, Arbitrary)]
struct User {
    id: u32,
    #[proptest(strategy = "1..=120u8")]
    age: u8,
    #[proptest(regex = "[a-z]{3,12}")]
    name: String,
}

proptest! {
    #[test]
    fn user_age_in_range(u in any::<User>()) {
        prop_assert!(u.age >= 1 && u.age <= 120);
    }
}
\`\`\`

The field attributes override the default per field: \`#[proptest(strategy = "...")]\` plugs in any strategy expression, and \`#[proptest(regex = "...")]\` constrains a \`String\` to a pattern. Once a type implements \`Arbitrary\`, \`any::<User>()\` just works and composes into larger types automatically. Derived enums generate each variant with equal weight, tunable with \`#[proptest(weight = N)]\`.

## Configuring proptest

Every aspect of a run is controlled by \`ProptestConfig\`. The most common knobs:

| Setting | Default | Purpose |
|---|---|---|
| \`cases\` | 256 | Number of random inputs per test |
| \`max_shrink_iters\` | 1024 | Cap on shrink steps before giving up |
| \`max_global_rejects\` | 65536 | Total \`prop_filter\`/\`prop_assume!\` rejections allowed |
| \`timeout\` | 0 (off) | Per-case time limit in ms (needs \`timeout\` feature) |
| \`fork\` | false | Run each case in a forked process (isolates segfaults) |

Set them inline per test:

\`\`\`rust
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig {
        cases: 1000,
        max_shrink_iters: 5000,
        ..ProptestConfig::default()
    })]

    #[test]
    fn runs_a_thousand_times(n in any::<u16>()) {
        prop_assert_eq!(n, n);
    }
}
\`\`\`

The \`#![proptest_config(...)]\` inner attribute goes at the top of the \`proptest!\` block. You can also override the case count at runtime without recompiling by setting the \`PROPTEST_CASES\` environment variable:

\`\`\`bash
PROPTEST_CASES=10000 cargo test
\`\`\`

That is exactly what you want in CI: a fast \`cargo test\` locally, plus a heavier nightly job that cranks the case count to flush out rarer bugs. Property tests slot into the kinds of pipelines we cover in the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions). To weigh proptest against other tools, browse the [QASkills comparison index](/compare).

## Filtering and assumptions

Sometimes only a subset of generated values is valid for a property. Use \`prop_assume!\` to discard the rest mid-test:

\`\`\`rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn division_is_inverse(a in any::<i64>(), b in any::<i64>()) {
        prop_assume!(b != 0);
        let q = a / b;
        prop_assert_eq!(q * b + (a % b), a);
    }
}
\`\`\`

\`prop_assume!(b != 0)\` tells proptest "this case is irrelevant, generate another." It is cleaner than \`.prop_filter\` when the rejection depends on several parameters at once. Watch the rejection rate, though: if proptest rejects too many candidates it aborts with a \`too many global rejects\` error. When that happens, generate valid data directly with a constrained strategy (e.g. \`1..i64::MAX\` for a nonzero divisor).

## proptest vs quickcheck: which to choose

Rust has two mature property-testing crates. The short version: pick proptest for richer strategies and better shrinking; pick quickcheck for the absolute simplest setup.

| Aspect | proptest | quickcheck |
|---|---|---|
| Shrinking | Integrated, Hypothesis-style, very small cases | Type-driven, generally coarser |
| Strategy expressiveness | High — combinators, regex strings, ranges | Lower — mostly via the \`Arbitrary\` trait |
| Custom generators | First-class \`Strategy\` API | Implement \`Arbitrary\` by hand |
| Regression persistence | Yes (\`.proptest-regressions\`) | No built-in persistence |
| Boilerplate for trivial tests | Slightly more (macro + strategies) | Minimal (\`#[quickcheck]\` on a \`fn\`) |
| Ecosystem momentum (2026) | Larger, actively maintained | Stable, lighter |

**When to pick quickcheck:** your inputs are plain types that already implement \`Arbitrary\`, you want the leanest possible test, and you don't need shrunk counterexamples saved between runs.

**When to pick proptest:** you need to generate structured or constrained data (valid emails, dependent fields, bounded collections), you care about minimal counterexamples, and you want persisted regressions so fixed bugs stay fixed.

**Verdict:** for most production Rust codebases in 2026, proptest is the stronger default. Its strategy combinators handle real-world data shapes that are awkward in quickcheck, and the \`.proptest-regressions\` file plus integrated shrinking turn flaky discoveries into durable, debuggable regression tests. Reach for quickcheck only when a test is so simple that proptest's extra ceremony isn't worth it.

## Best practices

- **Test properties, not implementations.** Good properties are round-trips (\`decode(encode(x)) == x\`), invariants (\`sort(v).len() == v.len()\`), oracles (compare against a slow-but-correct reference), and idempotence (\`f(f(x)) == f(x)\`).
- **Always commit \`.proptest-regressions\`.** It is your free regression suite; deleting it loses every previously found counterexample.
- **Prefer constrained strategies over \`prop_assume!\`.** Generating only valid data is faster and avoids rejection-limit aborts.
- **Keep properties fast.** They run hundreds of times, so move expensive setup outside the \`proptest!\` body or lower \`cases\` for slow paths.
- **Combine with example tests.** Property tests catch the unknown unknowns; named example tests document specific cases. Both belong in a healthy suite — see how property testing fits the broader [QASkills skills directory](/skills).

## Frequently Asked Questions

### What is the difference between proptest and unit testing?

A unit test checks one fixed input against one expected output, so it only covers the cases you explicitly wrote. proptest is property-based: you state an invariant that must hold for *all* inputs, and the framework generates hundreds of randomized cases to try to break it. You typically keep both — proptest finds edge cases you never imagined, while example-based unit tests document specific known behaviors.

### How many test cases does proptest run by default?

By default proptest runs 256 cases per \`#[test]\` function. You can change this per-test with the \`cases\` field of \`ProptestConfig\`, or globally at runtime via the \`PROPTEST_CASES\` environment variable (for example \`PROPTEST_CASES=10000 cargo test\`). A common pattern is a low count for fast local runs and a much higher count in a scheduled CI job.

### Should I commit the .proptest-regressions file to git?

Yes. proptest writes the seed of every failing case it has ever found to \`.proptest-regressions\`, and it replays those seeds first on the next run. Committing the file makes each discovered counterexample a permanent regression test, so a bug you fixed cannot silently reappear without a teammate noticing. Treat it like any other test fixture and check it in.

### What does shrinking do in proptest?

When a property fails, proptest repeatedly simplifies the failing input — shrinking large numbers toward zero, long vectors toward empty, and complex structures toward their minimal form — while confirming the failure still reproduces. The result is the smallest input that still breaks your code, which is far easier to debug than the original random value. Shrinking is automatic and one of proptest's main advantages over older property-testing tools.

### How do I generate custom structs in proptest?

Two ways. The quick path is \`#[derive(Arbitrary)]\` from the \`proptest-derive\` crate, which builds a strategy from your struct's fields and lets you override individual fields with \`#[proptest(strategy = "...")]\` or \`#[proptest(regex = "...")]\`. The flexible path is writing a function that returns \`impl Strategy<Value = YourType>\` using combinators like \`.prop_map\`, \`.prop_flat_map\`, and \`prop_oneof!\` to encode any validity rules your type requires.

### Does proptest require nightly Rust?

No. proptest works on stable Rust and does not need a build script or an external test runner — \`cargo test\` drives it like any normal test. It also supports \`no_std\` environments through its \`alloc\` feature, and optional features such as \`timeout\` and \`fork\` are opt-in for advanced isolation needs.
`,
};
