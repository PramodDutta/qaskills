import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'back forward cache eligibility testing',
  description:
    'back forward cache eligibility testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Performance Testing',
  primaryKeyword: 'back forward cache eligibility testing',
  keywords: [
    'back forward cache eligibility testing',
    'bfcache eligibility test',
    'pageshow persisted assertion',
    'back forward cache blockers',
    'pagehide event QA',
    'bfcache state restoration',
  ],
  relatedSlugs: [
    'performance-testing-complete-guide',
    'lighthouse-ci-performance-budget-gates-guide-2026',
    'core-web-vitals-testing-guide-2026',
    'sitespeed-io-performance-testing-guide-2026',
  ],
  sources: ['https://web.dev/articles/bfcache', 'https://www.w3.org/TR/resource-timing-2/'],
  repoEvidence: [
    'seed-skills/web-vitals-testing/SKILL.md',
    'seed-skills/performance-budget-testing/SKILL.md',
  ],
  content: `Back forward cache eligibility testing drives a real history trip between two same-origin pages, then reads the pageshow persisted flag and the restored user state. A pass needs both facts. The suite also runs one known blocker case, records pagehide intent, and reports unsupported browser runs without calling an ordinary reload a cache restore.

## What does back forward cache eligibility testing verify?

Back forward cache eligibility testing verifies that an eligible page returns from browser memory after history navigation and still shows the right user-facing state. It also names why a controlled ineligible page takes the normal load path.

The back-forward cache, or bfcache, holds a whole page snapshot rather than only stored HTTP responses. JavaScript state, the heap, and the rendered document can pause when the user leaves and resume when the browser restores that snapshot.

The approved [web.dev bfcache guide](https://web.dev/articles/bfcache) says \`pageshow\` runs on initial load and after a restore. Its \`persisted\` value is true for a bfcache restore and false for a normal page load.

\`pagehide\` supplies a related but weaker clue. A true \`persisted\` value means the browser plans to cache the page, yet later facts may still make it discard the entry. Tests should call this intent, not final proof.

A Navigation Timing entry with type \`back_forward\` is not enough either. It marks a history load, while a bfcache restore reuses an existing page and does not create the same kind of new load entry.

The W3C [Resource Timing specification](https://www.w3.org/TR/resource-timing-2/) defines timing data for fetched resources. Those entries can support a diagnosis, but network timing alone cannot prove that the browser restored a whole page snapshot.

The contract therefore has two parts. The browser must report a real restore, and the form fields, selected tab, scroll target, or app data named by the case must have the right value afterward.

Repository evidence is broad and useful. \`seed-skills/web-vitals-testing/SKILL.md\` calls for sound tools, focused tests, async care, clean state, CI checks, reports, and trend review.

The file \`seed-skills/performance-budget-testing/SKILL.md\` adds clear limits, CI use, reports, and repeatable fault review. Neither seed file claims to include bfcache event probes or the two-page fixture in this article.

The [performance testing guide](/blog/performance-testing-complete-guide) covers wider load and speed work. This check stays on browser history, restore proof, and state after return.

## How do you build a bfcache eligibility test?

A bfcache eligibility test needs two small same-origin pages and one state value that differs after a reload. Page A holds a form and event log, while page B provides a plain link back through browser history.

Serve both pages from the same local app used by browser tests. Avoid third-party frames, live data, service worker changes, and auth redirects until the core trip has a clean result.

Page A should set a unique load token when its script starts. It should also record \`pageshow\` and \`pagehide\` values in a small visible log that remains inside the page snapshot.

Enter a value such as \`draft-42\` without saving it to server or local storage. Navigate by clicking a normal link to Page B, then call the browser's Back action and wait for the restored marker.

If the page returns from bfcache, the latest \`pageshow.persisted\` value should be true and the unsaved field should still hold \`draft-42\`. The original load token should also stay fixed.

Do not use a hard delay after Back. Wait for a new pageshow record or a case result placed by that handler, because a load event may not run on restore.

The browser page can expose a small probe like this one. It records only event type, flag, and a monotonic time, so the test can compare order without private page data.

\`\`\`javascript
const events = [];
const loadToken = crypto.randomUUID();

window.__bfcacheProbe = {
  loadToken,
  events,
  latest(type) {
    return [...events].reverse().find((item) => item.type === type) ?? null;
  },
};

window.addEventListener('pagehide', (event) => {
  events.push({
    type: 'pagehide',
    persisted: event.persisted,
    at: performance.now(),
  });
});

window.addEventListener('pageshow', (event) => {
  events.push({
    type: 'pageshow',
    persisted: event.persisted,
    at: performance.now(),
  });
  document.documentElement.dataset.restoreState = event.persisted ? 'restored' : 'loaded';
});
\`\`\`

Read the initial token before leaving and compare it after Back. A new token with \`persisted=false\` is clear evidence of a full load, even if the browser restored form input by another feature.

Run the clean trip twice from fresh contexts. Memory pressure and browser policy can evict bfcache entries, so the required CI browser needs stable settings and no other test sharing its context.

Add a manual check in browser developer tools when the automated clean case changes. The panel can show an actionable reason, while the test report should still retain its own event and state facts.

The [Core Web Vitals guide](/blog/core-web-vitals-testing-guide-2026) can add related field measures. Keep those observers outside the first restore proof so metric code cannot become a new blocker.

## What breaks pageshow persisted assertion?

A pageshow persisted assertion breaks when it reads the initial event, waits for the wrong load signal, mistakes saved form data for a snapshot, or runs in a browser mode without stable bfcache support. The failure must show event order and load-token state.

The first \`pageshow\` on Page A has \`persisted=false\`. A test that reads the first log entry after returning will report a false failure even when a later entry proves a restore.

Waiting for \`load\` is another setup fault. A restored page resumes and receives \`pageshow\`, so a runner that expects a new load can hang after the browser has already shown the page.

Form values can mislead the oracle. Browsers may restore some fields during normal history navigation, and an app may save them elsewhere. The load token and persisted flag keep those paths apart.

An unconditional \`unload\` listener is a known risk. The web.dev guide explains that browser handling varies, but desktop Chrome and Firefox can treat such pages as ineligible, while other engines may act differently.

Open resources can also affect eligibility by browser and version. Indexed database work, in-flight network calls, web sockets, frames, and page policy deserve isolated cases rather than one claim that each item blocks every engine.

State reset after a true restore is a product fault, not an eligibility fault. If \`persisted=true\` while the draft becomes blank, inspect the pageshow handler, state store, framework resume path, and any security refresh code.

A hidden reload can invert the facts. An app may receive a true restore, then call \`location.reload()\` from its handler. Capture all pageshow events and the token after a short stable marker, not at the first instant.

Runner settings matter as well. A browser launched with special flags, disabled history cache, a reused context, or active developer tools can produce a different result from a normal supported run.

Use the same built browser channel locally and in CI. If only CI fails, compare flags, memory, parallel load, context reuse, and fixture headers before raising the timeout.

The [Lighthouse CI guide](/blog/lighthouse-ci-performance-budget-gates-guide-2026) covers broader lab gates. Its score cannot stand in for this exact persisted flag and restored state.

## Which fixtures expose back forward cache blockers?

Back forward cache blockers should be tested as one-feature variants of the clean two-page fixture. Keep the route, form, link, headers, and event probe fixed while one listener, resource, or response rule changes.

Start with a clean control that restores in the required browser. Without that row, a failed blocker case cannot show whether the feature or the test environment caused the normal load.

Add an \`unload\` listener only in the first negative page. State the supported browser and expected result, because the source notes real engine differences and current policy may change.

Use a second case for an open resource that the chosen browser documents as relevant. Open it from a local endpoint, save its state, then close it during \`pagehide\` in the repaired variant.

Add a response-header case only when the required browser contract calls for it. Do not treat HTTP cache rules as bfcache rules, since a page snapshot and an HTTP response store are different tools.

The boundary case removes a blocker just before navigation. It should show whether cleanup in \`pagehide\` occurs soon enough, while a setup variant closes the resource before the user clicks the link.

The repeated case alternates clean and blocked pages in fresh browser contexts. A browser policy result from one context must not leak into the next case through open tabs or shared workers.

Cleanup closes sockets, databases, workers, pages, and the browser context. It should also clear test routes and server-side state tied to the run ID.

Record the blocker name, browser build, response headers, open resource state, pagehide flag, pageshow flag, load tokens, navigation entry type, and final form value. These fields can show an intended cache entry that was later lost.

Treat browser developer-tool reasons as supporting facts. Keep the page event facts as the test contract, because tool wording and available reason APIs can change between browser builds.

The [sitespeed.io guide](/blog/sitespeed-io-performance-testing-guide-2026) can add wider navigation runs. This blocker fixture should stay in one browser worker with a fixed local origin.

## How should pagehide event QA be asserted?

Pagehide event QA should assert that the event runs before Page A becomes hidden, carries the recorded intent flag, and performs the cleanup named by the case. It must not claim that \`persisted=true\` guarantees a later restore.

In the clean row, save the pagehide entry inside page memory and send no remote log that could itself affect the test. Read the entry after a successful return alongside the true pageshow result.

For cleanup work, close the chosen resource and set a plain flag. After return, assert the flag, the restored state, and any expected reopen action from the pageshow handler.

Keep event order as a partial order. The pagehide record comes before the restored pageshow record, but exact millisecond gaps can vary with browser work and should not be a release rule.

Use exact equality for booleans, load tokens, and form values. Use a bounded wait only for the visible restore-state marker, and stop if a new load token appears with a false pageshow.

The \`pagehide.persisted=false\` case can prove that the page was not about to enter bfcache in that attempt. A true value remains intent, so pair it with the later pageshow outcome before calling the trip a pass.

The test below drives the full history path with Playwright. It asks the fixture to expose the event record and does not wait for a new load event after going back.

\`\`\`javascript
import { test, expect } from '@playwright/test';

test('restores a draft from bfcache', async ({ page }) => {
  await page.goto('/test/bfcache/a');
  const firstToken = await page.evaluate(() => window.__bfcacheProbe.loadToken);

  await page.getByLabel('Draft title').fill('draft-42');
  await page.getByRole('link', { name: 'Open page B' }).click();
  await expect(page.getByRole('heading', { name: 'Page B' })).toBeVisible();

  await page.goBack({ waitUntil: 'commit' });
  await expect(page.locator('html')).toHaveAttribute('data-restore-state', 'restored');
  await expect(page.getByLabel('Draft title')).toHaveValue('draft-42');

  const result = await page.evaluate(() => ({
    token: window.__bfcacheProbe.loadToken,
    pagehide: window.__bfcacheProbe.latest('pagehide'),
    pageshow: window.__bfcacheProbe.latest('pageshow'),
  }));

  expect(result.token).toBe(firstToken);
  expect(result.pagehide.persisted).toBe(true);
  expect(result.pageshow.persisted).toBe(true);
});
\`\`\`

Some runners may not support \`waitUntil: 'commit'\` for a same-document restore in the same way. Keep the visible probe marker as the final wait and adjust only the navigation call for the pinned runner.

Add a second test where the clean page has a known blocker. Require a new token and false pageshow in the supported browser, then save any reason data without making its exact text the oracle.

## How does bfcache state restoration run in CI?

Bfcache state restoration should run in a dedicated browser project with one case at a time. Memory use, extra tabs, developer tools, and shared contexts can cause eviction that has nothing to do with the page.

Pin the required browser build for pull requests. Run other supported builds on a schedule and classify a result as restored, normal_load, unavailable, evicted, or harness_error.

The clean eligible case may block release only in the browser where the product requires this behavior and the lab setup is controlled. Other engines can report compatibility data until the team defines their own stable contract.

Run the blocker row after the clean row but in a new context. If the clean row fails, stop blocker claims and report the environment facts rather than saying every feature is ineligible.

Store event lists, tokens, route IDs, state values, browser facts, and a small screenshot after failure. Do not collect a trace from every pass, because trace tooling can alter timing and add needless files.

Trend the share of clean trips restored on scheduled runs, but keep the exact pull-request gate binary. A trend can reveal host pressure while one controlled regression still needs a clear pass or fail.

Use \`seed-skills/web-vitals-testing/SKILL.md\` for continuous checks and reports, and \`seed-skills/performance-budget-testing/SKILL.md\` for owned limits and clean CI evidence. The specific bfcache limits remain product rules proposed here.

The [performance category](/categories/performance-testing) lists more skill options. Keep this job small before adding paint or interaction observers to the restored page.

## back forward cache eligibility testing comparison matrix

The matrix joins restore proof with the state that a user can see. It also keeps browser limits visible, so a normal load is not mislabeled as a bad state restore.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Eligible page with draft state | Clean Page A and same-origin Page B | True restored pageshow and same draft | False flag, new token, or blank draft | web.dev bfcache guide |
| Page with known blocker | One browser-specific blocker on Page A | Named normal-load result in target browser | False pass or no clean control | web.dev bfcache guide |
| Back after same-origin link | Normal link and browser Back | One ordered pagehide and return result | Load wait hangs or event is missed | Page transition events |
| Forward after state change | Back restore, edit, then Forward and Back | Latest snapshot follows product rule | Old event or wrong state is asserted | Product fixture |
| Browser without stable support | Same clean fixture and known build | Unavailable result with full facts | Ordinary load called a restore | Compatibility policy |

The first row is the release anchor. It needs the true persisted value, unchanged load token, and exact unsaved draft, because any one fact alone can give a false pass.

The blocker row is valid only after the anchor passes in the same build. Keep the negative feature and its expected browser rule in the case name.

The back row proves event order without a load wait. If the runner API hangs, use the marker set by pageshow and retain the navigation command result as debug data.

The forward row protects state rules after more than one history move. Decide whether each snapshot should retain its own value, then make those values distinct enough to catch a stale assertion.

The unavailable row is not a green restore. It lets a wider grid report limits honestly while the required browser still has a strict pass rule.

Back forward cache eligibility testing should keep this matrix close to the fixture routes. A route or header change can then update its expected browser effect in the same review.

Use the [Core Web Vitals guide](/blog/core-web-vitals-testing-guide-2026) after restore behavior is sound. Reset metric observers on pageshow so a resumed page does not merge old and new visits by mistake.

## How do you implement back forward cache eligibility testing?

Implement back forward cache eligibility testing with a clean two-page trip before any blocker is added. Read pageshow, pagehide, load token, and visible state as separate facts, then change one feature per new case.

1. Read \`seed-skills/web-vitals-testing/SKILL.md\` and \`seed-skills/performance-budget-testing/SKILL.md\`, then list their focused-test, async, CI, report, limit, and cleanup practices.
2. Serve Page A and Page B on one local origin, add a fixed draft field, load token, pagehide log, pageshow log, and optional browser-specific blocker.
3. Run the clean Back trip, requiring true pageshow persistence, unchanged token, exact restored draft, ordered event facts, and a responsive page.
4. Add an unload listener, open resource, state reset, hidden reload, early assertion, and unsupported-browser path one at a time without changing the core routes.
5. Compare each case with the five-row matrix, then label the first difference as eligibility, state, event timing, runner, browser policy, or harness setup.
6. Pin the release browser, schedule the wider grid, retain small failure data, close every resource and context, and link the result to the matching repo practice.

Add a mutation that saves the draft to local storage before leaving. The test must still use the persisted flag and token, proving that saved data alone cannot fake a restore.

Add another mutation that reads the first pageshow event. The clean row must fail, which shows the assertion selects the return event rather than the initial load.

Test a true restore with a bad state reset. It should fail as \`state_wrong\`, not \`ineligible\`, and the report should show the true flag next to the blank field.

Keep blockers behind fixture switches that render their state on Page A. Hidden test configuration makes it hard to prove which feature was active after a normal load.

Run without retries first. If host eviction is proven, move the case to an isolated worker or give the host more memory rather than accepting one green result from several attempts.

Review the source guide when browser policy changes. Do not preserve an old blocker expectation after a current supported engine changes its rules.

Read the [Lighthouse CI guide](/blog/lighthouse-ci-performance-budget-gates-guide-2026) for a wider performance gate, and browse [QA skills](/skills) for focused helpers. Keep the persisted flag and state matrix as their own clear check.

## Frequently Asked Questions

### How can browser tests identify pages blocked from the back-forward cache and verify state after a successful restoration?

Drive a real same-origin history trip, then require the return pageshow event to have persisted set true, the page load token to remain unchanged, and a distinct unsaved field to keep its value. Run one known blocker separately and save event, browser, header, resource, and cleanup facts when it loads normally.

### What should a bfcache eligibility test fixture record?

Record route and run IDs, browser build, response headers, blocker state, load token, ordered pagehide and pageshow entries, navigation type, form value, open resource state, and cleanup result. Keep screenshots and browser reason data for failures. These facts separate eligibility, eviction, app state, event timing, and runner faults.

### Which failure proves pageshow persisted assertion is broken?

Use a clean supported browser case that returns with a true persisted event and unchanged token, then seed an earlier false event from initial load. The assertion is broken if it reads the first event, waits for load, accepts a new token, or treats restored form data alone as proof of bfcache use.

### How do teams isolate back forward cache blockers?

Start from a passing two-page control and add one feature per route variant, such as an unload listener or chosen open resource. Run each variant in a fresh browser context with fixed headers and local data. Compare the clean and blocked event facts before assigning the result to that feature.

### Which assertion is strongest for pagehide event QA?

Assert an ordered pagehide record, its exact persisted intent value, the named cleanup flag, and the later pageshow outcome. A true pagehide flag cannot prove the page was retained, while a false flag can show it was not about to enter bfcache. Final restore proof still comes from pageshow.

### How should CI report bfcache state restoration failures?

Report eligibility and state as separate fields, with load tokens, event order, persisted values, route IDs, browser build, blocker state, navigation entry, final form value, and cleanup status. Classify the run as restored, normal load, unavailable, evicted, state wrong, or harness error instead of emitting one cache failure.

## Conclusion

Back forward cache eligibility testing is trustworthy when it proves both browser restoration and correct page state. The clean control, known blocker, ordered page events, stable token, and exact draft value show whether the fault belongs to eligibility, app resume work, or the test harness.

Review the [complete performance testing guide](/blog/performance-testing-complete-guide), then open the [QA skills directory](/skills) and implement the back forward cache eligibility testing matrix in the next test run. Pin the required browser, isolate its context, and treat unsupported runs as facts rather than false restores.`,
};
