import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Locator Count Race Condition',
  description:
    'playwright locator count race condition: replace stale locator counts with web-first assertions. Repo evidence maps checks and CI-safe steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Playwright',
  primaryKeyword: 'playwright locator count race condition',
  keywords: [
    'playwright locator count race condition',
    'playwright count versus tohavecount',
    'locator count returns zero',
    'dynamic list race playwright',
    'playwright web first count assertion',
    'locator count no auto wait',
    'flaky list count test',
  ],
  relatedSlugs: [
    'playwright-locator-filter-visible-reference',
    'playwright-locators-best-practices-2026',
    'playwright-assert-no-duplicate-list-items',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-locator#locator-count',
    'https://playwright.dev/docs/test-assertions',
    'https://playwright.dev/docs/actionability',
  ],
  repoEvidence: [
    'seed-skills/playwright-locator-filter/SKILL.md',
    'packages/web/e2e/post-flow.e2e.ts',
  ],
  content: `Playwright locator count race condition appears when \`count()\` reads a dynamic list before its update has reached the page. The method returns the number visible at that instant, but \`toHaveCount\` retries until its expected value or timeout. Use the first as a snapshot and the second as the test claim.

## What Does Playwright Locator Count Race Condition Control?

Playwright locator count race condition controls whether a test samples a list once or waits for a stated list size. The choice changes the test contract, even when both forms use the same lazy locator.

A locator describes how Playwright can find matching nodes when an operation runs. It does not freeze an element list when the locator is created, so later actions can resolve a changed page.

The [locator count reference](https://playwright.dev/docs/api/class-locator#locator-count) defines \`locator.count()\` as a method that returns the number of matching elements. That call is useful when code needs the current number for a log, branch, or diagnostic record.

An immediate number is not proof that a dynamic update has finished. If a fetch, timer, stream, animation, or client render will add rows, the first value can be zero and still be correct for that instant.

\`expect(locator).toHaveCount(expected)\` states a different rule. It checks the locator again until the number matches or the assertion timeout ends, which makes the expected state part of the failure.

This workflow does not make every count stable. The application may keep adding records, the locator may match hidden templates, or the expected number may be wrong for the test data.

It also does not replace a business assertion. Five list items can exist while one has the wrong label, two are duplicates, or the requested record is absent.

Use the [locator best practices guide](/blog/playwright-locators-best-practices-2026) to build a semantic locator before checking its size. A precise query makes the count useful, while a broad query only waits for the wrong group.

The release rule is direct: use \`count()\` for a named snapshot and \`toHaveCount\` for an expected state. Keep both only when the first number is retained as evidence for the race.

Playwright locator count race condition tests should therefore record what each number means. A reviewer must see which value was immediate, which value was expected, and how long the assertion waited.

## How Does Playwright Count Versus Tohavecount Work?

Playwright count versus tohavecount starts with one locator but follows two execution paths. The count method resolves the query once, while the matcher runs a web-first assertion with repeated checks.

The [Playwright assertions guide](https://playwright.dev/docs/test-assertions) groups \`toHaveCount\` with async matchers that retry. The assertion ends when the expected count appears or its timeout produces a useful mismatch.

The matcher must be awaited because its result is a promise. Omitting \`await\` can let the test continue or finish before the retry loop reports its result.

The locator is resolved during each check, so a React, Vue, or plain DOM render can replace the nodes. The test does not need to keep an element handle from the first page state.

This retry is not the same as action auto-waiting. The [actionability guide](https://playwright.dev/docs/actionability) lists checks for actions such as click, while a count assertion waits for its own expected value.

A call to \`count()\` does not inherit the matcher's polling rule. Placing it after navigation or a click may often work, but those prior actions do not promise that a later list update has ended.

Observation and assertion should remain separate in code and reports. An observation can say the list held zero nodes at 18 milliseconds; an assertion can say it reached five nodes within 1.2 seconds.

Do not rebuild the matcher with a loop around \`count()\` and a fixed sleep. Such a loop must invent timing, error text, deadline handling, and cleanup that Playwright already supplies.

A custom polling helper is justified only when the condition cannot be expressed by a locator matcher. Even then, it should have a clear deadline and should report each signal without hiding the final page state.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) favors checks on visible behavior. Pair the final size with key row text when the count alone cannot prove the user's outcome.

Playwright locator count race condition handling is strongest when the expected value comes from fixed test data. If the data can vary, filter to the one known record or assert a bounded condition with a clear reason.

## Locator Count Returns Zero: Repository Evidence

Locator count returns zero when the query has no matches at the precise time that \`count()\` resolves. That result can be valid evidence, but it cannot predict a list update that has not completed.

The repository file \`seed-skills/playwright-locator-filter/SKILL.md\` states that locators are lazy and resolve again for each use. It also names count snapshots on dynamic lists as a race and recommends \`toHaveCount\`.

Its filtered inbox example starts with list items, narrows them to rows that contain an unread marker, and asserts three matches. After one item changes, the example asserts two markers with another count matcher.

That pattern joins two ideas. Filtering gives the list a business meaning, and the retrying matcher gives the changing list time to reach the stated size.

The same file warns against a branch based on \`(await loc.count()) === 2\`. A branch can skip its body after an early zero, so no failed assertion explains that the expected state never arrived.

Repository test code gives a second form of evidence. In \`packages/web/e2e/post-flow.e2e.ts\`, roadmap checks use \`toHaveCount\` for phase and item collections after navigation or search.

One test expects four roadmap phases, while another expects ten phases and one hundred items. A later search expects the visible roadmap item set to narrow to one.

Those lines do not use a count snapshot as their pass condition. The expected sizes stay in Playwright assertions, which means a mismatch receives matcher output and the configured retry window.

The [locator filter reference](/blog/playwright-locator-filter-visible-reference) explains how \`hasText\`, \`has\`, and \`hasNot\` can narrow a repeated structure. Apply that scope before asking how many business rows exist.

A useful diagnostic may still capture the first count before the matcher. Save it with elapsed time, then run the assertion against the same locator without treating the snapshot as the verdict.

Playwright locator count race condition evidence should not claim that zero is stale by itself. It becomes race evidence only when the same scoped locator reaches the expected count without a page reset or locator change.

## When Should QA Teams Use Dynamic List Race Playwright?

Dynamic list race playwright checks fit pages where a known user action starts an async list change. Search results, cart rows, notifications, file uploads, and live status panels are common examples.

The prerequisite is a fixed outcome. The test must know the expected size from its own data, mock response, or isolated setup rather than from a shared environment.

A strong control delays the list response by a small bounded amount. The immediate count should capture the early state, while \`toHaveCount\` should pass after the planned response is released.

Use a filtered locator when only some rows matter. For example, a table can hold five records while only two have the status needed by the current test.

Use a text or attribute assertion when the number is not the main behavior. A single row with the correct order ID often proves more than a broad list count.

Use a request assertion when the issue is whether the browser sent a query. A list matcher only shows rendered nodes and cannot prove request body, headers, or server timing.

Use a CLI or MCP record when an agent workflow needs an ordered trace of browser actions. That record can aid replay, but the maintained test should still own the final locator claim.

The [duplicate list item guide](/blog/playwright-assert-no-duplicate-list-items) covers a related risk. An expected total may pass even when duplicate keys or repeated labels break the product rule.

Avoid this workflow for a list whose size is intentionally open ended. A feed that receives live items needs assertions about known entries, order, or bounded growth instead of one final exact total.

Also avoid using count as a substitute for visibility. DOM nodes can match while CSS, clipping, or an overlay prevents a user from seeing or using them.

Playwright locator count race condition tests work best in isolated browser contexts with owned data. Shared accounts and background jobs can alter the same list and make a valid matcher wait for an invalid target.

## Playwright Web First Count Assertion: Failure Modes and Diagnostics

Playwright web first count assertion failures need classification before anyone raises a timeout. Separate a product fault, a test fault, and an environment limit with evidence from the same run.

A product fault exists when the expected request succeeds but the UI never adds all planned rows. Console errors, malformed keys, or a render bug can leave the stable list below its valid target.

A test fault exists when the locator includes a loading skeleton, excludes a nested row, uses the wrong frame, or expects data that setup never created. Inspect matched elements and known fixture IDs.

An environment limit exists when CI cannot reach the service, a shared account changes, or the worker lacks enough resources. The trace and request log should show that boundary instead of a vague count mismatch.

The first common mistake treats an immediate zero as a stable result. A branch then skips the assertion, and the test can pass while the requested rows appear a moment later.

The second mistake wraps \`count()\` in a manual polling loop. Fixed sleeps make fast runs slow, short deadlines make slow runs fail, and custom errors lose Playwright's locator details.

The third mistake chooses an exact count for variable data. If a shared feed can hold four or six items, no retry strategy can make five the correct contract.

The fourth mistake asserts the broad list before applying a filter. Ads, placeholders, or hidden templates may satisfy the number even though the target records are missing.

The fifth mistake takes a screenshot only after failure. A trace is stronger because it can retain the action order, page snapshots, requests, and the state near the timeout.

Use the [testing practices guide](/blog/playwright-testing-best-practices-2026) to keep setup and user outcomes explicit. A race test should change one timing input while all data and selectors stay fixed.

Playwright locator count race condition diagnosis should end with a controlled rerun. If the delayed case passes and the never-fulfilled case fails with the expected count message, the test boundary is clear.

## Locator Count No Auto Wait: Evidence and CI Assertions

Locator count no auto wait evidence must show both the early sample and the later assertion. Without both facts, a reviewer cannot tell whether the test exposed a race or only logged a normal count.

Record the initial count, the expected count, and timestamps around \`toHaveCount\`. The duration should be long enough to include the planned delay but shorter than the test's full timeout.

Retain the locator's business scope in plain text. A count of five means little unless the record says these were visible order rows, unread items, or matched roadmap entries.

Save the mocked delay or server event that released the update. This proves the assertion waited for a known cause rather than passing after an unrelated background refresh.

Keep a trace on failure and, for a focused diagnostic lane, on the first retry-free run. The trace path belongs in the job output, while secrets and full response bodies should remain redacted.

CI should run the smallest specification before a full browser suite. That focused command makes timing, worker load, and expected test data easier to compare with the local result.

Repeat the focused case under the same browser project and worker count used by the release lane. A different project can change viewport, base URL, storage, or device behavior.

Add one controlled failure where the route never returns the final set. The matcher should fail within its own bound and report the expected and received counts.

Do not accept a passing test that catches and ignores the matcher error. A diagnostic annotation may add context, but the assertion must still control the result.

The [skills directory](/skills) can supply reusable Playwright review steps for this evidence. Keep project-owned selectors and fixture data in the test repository rather than in a generic skill. Playwright locator count race condition passes CI when the snapshot remains a diagnostic, the matcher owns the verdict, and cleanup removes route handlers plus temporary state.

## Flaky List Count Test Comparison Table

A flaky list count test becomes easier to review when each option has one stated job. The matrix separates immediate sampling, retrying proof, scoped proof, and custom timing code.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| \`locator.count\` | Read an immediate diagnostic snapshot | Initial count, timestamp, locator scope, and list state | An early zero is treated as stable |
| \`toHaveCount\` | Assert a dynamic collection reaches one fixed size | Expected count, assertion duration, final state, and trace | The expected value comes from variable data |
| Filter then \`toHaveCount\` | Assert a business subset rather than every node | Filter rule, fixture IDs, expected count, and matched rows | A weak filter includes unrelated nodes |
| Manual polling | Use only when no matcher can express the condition | Poll interval, hard deadline, samples, and final error | Custom sleeps hide the useful matcher output |

The snapshot row has the smallest wait behavior and the highest misuse risk. Keep it when the first value helps prove the timing gap, not because it looks simpler than an assertion.

The plain matcher works when every matched node belongs to the contract. It gives Playwright control of polling and produces a direct expected-versus-received failure.

Filtering before the matcher is often the best choice. It reduces unrelated page churn and ties the number to a status, child marker, label, or owned test record.

Manual polling is the last choice because it creates code that the team must test. It needs monotonic timing, bounded errors, and enough samples to explain what happened.

All four rows still need cleanup. Remove mocks, close the context, and reset test data so a delayed response cannot leak into the next case.

The [blog index](/blog) links this check with broader browser and test design guidance. Use those guides when a count failure reveals a selector or fixture problem rather than timing.

Playwright locator count race condition review should select the narrowest row that expresses the real claim. Mixing all four in one test adds noise and can make a bad snapshot look authoritative.

## How Do You Implement Playwright Locator Count Race Condition?

Implement Playwright locator count race condition by delaying one owned list response, taking one immediate sample, and then awaiting a scoped \`toHaveCount\` assertion. Keep the final count and timing record beside the trace.

1. Read \`seed-skills/playwright-locator-filter/SKILL.md\` and define the expected list, filter, and count from fixed test data.
2. Register one narrow route or fixture delay, then start the user action that requests the dynamic list.
3. Capture \`locator.count()\` once as an early observation without branching on its returned number.
4. Await \`expect(locator).toHaveCount(expected)\` with a local assertion timeout and record its elapsed time.
5. Exercise a never-settling control, retain the trace and list state, then remove the route and temporary data.
6. Run the focused test locally, repeat it with CI browser settings, and use the full suite only after it passes.

The first example uses the planned five-row response. The immediate value is stored for evidence, while the web-first matcher decides whether the test passes.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('waits for five delayed list items', async ({ page }) => {
  await page.route('**/api/items', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      status: 200,
      json: Array.from({ length: 5 }, (_, index) => ({ id: index + 1 })),
    });
  });

  await page.goto('/items');
  const items = page.getByRole('listitem');
  const startedAt = Date.now();
  const immediate = await items.count();

  await expect(items).toHaveCount(5, { timeout: 2_000 });
  test.info().annotations.push({
    type: 'count-timing',
    description: \`initial=\${immediate}; expected=5; elapsed=\${Date.now() - startedAt}ms\`,
  });
});
\`\`\`

The code follows the count guidance in the locator skill and mirrors matcher use in \`packages/web/e2e/post-flow.e2e.ts\`. The route pattern, response body, and expected size must belong to the test.

The controlled failure keeps the final set at four. It checks that the matcher reports failure, then attaches a safe count record without turning that expected fault into a product pass.

\`\`\`typescript
test('reports a list that never reaches five', async ({ page }) => {
  await page.route('**/api/items', (route) =>
    route.fulfill({
      status: 200,
      json: Array.from({ length: 4 }, (_, index) => ({ id: index + 1 })),
    }),
  );

  await page.goto('/items');
  const items = page.getByRole('listitem');

  let countError: Error | undefined;
  try {
    await expect(items).toHaveCount(5, { timeout: 600 });
  } catch (error) {
    countError = error as Error;
  }

  expect(countError?.message).toContain('Expected: 5');
  expect(await items.count()).toBe(4);
});
\`\`\`

Keep the failure case in a test of the helper or matcher contract, not in the main product path. A normal product test should fail directly when the expected list never appears.

Use an assertion timeout that covers the controlled delay with a modest margin. Raising the suite timeout can hide setup deadlocks and makes unrelated failures take longer.

Record the worker count and browser project with the result. If a failure appears only under parallel load, rerun with one worker without changing data, selectors, or delay.

Use trace retention for the failing run. Screenshots can show the final page, but they cannot show whether the response arrived before or after the assertion checks.

Check matched rows after success. One text assertion for a known first or last record guards against five placeholders satisfying the total.

If filtering is needed, define the full locator once and reuse it. Lazy resolution means the same locator will see later DOM changes without being rebuilt after each response.

Do not use \`all()\` before the list is stable and then count the returned array. That captures another snapshot and moves the race outside the matcher.

Do not use \`waitForTimeout\` as the release check. The mocked delay creates the condition, while \`toHaveCount\` waits only as long as the UI needs.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) can help run the same browser flow during diagnosis. Move the final rule into a maintained Playwright test once selectors and data are known.

The [locator filter guide](/blog/playwright-locator-filter-visible-reference) is useful when several row types share one container. Add the filter before the count so the assertion states the real set.

For CI, start with a focused command such as \`npx playwright test list-count.spec.ts --workers=1 --trace=retain-on-failure\`. Then run the repository's normal browser project without adding retries to mask the result.

Cleanup must run even after the controlled failure. Playwright removes page routes with page closure, but explicit unroute calls help when several checks share one page.

Write the report as five short facts: initial count, expected count, elapsed assertion time, final list state, and trace path. This shape lets another engineer compare runs without reading every log line.

Playwright locator count race condition is fixed when the same scoped matcher passes under planned delay and fails under the never-settling control. A raw early zero should never decide the release.

## Frequently Asked Questions

### What is the safest way to use playwright count versus tohavecount?

Use \`count()\` only for a labeled snapshot, then use \`toHaveCount\` for a fixed expected state on dynamic content. Keep the same scoped locator for both calls. Record the first number and elapsed assertion time, but let the retrying matcher decide whether the test passes.

### How do you verify locator count returns zero?

Delay one owned response, call \`count()\` before releasing the final rows, and save that zero with a timestamp. Then await \`toHaveCount\` on the same locator. The later success proves the zero described an early page state rather than a stable empty result.

### When should a QA team choose dynamic list race playwright?

Choose it when one known action starts an async list update and test data defines the final size. Prefer text, request, or duplicate checks when count is not the product rule. Avoid exact totals for shared feeds or pages that keep receiving live records.

### What causes failures in playwright web first count assertion?

Common causes include wrong fixture data, a broad locator, hidden templates, a request that never completes, or a real render defect. Classify the result with matched row text, request status, console output, and trace timing before changing the assertion timeout or expected count.

### Which evidence should locator count no auto wait retain?

Retain the immediate count, expected count, locator scope, assertion duration, final list state, worker count, browser project, and trace path. Redact response secrets and user data. This record shows why the first sample differed and whether the retry ended on the intended page state.

### How should CI handle flaky list count test?

Run the smallest specification with fixed data, no retries, known workers, and trace retention. Repeat it under the release browser settings, then run the full suite. If isolation and suite results differ, compare shared data and load before adding more wait time.

## Conclusion

Playwright locator count race condition has one practical rule: snapshots describe now, while web-first assertions prove an expected future state. Use \`count()\` for evidence only when its exact instant matters.

A release check needs the initial count, expected count, elapsed matcher time, final list state, and trace. It should also prove a delayed success and a controlled failure with one scoped locator.

Review related browser guidance in the [skills catalog](/skills), then open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli). Install that skill and apply this focused verification workflow before changing a dynamic list test.`,
};
