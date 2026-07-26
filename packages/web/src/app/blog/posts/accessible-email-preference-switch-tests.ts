import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessible email preference switch tests',
  description:
    'accessible email preference switch tests: build a code-backed QA plan with verified QASkills paths, matrices, assertions, and regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'accessible email preference switch tests',
  keywords: [
    'accessible email preference switch tests',
    'aria checked switch tests',
    'disabled notification toggle test',
    'keyboard switch accessibility',
    'playwright preference switch test',
    'react role switch testing',
  ],
  relatedSlugs: [
    'accessibility-testing-automation-guide',
    'testing-autocomplete-keyboard-accessibility',
    'testing-modal-focus-trap-accessibility',
    'axe-core-playwright-accessibility-testing-2026',
  ],
  sources: [
    'https://www.w3.org/WAI/ARIA/apg/patterns/switch/',
    'https://playwright.dev/docs/accessibility-testing',
  ],
  repoEvidence: [
    'packages/web/src/app/dashboard/preferences/page.tsx:role switch controls',
    'packages/web/src/components/ui/button.tsx:Button',
  ],
  content: `Accessible email preference switch tests should find every control by role and stable name, assert aria-checked before and after keyboard input, and compare native disabled state with visible styling. They should disable the master setting, prove child switches cannot change, save once, reload, and confirm stored values match the announced state.

This plan tests observable behavior rather than the painted position of a small circle. The current page lives at \`packages/web/src/app/dashboard/preferences/page.tsx\`, while the shared save control comes from \`packages/web/src/components/ui/button.tsx\`. Those paths show both existing behavior and gaps that a strict suite should expose.

## Accessible email preference switch tests: What Must the Suite Prove?

Accessible email preference switch tests must prove one coherent contract across semantics, input, display, and persistence. Each binary preference needs the switch role, a stable accessible name, and an aria-checked value that matches current state. Enabled controls must respond to keyboard activation, while disabled child controls must remain unchanged.

The current preference page renders four native button elements with \`role="switch"\`. It sets \`aria-checked\` from React state and disables three child switches when email notifications are off. Their adjacent visible labels are not programmatically connected to those buttons, so role-and-name queries should currently expose a missing-name defect.

That distinction matters because a CSS color or translated thumb cannot supply an accessible name. The [WAI-ARIA switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) requires a switch role, an accessible label, and true or false aria-checked state. It also defines Space as the expected activation key and treats Enter as optional.

The suite therefore needs positive and negative pass criteria. After a name connection is present, each role-and-name locator should resolve exactly once. Before that fix, the same locator should fail clearly instead of falling back to DOM order or a broad button selector.

State assertions must cover the first render, each allowed change, master-off behavior, save feedback, and a full reload. A passing run proves that announced state and stored state remain equal. A failure should identify the control, input method, prior value, observed attribute, disabled value, and save request count.

The broader [accessibility automation guide](/blog/accessibility-testing-automation-guide) explains scan coverage, but this contract needs direct interaction assertions. Automated scans can find some missing labels, yet they cannot prove every state transition or stored value. Accessible email preference switch tests combine both forms without treating either as complete.

## Which QASkills Code Paths Own This Contract?

Two repository paths define the tested surface, and they do not own identical behavior. The page at \`packages/web/src/app/dashboard/preferences/page.tsx\` owns loading, local preference state, four switch buttons, master-child disabling, API calls, messages, and analytics events. The file at \`packages/web/src/components/ui/button.tsx\` owns the reusable Save Preferences button and forwards native button properties.

The page starts with all four values set to true, then fetches \`/api/user/preferences\`. A successful response replaces those defaults with four returned booleans. The loading shell hides the controls until that request finishes, so tests must await the Email Preferences heading before locating switches.

Each switch calls the same \`togglePreference\` helper with a different key. That helper negates one current value, updates local state, and records a preference event. The three child buttons receive \`disabled={!preferences.emailNotifications}\`, while the master remains available.

Visible styling is computed separately from announced state. The master uses the primary background when its own value is true. A child uses that background only when its own value and the master value are both true, yet its thumb position still follows the child value alone.

That design preserves a child's saved selection while the master blocks all email. A disabled weekly digest may still expose \`aria-checked="true"\` and keep its thumb on the on side. Tests should not rewrite that source-backed behavior into an unverified assumption that every disabled child becomes false.

The shared Button uses a native \`button\` unless \`asChild\` is selected. It forwards \`disabled\`, event handlers, refs, and other attributes, while its class list supplies focus-visible and disabled styles. The page uses this component only for saving, not for the four switch controls.

Repository evidence should stay separate from recommendations. Adding an accessible label connection is a needed change revealed by the contract, not behavior already present. The [keyboard autocomplete article](/blog/testing-autocomplete-keyboard-accessibility) provides nearby input ideas, while this article owns preference switches and their stored values.

## Aria checked switch tests: Baseline Cases

Aria checked switch tests begin with deterministic server values instead of relying on page defaults. Stub the initial GET response with one distinct pattern, such as master true, weekly false, skill alerts true, and pack alerts false. Distinct values catch accidental key swaps that an all-true fixture would hide.

Wait for loading to finish and query all four switches by role plus their intended names. Assert exactly four results, then compare each aria-checked string with the fixture boolean. Do not use \`nth()\` as the primary identity because markup order can change without changing the user contract.

The current source cannot satisfy those named locators because visible text is in neighboring div elements. Keep one diagnostic test that inspects role count and confirms the missing-name issue until labels are connected. Once fixed, remove any temporary broad locator rather than allowing two selector standards.

The master-on case should leave child controls enabled. Activate weekly digest with Space, then assert its aria-checked value changed once and the other three values did not move. The event log should contain the weekly key and the new string value only once.

The master-off case has a different shape. Activating Email Notifications changes only its own aria-checked value, disables all three child buttons, and changes their muted presentation. Their individual aria-checked values should remain tied to their retained choices.

Native button behavior supplies focus and keyboard click semantics. A browser test should press Tab until the master has focus, press Space, and observe the same state path as a pointer click. Directly invoking the React handler would bypass browser semantics and could make keyboard coverage falsely pass.

Also test server variations. A GET failure currently ends loading and leaves initial true values without showing an error, while a non-ok response has the same visible result. Those branches are relevant to initial state but should not be mistaken for successful persistence.

Accessible email preference switch tests should record this boundary in their report. The [modal focus testing guide](/blog/testing-modal-focus-trap-accessibility) covers focus containment, while this page has no modal. Here, focus order, visible focus, and binary activation are the owned concerns.

## Disabled notification toggle test: Test Matrix

A disabled notification toggle test compares semantics and appearance for each master-child combination. The matrix below uses source behavior from \`packages/web/src/app/dashboard/preferences/page.tsx\` and save-button behavior from \`packages/web/src/components/ui/button.tsx\`.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Master on then off | Email Notifications starts true | Master switch click | aria-checked becomes false | One toggle event | Child buttons stay enabled |
| Enabled child switch | Master true, weekly true | Weekly click or Space | Weekly aria-checked becomes false | One weekly event | Another key changes |
| Child disabled by master | Master false, weekly true | Native disabled branch | Weekly stays checked but disabled | No child event | Value or event changes |
| Space key activation | Focus on an enabled switch | Native button keyboard path | State changes exactly once | One toggle event | No change or double change |
| Tab focus visibility | Known document start | Focus-visible button styles | Focus reaches enabled controls | No save request | Focus disappears or skips master |

The first row checks the dependency boundary rather than only the master attribute. After the click, inspect each child with \`toBeDisabled()\`, then verify its stored aria-checked value remains unchanged. This catches code that clears child state while merely intending to suspend delivery.

The enabled child row needs isolation. Record all four attributes before the action and compare them afterward. A test that asserts only the target can miss a reducer or object-spread mistake that changes another preference.

The disabled row should try both pointer and keyboard paths. Playwright normally refuses an action on a disabled control, which is useful evidence, but also assert no request or analytics call followed. A forced click would bypass the user contract and should not appear in the main case.

For Space input, assert one state change rather than listening only for a key event. Native buttons convert keyboard activation into click behavior, and the component handler reacts to that click. Counting low-level events can couple the suite to browser details that users never observe.

Focus visibility needs a visual and semantic check. The switch classes do not include the shared Button focus-ring utilities, so screenshot review may reveal a weak indicator even when focus moves correctly. Do not claim the shared Button styling applies to native switch buttons.

Accessible email preference switch tests should retain the table beside any change review. It gives each defect a named branch and prevents one successful click from standing in for semantics, disabled behavior, keyboard input, and persistence.

## How Should Keyboard switch accessibility Be Exercised?

Keyboard switch accessibility should run in a real browser with an authenticated preference fixture and controlled API responses. Component tests can inspect props quickly, but browser tests are needed for native focus order, Space activation, disabled behavior, rendered attributes, and reload persistence.

Begin with focus outside the card, then use Tab rather than calling \`focus()\`. Record the accessible role and name after every focus move. Enabled switches and the Save Preferences button should be reachable, while disabled children should leave the tab sequence when the master is off.

The WAI-ARIA pattern says Space changes switch state and the label must not change with state. Use one stable name before and after activation, then compare only aria-checked. A label such as "Turn weekly digest off" would change with state and make the control identity unstable.

The current page needs a label repair before that assertion can pass. An \`aria-label\` can provide the smallest fix, while \`aria-labelledby\` can connect existing visible labels. Whichever implementation is chosen, test the rendered accessible name rather than checking only the source attribute.

Run pointer and keyboard cases from a fresh fixture because one path can alter state for the next. Use a route stub for GET and PATCH, but keep the actual page, native controls, React state, and browser input. The PATCH stub should capture its JSON body and return a matching success object.

The [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing) notes that automated checks find only some accessibility problems. Add an axe scan after the named controls render, but retain explicit keyboard and persistence cases. A zero-violation scan alone cannot prove that Space changes the intended saved setting.

Include manual checks for focus visibility and screen reader wording in the release record. Automation can assert focused state and take a screenshot, yet human review remains useful for contrast and announcement quality. Keep that result separate from the deterministic CI gate.

Use the [axe and Playwright article](/blog/axe-core-playwright-accessibility-testing-2026) for scan setup. Accessible email preference switch tests should still own the exact names, state transitions, disabled dependencies, and save payload on this page.

## Step-by-Step Playwright preference switch test Procedure

A playwright preference switch test should follow one path from known stored data through keyboard input and back to stored data. Keep these steps contiguous so a failure maps to one stage.

1. Open authenticated preferences with a stubbed GET response containing four distinct boolean values.
2. Locate every control by switch role and accessible name, then assert aria-checked and native disabled state.
3. Use Tab and Space to change enabled switches, then prove disabled children reject input and retain values.
4. Save once, inspect the PATCH body, reload with those saved values, and compare semantics again.

The first stage should wait on user-visible content rather than a fixed delay. Return the fixture only once per load and count GET calls. If the route runs twice unexpectedly, show the count in the failure report instead of silently serving unlimited responses.

The second stage is intentionally strict. The following example is expected to expose the current missing-name gap until the controls gain label connections:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('saves named switches after keyboard changes', async ({ page }) => {
  const saved = {
    emailNotifications: true,
    weeklyDigest: false,
    newSkillAlerts: true,
    packAlerts: false,
  };
  let patchBodies: unknown[] = [];

  await page.route('**/api/user/preferences', async (route, request) => {
    if (request.method() === 'PATCH') {
      patchBodies.push(request.postDataJSON());
      await route.fulfill({ status: 200, json: request.postDataJSON() });
      return;
    }
    await route.fulfill({ status: 200, json: saved });
  });

  await page.goto('/dashboard/preferences');
  const weekly = page.getByRole('switch', { name: 'Weekly Digest' });
  await expect(weekly).toHaveAttribute('aria-checked', 'false');
  await weekly.focus();
  await page.keyboard.press('Space');
  await expect(weekly).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Save Preferences' }).click();
  expect(patchBodies).toHaveLength(1);
  expect(patchBodies[0]).toMatchObject({ weeklyDigest: true });
});
\`\`\`

The third stage should turn the master off before touching a child. Assert the child is disabled, its aria-checked value remains fixed, and no extra toggle event occurs. Avoid \`force: true\` because that asks Playwright to violate normal user action checks.

The final stage should make the captured PATCH body become the next GET response. Reload, wait for the card, and repeat role-based assertions. This proves the page can reconstruct the same accessible state instead of merely showing a transient success message.

The [QASkills getting-started page](/getting-started) helps place the check in a broader project flow. For this procedure, keep failures focused on one switch name, one input, one API body, and one reload result.

## React role switch testing: Assertions and Diagnostics

React role switch testing should report state, side effects, and visible output together. For every action, capture the target name, prior aria-checked value, next value, disabled state, analytics call, PATCH count, response status, and message text.

A role-only query is a useful diagnostic, not the final selector. If four unnamed switches appear, the report should say that role count passed while accessible-name resolution failed. That signal points directly toward label wiring rather than claiming the controls are absent.

Use a focused component test for the shared save Button. It proves that \`disabled\` reaches the native element while saving and that an extra click cannot call the handler:

\`\`\`tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect, test } from 'vitest';
import { Button } from '@/components/ui/button';

test('shared save button blocks input while disabled', async () => {
  const user = userEvent.setup();
  const save = vi.fn();
  render(
    <Button disabled onClick={save}>
      Save Preferences
    </Button>,
  );

  const button = screen.getByRole('button', { name: 'Save Preferences' });
  expect(button).toBeDisabled();
  await user.click(button);
  expect(save).not.toHaveBeenCalled();
});
\`\`\`

This component case supports the save boundary, but it does not prove switch behavior. The switches are plain buttons defined inside the page and have different classes. Keep their tests against the actual page so shared Button behavior cannot mask a missing switch label or focus style.

For save success, assert one PATCH request, the complete four-key JSON body, a success message, and an enabled save button afterward. For save failure, assert an error message and the same final button state. Do not wait five seconds for message removal unless timeout cleanup itself is under review.

Analytics assertions should be narrow. One enabled switch action should produce one \`preference_toggled\` call with its key and string value. Saving successfully should produce one \`email_preferences_updated\` call with all four string values, while a failed save should produce none.

Store a trace, accessibility snapshot, and request body only on failure. Redact user data if a real session is used. The [QA skills catalog](/skills) can provide supporting test skills, but the CI output should remain small enough to diagnose quickly.

Accessible email preference switch tests pass only when the same named control tells one consistent story. If semantics, visible state, event data, and saved JSON disagree, report each observed value rather than reducing the result to a generic accessibility failure.

## What Regressions and Boundaries Prevent False Confidence?

False confidence starts when a test checks only thumb position or background color. Those signals can look correct while a switch lacks a name, reports stale aria-checked state, ignores Space, changes while disabled, or saves a different boolean.

Another weak pattern directly calls \`togglePreference\` in isolation. That can prove object updates, but it bypasses focus, button activation, disabled suppression, accessible naming, and actual click wiring. Keep helper tests small and rely on the page for the user contract.

Do not clear child values merely because the master is off unless the product contract changes. Current source retains each child boolean and disables its button. The matrix must flag an unexpected reset because a later master-on action should restore those choices.

Loading and error behavior define nearby boundaries. A failed GET currently leaves initial true values, and a failed PATCH shows an error without reverting local edits. Tests may document those facts, but this article does not prescribe a new recovery design.

The Save Preferences button has its own disabled state while a request runs. Test one quick repeated click to ensure only one request leaves the page. Do not infer switch disabled behavior from that shared component because their implementation and styles differ.

Accessibility scans also have limits. They can identify missing labels and invalid attributes, but direct actions prove keyboard changes and persistence. Pair scan findings with exact role assertions instead of excluding the whole preference card from analysis.

Keep unrelated focus concerns in their own suites. The [modal focus article](/blog/testing-modal-focus-trap-accessibility) owns trapped dialogs, while the [autocomplete keyboard article](/blog/testing-autocomplete-keyboard-accessibility) owns listbox navigation. This matrix owns four preference switches, their master dependency, and their save action.

After any switch markup change, rerun named locators, Tab order, Space activation, disabled attempts, pointer input, save success, save failure, and reload. Accessible email preference switch tests should also compare at least two mixed fixtures so swapped preference keys cannot pass.

### Keep a plain state log for each run

Start each run with a plain map of the four saved flags, then place that map in the test log. Give each flag a short name that matches the text a user can see on the page.

After each key press, add one row with the switch name, old state, new state, and disabled flag. This small record shows at once when the wrong flag moves or when two flags change together.

Record focus as a name, not as a node number or a long selector from the page tree. A name stays clear when a wrapper moves, while a node number can point at a new control.

Keep the click count and save count on the same row as the state change they caused. This link makes a double event easy to spot even when the final state looks right.

When the master is off, copy all three child values before any new key or click attempt. Compare them once more after the attempt, then save and check that the same values reach the request body.

Do not hide a failed name check behind a broad role query during normal test runs. A broad query can help find the cause, but the final gate must still use the name a user hears.

Use short labels for each phase, such as load, key, block, save, and reload. These words keep a long trace easy to scan when one control fails late in the full path.

If a failure occurs after reload, show both the saved JSON and the fresh attributes side by side. This view tells the team whether the fault came from the write, the read, or page state.

Keep screen shots for the first bad step rather than every step in a passing test. The first bad view has more value and makes the report small enough to read.

Accessible email preference switch tests gain trust from this plain log because each claim has a direct before and after fact. The log does not replace assertions; it gives each failed assertion enough context for a quick fix.

Run one last pass on [dashboard preferences](/dashboard/preferences) at a narrow page width, since the card may wrap its text but must keep each switch name and key path intact. Start at the page top and press Tab through each enabled control, while the log tracks every stop with the same short name.

Repeat that pass with the master off, then check that each blocked child drops from the key path but keeps its old checked state. Turn the master on once more and prove those saved child states can take focus and react to Space again.

Next use one slow save reply so the save button stays blocked long enough for a clear check. Try one more key and click on that button, then prove only the first save call left the page.

End with a fresh load from the body that the first save sent, not from hard-coded test data. This last loop joins the user action, wire facts, and new page state without a gap between test layers.

## Frequently Asked Questions

### How do you test role, aria-checked, disabled state, keyboard behavior, and visible state?

Load known booleans, locate each switch by role and stable name, and compare aria-checked with the fixture. Use Tab and Space for enabled controls, turn the master off, and prove children stay unchanged. Save once, inspect the JSON body, reload, and compare both semantics and visible styling.

### What should aria checked switch tests assert?

Assert the exact string value before and after each allowed action, plus the unchanged values of other controls. Pair that check with a stable accessible name and native disabled state. An aria-checked assertion alone can pass while the wrong control changes or the switch remains unnamed.

### What makes a disabled notification toggle test trustworthy?

The test should disable children through the master control, not by editing the DOM. It must verify disabled semantics, rejected pointer and keyboard input, unchanged aria-checked values, no analytics event, and no save request before saving. Forced clicks should stay outside the user-path case.

### Why test keyboard switch accessibility in a browser?

Browser input covers focus order, native button activation, disabled suppression, and rendered accessibility data together. Calling a React handler skips those layers. A component test remains useful for local branches, but it cannot prove that Tab and Space reach the intended control under real page markup.

### What belongs in a playwright preference switch test trace?

Keep the focused role and name, prior and next aria-checked values, disabled state, action key, PATCH body, response status, and visible message. Add a screenshot or accessibility snapshot on failure. Avoid unrelated session data because it increases noise and may expose private values.

### How does react role switch testing expose the current gap?

Query the rendered page for four switches, then repeat the query with intended accessible names. The current markup provides roles and aria-checked values but no programmatic label connection, so named queries should fail. That focused failure distinguishes missing names from missing controls or delayed loading.

## Conclusion

Accessible email preference switch tests must connect one stable control name with announced state, keyboard action, disabled behavior, visible styling, analytics, and stored JSON. The current code already supplies native switch buttons, aria-checked values, master-child disabling, and save feedback, while strict named queries expose the missing label connection.

[Open dashboard preferences](/dashboard/preferences), run every control with keyboard-only input, and add the switch matrix to the Playwright post-flow. Then review the [QASkills blog](/blog) and [skills directory](/skills) for the next focused accessibility check.`,
};
