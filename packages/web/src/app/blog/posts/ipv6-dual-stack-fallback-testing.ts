import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 758,
  slug: 'ipv6-dual-stack-fallback-testing',
  campaignCluster: 'system-quality',
  title: 'Ipv6 Dual Stack Fallback Testing',
  description:
    'IPv6 dual stack fallback testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'IPv6 dual stack fallback testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify clients race and fall back between IPv6 and IPv4 without long stalls?',
  intentBoundary: 'Owns Happy Eyeballs behavior, not DNS record propagation or NAT exhaustion.',
  secondaryKeywords: [
    'Happy Eyeballs timing',
    'broken IPv6 path',
    'AAAA A fallback',
    'IPv6 dual stack fallback testing checklist',
    'IPv6 dual stack fallback testing CI strategy',
    'IPv6 dual stack fallback testing failure diagnosis',
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
    'https://www.rfc-editor.org/rfc/rfc8305.html',
    'https://www.rfc-editor.org/rfc/rfc8200.html',
  ],
  codeExamples: [
    {
      title: 'Build the IPv6 dual stack fallback testing baseline',
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
