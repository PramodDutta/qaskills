import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 253,
  slug: 'mcp-idempotent-reinstall-behavior-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Idempotent Reinstall Behavior Testing',
  description:
    'MCP idempotent reinstall behavior testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'MCP idempotent reinstall behavior testing',
  intent: 'how-to',
  coreQuestion:
    'Does repeating install_skill converge on one correct SKILL.md, and how should tests handle unchanged, updated, and locally modified files?',
  intentBoundary:
    'The product guide demonstrates installation once. This candidate deeply tests repeated writes, local modifications, updates, and convergence.',
  secondaryKeywords: [
    'MCP reinstall same skill',
    'idempotentHint verification',
    'SKILL.md overwrite behavior',
    'local modification reinstall',
    'repeat install convergence',
  ],
  repoEvidence: ['packages/mcp/src/index.ts#evidence-1', 'packages/mcp/src/index.ts#evidence-2'],
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
    'https://nodejs.org/api/fs.html',
    'https://github.com/modelcontextprotocol/typescript-sdk',
  ],
  codeExamples: [
    {
      title: 'Build the MCP idempotent reinstall behavior testing baseline',
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
