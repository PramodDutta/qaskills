import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cursor + Playwright Skill: Setup Guide 2026',
  description:
    'Step-by-step setup guide for using Cursor with Playwright. Skills, page objects, MCP server, test generation workflow, parallel CI, and complete project setup in under an hour for 2026.',
  date: '2026-05-21',
  category: 'Tutorial',
  content: `
# Cursor + Playwright Skill: Setup Guide 2026

Pairing Cursor with Playwright produces one of the most productive QA setups available in 2026. Cursor brings AI assistance at every layer of the editor; Playwright brings cross-browser automation with auto-waiting, tracing, and parallel execution. The connecting tissue is the playwright-tests SKILL.md from the QASkills directory, which encodes your team's conventions and tells Cursor exactly how to generate page objects, test files, and fixtures that match your house style.

This tutorial walks through setting up the full stack from a clean machine: Cursor installation, Playwright project bootstrap, .cursorrules authoring, QASkills CLI installation, skill installation, MCP server configuration, and the complete workflow for generating, running, and debugging tests. By the end you will have a working AI-augmented Playwright setup ready to scale.

The setup takes 45-60 minutes the first time. Subsequent projects can reuse the same .cursorrules and SKILL.md, so additional setups take under 10 minutes.

## Key Takeaways

- **Install Cursor** as the primary editor.
- **Bootstrap Playwright** with TypeScript and the latest browsers.
- **Write .cursorrules** at the project root.
- **Install the playwright-tests SKILL.md** via QASkills CLI.
- **Configure the Playwright MCP server** for live browser control.

---

## 1. Install Cursor

Download from cursor.sh. Sign in with the Pro plan ($20/month) to access Claude Sonnet 4.5.

\`\`\`bash
cursor --version
\`\`\`

## 2. Bootstrap Playwright Project

\`\`\`bash
mkdir my-playwright-tests && cd my-playwright-tests
npm init -y
npm install --save-dev @playwright/test typescript ts-node @types/node
npx playwright install --with-deps
npx tsc --init
\`\`\`

Set strict mode in tsconfig.json:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
\`\`\`

## 3. Create Playwright Config

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
})
\`\`\`

## 4. Author .cursorrules

\`\`\`
You are a QA engineer for the example.com SaaS application.

Project conventions:
- Tests live in tests/e2e/.
- Page objects in src/pages/ extend BasePage.
- Selectors: getByRole > getByLabel > getByTestId > none.
- No waitForTimeout; rely on auto-waiting and expect polls.
- Test data in tests/fixtures/ as JSON.
- TypeScript strict mode, single quotes, no semicolons.

When generating:
- One test.describe per user story.
- One test per acceptance criterion.
- Use test.beforeEach for shared setup.
- Tag slow tests with test.slow().
- Always assert URL change after navigation.
\`\`\`

## 5. Install QASkills CLI

\`\`\`bash
npm install -g @qaskills/cli
npx @qaskills/cli init --agent cursor
\`\`\`

## 6. Install the Playwright Skill

\`\`\`bash
npx @qaskills/cli add playwright-tests
npx @qaskills/cli add playwright-page-objects
npx @qaskills/cli list
\`\`\`

Skills install to .cursor/skills/.

## 7. Create the BasePage

\`\`\`typescript
// src/pages/BasePage.ts
import { Page, expect } from '@playwright/test'

export abstract class BasePage {
  constructor(protected page: Page) {}

  async expectLoaded(headingText: string | RegExp) {
    await expect(this.page.getByRole('heading', { level: 1 })).toHaveText(headingText)
  }
}
\`\`\`

## 8. First AI-Generated Page Object

Open Cursor in the project. Press Cmd+I to open Composer. Prompt:

> Read the .cursorrules and the playwright-page-objects skill. Generate a LoginPage at src/pages/LoginPage.ts with methods: goto, fillEmail, fillPassword, submit, signInAs(email, password).

Cursor produces:

\`\`\`typescript
// src/pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    super(page)
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: 'Sign in' })
  }

  async goto() {
    await this.page.goto('/signin')
    await this.expectLoaded(/sign in/i)
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
  }

  async signInAs(email: string, password: string) {
    await this.goto()
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
    await expect(this.page).toHaveURL(/dashboard/)
  }
}
\`\`\`

## 9. First AI-Generated Test

Composer prompt:

> Generate a Playwright test at tests/e2e/auth/signin.spec.ts covering: valid sign-in, invalid email, wrong password, locked account.

Cursor produces the test file with 4 scenarios, page object usage, and proper assertions.

## 10. Configure Playwright MCP Server

In Cursor settings, add the MCP server:

\`\`\`json
{
  "playwright": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-playwright"]
  }
}
\`\`\`

Now Cursor can drive a real browser:

> Open https://example.com/signin in headed mode, fill the form, and take a screenshot.

## 11. Workflow: Bug Reproduction

Paste a bug report:

> Bug: After clicking "Apply discount" with code SAVE10, the cart total shows the original price for 2 seconds before updating. Reproduce as a Playwright test that fails on the timing issue.

Cursor generates a test that verifies the update is instant.

## 12. Workflow: Refactor After UI Change

> The signup form moved from a single page to a multi-step wizard. Update src/pages/SignupPage.ts to match the new flow and fix all tests in tests/e2e/auth/ that reference signup.

Composer reads existing files, makes the changes, and shows a multi-file diff.

## 13. CI Integration

\`\`\`yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-22.04
    strategy:
      matrix: { shardIndex: [1, 2, 3, 4], shardTotal: [4] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=\${{ matrix.shardIndex }}/\${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report-\${{ matrix.shardIndex }}, path: playwright-report/ }
\`\`\`

## 14. Common Gotchas

| Gotcha | Solution |
|---|---|
| Cursor not reading .cursorrules | Restart editor, file must be at git root |
| Skill not applied | Check .cursor/skills/ exists, restart Cursor |
| MCP server times out | Reduce server scope, simplify config |
| Generated tests fail | Update .cursorrules to match current routes |

## Conclusion

Cursor + Playwright + QASkills is a production-grade AI-augmented test setup. Once configured, generating new tests becomes a 30-second task. See [cursor-skills-md-best-practices](/blog) for SKILL.md authoring details and [cursor-for-qa-engineers-complete-guide](/blog) for broader Cursor patterns.
`,
};
