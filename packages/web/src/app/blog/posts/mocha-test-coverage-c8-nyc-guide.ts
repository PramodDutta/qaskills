import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mocha Test Coverage with c8 and nyc: A Practical Guide',
  description: 'Use this Mocha test coverage c8 nyc guide to enforce meaningful thresholds, cover subprocesses, debug source maps, and publish reliable CI reports.',
  date: '2026-07-18',
  category: 'Guide',
  content: `
# Mocha Test Coverage with c8 and nyc: A Practical Guide

A coverage percentage is only useful when you know which files were eligible, which process executed them, and which source lines the report maps back to. That is why a Mocha suite can show an impressive number while missing a payment adapter, or show terrible TypeScript coverage because generated JavaScript is being measured instead.

This guide builds a repeatable Mocha test coverage workflow with \`c8\` and \`nyc\`. It assumes your tests already run with Mocha. If you are comparing the broader ecosystem first, use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). If coverage work is part of a runner change, the [Mocha to Jest migration guide](/blog/mocha-to-jest-migration-guide) helps separate coverage-tool differences from test-semantics changes.

## Start with the coverage question, not the percentage

Statement, branch, function, and line coverage answer different questions. A test that calls a function can cover its declaration and several statements while never exercising the fallback branch that causes the real production risk.

| Metric | What it counts | QA interpretation | Common blind spot |
|---|---|---|---|
| Statements | Executed executable statements | How much implementation ran | A ternary may have one untested outcome |
| Branches | Outcomes of conditionals | Whether decision paths were exercised | Compound boolean conditions can need more cases |
| Functions | Invoked function definitions | Whether callbacks and helpers ran | A called function can still have weak assertions |
| Lines | Source lines executed | A readable location-oriented signal | Multiple expressions on one line reduce precision |

Coverage is not proof of correctness. Treat it as a searchlight: it finds unvisited logic, then a tester decides whether the missing path deserves a focused test, is unreachable code, or belongs outside the measured production surface.

Before installing a tool, write down the intended scope. For a service, that might be \`src/**/*.ts\` excluding generated clients and type declarations. Without an explicit scope, only imported files may appear, allowing completely untested modules to vanish from the denominator.

## Pick c8 or nyc based on how code executes

\`c8\` uses coverage information produced by the V8 JavaScript engine and converts it into Istanbul-compatible reports. \`nyc\` is Istanbul's command-line interface and commonly measures code through instrumentation. Both can wrap Mocha, enforce thresholds, and emit familiar reporters.

| Decision factor | c8 | nyc |
|---|---|---|
| Primary collection model | V8 engine coverage | Istanbul instrumentation workflow |
| Strong default fit | Modern Node.js code executing directly in V8 | Projects already standardized on Istanbul instrumentation |
| Report ecosystem | Istanbul-format reporters | Istanbul-format reporters |
| Source-map sensitivity | Maps V8 ranges back to original sources | Instrumentation and transpilation order must preserve mappings |
| Migration effort | Often small for current Node.js suites | Often smaller for repositories already using nyc config and plugins |

Do not select solely from a benchmark. Run the same representative unit and integration suites with each candidate, then inspect uncovered lines in TypeScript, dynamically loaded modules, and child processes. The report that faithfully describes your execution model is more valuable than the tool that finishes a few seconds earlier.

## Establish a minimal c8 baseline

Install Mocha, Chai if used, and c8 as development dependencies. The examples use \`pnpm exec\` so the local project binaries run without relying on global installations.

\`\`\`bash
pnpm add -D mocha chai c8
pnpm exec c8 pnpm exec mocha "test/**/*.test.js"
\`\`\`

A practical script emits a terminal summary for developers and machine-readable or browsable artifacts for CI. c8 accepts multiple \`--reporter\` options.

\`\`\`json
{
  "scripts": {
    "test": "mocha \\"test/**/*.test.js\\"",
    "test:coverage": "c8 --reporter=text --reporter=html --reporter=lcov pnpm test"
  }
}
\`\`\`

Run \`pnpm test:coverage\`, read the terminal table, then open the generated HTML report locally. The HTML view is where uncovered branches become actionable: it points to the specific guard, switch case, or fallback that did not run.

By default, executed code drives much of what appears. Add an explicit include pattern and \`--all\` when the report must include eligible files that no test imports.

\`\`\`bash
pnpm exec c8 \\
  --all \\
  --include="src/**/*.js" \\
  --exclude="src/generated/**" \\
  --reporter=text \\
  --reporter=html \\
  pnpm exec mocha "test/**/*.test.js"
\`\`\`

Include production code, not tests, fixtures, migrations that never run in the application, or copied vendor files. Exclusions should have an ownership reason in code review. Excluding every hard-to-test adapter improves the number while making the signal dishonest.

## Establish the equivalent nyc workflow

For nyc, install it locally and place it before the Mocha command. Quoted globs keep the shell from expanding test files differently across environments.

\`\`\`bash
pnpm add -D mocha chai nyc
pnpm exec nyc pnpm exec mocha "test/**/*.test.js"
\`\`\`

Configuration can live in \`package.json\` or a supported nyc configuration file. Keeping it out of a long package script makes scope and thresholds reviewable.

\`\`\`json
{
  "nyc": {
    "all": true,
    "include": ["src/**/*.js"],
    "exclude": ["src/generated/**", "test/**"],
    "reporter": ["text", "html", "lcov"],
    "check-coverage": true,
    "lines": 85,
    "statements": 85,
    "functions": 80,
    "branches": 75
  }
}
\`\`\`

Start by comparing file lists, not headline totals. If nyc lists a file that c8 omits, or the reverse, determine whether it was loaded, transpiled, forked into another process, or outside the configured include set. A tool migration should not quietly redefine what “the codebase” means.

## Make TypeScript source maps tell the truth

Mocha can run TypeScript through different loaders or against compiled JavaScript. The coverage tool sees the JavaScript that Node executes, then uses source maps to relate it to \`.ts\` files. The exact loader setup depends on the project, so preserve the command that already makes Mocha execute TypeScript correctly and wrap that command with coverage.

Use this diagnostic sequence when uncovered lines point to generated output or impossible locations:

1. Run Mocha without coverage and confirm the expected TypeScript tests execute.
2. Confirm the transpiler emits or supplies source maps.
3. Run one tiny test through coverage and inspect the filenames in the text report.
4. Open the HTML report and compare a known branch with the original source.
5. Remove stale build and coverage output through the project's normal clean task, then rerun.

| Symptom | Likely cause | Verification |
|---|---|---|
| Both \`src/foo.ts\` and \`dist/foo.js\` appear | Source and build output are both in scope | Inspect include patterns and runtime imports |
| Uncovered markers are shifted | Missing or mismatched source map | Compare compiled map reference with current source |
| Type-only files appear as zero | Scope includes non-runtime files | Narrow eligible runtime patterns |
| Decorator/helper output dominates | Transpiled helpers are being reported | Inspect the mapped TypeScript view before excluding anything |

Do not paste a loader flag from another repository without checking that loader's official setup. Node module mode, TypeScript compilation strategy, and Mocha configuration must agree. Coverage should wrap a known-good test command, not become the place where the runtime is secretly reconfigured.

## Cover spawned processes and integration boundaries deliberately

CLI tests often start another Node.js process. The parent test may be covered while the actual command implementation is not, producing a misleadingly low or incomplete report. c8 and nyc can propagate coverage-related environment into compatible Node subprocess workflows, but the result depends on how the child is launched and whether execution remains in Node.

Create a small proof before trusting the whole integration suite:

\`\`\`js
import { strict as nodeAssert } from 'node:assert';
import { spawnSync } from 'node:child_process';

it('prints the validation failure from the real CLI', () => {
  const result = spawnSync(
    process.execPath,
    ['src/cli.js', '--input', 'missing.json'],
    { encoding: 'utf8' },
  );

  nodeAssert.equal(result.status, 2);
  nodeAssert.match(result.stderr, /input file/i);
});
\`\`\`

After running it under coverage, verify that \`src/cli.js\` appears and that the invalid-input branch is marked executed. If a shell script launches Node later, or a container starts a separate process with a scrubbed environment, automatic collection may stop at that boundary. Measure that component in its own test job and combine reports only with a documented, supported workflow. Never assume two reports were merged merely because both files exist in an artifacts directory.

## Set thresholds that change behavior without blocking progress

A global threshold prevents broad regression, but it can hide a newly added file with almost no tests because older well-covered code offsets it. Per-file thresholds are stricter and can be painful in legacy repositories. A staged policy usually works best.

| Stage | Gate | Team action |
|---|---|---|
| Baseline | Record current four metrics | Investigate scope and exclude only non-production artifacts |
| Ratchet | Fail if global coverage falls below the accepted baseline | Require new tests or an explicit scope correction |
| Risk focus | Review changed authentication, billing, and retry branches | Add behavior cases even when global percentage passes |
| Mature suite | Apply per-file expectations where ownership is clear | Refactor untestable modules rather than mass-excluding them |

c8 can check thresholds from the command line. Keep the values visible and revise them through ordinary review.

\`\`\`bash
pnpm exec c8 \\
  --check-coverage \\
  --lines 85 \\
  --statements 85 \\
  --functions 80 \\
  --branches 75 \\
  pnpm exec mocha "test/**/*.test.js"
\`\`\`

Thresholds belong after tests, not instead of assertions. An AI coding agent can cheaply raise line coverage by invoking functions without validating outputs. Review test strength, ensure failure paths assert error type and stable fields, and mutate a local condition temporarily if you need confidence that a supposedly protective test can actually fail.

## Publish reports in CI without making local runs painful

Use a fast text reporter locally and generate \`lcov\` or HTML in the coverage job. A GitHub Actions job can install the locked dependency graph, run the repository script, and upload the human-readable report even if the threshold fails.

\`\`\`yaml
name: test
on:
  pull_request:
  push:

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-html
          path: coverage/
\`\`\`

Pin actions according to your organization's dependency policy and keep the Node version sourced from the same repository file used by developers. The \`if: always()\` condition preserves evidence after a failing threshold. Do not upload raw reports containing source paths or code to a public destination unless that disclosure matches repository policy.

For parallel test shards, each shard's partial number is not the full result. Preserve raw coverage data from every shard, combine it using the selected tool's documented reporting workflow, and enforce the threshold after combination. Validate the merged file list with a known test split before relying on the gate.

## Investigate gaps like a tester

Sort uncovered code by failure impact, not file order. Missing branches in authorization, retry limits, currency calculations, data deletion, and error redaction deserve attention before an uncalled formatting helper.

A productive gap review produces a test case, not just a green bar. For each gap, name the input, observable output, and oracle. For example: “When the upstream returns HTTP 429 with \`Retry-After\`, the client waits according to policy, retries no more than the configured limit, and records the attempt.” Covering the branch without asserting bounded retries would still leave the principal risk untested.

If code is genuinely unreachable, remove it when safe. If a platform-specific branch cannot run in the current job, add the matching platform job or document the limitation. Ignore comments should be rare, local, and justified because they permanently remove code from the searchlight.

## Frequently Asked Questions

### Can c8 and nyc be run together for better coverage?

Do not wrap one with the other. They collect coverage through different mechanisms, and nesting them complicates instrumentation, source maps, subprocess behavior, and report ownership without making tests more thorough. Evaluate them separately against the same Mocha command. Choose one collection workflow for a job, then improve test inputs and assertions. If separate components require separate tools, keep reports distinct unless you have validated a deliberate Istanbul-compatible merge process.

### Why did coverage drop after enabling all files?

The earlier report likely counted only modules imported during tests. Enabling all eligible files adds production modules that no test loaded, so the denominator becomes more honest. Check that include and exclude patterns represent runtime code, then prioritize missing high-risk modules. Do not immediately disable all-files collection. The drop is valuable evidence that the old percentage described executed imports, not the test suite's reach across the codebase.

### Which reporter should a CI job generate?

Use \`text\` or \`text-summary\` for readable logs, HTML for line-by-line diagnosis, and \`lcov\` when a selected coverage service accepts that format. Generate only artifacts with an identified consumer. The reporter does not change what tests executed, so adding formats cannot repair missing collection. Always inspect one report after configuration changes to confirm paths, source mapping, and eligible files remain correct.

### Should every repository enforce 100 percent coverage?

Usually not as a blanket starting rule. One hundred percent can be appropriate for small critical libraries, but it can also encourage low-value assertions, excessive exclusions, and tests coupled to implementation details. Establish a trustworthy baseline, prevent regressions, and impose stronger expectations on risky logic. A lower branch percentage backed by adversarial cases can provide more confidence than perfect line coverage produced by smoke calls with weak or absent oracles.
`,
};
