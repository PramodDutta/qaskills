import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 804,
  slug: 'kubernetes-graceful-termination-drain-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Graceful Termination Drain Testing',
  description:
    'Kubernetes graceful termination drain testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Kubernetes graceful termination drain testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify endpoints drain before SIGTERM deadlines and forced pod shutdown?',
  intentBoundary: 'Owns pod request draining, not load-balancer session drain outside Kubernetes.',
  secondaryKeywords: [
    'preStop drain ordering',
    'terminationGracePeriodSeconds',
    'endpoint removal race',
    'Kubernetes graceful termination drain testing checklist',
    'Kubernetes graceful termination drain testing CI strategy',
    'Kubernetes graceful termination drain testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/kubernetes-testing/SKILL.md',
    'seed-skills/chaos-testing-kubernetes/SKILL.md',
    'packages/web/src/app/blog/posts/chaos-mesh-kubernetes-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/chaos-mesh-kubernetes-testing-guide',
    '/blog/docker-testing-strategies-guide',
    '/blog/cloudflare-workers-testing-guide',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'chaos-mesh-kubernetes-testing-guide',
    'docker-testing-strategies-guide',
    'cloudflare-workers-testing-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/',
    'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
  ],
  codeExamples: [
    {
      title: 'Build the Kubernetes graceful termination drain testing baseline',
      language: 'yaml',
      path: 'seed-skills/kubernetes-testing/SKILL.md',
      snippet:
        '// Example kubernetes pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'yaml',
      path: 'seed-skills/chaos-testing-kubernetes/SKILL.md',
      snippet: '',
    },
  ],
});
