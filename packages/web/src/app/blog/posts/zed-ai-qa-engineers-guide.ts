import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Zed AI for QA Engineers: Complete Guide 2026',
  description:
    'Guide to Zed editor with AI for QA engineers. Setup, AI configuration, agent panel, slash commands, MCP integration, test generation workflows, Playwright integration, and best practices for QA teams using Zed in 2026.',
  date: '2026-05-04',
  category: 'AI Testing',
  content: `
# Zed AI for QA Engineers: Complete Guide 2026

Zed is the high-performance, GPU-accelerated code editor from the creators of Atom and Tree-sitter. Built in Rust and architected for collaborative coding, Zed has grown into a serious contender among AI-augmented editors in 2026. Its AI panel, slash commands, custom prompt library, and Anthropic/OpenAI integration produce a fast, low-latency assistant experience that some QA engineers prefer over Cursor or Copilot. The standout feature is speed: Zed's rendering pipeline and instant indexing make AI suggestions feel snappier than any other major editor.

This guide covers Zed AI specifically for QA: installation, model configuration, agent panel workflows, slash commands, MCP integration, custom prompts, integration with Playwright and pytest, and the patterns that produce reliable test generation. Every example is current with Zed 0.180+.

By the end you will have Zed set up for QA work, with AI features tuned, prompts authored, and workflows that fit a fast feedback loop.

## Key Takeaways

- **Zed is a Rust-built, GPU-accelerated editor** known for speed.
- **AI panel supports Anthropic, OpenAI, Ollama, and OpenRouter**.
- **Slash commands** are reusable prompt templates.
- **Assistant Panel** is the multi-file agent interface.
- **MCP integration** added in 2025 releases.

---

## 1. Installation

\`\`\`bash
brew install --cask zed
\`\`\`

Or download from zed.dev. Linux and Windows ports stable since 2025.

## 2. Configure AI

Open Zed settings (Cmd+,). Add:

\`\`\`json
{
  "assistant": {
    "version": "2",
    "default_model": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5"
    }
  },
  "language_models": {
    "anthropic": {
      "api_url": "https://api.anthropic.com",
      "version": "2023-06-01"
    }
  }
}
\`\`\`

Set ANTHROPIC_API_KEY in your shell profile, or paste it in Zed -> Settings -> AI.

## 3. Open Project

\`\`\`bash
zed ~/my-test-project
\`\`\`

## 4. Assistant Panel

Press Cmd+? to open the Assistant panel. This is the primary AI surface.

Type:

> Generate a Playwright test for the signup flow.

The assistant reads the workspace, considers conventions, and produces a test.

## 5. Slash Commands

Zed supports slash commands as reusable prompts. Create one for QA generation:

\`\`\`json
{
  "assistant": {
    "slash_commands": {
      "playwright-test": {
        "prompt": "Generate a Playwright test file using our conventions: tests live in tests/e2e/, page objects in src/pages/ extending BasePage, use getByRole/getByLabel/getByTestId, no waitForTimeout. The test should cover the following scenarios: $ARGS"
      }
    }
  }
}
\`\`\`

Then in the assistant:

> /playwright-test signin happy path, invalid email, wrong password

## 6. Workflow: Page Object Generation

In the assistant:

> Read src/pages/BasePage.ts. Generate a CheckoutPage extending BasePage with methods fillCard, applyDiscount, confirmOrder, getTotal.

The assistant emits a diff for src/pages/CheckoutPage.ts.

## 7. Workflow: Test Suite Migration

> Convert tests in tests/cypress/integration/ to Playwright in tests/e2e/. Match our convention: one describe block per spec file.

Zed's assistant shows each file's diff for approval.

## 8. Inline Edit

Select code, press Cmd+J:

> Convert this test to use fixtures instead of beforeEach.

Zed performs the edit inline.

## 9. MCP Server Integration

Zed added MCP support in late 2024:

\`\`\`json
{
  "assistant": {
    "mcp_servers": {
      "playwright": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-playwright"]
      }
    }
  }
}
\`\`\`

## 10. Custom Prompts Library

Create a prompts.json:

\`\`\`json
{
  "qa-prompts": [
    {
      "name": "generate-page-object",
      "prompt": "Generate a Playwright Page Object at src/pages/<NAME>Page.ts. Methods: $METHODS. Extend BasePage."
    },
    {
      "name": "reproduce-bug",
      "prompt": "Read the bug report and generate a failing Playwright test that reproduces it. Bug: $BUG"
    }
  ]
}
\`\`\`

## 11. Zed vs Cursor vs Claude Code

| Aspect | Zed | Cursor | Claude Code |
|---|---|---|---|
| Speed | Fastest | Fast | N/A (terminal) |
| AI surface | Assistant panel, inline | Composer, Chat | Terminal |
| Multi-file agent | Assistant Panel | Composer | Native |
| MCP support | Yes (2024+) | Yes | Yes |
| Skill ecosystem | Slash commands | Cursor Skills | SKILL.md |
| Collaboration | Built-in | None | None |

Zed wins on speed and live collaboration. Cursor wins on multi-file agent depth. Claude Code wins on terminal workflows.

## 12. Integration with QASkills

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli add playwright-tests
\`\`\`

Reference skills in slash commands:

\`\`\`json
{
  "playwright-test": {
    "prompt": "Follow conventions in .qaskills/skills/playwright-tests/SKILL.md. Generate tests for: $ARGS"
  }
}
\`\`\`

## 13. Workflow: BDD Generation

> /playwright-test --bdd Generate a Cucumber feature file and step definitions for the checkout flow.

## 14. Best Practices

- **Use slash commands** for repeated prompts.
- **Tune model per task** (Sonnet for routine, Opus for hard).
- **Combine with QASkills SKILL.md** via referenced files.
- **Use Cmd+J for inline edits**, Assistant panel for multi-file.
- **Configure MCP for browser tasks**.

## 15. Pricing

Zed itself is free. API costs are yours. With Claude Sonnet, $20-60/month per engineer for moderate use.

## 16. Limitations

- Smaller AI ecosystem than Cursor or Claude Code.
- Slash command library is less developed than SKILL.md.
- MCP support is newer and less battle-tested.

## Conclusion

Zed AI in 2026 is a fast, snappy AI editor that suits QA engineers who prioritize editor performance and live collaboration. The slash command library plus QASkills SKILL.md combination produces consistent test generation. See [cursor-for-qa-engineers-complete-guide](/blog) and [claude-for-qa-engineers-complete-guide](/blog) for alternatives.
`,
};
