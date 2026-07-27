import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 267,
  slug: 'qaskills-publish-validation-error-paths',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Publish Validation Error Paths',
  description:
    'QASkills publish validation error paths: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills publish validation error paths',
  intent: 'how-to',
  coreQuestion:
    'How does qaskills publish turn nested Zod validation issues into field-specific CLI diagnostics before asking for confirmation?',
  intentBoundary:
    'Formatting schema failures in the CLI, not parser round trips, missing files, or web publisher validation.',
  secondaryKeywords: [
    'qaskills publish validation errors',
    'Zod error path CLI',
    'invalid SKILL.md publish',
    'frontmatter validation diagnostics',
    'publish schema safeParse test',
    'field specific skill errors',
  ],
  repoEvidence: [
    'packages/cli/src/commands/publish.ts',
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/types/skill.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/how-to-publish',
    '/blog/skill-md-format-guide',
    '/blog/how-to-write-high-quality-qa-skills',
    '/blog/validate-skill-md-in-ci-pipeline',
    '/blog/mcp-for-qa-engineers-guide',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'how-to-write-high-quality-qa-skills',
    'validate-skill-md-in-ci-pipeline',
    'mcp-for-qa-engineers-guide',
  ],
  sources: [
    'https://zod.dev/',
    'https://yaml.org/spec/1.2.2/',
    'https://agentskills.io/specification',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills publish validation error paths baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/publish.ts',
      snippet:
        "export const publishCommand = new Command('publish')\n  .description('Validate and publish your skill to qaskills.sh')\n  .action(async () => {\n    p.intro(pc.bgCyan(pc.black(' qaskills publish ')));\n\n    const skillMdPath = path.join(process.cwd(), 'SKILL.md');\n\n    // 1. Check for SKILL.md\n    try {\n      await fs.access(skillMdPath);\n    } catch {\n      p.log.error('No SKILL.md found in current directory.');\n      p.log.info(pc.dim('Run `qaskills init` to create one.'));\n      p.outro('');\n      return;\n    }\n\n    const spinner = p.spinner();",
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
