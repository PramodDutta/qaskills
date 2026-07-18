import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Map Constraints Before Generating Test Data',
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
  content: `A **test data constraint field map** is a reviewed table that connects each entity field to its type, nullability, bounds, enum, format, uniqueness, default, relation, and cleanup needs. Build it before writing factories. The map turns schema declarations into deterministic valid defaults, exact boundary values, negative cases, and relational setup without guessing.

The [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) supplies the mapping rules used here. Place them inside a [test data management strategy](/blog/test-data-management-strategies), use the [synthetic data generation guide](/blog/synthetic-test-data-generation-guide) for factory patterns, and browse [QASkills](/skills) when database, API, or cleanup work needs a focused skill.

## Make the Field Map the Generation Contract

A factory should not begin with plausible names and random numbers. It should begin with declared constraints and an explicit authority decision. The map becomes the compact contract shared by schema owners, test authors, generators, reviewers, and cleanup code.

One row per field is usually sufficient. Compound constraints, partial indexes, and cross-field checks need linked rows or entity-level entries. The goal is not to reproduce every schema file; it is to preserve every rule that changes generated data or expected rejection.

| Map column | Question it answers | Generation effect |
| --- | --- | --- |
| Type | What value family is allowed? | Select string, number, object, array, or identifier builder |
| Required and nullable | Must a key exist, and may its value be null? | Create valid, absent, null, and undefined cases separately |
| Bounds | What minimum, maximum, length, or precision applies? | Derive adjacent boundary values |
| Enum or pattern | Which members or text shapes are accepted? | Generate each member and near-miss values |
| Unique rule | What collision scope is forbidden? | Add worker-sequence defaults and duplicate cases |
| Relation | Which parent or delete action applies? | Insert top-down and test cascade or restriction |
| Default or generated value | Who supplies the field? | Omit on insert and assert produced value |
| Provenance | Which declaration supplied the rule? | Recheck when schema revision changes |

The **test data constraint field map** also prevents silent schema drift. If a migration narrows a column but the map still records the old length, its provenance check should fail before generation. That failure is clearer than dozens of factories suddenly receiving database errors.

Keep valid defaults intentionally ordinary. Boundary and negative behavior belongs in named variants, not in random output that occasionally reaches an edge. Tests should reveal why a value exists by reading the case name or override.

The map is evidence, not a substitute for the original schema. Every row should point to a migration, model field, OpenAPI component and operation, runtime validator, or type declaration. Reviewers can then trace a generated case back to an enforceable rule.

## Collect Every Applicable Schema Source

Start with repository inventory before opening a factory file. Search migrations and DDL, ORM schemas, OpenAPI or JSON Schema documents, runtime validators, TypeScript or Pydantic models, and existing database setup. Locate generated artifacts and their upstream inputs.

Use this ordered procedure:

1. Choose one entity and list the create, update, response, and direct database operations under test.
2. Read active DDL and migrations, including indexes, checks, foreign keys, defaults, triggers, and generated columns.
3. Read ORM mappings and runtime validators used by those operations.
4. Read OpenAPI operation schemas, resolving references and request-specific required fields.
5. Read language types for builder ergonomics and intent, then record every cross-layer conflict.
6. Publish the first field map for schema-owner review before generating any dataset.

The assigned reference prioritizes SQL DDL or migrations, then ORM, API schema at the request boundary, and language types. The companion [schema authority guide](/blog/schema-authority-ddl-orm-openapi-types-test-data) explains how to apply that order when declarations disagree.

PostgreSQL's [constraint reference](https://www.postgresql.org/docs/current/ddl-constraints.html) covers check, not-null, unique, primary-key, foreign-key, and exclusion constraints. These declarations can contain behavior absent from an ORM snapshot, including delete actions and compound uniqueness.

The [OpenAPI 3.1 specification](https://spec.openapis.org/oas/v3.1.0) bases Schema Objects on JSON Schema Draft 2020-12 vocabularies. Request schemas can contribute required properties, numeric bounds, lengths, patterns, enums, composition, and formats. Map them to the operation where they apply instead of treating one component as every request shape.

TypeScript contributes compile-time structure, but the [official TypeScript introduction](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch) explains that types are erased from emitted JavaScript. A \`string\` type can guide a builder signature, yet the map must find runtime length and format rules elsewhere.

## Represent Constraints in a Reviewable Format

A Markdown table works for a small entity, while YAML or JSON is easier for generation and validation. Keep one canonical representation rather than editing documentation and machine input independently. Render a table from machine data when reviewers prefer it.

This TypeScript shape preserves field-level provenance and separates valid defaults from generated boundary cases:


\`\`\`ts
type ConstraintSource = {
  layer: 'ddl' | 'orm' | 'openapi' | 'typescript';
  location: string;
};

type FieldConstraint = {
  field: string;
  valueType: 'string' | 'integer' | 'decimal' | 'uuid' | 'date-time';
  required: boolean;
  nullable: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  enumValues?: string[];
  pattern?: string;
  format?: string;
  unique?: boolean;
  references?: { entity: string; field: string; onDelete: 'cascade' | 'restrict' };
  defaultProvider?: 'database' | 'application' | 'factory';
  sources: ConstraintSource[];
  conflicts: string[];
};
\`\`\`

Do not force every database feature into optional scalar fields. Composite keys, partial indexes, cross-field checks, discriminated unions, and triggers belong in entity-level constraints. Link them to involved fields so generation can coordinate cases.

Represent unknown values explicitly. For example, \`unique: undefined\` means uniqueness has not been established, while \`unique: false\` means reviewed declarations allow duplicates. The generator should stop or ask when an unknown changes correctness.

Include operation scope. A field can be required in a create request, optional in a patch, not writable in either, and always present in a response. One global \`required\` flag would collapse those distinct contracts.

Store schema revision or source digest with the map. When migrations, OpenAPI, or model files change, a pre-generation check can identify which rows need review. Do not silently update provenance while leaving derived cases unchanged.

## Map Each Schema Construct Mechanically

Mechanical mapping reduces brainstorming bias. Every constraint yields a predictable valid default, boundary set, negative set, and sometimes a relational scenario. The assigned reference provides mappings for OpenAPI, SQL DDL, and language constructs.

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

Do not copy example values from documentation into every test. Examples illustrate shape but may not cover boundaries, uniqueness, or reserved synthetic namespaces. Derive each case from constraint values stored in the map.

Patterns need a matching minimal value and a near miss differing by one meaningful character. Avoid building a generic regex-to-string system unless the repository needs one; reviewed field-specific constructors are often easier to explain. Record any unsupported pattern and stop instead of returning arbitrary text.

Composition needs intent-named variants. For \`oneOf\` or a discriminator, create one valid builder per branch, then mixed-branch and unknown-discriminator negatives where the contract defines rejection. Do not merge all optional properties into one object that accidentally satisfies several branches.

A **test data constraint field map** should identify expected rejection at the correct boundary. A DDL-only uniqueness failure may surface through an API error adapter, while an OpenAPI type mismatch may never reach SQL. Tests should assert both the external result and absence of partial writes.

## Derive Valid Defaults and Intentional Overrides

Valid defaults should satisfy every applicable authority for the operation. They should also remain deterministic across runs, workers, time zones, and machines. Seeded generators can provide names or text, but identity and clock behavior need explicit control.

The builder below consumes reviewed facts rather than discovering constraints during execution. It uses a fixed timestamp, reserved email domain, worker identifier, and sequence for deterministic uniqueness.


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

The map must justify each field. It records email format, maximum length, and uniqueness; display-name bounds; role enum members; and timestamp ownership. If the database should supply \`created_at\`, a direct-insert builder should omit it rather than copying the API factory blindly.

Overrides express test intent. \`buildAccount({ role: 'admin' })\` is clearer than a random role that sometimes exercises privileged behavior. Keep defaults valid and boring so each test controls the behavior it owns.

Reset or namespace sequences according to suite isolation. Reproducibility does not mean every worker inserts the same unique value. The worker identifier and deterministic sequence produce repeatable values without collisions under the declared execution model.

Do not use current wall-clock time for routine defaults. A fixed clock makes month-end, daylight-saving, and expiry behavior explicit. Tests for database \`DEFAULT now()\` should omit the field and assert within a controlled time window rather than pretending a factory timestamp proves the default.

## Generate Boundaries, Negatives, and Rejection Oracles

Every generated invalid value needs an oracle. "Request did not succeed" is too weak because a server error, timeout, or unrelated authorization failure could satisfy it. Record expected status or exception shape, constraint identity when exposed appropriately, and no-partial-write assertion.

For a length maximum N, generate N-1, N, and N+1 characters alongside empty and single-character values when minimum behavior matters. For an integer minimum zero, use -1, 0, 1, a fractional input, and relevant maximum. The exact set should come from the map, not a generic list pasted into every field.

Nullability needs three distinct JavaScript or JSON cases: absent key, explicit null, and undefined before serialization. Undefined often disappears from JSON objects, so inspect the serialized payload when that distinction matters. Direct SQL parameters have different behavior and need their own case.

For enum fields, test every member as a valid branch. Add a casing variation and a non-member as negatives when the contract is case-sensitive. Do not invent a fallback enum member unless the schema defines one.

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
  return [
    { name: field + '-below-max', value: text(maximum - 1), expected: 'accept', source: 'maxLength' },
    { name: field + '-at-max', value: text(maximum), expected: 'accept', source: 'maxLength' },
    { name: field + '-above-max', value: text(maximum + 1), expected: 'reject', source: 'maxLength' },
  ];
}
\`\`\`

This function does not decide whether empty text is valid because \`maxLength\` alone provides no minimum. Another map entry must add that case. Keeping derivation narrow prevents a helper from claiming constraints that do not exist.

The [OpenAPI test generation guide](/blog/openapi-spec-to-test-suite-generation) can execute API variants, while the [database automation guide](/blog/database-testing-automation-guide) covers direct persistence assertions. The field map connects their values and preserves boundary-specific oracles.

## Model Uniqueness, Relations, and Cleanup Together

Scalar field maps are insufficient for relational data. Unique indexes, foreign keys, delete actions, composite keys, and run-tag cleanup involve several rows or columns. Add scenario-level constraints that describe creation order and teardown ownership.

For a foreign key, generate an existing parent, a missing identifier, a deleted parent where policy allows setup, and an identifier from the wrong entity type. Insert valid scenarios top-down and return created IDs. Never assume sequence numbers or fabricate a parent ID that happens to exist in one environment.

For \`ON DELETE CASCADE\`, delete the parent and assert children are removed. For \`ON DELETE RESTRICT\`, assert the database rejects deletion while children exist. PostgreSQL's constraint documentation defines foreign keys as referential integrity between related rows; the map should preserve the configured action rather than assuming cleanup behavior.

Uniqueness needs at least an in-batch duplicate and a duplicate across requests or transactions. Partial unique indexes also need cases inside and outside the predicate. Composite uniqueness requires varying each column independently to prove which combination collides.

| Relational rule | Setup order | Core assertion | Cleanup concern |
| --- | --- | --- | --- |
| Foreign key | Parent, then child | Missing parent rejected | Delete child before restricted parent |
| Cascade delete | Parent, then children | Parent deletion removes children | Verify zero owned rows remain |
| Restrict delete | Parent, then children | Parent deletion rejected | Remove children before parent |
| Composite unique | First row, then controlled variants | Only duplicate combination rejected | Delete all rows by run tag |
| Generated identifier | Insert without ID where supported | Returned ID is present and usable | Track actual ID, never predicted value |

Choose cleanup while designing the dataset. Transaction rollback works only when all operations share the transaction. Shared environments often need a \`test_run_id\` applied at every insert, followed by a residue query that fails when owned rows remain.

Never delete by broad pattern or shared label. Return identifiers and run tags from scenario builders, then remove only owned rows in dependency order. Cleanup success is part of the test oracle, not best-effort housekeeping.

## Validate the Map Before Generating Cases

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

## Turn Map Rows Into a Coverage Matrix

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

## Keep the Map Safe, Current, and Reviewable

The map contains schema shapes, not production records. That is enough to derive constraints, valid examples, and negative cases. Use reserved namespaces such as \`@example.test\` for email and documented test identifiers for external payment systems.

Record seed, schema revision, field-map revision, and generator version with each dataset. A failure report should identify the exact inputs needed to reproduce rows byte-for-byte. Random output without a recorded seed makes diagnosis dependent on luck.

Add a validation job that compares map provenance with changed schema files. If a referenced migration, OpenAPI component, or ORM model changes, require review of affected rows. The job should not regenerate and approve the map invisibly because constraint intent may have changed.

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
