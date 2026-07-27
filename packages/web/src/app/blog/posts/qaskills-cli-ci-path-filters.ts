import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 310,
  slug: 'qaskills-cli-ci-path-filters',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills CLI CI Path Filters',
  description:
    'QASkills CLI CI path filters: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'QASkills CLI CI path filters',
  intent: 'how-to',
  coreQuestion:
    'Which file changes trigger QASkills CLI CI, and how can workflow tests catch shared-package changes that would otherwise skip validation?',
  intentBoundary: 'Change-based CI trigger coverage, not build task order or npm release tags.',
  secondaryKeywords: [
    'GitHub Actions path filter tests',
    'CLI workflow shared package trigger',
    'qaskills CI change detection',
    'pull request paths regression',
    'workflow trigger coverage',
    'monorepo CI path filters',
  ],
  repoEvidence: [
    '.github/workflows/cli-ci.yml#evidence-1',
    '.github/workflows/cli-ci.yml#evidence-2',
    'packages/cli/package.json',
    'packages/shared/package.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/blog/github-actions-testing-ci-cd-guide',
    '/blog/distribute-agent-skills-across-team-monorepo',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'github-actions-testing-ci-cd-guide',
    'distribute-agent-skills-across-team-monorepo',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax',
    'https://pnpm.io/continuous-integration',
    'https://pnpm.io/filtering',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills CLI CI path filters baseline',
      language: 'yaml',
      path: '.github/workflows/cli-ci.yml',
      snippet: 'run: pnpm --filter @qaskills/cli test',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'yaml',
      path: '.github/workflows/cli-ci.yml',
      snippet: '',
    },
  ],
});
