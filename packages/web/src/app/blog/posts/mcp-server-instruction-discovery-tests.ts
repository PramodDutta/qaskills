import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 284,
  slug: 'mcp-server-instruction-discovery-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Server Instruction Discovery Tests',
  description:
    'MCP server instruction discovery tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP server instruction discovery tests',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test MCP server instruction discovery tests, including server-level instructions visible during initialization?',
  intentBoundary:
    'Covers server-level instructions visible during initialization. Excludes per-tool description snapshots.',
  secondaryKeywords: [
    'how to test MCP server instruction discovery',
    'MCP server instruction discovery test cases',
    'MCP server instruction discovery edge cases',
    'MCP server instruction discovery CI validation',
    'MCP server instruction discovery failure diagnostics',
    'MCP server instruction discovery regression coverage',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts#evidence-1',
    'packages/mcp/src/index.ts#evidence-2',
    'packages/mcp/src/index.ts#evidence-3',
    'packages/mcp/src/index.ts#evidence-4',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/qaskills-mcp-server-guide',
    '/blog/mcp-server-contract-testing-guide',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://github.com/modelcontextprotocol/typescript-sdk',
  ],
  codeExamples: [
    {
      title: 'Build the MCP server instruction discovery tests baseline',
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
