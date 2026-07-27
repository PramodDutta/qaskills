import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 870,
  slug: 'tls-certificate-chain-order-testing',
  campaignCluster: 'system-quality',
  title: 'Tls Certificate Chain Order Testing',
  description:
    'TLS certificate chain order testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'TLS certificate chain order testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify servers present a complete, correctly ordered chain across clients?',
  intentBoundary: 'Owns server certificate-chain assembly, not mTLS revocation or session tickets.',
  secondaryKeywords: [
    'missing intermediate certificate',
    'cross-signed chain',
    'client trust path',
    'TLS certificate chain order testing checklist',
    'TLS certificate chain order testing CI strategy',
    'TLS certificate chain order testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/network-latency-testing/SKILL.md',
    'seed-skills/load-balancer-testing/SKILL.md',
    'packages/web/src/app/blog/posts/chaos-engineering-resilience-testing.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/chaos-engineering-resilience-testing',
    '/blog/microservices-testing-strategies',
    '/blog/api-testing-complete-guide',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'chaos-engineering-resilience-testing',
    'microservices-testing-strategies',
    'api-testing-complete-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://www.rfc-editor.org/rfc/rfc8446.html',
    'https://www.rfc-editor.org/rfc/rfc5280.html',
  ],
  codeExamples: [
    {
      title: 'Build the TLS certificate chain order testing baseline',
      language: 'python',
      path: 'seed-skills/network-latency-testing/SKILL.md',
      snippet:
        '// Example network pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/load-balancer-testing/SKILL.md',
      snippet: '',
    },
  ],
});
