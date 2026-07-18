import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Resolve Test Data Conflicts Across Schemas',
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
  content: `The **schema authority test data** rules resolve conflicting declarations by asking which layer actually rejects or accepts each value. Start with SQL DDL and migrations for stored data, then ORM models, OpenAPI or JSON Schema for the API boundary, and TypeScript types last. Report every disagreement as a defect instead of silently choosing convenient factory values.

The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) defines this priority and prohibits guessing when schemas stay silent. Use the [test data management guide](/blog/test-data-management-strategies) for ownership and lifecycle, the [synthetic test data guide](/blog/synthetic-test-data-generation-guide) for generation patterns, and [QASkills](/skills) for related database and API testing instructions.

## Understand Why Schema Layers Disagree

One entity can have several legitimate contracts. SQL controls what persists, an ORM maps application operations, OpenAPI describes request and response boundaries, and TypeScript helps developers before compilation. These layers serve different consumers, so perfect textual equality is neither expected nor always correct.

Conflicts become dangerous when nobody states whether a difference is intentional. A nullable database column may be required on create requests but optional on patch requests. That can be valid. A TypeScript \`string\` for a database \`varchar(50)\` omits a runtime limit and should drive a finding or additional boundary validation.

| Layer | Primary concern | Runtime enforcement | Typical omission |
| --- | --- | --- | --- |
| SQL DDL or migration | Stored-state integrity | Database rejects violating writes | Request-specific conditional rules |
| ORM model | Application persistence mapping | ORM validation plus database execution | Partial indexes, triggers, or older migrations |
| OpenAPI 3.1 schema | API request and response contract | Only when gateway or application validates it | Internal storage and cross-row rules |
| TypeScript type | Compile-time program shape | Types are erased from emitted JavaScript | Length, pattern, uniqueness, and database behavior |

The assigned repository reference turns this into a practical priority: DDL or migrations, ORM, API schema at its boundary, then language types. "Priority" does not mean lower layers can be discarded. It means generation follows the enforcing layer while the mismatch is recorded for correction.

For example, suppose OpenAPI allows a 100-character display name, the ORM declares 80, and the database column accepts 50. A valid persisted factory default must fit 50. Boundary tests should still send lengths 50, 51, 80, 81, 100, and 101 to reveal where the public contract and actual storage diverge.

That is the central **schema authority test data** principle: choose the authority for one operation and keep contradictory claims visible. A generator that simply intersects every schema can hide an API promise the service cannot honor.

## Use an Operation-Specific Authority Order

Authority depends partly on the operation under test. For a direct database insert, SQL is final. For an HTTP request rejected before persistence, OpenAPI and implementation validation describe the boundary, although successful requests must still satisfy storage constraints.

Use this decision procedure:

1. Name the operation: create request, patch request, direct insert, domain object construction, or response serialization.
2. Inventory every declaration that applies to each field, including migrations and indexes.
3. Identify the component that executes first and the component that ultimately enforces stored state.
4. Generate valid defaults from the strictest applicable runtime authority without erasing broader promises.
5. Create conflict cases that show where declarations disagree, then assign an owner for correction.

The order remains useful because stored data cannot bypass the database's active constraints. PostgreSQL's [constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) explains that violating writes raise errors and covers check, not-null, unique, primary-key, foreign-key, and exclusion constraints. Those rules govern persistence even when upstream declarations are looser.

OpenAPI has authority over a documented API contract, not over all internal rows. The [OpenAPI 3.1 specification](https://spec.openapis.org/oas/v3.1.0) defines Schema Objects using JSON Schema Draft 2020-12 vocabularies and supports types, formats, required properties, composition, and other constraints. Whether an application enforces that description at runtime remains an implementation concern.

TypeScript is valuable for catching incompatible program operations, but it cannot enforce persisted values after compilation. The official [TypeScript introduction](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch) states that types are erased when JavaScript is produced and do not change runtime behavior. Therefore, a TypeScript interface alone cannot prove an API payload or database row is valid.

Document intentional boundary differences explicitly. A generated database field can be absent from a create request because the database supplies a default. A response can expose a computed property that is not stored. The authority map should describe these transformations instead of forcing one universal object shape.

## Inventory Constraints Before Choosing a Winner

Do not resolve conflicts from memory. Read current migrations, the effective database schema, ORM definitions, OpenAPI components and operation schemas, runtime validators, and TypeScript types. Include generated files only after locating their authoritative input.

Build one row per entity field. Record type, requiredness, nullability, lengths, numeric bounds, enum members, format, default, uniqueness, relation, check expression, generation source, and ownership. A blank cell means unknown, not unconstrained.

| Field property | DDL evidence | ORM evidence | API evidence | Type evidence | Resolution question |
| --- | --- | --- | --- | --- | --- |
| Requiredness | \`NOT NULL\` | \`notNull()\` | In operation \`required\` list | Missing \`?\` | Required for which operation? |
| Length | \`varchar(50)\` | \`varchar(80)\` | \`maxLength: 100\` | \`string\` | Which values are promised and storable? |
| Enum | Check or enum type | Model enum | Schema \`enum\` | String union | Are member sets synchronized? |
| Uniqueness | Unique index | ORM unique flag | Usually undocumented behavior | Not expressible | What collision scope applies? |
| Relation | Foreign key and delete action | Relation mapping | Identifier format only | Branded or plain ID | What parent and lifecycle are required? |
| Default | Database expression | ORM default | Optional plus documented default | Optional property | Which component supplies it? |

Inventory the deployed migration chain, not only a desired schema snapshot. A model may have been edited without a migration, or an old migration may contain a partial unique index absent from generated ORM metadata. The database remains capable of enforcing what the application forgot.

Use direct catalog inspection in controlled test environments when migration history and current state may differ. Compare the result with version-controlled declarations and report drift. Never point exploratory generation or destructive constraint tests at production.

The [database testing automation guide](/blog/database-testing-automation-guide) can organize constraint checks after this inventory. The [OpenAPI test suite generation guide](/blog/openapi-spec-to-test-suite-generation) helps exercise request contracts, but its generated cases still need database-aware expected outcomes.

## Resolve DDL and ORM Conflicts

When DDL and ORM disagree about stored data, generate persistence-valid defaults from active database constraints and open a mapping defect. Do not weaken the database or teach the factory to retry random values until an insert succeeds. Deterministic failures are more useful than accidental compatibility.

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

The type adds \`pending\`, which the database check rejects. It also says nothing about the email length or uniqueness. A factory should default to \`active\`, construct reserved-domain unique emails no longer than 120 characters, omit \`created_at\` when testing the database default, and use an existing sponsor when that relation is present.

The generator should also emit a targeted \`pending\` case that proves the conflict. If the product intends the new status, the fix may be an additive migration deployed before application writes it. If the type is wrong, remove the member. The test should not decide product policy.

PostgreSQL notes that check expressions pass when they evaluate to true or null, so a separate \`NOT NULL\` constraint is needed when null must be rejected. This detail matters when translating checks into negative cases. A generator must read the complete column declaration rather than treating one expression as every rule.

Foreign keys add ordering and cleanup semantics. Insert parent rows before children, return actual identifiers, and test the configured delete action. A relation marked optional in TypeScript still needs a valid parent whenever a non-null identifier is supplied.

The **schema authority test data** result should name both the chosen valid default and the unresolved mismatch. That report makes a future schema change break one mapping row and factory rather than dozens of copied fixtures.

## Keep API Authority at the Request Boundary

OpenAPI describes externally visible request and response shapes. Its rules can intentionally differ by operation, especially between create, replace, patch, and response schemas. Generate API tests from the operation actually called instead of one shared domain interface.

Suppose the create request requires \`email\` and \`status\`, while the database supplies \`id\` and \`created_at\`. The API factory should omit database-generated fields unless the contract accepts them. After success, response assertions and database checks can verify the generated values.


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

This schema aligns with the table on status membership and email length, but it still does not describe database uniqueness. Generate duplicate-email tests from DDL evidence and assert the API's documented error behavior. If that error contract is absent, record another gap rather than inventing a status code.

OpenAPI \`format\` can carry semantic detail, but the specification leaves some behavior to consuming applications. Verify the validator or application path your service actually uses. A schema file without runtime integration is documentation and generation input, not proof of rejection.

\`required\` is object-level in JSON Schema vocabularies. It identifies property names that must appear; nullability depends on allowed types. Do not translate "not required" into "nullable" or treat \`null\`, an absent key, and JavaScript \`undefined\` as interchangeable.

The [OpenAPI specification to test suite guide](/blog/openapi-spec-to-test-suite-generation) can generate request-boundary cases. Connect those cases to the [constraint field map guide](/blog/constraint-field-map-before-test-data-generation) so storage-only uniqueness, checks, foreign keys, defaults, and generated columns are not lost.

## Treat TypeScript as Compile-Time Evidence

TypeScript types express developer intent and improve factory ergonomics, but their constraints disappear from emitted JavaScript. Use them to shape builders and variants while tracing runtime acceptance to validators, API handlers, ORM behavior, and DDL.

A plain \`string\` does not reveal database length, pattern, collation, or uniqueness. An optional property does not establish whether a JSON request may omit it, set it to null, or send it as undefined. A union can list business states, but the database or API may have a different deployed set.

Branded types such as \`UserId\` can reduce accidental identifier mixing during compilation. Generate them through the repository's constructor when one exists, because that path may validate format. Still inspect the database foreign key and API format before claiming the value is valid at runtime.

| TypeScript construct | Useful factory signal | Missing runtime question |
| --- | --- | --- |
| \`string\` | Produce text | What bounds, patterns, and normalization apply? |
| \`status: 'a' | 'b'\` | Create intent-named variants | Do deployed API and DDL accept both? |
| \`field?: string\` | Builder may omit field | Is null accepted, and who supplies a default? |
| \`UserId\` brand | Avoid mixing identifiers in code | Does referenced row exist? |
| \`Date\` | Builder expects a date object | Which wire format and database zone apply? |
| \`Partial<T>\` override | Express test intent | Which final fields remain required? |

Avoid deriving negative cases only by defeating TypeScript with \`as unknown as T\`. That can be useful at a boundary, but it should be driven by a named schema constraint. Otherwise, the test merely proves JavaScript can receive unexpected values, which is already known.

Keep unsafe values outside valid factory return types when possible. A valid builder can return \`NewCustomerAccount\`, while a boundary-case function returns serialized request data or SQL parameters expected to fail. This separation prevents invalid fixtures from leaking into unrelated tests.

The assigned skill prioritizes deterministic output, fixed clocks, worker-aware uniqueness, and explicit overrides. TypeScript makes those builders convenient, while the authority map keeps their defaults honest.

## Turn Every Conflict Into a Testable Finding

A conflict record should identify entity, field, operation, declarations, selected authority, generated cases, owner, and desired resolution. Avoid a generic note such as "schemas differ." Reviewers need the exact values each layer accepts.


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

Do not invent an owner in automated output. Resolve ownership from committed repository rules or leave it unassigned for human triage. The important technical behavior is that generation does not proceed silently when an authoritative field remains ambiguous.

Conflict tests should assert the exact boundary that rejects the value and confirm no partial write remains. For a request accepted by validation but rejected by SQL, assert the service error according to its documented contract and verify the table did not gain a row.

Keep known conflicts visible until declarations align. Marking them as expected failures can be appropriate when repository policy allows it, but the issue and expiry should remain explicit. A permanently ignored mismatch becomes undocumented product behavior.

The release side matters when resolving a conflict changes migrations or public schemas. Use [binding release evidence to HEAD](/blog/bind-release-evidence-to-head-sha) so migration, generated cases, and test results identify one commit. Apply the [maximum diff size release review](/blog/max-diff-lines-release-analysis-gate) when synchronized schema updates create large generated diffs.

The [human control boundary](/blog/ai-release-guardian-human-control-boundary) also applies: the generator can recommend authority based on runtime enforcement, but a schema owner decides whether the API, ORM, or database declaration should change.

## Resolve Defaults, Computed Fields, and Transformations

**Schema authority test data** decisions become harder when values change between request and storage. An API may accept a local date, application code may normalize it, and the database may store a timestamp. Map each transformation rather than selecting one representation for every test.

Defaults need an owner. A database \`DEFAULT now()\` is tested by omitting the column during insert and observing the stored value. An application default is tested by calling the application boundary without the field, while an OpenAPI default describes contract behavior consumed according to the service's implementation.

Do not have the factory populate every default automatically. Doing so can prevent tests from exercising the component responsible for supplying it. Maintain separate builders for direct persistence, API requests, and expected responses when their writable fields differ.

| Value behavior | Authority question | Generation approach |
| --- | --- | --- |
| Database default | Does SQL fill an omitted column? | Omit in direct insert and assert returned row |
| Application normalization | Which input forms become one stored form? | Generate documented inputs and assert canonical output |
| Generated column | Which base fields determine its value? | Write base fields only and assert derived value |
| Response-only property | Which service calculation supplies it? | Exclude from request and assert response contract |
| Trigger-managed audit field | Which operation changes it? | Avoid direct writes and test trigger behavior |
| ORM serialization | Which runtime value reaches SQL? | Observe parameters or persisted row at integration boundary |

Computed and generated fields should not appear as ordinary factory overrides unless the operation explicitly allows writing them. An override that bypasses their producer can create impossible states in tests. If low-level corruption testing needs such a state, place it in a clearly named administrative fixture with separate authorization.

The **schema authority test data** map should record both wire and storage formats. A UUID may remain text across the API while the database uses a native UUID type. A decimal may arrive as a JSON number or string depending on the contract, then become an exact database numeric value.

Transformations can also reject values that individual schemas appear to allow. Record runtime validator and mapper locations beside DDL, OpenAPI, ORM, and TypeScript evidence. A hidden trim, lowercase, or timezone conversion is part of observed behavior and may indicate missing contract documentation.

## Preserve Authority During Schema Evolution

A **schema authority test data** rule must account for deployment order. During an additive migration, old and new application versions can coexist against one database. Valid test data should cover the compatibility interval, not only the final desired model.

For a new nullable column, first deploy storage that accepts old writes. Then deploy application code that understands the field, activate writes when planned, backfill existing rows if required, and tighten constraints only after old writers are gone. Each phase has a different effective contract and deserves its own revision identity.

Enum evolution illustrates the risk. Adding a TypeScript member before the database accepts it creates application values that fail on write. Adding a database member first may be safe for storage, but old readers can still mishandle rows containing it. Tests should exercise writer and reader combinations supported during rollout.

Use an evolution matrix:

| Phase | Database capability | Application capability | Required data cases |
| --- | --- | --- | --- |
| Before migration | Old fields and constraints | Old reads and writes | Existing valid and rejected values |
| Additive storage | Old plus compatible new shape | Old application still deployed | Old writes remain valid |
| New application | Compatible new shape | New reads, optional new writes | Both old and new representations |
| Backfill | Target shape with mixed rows | Readers tolerate transition | Missing and populated field states |
| Constraint tightening | Final enforced shape | Old writers removed | New boundary and rollback cases |

Do not resolve transition conflicts by declaring the newest file authoritative everywhere. A migration committed at HEAD may not yet be deployed to the environment under test, while a production database may be ahead of a local snapshot during staged rollout. Record environment schema revision and compare it with test expectations.

The **schema authority test data** report should distinguish desired authority from active authority. Desired authority guides planned fixes; active authority determines what the current database and service enforce. Conflating them produces tests that pass only after all deployment phases finish.

Rollback planning needs the same precision. If new code writes values old code cannot read, rolling back binaries does not restore compatibility. Generate a case containing the new value, run the supported old reader where policy requires it, and record whether rollout must pause before writes activate.

Link generated datasets to migration and application SHAs. A dataset valid for one phase can become invalid after a constraint tightens, so retaining only a seed is insufficient. Preserve seed, map revision, schema revision, and operation version together.

Finally, use **schema authority test data** findings as release evidence. The release guardian can classify a data-shape change as high risk, verify migration notes and tests, and recommend NO-GO when transition behavior is unknown. A human schema owner still decides the intended rollout contract.

## Apply Authority to Deterministic Generation

Once conflicts are mapped, create a boring valid default from the applicable authority. Add boundary and negative cases mechanically: length at maximum minus one, maximum, and maximum plus one; numeric minimum and adjacent values; every enum member and a non-member; null, absent, and undefined where relevant.

For unique fields, derive worker and sequence identifiers rather than trusting random collision avoidance. For time, use a fixed clock unless the specific test verifies a database default. For relations, insert top-down and return created identifiers instead of predicting sequence values.

Record the schema revision, generator seed, and conflict-map version with generated datasets. These values make failures reproducible and prevent a dataset created under an old schema from being treated as current evidence.

Keep production rows out of this process. The Secure Test Data Engineer works from schema shapes and, when approved, locally derived aggregate statistics. It never needs copied customer records to learn that a field is unique, bounded, nullable, or related.

Make **schema authority test data** review concrete by applying the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to one entity with DDL, ORM, OpenAPI, and TypeScript declarations. Publish its field conflicts, fix or assign each one, then generate deterministic valid and negative cases from the reviewed map.

## Frequently Asked Questions

### Does DDL always override OpenAPI for every test?

No. DDL is authoritative for persisted state, while OpenAPI describes the API request and response boundary. A create request may be stricter than a nullable table, and a response may contain computed fields. Name the operation, apply the enforcing layer, and report disagreements rather than forcing one shape everywhere.

### What if the ORM is stricter than the database?

Generate application-path defaults that satisfy the ORM, then test whether the stricter rule is intended and documented. Direct database tests still follow DDL. Record the difference because another writer can bypass the ORM, and future schema changes may expose assumptions hidden only in application validation.

### Why are TypeScript types last in the priority order?

TypeScript erases types when producing JavaScript, so the declarations do not enforce runtime values by themselves. They remain useful evidence of developer intent and factory shape. Runtime validators, API contracts, ORM behavior, and database constraints determine what requests and stored rows actually accept or reject.

### Should a generator use the strictest value shared by all schemas?

Use shared valid values for routine defaults, but do not stop there. Intersecting schemas can hide a broken public promise or undeployed enum member. Generate conflict cases around each boundary, record which component rejects them, and assign the declaration mismatch for explicit resolution.

### How should nullable, optional, and absent values be tested?

Treat them as separate cases. A nullable database column may accept SQL null, an optional API property may be absent, and JavaScript undefined may disappear during serialization. Derive expected behavior from each operation schema and persistence rule, then verify rejection or defaults at the actual boundary.

### Can generated ORM files be the source of truth?

Only when their upstream authority and deployment state are understood. If they are generated from current DDL, inspect that relationship and regeneration result. If migrations and generated models disagree, active database constraints govern persistence, while the mismatch remains a finding that generation must not conceal.

### Who decides which conflicting schema should change?

The accountable schema or service owner decides product intent. The test-data agent can identify runtime authority, produce examples, and show the consequences of each declaration. It should not silently edit contracts, weaken constraints, or declare an undocumented behavior correct merely because one layer currently enforces it.
`,
};
