import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Claude QA Agent Setup Guide 2026',
  description:
    'Step-by-step setup guide for using Claude as a QA agent. CLI installation, SKILL.md authoring, MCP servers, project configuration, and first test generation workflow for 2026.',
  date: '2026-05-17',
  category: 'Tutorial',
  content: `
# Claude QA Agent Setup Guide 2026

Using Claude as a QA agent is more involved than installing a single CLI binary. To get real productivity from Claude in 2026, you need to set up the right surface (Claude Code), configure project conventions via CLAUDE.md, install relevant SKILL.md packs from the QASkills directory, optionally connect MCP servers for browser automation and database access, and establish the workflows that turn Claude from a chatbot into a force-multiplier.

This tutorial walks through every step of the setup, from a clean machine to your first AI-generated Playwright test running green. We cover Claude Code installation, API key management, project bootstrap, CLAUDE.md authoring, SKILL.md installation via @qaskills/cli, MCP server integration for browser tools, and a complete first-run workflow.

By the end you will have Claude Code running in a real test project, generating tests that follow your team's conventions, and triaging failures automatically. The setup takes about 30 minutes for the first time and 5 minutes for subsequent projects.

## Key Takeaways

- **Install Claude Code** as the primary surface for QA work.
- **Configure ANTHROPIC_API_KEY** in your shell profile.
- **Write a CLAUDE.md** at the repo root with project conventions.
- **Install SKILL.md packs** with \`npx @qaskills/cli add <skill>\`.
- **Use MCP servers** for browser automation and database tools.

---

## 1. Prerequisites

- macOS, Linux, or Windows WSL2
- Node.js 20+ (for Claude Code and QASkills CLI)
- An Anthropic API key from console.anthropic.com
- A test project (Playwright, pytest, Cucumber, or similar)

## 2. Install Claude Code

\`\`\`bash
npm install -g @anthropic-ai/claude-code
claude --version
\`\`\`

Verify:

\`\`\`bash
claude --help
\`\`\`

## 3. API Key Setup

Generate a key from console.anthropic.com -> Settings -> API Keys. Export it in your shell profile:

\`\`\`bash
# ~/.zshrc or ~/.bashrc
export ANTHROPIC_API_KEY="sk-ant-..."
\`\`\`

Reload:

\`\`\`bash
source ~/.zshrc
\`\`\`

## 4. Bootstrap a Test Project

If you don't have one yet:

\`\`\`bash
mkdir my-tests && cd my-tests
npm init -y
npm install --save-dev @playwright/test typescript ts-node @types/node
npx playwright install --with-deps
\`\`\`

## 5. Write CLAUDE.md

Create CLAUDE.md at the repo root:

\`\`\`markdown
# CLAUDE.md

## Project Overview
End-to-end Playwright tests for the example.com SaaS application.

## Conventions
- Tests live in tests/e2e/.
- Page objects in src/pages/ extend a BasePage class.
- Use getByRole, getByTestId, getByLabel; avoid CSS selectors.
- Test data lives in tests/fixtures/.
- No waitForTimeout; rely on Playwright auto-waits.

## Commands
- pnpm install
- pnpm test - run smoke
- pnpm test:full - full regression
- pnpm test:debug - headed mode

## Style
- TypeScript strict mode
- Single quotes, no semicolons
- 2-space indent
\`\`\`

## 6. Install QASkills CLI

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli init
\`\`\`

This creates .qaskills/ and asks for your preferred AI agent (Claude).

## 7. Install a SKILL.md Pack

Browse the [skills directory](/skills) for relevant packs, then install:

\`\`\`bash
npx @qaskills/cli add playwright-tests
npx @qaskills/cli add api-testing-with-rest
\`\`\`

The CLI downloads each SKILL.md to .claude/skills/.

## 8. Verify Setup

List installed skills:

\`\`\`bash
npx @qaskills/cli list
\`\`\`

## 9. First Run

\`\`\`bash
claude
\`\`\`

Prompt:

> Read CLAUDE.md and the installed Playwright skill. Generate a smoke test for the /signin flow that signs in as alice@example.com and verifies redirect to /dashboard.

Claude reads the conventions and produces:

\`\`\`typescript
// tests/e2e/auth/signin.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from '../../src/pages/LoginPage'

test.describe('Authentication smoke', () => {
  test('signs in with valid credentials', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.signIn('alice@example.com', 'Sup3rS3cret!')
    await expect(page).toHaveURL(/dashboard/)
  })
})
\`\`\`

## 10. Run the Generated Test

\`\`\`bash
pnpm exec playwright test tests/e2e/auth/signin.spec.ts --headed
\`\`\`

## 11. MCP Servers for Browser Tools

For deeper integration, connect MCP servers. Edit ~/.claude.json:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    }
  }
}
\`\`\`

After restarting Claude Code, you can ask Claude to control a real browser:

> Open https://example.com/signin, fill the form with alice@example.com / Sup3rS3cret!, click Sign in, and take a screenshot of the dashboard.

## 12. Workflow Patterns

| Workflow | Prompt template | Time saved |
|---|---|---|
| New test from acceptance criteria | "Generate a Playwright test that covers: ..." | 15-30 min |
| Page object scaffolding | "Create a page object for /checkout with methods for fillCard, confirmOrder, getOrderTotal" | 10-15 min |
| Test refactoring | "Refactor tests/checkout.spec.ts to use the new CheckoutPage object" | 5-10 min |
| Bug triage | "This trace shows X. Identify the root cause." | 10-20 min |
| PR review | "Review this PR diff for test reliability." | 5-15 min |

## 13. Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| "No SKILL.md found" | Skill not installed | npx @qaskills/cli add <skill> |
| API rate limit | Free tier exceeded | Add payment method, increase budget |
| Claude ignores CLAUDE.md | File at wrong location | Must be at git repo root |
| Generated test fails | Stale page objects | Update CLAUDE.md with current routes |

## 14. CI Integration

For non-interactive use in CI, use Claude Code's --print mode or direct API calls. Example: a triage step that runs on failed tests:

\`\`\`yaml
- name: Triage failure
  if: failure()
  run: |
    claude --print "Analyze the failing test in tests/checkout.spec.ts and explain the likely cause" > triage.md
  env:
    ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
- uses: actions/upload-artifact@v4
  with: { name: triage, path: triage.md }
\`\`\`

## 15. Cost Management

Set a monthly budget at console.anthropic.com. Typical QA usage:

- Individual engineer: $30-80/month
- Team of 5: $200-400/month
- CI triage automation: $50-150/month

## Conclusion

A clean Claude QA setup takes 30 minutes and pays back the first day. With Claude Code, CLAUDE.md, QASkills, and optional MCP servers, you have a force-multiplier that respects your conventions and accelerates everything from authoring to triage. See [claude-for-qa-engineers-complete-guide](/blog) and [claude-code-qa-testing-workflows-2026](/blog) for advanced patterns.
`,
};
