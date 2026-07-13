import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing ETag and If-Match Concurrency Control',
  description:
    'Test ETag and If-Match concurrency control with stale writes, strong validators, 412 responses, atomic races, and evidence that lost updates are blocked.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing ETag and If-Match Concurrency Control

Alice and Ben both read version \`"v7"\` of a support case. Alice changes the priority, producing \`"v8"\`. Ben then submits a title change based on \`"v7"\`. If the API accepts Ben's stale representation, Alice's update may disappear. A correct \`If-Match\` implementation rejects Ben with \`412 Precondition Failed\` and leaves version 8 intact.

That story is the essential lost-update test, but production confidence requires more. The test must prove the validator changes when the representation changes, stale checks and writes are atomic, weak tags do not satisfy strong comparison, rejected requests cause no side effects, and proxies preserve the headers. Status-code checking alone is too shallow.

## The validator is part of the write contract

An \`ETag\` is an opaque entity tag selected by the origin server for a representation. Clients must not parse a version number out of it or invent the next value. For optimistic concurrency, the client reads the current resource and sends the received tag in \`If-Match\` on a later mutation. The server applies the mutation only if the current selected representation strongly matches one of the supplied tags.

If no tag matches, the standard response is \`412 Precondition Failed\`. A weak tag begins with \`W/\` and never matches under the strong comparison used by \`If-Match\`. Quotation marks are part of entity-tag syntax, so tests should forward the header value exactly rather than stripping them.

| Request condition | Current server tag | Expected decision | Concurrency meaning |
|---|---|---|---|
| \`If-Match: "v7"\` | \`"v7"\` | Apply update | Client edited the current version |
| \`If-Match: "v6"\` | \`"v7"\` | 412 | Client's base version is stale |
| \`If-Match: "v6", "v7"\` | \`"v7"\` | Apply update | At least one strong tag matches |
| \`If-Match: W/"v7"\` | \`"v7"\` | 412 | Weak validator cannot strong-match |
| \`If-Match: *\` | Resource exists | Apply if other rules pass | Mutation requires an existing representation |
| \`If-Match: *\` | Resource absent | 412 | Wildcard does not match nonexistence |

Authentication, authorization, schema validation, and business rules still apply. Conditional headers do not override permission checks. An API can choose the order in which it evaluates some failures, so contract tests should focus on documented, externally observable behavior and avoid assuming internal sequencing unless security requires it.

## The canonical stale writer scenario

Use two independent API clients conceptually representing two editors. Seed a resource, have both clients read it, let the first update succeed, then submit the second update with its original tag. Finally fetch the resource and prove that only the first mutation persisted.

Playwright Test's request fixture exposes response headers and JSON without a browser. This example assumes the API requires \`If-Match\` on \`PUT /api/cases/:id\` and returns the updated representation with a new ETag.

\`\`\`ts
// tests/api/case-concurrency.spec.ts
import { expect, test } from '@playwright/test';

test('a stale editor cannot overwrite a newer case version', async ({ request }) => {
  const created = await request.post('/api/test-fixtures/cases', {
    data: { title: 'Printer offline', priority: 'normal' },
  });
  expect(created.ok()).toBeTruthy();
  const caseId = (await created.json()).id as string;

  const aliceRead = await request.get(\`/api/cases/\${caseId}\`);
  const benRead = await request.get(\`/api/cases/\${caseId}\`);
  const aliceTag = aliceRead.headers()['etag'];
  const benTag = benRead.headers()['etag'];

  expect(aliceTag).toBeTruthy();
  expect(benTag).toBe(aliceTag);

  const aliceWrite = await request.put(\`/api/cases/\${caseId}\`, {
    headers: { 'If-Match': aliceTag },
    data: { title: 'Printer offline', priority: 'urgent' },
  });
  expect(aliceWrite.status()).toBe(200);
  expect(aliceWrite.headers()['etag']).not.toBe(aliceTag);

  const benWrite = await request.put(\`/api/cases/\${caseId}\`, {
    headers: { 'If-Match': benTag },
    data: { title: 'Printer offline on floor 4', priority: 'normal' },
  });
  expect(benWrite.status()).toBe(412);

  const finalRead = await request.get(\`/api/cases/\${caseId}\`);
  expect(await finalRead.json()).toMatchObject({
    title: 'Printer offline',
    priority: 'urgent',
  });
  expect(finalRead.headers()['etag']).toBe(aliceWrite.headers()['etag']);
});
\`\`\`

The final GET is essential. A service can return 412 and still have performed part of the mutation because transaction boundaries are wrong. Assert important database-visible state, audit events, messages, and downstream calls as appropriate. A rejected update should be side-effect free from the client's perspective.

Avoid fixture endpoints in shared production environments. The example uses one to keep setup focused, but a real repository might seed directly into an isolated test database or create a case through the supported public API. Every test needs a unique resource so parallel runs do not invalidate one another.

## Prove the ETag represents change correctly

Concurrency control depends on validator quality. After a successful mutation that changes the protected representation, the response or subsequent GET should expose a different strong ETag. If an update is a semantic no-op, the service may legitimately retain the same tag, depending on its representation and contract. Define that behavior before testing it.

Do not demand a particular hash or integer sequence. Entity tags are opaque. Assert relationships: present, quoted, strong when required for writes, equal across unchanged reads, different after relevant change. If content negotiation produces different representations, verify whether JSON and another media type receive distinct validators and whether \`Vary\` is configured correctly.

| Validator property | Test operation | Failure it can reveal |
|---|---|---|
| Stable across identical reads | GET twice without mutation | Time-dependent or random ETag generation |
| Changes after protected field update | PUT with current tag, then GET | Validator ignores concurrency-relevant data |
| Remains valid after unrelated side data changes | Change excluded metadata, then retry | Overly broad invalidation, if contract excludes that data |
| Is strong for \`If-Match\` workflow | Inspect returned header | Server issues only weak validators unusable for strong match |
| Matches response representation | Request negotiated variants | Cache and concurrency confusion across encodings |
| Survives gateway path | Call through public ingress | Proxy strips or rewrites conditional headers |

Compressed responses raise subtle questions because representation metadata can vary by content encoding. The API and gateway team should agree on where ETags are generated and whether they are strong for each selected representation. Tests through the public route are more valuable than service-direct tests for this layer.

## Atomicity under simultaneous writers

The sequential stale-client test proves basic behavior, but a broken implementation can still perform “check current version” and “write row” as separate non-atomic operations. Two requests starting together may both observe the old version and both commit. You need a race test.

Create one resource and obtain one ETag. Fire two distinct updates concurrently with the same tag. Exactly one should succeed and one should receive 412. Then verify final state matches the winner and the tag advanced once according to the externally visible contract.

\`\`\`ts
// tests/api/case-atomicity.spec.ts
import { expect, test } from '@playwright/test';

test('only one simultaneous writer can consume the current ETag', async ({ request }) => {
  const created = await request.post('/api/test-fixtures/cases', {
    data: { title: 'VPN access', priority: 'normal' },
  });
  const id = (await created.json()).id as string;
  const initial = await request.get(\`/api/cases/\${id}\`);
  const etag = initial.headers()['etag'];

  const [first, second] = await Promise.all([
    request.patch(\`/api/cases/\${id}\`, {
      headers: { 'If-Match': etag },
      data: { priority: 'urgent' },
    }),
    request.patch(\`/api/cases/\${id}\`, {
      headers: { 'If-Match': etag },
      data: { priority: 'low' },
    }),
  ]);

  expect([first.status(), second.status()].sort()).toEqual([200, 412]);

  const winner = first.status() === 200 ? 'urgent' : 'low';
  const finalResponse = await request.get(\`/api/cases/\${id}\`);
  expect((await finalResponse.json()).priority).toBe(winner);
  expect(finalResponse.headers()['etag']).not.toBe(etag);
});
\`\`\`

Concurrent client promises do not guarantee packets arrive in the same CPU cycle, but repeated execution can expose a wide check-then-write window. For a deterministic lower-level test, place synchronization hooks around the repository or transaction in a controlled test build. Do not add sleeps and call the race proven.

At the database layer, a robust implementation often uses a conditional update such as \`UPDATE ... WHERE id = ? AND version = ?\` and checks the affected row count, all within the transaction that emits related side effects. Database integration tests can validate this directly. The [database testing automation guide](/blog/database-testing-automation-guide) covers transaction and persistence checks beyond the HTTP surface.

## Missing If-Match needs an explicit policy

Optimistic concurrency is optional unless the API requires it. If clients may update without \`If-Match\`, an old client can still overwrite new data, bypassing the protection. Many APIs enforce preconditions on selected mutation endpoints and return \`428 Precondition Required\` when the header is absent. Others accept unconditional writes for last-write-wins semantics.

Test the documented choice. Do not confuse missing with stale: 428 communicates that the client omitted a required condition, while 412 communicates that a supplied condition evaluated false. If the service uses another documented response, make consistency part of the contract review.

Also test malformed syntax, multiple tags, wildcard behavior, and header casing through the actual client library. HTTP field names are case-insensitive, but application frameworks can mishandle access. Very large tag lists should meet the platform's header-size policy without creating an injection or denial-of-service issue.

## PATCH, PUT, and field-level conflicts

\`If-Match\` protects a representation version regardless of whether the method is PUT or PATCH. With whole-resource versioning, two changes to different fields still conflict. Alice changes priority and Ben changes title from the same base version; Ben must reload and decide how to merge.

That conservative behavior prevents silent loss but can increase user-visible conflicts. Field-level versions or merge-aware APIs can allow independent edits, yet they require a more complex contract. Tests should mirror the chosen model rather than assuming nonoverlapping JSON Patch operations are automatically safe.

For PUT, ensure the test sends the complete representation expected by the API. A stale PUT is especially dangerous because omitted fields can erase newer values. For PATCH, test operations whose path no longer exists after another edit. A current ETag does not make an invalid patch valid; business and patch-document errors still need their own responses.

## Retry behavior belongs to the client

On 412, a client should not resend the same body with a freshly fetched tag automatically unless it can prove the merge is safe. Blind retry turns optimistic concurrency back into last-write-wins with extra network steps. The user or domain layer must reconcile the stale intent with current state.

A good client workflow fetches the current representation, preserves the user's attempted changes, displays or computes a diff, and submits a new conditional request after resolution. Test that the UI does not lose local edits and does not claim success on 412. For machine clients, define a domain-specific merge function and test conflicting and nonconflicting cases.

The general [API testing best practices guide](/blog/api-testing-best-practices-guide) provides broader coverage for error schemas, authentication, and idempotency. Here, focus assertions on version relationships and no lost update.

## Observe headers at every hop

Service-level tests can pass while a CDN, API gateway, reverse proxy, or client SDK removes \`ETag\` or \`If-Match\`. Add at least one suite through the deployed ingress. Capture response and request headers at safe logging points, taking care not to log unrelated credentials.

Test cache interactions separately. \`If-None-Match\` is commonly used for cache revalidation and can yield 304 for GET. \`If-Match\` protects a conditional operation and yields 412 when false. Mixing these scenarios in one generic “ETag test” leads to wrong expectations.

If a mobile or generated SDK exposes the ETag only through a low-level response object, write an integration example for consumers. A concurrency mechanism that normal clients cannot access is technically present but practically unusable.

## Failure diagnostics for concurrency defects

When a race test fails, save the initial tag, both request bodies, request start and completion times, response tags, status codes, correlation IDs, final representation, audit entries, and database version. Never log sensitive content solely to aid a rare race.

Repeat the atomicity test enough to be useful, but do not publish a fabricated probability. Report execution count and environment. If it fails once, preserve that seed and trace. If it never fails, the test supports confidence in the exercised conditions; it does not mathematically prove the absence of every race.

Review operational metrics for 412 and 428 rates by client version and endpoint. A sudden increase can mean a UI introduced duplicate submissions, a background sync strategy is stale, or the validator began changing too frequently. Concurrency responses are product signals, not merely test assertions.

## Composite resources and collection ETags

Some API representations combine a primary row with children, permissions, or computed totals. The team must decide which changes invalidate the parent ETag. If an order response embeds line items, changing a line item while leaving the order tag stable lets a stale full-order update erase or misrepresent current data. Test each concurrency-relevant child mutation against the parent validator.

The opposite failure is excessive invalidation. If a background view counter changes the ETag on every read, human edits may conflict constantly even though the editable representation did not change. Create a table of fields included in the concurrency version, mutate them one at a time, and assert whether the validator should advance. That table becomes part of API design, not merely automation.

Collection ETags have different semantics from item ETags. A tag on a paginated list may represent membership, ordering, filters, and pagination state. Do not send a collection tag as the condition for updating one item unless the API explicitly defines that contract. Test item mutations with item validators, and test collection revalidation as a cache behavior.

Bulk update endpoints need per-item conflict reporting or an all-or-nothing transaction policy. Construct a request containing one current item and one stale item. Verify whether the service rejects the entire batch, applies the current member only, or returns a multi-result body according to its documented semantics. Then inspect both records and all side effects. A single top-level 200 cannot prove that concurrency was handled safely inside the batch.

Deleted and recreated resources deserve their own case. Read a tag, delete the resource, recreate another representation at the same URI, and submit the old tag. The stale tag must not authorize an update to the new incarnation. Random or monotonic validator generation should make that collision impractical, but the black-box test protects against implementations that reset a row version to one after recreation.

## Audit events must agree with the winning write

Optimistic locking frequently sits beside an outbox, event stream, or audit table. The conditional update and event creation must share a transaction boundary. In the two-writer race, expect one domain event for the accepted version and none for the rejected body. A 412 request should not notify subscribers, invalidate caches as though content changed, or append a misleading “updated” history entry.

Consume the event in an integration test or query the isolated outbox after both responses complete. Match resource ID, resulting version, changed fields, and correlation ID to the winning request. If event delivery is asynchronous, poll the durable store with a bounded deadline, then also prove that no second event appears during a justified observation window.

This check catches implementations that guard the database row correctly but publish before the transaction commits. It also exposes retry middleware that emits duplicate success events. HTTP status, stored representation, and downstream record should tell one consistent concurrency story.

## Frequently Asked Questions

### Should a weak ETag ever pass an If-Match test?

A weak tag must not pass. \`If-Match\` uses strong comparison, and an entity tag prefixed with \`W/\` never matches. An API designed around \`If-Match\` should issue a usable strong validator for that representation.

### Is 409 Conflict interchangeable with 412 Precondition Failed?

They describe related but different conditions. When an \`If-Match\` condition evaluates false, 412 is the standard response. A 409 can represent a domain conflict that is not the direct failure of an HTTP precondition. Follow and test the documented contract.

### Must the ETag be a database row version?

A row version is only one implementation choice. The ETag is opaque to clients and may be derived from a version, hash, or other origin-controlled mechanism. It must change and remain stable according to the selected representation's validator semantics, without clients depending on its internal format.

### How can I make the simultaneous-writer test less flaky?

Use isolated data, fire requests from separate clients, repeat with captured evidence, and add a controlled synchronization point in an integration test around the conditional update. Sleeps do not guarantee overlap and should not be the concurrency mechanism.

### What should a web UI do after receiving 412?

Fetch the current representation, retain the user's attempted edits, and present a merge or reload choice appropriate to the domain. It should not silently attach the new ETag to the old full body and overwrite the other editor's work.
`,
};
