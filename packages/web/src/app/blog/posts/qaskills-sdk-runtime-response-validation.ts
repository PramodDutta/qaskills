import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 281,
  slug: 'qaskills-sdk-runtime-response-validation',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Runtime Response Validation',
  description:
    'QASkills SDK runtime response validation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills SDK runtime response validation',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills SDK runtime response validation, including TypeScript-only result trust versus runtime schema checks?',
  intentBoundary:
    'Covers TypeScript-only result trust versus runtime schema checks. Excludes frontmatter Zod validation.',
  secondaryKeywords: [
    'how to test SDK runtime response validation',
    'SDK runtime response validation test cases',
    'SDK runtime response validation edge cases',
    'SDK runtime response validation CI validation',
    'SDK runtime response validation failure diagnostics',
    'SDK runtime response validation regression coverage',
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
      title: 'Build the QASkills SDK runtime response validation baseline',
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
