import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 840,
  slug: 'password-reset-token-single-use-testing',
  campaignCluster: 'system-quality',
  title: 'Password Reset Token Single Use Testing',
  description:
    'password reset token single use testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'password reset token single use testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams verify reset tokens expire, bind to intent, and fail after the first use?',
  intentBoundary: 'Owns reset-token lifecycle, not general session logout or MFA recovery.',
  secondaryKeywords: [
    'concurrent reset token use',
    'reset token expiry',
    'password change invalidation',
    'password reset token single use testing checklist',
    'password reset token single use testing CI strategy',
    'password reset token single use testing failure diagnosis',
  ],
  repoEvidence: [
    'seed-skills/owasp-security/SKILL.md',
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
    'https://owasp.org/www-project-application-security-verification-standard/',
    'https://owasp.org/www-project-web-security-testing-guide/',
  ],
  codeExamples: [
    {
      title: 'Build the password reset token single use testing baseline',
      language: 'typescript',
      path: 'seed-skills/owasp-security/SKILL.md',
      snippet:
        "import { test, expect } from '@playwright/test';\n\ntest.describe('Access Control Tests', () => {\n  test('regular user cannot access admin endpoints', async ({ request }) => {\n    // Login as regular user\n    const loginRes = await request.post('/api/auth/login', {\n      data: { email: 'user@example.com', password: 'UserPass123!' },\n    });\n    const { token } = await loginRes.json();\n\n    // Attempt to access admin-only endpoint\n    const adminRes = await request.get('/api/admin/users', {\n      headers: { Authorization: `Bearer ${token}` },\n    });\n    expect(adminRes.status()).toBe(403);\n  });\n\n  test('user cannot access other users data via IDOR', async ({ request }) => {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/authentication-testing/SKILL.md',
      snippet: '',
    },
  ],
});
