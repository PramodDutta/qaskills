import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 897,
  slug: 'given-when-then-transition-clarity',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Given When Then Transition Clarity',
  description:
    'Given When Then transition clarity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Given When Then transition clarity',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Given When Then transition clarity, specifically one observable state transition per scenario?',
  intentBoundary:
    'Owns one observable state transition per scenario. It excludes browser step automation, framework comparisons, or AI-assisted development, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Given When Then transition clarity example',
    'Given When Then transition clarity test cases',
    'Given When Then transition clarity failure modes',
    'how to verify given when then transition clarity',
    'TDD and BDD one observable state transition per scenario',
    'Given When Then transition clarity best practices',
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
      title: 'Build the Given When Then transition clarity baseline',
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
