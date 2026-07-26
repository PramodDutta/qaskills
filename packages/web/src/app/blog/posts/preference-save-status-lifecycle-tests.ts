import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Preference save status lifecycle tests',
  description:
    'preference save status lifecycle tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'preference save status lifecycle tests',
  keywords: [
    'preference save status lifecycle tests',
    'saving button disabled test',
    'success message fake timer',
    'preference save error ui',
    'react async status testing',
    'notification message cleanup test',
  ],
  relatedSlugs: [
    'react-nextjs-testing-complete-guide',
    'error-handling-testing-patterns',
    'authentication-authorization-testing-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://react.dev/reference/react/useState',
    'https://vitest.dev/guide/mocking/timers',
  ],
  repoEvidence: [
    'packages/web/src/app/dashboard/preferences/page.tsx:savePreferences',
    'packages/web/src/app/api/user/preferences/route.ts:PATCH',
  ],
  content: `Preference save status lifecycle tests should hold PATCH pending, prove the button becomes disabled, and confirm a second click cannot start another request. Resolve success and failure separately, verify exact messages and analytics counts, then advance fake time across five seconds. The suite must also document that the current timer has no explicit unmount cleanup.

The client behavior comes from \`packages/web/src/app/dashboard/preferences/page.tsx:savePreferences\`. The persistence contract comes from \`packages/web/src/app/api/user/preferences/route.ts:PATCH\`, including its 401, 404, update, insert, and 500 branches.

This guide separates status timing from preference loading, although both helpers share one page. Use the [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) for common render providers, then keep save assertions focused on PATCH.

## Preference save status lifecycle tests: What Must the Suite Prove?

Preference save status lifecycle tests must prove the complete sequence from idle through pending to settled and cleared. The observable contract includes button text, disabled state, request body, message content, analytics, fetch count, timer timing, and the final return to the idle label.

When save starts, the helper sets \`saving\` true and clears any prior message. It sends a PATCH to \`/api/user/preferences\` with a JSON content type and the current four-field state. The button reads "Saving..." and is disabled while that state is true.

An OK response tracks \`email_preferences_updated\` once with four string values. It then sets the exact success message and schedules \`setMessage(null)\` after 5000 milliseconds. The response body is not read by the client.

A non-OK response throws a new local Error, and a rejected fetch reaches the same catch block. Both paths set the exact error message and schedule the same five-second removal. Neither path tracks a successful update event.

The \`finally\` block sets \`saving\` false after either result. Therefore the button returns to "Save Preferences" and becomes enabled while the message remains visible. Saving state and message lifetime are related, but they do not end together.

The server PATCH reads JSON before selecting a local user. It returns 401 without a Clerk identity and 404 when no matching database user exists. A known user triggers update, then insert when update returns no rows.

The [React useState reference](https://react.dev/reference/react/useState) explains state setters and queued renders. Tests should assert visible state after user actions rather than reading component variables that are not part of the public interface.

Open [dashboard preferences](/dashboard/preferences) for the route-backed pass after component timing is stable. A real browser should exercise the same duplicate-click and message rules.

## Which QASkills Code Paths Own This Contract?

The page owns the user-visible lifecycle. Its \`saving\` state controls both button text and disabled state, while \`message\` controls a colored status block. The status block displays a success or alert icon based on its stored type.

The helper clears the prior message before awaiting fetch. This matters when a user saves again while an earlier result still shows. A test should begin with one completed result, click save again, and assert the old text disappears during the new pending request.

The page sends the whole preference object, not only changed fields. Toggle setup should create a distinctive body such as false, true, false, and true. An all-true body can conceal a stale closure or a failed toggle action.

On success, analytics values are converted with \`String\`. The event payload therefore contains \`'true'\` and \`'false'\`, not booleans. Preference save status lifecycle tests should assert that type boundary and exactly one tracking call.

The PATCH route owns authentication and storage. It calls \`currentUser\`, parses the body, selects a user by Clerk id, and updates the matching preference row with four received fields plus a new \`updatedAt\` value.

If update returns an empty array, the route inserts a preference row with the same four values and user id. The response is the first updated or created row. No runtime body schema appears in this handler, so tests should not claim validation that does not exist.

Exceptions from JSON parsing, auth, selection, update, or insert become \`{ error: 'Failed to update preferences' }\` with status 500. The client reduces every non-OK result to its generic retry message and does not display the route body.

Use the [authentication testing guide](/blog/authentication-authorization-testing-guide) for a wider session matrix. Here, route status exists to prove the save UI reacts correctly to the server boundary.

## Saving button disabled test: Baseline Cases

A saving button disabled test needs a deferred fetch promise. An immediately resolved mock can move through pending before the assertion observes it, which leaves the duplicate-click contract untested.

Render after controlling the initial GET or bypass that setup through a focused page harness. The save button is unavailable while the page's loading view is active, so the test must first reach Email Preferences. Then set a known switch pattern before saving.

Click once and hold the PATCH promise unresolved. Assert the button has disabled state, its label is "Saving...", the prior message is absent, and fetch has one PATCH call. The request body must equal the visible switch values at click time.

Try a second user click while the button remains disabled. A realistic user-event helper should respect disabled controls and leave fetch at one call. Avoid invoking the internal helper directly because that bypasses the protection being tested.

Resolve an OK Response-shaped object. Wait for "Save Preferences" to return, assert the button is enabled, and check the exact success text. The message should remain while the button has already returned to idle.

Repeat with \`ok: false\` and with a rejected promise. Both should restore the button and show "Failed to save preferences. Please try again." The successful analytics event should remain absent for each failure.

Run one retry case after a failed save. The second pending action clears the first error, and its success replaces that state with success text. This catches stale status that survives into a later request.

The [error handling testing article](/blog/error-handling-testing-patterns) can supply transport doubles. Keep this baseline strict about one request and exact visible transitions.

## Success message fake timer: Test Matrix

A success message fake timer suite should inspect pending, settled, and timer boundary states. The matrix also distinguishes HTTP failure from transport rejection even though they share one visible result.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Successful save | Deferred PATCH resolves \`ok: true\` | Success branch then \`finally\` | Success text, enabled idle button | Analytics once and one 5000 ms timer | Body read or duplicate event |
| Non-OK API response | PATCH resolves \`ok: false\` | Throw then catch | Error text, enabled idle button | No success analytics, one timer | Route error body shown |
| Network rejection | PATCH rejects with known Error | Catch then \`finally\` | Same error text and idle button | No success analytics, one timer | Unhandled rejection |
| Second click while saving | First PATCH remains pending | Disabled button | One pending request only | No message until settlement | Fetch called twice |
| Message at 4,999 and 5,000 ms | Settled result with fake time | Timeout callback | Present before boundary, absent at boundary | One callback fires | Early or late cleanup |

The success row should assert the event name and all four string fields. It should also prove the response body is irrelevant by using a mock without a JSON method. The helper checks only \`res.ok\`.

The non-OK row creates a local Error and then catches it. Since the catch does not log or expose that object, assertions belong on the generic message, request count, timer, and missing analytics call.

The rejection row should use the same visible assertions but retain a separate case name. This preserves transport coverage and catches a missing catch block. Do not expect console output because this save helper does not log its caught error.

The second-click row should use a user-level click against the disabled button. A direct call to \`savePreferences\` can issue duplicates because the function itself contains no early \`saving\` guard. The UI property is the protection under test.

At 4999 milliseconds, the message must still be present. Advance one more millisecond inside the test runner's timer-aware update, then assert it is gone. This gives a precise boundary without waiting five wall-clock seconds.

Run both success and error cleanup cases because each branch schedules its own timeout. The timer duration is the same, but separate assertions catch one branch losing its scheduling call.

Use [dashboard preferences](/dashboard/preferences) for one browser observation with real time only if needed. Fake timers should own the exact boundary because they are faster and deterministic.

## How Should Preference save error ui Be Exercised?

Preference save error ui should be tested from the user's action through the visible alert. Set a distinctive preference state, start PATCH, and assert pending output before choosing a resolved error or rejected promise.

Mock fetch by request method because the page also performs GET on mount. A queue based only on call order becomes hard to read after remounts. A method-aware handler can return initial preferences for GET and a deferred outcome for PATCH.

The component sketch below uses fake timers, a deferred result, and accessible output. Project setup may wrap the page for aliases and other providers, but the assertions target the current component contract.

\`\`\`tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import PreferencesPage from '@/app/dashboard/preferences/page';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('disables duplicate save and clears the error at five seconds', async () => {
  vi.useFakeTimers();
  let resolvePatch!: (value: { ok: boolean }) => void;
  const patch = new Promise<{ ok: boolean }>((resolve) => {
    resolvePatch = resolve;
  });
  vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) =>
    init?.method === 'PATCH'
      ? patch as Promise<Response>
      : Promise.resolve({
          ok: true,
          json: async () => ({
            emailNotifications: true,
            weeklyDigest: true,
            newSkillAlerts: true,
            packAlerts: true,
          }),
        } as Response),
  );

  render(<PreferencesPage />);
  const save = await screen.findByRole('button', { name: 'Save Preferences' });
  await userEvent.click(save);
  expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Saving...' }));
  expect(fetch).toHaveBeenCalledTimes(2);

  await act(async () => resolvePatch({ ok: false }));
  expect(await screen.findByText('Failed to save preferences. Please try again.')).toBeVisible();

  await act(async () => vi.advanceTimersByTime(4999));
  expect(screen.getByText('Failed to save preferences. Please try again.')).toBeVisible();
  await act(async () => vi.advanceTimersByTime(1));
  expect(screen.queryByText('Failed to save preferences. Please try again.')).toBeNull();
});
\`\`\`

The total fetch count is two because one GET loaded the page and one PATCH saved it. A stronger assertion should filter calls by \`init?.method === 'PATCH'\` and expect one. That avoids hiding duplicate PATCH behind unrelated reads.

Assert the status block appears only after the PATCH settles. While pending, the old message has been cleared and no new message exists. This distinction catches eager success text that appears before a server result.

For the rejected variant, reject with a known Error and await the same generic text. Attach an unhandled rejection listener only when the test runner supports safe cleanup, then prove no uncaught event survives the helper.

The [API testing guide](/blog/api-testing-best-practices-guide) can guide direct status checks. Do not require the client to show backend error text because current code deliberately replaces it.

## Step-by-Step React async status testing Procedure

React async status testing should keep promise control and clock control separate. Resolve the request first, let React commit the message, and only then move fake time.

1. Render preferences with a controlled PATCH promise and fake timers.
2. Click save twice while the first request remains pending and assert one request.
3. Resolve success and failure outcomes, then assert button and status transitions.
4. Advance timers across the five-second boundary and verify cleanup plus unmount safety.

Step one should complete the initial GET before fake time assertions begin. Capture the baseline fetch count and reset only the call history if that makes PATCH checks clearer. Never replace the implementation while leaving stale mocked calls unexplained.

Step two uses the actual disabled button. Confirm its label changed before the second click, because that state update is the user-facing duplicate guard. Count PATCH calls rather than all fetch calls.

Step three should be parameterized across OK, non-OK, and rejection. Success checks one analytics event and success text, while both failures check zero success events and error text. Every row must restore the idle button through \`finally\`.

Step four checks 4999 and 5000 milliseconds after message creation. The current component does not store the timer id or return an unmount cleanup function. Therefore an unmount case should document that the callback remains scheduled rather than falsely asserting \`clearTimeout\`.

If unmount cleanup becomes a requirement, implementation must retain the timer id and clear it during teardown. Add that behavior first, then change the test to assert no pending timer. Current tests should expose the gap without pretending it is solved.

Repeat the sequence on [dashboard preferences](/dashboard/preferences) after changes to status copy or button layout. Use the [React testing guide](/blog/react-nextjs-testing-complete-guide) to align act and user-event setup.

## Notification message cleanup test: Assertions and Diagnostics

A notification message cleanup test needs one clock origin: the moment \`setTimeout\` is scheduled after settlement. Advancing time while PATCH is pending should not consume message lifetime because no timer exists yet.

Use Vitest's [timer mocking guide](https://vitest.dev/guide/mocking/timers) for fake clock setup and restoration. Always call \`vi.useRealTimers()\` in cleanup, since leaked fake timers can distort unrelated suites.

Assert the timer call uses a 5000 delay and that only one cleanup timer exists per settled save. Do not require the callback's internal identity. Visible message removal at the boundary provides the stronger behavioral proof.

The success branch should track before setting status and scheduling removal. A test can capture call order if that order matters to analytics debugging, but the core contract is one event and one message. Avoid brittle ordering between React render internals.

The route-backed example below proves PATCH's create-after-empty-update behavior. It focuses on response and mutation counts while leaving UI timing to the component suite.

\`\`\`ts
import { expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

const currentUser = vi.fn().mockResolvedValue({ id: 'clerk-user' });
const returning = vi
  .fn()
  .mockResolvedValueOnce([])
  .mockResolvedValueOnce([{ userId: 'db-user', weeklyDigest: false }]);

vi.mock('@clerk/nextjs/server', () => ({ currentUser }));
vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ id: 'db-user' }] }),
      }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning }) }),
    }),
    insert: () => ({
      values: () => ({ returning }),
    }),
  },
}));

test('PATCH inserts preferences when update returns no row', async () => {
  const { PATCH } = await import('@/app/api/user/preferences/route');
  const request = new NextRequest('http://local/api/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify({
      emailNotifications: true,
      weeklyDigest: false,
      newSkillAlerts: true,
      packAlerts: false,
    }),
  });

  const response = await PATCH(request);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    userId: 'db-user',
    weeklyDigest: false,
  });
  expect(returning).toHaveBeenCalledTimes(2);
});
\`\`\`

Add route tests for 401 before selection, 404 before mutation, successful update without insert, and thrown update with 500. Assert request values reach update or insert unchanged because no schema transform occurs in this handler.

CI output should show case, PATCH count, button label, disabled state, message type, timer count, and analytics count. These fields distinguish duplicate requests, stuck saving, wrong copy, early cleanup, and false success tracking.

Read the [error handling article](/blog/error-handling-testing-patterns) for broader diagnostic patterns. Keep captured request bodies free of unrelated user data.

## What Regressions and Boundaries Prevent False Confidence?

An immediately resolved PATCH cannot prove disabled behavior. Hold the promise open until the suite observes "Saving..." and attempts the second click. This is the only reliable way to test the pending window.

Counting all fetch calls can also mislead because page mount sends GET. Filter calls by method and URL, then assert one PATCH. A total count should be used only when the initial request is also part of the named expectation.

Success text without analytics is a regression, as is analytics on a failed response. Assert the exact event name, string values, and one call only after \`ok: true\`. Do not count preference toggle events as save events.

Timer tests can pass too early when time advances before React commits the message. Await the text first, then begin the 4999-plus-one sequence. Restore real timers even when an assertion fails.

The current implementation does not cancel scheduled message cleanup on unmount. A test should report pending timers after unmount rather than asserting a cleanup function that does not exist. If the suite requires zero timers, the code must change in a separate task.

PATCH body validation is another boundary. The route destructures four values but does not run a schema here. Test observed behavior and cover malformed data only as a known gap, not as a rejected contract that current code cannot satisfy.

Preference GET errors, toggle analytics, and email unsubscribe are nearby but separate. Use the [authentication guide](/blog/authentication-authorization-testing-guide) for wider access checks and keep this suite centered on save lifecycle.

Finally, run a browser case with a delayed route response and two quick click attempts. The [QASkills blog](/blog) can connect this result to other regression plans without turning one test into a full application tour.

Keep one short run sheet beside the timer tests. It should name the state before each click, the count after each click, and the exact time moved after the response. Preference save status lifecycle tests are easier to trust when the report shows this small chain. A clear chain also helps spot a stale call from the first GET.

Use these checks as the final save gate:

- load the page with a mixed set of four known switch values
- clear old save text before the next PATCH starts
- hold the first PATCH open until the disabled button is seen
- try the second click through the same disabled user control
- count PATCH calls on the preference URL and expect just one
- compare the sent JSON body with all four visible switch states
- resolve success without reading any body from the mock response
- track one success event with four string values and no more
- resolve a non-OK response and show the fixed retry text
- reject the request and show the same fixed retry text
- keep each status message in view through 4999 fake milliseconds
- clear each status message when the clock reaches 5000 milliseconds
- restore the idle label and enabled state after each settled request
- restore real timers and all spies even when a case fails
- note the pending timer after unmount until source cleanup is added

## Frequently Asked Questions

### How do preference save status lifecycle tests cover duplicate clicks?

Keep the PATCH promise pending, click Save Preferences, and wait for the disabled "Saving..." button. Attempt another user-level click, then count only PATCH calls and expect one. Resolve the promise afterward and assert the button returns to its enabled idle label through the helper's finally block.

### What should a saving button disabled test avoid?

Avoid immediately resolved fetch mocks, direct calls to the private helper, and counts that mix GET with PATCH. Those shortcuts skip the real pending window or hide duplicates. Use a deferred PATCH and the actual button so disabled behavior is tested through the user's available action.

### How does a success message fake timer test use five seconds?

Wait until success text appears, then advance fake time by 4999 milliseconds and confirm the text remains. Advance one more millisecond and confirm removal. Start the clock only after PATCH settles, restore real timers afterward, and repeat the boundary for the error message branch.

### What does preference save error ui display?

Both a non-OK response and a rejected fetch display "Failed to save preferences. Please try again." The button returns to "Save Preferences," success analytics does not run, and a five-second timer removes the message. The route's own JSON error text is not shown by this client helper.

### Which states matter in react async status testing?

Assert idle, pending, settled-with-message, and settled-after-cleanup states. For each state, record button label, disabled value, status text, PATCH count, analytics count, and timer state. That full sequence catches eager feedback, duplicate requests, stuck saving, missing events, early message removal, and a stale result from any prior save attempt.

### What should a notification message cleanup test say about unmount?

It should state that current code schedules a timeout without retaining or clearing its id. A present-day test can document a pending callback after unmount. It should not claim explicit unmount cleanup until the component adds teardown logic and the suite verifies that timer cancellation.

## Conclusion

Preference save status lifecycle tests should prove one PATCH during pending, exact success and failure output, correct string-valued analytics, idle restoration, and message removal at five seconds. They should also keep the missing unmount cleanup visible as a known code boundary rather than hiding it with a permissive test.

[Open dashboard preferences](/dashboard/preferences), then run duplicate-click, success, failure, and five-second cleanup cases before changing save feedback. Browse [QA testing skills](/skills) for focused techniques that can extend the surrounding regression suite.`,
};
