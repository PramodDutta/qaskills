import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright CLI Conditional API Mocking',
  description:
    'playwright cli conditional api mocking: mock API responses from request-body conditions. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright cli conditional api mocking',
  keywords: [
    'playwright cli conditional api mocking',
    'playwright cli request body mock',
    'conditional route fulfill playwright',
    'playwright run-code api mock',
    'mock response by request payload',
    'playwright cli login api mock',
    'terminal conditional network stub',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-route-fulfill-mock-api-guide',
    'playwright-network-mocking-route-handler-guide',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://playwright.dev/docs/network',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/references/request-mocking.md',
    'seed-skills/playwright-cli/references/running-code.md',
  ],
  content: `Playwright CLI conditional API mocking registers a narrow route in \`run-code\`, reads the matched request body, validates the required fields, and fulfills an explicit branch response. Test matching, nonmatching, and malformed payloads separately. Retain the URL, safe payload fields, selected branch, status, response shape, and visible UI result.

## What Does Playwright CLI Conditional API Mocking Control?

Playwright CLI conditional API mocking controls how one browser session responds when a matching page request carries a defined body condition. The route handler can inspect that request and return branch-specific status and JSON data.

This technique is valuable when the UI must handle several deterministic server outcomes that are difficult or costly to create through a shared backend. One login form can receive an allowed role, denied role, or malformed-request response without changing production data.

The route pattern defines which requests enter the handler. Method, origin, path, content type, and validated payload fields define which branch may fulfill each intercepted call.

Playwright pauses a matched request until the handler fulfills, continues, falls back, or aborts it. Every code path must therefore make a deliberate terminal choice rather than leaving a request unresolved.

The workflow tests browser behavior around a controlled dependency response. It does not prove the real service implements authorization, validation, latency, headers, or persistence correctly.

Keep one separate unmocked contract or integration check for the backend boundary. Conditional browser mocks should isolate frontend decisions, not become the only evidence for an API.

The [Playwright route fulfillment guide](/blog/playwright-route-fulfill-mock-api-guide) covers standard response replacement. This article focuses on choosing a response from validated request data through a terminal CLI session.

Playwright CLI conditional API mocking passes when each planned body selects exactly one response and unrelated traffic remains untouched. The UI must also expose the expected result.

## How Does Playwright CLI Request Body Mock Work?

A Playwright CLI request body mock starts by opening a browser session, registering \`page.route()\`, and triggering the request after the handler exists. Registration order matters because earlier requests cannot be intercepted retroactively.

Inside the callback, \`route.request()\` exposes the URL, method, headers, and body helpers. \`postDataJSON()\` parses form-encoded or JSON body content, but malformed data still requires an explicit failure policy.

The official [Playwright network guide](https://playwright.dev/docs/network) documents request interception, fulfillment, continuation, aborts, and response modification. A matched request remains stalled until one of those route operations completes.

Validate method and URL before reading business fields. Then treat the parsed payload as unknown data, check its shape, and select a named branch such as \`admin\`, \`denied\`, or \`malformed\`.

Fulfillment should set an intentional status and JSON object. Explicit values make browser behavior and retained evidence easier to compare than implicit defaults.

Observation means recording that the handler saw a request and chose a branch. Assertion means checking the resulting UI, navigation, or client state after the mocked response reaches the application.

The handler should not assert UI content from inside the route callback. That callback belongs to the network boundary, while page locators provide clearer retries and diagnostics for user-visible outcomes.

Playwright CLI conditional API mocking also needs cleanup. Remove the route or close the isolated session before an unmocked control, otherwise a later check may keep receiving synthetic responses.

## Conditional Route Fulfill Playwright: Repository Evidence

Conditional route fulfill Playwright behavior is demonstrated in \`seed-skills/playwright-cli/references/request-mocking.md\`. Its advanced \`run-code\` example registers a login route, parses \`postDataJSON()\`, branches on a username, and fulfills success or unauthorized data.

That repository sequence establishes the central lifecycle: install the handler before submission, inspect the intercepted request, and finish every branch with a route action. It also includes response modification, abort, and delayed response examples for distinct failure models.

The file uses shell-quoted JavaScript passed to \`playwright-cli run-code\`. Teams must preserve quoting carefully because a shell interpolation mistake can change test data before Playwright receives it.

The official [Playwright CLI coding-agent guide](https://playwright.dev/docs/getting-started-cli) describes the command workflow and its browser session model. The [Playwright CLI repository](https://github.com/microsoft/playwright-cli) provides the maintained command source and usage record.

The second evidence path, \`seed-skills/playwright-cli/references/running-code.md\`, explains that \`run-code\` executes an asynchronous function against the current page. Its examples cover locators, waiting, evaluation, network inspection, and try-catch handling.

That distinction supports two steps rather than one oversized command. One invocation installs the route in the active session, while another drives the form and waits for the user-visible status.

The [Playwright CLI complete guide](/blog/playwright-cli-complete-guide-2026) explains session and command basics. Use it to confirm the same named browser remains active between route setup and interaction.

Repository examples demonstrate mechanics, not an application-specific login schema. Replace sample fields and locators with reviewed contracts from the target product, while keeping synthetic values free from real credentials.

Playwright CLI conditional API mocking should cite both evidence files during review because they cover different parts. One defines the route pattern, while the other defines safe execution in the live CLI page.

## When Should QA Teams Use Playwright Run-code API Mock?

A Playwright run-code API mock is suitable for a focused investigation, reproduction, or exploratory check in an already open CLI browser. It is useful before a stable scenario becomes a committed Playwright Test.

Use it when the response depends on request content and ordinary CLI commands do not expose route callbacks. Confirm that the endpoint, payload schema, expected branches, and disposable environment are known first.

Create a control request that should not match the route. Its real or separately handled behavior proves the pattern is narrow enough and unrelated calls are not accidentally fulfilled.

Prefer a locator assertion when no network manipulation is required. Browser auto-waiting gives better user-facing diagnostics than repeatedly inspecting raw page values.

Prefer a committed Playwright Test when the behavior gates release or must run repeatedly in CI. Terminal commands are excellent for discovery, but reviewed source provides versioning, fixtures, and stable reporting.

Prefer an API contract test when the service's own request validation and authorization are the subject. A browser mock cannot prove behavior in a server it bypasses.

Prefer Playwright MCP when an agent needs structured browser observations and explicit tool records. Do not assume an MCP transcript alone replaces a deterministic assertion suite.

The [network route handler guide](/blog/playwright-network-mocking-route-handler-guide) compares page and context routing in test code. Choose context scope only when every page in that isolated context should share the mock.

Playwright CLI conditional API mocking remains a short-lived browser control. Document the route, run the branches, remove it, and repeat the critical path against the real service.

## Mock Response By Request Payload: Failure Modes and Diagnostics

Mock response by request payload failures often begin with a pattern that intercepts more traffic than intended. A broad wildcard can capture analytics, refresh, or unrelated login requests sharing a path fragment.

A product failure exists when the application receives the intended mocked status and body but displays the wrong state, mishandles an error, or navigates incorrectly. Retain the fulfilled response shape and UI observation.

A test defect exists when the route matches the wrong method, parses unchecked data, misses a terminal action, installs too late, or remains active during the control. Fix the route lifecycle before changing application expectations.

An environment limitation exists when a service worker, proxy, different origin, browser policy, or deployed request format changes interception behavior. Compare the actual request URL and method with the reviewed route contract.

Malformed JSON is the key controlled failure. If \`postDataJSON()\` throws and the callback has no catch policy, the request can remain stalled while the browser workflow appears to hang.

Handle parsing errors by returning an explicit synthetic 400 response for the malformed branch. Do not silently select the normal default branch because that conceals an invalid request.

Nonmatching valid payloads need their own fallback response, such as a controlled 403, or a deliberate \`route.fallback()\` when another handler should decide. The policy must be visible in the decision table.

If a button click times out, inspect whether the handler logged a branch and completed a route action. Adding a longer click timeout cannot release a request left pending by test code.

Use the [mock API guide](/blog/playwright-route-fulfill-mock-api-guide) to inspect headers and body encoding. Content type and body format often explain why a seemingly valid parser branch failed.

## Playwright CLI Login API Mock: Evidence and CI Assertions

A Playwright CLI login API mock should exercise three inputs: a matching approved payload, a valid nonmatching payload, and malformed data. Each input needs a separate browser outcome and network record.

For the matching case, require the exact URL and POST method, a validated role field, and the approved branch. Also require a 200 status, the expected safe response shape, and an authenticated UI marker.

For the nonmatching case, require the denied branch, explicit error status, expected error shape, and stable visible message. The page must remain outside the protected destination.

For malformed data, require the parse-error branch and a controlled 400 response. The handler must remain healthy, and the UI should present its documented invalid-request state rather than hanging.

Record only fields needed to distinguish branches. Passwords, tokens, cookies, full authorization headers, and unrelated personal data should never enter terminal or CI evidence.

Add one unrelated URL control after removing or bypassing the route. It should follow the intended real or alternate handler path, proving the wildcard did not absorb neighboring traffic.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) recommends testing observable behavior. A route log without a UI assertion proves interception, but not the feature's response.

For CI, translate the successful terminal experiment into reviewed test code. Retain matched URL, safe request fields, selected branch, fulfilled status, response schema, locator result, and cleanup result.

Playwright CLI conditional API mocking should fail release on an unexpected branch, pending request, leaked route, or exposed secret. Incorrect UI state and an unmocked control that still receives synthetic data must also fail.

## Terminal Conditional Network Stub Comparison Table

A terminal conditional network stub needs explicit choices for every intercepted request. The matrix distinguishes application responses, delegation, and transport failure rather than combining them as one generic mock.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| Payload branch | Return a deterministic response for one validated condition | URL, safe payload, branch, status, body shape, UI result | A broad route captures unrelated requests |
| Default branch | Return an explicit response for valid unmatched data | Validated payload, fallback branch, status, visible error | Unchecked input receives a misleading normal response |
| Route fallback | Let another route handler or network path decide | Pattern, handler order, downstream result, UI result | Traffic escapes to an unsafe or unstable dependency |
| Abort | Model transport failure rather than application status | URL, abort code, client error state, cleanup result | Teams confuse network loss with a server rejection |

Use payload and default branches when the frontend contract expects HTTP responses. Their status codes and body schemas should mirror documented shapes without claiming backend implementation.

Use fallback only when handler ordering is deliberate and the destination is allowed. A test should never send synthetic credentials to an uncontrolled real endpoint by accident.

Use abort for offline or connection-failure behavior. It should not represent a 401, 403, 422, or 500 response because the browser observes those outcomes differently.

The official network source and \`seed-skills/playwright-cli/references/request-mocking.md\` support these distinct route actions. Reviewers should reject handlers whose branches can finish without any action.

The [network mocking guide](/blog/playwright-network-mocking-route-handler-guide) provides a path from terminal exploration to reusable test fixtures. Keep the terminal version smaller than the eventual release suite.

## How Do You Implement Playwright CLI Conditional API Mocking?

Implement Playwright CLI conditional API mocking by registering one exact route, validating each request, and giving every branch a terminal route action. Drive and assert the page only after registration succeeds.

1. Read \`seed-skills/playwright-cli/references/request-mocking.md\` and define the endpoint, method, payload schema, response branches, and safe evidence fields.
2. Open the disposable target in a named CLI session, verify its URL, and install the narrow route before any submission.
3. Submit the approved payload, then require the success branch, explicit response, and authenticated UI outcome.
4. Submit valid nonmatching and malformed payloads, requiring distinct denied and parse-error results.
5. Remove the route or close the session, then run an unrelated or real-path control to prove cleanup.
6. Save redacted branch evidence and translate release-critical behavior into a committed CI test.

The setup command validates the method and parsed role while supplying explicit statuses. Quoting may need adjustment for the shell used by the project.

\`\`\`bash
playwright-cli run-code "async page => {
  await page.route('**/api/login', async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();

    try {
      const body = request.postDataJSON();
      const allowed = body && body.role === 'admin';
      await route.fulfill({
        status: allowed ? 200 : 403,
        json: allowed ? { role: 'admin' } : { error: 'denied' }
      });
    } catch {
      await route.fulfill({ status: 400, json: { error: 'invalid-body' } });
    }
  });
}"
\`\`\`

The interaction command submits the form and waits on a user-facing result. Repeat it with approved, denied, and malformed fixtures rather than mutating hidden page state.

\`\`\`bash
playwright-cli run-code "async page => {
  await page.getByLabel('Role').fill('admin');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('status').waitFor();
  return {
    url: page.url(),
    status: await page.getByRole('status').textContent()
  };
}"
\`\`\`

Inspect the returned URL and status, then run the other branch inputs. The [CLI complete guide](/blog/playwright-cli-complete-guide-2026) covers snapshots and session closure when the live state differs from expectations.

Do not leave the route active for unrelated exploration. Close the disposable browser or explicitly unroute it before verifying the real dependency.

Browse [QA skills](/skills) for related test patterns and focused network checks. Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli) for the repository-backed command workflow.

### Walk Through the Three Request Cases

Start with a clean CLI browser on a test host that the team is allowed to change; check the page URL before any route is set. Keep one small set of fake form data; do not use a real user secret.

Write the exact route host and path in the run note; add the POST method as a second gate. A narrow rule is easy to trust. A broad star rule can catch calls that the test did not mean to change.

Set the route before the page sends its first form call; ask the handler to log only the case name. Do not log the whole body. The case name is enough to match the request with the page result.

Run the good case first with the fake admin role from the plan; the handler should pick the allow branch. The page should show its signed-in state. Save the safe role, status, and page result.

Close or reset the page state before the denied case begins; send a valid role that has no access. The handler should pick the deny branch. The page should stay out of the locked area.

Use a third input that cannot be read as the planned body; the handler should pick the bad-body branch. The page should show its known request error. It must not wait until the click times out.

Give each case a new request ID that is safe to print; put that ID in the mock response if the app can show it. This helps pair a page result with one route call. It also spots a stale response.

After all three cases, remove the route and send one harmless check to a safe test path; the handler should not log a case. This is the cleanup proof. It shows that the mock cannot leak into later work.

If the good case fails, read the chosen branch before checking the page; a wrong branch points to test data or body shape. A right branch with a wrong page points to app code. Keep those two faults apart.

If the denied case passes as signed in, check for old cookies and page state first; a new browser context is the best guard. The mock may be right while the page still holds a prior sign-in.

If the bad-body case hangs, make sure the catch path calls \`fulfill\`, \`fallback\`, or \`abort\`; each matched call must end in one route act. A caught error with no act still leaves the page request paused.

If a call never reaches the route, print its safe URL and method from the browser log; compare them with the plan. Do not make the wildcard wider at once. Fix the one part that does not match.

Keep status codes true to the case the UI must handle; use 403 for a planned deny and 400 for bad input. Use abort only for a lost link. Clear names make the page check and report easy to read.

Do not copy a full real response when the page needs only two safe fields; build the least body that meets the frontend contract. This cuts test drift. It also keeps private data out of the mock file.

Run the real test service in a separate small check after the mock suite; that check proves the agreed request and response shape. It should not share the mock route. The two checks answer different questions.

Move the three cases into source code when they must gate a release; name each test for its branch and page result. Keep route setup in a small helper. Keep the final locator check in each test.

Review the helper when the app adds a field or changes the path; do not accept any new field by default. Update the fake data and shape check as one change. The review should state why the new field matters.

Playwright CLI conditional API mocking is most useful when each case stays small and clear; one request should lead to one branch and one page result. That simple chain makes a failed run quick to sort.

Check one GET call to the same path if the app may send both GET and POST; the GET should pass the route gate or use its own plan. It must not receive a fake sign-in body; this guards the method check.

Send one body with the right role but the wrong data type for a second field; the shape check should choose the bad-body case. Do not let one good field grant a pass. Each field in the branch rule must be sound.

Test a page refresh after the allow case in a clean test run; state should match the fake response plan and no more. If the app needs a real server key, the refresh may sign out. Write that limit in the test name.

Keep route logs in time order with the page check that each call caused; a short case ID can join both facts. Do not rely on line order when calls can run at once. The ID gives each pair a firm link.

When two calls match the same path, state which one the UI case needs; count both and check their safe method and role. A mock that fills the first call may leave the next one stuck. Each matched call needs a route act.

Use a fake token string that cannot work on any real host; the page may need its shape for local code. Mark it as test data. Never copy a live key just to make the fake branch look more like the server.

Run the bypass case with the fake sign-in fields cleared from the page; this stops a stale value from shaping the real call. Save only its safe status and page mark. The goal is proof that the route is gone.

At review, ask if the rule is narrow, each body has one case, every call ends, and the page shows the planned result; these four checks cover the core risk. A no answer should block the mock from CI.

## Frequently Asked Questions

### What is the safest way to use playwright cli request body mock?

Match a narrow origin and path, require the intended method, treat parsed content as unknown, validate only needed fields, and complete every branch explicitly. Use synthetic credentials, redact retained payload data, remove the route afterward, and keep one unmocked service check outside the browser mock.

### How do you verify conditional route fulfill playwright?

Trigger one request per planned branch and retain its URL, method, safe payload fields, selected branch, status, response shape, and visible page result. Add a nonmatching URL control and confirm it bypasses the handler. Interception logs alone do not prove the frontend handled each response correctly.

### When should a QA team choose playwright run-code api mock?

Choose \`run-code\` for focused exploration or reproduction in an active CLI browser when response selection needs request inspection. Convert stable release checks into committed Playwright Test code. Prefer API contract tests when server validation matters, and ordinary locator assertions when no network control is required.

### What causes failures in mock response by request payload?

Typical causes include an overbroad wildcard, wrong HTTP method, late route registration, unexpected content type, malformed JSON, unchecked fields, missing route completion, or a leaked handler from an earlier check. Inspect the actual request and selected branch before extending browser timeouts or changing UI locators.

### Which evidence should playwright cli login api mock retain?

Retain the matched URL, method, sanitized request fields, named branch, fulfilled status, response schema, visible status text, navigation result, route cleanup result, and CLI version. Exclude passwords, cookies, tokens, authorization headers, and complete personal payloads because test diagnostics must not become reusable authentication material.

### How should CI handle terminal conditional network stub?

Use the terminal flow to discover the contract, then commit a deterministic test with isolated context setup and teardown. CI should run approved, denied, malformed, and bypass controls, fail on pending or leaked routes, preserve redacted branch records, and include one separate real-service contract check.

## Conclusion

Playwright CLI conditional API mocking is appropriate when one browser flow needs deterministic responses selected from validated request data. Require narrow matching, explicit terminal actions, three payload controls, visible UI assertions, redacted evidence, and route cleanup before trusting the result.

Continue with the [QASkills blog](/blog) or explore the [skills directory](/skills). Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused conditional-mocking workflow.`,
};
