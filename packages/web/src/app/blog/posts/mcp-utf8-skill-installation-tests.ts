import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 331,
  slug: 'mcp-utf8-skill-installation-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Utf-8 Skill Installation Tests',
  description:
    'MCP UTF-8 skill installation tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP UTF-8 skill installation tests',
  intent: 'how-to',
  coreQuestion:
    'How can install tests prove that Unicode YAML, multilingual markdown, emoji, and final newlines survive API download and UTF-8 file writing?',
  intentBoundary:
    'The existing article tests parser round trips. This topic validates downloaded Unicode document bytes at the final MCP filesystem destination.',
  secondaryKeywords: [
    'Unicode SKILL.md write test',
    'multilingual skill installation',
    'emoji frontmatter preservation',
    'UTF-8 byte equality assertion',
    'markdown final newline test',
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
    '/blog/testing-skill-md-yaml-frontmatter-roundtrip',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
  ],
  codeExamples: [
    {
      title: 'Build the MCP UTF-8 skill installation tests baseline',
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
