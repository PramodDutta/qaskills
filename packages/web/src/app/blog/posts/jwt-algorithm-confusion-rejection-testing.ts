import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 765,
  slug: 'jwt-algorithm-confusion-rejection-testing',
  campaignCluster: 'system-quality',
  title: 'Jwt Algorithm Confusion Rejection Testing',
  description:
    'JWT algorithm confusion rejection testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'JWT algorithm confusion rejection testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove verifiers reject alg substitution, none, and key-type confusion attacks?',
  intentBoundary: 'Owns JWT algorithm selection, not claim authorization or key rotation.',
  secondaryKeywords: [
    'JWT alg none rejection',
    'HS RS confusion',
    'allowed algorithms list',
    'JWT algorithm confusion rejection testing checklist',
    'JWT algorithm confusion rejection testing CI strategy',
    'JWT algorithm confusion rejection testing failure diagnosis',
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
      title: 'Build the JWT algorithm confusion rejection testing baseline',
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
