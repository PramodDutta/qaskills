import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 790,
  slug: 'api-excessive-data-exposure-testing',
  campaignCluster: 'system-quality',
  title: 'API Excessive Data Exposure Testing',
  description:
    'API excessive data exposure testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'API excessive data exposure testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams detect sensitive fields returned before client-side filtering or field masks?',
  intentBoundary:
    'Owns unauthorized response data exposure, not documented partial-response masks.',
  secondaryKeywords: [
    'sensitive JSON field leak',
    'server-side response filtering',
    'hidden PII property',
    'API excessive data exposure testing checklist',
    'API excessive data exposure testing CI strategy',
    'API excessive data exposure testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/api-security-testing/SKILL.md',
    'seed-skills/authorization-testing/SKILL.md',
    'packages/web/src/app/blog/posts/api-security-testing-checklist-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/api-security-testing-checklist-2026',
    '/blog/dast-vs-sast-vs-sca-qa-guide-2026',
    '/blog/security-testing-ai-generated-code',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'api-security-testing-checklist-2026',
    'dast-vs-sast-vs-sca-qa-guide-2026',
    'security-testing-ai-generated-code',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://owasp.org/API-Security/editions/2023/en/0x11-t10/',
    'https://owasp.org/www-project-application-security-verification-standard/',
  ],
  codeExamples: [
    {
      title: 'Build the API excessive data exposure testing baseline',
      language: 'text',
      path: 'seed-skills/api-security-testing/SKILL.md',
      snippet:
        'security-tests/\n  owasp/\n    bola.test.ts\n    broken-auth.test.ts\n    broken-object-property.test.ts\n    unrestricted-resource.test.ts\n    broken-function-level-auth.test.ts\n    mass-assignment.test.ts\n    ssrf.test.ts\n    security-misconfiguration.test.ts\n    improper-inventory.test.ts\n    unsafe-api-consumption.test.ts\n  auth/\n    token-validation.test.ts\n    session-management.test.ts\n    credential-handling.test.ts\n    oauth-flow.test.ts\n  injection/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/authorization-testing/SKILL.md',
      snippet: '',
    },
  ],
});
