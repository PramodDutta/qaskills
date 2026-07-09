---
name: Browser Agent QA Testing
description: Teach agents to use AI browser agents for exploratory and smoke QA with step budgets, evidence-based assertions, guardrails, and Playwright conversion.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [browser-agents, ai-qa, exploratory-testing, smoke-testing, playwright, guardrails]
testingTypes: [e2e, browser-automation]
frameworks: []
languages: [python, typescript]
domains: [web, ai]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Browser Agent QA Testing Skill

You are an AI QA engineer who uses browser agents for bounded exploratory and smoke testing, gathers evidence for every claim, and converts stable findings into maintainable Playwright tests.

## Core Principles

1. **Bound the agent**: Define scope, credentials, data rules, and a maximum step budget before the run starts.
2. **Require evidence**: A browser agent must cite visible UI state, URL, network result, screenshot, or DOM observation.
3. **Do not trust memory**: Validate each important state in the live browser.
4. **Protect data**: Use test accounts, safe environments, and non-destructive workflows.
5. **Prefer repeatable smoke paths**: Use agents for discovery, then freeze stable paths into code.
6. **Stop on uncertainty**: If the agent cannot verify a result, it should report uncertainty instead of guessing.
7. **Log decisions**: Record why a path was explored, skipped, or converted to automation.
8. **Avoid infinite browsing**: Step budgets and charters keep exploration useful.

## Setup

Create a small harness for browser-agent QA runs.

```bash
python -m venv .venv
. .venv/bin/activate
pip install browser-use playwright pydantic python-dotenv
playwright install chromium
npm install --save-dev @playwright/test
```

Store run configuration outside prompts.

```text
qa-agent/
  charters/
    checkout-smoke.md
    account-settings.md
  evidence/
    screenshots/
    notes/
  scripts/
    run_browser_agent.py
tests/
  e2e/
    frozen-smoke.spec.ts
```

## Charter Template

Every agent run needs a charter.

```markdown
# Charter: Checkout Smoke

Goal: Verify a signed-in user can add one item to the cart and reach the payment step.
Environment: Staging
Account: Synthetic buyer
Step budget: 35
Allowed actions: Browse catalog, add item, open cart, start checkout
Forbidden actions: Submit real payment, change account email, delete saved addresses
Evidence required: Final URL, visible checkout heading, screenshot, console errors
Stop condition: Payment form is visible or a blocking bug is found
```

## Python Agent Runner

Keep the browser-agent task explicit and bounded.

```python
# qa-agent/scripts/run_browser_agent.py
import asyncio
from browser_use import Agent
from dotenv import load_dotenv

load_dotenv()

TASK = """
You are testing the checkout smoke charter.
Use the staging site only.
Do not submit payment.
Stop after 35 browser actions.
For every assertion, mention the exact visible text, URL, or screenshot evidence.
If blocked, report the blocker and stop.
"""

async def main() -> None:
    agent = Agent(task=TASK)
    result = await agent.run(max_steps=35)
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

## Freeze to Playwright

Convert a stable exploratory path into deterministic automation.

```typescript
// tests/e2e/checkout-smoke.spec.ts
import { expect, test } from '@playwright/test';

test('signed-in buyer can reach payment step', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.SMOKE_USER || 'buyer@example.com');
  await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD || 'change-me');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByRole('link', { name: 'Catalog' }).click();
  await page.getByRole('button', { name: /add to cart/i }).first().click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  await expect(page).toHaveURL(/checkout/);
  await expect(page.getByRole('heading', { name: /payment/i })).toBeVisible();
});
```

## Evidence Rules

The browser agent report must include these fields.

1. Charter name.
2. Environment URL.
3. Account type.
4. Step count used.
5. Final URL.
6. Assertions with evidence.
7. Screenshots or trace links.
8. Console or network errors.
9. Bugs found.
10. Paths not covered.
11. Recommendation to automate or not automate.

## Guardrail Policy

Use guardrails to keep agent runs safe.

| Guardrail | Reason | Example |
|---|---|---|
| Step budget | Prevent wandering | Stop at 35 actions |
| Test account | Avoid customer data | Synthetic buyer |
| Forbidden actions | Prevent damage | Do not submit payment |
| Evidence rule | Reduce hallucination | Cite visible text |
| Freeze criteria | Create durable tests | Convert stable smoke path |
| Human review | Catch weak claims | Review notes before filing bugs |

## Common Mistakes

1. Asking an agent to test the whole site with no scope.
2. Accepting conclusions without screenshots or visible evidence.
3. Letting the agent use production customer data.
4. Repeating exploratory runs instead of freezing stable paths.
5. Filing bugs without reproduction steps.
6. Treating browser agents as a replacement for regression suites.
7. Using vague prompts like check if it works.
8. Forgetting forbidden actions.
9. Ignoring console and network errors.
10. Running without a stop condition.

## Checklist

- [ ] The run has a written charter.
- [ ] Environment and account are safe.
- [ ] Step budget is defined.
- [ ] Forbidden actions are explicit.
- [ ] Claims include visible evidence.
- [ ] Screenshots or traces are saved.
- [ ] Bugs include reproduction steps.
- [ ] Stable smoke paths are converted to Playwright.
- [ ] Unstable paths remain exploratory notes.
- [ ] Human review happens before release decisions.
