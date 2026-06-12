---
name: ESLint for Test Quality
description: Enforce test quality with ESLint - eslint-plugin-jest, eslint-plugin-playwright, and eslint-plugin-testing-library rules in flat config, blocking focused tests, missing assertions, and flaky waits via a CI lint gate.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [eslint, lint, test-quality, jest, playwright, testing-library, flat-config, ci, code-quality]
testingTypes: [code-quality]
frameworks: [jest, playwright, vitest]
languages: [javascript, typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# ESLint for Test Quality

This skill makes an AI agent wire ESLint plugins that lint the tests themselves - catching focused tests that silently skip entire suites in CI, assertion-free tests, conditional expects, and flaky `waitForTimeout` calls before they merge. Trigger it when a project has test files but no test-specific lint rules, when an `it.only` ever reaches main, or when the user asks to "lint tests", "block .only", or "enforce testing best practices".

## Core Principles

1. **A committed `.only` is a silent CI outage.** `it.only` makes every other test in the file stop running while the build stays green. `no-focused-tests` set to `error` is the single highest-value test lint rule; it is non-negotiable.
2. **Tests without assertions must fail the lint.** A test that calls code and asserts nothing passes forever. `expect-expect` (Jest/Playwright) turns these into lint errors and accepts custom assertion wrappers via configuration.
3. **Lint rules encode review comments you are tired of writing.** "Do not put expects in conditionals", "use userEvent not fireEvent", "no waitForTimeout" - each has a rule; automate the comment.
4. **Scope test rules to test files only.** Apply plugin configs with `files: ['**/*.test.ts']` globs in flat config so production code is not subjected to test rules and vice versa.
5. **Warnings are noise; errors are gates.** CI must run with `--max-warnings 0` or set every rule you care about to `error`. A warning that scrolls by in CI logs changes nothing.
6. **Adopt recommended configs first, then tighten.** Start from `flat/recommended` for each plugin, then promote the high-signal rules (`no-conditional-expect`, `no-standalone-expect`, `prefer-user-event`) to error as the suite cleans up.

## Setup

```bash
npm install --save-dev eslint eslint-plugin-jest eslint-plugin-testing-library \
  eslint-plugin-jest-dom eslint-plugin-playwright
```

### Flat config with per-suite scoping

```js
// eslint.config.js
import jest from 'eslint-plugin-jest';
import testingLibrary from 'eslint-plugin-testing-library';
import jestDom from 'eslint-plugin-jest-dom';
import playwright from 'eslint-plugin-playwright';

export default [
  // Unit and component tests (Jest + Testing Library)
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    plugins: { jest, 'testing-library': testingLibrary, 'jest-dom': jestDom },
    languageOptions: { globals: jest.environments.globals.globals },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      ...testingLibrary.configs['flat/react'].rules,
      ...jestDom.configs['flat/recommended'].rules,
      'jest/no-focused-tests': 'error',
      'jest/no-disabled-tests': 'warn',
      'jest/no-conditional-expect': 'error',
      'jest/no-standalone-expect': 'error',
      'jest/valid-title': 'error',
      'jest/prefer-hooks-on-top': 'error',
      'jest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'expectTypeOf', 'assertOrderShape'] },
      ],
      'testing-library/prefer-user-event': 'error',
      'testing-library/no-wait-for-side-effects': 'error',
      'testing-library/no-manual-cleanup': 'error',
    },
  },
  // Playwright E2E specs
  {
    files: ['e2e/**/*.spec.ts'],
    plugins: { playwright },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-force-option': 'error',
      'playwright/expect-expect': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/prefer-web-first-assertions': 'error',
    },
  },
];
```

## Patterns

### 1. What the rules actually catch

```ts
// e2e/checkout.spec.ts - every line below is a lint ERROR with the config above

test.only('applies a coupon', async ({ page }) => {
  // playwright/no-focused-test: the other 84 specs in this project
  // would silently not run in CI while the build stays green.
});

test('waits for the cart to update', async ({ page }) => {
  await page.waitForTimeout(3000); // playwright/no-wait-for-timeout: flaky AND slow
  await page.click('#checkout', { force: true }); // playwright/no-force-option: bypasses actionability
});

test('shows totals', async ({ page }) => {
  const rows = await page.locator('.row').count();
  if (rows > 0) {
    expect(rows).toBeGreaterThan(0); // playwright/no-conditional-in-test
  }
  // playwright/expect-expect also fires if no assertion is reachable
});
```

```tsx
// src/components/CouponForm.test.tsx - Jest + Testing Library violations

it('test 1', async () => {
  // jest/valid-title: meaningless title
  render(<CouponForm />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SAVE10' } });
  // testing-library/prefer-user-event: fireEvent skips focus/keyboard semantics
});

it('submits the coupon', async () => {
  try {
    await submitCoupon('SAVE10');
    expect(api.apply).toHaveBeenCalled();
  } catch {
    expect(true).toBe(false); // jest/no-conditional-expect: may never run
  }
});
```

### 2. Teaching expect-expect about custom assertion helpers

```ts
// tests/helpers/assert-order-shape.ts
import { expect } from 'vitest';

// Custom assertion helper used across suites
export function assertOrderShape(order: unknown): void {
  expect(order).toMatchObject({
    id: expect.stringMatching(/^ord_/),
    total: expect.any(Number),
    items: expect.arrayContaining([expect.objectContaining({ sku: expect.any(String) })]),
  });
}
// Registered above via expect-expect assertFunctionNames so tests
// that only call assertOrderShape(...) do not trip the rule.
```

### 3. CI lint gate that blocks merges

```yaml
# .github/workflows/lint.yml
name: lint
on: [pull_request]

jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Lint (zero warnings allowed)
        run: npx eslint . --max-warnings 0
```

### 4. Pre-commit guard for the fast feedback loop

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
{
  "lint-staged": {
    "*.{ts,tsx,js}": ["eslint --fix --max-warnings 0"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

## Best Practices

- Run `eslint --fix` first when adopting rules on an existing suite; many testing-library rules (such as query preferences) auto-fix.
- Pair `jest/no-disabled-tests` as `warn` with a tracking convention: every `it.skip` requires a linked ticket in a comment.
- Add `playwright/no-networkidle` and `prefer-web-first-assertions` early; they remove the two most common Playwright flake sources.
- For Vitest projects, use `eslint-plugin-vitest` (largely rule-compatible with eslint-plugin-jest) and the same scoping strategy.
- Keep the lint job separate from the test job in CI so a lint failure reports in seconds, not after a 10-minute test run.
- Re-run `npx eslint . --max-warnings 0` locally before pushing; the gate exists to be unreachable, not to be hit.

## Anti-Patterns

- Putting test rules in the global config so production files get flagged for "missing expect" and developers disable the plugin entirely.
- Setting `no-focused-tests` to `warn`: the one severity that cannot stop the exact accident the rule exists for.
- Blanket `// eslint-disable-next-line` comments without a reason; require `--report-unused-disable-directives` (or `linterOptions.reportUnusedDisableDirectives`) to keep disables honest.
- Linting only changed files in CI while the repository still contains `.only` from last month - run the full lint, it is cheap.
- Treating the lint gate as optional ("we will fix warnings later"): later never arrives; gate at zero from day one on new projects.
- Writing a custom rule for something `eslint-plugin-jest` already ships; check the plugin's rule list first.

## When to Trigger This Skill

- A repository has Jest, Vitest, Playwright, or Testing Library tests but `eslint.config.js` contains no test-specific plugins.
- An `it.only`, `test.only`, or `fdescribe` was found on the main branch, or CI passed while most tests silently did not run.
- The user asks to "lint tests", "ban waitForTimeout", "enforce userEvent", "block focused tests", or "add a lint gate to CI".
- Migrating from `.eslintrc` to flat config and the test-file overrides need translating into `files`-scoped config objects.
- Code review keeps repeating the same test-hygiene comments; convert each into the matching rule and let the linter say it.
