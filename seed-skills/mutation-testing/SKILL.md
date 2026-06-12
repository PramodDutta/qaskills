---
name: Mutation Testing
description: Run mutation testing with StrykerJS for TypeScript/JavaScript and mutmut for Python to measure whether your test suite actually catches bugs, enforce mutation score thresholds, and keep runs fast with incremental mode in CI.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [mutation-testing, stryker, mutmut, test-quality, coverage, code-quality, ci, jest, vitest, pytest]
testingTypes: [unit, code-quality]
frameworks: [jest, vitest, pytest]
languages: [typescript, javascript, python]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Mutation Testing

This skill makes an AI agent set up and interpret mutation testing: StrykerJS for JS/TS projects (Jest or Vitest runners) and mutmut for Python. Mutation testing injects small bugs (mutants) into source code and re-runs the tests — if the tests still pass, the mutant "survived" and your suite has a blind spot that line coverage never showed. Trigger this when a team claims high coverage but still ships regressions, when reviewing test suite quality, or when the user mentions Stryker, mutmut, or mutation score.

## Core Principles

1. **Line coverage measures execution, mutation score measures verification.** A test that calls a function and asserts nothing gives 100% line coverage and a 0% mutation score. Mutation score is the honest metric.
2. **Never mutate everything on every run.** A full mutation run on a real codebase takes hours. Use incremental mode locally and scope CI runs to changed files. Full runs belong in nightly jobs.
3. **A surviving mutant is either a missing assertion or dead code.** Both are findings. If you cannot write a test that kills a mutant, the mutated code path is unreachable — delete it instead of suppressing the mutant.
4. **Set `break` thresholds, not aspirational targets.** Start at your current score minus 2, fail the build below it, and ratchet up monthly. A threshold nobody enforces is documentation fiction.
5. **Equivalent mutants exist; budget for them.** Some mutations (e.g., `i < len` to `i <= len` on an array that is never exactly full) produce identical behavior. Mark them ignored explicitly rather than chasing 100%.
6. **Kill mutants with stronger assertions, not more tests.** The fix for a survived `>` → `>=` mutant is usually one boundary-value assertion in an existing test, not a new test file.

## Setup: StrykerJS (TypeScript + Vitest)

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init
```

```json
// stryker.config.json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts", "!src/generated/**"],
  "coverageAnalysis": "perTest",
  "reporters": ["html", "clear-text", "progress", "json"],
  "thresholds": { "high": 85, "low": 70, "break": 65 },
  "incremental": true,
  "incrementalFile": ".stryker-tmp/incremental.json",
  "timeoutMS": 10000,
  "concurrency": 4
}
```

For Jest projects swap the runner:

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
```

```json
// stryker.config.json (Jest variant)
{
  "testRunner": "jest",
  "jest": { "projectType": "custom", "configFile": "jest.config.js" },
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"],
  "thresholds": { "high": 85, "low": 70, "break": 65 }
}
```

Run it:

```bash
npx stryker run                          # full run, writes reports/mutation/mutation.html
npx stryker run --mutate src/pricing.ts  # scope to one file while fixing survivors
```

## Reading a Survived Mutant and Killing It

Stryker output:

```text
[Survived] ArithmeticOperator
src/pricing.ts:14:31
-   return subtotal * (1 - discountRate);
+   return subtotal / (1 - discountRate);
Ran 3 tests, none failed.
```

The suite never asserts a discounted price with a nonzero rate. Kill it with a boundary assertion:

```typescript
// src/pricing.test.ts
import { describe, expect, it } from 'vitest';
import { applyDiscount } from './pricing';

describe('applyDiscount', () => {
  it('multiplies subtotal by the inverse discount rate', () => {
    // 200 * (1 - 0.25) = 150; the division mutant would return 266.67
    expect(applyDiscount(200, 0.25)).toBe(150);
  });

  it('returns the subtotal unchanged at rate 0', () => {
    expect(applyDiscount(99.5, 0)).toBe(99.5);
  });
});
```

Ignore a genuinely equivalent mutant inline instead of lowering the threshold:

