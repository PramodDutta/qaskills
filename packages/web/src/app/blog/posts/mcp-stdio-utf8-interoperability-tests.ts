import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 342,
  slug: 'mcp-stdio-utf8-interoperability-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Stdio Utf-8 Interoperability Tests',
  description:
    'MCP stdio UTF-8 interoperability tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP stdio UTF-8 interoperability tests',
  intent: 'how-to',
  coreQuestion:
    'How can MCP client and server tests verify UTF-8 correctness for non-ASCII tool arguments, skill names, markdown, and error text?',
  intentBoundary:
    'The contract guide focuses tool schemas and errors. This candidate focuses character encoding across transport, API text, and filesystem boundaries.',
  secondaryKeywords: [
    'MCP Unicode tool argument test',
    'JSON-RPC UTF-8 encoding',
    'non-ASCII SKILL.md install',
    'stdio emoji response testing',
    'MCP invalid byte sequence',
  ],
  repoEvidence: ['packages/mcp/src/index.ts#evidence-1', 'packages/mcp/src/index.ts#evidence-2'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/mcp-server-contract-testing-guide',
    '/blog/qaskills-mcp-server-guide',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'qaskills-mcp-server-guide',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://www.jsonrpc.org/specification',
    'https://nodejs.org/api/fs.html',
  ],
  codeExamples: [
    {
      title: 'Build the MCP stdio UTF-8 interoperability tests baseline',
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
