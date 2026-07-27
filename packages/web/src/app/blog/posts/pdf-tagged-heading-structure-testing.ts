import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 833,
  slug: 'pdf-tagged-heading-structure-testing',
  campaignCluster: 'system-quality',
  title: 'Pdf Tagged Heading Structure Testing',
  description:
    'PDF tagged heading structure testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'PDF tagged heading structure testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify PDF heading tags form one logical hierarchy for assistive technology?',
  intentBoundary: 'Owns tagged heading semantics, not visual font sizes or HTML headings.',
  secondaryKeywords: [
    'PDF H1 hierarchy',
    'tag tree heading level',
    'screen reader document outline',
    'PDF tagged heading structure testing checklist',
    'PDF tagged heading structure testing CI strategy',
    'PDF tagged heading structure testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/accessibility-manual-audit/SKILL.md',
    'seed-skills/pdf-generation-testing/SKILL.md',
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
  sources: ['https://www.w3.org/WAI/WCAG22/Techniques/', 'https://www.w3.org/TR/WCAG22/'],
  codeExamples: [
    {
      title: 'Build the PDF tagged heading structure testing baseline',
      language: 'bash',
      path: 'seed-skills/accessibility-manual-audit/SKILL.md',
      snippet:
        'mkdir -p accessibility/manual-audits accessibility/evidence accessibility/checklists\nnpm install --save-dev @axe-core/playwright @playwright/test',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/pdf-generation-testing/SKILL.md',
      snippet: '',
    },
  ],
});
