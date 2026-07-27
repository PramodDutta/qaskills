import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 812,
  slug: 'mtls-client-certificate-revocation-testing',
  campaignCluster: 'system-quality',
  title: 'Mtls Client Certificate Revocation Testing',
  description:
    'mTLS client certificate revocation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'mTLS client certificate revocation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify revoked, expired, and wrong-purpose client certificates fail closed?',
  intentBoundary: 'Owns client certificate status and EKU, not server TLS chain validation.',
  secondaryKeywords: [
    'CRL client certificate',
    'OCSP revocation test',
    'clientAuth EKU',
    'mTLS client certificate revocation testing checklist',
    'mTLS client certificate revocation testing CI strategy',
    'mTLS client certificate revocation testing failure diagnosis',
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
      title: 'Build the mTLS client certificate revocation testing baseline',
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
