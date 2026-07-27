import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 757,
  slug: 'ci-cancellation-cleanup-testing',
  campaignCluster: 'system-quality',
  title: 'CI Cancellation Cleanup Testing',
  description:
    'CI cancellation cleanup testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'CI cancellation cleanup testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify concurrency cancellation still runs required cleanup and releases resources?',
  intentBoundary: 'Owns cancel-time cleanup, not stale run cancellation policy itself.',
  secondaryKeywords: [
    'always cleanup step',
    'concurrency cancel signal',
    'ephemeral resource leak',
    'CI cancellation cleanup testing checklist',
    'CI cancellation cleanup testing CI strategy',
    'CI cancellation cleanup testing failure diagnosis',
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
      title: 'Build the CI cancellation cleanup testing baseline',
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
