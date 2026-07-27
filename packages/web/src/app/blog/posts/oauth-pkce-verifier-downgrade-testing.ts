import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 831,
  slug: 'oauth-pkce-verifier-downgrade-testing',
  campaignCluster: 'system-quality',
  title: 'Oauth Pkce Verifier Downgrade Testing',
  description:
    'OAuth PKCE verifier downgrade testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'OAuth PKCE verifier downgrade testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify public clients cannot omit PKCE or downgrade from S256 safely?',
  intentBoundary: 'Owns PKCE downgrade resistance, not the complete authorization-code flow.',
  secondaryKeywords: [
    'plain challenge rejection',
    'missing code_verifier',
    'S256 enforcement',
    'OAuth PKCE verifier downgrade testing checklist',
    'OAuth PKCE verifier downgrade testing CI strategy',
    'OAuth PKCE verifier downgrade testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/oauth-security-testing/SKILL.md',
    'seed-skills/authentication-testing/SKILL.md',
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
    'https://www.rfc-editor.org/rfc/rfc7636.html',
    'https://www.rfc-editor.org/rfc/rfc9700.html',
  ],
  codeExamples: [
    {
      title: 'Build the OAuth PKCE verifier downgrade testing baseline',
      language: 'typescript',
      path: 'seed-skills/oauth-security-testing/SKILL.md',
      snippet:
        '// Example oauth pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/authentication-testing/SKILL.md',
      snippet: '',
    },
  ],
});
