export interface BlogPost {
  title: string;
  description: string;
  date: string;
  category: string;
  content: string;
}

// Import all posts
import { post as mustHaveQaSkills } from './must-have-qa-skills-claude-code-2026';
import { post as aiAgentsChangingQa } from './how-ai-agents-changing-qa-testing';
import { post as playwrightGuide } from './playwright-e2e-complete-guide';
import { post as tddBestPractices } from './tdd-ai-agents-best-practices';
import { post as top10QaSkills } from './top-10-qa-skills-developers-2026';
import { post as cypressVsPlaywright } from './cypress-vs-playwright-2026';
import { post as fixFlakyTests } from './fix-flaky-tests-guide';
import { post as securityTestingAiCode } from './security-testing-ai-generated-code';
import { post as shiftLeftTesting } from './shift-left-testing-ai-agents';
import { post as apiTestingGuide } from './api-testing-complete-guide';
import { post as seleniumVsPlaywright } from './selenium-vs-playwright-2026';
import { post as jestVsVitest } from './jest-vs-vitest-2026';
import { post as playwrightTutorial } from './playwright-tutorial-beginners-2026';
import { post as cicdPipeline } from './cicd-testing-pipeline-github-actions';
import { post as aiTestAutomation } from './ai-test-automation-tools-2026';

// Original posts
const introducingQaskills: BlogPost = {
  title: 'Introducing QA Skills \u2014 Agent Skills for Testing',
  description:
    'Why we built the first QA-specific skills directory for AI coding agents.',
  date: '2026-02-10',
  category: 'Announcement',
  content: `
Among 49,000+ skills indexed on existing agent skill platforms, only a handful are dedicated to QA testing. We saw an opportunity.

## The Problem

AI coding agents like Claude Code, Cursor, and Copilot are incredibly powerful general-purpose tools. But when it comes to QA testing, they lack the specialized knowledge that experienced test engineers bring:

- **Framework-specific patterns**: Page Object Model for Playwright, custom commands for Cypress, fixtures for pytest
- **Testing strategy**: When to use E2E vs integration vs unit tests
- **Best practices**: Proper assertions, test isolation, flaky test prevention

## The Solution

QA Skills is a curated directory of testing-specific skills that you can install into any AI coding agent with a single command:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

This installs expert Playwright knowledge into your AI agent. Now when you ask it to write tests, it follows proven patterns and best practices.

## What's Available

We're launching with 20 curated skills covering:

- **E2E Testing**: Playwright, Cypress, Selenium
- **API Testing**: REST Assured, Postman, Playwright API
- **Performance**: k6, JMeter
- **Security**: OWASP patterns
- **And more**: Accessibility, visual regression, contract testing, BDD

## Get Started

Browse our skills directory at [qaskills.sh/skills](/skills) or install one now:

\`\`\`bash
npx @qaskills/cli search
\`\`\`
`,
};

const playwrightBestPractices: BlogPost = {
  title: 'Playwright E2E Best Practices for AI Agents',
  description:
    'How our Playwright E2E skill teaches AI agents to write robust, maintainable end-to-end tests.',
  date: '2026-02-08',
  category: 'Tutorial',
  content: `
Writing E2E tests that are fast, reliable, and maintainable is hard. Teaching an AI agent to do it well is even harder. Here's how the Playwright E2E skill approaches this challenge.

## Page Object Model

The skill teaches AI agents to always use the Page Object Model pattern. Instead of writing raw selectors in tests, it creates reusable page classes:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Once installed, your AI agent structures every test with proper page objects, separating selectors from test logic.

## Auto-Waiting Locators

One of the most common mistakes in E2E testing is using fragile selectors and manual waits. The skill teaches agents to use Playwright's built-in auto-waiting locators like \`getByRole\`, \`getByText\`, and \`getByTestId\` instead of raw CSS selectors.

## Fixture-Based Setup

The skill guides agents to use Playwright's fixture system for test setup and teardown. This ensures tests are isolated and don't share state, which prevents flaky failures.

## Cross-Browser Testing

The skill includes patterns for configuring tests to run across Chromium, Firefox, and WebKit, with proper browser-specific handling when needed.

## What You Get

After installing the Playwright E2E skill:

- **Consistent patterns**: Every test follows the same structure
- **Better selectors**: Accessible, resilient locator strategies
- **Proper assertions**: Using Playwright's built-in expect assertions
- **Test isolation**: Each test runs independently with proper fixtures

Try it yourself:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`
`,
};

const aiAgentsRevolution: BlogPost = {
  title: 'The AI Agent Revolution in QA Testing',
  description:
    'How AI coding agents are transforming QA, and why they need specialized testing knowledge.',
  date: '2026-02-05',
  category: 'Industry',
  content: `
AI coding agents are changing how software gets built. But QA testing presents unique challenges that generic AI knowledge can't solve well. Here's why specialized QA skills matter.

## The State of AI in QA

AI agents can now write code, debug issues, and refactor applications with impressive accuracy. But when asked to write tests, they often produce:

- **Brittle selectors**: Using IDs and CSS paths that break on every UI change
- **Missing edge cases**: Only testing the happy path
- **Poor test structure**: Mixing setup, action, and assertion without clear separation
- **No test strategy**: Writing E2E tests where unit tests would suffice

## Why Specialized Knowledge Matters

A senior QA engineer brings years of hard-won knowledge about testing patterns, framework idioms, and testing strategy. This knowledge can't be learned from reading documentation alone \u2014 it comes from real-world experience debugging flaky tests, scaling test suites, and building reliable CI pipelines.

## The Skills Approach

QA Skills bridges this gap by encoding expert QA knowledge into installable skills. When you install a skill like \`playwright-e2e\`, your AI agent gains:

- **Framework expertise**: Deep knowledge of Playwright APIs, patterns, and idioms
- **Testing patterns**: Page Object Model, fixtures, factory patterns, and more
- **Strategy guidance**: When to use which testing approach
- **Best practices**: From real-world test suites and QA teams

## The Future

We believe the future of QA is AI agents augmented with specialized testing knowledge. Not replacing QA engineers, but amplifying their expertise across entire organizations.

## Try It Now

Give your AI agent QA superpowers:

\`\`\`bash
npx @qaskills/cli add playwright-e2e
\`\`\`

Browse all 45+ skills at [qaskills.sh/skills](/skills).
`,
};

