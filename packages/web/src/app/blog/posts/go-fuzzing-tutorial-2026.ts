import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Go Fuzzing Tutorial 2026: Native Fuzz Tests with go test -fuzz',
  description:
    'Go fuzzing tutorial for 2026: write native fuzz tests with testing.F, run go test -fuzz, seed a corpus, triage crashing inputs, and wire fuzzing into CI.',
  date: '2026-06-26',
  category: 'Go',
  content: `Go fuzzing is built into the standard \`testing\` package, so you write a fuzz test as \`func FuzzXxx(f *testing.F)\`, seed it with \`f.Add(...)\`, and define the property inside \`f.Fuzz(func(t *testing.T, ...) { ... })\`. Run it with \`go test -fuzz=FuzzXxx\`, which mutates the seed inputs to hunt for panics, data races, and assertion failures. Any crashing input is saved under \`testdata/fuzz/\` and replays automatically on the next plain \`go test\`. Native fuzzing has shipped since Go 1.18, needs no external tool, and works with the same \`-race\`, \`-run\`, and \`-cover\` flags you already use.

## What native fuzzing actually does

A fuzz test is a normal Go test with a twist: instead of you supplying every input, the fuzzing engine *generates* inputs by mutating a starting set of examples (the "seed corpus"). It runs your test body against each one, watching for anything that panics, fails an assertion, deadlocks, or trips the race detector, then shrinks and records the offender.

This is coverage-guided fuzzing: the engine instruments your code, keeps inputs that exercise new paths, and mutates them further. Over millions of executions it reaches corners table tests never do — off-by-one lengths, NUL bytes, malformed UTF-8, integer overflows, weird Unicode.

The headline differences from example-based testing:

| Aspect | \`go test\` (unit/table) | \`go test -fuzz\` |
|---|---|---|
| Who picks inputs | You, explicitly | Engine, by mutation |
| What it proves | Specific cases pass | A *property* holds for many inputs |
| Run duration | Milliseconds, then done | Runs until a crash or \`-fuzztime\` elapses |
| Failure artifact | Stack trace | Stack trace **plus** a saved reproducer file |
| Default in CI | Always runs | Only seeds run unless \`-fuzz\` is passed |

Fuzzing complements unit tests rather than replacing them: keep fast example tests for known behavior, and let fuzzing earn its keep on code that parses, decodes, or transforms untrusted bytes — exactly where one weird input becomes a CVE. The rationale lives in our [property-based testing complete guide](/blog/property-based-testing-complete-guide); native fuzzing is Go's first-party take on it.

## Anatomy of a fuzz test

Three compiler-enforced rules define a fuzz test:

1. The function has the \`Fuzz\` prefix and takes exactly one argument, \`*testing.F\`.
2. It lives in a \`_test.go\` file.
3. It contains exactly one call to \`f.Fuzz\`, and that call is the last statement.

The canonical shape, testing that reversing a string twice returns the original:

\`\`\`go
package strutil

import (
	"testing"
	"unicode/utf8"
)

func Reverse(s string) string {
	r := []rune(s)
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}

func FuzzReverse(f *testing.F) {
	// Seed corpus: each f.Add becomes a seed entry.
	for _, s := range []string{"Hello, world", " ", "!12345", ""} {
		f.Add(s)
	}

	f.Fuzz(func(t *testing.T, orig string) {
		rev := Reverse(orig)
		doubleRev := Reverse(rev)

		if orig != doubleRev {
			t.Errorf("Reverse twice = %q, want %q", doubleRev, orig)
		}
		if utf8.ValidString(orig) && !utf8.ValidString(rev) {
			t.Errorf("Reverse produced invalid UTF-8 from %q", orig)
		}
	})
}
\`\`\`

The **fuzz target** is the function literal passed to \`f.Fuzz\`: its first parameter is always \`*testing.T\`, and the parameters after it are the fuzzed arguments, whose types must exactly match every \`f.Add\` call (mismatch them and \`go test\` refuses to compile).

The body asserts an *invariant*, not a specific output. "Reverse is its own inverse" holds for every string, so the engine can throw anything at it. The UTF-8 check is the interesting one: a naive byte-wise reverse corrupts multi-byte runes, which fuzzing finds fast. Patterns like this slot into the suites across the [QASkills skills directory](/skills).

## Supported input types

\`f.Fuzz\` and \`f.Add\` accept a fixed set of types — the engine only mutates these:

| Category | Types |
|---|---|
| Bytes/strings | \`[]byte\`, \`string\` |
| Integers | \`int\`, \`int8\`, \`int16\`, \`int32\`, \`int64\` and all \`uint\` variants |
| Float | \`float32\`, \`float64\` |
| Other | \`bool\`, \`byte\`, \`rune\` |

You can fuzz **multiple** arguments at once — pass matching values to \`f.Add\`, e.g. \`f.Add(0, 10)\` paired with \`f.Fuzz(func(t *testing.T, lo, hi int) { ... })\`. There is no native support for structs, maps, slices, or interfaces; fuzz a \`[]byte\` and decode it into your richer type inside the target instead. This keeps the engine mutating raw bytes, which it is good at.

## Running the fuzzer

By default \`go test\` runs only the **seed corpus** as deterministic tests. Active mutation happens only when you pass \`-fuzz\`:

\`\`\`bash
go test ./...                                    # seeds only (fast, deterministic)
go test -fuzz=FuzzReverse                         # actively fuzz one target
go test -fuzz=FuzzReverse -fuzztime=30s           # time-box so it exits
go test -fuzz=FuzzReverse -fuzztime=1000000x      # bound by iterations
go test -fuzz=FuzzReverse -race -fuzztime=60s     # fuzz with the race detector
\`\`\`

A few flags matter in practice:

- \`-fuzz=<regexp>\` must match **exactly one** target per package, or \`go test\` errors out — anchor it (\`-fuzz=^FuzzReverse$\`) when names share a prefix.
- \`-fuzztime\` bounds the run by duration (\`30s\`, \`5m\`) or count (\`10000x\`). Without it, fuzzing runs forever — fatal in CI.
- \`-fuzzminimizetime\` caps shrinking time; \`-parallel=N\` sets concurrent workers (default \`GOMAXPROCS\`).

While fuzzing you will see live progress like \`elapsed: 3s, execs: 412300, new interesting: 18\`. "new interesting" counts inputs that hit new coverage; it plateauing means the target is mostly explored.

## A realistic target: a parser round-trip

The single most valuable fuzz target is a **round-trip** over a parser/serializer pair: decoding then re-encoding reproduces the input (or a canonical form), and decoding never panics on garbage.

\`\`\`go
package config

import "testing"

// Parse and Marshal are your real functions under test.
func FuzzParseMarshalRoundTrip(f *testing.F) {
	f.Add([]byte("key=value\\n"))
	f.Add([]byte("a=1\\nb=2\\n"))

	f.Fuzz(func(t *testing.T, data []byte) {
		cfg, err := Parse(data)
		if err != nil {
			t.Skip() // malformed input is fine to reject; only panics are bugs
		}
		out, err := Marshal(cfg)
		if err != nil {
			t.Fatalf("Marshal failed on value Parse accepted: %v", err)
		}
		cfg2, err := Parse(out) // re-parsing our own output must stay stable
		if err != nil {
			t.Fatalf("re-Parse of Marshal output failed: %v", err)
		}
		if !configsEqual(cfg, cfg2) {
			t.Errorf("round-trip changed value: %+v -> %+v", cfg, cfg2)
		}
	})
}
\`\`\`

This catches inputs that parse but crash the marshaler, output the parser then rejects, and silent data loss. \`t.Skip()\` handles inputs the parser legitimately rejects, so you assert the property only for valid ones. The same boundary-injection discipline from our [Go httptest handler testing guide](/blog/go-httptest-handler-testing-guide-2026) applies — keep the unit under test pure.

## How the corpus works

Fuzzing draws inputs from two places, and the split matters:

- **Seed corpus** — the \`f.Add\` calls plus files committed under \`testdata/fuzz/<FuzzTestName>/\`. Checked into version control, runs on every \`go test\` even without \`-fuzz\` — your regression suite.
- **Generated corpus** — inputs the engine found that hit new coverage, cached **outside** your module under \`$GOCACHE/fuzz/\` (\`go env GOCACHE\`). They persist between runs on one machine but are **not** committed or shared.

A corpus file is plain text: a \`go test fuzz v1\` header, then one line per argument and type.

\`\`\`
go test fuzz v1
string("Hello, \\x00world")
\`\`\`

When fuzzing finds a failure it writes this kind of file into \`testdata/fuzz/<FuzzTestName>/\` — part of your source tree, so you commit it. Plain \`go test\` then replays it as a deterministic regression test: a fuzz finding becomes a permanent unit test for free.

## Triaging a crash

When a fuzz run fails, the output tells you precisely what to do:

\`\`\`
--- FAIL: FuzzReverse (0.02s)
    reverse_test.go:24: Reverse produced invalid UTF-8 from "\\x9c"
    Failing input written to testdata/fuzz/FuzzReverse/582528ddfa[...]
    To re-run: go test -run=FuzzReverse/582528ddfa[...]
\`\`\`

Your triage workflow:

1. **Reproduce deterministically.** Copy the printed \`go test -run=FuzzReverse/<hash>\` command; because the failing input is now a \`testdata/\` file, this replays *only* that input with no mutation.
2. **Fix the bug**, leaving the reproducer in \`testdata/fuzz/\` as a regression guard.
3. **Resume fuzzing** (\`go test -fuzz=FuzzReverse\`) to find the *next* issue; the engine skips the fixed input and keeps mutating.
4. **Commit the \`testdata/fuzz/\` file** so CI replays it forever.

That last step is the quiet superpower: a fuzz finding becomes a checked-in test future regressions cannot sneak past. To weigh this built-in loop against external fuzzing and property tooling, see the [QASkills comparison index](/compare).

## Wiring fuzzing into CI

Fuzzing is open-ended, so running \`go test -fuzz\` in CI with no time limit hangs the pipeline forever. Bound it with two strategies used together:

**1. Replay the seed corpus on every PR.** A normal \`go test ./...\` runs every \`f.Add\` seed and committed \`testdata/fuzz/\` reproducer as deterministic tests — zero config, and past findings never regress.

**2. Run a time-boxed fuzz on a schedule.** On a nightly or merge-to-main job, fuzz each target for a fixed budget:

\`\`\`yaml
# .github/workflows/fuzz.yml
name: nightly-fuzz
on:
  schedule:
    - cron: '0 3 * * *' # 03:00 UTC daily
jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: 'stable' }
      - run: go test -fuzz=FuzzParseMarshalRoundTrip -fuzztime=5m ./config/
\`\`\`

Because \`-fuzz\` targets one function per package, a multi-target repo runs several steps or a matrix. If a scheduled run crashes, it writes a \`testdata/fuzz/\` file — open a PR so the reproducer lands in source control and the next \`go test\` catches it. Keep individual \`-fuzztime\` budgets modest and let the *cumulative* nightly runs do the deep exploration.

## Native fuzzing vs go-fuzz (dvyukov)

Before Go 1.18 the de facto fuzzer was the third-party \`github.com/dvyukov/go-fuzz\`. It still exists, but the standard library changed the default calculus for most projects.

| Aspect | Native \`go test -fuzz\` | \`go-fuzz\` (dvyukov) |
|---|---|---|
| Install | Built in (Go 1.18+) | Separate \`go-fuzz\` + \`go-fuzz-build\` binaries |
| Test signature | \`func FuzzXxx(f *testing.F)\` | \`func Fuzz(data []byte) int\` |
| Multiple typed args | Yes (\`int\`, \`string\`, ... directly) | No — single \`[]byte\`, decode yourself |
| Integrates with \`go test\` | Yes (\`-race\`, \`-cover\`, \`testdata/\`) | Separate build + run cycle |
| Corpus format | \`go test fuzz v1\` text files | Binary corpus directory |
| Maintenance | First-party, follows Go releases | Community-maintained |

**When to pick native fuzzing:** almost always, for new code. It needs no toolchain setup, shares your test command and CI, supports multiple typed inputs, and turns crashes into committed regression tests. For typical parsers, validators, and decoders, this is the right 2026 default.

**When to reach for go-fuzz:** legacy projects already invested in its corpus, or niche cases where its mutation strategies or libFuzzer integration measurably beat the standard engine.

**Verdict:** start with native \`go test -fuzz\`. It is the lowest-friction path from "I have a function that eats untrusted bytes" to "I have continuous, regression-tracked fuzz coverage." Reach for go-fuzz only with a measured reason the standard engine cannot meet — which most application code never hits.

## Common pitfalls

- **Forgetting \`-fuzztime\` in automation.** Without it, \`go test -fuzz\` runs until interrupted — always bound CI runs by duration or iteration count.
- **A \`-fuzz\` regexp matching multiple targets.** \`go test\` errors instead of fuzzing; anchor the pattern (\`-fuzz=^FuzzParse$\`) when names share a prefix.
- **Type mismatch between \`f.Add\` and \`f.Fuzz\`.** Seed values must match the fuzz arguments exactly, in order and type, or the package will not compile.
- **Non-deterministic targets.** Real time, randomness, or network I/O produce "failures" that do not reproduce. Keep the target pure; inject clocks and dependencies.
- **Not committing \`testdata/fuzz/\` files.** A reproducer living only in \`$GOCACHE\` is lost on the next machine. Commit it so plain \`go test\` guards everywhere.
- **Treating every rejected input as a bug.** For parsers, an error on malformed input is correct — \`t.Skip()\` those and assert the property only for accepted inputs.

## Frequently Asked Questions

### What Go version do I need for native fuzzing?

Native fuzzing landed in Go 1.18 and has been stable in every release since, so any modern toolchain (1.18 through the current 2026 releases) supports \`go test -fuzz\`, \`testing.F\`, \`f.Add\`, and \`f.Fuzz\`. There is nothing to install — it ships in the standard \`testing\` package and \`go test\`. If \`go test -fuzz\` reports an unknown flag, your toolchain predates 1.18.

### What is the difference between go test and go test -fuzz?

Plain \`go test\` runs fuzz tests in *seed-only* mode: it executes the \`f.Add\` entries and committed \`testdata/fuzz/\` files as deterministic tests, then exits. Passing \`-fuzz=FuzzXxx\` switches one target into *active* fuzzing, mutating those seeds to generate new inputs until a crash or \`-fuzztime\`. Seeds run on every build; mutation happens only when you ask for it.

### Can I fuzz a struct or a slice of structs?

Not directly — \`f.Fuzz\` only accepts \`[]byte\`, \`string\`, the integer and float types, \`bool\`, \`byte\`, and \`rune\`. The standard pattern is to fuzz a \`[]byte\` and decode it into your struct inside the target, for example by unmarshaling JSON. This keeps the engine mutating raw bytes, which it does very effectively, while still exercising the richer type.

### Where does Go store the inputs that fuzzing discovers?

Generated inputs that hit new coverage are cached outside your module under \`$GOCACHE/fuzz/\` (find it with \`go env GOCACHE\`); they persist between runs on one machine but are not committed or shared. A *failure*, by contrast, is written to \`testdata/fuzz/<FuzzTestName>/\` inside your package — part of your source tree, so you commit it and \`go test\` replays it as a regression test.

### How do I reproduce and debug a specific fuzz failure?

When a fuzz run fails it prints the exact command, like \`go test -run=FuzzReverse/<hash>\`, and writes the failing input to \`testdata/fuzz/\`. Run that \`-run\` command to replay only that single input deterministically with no mutation, so you can attach a debugger or add logging. Leave the \`testdata/fuzz/\` file in place and commit it as a permanent regression test.

### Should fuzz tests run on every pull request in CI?

Run the seed corpus on every PR — that happens automatically with a normal \`go test ./...\`, replaying all \`f.Add\` seeds and committed reproducers as fast deterministic tests. Active fuzzing (\`-fuzz\` with \`-fuzztime\`) is open-ended and belongs on a nightly or merge-to-main schedule with a bounded budget per target, not every PR. That split keeps PR feedback fast while accumulating deep exploration over time.
`,
};
