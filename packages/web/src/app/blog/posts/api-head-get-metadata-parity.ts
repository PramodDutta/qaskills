import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API HEAD GET metadata parity',
  description:
    'API HEAD GET metadata parity: use repo fixtures, focused assertions, and CI checks to expose failures and prevent regressions before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'API HEAD GET metadata parity',
  keywords: [
    'API HEAD GET metadata parity',
    'HEAD GET metadata parity',
    'HTTP HEAD body absence',
    'HEAD content length test',
    'ETag parity HEAD GET',
    'API HEAD cache validation',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'api-testing-best-practices-guide',
    'testing-content-negotiation-accept-header',
    'testing-problem-details-rfc-9457-errors',
  ],
  sources: ['https://www.rfc-editor.org/info/rfc9110', 'https://www.rfc-editor.org/info/rfc9111'],
  repoEvidence: [
    'seed-skills/api-testing-rest/SKILL.md',
    'seed-skills/api-test-suite-generator/SKILL.md',
  ],
  content: `API HEAD GET metadata parity pairs both methods against the same resource and request fields, then compares status, selected representation facts, validators, and body bytes under HTTP rules. HEAD must omit response content, while its useful metadata should describe the GET response that the server would have sent for that request.

Blind header equality is not the goal. Some fields may be left out of HEAD when they are formed only while content is made, and hop-by-hop fields can vary. The suite needs a named allowlist, the same negotiation inputs, and clear checks for body absence, ETag, dates, type, length, and cache behavior.

The repo gives sound test roots. \`seed-skills/api-testing-rest/SKILL.md\` states that HEAD has GET semantics without a response body, and it calls for status, structure, headers, errors, and cleanup checks. \`seed-skills/api-test-suite-generator/SKILL.md\` adds spec-led route cases, fixed data, response header checks, content negotiation, negative cases, and clear schema faults.

This article narrows those ideas to method parity. Start with the [API testing guide](/blog/api-testing-complete-guide), then browse [API QA skills](/skills) for a runbook. API HEAD GET metadata parity should find a split code path before a cache, client, or monitor relies on stale facts.

## What Does API HEAD GET Metadata Parity Verify?

API HEAD GET metadata parity verifies that both methods select the same current representation for equal request fields, return compatible status and metadata, preserve cache validators, and differ where they must: HEAD sends no content bytes. The oracle allows only differences supported by HTTP or the endpoint contract.

The REST skill supplies the repo's base statement about HEAD and GET. It also says to test the contract rather than server code, cover all methods, check status codes, assert response headers, and test error paths. Those are facts in the skill, not proof that this app already has a HEAD route.

The suite generator shows how to load a spec, map operations, validate documented status codes, check \`Content-Type\`, inspect cache fields, and use fixed fixtures. It warns against positive-only tests and ignored response headers. Those patterns support a generated HEAD and GET pair for each chosen route.

The HTTP semantics index for [RFC 9110](https://www.rfc-editor.org/info/rfc9110) is the main wire source. The standard defines HEAD as the same request as GET except the server must not send response content. It also permits some GET header fields to be absent when they are known only while content is made.

Thus, do not compare every raw header. Define fields that must match for the app, fields that may differ, and fields removed before comparison. At minimum, test status, \`Content-Type\`, \`Content-Encoding\`, \`Content-Length\` when present, \`ETag\`, \`Last-Modified\`, \`Cache-Control\`, and \`Vary\` where the route emits them.

Also verify the GET bytes separately. A correct HEAD result cannot prove the GET body matches its schema or advertised length. The [API best practices guide](/blog/api-testing-best-practices-guide) covers wider body checks, while this page owns paired method facts.

## How Do You Build HEAD GET Metadata Parity?

Build HEAD GET metadata parity around one fixed resource whose bytes and update time are under test control. Give it a known media type, stable ETag, Last-Modified value, cache policy, Vary field, and fixed uncompressed body. Add optional gzip only after the plain case passes.

Create the resource through a fixture API or local seed, then read it by a stable ID. Do not use a public or shared item that another test can update between the GET and HEAD calls. Save its fixture version and body hash with the run.

Send GET and HEAD close together with the same URL, query, authorization, \`Accept\`, \`Accept-Language\`, and \`Accept-Encoding\`. Set an explicit request ID per call for trace work, but exclude that echo field from parity if the server returns it.

Run GET first for the base pair, because its bytes let the test check type, hash, and length. Then send HEAD and read the raw received bytes without asking a JSON parser to create an empty object. Require zero body bytes from the actual client boundary.

Normalize header names to lower case and trim rules defined by the client library. Do not merge values whose order is meaningful. Save the raw header list as debug data, while the oracle reads a small, reviewed map.

The first positive check needs a 200 status for both methods, no HEAD bytes, matching validators, and compatible representation fields. If \`Content-Length\` appears on HEAD, it should describe the selected GET representation under the same content coding rather than the empty HEAD payload.

Isolation includes the cache. Use a new resource ID or clear only the owned cache key before each row. Record whether a gateway, CDN, framework cache, or test stub handled the response, because an old cache can hide a route split.

Review [content negotiation tests](/blog/testing-content-negotiation-accept-header) before adding media variants. A parity pair is valid only when both requests carry the same selection fields and reach the same resource state.

## What Breaks HTTP HEAD Body Absence?

HTTP HEAD body absence breaks when a framework sends generated content after it has written GET-like headers. Some clients hide those bytes by rule, so an app-level response helper may always show an empty body even when a lower proxy or server wrote content. Test at the lowest practical client edge.

A middleware shortcut can cause the opposite problem. It may return early for HEAD before auth, negotiation, cache, or resource lookup runs. The body is absent, but status, ETag, type, or missing-resource behavior no longer matches GET.

Auto-generated HEAD support can drift when GET code changes. A framework may map HEAD to GET today, while a new route or edge handler adds a separate branch. Pair tests should run against the deployed stack, not only a mocked route function.

Compression can make length checks look wrong. A GET with gzip may report the coded byte length, while an identity response reports a different size. Send the same \`Accept-Encoding\`, record \`Content-Encoding\`, and compare each pair within one selected coding.

Stale \`Content-Length\` is a clear fault when it no longer matches the selected GET bytes. Do not compare HEAD length with zero, since HEAD has no content but may describe the GET content length. Compare it with the paired GET field and measured bytes where the client did not decode them.

Redirects can also split. A GET may redirect to a canonical path while HEAD returns a local 200, or the client may follow one method differently. Disable automatic redirects for the redirect row and compare the first response before testing the final target.

Runner issues show up as client rules, body decoding, or automatic redirect changes before the endpoint contract is judged. Server issues begin when raw requests with equal selection fields get incompatible route results. Save the exact request fields and redirect mode to tell them apart.

Use [problem details testing](/blog/testing-problem-details-rfc-9457-errors) for error body contracts. HEAD should still omit content, so its error parity centers on status and useful metadata rather than a problem JSON body.

## HEAD Content Length Test Fixtures and Controls

A HEAD content length test needs exact byte facts. Use an ASCII fixture first so character count and byte count are easy to see, then add UTF-8 text as a boundary row. Hash and measure the bytes before the server starts, not a parsed object after it arrives.

The plain positive control requests identity coding. GET should return the fixture bytes, and any \`Content-Length\` should match that wire representation. HEAD should return no bytes and, when it sends \`Content-Length\`, use the same value as the paired GET.

The negative control changes the body while a test server keeps the old length. GET should expose either a protocol error or a measured mismatch, depending on the client. Keep this fault inside an owned stub because malformed lengths can make shared connections hard to reuse.

The UTF-8 boundary uses text with code points that take more than one byte. A server that uses JavaScript string length may undercount it. The oracle compares encoded bytes, while the report saves both character and byte totals to explain the fault.

The compression control sends the same \`Accept-Encoding\` for both methods and records coding. Do not compare a client-decoded GET byte array with a compressed wire length. Either disable auto-decode or use matching raw response data for the length assertion.

The missing-length control checks an endpoint that can omit \`Content-Length\` under the chosen contract. It should not fail merely because the field is absent. It still requires zero HEAD bytes, status parity, and matching validators that the route promises.

Repeat each row after changing the fixture version. The new GET and HEAD should agree on the new ETag and Last-Modified value. A stale HEAD field after a fresh GET points to a cache or separate metadata path.

The suite generator's fixed fixtures and header checks fit these controls. Browse [the API category](/categories/api-testing) for related patterns, but keep wire-byte checks apart from JSON schema checks.

## How Should ETag Parity HEAD GET Be Asserted?

ETag parity HEAD GET should compare validators for the same selected representation and request fields. Start with an unconditional GET and HEAD pair, then send \`If-None-Match\` using the observed ETag. Record status, ETag, Last-Modified, cache fields, and body bytes for every response.

Use exact equality for strong or weak ETag text within one pair. Do not remove the \`W/\` marker or quotes during normalization, since those parts affect validator meaning. A missing ETag is allowed only when the endpoint contract does not promise one.

Use a state transition for resource updates. Read version one, update the owned fixture, then read version two. Both methods should move to the new validator, while a conditional request with the old tag should no longer claim the current representation is unchanged.

The [HTTP caching standard](https://www.rfc-editor.org/info/rfc9111) explains validation with ETag and Last-Modified. It also describes how a cache can use a HEAD response when validators and, when sent, content length match a stored response. This makes HEAD drift a real cache risk, not a cosmetic header difference.

Conditional status is part of the pair. With a matching ETag, compare GET and HEAD under the same precondition and endpoint policy. Both must still follow the rule that HEAD has no response content, including when the server returns a validation status.

Use a partial rule for Date, Age, trace IDs, timing fields, and proxy fields. They may differ between calls, so exact equality would create noise. Exclude them by name and state why, rather than dropping every header that fails once.

A weak check asserts only that each response has some ETag. A strong check asserts the same tag for the same representation, a changed tag for changed content, correct conditional status, and no HEAD bytes. It also reports which cache layer answered each call.

Read the [API testing guide](/blog/api-testing-complete-guide) for setup and auth patterns. API HEAD GET metadata parity adds the selected-representation link that a standalone ETag check can miss.

## API HEAD Cache Validation in CI

API HEAD cache validation should run against the same deployed path that clients use, including known reverse proxies when the environment allows it. Also keep a direct-origin job. A difference between those two layers can identify a gateway rule before route code is blamed.

Pin the application build, route set, fixture version, client version, redirect mode, and request selection fields. Save response status, raw headers, received byte count, content hash for GET, cache trace fields, and elapsed time. Redact authorization and private data.

Start with the plain 200 identity pair. Then run conditional, missing resource, media negotiation, compression, and redirect rows. Stop the matrix if fixture creation or the plain pair fails, because later comparisons would not have a sound base.

CI should print the first field that differs from its rule. A useful line is \`etag expected="v4" actual="v3" method=HEAD layer=edge\`. A raw header dump alone makes reviewers search for the key fact.

Run pairs close together, but do not assume the resource cannot change. Include the fixture version in its URL or store a server revision field. If the state changes between methods, mark the pair invalid and rerun from new owned data.

Retries must recreate the pair and preserve the first artifact. Retrying HEAD alone could hit a new cache entry and hide the original split. Keep retry count and cache result fields in the report.

Clean only the resource and cache keys made by the run. Confirm deletion, then fail cleanup on its own if owned data remains. Do not clear a shared cache namespace for one article test.

Publish the small comparison map through CI and link failures to either \`seed-skills/api-testing-rest/SKILL.md\` or \`seed-skills/api-test-suite-generator/SKILL.md\`. Review [the project FAQ](/faq) before packaging it for wider use.

## API HEAD GET Metadata Parity Comparison Matrix

The matrix below keeps URL and fixture state fixed within each pair. Each row states which facts should match and which body rule applies. Add endpoint-specific fields only when the public contract names them.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Successful GET and HEAD | Fixed owned resource with identity coding, stable validators, equal auth, matching selection fields, manual redirects, and a known body hash. | Status and promised metadata agree, GET has the exact seeded bytes, HEAD has none, and both responses name the same selected form. | Split status, stale field, wrong GET bytes, any HEAD bytes, or a trace showing that the two calls reached different route rules. | \`seed-skills/api-testing-rest/SKILL.md\` for method meaning, status checks, headers, errors, and contract-focused assertions. |
| Conditional request with matching ETag | Same current quoted tag sent in \`If-None-Match\` for both methods against one unchanged fixture and one known cache layer. | Conditional status and validator rules agree, the observed tag stays exact, cache fields remain compatible, and HEAD still has no content. | One method treats the same current tag as stale, drops the weak marker, changes the selected form, or sends response bytes for HEAD. | RFC 9110 for HEAD and conditional semantics plus RFC 9111 for stored response validation and validator use. |
| Missing resource | Unknown owned ID with redirects disabled, equal authorization, equal \`Accept\`, and a route trace that proves both requests reached resource lookup. | Both methods follow the endpoint's missing status and promised header contract while HEAD omits the error content that GET may send. | HEAD bypasses lookup, auth, negotiation, or error metadata and returns a shortcut result that no paired GET request would produce. | \`seed-skills/api-test-suite-generator/SKILL.md\` for generated route cases, fixed inputs, documented status, and negative response checks. |
| Content negotiation through Accept | Same supported or unsupported \`Accept\` value on both calls, fixed resource state, identity coding, and automatic redirects switched off. | Both select the same media type or reject the same request, while Vary and other promised selection fields remain compatible across methods. | HEAD skips negotiation, reports another type, omits a required Vary value, or accepts a media form that the paired GET rejects. | Suite generator for content checks and RFC 9110 for representation choice, method meaning, and response field rules. |
| Compressed GET and paired HEAD | Same \`Accept-Encoding\`, raw response mode, fixed body bytes, selected gzip support, and client decoding disabled for the wire-length check. | Coding, validators, and promised length describe the same coded form, GET wire bytes match that form, and HEAD sends zero bytes. | Lengths from coded and decoded forms are mixed, coding differs by method, an old validator survives, or the client hides the measured wire facts. | RFC 9110 for representation metadata and RFC 9111 for HEAD-based cache updates with matching validators and length. |

The matrix uses compatibility, not blind equality. A route may omit a field from HEAD when HTTP permits it, but that choice should be listed in the endpoint policy. Silent one-off omissions should fail review because the oracle cannot explain them.

Add authorization and range rows only after confirming their method contract. Do not assume an unrelated multipart source changes HEAD rules. Keep each new request field equal across the pair and record its role.

API HEAD GET metadata parity remains easy to audit when every result names method, selected form, and cache layer. Compare the negotiation row with [Accept header testing](/blog/testing-content-negotiation-accept-header) before widening media types.

## How Do You Implement API HEAD GET Metadata Parity?

Implement API HEAD GET metadata parity from one fixed route and a reviewed header policy. Prove the plain pair first, then add one changed condition per row. Keep received bytes apart from parsed response objects.

1. Read \`seed-skills/api-testing-rest/SKILL.md\` and \`seed-skills/api-test-suite-generator/SKILL.md\`, then record method, spec, fixture, header, and cleanup duties.
2. Seed one resource with stable bytes, ETag, Last-Modified, type, length, Vary, cache policy, conditional support, and optional compression.
3. Run the plain GET and HEAD pair, capturing status, promised metadata, validators, raw GET bytes, raw HEAD bytes, and cache trace fields.
4. Inject one fault at a time, including a HEAD body, stale validator, bad length, skipped negotiation, split redirect, and changed compression input.
5. Compare each result with the five matrix rows, then report the first status, field, byte count, or cache state that differs.
6. Run the gate in CI, save redacted evidence, delete the owned resource and cache key, and link the fault to its repository path.

The first TypeScript example creates a small parity map. Its optional fields let an endpoint policy decide which headers are required without comparing volatile headers.

\`\`\`typescript
const parityFields = [
  'content-type',
  'content-encoding',
  'content-length',
  'etag',
  'last-modified',
  'cache-control',
  'vary',
] as const;

function selectedHeaders(headers: Headers) {
  return Object.fromEntries(
    parityFields.map((name) => [name, headers.get(name)]),
  );
}

async function rawCall(method: 'GET' | 'HEAD', url: string) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'identity',
    },
    redirect: 'manual',
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { status: response.status, headers: selectedHeaders(response.headers), bytes };
}
\`\`\`

The client must be checked for auto-decode and HEAD handling before wire-length claims are enabled. If it hides invalid HEAD bytes by design, run the body absence check with a lower-level test client while retaining this metadata pair.

The second example applies a route policy and reports the first differing field. It permits a missing optional length but requires matching validators for this chosen endpoint.

\`\`\`typescript
const getResult = await rawCall('GET', resourceUrl);
const headResult = await rawCall('HEAD', resourceUrl);

expect(headResult.status).toBe(getResult.status);
expect(headResult.bytes).toHaveLength(0);
expect(getResult.bytes).toEqual(expectedResourceBytes);

for (const name of ['content-type', 'etag', 'last-modified', 'cache-control']) {
  expect(headResult.headers[name]).toBe(getResult.headers[name]);
}

if (headResult.headers['content-length'] !== null) {
  expect(headResult.headers['content-length']).toBe(
    getResult.headers['content-length'],
  );
}
\`\`\`

Add a negative stub that sends the old ETag only on HEAD. The test should fail at \`etag\` before the later conditional checks run. Add another stub that writes HEAD bytes and verify the low-level client reports their received count.

Keep route seeding in fixture code, raw calls in one client, and endpoint policy in case data. This split makes an allowed omission a reviewable rule rather than a catch block. Browse [API testing skills](/skills) once the matrix is green.

## Frequently Asked Questions

### How can contract tests prove HEAD returns GET-equivalent metadata, no response body, and correct cache validators?

Pair HEAD and GET against one fixed resource with equal negotiation and auth fields. Compare status, promised representation headers, ETag, Last-Modified, cache rules, and optional length under a reviewed policy. Measure raw bytes separately, requiring the known GET bytes and zero received HEAD content.

### What should a HEAD GET metadata parity fixture record?

Record build, route, fixture version, body hash, request fields, redirect mode, cache layer, status, raw headers, received byte count, selected coding, ETag, Last-Modified, client version, and cleanup state. Redact authorization and private content. Save both raw and normalized header views when a field differs.

### Which failure proves HTTP HEAD body absence is broken?

Any content bytes received for HEAD at a client layer that exposes raw server output violate the body rule. If a high-level client always hides HEAD bytes, that result is not enough. Add a lower-level probe, while still checking that status and useful representation metadata remain compatible with GET.

### How do teams isolate a HEAD content length test?

Use an owned resource with precomputed bytes, identity coding, fixed validators, and no outside writes. Send both methods with equal fields and redirects disabled. Measure GET wire bytes, require zero HEAD bytes, and compare Content-Length only when the field is present and the client has not decoded content.

### Which assertion is strongest for ETag parity HEAD GET?

Require the same exact ETag for the same selected form, a new tag after an owned update, compatible conditional status for the same If-None-Match value, and no HEAD content. Preserve weak markers and quotes. Two nonempty but different tags should fail even when both methods return 200.

### How should CI report API HEAD cache validation failures?

Show the first differing status, header, byte count, or validator with method, fixture version, selected coding, request fields, cache layer, build, and retry count. Attach a redacted comparison map rather than a full private body. Keep cleanup faults and invalid state changes separate from method-parity failures.

## Conclusion

API HEAD GET metadata parity proves compatible method behavior through fixed resources, equal selection fields, explicit header policy, exact cache validators, known GET bytes, and zero HEAD bytes. Conditional, missing, negotiated, and compressed rows expose shortcuts that a single 200 check cannot find.

Run the five-row matrix against origin and the client-facing path before release. Review the [API testing complete guide](/blog/api-testing-complete-guide), then open [QA skills](/skills) and implement the API HEAD GET metadata parity matrix in the next test run.`,
};
