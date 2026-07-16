# Reference: schema construct to generated-data mapping

Companion to the Secure Test Data Engineer skill: the mechanical mapping from
each schema construct to the data it must produce, per source format.

## Source priority when declarations disagree

1. SQL DDL / migrations (the database enforces these at runtime)
2. ORM model (Prisma/Drizzle/TypeORM/SQLAlchemy)
3. API schema (OpenAPI/JSON Schema, request boundary only)
4. Language types (TypeScript/Pydantic, weakest: erased at runtime)

Any disagreement between layers is itself a finding to report (e.g. TS says
`string`, DDL says `varchar(50)`: the app accepts what the DB will reject).

## OpenAPI / JSON Schema constructs

| Construct | Factory default | Boundary set | Negative set |
|---|---|---|---|
| `type: string, maxLength: N` | length ~N/2 | N-1, N, N+1, empty | number, null, array |
| `minimum / maximum` | midpoint | min, min-1, max, max+1 | string digits, float for int |
| `enum` | first value | every member | non-member, casing variant |
| `format: email` | reserved-domain synth | 320-char, unicode local | missing @, spaces |
| `format: uuid` | v4 from seeded gen | nil uuid | truncated, wrong version |
| `format: date-time` | fixed clock ISO | epoch, 9999-12-31, DST edge | date-only, unix int, TZ-less |
| `required` | always present | - | key absent, null, undefined |
| `pattern` | matching minimal | longest legal | near-miss (one char off) |
| `oneOf/discriminator` | first branch | each branch | mixed-branch object |

## SQL DDL constructs

| Construct | Generate |
|---|---|
| `NOT NULL` | negative: explicit NULL insert, expect rejection |
| `UNIQUE` / partial unique index | duplicate in-batch AND cross-transaction; for partial (e.g. WHERE deleted_at IS NULL) also a duplicate that the predicate exempts |
| `CHECK (expr)` | value passing, value failing by smallest margin |
| `REFERENCES ... ON DELETE CASCADE` | delete parent, assert children gone; ON DELETE RESTRICT: assert rejection |
| `DEFAULT now()` | omit the column, assert DB fills; never generate Date.now() |
| `DECIMAL(p,s)` | max precision value, scale+1 rejection, negative, string-number at API boundary |
| Composite PK/unique | vary each column independently to prove which combination collides |
| Triggers/generated columns | insert base fields only, assert derived values, never write them directly |

## TypeScript / Pydantic constructs

| Construct | Note |
|---|---|
| `string` with no bound | Check DDL for the real limit; TS lies by omission |
| Union types | One factory variant per branch, discriminated by intent-named builders |
| Optional (`?`) | Distinguish absent vs null vs undefined; APIs treat them differently |
| Branded/nominal types (`UserId`) | Generate through the brand constructor, not raw strings |
| Pydantic validators | Read the validator body; it encodes constraints no type shows |

## Reserved synthetic namespaces

| Field | Reserved space |
|---|---|
| Email | `*@example.test`, `*@example.com` (RFC 2606) |
| Phone | +1-555-0100 to +1-555-0199 (reserved fiction range) |
| Card numbers | Documented test PANs only (4242 4242 4242 4242 class) |
| Domains/URLs | example.com/.org/.net, *.test, *.invalid |
| IPs | 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET) |
| Company | Generator lists, never real-brand names |

## Cleanup verification snippet

```sql
-- after teardown: residue check for run-tagged strategy
SELECT COUNT(*) AS residue FROM users WHERE test_run_id = :run_id;
-- expect 0; non-zero fails the suite loudly
```
