import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 873,
  slug: 'tls-session-resumption-policy-testing',
  campaignCluster: 'system-quality',
  title: 'Tls Session Resumption Policy Testing',
  description:
    'TLS session resumption policy testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'TLS session resumption policy testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify resumed sessions preserve protocol, identity, and rotation policy guarantees?',
  intentBoundary:
    'Owns session tickets and PSK resumption, not full handshakes or certificate ordering.',
  secondaryKeywords: [
    'session ticket key rotation',
    'resumed client authentication',
    'TLS PSK expiry',
    'TLS session resumption policy testing checklist',
    'TLS session resumption policy testing CI strategy',
    'TLS session resumption policy testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/ssl-tls-testing/SKILL.md',
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
    'https://www.rfc-editor.org/rfc/rfc8446.html',
    'https://www.rfc-editor.org/rfc/rfc5280.html',
  ],
  codeExamples: [
    {
      title: 'Build the TLS session resumption policy testing baseline',
      language: 'python',
      path: 'seed-skills/ssl-tls-testing/SKILL.md',
      snippet:
        '// Example ssl pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/authentication-testing/SKILL.md',
      snippet: '',
    },
  ],
});
