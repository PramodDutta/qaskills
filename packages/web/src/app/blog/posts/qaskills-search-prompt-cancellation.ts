import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 288,
  slug: 'qaskills-search-prompt-cancellation',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Search Prompt Cancellation',
  description:
    'QASkills search prompt cancellation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills search prompt cancellation',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills search prompt cancellation, including optional-query prompt cancellation before API activity?',
  intentBoundary:
    'Covers optional-query prompt cancellation before API activity. Excludes successful empty search results.',
  secondaryKeywords: [
    'how to test search prompt cancellation',
    'search prompt cancellation test cases',
    'search prompt cancellation edge cases',
    'search prompt cancellation CI validation',
    'search prompt cancellation failure diagnostics',
    'search prompt cancellation regression coverage',
  ],
  repoEvidence: [
    'packages/cli/src/commands/search.ts',
    'packages/cli/src/lib/api-client.ts',
    'packages/shared/src/types/skill.ts',
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
      title: 'Build the QASkills search prompt cancellation baseline',
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
