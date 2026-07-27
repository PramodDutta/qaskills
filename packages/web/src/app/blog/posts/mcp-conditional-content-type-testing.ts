import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 329,
  slug: 'mcp-conditional-content-type-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Conditional Content Type Testing',
  description:
    'MCP conditional content type testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP conditional content type testing',
  intent: 'how-to',
  coreQuestion:
    'How can tests prove JSON Content-Type is added for telemetry POST bodies but not unnecessarily added to read-only GET requests?',
  intentBoundary:
    'The server contract article focuses MCP tool inputs and outputs. This candidate targets the downstream HTTP client header policy.',
  secondaryKeywords: [
    'MCP request Content-Type header',
    'JSON telemetry POST header',
    'GET request header test',
    'fetch body header behavior',
    'custom Content-Type override',
  ],
  repoEvidence: ['packages/mcp/src/index.ts#evidence-1', 'packages/mcp/src/index.ts#evidence-2'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/qaskills-mcp-server-guide',
    '/blog/qaskills-cli-disable-telemetry-do-not-track',
    '/blog/mcp-server-contract-testing-guide',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'qaskills-cli-disable-telemetry-do-not-track',
    'mcp-server-contract-testing-guide',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://nodejs.org/api/globals.html#fetch',
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  codeExamples: [
    {
      title: 'Build the MCP conditional content type testing baseline',
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
