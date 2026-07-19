import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Data Constraint Field Map Guide',
  description:
    'Build a test data constraint field map from DDL, OpenAPI, ORM, and TypeScript declarations before generating deterministic boundaries and negative cases.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'test data constraint field map',
  keywords: [
    'test data constraint field map',
    'schema-driven test data',
    'boundary value generation',
    'negative test data cases',
    'database constraint mapping',
    'OpenAPI schema test data',
    'deterministic test factories',
    'relational fixture generation',
  ],
  contentKind: 'child',
  pillarSlug: 'test-data-management-strategies',
  relatedSlugs: [
    'bind-release-evidence-to-head-sha',
    'max-diff-lines-release-analysis-gate',
    'ai-release-guardian-human-control-boundary',
    'schema-authority-ddl-orm-openapi-types-test-data',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://spec.openapis.org/oas/v3.1.0',
    'https://www.typescriptlang.org/docs/handbook/typescript-from-scratch',
  ],
  content: `A **test data constraint field map** is a reviewed table that links each field to its type, null rule, bounds, enum, format, unique rule, default, row link, and cleanup needs. Build it before you write builders. The map turns schema rules into fixed valid defaults, exact edge values, bad cases, and linked row setup without guesses.

The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) supplies the map rules used here. Place them in a [test data management strategy](/blog/test-data-management-strategies), use the [synthetic data generation guide](/blog/synthetic-test-data-generation-guide) for builder patterns, and browse [QASkills](/skills) when DB, API, or cleanup work needs a focused skill.

## Why Does Schema-Driven Test Data Need a Field Map?

A builder should not start with nice names and random numbers. It should start with declared constraints and a clear source choice. The map becomes a short contract shared by schema owners, test authors, builder code, reviewers, and cleanup code.

One row per field is often enough. Compound constraints, partial indexes, and cross-field checks need linked rows or table-level entries. The goal is not to copy each schema file, but to keep each rule that changes built data or the expected failure.

| Map column | Question it answers | Generation effect |
| --- | --- | --- |
| Type | What value family is allowed? | Select string, number, object, array, or identifier builder |
| Required and nullable | Must a key exist, and may its value be null? | Create valid, absent, null, and undefined cases separately |
| Bounds | What minimum, maximum, length, or precision applies? | Derive adjacent boundary values |
| Enum or pattern | Which members or text shapes are accepted? | Generate each member and near-miss values |
| Unique rule | What collision scope is forbidden? | Add worker-sequence defaults and duplicate cases |
| Relation | Which parent or delete action applies? | Insert top-down and test cascade or restriction |
| Default or generated value | Who supplies the field? | Omit the value at the owning boundary and assert that the database, application, or factory produces it |
| Provenance | Which declaration supplied the rule? | Recheck when schema revision changes |

The **test data constraint field map** also catches silent schema drift. If a migration narrows a column but the map keeps the old length, its source check should fail before builders run. That one failure is clearer than many builders suddenly getting DB errors.

Keep valid defaults plain on purpose. Boundary and invalid values belong in named cases, not random output that may hit an edge by chance. A test name or override should tell the reader why each value exists.

The map is evidence, not a replacement for the authoritative schema declarations. Each row should point to a migration, model field, OpenAPI part and path, run-time checker, or type rule. Reviewers can then trace a built case back to a rule that acts on the value.

## Which Sources Support Database Constraint Mapping?

Start with a repository search before you open a builder file. Find migrations and DDL, ORM schemas, OpenAPI or JSON Schema documents, run-time validators, TypeScript or Pydantic models, and the current database setup. Find generated files and the source inputs that produced them.

Use this ordered procedure:

1. Choose one entity and list the create, update, response, and direct database operations under test.
2. Read active DDL and migrations, including indexes, checks, foreign keys, defaults, triggers, and generated columns.
3. Read ORM mappings and runtime validators used by those operations.
4. Read OpenAPI operation schemas, resolving references and request-specific required fields.
5. Read language types for builder ergonomics and intent, then record every cross-layer conflict.
6. Publish the first field map for schema-owner review before generating any dataset.

Authority depends on the operation: use DDL for stored-state constraints, API schemas and runtime validators at request boundaries, ORM rules on persistence paths, and language types for compile-time intent. The [schema authority guide](/blog/schema-authority-ddl-orm-openapi-types-test-data) shows how to record conflicts without hiding either contract.

PostgreSQL's [constraint reference](https://www.postgresql.org/docs/current/ddl-constraints.html) covers check, not-null, unique, primary-key, foreign-key, and exclusion rules. DDL can hold behavior missing from an ORM view, such as delete actions and compound unique rules.

The [OpenAPI 3.1 specification](https://spec.openapis.org/oas/v3.1.0) bases Schema Objects on JSON Schema Draft 2020-12 terms. Request schemas can add required keys, number bounds, lengths, patterns, enums, composition, and formats. Map each rule to its request path instead of using one part for all request shapes.

TypeScript adds build-time shape, but the [official TypeScript introduction](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch) says types are erased from built JavaScript. A \`string\` type can guide a builder signature, yet the map must find run-time length and format rules elsewhere.

## How Should You Store OpenAPI Schema Test Data Rules?

A Markdown table works for a small record, while YAML or JSON is easier for builders and checks. Keep one main form instead of editing docs and tool input on their own. Render a table from tool data when reviewers prefer that view.

This TypeScript shape records constraints and sources from which builders derive valid defaults and boundary cases. The types also make missing facts clear during review:


\`\`\`ts
type ConstraintSource = {
  layer: 'ddl' | 'orm' | 'openapi' | 'runtime' | 'typescript';
  location: string;
};

type FieldConstraint = {
  field: string;
  valueType: 'string' | 'integer' | 'decimal' | 'uuid' | 'date-time';
  operations: Record<
    string,
    { required: boolean; nullable: boolean; readOnly?: boolean }
  >;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  enumValues?: string[];
  pattern?: string;
  format?: string;
  unique?: boolean;
  references?: {
    entity: string;
    field: string;
    onDelete: 'cascade' | 'restrict' | 'no-action' | 'set-null' | 'set-default';
  };
  defaultProvider?: 'database' | 'application' | 'factory';
  sources: ConstraintSource[];
  conflicts: string[];
};
\`\`\`

Do not force each DB feature into an optional field value. Composite keys, partial indexes, cross-field checks, tagged unions, and triggers belong in table-level rules. Link them to the fields they use so builders can coordinate each case.

Show unknown values in a clear way. For example, \`unique: undefined\` means no one has proved the unique rule. \`unique: false\` means no single-field unique rule was found for that scope; table-level constraints may still limit duplicates. The builder should stop or ask when an unknown fact can change correctness.

Include request scope. A field can be required on create, optional on patch, read-only in both, and always present in a response. One global \`required\` flag would merge those distinct contracts and create false cases.

Store the schema commit or source digest with the map. When migrations, OpenAPI, or model files change, a pre-build check can find rows that need review. Do not update source links in silence while leaving old derived cases unchanged.

## How Does Boundary Value Generation Map Each Rule?

Rule-based mapping cuts guesswork. Each constraint yields a known valid default, edge set, bad set, and sometimes a linked-row case. The source guide gives mappings for OpenAPI, SQL DDL, and code types.

| Schema construct | Valid default | Boundary cases | Negative or behavior cases |
| --- | --- | --- | --- |
| \`maxLength: N\` | Stable text near half length | N-1, N, N+1, empty | Number, null, array when disallowed |
| Integer minimum and maximum | Fixed midpoint | min-1, min, max, max+1 | String digits and fractional value |
| Enum | First documented member | Every member | Non-member and casing variant |
| Required property | Present with valid value | Not applicable | Absent, null, undefined as distinct inputs |
| \`NOT NULL\` | Non-null valid value | Not applicable | Explicit SQL null |
| Unique index | Worker and sequence value | Duplicate across controlled scopes | In-batch and cross-transaction duplicate |
| Foreign key | Existing parent identifier | Parent at lifecycle edge | Missing, deleted, or wrong-entity identifier |
| Database default | Omit field | Explicit legal override when allowed | Assert database fills omitted field |
| Decimal precision and scale | Fixed exact decimal | Maximum precision and scale edge | Extra scale, overflow, disallowed negative |

Do not copy sample values from docs into each test. Samples show shape but may miss edges, unique rules, or reserved test names. Derive each case from the constraint values stored in the map.

Patterns need one short match and one near miss that changes a useful character. Avoid a broad regex-to-text tool unless the repo needs one, since reviewed field builders are easier to explain. Record any pattern you cannot support and stop instead of returning random text.

Composition needs cases named by intent. For \`oneOf\` or a tag field, make one valid builder for each branch. Then add mixed-branch and unknown-tag bad cases where the contract defines rejection, rather than one object that may match several branches.

A **test data constraint field map** should name the expected failure at the right edge. A DDL-only unique clash may surface through an API error mapper, while an OpenAPI type error may never reach SQL. Tests should assert both the public result and that no partial write remains.

## How Do Deterministic Test Factories Use Safe Defaults?

Valid defaults should meet each active rule for the path. They should also stay fixed across runs, workers, time zones, and machines. Seeded tools can supply names or text, but IDs and clocks need clear control.

The builder below hardcodes defaults selected from reviewed facts instead of discovering constraints at runtime. It uses a fixed time, reserved email domain, worker ID, and sequence for repeatable unique values.


\`\`\`ts
type NewAccount = {
  email: string;
  displayName: string;
  role: 'member' | 'admin';
  createdAt: Date;
};

let sequence = 0;

export function buildAccount(
  overrides: Partial<NewAccount> = {},
  workerId = process.env.TEST_WORKER_ID ?? '0',
): NewAccount {
  sequence += 1;
  return {
    email: 'account-' + workerId + '-' + sequence + '@example.test',
    displayName: 'Test Account ' + sequence,
    role: 'member',
    createdAt: new Date('2026-01-15T00:00:00Z'),
    ...overrides,
  };
}
\`\`\`

The map must justify each field. It records email format, max length, and unique scope, plus display-name bounds, role values, and clock owner. If the DB should supply \`created_at\`, a direct-insert builder should omit it instead of copying the API builder.

Overrides show test intent. \`buildAccount({ role: 'admin' })\` is clearer than a random role that may test admin behavior by chance. Keep defaults valid and plain so each test controls the behavior it owns.

Reset or prefix sequences based on suite isolation. Repeatable data does not mean each worker inserts the same unique value. A worker ID and fixed sequence make repeatable values without clashes under the stated run model.

Do not use the wall clock for normal defaults. A fixed clock makes month-end, daylight-saving, and expiry behavior clear. Tests for DB \`DEFAULT now()\` should omit the field and assert within a set time window instead of claiming a builder time proves the default.

## How Should Negative Test Data Cases Define Failure?

Each built bad value needs an oracle. "Request did not succeed" is too weak because a server error, timeout, or unrelated auth failure could make it true. Record the expected status or error shape, safe constraint name when exposed, and a no-partial-write check.

For a max length N, build N-1, N, and N+1 characters, plus empty and one-character values when a min matters. For an integer min of zero, use -1, 0, 1, a fraction, and the set max. The exact set should come from the map, not one list pasted into each field.

Null rules need three distinct JavaScript or JSON cases: missing key, explicit null, and undefined before JSON is serialized. Undefined often vanishes from JSON objects, so inspect the sent body when that difference matters. Direct SQL values behave differently and need their own case.

For enum fields, test each member as a valid branch. Add a case-variant value and a non-member as bad values when the contract cares about case. Do not invent a fallback enum value unless the schema defines one.

Use a structured case generator:


\`\`\`ts
type GeneratedCase = {
  name: string;
  value: unknown;
  expected: 'accept' | 'reject';
  source: string;
};

export function maxLengthCases(field: string, maximum: number): GeneratedCase[] {
  const text = (length: number) => 'x'.repeat(Math.max(0, length));
  const cases: GeneratedCase[] = [
    { name: field + '-at-max', value: text(maximum), expected: 'accept', source: 'maxLength' },
    { name: field + '-above-max', value: text(maximum + 1), expected: 'reject', source: 'maxLength' },
  ];
  if (maximum > 0) {
    cases.unshift({
      name: field + '-below-max',
      value: text(maximum - 1),
      expected: 'accept',
      source: 'maxLength',
    });
  }
  return cases;
}
\`\`\`

This function does not decide whether empty text is valid because \`maxLength\` gives no min. Another map row must add that case. Keeping each rule narrow stops a helper from claiming constraints that do not exist.

The [OpenAPI test generation guide](/blog/openapi-spec-to-test-suite-generation) can run API cases, while the [database automation guide](/blog/database-testing-automation-guide) covers direct DB checks. The field map links their values and keeps an oracle for each edge.

## How Does Relational Fixture Generation Handle Cleanup?

Field rows alone are not enough for linked data. Unique indexes, foreign keys, delete actions, composite keys, and run-tag cleanup use several rows or columns. Add case-level rules that state build order and cleanup ownership.

For a foreign key, build a real parent, a missing ID, a deleted parent when setup rules allow it, and an ID from the wrong table. Insert valid cases from parent to child and return real IDs. Never guess a sequence or make a parent ID that may exist in one test setup.

For \`ON DELETE CASCADE\`, delete the parent and assert its children are gone. For \`ON DELETE RESTRICT\`, assert the DB blocks deletion while children exist. PostgreSQL defines foreign keys as links between related rows, so the map should keep the configured \`ON DELETE\` action instead of guessing cleanup behavior.

A unique rule needs at least one duplicate in a batch and one across requests or database transactions. Partial unique indexes also need cases inside and outside their filter. For a compound rule, vary each column on its own to prove which set clashes.

| Relational rule | Setup order | Core assertion | Cleanup concern |
| --- | --- | --- | --- |
| Foreign key | Parent, then child | Missing parent rejected | Delete child before restricted parent |
| Cascade delete | Parent, then children | Parent deletion removes children | Verify zero owned rows remain |
| Restrict delete | Parent, then children | Parent deletion rejected | Remove children before parent |
| Composite unique | First row, then controlled variants | Only duplicate combination rejected | Delete all rows by run tag |
| Generated identifier | Insert without ID where supported | Returned ID is present and usable | Track actual ID, never predicted value |

Choose cleanup while you design the data. A transactional rollback can clean up only writes made in the same transaction. Shared test setups often need a \`test_run_id\` on each insert, then a residue query that fails when owned rows remain.

Never delete by a broad pattern or shared label. Return IDs and run tags from case builders, then remove only owned rows in link order. Cleanup success is part of the test oracle, not best-effort housekeeping.

## How Do You Check the Map Before Building Cases?

A **test data constraint field map** can contain mistakes, so validate its structure and internal consistency before using it. Machine checks should reject impossible combinations, missing provenance, unknown authority for required decisions, and operation scopes that reference no reviewed schema.

Basic validation can confirm that minimum does not exceed maximum, \`minLength\` does not exceed \`maxLength\`, enum lists are nonempty and distinct, and referenced fields exist. It can also require every conflict to carry a description and owner status, without inventing the owner.

Semantic validation needs schema-aware checks. A field marked non-null in the map should cite the active DDL or an operation-specific runtime rule. A unique field should cite the index or constraint, including predicate and column combination when uniqueness is partial or composite.

| Validation rule | Why it matters | Failure action |
| --- | --- | --- |
| Every constraint has provenance | Generated values remain traceable | Stop and locate original declaration |
| Bounds are internally consistent | Boundary generator can produce meaningful values | Reject the map row |
| Operation scope is explicit | Create, patch, response, and SQL rules stay separate | Require scope review |
| Relations target known entities | Scenario ordering can be planned | Add related map or mark blocked |
| Unknown safety fields stop generation | Uniqueness and cleanup are not guessed | Ask schema owner |
| Conflicts remain visible | Intersections do not hide broken contracts | Generate conflict case and assign review |

Compare map provenance with repository changes. If a cited migration, OpenAPI component, model, validator, or type changes, mark linked rows stale. A stale row should block affected generation until reviewed, while unrelated entity maps can remain usable.

Do not make schema parsing the only validation source. Parsers can discover declarations, but owners still need to classify operation scope, intentional differences, cleanup ownership, and desired conflict resolution. Generated maps should enter review as proposals.

Test the validator with fixtures for contradictory bounds, missing source locations, duplicated enum members, dangling relations, partial indexes, and unresolved required fields. The **test data constraint field map** must fail predictably before any factory emits misleading data.

Store validator version and map digest with generated output. When a case fails, reviewers can reconstruct not only its seed but also the exact rules and validation logic that produced it.

## How Do Map Rows Become a Coverage Matrix?

The **test data constraint field map** becomes useful when every rule links to at least one valid or rejecting case. Build a coverage matrix from map rows, generated case names, execution boundary, and result. Missing coverage then appears as an explicit cell rather than an intuition.

One field may require several test locations. OpenAPI type and requiredness belong at the HTTP boundary, uniqueness may require integration with the database, and foreign-key delete behavior needs a relational database scenario. Do not force all constraints through an end-to-end suite when a narrower boundary gives a clearer oracle.

| Constraint class | Preferred first boundary | Minimum evidence |
| --- | --- | --- |
| Request type or required key | API validator or route | Accepted valid payload and exact rejected payload |
| Database check or not-null | Persistence integration | Passing insert and smallest failing insert |
| Unique constraint | Persistence plus service error mapping | Duplicate within declared scopes and no partial write |
| Foreign key | Relational integration | Valid parent, missing parent, configured delete action |
| TypeScript union | Unit builder plus runtime boundary | Variant builders and deployed schema comparison |
| Cleanup run tag | Fixture teardown | Zero residue assertion for the current run |

Name cases deterministically from entity, field, constraint, boundary position, and expected result. A failure such as \`account.email.maxLength.above.reject\` tells reviewers which map row to inspect. Random case names or opaque generated IDs slow triage.

Track valid-member coverage for enums and discriminated unions. Testing only the default member leaves branch-specific behavior unproved. Also track negative-member coverage, casing behavior, and mixed-branch objects when those rules exist in the reviewed schema.

Use this procedure when generating the matrix:

1. Expand each field and entity constraint into its mechanically required case set.
2. Assign every case to the earliest boundary that can enforce the rule accurately.
3. Link the case to test code, schema provenance, seed, and expected oracle.
4. Execute cases against the schema revision named by the map.
5. Fail review when a required map row has no case or a case lacks a result.

Coverage counts should not become a quality percentage without context. One missing authorization-related relation case can matter more than many covered string lengths. Preserve risk labels and exact uncovered constraints so a human can prioritize repairs.

When a case reveals that observed behavior differs from the map, do not update expected output automatically. Recheck the active schema, environment revision, and operation path. The result may expose drift, an implementation bug, or an incorrect authority decision.

Reviewing this matrix closes the loop: declaration produces map row, map row produces case, case produces evidence, and evidence identifies one schema revision. That trace is the practical value of a **test data constraint field map**.

## How Do You Keep the Map Safe and Current?

The map contains schema shapes, not production records. That is enough to derive constraints, valid examples, and negative cases. Use reserved namespaces such as \`@example.test\` for email and documented test identifiers for external payment systems.

Record seed, schema revision, field-map revision, and generator version with each dataset. A failure report should identify the exact inputs needed to reproduce rows byte-for-byte. Random output without a recorded seed makes diagnosis dependent on luck.

Add a validation job that compares map provenance with changed schema files. If a referenced migration, OpenAPI component, or ORM model changes, require review of affected rows. The job should not regenerate and approve the map invisibly because constraint intent may have changed.

Keep the first check small. Change one field bound, run the map job, and confirm it names the exact row that needs review. Then update that row and its cases in one change so the builder cannot drift from its source.

When a release includes the map and factories, [bind its evidence to the HEAD SHA](/blog/bind-release-evidence-to-head-sha). If synchronized DDL, OpenAPI, ORM, and generated output exceed review capacity, apply the [maximum diff size gate](/blog/max-diff-lines-release-analysis-gate). Keep final policy decisions under the [AI guardian human control boundary](/blog/ai-release-guardian-human-control-boundary).

Build your first **test data constraint field map** with the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Choose one high-use entity, trace every row to DDL, ORM, OpenAPI, or TypeScript, obtain schema-owner review, and only then generate deterministic valid, boundary, negative, relational, and cleanup cases.

## Frequently Asked Questions

### How many fields should one constraint map cover?

Start with one entity and the operations that create, update, return, or delete it. Add related entities when foreign keys require scenario-level rules. A focused reviewed map is more useful than a broad inventory with unknown authority, missing provenance, and factories already built from assumptions.

### Should the map be Markdown, YAML, JSON, or TypeScript?

Choose one canonical machine-readable form that your repository can validate, then render Markdown for review if needed. The format matters less than explicit operation scope, source locations, unknown values, conflicts, and revision identity. Avoid maintaining two hand-edited copies that can drift independently.

### What should happen when a constraint is unknown?

Mark it unknown and stop generation when the missing fact affects validity, uniqueness, safety, or cleanup. Read migrations, runtime validators, or ask the schema owner. Do not translate absence of evidence into "unconstrained," because that creates plausible fixtures that may fail unpredictably or violate policy.

### Can faker replace a field map?

No. A faker can provide seeded text, names, or addresses after constraints are known. It does not discover active unique indexes, foreign keys, delete actions, request-specific required fields, or precision. The map supplies those rules; the seeded generator supplies deterministic values inside them.

### How are composite and cross-field constraints represented?

Store them as entity-level entries linked to every involved field. Include the expression or key set, source location, valid combinations, smallest failing variants, and expected boundary. A single-field row cannot correctly describe composite uniqueness, price comparisons, discriminators, or conditional requiredness.

### Should invalid cases use the normal factory return type?

Usually not. Keep valid builders typed for valid application data, and generate invalid API payloads or SQL parameters through explicit boundary-case helpers. This separation prevents rejected values from leaking into unrelated tests while preserving a clear source constraint and expected oracle for each negative case.

### When must the map be reviewed again?

Review affected rows whenever migrations, DDL, ORM models, OpenAPI schemas, runtime validators, or relevant language types change. Also review when cleanup strategy, execution parallelism, or authority ownership changes. Store source revisions so automation can identify stale rows without pretending to resolve them automatically.
`,
};
