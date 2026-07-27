import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 815,
  slug: 'oauth-device-code-polling-abuse-testing',
  campaignCluster: 'system-quality',
  title: 'Oauth Device Code Polling Abuse Testing',
  description:
    'OAuth device code polling abuse testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'OAuth device code polling abuse testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify slow_down, expiry, denial, and brute-force controls in device authorization?',
  intentBoundary: 'Owns device-code polling controls, not browser-based OAuth redirects.',
  secondaryKeywords: [
    'slow_down polling response',
    'expired device code',
    'user code guessing',
    'OAuth device code polling abuse testing checklist',
    'OAuth device code polling abuse testing CI strategy',
    'OAuth device code polling abuse testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/oauth-security-testing/SKILL.md',
    'seed-skills/authentication-testing/SKILL.md',
    'packages/web/src/app/blog/posts/api-security-testing-checklist-2026.ts',
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
    'https://www.rfc-editor.org/rfc/rfc8628.html',
    'https://www.rfc-editor.org/rfc/rfc9700.html',
  ],
  codeExamples: [
    {
      title: 'Build the OAuth device code polling abuse testing baseline',
      language: 'typescript',
      path: 'seed-skills/oauth-security-testing/SKILL.md',
      snippet:
        '// Example oauth pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/authentication-testing/SKILL.md',
      snippet: '',
    },
  ],
});
