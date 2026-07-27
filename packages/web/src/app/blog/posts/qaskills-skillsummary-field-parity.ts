import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 293,
  slug: 'qaskills-skillsummary-field-parity',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Skillsummary Field Parity',
  description:
    'QASkills SkillSummary field parity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SkillSummary field parity',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills SkillSummary field parity, including shared summary fields versus list and leaderboard JSON?',
  intentBoundary:
    'Covers shared summary fields versus list and leaderboard JSON. Excludes full skill detail metadata.',
  secondaryKeywords: [
    'how to test SkillSummary field parity',
    'SkillSummary field parity test cases',
    'SkillSummary field parity edge cases',
    'SkillSummary field parity CI validation',
    'SkillSummary field parity failure diagnostics',
    'SkillSummary field parity regression coverage',
  ],
  repoEvidence: [
    'packages/shared/src/types/skill.ts',
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/cli/src/lib/api-client.ts',
    'packages/sdk/src/index.ts',
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
      title: 'Build the QASkills SkillSummary field parity baseline',
      language: 'typescript',
      path: 'packages/shared/src/types/skill.ts',
      snippet:
        'export interface SkillFrontmatter {\n  name: string;\n  description: string;\n  version: string;\n  author: string;\n  license: string;\n  tags: string[];\n  testingTypes: string[];\n  frameworks: string[];\n  languages: string[];\n  domains: string[];\n  agents: string[];\n  minTokens?: number;\n  maxTokens?: number;\n}\n\nexport interface Skill {\n  id: string;',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/shared/src/schemas/skill-schema.ts',
      snippet:
        'minTokens: z.number().optional(),\n  maxTokens: z.number().optional(),\n});\n\nexport const skillCreateSchema = z.object({\n  name: z.string().min(1).max(100),\n  description: z.string().min(10).max(500),\n  githubUrl: z.string().url(),\n  testingTypes: z.array(z.string()).min(1),\n  frameworks: z.array(z.string()).default([]),\n  languages: z.array(z.string()).min(1),\n  domains: z.array(z.string()).default([]),\n});\n\nexport const skillSearchSchema = z.object({\n  query: z.string().optional(),\n  testingTypes: z.array(z.string()).optional(),\n  frameworks: z.array(z.string()).optional(),',
    },
  ],
});
