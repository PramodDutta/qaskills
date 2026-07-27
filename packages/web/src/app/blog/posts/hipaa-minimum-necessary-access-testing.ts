import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 875,
  slug: 'hipaa-minimum-necessary-access-testing',
  campaignCluster: 'system-quality',
  title: 'Hipaa Minimum Necessary Access Testing',
  description:
    'HIPAA minimum necessary access testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'HIPAA minimum necessary access testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify each healthcare role sees only required protected health information?',
  intentBoundary: 'Owns minimum-necessary data scope, not generic API property authorization.',
  secondaryKeywords: [
    'PHI field minimization',
    'healthcare role matrix',
    'minimum necessary disclosure',
    'HIPAA minimum necessary access testing checklist',
    'HIPAA minimum necessary access testing CI strategy',
    'HIPAA minimum necessary access testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/hipaa-compliance-testing/SKILL.md',
    'seed-skills/authorization-testing/SKILL.md',
    'packages/web/src/app/blog/posts/healthcare-qa-compliance-testing-guide.ts',
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
    'https://www.hhs.gov/hipaa/for-professionals/security/index.html',
    'https://www.hhs.gov/hipaa/for-professionals/privacy/index.html',
  ],
  codeExamples: [
    {
      title: 'Build the HIPAA minimum necessary access testing baseline',
      language: 'python',
      path: 'seed-skills/hipaa-compliance-testing/SKILL.md',
      snippet:
        '// Example hipaa pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/authorization-testing/SKILL.md',
      snippet: '',
    },
  ],
});
