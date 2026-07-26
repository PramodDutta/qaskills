import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Postgres cascade delete relation testing',
  description:
    'Use Postgres cascade delete relation testing to prove deleting a skill removes junction rows, installs, reviews, and pack items without orphans.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Postgres cascade delete relation testing',
  keywords: [
    'Postgres cascade delete relation testing',
    'Drizzle onDelete cascade test',
    'Postgres orphan row prevention',
    'foreign key cascade integration test',
    'skill deletion data integrity',
    'cascade delete multiple relations',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'postgres-migration-testing-guide',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-lazy-neon-database-initialization-nextjs-build',
  ],
  repoEvidence: [
    'packages/web/src/db/schema/relations.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/db/schema/categories.ts',
    'packages/web/src/db/schema/users.ts',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://orm.drizzle.team/docs/relations',
    'https://orm.drizzle.team/docs/indexes-constraints',
  ],
  content: `Postgres cascade delete relation testing proves that deleting one skill removes its category links, agent records, installs, reviews, and pack items through database foreign keys. The same test must show that shared users, categories, packs, another skill, and every child row owned by that control skill remain unchanged.

The cascade declarations live in \`packages/web/src/db/schema/relations.ts\`, while \`packages/web/src/db/schema/skills.ts\` defines the parent row. Supporting records come from \`packages/web/src/db/schema/categories.ts\` and \`packages/web/src/db/schema/users.ts\`, so the fixture can test deletion scope rather than simple row loss.

## What Must Postgres Cascade Delete Relation Testing Prove?

Postgres cascade delete relation testing must prove the whole child graph, not only one familiar junction table. The target skill owns rows in \`skill_categories\`, \`agent_compatibility\`, \`installs\`, \`reviews\`, and \`skill_pack_items\`. Each foreign key to \`skills.id\` declares \`onDelete: 'cascade'\`.

The test begins with positive setup proof. Query every child table by the target skill ID and require at least one row. If a fixture forgot pack items or installs, an after-delete zero would pass without exercising that relation.

Create a second control skill with equivalent child rows. After deleting only the target, every target count must be zero and every control count must match its recorded value. This check catches a broad cleanup query, a bad predicate, or a test helper that removed all rows.

Shared parent records should remain. Categories belong to their own table, users can own reviews and skills, and packs can contain several skills. A skill deletion removes link rows, not those shared category, user, or pack records.

The target parent itself must be absent after the delete. An assertion that only checks children could pass if a cleanup helper removed them manually but left the skill. Issue one parent delete in the test, then verify both parent and children from fresh queries.

Finally, try to insert a new child row that references the deleted skill ID. PostgreSQL should reject the orphan because the parent no longer exists. The [PostgreSQL constraints guide](https://www.postgresql.org/docs/current/ddl-constraints.html) defines the foreign key behavior that supports this last assertion.

The [database testing guide](/blog/database-testing-automation-guide) covers broad integrity plans. This article owns the exact graph rooted at a QASkills skill and the control checks needed to prove its deletion boundary.

## How Do You Write a Drizzle onDelete Cascade Test?

A Drizzle onDelete cascade test should build records through the exported schema, delete only the parent skill, and query each child table afterward. Do not call child delete helpers during the action phase. Manual cleanup would bypass the database behavior under test.

Start with one user, one category, and one skill pack that both target and control skills can share. Create two skill rows with unique slugs. Add one relation row of every supported kind for each skill, using distinct agent values where helpful.

The \`skillCategories\` and \`skillPackItems\` tables use composite primary keys. Their fixture keys must differ by skill, while category and pack may be shared. This shape proves that deleting one side removes only composite rows containing that parent.

\`\`\`typescript
const [user] = await db.insert(users).values(userFixture).returning();
const [category] = await db.insert(categories).values(categoryFixture).returning();
const [pack] = await db.insert(skillPacks).values(packFixture(user.id)).returning();
const [target, control] = await db.insert(skills).values([
  skillFixture('cascade-target', user.id),
  skillFixture('cascade-control', user.id),
]).returning();

for (const skill of [target, control]) {
  await db.insert(skillCategories).values({ skillId: skill.id, categoryId: category.id });
  await db.insert(agentCompatibility).values({ skillId: skill.id, agentName: 'codex' });
  await db.insert(installs).values({ skillId: skill.id, installType: 'add' });
  await db.insert(reviews).values({ skillId: skill.id, userId: user.id, rating: 4 });
  await db.insert(skillPackItems).values({ packId: pack.id, skillId: skill.id });
}
\`\`\`

This setup mirrors \`packages/web/src/db/schema/relations.ts\`. It does not need application API calls because the contract belongs to generated foreign keys. Direct inserts make every relation clear and reduce unrelated validation branches.

Record the child counts before deletion and assert each target count equals one. Then run \`db.delete(skills).where(eq(skills.id, target.id))\` once. Fresh count queries should return zero for target IDs and one for control IDs.

Use a real PostgreSQL test database. A mocked Drizzle chain can prove that code requested a delete, but it cannot execute a foreign key action. The [Drizzle relation documentation](https://orm.drizzle.team/docs/relations) explains application relation metadata, while database constraints perform this delete work.

Run the [Postgres migration testing guide](/blog/postgres-migration-testing-guide) beside this case. Source declarations can look correct while a stale test database still has an old foreign key, so the installed schema must be part of the oracle.

## What Proves Postgres Orphan Row Prevention?

Postgres orphan row prevention requires two forms of proof. Existing child rows tied to the deleted skill must disappear, and a new child row using that old ID must fail. The first checks cascade action, while the second checks continuing referential integrity.

Query each child table with an exact equality predicate on \`skillId\`. Avoid joining through the missing parent because such a join can hide orphan rows. A direct child query will reveal any row that survived even when its parent cannot be selected.

After those zero checks, choose one small child table for an attempted orphan insert. \`agent_compatibility\` is convenient because it needs only skill ID, agent name, and defaults. The insert should reject, and a final query should still show no row for the deleted ID.

Do not bind the assertion to a full database error message. PostgreSQL and adapters may wrap constraint details, while the stable contract is rejection with no inserted row. If the test environment exposes a reliable constraint identifier, asserting that name can improve diagnosis.

Orphan prevention also needs a control insert. Add a new agent row for the surviving control skill and require success. Without this step, a closed connection or failed transaction could make the orphan insert reject for the wrong reason.

The user and category foreign keys have their own cascade behavior. A review points to both skill and user, and a category link points to both skill and category. This test deletes the skill only, so it should not claim coverage for deleting those other parents.

Postgres cascade delete relation testing should run after migrations on an empty database. The [lazy database initialization article](/blog/testing-lazy-neon-database-initialization-nextjs-build) addresses connection creation, but this integration case needs an active database where constraints can run.

## Foreign Key Cascade Integration Test Scope

A foreign key cascade integration test belongs at the real database layer because the effect occurs inside PostgreSQL. TypeScript types, Drizzle schema objects, and SQL snapshots can show intent. None can prove that the active database has the expected constraints or that multi-table deletion works.

The smallest useful scope is one parent delete in one transaction. Build the full relation graph, verify it, delete the parent, then query target and control records. This path is faster and clearer than driving a browser or protected dashboard route.

Schema-level unit checks still have value. They can inspect generated SQL or migration text for \`ON DELETE CASCADE\`, and they fail quickly when a declaration changes. Keep them as an early signal, then retain the database case as execution proof.

Migration drift is the key risk. A branch can update \`packages/web/src/db/schema/relations.ts\` without applying that change to the database used in CI. A generated schema assertion may pass while the live delete restricts or leaves rows.

Use the same migration command CI uses for production-shaped tests. Record the database version and migration state when a failure occurs. Do not run broad schema repair inside the test, since that would hide drift from the gate meant to detect it.

Transactions need deliberate handling. If the test expects an orphan insert to fail, PostgreSQL can mark the transaction as failed until rollback. Use a savepoint, a separate transaction, or place the expected failure last before full rollback.

The [Postgres migration guide](/blog/postgres-migration-testing-guide) can own migration ordering and rollback checks. This foreign key cascade integration test should stay focused on one installed schema fact: the skill graph follows the parent delete while unrelated data survives.

## How Do You Protect Skill Deletion Data Integrity?

Skill deletion data integrity means removing only records whose relation depends on the target skill. A good test therefore has both deletion assertions and survival assertions. Zero target rows without controls can hide a dangerous table-wide cleanup.

The control skill should share a user, category, and pack with the target. Shared support makes the test strict: if deletion reaches beyond the target foreign key, one of those records or control links will disappear. Separate support records would prove less.

Count all target and control child rows before the action. Store those values in a small object keyed by table name. After deletion, compare target counts with zero and control counts with their exact prior values.

\`\`\`typescript
const before = await relationCounts({ targetId: target.id, controlId: control.id });

await db.delete(skills).where(eq(skills.id, target.id));

const after = await relationCounts({ targetId: target.id, controlId: control.id });
expect(after.target).toEqual({
  skillCategories: 0,
  agentCompatibility: 0,
  installs: 0,
  reviews: 0,
  skillPackItems: 0,
});
expect(after.control).toEqual(before.control);

expect(await findSkill(target.id)).toBeUndefined();
expect(await findSkill(control.id)).toMatchObject({ slug: 'cascade-control' });
expect(await findUser(user.id)).toBeDefined();
expect(await findCategory(category.id)).toBeDefined();
expect(await findPack(pack.id)).toBeDefined();
\`\`\`

The helper must query child tables directly. If it joins each count to \`skills\`, an orphan becomes invisible after the parent disappears. Review the SQL produced by the helper once, then keep its return small enough for useful test output.

Check counters on shared records if deletion code changes them elsewhere. The schema cascade itself does not decrement user totals, pack install counts, or category values. Tests should assert only fields that the actual deletion workflow promises, not an imagined business update.

The skill row has a nullable author reference in \`packages/web/src/db/schema/skills.ts\`. Deleting a skill does not delete its author. In the other direction, deleting a referenced author has no cascade declaration on that skill field, which is outside this action.

Use the [JSONB filter testing article](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) for skill field query coverage. Postgres cascade delete relation testing concerns relational child rows, not the JSON arrays stored on the parent.

## Cascade Delete Multiple Relations Fixture Design

Cascade delete multiple relations with a fixture that is complete, symmetric, and easy to count. Completeness means every direct child relation appears. Symmetry means target and control skills receive the same child shapes. Easy counts mean each relation has one row unless multiplicity itself matters.

Use one shared category and one shared pack. Add both skill IDs to each junction table. A target delete should remove one composite row and leave the row whose key contains the control ID.

Use one shared user as author and reviewer if the schema permits it. The reviews table references that user with its own cascade, but this action deletes only a skill. The user must remain, and the control review must still join correctly.

For agent compatibility, choose distinct agent names for target and control when logs need quick reading. For installs, set a fixed install type and country. Defaults are valid, but explicit values make surviving rows easier to identify.

Create at least one pack item for each skill with different order values. The order field is not part of the cascade rule, yet it helps show that the exact control row survived. Avoid duplicate composite keys because they would fail before the deletion phase.

Give each fixture a unique prefix for slug, email, username, category slug, and pack slug. This prevents parallel workers from colliding with unique constraints in \`packages/web/src/db/schema/categories.ts\` and \`packages/web/src/db/schema/users.ts\`.

Postgres cascade delete relation testing should fail during setup if any row is absent. Print only fixture IDs and count maps on failure. These facts make a missing setup row distinct from a broken cascade without exposing user content.

The [skills directory](/skills) shows the product object represented by the parent record. Keep the integration fixture private to the test database, since public catalog deletion would create unsafe and slow setup.

## Relation, Foreign Key, and Expected Deletion Matrix

This matrix maps every direct skill child in the current schema. The expected control outcome assumes one symmetric row existed for the second skill before deletion.

| Child table | Foreign key | Cascade declared | Target rows before | Target rows after | Control rows after |
|---|---|---|---:|---:|---:|
| skill_categories | skill_id to skills.id | Yes | 1 | 0 | 1 |
| agent_compatibility | skill_id to skills.id | Yes | 1 | 0 | 1 |
| installs | skill_id to skills.id | Yes | 1 | 0 | 1 |
| reviews | skill_id to skills.id | Yes | 1 | 0 | 1 |
| skill_pack_items | skill_id to skills.id | Yes | 1 | 0 | 1 |

The matrix comes from \`packages/web/src/db/schema/relations.ts\`, not from table names alone. The [Drizzle indexes and constraints guide](https://orm.drizzle.team/docs/indexes-constraints) explains how references and actions are declared in schema code. The installed PostgreSQL schema remains the final source during execution.

\`skill_categories\` also cascades when its category is deleted. \`skill_pack_items\` also cascades when its pack is deleted, and reviews cascade when their user is deleted. Those reverse parent actions need separate tests because this matrix deletes only a skill.

\`agent_compatibility\` and \`installs\` use generated UUID primary keys. Their target rows can be queried by skill ID after deletion. \`reviews\` also has a generated ID, while both junction tables use composite keys.

Do not include \`skill_packs\` as a target child. A pack item points to both pack and skill, but the pack row does not depend on one included skill. The shared pack survival assertion guards this distinction.

The matrix should change whenever a new table adds a cascading skill foreign key. A hard-coded list makes such drift visible during review. A helper that discovers tables at runtime can supplement it, but should not replace an explicit contract.

Use the [database testing category](/categories/api-testing) for related automation skills, even though this case runs below HTTP. The key artifact is a readable table that links each declaration to a before and after fact.

## How Do You Run the Full Cascade Procedure?

Run the full cascade procedure in an isolated PostgreSQL database after migrations. Set up target and control graphs, prove every row exists, delete only the target parent, inspect direct children, test the control graph, and finish with one rejected orphan insert.

1. Create target and control skills with shared users, categories, and one pack.
2. Insert child rows in all five skill-owned relations for both skills.
3. Record target and control counts from direct child-table queries.
4. Delete only the target skill through one parent-table statement.
5. Assert every target child count is zero and every control count is unchanged.
6. Assert shared users, categories, packs, and the control skill still exist.
7. Attempt an orphan insert and require rejection before cleanup.

Place the expected orphan failure behind a savepoint if other assertions must run afterward. Once PostgreSQL reports an error inside a transaction, later commands may need a rollback. Keeping that failure last is also a simple option.

Cleanup should delete the surviving control skill, pack, category, and user in a safe order, or roll back the whole test transaction. Never use an unscoped table delete. Parallel workers may be using the same database even when their fixture keys differ.

Run count queries after the parent delete on the same committed view that production code would use. If setup and assertions use different connections, commit setup before the action and use unique rows. Hidden transaction visibility can look like a cascade fault.

Postgres cascade delete relation testing should report the first table whose target or control count differs. A single giant snapshot is harder to diagnose. Table names, parent IDs, before counts, and after counts provide enough context.

Pair this test with generated migration review and a fresh-database CI job. The [database automation guide](/blog/database-testing-automation-guide) explains suite placement, while the [migration guide](/blog/postgres-migration-testing-guide) covers schema build proof.

After the test passes, browse [database testing skills](/skills) for a runner or fixture package that fits the repository. Keep the graph helper local and typed so a new relation cannot be added without a clear test update.

### Read the graph when the delete test fails

First print the five target counts and five control counts from the step just before the delete, since a zero at that point means the seed missed a table and no later zero can prove that its key rule ran. Keep the parent, user, group, and pack IDs in the same short log so a bad link is easy to spot without a full row dump.

When all target rows stay in place, check that the parent delete matched one row and that the test sent the target ID rather than the control ID, then read the active key rules from the test database. A source file can say cascade while an old local schema still blocks the delete or lacks the same action, so record the applied migration state with the failed run.

When just one child type stays, query that table by its own \`skillId\` field and do not join back to the now missing parent, because such a join can hide the very orphan that the test needs to show. Compare the key name and delete action with the other four tables, then fix the schema or migration instead of adding a manual child delete to the test.

When target rows are gone but control rows are gone too, inspect cleanup hooks and count helpers before the database rule, since a broad delete in setup or teardown can clear both graphs and still leave the target assertions green. Run the same helper once without the parent delete and require all control counts to stay fixed, which gives a quick test of the test code itself.

When the user, category, or pack is gone, check whether the action deleted that shared row by mistake rather than deleting the skill, and trace each statement in the transaction in its real order. Those records are not children of one skill in this graph, so their loss points to app cleanup or fixture code rather than the five skill foreign keys.

When the orphan insert succeeds, read the child row back by the deleted ID and fail with its new key, since that result proves the active database did not enforce the link even if source types still compile. Run a good insert for the control skill in the same test so a failed orphan case cannot pass merely because the link, session, or whole transaction was already dead.

When the orphan insert fails for the wrong cause, keep the database error class and safe key name but leave private row text out of CI logs, then retry a valid control insert after the right rollback step. An open key rule should reject the dead parent while the same table accepts the live parent, and that pair gives far more proof than any one caught error.

When cleanup fails, use the unique test prefix to find each row that still belongs to this run and remove only those rows, then restore no shared data that the test did not create. A full transaction rollback is safer when all calls share one view, but explicit narrow cleanup works when the route or helper owns a second database link.

Postgres cascade delete relation testing should show the first point where target and control graphs part from the plan, not just a final set of zeros with no clue about how those zeros arose. A compact before map, delete row count, after map, shared parent check, and orphan result gives the next maintainer enough facts to repair the key or the fixture.

Keep this fault guide next to the graph helper and use the same table names in both places, so a new child link forces a clear update to setup, counts, expected results, and failure text. That small rule keeps the test easy to trust as the schema grows and stops old logs from omitting the one new table that now owns skill data.

## Frequently Asked Questions

### Does Drizzle or PostgreSQL perform the cascade?

PostgreSQL performs the delete action through the installed foreign key constraint. Drizzle declares the intended action and sends the parent delete, but a mocked ORM cannot execute it. Keep a source or migration check for quick feedback and a real database test for final proof.

### Why does the test need a control skill?

A control skill proves that deletion is scoped to the selected parent. Its child rows should match their recorded counts after the target graph disappears. Without that control, an unsafe helper that clears a whole child table could produce zeros and falsely pass every target assertion.

### Should shared users, categories, and packs be deleted?

No, those rows are independent parents or shared records in this action. Only relation rows containing the deleted skill ID should disappear. The test should reuse support records across target and control graphs, then assert each support row and the control links remain present.

### How should an expected foreign key error be tested in a transaction?

Place the orphan insert after all read assertions, use a savepoint, or run it in a separate transaction. PostgreSQL can leave the active transaction in a failed state after an error. Assert rejection and no inserted row, then roll back through the chosen isolation method.

### What catches migration drift in cascade behavior?

Run the integration case against a database built from the repository's current migrations. A schema object test can show intended cascade options, but it cannot prove the database received them. Fresh-database CI plus the graph delete exposes missing, stale, or altered foreign key actions.

### Do composite junction keys need special cascade assertions?

They need direct target and control queries, but the cascade principle is unchanged. Seed one row for each skill using the same category or pack. After deleting the target, its composite row should vanish while the control key and shared parent record remain valid.

## Conclusion

Postgres cascade delete relation testing proves a graph-level contract: one parent delete removes all five dependent row groups and nothing shared. Positive setup checks, symmetric controls, direct child queries, and a rejected orphan insert prevent empty fixtures or broad cleanup from creating false confidence.

Browse [database testing skills](/skills) and add this complete cascade fixture to the integration suite. Use the [Postgres migration guide](/blog/postgres-migration-testing-guide) to ensure the same constraint actions reach every fresh environment.`,
};
