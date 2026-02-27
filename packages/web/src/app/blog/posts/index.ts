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
import { post as vibeTestingGuide } from './vibe-testing-ai-first-qa-guide';
import { post as playwrightTestAgents } from './playwright-test-agents-claude-code';
import { post as testingAiGeneratedCode } from './testing-ai-generated-code-sdet-playbook';
import { post as autonomousTestingBuildVsBuy } from './autonomous-testing-agents-build-vs-buy';
import { post as mcpForQaEngineers } from './mcp-for-qa-engineers-guide';
import { post as k6VsJmeter } from './k6-vs-jmeter-performance-testing';
import { post as visualRegressionGuide } from './visual-regression-testing-guide';
import { post as apiContractTesting } from './api-contract-testing-microservices';
import { post as mobileTestingGuide } from './mobile-testing-automation-guide';
import { post as accessibilityTestingGuide } from './accessibility-testing-automation-guide';
import { post as mutationTestingGuide } from './mutation-testing-stryker-guide';
import { post as testDataManagement } from './test-data-management-strategies';
import { post as bddCucumberGuide } from './bdd-cucumber-testing-guide';
import { post as databaseTestingGuide } from './database-testing-automation-guide';
import { post as exploratoryTestingGuide } from './exploratory-testing-ai-agents-guide';
import { post as qaEngineerSkillsCareerGuide } from './qa-engineer-skills-career-guide-2026';
import { post as testingLegacyCodeGuide } from './testing-legacy-code-refactoring-guide';
import { post as playwrightVsPuppeteer } from './playwright-vs-puppeteer-2026';
import { post as testingInProduction } from './testing-in-production-strategies';
import { post as pytestGuide } from './pytest-testing-complete-guide';
import { post as seleniumGridDocker } from './selenium-grid-docker-parallel-testing';
import { post as postmanApiGuide } from './postman-api-testing-guide';
import { post as restAssuredGuide } from './rest-assured-java-api-testing';
import { post as regressionTestingGuide } from './regression-testing-strategies-guide';
import { post as smokeVsSanity } from './smoke-testing-vs-sanity-testing';
import { post as testCaseDesign } from './test-case-design-techniques-guide';
import { post as loadTestingGuide } from './load-testing-beginners-guide';
import { post as graphqlTestingGuide } from './graphql-testing-complete-guide';
import { post as chaosEngineeringGuide } from './chaos-engineering-resilience-testing';
import { post as websocketTestingGuide } from './websocket-testing-guide';
import { post as microservicesTestingGuide } from './microservices-testing-strategies';
import { post as testAutomationRoi } from './test-automation-roi-business-case';
import { post as crossBrowserGuide } from './cross-browser-testing-guide';
import { post as qaMetricsGuide } from './qa-metrics-kpis-dashboard-guide';
import { post as testPyramidGuide } from './test-pyramid-testing-strategy';
import { post as continuousTestingGuide } from './continuous-testing-devops-guide';
import { post as i18nTestingGuide } from './internationalization-testing-i18n-guide';
import { post as errorHandlingGuide } from './error-handling-testing-patterns';
import { post as apiMockingGuide } from './api-mocking-service-virtualization-guide';
import { post as testReportingGuide } from './test-reporting-allure-dashboards-guide';
import { post as performanceMonitoringGuide } from './performance-monitoring-testing-guide';
import { post as storybookTestingGuide } from './storybook-component-testing-guide';
import { post as testPlanningGuide } from './test-planning-strategy-guide';
import { post as codeReviewQaGuide } from './code-review-qa-testing-guide';
import { post as aiTestGenerationGuide } from './ai-test-generation-tools-guide';

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
  'vibe-testing-ai-first-qa-guide': vibeTestingGuide,
  'playwright-test-agents-claude-code': playwrightTestAgents,
  'testing-ai-generated-code-sdet-playbook': testingAiGeneratedCode,
  'autonomous-testing-agents-build-vs-buy': autonomousTestingBuildVsBuy,
  'mcp-for-qa-engineers-guide': mcpForQaEngineers,
  'k6-vs-jmeter-performance-testing': k6VsJmeter,
  'visual-regression-testing-guide': visualRegressionGuide,
  'api-contract-testing-microservices': apiContractTesting,
  'mobile-testing-automation-guide': mobileTestingGuide,
  'accessibility-testing-automation-guide': accessibilityTestingGuide,
  'mutation-testing-stryker-guide': mutationTestingGuide,
  'test-data-management-strategies': testDataManagement,
  'bdd-cucumber-testing-guide': bddCucumberGuide,
  'database-testing-automation-guide': databaseTestingGuide,
  'exploratory-testing-ai-agents-guide': exploratoryTestingGuide,
  'qa-engineer-skills-career-guide-2026': qaEngineerSkillsCareerGuide,
  'testing-legacy-code-refactoring-guide': testingLegacyCodeGuide,
  'playwright-vs-puppeteer-2026': playwrightVsPuppeteer,
  'testing-in-production-strategies': testingInProduction,
  'pytest-testing-complete-guide': pytestGuide,
  'selenium-grid-docker-parallel-testing': seleniumGridDocker,
  'postman-api-testing-guide': postmanApiGuide,
  'rest-assured-java-api-testing': restAssuredGuide,
  'regression-testing-strategies-guide': regressionTestingGuide,
  'smoke-testing-vs-sanity-testing': smokeVsSanity,
  'test-case-design-techniques-guide': testCaseDesign,
  'load-testing-beginners-guide': loadTestingGuide,
  'graphql-testing-complete-guide': graphqlTestingGuide,
  'chaos-engineering-resilience-testing': chaosEngineeringGuide,
  'websocket-testing-guide': websocketTestingGuide,
  'microservices-testing-strategies': microservicesTestingGuide,
  'test-automation-roi-business-case': testAutomationRoi,
  'cross-browser-testing-guide': crossBrowserGuide,
  'qa-metrics-kpis-dashboard-guide': qaMetricsGuide,
  'test-pyramid-testing-strategy': testPyramidGuide,
  'continuous-testing-devops-guide': continuousTestingGuide,
  'internationalization-testing-i18n-guide': i18nTestingGuide,
  'error-handling-testing-patterns': errorHandlingGuide,
  'api-mocking-service-virtualization-guide': apiMockingGuide,
  'test-reporting-allure-dashboards-guide': testReportingGuide,
  'performance-monitoring-testing-guide': performanceMonitoringGuide,
  'storybook-component-testing-guide': storybookTestingGuide,
  'test-planning-strategy-guide': testPlanningGuide,
  'code-review-qa-testing-guide': codeReviewQaGuide,
  'ai-test-generation-tools-guide': aiTestGenerationGuide,
};

