import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 800,
  slug: 'kubernetes-topology-spread-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Topology Spread Testing',
  description:
    'Kubernetes topology spread testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Kubernetes topology spread testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify pods distribute across zones and react predictably to unsatisfiable constraints?',
  intentBoundary: 'Owns topology spread constraints, not multi-region database consistency.',
  secondaryKeywords: [
    'maxSkew assertion',
    'whenUnsatisfiable behavior',
    'zone distribution test',
    'Kubernetes topology spread testing checklist',
    'Kubernetes topology spread testing CI strategy',
    'Kubernetes topology spread testing failure diagnosis',
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
    'https://kubernetes.io/docs/concepts/workloads/pods/disruptions/',
    'https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/',
  ],
  codeExamples: [
    {
      title: 'Build the Kubernetes topology spread testing baseline',
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
