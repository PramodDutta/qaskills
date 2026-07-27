import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 268,
  slug: 'qaskills-sdk-concurrent-header-isolation',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Concurrent Header Isolation',
  description:
    'QASkills SDK concurrent header isolation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills SDK concurrent header isolation',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills SDK concurrent header isolation, including parallel requests from differently configured clients?',
  intentBoundary:
    'Covers parallel requests from differently configured clients. Excludes transport retry policy.',
  secondaryKeywords: [
    'how to test SDK concurrent header isolation',
    'SDK concurrent header isolation test cases',
    'SDK concurrent header isolation edge cases',
    'SDK concurrent header isolation CI validation',
    'SDK concurrent header isolation failure diagnostics',
    'SDK concurrent header isolation regression coverage',
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
      title: 'Build the QASkills SDK concurrent header isolation baseline',
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
