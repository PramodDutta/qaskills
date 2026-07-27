import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 413,
  slug: 'directory-sort-query-preservation-tests',
  campaignCluster: 'web-platform',
  title: 'Skills Sort Query Preservation Tests',
  description:
    'skills sort query preservation tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skills sort query preservation tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skills sort query preservation in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skills sort query preservation as implemented by the cited QASkills files. It excludes broad server-rendered skill discovery query state and card presentation guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skills sort query preservation',
    'skills sort query preservation edge cases',
    'skills sort query preservation integration coverage',
    'skills sort query preservation Playwright assertions',
    'skills sort query preservation fallback behavior',
    'skills sort query preservation regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/skills/page.tsx',
    'packages/web/src/components/skills/filter-panel.tsx',
    'packages/web/src/app/api/skills/route.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/agents',
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
      title: 'Build the skills sort query preservation tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/skills/page.tsx',
      snippet:
        "export const dynamic = 'force-dynamic';\n\n\nexport const metadata = {\n  title: 'Browse 500+ QA Skills for AI Agents',\n  description:\n    'Search and filter 500+ curated QA testing skills by framework, testing type, and language. Install into Claude Code, Cursor, Copilot, and 30+ AI agents.',\n  alternates: { canonical: 'https://qaskills.sh/skills' },\n  openGraph: {\n    title: 'Browse 500+ QA Skills for AI Agents',\n    description:\n      'Search and filter curated QA testing skills. Install into Claude Code, Cursor, Copilot, and 30+ AI agents.',\n    url: 'https://qaskills.sh/skills',\n    type: 'website',\n  },\n};\n\ninterface SkillsPageProps {",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/components/skills/filter-panel.tsx',
      snippet:
        'params.append(key, value);\n    }\n    params.set(\'page\', \'1\');\n    router.push(`/skills?${params.toString()}`);\n  };\n\n  const isActive = (key: string, value: string) => {\n    return searchParams.getAll(key).includes(value);\n  };\n\n  return (\n    <aside className="space-y-6">\n      <FilterSection\n        title="Testing Type"\n        items={TESTING_TYPES.map((t) => ({ id: t.id, name: t.name }))}\n        filterKey="testingType"\n        isActive={isActive}\n        onToggle={toggleFilter}',
    },
  ],
});
