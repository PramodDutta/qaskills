import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 960,
  slug: 'mutation-operator-allowlist-strategy',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Mutation Operator Allowlist Strategy',
  description:
    'Mutation operator allowlist strategy: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Mutation operator allowlist strategy',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Mutation operator allowlist strategy, specifically operator selection matched to language and risk?',
  intentBoundary:
    'Owns operator selection matched to language and risk. It excludes tool installation, generic mutation introductions, or infrastructure tuning, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Mutation operator allowlist strategy example',
    'Mutation operator allowlist strategy test cases',
    'Mutation operator allowlist strategy failure modes',
    'how to verify mutation operator allowlist strategy',
    'mutation testing operator selection matched to language and risk',
    'Mutation operator allowlist strategy best practices',
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
      title: 'Build the Mutation operator allowlist strategy baseline',
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
