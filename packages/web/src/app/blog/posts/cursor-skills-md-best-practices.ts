import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cursor SKILL.md Best Practices 2026',
  description:
    'Best practices for authoring SKILL.md files for Cursor. Frontmatter, content structure, examples, tag taxonomy, agent compatibility, and patterns that produce consistent QA test generation in 2026.',
  date: '2026-05-20',
  category: 'Reference',
  content: `
# Cursor SKILL.md Best Practices 2026

SKILL.md files are the unit of reusable AI knowledge in the QASkills ecosystem. Originally designed for Claude Code, the format has been adopted by Cursor, Continue.dev, Aider, Windsurf, and other AI agents in 2026. A well-written SKILL.md teaches an AI agent your team's conventions once and gets applied to every test the AI generates -- naming, structure, framework choice, assertion style, fixture location, the works.

This reference covers everything you need to author production-grade SKILL.md files: YAML frontmatter, content structure, example blocks, tag taxonomy, agent compatibility, versioning, and the patterns that produce consistent results across hundreds of generated tests. We focus on Cursor-specific behavior but the patterns transfer to Claude Code and other agents.

By the end you will have a complete playbook for writing SKILL.md files that produce predictable, high-quality output from any modern AI agent.

## Key Takeaways

- **SKILL.md = YAML frontmatter + markdown body**.
- **Frontmatter declares metadata** (name, version, frameworks, agents).
- **Body is what the AI reads** to apply conventions.
- **Examples beat instructions** -- show, don't tell.
- **Tag taxonomy enables discovery** at QASkills.sh.

---

## 1. Anatomy of a SKILL.md

\`\`\`markdown
---
name: playwright-page-objects
version: 1.3.0
description: Playwright Page Object Model conventions for TypeScript projects
author: qaskills.sh
license: MIT
testingTypes: [e2e]
frameworks: [playwright]
languages: [typescript]
domains: [web]
agents: [claude, cursor, continue, windsurf]
tags: [page-objects, playwright, typescript, e2e]
---

# Playwright Page Object Conventions

When generating Playwright tests or page objects for this project, follow these rules.

## File Locations
- Page objects: src/pages/<PageName>Page.ts
- Component objects: src/components/<ComponentName>Component.ts
- All page objects extend BasePage in src/pages/BasePage.ts

## Selectors
- Prefer getByRole, getByLabel, getByTestId
- Never use CSS selectors unless an id or test-id is unavailable
- Never use xpath

## Method Naming
- gotoX for navigation
- fillX for inputs
- clickX for buttons
- getX for state queries

## Example

\\\`\\\`\\\`typescript
import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class CheckoutPage extends BasePage {
  readonly cardNumber: Locator
  readonly expiry: Locator
  readonly cvv: Locator
  readonly confirmButton: Locator

  constructor(page: Page) {
    super(page)
    this.cardNumber = page.getByLabel('Card number')
    this.expiry = page.getByLabel('Expiry')
    this.cvv = page.getByLabel('CVV')
    this.confirmButton = page.getByRole('button', { name: 'Confirm order' })
  }

  async goto() {
    await this.page.goto('/checkout')
  }

  async fillCard({ number, expiry, cvv }: { number: string; expiry: string; cvv: string }) {
    await this.cardNumber.fill(number)
    await this.expiry.fill(expiry)
    await this.cvv.fill(cvv)
  }

  async confirm() {
    await this.confirmButton.click()
  }
}
\\\`\\\`\\\`
\`\`\`

## 2. Frontmatter Reference

| Field | Required | Type | Notes |
|---|---|---|---|
| name | yes | string | Unique within an author |
| version | yes | semver | 1.0.0 etc |
| description | yes | string | 10-500 chars |
| author | yes | string | Usually qaskills.sh or your handle |
| license | no | string | Default MIT |
| testingTypes | yes | array | e2e, unit, integration, performance, etc |
| frameworks | yes | array | playwright, cypress, pytest, etc |
| languages | yes | array | typescript, python, java, etc |
| domains | no | array | web, mobile, api, infrastructure |
| agents | yes | array | claude, cursor, continue, etc |
| tags | no | array | free-form tags |

## 3. Content Structure

A consistent body structure helps the AI parse it reliably:

1. **One-paragraph intro** explaining when the skill applies.
2. **File Locations** section listing where things go.
3. **Conventions** sections (one per topic).
4. **Examples** showing canonical code.
5. **Anti-patterns** explicitly listing what to avoid.

## 4. Examples Over Instructions

Bad:

> Always use beforeEach for setup that all tests in the describe block need.

Good:

> Setup that all tests need goes in beforeEach. Example:
>
> \`\`\`typescript
> test.describe('Checkout', () => {
>   let checkout: CheckoutPage
>   test.beforeEach(async ({ page }) => {
>     checkout = new CheckoutPage(page)
>     await checkout.goto()
>   })
>   test('valid card', async () => { ... })
> })
> \`\`\`

The AI reads both the instruction and the example, and the example is what it pattern-matches against.

## 5. Anti-Pattern Sections

Explicit anti-patterns reduce mistakes:

\`\`\`markdown
## Anti-patterns

DON'T do this:

\\\`\\\`\\\`typescript
await page.click('.btn-primary')   // CSS selector
await page.waitForTimeout(2000)    // arbitrary wait
const text = await (await page.$('h1')).textContent()  // old API
\\\`\\\`\\\`

DO this instead:

\\\`\\\`\\\`typescript
await page.getByRole('button', { name: 'Sign in' }).click()
await expect(page).toHaveURL(/dashboard/)
await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard')
\\\`\\\`\\\`
\`\`\`

## 6. Length and Scope

Aim for 100-400 lines. Too short and the AI has insufficient context; too long and the relevant context gets crowded out. If your skill is over 500 lines, split it.

## 7. Versioning

Use semver:

- Patch: typo fixes, clarifications.
- Minor: new examples, new sections.
- Major: breaking changes (renamed conventions, removed sections).

Document the changelog in the body or a CHANGELOG.md adjacent to the SKILL.md.

## 8. Multi-Agent Compatibility

Declare \`agents: [claude, cursor, continue, ...]\` in frontmatter. Most skills work across all agents, but Cursor-specific tips can be included in a section:

\`\`\`markdown
## Cursor-specific

In Cursor Composer, prefer "Generate tests for all scenarios in tests/fixtures/checkout.json" over individual prompts.
\`\`\`

## 9. Publishing to QASkills

\`\`\`bash
npx @qaskills/cli init
# Edit SKILL.md and metadata
npx @qaskills/cli publish
\`\`\`

Once published, anyone can install with:

\`\`\`bash
npx @qaskills/cli add <skill-name>
\`\`\`

## 10. Discovery via Tags

Good tags help users find your skill:

- Framework: playwright, cypress, pytest, cucumber, karate
- Pattern: page-objects, fixtures, mocking, parallel
- Language: typescript, python, java, ruby
- Domain: api, web, mobile, accessibility

## 11. Composing Multiple Skills

A project can install multiple skills. Example: playwright-page-objects + cucumber-java + api-mocking. The AI reads all of them and combines conventions.

When skills conflict (rare but possible), the AI prefers the more recently-loaded one.

## 12. Examples of Production Skills

Browse the [QASkills directory](/skills) for examples:

- playwright-tests
- cypress-cucumber-preprocessor
- pytest-fixtures
- cucumber-java
- karate-api-testing
- behave-python

Each is open-source and shows real-world SKILL.md structure.

## 13. Testing Your SKILL.md

Before publishing, test it:

\`\`\`bash
npx @qaskills/cli add ./local-skill-dir
cursor .
\`\`\`

Run a generation task. Check whether the AI follows the conventions. Iterate until the output is consistent.

## 14. Updating Skills

When you change a skill, bump the version and republish:

\`\`\`bash
# Edit SKILL.md
npx @qaskills/cli publish
\`\`\`

Users get notified of updates via the CLI.

## Conclusion

SKILL.md files are the highest-leverage artifact in the AI-augmented QA workflow. A 200-line SKILL.md applied to every test generation produces consistent output across hundreds of tests. See [cursor-for-qa-engineers-complete-guide](/blog) and the broader [QASkills directory](/skills) for installable examples.
`,
};
