import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 855,
  slug: 'quic-version-negotiation-testing',
  campaignCluster: 'system-quality',
  title: 'Quic Version Negotiation Testing',
  description:
    'QUIC version negotiation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QUIC version negotiation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify unsupported versions negotiate safely without downgrade loops?',
  intentBoundary:
    'Owns QUIC version negotiation packets, not TLS application protocol negotiation.',
  secondaryKeywords: [
    'version negotiation packet',
    'unsupported QUIC version',
    'downgrade protection',
    'QUIC version negotiation testing checklist',
    'QUIC version negotiation testing CI strategy',
    'QUIC version negotiation testing failure diagnosis',
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
    'https://www.rfc-editor.org/rfc/rfc9000.html',
    'https://www.rfc-editor.org/rfc/rfc9368.html',
  ],
  codeExamples: [
    {
      title: 'Build the QUIC version negotiation testing baseline',
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
