import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Continue.dev for QA Engineers: Complete Guide 2026',
  description:
    'Complete guide to Continue.dev for QA engineers. Setup, custom commands, context providers, agent workflows, MCP integration, slash commands, and test generation patterns for QA teams in 2026.',
  date: '2026-05-06',
  category: 'AI Testing',
  content: `
# Continue.dev for QA Engineers: Complete Guide 2026

Continue.dev is the open-source AI code assistant that runs as a VS Code and JetBrains plugin. Unlike Cursor or Windsurf which fork the editor, Continue stays within the existing IDE, giving you autocomplete, chat, and an agent layer without leaving VS Code or IntelliJ. For QA engineers in IT-locked environments where new editors are hard to install, Continue is often the only way to add AI to your workflow. Its multi-model support, customizable context providers, and growing MCP ecosystem make it a serious choice in 2026.

This guide covers Continue.dev specifically for QA: installation, config.json authoring, model selection, custom slash commands, context providers, agent mode, MCP integration, and the workflows that produce reliable test generation across Playwright, pytest, and Cucumber. Every example is current with Continue 0.10+ in late 2025/early 2026.

By the end you will have Continue configured for QA work, integrated with QASkills SKILL.md, and producing tests consistent with your team's conventions.

## Key Takeaways

- **Continue.dev is open source** and free; you bring your own API key.
- **Supports VS Code and JetBrains** with a unified configuration.
- **Custom slash commands** are reusable prompt templates.
- **Context providers** pull data from files, git, GitHub, Jira, etc.
- **Agent mode** added in 2025 for multi-file edits.

---

## 1. Installation

VS Code:

\`\`\`bash
code --install-extension Continue.continue
\`\`\`

JetBrains: install from the plugin marketplace.

## 2. Configuration

Open ~/.continue/config.json:

\`\`\`json
{
  "models": [
    {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5",
      "apiKey": "sk-ant-..."
    }
  ],
  "tabAutocompleteModel": {
    "provider": "anthropic",
    "model": "claude-haiku-3",
    "apiKey": "sk-ant-..."
  },
  "embeddingsProvider": {
    "provider": "ollama",
    "model": "nomic-embed-text"
  },
  "customCommands": [
    {
      "name": "playwright-test",
      "prompt": "Generate a Playwright test using our conventions: tests/e2e/, page objects extending BasePage, getByRole/getByLabel/getByTestId. Scenarios: $ARGS",
      "description": "Generate a Playwright test"
    }
  ]
}
\`\`\`

## 3. Slash Commands

Type / in the Continue panel:

\`\`\`
/playwright-test signin happy path, invalid email, wrong password
\`\`\`

Continue substitutes $ARGS and generates the test.

## 4. Context Providers

Continue can pull context from multiple sources:

\`\`\`json
{
  "contextProviders": [
    { "name": "code" },
    { "name": "docs" },
    { "name": "diff" },
    { "name": "open" },
    { "name": "tree" },
    { "name": "github", "params": { "auth_token": "ghp_..." } },
    { "name": "jira", "params": { "domain": "example.atlassian.net" } }
  ]
}
\`\`\`

Use them in prompts:

\`\`\`
@code @docs Generate a Playwright test for the @jira ticket QA-1234
\`\`\`

## 5. Agent Mode

Press Cmd+Shift+P -> "Continue: Agent Mode". The agent reads multiple files and edits them.

> @code Generate a Playwright suite for the order history feature. Use the existing BasePage. Create both the page object and the test file.

## 6. Workflow: Test Generation

\`\`\`
@code Generate a Playwright test at tests/e2e/checkout.spec.ts covering:
- Successful checkout with Visa
- Declined card
- Insufficient funds
- Network timeout
Use the existing CheckoutPage at src/pages/CheckoutPage.ts.
\`\`\`

## 7. Workflow: Refactoring

\`\`\`
@code Refactor tests/e2e/checkout.spec.ts to use a beforeEach for the common setup (login, navigate to cart).
\`\`\`

## 8. Inline Edits

Select code, press Cmd+I:

\`\`\`
Convert this to use the new CheckoutPage.confirmOrder method
\`\`\`

## 9. MCP Server Integration

Continue added MCP support in 2025:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"]
    }
  }
}
\`\`\`

## 10. Integration with QASkills

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli init --agent continue
npx @qaskills/cli add playwright-tests
\`\`\`

Reference in slash commands:

\`\`\`json
{
  "customCommands": [
    {
      "name": "playwright-test",
      "prompt": "Follow .qaskills/skills/playwright-tests/SKILL.md. Generate tests for: $ARGS"
    }
  ]
}
\`\`\`

## 11. Continue.dev vs Cursor vs Cline

| Aspect | Continue | Cursor | Cline |
|---|---|---|---|
| Cost | Free + API | $20/mo | Free + API |
| Editor | VS Code, JetBrains | Cursor only | VS Code |
| Open source | Yes | No | Yes |
| Slash commands | Yes | Limited | No |
| MCP support | Yes | Yes | Yes |
| Best for | Multi-editor teams | Cursor users | Plan/Act workflows |

## 12. Local Models

Continue supports Ollama for fully local LLMs:

\`\`\`json
{
  "models": [
    {
      "provider": "ollama",
      "model": "qwen2.5-coder:32b"
    }
  ]
}
\`\`\`

Good for air-gapped environments.

## 13. Workflow: Multi-Editor Team

Continue's config syncs across VS Code and JetBrains. If half your team uses each, Continue is the only common AI surface.

## 14. Workflow: BDD Authoring

\`\`\`
@code @docs Generate a Cucumber feature file at features/order.feature and matching Java step definitions at src/test/java/com/example/steps/.
\`\`\`

## 15. Best Practices

- **Define slash commands for repeated prompts**.
- **Use context providers to bring in Jira/GitHub data**.
- **Use Sonnet for code, Haiku for autocomplete** to manage cost.
- **Combine with QASkills SKILL.md** for framework conventions.
- **Use agent mode for multi-file**, inline for single edits.

## 16. Limitations

- Multi-file agent less mature than Cursor's Composer.
- Smaller user community than Cursor or Copilot.
- Documentation is solid but examples for QA workflows are sparse.

## 17. Pricing

Free extension. API costs are yours. $20-50/month per engineer with Claude Sonnet.

## Conclusion

Continue.dev in 2026 is the best AI assistant for teams stuck on VS Code or JetBrains who can't switch to Cursor or Windsurf. The slash commands, context providers, and MCP integration make it a real productivity tool. See [cline-qa-engineers-complete-guide](/blog) and [cursor-for-qa-engineers-complete-guide](/blog) for alternatives.
`,
};
