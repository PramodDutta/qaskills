import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { skills, categories } from './schema';
import { TESTING_TYPES, FRAMEWORKS, LANGUAGES, DOMAINS } from '@qaskills/shared';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set, skipping seed');
    return;
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('Seeding categories...');

  // Seed categories
  const allCategories = [
    ...TESTING_TYPES.map((t) => ({ name: t.name, slug: t.slug, description: t.description, type: 'testingType' as const, icon: t.icon, color: t.color })),
    ...FRAMEWORKS.map((f) => ({ name: f.name, slug: f.slug, description: f.description, type: 'framework' as const, icon: f.icon, color: f.color })),
    ...LANGUAGES.map((l) => ({ name: l.name, slug: l.slug, description: '', type: 'language' as const, icon: l.icon, color: l.color })),
    ...DOMAINS.map((d) => ({ name: d.name, slug: d.slug, description: d.description, type: 'domain' as const, icon: d.icon, color: d.color })),
  ];

  for (const cat of allCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }

  console.log(`Seeded ${allCategories.length} categories`);

  // Seed skills
  console.log('Seeding skills...');

  const seedSkills = [
    { name: 'Playwright E2E Testing', slug: 'playwright-e2e', description: 'Comprehensive Playwright end-to-end testing patterns with Page Object Model, fixtures, and best practices', authorName: 'thetestingacademy', qualityScore: 92, installCount: 1250, weeklyInstalls: 120, testingTypes: ['e2e', 'visual'], frameworks: ['playwright'], languages: ['typescript', 'javascript'], domains: ['web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: true, verified: true },
    { name: 'Playwright API Testing', slug: 'playwright-api', description: 'API testing with Playwright APIRequestContext for REST and GraphQL endpoints', authorName: 'thetestingacademy', qualityScore: 88, installCount: 890, weeklyInstalls: 85, testingTypes: ['api'], frameworks: ['playwright'], languages: ['typescript'], domains: ['api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Cypress E2E Testing', slug: 'cypress-e2e', description: 'Cypress end-to-end testing with custom commands, intercepts, and component testing', authorName: 'thetestingacademy', qualityScore: 90, installCount: 1100, weeklyInstalls: 95, testingTypes: ['e2e'], frameworks: ['cypress'], languages: ['javascript', 'typescript'], domains: ['web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: true, verified: true },
    { name: 'Selenium Java Testing', slug: 'selenium-java', description: 'Selenium WebDriver with Java using Page Object Model and TestNG', authorName: 'thetestingacademy', qualityScore: 85, installCount: 720, weeklyInstalls: 55, testingTypes: ['e2e'], frameworks: ['selenium'], languages: ['java'], domains: ['web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'k6 Performance Testing', slug: 'k6-performance', description: 'Modern load testing with k6 including thresholds, scenarios, and custom metrics', authorName: 'thetestingacademy', qualityScore: 87, installCount: 650, weeklyInstalls: 60, testingTypes: ['performance', 'load'], frameworks: ['k6'], languages: ['javascript'], domains: ['api', 'web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: true, verified: true },
    { name: 'JMeter Load Testing', slug: 'jmeter-load', description: 'Apache JMeter load testing with thread groups, assertions, and distributed testing', authorName: 'thetestingacademy', qualityScore: 82, installCount: 480, weeklyInstalls: 35, testingTypes: ['load', 'performance'], frameworks: ['jmeter'], languages: ['java'], domains: ['api', 'web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'OWASP Security Testing', slug: 'owasp-security', description: 'OWASP Top 10 security testing patterns and vulnerability scanning', authorName: 'thetestingacademy', qualityScore: 89, installCount: 560, weeklyInstalls: 50, testingTypes: ['security'], frameworks: [], languages: ['typescript', 'python'], domains: ['web', 'api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: true, verified: true },
    { name: 'Appium Mobile Testing', slug: 'appium-mobile', description: 'Mobile app testing automation for iOS and Android with Appium', authorName: 'thetestingacademy', qualityScore: 84, installCount: 390, weeklyInstalls: 30, testingTypes: ['mobile', 'e2e'], frameworks: ['appium'], languages: ['java', 'typescript'], domains: ['mobile'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Axe-core Accessibility', slug: 'axe-accessibility', description: 'Automated accessibility testing with axe-core and WCAG 2.1 compliance', authorName: 'thetestingacademy', qualityScore: 86, installCount: 420, weeklyInstalls: 40, testingTypes: ['accessibility'], frameworks: ['axe-core'], languages: ['typescript'], domains: ['web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Test Data Generation', slug: 'test-data-generation', description: 'Test data strategies using Faker.js, factories, builders, and database seeding', authorName: 'thetestingacademy', qualityScore: 83, installCount: 510, weeklyInstalls: 45, testingTypes: ['unit', 'integration', 'e2e'], frameworks: [], languages: ['typescript', 'python', 'java'], domains: ['web', 'api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'REST Assured API Testing', slug: 'rest-assured-api', description: 'Java REST API testing with REST Assured including JSON schema validation', authorName: 'thetestingacademy', qualityScore: 85, installCount: 440, weeklyInstalls: 35, testingTypes: ['api'], frameworks: ['rest-assured'], languages: ['java'], domains: ['api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Jest Unit Testing', slug: 'jest-unit', description: 'Jest unit testing patterns with mocking, spies, snapshots, and async testing', authorName: 'thetestingacademy', qualityScore: 91, installCount: 980, weeklyInstalls: 100, testingTypes: ['unit'], frameworks: ['jest'], languages: ['typescript', 'javascript'], domains: ['web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: true, verified: true },
    { name: 'Pytest Patterns', slug: 'pytest-patterns', description: 'Python testing with pytest fixtures, parametrize, markers, and plugins', authorName: 'thetestingacademy', qualityScore: 88, installCount: 720, weeklyInstalls: 70, testingTypes: ['unit', 'integration'], frameworks: ['pytest'], languages: ['python'], domains: ['api', 'web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Postman API Testing', slug: 'postman-api', description: 'Postman collections, environments, pre-request scripts, and Newman CI', authorName: 'thetestingacademy', qualityScore: 84, installCount: 530, weeklyInstalls: 40, testingTypes: ['api'], frameworks: ['postman'], languages: ['javascript'], domains: ['api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'BDD/Cucumber Patterns', slug: 'bdd-cucumber', description: 'Behavior-driven development with Cucumber, Gherkin, and step definitions', authorName: 'thetestingacademy', qualityScore: 82, installCount: 380, weeklyInstalls: 28, testingTypes: ['bdd', 'e2e'], frameworks: ['cucumber'], languages: ['typescript', 'java'], domains: ['web', 'api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Test Plan Generation', slug: 'test-plan-generation', description: 'Generate comprehensive test plans with coverage matrices and risk-based testing', authorName: 'thetestingacademy', qualityScore: 80, installCount: 340, weeklyInstalls: 25, testingTypes: ['e2e', 'integration', 'unit'], frameworks: [], languages: ['typescript'], domains: ['web', 'api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Bug Report Writing', slug: 'bug-report-writing', description: 'Write clear bug reports with reproduction steps and severity classification', authorName: 'thetestingacademy', qualityScore: 78, installCount: 290, weeklyInstalls: 20, testingTypes: [], frameworks: [], languages: [], domains: ['web', 'api', 'mobile'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'CI/CD Pipeline Config', slug: 'cicd-pipeline', description: 'Configure testing in CI/CD pipelines for GitHub Actions, Jenkins, and GitLab CI', authorName: 'thetestingacademy', qualityScore: 85, installCount: 610, weeklyInstalls: 55, testingTypes: ['integration'], frameworks: [], languages: ['typescript'], domains: ['devops'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Visual Regression Testing', slug: 'visual-regression', description: 'Visual regression testing with Playwright screenshots and diff comparison', authorName: 'thetestingacademy', qualityScore: 86, installCount: 430, weeklyInstalls: 38, testingTypes: ['visual', 'e2e'], frameworks: ['playwright'], languages: ['typescript'], domains: ['web'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
    { name: 'Contract Testing (Pact)', slug: 'contract-testing-pact', description: 'Consumer-driven contract testing with Pact and Pact Broker', authorName: 'thetestingacademy', qualityScore: 84, installCount: 310, weeklyInstalls: 22, testingTypes: ['contract', 'api'], frameworks: ['pact'], languages: ['typescript', 'java'], domains: ['api'], agents: ['claude-code', 'cursor', 'github-copilot', 'windsurf', 'codex', 'aider', 'continue', 'cline', 'zed', 'bolt'], featured: false, verified: true },
  ];

  for (const skill of seedSkills) {
    await db.insert(skills).values(skill).onConflictDoNothing();
  }

  console.log(`Seeded ${seedSkills.length} skills`);
  console.log('Seed complete!');
}

seed().catch(console.error);
