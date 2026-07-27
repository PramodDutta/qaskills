import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 498,
  slug: 'skill-jsonb-empty-default-tests',
  campaignCluster: 'web-platform',
  title: 'Skill Jsonb Empty Default Tests',
  description:
    'skill JSONB empty default tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skill JSONB empty default tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify skill JSONB empty default in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skill JSONB empty default as implemented by the cited QASkills files. It excludes broad declared Neon, Drizzle, and PostgreSQL storage contracts guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skill JSONB empty default',
    'skill JSONB empty default edge cases',
    'skill JSONB empty default integration coverage',
    'skill JSONB empty default Playwright assertions',
    'skill JSONB empty default fallback behavior',
    'skill JSONB empty default regression checklist',
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
      title: 'Build the skill JSONB empty default tests baseline',
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
