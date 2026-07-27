import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 896,
  slug: 'gherkin-scenario-outline-boundary-tables',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Gherkin Scenario Outline Boundary Tables',
  description:
    'Gherkin scenario outline boundary tables: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Gherkin scenario outline boundary tables',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Gherkin scenario outline boundary tables, specifically example-table rows that express meaningful input partitions?',
  intentBoundary:
    'Owns example-table rows that express meaningful input partitions. It excludes browser step automation, framework comparisons, or AI-assisted development, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Gherkin scenario outline boundary tables example',
    'Gherkin scenario outline boundary tables test cases',
    'Gherkin scenario outline boundary tables failure modes',
    'how to verify gherkin scenario outline boundary tables',
    'TDD and BDD example-table rows that express meaningful input partitions',
    'Gherkin scenario outline boundary tables best practices',
  ],
  repoEvidence: [
    'seed-skills/tdd-red-green-refactor/SKILL.md',
    'seed-skills/bdd-gherkin-patterns/SKILL.md',
    'packages/web/src/app/blog/posts/bdd-vs-tdd-decision-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/bdd-cucumber-testing-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'bdd-cucumber-testing-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: ['https://cucumber.io/docs/bdd/', 'https://cucumber.io/docs/gherkin/reference'],
  codeExamples: [
    {
      title: 'Build the Gherkin scenario outline boundary tables baseline',
      language: 'typescript',
      path: 'seed-skills/tdd-red-green-refactor/SKILL.md',
      snippet:
        '// Example tdd pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/bdd-gherkin-patterns/SKILL.md',
      snippet: '',
    },
  ],
});
