import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 308,
  slug: 'qaskills-unc-path-source-classification',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Unc Path Source Classification',
  description:
    'QASkills UNC path source classification: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills UNC path source classification',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills UNC path source classification, including UNC and network-share inputs at source resolution?',
  intentBoundary:
    'Covers UNC and network-share inputs at source resolution. Excludes long local path limits.',
  secondaryKeywords: [
    'how to test UNC path source classification',
    'UNC path source classification test cases',
    'UNC path source classification edge cases',
    'UNC path source classification CI validation',
    'UNC path source classification failure diagnostics',
    'UNC path source classification regression coverage',
  ],
  repoEvidence: [
    'packages/cli/src/lib/installer.ts#evidence-1',
    'packages/cli/src/lib/installer.ts#evidence-2',
    'packages/cli/src/lib/installer.ts#evidence-3',
    'packages/cli/src/lib/installer.test.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/blog/qaskills-cli-download-fallback-github-content-metadata',
    '/blog/qaskills-cli-extract-skill-package-github',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-cli-download-fallback-github-content-metadata',
    'qaskills-cli-extract-skill-package-github',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://agentskills.io/specification',
    'https://nodejs.org/api/fs.html',
    'https://nodejs.org/api/child_process.html',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills UNC path source classification baseline',
      language: 'typescript',
      path: 'packages/cli/src/lib/installer.ts',
      snippet:
        "export interface ResolvedSkill {\n  name: string;\n  source: string; // 'registry' | 'github' | 'local'\n  path: string;\n  url?: string;\n}\n\nexport async function resolveSkill(nameOrUrl: string): Promise<ResolvedSkill> {\n  // Local path\n  if (nameOrUrl.startsWith('.') || nameOrUrl.startsWith('/')) {\n    return { name: path.basename(nameOrUrl), source: 'local', path: path.resolve(nameOrUrl) };\n  }\n  // GitHub shorthand (user/repo)\n  if (nameOrUrl.includes('/') && !nameOrUrl.includes('://')) {\n    return {\n      name: nameOrUrl.split('/').pop()!,\n      source: 'github',\n      path: '',",
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
