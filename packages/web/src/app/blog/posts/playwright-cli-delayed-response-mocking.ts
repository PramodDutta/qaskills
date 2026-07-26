import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright CLI Delayed Response Mocking',
  description:
    'playwright cli delayed response mocking: inject API latency for loading and duplicate-submit tests. Repo evidence maps checks and CI-safe steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Playwright',
  primaryKeyword: 'playwright cli delayed response mocking',
  keywords: [
    'playwright cli delayed response mocking',
    'playwright cli slow api mock',
    'delay route fulfill response',
    'test loading spinner playwright cli',
    'simulate api latency browser',
    'duplicate submit race test',
    'playwright run-code delayed mock',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-network-mocking-route-handler-guide',
    'how-to-test-debounced-search-in-playwright',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://playwright.dev/docs/network',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/references/request-mocking.md',
    'seed-skills/race-condition-finder/SKILL.md',
  ],
  content: `Playwright CLI delayed response mocking registers one narrow route, waits inside its handler, and then fulfills a fixed API response. The page stays available while that request is pending, so QA can inspect loading, disabled controls, duplicate clicks, and timeout behavior. Remove the route after each case and keep real service timing separate.

## What Does Playwright CLI Delayed Response Mocking Control?

Playwright CLI delayed response mocking controls when one matched browser request receives its test-owned response. It lets the page enter a pending state without slowing every action in the browser session.

The route handler sees requests that match its URL pattern and can log the safe path plus method for each hit. It can wait for a bounded delay and then call \`route.fulfill\` with a fixed status, body, content type, and headers.

That delay holds the chosen network response, not the JavaScript event loop for the whole page. The UI can render a spinner, disable a button, show a timer, or accept another action while the handler waits.

The [Playwright network guide](https://playwright.dev/docs/network) covers request routing, fulfillment, aborts, and response changes. A delayed fulfillment uses the same route boundary with time added inside the async callback.

This workflow does not measure live network speed. Its value is control: each run uses the same route, delay, response, and user action so the UI state can be checked.

It also does not model every slow-service effect. DNS delay, connection setup, chunked bodies, server queues, retries, and proxy faults can need different integration tests.

Do not place an unconditional wait before the assertion and call that a slow API test. A test sleep delays the test code, while a route delay keeps a real browser request pending.

The product claim must remain visible. A route can prove that a loading state exists for 1.5 seconds, but it cannot prove that the live service meets a performance goal.

Use the [network mocking guide](/blog/playwright-network-mocking-route-handler-guide) for wider interception patterns. Keep this case on one method and endpoint so unrelated requests continue normally.

The release rule is to observe the pending UI, verify one outbound request, release a deterministic response, and assert the final result. Cleanup must remove the route before another flow starts.

Playwright CLI delayed response mocking should produce a short record of matched URL, delay, UI timeline, request count, response, and cleanup. Those facts make a race result reviewable.

## How Does Playwright CLI Slow API Mock Work?

Playwright CLI slow api mock starts by opening a named browser session and registering a route through \`run-code\`. The callback waits only after a matching request reaches the page.

The [Playwright CLI getting started guide](https://playwright.dev/docs/getting-started-cli) describes the command-driven browser session. The [CLI source repository](https://github.com/microsoft/playwright-cli) is the approved project source for its current command surface.

A useful route pattern includes the complete API path and, when needed, a method check. Broad patterns such as every request can delay scripts, fonts, and images that are outside the test.

Registration must finish before the user action starts. If the click wins that race, the request reaches the real service and the planned pending window never exists.

When the request arrives, the async handler records its URL and method, waits for the bounded interval, and fulfills fixed JSON. The browser then receives a normal completed response.

The page remains interactive during the handler wait, so the test can check what a user sees while the wire call is still held. A later CLI command can inspect the spinner, button state, status text, or another user action in the same session.

Observation should name a point in time. For example, the submit button became disabled 35 milliseconds after click and remained disabled until the one response completed.

Assertion should state the rule. The form must send one request, block another submit, show pending feedback, and render one success result after fulfillment.

Do not make the delay longer than needed to observe the state. A short, fixed window keeps the case fast while leaving enough time for the CLI to issue checks.

Do not use a delay value as the assertion deadline. The loading check should wait for visible state, while a separate upper bound prevents a broken route from hanging the session.

The [Playwright CLI guide](/blog/playwright-cli-complete-guide-2026) explains session and command basics. Pair those steps with strict route cleanup so a later CLI task does not inherit the mock.

Playwright CLI delayed response mocking works when the pending request is the controlled cause and the UI timeline is the observed effect. Keep those two facts distinct in the report.

## Delay Route Fulfill Response: Repository Evidence

Delay route fulfill response behavior is documented in \`seed-skills/playwright-cli/references/request-mocking.md\`. Its advanced \`run-code\` section uses \`page.route\` for conditional replies, changed responses, failures, and delays.

The delayed example registers \`**/api/slow\`, waits three seconds in the route callback, and fulfills a JSON body. It demonstrates that delay belongs inside the matched request handler.

The same reference lists \`route-list\` and \`unroute\` commands. These operations make route state visible and provide a direct cleanup step for a long-lived CLI browser session.

Its route syntax also supports immediate status, body, content type, and headers. Use the simple command when no custom timing or request inspection is required.

The second repository source, \`seed-skills/race-condition-finder/SKILL.md\`, explains why controlled latency is useful. It calls network delay an amplifier that exposes an existing race rather than its root cause.

That skill identifies double clicks, rapid navigation, and concurrent form work as high-risk paths. Its double-submit case holds an order request, checks busy UI, forces a second action, and expects one pending request.

The skill also recommends state snapshots at key times. For this CLI flow, use named facts such as before click, request pending, second action, response complete, and final UI.

Together, the files define the right boundary. The request-mocking reference supplies the CLI route method, while the race skill supplies the product checks and timing logic.

The [debounced search test guide](/blog/how-to-test-debounced-search-in-playwright) covers another timing case. A debounce wait controls when a request starts, while this route mock controls when a matched response ends.

Repository evidence does not define the real endpoint, safe delay, or expected UI for every project. The application team must provide those values and own the final business assertion. Playwright CLI delayed response mocking follows the evidence when it delays a narrow route, checks the live pending state, and removes the handler after the deterministic response.

## When Should QA Teams Use Test Loading Spinner Playwright CLI?

Test loading spinner playwright cli when one known request should create a user-visible pending state. The method fits forms, searches, data panels, uploads, and actions that await a JSON reply.

Begin with a stable fast control. Fulfill the same endpoint at once and confirm the final UI, so a later delayed failure is not confused with a bad response body.

Then add one short delay and assert that the loading state appears before completion. The spinner should be tied to the action and should leave after the fixed response arrives.

For forms, check more than the spinner. The submit control should be disabled or guarded, and a second click or Enter key should not create another request.

For searches, check stale result handling. A slow first query should not replace a newer result if the user changes the term before the first response returns.

Use route abort when the product requirement concerns network failure rather than slow success. An abort has no completed application response and should drive a different error path.

Use an immediate mock when timing is not part of the claim. It gives fast test data without adding a pending window that no assertion uses.

Use a real service only for an integration goal that owns its timing and data. A shared slow endpoint is not a sound fixture because its delay can change without the test.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) supports tests based on user-visible outcomes. Keep the loading and final-state assertions close to the action that starts the request.

Do not use this flow to certify a performance target. Measure service and page timing with a separate performance method, while the mock proves behavior under one fixed wait. Playwright CLI delayed response mocking is a good fit when delay is the one changed input and every UI plus request result can be observed in the same browser session.

## Simulate API Latency Browser: Failure Modes and Diagnostics

Simulate API latency browser failures by checking route state before changing timeouts. Most broken cases come from a route that missed, matched too much, never fulfilled, or leaked into another scenario.

A product fault exists when one pending request allows duplicate records, leaves controls enabled, hides all progress, or renders stale data after a newer action. The request count and final server state support that claim. A test fault exists when the pattern targets the wrong host, registration happens after click, the mock body violates the real schema, or the assertion waits on a weak selector.

An environment limit exists when the CLI session closes, the browser process lacks resources, or an upstream proxy changes the request URL. Session and route records should expose that edge.

The first common mistake adds an unconditional test sleep before checking the page, which can leave the true request start and end times out of the proof. That wait can miss a brief spinner and does not prove any request was pending.

The second mistake delays every URL. Page assets then arrive late, and the test no longer isolates the API response that should control the product state.

The third mistake leaves the route active. A later fast-control case still receives the delayed reply and can fail far from the setup that caused it.

The fourth mistake counts clicks instead of requests. A button can receive two click events while correct product code sends only one request, or one click can trigger two requests.

The fifth mistake fulfills with an unrealistic status or body. The UI may fail during decoding, which looks like a loading bug but is only a bad mock contract.

Use the [network mocking guide](/blog/playwright-network-mocking-route-handler-guide) to compare fulfill, continue, fetch, and abort paths. Choose one path per case and name it in the evidence.

Playwright CLI delayed response mocking diagnosis should rerun an immediate control after cleanup. If that control is still slow, route state or the environment remains changed.

## Duplicate Submit Race Test: Evidence and CI Assertions

Duplicate submit race test evidence needs one request counter and a UI timeline. Click count alone cannot prove that the browser sent one mutation to the server.

Record the matched URL, method, planned delay, first action time, pending-state time, second action, response time, and final render in one short row for the run. Keep timestamps relative to the case start.

Assert that the loading marker appears while the route is waiting. Also assert the submit control is disabled, busy, or otherwise unable to start a second mutation.

Attempt the second supported input path during the pending window. If both click and Enter can submit, cover each path without forcing an impossible event unless the test explicitly checks defense in depth.

Count matched requests in the handler or network log. The release rule should require one mutation request and one final success state.

Add a timeout case with a separate response plan. A client timeout or product error timer should end in the specified message and restore usable controls.

Retain the fixed response status and safe body shape. Do not print tokens, personal data, or full live payloads in the CLI transcript.

Confirm route cleanup by listing routes or running the fast control after \`unroute\`, with the same page and safe test data still in view for a fair last check. Record that result so later failures do not inherit hidden timing.

CI should use a named session per job and a unique artifact path. Shared sessions can keep cookies, tabs, and route state that make request counts hard to trust.

The [skills directory](/skills) can provide reusable race checks, but each project must define its mutation endpoint and duplicate rule. A generic spinner cannot prove server data stayed singular. Playwright CLI delayed response mocking passes this gate when one held request causes the planned UI, a second input sends no extra mutation, and cleanup restores the fast control.

## Playwright Run-code Delayed Mock Comparison Table

A playwright run-code delayed mock should be chosen by the fault being modeled. The table separates slow success, transport failure, fast control, and live integration timing.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| Delayed fulfill | Model a slow completed API reply with fixed content | Matched request, delay, pending UI, response, and cleanup | The delay becomes a general sleep |
| Route abort | Model a transport fault with no application reply | Abort reason, error UI, retry state, and route removal | The case is mislabeled as server latency |
| Immediate fulfill | Prove the same flow with a fast fixed response | Request count, response body shape, and final UI | It never exercises pending behavior |
| Real service delay | Run an owned integration timing case | Environment, service revision, timing, and data | Shared timing makes results hard to repeat |

Delayed fulfillment is the main choice for loading and duplicate-submit checks. It preserves a completed response while making the pending window long enough to inspect.

Abort belongs to offline and transport handling. It should not share assertions with a slow response that eventually returns valid data.

Immediate fulfillment is the required control. Use the same route, request, and body without the delay so schema or selector faults become clear.

Real service timing has value in an integration lane, but it adds network and service inputs. Keep it out of the deterministic browser behavior gate.

Every row requires cleanup and a final state check. A route command that succeeded is setup evidence, not proof that the user flow behaved correctly.

The [blog index](/blog) links network mocks with API, browser, and race testing methods. Select the smallest method that can prove the product rule.

Playwright CLI delayed response mocking review should reject any row that lacks a matched request record. Without that event, the apparent delay may come from another page resource.

## How Do You Implement Playwright CLI Delayed Response Mocking?

Implement Playwright CLI delayed response mocking by opening one named session, registering a narrow async route, and checking the page during its wait. Count requests, fulfill fixed JSON, assert the result, then unroute.

1. Read \`seed-skills/playwright-cli/references/request-mocking.md\` and define the exact URL pattern, method, delay, status, and response body.
2. Open a named CLI session, register the route before the action, and prove the route appears in the active route list.
3. Trigger one request, assert the loading marker and disabled submit state, then attempt the supported second input.
4. Require one matched mutation, one fixed response, one final success result, and the expected timeout behavior in its own case.
5. Capture the UI timeline, request count, response summary, and cleanup result without retaining secrets.
6. Remove the route, run the immediate control, close the session, and repeat the focused flow in CI.

The primary command follows the repository delayed-response pattern. Its handler waits for 1.5 seconds only after the order endpoint matches, then sends one deterministic result.

\`\`\`bash
playwright-cli -s=slow-order run-code "async page => {
  await page.route('**/api/orders', async route => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 42, status: 'accepted' })
    });
  });
}"
\`\`\`

Use fake names and fixed IDs that the test owns. If request content affects the result, inspect and validate only the required fields before fulfillment.

The second example drives the pending state in the same named session, captures a snapshot, and removes the route afterward. Replace snapshot refs with those returned by the current page.

\`\`\`bash
playwright-cli -s=slow-order open https://example.test/orders/new
playwright-cli -s=slow-order fill e4 "QA keyboard"
playwright-cli -s=slow-order click e7
playwright-cli -s=slow-order snapshot
playwright-cli -s=slow-order run-code "async page => {
  const submit = page.getByRole('button', { name: 'Submit order' });
  const disabled = await submit.isDisabled();
  const status = await page.getByRole('status').textContent();
  if (!disabled || !status?.includes('Submitting')) {
    throw new Error('Pending submit state was not shown');
  }
}"
playwright-cli -s=slow-order unroute "**/api/orders"
\`\`\`

The exact CLI build may expose assertion helpers through its supported runtime context. When it does not, use snapshot and DOM checks in CLI, then move the stable rule into Playwright Test.

The race guidance in \`seed-skills/race-condition-finder/SKILL.md\` adds the one-request oracle. Count matched POST requests rather than assuming a disabled button stopped every input path.

Begin with an immediate response that uses the same JSON. This control proves the page, route pattern, response schema, and final selector before delay enters the case.

Register the delayed route next and call \`route-list\`. A missing route should stop the test before click, since no later spinner result can prove the intended mock ran.

Use a delay from 500 to 1,500 milliseconds for most local checks, then choose the smallest value that leaves the pending state easy to observe. The exact bound belongs to the project.

Do not put \`waitForTimeout(1500)\` before the loading assertion. Assert the loading state as soon as the click starts, while the route itself provides the pending period.

Check the button, live status, and request count during that period. A spinner alone may render while the button still permits another mutation.

Attempt the normal second input only. Forced clicks can be useful for a hardening test, but they bypass browser action checks and should be labeled as a control.

After the response, require one success message and one record identifier. Also verify the spinner leaves and the submit control returns to its specified state.

For timeout behavior, use a separate route with a delay beyond the client-owned bound. Assert the exact product error and confirm another submit can start after recovery.

Never let the timeout case share a pending handler with the success case. Remove the first route, confirm no active match, and then register the next plan.

Save a short request record rather than a full payload, and keep that row beside the page check from the same point in time. Method, safe path, relative start, relative finish, and count are enough for this race decision.

On failure, capture the current snapshot, console errors, and network events. Those facts distinguish a UI race from a handler that never matched.

Use a unique named session in CI. Close it at the end and remove any stored profile data when the run created state that later jobs could load.

The [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli) can guide session and route commands. Keep real credentials and personal response data outside the saved transcript.

The [Playwright CLI guide](/blog/playwright-cli-complete-guide-2026) helps verify installed command syntax. Pin the reviewed CLI version in CI so a command change does not look like a product race.

Run the focused workflow before a broad suite. A small job can state one endpoint, one delay, one action, one request count, and one final result.

Then run the maintained Playwright test under normal CI settings. The CLI flow is useful for diagnosis and agent work, while source-controlled tests provide the lasting release gate.

Playwright CLI delayed response mocking is complete when the delayed success, timeout, duplicate input, and immediate control each have distinct results. Route cleanup must pass after every branch.

## Frequently Asked Questions

### What is the safest way to use playwright cli slow api mock?

Match one owned endpoint, register before the user action, wait inside the async route handler, and fulfill fixed safe data. Use the shortest useful delay. Assert pending UI and one request, then remove the route and run an immediate control before closing the named session.

### How do you verify delay route fulfill response?

Record when the route matches, when the pending UI appears, and when fulfillment completes. Check the fixed response status plus final user result. A route-list entry proves setup only; the matched request, UI timeline, and completed response together prove that the delayed handler controlled the case.

### When should a QA team choose test loading spinner playwright cli?

Choose it when a known request should show progress, guard another action, and end in a fixed result. Use abort for transport failure and an immediate mock when timing is irrelevant. Use a live service only in a separate integration lane that owns its timing.

### What causes failures in simulate api latency browser?

Common causes include late route registration, broad patterns, wrong methods, invalid mock bodies, missing fulfillment, leaked handlers, or CLI session loss. Product faults include duplicate writes and stale UI. Compare active routes, matched requests, console output, snapshots, and final server state before changing waits.

### Which evidence should duplicate submit race test retain?

Retain the matched safe URL and method, fixed delay, first and second input times, pending UI state, request count, response status, final result, and unroute check. Redact credentials and payload secrets. This record proves whether one held mutation allowed another request or only another click event.

### How should CI handle playwright run-code delayed mock?

Use a unique named session, pinned CLI version, fixed route data, bounded delay, and run-specific artifacts. Execute the immediate control and delayed case before the timeout case. Always unroute and close the session, then run the maintained browser test with normal CI settings.

## Conclusion

Playwright CLI delayed response mocking controls one response so loading and race behavior can be observed without relying on a slow live service. Delay the matched route, not the whole test, and keep the reply deterministic.

Adoption needs the matched request, delay, UI timeline, request count, fixed response, final state, and cleanup result. The immediate control and timeout case should stay separate from delayed success.

Browse the [skills catalog](/skills), then open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli). Install it and apply this focused verification workflow before accepting a loading or duplicate-submit change.`,
};
