import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 254,
  slug: 'mcp-install-path-traversal-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Install Path Traversal Testing',
  description:
    'MCP install path traversal testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP install path traversal testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How can security tests prove a malicious MCP skill slug or targetDir cannot escape the intended project skills directory?',
  intentBoundary:
    'Tool poisoning concerns deceptive metadata and instructions. This candidate tests concrete local path escape through install_skill inputs.',
  secondaryKeywords: [
    'MCP directory traversal test',
    'malicious skill slug path',
    'targetDir escape prevention',
    'MCP filesystem sandbox test',
    'install_skill path security',
  ],
  repoEvidence: ['packages/mcp/src/index.ts#evidence-1', 'packages/mcp/src/index.ts#evidence-2'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/mcp-tool-poisoning-testing-guide-2026',
    '/blog/agent-skill-security-review-checklist',
    '/blog/qaskills-mcp-server-guide',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'mcp-tool-poisoning-testing-guide-2026',
    'agent-skill-security-review-checklist',
    'qaskills-mcp-server-guide',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://owasp.org/www-community/attacks/Path_Traversal',
    'https://cwe.mitre.org/data/definitions/22.html',
    'https://nodejs.org/api/path.html',
  ],
  codeExamples: [
    {
      title: 'Build the MCP install path traversal testing baseline',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {\n  const url = new URL(pathname, BASE);\n\n  for (const [key, value] of Object.entries(params ?? {})) {\n    if (value !== undefined && value !== '') {\n      url.searchParams.set(key, String(value));\n    }\n  }\n\n  return url.toString();\n}\n\nasync function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {\n      ...init,\n      signal: controller.signal,\n      headers: {\n        'User-Agent': `@qaskills/mcp/${VERSION}`,\n        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),\n        ...(init?.headers ?? {}),\n      },\n    });\n\n    if (!response.ok) {\n      const body = await response.text().catch(() => '');\n      const detail = body || response.statusText;",
    },
  ],
});
