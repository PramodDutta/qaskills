import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 782,
  slug: 'kubernetes-disruption-budget-eviction-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Disruption Budget Eviction Testing',
  description:
    'Kubernetes disruption budget eviction testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Kubernetes disruption budget eviction testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify voluntary evictions respect availability during drains and upgrades?',
  intentBoundary: 'Owns PDB eviction constraints, not involuntary node failure recovery.',
  secondaryKeywords: [
    'kubectl drain blocked',
    'maxUnavailable eviction',
    'disruptedPods cleanup',
    'Kubernetes disruption budget eviction testing checklist',
    'Kubernetes disruption budget eviction testing CI strategy',
    'Kubernetes disruption budget eviction testing failure diagnosis',
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
      title: 'Build the Kubernetes disruption budget eviction testing baseline',
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
