import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PerformanceObserver buffer overflow testing',
  description:
    'PerformanceObserver buffer overflow testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Performance Testing',
  primaryKeyword: 'PerformanceObserver buffer overflow testing',
  keywords: [
    'PerformanceObserver buffer overflow testing',
    'PerformanceObserver buffer test',
    'takeRecords performance entries',
    'buffered observer entry test',
    'performance entry loss detection',
    'disconnect observer cleanup',
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
  content: `- PerformanceObserver buffer overflow testing proves that every expected entry is collected before observer shutdown, including records waiting outside the latest callback. A trustworthy test installs observation at a known time, creates named entries, drains takeRecords before disconnect, compares a manifest, and fails when evidence is incomplete.

## What does PerformanceObserver buffer overflow testing verify?

- The contract covers entry completeness, delivery phase, and final cleanup. A test should identify entries created before observation, entries delivered in callback batches, records returned only by takeRecords, and entries created after disconnect that must remain absent.

- The word overflow needs careful use because two buffers can affect the result. A PerformanceObserver has an internal record queue exposed through takeRecords, while Resource Timing also has a browser-managed performance entry buffer with a configurable limit and a buffer-full event.

- The [Resource Timing specification](https://www.w3.org/TR/resource-timing-2/) defines an initial resource buffer limit of at least 250 entries. It also explains that excess entries can be dropped when the full-buffer handler neither clears enough space nor expands the limit enough.

- The [MDN PerformanceObserver reference](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) gives the direct observer semantics. Observe selects entry types, disconnect stops callback delivery, and takeRecords returns the currently stored observer records while emptying that queue.

Those rules create several observable duties for PerformanceObserver buffer overflow testing:

- Install the observer before the controlled burst unless the case explicitly tests buffered delivery. Record the installation mark so late setup cannot look like browser loss.

- Give every generated mark or resource a unique expected name. Counts alone can pass when one entry is duplicated and another is absent.

- Append callback entries and drained records into one evidence list. Keep the delivery channel beside each entry so cleanup races remain visible.

- Handle the Resource Timing full-buffer event when resource volume can reach the configured limit. The fixture must record whether it enlarged or cleared that separate buffer.

- Call takeRecords before disconnect when pending observer records matter. A disconnect-only cleanup can stop future callbacks without proving that queued records were inspected.

- Create one post-disconnect mark and require its absence from the observer evidence. That negative control proves cleanup actually stopped delivery.

- Clear marks, measures, and resource timings owned by the fixture. A repeated run must not inherit names from an earlier case.

- The repository file seed-skills/web-vitals-testing/SKILL.md requires focused, independent tests, correct async handling, and resource cleanup. The companion seed-skills/performance-budget-testing/SKILL.md adds automated CI gates, reports, thresholds, and trend evidence.

- These repository files provide workflow guidance rather than browser queue semantics. The browser claims come from the approved standards and reference pages, while this article turns them into a regression oracle.

- The [performance testing guide](/blog/performance-testing-complete-guide) covers the wider testing program. This page owns observer completeness and proof that shutdown did not discard unexamined evidence.

## How do you build a PerformanceObserver buffer test?

- A PerformanceObserver buffer test starts with a local page that controls every entry name and creation phase. Use marks for exact delivery tests because the page can create them synchronously, then add local resources for Resource Timing capacity and redaction cases.

- Define a manifest before executing the fixture. Each row should hold the entry name, entry type, phase, expected visibility, and accepted delivery channel, rather than deriving expectations from whatever the observer happened to return.

- Use four named phases. Create two pre-observation marks, install a buffered mark observer, create a numbered burst, create a final mark immediately before draining, then disconnect and create a forbidden marker afterward.

- First inspect PerformanceObserver.supportedEntryTypes. If a required type is absent, report a named compatibility outcome instead of treating zero entries as a successful empty workload.

- For resource entries, set the resource timing buffer size above the positive workload. A separate boundary case can set a deliberately small size and verify the full-buffer handler, but the baseline should not mix capacity pressure with observer timing.

- This browser helper adapts the focused async and cleanup guidance in seed-skills/web-vitals-testing/SKILL.md. The expected manifest and delivery labels are fixture-specific recommendations.

\`\`\`javascript
export async function collectNamedMarks(page, burstSize = 40) {
  return page.evaluate(async (size) => {
    const expected = ['before-a', 'before-b'];
    const evidence = [];
    const batches = [];

    performance.clearMarks();
    performance.mark('before-a');
    performance.mark('before-b');

    if (!PerformanceObserver.supportedEntryTypes.includes('mark')) {
      return { supported: false, expected, evidence, batches };
    }

    const observer = new PerformanceObserver((list) => {
      const names = list.getEntries().map((entry) => entry.name);
      batches.push(names);
      evidence.push(...names.map((name) => ({ name, via: 'callback' })));
    });

    observer.observe({ type: 'mark', buffered: true });

    for (let index = 0; index < size; index += 1) {
      const name = 'burst-' + String(index).padStart(3, '0');
      expected.push(name);
      performance.mark(name);
    }

    expected.push('before-drain');
    performance.mark('before-drain');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const drained = observer.takeRecords();
    evidence.push(
      ...drained.map((entry) => ({ name: entry.name, via: 'takeRecords' })),
    );
    observer.disconnect();
    performance.mark('after-disconnect');

    return { supported: true, expected, evidence, batches };
  }, burstSize);
}
\`\`\`

- Run this baseline with a modest fixed burst before increasing volume. Require every expected name exactly once, reject after-disconnect, and save batch boundaries without requiring a particular callback count.

- Callback grouping depends on scheduling, so callback count is usually a weak cross-browser oracle. Entry identity and final union are stronger than assuming one task creates one callback.

The [Core Web Vitals guide](/blog/core-web-vitals-testing-guide-2026) explains broader browser performance checks. Keep this fixture small enough that a missing name points to one delivery phase.

## What breaks takeRecords performance entries?

- takeRecords performance entries become misleading when the test treats one queue as the entire performance timeline. The method drains records already queued for that observer, but it cannot recover entries never observed, records already delivered to a callback, or Resource Timing entries dropped from another full buffer.

- Late installation is the first setup defect. Marks created before observe require a supported buffered observation mode, while an observer installed after an unbuffered event cannot reconstruct that event.

- Unsupported entry types create a compatibility gap rather than an empty pass. Check supportedEntryTypes before observation and include browser name, version, channel, and requested type in the result.

- Disconnecting before takeRecords can hide pending records. The correct cleanup order is to stop generating controlled work, yield through the expected delivery point, drain the queue, disconnect, and then create the negative marker.

- Draining too early has the opposite problem. If asynchronous resources are still loading, takeRecords only reports what is queued at that moment, so the test must await the fixture's own completion signal rather than a guessed delay.

- Callback and drained arrays can overlap only if the harness merges data incorrectly. Keep append operations in one page context, then reject duplicate expected names instead of silently deduplicating with a Set.

- Resource Timing capacity can drop evidence before an observer sees it. Listen for resourcetimingbufferfull, record the event, and isolate the small-buffer case from the ordinary observer-drain test.

- Cross-origin resource entries can exist while sensitive timing fields remain masked. That condition affects field completeness, not necessarily entry identity, so report redaction separately from an absent resource entry.

- Page lifecycle can also pause or restore work. The [web.dev bfcache guidance](https://web.dev/articles/bfcache) distinguishes pagehide and pageshow behavior, recommends disconnecting observers during lifecycle cleanup, and warns that restored pages resume prior JavaScript state.

- A restored page therefore needs a new run identifier and fresh observer state. Do not merge entries collected before pagehide with a post-restore regression case unless that continuity is the stated contract.

- The [Lighthouse CI guide](/blog/lighthouse-ci-performance-budget-gates-guide-2026) addresses complete page audits. Observer queue triage should remain a smaller prerequisite that explains exactly which entry disappeared.

## buffered observer entry test fixtures and controls

- A buffered observer entry test should vary one phase at a time. Every case begins with cleared performance state, a unique run prefix, a fixed browser context, and a manifest that is independent from observed output.

- The positive buffered case creates named marks before observation and requests buffered delivery. It passes only when supported browsers return every named pre-observation mark.

- The live burst case installs first and creates a fixed sequence afterward. It requires exact name equality while allowing callback grouping to vary.

- The pending-record case creates a final mark and drains before disconnect. It records whether that mark arrived through a callback or takeRecords, but it cannot vanish.

- The shutdown case creates after-disconnect and requires that name to stay absent. It also checks that no later callback mutates the saved evidence.

- The capacity case lowers the Resource Timing buffer size, loads unique local resources, and records the full event. It must either add room or deliberately report dropped entries.

- The cross-origin case serves one resource with Timing-Allow-Origin and one without it. Entry identity may appear for both, while protected timing attributes can differ.

- The repeated-run case starts a new context and prefix. It rejects any name from the first run and compares only manifest-relative counts.

- The delayed-task control queues one mark from an owned timer before the final drain. It waits for a fixture signal, not a fixed sleep, and proves that shutdown starts only after all planned producers have stopped.

- The cleanup case clears owned marks, measures, resource timings, event handlers, and observers. It reports cleanup failure separately from an assertion failure.

- Use deterministic local URLs and immutable response bodies. A changing CDN cache, third-party script, or service worker can add unrelated entries and make capacity evidence impossible to interpret.

Record the complete observed name list, not only missing names. Extra entries can reveal a fixture leak, duplicate request, speculative load, or shared browser state.

- The [Sitespeed.io guide](/blog/sitespeed-io-performance-testing-guide-2026) can add navigation-level evidence after the focused page passes. Keep observer controls independent from full-site traffic.

## How should performance entry loss detection be asserted?

- Performance entry loss detection should compare an expected manifest with the union of callback and drained observer records. Exact equality fits unique names and counts, while partial order fits start times that should rise without requiring equal timestamps.

- Use exact set and multiplicity assertions for controlled marks. Every expected name appears once, no unknown fixture-prefixed name appears, and after-disconnect appears zero times.

- Keep delivery channel as diagnostic metadata rather than a universal assertion. A browser may deliver a queued mark in the last callback or through takeRecords after a scheduling yield, yet both can satisfy the completeness contract.

Use partial order for the named phases. Pre-observation marks should precede burst marks by startTime, and before-drain should not precede the final burst entry.

Use bounded timing only for the harness completion signal. An exact callback delay is brittle because task scheduling changes with browser load and CI hardware.

Use state-transition assertions for cleanup. The state moves from collecting to draining, then disconnected, and any callback after disconnected is a failure even when the name set remains complete.

- Use compatibility assertions for supportedEntryTypes and buffered observation. A missing feature should produce a documented skip or unsupported result, never a pass with empty evidence.

- For Resource Timing, compare capacity evidence separately. The specification says a full handler must clear enough room or increase capacity enough, otherwise excess entries can be removed.

- For cross-origin entries, avoid treating every zero size as loss. The Resource Timing standard permits protected fields to be zero when timing permission or cross-origin access checks fail.

- The assertion report should show expected count, observed count, missing names, duplicate names, unexpected names, callback batches, drained names, full-buffer events, lifecycle state, and cleanup result. That evidence reveals the first differing state.

- Open the [performance testing category](/categories/performance-testing) for related measurement skills. This oracle should pass before aggregate budgets hide one missing entry inside a summary value.

## disconnect observer cleanup in CI

- disconnect observer cleanup belongs in CI because leaked observers can make later tests pass or fail depending on execution order. Run each scenario in a fresh browser context, and use one fixture page per case when lifecycle behavior is under review.

- Save the browser engine and version, operating system, fixture commit, run prefix, supported entry types, configured resource buffer size, expected manifest, callback batches, drained records, full-buffer event count, and post-disconnect mutation check.

- Do not save private cross-origin URLs, query strings, or complete resource names from production traffic. The fixture should use synthetic names and local origins so its evidence is safe and repeatable.

- Fail CI for a missing or duplicate expected name, an unknown fixture-prefixed name, after-disconnect delivery, an unhandled capacity event, a leaked observer, stale names, or absent cleanup evidence. Report unsupported types through an explicit policy decision.

- The repository performance skill requires tests on pull requests, minimum gates, published reports, notifications, and trend tracking. For this fast contract, retain the detailed artifact on failure and a compact summary on success.

- Lighthouse CI can remain a separate stage. Its [configuration reference](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) documents collection and assertion settings, while this gate tests browser records directly.

- Use the [QA skills directory](/skills) to connect the focused check with performance budget workflows. Keep the observer run below one minute so teams do not replace exact evidence with an occasional manual investigation.

## PerformanceObserver buffer overflow testing comparison matrix

- The matrix separates observer delivery, Resource Timing capacity, shutdown behavior, and timing access. PerformanceObserver buffer overflow testing should report the named case before it reports a generic count mismatch.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Entries before buffered observer | Two named marks created before observe | Both names appear when buffered marks are supported | Pre-observation name is absent without an unsupported result | [MDN PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) |
| Burst after observation starts | Fixed sequence created after observer installation | Every burst name appears once across callbacks and drain | Missing, duplicate, or unknown prefixed name | seed-skills/web-vitals-testing/SKILL.md |
| Records pending before disconnect | Final marker, task yield, then takeRecords | Final marker appears by callback or drain | Disconnect completes with final marker absent | seed-skills/performance-budget-testing/SKILL.md |
| Entries after disconnect | Forbidden marker created after shutdown | No later callback or evidence mutation | Forbidden marker appears or callback runs later | [bfcache lifecycle guidance](https://web.dev/articles/bfcache) |
| Cross-origin resource without permission | Controlled resource omits Timing-Allow-Origin | Entry is classified with masked fields allowed | Test calls masked timing fields dropped records | [Resource Timing](https://www.w3.org/TR/resource-timing-2/) |

- The first three rows use named marks because their identities are fully controlled. The fifth row uses a resource because origin permission affects Resource Timing fields rather than mark delivery.

Do not collapse masked fields and absent entries into one failure. That shortcut produces a false loss report when the browser is enforcing the expected privacy boundary.

Use the [blog index](/blog) when the matrix points to a wider browser, budget, or lifecycle problem. Keep the row artifact attached to the exact engine that produced it.

## How do you implement PerformanceObserver buffer overflow testing?

- Implementation needs a single comparison function that preserves multiplicity. A Set can find missing names, but a frequency map is required to detect duplicates that would otherwise offset an absent entry.

- The second example follows CI reporting and cleanup guidance from seed-skills/performance-budget-testing/SKILL.md. It treats unsupported capability, incomplete evidence, and cleanup mutation as distinct outcomes.

\`\`\`javascript
export function assertObserverEvidence(result) {
  if (!result.supported) {
    return { status: 'unsupported', reason: 'mark entry type unavailable' };
  }

  const counts = new Map();
  for (const item of result.evidence) {
    counts.set(item.name, (counts.get(item.name) || 0) + 1);
  }

  const expected = new Set(result.expected);
  const missing = result.expected.filter((name) => !counts.has(name));
  const duplicates = [...counts]
    .filter(([name, count]) => expected.has(name) && count !== 1)
    .map(([name, count]) => ({ name, count }));
  const unexpected = [...counts.keys()].filter(
    (name) => name.startsWith('burst-') && !expected.has(name),
  );
  const observedAfterDisconnect = counts.has('after-disconnect');

  const passed =
    missing.length === 0 &&
    duplicates.length === 0 &&
    unexpected.length === 0 &&
    !observedAfterDisconnect;

  return {
    status: passed ? 'passed' : 'failed',
    expectedCount: result.expected.length,
    observedCount: result.evidence.length,
    missing,
    duplicates,
    unexpected,
    observedAfterDisconnect,
    callbackBatches: result.batches,
  };
}
\`\`\`

Follow this procedure for PerformanceObserver buffer overflow testing:

1. Read seed-skills/web-vitals-testing/SKILL.md and seed-skills/performance-budget-testing/SKILL.md, then record observation, reporting, isolation, CI, and cleanup duties.
2. Create a local page with named marks and resources before observation, during a fixed burst, immediately before drain, and after disconnect.
3. Run the positive case first, inspect supportedEntryTypes, collect callback batches, call takeRecords, disconnect, and compare the full manifest.
4. Inject late installation, unsupported type, early drain, disconnect-before-drain, small Resource Timing capacity, cross-origin redaction, and lifecycle restore separately.
5. Compare missing, duplicate, unexpected, drained, post-disconnect, capacity, and cleanup evidence with the five-row matrix, then report the first divergence.
6. Run the cases in fresh CI contexts, retain safe diagnostics, clear owned performance state, remove handlers, and repeat the positive case after cleanup.

- The repeated positive case is an important final control. It catches an observer that remained active, an event handler left attached, a reused prefix, or performance entries retained by the harness.

- Do not require identical callback batches between browser engines. Require identical fixture-relative entry identity, multiplicity, supported behavior, and final state.

- When the capacity case fails, inspect its resource buffer event before changing observer code. When only the shutdown case fails, inspect drain order and post-disconnect callback mutation first.

The [performance budget guide](/blog/lighthouse-ci-performance-budget-gates-guide-2026) can consume this result as a prerequisite. It should not replace the name-level evidence with only a score threshold.

## Frequently Asked Questions

### Does PerformanceObserver disconnect discard records waiting for takeRecords?

- Disconnect stops the observer callback from receiving later performance entries, while takeRecords returns and empties records currently stored for that observer. Because the reference does not promise that disconnect returns pending evidence, drain before disconnect when completeness matters and prove the order with a final named marker.

### Is a full Resource Timing buffer the same as a full observer queue?

- No. Resource Timing defines a browser performance entry buffer, a size limit, a full event, and handling for excess resource entries. PerformanceObserver also retains records that takeRecords can drain. Test these mechanisms separately, then combine their evidence only after each focused control passes.

### Should a test require one callback for every generated mark?

- No. Callback batching can vary with task scheduling and browser implementation. Require every controlled name exactly once across all callback lists plus drained records, preserve batch boundaries for diagnosis, and avoid an exact callback-count assertion unless the application contract truly depends on that scheduling detail.

### How can a test distinguish unsupported buffered observation from lost entries?

- Inspect PerformanceObserver.supportedEntryTypes before running the case, record the browser version, and return an explicit unsupported status when the required type is absent. A supported case with missing manifest names is a failure, while an unsupported case follows the project's documented compatibility policy instead of passing empty.

### Why can cross-origin timing fields be zero when an entry exists?

- Resource Timing applies cross-origin timing access checks that can mask transfer and body sizes. Timing-Allow-Origin can permit fuller exposure, although the specification still allows user-agent restrictions. Classify masked fields separately from missing entry identity, and compare only fields supported by the controlled origin policy.

### What evidence should CI retain after observer cleanup fails?

- Keep engine and version, fixture revision, run prefix, supported types, expected names, callback batches, drained names, capacity events, lifecycle phase, post-disconnect mutations, and cleanup status. Avoid private URLs and production resource names. The artifact should identify the first state change that violated the fixture contract.

## Conclusion

- PerformanceObserver buffer overflow testing is reliable when a known manifest drives the assertion, callback and drained records remain distinguishable, Resource Timing capacity is tested separately, and cleanup includes takeRecords before disconnect. Missing, duplicate, masked, and post-shutdown observations must have different failure labels.

- Start with marks, a modest burst, and a fresh browser context. Add resource capacity, cross-origin permission, and page lifecycle cases only after the positive delivery path proves exact entry identity.

- Review the [performance testing complete guide](/blog/performance-testing-complete-guide), then open the [QA skills directory](/skills) and implement the PerformanceObserver buffer overflow testing matrix in the next test run.`,
};
