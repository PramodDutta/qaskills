TITLE: Go Testing Tutorial: Table-Driven Tests (2026)
DESCRIPTION: Go testing tutorial for 2026 — the testing package, t.Run subtests, the table-driven idiom, t.Parallel, t.Cleanup, coverage and benchmarks with runnable examples.
DATE: 2026-06-15
CATEGORY: Go
---
# Go Testing Tutorial: Table-Driven Tests (2026)

**Go's `testing` package is built into the standard library — no external runner, no assertion framework required.** You write functions named `TestXxx(t *testing.T)` in `_test.go` files and run them with `go test`. The idiomatic way to cover many input/output cases is the **table-driven test**: define a slice of structs (each a test case) and loop over it, calling `t.Run(name, ...)` to create a named subtest per case. This gives you focused failure output, independent pass/fail per case, and the ability to parallelize with `t.Parallel()`. This tutorial covers the whole flow with runnable code.

---

## The minimal test

A test file lives beside the code it tests, ends in `_test.go`, and uses the same package (or `package foo_test` for black-box tests).

```go
// math.go
package mathx

func Add(a, b int) int { return a + b }
```

```go
// math_test.go
package mathx

import "testing"

func TestAdd(t *testing.T) {
    got := Add(2, 3)
    if got != 5 {
        t.Errorf("Add(2,3) = %d; want 5", got)
    }
}
```

Run it:

```bash
go test ./...        # all packages
go test -v ./...     # verbose: prints each test
go test -run TestAdd # only tests matching the regex
```

Note there is no `assert`. You compare values yourself and call `t.Errorf` (continue) or `t.Fatalf` (stop this test immediately). This minimalism is deliberate — many Go teams add a thin helper or the **Testify** assertion library, but the standard library is fully usable on its own.

---

## `t.Error` vs `t.Fatal`

- `t.Errorf(...)` marks the test failed but **keeps running** — good for checking several independent expectations.
- `t.Fatalf(...)` marks it failed and **stops the current test/subtest** via `runtime.Goexit` — use it when continuing would panic (e.g. you got a `nil` you were about to dereference).

```go
res, err := Parse(input)
if err != nil {
    t.Fatalf("unexpected error: %v", err) // can't safely use res below
}
if res.Count != 3 {
    t.Errorf("Count = %d; want 3", res.Count)
}
```

---

## The table-driven idiom

This is the heart of idiomatic Go testing. You enumerate cases as data, then iterate.

```go
func TestAdd_Table(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positives", 2, 3, 5},
        {"with zero", 0, 7, 7},
        {"negatives", -4, -6, -10},
        {"mixed signs", -5, 5, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.want {
                t.Errorf("Add(%d,%d) = %d; want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

Why this pattern wins:

- **One case fails, the rest still run.** Each `t.Run` is an isolated subtest.
- **Readable output.** Failures print as `TestAdd_Table/mixed_signs`, naming the exact case.
- **Targeted reruns.** `go test -run 'TestAdd_Table/negatives'` runs a single case.
- **Easy to extend.** Adding a case is one struct literal, not a new function.

Output for a verbose run:

```
=== RUN   TestAdd_Table
=== RUN   TestAdd_Table/positives
=== RUN   TestAdd_Table/with_zero
--- PASS: TestAdd_Table (0.00s)
    --- PASS: TestAdd_Table/positives (0.00s)
    --- PASS: TestAdd_Table/with_zero (0.00s)
