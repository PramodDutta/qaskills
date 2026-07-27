import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 764,
  slug: 'pdf-reading-order-regression-testing',
  campaignCluster: 'system-quality',
  title: 'Pdf Reading Order Regression Testing',
  description:
    'PDF reading order regression testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'PDF reading order regression testing',
  intent: 'how-to',
  coreQuestion: 'How can QA teams verify generated PDF content reads in a stable logical sequence?',
  intentBoundary: 'Owns PDF tag-tree order, not browser DOM order or page visual layout.',
  secondaryKeywords: [
    'PDF tag reading sequence',
    'multi-column reading order',
    'artifact tag exclusion',
    'PDF reading order regression testing checklist',
    'PDF reading order regression testing CI strategy',
    'PDF reading order regression testing failure diagnosis',
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
      title: 'Build the PDF reading order regression testing baseline',
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
