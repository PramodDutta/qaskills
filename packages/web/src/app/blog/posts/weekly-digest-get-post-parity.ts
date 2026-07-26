import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Weekly digest get post parity',
  description:
    'weekly digest get post parity: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'weekly digest get post parity',
  keywords: [
    'weekly digest get post parity',
    'cron post manual testing',
    'nextjs route method parity',
    'weekly digest post endpoint',
    'shared handler contract tests',
    'get versus post side effects',
  ],
  relatedSlugs: [
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
    'github-actions-testing-ci-cd-guide',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware',
    'https://vercel.com/docs/cron-jobs',
  ],
  repoEvidence: [
    'packages/web/src/app/api/cron/weekly-digest/route.ts:GET,POST',
    'packages/web/vercel.json:GET cron invocation path',
  ],
  content: `Weekly digest get post parity is proven by invoking both exported methods with the same request, environment, query results, and email outcomes. Assert equal status, response JSON, selected skills, subscriber reads, send arguments, waits, and counts. Also verify the scheduled path in Vercel configuration targets the tested route while POST still delegates directly to GET.

The live schedule uses GET, while POST gives the team a way to run the same work by hand. The [dashboard preferences page](/dashboard/preferences) sets who can get mail, but this suite checks both route doors and their shared work.

## Weekly digest get post parity: What Must the Suite Prove?

Weekly digest get post parity must prove that scheduled GET and manual POST cross the same authorization gate, use the same data, produce the same send calls, and serialize the same result. A method label may differ in the test name, but no unplanned branch should differ.

The strongest repository fact appears in \`packages/web/src/app/api/cron/weekly-digest/route.ts\`. GET contains the complete workflow, while POST immediately returns \`GET(request)\`. This direct delegation should make behavior equal for equivalent requests.

Tests still need to invoke both exports. A future refactor could copy logic into POST or add a manual-only check. Parameterized contract cases will detect drift before configuration or operational tools depend on different behavior.

Authorization is conditional on \`CRON_SECRET\`. When the variable has a value, the request header must equal \`Bearer <secret>\`, or GET returns 401. When the variable is absent, the current code does not reject either method at this gate.

After auth, both methods require \`RESEND_API_KEY\`. Missing configuration returns 500 with \`Email service not configured\` before any skill query. This environment branch belongs in parity tests because it is shared response behavior.

The data path selects up to ten skills ordered by weekly installs and then total installs. It does not apply the computed \`oneWeekAgo\` date in a query condition. Tests should assert the actual ordering and limit without claiming a created-date filter.

An empty skill result returns success with \`No skills to send\` and sent count zero. A nonempty result queries opted-in subscribers, sends batches of ten with \`Promise.allSettled\`, counts outcomes, and returns sent, failed, total, and top-skill counts.

The [Next.js route handler documentation](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware) describes exported HTTP method handlers in route files. QASkills chooses delegation, so weekly digest get post parity should be measured through those two exports rather than through duplicated test helpers.

Use the [skills directory](/skills) for realistic names in a manual preview, but automated cases should use fixed local skill rows. Live install counts would make ordering assertions unstable.

## Which QASkills Code Paths Own This Contract?

The route owns the secret check, mail key check, skill rank, user choice, batch loop, send count, waits, and JSON. The Vercel file owns the path and cron text that start the planned run.

In \`packages/web/src/app/api/cron/weekly-digest/route.ts\`, GET reads the lowercase authorization header through the request API. If a cron secret exists and the header differs, the handler returns 401 before checking email configuration or querying data.

The handler next checks \`RESEND_API_KEY\`. A missing key returns status 500 and a narrow configuration error. The test should not initialize a real Resend client because the branch only depends on the environment value.

The top-skill query selects name, description, author, slug, install count, quality score, and author name. It orders by \`weeklyInstalls\` descending, then \`installCount\` descending, and limits results to ten. Preserve this projection in send-argument assertions.

If at least one skill exists, the subscriber query joins users to preferences. Its conditions require both \`emailNotifications\` and \`weeklyDigest\` to be true. Other preference flags do not affect this digest query.

Each subscriber is mapped to email, username, and user ID before \`sendWeeklyDigest\` runs. A fulfilled result increments sent only when its returned value has \`success: true\`. A rejection or a fulfilled unsuccessful value increments failed.

The batch size is ten. The route waits one second only when another batch remains. Tests with eleven subscribers can prove one wait, while ten subscribers prove no final unnecessary delay.

POST contains no second implementation. It receives a \`NextRequest\` and returns the result of GET with that same object. Shared handler contract tests should still assert both methods because this one-line boundary is the parity promise.

The second proof path, \`packages/web/vercel.json\`, lists \`/api/cron/weekly-digest\` with \`0 9 * * 1\`. The [Vercel Cron documentation](https://vercel.com/docs/cron-jobs) explains the file form and GET call, while QASkills source gives the exact path and time rule.

The [batch email failure article](/blog/testing-batch-email-partial-failures-promise-allsettled) covers send outcome details. This article uses those outcomes only to prove GET and POST observe the same settled results.

## Cron post manual testing: Baseline Cases

Cron post manual testing starts with paired rows, not one GET suite plus a token POST smoke check. Every important branch should run once through GET and once through POST using equal setup.

The first pair uses a configured secret and matching bearer header, a provider key, one ranked skill, one eligible subscriber, and a successful send. Both methods should return 200 with sent one, failed zero, total one, and topSkills one.

The second pair omits or changes the bearer value while the secret remains configured. Both should return 401 with \`Unauthorized\`, and every query and send double should remain unused. This proves POST does not bypass scheduled authorization.

The third pair removes \`RESEND_API_KEY\` after passing authorization. Both should return 500 with \`Email service not configured\`, again with zero queries. Reset environment values after each row to prevent order-dependent results.

The empty-skill pair returns an empty top-skill array. Both methods should return the exact no-skills object and avoid the subscriber query. A generic success assertion would miss unnecessary user reads or altered response fields.

The partial-failure pair uses at least two subscribers. Return one fulfilled success, one fulfilled failure, and optionally one rejection. Assert equal send calls and count totals for each method, while avoiding a real provider.

### Keep each pair truly equal

Build the GET state with one small factory, then call that same factory again before the POST row starts. The factory should make new arrays, promises, spies, and request objects while keeping all values equal by content. This blocks old calls or used promise results from making one route look unlike the other.

Give each skill a short name and slug, and give each test user a plain ID with no real mail data. Save the exact skill and user order before each run, then compare it with all send calls. This shows that equal totals came from the same work, not from a changed set.

Set each needed environment key inside the row and restore its old value as soon as the row ends. Do this for both set and missing key cases, even when the first check fails. A leaked secret or mail key can send the next pair through the wrong gate.

For a timed case, start with fake time, run one method, clear all tasks, and restore real time before setup begins again. Then repeat the same steps for the other method with a fresh clock. This keeps one batch wait from being charged to the next route call.

Weekly digest get post parity also needs a secret-absent pair. Remove \`CRON_SECRET\`, provide no authorization header, and assert both methods continue to the next configured branch. This locks current behavior without recommending an unprotected deployment.

Use fresh promises and mocks for each method invocation. Reusing a consumed mock queue can make POST receive different results than GET. A setup factory should build identical rows and result sequences on demand.

The [lazy Resend setup article](/blog/testing-lazy-resend-initialization-nextjs-build) owns mail client creation. Cron post manual testing should fake \`sendWeeklyDigest\` and check its inputs, result use, and equal work.

Finally, compare normalized response JSON rather than response object identity. GET and POST may create separate response instances even when their status and body match. Equality belongs at the observable HTTP contract.

## Nextjs route method parity: Test Matrix

Nextjs route method parity requires paired expectations for authorization, data work, sending, and response fields. The table below treats every row as two invocations with freshly reset state.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Authorized scheduled GET | Correct bearer value mail key ranked skills opted in users and fresh send results | Full GET flow from secret check through count response | 200 with exact sent failed total and top skill fields | Both reads each send and each needed wait match the fixed set | Live method skips a gate changes data or sends twice |
| Authorized manual POST | New request and new mocks with values equal to the GET row by content | POST gives the same request to GET without its own branch | Same 200 status and body fields in the same value types | Equal read order user order send inputs waits and final counts | Hand run path adds a check drops work or maps a new body |
| Unauthorized GET | Wrong bearer value with a set secret and all later spies ready but unused | First GET guard compares full header text with the expected value | 401 with the exact \`Unauthorized\` object and no mail key branch | Skill user and send calls all stay at zero for the request | Planned route reaches data work with a bad secret |
| Unauthorized POST | Fresh wrong bearer request with the same set secret used for the GET case | POST delegation reaches the same first guard inside GET | Same 401 status and exact error object as the paired GET | No skill read user read send call or batch wait begins | POST skips auth or turns the same fault into a new result |
| Provider partial failure | Same skills and users with one good result one false result and one rejected send | Settled batch loop counts each result without ending the full run | Equal 200 bodies with the same sent failed total and skill counts | Same user calls in source order and the same wait count | Counts match by chance while users order or calls differ |
| Eleven user batch | Equal ordered user sets split into ten and one with fresh fake clocks for each method | Shared loop sends the first chunk waits once and then sends the last user | Equal 200 count bodies after both chunks finish and all results settle | Eleven sends in the same order one wait of 1,000 and no last wait | Extra delay changed chunk size lost user or method only timing drift |

The authorized rows should inspect query builder calls, not only final counts. Assert the top-skill projection, ordering columns, limit, and subscriber conditions at a useful seam. If builder-level mocks become too brittle, use a small database fixture and compare returned rows.

For auth failures, check that provider configuration is not read through behavior that matters, and assert data calls remain zero. The direct guard should stop before all downstream work. Avoid testing private environment reads when response and calls provide enough evidence.

The partial-failure row needs deterministic settled outcomes. Stub \`sendWeeklyDigest\` by recipient ID, so GET and POST receive the same logical outcomes despite fresh promises. Then compare recipient order and final counts.

Add an eleven-subscriber row for batch timing. Use fake timers, release the first ten results, verify one delay, advance one second, and complete the last send. Run the same sequence through both methods.

Weekly digest get post parity should include the no-subscriber case too. With skills present and an empty subscriber result, both methods return success with zero sent, zero failed, zero total, and the selected skill count. No send calls should occur.

The route calculates a date seven days earlier but does not use it in the query. Do not add a matrix column claiming date filtering. If source later adds a \`where\` clause, the data contract and fixtures should change together.

Use the [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide) to place this matrix in CI. Keep environment cleanup mandatory so a leaked secret cannot change the next test's branch.

## How Should Weekly digest post endpoint Be Exercised?

A weekly digest post endpoint test should call the exported POST function with the same request shape used for GET. It should never bypass the module by invoking a copied internal workflow or a test-only helper.

Create a request factory that accepts method and bearer value. Although POST delegates the same object, using the correct HTTP method keeps the fixture honest and catches future method-aware behavior. The URL should remain the configured cron path.

Build a setup factory for environment, skills, subscribers, and send outcomes. Invoke GET, save its normalized response and call log, reset all doubles, rebuild equal setup, then invoke POST. Compare the two records exactly.

\`\`\`typescript
import { beforeEach, expect, test, vi } from 'vitest';
import { GET, POST } from '@/app/api/cron/weekly-digest/route';

test.each([
  ['GET', GET],
  ['POST', POST],
])('%s returns the same successful digest contract', async (method, handler) => {
  process.env.CRON_SECRET = 'test-secret';
  process.env.RESEND_API_KEY = 'test-provider-key';
  selectTopSkills.mockResolvedValue([topSkill]);
  selectSubscribers.mockResolvedValue([subscriber]);
  vi.mocked(sendWeeklyDigest).mockResolvedValue({ success: true });

  const response = await handler(makeCronRequest(method, 'Bearer test-secret'));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    success: true,
    sent: 1,
    failed: 0,
    total: 1,
    topSkills: 1,
  });
  expect(sendWeeklyDigest).toHaveBeenCalledWith(subscriber, [topSkill]);
});
\`\`\`

This example proves equal public behavior through both exports. The actual subscriber argument contains email, username, and user ID, so construct the fixture with exactly those fields and avoid a broad \`anything()\` matcher.

Add a direct delegation guard only if it remains useful during review. A source-shape assertion that POST text includes \`return GET(request)\` is brittle and weaker than paired behavior. Prefer contract tests that survive harmless formatting changes.

Use fake timers only for the multi-batch case. Single-batch tests should resolve at once and assert no timer advancement. This keeps the baseline fast and avoids timer state leaking into authorization rows.

The [getting started route](/getting-started) can support a manual environment check, but weekly digest post endpoint automation should never send real messages. Recipient data and provider results must remain controlled.

## Step-by-Step Shared handler contract tests Procedure

Shared handler contract tests should replay equal setup through both exports, compare data and send traces, normalize responses, and verify the scheduler points to that route. Keep these four steps contiguous in the suite documentation.

1. Invoke GET and POST with identical authorization, provider configuration, and seeded digest data.
2. Capture the top-skill query, subscriber query, send arguments, batch waits, and outcome counts.
3. Normalize both responses and assert equal status, body fields, operation order, and side effects.
4. Verify \`vercel.json\` points the scheduled job at \`/api/cron/weekly-digest\`.

The request phase should build a new object per invocation. Reusing one bodyless request may work, but fresh requests prevent hidden consumption or mutation from affecting parity. Give both the same headers and URL.

The trace phase can record labels such as \`skills\`, \`subscribers\`, \`send:user-1\`, and \`wait:1000\`. Compare traces after each method. This catches equal final counts produced through different call sequences.

The response phase should parse JSON once and retain status plus body. Do not compare internal response properties that Next.js may add. Public fields provide the durable contract for operators and tests.

\`\`\`typescript
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

test('schedules the GET route covered by the parity contract', () => {
  const configPath = path.resolve(process.cwd(), 'vercel.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  expect(config.crons).toContainEqual({
    path: '/api/cron/weekly-digest',
    schedule: '0 9 * * 1',
  });
});
\`\`\`

This configuration example is tied to \`packages/web/vercel.json\`. It does not contact Vercel or assert a future execution. It proves the checked-in scheduler path matches the route exercised by GET and POST tests.

Run the configuration case from the web package root or resolve the repository path explicitly. A hidden dependency on a developer work root can make a correct file appear missing in CI.

Weekly digest get post parity should fail if either method changes auth, query, recipients, batching, or response fields alone. A deliberate difference needs a separate requirement and test name rather than a quiet exception in the comparator.

## Get versus post side effects: Assertions and Diagnostics

Get versus post side effects include reads, send attempts, batch waits, and logs that indicate failures. The main contract is equal observable work for equal controlled inputs, not merely equal response bodies.

Record the selected skill rows passed to every sender. Assert their order matches the query result and that both methods reuse the same array contents for each subscriber. A count-only assertion could miss wrong descriptions or slugs.

Record subscribers in query order and compare each send identity. The route does not sort subscribers after selection. Tests should not reorder call logs before comparison because that can hide a method-specific sequence change.

### Read both traces side by side

Store each trace as a short list with the method, gate, skill read, user read, send IDs, waits, status, and body. Put GET on the left and POST on the right, then mark the first line that differs. This makes method drift plain without a vast dump of mocks or response objects.

When auth fails, the trace should end after the gate and show no blank slots for work that never began. When the mail key is gone, add only that check before the response. These short traces prove the stop point while keeping secrets and real user data out of all logs.

For send faults, list each test user ID with \`sent\` or \`failed\`, then show the sum at the end. Keep rejected and false results as separate marks even though both raise the failed count. This lets the team see a change in result rules before it becomes a wrong total.

For batch waits, show the size of each chunk and one \`wait 1000\` line only between chunks. Ten users should show one chunk and no wait, while eleven show two chunks and one wait. Compare these lines before final JSON so extra delay is not masked by equal counts.

For settled outcomes, report recipient ID, promise status, returned success flag, and final counter. A fulfilled \`{ success: false }\` counts as failed, just like a rejection. Include both states in one paired row.

When more than ten subscribers exist, assert one wait between the first and second batch. Do not expect a wait after the final batch. Compare fake-timer calls and send completion counts across GET and POST.

On query or unexpected send-loop faults, the outer catch returns 500 with \`Failed to send weekly digest\`. Use one top-skill query rejection and one subscriber query rejection for both methods. Promise rejections inside \`allSettled\` should be counted instead of escaping.

Weekly digest get post parity diagnostics should print method, auth mode, skill count, subscriber count, send outcome summary, wait count, status, and response body. Do not print real addresses or secret headers.

The [batch failure testing article](/blog/testing-batch-email-partial-failures-promise-allsettled) offers deeper settled-result cases. Keep parity failure output compact enough to compare the two method records side by side.

Use the [QASkills blog](/blog) for adjacent route and deployment checks. This suite should remain the single gate that rejects unplanned GET and POST differences.

## What Regressions and Boundaries Prevent False Confidence?

Direct delegation makes parity likely, but it does not remove the need to test both exports. An engineer can later add a POST guard, transform its response, or replace delegation. Paired cases catch that boundary drift.

Do not assume authorization always runs. The current guard enforces a bearer value only when \`CRON_SECRET\` exists. Test configured and absent-secret modes, then ensure production configuration is checked elsewhere.

Do not describe the top-skill query as a creation-date window. The route computes \`oneWeekAgo\` but does not use it. Current ranking comes from weekly and total install columns with a ten-row limit.

Keep provider absence distinct from send failure. Missing \`RESEND_API_KEY\` stops before queries with status 500, while individual send failures are settled and counted in a successful summary. These branches should never share one fixture.

No-skills and no-subscribers are also distinct. No skills returns a special message before subscriber selection. No subscribers returns the full count response after a successful skill query.

The Vercel configuration test proves a checked-in path and schedule, not that a hosted job ran. Deployment monitoring belongs elsewhere. The [GitHub Actions guide](/blog/github-actions-testing-ci-cd-guide) can connect this static check to release gates.

Re-run paired cases after changes to secrets, provider setup, ranking, preference filters, batch size, result counting, response fields, or POST delegation. Add a new row whenever one method intentionally differs.

Finally, compare side effects as well as JSON. Equal responses can hide duplicate sends, changed recipient order, or extra waits. The call trace closes that gap.

## Frequently Asked Questions

### How do you prove weekly digest get post parity?

Invoke GET and POST with freshly built but equal requests, environment values, query rows, and send outcomes. Compare status, JSON, query trace, recipient arguments, waits, and counts. Add unauthorized, provider-missing, empty-data, success, partial-failure, and thrown-query pairs to cover every shared branch.

### What belongs in cron post manual testing?

Cover correct and incorrect bearer headers, an absent secret, missing provider configuration, empty skills, empty subscribers, successful sends, settled failures, and query faults. Run each state through both exports. Never use live recipients or a real provider merely to prove method delegation.

### Why does nextjs route method parity need configuration checks?

Handler parity proves both exports behave alike, while configuration proves the scheduler enters the tested GET route. Parse \`packages/web/vercel.json\` and assert the exact path and cron text. This check cannot prove hosted execution, but it catches a checked-in route mismatch before deployment.

### How should the weekly digest post endpoint handle authorization?

POST currently passes its request directly to GET, so it shares the conditional bearer check. With \`CRON_SECRET\` configured, a mismatch returns 401 before provider or data work. Without that variable, both methods continue under current code, which tests should record without recommending it.

### What do shared handler contract tests compare after sending?

Compare each user input, skill list, good result, bad result, wait between chunks, and every final count field, using the [batch email failure guide](/blog/testing-batch-email-partial-failures-promise-allsettled) as a deeper check list. Equal sums alone are weak because a changed user, skipped wait, or extra send can still yield the same math.

### Which get versus post side effects require fake timers?

Only multi-batch cases need fake timers for the one-second pause between batches. Ten subscribers should produce no final wait, while eleven should produce one wait before the last send. Run the same timer sequence for GET and POST, then restore real timers after each case.

## Conclusion

Weekly digest get post parity depends on direct POST-to-GET delegation, but the release gate should still compare both public exports across every branch. Pair those response checks with query, send, and timer traces, plus a static assertion for the scheduled GET path.

[Open dashboard preferences](/dashboard/preferences) and add GET and POST parity cases to the digest post-flow before changing the cron handler. Then inspect the [batch email failure guide](/blog/testing-batch-email-partial-failures-promise-allsettled) for deeper settled-result coverage.`,
};
