import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Context IndexedDB Storage State',
  description:
    'playwright context indexeddb storage state: capture and restore IndexedDB authentication state. Repo evidence maps checks and CI-safe steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright context indexeddb storage state',
  keywords: [
    'playwright context indexeddb storage state',
    'playwright storage state indexeddb',
    'include indexeddb authentication state',
    'playwright browsercontext storage snapshot',
    'restore indexeddb login playwright',
    'indexeddb auth token e2e',
    'storage state roundtrip test',
  ],
  relatedSlugs: [
    'playwright-storagestate-authentication-reference',
    'playwright-authentication-testing-storage-state-2026',
    'playwright-browser-context-guide-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state',
    'https://playwright.dev/docs/auth',
    'https://playwright.dev/docs/release-notes',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/children-playwright-core-2026.ts',
    'seed-skills/playwright-cli/references/storage-state.md',
  ],
  content: `Playwright context IndexedDB storage state works by saving a BrowserContext with \`indexedDB: true\`, then opening a fresh context from that file. Prove restoration through the authenticated identity, not file creation alone. A control snapshot without IndexedDB should fail when the app keeps its only reusable credential there.

## What Does Playwright Context IndexedDB Storage State Control?

Playwright context IndexedDB storage state controls which reusable browser data crosses the boundary between two isolated contexts. The explicit option adds IndexedDB records to the cookies and local storage already represented by the standard snapshot.

That boundary matters for apps whose authentication library stores a token, user record, or session material inside IndexedDB. A default snapshot may look valid because it contains origins and cookies, yet the restored page can still return to login.

The workflow has two separate claims. Capture must contain the expected IndexedDB database for the correct origin, while restoration must establish the intended user in a newly created context.

Neither claim replaces an app check. A serialized database proves data existed during capture, but only a visible account marker or authenticated API response proves the new browser session accepted it.

Playwright contexts are isolated, non-persistent sessions, as described by the [BrowserContext guide](/blog/playwright-browser-context-guide-2026). Reusing a state file preserves selected data without keeping pages, workers, memory, or a shared context alive.

Playwright context IndexedDB storage state does not include session storage, passkeys, service-worker caches, or arbitrary browser profile files. Teams should test each separate mechanism with its documented setup rather than treating one JSON file as a complete profile.

The safest release rule is narrow: enable IndexedDB only when repository and runtime evidence show authentication depends on it. Keep a default-state control so future token migrations remain visible instead of silently widening the fixture.

## How Does Playwright Storage State IndexedDB Work?

Playwright storage state IndexedDB works when \`browserContext.storageState()\` receives the boolean \`indexedDB\` option during serialization. The resulting object or file can then initialize another context through its \`storageState\` creation option.

The official [BrowserContext storageState reference](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state) describes cookies, per-origin local storage, and optional IndexedDB data. The option is capture-time behavior, so adding it while loading an older default file cannot recover records that were never saved.

Capture begins after the login flow has fully committed its browser data. Waiting only for a redirect can race an IndexedDB transaction, so assert the signed-in UI and, when necessary, inspect the expected database before serialization.

Loading happens before pages are created in the target context. Playwright reads the state file, assigns records to their origins, and lets later navigation observe that initialized browser state.

An observation answers whether the state file has origin and database entries. An assertion answers whether the fresh context reaches the account page as the expected test user without another login.

The [Playwright authentication guide](https://playwright.dev/docs/auth) recommends keeping authentication state outside version control because it can impersonate an account. IndexedDB credentials require the same protection as cookies, even when their JSON shape appears less familiar.

Playwright context IndexedDB storage state should therefore use short-lived test accounts, a private artifact path, and deliberate cleanup. Printing the full file into a CI log is not acceptable diagnostic evidence.

## Include IndexedDB Authentication State: Repository Evidence

To include IndexedDB authentication state, start with the contract documented in \`packages/web/src/app/blog/posts/children-playwright-core-2026.ts\`. That repository article distinguishes local storage, session storage, optional IndexedDB, and passkeys instead of grouping them as generic browser storage.

Its BrowserContext discussion states that \`storageState()\` can save cookies, local storage, and optional IndexedDB across represented origins. It also shows a source context snapshot loaded into a fresh context, which establishes the correct roundtrip boundary.

The same file warns that session storage remains separate and virtual passkeys require imperative credential setup. Those exclusions prevent a misleading test from crediting IndexedDB capture for another authentication mechanism.

The repository path \`seed-skills/playwright-cli/references/storage-state.md\` supplies complementary operational guidance. It covers saving and loading state, securing authentication files, inspecting IndexedDB databases, and clearing state when isolation requires a clean browser.

Together, these sources support a focused implementation rather than a guessed schema assertion. Use the public API to produce the file, inspect only enough metadata to diagnose capture, and let a fresh authenticated page supply the release result.

The [storageState authentication reference](/blog/playwright-storagestate-authentication-reference) explains the broader file lifecycle. This procedure adds one controlled option and a negative control for applications that place authentication material in IndexedDB.

Repository evidence does not identify a real app database name or token key for every reader. Obtain those values from the app team, then record them as project-owned expectations without publishing credentials.

Playwright context IndexedDB storage state remains valid only while those expectations match the app. A library migration from IndexedDB to cookies should change the control result and trigger fixture review.

## When Should QA Teams Use Playwright BrowserContext Storage Snapshot?

A Playwright BrowserContext storage snapshot is appropriate when many tests need the same established identity but still require fresh browser isolation. It is especially useful when interactive login is slow, rate-limited, or unrelated to each test's purpose.

Use IndexedDB inclusion only after proving the default state cannot restore that identity and the missing data belongs to IndexedDB. This prerequisite prevents larger secret files and unnecessary coupling to internal databases.

A strong control creates two files after one known login. The first uses default capture, while the second enables IndexedDB; only the second should restore the IndexedDB-dependent session.

Choose a locator assertion instead when the goal is simply to verify login behavior in the current page. Choose a setup project when authentication state must be refreshed once before several browser projects execute.

Choose direct API authentication when the product supports a stable test login endpoint. That route can establish server state faster, after which Playwright context IndexedDB storage state captures the browser-side result.

The [authentication testing guide](/blog/playwright-authentication-testing-storage-state-2026) covers role fixtures and setup dependencies. Apply those patterns before adding database-specific checks to every specification.

Do not use a saved state to test logout, first-time onboarding, account switching, or token creation itself. Those scenarios depend on transitions that a preloaded credential would bypass.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) favors user-visible outcomes and isolated tests. A snapshot is setup infrastructure, not permission to skip the behavior that defines each test's purpose.

## Restore IndexedDB Login Playwright: Failure Modes and Diagnostics

Restore IndexedDB login Playwright failures first appear as a redirect, anonymous header, unauthorized response, or unexpected login prompt in the fresh context. Classify the boundary before changing timeouts or recapturing files repeatedly.

A product failure exists when the restored credential is present and valid, yet the app reads it incorrectly or rejects its supported format. Capture the browser console and relevant response status without recording token values.

A test defect exists when capture ran before the IndexedDB transaction completed, used the default option, loaded the wrong path, or asserted a cached page. Compare the state metadata, resolved path, and fresh navigation sequence.

An environment limitation exists when CI uses another origin, account tenant, encryption key, browser build, or backend dataset. IndexedDB records are origin-bound, and server-side sessions can expire independently from their local representation.

The primary controlled failure is a file containing cookies and local storage while silently omitting the required IndexedDB credential. Make that omission intentional in one control and require anonymous behavior after loading it.

If both control and enriched files authenticate, the test has not proved IndexedDB dependence. A valid cookie, existing server session, or accidental context reuse may be satisfying the login instead.

If neither file authenticates, inspect state creation timing and account validity before blaming serialization. The [browser authentication article](/blog/playwright-authentication-testing-storage-state-2026) provides useful checks for stale state and incorrect base URLs.

If the enriched file works locally but fails in CI, log safe metadata: origin names, database names, file size, capture time, browser version, and restored account label. Never attach record values as routine evidence.

Playwright context IndexedDB storage state diagnostics should end with cleanup verification. Close both contexts, remove temporary state files, and confirm later tests start from their declared fixture rather than a leftover artifact.

## IndexedDB Auth Token E2e: Evidence and CI Assertions

An IndexedDB auth token E2E check needs paired evidence from capture and restoration. Record the state-file path, represented origins, IndexedDB inclusion flag, restored identity, and omitted-IndexedDB control result.

The release assertion should navigate a brand-new context to a protected page and check a stable identity marker. A heading, account email reserved for tests, or controlled profile response is stronger than merely avoiding the login URL.

Record the control immediately beside the success result. It should use a separate fresh context loaded from a default snapshot and should remain unable to reuse the IndexedDB-only credential.

File existence, JSON parsing, and database-name checks are diagnostics rather than final assertions. They explain why restoration failed but cannot prove that the browser and backend accepted the saved session.

CI should create state during the same job whenever credentials are short-lived or environment-bound. Cross-job artifact reuse creates uncertainty about expiry, origin, backend data, and access controls.

Redact record values before attaching metadata. Authentication files can contain bearer tokens or equivalent secrets, and the [Playwright release notes](https://playwright.dev/docs/release-notes) do not reduce that operational risk when adding storage features.

Use one account per parallel worker when backend session rules can conflict. BrowserContext isolation cannot prevent races in shared server-side refresh tokens, audit records, or account state.

The [Playwright BrowserContext guide](/blog/playwright-browser-context-guide-2026) explains that fresh contexts isolate browser data, not remote users. Include the account allocation rule in the CI record so retries remain interpretable.

Playwright context IndexedDB storage state passes only when the enriched context restores the named user and the default control stays anonymous. Cleanup must also leave no reusable secret behind.

## Storage State Roundtrip Test Comparison Table

A storage state roundtrip test should compare setup choices by what they preserve and what they can actually prove. The matrix keeps the control, evidence, and misuse risk visible during review.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| Cookies and local storage | Authentication uses standard state fields | File path, origins, restored identity, and control result | IndexedDB credentials are silently omitted |
| IndexedDB inclusion | Authentication material lives in IndexedDB | Inclusion flag, database metadata, restored identity, and control result | Sensitive database records enter artifacts |
| Fresh context control | Saved state must be isolated from process memory | Separate context IDs, clean creation, and observed identity | A shared page or context invalidates the proof |
| Interactive login | State needs creation or deliberate refresh | Login outcome, capture time, account, and secure file path | Teams treat setup as the feature assertion |

Cookies and local storage remain the smallest suitable choice for many apps. Do not add IndexedDB because the option exists; add it when the default control proves it is required.

IndexedDB inclusion carries a broader secret surface and a stronger dependency on origin-specific application storage. Review file retention, access, and redaction before enabling uploads.

The fresh context row is mandatory for reliable proof. Loading state into the source context says nothing about whether serialization captured the data needed by another isolated session.

Interactive login is a producer of state, not the roundtrip result. Keep its screenshots and selectors separate from the restored-context assertion so either boundary can fail clearly.

The official API and repository contracts agree on this separation. The API defines supported serialization, while \`packages/web/src/app/blog/posts/children-playwright-core-2026.ts\` documents which browser mechanisms remain outside that format.

## How Do You Implement Playwright Context IndexedDB Storage State?

Implement Playwright context IndexedDB storage state by creating both an enriched snapshot and a default control after one completed login. Then load each into its own new context and compare authenticated behavior.

1. Read \`packages/web/src/app/blog/posts/children-playwright-core-2026.ts\` and identify the application's expected authentication boundary.
2. Complete login, assert the signed-in identity, and wait for the application-owned persistence signal before capture.
3. Save one default snapshot and one snapshot with \`indexedDB: true\` under a protected temporary directory.
4. Open separate fresh contexts from both files, then navigate each to the same protected route.
5. Require the enriched context to show the expected user and the default control to remain anonymous.
6. Record safe metadata, close contexts, remove files, and repeat the focused check under CI settings.

The primary implementation uses the documented capture option and creates a new context from that file. The account and URL are fixtures owned by the test environment.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('restores an IndexedDB-backed login', async ({ browser, page, context }) => {
  await page.goto('/login');
  await signInAsIndexedDbUser(page);
  await expect(page.getByTestId('account-name')).toHaveText('IndexedDB Tester');

  const statePath = 'playwright/.auth/indexeddb-user.json';
  await context.storageState({ path: statePath, indexedDB: true });

  const restored = await browser.newContext({ storageState: statePath });
  const restoredPage = await restored.newPage();
  await restoredPage.goto('/account');
  await expect(restoredPage.getByTestId('account-name')).toHaveText(
    'IndexedDB Tester',
  );
  await restored.close();
});
\`\`\`

The failure example proves that ordinary state does not satisfy the same contract. It also captures only safe structural evidence for review.

\`\`\`typescript
const defaultPath = 'playwright/.auth/default-user.json';
await context.storageState({ path: defaultPath });

const control = await browser.newContext({ storageState: defaultPath });
const controlPage = await control.newPage();
await controlPage.goto('/account');

await expect(controlPage).toHaveURL(/\\/login(?:\\/|$)/);
await expect(controlPage.getByTestId('account-name')).toHaveCount(0);

test.info().annotations.push({
  type: 'storage-control',
  description: 'indexedDB=false; restoredIdentity=anonymous',
});
await control.close();
\`\`\`

Run the smallest specification first, then repeat it in the configured browser projects. The [storageState reference](/blog/playwright-storagestate-authentication-reference) can guide fixture extraction after the focused proof behaves consistently.

Keep state paths out of published artifacts and remove them after the job. For reusable skill guidance, open the [Playwright CLI skill](/skills/Pramod/playwright-cli) and adapt its protected storage workflow.

### Review One Storage Run From Start to Finish

Start with one clean test user and one fresh browser, then sign in through the normal test flow; save both state files in the same run. This keeps host, user, and server age the same. A fair pair makes the control easy to trust.

Give each file a plain name that tells the reviewer which save option was used; keep those names free of user data. Store them in a locked test folder. Remove old files before the run starts.

Wait for a clear signed-in mark before either save call begins; the mark can be a user name or account heading. It should come from the app, not the test. This check keeps a late write from spoiling both files.

Ask the app team which store holds the sign-in key and which host owns that store; write those facts in the test plan. Do not copy the key value. A name and host are enough for most checks.

Save the plain state file first, then save the file that adds IndexedDB data; keep both calls close in time. Do not sign in twice between saves. One source state gives the pair a sound base.

Check that each save call ends with no error and creates the path you chose; do not call that a pass yet. A file can exist with the wrong data. The new context still has to prove the claim.

Open the plain file in one new context and the rich file in a second new context; do not share pages between them. Give both the same base URL. This keeps the test from using state left in memory.

Visit the same locked page in both new contexts and wait for the first clear app result; the plain case should show sign-in. The rich case should show the test user. Any other pair needs review.

If both pages show the user, look for a cookie or server link that can sign in alone; the app may not need IndexedDB now. Keep the control result in the report. It can show when the app state model has changed.

If both pages show sign-in, check the save time before you change any wait; the app may write its store after the page moves. Add a true app signal for that write. Do not add a blind sleep.

If the rich page shows the wrong user, stop the run and treat the file as unsafe; a file from an old job may have been read. The path may also point at shared state. Delete both files before the next try.

If the rich page fails on one host, compare the saved host list with the page host; IndexedDB data is bound to its web origin. A test host change can break a good file. The report should show host names, not stored values.

Keep the state file out of screenshots, logs, and broad test uploads; the file may grant the same access as a password. A safe report names the path and result. It does not print the file body.

Use one test user for each worker when the server links a token to one live use; this rule stops two jobs from revoking each other. It also makes a retry easier to read. Browser state alone cannot split one server account.

Close the two new contexts even when one check fails, then remove both files in a final cleanup step. Check that the paths no longer exist. A failed run must not leave a key for the next run.

Run the pair once on a local host and once with the same CI flags used for release; compare the browser name and host. Compare the two app results. Large gaps point to the build or host, not the save call alone.

Keep one small row for each run in the test report; record date, browser, host, plain result, rich result, and cleanup result. These facts fit in one view. They do not expose the sign-in key.

Review the row when the auth code or browser package changes; do not wait for a broad suite fault. A quick state pair can show the break at once. The [Playwright test practices guide](/blog/playwright-testing-best-practices-2026) can help keep that check small.

When the plain file starts to pass, remove the rich option only after the team confirms the new state rule; run the pair once more. Keep the old result with the change note. This turns a quiet app shift into a clear test update.

When the rich file alone still works, keep the option and the clean control; do not add checks for each stored record. The user result is the main proof. Store names and file facts are aids when that proof fails.

Check what happens when the test key dies while both files still sit on disk; let the short test life end, then load each file in a new page. Both cases should now ask for sign-in. This proves the server can end old state.

Try one rich file against a host that must not own its state; use a safe test host with no live user data. The page should not show the saved user. This guards the web origin rule with a clear no case.

Ask if the app writes more than one database for the same host; save a file after each store has reached its known state. Then use the locked page as the main check. Store count alone must not set the pass result.

Keep a passkey test out of this state pair; a passkey uses its own browser setup and key data. If the app can sign in with both means, turn one off for this case. The control must test one path.

Run the pair after a clean browser update before the full suite starts; use one test user and one page. A fast check can catch a state shape change soon. It also gives the team a small fault to read.

Test a bad file path with fake state that cannot grant access; the new context should fail with a clear setup error. Do not fall back to a blank context and call it a sign-in fault. Setup and app faults need their own names.

Make the state folder with the least file rights that the job can use; check those rights once in the job. A broad read grant can turn one test key into risk for all tasks on the host. Keep the folder short lived.

Write each file to its final path through the Playwright save call; do not copy half-made JSON from a live stream. Start the load only after the save call ends. This keeps a torn file from looking like an app bug.

Make cleanup fail on purpose in one safe test run; the job should still mark the left path and block broad upload. Then remove it by hand in the test host. This proves the last guard works when the first delete does not.

Use the same state pair on a retry, but make new files for that try; add the try number to each safe path. Do not let a retry read the first run by chance. A pass from old state is not a true retry.

When the auth team moves its key, ask for the old and new store names in the change note; run the pair before and after the move. Keep the user check the same. This shows whether the test changed for a sound cause.

If the app needs two hosts for sign-in, list both hosts in the safe report; load the rich file with each host up. Block one host in a no case. The page result should tell which part of the chain is required.

Check the file age just before it is loaded; reject a path from an old day or old job. This does not prove the key is live, but it blocks stale test input. The app user check still gives the final answer.

Keep the rich state test in a small group with a clear owner. Do not make each page test read the raw file. Use one shared fixture path and one clean load rule. This keeps state work out of the page checks.

At review time, ask three short questions: did the rich page show the right user, did the plain page stay out, and did all state files get wiped. A yes to all three is the pass. Any no has one next place to check.

## Frequently Asked Questions

### What is the safest way to use playwright storage state indexeddb?

Use a short-lived test account, capture with \`indexedDB: true\`, and store the file outside version control. Load it only into a new context, assert a stable identity, keep a default-state negative control, redact record values, and delete the artifact when the focused run finishes.

### How do you verify include indexeddb authentication state?

Inspect safe state metadata for the intended origin and database, then prove behavior in a fresh context. The decisive check is that the expected user returns without login while an otherwise identical snapshot created without IndexedDB remains anonymous. File size or successful JSON parsing alone is insufficient.

### When should a QA team choose playwright browsercontext storage snapshot?

Choose a snapshot when many isolated tests need an already authenticated role and login is not their subject. Require a stable test account, controlled state creation, secure storage, and a fresh-context assertion. Avoid it for logout, registration, first-use onboarding, or authentication-transition coverage.

### What causes failures in restore indexeddb login playwright?

Common causes include capture before the database transaction commits, omitted \`indexedDB: true\`, an incorrect state path, a different CI origin, expired server state, or accidental account sharing. Compare safe origin metadata and the restored identity before increasing timeouts or regenerating files without diagnosis.

### Which evidence should indexeddb auth token e2e retain?

Retain the protected state path, capture time, origin names, database names, inclusion flag, browser version, expected account label, restored result, and default-control result. Do not retain token values, complete database records, or public authentication files. Those details support diagnosis without turning test evidence into credentials.

### How should CI handle storage state roundtrip test?

Create the state within the same trusted job, use worker-specific accounts when server sessions conflict, and run enriched plus default snapshots in separate fresh contexts. Upload only redacted diagnostics after failure, close every context, delete state files, and fail release unless identity and control results differ as expected.

## Conclusion

Playwright context IndexedDB storage state is justified when authentication truly depends on IndexedDB and the default snapshot cannot restore it. Release evidence must pair a named-user success in a fresh enriched context with an anonymous default control, safe metadata, and verified cleanup.

Review broader browser-state patterns in the [blog](/blog), then browse [QA automation skills](/skills) for reusable workflows. Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused storage-state verification workflow.`,
};
