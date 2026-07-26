import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'third party performance budget testing',
  description:
    'third party performance budget testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Performance Testing',
  primaryKeyword: 'third party performance budget testing',
  keywords: [
    'third party performance budget testing',
    'third party performance budget',
    'script origin transfer budget',
    'tag manager performance test',
    'third party CPU cost CI',
    'Lighthouse third party budget',
  ],
  relatedSlugs: [
    'performance-testing-complete-guide',
    'lighthouse-ci-performance-budget-gates-guide-2026',
    'core-web-vitals-testing-guide-2026',
    'sitespeed-io-performance-testing-guide-2026',
  ],
  sources: [
    'https://web.dev/articles/bfcache',
    'https://www.w3.org/TR/resource-timing-2/',
    'https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md',
    'https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver',
  ],
  repoEvidence: [
    'seed-skills/web-vitals-testing/SKILL.md',
    'seed-skills/performance-budget-testing/SKILL.md',
  ],
  content: `Third party performance budget testing groups browser cost by an clear owner map map, then gates transfer bytes, request count, and main-thread work under a named rule. The fixture separates outside vendors, first-party code, self-hosted vendor bundles, consent state, and cache state. Failures show which owner, file, metric, and waiver changed instead of logs one page score.

## What does third party performance budget testing verify?

Third party performance budget testing verifies that each measured file has a reviewed owner and that vendor cost stays within transfer, request, and work limits or a valid waiver. The report joins URLs, sources, sizes, cache state, task proof, consent state, budget rule, and first failing owner without assuming origin alone defines owner map.

An origin is useful proof but not a complete owner map rule. A vendor can serve code from its domain, a shared CDN, or the app's domain after a team copies the bundle locally.

Start with an ordered owner map map whose exact patterns precede broad first-party defaults. Each rule names owner, class, contact, allowed metrics, and optional waiver reference.

Transfer and work are different costs. A cached script can add no network bytes for one run yet still parse, compile, initialize, and schedule work on the main thread.

Request count also matters because each request can add connection, scheduling, header, and cache-check work. Keep count beside bytes rather than converting each effect into one guessed number.

The repo file \`seed-skills/web-vitals-testing/SKILL.md\` calls for focused speed setup, measurable thresholds, independent cases, clear results, and CI integration. It frames speed proof but does not define this owner map.

The repo file \`seed-skills/performance-budget-testing/SKILL.md\` covers bundle size, load time, Lighthouse gates, file counts, reports, and threshold-driven CI. This guide applies those practices to clear third-party owner map and fixed consent cases.

Repo facts and guide recommendations remain split. The source skills support focused thresholds and logs, while the exact file grouping, task task link, waiver schema, and five-row matrix are proposed regression controls.

Use the [complete performance testing guide](/blog/performance-testing-complete-guide) for wider load and [monitoring work](/blog/performance-monitoring-testing-guide). This gate answers a narrower question: which vendor cost changed on one fixed page and why did rule accept or reject it?

## How do you build an third party performance budget?

A third party performance budget fixture needs one page with a first-party app bundle, analytics, a tag tool, chat, consent-fixed scripts, a cached file, and one self-hosted vendor bundle. Each file should return fixed bytes from fixed fixture servers.

Use synthetic scripts that perform known work and set end markers. Real vendor endpoints change content, headers, rollout state, and availability, which makes them poor fixtures for a pull-request contract.

Keep live host patterns in the owner map map, but map them to local servers during the test. This preserves grouping flow without sending CI traffic to outside services or accepting real tracking.

Create two consent cases: denied and accepted. The denied case expects no blocked vendor requests, while the accepted case expects exact named files and their reviewed costs.

Create cold and warm cache cases in split browser contexts or with deliberate cache controls. Record the context state because comparing cold transfer bytes with a cached run produces a false regression.

Give the self-hosted vendor asset a first-party URL but classify it through a path, file hash, package file, or clear rule. That row proves owner map rule does not collapse into a hostname check.

The first positive check maps each seen file. An unmapped URL should fail before budgets are totaled because ignored cost creates an artificially good result.

Next compare exact request count and bounded encoded or transfer bytes for each owner. Use fixed fixture bodies and a measured allowance for protocol or header details only where the chosen API exposes them.

The [Core Web Vitals guide](/blog/core-web-vitals-testing-guide-2026) can add user-facing metrics after owner map works. Do not infer vendor owner map from a Web Vitals change because first-party layout and network work can affect the same metric.

This browser probe adapts the focused measurement practices in \`seed-skills/web-vitals-testing/SKILL.md\`. It gathers file entries and optional long-task records, then leaves owner map decisions to a versioned rule outside the page.

\`\`\`javascript
const proof = {
  files: [],
  longTasks: [],
  consent: 'accepted',
  cache: 'cold',
};

const resourceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    proof.files.push({
      url: entry.name,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      startTime: entry.startTime,
      duration: entry.duration,
    });
  }
});
resourceObserver.observe({ type: 'file', buffered: true });

if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
  const taskObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      proof.longTasks.push({
        startTime: entry.startTime,
        duration: entry.duration,
        task link: entry.task link?.map((item) => item.containerSrc || ''),
      });
    }
  });
  taskObserver.observe({ type: 'longtask', buffered: true });
}

window.performanceBudgetEvidence = proof;
\`\`\`

Feature support must be recorded. A missing long-task entry type should produce a clear unsupported metric for that browser, not a zero CPU cost that incorrectly passes the budget.

## What breaks script origin transfer budget?

A script origin transfer budget breaks when each same-origin URL is labeled first party. Self-hosted tag-tool or analytics code then disappears from vendor totals even though owner map and work owner role remain outside.

The reverse mistake labels a shared company CDN as third party. Grouping should follow approved owner map rules, not simply compare each URL hostname with the document hostname.

Cache-dependent totals create one more false result. A local cache hit can expose zero transfer while encoded body size remains nonzero, so cache mode and body size must accompany transfer values.

The [Resource Timing specification](https://www.w3.org/TR/resource-timing-2/) defines fields such as \`transferSize\`, \`encodedBodySize\`, and \`decodedBodySize\`. It also specifies distinct transfer values for local cache and validated cache cases, which is why one number cannot represent all send states.

Cross-origin detail may be restricted. The same spec describes \`Timing-Allow-Origin\` as a response rule that can expose values otherwise set to zero, while still allowing a user agent to enforce restrictions.

Consent variation can look like random request loss. Save the exact consent input and end marker before collecting files, then classify an unexpected request under denied consent as a flow failure rather than a lower-cost pass.

Late tag load creates timing races. A tag tool may add chat or analytics after the page marker, so the fixture needs a known end signal that represents the end of its fixed tag load phase.

Budgets without owners encourage unexplained waivers. Each threshold and waiver should name the owner team, reason, end date, and metrics it changes.

Main-thread cost is easy to overclaim. Long-task task link and browser support can be limited, so report unattributed work on its own and avoid assigning all nearby CPU time to the last script request.

Use the [Sitespeed performance guide](/blog/sitespeed-io-performance-testing-guide-2026) for complementary page collection. Keep its metric names and cache settings clear before comparing output with this fixture.

## tag manager performance test fixtures and controls

A tag manager performance test should begin with one inert container script that loads no tags. This base run proves the tool request, initialization marker, owner map rule, and probe timing without secondary vendor traffic.

The positive accepted-consent case enables one analytics tag and one chat tag with fixed bodies. It expects exact owner mappings, requests, transfer values, and fixed work markers.

The denied-consent case uses the same page and rule but blocks both downstream tags. A lower cost is not enough; the right request-name set must prove that no fixed vendor endpoint was contacted.

The boundary case loads a vendor bundle from \`/assets/vendor/chat.js\` on the app origin. It should remain assigned to chat through the clear path or hash rule.

The cache case visits twice under one reviewed context. The second run can reduce transfer, but request visibility, encoded size, work marker, and owner assignment should remain explainable.

The late case injects a tag after a fixed timer or app event. The suite waits for the fixture's tag load-complete marker, not network silence, then verifies that the file appears once.

The repeated-run control starts new contexts and alternates accepted and denied consent. Equal per-case output proves that storage, service workers, cache, and consent state are not leaking between scenarios.

The cleanup control disconnects observers, closes the page, removes service workers and fixture storage, and stops local vendor servers. A fresh denied case must not contain entries from the prior accepted run.

Inject an unmapped file under an unfamiliar path. The grouping phase should fail before totals, showing that new cost cannot bypass rule by lacking an owner.

Use the [Lighthouse CI budget guide](/blog/lighthouse-ci-performance-budget-gates-guide-2026) for score and audit gates around this test. The owner matrix remains necessary because one aggregate score does not identify a new vendor or expired waiver.

## How should third party CPU cost CI be asserted?

Third party CPU cost CI should start with exact file owner map, then add work proof only where the browser and probe can support it. Report attributed, unattributed, and unsupported cost as split states.

Use exact equality for the fixed request set. A missing vendor request can mean consent worked, tag load failed, or the server was unreachable, so interpret it only beside scenario and end state.

Use bounded integers for transfer bytes and request count. Fixed fixture bodies allow tight limits, while live-like runs may need reviewed variance and multiple samples.

Use partial order for source and task proof. A tool loads before its fixed tag, and the tag initializes before the end marker, but unrelated tasks do not need one global order.

Use a compatibility rule for missing APIs. If a browser lacks the required task entry type or task link field, the CPU metric is unsupported and should route to one more lane rather than pass as zero.

The [PerformanceObserver documentation](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) describes observing speed entries and checking supported entry types. Record that list with each run so probe capability stays visible.

Source data can help explain loading chains but does not always establish contractual owner map. Keep the clear owner map authoritative and use sources to diagnose why a file entered the page.

Consent is a state dimension, not an waiver. Split budgets for accepted and denied cases prevent a missing consent action from being averaged into one page total.

Cache state also needs split rule. A cold-transfer limit guards send weight, while a warm-run work limit can expose costly cached code that network-only budgets miss.

The [performance testing category](/categories/performance-testing) offers related checks. This CI message should remain owner-exact: right chat CPU at most X, seen Y, support available, accepted consent, warm cache, waiver absent.

The Node gate below adapts threshold and logs practices from \`seed-skills/performance-budget-testing/SKILL.md\`. It rejects unmapped files before checking per-owner totals and requires named waivers to be active.

\`\`\`javascript
const rules = [
  { owner: 'analytics', match: /analytics\\.fixture\\.test|\\/vendor\\/analytics\\./, bytes: 24000, requests: 2 },
  { owner: 'chat', match: /chat\\.fixture\\.test|\\/vendor\\/chat\\./, bytes: 36000, requests: 2 },
  { owner: 'first-party', match: /app\\.fixture\\.test/, bytes: 120000, requests: 8 },
];

export function assertBudget(files, waivers = []) {
  const totals = new Map();
  for (const file of files) {
    const rule = rules.find((candidate) => candidate.match.test(file.url));
    if (!rule) throw new Error('unmapped file: ' + new URL(file.url).pathname);

    const current = totals.get(rule.owner) || { bytes: 0, requests: 0 };
    current.bytes += file.transferSize;
    current.requests += 1;
    totals.set(rule.owner, current);
  }

  for (const rule of rules) {
    const actual = totals.get(rule.owner) || { bytes: 0, requests: 0 };
    const waived = waivers.some(
      (item) => item.owner === rule.owner && Date.parse(item.expires) > Date.now());
    if (!waived && (actual.bytes > rule.bytes || actual.requests > rule.requests)) {
      throw new Error(rule.owner + ' exceeded budget: ' + JSON.stringify(actual));
    }
  }
}
\`\`\`

A live rule should validate waiver schema and reject duplicate or broad patterns. Keep secrets and full query strings out of errors because path-level owner map is usually enough for this proof.

## Lighthouse third party budget in CI

A Lighthouse third party budget lane should package the page fixture, browser settings, owner map proof, and rule output as one reproducible job. Run several fixed collections when the selected metric has right variance.

The [Lighthouse CI configuration documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) describes collection, upload, and check setup. Use its supported check layer for named Lighthouse audits, while a custom owner gate handles file mapping that the chosen audit does not express.

Do not label each custom threshold a Lighthouse check. The report should show which values came from Lighthouse, File Timing, observer entries, server logs, or the owner map rule.

Pin the page URL, browser version, viewport, throttling method, cache mode, consent state, fixture revision, and run count. Without those fields, a transfer change cannot be compared fairly.

Use medians or one more reviewed rollup for noisy page metrics, but keep exact request owner map per run. A vendor appearing in one of three runs is a fixed mapping fact even if aggregate CPU varies.

Fail unmapped files at once. Then evaluate expired waivers, request counts, transfer values, task metrics, and aggregate audits in a documented order.

Name the first rule failure and retain the other measured values as context. One owner, one metric, one limit, one seen value, and one file list make the result clear.

Store a compact JSON artifact for failed runs. Include normalized paths, owner rules, sizes, task summaries, consent, cache state, probe support, versions, and cleanup status.

The [web.dev bfcache article](https://web.dev/articles/bfcache) explains that browser lifecycle flow can restore pages without a normal reload. A fixture that covers back and forward navigation must identify that path instead of assuming each visit performed a fresh load.

Use the [blog index](/blog) to find lifecycle and browser-speed coverage. Keep the pull-request budget on a fresh navigation unless restored-page flow is itself a named scenario.

## third party performance budget testing comparison matrix

The third party performance budget testing matrix forces owner map, consent, cache, and work facts into one review. Each row identifies the right mapping before applying byte, request, or task limits.

| Scenario | Fixed setup | Right result | Failure signal | Proof source |
|---|---|---|---|---|
| First-party app file | App bundle from fixed app origin | File maps to first-party rule with known sizes | Broad vendor rule steals owner map | Owner map rule and repo skills |
| Vendor from outside origin | Analytics script from fixed vendor host | Analytics owner receives request and transfer cost | Origin is ignored or owner is missing | File Timing |
| Self-hosted vendor bundle | Chat bundle under app vendor path | Chat owner remains owner despite same origin | Host-only classifier labels first party | Clear path or hash rule |
| Third-party blocked by consent | Denied state with downstream tags disabled | No vendor requests and end state confirms block | Lower total passes without request-set proof | Fixture consent proof |
| Cached vendor with main-thread cost | Warm visit executes cached fixed bundle | Cache values and supported task proof remain split | Zero transfer is reported as zero total cost | File Timing and observer support |

The first two rows prove that origin can support grouping without defining all owner map. Their fixed URLs and file bodies should remain stable so a rule change is the only meaningful difference.

The self-hosted row is the classifier mutation test. Removing its exact rule should fail as an owner map defect before the first-party byte total is evaluated.

The consent row requires a completed denied state. If the tool never initialized or the fixture server failed, an empty request list is invalid rather than a successful privacy and speed result.

The cached row records transfer and body sizes on its own. It also treats unsupported task proof as clear, preventing a missing API from becoming a favorable zero.

Review this matrix whenever a vendor, host, CDN, copied package, consent flow, or waiver changes. Owner map rule belongs in code review because grouping changes can move cost without changing the page.

## How do you implement third party performance budget testing?

Implement third party performance budget testing by writing the owner map rule before collecting a base run. Each right fixture URL should map once, and each unknown file should stop the gate before rollup.

1. Read \`seed-skills/web-vitals-testing/SKILL.md\` and \`seed-skills/performance-budget-testing/SKILL.md\`, then record their focused measurement, threshold, report, CI, independence, and cleanup practices.
2. Build a page containing first-party code, analytics, tag tool, chat, consent-fixed files, cached assets, and one self-hosted vendor file on fixed servers.
3. Run the accepted cold-cache base run and capture origin, source, request count, transfer and body sizes, supported task proof, consent, cache, owner, and rule output.
4. Inject a CDN misclassification, self-hosted vendor rule loss, warm cache, denied consent, late tag, and missing owner or expired waiver one at a time.
5. Compare each run with the five-row matrix and report the first mapping, consent, cache, request, transfer, task, or waiver value that diverges.
6. Run the focused gate in CI, retain normalized failure proof, disconnect observers, clear storage and service workers, close contexts, and stop fixture servers.

Begin with a static file of right fixture files and file hashes. That file proves the fixed page loaded the intended bytes before budget logic starts.

Write owner map rules from most exact to least exact and add an overlap check. A file matching two owners should fail rule check instead of depending on array order silently.

Run the accepted cold case and require all right vendor files. This base run proves tool tag load, local servers, probe support, and mapping before testing denied consent.

Run denied consent in a fresh context. Require the tool's denied end marker and exact absence of downstream files, rather than accepting any lower byte count.

Copy one vendor file onto the app origin and preserve its vendor grouping. Delete that exact rule in a mutation run and require an unmapped or wrong-owner failure.

Repeat the accepted case with a warm cache. Compare transfer, encoded size, work marker, and task support as distinct fields instead of one total.

Inject one unknown script and one expired waiver. Each should fail rule check with owner, pattern, end date, and file path visible in the concise report.

Run at least three collections for variable task metrics under pinned settings. Keep exact file mapping per run and use the reviewed rollup only for the metric that needs it.

Add supported Lighthouse checks after the owner gate. The [Lighthouse CI guide](/blog/lighthouse-ci-performance-budget-gates-guide-2026) can help structure those checks without replacing the custom mapping result.

Finally, assign each limit and waiver to an owner. A budget with no owner cannot guide cleanup, while an expiring waiver turns temporary acceptance into a visible future decision.

## Frequently Asked Questions

### How should a speed budget isolate third-party scripts by origin, transfer size, main-thread cost, and failure rule?

Use a versioned owner map map that considers origin, path, package, or hash, then join each file with transfer, body size, request count, task proof, consent, and cache state. Fail unmapped files first. Apply owner limits and only named, unexpired waivers after each cost has one accountable grouping.

### What should an third party performance budget fixture record?

Record fixture revision, browser settings, consent, cache state, URL path, origin, source, owner rule, transfer and body sizes, request count, task support, attributed and unattributed work, budget limit, waiver owner, end date, seen result, and cleanup status. Avoid full query strings, request bodies, and user identifiers.

### Which failure proves script origin transfer budget is broken?

The strongest failure shows one stable file moving to the wrong owner or exceeding its reviewed transfer limit under the same cold-cache settings. First exclude a changed file, missing Timing-Allow-Origin detail, cached send, redirect, compression, or probe support. Report the matching rule and exact size fields together.

### How do teams isolate tag manager performance test?

Teams use a fixed tool, synthetic downstream tags, exact end markers, and split accepted and denied consent contexts. They start with an inert tool, then enable one tag at a time. Fresh storage, known cache state, and exact request sets expose late tag load, consent leakage, duplicate tags, and stale service workers.

### Which check is strongest for third party CPU cost CI?

Require exact owner mapping and supported task proof before applying a bounded owner metric. Keep attributed, unattributed, and unsupported states split, and pair them with consent and cache state. A zero value is not strong when the browser lacks the entry type or cannot attribute work to the vendor file.

### How should CI report Lighthouse third party budget failures?

Report probe source, owner, metric, limit, seen value, offending normalized paths, consent, cache, browser and Lighthouse versions, run rollup, waiver status, and cleanup result. Distinguish Lighthouse checks from custom File Timing or task gates. Attach compact failed-run JSON rather than a full trace containing private request data.

## Conclusion

Third party performance budget testing succeeds when each file maps to one accountable owner and each metric is interpreted with consent, cache, and probe support. Outside origins, self-hosted vendor code, denied requests, and cached work must remain distinct rows rather than one page total.

Fail unknown owner map before thresholds and keep waivers named, narrow, and expiring. Review the [complete performance testing guide](/blog/performance-testing-complete-guide), then open the [QA skills directory](/skills) and implement the third party performance budget testing matrix in the next test run.`,
};
