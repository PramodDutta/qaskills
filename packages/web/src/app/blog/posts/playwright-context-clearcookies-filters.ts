import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Context clearCookies Filters',
  description:
    'playwright context clearcookies filters: clear selected cookies without deleting unrelated state. Repo evidence maps checks and CI-safe steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Playwright',
  primaryKeyword: 'playwright context clearcookies filters',
  keywords: [
    'playwright context clearcookies filters',
    'playwright clearcookies name filter',
    'clear cookies by domain playwright',
    'delete cookie by path',
    'preserve unrelated auth cookies',
    'browsercontext selective cookie cleanup',
    'playwright cookie regex filter',
  ],
  relatedSlugs: [
    'playwright-browser-context-guide-2026',
    'playwright-storagestate-authentication-reference',
    'playwright-auth-state-multiple-user-roles',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-browsercontext#browser-context-clear-cookies',
    'https://playwright.dev/docs/auth',
    'https://playwright.dev/docs/browser-contexts',
  ],
  repoEvidence: [
    'seed-skills/playwright-advance-e2e/SKILL.md',
    'seed-skills/playwright-cli/references/storage-state.md',
  ],
  content: `Playwright context clearCookies filters remove matching cookies by name, domain, or path while leaving other browser state in the same context. Capture safe before data, apply the narrowest filter, and inspect the remaining names. Then prove the target is gone and the unrelated login still works before cleanup ends.

## What Does Playwright Context clearCookies Filters Control?

Playwright context clearCookies filters control which cookies a BrowserContext removes from its current cookie jar. Name, domain, and path can narrow the set instead of clearing every cookie.

The [BrowserContext clearCookies reference](https://playwright.dev/docs/api/class-browsercontext#browser-context-clear-cookies) defines the optional filters. Current filter values can use strings or regular expressions for each supported cookie field.

Calling \`clearCookies()\` without options has a wider meaning and should appear only in a test that asks for a blank cookie jar. It removes all cookies from that context, which may clear authentication, consent, preference, and experiment state together.

A filtered call affects matching cookies in the selected BrowserContext and leaves the rest of that same jar in place for the next page read. It does not clear cookies from another context, browser profile, device, or server-side session store.

It also does not remove local storage, session storage, IndexedDB, cache, or application database rows. Those state types need their own cleanup rules.

Cookie identity includes more than its name, so the test log should join name, host, and path in one safe key. Two cookies can share a name but use different domains or paths, so a name-only deletion may remove a wider set than the test intends.

A domain-only filter can also match several named cookies. Use it when the test owns the full cookie group for that host, not when one preference must be removed.

The product result should prove more than an API call. The target behavior must reset, while a preserved login or preference should remain visible after reload.

The [official browser contexts guide](https://playwright.dev/docs/browser-contexts) defines isolated browser sessions, while the [QASkills BrowserContext guide](/blog/playwright-browser-context-guide-2026) covers their test design. Selective cleanup is useful inside one context, while a new context is often clearer for full isolation.

The release rule is to list safe cookie metadata before and after, record the exact filters, and assert both removal plus preservation. Never log secret values as routine evidence.

Playwright context clearCookies filters give tests a narrow state mutation. They do not justify reusing one context across unrelated cases without a clear fixture design.

## How Does Playwright clearCookies Name Filter Work?

Playwright clearcookies name filter evaluates the cookies held by the BrowserContext and removes those whose name matches the supplied string or regular expression. Other filters can narrow that match further.

A string supports an exact expected value. Use \`name: 'experiment'\` when the owned cookie has one fixed name and no other same-name scope should be removed.

A regular expression supports a deliberate family, such as test-owned experiment names. Anchor it when the family boundary is exact, or a partial match may clear an unrelated name.

Adding \`domain\` and \`path\` creates a more specific intersection. A cookie must match the supplied filters, which is useful when the same name appears at root and application paths.

Capture \`await context.cookies()\` before removal and keep only safe fields such as name, domain, path, expiry class, and flags in a sorted list for the run. Cookie values can carry session or tracking secrets.

Call \`clearCookies\` with the narrowest known fields, then obtain the cookie list again and mark each planned keep or drop as a pass or fail. Compare complete identities rather than only the number of remaining cookies.

Reload or revisit the target page after cleanup when the product reads cookies on navigation, and save the safe page state shown after that new read. A page already in memory may keep derived state even though the jar changed.

Observation answers which cookies remain in the context. Assertion answers whether the selected behavior reset and the unrelated authenticated UI still identifies the expected test user.

The [Playwright authentication guide](https://playwright.dev/docs/auth) warns that stored auth state can impersonate an account. Treat cookie snapshots and test reports with the same care.

Do not delete a cookie through page JavaScript when it may be \`HttpOnly\`. BrowserContext APIs can inspect and manage context cookies without depending on \`document.cookie\`.

Playwright context clearCookies filters work best with fixed, test-owned cookie identities. Discovering names from a live shared account can make the cleanup broad and unsafe.

## Clear Cookies By Domain Playwright: Repository Evidence

Clear cookies by domain playwright evidence comes from two repository sources with different scopes that should be read side by side before test code is changed. One shows context and fixture patterns, while the other lists cookie state operations and safety rules.

\`seed-skills/playwright-advance-e2e/SKILL.md\` creates a new BrowserContext for stored authentication setup, obtains its storage state, closes the context, and passes the state to a fixture. That code supports the isolation boundary used here. Cookie cleanup belongs to the owned context, and the context should close after its test rather than leaking state to another worker.

The advanced skill does not provide the filtered \`clearCookies\` snippet in this brief. The exact name, domain, path, and regex behavior comes from the approved official API source.

\`seed-skills/playwright-cli/references/storage-state.md\` documents cookie names, values, domains, paths, flags, and expiry in saved state. It also provides list, domain filter, path filter, delete, and clear operations for CLI sessions.

That reference distinguishes deleting one named cookie from clearing all cookies. Its state format shows why name alone may not describe a unique scoped cookie.

The file also warns against committing auth state and against sharing it across untrusted environments. A before-and-after report should therefore exclude values and keep artifacts private.

Together, these sources support a safe process. Use BrowserContext code for the filtered API call, use state metadata for evidence, and close or clean the test-owned session afterward.

The [storageState authentication reference](/blog/playwright-storagestate-authentication-reference) explains save and restore boundaries. Do not edit a saved JSON file and claim it proves live context cleanup.

Repository evidence cannot name the application's auth cookie or preference path. Read those values from project configuration and a controlled test context, then review them as fixture inputs. Playwright context clearCookies filters follow repository practice when the test owns its context, records safe cookie scope, protects auth data, and verifies cleanup through the application.

## When Should QA Teams Use Delete Cookie By Path?

Delete cookie by path when the same cookie name exists at several URL scopes and only one scope should reset. The path must match the cookie record, not merely the page URL.

A useful case has a root authentication cookie and an application-path experiment cookie with safe fixed names set by the owned test account. Clearing the experiment by name, domain, and path should leave the root login cookie untouched.

Begin with a control that proves both cookies exist in the same context and match the exact safe keys listed in the test plan. Record name, domain, and path, then assert the user is logged in before deletion.

Use a name-only filter when the cookie name is unique across the context and removing every scoped copy is intended. Simpler scope is safer when it is also exact.

Use a domain filter when a full test-owned host group must reset. Do not use it when shared authentication or consent cookies live on that domain.

Use a path filter with name when duplicated names create ambiguity. A path-only filter can remove several cookies that happen to share that path.

Use a regular expression only for a reviewed family of names, domains, or paths. Anchored expressions make the intended boundary easier to see in code review.

Use a fresh BrowserContext instead when the test needs a fully clean jar and no preserved state. New context setup often states full isolation more clearly than broad deletion.

The [multiple role auth guide](/blog/playwright-auth-state-multiple-user-roles) helps when tests need distinct signed-in users. Do not mutate one role's cookie jar to imitate another role.

Avoid selective cleanup when server state also needs reset. Removing a browser cookie may leave a live server session or user preference stored in the backend.

Playwright context clearCookies filters are suitable when one browser-side cookie is the variable and the preserved state has a visible oracle. Without that oracle, the test proves only removal.

## Preserve Unrelated Auth Cookies: Failure Modes and Diagnostics

Preserve unrelated auth cookies by naming them in the before set and proving authenticated UI after the filtered call. A count comparison alone can miss the wrong cookie identity.

A product fault exists when the target cookie is gone but the application still uses stale derived state after a full page read in the same owned test flow. Inspect other storage and server responses before widening cleanup. A test fault exists when domain or path differs from the real cookie, a regex is too broad, or the assertion checks a page that never rereads the jar.

An environment limit exists when a proxy changes hosts, an identity service rotates cookies, or CI starts with another auth state. Compare safe cookie identities and account labels.

The first common mistake calls \`clearCookies()\` with no filters even though the case asks to keep the signed-in user and their safe test choice. Login then disappears, and a test may blame the product action that follows.

The second mistake assumes the page host equals the cookie domain text. Host-only and domain cookies can appear with different domain forms, so inspect the returned record.

The third mistake uses the page route as the cookie path. Cookie path matching follows cookie scope, and a guessed path can leave the target active.

The fourth mistake uses an unanchored regex such as \`/session/\`. It may remove \`session\`, \`session_backup\`, and other names outside the planned case.

The fifth mistake prints full cookies after failure. Values can grant access or expose user data, while names, paths, domains, and flags usually provide enough diagnosis.

Use the [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) to keep contexts and test data isolated. Selective deletion should not compensate for a fixture that shares mutable auth across tests.

Playwright context clearCookies filters diagnosis should end with a fresh read plus a UI check. If identity fails, compare the removed cookie identities before changing product assertions.

## BrowserContext Selective Cookie Cleanup: Evidence and CI Assertions

BrowserContext selective cookie cleanup evidence must include before identities, exact filters, after identities, preserved names, and authenticated UI state. Values should remain redacted.

Build a canonical identity from name, domain, and path and sort those keys so each before and after set is easy to scan by eye. This key lets the report distinguish same-name cookies without retaining their private content.

Before cleanup, assert that the target key and each preserved key exist in the same context and tie them to the shown test account. If setup is wrong, stop before deletion so the test does not pass on an absent target.

After cleanup, require the target key to be absent from the new sorted set made right after the filtered call. Also require every preserved key to remain, since a zero target alone cannot expose broad deletion.

Reload the account page and assert the expected test identity with a stable role, label, or safe test name that a peer can check. This provides user-facing proof that the auth cookie still works, not just that a name remains.

Navigate to the feature that reads the target cookie and assert its reset state. The product may cache its old choice until reload, navigation, or a new request.

Record the filter type and text without turning a regular expression into an unclear object string that hides the start, end, or case rule. Store its source and flags in the test annotation.

CI should use one context and owned account for this focused case. Parallel tests must not rotate or revoke the same server-side auth session.

Add a controlled failure with the wrong path and expect the target to remain. Then use the correct path and require removal plus preserved login.

The [skills catalog](/skills) can supply reusable browser state checks, but cookie names and safe evidence rules belong to the application repository. Playwright context clearCookies filters pass CI when the target disappears, each protected identity remains, authenticated UI survives, reset behavior appears, and no secret enters artifacts.

## Playwright Cookie Regex Filter Comparison Table

A playwright cookie regex filter is one of four cleanup choices. The matrix compares exact name, host scope, path scope, and unfiltered deletion by evidence plus risk.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| Name filter | Remove one unique cookie name or anchored family | Before and after identities, name rule, and target absence | Same-name cookies at other scopes also leave |
| Domain filter | Remove a full owned host group | Domain text, removed identities, and protected host checks | Auth and preference cookies share the domain |
| Path filter | Remove a scoped cookie where names repeat | Name plus path, target key, and preserved root key | Guessed path leaves the target active |
| Unfiltered \`clearCookies\` | Start with a fully empty cookie jar | Full before list, empty after list, and signed-out state | Unrelated auth and preferences disappear |

The name row is clear when names are unique. Add domain and path when the same name exists more than once or only one host scope belongs to the test.

The domain row is wider and needs an inventory of protected cookies. A host can serve login, consent, feature, and analytics state through separate names.

The path row is strongest when combined with name. A path by itself can match unrelated cookies that share a common application scope.

Unfiltered cleanup is valid for a clean-cookie test. It should expect signed-out or reset behavior and should not appear in a case that promises preserved login.

Regex can be used in the first three rows, but its source and flags need review. Anchor exact families and add negative examples that must remain.

The [blog index](/blog) links cookie checks with auth and BrowserContext design. Use those guides when selective cleanup starts replacing proper test isolation.

Playwright context clearCookies filters should choose the narrowest row that removes every intended target. Wider deletion needs stronger preserved-state checks and a clear reason.

## How Do You Implement Playwright Context clearCookies Filters?

Implement Playwright context clearCookies filters by reading safe cookie identities, asserting setup, applying one exact filter, and reading the jar again. Then reload and verify both reset plus preserved behavior.

1. Read \`seed-skills/playwright-advance-e2e/SKILL.md\` and create an owned BrowserContext with known auth, preference, and target cookies.
2. Capture names, domains, paths, and flags before cleanup, then assert the target and protected identities exist.
3. Call \`context.clearCookies\` with the narrowest name, domain, path, or anchored regex filters.
4. Capture the after set, require target absence, and require every protected cookie identity to remain.
5. Reload the relevant pages, assert authenticated identity and reset feature behavior, then run a wrong-scope control.
6. Redact evidence, close the context, remove temporary state, and repeat the focused case with CI browser settings.

The first example removes one experiment cookie at the root domain and path. The before set is reduced to safe identity fields before it enters an annotation.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('clears one experiment cookie', async ({ context, page }) => {
  const before = (await context.cookies()).map(({ name, domain, path }) => ({
    name,
    domain,
    path,
  }));

  expect(before).toContainEqual({
    name: 'experiment',
    domain: 'qaskills.sh',
    path: '/',
  });

  await context.clearCookies({
    name: 'experiment',
    domain: 'qaskills.sh',
    path: '/',
  });

  await page.reload();
  await expect(page.getByTestId('experiment-mode')).toHaveText('control');
});
\`\`\`

Use the exact domain returned by the controlled context. If the application sets a leading-dot domain, update the fixture and filter from that reviewed value.

The second example proves the target left while authentication and preference cookies remain. It checks both metadata and visible signed-in state.

\`\`\`typescript
const remaining = await context.cookies();
const remainingNames = remaining.map((cookie) => cookie.name);

expect(remainingNames).not.toContain('experiment');
expect(remainingNames).toContain('session');
expect(remainingNames).toContain('preferences');

await page.goto('/account');
await expect(page.getByTestId('account-name')).toHaveText('Cookie Test User');
await expect(page.getByRole('link', { name: 'Sign out' })).toBeVisible();
\`\`\`

This assertion checks names for readability, while the full test should compare name, domain, and path keys when duplicate names can exist. Create the context from a fixed test fixture rather than a developer profile, and give that fixture one clear owner plus a short reset path. The test should know which three cookies exist before it attempts cleanup.

Read cookies only after setup has finished and the page shows the test account that the case is meant to keep signed in. An auth redirect can set or replace cookies, so capturing too early creates a false before set.

Normalize evidence into sorted identity keys. Stable order keeps reports easy to compare without treating browser return order as a product rule.

Apply exact strings in the first case and keep those raw strings near the safe before keys in the test report. Add regex coverage only when the application owns a real cookie family that exact names cannot express well.

For a regex family, use an anchored pattern such as \`/^experiment_(a|b)$/\` and keep the full rule in plain text next to the safe cookie keys for that run. Add \`experiment_backup\` as a negative cookie that must stay.

Do not use a broad domain regex simply to handle test and live hosts. Parameterize the exact expected test domain and keep live accounts outside this workflow.

After deletion, call \`context.cookies()\` again before page navigation and save the new safe keys with the filter that made the change. This isolates the BrowserContext result from any cookie the page may set on reload.

Then reload or navigate to the feature page. Assert the experiment returns to control while the account marker still names the test user.

For the wrong-path control, call cleanup with a path that does not match and use the same jar, page, and test user as the good path check. Require the target to remain, which proves the correct case did not pass because setup lacked the cookie.

For an unfiltered control, use a separate context and expect all cookies to leave. Do not run that call in the preserved-login case.

Protect server state too. Clearing a cookie can end browser access without revoking a server session, so logout security belongs in another focused test.

Keep auth values out of traces and annotations, and let each saved line show only the safe name, host, path, and pass mark needed by the review. If a trace includes request headers, apply the project's approved retention and access limits.

Use the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli) for safe cookie inspection during diagnosis. Move the final identity and behavior rules into the maintained test.

The [storageState reference](/blog/playwright-storagestate-authentication-reference) can help create controlled login fixtures, while the [auth role guide](/blog/playwright-auth-state-multiple-user-roles) keeps test users and their state apart. A saved file is input, while live \`context.cookies()\` data is the cleanup evidence.

Run the smallest cookie specification locally with one worker. Then run it under the normal browser project and check that no parallel case shares the same account session.

Close the context in a guaranteed cleanup path. If the test wrote a temporary storage-state file, remove it through the fixture and never attach it by default.

Write the CI result as target key, filters, protected keys, after result, account result, feature result, and cleanup, with each fact on one short line in the same run file. This is enough for review without any cookie value. Playwright context clearCookies filters are implemented correctly when exact target scope leaves the jar, unrelated state survives, and the page reflects both facts after reload.

## Frequently Asked Questions

### What is the safest way to use playwright clearcookies name filter?

Use an exact name after confirming it is unique in the controlled context. Add domain and path when same-name cookies exist. Capture only safe identity fields before and after, then assert target absence, protected cookie presence, authenticated UI, and the feature's reset state.

### How do you verify clear cookies by domain playwright?

List safe cookie identities for the context, apply the reviewed domain filter, and compare every removed key with the planned host group. Add negative checks for protected cookies on other domains. Reload the page and verify the product state that should change after those cookies leave.

### When should a QA team choose delete cookie by path?

Choose path scope when one cookie name exists at several paths and only one copy should leave. Combine path with name, and often domain, for clear intent. Use the exact returned cookie path, then prove a wrong-path control leaves the target present.

### What causes failures in preserve unrelated auth cookies?

Unfiltered cleanup, broad regex, wrong domain forms, wrong paths, auth rotation, early capture, or shared accounts can remove or replace protected state. Compare full identity keys, not counts alone. Verify the visible account after reload before deciding whether product code or test scope failed.

### Which evidence should browsercontext selective cookie cleanup retain?

Retain sorted name, domain, and path keys; exact string or regex filters; protected identities; target absence; account result; reset feature result; browser project; and cleanup status. Omit all values and secrets. This evidence shows both narrow removal and preserved state without exposing credentials.

### How should CI handle playwright cookie regex filter?

Use anchored reviewed expressions, fixed positive and negative cookie names, one owned context, and one worker for the focused case. Record regex source plus flags, then rerun under normal project settings. Close the context and delete temporary auth files even when an assertion fails.

## Conclusion

Playwright context clearCookies filters should remove the smallest intended cookie set and leave every protected identity in place. Use name, domain, and path from the live controlled context rather than guessing scope.

Adoption needs safe before and after identities, exact filters, target absence, protected cookie checks, authenticated UI, reset feature state, and cleanup. Cookie values do not belong in routine evidence.

Browse the [skills catalog](/skills), then open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli). Install it and apply this focused verification workflow before changing shared browser state.`,
};
