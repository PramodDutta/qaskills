import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 753,
  slug: 'jwt-audience-confusion-testing',
  campaignCluster: 'system-quality',
  title: 'Jwt Audience Confusion Testing',
  description:
    'JWT audience confusion testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'JWT audience confusion testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify tokens for one API or tenant cannot authorize another resource server?',
  intentBoundary: 'Owns aud claim isolation, not issuer validation or generic RBAC.',
  secondaryKeywords: [
    'cross-service token replay',
    'multiple audience claim',
    'tenant audience binding',
    'JWT audience confusion testing checklist',
    'JWT audience confusion testing CI strategy',
    'JWT audience confusion testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/jwt-security-testing/SKILL.md',
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
    'https://www.rfc-editor.org/rfc/rfc7519.html',
    'https://www.rfc-editor.org/rfc/rfc8725.html',
  ],
  codeExamples: [
    {
      title: 'Build the JWT audience confusion testing baseline',
      language: 'typescript',
      path: 'seed-skills/jwt-security-testing/SKILL.md',
      snippet:
        '// Example jwt pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/authorization-testing/SKILL.md',
      snippet: '',
    },
  ],
});
