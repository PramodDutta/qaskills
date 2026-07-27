import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 330,
  slug: 'mcp-unknown-tool-rejection-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Unknown Tool Rejection Testing',
  description:
    'MCP unknown tool rejection testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP unknown tool rejection testing',
  intent: 'troubleshooting',
  coreQuestion:
    'What protocol error should an MCP server return for missing, misspelled, case-changed, or removed tool names?',
  intentBoundary:
    'The existing guide discusses invalid inputs to known tools. This topic isolates unknown tool identifiers and migration behavior.',
  secondaryKeywords: [
    'MCP method not found',
    'misspelled tool name test',
    'removed MCP tool behavior',
    'case changed tool call',
    'unknown tools call error',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/README.md'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/mcp-server-contract-testing-guide',
    '/blog/mcp-inspector-tutorial-2026',
    '/blog/mcp-official-conformance-suite-server-guide-2026',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'mcp-inspector-tutorial-2026',
    'mcp-official-conformance-suite-server-guide-2026',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://www.jsonrpc.org/specification',
  ],
  codeExamples: [
    {
      title: 'Build the MCP unknown tool rejection testing baseline',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {\n  const url = new URL(pathname, BASE);\n\n  for (const [key, value] of Object.entries(params ?? {})) {\n    if (value !== undefined && value !== '') {\n      url.searchParams.set(key, String(value));\n    }\n  }\n\n  return url.toString();\n}\n\nasync function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'packages/mcp/README.md',
      snippet: '',
    },
  ],
});
