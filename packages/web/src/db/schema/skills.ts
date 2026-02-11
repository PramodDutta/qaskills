import { pgTable, text, boolean, integer, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description').notNull(),
  fullDescription: text('full_description').default(''),
  version: text('version').default('1.0.0').notNull(),
  license: text('license').default('MIT').notNull(),
  githubUrl: text('github_url').default(''),
  authorId: uuid('author_id').references(() => users.id),
  authorName: text('author_name').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  testingTypes: jsonb('testing_types').$type<string[]>().default([]).notNull(),
  frameworks: jsonb('frameworks').$type<string[]>().default([]).notNull(),
  languages: jsonb('languages').$type<string[]>().default([]).notNull(),
  domains: jsonb('domains').$type<string[]>().default([]).notNull(),
  agents: jsonb('agents').$type<string[]>().default([]).notNull(),
  qualityScore: integer('quality_score').default(0).notNull(),
  installCount: integer('install_count').default(0).notNull(),
  weeklyInstalls: integer('weekly_installs').default(0).notNull(),
  featured: boolean('featured').default(false).notNull(),
  verified: boolean('verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SkillRow = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
