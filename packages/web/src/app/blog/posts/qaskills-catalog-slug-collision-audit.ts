import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 352,
  slug: 'qaskills-catalog-slug-collision-audit',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Catalog Slug Collision Audit',
  description:
    'QASkills catalog slug collision audit: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills catalog slug collision audit',
  intent: 'informational',
  coreQuestion:
    'What should QA teams verify for QASkills catalog slug collision audit, including catalog slug collisions across agent definitions?',
  intentBoundary:
    'Covers catalog slug collisions across agent definitions. Excludes skill slugs and blog slugs.',
  secondaryKeywords: [
    'how to test catalog slug collision audit',
    'catalog slug collision audit test cases',
    'catalog slug collision audit edge cases',
    'catalog slug collision audit CI validation',
    'catalog slug collision audit failure diagnostics',
    'catalog slug collision audit regression coverage',
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
      title: 'Build the QASkills catalog slug collision audit baseline',
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
