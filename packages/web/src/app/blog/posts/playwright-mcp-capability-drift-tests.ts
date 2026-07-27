import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 503,
  slug: 'playwright-mcp-capability-drift-tests',
  campaignCluster: 'browser-e2e',
  title: 'Playwright MCP Capability Drift Tests',
  description:
    'playwright mcp capability drift tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'playwright mcp capability drift tests',
  intent: 'troubleshooting',
  coreQuestion:
    'How do you detect when a Playwright MCP upgrade adds, removes, renames, or re-groups tools that an agent workflow depends on?',
  intentBoundary:
    'Owns the Playwright MCP capability inventory, while generic MCP articles own schema contracts and package versions.',
  secondaryKeywords: [
    'playwright mcp tool inventory test',
    'mcp capability schema drift',
    'detect renamed browser tool',
    'playwright mcp upgrade regression',
    'mcp caps compatibility gate',
    'agent missing tool failure',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/children-playwright-mcp-2026.ts',
    'packages/mcp/src/index.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/playwright-mcp-testing-capability-guide-2026',
    '/blog/mcp-server-contract-testing-guide',
    '/blog/mcp-package-registry-version-drift-tests',
    '/skills/Pramod/playwright-cli',
    '/blog/playwright-e2e-complete-guide',
  ],
  relatedSlugs: [
    'playwright-mcp-testing-capability-guide-2026',
    'mcp-server-contract-testing-guide',
    'mcp-package-registry-version-drift-tests',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/mcp/capabilities',
    'https://playwright.dev/mcp/introduction',
    'https://github.com/microsoft/playwright-mcp',
    'https://modelcontextprotocol.io/specification/2025-06-18/server/tools',
  ],
  codeExamples: [
    {
      title: 'Build the playwright mcp capability drift tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/children-playwright-mcp-2026.ts',
      snippet:
        "export const playwrightMcpChildren2026: SeoClusterArticle[] = [\n  {\n    slug: 'playwright-mcp-json-configuration-reference',\n    clusterId: 'playwright-mcp',\n    post: {\n      title: 'Playwright MCP Server Configuration Reference for QA Teams',\n      description:\n        'Configure Playwright MCP for QA with documented CLI flags, environment variables, JSON schema, capabilities, browsers, timeouts, output, and network controls.',\n      date: '2026-06-03',\n      updated: '2026-07-14',\n      category: 'Guide',\n      image: '/blog/pillars/playwright-mcp.png',\n      imageAlt:\n        'Configuration layers connecting a QA team, an MCP client, and a Playwright-controlled browser',\n      primaryKeyword: 'playwright mcp configuration',\n      keywords: [\n        'playwright mcp configuration',\n        'playwright mcp server configuration',",
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
