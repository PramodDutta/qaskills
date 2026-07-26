import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright CLI localStorage Commands',
  description:
    'playwright cli localstorage commands: inspect and edit localStorage from a CLI session. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright cli localstorage commands',
  keywords: [
    'playwright cli localstorage commands',
    'playwright cli localstorage list',
    'set localstorage from terminal',
    'playwright localstorage json value',
    'delete localstorage key cli',
    'clear localstorage browser session',
    'inspect browser storage cli',
  ],
  relatedSlugs: [
    'playwright-cli-complete-guide-2026',
    'playwright-1-61-web-storage-api-guide-2026',
    'playwright-testing-best-practices-2026',
    'playwright-e2e-complete-guide',
  ],
  sources: [
    'https://playwright.dev/docs/getting-started-cli',
    'https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md',
    'https://playwright.dev/docs/auth',
  ],
  repoEvidence: [
    'seed-skills/playwright-cli/SKILL.md',
    'seed-skills/playwright-cli/references/storage-state.md',
  ],
  content: `Playwright CLI localStorage commands inspect or change storage for the active page's current origin and browser session. Open the intended origin, list or get the key, set one safe value, reload, and assert the visible effect. Delete that key after the check; clear all storage only for a planned full reset.

## What Does Playwright CLI localStorage Commands Control?

Playwright CLI localStorage commands control string entries held by the active browser page for its current origin. They let an operator list, read, set, delete, or clear values without writing a test file.

The official [Playwright CLI guide](https://playwright.dev/docs/getting-started-cli) lists five matching commands for local storage. Their names make the mutation scope explicit, but command success alone does not prove application behavior.

The origin boundary is essential because local storage belongs to a scheme, host, and port. The same key on a staging host is unrelated to its value on a local host.

The browser session also matters. Opening a different named session or closing the active one can produce a clean store even when the command text is unchanged.

All browser storage values are strings. A number, Boolean, or object must use the exact text format that the application reads and parses.

These commands do not replace a user-facing assertion. A stored theme value matters only if the page reloads and shows the expected theme or preference.

They also do not replace authentication setup, cookie checks, session storage, or IndexedDB tests. Each store has a different lifetime and product role.

Use the [Playwright CLI guide](/blog/playwright-cli-complete-guide-2026) for session startup and page navigation. This workflow begins after the intended page is open and its origin is known.

Playwright CLI localStorage commands are safest for focused diagnosis and setup. A durable regression should still record the state change and its user-visible result.

## How Does Playwright CLI localStorage List Work?

Playwright CLI localstorage list reads all entries for the active page origin. It is an observation command, so it should precede any mutation and follow the final cleanup.

Use \`localstorage-get\` when the key is known. A focused read exposes the exact stored string without making unrelated values part of the expected result.

The upstream [Playwright CLI skill](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md) shows list, get, set, delete, and clear as separate operations. That contract supports a narrow read-change-check-clean sequence.

First open the page that owns the value, then capture its URL. Listing before navigation may inspect an empty page origin or a previous site's store.

Set a simple value as plain text. For an object, pass one serialized JSON string and verify that reading the key returns the expected serialization.

Reload the same origin after setting the value. Some applications read storage only during startup, so an immediate DOM check can observe stale application state.

Observation ends with the stored string and current page URL. Assertion begins when the test or operator checks the UI, request, or feature state that consumes the value.

Playwright CLI localStorage commands should preserve this distinction in logs. A line saying "key exists" cannot substitute for "dark theme is active after reload."

Use the [web storage API guide](/blog/playwright-1-61-web-storage-api-guide-2026) when code-level access is more suitable than an interactive command. Both paths still need the same origin and product oracle.

## Set localStorage From Terminal: Repository Evidence

To set localstorage from terminal safely, begin with \`seed-skills/playwright-cli/SKILL.md\`. Its LocalStorage block shows the five basic commands with the sample key \`theme\`.

The sequence lists entries, gets \`theme\`, sets it to \`dark\`, deletes that key, and offers a separate clear command. The separation supports least-change cleanup by default.

The detailed file \`seed-skills/playwright-cli/references/storage-state.md\` repeats those operations and adds a JSON example. It stores a serialized object under \`user_settings\` with theme and language fields.

That reference also distinguishes local storage from session storage and complete saved state. Reviewers can therefore identify which lifetime and scope the command changes.

The same file demonstrates state save and load for a larger browser snapshot. That broader tool is useful for reuse, but it carries more data and a larger security boundary.

The official [authentication guide](https://playwright.dev/docs/auth) warns that saved browser state may contain sensitive cookies and headers. Apply the same care to local values that hold tokens, user identifiers, or private settings.

Repository examples prove command syntax, not a real application's schema. Read the product code or an approved fixture before deciding whether \`dark\`, \`"dark"\`, or a JSON object is valid.

Playwright CLI localStorage commands should never guess a production token. Use synthetic values in isolated environments and redact sensitive values from command logs.

The [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) covers durable setup and assertions. Keep the CLI session as a small experiment that informs the final regression.

## When Should QA Teams Use Playwright localStorage JSON Value?

A Playwright localstorage JSON value is appropriate when the application stores one structured object as a string. The schema and serialization must be known before the command runs.

Use a fixed fixture such as theme and language preferences. Avoid live account data, access tokens, or copied production objects whose fields may expose private information.

JSON requires one serialization pass. The stored string should look like an object when read, not like a quoted string containing escaped object text.

After setting the value, get the same key and compare its parsed fields. Then reload and assert the product feature that reads those fields.

Use a scalar command for direct string settings such as \`theme=dark\`. Adding JSON quotes to a scalar can make the application read the literal quote characters.

Use a locator assertion when the user can change the same preference through the page. That route often gives stronger product coverage than a storage-only mutation.

Use CLI storage when preparing a narrow state, reproducing a parser issue, or checking migration behavior. Use a test fixture when the sequence belongs in every CI run.

The [testing practices guide](/blog/playwright-testing-best-practices-2026) favors behavior that users can observe. Pair storage checks with a visible theme, locale, consent state, or feature response.

Playwright CLI localStorage commands can establish a controlled precondition, but they should not bypass the only behavior under test. If the feature is the settings form, exercise that form directly.

## Delete localStorage Key CLI: Failure Modes and Diagnostics

Delete localstorage key CLI failures often start with the wrong origin, wrong session, or wrong serialization. Diagnose those inputs before treating the application as broken.

A product failure occurs when the correct stored value is present yet the page renders the wrong state after reload. Capture the safe value, page URL, and user-facing mismatch.

A test defect occurs when the command runs before navigation, checks another key, skips reload, or asserts an internal class. Correct the sequence without weakening the product check.

An environment limit occurs when storage is blocked, the browser context closes, or the target site cannot load. Report that boundary rather than writing a value into a different origin.

Double encoding is a common JSON defect. The application receives a string that contains JSON text instead of the object text it expects to parse once.

The opposite defect is broken shell quoting. The shell may split spaces or braces, leaving a partial value even though the intended JSON looked correct in the script.

Use \`localstorage-get\` immediately after setting the key. If the readback differs, fix command quoting before reloading or examining the UI.

Delete only the target key during cleanup. A broad clear can erase login state, feature seeds, consent choices, and unrelated setup needed by later checks.

Playwright CLI localStorage commands should include a controlled wrong-origin case. Open another origin, show the key is absent there, then return to the target without writing.

Use the [CLI guide](/blog/playwright-cli-complete-guide-2026) to keep named sessions explicit. Session confusion can look exactly like lost data when commands silently target another browser.

## Clear localStorage Browser Session: Evidence and CI Assertions

To clear localstorage browser session state, first decide whether one key or every key belongs to the test. The default cleanup should match the smallest state changed.

Record the page origin, key name, redacted value class, serialization form, reload result, and UI assertion. Those fields let reviewers reproduce the check without exposing the value.

For scalar data, record a safe label such as \`theme: dark\`. For secrets, record only a type, length band, or hash approved by the team.

For JSON, retain allowed field names and expected nonsecret values. Do not attach complete state files merely because the command can save them.

After deletion, reload and assert both absence of the key and the product's default behavior. One check proves storage cleanup, while the other proves the application consumed that cleanup.

After a full clear, list remaining values and expect none for that origin. Also verify that the broad reset was isolated to a disposable session.

CI should create a fresh browser session for this check and close it afterward. Reusing a shared session makes order-dependent state failures far more likely.

Playwright CLI localStorage commands need one deliberate bad-value case. Store malformed JSON in an isolated fixture and require the application to follow its documented recovery path.

The [skills directory](/skills) offers focused browser workflows for agents and reviewers. Installation helps repeat the process, but evidence and cleanup still belong to the CI job.

## Inspect Browser Storage CLI Comparison Table

An inspect browser storage CLI workflow should use the narrowest command that answers the current question. The table compares read, scalar write, JSON write, and cleanup choices.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| List or get | Observe entries before mutation | Origin, session, key, redacted value, and time | The active page belongs to another origin |
| Set scalar | Store one direct string value | Exact key, safe value class, readback, and UI result | Quotes become part of the stored value |
| Set JSON | Store one known structured value | Schema fields, serialized readback, parse, and UI result | JSON is broken or encoded twice |
| Delete or clear | Remove one key or reset disposable storage | Cleanup scope, final list, reload, and default state | Clear erases unrelated state in a shared session |

List is the safest first action because it makes no change. It still needs a captured origin, since identical keys can exist on unrelated sites.

A scalar write should remain a string from the application's point of view. Convert numbers and flags according to the product's actual parser.

A JSON write is useful only when the stored schema is stable and known. Add a parse check before relying on any later UI result.

Delete is normally safer than clear. Reserve clear for a complete reset whose session and downstream effects are both controlled.

Playwright CLI localStorage commands can move through all four rows in one experiment. Keep each transition visible so an unexpected state has one likely cause.

Read the [web storage guide](/blog/playwright-1-61-web-storage-api-guide-2026) when the test needs direct API assertions. Use the CLI path when a short interactive session gives faster diagnostic feedback.

## How Do You Implement Playwright CLI localStorage Commands?

Implement Playwright CLI localStorage commands by opening one known origin, observing current state, applying one mutation, reloading, asserting behavior, and restoring the prior state. Use synthetic data throughout.

1. Read \`seed-skills/playwright-cli/SKILL.md\` and the detailed storage reference, then identify the origin, session, key, schema, and visible product result.
2. Open the exact target page, record its URL, list entries, and get the target key before making any browser storage change.
3. Set one scalar or correctly serialized JSON value, read it back, reload the same origin, and assert the consuming UI behavior.
4. Exercise a controlled wrong-origin or malformed-value case, then classify the result as product, command, quoting, or environment behavior.
5. Delete only the target key, reload again, and prove both storage absence and the product's documented default state.
6. Repeat in a fresh CI session, retain bounded redacted evidence, and close the browser so no state reaches another test.

The first example covers a scalar success case and narrow cleanup. It keeps the origin visible and uses list output before changing the value.

\`\`\`bash
playwright-cli open https://example.test/preferences
playwright-cli localstorage-list
playwright-cli localstorage-get theme
playwright-cli localstorage-set theme dark
playwright-cli localstorage-get theme
playwright-cli reload
playwright-cli snapshot
playwright-cli localstorage-delete theme
playwright-cli reload
playwright-cli localstorage-get theme
\`\`\`

The snapshot is where an operator confirms the visible theme state. A durable test should replace manual reading with a role, text, or visual token assertion owned by the product.

The second example sets one JSON string, reads it back, and removes only that object. Single quotes protect the JSON from most POSIX shell parsing.

\`\`\`bash
playwright-cli open https://example.test/preferences
playwright-cli localstorage-set user_settings '{"theme":"dark","language":"en"}'
playwright-cli localstorage-get user_settings
playwright-cli reload
playwright-cli snapshot
playwright-cli localstorage-delete user_settings
playwright-cli localstorage-list
playwright-cli close
\`\`\`

Windows shells require different quoting, so store the command in the CI shell used by the job. Always verify readback rather than trusting portable-looking syntax.

For a controlled failure, open \`https://other.example.test\` and get the same key. The expected absence proves storage scope instead of claiming the first value vanished.

For malformed JSON, use a disposable feature fixture with a documented fallback. Never corrupt a real user's browser session to prove parser behavior.

Run \`playwright-cli localstorage-list\` locally after the target page opens. In CI, start a named clean session, run the same bounded sequence, save assertions, and close it.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) contains the command workflow. The [complete E2E guide](/blog/playwright-e2e-complete-guide) helps convert the useful experiment into stable test code.

### Review a Storage Mutation Record

Start the record with browser session name, page URL, and normalized origin. These facts prevent a value from being assigned to the wrong host.

Add the key and its approved data class. Mark it as scalar, JSON, secret, identifier, or other reviewed type without copying private text.

Capture the preflight list and focused get result. This base state shows whether the test created the value or inherited it.

Write the exact command name and shell family. Quoting rules differ, so a command that worked in one shell may not survive another.

After set, read the key before reload. A wrong value at this point is a command or serialization fault, not a rendering fault.

Parse JSON with a small approved check when structure matters. Compare known fields rather than raw property order or spacing.

Reload the same URL and record the resulting page URL. Redirects can move the page to another origin and change which storage area later commands inspect.

Check one visible feature tied to the key. A theme may change a labeled mode, while a locale may change an expected heading.

Add a negative value only when the product defines its response. An unknown enum can test fallback, but an arbitrary token may only create noise.

Return to the valid value before testing deletion. This keeps the cleanup check separate from malformed-data recovery.

Delete the single key and read it again. Then reload and verify the product returned to its documented default.

Use clear only in a fresh session made for reset testing. List before and after so the report shows every entry that the broad action removed.

Close the browser session even when an assertion fails. A cleanup hook or bounded final step should own that action in CI.

Keep command output small and redact known secret patterns. Storage logs can expose credentials even when screenshots look harmless.

Do not upload a full saved state for a scalar preference test. The larger file can include cookies and other origins that have no role.

Review whether the CLI mutation bypassed the feature under test. If the user action itself is the contract, move the regression to the UI path.

Repeat the sequence once from a clean session. A second pass catches state that survived cleanup or setup that depended on hidden prior values.

Use the same fake values locally and in CI. Random objects complicate review and can introduce fields the application does not support.

Name the pass result as storage readback plus product behavior. Either half alone leaves the contract incomplete.

Playwright CLI localStorage commands pass this record when origin, value form, visible effect, cleanup, and redaction all have clear evidence. A second clean session should reach the same end state without help from the first run.

### Prove One Key From Start to Finish

Create a fresh browser session and open one safe test page, then write the full page URL, scheme, host, port, key name, and planned fake value on the run sheet. Use a plain theme flag for the first pass, since one short word makes shell quoting and product readback easy to see.

List the store before the change and save only key names plus safe value classes, then get the target key on its own and mark whether it was absent or set. If old state is present, close that session and start again instead of shaping the test around an unknown base.

Set the theme key to one known word, read it back at once, and compare each byte of the safe text before the page is asked to reload. This quick read keeps shell faults apart from app faults, since the app has not yet had a chance to parse or show the value.

Reload the same page and check that the URL still has the same origin, then inspect one clear page sign that the stored theme is now in use. The [web storage guide](/blog/playwright-1-61-web-storage-api-guide-2026) can help when code reads the same key, but this proof must still end with the user view.

Open a second origin in the same browser and get the same key, then require an absent result without writing any value on that other site. Return to the first origin and read the key again, which proves the scope rule without making the second site part of test setup.

Replace the word with one small JSON object whose keys and value types are known, then read, parse, and compare the two safe fields in a fixed order. Keep the raw stored text as well, so a quoted JSON string cannot pass merely because a later helper parsed it twice.

Reload once more and check one page sign for each JSON field, while keeping those checks apart from the raw store read and parse result. If readback passes but the view fails, assign the fault to app use rather than shell text or browser store scope.

Set one malformed JSON string in a local fixture that has a written fallback rule, then require a safe default and one clear log or view state. Delete the bad key as soon as that check ends, since malformed state should not leak into the valid cleanup case.

Restore a valid value, delete only that key, read it again, and reload before checking the page's known default state in the same clean session. Run a final list to prove that no other key was lost, which is the key difference between narrow delete and broad clear.

Close the session and repeat the scalar path in a new one, then compare origin, readback, page sign, delete result, and final list across both runs. The proof is complete only when no raw secret, old state, broad reset, or hidden first-session aid appears in either record.

Ask a peer who did not watch the run to read only the sheet and say which page was open, which key was read, what text was set, what the page showed, and how the key was removed before the clean session closed. Have that peer run the same short path with a new session and the same fake data, then compare each read and page sign without sharing a saved state file or any old browser task.

Run the scalar and JSON forms through the same shell used by CI, while a second shell is used only to show how quote rules can change the raw text. Keep the wrong-shell case as a failed readback, not an app bug, then close both sessions and prove the normal shell leaves the store and page in their known base state.

Before signoff, hide the command notes and ask a peer to tell the full state tale from the saved URL, key class, readback, page sign, delete check, and last list while the browser stays closed and no live state can guide the answer. Then show the commands and require each step to match that tale with the same fake values and clean session names, so no shell trick, old tab, broad clear, or saved file can fill a gap that the proof itself left blank.

## Frequently Asked Questions

### What is the safest way to use playwright cli localstorage list?

Open the intended page first, record its normalized origin and session, then list entries before any mutation. Follow with a focused get for the target key. Treat output as observation only, and assert the application state separately after a reload using safe synthetic data.

### How do you verify set localstorage from terminal?

Read the key immediately after setting it, compare the exact scalar or parsed JSON fields, and reload the same origin. Then assert the feature that consumes the value. Save the command, shell type, redacted value class, readback, page URL, and visible result.

### When should a QA team choose playwright localstorage json value?

Choose JSON when the application stores a known structured object in one string and the schema is documented. Serialize exactly once, protect shell quoting, parse the readback, and verify product behavior. Prefer the UI when changing that object through user controls is the feature under test.

### What causes failures in delete localstorage key cli?

Typical causes are the wrong active origin, another browser session, a misspelled key, skipped reload, or shell quoting that changed the stored text. Broad clear commands can also remove needed setup. Check URL, session, preflight list, focused readback, and final default behavior in order.

### Which evidence should clear localstorage browser session retain?

Retain the disposable session name, origin, keys present before clear, redacted data classes, command result, empty final list, reload result, and default UI assertion. Avoid complete state files and raw secret values. Broad cleanup needs stronger proof because it changes every local value for that origin.

### How should CI handle inspect browser storage cli?

CI should create a fresh named session, open one approved origin, run the bounded read-change-check-clean sequence, and close the browser afterward. Keep command output redacted and assert a user-visible result. Fail when origin, serialization, cleanup, or product behavior differs from the written contract.

## Conclusion

Playwright CLI localStorage commands are reliable when the active origin, session, string format, product oracle, and cleanup scope are explicit. Adopt the workflow only after scalar, JSON, wrong-origin, reload, deletion, and redaction checks produce reviewable evidence.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this brief's focused verification workflow. Browse the [QASkills blog](/blog) for related storage and browser testing controls.`,
};
