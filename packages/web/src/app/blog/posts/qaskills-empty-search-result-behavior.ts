import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 334,
  slug: 'qaskills-empty-search-result-behavior',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Empty Search Result Behavior',
  description:
    'QASkills empty search result behavior: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills empty search result behavior',
  intent: 'troubleshooting',
  coreQuestion:
    'What output and exit behavior should qaskills search produce when the API succeeds but returns zero skills?',
  intentBoundary:
    'Successful zero-result UX, not network failure, filter construction, or result-count truncation.',
  secondaryKeywords: [
    'qaskills no skills found',
    'empty CLI search response',
    'zero result command testing',
    'search success empty array',
    'CLI empty state output',
    'QA skill search no match',
  ],
  repoEvidence: [
    'packages/cli/src/commands/search.ts',
    'packages/cli/src/lib/api-client.ts',
    'packages/shared/src/types/skill.ts',
    'packages/cli/e2e/e2e.mjs',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/getting-started',
    '/faq',
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
    'https://github.com/bombshell-dev/clack',
    'https://github.com/tj/commander.js',
    'https://vitest.dev/guide/',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills empty search result behavior baseline',
      language: 'typescript',
      path: 'packages/cli/src/commands/search.ts',
      snippet:
        "export const searchCommand = new Command('search')\n  .argument('[query]', 'Search query')\n  .description('Search for QA skills')\n  .option('-t, --type <type>', 'Filter by testing type')\n  .option('-f, --framework <framework>', 'Filter by framework')\n  .option('-l, --limit <limit>', 'Number of results', '10')\n  .action(async (query: string | undefined, options: { type?: string; framework?: string; limit: string }) => {\n    p.intro(pc.bgCyan(pc.black(' qaskills search ')));\n\n    let searchQuery = query;\n    if (!searchQuery) {\n      const input = await p.text({\n        message: 'What kind of QA skill are you looking for?',\n        placeholder: 'e.g. playwright e2e, api testing, performance',\n      });\n      if (p.isCancel(input)) { p.cancel('Cancelled.'); process.exit(0); }\n      searchQuery = input;\n    }",
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
