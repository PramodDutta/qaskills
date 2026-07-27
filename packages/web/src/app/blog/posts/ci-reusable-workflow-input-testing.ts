import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 858,
  slug: 'ci-reusable-workflow-input-testing',
  campaignCluster: 'system-quality',
  title: 'CI Reusable Workflow Input Testing',
  description:
    'CI reusable workflow input testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'CI reusable workflow input testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify required, typed, defaulted, and secret inputs across workflow callers?',
  intentBoundary: 'Owns reusable-workflow call contracts, not application API inputs.',
  secondaryKeywords: [
    'workflow_call input type',
    'missing reusable secret',
    'caller default value',
    'CI reusable workflow input testing checklist',
    'CI reusable workflow input testing CI strategy',
    'CI reusable workflow input testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/github-actions-testing/SKILL.md',
    'seed-skills/cicd-pipeline/SKILL.md',
    'packages/web/src/app/blog/posts/cicd-testing-pipeline-github-actions.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/cicd-testing-pipeline-github-actions',
    '/blog/devops-testing-strategy-guide',
    '/blog/github-actions-testing-ci-cd-guide',
    '/blog/api-testing-best-practices-guide',
  ],
  relatedSlugs: [
    'cicd-testing-pipeline-github-actions',
    'devops-testing-strategy-guide',
    'github-actions-testing-ci-cd-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax',
    'https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs',
  ],
  codeExamples: [
    {
      title: 'Build the CI reusable workflow input testing baseline',
      language: 'yaml',
      path: 'seed-skills/github-actions-testing/SKILL.md',
      snippet:
        '// Example github-actions pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/cicd-pipeline/SKILL.md',
      snippet:
        '/                    \\  Static Analysis\n         /                      \\  ~30 seconds - 2 minutes\n        /________________________\\',
    },
  ],
});
