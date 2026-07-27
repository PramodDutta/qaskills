import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 280,
  slug: 'qaskills-sdk-review-submission-contract',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Review Submission Contract',
  description:
    'QASkills SDK review submission contract: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK review submission contract',
  intent: 'how-to',
  coreQuestion:
    'What request and response contract does QASkillsClient.reviews.submit use for review data and the returned review ID?',
  intentBoundary:
    'Review submission endpoint only, not skill creation, leaderboard reads, or UI review rendering.',
  secondaryKeywords: [
    'QASkills SDK submit review',
    'review API contract test',
    'ReviewCreateInput JSON body',
    'SDK review ID response',
    'authenticated review request',
    'review validation boundaries',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts',
    'packages/shared/src/schemas/review-schema.ts',
    'packages/shared/src/types/review.ts',
    'packages/web/src/app/api/reviews/route.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/leaderboard',
    '/privacy',
    '/blog/api-testing-complete-guide',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://fetch.spec.whatwg.org/',
    'https://zod.dev/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills SDK review submission contract baseline',
      language: 'typescript',
      path: 'packages/sdk/src/index.ts',
      snippet:
        "export interface QASkillsConfig {\n  baseUrl?: string;\n  apiKey?: string;\n}\n\nexport class QASkillsClient {\n  private baseUrl: string;\n  private apiKey?: string;\n\n  constructor(config: QASkillsConfig = {}) {\n    this.baseUrl = config.baseUrl || 'https://qaskills.sh';\n    this.apiKey = config.apiKey;\n  }\n\n  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {\n    const headers: Record<string, string> = {\n      'Content-Type': 'application/json',\n      ...(options.headers as Record<string, string>),",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/shared/src/schemas/review-schema.ts',
      snippet: '',
    },
  ],
});
