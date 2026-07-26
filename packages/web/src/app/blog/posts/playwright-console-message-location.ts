import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Console Message Location',
  description:
    'playwright console message location: capture console source URL, line, and column in CI. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright console message location',
  keywords: [
    'playwright console message location',
    'playwright consolemessage location',
    'browser console source url',
    'console error line column',
    'attach console logs playwright',
    'ci browser error source',
    'playwright console evidence',
  ],
  relatedSlugs: [
    'playwright-debug-mode-inspector-guide',
    'observability-driven-testing-guide',
    'playwright-allure-attachment-trace-guide',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/api/class-consolemessage#console-message-location',
    'https://playwright.dev/docs/events',
    'https://playwright.dev/docs/api/class-page#page-event-console',
  ],
  repoEvidence: [
    'seed-skills/console-error-hunter/SKILL.md',
    'seed-skills/playwright-cli/SKILL.md',
  ],
  content: `Playwright console message location comes from each ConsoleMessage object's location method, which returns a source URL plus zero-based line and column values. Register the console listener before navigation, normalize every record, and attach bounded JSON on failure. Assert a controlled message source because some browser entries may have no useful URL.

## What Does Playwright Console Message Location Control?

Playwright console message location identifies where the browser says a console call originated. Its coordinates can connect CI output with one loaded script or page resource.

The official [ConsoleMessage location reference](https://playwright.dev/docs/api/class-consolemessage#console-message-location) returns a URL, zero-based line, and zero-based column. Older line-number and column-number names are deprecated in favor of the shorter fields.

The record belongs to a console event, not every browser error. Uncaught page exceptions, failed requests, crashes, and test-runner logs use different Playwright events and data shapes.

A source URL may be empty or less useful for evaluated code, browser internals, extensions, or generated content. Store that absence as data instead of inventing a file name.

Coordinates point into the resource loaded by the browser. Mapping a bundled line back to original TypeScript requires a separate source-map process with matching build artifacts.

The location method does not classify severity. A warning from first-party code and an error from a third-party script need policy beyond their coordinates.

It also does not prove user impact. Pair important console records with the action, page URL, and product assertion that show what happened around the message.

Use the [observability testing guide](/blog/observability-driven-testing-guide) for wider signal design. This workflow stays focused on reliable browser console source metadata.

Playwright console message location is useful when it shortens ownership and reproduction. It should remain optional evidence when the browser provides no meaningful source.

## How Does Playwright Consolemessage Location Work?

Playwright consolemessage location data is available inside a page console event handler. Register that handler before the page action that may emit the message.

The official [events guide](https://playwright.dev/docs/events) shows persistent listeners with \`page.on\` and removal when handling is no longer needed. Console capture follows that standard event subscription pattern.

The [page console event reference](https://playwright.dev/docs/api/class-page#page-event-console) states that the event fires when page JavaScript calls a console API. Its handler receives one ConsoleMessage object.

Read \`message.type()\`, \`message.text()\`, and \`message.location()\` synchronously into a plain record. Add the current page URL and a sequence number for test context.

Normalize the location to \`sourceUrl\`, \`line\`, and \`column\`. Do not mix current field names with deprecated aliases in the stored contract.

Keep capture and assertion separate. The listener observes messages, while the test later applies severity, origin, allowlist, count, and product rules.

Registering after \`page.goto\` misses load-time output. Registering before context creation is impossible, so create the page, attach the listener, then navigate.

Playwright console message location should not cause asynchronous work that blocks the page event handler. Store a small record first, then format or attach it after the tested action.

The [debug inspector guide](/blog/playwright-debug-mode-inspector-guide) can help reproduce a source interactively. CI still needs stable JSON because an inspector is not available in a headless gate.

## Browser Console Source Url: Repository Evidence

The browser console source url pattern appears in \`seed-skills/console-error-hunter/SKILL.md\`. Its collector attaches listeners during construction and reads text, type, and location from each message.

That collector stores source file, line, column, page URL, current test step, timestamp, category, and severity. It also listens for page errors through a separate event path.

The repository example uses deprecated \`lineNumber\` and \`columnNumber\` location fields. New code should normalize current \`line\` and \`column\` values while reading legacy reports during migration.

The skill stresses listener registration before navigation. That rule is vital because load scripts can log before the first visible page assertion runs.

It also recommends an explicit allowlist rather than broad suppression. Coordinates help show whether an accepted message still comes from the same owned source.

The second evidence file, \`seed-skills/playwright-cli/SKILL.md\`, exposes \`playwright-cli console\` and a warning filter. It places console inspection beside network and tracing commands for live diagnosis.

The CLI path is useful for exploration, while the collector pattern creates durable CI records. Both should retain the page and action context that produced the message.

Playwright console message location connects those paths through one common fact: browser output has a source when the browser supplies one. Neither path should fabricate a source for an empty result.

Use the [Playwright CLI skill](/skills/Pramod/playwright-cli) to inspect a live page before building a regression. Keep the committed listener small and tied to a named console policy.

## When Should QA Teams Use Console Error Line Column?

Console error line column evidence is useful when a stable first-party asset emits a warning or error. The coordinates can route the failure to an owning module or build output.

Use it for controlled messages from known scripts, hydration warnings, deprecation notices, policy errors, and runtime diagnostics that use the console API. Capture type and text beside location.

Do not assume every console error has a useful URL. Inline evaluation, blank documents, browser sources, and some third-party output can produce empty or unfamiliar values.

Use \`pageerror\` for uncaught exceptions. Use response and request-failed events for network faults, because console text may be absent or only a secondary symptom.

Use a locator assertion when the product's visible state is the release contract. Console coordinates can explain a failure, but they should not replace the expected user result.

Use source-map processing only when the exact deployed build and maps are available. A guessed original path creates false precision and can send owners to the wrong line.

A strong control emits one known console message from an external fixture script. Assert its type, text, URL suffix, and zero-based coordinates without fixing unrelated browser output.

Playwright console message location should be checked across supported browser projects when source behavior matters. Keep separate records because engines can report generated positions differently.

The [Playwright testing guide](/blog/playwright-testing-best-practices-2026) helps keep product assertions user-facing. Add console checks only for errors the team has agreed should affect the gate.

## Attach Console Logs Playwright: Failure Modes and Diagnostics

Attach console logs Playwright workflows fail when they capture only text, start too late, or assume every record has a source. Diagnose capture quality before changing the application.

A product failure occurs when an unexpected first-party error appears during a valid user flow. Preserve its type, text, location, action step, and visible product effect.

A test defect occurs when the listener starts after navigation, state leaks from another test, or an allowlist pattern is too broad. Repair collection and isolation before assigning product ownership.

An environment limit occurs when extensions, proxies, injected scripts, or build-mode differences add output outside the product contract. Record the source and environment rather than suppressing all messages.

Text-only logs lose ownership when several bundles emit similar warnings. Add location and page URL, but allow empty fields without crashing the reporter.

Location-only logs lose meaning when they omit the console type and text. A source coordinate cannot show whether the event was debug output, a warning, or an error.

Unbounded logs create another failure mode. High-volume page output can exhaust attachment limits and hide the first relevant record among repeated noise.

Cap records and message length, retain the first occurrence count, and report truncation. The policy should fail clearly if discarded records might affect the decision.

Playwright console message location should be normalized before deduplication. Two identical messages from different resources may need separate owners.

Use the [trace attachment guide](/blog/playwright-allure-attachment-trace-guide) when console data needs nearby steps and page state. Avoid attaching every artifact when bounded JSON answers the question.

## CI Browser Error Source: Evidence and CI Assertions

A CI browser error source record should include message type, safe text, source URL, zero-based line, zero-based column, page URL, action step, sequence, and attachment path. Each field has a review purpose.

Start with a local fixture script served from a stable path. Have one action call \`console.error\` on a known source line, then assert the normalized record.

Do not assert a hard-coded host when CI uses a dynamic port. Parse the URL and compare the expected path, while storing the complete safe URL in evidence.

Treat line and column as zero-based because the current API documents that convention. Reporter views may display one-based lines, so name the stored convention explicitly.

Assert that the listener was active before navigation by emitting a load-time control. A listener attached afterward should miss it, which provides a useful controlled failure.

Add a record with no useful source through an approved fixture if the browser permits it. The collector should retain empty coordinates without throwing or inventing defaults.

Attach JSON through \`testInfo.attach\` after the key product assertion or in bounded cleanup. Keep the attachment even when console policy causes the test to fail.

Playwright console message location evidence should preserve the first failing record before retries. A later clean retry must not erase the source that appeared first.

Store a count of omitted duplicate messages and a truncation flag. These fields show whether the attachment represents the complete decision set.

The [observability guide](/blog/observability-driven-testing-guide) can align browser records with network and server signals. Correlation should use timestamps or steps without claiming one signal caused another.

## Playwright Console Evidence Comparison Table

Playwright console evidence should grow only when each added source answers a named diagnostic question. This matrix separates text, location, trace context, and source mapping.

| Option or signal | Use when | Expected evidence | Main risk |
| --- | --- | --- | --- |
| Message text only | Read quick local output or classify a known phrase | Type, safe text, page URL, and action step | Similar text has no clear source owner |
| ConsoleMessage location | Add browser resource URL and zero-based coordinates | URL, line, column, type, text, and page | Empty or generated sources are treated as exact |
| Trace attachment | Correlate console output with nearby test actions | Trace path, step, page state, and message sequence | Large artifacts are saved without a clear need |
| Source-map processing | Map a deployed bundle position to original source | Build ID, map file, generated and original positions | A mismatched map creates false ownership |

Text is sufficient for a quick local scan, but it is weak release evidence. Pair repeated product failures with source and action context.

Location is the best default addition because the browser provides it directly. Keep the raw generated position even when later mapping succeeds.

A trace can show the action and page around the event. It should not replace the small JSON record that CI and reviewers can read quickly.

Source maps belong to the build pipeline and must match the deployed asset. Record the build identifier before accepting an original file and line.

Playwright console message location remains the durable bridge between browser output and generated code. Empty fields should lead to broader context, not guessed coordinates.

The [skills directory](/skills) provides related console and browser workflows. Use them to repeat the process while keeping project policy, limits, and allowlists in version control.

## How Do You Implement Playwright Console Message Location?

Implement Playwright console message location by attaching the listener before navigation, creating normalized bounded records, asserting a controlled source, and saving JSON on failure. Keep page errors and network faults separate.

1. Read \`seed-skills/console-error-hunter/SKILL.md\` and define allowed console types, first-party origins, message limits, redaction, and empty-location behavior.
2. Attach a page console listener before navigation, then capture type, text, current location fields, page URL, action step, and sequence.
3. Emit one controlled message from a known fixture script and assert its URL path, zero-based line, column, type, and safe text.
4. Exercise late-listener and empty-location controls, then require an explicit missed-event or absent-source result without reporter failure.
5. Attach bounded normalized JSON, preserve truncation and duplicate counts, and keep the first failing run before any retry.
6. Run the focused spec locally and in CI, then compare supported browsers without treating their generated coordinates as interchangeable.

The collector example keeps records plain and bounded. It uses current location fields and stores the page URL observed when the event arrives.

\`\`\`typescript
import type { ConsoleMessage, Page } from '@playwright/test';

type ConsoleRecord = {
  type: string;
  text: string;
  sourceUrl: string;
  line: number;
  column: number;
  pageUrl: string;
};

export function collectConsole(page: Page, limit = 100): ConsoleRecord[] {
  const logs: ConsoleRecord[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (logs.length >= limit) return;
    const location = message.location();
    logs.push({
      type: message.type(),
      text: message.text().slice(0, 500),
      sourceUrl: location.url,
      line: location.line,
      column: location.column,
      pageUrl: page.url(),
    });
  });
  return logs;
}
\`\`\`

Call this helper before \`page.goto\`. If redaction rules are needed, apply them before any text enters the stored array.

The test example emits a controlled message and attaches normalized output. Its product assertion stays separate from the console source assertion.

\`\`\`typescript
import { expect, test } from '@playwright/test';
import { collectConsole } from './console-collector';

test('records browser console source coordinates', async ({ page }, testInfo) => {
  const logs = collectConsole(page);
  await page.goto('/console-location-fixture');
  await page.getByRole('button', { name: 'Emit known error' }).click();

  const known = logs.find((entry) => entry.text === 'fixture-error');
  expect(known?.sourceUrl).toContain('/fixtures/console-source.js');
  expect(known?.line).toBeGreaterThanOrEqual(0);
  expect(known?.column).toBeGreaterThanOrEqual(0);

  await testInfo.attach('browser-console', {
    body: JSON.stringify(logs, null, 2),
    contentType: 'application/json',
  });
});
\`\`\`

The fixture owns its script path and message. Avoid asserting positions from third-party or frequently rebuilt bundles in the core contract.

For the late-listener control, navigate before calling the collector and emit only during page load. Require the missing record so the test proves why order matters.

For the empty-location control, accept an empty URL and zero-like coordinates as absent source data. The collector must still retain type, text, and page URL.

Run \`npx playwright test console-location.spec.ts --project=chromium\` locally. Repeat in CI with failure attachments and explicit size limits.

Use the [Playwright CLI skill](/skills/Pramod/playwright-cli) for live console inspection. The [debug guide](/blog/playwright-debug-mode-inspector-guide) can then help reproduce the source before code changes.

### Audit a Console Source Record

Start with the browser project, build ID, test title, and page URL. These fields identify the runtime that produced the resource coordinates.

Add a sequence number before formatting timestamps. Event order is easier to compare when CI clocks or browser clocks differ.

Store the console type exactly as Playwright reports it. Apply team severity in a separate field so raw browser data remains available.

Redact text before attachment and cap its length. A console call can contain tokens, account details, or large serialized objects.

Parse the source URL and label first-party ownership from an approved host list. Do not classify ownership from a loose text match.

Keep line and column as zero-based integers. If a report displays one-based values, label the conversion and preserve the raw pair.

Record an empty source as empty rather than \`unknown.js\`. A made-up path looks certain and can corrupt trend reports.

Count repeated records after normalization. Preserve the first example, total count, and source instead of attaching hundreds of equal lines.

Add a truncation flag when the record limit is reached. A pass cannot rely on a partial set unless policy defines which records remain sufficient.

Capture the current test step or action label. The same message during page load and checkout may have different urgency and owners.

Keep page errors in a second collection. They represent uncaught exceptions and do not share the ConsoleMessage location contract.

Keep failed requests in a third collection. Correlate by step and time, but do not state that a request caused a console error without proof.

Run one controlled first-party error and one allowed warning. This checks both failure and policy paths without depending on live third-party output.

Expire allowlist entries and require an owner. Source movement can reveal that an old phrase now comes from different code.

Attach JSON even when the policy assertion fails. The attachment step should run in bounded cleanup or before the final assertion.

Preserve first-attempt data across retries. Tag each record with its retry number so later output cannot replace the original fault.

Compare browser projects independently. Differences in generated coordinates may be valid even when each project reaches the same product state.

Check that attachment size stays below the agreed limit. A console storm should report its count and truncation rather than exhaust CI storage.

Review source-map output only with a matching build ID. Always keep the generated URL and position beside any mapped source.

Playwright console message location passes this audit when capture order, source honesty, bounded output, product context, and cleanup all remain visible. A clean rerun should keep the same source path while preserving the first failed record on its own.

### Prove a Source Without Guesswork

Create one small page and one plain script file in the local test app, then put a known log call on a fixed line near the top. Keep the file free from build steps for this first proof, so the browser path and raw line are easy to check by sight.

Attach the listener before the first page move and add a short load-time message, then save its type, text, URL, line, column, page, and order. Repeat with the listener attached too late and require that load message to be absent, which proves the order rule with a clear forced miss.

Add a button that calls a second known message from the same script, then click it and require the new record to follow the load record. Check the script path rather than the host and port, since local CI ports can change while the owned source file stays the same.

Write the raw line and column as zero based values on the run sheet, then show any one based view as a named display change in another field. Never replace the raw pair, because later tools and old reports may use a different count and seem to point at another line.

Emit one safe message with no user data and cap its text before it enters the list, then try a long fake message to prove the cap. The stored row should show that text was cut, while type, source, page, order, and policy fields still let the reviewer judge the event.

Send the same message many times and keep the first row plus a total count, then set a cut flag when the agreed list size is reached. A pass must not hide that flag, since lost rows may hold a new source or type that would change the console rule.

Create one source-free case only when the test browser gives a sound way to do so, then keep the empty URL and raw number fields as returned. If that case is not stable, test the record formatter with plain data instead of claiming the browser made an empty source.

Keep a page error and a failed request beside the console case, but route each one to its own list with its own set of fields. The [observability guide](/blog/observability-driven-testing-guide) can help link the three by step and time without stating that one caused another.

Build the app once with a known build ID and run the same page, then keep the new bundle URL and raw pair before any source map is read. Map that pair only with the files from the same build, and reject a map whose asset name or build ID does not match.

Run the case in each browser that the product supports and keep one row per project, rather than forcing all raw lines and columns to match. Require the same owned script path, message rule, and page result, while allowing a valid engine shift in the generated point.

Close the page and write the attachment size, row count, cut flag, first bad row, retry number, and clean end on the run sheet. The proof is ready when a reviewer can find the real browser source, see each limit, and know when the source was absent or later mapped.

Give the raw event sheet to a peer who has not seen the page, then ask that peer to name the script path, count base, page step, first bad row, and cut state from the small file alone. Add no trace at first, since the short record should carry enough fact to choose the next check before a large file is opened.

Build the same script twice with two clear build tags and keep both map files, then try to map the first run with the wrong tag and require a hard reject. Map it again with the right tag, while the raw URL, line, and column stay next to the new source path so the source claim can be checked.

Force one first-run error and one clean retry, then store both rows with their own run number instead of letting the pass hide the first bad source. Close the page, check the file size and cut flag, and approve the set only when the failed source, clean rerun, and final page result can all be read at once.

Pass one plain test row with an empty URL and no line or column through the same format and policy code, then require the saved file to keep those gaps as gaps. Read that row beside the known script row and make sure no fallback name, old field, or map step turns missing source data into a source claim.

At signoff, take one raw row from each browser and trace its path back to the exact served file with the trace closed, while a peer checks the zero base, page step, build tag, cut flag, and lack of stale text from a prior run. Move the known log call by one line in a throwaway build and require the new raw row to move as well, then restore the file and prove an old map cannot pass for the new build while its saved raw point remains in the record.

## Frequently Asked Questions

### What is the safest way to use playwright consolemessage location?

Attach the console listener before navigation and copy type, safe text, URL, zero-based line, zero-based column, and page URL into a plain record. Allow empty locations without inventing paths. Apply severity and product assertions after capture, then attach bounded redacted JSON on failure.

### How do you verify browser console source url?

Serve a controlled script from a stable fixture path, emit one known message, and assert the parsed URL path rather than a dynamic host. Retain the complete safe URL and build ID. A source-map result is trustworthy only when its map matches that exact deployed asset.

### When should a QA team choose console error line column?

Choose coordinates when a first-party console call needs source ownership or a generated bundle position helps debugging. Keep message type, text, page, and action beside them. Use page-error or network events for those fault classes, and retain user-facing assertions as the actual product gate.

### What causes failures in attach console logs playwright?

Common causes include listeners attached after navigation, unbounded message storms, unsafe text, broad allowlists, retry data replacement, and assumptions that every record has a URL. Normalize early, cap output, mark truncation, retain first-attempt data, and keep empty source fields honest.

### Which evidence should ci browser error source retain?

Retain browser project, build ID, test and retry, sequence, console type, redacted text, raw source URL, zero-based line and column, page URL, action step, policy result, duplicate count, truncation flag, and attachment path. Keep page exceptions and network failures in distinct collections.

### How should CI handle playwright console evidence?

CI should register listeners before navigation, run controlled source fixtures, apply explicit first-party and severity rules, and attach bounded JSON even on failure. Preserve the first attempt, compare browsers separately, and require source-map build identity before reporting an original file or line as fact.

## Conclusion

Playwright console message location makes browser output reviewable when URL, zero-based coordinates, message context, and absent-source cases are all preserved honestly. Adopt the collector after controlled early, late, empty, noisy, and first-party records pass with bounded CI attachments.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this brief's focused verification workflow. Use the [QASkills blog](/blog) to compare related trace and observability practices.`,
};
