import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 317,
  slug: 'mcp-large-skill-content-handling',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Large Skill Content Handling',
  description:
    'MCP large skill content handling: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP large skill content handling',
  intent: 'troubleshooting',
  coreQuestion:
    'How can QA teams test memory, truncation, latency, and complete writes when MCP returns and installs unusually large SKILL.md documents?',
  intentBoundary:
    'The timeout article covers request deadlines and cancellation. This candidate focuses payload completeness, buffering, memory, and filesystem fidelity under size pressure.',
  secondaryKeywords: [
    'large MCP text result',
    'SKILL.md truncation test',
    'MCP memory usage test',
    'large skill install timeout',
    'complete markdown write assertion',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/web/src/app/api/skills/[id]/content/route.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/qaskills-mcp-server-guide',
    '/blog/mcp-api-timeout-abortcontroller-testing',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-api-timeout-abortcontroller-testing',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
  ],
  codeExamples: [
    {
      title: 'Build the MCP large skill content handling baseline',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {\n  const url = new URL(pathname, BASE);\n\n  for (const [key, value] of Object.entries(params ?? {})) {\n    if (value !== undefined && value !== '') {\n      url.searchParams.set(key, String(value));\n    }\n  }\n\n  return url.toString();\n}\n\nasync function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/api/skills/[id]/content/route.ts',
      snippet:
        "if (rows.length === 0) {\n      const fallback = fallbackContent(id);\n      if (fallback) return markdownResponse(fallback);\n      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });\n    }\n\n    const row = rows[0];\n    return markdownResponse(buildSkillMarkdown(row));\n  } catch {\n    const fallback = fallbackContent(id);\n    if (fallback) return markdownResponse(fallback);\n    return NextResponse.json({ error: 'Failed to fetch skill content' }, { status: 500 });\n  }\n}",
    },
  ],
});
