import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 791,
  slug: 'load-balancer-session-draining-testing',
  campaignCluster: 'system-quality',
  title: 'Load Balancer Session Draining Testing',
  description:
    'load balancer session draining testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'load balancer session draining testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify removed targets finish in-flight work and reject new sessions cleanly?',
  intentBoundary: 'Owns external target draining, not Kubernetes pod termination ordering.',
  secondaryKeywords: [
    'deregistration delay',
    'in-flight request drain',
    'new connection rejection',
    'load balancer session draining testing checklist',
    'load balancer session draining testing CI strategy',
    'load balancer session draining testing failure diagnosis',
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
    'https://www.rfc-editor.org/rfc/rfc9110.html',
    'https://www.rfc-editor.org/rfc/rfc9293.html',
  ],
  codeExamples: [
    {
      title: 'Build the load balancer session draining testing baseline',
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
