import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 292,
  slug: 'qaskills-add-spinner-lifecycle-testing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Add Spinner Lifecycle Testing',
  description:
    'QASkills add spinner lifecycle testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills add spinner lifecycle testing',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills add spinner lifecycle testing, including spinner stop behavior across detection, resolution, download, and install faults?',
  intentBoundary:
    'Covers spinner stop behavior across detection, resolution, download, and install faults. Excludes terminal color snapshots.',
  secondaryKeywords: [
    'how to test add spinner lifecycle',
    'add spinner lifecycle test cases',
    'add spinner lifecycle edge cases',
    'add spinner lifecycle CI validation',
    'add spinner lifecycle failure diagnostics',
    'add spinner lifecycle regression coverage',
  ],
  repoEvidence: [
    'packages/cli/src/commands/add.ts',
    'packages/cli/src/lib/installer.ts',
    'packages/cli/src/lib/telemetry.ts',
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
      title: 'Build the QASkills add spinner lifecycle testing baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/add.ts',
      snippet:
        "export const addCommand = new Command('add')\n  .argument('<skill>', 'Skill name, GitHub shorthand (user/repo), or local path')\n  .description('Install a QA skill to your AI coding agents')\n  .option('-a, --agent <agent>', 'Target specific agent')\n  .option('-d, --dir <path>', 'Override install directory (skips agent skillsDir; useful for CI/testing)')\n  .option('-y, --yes', 'Non-interactive: install to all detected agents without prompting')\n  .action(async (skillName: string, options: { agent?: string; dir?: string; yes?: boolean }) => {\n    p.intro(pc.bgCyan(pc.black(' qaskills add ')));\n\n    const spinner = p.spinner();\n\n    try {\n\n    // 1. Detect agents\n    spinner.start('Detecting AI coding agents...');\n    const detected = detectAgents();\n    spinner.stop(`Found ${detected.length} agent(s)`);",
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
