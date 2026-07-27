import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 269,
  slug: 'mcp-claude-marker-path-detection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Claude Marker Path Detection',
  description:
    'MCP Claude marker path detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP Claude marker path detection',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose MCP Claude marker path detection, including any .claude filesystem entry selecting .claude/skills?',
  intentBoundary:
    'Covers any .claude filesystem entry selecting .claude/skills. Excludes Claude-versus-Cursor parity.',
  secondaryKeywords: [
    'how to test MCP Claude marker path detection',
    'MCP Claude marker path detection test cases',
    'MCP Claude marker path detection edge cases',
    'MCP Claude marker path detection CI validation',
    'MCP Claude marker path detection failure diagnostics',
    'MCP Claude marker path detection regression coverage',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts#evidence-1',
    'packages/mcp/src/index.ts#evidence-2',
    'packages/mcp/src/index.ts#evidence-3',
    'packages/mcp/README.md',
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
      title: 'Build the MCP Claude marker path detection baseline',
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
