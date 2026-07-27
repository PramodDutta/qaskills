import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 357,
  slug: 'qaskills-list-nested-skill-exclusion',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills List Nested Skill Exclusion',
  description:
    'QASkills list nested skill exclusion: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills list nested skill exclusion',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills list nested skill exclusion, including SKILL.md files deeper than one child directory not being listed?',
  intentBoundary:
    'Covers SKILL.md files deeper than one child directory not being listed. Excludes GitHub extraction depth.',
  secondaryKeywords: [
    'how to test list nested skill exclusion',
    'list nested skill exclusion test cases',
    'list nested skill exclusion edge cases',
    'list nested skill exclusion CI validation',
    'list nested skill exclusion failure diagnostics',
    'list nested skill exclusion regression coverage',
  ],
  repoEvidence: [
    'packages/cli/src/commands/list.ts',
    'packages/cli/src/lib/agent-detector.ts',
    'packages/shared/src/parsers/skill-parser.ts',
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
      title: 'Build the QASkills list nested skill exclusion baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/list.ts',
      snippet:
        "export const listCommand = new Command('list')\n  .description('List installed QA skills')\n  .option('--agents', 'Show detected agents only')\n  .action(async (options: { agents?: boolean }) => {\n    p.intro(pc.bgCyan(pc.black(' qaskills list ')));\n\n    const spinner = p.spinner();\n    spinner.start('Detecting agents and scanning skills...');\n    const detected = detectAgents();\n    spinner.stop(`Found ${detected.length} agent(s)`);\n\n    if (options.agents) {\n      for (const agent of detected) {\n        p.log.info(`${pc.bold(agent.definition.name)} ${pc.dim(agent.skillsDir)}`);\n      }\n      p.outro(`${detected.length} agent(s) detected`);\n      return;\n    }",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/cli/src/lib/agent-detector.ts',
      snippet:
        "// Helpers\n// ---------------------------------------------------------------------------\n\nfunction expandHome(p: string): string {\n  if (p.startsWith('~/') || p === '~') {\n    return path.join(os.homedir(), p.slice(1));\n  }\n  return p;\n}\n\nfunction isGlobalPath(configDir: string): boolean {\n  return configDir.startsWith('~/') || configDir.startsWith('~');\n}\n\nfunction probeExists(p: string): boolean {\n  try {\n    fs.accessSync(p, fs.constants.F_OK);\n    return true;",
    },
  ],
});
