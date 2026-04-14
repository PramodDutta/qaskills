import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Install QA Skills into Cursor: Step-by-Step Guide',
  description:
    'Complete step-by-step guide to installing QA skills into Cursor IDE. Covers the QASkills CLI, .cursorrules configuration, project-level setup, skill discovery, and best practices for AI-powered test generation in Cursor.',
  date: '2026-04-13',
  category: 'Tutorial',
  content: `
Cursor is an AI-powered code editor built on VS Code that has become one of the most popular development environments in 2026. Its built-in AI assistant can generate, edit, and refactor code -- including test code. But like any AI model, Cursor's test generation improves dramatically when you give it framework-specific testing knowledge.

QA skills are structured markdown files that teach AI agents how to write better tests. When you install QA skills into Cursor, the AI assistant gains knowledge about your specific testing framework, preferred patterns, locator strategies, and anti-patterns to avoid. The result is test code that looks like it was written by a senior QA engineer on your team.

This tutorial covers everything you need to know: installing the QASkills CLI, discovering relevant skills, installing them into Cursor, configuring rules files, verifying the setup, and managing your skills over time.

## What You Will Learn

- How QA skills integrate with Cursor's AI features
- How to install the QASkills CLI
- How to discover and install skills for your testing framework
- How Cursor reads skill files and rules
- How to verify skills are improving your test generation
- Best practices for combining skills in Cursor projects

## Prerequisites

- **Cursor** installed (version 0.40+ recommended)
- **Node.js 18+** installed (check with \`node --version\`)
- A project directory with an existing testing setup (or a new project)
- Basic familiarity with Cursor's AI features (Cmd+K, Composer, Chat)

---

## Step 1: Understand How Skills Work with Cursor

### Cursor's AI Context System

Cursor uses several sources of context to inform its AI responses:

1. **Open files** -- The files currently open in your editor
2. **Codebase indexing** -- Cursor indexes your project for semantic search
3. **Rules files** -- \`.cursorrules\` (project root) or \`.cursor/rules/\` directory files provide persistent instructions
4. **Referenced files** -- Files you explicitly mention with @ in prompts

QA skills work through the rules system. When you install a skill into Cursor, it places the skill content where Cursor's AI can read it as persistent context. This means every AI interaction benefits from the testing knowledge without you having to mention it explicitly.

### What Changes After Installing Skills

Before skills:
- Cursor generates generic test code based on its training data
- Tests use basic CSS selectors and minimal assertions
- No consistent patterns across generated tests
- Missing edge cases and error scenarios

After skills:
- Cursor generates framework-idiomatic test code
- Tests use semantic locators (getByRole, getByLabel, getByTestId)
- Consistent page object patterns and test structure
- Includes error scenarios, boundary conditions, and proper assertions

---

## Step 2: Install the QASkills CLI

The QASkills CLI handles skill discovery, download, and installation. Install it with npm:

\`\`\`bash
npm install -g qaskills
\`\`\`

Or use it without global installation via npx:

\`\`\`bash
npx qaskills --version
\`\`\`

---

## Step 3: Discover Skills for Your Project

### Browse the Web Catalog

Visit [QASkills.sh](/skills) to browse the full catalog of 450+ QA skills. You can filter by:

- **Framework**: Playwright, Cypress, Selenium, pytest, JUnit, Vitest, and more
- **Testing type**: E2E, unit, integration, API, visual, performance, accessibility
- **Language**: TypeScript, JavaScript, Python, Java, C#
- **Agent compatibility**: Cursor, Claude Code, Windsurf, GitHub Copilot

Each skill page shows the description, quality score, installation command, and a preview of the content.

### Search from the Terminal

\`\`\`bash
# Search for Playwright skills
npx qaskills search "playwright"

# Search for API testing skills
npx qaskills search "api testing"

# Search for skills compatible with Cursor
npx qaskills search "cursor"

# View all available categories
npx qaskills list
\`\`\`

### Evaluate Skills Before Installing

Use the \`info\` command to see full details about a skill:

\`\`\`bash
npx qaskills info playwright-e2e-testing
\`\`\`

This shows:
- Name, version, and author
- Testing types and framework compatibility
- Quality score (higher is better)
- Languages and agent compatibility
- A content preview

---

## Step 4: Install Skills into Cursor

### Basic Installation

Install a skill with the \`add\` command. The CLI auto-detects Cursor and installs the skill in the correct location:

\`\`\`bash
# Navigate to your project directory first
cd /path/to/your/project

# Install a skill
npx qaskills add playwright-e2e-testing
\`\`\`

If Cursor is detected, the CLI installs the skill where Cursor's AI can read it. If auto-detection fails, specify the agent explicitly:

\`\`\`bash
npx qaskills add playwright-e2e-testing --agent cursor
\`\`\`

### Install a Recommended Set of Skills

For a comprehensive testing setup, install multiple complementary skills:

\`\`\`bash
# For a Playwright + TypeScript project
npx qaskills add playwright-e2e-testing
npx qaskills add api-testing-patterns
npx qaskills add visual-regression-testing
npx qaskills add accessibility-testing

# For a Cypress + JavaScript project
npx qaskills add cypress-testing-best-practices
npx qaskills add api-testing-patterns
npx qaskills add test-data-management

# For a Python + pytest project
npx qaskills add pytest-testing-patterns
npx qaskills add api-testing-patterns
\`\`\`

---

## Step 5: Configure Cursor Rules (Optional Enhancement)

While the QASkills CLI handles the basic installation, you can enhance Cursor's AI behavior further by configuring rules files.

### Project-Level Rules

Create a \`.cursorrules\` file in your project root to provide Cursor with project-specific testing instructions:

\`\`\`bash
# .cursorrules
# This file is read by Cursor to customize AI behavior

## Testing Guidelines

When generating tests for this project:

1. Use Playwright with TypeScript for all E2E tests
2. Follow the Page Object Model pattern in tests/pages/
3. Use semantic locators (getByRole, getByLabel, getByTestId)
4. Generate test data with factories in tests/fixtures/
5. Include both happy path and error scenarios
6. Use the patterns from installed QA skills

## Project Structure

- tests/e2e/ - End-to-end tests
- tests/pages/ - Page object classes
- tests/fixtures/ - Test data factories
- tests/utils/ - Shared test utilities
\`\`\`

### Rules Directory

For more granular control, use the \`.cursor/rules/\` directory to organize rules by topic:

\`\`\`bash
.cursor/
  rules/
    testing.md        # General testing rules
    playwright.md     # Playwright-specific patterns
    api-testing.md    # API testing conventions
\`\`\`

Each file in the rules directory is read by Cursor and combined with installed skills to form the AI's context.

---

## Step 6: Verify the Installation

### Check Installed Skills

\`\`\`bash
npx qaskills list
\`\`\`

This shows all skills installed in the current project, including their versions and installation locations.

### Test with Cursor's AI

The best verification is to generate a test and check the output quality. Open Cursor and try these prompts:

**Using Cmd+K (inline edit):**
Select an empty test file and press Cmd+K, then type:
"Write a Playwright E2E test for the user registration flow"

**Using Composer (multi-file):**
Open Composer (Cmd+Shift+I) and type:
"Create a complete Playwright test suite for the checkout flow with page objects, fixtures, and both success and error scenarios"

**Using Chat (Cmd+L):**
Ask Cursor's chat: "What testing patterns should I follow for this project?"

If skills are installed correctly, Cursor's responses will reference framework-specific patterns, use proper locator strategies, and follow the page object model.

### Before and After Comparison

**Without skills installed (generic output):**

\`\`\`bash
// Generic test - no skills
import { test, expect } from '@playwright/test';

test('registration', async ({ page }) => {
  await page.goto('/register');
  await page.fill('#name', 'John');
  await page.fill('#email', 'john@test.com');
  await page.fill('#password', 'pass123');
  await page.click('#submit');
  await expect(page).toHaveURL('/dashboard');
});
\`\`\`

**With skills installed (framework-idiomatic output):**

\`\`\`bash
// Skill-enhanced test - follows installed patterns
import { test, expect } from '@playwright/test';
import { RegistrationPage } from '../pages/registration-page';
import { DashboardPage } from '../pages/dashboard-page';
import { generateUser } from '../fixtures/user-factory';

test.describe('User Registration', () => {
  let registrationPage: RegistrationPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('successfully registers with valid information', async () => {
    const user = generateUser();
    await registrationPage.goto();
    await registrationPage.fillForm(user);
    await registrationPage.submit();
    await dashboardPage.expectToBeVisible();
    await dashboardPage.expectWelcomeMessage(user.name);
  });

  test('shows validation errors for empty fields', async () => {
    await registrationPage.goto();
    await registrationPage.submit();
    await registrationPage.expectValidationError('Name is required');
    await registrationPage.expectValidationError('Email is required');
  });

  test('shows error for duplicate email', async () => {
    const existingUser = generateUser({ email: 'existing@example.com' });
    await registrationPage.goto();
    await registrationPage.fillForm(existingUser);
    await registrationPage.submit();
    await registrationPage.expectErrorMessage('Email already registered');
  });
});
\`\`\`

The difference is substantial: page objects, factories, multiple test cases, error scenarios, and framework-idiomatic patterns.

---

## Step 7: Manage Skills Over Time

### Update Skills

Skills are versioned and improved over time. Update to the latest version:

\`\`\`bash
# Update a specific skill
npx qaskills update playwright-e2e-testing

# Update all installed skills
npx qaskills update
\`\`\`

### Remove Skills

If you switch frameworks or no longer need a skill:

\`\`\`bash
npx qaskills remove playwright-e2e-testing
\`\`\`

### View Skill Content

To read the full content of an installed skill:

\`\`\`bash
npx qaskills info playwright-e2e-testing --full
\`\`\`

---

## Using Skills with Cursor's AI Features

### Cmd+K (Inline Generation)

When you use Cmd+K to generate code inline, Cursor considers installed skills as context. This is ideal for:

- Generating individual test functions
- Adding assertions to existing tests
- Creating page object methods
- Writing test utilities

**Tip:** Select an existing test as context (highlight it) before pressing Cmd+K. Cursor will match the style of your selected code plus the patterns from installed skills.

### Composer (Multi-File Generation)

Cursor's Composer mode is the most powerful way to leverage skills because it can create multiple files at once:

- Complete test suites with page objects and fixtures
- Test infrastructure setup (configuration, helpers, factories)
- Migration from one framework to another

**Example Composer prompt:**
"Create a complete E2E test suite for the shopping cart feature. Include page objects for the product listing page, cart page, and checkout page. Use test data factories for products and users. Cover add to cart, remove from cart, quantity updates, and checkout flow."

### Chat (Cmd+L)

Use Cursor's chat to ask questions about testing strategy:

- "What testing patterns are recommended for this project?"
- "How should I structure my page objects for this application?"
- "What edge cases should I test for the payment flow?"

Skills inform the chat responses, so you get framework-specific advice rather than generic testing guidance.

---

## Recommended Skill Sets by Project Type

### React + Playwright + Vitest

\`\`\`bash
npx qaskills add playwright-e2e-testing
npx qaskills add vitest-unit-testing
npx qaskills add api-testing-patterns
npx qaskills add accessibility-testing
npx qaskills add visual-regression-testing
\`\`\`

### Next.js Full-Stack

\`\`\`bash
npx qaskills add playwright-e2e-testing
npx qaskills add vitest-unit-testing
npx qaskills add api-testing-patterns
npx qaskills add test-data-management
\`\`\`

### Vue + Cypress

\`\`\`bash
npx qaskills add cypress-testing-best-practices
npx qaskills add vitest-unit-testing
npx qaskills add api-testing-patterns
\`\`\`

### Python Django/FastAPI

\`\`\`bash
npx qaskills add pytest-testing-patterns
npx qaskills add api-testing-patterns
npx qaskills add test-data-management
\`\`\`

### Mobile (React Native)

\`\`\`bash
npx qaskills add detox-mobile-testing
npx qaskills add jest-unit-testing
npx qaskills add api-testing-patterns
\`\`\`

---

## Troubleshooting

### Skills Not Affecting Cursor Output

1. **Restart Cursor** after installing skills to ensure the AI picks up new context
2. **Check file placement** -- verify skills are in the expected directory
3. **Reference skills explicitly** -- add "@skills" or mention the skill name in your prompt
4. **Re-index the project** -- Cursor may need to re-index to include new files

### CLI Does Not Detect Cursor

1. Verify Cursor is installed and accessible
2. Use the explicit flag: \`npx qaskills add <skill> --agent cursor\`
3. Check that you are running the command from within your project directory

### Conflicting Patterns Between Skills

Skills are designed to be complementary, not conflicting. If you notice inconsistent output:

1. Review installed skills with \`npx qaskills list\`
2. Remove skills that overlap with \`npx qaskills remove <slug>\`
3. Keep the most specific skill for your framework and add general skills for other testing types

---

## Best Practices

1. **Install skills at the project level** -- Each project has different frameworks and conventions. Project-level skills keep AI suggestions relevant.

2. **Start with 3-5 skills** -- One framework-specific skill plus 2-4 testing-type skills (API, visual, accessibility, data management) provides comprehensive coverage without overloading the AI.

3. **Combine skills with .cursorrules** -- Use skills for framework knowledge and .cursorrules for project-specific conventions (directory structure, naming, team patterns).

4. **Update skills regularly** -- Run \`npx qaskills update\` monthly to get the latest patterns and improvements.

5. **Share your skill set with the team** -- Document which skills are installed in your project README so all developers have consistent AI-generated tests.

6. **Review generated tests** -- Skills improve quality significantly, but always review AI-generated tests for correctness, especially business logic and edge cases.

7. **Contribute back** -- If you develop testing patterns that would benefit others, consider publishing them as skills on [QASkills.sh](/skills). See the [publisher guide](/how-to-publish) for details.

---

## Next Steps

1. **Install your first skill**: Run \`npx qaskills add playwright-e2e-testing\` (or your framework of choice)
2. **Generate a test**: Use Cursor's Composer to create a test suite and compare the quality
3. **Browse more skills**: Visit [QASkills.sh](/skills) to explore the full catalog of 450+ skills
4. **Configure rules**: Create a \`.cursorrules\` file to combine skills with project-specific instructions
5. **Share with your team**: Add skill installation instructions to your project setup documentation

Installing QA skills into Cursor takes less than a minute per skill and immediately improves the quality of every test the AI generates. It is the highest-leverage improvement you can make to your AI-assisted testing workflow.
`,
};
