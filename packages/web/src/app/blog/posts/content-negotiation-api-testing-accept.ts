import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Content Negotiation: Accept Headers, Defaults, and 406 Cases',
  description:
    'Content negotiation testing verifies Accept handling, server defaults, and 406 Not Acceptable paths so API clients get the representation they asked for.',
  date: '2026-08-28',
  category: 'API Testing',
  content: `
# Testing Content Negotiation: Accept Headers, Defaults, and 406 Cases

Content negotiation testing means proving that your API picks a response representation from the client's \`Accept\` (and related) preferences, falls back to a documented default when preferences are missing or wildcards, and returns **406 Not Acceptable** when nothing matches. You must verify preference order (q-values), the selected \`Content-Type\`, the \`Vary\` advertisement, vendor media types used for versioning, and negative paths where servers wrongly return 400, 415, or 200 with the wrong body. If those checks are absent, clients break silently when someone adds XML, Proto, or a new \`vnd\` type.

## What Content Negotiation Actually Means for Testers

HTTP content negotiation is the server choosing among multiple possible representations of the same resource. For API testers, that is not an abstract RFC footnote. It is a contract: the client states what it can handle, the server either satisfies that preference or refuses cleanly, and intermediaries (caches, CDNs, API gateways) must not serve the wrong variant to the next caller.

Three request headers show up most often in API work:

| Header | What the client is asking for | Typical tester focus |
| --- | --- | --- |
| \`Accept\` | Preferred media types for the response body | JSON vs XML vs vendor types, q-values, 406 |
| \`Accept-Language\` | Preferred natural language | Locale strings, fallback language, \`Content-Language\` |
| \`Accept-Encoding\` | Preferred transfer encodings | gzip/br identity, \`Content-Encoding\`, double compression bugs |

Most product APIs live or die on \`Accept\`. Language and encoding still matter for public sites and edge layers, but if you only have time for one negotiation suite, build it around media types first.

A useful mental model for testers: negotiation is a **selection** problem with an explicit **refusal** path. Selection means the server maps the request to one concrete representation and labels the response with the matching \`Content-Type\`. Refusal means status **406** (for unacceptable \`Accept\`) rather than inventing a body the client said it cannot parse. Confusing that refusal with **415 Unsupported Media Type** is one of the most common production defects. 415 is about the *request* body media type (\`Content-Type\` on POST/PUT/PATCH). 406 is about the *response* preferences in \`Accept\`. Mixing them in docs or handlers trains clients to handle the wrong failure mode.

What you must verify on every negotiated endpoint:

1. Documented media types actually work when requested explicitly.
2. q-value ordering is respected when multiple types are listed.
3. \`*/*\` and type wildcards (\`application/*\`) resolve to the documented default or the highest-priority match.
4. Missing \`Accept\` still produces a stable, documented default.
5. Impossible preferences produce 406 (or a documented alternate policy), never a silent wrong type.
6. Response \`Content-Type\` matches the negotiated choice, including parameters such as \`charset\`.
7. \`Vary\` includes \`Accept\` (and any other headers that affected the choice) so caches do not poison variants.

Failure story: a payments team shipped "JSON only" for two years. Mobile and web both sent \`Accept: application/json\`. Nobody tested missing \`Accept\`, \`*/*\`, or \`application/xml\`. A partner integration used a Java HTTP client whose default \`Accept\` was \`text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2\`. The API framework treated the first concrete type as a hard requirement, decided it could not produce HTML, and returned **406** with an HTML error page from the reverse proxy. The partner saw 406 and assumed the resource did not exist. Support spent a week blaming API keys. The root cause was untested negotiation defaults and a proxy that rewrote error bodies without preserving JSON. Content negotiation testing would have caught both the client default mismatch and the proxy mutation in a single matrix run.

People get this wrong in predictable ways. They assert status 200 and parse JSON without reading \`Content-Type\`. They treat \`Accept\` as optional decoration. They never send q-values. They never assert \`Vary\`. They document "we support JSON and XML" but only automate JSON. They return 400 for unknown \`Accept\` values because "validation middleware" treats unknown headers as bad input. None of those habits survive contact with non-browser clients.

Another recurring miss: testing only the happy path Accept your own SPA sends. That proves one client works. It does not prove the API honors negotiation. Partner SDKs, batch jobs, and API gateways rewrite or inject Accept lists. Your suite must include those shapes even if marketing says "we are JSON-first." JSON-first still needs an explicit default policy and a refusal policy, and both belong in automation.

When you inherit an API with no negotiation tests, start with four probes before building the full matrix: explicit JSON, omitted Accept, \`*/*\`, and an unsupported type expecting 406. Those four expose most production incidents. Expand into q-values and vendor types once the baseline is green on every environment that fronts the service, including the cached edge.

## Accept Header Grammar Worth Encoding in Tests

RFC 9110 defines \`Accept\` as a list of media ranges with optional parameters and optional quality values (\`q\`). You do not need to re-implement a full parser in every test file, but you do need fixtures that exercise the grammar your server claims to honor.

Core shapes worth encoding:

| Media range example | Meaning for the server | Assertion idea |
| --- | --- | --- |
| \`application/json\` | Exact type | Body parses as JSON; \`Content-Type\` starts with \`application/json\` |
| \`application/*\` | Any subtype under application | Should match JSON or your application/* default |
| \`*/*\` | Any type | Should select the server default representation |
| \`application/json;q=0.8, application/xml;q=0.9\` | Prefer XML over JSON | If XML is supported, \`Content-Type\` is XML |
| \`application/json;q=0\` | Explicitly refuse JSON | Must not return JSON if another match exists; else 406 |
| \`application/vnd.myapi.v2+json\` | Vendor type with version | Pins representation version independently of URL |

Quality values range from 0 to 1. Higher wins. Equal q-values usually fall back to server-defined precedence or specificity rules. Your tests should not assume a particular tie-break unless the API docs state one. When docs are silent, freeze the observed behavior in golden tests and force a product decision.

Vendor media types matter for versioning. Many APIs use \`application/vnd.company.resource+json\` or \`application/vnd.company.resource.v2+json\` so that URL paths stay stable while representations evolve. Content negotiation testing for those types is version testing in disguise: send v1 and v2 Accept values, compare fields, and confirm that unknown vendor types do not quietly map to the latest version.

Parameters beyond \`q\` also appear in the wild. Charset parameters on Accept are uncommon for JSON APIs but still show up in older XML clients (\`application/xml;charset=utf-8\`). Decide whether unknown parameters are ignored or cause refusal, then lock that rule with one fixture each. The same applies to \`profile\` or custom parameters some hypermedia APIs attach to media types. If the server ignores them today, a golden test prevents a framework upgrade from suddenly requiring them.

Specificity rules interact with wildcards. A server that supports \`application/json\` and \`application/xml\` should treat \`application/*\` as a match and then apply server preference or documented default among application subtypes. Testers should not invent a preference order. Read the docs, or if docs are empty, capture current behavior and open a ticket to make it intentional. Silent "JSON always wins" logic without documentation is still a contract; it just becomes an accidental one.

Here is a Node \`fetch\` probe that checks exact type selection and header labels:

\`\`\`typescript
async function assertJsonNegotiation(baseUrl: string): Promise<void> {
  const response = await fetch(\`\${baseUrl}/orders/123\`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status !== 200) {
    throw new Error(\`expected 200, got \${response.status}\`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new Error(\`unexpected Content-Type: \${contentType}\`);
  }

  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null) {
    throw new Error('JSON body was not an object');
  }
}
\`\`\`

Add a second case that prefers XML when both are offered:

\`\`\`typescript
async function assertXmlPreferred(baseUrl: string): Promise<void> {
  const response = await fetch(\`\${baseUrl}/orders/123\`, {
    headers: {
      Accept: 'application/json;q=0.5, application/xml;q=0.9',
    },
  });

  if (response.status !== 200) {
    throw new Error(\`expected 200, got \${response.status}\`);
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.includes('xml')) {
    throw new Error(\`expected XML Content-Type, got \${contentType}\`);
  }
}
\`\`\`

For Playwright's APIRequestContext, the same intent reads like this:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('vendor v2 media type wins over generic json', async ({ request }) => {
  const response = await request.get('/catalog/items/9', {
    headers: {
      Accept: 'application/vnd.shop.item.v2+json, application/json;q=0.8',
    },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/application\\/vnd\\.shop\\.item\\.v2\\+json/i);

  const json = await response.json();
  expect(json).toHaveProperty('schemaVersion', 2);
});
\`\`\`

Raw HTTP remains useful in reviews and when teaching gateway behavior:

\`\`\`http
GET /orders/123 HTTP/1.1
Host: api.example.com
Accept: application/vnd.payments.order.v1+json;q=1.0, application/json;q=0.7
\`\`\`

Encode at least one test where \`q=0\` excludes a type the server otherwise loves. Teams often implement "first matching supported type" and ignore q-values entirely. That bug only appears when a client sends an explicit zero.

Also encode malformed \`Accept\` values as a separate policy test. Some stacks return 400, some ignore the header and use the default, some return 406. Whatever your API promises, freeze it. Do not let frameworks silently change that policy on upgrade.

## Default Representation When Clients Send Nothing Useful

"Nothing useful" covers three common client behaviors:

1. Omitting \`Accept\` entirely.
2. Sending only \`*/*\`.
3. Sending a broad browser-like list where your API types appear late or at low q.

Browsers and generic HTTP libraries disagree wildly on defaults. curl historically sends \`*/*\`. Many SDKs send \`application/json\`. Browser navigations send long HTML-first lists. Your public docs should state the server default in one sentence, for example: "If \`Accept\` is missing or \`*/*\`, responses use \`application/json; charset=utf-8\`."

Tester obligations follow from that sentence. Assert the default with an intentional omission:

\`\`\`typescript
async function assertDefaultWhenAcceptMissing(baseUrl: string): Promise<void> {
  const response = await fetch(\`\${baseUrl}/orders/123\`);
  // Note: fetch in browsers may add */*; Node fetch typically does not force JSON.
  expectStatus(response, 200);
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    throw new Error(\`default Content-Type drifted: \${contentType}\`);
  }
}

function expectStatus(response: Response, expected: number): void {
  if (response.status !== expected) {
    throw new Error(\`expected \${expected}, got \${response.status}\`);
  }
}
\`\`\`

If your test HTTP client injects its own \`Accept\`, disable that or bypass it. Otherwise you are testing the client defaults, not the server. Playwright request fixtures and supertest-style agents both need an explicit "no Accept" path when the library adds headers automatically.

Wildcard defaults deserve their own row in the matrix:

| Request \`Accept\` | Expected status | Expected \`Content-Type\` prefix | Notes |
| --- | --- | --- | --- |
| *(header omitted)* | 200 | \`application/json\` | Documented server default |
| \`*/*\` | 200 | \`application/json\` | Same as omit, unless docs differ |
| \`application/*\` | 200 | \`application/json\` | Or first application/* in server order |
| \`text/*\` only on a JSON-only resource | 406 | problem+json or documented error type | Refusal, not silent HTML |
| \`application/json;q=0, */*;q=0\` | 406 | documented error type | Everything explicitly refused |

Defaults also interact with error payloads. When the happy path defaults to JSON, error paths should not suddenly become HTML from a framework exception page. Pair negotiation tests with structured error assertions; the same discipline used for [RFC 7807 problem details API error testing](/blog/rfc-7807-problem-details-api-error-testing) applies when the refused representation still needs a machine-readable explanation.

Accept-Language defaults follow the same pattern: omit the header, send \`*\`, send unsupported tags, and assert \`Content-Language\` plus body strings. Prefer one primary language test resource with known translations rather than scattering locale asserts across the whole suite. When a language tag is unsupported, either fall back to the default language with a still-200 response or refuse according to docs; both policies are valid, mixed policies are not.

Accept-Encoding defaults are mostly infrastructure: identity must work, gzip should be optional unless docs require it, and you should never need Accept-Encoding to obtain a correct \`Content-Type\`. Keep encoding checks brief unless you own the edge layer. If you do own it, assert that \`Accept-Encoding: identity\` still returns the negotiated media type uncompressed, and that tools which auto-decompress do not hide a missing \`Content-Encoding\` bug from your assertions.

One more default trap: API gateways that inject \`Accept: application/json\` on the way in. Your service-under-test may look correct in local tests while production clients that omit Accept never hit the true server default. Run the omit case against the publicly routed URL in staging. If the gateway injects a header, document that as part of the external contract or disable the injection for APIs that must honor raw client preferences.

## Building a Negotiation Matrix That Catches Drift

A negotiation matrix is a table of inputs (Accept values, maybe Accept-Language) against expected outcomes (status, Content-Type, body predicates, Vary). Drift means a new representation ships, a gateway changes defaults, or a library upgrade starts respecting q-values differently. Matrices catch that because every cell is an executable expectation.

Design the matrix around **resource families**, not around individual URLs only. If \`/orders/{id}\` and \`/orders\` share serializers, one parameterized suite can cover both. Keep a second suite for endpoints that intentionally differ (exports as CSV, reports as PDF).

Minimal columns that pay rent:

- \`accept\` input string (or symbol for omitted)
- expected status
- expected content-type matcher (exact, prefix, or regex)
- optional body assertion name
- whether \`Vary\` must include \`Accept\`

Example matrix fragment for an orders API that supports JSON, a vendor v1 type, and XML:

| Case id | Accept | Status | Content-Type matcher | Body check |
| --- | --- | --- | --- | --- |
| json-exact | \`application/json\` | 200 | \`^application/json\` | \`hasOrderShape\` |
| vnd-v1 | \`application/vnd.shop.order.v1+json\` | 200 | vendor v1 | \`hasV1Fields\` |
| xml-exact | \`application/xml\` | 200 | \`xml\` | \`hasXmlRoot\` |
| prefer-xml | \`application/json;q=0.2, application/xml;q=0.8\` | 200 | \`xml\` | \`hasXmlRoot\` |
| star-star | \`*/*\` | 200 | \`application/json\` | \`hasOrderShape\` |
| omit | *(omit)* | 200 | \`application/json\` | \`hasOrderShape\` |
| refuse-json | \`application/json;q=0\` | 406 | problem or JSON error | \`isNegotiationError\` |
| unknown | \`application/octet-stream\` | 406 | problem or JSON error | \`isNegotiationError\` |

Automating that matrix with Playwright:

\`\`\`typescript
import { test, expect } from '@playwright/test';

type Case = {
  id: string;
  accept?: string;
  status: number;
  contentType: RegExp;
};

const cases: Case[] = [
  { id: 'json-exact', accept: 'application/json', status: 200, contentType: /^application\\/json/i },
  { id: 'star-star', accept: '*/*', status: 200, contentType: /^application\\/json/i },
  { id: 'omit', status: 200, contentType: /^application\\/json/i },
  { id: 'unknown', accept: 'application/octet-stream', status: 406, contentType: /application\\/(problem\\+)?json/i },
];

for (const c of cases) {
  test(\`negotiation matrix: \${c.id}\`, async ({ request }) => {
    const headers: Record<string, string> = {};
    if (c.accept !== undefined) {
      headers.Accept = c.accept;
    }

    const response = await request.get('/orders/123', { headers });
    expect(response.status(), c.id).toBe(c.status);
    expect(response.headers()['content-type'] ?? '', c.id).toMatch(c.contentType);

    if (c.status === 200) {
      const vary = response.headers()['vary'] ?? '';
      expect(vary.toLowerCase(), \`Vary for \${c.id}\`).toContain('accept');
    }
  });
}
\`\`\`

Extend the matrix when you introduce representation versioning. Add cells that request \`v1\` and \`v2\` vendor types on the same URL and compare field sets. If v2 removes a field, assert absence. If URL versioning and Accept versioning both exist, add conflict cases (path says v1, Accept says v2) and document the winner.

Also include concurrency-sensitive resources carefully: negotiated representation should not bypass preconditions. If a client sends \`If-Match\` plus \`Accept\`, both mechanisms must compose. That pairing is easy to forget when header suites are owned by different teams; keep a cross-link mindset with [optimistic concurrency header testing](/blog/api-testing-optimistic-concurrency-headers) so ETag validators and media types are not tested in isolation forever.

Negative cells belong in the same matrix, not in a separate "maybe later" file. Unknown types, q=0 exclusions, and contradictory ranges (\`application/json;q=0, application/json\`) expose parser bugs. If your server normalizes duplicate types, assert the normalized behavior once and move on.

Operational tip: store the matrix as data (TypeScript array, JSON, YAML) rather than copy-pasted tests. When a product manager asks "what happens if someone sends protobuf," you add a row and the CI story writes itself. Human-readable case ids in failure messages matter; \`negotiation matrix: unknown\` beats a line number in a 200-case loop.

Watch for false confidence from soft matchers. A content-type check of \`/json/i\` passes for \`application/json\`, \`application/problem+json\`, and \`application/vnd.foo+json\`. That is fine for a coarse smoke cell, but success rows for exact resources should use anchored patterns such as \`/^application\\/json\\b/i\` or an exact vendor string. Problem details on a 200 response are a serializer bug, not a success.

## 406 Paths and How Servers Mislabel Them

**406 Not Acceptable** means the server cannot produce a representation matching the acceptable headers. For API testing, treat 406 as a first-class product response: stable status, stable error body shape, and no accidental success body.

Common mislabels:

1. **400 Bad Request** for an unknown \`Accept\` value. That teaches clients the request was malformed rather than merely unsupported.
2. **415 Unsupported Media Type** when the client sent a fine JSON body but an unsupported \`Accept\`. Wrong direction.
3. **200** with JSON while ignoring \`Accept: application/xml\`. Silent contract break.
4. **406** with an HTML body from a CDN or framework page when the client asked for JSON errors.
5. **500** after a serializer throws because the negotiated type path was never registered.

A focused negative test with \`fetch\`:

\`\`\`typescript
async function assertNotAcceptable(baseUrl: string): Promise<void> {
  const response = await fetch(\`\${baseUrl}/orders/123\`, {
    headers: {
      Accept: 'application/pdf',
    },
  });

  if (response.status !== 406) {
    throw new Error(\`expected 406, got \${response.status}\`);
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  // Prefer a negotiated error media type your clients can parse.
  if (!contentType.includes('json')) {
    throw new Error(\`406 body Content-Type should be JSON-compatible, got \${contentType}\`);
  }

  const problem = (await response.json()) as { title?: string; status?: number };
  if (problem.status !== 406) {
    throw new Error('error payload status field should echo 406');
  }
}
\`\`\`

Contrast that with a 415 case so the suite documents the distinction in code, not only in prose:

\`\`\`typescript
async function assertUnsupportedRequestMedia(baseUrl: string): Promise<void> {
  const response = await fetch(\`\${baseUrl}/orders\`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain',
    },
    body: 'not-json',
  });

  if (response.status !== 415) {
    throw new Error(\`expected 415 for bad request Content-Type, got \${response.status}\`);
  }
}
\`\`\`

Gateway and framework interactions deserve explicit cases. Run the 406 request through the public hostname, not only localhost-without-proxy. Proxies that inject HTML error pages will violate your JSON error contract. If you cannot fix the proxy immediately, the test still fails loudly and prevents calling the behavior "supported."

Policy forks you should force product owners to pick:

- Unsupported \`Accept\` on GET: always 406, or 200 default plus warning header? (Prefer 406 for strict APIs.)
- Partial matches on collections vs items: same rules everywhere?
- Whether \`Accept\` on 204/304 responses matters (usually no body, but Vary may still matter for caches).

Write those decisions into the matrix expected status column. Ambiguity in 406 policy is how partner SDKs accumulate special cases.

Error body negotiation deserves a short digression. Some APIs try to honor Accept even on failures: if the client asked for XML, the 406 payload is XML. Others always return problem+json for errors. Both can work. What fails in production is returning HTML for some failures and JSON for others depending on which middleware threw. Add one test that forces a 406 and one that forces a 500 (or a controlled domain error) and compare Content-Type stability. Clients need a single parse path for non-2xx bodies.

Also verify that 406 responses do not leak stack traces or upstream HTML when Accept asked for an API media type. Security and contract concerns meet here: an unacceptable Accept should still yield a controlled payload. If your edge converts unknown statuses into branded HTML, carve an exception for \`/api\` routes or disable that feature for machine clients.

## Response Headers That Prove the Choice (Content-Type, Vary)

Status codes alone do not prove negotiation worked. The response must label the chosen representation and tell caches which request headers influenced that choice.

**Content-Type** is the primary proof. Assert more than "contains json". Prefer matchers that allow optional \`charset=utf-8\` while rejecting \`application/problem+json\` on success paths and rejecting \`text/html\` everywhere you expect API payloads. For vendor types, assert the full type string or a tight regex.

**Vary** is the cache-safety proof. If the response changes based on \`Accept\` and \`Vary\` omits \`Accept\`, a shared cache can store the JSON body and later serve it to an XML client. That is not theoretical; it shows up on CDNs and API gateways with caching enabled. Your assertion can be pragmatic: when multiple representations exist, successful negotiated responses must include \`Accept\` in \`Vary\` (case-insensitive token match). If only one representation exists forever, document that \`Vary: Accept\` is optional, then add a test that fails when a second type is introduced without updating Vary.

Related headers worth a light touch:

| Response header | Why testers care | Pitfall |
| --- | --- | --- |
| \`Content-Type\` | Names the selected representation | Charset drift; \`+json\` suffix ignored by naive checks |
| \`Vary\` | Lists selecting request headers | Missing \`Accept\` causes cross-variant cache bugs |
| \`Content-Language\` | Confirms language negotiation | Default language undocumented |
| \`Content-Encoding\` | Confirms encoding negotiation | Testing tools auto-decode and hide mistakes |
| \`Content-Location\` | Alternate specific URI for a variant | Rare in APIs; do not require unless docs say so |

Example assertion helper that keeps proofs consistent across cases:

\`\`\`typescript
function assertNegotiatedSuccess(
  response: Response,
  contentTypePattern: RegExp,
): void {
  if (response.status !== 200) {
    throw new Error(\`expected 200, got \${response.status}\`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentTypePattern.test(contentType)) {
    throw new Error(\`Content-Type \${contentType} failed \${contentTypePattern}\`);
  }

  const vary = (response.headers.get('vary') ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase());

  if (!vary.includes('accept')) {
    throw new Error(\`Vary must include Accept, got "\${response.headers.get('vary')}"\`);
  }
}
\`\`\`

Do not stop at headers when the body can disagree. A response with \`Content-Type: application/xml\` and a JSON body is still a failure. Parse according to the declared type. For JSON, \`response.json()\`. For XML, use an XML parser or at least assert a root element string. For vendor types that are JSON-compatible (\`+json\`), parse as JSON and assert version fields.

Charset parameters cause flaky failures when environments disagree on defaults. Normalize before compare: lowercase the mime type, treat missing charset as acceptable if docs allow, but fail if charset becomes \`iso-8859-1\` when UTF-8 is required for emoji-heavy payloads.

Multi-variant caching drills help when you have a staging CDN. Request JSON, then XML, then JSON again for the same URL with a shared cache in front. If the third response is XML while Accept asked for JSON, Vary is wrong or the cache ignores it. Log response headers on failure, including any CDN-specific cache status header your provider exposes. Those drills sit above unit matrices and catch the class of bug unit tests never see.

For language negotiation, assert \`Content-Language\` alongside body substrings. For encoding, assert \`Content-Encoding\` only when you disabled client auto-decode; otherwise you may assert absence incorrectly. Media type negotiation proofs should remain independent of encoding proofs so a gzip regression does not look like an Accept regression.

## Automating Negotiation Checks in CI Pipelines

Negotiation tests belong in CI on every change that touches serializers, gateway config, OpenAPI media types, or error middleware. They are small, deterministic, and high signal compared to UI suites.

Practical layout:

1. **Contract unit layer**: table-driven tests against the service under test (Playwright \`request\`, Node \`fetch\`, or supertest-style listeners).
2. **Edge layer**: the same matrix against the staging public URL to catch proxy HTML and cache \`Vary\` mistakes.
3. **Smoke subset on main**: omit/xml/json/406 unknown, four cells, run on every PR.
4. **Full matrix nightly**: vendor versions, q-value permutations, language tags if applicable.

Keep fixtures free of invented HTTP helpers. Stick to \`fetch\`, \`Response.headers.get\`, Playwright \`APIRequestContext\` (\`request.get\`, \`response.status\`, \`response.headers\`, \`response.json\`), and raw HTTP dumps for debugging. Reviewers should recognize every call.

Seed data must exist for GET matrices. Create the order once in \`beforeAll\`, then negotiate against that id. For POST endpoints, negotiation still applies to response bodies: send \`Accept: application/vnd...v2+json\` and assert the create response speaks v2 even if the request body was plain JSON.

OpenAPI or similar specs should list supported media types per operation. Add a CI check that every \`content\` entry in the spec appears as a matrix row, and every matrix success type appears in the spec. Spec drift is how "we support XML" becomes folklore.

Optional local workflow: generate a markdown checklist of negotiation cells with \`qaskills.sh\`, then track pass/fail notes via the \`qaskills\` CLI while expanding rare vendor-type cases. Use that when a human is still deciding policy; replace it with pure automated assertions once the policy is stable.

Pipeline failure policy: treat negotiation mismatches as release blockers for public APIs. A wrong default \`Content-Type\` is as breaking as a renamed JSON field. Do not bury these tests in a flaky integration job that people ignore.

Wire a concise Node runner for environments that do not use Playwright:

\`\`\`typescript
async function runSmoke(baseUrl: string): Promise<void> {
  await assertJsonNegotiation(baseUrl);
  await assertDefaultWhenAcceptMissing(baseUrl);
  await assertNotAcceptable(baseUrl);
  await assertUnsupportedRequestMedia(baseUrl);
}

runSmoke(process.env.API_BASE_URL ?? 'http://127.0.0.1:3000').catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

Finally, record baselines when you intentionally change negotiation: adding a vendor v3 type should update the matrix, the OpenAPI \`content\` map, cache \`Vary\` expectations, and partner release notes together. Content negotiation testing is how you prove those four artifacts stayed aligned.

Ownership model: give serializer owners the matrix unit tests, give platform owners the edge Vary and HTML-error cases, and give API docs owners the OpenAPI media type sync check. When a failure lands, the case id should point to a team without a war room. Negotiation bugs often sit between layers, so split assertions by layer instead of arguing about whose green build lied.

Regression catalog worth keeping near the suite:

- New media type added in code but missing from OpenAPI and matrix
- Framework upgrade changes default when Accept is omitted
- Gateway starts injecting Accept or stripping Vary
- Error middleware returns HTML for 406
- Vendor version alias maps unknown \`vnd\` types to latest
- q=0 ignored by "first match" implementation
- Charset suddenly appears or disappears on Content-Type

Each item maps to one or two matrix rows or edge probes. If your CI cannot name which catalog item failed, sharpen the assertion messages until it can.

## Frequently Asked Questions

### Is a missing Accept header a bug in the client or the API?

Neither, by itself. HTTP allows omitted \`Accept\`, and servers are expected to pick a default representation. The bug appears when the default is undocumented, unstable across gateways, or different from what your SDKs assume. Test omitted \`Accept\`, document the default media type in one place, and make sure browser-like Accept lists still resolve the same way as \`*/*\` when that is your stated policy. Partners should still send explicit Accept values in production clients, but your API must behave predictably when they do not.

### Why do we get 415 when we meant to test Accept failures?

Because 415 reacts to the request body's \`Content-Type\`, not to \`Accept\`. If your test POSTs \`text/plain\` while experimenting with Accept values, you may be failing before negotiation runs. Split the cases: use GET or a JSON request body when proving 406 behavior, and use deliberately wrong request \`Content-Type\` only in 415 tests. Reading both status and which header you mutated prevents the mislabel loop that confuses support teams and client authors.

### Do we need Vary: Accept if we only serve JSON today?

If you truly have a single representation forever, omitting \`Vary: Accept\` may be harmless. The risk is tomorrow: a second type ships, caches already store unlabeled variants, and clients receive the wrong body without a deploy of the cache tier. Prefer including \`Accept\` in \`Vary\` as soon as the framework makes it easy, and make "second media type added" a checklist item that updates Vary assertions. For CDNs, verify the production edge honors origin Vary rather than stripping it.

### Should q-value ordering be tested if our clients never send q-values?

Yes, if your server or framework claims to implement Accept correctly, or if any non-first-party client might send q-values (browsers, API gateways, generated SDKs, corporate proxies). You do not need an exhaustive permutation set. A few cells are enough: prefer XML over JSON via q-values, exclude JSON with \`q=0\`, and confirm ties follow documented server precedence. Skipping q-values entirely is how "we support multiple types" becomes "we support whichever type appears first in the header string."
`,
};
