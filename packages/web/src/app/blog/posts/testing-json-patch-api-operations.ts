import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing JSON Patch API Operations',
  description:
    'Testing JSON Patch API operations validates add, remove, replace, move, copy, and test semantics, including arrays, atomic failures, and ETags.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing JSON Patch API Operations

A payments team shipped a \`PATCH /invoices/{id}\` endpoint that accepted \`application/json-patch+json\` bodies. Their test suite covered adding a field, removing a field, replacing a field, each in isolation, each against a clean fixture. Three weeks after launch, a client sent a patch that renamed a custom field called \`billing/region\` using JSON Pointer path \`/customFields/billing~1region\`. Nobody had tested the \`~1\` escape sequence. The server's pointer parser split on raw \`/\` characters without unescaping first, so it tried to walk into a nested object named \`billing\` that did not exist, threw an unhandled exception mid-array, and left two earlier operations in that same patch already committed to the database. The invoice ended up with a new line item and no removed discount code, an inconsistent state no single operation would have produced on its own. The bug was never in add, remove, or replace. It was in how the suite tested the protocol around those operations: pointer escaping, sequential evaluation, and atomic failure. This article covers what a JSON Patch test suite actually needs to exercise under RFC 6902.

## How JSON Patch Differs From JSON Merge Patch

JSON Patch (RFC 6902, media type \`application/json-patch+json\`) is a body that is a JSON array of operation objects, each with an explicit \`op\` and one or more JSON Pointer paths. JSON Merge Patch (RFC 7396, media type \`application/merge-patch+json\`) is a different, much simpler mechanism: you send a partial document and \`null\` means delete a key. They are not interchangeable and testers sometimes conflate the two, which produces false negatives when a client sends a merge-patch-shaped body to a strict RFC 6902 endpoint and gets a 400.

A JSON Patch test suite should first assert that the endpoint rejects the wrong content type or the wrong body shape before it ever tests operation semantics:

| Sent body shape | Correct server behavior |
|---|---|
| Valid array of operation objects, correct content type | Process according to RFC 6902 |
| Bare object (merge-patch shape) sent as \`application/json-patch+json\` | 400, body is not an array |
| Array containing an object missing \`op\` or \`path\` | 400, malformed operation |
| Empty array \`[]\` | 200/204, no-op, resource unchanged |
| Correct array, wrong \`Content-Type\` header | 415 Unsupported Media Type |

That last row matters more than it looks. Servers that dispatch on body shape alone, ignoring \`Content-Type\`, will silently accept a JSON Patch array under a merge-patch header or vice versa. That is a real bug class, not a nitpick, because API gateways and proxies sometimes rewrite headers and a permissive server hides the mismatch until a client relies on merge semantics the server never actually implements.

## The Six Operations and Their Semantics

RFC 6902 defines exactly six operations. Each has required members beyond \`op\` and \`path\`, and each has a precisely defined effect. A test suite that only checks the happy path for each operation misses the boundary conditions that actually break in production.

| Operation | Required members | Effect | Common boundary to test |
|---|---|---|---|
| \`add\` | \`path\`, \`value\` | Inserts value at path; if path is an array index, existing element shifts right | Adding at an index equal to array length (valid, same as append) vs greater than length (error) |
| \`remove\` | \`path\` | Removes the value at path | Removing a path that does not exist must error, not no-op |
| \`replace\` | \`path\`, \`value\` | Replaces the value at path; path must already exist | Replacing a non-existent path must error, unlike \`add\` |
| \`move\` | \`from\`, \`path\` | Removes value at \`from\`, adds it at \`path\` | Moving a value into one of its own children must be rejected |
| \`copy\` | \`from\`, \`path\` | Copies value at \`from\` to \`path\` without removing the source | Copying from a path that does not exist must error |
| \`test\` | \`path\`, \`value\` | Asserts the value at path equals the given value; does not mutate | Deep equality, not reference equality, including key order independence for objects |

Two distinctions are easy to under-test. First, \`add\` on an existing object key overwrites it, but \`add\` on an array index inserts and shifts, it does not overwrite. A suite that only ever tests \`add\` against object keys will never catch a server that treats array \`add\` as a set-by-index operation instead of an insert. Second, \`replace\` requires the target to already exist and must fail if it does not, while \`add\` succeeds either way for an object member. These are opposite failure behaviors on adjacent operations and a copy-paste test helper that reuses the same "path exists" fixture for both will mask a server that implements them identically.

## JSON Pointer Escaping and the Array Append Token

Every \`path\`, \`from\`, and value-bearing pointer in a patch is a JSON Pointer per RFC 6901. Two escape sequences exist because \`/\` is the pointer's own separator and \`~\` is the escape character: \`~1\` decodes to a literal \`/\` inside a segment, and \`~0\` decodes to a literal \`~\`. Decoding order matters, \`~1\` must be resolved before \`~0\` is checked for further escaping, otherwise a segment like \`a~01\` (which should decode to \`a~1\`) gets mangled.

| Raw JSON Pointer segment | Decoded key | Notes |
|---|---|---|
| \`~1\` | \`/\` | Escapes the path separator |
| \`~0\` | \`~\` | Escapes the tilde itself |
| \`~01\` | \`~1\` | Tilde-escape resolved first, leaves literal \`~1\` |
| \`-\` | (append token) | Valid only as the final segment of an array path, means one past the last index |

The \`-\` token deserves its own dedicated test, not a variant of an existing one. Per the spec, \`-\` used with \`add\` refers to the (nonexistent) member after the last array element, meaning it is valid only as an append target. It is not a valid index for \`remove\`, \`replace\`, \`move\`, \`copy\`, or \`test\`, because those operations require the target to currently exist and \`-\` never points at an existing element. A server that implements \`-\` by literally computing \`array.length\` and then doing bounds-checked access for every operation, instead of special-casing it as append-only for \`add\`, will incorrectly allow \`"path": "/items/-"\` on a \`replace\`, silently doing nothing or throwing the wrong error code. Test both that \`add\` with \`-\` appends correctly and that every other operation rejects \`-\` with a 4xx.

Field names containing literal slashes or tildes are common in real payloads (content-type strings, file paths, compound keys), so pointer escaping is not an edge case to defer, it is baseline coverage for any patch endpoint whose schema allows such keys.

## Sequential Evaluation and Atomic Failure

RFC 6902 requires that operations in a patch array are applied in order, and that if any operation fails, application of the entire patch document must stop and the target document must not be updated at all, as if none of the operations had been applied. This is the property that broke in the opening scenario: the operations up to the failure point had already been written to the database before the failing operation was reached.

This means two things need separate test coverage. First, ordering: a patch that adds a field in operation 1 and then references that field in operation 2 (for instance, a \`test\` checking the value just added) must succeed, proving the server evaluates operations left to right against the evolving document, not against the original snapshot. Second, atomicity: a patch where the last operation fails must leave the resource completely unchanged, verified by re-fetching the resource after the failed PATCH and asserting it equals the pre-patch state, not partially applied.

\`\`\`json
[
  { "op": "add", "path": "/tags/-", "value": "urgent" },
  { "op": "test", "path": "/tags/0", "value": "billing" },
  { "op": "remove", "path": "/tags/5" }
]
\`\`\`

In this patch, if the ticket has fewer than six tags, the third operation fails with an out-of-bounds path. A compliant server returns an error status and the ticket keeps neither the appended \`"urgent"\` tag from operation 1 nor any effect of operation 2. Testing this requires a fixture where an earlier operation in the array is guaranteed to succeed and a later one is guaranteed to fail, then asserting on the post-failure GET, not just the PATCH response code.

\`\`\`ts
import { describe, it, expect, beforeEach } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('PATCH /tickets/:id atomicity', () => {
  let ticketId: string;

  beforeEach(async () => {
    const res = await fetch(\`\${BASE_URL}/tickets\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Refund request', tags: ['billing'] }),
    });
    const created = await res.json();
    ticketId = created.id;
  });

  it('leaves the resource unchanged when a later operation fails', async () => {
    const patch = [
      { op: 'add', path: '/tags/-', value: 'urgent' },
      { op: 'test', path: '/tags/0', value: 'billing' },
      { op: 'remove', path: '/tags/5' },
    ];

    const patchRes = await fetch(\`\${BASE_URL}/tickets/\${ticketId}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(patch),
    });

    expect(patchRes.status).toBeGreaterThanOrEqual(400);

    const after = await fetch(\`\${BASE_URL}/tickets/\${ticketId}\`);
    const afterBody = await after.json();

    expect(afterBody.tags).toEqual(['billing']);
    expect(afterBody.tags).not.toContain('urgent');
  });
});
\`\`\`

## Testing Add, Remove, and Replace With Vitest

The three mutating single-value operations share a shape but diverge on existence requirements. \`add\` on an object member always succeeds whether or not the key existed. \`replace\` requires the member to already exist. \`remove\` requires it to already exist. A parametrized test that runs the same "path exists" and "path does not exist" fixture pair against all three operations, asserting different expected outcomes per operation, is more reliable than three independently written test files, because it forces the same fixture data through divergent expected behavior instead of letting each file quietly assume its own default.

\`\`\`ts
import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('operation existence requirements', () => {
  const cases = [
    { op: 'add', path: '/nickname', expectMissingPathStatus: 200 },
    { op: 'replace', path: '/nickname', expectMissingPathStatus: 409 },
    { op: 'remove', path: '/nickname', expectMissingPathStatus: 409 },
  ];

  for (const { op, path, expectMissingPathStatus } of cases) {
    it(\`\${op} against a missing path returns \${expectMissingPathStatus}\`, async () => {
      const createRes = await fetch(\`\${BASE_URL}/users\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dana' }),
      });
      const user = await createRes.json();

      const body = op === 'remove' ? [{ op, path }] : [{ op, path, value: 'Dee' }];

      const patchRes = await fetch(\`\${BASE_URL}/users/\${user.id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json-patch+json' },
        body: JSON.stringify(body),
      });

      expect(patchRes.status).toBe(expectMissingPathStatus);
    });
  }
});
\`\`\`

If a server returns 200 for \`replace\` against a missing path, that is a spec violation worth catching before a client depends on it, because a caller who assumes \`replace\` is safe against a stale path will silently create data instead of getting the error that would have told them their local copy was out of date.

## Testing Move, Copy, and Test Operations

\`move\` and \`copy\` both use \`from\` instead of, or in addition to, \`path\`, and both need a check that the server rejects a \`from\` that does not exist. \`move\` has an additional constraint the spec calls out explicitly: the target \`path\` must not be a child of \`from\`, because that would require moving a value into itself, which is undefined. This is worth a dedicated negative test, since it is the one structural constraint among the six operations that is not simply about existence.

\`test\` is the operation most often under-tested because it does not mutate anything, so it is easy to assume it is low risk. In practice it is the operation clients rely on for optimistic concurrency inside the patch body itself, checking a version field or status before allowing the rest of the patch to proceed. Its equality semantics must be tested for objects and arrays, not just primitives: RFC 6902 requires deep, order-independent equality for object members and exact ordered equality for arrays.

| \`test\` comparison | Expected result |
|---|---|
| \`{"status": "open"}\` vs current \`{"status": "open"}\` | Pass |
| \`{"a": 1, "b": 2}\` vs current \`{"b": 2, "a": 1}\` | Pass, key order in objects is not significant |
| \`[1, 2, 3]\` vs current \`[3, 2, 1]\` | Fail, array order is significant |
| \`"3"\` vs current \`3\` | Fail, type mismatch, string is not number |
| Nested object with an extra unexpected key | Fail, must match exactly, not as a subset |

That last row is where implementations diverge most. A \`test\` value is a full equality check against the target, not a partial match, so a server that implements \`test\` as "does the target contain at least these keys" rather than exact deep equality will pass patches that a strict client assumes would fail, defeating the whole purpose of using \`test\` as a precondition guard.

## Concurrency Control With ETag and If-Match

JSON Patch operations describe changes relative to a document a client already read, so patch endpoints commonly pair with HTTP conditional requests to prevent lost updates. The server returns an \`ETag\` header on GET, and the client is expected to send that value back in an \`If-Match\` header on the PATCH. If the current resource's ETag no longer matches, the server must reject the patch with \`412 Precondition Failed\` before evaluating any operation, rather than applying the patch to a document the client did not actually see.

\`\`\`ts
import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('PATCH with If-Match concurrency control', () => {
  it('rejects a patch with a stale ETag', async () => {
    const getRes = await fetch(\`\${BASE_URL}/documents/doc-1\`);
    const etag = getRes.headers.get('etag');
    expect(etag).toBeTruthy();

    await fetch(\`\${BASE_URL}/documents/doc-1\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json',
        'If-Match': etag as string,
      },
      body: JSON.stringify([{ op: 'replace', path: '/title', value: 'First edit' }]),
    });

    const stalePatchRes = await fetch(\`\${BASE_URL}/documents/doc-1\`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json-patch+json',
        'If-Match': etag as string,
      },
      body: JSON.stringify([{ op: 'replace', path: '/title', value: 'Second edit' }]),
    });

    expect(stalePatchRes.status).toBe(412);
  });

  it('rejects a patch with no If-Match header when the resource requires one', async () => {
    const res = await fetch(\`\${BASE_URL}/documents/doc-1\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify([{ op: 'replace', path: '/title', value: 'Unsafe edit' }]),
    });

    expect(res.status).toBe(428);
  });
});
\`\`\`

The second test above matters as much as the first. A server that only checks \`If-Match\` when the header is present, and silently allows unconditional PATCH when it is absent, has not actually implemented concurrency control, it has implemented an optional courtesy check a careless client can bypass just by omitting the header. If the API contract requires conditional requests on that resource, missing \`If-Match\` should return \`428 Precondition Required\`, and that behavior needs its own assertion, separate from the stale-ETag case.

## Common Failure Modes to Cover in Your Test Suite

Beyond individual operations, a handful of cross-cutting failures recur across JSON Patch implementations and deserve explicit test cases rather than incidental coverage:

- A patch array containing a duplicate \`path\` target across two operations, where the second operation's success depends on the first having already run, verifying sequential state rather than a snapshot.
- A \`path\` that walks through a value which is not a container, for example \`/user/name/first\` where \`name\` is a string, must error rather than silently coercing.
- An out-of-range array index on \`add\`, meaning an index strictly greater than the current array length, must be rejected, since only an index equal to length (or \`-\`) is a valid append.
- A completely empty \`path\` (\`""\`), which per RFC 6901 refers to the whole document, and should be tested explicitly for \`test\` and \`replace\` against the root.
- Non-array top-level PATCH bodies sent with the correct \`application/json-patch+json\` content type, confirming the server validates shape before touching any operation logic.

None of these require exotic tooling, they require deliberately constructing fixtures where the general case and the boundary case diverge, then asserting on both the response status and the resource's actual post-request state. Broader endpoint testing discipline, including how PATCH fits alongside the rest of an API's contract, is covered in [API testing best practices](/blog/api-testing-best-practices-guide). If the PATCH endpoint is also described in an OpenAPI document, validating that the documented request and response schemas match this actual RFC 6902 behavior is its own layer of coverage, discussed in [OpenAPI 3.1 contract testing](/blog/openapi-3-1-contract-testing-guide-2026).

## Frequently Asked Questions

### Does JSON Patch guarantee atomic application across all operations in one request?

RFC 6902 requires it: if any operation in the array fails, the target document must be left unchanged, as though the patch was never applied. Server implementations that write each operation to storage as they process it, instead of building the result in memory and committing once, can violate this even while returning the correct error status code.

### What is the difference between add and replace when the target path already exists?

Both succeed and produce the same result when the target already exists. The difference is what happens when it does not: \`add\` creates it, \`replace\` must fail because there is nothing to replace.

### Why does the append token "-" only work with add?

The \`-\` token refers to the position one past the last array element, a position that does not yet hold a value. Operations like \`remove\`, \`replace\`, \`move\`, \`copy\`, and \`test\` all require the target to currently exist, and \`-\` by definition never points at an existing element, so it is only meaningful as an append target for \`add\`.

### How should a JSON Patch test suite verify the test operation's equality rules?

Cover object comparisons where key order differs but content matches (should pass), array comparisons where order differs (should fail), and comparisons where the target has extra keys beyond the tested value (should fail, since \`test\` requires exact deep equality, not a subset match).

### What HTTP status code should a stale If-Match precondition on a PATCH return?

412 Precondition Failed when the client sends an If-Match value that no longer matches the resource's current ETag. If the resource requires conditional requests and the client omits If-Match entirely, the correct response is 428 Precondition Required, a distinct case worth its own test.
`,
};
