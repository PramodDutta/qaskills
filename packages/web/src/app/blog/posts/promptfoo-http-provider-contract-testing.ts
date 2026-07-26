import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Promptfoo HTTP provider contract testing',
  description:
    'Promptfoo HTTP provider contract testing: use repo evidence, fixtures, code examples, and CI checks to expose AI contract failures before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Promptfoo HTTP provider contract testing',
  keywords: [
    'Promptfoo HTTP provider contract testing',
    'how to promptfoo http provider contract testing',
    'promptfoo http provider contract testing example',
    'Promptfoo HTTP provider mock server',
    'transformResponse contract test',
    'Promptfoo request template validation',
  ],
  relatedSlugs: [
    'promptfoo-complete-guide-2026',
    'promptfoo-red-teaming-llm-applications',
    'prompt-injection-testing-guide-2026',
    'promptfoo-cli-tutorial-2026',
  ],
  sources: [
    'https://www.promptfoo.dev/docs/providers/http/',
    'https://www.promptfoo.dev/docs/providers/',
    'https://www.promptfoo.dev/docs/configuration/guide/',
  ],
  repoEvidence: [
    'seed-skills/promptfoo-llm-red-teaming/SKILL.md',
    'seed-skills/prompt-testing/SKILL.md',
  ],
  content: `Promptfoo HTTP provider contract testing sends rendered cases to a local capture server, then compares the observed method, URL, headers, body, and session values with the provider contract. It also returns controlled response classes and verifies the final output. A pass requires exact requests, expected transforms, complete case counts, and no production traffic.

## What must Promptfoo HTTP provider contract testing prove?

Promptfoo HTTP provider contract testing must prove both halves of an HTTP exchange. The outgoing request must match its documented template, while each incoming response must become the expected Promptfoo value or clear provider error.

The contract begins after Promptfoo renders the prompt and test variables. It covers the final URL, query string, method, selected headers, auth value, JSON body, and any case-link or session field.

The response half covers status classes, content type, raw text, parsed JSON, and the configured response expression. A successful check compares the transformed value with a fixture result instead of merely confirming that some output exists.

The official [HTTP provider reference](https://www.promptfoo.dev/docs/providers/http/) documents request bodies, variables, dynamic URLs, headers, and response transforms. It also explains that object bodies use JSON encoding, which gives the capture server a stable representation to inspect.

Keep credentials synthetic and scoped to the local process. A canary token proves that authentication reached the intended header without exposing a live secret in the config, terminal, or retained report.

Sessions need their own oracle because a correct prompt can still travel under the wrong conversation identity. Send two cases with distinct session values, then prove each captured request retained its own value and order.

Start with one short prompt and one fixed reply. This small case makes the first wrong field easy to spot in a diff.

Next, change just the case ID and session ID while all other fields stay the same. The two saved requests should differ only where the plan says they may differ.

The [complete Promptfoo guide](/blog/promptfoo-complete-guide-2026) covers wider provider setup and evaluation design. This test stays narrower: it treats the rendered network exchange and parsed reply as a versioned integration contract.

A green result therefore needs more than an HTTP 200. It needs one capture per planned case, exact request evidence, an exact final reply, and proof that the local fixture received every call.

Browse the [AI testing skills](/skills) when the surrounding suite also needs prompt, safety, or model checks. Keep this gate focused so request drift has one clear owner and one useful failure record.

## Which repository behavior defines the test contract?

The repository baseline appears in \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\`. Its deployed target uses an HTTPS provider with a POST method, a JSON body containing \`message: "{{prompt}}"\`, and \`transformResponse: json.reply\`.

That example defines an observable input and output shape rather than an abstract provider choice. The test can inspect the rendered \`message\` value at the server and can return \`{"reply":"fixture answer"}\` for the response expression.

The same file says red-team checks should target the deployed application so its guardrails, retrieval, and tool restrictions remain active. A local contract suite does not replace that end-to-end run; it verifies the adapter before the broader check spends time on model behavior.

\`seed-skills/prompt-testing/SKILL.md\` adds useful test policy. It calls for versioned prompts, CI evaluation, edge cases, pinned model settings, and environment variables instead of hardcoded keys.

Separate those repository facts from Promptfoo's source rules. The [provider catalog](https://www.promptfoo.dev/docs/providers/) identifies HTTP as one supported provider family, while the local repository selects the exact body and transform needed by this application.

Record the contract in execution order. First Promptfoo resolves the case variables, then it builds the request, the capture server saves it, the fixture replies, and the response expression selects the final value.

Save one plain record at each step, and give all records the same case ID. This link lets a reviewer trace one run from input through its final value.

Keep the raw request until all checks end, but show a safe copy in the test report. The safe copy can hide the token while it keeps the token-match result.

Each stage needs an identifier that survives failure. Use a case ID in the test variables and request body, then save that ID beside the capture, fixture response, Promptfoo result, and assertion record.

Do not infer transport success from an evaluation score alone. A permissive assertion could pass even when the endpoint received a stale prompt, duplicated header, or wrong session value.

The [Promptfoo red-teaming guide](/blog/promptfoo-red-teaming-llm-applications) explains why the deployed boundary still matters. The local suite gives that boundary a fast adapter check before adversarial cases exercise the whole application.

## How to promptfoo http provider contract testing?

To learn how to promptfoo http provider contract testing, start a server on a free loopback port and expose one route. The route should save fixed request records before selecting a response by the incoming case ID.

Use a fixed fixture map for success, plain text, broken JSON, auth rejection, server error, and delayed reply cases. Fixed inputs make request rendering failures distinct from changing model output.

The first example preserves the repository's POST body and \`json.reply\` expression. It adds a local URL, fake auth header, test ID, and session value that the harness can inspect.

\`\`\`yaml
providers:
  - id: http
    config:
      url: http://127.0.0.1:4319/chat
      method: POST
      headers:
        Authorization: Bearer contract-canary
        X-Test-Case: "{{caseId}}"
      body:
        message: "{{prompt}}"
        sessionId: "{{sessionId}}"
      transformResponse: json.reply

prompts:
  - "{{query}}"

tests:
  - vars:
      caseId: success-01
      sessionId: session-a
      query: Explain the refund window
    assert:
      - type: equals
        value: Refunds close after 30 days.
\`\`\`

Run Promptfoo as a child process with the generated config path and explicit output path. Wait for process completion, then read the capture ledger and result file before closing the server.

Assert the request as structured data after validating its content type. Comparing parsed JSON avoids false failures from harmless whitespace, while exact object equality still catches missing, renamed, or extra fields.

Header names ignore case, but their values do not share that rule. Fold names in the harness, then compare the expected auth token and test ID without printing the token in an assertion message.

Make the server reject a second body for the same case unless that case tests retry. This rule turns an unplanned repeat into a clear count error.

Save the port and route in the run record before the command starts. If no call arrives, those facts show where Promptfoo was meant to send it.

Do not call staging from this suite, even as a fallback. An unavailable local fixture should fail setup clearly because silent fallback would mutate remote state and make the evidence ambiguous.

Use the [prompt injection testing guide](/blog/prompt-injection-testing-guide-2026) for hostile prompt content after transport is proven. Provider contract fixtures should stay fixed and should not ask a model to judge their own request shape.

## Promptfoo http provider contract testing example: scenario and assertion matrix

This promptfoo http provider contract testing example gives each failure one controlled cause and one stable oracle. The matrix also names the evidence that a CI reviewer should see when a row fails.

| Scenario | Controlled fixture | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Baseline POST | JSON reply with \`reply\` | Exact URL, headers, body, session, and final answer | Any request field or final value differs | \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` |
| Empty prompt boundary | Empty rendered query | One request with an empty message and known case ID | Case skipped, body omitted, or old prompt reused | Promptfoo HTTP provider reference |
| Broken response | Cut-off JSON body | Named provider or transform failure for that case | Raw success, hidden parse error, or missing case result | Promptfoo config reference |
| Repeated sessions | Two cases with distinct session IDs | Two ordered captures with isolated values | Session bleed, duplicate capture, or reordered identity | \`seed-skills/prompt-testing/SKILL.md\` |
| Dependency failure | Delayed or 503 fixture | Bounded failure with status and case evidence | Hang, production fallback, or generic empty output | Local capture ledger |

The empty-prompt row is a transport boundary, not a product requirement that blank prompts must succeed. Its purpose is to show whether template rendering preserves the supplied value or silently reuses another case.

The broken response row should not require one internal error string across Promptfoo versions. Assert the stable class, failed case ID, nonzero command status when set, and absence of a false final answer.

Test the table from top to bottom with one saved folder per row. Separate folders stop a late file from one row from being read by the next.

Name each folder with the case ID, not with a secret or full prompt. The name stays safe in logs and still links all files to one test.

For repeated sessions, compare the count before values. Two correct-looking captures cannot pass when three requests were sent, because a duplicate may hide a missing case.

The [Promptfoo CLI tutorial](/blog/promptfoo-cli-tutorial-2026) can help reproduce a failed row with the same config. CI remains authoritative because it controls the server, environment, timeout, and retained evidence.

## What failures expose Promptfoo HTTP provider mock server?

A Promptfoo HTTP provider mock server exposes request drift by rejecting any method, route, or content type outside its narrow contract. It should still save the rejected request summary so the failure explains what arrived.

Return a 401 when the canary header is absent, a 400 when the JSON shape is wrong, and a 409 when a session is reused unexpectedly. Those fixture statuses separate transport mistakes without asking the application to infer their meaning.

The second example shows a small Vitest assertion layer around captured records. It verifies exact fields, result identity, and absence of extra traffic after the expected process ends.

\`\`\`typescript
const run = await runPromptfoo(configPath, {
  env: { CONTRACT_TOKEN: 'contract-canary' },
  timeoutMs: 8_000,
});

expect(run.exitCode).toBe(0);
expect(captures).toHaveLength(1);
expect(captures[0]).toMatchObject({
  method: 'POST',
  path: '/chat',
  headers: {
    authorization: 'Bearer contract-canary',
    'x-test-case': 'success-01',
  },
  body: {
    message: 'Explain the refund window',
    sessionId: 'session-a',
  },
});
expect(run.results).toEqual([
  { caseId: 'success-01', output: 'Refunds close after 30 days.' },
]);
expect(remoteRequests).toHaveLength(0);
\`\`\`

Add a negative variant that changes only \`json.reply\` to a missing path. The server request should remain correct, while the final result fails or becomes empty according to the pinned Promptfoo behavior.

Check the server ledger before the result file when that case fails. A good request in the ledger narrows the fault to reply parsing or result work.

Then check that the result has one slot for the failed case. A lost slot can shift later rows and make a good answer look tied to the wrong input.

This split prevents the team from blaming the endpoint for a response parser defect. It also prevents a correct parser from hiding a request that reached the wrong path.

Delay one fixture beyond the configured timeout and watch process cleanup. The server should observe a closed connection or completed timeout path, and the test must finish within its own larger deadline.

Send broken JSON with a JSON content type, then plain text with a text content type. Distinct cases prove whether fallback parsing and the set reply rule behave as the suite expects.

The [Promptfoo red-team article](/blog/promptfoo-red-teaming-llm-applications) covers adversarial target behavior. This mock server instead makes protocol faults repeatable enough to block a pull request.

## How should transformResponse contract test run in CI?

A transformResponse contract test should run with a pinned Promptfoo package, loopback-only server, fixed fixtures, and explicit process deadlines. CI should publish the config, sanitized capture ledger, command status, and machine-readable results for every attempt.

The [config guide](https://www.promptfoo.dev/docs/configuration/guide/) describes the main eval shape, including providers, prompts, tests, and shared defaults. Store the focused contract config beside its fixture rather than building hidden options in the job.

Start the server before writing the final URL into the temporary config. Confirm the listening address is loopback, record its port, and fail setup if another process owns the expected route.

Set two deadlines with different goals. The provider timeout bounds one HTTP call, while the test timeout stops a hung CLI, closes the server, and still writes a test summary.

Use fake delays in the local server, not a slow public host. The test then owns when bytes are sent and when the wait should end.

After a timeout, wait for the child process and server to close before the next case. A left-open task can steal a later port or add a stray request.

Run the same small green case before and after the timeout case. Equal green records show that the failed wait did not leave bad shared state behind.

Run cases serially when request order is part of the contract. If production enables concurrency, add a separate group that compares case IDs as a set and proves session data never crosses records.

Retain files only after hiding the fake auth value. Keep method, route, case ID, body field names, reply class, status, and transform outcome because those facts assign ownership.

Use the [Promptfoo CLI guide](/blog/promptfoo-cli-tutorial-2026) for command details and the [skills directory](/skills) for broader CI patterns. The release gate should fail on missing cases, request mismatches, transform mismatches, timeouts, or any nonlocal request.

## Which assertions verify Promptfoo request template validation?

Promptfoo request template validation needs exact checks for values, count, order where promised, and source. Existence checks miss swapped variables because both fields may be present while carrying another case's data.

Compare the method with \`POST\`, the clean path with \`/chat\`, and the parsed body with the expected object. Reject unknown body keys when the endpoint contract forbids them.

Check that the auth value came from the test run, not from a committed fallback. One safe method compares a hash or true-or-false match and omits the raw token from failure output.

Run one case with the token unset and require a setup error before the server call. This check proves the config has no hidden default key.

Run one case with a fake wrong token and require a captured 401 path. The two tests split missing run setup from a bad value on the wire.

Assert one unique case ID per planned test and one capture per case. Then compare the set of planned IDs with captured IDs and result IDs, which catches skipped, duplicated, and orphaned work.

Session checks should compare values across adjacent cases, not only within each record. A test should fail when case B carries session A even if both session strings are individually valid.

For reply checks, assert the final output type and exact fixture value. Also retain status and content type so a parser change cannot turn a server error page into a plausible answer.

The source link ties each result to its fixture reply. Save the fixture key, reply class, and case ID beside the final output instead of relying on array position.

The [complete guide](/blog/promptfoo-complete-guide-2026) explains other check types for model quality. This adapter gate should prefer exact equality because every request and fixture reply is under test control.

## Step-by-step test implementation

Implement the contract as one focused suite with explicit setup, execution, failure injection, and cleanup. Keep the following six steps contiguous so a reviewer can reproduce the same evidence path.

1. Read \`seed-skills/promptfoo-llm-red-teaming/SKILL.md\` and record its POST body, deployed-target intent, and \`json.reply\` response expression as the baseline contract.
2. Read \`seed-skills/prompt-testing/SKILL.md\`, then define synthetic credentials, versioned fixtures, fixed case IDs, and a policy that forbids production fallback or shared-state mutation.
3. Start a loopback capture server with success, broken JSON, timeout, 401, and 503 replies, then create the Promptfoo config with its assigned free port.
4. Run the positive cases and compare exact request records, case count, session isolation, reply classes, transformed values, and zero remote requests.
5. Inject one fault at a time into method, header, body, route, response shape, and timing, then require the matching stable failure evidence.
6. Run the focused command in CI, sanitize retained artifacts, close sockets and child processes, and route each failed assertion to its owning layer.

Write the positive fixture first because it proves the harness can observe a valid exchange. A negative test has little value when the same harness cannot demonstrate one known pass.

Keep that green fixture small and run it in each build mode used by CI. Its request and reply facts should match even when logs look different.

Store expected records as plain data near the fixture. Hidden snapshots make review hard when a field is added or removed on purpose.

Change one field per mutation. If a case changes the route, token, body, and response together, the resulting error cannot identify which contract first broke.

Keep cleanup in a \`finally\` path and verify it. A stopped server, settled child process, removed temporary config, and empty remote ledger are part of the test outcome.

The [blog index](/blog) provides adjacent testing patterns, while this procedure remains an adapter-level regression gate. Run the wider evaluation only after the local request and transform checks pass.

## Failure triage and regression ownership

Triage starts with the first file that does not match. A wrong captured request belongs to template or provider config, while a correct capture with wrong final output belongs to fixture reply handling or \`transformResponse\`.

If no capture exists, inspect process startup, rendered URL, DNS policy, timeout, and command status. Do not label the missing record as a model failure because the model boundary was never reached.

Check whether the server was ready before the child began. A ready latch is safer than a fixed wait that may be too short on a busy runner.

If the server was ready, compare the planned port with the final config text. A stale temp file can point the child at an old port with no clear network error.

If several captures share one case ID, inspect variable rendering and test concurrency. If case IDs are correct but sessions cross, assign the defect to session construction or shared mutable config.

A correct server reply with a missing Promptfoo result points to parsing, result accounting, or command failure. Preserve raw fixture bytes and status beside the result summary so that owner can reproduce the exact branch.

When only CI fails, compare package version, Node version, locale, proxy variables, and available ports. Keep these environment facts in the report instead of weakening exact assertions.

The failure decision should be compact: request mismatch goes to adapter owners, while response mismatch goes to transform owners. Missing evidence goes to harness owners, and remote traffic goes to CI security owners.

Use the [prompt injection guide](/blog/prompt-injection-testing-guide-2026) only after the adapter is healthy. A hostile input result cannot diagnose a header, session, or response parsing defect with the same precision.

## Frequently Asked Questions

### How do you contract-test Promptfoo HTTP provider templates for methods, headers, authentication, request bodies, sessions, and transformed responses?

Send fixed cases through a loopback capture server, compare each rendered request with an exact expected record, and return controlled response classes. Then compare every transformed output, case ID, and session value. The suite passes only when counts match, no remote request occurs, and cleanup closes all local resources.

### What fixture best tests how to promptfoo http provider contract testing?

Use a local server with routes for JSON success, plain text, broken JSON, auth rejection, server error, and delayed replies. Give every request a unique case ID and session value. This fixture makes method, header, body, timing, parsing, and result-count defects clear without depending on a model or staging service.

### Which failure signal proves promptfoo http provider contract testing example?

The strongest signal identifies the earliest exact mismatch: wrong method, path, header, body, case count, session value, status class, or transformed output. Preserve the captured request and fixture key beside that signal. A generic nonzero command status alone cannot show whether rendering, transport, parsing, or result accounting failed.

### How should CI report Promptfoo HTTP provider mock server?

CI should retain the sanitized provider config, capture ledger, fixture response class, Promptfoo result file, command status, and cleanup summary. Reports need stable case IDs but no raw credential. A reviewer should determine the failed layer from one artifact set without rerunning the suite or contacting a live endpoint.

### When should transformResponse contract test block a release?

Block when a valid fixture produces the wrong final value, an error reply becomes a false success, broken data loses its case identity, or any planned result disappears. Also block on an endless run or remote fallback. These outcomes can skew later eval scores even when the app reply is correct.

### How can teams keep Promptfoo request template validation repeatable?

Pin the Promptfoo version, commit fixed fixtures, use fake run values, bind only to loopback, and compare plain records rather than log text. Run one change per negative case and retain case-level evidence. Repeated runs should produce equal request sets, transformed values, command outcomes, and cleanup summaries.

## Conclusion

Promptfoo HTTP provider contract testing provides a release signal only when exact rendered requests and final replies agree for every planned fixture. The gate should also reject missing cases, session bleed, hidden parser errors, remote traffic, and incomplete cleanup.

Open the [QA skills directory](/skills) to choose an AI testing skill, then read the [Promptfoo complete guide](/blog/promptfoo-complete-guide-2026) before adding this focused regression gate to CI. Keep the first gate local, small, and tied to one owned HTTP contract.`,
};
