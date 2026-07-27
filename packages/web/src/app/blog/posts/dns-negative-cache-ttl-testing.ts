import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 796,
  slug: 'dns-negative-cache-ttl-testing',
  campaignCluster: 'system-quality',
  title: 'Dns Negative Cache Ttl Testing',
  description:
    'DNS negative cache TTL testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'DNS negative cache TTL testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify NXDOMAIN and NODATA responses expire according to authoritative policy?',
  intentBoundary: 'Owns negative caching, not positive DNS load-test caching.',
  secondaryKeywords: [
    'NXDOMAIN cache expiry',
    'SOA minimum TTL',
    'NODATA retry timing',
    'DNS negative cache TTL testing checklist',
    'DNS negative cache TTL testing CI strategy',
    'DNS negative cache TTL testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/dns-testing/SKILL.md',
    'seed-skills/network-latency-testing/SKILL.md',
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
    'https://www.rfc-editor.org/rfc/rfc2308.html',
    'https://www.rfc-editor.org/rfc/rfc8767.html',
  ],
  codeExamples: [
    {
      title: 'Build the DNS negative cache TTL testing baseline',
      language: 'python',
      path: 'seed-skills/dns-testing/SKILL.md',
      snippet:
        '// Example dns pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/network-latency-testing/SKILL.md',
      snippet: '',
    },
  ],
});
