import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Flaky Test Quarantine & Test Impact Analysis Guide (2026)",
  description: "Quarantine flaky tests without losing coverage and run only impacted tests with test impact analysis. Process, detection, tooling, and CI patterns.",
  date: "2026-06-15",
  category: "Testing",
  content: `# Flaky Test Quarantine & Test Impact Analysis: A Practical Guide

Flaky test quarantine is the practice of automatically isolating tests that pass and fail non-deterministically so they stop blocking pull requests, while keeping them running in a separate lane until they are fixed or deleted. Test impact analysis (TIA) is the complementary practice of running only the tests affected by a given code change instead of the whole suite, by mapping each test to the production code it exercises. Together they attack the two biggest sources of slow, untrusted CI: tests that fail for no reason, and suites that run far more than the change requires.

This guide covers how to detect flakiness, how a quarantine workflow actually works end to end, how test impact analysis maps tests to code, and how to wire both into CI without quietly losing coverage.

## Why flaky tests and full-suite runs are so costly

A flaky test is one whose result changes across runs with no change to the code or test. The cost is not just the red build; it is the erosion of trust. Once a team learns that a red pipeline might be "just the flaky one," they start re-running jobs reflexively and ignoring real failures. Studies of large monorepos consistently find that a small percentage of flaky tests cause a large share of CI retries and developer interruptions.

Running the entire test suite on every change has a parallel problem: as a codebase grows, the suite grows, and a one-line change can trigger a 40-minute run of tests that could not possibly be affected. Slow feedback pushes developers to batch changes and stop running tests locally.

Quarantine and TIA are the two standard responses:

| Problem | Symptom | Remedy |
|---|---|---|
| Non-deterministic failures | Re-running "fixes" the build | Flaky test quarantine |
| Suite runs more than needed | Long CI for tiny diffs | Test impact analysis |
| Both compounding | Devs ignore red, batch changes | Quarantine + TIA together |

## Part 1: Detecting flaky tests

You cannot quarantine what you cannot detect. Detection is fundamentally statistical: a test is flaky if, holding code constant, it produces more than one outcome. Three detection strategies dominate.

### Rerun-on-failure (cheap, noisy)

The simplest signal: when a test fails, immediately rerun it. If it passes on retry without any change, it is a flake candidate. Most runners support this natively.

\`\`\`bash
# pytest: rerun failures up to 2 times
pytest --reruns 2 --reruns-delay 1

# Jest / Vitest: jest.retryTimes in setup
# (in jest.setup.ts)
# jest.retryTimes(2, { logErrorsBeforeRetry: true });

# Playwright: retries in config
# retries: process.env.CI ? 2 : 0
\`\`\`

Rerun-on-failure is easy but treats the symptom. A test that passes on retry is recorded as "passed," so the flake hides. The value is in the *signal*: emit an event every time a test only passes after a retry, and feed that into a flakiness tracker.

### Historical pass/fail analysis (the real detector)

The robust approach records every test result with the commit SHA, then flags any test that has both passed and failed at the *same* SHA, or whose recent pass rate sits between 0% and 100%. A simple flakiness score:

\`\`\`
flakiness = (number of result transitions) / (number of runs)
\`\`\`

A test that goes pass, pass, fail, pass, fail has 3 transitions over 5 runs = 0.6 — highly flaky. A test that is all-pass or all-fail scores 0 (stable, even if stably broken). Store results in a small table:

\`\`\`sql
CREATE TABLE test_results (
  test_id    TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  status     TEXT NOT NULL,   -- 'pass' | 'fail'
  duration_ms INT,
  run_at     TIMESTAMPTZ DEFAULT now()
);
\`\`\`

Then a nightly query surfaces candidates. This is exactly what hosted services such as the test analytics features in CircleCI, Datadog Test Optimization, BuildPulse, and Trunk Flaky Tests do — they ingest your JUnit/result files and compute flakiness over time so you do not have to build the pipeline yourself.

### Deliberate flake-hunting

For new or suspicious tests, run them many times in isolation to force flakiness out:

\`\`\`bash
# Run a single test 50 times; fail fast on first failure
pytest tests/test_checkout.py::test_apply_coupon \\
  --count 50 -x        # requires pytest-repeat
\`\`\`

If 50 isolated runs are green but the test flakes in the suite, the cause is usually shared state or ordering — which points you straight at the fix.

## Part 2: The quarantine workflow

Quarantine is a state machine, not a single flag. A test moves through: **healthy -> quarantined -> (fixed -> healthy) or (stale -> deleted)**. The goal is to remove a flaky test from the *blocking* path without removing it from *observation*.

### How quarantine runs in CI

The key idea: quarantined tests still execute, but their failures do not fail the build. They run in a separate reporting lane so you keep collecting pass/fail data to know when they are stable again.

Most ecosystems implement this with a tag or marker plus a runner filter.

\`\`\`python
# pytest: mark the test
import pytest

@pytest.mark.quarantine
def test_payment_webhook_retry():
    ...
\`\`\`

\`\`\`ini
# pytest.ini — register the marker
[pytest]
markers =
    quarantine: known-flaky, runs but does not block the build
\`\`\`

\`\`\`bash
# CI step 1: blocking run, EXCLUDING quarantined tests
pytest -m "not quarantine"      # this gate must stay green

# CI step 2: non-blocking run of ONLY quarantined tests
pytest -m "quarantine" || true  # collect data, never fail the job
\`\`\`

The same pattern works elsewhere: Playwright uses \`test.fixme()\` or a \`@quarantine\` tag with \`--grep-invert\`; JUnit 5 uses \`@Tag("quarantine")\` with \`excludeTags\`; Go uses build tags or \`t.Skip()\` guarded by an env var.

### Hosted auto-quarantine

Services like Trunk Flaky Tests and Datadog Test Optimization can quarantine automatically: once a test crosses a configured flakiness threshold, the service tells your CI to ignore that test's result for the merge gate, with no code change. This avoids the manual marker step but requires routing your merge decision through their check. The tradeoff is convenience versus an external dependency in your critical path.

### Guardrails that keep quarantine honest

Quarantine becomes coverage loss the moment a test is parked and forgotten. Enforce these rules:

- **Cap the quarantine list.** If more than, say, 1% of tests are quarantined, fail the build. A growing list is a signal the team is hiding bugs.
- **Expiry / ownership.** Every quarantined test gets an owner and a deadline. Past the deadline, the test is either fixed or deleted — never left indefinitely.
- **Promote on stability.** When a quarantined test passes N consecutive runs, automatically un-quarantine it.
- **Quarantine is for flakiness, not for failures.** A test that fails *consistently* is a real bug or an obsolete test. Quarantine is only for non-deterministic results.

A short quarantine manifest checked into the repo makes the list auditable:

\`\`\`yaml
# quarantine.yml
- test: tests/test_checkout.py::test_apply_coupon
  owner: payments-team
  reason: race on shared cart fixture
  added: 2026-05-30
  expires: 2026-06-20
\`\`\`

## Part 3: Test impact analysis (run only what changed)

Test impact analysis answers: "given this diff, which tests can possibly be affected?" Then it runs only those. The hard part is building an accurate mapping from production code to the tests that exercise it.

### How the code-to-test map is built

The standard technique is **per-test coverage**: instrument the code, run each test in isolation, and record which files/lines it touched. That produces a reverse index — for each source file, the set of tests that execute it.

\`\`\`
src/checkout.py  -> [test_apply_coupon, test_total, test_tax]
src/auth.py      -> [test_login, test_session, test_total]
src/email.py     -> [test_welcome_email]
\`\`\`

When a change touches \`src/email.py\`, only \`test_welcome_email\` needs to run. Touch \`src/checkout.py\` and you run three tests, not the whole suite.

### Computing the impacted set

On each change, diff against the merge base, expand the changed files through the dependency graph (a change to a module also impacts its importers), then union the tests mapped to all affected files:

\`\`\`bash
# 1. files changed in this branch
git diff --name-only origin/main...HEAD > changed.txt

# 2. (tool step) expand through imports + look up mapped tests
#    -> produces impacted-tests.txt

# 3. run only those
pytest $(cat impacted-tests.txt)
\`\`\`

### Tools that do this for you

You rarely build TIA from scratch. Mature options exist per ecosystem:

| Tool / platform | Ecosystem | Approach |
|---|---|---|
| \`pytest-testmon\` | Python | Per-test coverage map, reruns only impacted |
| Jest \`--changedSince\` / \`--onlyChanged\` | JS/TS | Git-diff + module dependency graph |
| Vitest \`--changed\` | JS/TS | Same idea, Vite module graph |
| NCrunch / dotCover TIA | .NET | Continuous per-test coverage |
| Bazel | Polyglot | Build-graph-based: only affected targets |
| Gradle test fixtures + caching | JVM | Task-level up-to-date checks |

\`pytest-testmon\` is the clearest single-command example:

\`\`\`bash
pip install pytest-testmon

# First run builds the .testmondata map (runs everything once)
pytest --testmon

# Later runs: only tests impacted by changes since the map was built
pytest --testmon
\`\`\`

Jest's git-aware mode is similarly turnkey:

\`\`\`bash
jest --onlyChanged          # tests related to changed files (uncommitted)
jest --changedSince=main    # tests related to diff vs main
\`\`\`

### The safety rule: TIA selects, it does not replace

Test impact analysis is an *optimization on the pull-request path*, not a replacement for full runs. The mapping can be wrong — dynamic dispatch, reflection, config files, and runtime feature flags create dependencies that static or coverage-based maps miss. The disciplined pattern:

- **On PRs:** run the impacted subset for fast feedback.
- **On merge to main and nightly:** run the *entire* suite, no TIA, so nothing slips through a stale map.
- **Rebuild the map regularly** so it does not drift from reality.

You can pair TIA with broader test-design techniques from the [QA skills directory](/skills) to make the tests it selects worth running in the first place.

## Putting it together: a combined CI pipeline

A realistic pipeline layers both techniques. On a pull request:

\`\`\`yaml
# .github/workflows/ci.yml (illustrative)
jobs:
  pr-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # need history for diff

      # Test impact analysis: only impacted, excluding quarantined
      - name: Impacted tests (blocking)
        run: pytest --testmon -m "not quarantine"

      # Quarantined tests: run for data, never block
      - name: Quarantined tests (non-blocking)
        run: pytest -m "quarantine" --testmon-noselect || true

  nightly-full:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Full suite (no TIA, no quarantine skip)
        run: pytest          # everything runs, nothing hidden
\`\`\`

The PR path is fast (impacted-only) and trustworthy (flaky tests cannot redden it). The nightly path is the safety net that catches anything the impact map missed and re-validates quarantined tests against the real suite. You can compare related CI and test-selection approaches on the [comparison hub](/compare).

## Common pitfalls and troubleshooting

**Quarantine as a graveyard.** The most common failure mode is parking tests and never returning. Without expiry, ownership, and a size cap, quarantine silently deletes your coverage. Enforce the guardrails above in CI.

**Quarantining real bugs.** If a test fails *every* run, it is not flaky — it is correct and your code is broken, or the test is obsolete. Quarantine only on a measured flakiness score, never on a single red.

**Trusting a stale TIA map.** A coverage map built three weeks ago will miss tests for new code paths. Always run the full suite on main/nightly, and rebuild the map on a schedule. Treat TIA output as "at least these tests," not "exactly these tests."

**Shared state causing both problems.** Tests that mutate global state, hit a shared database, or depend on execution order are the number-one source of flakiness *and* of inaccurate impact maps. Fix isolation (fresh fixtures, transactional rollbacks, hermetic test data) and a large fraction of both problems disappears.

**Ignoring time and concurrency.** Sleeps, real timestamps, timezone assumptions, and unawaited async work are classic flake sources. Use fake clocks, explicit waits on conditions (never fixed sleeps), and deterministic seeds before reaching for quarantine.

## Frequently Asked Questions

### What is the difference between flaky test quarantine and just disabling a test?

Disabling a test removes it entirely — it stops running and you lose all signal about whether it would pass. Quarantine keeps the test running in a non-blocking lane, so it cannot redden the build but still produces pass/fail data you use to decide when it is stable enough to promote back. Quarantine is observation without blocking; disabling is blindness.

### How do I know if a test is flaky or just failing?

A flaky test produces different results across runs with the code held constant; a failing test fails consistently. The reliable way to tell them apart is a flakiness score computed from historical results — a test that has both passed and failed at the same commit is flaky, while one that fails on every run at a commit is a genuine failure. Never quarantine on a single red result.

### Does test impact analysis reduce test coverage?

No, when used correctly. TIA changes *which* tests run on a given pull request, not which tests exist. Your full coverage is preserved by always running the complete suite on merges to main and on a nightly schedule, so TIA only optimizes feedback speed on PRs and never becomes the sole gate.

### What tools provide test impact analysis out of the box?

For Python, \`pytest-testmon\` builds a per-test coverage map and reruns only impacted tests. Jest and Vitest offer git-aware modes (\`--onlyChanged\`, \`--changedSince\`, \`--changed\`). .NET has NCrunch and dotCover, the JVM ecosystem uses Gradle/Bazel build-graph selection, and Bazel provides language-agnostic affected-target analysis across the whole repo.

### How many flaky tests are too many to quarantine?

There is no universal number, but a common guardrail is to fail the build if more than about 1% of the suite is quarantined at once. The point is to treat the quarantine list as debt that must shrink, not a permanent dumping ground. Pairing a hard cap with per-test expiry dates keeps the list from growing unchecked.

### Can I use quarantine and TIA together?

Yes, and they complement each other well. On pull requests you run only the impacted tests (TIA) while excluding quarantined ones, giving fast and trustworthy feedback. A separate non-blocking lane runs the quarantined tests to collect stability data, and a nightly full run with neither optimization serves as the safety net that re-validates everything.
`,
};
