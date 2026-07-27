import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 776,
  slug: 'kubernetes-default-deny-policy-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Default Deny Policy Testing',
  description:
    'Kubernetes default deny policy testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Kubernetes default deny policy testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify ingress and egress remain blocked except for explicit NetworkPolicy paths?',
  intentBoundary:
    'Owns Kubernetes network isolation, not admission policy or service-mesh retries.',
  secondaryKeywords: [
    'default deny ingress',
    'DNS egress exception',
    'namespace selector access',
    'Kubernetes default deny policy testing checklist',
    'Kubernetes default deny policy testing CI strategy',
    'Kubernetes default deny policy testing failure diagnosis',
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
    'https://kubernetes.io/docs/concepts/services-networking/network-policies/',
    'https://kubernetes.io/docs/concepts/services-networking/service/',
  ],
  codeExamples: [
    {
      title: 'Build the Kubernetes default deny policy testing baseline',
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
