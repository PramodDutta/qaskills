import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Codex CLI for QA Engineers: Complete Guide 2026',
  description:
    'Complete guide to OpenAI Codex CLI for QA engineers. Setup, agent workflows, model selection, MCP integration, custom prompts, sandbox modes, and test generation patterns for QA teams in 2026.',
  date: '2026-05-08',
  category: 'AI Testing',
  content: `
# Codex CLI for QA Engineers: Complete Guide 2026

OpenAI launched Codex CLI in 2024 as a terminal-native AI coding agent built on the GPT-4o / o1 model family, then deprecated o1 and migrated to GPT-4.1 and GPT-5 throughout 2025. The 2026 version of Codex CLI is a polished, production-grade alternative to Claude Code, with strong reasoning, multi-step planning, sandboxed execution, and a growing MCP server ecosystem. For QA engineers who prefer the terminal and have OpenAI API budget, Codex CLI is a credible choice alongside Claude Code.

This guide covers Codex CLI specifically for QA: installation, authentication, sandbox modes, model selection, custom prompts, MCP integration, integration with Playwright/pytest/Cucumber, and the workflows that produce reliable test generation. Every example is current with Codex CLI 0.40+ running on GPT-5.

By the end you will have Codex CLI configured for QA work, integrated with QASkills SKILL.md, and producing tests that match your team's conventions.

## Key Takeaways

- **Codex CLI is OpenAI's terminal AI agent**.
- **Three sandbox modes**: read-only, suggest, auto.
- **Brings GPT-5's strong reasoning** for complex test generation.
- **MCP server support** for browser and database tools.
- **Best for OpenAI-aligned teams** with API budget.

---

## 1. Installation

\`\`\`bash
npm install -g @openai/codex
codex --version
\`\`\`

Or via Homebrew:

\`\`\`bash
brew install openai/codex/codex
\`\`\`

## 2. Authentication

\`\`\`bash
export OPENAI_API_KEY="sk-..."
codex auth login
\`\`\`

Or interactive login:

\`\`\`bash
codex login --browser
\`\`\`

## 3. First Run

\`\`\`bash
cd ~/my-test-project
codex
\`\`\`

This opens a terminal chat session in the current directory.

## 4. Sandbox Modes

Codex CLI has three modes:

| Mode | What it can do | Best for |
|---|---|---|
| read-only | Read files, no edits, no shell | Exploration |
| suggest | Propose edits and shell commands; you approve | Default for QA |
| auto | Edit files and run shell commands without approval | CI, headless |

Set in .codex/config.toml:

\`\`\`toml
[default]
mode = "suggest"
model = "gpt-5"
\`\`\`

## 5. Custom Prompts

Place .codex/prompts/playwright-test.md:

\`\`\`markdown
You are generating Playwright tests for example.com.

Conventions:
- tests in tests/e2e/
- page objects in src/pages/ extend BasePage
- Use getByRole, getByLabel, getByTestId
- No waitForTimeout
- TypeScript strict mode

Generate a test for the following scenarios: {input}
\`\`\`

Invoke:

\`\`\`bash
codex prompt playwright-test "signin happy path, invalid email, wrong password"
\`\`\`

## 6. Workflow: Generate a Test

\`\`\`bash
codex
> Generate a Playwright test for the checkout flow.
> Sign in as alice@example.com, add Widget to cart,
> complete checkout, verify confirmation.
\`\`\`

Codex plans the work, reads existing page objects, proposes a diff for tests/e2e/checkout/place-order.spec.ts.

## 7. Workflow: Bug Reproduction

\`\`\`
> Bug: applying SAVE10 discount doesn't update cart total for 2 seconds.
> Reproduce as a failing Playwright test.
\`\`\`

## 8. MCP Server Integration

\`\`\`toml
[mcp.playwright]
command = "npx"
args = ["@modelcontextprotocol/server-playwright"]

[mcp.postgres]
command = "npx"
args = ["@modelcontextprotocol/server-postgres", "postgresql://localhost/test"]
\`\`\`

Restart Codex; MCP servers appear as available tools.

## 9. Workflow: Refactor

\`\`\`
> Refactor src/pages/CheckoutPage.ts to use composition.
> Create PaymentForm and ShippingForm components.
> Update all tests in tests/e2e/checkout/ accordingly.
\`\`\`

Codex plans the change, edits multiple files, runs the test suite to verify.

## 10. Headless Use in CI

\`\`\`yaml
- name: Triage failure
  if: failure()
  run: |
    codex --mode auto --prompt "Analyze the failing test in tests/e2e/checkout.spec.ts. Identify root cause." > triage.md
  env:
    OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
- uses: actions/upload-artifact@v4
  with: { name: triage, path: triage.md }
\`\`\`

## 11. Codex CLI vs Claude Code

| Aspect | Codex CLI | Claude Code |
|---|---|---|
| Provider | OpenAI | Anthropic |
| Model | GPT-5 / GPT-4.1 | Claude Sonnet/Opus |
| Sandbox modes | 3 explicit | implicit |
| MCP support | Yes | Yes |
| SKILL.md support | Via custom prompts | Native |
| Cost | OpenAI pricing | Anthropic pricing |

For QA work specifically, Claude Code typically produces marginally cleaner Playwright tests; Codex CLI is excellent for Python and pytest. Choose based on your team's preferred model.

## 12. Integration with QASkills

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli init --agent codex
npx @qaskills/cli add playwright-tests
\`\`\`

Skills go to .codex/skills/. Reference in custom prompts.

## 13. Workflow: BDD Generation

\`\`\`
> Generate features/checkout.feature and matching Java step definitions at src/test/java/steps/CheckoutSteps.java for the checkout flow.
\`\`\`

## 14. Best Practices

- **Use suggest mode by default**; switch to auto only for headless CI.
- **Customize prompts for repeated tasks**.
- **Combine with QASkills SKILL.md** for framework conventions.
- **Use MCP for browser tasks** rather than asking Codex to shell out.
- **Set per-project budgets** in OpenAI console.

## 15. Cost

OpenAI API pricing as of May 2026:
- GPT-5: roughly $5/M input, $15/M output tokens
- GPT-4.1: cheaper, suitable for routine tasks

Typical QA engineer monthly: $30-80.

## 16. Limitations

- SKILL.md ecosystem smaller than Claude Code's QASkills directory.
- Fewer QA-specific community guides than Claude Code.
- Reasoning quality on Playwright TypeScript is excellent but Claude often edges it.

## Conclusion

Codex CLI is OpenAI's answer to Claude Code, and in 2026 it is a serious option for QA engineers. The sandbox modes, MCP support, and GPT-5 reasoning produce a productive terminal agent. See [claude-code-qa-testing-workflows-2026](/blog) for the closest alternative and [gemini-cli-qa-engineers-guide](/blog) for Google's offering.
`,
};
