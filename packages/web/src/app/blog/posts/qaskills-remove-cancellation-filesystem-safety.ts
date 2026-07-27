import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 262,
  slug: 'qaskills-remove-cancellation-filesystem-safety',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Remove Cancellation Filesystem Safety',
  description:
    'QASkills remove cancellation filesystem safety: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills remove cancellation filesystem safety',
  intent: 'how-to',
  coreQuestion:
    'How can a command test prove that declining or cancelling qaskills remove leaves every agent skill directory unchanged?',
  intentBoundary:
    'User cancellation before deletion, not missing targets or targeting an undetected agent.',
  secondaryKeywords: [
    'cancel qaskills remove',
    'decline skill uninstall prompt',
    'CLI cancellation filesystem test',
    'remove confirmation no changes',
    'mock clack confirm cancellation',
    'prevent accidental skill deletion',
  ],
  repoEvidence: [
    'packages/cli/src/commands/remove.ts',
    'packages/cli/src/lib/installer.ts',
    'packages/cli/src/lib/telemetry.ts',
    'packages/cli/src/lib/agent-detector.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/agents',
    '/getting-started',
    '/blog/agent-skill-security-review-checklist',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'agent-skill-security-review-checklist',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://github.com/bombshell-dev/clack',
    'https://vitest.dev/guide/mocking.html',
    'https://nodejs.org/api/fs.html',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills remove cancellation filesystem safety baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/remove.ts',
      snippet:
        "export const removeCommand = new Command('remove')\n  .argument('<skill>', 'Skill name to remove')\n  .description('Remove an installed QA skill')\n  .option('-a, --agent <agent>', 'Remove from specific agent only')\n  .option('-y, --yes', 'Non-interactive: remove from all detected agents without prompting')\n  .action(async (skillName: string, options: { agent?: string; yes?: boolean }) => {\n    p.intro(pc.bgCyan(pc.black(' qaskills remove ')));\n\n    const detected = detectAgents();\n\n    let targetAgents = detected;\n    if (options.agent) {\n      // First check detected agents\n      targetAgents = detected.filter(\n        (a) => a.definition.id === options.agent || a.definition.name === options.agent,\n      );\n      // If not detected, check all known agents (allows removing from agents not currently detected)\n      if (targetAgents.length === 0) {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/cli/src/lib/installer.ts',
      snippet:
        "// GitHub shorthand (user/repo)\n  if (nameOrUrl.includes('/') && !nameOrUrl.includes('://')) {\n    return {\n      name: nameOrUrl.split('/').pop()!,\n      source: 'github',\n      path: '',\n      url: `https://github.com/${nameOrUrl}`,\n    };\n  }\n  // Registry name\n  return { name: nameOrUrl, source: 'registry', path: '', url: `https://qaskills.sh/api/skills/${nameOrUrl}` };\n}\n\nexport async function downloadSkill(skill: ResolvedSkill): Promise<string> {\n  const safeName = skill.name.replace(/[^a-zA-Z0-9_-]/g, '_');\n  const tmpDir = path.join(os.tmpdir(), 'qaskills', safeName);\n  // Clean up any previous download to avoid stale data / git clone conflicts\n  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});",
    },
  ],
});
