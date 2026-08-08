import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Partial Update PATCH Semantics Without Ambiguity',
  description: 'Master API testing partial update PATCH semantics with runnable tests for omission, null, arrays, validation, authorization, idempotency, and concurrency.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# API Testing Partial Update PATCH Semantics Without Ambiguity

API testing partial update PATCH semantics starts by proving what each input state means. For every mutable field, test omission, an explicit value, \`null\`, an invalid value, and an unauthorized change. Then verify both the response and the persisted resource. A PATCH endpoint is correct only when it changes the requested fields and preserves everything the request did not target.

The media type defines the update language. \`application/merge-patch+json\` treats an object as a merge document and gives \`null\` deletion semantics. \`application/json-patch+json\` sends an ordered list of operations such as \`add\`, \`remove\`, \`replace\`, and \`test\`. A custom \`application/json\` body can work, but its omission, null, array, and nesting rules must be specified by the API. Tests should never infer those rules from the word PATCH alone.

This guide uses TypeScript, Express-style handlers, Vitest, and Supertest examples. The workflow is portable: publish the patch dialect, build a field-state matrix, assert atomicity and authorization, and exercise stale concurrent writes with validators such as ETags.

## Start with the protocol contract

HTTP PATCH is defined by RFC 5789 at https://www.rfc-editor.org/rfc/rfc5789. The request carries instructions for modifying an existing resource. Unlike PUT, it does not inherently mean "send the complete replacement." Unlike POST, its target and intent are specifically an update to the identified resource.

PATCH does not prescribe one JSON shape. The \`Content-Type\` tells the server how to interpret the document. Two standardized JSON formats have materially different behavior:

| Format | Media type | Document shape | Important semantic |
|---|---|---|---|
| JSON Merge Patch | \`application/merge-patch+json\` | Object-like replacement fragment | \`null\` removes an object member |
| JSON Patch | \`application/json-patch+json\` | Ordered array of operations | Paths and operation order matter |
| API-specific partial object | Often \`application/json\` | Defined by that API | Omission and null need explicit rules |

JSON Merge Patch is defined by RFC 7396 at https://www.rfc-editor.org/rfc/rfc7396. JSON Patch is defined by RFC 6902 at https://www.rfc-editor.org/rfc/rfc6902. Tests should send the declared media type, because a server that accepts the right shape under the wrong type may create interoperability problems for clients and gateways.

The \`Accept-Patch\` response header can advertise supported patch document media types. Test it if discovery is part of the contract, often on an OPTIONS response. Do not assume every framework creates this header automatically.

## Turn each mutable field into a state matrix

Suppose a user profile has mutable \`displayName\`, \`bio\`, \`timezone\`, and \`tags\` fields. Begin with a fully populated baseline. Each test changes one dimension and reloads the resource. This makes preservation failures visible.

| Request state for \`bio\` | Possible intended meaning | Required assertion |
|---|---|---|
| Member omitted | Leave current value unchanged | Stored bio remains identical |
| Non-empty string | Replace current value | Stored bio equals input |
| Empty string | Store empty text or reject by rule | Response and storage match documented rule |
| Explicit \`null\` | Clear, remove, or reject | Exact null policy is enforced |
| Wrong type | Reject document | No field changes persist |

Repeat that reasoning for objects and arrays. Arrays are especially important under merge patch: the supplied array replaces the target array as a whole. Merge Patch does not provide an operation that appends one array item. A custom API that appends must say so and should use a request shape that makes the operation clear.

Use a builder that gives every test a known baseline:

\`\`\`ts
export type Profile = {
  id: string;
  displayName: string;
  bio: string | null;
  timezone: string;
  tags: string[];
  revision: number;
};

export function profileFixture(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'usr_42',
    displayName: 'Asha Rao',
    bio: 'Quality engineer',
    timezone: 'Asia/Kolkata',
    tags: ['api', 'automation'],
    revision: 7,
    ...overrides,
  };
}
\`\`\`

This baseline makes a subtle destructive bug easy to spot. If patching \`displayName\` resets \`tags\` to an empty array, the response and reload assertions fail. A fixture containing only the changed field would miss that data loss.

## Implement omission without confusing it with undefined

JavaScript creates a trap: reading an absent property and reading a property whose value is \`undefined\` both produce \`undefined\`. JSON cannot transmit \`undefined\`, but request objects can be transformed before they reach domain code. Use an own-property check when presence is significant.

The following API-specific partial updater allows \`bio: null\` to clear the bio, prohibits null for the required fields, and replaces \`tags\` as a complete array. It rejects unknown members rather than silently ignoring misspellings.

\`\`\`ts
import type { Profile } from './profile-fixture';

type PatchBody = Record<string, unknown>;

const allowedKeys = new Set(['displayName', 'bio', 'timezone', 'tags']);

export function applyProfilePatch(current: Profile, body: PatchBody): Profile {
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) throw new Error(\`unknown field: \${key}\`);
  }

  const next: Profile = { ...current, tags: [...current.tags] };

  if (Object.hasOwn(body, 'displayName')) {
    if (typeof body.displayName !== 'string' || body.displayName.trim() === '') {
      throw new Error('displayName must be a non-empty string');
    }
    next.displayName = body.displayName;
  }

  if (Object.hasOwn(body, 'bio')) {
    if (body.bio !== null && typeof body.bio !== 'string') {
      throw new Error('bio must be a string or null');
    }
    next.bio = body.bio as string | null;
  }

  if (Object.hasOwn(body, 'timezone')) {
    if (typeof body.timezone !== 'string') throw new Error('timezone must be a string');
    next.timezone = body.timezone;
  }

  if (Object.hasOwn(body, 'tags')) {
    if (!Array.isArray(body.tags) || !body.tags.every((tag) => typeof tag === 'string')) {
      throw new Error('tags must be an array of strings');
    }
    next.tags = [...body.tags];
  }

  next.revision += 1;
  return next;
}
\`\`\`

This is a custom partial-object contract, not a generic JSON Merge Patch implementation. That distinction belongs in documentation and tests. If the endpoint claims \`application/merge-patch+json\`, implement all relevant RFC behavior, including object recursion and null member removal, or use a reviewed implementation.

Unit tests should prove preservation and explicit clearing:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { applyProfilePatch } from './apply-profile-patch';
import { profileFixture } from './profile-fixture';

describe('applyProfilePatch', () => {
  it('changes one member and preserves omitted members', () => {
    const current = profileFixture();
    const next = applyProfilePatch(current, { displayName: 'Asha R.' });

    expect(next).toMatchObject({
      displayName: 'Asha R.',
      bio: 'Quality engineer',
      timezone: 'Asia/Kolkata',
      tags: ['api', 'automation'],
      revision: 8,
    });
  });

  it('distinguishes clearing from omission', () => {
    const current = profileFixture();
    expect(applyProfilePatch(current, {}).bio).toBe('Quality engineer');
    expect(applyProfilePatch(current, { bio: null }).bio).toBeNull();
  });
});
\`\`\`

## Verify the wire behavior with Supertest

Unit coverage of the merge function is not enough. Middleware may reject the content type, strip a field, coerce a value, or serialize the response incorrectly. Wire-level tests should construct the application with a disposable repository and assert a subsequent GET or direct repository read.

The following test assumes \`createApp\` accepts a repository whose \`get\` and \`save\` methods are used by the PATCH route. It sends a custom JSON partial document, matching the function above.

\`\`\`ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { MemoryProfileRepository } from './memory-profile-repository';
import { profileFixture } from './profile-fixture';

describe('PATCH /profiles/:id', () => {
  let repository: MemoryProfileRepository;

  beforeEach(() => {
    repository = new MemoryProfileRepository([profileFixture()]);
  });

  it('updates displayName without erasing other fields', async () => {
    const app = createApp({ profiles: repository });

    const response = await request(app)
      .patch('/profiles/usr_42')
      .set('Content-Type', 'application/json')
      .send({ displayName: 'Asha R.' })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toMatchObject({
      id: 'usr_42',
      displayName: 'Asha R.',
      bio: 'Quality engineer',
      timezone: 'Asia/Kolkata',
      tags: ['api', 'automation'],
    });

    const stored = await repository.get('usr_42');
    expect(stored).toEqual(expect.objectContaining(response.body));
  });
});
\`\`\`

The [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) covers application construction and response assertions in more depth. For PATCH, the extra obligation is to assert untouched stored members, not just the changed response member.

Choose and document the success response. An API may return \`200 OK\` with the updated representation or \`204 No Content\` without a body. Tests should match the documented choice. They should not insist that all PATCH APIs return one universal status.

## Prove JSON Merge Patch behavior recursively

Merge Patch is compact for object-shaped resources. If a member in the patch contains an object and the corresponding target member is an object, processing recurses. Other supplied values replace the target value. A null member removes the named member from an object.

Consider this original document and patch:

\`\`\`json
{
  "displayName": "Asha Rao",
  "preferences": {
    "theme": "dark",
    "digest": "weekly"
  },
  "tags": ["api", "automation"]
}
\`\`\`

\`\`\`json
{
  "preferences": {
    "digest": "daily"
  },
  "tags": ["contract"],
  "displayName": null
}
\`\`\`

The result preserves \`preferences.theme\`, changes \`preferences.digest\`, replaces the entire tags array, and removes \`displayName\`. This raises an important modeling limitation: Merge Patch cannot distinguish "set this member to JSON null" from its null-as-removal instruction. If stored null is a meaningful state, use another operation shape or define a different API contract.

Test the semantics as a matrix:

| Target | Merge patch | Expected result | Risk covered |
|---|---|---|---|
| Nested preferences object | One nested member | Sibling preserved | Shallow-spread data loss |
| Existing object member | \`null\` | Member removed | Null treated as stored value |
| Existing array | New array | Whole array replaced | Accidental append or union |
| Any document | Non-object patch | Whole target replaced | Assumption that all patches are objects |

That final row is often missed. RFC 7396 defines replacement behavior when the patch is not an object. An endpoint may constrain its accepted documents through resource rules, but then tests should expect a deliberate validation response rather than accidentally applying a shallow merge.

## Exercise JSON Patch paths and operation order

JSON Patch is useful when clients need precise array operations, explicit removal, or optimistic assertions through the \`test\` operation. Each operation has an \`op\` and a \`path\`, with additional members depending on the operation. Paths use JSON Pointer syntax.

\`\`\`json
[
  { "op": "test", "path": "/revision", "value": 7 },
  { "op": "replace", "path": "/displayName", "value": "Asha R." },
  { "op": "add", "path": "/tags/-", "value": "contract" },
  { "op": "remove", "path": "/bio" }
]
\`\`\`

The operations are applied in order, so changing their order can change the outcome. The special \`-\` array index addresses the position after the last element for an add operation. Do not write a homegrown parser unless the API's needs are tiny and the implementation is rigorously reviewed. JSON Pointer escaping and array bounds contain edge cases that mature libraries are better positioned to handle.

An endpoint test should prove media-type enforcement and the final complete state:

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { app } from './test-app';

it('applies ordered JSON Patch operations', async () => {
  const operations = [
    { op: 'test', path: '/revision', value: 7 },
    { op: 'replace', path: '/displayName', value: 'Asha R.' },
    { op: 'add', path: '/tags/-', value: 'contract' },
    { op: 'remove', path: '/bio' },
  ];

  const response = await request(app)
    .patch('/profiles/usr_42')
    .set('Content-Type', 'application/json-patch+json')
    .send(operations)
    .expect(200);

  expect(response.body.displayName).toBe('Asha R.');
  expect(response.body.tags).toEqual(['api', 'automation', 'contract']);
  expect(response.body).not.toHaveProperty('bio');
});
\`\`\`

Add negative cases for a missing path, invalid array index, unsupported operation, malformed pointer, failed \`test\`, and an operation that targets a protected member. Assert atomicity according to your documented contract. A partially applied operation list can leave a resource in a state no client requested.

## Reject invalid patches atomically

Validation has at least three layers: document syntax, operation or field shape, and resulting resource invariants. A request can be valid JSON and still be an invalid patch document. A structurally valid patch can produce an invalid business state.

For example, an event may require \`startsAt < endsAt\`. Updating only \`startsAt\` must be checked against the current \`endsAt\`, not validated in isolation. Apply changes to a candidate copy, validate the complete candidate, then persist once inside an appropriate transaction.

| Failure | Example | Expected protection |
|---|---|---|
| Malformed JSON | Truncated request body | No handler mutation |
| Unknown member | \`dispalyName\` typo | Reject, do not ignore silently |
| Wrong type | \`tags: "api"\` | No resource changes |
| Cross-field violation | Start after end | Candidate rejected atomically |
| Storage conflict | Unique value already used | Transaction rolls back |

A negative endpoint test should reload the record:

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { app, profiles } from './test-app';

it('does not persist valid fields when another field is invalid', async () => {
  const before = await profiles.get('usr_42');

  await request(app)
    .patch('/profiles/usr_42')
    .send({ displayName: 'Changed', tags: 'not-an-array' })
    .expect(400);

  const after = await profiles.get('usr_42');
  expect(after).toEqual(before);
});
\`\`\`

Whether validation uses \`400 Bad Request\` or \`422 Unprocessable Content\` is an API design choice with ecosystem conventions. Test the published contract consistently rather than presenting one as universally required. Keep error bodies stable enough for clients to identify the failing member without depending on human wording.

## Test authorization at the field and path level

Route-level authorization answers whether the caller may attempt to update a profile. PATCH also needs field-level authorization. A normal user may edit \`displayName\` but not \`role\`, \`accountId\`, \`creditBalance\`, or server-managed timestamps.

Do not solve this by deleting forbidden fields from the body and continuing. Silent filtering tells the caller the request succeeded while hiding that part of it was ignored. It also makes mass-assignment vulnerabilities harder to notice. Reject the document and prove that no permitted sibling change persisted.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { app, profiles } from './test-app';

it('rejects a protected member without applying allowed siblings', async () => {
  const before = await profiles.get('usr_42');

  await request(app)
    .patch('/profiles/usr_42')
    .set('Authorization', 'Bearer regular-user-test-token')
    .send({ displayName: 'Changed', role: 'admin' })
    .expect(403);

  expect(await profiles.get('usr_42')).toEqual(before);
});
\`\`\`

For JSON Patch, inspect every path, including \`from\` on \`move\` and \`copy\` operations. Path authorization should use decoded JSON Pointer segments, not an unsafe string-prefix test. A path that visually starts like an allowed path may refer to a different escaped member.

## Separate repeatability from idempotency

PATCH is not guaranteed to be idempotent by the HTTP method definition. A given patch format or operation may be idempotent. Replacing \`displayName\` with a fixed value produces the same resource when repeated. Appending to an array can add duplicates. An increment operation in a custom API changes the resource each time.

| Patch instruction | Repeated outcome | Idempotent? |
|---|---|---|
| Merge \`{ "timezone": "UTC" }\` | Same final timezone | Yes for that state |
| JSON Patch replace fixed value | Same final value if path remains valid | Generally yes |
| JSON Patch add to \`/tags/-\` | Another item may be appended | No |
| Custom increment by one | Value increases again | No |

Tests should reflect the operation's declared behavior. Do not add a generic "send every PATCH twice" assertion and call failures server bugs. For non-idempotent operations exposed to automatic retries, consider an idempotency-key design appropriate to the API and test replay handling explicitly.

Even an idempotent state transition can produce non-idempotent side effects if implementation is careless. Repeating a request that sets \`emailVerified: true\` should not send the same welcome event repeatedly unless that is deliberate. Assert emitted events, audit records, and revision changes where they are contractual.

## Protect against lost updates with conditional requests

Partial updates reduce the surface of a lost update but do not eliminate it. Two clients can read revision 7, calculate changes, and write in conflicting order. HTTP conditional requests let a client say which representation it modified. A common pattern returns an ETag on GET and requires \`If-Match\` on PATCH.

\`\`\`http
GET /profiles/usr_42 HTTP/1.1
Accept: application/json

HTTP/1.1 200 OK
ETag: "profile-7"
Content-Type: application/json

{"id":"usr_42","displayName":"Asha Rao","revision":7}
\`\`\`

Client A patches with \`If-Match: "profile-7"\` and receives a new representation with a new ETag. Client B's request using the stale validator must fail without mutation. RFC 9110 defines conditional request semantics at https://www.rfc-editor.org/rfc/rfc9110.

\`\`\`ts
import request from 'supertest';
import { expect, it } from 'vitest';
import { app } from './test-app';

it('rejects a stale conditional patch', async () => {
  const initial = await request(app).get('/profiles/usr_42').expect(200);
  const etag = initial.headers.etag;
  expect(typeof etag).toBe('string');

  await request(app)
    .patch('/profiles/usr_42')
    .set('If-Match', etag)
    .send({ timezone: 'UTC' })
    .expect(200);

  await request(app)
    .patch('/profiles/usr_42')
    .set('If-Match', etag)
    .send({ displayName: 'Stale writer' })
    .expect(412);

  const current = await request(app).get('/profiles/usr_42').expect(200);
  expect(current.body.timezone).toBe('UTC');
  expect(current.body.displayName).toBe('Asha Rao');
});
\`\`\`

The repository update itself must compare the expected revision atomically. Checking in application code and issuing an unconditional update creates a race between the check and write. Tests that launch two requests together can expose the issue, but the durable fix belongs in the storage operation.

## Keep response contracts and provider behavior aligned

PATCH contract coverage should describe supported media types, request schema, nullable fields, immutable fields, error shapes, response representation, and concurrency requirements. Schema validation alone cannot express all update semantics. An OpenAPI schema may distinguish required request members, but it will not prove that omitted persisted members were preserved.

Consumer-driven contract tests are useful when clients rely on a specific partial-update behavior. A consumer can capture the request media type, the minimal patch body, conditional header, and relevant response fields. The provider must still run stateful tests to prove persistence and atomicity. The [Pact contract testing guide](/blog/contract-testing-pact-complete-guide) explains how consumer expectations and provider verification fit together.

When evolving a patch contract, treat these as potentially breaking changes:

- Changing null from "clear" to "reject."
- Switching array behavior from replacement to merge.
- Rejecting a field that clients previously updated.
- Changing from a representation response to no content.
- Requiring a conditional header that was previously optional.
- Changing the patch media type while keeping the same route.

Versioning discussions should consider behavior, not only JSON shape. A generated client cannot protect consumers from a semantic change that leaves the schema looking compatible.

## Diagnose the disappearing nested settings failure

A realistic failure appears when a user patches \`{ "preferences": { "digest": "daily" } }\` and the saved resource loses \`preferences.theme\`. The endpoint claims Merge Patch support. Unit tests pass because they only assert the changed digest value. Production users suddenly revert to the default theme.

Trace the update from wire to storage. Confirm the \`Content-Type\`. Log the parsed patch and original target in a safe test environment. Inspect the merge implementation. A shallow spread such as \`{ ...current, ...patch }\` replaces the entire \`preferences\` object, but Merge Patch requires recursive object processing in this case. Then inspect persistence, because an ORM update can also replace a JSON column even when the in-memory candidate was merged correctly.

Add a regression test with a populated sibling at every nested level that matters. Assert the full stored preferences object after reloading it. If the server never intended RFC 7396 behavior, stop advertising \`application/merge-patch+json\` and document its custom object replacement rules. The fix is semantic alignment, not merely changing one expectation.

## What people get wrong about PATCH testing

The biggest error is treating PATCH as "PUT with fewer required fields." That mindset validates only the supplied values and forgets preservation, null meaning, operation ordering, authorization by path, and resulting-resource invariants. Partial input does not mean partial validation of the final state.

Another mistake is asserting only the response. A handler can construct the correct response while the repository drops a nested value, fails to update, or commits part of an invalid patch. Reload the resource through an independent read path for persistence-critical tests.

Teams also overgeneralize idempotency. The method itself does not promise that every patch document is safe to repeat. Classify the actual operation, then test retry behavior and side effects. Finally, accepting unknown members for forward compatibility often hides client typos. If silent ignore is intentional, test and document it. For most operational APIs, a clear rejection is easier to debug.

## Build a focused PATCH regression suite

A maintainable suite layers fast pure-function tests, route tests, repository integration tests, and a few concurrency scenarios. Parameterize repeated field-state checks, but preserve descriptive case names and full-state assertions.

Use this release checklist:

| Coverage area | Minimum proof | Typical hidden bug |
|---|---|---|
| Media type | Supported accepted, unsupported rejected | Parser handles body under wrong semantics |
| Preservation | Omitted scalar, object sibling, and array unchanged | Defaults overwrite stored values |
| Null and empty | Each nullable field's rule | Null becomes omission through mapping |
| Validation | Invalid candidate leaves storage unchanged | Partial transaction commit |
| Authorization | Protected path rejects entire document | Mass assignment |
| Concurrency | Stale validator cannot overwrite | Check-then-write race |
| Side effects | Events emitted once as specified | Retry duplicates notification |

Give an AI coding agent the media type RFC, resource schema, mutable-field allowlist, and concurrency policy before asking it to generate tests. Ask for the field-state matrix first, then review whether the code reloads persisted state. Generated PATCH tests often check the changed key only, confuse Merge Patch with a shallow object spread, or use a valid JSON body with the wrong content type.

The resulting suite should answer precise questions: What does omission do? Can null be stored? Are arrays replaced or edited? Is the operation atomic? Can this caller modify this path? What happens when two revisions compete? Once those answers are executable, PATCH stops being a vague partial update and becomes a stable protocol.

## Frequently Asked Questions

### Does PATCH always mean JSON Merge Patch?

No. PATCH is an HTTP method, while the request media type defines the patch document format. An endpoint can support JSON Merge Patch, JSON Patch, or a documented domain-specific format. Send the matching \`Content-Type\` and test unsupported types. If an API accepts ordinary \`application/json\`, its documentation must define omission, null, nested objects, arrays, validation, and atomicity because those behaviors cannot be inferred from PATCH itself.

### Should an empty PATCH request succeed?

That depends on the advertised patch format and API policy. An empty Merge Patch object normally leaves an object target unchanged, while an empty JSON Patch array performs no operations. An API may still reject no-op requests for business reasons. Test the documented choice, including whether a successful no-op changes the ETag, revision, audit log, or update timestamp. Those side effects should be deliberate and consistent rather than accidental consequences of always issuing a database update.

### How do I test that omitted fields were preserved?

Create a baseline resource with distinctive non-default values in every relevant scalar, nested object, and array. Send a patch containing only one target change. Assert the complete response, then reload through the repository or GET endpoint and compare every untouched value with the baseline. Include nested siblings because shallow merges commonly erase them. Avoid fixtures filled with defaults, since an accidental reset can look identical to correct preservation.

### When should a PATCH endpoint require If-Match?

Require a precondition when overwriting a change made from stale state would harm users or violate workflow rules. Return a validator such as an ETag with the representation, require the client to send it in \`If-Match\`, and make the storage update compare the expected version atomically. Test one successful update followed by a second request using the stale validator. The stale request must fail without modifying data or emitting success side effects.
`,
};
