import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 266,
  slug: 'qaskills-sdk-category-response-typing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Category Response Typing',
  description:
    'QASkills SDK category response typing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK category response typing',
  intent: 'how-to',
  coreQuestion:
    'How should the QASkills SDK validate the grouped testingTypes, frameworks, languages, and domains returned by categories.list?',
  intentBoundary:
    'Grouped categories response shape, not skill-list facets or search filter serialization.',
  secondaryKeywords: [
    'QASkills categories SDK',
    'category response contract test',
    'testingTypes API typing',
    'framework category array',
    'runtime validate SDK response',
    'category schema drift',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts',
    'packages/shared/src/types/category.ts',
    'packages/web/src/app/api/categories/route.ts',
    'packages/shared/src/constants/index.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/categories/e2e-testing',
    '/categories/api-testing',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
    '/blog/how-to-install-skills-claude-code',
  ],
  relatedSlugs: [
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
    'how-to-install-skills-claude-code',
  ],
  sources: [
    'https://www.typescriptlang.org/docs/handbook/2/objects.html',
    'https://zod.dev/',
    'https://fetch.spec.whatwg.org/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills SDK category response typing baseline',
      language: 'typescript',
      path: 'packages/sdk/src/index.ts',
      snippet:
        "export interface QASkillsConfig {\n  baseUrl?: string;\n  apiKey?: string;\n}\n\nexport class QASkillsClient {\n  private baseUrl: string;\n  private apiKey?: string;\n\n  constructor(config: QASkillsConfig = {}) {\n    this.baseUrl = config.baseUrl || 'https://qaskills.sh';\n    this.apiKey = config.apiKey;\n  }\n\n  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {\n    const headers: Record<string, string> = {\n      'Content-Type': 'application/json',\n      ...(options.headers as Record<string, string>),",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/shared/src/types/category.ts',
      snippet: '',
    },
  ],
});
