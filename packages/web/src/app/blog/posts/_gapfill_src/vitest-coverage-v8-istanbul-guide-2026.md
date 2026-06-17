TITLE: Vitest Coverage 2026: v8 vs Istanbul, Thresholds & Reporters
DESCRIPTION: Vitest coverage in 2026 — v8 vs istanbul providers compared, configuring thresholds, choosing reporters (html, lcov, json), include/exclude, and CI gates.
DATE: 2026-06-15
CATEGORY: JavaScript
---
# Vitest Coverage 2026: v8 vs Istanbul, Thresholds & Reporters

Vitest measures code coverage through a `coverage` block in `vitest.config.ts` and runs it with `vitest run --coverage`. It offers two providers: `v8`, which uses the V8 engine's built-in coverage and is the default, and `istanbul`, which instruments your code through Babel. v8 is faster and requires no extra build step; istanbul produces the most precise branch counts and the widest reporter support. You install one optional package (`@vitest/coverage-v8` or `@vitest/coverage-istanbul`), set `provider`, choose `reporter` formats, and add `thresholds` to fail CI when coverage drops. This guide compares both and gives you a CI-ready config.

## Turning coverage on

Coverage is opt-in. The providers ship as separate packages so the base Vitest install stays small. Install the one you want:

```bash
# v8 provider (default)
pnpm add -D @vitest/coverage-v8

# or the istanbul provider
pnpm add -D @vitest/coverage-istanbul
```

Then enable it in the config and run with the flag:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'html'],
    },
  },
});
```

```bash
pnpm vitest run --coverage
```

If you forget to install the provider package, Vitest prompts you to add it on the first `--coverage` run. The `--coverage` flag can also be replaced by setting `coverage.enabled: true`, but most teams keep coverage off by default and turn it on explicitly in CI to keep local runs fast.

## v8 vs istanbul: the real differences

Both providers report the same four metrics — statements, branches, functions, lines — but they collect them differently, and that affects speed and accuracy.

| Aspect | v8 | istanbul |
|---|---|---|
| How it works | reads V8's native coverage data | instruments source with Babel before running |
| Speed | faster; no instrumentation pass | slower; transforms every file |
| Extra build step | none | adds a transform step to the pipeline |
| Branch accuracy | very good; occasionally coarser on complex expressions | the gold standard for precise branch counting |
| Source map handling | remaps native ranges back to your source | maps from instrumented output |
| Reporter support | all standard reporters | all standard reporters, longest-established |
| Best for | most projects, large suites, fast CI | strict branch-coverage gates, audited codebases |

In practice, v8 is the right default for almost everyone: it is fast, accurate enough, and needs no configuration beyond installing the package. Reach for istanbul when you have a hard branch-coverage requirement (regulated industries, libraries with strict policies) and small differences in branch counting matter, or when a tool in your chain expects istanbul-style instrumentation.

### When to pick v8

Pick v8 if you want the fastest runs, have a large test suite where instrumentation overhead is noticeable, run coverage on every CI build, and your thresholds are reasonable (70–85%) rather than demanding exact branch precision. It is the default for a reason.

### When to pick istanbul

Pick istanbul if you need the most precise branch and statement counts, your compliance policy specifies istanbul, you depend on a reporting tool tied to istanbul's instrumentation, or you have seen v8 under- or over-count a tricky expression and need deterministic numbers.

### Verdict

Start with v8. It is fast, it is the default, and for the vast majority of teams the branch numbers are indistinguishable from istanbul in any way that matters. Switch a project to istanbul only when a concrete requirement — exact branch counting or a tooling dependency — forces it. Switching is a one-line `provider` change plus swapping the installed package, so the decision is cheap to revisit.

## Choosing reporters

`coverage.reporter` accepts an array, so you can emit several formats in one run — a human summary in the terminal, an HTML site for browsing, and a machine format for your CI dashboard:

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
    },
  },
});
```

| Reporter | Output | Use it for |
|---|---|---|
| `text` | per-file table in the terminal | quick local feedback |
| `text-summary` | one totals block in the terminal | CI logs |
| `html` | browsable site under `coverage/` | finding exact uncovered lines |
| `lcov` | `lcov.info` file | Codecov, Coveralls, SonarQube |
| `json` | `coverage-final.json` | custom tooling, badges |
| `json-summary` | totals as JSON | scripts that read totals |
| `clover` | Clover XML | Jenkins and older CI |

`reportsDirectory` controls where files land (default `./coverage`). Open `coverage/index.html` after a run to click through files and see exactly which lines and branches were missed — far more useful than the terminal table when you are hunting for the last few percent.

## Thresholds: failing the build on low coverage

Thresholds turn coverage from a number you ignore into a gate that fails CI. Set minimum percentages per metric; if any falls below, `vitest run --coverage` exits non-zero:

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

