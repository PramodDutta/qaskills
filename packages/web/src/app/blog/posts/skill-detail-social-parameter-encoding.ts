import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 497,
  slug: 'skill-detail-social-parameter-encoding',
  campaignCluster: 'web-platform',
  title: 'Skill Detail Social Parameter Encoding',
  description:
    'skill detail social parameter encoding: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skill detail social parameter encoding',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skill detail social parameter encoding in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skill detail social parameter encoding as implemented by the cited QASkills files. It excludes broad one skill detail page, its rendered markdown, downloads, and clone entry point guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skill detail social parameter encoding',
    'skill detail social parameter encoding edge cases',
    'skill detail social parameter encoding integration coverage',
    'skill detail social parameter encoding Playwright assertions',
    'skill detail social parameter encoding fallback behavior',
    'skill detail social parameter encoding regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/skills/[author]/[slug]/page.tsx',
    'packages/web/src/lib/fallback-skill-detail.ts',
    'packages/web/src/lib/json-ld.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/how-to-publish',
    '/faq',
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
    'https://nextjs.org/docs/app/api-reference/functions/generate-metadata',
    'https://schema.org/SoftwareApplication',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the skill detail social parameter encoding baseline',
      language: 'typescript',
      path: 'packages/web/src/app/skills/[author]/[slug]/page.tsx',
      snippet:
        "export const dynamic = 'force-dynamic';\n\ninterface SkillPageProps {\n  params: Promise<{ author: string; slug: string }>;\n}\n\nasync function getSkill(author: string, slug: string) {\n  try {\n    const rows = await db\n      .select()\n      .from(skills)\n      .where(and(eq(skills.authorName, author), eq(skills.slug, slug)))\n      .limit(1);\n    return rows[0] || getFallbackSkillDetail(author, slug);\n  } catch {\n    return getFallbackSkillDetail(author, slug);\n  }\n}",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/lib/fallback-skill-detail.ts',
      snippet:
        "const summary = FALLBACK_SKILLS.find((skill) => skill.slug === PLAYWRIGHT_CLI_SLUG);\n  const markdown = readFallbackPlaywrightCliMarkdown();\n  if (!summary || !markdown) return null;\n\n  const launchDate = PLAYWRIGHT_CLI_SKILL.createdAt;\n\n  return {\n    id: '00000000-0000-4000-8000-000000000003',\n    name: summary.name,\n    slug: summary.slug,\n    description: summary.description,\n    fullDescription: extractMarkdownBody(markdown),\n    version: PLAYWRIGHT_CLI_SKILL.version,\n    license: PLAYWRIGHT_CLI_SKILL.license,\n    githubUrl: PLAYWRIGHT_CLI_SKILL.githubUrl,\n    authorId: null,\n    authorName: summary.author,",
    },
  ],
});
