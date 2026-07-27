import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 838,
  slug: 'soc2-change-approval-evidence-testing',
  campaignCluster: 'system-quality',
  title: 'Soc 2 Change Approval Evidence Testing',
  description:
    'SOC 2 change approval evidence testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'SOC 2 change approval evidence testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify production changes retain reviewer, test, deployment, and exception evidence?',
  intentBoundary:
    'Owns change-management evidence completeness, not CI environment approval mechanics alone.',
  secondaryKeywords: [
    'deployment approval record',
    'change exception evidence',
    'control audit trail',
    'SOC 2 change approval evidence testing checklist',
    'SOC 2 change approval evidence testing CI strategy',
    'SOC 2 change approval evidence testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/soc2-compliance-testing/SKILL.md',
    'seed-skills/compliance-as-code/SKILL.md',
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
    'https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services',
    'https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final',
  ],
  codeExamples: [
    {
      title: 'Build the SOC 2 change approval evidence testing baseline',
      language: 'python',
      path: 'seed-skills/soc2-compliance-testing/SKILL.md',
      snippet:
        '// Example soc2 pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/compliance-as-code/SKILL.md',
      snippet: '',
    },
  ],
});
