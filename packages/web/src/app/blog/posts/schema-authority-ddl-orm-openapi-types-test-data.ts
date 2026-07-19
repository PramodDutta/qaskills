import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Schema Authority Test Data Guide',
  description:
    'Apply schema authority test data rules across SQL DDL, ORM models, OpenAPI contracts, and TypeScript types whenever declarations conflict at runtime.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Guide',
  primaryKeyword: 'schema authority test data',
  keywords: [
    'schema authority test data',
    'test data schema priority',
    'DDL ORM OpenAPI conflicts',
    'TypeScript erased types',
    'database constraint testing',
    'schema-driven test factories',
    'OpenAPI request validation',
    'secure synthetic test data',
  ],
  contentKind: 'child',
  pillarSlug: 'test-data-management-strategies',
  relatedSlugs: [
    'bind-release-evidence-to-head-sha',
    'max-diff-lines-release-analysis-gate',
    'ai-release-guardian-human-control-boundary',
    'constraint-field-map-before-test-data-generation',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://spec.openapis.org/oas/v3.1.0',
    'https://www.typescriptlang.org/docs/handbook/typescript-from-scratch',
  ],
  content: `Resolve each **schema authority test data** conflict by operation: use DDL for stored-state constraints, runtime validators and OpenAPI for API boundaries, ORM behavior for persistence paths, and TypeScript as compile-time evidence. Report each mismatch instead of hiding it with convenient builder values.

The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) sets this order and bans guesses when schemas are silent. Use the [test data management guide](/blog/test-data-management-strategies) for owners and data life, the [synthetic test data guide](/blog/synthetic-test-data-generation-guide) for builder plans, and [QASkills](/skills) for more DB and API test guides.

## What Causes DDL ORM OpenAPI Conflicts?

One entity can have several valid contracts. SQL controls stored rows, an ORM maps app writes, OpenAPI defines request and response shapes, and TypeScript provides compile-time checking and editor tooling. These layers serve different needs, so their text need not match in all cases.

Clashes become risky when no one says whether a difference is planned. A DB column may allow null while a create request requires the field and a patch may omit it. That can be valid. A TypeScript \`string\` for DB \`varchar(50)\` misses a run-time limit and should create a finding or edge test.

| Layer | Primary concern | Runtime enforcement | Typical omission |
| --- | --- | --- | --- |
| SQL DDL or migration | Stored-state integrity | Database rejects violating writes | Request-specific conditional rules |
| ORM model | Application persistence mapping | ORM checks when configured, followed by database enforcement during execution | Partial indexes, triggers, or older migrations |
| OpenAPI 3.1 schema | API request and response contract | Only when gateway or application validates it | Internal storage and cross-row rules |
| TypeScript type | Compile-time program shape | Types are erased from emitted JavaScript | Length, pattern, uniqueness, and database behavior |

A schema authority test data decision depends on the operation rather than one fixed hierarchy. Use DDL for stored state, request schemas and validators at API edges, ORM behavior for persistence paths, and code types for compile-time intent. The builder follows the rule that acts on its path while each mismatch stays open for a fix.

For example, OpenAPI may allow a 100-character display name, the ORM may allow 80, and the DB may store 50. A valid stored builder value must fit 50. Edge tests should still send lengths 50, 51, 80, 81, 100, and 101 to show where the public promise and stored row differ.

That is the core **schema authority test data** rule: choose the source for one path and keep all conflicting claims in view. A builder that keeps only values shared by all schemas can hide an API promise the service cannot meet.

## How Do You Set Test Data Schema Priority?

The right source depends on the path under test. SQL is final for a direct DB insert. For an HTTP request rejected before a write, OpenAPI and app checks define the edge, though a valid request must still meet storage rules.

Use this decision procedure:

1. Name the operation: create request, patch request, direct insert, domain object construction, or response serialization.
2. Inventory every declaration that applies to each field, including migrations and indexes.
3. Identify the component that executes first and the component that ultimately enforces stored state.
4. Generate valid defaults from the strictest applicable runtime authority without erasing broader promises.
5. Create conflict cases that show where declarations disagree, then assign an owner for correction.

This order works because stored rows cannot bypass active DB constraints. PostgreSQL's [constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) says bad writes raise errors and covers check, not-null, unique, primary-key, foreign-key, and exclusion rules. Those rules still govern a write when an earlier layer is loose.

OpenAPI governs the public API contract, not all private rows. The [OpenAPI 3.1 specification](https://spec.openapis.org/oas/v3.1.0) defines Schema Objects with JSON Schema Draft 2020-12 terms and supports types, formats, required keys, composition, and more rules. The app still needs code that enforces those rules at run time.

TypeScript can catch wrong code shapes, but it cannot check stored values after the build. The official [TypeScript introduction](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch) says types are erased when JavaScript is compiled and do not change run-time behavior. A TypeScript type alone cannot prove that an API body or database row is valid.

Write down planned boundary differences. A database-generated field can be absent from a create request because the database supplies its default. A response can show a derived field that is not stored. The rule map should show these changes instead of forcing one object shape everywhere.

## Which Rules Drive Database Constraint Testing?

Do not solve conflicts from memory. Read current migrations, the live database schema, ORM rules, OpenAPI components and request schemas, run-time validators, and TypeScript types. Read generated files only after you find the source that produced them.

Build one row for each entity field. Record type, required and null rules, lengths, number bounds, enum values, format, default, unique scope, link, check, source, and owner. A blank cell means unknown, not free of limits.

| Field property | DDL evidence | ORM evidence | API evidence | Type evidence | Resolution question |
| --- | --- | --- | --- | --- | --- |
| Requiredness | \`NOT NULL\` | \`notNull()\` | In operation \`required\` list | Missing \`?\` | Required for which operation? |
| Length | \`varchar(50)\` | \`varchar(80)\` | \`maxLength: 100\` | \`string\` | Which values are promised and storable? |
| Enum | Check or enum type | Model enum | Schema \`enum\` | String union | Are member sets synchronized? |
| Uniqueness | Unique index | ORM unique flag | Usually undocumented behavior | Not expressible | What collision scope applies? |
| Relation | Foreign key and delete action | Relation mapping | Identifier format only | Branded or plain ID | What parent and lifecycle are required? |
| Default | Database expression | ORM default | Optional plus documented default | Optional property | Which component supplies it? |

Read the deployed migration chain, not just the planned schema view. A model may change without a migration, or an old migration may hold a partial unique index missing from ORM data. The DB can still enforce a rule that the app forgot.

Read the DB catalog in a safe test setup when migration files and current state may differ. Compare the result with rules in source control and report drift. Never run trial builders or destructive constraint tests on live data.

The [database testing automation guide](/blog/database-testing-automation-guide) can group constraint checks after this map. The [OpenAPI test suite generation guide](/blog/openapi-spec-to-test-suite-generation) helps test request contracts, but its built cases still need results based on DB rules.

## How Should Schema-Driven Test Factories Resolve DDL and ORM?

When DDL and ORM clash on stored data, build valid defaults from active DB constraints and open a map defect. Do not weaken the DB or make the builder retry random values until one insert works. A fixed failure gives more value than luck.

Consider this migration and application model:


\`\`\`sql
CREATE TABLE customer_accounts (
  id uuid PRIMARY KEY,
  email varchar(120) NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'suspended')),
  sponsor_id uuid REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_accounts_email_key UNIQUE (email)
);
\`\`\`


\`\`\`ts
export type NewCustomerAccount = {
  id: string;
  email: string;
  status: 'active' | 'suspended' | 'pending';
  sponsorId?: string;
  createdAt?: Date;
};
\`\`\`

The type adds \`pending\`, which the DB check rejects. It also says nothing about email length or unique scope. A builder should use \`active\`, make unique reserved-domain emails no longer than 120 characters, omit \`created_at\` when testing the DB default, and use a real sponsor when one is set.

The builder should also make one \`pending\` case that proves the clash. If the product needs the new status, add and deploy a migration before the app writes it. If the type is wrong, remove that value. The test must not choose product rules.

PostgreSQL notes that a check passes when it yields true or null. A separate \`NOT NULL\` rule is needed when null must fail. This fact matters for bad-value cases, so the builder must read the full column rule instead of treating one check as all rules.

Foreign keys add row order and cleanup rules. Insert parents before children, return real IDs, and test the configured \`ON DELETE\` action. A link marked optional in TypeScript still needs a valid parent when the request supplies a non-null ID.

The **schema authority test data** result should name the chosen valid default and the open mismatch. That report lets a later schema change invalidate one map row and one builder instead of many copied fixtures.

## Where Does OpenAPI Request Validation Hold Authority?

OpenAPI describes public request and response shapes. Its rules can differ on purpose for create, replace, patch, and response paths. Build API tests from the exact path being called instead of one shared domain type.

Suppose a create request needs \`email\` and \`status\`, while the database supplies \`id\` and \`created_at\`. The API builder should omit database-generated fields unless the contract accepts them. After success, response checks and a database query can verify the new values.


\`\`\`yaml
components:
  schemas:
    CreateCustomerAccount:
      type: object
      required: [email, status]
      additionalProperties: false
      properties:
        email:
          type: string
          format: email
          maxLength: 120
        status:
          type: string
          enum: [active, suspended]
\`\`\`

This schema matches the table for status values and email length, but it says nothing about DB uniqueness. Build duplicate-email tests from DDL proof and assert the API's documented error. If no error contract exists, record the gap instead of making up a status code.

OpenAPI \`format\` can add meaning, but the spec leaves some checks to the app that reads it. Test the checker or app path that your service uses. A schema file with no run-time link is docs and builder input, not proof that a bad value will fail.

\`required\` applies to an object in JSON Schema. It lists keys that must be present, while null depends on the allowed types. Do not turn "not required" into "nullable," and do not treat \`null\`, a missing key, and JavaScript \`undefined\` as the same case.

The [OpenAPI specification to test suite guide](/blog/openapi-spec-to-test-suite-generation) can build request-edge cases. Link those cases to the [constraint field map guide](/blog/constraint-field-map-before-test-data-generation) so DB-only unique rules, checks, foreign keys, defaults, and built columns are not lost.

## What Do TypeScript Erased Types Mean for Tests?

TypeScript types show developer intent and make builders easier to use, but their rules vanish from built JavaScript. Use them to shape builders and named cases. Trace run-time acceptance to checkers, API handlers, ORM code, and DDL.

A plain \`string\` does not show DB length, pattern, sort rules, or unique scope. An optional key does not show whether a caller may omit it, pass null, or set it to undefined in a JavaScript object before JSON serialization. A union may list business states, but the live DB or API may have a different set.

Branded types such as \`UserId\` can stop ID mix-ups at build time. Make them through the repo's constructor when one exists because that path may check the format. Still read the DB foreign key and API format before calling the value valid at run time.

| TypeScript construct | Useful factory signal | Missing runtime question |
| --- | --- | --- |
| \`string\` | Produce text | What bounds, patterns, and normalization apply? |
| \`status: 'a' | 'b'\` | Create intent-named variants | Do deployed API and DDL accept both? |
| \`field?: string\` | Builder may omit field | Is null accepted, and who supplies a default? |
| \`UserId\` brand | Avoid mixing identifiers in code | Does referenced row exist? |
| \`Date\` | Builder expects a date object | Which wire format and database zone apply? |
| \`Partial<T>\` override | Express test intent | Which final fields remain required? |

Do not build all bad cases by bypassing TypeScript with \`as unknown as T\`. That cast can help at an edge, but a named schema rule should drive the case. If not, the test proves only that JavaScript can receive an odd value, which is already known.

Keep unsafe values out of valid builder return types when you can. A valid builder can return \`NewCustomerAccount\`, while an edge-case helper returns request data or SQL values meant to fail. This split stops bad fixtures from leaking into other tests.

The skill favors fixed output, fixed clocks, worker-safe unique values, and clear overrides. TypeScript makes those builders easy to call, while the rule map keeps their defaults tied to run-time facts.

## How Do You Turn Schema Conflicts Into Test Cases?

A clash record should name the entity, field, path, source rules, chosen source, built cases, owner, and planned fix. Avoid a vague note such as "schemas differ." Reviewers need the exact values that each layer accepts.


\`\`\`json
{
  "entity": "customer_accounts",
  "field": "status",
  "operation": "create and persist",
  "declarations": {
    "ddl": ["active", "suspended"],
    "orm_or_type": ["active", "suspended", "pending"],
    "openapi": ["active", "suspended"]
  },
  "selected_authority": "ddl for persistence; OpenAPI for request",
  "generated_cases": ["active", "suspended", "pending-rejected"],
  "owner": "accounts-schema-owner"
}
\`\`\`

Do not invent an owner in tool output. Read ownership from committed repo rules or leave the field blank for human review. The key point is that the builder must stop when a field source stays unclear.

Clash tests should assert the exact edge that rejects a value and prove no partial write remains. If an app check accepts a request but SQL rejects it, assert the documented service error and prove the table did not gain a row.

Keep known clashes in view until the rules match. An expected failure can be valid when repo rules allow it, but its issue and end date must stay clear. A mismatch ignored for good becomes hidden product behavior.

Release checks matter when a clash fix changes migrations or public schemas. Use [binding release evidence to HEAD](/blog/bind-release-evidence-to-head-sha) so the migration, built cases, and test results name one commit. Apply the [maximum diff size release review](/blog/max-diff-lines-release-analysis-gate) when linked schema edits make a large built diff.

The [human control boundary](/blog/ai-release-guardian-human-control-boundary) also applies to this choice. A builder can suggest the source based on run-time checks, but a schema owner decides whether the API, ORM, or DB rule should change.

## How Should Defaults and Transformations Be Mapped?

**Schema authority test data** choices get harder when values change between request and storage. An API may accept a local date, app code may change its form, and the DB may store a timestamp. Map each step instead of using one form in every test.

Defaults need an owner. Test DB \`DEFAULT now()\` by omitting the column on insert and reading the stored value. Test an app default by calling the app without that field. An OpenAPI default documents an expected value, but the service must define and test whether it applies that value.

Do not make the builder fill each default by itself. That can stop tests from checking the part that should supply the value. Keep separate builders for direct DB writes, API requests, and expected responses when their writable fields differ.

| Value behavior | Authority question | Generation approach |
| --- | --- | --- |
| Database default | Does SQL fill an omitted column? | Omit in direct insert and assert returned row |
| Application normalization | Which input forms become one stored form? | Generate documented inputs and assert canonical output |
| Generated column | Which base fields determine its value? | Write base fields only and assert derived value |
| Response-only property | Which service calculation supplies it? | Exclude from request and assert response contract |
| Trigger-managed audit field | Which operation changes it? | Avoid direct writes and test trigger behavior |
| ORM serialization | Which runtime value reaches SQL? | Observe parameters or persisted row at integration boundary |

Derived and built fields should not be normal builder overrides unless the path lets clients write them. An override that skips their source can make an impossible test row. If a low-level damage test needs such a row, put it in a clearly named admin fixture with separate approval.

The **schema authority test data** map should record wire and storage forms. A UUID may cross the API as text while the DB uses its native UUID type. A decimal may arrive as a JSON number or string, then become an exact DB numeric value.

Value changes can also reject input that one schema seems to allow. Record checker and mapper paths beside DDL, OpenAPI, ORM, and TypeScript proof. A hidden trim, lowercase step, or time-zone change is real behavior and may show that contract docs are missing.

## How Do Schema Rules Change During a Rollout?

A **schema authority test data** rule must account for deploy order. During an additive migration, old and new app versions may use one DB at the same time. Valid test data should cover that shared window, not just the final model.

For a new nullable column, first deploy storage that accepts old writes. Then deploy app code that reads the field, start new writes when planned, fill old rows if needed, and tighten rules only after old writers are gone. Each phase has its own active contract and needs a named commit.

Enum change shows the risk. Adding a TypeScript value before the DB accepts it creates app values that fail on write. Adding the DB value first may keep writes safe, but old readers can still fail on rows that use it. Test each supported old-new reader and writer pair.

Use an evolution matrix:

| Phase | Database capability | Application capability | Required data cases |
| --- | --- | --- | --- |
| Before migration | Old fields and constraints | Old reads and writes | Existing valid and rejected values |
| Additive storage | Old plus compatible new shape | Old application still deployed | Old writes remain valid |
| New application | Compatible new shape | New reads, optional new writes | Both old and new representations |
| Backfill | Target shape with mixed rows | Readers tolerate transition | Missing and populated field states |
| Constraint tightening | Final enforced shape | Old writers removed | New boundary and rollback cases |

Do not solve rollout clashes by treating the newest file as the source everywhere. A migration at HEAD may not yet be on the test DB, while a live DB may be ahead of a local view during staged rollout. Record the DB schema commit and compare it with test needs.

The **schema authority test data** report should split the planned source from the active source. The planned source guides fixes, while the active source shows what the current DB and service enforce. Mixing them can make tests pass only after the whole rollout ends.

Rollback needs the same care. If new code writes values that old code cannot read, rolling back app files will not restore safe use. Build a case with the new value, run the supported old reader when rules require it, and state whether rollout must pause before writes begin.

Link built datasets to migration and app SHAs. Data valid in one phase can fail after a rule gets tighter, so a seed alone is not enough. Keep the seed, map commit, schema commit, and request version together.

Use **schema authority test data** findings as release proof. The guardian can mark a data-shape change as high risk, check migration notes and tests, and advise NO-GO when rollout behavior is unknown. A human schema owner still chooses the planned contract.

## How Does Secure Synthetic Test Data Use Authority?

Once clashes are mapped, make one plain valid default from the active source. Add edge and bad cases by rule: one below, at, and one above a length or number bound. Test each enum value plus one bad value, and test null, missing, and undefined when they apply.

For unique fields, use worker and sequence IDs instead of trusting random luck. Use a fixed clock unless the test checks a DB time default. For linked rows, insert parents first and return real IDs instead of guessing sequence values.

Store the schema commit, builder seed, and clash-map version with each built dataset. These values let a team repeat a failure. They also stop old-schema data from being treated as current proof.

Keep live rows out of this work. The Secure Test Data Engineer uses schema shapes and, when approved, local summary stats. It does not need copied customer rows to learn that a field is unique, bounded, nullable, or linked.

Make **schema authority test data** review real by using the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) on one entity with DDL, ORM, OpenAPI, and TypeScript rules. Publish its field clashes, fix or assign each one, then build fixed valid and bad cases from the reviewed map.

## Frequently Asked Questions

### Does DDL always override OpenAPI for every test?

No. DDL governs stored rows, while OpenAPI defines API request and response shapes. A create request may be stricter than a table that allows null, and a response may hold derived fields. Name the path, use the layer that acts there, and report mismatches instead of forcing one shape everywhere.

### What if the ORM is stricter than the database?

Build app-path defaults that meet the ORM, then test whether its stricter rule is planned and documented. Direct DB tests still follow DDL. Record the gap because another writer can bypass the ORM, and later schema changes may expose rules hidden only in app checks.

### Why are TypeScript types last in the priority order?

TypeScript erases types when it builds JavaScript, so those rules do not enforce run-time values. They still show developer intent and help shape builders. Run-time checks, API contracts, ORM code, and DB constraints decide which requests and stored rows pass or fail.

### Should a generator use the strictest value shared by all schemas?

Use values shared by all schemas for normal defaults, but do not stop there. Their overlap can hide a broken public promise or enum value not yet deployed. Build clash cases at each edge, record which part rejects them, and assign the mismatch for a clear fix.

### How should nullable, optional, and absent values be tested?

Treat them as separate cases. A nullable database column may accept SQL null, an API key may be absent, and JavaScript undefined may vanish when JSON is serialized. Derive the result from each request schema and storage rule, then test failure or defaults at the real boundary.

### Can generated ORM files be the source of truth?

Only when you know their source and deploy state. If they are generated from the current DDL, verify that provenance and the clean rebuild result. If migrations and generated models clash, active DB constraints govern stored rows, while the mismatch stays as a finding that builders must not hide.

### Who decides which conflicting schema should change?

The named schema or service owner decides product intent. The test-data agent can find the active source, build examples, and show what each rule does. It must not edit contracts, weaken constraints, or call hidden behavior correct just because one layer enforces it today.
`,
};