// Ordered list for the blog listing page (newest first)
export const postList = [
  {
    slug: 'ai-test-generation-tools-guide',
    ...aiTestGenerationGuide,
  },
  {
    slug: 'code-review-qa-testing-guide',
    ...codeReviewQaGuide,
  },
  {
    slug: 'test-planning-strategy-guide',
    ...testPlanningGuide,
  },
  {
    slug: 'storybook-component-testing-guide',
    ...storybookTestingGuide,
  },
  {
    slug: 'performance-monitoring-testing-guide',
    ...performanceMonitoringGuide,
  },
  {
    slug: 'test-reporting-allure-dashboards-guide',
    ...testReportingGuide,
  },
  {
    slug: 'api-mocking-service-virtualization-guide',
    ...apiMockingGuide,
  },
  {
    slug: 'error-handling-testing-patterns',
    ...errorHandlingGuide,
  },
  {
    slug: 'internationalization-testing-i18n-guide',
    ...i18nTestingGuide,
  },
  {
    slug: 'continuous-testing-devops-guide',
    ...continuousTestingGuide,
  },
  {
    slug: 'test-pyramid-testing-strategy',
    ...testPyramidGuide,
  },
  {
    slug: 'qa-metrics-kpis-dashboard-guide',
    ...qaMetricsGuide,
  },
  {
    slug: 'cross-browser-testing-guide',
    ...crossBrowserGuide,
  },
  {
    slug: 'test-automation-roi-business-case',
    ...testAutomationRoi,
  },
  {
    slug: 'microservices-testing-strategies',
    ...microservicesTestingGuide,
  },
  {
    slug: 'websocket-testing-guide',
    ...websocketTestingGuide,
  },
  {
    slug: 'chaos-engineering-resilience-testing',
    ...chaosEngineeringGuide,
  },
  {
    slug: 'graphql-testing-complete-guide',
    ...graphqlTestingGuide,
  },
  {
    slug: 'load-testing-beginners-guide',
    ...loadTestingGuide,
  },
  {
    slug: 'test-case-design-techniques-guide',
    ...testCaseDesign,
  },
  {
    slug: 'smoke-testing-vs-sanity-testing',
    ...smokeVsSanity,
  },
  {
    slug: 'regression-testing-strategies-guide',
    ...regressionTestingGuide,
  },
  {
    slug: 'rest-assured-java-api-testing',
    ...restAssuredGuide,
  },
  {
    slug: 'postman-api-testing-guide',
    ...postmanApiGuide,
  },
  {
    slug: 'selenium-grid-docker-parallel-testing',
    ...seleniumGridDocker,
  },
  {
    slug: 'pytest-testing-complete-guide',
    ...pytestGuide,
  },
  {
    slug: 'testing-in-production-strategies',
    ...testingInProduction,
  },
  {
    slug: 'playwright-vs-puppeteer-2026',
    ...playwrightVsPuppeteer,
  },
  {
    slug: 'testing-legacy-code-refactoring-guide',
    ...testingLegacyCodeGuide,
  },
  {
    slug: 'qa-engineer-skills-career-guide-2026',
    ...qaEngineerSkillsCareerGuide,
  },
  {
    slug: 'mutation-testing-stryker-guide',
    ...mutationTestingGuide,
  },
  {
    slug: 'test-data-management-strategies',
    ...testDataManagement,
  },
  {
    slug: 'bdd-cucumber-testing-guide',
    ...bddCucumberGuide,
  },
  {
    slug: 'database-testing-automation-guide',
    ...databaseTestingGuide,
  },
  {
    slug: 'exploratory-testing-ai-agents-guide',
    ...exploratoryTestingGuide,
  },
  {
    slug: 'k6-vs-jmeter-performance-testing',
    ...k6VsJmeter,
  },
  {
    slug: 'visual-regression-testing-guide',
    ...visualRegressionGuide,
  },
  {
    slug: 'api-contract-testing-microservices',
    ...apiContractTesting,
  },
  {
    slug: 'mobile-testing-automation-guide',
    ...mobileTestingGuide,
  },
  {
    slug: 'accessibility-testing-automation-guide',
    ...accessibilityTestingGuide,
  },
  {
    slug: 'vibe-testing-ai-first-qa-guide',
    ...vibeTestingGuide,
  },
  {
    slug: 'playwright-test-agents-claude-code',
    ...playwrightTestAgents,
  },
  {
    slug: 'testing-ai-generated-code-sdet-playbook',
    ...testingAiGeneratedCode,
  },
  {
    slug: 'autonomous-testing-agents-build-vs-buy',
    ...autonomousTestingBuildVsBuy,
  },
  {
    slug: 'mcp-for-qa-engineers-guide',
    ...mcpForQaEngineers,
  },
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
