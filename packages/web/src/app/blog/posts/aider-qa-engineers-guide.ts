import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Aider for QA Engineers: Complete Guide 2026',
  description:
    'Complete guide to Aider for QA engineers. Setup, conventions, repo-map, test generation workflows, custom commands, and integration with Playwright, pytest, and Cucumber for QA teams using Aider in 2026.',
  date: '2026-05-05',
  category: 'AI Testing',
  content: `
# Aider for QA Engineers: Complete Guide 2026

Aider is the open-source CLI AI pair programmer that has earned a dedicated following among engineers who prefer the terminal to a full editor. Created by Paul Gauthier and maintained as an active open-source project since 2023, Aider sits in your repo as a long-running terminal session, edits files based on your instructions, and commits each change to git with a generated message. For QA engineers who already live in tmux or terminal multiplexers and value transparency over IDE polish, Aider is one of the most productive AI surfaces available.

This guide covers Aider specifically for QA: installation, configuration, the .aider.conf.yml file, repo-map for large test suites, conventions via CONVENTIONS.md, integration with Playwright/pytest/Cucumber, custom commands, and the workflows that produce reliable test generation. Every example is current with Aider 0.75+ running on Claude Sonnet 4.5.

By the end you will have Aider configured for QA work, integrated with the QASkills SKILL.md ecosystem, and producing tests that match your team's conventions.

## Key Takeaways

- **Aider is CLI-only** -- pure terminal workflow.
- **Every change is a git commit** with a generated message.
- **Repo-map summarizes the codebase** so the model has context without ingesting every file.
- **Multi-model support** -- Claude, GPT-4.1, Gemini, local models.
- **Best for engineers** who prefer terminals to editors.

---

## 1. Installation

\`\`\`bash
pip install aider-chat
# or
pipx install aider-chat
\`\`\`

Set API key:

\`\`\`bash
export ANTHROPIC_API_KEY="sk-ant-..."
\`\`\`

Start Aider in your repo:

\`\`\`bash
cd ~/my-test-project
aider --model anthropic/claude-sonnet-4-5
\`\`\`

## 2. Configuration with .aider.conf.yml

Place at the repo root:

\`\`\`yaml
model: anthropic/claude-sonnet-4-5
weak-model: anthropic/claude-haiku-3
edit-format: diff
auto-commits: true
gitignore: true
read:
  - CONVENTIONS.md
  - tsconfig.json
  - playwright.config.ts
test-cmd: pnpm test
auto-test: true
\`\`\`

## 3. CONVENTIONS.md

Aider reads CONVENTIONS.md automatically:

\`\`\`markdown
# Conventions

This is a Playwright e2e suite for example.com.

Tests live in tests/e2e/.
Page objects in src/pages/ extend BasePage.
Use getByRole, getByLabel, getByTestId.
No waitForTimeout.
TypeScript strict mode.

When adding tests, run the suite and ensure they pass.
\`\`\`

## 4. Repo-Map

Aider builds a tree-sitter-based map of the repo, summarizing classes and functions. For large test suites this is essential -- the AI knows about your page objects without reading every file.

Increase the map size for large repos:

\`\`\`bash
aider --map-tokens 4096
\`\`\`

## 5. Workflow: Add Files to Context

\`\`\`
> /add src/pages/BasePage.ts tests/e2e/auth/signin.spec.ts
\`\`\`

Aider adds these to the context so subsequent edits reference them precisely.

## 6. Workflow: Generate a Test

\`\`\`
> Generate a Playwright test at tests/e2e/checkout/place-order.spec.ts.
> The test should sign in as alice@example.com, add Widget to cart,
> complete checkout with a valid card, and verify order confirmation.
> Use the LoginPage and CheckoutPage page objects.
\`\`\`

Aider produces the file, commits it, and (if auto-test is on) runs the suite.

## 7. Built-in Commands

| Command | What it does |
|---|---|
| /add <files> | Add files to context |
| /drop <files> | Remove from context |
| /diff | Show pending changes |
| /commit | Force commit |
| /undo | Revert last commit |
| /test | Run test-cmd |
| /lint | Run lint-cmd |
| /tokens | Show token usage |
| /clear | Clear chat history |

## 8. Workflow: Refactor

\`\`\`
> /add src/pages/CheckoutPage.ts tests/e2e/checkout/*.spec.ts
> Refactor CheckoutPage to use composition (PaymentForm, ShippingForm)
> instead of inline locators. Update all tests accordingly.
\`\`\`

Aider plans the change, edits multiple files, commits each step.

## 9. Custom Commands

Add to .aider.conf.yml:

\`\`\`yaml
shell-cmd:
  test-e2e: "pnpm playwright test --headed"
  test-smoke: "pnpm playwright test --grep @smoke"
\`\`\`

Then in Aider:

\`\`\`
> /run test-smoke
\`\`\`

## 10. Multi-Model Strategy

For cost optimization:

\`\`\`yaml
model: anthropic/claude-sonnet-4-5
weak-model: anthropic/claude-haiku-3
\`\`\`

Aider uses the weak model for repo-map updates and the strong model for actual code generation, cutting costs by 40-60%.

## 11. Aider vs Other Agents

| Aspect | Aider | Claude Code | Cursor |
|---|---|---|---|
| Surface | Terminal | Terminal | Editor |
| Git integration | Every change is a commit | Optional | Manual |
| Repo-map | Yes (best in class) | Implicit | Implicit |
| Multi-model | Yes | Claude only | Yes |
| Open source | Yes | No | No |
| Best for | Terminal-native devs | Claude-first teams | Editor-centric workflow |

## 12. Integration with QASkills

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli add playwright-tests
\`\`\`

Reference in CONVENTIONS.md:

\`\`\`markdown
Follow conventions in .qaskills/skills/playwright-tests/SKILL.md.
\`\`\`

## 13. Workflow: Bug Reproduction

\`\`\`
> A user reports that applying discount SAVE10 to a $99.99 cart doesn't update the total for 2 seconds. Add a Playwright test that reproduces this.
\`\`\`

## 14. Workflow: BDD Generation

\`\`\`
> /add features/checkout.feature
> Generate Java step definitions at src/test/java/com/example/steps/CheckoutSteps.java that match these scenarios. Use our existing TestContext for state.
\`\`\`

## 15. Best Practices

- **Use auto-commits**: each Aider change is reviewable in git log.
- **Use --map-tokens**: increase for large repos.
- **Use weak-model**: cuts cost significantly.
- **Use /add deliberately**: only add files the AI needs.
- **Use /drop after a task**: clears context for the next task.

## 16. Limitations

- No GUI; terminal only.
- Multi-file edits less polished than Cursor's Composer.
- Slash command set is smaller than Claude Code's tool set.

## 17. Cost

Aider itself is free. API costs are yours. With Claude Sonnet 4.5 and moderate use, expect $20-50/month per engineer.

## Conclusion

Aider is the AI pair programmer for QA engineers who live in the terminal. The git-first workflow, multi-model support, and repo-map make it uniquely productive for large test suites. See [claude-for-qa-engineers-complete-guide](/blog) and [continue-dev-qa-engineers-guide](/blog) for alternatives.
`,
};