```typescript
// Stryker disable next-line EqualityOperator: loop bound is equivalent for empty input
for (let i = 0; i < items.length; i++) {
```

## Setup: mutmut (Python + pytest)

```bash
pip install mutmut pytest
```

```toml
# pyproject.toml
[tool.mutmut]
paths_to_mutate = ["src/"]
tests_dir = ["tests/"]
also_copy = ["conftest.py"]
```

```bash
mutmut run                 # mutates src/, runs pytest per mutant, caches results
mutmut results             # summary: killed / survived / timeout / suspicious
mutmut show src.pricing.apply_discount__mutmut_3   # diff of one survivor
mutmut run --max-children 4                        # parallel workers
```

Killing a Python survivor follows the same pattern — the mutant tells you the missing assertion:

```python
# tests/test_pricing.py
import pytest
from src.pricing import apply_discount


def test_apply_discount_uses_multiplication():
    # mutant changed * to /; 200 * 0.75 == 150, 200 / 0.75 == 266.67
    assert apply_discount(200, 0.25) == 150


def test_apply_discount_rejects_rate_above_one():
    # kills the mutant that removed the validation guard
    with pytest.raises(ValueError):
        apply_discount(100, 1.5)
```

## CI Integration

Incremental Stryker on pull requests, full run nightly:

```yaml
# .github/workflows/mutation.yml
name: mutation
on:
  pull_request:
    paths: ['src/**', 'stryker.config.json']
  schedule:
    - cron: '0 2 * * *'

jobs:
  stryker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # incremental mode diffs against git history
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Restore incremental cache
        uses: actions/cache@v4
        with:
          path: .stryker-tmp/incremental.json
          key: stryker-incremental-${{ github.base_ref || 'main' }}
      - name: Mutation test (incremental on PRs, full nightly)
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            npx stryker run --incremental
          else
            npx stryker run --force
          fi
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: mutation-report
          path: reports/mutation/mutation.html
```

The `thresholds.break: 65` in config makes `stryker run` exit non-zero below 65% — no extra scripting needed.

## Best Practices

- Start mutation testing on your most critical module (pricing, auth, parsers), not the whole repo. One high-signal report beats a week-long full run.
- Use `coverageAnalysis: "perTest"` — Stryker then only runs the tests that cover each mutant, often a 10x speedup.
- Commit `.stryker-tmp/incremental.json` to CI cache, never to git.
- Track mutation score per module in the JSON report; aggregate scores hide a 30% module behind a 90% repo average.
- Set `timeoutMS` explicitly. Mutants that create infinite loops are killed by timeout; the default factor-based timeout misbehaves on very fast suites.
- In Python, run `mutmut run` against a single module first: `paths_to_mutate = ["src/billing.py"]`.

## Anti-Patterns

- **Chasing 100% mutation score.** Past ~90% you are writing tests for equivalent mutants. Mark them ignored with a reason and move on.
- **Running full mutation on every PR.** It will take 40+ minutes and the team will delete the workflow within a month. Incremental on PRs, full nightly.
- **Treating "survived" as a Stryker bug.** Over years of use, genuine false positives are rare; assume your suite is the problem first.
- **Mutating test files or generated code.** Always exclude `*.test.ts`, `*.spec.ts`, migrations, and codegen output in `mutate` globs.
- **Lowering `break` to make a red build green.** The threshold ratchets up, never down; fix the survivors or explicitly ignore equivalents inline.
- **Writing assertion-free "kill tests"** that snapshot huge objects just to kill mutants. A surviving mutant deserves a precise boundary assertion, not a snapshot blanket.

## When to Trigger This Skill

- The user mentions Stryker, mutmut, mutation score, or "are my tests actually good".
- A project has high line coverage but recurring production regressions in covered code.
- Reviewing or hardening a test suite for a critical module (payments, auth, data migration).
- Setting up CI quality gates beyond line coverage thresholds.
- A `stryker.config.json`, `stryker.conf.mjs`, or `[tool.mutmut]` section already exists in the repo.
