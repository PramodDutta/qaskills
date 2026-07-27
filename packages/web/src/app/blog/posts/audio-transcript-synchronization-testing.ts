import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 769,
  slug: 'audio-transcript-synchronization-testing',
  campaignCluster: 'system-quality',
  title: 'Audio Transcript Synchronization Testing',
  description:
    'audio transcript synchronization testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'audio transcript synchronization testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify transcript segments align with spoken content and remain navigable?',
  intentBoundary:
    'Owns transcript timing and text agreement, not speech recognition model benchmarking.',
  secondaryKeywords: [
    'transcript timestamp drift',
    'speaker identification',
    'searchable audio transcript',
    'audio transcript synchronization testing checklist',
    'audio transcript synchronization testing CI strategy',
    'audio transcript synchronization testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/accessibility-manual-audit/SKILL.md',
    'seed-skills/wcag-accessibility-testing/SKILL.md',
    'packages/web/src/app/blog/posts/accessibility-testing-automation-guide.ts',
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
  sources: ['https://www.w3.org/WAI/media/av/', 'https://www.w3.org/TR/WCAG22/'],
  codeExamples: [
    {
      title: 'Build the audio transcript synchronization testing baseline',
      language: 'bash',
      path: 'seed-skills/accessibility-manual-audit/SKILL.md',
      snippet:
        'mkdir -p accessibility/manual-audits accessibility/evidence accessibility/checklists\nnpm install --save-dev @axe-core/playwright @playwright/test',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/wcag-accessibility-testing/SKILL.md',
      snippet: '',
    },
  ],
});
