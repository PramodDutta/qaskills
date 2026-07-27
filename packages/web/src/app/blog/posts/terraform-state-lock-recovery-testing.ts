import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 865,
  slug: 'terraform-state-lock-recovery-testing',
  campaignCluster: 'system-quality',
  title: 'Terraform State Lock Recovery Testing',
  description:
    'Terraform state lock recovery testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Terraform state lock recovery testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify crashed applies leave recoverable locks without enabling concurrent writes?',
  intentBoundary: 'Owns backend lock recovery, not state migration or drift detection.',
  secondaryKeywords: [
    'stale state lock',
    'force-unlock safety',
    'concurrent apply rejection',
    'Terraform state lock recovery testing checklist',
    'Terraform state lock recovery testing CI strategy',
    'Terraform state lock recovery testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/terraform-testing/SKILL.md',
    'seed-skills/infrastructure-drift-detection/SKILL.md',
    'packages/web/src/app/blog/posts/docker-testing-strategies-guide.ts',
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
    'https://developer.hashicorp.com/terraform/language/tests',
    'https://developer.hashicorp.com/terraform/language/state/locking',
  ],
  codeExamples: [
    {
      title: 'Build the Terraform state lock recovery testing baseline',
      language: 'go',
      path: 'seed-skills/terraform-testing/SKILL.md',
      snippet:
        '// Example terraform pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/infrastructure-drift-detection/SKILL.md',
      snippet: '',
    },
  ],
});
