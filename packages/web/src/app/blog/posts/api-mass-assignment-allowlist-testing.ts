import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 814,
  slug: 'api-mass-assignment-allowlist-testing',
  campaignCluster: 'system-quality',
  title: 'API Mass Assignment Allowlist Testing',
  description:
    'API mass assignment allowlist testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'API mass assignment allowlist testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove untrusted request fields cannot bind privileged model properties?',
  intentBoundary: 'Owns request-model binding allowlists, not response property authorization.',
  secondaryKeywords: [
    'privileged field injection',
    'DTO binding allowlist',
    'unknown update property',
    'API mass assignment allowlist testing checklist',
    'API mass assignment allowlist testing CI strategy',
    'API mass assignment allowlist testing failure diagnosis',
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
      title: 'Build the API mass assignment allowlist testing baseline',
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
