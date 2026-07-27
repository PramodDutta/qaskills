import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 382,
  slug: 'dynamic-hub-notfound-testing',
  campaignCluster: 'web-platform',
  title: 'Dynamic Hub Notfound Testing',
  description:
    'dynamic hub notfound testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'dynamic hub notfound testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify dynamic hub notfound testing across expected, fallback, and failure states in QASkills?',
  intentBoundary:
    'Owns unknown dynamic hub parameters across metadata and page rendering. It excludes closed roadmap routes and comparison 404 behavior.',
  secondaryKeywords: [
    'how to test dynamic hub notfound',
    'dynamic hub notfound integration coverage',
    'dynamic hub notfound Playwright assertions',
    'dynamic hub notfound failure modes',
    'dynamic hub notfound edge cases',
    'dynamic hub notfound regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/skills-for/[topic]/page.tsx',
    'packages/web/src/lib/skills-for-hubs.ts#evidence-2',
    'packages/web/src/lib/skills-for-hubs.ts#evidence-3',
    'packages/web/src/lib/json-ld.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/skills-for',
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
    'https://nextjs.org/docs/app/api-reference/functions/generate-static-params',
    'https://nextjs.org/docs/app/api-reference/functions/not-found',
    'https://schema.org/FAQPage',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the dynamic hub notfound testing baseline',
      language: 'typescript',
      path: 'packages/web/src/app/skills-for/[topic]/page.tsx',
      snippet:
        "export const dynamic = 'force-dynamic';\n\nconst ICONS = { zap: Zap, check: CheckCircle2, terminal: Terminal, star: Star } as const;\n\ninterface HubPageProps {\n  params: Promise<{ topic: string }>;\n}\n\nexport async function generateStaticParams() {\n  return allHubSlugs().map((topic) => ({ topic }));\n}\n\nexport async function generateMetadata({ params }: HubPageProps): Promise<Metadata> {\n  const { topic } = await params;\n  const hub = findHub(topic);\n  if (!hub) return { title: 'Skills Hub Not Found' };\n\n  const url = `https://qaskills.sh/skills-for/${topic}`;",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/lib/skills-for-hubs.ts',
      snippet:
        "export interface HubEntry {\n  /** URL slug: /skills-for/<slug> */\n  slug: string;\n  /** Page title for the browser tab + SERP */\n  title: string;\n  /** Meta description (130-160 chars) */\n  description: string;\n  /** Hero headline shown on page */\n  h1: string;\n  /** Hero intro paragraph */\n  intro: string;\n  /** Install command shown in install card */\n  installCmd: string;\n  /** Filter applied to query the skills table */\n  filter: SkillFilter;\n  /** Three value props */\n  valueProps: Array<{ icon: 'zap' | 'check' | 'terminal' | 'star'; title: string; body: string }>;\n  /** Related blog slugs (must exist in /blog/posts) */",
    },
  ],
});
