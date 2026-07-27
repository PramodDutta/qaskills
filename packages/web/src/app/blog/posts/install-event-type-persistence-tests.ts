import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 433,
  slug: 'install-event-type-persistence-tests',
  campaignCluster: 'web-platform',
  title: 'Install Event Type Persistence Tests',
  description:
    'install event type persistence tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'install event type persistence tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify install event type persistence in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns install event type persistence as implemented by the cited QASkills files. It excludes broad declared Neon, Drizzle, and PostgreSQL storage contracts guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test install event type persistence',
    'install event type persistence edge cases',
    'install event type persistence integration coverage',
    'install event type persistence Playwright assertions',
    'install event type persistence fallback behavior',
    'install event type persistence regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/db/schema/relations.ts',
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
    'https://orm.drizzle.team/docs/relations',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://orm.drizzle.team/docs/indexes-constraints',
  ],
  codeExamples: [
    {
      title: 'Build the install event type persistence tests baseline',
      language: 'typescript',
      path: 'packages/web/src/db/schema/relations.ts',
      snippet:
        "export const skillCategories = pgTable(\n  'skill_categories',\n  {\n    skillId: uuid('skill_id')\n      .references(() => skills.id, { onDelete: 'cascade' })\n      .notNull(),\n    categoryId: uuid('category_id')\n      .references(() => categories.id, { onDelete: 'cascade' })\n      .notNull(),\n  },\n  (table) => ({\n    pk: primaryKey({ columns: [table.skillId, table.categoryId] }),\n  }),\n);\n\nexport const agentCompatibility = pgTable('agent_compatibility', {\n  id: uuid('id').defaultRandom().primaryKey(),\n  skillId: uuid('skill_id')",
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
