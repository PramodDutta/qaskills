import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 784,
  slug: 'pci-log-masking-verification-testing',
  campaignCluster: 'system-quality',
  title: 'Pci Log Masking Verification Testing',
  description:
    'PCI log masking verification testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'PCI log masking verification testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify PAN and authentication data never appear in logs, traces, or test artifacts?',
  intentBoundary:
    'Owns payment-data masking in observability outputs, not general CI secret masking.',
  secondaryKeywords: [
    'PAN log redaction',
    'sensitive authentication data',
    'trace attribute masking',
    'PCI log masking verification testing checklist',
    'PCI log masking verification testing CI strategy',
    'PCI log masking verification testing failure diagnosis',
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
      title: 'Build the PCI log masking verification testing baseline',
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
