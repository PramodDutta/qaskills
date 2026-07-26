import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP missing skill error mapping',
  description:
    'MCP missing skill error mapping guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP missing skill error mapping',
  keywords: [
    'MCP missing skill error mapping',
    'MCP get skill 404',
    'install missing skill error',
    'MCP HTTP status mapping',
    'skill not found tool result',
    'MCP error text stability',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'testing-agent-plan-recovery-after-tool-failure',
    'qaskills-mcp-server-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://developer.mozilla.org/en-US/docs/Web/API/Response',
    'https://www.jsonrpc.org/specification',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/[id]/route.ts',
    'packages/mcp/src/index.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP missing skill error mapping should turn every slug lookup 404 into an MCP result with \`isError: true\`, the numeric status, and the API body. Success means all three tools preserve useful detail without rejecting or writing files. A crash, lost \`Skill not found\` text, or new install directory disproves the contract.

## What must MCP missing skill error mapping prove?

MCP missing skill error mapping must prove that \`get_skill\`, \`get_skill_content\`, and \`install_skill\` translate the same missing slug consistently. Each handler should return one text error, retain status 404 and body detail, and complete without an uncaught rejection.

The observable contract starts at the web response and ends at the tool result. For install, it also includes the absence of a directory, \`SKILL.md\`, and telemetry request after content retrieval fails.

A stable result does not require every character to be identical across endpoints. It requires the common status, useful body phrase, protocol error flag, and tool-specific side-effect rule to remain dependable.

The test boundary is narrow on purpose. It does not cover malformed success JSON, request timeouts, or general client recovery, which belong in the [MCP contract testing guide](/blog/mcp-server-contract-testing-guide).

Use controlled response fixtures instead of a live catalog slug. A supposedly missing public slug can appear later, while a local fixture always proves the same branch and produces a clear diff.

MCP missing skill error mapping should also distinguish a tool error from a JSON-RPC transport error. The handler catches an HTTP failure and returns valid tool content, rather than breaking the request channel.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines tool results and their error indication. The QASkills test should then add exact product rules for status detail and filesystem safety.

A useful release oracle names the tool, requested path, response status, selected body detail, returned flag, and first changed file. That compact record explains both success and failure without retaining unrelated response data.

## Which repository behavior defines the contract?

The metadata route in \`packages/web/src/app/api/skills/[id]/route.ts\` reads either a UUID or slug and limits the query to one row. When no row exists, it returns JSON containing \`Skill not found\` with HTTP status 404.

The content route follows the same missing-row rule for ordinary slugs. The special fallback for one known slug does not change the controlled missing-slug fixture used by this contract.

In \`packages/mcp/src/index.ts\`, \`get_skill\` calls the metadata endpoint through \`getJson\`. The content and install handlers call the content endpoint through \`getText\`, so all three requests pass through \`fetchWithTimeout\`.

That helper checks \`response.ok\` before decoding successful data. On failure, it reads the body as text, chooses that body or \`statusText\`, and throws an error containing status, URL, and selected detail.

The [Response reference](https://developer.mozilla.org/en-US/docs/Web/API/Response) explains the \`ok\`, \`status\`, \`statusText\`, and body methods used at this boundary. Tests should model those standard properties instead of inventing a custom response shape.

Each slug handler has its own \`try\` and \`catch\`. The catch calls \`errorResult\`, which returns one text content item prefixed with \`Error: \` and sets \`isError: true\`.

The order matters for \`install_skill\`. It downloads content before reading the current directory choice, making a folder, writing \`SKILL.md\`, or calling install telemetry.

That order creates a strong negative oracle. If the content request returns 404, no local write method and no telemetry POST should run, regardless of whether the project contains an agent directory.

The package metadata in \`packages/mcp/package.json\` identifies the shipped MCP package, its Node engine, and its SDK dependency. Include its version in diagnostics because a built package may differ from a local source run.

MCP missing skill error mapping is therefore a composed repository contract, not an HTTP rule alone. The web layer owns status and body, while the MCP layer owns detail preservation, result shape, and side-effect suppression.

The [JSON-RPC specification](https://www.jsonrpc.org/specification) helps separate request-channel errors from application tool results. A missing catalog item should not corrupt message IDs, stdout framing, or the server process.

## How should QA teams test MCP get skill 404?

An MCP get skill 404 test should capture the live registered handler and return a real \`Response\` fixture from mocked \`fetch\`. The fixture needs status 404, a JSON body with \`Skill not found\`, and a stable requested base URL.

Load the module only after replacing the SDK server registration and stdio transport boundaries. This setup records handlers without opening a real transport or allowing the module's startup path to keep a test process alive.

Give every case a slug such as \`missing-contract-fixture\`. Assert the encoded slug in the request URL so a path-building regression cannot pass merely because the mock responds to every address.

The metadata case should check one GET, no request body, and the package user-agent header. Its result should have exactly one text item, type \`text\`, useful status and body detail, plus \`isError: true\`.

Do not assert only that the text contains \`404\`. That weak check passes if the body disappears, the URL is wrong, or the handler adds a misleading success item beside the error.

Run matching cases for content and install with the same response factory. This shared input makes differences in returned text attributable to handler behavior rather than fixture drift.

For install, spy on \`mkdir\`, \`writeFile\`, and any POST request. Snapshot the temporary project before and after execution, then prove its complete tree and file hashes remain equal.

Keep the temporary root unique per test and restore \`cwd\`, environment variables, fetch, and timers afterward. Isolation prevents one install case from creating a directory that makes the next case look successful.

This focused check complements the [tool failure recovery article](/blog/testing-agent-plan-recovery-after-tool-failure), which covers what a client does after a returned error. Here, the server result itself remains the only product under test.

MCP missing skill error mapping passes only when all three tool promises resolve normally with error results. Add a rejection assertion around each handler so a thrown error cannot be mistaken for expected negative behavior.

Give the fake one strict route map for all three calls. A wrong path must fail the test at once, not get the same canned 404 by chance.

Save each call in a small log with the tool name and path. The log should show one call per tool and no stray call after the fault.

Check the body as plain text at the fetch edge and as tool text at the far edge. This proves the same key words make the full trip through both layers.

The [MCP page](/mcp) lists the three slug tools for a quick scope check. Keep the test names tied to those tool names, so a new tool does not slip in by guess.

## Test matrix for install missing skill error

An install missing skill error needs both protocol and filesystem observations. The result can look correct while a folder remains behind, so every row pairs returned content with an unchanged-state check.

Use one response factory for positive missing cases and separate factories for body-read failure or empty detail. This split reveals the fallback to \`statusText\` without changing production code.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| MCP get skill 404 | Metadata GET returns \`{"error":"Skill not found"}\` | One error item includes 404, URL, and body | Promise rejects or body detail disappears | \`packages/web/src/app/api/skills/[id]/route.ts\` |
| Metadata UUID boundary | Missing UUID-shaped identifier | Same 404 contract and no success fields | Query shape changes the tool error | \`packages/web/src/app/api/skills/[id]/route.ts\` |
| Content lookup missing | Content GET returns the same 404 JSON | Text result has \`isError: true\` | Raw response is treated as skill text | \`packages/mcp/src/index.ts\` |
| Install missing skill error | Download returns 404 before local work | Error result and unchanged temp tree | \`mkdir\`, \`writeFile\`, or POST occurs | \`packages/mcp/src/index.ts\` |
| Repeated missing install | Same failed install runs twice | Both errors match and tree stays equal | Retry leaves a partial directory | \`packages/mcp/src/index.ts\` |
| MCP HTTP status mapping | Status 404 has body detail | Numeric status and body both survive | Generic error replaces either fact | MDN Response reference |
| Empty response body | Status text is \`Not Found\` | Detail falls back to status text | Error ends after the request URL | \`packages/mcp/src/index.ts\` |
| Body reader rejects | \`text()\` rejects while status is 404 | Status remains and fallback detail is used | Body-read failure escapes the handler | \`packages/mcp/src/index.ts\` |
| Skill not found tool result | All three captured handlers receive one fixture | Every result has the common error shape | One tool returns success or throws | MCP tools specification |
| MCP error text stability | Same fixture runs before and after build | Normalized contract fields remain equal | Prefix, status, or body phrase drifts | \`packages/mcp/package.json\` |

The body-reader row follows the current helper carefully. Its caught body read yields an empty string, so the helper selects the response status text before building its error.

Repeated failure matters because cleanup bugs often appear after a retry. Compare the full tree after each call rather than deleting the fixture between calls and hiding residue.

The table does not demand an exact absolute URL across every environment. Assert the configured base and encoded path separately, then normalize only the temporary root or test port.

MCP missing skill error mapping should keep the status number exact. A broad \`toContain("not found")\` check cannot detect an accidental 400, 410, or 500 mapping.

## What failures expose MCP HTTP status mapping?

MCP HTTP status mapping fails when one layer changes the observed meaning of the response. The clearest signals are a missing numeric status, missing body detail, an uncaught rejection, a false success result, or filesystem work after a failed download.

Start with mutation-style fixture changes rather than edits to production. Return 400 with the same body, 404 with another body, and 500 with an empty body to prove each asserted field has independent value.

Change the mock to reject before a response exists. That network error should still become \`isError: true\`, but it should not be mislabeled as a 404 or claim a body that never arrived.

Then make \`response.text()\` reject. The helper intentionally catches that read failure, so status text should provide detail and the tool handler should still resolve normally.

The positive contract can be expressed with captured handlers and one reusable response builder. The undefined helpers below belong to the test harness, while the expected shape mirrors \`packages/mcp/src/index.ts\`.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it.each(['get_skill', 'get_skill_content', 'install_skill'])(
  'maps a missing slug through %s',
  async (toolName) => {
    const tools = await captureRegisteredTools();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Skill not found' }), {
        status: 404,
        statusText: 'Not Found',
      }),
    );

    const before = await snapshotTree(testRoot);
    const result = await tools.get(toolName)!.handler({
      slug: 'missing-contract-fixture',
      agent: 'codex',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringMatching(
            /^Error: API request failed with status 404 .*Skill not found/,
          ),
        },
      ],
      isError: true,
    });
    expect(await snapshotTree(testRoot)).toEqual(before);
    expect(observedPostRequests()).toEqual([]);
  },
);
\`\`\`

The exact text matcher anchors the prefix while allowing the configured host to vary. A separate URL assertion should still verify the metadata or content route chosen for each tool.

Add spies that throw if local writes occur after the 404. A test that merely compares an empty final tree could miss a create-and-delete sequence, which still violates the intended ordering.

Keep stdout capture active during a subprocess variant. Any diagnostic text outside protocol frames is a separate release failure, even if the returned tool result has the right message.

Use the [QASkills MCP page](/mcp) to confirm the intended public tool surface, but never use page copy as the result oracle. Repository source and controlled runtime output remain the authoritative product evidence.

## CI coverage for skill not found tool result

A skill not found tool result suite should run at both handler and packaged-process levels. Handler tests isolate result construction, while one stdio smoke case proves the built entry point preserves framing and process health.

Keep all network access denied by default in CI. The fake fetch layer should reject any method, URL, or call count that a case did not declare in advance.

Run the package tests with a new temporary working directory and telemetry disabled unless the case explicitly observes POST suppression. Even with telemetry enabled, the missing download should prevent a tracking request.

Set a harness timeout below the production ten-second request timeout. A missing mock should fail quickly with the pending tool name, rather than spending the whole job waiting for an abort.

Capture request method, safe URL, status, selected body detail, returned shape, write calls, and final tree hash. Do not retain arbitrary remote bodies because controlled fixtures already provide enough evidence.

Block release when any slug tool throws, loses status or detail, returns success, writes locally, or emits invalid stdout. A changed test-report layout may remain diagnostic only when every contract field still passes.

Use a focused command for MCP package tests, then run the factory's normal build checks. The [getting started page](/getting-started) can guide manual setup, but CI should invoke repository scripts without interactive steps.

Trigger the focused job after changes to the web skill routes, MCP fetch helper, any slug handler, package SDK version, or bundling setup. Those paths can alter the contract even when a tool registration line remains untouched.

Retain a compact JSON artifact only for failed cases. Include package version from \`packages/mcp/package.json\`, Node version, tool name, response facts, result facts, and filesystem diff.

MCP missing skill error mapping should run once against source and once against the built package before release. A source-only pass cannot detect stale output or an entry-point bundling error.

Keep the failed log short enough to read in one CI view. Show the first bad field, then add the raw safe frame and tree hash below it.

Run the three tool cases in one job but give each case its own root. This keeps the job fast while a stray file can still point back to one test.

When the suite fails, rerun just that row with the same fixed body. The [skills list](/skills) is useful for a later smoke run, but it must not alter this proof.

Have a reviewer read both the pass rule and the fail rule before merge. A check that can never fail on a wrong body gives no aid, even when it runs fast.

## How should MCP error text stability be asserted?

MCP error text stability should protect meaningful fields without freezing incidental values. Assert the \`Error: \` prefix, 404 status, encoded endpoint path, \`Skill not found\` phrase, single content item, and true error flag.

Avoid one full snapshot containing an absolute host, temporary directory, stack trace, or package manager path. Such snapshots change for unrelated reasons and teach maintainers to approve broad updates without reading them.

Assert order where it carries meaning. Status should appear before URL and body detail because that sequence follows the helper's current diagnostic format and supports quick log scanning.

Assert absence as directly as presence. The result must have no second content item, no success sentence, no \`structuredContent\`, and no handler rejection.

The install case needs unchanged-state guarantees around each asynchronous edge. Verify content fetch finishes as failure before any directory check can lead to \`mkdir\`, file writes, or telemetry.

The next example forces three distinct regressions and keeps their messages separate. It uses spies at boundaries already imported or called by \`packages/mcp/src/index.ts\`, rather than adding test-only production exports.

\`\`\`typescript
it('keeps 404 detail stable and performs no install effects', async () => {
  const tools = await captureRegisteredTools();
  fetchMock.mockResolvedValueOnce(
    response404({ error: 'Skill not found' }),
  );

  const result = await tools.get('install_skill')!.handler({
    slug: 'missing-contract-fixture',
    agent: 'claude-code',
  });

  expect(result.isError).toBe(true);
  expect(result.content).toHaveLength(1);
  expect(result.content[0].text).toMatch(
    /^Error: API request failed with status 404 /,
  );
  expect(result.content[0].text).toContain('Skill not found');
  expect(mkdirSpy).not.toHaveBeenCalled();
  expect(writeFileSpy).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
\`\`\`

If the body changes to structured JSON later, update the API contract and MCP assertions together. Do not loosen the check to any nonempty text, because that would stop proving useful missing-item detail.

Normalize only values declared variable by the harness. For example, replace the test origin before comparison, but keep status, path, body phrase, item count, and error flag exact.

Compare all three normalized results in one final assertion. A tool-specific mismatch should print its tool name and differing field, not one large multiline snapshot.

MCP missing skill error mapping becomes actionable when a failed assertion names ownership. A body phrase mismatch points toward the web route, while a result shape mismatch points toward the MCP handler or SDK boundary.

## Step-by-step test implementation

Implement the suite from the web response toward the filesystem. This sequence keeps each oracle tied to a real branch and prevents a mock-heavy harness from defining its own product.

1. Read \`packages/web/src/app/api/skills/[id]/route.ts\` and record the exact missing-row status and body without changing production behavior.
2. Capture the three registered slug handlers from \`packages/mcp/src/index.ts\`, while replacing stdio startup with a harmless test transport.
3. Return the same controlled 404 fixture for metadata and content URLs, then log every request, result, write call, and process event.
4. Execute \`get_skill\`, \`get_skill_content\`, and \`install_skill\`, and assert resolved error results with status and body detail.
5. Inject empty bodies, body-read failures, network rejection, repeated calls, and write spies that fail on any premature local effect.
6. Run source and built-package cases in CI, retain compact failed diagnostics, and route each mismatch to its owning repository layer.

Build the response helper with standard \`Response\` objects where the runtime supports them. That approach exercises \`ok\`, status fields, and body consumption closer to production than a loose object literal.

Reset modules between registration captures because the server instance is created at import time. Also restore the original working directory and environment after every test, even when an assertion fails.

Keep one fixture for each intended distinction rather than many cosmetic variants. A status change, body change, read failure, network failure, and repeated install together cover the important decision branches.

Use the [skills directory](/skills) only for an optional staging smoke check after controlled tests pass. Never make a public catalog entry the required CI fixture.

MCP missing skill error mapping is complete when the suite proves returned shape, retained detail, request identity, process health, and unchanged files. Exercising the handler without those observations does not prove the contract.

Keep one known good run beside each bad run in the report. The paired rows help a reviewer see that the test rig works and the fault is real.

If a fix changes the text on purpose, update the web and tool rules in one pull request. Link the change from the [test blog](/blog), then keep the old case as a clear break test.

Try the same body with its JSON keys in a new order. The tool should keep the same key words, since it reads failed body text and does not parse that JSON. This check is small, yet it guards against a fake that trusts one exact byte string.

## Failure triage and regression ownership

Triage begins with the earliest differing boundary. If the mocked response itself differs, fix the fixture before interpreting any downstream result or filesystem observation.

When status or \`Skill not found\` changes at the route, the web API owner should review \`packages/web/src/app/api/skills/[id]/route.ts\`. Confirm whether the contract changed intentionally before updating MCP expectations.

When the response is right but the helper text is wrong, inspect \`fetchWithTimeout\`, body reading, and error construction in \`packages/mcp/src/index.ts\`. The MCP package owns preserving useful HTTP context.

When one handler throws or returns another shape, inspect that tool's catch boundary and \`errorResult\`. Compare it with the other slug handlers before blaming protocol transport.

When install changes a path after 404, inspect operation ordering immediately. Content retrieval must fail before directory creation, file writing, and telemetry can begin.

When source passes but the package fails, compare package version, built output, Node engine, and SDK dependency. Release workflow or stale artifacts own that split, not the web route.

When only stdio framing fails, capture stderr and parsed message IDs. Protocol transport ownership begins there, while the HTTP and tool-result assertions can remain green.

Use the [blog index](/blog) to find adjacent debugging guidance, then link the issue to this focused contract. A broad MCP ticket without response and side-effect facts slows ownership.

Close the regression only after all three tools pass expected, body-fallback, and repeated-failure cases. A single repaired message can still leave install effects or another handler inconsistent.

## Frequently Asked Questions

### How should all three tools map a missing skill?

They should resolve with one MCP text content item and \`isError: true\`, while retaining HTTP status 404 and useful \`Skill not found\` detail. The handlers must not crash the server. For \`install_skill\`, the failed content download must also prevent directory creation, file writes, and telemetry.

### What makes an MCP get skill 404 assertion useful?

A useful assertion checks the exact metadata path, one GET, status 404, body detail, one text item, and the true error flag. It also proves the promise resolves rather than rejects. Checking only a nonempty error string would miss wrong routes, false statuses, and extra result content.

### How is an install missing skill error different?

The returned protocol shape should match the other slug tools, but install has extra negative effects to verify. Its content request occurs before local work, so a 404 must leave the temporary tree unchanged. Tests should also prove no tracking POST begins after that failed download.

### Why test MCP HTTP status mapping separately?

Status, body detail, and transport failure describe different facts. Separate fixtures show that 404 stays numeric, the API phrase survives, and a network rejection is not mislabeled as a missing skill. This makes failures precise and prevents one broad text check from hiding an incorrect branch.

### What protects MCP error text stability across releases?

Assert stable semantic fields and normalize only declared environmental values, such as a test origin. Keep the prefix, status, endpoint path, body phrase, content count, and error flag exact. Run the same contract against source and built package so stale bundles or SDK changes cannot drift silently.

## Conclusion

MCP missing skill error mapping is reliable when all three slug tools retain 404 context, return valid error results, and keep install state untouched. The strongest suite compares one controlled response across handlers and reports the first different protocol, network, process, or file observation.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills in the [skills directory](/skills). Apply this matrix before the next MCP release, and use the [MCP testing guides](/blog) when a failure crosses into another contract.`,
};
