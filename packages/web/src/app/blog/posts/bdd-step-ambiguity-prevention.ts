import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 880,
  slug: 'bdd-step-ambiguity-prevention',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Bdd Step Ambiguity Prevention',
  description:
    'BDD step ambiguity prevention: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'BDD step ambiguity prevention',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify BDD step ambiguity prevention, specifically step phrase ownership and ambiguous definition detection?',
  intentBoundary:
    'Owns step phrase ownership and ambiguous definition detection. It excludes browser step automation, framework comparisons, or AI-assisted development, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'BDD step ambiguity prevention example',
    'BDD step ambiguity prevention test cases',
    'BDD step ambiguity prevention failure modes',
    'how to verify bdd step ambiguity prevention',
    'TDD and BDD step phrase ownership and ambiguous definition detection',
    'BDD step ambiguity prevention best practices',
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
      title: 'Build the BDD step ambiguity prevention baseline',
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