```

(Spaces in subtest names become underscores in the path.)

---

## Subtests and `t.Run`

`t.Run` is not only for tables — it groups related assertions and lets you share setup at the parent level while isolating each child.

```go
func TestUserService(t *testing.T) {
    svc := newUserService(t) // shared setup

    t.Run("create", func(t *testing.T) {
        u, err := svc.Create("ada@example.com")
        if err != nil {
            t.Fatalf("create: %v", err)
        }
        if u.ID == 0 {
            t.Error("expected non-zero ID")
        }
    })

    t.Run("duplicate email rejected", func(t *testing.T) {
        _, err := svc.Create("ada@example.com")
        if err == nil {
            t.Error("expected duplicate-email error")
        }
    })
}
```

---

## `t.Parallel()` — running cases concurrently

`t.Parallel()` signals that a test can run alongside other parallel tests. Inside a table-driven test, calling it in each subtest parallelizes the cases.

```go
func TestSquare_Parallel(t *testing.T) {
    tests := []struct {
        name string
        in   int
        want int
    }{
        {"two", 2, 4},
        {"three", 3, 9},
        {"ten", 10, 100},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            if got := Square(tt.in); got != tt.want {
                t.Errorf("Square(%d) = %d; want %d", tt.in, got, tt.want)
            }
        })
    }
}
```

A historically important gotcha: before Go 1.22 the loop variable `tt` was **shared** across iterations, so parallel subtests captured the *last* value. The classic fix was `tt := tt` inside the loop. As of **Go 1.22+ each loop iteration gets its own variable**, so that workaround is no longer needed on modern toolchains — but you will still see `tt := tt` in older code and tutorials. If you target Go below 1.22, keep the copy.

Control parallelism with the `-parallel` flag (defaults to `GOMAXPROCS`):

```bash
go test -parallel 4 ./...
```

---

## `t.Cleanup` and `t.TempDir` — modern teardown

Instead of `defer` scattered through setup, register teardown with `t.Cleanup`. It runs after the test (and its subtests) finish, in LIFO order, even on failure.

```go
func newUserService(t *testing.T) *UserService {
    t.Helper() // failures point at the caller, not this line

    dir := t.TempDir() // auto-removed after the test
    db := openDB(dir)
    t.Cleanup(func() { db.Close() })

    return &UserService{db: db}
}
```

`t.Helper()` marks the function as a helper so failure messages report the calling test's line, not the helper's. `t.TempDir()` returns a unique temp directory cleaned up automatically — no manual `os.RemoveAll`.

---

## Table-driven test with error cases

Real functions return errors; the table should cover both happy and failure paths.

```go
func TestParseAge(t *testing.T) {
    tests := []struct {
        name    string
        in      string
        want    int
        wantErr bool
    }{
        {"valid", "42", 42, false},
        {"empty", "", 0, true},
        {"non-numeric", "abc", 0, true},
        {"negative", "-1", 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAge(tt.in)
            if (err != nil) != tt.wantErr {
                t.Fatalf("ParseAge(%q) error = %v; wantErr %v", tt.in, err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("ParseAge(%q) = %d; want %d", tt.in, got, tt.want)
            }
        })
    }
}
```

The `(err != nil) != tt.wantErr` check is the canonical Go idiom for "did we get an error exactly when we expected one."

---

## Coverage and benchmarks

Coverage is built in:

```bash
go test -cover ./...
go test -coverprofile=cover.out ./...
go tool cover -html=cover.out          # open an annotated HTML report
go tool cover -func=cover.out          # per-function percentages in the terminal
```

Benchmarks are `BenchmarkXxx(b *testing.B)` functions; the runner picks `b.N` for you:

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}
```

```bash
go test -bench=. -benchmem ./...
```

The race detector is one of Go's best features — run it in CI:

```bash
go test -race ./...
```

---

## Fuzzing (built into the standard library)

Since Go 1.18, native fuzzing lives in the same `testing` package. A `FuzzXxx(f *testing.F)` function seeds inputs with `f.Add` and explores mutations via `f.Fuzz`. It is excellent for parsers and any function that takes untrusted input.

```go
func FuzzParseAge(f *testing.F) {
    f.Add("42")   // seed corpus
    f.Add("-1")
    f.Add("")
    f.Fuzz(func(t *testing.T, s string) {
        // Property: ParseAge must never panic, whatever the input.
        _, _ = ParseAge(s)
    })
}
```

