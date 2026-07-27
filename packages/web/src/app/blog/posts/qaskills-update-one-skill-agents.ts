import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 314,
  slug: 'qaskills-update-one-skill-agents',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Update One Skill Agents',
  description:
    'QASkills update one skill agents: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills update one skill agents',
  intent: 'how-to',
  coreQuestion:
    'How does qaskills update <skill> redownload one package and reinstall it across every detected agent?',
  intentBoundary:
    'Successful named update workflow, not update-all behavior, source fallback, or partial failure.',
  secondaryKeywords: [
    'qaskills update skill command',
    'update agent skill package',
    'reinstall skill all agents',
    'qaskills update workflow',
    'verify updated SKILL.md',
    'agent skill version refresh',
  ],
  repoEvidence: [
    'packages/cli/src/commands/update.ts',
    'packages/cli/src/lib/installer.ts#evidence-2',
    'packages/cli/src/lib/installer.ts#evidence-3',
    'packages/cli/src/lib/installer.ts#evidence-4',
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
    'https://github.com/tj/commander.js',
    'https://semver.org/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills update one skill agents baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/update.ts',
      snippet:
        "export const updateCommand = new Command('update')\n  .argument('[skill]', 'Skill name to update (updates all if omitted)')\n  .description('Update installed QA skill(s)')\n  .action(async (skillName?: string) => {\n    p.intro(pc.bgCyan(pc.black(' qaskills update ')));\n\n    const spinner = p.spinner();\n    spinner.start('Checking for updates...');\n    const detected = detectAgents();\n\n    if (skillName) {\n      const skill = await resolveSkill(skillName);\n      const skillDir = await downloadSkill(skill);\n      for (const agent of detected) {\n        await installToAgent(skillDir, skill.name, agent.definition);\n      }\n      spinner.stop(`${pc.green('')} Updated \"${skillName}\"`);",
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
