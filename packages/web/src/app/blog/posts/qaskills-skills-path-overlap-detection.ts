import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 289,
  slug: 'qaskills-skills-path-overlap-detection',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Skills Path Overlap Detection',
  description:
    'QASkills skills path overlap detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills skills path overlap detection',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills skills path overlap detection, including two agents resolving to one skills destination?',
  intentBoundary:
    'Covers two agents resolving to one skills destination. Excludes duplicate skill counting inside one agent.',
  secondaryKeywords: [
    'how to test skills path overlap detection',
    'skills path overlap detection test cases',
    'skills path overlap detection edge cases',
    'skills path overlap detection CI validation',
    'skills path overlap detection failure diagnostics',
    'skills path overlap detection regression coverage',
  ],
  repoEvidence: [
    'packages/shared/src/constants/agents.ts#evidence-1',
    'packages/shared/src/constants/agents.ts#evidence-2',
    'packages/cli/src/lib/agent-detector.ts',
    'packages/cli/src/lib/installer.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/agents',
    '/getting-started',
    '/blog/agent-skills-open-standard-portability',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'agent-skills-open-standard-portability',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://agentskills.io/specification',
    'https://nodejs.org/api/fs.html',
    'https://nodejs.org/api/path.html',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills skills path overlap detection baseline',
      language: 'typescript',
      path: 'packages/shared/src/constants/agents.ts',
      snippet:
        "export const AGENTS: AgentDefinition[] = [\n  {\n    id: 'claude-code',\n    name: 'Claude Code',\n    slug: 'claude-code',\n    description: 'Anthropic CLI coding agent',\n    configDir: '~/.claude',\n    skillsDir: '~/.claude/commands',\n    configFile: 'CLAUDE.md',\n    installMethod: 'symlink',\n    website: 'https://claude.ai/code',\n  },\n  {\n    id: 'cursor',\n    name: 'Cursor',\n    slug: 'cursor',\n    description: 'AI-first code editor',\n    configDir: '.cursor',",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/shared/src/constants/agents.ts',
      snippet:
        "{\n    id: 'cursor',\n    name: 'Cursor',\n    slug: 'cursor',\n    description: 'AI-first code editor',\n    configDir: '.cursor',\n    skillsDir: '.cursor/rules',\n    configFile: '.cursorrules',\n    installMethod: 'copy',\n    website: 'https://cursor.com',\n  },\n  {\n    id: 'github-copilot',\n    name: 'GitHub Copilot',\n    slug: 'github-copilot',\n    description: 'GitHub AI coding assistant',\n    configDir: '.github',\n    skillsDir: '.github/copilot-instructions',",
    },
  ],
});
