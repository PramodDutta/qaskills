import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 259,
  slug: 'mcp-install-slug-validation-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Install Slug Validation Tests',
  description:
    'MCP install slug validation tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MCP install slug validation tests',
  intent: 'how-to',
  coreQuestion:
    'Which empty, dot-segment, separator, control-character, reserved-name, and overlong slugs should install_skill reject before network or filesystem access?',
  intentBoundary:
    "The existing checklist reviews skill provenance and command safety. This candidate defines the MCP install tool's accepted slug grammar before network or filesystem side effects.",
  secondaryKeywords: [
    'MCP empty slug validation',
    'dot segment skill slug',
    'control character slug test',
    'Windows reserved filename skill',
    'overlong MCP identifier',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/web/src/app/api/skills/route.ts'],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/blog/mcp-server-contract-testing-guide',
    '/blog/agent-skill-security-review-checklist',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'agent-skill-security-review-checklist',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://zod.dev/api',
    'https://nodejs.org/api/path.html',
    'https://cwe.mitre.org/data/definitions/22.html',
  ],
  codeExamples: [
    {
      title: 'Build the MCP install slug validation tests baseline',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {\n  const url = new URL(pathname, BASE);\n\n  for (const [key, value] of Object.entries(params ?? {})) {\n    if (value !== undefined && value !== '') {\n      url.searchParams.set(key, String(value));\n    }\n  }\n\n  return url.toString();\n}\n\nasync function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/api/skills/route.ts',
      snippet:
        "{ status: 401 },\n      );\n    }\n\n    // 2. Parse & validate body\n    const body = await request.json();\n    const parsed = publishSkillSchema.safeParse(body);\n    if (!parsed.success) {\n      const messages = parsed.error.issues.map((i) => i.message).join('; ');\n      return NextResponse.json(\n        { error: `Validation failed: ${messages}`, issues: parsed.error.issues },\n        { status: 400 },\n      );\n    }\n    const data = parsed.data;\n\n    // 3. Generate / validate slug\n    const slug = data.slug && data.slug.length > 0 ? data.slug : generateSlug(data.name);",
    },
  ],
});
