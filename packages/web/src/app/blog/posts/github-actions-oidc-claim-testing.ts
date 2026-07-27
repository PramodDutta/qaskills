import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 798,
  slug: 'github-actions-oidc-claim-testing',
  campaignCluster: 'system-quality',
  title: 'Github Actions Oidc Claim Testing',
  description:
    'GitHub Actions OIDC claim testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'GitHub Actions OIDC claim testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify cloud trust policies accept only intended repositories, refs, and workflows?',
  intentBoundary: 'Owns OIDC token claims, not stored secret masking or package publishing.',
  secondaryKeywords: [
    'sub claim pattern',
    'workflow_ref claim',
    'pull request trust policy',
    'GitHub Actions OIDC claim testing checklist',
    'GitHub Actions OIDC claim testing CI strategy',
    'GitHub Actions OIDC claim testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/compliance-as-code/SKILL.md',
    'seed-skills/codeql-security/SKILL.md',
    'packages/web/src/app/blog/posts/devops-testing-strategy-guide.ts',
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
    'https://docs.github.com/en/actions/concepts/security/openid-connect',
    'https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations',
  ],
  codeExamples: [
    {
      title: 'Build the GitHub Actions OIDC claim testing baseline',
      language: 'python',
      path: 'seed-skills/compliance-as-code/SKILL.md',
      snippet:
        '// Example compliance pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/codeql-security/SKILL.md',
      snippet: '',
    },
  ],
});
