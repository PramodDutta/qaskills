import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 279,
  slug: 'qaskills-sdk-no-content-responses',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK No Content Responses',
  description:
    'QASkills SDK no content responses: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK no content responses',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills SDK no content responses, including 204 and empty-body behavior in the generic JSON request helper?',
  intentBoundary:
    'Covers 204 and empty-body behavior in the generic JSON request helper. Excludes successful JSON payloads.',
  secondaryKeywords: [
    'how to test SDK no content responses',
    'SDK no content responses test cases',
    'SDK no content responses edge cases',
    'SDK no content responses CI validation',
    'SDK no content responses failure diagnostics',
    'SDK no content responses regression coverage',
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
      title: 'Build the QASkills SDK no content responses baseline',
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
