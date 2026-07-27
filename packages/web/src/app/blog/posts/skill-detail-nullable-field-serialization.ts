import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 496,
  slug: 'skill-detail-nullable-field-serialization',
  campaignCluster: 'web-platform',
  title: 'Skill Detail Nullable Field Serialization',
  description:
    'skill detail nullable field serialization: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'skill detail nullable field serialization',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skill detail nullable field serialization in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skill detail nullable field serialization as implemented by the cited QASkills files. It excludes broad public API projection, headers, and documented failure response shapes guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skill detail nullable field serialization',
    'skill detail nullable field serialization edge cases',
    'skill detail nullable field serialization integration coverage',
    'skill detail nullable field serialization Playwright assertions',
    'skill detail nullable field serialization fallback behavior',
    'skill detail nullable field serialization regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts',
    'packages/web/src/app/api/skills/[id]/route.ts',
    'packages/web/src/db/schema/skills.ts',
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
    'https://nextjs.org/docs/app/getting-started/route-handlers',
    'https://playwright.dev/docs/test-assertions',
    'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
  ],
  codeExamples: [
    {
      title: 'Build the skill detail nullable field serialization baseline',
      language: 'typescript',
      path: 'packages/web/src/app/api/skills/route.ts',
      snippet:
        "export async function POST(request: NextRequest) {\n  console.log(' [v7-hotfix] POST /api/skills hit - the publish train has arrived!');\n  console.log(' [v7-hotfix] Cookie header present:', !!request.headers.get('cookie'));\n  console.log(' [v7-hotfix] Auth header present:', !!request.headers.get('authorization'));\n  try {\n    // 1. Authenticate\n    const user = await getAuthUser();\n    console.log(` [v7-hotfix] getAuthUser result: ${user ? `GOT USER id=${user.id} name=${user.username}` : 'NULL - auth failed'}`);\n    if (!user) {\n      console.error(' [v7-hotfix] Returning 401 - user is null. Check logs above for why.');\n      return NextResponse.json(\n        { error: 'Authentication required. Please sign in to publish a skill.' },\n        { status: 401 },\n      );\n    }\n\n    // 2. Parse & validate body\n    const body = await request.json();",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/api/skills/[id]/route.ts',
      snippet:
        ".where(isUuid ? eq(skills.id, id) : eq(skills.slug, id))\n      .limit(1);\n\n    if (rows.length === 0) {\n      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });\n    }\n\n    const row = rows[0];\n    return NextResponse.json({\n      id: row.id,\n      name: row.name,\n      slug: row.slug,\n      description: row.description,\n      fullDescription: row.fullDescription,\n      version: row.version,\n      author: row.authorName,\n      license: row.license,\n      githubUrl: row.githubUrl,",
    },
  ],
});
