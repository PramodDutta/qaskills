import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 336,
  slug: 'qaskills-list-missing-directory-handling',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills List Missing Directory Handling',
  description:
    'QASkills list missing directory handling: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills list missing directory handling',
  intent: 'troubleshooting',
  coreQuestion:
    "What does qaskills list report when a detected agent's skills directory does not exist or cannot be read?",
  intentBoundary:
    'Parent directory read failure in list, not the DetectedAgent.exists field or malformed child folders.',
  secondaryKeywords: [
    'qaskills list directory not found',
    'unreadable agent skills folder',
    'missing skillsDir output',
    'CLI readdir failure handling',
    'empty agent installation directory',
    'agent list filesystem error',
  ],
  repoEvidence: [
    'packages/cli/src/commands/list.ts',
    'packages/cli/src/lib/agent-detector.ts#evidence-2',
    'packages/cli/src/lib/agent-detector.ts#evidence-3',
    'packages/cli/src/lib/agent-detector.ts#evidence-4',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/agents',
    '/getting-started',
    '/blog/how-to-install-skills-claude-code',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'how-to-install-skills-claude-code',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://nodejs.org/api/errors.html',
    'https://vitest.dev/guide/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills list missing directory handling baseline',
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
