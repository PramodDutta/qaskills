import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright pageerror Failure Gate',
  description:
    'playwright pageerror failure gate: build an allowlisted gate for uncaught page errors. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright pageerror failure gate',
  keywords: [
    'playwright pageerror failure gate',
    'playwright pageerror listener',
    'fail test on javascript error',
    'browser uncaught exception gate',
    'playwright expected error allowlist',
    'page error evidence attachment',
    'javascript regression e2e test',
  ],
  relatedSlugs: [
    'playwright-e2e-complete-guide',
    'playwright-debug-mode-inspector-guide',
    'observability-driven-testing-guide',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/events',
    'https://playwright.dev/docs/api/class-page#page-event-page-error',
    'https://playwright.dev/docs/test-assertions',
  ],
  repoEvidence: [
    'seed-skills/angry-user-simulator/SKILL.md',
    'seed-skills/console-error-hunter/SKILL.md',
  ],
  content: `A playwright pageerror failure gate starts its hook before the page loads, saves each uncaught fault, drops only known noise with a named rule, and fails on all else. It must keep the message, stack, URL, and rule result. This gate catches browser bugs without turning each known test error into a false alarm.

## What Does Playwright pageerror Failure Gate Control?

A playwright pageerror failure gate controls how a test deals with uncaught faults raised inside one browser page. It turns an event stream into a clear release check while keeping the raw facts needed for review.

The official [page event reference](https://playwright.dev/docs/api/class-page#page-event-page-error) defines \`pageerror\` as the event fired when an uncaught exception happens within the page. That scope leaves out failed checks, caught promise faults, server replies, and text written only through \`console.error\`.

The gate has three jobs that should stay apart through the test. It saves each event, tags the clean record with a narrow rule, and checks that no new fault remains after the user flow.

A watch alone does not fail a test because an event hook can save data without a status change. A rule match alone is also weak because an ignored fault still needs a file that proves why it matched.

The repo contract in \`seed-skills/angry-user-simulator/SKILL.md\` saves page faults with their message, time, stack, and current URL. That file treats repeatable error proof as part of a sound browser test rather than an extra debug detail.

This check does not replace page checks, API reply checks, image checks, or a watch for network faults. The [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) explains those wider layers, while this gate answers one exact run-time question.

Use the gate around flows where a page can look right after the app caught a fault at its frame edge. A checkout may still show its button, for example, even though its click code failed before it saved the order.

Do not add a broad rule that accepts any text from a vendor file without a trace. A sound gate ties each allowed match to a reason, owner, end date, and test case.

The [skills directory](/skills) can provide wider test flows, but the release call here stays local and clear. A pass means the watched page had no uncaught fault outside the checked rules during the test span.

## How Does Playwright pageerror Listener Work?

A playwright pageerror listener uses the page event stream and must start before the act that can raise a fault. Its callback gets an Error object, so the test can keep the message and stack without parsing log text.

Playwright can wait for one event or use hooks for events that may occur at unknown times. The [events guide](https://playwright.dev/docs/events) starts hooks before the act because a past event cannot be brought back.

For this gate, \`page.on('pageerror', hook)\` is often better than a wait for one event. A test may need to save zero, one, or more faults while it runs the full user flow.

Set up the hook as soon as the page is ready and before its first load. An early hook covers faults from start scripts, redirects, page setup, later tasks, and the acts that follow.

The callback should copy stable fields into a plain record when the event fires. Reading \`page.url()\` later can link each error to the last route and hide where the fault took place.

Normalize line endings and volatile host values, but do not rewrite the message into a generic label. The exact text and stack often distinguish a product fault from an injected fixture or third-party outage.

If the test creates popups, each new Page needs its own hook or a context setup that adds one. A hook on the first page does not watch each later tab in that browser context.

Remove a hand-made hook when a long-lived page moves into a new test phase. The guide supports \`page.off\`, and clear hook ownership stops duplicate records after more than one setup pass.

The [Playwright inspector guide](/blog/playwright-debug-mode-inspector-guide) helps find the act near a fault. It cannot bring back a missed event, so correct hook order is still the first need.

The gate should expose its saved list only after the flow ends. Checks made after each act can stop the test before later cleanup and proof have run.

## Fail Test On Javascript Error: Repository Evidence

To fail test on javascript error, start from the monitor shown in \`seed-skills/angry-user-simulator/SKILL.md\`. Its \`ErrorMonitor.start\` method subscribes to \`pageerror\`, stores the message, stack, timestamp, and page URL, then exposes a copy through \`getErrors\`.

That copy matters because callers cannot change the monitor's private record by mistake. A test can filter its own view while the first proof stays whole for a report.

The same repo file splits \`console-error\`, \`unhandled-exception\`, \`network-failure\`, and \`crash\` into types. Keep that split because a log message does not prove that an uncaught fault reached the page event.

Its fixture checks the saved errors after the browser work ends. This order lets the test keep the steps that led to a fault before it raises the last check.

\`seed-skills/console-error-hunter/SKILL.md\` adds a second sound rule: tag before filtering. A team should first save what took place, then make a clear call about whether one known message is expected.

The two files support a small test edge rather than a broad log tool. One source supplies the uncaught fault record, while the other supplies strict tags and reports.

A live build should add a clear rule result to each clean record. Values such as \`allowed: false\` and \`ruleId: null\` make a new fault easy to find in a JSON file.

The repo samples do not support ignoring all ResizeObserver or favicon text on all pages. Check each sample match against the event type, test route, current browser, and known app work.

Use the [observability-driven testing guide](/blog/observability-driven-testing-guide) to link this browser fact with logs or traces. The page record should stay the main proof for this gate, even when other tools add more facts.

With that design, the gate fails on a real list instead of a vague claim that logs looked noisy. Reviewers can see each raw event and the exact rule result that set the status.

## When Should QA Teams Use Browser Uncaught Exception Gate?

A browser uncaught exception gate fits critical end-to-end flows where runtime JavaScript faults can escape visible assertions. It is especially useful for navigation, checkout, account updates, and client hydration after a server-rendered response.

The first prerequisite is a stable environment with known injected faults documented as fixtures. Without that baseline, a team may spend release time debating ad network errors that were never part of the product contract.

The second prerequisite is control over listener timing and page ownership. Tests that hand a page across unrelated fixtures can install duplicate listeners or attach evidence to the wrong test result.

Use a locator assertion when the requirement concerns visible state, accessible text, or a completed interaction. A page can produce no uncaught exception and still render the wrong price, hide a button, or save bad data.

Use a response assertion when the requirement concerns status, body, or schema from an API call. A server error may be handled cleanly by the page and therefore never emit \`pageerror\`.

Use a console listener when code explicitly reports a handled fault with \`console.error\`. That signal has value, but combining it with uncaught exceptions under one label makes ownership and allowlists less precise.

Keep the control case simple: load a clean fixture, perform one known action, and expect an empty unexpected list. Then inject one uncaught Error and prove that the same test turns red with one attached record.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) supports user-visible checks around the gate. The browser uncaught exception gate adds a runtime safety net rather than becoming the sole proof of product behavior.

A playwright pageerror failure gate is less suitable for broad web crawling across sites the team does not own. Unknown scripts and consent tools can create noise that has no stable policy or responsible product owner.

## Playwright Expected Error Allowlist: Failure Modes and Diagnostics

A playwright expected error allowlist should match the smallest stable fact that identifies one known, accepted event. Prefer an anchored message fragment plus route and fixture conditions over a generic regular expression.

The most common test defect is late registration. If navigation runs before the listener starts, an exception in bootstrap code vanishes from the record and creates a false pass.

Prove listener order with a controlled page that throws during its first script. The test should capture that event when registration precedes \`goto\`, then intentionally miss it in a negative harness that starts too late.

The next defect is an allowlist that matches too much. A rule like \`/error/i\` can hide a new checkout crash simply because both old and new messages contain the same common word.

Each rule should carry a stable identifier, a reason, a narrow route scope, and an owner. An optional expiry date forces review, but an expired rule must fail clearly rather than vanish without evidence.

Product failures contain a new or changed exception raised by the application under valid test conditions. Test failures come from bad listener order, broken normalization, duplicated callbacks, or a fixture that no longer raises its planned error.

Environment limits include unavailable third-party scripts, browser policy, and network interception that changes code paths. Record those facts separately, since relabeling an environment fault as an allowed product exception weakens the release gate.

Do not mutate error text before saving the raw form. Store a second normalized field for matching, then attach both so a reviewer can understand why the chosen rule did or did not apply.

The [blog index](/blog) links wider diagnostics for traces, network data, and flaky tests. Start with the exact exception record because adding many artifacts cannot repair a gate that never observed the event.

A playwright pageerror failure gate should also reject a test that registers no listener or examines no page. A zero-length error array has meaning only when the evidence confirms that observation was active for the intended interval.

## Page Error Evidence Attachment: Evidence and CI Assertions

A page error evidence attachment should contain raw records, normalized records, policy decisions, test identity, and the observed time range. Keep the file useful without copying cookies, tokens, form values, or unrelated page content.

The primary assertion filters for records where \`allowed\` is false and compares that array with an empty array. Playwright's [assertion guide](https://playwright.dev/docs/test-assertions) explains generic matchers, while the attachment should be created before the assertion can throw.

Capture the current page URL at callback time and remove query secrets before storage. Retain the origin and path when they explain which route raised the exception.

Stacks help map bundled errors to source files, but they can contain local paths. Redact workspace prefixes in shared CI while leaving function names, bundle names, and line positions intact.

The first code example follows the record shape in \`seed-skills/angry-user-simulator/SKILL.md\`. It installs the callback before navigation and keeps both the original message and a stable route.

\`\`\`typescript
type PageErrorRecord = {
  message: string;
  stack?: string;
  pageUrl: string;
  allowed: boolean;
  ruleId: string | null;
};

const errors: PageErrorRecord[] = [];

page.on('pageerror', (error) => {
  const pageUrl = redactUrl(page.url());
  const rule = expectedErrors.find((candidate) =>
    candidate.matches({ message: error.message, pageUrl }),
  );
  errors.push({
    message: error.message,
    stack: redactStack(error.stack),
    pageUrl,
    allowed: Boolean(rule),
    ruleId: rule?.id ?? null,
  });
});

await page.goto('/checkout');
\`\`\`

Keep allowed records in the attachment even though they do not fail the check. Their presence shows that the known condition still occurs and lets an owner remove a stale rule when the product is fixed.

The second example applies the evidence-first order supported by \`seed-skills/console-error-hunter/SKILL.md\`. It always attaches the complete decision list, then asserts only on unexpected entries.

\`\`\`typescript
const unexpectedErrors = errors.filter((error) => !error.allowed);

await testInfo.attach('page-errors', {
  body: Buffer.from(
    JSON.stringify(
      {
        startedAt,
        finishedAt: new Date().toISOString(),
        records: errors,
      },
      null,
      2,
    ),
  ),
  contentType: 'application/json',
});

expect(unexpectedErrors, formatPageErrors(unexpectedErrors)).toEqual([]);
\`\`\`

Attach an empty JSON record on success as well as failure. That file proves the listener ran and gives CI a consistent artifact contract across every result.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) can help inspect the same route by hand. Manual inspection may explain a fault, but it should not replace the repeatable assertion and stored decision record.

A playwright pageerror failure gate is ready for CI when a reviewer can answer five questions from one artifact. They need the message, stack, page URL, allowlist decision, and test identity without rerunning the job.

## Javascript Regression E2e Test Comparison Table

A javascript regression e2e test needs the signal that matches its failure model. The options below are complementary, but each has a different trigger and misuse risk.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| pageerror listener | Capture an uncaught exception emitted by the page | Message, stack, page URL, allowlist result, and attachment | Listener starts after navigation |
| console error listener | Capture explicit error logging from handled code | Message type, text, arguments, URL, and policy result | Console text is mislabeled as an uncaught exception |
| narrow allowlist | Exclude one documented and scoped known message | Raw record, matching rule, owner, and reason | A broad pattern hides a new regression |
| release assertion | Fail after every normalized record is attached | Unexpected list, test identity, and artifact path | Assertion runs before evidence is saved |

Choose the page event when the question is whether JavaScript escaped application handling. Choose the console event when the application deliberately logs an issue yet continues on a known path.

Both listeners should start before navigation and write separate categories. A single shared array is acceptable only when each record keeps its original signal type.

An allowlist is not a fourth source of truth. It is a policy decision applied after observation, and it must never delete the event that caused the decision.

The release assertion belongs after the tested flow and attachment step. That order preserves complete evidence when the first uncaught exception would otherwise stop later cleanup.

For wider regression design, browse the [verified QA skills](/skills) and keep this matrix tied to one browser concern. A playwright pageerror failure gate should remain small enough that a controlled throw proves every branch.

## How Do You Implement Playwright pageerror Failure Gate?

Implement a playwright pageerror failure gate by defining its evidence first, registering it before navigation, and proving both green and red paths. The procedure below keeps product behavior, policy, and CI output easy to review.

1. Read \`seed-skills/angry-user-simulator/SKILL.md\` and define a record with message, stack, URL, timestamp, signal type, allowlist result, and rule identifier.
2. Add \`page.on('pageerror', listener)\` immediately after page creation, before every navigation, redirect trigger, popup action, or injected script that belongs to the test.
3. Run a clean fixture and confirm the attached record is empty, then inject a controlled uncaught Error and require exactly one unexpected record.
4. Add one narrow expected rule, retain the matching record, and prove a similar but different message still fails the release assertion.
5. Attach normalized and raw evidence before checking the unexpected list, while redacting query secrets and local workspace prefixes from shared output.
6. Run the focused spec locally and in CI, then confirm listener cleanup, artifact retention, and a full-suite path for any wider regression.

Start with a dedicated fixture rather than a busy production-like page. A small page that throws on load makes listener order and expected counts obvious.

Next, use one action-triggered exception so the gate covers errors after initial navigation. The event record should show the action route and a stack that differs from the load-time fixture.

Test the allowlist with near-match text as well as the accepted text. This mutation catches loose expressions that pass both the intended fixture and a plausible new defect.

Run the focused spec with the same browser and build mode used by CI. Development overlays may intercept faults differently, so production build behavior is the stronger release signal.

Use the [E2E Playwright guide](/blog/playwright-e2e-complete-guide) for suite placement and the [debug guide](/blog/playwright-debug-mode-inspector-guide) for local triage. Keep the page error artifact available in both paths.

Finally, close pages and remove any listeners owned by reusable fixtures. Cleanup should not erase captured records before the test attachment has finished writing.

## Frequently Asked Questions

### What is the safest way to use playwright pageerror listener?

Register the listener immediately after page creation and before navigation, then copy the message, stack, and current URL during the callback. Keep raw records even when a narrow rule allows one. Remove only listeners that your fixture owns, and prove timing with a page that throws during its first script.

### How do you verify fail test on javascript error?

Run one clean fixture and one fixture that throws a known uncaught Error. The clean case should attach an empty record and pass, while the fault case should attach exactly one unexpected record and fail. This paired check proves observation, evidence order, and the final assertion without relying on manual console review.

### When should a QA team choose browser uncaught exception gate?

Choose it for owned end-to-end flows where an uncaught client fault could escape visible checks or hide behind an error boundary. Pair it with locator and response assertions for product outcomes. Avoid using it as the sole oracle for pages with uncontrolled third-party scripts and no stable policy owner.

### What causes failures in playwright expected error allowlist?

Most failures come from late listener setup, patterns that match too broadly, changed fixture messages, duplicate listeners, or URL rules applied after navigation moved elsewhere. Store the raw event beside the rule result. That comparison separates a genuine product regression from a test policy defect and an unstable environment.

### Which evidence should page error evidence attachment retain?

Retain the raw message, normalized message, redacted stack, page origin and path, event time, test identity, signal type, rule identifier, and allowlist decision. Also record the observation start and finish times. This set lets reviewers confirm both the browser fault and the policy outcome without exposing credentials or form data.

### How should CI handle javascript regression e2e test?

CI should run a production build, attach the decision record before asserting, and fail whenever unexpected entries remain. Keep the browser version, test name, and artifact path in the report. The [observability guide](/blog/observability-driven-testing-guide) can add correlated traces, but the page event must remain directly reviewable.

## Conclusion

A playwright pageerror failure gate is trustworthy when it listens before navigation, retains every uncaught exception, applies only narrow documented rules, and asserts after saving evidence. Adopt it only after clean, controlled-failure, near-match, and cleanup cases all produce the expected records.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then review related options in the [QA skills directory](/skills) before extending the gate to more browser flows.`,
};
