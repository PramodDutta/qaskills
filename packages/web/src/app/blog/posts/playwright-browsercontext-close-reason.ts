import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright BrowserContext Close Reason',
  description:
    'playwright browsercontext close reason: attach a diagnostic reason to BrowserContext teardown. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright browsercontext close reason',
  keywords: [
    'playwright browsercontext close reason',
    'browsercontext close reason option',
    'playwright context closed error message',
    'diagnose manual context cleanup',
    'playwright fixture context ownership',
    'context close aftereach failure',
    'secondary browser context teardown',
  ],
  relatedSlugs: [
    'playwright-target-page-context-closed-fix',
    'playwright-browser-context-guide-2026',
    'playwright-fixtures-complete-reference-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-browsercontext#browser-context-close',
    'https://playwright.dev/docs/test-fixtures',
    'https://playwright.dev/docs/browser-contexts',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/playwright-target-page-context-closed-fix.ts',
    'seed-skills/playwright-advance-e2e/SKILL.md',
  ],
  content: `Playwright BrowserContext close reason attaches diagnostic text to operations interrupted when a manually owned context closes. Pass a concise, nonsecret reason to \`context.close({ reason })\`, preserve the original test failure, and let Playwright Test close its built-in context fixture. Ownership, not cleanup habit, decides who should close.

## What Does Playwright BrowserContext Close Reason Control?

Playwright BrowserContext close reason controls the diagnostic reason reported to operations interrupted by context closure. It helps a pending action explain why its page and context became unavailable.

The option applies when code calls \`browserContext.close\`. It does not classify a browser crash, process termination, page-only closure, navigation replacement, or external infrastructure failure.

Closing a context closes every page that belongs to it. Any pending locator, navigation, network wait, evaluation, or attachment step can fail as that lifecycle ends.

The official [BrowserContext close reference](https://playwright.dev/docs/api/class-browsercontext#browser-context-close) defines the reason as text reported to interrupted operations. It also notes that the default browser context cannot be closed.

In Playwright Test, the built-in \`context\` and \`page\` fixtures are runner-owned resources. Tests borrow them, while the runner creates and tears them down at the correct lifecycle boundary.

A context created directly through \`browser.newContext()\` is test-owned unless a custom fixture transfers that ownership. Its creator should close it, usually in a \`finally\` block.

Playwright BrowserContext close reason does not replace traces, error stacks, fixture titles, teardown logs, or a resource-ownership design. It adds one useful clue when a known close interrupts work.

A reviewable failure includes context owner, creation site, close caller, reason, pending operation, original test status, teardown order, and cleanup result. Keep account identifiers, tokens, and private URLs out of reason strings.

## How Does BrowserContext Close Reason Option Work?

The BrowserContext close reason option is an optional string passed as \`{ reason: '...' }\`. Playwright includes it in errors for operations that the closure interrupts.

Choose a stable reason that identifies the lifecycle decision, such as \`completed secondary role flow\` or \`fixture teardown after setup failure\`. Avoid dumping an exception object or dynamic secret-bearing data into the text.

The close promise resolves after the context and its pages close. Await it so teardown order remains explicit and later cleanup does not race context finalization.

If an operation is pending, attach its rejection handling before closing the context. Otherwise, JavaScript may report an unhandled rejection before the test reaches its assertion.

The reason is an observation carried by the interruption. The assertion should prove both that the intended owner initiated closure and that the pending operation received the expected reason.

The [fixture documentation](https://playwright.dev/docs/test-fixtures) describes setup and teardown around the \`use\` callback. A custom context fixture should close its owned context after \`use\` completes, not inside individual tests.

Preserve the initial product assertion error when cleanup also fails. Report cleanup as a secondary error or attachment rather than replacing the failure that caused teardown to begin.

Playwright BrowserContext close reason works best when each context has one named owner. Multiple helpers allowed to close the same resource create ambiguous order even if every close call supplies text.

## Playwright Context Closed Error Message: Repository Evidence

The Playwright context closed error message is already analyzed in \`packages/web/src/app/blog/posts/playwright-target-page-context-closed-fix.ts\`. That article distinguishes fixture-owned contexts from manual contexts and warns against closing the built-in fixture.

Its first pattern extends the base test with a fresh page for each test while preserving runner ownership. The fixture yields through \`use\`, and Playwright handles the standard context lifecycle.

Its multi-user example creates \`customerContext\` through \`browser.newContext()\`. A \`finally\` block then closes that context because the test, not the runner fixture, created it.

The article also states that a reason helps when several helper layers might terminate a context. This batch builds a focused verification plan around that existing repository guidance.

The skill \`seed-skills/playwright-advance-e2e/SKILL.md\` demonstrates custom fixtures and teardown after \`await use\`. That structure gives resource ownership a visible setup and cleanup boundary.

Neither evidence file requires closing the built-in \`context\` in \`afterEach\`. Adding such a hook would fight the fixture system and can interrupt trace, video, attachment, or custom teardown work.

Use the [target page or context closed guide](/blog/playwright-target-page-context-closed-fix) for wider symptom diagnosis. First identify which object closed, then decide whether a reason-bearing manual close is relevant.

Playwright BrowserContext close reason should extend these patterns without rewriting them. Add reasons only to manual close sites that own their context and can state why its lifetime ended.

## When Should QA Teams Use Diagnose Manual Context Cleanup?

Diagnose manual context cleanup when a test creates secondary contexts for multiple users, locales, permissions, devices, or isolated sessions. Those resources need a clear owner and explicit teardown.

Start by tracing the context's creation site and every close call. A variable name such as \`adminContext\` helps, but an ownership table or custom fixture makes the lifecycle stronger.

Use a reason when closure can interrupt intentionally pending work or when several cleanup paths are possible. The reason should name the lifecycle event rather than merely say \`closed\`.

Do not add manual close calls to runner fixtures as defensive hygiene. The [browser context isolation guide](https://playwright.dev/docs/browser-contexts) explains that Playwright Test creates an isolated context for each test.

For a single secondary context used inside one test, a local \`try/finally\` block is usually enough. For shared setup logic, define a custom fixture whose teardown closes the resource once.

A locator assertion is better when the page remained open and the expected element never appeared. A context reason helps only when closure actually interrupted the operation.

A runner option cannot solve resource ownership, while a CLI session may help reproduce a page flow outside the suite. The committed test still needs deterministic setup, teardown, and failure evidence.

The [BrowserContext guide](/blog/playwright-browser-context-guide-2026) covers isolation and multi-user models. Choose the smallest number of contexts needed because each added lifecycle increases cleanup and diagnostic work.

Playwright BrowserContext close reason is especially useful for timeout aborts, setup failures, and completed secondary flows. It is less useful when code cannot identify who owns the context.

## Playwright Fixture Context Ownership: Failure Modes and Diagnostics

Playwright fixture context ownership fails when test code closes the built-in \`context\` or a page it does not own. Later fixture teardown then reports a confusing secondary failure.

An \`afterEach\` hook that always closes \`context\` can interrupt artifact finalization. Traces, videos, screenshots, network waits, and automatic fixtures may still need the borrowed resource.

Double closure is another warning sign. It often means resource ownership is spread across a helper, a hook, and the test body without one agreed boundary.

Missing closure has the opposite symptom for manual contexts. Browser processes retain pages, video finalization waits, memory grows, or later assertions observe stale external state.

Cleanup can also hide the initial assertion. A thrown close error in \`finally\` may replace the product failure unless the harness preserves both errors deliberately.

Search for \`browser.newContext()\`, fixture definitions, \`context.close()\`, \`browser.close()\`, and page close calls. Map every created object to exactly one expected teardown owner.

The skill \`seed-skills/playwright-advance-e2e/SKILL.md\` places fixture teardown after the \`use\` callback. Follow that structure so tests consume a resource without deciding its cleanup.

Use the [fixtures reference](/blog/playwright-fixtures-complete-reference-2026) to review test-scoped and worker-scoped ownership. A worker context needs different isolation and cleanup guarantees from a context created for one test.

Product failures occur before teardown and should remain primary. Harness failures violate ownership or ordering, while environment failures include browser crashes, operating system termination, and exhausted worker resources.

Playwright BrowserContext close reason can identify an intentional manual caller. It cannot explain a crash that never ran \`close\`, so inspect process and trace evidence before blaming teardown.

## Context Close Aftereach Failure: Evidence and CI Assertions

A context close afterEach failure should retain the original test result before cleanup starts. Store its status, error message, and relevant attachments independently from the close outcome.

Create a controlled test with a manual secondary context and a pending network wait. Close the context with a known reason, then assert the rejected operation contains that reason.

Create a second control using the built-in fixture. Verify no test or \`afterEach\` hook calls \`context.close\`, and let the runner complete its normal teardown.

Record a monotonic sequence of events such as create, operation-start, close-requested, operation-rejected, close-resolved, and test-finished. Wall-clock timestamps can support the record but should not define exact ordering alone.

The original test may already be failed when cleanup begins. In that case, attach cleanup evidence and rethrow the original error unless local policy combines both without losing either stack.

CI should retain the context label, owner type, reason, interrupted API, error text, test status before teardown, and teardown completion. Redact page URLs or account roles when they expose sensitive tenant data.

Use trace retention for the failed control, not every passing lifecycle test. The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) supports focused evidence and clear ownership.

Run the control across each supported browser project because error formatting may vary while the reason contract remains. Match the stable reason fragment rather than a complete engine-specific message.

Playwright BrowserContext close reason passes the CI gate when interruption text, ownership, and teardown order agree. The gate fails if runner-owned context closure appears in test code or the original result disappears.

## Secondary Browser Context Teardown Comparison Table

Secondary browser context teardown should match the creator's ownership boundary. The matrix separates explicit manual resources from fixtures and process-wide browser control.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| Manual secondary context | One test creates an independent user or environment context | Creator, reason, interrupted work, close result, and original status | Missing or duplicate close calls |
| Fixture-owned context | A custom or built-in fixture owns setup and teardown | Fixture title, scope, use boundary, teardown order, and result | Test code closes a borrowed resource |
| Browser close | Standalone code owns the complete browser lifecycle | Browser creator, all contexts, final artifacts, and process result | One test ends resources used by others |
| Implicit process exit | Emergency termination after ordinary cleanup cannot run | Exit cause, leaked resources, lost artifacts, and recovery action | Diagnostic intent and finalization are lost |

A manual secondary context should close in \`finally\` or fixture teardown even when its flow fails. The reason can state whether completion, cancellation, setup failure, or timeout ended the lifecycle.

Fixture-owned contexts should expose the resource, not its cleanup decision, to tests. Keep one close call after the fixture's \`use\` boundary and preserve consumer errors.

Closing the browser is broader than closing one context. Use it only in standalone scripts or fixtures that created and exclusively own the browser process.

Implicit exit is not a normal teardown strategy. It can lose video, trace, HAR, or report finalization and leave reviewers with a generic target-closed symptom.

The [QASkills blog](/blog) links browser lifecycle topics with artifacts and CI practice. Document the selected row beside every helper that creates a context.

Playwright BrowserContext close reason adds value in the first two rows when code performs an explicit close. It cannot improve teardown that never executes.

## How Do You Implement Playwright BrowserContext Close Reason?

Implement Playwright BrowserContext close reason by labeling ownership at creation and passing a stable reason at the one approved manual close site. Verify an interrupted operation and an ordinary completion path.

1. Read \`packages/web/src/app/blog/posts/playwright-target-page-context-closed-fix.ts\` and \`seed-skills/playwright-advance-e2e/SKILL.md\`, then inventory all context creators and closers.
2. Label each context as runner-owned, custom-fixture-owned, or test-owned, and remove manual close calls from consumers of borrowed fixtures.
3. Wrap each manually created secondary context in \`try/finally\`, then await \`close\` with a concise reason that names the lifecycle event.
4. Start a controlled pending operation, attach rejection handling, close with a known reason, and assert the resulting error contains that stable fragment.
5. Force an original assertion failure before cleanup, then prove the report preserves that error while also recording teardown status and order.
6. Run locally and in CI across supported projects, retain ownership, reason, operation, sequence, original status, and cleanup result, then review artifact redaction.

The first example owns a secondary context for one independent role. Its \`finally\` block always closes that resource without touching the built-in context fixture.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('uses a manually owned reviewer context', async ({ browser }) => {
  const secondary = await browser.newContext({
    storageState: 'playwright/.auth/reviewer.json',
  });

  try {
    const reviewerPage = await secondary.newPage();
    await reviewerPage.goto('/dashboard');
    await expect(reviewerPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  } finally {
    await secondary.close({ reason: 'completed secondary role flow' });
  }
});
\`\`\`

Protect the referenced storage state as a credential and create it through an approved setup. The reason intentionally contains no account name, token, tenant, or private URL.

The second example captures an interrupted operation before invoking close. It asserts only the stable reason fragment and records lifecycle order for review.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('reports why a pending operation was interrupted', async ({ browser }, testInfo) => {
  const events: string[] = [];
  const secondary = await browser.newContext();
  const page = await secondary.newPage();
  await page.goto('https://example.test/waiting-room');

  events.push('operation-started');
  const interrupted = page
    .waitForResponse('**/never-completes')
    .then(() => ({ message: 'unexpected success' }))
    .catch((error: Error) => ({ message: error.message }));

  events.push('close-requested');
  await secondary.close({ reason: 'completed secondary role flow' });
  events.push('close-resolved');

  const result = await interrupted;
  events.push('operation-rejected');
  expect(result.message).toContain('completed secondary role flow');

  await testInfo.attach('context-lifecycle.json', {
    body: Buffer.from(JSON.stringify({ owner: 'test', events }, null, 2)),
    contentType: 'application/json',
  });
});
\`\`\`

Replace the illustrative host with a controlled fixture page so DNS and external availability cannot affect the test. Also assert that \`unexpected success\` never appears.

Add a static review or lint rule that forbids \`context.close()\` on the built-in fixture. Permit close calls only where a manual creator or owning custom fixture is visible.

The smallest local workflow runs the interruption control and one ordinary secondary-role test. CI repeats with trace on failure and verifies the original assertion remains the primary result.

Open the [Playwright CLI skill](/skills/Pramod/playwright-cli) for standalone session triage. A CLI browser has a separate owner and should not be mixed with the test runner's fixture lifecycle.

Playwright BrowserContext close reason should fail review when text contains secrets, ownership is unclear, close is not awaited, or cleanup replaces the original error. A clear owner and ordered record must exist before the test can pass.

### A context life and close card

Start the card when the context is made, not when the first fault appears, so the owner exists before page work can fail. Give it a short label that shows its test role and can be used in each later life event row.

Write who made the context and who has the right to close it, with the source line or fixture name near that choice. Use test, custom fixture, runner, or script as the owner type, then keep that type fixed for the whole resource life.

Mark the scope as one test, one worker, or one stand-alone run, along with the first and last task in that scope. A broad scope needs a close point that all users can see and no test can call on its own.

List each page made in that context with a short safe name, its role, and the key wait that may still be in flight. This helps show which pending task a close may break and which page should own the first rejected call.

Write the event order with small whole step numbers, not just wall times from the host or page clock, and keep those numbers with each safe error and file mark made by the run. Steps make close and fail order clear when clocks differ or when two events share the same shown time, while one ordered card lets a peer trace the first bad act without a guess.

Use \`made\`, \`work_start\`, \`close_sent\`, \`work_reject\`, and \`close_done\` as base marks. Add more marks only when they answer a real doubt.

Take the close text from a short fixed set in test code. Free text from a user or server may leak data and change each run.

State why the close began in six plain words or less. Good cases include role done, setup failed, test timed out, or run stopped.

If a wait is meant to break, add its fail handler before close starts. This keeps the test from making a stray rejected task.

Save the API name that was in flight when the context closed. A wait for a page is not the same fault as a wait for a response.

Keep the first test error and its stack in their own fields. A close fault belongs next to it and must not take its place.

When cleanup also fails, mark both faults and which one came first. The report should still send the team to the first bad rule.

For the built-in context, write \`owner: runner\` and no close call. The [fixture guide](/blog/playwright-fixtures-complete-reference-2026) can help make that rule clear.

For a custom fixture, place close after its \`use\` call and await it. The test may use the context but must not end its life.

For a local second role, put close in a \`finally\` block. This path runs after a pass or fail and leaves one clear owner.

Search the source for each new context and each close before review ends. The [context guide](/blog/playwright-browser-context-guide-2026) helps map one user to one clean state.

Run one test where the role ends with no task in flight. This base case should close once and leave no late error.

Run one test where a known wait is still in flight. Its error should hold the fixed close text used by the owner.

Run one test where the main page check fails before cleanup. The card must keep that first fail even if close has its own fault.

Run one test that uses the built-in page and context with no manual close. This check should end through the normal runner path.

Do not match the whole closed error across all browser types. Match the short reason and keep the full text as a safe review clue.

Use the [closed target guide](/blog/playwright-target-page-context-closed-fix) when no known close site fits the fault. A crash or killed job needs a different line of proof.

Keep trace and video only when the small card cannot show the cause. The [test practices guide](/blog/playwright-testing-best-practices-2026) helps tie each file to a named risk.

Mark each file that may need the context after the test body ends. Hooks, auto fixtures, trace, video, and file attach work can all need time.

If one helper can close many contexts, pass an owner label with each call. Better yet, move each close back to the code that made the resource.

If the browser ends first, note that all child contexts will also end. Do not call those child closes proof of a clean planned path.

Close the card with yes or no for one owner, one close, first error kept, and clean end. Four plain checks are easy to scan.

Ask a peer to point at the one line that owns teardown. If two lines seem right, the life model still needs a fix.

Keep the card with the failed run and not with a later retry alone. A green retry can add proof, but it cannot erase the first order.

Approve the flow only when each made context reaches one known end. Unknown close text or a missing owner should keep the gate red.

When two roles work at once, give each context its own page list and event list on the card. A close for the first role must not be read as the cause of a wait that belongs to the second role.

If a test makes a pop-up in the same context, mark it as a page and not a new context. The owner still closes one context, while the page close may have its own cause and should stay a distinct event.

For a worker fixture, note which tests used the context before its final close and which test first failed. This wide life can save setup time, but it also makes state leaks and late close work much harder to place.

Prefer a test-scoped context when the role state can be made fast and each case needs a clean start. The shorter life gives one test, one owner, and one close path that a peer can grasp with little work.

When a timeout starts cleanup, keep the timeout source and limit with the fixed close text. A test limit, hook limit, and job kill can end at much the same time, yet they point to three different owners.

If the close call hangs, save the last event and stop the worker through the runner's set path after its own limit. Do not add a second close from a new helper, since that hides the first stuck path and adds more race risk.

For video or trace work, wait for the context close before reading files that are made at the end of its life. Record file ready and file kept as later steps so a missing file cannot be blamed on the page check with no proof.

At the end of a large run, count contexts made and contexts closed for each owner type. The counts are not the sole check, but a mismatch is a cheap sign that one path leaked or closed the same resource twice.

## Frequently Asked Questions

### What is the safest way to use browsercontext close reason option?

Use it only at the teardown site for a manually owned context or an owning custom fixture. Keep the text stable, brief, and free of secrets. Await closure, retain the original test result, and record context owner, pending operation, close caller, reason, teardown order, and cleanup outcome.

### How do you verify playwright context closed error message?

Start a controlled pending operation, attach rejection handling, and close a manual secondary context with a known reason. Assert the stable reason fragment rather than the complete engine-specific message. Repeat across supported projects and preserve lifecycle events, Playwright version, operation type, and original test status.

### When should a QA team choose diagnose manual context cleanup?

Choose it when tests or custom fixtures create secondary contexts for roles, locales, devices, permissions, or independent sessions. Map each creation to one teardown owner, remove close calls from borrowers, and use reasons for distinct lifecycle endings. Browser crashes and process kills need separate diagnostics because close code may not run.

### What causes failures in playwright fixture context ownership?

Common causes include closing the built-in context in tests or hooks, closing one resource from several helpers, failing to close manual contexts, ending the browser too broadly, and letting cleanup exceptions replace product failures. Search creation and close sites together, then assign exactly one owner and teardown boundary.

### Which evidence should context close aftereach failure retain?

Retain context label, owner and scope, creation site, close caller, reason, interrupted API, lifecycle sequence, original test status and stack, cleanup error, trace reference, Playwright version, and browser project. Redact account, tenant, token, and private URL data before attaching the record to CI results.

### How should CI handle secondary browser context teardown?

CI should run completion, interrupted-operation, and original-failure controls under each supported browser project. It should reject runner-owned manual closure, unknown owners, unawaited cleanup, missing reason fragments, and lost primary errors. Retain focused failure traces and require every manually created context to reach one verified close path.

## Conclusion

Playwright BrowserContext close reason improves teardown diagnosis only when ownership is already explicit. Require one owner, one awaited close path, a nonsecret lifecycle reason, interrupted-operation evidence, preserved primary failure, and verified cleanup before relying on the message.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then inspect [verified QA skills](/skills) while allowing Playwright Test to close every built-in context fixture it owns.`,
};
