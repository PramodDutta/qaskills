import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 299,
  slug: 'qaskills-symlink-install-method-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Symlink Install Method Testing',
  description:
    'QASkills symlink install method testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills symlink install method testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills symlink install method testing, including acceptance tests for agents declared with symlink delivery?',
  intentBoundary:
    'Covers acceptance tests for agents declared with symlink delivery. Excludes symlinks inside downloaded packages.',
  secondaryKeywords: [
    'how to test symlink install method',
    'symlink install method test cases',
    'symlink install method edge cases',
    'symlink install method CI validation',
    'symlink install method failure diagnostics',
    'symlink install method regression coverage',
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
      title: 'Build the QASkills symlink install method testing baseline',
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
