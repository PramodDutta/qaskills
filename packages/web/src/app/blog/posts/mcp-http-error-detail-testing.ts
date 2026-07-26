import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP HTTP error detail testing',
  description:
    'MCP HTTP error detail testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP HTTP error detail testing',
  keywords: [
    'MCP HTTP error detail testing',
    'MCP non-2xx response test',
    'HTTP statusText fallback',
    'API error body preservation',
    'MCP error URL diagnostics',
    'empty HTTP error response',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
    'mcp-api-timeout-abortcontroller-testing',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
    'https://nodejs.org/api/globals.html#fetch',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP HTTP error detail testing must prove every non-2xx response reports its status, request URL, and response body, using statusText only when body text is empty or unreadable. Success is an exact structured MCP error with those details. A missing field, wrong fallback, thrown handler error, or malformed result disproves the contract.

## What must MCP HTTP error detail testing prove?

MCP HTTP error detail testing must prove that request failures retain enough controlled context for a maintainer to identify the endpoint and upstream response. It must also prove that tool handlers convert those failures into MCP error results instead of allowing exceptions to escape.

The contract starts with an HTTP reply whose \`ok\` flag is false. The request code then reads text, picks a detail value, and throws one error with status, URL, and detail.

The handler catches that error and returns one text item with an error flag. This shape keeps wire output valid even when the body has HTML, JSON text, line breaks, or plain marks.

Body text wins when it has data. The \`statusText\` value becomes detail only when the read gives an empty string or fails and is then changed to an empty string.

Tests need exact cases because spaces are not empty in JavaScript. A body with spaces is true in this check, so current code keeps those spaces instead of picking \`statusText\`.

The URL check should use the full URL made by the request helper. Path, coded slug, and query keys can explain faults that one status code cannot split.

Do not claim each server error body is safe or clear. The package keeps source text; it does not claim to strip secrets, parse HTML, or change API words.

The [MCP server contract guide](/blog/mcp-server-contract-testing-guide) covers wider tool result compatibility. This article stays on status, URL, detail selection, and the stable error wrapper around [QASkills API calls](/blog/mcp-server-contract-testing-guide).

The approved [HTTP semantics reference](https://www.rfc-editor.org/info/rfc9110) defines status behavior, while repository code defines the exact message. Keep those layers separate so a standards citation does not replace a product assertion.

## Which repository behavior defines the contract?

The request implementation resides in \`packages/mcp/src/index.ts\`. Its \`fetchWithTimeout\` helper creates an abort controller, starts a ten-second timer, calls fetch, and inspects the returned response.

When \`response.ok\` is false, the helper calls \`response.text()\`. A local catch turns a failed text read into an empty string, then \`body || response.statusText\` picks the detail.

The thrown text has a fixed order: API request fault, status number, request URL, then chosen detail. Exact order matters because help tools and file tests may rely on a stable error log.

The \`finally\` branch clears the clock for both pass and fail. An HTTP error test can thus check message acts without a live timer left in the test process.

\`getJson\` and \`getText\` both call the same wrap. JSON tools never call \`response.json()\` after a non-2xx result since the wrap throws before it can return the reply.

Each tool puts its helper call in \`try\` and \`catch\`. The catch sends the value to \`errorResult\`, which starts its text with \`Error: \` and sets the error flag true.

The \`asErrorMessage\` helper keeps an Error object's message and casts other thrown values to text. HTTP faults from the wrap are Error values, so their exact text should last through that step.

The package build and run rule live in \`packages/mcp/package.json\`. Log them on fail since built code or fetch acts may differ between a stale package and current source.

The [Node fetch documentation](https://nodejs.org/api/globals.html#fetch) establishes the runtime API, and the [Response reference](https://developer.mozilla.org/en-US/docs/Web/API/Response) documents body and status properties. Repository tests still decide the fallback order and final MCP shape.

MCP HTTP error detail testing should call a saved live handler when it can. A test of \`fetchWithTimeout\` alone proves message text, but not the catch that keeps a thrown error inside the tool.

## How should QA teams test MCP non-2xx response test?

An MCP non-2xx response test should give a fixed Response-like object and call one tool. The best check covers fetch input, body-read count, exact MCP object, and no other side effects.

Save handlers by replacing the SDK server as code loads. This avoids a stdio process while it keeps tool options, input parse edge, and live catch blocks.

For a JSON tool, return \`ok: false\`, status 503, status text \`Service Unavailable\`, and body \`catalog maintenance\`. The set detail must be the body, not status text.

Check the full request URL, not just one part. A search case should show set query codes, while a skill case should show the coded slug and exact content or data route.

The exact returned object should hold one text item and \`isError: true\`. Check that no thrown error rejects the handler promise, since its contract is the returned error object.

Count \`response.text\` calls and demand one. More reads can fail since body text is a stream, while no read would drop a useful source clue.

Check that \`response.json\` is never called on this path. A non-2xx HTML body should be read as text, not sent to a JSON parser that turns the clue into a syntax fault.

Run the same case through one text tool and one JSON tool. This pair proves both helper types share non-2xx code before their pass decoders split.

Use no live endpoint in unit tests. A service can change status text or body at any time, making exact assertions unreliable and potentially storing unreviewed data in logs.

The [MCP testing guide](/blog/mcp-server-testing-guide-2026) can supply broader process-level coverage. Keep the focused suite fast enough to run on each request-helper edit.

MCP HTTP error detail testing should print set and seen values on fail. A broad failed-promise check hides whether body, URL, status, or the outer MCP shape changed.

## Test matrix for HTTP statusText fallback

The HTTP statusText fallback matrix must change body text apart from status and URL. If not, a pass cannot prove which detail source won.

Use plain objects when a text read must fail, since a native Response has no easy failed \`text\` method. Keep each stub to the Response fields live code reads.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Body detail | 503 with \`catalog maintenance\` | Message ends with body text | Status text replaces nonempty body | \`packages/mcp/src/index.ts\` |
| Empty body | 404 with empty text and \`Not Found\` | Detail is \`Not Found\` | Message ends without detail | \`packages/mcp/src/index.ts\` |
| Text read rejects | 502 and rejected \`text()\` | Detail falls back to status text | Read error escapes handler | \`packages/mcp/src/index.ts\` |
| Whitespace body | 400 with three spaces | Current message preserves spaces | Test trims and chooses status text | \`packages/mcp/src/index.ts\` |
| HTML body | 500 with controlled HTML | HTML remains text inside MCP content | JSON parsing replaces original detail | Response reference |
| Encoded URL | Slug includes spaces or slash | Message contains encoded request URL | Raw input replaces actual URL | \`packages/mcp/src/index.ts\` |
| JSON-looking body | 429 with JSON text | Exact response text is preserved | Object conversion changes formatting | \`packages/mcp/src/index.ts\` |
| Success control | 200 valid fixture | Normal decoder runs with no error result | Non-error becomes fallback message | \`packages/mcp/src/index.ts\` |

The empty-body row needs an exact empty string. A line break, spaces, or tabs have data and thus skip fallback under current source rules.

The failed-read row should keep reply status and URL. Only the body read changes, so that fault should not turn the whole message into a low-level thrown error.

The HTML row uses small fixed text such as \`<h1>maintenance</h1>\`. Check it as text in the MCP content field, not as markup shown by a browser.

For a JSON-like body, keep source spaces and field order. The wrap does not parse fail bodies, so an object match would test acts that live code never does.

The coded URL row should match the URL seen by fetch. This ties the error clue to the real request instead of making a second URL in the test.

Add the pass case to prove the test rig can split \`ok: true\` from false. Without it, a mock that marks each reply failed could make all error rows seem right.

MCP HTTP error detail testing should keep table data free from keys and user text. Fixed details make exact logs safe and easy to run again.

## What failures expose API error body preservation?

API error body preservation fails when body text is lost, changes spaces, becomes parsed JSON, or moves from its place after the URL. It also fails when status text wins though body text exists.

Match the full returned text for one small body. An exact match finds prefix, order, marks, and space drift better than a set of loose \`contains\` checks.

Then add clear checks for a body with more than one line. The MCP object should stay valid while its text keeps the fixed line break form.

Do not place raw body text outside the content field. A handler that writes it to stdout could break stdio wire frames even if it also returns the right object.

A test spy can watch console calls and demand no new output for plain HTTP faults. Current source does not log caught tool faults, so no log is the valid baseline.

The first example proves body priority and the returned MCP shape. The test-harness helper represents captured production registration, while the expected sentence follows current source exactly.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it('preserves a nonempty API error body in the tool result', async () => {
  const response = {
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    text: vi.fn().mockResolvedValue('catalog maintenance'),
    json: vi.fn(),
  };
  global.fetch = vi.fn().mockResolvedValue(response as Response);
  const getSkill = (await captureRegisteredTools()).get('get_skill')!;

  const result = await getSkill.handler({ slug: 'api-checks' });
  const requestedUrl = String(vi.mocked(fetch).mock.calls[0][0]);

  expect(response.text).toHaveBeenCalledOnce();
  expect(response.json).not.toHaveBeenCalled();
  expect(result).toEqual({
    content: [{
      type: 'text',
      text: \`Error: API request failed with status 503 for \${requestedUrl}: catalog maintenance\`,
    }],
    isError: true,
  });
});
\`\`\`

This exact check is strict by design. If product words change, reviewers must decide whether help logs and linked tests need the same update.

The second sample drives empty and failed-read bodies through the same handler. It checks fallback while it makes sure the read fault itself does not become the shown detail.

\`\`\`typescript
it.each([
  ['empty', vi.fn().mockResolvedValue('')],
  ['unreadable', vi.fn().mockRejectedValue(new Error('stream closed'))],
])('uses statusText for an %s failure body', async (_name, readText) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 502,
    statusText: 'Bad Gateway',
    text: readText,
  } as unknown as Response);

  const search = (await captureRegisteredTools()).get('search_skills')!;
  const result = await search.handler({ limit: 10 });

  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('status 502');
  expect(result.content[0].text).toContain('Bad Gateway');
  expect(result.content[0].text).not.toContain('stream closed');
});
\`\`\`

Add an exact URL check to at least one row in this group. Doing it in each fallback case adds noise but no new proof for the choice code.

## CI coverage for MCP error URL diagnostics

MCP error URL diagnostics should run with all outgoing requests intercepted. A live host can redirect, localize status text, or return infrastructure HTML that makes focused tests unstable.

Use URL-aware mocks that reject an unexpected method, host, path, or query. This turns routing drift into an immediate failure instead of returning the planned error fixture to the wrong request.

Run message tests in the package's supported Node range, with Node 20 as the minimum declared by \`packages/mcp/package.json\`. Record runtime and package versions when native fetch behavior differs.

Keep test times below the live ten-second limit for fake replies. A stuck body read should have its own fixed test instead of making each HTTP error row wait.

CI logs should store status, safe URL, chosen detail source, and returned MCP shape. Store fixed body text only, and mask query values if a later test has secret input.

Block a release when status, URL, or chosen detail is lost, or when body order changes. Also block it when a handler rejects or output leaves the text content field.

A marks-only text change still needs review since help tools may match or show this text. Teams can approve the change, update checks, and keep meaning tests as one set.

Run the focused command after edits to fetch helpers, tool handlers, package run data, or SDK links. Pair it with [timeout-specific tests](/blog/mcp-api-timeout-abortcontroller-testing) since stop errors use a new error branch.

Source and built package jobs should share test data. If source passes and built code fails, check the bundle and release path before you weaken URL or body rules.

MCP HTTP error detail testing should keep one exact check per branch with no file snapshot. A plain match gives a useful diff and stops broad snapshot edits from taking in other changes.

## How should empty HTTP error response be asserted?

An empty HTTP error response should be represented by \`text()\` resolving to exactly \`''\`. The expected detail is then the response's \`statusText\`, with numeric status and full URL still present.

Test a failed \`text()\` in its own row though it reaches the same fallback. Empty text is a source result, while a failed read is a fault that the wrap hides on purpose.

Add a row where both body and status text are empty. Current code still makes a message that ends after the last colon and space, which is weak but true to source.

Do not invent a generic phrase such as \`Unknown error\` in the expected result. If maintainers want that improvement, it needs a production change and a new reviewed contract.

Spaces form a key edge case. Since the code checks true or false and does not trim, \`'   '\` becomes the chosen detail and gives a sparse message.

That row may lead to a trim rule later, but this test should not rewrite live acts. Baseline and desired-rule tests must have distinct names and owners.

Check that status text appears just once. Joining empty body and fallback fields can make repeated or vague output while still passing a loose part-text check.

Check the complete request URL in the same result. Empty detail increases the value of route context, especially when several tools can return the same status.

Use the [MCP integration page](/mcp) in run notes so the team can find package setup. Test checks should stay apart from a live full-path run.

MCP HTTP error detail testing treats fallback as a fixed branch, not a best-effort log. Exact input and text make small choice bugs easy to see.

## Step-by-step test implementation

Build the suite from one response factory, captured handlers, and explicit branch cases. Avoid mocking the final error helper because that would skip the behavior being verified.

1. Read \`packages/mcp/src/index.ts\` and record response handling, detail selection, message order, handler catches, and timer cleanup.
2. Create isolated response fixtures for nonempty, empty, whitespace, HTML, JSON-looking, and unreadable body variants.
3. Capture registered handlers, intercept fetch by exact URL, and expose spies for \`text\`, \`json\`, console output, and timers.
4. Execute a JSON-backed and text-backed tool, then assert the exact request, body-read count, message, MCP shape, and absent side effects.
5. Inject fallback and malformed-detail cases, verifying no exception, JSON parse, duplicate output, or unrelated state change occurs.
6. Run source and package checks in CI, retaining sanitized branch diagnostics and assigning drift to request, tool, runtime, or release ownership.

Keep the reply helper clear about \`ok\`. If the test derives it from status, that can hide live code that relies on the native Response field.

Reset fake timers and global fetch after every case. A pending timeout or shared response body can make the next test fail for reasons unrelated to detail selection.

If native Response is used, make a new value for each call. Body streams can be read once, and reuse can hit the failed-read branch by mistake.

Use the [QASkills MCP guide](/blog/qaskills-mcp-server-guide) for package invocation instructions during manual triage. The automated procedure should still require no running server or real API.

Review test names as the branch list. A lost empty, failed-read, or spaces case should stand out before code review gets to each check.

## Failure triage and regression ownership

If the numeric status is wrong, inspect the response stub first and then \`fetchWithTimeout\`. Native fetch does not reject merely because an HTTP status is non-2xx, so the wrapper owns that decision.

If the URL is absent or raw input appears instead, compare the fetch argument with the message. The MCP package owns URL construction and diagnostic inclusion, while client input owns the original slug or filters.

If status text replaces body data, check the fallback code and any new trim step. Decide if that trim was planned before you update the current baseline.

If an unreadable body exposes its stream error, inspect the local catch around \`response.text\`. That branch should erase only the read failure and retain status, URL, and status text.

If the handler rejects instead of returning \`isError\`, inspect its try and catch boundary. Request and decoding errors belong inside the tool's returned MCP error contract.

If raw HTML appears outside the content value, inspect logging and transport output. The package owns protocol-safe wrapping, while the upstream API owns the body it returned.

If acts differ on one Node build, compare native Response test rules and package engine range. The run-time owner takes it only after test inputs are proved the same.

If a built artifact differs from source, compare version and bundle contents before changing assertions. Release tooling owns stale or transformed helpers that do not match reviewed source.

The [blog index](/blog) can route maintainers to adjacent request and protocol guides. The failed test should still state branch, source detail, expected result, and first mismatch directly.

Close the bug after exact body, fallback, URL, and result-shape cases all pass. A small fix can help one error clue while it breaks the next one.

## Frequently Asked Questions

### What should an MCP non-2xx response test assert?

Assert the exact requested URL, numeric status, selected detail, single body read, and returned \`isError: true\` object. Also verify JSON decoding never runs for a failed response. Together, these checks prove useful context survives without allowing an exception to leave the tool handler.

### When should HTTP statusText fallback be used?

Current code uses status text only when response text is an empty string or when reading that text rejects and becomes empty. It does not trim whitespace first. Tests should keep empty, unreadable, and whitespace bodies separate because they reach different observable detail choices.

### Does API error body preservation parse JSON errors?

No. Non-2xx bodies are read as text and inserted into the request error message without JSON conversion. A JSON-looking fixture should therefore preserve its original spacing and field order. Parsing assertions would describe behavior that the current request wrapper does not perform.

### Why include the complete URL in MCP errors?

The URL identifies the exact route, encoded path value, and query filters that produced a status. That context separates otherwise identical failures from several tools. Tests should compare the URL actually passed to fetch rather than reconstructing another value from raw handler arguments.

### What if both body and statusText are empty?

Current source still returns a structured MCP error containing status and URL, with no useful detail after the final separator. Characterize that result exactly instead of inventing fallback wording. A better default message would require an explicit production change and revised tests.

## Conclusion

MCP HTTP error detail testing binds every failed response to four observations: status, actual request URL, selected body or fallback detail, and a structured MCP error result. Exact branch fixtures prevent empty text, rejected reads, whitespace, or HTML from hiding diagnostic drift.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills in the [skills directory](/skills). Use the [MCP server testing guide](/blog/mcp-server-testing-guide-2026) as this reply matrix blocks lost context or escaped request errors.`,
};
