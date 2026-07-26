import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Preference fetch failure ui tests',
  description:
    'preference fetch failure ui tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'preference fetch failure ui tests',
  keywords: [
    'preference fetch failure ui tests',
    'react fetch error state test',
    'preference page loading test',
    'failed settings request ui',
    'default state after fetch error',
    'nextjs client fetch testing',
  ],
  relatedSlugs: [
    'react-nextjs-testing-complete-guide',
    'error-handling-testing-patterns',
    'authentication-authorization-testing-guide',
    'testing-missed-clerk-webhook-user-recovery',
  ],
  sources: [
    'https://react.dev/reference/react/useEffect',
    'https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware',
  ],
  repoEvidence: [
    'packages/web/src/app/dashboard/preferences/page.tsx:fetchPreferences',
    'packages/web/src/app/api/user/preferences/route.ts:GET',
  ],
  content: `Preference fetch failure ui tests should prove that a rejected request or any non-OK response ends the loading view without replacing the page's initial true values. Render the client page, control fetch, wait for the switches, and assert their states. Also check that rejection logs once while non-OK responses remain silent under current code.

The verified client contract lives in \`packages/web/src/app/dashboard/preferences/page.tsx:fetchPreferences\`. Its server peer is \`packages/web/src/app/api/user/preferences/route.ts:GET\`, which supplies success data plus 401, 404, and 500 responses.

This guide tests the code that exists today, while marking stronger feedback as a future product choice. Review the broader [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) when the harness needs shared render, request, or browser setup.

## Preference fetch failure ui tests: What Must the Suite Prove?

Preference fetch failure ui tests must prove two facts together: loading ends after every settled request, and failed reads leave the initial preference object unchanged. A test that checks only the visible true switches can pass before the request settles, so it does not prove the error branch completed.

The page starts \`loading\` as true and initializes four fields as true. Its effect calls \`fetchPreferences\` once after mount, and the helper reaches \`setLoading(false)\` in a \`finally\` block. That final step runs after a successful response, a non-OK response, or a rejected promise.

The current helper updates preferences only when \`res.ok\` is true. A 401, 404, or 500 response therefore skips JSON parsing and retains the initial object. A rejected fetch reaches the catch block, writes one console error, and then finishes loading.

Those branches create observable pass criteria. The pulse skeleton disappears, the Email Preferences heading appears, all four switches remain checked, the three child switches remain enabled, and fetch receives \`/api/user/preferences\` once. Rejection also produces the exact error prefix, while a plain non-OK response does not.

The server route gives meaning to each status. It returns 401 without a Clerk user, 404 when the Clerk identity has no database row, and 500 when the guarded work throws. Existing preferences return JSON, while a missing preference row is created with four true defaults.

The [React useEffect reference](https://react.dev/reference/react/useEffect) explains that effects connect a component to an external system after rendering. In this page, the external system is the preference endpoint, so the suite must wait for the effect rather than inspect only the first render.

Use the live [dashboard preferences route](/dashboard/preferences) as the browser target after component cases pass. The browser check should retain the same assertions instead of replacing them with a screenshot.

## Which QASkills Code Paths Own This Contract?

Two files own the narrow read contract, and each should have a different test layer. The client file owns initial state, effect timing, response gating, console reporting, and loading cleanup. The route file owns identity checks, database selection, default-row creation, status codes, and JSON bodies.

In \`packages/web/src/app/dashboard/preferences/page.tsx\`, the component declares \`loading\`, \`saving\`, \`message\`, and \`preferences\` separately. Read failures do not set \`message\`, so preference fetch failure ui tests must not expect the red save-error banner. That banner belongs only to the PATCH helper.

The client renders only a pulse layout while loading is true. Once loading becomes false, it renders four switch buttons with \`aria-checked\` values from state. The three specific switches are disabled only when the master email switch is false.

In \`packages/web/src/app/api/user/preferences/route.ts\`, GET calls \`currentUser()\` before any database query. A missing user exits with 401. A known Clerk user then selects a local user row, and no row exits with 404 before preference storage is read.

When a local user exists, GET selects one preference row. No preference row triggers an insert using true for every field, then returns the inserted record. An existing row returns directly, while any thrown error becomes a JSON 500 response.

This split prevents a weak mock from inventing server behavior inside a component test. Route tests should prove status and persistence branches directly, while client tests should feed representative responses through the real \`fetchPreferences\` call.

Next.js describes route handlers as request handlers defined in a route file in its [route handler documentation](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware). That source supports testing HTTP output at the route boundary, but QASkills code remains the source for these exact statuses and fields.

The [authentication testing guide](/blog/authentication-authorization-testing-guide) covers broader identity cases. Keep this suite focused on how those route outcomes change the preference page.

## React fetch error state test: Baseline Cases

A react fetch error state test needs a stable success case before any failure fixtures. Return an OK response with a mixed preference object, then wait for the heading and assert each switch. This confirms the mock shape can drive real state rather than merely remove the skeleton.

Use a mixed object such as true, false, true, and false. All-true server data matches the initial object, so a broken \`setPreferences\` call could pass unnoticed. The mixed fixture proves JSON parsing and field assignment both occurred.

The next baseline is a resolved 500 response. Set \`ok\` to false and make \`json\` throw if called. The page should complete loading without calling JSON, and all switches should keep their original true values.

Repeat that case with 401 and 404 because the server emits both for distinct identity states. The client treats all non-OK statuses alike, but parameterized labels preserve which backend contract was represented. They also give clearer reports when status handling later changes.

The rejection case should reject with a known Error instance. Spy on \`console.error\`, render the component, and wait for the normal page. Assert the prefix, the same Error object, one request, and one console call before restoring the spy.

Do not assert a visible error banner under current behavior. No fetch error is copied into \`message\`, and the save banner is not part of the read path. If product requirements add read feedback, update implementation and tests together rather than encoding that wish as current fact.

Malformed success data is a separate compatibility boundary. The helper copies four properties without validation, so absent properties become \`undefined\` and produce unchecked switches. A focused test should document that current outcome, while a schema change can later define safer fallback behavior.

The [error handling patterns guide](/blog/error-handling-testing-patterns) can supply broader network fixtures. For this page, keep the baseline tied to loading completion and the exact four switch states.

## Preference page loading test: Test Matrix

A preference page loading test should report the controlled fetch result, JSON access, final view, and diagnostic signal. The matrix below separates outcomes that look similar after rendering but follow different client branches.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Successful preference response | OK with mixed JSON fields | \`res.ok\` and \`setPreferences\` | Skeleton ends and switches match JSON | JSON called once | Initial true values remain |
| 401 or 404 response | Resolved response with \`ok: false\` | Non-OK skip | Skeleton ends and true defaults remain | JSON is not called | Page stays on pulse view |
| 500 response | Resolved response with \`ok: false\` | Non-OK skip | Normal page with true defaults | No console error from helper | Error banner is invented |
| Network rejection | Fetch rejects with known Error | \`catch\` then \`finally\` | Normal page with true defaults | Console error once | Unhandled rejection or endless loading |
| Malformed success payload | OK JSON missing known fields | Assignment with undefined values | Missing fields render unchecked | JSON called once | Test silently treats data as valid |

The success row proves the positive route, not the failure policy. It should use values unlike the defaults and assert each accessible switch by its label. That makes the row sensitive to field mapping errors.

The 401 and 404 rows share a client outcome because only \`res.ok\` is inspected. Still, separate case names matter because one means no authenticated user and the other means no local user row. Route tests should assert those bodies independently.

The 500 row is resolved, not rejected. Fetch resolves for HTTP error statuses, so the helper does not enter its catch block. Preference fetch failure ui tests should preserve that distinction by checking that the rejection spy stays quiet for this row.

The rejection row proves both catch and finally. Waiting only for the console call is insufficient because loading could remain true afterward. Waiting only for the heading misses the diagnostic contract and could hide an unhandled promise.

The malformed row records a gap rather than approving it. The current code has no runtime schema check, so tests should state the observed switch result without claiming it is safe. A later validator can change that row intentionally.

Link the matrix to a browser pass on [dashboard preferences](/dashboard/preferences) after component assertions are stable. A real route fault can then confirm the page does not remain trapped in its pulse layout.

## How Should Failed settings request ui Be Exercised?

Failed settings request ui coverage should use a component harness for precise state and a route harness for precise status. The component harness controls global fetch, spies on console only for rejection, and queries the rendered controls by role and accessible name.

Start with a fetch mock that exposes \`ok\` and \`json\` independently. Returning only a JSON object is not a Response-shaped contract and can skip the branch under test. A deferred promise is useful when proving the skeleton remains until settlement.

This Vitest-style example targets the current client behavior. It treats the component import as project-specific setup because aliases, Clerk wrappers, and UI providers depend on the local test configuration.

\`\`\`tsx
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import PreferencesPage from '@/app/dashboard/preferences/page';

afterEach(() => vi.restoreAllMocks());

test('retains defaults and completes loading after fetch rejects', async () => {
  const failure = new Error('offline');
  vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(failure);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(<PreferencesPage />);

  expect(screen.queryByRole('heading', { name: 'Email Preferences' })).toBeNull();
  expect(await screen.findByRole('heading', { name: 'Email Preferences' })).toBeVisible();

  for (const name of ['Email Notifications', 'Weekly Digest', 'New Skill Alerts']) {
    expect(screen.getByRole('switch', { name })).toHaveAttribute('aria-checked', 'true');
  }
  expect(screen.getByRole('switch', { name: 'Pack Release Alerts' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await waitFor(() =>
    expect(errorSpy).toHaveBeenCalledWith('Failed to fetch preferences:', failure),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
\`\`\`

The first negative assertion proves that the initial render is still loading. The later heading proves finalization, and the switch checks prove defaults survived. The console assertion confirms the rejection branch rather than a resolved non-OK branch.

Add a second test with \`mockResolvedValueOnce({ ok: false, json })\`. Assert that \`json\` and \`console.error\` remain unused while the heading appears. This catches code that starts parsing an error body or changes the current diagnostic rule.

Keep route behavior out of that component double. A route-level test can mock Clerk and database calls, then invoke GET and inspect \`status\` plus JSON. This makes failures point to the owner instead of one oversized browser case.

Use the [getting started route](/getting-started) when a clean account is needed for a manual check. Automated cases should create identity and database state directly, so they remain repeatable.

## Step-by-Step Default state after fetch error Procedure

Default state after fetch error testing works best as one ordered path from mount through remount. Keep each input deterministic, and record which response shape produced the final state.

1. Render the authenticated preference page with deterministic initial defaults.
2. Control GET outcomes for success, non-OK, rejection, and malformed data.
3. Wait for loading completion and assert switch values, disabled states, and visible feedback.
4. Navigate away and back to detect stale state or unhandled promise warnings.

Step one should also verify the skeleton before fetch settles. Use a deferred response, because an immediate mock can finish before the assertion runs. Resolve it only after the test confirms that normal controls are not yet present.

Step two should use one case table rather than changing mocks inside a long test. Give every case an explicit \`ok\` value, optional JSON body, and optional rejection. This layout makes the fetch contract readable when a failure appears in CI.

Step three must pair a loading assertion with state assertions. For non-OK and rejected results, all four switches remain true and the child switches stay enabled. For mixed success data, each control follows its returned field.

Visible feedback requires careful wording. Current read failures display no banner, so assert absence of both save messages rather than expecting a new notice. The rejection has a console signal, while resolved status errors have no client signal beyond retained defaults.

Step four remounts a fresh component instead of reusing prior state. Confirm fetch runs once per mount and that no unhandled rejection appears. A cached test mock should not accidentally reuse a consumed Response object.

Run this procedure before changing preference defaults or effect timing. Then compare results with the [React testing guide](/blog/react-nextjs-testing-complete-guide) so shared setup remains consistent across client pages.

## Nextjs client fetch testing: Assertions and Diagnostics

Nextjs client fetch testing should preserve five classes of evidence: request, branch, state, view, and side effects. A report that says only "switch expected true" cannot reveal whether the failure came from loading, JSON parsing, field mapping, or a bad fixture.

For the request, assert the exact relative path and one call per mount. The helper uses the default GET method, so do not require an explicit method option that the code does not send. Record unexpected extra calls because effect changes can duplicate work.

For branch selection, let the non-OK fixture fail if JSON is read. Let the success fixture provide a spy-backed JSON method and assert one call. For rejection, retain the original Error object so the console assertion proves the same cause reached catch.

For state and view, query the heading, each switch, disabled attributes, and any message region. Avoid class-name assertions for the pulse animation because they tie the test to styling. User-facing roles and labels give a steadier signal.

For server output, this route-level sketch controls the auth exit and reads the actual NextResponse. The database case can follow the same pattern with a chainable query double.

\`\`\`ts
import { beforeEach, expect, test, vi } from 'vitest';

const currentUser = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({ currentUser }));

beforeEach(() => currentUser.mockReset());

test('GET returns 401 before preference queries without a Clerk user', async () => {
  currentUser.mockResolvedValue(null);
  const { GET } = await import('@/app/api/user/preferences/route');

  const response = await GET();

  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  expect(currentUser).toHaveBeenCalledTimes(1);
});
\`\`\`

Extend the route set with a known Clerk user and no local row for 404. Then inject a rejected database operation for 500, asserting \`{ error: 'Failed to fetch preferences' }\`. Keep default-row creation as a positive test because it changes persistent state.

CI should print the case label, response kind, final heading presence, switch values, fetch count, and captured error name. Do not dump authentication objects or unrelated environment values. Focused output makes the failed branch clear without exposing account data.

The [QASkills blog](/blog) can group this suite with related client and route checks. Keep the actual assertions close to the preference feature so code owners can rerun them quickly.

## What Regressions and Boundaries Prevent False Confidence?

Retained defaults can mimic a successful all-true response, so preference fetch failure ui tests must always include a mixed success fixture. Without that control, a helper that never parses JSON could pass every failure case and still appear correct.

An endless skeleton is the main cleanup regression. Force every fetch outcome to settle, then assert the heading appears within the test runner's normal wait. Do not remove the \`finally\` requirement from the test just because values look safe.

An error banner is another boundary. The existing page displays save results only, and read errors do not enter message state. Tests should reject invented feedback today while leaving room for a product change with explicit copy and accessibility requirements.

Malformed JSON and partial objects deserve named coverage because no client schema guards them. A thrown \`res.json()\` error follows catch and preserves defaults. A resolved partial object reaches state assignment and can make omitted switches false-like, which is a different outcome.

Development behavior may execute effect setup more than once under React checks, depending on the harness. Assert the production contract in route-backed browser coverage, and configure unit expectations knowingly. Never loosen all call-count checks merely to silence an unexplained duplicate.

Unmount timing is a nearby risk because an in-flight request may settle after navigation. The current helper has no abort controller or mounted guard. A test can observe warnings and remount behavior, but it should not claim cancellation exists.

Saving, toggle analytics, and unsubscribe behavior are outside this read suite. Cover save timing separately, and use the [authentication guide](/blog/authentication-authorization-testing-guide) for wider session boundaries. This keeps each failure report tied to one contract.

Finish with one browser post-flow that makes GET fail, waits for the normal page, and checks retained defaults. The [error handling guide](/blog/error-handling-testing-patterns) can help name transport cases without broadening this article's owner set.

- mixed success data changes at least two initial true switch values
- each HTTP error ends the pulse view without reading JSON
- a rejected fetch logs its known Error once and then ends loading
- every failed read keeps all four safe initial switch values
- remount starts one fresh request without stale state from the prior page

## Frequently Asked Questions

### How do you test loading completion after a rejected preference fetch?

Reject the controlled fetch with a known Error, render the page, and wait for the Email Preferences heading. Then assert the pulse view is gone, every switch retains its initial true state, fetch ran once, and console error received the known failure. Those checks prove catch and finally both completed.

### What should a react fetch error state test assert here?

It should assert the request path, response branch, final heading, four switch values, child disabled states, and relevant console activity. Use mixed values for success, false \`ok\` for HTTP errors, and a rejected promise for transport failure. Each fixture should identify its own final view and side effects.

### Why does a preference page loading test need mixed success data?

Mixed success data proves the page parsed JSON and copied each returned field. An all-true payload matches the initial defaults, so broken assignment could look successful. Pairing that control with failure cases distinguishes a working read path from a page that always displays its original state.

### Should failed settings request ui show an error message?

The current GET helper does not set visible message state for read failures. Resolved non-OK responses silently retain defaults, while rejected requests log to console. A test should document that behavior, not invent a banner. Adding visible feedback requires a separate product decision and matching implementation change.

### What is the expected default state after fetch error?

All four preference fields remain true because that is the component's initial object, and failed reads never call \`setPreferences\`. The master switch stays checked, while weekly digest, new skill alerts, and pack alerts remain checked and enabled. The normal page appears after the request settles.

### How should nextjs client fetch testing cover the GET route?

Use component tests for effect timing and accessible output, then route tests for Clerk, database, status, and JSON branches. Keep one route-backed browser case for integration confidence. This split catches contract drift while preserving precise diagnostics when either the client or server layer fails.

## Conclusion

Preference fetch failure ui tests are complete only when every settled outcome ends loading and each failed outcome preserves the initial preference object. Pair those checks with mixed success data, exact request counts, rejection diagnostics, and route-level status tests so a harmless-looking all-true page cannot hide a broken read during a fast local run or a slow browser job with real route setup.

[Open dashboard preferences](/dashboard/preferences), exercise GET failures on the preference page, and keep loading plus default-state assertions in the browser post-flow. Then review the [QA skills directory](/skills) for focused test practices that can strengthen the wider suite.`,
};
