import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Istanbul & nyc Code Coverage for JavaScript (2026 Guide)",
  description: "Measure JavaScript code coverage with Istanbul and nyc — setup, v8 vs babel instrumentation, thresholds, reporters, source maps, and CI gates.",
  date: "2026-06-15",
  category: "JavaScript",
  content: `# Istanbul & nyc Code Coverage for JavaScript (2026 Guide)

Istanbul is the most widely used code coverage toolkit for JavaScript, and \`nyc\` is its command-line runner. You wrap any test command with \`nyc\` — \`nyc mocha\`, \`nyc node --test\`, \`nyc tap\` — and it tracks which lines, statements, branches, and functions ran, then prints a summary and writes reports in formats like \`lcov\`, \`html\`, and \`text\`. Istanbul measures coverage one of two ways: **babel instrumentation** (rewriting your source with counters) or the newer **V8 / native coverage** (collecting data straight from the engine, no source rewriting). This guide covers installing nyc, both instrumentation paths, thresholds that fail CI, and the source-map gotchas that bite TypeScript projects.

## Istanbul vs nyc vs babel-plugin-istanbul — the naming

The ecosystem's names confuse newcomers, so here's the map:

- **Istanbul** — the umbrella project and the underlying libraries (\`istanbul-lib-coverage\`, \`istanbul-lib-instrument\`, \`istanbul-reports\`).
- **nyc** — the CLI you actually invoke. It's Istanbul's command-line interface.
- **babel-plugin-istanbul** — the Babel plugin that inserts coverage counters at build time; used when your code already goes through Babel.
- **v8-to-istanbul** — converts V8's native coverage output into Istanbul's format so you get Istanbul reports without instrumenting.

In short: you install \`nyc\`, and depending on the \`--all\`/instrumentation mode, it uses either babel-style instrumentation or V8 native coverage under the hood. If you use Jest or Vitest, they bundle their own Istanbul integration and you rarely call \`nyc\` directly — but the concepts are identical. Compare provider trade-offs in our [Vitest coverage guide](/blog).

## Installing and running nyc

\`\`\`bash
npm install --save-dev nyc
\`\`\`

Wrap your test runner. nyc spawns the command, collects coverage, and reports:

\`\`\`bash
npx nyc mocha
# or with Node's built-in test runner
npx nyc node --test
\`\`\`

Out of the box you get a \`text\` table in the terminal and a \`.nyc_output/\` directory holding raw coverage data. A typical \`package.json\` script:

\`\`\`json
{
  "scripts": {
    "test": "nyc mocha 'test/**/*.spec.js'",
    "coverage:html": "nyc --reporter=html mocha && open coverage/index.html"
  }
}
\`\`\`

## Configuration with .nycrc

Put config in \`.nycrc.json\`, \`.nycrc\`, or a \`nyc\` key in \`package.json\`. A practical config:

\`\`\`json
{
  "all": true,
  "include": ["src/**/*.js"],
  "exclude": [
    "**/*.test.js",
    "**/*.spec.js",
    "coverage/**",
    "test/**"
  ],
  "reporter": ["text", "lcov", "html"],
  "check-coverage": true,
  "branches": 70,
  "lines": 80,
  "functions": 80,
  "statements": 80
}
\`\`\`

Two settings matter most:

- **\`all: true\`** — Without it, nyc only reports files that were *required during the test run*. A module no test ever imports would show 0% coverage by being invisible — \`all\` forces every file in \`include\` into the report, so untested files correctly count against you. This is the difference between a coverage number you can trust and one that lies.
- **\`check-coverage: true\`** with the four thresholds — this is your gate. When any global metric dips below the limit, \`nyc\` exits with a non-zero code and fails CI.

## v8 vs babel instrumentation

Istanbul supports two collection strategies, and choosing the right one matters for accuracy and speed.

| | Babel instrumentation | V8 native coverage |
|---|---|---|
| How it works | Rewrites source with counters before running | Reads coverage from the V8 engine directly |
| Speed | Slower (transpile + instrument step) | Faster (no rewriting) |
| Accuracy | Precise statement/branch counts | Slightly coarser branch data historically |
| Source maps | Mature, well-supported | Requires correct maps for transpiled code |
| Setup | Add \`babel-plugin-istanbul\` to Babel config | Run Node with native coverage; nyc converts it |
| Best for | Babel/legacy build pipelines | Plain Node, speed-sensitive CI |

For a project that already runs Babel, add the plugin so instrumentation happens during your normal build:

\`\`\`js
// babel.config.js
module.exports = {
  env: {
    test: {
      plugins: ['istanbul'],
    },
  },
};
\`\`\`

Set \`BABEL_ENV=test\` when running tests and nyc will pick up the pre-instrumented code instead of instrumenting again. For plain Node without Babel, the V8 path is faster and needs no plugin — nyc handles the conversion. As of 2026, V8 coverage in Node has matured considerably and is a fine default for non-transpiled code; reach for babel-plugin-istanbul mainly when you need its battle-tested branch precision or your toolchain is already Babel-based.

## Source maps and TypeScript

This is where most "my coverage points at the wrong lines" bugs come from. If you compile TypeScript to JavaScript and then run coverage on the *compiled* output, nyc reports coverage against the \`.js\` files, not your \`.ts\` source — useless for a human. The fix is source maps plus letting nyc remap.

The cleanest modern setup runs tests directly on TypeScript via a loader and lets nyc use V8 coverage with source maps:

\`\`\`json
{
  "extends": "@istanbuljs/nyc-config-typescript",
  "all": true,
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.d.ts", "**/*.spec.ts"],
  "reporter": ["text", "lcov"]
}
\`\`\`

\`\`\`bash
npm install --save-dev @istanbuljs/nyc-config-typescript source-map-support
\`\`\`

The \`@istanbuljs/nyc-config-typescript\` preset turns on \`produce-source-map\` and \`sourceMap\` handling so the report maps counters back to your \`.ts\` lines. Ensure \`sourceMap: true\` is in your \`tsconfig.json\`. If coverage still shows the wrong lines, you have a source-map break somewhere in the chain — verify each transform emits maps.

## Reporters: which one for what

nyc ships many reporters; you'll use a handful:

- **\`text\`** — terminal table, great for local runs and CI logs.
- **\`text-summary\`** — one-line totals, good for a quick CI summary.
- **\`html\`** — browsable report at \`coverage/index.html\` with line-by-line highlighting. Indispensable for finding *which* branch is untested.
- **\`lcov\`** — the \`coverage/lcov.info\` file that Codecov, Coveralls, and SonarQube all consume. If you upload coverage anywhere, you need this one.
- **\`json\` / \`json-summary\`** — machine-readable, useful for custom dashboards or scripts.
- **\`cobertura\`** — XML format some CI systems (and older Jenkins plugins) expect.

Specify multiple at once:

\`\`\`bash
npx nyc --reporter=text --reporter=lcov --reporter=html mocha
\`\`\`

## nyc in CI with a coverage gate

A GitHub Actions job that runs tests, enforces thresholds, and uploads \`lcov\`:

\`\`\`yaml
name: test
on: [push, pull_request]
jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Test with coverage gate
        run: npx nyc --check-coverage --lines 80 --branches 70 npm test
      - name: Upload lcov
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/lcov.info
\`\`\`

Because \`--check-coverage\` is set, the step fails the moment coverage drops below the line or branch limit, turning the PR check red automatically. To show per-PR coverage *deltas* and inline annotations rather than just a pass/fail gate, send \`lcov.info\` to a coverage service — see the trade-offs in our [Codecov vs Coveralls comparison](/compare).

## Per-file thresholds

Global thresholds let one well-tested file mask a poorly-tested one. Enforce coverage per file so every module pulls its weight:

\`\`\`json
{
  "check-coverage": true,
  "per-file": true,
  "lines": 80,
  "branches": 70
}
\`\`\`

With \`per-file: true\`, nyc fails if *any single file* drops below the limit, not just the average. This is stricter and catches the classic "shipped a new untested module but the global number barely moved" problem.

## Ignoring code with istanbul hints

Some code legitimately shouldn't count against coverage — a defensive branch that should never execute, a \`default\` case that's unreachable, or environment-specific code. Istanbul reads inline comment hints so you can exclude precisely, without dragging down a whole file's number:

\`\`\`javascript
/* istanbul ignore next -- defensive, unreachable */
function neverCalledInTests() { ... }

function parse(input) {
  /* istanbul ignore else -- input is always validated upstream */
  if (input) {
    return input.trim();
  }
}

/* istanbul ignore if -- only fires in production */
if (process.env.NODE_ENV === 'production') {
  enableTelemetry();
}
\`\`\`

The variants are \`ignore next\` (the next statement/function), \`ignore if\`, and \`ignore else\`. Always add a \`-- reason\` so reviewers know *why* a line is excused — an undocumented \`istanbul ignore\` is a code smell that hides real gaps. Use these sparingly; over-using ignore hints is how teams fake a high number while leaving logic untested.

## Merging coverage from multiple test runs

Real projects often split tests across runs — unit tests with one runner, integration or E2E tests with another. Each run writes its own coverage data, and you need a *combined* picture, not two partial ones. nyc handles this with the \`merge\` command, which combines multiple \`.nyc_output\` directories into a single coverage file:

\`\`\`bash
# Run 1: unit tests -> coverage data in .nyc_output
npx nyc --reporter=json mocha 'test/unit/**/*.js'
mv .nyc_output/out.json coverage-unit/

# Run 2: integration tests
npx nyc --reporter=json mocha 'test/integration/**/*.js'
mv .nyc_output/out.json coverage-integration/

# Merge both into one coverage file, then report
npx nyc merge coverage-unit merged/unit.json
npx nyc merge coverage-integration merged/integration.json
npx nyc report --temp-dir merged --reporter=lcov --reporter=text
\`\`\`

The merged report shows true combined coverage — essential when a module is thinly unit-tested but heavily exercised by integration tests. Uploading the two runs separately to a coverage service gives a fragmented, misleadingly low number; merge first, then upload one \`lcov.info\`.

## Common errors and fixes

- **Untested files don't appear in the report** — You forgot \`all: true\`. nyc only reports required files unless told to include everything in \`include\`.
- **Coverage points at compiled \`.js\`, not \`.ts\`** — Source-map break. Use \`@istanbuljs/nyc-config-typescript\`, set \`sourceMap: true\` in \`tsconfig.json\`, and run tests on the TypeScript directly.
- **\`Transformation error\` or wrong line numbers** — A transform in your pipeline isn't emitting source maps. Each step (TS → Babel → bundler) must preserve maps.
- **Coverage is 0% with ESM** — Native ESM needs the right loader/instrumentation. Confirm your runner and nyc both understand your module format; for pure ESM, the V8 path is usually smoother than babel-plugin-istanbul.
- **Threshold passes locally but fails in CI** — Different files get imported in each environment. Add \`all: true\` so the set of measured files is deterministic regardless of which tests run.

For more JavaScript and TypeScript testing automation patterns, browse the [QA skills directory](/skills).

## Frequently Asked Questions

### What is the difference between Istanbul and nyc?

Istanbul is the overall coverage project and its underlying libraries; nyc is Istanbul's command-line interface that you actually run. You install \`nyc\` and wrap your test command with it (e.g. \`nyc mocha\`). People often say "Istanbul coverage" to mean coverage collected by nyc — they're parts of the same toolkit, not competitors.

### Should I use V8 or babel instrumentation with nyc?

Use V8 native coverage for plain Node projects that don't already transpile — it's faster and needs no extra plugin. Use babel-plugin-istanbul when your code already runs through Babel or when you need its mature, precise branch counting. As of 2026, V8 coverage is accurate enough to be a sensible default for non-transpiled JavaScript.

### How do I make nyc fail the build below a coverage threshold?

Enable \`check-coverage\` in \`.nycrc\` and set \`lines\`, \`branches\`, \`functions\`, and \`statements\` limits, or pass \`--check-coverage --lines 80\` on the command line. nyc then exits with a non-zero code when any metric falls below its limit, which fails the CI step automatically. Add \`per-file: true\` to enforce the limit on every file rather than just the average.

### Why does nyc show 0% coverage for files my tests don't import?

By default nyc only reports files that were required during the test run, so a module no test imports is simply absent. Set \`all: true\` (with an \`include\` glob) to force every matching file into the report; untested files then correctly show 0% and count against your thresholds instead of hiding.

### How do I get nyc coverage to map to TypeScript source instead of compiled JS?

Use the \`@istanbuljs/nyc-config-typescript\` preset, run your tests directly on the TypeScript via a loader, and ensure \`sourceMap: true\` is set in \`tsconfig.json\`. The preset enables source-map handling so coverage counters map back to your \`.ts\` lines. Wrong line numbers almost always mean a transform in your pipeline isn't emitting source maps.

### Which nyc reporter do I need to upload coverage to Codecov or Coveralls?

The \`lcov\` reporter, which writes \`coverage/lcov.info\` — the standard format both Codecov and Coveralls consume. Add it alongside \`text\` for terminal output: \`--reporter=text --reporter=lcov\`. SonarQube also reads LCOV for JavaScript projects, so this one file covers the major coverage services.
`,
};
