import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 346,
  slug: 'qaskills-duplicate-skill-install-counts',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Duplicate Skill Install Counts',
  description:
    'QASkills duplicate skill install counts: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills duplicate skill install counts',
  intent: 'informational',
  coreQuestion:
    'Does qaskills list count the same skill once per agent installation or once per unique skill name across all agents?',
  intentBoundary:
    'Aggregation semantics for valid repeated installations, not registry install counts or malformed folders.',
  secondaryKeywords: [
    'qaskills installed skill count',
    'duplicate skill across agents',
    'per agent skill inventory',
    'unique skill count CLI',
    'multi agent list totals',
    'installed skills aggregation test',
  ],
  repoEvidence: [
    'packages/cli/src/commands/list.ts',
    'packages/cli/src/lib/agent-detector.ts',
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/types/skill.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/agents',
    '/leaderboard',
    '/getting-started',
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
    'https://nodejs.org/api/fs.html',
    'https://vitest.dev/guide/',
    'https://agentskills.io/specification',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills duplicate skill install counts baseline',
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
