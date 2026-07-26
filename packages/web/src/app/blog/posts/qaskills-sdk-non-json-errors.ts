import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills SDK non JSON errors',
  description:
    'QASkills SDK non JSON errors: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills SDK non JSON errors',
  keywords: [
    'QASkills SDK non JSON errors',
    'QASkills SDK error parsing',
    'fetch response json failure',
    'SDK statusText fallback',
    'HTML error response test',
    'empty API error body',
    'malformed JSON SDK response',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'typescript-testing-patterns-guide',
    'authentication-authorization-testing-guide',
    'testing-cursor-pagination-api-boundaries',
  ],
  sources: [
    'https://fetch.spec.whatwg.org/',
    'https://www.rfc-editor.org/info/rfc9110',
    'https://www.rfc-editor.org/info/rfc8259',
  ],
  repoEvidence: [
    'packages/sdk/src/index.ts#QASkillsClient.request',
    'packages/sdk/src/index.ts#QASkillsClient.skills.get',
    'packages/sdk/src/index.ts#QASkillsClient.skills.create',
    'packages/sdk/src/index.ts#QASkillsClient.reviews.submit',
  ],
  content: `QASkills SDK non JSON errors use the failed response's \`statusText\` when \`res.json()\` rejects on HTML, plain text, malformed JSON, or an empty body; the client then throws \`QASkills API error: <statusText>\`. A valid JSON object with a truthy \`error\` property takes precedence over that fallback.

## What does QASkills SDK non JSON errors guarantee?

QASkills SDK non JSON errors guarantee a consistent SDK error prefix when an HTTP response is unsuccessful but its body cannot be parsed as JSON. The private request helper catches only the JSON parsing rejection, creates \`{ error: res.statusText }\`, and throws an Error using that fallback value.

The behavior is implemented by \`QASkillsClient.request\` in \`packages/sdk/src/index.ts\`. Every SDK group calls this helper, including \`skills.get\`, \`skills.create\`, \`reviews.submit\`, category listing, and leaderboard retrieval.

This contract begins after fetch returns a Response with \`ok === false\`, and network rejection is not caught by the helper, so the original fetch rejection escapes. A successful response follows a separate \`res.json()\` path whose parsing failure also escapes without the QASkills API prefix.

The [Fetch Standard](https://fetch.spec.whatwg.org/) defines response status and body consumption behavior, while QASkills adds its own message selection after the response arrives. Tests should control both \`ok\` and the outcome of \`json()\`.

The fallback does not copy HTML or plain text into the thrown message and never calls \`res.text()\` on this SDK path. This keeps a proxy page out of the error message, but it also means useful plain-text API diagnostics are replaced by status text.

The [FAQ](/faq) provides user-facing product answers, and the [getting started guide](/getting-started) covers normal SDK access. Error parsing tests should remain local and should not force public endpoints to emit malformed content.

QASkills SDK non JSON errors are narrower than CLI transport errors, since the CLI client reads failed response text while the SDK attempts JSON and falls back to \`statusText\`. Do not reuse one component's expected message for the other.

## How does QASkills SDK error parsing work?

QASkills SDK error parsing first builds JSON headers and adds an Authorization header when an API key exists. It calls fetch with \`\${this.baseUrl}\${path}\`, passing the request options and merged headers.

After a response, the helper checks \`res.ok\`, with successful responses returning \`res.json()\`. Failed responses enter a compact branch that tries JSON, catches parser rejection, and chooses a message.

\`\`\`typescript
const res = await fetch(\`\${this.baseUrl}\${path}\`, { ...options, headers });

if (!res.ok) {
  const error = await res.json().catch(() => ({ error: res.statusText }));
  throw new Error(\`QASkills API error: \${error.error || res.statusText}\`);
}

return res.json();
\`\`\`

When failed JSON is an object such as \`{ "error": "Skill not found" }\`, that truthy property becomes the suffix; when the object is empty, its \`error\` is undefined and \`statusText\` wins. An empty error string also falls through because the expression uses logical OR.

HTML, plain text, malformed JSON, and an empty body all make a normal Response object's \`json()\` reject, and the catch returns an object whose error property already equals \`statusText\`. The final logical OR then selects the same text.

The JSON syntax and data model are specified by [RFC 8259](https://www.rfc-editor.org/info/rfc8259), but a test does not need a full JSON parser fixture. One valid object and several invalid body forms are enough to prove the SDK branch.

A valid JSON primitive exposes another current boundary, since strings, numbers, booleans, and arrays do not provide a useful \`error\` property, so status text normally wins. A parsed \`null\` value is different because accessing \`error.error\` can throw a TypeError.

Record the null behavior as a characterization test rather than claiming the fallback handles every valid JSON value. A future implementation may safely narrow the parsed value before reading its property.

QASkills SDK non JSON errors should be asserted through public methods because \`request\` is private. Calling \`client.skills.get('fixture')\` provides a simple GET path with no request body.

The [error handling testing guide](/blog/error-handling-testing-patterns) explains layered fault design. This SDK suite should keep JSON parsing, message choice, network rejection, and successful parsing in distinct cases.

## Which cases define fetch response json failure?

A fetch response json failure matrix should vary body shape while keeping the same failing status and status text, which isolates parser behavior. Use a 502 fixture with \`statusText: 'Bad Gateway'\` for HTML, plain text, malformed JSON, and empty body rows.

For HTML, return a body such as \`<html><body>proxy error</body></html>\` and an HTML content type. Native \`Response.json()\` rejects because the bytes do not form JSON. The expected SDK message is \`QASkills API error: Bad Gateway\`.

For plain text, use \`upstream unavailable\`. The expected result is identical because this helper does not inspect \`Content-Type\` or call \`text()\`. Assert that body text is absent from the final error to document current behavior.

Malformed JSON can use \`{"error":\` as a truncated object. It differs from plain text semantically but reaches the same catch. This case protects against code that later assumes an application/json header guarantees valid syntax.

An empty body also rejects JSON parsing. Construct a Response with null or empty body, a failed status, and explicit status text. The expected fallback remains status text, not an empty suffix.

Then add two valid JSON controls. \`{ "error": "Denied by policy" }\` should produce that application message. \`{}\` should produce status text. These controls prove the catch is responding to parse outcome rather than every failed status.

The HTTP semantics specification in [RFC 9110](https://www.rfc-editor.org/info/rfc9110) defines status codes and reason phrases. Browser and server implementations may provide an empty \`statusText\`, so a separate case should record the resulting bare prefix when no JSON error exists.

Call \`skills.get\` for the common matrix, then sample \`skills.create\` and \`reviews.submit\` once. Since all routes share the same private helper, duplicating every body variant for every public method adds volume without new branch coverage.

The [skills directory](/skills) can supply a readable fixture slug for manual smoke work. Unit tests should use a synthetic name because only URL construction and error handling matter.

## SDK statusText fallback and the current QASkills contract

SDK statusText fallback is the second choice after a truthy parsed \`error\` property. It is also the value inserted by the JSON catch. The final Error always starts with \`QASkills API error: \` when this branch completes normally.

No status code appears in the message. A 404 and a 502 with the same \`statusText\` produce the same suffix unless their JSON bodies provide distinct errors. Tests should not expect numeric status data that the implementation omits.

The response body is consumed by \`json()\` once. After that method rejects, the helper does not attempt text parsing. A test should not inspect the same Response body afterward as proof of what the client could read.

The client constructor stores \`config.baseUrl || 'https://qaskills.sh'\`. It does not trim a final slash. Public paths begin with a slash, so a configured base ending in one slash creates a double-slash textual URL through string concatenation.

That URL behavior is adjacent but outside this article's error-body boundary. Use a slash-free test origin so endpoint formatting does not distract from message selection. Endpoint normalization belongs in a separate SDK configuration test.

Authorization is conditional. With an API key, the request receives \`Bearer <key>\`; without one, no Authorization header is added. Error parsing remains the same. One create or review case can assert headers while reusing the malformed response fixture.

\`skills.create\` serializes its input with \`JSON.stringify\` and uses POST. \`reviews.submit\` does the same for review data. Their bodies are sent before the failed response is processed, so the test can assert method and body without changing the fallback oracle.

QASkills SDK non JSON errors do not include response headers, request IDs, or body excerpts. Avoid inventing these details in expected errors. If diagnostics are expanded later, add them as a reviewed SDK contract.

The [TypeScript testing patterns guide](/blog/typescript-testing-patterns-guide) covers typed fixtures and mock reset practices. The key oracle here remains one exact Error message plus one captured request.

## How do you test HTML error response test?

An HTML error response test should invoke a public SDK method with global fetch replaced by one controlled Response. A genuine Response object provides realistic \`ok\`, \`statusText\`, and \`json()\` behavior without running a server.

Follow this procedure:

1. Save global fetch and create a new \`QASkillsClient\` with a slash-free local base URL.
2. Return a failed Response containing HTML, an explicit status, and \`statusText\`.
3. Call \`skills.get\` and assert the exact rejected Error message.
4. Repeat with valid JSON, plain text, malformed JSON, empty content, and parsed null.
5. Restore fetch after every case and prove no mock calls leak between rows.

Use \`await expect(promise).rejects.toThrow(new Error(...))\` or compare the captured Error message. The exact constructor stack is not part of the contract. Avoid snapshots because runtime stack paths differ across environments.

\`\`\`typescript
it('uses statusText when a failed response contains HTML', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('<html>gateway failure</html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'text/html' },
      }),
    ),
  );

  const client = new QASkillsClient({ baseUrl: 'https://api.example.test' });
  await expect(client.skills.get('fixture')).rejects.toThrow(
    'QASkills API error: Bad Gateway',
  );
});
\`\`\`

Also inspect the fetch call. \`skills.get('fixture')\` should request \`https://api.example.test/api/skills/fixture\` with JSON headers. This proves the expected public method reached the shared request path.

For a valid JSON control, use a Response with \`JSON.stringify({ error: 'Fixture denied' })\`. Expect the application text rather than status text. This ensures a refactor cannot apply fallback unconditionally.

For parsed null, a custom response object whose \`json\` resolves null makes the current TypeError deterministic. Label the case as current behavior and decide whether the desired contract should instead use status text.

QASkills SDK non JSON errors need no timers or filesystem cleanup. Global fetch restoration is still mandatory because a leaked mock can make unrelated SDK tests pass against the wrong response.

## empty API error body failure and edge-case matrix

An empty API error body belongs beside invalid JSON because both reject \`json()\` on a normal Response. The table below separates body parsing from status selection and public route wiring.

| Body case | Mock response | Thrown error | Wrong outcome | Shared caller |
|---|---|---|---|---|
| QASkills SDK error parsing | Failed JSON object with truthy \`error\` | Application error follows SDK prefix | Status text replaces valid error | \`packages/sdk/src/index.ts\` request |
| fetch response json failure | HTML, text, malformed JSON, or empty body | Status text follows SDK prefix | Parser rejection escapes unwrapped | \`packages/sdk/src/index.ts\` skills.get |
| HTML error response test | Failed create request with proxy page | Same fallback after POST request | Body text leaks or request shape changes | \`packages/sdk/src/index.ts\` skills.create |
| malformed JSON SDK response | Failed review request with truncated JSON | Same fallback through shared helper | Route-specific parsing behavior diverges | \`packages/sdk/src/index.ts\` reviews.submit |

Add an empty \`statusText\` row. If JSON parsing fails and status text is empty, the resulting message ends after the prefix and space. That is weak diagnostic content, but it accurately reflects the current expression.

Add valid JSON with \`error: ''\`, \`error: 0\`, and no error property. Each falsy value chooses status text. A truthy non-string value is interpolated through the template literal, so tests can record current coercion without endorsing it.

Parsed null is the notable containment gap. The JSON promise resolves, so the catch does not run, and property access can fail before the intended Error is constructed. Keep this row visible if the team plans a defensive type check.

A rejected fetch promise never produces a Response and therefore never enters this matrix. Assert that its original Error identity or message escapes. This prevents a broad catch from being assumed where none exists.

A successful response with invalid JSON is also outside the failed-response fallback. The final \`return res.json()\` rejects directly. Include one separate boundary test so maintainers do not generalize failed-body behavior to all responses.

The [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) can inform API-key cases. Do not require an actual token for parser tests; a synthetic value is enough to inspect header construction.

## How should malformed JSON SDK response run in CI?

A malformed JSON SDK response suite should run with ordinary SDK unit tests. It has no external services, database, or browser requirement. Native Response objects and a fetch mock provide all required behavior.

Use a data table for invalid body forms and a separate table for valid JSON values. This keeps parser failures distinct from logical fallback values. Every row should state status, status text, body, public method, and expected error.

Run one row through \`skills.get\`, one through \`skills.create\`, and one through \`reviews.submit\`. Most body variants can use GET because the private branch is shared. Route samples prove all groups retain the same helper wiring.

Do not mock \`QASkillsClient.request\` because it is the implementation under test. Mock only fetch or provide a loopback server for one integration case. A private-method mock would approve the expected result without executing JSON fallback.

QASkills SDK non JSON errors should compare exact message text, including the prefix. That string is the public diagnostic consumers may display or classify. Stack traces and source line numbers are not stable assertions.

Restore fetch in \`afterEach\` and clear call history. Construct a new client per row so base URL and API key cannot leak. No retries should wrap deterministic local responses.

Add the suite to pull-request CI for changes under \`packages/sdk/src\`. Run TypeScript compilation first, then unit tests. A separate post-deployment smoke check can verify one normal JSON error from a controlled endpoint.

The [cursor pagination boundary article](/blog/testing-cursor-pagination-api-boundaries) demonstrates another SDK contract style. Keep malformed body checks focused on errors rather than successful pagination payloads.

## Implementation checklist for QASkills SDK non JSON errors

Begin with one valid error object and four invalid body forms: HTML, plain text, truncated JSON, and empty content. Use the same status text so only parsing changes. Assert the exact SDK prefix and suffix.

Use \`packages/sdk/src/index.ts\` as evidence for \`QASkillsClient.request\`, \`QASkillsClient.skills.get\`, \`QASkillsClient.skills.create\`, and \`QASkillsClient.reviews.submit\`. These paths prove both the shared branch and representative callers.

Add empty error, missing error, empty status text, and parsed null cases. Mark null as current behavior if it throws a TypeError. Avoid presenting a proposed object guard as code that already exists.

Separate network rejection and successful invalid JSON into boundary tests. Their errors escape without the failed-response prefix because they do not complete the same branch.

Cite Fetch for response handling, RFC 9110 for HTTP semantics, and RFC 8259 for JSON. Keep QASkills-specific message selection tied to repository code.

Inspect the [skills page](/skills) only for a manual stable route and use [getting started](/getting-started) for SDK setup. Automated malformed-response fixtures should never contact production.

Build the first table with one fixed status and one fixed phrase, then change only the body bytes from row to row. This makes a bad parse branch easy to spot because no route, status, or client field shifts at the same time.

Use short body text that states its shape, such as one HTML tag, one plain word, one cut JSON object, and no bytes. The test should not need a large proxy page to prove that JSON parsing fails.

For each invalid row, compare both the Error class and its full message, then check that the bad body text is not there. This records the current choice to use status text without making claims about logs outside the SDK.

Give the valid error row a phrase unlike the status text, so the chosen source is clear at a glance. A phrase such as \`Rule blocked\` next to \`Bad Gateway\` will expose an accidental switch with one failed line.

Give the empty object row the same status as that control and expect status text, since no truthy error value exists. Add empty string, zero, and false rows only if the team wants to lock the current logical OR rule.

Keep the parsed null row by itself and name the TypeError in its current result note. This row should not share the normal fallback table because its JSON parse succeeds before property access fails.

For the network row, reject fetch with one owned Error object and assert that same object leaves the client. This proves the request helper does not turn a missing Response into a QASkills API message.

For the successful bad-body row, return status 200 with text and expect the JSON parse rejection from the final return path. The failed-response prefix should be absent because \`res.ok\` kept the call out of the fallback branch.

Run the shared body table through \`skills.get\`, then use one HTML row for create and one cut JSON row for review. These samples show public groups share the helper without copying every body case across each method.

Inspect POST calls for method, JSON body, content type, and optional bearer header before checking the returned Error. A wrong request can still receive the planned fake response, so message proof alone cannot show full public wiring.

Create a new client for each row and use a base with no final slash, since URL join rules are not the subject here. This keeps one malformed response from being paired with an unrelated double-slash request.

Restore global fetch in a final hook and also clear any call list kept by the test tool. One leaked rejected response can make the next SDK suite pass for the wrong reason and waste time in review.

Keep test names in the form "uses status text when failed body is HTML" or "uses JSON error when it is truthy." Those names state the input and rule, while a broad name such as "handles errors" gives little help.

If the SDK later reads plain response text, change the expected row and add a safe length or redaction rule at the same time. Raw proxy pages can be large or private, so new diagnostics need a clear trust rule.

If status code is later added to the message, update all body rows together because that prefix is shared. Leave network and success-parse rows separate, since they still may not use the same wrapped Error.

The [error handling guide](/blog/error-handling-testing-patterns) can help reviewers keep each fault at one layer. The article's gate should still use the exact SDK source as its final rule for text and branch choice.

Read the failed table from top to bottom after each request-helper edit and confirm one cause changed in each row. This simple pass keeps QASkills SDK non JSON errors clear when fetch, JSON, and API work move in the same release.

Put each fake Response in the row that uses it, rather than sharing one body stream across tests. A Response body can be read once, so a shared object may fail on the next row for the wrong cause.

Set the status phrase by hand on each failed Response because test hosts may not fill it from the code alone. The expected SDK text should come from the row, not from a guess made by the local runtime.

For HTML and plain text, set a matching content type even though source code does not check it. This keeps the fake close to a real proxy reply while the test still proves that body parse, not header text, drives fallback.

For cut JSON, use a body that starts like an error object but lacks its end quote or brace. The row should prove that a JSON-looking content type cannot turn bad bytes into a valid app error.

For no body, test both null input and an empty string if the host Response treats them in distinct ways. Match the result from \`json()\` first, then compare the SDK Error so the cause stays clear.

For the valid error object, use a short string and make sure the status phrase does not appear in the final text. This is the key control that proves the parser result wins when its error field is true.

For the empty object, make sure the status phrase does appear and that no word such as undefined leaks into the Error. That row guards the logical OR rule after a parse that did not throw.

For the null case, check the current TypeError apart from the normal API prefix and link it to a tracked fix if one is planned. Do not mark it as a safe fallback until source code tests the parsed value.

For the POST rows, decode the saved request body and compare plain fields rather than one raw JSON string. Field checks can stay true when harmless key order changes, while the malformed response still tests the shared error path.

For the no-key GET row, assert that Authorization is absent, and for one create row assert the bearer value is present. These checks show header setup reached fetch before the same bad body went through its parse rule.

Read the [TypeScript test guide](/blog/typescript-testing-patterns-guide) when the mock needs typed helpers, but keep the response rows clear to a reader who knows fetch. A small table of body, status phrase, and expected Error is enough for this gate.

After all rows pass, restore fetch and run one unrelated client test that returns valid JSON. This quick guard proves the bad-body table did not leave a global mock that can poison the rest of the SDK job.

QASkills SDK non JSON errors pass when each invalid failed body selects status text and each truthy JSON error wins. Network, success-parse, and parsed-null boundaries must also stay named as different results.

## Frequently Asked Questions

### What does QASkills SDK error parsing verify in QASkills?

It verifies that unsuccessful responses produce the SDK's public error prefix and choose a message from parsed JSON or \`statusText\`. The test should control body parsing directly. It should also keep network failures and successful response parsing outside this failed-response branch.

### When should a team test fetch response json failure?

Test it whenever the SDK request helper, fetch wrapper, API error format, or supported runtime changes in the package. Include HTML, plain text, truncated JSON, empty content, and a valid JSON control. Proxy and gateway changes make these cases especially useful.

### How can a fixture isolate SDK statusText fallback?

Return a native failed Response with explicit \`statusText\` and a body that cannot parse as JSON. Invoke one public client method and compare the exact rejected message. Restore global fetch afterward, and avoid a live server unless one integration row needs it.

### Which assertion proves HTML error response test?

Assert that a failed HTML Response rejects with \`QASkills API error: Bad Gateway\` while excluding the HTML text. Also inspect the requested URL and headers. This proves both public method wiring and the parser catch without relying on private method access.

### What failure cases belong in empty API error body tests?

Cover null or empty bytes, empty status text, valid empty objects, falsy error values, parsed null, network rejection, and successful invalid JSON. These cases reach different expressions, so expected diagnostics should identify whether fallback, TypeError, or original parsing rejection occurs.

### How should CI run malformed JSON SDK response checks?

Run fast fetch-mock tests in the SDK package on every relevant change. Use native Response objects, new clients per row, exact message assertions, and guaranteed mock restoration. Add one loopback check only if runtime integration needs confirmation, while keeping production endpoints outside deterministic CI.

## Conclusion

QASkills SDK non JSON errors have a concise current contract. For an unsuccessful response, the client attempts JSON first. Invalid JSON becomes a fallback object using \`statusText\`, while a truthy parsed \`error\` property takes priority.

Reliable tests must preserve the boundaries around that branch. Network rejection, successful invalid JSON, parsed null, and plain-text diagnostics do not all receive the same handling, and the article should not merge them into one promise.

Open the [skills catalog](/skills) to choose a stable route name, then implement the SDK contract test described in this guide. Add the invalid-body table and valid JSON controls before changing request error handling.`,
};
