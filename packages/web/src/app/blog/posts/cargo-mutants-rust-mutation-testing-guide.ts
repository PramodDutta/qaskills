import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'cargo-mutants: Mutation Testing for Rust',
  description: 'cargo mutants guide for Rust QA teams: configure mutation testing with nextest, CI sharding, timeouts, skip attributes, reports, and survivor triage.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# cargo-mutants: Mutation Testing for Rust

\`cargo-mutants\` is the current practical mutation testing tool for Rust projects. It creates small source-level mutations, runs your test command, and reports whether the tests caught each changed behavior. The current documented release is \`27.1.0\`, published in June 2026 in the sourcefrog/cargo-mutants repository. The project is active, the documentation lives at https://mutants.rs, and the command remains \`cargo mutants\`.

For QA engineers, the direct answer is this: use \`cargo-mutants\` when ordinary Rust tests and coverage tell you code ran, but you need to know whether assertions would detect broken logic. It is especially useful for parsers, validation, serialization, state machines, financial rules, authorization decisions, and error handling. It is not a replacement for fast unit tests or property tests. It is a pressure test for whether those tests have teeth.

The official docs confirm the important workflow pieces: install with Cargo, run \`cargo mutants\`, inspect \`mutants.out\`, use \`--test-tool=nextest\` when your project uses cargo-nextest, run changed-code checks with \`--in-diff\`, split CI work with \`--shard\`, control runaway tests with \`--timeout\`, skip code with \`#[mutants::skip]\`, and store config in \`.cargo/mutants.toml\`. If you are already using [cargo-nextest for Rust testing](/blog/cargo-nextest-rust-testing-guide), mutation testing fits naturally after the fast nextest lane. For the coverage model behind this decision, compare it with [Line, Branch, and Mutation Coverage Explained](/blog/code-coverage-types-line-branch-mutation-explained).

## The Rust-Specific Shape Of Mutation Testing

Rust changes the mutation-testing conversation in two ways. First, the compiler catches many impossible mutations before tests run. That is good. It means some mutants are unviable rather than survived. Second, Rust teams often have a mix of unit tests, integration tests, doc tests, property tests, and nextest profiles. \`cargo-mutants\` must be wired to the test command that represents the behavior you care about.

\`cargo-mutants\` generates mutants such as replacing expressions, changing return values, deleting statements where possible, or altering operators. It then runs a baseline test command to make sure the suite passes before mutation, applies one mutation at a time, and classifies the result. The output directory \`mutants.out\` contains logs, reports, and machine-readable files that should be archived from CI.

| Outcome | Meaning | QA action |
| --- | --- | --- |
| Caught | Tests failed for the mutant | Good signal, usually no action |
| Missed | Tests passed even though code changed | Add or improve a behavioral assertion |
| Unviable | Mutated code did not compile | Usually acceptable, but inspect patterns |
| Timeout | Test command exceeded configured time | Diagnose hangs, slow tests, or too-low timeout |
| Baseline failure | Tests failed before mutation | Fix normal test suite before trusting results |

The most common mistake is reading a missed mutant as a demand to test implementation details. Sometimes the right answer is a better public-behavior test. Sometimes the mutant is equivalent, meaning the changed code has the same external behavior. Sometimes the mutated line is defensive code that can only be reached through a corrupted dependency. Mutation testing is evidence, not a verdict.

## Install And Run A First Pass

Install the tool with Cargo:

\`\`\`bash
cargo install cargo-mutants --locked
\`\`\`

From a crate or workspace root, run:

\`\`\`bash
cargo mutants
\`\`\`

The first run should be small. On a workspace with many crates, point the tool at one package or use filters from the documented options instead of turning the whole repository into a long-running experiment. If the baseline test command fails, stop. Mutation results after a broken baseline are not meaningful.

| First-pass decision | Recommended choice | Reason |
| --- | --- | --- |
| Scope | One crate with core logic | Keeps runtime and triage manageable |
| Test command | Same command used in pre-merge CI | Preserves release relevance |
| Timeout | Start from observed slowest test plus margin | Avoids misclassifying normal slowness |
| Output | Keep \`mutants.out\` | Needed for diagnosis and CI artifacts |
| Threshold | Manual review first | Rust projects vary widely by crate type |

A realistic first command for a library crate is:

\`\`\`bash
cargo mutants --timeout 60
\`\`\`

Do not set an aggressive timeout before you know the baseline. If your slowest integration test takes 45 seconds under CI load, a 20 second mutation timeout creates fake failures. Conversely, if a mutant causes an infinite retry loop, a timeout protects the run from burning the entire CI budget.

## Pairing cargo-mutants With cargo-nextest

The official cargo-mutants docs include \`--test-tool=nextest\` for projects that use cargo-nextest. That matters because nextest is often faster and has better test isolation than plain \`cargo test\`, but only if your project already treats nextest as the authoritative test runner.

\`\`\`bash
cargo mutants --test-tool=nextest --timeout 60
\`\`\`

If you use nextest profiles, keep the profile choice aligned with mutation testing. A profile that skips slow integration tests may be perfect for a PR smoke lane but too weak for mutation analysis of persistence code. A profile that includes every external-service test may be too slow. The right profile is usually a focused local-dependency profile: fast unit tests, deterministic integration tests, no live cloud calls.

\`\`\`toml
# .config/nextest.toml
[profile.mutation]
retries = 0
fail-fast = false

[[profile.mutation.overrides]]
filter = 'test(api_contract)'
slow-timeout = { period = "30s", terminate-after = 2 }
\`\`\`

Then call cargo-mutants through nextest:

\`\`\`bash
cargo mutants --test-tool=nextest --cargo-arg=--profile=mutation
\`\`\`

Keep this sample in your repository docs if you use it. Many CI failures come from someone running \`cargo mutants --test-tool=nextest --profile mutation\` and expecting cargo-mutants itself to understand a nextest profile flag.

## Configuration In .cargo/mutants.toml

The docs support a project configuration file at \`.cargo/mutants.toml\`. Use it for shared defaults that every developer and CI job should inherit. Keep one-off experiments on the command line so they do not silently change the team's mutation policy.

\`\`\`toml
# .cargo/mutants.toml
timeout = "60s"
test_tool = "nextest"
exclude_globs = [
  "src/bin/*",
  "tests/fixtures/*"
]
\`\`\`

Config keys can change over time, so verify them against https://mutants.rs when upgrading. The principle is stable even when a key name evolves: keep stable defaults in config, keep temporary filters in the command, and commit the file so AI coding agents and humans share the same policy.

| Config item | Belongs in file? | Belongs on command line? |
| --- | --- | --- |
| Standard timeout | Yes | Override for investigation |
| Test tool | Yes when team-standard | Yes for comparing runners |
| Excluded generated paths | Yes | Rarely |
| Changed-code run | No | Yes, use \`--in-diff\` |
| Shard index | No | Yes, CI matrix value |

If the project has generated Rust code, bindings, or schema snapshots, exclude them by path rather than teaching tests to care about generated implementation details. Mutation testing should focus on code you own.

## Skipping Code Deliberately

\`cargo-mutants\` supports the \`#[mutants::skip]\` attribute. Use it sparingly and leave a reason nearby. Skipping is appropriate for code where mutants are consistently unhelpful, such as generated compatibility glue, panic-only unreachable guards, or performance-specific code where mutation produces equivalent behavior.

\`\`\`rust
pub struct BuildInfo {
    pub version: &'static str,
    pub commit: &'static str,
}

#[mutants::skip]
pub fn generated_build_info() -> BuildInfo {
    BuildInfo {
        version: env!("CARGO_PKG_VERSION"),
        commit: "unknown",
    }
}
\`\`\`

The attribute is not a trash can for hard-to-test code. If a missed mutant is in business logic, add a test. If the mutant is equivalent, document it. If the line is generated, exclude the generator output. If the test is hard because the design hides the behavior, improve the seam in the production code only when that also clarifies normal maintainability.

## A Small Rust Example That Shows The Value

Consider a validation function for booking seats. Ordinary line coverage can execute both branches while still missing an important boundary. Mutation testing makes the missing boundary visible.

\`\`\`rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BookingError {
    EmptyParty,
    TooLarge,
}

pub fn validate_party_size(size: u8) -> Result<(), BookingError> {
    if size == 0 {
        return Err(BookingError::EmptyParty);
    }

    if size > 8 {
        return Err(BookingError::TooLarge);
    }

    Ok(())
}
\`\`\`

Useful tests assert exact boundary behavior:

\`\`\`rust
use booking::{validate_party_size, BookingError};

#[test]
fn accepts_largest_supported_party() {
    assert_eq!(validate_party_size(8), Ok(()));
}

#[test]
fn rejects_party_above_limit() {
    assert_eq!(validate_party_size(9), Err(BookingError::TooLarge));
}

#[test]
fn rejects_empty_party() {
    assert_eq!(validate_party_size(0), Err(BookingError::EmptyParty));
}
\`\`\`

If an AI agent generated only \`validate_party_size(4).is_ok()\`, line coverage might look fine. A mutant that changes \`size > 8\` to \`size >= 8\` would likely survive. The fix is not a broad snapshot test. It is an exact boundary assertion.

## CI Patterns: Changed Code, Shards, And Artifacts

The official docs describe \`--in-diff\` for checking mutants in changed code. That is a good pull request lane because it keeps feedback close to the developer's change. It should not be your only mutation testing lane. Changed-code checks miss old weak tests in unchanged files, so pair them with a scheduled broader run.

\`\`\`bash
cargo mutants --in-diff --test-tool=nextest --timeout 60
\`\`\`

For larger crates, split work with \`--shard\`. The exact shard expression comes from the cargo-mutants docs. The common CI pattern is a matrix where each job receives a different shard and all jobs upload their own \`mutants.out\`.

\`\`\`yaml
name: cargo-mutants

on:
  pull_request:
  workflow_dispatch:

jobs:
  mutation:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: ["0/4", "1/4", "2/4", "3/4"]
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Install Rust
        run: rustup default stable

      - name: Install cargo-mutants
        run: cargo install cargo-mutants --locked

      - name: Install cargo-nextest
        run: cargo install cargo-nextest --locked

      - name: Run mutation shard
        run: cargo mutants --test-tool=nextest --timeout 60 --shard \${{ matrix.shard }}

      - name: Upload mutation output
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: mutants-out-\${{ matrix.shard }}-\${{ github.run_id }}
          path: mutants.out
\`\`\`

This workflow avoids third-party setup actions and uses only official GitHub actions for checkout and artifacts. It is not the fastest possible version because installing tools every run costs time. Once the workflow is stable, you can add caching or prebuilt CI images, but do that as an optimization after correctness is boring.

| CI lane | Command | When to use |
| --- | --- | --- |
| PR focused | \`cargo mutants --in-diff --test-tool=nextest --timeout 60\` | Fast feedback on changed code |
| Sharded crate | \`cargo mutants --test-tool=nextest --shard 1/4\` | Large crates with stable CI matrix |
| Nightly full | \`cargo mutants --test-tool=nextest --timeout 90\` | Trend and backlog discovery |
| Investigation | \`cargo mutants --timeout 120\` plus filters | Reproduce a specific survivor locally |

If a shard fails, upload the artifact even on failure. The report is the product of the run. Without it, the developer only sees that mutation testing failed, not which behavior was missed.

## Reading mutants.out

\`mutants.out\` is where the run leaves its evidence. Keep it out of source control, but keep it in CI artifacts. For local triage, open the summary first, then inspect individual mutant logs. Look for a line, mutation description, status, and test command output.

\`\`\`bash
ls mutants.out
find mutants.out -maxdepth 2 -type f | sort | sed -n '1,40p'
\`\`\`

When triaging, sort missed mutants by business importance, not by file order. A missed mutation in authentication or settlement logic beats ten harmless misses in a CLI formatting helper. Also compare the mutant with the public contract. If a changed helper return value does not affect any externally observable result, the code may be dead or overcomplicated. Mutation testing sometimes reveals production code you can delete.

For workspace projects, record triage decisions in the same place you record flaky-test decisions. A missed mutant in a crate that owns money movement, permission checks, or irreversible file writes deserves a tracked fix. A missed mutant in diagnostic formatting might be accepted until a broader cleanup. The point is to make the decision explicit. Otherwise a future agent or maintainer sees only a lower score and may either overreact with brittle assertions or hide the file from analysis without understanding the original tradeoff.

## Realistic Failure Mode: Timeout After A Mutated Retry Loop

A common Rust failure mode appears in retry code. Suppose a function retries while an operation returns \`TemporaryFailure\`. A mutant changes a break condition, and the test hangs until cargo-mutants marks it as timeout. That timeout may be a useful catch, not just a nuisance.

Diagnosis flow:

| Evidence | Interpretation | Next action |
| --- | --- | --- |
| Baseline passes quickly | Normal tests are healthy | Continue mutation diagnosis |
| Only retry mutant times out | Mutant caused non-termination | Add a max-attempt assertion or fake clock |
| Many mutants time out | Timeout too low or tests too slow | Measure baseline under CI load |
| Timeout hides missed behavior | Test waits on real time | Replace sleeps with controlled time or injected retry policy |

Here is a testable retry design:

\`\`\`rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SendResult {
    Sent,
    TemporaryFailure,
}

pub fn send_with_retries<F>(mut send: F, max_attempts: u8) -> bool
where
    F: FnMut() -> SendResult,
{
    for _ in 0..max_attempts {
        if send() == SendResult::Sent {
            return true;
        }
    }
    false
}
\`\`\`

And a test that asserts both the return value and the side effect count:

\`\`\`rust
use retry::{send_with_retries, SendResult};

#[test]
fn stops_after_configured_attempts() {
    let mut attempts = 0;

    let sent = send_with_retries(
        || {
            attempts += 1;
            SendResult::TemporaryFailure
        },
        3,
    );

    assert!(!sent);
    assert_eq!(attempts, 3);
}
\`\`\`

That second assertion is the important one. It makes the retry count observable, so a mutant that changes the loop range has a chance to be caught. Status-only assertions often miss side effects.

## What People Get Wrong With cargo-mutants

The first wrong move is chasing 100 percent. Rust's type system and compiler mean some mutants will be unviable. Some viable mutants will be equivalent. The number is useful only when tied to a stable scope and reviewed misses.

The second wrong move is testing private implementation details to kill every survivor. A better response is to ask what behavior the production code promises. If no behavior changes when the mutant is applied, maybe the code is redundant. If behavior changes but no public test sees it, add a public or integration-level assertion.

The third wrong move is letting mutation testing run against live services. Mutants intentionally break code. A mutated S3 cleanup path, payment adapter, or admin client can produce surprising side effects if your tests are not isolated. Use local fakes, containers, temporary directories, and explicit cleanup. Every async task should be awaited or otherwise settled before assertions.

## How QA Teams Should Work With AI Coding Agents

\`cargo-mutants\` gives agents a concrete target. Instead of asking Cursor or Claude Code to improve tests vaguely, paste the missed mutant, file, line, and current tests. Ask for a minimal test that fails on the mutant and passes on the original code. Also tell the agent not to change production code unless it discovers a real defect.

\`\`\`text
cargo-mutants reports a missed mutant in src/booking.rs:
the comparison for max party size was changed and tests still passed.
Add tests that assert the exact behavior for party sizes 8 and 9.
Keep production code unchanged unless the existing behavior is wrong.
\`\`\`

Review the generated test for three things: it asserts the meaningful output, it covers the boundary or side effect that the mutant changed, and it does not overfit the implementation. If the agent adds a test that simply calls the function and checks \`is_ok()\`, send it back with the mutant details. Mutation testing makes the review conversation specific.

## Frequently Asked Questions

### Is cargo-mutants only for libraries?

No. It is often easiest to start with libraries because they have deterministic tests and clear public APIs, but binaries can benefit too. For CLI projects, make sure tests assert exit codes, stdout, stderr, generated files, and side effects. For services, isolate network and database dependencies so mutants cannot affect real systems. The main requirement is a reliable test command that represents the behavior you want to protect.

### Should I run cargo-mutants on every pull request?

Run a focused lane on pull requests, not necessarily the full workspace. \`--in-diff\` is a good starting point because it checks changed code and keeps feedback timely. For broader confidence, schedule a nightly or pre-release full run. Large Rust workspaces usually need sharding and artifacts. The goal is to make mutation results actionable, not to create a CI job that developers learn to ignore.

### How do I handle equivalent mutants?

First, confirm the mutant truly leaves public behavior unchanged. If it does, do not write brittle tests just to move a percentage. Document the case, consider simplifying the production code, or skip a narrow target when the docs support that approach. Equivalent mutants are normal in mutation testing. The discipline is to distinguish them from missed assertions, especially around boundaries, error variants, retries, and persistence side effects.

### Why does nextest matter for cargo-mutants?

Nextest can make mutation runs faster and more predictable for projects that already use it, because it provides strong test isolation and flexible profiles. \`cargo-mutants\` supports \`--test-tool=nextest\`, so the mutation run can use the same runner as the rest of CI. The catch is profile discipline. If your nextest mutation profile skips the tests that observe a behavior, mutants in that behavior will survive for the wrong reason.
`,
};
