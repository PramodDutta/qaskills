import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Review api validation matrix tests',
  description:
    'review api validation matrix tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'review api validation matrix tests',
  keywords: [
    'review api validation matrix tests',
    'review rating boundary tests',
    'review comment length validation',
    'invalid json review api',
    'missing skill review response',
    'authenticated review endpoint tests',
  ],
  relatedSlugs: [
    'api-testing-best-practices-guide',
    'api-security-testing-checklist-2026',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'packages/web/src/app/api/reviews/route.ts:POST validation branches',
    'packages/web/src/components/skills/review-section.tsx:review form',
  ],
  content: `Review api validation matrix tests should vary one gate at a time across authentication, JSON parsing, required fields, rating limits, comment length, user lookup, and skill lookup. Each row must assert the exact status and error body, prove later database calls stayed at zero, and include one valid browser submission as a positive control.

The route is the contract owner, while the review form is its visible consumer. The [API testing guide](/blog/api-testing-best-practices-guide) supplies broader planning patterns, but this article stays tied to the QASkills branches that exist today.

## Review api validation matrix tests: What Must the Suite Prove?

Review api validation matrix tests must prove that every invalid state reaches one named rejection branch and cannot continue into later work. Distinct response contracts matter because the client uses status and error text to choose the message shown to a reviewer.

The sequence in \`packages/web/src/app/api/reviews/route.ts\` starts with \`getAuthUserId\`. Missing authentication returns 401 before body parsing. An authenticated request then parses JSON, validates required fields, checks the rating and comment, resolves a local user, confirms the skill, checks duplicates, and inserts.

That order gives each test a side-effect boundary. Invalid JSON must not query users, an invalid rating must not query skills, a missing user must not query skills, and a missing skill must not check existing reviews. Every row should assert the next seam stayed unused.

The status and body are both clear to a caller. Bad fields and missing rows return 400 with set text, a prior review returns 409, no auth returns 401, success returns 201, and database faults return 500. Review api validation matrix tests should not fold these results into one non-OK check.

The browser consumer in \`packages/web/src/components/skills/review-section.tsx\` adds local checks. It blocks a zero rating, limits comments, submits JSON to \`/api/reviews\`, maps 401 and 409 to fixed messages, and refreshes reviews after success. That visible behavior needs one focused integration case after route coverage.

The [OWASP input validation guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) keeps form checks apart from checks on business meaning and says to run them soon. QASkills has a set order, so tests should lock that order without claiming field checks replace auth or database rules.

A passing suite reports fixture, expected branch, status, body, and call counts. Include one valid request that reaches insertion and returns the inserted review. Without that positive control, all negative rows could pass because the handler rejects everything at authentication.

Use a fixed skill identifier and local user record. The [skills directory](/skills) is useful for understanding the page context, but the test should not depend on a live catalog entry or current review count.

## Which QASkills Code Paths Own This Contract?

The server route owns request parsing, validation, lookups, duplicate policy, persistence, and response data. The client component owns form state, local feedback, request construction, success state, and the follow-up refresh.

In \`packages/web/src/app/api/reviews/route.ts\`, the POST body has optional \`skillId\`, \`rating\`, and \`comment\` properties at the TypeScript level. Runtime checks require a truthy skill ID and a present rating. The rating must be an integer from one through five.

The comment remains optional. A truthy comment longer than 1,000 characters returns 400, while an empty comment becomes an empty string during insertion. Tests should use ASCII fixture text so character count is plain and stable.

After field validation, the route selects a user by Clerk ID. An empty user result returns \`User not found. Please ensure your account is set up.\` with status 400.

Only a found user lets the requested skill read begin. An empty skill result then returns \`Skill not found\` with status 400, before any duplicate read.

The duplicate query filters by both skill and local user. A result returns status 409 with \`You have already reviewed this skill\`. A clean result permits insertion, and the response maps inserted review fields plus the known user summary.

In \`packages/web/src/components/skills/review-section.tsx\`, \`handleSubmit\` sends trimmed comment text and the selected rating. It shows local text for a zero rating, maps server 401 and 409 responses, uses server error text for other failures, and refreshes the list after success.

Keep component tests at that public level. Do not call \`handleSubmit\` directly or expose state setters. Render the component, choose a star, type a comment, submit, and inspect the outgoing request and visible result.

The [authentication testing guide](/blog/authentication-authorization-testing-guide) covers wider identity risks. Here, set auth explicitly for each route row and prove which downstream operation was allowed to start.

Review api validation matrix tests should cite both evidence paths in their report: \`packages/web/src/app/api/reviews/route.ts\` and \`packages/web/src/components/skills/review-section.tsx\`. Those files define the API-to-UI handoff under test.

## Review rating boundary tests: Baseline Cases

Review rating boundary tests need values below, at, inside, and above the accepted range. Use zero, one, three, five, six, 1.5, a numeric string, null, and a missing property to separate presence, type, integer, and range checks.

One and five are inclusive valid boundaries. With valid user and skill fixtures, each should reach duplicate lookup and insertion. Zero, six, and 1.5 should return the same range message before any user query begins.

A numeric string such as \`"5"\` fails because \`Number.isInteger\` does not coerce strings. This test is valuable because browser JSON normally sends a number, while another client could send text. Do not parse or normalize the fixture in the harness.

Missing and null ratings use the required-field branch. Both return \`rating is required\`, not the range message. Keep separate cases because a refactor might accidentally treat zero as missing if it uses a truthy check.

The browser form only offers star buttons numbered one through five. That UI constraint reduces normal invalid traffic but does not replace server checks. Direct route cases must still send values a browser control cannot create.

### Make the gate order plain

Give each route spy one short name that tells the team which gate it sits behind in source order. Reset all names and call counts before each request, then save the calls in one small branch trace. This makes an early user read or late insert stand out without a wide mock dump.

Start every field row with the same good skill ID, rating, comment, and signed-in test user. Change only the value named by the row, and keep all later query results ready but unused. A failed zero-call check then shows that the route crossed a line it should have stopped before.

For each valid edge, let the request reach one known later guard, such as the duplicate review check. That proof shows the field rule passed while still keeping the case free from a new database row. Use a separate full success case to test the insert and mapped 201 body.

Review api validation matrix tests should inspect user-query call counts for each invalid rating. The current handler validates fields before entering its database try block. A zero call count proves that order remained intact.

For valid rating controls, return a known inserted row with timestamps and helpful count. Assert status 201, rating, comment, and user projection. Avoid snapshots of every response header because the route contract is the JSON body and status.

The [getting started guide](/getting-started) can help a manual tester reach a skill page. Automated review rating boundary tests should use an isolated handler request and controlled persistence records instead.

Name rows by rule, such as \`rating null uses required error\` and \`rating 1 reaches insert\`. Clear names reveal whether a fault is presence, type, integer, or range related before anyone reads the full trace.

## Review comment length validation: Test Matrix

Review comment length validation needs blank, 1,000-mark, and 1,001-mark text values. Blank text and 1,000 marks should reach the write path, while 1,001 marks must return 400 before the local user read.

The full matrix combines parsing, required fields, rating edges, comment length, and missing records. Every expected branch below comes from \`packages/web/src/app/api/reviews/route.ts\`.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Invalid JSON body | Known Clerk user with malformed raw object text and fresh query spies | Request JSON parse catch before any field read | 400 with exact \`Invalid JSON body\` object and no other fields | User skill duplicate and insert calls all stay at zero | Any data call changed status or broad server text |
| Missing required fields | Complete valid base with skill ID removed and then rating removed in a new row | Ordered skill ID and rating presence guards | 400 with the exact field name and required text for that one row | All database seams stay unused for each missing field | Generic text swapped fields or a user lookup starts |
| Rating outside contract | Fixed skill with zero six decimal and numeric string values under valid auth | Integer and inclusive one through five rule | 400 with one range message and no mixed required error | User skill duplicate and insert calls remain at zero | Any bad rating reaches data or gets changed by the test |
| Comment above limit | Valid body with a measured 1,001 mark ASCII comment and known rating | Truthy comment length guard after rating checks | 400 with the exact 1,000 character limit text | No local user read skill read duplicate read or insert | Long text reaches storage or the test prints the whole value |
| Missing user or skill | Valid fields with an empty user result then a known user and empty skill result | Ordered local identity and skill existence guards | 400 with distinct setup and missing skill messages | Each row stops before its next query and all writes | Both rows show one vague body or run the same call trace |
| Duplicate review | Known user and skill with one prior review row for the same pair | Duplicate lookup after both existence checks | 409 with the exact one review policy text | No insert runs and all prior reads occur once | A second review is written or the conflict turns into 400 |

The invalid JSON row requires valid authentication because auth runs first. Construct a \`NextRequest\` with malformed body text and JSON content type, then call POST. Assert 400 and the exact parse error response.

Required-field rows should include all other valid values. A missing skill ID returns before rating evaluation, so omitting both fields only proves the first guard. Pairwise isolation keeps each message tied to one condition.

For review comment length validation, generate text with \`'a'.repeat(1000)\` and \`'a'.repeat(1001)\`. Assert the boundary value is passed unchanged to insertion after trimming rules are applied by the client only. Direct route requests do not trim comments.

The missing-user row should leave the skill double with zero calls. The missing-skill row should show one user lookup and one skill lookup, followed by zero duplicate and insert calls. These counts prove branch order more clearly than coverage percentages.

HTTP response status is part of the response semantics described by [RFC 9110](https://www.rfc-editor.org/info/rfc9110). The exact QASkills choice still comes from repository code, so do not replace source assertions with a generic interpretation of status classes.

Add a success row after the failures. Return one user, one skill, no duplicate, and one inserted review. This row proves the matrix harness can traverse every query seam and serialize the expected 201 payload.

The [API security checklist](/blog/api-security-testing-checklist-2026) covers larger abuse cases. Keep this matrix focused on the explicit validation and lookup branches, then layer rate or authorization checks in separate suites.

## How Should Invalid json review api Be Exercised?

An invalid json review api case should send malformed raw text through a real request object after authentication succeeds. It must assert the 400 response, exact \`Invalid JSON body\` text, and zero calls to every database builder.

Avoid mocking \`request.json\` to return a rejection unless constructing malformed input is impossible in the runner. A real \`NextRequest\` proves framework parsing and the handler catch work together. Use a short body such as an unfinished object so the failure is easy to read.

Do not combine this case with missing fields. Once parsing fails, no body object exists and required checks cannot run. A test expecting several messages from one malformed payload would invent behavior absent from the route.

Authentication must be a controlled success. If the auth double returns null, the same request returns 401 without parsing. Add that as a separate ordering case and assert the body reader or database remains unused.

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/reviews/route';

test.each([
  ['missing skill', { rating: 4 }, 400, 'skillId is required'],
  ['missing rating', { skillId: 'skill-1' }, 400, 'rating is required'],
  ['low rating', { skillId: 'skill-1', rating: 0 }, 400, 'rating must be an integer between 1 and 5'],
  ['long comment', { skillId: 'skill-1', rating: 4, comment: 'a'.repeat(1001) }, 400, 'comment must be 1000 characters or fewer'],
])('%s', async (_case, body, status, error) => {
  vi.mocked(getAuthUserId).mockResolvedValue('clerk-1');
  const request = new NextRequest('http://test/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const response = await POST(request);
  expect(response.status).toBe(status);
  await expect(response.json()).resolves.toEqual({ error });
  expect(selectUsers).not.toHaveBeenCalled();
  expect(insertReview).not.toHaveBeenCalled();
});
\`\`\`

This table-driven example keeps field failures before the database. The harness should reset every double between rows and should expose separate user, skill, duplicate, and insert seams for later existence tests.

For malformed text, use a standalone test because \`JSON.stringify\` always creates valid JSON. Send \`'{"skillId":'\` directly and assert the parse-specific body. That case proves the request crossed auth but never produced fields.

Review api validation matrix tests should retain only safe diagnostics: case label, status, response error, and call counts. Never print session cookies or the full request headers when one auth setup is enough.

The [error-handling article](/blog/error-handling-testing-patterns) provides general fault-injection patterns. This invalid json review api test remains a transport case owned by the reviews route.

## Step-by-Step Missing skill review response Procedure

A missing skill review response procedure should vary parsing, field rules, identity, and resource existence without creating every possible Cartesian combination. The four steps below preserve branch order and end with one browser-level success check.

1. Build a compact pairwise matrix across parsing, field validation, identity, and skill existence.
2. Invoke POST with the real request body shape and controlled authentication plus database lookups.
3. Assert one status and body contract for every rejection branch, along with later zero-call seams.
4. Submit one valid review through the UI and confirm the persisted response becomes visible after refresh.

Start each route row with fresh doubles. Shared mock queues are risky because an unexpected call can consume the next row's result and still produce a plausible response. One named return per seam makes drift fail at its source.

The missing-user case returns an empty array from the user query. Assert status 400, the complete setup message, one user lookup, and no skill lookup. The missing-skill case returns one local user and an empty skill result, then asserts no duplicate lookup.

Add a duplicate case just after the missing skill row. Return one user, one skill, and one existing review. The expected 409 and zero inserts prove resource existence does not bypass the one-review policy.

\`\`\`tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewSection } from '@/components/skills/review-section';

test('submits a valid review and refreshes the list', async () => {
  mockAuthenticatedClerkWindow();
  mockFetch
    .mockResolvedValueOnce(jsonResponse({ reviews: [], averageRating: 0, totalReviews: 0 }))
    .mockResolvedValueOnce(jsonResponse({ review: insertedReview }, 201))
    .mockResolvedValueOnce(jsonResponse({ reviews: [insertedReview], averageRating: 5, totalReviews: 1 }));

  render(<ReviewSection skillId="skill-1" />);
  await userEvent.click(await screen.findByRole('button', { name: 'Write a Review' }));
  await userEvent.click(screen.getAllByRole('button')[4]);
  await userEvent.type(screen.getByLabelText('Comment'), 'Clear setup and useful checks');
  await userEvent.click(screen.getByRole('button', { name: 'Submit Review' }));

  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
  expect(await screen.findByText('Clear setup and useful checks')).toBeVisible();
});
\`\`\`

The exact star selector may need an accessible label before this example can run as written. That is a useful finding rather than a reason to bypass the UI. Prefer improving accessible names over selecting buttons by fragile index in the final test.

After route tests pass, run the browser case against a fixed response sequence. Assert the POST body contains the skill ID, numeric rating, and trimmed comment. Then confirm the review refresh runs once and the returned comment appears.

Use the [skills page](/skills) for a manual post-flow only after local automation passes. The procedure should never create reviews against production or depend on another user's account.

## Authenticated review endpoint tests: Assertions and Diagnostics

Authenticated review endpoint tests must tell no auth, auth helper fault, missing local user, and a known user apart. Each state stops at a new gate and yields its own clear result.

When \`getAuthUserId\` returns null or throws, POST converts the result to an unauthenticated state. Assert status 401, the complete sign-in message, and zero request-body or database work where the harness can observe it.

When Clerk identity exists but no local user row matches, the route has already parsed and validated the body. Assert status 400 and the account setup message, plus one user query and no skill query. This branch is not equivalent to 401.

For a valid identity, preserve the local user ID used by duplicate lookup and insertion. Assert the duplicate query receives both the skill ID and local user ID. This prevents a test from passing with an unrelated existing review.

Component diagnostics should record the visible error and request count. A 401 response becomes \`Please sign in to leave a review.\`, while 409 becomes \`You have already reviewed this skill.\` Other server errors use returned text when available.

Review api validation matrix tests should also cover a rejected fetch. The component shows its fixed network retry text and clears submitting state in \`finally\`. Assert the button becomes usable again so a reviewer can retry.

### Use a short branch trace

Store the auth result, parse result, field gate, read calls, write calls, status, and error text in that order. Show only the steps reached by the request, and mark the first extra or lost step. A short trace makes a branch fault clear even when several rows return the same 400 class.

For a browser fault, keep the last request body, visible alert, button state, and refresh count in the report. These four facts show what the user sent, what they saw, and whether the form can try again. They also avoid a full page dump that can hide the key text.

When the valid case fails, print the saved review ID, rating, comment size, user ID, and each fetch path. Do not print a session token, cookie, email address, or the full comment. This safe record gives enough facts to judge insert mapping and the one list refresh after success.

Keep API response assertions separate from analytics. On success, the component calls \`trackEvent\` and then refreshes reviews. A focused UI case can assert the event once, but validation rows do not need analytics setup.

The [authentication and authorization guide](/blog/authentication-authorization-testing-guide) helps place these identity states in a wider suite. Here, the key diagnostic is which gate returned and which later query remained untouched.

Use concise failure output: auth mode, status, error text, and calls by seam. That record is enough to identify an ordering regression without exposing a real Clerk identifier.

## What Regressions and Boundaries Prevent False Confidence?

Do not treat browser constraints as server validation. The star control offers only valid integers, and the textarea limits normal typing, but direct callers can still send malformed values. Route tests remain mandatory.

Do not combine auth failure and invalid JSON in one expected result. Authentication runs first, so an unauthenticated malformed request returns 401. A parse test must cross auth before it can prove the JSON catch.

Keep missing user and missing skill cases distinct. Both return 400, yet their messages and query counts differ. A generic \`toBe(400)\` assertion would miss a swapped lookup or incorrect resource message.

The comment check uses JavaScript string length and only runs for truthy comments. Avoid claims about byte length or normalized characters. ASCII boundaries give the clearest source-backed result for the current implementation.

Do not expect trimming in direct route tests. The client trims before sending, while the route stores the received truthy comment as provided. A cross-layer case can document this difference without presenting both paths as identical.

Database faults return one plain 500 body from the outer write catch. Test one failed read and one failed insert. Fine-grained database fault text is not part of this field matrix.

Add cases after changes to auth order, response messages, rating rules, comment limits, lookup sequence, or duplicate policy. Re-run the visible component checks whenever status mapping changes. The [QASkills blog](/blog) links related API and UI testing guides.

Finally, preserve a valid 201 control with exact inserted fields. Negative coverage alone cannot reveal a route that rejects every review. The positive row proves all gates can open in their intended order.

## Frequently Asked Questions

### How do review api validation matrix tests cover every rejection gate?

Use one focused row for authentication, malformed JSON, each required field, rating rules, comment length, missing user, missing skill, and duplicate review. Assert exact status, error body, and downstream zero-call seams. Finish with one valid insert so the harness proves it can cross every gate.

### Which values belong in review rating boundary tests?

Cover missing, null, zero, one, three, five, six, 1.5, and a numeric string. Missing and null should use the required message, while invalid numbers and strings use the integer-range message. One and five must reach persistence as inclusive valid boundaries.

### What proves review comment length validation is correct?

Send empty text, exactly 1,000 ASCII characters, and 1,001 characters through authenticated valid requests. The first two should reach the next data seam, while the last returns 400 before user lookup. Include fixture length in diagnostics instead of printing the entire comment.

### How should an invalid json review api test cross authentication?

Mock the auth helper to return a known Clerk identifier, then send malformed raw text through a real POST request. Assert 400 with \`Invalid JSON body\` and no database calls. Keep an unauthenticated malformed request separate because it correctly stops at the earlier 401 guard.

### What distinguishes a missing skill review response from a missing user?

Both currently return 400, but their messages and call paths differ. A missing user stops before any skill query and returns the account setup message. A missing skill follows one successful user lookup, returns \`Skill not found\`, and never checks duplicates or inserts.

### What should authenticated review endpoint tests verify in the form?

Verify the form sends a numeric rating, current skill ID, and trimmed comment, then maps error statuses to visible text. On success, assert one analytics event, cleared form state, and one list refresh. A rejected request should restore the submit control for a safe retry.

## Conclusion

Review api validation matrix tests are strongest when each row proves branch identity through response details and downstream call counts. Pair the route matrix with one browser submission so server validation and visible feedback remain connected without duplicating every case in the UI.

[Browse verified QA skills](/skills), choose a skill detail page, and add the review validation matrix to its API and browser post-flow. Use the [API testing guide](/blog/api-testing-best-practices-guide) to place that focused suite within the wider release plan.`,
};
