import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 845,
  slug: 'pci-card-data-retention-testing',
  campaignCluster: 'system-quality',
  title: 'Pci Card Data Retention Testing',
  description:
    'PCI card data retention testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'PCI card data retention testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify stored account data expires and is unrecoverable after policy deadlines?',
  intentBoundary: 'Owns payment-data retention controls, not test-data cleanup generally.',
  secondaryKeywords: [
    'PAN retention expiry',
    'card data purge',
    'backup retention evidence',
    'PCI card data retention testing checklist',
    'PCI card data retention testing CI strategy',
    'PCI card data retention testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/pci-dss-testing/SKILL.md',
    'seed-skills/secure-test-data-engineer/SKILL.md',
    'packages/web/src/app/blog/posts/fintech-qa-compliance-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/fintech-qa-compliance-testing-guide',
    '/blog/healthcare-qa-compliance-testing-guide',
    '/blog/european-accessibility-act-testing-guide',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'fintech-qa-compliance-testing-guide',
    'healthcare-qa-compliance-testing-guide',
    'european-accessibility-act-testing-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://www.pcisecuritystandards.org/document_library/',
    'https://www.pcisecuritystandards.org/standards/pci-dss/',
  ],
  codeExamples: [
    {
      title: 'Build the PCI card data retention testing baseline',
      language: 'python',
      path: 'seed-skills/pci-dss-testing/SKILL.md',
      snippet:
        '// Example pci-dss pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/secure-test-data-engineer/SKILL.md',
      snippet: '',
    },
  ],
});
