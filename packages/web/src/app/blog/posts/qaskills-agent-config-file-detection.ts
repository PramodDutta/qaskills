import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 332,
  slug: 'qaskills-agent-config-file-detection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Agent Config File Detection',
  description:
    'QASkills agent config file detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills agent config file detection',
  intent: 'how-to',
  coreQuestion:
    'How can you test that QASkills detects a project agent from its config file when its config directory does not exist?',
  intentBoundary:
    'The configFile fallback branch for project agents only, not scope classification or skills-directory status.',
  secondaryKeywords: [
    'agent configFile fallback',
    'detect agent without directory',
    'project instruction file detection',
    'qaskills config probe test',
    'agent config path fixture',
    'AI agent filesystem detection',
  ],
  repoEvidence: [
    'packages/cli/src/lib/agent-detector.ts#evidence-1',
    'packages/cli/src/lib/agent-detector.ts#evidence-2',
    'packages/shared/src/constants/agents.ts',
    'packages/shared/src/types/agent.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/agents',
    '/agents/cursor',
    '/agents/copilot',
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
    'https://vitest.dev/guide/mocking.html',
    'https://agentskills.io/specification',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills agent config file detection baseline',
      language: 'typescript',
      path: 'packages/cli/src/lib/agent-detector.ts',
      snippet:
        "export interface DetectedAgent {\n  /** The agent definition from the shared constants. */\n  definition: AgentDefinition;\n  /** Absolute path to the agent's skills directory. */\n  skillsDir: string;\n  /** Whether the skills directory already exists. */\n  exists: boolean;\n  /** 'global' if lives in the home dir, 'project' if in cwd. */\n  scope: 'global' | 'project';\n}\n\n// ---------------------------------------------------------------------------\n// Helpers\n// ---------------------------------------------------------------------------\n\nfunction expandHome(p: string): string {\n  if (p.startsWith('~/') || p === '~') {\n    return path.join(os.homedir(), p.slice(1));",
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
