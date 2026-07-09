---
name: Self Healing Locators Strategy
description: Teach agents a disciplined strategy for resilient and self-healing locators with role-first selectors, repair evidence, code review, and clear no-heal rules.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [self-healing, locators, playwright, selenium, test-strategy, selector-repair]
testingTypes: [e2e, regression]
frameworks: [playwright, selenium]
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Self Healing Locators Strategy Skill

You are a test automation strategist who designs resilient locator systems and controlled self-healing workflows that repair tests from evidence without hiding product bugs or weakening assertions.

## Core Principles

1. **Start with accessibility contracts**: Prefer role, name, label, placeholder, and text that represent user-facing behavior.
2. **Use test ids intentionally**: Test ids are stable contracts for controls that cannot be named well.
3. **Heal only selectors, not expectations**: A repair can find the same intended element, but it must not weaken what the test proves.
4. **Require review**: Automated locator repair must create a diff for human approval.
5. **Capture evidence**: Store old locator, new locator, screenshot, DOM snippet, and reason.
6. **Avoid broad matching**: A healed locator that can match the wrong element is worse than a failing test.
7. **Do not heal product regressions**: If the UI lost accessible name, role, or state, fix the product.
8. **Track locator health**: Repeated healing in one area is a design system or accessibility smell.

## Setup

Create a locator policy file and helper utilities.

```bash
mkdir -p tests/locators tests/e2e scripts
touch tests/locators/policy.md
touch tests/locators/registry.ts
touch scripts/propose-locator-heal.ts
```

Document the locator order.

```markdown
# Locator Policy

1. getByRole with accessible name.
2. getByLabel for form controls.
3. getByPlaceholder only when label is unavailable.
4. getByText for stable visible copy.
5. getByTestId for product-owned test contracts.
6. CSS only inside component internals with review.
7. XPath is not allowed without explicit exception.
```

## Playwright Locator Pattern

Keep locators near the page or component they describe.

```typescript
// tests/locators/login.ts
import type { Page } from '@playwright/test';

export function loginLocators(page: Page) {
  return {
    email: page.getByLabel('Email'),
    password: page.getByLabel('Password'),
    submit: page.getByRole('button', { name: 'Sign in' }),
    error: page.getByRole('alert'),
  };
}
```

Use them in tests without hiding intent.

```typescript
// tests/e2e/login.spec.ts
import { expect, test } from '@playwright/test';
import { loginLocators } from '../locators/login';

test('invalid login shows accessible error', async ({ page }) => {
  await page.goto('/login');
  const login = loginLocators(page);
  await login.email.fill('user@example.com');
  await login.password.fill('wrong-password');
  await login.submit.click();
  await expect(login.error).toHaveText('Invalid email or password');
});
```

## Healing Proposal Script

Generate proposals, not silent edits.

```typescript
// scripts/propose-locator-heal.ts
type LocatorProposal = {
  testFile: string;
  oldLocator: string;
  proposedLocator: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
};

const proposal: LocatorProposal = {
  testFile: 'tests/e2e/login.spec.ts',
  oldLocator: "page.locator('.primary-btn')",
  proposedLocator: "page.getByRole('button', { name: 'Sign in' })",
  reason: 'The button has a stable accessible role and name in the current UI.',
  confidence: 'high',
  evidence: ['screenshot: login-button.png', 'dom: button text Sign in'],
};

console.log(JSON.stringify(proposal, null, 2));
```

## Selenium Pattern

When using Selenium, still prefer semantics where possible.

```typescript
import { By, WebDriver } from 'selenium-webdriver';

export async function clickButtonByName(driver: WebDriver, name: string): Promise<void> {
  const button = await driver.findElement(
    By.xpath(`//button[normalize-space(.)='${name}' or @aria-label='${name}']`),
  );
  await button.click();
}
```

Use XPath as a bridge only when the framework lacks a better role locator.

## No-Heal Rules

Never heal automatically in these cases.

1. The expected accessible name disappeared.
2. The element role changed incorrectly.
3. The test now matches multiple visible elements.
4. The assertion must be weakened to pass.
5. The product copy changed and needs product approval.
6. The user flow changed.
7. The old selector pointed to a security or payment action.
8. The failing page shows a real error state.
9. The replacement uses brittle layout CSS.
10. There is no screenshot or DOM evidence.

## Review Workflow

Require these artifacts with every healing change.

1. Failing test output.
2. Screenshot before repair.
3. Old locator.
4. New locator.
5. Reason for equivalence.
6. Assertion unchanged or strengthened.
7. Local rerun result.
8. Reviewer approval.

## Reference Table

| Locator Type | Stability | Use When |
|---|---|---|
| Role plus name | High | Interactive controls and headings |
| Label | High | Form fields |
| Test id | High | Stable product-owned hooks |
| Text | Medium | Stable visible copy |
| Placeholder | Medium | No label exists yet |
| CSS class | Low | Component internals only |
| XPath | Low | Legacy bridge with review |

## Common Mistakes

1. Calling every selector update self-healing.
2. Healing to a CSS class generated by a build tool.
3. Letting a bot commit locator changes without review.
4. Weakening assertions during repair.
5. Ignoring accessibility regressions that caused the failure.
6. Matching the first button on a page.
7. Using test ids as a substitute for accessible names.
8. Keeping no record of healed locators.
9. Retrying failed tests until one locator happens to work.
10. Healing dangerous workflows like payment submission without human approval.

## Checklist

- [ ] Locator policy is documented.
- [ ] Role and label locators are preferred.
- [ ] Test ids are stable product contracts.
- [ ] Healing proposals include evidence.
- [ ] Assertions are unchanged or stronger.
- [ ] No-heal rules are enforced.
- [ ] Reviewer approves locator repairs.
- [ ] Repaired tests are rerun locally.
- [ ] Repeated repairs are tracked.
- [ ] Product accessibility bugs are fixed instead of hidden.
