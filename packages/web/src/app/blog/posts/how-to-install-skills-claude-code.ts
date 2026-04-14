import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Install Skills into Claude Code: Complete Guide',
  description:
    'Step-by-step guide to installing QA skills into Claude Code. Covers the QASkills CLI, SKILL.md format, project vs global installation, skill discovery, agent detection, and best practices for enhancing AI test generation.',
  date: '2026-04-13',
  category: 'Tutorial',
  content: `
Claude Code is Anthropic's command-line AI coding agent. It understands your entire project, can read and write files, run commands, and generate production-quality code. But by default, Claude Code has general-purpose knowledge -- it does not know your team's specific testing patterns, your preferred framework idioms, or the anti-patterns you want to avoid.

That is where QA skills come in. A QA skill is a structured markdown file (SKILL.md) that teaches Claude Code framework-specific testing knowledge. When you install a skill into Claude Code, every test it generates will follow the patterns, conventions, and best practices defined in that skill.

This tutorial walks you through the complete process: installing the QASkills CLI, discovering skills, installing them into Claude Code, verifying the installation, and managing your skill library over time.

## What You Will Learn

- How to install the QASkills CLI
- How to search and discover QA skills on [QASkills.sh](/skills)
- How to install skills into Claude Code at the project or global level
- How skills are stored and how Claude Code reads them
- How to update, remove, and manage installed skills
- Best practices for combining multiple skills

## Prerequisites

- **Node.js 18+** installed (check with \`node --version\`)
- **Claude Code** installed and configured (check with \`claude --version\`)
- A terminal or command line
- A project directory where you want to install skills

---

## Step 1: Install the QASkills CLI

The QASkills CLI is the primary tool for discovering and installing QA skills. Install it globally with npm:

\`\`\`bash
npm install -g qaskills
\`\`\`

Verify the installation:

\`\`\`bash
npx qaskills --version
\`\`\`

You can also use the CLI without global installation by prefixing commands with \`npx\`:

\`\`\`bash
npx qaskills search "playwright"
\`\`\`

---

## Step 2: Understand How Skills Work with Claude Code

Before installing skills, it helps to understand the mechanism.

### What is a SKILL.md File?

A SKILL.md file is a markdown document with YAML frontmatter that contains structured testing knowledge. The frontmatter includes metadata (name, version, framework, testing type), and the markdown body contains the actual knowledge: principles, patterns, code examples, anti-patterns, and decision rules.

### How Claude Code Reads Skills

Claude Code reads SKILL.md files from specific directories in your project. When you ask Claude Code to generate tests, it uses the knowledge from installed skills to produce framework-idiomatic code that follows your team's patterns.

The QASkills CLI knows where Claude Code looks for skills and installs them in the correct location automatically. You do not need to manually place files or configure anything.

### Project vs Global Installation

- **Project-level skills** are installed in your project directory and apply only to that project. This is the default and recommended approach.
- **Global skills** are installed in Claude Code's global configuration directory and apply to all projects. Use this for skills that you want available everywhere.

---

## Step 3: Discover Skills

### Browse the Web Directory

The fastest way to discover skills is to visit [QASkills.sh](/skills) and browse by category, framework, or testing type. Each skill has a detail page showing its description, compatibility, quality score, and install command.

### Search from the CLI

Use the \`search\` command to find skills from your terminal:

\`\`\`bash
# Search by keyword
npx qaskills search "playwright"

# Search by testing type
npx qaskills search "e2e testing"

# Search by framework
npx qaskills search "cypress"

# Search by domain
npx qaskills search "api testing"
\`\`\`

The search results show the skill name, description, framework compatibility, and quality score. Higher quality scores indicate more comprehensive, well-structured skills.

### List Available Categories

\`\`\`bash
# View all skill categories
npx qaskills list
\`\`\`

---

## Step 4: Install a Skill into Claude Code

### Basic Installation

To install a skill, use the \`add\` command with the skill's slug (its URL-friendly name):

\`\`\`bash
# Install a specific skill
npx qaskills add playwright-e2e-testing
\`\`\`

The CLI will:
1. Detect that Claude Code is available on your system
2. Download the skill from the QASkills registry
3. Install the SKILL.md file in the correct location for Claude Code
4. Confirm the installation with the file path

### Install Multiple Skills

You can install multiple skills in sequence:

\`\`\`bash
# Install a complete testing skill set
npx qaskills add playwright-e2e-testing
npx qaskills add api-testing-patterns
npx qaskills add visual-regression-testing
npx qaskills add test-data-management
\`\`\`

### Specify the Agent Explicitly

If the CLI does not auto-detect Claude Code, you can specify it explicitly:

\`\`\`bash
npx qaskills add playwright-e2e-testing --agent claude-code
\`\`\`

### Global Installation

To install a skill globally (available across all projects):

\`\`\`bash
npx qaskills add playwright-e2e-testing --global
\`\`\`

---

## Step 5: Verify the Installation

After installing a skill, verify that it is in place:

\`\`\`bash
# List all installed skills
npx qaskills list
\`\`\`

You can also verify by checking the skill file directly. For Claude Code project-level installations, the skill is stored in your project's \`.claude/skills/\` directory:

\`\`\`bash
# Check the installed skill file
ls -la .claude/skills/
\`\`\`

### Test the Skill

The best way to verify a skill is working is to ask Claude Code to generate a test:

\`\`\`bash
# Open Claude Code and ask it to generate a test
claude

# Then ask:
# "Write a Playwright E2E test for the login page
#  following the patterns from the installed skills"
\`\`\`

If the skill is installed correctly, Claude Code will generate a test that follows the patterns defined in the skill -- proper page object structure, correct locator strategies, appropriate assertions, and framework-idiomatic code.

---

## Step 6: Update and Manage Skills

### Update a Skill

Skills are versioned. To update to the latest version:

\`\`\`bash
npx qaskills update playwright-e2e-testing
\`\`\`

### Remove a Skill

To remove an installed skill:

\`\`\`bash
npx qaskills remove playwright-e2e-testing
\`\`\`

### View Skill Details

To see the full details of a skill before installing it:

\`\`\`bash
npx qaskills info playwright-e2e-testing
\`\`\`

This shows the skill's metadata, description, quality score, framework compatibility, and a preview of its content.

---

## Recommended Skill Combinations

Different projects benefit from different skill combinations. Here are recommended sets for common scenarios.

### For a Playwright + TypeScript Project

\`\`\`bash
npx qaskills add playwright-e2e-testing
npx qaskills add api-testing-patterns
npx qaskills add visual-regression-testing
npx qaskills add accessibility-testing
\`\`\`

### For a Cypress + JavaScript Project

\`\`\`bash
npx qaskills add cypress-testing-best-practices
npx qaskills add api-testing-patterns
npx qaskills add test-data-management
\`\`\`

### For a Selenium + Java Project

\`\`\`bash
npx qaskills add selenium-java-testing
npx qaskills add junit5-testing-patterns
npx qaskills add api-testing-patterns
\`\`\`

### For a Python + pytest Project

\`\`\`bash
npx qaskills add pytest-testing-patterns
npx qaskills add api-testing-patterns
npx qaskills add test-data-management
\`\`\`

### For a Full-Stack Project

\`\`\`bash
npx qaskills add playwright-e2e-testing
npx qaskills add vitest-unit-testing
npx qaskills add api-testing-patterns
npx qaskills add visual-regression-testing
npx qaskills add accessibility-testing
npx qaskills add test-data-management
\`\`\`

---

## How Skills Improve Test Quality

To understand why skills matter, consider the difference between AI-generated tests with and without skills.

### Without Skills: Generic Output

When Claude Code generates a Playwright test without skills installed, it produces correct but generic code:

\`\`\`bash
// Generic AI-generated test (no skills)
import { test, expect } from '@playwright/test';

test('login test', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
\`\`\`

This test works, but it uses CSS selectors instead of semantic locators, has hard-coded test data, no page object pattern, and no error handling.

### With Skills: Framework-Idiomatic Output

With Playwright E2E testing skills installed, Claude Code generates significantly better code:

\`\`\`bash
// Skill-enhanced AI-generated test
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';
import { createTestUser } from './fixtures/user-factory';

test.describe('Authentication', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('user can log in with valid credentials', async () => {
    const user = createTestUser();
    await loginPage.goto();
    await loginPage.login(user.email, user.password);
    await dashboardPage.expectToBeVisible();
    await dashboardPage.expectWelcomeMessage(user.name);
  });

  test('shows error for invalid credentials', async () => {
    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'wrong');
    await loginPage.expectErrorMessage('Invalid credentials');
  });
});
\`\`\`

The skill-enhanced version uses page objects, test data factories, semantic assertions, proper test structure, and multiple test cases including error scenarios.

---

## Troubleshooting

### Skill Not Detected by Claude Code

If Claude Code does not seem to use installed skills:

1. Verify the skill file exists in \`.claude/skills/\`
2. Restart Claude Code to pick up new skill files
3. Explicitly reference the skill in your prompt: "Use the installed Playwright testing skill"

### CLI Cannot Detect Claude Code

If the CLI does not auto-detect Claude Code:

1. Verify Claude Code is installed: \`claude --version\`
2. Use the explicit agent flag: \`--agent claude-code\`
3. Check that Claude Code's configuration directory exists

### Skill Version Conflicts

If you have multiple skills that cover overlapping areas:

1. Skills do not conflict -- Claude Code reads all installed skills and combines them
2. If patterns contradict, the more specific skill takes precedence
3. You can remove overlapping skills with \`npx qaskills remove <slug>\`

---

## Best Practices

1. **Install skills at the project level** -- Different projects have different frameworks and conventions. Project-level skills ensure Claude Code generates appropriate code for each project.

2. **Start with framework-specific skills** -- Your primary testing framework skill (Playwright, Cypress, pytest, etc.) provides the most impact. Add specialized skills (API testing, visual testing) afterward.

3. **Keep skills updated** -- Run \`npx qaskills update\` periodically to get the latest patterns and best practices.

4. **Combine 3-5 skills per project** -- Too few skills and Claude Code falls back to generic patterns. Too many skills can cause information overload. 3-5 well-chosen skills is the sweet spot.

5. **Review AI-generated tests** -- Skills dramatically improve quality, but always review generated tests for business logic correctness and edge cases.

6. **Share skill configurations with your team** -- Document which skills your project uses in your README so all team members install the same set.

---

## What is Inside a SKILL.md File

Understanding the skill format helps you evaluate quality and even create your own skills. A SKILL.md file has two parts:

### YAML Frontmatter

The frontmatter contains metadata that helps with discovery and categorization:

\`\`\`bash
---
name: Playwright E2E Testing
description: Best practices for E2E testing with Playwright
version: 1.2.0
author: QASkills Community
tags:
  - playwright
  - e2e
  - testing
testingTypes:
  - e2e
  - integration
frameworks:
  - playwright
languages:
  - typescript
  - javascript
domains:
  - web
agents:
  - claude-code
  - cursor
  - windsurf
---
\`\`\`

### Markdown Body

The body contains the actual testing knowledge: principles, code examples, anti-patterns, decision rules, and project structure recommendations. A high-quality skill is specific, actionable, and teaches the AI agent how to make decisions -- not just what syntax to use.

---

## Next Steps

1. **Install your first skill**: \`npx qaskills add playwright-e2e-testing\`
2. **Browse the full catalog**: Visit [QASkills.sh](/skills) to explore 450+ skills
3. **Generate your first test**: Open Claude Code and ask it to write a test using the installed skill
4. **Publish your own skill**: If you have testing expertise to share, see the [publisher guide](/how-to-publish)

QA skills turn Claude Code from a general-purpose coding agent into a testing specialist that knows your frameworks, follows your patterns, and avoids your anti-patterns. The investment is a single CLI command per skill, and the payoff is dramatically better AI-generated tests for your entire team.
`,
};
