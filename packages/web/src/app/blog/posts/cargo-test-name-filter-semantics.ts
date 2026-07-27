import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 883,
  slug: 'cargo-test-name-filter-semantics',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Cargo Test Name Filter Semantics',
  description:
    'Cargo test name filter semantics: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Cargo test name filter semantics',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Cargo test name filter semantics, specifically substring and exact filtering across test targets?',
  intentBoundary:
    'Owns substring and exact filtering across test targets. It excludes Rust testing introductions, container integration, or broad proptest tutorials, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Cargo test name filter semantics example',
    'Cargo test name filter semantics test cases',
    'Cargo test name filter semantics failure modes',
    'how to verify cargo test name filter semantics',
    'Rust testing substring and exact filtering across test targets',
    'Cargo test name filter semantics best practices',
  ],
  repoEvidence: [
    'seed-skills/rust-testing/SKILL.md',
    'packages/web/src/app/blog/posts/rust-proptest-property-testing-guide-2026.ts',
    'packages/web/src/app/blog/posts/rust-mockall-mocking-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/rust-proptest-property-testing-guide-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'rust-proptest-property-testing-guide-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://doc.rust-lang.org/book/ch11-00-testing.html',
    'https://doc.rust-lang.org/cargo/commands/cargo-test.html',
    'https://docs.rs/proptest/latest/proptest/',
  ],
  codeExamples: [
    {
      title: 'Build the Cargo test name filter semantics baseline',
      language: 'rust',
      path: 'seed-skills/rust-testing/SKILL.md',
      snippet:
        '// Example rust pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/rust-proptest-property-testing-guide-2026.ts',
      snippet:
        'The payoff is three-fold:\n\n| Capability | Example-based test | proptest |\n|---|---|---|\n| Input coverage | Only hand-picked cases | Hundreds of randomized cases per run |\n| Edge cases | You must remember them | Generated automatically (boundaries, empties) |\n| Failure diagnosis | The input you wrote | Shrunk to a minimal counterexample |\n| Regression safety | Manual | Persisted seeds in \\`.proptest-regressions\\` |\n\nIf you are coming from Python, the model is identical to the one covered in our [Hypothesis property-based testing guide](/blog/hypothesis-property-based-testing-python-guide); proptest is the Rust-native equivalent. For the language-agnostic theory, see the [property-based testing complete guide](/blog/property-based-testing-complete-guide).\n\n## Installing proptest\n\nproptest lives entirely in dev-dependencies because you only need it at test time. Add it to \\`Cargo.toml\\`:\n\n\\`\\`\\`toml\n[dev-dependencies]',
    },
  ],
});
