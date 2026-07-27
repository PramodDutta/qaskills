import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 275,
  slug: 'qaskills-sdk-filter-serialization-parity',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Filter Serialization Parity',
  description:
    'QASkills SDK filter serialization parity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills SDK filter serialization parity',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills SDK filter serialization parity, including typed filters omitted by skills.list query construction?',
  intentBoundary:
    'Covers typed filters omitted by skills.list query construction. Excludes CLI search public flags.',
  secondaryKeywords: [
    'how to test SDK filter serialization parity',
    'SDK filter serialization parity test cases',
    'SDK filter serialization parity edge cases',
    'SDK filter serialization parity CI validation',
    'SDK filter serialization parity failure diagnostics',
    'SDK filter serialization parity regression coverage',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts',
    'packages/shared/src/types/skill.ts',
    'packages/web/src/app/api/skills/route.ts',
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
      title: 'Build the QASkills SDK filter serialization parity baseline',
      language: 'typescript',
      path: 'packages/sdk/src/index.ts',
      snippet:
        "export interface QASkillsConfig {\n  baseUrl?: string;\n  apiKey?: string;\n}\n\nexport class QASkillsClient {\n  private baseUrl: string;\n  private apiKey?: string;\n\n  constructor(config: QASkillsConfig = {}) {\n    this.baseUrl = config.baseUrl || 'https://qaskills.sh';\n    this.apiKey = config.apiKey;\n  }\n\n  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {\n    const headers: Record<string, string> = {\n      'Content-Type': 'application/json',\n      ...(options.headers as Record<string, string>),",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/shared/src/types/skill.ts',
      snippet:
        'minTokens?: number;\n  maxTokens?: number;\n}\n\nexport interface Skill {\n  id: string;\n  name: string;\n  slug: string;\n  description: string;\n  fullDescription: string;\n  version: string;\n  author: string;\n  authorId: string;\n  license: string;\n  githubUrl: string;\n  tags: string[];\n  testingTypes: string[];\n  frameworks: string[];',
    },
  ],
});
