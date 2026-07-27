import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 828,
  slug: 'kubernetes-resource-quota-rejection-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Resource Quota Rejection Testing',
  description:
    'Kubernetes resource quota rejection testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Kubernetes resource quota rejection testing',
  intent: 'how-to',
  coreQuestion: 'How can QA teams verify workload creation fails clearly at hard quota boundaries?',
  intentBoundary: 'Owns namespace quota admission, not runtime CPU throttling or HPA scaling.',
  secondaryKeywords: [
    'hard quota exceeded',
    'LimitRange interaction',
    'quota status usage',
    'Kubernetes resource quota rejection testing checklist',
    'Kubernetes resource quota rejection testing CI strategy',
    'Kubernetes resource quota rejection testing failure diagnosis',
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
      title: 'Build the Kubernetes resource quota rejection testing baseline',
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
