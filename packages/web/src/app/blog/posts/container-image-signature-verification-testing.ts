import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 794,
  slug: 'container-image-signature-verification-testing',
  campaignCluster: 'system-quality',
  title: 'Container Image Signature Verification Testing',
  description:
    'container image signature verification testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'container image signature verification testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify unsigned, tampered, and untrusted container images are rejected before deploy?',
  intentBoundary: 'Owns image signature trust policy, not vulnerability scanning or SBOM contents.',
  secondaryKeywords: [
    'Cosign signature policy',
    'untrusted image issuer',
    'tampered image digest',
    'container image signature verification testing checklist',
    'container image signature verification testing CI strategy',
    'container image signature verification testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/dependency-vulnerability-scanner/SKILL.md',
    'seed-skills/compliance-as-code/SKILL.md',
    'packages/web/src/app/blog/posts/dast-vs-sast-vs-sca-qa-guide-2026.ts',
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
  sources: ['https://slsa.dev/spec/v1.1/', 'https://docs.sigstore.dev/cosign/verifying/verify/'],
  codeExamples: [
    {
      title: 'Build the container image signature verification testing baseline',
      language: 'typescript',
      path: 'seed-skills/dependency-vulnerability-scanner/SKILL.md',
      snippet:
        '// Example dependency pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'python',
      path: 'seed-skills/compliance-as-code/SKILL.md',
      snippet: '',
    },
  ],
});
