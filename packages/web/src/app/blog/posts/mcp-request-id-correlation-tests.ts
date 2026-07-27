import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 374,
  slug: 'mcp-request-id-correlation-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Request Id Correlation Tests',
  description:
    'MCP request ID correlation tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP request ID correlation tests',
  intent: 'how-to',
  coreQuestion:
    'How can concurrent MCP tests prove every JSON-RPC response retains the correct request ID when tool calls finish out of order?',
  intentBoundary:
    'The agent article evaluates model-selected calls and side effects. This candidate verifies transport-level response correlation under concurrency.',
  secondaryKeywords: [
    'JSON-RPC response correlation',
    'concurrent MCP request IDs',
    'out of order tool responses',
    'duplicate JSON-RPC ID test',
    'MCP async response matching',
  ],
  repoEvidence: ['packages/mcp/src/index.ts#evidence-1', 'packages/mcp/src/index.ts#evidence-2'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/mcp-server-testing-guide-2026',
    '/blog/mcp-inspector-tutorial-2026',
    '/blog/agent-tool-use-regression-testing-guide-2026',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'mcp-server-testing-guide-2026',
    'mcp-inspector-tutorial-2026',
    'agent-tool-use-regression-testing-guide-2026',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://www.jsonrpc.org/specification',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://ts.sdk.modelcontextprotocol.io/',
  ],
  codeExamples: [
    {
      title: 'Build the MCP request ID correlation tests baseline',
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
