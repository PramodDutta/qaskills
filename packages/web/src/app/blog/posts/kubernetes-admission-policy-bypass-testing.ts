import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 826,
  slug: 'kubernetes-admission-policy-bypass-testing',
  campaignCluster: 'system-quality',
  title: 'Kubernetes Admission Policy Bypass Testing',
  description:
    'Kubernetes admission policy bypass testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Kubernetes admission policy bypass testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify subresources, updates, and alternate API versions cannot bypass policy?',
  intentBoundary: 'Owns admission coverage gaps, not general pod security configuration.',
  secondaryKeywords: [
    'subresource admission check',
    'API version policy bypass',
    'update operation validation',
    'Kubernetes admission policy bypass testing checklist',
    'Kubernetes admission policy bypass testing CI strategy',
    'Kubernetes admission policy bypass testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/kubernetes-testing/SKILL.md',
    'seed-skills/security-best-practices/SKILL.md',
    'packages/web/src/app/blog/posts/chaos-mesh-kubernetes-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/api-security-testing-checklist-2026',
    '/blog/dast-vs-sast-vs-sca-qa-guide-2026',
    '/blog/security-testing-ai-generated-code',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'api-security-testing-checklist-2026',
    'dast-vs-sast-vs-sca-qa-guide-2026',
    'security-testing-ai-generated-code',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/',
    'https://kubernetes.io/docs/concepts/security/pod-security-admission/',
  ],
  codeExamples: [
    {
      title: 'Build the Kubernetes admission policy bypass testing baseline',
      language: 'yaml',
      path: 'seed-skills/kubernetes-testing/SKILL.md',
      snippet:
        '// Example kubernetes pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'markdown',
      path: 'seed-skills/security-best-practices/SKILL.md',
      snippet:
        '- **Recommendation:** [Specific fix]\n\n## High Findings\n...\n\n## Medium Findings\n...',
    },
  ],
});
