import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 797,
  slug: 'gdpr-erasure-backup-propagation-testing',
  campaignCluster: 'system-quality',
  title: 'Gdpr Erasure Backup Propagation Testing',
  description:
    'GDPR erasure backup propagation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'GDPR erasure backup propagation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify deletion requests remain effective after backup restoration and retention expiry?',
  intentBoundary:
    'Owns erasure propagation into backup workflows, not production-data anonymization.',
  secondaryKeywords: [
    'backup restore re-delete',
    'erasure retention schedule',
    'deleted subject recovery',
    'GDPR erasure backup propagation testing checklist',
    'GDPR erasure backup propagation testing CI strategy',
    'GDPR erasure backup propagation testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/gdpr-compliance-testing/SKILL.md',
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
    'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/',
  ],
  codeExamples: [
    {
      title: 'Build the GDPR erasure backup propagation testing baseline',
      language: 'typescript',
      path: 'seed-skills/gdpr-compliance-testing/SKILL.md',
      snippet:
        '// Example gdpr pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/compliance-as-code/SKILL.md',
      snippet: '',
    },
  ],
});
