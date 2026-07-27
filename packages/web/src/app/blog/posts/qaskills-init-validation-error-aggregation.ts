import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 351,
  slug: 'qaskills-init-validation-error-aggregation',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Init Validation Error Aggregation',
  description:
    'QASkills init validation error aggregation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills init validation error aggregation',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills init validation error aggregation, including multiple invalid vocabulary flags and diagnostic completeness?',
  intentBoundary:
    'Covers multiple invalid vocabulary flags and diagnostic completeness. Excludes publish frontmatter validation.',
  secondaryKeywords: [
    'how to test init validation error aggregation',
    'init validation error aggregation test cases',
    'init validation error aggregation edge cases',
    'init validation error aggregation CI validation',
    'init validation error aggregation failure diagnostics',
    'init validation error aggregation regression coverage',
  ],
  repoEvidence: [
    'packages/cli/src/commands/init.ts',
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/how-to-publish',
    '/blog/qaskills-init-non-interactive-ci',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'qaskills-init-non-interactive-ci',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://github.com/tj/commander.js',
    'https://github.com/bombshell-dev/clack',
    'https://nodejs.org/api/process.html',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills init validation error aggregation baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/init.ts',
      snippet:
        "export const initCommand = new Command('init')\n  .argument('[template]', 'Template name (playwright, cypress, api, generic)')\n  .description('Scaffold a new SKILL.md for your QA skill')\n  .option('-y, --yes', 'Non-interactive: scaffold from flags and defaults without prompting')\n  .option('--name <name>', 'Skill name (non-interactive)')\n  .option('--description <text>', 'Description (non-interactive)')\n  .option('--author <author>', 'Author (non-interactive)')\n  .option('--testing-type <type>', 'Primary testing type id (non-interactive)')\n  .option('--framework <framework>', 'Primary framework id, or \"none\" (non-interactive)')\n  .option('--language <language>', 'Primary language id (non-interactive)')\n  .action(async (template: string | undefined, options: InitOptions) => {\n    const tmpl = template || 'generic';\n    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);\n    const anyFlags =\n      options.name || options.description || options.author || options.testingType || options.framework || options.language;\n    // Run non-interactively when explicitly asked, when flags were supplied,\n    // or whenever there is no usable terminal (CI, pipes, redirected stdout).\n    const nonInteractive = options.yes || Boolean(anyFlags) || !interactive;",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/shared/src/parsers/skill-parser.ts',
      snippet:
        "languages: toStringArray(data.languages),\n    domains: toStringArray(data.domains),\n    agents: toStringArray(data.agents),\n    minTokens: typeof data.minTokens === 'number' ? data.minTokens : undefined,\n    maxTokens: typeof data.maxTokens === 'number' ? data.maxTokens : undefined,\n  };\n\n  return { frontmatter, content: content.trim(), raw };\n}\n\nfunction toStringArray(value: unknown): string[] {\n  if (Array.isArray(value)) return value.map(String);\n  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);\n  return [];\n}\n\nexport function serializeSkillMd(frontmatter: SkillFrontmatter, content: string): string {\n  const yaml = [",
    },
  ],
});
