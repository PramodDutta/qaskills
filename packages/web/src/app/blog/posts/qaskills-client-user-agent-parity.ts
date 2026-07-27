import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 353,
  slug: 'qaskills-client-user-agent-parity',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Client User Agent Parity',
  description:
    'QASkills client user agent parity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills client user agent parity',
  intent: 'informational',
  coreQuestion:
    'What should QA teams verify for QASkills client user agent parity, including CLI and MCP User-Agent identity while SDK omits one?',
  intentBoundary:
    'Covers CLI and MCP User-Agent identity while SDK omits one. Excludes telemetry version labels.',
  secondaryKeywords: [
    'how to test client user agent parity',
    'client user agent parity test cases',
    'client user agent parity edge cases',
    'client user agent parity CI validation',
    'client user agent parity failure diagnostics',
    'client user agent parity regression coverage',
  ],
  repoEvidence: [
    'packages/cli/src/lib/api-client.ts',
    'packages/sdk/src/index.ts',
    'packages/mcp/src/index.ts',
    'packages/web/src/app/api/skills/route.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/mcp',
    '/getting-started',
    '/blog/validate-skill-md-in-ci-pipeline',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'validate-skill-md-in-ci-pipeline',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html',
    'https://json-schema.org/draft/2020-12',
    'https://semver.org/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills client user agent parity baseline',
      language: 'typescript',
      path: 'packages/cli/src/lib/api-client.ts',
      snippet:
        "export async function searchSkills(params: SkillSearchParams): Promise<SkillSearchResult> {\n  const url = buildUrl('/api/skills', {\n    q: params.query,\n    testingTypes: params.testingTypes,\n    frameworks: params.frameworks,\n    languages: params.languages,\n    domains: params.domains,\n    agents: params.agents,\n    sort: params.sort,\n    page: params.page,\n    pageSize: params.pageSize,\n    verifiedOnly: params.verifiedOnly,\n  });\n\n  return request<SkillSearchResult>(url);\n}\n\n/**",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/sdk/src/index.ts',
      snippet:
        "}\n\n  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {\n    const headers: Record<string, string> = {\n      'Content-Type': 'application/json',\n      ...(options.headers as Record<string, string>),\n    };\n    if (this.apiKey) {\n      headers['Authorization'] = `Bearer ${this.apiKey}`;\n    }\n\n    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });\n    if (!res.ok) {\n      const error = await res.json().catch(() => ({ error: res.statusText }));\n      throw new Error(`QASkills API error: ${error.error || res.statusText}`);\n    }\n    return res.json();\n  }",
    },
  ],
});
