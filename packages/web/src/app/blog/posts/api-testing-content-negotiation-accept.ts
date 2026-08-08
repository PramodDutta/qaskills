import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Content Negotiation with Accept: A Practical 406 and Media-Type Playbook',
  description: 'API testing content negotiation Accept workflows with runnable SuperTest cases for media types, quality values, wildcards, 406 responses, caching, and regressions.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# API Testing Content Negotiation with Accept: A Practical 406 and Media-Type Playbook

API testing content negotiation with Accept means proving that a server selects a representation the client permits, labels that representation correctly, and rejects an impossible request predictably. A useful suite covers the default response, exact media types, weighted alternatives, wildcards, explicit exclusions, unsupported types, and cache variation. It does not merely send \`Accept: application/json\` on every request and call the feature tested.

The core oracle is simple: parse the response's \`Content-Type\`, compare it with what the request's \`Accept\` field allows, and then validate the body according to the selected representation. When the server supports none of the acceptable alternatives, your contract should normally define a \`406 Not Acceptable\` response. The exact error representation also needs a rule, because an error body cannot honestly claim a media type that the client explicitly refused.

Use the [SuperTest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide) for the broader HTTP harness, lifecycle, and assertion patterns. If producer and consumer teams need independently deployable compatibility checks, extend these examples with the [contract testing Pact complete guide](/blog/contract-testing-pact-complete-guide). Content negotiation belongs in both provider behavior and consumer expectations.

## Model the two directions of representation metadata

\`Accept\` describes response formats the client is willing to receive. \`Content-Type\` describes the representation actually sent in a request or response body. Confusing them produces tests that pass for the wrong reason.

For a request such as \`POST /reports\`:

- Request \`Content-Type: application/json\` says the submitted body is JSON.
- Request \`Accept: text/csv\` says the desired response is CSV.
- Response \`Content-Type: text/csv; charset=utf-8\` says the returned bytes are CSV text.

A server can reject an unsupported request-body format with \`415 Unsupported Media Type\`. That is different from \`406 Not Acceptable\`, which concerns the available response representations. Test the two dimensions separately before combining them.

| Request condition | Decision under test | Typical response |
| --- | --- | --- |
| supported request \`Content-Type\`, supported \`Accept\` | parse input and select output | success with negotiated \`Content-Type\` |
| unsupported request \`Content-Type\` | cannot parse submitted representation | \`415 Unsupported Media Type\` |
| supported input, no acceptable output | cannot satisfy response preference | \`406 Not Acceptable\` |
| no \`Accept\` field | any response media type is acceptable | API's documented default |
| \`Accept: */*\` | any media type is acceptable | API's documented default |
| malformed preference syntax | contract-specific validation behavior | documented client error or tolerant handling |

Do not infer that a JSON request requires a JSON response. Request and response formats are independently negotiated unless your API contract deliberately couples them.

## Create a small server with observable representation branches

The examples use Express and its documented \`req.accepts\` behavior. The endpoint can return JSON, plain text, or CSV. It places its supported types in preference order, so equal client preferences resolve deterministically according to the service contract.

\`\`\`ts
import express, { type Request, type Response } from 'express';

export const app = express();

type Report = {
  id: number;
  status: 'ready';
  total: number;
};

const report: Report = { id: 17, status: 'ready', total: 42 };

app.get('/reports/17', (req: Request, res: Response) => {
  res.vary('Accept');

  const selected = req.accepts([
    'application/json',
    'text/csv',
    'text/plain'
  ]);

  if (selected === 'application/json') {
    res.type('application/json').send(report);
    return;
  }

  if (selected === 'text/csv') {
    res.type('text/csv').send('id,status,total\\n17,ready,42\\n');
    return;
  }

  if (selected === 'text/plain') {
    res.type('text/plain').send('report 17: ready, total 42\\n');
    return;
  }

  res.status(406).end();
});
\`\`\`

The explicit \`res.vary('Accept')\` matters whenever a shared cache might store the route. It tells caches that the selected response can change based on that request header. Without it, a cache might serve a CSV response to a later JSON client or vice versa. Whether every API response is publicly cacheable is a separate decision; \`Vary\` still documents the selection dimension.

This example chooses a bodyless 406 because no listed representation is acceptable. Another contract can define a fallback problem format, but it must explain whether that error type is exempt from ordinary negotiation. Pick one rule and test it rather than accidentally returning JSON after a client sent \`application/json;q=0\`.

## Establish the baseline before testing preference syntax

Begin with requests that expose the default. The absence of \`Accept\` means the client has not restricted the response media type. Many HTTP clients send \`*/*\` automatically, which has the same practical effect for selection. Your API should document which supported representation becomes the default.

\`\`\`ts
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { app } from './app.js';

test('uses JSON when Accept is absent', async () => {
  const response = await request(app)
    .get('/reports/17')
    .expect(200)
    .expect('Vary', /Accept/)
    .expect('Content-Type', /^application\\/json(?:;|$)/);

  assert.deepEqual(response.body, {
    id: 17,
    status: 'ready',
    total: 42
  });
});

test('uses the same documented default for a full wildcard', async () => {
  await request(app)
    .get('/reports/17')
    .set('Accept', '*/*')
    .expect(200)
    .expect('Content-Type', /^application\\/json(?:;|$)/);
});
\`\`\`

The regular expression permits parameters such as \`charset=utf-8\` after the media type. An exact string assertion against \`application/json\` is too strict because valid \`Content-Type\` values commonly include parameters. Conversely, asserting only that the header contains \`json\` is too loose because it can accept an unrelated or malformed type.

Parse the body based on the selected representation. SuperTest exposes JSON bodies conveniently, while text formats arrive through \`response.text\`. A test that always reads \`response.body\` may silently assert against an empty object for CSV.

## Exercise exact types, weighted alternatives, and wildcards

The \`Accept\` field can contain a comma-separated list of media ranges. A quality value, written as \`q\`, expresses relative preference from 0 through 1. A value of 0 means the range is not acceptable. When quality is equal, more specific media ranges and server selection rules determine the result.

Use a matrix that makes every expectation visible:

| Accept value | Supported candidates | Expected selection | Reason |
| --- | --- | --- | --- |
| \`text/csv\` | JSON, CSV, text | CSV | exact supported type |
| \`text/plain;q=0.4, application/json;q=0.9\` | JSON, CSV, text | JSON | higher client weight |
| \`text/*\` | CSV and plain text | documented server preference | both match the range |
| \`application/*\` | JSON | JSON | subtype wildcard matches |
| \`application/xml, text/csv;q=0.5\` | CSV | CSV | unsupported XML is ignored |
| \`application/json;q=0, text/csv;q=1\` | JSON and CSV | CSV | JSON is explicitly excluded |
| \`image/png\` | none | 406 | no supported range matches |

Implement the high-value cases as data-driven tests. Keep expected body assertions representation-specific so a route cannot return JSON bytes with a CSV label and pass.

\`\`\`ts
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { app } from './app.js';

const cases = [
  {
    name: 'selects CSV exactly',
    accept: 'text/csv',
    contentType: /^text\\/csv(?:;|$)/,
    body: 'id,status,total\\n17,ready,42\\n'
  },
  {
    name: 'prefers JSON by quality',
    accept: 'text/plain;q=0.4, application/json;q=0.9',
    contentType: /^application\\/json(?:;|$)/,
    body: { id: 17, status: 'ready', total: 42 }
  },
  {
    name: 'falls back from unsupported XML to CSV',
    accept: 'application/xml, text/csv;q=0.5',
    contentType: /^text\\/csv(?:;|$)/,
    body: 'id,status,total\\n17,ready,42\\n'
  }
] as const;

for (const example of cases) {
  test(example.name, async () => {
    const response = await request(app)
      .get('/reports/17')
      .set('Accept', example.accept)
      .expect(200)
      .expect('Content-Type', example.contentType);

    const actual = response.type === 'application/json'
      ? response.body
      : response.text;
    assert.deepEqual(actual, example.body);
  });
}
\`\`\`

Do not copy the expected winner for \`text/*\` from another framework. When multiple server representations match the same range, the application's offered-type order or framework algorithm can decide. Define that tie in your own API contract, then pin it with a test. The client expressed a range, not a demand for one particular text subtype.

## Treat q=0 as an exclusion, not a low preference

One of the most valuable regression cases is explicit refusal. Teams often sort alternatives by weight but forget to remove entries with zero quality. That creates a response the client expressly said it cannot use.

\`\`\`ts
import test from 'node:test';
import request from 'supertest';
import { app } from './app.js';

test('does not select JSON when JSON has q=0', async () => {
  await request(app)
    .get('/reports/17')
    .set('Accept', 'application/json;q=0, text/csv;q=1')
    .expect(200)
    .expect('Content-Type', /^text\\/csv(?:;|$)/);
});

test('returns 406 when every supported type is excluded', async () => {
  await request(app)
    .get('/reports/17')
    .set(
      'Accept',
      'application/json;q=0, text/csv;q=0, text/plain;q=0'
    )
    .expect(406);
});
\`\`\`

The bodyless response avoids declaring one of the representations the client excluded. If your organization standardizes all errors as \`application/problem+json\`, document whether that type is sent regardless of \`Accept\` or only when accepted. Consistency is valuable, but an undocumented exception is not negotiation.

## Validate structured syntax suffixes and vendor media types deliberately

Media types such as \`application/problem+json\` and \`application/vnd.example.report+json\` use a structured syntax suffix. The \`+json\` suffix signals JSON-compatible representation syntax, but it does not make the media types interchangeable for selection. A client that accepts only \`application/json\` has not necessarily accepted every vendor-specific \`+json\` type.

If your versioning strategy uses vendor media types, enumerate them in provider code and tests:

\`\`\`ts
import express from 'express';

export const versionedApp = express();

versionedApp.get('/customers/9', (req, res) => {
  res.vary('Accept');
  const selected = req.accepts([
    'application/vnd.acme.customer.v2+json',
    'application/vnd.acme.customer.v1+json'
  ]);

  if (selected === 'application/vnd.acme.customer.v2+json') {
    res.type(selected).send({ id: 9, displayName: 'Ada', active: true });
    return;
  }

  if (selected === 'application/vnd.acme.customer.v1+json') {
    res.type(selected).send({ id: 9, name: 'Ada' });
    return;
  }

  res.status(406).end();
});
\`\`\`

Now assert both the label and versioned shape:

\`\`\`ts
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { versionedApp } from './versioned-app.js';

test('returns the v1 contract only for the v1 media type', async () => {
  const response = await request(versionedApp)
    .get('/customers/9')
    .set('Accept', 'application/vnd.acme.customer.v1+json')
    .expect(200)
    .expect(
      'Content-Type',
      /^application\\/vnd\\.acme\\.customer\\.v1\\+json(?:;|$)/
    );

  assert.deepEqual(response.body, { id: 9, name: 'Ada' });
  assert.equal('displayName' in response.body, false);
});

test('does not silently treat application/json as the vendor type', async () => {
  await request(versionedApp)
    .get('/customers/9')
    .set('Accept', 'application/json')
    .expect(406);
});
\`\`\`

That second test is a policy choice made explicit. If the API deliberately treats \`application/json\` as the latest version, offer it as a separate supported type and test the chosen response contract. Do not rely on substring checks for \`json\`, because they erase the versioning decision.

## Verify parameters instead of stripping them blindly

Media ranges can carry parameters. APIs sometimes version a representation with a parameter such as \`application/json; version=2\`, while \`charset\` commonly appears on response types. Parameter handling deserves explicit cases because libraries differ in what they expose and applications frequently normalize too early.

| Parameter scenario | Risk | Useful assertion |
| --- | --- | --- |
| response adds \`charset=utf-8\` | brittle exact header equality | media type matches and charset is valid |
| client asks for version parameter | server silently returns another schema | selected version and body schema agree |
| client sends unknown parameter | accidental acceptance or unnecessary rejection | behavior matches published contract |
| quality value appears after parameters | hand parser associates weight incorrectly | framework selection matches expected alternative |
| duplicate media ranges differ by parameters | naive map overwrites one entry | deterministic documented result |

Avoid writing a home-grown parser by splitting the field on commas and semicolons. Quoted parameter values complicate naive splitting, and selection requires quality, specificity, and precedence rules. Use the negotiation facility supplied by a mature framework or a dedicated standards-aware library, then test the behavior your endpoint promises. If security policy requires rejecting oversized or malformed headers, apply that validation at the gateway or HTTP stack and test it separately from ordinary selection.

## Catch the cache bug that unit tests miss

A realistic production failure looks like this:

1. A CSV client requests \`/reports/17\` with \`Accept: text/csv\`.
2. The origin returns CSV, and an intermediary cache stores it using only the URL as the key.
3. A browser requests the same URL with \`Accept: application/json\`.
4. The cache serves the stored CSV without contacting the origin.
5. Origin-level SuperTest cases all remain green.

Diagnosis starts with the received \`Content-Type\`, response age or cache headers, and a direct request that bypasses the intermediary. If direct origin responses negotiate correctly but cached responses do not, inspect \`Vary: Accept\` and cache-key configuration. The defect is not JSON parsing and not a random flaky client.

At the application layer, pin the required header:

\`\`\`ts
import test from 'node:test';
import request from 'supertest';
import { app } from './app.js';

for (const accept of ['application/json', 'text/csv', 'text/plain']) {
  test('declares Accept variation for ' + accept, async () => {
    await request(app)
      .get('/reports/17')
      .set('Accept', accept)
      .expect(200)
      .expect('Vary', /(?:^|,\\s*)Accept(?:,|$)/i);
  });
}
\`\`\`

Then add an environment-level test through the actual CDN or reverse proxy in a non-production stage: request CSV, request JSON for the same URL, and prove each body and header match. Do not make every PR depend on a third-party cache if it creates instability. A post-deployment smoke test or dedicated integration environment is often the right layer.

## Keep HEAD, errors, and conditional requests consistent

Negotiation does not occur only on the happy-path GET. A mature matrix includes adjacent HTTP behaviors:

- \`HEAD\` should select metadata as the corresponding \`GET\` would, while returning no response body.
- A negotiated error should use the documented error media type and schema.
- A conditional request returning \`304 Not Modified\` must remain coherent with the cached negotiated variant.
- Authentication failures generated by middleware may bypass route-level negotiation.
- Rate-limit and gateway errors may use a platform-wide representation.

Test ownership boundaries. If an API gateway generates 429 responses, a unit test against Express cannot prove their media type. Conversely, a broad end-to-end suite may tell you that the wrong type arrived but not which middleware branch chose it. Keep one focused suite per decision maker and a small number of cross-stack journeys.

A HEAD assertion can be concise:

\`\`\`ts
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { app } from './app.js';

test('HEAD exposes the negotiated CSV type without a body', async () => {
  const response = await request(app)
    .head('/reports/17')
    .set('Accept', 'text/csv')
    .expect(200)
    .expect('Content-Type', /^text\\/csv(?:;|$)/);

  assert.equal(response.text, undefined);
});
\`\`\`

Whether Express automatically maps HEAD to the GET route is documented behavior, but custom middleware can still alter the result. The test protects your deployed composition.

## What people get wrong in Accept test suites

The most common mistake is asserting only status. A server can return 200 with JSON while labeling it CSV, select a forbidden type, omit \`Vary\`, or return a v2 body under a v1 media type. All of those can pass \`.expect(200)\`.

Other traps are equally practical:

- Sending the same exact \`Accept\` value in every test, which checks routing but not negotiation.
- Treating header names as case-sensitive even though HTTP field names are case-insensitive.
- Comparing the entire \`Content-Type\` string and failing on a legitimate charset parameter.
- Accepting any string containing \`json\`, which collapses standard, problem, and vendor types.
- Assuming a missing \`Accept\` means JSON by protocol. It means no restriction; JSON is your API's default choice.
- Expecting \`415\` for an unsupported response preference. That status concerns the request content representation.
- Implementing quality sorting but ignoring \`q=0\` exclusions.
- Using a client library's automatic \`Accept: */*\` and believing the missing-header branch was tested.

The subtle insight is that a content-negotiation suite is a compatibility matrix, not a parser unit test. You do not need to exhaust every grammar production at every endpoint. Cover the supported representation set centrally, then add endpoint tests where schemas or formats differ. Let the HTTP library own standards parsing, while your assertions own product policy.

## Assemble a lean release matrix

For each negotiable resource family, record the supported media types, default, error rule, and version behavior. Then run this release set:

- No \`Accept\`, verifying the documented default.
- \`*/*\`, verifying the same or another explicitly documented default.
- Every exact supported media type, with body validation.
- Two supported types with distinct quality values.
- One supported wildcard where the selection is contractually fixed.
- A supported type with \`q=0\` plus an acceptable fallback.
- Only unsupported types, verifying 406 and its body policy.
- The relevant vendor or parameterized version cases.
- \`Vary: Accept\` wherever caches can reuse responses.
- One proxy-level variant test if an intermediary is in scope.
- HEAD and representative error paths.

This matrix is small enough to run on every change, but it detects the failures that production clients actually feel. It also gives AI coding agents a precise contract: offered types, preference rules, negative behavior, and body schemas are observable rather than implied.

## Frequently Asked Questions

### Is Accept required on every API request?

No. When \`Accept\` is absent, the client has not constrained the response media type, so the server may choose any available representation. Your API should still document a stable default because clients need predictable parsing. Be aware that HTTP tools often add \`Accept: */*\` automatically. If you need to test the truly absent-field path, inspect what the client sends or use a harness that lets you omit the header explicitly. Do not describe absence as a protocol-level demand for JSON.

### What is the difference between 406 and 415 in content-negotiation tests?

\`406 Not Acceptable\` means the server cannot produce a response representation allowed by the request's \`Accept\` preferences. \`415 Unsupported Media Type\` means the server does not support the representation of the request body, described by request \`Content-Type\`. A POST can trigger either: JSON input with an XML-only response preference can lead to 406, while unsupported XML input can lead to 415 before response selection. Keep independent tests so middleware ordering does not hide one branch.

### Should application/json match every media type ending in +json?

Do not assume so. A structured \`+json\` suffix indicates JSON representation syntax, but a vendor type or \`application/problem+json\` remains a distinct media type with its own semantics. If your API wants \`application/json\` to act as an alias for a vendor version, implement and document that policy explicitly. Tests should assert both the selected \`Content-Type\` and the corresponding schema. Substring matching on \`json\` is not a reliable negotiation oracle.

### How many Accept combinations should each endpoint test?

Test the full selection matrix once per representation family or shared negotiation component, then give each endpoint exact-type tests for the formats and schemas it actually supports. Add endpoint-specific cases when defaults, versions, or error formats differ. A practical minimum includes absence, full wildcard, every supported exact type, weighted alternatives, a zero-quality exclusion, and an unsupported-only 406 case. This balances standards coverage with maintainability and avoids duplicating dozens of parser cases across routes that share the same code.
`,
};
