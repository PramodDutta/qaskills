import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 822,
  slug: 'gdpr-consent-version-audit-testing',
  campaignCluster: 'system-quality',
  title: 'Gdpr Consent Version Audit Testing',
  description:
    'GDPR consent version audit testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'GDPR consent version audit testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify consent records bind purpose, policy version, timestamp, and withdrawal?',
  intentBoundary: 'Owns consent evidence versioning, not cookie banner user interface behavior.',
  secondaryKeywords: [
    'consent purpose version',
    'withdrawal audit trail',
    'policy revision acceptance',
    'GDPR consent version audit testing checklist',
    'GDPR consent version audit testing CI strategy',
    'GDPR consent version audit testing failure diagnosis',
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
    'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/how-should-we-obtain-record-and-manage-consent/',
  ],
  codeExamples: [
    {
      title: 'Build the GDPR consent version audit testing baseline',
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
