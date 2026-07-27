import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 375,
  slug: 'qaskills-partial-update-failure-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Partial Update Failure Testing',
  description:
    'QASkills partial update failure testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills partial update failure testing',
  intent: 'troubleshooting',
  coreQuestion:
    'What state remains when qaskills update succeeds for early agents but fails while copying to a later one?',
  intentBoundary:
    'Failure consistency during update, separate from add-command partial installation and successful update mechanics.',
  secondaryKeywords: [
    'qaskills update partial failure',
    'multi agent update consistency',
    'skill update rollback test',
    'agent copy error recovery',
    'update telemetry after failure',
    'partial skill version rollout',
  ],
  repoEvidence: [
    'packages/cli/src/commands/update.ts',
    'packages/cli/src/lib/installer.ts#evidence-2',
    'packages/cli/src/lib/installer.ts#evidence-3',
    'packages/cli/src/lib/telemetry.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/agents',
    '/getting-started',
    '/blog/error-handling-testing-patterns',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
    '/blog/how-to-write-high-quality-qa-skills',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
    'how-to-write-high-quality-qa-skills',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://vitest.dev/guide/mocking.html',
    'https://github.com/tj/commander.js',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills partial update failure testing baseline',
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
