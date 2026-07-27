import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 827,
  slug: 'kubernetes-probe-ordering-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Probe Ordering Testing',
  description:
    'Kubernetes probe ordering testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Kubernetes probe ordering testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify startup, readiness, and liveness probes activate in the intended sequence?',
  intentBoundary: 'Owns probe interaction and gating, not endpoint implementation details.',
  secondaryKeywords: [
    'startup probe gate',
    'readiness before liveness',
    'probe transition timeline',
    'Kubernetes probe ordering testing checklist',
    'Kubernetes probe ordering testing CI strategy',
    'Kubernetes probe ordering testing failure diagnosis',
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
      title: 'Build the Kubernetes probe ordering testing baseline',
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
