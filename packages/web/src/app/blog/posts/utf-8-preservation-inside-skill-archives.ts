import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 383,
  slug: 'utf-8-preservation-inside-skill-archives',
  campaignCluster: 'web-platform',
  title: 'Utf-8 Preservation Inside Skill Archives',
  description:
    'UTF-8 preservation inside skill archives: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'UTF-8 preservation inside skill archives',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify UTF-8 preservation inside skill archives in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns UTF-8 preservation inside skill archives as implemented by the cited QASkills files. It excludes broad public API projection, headers, and documented failure response shapes guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test UTF-8 preservation inside skill archives',
    'UTF-8 preservation inside skill archives edge cases',
    'UTF-8 preservation inside skill archives integration coverage',
    'UTF-8 preservation inside skill archives Playwright assertions',
    'UTF-8 preservation inside skill archives fallback behavior',
    'UTF-8 preservation inside skill archives regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/[id]/artifact/route.ts',
    'packages/web/src/lib/skill-markdown.ts',
    'packages/web/src/app/api/skills/[id]/content/route.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/leaderboard',
    '/packs',
    '/categories',
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
    'https://nodejs.org/api/crypto.html',
    'https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html',
    'https://nextjs.org/docs/app/getting-started/route-handlers',
  ],
  codeExamples: [
    {
      title: 'Build the UTF-8 preservation inside skill archives baseline',
      language: 'typescript',
      path: 'packages/web/src/app/api/skills/[id]/artifact/route.ts',
      snippet:
        "export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n\n  try {\n    const isUuid = UUID_REGEX.test(id);\n\n    const rows = await db\n      .select()\n      .from(skills)\n      .where(isUuid ? eq(skills.id, id) : eq(skills.slug, id))\n      .limit(1);\n\n    if (rows.length === 0) {\n      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });\n    }\n\n    const row = rows[0];\n    const currentVersion = row.version || '1.0.0';",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/lib/skill-markdown.ts',
      snippet:
        "domains: unknown;\n  agents: unknown;\n}\n\nconst ARRAY_FIELDS = ['tags', 'testingTypes', 'frameworks', 'languages', 'domains', 'agents'] as const;\n\nexport function buildSkillMarkdown(row: SkillMarkdownRow): string {\n  const frontmatter: Record<string, unknown> = {\n    name: row.name,\n    description: row.description,\n    version: row.version || '1.0.0',\n    author: row.authorName,\n    license: row.license || 'MIT',\n  };\n\n  for (const field of ARRAY_FIELDS) {\n    const value = row[field];\n    if (Array.isArray(value) && value.length > 0) {",
    },
  ],
});
