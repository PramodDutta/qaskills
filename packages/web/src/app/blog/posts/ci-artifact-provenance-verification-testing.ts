import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 854,
  slug: 'ci-artifact-provenance-verification-testing',
  campaignCluster: 'system-quality',
  title: 'CI Artifact Provenance Verification Testing',
  description:
    'CI artifact provenance verification testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'CI artifact provenance verification testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams prove release artifacts match trusted builders, source commits, and workflow identities?',
  intentBoundary: 'Owns provenance verification, not artifact retention or upload conditions.',
  secondaryKeywords: [
    'build attestation signature',
    'source commit provenance',
    'trusted builder identity',
    'CI artifact provenance verification testing checklist',
    'CI artifact provenance verification testing CI strategy',
    'CI artifact provenance verification testing failure diagnosis',
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
  sources: ['https://slsa.dev/spec/v1.1/', 'https://in-toto.io/'],
  codeExamples: [
    {
      title: 'Build the CI artifact provenance verification testing baseline',
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
