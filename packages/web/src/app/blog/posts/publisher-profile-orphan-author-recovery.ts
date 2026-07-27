import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 462,
  slug: 'publisher-profile-orphan-author-recovery',
  campaignCluster: 'web-platform',
  title: 'Publisher Profile Orphan Author Recovery',
  description:
    'publisher profile orphan author recovery: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'publisher profile orphan author recovery',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams verify publisher profile orphan author recovery across expected, fallback, and failure states in QASkills?',
  intentBoundary:
    'Owns the profile fallback where authored skills exist but the normalized users row is absent. It excludes missing-skill 404 behavior and dashboard authentication.',
  secondaryKeywords: [
    'how to test publisher profile orphan author recovery',
    'publisher profile orphan author recovery integration coverage',
    'publisher profile orphan author recovery Playwright assertions',
    'publisher profile orphan author recovery failure modes',
    'publisher profile orphan author recovery edge cases',
    'publisher profile orphan author recovery regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/users/[username]/page.tsx',
    'packages/web/src/db/schema/users.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/components/skills/skill-card.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/leaderboard',
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
    'https://nextjs.org/docs/app/api-reference/functions/generate-metadata',
    'https://nextjs.org/docs/app/api-reference/functions/not-found',
    'https://orm.drizzle.team/docs/relations',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the publisher profile orphan author recovery baseline',
      language: 'typescript',
      path: 'packages/web/src/app/users/[username]/page.tsx',
      snippet:
        "export const dynamic = 'force-dynamic';\n\n\ninterface UserPageProps {\n  params: Promise<{ username: string }>;\n}\n\nasync function getUserData(username: string) {\n  try {\n    // First try to find the user in the users table\n    const [dbUser] = await db\n      .select()\n      .from(users)\n      .where(eq(users.username, username))\n      .limit(1);\n\n    // Query skills authored by this username\n    const userSkills = await db",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/db/schema/users.ts',
      snippet:
        "createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull(),\n});\n\nexport const userPreferences = pgTable('user_preferences', {\n  id: uuid('id').defaultRandom().primaryKey(),\n  userId: uuid('user_id')\n    .references(() => users.id, { onDelete: 'cascade' })\n    .notNull(),\n  emailNotifications: boolean('email_notifications').default(true).notNull(),\n  weeklyDigest: boolean('weekly_digest').default(true).notNull(),\n  newSkillAlerts: boolean('new_skill_alerts').default(true).notNull(),\n  packAlerts: boolean('pack_alerts').default(true).notNull(),\n  leadSource: text('lead_source'),\n  capturedAt: timestamp('captured_at').defaultNow().notNull(),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull(),\n});",
    },
  ],
});
