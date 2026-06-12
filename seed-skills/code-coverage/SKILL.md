---
name: Code Coverage Analysis
description: Measure and enforce test coverage with Istanbul/nyc, c8, Jest, and Vitest. Covers branch versus line coverage, per-directory thresholds, CI gates, and correctly excluding generated code from reports.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [coverage, istanbul, nyc, c8, jest, vitest, thresholds, ci, code-quality, lcov]
testingTypes: [unit, code-quality]
frameworks: [jest, vitest]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Code Coverage Analysis

This skill makes an AI agent configure coverage collection correctly (Istanbul instrumentation or V8 native coverage), set thresholds that fail builds, read coverage reports to find genuinely untested branches, and exclude generated or config code so the numbers mean something. Trigger it when a user asks "what is our coverage", wants a coverage gate in CI, or when a `coverage/` directory, `--coverage` flag, `.nycrc`, or `coverageThreshold` appears in the project.

## Core Principles

1. **Branch coverage is the number that matters.** Line coverage marks a line as hit even if only one of its outcomes ran. A guard clause `if (a && b) return x;` can be 100 percent line-covered with three of its four branch outcomes untested.
2. **Coverage is a gap detector, not a quality score.** 95 percent coverage with assertion-free tests proves nothing. Use coverage to find untested code paths; use mutation testing to check assertion strength.
3. **Thresholds must fail the build.** A coverage report nobody reads is decoration. Wire `coverageThreshold` (Jest), `thresholds` (Vitest), or `--check-coverage` (nyc/c8) so CI goes red on regression.
4. **Set thresholds at current reality, then ratchet.** Dropping a 90 percent global gate onto a 60 percent codebase makes the team delete the gate. Start at today's number minus 1, raise it as coverage improves.
5. **Measure `all` files, not just imported ones.** By default some tools only report files touched by tests, so a completely untested module is invisible. Enable `all: true` (nyc), `coverage.all` (Vitest), or a broad `collectCoverageFrom` (Jest).
6. **Exclude generated code explicitly.** Protobuf stubs, GraphQL codegen, migrations, and `*.d.ts` inflate or deflate numbers randomly. Exclude them in config, never by sprinkling ignore comments through generated files.

## Setup and Patterns

### 1. Jest: collection, thresholds, and per-directory gates

```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__generated__/**',
    '!src/**/*.stories.tsx',
    '!src/test-utils/**',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
    // Money-handling code gets a stricter gate
    './src/lib/payments/': {
      branches: 95,
      lines: 98,
    },
  },
};
```

```bash
npx jest --coverage --ci
# Exit code is 1 if any threshold is missed; CI fails automatically
```

### 2. nyc (Istanbul) for Mocha or plain Node scripts

```json
{
  "all": true,
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts", "src/generated/**", "src/migrations/**"],
  "reporter": ["text", "html", "lcov"],
  "check-coverage": true,
  "branches": 80,
  "lines": 90,
  "functions": 85,
  "statements": 90
}
```

Save as `.nycrc.json`, then:

```bash
npm install --save-dev nyc
npx nyc mocha 'test/**/*.spec.ts'
npx nyc report --reporter=text-summary
```

### 3. c8: native V8 coverage with zero instrumentation

c8 reads V8's built-in coverage, so it works with the Node test runner and needs no transpile-time instrumentation:

```bash
npm install --save-dev c8
npx c8 --all --src src --reporter=text --reporter=lcov \
  --lines 90 --branches 80 --check-coverage \
  node --test test/
```

### 4. Vitest: built-in V8 coverage with thresholds

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.test.ts', '**/*.config.ts'],
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines: 90,
        branches: 80,
        functions: 85,
        statements: 90,
        // Fail if coverage DROPS below auto-updated values
        autoUpdate: false,
      },
    },
  },
});
```

```bash
npx vitest run --coverage
```

### 5. Branch versus line coverage, concretely

```ts
// shipping.ts
export function shippingCost(country: string, total: number): number {
  if (country === 'US' && total > 50) return 0;
  return country === 'US' ? 5 : 15;
}

// shipping.test.ts -- this single test yields 100% LINE coverage
import { shippingCost } from './shipping';

it('ships free for large US orders', () => {
  expect(shippingCost('US', 100)).toBe(0);
});
// But branch coverage shows: total <= 50 untested, non-US untested,
// the $5 domestic path untested. Three real behaviors have no test.
```

The branch report (`text` reporter prints `% Branch` per file, the HTML report highlights yellow `I`/`E` markers) is how you find these.

### 6. Ignoring unreachable code the honest way

```ts
// Istanbul-instrumented runners (nyc, babel-plugin-istanbul)
/* istanbul ignore next -- @preserve defensive guard, unreachable after zod validation */
if (typeof input !== 'string') throw new TypeError('input must be a string');

// V8-based runners (vitest --coverage.provider=v8, c8)
/* v8 ignore next 2 */
if (process.platform === 'win32') {
  pathSeparator = '\\';
}
```

Every ignore comment needs a reason suffix; an ignore without a justification is a coverage lie waiting to rot.

### 7. CI gate plus PR summary

```yaml
# .github/workflows/test.yml (excerpt)
- name: Test with coverage gate
  run: npx vitest run --coverage

- name: Print coverage summary to job log
  if: always()
  run: |
    pct_lines=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
    pct_branches=$(jq -r '.total.branches.pct' coverage/coverage-summary.json)
    echo "### Coverage: ${pct_lines}% lines / ${pct_branches}% branches" >> "$GITHUB_STEP_SUMMARY"

- name: Upload lcov for review tooling
  uses: actions/upload-artifact@v4
  with:
    name: lcov-report
    path: coverage/lcov.info
```

## Best Practices

- Review the HTML report (`coverage/index.html`) when writing tests for legacy code; the red/yellow highlighting finds untested branches faster than reading source.
- Track coverage trends per package in a monorepo rather than one blended global number that averages away problems.
- Gate on `json-summary` totals for speed, keep `lcov` output for editors and review tools that show per-line coverage in diffs.
- Prefer the V8 provider for TypeScript projects; Istanbul instrumentation of transpiled output can misattribute branches to source maps.
- Delete dead code instead of ignoring it; an `istanbul ignore` on reachable code is technical debt with a receipt.
- For bug fixes, check the coverage diff: the fixed lines must be covered by the new regression test.

## Anti-Patterns

- Chasing 100 percent: the last few points usually buy tests for getters and logging branches while real risk lives in untested integration seams.
- Writing tests that execute code without asserting anything, purely to move the number. Mutation testing will expose these instantly.
- Excluding files from coverage because they are "hard to test" - that is the highest-risk code in the repository.
- A global threshold so low (40 percent) that it never fires; gates that cannot fail teach the team to ignore them.
- Measuring coverage only on unit tests when most behavior is exercised by integration tests; merge reports (`nyc merge`, `--coverage.reportsDirectory` per suite plus `lcov` merge) before judging.
- Letting `coverage/` get committed; add it to `.gitignore`.

## When to Trigger This Skill

- The user asks "what is our test coverage", "add a coverage gate", "why is coverage dropping", or "enforce 80 percent coverage".
- A PR adds `--coverage`, `coverageThreshold`, `.nycrc`, `c8`, or `@vitest/coverage-v8` to the project.
- CI needs a quality gate tied to lines/branches/functions, or thresholds need ratcheting after a coverage push.
- Generated code (GraphQL codegen, protobuf, ORM migrations) is skewing the numbers and needs principled exclusion.
- Pair it with mutation testing when the user suspects high coverage numbers but weak assertions.
