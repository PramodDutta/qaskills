import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 801,
  slug: 'live-caption-accuracy-qa-testing',
  campaignCluster: 'system-quality',
  title: 'Live Caption Accuracy QA Testing',
  description:
    'live caption accuracy QA testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'live caption accuracy QA testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams evaluate live captions for timing, speaker changes, omissions, and critical terms?',
  intentBoundary:
    'Owns caption QA criteria, not translation quality or prerecorded transcript authoring.',
  secondaryKeywords: [
    'caption latency threshold',
    'speaker change caption',
    'critical term error',
    'live caption accuracy QA testing checklist',
    'live caption accuracy QA testing CI strategy',
    'live caption accuracy QA testing failure diagnosis',
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
      title: 'Build the live caption accuracy QA testing baseline',
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
