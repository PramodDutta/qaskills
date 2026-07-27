import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 328,
  slug: 'mcp-api-trailing-slash-normalization',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP API Trailing Slash Normalization',
  description:
    'MCP API trailing slash normalization: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP API trailing slash normalization',
  intent: 'troubleshooting',
  coreQuestion:
    'How can tests prove API base URLs with zero, one, or repeated trailing slashes produce the intended endpoint paths?',
  intentBoundary:
    'The existing article tests query parameter contracts. This candidate focuses base-path resolution before any query parameters are added.',
  secondaryKeywords: [
    'MCP double slash URL bug',
    'API base trailing slash',
    'new URL path resolution test',
    'QASKILLS_API_URL normalization',
    'MCP endpoint construction',
  ],
  repoEvidence: ['packages/mcp/src/index.ts#evidence-1', 'packages/mcp/src/index.ts#evidence-2'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/qaskills-mcp-server-guide',
    '/blog/mcp-search-filter-schema-drift-contract-tests',
    '/blog/mcp-api-timeout-abortcontroller-testing',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-api-timeout-abortcontroller-testing',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://nodejs.org/api/url.html',
    'https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams',
  ],
  codeExamples: [
    {
      title: 'Build the MCP API trailing slash normalization baseline',
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
