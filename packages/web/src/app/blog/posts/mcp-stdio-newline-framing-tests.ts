import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 319,
  slug: 'mcp-stdio-newline-framing-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Stdio Newline Framing Tests',
  description:
    'MCP stdio newline framing tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP stdio newline framing tests',
  intent: 'how-to',
  coreQuestion:
    'How should tests detect missing delimiters, embedded newlines, split writes, and multiple JSON-RPC messages in an MCP stdio stream?',
  intentBoundary:
    'The Inspector article covers tools/list and tools/call automation. This candidate tests transport framing before tool semantics are involved.',
  secondaryKeywords: [
    'newline delimited JSON-RPC tests',
    'MCP message boundary testing',
    'stdio split chunk parser',
    'embedded newline protocol failure',
    'multiple MCP messages stdout',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/tsup.config.ts'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/mcp-inspector-tutorial-2026',
    '/blog/mcp-server-contract-testing-guide',
    '/blog/test-an-mcp-server-guide-2026',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'mcp-inspector-tutorial-2026',
    'mcp-server-contract-testing-guide',
    'test-an-mcp-server-guide-2026',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://www.jsonrpc.org/specification',
  ],
  codeExamples: [
    {
      title: 'Build the MCP stdio newline framing tests baseline',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {\n  const url = new URL(pathname, BASE);\n\n  for (const [key, value] of Object.entries(params ?? {})) {\n    if (value !== undefined && value !== '') {\n      url.searchParams.set(key, String(value));\n    }\n  }\n\n  return url.toString();\n}\n\nasync function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/mcp/tsup.config.ts',
      snippet: '',
    },
  ],
});
