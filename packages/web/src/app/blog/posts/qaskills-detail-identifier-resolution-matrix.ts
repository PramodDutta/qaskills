import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 324,
  slug: 'qaskills-detail-identifier-resolution-matrix',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Detail Identifier Resolution Matrix',
  description:
    'QASkills detail identifier resolution matrix: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills detail identifier resolution matrix',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills detail identifier resolution matrix, including detail, content, and artifact routes choosing id versus slug?',
  intentBoundary:
    'Covers detail, content, and artifact routes choosing id versus slug. Excludes client path encoding.',
  secondaryKeywords: [
    'how to test detail identifier resolution matrix',
    'detail identifier resolution matrix test cases',
    'detail identifier resolution matrix edge cases',
    'detail identifier resolution matrix CI validation',
    'detail identifier resolution matrix failure diagnostics',
    'detail identifier resolution matrix regression coverage',
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
      title: 'Build the QASkills detail identifier resolution matrix baseline',
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
