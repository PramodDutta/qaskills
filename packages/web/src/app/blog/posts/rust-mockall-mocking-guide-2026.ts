import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Rust mockall Guide 2026: Mocking Traits & Structs for Unit Tests",
  description: "Learn Rust mockall in 2026: mock traits with #[automock], mock structs via mock!, set expectations with returning, match args with predicates, and order calls.",
  date: "2026-06-26",
  category: "Testing",
  content: `**mockall** is the standard mocking library for Rust unit tests. You annotate a trait with \`#[automock]\` (or wrap a struct in the \`mock!\` macro), and mockall generates a \`MockYourTrait\` type whose methods you script with expectations: \`mock.expect_method().with(predicate::eq(3)).times(1).returning(|x| x + 1)\`. It verifies argument values, call counts, and call order, then panics if your code under test misuses the dependency. mockall 0.14 (the current stable release in 2026) needs no runtime, works on stable Rust, and integrates with \`cargo test\`. This guide covers \`#[automock]\`, the \`mock!\` macro, predicates, sequences, and the \`#[double]\` injection pattern.

## Why mock at all in Rust

Rust's type system pushes you toward dependency injection through traits, which is exactly what makes mocking clean. When a function depends on a \`Database\`, an \`HttpClient\`, or a \`Clock\`, you accept that dependency as a generic bound or trait object rather than a concrete type. In a unit test you substitute a fake that returns canned data, records the calls it received, and never touches a real socket or disk.

You can hand-write those fakes, but it gets old fast: every method needs a stub field, a way to assert it was called, and a way to vary the return value. mockall generates all of that. It is the most widely used mocking crate for Rust (well over 100 million downloads on crates.io), and its mock objects verify three things automatically:

| What mockall checks | How |
|---|---|
| Was the method called the right number of times? | \`.times(n)\`, \`.once()\`, \`.never()\` |
| Was it called with the right arguments? | \`.with(predicate)\` / \`.withf(closure)\` |
| Were calls made in the right order? | \`.in_sequence(&mut seq)\` |

If any expectation is unmet when the mock is dropped, mockall panics and your test fails. That turns interaction bugs — "the cache was never invalidated," "the API was hit twice" — into ordinary test failures. If you come from a JVM background, the model mirrors Mockito; the test-double patterns in our [QASkills skills directory](/skills) apply across languages.

## Installing mockall

mockall belongs in dev-dependencies because you only need it at test time. Add it to \`Cargo.toml\`:

\`\`\`toml
[dev-dependencies]
mockall = "0.14"
\`\`\`

Or from the command line with cargo-edit:

\`\`\`bash
cargo add --dev mockall
\`\`\`

That single crate provides the \`#[automock]\` attribute, the \`mock!\` macro, the \`predicate\` module, and the \`Sequence\` type. No build script, no nightly toolchain, no external binary — mockall is pure procedural macros on stable Rust.

## Mocking a trait with #[automock]

The fastest path is \`#[automock]\`. Put it directly above any trait and mockall generates a sibling struct named \`Mock\` + the trait name. Here a service depends on a \`Database\` trait, and the test substitutes the generated \`MockDatabase\`.

\`\`\`rust
use mockall::automock;

#[automock]
trait Database {
    fn get_user(&self, id: u32) -> Option<String>;
}

fn greeting(db: &dyn Database, id: u32) -> String {
    match db.get_user(id) {
        Some(name) => format!("Hello, {name}!"),
        None => "Unknown user".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;

    #[test]
    fn greets_a_known_user() {
        let mut db = MockDatabase::new();
        db.expect_get_user()
            .with(eq(7))
            .times(1)
            .returning(|_| Some("Ada".to_string()));

        assert_eq!(greeting(&db, 7), "Hello, Ada!");
    }
}
\`\`\`

Read the expectation as a sentence: *expect \`get_user\` to be called with argument \`7\`, exactly once, and when it is, return \`Some("Ada")\`.* The naming convention is predictable — every trait method \`foo\` gets an \`expect_foo()\` builder. Because the real \`Database\` trait stays untouched in production, only the test module ever sees \`MockDatabase\`.

A common refinement keeps \`#[automock]\` out of release builds with \`cfg_attr\`, so the macro only runs during tests:

\`\`\`rust
#[cfg_attr(test, mockall::automock)]
trait Clock {
    fn now(&self) -> u64;
}
\`\`\`

## Scripting return values

\`.returning()\` is the workhorse: it takes a closure receiving the method's arguments *by value* and returns the method's result. For a fixed value, \`.return_const()\` is shorter.

\`\`\`rust
use mockall::predicate::*;

let mut db = MockDatabase::new();

// Dynamic: compute the result from the argument.
db.expect_get_user()
    .returning(|id| Some(format!("user-{id}")));

// Constant: same value every time.
db.expect_get_user()
    .return_const(None::<String>);
\`\`\`

When a method needs to hand back a value only once (because it is not \`Clone\`), use \`.return_once()\`, which consumes a \`FnOnce\`:

\`\`\`rust
db.expect_get_user()
    .return_once(|_| Some(String::from("single-use")));
\`\`\`

To simulate failures, return an \`Err\` exactly as the real implementation would. mockall does not special-case \`Result\` — you script it like any other return type:

\`\`\`rust
#[automock]
trait Api {
    fn fetch(&self, url: &str) -> Result<String, std::io::Error>;
}

# fn demo(api: &mut MockApi) {
api.expect_fetch()
    .returning(|_| Err(std::io::Error::new(
        std::io::ErrorKind::TimedOut,
        "request timed out",
    )));
# }
\`\`\`

## Matching arguments with predicates

The \`predicate\` module decides *which* calls an expectation matches. \`.with(...)\` takes one predicate per parameter; \`.withf(...)\` takes a single closure over all parameters for relational checks.

| Predicate | Matches when |
|---|---|
| \`eq(x)\` | argument equals \`x\` |
| \`ne(x)\` | argument does not equal \`x\` |
| \`ge(x)\`, \`gt(x)\`, \`le(x)\`, \`lt(x)\` | argument compares accordingly |
| \`function(\\|a\\| ...)\` | the closure returns \`true\` for the argument |
| \`str::contains("...")\` | a string argument contains the substring |
| \`always()\` / \`never()\` | any argument / no argument |
| \`in_iter([..])\` | argument is in the collection |

\`\`\`rust
use mockall::predicate::*;

let mut db = MockDatabase::new();

// Two-parameter call: one predicate per argument.
# trait T { fn save(&self, id: u32, name: &str); }
# let _ = |db: &mut MockDatabase2| {
db.expect_save()
    .with(ge(1), str::contains("admin"))
    .returning(|_, _| ());
# };

// Relational check across both arguments in one closure.
db.expect_get_user()
    .withf(|id| *id < 1000)
    .returning(|_| None);
\`\`\`

If your code calls a method with arguments no expectation matches, mockall panics immediately — \`No matching expectation found\` — surfacing the exact misuse instead of letting a wrong value flow downstream. Use \`always()\` deliberately when you only want to control the return.

## Verifying call counts

Call-count expectations assert *interactions* rather than just return values. The builder offers exact counts, ranges, and shorthands.

\`\`\`rust
let mut cache = MockCache::new();

cache.expect_invalidate().times(1);          // exactly once
cache.expect_warm().times(2..=4);            // a range
cache.expect_get().times(0);                 // never (same as .never())
cache.expect_put().once();                   // exactly one, readable form
\`\`\`

When the mock goes out of scope at the end of the test, mockall checks every count. A \`.times(1)\` expectation that was never called fails with \`Expectation called fewer than 1 times\`. This is what catches "you forgot to flush the buffer" classes of bug.

## Ordering calls with Sequence

Sometimes order matters: you must \`connect()\` before \`send()\`, or \`begin()\` before \`commit()\`. A \`Sequence\` enforces it — add each ordered expectation to the same sequence with \`.in_sequence(&mut seq)\`.

\`\`\`rust
use mockall::{automock, Sequence};

#[automock]
trait Conn {
    fn connect(&mut self);
    fn send(&mut self, msg: &str);
    fn close(&mut self);
}

#[test]
fn talks_in_order() {
    let mut conn = MockConn::new();
    let mut seq = Sequence::new();

    conn.expect_connect()
        .times(1)
        .in_sequence(&mut seq)
        .returning(|| ());
    conn.expect_send()
        .times(1)
        .in_sequence(&mut seq)
        .returning(|_| ());
    conn.expect_close()
        .times(1)
        .in_sequence(&mut seq)
        .returning(|| ());

    // ... call the code under test that drives \`conn\` ...
}
\`\`\`

If production code calls \`send()\` before \`connect()\`, mockall fails the test. Expectations *not* added to the sequence remain unordered, so you constrain only the calls whose order is contractually important.

## Mocking structs and external traits with mock!

\`#[automock]\` is perfect when you own the trait. When you do **not** — the trait comes from another crate, you want to mock a struct's inherent methods, or it has generic methods — reach for the \`mock!\` macro, which declares the mock's shape explicitly.

\`\`\`rust
use mockall::mock;

// Suppose \`reqwest::Client\`-style API lives in another crate and you
// can't annotate it. Declare a mock that mirrors the methods you use.
mock! {
    pub HttpClient {
        fn get(&self, url: &str) -> Result<String, String>;
        fn post(&self, url: &str, body: &str) -> Result<u16, String>;
    }
}

#[test]
fn posts_then_reads() {
    let mut client = MockHttpClient::new();
    client.expect_post()
        .returning(|_, _| Ok(201));
    client.expect_get()
        .returning(|_| Ok(r#"{"ok":true}"#.to_string()));

    assert_eq!(client.post("/items", "{}"), Ok(201));
}
\`\`\`

Inside \`mock!\` you write the struct name, an optional inherent-methods block, and \`impl Trait for MyStruct { ... }\` blocks for any traits the mock should satisfy. mockall then generates \`MockHttpClient\` with the matching \`expect_*\` builders. This is also how you mock generic methods, which \`#[automock]\` cannot always handle. For end-to-end coverage of the real client these mocks stand in for, pair unit tests with our [Testcontainers Rust integration testing guide](/blog/testcontainers-rust-integration-testing-guide).

## Injecting mocks with #[double]

The remaining question is *how* the mock reaches your code. The cleanest pattern uses the companion crate \`mockall_double\`: import the real type in production and the mock in tests through one \`#[double]\`-annotated \`use\`, so no generics leak into your signatures.

\`\`\`toml
[dependencies]
mockall_double = "0.3"

[dev-dependencies]
mockall = "0.14"
\`\`\`

\`\`\`rust
mod inner {
    use mockall::automock;

    pub struct Repo;
    #[automock]
    impl Repo {
        pub fn count(&self) -> u64 { 0 }
    }
}

// In normal builds this is \`inner::Repo\`; under \`cfg(test)\` it is
// \`inner::MockRepo\`. The rest of the module doesn't know the difference.
use mockall_double::double;
#[double]
use inner::Repo;

pub fn is_empty(repo: &Repo) -> bool {
    repo.count() == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_when_zero() {
        let mut repo = Repo::new();   // resolves to MockRepo here
        repo.expect_count().return_const(0u64);
        assert!(is_empty(&repo));
    }
}
\`\`\`

\`#[double]\` swaps \`inner::Repo\` for \`inner::MockRepo\` only under \`cfg(test)\`, so production code stays generic-free while the test still gets a fully scriptable mock. Your signatures stay honest — \`is_empty\` accepts a \`&Repo\`, not a \`&impl SomeTrait\` invented purely for testability.

## mockall vs mockiato vs hand-written fakes

Rust has more than one way to fake a dependency. The short version: use mockall for almost everything; hand-write a fake only when the double needs real logic.

| Aspect | mockall | mockiato | Hand-written fake |
|---|---|---|---|
| Setup cost | Low (one attribute) | Low | High (write every method) |
| Argument matching | Rich predicate library | Basic matchers | Whatever you code |
| Call-count / order checks | Built in | Limited | Manual asserts |
| Generic & associated-type methods | Supported via \`mock!\` | Limited | Full control |
| Maintenance in 2026 | Active, de facto standard | Largely unmaintained | N/A |
| Best when | You need a *strict* interaction mock | (legacy projects) | The double needs real behavior |

**When to pick a hand-written fake:** the substitute needs genuine logic — an in-memory key-value store that actually stores and returns data, or a deterministic clock that increments. Mocks script *responses*; fakes provide *behavior*. If the test reads more naturally as "use a tiny real implementation," write the fake.

**When to pick mockall:** you want to assert *how* a collaborator is used — which methods, with which arguments, how many times, in what order — without standing up the real thing. That covers the overwhelming majority of unit tests against trait dependencies.

**Verdict:** in 2026, mockall is the default mocking library for Rust and the one to learn first. mockiato is effectively superseded; reach for a hand-written fake only when you need real behavior rather than scripted expectations. To weigh mockall against doubles in other ecosystems, browse the [QASkills comparison index](/compare).

## Best practices

- **Mock at trait boundaries, not everywhere.** Mock the dependencies a unit *talks to* (database, HTTP, clock) and let pure logic run for real. Over-mocking produces tests that pass even when the code is wrong.
- **Assert interactions you care about.** Add \`.times(...)\` and \`.with(...)\` only where the contract matters; sprinkling them everywhere makes tests brittle to harmless refactors.
- **Prefer \`#[automock]\`; fall back to \`mock!\`.** Use the attribute for traits you own, and switch to the macro only for foreign traits, struct methods, or generics it can't reach.
- **Keep mocks in \`#[cfg(test)]\`.** Gate \`#[automock]\` with \`cfg_attr(test, ...)\` so mock code never enters release binaries.
- **Use \`.checkpoint()\` for long tests.** Calling \`mock.checkpoint()\` mid-test verifies and clears current expectations, so a multi-phase test reports the failing phase precisely.

## Frequently Asked Questions

### What is mockall used for in Rust?

mockall generates mock implementations of traits and structs so you can unit-test code in isolation from its real dependencies. You script how the mock responds (\`returning\`, \`return_const\`), assert which arguments it receives (\`with\`, \`withf\`), and verify call counts and ordering (\`times\`, \`in_sequence\`). It is the standard way to test a function that depends on a database, HTTP client, or other collaborator without hitting the real thing.

### What is the difference between #[automock] and the mock! macro?

\`#[automock]\` is an attribute you place on a trait (or a single struct impl) that you own; it auto-generates a \`MockYourTrait\` type. The \`mock!\` macro is for cases \`#[automock]\` can't handle — mocking a trait from another crate, a concrete struct's inherent methods, or methods with generic parameters — where you declare the mock's interface explicitly. Use \`#[automock]\` first and only reach for \`mock!\` when you need that extra control.

### How does mockall verify that a method was called?

When you set an expectation, mockall records how it should be used — for example \`.times(1)\` or \`.with(eq(7))\`. As your code runs, each call is checked against the matching expectation and panics immediately on an unexpected call. When the mock is dropped at the end of the test, mockall verifies every count and fails the test if any expectation was called too few or too many times.

### Can mockall mock structs and not just traits?

Yes. While \`#[automock]\` shines on traits, the \`mock!\` macro lets you generate a mock for a struct's inherent methods, and you can also place \`#[automock]\` on an \`impl\` block. The companion \`mockall_double\` crate and its \`#[double]\` attribute then let you swap the real struct for its mock under \`cfg(test)\`, so the rest of your code keeps using a plain \`&Repo\` parameter rather than a trait object.

### Does mockall require nightly Rust?

No. mockall works on stable Rust and is driven by \`cargo test\` like any normal test — there is no build script or external runner. It is a procedural-macro crate, so the only requirement is adding it as a dev-dependency. Optional features exist for niche cases, but the core attribute, macro, predicates, and sequences all run on stable.

### How do I match arguments when a method takes references or several parameters?

Use one predicate per parameter with \`.with(...)\` — for example \`.with(eq(1), str::contains("x"))\` for a two-argument method — or use \`.withf(|a, b| ...)\` to express a relationship across all arguments in one closure. The \`predicate\` module provides \`eq\`, \`ge\`, \`function\`, \`str::contains\`, \`always\`, and more, and predicates compose so you match references and complex values precisely.
`,
};
