import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description').default(''),
  type: text('type').notNull(), // testingType, framework, language, domain
  icon: text('icon').default(''),
  color: text('color').default('#6366F1'),
});

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
