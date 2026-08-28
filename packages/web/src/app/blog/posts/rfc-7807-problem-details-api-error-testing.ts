import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RFC 7807 Problem Details: Testing API Error Formats Clients Can Parse',
  description:
    'RFC 7807 problem details standardize API error bodies. Test type, title, status, detail, Content-Type, and extensions so clients fail predictably.',
  date: '2026-08-28',
  category: 'API Testing',
  content: `
# RFC 7807 Problem Details: Testing API Error Formats Clients Can Parse

RFC 7807 problem details are a standard JSON (and XML) shape for HTTP API error responses: a problem object with optional \`type\`, \`title\`, \`status\`, \`detail\`, and \`instance\` members, served as \`application/problem+json\` (or \`application/problem+xml\`). You test them by forcing real failure paths, asserting the media type and status code, checking that \`status\` inside the body matches the HTTP status, treating \`type\` as the machine key (not free-text \`detail\`), and validating documented extension fields. RFC 9457 (July 2023) obsoletes RFC 7807 with the same core model plus a problem-type registry; your suite should still pass against either document when the payload matches that model.

If those checks are missing, clients invent parsers for every service's \`{ "error": "..." }\` dialect, mobile apps scrape human strings, and AI coding agents generate brittle matchers that break on the next localization pass.

## The Contract You Are Actually Testing

A problem details response is not "any JSON error with a message." It is a typed document that sits next to the HTTP status code. The status tells generic HTTP software (caches, gateways, browsers) the class of failure. The problem object tells the API client *which* failure and *what* to do next without scraping prose.

The five standard members, all optional per the specification:

| Member | JSON type | What testers should treat it as | Common defect |
| --- | --- | --- | --- |
| \`type\` | string (URI reference) | Primary machine identifier for the problem class | Missing, relative in a confusing way, or reinvented per endpoint |
| \`title\` | string | Short, stable summary of the *type* (not the occurrence) | Changes per request with request-specific data baked in |
| \`status\` | number | Advisory copy of the HTTP status | Body says 400 while response is 422 (or the reverse) |
| \`detail\` | string | Human explanation for *this* occurrence | Clients parse it; servers dump stack traces into it |
| \`instance\` | string (URI reference) | Identifier for *this* occurrence (support / forensics) | Reused across unrelated failures or omitted where support needs it |

When \`type\` is absent, consumers must assume \`about:blank\`. That URI means "no extra semantics beyond the HTTP status." Your tests should treat an empty or omitted \`type\` as \`about:blank\` behavior: assert the status and a sensible title (often the status phrase), and do not invent a product-specific type URI the server never promised.

Official references: https://www.rfc-editor.org/rfc/rfc7807.html (original) and https://www.rfc-editor.org/rfc/rfc9457.html (current Standards Track document that obsoletes 7807). Link both in internal docs. In assertions, prefer behavior over document number unless you are writing a compliance matrix for an upgrade.

## Force Failures; Do Not Unit-Test the Serializer Alone

Serializer unit tests prove a helper can emit JSON. They do not prove middleware, exception mappers, content negotiation, or gateway rewrites leave a usable problem object on the wire. Build a harness that hits real routes.

\`\`\`ts
import { test, expect, type APIRequestContext } from '@playwright/test';

type Problem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
};

async function expectProblem(
  request: APIRequestContext,
  opts: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
    status: number;
    type: string;
  },
) {
  const response = await request.fetch(opts.path, {
    method: opts.method ?? 'POST',
    data: opts.body,
    headers: {
      Accept: 'application/problem+json, application/json;q=0.9',
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });

  expect(response.status(), \`HTTP status for \${opts.path}\`).toBe(opts.status);

  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).toMatch(/application\\/problem\\+json/i);

  const problem = (await response.json()) as Problem;
  expect(problem.type ?? 'about:blank').toBe(opts.type);
  expect(problem.status ?? opts.status).toBe(opts.status);
  expect(typeof problem.title).toBe('string');
  expect((problem.title as string).length).toBeGreaterThan(0);
  return problem;
}

test('out-of-credit purchase returns problem details', async ({ request }) => {
  const problem = await expectProblem(request, {
    path: '/purchase',
    body: { item: 123456, quantity: 2 },
    status: 403,
    type: 'https://example.com/probs/out-of-credit',
  });

  expect(problem.detail).toMatch(/balance/i);
  expect(problem).toHaveProperty('balance');
  expect(typeof problem.balance).toBe('number');
});
\`\`\`

That helper encodes the non-negotiable checks: HTTP status, \`Content-Type\`, \`type\`, and body \`status\` alignment. Extension assertions stay in the individual test so one fixture does not pretend every problem type shares the same extras.

## Content-Type Is Part of the Assertion, Not a Nice-to-Have

Teams often assert JSON shape and ignore the media type. That hides two production bugs.

First, a gateway that rewrites errors into a generic envelope still returns \`application/json\`. Clients that branch on \`application/problem+json\` never enter the problem parser and fall through to a generic handler. Second, an Accept-driven stack that only emits problem details when the client asks for them can silently serve a different error dialect to browser-like Accept lists.

| Request \`Accept\` | Expected when the handler fails | Trap |
| --- | --- | --- |
| \`application/problem+json\` | \`Content-Type: application/problem+json\` | Server returns problem shape under \`application/json\` |
| \`application/json\` | Documented: either problem+json (allowed by HTTP) or a documented JSON error | Silent format flip between environments |
| \`application/problem+json, application/json;q=0.8\` | Prefer problem+json on errors | Negotiator always picks JSON success formatter for errors |
| missing \`Accept\` | Documented default (often problem+json on 4xx/5xx for APIs that adopted the RFC) | Default differs between local and production gateways |

The specification explicitly notes that a server may return \`application/problem+json\` even when the client did not list it in \`Accept\`. Your product contract must still say what *your* API does. Tests should lock the documented behavior, not every theoretically legal HTTP choice.

\`\`\`ts
test('validation error keeps problem media type under mixed Accept', async ({
  request,
}) => {
  const response = await request.post('/details', {
    data: { age: 42.3, profile: { color: 'yellow' } },
    headers: {
      Accept: 'application/json, application/problem+json;q=0.9',
      'Content-Type': 'application/json',
    },
  });

  expect(response.status()).toBe(422);
  expect(response.headers()['content-type'] ?? '').toMatch(
    /application\\/problem\\+json/i,
  );

  const problem = await response.json();
  expect(problem.type).toBe('https://example.net/validation-error');
  expect(Array.isArray(problem.errors)).toBe(true);
  expect(problem.errors[0]).toEqual(
    expect.objectContaining({
      pointer: expect.stringMatching(/^#\\//),
      detail: expect.any(String),
    }),
  );
});
\`\`\`

JSON Pointer values in validation extensions should stay stable. If the server renames \`pointer\` to \`field\` without a type URI change, clients break. Pin the extension schema per \`type\`.

## Status Inside the Body Must Match the HTTP Status

The \`status\` member is advisory for consumers that see a stored body without headers, or that sit behind an intermediary that rewrote the code. Generators must still use the same code on the wire. Testers should fail the build on disagreement.

\`\`\`ts
function assertStatusAligned(httpStatus: number, problem: Problem) {
  if (problem.status === undefined) {
    // Allowed by the RFC, but product policy may require it.
    return;
  }
  expect(
    problem.status,
    'problem.status must match the HTTP status on the response',
  ).toBe(httpStatus);
}

test('mapper cannot emit 400 body status on 422 responses', async ({
  request,
}) => {
  const response = await request.post('/orders', {
    data: { sku: '' },
    headers: {
      Accept: 'application/problem+json',
      'Content-Type': 'application/json',
    },
  });

  expect(response.status()).toBe(422);
  const problem = (await response.json()) as Problem;
  assertStatusAligned(response.status(), problem);
});
\`\`\`

What people get wrong: they assert \`status\` *or* the HTTP code, never both together, then ship a Spring/\`ProblemDetail\` mapper that hard-codes \`status: 400\` in a shared builder while controllers return 409/422/429. Mobile clients that retry only on 429 never see the header if they incorrectly trust a stale body field after a proxy rewrite. Align both, every time.

## Type URIs Are the API; Titles Are for Humans

Clients must key behavior off \`type\` (after resolving a relative reference, if you allow relatives). Titles exist for operators reading logs offline and for users who cannot dereference the URI. Titles should stay stable across occurrences of the same type, aside from localization.

That leads to a concrete test rule: for a given \`type\`, \`title\` is constant in a single locale. \`detail\` may change. If your suite snapshots \`detail\`, you will churn on every copy edit. Prefer:

1. Exact match on \`type\`.
2. Exact match on \`title\` for non-localized runs (or match against a locale map).
3. Soft match on \`detail\` (contains a known token, or schema-only: non-empty string).
4. Exact schema match on extensions.

\`\`\`ts
const TITLE_BY_TYPE: Record<string, string> = {
  'https://example.com/probs/out-of-credit': 'You do not have enough credit.',
  'https://example.net/validation-error': 'Your request is not valid.',
  'about:blank': 'Not Found',
};

test('titles stay stable per type in en-US', async ({ request }) => {
  const samples: Array<{ path: string; body?: unknown; status: number; type: string }> = [
    {
      path: '/purchase',
      body: { item: 1, quantity: 99 },
      status: 403,
      type: 'https://example.com/probs/out-of-credit',
    },
    {
      path: '/details',
      body: { age: -1 },
      status: 422,
      type: 'https://example.net/validation-error',
    },
  ];

  for (const sample of samples) {
    const response = await request.post(sample.path, {
      data: sample.body,
      headers: {
        Accept: 'application/problem+json',
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json',
      },
    });
    expect(response.status()).toBe(sample.status);
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe(sample.type);
    expect(problem.title).toBe(TITLE_BY_TYPE[sample.type]);
  }
});
\`\`\`

Relative \`type\` values are legal and discouraged for good reason. If \`/orders/1\` and \`/widgets/2\` both return \`"type": "out-of-credit"\`, resolution against different bases yields different absolute URIs. Prefer absolute \`https://\` identifiers under your control, or registry URIs such as those under \`https://iana.org/assignments/http-problem-types#\` when you intentionally reuse a shared type. Tests should reject unexpected relative types if your style guide bans them.

## Extension Members Carry Machine Data; Detail Does Not

The RFC is blunt: consumers should not parse \`detail\` for information. Extensions exist so you can ship \`balance\`, \`errors\`, \`retryable\`, or \`limit\` without regex on English sentences.

| Problem type (illustrative) | Extension members to lock in tests | Anti-pattern |
| --- | --- | --- |
| out-of-credit | \`balance\` (number), \`accounts\` (string[]) | Encoding balance only inside \`detail\` |
| validation-error | \`errors[]\` with \`pointer\` + \`detail\` | Returning a single concatenated string of all field errors |
| rate-limit | \`retryAfterSeconds\` or rely on \`Retry-After\` header | Putting the retry delay only in \`detail\` text |
| conflict-on-write | \`currentEtag\`, \`yourEtag\` | Asking clients to re-GET without identifiers |

Illustrative numbers in examples (balance \`30\`, cost \`50\`) are for readability; production fixtures should use account factories that produce known balances.

\`\`\`ts
test('rate limit problem exposes retry metadata without parsing detail', async ({
  request,
}) => {
  // Warm the limiter with a burst (illustrative threshold: 5).
  for (let i = 0; i < 5; i += 1) {
    await request.get('/search?q=widgets', {
      headers: { Accept: 'application/json' },
    });
  }

  const response = await request.get('/search?q=widgets', {
    headers: { Accept: 'application/problem+json' },
  });

  expect(response.status()).toBe(429);
  const retryAfter = response.headers()['retry-after'];
  expect(retryAfter, 'Retry-After header should be present on 429').toBeTruthy();

  const problem = (await response.json()) as Problem;
  expect(problem.type).toBe('https://example.com/probs/rate-limit');
  // Prefer structured extension or header over detail scraping.
  if (problem.retryAfterSeconds !== undefined) {
    expect(Number(problem.retryAfterSeconds)).toBeGreaterThan(0);
  }
});
\`\`\`

Ready-made QA skills for header and error-contract checks install from qaskills.sh with the qaskills CLI when you want a shared pack instead of copy-pasting helpers across repos.

## A Failure Story: The Mobile App That Retried Forever

Symptom: Android clients spun on "pay invoice" after a ledger outage. The screen showed a generic "something went wrong," then retried every two seconds until the process was killed.

Wrong theory: the client team blamed flaky DNS and added more retries. The API team pointed at a "transient 503" runbook. Both looked at gateway access logs that showed \`503\` with body size ~120 bytes and moved on.

Actual cause: an exception mapper wrapped upstream timeouts as:

\`\`\`json
{
  "type": "https://example.com/probs/unavailable",
  "title": "Service unavailable",
  "status": 503,
  "detail": " upstream connect error or disconnect/reset before headers"
}
\`\`\`

…but only on one cluster. The canary cluster still returned the old envelope \`{ "error": "unavailable", "retryable": true }\` under \`application/json\`. The mobile parser required \`retryable === true\` from the *legacy* shape. On problem+json responses the field was absent, so the client treated the error as retryable-by-default. Separately, \`detail\` contained an Envoy string that changed with infrastructure, and a new analytics rule keyed on exact \`detail\` text dropped the events.

Fix: one wire contract on all clusters (\`application/problem+json\` + stable \`type\`), an extension \`"retryable": false\` for non-idempotent pay endpoints, client branching on \`type\` and \`retryable\` only, and a contract test that fails if \`Content-Type\` or \`type\` drifts between canary and stable. Support got \`instance\` URIs that correlated with trace IDs without putting stack frames in \`detail\`.

## Map Status Families to Problem Types Without Over-Minting

Not every 404 needs a custom type. Truly generic conditions are often fine as \`about:blank\` with the normal status phrase. Mint a type when clients must branch.

\`\`\`ts
const CASES = [
  {
    name: 'unknown resource',
    request: { method: 'GET' as const, path: '/invoices/does-not-exist' },
    status: 404,
    type: 'about:blank',
    title: 'Not Found',
  },
  {
    name: 'duplicate idempotency key with different body',
    request: {
      method: 'POST' as const,
      path: '/transfers',
      headers: { 'Idempotency-Key': 'fixed-key-1' },
      body: { amount: 10 },
    },
    // Prime with a different body in beforeAll in real suites.
    status: 409,
    type: 'https://example.com/probs/idempotency-conflict',
    title: 'Idempotency key reused with a different request',
  },
  {
    name: 'feature removed',
    request: { method: 'POST' as const, path: '/v1/legacy-export' },
    status: 410,
    type: 'https://example.com/probs/gone',
    title: 'This export API has been removed',
  },
];

for (const c of CASES) {
  test(\`problem mapping: \${c.name}\`, async ({ request }) => {
    const response = await request.fetch(c.request.path, {
      method: c.request.method,
      data: 'body' in c.request ? c.request.body : undefined,
      headers: {
        Accept: 'application/problem+json',
        'Content-Type': 'application/json',
        ...('headers' in c.request ? c.request.headers : {}),
      },
    });
    expect(response.status()).toBe(c.status);
    const problem = (await response.json()) as Problem;
    expect(problem.type ?? 'about:blank').toBe(c.type);
    expect(problem.title).toBe(c.title);
  });
}
\`\`\`

Partial update failures (unsupported patch shape, conflicting field edits) belong with method-specific tests; pair this suite with [http-patch-method-api-testing-rfc-5789](/blog/http-patch-method-api-testing-rfc-5789) when PATCH is how clients mutate the resource that just returned a problem. Deprecation and removal paths often combine problem details with timeline headers. When an endpoint is sunsetting, clients need both a stable problem \`type\` on late calls and the policy expressed by deprecation headers; see [api-testing-deprecation-sunset-headers](/blog/api-testing-deprecation-sunset-headers) for the header side of that contract.

## Schema-Validate the Envelope, Then Specialize by Type

A single JSON Schema can cover the shared envelope. Per-type schemas cover extensions. Keep the shared schema close to the non-normative sketch in RFC 9457 Appendix A, then tighten for your product (for example, require \`type\` and \`title\` even though the RFC allows omission).

\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/problem-envelope.json",
  "type": "object",
  "required": ["type", "title", "status"],
  "properties": {
    "type": { "type": "string", "format": "uri" },
    "title": { "type": "string", "minLength": 1 },
    "status": { "type": "integer", "minimum": 400, "maximum": 599 },
    "detail": { "type": "string" },
    "instance": { "type": "string" }
  },
  "additionalProperties": true
}
\`\`\`

\`\`\`ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import envelope from './problem-envelope.json';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateEnvelope = ajv.compile(envelope);

test('all seeded failures obey the envelope schema', async ({ request }) => {
  const paths = [
    { path: '/purchase', body: { item: 1, quantity: 99 }, status: 403 },
    { path: '/details', body: { age: 0.5 }, status: 422 },
  ];

  for (const item of paths) {
    const response = await request.post(item.path, {
      data: item.body,
      headers: {
        Accept: 'application/problem+json',
        'Content-Type': 'application/json',
      },
    });
    expect(response.status()).toBe(item.status);
    const problem = await response.json();
    const ok = validateEnvelope(problem);
    expect(ok, JSON.stringify(validateEnvelope.errors)).toBe(true);
    assertStatusAligned(response.status(), problem as Problem);
  }
});
\`\`\`

Do not set \`"additionalProperties": false\` on the shared envelope if you use extensions. Put that constraint on per-type schemas instead.

## Security Checks Belong in the Same Suite

Problem details are an HTTP interface, not a debugger. Testers should include negative probes:

1. Force a 500 via a fault flag or toxiproxy. Assert \`detail\` does not contain stack frames, SQL, disk paths, or cloud account IDs.
2. Compare public vs authenticated error detail for the same missing resource (avoid user-enumeration via richer \`detail\` for logged-in callers unless product policy explicitly wants it).
3. Confirm \`instance\` does not embed raw internal primary keys if that URI is world-reachable without auth.
4. Confirm that type documentation URLs (when \`type\` is an \`https\` locator) do not require auth cookies that leak in support screenshots.

\`\`\`ts
test('500 handler strips implementation detail', async ({ request }) => {
  const response = await request.post('/admin/faults/boom', {
    headers: {
      Accept: 'application/problem+json',
      Authorization: 'Bearer FAKE_ADMIN_TOKEN_FOR_LOCAL_ENV',
    },
  });

  expect(response.status()).toBe(500);
  const problem = (await response.json()) as Problem;
  const blob = JSON.stringify(problem).toLowerCase();
  for (const leak of ['stacktrace', 'exception in thread', 'select * from', '/home/', 'sk-']) {
    expect(blob.includes(leak), \`possible leak token: \${leak}\`).toBe(false);
  }
  expect(problem.type ?? 'about:blank').toBe('about:blank');
});
\`\`\`

## XML, Localization, and Negotiation Edges

Most JSON APIs never enable \`application/problem+xml\`. If yours does, add one smoke test that requests it and checks the root namespace and child names. The XML profile uses namespace \`urn:ietf:rfc:7807\` even under RFC 9457 documentation for the XML appendix lineage. Do not invent a new namespace in tests.

Localization: \`title\` and \`detail\` may change with \`Accept-Language\`. Keep \`type\` identical across locales. A solid pattern is a table-driven locale test for one problem type only, plus a global invariant that \`type\` never localizes.

CI tip: run the problem-details suite on every PR that touches exception mapping, gateway templates, or shared error middleware. Failures there are cross-cutting. Filtering with Playwright's \`--grep\` / \`-g\` (for example, \`-g "problem details"\`) keeps the feedback loop tight without skipping the suite on unrelated UI work.

## What Practitioners Should Demand in Review

When you review an API change that "just adds error handling," ask for:

1. The list of \`type\` URIs touched, with links to human docs.
2. Whether \`about:blank\` is intentional for generic cases.
3. Contract tests that assert media type + status alignment + extensions.
4. Proof that clients branch on \`type\`, not on \`detail\` substrings.
5. A note on intermediary behavior (API gateway error templates can smash problem+json back into HTML or a vendor error blob).

Opinions from shipping this: prefer a small catalog of stable types over a new URI per controller. Prefer absolute HTTPS type URIs under a \`/probs/\` path you own. Require \`status\` in the body even though the RFC makes it optional; the duplication pays for itself when someone pastes a body into Slack without headers. Reject \`detail\` that repeats the title with no occurrence-specific help.

If an organization still speaks only of "RFC 7807" in ADRs written years ago, update the ADR to cite RFC 9457 and keep the test vocabulary as "problem details." The on-the-wire JSON your clients already parse does not need a flag day when the catalog and registry rules are the real delta.

## Frequently Asked Questions

### Is RFC 7807 still valid after RFC 9457?

RFC 9457 (July 2023) obsoletes RFC 7807 on the Standards Track. The JSON members, media types, and \`about:blank\` default remain the model you test. New work should cite RFC 9457, including the HTTP Problem Types registry guidance. Existing APIs that claim "RFC 7807 support" are not automatically wrong on the wire; run your suite against the payload and media type. Update internal references when you touch error middleware so designers stop minting conflicting house formats under an outdated citation.

### Should every 404 return a custom problem type URI?

No. Generic conditions that add no API-specific semantics are appropriate as \`about:blank\` with a title that matches the status phrase (for example, "Not Found"). Mint a custom \`type\` when clients must branch, when support docs differ, or when extensions carry domain data. Over-minting produces a catalog nobody remembers and encourages clients to ignore \`type\` entirely. Under-minting forces brittle \`detail\` parsing. Review the catalog quarterly against real client \`switch\` statements.

### Can clients parse the detail field for codes or amounts?

They should not. The specification tells consumers not to parse \`detail\` for information and to use extensions instead. If your mobile app extracts a balance with a regex on \`detail\`, that is a defect in the contract, not clever reuse. Add an extension member, version the problem type if the extension is incompatible, and test the extension. Keep \`detail\` for humans and support tooling that displays the string as-is.

### How do AI coding agents usually break problem-details tests?

They often assert only \`message\` or \`error\` keys from older fixtures, snapshot entire bodies including \`instance\` and \`detail\`, or forget the \`application/problem+json\` media type check. Another pattern is treating HTTP 200 as the only success path and marking any 4xx as a failed test setup rather than an expected problem document. Give agents a helper like \`expectProblem\`, a per-type fixture table, and instructions to match \`type\` exactly while allowing \`detail\` to vary. Re-run the suite after regenerating clients so OpenAPI/problem mappings stay aligned.
`,
};
