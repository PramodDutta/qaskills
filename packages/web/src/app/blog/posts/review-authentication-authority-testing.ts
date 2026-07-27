import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 499,
  slug: 'review-authentication-authority-testing',
  campaignCluster: 'web-platform',
  title: 'Review Authentication Authority Testing',
  description:
    'review authentication authority testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'review authentication authority testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify review authentication authority testing across expected, fallback, and failure states in QASkills?',
  intentBoundary:
    'Owns disagreement between the client Clerk-session heuristic and server API authorization, with the API as authority. It excludes signup-gate behavior.',
  secondaryKeywords: [
    'how to test review authentication authority',
    'review authentication authority integration coverage',
    'review authentication authority Playwright assertions',
    'review authentication authority failure modes',
    'review authentication authority edge cases',
    'review authentication authority regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/api/reviews/route.ts#evidence-1',
    'packages/web/src/app/api/reviews/route.ts#evidence-2',
    'packages/web/src/components/skills/review-section.tsx',
    'packages/web/src/db/schema/relations.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/faq',
    '/leaderboard',
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
    'https://orm.drizzle.team/docs/relations',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the review authentication authority testing baseline',
      language: 'typescript',
      path: 'packages/web/src/app/api/reviews/route.ts',
      snippet:
        "export async function GET(request: NextRequest) {\n  const { searchParams } = new URL(request.url);\n  const skillId = searchParams.get('skillId');\n\n  if (!skillId) {\n    return NextResponse.json(\n      { error: 'skillId query parameter is required' },\n      { status: 400 },\n    );\n  }\n\n  try {\n    // Fetch reviews joined with users for reviewer info\n    const reviewRows = await db\n      .select({\n        id: reviews.id,\n        rating: reviews.rating,\n        comment: reviews.comment,",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/api/reviews/route.ts',
      snippet:
        '// Fetch reviews joined with users for reviewer info\n    const reviewRows = await db\n      .select({\n        id: reviews.id,\n        rating: reviews.rating,\n        comment: reviews.comment,\n        helpfulCount: reviews.helpfulCount,\n        createdAt: reviews.createdAt,\n        updatedAt: reviews.updatedAt,\n        userName: users.name,\n        userAvatar: users.avatar,\n        userUsername: users.username,\n      })\n      .from(reviews)\n      .innerJoin(users, eq(reviews.userId, users.id))\n      .where(eq(reviews.skillId, skillId))\n      .orderBy(desc(reviews.createdAt));',
    },
  ],
});
