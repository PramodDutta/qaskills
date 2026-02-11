import { pgTable, uuid, text, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { skills } from './skills';
import { users } from './users';
import { categories } from './categories';

export const skillCategories = pgTable(
  'skill_categories',
  {
    skillId: uuid('skill_id')
      .references(() => skills.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id')
      .references(() => categories.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.skillId, table.categoryId] }),
  }),
);

export const agentCompatibility = pgTable('agent_compatibility', {
  id: uuid('id').defaultRandom().primaryKey(),
  skillId: uuid('skill_id')
    .references(() => skills.id, { onDelete: 'cascade' })
    .notNull(),
  agentName: text('agent_name').notNull(),
  agentVersion: text('agent_version').default(''),
  compatible: boolean('compatible').default(true).notNull(),
  notes: text('notes').default(''),
});

export const installs = pgTable('installs', {
  id: uuid('id').defaultRandom().primaryKey(),
  skillId: uuid('skill_id')
    .references(() => skills.id, { onDelete: 'cascade' })
    .notNull(),
  agentType: text('agent_type').default(''),
  installType: text('install_type').notNull(), // add, remove
  country: text('country').default(''),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  skillId: uuid('skill_id')
    .references(() => skills.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').default(''),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const skillPacks = pgTable('skill_packs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description').default(''),
  authorId: uuid('author_id').references(() => users.id),
  featured: boolean('featured').default(false).notNull(),
  installCount: integer('install_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const skillPackItems = pgTable(
  'skill_pack_items',
  {
    packId: uuid('pack_id')
      .references(() => skillPacks.id, { onDelete: 'cascade' })
      .notNull(),
    skillId: uuid('skill_id')
      .references(() => skills.id, { onDelete: 'cascade' })
      .notNull(),
    order: integer('order').default(0).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.packId, table.skillId] }),
  }),
);