```bash
go test -run=^$ -fuzz=FuzzParseAge -fuzztime=30s ./...
```

When fuzzing finds an input that panics or violates an assertion, Go writes it to `testdata/fuzz/` so the failing case becomes a permanent regression test on the next plain `go test`.

---

## Example tests as documentation

`ExampleXxx` functions double as compiled, verified documentation. A trailing `// Output:` comment turns the example into an executable test — `go test` runs it and fails if stdout does not match.

```go
func ExampleAdd() {
    fmt.Println(Add(2, 3))
    // Output: 5
}
```

Because these appear in `go doc` and on pkg.go.dev, they keep your docs honest: an example that drifts from the real behavior breaks the build.

For more on structuring suites and where the standard library stops and helper libraries begin, browse the [QA skills directory](/skills) and the Go-testing entries on the [blog](/blog). To weigh the standard library against BDD-style alternatives, see the [comparison hub](/compare).

---

## CI usage (GitHub Actions)

```yaml
name: go-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
          cache: true
      - run: go test -race -coverprofile=cover.out -covermode=atomic ./...
      - run: go tool cover -func=cover.out
```

---

## Common errors and troubleshooting

- **"no test files"** — your file is not named `*_test.go`, or the `TestXxx` function has the wrong signature (must be `func TestX(t *testing.T)`).
- **Parallel subtests all report the last case (pre-1.22)** — add `tt := tt` inside the loop, or upgrade to Go 1.22+ where per-iteration loop scoping fixes it.
- **Cleanup not running** — you used `defer` inside a helper that returns before the test ends; prefer `t.Cleanup`, which is tied to the test's lifetime.
- **Helper line shows in failure output** — call `t.Helper()` at the top of the helper.
- **Flaky tests under `-race`** — the race detector found a genuine data race; fix the shared-state access rather than disabling `-race`.
- **Tests time out** — a goroutine is blocked; pass `-timeout 30s` to fail fast and inspect the dumped stacks.

---

## Frequently Asked Questions

### What is a table-driven test in Go?

It is a test that stores its cases as a slice of structs — each holding inputs and the expected output — and loops over them, running each as a named subtest via `t.Run`. It keeps logic in one place, gives independent pass/fail per case, and makes adding a new case as simple as appending a struct literal.

### Do I still need `tt := tt` inside the loop in 2026?

Only if you target Go versions below 1.22. Since Go 1.22, each `for` loop iteration gets its own copy of the loop variable, so parallel subtests no longer capture a shared variable. You will still see the `tt := tt` copy in older code, and it is harmless to keep for backward compatibility.

### What is the difference between `t.Error` and `t.Fatal`?

`t.Error`/`t.Errorf` records a failure but lets the test keep running, which is useful for checking several independent expectations. `t.Fatal`/`t.Fatalf` records the failure and stops the current test immediately, which you want when continuing would panic — for example after an unexpected error left you with a nil value.

### How does `t.Parallel()` work?

Calling `t.Parallel()` pauses the test until its parent finishes its sequential portion, then runs it concurrently with other parallel tests. Inside a table-driven test, putting `t.Parallel()` in each subtest runs all cases in parallel, bounded by the `-parallel` flag (default `GOMAXPROCS`). Use it for independent, side-effect-free cases.

### Do I need an assertion library like Testify?

No — the standard `testing` package is complete on its own; you compare values and call `t.Errorf`/`t.Fatalf`. Many teams add Testify for terser assertions, mocks, and suites, but it is optional. For pure standard-library testing, the table-driven pattern plus helper functions covers most needs.

### How do I run just one subtest?

Use the `-run` flag with a slash-separated regex: `go test -run 'TestParseAge/negative'`. The part before the slash matches the test function, the part after matches the subtest name (with spaces replaced by underscores). You can also run a whole group like `go test -run 'TestParseAge/'`.
