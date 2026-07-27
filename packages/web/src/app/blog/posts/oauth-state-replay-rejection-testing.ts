import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 990,
  slug: 'oauth-state-replay-rejection-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Oauth State Replay Rejection Testing',
  description:
    'OAuth state replay rejection testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'OAuth state replay rejection testing',
  intent: 'how-to',
  coreQuestion:
    'How can an OAuth test prove a state value is single-use and rejects replay, substitution, and parallel callback races?',
  intentBoundary:
    'The nearest page covers a broader security workflow. This candidate owns state-token replay and callback race rejection.',
  secondaryKeywords: [
    'OAuth state replay test',
    'authorization callback CSRF test',
    'single use OAuth state',
    'parallel OAuth callback race',
    'state substitution rejection',
  ],
  repoEvidence: [
    'seed-skills/security-best-practices/SKILL.md',
    'seed-skills/owasp-security/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/security-testing-complete-guide',
    '/blog/api-security-testing-checklist-2026',
    '/blog/owasp-zap-api-security-testing-guide-2026',
    '/blog/test-automation-framework-architecture',
  ],
  relatedSlugs: [
    'security-testing-complete-guide',
    'api-security-testing-checklist-2026',
    'owasp-zap-api-security-testing-guide-2026',
    'test-automation-framework-architecture',
  ],
  sources: [
    'https://www.w3.org/TR/CSP3/',
    'https://fetch.spec.whatwg.org/',
    'https://www.rfc-editor.org/info/rfc9700',
    'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html',
  ],
  codeExamples: [
    {
      title: 'Build the OAuth state replay rejection testing baseline',
      language: 'markdown',
      path: 'seed-skills/security-best-practices/SKILL.md',
      snippet:
        '# Security Best Practices Report\n\n## Executive Summary\n[Brief overview of findings]\n\n## Critical Findings\n### [SEC-001] Finding Title\n- **Severity:** Critical\n- **Impact:** [One sentence impact statement]\n- **Location:** `file.ts:42`\n- **Recommendation:** [Specific fix]\n\n## High Findings\n...\n\n## Medium Findings\n...',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'seed-skills/owasp-security/SKILL.md',
      snippet:
        "// Attempt to access admin-only endpoint\n    const adminRes = await request.get('/api/admin/users', {\n      headers: { Authorization: `Bearer ${token}` },\n    });\n    expect(adminRes.status()).toBe(403);\n  });\n\n  test('user cannot access other users data via IDOR', async ({ request }) => {\n    const loginRes = await request.post('/api/auth/login', {\n      data: { email: 'user1@example.com', password: 'UserPass123!' },\n    });\n    const { token } = await loginRes.json();\n\n    // Try to access another user's profile (IDOR)\n    const otherUserRes = await request.get('/api/users/other-user-id', {\n      headers: { Authorization: `Bearer ${token}` },\n    });\n    expect(otherUserRes.status()).toBe(403);",
    },
  ],
});