Two patterns make thresholds practical on a real codebase.

**Per-file thresholds.** Add `perFile: true` so the gate applies to every file, not just the aggregate. This stops a few heavily tested files from masking an untested one:

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    perFile: true,
    lines: 80,
    branches: 70,
  },
},
```

**Ratcheting with `autoUpdate`.** Set `autoUpdate: true` and Vitest rewrites the threshold numbers in your config upward whenever coverage improves. The bar only ever goes up, preventing silent regressions without you hand-editing numbers:

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    autoUpdate: true,
    lines: 80,
    branches: 75,
    functions: 80,
    statements: 80,
  },
},
```

You can also glob-scope thresholds, applying a stricter bar to critical paths and a looser one elsewhere by keying entries to file globs.

## include and exclude: count the right files

By default Vitest only reports coverage for files touched by your tests. To see honest numbers you usually want `all: true`, which includes files that were never imported (showing 0% for genuinely untested modules) so they cannot hide:

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/__mocks__/**',
        'src/main.tsx',
        'src/**/types.ts',
      ],
    },
  },
});
```

Without `all: true` you can hit 100% coverage simply by not importing your worst code — a classic false sense of security. Exclude generated files, type-only files, test files themselves, and entry points that are exercised only by end-to-end tests.

## A complete CI-ready coverage config

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/main.tsx'],
      reporter: ['text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        perFile: false,
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

```yaml
# .github/workflows/test.yml
- run: pnpm install
- run: pnpm vitest run --coverage
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
```

The `lcov` reporter produces the `lcov.info` file that Codecov, Coveralls, and SonarQube all read. Because the threshold check makes Vitest exit non-zero on a drop, the build fails before the upload step if coverage regresses.

## Common errors and troubleshooting

- **"Failed to load coverage provider"** — the provider package is not installed. Run `pnpm add -D @vitest/coverage-v8` (or the istanbul equivalent) matching your `provider` value.
- **Coverage shows 100% but you know code is untested** — you are missing `all: true`; untested files are not being counted because nothing imports them.
- **HTML report is empty or missing** — `html` is not in the `reporter` array, or you opened the wrong path; open `coverage/index.html`.
- **Branch numbers differ from your old Jest/istanbul setup** — expected when switching to v8; the counting method differs slightly. Switch `provider` to `istanbul` if you need identical numbers.
- **Threshold fails but you only changed unrelated files** — with `all: true` a newly added untested file drops the aggregate; either test it or add it to `exclude` deliberately.
- **Source files show as compiled/minified in the report** — usually a source-map issue in the build; ensure source maps are enabled for the transform Vitest applies.

For how coverage compares across runners, see the [test runner comparisons](/compare), and find ready-to-install testing configs for AI coding agents at [/skills](/skills). More Vitest and testing guides are on the [blog](/blog).

## Frequently Asked Questions

### Should I use the v8 or istanbul coverage provider in Vitest?

Use `v8` for almost all projects — it is the default, it is faster because it reads V8's native coverage rather than instrumenting your code, and its accuracy is sufficient for typical thresholds. Choose `istanbul` only when you need the most precise branch counting, have a compliance policy that mandates it, or depend on a tool tied to istanbul instrumentation.

### How do I make Vitest fail CI when coverage is too low?

Add a `thresholds` object under `coverage` with minimum percentages for `lines`, `branches`, `functions`, and `statements`. When any metric falls below its threshold, `vitest run --coverage` exits with a non-zero code, which fails the CI job automatically. Add `perFile: true` to apply the gate to every file rather than only the aggregate.

### Why does my Vitest coverage show 100% when some code is clearly untested?

By default Vitest only reports files that your tests import, so modules nothing imports are simply omitted and cannot lower the percentage. Set `coverage.all: true` together with an `include` glob so untested files appear at 0% and are counted, giving you honest totals instead of a misleading 100%.

### Which Vitest coverage reporter should I use for Codecov or SonarQube?

Use the `lcov` reporter, which writes an `lcov.info` file that Codecov, Coveralls, and SonarQube all ingest. You can list several reporters at once, so combine `lcov` for the dashboard with `text-summary` for readable CI logs and `html` for browsing uncovered lines locally.

### Do I need to install a separate package for Vitest coverage?

Yes. The coverage providers ship as optional packages to keep the base install small: run `pnpm add -D @vitest/coverage-v8` for the default provider or `pnpm add -D @vitest/coverage-istanbul` for istanbul. If you run `--coverage` without the package installed, Vitest prompts you to add the correct one.

### Can Vitest automatically raise my coverage thresholds over time?

Yes. Set `thresholds.autoUpdate: true` and Vitest rewrites the threshold numbers in your config upward whenever measured coverage exceeds them. This creates a ratchet — coverage can only go up — which prevents silent regressions without anyone manually editing the numbers after each improvement.
