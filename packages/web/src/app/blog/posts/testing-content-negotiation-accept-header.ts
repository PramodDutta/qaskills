import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing API Content Negotiation with the Accept Header',
  description:
    'Test API content negotiation with Accept header quality weights, wildcards, media parameters, 406 responses, response Content-Type, and cache safety.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing API Content Negotiation with the Accept Header

Send Accept: application/xml to an endpoint that can produce only JSON. A 200 JSON response is allowed by HTTP semantics in some circumstances, while a 406 response is also allowed. That surprises teams who thought the header was a command. The test must therefore encode the API's declared negotiation policy, not an imagined universal algorithm.

The Accept request header describes which response media types the client can process and how it prefers them. A server selects a representation, reports the selected media type in Content-Type, and may return 406 Not Acceptable when none of its representations qualify. Correct testing covers selection, rejection policy, response metadata, and caches that could otherwise serve one representation to a client expecting another.

## Read Accept as a preference list, not a string

An Accept value contains media ranges separated by commas. A range can name an exact type and subtype, use a subtype wildcard such as application/*, or use */*. A q weight expresses relative preference from 0 to 1; q=0 means the range is not acceptable. Media parameters can further narrow a range.

Whitespace and order are syntax details, not excuses for a parser to split blindly on every semicolon. The server framework may perform negotiation for you, but your tests should still express the cases that define the public behavior.

| Request header | Client meaning | Plausible selection when JSON and XML exist |
| --- | --- | --- |
| application/json | JSON only | application/json |
| application/xml;q=0.9, application/json;q=1 | JSON preferred to XML | application/json |
| application/* | Any application subtype | Server's configured application representation |
| text/*;q=0.5, */*;q=0.1 | Text preferred, anything else acceptable | A text type if available, otherwise another type |
| application/json;q=0, application/xml;q=1 | JSON excluded, XML accepted | application/xml |
| no Accept field | No stated preference on this dimension | Server default |

