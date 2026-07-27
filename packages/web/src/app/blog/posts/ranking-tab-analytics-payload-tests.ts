import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 451,
  slug: 'ranking-tab-analytics-payload-tests',
  campaignCluster: 'web-platform',
  title: 'Leaderboard Tab Analytics Payload Tests',
  description:
    'leaderboard tab analytics payload tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'leaderboard tab analytics payload tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify leaderboard tab analytics payload in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns leaderboard tab analytics payload as implemented by the cited QASkills files. It excludes broad leaderboard URL state and visual ranking presentation guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test leaderboard tab analytics payload',
    'leaderboard tab analytics payload edge cases',
    'leaderboard tab analytics payload integration coverage',
    'leaderboard tab analytics payload Playwright assertions',
    'leaderboard tab analytics payload fallback behavior',
    'leaderboard tab analytics payload regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/leaderboard/page.tsx',
    'packages/web/src/components/leaderboard/leaderboard-search.tsx',
    'packages/web/src/components/leaderboard/filter-tabs.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/leaderboard',
    '/categories',
    '/getting-started',
    '/blog/react-nextjs-testing-complete-guide',
    '/blog/api-testing-complete-guide',
    '/blog/database-testing-automation-guide',
    '/blog/authentication-authorization-testing-guide',
  ],
  relatedSlugs: [
    'react-nextjs-testing-complete-guide',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://nextjs.org/docs/app/getting-started/route-handlers',
    'https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the leaderboard tab analytics payload tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/leaderboard/page.tsx',
      snippet:
        "export const metadata = {\n  title: 'Top QA Skills Leaderboard: Most Installed Testing Skills for AI Agents',\n  description:\n    'Top QA skills from 450+ curated testing skills ranked by installs, quality score, and trending activity. See which testing skills AI agents use most.',\n};\n\n// Revalidate every 5 minutes\nexport const revalidate = 300;\n\n// Force dynamic rendering to ensure filter params work\nexport const dynamic = 'force-dynamic';\n\nconst tabs: Tab[] = [\n  { id: 'all', label: 'All Time', icon: 'Trophy' },\n  { id: 'trending', label: 'Trending', icon: 'TrendingUp' },\n  { id: 'hot', label: 'Hot', icon: 'Flame' },\n  { id: 'new', label: 'New', icon: 'Clock' },\n];",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/components/leaderboard/leaderboard-search.tsx',
      snippet:
        '}\n      const qs = params.toString();\n      router.push(qs ? `/leaderboard?${qs}` : \'/leaderboard\');\n    },\n    [router, searchParams],\n  );\n\n  return (\n    <div className="relative w-full sm:w-72">\n      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />\n      <input\n        type="text"\n        value={query}\n        onChange={(e) => setQuery(e.target.value)}\n        onKeyDown={(e) => {\n          if (e.key === \'Enter\') updateSearch(query);\n        }}\n        placeholder="Search skills..."',
    },
  ],
});
