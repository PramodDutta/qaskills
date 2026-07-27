import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 318,
  slug: 'mcp-stdio-graceful-shutdown-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Stdio Graceful Shutdown Testing',
  description:
    'MCP stdio graceful shutdown testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP stdio graceful shutdown testing',
  intent: 'troubleshooting',
  coreQuestion:
    'How should a test harness verify EOF handling, bounded process exit, SIGTERM fallback, and cleanup for an MCP stdio server?',
  intentBoundary:
    'The conformance page explains the official suite. This topic builds a dedicated process-lifecycle oracle around EOF and operating-system signals.',
  secondaryKeywords: [
    'MCP EOF shutdown test',
    'stdio server SIGTERM testing',
    'MCP subprocess exit timeout',
    'MCP transport cleanup',
    'orphan MCP process detection',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/mcp-server-testing-guide-2026',
    '/blog/mcp-official-conformance-suite-server-guide-2026',
    '/blog/mcp-conformance-github-actions-baseline-2026',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'mcp-server-testing-guide-2026',
    'mcp-official-conformance-suite-server-guide-2026',
    'mcp-conformance-github-actions-baseline-2026',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://nodejs.org/api/process.html',
  ],
  codeExamples: [
    {
      title: 'Build the MCP stdio graceful shutdown testing baseline',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {\n  const url = new URL(pathname, BASE);\n\n  for (const [key, value] of Object.entries(params ?? {})) {\n    if (value !== undefined && value !== '') {\n      url.searchParams.set(key, String(value));\n    }\n  }\n\n  return url.toString();\n}\n\nasync function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'json',
      path: 'packages/mcp/package.json',
      snippet:
        '"README.md"\n  ],\n  "repository": {\n    "type": "git",\n    "url": "https://github.com/PramodDutta/qaskills.git",\n    "directory": "packages/mcp"\n  },\n  "license": "MIT",\n  "author": "Pramod Dutta (The Testing Academy)",\n  "keywords": [\n    "mcp",\n    "model-context-protocol",\n    "qa",\n    "testing",\n    "skills",\n    "claude",\n    "playwright"\n  ],',
    },
  ],
});
