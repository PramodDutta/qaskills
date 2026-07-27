import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Action Navigation Timeout',
  description:
    'playwright action navigation timeout: resolve action and navigation timeout precedence. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright action navigation timeout',
  keywords: [
    'playwright action navigation timeout',
    'playwright actiontimeout versus navigationtimeout',
    'click navigation timeout playwright',
    'page goto timeout config',
    'locator action deadline',
    'default navigation timeout',
    'playwright timeout precedence',
  ],
  relatedSlugs: [
    'playwright-test-config-options-complete-reference',
    'playwright-test-timeout-exceeded-after-hook-fix',
    'playwright-testing-best-practices-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/test-timeouts',
    'https://playwright.dev/docs/api/class-testoptions#test-options-action-timeout',
    'https://playwright.dev/docs/api/class-testoptions#test-options-navigation-timeout',
  ],
  repoEvidence: [
    'seed-skills/playwright-advance-e2e/SKILL.md',
    'seed-skills/playwright-cli/references/running-code.md',
  ],
  content: `Playwright action navigation timeout settings govern different operations: actionTimeout bounds actions such as locator clicks, while navigationTimeout bounds navigation methods such as page.goto. An explicit timeout on either call overrides its default. When a click leads to navigation, split and measure the action and URL wait so the failing phase stays clear.

## What Does Playwright Action Navigation Timeout Control?

Playwright action navigation timeout configuration gives actions and navigation operations separate default budgets. The outer test timeout can still expire before either lower-level budget finishes.

The official [timeout guide](https://playwright.dev/docs/test-timeouts) lists action and navigation limits as distinct low-level settings. It shows a click as the action example and \`page.goto\` as the navigation example.

An action budget covers work such as resolving a locator, waiting for actionability, and completing the requested interaction. A navigation budget covers methods that wait for a page navigation result.

A click may start navigation, but that fact does not make every delay one timeout class. The button can be blocked before the click, or the later page can stall after it.

Use separate calls and explicit evidence when both phases matter. Record the click result first, then record the URL or navigation wait as its own operation.

The test timeout remains the outer wall for test code, fixtures, and setup hooks. If that budget is smaller, its generic error can arrive before a more useful inner deadline.

This configuration does not fix slow products, weak locators, overloaded CI hosts, or assertions aimed at the wrong page. It only assigns bounded time to known operation classes.

The [configuration reference](/blog/playwright-test-config-options-complete-reference) covers related runner options. This guide focuses on proving which clock ended one action-plus-navigation flow.

Playwright action navigation timeout values are useful only when their order and purpose are written down. Equal or arbitrary limits make failure messages harder to interpret.

## How Does Playwright Actiontimeout Versus Navigationtimeout Work?

Playwright actiontimeout versus navigationtimeout starts with two defaults under the \`use\` object. Each option defaults to zero, which means no separate limit at that low level.

The [actionTimeout reference](https://playwright.dev/docs/api/class-testoptions#test-options-action-timeout) defines the default for each Playwright action. It describes the setting as equivalent to the page's default timeout.

The [navigationTimeout reference](https://playwright.dev/docs/api/class-testoptions#test-options-navigation-timeout) defines the default for each navigation action. It maps that setting to the page's default navigation timeout.

An explicit \`timeout\` on \`locator.click\` replaces the action default for that call. An explicit value on \`page.goto\` replaces the navigation default for that call.

Keep explicit overrides rare and named. A one-off slow report page may justify more navigation time, while a normal button should keep the project action budget.

Observation means capturing configured values, method options, elapsed time, and error text. Assertion means requiring the expected phase and product result in a controlled test.

Do not infer precedence from elapsed time alone. Process startup, trace shutdown, and scheduling add small differences around the selected timeout value.

Playwright action navigation timeout diagnosis should allow a tolerance while still naming the operation that failed. The exact call log is stronger evidence than a stopwatch by itself.

The [timeout failure guide](/blog/playwright-test-timeout-exceeded-after-hook-fix) helps separate test and cleanup limits. Keep those outer phases visible when low-level messages are absent.

## Click Navigation Timeout Playwright: Repository Evidence

The click navigation timeout Playwright example begins in \`seed-skills/playwright-advance-e2e/SKILL.md\`. Its configuration sets \`actionTimeout\` to 15 seconds and \`navigationTimeout\` to 30 seconds.

That file also configures a 60-second test timeout. The values form a useful hierarchy: one action can fail first, navigation has more room, and the test remains the outer bound.

Its page classes keep actions in small methods and wrap business flows in reported steps. That structure helps a trace show whether the last phase was click, page load, or later validation.

The second file, \`seed-skills/playwright-cli/references/running-code.md\`, shows a login flow with \`page.goto\`, fill calls, a click, and \`page.waitForURL\`. Each operation is visible rather than hidden inside one helper.

The same reference shows a click with a one-second explicit timeout inside a try and catch. That is direct repository evidence for a focused per-call action override.

Read both files as design evidence, not proof that every site needs those exact numbers. The configuration gives separate defaults, while the CLI reference gives explicit operation boundaries.

A stable test should retain the requested URL, locator, expected final URL, configured defaults, explicit overrides, elapsed phase, error message, and trace path. These facts let a reviewer name the clock without guessing from one rough end time.

Playwright action navigation timeout values should be based on observed service and page behavior. Copying 15 and 30 seconds without measurement only copies syntax.

Use the [complete E2E guide](/blog/playwright-e2e-complete-guide) to keep setup and assertions clear around these operations. Small steps make timeout ownership easier to review.

## When Should QA Teams Use Page Goto Timeout Config?

A page goto timeout config suits direct navigation whose expected response and load behavior are known. Set a project default, then override only a documented exceptional route.

Use the navigation default when many pages share a realistic upper bound. This keeps error behavior consistent and prevents helper methods from choosing private values.

Use a per-call value for a measured exception such as a large report or cold setup page. Name the reason beside the test and review it when service behavior changes.

Use an action timeout for locator work before navigation begins. A covered, detached, disabled, or missing link belongs to the action phase even if clicking it would normally change pages.

Use a web-first assertion timeout for the final page state. Reaching the URL does not prove the target content, account state, or response data is correct.

A control case should stall direct navigation while keeping the click path healthy. Another should block the click target while the destination itself remains fast.

Do not increase navigation time when DNS, server startup, or CI networking is broken. Capture the environmental signal and repair that layer rather than hiding it with a larger value.

Playwright action navigation timeout settings work best with a trace retained on failure. The trace can align the last action, navigation event, request, and assertion.

The [testing practices guide](/blog/playwright-testing-best-practices-2026) favors user-facing locators and isolated tests. Those choices reduce false action stalls before any real navigation begins.

## Locator Action Deadline: Failure Modes and Diagnostics

A locator action deadline can expire while Playwright waits for a target to become actionable. The resulting call log should be read before changing any navigation setting.

A product defect exists when an enabled control never appears, remains covered, or sends users to a broken destination. Preserve the page state and expected user path.

A test defect exists when the locator is ambiguous, points to a stale clone, or starts before required setup. Fix the target or setup rather than extending the action budget.

An environment limit exists when CPU pressure delays rendering across many tests or the web server becomes unhealthy. Compare other actions and server logs before assigning product ownership.

For the controlled action failure, place a known disabled link in a local fixture. Give its click a short explicit timeout and require an action-focused error.

For the controlled navigation failure, make a valid link start a route whose response never completes within its own bound. Require the navigation operation and expected URL context in the error.

Run these controls separately because one blocked phase can prevent the other from starting. A combined stall provides weak evidence about which default actually applied.

If the test timeout fires first, raise that controlled test's outer budget only enough to expose the intended inner error. Do not change production suite limits for this diagnostic.

Playwright action navigation timeout failures should include elapsed time as supporting evidence, not the sole oracle. Match method, configured budget, explicit option, and call log together.

The [timeout repair guide](/blog/playwright-test-timeout-exceeded-after-hook-fix) can help when teardown or hooks consume the outer clock. Keep that case separate from locator and navigation operations.

## Default Navigation Timeout: Evidence and CI Assertions

A default navigation timeout needs a measured route set and a controlled stalled response. The CI record should show which method inherited the project value.

Capture the operation name, source URL, expected target, configured action default, configured navigation default, and any explicit override. Add test timeout and expect timeout for full context.

Record monotonic start and finish values around each phase. Use a reasonable tolerance because process scheduling and reporter work are not exact.

Save the complete error type and Playwright call log. A shortened custom message can remove the method and waiting condition that identify the failed boundary.

Retain a trace on failure, not necessarily on every pass. A trace is useful when the error lacks enough page or request context to assign ownership.

The success control should click an actionable link, reach the expected URL, and assert one user-facing element. It proves both phases can pass beneath their intended budgets.

The first failure control should block actionability while serving the target route normally. The second should allow the click while delaying the navigation response.

Playwright action navigation timeout evidence should state which control failed and which clock won. A generic "timed out as expected" result is too weak for release review.

CI should run these controls with the same browser project and worker settings used by the target suite. Resource changes can alter elapsed behavior even when precedence remains correct.

The [skills directory](/skills) can help agents run focused traces and commands. The project still owns its chosen budgets, fixture routes, tolerances, and release assertions.

## Playwright Timeout Precedence Comparison Table

Playwright timeout precedence follows the operation and its most specific applicable value, while the test timeout remains an outer bound. The matrix keeps four common clocks distinct.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| \`actionTimeout\` | Bound locator actions that wait for actionability | Locator, default, elapsed time, call log, and trace | Navigation delay is blamed on the click phase |
| \`navigationTimeout\` | Bound direct page navigation methods | Source, target, default, response state, and error | A blocked action is blamed on page loading |
| Per-call timeout | Make one measured operation an explicit exception | Method, override, reason, owner, and review date | Local overrides hide a wider performance fault |
| Test timeout | Bound the complete test and setup work | Test title, outer value, last step, and teardown state | The outer clock masks a clearer inner error |

The action row applies to methods such as locator click. If the control never becomes actionable, no later destination check can rescue the test.

The navigation row applies to calls that wait for navigation. Direct \`page.goto\` is the clearest control because its operation class is not ambiguous.

The per-call row has priority for that method invocation. Keep its reason in code so reviewers know whether the exception is still valid.

The test row can expire during any earlier phase. It should allow enough room for the intended inner deadline and bounded evidence cleanup.

Playwright action navigation timeout design should keep these values unequal in controlled tests. Distinct clocks make the expected winner easier to prove.

Review the [Playwright config reference](/blog/playwright-test-config-options-complete-reference) before changing project-level values. A project override can alter one browser or environment without changing the shared default.

## How Do You Implement Playwright Action Navigation Timeout?

Implement Playwright action navigation timeout controls with distinct project defaults, small explicit exceptions, and two isolated failure fixtures. Assert the operation, message, elapsed range, and final product state.

1. Read \`seed-skills/playwright-advance-e2e/SKILL.md\` and list current test, action, navigation, assertion, and job budgets in their intended order.
2. Configure distinct action and navigation defaults, then keep explicit per-call values only for measured and documented exceptions.
3. Run a success path that completes click, URL change, and a user-facing assertion below every relevant timeout.
4. Block one locator to prove the action deadline, then stall one direct navigation to prove the navigation deadline separately.
5. Capture operation, defaults, override, elapsed range, full error, final URL, trace, and cleanup result for both controlled failures.
6. Run the focused controls locally and in CI, then investigate resource differences before changing any shared value.

The configuration example follows the repository's split values while using the brief's smaller illustrative action budget. The test timeout remains larger than either low-level default.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 45_000,
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
  },
});
\`\`\`

These numbers are examples, not measured recommendations for every suite. Replace them only with route and CI data from the target repository.

The second example splits click and URL observation with explicit call values. It then proves the destination through a separate user-facing assertion.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('opens the docs route within separate phase budgets', async ({ page }) => {
  await page.goto('/start');

  await page.getByRole('link', { name: 'Docs' }).click({ timeout: 5_000 });
  await page.waitForURL('**/docs', { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible();
});
\`\`\`

For the action failure, disable or cover the Docs link in an isolated fixture. Require the click call log and absence of a completed URL phase.

For the navigation failure, use a route that starts but does not finish within its explicit bound. Require the URL wait or direct navigation error rather than an actionability error.

Run \`npx playwright test timeout-contract.spec.ts --project=chromium\` for the smallest local proof. Repeat with CI workers and retain the trace paths only for failed controls.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) can reproduce each phase interactively. Use the [complete E2E guide](/blog/playwright-e2e-complete-guide) to keep the final regression isolated and readable.

### Create a Timeout Evidence Ledger

Begin one ledger row for each operation, not each whole scenario. A click and a later URL wait need separate start, finish, and result fields.

Name the source of each budget as project default, page default, or call option. This field makes precedence review possible without reading every helper.

Record the outer test timeout in every row. An inner value cannot be observed if the test ends first.

Add the assertion timeout when a locator check follows navigation. Assertion waits have their own purpose and should not inherit blame from page loading.

Use monotonic time for elapsed checks. Wall-clock changes from host sync can make a sound timeout test look inconsistent.

Choose a tolerance before running the control. The allowed range should cover startup and shutdown without accepting a completely different budget.

Keep the fixture local and deterministic. A public slow site can change speed, rate limits, or response behavior without any repository change.

For action control, make the target present but not actionable. This yields better evidence than a misspelled selector because the intended element is still clear.

For navigation control, serve a route whose response is intentionally held. Release or close that route after the test so no server task remains alive.

Store the complete Playwright call log in the failed artifact. It often names the locator state or navigation wait that consumed the deadline.

Record the page URL before and after each operation. A redirect may shift the navigation phase even when the starting click worked correctly.

Check the server log for request arrival. If no request reached the server, the problem likely occurred before navigation processing began.

Keep one passing case beside each failure case. A fixture that always fails cannot prove the normal path still works under the same defaults.

Do not retry the controlled failures as if they were flaky product tests. Their expected error should be caught and asserted inside the contract spec.

Close pending routes, pages, and contexts after each case. Cleanup must fit inside its own safe budget and leave the next test untouched.

Compare local and CI rows before changing values. If every phase grows on CI, inspect host load rather than increasing one method's timeout.

If only navigation grows, inspect server response and route work. If only actions grow, inspect rendering, locator state, and browser CPU.

Review per-call exceptions each quarter or after a route change. Remove an override when the measured reason no longer exists.

Keep the ledger compact enough for a pull request summary. A reviewer should see operation, winning clock, error, and result without opening the trace.

Playwright action navigation timeout configuration passes when the two controlled stalls produce different, expected, and repeatable phase evidence. The passing control must also finish below each bound and leave no held route or page task.

### Prove Each Clock With a Local Route

Draw four boxes for click, page move, page check, and whole test, then place each planned time in its box before the test or local server starts. Use values with clear space between them, so a small cost from process work cannot make two clocks look like the same rule.

Build one local start page with a link that is shown, named, and ready, plus one target page with a heading that loads at once. Run this plain path first and save each phase time, since a forced fail has little worth when the base path was never shown to pass.

For the click fault, place a known cover over the link while the target route stays fast, then give the click a short call bound and catch its full error. Check that no request reached the target route, which proves the page move did not start and keeps the fault in the action box.

Remove the cover and rerun the click with the same bound, then require both a server request and the next page heading well before the page move limit. This paired pass shows that the link, route, and final check are sound when the forced action fault is not in place.

For the page move fault, let the click work but hold the target response at the local server, then use a longer explicit wait for the new URL. Require the request to reach the server and the move call to fail, which sets this case apart from the covered-link test.

Release the held response in a safe final step and close the page, even when the expected move error was not seen or another check failed first. A route left open can use the rest of the test budget and make the next case report the wrong clock.

Set the whole test bound above both call bounds and run the two faults again, then confirm that neither ends with only the broad test error. The [timeout repair guide](/blog/playwright-test-timeout-exceeded-after-hook-fix) can help if setup or cleanup still takes the outer clock before the planned call does.

Write start and end values from one steady clock around each call, but use the method name and full call log as the main pass rule. Allow a small set range around the plan, since browser and host work can add time before the final error line is saved.

Run the same pair on CI with one browser and one worker, then compare action time, page move time, server request time, and host load with the local sheet. If all phases grow at once, check the host and app first instead of raising just one Playwright value.

Change only the click call value and rerun its fault, then show that the new end range follows that call while the page move case stays the same. Restore the normal value at once, since this one-time change exists to prove call scope and should not become a hidden suite rule.

Close with one row for each pass and fail path, including source URL, target URL, last step, set values, chosen clock, full error, trace path, and clean end. The run is fit for review when a new reader can sort action, page move, page check, and outer test without opening the test code.

Run one last dry case with one page, one link, one fast route, and one page check, then ask a peer to name each clock from the log alone and point to the call that owns it. If the peer must infer the clock from raw time or trace shape, add the method and set value to the sheet before the fault cases are run again.

Place the four pass rows above the four forced fail rows and use the same short names for click, page move, page check, and whole test in each part of the sheet. Read each pair from left to right, so the first changed fact is plain and no later page state can make a blocked click look like a slow route.

Repeat the full set once on the CI host with no other test job in that group, then check that each planned inner clock still ends before the broad test bound and clean step. Keep the first red row, close each held route, and sign off only when the next clean run shows the same call, range, log, and owner for both kinds of stall.

Read the last sheet out loud from top to foot and stop when a call, clock, pass, fail, or clean step lacks a plain fact that a new team mate can check. Run one clean link path after that review and keep its short log, so the final proof ends with a good page, a closed route, and no task left to spend the next test's time.

## Frequently Asked Questions

### What is the safest way to use playwright actiontimeout versus navigationtimeout?

Set distinct measured defaults, keep the test timeout larger, and use per-call values only for named exceptions. Prove action and navigation stalls in separate fixtures. Record the method, applicable value, elapsed range, full call log, final URL, and cleanup result before changing shared configuration.

### How do you verify click navigation timeout playwright?

Split the click from the URL or navigation wait, then time and report each call separately. First block actionability while the route remains healthy; next allow the click while delaying navigation. Require different operation errors and keep a passing control under the same browser project.

### When should a QA team choose page goto timeout config?

Choose it for direct navigation methods whose normal response range is known across representative CI runs. Use one project default for common routes and a documented call override for measured exceptions. Keep user-facing content assertions separate because a completed navigation does not prove the destination works.

### What causes failures in locator action deadline?

Common causes include hidden, covered, detached, disabled, or ambiguous targets, plus slow rendering and weak setup. Read the actionability call log before inspecting navigation values. Classify product state, locator defects, and host pressure separately, then repair the owning layer rather than enlarging every action budget.

### Which evidence should default navigation timeout retain?

Retain the source and target URLs, navigation method, project default, page setting, explicit override, test timeout, elapsed range, full error, response signal, and trace path. Add the final assertion and cleanup state. These fields show both which value applied and whether the product reached a valid page.

### How should CI handle playwright timeout precedence?

CI should run deterministic action and navigation control fixtures with the same project and worker settings as the suite. Assert the expected inner error before the outer test clock, retain bounded traces on failure, and compare host pressure across runs before approving any larger timeout or local exception.

## Conclusion

Playwright action navigation timeout rules stay clear when actions, navigation methods, assertions, and the outer test each have separate measured budgets. Adopt changes only after isolated stalls prove the winning clock, exact call log, elapsed range, product control, and clean shutdown.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this brief's focused verification workflow. Compare the evidence with related timeout guidance on the [QASkills blog](/blog).`,
};
