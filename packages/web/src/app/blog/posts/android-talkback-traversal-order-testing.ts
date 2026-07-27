import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 766,
  slug: 'android-talkback-traversal-order-testing',
  campaignCluster: 'system-quality',
  title: 'Android Talkback Traversal Order Testing',
  description:
    'Android TalkBack traversal order testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Android TalkBack traversal order testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify semantic focus follows task order across dynamic native screens?',
  intentBoundary: 'Owns Android screen-reader traversal, not keyboard tab order in web pages.',
  secondaryKeywords: [
    'TalkBack focus sequence',
    'accessibility traversalAfter',
    'dynamic content order',
    'Android TalkBack traversal order testing checklist',
    'Android TalkBack traversal order testing CI strategy',
    'Android TalkBack traversal order testing failure diagnosis',
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
      title: 'Build the Android TalkBack traversal order testing baseline',
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
