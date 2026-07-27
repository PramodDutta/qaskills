import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 347,
  slug: 'qaskills-info-slug-encoding-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Info Slug Encoding Tests',
  description:
    'QASkills info slug encoding tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills info slug encoding tests',
  intent: 'how-to',
  coreQuestion:
    'How does qaskills info safely encode spaces, slashes, Unicode, and reserved characters before requesting a skill?',
  intentBoundary:
    'CLI getSkill path-segment encoding, not SDK path behavior or not-found messaging.',
  secondaryKeywords: [
    'encode qaskills skill slug',
    'getSkill encodeURIComponent test',
    'CLI reserved character path',
    'skill ID URL encoding',
    'qaskills info special characters',
    'API path segment encoding',
  ],
  repoEvidence: [
    'packages/cli/src/commands/info.ts',
    'packages/cli/src/lib/api-client.ts#evidence-2',
    'packages/cli/src/lib/api-client.ts#evidence-3',
    'packages/shared/src/types/skill.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/blog/skill-md-format-guide',
    '/blog/api-testing-complete-guide',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'api-testing-complete-guide',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://url.spec.whatwg.org/',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent',
    'https://www.rfc-editor.org/info/rfc3986',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills info slug encoding tests baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/info.ts',
      snippet:
        "export const infoCommand = new Command('info')\n  .argument('<skill>', 'Skill name or slug')\n  .description('Show detailed information about a skill')\n  .action(async (skillName: string) => {\n    p.intro(pc.bgCyan(pc.black(' qaskills info ')));\n\n    const spinner = p.spinner();\n    spinner.start('Fetching skill details...');\n\n    try {\n      const skill = await getSkill(skillName);\n      spinner.stop('');\n\n      p.log.info([\n        `${pc.bold(skill.name)} ${pc.dim(`v${skill.version || '1.0.0'}`)}`,\n        `${pc.dim('by')} ${skill.author}`,\n        '',\n        skill.description,",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/cli/src/lib/api-client.ts',
      snippet:
        "});\n\n  return request<SkillSearchResult>(url);\n}\n\n/**\n * Get full details of a single skill by ID or slug.\n */\nexport async function getSkill(idOrSlug: string): Promise<Skill> {\n  const url = buildUrl(`/api/skills/${encodeURIComponent(idOrSlug)}`);\n  return request<Skill>(url);\n}\n\n/**\n * Get the full category listing (testing types, frameworks, languages, etc.).\n */\nexport async function getCategories(): Promise<Category[]> {\n  const url = buildUrl('/api/categories');",
    },
  ],
});
