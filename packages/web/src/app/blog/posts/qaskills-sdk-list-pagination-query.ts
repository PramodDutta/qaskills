import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills SDK list pagination query',
  description:
    'QASkills SDK list pagination query: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills SDK list pagination query',
  keywords: [
    'QASkills SDK list pagination query',
    'QASkills SDK pagination',
    'skills list query parameters',
    'SDK pageSize test',
    'URLSearchParams optional fields',
    'qaskills sort query',
    'skill catalog paging contract',
  ],
  relatedSlugs: [
    'testing-cursor-pagination-api-boundaries',
    'typescript-testing-patterns-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://nodejs.org/api/url.html#class-urlsearchparams',
    'https://url.spec.whatwg.org/',
    'https://www.rfc-editor.org/info/rfc3986',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts#QASkillsClient.skills.list',
    'packages/shared/src/types/skill.ts#SkillSearchParams',
    'packages/shared/src/types/skill.ts#SkillSearchResult',
    'packages/shared/src/schemas/skill-schema.ts#skillSearchSchema',
  ],
  content: `A QASkills SDK list pagination query converts defined search options into the API keys \`q\`, \`sort\`, \`page\`, and \`pageSize\`, then omits the question mark when none survive. Tests should capture the requested URL, verify encoding and omission, and compare the typed response without calling the live catalog.

The public behavior sits in \`packages/sdk/src/index.ts\`, while the accepted input and returned page shape live in the shared package. This guide stays focused on list serialization. CLI filters, the SDK search wrapper's precedence, and server-side ranking each need separate contract tests.

## What does QASkills SDK list pagination query guarantee?

A QASkills SDK list pagination query guarantees a predictable URL for the options that the client actually accepts. It does not guarantee server defaults, result ordering, or the validity of arbitrary numbers because those responsibilities sit beyond this method.

\`QASkillsClient.skills.list\` creates a fresh \`URLSearchParams\` for every call. It maps \`query\` to \`q\`, preserves \`sort\`, converts \`page\` and \`pageSize\` with \`String\`, and adds a question mark only when \`toString()\` returns text. That branch is visible at \`packages/sdk/src/index.ts#QASkillsClient.skills.list\`.

Fresh construction matters because a prior call cannot leave a parameter in the next request. A test should call the same client twice with different inputs and inspect both fetch URLs. That repeat-run case catches a refactor that stores mutable parameters on the client.

The method uses truthy checks rather than explicit \`undefined\` checks. Therefore, \`page: 0\`, \`pageSize: 0\`, and \`query: ''\` are omitted by this layer, even though the shared validation schema would reject zero when validation is invoked elsewhere. A precise QASkills SDK list pagination query test locks current serialization without claiming that the SDK runs Zod here.

The response is passed through the private request helper as \`SkillSearchResult\`. TypeScript supplies compile-time shape checking, but the client does not validate response JSON at runtime. The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) helps separate type assertions from runtime assertions when building this suite.

The word guarantee must stay tied to what a fetch spy can see. A test can prove the path, query text, headers, call count, and value that comes back. It cannot prove that the API used an index, read a row, or chose a rank rule.

This scope makes a failed check easy to own and fix. A wrong key points to the SDK map, while a wrong page result points to the API or test stub. The split also keeps a small client change from forcing a full end-to-end setup.

## How does QASkills SDK pagination work?

QASkills SDK pagination sends positive page values as decimal query text and returns the API JSON unchanged. The client adds no default page, performs no arithmetic, and does not merge one page with another.

The input contract at \`packages/shared/src/types/skill.ts#SkillSearchParams\` makes both \`page\` and \`pageSize\` optional numbers. The output contract at \`packages/shared/src/types/skill.ts#SkillSearchResult\` requires \`skills\`, \`total\`, \`page\`, and \`pageSize\`, with optional facets. Those interfaces document intent, but generated JavaScript cannot enforce them against a malformed server response.

Suppose a caller requests page three with twenty items. The exact relative target should be \`/api/skills?page=3&pageSize=20\` before the private request helper combines it with \`baseUrl\`. The insertion order is stable because the implementation calls \`set\` for page before pageSize.

The platform behavior behind this serialization follows the standard \`URLSearchParams\` interface documented by [Node.js](https://nodejs.org/api/url.html#class-urlsearchparams). Its encoder handles spaces and reserved characters, so tests should assert the URL rather than recreating a custom encoder. The [WHATWG URL Standard](https://url.spec.whatwg.org/) is the primary specification for parsing and serializing these parameters.

The code uses \`set\`, not \`append\`, for each field. Since it builds a new parameter set and writes each key once, no key repeats in normal use. A test should compare the full URL, which will catch a later shift to duplicate page or sort keys.

The request helper may add an Authorization header when the client has an API key. That header does not change the QASkills SDK list pagination query. Add one key-based case only if the suite also checks headers, then keep the same URL expectation.

Use a base URL without a trailing path, such as \`https://catalog.test\`, and stub global fetch. The request helper concatenates the configured base with the relative path. A fetch spy then exposes one complete string, which is the observable boundary a consumer depends on.

Use a URL that cannot reach a real host if the stub is lost. A name under \`.test\` is clear to the reader, and a strict fetch mock can fail on a second call. These two guards keep a unit case from turning into a slow web check.

For broader pagination design, compare this offset-style contract with the [cursor pagination boundary guide](/blog/testing-cursor-pagination-api-boundaries). That article addresses cursor continuity, while this QASkills SDK list pagination query only proves page-number serialization.

## Which cases define skills list query parameters?

Skills list query parameters need positive, omitted, encoded, combined, and repeat-run cases. Each fixture should vary one input while leaving the response and client configuration stable.

Start with no argument and an empty object. Both calls should request \`/api/skills\` without a trailing question mark. That small assertion prevents URLs such as \`/api/skills?\`, which are often accepted by servers but weaken exact contract tests and cache-key reasoning.

Next, send \`query: 'api testing'\`. The URL should contain \`q=api+testing\`, because form-style URL serialization represents spaces with plus signs. Do not expect \`%20\` merely because both forms can represent a space in other URI contexts. The [RFC 3986 reference](https://www.rfc-editor.org/info/rfc3986) defines generic URI syntax, while the URL standard defines the query serializer used here.

A combined fixture should include every supported list field used by this SDK method:

\`\`\`typescript
const client = new QASkillsClient({ baseUrl: 'https://catalog.test' });

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({ skills: [], total: 0, page: 2, pageSize: 25 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  ),
);

await client.skills.list({
  query: 'visual qa',
  sort: 'highest_quality',
  page: 2,
  pageSize: 25,
});

expect(fetch).toHaveBeenCalledWith(
  'https://catalog.test/api/skills?q=visual+qa&sort=highest_quality&page=2&pageSize=25',
  expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
);
\`\`\`

This example uses the public constructor and method rather than importing private helpers. It verifies encoding, key names, insertion order, base URL composition, and request headers in one integration boundary. Keep smaller unit cases too, because one large assertion can hide which option regressed.

The SDK interface also contains filters such as frameworks, languages, and agents, but \`skills.list\` does not serialize them in the current implementation. A test may document that gap, yet it should not expect those fields until production code supports them. Searchers can inspect active filters through the [skills catalog](/skills) and [category index](/categories).

One test should pass those typed filter fields and record the current URL. That case is a plain fact check, not a demand that the client add them. If support is added later, the test name and expected URL should change in the same patch.

Query text also needs a reserved-mark case, such as \`api & ui\`. The expected value comes from the captured URL, not from a hand-made replace call. This protects plus signs, ampersands, and equals signs with one small row.

Keep the response fixed across all URL rows. When both input and output change, a failed deep equality can hide a correct request path. One small empty page is enough for all serialization rows.

## SDK pageSize test and the current QASkills contract

An SDK pageSize test should prove positive conversion, omission of falsy input, large-number pass-through, and response preservation. It should not silently import constraints from a schema that the SDK method never calls.

The shared \`skillSearchSchema\` at \`packages/shared/src/schemas/skill-schema.ts#skillSearchSchema\` accepts integer page sizes from one through one hundred. The TypeScript interface accepts any number at compile time, and the list method only asks whether the number is truthy. These are three distinct layers with three distinct test goals.

For client serialization, \`pageSize: 1\` becomes \`pageSize=1\`, and \`pageSize: 100\` becomes \`pageSize=100\`. A value of \`101\` also becomes query text because this method does not parse through the schema. Record that result as current behavior rather than an endorsement of sending it.

Negative one, \`NaN\`, and positive infinity are also truthy numbers in JavaScript. The current map will turn each into text if a caller sends it. Put such rows in a clearly named runtime-boundary group, since normal typed use should first pass the shared schema.

For schema validation, use \`skillSearchSchema.safeParse\` in a separate shared-package test. Assert success at one and one hundred, then assert failure at zero, one hundred one, a fraction, and a string. This keeps runtime input policy close to the Zod object that owns it.

Do not mock \`skillSearchSchema\` in the SDK test and then state that list used it. No import joins those files in this path. A source review and one out-of-range call make that lack of runtime validation clear.

For response behavior, return a fixture whose \`pageSize\` differs from the requested size and prove the client returns the server value. The SDK does not rewrite response pagination. Such a fixture exposes accidental client-side normalization if it appears later.

Also return one optional facets object in a separate response case. The client should pass it through with the rest of the JSON. This check belongs to response handling, while no facet filter should appear in the URL unless production code gains that map.

A QASkills SDK list pagination query can therefore pass its serialization suite while a schema suite fails. That division is useful because it identifies whether a defect belongs to URL construction or input validation. The [error handling test guide](/blog/error-handling-testing-patterns) provides patterns for asserting each boundary without collapsing them into one generic failure.

## How do you test URLSearchParams optional fields?

Test URLSearchParams optional fields by capturing the fetch URL for a table of defined and omitted values. Keep a fresh client, reset the spy between rows, and make each expected query explicit.

The current implementation checks \`params?.query\`, \`params?.sort\`, \`params?.page\`, and \`params?.pageSize\`. Undefined fields disappear, as intended. Empty strings and zero values also disappear because JavaScript treats them as falsy.

A focused table-driven test can make this contract executable:

\`\`\`typescript
it.each([
  ['no params', undefined, 'https://catalog.test/api/skills'],
  ['empty object', {}, 'https://catalog.test/api/skills'],
  ['query', { query: 'api testing' }, 'https://catalog.test/api/skills?q=api+testing'],
  ['sort', { sort: 'newest' }, 'https://catalog.test/api/skills?sort=newest'],
  ['page', { page: 4 }, 'https://catalog.test/api/skills?page=4'],
  ['page size', { pageSize: 50 }, 'https://catalog.test/api/skills?pageSize=50'],
  ['falsy values', { query: '', page: 0, pageSize: 0 }, 'https://catalog.test/api/skills'],
])('%s', async (_name, params, expected) => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ skills: [], total: 0, page: 1, pageSize: 20 })),
  );
  vi.stubGlobal('fetch', fetchMock);

  await new QASkillsClient({ baseUrl: 'https://catalog.test' }).skills.list(params);

  expect(fetchMock.mock.calls[0][0]).toBe(expected);
  vi.unstubAllGlobals();
});
\`\`\`

The test uses supported public types for ordinary rows. The zero row may require a deliberate type cast only if a stricter wrapper type replaces the current interface. Explain that cast, because it represents a runtime boundary rather than normal application input.

Follow this numbered workflow when adding the suite:

1. Read \`packages/sdk/src/index.ts\` and record the exact option-to-key mapping before writing expectations.
2. Stub \`fetch\` with a valid JSON response and create one client whose base URL is a test origin.
3. Invoke \`skills.list\` through its public surface, then capture the first fetch argument and returned object.
4. Add omitted, encoded, boundary, and repeated-call fixtures without using a live service.
5. Restore global fetch after every case, then run the SDK package test in the same mode used by CI.

This process makes the QASkills SDK list pagination query repeatable on a laptop and a build runner. It also keeps the [getting started workflow](/getting-started) available for a separate manual smoke check.

Use test names that state the one rule each row proves. Names such as "omits page zero under current truthy guard" are more useful than "handles edge case." A clear name keeps current behavior from being read as a broad input promise.

Avoid snapshots for the whole fetch mock. An exact URL string and a small response equality check show the contract with less noise. They also make a key rename or new question mark clear in code review.

## qaskills sort query failure and edge-case matrix

The qaskills sort query needs valid enum values, omitted input, unsafe runtime values, encoded query text, and transport failures. The matrix below separates URL expectations from response behavior.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| QASkills SDK pagination | \`page: 2, pageSize: 25\` | URL contains decimal page fields | Missing or renamed parameter | \`packages/sdk/src/index.ts\` |
| Skills list query parameters | Query with a space and \`sort: 'newest'\` | URL uses \`q\` and stable serialization | Custom or double encoding | \`packages/shared/src/types/skill.ts\` |
| URLSearchParams optional fields | Undefined, empty, and zero values | Current truthy guards omit each value | Trailing question mark or stale value | \`packages/sdk/src/index.ts\` |
| Skill catalog paging contract | Two calls on one client | Each URL reflects only its own input | Mutable query state crosses calls | \`packages/shared/src/schemas/skill-schema.ts\` |
| Transport rejection | Fetch rejects | Returned promise rejects with that failure | Hanging promise or altered URL | \`packages/sdk/src/index.ts\` |

\`SkillSortOption\` allows \`trending\`, \`most_installed\`, \`newest\`, and \`highest_quality\`. The list method sends one of those values unchanged when TypeScript callers use the declared contract. A JavaScript caller can pass other text at runtime, and this SDK layer will serialize it.

Do not make a QASkills SDK list pagination query test depend on the current catalog order. Production installs and scores change independently from URL correctness. If a smoke test needs an order check, use the [leaderboard](/leaderboard) as a human-visible comparison and keep that test outside the deterministic SDK suite.

Transport failures belong in the matrix because the private request helper rejects non-success responses. For a 400 fixture, return JSON with an \`error\` field and assert the resulting message. That check covers response handling, while the fetch spy still proves the query that triggered it.

Add a non-JSON error body if the request helper's error parser is in scope. Its JSON read falls back to status text when parsing fails. Keep this assertion out of the query-only rows so a message change does not hide URL coverage.

Repeat calls expose hidden state better than isolated calls alone. Request \`newest\` first, then request page two without sort. The second URL must not retain \`sort=newest\`, which follows directly from the fresh \`URLSearchParams\` inside every invocation.

Run the same pair in the opposite order as a small guard against test setup state. The client stores its base URL and key, but it does not store query values. Two clean URLs prove that point better than an assertion about private fields.

## How should skill catalog paging contract run in CI?

A skill catalog paging contract should run with mocked network access, deterministic JSON, restored globals, and no dependence on catalog data. CI should fail on URL drift, unresolved promises, or a changed response shape asserted by the fixture.

Place the test beside the SDK source or in the package's established test directory. Import \`QASkillsClient\` from the public module, not a copied helper. This makes the QASkills SDK list pagination query fail when consumers would observe a change.

Use \`afterEach\` to restore mocks. A forgotten global fetch stub can make later tests pass against the wrong response, while a rejected response can produce an unhandled promise if the case does not await it. Both defects reduce confidence in suite order.

The response fixture should contain at least one realistic skill summary, plus \`total\`, \`page\`, and \`pageSize\`. Avoid claims about private database rows. The SDK contract only receives JSON from the public endpoint.

Keep fixture dates and counts fixed in source. A random total adds no value and makes a failed log hard to read. A named skill with a short set of fields is enough to show that the array passes through.

Run the focused SDK test first, then the package build, and finally any repository post-flow gate. This order gives a quick serialization failure before a broader compile result. The [blog index](/blog) can host links to adjacent API testing guides, but it should not become part of this unit fixture.

If the SDK package has no list test yet, add the first case near the public client source and follow its test tool. Do not add a second test runner for one method. The repository build should compile the same import path that an SDK user will load.

For a live check, send only one non-destructive request after mocked tests pass. Verify status and broad shape, not a fixed total. Production data can change between runs, while the local skill catalog paging contract should remain exact.

## Implementation checklist for QASkills SDK list pagination query

A complete QASkills SDK list pagination query suite should prove the production branch, not a reimplementation. Use this checklist during review:

- Call \`QASkillsClient.skills.list\` through the exported SDK class.
- Assert \`query\` maps to \`q\`, while page fields keep their documented names.
- Cover no parameters, one parameter, all parameters, encoding, and two sequential calls.
- Keep schema boundary tests separate from list serialization tests.
- Return valid \`SkillSearchResult\` JSON from every success fixture.
- Assert one non-success response and one rejected fetch without live network access.
- Restore global fetch and clear mocks after every case.
- Compare code comments with the [FAQ](/faq) only when user-facing behavior needs clarification.

Reviewers should reject tests that call \`URLSearchParams\` directly and then assert its own output. Such a test proves the platform API, not the QASkills mapping. The useful assertion begins at the SDK method and ends at the captured request.

Reviewers should also reject a fixed production total. The catalog grows, and its total is not part of list serialization. Exact totals belong only in controlled fixtures.

Finally, record the current truthy-guard behavior as a fact. If the client later validates through \`skillSearchSchema\`, update both the suite and this guide because zero and out-of-range values would then fail before fetch.

## Frequently Asked Questions

### What does QASkills SDK pagination verify in QASkills?

QASkills SDK pagination verifies that positive page and pageSize inputs become decimal query values on the skills endpoint. It also verifies that the typed JSON response is returned unchanged. It does not prove server ordering, database offsets, or catalog totals unless those behaviors are tested separately with controlled server fixtures.

### When should a team test skills list query parameters?

Test skills list query parameters whenever the SDK mapping, shared search type, endpoint key names, or URL construction changes. Run the suite before publishing an SDK version. A focused regression should also accompany any fix involving missing filters, encoded search text, trailing question marks, or state leaking across repeated calls.

### How can a fixture isolate SDK pageSize test?

An SDK pageSize test can isolate behavior with a test base URL and a stubbed global fetch response. Capture the first request argument, return deterministic page metadata, and restore fetch afterward. This setup tests client serialization without credentials, database state, network delay, or a changing public catalog total.

### Which assertion proves URLSearchParams optional fields?

The strongest assertion compares the complete captured URL for each input row. Undefined options must produce no key, and an entirely empty query must produce no question mark. Add an encoded text case and two calls on one client so omission, platform encoding, and lack of mutable state are all visible.

### What failure cases belong in qaskills sort query tests?

Include an omitted sort, each declared sort value, an unsupported runtime string, a non-success response, and a rejected fetch. The SDK currently serializes runtime text without schema validation, so tests should distinguish URL behavior from server rejection. Never rely on current production ranking to prove the client's sort mapping.

### How should CI run skill catalog paging contract checks?

CI should run the contract with mocked fetch, fixed response JSON, restored globals, and no required secrets. Fail on an unexpected URL, unresolved request, changed error message, or altered response handling. A separate optional smoke job may query production, but it should avoid exact totals and fixed result ordering.

## Conclusion

The QASkills SDK list pagination query has a small but exact contract: map four defined options, encode them with the platform URL serializer, omit an empty query, and return API JSON. Tests should preserve that boundary while keeping schema validation and server ranking in their own suites.

[Open the skills catalog](/skills) to choose a stable fixture, then implement the SDK contract test described in this guide. After the focused checks pass, use the [category index](/categories) to exercise one filtered user journey without tying unit tests to live inventory.
`,
};
