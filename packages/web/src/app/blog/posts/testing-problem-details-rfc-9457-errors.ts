import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing RFC 9457 Problem Details Error Responses',
  description:
    'Test RFC 9457 Problem Details responses with precise media-type, status, type URI, instance, extension, schema, localization, and leakage assertions.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing RFC 9457 Problem Details Error Responses

A payment request returns HTTP 403, while its JSON body says status 422. Which value should the client trust? Generic HTTP software acts on the response status, and RFC 9457 requires generators that include the status member to keep it equal to the actual HTTP status. This mismatch is exactly the kind of boundary defect that a shallow “has five fields” assertion overlooks.

RFC 9457 defines Problem Details for HTTP APIs and obsoletes RFC 7807. Its JSON form uses application/problem+json and a small set of standard members: type, status, title, detail, and instance. None should be tested as decorative boilerplate. Each has different stability, optionality, and client meaning, while problem-specific extension members carry structured recovery information.

## Turn each standard member into a distinct assertion policy

The specification does not require every response to contain all five standard members. The type defaults to about:blank when absent. Status is optional and advisory. Title and detail serve different human needs. Instance identifies an occurrence, not the category of error. A mature test suite defines when its own API requires each field rather than imposing a generic five-key checklist.

| Member | Meaning | Stable across occurrences? | High-value test |
| --- | --- | --- | --- |
| type | Identifier for the problem class | Yes for one class | Exact URI and documented semantics |
| title | Short human summary of the type | Usually, except localization | Expected title for locale and type |
| status | HTTP status copied into the document | Same code for a type in normal use | Equals actual response status |
| detail | Explanation of this occurrence | No | Useful, safe text without machine parsing |
| instance | URI reference for this occurrence | Usually unique | Expected shape, opacity, and no secret data |
| extension member | Typed domain data for recovery | Contract-dependent | Schema, value, and forward compatibility |

If the API requires type, title, status, and a request-correlated instance for every domain problem, put that policy in its OpenAPI contract and tests. Describe it as an application requirement. Do not claim RFC 9457 itself mandates the same presence rule.

## Assert the transport before parsing the document

Begin at HTTP. Check the actual status code and Content-Type. application/json is not the registered JSON Problem Details media type, even though JSON.parse succeeds. A mislabeled document can bypass client interceptors that dispatch on application/problem+json.

