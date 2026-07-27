import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 282,
  slug: 'qaskills-sdk-skill-path-encoding',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Skill Path Encoding',
  description:
    'QASkills SDK skill path encoding: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK skill path encoding',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QASkillsClient.skills.get encode an ID or slug containing reserved characters before placing it in an API path?',
  intentBoundary: 'SDK skills.get path behavior, separate from the CLI info encoding contract.',
  secondaryKeywords: [
    'QASkills SDK encode slug',
    'SDK path segment security',
    'skills get reserved characters',
    'encodeURIComponent SDK test',
    'skill ID slash handling',
    'compare CLI SDK URL encoding',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts#evidence-1',
    'packages/sdk/src/index.ts#evidence-2',
    'packages/cli/src/lib/api-client.ts',
    'packages/shared/src/types/skill.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/blog/api-testing-complete-guide',
    '/blog/skill-md-format-guide',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'skill-md-format-guide',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://url.spec.whatwg.org/',
    'https://www.rfc-editor.org/info/rfc3986',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills SDK skill path encoding baseline',
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
