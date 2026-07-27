import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'resource timing cache attribution testing',
  description:
    'resource timing cache attribution testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Performance Testing',
  primaryKeyword: 'resource timing cache attribution testing',
  keywords: [
    'resource timing cache attribution testing',
    'Resource Timing cache detection',
    'transferSize cache test',
    'encodedBodySize resource timing',
    'cross origin timing allow origin',
    'browser cache attribution metrics',
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
  content: `- Resource timing cache attribution testing can separate transferred, locally reused, validated, and timing-restricted resources under controlled conditions. It cannot reliably distinguish memory cache from disk cache by Resource Timing fields alone, so a sound test reports local reuse, preserves browser evidence, and avoids claiming a specific cache layer without another signal.

## What does resource timing cache attribution testing verify?

- The verified contract connects a controlled request history with one PerformanceResourceTiming entry. A cold same-origin load should expose transfer and body sizes, a reusable warm load should show local reuse, a validation case should show its defined transfer pattern, and a restricted cross-origin load should be labeled unattributable.

- The [Resource Timing specification](https://www.w3.org/TR/resource-timing-2/) supplies the strongest field semantics. Its current algorithm returns transferSize zero for local cache mode, 300 for validated cache mode, and encoded size plus 300 for other transfers.

- Those values support careful classes, not unlimited certainty. A zero transferSize can indicate local reuse under the controlled same-origin case, but it does not identify whether the browser used memory or disk.

The same specification explains cross-origin masking. Transfer, encoded body, and decoded body fields can be zero when timing access checks fail, which means zero cannot always be interpreted as a cache hit.

Resource timing cache attribution testing therefore verifies five separate facts:

- The fixture URL, response version, cache headers, and requested origin are known. Attribution without controlled server state is only a guess.

- The page clears prior resource timings before each case and uses a unique URL token where a cold load is required. Old entries cannot satisfy a new assertion.

- Exactly one target entry is selected by full normalized URL and initiator type. Matching only a filename can select a preload, image, script, or previous query variant.

- transferSize, encodedBodySize, decodedBodySize, duration, response timing, and delivery context are captured together. No single numeric field owns every class.

- A warm case proves the response was reusable through server request counts or another controlled signal. Timing values are then interpreted against that known setup.

- A revalidation case records the conditional request and server response. It must not be merged with a purely local reuse case.

- Cross-origin access is tested with paired resources that differ only in Timing-Allow-Origin. Masked fields receive an access label rather than a local-cache label.

- Service workers, preload, bfcache, and speculative activity are disabled or recorded. Each can change the request path without changing the test URL.

- The repository file seed-skills/web-vitals-testing/SKILL.md asks for focused, independent async tests with explicit cleanup. The file seed-skills/performance-budget-testing/SKILL.md adds CI thresholds, reports, notifications, and trend tracking.

- Neither repository file defines memory-cache internals. They support the test workflow, while the standard supports field interpretation and this article defines conservative classes.

- Use the [performance testing complete guide](/blog/performance-testing-complete-guide) for the broader measurement plan. This page owns per-resource attribution and explicit uncertainty.

## How do you build a Resource Timing cache detection fixture?

- A Resource Timing cache detection fixture needs a local origin with a request ledger. Serve one immutable body at a stable URL, return an ETag, and let each test choose reusable, revalidated, or non-store cache headers without changing unrelated response properties.

Create a second controlled origin for Timing-Allow-Origin cases. Its allowed and denied endpoints should return the same bytes and cache policy, while only the timing permission header changes.

Start every case in a new browser context when cache state must be empty. Clearing the performance timeline removes entries, but it does not clear the HTTP cache itself.

Use a unique query token for the cold case, then request the exact same URL for the warm case inside the same context. Query uniqueness is part of the fixture contract, not a production cache-busting recommendation.

Count requests at the server. A warm local reuse case should not increment the target's origin request count, while a validation case should increment it and carry a conditional header expected by the fixture.

Avoid page reload as the only trigger because bfcache can restore a whole page without performing an ordinary load. The [web.dev bfcache article](https://web.dev/articles/bfcache) states that bfcache is a page snapshot, unlike the HTTP cache, and that restored pages can avoid network work entirely.

This collector adapts async handling and cleanup guidance from seed-skills/web-vitals-testing/SKILL.md. It captures fields without assigning a cache class inside the browser.

\`\`\`javascript
export async function loadAndMeasure(page, targetUrl) {
  return page.evaluate(async (url) => {
    performance.clearResourceTimings();

    const observerEntries = [];
    const observer = new PerformanceObserver((list) => {
      observerEntries.push(...list.getEntriesByType('resource'));
    });
    observer.observe({ type: 'resource', buffered: true });

    const response = await fetch(url, { cache: 'default' });
    await response.arrayBuffer();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const pending = observer.takeRecords();
    observer.disconnect();

    const entries = [...observerEntries, ...pending]
      .filter((entry) => entry.name === response.url)
      .map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        duration: entry.duration,
        responseStart: entry.responseStart,
        responseEnd: entry.responseEnd,
      }));

    return { status: response.status, entries };
  }, targetUrl);
}
\`\`\`

- Require one target entry before classifying fields. If the observer misses it, inspect performance.getEntriesByName as diagnostic evidence, but do not silently replace the declared collection path.

Run an uncached positive case first. It should reach the origin, return the expected body digest, and expose nonzero same-origin sizes before any cache assertion is trusted.

The [Core Web Vitals testing guide](/blog/core-web-vitals-testing-guide-2026) covers page-level metrics. Keep this fixture focused on one resource and one known request history.

## What breaks a transferSize cache test?

- A transferSize cache test breaks when it maps zero directly to memory cache. The standard's local mode does not expose the physical cache layer, so memory and disk remain intentionally combined without independent browser instrumentation.

Cross-origin masking creates the most dangerous false result. A denied timing check can zero protected size fields, making a network transfer look like local reuse if origin access is ignored.

- Service workers add another request path. The Resource Timing specification notes that a response forwarded through a service worker may not expose the full internal fetch story in the document's timeline.

- Preloads and speculative fetches can warm the cache before the test's visible request. Record initiator type, page markup, server ledger, and preload headers, then remove automatic warmers from the focused fixture.

- Revalidation is not an ordinary miss. A conditional request reaches the server and may reuse a stored body, so the assertion must consider origin request count and the validated transfer pattern together.

- A redirect can produce several entries or change the selected URL. Select the final response and redirect entries deliberately instead of assuming the requested string equals the measured name.

An HTTP 304 response can still produce a useful final resource for the page. Do not assert response body length from the wire alone when the browser combines validation with a stored representation.

- Compression separates encoded and decoded sizes. A transferred compressed resource can have a smaller encodedBodySize than decodedBodySize without any cache defect.

Clearing resource timings after the load erases the evidence, while clearing too early can leave prior network work in flight. Stop owned work, clear, start observation, then initiate only the target request.

Browser restarts, private mode, storage pressure, and cache partitioning can change reuse. Pin the engine and context policy in CI, then treat local reuse as a result of that controlled environment.

- The [Lighthouse CI budget guide](/blog/lighthouse-ci-performance-budget-gates-guide-2026) covers aggregate performance gates. A per-resource test should explain uncertain attribution instead of forcing every zero into a hit counter.

## encodedBodySize resource timing fixtures and controls

encodedBodySize resource timing cases need bodies whose compressed and decoded lengths are known. Serve a fixed text file, a fixed binary file, and a zero-length response, then record response headers and a digest beside timing values.

- The cold same-origin control uses a unique URL and confirms one origin request. It expects an encoded body size matching the transferred representation and a decoded size matching the fixture bytes.

- The warm reusable control repeats the identical URL in the same context. It requires no new origin request and permits a local transferSize classification without naming memory or disk.

- The revalidation control returns an ETag with immediate staleness. It requires a conditional origin request, a known validation response, and the expected validated class.

- The non-store control repeats an identical URL whose response forbids storage. It requires another origin request and must not receive the local-reuse label.

- The compressed control serves known gzip content. It expects decoded size to reflect the decoded body and preserves encoded size for transfer comparison.

- The empty-body control prevents a zero encodedBodySize from becoming automatic cache evidence. Its known body length is zero even on a network response.

- The service-worker control either unregisters all workers or records controller identity and worker request logs. It never mixes worker forwarding with plain HTTP-cache attribution.

- The repeated-run control starts with a fresh context and server ledger. Its first URL should return to the cold class instead of inheriting a prior browser profile.

- The eviction control warms one known resource, adds a fixed set of unrelated local responses, and requests the target again. It reports the observed class without assuming that every browser keeps or drops the same cache entry under pressure.

Check the response digest in the page and the request count at the server. Timing fields alone cannot prove that the correct body version was reused.

Use the [Sitespeed.io performance guide](/blog/sitespeed-io-performance-testing-guide-2026) after these controls pass. A site crawl can then reveal where reuse differs from this known baseline.

## How should cross origin timing allow origin be asserted?

- Cross origin timing allow origin testing should use a pair of otherwise identical resources. One response permits the document origin through Timing-Allow-Origin, while the other omits permission and should expose a restricted field set.

- The Resource Timing specification says Timing-Allow-Origin communicates which origins may see values otherwise hidden by cross-origin rules. It also permits user agents to retain some restrictions, so a test should record engine behavior rather than promise every field.

- Exact equality fits the configured header, target URL, response digest, and origin request count. It also fits the expected access class when the browser version is part of the compatibility matrix.

- Partial comparison fits sizes only after permission succeeds. For a compressed body, decoded size should not be smaller than encoded size, but exact values depend on the controlled representation.

- State-transition assertions fit the paired case. The denied resource begins with restricted access, the allowed resource receives explicit permission, and the report shows which previously masked fields became visible.

Do not infer local cache from three zero size fields on a cross-origin entry. First evaluate timing access, then check request history, and only then consider cache reuse.

- Use a specific allowed origin rather than a wildcard when the product policy demands narrow disclosure. The fixture should verify the response header bytes and the document origin used by the browser.

- Test cached permission changes carefully. The specification notes that Timing-Allow-Origin can arrive from a cached response or a revalidation response, so clear cache state when comparing server policy versions.

- Record the page origin, resource origin, header, browser version, request count, response version, entry fields, and access class. Avoid storing sensitive production URLs or response headers.

- The [performance testing category](/categories/performance-testing) lists related browser skills. Keep timing-permission tests local and deterministic before applying the method to third-party assets.

## browser cache attribution metrics in CI

- browser cache attribution metrics should report classes and evidence rather than a single hit percentage. Useful classes are transferred, locally reused, validated, restricted, service-worker-mediated, missing entry, and ambiguous.

Run the cold, warm, validation, non-store, allowed-origin, and denied-origin cases in a fixed order within one owned context. Start a second fresh context for the repeated cold control.

- Save engine and version, operating system, fixture commit, page origin, target URL token, cache headers, ETag version, request ledger, response digest, timing fields, observer delivery, service worker state, class, and cleanup result.

- Fail CI when a cold case avoids the origin unexpectedly, a warm reusable case reaches it unexpectedly, a non-store case receives local reuse, validation lacks a conditional request, access classes collapse, the body digest changes, or evidence is absent.

Do not fail merely because a local reuse occurred through memory on one machine and disk on another. Resource Timing does not provide that distinction, so the gate should not claim it.

- The performance budget repository skill recommends pull-request gates, published reports, notifications, and tracked trends. Trend the conservative classes and transferred bytes while preserving raw case evidence for failures.

- The [Lighthouse CI configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) documents repeat collection and assertions for page audits. Keep this direct resource fixture separate, then use its result to explain broader audit movement.

Open the [QA skills directory](/skills) for reusable performance workflows. A fast attribution suite should finish before the full page budget stage starts.

## resource timing cache attribution testing comparison matrix

- The matrix ties each class to controlled request history. Resource timing cache attribution testing must return ambiguous whenever origin access or request evidence cannot support a narrower label.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Cold same-origin resource load | Unique URL, empty context, one known body | Origin count one and transferred fields available | No request, wrong digest, or missing target entry | seed-skills/web-vitals-testing/SKILL.md |
| Warm load with reusable response | Same URL repeated in one context | No new origin request and local reuse class | Memory or disk claimed without added evidence | [Resource Timing](https://www.w3.org/TR/resource-timing-2/) |
| Revalidated response | Stale ETag response followed by repeat | Conditional request and validated class | Revalidation merged with local reuse | seed-skills/performance-budget-testing/SKILL.md |
| Cross-origin with Timing-Allow-Origin | Paired origin grants document access | Supported timing fields become available | Header exists but access evidence is ignored | [MDN PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) |
| Cross-origin without timing permission | Same bytes with permission omitted | Restricted class, never automatic cache hit | Masked zero fields labeled local reuse | [bfcache and HTTP cache](https://web.dev/articles/bfcache) |

The warm row proves reuse through the request ledger, not through transferSize alone. The denied-origin row proves why that supporting evidence is necessary.

Keep response versions fixed across the table. A changed ETag or body creates a content update case rather than a cache-attribution case.

Use the [blog index](/blog) when results point to compression, service workers, bfcache, or page budgets. Preserve this table's narrower classification in any wider report.

## How do you implement resource timing cache attribution testing?

- Implementation should classify from origin access, server observations, and timing fields in that order. This prevents a masked cross-origin network response from reaching the local-reuse branch.

The classifier below follows reporting and gate guidance from seed-skills/performance-budget-testing/SKILL.md. It intentionally returns local-reuse rather than memory-cache or disk-cache.

\`\`\`javascript
export function classifyResourceCase(input) {
  const { entry, access, originRequests, expectedBodySize, serviceWorker } = input;

  if (!entry) {
    return { className: 'missing-entry', reason: 'target timing entry absent' };
  }
  if (serviceWorker) {
    return {
      className: 'service-worker-mediated',
      reason: 'document timing cannot prove the internal fetch path',
    };
  }
  if (access === 'restricted') {
    return {
      className: 'restricted',
      reason: 'cross-origin timing fields are not attribution evidence',
    };
  }
  if (originRequests === 0 && entry.transferSize === 0) {
    return {
      className: 'local-reuse',
      reason: 'known reusable response caused no origin request',
    };
  }
  if (originRequests === 1 && entry.transferSize === 300) {
    return {
      className: 'validated',
      reason: 'conditional origin request matched validated transfer pattern',
    };
  }
  if (
    originRequests === 1 &&
    entry.encodedBodySize === expectedBodySize &&
    entry.transferSize > entry.encodedBodySize
  ) {
    return { className: 'transferred', reason: 'known body crossed network' };
  }
  return { className: 'ambiguous', reason: 'signals do not support one class' };
}
\`\`\`

Follow this procedure for resource timing cache attribution testing:

1. Read seed-skills/web-vitals-testing/SKILL.md and seed-skills/performance-budget-testing/SKILL.md, then record collection, isolation, reporting, gate, and cleanup duties.
2. Build controlled same-origin and cross-origin endpoints with fixed bodies, cache headers, ETags, timing permission, request ledgers, and response digests.
3. Run the cold positive case first, capture the exact entry and server count, then repeat the identical URL for known reusable behavior.
4. Inject validation, non-store, compression, empty bodies, timing denial, service worker mediation, preload, and bfcache conditions one at a time.
5. Compare transfer, encoded, decoded, origin, digest, initiator, permission, and worker evidence with the five-row matrix, then report the first divergence.
6. Run the suite in CI, retain safe case artifacts, clear owned entries and server state, close contexts, and repeat the cold control in a fresh profile.

- Reject a result when multiple target entries remain after URL normalization. Duplicate entries can indicate a preload plus fetch, a redirect, or a fixture that initiated work twice.

Keep the server ledger synchronized with a run token. Counts from another worker or earlier retry can turn a transferred case into false local reuse.

When a browser differs from the expected field pattern, preserve the raw entry and return ambiguous until the compatibility policy is reviewed. Do not rewrite the classifier to force a pass.

The [performance testing guide](/blog/performance-testing-complete-guide) can place this suite before page budgets. The exact resource evidence should remain available when a higher-level metric changes.

## Frequently Asked Questions

### Can Resource Timing distinguish memory cache from disk cache?

- Not reliably through its standard fields alone. A controlled zero-transfer result can support local reuse, but the specification does not expose which physical cache layer served it. Use browser-specific tracing only when that distinction is required, and label such evidence separately from the portable Resource Timing contract.

### What does transferSize zero prove in a cache test?

- For a permitted same-origin entry with a controlled reusable response and zero new origin requests, it supports local reuse. By itself, zero proves too little because cross-origin masking, empty bodies, service workers, or incomplete evidence can create similar values. Evaluate access and request history first.

### Why should the server record requests during a browser timing test?

- The ledger supplies an independent network-side oracle. It separates a reusable warm response from a transferred or conditionally validated response when timing fields overlap. Tie every ledger row to a run token, target URL, conditional headers, response version, and digest so parallel workers cannot contaminate counts.

### How should encodedBodySize and decodedBodySize be compared?

- Compare them against a fixed fixture representation, content encoding, and response digest. Compressed content can have a smaller encoded size than decoded size, while an empty body can make both zero on a network response. Their relationship is useful evidence, but neither value alone identifies cache reuse.

### What does Timing-Allow-Origin change in the result?

- It tells the browser which document origins may access timing fields otherwise restricted for cross-origin resources. Pair allowed and denied responses with identical bytes, then record which fields become available. Do not assume every browser exposes every value, because the specification permits remaining user-agent restrictions.

### Which cache evidence belongs in a CI artifact?

- Keep engine version, fixture revision, run token, page and resource origins, cache headers, ETag, request ledger, response digest, initiator type, timing fields, access class, worker state, final attribution, and cleanup status. Omit sensitive production URLs and headers by using synthetic local fixtures.

## Conclusion

- Resource timing cache attribution testing is trustworthy when server request history, origin permission, response identity, and timing fields agree. The portable result can distinguish transferred, locally reused, validated, restricted, mediated, missing, and ambiguous cases, but it should not invent a memory-versus-disk answer.

- Begin with one immutable same-origin body and a cold control. Add warm reuse, validation, cross-origin permission, compression, service workers, and page lifecycle behavior only after the network ledger and entry selector are exact.

- Review the [performance testing complete guide](/blog/performance-testing-complete-guide), then open the [QA skills directory](/skills) and implement the resource timing cache attribution testing matrix in the next test run.`,
};
