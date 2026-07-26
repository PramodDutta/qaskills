import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI HTTP error bodies',
  description:
    'QASkills CLI HTTP error bodies: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills CLI HTTP error bodies',
  keywords: [
    'QASkills CLI HTTP error bodies',
    'qaskills API error text',
    'non 2xx fetch response',
    'HTTP statusText fallback',
    'CLI response body diagnostics',
    'mock fetch error response',
    'API client error contract',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'test-environment-management-guide',
    'mcp-api-timeout-abortcontroller-testing',
    'typescript-testing-patterns-guide',
  ],
  repoEvidence: [
    'packages/cli/src/lib/api-client.ts#request',
    'packages/cli/src/lib/api-client.ts#getSkill',
    'packages/cli/src/lib/api-client.ts#searchSkills',
    'packages/cli/src/commands/info.ts#infoCommand',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://fetch.spec.whatwg.org/',
    'https://nodejs.org/api/globals.html#fetch',
  ],
  content: `QASkills CLI HTTP error bodies preserve the text returned by a non-success API response. The private request helper reads \`res.text()\`, then throws \`API error STATUS: BODY\`; when the body is empty or unreadable, it substitutes \`res.statusText\`. Public client methods expose that rejection.

The transport logic lives in \`packages/cli/src/lib/api-client.ts\`, where a shared request helper also sets headers and a ten-second abort timer. This guide tests its text-based HTTP contract through \`getSkill\` and \`searchSkills\). It does not cover the SDK's JSON error parser or the search command's separate offline copy.

## What does QASkills CLI HTTP error bodies guarantee?

QASkills CLI HTTP error bodies guarantee that a completed non-2xx response becomes an \`Error\` whose message includes the numeric status and either response text or status text. The helper throws before JSON success parsing, then clears its timeout in a \`finally\` block.

The implementation calls native \`fetch\` with an abort signal, JSON content type, and \`User-Agent: @qaskills/cli\`. Request-specific headers are spread last, so a caller can override either default. No public method currently overrides the user agent.

When \`res.ok\` is false, the code awaits \`res.text().catch(() => '')\`. A readable nonempty body wins, even when it contains HTML, plain text, or serialized JSON. The helper does not parse an error object for the CLI package.

If the text is empty or reading it rejects, the message uses \`res.statusText\`. That value can itself be empty, so the final string can end after the colon. Tests should preserve this current output instead of assuming every response supplies a phrase.

Successful responses take a different path and call \`res.json()\`. Invalid JSON on a successful status rejects with the runtime parse error. That case is not an HTTP error body, though it belongs in the broader API client suite.

The [HTTP Semantics specification](https://www.rfc-editor.org/info/rfc9110) defines status code meaning, while the [Fetch Standard](https://fetch.spec.whatwg.org/) defines response and fetch behavior. Repository evidence in \`packages/cli/src/lib/api-client.ts#request\` determines the exact QASkills message.

## How does qaskills API error text work?

The qaskills API error text starts as the entire response body returned by \`res.text()\`. The helper does not trim it, cap its length, inspect content type, or redact server output. A newline or JSON string therefore remains embedded inside \`Error.message\`.

This direct preservation is useful during debugging because a server route can explain validation or authorization failure. It also means tests must use harmless fixture text and security reviews must consider whether upstream bodies can contain sensitive details.

The request helper is private to its module, so invoke it through an exported method. \`getSkill\` is convenient because it creates one URL and immediately returns the request promise. \`searchSkills\` is useful when query construction must also be checked.

A body-preservation test can use a real \`Response\`:

\`\`\`typescript
import { afterEach, expect, it, vi } from 'vitest';
import { getSkill } from '../src/lib/api-client';

afterEach(() => vi.restoreAllMocks());

it('keeps response text in the HTTP error', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('skill record is unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    }),
  );

  await expect(getSkill('playwright-cli')).rejects.toThrow(
    'API error 503: skill record is unavailable',
  );
});
\`\`\`

This assertion proves body precedence because status text differs from the body. If both values say the same thing, a broken fallback order could pass. Good fixtures make competing branches observably different.

The [error handling testing guide](/blog/error-handling-testing-patterns) supplies broader failure design patterns. QASkills CLI HTTP error bodies need a tighter claim: numeric status plus the exact selected text. The [getting started page](/getting-started) can provide a normal command flow for a later smoke check.

## Which cases define non 2xx fetch response?

A non 2xx fetch response suite should cover a text body, an empty body, a body-read rejection, unusual status text, a JSON-looking body, and a successful control. These cases expose each branch without depending on a live service.

Use 400 or 422 with a short validation message for the ordinary body case. Use 404 with an empty body and distinct \`Not Found\` status text for fallback. A mocked response object whose \`text\` method rejects isolates the catch expression.

JSON-looking error content deserves a test because CLI and SDK behavior differ. If the body is \`{"error":"denied"}\`, the CLI message contains that serialized text exactly. It does not extract \`denied\` as the SDK client does.

The successful control returns valid JSON and verifies no error is thrown. This guards against a mock that accidentally sets \`ok\` to false for every response. It should also prove the ten-second timer is cleared after resolution.

Fetch rejects differently from an HTTP response. DNS failure, connection refusal, TLS failure, and an abort reject the fetch promise before any \`Response\` exists. The helper propagates that error and still clears the timer.

QASkills CLI HTTP error bodies apply only after the server supplies a response. Keep network rejection cases under a transport heading, and keep command copy under command tests. The [test environment guide](/blog/test-environment-management-guide) offers patterns for separating mocked, local, and remote layers.

## HTTP statusText fallback and the current QASkills contract

HTTP statusText fallback runs when \`body || res.statusText\` sees an empty body value. A zero-length string is falsy, while whitespace is truthy. Therefore a body containing spaces wins instead of using status text.

That detail can matter when proxies return line breaks or blank-looking HTML. The current helper preserves those characters because it neither trims nor normalizes text. A fixture with \`'   '\` should expect spaces after the message colon.

The body-read catch also returns an empty string. You can model it without constructing a full Response:

\`\`\`typescript
vi.spyOn(globalThis, 'fetch').mockResolvedValue({
  ok: false,
  status: 502,
  statusText: 'Bad Gateway',
  text: vi.fn().mockRejectedValue(new Error('stream closed')),
} as unknown as Response);

await expect(getSkill('missing')).rejects.toThrow(
  'API error 502: Bad Gateway',
);
\`\`\`

This test targets fallback selection, not stream error identity. The stream error is intentionally replaced by status text in current code. If preserving both errors becomes a requirement, production behavior and tests must change together.

Status text is not a stable substitute for domain detail across every protocol and runtime. It may be empty, generic, or produced by the mock rather than a server. Assert exact fixture behavior, then encourage API routes to return concise text where appropriate.

The [Node fetch reference](https://nodejs.org/api/globals.html#fetch) confirms the runtime API used by the CLI. The current package requires Node 20 through the monorepo and release workflow, so tests can rely on a native Response without adding a browser polyfill.

Use the [FAQ route](/faq) for user recovery guidance, not as a source for transport text. QASkills CLI HTTP error bodies are generated from the immediate response object and do not consult site content.

## How do you test CLI response body diagnostics?

Test CLI response body diagnostics at the exported client boundary first, then add one command test to see what reaches users. Direct client tests preserve the detailed error. Command handlers may intentionally replace it with friendlier output.

1. Install fake timers or spy on timer cleanup if timeout behavior is in scope.
2. Mock \`globalThis.fetch\` with a non-success Response and distinct body and status text.
3. Call \`getSkill\` or \`searchSkills\` rather than reaching into the private helper.
4. Assert the complete \`Error.message\`, request URL, signal, and default headers.
5. Repeat with an empty body to prove status-text fallback.
6. Repeat with a rejected fetch to separate transport errors from HTTP responses.
7. Restore fetch and timer state after every test.

Request options are worth one precise assertion:

\`\`\`typescript
await getSkill('name with spaces').catch(() => undefined);

expect(fetch).toHaveBeenCalledWith(
  expect.stringContaining('/api/skills/name%20with%20spaces'),
  expect.objectContaining({
    signal: expect.any(AbortSignal),
    headers: expect.objectContaining({
      'Content-Type': 'application/json',
      'User-Agent': '@qaskills/cli',
    }),
  }),
);
\`\`\`

\`getSkill\` applies \`encodeURIComponent\` before URL construction. That detail is adjacent to error handling because a malformed path can produce a different server response. Keep one encoding case, but do not turn this article's suite into full URL coverage.

\`packages/cli/src/commands/info.ts#infoCommand\` catches every client error without reading its message. It logs a generic not-found suggestion even when the cause is a timeout or 500 response. A command test should capture that current loss of detail rather than expect the transport body on screen.

The [skills route](/skills) is a valid live target for a smoke check. Required tests should stay mocked so response status and text are under test control. QASkills CLI HTTP error bodies need deterministic fixtures to prevent server copy changes from failing unrelated code reviews.

## mock fetch error response failure and edge-case matrix

A mock fetch error response should implement every property the branch reads. For non-success paths, that means \`ok\`, \`status\`, \`statusText\), and an asynchronous \`text\` method. A real \`Response\` is usually the safest fixture.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills API error text | 422 plus plain text | Error includes status and exact body | Body is dropped or parsed | \`packages/cli/src/lib/api-client.ts#request\` |
| non 2xx fetch response | 503 plus service message | Promise rejects before JSON parsing | Success parser runs | \`packages/cli/src/lib/api-client.ts#getSkill\` |
| HTTP statusText fallback | Empty 404 response | Error ends with \`Not Found\` | Empty body hides status text | \`packages/cli/src/lib/api-client.ts#request\` |
| CLI response body diagnostics | Body with newline | Newline remains in message | Text is silently normalized | \`packages/cli/src/lib/api-client.ts#searchSkills\` |
| mock fetch error response | Rejected body stream | Status text is selected | Stream error escapes | \`packages/cli/src/lib/api-client.ts#request\` |
| API client error contract | Fetch promise rejects | Original transport error escapes | Fake HTTP message appears | \`packages/cli/src/commands/info.ts#infoCommand\` |

Do not omit \`ok\` from a hand-built response. An undefined value is falsy and can accidentally force the failure branch, producing a passing test from an invalid fixture. Prefer a native Response unless a stream rejection requires a custom object.

Use fake timers carefully. The request schedules a ten-second callback that calls \`controller.abort()\`, then clears it in \`finally\`. Advancing time before resolving fetch should reject through the mocked fetch only if that mock listens to the signal.

One good timeout test captures the supplied signal, waits for its abort event, and rejects with an abort-shaped error. Then it verifies no timer remains. The [AbortController testing article](/blog/mcp-api-timeout-abortcontroller-testing) offers a deeper model for that separate contract.

QASkills CLI HTTP error bodies should not contain fabricated server messages in documentation or tests. Fixture text must be labeled as fixture text, while production examples should come from captured, approved behavior. This table uses explicit local inputs.

## How should API client error contract run in CI?

The API client error contract should run as a fast unit suite with mocked fetch and deterministic timers. It needs no database, browser, registry account, or network. Failures should print the expected and received message without exposing authorization data.

Run type checking before tests so Request and Response assumptions agree with the package's TypeScript libraries. Then execute client tests in a single supported Node version or the same version matrix used for the package. The release workflow currently sets Node 20.

A separate local-server integration job can confirm native fetch behavior with real HTTP status lines and bodies. Bind to loopback on an ephemeral port, send fixed responses, and close the server after each file. That layer is useful but should not replace branch-focused unit cases.

Remote smoke checks should assert only broad availability because server copy can change. Do not make an exact production body the required client regression oracle. The client contract is fully testable with a controlled response.

The [categories page](/categories) and catalog can help manual checks after a release, but neither proves client fallback logic. Keep transport tests close to \`packages/cli/src/lib/api-client.ts#searchSkills\` so reviewers can compare implementation and expected output directly.

If the team later introduces structured error types, preserve compatibility deliberately. Add tests for status, body, cause, and user message before replacing the current Error string. QASkills CLI HTTP error bodies are part of scripts and logs even when no formal class declares them.

## Implementation checklist for QASkills CLI HTTP error bodies

Use these checks before changing transport or command behavior:

- Return a real non-success Response with distinct body and status text.
- Assert the numeric status and selected text in the full message.
- Cover empty text, unreadable text, whitespace text, and JSON-looking text.
- Distinguish rejected fetch from a completed HTTP failure.
- Verify successful JSON still follows the success path.
- Inspect content type, user agent, and abort signal in request options.
- Confirm the timeout is cleared after success and failure.
- Invoke private request logic through exported client methods.
- Test command-level message replacement in a separate file.
- Never place real tokens or sensitive response bodies in fixtures.

These checks tie \`packages/cli/src/lib/api-client.ts#getSkill\` and \`packages/cli/src/lib/api-client.ts#searchSkills\` to the same helper. They also expose when command wrappers intentionally hide detail.

The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) can help type custom response fixtures. Prefer native objects whenever possible because loose casts can omit fields and create false positives.

QASkills CLI HTTP error bodies are trustworthy when the test proves branch selection, exact text, and cleanup together. A snapshot alone may hide why a body won over status text. Explicit assertions show the intended precedence.

## How can support teams use error body tests?

Support teams need a small map from each visible message to the branch that creates it. Start with the numeric status, returned body, and status text. QASkills CLI HTTP error bodies combine those values in a fixed order that tests can show.

Create one fixture with status \`418\`, status text \`Teapot\`, and body \`catalog paused\`. The odd values are easy to find in a failed log. An exact rejection assertion then proves that body text wins over status text.

Create a second fixture with the same status and an empty body. The expected message should now end with \`Teapot\`. Keeping the other fields equal makes the fallback choice clear to anyone reading the two test cases.

Make \`text()\` reject in a third fixture. The helper catches that read fault and uses status text, so the public method should reject with the same fallback message. This case separates an unreadable body from a network request that never returned.

A fetch rejection needs a different assertion. Since no response exists, the helper cannot add a status or body. The original transport error should reach the caller, and the abort timer should still be cleared in the final cleanup path.

Use fake timers only when the case examines timeout behavior. Advance the clock past the configured limit, then inspect the abort signal and rejection. Restore real timers afterward so unrelated SDK or CLI tests do not inherit a paused clock.

Support logs should identify whether a command replaced the client error. Test that wrapper in its own file with a rejected client mock. Mixing command copy with fetch fixtures makes one failure hard to assign and can hide useful transport detail.

Keep response samples free of secrets, user data, and full production payloads. A short phrase is enough to prove precedence. Real error bodies may contain private details, so test logs and product logs need an explicit redaction policy.

If redaction is added later, start with a test that describes the exact fields or patterns removed. Preserve the status and a safe fault code when possible. A broad replacement such as \`request failed\` can make all support cases look the same.

The client currently treats whitespace as body text because a nonempty string is truthy. Add a fixture containing spaces and document the exact message it creates. This test can support a later trim change without pretending that trim already exists.

JSON-looking text also stays text in this helper. Return \`{"error":"paused"}\` and assert that literal body in the message. Do not parse it inside the fixture because the production branch calls \`res.text()\`, not \`res.json()\`.

Record the request URL and headers beside each response fixture. This detail proves that the error belongs to the intended public method. It also catches a bad base URL before support spends time studying a valid body from the wrong route.

Run one loopback-server case after mocked unit cases. Native fetch can supply a real status, body, and signal without using qaskills.sh. Bind to a dynamic local port, close the server in \`finally\`, and fail the test if any handle remains.

Remote smoke checks should accept broad results and keep exact body copy out of required assertions. Production wording may change during service work. The local contract still proves how this client handles any returned text and fallback status.

When a support report arrives, match its status and suffix with the tested matrix. A body suffix points to a completed HTTP response, while a raw transport message points to fetch failure. That split guides the next owner without guessing from one screenshot.

Review the matrix whenever \`packages/cli/src/lib/api-client.ts#getSkill\` or the shared request helper changes. QASkills CLI HTTP error bodies are public through rejected methods even though the helper is private. Tests at exported methods keep that contract visible.

Use this support and test review list for each client change:

- one plain body uses words that cannot be confused with the status text in the same response
- one empty body proves the status text is the next safe value used by the request helper
- one failed body read reaches the same fallback while the original numeric status stays in place
- one whitespace body records current truthy text behavior without trimming inside the test fixture
- one JSON shaped body stays raw text because this failure path does not parse response JSON
- one rejected fetch proves there is no made up status or body when no response was received
- one abort case checks the signal and makes sure fake time is put back after the assertion
- one success case guards normal JSON work while the nearby failure cases use text response bodies
- one public client method supplies the call path because tests should not reach into the private helper
- one URL check ties the response fixture to the intended skill, search, or category request route
- one header check keeps content type and user agent facts visible beside the error assertion
- one command test states when user copy hides or replaces the lower client error on purpose
- one local server test covers native fetch without relying on live qaskills.sh response wording
- one teardown check restores fetch, time, server, and queued response state after every branch
- one log review confirms that fixtures and output hold no token, user record, or private body

The list is short enough for a pull request but broad enough for real fault paths. Each line should map to one named test or one clear assertion. QASkills CLI HTTP error bodies then remain easy to trace from report to source.

- saved case record with route method status status text body read result expected suffix actual suffix abort state timer state cleanup state and test owner
- final support link to [the skills catalog](/skills) with safe case name known branch expected message actual message fix owner and next check date

## Frequently Asked Questions

### What does qaskills API error text verify in QASkills?

It verifies that a nonempty response body appears after the numeric status in the rejected Error message. Use body text different from status text so precedence is proven. The assertion belongs at an exported client method because the shared request helper is private.

### When should a team test non 2xx fetch response?

Run these cases whenever request handling, URL building, fetch setup, API routes, or command error copy changes. Keep exact body assertions in mocked client tests. Use local servers for runtime integration and remote services only for broad smoke coverage after local tests pass.

### How can a fixture isolate HTTP statusText fallback?

Return a response with \`ok: false\`, a known status, an empty text body, and distinctive status text. Then call \`getSkill\` and assert the complete rejection message. A second case can make \`text()\` reject to prove the same fallback path and timer cleanup.

### Which assertion proves CLI response body diagnostics?

Assert \`API error STATUS: BODY\` exactly, including meaningful whitespace when the fixture contains it. Also verify the URL and headers so the expected response belongs to the intended request. Command output is a separate assertion because handlers may replace transport detail.

### What failure cases belong in mock fetch error response tests?

Include plain text, empty text, unreadable text, whitespace, JSON-looking text, fetch rejection, abort, and invalid success JSON. Each fixture should activate one branch. Restore fetch and timers afterward so later tests cannot inherit a queued response, fake clock, or open timeout.

### How should CI run API client error contract checks?

Run mocked client tests without network access on the package's supported Node version. Add an optional loopback-server layer for native fetch behavior, using a dynamic port and strict teardown. Keep production response copy outside required exact-match assertions and saved fixtures.

## Conclusion

QASkills CLI HTTP error bodies follow a simple precedence rule: readable nonempty text first, then status text. The helper also includes the numeric status, propagates transport rejection, and clears its abort timer regardless of the outcome.

Follow the [getting started instructions](/getting-started) with a mock API, then compare a smoke request against [the public skills catalog](/skills). Keep exact diagnostics in controlled tests and keep live checks focused on service availability.`,
};
