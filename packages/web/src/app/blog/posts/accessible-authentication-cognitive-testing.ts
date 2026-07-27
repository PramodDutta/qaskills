import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 774,
  slug: 'accessible-authentication-cognitive-testing',
  campaignCluster: 'system-quality',
  title: 'Accessible Authentication Cognitive Testing',
  description:
    'accessible authentication cognitive testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'accessible authentication cognitive testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify login avoids memory and transcription barriers or offers alternatives?',
  intentBoundary: 'Owns WCAG accessible-authentication criteria, not OAuth protocol security.',
  secondaryKeywords: [
    'cognitive function test',
    'password manager support',
    'copy paste verification code',
    'accessible authentication cognitive testing checklist',
    'accessible authentication cognitive testing CI strategy',
    'accessible authentication cognitive testing failure diagnosis',
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
      title: 'Build the accessible authentication cognitive testing baseline',
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
