import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 779,
  slug: 'kubernetes-job-backoff-limit-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Job Backoff Limit Testing',
  description:
    'Kubernetes Job backoff limit testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Kubernetes Job backoff limit testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify failed pods stop, retry, or mark jobs failed at exact boundaries?',
  intentBoundary: 'Owns Job retry accounting, not application-level retry budgets.',
  secondaryKeywords: [
    'backoffLimit boundary',
    'podFailurePolicy rule',
    'Job terminal condition',
    'Kubernetes Job backoff limit testing checklist',
    'Kubernetes Job backoff limit testing CI strategy',
    'Kubernetes Job backoff limit testing failure diagnosis',
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
    'https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/',
    'https://kubernetes.io/docs/concepts/workloads/controllers/job/',
  ],
  codeExamples: [
    {
      title: 'Build the Kubernetes Job backoff limit testing baseline',
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
