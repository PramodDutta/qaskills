import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Gemini CLI for QA Engineers: Complete Guide 2026',
  description:
    'Complete guide to Google Gemini CLI for QA engineers. Setup, agent workflows, model selection, MCP integration, custom prompts, large context handling, and test generation patterns for QA teams in 2026.',
  date: '2026-05-09',
  category: 'AI Testing',
  content: `
# Gemini CLI for QA Engineers: Complete Guide 2026

Google's Gemini CLI launched in 2024 as a terminal-native AI agent built on the Gemini 2.0 and 2.5 model family, then evolved through 2025 to its current Gemini 2.5 Pro and Flash configurations. The 2026 Gemini CLI is competitive with Claude Code and Codex CLI on most tasks and uniquely strong on tasks that benefit from very long context -- Gemini 2.5 Pro's 2-million-token context window lets it ingest entire test suites in one pass. For QA engineers working in Google Cloud-aligned organizations or with massive monorepos, Gemini CLI is the AI agent worth evaluating.

This guide covers Gemini CLI specifically for QA: installation, Google Cloud authentication, model selection, custom prompts, MCP integration, integration with Playwright/pytest/Cucumber, and the workflows that produce reliable test generation. Every example is current with Gemini CLI 0.30+ running on Gemini 2.5 Pro.

By the end you will have Gemini CLI configured for QA work, integrated with QASkills SKILL.md, and producing tests in line with your team's conventions.

## Key Takeaways

- **Gemini CLI is Google's terminal AI agent**.
- **Gemini 2.5 Pro offers 2M token context** -- unmatched for large suites.
- **Flash model is cheap and fast** for routine generation.
- **MCP server support** added in 2025.
- **Best for Google Cloud-aligned teams** with very large codebases.

---

## 1. Installation

\`\`\`bash
npm install -g @google/gemini-cli
gemini --version
\`\`\`

## 2. Authentication

\`\`\`bash
gemini auth login
\`\`\`

Or set an API key directly:

\`\`\`bash
export GEMINI_API_KEY="AIza..."
\`\`\`

API keys from aistudio.google.com (free tier) or via Google Cloud Vertex AI for enterprise.

## 3. First Run

\`\`\`bash
cd ~/my-test-project
gemini
\`\`\`

## 4. Model Selection

| Model | Best for | Cost |
|---|---|---|
| gemini-2.5-pro | Complex reasoning, large context | Higher |
| gemini-2.5-flash | Routine generation, speed | Lower |
| gemini-2.5-flash-thinking | Multi-step reasoning at lower cost | Mid |

Configure in .gemini/config.yaml:

\`\`\`yaml
default_model: gemini-2.5-pro
fast_model: gemini-2.5-flash
\`\`\`

## 5. Custom Prompts

Place .gemini/prompts/playwright-test.md:

\`\`\`markdown
You are generating Playwright tests for example.com.

Conventions:
- tests in tests/e2e/
- page objects in src/pages/ extend BasePage
- Use getByRole, getByLabel, getByTestId
- No waitForTimeout
- TypeScript strict mode

Generate tests for: {input}
\`\`\`

Invoke:

\`\`\`bash
gemini prompt playwright-test "checkout flow happy path"
\`\`\`

## 6. Workflow: Long-Context Test Generation

Gemini's 2M context is game-changing for QA. Feed the entire test suite plus all page objects in one prompt:

\`\`\`bash
gemini --include 'tests/**,src/pages/**,src/components/**' "Analyze the entire test suite. Identify the top 10 coverage gaps and propose tests to close them."
\`\`\`

Gemini reads all files, reasons across them, and produces a structured plan.

## 7. Workflow: Refactor at Scale

\`\`\`bash
gemini --include 'tests/**/*.spec.ts' "Refactor every test to use the new BasePage at src/pages/BasePage.ts. Update imports and method calls. Output a diff."
\`\`\`

Gemini handles 100+ file refactors in one pass.

## 8. MCP Server Integration

\`\`\`yaml
mcp_servers:
  playwright:
    command: npx
    args: ["@modelcontextprotocol/server-playwright"]
  postgres:
    command: npx
    args: ["@modelcontextprotocol/server-postgres", "postgresql://localhost/test"]
\`\`\`

## 9. Workflow: API Test Generation from OpenAPI

\`\`\`bash
gemini --include 'openapi.yaml' "Generate Karate API tests at src/test/karate/ for every endpoint defined here. Cover happy path and error cases."
\`\`\`

## 10. Sandbox Modes

| Mode | What it does |
|---|---|
| read-only | Inspect files |
| suggest | Propose edits for approval |
| auto | Edit and run without approval |

\`\`\`bash
gemini --mode suggest
\`\`\`

## 11. Gemini CLI vs Claude Code vs Codex CLI

| Aspect | Gemini CLI | Claude Code | Codex CLI |
|---|---|---|---|
| Provider | Google | Anthropic | OpenAI |
| Context window | 2M | 1M | 200K-1M |
| Best for | Massive suites | Quality output | Speed |
| MCP support | Yes | Yes | Yes |
| Cost (Pro) | $7.50/M input | $15/M input | $5/M input |

For most QA workflows, Claude Code edges out on Playwright TypeScript quality. Gemini wins when you need to reason over enormous context.

## 12. Integration with QASkills

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli init --agent gemini
npx @qaskills/cli add playwright-tests
\`\`\`

## 13. Workflow: Coverage Analysis

\`\`\`bash
gemini --include 'src/app/**,tests/e2e/**' "Compare every route in src/app/ against tests in tests/e2e/. Produce a coverage gap report."
\`\`\`

The 2M context lets Gemini see everything at once.

## 14. Workflow: BDD Generation

\`\`\`bash
gemini "Generate features/checkout.feature with 8 scenarios covering happy path, validation errors, and edge cases. Then generate Cucumber-JVM step definitions at src/test/java/steps/CheckoutSteps.java."
\`\`\`

## 15. CI Integration

\`\`\`yaml
- name: AI test review
  run: |
    gemini --mode read-only --include 'tests/e2e/**' "Review all tests for flakiness, parallel safety, and selector quality" > review.md
  env:
    GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
\`\`\`

## 16. Best Practices

- **Use --include for explicit context** rather than letting Gemini guess.
- **Prefer Flash for routine, Pro for hard reasoning**.
- **Take advantage of the 2M context** for cross-file work.
- **Combine with QASkills SKILL.md**.
- **Configure MCP servers** for browser work.

## 17. Pricing

Free tier on Google AI Studio: 60 RPM, 1500 RPD on Gemini 2.5 Flash. Paid Vertex AI pricing as of 2026:
- Gemini 2.5 Pro: $1.25-2.50/M input, $10/M output
- Gemini 2.5 Flash: $0.075/M input, $0.30/M output

The cheapest premium model on the market for QA workloads.

## 18. Limitations

- Smaller QA community than Claude Code.
- Some Playwright TypeScript outputs slightly less polished than Claude.
- MCP ecosystem younger than Claude/Cursor.

## Conclusion

Gemini CLI in 2026 is the best AI agent for QA engineers who need to reason over very large codebases or want the lowest-cost premium AI assistance. The 2M context window, Vertex AI integration, and MCP support produce a competitive terminal agent. See [claude-code-qa-testing-workflows-2026](/blog) and [codex-cli-qa-engineers-guide](/blog) for alternatives.
`,
};
