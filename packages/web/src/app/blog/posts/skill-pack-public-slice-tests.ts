import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 463,
  slug: 'skill-pack-public-slice-tests',
  campaignCluster: 'web-platform',
  title: 'Skill Pack Public Slice Tests',
  description:
    'skill pack public slice tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'skill pack public slice tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skill pack public slice in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skill pack public slice as implemented by the cited QASkills files. It excludes broad pack assembly, authentication gate slices, and pack cards guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skill pack public slice',
    'skill pack public slice edge cases',
    'skill pack public slice integration coverage',
    'skill pack public slice Playwright assertions',
    'skill pack public slice fallback behavior',
    'skill pack public slice regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/packs/page.tsx',
    'packages/web/src/components/packs/packs-grid.tsx',
    'packages/web/src/components/auth/signup-gate.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/packs',
    '/pricing',
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
    'https://clerk.com/docs/reference/nextjs/auth',
    'https://testing-library.com/docs/react-testing-library/intro/',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the skill pack public slice tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/packs/page.tsx',
      snippet:
        "export const dynamic = 'force-dynamic';\n\n\nexport const metadata = {\n  title: 'Skill Packs',\n  description:\n    'Curated bundles of QA testing skills for AI agents. Install an entire Playwright, API, or performance testing toolkit with one command.',\n};\n\nconst fallbackPacks = [\n  {\n    name: 'Complete Playwright Suite',\n    slug: 'playwright-suite',\n    description: 'Everything you need for Playwright testing - E2E, API, visual regression, and accessibility.',\n    skills: ['playwright-e2e', 'playwright-api', 'visual-regression', 'axe-accessibility'],\n    skillCount: 4,\n    installs: 820,\n    featured: true,",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/components/packs/packs-grid.tsx',
      snippet:
        '))}\n        {gatedPacks.map((pack) => (\n          <div key={pack.slug} className="animate-pulse rounded-lg border bg-muted p-6">\n            <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />\n            <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />\n          </div>\n        ))}\n      </div>\n    );\n  }\n\n  // Signed in: show all packs\n  if (isSignedIn) {\n    return (\n      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">\n        {packs.map((pack) => (\n          <PackCard key={pack.slug} pack={pack} />\n        ))}',
    },
  ],
});
