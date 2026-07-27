import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 401,
  slug: 'denormalized-skill-author-snapshot-tests',
  campaignCluster: 'web-platform',
  title: 'Denormalized Skill Author Snapshot Tests',
  description:
    'denormalized skill author snapshot tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'denormalized skill author snapshot tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify denormalized skill author snapshot in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns denormalized skill author snapshot as implemented by the cited QASkills files. It excludes broad declared Neon, Drizzle, and PostgreSQL storage contracts guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test denormalized skill author snapshot',
    'denormalized skill author snapshot edge cases',
    'denormalized skill author snapshot integration coverage',
    'denormalized skill author snapshot Playwright assertions',
    'denormalized skill author snapshot fallback behavior',
    'denormalized skill author snapshot regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/db/index.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/db/schema/users.ts',
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
    'https://neon.com/docs/serverless/serverless-driver',
    'https://orm.drizzle.team/docs/column-types/pg',
    'https://www.postgresql.org/docs/current/ddl-default.html',
  ],
  codeExamples: [
    {
      title: 'Build the denormalized skill author snapshot tests baseline',
      language: 'typescript',
      path: 'packages/web/src/db/index.ts',
      snippet:
        "export function getDb() {\n  if (!_db) {\n    if (!process.env.DATABASE_URL) {\n      throw new Error('DATABASE_URL is not set');\n    }\n    const sql = neon(process.env.DATABASE_URL);\n    _db = drizzle(sql, { schema });\n  }\n  return _db;\n}\n\n// Re-export as a lazy getter for convenience\nexport const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {\n  get(_target, prop) {\n    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];\n  },\n});",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/db/schema/skills.ts',
      snippet:
        "testingTypes: jsonb('testing_types').$type<string[]>().default([]).notNull(),\n  frameworks: jsonb('frameworks').$type<string[]>().default([]).notNull(),\n  languages: jsonb('languages').$type<string[]>().default([]).notNull(),\n  domains: jsonb('domains').$type<string[]>().default([]).notNull(),\n  agents: jsonb('agents').$type<string[]>().default([]).notNull(),\n  qualityScore: integer('quality_score').default(0).notNull(),\n  installCount: integer('install_count').default(0).notNull(),\n  weeklyInstalls: integer('weekly_installs').default(0).notNull(),\n  featured: boolean('featured').default(false).notNull(),\n  verified: boolean('verified').default(false).notNull(),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull(),\n});\n\nexport type SkillRow = typeof skills.$inferSelect;\nexport type NewSkill = typeof skills.$inferInsert;",
    },
  ],
});
