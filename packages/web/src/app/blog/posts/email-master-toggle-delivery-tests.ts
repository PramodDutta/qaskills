import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Email master toggle delivery tests',
  description:
    'email master toggle delivery tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'email master toggle delivery tests',
  keywords: [
    'email master toggle delivery tests',
    'email master opt out test',
    'weekly digest preference filter',
    'new skill alert opt out',
    'parent child preference testing',
    'notification delivery matrix',
  ],
  relatedSlugs: [
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-hmac-unsubscribe-token-tampering-expiration',
    'testing-lazy-resend-initialization-nextjs-build',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://orm.drizzle.team/docs/data-querying',
    'https://resend.com/docs/api-reference/emails/send-email',
  ],
  repoEvidence: [
    'packages/web/src/app/api/cron/weekly-digest/route.ts:subscriber where clause',
    'packages/web/src/app/api/skills/route.ts:new skill alert subscriber where clause',
    'packages/web/src/app/dashboard/preferences/page.tsx:master and child switches',
  ],
  content: `Email master toggle delivery tests prove that a disabled parent preference blocks weekly digests and new-skill alerts, even while either child value remains true. A passing suite checks stored settings, subscriber selection, and send counts together. It fails whenever an opted-out address reaches an email sender.

This plan follows the two delivery queries and the preference controls that supply their state. It separates visible switch behavior from the database predicates that actually prevent delivery. Browse the [QA skills catalog](/skills) after these checks establish a safe notification boundary.

## Email master toggle delivery tests: What Must the Suite Prove?

Email master toggle delivery tests must prove an address is eligible only when the master value and the relevant child value are both true. The digest query and alert query need independent evidence. Each case should assert selected rows, attempted sends, and the final delivery count.

The pass condition is stricter than seeing disabled child controls. Turning off the parent leaves each child value unchanged in component state, while the controls become disabled. That retained state is useful when the parent returns, but it means appearance alone cannot prove suppression.

The digest contract reads \`emailNotifications\` and \`weeklyDigest\` together. The alert contract reads \`emailNotifications\` and \`newSkillAlerts\` together. An email master opt out test should run both paths against the same fixture identities, preventing mismatched setup from hiding a defect.

The expected query shape follows the conjunction pattern shown in the [Drizzle data query guide](https://orm.drizzle.team/docs/data-querying). Repository behavior remains the controlling evidence, while that source explains the query API used to express both conditions.

Treat sender calls as observable side effects, not proof of inbox delivery. The [Resend send-email reference](https://resend.com/docs/api-reference/emails/send-email) defines the provider request, while local tests should replace that boundary with a recorded double. This keeps the suite deterministic and preserves recipient, template, and call-count evidence.

Use the [dashboard preferences page](/dashboard/preferences) to understand the user action, then verify the stored values separately. Email master toggle delivery tests pass only when interface state, persisted state, subscriber rows, and sender calls agree.

## Which QASkills Code Paths Own This Contract?

Three repository paths divide ownership clearly. The digest selector lives at \`packages/web/src/app/api/cron/weekly-digest/route.ts:subscriber where clause\`, and the alert selector lives at \`packages/web/src/app/api/skills/route.ts:new skill alert subscriber where clause\`. The switches and save request live at \`packages/web/src/app/dashboard/preferences/page.tsx:master and child switches\`.

The weekly route first checks authorization and email configuration, then loads skills before selecting subscribers. Its subscriber query joins users with preference rows and applies both master and digest predicates. Tests focused on preference filtering must satisfy those earlier branches, or they may pass without reaching subscriber selection.

The publishing route creates a skill before starting its non-blocking alert query. That query runs only when \`RESEND_API_KEY\` exists, and it selects users whose master and alert values are true. A route response can therefore finish before alert work completes, so the harness must wait for the recorded asynchronous branch.

The preference page stores four booleans locally and sends them together in one PATCH body. Switching the master off does not rewrite child values. Instead, each child button becomes disabled and receives muted styling while its own \`aria-checked\` value still reflects stored child state.

These boundaries produce four different test layers. A component case proves switch behavior, an API case proves persistence, a query case proves eligibility, and a sender case proves attempted delivery. Combining every concern in one browser case makes failures difficult to locate.

Read the [batch email failure guide](/blog/testing-batch-email-partial-failures-promise-allsettled) for provider-result accounting after selection. That concern starts after the master and child predicates have admitted a subscriber, so it should not replace this filter suite.

## Email master opt out test: Baseline Cases

The baseline begins with master on and both children on. That user should appear in both subscriber result sets, producing one digest attempt and one alert attempt when each route runs. The fixture must use a real preference row because both delivery queries use an inner join.

Next, keep both children true and set the master false. Neither query should return the user, and neither sender should receive that address. This is the central email master opt out test because it catches code that checks only the specific child.

Then isolate each child. With master on and digest off, the digest result excludes the user while the alert result includes that user. With master on and alerts off, the inverse applies, proving the two routes do not read the wrong child column.

Finally, set all three values false. Both selectors should return no row, but this case is not a substitute for retained true children. A faulty child-only predicate could pass the all-false fixture while still sending after only the master changes.

Name fixtures by state rather than by expected result. Labels such as \`masterOffChildrenOn\` expose the actual inputs in failure output. Labels such as \`excludedUser\` hide why exclusion should happen and make matrix updates error prone.

Create one control user with no preference row. The inner join excludes that identity from both delivery queries, which is current code behavior. Do not confuse that branch with an explicit opt out, because missing preferences and stored false preferences carry different evidence.

The [getting started route](/getting-started) describes normal product access, while this baseline protects email behavior behind that experience. Keep account setup outside the delivery assertions unless authentication itself is under review.

Email master toggle delivery tests should also prove other recipients remain unaffected. Seed one allowed user beside every blocked user, then assert exactly one call with the allowed address. A zero-call result alone could mean the route never reached its sender branch.

### Build a small set that tells the full story

Use one short mail address for each state, and make the state clear in the part that comes before the test domain. A name such as \`master-off-kids-on\` lets a failed call show the key facts with no need to read the seed code. Keep the same names for the digest run and the alert run, so a side-by-side diff stays quick to scan.

Give each row one stable user ID, one clear mail address, and the three flags that drive the two send paths. Seed all rows in one step, then read them back once before the route runs to prove the set is sound. This small check saves time when a bad seed would make both send tests fail for the same false cause.

Run the all-on row first because it proves the route can find a user and reach the send stub in this test run. Next run the master-off row while both child flags stay on, since that row holds the main risk in one clear form. Run each mixed child row last, and keep its expected mail type in the case name.

## Weekly digest preference filter: Test Matrix

The weekly digest preference filter needs paired expectations for both delivery paths. A single table keeps master state, child state, query eligibility, and sender activity aligned. Every row below comes from the conjunctions in the two route files and the retained child state in the preference page.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Master on, both children on | true, true, true | Both query conjunctions pass | Both child switches enabled | One digest and one alert attempt | Either eligible path missing |
| Master off, both children on | false, true, true | Both master checks fail | Children disabled but still checked | No email attempt | Any sender receives the user |
| Master on, digest off | true, false, true | Digest child fails, alert passes | Digest off and alert on | Alert only | Digest attempted or alert absent |
| Master on, alerts off | true, true, false | Digest passes, alert child fails | Digest on and alert off | Digest only | Alert attempted or digest absent |
| Master off, both children off | false, false, false | Both conjunctions fail | Children disabled and unchecked | No email attempt | Any selected subscriber |

Read each row in two directions. The master-off rows prove suppression, while the mixed-child rows prove that each route consults its own column. The fully enabled row proves the fixture and sender double can detect an allowed delivery.

For the digest route, capture the JSON summary as well as calls. With one allowed subscriber, its \`total\` should match the subscriber count, while \`sent\` and \`failed\` reflect the controlled sender result. Avoid exact claims when no top skills exist, because that earlier branch returns before subscriber selection.

For the alert route, the immediate HTTP result describes skill creation rather than email completion. Capture the promise chain or poll a test recorder until the alert branch settles. A passing 201 response cannot prove the new skill alert opt out filter worked.

Keep the matrix fixture stable across both routes. Reusing user IDs and emails makes a disagreement obvious, while separate data sets can accidentally encode different states. Reset sender spies between route calls so digest attempts never inflate alert counts.

The [unsubscribe token testing guide](/blog/testing-hmac-unsubscribe-token-tampering-expiration) covers how a link reaches preference updates. The matrix here begins from stored booleans and proves their delivery effect, which keeps token verification outside this scope.

Email master toggle delivery tests should print state tuples on failure. A concise tuple such as \`master=false,digest=true,alerts=true\` identifies the broken predicate faster than a generic notification assertion. Include the selected addresses and sender method beside that tuple.

## How Should New skill alert opt out Be Exercised?

A new skill alert opt out case must drive the publishing branch far enough to create a skill and schedule subscriber work. Configure authentication, provide a valid body, and set the email key for the test process. Then wait for the subscriber query and sender recorder rather than stopping at the route response.

Use a database integration case for selector truth because Drizzle generates the real join and predicates. Use a controlled sender for provider traffic because the test owns neither remote availability nor inbox delivery. This split tests local behavior without making external email a CI dependency.

The first example exercises both selectors through repository-backed fixtures. Test helpers should insert one user and one preference row per matrix entry, then expose selected recipients before any provider call.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';

describe('email preference subscriber filters', () => {
  it.each([
    ['enabled', true, true, true, 1, 1],
    ['master-off', false, true, true, 0, 0],
    ['digest-off', true, false, true, 0, 1],
    ['alerts-off', true, true, false, 1, 0],
  ])(
    '%s',
    async (_name, master, digest, alerts, expectedDigest, expectedAlerts) => {
      const user = await seedUserPreference({
        emailNotifications: master,
        weeklyDigest: digest,
        newSkillAlerts: alerts,
      });

      const digestSubscribers = await selectDigestSubscribers();
      const alertSubscribers = await selectAlertSubscribers();

      expect(digestSubscribers.filter((row) => row.userId === user.id)).toHaveLength(
        expectedDigest,
      );
      expect(alertSubscribers.filter((row) => row.userId === user.id)).toHaveLength(
        expectedAlerts,
      );
    },
  );
});
\`\`\`

The helper names represent test adapters around the exact Drizzle selects, not alternate production logic. Their implementations should use the joins from the route files. Copying the boolean expression into an in-memory filter would only test the copy.

Add an allowed control recipient to each sender test. Assert the sender was called once for that control and never with the blocked address. This paired assertion distinguishes correct filtering from a disabled email branch or empty source query.

The skill alert promise chain catches errors internally and logs them. Capture completion through a deferred sender mock or a query recorder, then assert within a fixed test timeout. Arbitrary sleeps make a fast pass and a slow failure look alike.

Review [lazy email client initialization](/blog/testing-lazy-resend-initialization-nextjs-build) separately when provider configuration changes. The opt-out case should replace the sender boundary and focus on recipient selection.

## Step-by-Step Parent child preference testing Procedure

Parent child preference testing should move from stored combinations to query results and finally to the visible controls. This order identifies whether a failure belongs to persistence, delivery logic, or component state. Keep one fixture key throughout the sequence.

1. Seed one user for every parent-child preference combination.
2. Run the digest subscriber query and skill-alert subscriber query against the same fixture set.
3. Capture send attempts and assert delivery only for rows allowed by both master and child settings.
4. Toggle the controls through the preferences UI and rerun the delivery matrix.

Step one needs all meaningful tuples, not only all-true and all-false. Include master false with true children because that state exists after the parent switch changes. Also include both mixed child cases while the master remains true.

Step two should capture query outputs before sender mapping. Compare exact user IDs, emails, and counts for each selector. Sorting those IDs in the assertion prevents database row order from becoming an unrelated failure.

Step three records side effects at the local email helper. Assert template identity, recipient identity, and call count. Do not send remote messages from this suite, since provider acceptance does not validate the application predicate.

Step four drives the component through roles and accessible state. The second code example proves that switching off the master preserves true child values in the save body while disabling their controls.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('master off preserves children and saves delivery suppression', async ({ page }) => {
  let savedBody: Record<string, boolean> | undefined;

  await page.route('**/api/user/preferences', async (route) => {
    if (route.request().method() === 'PATCH') {
      savedBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: savedBody });
      return;
    }
    await route.fulfill({
      status: 200,
      json: {
        emailNotifications: true,
        weeklyDigest: true,
        newSkillAlerts: true,
        packAlerts: true,
      },
    });
  });

  await page.goto('/dashboard/preferences');
  const switches = page.getByRole('switch');
  await switches.nth(0).click();

  await expect(switches.nth(0)).toHaveAttribute('aria-checked', 'false');
  await expect(switches.nth(1)).toBeDisabled();
  await expect(switches.nth(2)).toBeDisabled();
  await page.getByRole('button', { name: 'Save Preferences' }).click();

  expect(savedBody).toMatchObject({
    emailNotifications: false,
    weeklyDigest: true,
    newSkillAlerts: true,
  });
});
\`\`\`

The browser assertion intentionally stops at persistence input. Run the subscriber matrix afterward with those saved values. That two-stage design prevents a mocked PATCH response from pretending that real delivery suppression occurred.

Use the [preferences controls](/dashboard/preferences) as the final manual checkpoint when changing labels or switch order. Automated selectors should prefer roles and nearby names instead of fixed numeric positions when accessible labels become available.

### Keep each layer easy to rerun

Split the fast checks from the route checks, but use the same row map as the source for both sets. A fast check can prove each flag pair maps to the right expected mail types, while the route check proves the real join makes that choice. When one set fails, the shared names make it clear if the flaw lies in the case data or route code.

Clean the test users and their saved choices after each run, even when one send stub throws before the route can end. A stale row with the same mail address can raise the count in the next run and make a sound filter look wrong. Scope all cleanup to the test IDs, so no broad delete can touch a row made by another worker.

Use one send stub per mail type and give each stub a clear log of recipient, call time, and test case name. Reset both stubs before the next route call, then check the full list rather than only the last call. This makes a stray send easy to spot when many rows run in one suite.

## Notification delivery matrix: Assertions and Diagnostics

A notification delivery matrix needs assertions for response, state, selection, calls, and visible output. Response checks prove each route reached its expected branch. State checks prove the stored booleans match the fixture that the report names.

Selection assertions compare exact subscriber identities for digest and alert queries. Side-effect assertions compare email helper call counts and recipients. Visible assertions check master state, disabled children, and save feedback without treating muted styling as delivery proof.

Email master toggle delivery tests should report both positive and negative evidence. For a blocked user, state that the address was absent and the allowed control was present. A bare zero count does not explain whether filtering worked or setup failed.

Capture the digest summary fields when that route runs. Record \`sent\`, \`failed\`, and \`total\` beside sender outcomes, but avoid coupling opt-out assertions to batch timing. Batch delay behavior belongs to the dedicated [batch delivery article](/blog/testing-batch-email-partial-failures-promise-allsettled).

For alerts, retain the created skill slug and the settled recorder state. The publish response can be successful while the non-blocking email query later fails. CI output should show those events separately instead of attributing both to the HTTP status.

Store no full tokens, authorization headers, or remote email responses in diagnostics. User IDs, fixture labels, boolean tuples, and test-only addresses are sufficient. This keeps reports useful without exposing unrelated credentials.

Use failure messages that name the predicate. For example, report "digest selected master-off user" rather than "expected zero." The first form identifies the broken boundary and preserves enough context for a focused rerun.

The [QASkills blog](/blog) links this filter work with token, sender, and batch topics. Keep the matrix limited to master-child eligibility so changes elsewhere do not turn one small regression into a broad, unstable job.

### Make a failed job useful on the first read

Print one short line for each route with the allowed IDs, blocked IDs, and mail addresses that reached the send stub. Put the stored flag set on the next line, then show the row name that should have won or lost. This plain form lets a reviewer trace the wrong user from seed through query and send with no large data dump.

Keep the pass log small, but save the full safe test trace as an artifact when a blocked user gets through. The trace should show route name, row key, three flags, selected ID, and send count in the order they were seen. Never add auth data or live mail text, since those fields do not help prove the filter rule.

Before merge, run one dry pass with mail stubs set to log each safe test address, then match the log by hand to the flag map in the case file. Do the same with master off and both child flags on, and stop the merge if one blocked name shows up in either send list.

Next, swap the two child flags one at a time while the master stays on, then check that just one mail type can pass for each row. Save this short proof with the test run, so a later code review can see the plain send rule with no need to read each route.

## What Regressions and Boundaries Prevent False Confidence?

The main false signal is disabled styling. The page disables child buttons when the master is false, but delivery routes never inspect the component. Only persisted booleans and query predicates control whether an address becomes a subscriber.

Another weak signal is a zero sender count without an allowed control. Missing \`RESEND_API_KEY\`, an empty skills query, failed authentication, or an incomplete fixture can all prevent calls. Every suppression case needs a neighboring path that demonstrably sends.

Do not merge digest and alert expectations into one generic notification flag. The routes use different child columns and run at different times. A copy-paste error can block one type while admitting another, so each query needs its own selected-ID assertion.

Email master toggle delivery tests also need a retained-child regression after UI changes. Toggle the parent off, save, reload, and confirm the parent remains false while child values remain true. Then run both subscriber selectors and confirm they exclude that user.

Provider failures sit beyond this contract. Once a user is eligible, rejected or unsuccessful sends require settled-result checks and retry policy decisions. Those cases should not change whether an opted-out user entered the batch.

Token tampering and expiration also sit before preference effects. The [unsubscribe security guide](/blog/testing-hmac-unsubscribe-token-tampering-expiration) should prove only valid requests update state. This suite then proves the resulting state blocks delivery.

Keep pack alerts outside the two route claims because the cited delivery paths cover weekly digests and new-skill alerts. The page has a pack switch, but these repository files provide no pack delivery selector to test here. Add that path only when its sender exists and has direct evidence.

Run the full matrix after edits to either predicate, preference field names, joins, or save payloads. A narrow component snapshot is insufficient because field wiring can drift between layers. The [email preferences page](/dashboard/preferences) remains the user-facing checkpoint.

## Frequently Asked Questions

### How do email master toggle delivery tests prove both sends are suppressed?

They seed a user whose master value is false while both child values remain true, then execute both subscriber queries. The test asserts that neither result includes that user and neither sender receives the address. An enabled control user proves each route reached its delivery branch.

### What belongs in an email master opt out test?

Include persisted values, exact subscriber IDs, sender recipients, sender call counts, and visible switch state. Keep the children true when disabling the parent, since all-false data cannot expose a missing master predicate. Reload once to prove the saved tuple survives the interface round trip.

### How should the weekly digest preference filter be isolated?

Provide top skills, valid cron authorization, configured email state, and preference rows before calling the route. Replace the email helper with a recorder, then compare selected users and summary counts. This setup ensures an earlier route branch cannot create a misleading zero-send pass.

### Why does new skill alert opt out need asynchronous waiting?

The publishing route starts subscriber work through a promise chain after creating the skill, while the HTTP response describes creation. Tests must wait for a query or sender recorder to settle. Otherwise, an assertion may finish before an incorrectly selected opted-out user reaches the sender.

### What is the key parent child preference testing case?

Set the parent false while weekly digest and new-skill alert values remain true. Confirm the page disables both children without clearing them, save the tuple, and rerun both delivery selectors. This one case directly exposes code that trusts child preferences without consulting the master.

### What should a notification delivery matrix report on failure?

Report the fixture tuple, route name, selected user IDs, expected recipients, actual sender calls, and relevant response summary. Include one allowed control result beside the blocked user. Avoid credentials and full provider payloads because they add risk without clarifying the local predicate failure.

## Conclusion

Email master toggle delivery tests connect three facts: the preference page preserves child choices, both subscriber queries require the master value, and sender calls must exclude every blocked address. The strongest regression suite checks the same users through persistence, selection, and side effects while retaining a positive control.

[Open dashboard preferences](/dashboard/preferences), review the notification controls, and add all parent-child combinations to the delivery regression suite. Use the [QA skills catalog](/skills) to find related testing workflows after the matrix passes.`,
};
