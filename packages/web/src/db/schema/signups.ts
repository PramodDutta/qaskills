import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Landing-page signup capture for validation experiments (EvalDog, QA Buddy, …).
 *
 * One generic table for all experiments; `source` says which landing page
 * captured the email (e.g. 'evaldog-landing', 'qabuddy-landing').
 * To remove an experiment, delete its page directory — the table is shared.
 *
 * `intent` distinguishes the two signals:
 *   - 'waitlist'  → soft interest (free email capture)
 *   - 'preorder'  → paid intent (set later by the payment webhook when wired)
 */
export const landingSignups = pgTable(
  'landing_signups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    source: text('source').default('').notNull(),
    intent: text('intent').default('waitlist').notNull(),
    note: text('note').default('').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    emailSourceIdx: uniqueIndex('landing_signups_email_source_idx').on(t.email, t.source),
  }),
);

export type LandingSignupRow = typeof landingSignups.$inferSelect;
export type NewLandingSignup = typeof landingSignups.$inferInsert;
