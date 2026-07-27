import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 339,
  slug: 'mcp-pre-initialization-request-rejection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'MCP Pre-initialization Request Rejection',
  description:
    'MCP pre-initialization request rejection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'MCP pre-initialization request rejection',
  intent: 'troubleshooting',
  coreQuestion:
    'What should happen when a client sends tools/list or tools/call before MCP initialization finishes, and how can that behavior be tested?',
  intentBoundary:
    'The Inspector tutorial exercises valid calls after startup. This candidate deliberately violates lifecycle order and asserts protocol errors.',
  secondaryKeywords: [
    'tools list before initialize',
    'tools call before initialized',
    'MCP invalid lifecycle state',
    'pre-handshake request error',
    'MCP client ordering bug',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'docs/product/MCP-SERVER-PLAN-2026-07.md'],
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
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://www.jsonrpc.org/specification',
  ],
  codeExamples: [
    {
      title: 'Build the MCP pre-initialization request rejection baseline',
      language: 'typescript',
      path: 'packages/mcp/src/index.ts',
      snippet:
        "function buildUrl(pathname: string, params?: Record<string, string | number | undefined>): string {\n  const url = new URL(pathname, BASE);\n\n  for (const [key, value] of Object.entries(params ?? {})) {\n    if (value !== undefined && value !== '') {\n      url.searchParams.set(key, String(value));\n    }\n  }\n\n  return url.toString();\n}\n\nasync function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {\n  const controller = new AbortController();\n  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);\n\n  try {\n    const response = await fetch(url, {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'docs/product/MCP-SERVER-PLAN-2026-07.md',
      snippet:
        '## Distribution surfaces this unlocks\n\n- Official MCP registry (registry.modelcontextprotocol.io): searchable by every registry-aware client\n- `npx -y @qaskills/mcp`: zero-install one-liner in any mcpServers config\n- Claude Code: `claude mcp add qaskills -- npx -y @qaskills/mcp`\n- Cursor / Windsurf / Gemini CLI / Codex CLI MCP configs (same JSON block, documented in README)\n- awesome-mcp-servers PR (was blocked on "we have no MCP server"; now unblocked, see OSS-PROMOTION-PR-PLAN)\n- A /mcp landing page on qaskills.sh + blog post targeting "qa mcp server" queries (SEO follow-up)\n\n## Risks and mitigations\n\n| Risk | Mitigation |\n|---|---|\n| MCP registry is in preview; breaking changes or data resets possible | Registry holds only metadata; npm package is the artifact. Re-publish is one command |\n| Low initial discoverability among thousands of servers | Pair launch with awesome-mcp-servers PR, blog post, and README cross-links from CLI and site |\n| Coupling to qaskills.sh API shapes | Server pins to stable public GET endpoints only; 10s timeouts and typed errors degrade gracefully |\n| Another package to maintain | Standalone, tiny surface (6 tools), same repo and CI conventions as the CLI; version bumps ride the existing release rhythm |',
    },
  ],
});