Do not equate a missing header with an empty header. Many HTTP clients automatically send */*. Record the actual outbound request when a “default representation” test behaves unexpectedly.

## Build an endpoint-specific representation inventory

Negotiation tests become useful when they begin with what the endpoint can really produce. For GET /reports/42, the inventory might include application/json for machine clients, text/csv for export, and application/vnd.acme.report+json;version=2 for a versioned schema. XML cases would be irrelevant if the service never promises XML.

For each representation, capture its media type, schema or semantic checks, default status, supported parameters, and whether compression or language selection applies independently. This prevents an enormous Cartesian suite that asserts combinations no consumer uses.

| Representation | Media type contract | Body oracle | Typical consumer |
| --- | --- | --- | --- |
| Standard report | application/json | JSON schema plus key values | Web and mobile clients |
| Downloadable rows | text/csv; charset=utf-8 | Header order and parsed records | Spreadsheet export |
| Vendor version 2 | application/vnd.acme.report+json;version=2 | V2 contract assertions | Partner integration |
| Problem response | application/problem+json | Problem-type contract | Any client receiving an error |

Content-Type describes what the server actually sent. Accept describes what the requester can receive. A test that checks only status and parses JSON may silently accept a response labeled text/plain, which can break generated clients, security middleware, and caches.

## Drive the matrix with Playwright APIRequestContext

Playwright's request fixture sends API calls without a browser page and exposes status, headers, text, and JSON parsing. The following data-driven test covers exact selection and preference weighting for an endpoint whose documented policy is to honor Accept and return 406 when no available representation matches.

\`\`\`typescript
import { expect, test } from '@playwright/test';

const cases = [
  {
    accept: 'application/json',
    status: 200,
    contentType: /^application\/json(?:;|$)/,
  },
  {
    accept: 'text/csv;q=0.4, application/json;q=0.9',
    status: 200,
    contentType: /^application\/json(?:;|$)/,
  },
  {
    accept: 'text/csv;q=1, application/json;q=0.5',
    status: 200,
    contentType: /^text\/csv(?:;|$)/,
  },
  {
    accept: 'image/avif',
    status: 406,
    contentType: /^application\/problem\+json(?:;|$)/,
  },
] as const;

for (const scenario of cases) {
  test('negotiates ' + scenario.accept, async ({ request }) => {
    const response = await request.get('/api/reports/42', {
      headers: { Accept: scenario.accept },
    });

    expect(response.status()).toBe(scenario.status);
    expect(response.headers()['content-type']).toMatch(scenario.contentType);
  });
}
\`\`\`

This is a selection test, not a complete body test. Add representation-specific assertions after selection. For CSV, parse records and verify quoting rather than comparing a long string. For JSON, validate the contract and a few scenario values. For a 406 problem document, assert its type and status semantics.

The test intentionally matches an optional parameter suffix because frameworks often append charset. If your API contract forbids or requires a particular charset, assert it through a media-type parser. Avoid startsWith('application/json'), which would also accept an invalid application/json-pretender.

## Probe specificity, weights, and q=0 exclusions

Quality weights are only one part of matching. Specific media ranges take precedence over less specific ranges when determining the quality associated with a representation. Parameters can make a range more specific. Server selection among equally preferred representations can still follow its own configured priority.

High-value cases combine an exact exclusion with a broad allowance. For example, Accept: application/json;q=0, application/*;q=0.8 states that application subtypes are acceptable except the more specifically excluded JSON representation. A server that sorts only by numeric q may incorrectly choose JSON through the wildcard.

Test these decisions using distinct bodies as well as headers. If both v1 and v2 are JSON-shaped, Content-Type parameters and schema discriminators show which variant won. Keep the expected result tied to published policy because framework algorithms differ at ambiguous ties.

RFC quality values allow at most three digits after the decimal point. Values outside 0 through 1 or with excessive precision are malformed. Decide whether the gateway rejects such requests, ignores the malformed item, or lets the framework normalize it. Negative parser behavior is part of the API boundary but should not be invented after deployment. Capture observed legacy behavior before tightening it.

## Test wildcards without assuming a magical default

application/* means any representation with the application top-level type. It does not necessarily mean application/json. If the endpoint offers application/pdf and application/json, the server still needs a precedence rule. */* permits every available media type and commonly yields the configured default.

Write separate cases for no Accept, */*, type wildcard, and exact type. They answer different questions. Also test a wildcard with q=0 alongside an allowed exact type so the parser cannot treat zero as low-but-acceptable.

\`\`\`typescript
test('honors an exact allowance over a wildcard exclusion', async ({ request }) => {
  const response = await request.get('/api/reports/42', {
    headers: {
      Accept: 'application/json;q=1, */*;q=0',
    },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^application\/json(?:;|$)/);
  expect(await response.json()).toMatchObject({ id: '42' });
});

