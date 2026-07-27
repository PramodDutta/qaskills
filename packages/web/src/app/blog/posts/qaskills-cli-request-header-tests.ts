import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI request header tests',
  description:
    'QASkills CLI request header tests: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills CLI request header tests',
  keywords: [
    'QASkills CLI request header tests',
    'qaskills user agent header',
    'CLI content type header',
    'fetch header merge order',
    'custom Authorization header test',
    'API request identity',
    'mock fetch request headers',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'test-environment-management-guide',
    'mcp-api-timeout-abortcontroller-testing',
    'typescript-testing-patterns-guide',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://fetch.spec.whatwg.org/',
    'https://nodejs.org/api/globals.html#fetch',
  ],
  repoEvidence: [
    'packages/cli/src/lib/api-client.ts#request',
    'packages/cli/src/lib/api-client.ts#publishSkill',
    'packages/cli/src/lib/api-client.ts#trackInstall',
    'packages/cli/package.json',
  ],
  content: `QASkills CLI request header tests should prove that every API call starts with JSON content type and \`@qaskills/cli\` user agent values, then lets operation-specific headers override those defaults. Publish adds bearer authorization, telemetry adds no custom header, and every assertion should inspect the final \`fetch\` arguments without contacting production.

This article covers header construction and merge order in \`packages/cli/src/lib/api-client.ts\`. It does not test telemetry payload fields or SDK API-key behavior, and the [getting started guide](/getting-started) remains the user-facing command reference.

## What does QASkills CLI request header tests guarantee?

QASkills CLI request header tests guarantee the final header object supplied to native fetch for each exported API operation. The helper starts with \`Content-Type: application/json\` and \`User-Agent: @qaskills/cli\`, then spreads any \`RequestInit.headers\` values afterward.

- The merge order is observable because later object properties replace earlier properties with the same key spelling. A custom authorization value from \`publishSkill\` is added without removing defaults, while a caller-supplied content type or user agent would replace the matching default.

The public API does not expose the private request function. Tests should reach it through \`searchSkills\`, \`getSkill\`, \`getCategories\`, \`trackInstall\`, or \`publishSkill\`, then inspect the one fetch call.

The contract includes method and body context because headers can be correct on the wrong request. Search and detail calls use fetch defaults for the method, telemetry and publish use POST, and both POST operations serialize JSON bodies.

The [HTTP Semantics specification](https://www.rfc-editor.org/info/rfc9110) defines header field meaning and request methods. QASkills source defines the chosen field values, ordering, timeout, and error behavior for this client.

These tests should not claim that a header authenticates successfully. They prove client construction before the request crosses the network. Service-side authorization belongs to API route tests.

The QASkills CLI request header tests also need cleanup assertions because the helper creates a timeout for every call. A resolved or rejected request must clear that timer in its \`finally\` block.

## How does qaskills user agent header work?

The qaskills user agent header is a fixed string created inside the private request helper. Every exported operation that uses this helper receives it unless a later custom header with the same property name replaces it.

\`\`\`typescript
const res = await fetch(url, {
  ...init,
  signal: controller.signal,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': '@qaskills/cli',
    ...(init?.headers ?? {}),
  },
});
\`\`\`

- This excerpt mirrors \`packages/cli/src/lib/api-client.ts\`. Spreading \`init\` first prevents a caller's signal from surviving because the helper assigns its own abort signal afterward. Header construction similarly uses explicit defaults followed by operation headers.

The user agent identifies the package family, not its installed version. \`packages/cli/package.json\` supplies package metadata, but the current header remains \`@qaskills/cli\` without a version suffix.

Tests should assert that exact current text, then make version behavior a separate product decision. Importing a version constant and expecting it in the header would invent behavior absent from source.

Node documents its browser-compatible [global fetch API](https://nodejs.org/api/globals.html#fetch). A Vitest test can replace global fetch with a mock and capture both positional arguments while leaving URL construction and header merging real.

Use at least two public operations, such as search and publish, to prove the common helper owns the header. Testing every exported wrapper for the same default offers low value unless each wrapper adds different options.

Header names are case-insensitive in HTTP, but this helper builds a plain record before fetch normalizes it. The focused unit assertion can use the exact property spelling produced by code, while an integration test can inspect a real \`Headers\` object.

The [privacy policy](/privacy) can explain service data use. A user agent assertion should remain a narrow identity check and should not infer retention or tracking behavior.

## Which cases define CLI content type header?

The CLI content type header matrix should cover bodyless GET calls, JSON POST calls, custom overrides, error responses, and request rejection. The current helper sets JSON content type even when a GET has no body.

Start with \`searchSkills\` and return a successful empty result. Require the default content type and user agent, but do not require an explicit method because the wrapper does not set one.

Call \`trackInstall\` with a stable event and require POST, a JSON string body, and the same two defaults. Parse the body separately so header failure does not obscure payload diagnosis.

Call \`publishSkill\` with a fixed token and require all three expected headers. The custom authorization field should coexist with content type and user agent because no names collide.

- The private helper accepts arbitrary \`RequestInit\`, yet public wrappers currently expose only selected custom headers. Avoid modifying visibility merely to test an imagined override. A source-level helper test is acceptable if the package already uses a test seam, but public-path evidence is preferable.

Use a non-OK response to prove headers were still complete before error parsing. The request helper reads response text and throws \`API error <status>: <body or statusText>\`; that branch should not alter captured request options.

Reject fetch and advance fake timers only when testing abort behavior. Header tests can resolve immediately and verify that timer cleanup occurred without adding ten seconds to the suite.

The QASkills CLI request header tests should use an environment override for \`QASKILLS_API_URL\` before importing the module, because \`BASE\` is computed at module load. Reset modules between different base URL cases.

Keep each request case small, since one search row can prove the two default fields while one publish row proves the added bearer field. A third telemetry row can prove the same defaults on a JSON post.

Use one fixed response per row and require one call because a mock with a long queue may let an extra call consume the next reply and still pass. A one-call stub turns that drift into a clear fault.

Read the URL and options from the same call tuple. This lets the test show that the right headers went to the right path, not just that two good values appeared somewhere in the suite.

For a GET row, require that the body is absent, while a POST row should parse the body and check its own fields. These facts give the content type a clear link to the request it describes.

Do not make a base URL case change header values because host, path, and headers are distinct parts of the call, and separate checks keep each fail message direct. One setup value can serve the whole header group.

After the non-OK row, check that the mock still saw the normal identity fields. A server error comes after request creation, so it must not change what the client sent.

The [QASkills categories page](/categories) is a valid public API use case. Unit tests should use a local response with the same broad shape rather than fetching that page or its data.

Use the [test environment guide](/blog/test-environment-management-guide) for broader isolation practices. Here, one invalid test origin and one restored environment value are enough.

## fetch header merge order and the current QASkills contract

Fetch header merge order determines whether defaults or operation-specific values win. In this helper, defaults are created first and \`init.headers\` is spread last, so operation headers have later assignment priority.

\`\`\`typescript
return request<{ id: string; slug: string }>(url, {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${token}\`,
  },
  body: JSON.stringify(data),
});
\`\`\`

This code mirrors \`publishSkill\` in \`packages/cli/src/lib/api-client.ts\`. The request adds authorization while retaining default content type and user agent fields.

The object merge is shallow. Passing a headers object does not replace the entire default object because the helper explicitly creates a new record and spreads custom entries within it.

- Case-sensitive object keys present a testing boundary. A custom key named \`content-type\` would coexist in the plain object with \`Content-Type\` before fetch converts it to a Headers collection. The web platform then applies case-insensitive header rules.

- The [Fetch Standard](https://fetch.spec.whatwg.org/) describes header processing. Unit tests should avoid overclaiming exactly how every runtime combines differently cased duplicates, unless they pass the record through that runtime's Request implementation.

- For the current public operations, authorization is the only custom header. Require one field named \`Authorization\` and one value using bearer syntax with the token argument unchanged.

Do not inspect secret values in snapshots or failure logs, and instead use \`test-token\`, compare directly, and clear mock call data after the assertion. A real token is unnecessary and unsafe.

The QASkills CLI request header tests should also prove no authorization field appears on search, detail, category, or telemetry calls. This negative assertion catches accidental movement of a token into the shared helper.

Use [how to publish](/how-to-publish) for the user workflow around tokens. This transport suite only verifies that the publish wrapper forwards its explicit token in the documented place.

## How do you test custom Authorization header test?

A custom Authorization header test should call \`publishSkill\` through the public API and inspect the final fetch options. It needs one successful response, one invalid fixed token string, and no real service.

1. Save the current \`QASKILLS_API_URL\` value and set it to \`https://api.test.invalid\`.
2. Reset modules, import \`publishSkill\`, and stub global fetch with a successful JSON response.
3. Call publish with fixed frontmatter, fixed content, and the token \`test-token\`.
4. Capture fetch URL and options, then require POST to \`/api/skills\`.
5. Require JSON content type, the fixed CLI user agent, and \`Authorization: Bearer test-token\`.
6. Parse the request body and compare frontmatter and content as data.
7. Run one search call and require authorization to be absent from its header record.
8. Restore fetch, modules, timers, and the original environment value after every case.

The procedure proves header composition through supported wrappers. It also checks that credentials stay local to the publishing operation rather than becoming a default for unrelated requests.

Do not pass an empty token to claim anonymous publishing support because current \`publishSkill\` formats whatever string it receives, so an empty input becomes \`Bearer \`. Server acceptance is a separate contract.

When comparing options, account for the helper's AbortSignal. Assert that a signal exists and leave detailed timeout behavior to the existing abort test topic.

The [error handling guide](/blog/error-handling-testing-patterns) can help structure rejection cases. Header checks should still report missing fields before response-error expectations.

One integration variant can start a local HTTP server and inspect incoming normalized headers. Keep that case small, because the mock fetch unit test already proves object merge order with clearer failure output.

## API request identity failure and edge-case matrix

- API request identity is the combination of target URL, method, user agent, content type, and operation authorization. A useful matrix distinguishes client construction errors from service response errors.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills user agent header | Successful search response | User agent equals \`@qaskills/cli\` | Header absent or changed | \`packages/cli/src/lib/api-client.ts\` |
| CLI content type header | GET and JSON POST | JSON content type appears on both | Body sent without declared type | \`packages/cli/src/lib/api-client.ts\` |
| fetch header merge order | Publish options with authorization | Defaults remain and bearer field is added | Custom object replaces defaults | \`packages/cli/src/lib/api-client.ts\` |
| custom Authorization header test | Fixed publish token | Bearer value reaches only publish | Token leaks to search or telemetry | \`packages/cli/src/lib/api-client.ts\` |
| mock fetch request headers | Rejection and non-OK response | Captured request remains inspectable | Response branch mutates request | \`packages/cli/package.json\` |

One edge case is a trailing slash in \`QASKILLS_API_URL\`, which the module removes from the configured base so generated API paths contain one separator. Test this during URL construction without mixing it into every header case.

Another edge case is a bodyless GET with JSON content type, which is current behavior even though a body is absent. Record it rather than silently omitting the assertion because it seems unnecessary.

A third edge case is a caller token containing leading or trailing whitespace, which the wrapper preserves inside the bearer value. Use normal fixed input in the primary test and document that validation belongs before transport.

Fetch can reject before any Response exists, but its invocation still receives the complete options object. Inspect the call before asserting the propagated rejection to retain useful evidence.

Keep field checks case aware at the plain object stage because source writes \`Content-Type\`, \`User-Agent\`, and \`Authorization\`, so the unit row should use those names. A local server row can cover the lower-case view seen on the wire.

Do not turn all headers into a snapshot, since an exact object check is fine with three known fields but a named assertion for each rule gives a better error. It also makes a new safe field prompt a clear review.

The user agent has no version today, so a test that builds its expected value from the package version would pass a rule the code does not meet. Keep the fixed text until source and docs change together.

The content type has no charset suffix today, so require the exact current value and avoid adding a browser guess to the expected string. Fetch may normalize wire form, which belongs to the local server case.

The bearer value should use a fake token with no spaces, while whitespace cases can document current pass-through behavior without weakening the main claim. The main row states the normal call in the clearest form.

If the helper later accepts a general headers map, add a focused override table, but until then only public wrappers should drive this suite. Tests should not open a private method just to create cases no caller can make.

The QASkills CLI request header tests should report a leaked token as a high-risk fault. A search or telemetry row with authorization must fail even if the service ignores that field.

The helper always clears its timeout in a finally block. Use fake timers and a rejected promise to prove no scheduled timer remains, but keep that assertion outside exact-header comparisons.

- The [MCP timeout testing guide](/blog/mcp-api-timeout-abortcontroller-testing) covers AbortController behavior in another client boundary. This article stays with CLI identity fields.

## How should mock fetch request headers run in CI?

Mock fetch request headers should run in deterministic CLI unit tests with no credentials, no DNS, and no service database. Each case controls module loading because the base URL is evaluated once.

\`\`\`typescript
it('adds defaults and publish authorization', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'skill-1', slug: 'fixture' }), {
        status: 201,
      }),
    ),
  );

  await publishSkill(
    { frontmatter: { name: 'Fixture' }, content: 'Use fixture steps.' },
    'test-token',
  );

  const [, init] = vi.mocked(fetch).mock.calls[0];
  expect(init?.headers).toEqual({
    'Content-Type': 'application/json',
    'User-Agent': '@qaskills/cli',
    Authorization: 'Bearer test-token',
  });
});
\`\`\`

This example reflects the final record supplied by the helper. A companion search test should require only the two defaults, and a telemetry case should combine those defaults with POST.

Run the suite with fake timers only for timeout assertions. Mixing fake time into ordinary response tests can complicate native fetch or Response behavior without improving header proof.

Reset modules after changing \`QASKILLS_API_URL\`, then restore the environment. If modules remain cached, a case may use a base URL from an earlier test and produce misleading request evidence.

Make unexpected external calls fail immediately. A mock that returns success for unlimited calls can hide duplicate requests, so use one response and require exact call count.

The QASkills CLI request header tests should run beside type checking and package tests. Types catch a changed request shape, while fetch assertions catch runtime merge order and value changes.

Run the fast default-header rows first because they need no timer control and should finish in a few steps. Then run error and abort rows, which have more setup and should not block basic diagnosis.

Use \`afterEach\` to restore global fetch even when a row throws before its final assertion. A cleanup line at the end of the test is not enough, since it will not run after an early failure.

Save the old API URL as either a string or an absent state. Restore an absent value with delete rather than text that says undefined. Module-level base state can make a later suite hard to debug.

Reset the module only when the environment changes. A reset before each basic header row adds time and can hide state that should be constant within one import. Keep the smallest reset scope that proves the rule.

Use real Response objects for success and HTTP error rows. They give correct \`ok\`, text, status, and JSON behavior with less hand-made code. A plain rejected promise still owns the network-fault row.

Keep the test token out of shared setup logs. It is fake, but the same habit helps prevent a real value from being printed if setup changes later. Assert the field in memory and show only the key name on fail.

The QASkills CLI request header tests can run with all network blocked. Add that fact to the package job so a new live call fails at once instead of reaching an outside host. Local proof should not need a web link.

Use the [QASkills blog](/blog) for review links and the [privacy page](/privacy) for policy. Neither page is part of the mock fetch run.

Use the [TypeScript testing guide](/blog/typescript-testing-patterns-guide) for test runner details. Keep this suite owned by the CLI package rather than a web end-to-end job.

## Implementation checklist for QASkills CLI request header tests

- The implementation checklist protects stable fields and leaves standards processing to focused integration cases. Every assertion should use fixed local data and supported public wrappers.

- Load \`packages/cli/src/lib/api-client.ts\` after setting an invalid test base URL.
- Stub global fetch and require the exact number of calls.
- Check JSON content type and \`@qaskills/cli\` on search, telemetry, and publish examples.
- Require POST and parsed JSON for telemetry and publish.
- Require bearer authorization only on the publish wrapper.
- Prove custom operation headers do not remove either default.
- Cover one non-OK response and one rejected fetch after inspecting request options.
- Verify an AbortSignal exists, then test timeout cleanup separately.
- Restore fetch, environment, modules, and timers after each case.
- Keep payload privacy, API authorization, and SDK key behavior in their own suites.

These checks connect \`request\`, \`publishSkill\`, and \`trackInstall\` without exposing private functions merely for testing. They also make a changed identity value visible before a release reaches the service.

Review the search row first when a default field changes. It has no body or custom header, so it shows the base helper in its plain form. If that row passes, move to the publish merge rule.

Review the publish row as three claims: defaults remain, bearer is added, and no extra field appears. This split makes a merge bug distinct from a token format bug. It also keeps service auth out of the result.

Review telemetry last because it shares POST and JSON traits but has no custom header. It can catch a token leak and prove that body-bearing calls still keep both defaults.

A new client wrapper should reuse one of these patterns. Add a row only when it changes method, body, or custom fields in a way the current rows do not cover. More call sites alone do not need more copies.

The QASkills CLI request header tests should use names that match exported functions. A failed \`publishSkill adds bearer\` row points straight to source and avoids a broad "headers broken" report.

When all rows pass, print no request body or token. A short test name and pass mark are enough. Failed values can be shown from local fixed data without exposing real state.

Review the [skills directory](/skills) for the API's public catalog role and the [FAQ](/faq) for product behavior. Neither route should be requested by these unit tests.

The QASkills CLI request header tests should be revised when the client adds a versioned user agent, accepts a generic header input, or changes content negotiation. Deliberate changes deserve explicit contract updates.

## Frequently Asked Questions

### What does qaskills user agent header verify in QASkills?

It verifies that the private request helper supplies \`User-Agent: @qaskills/cli\` to fetch for public API operations. The assertion identifies the package family only. Current source does not add a version, so tests should not expect one without an implementation change.

### When should a team test CLI content type header?

Run the suite whenever request helpers, wrappers, JSON serialization, fetch configuration, publishing authentication, or package identity changes. Keep GET and POST examples because the helper currently sends JSON content type on both, even when a GET request has no body.

### How can a fixture isolate fetch header merge order?

Set a fixed invalid base URL before module import, stub global fetch, and invoke a public wrapper that adds authorization. Inspect the final header record, require defaults plus the custom field, and restore modules and environment so no later case inherits that configuration.

### Which assertion proves custom Authorization header test?

Call \`publishSkill\` with \`test-token\` and require exactly \`Authorization: Bearer test-token\` beside both defaults. Then call a non-publish wrapper and require authorization to be absent. This proves operation scope as well as positive header construction for the same client on every checked call.

### What failure cases belong in API request identity tests?

Cover missing or changed defaults, a custom header replacing defaults, authorization leaking to another operation, duplicate requests, a trailing-slash base URL, non-OK responses, rejected fetch, and timeout cleanup. Keep server token validation and event payload contents in separate suites with their own fixtures.

### How should CI run mock fetch request headers checks?

CI should run deterministic package tests without network or secrets. Use one response per expected call, fixed test tokens, an invalid base URL, and guaranteed global restoration. Add one local-server integration check only when normalized wire headers need separate confirmation.

## Conclusion

QASkills CLI request header tests prove final fetch identity through public wrappers: JSON content type, a fixed CLI user agent, and publish-only bearer authorization. Assert method and body context, preserve merge order, and isolate response or timeout behavior into clear companion cases.

Follow the [QASkills getting started flow](/getting-started) with a mock API, review [publishing requirements](/how-to-publish), then confirm the same public catalog contract at [QASkills skills](/skills). The test itself should remain local, deterministic, and credential free.`,
};
