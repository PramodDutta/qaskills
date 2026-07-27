import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 983,
  slug: 'property-shrinking-precondition-preservation',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Property Shrinking Precondition Preservation',
  description:
    'Property shrinking precondition preservation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Property shrinking precondition preservation',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Property shrinking precondition preservation, specifically shrinks that retain the property precondition?',
  intentBoundary:
    'Owns shrinks that retain the property precondition. It excludes framework introductions, API fuzzing, or broad property-testing comparisons, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Property shrinking precondition preservation example',
    'Property shrinking precondition preservation test cases',
    'Property shrinking precondition preservation failure modes',
    'how to verify property shrinking precondition preservation',
    'property-based testing shrinks that retain the property precondition',
    'Property shrinking precondition preservation best practices',
  ],
  repoEvidence: [
    'seed-skills/property-based-testing/SKILL.md',
    'packages/web/src/app/blog/posts/property-based-testing-complete-guide.ts',
    'packages/web/src/app/blog/posts/fast-check-property-based-testing-typescript-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/property-based-testing-complete-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'property-based-testing-complete-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://hypothesis.readthedocs.io/en/latest/',
    'https://fast-check.dev/docs/introduction/',
    'https://jqwik.net/docs/current/user-guide.html',
  ],
  codeExamples: [
    {
      title: 'Build the Property shrinking precondition preservation baseline',
      language: 'python',
      path: 'seed-skills/property-based-testing/SKILL.md',
      snippet:
        '// Example property-based pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/property-based-testing-complete-guide.ts',
      snippet:
        '## Key Takeaways\n\n- **Property-based testing** generates random inputs to verify that general properties hold true, complementing traditional example-based tests by exploring the input space far more thoroughly\n- **fast-check** is the premier property-based testing library for TypeScript and JavaScript, integrating seamlessly with Vitest, Jest, and other test runners\n- **Hypothesis** is the gold standard for Python property-based testing, offering strategies, stateful testing, and database-backed example storage\n- **Shrinking** is the killer feature: when a failing input is found, the framework automatically reduces it to the smallest possible counterexample, making debugging dramatically easier\n- Property-based testing excels at testing **serialization roundtrips**, **parser correctness**, **mathematical invariants**, **data pipeline transformations**, and **API contract validation**\n- Combining property-based testing with AI-assisted QA skills from **qaskills.sh** lets you generate sophisticated property tests tuned to your specific domain and framework\n\n---\n\n## What is Property-Based Testing?\n\nTraditional **example-based testing** requires you to think of specific inputs and manually specify the expected output for each:\n\n\\`\\`\\`typescript\n// Example-based: you pick the cases',
    },
  ],
});
