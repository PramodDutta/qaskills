import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cline for QA Engineers: Complete Guide 2026',
  description:
    'Complete guide to Cline (formerly Claude Dev) for QA engineers. Setup, custom instructions, MCP servers, plan/act modes, test generation workflows, Playwright integration, and best practices for QA teams in 2026.',
  date: '2026-05-03',
  category: 'AI Testing',
  content: `
# Cline for QA Engineers: Complete Guide 2026

Cline is the open-source AI coding agent that runs as a VS Code extension and has become one of the most-loved agents in the developer community by 2026. Originally launched as Claude Dev, the project rebranded to Cline in 2024 and has continued to innovate on the agentic coding pattern: plan/act modes, granular permissions per command, MCP server marketplace, and a transparent approval flow that shows exactly what the AI will do before it does it. For QA engineers, Cline's autoApproval model and built-in checkpointing make it especially safe for autonomous test generation and refactoring.

This guide covers Cline specifically for QA: installation in VS Code, model selection (Claude, GPT, local), custom instructions, MCP integration, plan vs act modes, autoApproval configuration, and the workflows that produce reliable Playwright, Cypress, and pytest tests. Every example is current with Cline 3.x running on Claude Sonnet 4.5.

By the end you will have Cline configured for QA work, integrated with QASkills SKILL.md packs, and producing tests that match your team's conventions.

## Key Takeaways

- **Cline is a free, open-source VS Code extension**.
- **You bring your own API key** (Anthropic, OpenAI, OpenRouter, local).
- **Plan mode plans, Act mode executes** -- separation reduces surprises.
- **autoApproval per command type** lets you tune the friction.
- **MCP server marketplace** integrates browsers, databases, and APIs.

---

## 1. Installation

In VS Code:

\`\`\`bash
code --install-extension saoudrizwan.claude-dev
\`\`\`

Open the Cline panel (Cmd+Shift+P -> "Cline: Open in New Tab").

## 2. Configure API Key

In Cline settings, pick a provider:

- **Anthropic**: best quality, supports Claude Sonnet 4.5 and Opus 4.7.
- **OpenAI**: GPT-4o, GPT-4.1.
- **OpenRouter**: any model, single key for many.
- **Local**: Ollama, LM Studio.

For QA work, Claude Sonnet 4.5 is the sweet spot for cost vs quality.

## 3. Plan / Act Modes

Cline's defining feature: every task starts in **Plan mode** where the AI proposes a plan before doing anything. Switch to **Act mode** when you approve the plan.

> Plan: Create a Playwright test for the checkout flow.
> Steps:
>   1. Read src/pages/BasePage.ts to understand the page object pattern.
>   2. Create src/pages/CheckoutPage.ts with relevant methods.
>   3. Create tests/e2e/checkout.spec.ts with 3 scenarios.
>   4. Run npx playwright test tests/e2e/checkout.spec.ts.
>   5. Report results.
>
> Switch to Act mode to proceed?

Switching to Act executes the plan.

## 4. Custom Instructions

In Cline settings -> Custom Instructions:

\`\`\`
QA engineer assistant for example.com Playwright suite.

Conventions:
- tests in tests/e2e/
- page objects in src/pages/ extend BasePage
- Use getByRole, getByLabel, getByTestId
- No waitForTimeout
- TypeScript strict mode

When generating:
- One test.describe per user story
- One test per acceptance criterion
- Always run tests after generation
\`\`\`

## 5. AutoApproval Configuration

Cline lets you auto-approve specific command types:

| Command type | Recommendation |
|---|---|
| Read files | Auto-approve |
| Write/edit files | Manual approve |
| Execute terminal commands | Manual approve |
| Browser actions | Manual approve |
| MCP tool calls | Auto-approve for read-only servers |

For QA work, auto-approving reads and MCP read calls reduces friction without giving up control.

## 6. MCP Servers

Cline has a built-in MCP server marketplace. Install with one click:

- @modelcontextprotocol/server-playwright
- @modelcontextprotocol/server-filesystem
- @modelcontextprotocol/server-postgres
- @modelcontextprotocol/server-puppeteer

## 7. Workflow: Generate a Playwright Test

In Plan mode:

> Generate a Playwright test for the order history page covering 5 scenarios: signed-in user sees orders, columns are correct, empty state appears, sorting works, pagination works.

Cline plans the steps, reads existing tests/page objects, then in Act mode generates the test file and offers to run it.

## 8. Workflow: Bug Reproduction

> Bug: Adding discount SAVE10 to a $99.99 cart shows $99.99 total for 2 seconds before updating. Reproduce as a Playwright test.

Cline generates a test that catches the timing bug.

## 9. Workflow: Multi-File Refactor

> Refactor src/pages/CheckoutPage.ts to use composition (HeaderComponent, CartComponent) instead of inheritance. Update all tests in tests/e2e/checkout*.spec.ts accordingly.

Cline plans the refactor across 8-10 files, then executes with checkpoints.

## 10. Checkpointing

Cline creates a git-like checkpoint before every multi-file change. If something goes wrong, restore in one click.

## 11. Integration with QASkills

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli init --agent cline
npx @qaskills/cli add playwright-tests
\`\`\`

Skills install to .cline/skills/.

## 12. Cline vs Cursor vs Claude Code

| Aspect | Cline | Cursor | Claude Code |
|---|---|---|---|
| Cost | Free + your API key | $20/month | API metered |
| Surface | VS Code extension | Cursor editor | Terminal |
| Plan/Act split | Yes | No | No |
| MCP marketplace | Built-in | Manual config | Manual config |
| Checkpoints | Yes | Limited | No |
| Open source | Yes | No | No |

Cline shines for teams that already use VS Code and want a free, transparent agent.

## 13. Workflow: TestRail to Playwright

> Read tests/manual/order-history.testrail.md. Convert each step into Playwright code at tests/e2e/order-history.spec.ts.

## 14. Workflow: API Test Generation from OpenAPI

> Read openapi.yaml. Generate Karate tests at src/test/karate/ for the /orders endpoints with happy path, validation, and auth errors.

## 15. Best Practices

- **Always start in Plan mode** for complex tasks.
- **Tune autoApproval** to your team's risk tolerance.
- **Use checkpoints** liberally on large refactors.
- **Install QASkills SKILL.md** for framework conventions.
- **Configure MCP servers** for browser/database access.

## 16. Cost

Free extension, but the API costs are yours. With Claude Sonnet 4.5 and moderate QA usage, expect $20-60/month per engineer.

## 17. The QASkills Directory

Browse the [QASkills directory](/skills) for installable SKILL.md packs. Cline reads them automatically. See also [cursor-for-qa-engineers-complete-guide](/blog) for the closest alternative.

## Conclusion

Cline in 2026 is a strong, free, open-source choice for QA engineers in VS Code. The plan/act split, MCP marketplace, and checkpointing produce a safer agent experience than Cursor or Copilot. See [claude-code-qa-testing-workflows-2026](/blog) for terminal-based alternatives.
`,
};
