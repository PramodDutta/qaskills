import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Unsubscribe network failure ui tests',
  description:
    'unsubscribe network failure ui tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'unsubscribe network failure ui tests',
  keywords: [
    'unsubscribe network failure ui tests',
    'unsubscribe fetch rejection test',
    'email opt out error ui',
    'backend unsubscribe error message',
    'react network failure state',
    'unsubscribe non ok response',
  ],
  relatedSlugs: [
    'testing-hmac-unsubscribe-token-tampering-expiration',
    'error-handling-testing-patterns',
    'react-nextjs-testing-complete-guide',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://react.dev/reference/react/useEffect',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'packages/web/src/app/unsubscribe/page.tsx:unsubscribe async effect',
    'packages/web/src/app/api/unsubscribe/route.ts:error responses',
  ],
  content: `Unsubscribe network failure ui tests drive missing tokens, rejected fetches, malformed bodies, non-OK JSON, and success through the page effect. Every path must leave loading and show stable feedback. Backend JSON errors should appear verbatim, while network or parse failures should use the page's fallback message.

This plan observes the request, visible state, icon branch, and navigation together. It never treats a mocked 500 response as a network rejection because those paths execute different code. Open the [unsubscribe page](/unsubscribe) after the automated matrix protects each result.

## Unsubscribe network failure ui tests: What Must the Suite Prove?

Unsubscribe network failure ui tests must prove the page exits loading for every terminal outcome and renders the message selected by its actual branch. Missing tokens, rejected promises, malformed response bodies, non-OK JSON, and successful JSON need separate cases with exact request and UI assertions.

The effect starts with status \`loading\` and a processing message. When no token exists, it sets status to \`error\`, sets a specific missing-token message, and returns before defining or calling the async request. The strongest case asserts zero fetch calls.

With a token, the page posts JSON containing \`token\` and \`type\` to \`/api/unsubscribe\`. It awaits \`res.json()\` before checking \`res.ok\`. Therefore, a non-JSON response reaches the catch fallback even if its HTTP status is a normal non-OK status.

A non-OK JSON response follows a different branch. The page uses \`data.error\` when present, otherwise it uses \`Failed to process your unsubscribe request.\` It sets error status and returns before constructing any success label.

A rejected fetch also reaches the catch branch, which uses \`Failed to process your unsubscribe request. Please try again later.\` That extra sentence distinguishes transport or parse failures from non-OK JSON without an error field.

The page's error rendering shows the alert icon, descriptive message, support text, and a Return to Home link. It does not render a retry button. Tests should describe the navigation that exists instead of inventing a retry action.

The [React useEffect reference](https://react.dev/reference/react/useEffect) explains effect setup and dependencies. Repository code remains the authority for exact messages and branches. Use the [QA skills catalog](/skills) after this user-facing error boundary passes.

## Which QASkills Code Paths Own This Contract?

The component behavior appears at \`packages/web/src/app/unsubscribe/page.tsx:unsubscribe async effect\`. That path reads token and type query values, performs the POST, parses JSON, selects status and message, and renders loading, success, or error content.

The server response behavior appears at \`packages/web/src/app/api/unsubscribe/route.ts:error responses\`. The handler returns 400 for a missing token, 400 for an invalid or expired token, 404 for a missing user, and 500 when an exception reaches its catch block.

The route's successful branch updates an existing preference row or creates defaults with the selected email flag disabled. It returns only \`{ success: true }\`. The page does not display a server success message, because it constructs wording from the requested type.

The UI type map recognizes \`all\`, \`weekly\`, and \`alerts\`. A missing type becomes \`all\`, while an unknown type also falls back to the all-emails label in the page. Keep invalid-type policy separate unless the API contract is deliberately changed.

The page wraps its content in Suspense and also tracks a local loading status. Browser assertions should wait for terminal message text rather than a fixed delay. That method works whether the initial spinner comes from Suspense or component state.

The [HTTP semantics reference](https://www.rfc-editor.org/info/rfc9110) supplies general status context, but exact error text comes from the route. A backend unsubscribe error message test should assert both status and JSON before checking how the page presents it.

Read the [HMAC unsubscribe testing article](/blog/testing-hmac-unsubscribe-token-tampering-expiration) for token validation. This article uses controlled token outcomes and focuses on network and display behavior after the page loads.

## Unsubscribe fetch rejection test: Baseline Cases

Begin with no query token. The page should show \`Invalid unsubscribe link. No token was provided.\`, display the error branch, and make no POST request. This baseline proves query handling can terminate without network activity.

Next, use a token and abort the request at the browser routing layer. That creates a rejected fetch promise and should display the longer catch fallback. An unsubscribe fetch rejection test should also assert the processing text disappears and the home navigation becomes visible.

Then fulfill the request with status 500 and plain text. Because the page calls \`res.json()\` first, JSON parsing rejects and the same catch fallback appears. This is a parse-failure case, not an example of the non-OK JSON branch.

Fulfill another request with status 400 and JSON containing \`Invalid or expired unsubscribe token\`. The page should show that backend string exactly. Assert the catch-specific \`Please try again later.\` suffix is absent.

Add a non-OK JSON body without an \`error\` property. The page should show the shorter request fallback. This fixture proves message selection does not accidentally stringify an undefined value.

Finally, fulfill status 200 with \`{ success: true }\`. The page should show a success icon and the type-specific label, plus preference and home links. This allowed control proves the route mock and effect can complete successfully.

Unsubscribe network failure ui tests should inspect the outgoing body in every token case. A correct error card can still hide a request that dropped the type or sent the wrong token. Capture method, content type, and parsed body.

The [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) covers component harness choices. Use browser routing here because it exposes both fetch semantics and rendered navigation without remote service dependencies.

## Email opt out error ui: Test Matrix

The email opt out error ui matrix must distinguish transport rejection, body parsing failure, and HTTP error JSON. All three can produce an error card, but their messages and request outcomes differ. The table keeps those branches explicit.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Missing token | No token query value | Early effect return | Missing-token error and alert icon | No fetch call | Request sent or spinner remains |
| Network rejection | Route aborts POST | Effect catch | Long retry-later fallback | One rejected fetch | Backend text shown or loading persists |
| Non-JSON error response | 500 with plain text | JSON parse enters catch | Long retry-later fallback | One resolved HTTP response | Short HTTP fallback appears |
| Non-OK JSON with backend message | 400 and \`{ error }\` | \`!res.ok\` branch | Exact backend message | One completed fetch | Message lost or success shown |
| Successful unsubscribe | 200 and success JSON | Success branch | Type-specific success content | One completed fetch | Error icon or wrong label |

The missing-token row should never wait on request routing. Assert the error immediately after navigation and verify the request recorder remains empty. This protects the early return from a refactor that posts an undefined token.

The rejection row must abort or throw from fetch. Returning a 500 response still resolves fetch and cannot exercise the transport catch by itself. Label this difference in test names and failure output.

The non-JSON row also reaches catch, but only after receiving a response and failing \`res.json()\`. Record the HTTP status and content type to distinguish it from an actual network rejection. Both currently share visible fallback wording.

The backend-message row should use one exact error produced by the route. Status 400 with \`Invalid or expired unsubscribe token\` is suitable and stable. A second case can omit the property to verify the shorter fallback.

The success row should vary \`type\` across \`all\`, \`weekly\`, and \`alerts\` in a small table. Assert the corresponding label and the Manage Preferences link. Do not claim preference state from the mocked success response.

Use the [error handling guide](/blog/error-handling-testing-patterns) for broader exception matrices. This suite stays tied to the unsubscribe page's exact status and message transitions.

## How Should Backend unsubscribe error message Be Exercised?

A backend unsubscribe error message should be tested first at the route and then at the page. Route tests establish status and JSON for missing, invalid, expired, or unknown-user inputs. Page tests fulfill those exact bodies and verify the message appears in the card.

Use controlled token verification at the route boundary. Invalid token output should prevent user queries and preference writes. For a missing user case, token verification should return a known test user ID while the database select returns no rows.

At the page boundary, intercept only \`/api/unsubscribe\` and let the real component effect run. Capture the body before fulfilling. Assert one POST, JSON headers, exact token and type, terminal error text, alert icon branch, support guidance, and Return to Home.

The first code example covers rejected fetch, non-OK JSON, and visible terminal state with Playwright. Each case uses a different route action rather than changing only expected text.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('renders the catch fallback after a rejected unsubscribe fetch', async ({ page }) => {
  await page.route('**/api/unsubscribe', (route) => route.abort('failed'));
  await page.goto('/unsubscribe?token=test-token&type=weekly');

  await expect(
    page.getByText('Failed to process your unsubscribe request. Please try again later.'),
  ).toBeVisible();
  await expect(page.getByText('Processing your request...')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Return to Home' })).toBeVisible();
});

test('shows a non-OK backend JSON message', async ({ page }) => {
  let requestBody: { token: string; type: string } | undefined;
  await page.route('**/api/unsubscribe', async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid or expired unsubscribe token' }),
    });
  });

  await page.goto('/unsubscribe?token=bad-token&type=alerts');

  await expect(page.getByText('Invalid or expired unsubscribe token')).toBeVisible();
  expect(requestBody).toEqual({ token: 'bad-token', type: 'alerts' });
});
\`\`\`

Add an accessible selector for the icon only if the component gives it a stable name later. Today, message text and branch-specific links provide stronger selectors than SVG class names. Avoid binding tests to color utility classes.

Do not route every request with a broad pattern that catches page assets. Match the API endpoint exactly. A failed JavaScript chunk can produce an error page that looks unrelated to the intended react network failure state.

The [dashboard preferences page](/dashboard/preferences) is available only on success within this component. Error cases show home navigation instead. Assert that difference because it proves the rendered branch, not only the message node.

## Step-by-Step React network failure state Procedure

A react network failure state procedure should begin with query setup, then control the POST outcome, await a terminal branch, and compare with the real API contract. Keep request capture active through every step. Never use a fixed sleep as the terminal condition.

1. Open the unsubscribe page with controlled token query values.
2. Route or mock the POST request for rejection, malformed response, explicit error, and success cases.
3. Wait for loading to finish and assert heading, message, icon state, and available navigation.
4. Repeat the non-OK case against the real API error contract.

In step one, run missing-token and present-token cases separately. Include \`type=weekly\` and \`type=alerts\` in successful cases. Assert a missing type maps to the all-emails wording.

In step two, use abort for network rejection, plain text for parse rejection, JSON with status 400 for backend messaging, and JSON with status 200 for success. These controls align with fetch behavior rather than merely changing status numbers.

In step three, wait for exact terminal message text. Confirm processing text and spinner state no longer represent the page. Then assert branch-specific navigation: error offers Return to Home, while success also offers Manage Preferences.

In step four, call the route handler with controlled token verification and database results. The second code example locks representative JSON errors that the component consumes. It also asserts no update occurs for invalid input.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/unsubscribe/route';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { db } from '@/db';

vi.mock('@/lib/email/unsubscribe-token', () => ({
  verifyUnsubscribeToken: vi.fn(),
}));
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

it('returns the invalid-token message consumed by the page', async () => {
  vi.mocked(verifyUnsubscribeToken).mockReturnValue(null);
  const request = new NextRequest('http://localhost/api/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ token: 'bad-token', type: 'all' }),
    headers: { 'content-type': 'application/json' },
  });

  const response = await POST(request);

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: 'Invalid or expired unsubscribe token',
  });
  expect(db.update).not.toHaveBeenCalled();
  expect(db.insert).not.toHaveBeenCalled();
});
\`\`\`

Add route cases for missing token, missing user, and thrown database work using the same request builder. Assert their exact 400, 404, and 500 bodies. Then feed each JSON body into a page test rather than inventing alternate wording.

Use the [unsubscribe page](/unsubscribe) for a final manual check with a test token only in an isolated environment. Never place a production unsubscribe token in screenshots, logs, or source fixtures.

## Unsubscribe non ok response: Assertions and Diagnostics

An unsubscribe non ok response case needs request, response, state, and visible assertions. Request checks cover method, URL, content type, token, and type. Response checks cover controlled status, content type, and JSON or text body.

State checks prove the page leaves loading and chooses error rather than success. Visible checks cover heading, exact message, support paragraph, and home link. Together, these facts distinguish a correct error branch from a stalled or partially rendered component.

Unsubscribe network failure ui tests should record whether fetch rejected, JSON parsing rejected, or \`res.ok\` was false. Do not collapse all three into "network error." That label sends maintainers toward the wrong boundary.

For a backend JSON error, retain status and the safe error string. For a malformed body, retain status and content type but avoid large response dumps. For a rejected request, retain the simulated abort reason and request body.

Assert fetch call count is one for every present-token case. Effects can rerun during development behavior or dependency changes, and repeated POST calls may apply the unsubscribe action twice. The dependency array contains token and type, so each stable navigation should settle on one request.

The status code itself is not rendered, so do not search the page for 400 or 500. Assert status in the route mock or response recorder, then assert the message the component chooses. This keeps transport and presentation evidence connected without confusing them.

On success, assert no error guidance remains and the type label is correct. That positive case proves terminal rendering in the same harness. Use [Manage Preferences](/dashboard/preferences) as the branch-specific navigation check.

The [QASkills blog](/blog) can group these diagnostics with token and React testing. Keep CI artifacts small: one screenshot on failure, the request classification, and exact terminal text are usually enough.

## What Regressions and Boundaries Prevent False Confidence?

The primary false signal is fulfilling a route with status 500 and calling it a rejected fetch. Fetch resolves for HTTP responses, including non-OK responses. Only an abort or thrown fetch promise exercises the transport catch directly.

The second false signal is returning plain text while expecting a backend JSON message. The component parses JSON before checking status. Plain text therefore reaches the catch fallback, and the server's raw text never becomes the visible message.

The third false signal is asserting only that an error card exists. Missing token, transport rejection, parse rejection, and backend JSON errors all render that branch. Exact text and request evidence are needed to prove which path ran.

Unsubscribe network failure ui tests should not claim a retry button exists. Current error UI offers support guidance and Return to Home. If a retry control is added later, write a separate interaction case that counts subsequent POST requests.

Keep token validity outside mocked network semantics. The [HMAC token guide](/blog/testing-hmac-unsubscribe-token-tampering-expiration) proves signature and age checks, while this matrix controls the resulting API status. Combining both in every browser case makes failures harder to classify.

Do not infer database updates from a mocked 200 response. A page test proves request and rendering. Route integration must separately inspect preference updates for all, weekly, and alert types.

The effect has token and type dependencies. Add a navigation case that changes query values and expects one new request with the new body. Ensure the old response cannot overwrite the newer state if delayed-response behavior is later addressed by production code.

After edits to message parsing, rerun JSON error, missing-error JSON, plain text, malformed JSON, and rejected fetch cases. The [error handling article](/blog/error-handling-testing-patterns) can own generalized policies, but these exact strings belong to this page.

### Use one short card for each end state

Give each case a card with query text, fetch kind, response kind, final text, link set, and request count in that order. A reviewer can then compare the reject card with the non-OK card and see that one has no response while the other has status and JSON. Keep the same test token on all mocked cards, since its value is not what drives these page branches.

Run the cards from least work to most work: no token, fetch reject, bad body, non-OK JSON, and good JSON. This order shows that each new case gets one step farther through the effect, which makes a shared setup fault easy to spot. On a failed run, save the card and one page image after the terminal text should be shown.

- Missing token shows its own text and sends no request
- Present token sends one POST to the unsubscribe API path
- Posted JSON keeps the exact token and selected mail type
- Rejected fetch ends with the long try-again-later text
- Plain text error fails JSON parse and uses the same long text
- Non-OK JSON with error shows the server text word for word
- Non-OK JSON without error shows the short page fallback
- Good JSON shows the right label for all weekly or alerts
- Each end state hides the old processing text and wait mark
- Error state shows support text and the home link only
- Success state adds the preference link and feedback card
- Spies and route hooks are cleared before the next card runs
- Request logs keep the safe test token but never a live mail token
- Error cards state if fetch failed body parse failed or status was non-OK
- Page checks wait for final text and never use a fixed sleep
- Each mock route handles only the API call and leaves page files alone
- Good weekly and alert cases show two distinct success labels in turn
- A bad JSON body stores status and content type in the failed test card
- The final screenshot is taken after the old processing text has gone
- Each card names the one branch it must reach and the branch it must not reach
- Failed runs keep the request count final text and safe route result in one short view

## Frequently Asked Questions

### What do unsubscribe network failure ui tests prove?

They prove each request outcome leaves loading, selects the correct error or success branch, displays exact terminal text, and exposes the expected navigation. They also capture method and JSON body, ensuring a visually correct card cannot hide a malformed or repeated unsubscribe request.

### How should an unsubscribe fetch rejection test reject fetch?

Abort the matching browser route or make the fetch mock reject its promise. Do not return status 500, because fetch resolves for HTTP errors. Assert the long retry-later fallback, one attempted request, hidden processing text, and visible home navigation after the rejection.

### What belongs in the email opt out error ui matrix?

Include missing token, rejected promise, non-JSON error response, non-OK JSON with a backend message, non-OK JSON without an error field, and success. Record request count, terminal message, branch navigation, and whether response parsing completed for each controlled outcome in the suite.

### When is a backend unsubscribe error message shown verbatim?

The response must parse as JSON, have a non-OK status, and provide a truthy \`error\` field. The page then displays that field and returns from the effect. Plain text or malformed JSON fails earlier and uses the longer catch fallback instead.

### How do you assert a react network failure state reliably?

Wait for the exact terminal message instead of sleeping, then confirm processing text is gone and error navigation is visible. Capture the aborted request and assert one POST. Avoid SVG classes as primary selectors because message and link roles provide more stable branch evidence.

### What distinguishes an unsubscribe non ok response from rejection?

A non-OK response is a fulfilled fetch result whose status makes \`res.ok\` false. The component can display its JSON error after parsing. A rejection provides no response object and enters catch directly, using the retry-later fallback. Separate route controls prove each branch.

## Conclusion

Unsubscribe network failure ui tests protect the full transition from query values through POST and terminal rendering. They distinguish missing input, transport rejection, parsing failure, backend JSON errors, and success while asserting that loading always ends and branch-specific navigation appears.

[Open unsubscribe](/unsubscribe), run the error-state matrix, and keep its browser checks in the post-change Playwright flow. Use the [QA skills catalog](/skills) for related QA workflows after every terminal branch passes.`,
};
