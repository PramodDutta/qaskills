import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 409,
  slug: 'directory-hub-slug-registry-tests',
  campaignCluster: 'web-platform',
  title: 'Skills Hub Slug Registry Tests',
  description:
    'skills hub slug registry tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'skills hub slug registry tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skills hub slug registry in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skills hub slug registry as implemented by the cited QASkills files. It excludes broad registry-driven comparison, skills-for, and roadmap page generation guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skills hub slug registry',
    'skills hub slug registry edge cases',
    'skills hub slug registry integration coverage',
    'skills hub slug registry Playwright assertions',
    'skills hub slug registry fallback behavior',
    'skills hub slug registry regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/skills-for-hubs.ts',
    'packages/web/src/app/skills-for/[topic]/page.tsx',
    'packages/web/src/app/sitemap.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/compare',
    '/skills-for',
    '/roadmaps',
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
    'https://nextjs.org/docs/app/api-reference/functions/generate-metadata',
    'https://schema.org/CollectionPage',
  ],
  codeExamples: [
    {
      title: 'Build the skills hub slug registry tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/skills-for-hubs.ts',
      snippet:
        "export interface SkillFilter {\n  /**\n   * SQL filter against jsonb columns on `skills`. Choose one approach:\n   * - agentJsonb: filter `agents @> '[<value>]'::jsonb`\n   * - frameworkJsonb: filter `frameworks @> '[<value>]'::jsonb`\n   * - testingTypeJsonb: filter `testingTypes @> '[<value>]'::jsonb`\n   * - tagsJsonb: filter `tags @> '[<value>]'::jsonb`\n   */\n  type: 'agent' | 'framework' | 'testingType' | 'tag';\n  value: string;\n}\n\nexport interface HubEntry {\n  /** URL slug: /skills-for/<slug> */\n  slug: string;\n  /** Page title for the browser tab + SERP */\n  title: string;\n  /** Meta description (130-160 chars) */",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/skills-for/[topic]/page.tsx',
      snippet:
        "export async function generateMetadata({ params }: HubPageProps): Promise<Metadata> {\n  const { topic } = await params;\n  const hub = findHub(topic);\n  if (!hub) return { title: 'Skills Hub Not Found' };\n\n  const url = `https://qaskills.sh/skills-for/${topic}`;\n  return {\n    title: hub.title,\n    description: hub.description,\n    alternates: { canonical: url },\n    openGraph: {\n      title: hub.title,\n      description: hub.description,\n      url,\n      type: 'website',\n    },\n    twitter: {\n      card: 'summary_large_image',",
    },
  ],
});
