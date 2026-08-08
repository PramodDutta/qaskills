import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing JSON Column Query Validation: A PostgreSQL Playbook',
  description: 'Use database testing JSON column query validation to catch type drift, missing keys, false matches, null confusion, and broken PostgreSQL JSONB indexes.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Database Testing JSON Column Query Validation: A PostgreSQL Playbook

Database testing JSON column query validation should prove three different contracts: stored documents have the required shape, SQL predicates select exactly the intended rows, and the access path remains suitable for production volume. For PostgreSQL \`jsonb\`, combine database constraints for coarse invariants, schema validation at the application boundary, fixture rows designed to distinguish similar predicates, and integration tests that execute the real query with parameters.

Do not settle for inserting one happy document and reading it back. JSON operators often return SQL \`NULL\` for a missing path instead of failing, JSON \`null\` differs from SQL \`NULL\`, text and numeric values compare differently, and containment is not the same as arbitrary path matching. Use the [database transaction isolation guide](/blog/database-testing-transaction-isolation-levels) to keep concurrent fixtures trustworthy, and connect endpoint assertions to database evidence with the [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide).

## Define the Three Contracts Before Creating Fixtures

A JSON column is flexible storage, not a schema-free promise. The application still relies on keys, value types, allowed states, array element shapes, and query semantics. Separate those concerns so failures point to a specific layer.

| Contract | Example | Strongest enforcement point | Test evidence |
|---|---|---|---|
| Document shape | \`customer.id\` is a non-empty string | Application schema plus selected DB checks | Invalid payload rejected |
| Query meaning | “paid EUR order” means currency and status match in the same document | Parameterized SQL | Positive and near-miss row IDs |
| Null policy | Missing discount differs from explicit JSON null | SQL predicate and domain rule | Both cases stored and selected separately |
| Array rule | Every item has quantity greater than zero | Application schema or DB constraint | Empty, mixed, and invalid arrays |
| Mutation rule | Patching shipping does not erase customer | Update statement | Unrelated paths unchanged |
| Performance | Containment lookup uses intended GIN index | Schema migration and plan check | Index exists and representative plan can use it |

The PostgreSQL JSON functions and operators reference is https://www.postgresql.org/docs/current/functions-json.html. It documents that extraction operators return SQL \`NULL\` when the structure does not match the requested path. That forgiving behavior is useful for heterogeneous data and dangerous for tests that never include malformed or missing paths.

## Create a Minimal Table With Coarse Database Guards

Start with constraints the database can enforce cheaply and unambiguously. Require \`jsonb\`, reject SQL \`NULL\`, require a top-level object, and establish selected keys whose type is fundamental to every consumer. Avoid reproducing an entire evolving JSON Schema as a maze of SQL checks.

\`\`\`sql
CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_payload_is_object
    CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT orders_status_is_string
    CHECK (
      payload ? 'status'
      AND jsonb_typeof(payload -> 'status') = 'string'
    ),
  CONSTRAINT orders_items_is_array
    CHECK (
      payload ? 'items'
      AND jsonb_typeof(payload -> 'items') = 'array'
    )
);
\`\`\`

This DDL intentionally does not validate every nested field. It protects assumptions shared by all queries. A document such as \`{"status": null, "items": []}\` fails the status type check because JSON null has type \`null\`, not \`string\`. A missing \`status\` fails the existence check.

Build fixtures with one valid target and one row per likely false positive:

\`\`\`sql
INSERT INTO orders (payload) VALUES
  ('{
    "status": "paid",
    "customer": {"id": "cus-7", "tier": "gold"},
    "money": {"amount": 2599, "currency": "EUR"},
    "items": [{"sku": "QA-BOOK", "quantity": 1}],
    "discount": null
  }'),
  ('{
    "status": "pending",
    "customer": {"id": "cus-7", "tier": "gold"},
    "money": {"amount": 2599, "currency": "EUR"},
    "items": [{"sku": "QA-BOOK", "quantity": 1}]
  }'),
  ('{
    "status": "paid",
    "customer": {"id": "cus-8", "tier": "silver"},
    "money": {"amount": "2599", "currency": "USD"},
    "items": [{"sku": "QA-BOOK", "quantity": 0}]
  }');
\`\`\`

The third row stores amount as a string on purpose. Production data often contains drift from older writers, imports, or manual repairs. A query test should reveal whether the SQL tolerates, rejects, or accidentally coerces that value.

## Test Extraction, Text Conversion, and Path Semantics

PostgreSQL offers operators with meaning that differs by result type. \`->\` extracts JSON, \`->>\` extracts text, \`#>\` extracts JSON at a path, and \`#>>\` extracts text at a path. Choose based on the comparison you intend.

| Operator | Input on right | Result | Example purpose |
|---|---|---|---|
| \`->\` | Key or array index | \`jsonb\` | Preserve JSON type for \`jsonb_typeof\` |
| \`->>\` | Key or array index | \`text\` | Compare scalar text at one level |
| \`#>\` | Text array path | \`jsonb\` | Extract nested object or scalar as JSON |
| \`#>>\` | Text array path | \`text\` | Compare nested scalar as text |
| \`@>\` | \`jsonb\` value | Boolean | Structural containment |
| \`?\` | Text | Boolean | Top-level key or array string existence |

A query for paid EUR orders can keep structural intent visible with containment:

\`\`\`sql
SELECT id, payload
FROM orders
WHERE payload @> '{
  "status": "paid",
  "money": {"currency": "EUR"}
}'::jsonb
ORDER BY id;
\`\`\`

An equivalent scalar extraction query is useful when values arrive as parameters:

\`\`\`sql
SELECT id, payload
FROM orders
WHERE payload ->> 'status' = $1
  AND payload #>> '{money,currency}' = $2
ORDER BY id;
\`\`\`

Both should return only the first fixture for parameters \`paid\` and \`EUR\`. Test the result IDs, not merely the row count. A wrong query might return one different row and still satisfy a count assertion.

## Distinguish Missing Keys, JSON Null, and SQL NULL

This is the most common source of false confidence. A missing path and a JSON null can both become SQL \`NULL\` through text extraction, yet they express different documents. SQL \`NULL\` for the entire column is disallowed by this table, but extracted values can still be null.

| Document state | \`payload ? 'discount'\` | \`payload -> 'discount'\` | \`payload ->> 'discount'\` |
|---|---:|---|---|
| Key missing | false | SQL \`NULL\` | SQL \`NULL\` |
| \`"discount": null\` | true | JSON \`null\` | SQL \`NULL\` |
| \`"discount": 0\` | true | JSON number \`0\` | Text \`0\` |
| \`"discount": ""\` | true | JSON string | Empty text |

Write distinct predicates for distinct domain questions:

\`\`\`sql
-- Key is absent.
SELECT id FROM orders
WHERE NOT (payload ? 'discount');

-- Key exists and its value is JSON null.
SELECT id FROM orders
WHERE payload ? 'discount'
  AND payload -> 'discount' = 'null'::jsonb;

-- Key exists and contains a numeric zero.
SELECT id FROM orders
WHERE jsonb_typeof(payload -> 'discount') = 'number'
  AND (payload ->> 'discount')::numeric = 0;
\`\`\`

Do not use \`payload ->> 'discount' IS NULL\` when the requirement specifically says “field is absent.” It matches both absent and JSON-null values. Include fixtures for both so the error cannot hide.

## Validate Types Before Casting

A cast such as \`(payload #>> '{money,amount}')::integer\` works for JSON numbers and numeric strings, but it throws for arbitrary text and quietly accepts a representation the schema may forbid. If amount must be a JSON number, test the JSON type before casting.

\`\`\`sql
SELECT id, (payload #>> '{money,amount}')::bigint AS amount_minor
FROM orders
WHERE CASE
  WHEN jsonb_typeof(payload #> '{money,amount}') = 'number'
    THEN (payload #>> '{money,amount}')::bigint >= $1
  ELSE false
END
ORDER BY id;
\`\`\`

This predicate excludes the third fixture because its amount is a JSON string. The order of SQL predicate evaluation is not a general guarantee that protects every unsafe cast in all query shapes. If legacy data can contain nonnumeric strings, clean it, enforce shape, or use a guarded expression that cannot attempt an invalid cast. Do not rely on a convenient execution plan as validation.

An audit query reveals drift before a new constraint is added:

\`\`\`sql
SELECT
  COALESCE(jsonb_typeof(payload #> '{money,amount}'), 'missing') AS amount_type,
  count(*) AS rows
FROM orders
GROUP BY 1
ORDER BY 1;
\`\`\`

Run this against a production snapshot through an approved read-only process. A migration that assumes every historic document already follows today's application schema can fail during deployment or, worse, change query results without an obvious error.

## Prove Array Predicates With Mixed Elements

Array tests need empty, one-element, multi-element, and mixed-validity fixtures. “At least one item has positive quantity” differs from “every item has positive quantity.” An empty array also makes universal conditions tricky, because “no invalid elements exist” is logically true unless the query separately requires a nonempty array.

| Requirement | SQL shape | Empty array result |
|---|---|---|
| At least one positive item | \`EXISTS\` over expanded elements | false |
| No nonpositive item | \`NOT EXISTS\` invalid element | true |
| Every item positive and at least one item | Length check plus \`NOT EXISTS\` | false |
| A SKU exists anywhere | Containment or element \`EXISTS\` | false |

This query selects orders with a nonempty items array where every element has numeric quantity greater than zero:

\`\`\`sql
SELECT o.id
FROM orders AS o
WHERE jsonb_array_length(o.payload -> 'items') > 0
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(o.payload -> 'items') AS item(value)
    WHERE CASE
      WHEN jsonb_typeof(item.value -> 'quantity') = 'number'
        THEN (item.value ->> 'quantity')::numeric <= 0
      ELSE true
    END
  )
ORDER BY o.id;
\`\`\`

The table constraint guarantees \`items\` is an array, so \`jsonb_array_length\` and \`jsonb_array_elements\` are safe for rows in this table. Without that constraint, the query would need a guarded design or a cleanup migration.

For existence, containment is concise:

\`\`\`sql
SELECT id
FROM orders
WHERE payload -> 'items' @> '[{"sku": "QA-BOOK"}]'::jsonb
ORDER BY id;
\`\`\`

Containment asks whether the JSON structure contains the specified structure. It does not require the array element to equal only that object, so an item with additional keys still matches, which is usually desirable.

## Use JSONPath for Expressive Nested Conditions

PostgreSQL implements SQL/JSON path expressions through the \`jsonpath\` type. \`jsonb_path_exists\` is useful for nested arrays and parameterized thresholds. Pass variables through the \`vars\` JSON object rather than concatenating values into the path string.

\`\`\`sql
SELECT id
FROM orders
WHERE jsonb_path_exists(
  payload,
  '$.items[*] ? (@.quantity >= $minimum)',
  jsonb_build_object('minimum', to_jsonb($1::numeric))
)
ORDER BY id;
\`\`\`

This answers “does any item meet the minimum?” It does not prove all items do. JSONPath's lax handling can also suppress some structural differences in ways that are convenient for search and surprising for validation. Keep document validation separate from a search predicate, and build near-miss fixtures with missing fields and wrong types.

## Validate Documents at the Application Boundary

Database constraints should protect universal invariants. A JSON Schema validator can enforce the fuller write contract and produce actionable errors before SQL. The following Node.js script uses Ajv and a schema with no ambiguous coercion. Install \`ajv\` before running it.

\`\`\`ts
import assert from 'node:assert/strict';
import Ajv from 'ajv';

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'customer', 'money', 'items'],
  properties: {
    status: { enum: ['pending', 'paid', 'cancelled'] },
    customer: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: { id: { type: 'string', minLength: 1 } },
    },
    money: {
      type: 'object',
      additionalProperties: false,
      required: ['amount', 'currency'],
      properties: {
        amount: { type: 'integer', minimum: 0 },
        currency: { type: 'string', pattern: '^[A-Z]{3}$' },
      },
    },
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['sku', 'quantity'],
        properties: {
          sku: { type: 'string', minLength: 1 },
          quantity: { type: 'integer', minimum: 1 },
        },
      },
    },
    discount: { type: ['number', 'null'], minimum: 0 },
  },
} as const;

const validate = new Ajv({ allErrors: true }).compile(schema);
const candidate = {
  status: 'paid',
  customer: { id: 'cus-7' },
  money: { amount: 2599, currency: 'EUR' },
  items: [{ sku: 'QA-BOOK', quantity: 1 }],
  discount: null,
};

assert.equal(validate(candidate), true, JSON.stringify(validate.errors));
\`\`\`

Schema validation does not replace database tests. Another writer may bypass the application, old rows may predate the schema, and a valid document can still be queried incorrectly.

## Execute the Real Parameterized Query in an Integration Test

Mocking a repository method cannot validate PostgreSQL operators. Run the SQL against a disposable database created for the suite. The example uses Node's built-in test runner and \`pg\`. It expects \`DATABASE_URL\` to point to an isolated test database and requires the table DDL shown earlier.

\`\`\`ts
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const client = new Client({ connectionString });

before(async () => {
  await client.connect();
  await client.query('TRUNCATE orders RESTART IDENTITY');
  await client.query(
    'INSERT INTO orders (payload) VALUES ($1), ($2), ($3)',
    [
      { status: 'paid', money: { amount: 2599, currency: 'EUR' }, items: [] },
      { status: 'pending', money: { amount: 2599, currency: 'EUR' }, items: [] },
      { status: 'paid', money: { amount: 2599, currency: 'USD' }, items: [] },
    ],
  );
});

after(async () => {
  await client.end();
});

test('selects only paid orders in the requested currency', async () => {
  const result = await client.query<{ id: string }>(
    \`SELECT id::text
     FROM orders
     WHERE payload ->> 'status' = $1
       AND payload #>> '{money,currency}' = $2
     ORDER BY id\`,
    ['paid', 'EUR'],
  );
  assert.deepEqual(result.rows.map((row) => row.id), ['1']);
});
\`\`\`

The fixture uses empty items arrays, which satisfy the coarse table constraint but would fail the fuller application schema. That is useful here: this query test isolates status and currency selection. Tests of the write boundary should use fully valid documents.

## Test Updates for Preservation and Atomic Meaning

JSON mutations can accidentally replace a parent object when only one path should change. \`jsonb_set\` updates a path, but all earlier path steps must exist for the normal form to alter the target. Test both the changed value and untouched siblings.

\`\`\`sql
UPDATE orders
SET payload = jsonb_set(
  payload,
  '{money,currency}',
  to_jsonb($1::text),
  false
)
WHERE id = $2
RETURNING
  payload #>> '{money,currency}' AS currency,
  payload #>> '{money,amount}' AS amount,
  payload #>> '{customer,id}' AS customer_id;
\`\`\`

An integration assertion should verify currency changed while amount and customer ID did not. Also test a document missing the \`money\` object if historical data permits it. Decide whether no change, path creation, or rejection is correct. Do not infer the desired rule from \`jsonb_set\` defaults.

## Verify Index Support Without Freezing the Entire Plan

GIN indexes can support common \`jsonb\` searches. The default operator class supports a broad group of operators. \`jsonb_path_ops\` supports fewer operators but is useful for containment and JSONPath searches in appropriate workloads. Choose from measured production queries, not from a generic “JSON needs GIN” rule.

\`\`\`sql
CREATE INDEX orders_payload_gin
ON orders USING gin (payload jsonb_path_ops);

ANALYZE orders;

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id
FROM orders
WHERE payload @> '{"status": "paid"}'::jsonb;
\`\`\`

A tiny fixture table will often use a sequential scan because it is cheaper, even when the index is valid. Do not fail a unit test because the planner correctly chooses that path. Verify the index definition in migrations, then use representative data and a controlled performance environment for plan assertions. In a diagnostic transaction, disabling sequential scans can show whether the predicate is indexable, but it does not prove the production planner will choose the index.

| Performance check | What it proves | What it does not prove |
|---|---|---|
| Index exists in catalog | Migration created expected object | Query can use it |
| Forced diagnostic plan uses index | Predicate and operator class are compatible | Normal planner will choose it |
| Representative normal plan | Planner chooses index for that data and settings | All future distributions behave alike |
| Timed production-like query | End-to-end latency under a stated fixture | Universal latency across hardware |

Record row count, data distribution, PostgreSQL settings, and query parameters with any plan artifact. Without context, a plan snapshot is brittle evidence.

## Diagnose a Query That Returns the Right Count but Wrong Rows

A realistic failure appears when a report asks for orders where one item has SKU \`QA-BOOK\` and quantity 2. A query independently checks whether the items array contains a matching SKU and whether it contains a quantity 2. It returns an order where the book has quantity 1 and another product has quantity 2. The row count still matches the test's expected count.

The bug is loss of element correlation. Both conditions must apply to the same array element. Expand elements or use a JSONPath filter with both predicates on \`@\`:

\`\`\`sql
SELECT o.id
FROM orders AS o
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(o.payload -> 'items') AS item(value)
  WHERE item.value ->> 'sku' = $1
    AND CASE
      WHEN jsonb_typeof(item.value -> 'quantity') = 'number'
        THEN (item.value ->> 'quantity')::integer = $2
      ELSE false
    END
)
ORDER BY o.id;
\`\`\`

Diagnose JSON query failures by inspecting actual IDs and documents, reducing the predicate one clause at a time, checking JSON types with \`jsonb_typeof\`, and comparing missing versus null explicitly. Use an \`EXPLAIN\` plan only after logical correctness is established. A fast wrong query is still wrong.

What people get wrong is treating JSON query tests like ordinary scalar-column tests. Nested arrays introduce correlation, heterogeneous types introduce casts, and forgiving extraction turns malformed paths into null-like results. Every important predicate needs near misses constructed for those exact ambiguities.

## Test Legacy Documents and Schema Evolution Explicitly

JSON shapes change over time. A new writer may add a field, rename a state, or move values under a nested object while older documents remain. A query that works on newly created fixtures can exclude historic rows without an error. Build a versioned fixture catalog from real documented migrations rather than preserving accidental production debris forever.

For each supported document generation, record which reader behavior is promised. A current reader may accept and normalize an old shape, a migration may rewrite it before deployment, or the product may intentionally stop supporting it after retention expires. The test should reflect one of those decisions. “The operator returned null” is not a migration strategy.

Additive fields are usually easier, but additionalProperties rules can reject them in strict application schemas. Decide whether readers allow unknown future keys. A database containment query typically ignores unrelated keys, while a strict Ajv schema may reject the same document. That mismatch is acceptable only when it is intentional and tested at the correct boundary.

Renames require a transition plan. During dual-write, assert that both representations agree. During backfill, run audit queries that count old-only, new-only, matching, and conflicting documents. After readers switch to the new path, retain a regression fixture proving an old-only row is either migrated or handled according to policy. Remove compatibility branches only after evidence shows the old population is gone.

Enum expansion can break negative predicates. A query written as status not equal to cancelled may begin selecting a new archived state even if archived should be hidden. Prefer positive allowed sets when the business question is inclusion, and add an unknown or future-state fixture to prove the chosen behavior. JSON flexibility makes it easy for a new string to enter storage before every report is updated.

Numeric migrations deserve extra care. Converting a decimal major-unit string to integer minor units is not a simple cast. Test rounding, currency rules, negative values if permitted, and overflow boundaries through an application-owned conversion. Store migrated documents and compare business values, not only JSON types. Run the backfill idempotently in a test: applying it twice must not multiply or reinterpret the amount.

Keep fixture version labels outside the payload unless document version is part of the actual format. Tests can name files or rows by generation. Adding a test-only version field changes containment and strict-schema behavior, so it can hide the very compatibility issue being examined.

## Cross-Check API Filters Against Direct SQL Evidence

An endpoint test can pass while the repository query is wrong if the mock never reaches PostgreSQL. For critical filters, arrange rows in the database, call the API through its real route, and compare response IDs with a direct diagnostic query or the known fixture oracle. The endpoint assertion covers parameter parsing, authorization, repository mapping, and JSON serialization in addition to SQL.

Keep the direct query independent enough to detect mistakes. Copying the repository SQL verbatim into the assertion only proves both copies share the same bug. For a small fixture, the strongest oracle is often an explicit ordered list of IDs derived during review. For broader combinatorial cases, a simple in-memory predicate over typed fixture objects can serve as a second model, provided it implements domain semantics rather than PostgreSQL operators.

Test invalid filter parameters before they reach casts. A minimum amount of arbitrary text should produce the documented client error, not a database exception and generic server failure. Parameterization protects against SQL injection, but it does not make every value meaningful. Validate currency vocabulary, numeric range, state values, and array limits at the boundary.

Authorization must combine correctly with JSON predicates. Create two tenants with otherwise matching documents and assert the caller receives only its own row. Put the relational tenant key in a normal typed column when it is a core access-control boundary. Hiding tenancy only inside a JSON document makes constraints, foreign keys, row-level policies, and indexing harder to reason about. Flexible attributes and relational identity do not have to share one storage mechanism.

Pagination tests need deterministic ordering beyond the JSON filter. Ordering only by a nonunique extracted timestamp can duplicate or omit rows between pages. Add a stable tie-breaker such as the primary key, seed equal timestamps, and verify every expected ID appears once across page traversal. If a cursor encodes JSON-derived values, test documents with missing or null sort keys according to the API policy.

Response mapping can introduce another type drift. PostgreSQL text extraction returns strings; the API may promise numeric amounts. Assert response types, not just printed values. A JSON response containing "2599" differs from 2599 even when loose comparisons say otherwise. Likewise, bigint IDs returned by a Node driver are commonly strings by design. The API contract should decide whether to preserve or convert them safely.

When the API and SQL results diverge, preserve the request URL, validated parameters, query text identifier, bound values, returned row IDs, and transaction or correlation ID. Avoid logging entire sensitive documents. A minimal diagnostic projection of IDs, types, and relevant paths usually provides enough evidence.

## Make Cleanup and Parallelism Part of Correctness

JSON integration tests often share broad queries, so leaked fixtures are especially damaging. A stale row can accidentally satisfy a containment predicate and make a result-count assertion fail only under parallel load. Give each worker an isolated database, schema, tenant key, or transaction strategy compatible with the system under test.

Transaction rollback is fast when the application and test share the same connection scope, but an HTTP server normally uses its own pool. In that case, per-test tenant identifiers or disposable schemas are easier to reason about. Truncating shared tables during parallel execution is unsafe. A container per worker is stronger isolation but costs startup time. Choose based on measured suite behavior and document the ownership boundary.

Generate unique business keys from a controlled worker identifier and test case, using clear braces in shell variables. Do not put random values everywhere, because failures become difficult to reproduce. The primary keys returned by insertion are sufficient for most direct assertions. Clean up by those owned IDs or dispose of the whole isolated database.

Seed data and query execution must use the same schema migration state. Run migrations once per disposable database and fail fast if expected constraints or indexes are absent. A test that creates a simplified hand-written table can validate SQL syntax while missing the production column type, generated column, collation, or index definition.

Finally, retain the database server log and failed query context only when policy permits. Redact credentials and sensitive JSON paths. Determinism comes from ownership and isolation, not from making every document globally visible in artifacts.

## Assemble a Review Matrix for JSON Query Changes

Before merging a new JSON predicate, cover the dimensions it can confuse:

| Dimension | Minimum fixtures |
|---|---|
| Key presence | Present, missing, explicit JSON null |
| Scalar type | Expected type, plausible wrong type, malformed value |
| Object depth | Correct nesting, key at wrong nesting, parent missing |
| Arrays | Empty, one valid, multiple valid, mixed valid and invalid |
| Correlation | Conditions in same element, conditions split across elements |
| Boundary | Just below, equal, and just above numeric or time threshold |
| Mutation | Target changes, siblings preserved, missing parent handled |
| Performance | Selective and nonselective representative parameters |

Keep fixtures small enough that a reviewer can predict every returned ID. Add larger data only for planner and performance tests. Use transactions or isolated schemas so parallel workers do not mutate each other's rows. Log parameter values and server version with failures, especially when JSONPath or plans are involved.

A coding agent can help generate near-miss fixtures from the matrix. Give it the actual DDL, schema, SQL, and domain meaning. Ask it to explain which false positive each row defeats. Reject generated package names, operator combinations, or casts that are not verified against PostgreSQL documentation.

## Frequently Asked Questions

### Should JSON validation happen in PostgreSQL or application code?

Use both at different depths. PostgreSQL constraints should protect small, universal invariants such as a top-level object, required status key, and array type. Application JSON Schema validation can express the fuller evolving contract and return clearer errors. Integration tests must still query real stored documents because older rows, imports, and alternate writers can bypass today's application validator. Avoid duplicating every schema rule in SQL unless the database must independently guarantee it.

### How do I test the difference between a missing key and JSON null?

Create one row without the key and another with the key set to JSON \`null\`. Use the \`?\` operator to test top-level existence and compare \`->\` with \`'null'::jsonb\` for explicit JSON null. Do not rely on \`->> ... IS NULL\`, because text extraction produces SQL \`NULL\` for both cases. Assert returned IDs for each predicate so a count coincidence cannot hide a swapped result.

### When should a query use containment instead of text extraction?

Use \`@>\` when the requirement is structural containment, such as a document containing a status and nested currency or an array containing an object fragment. Use \`->>\` or \`#>>\` when comparing a scalar to a parameter, applying a guarded cast, or expressing ordering. Let index strategy and measured queries influence the choice after correctness. Do not rewrite a clear predicate solely to force an assumed index benefit.

### Why does PostgreSQL ignore my JSONB index in a test?

Small fixture tables commonly favor sequential scans because reading the table is cheaper than traversing an index. First verify that the index exists and that its operator class supports the predicate. Use representative volume and distribution for a normal plan test. A diagnostic session can discourage sequential scans to confirm indexability, but that does not prove the production planner will select the index. Preserve plan context, parameters, statistics, and settings with performance evidence.
`,
};
