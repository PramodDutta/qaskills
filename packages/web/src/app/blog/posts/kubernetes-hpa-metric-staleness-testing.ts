import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 778,
  slug: 'kubernetes-hpa-metric-staleness-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Hpa Metric Staleness Testing',
  description:
    'Kubernetes HPA metric staleness testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Kubernetes HPA metric staleness testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify missing or delayed metrics cannot drive unsafe scaling decisions?',
  intentBoundary: 'Owns autoscaler metric freshness, not stabilization-window load behavior.',
  secondaryKeywords: [
    'stale custom metric',
    'missing pod metrics',
    'HPA scaling decision',
    'Kubernetes HPA metric staleness testing checklist',
    'Kubernetes HPA metric staleness testing CI strategy',
    'Kubernetes HPA metric staleness testing failure diagnosis',
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
    'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/',
    'https://kubernetes.io/docs/concepts/policy/resource-quotas/',
  ],
  codeExamples: [
    {
      title: 'Build the Kubernetes HPA metric staleness testing baseline',
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