export const posts: Record<string, BlogPost> = {
  'introducing-qaskills': introducingQaskills,
  'playwright-e2e-best-practices': playwrightBestPractices,
  'ai-agents-qa-revolution': aiAgentsRevolution,
  'must-have-qa-skills-claude-code-2026': mustHaveQaSkills,
  'how-ai-agents-changing-qa-testing': aiAgentsChangingQa,
  'playwright-e2e-complete-guide': playwrightGuide,
  'tdd-ai-agents-best-practices': tddBestPractices,
  'top-10-qa-skills-developers-2026': top10QaSkills,
  'cypress-vs-playwright-2026': cypressVsPlaywright,
  'fix-flaky-tests-guide': fixFlakyTests,
  'security-testing-ai-generated-code': securityTestingAiCode,
  'shift-left-testing-ai-agents': shiftLeftTesting,
  'api-testing-complete-guide': apiTestingGuide,
  'selenium-vs-playwright-2026': seleniumVsPlaywright,
  'jest-vs-vitest-2026': jestVsVitest,
  'playwright-tutorial-beginners-2026': playwrightTutorial,
  'cicd-testing-pipeline-github-actions': cicdPipeline,
  'ai-test-automation-tools-2026': aiTestAutomation,
};

// Ordered list for the blog listing page (newest first)
export const postList = [
  {
    slug: 'ai-test-automation-tools-2026',
    ...aiTestAutomation,
  },
  {
    slug: 'cicd-testing-pipeline-github-actions',
    ...cicdPipeline,
  },
  {
    slug: 'playwright-tutorial-beginners-2026',
    ...playwrightTutorial,
  },
  {
    slug: 'jest-vs-vitest-2026',
    ...jestVsVitest,
  },
  {
    slug: 'selenium-vs-playwright-2026',
    ...seleniumVsPlaywright,
  },
  {
    slug: 'api-testing-complete-guide',
    ...apiTestingGuide,
  },
  {
    slug: 'shift-left-testing-ai-agents',
    ...shiftLeftTesting,
  },
  {
    slug: 'security-testing-ai-generated-code',
    ...securityTestingAiCode,
  },
  {
    slug: 'fix-flaky-tests-guide',
    ...fixFlakyTests,
  },
  {
    slug: 'cypress-vs-playwright-2026',
    ...cypressVsPlaywright,
  },
  {
    slug: 'must-have-qa-skills-claude-code-2026',
    ...mustHaveQaSkills,
  },
  {
    slug: 'how-ai-agents-changing-qa-testing',
    ...aiAgentsChangingQa,
  },
  {
    slug: 'playwright-e2e-complete-guide',
    ...playwrightGuide,
  },
  {
    slug: 'tdd-ai-agents-best-practices',
    ...tddBestPractices,
  },
  {
    slug: 'top-10-qa-skills-developers-2026',
    ...top10QaSkills,
  },
  {
    slug: 'introducing-qaskills',
    ...introducingQaskills,
  },
  {
    slug: 'playwright-e2e-best-practices',
    ...playwrightBestPractices,
  },
  {
    slug: 'ai-agents-qa-revolution',
    ...aiAgentsRevolution,
  },
];
