import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 889,
  slug: 'equivalent-mutant-review-workflow',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Equivalent Mutant Review Workflow',
  description:
    'Equivalent mutant review workflow: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Equivalent mutant review workflow',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Equivalent mutant review workflow, specifically classifying behaviorally equivalent surviving mutants?',
  intentBoundary:
    'Owns classifying behaviorally equivalent surviving mutants. It excludes tool installation, generic mutation introductions, or infrastructure tuning, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Equivalent mutant review workflow example',
    'Equivalent mutant review workflow test cases',
    'Equivalent mutant review workflow failure modes',
    'how to verify equivalent mutant review workflow',
    'mutation testing classifying behaviorally equivalent surviving mutants',
    'Equivalent mutant review workflow best practices',
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
      title: 'Build the Equivalent mutant review workflow baseline',
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
