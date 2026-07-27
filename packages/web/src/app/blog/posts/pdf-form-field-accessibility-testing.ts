import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 846,
  slug: 'pdf-form-field-accessibility-testing',
  campaignCluster: 'system-quality',
  title: 'Pdf Form Field Accessibility Testing',
  description:
    'PDF form field accessibility testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'PDF form field accessibility testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify names, roles, values, instructions, and error associations in PDF forms?',
  intentBoundary: 'Owns interactive PDF form semantics, not HTML forms or static PDF text.',
  secondaryKeywords: [
    'AcroForm accessible name',
    'PDF field tooltip',
    'form error association',
    'PDF form field accessibility testing checklist',
    'PDF form field accessibility testing CI strategy',
    'PDF form field accessibility testing failure diagnosis',
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
      title: 'Build the PDF form field accessibility testing baseline',
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
