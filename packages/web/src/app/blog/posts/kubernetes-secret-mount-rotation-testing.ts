import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 829,
  slug: 'kubernetes-secret-mount-rotation-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Secret Mount Rotation Testing',
  description:
    'Kubernetes Secret mount rotation testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Kubernetes Secret mount rotation testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify projected secret updates reach workloads without stale credentials?',
  intentBoundary: 'Owns mounted secret refresh, not application dual-secret overlap policy.',
  secondaryKeywords: [
    'projected secret refresh',
    'subPath rotation limitation',
    'credential mount update',
    'Kubernetes Secret mount rotation testing checklist',
    'Kubernetes Secret mount rotation testing CI strategy',
    'Kubernetes Secret mount rotation testing failure diagnosis',
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
    'https://kubernetes.io/docs/concepts/configuration/configmap/',
    'https://kubernetes.io/docs/concepts/configuration/secret/',
  ],
  codeExamples: [
    {
      title: 'Build the Kubernetes Secret mount rotation testing baseline',
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
