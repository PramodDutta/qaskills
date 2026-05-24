import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Amp AI for QA Engineers: Complete Guide 2026',
  description:
    'Complete guide to Amp AI (Sourcegraph) for QA engineers. Setup, agent workflows, code search integration, MCP support, custom commands, and test generation patterns for QA teams in 2026.',
  date: '2026-05-07',
  category: 'AI Testing',
  content: `
# Amp AI for QA Engineers: Complete Guide 2026

Amp is Sourcegraph's AI coding agent, launched in 2024 and positioned as the AI tool optimized for very large codebases. While most AI agents struggle once a repository crosses 100,000+ files, Amp's deep integration with Sourcegraph's code intelligence backend gives it precise symbol resolution, cross-repo navigation, and grounded answers that don't hallucinate function signatures. For QA engineers at enterprise scale -- monorepos with millions of lines and hundreds of services -- Amp is one of the few AI tools that performs reliably.

This guide covers Amp specifically for QA: installation, authentication with Sourcegraph, agent workflows, code search integration, MCP support, custom commands, integration with Playwright/pytest/Cucumber, and the patterns that produce reliable test generation in monorepo environments. Every example is current with Amp's late-2025 release.

By the end you will have Amp configured for QA work, with code search providing grounded context to your AI agent and tests being generated in line with your house conventions.

## Key Takeaways

- **Amp is Sourcegraph's AI agent** built for large codebases.
- **Code Graph integration** provides grounded symbol resolution.
- **VS Code extension** plus CLI for headless use.
- **Supports Anthropic, OpenAI, and Sourcegraph-hosted models**.
- **Best for enterprise monorepos** with 100K+ files.

---

## 1. Installation

VS Code:

\`\`\`bash
code --install-extension sourcegraph.amp
\`\`\`

CLI:

\`\`\`bash
brew install sourcegraph/amp/amp
amp --version
\`\`\`

## 2. Authentication

\`\`\`bash
amp login --instance https://sourcegraph.example.com
\`\`\`

Use your Sourcegraph SSO. Amp pulls your access token and configures the extension automatically.

## 3. Code Graph Context

Amp's killer feature: it queries Sourcegraph's code intelligence backend to provide precise, grounded context. When you ask "where is the CheckoutPage defined?", Amp gives you the exact symbol resolution rather than fuzzy filename matching.

## 4. Workflow: Generate a Test

In the VS Code Amp panel:

> Generate a Playwright test for the checkout flow. Use the CheckoutPage at src/pages/CheckoutPage.ts. Cover successful purchase, declined card, and insufficient funds.

Amp uses code graph to find CheckoutPage, reads its public methods, and produces a test that uses them correctly.

## 5. Custom Commands

Amp config at ~/.amp/config.yaml:

\`\`\`yaml
commands:
  playwright-test:
    prompt: |
      Generate a Playwright test using:
      - tests/e2e/ as the directory
      - Page objects in src/pages/ extending BasePage
      - getByRole, getByLabel, getByTestId selectors
      - No waitForTimeout
      Scenarios: {args}
    model: claude-sonnet-4-5
  qa-review:
    prompt: |
      Review this test file for reliability, parallel safety, and selector quality.
      Flag anti-patterns like waitForTimeout or CSS selectors.
    model: claude-opus-4-7
\`\`\`

Use them:

\`\`\`bash
amp run playwright-test "signin happy path, invalid email"
\`\`\`

## 6. Code Search in Prompts

Reference search queries:

> Find all uses of waitForTimeout in tests/e2e/. Refactor each to use expect polls instead.

Amp first runs a Sourcegraph search to locate every usage, then refactors each.

## 7. Workflow: Cross-Repo Test Generation

In a monorepo with multiple services:

> Generate a Playwright test that exercises the order flow across services/checkout and services/payments. Reference the existing tests at tests/e2e/order.spec.ts.

Amp uses code graph to understand both services and generates tests that respect both.

## 8. MCP Server Support

\`\`\`yaml
mcp_servers:
  playwright:
    command: npx
    args:
      - "@modelcontextprotocol/server-playwright"
\`\`\`

## 9. CLI Workflows

For CI:

\`\`\`bash
amp run qa-review --file tests/e2e/checkout.spec.ts > review.md
\`\`\`

## 10. Workflow: Coverage Gap Analysis

> Search for routes in src/app/ that don't have corresponding tests in tests/e2e/. Produce a coverage gap report.

Amp combines code search with reasoning to produce a precise report.

## 11. Amp vs Cursor vs Claude Code

| Aspect | Amp | Cursor | Claude Code |
|---|---|---|---|
| Best for | Large monorepos | Medium projects | Any size |
| Code intelligence | Sourcegraph-grade | Tree-sitter | Tree-sitter |
| Symbol grounding | Precise | Fuzzy | Fuzzy |
| Multi-repo | Yes | Limited | Limited |
| Open source | No | No | No |
| Cost | Sourcegraph plan | $20/mo | API |

## 12. Integration with QASkills

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli add playwright-tests
\`\`\`

Reference in custom commands:

\`\`\`yaml
commands:
  playwright-test:
    prompt: |
      Follow conventions in .qaskills/skills/playwright-tests/SKILL.md.
      Scenarios: {args}
\`\`\`

## 13. Workflow: Refactor in Monorepo

> Refactor every Page Object in services/*/src/pages/ to extend the new BasePage at packages/shared/src/BasePage.ts. Update all importing tests.

Amp uses code graph to find every import and refactor across services.

## 14. Best Practices

- **Use code search liberally** -- Amp's strength is grounded context.
- **Customize commands for repeated tasks**.
- **Use Sonnet for routine, Opus for hard reasoning**.
- **Combine with QASkills SKILL.md**.
- **Run CLI in CI** for batch tasks.

## 15. Pricing

Amp is bundled with Sourcegraph Cody Enterprise. Costs depend on your Sourcegraph contract; typically $50-100/user/month for the AI assistant tier.

## 16. Limitations

- Requires Sourcegraph instance (self-hosted or cloud).
- Best with Sourcegraph code intelligence enabled.
- Smaller user community than Cursor or Copilot.

## Conclusion

Amp is the AI agent to reach for when your codebase is too large for other agents to handle reliably. The combination of Sourcegraph code intelligence and AI generation produces grounded, accurate output even at million-line scale. See [claude-for-qa-engineers-complete-guide](/blog) and [cursor-for-qa-engineers-complete-guide](/blog) for alternatives in smaller projects.
`,
};
