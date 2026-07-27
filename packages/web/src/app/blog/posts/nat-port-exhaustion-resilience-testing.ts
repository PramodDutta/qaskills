import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 830,
  slug: 'nat-port-exhaustion-resilience-testing',
  campaignCluster: 'system-quality',
  title: 'Nat Port Exhaustion Resilience Testing',
  description:
    'NAT port exhaustion resilience testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'NAT port exhaustion resilience testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify connection-heavy services detect and recover from ephemeral port depletion?',
  intentBoundary: 'Owns NAT translation capacity, not server connection-pool saturation.',
  secondaryKeywords: [
    'SNAT port allocation',
    'ephemeral port reuse',
    'outbound connection failure',
    'NAT port exhaustion resilience testing checklist',
    'NAT port exhaustion resilience testing CI strategy',
    'NAT port exhaustion resilience testing failure diagnosis',
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
    'https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html',
    'https://www.rfc-editor.org/rfc/rfc4787.html',
  ],
  codeExamples: [
    {
      title: 'Build the NAT port exhaustion resilience testing baseline',
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