This Playwright API test exercises an insufficient-credit outcome. It checks transport semantics, stable type identity, occurrence-specific fields, and typed extensions without pinning prose that contains a calculated balance.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('returns a typed insufficient-credit problem', async ({ request }) => {
  const response = await request.post('/api/purchases', {
    data: { accountId: 'acct-test-17', itemId: 'item-50', quantity: 1 },
    headers: { Accept: 'application/problem+json, application/json' },
  });

  expect(response.status()).toBe(403);
  expect(response.headers()['content-type']).toMatch(
    /^application\/problem\+json(?:;\s*charset=utf-8)?$/i,
  );

  const problem = await response.json();
  expect(problem).toMatchObject({
    type: 'https://api.example.test/problems/insufficient-credit',
    title: 'Insufficient credit',
    status: 403,
    balance: 30,
    requiredAmount: 50,
  });
  expect(problem.detail).toContain('20');
  expect(problem.instance).toMatch(/^\/problem-occurrences\/[A-Za-z0-9_-]+$/);
  expect(problem).not.toHaveProperty('stack');
});
\`\`\`

The test does not parse detail to calculate the shortfall. Machines should consume balance and requiredAmount extensions. Detail remains human-readable and may be reworded or localized. The instance check accepts a relative reference with a full path, a form RFC 9457 recommends over ambiguous path fragments when relative URIs are used.

## Keep type identity separate from documentation availability

A type URI is an identifier, often an HTTPS URL under the API owner's control. RFC 9457 recommends that it resolve to human-readable documentation. The business response test should compare the exact identifier. A separate documentation test can request the URI and verify useful HTML, ownership, and link durability.

Do not make every negative API case fetch its type page. That couples functional tests to a documentation service and multiplies failures during an outage. Instead, collect the finite problem type registry from the contract and run a focused link check in an appropriate pipeline.

Changing a type URI is a breaking contract change even if title and detail remain identical. Client code should branch on type, not English words. Avoid generated occurrence paths in type, and avoid query strings that embed a transient error code unless that URI is genuinely the stable identifier.

about:blank has special meaning: the problem has no additional semantics beyond the HTTP status code. When it is used, the title should be the recommended status phrase for that code, except localization. Do not assign about:blank to a domain condition such as depleted inventory and then add a proprietary errorCode to recover the missing type identity. Mint and document a real problem type if clients need distinct behavior.

## Catch status disagreements at every error-producing layer

The body status can drift from HTTP status when exception middleware, gateways, or legacy adapters rewrite only one layer. Build a reusable invariant that compares them for every response containing status. Still retain scenario tests for the correct status choice, because equality between two wrong 500 values is not enough.

\`\`\`typescript
type Problem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [extension: string]: unknown;
};

async function expectProblemStatus(
  response: import('@playwright/test').APIResponse,
): Promise<Problem> {
  expect(response.headers()['content-type']).toMatch(/^application\/problem\+json(?:;|$)/i);
  const body = (await response.json()) as Problem;
  if (body.status !== undefined) {
    expect(body.status).toBe(response.status());
  }
  return body;
}

test('validation status agrees across HTTP and Problem Details', async ({ request }) => {
  const response = await request.post('/api/profiles', {
    data: { age: 42.3, color: 'yellow' },
  });
  const problem = await expectProblemStatus(response);

  expect(response.status()).toBe(422);
  expect(problem.type).toBe('https://api.example.test/problems/validation');
});
\`\`\`

If an intermediary changes the HTTP status, the disagreement is evidence, not something the test helper should normalize. Capture headers that identify the gateway and reproduce through both the origin and edge. Clients may retain body status when a stored problem has lost transport metadata, but live generic HTTP behavior follows the real response code.

## Model validation errors through a documented extension

Problem Details intentionally avoids dictating a universal field-error array. RFC 9457 illustrates extensions, but an API must define its own names and semantics. A good validation type might include errors, with each item carrying a stable code, a JSON Pointer to the invalid value, and a human detail.

Test pointers against the submitted document. A pointer such as /profile/color should locate the offending property. Do not use presentation labels such as “Color field” as machine identifiers. For arrays, cover an index. For missing required fields, decide whether the pointer targets the absent property path or its parent, then document the convention.

| Extension field | Purpose | Brittle assertion to avoid | Better contract check |
| --- | --- | --- | --- |
| code | Stable machine category | Matching localized detail | Enumerated exact value |
| pointer | Location in request document | CSS-like field selector | Valid JSON Pointer convention |
| detail | Per-error explanation | Complete English snapshot | Non-empty and safe, locale tested separately |
| allowedValues | Recovery choices | Comma-separated prose | Typed array with permitted values |
| retryAfterSeconds | Domain retry guidance | Parsing title for time | Non-negative integer plus Retry-After policy |

Multiple unrelated problem types should not be crammed into one response simply because several things went wrong. RFC 9457 recommends representing the most relevant or urgent problem when problems do not share a type. Homogeneous validation failures can fit a validation extension because their shared semantics are documented.

## Validate shape while allowing future extension members

Consumers must ignore extension members they do not recognize. A JSON Schema with additionalProperties: false at the root prevents that forward compatibility and conflicts with the extension model unless the API has deliberately closed its contract beyond RFC behavior.

Use a schema that constrains known standard fields and required application members while allowing unknown root properties. Then define strict shapes inside extensions you own where appropriate.

\`\`\`typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const problemSchema = {
  type: 'object',
  required: ['type', 'title', 'status'],
  properties: {
    type: { type: 'string', format: 'uri-reference' },
    title: { type: 'string', minLength: 1 },
    status: { type: 'integer', minimum: 100, maximum: 599 },
    detail: { type: 'string' },
    instance: { type: 'string', format: 'uri-reference' },
  },
  additionalProperties: true,
} as const;

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateProblem = ajv.compile(problemSchema);

const candidate = {
  type: 'https://api.example.test/problems/rate-limit',
  title: 'Request rate exceeded',
  status: 429,
  retryAfterSeconds: 30,
};

if (!validateProblem(candidate)) {
  throw new Error(ajv.errorsText(validateProblem.errors));
}
\`\`\`

The example registers ajv-formats so uri-reference is enforced rather than silently treated as an annotation. A project can instead provide a tested custom format when its accepted identifier policy is narrower. Do not present a short regex for all URI references as if URI grammar were trivial.

The schema above reflects an application profile that requires type, title, and status. A general RFC 9457 schema would not require those fields. Label schemas accordingly so a team does not reject valid third-party problem documents based on local conventions.

## Test localization without destabilizing machine contracts

Title may change for localization. Detail is naturally occurrence-specific and may also be translated. Type, status, instance semantics, and structured extensions should not change merely because Accept-Language changes.

Send the same failing request with two supported languages. Assert Content-Language where the API promises it, compare stable machine fields, and check a small approved title dictionary. Avoid translating the type URI or extension names. If localized documentation exists at the type URI, negotiate that page independently.

Fallback language behavior deserves one case: an unsupported language tag should select the documented default or best available language, not produce a different problem category. Include Vary: Accept-Language when cacheable error responses can differ by language. If representation format also changes through Accept, verify Vary contains both relevant field names.

Localization can expose a common defect where title is generated from a generic status phrase while type remains domain-specific. An insufficient-credit type titled “Forbidden” discards useful human context. Conversely, a localized title must not become the only way a client identifies the error.

## Inspect instance identifiers for privacy and operability

Instance identifies a specific occurrence. It may be dereferenceable, or it may act as an opaque identifier useful to support staff. Either way, it should not expose stack names, database keys, access tokens, email addresses, or raw exception text.

Generate two equivalent failures and verify their instance values follow the documented uniqueness policy. Do not require uniqueness if the API uses a request URI to identify the occurrence by design, but make that choice explicit. If an instance can be fetched, test authorization: one tenant must not retrieve another tenant's diagnostics by guessing identifiers.

Support correlation often uses a trace header as well as instance. Assert their documented relationship without demanding equality unless promised. An instance URI may remain stable in an archived document while a trace ID belongs to a particular processing path.

Relative instance references resolve against the document base URI. Ambiguous values such as error-17 can resolve differently at different resource paths. Prefer a full relative path such as /problem-occurrences/error-17 or an absolute URI when interoperability matters.

## Audit every problem type for information leakage

Error documents are an attacker-visible interface. RFC 9457 warns against exposing implementation internals. Build negative assertions for stack traces, SQL fragments, filesystem paths, internal hosts, secret tokens, and personal data. Run them against failures from validation, authorization, dependency outages, and unhandled exceptions because different middleware may format each path.

| Leakage risk | Example source | Safer public response | Test approach |
| --- | --- | --- | --- |
| Stack detail | Unhandled exception serializer | Generic occurrence detail plus instance | Search keys and body text for stack markers |
| Account existence | Login or reset flow | Same public problem for known and unknown users | Compare status, type, timing policy, and shape |
| Database internals | Constraint exception | Domain conflict type | Reject table names and driver messages |
| Secret-bearing URI | instance built from request URL | Opaque occurrence path | Parse query and assert forbidden keys absent |
| Cross-tenant data | Validation enrichment | Only caller-authorized identifiers | Use two tenant fixtures |

Avoid a universal banned-word list that rejects legitimate prose. Focus on concrete patterns from the technology stack and security review. Preserve full diagnostics in protected logs keyed by instance, not in the response.

## Align runtime checks with OpenAPI without duplicating mistakes

OpenAPI 3.1 can describe application/problem+json under each error response and reference a shared schema. It can also specialize extensions for individual type URIs through separate schemas or unions. The [OpenAPI 3.1 contract testing guide](/blog/openapi-3-1-contract-testing-guide-2026) explains the schema mechanics.

Generated contract tests are valuable for coverage, but they rarely prove that a 409 has the correct type instead of a generic conflict, that status agrees with HTTP, or that an instance leaks no secrets. Add semantic assertions by scenario. The [API contract testing for microservices guide](/blog/api-contract-testing-microservices) is useful when producers and consumers deploy independently and recognize different extension sets.

Keep a problem-type catalog containing URI, recommended status, title keys, allowed extensions, retry semantics, and owning team. Review it like any other public API. A new title is often harmless; repurposing an existing type URI for different recovery behavior is not.

## Preserve HTTP header semantics alongside the problem body

Problem Details standardizes a representation, not the whole meaning of an HTTP response. Middleware can produce a beautiful body and still omit a header the client needs to recover. Build paired assertions for status-specific headers and document members.

For 401, validate the \`WWW-Authenticate\` challenge without echoing submitted credentials in \`detail\`. For 405, require an \`Allow\` header consistent with routing. For 429, parse \`Retry-After\` and compare it with any reset extension using a tolerance appropriate to two observations of a moving clock. For cacheable 404 responses, verify the application's intended cache policy rather than assuming every problem must be uncached.

Redirects deserve a decision too. Some clients automatically follow them and expose only the final problem, hiding a gateway or canonical-host hop. Disable automatic redirect following in a targeted test when the intermediate response is part of the contract.

## Exercise malformed and unknown problem documents in consumers

Provider tests prove what the server emits. Consumer resilience needs a different set of fixtures: an unknown type URI with valid base members, a known type containing a new extension, a missing optional detail, and a body whose declared status disagrees with the transport. These are parser and policy cases, not reasons to make provider assertions vague.

A forward-compatible client should preserve or ignore unknown extension members and fall back safely for an unfamiliar type. It should not route business logic by English title. Decide whether a malformed known extension produces a generic error UI, telemetry, or a hard parsing failure, then test that decision without fabricating a replacement type.

Keep adversarial sizes in scope. An upstream dependency or attacker can return a massive \`detail\`, deeply nested extension, or thousands of validation entries. Enforce response-size and parser-depth protections at the appropriate boundary. A JSON Schema match alone does not bound operational cost unless those constraints are actually expressed and enforced.

Finally, test content-type mismatch. A problem-shaped JSON body labelled \`text/html\` should not be silently trusted by a strict SDK, while a browser UI may choose a defensive generic fallback. This confirms that media-type checks in the provider suite have a real consumer payoff.

Maintain one inventory test that discovers documented problem types and compares them with registered runtime schemas. It should report missing and orphaned identifiers clearly, without calling every type URI during ordinary API tests. That inventory catches a new controller error added without client documentation and obsolete schemas that no endpoint can produce, while scenario tests retain responsibility for triggering each important condition.

## Frequently Asked Questions

### Does RFC 9457 require all five standard members?

No. The standard members have optional behavior, and type defaults to about:blank when absent. Your API can require a stricter profile, but tests and documentation should identify it as an application contract.

### Should clients branch on title or detail?

Neither. Clients should use the stable type URI and typed extensions. Title can be localized, and detail describes one occurrence in human-readable language.

### What should a test do when body status differs from HTTP status?

Fail and preserve both values as diagnostics. Generators that include status must make it equal the actual response code. Do not normalize the body in the test helper because the disagreement may come from a gateway rewrite.

### Can a validation problem contain several field errors?

Yes, when one documented validation problem type defines a homogeneous errors extension. Specify the item schema, pointer convention, and stable codes rather than assuming a universal RFC field-error format.

### Should the root problem schema reject unknown properties?

Usually no. Problem Details supports extension members, and consumers must ignore extensions they do not recognize. Constrain the extensions your application owns, while preserving forward compatibility at the document root.
`,
};
