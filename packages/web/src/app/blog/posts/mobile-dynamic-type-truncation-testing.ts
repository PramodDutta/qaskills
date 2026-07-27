import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 807,
  slug: 'mobile-dynamic-type-truncation-testing',
  campaignCluster: 'system-quality',
  title: 'Mobile Dynamic Type Truncation Testing',
  description:
    'mobile dynamic type truncation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'mobile dynamic type truncation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify native content remains complete at every supported text-size category?',
  intentBoundary: 'Owns OS text scaling, not responsive browser zoom or visual snapshots.',
  secondaryKeywords: [
    'largest content size',
    'native label clipping',
    'dynamic type reflow',
    'mobile dynamic type truncation testing checklist',
    'mobile dynamic type truncation testing CI strategy',
    'mobile dynamic type truncation testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/mobile-accessibility-testing/SKILL.md',
    'seed-skills/wcag-accessibility-testing/SKILL.md',
    'packages/web/src/app/blog/posts/mobile-accessibility-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/accessibility-testing',
    '/blog/mobile-accessibility-testing-guide',
    '/blog/accessibility-testing-automation-guide',
    '/blog/api-testing-best-practices-guide',
    '/blog/performance-testing-complete-guide',
  ],
  relatedSlugs: [
    'mobile-accessibility-testing-guide',
    'accessibility-testing-automation-guide',
    'api-testing-best-practices-guide',
    'performance-testing-complete-guide',
  ],
  sources: ['https://www.w3.org/TR/WCAG22/', 'https://www.w3.org/WAI/standards-guidelines/mobile/'],
  codeExamples: [
    {
      title: 'Build the mobile dynamic type truncation testing baseline',
      language: 'swift',
      path: 'seed-skills/mobile-accessibility-testing/SKILL.md',
      snippet:
        '// Example mobile-a11y pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/wcag-accessibility-testing/SKILL.md',
      snippet: '',
    },
  ],
});
