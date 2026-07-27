import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 348,
  slug: 'qaskills-info-optional-metadata-output',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Info Optional Metadata Output',
  description:
    'QASkills info optional metadata output: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills info optional metadata output',
  intent: 'informational',
  coreQuestion:
    'How does qaskills info render missing version, frameworks, GitHub URL, license, and array metadata without printing misleading blank lines?',
  intentBoundary:
    'Successful presentation of optional fields, not missing-record errors or metadata schema validation.',
  secondaryKeywords: [
    'qaskills info field formatting',
    'optional skill metadata display',
    'missing framework N A output',
    'skill version fallback output',
    'conditional GitHub URL display',
    'CLI detail snapshot tests',
  ],
  repoEvidence: [
    'packages/cli/src/commands/info.ts',
    'packages/shared/src/types/skill.ts',
    'packages/cli/src/lib/api-client.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/blog/skill-md-format-guide',
    '/blog/how-to-write-high-quality-qa-skills',
    '/getting-started',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'how-to-write-high-quality-qa-skills',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://github.com/bombshell-dev/clack',
    'https://vitest.dev/guide/snapshot.html',
    'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills info optional metadata output baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/info.ts',
      snippet:
        "export const infoCommand = new Command('info')\n  .argument('<skill>', 'Skill name or slug')\n  .description('Show detailed information about a skill')\n  .action(async (skillName: string) => {\n    p.intro(pc.bgCyan(pc.black(' qaskills info ')));\n\n    const spinner = p.spinner();\n    spinner.start('Fetching skill details...');\n\n    try {\n      const skill = await getSkill(skillName);\n      spinner.stop('');\n\n      p.log.info([\n        `${pc.bold(skill.name)} ${pc.dim(`v${skill.version || '1.0.0'}`)}`,\n        `${pc.dim('by')} ${skill.author}`,\n        '',\n        skill.description,",
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
