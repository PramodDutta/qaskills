import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Conditional Requests ETag Guide for Reliable Caching and Updates',
  description: 'Use this api testing conditional requests etag guide to verify cache validators, lost-update protection, and reliable 304 and 412 behavior in CI.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# API Testing Conditional Requests ETag Guide for Reliable Caching and Updates

An API testing conditional requests ETag guide should prove two behaviors: unchanged representations can be validated without resending the full body, and stale writes are rejected before they overwrite newer data. In practice that means testing \`ETag\`, \`If-None-Match\`, and \`If-Match\` together, then checking status codes, response bodies, headers, and the persisted resource version.

QA engineers often treat ETags as a browser-cache feature and stop after one \`304 Not Modified\` test. That leaves a major gap. The same validator can protect an edit screen, a mobile offline sync flow, an AI agent that retries tool calls, or any client that reads a resource, thinks for a while, and sends an update. If the server accepts a stale update, the bug is not a cosmetic HTTP issue. It is lost data.

This guide uses a fictional document API, but the workflow applies to REST resources such as profiles, invoices, test cases, feature flags, and configuration records. The examples use Supertest-style TypeScript tests where appropriate, but the assertions are portable to Postman collections, Playwright API tests, contract tests, or any HTTP client your CI can run.

## Define which representation the ETag validates

An ETag is an HTTP entity tag. Servers use it as a validator for a representation of a resource. The key testing question is not “does the response contain an ETag?” The key question is “what exact representation does this ETag validate?” If the API returns a public view that excludes internal fields, the ETag should usually change when that public view changes, not when an unrelated audit column changes. If the endpoint returns language-specific or compressed variants, validators may vary with representation metadata.

Write this contract down before automating. Otherwise tests will accidentally encode an implementation detail, such as a database row version, that may not match the API's documented representation.

| Contract point | Question to answer | Test evidence |
|---|---|---|
| Validator type | Are ETags strong, weak, or intentionally opaque? | Header format and supported comparison behavior |
| Resource scope | Does one ETag identify the item, collection page, or specific projection? | Different endpoints and query parameters |
| Change trigger | Which fields should produce a new validator? | Update material and non-material fields separately |
| Read condition | Does \`If-None-Match\` return \`304\` when unchanged? | Repeat GET with current validator |
| Write condition | Does \`If-Match\` reject stale updates? | Competing update followed by stale write |
| Missing precondition | Are unsafe writes allowed without \`If-Match\`? | Product policy test for absent header |

The validator value should be treated as opaque by clients and tests. Do not parse it unless the API contract explicitly documents its structure. A test that assumes the ETag equals a version number will fail after a legitimate implementation change, for example switching from a row version to a hash of the serialized response. Assert equality or inequality, not meaning.

For endpoint setup, app bootstrapping, and request helper patterns, the [complete Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) pairs well with the conditional request tests below.

## Build a resource fixture that captures headers and body together

A conditional request test needs three facts from a fresh resource: the resource identifier, the body, and the current \`ETag\` header. Do not bury the header in a generic request helper that returns only JSON. Conditional logic lives in headers, so the test harness must make headers first-class.

\`\`\`ts
import request from 'supertest';
import { app } from '../src/app';

type CreatedDocument = {
  id: string;
  etag: string;
  body: {
    id: string;
    title: string;
    content: string;
  };
};

async function createDocument(title: string): Promise<CreatedDocument> {
  const response = await request(app)
    .post('/documents')
    .send({ title, content: 'Initial content' })
    .expect(201);

  const etag = response.headers.etag;
  if (!etag) {
    throw new Error('POST /documents did not return an ETag');
  }

  return { id: response.body.id, etag, body: response.body };
}
\`\`\`

This helper intentionally fails if the creation response lacks an ETag. Some APIs expose validators only on GET, and that can be fine if documented. In that case, change the helper to perform a GET immediately after creation. What matters is that every test starts from a known current validator, not from a guessed value.

If your app returns quoted ETags, keep the quotes exactly as received when sending conditional headers. HTTP ETag syntax includes quoted values. Do not trim, lowercase, hash again, or parse the token. Supertest lets you pass the header value directly.

## Verify conditional GET without weakening the oracle

The simplest useful read test is: create a document, GET it to capture a validator, GET again with \`If-None-Match\`, and expect \`304 Not Modified\`. The response should not include the full representation because the client already has it. Depending on your framework and middleware, headers such as \`ETag\` and cache directives may still be present. Assert only the behavior your contract promises.

\`\`\`ts
it('returns 304 when the client already has the current representation', async () => {
  const created = await createDocument('Caching contract');

  const firstRead = await request(app)
    .get('/documents/' + created.id)
    .expect(200);

  const currentEtag = firstRead.headers.etag;
  expect(currentEtag).toBeTruthy();

  const conditionalRead = await request(app)
    .get('/documents/' + created.id)
    .set('If-None-Match', currentEtag)
    .expect(304);

  expect(conditionalRead.text).toBe('');
});
\`\`\`

Do not require the 304 response body to equal an empty JSON object. A 304 response is not a normal JSON representation. Many servers send no body. The important assertion is that the server recognized the validator and avoided sending the representation again. If your test client automatically parses JSON, check the raw text or the absence of a body according to that client.

Now test the opposite condition: after a material change, the old validator must not produce a \`304\`. The server should return the current representation with a new validator.

\`\`\`ts
it('returns the updated representation when If-None-Match is stale', async () => {
  const created = await createDocument('Original title');

  await request(app)
    .patch('/documents/' + created.id)
    .set('If-Match', created.etag)
    .send({ title: 'Updated title' })
    .expect(200);

  const staleRead = await request(app)
    .get('/documents/' + created.id)
    .set('If-None-Match', created.etag)
    .expect(200);

  expect(staleRead.body.title).toBe('Updated title');
  expect(staleRead.headers.etag).toBeTruthy();
  expect(staleRead.headers.etag).not.toBe(created.etag);
});
\`\`\`

This catches a common bug: the update writes the database row but the ETag middleware hashes only the route path or the original object loaded before mutation. The user sees updated data, but caches and clients think the representation never changed.

## Test lost-update prevention with If-Match

\`If-Match\` is the conditional request header that matters for safe updates. A client sends the ETag it last saw. The server applies the update only if the current representation still matches that validator. If another actor has changed the resource, the server should reject the stale write. Many APIs use \`412 Precondition Failed\` for this case.

The test needs two clients or two logical actors. They can be two API calls in one test, as long as you model the timeline clearly.

| Step | Actor | Request | Expected result |
|---|---|---|---|
| 1 | Client A | GET document | Receives ETag A |
| 2 | Client B | PATCH with ETag A | Update succeeds, resource moves to ETag B |
| 3 | Client A | PATCH with stale ETag A | Update is rejected |
| 4 | Test | GET document | Confirms Client B's change remains |

\`\`\`ts
it('rejects a stale update instead of overwriting a newer version', async () => {
  const created = await createDocument('Release checklist');

  const clientARead = await request(app)
    .get('/documents/' + created.id)
    .expect(200);

  const etagA = clientARead.headers.etag;

  const clientBUpdate = await request(app)
    .patch('/documents/' + created.id)
    .set('If-Match', etagA)
    .send({ content: 'Client B update' })
    .expect(200);

  expect(clientBUpdate.headers.etag).not.toBe(etagA);

  await request(app)
    .patch('/documents/' + created.id)
    .set('If-Match', etagA)
    .send({ content: 'Client A stale update' })
    .expect(412);

  const finalRead = await request(app)
    .get('/documents/' + created.id)
    .expect(200);

  expect(finalRead.body.content).toBe('Client B update');
});
\`\`\`

This is stronger than asserting only the \`412\`. It verifies that the stale request did not partially apply. If the API updates the title before checking the precondition, or writes to an audit table while rejecting the main row, a status-code-only test will miss it. For business-critical resources, assert all side effects that should not happen: no duplicate event, no second revision, no notification, and no background job.

Some APIs require \`If-Match\` on unsafe methods and return a client error when it is missing. Others allow last-write-wins behavior for selected endpoints. Test the documented policy explicitly. Do not assume every PATCH without a precondition is a defect unless the product contract says it is.

\`\`\`ts
it('requires If-Match for document updates when the contract demands it', async () => {
  const created = await createDocument('Precondition required');

  await request(app)
    .patch('/documents/' + created.id)
    .send({ title: 'No precondition' })
    .expect(428);
});
\`\`\`

\`428 Precondition Required\` is a standard status code, but your API may use a different documented client error. The test should reflect the contract. What matters is that clients receive a clear signal that they must read the current validator before editing.

## Separate strong validators, weak validators, and update guards

One thing people get wrong is assuming every ETag can safely guard writes. HTTP defines weak validators, commonly shown with a \`W/\` prefix, that are suitable for semantic equivalence in caching but not for every byte-level comparison. For write preconditions, your API should document whether weak validators are allowed, rejected, or never produced.

Do not invent behavior in tests. Inspect what the server returns and test only the supported path. A decision matrix helps reviewers understand why the suite covers certain combinations and skips others.

| Validator returned by API | Conditional GET expectation | Conditional write expectation | Test note |
|---|---|---|---|
| Strong ETag | Can validate unchanged representation | Often appropriate for \`If-Match\` | Most common for editable JSON resources |
| Weak ETag | Can support cache revalidation | Usually not treated as a strong edit token | Do not force unsafe write semantics |
| No ETag, Last-Modified only | Use date-based conditions if documented | Lower precision can miss rapid updates | Needs clock-aware tests |
| Version field in JSON only | Not an HTTP cache validator by itself | Can guard writes if API contract says so | Test separately from ETag behavior |

If your API returns weak ETags for GET and a separate revision token for writes, keep the tests separate. Call the HTTP cache validator an ETag test. Call the write token a concurrency-control test. Mixing terms leads to inaccurate docs and brittle clients.

## Exercise collections, query parameters, and projections

Item endpoints are only part of the surface. Collection endpoints often return ETags too, and they are easier to implement incorrectly. A collection validator should account for the representation returned by that exact request, including filters, pagination, sorting, projection, and tenant context. If \`GET /documents?owner=me\` and \`GET /documents?owner=team\` return different bodies, their validators should not be accidentally interchangeable.

\`\`\`ts
it('does not reuse a collection ETag across different filters', async () => {
  await createDocument('Owned by me');
  await createDocument('Shared with team');

  const mine = await request(app)
    .get('/documents')
    .query({ owner: 'me' })
    .expect(200);

  const team = await request(app)
    .get('/documents')
    .query({ owner: 'team' })
    .set('If-None-Match', mine.headers.etag)
    .expect(200);

  expect(team.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: 'Shared with team' }),
    ]),
  );
});
\`\`\`

This test does not require the two ETags to differ directly, although that may be a useful assertion if your server promises unique validators per representation. The more important behavior is that a validator from one filtered representation must not suppress a different filtered response.

For paginated collections, create or choose data that changes one page but not another. Then verify that only the affected page's validator changes. This catches overly broad validators that invalidate every collection request on any write, which can destroy cache efficiency, and overly narrow validators that miss membership changes.

## Add contract tests for consumers that depend on validators

When a specific consumer relies on ETags, capture that expectation in a contract. Pact and similar tools are useful when the consumer needs the provider to return a validator header, honor a conditional request, or reject stale writes with a structured error. Contract tests should not replace provider integration tests, but they prevent accidental removal of headers or error fields that clients use.

The [complete Pact contract testing guide](/blog/contract-testing-pact-complete-guide) is the deeper reference for consumer-provider workflows. For ETags, keep the contract focused on observable HTTP behavior.

\`\`\`json
{
  "description": "a document read includes a validator for future updates",
  "request": {
    "method": "GET",
    "path": "/documents/doc-123"
  },
  "response": {
    "status": 200,
    "headers": {
      "ETag": "\\"opaque-validator\\"",
      "Content-Type": "application/json"
    },
    "body": {
      "id": "doc-123",
      "title": "Release checklist"
    }
  }
}
\`\`\`

The JSON snippet has escaped quote characters because an ETag header value often includes quotes. In your actual contract file, use the syntax your contract framework expects.

For a stale-write response, contract the fields the client displays or branches on. Avoid asserting an entire generated error envelope unless the envelope is stable by contract.

\`\`\`json
{
  "description": "a stale document update is rejected",
  "request": {
    "method": "PATCH",
    "path": "/documents/doc-123",
    "headers": {
      "If-Match": "\\"old-validator\\""
    },
    "body": {
      "title": "Stale title"
    }
  },
  "response": {
    "status": 412,
    "body": {
      "code": "stale_resource",
      "message": "The document changed before your update was applied."
    }
  }
}
\`\`\`

Provider-side tests still need to prove the actual version changes and stale writes are blocked. The contract only says that a consumer and provider agree on the shape of the interaction.

## Diagnose realistic ETag failures

The most realistic failure mode is stale validators caused by a mismatch between serialization and mutation. A service returns an ETag based on \`updatedAt\`, but the update path changes child records without touching the parent timestamp. The visible document includes those child records, yet the ETag stays the same. Clients send \`If-None-Match\`, receive \`304\`, and keep displaying stale content.

Diagnose that by comparing three observations in the same test: the body before mutation, the body after mutation without a condition, and the conditional response using the old validator.

\`\`\`ts
it('changes the validator when a visible child item changes', async () => {
  const created = await createDocument('Checklist with items');

  const before = await request(app)
    .get('/documents/' + created.id)
    .expect(200);

  await request(app)
    .post('/documents/' + created.id + '/items')
    .send({ text: 'Run smoke tests' })
    .expect(201);

  const after = await request(app)
    .get('/documents/' + created.id)
    .expect(200);

  expect(after.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ text: 'Run smoke tests' }),
    ]),
  );
  expect(after.headers.etag).not.toBe(before.headers.etag);

  await request(app)
    .get('/documents/' + created.id)
    .set('If-None-Match', before.headers.etag)
    .expect(200);
});
\`\`\`

Another failure mode appears behind gateways or compression middleware. The application produces an ETag, then a proxy compresses or transforms the representation without preserving validator semantics. Tests running directly against the app pass. Tests against the deployed stack fail or cache incorrectly. Include at least one environment-level smoke test against the same route through the real ingress path. You do not need exhaustive ETag coverage at the gateway level, but you should verify that validators survive the path clients actually use.

A third failure mode is clock precision when teams use \`Last-Modified\` as a fallback. Rapid updates inside one second can be missed if the timestamp precision is too coarse. ETags avoid much of that problem, but hybrid implementations still deserve tests that perform two quick updates and verify that stale preconditions do not pass accidentally.

## Put conditional request tests into CI without making them flaky

ETag tests should be deterministic. Avoid sleeping for cache expiry. Avoid relying on real browser cache behavior. Exercise the HTTP contract directly with a clean client that sends exactly the headers you want. If you need to test expiry or retention, use a controllable clock, a test-only store setting, or a unit-level test around the validator service.

A small CI command can run conditional request tests as part of the API suite:

\`\`\`bash
npm test -- --runInBand tests/api/conditional-requests.test.ts
\`\`\`

The exact command depends on Jest, Vitest, Node's test runner, or your chosen framework. The important part is that tests touching shared records should either run in isolation or create unique resources per test. If the API supports parallel-safe test data, parallel execution is fine. If not, serialize only this narrow file instead of slowing the entire suite.

Track the assertions in a checklist so new endpoints get the same coverage:

| Endpoint type | Minimum conditional tests | Extra checks for high-risk resources |
|---|---|---|
| Read-only item | \`ETag\` present, \`If-None-Match\` current returns \`304\`, stale returns \`200\` | Projection and tenant-specific validators |
| Editable item | All read checks plus stale \`If-Match\` rejection | No partial side effects after \`412\` |
| Collection | Validator changes when membership or visible fields change | Filter, sort, pagination, and permission boundaries |
| Bulk update | Documented precondition behavior | Per-item conflict reporting and atomicity |

The payoff is not just faster caching. It is confidence that clients, including AI coding agents calling internal APIs, cannot accidentally overwrite newer state after reading an old representation.

## Frequently Asked Questions

### Should tests parse an ETag to verify the version number?

Usually no. Treat ETags as opaque unless the API explicitly documents their format. A validator can be a quoted hash, a revision token, or another server-generated value. Parsing it couples tests to implementation rather than behavior. Assert that the value exists, that it remains stable when the representation is unchanged, that it changes when visible content changes, and that the server honors it in \`If-None-Match\` or \`If-Match\` requests.

### Is a 304 response supposed to include the JSON body?

No, do not expect a normal JSON representation in a \`304 Not Modified\` response. The point is that the client already has the representation associated with the validator. Some headers may be present, but the body is typically empty. Tests should assert the status and the absence of a full body only if that is how the HTTP client exposes it. Avoid forcing the server to return an empty JSON object just to satisfy a test helper.

### What status should a stale If-Match update return?

\`412 Precondition Failed\` is the common HTTP status for a failed precondition, and many APIs use it for stale \`If-Match\` updates. Some APIs also use \`428 Precondition Required\` when a required precondition header is missing. Your tests should follow the API contract rather than copying another service's convention blindly. Whatever status is chosen, verify that the stale write did not change the resource or trigger irreversible side effects.

### Do ETag tests belong in contract tests or provider integration tests?

Use both when consumers depend on the behavior. Provider integration tests prove the server changes validators correctly, returns \`304\`, rejects stale writes, and preserves state. Contract tests prove that a consumer and provider agree on required headers, status codes, and error fields. A contract test alone cannot prove lost-update safety because it usually does not execute the full persistence timeline. Keep the provider tests as the source of truth for correctness.
`,
};
