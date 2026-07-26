import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright CLI Cookie Commands',
  description:
    'playwright cli cookie commands: list, set, filter, delete, and clear CLI cookies. Use repo-backed examples, evidence checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright cli cookie commands',
  keywords: [
    'playwright cli cookie commands',
    'playwright cli cookie list',
    'playwright cli cookie set',
    'playwright cli cookie delete',
    'filter cookies by domain',
    'set secure cookie terminal',
    'clear browser cookies cli',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-storagestate-authentication-reference',
    'playwright-testing-best-practices-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli',
    'https://playwright.dev/docs/api/class-browsercontext#browser-context-cookies',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/SKILL.md',
    'seed-skills/playwright-cli/references/storage-state.md',
  ],
  content: `Playwright CLI cookie commands inspect and change cookies in the active named or default browser session. List and filter first, set explicit scope and security attributes, verify browser behavior, then delete only the target cookie. Use cookie-clear solely for a deliberate full reset, and never retain secret values in evidence.

## What Does Playwright CLI Cookie Commands Control?

Playwright CLI cookie commands control cookie state attached to the browser context behind an active CLI session. They can list, get, set, delete, or clear cookies without editing application storage through page JavaScript.

The commands act on the selected session, so session identity is part of every operation. A mutation in one named session does not prove another session received the same cookie.

Cookie state includes more than a name and value. Domain, path, expiry, HTTP-only, secure, and same-site attributes determine when a browser sends or exposes the cookie.

The repository skill \`seed-skills/playwright-cli/SKILL.md\` lists the command family and session syntax. Its examples show both a default browser and named sessions created with the \`-s\` option.

The detailed file \`seed-skills/playwright-cli/references/storage-state.md\` documents domain and path filters, explicit cookie options, deletion, clearing, and a multi-cookie \`run-code\` fallback. It is the local command contract used by this workflow.

Playwright CLI cookie commands do not replace a committed authentication test, server-side session validation, cookie policy scanning, or browser-context isolation. They are best for controlled setup, exploration, and focused evidence collection.

The official [Playwright CLI introduction](https://playwright.dev/docs/getting-started-cli) presents the agent-oriented CLI as a browser automation surface. Keep its interactive session separate from the Playwright Test runner used for repeatable release gates.

A reviewable operation records session name, origin, cookie name, redacted value status, domain, path, security attributes, before state, after state, and visible application outcome. Never place a live session token in a terminal transcript.

## How Does Playwright CLI Cookie List Work?

Playwright CLI cookie list reads cookies from the active browser context. Without a filter it can expose every cookie in that session, so use the narrowest domain or path query that answers the test.

Start the intended named session and navigate to its expected origin before inspection. This makes browser context, top-level URL, and cookie scope visible together.

Use \`cookie-list --domain=example.com\` to narrow domain output. Use \`cookie-list --path=/api\` when path scope is the suspected cause, then use \`cookie-get session_id\` for one known name.

The official [BrowserContext cookies API](https://playwright.dev/docs/api/class-browsercontext#browser-context-cookies) explains the underlying browser model. When URLs are supplied to that API, it returns only cookies that affect those URLs.

The CLI filters are diagnostic views, not assertions by themselves. Compare their output with a documented expected scope and with user-visible browser behavior.

A list can contain an HTTP-only cookie even though \`document.cookie\` cannot read it. That difference is correct and helps test that client JavaScript cannot access sensitive session state.

Secure cookies should be evaluated on an HTTPS origin. Setting the attribute in a terminal does not make a plain-HTTP page an acceptable production transport.

Playwright CLI cookie commands should list before and after any mutation. The paired observations show whether the intended state changed and whether unrelated cookie names stayed intact.

## Playwright CLI Cookie Set: Repository Evidence

Playwright CLI cookie set accepts a name and value followed by optional scope and security flags. The repository skill demonstrates \`cookie-set session_id abc123 --domain=example.com --httpOnly --secure\`.

The storage reference expands that pattern with \`--path=/\` and \`--sameSite=Lax\`. It also documents \`--expires\` as a Unix timestamp for a persistent cookie.

Those examples are command references, not safe production credentials. Replace values with synthetic tokens and prevent shell history, CI logs, process listings, or captured prompts from retaining secrets.

The [Playwright CLI repository](https://github.com/microsoft/playwright-cli) is the approved upstream source for implementation and current command behavior. Pin or record the CLI version because option support can change between releases.

Set domain explicitly when the test needs a domain cookie and the environment owner approves that scope. Set path explicitly when only part of the application should receive it.

Use \`--httpOnly\` for a session cookie that page scripts must not read. Use \`--secure\` when the browser should send the cookie only through secure transport.

Choose the same-site value from the application's cross-site flow requirements. A test should verify the resulting request or authenticated UI state instead of trusting that a successful command created useful scope.

The [storage state authentication reference](/blog/playwright-storagestate-authentication-reference) explains when a saved context is preferable. Use state files for repeatable multi-test setup, while protecting them as credentials.

Playwright CLI cookie commands can prepare one focused browser state quickly. A committed setup project remains the better owner for repeatable login shared across a suite.

## When Should QA Teams Use Playwright CLI Cookie Delete?

Playwright CLI cookie delete is appropriate when one named cookie must disappear while unrelated preferences or session data remain. It creates a narrower control than wiping the complete cookie jar.

Use it to test sign-out behavior, consent revocation, expired feature enrollment, or recovery from one malformed preference. List the target and neighboring cookies before deletion.

After the command, list or get the name again and reload or navigate as the product requires. Assert the visible state that should follow, such as a login prompt or default preference.

Deletion by name can be ambiguous if the browser holds same-named cookies under different domains or paths. Inspect all matching entries and confirm which scope the CLI command removed.

When exact scoped deletion is required but the command surface cannot express it, use a controlled \`run-code\` call with BrowserContext cookie APIs. Record the code and targeted scope as part of the evidence.

Use cookie-clear only when the case explicitly needs a clean cookie jar. A full reset can remove consent, locale, experiment, anti-forgery, and unrelated account cookies, which changes several preconditions at once.

The [Playwright CLI complete guide](/blog/playwright-cli-complete-guide-2026) helps choose session, snapshot, navigation, and cleanup commands. Keep cookie mutation inside one named session to avoid cross-task state.

For a repeatable test assertion, use Playwright Test with a fresh browser context. The [complete E2E guide](/blog/playwright-e2e-complete-guide) covers isolated contexts, stable locators, and release execution.

Playwright CLI cookie commands support triage when a browser state must be changed visibly. They should not become an undocumented shortcut around the application's real authentication journey.

## Filter Cookies By Domain: Failure Modes and Diagnostics

Filter cookies by domain before diagnosing a missing session. A cookie can exist in the context yet remain ineligible for the current host because its domain or host-only scope differs.

Leading-dot and host-only behavior can be easy to misread in text output. Preserve the exact domain field, current page hostname, and expected request destination before deciding the browser failed.

Path mismatch is another common defect. A cookie scoped to \`/api\` will not behave like one scoped to \`/\`, even when both share a name and domain.

Secure state can appear present but remain unsent on plain HTTP. Record the current URL scheme and secure attribute whenever the UI does not reflect a newly set cookie.

Same-site policy matters during cross-site navigation, embedded content, and redirect-based login. Reproduce the actual top-level journey because a same-origin refresh cannot prove cross-site behavior.

Expiry errors often come from confusing seconds with milliseconds or using an old sample timestamp. Log a human-readable redacted expiry time and compare it with the runner clock.

A broad cookie-clear can create false failures by removing unrelated anti-forgery or consent state. Compare before and after inventories, then restore or recreate only approved synthetic state.

Persistent profiles introduce stale data across sessions. Use a fresh temporary profile for controlled tests, and delete its data after evidence collection according to policy.

Environment failures include wrong DNS, a different deployment host, HTTP instead of HTTPS, and proxy changes. Test defects include bad flags, wrong session selection, unsafe values, and insufficient UI assertions.

Playwright CLI cookie commands reveal context state, but the server still decides whether a token is valid. A present cookie with a rejected session may indicate expiry, signature, audience, or backend-state problems.

## Set Secure Cookie Terminal: Evidence and CI Assertions

Set secure cookie terminal workflows only with synthetic values and a controlled environment. Passing a real credential as a shell argument can expose it through history, logs, telemetry, or process inspection.

Prefer a short-lived test token created for the run. If the CLI cannot read a protected input source, use an approved setup path rather than printing the secret in a command.

Before mutation, capture cookie metadata but redact the value. A useful representation stores length or a one-way digest only when policy permits, never the reusable token itself.

After mutation, verify name, domain, path, expiry, HTTP-only, secure, and same-site fields. Then reload the relevant page and assert authenticated, logged-out, consent, or preference behavior.

The UI result is essential because a correctly shaped cookie may still be rejected by the application. Record the page URL, expected user state, visible marker, and any safe network status.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) recommends user-visible behavior and isolated state. Use metadata to explain setup, then use the product outcome as the main assertion.

CI should create a new named session and disposable profile for each job. Shared persistent profiles can leak authentication between jobs and make the before state unreliable.

Keep command output in a restricted artifact if it can reveal internal domains, account identifiers, or cookie names. Apply retention limits and remove the temporary profile after all needed evidence is uploaded.

Test a wrong-domain control and require the expected unauthenticated state. That control proves the browser is not accepting any cookie with the correct name regardless of scope.

Playwright CLI cookie commands pass this gate when before metadata, after metadata, UI behavior, and cleanup all agree. A successful terminal exit alone is insufficient evidence.

## Clear Browser Cookies CLI Comparison Table

Clear browser cookies CLI policy should reserve the broadest action for the broadest test. The table compares inspection and mutation choices by scope and diagnostic risk.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| \`cookie-list\` and \`cookie-get\` | Inspect current state before changing it | Session, URL, name, redacted value, domain, path, and attributes | Broad output exposes sensitive values |
| \`cookie-set\` | Create one synthetic cookie with reviewed scope | Before state, options, after state, UI result, and cleanup | Wrong scope creates misleading state |
| \`cookie-delete\` | Remove one named cookie while keeping other state | Matching entries, target scope, retained neighbors, and UI result | Same-named scoped entries remain |
| \`cookie-clear\` | Deliberately reset every cookie in an isolated session | Full before inventory, reset reason, empty result, and recreated state | Unrelated preconditions disappear |

Inspection should precede every mutation because it exposes duplicate names and unexpected scope. Redaction must happen before output reaches a general CI log.

Setting is appropriate for a direct state precondition, but it should not replace login coverage. Keep at least one test that exercises the product's actual cookie issuance path.

Deletion is the preferred negative control when one session or preference value drives behavior. Clearing is useful for a clean-session journey where all cookie state is intentionally absent.

The [QASkills directory](/skills) contains reusable browser and authentication workflows. Review any installed skill against the application's domain, data, and secret-handling policy.

Playwright CLI cookie commands should choose the least destructive action that proves the case. Narrow operations preserve more context and produce clearer diagnoses.

## How Do You Implement Playwright CLI Cookie Commands?

Implement Playwright CLI cookie commands in a named disposable session, beginning with scoped inspection and ending with verified cleanup. Use synthetic values and a test-owned HTTPS origin.

1. Read \`seed-skills/playwright-cli/SKILL.md\` and \`seed-skills/playwright-cli/references/storage-state.md\`, then record the CLI version, session name, origin, and expected cookie contract.
2. Open a fresh named session, navigate to the controlled HTTPS page, and list cookies by domain before reading one target name.
3. Set a synthetic cookie with explicit domain, path, HTTP-only, secure, same-site, and expiry attributes required by the case.
4. List the target again, redact its value, reload the page, and assert the corresponding authenticated or preference UI behavior.
5. Delete the named cookie and verify neighboring state remains, then use cookie-clear only in a separate full-reset control.
6. Capture session, scope, attributes, before and after metadata, UI result, command status, profile cleanup, and any approved restricted artifact.

The first example lists before state and one target without printing an application credential in source. Use a fresh domain and session assigned to the test environment.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

session="cookie-audit-\${CI_RUN_ID:-local}"
origin="https://staging.qaskills.sh"
domain="staging.qaskills.sh"

playwright-cli -s="$session" open "$origin"
playwright-cli -s="$session" cookie-list --domain="$domain"
playwright-cli -s="$session" cookie-get experiment
playwright-cli -s="$session" snapshot --filename=before-cookie-change.yaml
\`\`\`

Review snapshot and command-output policy before retention. Cookie metadata or page content can still identify a test account even when the token value is synthetic.

The second example creates one preference cookie, verifies state, then removes only that name. The value is nonsecret and suitable for a visible experiment control.

\`\`\`bash
playwright-cli -s="$session" cookie-set experiment treatment \
  --domain="$domain" \
  --path=/ \
  --secure \
  --sameSite=Lax

playwright-cli -s="$session" cookie-list --domain="$domain"
playwright-cli -s="$session" reload
playwright-cli -s="$session" snapshot --filename=after-cookie-set.yaml

playwright-cli -s="$session" cookie-delete experiment
playwright-cli -s="$session" cookie-get experiment || true
playwright-cli -s="$session" close
\`\`\`

Do not use \`|| true\` as the only deletion assertion in a release script. Parse the documented command result or verify through a restricted \`run-code\` check, then assert that the preference UI returned to its default state.

Add a wrong-domain control using a test hostname that should not receive the cookie. The page must remain in its default state even though another scoped entry exists in the context.

For a full-reset case, first inventory approved cookies, call \`cookie-clear\`, verify the jar is empty, and confirm the product returns to a clean session. Keep that case separate from targeted deletion.

The [storage authentication guide](/blog/playwright-storagestate-authentication-reference) can move a stable setup into Playwright Test. Protect state files because serialized cookies can impersonate the test user.

Open the [Playwright CLI skill](/skills/Pramod/playwright-cli) when an agent needs the exact command workflow. Pin the tool, name the session, and delete disposable profile data after evidence is secured.

Playwright CLI cookie commands should fail the workflow when the wrong session is active, expected metadata is absent, scope differs, visible behavior disagrees, or cleanup cannot be verified. Each failed phase needs its own short result and safe evidence.

### A safe cookie change card

Start the card with one short session name and one test host, plus the run ID that owns both items. Mark if the session is fresh, saved, or tied to a profile, and state when that profile will be removed.

Write the page URL before any cookie command is sent, with the expected app state shown on the same row. Its scheme and host help explain which stored item can affect the page during this one named browser run.

List only the host or path in scope for the case, using the narrow flag that the local command guide supports. A full jar dump can leak data and make the key facts hard to see in a short pass or fail card.

Write the cookie name, but mask its value before the first log, shell copy, screen shot, or saved test file. Use \`[redacted]\` rather than a fake value that may look real and may lead a peer to test the wrong token.

If a hash is allowed, state what it proves and who can read it under the team's data rule for this test. Do not hash a weak short token that can be guessed with ease from a small known set of likely test values.

Save domain and path on the same line as the name. These two facts often explain why a valid item did not reach a request.

Mark secure, HTTP-only, and same-site as yes, no, or not set. Plain words make a bad flag stand out in a fast review.

Write the end time as both raw seconds and a UTC date. This catches an old sample or a wrong time unit at once.

Take one before view, send one change, and take one after view. More steps between those views make the cause less clear.

For a set case, use a safe test value made for that run. Never paste a live user token in chat, source, or shell history.

For a delete case, list all rows with the same name first. The target row may share its name with another path or host.

For a clear case, state why all jar state may be lost. Use a fresh session so no other test need is harmed.

Reload only when the product reads the item on page load. If it reads on a click, use that real user path instead.

Check one view the user can see after the change. A command exit of zero does not show that the app used the new state.

Add a wrong-host case with the same name and safe value. The page should stay in its old state when scope does not match.

Add a wrong-path case when path is part of the product rule. This will show if the test checks name alone by mistake.

For secure state, use an HTTPS test host and mark the scheme. Do not turn off browser checks just to make a weak lab pass.

For HTTP-only state, prove page code cannot read the value when needed. The CLI view can still show that the context holds it.

Use the [storage state guide](/blog/playwright-storagestate-authentication-reference) when many tests need the same saved login. Guard the file as if it were the user key.

Use the [CLI guide](/blog/playwright-cli-complete-guide-2026) to keep session and close steps in the right order. A named session makes each card much easier to trace.

Use the [E2E guide](/blog/playwright-e2e-complete-guide) when the check must run on each build. A fresh test context is a better gate than a long-lived shell profile.

Close the named browser after the last view and wait for the command. If it used a temp profile, remove that data by the set policy.

Write pass or fail for set, scope, page state, and clean end. One broad green mark can hide a bad clean step.

When the page stays logged out, first check host, path, scheme, and end time. Then ask the server if the safe token is still valid.

When the page stays logged in after delete, look for the same name on more paths. Also check local state if the app keeps more than cookies.

Keep raw command text in a locked file only when it adds needed facts. Most pass cards need names and flags, not full tool output.

Ask a peer to state which one item changed and what stayed in place. If that is hard, narrow the case before it joins CI.

End with the session close result and the time when saved files will be gone. State the owner who will act if clean work fails.

For a host-only item, keep the exact host from the page beside the stored row and do not add a dot by habit. A broad domain form can reach more hosts than the test needs and can turn a tight case into a weak one.

For a cross-site login case, draw the start site, turn site, and end site as three short steps before the run. This path helps a peer judge the same-site flag from the real top page flow instead of one same-host reload.

When the app sets the item from a server reply, keep one test of that true issue path in the suite. A shell set is useful for a fast state case, but it cannot prove the server sent the right flags or end time.

If a saved profile is used for a local check, mark its age and last host before the browser starts. Old jar state can make a new set look sound, so clear or swap the profile when the base state is not known.

Keep one safe row for each item that must stay after a named delete, then check those rows at the end. This turns "other state stayed" from a broad claim into a small set of facts that the test can prove.

When CI ends, close the browser, wait for all file writes, and then remove the temp profile by its known root. A failed clean step should turn the job red or open a clear follow-up based on the data risk in that profile.

## Frequently Asked Questions

### What is the safest way to use playwright cli cookie list?

Open a fresh named session on the expected origin and apply the narrowest domain, path, or name filter. Redact values before logs or artifacts are stored. Record session, URL, cookie name, domain, path, expiry, security attributes, and CLI version, then compare the result with a reviewed contract.

### How do you verify playwright cli cookie set?

List the target before mutation, set a synthetic value with explicit scope and security attributes, and list it afterward. Reload the relevant page and assert visible application behavior. Include a wrong-domain or wrong-path control, then delete the cookie and confirm unrelated session state remains unchanged.

### When should a QA team choose playwright cli cookie delete?

Choose deletion when one named session, consent, preference, or experiment cookie must disappear while other browser state remains. Inspect duplicate names across domains and paths first. Verify both metadata and UI outcome after deletion, and use a fresh context when a committed repeatable test is the real goal.

### What causes failures in filter cookies by domain?

Failures commonly come from host-only versus domain scope, leading-dot assumptions, wrong active sessions, path restrictions, secure cookies on HTTP, stale persistent profiles, expired timestamps, same-site rules, or navigation to another deployment host. Preserve the current URL and every nonsecret scope attribute before assigning the issue.

### Which evidence should set secure cookie terminal retain?

Retain CLI version, session identity, origin, cookie name, redacted-value status, domain, path, expiry, HTTP-only, secure, same-site, before and after metadata, UI assertion, command status, and cleanup result. Never retain a reusable credential, and restrict artifacts containing internal hosts or test-account identifiers.

### How should CI handle clear browser cookies cli?

CI should run clearing only inside a disposable session whose complete cookie state is owned by that case. Save a redacted before inventory, require an empty after result, verify the clean-session UI, and delete profile data. Prefer named deletion when unrelated cookies must survive for a meaningful control.

## Conclusion

Playwright CLI cookie commands are trustworthy when each action targets a named disposable session, uses explicit scope, protects values, and proves a visible product outcome. Require redacted before and after metadata, domain, path, security attributes, UI state, command status, and verified cleanup before accepting the result.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Then explore [verified QA skills](/skills) while keeping production credentials outside terminal arguments and stored evidence.`,
};
