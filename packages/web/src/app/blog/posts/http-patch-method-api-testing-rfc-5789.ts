import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing HTTP PATCH: RFC 5789 Semantics, Merge Patch, and Partial Update Cases',
  description: 'RFC 5789 PATCH testing for partial update semantics covers merge-patch, JSON Patch, media types, and concurrency so silent field loss is caught.',
  date: '2026-08-28',
  category: 'API Testing',
  content: `
# Testing HTTP PATCH: RFC 5789 Semantics, Merge Patch, and Partial Update Cases

RFC 5789 defines the HTTP PATCH method for applying a partial update to an existing resource using a patch document whose media type names the apply algorithm. For API testers, that means you do not assert "some fields changed"; you assert that the server selected the correct patch format from \`Content-Type\`, applied documented merge or op semantics, left untouched fields alone, rejected illegal paths cleanly, and surfaced concurrency conflicts with 409 or 412 when \`If-Match\` or ETags disagree. JSON Merge Patch is RFC 7396 (\`application/merge-patch+json\`). JSON Patch is RFC 6902 (\`application/json-patch+json\`). Testing PATCH without locking those media types and their failure modes is how teams ship silent field wipes and partner-breaking partial updates.

## PATCH Is a Method; Merge Patch and JSON Patch Are Documents

RFC 5789 is deliberately thin. It registers PATCH, requires that the request body be a patch document, and leaves the meaning of that document to the media type. Testers who treat "PATCH means send a partial JSON object" are inventing a default that many frameworks happen to implement, not a guarantee from 5789 itself. The contract under test is always: method + \`Content-Type\` + body shape + apply rules + status mapping.

Keep the three RFCs separate in your suite naming and fixtures:

| Spec | What it defines | Typical media type | Tester focus |
| --- | --- | --- | --- |
| RFC 5789 | PATCH method semantics | N/A (method only) | Partial update vs full replace, Allow, error mapping |
| RFC 7396 | JSON Merge Patch algorithm | \`application/merge-patch+json\` | Null removes, objects merge recursively, arrays replace |
| RFC 6902 | JSON Patch operation list | \`application/json-patch+json\` | add/remove/replace/move/copy/test op sequencing |

PUT remains full replacement of the target representation (or of the resource as the API defines replace). PATCH remains "apply this delta." If your OpenAPI marks PATCH but the handler deserializes a full DTO and nulls missing properties, you are testing a buggy PUT wearing a PATCH verb. Catch that by sending a one-field body and asserting sibling fields survive.

People get this wrong by copy-pasting POST/PUT helpers into PATCH tests. Those helpers often set \`Content-Type: application/json\`. Some servers accept that and apply an undocumented merge. Others return 415. Others treat the body as a full replace. Without an explicit media type matrix, your green suite only proves that one client library works against one environment.

A second confusion is treating PATCH as inherently idempotent. RFC 5789 does not require idempotency. Merge patch of a scalar often is idempotent. JSON Patch \`add\` into an array index is often not. Your tests should label cases as idempotent or non-idempotent expected behavior rather than assuming "retry safe" because the verb is PATCH.

When docs say "we support PATCH" and stop there, force product to name the media type list. Until that list exists, write the suite against the observed \`Content-Type\` values and fail CI when a new type appears without fixtures. Observed contracts become accidental contracts; accidental contracts become outages when a framework upgrade changes the default deserializer.

## Failure Story: The Merge That Erased Line Items

A B2B order API exposed \`PATCH /orders/{id}\` with \`Content-Type: application/json\` and a handwritten merge. Product said partners could update \`notes\` and \`shipBy\` without resending line items. QA automated a happy path: create order, PATCH notes, GET, assert notes changed. Line items were never asserted after PATCH.

A partner integration built on a typed client that initialized arrays to \`[]\`. Their "update notes" call sent \`{ "notes": "hold", "lineItems": [] }\` because the SDK omitted nothing; it serialized defaults. The server replaced \`lineItems\` with an empty array. Warehouse picks vanished. Revenue recognition jobs saw zero-quantity orders. The incident review blamed the partner for "sending empty arrays." The deeper failure was ours: merge semantics for arrays were undocumented, \`application/json\` hid whether we meant RFC 7396, and tests never asserted that omitted fields and empty arrays are different inputs.

What people get wrong: they assert only the fields they intended to change. Partial update testing is mostly about the fields you did not mention. After every PATCH, compare the full resource (or a fingerprint of critical subtrees) against a pre-PATCH snapshot, then apply the expected delta in the test oracle. If your oracle only checks \`notes\`, you will bless array wipes forever.

We fixed three layers. Docs switched to \`application/merge-patch+json\` and stated that arrays replace. The handler rejected unknown fields and empty \`lineItems\` unless a query flag allowed clear. Tests added a snapshot-diff helper and a case where \`lineItems: []\` must 422. The partner SDK was updated to omit undefined fields. None of that would have happened from status-200-only checks.

Related concurrency gaps showed up in the same week: two agents patched \`notes\` and \`shipBy\` without \`If-Match\`, last write won, and support could not explain whose edit survived. That is why PATCH suites should sit next to your [optimistic concurrency header tests](/blog/api-testing-optimistic-concurrency-headers) rather than living as isolated CRUD smoke cases.

## Merge-Patch Null Means Remove; Arrays Replace

RFC 7396 JSON Merge Patch is the format most product teams think they want. Understanding its sharp edges is the bulk of useful PATCH testing.

Recursive object merge: members present in the patch replace or recurse; members absent in the patch remain. Null assigns removal for that member. Arrays are replaced wholesale; there is no element-wise merge in 7396. Primitives replace.

Encode those rules as readable cases:

| Target before | Merge-patch body | Expected after | Note |
| --- | --- | --- | --- |
| \`{"a":1,"b":2}\` | \`{"a":3}\` | \`{"a":3,"b":2}\` | Omitted \`b\` preserved |
| \`{"a":1,"b":2}\` | \`{"b":null}\` | \`{"a":1}\` | Null removes |
| \`{"tags":["x","y"]}\` | \`{"tags":["z"]}\` | \`{"tags":["z"]}\` | Array replace, not append |
| \`{"addr":{"city":"Austin","zip":"78701"}}\` | \`{"addr":{"zip":null}}\` | \`{"addr":{"city":"Austin"}}\` | Nested null remove |
| \`{"addr":{"city":"Austin"}}\` | \`{"addr":null}\` | \`{}\` (addr gone) | Null removes object member |

Testers routinely assume \`{"tags":["z"]}\` means append. It does not under 7396. If product needs append semantics, that is either JSON Patch \`add\` ops, a custom media type, or a dedicated sub-resource POST. Do not silently reinterpret merge-patch.

Null versus omission is the other classic miss. Omission means leave alone. Null means delete. Clients written in languages that conflate missing and null (or SDKs that emit null for unset optionals) will delete fields the caller never intended to touch. Your negative and positive suites must include both shapes for every optional field that supports clear-to-null.

Nested objects recurse, which tempts people to send partial nested updates without reading the spec. That is correct for objects. It is incorrect for arrays of objects: replacing \`items\` replaces the entire array. If you need to patch item 3 of 10, either expose \`PATCH /orders/{id}/items/{itemId}\` or use JSON Patch paths.

Here is a runnable merge-patch request using \`fetch\`:

\`\`\`typescript
const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080';
const orderId = 'ord_123';
const etag = '"v3"';

async function patchOrderNotes(): Promise<Response> {
  const response = await fetch(\`\${baseUrl}/orders/\${orderId}\`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      Accept: 'application/json',
      'If-Match': etag,
    },
    body: JSON.stringify({
      notes: 'hold for fraud review',
      shipBy: null,
    }),
  });
  return response;
}
\`\`\`

Assert status (200 or 204 per docs), assert \`notes\`, assert \`shipBy\` absent or null per representation rules, and assert every other field equals the pre-PATCH snapshot. If the API returns the new representation, compare body to oracle. If it returns 204, follow with GET and compare.

Also verify that sending the same merge-patch twice yields the same representation when the patch only sets scalars and removals (idempotent for that document). Then separately prove that a custom "increment" field, if any, is not merge-patch territory.

## JSON Patch Ops: add, remove, replace, move, copy, test

RFC 6902 JSON Patch is an array of operations applied in order. Media type: \`application/json-patch+json\`. Pointers use JSON Pointer (RFC 6901). Testers should store op documents as fixtures, not hand-wave "we sent a patch."

| Op | Meaning | Common failure to test |
| --- | --- | --- |
| add | Insert value at path (or replace if exists, depending on path rules) | Adding to nonexistent parent; array index \`-\` append |
| remove | Remove value at path | Removing missing path -> error |
| replace | Replace existing value | Replace missing path -> error |
| move | Remove from \`from\`, add to \`path\` | Moving into descendant of self |
| copy | Copy from \`from\` to \`path\` | Copy from missing path |
| test | Assert value equals; fail whole patch if not | Using test as optimistic concurrency |

A concrete document:

\`\`\`json
[
  { "op": "test", "path": "/status", "value": "open" },
  { "op": "replace", "path": "/notes", "value": "priority" },
  { "op": "add", "path": "/tags/-", "value": "vip" },
  { "op": "remove", "path": "/shipBy" }
]
\`\`\`

Application is atomic from the client's perspective: if any op fails, the resource should remain unchanged. Your tests must prove rollback or non-application on mid-document failure. Send a document where the first ops would mutate and a later \`test\` fails; GET afterward must match the pre-PATCH body.

Order matters. \`remove\` then \`add\` is not the same as \`replace\`. \`test\` early in the list is a common stand-in for concurrency control when ETags are absent, but it is weaker than \`If-Match\` because it only covers the tested paths. Prefer HTTP precondition headers for resource-wide versioning; use \`test\` for field-level assumptions inside the document.

Pointer escaping trips up fixtures: \`~\` becomes \`~0\`, \`/\` in keys becomes \`~1\`. Include one resource with a slashy property name if your domain has them (\`a/b\` keys in maps). If not, still keep a unit fixture that encodes pointers correctly so copy-paste authors do not invent \`/a/b\` for key \`a/b\`.

Do not invent media types. If the server only implements merge-patch, do not write JSON Patch tests expecting 200. Expect 415 Unsupported Media Type for \`application/json-patch+json\` and document that limitation. If both are supported, duplicate critical business cases in each format rather than assuming parity.

## Idempotency Stories Teams Invent About PATCH

"PATCH is idempotent" appears in design reviews as if RFC 5789 said so. It did not. Idempotency depends on the patch document and server-side apply rules.

Safe-to-retry examples: merge-patch setting \`notes\` to the same string; JSON Patch \`replace\` of a scalar with the same value; remove of an already-removed path if your server treats remove as idempotent (6902 says remove on missing fails, so that one is not retry-safe unless you prepend \`test\` or catch 4xx).

Unsafe-to-retry examples: JSON Patch \`add\` to \`/tags/-\` (appends again); merge-patch that toggles a boolean computed server-side; patches that allocate new child IDs; anything that increments counters.

Your suite should classify cases:

1. Retry identical request with same \`Idempotency-Key\` if you support that header for PATCH.
2. Retry identical request without such a key and record whether the resource grew duplicate side effects.
3. Retry after a transport timeout where the first request may have applied (ambiguous outcome).

If the API offers idempotency keys for POST only, say so in PATCH docs and tests. Silent "keys ignored on PATCH" behavior is a trap for API gateways that attach keys globally. For multi-step client workflows that fire several PATCH calls, also cross-check ordering assumptions against your [batch request ordering tests](/blog/api-testing-batch-request-ordering) so retries do not reorder dependent partial updates.

Practitioners should record observed retry semantics in golden tests even when product has not finalized policy. A golden that fails when retries duplicate tags is better than a wiki promise.

## Unknown Fields, Nested Clears, Type Coercion, Immutable Paths

Partial updates concentrate validation debt into one handler. Table-drive the awkward cases instead of sprinkling one-off tests.

\`\`\`typescript
import { expect, test } from 'vitest';

type PatchCase = {
  name: string;
  contentType: string;
  body: unknown;
  setupEtag?: string;
  expectedStatus: number;
  assertAfter?: (resource: Record<string, unknown>) => void;
};

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080';

const cases: PatchCase[] = [
  {
    name: 'merge-patch updates notes only',
    contentType: 'application/merge-patch+json',
    body: { notes: 'ok' },
    expectedStatus: 200,
    assertAfter: (resource) => {
      expect(resource.notes).toBe('ok');
      expect(resource.status).toBe('open');
    },
  },
  {
    name: 'unknown field rejected',
    contentType: 'application/merge-patch+json',
    body: { notARealField: true },
    expectedStatus: 422,
  },
  {
    name: 'immutable id path rejected',
    contentType: 'application/json-patch+json',
    body: [{ op: 'replace', path: '/id', value: 'ord_other' }],
    expectedStatus: 422,
  },
  {
    name: 'wrong content type',
    contentType: 'text/plain',
    body: 'notes=ok',
    expectedStatus: 415,
  },
  {
    name: 'empty object merge-patch is no-op success',
    contentType: 'application/merge-patch+json',
    body: {},
    expectedStatus: 200,
  },
];

for (const c of cases) {
  test(c.name, async () => {
    const response = await fetch(\`\${baseUrl}/orders/ord_123\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': c.contentType,
        Accept: 'application/json',
        ...(c.setupEtag ? { 'If-Match': c.setupEtag } : {}),
      },
      body:
        typeof c.body === 'string' ? c.body : JSON.stringify(c.body),
    });
    expect(response.status).toBe(c.expectedStatus);
    if (c.assertAfter && response.ok) {
      const resource = (await response.json()) as Record<string, unknown>;
      c.assertAfter(resource);
    }
  });
}
\`\`\`

Expand the table with nested clear-to-null, string-to-number coercion attempts (\`"priority": "1"\` when schema wants integer), extra JSON Patch ops against read-only \`createdAt\`, and PATCH after DELETE expecting 404. Prefer 422 for semantically invalid patch docs when your API already uses 422 for body validation; 400 is acceptable if that is the platform standard. Do not accept 200 with ignored unknown fields unless docs explicitly promise permissive merge and you assert the field was ignored (still absent).

Type coercion deserves explicit product calls. Some frameworks cast \`"10"\` to \`10\`. That feels friendly until a client sends \`"10kg"\` and stores \`10\`. Strict JSON Schema validation before apply is easier to test: invalid type -> 422, no partial apply.

Immutable fields: id, createdAt, createdBy, billingAgreementId, and anything compliance locks. JSON Patch makes immutability easy to violate via \`replace\` / \`remove\`. Merge-patch can attempt \`id: null\` or \`id: "other"\`. Both must fail without mutating other fields in the same document.

## Concurrent PATCH With If-Match and ETag

Two clients reading revision 5, both patching different fields, both writing without preconditions: last write wins, first writer's field update may disappear if the second writer used PUT-by-mistake or a merge that replaced a parent object. Even with correct merge-patch, lost updates happen when each client GETs, mutates a local copy, and PUTs full representations. PATCH reduces payload size; it does not magically solve concurrency.

Test pattern:

1. Create resource; capture \`ETag\`.
2. PATCH with \`If-Match\` matching -> success; new \`ETag\`.
3. PATCH with stale \`If-Match\` -> 412 Precondition Failed (or documented 409).
4. Confirm body unchanged on precondition failure.
5. Optional: parallel PATCHes with the same \`If-Match\` using \`Promise.all\`; exactly one success if the server serializes correctly.

\`\`\`typescript
const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080';
const orderId = 'ord_456';

async function staleIfMatchMustFail(): Promise<void> {
  const getRes = await fetch(\`\${baseUrl}/orders/\${orderId}\`, {
    headers: { Accept: 'application/json' },
  });
  const etag = getRes.headers.get('etag');
  if (!etag) {
    throw new Error('expected ETag on GET');
  }

  const first = await fetch(\`\${baseUrl}/orders/\${orderId}\`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      'If-Match': etag,
      Accept: 'application/json',
    },
    body: JSON.stringify({ notes: 'first writer' }),
  });
  if (!first.ok) {
    throw new Error(\`first PATCH failed: \${first.status}\`);
  }

  const second = await fetch(\`\${baseUrl}/orders/\${orderId}\`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      'If-Match': etag,
      Accept: 'application/json',
    },
    body: JSON.stringify({ notes: 'stale writer' }),
  });

  if (second.status !== 412 && second.status !== 409) {
    throw new Error(\`expected 412 or 409, got \${second.status}\`);
  }

  const finalRes = await fetch(\`\${baseUrl}/orders/\${orderId}\`, {
    headers: { Accept: 'application/json' },
  });
  const finalBody = (await finalRes.json()) as { notes?: string };
  if (finalBody.notes !== 'first writer') {
    throw new Error('stale PATCH must not overwrite notes');
  }
}
\`\`\`

Map status codes deliberately. Many APIs use 412 for failed \`If-Match\` and 409 for domain conflicts (duplicate rename, illegal state transition). Do not treat them as interchangeable in assertions. If weak ETags (\`W/"..."\`) appear, document whether PATCH preconditions treat them as usable; RFC 9110 has subtle rules, and testers should freeze the API's stated policy in fixtures.

Missing \`If-Match\` policy also needs a test: some APIs require it for all PATCH (strict), some accept unconditional PATCH (last write wins), some require it only for certain fields. Pick one, document it, assert it.

## Collection PATCH Versus Item PATCH

PATCH on \`/orders/{id}\` is the common case. PATCH on \`/orders\` (collection) is rarer and more dangerous. Semantics might mean bulk update, replace filter result, or "not allowed." Testers should not invent bulk semantics from the verb alone.

Questions your suite answers:

- Is collection PATCH supported? If not, expect 405 Method Not Allowed with \`Allow\` listing legal methods.
- If bulk patch exists, is the body a list of per-id merge documents, a filter plus merge, or JSON Patch against a collection representation?
- Are bulk applies atomic? Partial success needs a defined response body; silent partial success is hostile to clients.
- Do permissions differ for bulk versus item?

Prefer item-level PATCH for routine client edits; leave bulk semantics to an explicitly versioned collection contract. This article keeps collection coverage to status, Allow headers, and one documented bulk fixture if the product has it. If bulk is undocumented but returns 200, fail the test and force a decision.

Sub-resource PATCH (\`/orders/{id}/shipping-address\`) often clarifies array and nested merge pain. Treat nested documents as their own resources when clients routinely update them independently. Tests should prove that patching a sub-resource does not reset sibling sub-resources on the parent.

## Contract Tests: OpenAPI and JSON Schema for Patch Bodies

OpenAPI 3 describes request bodies per media type. For PATCH, define separate schemas for merge-patch and json-patch rather than reusing the full resource schema. Reusing the full schema trains code generators to require every property and trains humans to send PUT-shaped bodies.

A minimal JSON Schema fixture for allowed merge-patch shapes (illustrative):

\`\`\`json
{
  "$id": "https://example.com/schemas/order-merge-patch.json",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "notes": { "type": ["string", "null"], "maxLength": 2000 },
    "shipBy": { "type": ["string", "null"], "format": "date" },
    "priority": { "type": "integer", "minimum": 1, "maximum": 5 },
    "tags": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "maxItems": 20
    }
  }
}
\`\`\`

Contract checks to automate:

1. Response resource schema still validates after PATCH.
2. Request merge-patch schema rejects unknown fields when \`additionalProperties\` is false.
3. JSON Patch documents validate as arrays of ops with required members.
4. Documented media types in OpenAPI match what the server accepts (no phantom types).
5. Examples in OpenAPI are executed as tests, not left as stale markdown.

Consumer-driven contract tests should include at least one PATCH interaction per consumer that performs partial updates. Providers that only pact GET/POST will not notice merge-patch null semantics drifting.

If you maintain schema fixtures in-repo, load them in Vitest and run \`ajv\` (or your stack's validator) against both positive and negative bodies before hitting the network. That keeps feedback fast when someone adds a field to the resource schema and accidentally requires it on PATCH.

Optional tooling note: teams that keep API suites next to skill-style checklists sometimes store negative PATCH cases beside other HTTP method cards on qaskills.sh and drive them with the qaskills CLI when spinning up a new service checklist. That does not replace executable Vitest fixtures; it only keeps the human checklist aligned with the media types you actually ship.

## Negative Matrix: Media Types, Empty Bodies, Deleted Targets

Build an explicit negative matrix and keep it dull on purpose. Dull matrices catch expensive bugs.

| Case | Request sketch | Expected |
| --- | --- | --- |
| Wrong Content-Type | \`text/plain\` body | 415 |
| \`application/json\` when only merge-patch is supported | partial object | 415 (or documented accept) |
| Empty body | \`Content-Length: 0\` | 400 or 422 |
| Malformed JSON | \`{notes:\` | 400 |
| Patch after DELETE | valid merge-patch | 404 |
| Patch illegal state transition | \`status\` via merge-patch | 409 or 422 |
| JSON Patch test failure | \`test\` wrong value | 409/422; no mutations |
| Oversized patch | huge notes | 413 or 422 |

415 Unsupported Media Type is about the request body's media type for PATCH. Do not confuse it with 406 on \`Accept\`. Empty body failures should not apply a default clear-all. Patch-after-delete should not resurrect resources unless you intentionally support upsert and say so (most item PATCH APIs should not).

Immutable-field and unknown-field cases belong here too. For JSON Patch, an illegal pointer might be 400; a legal pointer to a forbidden field might be 422. Stabilize the mapping in one table shared by engineers and technical writers.

Run negatives through the public edge URL. API gateways sometimes rewrite 415 into generic 400s or HTML. Your clients need the status and problem+json body you documented.

## Running Partial Update Suites in CI

Keep PATCH tests in the same job as other API contract checks. Use pinned actions at \`@v4\` only for checkout, Node setup, and artifact upload.

\`\`\`yaml
name: api-patch-contract
on:
  pull_request:
  push:
    branches: [main]
jobs:
  patch-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run test:api:patch -- --reporter=junit --outputFile=patch-junit.xml
        env:
          API_BASE_URL: http://127.0.0.1:8080
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: patch-junit
          path: patch-junit.xml
\`\`\`

Seed data must be isolated per job. Colliding on \`ord_123\` across concurrent workflows creates flake that looks like merge bugs. Prefer creating a fresh order in \`beforeAll\` or per test, then PATCH that id. Capture ETags from those creates rather than hardcoding \`"v3"\` outside local demos.

Publish JUnit or JSON results so flaky precondition failures are visible. When investigating flakes, log request \`Content-Type\`, \`If-Match\`, response status, and response \`ETag\` on failure; most "random 412" bugs are shared mutable fixtures, not Heisenberg servers.

## Frequently Asked Questions

### Does RFC 5789 require JSON Merge Patch for every PATCH API?

No. RFC 5789 only defines the PATCH method and the idea of a patch document. The apply algorithm comes from the request \`Content-Type\`. JSON Merge Patch is RFC 7396 with \`application/merge-patch+json\`. JSON Patch is RFC 6902 with \`application/json-patch+json\`. An API may support one, both, or a domain-specific media type. Your tests must bind assertions to the media types listed in the contract, expect 415 for unsupported types, and never assume that \`application/json\` implies merge semantics.

### How should we test null versus omitted fields on merge-patch?

Create a resource with both fields set, then run two PATCHes. First, omit field B while changing field A; assert B unchanged. Second, send \`B: null\`; assert B removed or null per your representation rules, and assert A still matches the first PATCH. Repeat for nested objects. Add a client-simulation case where an SDK emits nulls for untouched optionals; that case should fail validation or be caught in SDK tests before it wipes production data.

### What status codes matter most for PATCH concurrency and validation?

Use 412 when \`If-Match\` / preconditions fail, unless your public docs standardize on 409 for all conflicts. Use 409 for domain conflicts and failed JSON Patch \`test\` ops if that is your stated mapping. Use 415 for unsupported patch media types. Use 400 or 422 for malformed or semantically invalid patch documents, consistently. Use 404 after delete. Assert that failed PATCH responses do not partially apply ops or merge members.

### Should PATCH tests reuse the full resource schema from PUT?

Usually not. Full resource schemas mark required fields that PATCH must not require. Define dedicated merge-patch and JSON Patch request schemas with \`additionalProperties\` set intentionally, allow nulls only where clear-to-null is supported, and exclude immutable paths. Contract tests should validate request examples against those patch schemas and validate post-PATCH responses against the resource schema. Reusing PUT schemas is how generators and humans learn to send replace-shaped partial updates.
`,
};