test('rejects when every offered representation has q=0', async ({ request }) => {
  const response = await request.get('/api/reports/42', {
    headers: {
      Accept: 'application/json;q=0, text/csv;q=0',
    },
  });

  expect(response.status()).toBe(406);
  expect(await response.json()).toMatchObject({
    type: 'https://api.example.test/problems/not-acceptable',
    status: 406,
  });
});
\`\`\`

A 406 response can describe available representations, but do not fabricate an Allow-like standard header for them. If the product defines an extension such as acceptableMediaTypes in a problem document, test that extension as an application contract.

## Decide and verify the 406 policy explicitly

RFC 9110 permits an origin server faced with no acceptable representation to honor the header with 406 or disregard the negotiation field and send a response anyway. The latter might be useless to the client, but it remains a protocol possibility. Your API design should choose predictable behavior.

Strict machine-to-machine APIs usually benefit from 406 because an unsupported parser cannot safely consume a fallback. Public web endpoints may prefer a default HTML representation. Tests must not declare every fallback non-compliant without considering the service contract.

If strict rejection is chosen, assert that no success representation leaks through, that the response media type itself is consumable under the error policy, and that the document does not expose stack traces. Some teams allow application/problem+json for errors even if it was not listed in Accept. RFC 9457 notes that this can be allowed by HTTP. Document that exception so clients know how to parse negotiation failures.

406 is about the response representation. It is not the correct status for an unsupported request Content-Type. A server that cannot consume a POST body format normally uses 415 Unsupported Media Type. Include paired tests when an endpoint both consumes and produces multiple formats so those axes do not become confused.

## Assert media parameters as structured data

Parameters can carry charset, profile, version, or application-specific information. Their order and casing rules make raw equality fragile. Parse Content-Type into its type and parameter map, then compare semantic values. The same applies to Accept construction in generated test cases.

Vendor media types are not automatically versioning magic. If the service promises application/vnd.acme.invoice+json;version=2, verify that version=2 selects the V2 representation and an unsupported version follows documented fallback or 406 behavior. Also verify the server returns the selected parameter in Content-Type. A V2 body mislabeled as V1 can be more damaging than a visible 500.

Profiles deserve contract tests for both identifier and body shape. A client that requests application/json;profile="https://example.test/profiles/compact" should not receive the expanded payload merely because both serialize as JSON. Quote handling and parameter normalization should be exercised through real HTTP requests, not only framework unit tests.

For API schema alignment, the [OpenAPI 3.1 contract testing guide](/blog/openapi-3-1-contract-testing-guide-2026) shows how response content entries map to media types. OpenAPI can document alternatives, but runtime negotiation tests are still needed because the specification does not execute the server's selection algorithm.

## Protect negotiated responses from cache confusion

When a server chooses a representation based on Accept, shared caches need to know that the request header influenced selection. Vary: Accept is the conventional signal. Without it, a cache can store CSV from one client and serve it to a later JSON client under the same URL.

Assert Vary on cacheable negotiated responses. Parse it as a comma-separated, case-insensitive field-name set because intermediaries can combine values. Do not demand Vary: Accept when the URL always produces exactly one representation and Accept never changes output; unnecessary variation reduces cache efficiency.

An integration test should go beyond checking the header when a CDN or reverse proxy is in scope. Request JSON, then CSV, then JSON again through the deployed cache using a unique resource. Verify each Content-Type and body. That catches cache-key configuration that origin-only tests cannot see.

ETags also need representation awareness. If JSON and CSV bytes differ, a shared strong ETag is invalid. Conditional requests should return 304 only for the selected representation's validator. Build this test only for endpoints advertising caching, and control resource identity so concurrent mutations do not muddy the result.

## Compare negotiation with alternative representation designs

Accept is not always the best product interface. Teams sometimes choose explicit URLs because they are visible, cache-friendly, and easy for browsers to download. The tradeoff should be deliberate.

| Design | Example | Strength | Testing emphasis |
| --- | --- | --- | --- |
| Proactive negotiation | Accept: text/csv | One resource URI, standard HTTP mechanism | Parser precedence, Content-Type, Vary |
| File extension | /reports/42.csv | Obvious format and simple cache key | Routing, extension mismatch, canonical links |
| Query parameter | /reports/42?format=csv | Easy client construction | Validation, cache query keys, unsupported value |
| Separate export resource | /reports/42/export | Can model asynchronous generation | Job lifecycle, authorization, retention |
| Vendor media type version | Accept: application/vnd.acme.report+json;version=2 | Keeps representation choice in headers | Parameter matching and version retirement |

Do not test one design as though it were another. A format query parameter has no q weighting. An export job may return 202 rather than a representation immediately. URI-based versioning avoids header negotiation but creates its own routing and deprecation contracts.

## Keep the suite small enough to explain failures

A pairwise set usually beats every permutation of media range, weight, endpoint, authorization role, language, compression, and cache state. Cover parser behavior on one representative endpoint, then give each other endpoint exact-type and rejection cases plus its unique representations.

Generate cases from an explicit inventory, not from OpenAPI content keys alone. Documentation can drift, and blindly generated expected values merely repeat that drift. Combine schema validation with hand-selected semantic cases: exclusion through q=0, wildcard selection, a tie rule, unsupported media, and default behavior.

Log the Accept value, selected Content-Type, status, and a safely truncated body on failure. The [API testing best practices guide](/blog/api-testing-best-practices-guide) provides broader advice on data isolation and response assertions. For negotiation, the most useful diagnostic remains the complete preference list alongside the server's declared inventory.

## Include non-success responses in the representation matrix

Negotiation does not apply only to 200 responses. A validation failure, authentication challenge, or rate-limit response also has a representation. Teams often test a JSON success and then discover that the same endpoint returns an HTML error page from middleware when Accept requests JSON.

Choose one failure from each error-producing layer: router, authentication middleware, request validation, domain handler, and gateway where available. Send the representation preferences supported by that layer, then assert both the HTTP semantics and the selected \`Content-Type\`. A 401 still needs its authentication challenge; a negotiated Problem Details body does not replace \`WWW-Authenticate\`.

Avoid demanding that every error support CSV just because the success resource does. An API can define JSON Problem Details as its stable error representation while offering CSV for successful report downloads. The contract must say what happens when the client's Accept list permits CSV but rejects the error format. Tests should encode that policy rather than extrapolating from the success catalog.

## Detect framework upgrades that change tie-breaking

Equal-quality media ranges expose server preference rules. Some frameworks use offer order, some apply specificity first, and application configuration can add another quality factor. HTTP semantics do not rescue an API that leaves client-visible ties undocumented.

Create a characterization test for every tie on which a consumer depends. Name the alternatives and explain the chosen winner. If either result is usable and no client branches on it, assert that the response is a member of the acceptable set. An arbitrary exact expectation would then create upgrade work without protecting behavior.

Review these tests when changing serializers or framework versions. A new formatter can become an eligible representation and alter selection even though controller code is untouched. Compare the advertised OpenAPI content map, runtime formatter registry, and test inventory during the upgrade.

Also probe duplicate media ranges with conflicting weights only if the parser behavior is documented. Malformed-input robustness is useful, but it should not be confused with a portable negotiation rule. Record whether the platform rejects, normalizes, or selects, and keep security limits for excessively large headers at the gateway boundary.

Capture the raw response bytes for at least one non-JSON representation. A helper that calls \`response.json()\` regardless of \`Content-Type\` can make a selector defect look like a parser failure. CSV should be decoded and checked for its header row, while binary media needs byte-oriented assertions. Representation-specific verification is the final proof that selection and serialization agree.

## Frequently Asked Questions

### Must an API return 406 whenever Accept cannot be satisfied?

No. HTTP semantics allow a server either to send 406 or to disregard the negotiation field and return a representation. Your API contract should choose one behavior, and tests should enforce that published choice.

### Is a missing Accept header equivalent to */*?

Both often lead to the default representation, but they are not identical inputs. Absence states no preference on that dimension, while */* explicitly matches every media type. Test both if middleware or gateways treat them differently.

### Does the highest q value always win?

Not by itself. Matching uses media-range specificity and parameters as well as weights, and server preference resolves some ties. Test exact exclusions mixed with wildcards because simplistic numeric sorting commonly fails there.

### Should a 406 response obey the original Accept header?

Define an error-format policy clients can actually use. Many APIs return application/problem+json for errors even when it was not listed, which HTTP can permit. The important requirement is predictable documentation and contract coverage.

### When should I assert Vary: Accept?

Assert it when a cacheable response can change because of Accept. Then test the real proxy or CDN with alternating formats, since an origin header check cannot prove the cache key is configured correctly.
`,
};
