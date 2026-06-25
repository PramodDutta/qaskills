import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mutation Testing With Stryker: Complete Guide 2026',
  description:
    'A hands-on mutation testing stryker guide for 2026: mutation score, why coverage lies, StrykerJS setup, mutators, config, and CI thresholds.',
  date: '2026-06-25',
  category: 'Guide',
  content: `
# Mutation Testing With Stryker: The Complete Guide for 2026

Your test suite reports 100% code coverage. Congratulations — and beware, because that number tells you almost nothing about whether your tests would actually catch a bug. Coverage measures which lines your tests *execute*, not whether your tests would *fail* if those lines were wrong. A test that runs a function but never checks its output contributes to coverage while verifying nothing. Mutation testing is the technique that exposes this gap, and Stryker is the tool that makes it practical in JavaScript and TypeScript projects.

This **mutation testing stryker** guide is a hands-on, runnable walkthrough for 2026. You will learn precisely what mutation testing does, why the mutation score is a far more honest quality signal than line coverage, and how to set up StrykerJS from scratch in a JS or TS project. We will cover the mutators Stryker applies, how to configure \`stryker.conf.json\`, how to run it, and how to read the HTML report to find tests that pass when they should fail. We will integrate Stryker with Jest and Vitest, set sensible CI thresholds without grinding your pipeline to a halt, and apply performance tricks so mutation testing stays fast enough to actually use. We will close with brief notes on Stryker.NET for C# and mutmut for Python so you can take the same ideas to other stacks.

Every code block here runs. The example function and its tests are real, the Stryker config is copy-paste ready, and the CLI commands work against a current StrykerJS install. If you have ever shipped a bug through a fully covered suite — and everyone has — this is the discipline that would have caught it. Let us make your tests prove they actually test.

## What Mutation Testing Actually Does

Mutation testing works by deliberately breaking your code in small, surgical ways and checking whether your tests notice. The tool takes your source, makes a tiny change — flips a \`<\` to a \`<=\`, swaps a \`+\` for a \`-\`, replaces a return value with a constant — and then runs your test suite against this "mutant." If a test fails, the mutant is *killed*: your tests caught the change, which is exactly what you want. If every test still passes, the mutant *survived*: your tests did not notice that the code was broken, which means you have a blind spot.

Each surviving mutant is a concrete, reproducible example of a bug your suite would ship. That is the magic. Coverage tells you "this line ran." Mutation testing tells you "if this line were wrong, here is proof your tests would not catch it." The former is a comfort blanket; the latter is an audit.

The process is mechanical and exhaustive. Stryker generates dozens or hundreds of mutants per file, runs your tests against each, and tallies the results. A mutant can be killed, survive, or land in a few other buckets — timed out (the change caused an infinite loop, which counts as killed), or no-coverage (no test even executed that line, so it survived trivially). The output is your mutation score: the percentage of mutants your tests successfully killed.

## Why Code Coverage Lies

Here is the function at the heart of every "100% coverage means nothing" demonstration. It is correct, simple, and a perfect victim.

\`\`\`javascript
// isAdult.js
export function isAdult(age) {
  return age >= 18;
}
\`\`\`

Now a test that gives you 100% line coverage and 100% branch coverage:

\`\`\`javascript
// isAdult.test.js
import { describe, it, expect } from 'vitest';
import { isAdult } from './isAdult';

describe('isAdult', () => {
  it('returns true for an adult', () => {
    expect(isAdult(21)).toBe(true);
  });
});
\`\`\`

This test executes every line. Coverage tools report 100%. But watch what mutation testing reveals: Stryker will mutate \`age >= 18\` into \`age > 18\`. Under that mutant, \`isAdult(18)\` returns \`false\` instead of \`true\` — a real off-by-one bug. Does our test catch it? No. We only test \`isAdult(21)\`, which is \`true\` under both the original and the mutant. The mutant *survives*. Stryker also mutates \`>=\` into \`true\` (always adult) and \`false\` (never adult); our single test kills the \`false\` mutant but not the others.

The fix is to test the boundary, the exact value where the comparison matters:

\`\`\`javascript
it('treats exactly 18 as an adult', () => {
  expect(isAdult(18)).toBe(true);
});
it('treats 17 as not an adult', () => {
  expect(isAdult(17)).toBe(false);
});
\`\`\`

With these two boundary tests, the \`>\` mutant now fails (because \`isAdult(18)\` is checked), and the constant mutants die too. Coverage did not change — it was already 100%. Mutation score went from mediocre to strong. That gap between the two numbers is the entire value proposition. For broader context on building suites that actually catch regressions, see our [regression testing strategies guide](/blog/api-testing-complete-guide) and our overview of [AI test automation tools for 2026](/blog/ai-test-automation-tools-2026).

## Understanding the Mutation Score

The mutation score is a single percentage that summarizes how thorough your tests are. The formula is straightforward:

\`\`\`bash
# Mutation score formula
mutation_score = (killed_mutants / (total_mutants - no_coverage)) * 100

# Stryker also reports a stricter variant that punishes uncovered code:
mutation_score_total = (killed_mutants / total_mutants) * 100
\`\`\`

Stryker reports two numbers. The first, often called the "mutation score based on covered code," excludes mutants on lines no test runs. The second includes everything, so dead-code blind spots drag it down. The stricter total is the honest one to track, because "we never test this file" should hurt your score.

The table below maps score ranges to what they typically mean. These are pragmatic guideposts, not gospel — a payment processor should aim far higher than a prototype.

| Mutation score | Interpretation | Typical action |
|---|---|---|
| 90–100% | Excellent — tests assert behavior tightly | Maintain; guard with a CI threshold |
| 75–89% | Good — solid suite with minor gaps | Kill remaining survivors opportunistically |
| 60–74% | Mediocre — many assertions are weak | Schedule a hardening sprint |
| Below 60% | Poor — coverage is largely cosmetic | Treat as untested; prioritize critical paths |

Do not chase 100% blindly. Some surviving mutants are *equivalent* — they change the code in a way that produces identical behavior (for example, mutating \`i++\` to \`i += 1\`), so no test can ever kill them. These are noise, not gaps. The goal is a high score on meaningful mutants, with equivalent mutants explicitly ignored.

## Setting Up StrykerJS

Getting Stryker running takes about two minutes. The Stryker init command interrogates your project, detects your test runner, and writes a starter config. Install the core package plus the runner plugin for your framework.

\`\`\`bash
# Install Stryker core and the CLI
npm install --save-dev @stryker-mutator/core

# Add the runner plugin matching your test framework
npm install --save-dev @stryker-mutator/vitest-runner
# ...or for Jest:
npm install --save-dev @stryker-mutator/jest-runner

# Interactive setup that detects your config and writes stryker.conf.json
npx stryker init
\`\`\`

The init wizard asks which test runner you use, which reporters you want, and whether you use TypeScript. Accept the HTML reporter — it is the heart of the workflow — and you are ready to configure. If you prefer to skip the wizard, the next section gives you a config you can drop in directly.

## Configuring stryker.conf.json

The configuration file controls what gets mutated, which runner executes the tests, how results are reported, and what thresholds gate your build. Here is a production-ready \`stryker.conf.json\` for a TypeScript project using Vitest.

\`\`\`json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/**/index.ts"
  ],
  "thresholds": {
    "high": 85,
    "low": 70,
    "break": 60
  },
  "concurrency": 4,
  "timeoutMS": 10000
}
\`\`\`

Three settings deserve attention. \`coverageAnalysis: "perTest"\` is the single biggest performance lever — it tells Stryker which tests cover which mutants so it only runs the relevant tests per mutant instead of the whole suite. The \`mutate\` array uses negation patterns (\`!\`) to exclude test files, barrels, and anything you do not want scored. And \`thresholds.break\` is your CI gate: if the score drops below 60, Stryker exits non-zero and fails the build. Set \`break\` to a floor you can actually hold, then ratchet it up over time.

## The Mutators Stryker Applies

A mutator is a rule for how to break code. Stryker ships with a comprehensive default set covering arithmetic, comparison, logical, string, and statement-level changes. Understanding them helps you read surviving mutants and write tests that kill them. The table below lists the most impactful mutators with concrete examples.

| Mutator | Original | Mutated to | What it tests |
|---|---|---|---|
| Conditional boundary | \`a < b\` | \`a <= b\` | Off-by-one and boundary handling |
| Arithmetic operator | \`a + b\` | \`a - b\` | Correct math, not just any math |
| Logical operator | \`a && b\` | \`a || b\` | Real boolean logic, not luck |
| Equality operator | \`a === b\` | \`a !== b\` | Assertions check the actual value |
| Boolean literal | \`true\` | \`false\` | Branch outcomes are exercised |
| String literal | \`"ok"\` | \`""\` | Output strings are asserted |
| Return value | \`return x\` | \`return null\` | Callers verify what they receive |

When a boundary mutator survives, you are missing an edge-case test (like the \`isAdult(18)\` example). When a string-literal mutator survives, you are executing code whose output you never assert. Reading the surviving-mutant list is essentially a prioritized to-do list for hardening your tests. You can disable specific mutators in config if a category produces only equivalent noise for your codebase, but start with the defaults.

## Running Stryker and Reading the Report

Run Stryker with a single command. It instruments your code, generates mutants, runs the relevant tests against each, and writes an HTML report you open in a browser.

\`\`\`bash
# Run the full mutation test suite
npx stryker run

# Run against a single file while hardening tests (much faster)
npx stryker run --mutate "src/discount.ts"

# CI mode: machine-readable progress, fails the build if below break threshold
npx stryker run --reporters clear-text,progress
\`\`\`

The terminal gives you a summary score, but the HTML report is where the work happens. It shows your source with every mutant overlaid, color-coded: green for killed, red for survived. Click a surviving mutant and it shows you exactly what change went undetected — \`age >= 18\` became \`age > 18\` and no test failed. That is your assignment: write a test that would fail under that mutation.

The workflow is a loop. Run Stryker, open the report, find the highest-value red mutant (one on a critical path, not an equivalent-mutant edge case), write a test that kills it, rerun. Each iteration tightens a real gap. Unlike coverage, where you can game the number by executing code, you cannot game mutation score without writing assertions that genuinely constrain behavior.

## Integrating Stryker With Jest and Vitest

Stryker does not run tests itself — it delegates to your existing runner through a plugin. The integration is just installing the right plugin and naming it in config. For Vitest, the config we showed earlier already works. For Jest, switch the runner and ensure Jest config is discoverable.

\`\`\`json
{
  "testRunner": "jest",
  "jest": {
    "projectType": "custom",
    "configFile": "jest.config.js",
    "enableFindRelatedTests": true
  },
  "coverageAnalysis": "perTest",
  "concurrency": 4
}
\`\`\`

The \`enableFindRelatedTests\` flag lets Jest run only the tests related to a mutated file, which combined with \`coverageAnalysis: "perTest"\` keeps runs fast. Add a script so the whole team runs it the same way.

\`\`\`json
{
  "scripts": {
    "test": "vitest run",
    "test:mutation": "stryker run",
    "test:mutation:ci": "stryker run --reporters clear-text,progress"
  }
}
\`\`\`

With this in place, \`npm run test:mutation\` is the local command and \`npm run test:mutation:ci\` is what your pipeline calls. Both read the same \`stryker.conf.json\`, so behavior is consistent everywhere. Whether your team standardized on Jest or Vitest, the Stryker layer on top is nearly identical.

## Setting CI Thresholds Without Slowing the Pipeline

Mutation testing is slower than unit testing — it runs your suite many times — so naively running it on every commit will frustrate everyone. The pragmatic strategy is tiered: fast feedback locally, full runs on a schedule or on changed files in CI, and a \`break\` threshold that fails the build only on genuine regressions.

\`\`\`yaml
# .github/workflows/mutation.yml
name: Mutation Testing
on:
  pull_request:
    paths: ['src/**']
  schedule:
    - cron: '0 3 * * 1' # full run every Monday at 03:00 UTC

jobs:
  mutation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      # On PRs, only mutate files changed in the PR for speed
      - name: Mutation test changed files
        if: github.event_name == 'pull_request'
        run: npx stryker run --since main
      # Weekly full sweep enforces the break threshold across the whole codebase
      - name: Full mutation sweep
        if: github.event_name == 'schedule'
        run: npm run test:mutation:ci
\`\`\`

The \`--since main\` flag restricts mutation to files changed relative to the base branch, so PR runs stay quick while still guarding new code. The weekly cron does the expensive full sweep and enforces your \`break\` threshold globally. Set \`break\` to your current score minus a small buffer so it catches regressions without blocking on pre-existing debt, then raise it as you harden the suite.

## Performance Tips for Faster Mutation Runs

The number-one rule: enable \`coverageAnalysis: "perTest"\`. Without it, Stryker runs your entire suite for every single mutant — with it, Stryker runs only the tests that cover each mutant. On a real codebase this is the difference between minutes and hours. Beyond that, a handful of levers compound.

\`\`\`bash
# Tune concurrency to your CPU (default is half your cores)
npx stryker run --concurrency 8

# Mutate only what changed since the base branch
npx stryker run --since main

# Scope to a directory while hardening one module
npx stryker run --mutate "src/billing/**/*.ts"

# Use the incremental cache to skip unchanged mutants between runs
npx stryker run --incremental
\`\`\`

The \`--incremental\` flag persists results to a file so subsequent runs skip mutants whose code and tests have not changed — ideal for local iteration. Raising \`--concurrency\` to match your cores parallelizes the work. Scoping with \`--mutate\` and \`--since\` keeps you focused on the code that matters right now. Combined, these turn mutation testing from an overnight batch job into something you run in the loop while writing tests.

## Mutation Testing in Other Languages

The mutation-testing idea is language-agnostic; only the tooling changes. If your stack is not JavaScript, the same discipline applies with a different runner.

For .NET and C#, Stryker has a first-class sibger called Stryker.NET. It installs as a dotnet tool and mutates C# the same way StrykerJS mutates JavaScript.

\`\`\`bash
# Stryker.NET for C# projects
dotnet tool install -g dotnet-stryker
cd MyProject.Tests
dotnet stryker
\`\`\`

For Python, the most popular tool is mutmut. It mutates your source, runs your test command (pytest, typically), and reports survivors much like Stryker.

\`\`\`python
# Install and run mutmut against a Python package
# pip install mutmut
# mutmut run --paths-to-mutate=src/
#
# Then inspect survivors and show a specific mutant's diff:
# mutmut results
# mutmut show 7
\`\`\`

The mental model transfers completely: break the code, see if tests notice, kill the survivors. Whether you write JavaScript, TypeScript, C#, or Python, mutation testing is the audit that turns "we have tests" into "our tests would actually catch this." For Python projects specifically, pair mutmut with strong pytest fixtures, and for cross-stack API suites, the same boundary-testing discipline applies — see our [API testing complete guide](/blog/api-testing-complete-guide).

## Frequently Asked Questions

### What is mutation testing in simple terms?

Mutation testing deliberately introduces small bugs into your code — called mutants — and checks whether your tests fail. If a test fails, the mutant is killed, proving your tests would catch that bug. If all tests still pass, the mutant survived, exposing a gap. It measures whether your tests actually verify behavior, not just execute lines.

### How is mutation score different from code coverage?

Code coverage measures which lines your tests execute; mutation score measures whether your tests would fail if those lines were wrong. You can have 100% coverage with tests that assert nothing, giving a low mutation score. Mutation score is the more honest signal because you cannot raise it without writing assertions that genuinely constrain the code's behavior.

### Is StrykerJS slow, and how do I speed it up?

Mutation testing runs your suite many times, so it is slower than unit testing. The biggest speedup is \`coverageAnalysis: "perTest"\`, which runs only the tests covering each mutant. Also use \`--since main\` to mutate changed files, \`--incremental\` to cache results, and raise \`--concurrency\` to match your CPU cores. These turn long runs into quick, iterative loops.

### What is a good mutation score to aim for?

For most application code, 75–85% is solid and 90%+ is excellent. Critical paths like payments or authentication should target higher. Do not chase 100%, because some surviving mutants are equivalent — they do not change behavior, so no test can kill them. Set a CI break threshold at a floor you can hold and ratchet it up over time.

### Can Stryker work with Jest and Vitest?

Yes. Stryker does not run tests itself; it delegates to your existing runner through a plugin. Install \`@stryker-mutator/jest-runner\` or \`@stryker-mutator/vitest-runner\`, set \`testRunner\` in \`stryker.conf.json\`, and Stryker drives your real test suite. Enable \`coverageAnalysis: "perTest"\` and Jest's related-tests feature so runs stay fast.

### What should I do about surviving mutants?

Open the HTML report, find the highest-value red mutant on a critical path, and write a test that would fail under that exact mutation — often a missing boundary or an unasserted output. Rerun to confirm it is killed. Ignore equivalent mutants that cannot change behavior. The survivor list is effectively a prioritized to-do list for hardening tests.

### Does mutation testing exist for Python and C#?

Yes. For C# and .NET, Stryker.NET installs as a dotnet tool and mutates C# the same way StrykerJS handles JavaScript. For Python, mutmut mutates your source and runs your pytest suite, reporting survivors you can inspect with \`mutmut results\`. The discipline is identical across languages: break the code, see if tests notice, kill the survivors.

## Conclusion

Code coverage is a comfort blanket; mutation testing is an audit. By deliberately breaking your code and checking whether your tests notice, Stryker exposes the assertions that do not actually assert and the boundaries you never test. You have seen how to install StrykerJS, configure \`stryker.conf.json\`, read the HTML report, integrate with Jest and Vitest, gate CI with a break threshold, and keep runs fast with per-test coverage analysis and incremental caching — plus how the same discipline travels to C# with Stryker.NET and Python with mutmut.

The payoff is durable confidence. A high mutation score cannot be faked by executing code; it requires tests that genuinely constrain behavior. Start with one critical module, run Stryker, kill the highest-value survivors, and set a break threshold so the score can only go up. Your fully covered suite is about to start earning that coverage.

Want to level up the rest of your testing stack while you are at it? Explore the [qaskills directory](/skills) for ready-made testing patterns and read our [AI test automation tools guide for 2026](/blog/ai-test-automation-tools-2026) to see where mutation testing fits alongside the latest tooling.
`,
};
