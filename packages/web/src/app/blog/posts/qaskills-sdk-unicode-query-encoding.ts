import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 285,
  slug: 'qaskills-sdk-unicode-query-encoding',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Unicode Query Encoding',
  description:
    'QASkills SDK Unicode query encoding: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK Unicode query encoding',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills SDK Unicode query encoding, including URLSearchParams handling for non-ASCII search terms?',
  intentBoundary:
    'Covers URLSearchParams handling for non-ASCII search terms. Excludes path-segment slug encoding.',
  secondaryKeywords: [
    'how to test SDK Unicode query encoding',
    'SDK Unicode query encoding test cases',
    'SDK Unicode query encoding edge cases',
    'SDK Unicode query encoding CI validation',
    'SDK Unicode query encoding failure diagnostics',
    'SDK Unicode query encoding regression coverage',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts#evidence-1',
    'packages/sdk/src/index.ts#evidence-2',
    'packages/shared/src/types/skill.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/blog/qaskills-sdk-create-request-contract',
    '/blog/qaskills-sdk-list-pagination-query',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-sdk-create-request-contract',
    'qaskills-sdk-list-pagination-query',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://fetch.spec.whatwg.org/',
    'https://url.spec.whatwg.org/',
    'https://www.typescriptlang.org/docs/handbook/modules/reference.html',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills SDK Unicode query encoding baseline',
      language: 'typescript',
      path: 'packages/sdk/src/index.ts',
      snippet:
        "export interface QASkillsConfig {\n  baseUrl?: string;\n  apiKey?: string;\n}\n\nexport class QASkillsClient {\n  private baseUrl: string;\n  private apiKey?: string;\n\n  constructor(config: QASkillsConfig = {}) {\n    this.baseUrl = config.baseUrl || 'https://qaskills.sh';\n    this.apiKey = config.apiKey;\n  }\n\n  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {\n    const headers: Record<string, string> = {\n      'Content-Type': 'application/json',\n      ...(options.headers as Record<string, string>),",
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
