import type { SkillSortOption, SkillSummary } from '@qaskills/shared';

export const FALLBACK_SKILLS: SkillSummary[] = [
  { id: '1', name: 'Playwright E2E Testing', slug: 'playwright-e2e', description: 'Comprehensive Playwright end-to-end testing patterns with Page Object Model, fixtures, and best practices', author: 'thetestingacademy', qualityScore: 92, installCount: 86, testingTypes: ['e2e', 'visual'], frameworks: ['playwright'], featured: true, verified: true, createdAt: '2026-02-01T00:00:00.000Z' },
  { id: '2', name: 'Playwright CLI Browser Automation', slug: 'playwright-cli', description: 'Command-line browser automation with Playwright CLI for navigation, snapshots, uploads, downloads, tracing, and QA workflows.', author: 'Pramod', qualityScore: 93, installCount: 66, testingTypes: ['e2e', 'visual', 'accessibility'], frameworks: ['playwright'], featured: true, verified: true, createdAt: '2026-04-01T00:00:00.000Z' },
  { id: '3', name: 'Playwright API Testing', slug: 'playwright-api', description: 'API testing with Playwright APIRequestContext for REST and GraphQL endpoints', author: 'thetestingacademy', qualityScore: 88, installCount: 32, testingTypes: ['api'], frameworks: ['playwright'], featured: false, verified: true, createdAt: '2026-02-02T00:00:00.000Z' },
  { id: '4', name: 'Cypress E2E Testing', slug: 'cypress-e2e', description: 'Cypress end-to-end testing with custom commands, intercepts, and component testing', author: 'thetestingacademy', qualityScore: 90, installCount: 58, testingTypes: ['e2e'], frameworks: ['cypress'], featured: true, verified: true, createdAt: '2026-02-03T00:00:00.000Z' },
  { id: '5', name: 'Selenium Java Testing', slug: 'selenium-java', description: 'Selenium WebDriver with Java using Page Object Model and TestNG', author: 'thetestingacademy', qualityScore: 85, installCount: 22, testingTypes: ['e2e'], frameworks: ['selenium'], featured: false, verified: true, createdAt: '2026-02-04T00:00:00.000Z' },
  { id: '6', name: 'k6 Performance Testing', slug: 'k6-performance', description: 'Modern load testing with k6 including thresholds, scenarios, and custom metrics', author: 'thetestingacademy', qualityScore: 87, installCount: 35, testingTypes: ['performance', 'load'], frameworks: ['k6'], featured: true, verified: true, createdAt: '2026-02-05T00:00:00.000Z' },
  { id: '7', name: 'JMeter Load Testing', slug: 'jmeter-load', description: 'Apache JMeter load testing with thread groups, assertions, and distributed testing', author: 'thetestingacademy', qualityScore: 82, installCount: 15, testingTypes: ['load', 'performance'], frameworks: ['jmeter'], featured: false, verified: true, createdAt: '2026-02-06T00:00:00.000Z' },
  { id: '8', name: 'OWASP Security Testing', slug: 'owasp-security', description: 'OWASP Top 10 security testing patterns and vulnerability scanning', author: 'thetestingacademy', qualityScore: 89, installCount: 26, testingTypes: ['security'], frameworks: [], featured: true, verified: true, createdAt: '2026-02-07T00:00:00.000Z' },
  { id: '9', name: 'Appium Mobile Testing', slug: 'appium-mobile', description: 'Mobile app testing automation for iOS and Android with Appium', author: 'thetestingacademy', qualityScore: 84, installCount: 11, testingTypes: ['mobile', 'e2e'], frameworks: ['appium'], featured: false, verified: true, createdAt: '2026-02-08T00:00:00.000Z' },
  { id: '10', name: 'Axe-core Accessibility', slug: 'axe-accessibility', description: 'Automated accessibility testing with axe-core and WCAG 2.1 compliance', author: 'thetestingacademy', qualityScore: 86, installCount: 14, testingTypes: ['accessibility'], frameworks: ['axe-core'], featured: false, verified: true, createdAt: '2026-02-09T00:00:00.000Z' },
  { id: '11', name: 'Test Data Generation', slug: 'test-data-generation', description: 'Test data strategies using Faker.js, factories, builders, and database seeding', author: 'thetestingacademy', qualityScore: 83, installCount: 18, testingTypes: ['unit', 'integration', 'e2e'], frameworks: [], featured: false, verified: true, createdAt: '2026-02-10T00:00:00.000Z' },
  { id: '12', name: 'REST Assured API Testing', slug: 'rest-assured-api', description: 'Java REST API testing with REST Assured including JSON schema validation', author: 'thetestingacademy', qualityScore: 85, installCount: 13, testingTypes: ['api'], frameworks: ['rest-assured'], featured: false, verified: true, createdAt: '2026-02-11T00:00:00.000Z' },
  { id: '13', name: 'Jest Unit Testing', slug: 'jest-unit', description: 'Jest unit testing patterns with mocking, spies, snapshots, and async testing', author: 'thetestingacademy', qualityScore: 91, installCount: 64, testingTypes: ['unit'], frameworks: ['jest'], featured: true, verified: true, createdAt: '2026-02-12T00:00:00.000Z' },
  { id: '14', name: 'Pytest Patterns', slug: 'pytest-patterns', description: 'Python testing with pytest fixtures, parametrize, markers, and plugins', author: 'thetestingacademy', qualityScore: 88, installCount: 41, testingTypes: ['unit', 'integration'], frameworks: ['pytest'], featured: false, verified: true, createdAt: '2026-02-13T00:00:00.000Z' },
  { id: '15', name: 'Postman API Testing', slug: 'postman-api', description: 'Postman collections, environments, pre-request scripts, and Newman CI', author: 'thetestingacademy', qualityScore: 84, installCount: 19, testingTypes: ['api'], frameworks: ['postman'], featured: false, verified: true, createdAt: '2026-02-14T00:00:00.000Z' },
  { id: '16', name: 'BDD/Cucumber Patterns', slug: 'bdd-cucumber', description: 'Behavior-driven development with Cucumber, Gherkin, and step definitions', author: 'thetestingacademy', qualityScore: 82, installCount: 9, testingTypes: ['bdd', 'e2e'], frameworks: ['cucumber'], featured: false, verified: true, createdAt: '2026-02-15T00:00:00.000Z' },
  { id: '17', name: 'Test Plan Generation', slug: 'test-plan-generation', description: 'Generate comprehensive test plans with coverage matrices and risk-based testing', author: 'thetestingacademy', qualityScore: 80, installCount: 8, testingTypes: ['e2e', 'integration', 'unit'], frameworks: [], featured: false, verified: true, createdAt: '2026-02-16T00:00:00.000Z' },
  { id: '18', name: 'Bug Report Writing', slug: 'bug-report-writing', description: 'Write clear bug reports with reproduction steps and severity classification', author: 'thetestingacademy', qualityScore: 78, installCount: 6, testingTypes: [], frameworks: [], featured: false, verified: true, createdAt: '2026-02-17T00:00:00.000Z' },
  { id: '19', name: 'CI/CD Pipeline Config', slug: 'cicd-pipeline', description: 'Configure testing in CI/CD pipelines for GitHub Actions, Jenkins, and GitLab CI', author: 'thetestingacademy', qualityScore: 85, installCount: 28, testingTypes: ['integration'], frameworks: [], featured: false, verified: true, createdAt: '2026-02-18T00:00:00.000Z' },
  { id: '20', name: 'Visual Regression Testing', slug: 'visual-regression', description: 'Visual regression testing with Playwright screenshots and diff comparison', author: 'thetestingacademy', qualityScore: 86, installCount: 16, testingTypes: ['visual', 'e2e'], frameworks: ['playwright'], featured: false, verified: true, createdAt: '2026-02-19T00:00:00.000Z' },
  { id: '21', name: 'Contract Testing (Pact)', slug: 'contract-testing-pact', description: 'Consumer-driven contract testing with Pact and Pact Broker', author: 'thetestingacademy', qualityScore: 84, installCount: 7, testingTypes: ['contract', 'api'], frameworks: ['pact'], featured: false, verified: true, createdAt: '2026-02-20T00:00:00.000Z' },
];

export function sortFallbackSkills(
  skills: SkillSummary[],
  sort: SkillSortOption = 'trending',
): SkillSummary[] {
  return [...skills].sort((a, b) => {
    switch (sort) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'highest_quality':
        return b.qualityScore - a.qualityScore;
      case 'most_installed':
        return b.installCount - a.installCount;
      case 'trending':
      default:
        return b.installCount - a.installCount;
    }
  });
}
