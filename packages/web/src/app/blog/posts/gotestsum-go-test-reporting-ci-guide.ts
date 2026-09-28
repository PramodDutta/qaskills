import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'gotestsum: Readable Go Test Output, JUnit XML, and Reruns in CI',
  description: 'gotestsum guide for QA engineers: readable Go test output, JUnit XML, JSON logs, reruns, watch mode, and CI artifacts for faster failure diagnosis.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# gotestsum: Readable Go Test Output, JUnit XML, and Reruns in CI

gotestsum is an actively maintained \`go test\` runner that keeps Go test output readable for humans while preserving machine-friendly reports for CI. The latest official GitHub release I verified is \`v1.13.0\`, released on September 11, 2025. The repository has not been renamed or discontinued, and the current README still documents \`--format\`, \`--junitfile\`, \`--jsonfile\`, \`--rerun-fails\`, \`--packages\`, \`--watch\`, and custom \`go test\` arguments after \`--\`.

The direct answer for QA teams: use gotestsum when raw \`go test -v ./...\` makes CI logs hard to scan, but you still want the real Go test runner underneath. gotestsum does not replace Go's testing package. It runs \`go test -json ./...\` by default, formats progress and summaries, writes JUnit XML for CI systems, writes line-delimited JSON for later analysis, and can rerun failed tests without rerunning the entire suite.

This guide assumes you already care about Go test quality: table-driven tests, meaningful assertions, and handler tests with real side effects. If you need that foundation first, read the [Go testing tutorial for table-driven tests](/blog/go-testing-tutorial-table-driven-tests-2026). If your suite centers on HTTP handlers, pair the reporting workflow here with the [Go httptest handler testing guide](/blog/go-httptest-handler-testing-guide-2026).

## Verified CLI Surface for 2026 Pipelines

The official README says the \`--format\` flag, or the \`GOTESTSUM_FORMAT\` environment variable, controls how test names and output are printed. Common formats include \`dots\`, \`pkgname\`, \`testname\`, \`testdox\`, \`standard-quiet\`, and \`standard-verbose\`. It also confirms \`--junitfile\` for JUnit XML, \`--jsonfile\` for test2json output, \`--watch\` for local reruns on saved Go files, and \`--rerun-fails\` for flaky suites.

| Need | gotestsum flag | Good default | Caution |
| --- | --- | --- | --- |
| Compact CI progress | \`--format pkgname\` | Package-level output with summary | Failing test names appear in summary, not as every test runs. |
| Debug a focused failure | \`--format testname\` | One line per test and package | More verbose on large suites. |
| Preserve raw event stream | \`--jsonfile test-output.jsonl\` | Archive as artifact | File can be large for chatty tests. |
| CI test reporting | \`--junitfile junit.xml\` | Upload even on failure | Choose suite naming if your CI groups poorly. |
| Rerun flakes | \`--rerun-fails --packages="./..."\` | Use only with JSON-compatible tests | Do not hide deterministic failures. |
| Local loop | \`--watch --format testname\` | Run changed package on save | Multi-module repos may need \`--watch-chdir\`. |

What people get wrong: gotestsum is not a magic flake fixer. \`--rerun-fails\` reruns failures until each passes once or attempts are exhausted, with a default maximum of two attempts. That is useful for developer feedback and quarantined known flakes, but it should not become a blanket policy that turns broken tests green. Treat rerun data as a signal to fix the underlying nondeterminism.

## Install and Pin gotestsum

The official README supports installing via release archives, package managers, and Go tooling. For CI, pin the version. The release page for \`v1.13.0\` includes platform assets and checksums, and the README documents \`go install gotest.tools/gotestsum@latest\`. In a repeatable pipeline, replace \`@latest\` with the version you have validated.

\`\`\`bash
go install gotest.tools/gotestsum@v1.13.0
gotestsum --version
\`\`\`

\`\`\`bash
mkdir -p .tools
GOBIN="$(pwd)/.tools" go install gotest.tools/gotestsum@v1.13.0
.tools/gotestsum --format pkgname -- ./...
\`\`\`

For developer machines, installing through Go is usually enough. For locked-down CI images, download a release archive and verify the checksum. Either way, make the selected version visible in logs. A short \`gotestsum --version\` line before the test command can save an hour when a CI image and a local laptop use different binaries.

## Choose the Right Output Format

The output format is not cosmetic. It changes how quickly a reviewer can find the first useful failure. In small packages, \`testname\` feels excellent because every test result is explicit. In a large service with thousands of subtests, \`pkgname\` or \`dots\` keeps the live log readable while the summary and artifacts carry details. \`standard-verbose\` is best when you need compatibility with existing tools or you want output close to \`go test -v\`.

| Format | When it shines | When to avoid it |
| --- | --- | --- |
| \`pkgname\` | Default CI lane for many packages | A single huge package with many subtests can still hide progress. |
| \`testname\` | Focused debugging, new test development, agent reviews | Very noisy for broad pull request checks. |
| \`dots\` | Long suites where progress matters more than names | Harder to connect a live dot to a specific test. |
| \`standard-verbose\` | Comparing with raw Go output or debugging test logs | Can bury the summary under application output. |
| \`standard-quiet\` | Minimal logs with CI artifacts doing the detail work | Less pleasant during interactive troubleshooting. |

\`\`\`bash
gotestsum --format testname -- ./...
\`\`\`

\`\`\`bash
gotestsum --format pkgname -- -run '^TestCheckoutCreatesReceipt$' ./internal/checkout
\`\`\`

\`\`\`bash
gotestsum --format standard-verbose -- -count=1 -race ./...
\`\`\`

Notice the \`--\`. Arguments before it belong to gotestsum. Arguments after it are passed to \`go test\`. That distinction matters for AI coding agents. If an agent writes \`gotestsum -run TestX\`, it is likely wrong because \`-run\` is a Go test flag, not a gotestsum flag. The correct shape is \`gotestsum -- -run '^TestX$' ./pkg\`.

## Produce JUnit XML and JSON Together

\`--junitfile\` writes a JUnit XML file for CI systems. \`--jsonfile\` writes the line-delimited \`test2json\` stream that gotestsum receives from \`go test -json\`. Use both in CI. JUnit is for dashboards, annotations, and pass-fail history. JSON is for diagnosis, slow-test analysis, flake tracking, and custom summaries.

\`\`\`bash
mkdir -p test-results
gotestsum \\
  --format pkgname \\
  --junitfile test-results/unit.xml \\
  --jsonfile test-results/unit.jsonl \\
  -- ./...
\`\`\`

\`\`\`bash
gotestsum tool slowest --num 20 --jsonfile test-results/unit.jsonl
\`\`\`

The JSON file is also a safety net when stdout is compact. A pull request check can show \`pkgname\` live output and still retain every subtest event in an artifact. That lets a QA engineer investigate after the fact without rerunning a transient failure.

If your CI groups all Go tests under awkward suite names, use the JUnit naming controls documented by gotestsum. The README confirms \`--junitfile-testsuite-name\` and \`--junitfile-testcase-classname\` can use \`short\`, \`relative\`, or \`full\`. In monorepos, \`relative\` often makes dashboards easier to scan than full import paths.

\`\`\`bash
gotestsum \\
  --format pkgname \\
  --junitfile test-results/unit.xml \\
  --junitfile-testsuite-name relative \\
  --junitfile-testcase-classname relative \\
  -- ./...
\`\`\`

## Rerun Failures Without Lying to Yourself

The official docs state that \`--rerun-fails\` reruns failed tests until each passes once or the maximum attempts is exceeded, with \`--rerun-fails=n\` controlling attempts. They also state that when you pass Go test arguments after \`--\`, the packages must be specified with \`--packages\`. That is the flag many teams forget.

\`\`\`bash
gotestsum \\
  --format testname \\
  --rerun-fails=2 \\
  --rerun-fails-max-failures=5 \\
  --packages="./..." \\
  -- -count=1 ./...
\`\`\`

Use reruns for known nondeterminism while you are actively measuring and fixing it. Do not use reruns for race detector failures, data corruption, or external service tests that perform real side effects. gotestsum also documents \`--rerun-fails-abort-on-data-race\`, which should be enabled when race detection is part of the lane.

\`\`\`bash
gotestsum \\
  --format pkgname \\
  --rerun-fails=2 \\
  --rerun-fails-abort-on-data-race \\
  --packages="./..." \\
  -- -race -count=1 ./...
\`\`\`

A realistic failure mode: CI shows green after a rerun, but the JUnit XML contains a failure then pass history in artifacts. The diagnosis is not "the test is fine". Inspect the JSON stream, identify whether the first failure was timeout, order dependency, network dependency, shared temp directory, or data race, and file a flake fix with the exact test name. Rerun policy buys signal continuity, not permission to ignore the first failure.

## GitHub Actions CI That Keeps Evidence

For GitHub Actions, use the current major versions of official actions and upload artifacts even when tests fail. \`actions/setup-go@v7\` is the current major I verified from the official release page. The workflow below uses Go's module cache through setup-go, installs a pinned gotestsum, runs tests, and uploads JUnit plus JSON artifacts.

\`\`\`yaml
name: go-tests

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-go@v7
        with:
          go-version: '1.25.x'
          cache: true
      - name: Install gotestsum
        run: go install gotest.tools/gotestsum@v1.13.0
      - name: Run tests
        run: |
          mkdir -p test-results
          gotestsum \\
            --format pkgname \\
            --junitfile test-results/unit.xml \\
            --jsonfile test-results/unit.jsonl \\
            -- ./...
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: go-test-results-\${{ github.run_id }}
          path: test-results
\`\`\`

If your repo uses integration tests, split them with Go build tags or package selectors. Keep unit tests fast, then run integration tests in a separate job with explicit services. gotestsum passes build tags after \`--\`, so the command stays predictable.

\`\`\`bash
gotestsum \\
  --format testname \\
  --junitfile test-results/integration.xml \\
  --jsonfile test-results/integration.jsonl \\
  -- -tags=integration -count=1 ./...
\`\`\`

## Focus Runs for Agent Review

AI coding agents tend to run either too much or too little. Give them exact gotestsum commands for the shape of change. For a single handler, run the package and an anchored \`-run\` pattern. For a table-driven subtest, include the full slash-separated subtest path. For a cross-cutting change, run \`./...\` with compact output and artifacts.

| Change type | Command shape | Why it works |
| --- | --- | --- |
| One test function | \`gotestsum --format testname -- -run '^TestName$' ./pkg\` | Anchored pattern avoids accidental neighboring tests. |
| One subtest | \`gotestsum --format testname -- -run '^TestName$/case_name$' ./pkg\` | Matches Go subtest naming. |
| Race-sensitive change | \`gotestsum --format pkgname -- -race -count=1 ./...\` | Disables cache and checks races. |
| Flake investigation | \`gotestsum --format testname -- -count=20 -run '^TestName$' ./pkg\` | Repeats only the suspect test. |
| CI parity | \`gotestsum --format pkgname --junitfile ... --jsonfile ... -- ./...\` | Mirrors artifact-producing lane. |

\`\`\`go
package checkout

import "testing"

func TestNormalizeCouponCode(t *testing.T) {
    tests := []struct {
        name string
        in   string
        want string
    }{
        {name: "trims_spaces", in: " SAVE10 ", want: "SAVE10"},
        {name: "keeps_internal_dash", in: "QA-2026", want: "QA-2026"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := NormalizeCouponCode(tt.in)
            if got != tt.want {
                t.Fatalf("NormalizeCouponCode(%q) = %q, want %q", tt.in, got, tt.want)
            }
        })
    }
}
\`\`\`

\`\`\`bash
gotestsum --format testname -- -run '^TestNormalizeCouponCode$/trims_spaces$' ./internal/checkout
\`\`\`

The anchored pattern matters. A loose \`-run Coupon\` can pass because some related test ran while the changed test stayed cached or skipped. Add \`-count=1\` when you need to bypass the Go test cache.

## Local Watch Mode for Fast QA Loops

\`--watch\` watches directories with Go files and reruns tests for the changed package. The README also documents keys while watch mode is running: \`r\` reruns the previous event, \`u\` reruns with \`-update\`, \`d\` uses Delve for debugging when available, \`a\` runs all packages, and \`l\` rescans directories. That makes gotestsum useful for local TDD, not only CI.

\`\`\`bash
gotestsum --watch --format testname
\`\`\`

\`\`\`bash
gotestsum --watch --watch-chdir --format testname -- ./...
\`\`\`

Use \`--watch-chdir\` in multi-module repositories where tests outside the main module would otherwise fail because \`go test\` is run from the wrong directory. If the repo has generated files, be careful with watchers that trigger on code generation outputs. The loop should react to meaningful edits, not repeatedly rerun because a tool keeps touching generated files.

## Debugging Bad gotestsum Runs

When gotestsum fails unexpectedly, separate gotestsum problems from Go test problems. First run with \`--debug\` so the actual command is printed. Then run the printed \`go test\` command directly. If raw \`go test\` fails the same way, fix the tests. If raw \`go test\` passes but gotestsum fails, check whether your custom command emits non-JSON output, whether stderr is being used incorrectly, or whether rerun flags need \`--packages\`.

\`\`\`bash
gotestsum --debug --format testname -- -run '^TestPaymentWebhook$' ./internal/webhooks
\`\`\`

Custom commands are a sharp edge. The README says gotestsum normally runs \`go test -json ./...\`, and \`--raw-command\` can run a script instead. If you do that, stdout must contain only test2json output, or gotestsum will fail unless you opt into ignoring non-JSON lines. For most QA teams, avoid \`--raw-command\` until the ordinary path is proven insufficient.

Another common problem is test pollution. A package passes alone but fails under \`./...\`. gotestsum makes this easier to see, but it does not change Go's execution model. Look for shared environment variables, shared temp paths, package-level state, tests that depend on current time without control, and tests that call external services without fakes. Fix those failures in the test code rather than masking them with format changes.

## Keep Reports Useful After the Build Finishes

The artifact strategy is part of the test design. Store JUnit XML where the CI platform expects it, and store JSON logs where engineers can download them after a failed or flaky run. Use predictable names such as \`unit.xml\`, \`race.xml\`, and \`integration.xml\` instead of overwriting every lane into one file. If a job has multiple commands, create one subdirectory per lane so a reviewer can map the failing dashboard entry back to the exact command.

For long-running programs, add a small post-processing step that prints slow tests from the JSON file. This does not require fabricated benchmarks. It simply shows the slowest tests in that run, which is enough to catch accidental sleeps, real network calls, and table cases that grew beyond their intended scope. When an agent changes test setup code, ask it to compare the slowest list before and after the change and explain any new outlier.

## Frequently Asked Questions

### Is gotestsum a replacement for go test?

No. gotestsum is a runner and formatter around Go's test workflow. By default it runs \`go test -json ./...\`, consumes the JSON event stream, prints a clearer live view, and can write JUnit XML or JSON logs. Your tests still use Go's \`testing\` package, the same build tags, the same \`-run\`, \`-race\`, \`-count\`, and package selectors. That is why adoption is low-risk: replace the CI command first, then improve artifacts and rerun policy.

### Which gotestsum format should CI use?

Use \`pkgname\` for a broad default CI job unless your repository is small enough that \`testname\` remains readable. \`pkgname\` keeps logs compact and still prints a useful summary of failures, skips, build errors, and total duration. Always combine the compact format with \`--junitfile\` and \`--jsonfile\` so details are preserved. Use \`testname\` for focused debug jobs, agent review commands, and local watch mode where individual test names help more than log brevity.

### Should rerun-fails be enabled for every pull request?

Only if the team treats reruns as evidence, not as a broom. A blanket \`--rerun-fails\` policy can hide deterministic failures if nobody inspects the first attempt. A safer approach is to enable reruns with a low attempt count, cap \`--rerun-fails-max-failures\`, abort on data races when using \`-race\`, and archive JSON logs. Then track tests that pass only after rerun and fix them. Reruns should reduce wasted CI time, not normalize unreliable tests.

### Why does gotestsum need --packages with reruns?

When you pass Go test arguments after \`--\`, gotestsum needs an explicit package list for rerunning individual failures. The official docs call out \`--packages\` for this case. Without it, gotestsum may not know how to reconstruct the package-specific rerun command. Use a command such as \`gotestsum --rerun-fails --packages="./..." -- -count=1 ./...\`. Keep the package selector in both places so the initial run and rerun scope match.
`,
};
