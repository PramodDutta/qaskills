import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 882,
  slug: 'boundary-mutant-survival-analysis',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Boundary Mutant Survival Analysis',
  description:
    'Boundary mutant survival analysis: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Boundary mutant survival analysis',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Boundary mutant survival analysis, specifically surviving comparison and arithmetic boundary mutations?',
  intentBoundary:
    'Owns surviving comparison and arithmetic boundary mutations. It excludes tool installation, generic mutation introductions, or infrastructure tuning, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Boundary mutant survival analysis example',
    'Boundary mutant survival analysis test cases',
    'Boundary mutant survival analysis failure modes',
    'how to verify boundary mutant survival analysis',
    'mutation testing surviving comparison and arithmetic boundary mutations',
    'Boundary mutant survival analysis best practices',
  ],
  repoEvidence: [
    'seed-skills/mutation-testing-advanced/SKILL.md',
    'seed-skills/mutation-test-generator/SKILL.md',
    'packages/web/src/app/blog/posts/mutation-testing-stryker-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/mutation-testing-stryker-guide-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'mutation-testing-stryker-guide-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://stryker-mutator.io/docs/',
    'https://pitest.org/',
    'https://mutation-testing.org/',
  ],
  codeExamples: [
    {
      title: 'Build the Boundary mutant survival analysis baseline',
      language: 'typescript',
      path: 'seed-skills/mutation-testing-advanced/SKILL.md',
      snippet:
        '// Example mutation-testing pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/mutation-test-generator/SKILL.md',
      snippet:
        'unit/\n      services/\n        payment-service.test.ts\n        user-service.test.ts\n        order-service.test.ts\n      utils/\n        calculator.test.ts\n        validator.test.ts\n  mutation/\n    reports/\n      .gitkeep\n    stryker.config.ts\n    mutation-analysis.md\n    survivor-triage.md\n  .stryker-tmp/        # Gitignored, Stryker working directory\n  stryker.config.mjs   # Root config (alternative location)',
    },
  ],
});
