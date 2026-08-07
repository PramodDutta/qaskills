import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Web Vitals INP Debugging Guide: Find and Fix Slow Interactions',
  description: 'Use this web vitals INP debugging guide to trace slow interactions, isolate main-thread bottlenecks, and verify responsive fixes in lab and field data.',
  date: '2026-08-07',
  category: 'Performance',
  content: `
# Web Vitals INP Debugging Guide: Find and Fix Slow Interactions

This web vitals INP debugging guide gives QA and test-automation engineers a repeatable path from a bad field percentile to the exact interaction, task, and rendering work that delayed the next paint. The short version is: identify the page and user segment with poor Interaction to Next Paint, reproduce a representative interaction under realistic constraints, inspect its input delay, processing duration, and presentation delay, then make one targeted change and verify it with both traces and field data.

INP is not a generic page-speed score. It evaluates how quickly a page responds visually to user interactions during the page's lifetime. That means a fast initial load can coexist with terrible responsiveness after a filter change, menu open, rich-text edit, or checkout validation. A useful investigation therefore starts with actual interaction evidence, not a blanket attempt to reduce every JavaScript bundle.

The workflow below treats INP debugging like defect isolation. You will collect a symptom, preserve environmental details, reduce the slow path, prove the responsible work, and add a regression signal. The result is more defensible than chasing a single Lighthouse number because it connects the user-visible delay to code the team can change.

## Translate an INP alert into a testable performance defect

INP is built from interaction latency observed through the Event Timing API. A click, tap, or keyboard interaction can include multiple browser events, but the interaction is evaluated as a group. The reported page value is intended to represent the page's overall responsiveness while reducing sensitivity to a lone anomaly on pages with many interactions. Field tools commonly report the 75th percentile across visits, split by device class, so the defect statement should preserve that aggregation context.

Do not write a ticket that merely says "INP is red." Record the affected route or template, device class, percentile, collection window, sample size, and the interaction suspected from attribution data. If attribution is unavailable, the first task is instrumentation, not optimization.

| Evidence field | Example | Why QA needs it |
|---|---|---|
| Page group | Product search results | Prevents one route from representing the whole origin |
| Population | Mobile, p75, rolling 28 days | Preserves the actual acceptance population |
| Interaction | Click on "Apply filters" | Turns an aggregate metric into a reproducible action |
| Phase | 35 ms input, 180 ms processing, 90 ms presentation | Points the investigation toward contention, handlers, or rendering |
| Environment | Mid-tier Android, 4x CPU slowdown in lab | Makes local reproduction explainable |
| Release marker | Search UI release 2026.08.1 | Supports before-and-after correlation |

The commonly used interpretation bands for INP are good at 200 milliseconds or less, needs improvement above 200 and at most 500 milliseconds, and poor above 500 milliseconds. Treat those as user-experience thresholds, not permission to ignore a regression from 90 to 190 milliseconds. A budget can be tighter than the public threshold when a critical workflow demands it.

A strong defect statement might be: "On mobile product-search visits, p75 INP rose from 170 ms to 310 ms after the facet-panel release. Field attribution points to clicks on Apply filters. A throttled trace reproduces 280 to 340 ms, dominated by synchronous result normalization before paint." This gives developers a place to start and gives QA a condition to verify.

## Separate field truth from lab diagnostics

Field and lab measurements answer different questions. Real User Monitoring shows what actual users experienced across varied devices, sessions, extensions, data, and network conditions. A lab trace gives you a controlled timeline with call stacks and rendering details. Field data establishes impact; lab data explains mechanism.

| Measurement source | Strongest use | Important limitation | QA decision |
|---|---|---|---|
| Chrome UX Report | Origin or URL-level population trend | Does not identify your application handler | Use for release health and broad comparison |
| RUM with web-vitals attribution | Interaction target, type, phases, route, session context | Sampling and privacy rules affect detail | Use to choose the failing journey |
| DevTools Performance trace | Main-thread tasks, event handlers, style, layout, paint | One synthetic run is not a percentile | Use to prove the bottleneck |
| Lighthouse timespan or user flow | Repeatable interaction audit | Test setup can differ from production users | Use as a standardized lab check |
| Playwright instrumentation | Deterministic journey and application marks | Browser automation does not create representative field data by itself | Use for regression reproduction |

Field data can lag a deployment because aggregate windows include older visits. Conversely, a local trace can look healthy on a powerful laptop even while customers on slower phones struggle. Never close an INP issue solely because one desktop run is green. Match the route, authentication state, dataset size, cache state, device constraints, and feature flags first.

For teams already running load tests, remember that browser responsiveness and backend throughput are related but distinct. A slower API can lengthen a journey, while INP specifically focuses on interaction response around the next paint. Use the [k6 vs JMeter comparison](/blog/k6-vs-jmeter-2026) when the evidence points toward concurrent service load rather than main-thread execution.

## Instrument interactions without contaminating the result

The web-vitals JavaScript library is the practical starting point for production attribution. Keep telemetry small, sample appropriately, and avoid logging user-entered text or sensitive DOM content. Send stable identifiers such as route templates, component names, interaction types, and build IDs.

The following TypeScript sketch records the metric and attribution object. The precise transport and privacy filtering belong to your application. 

\`\`\`ts
import { onINP, type Metric } from 'web-vitals';

type InpEnvelope = {
  name: string;
  value: number;
  rating: string;
  metricId: string;
  route: string;
  buildId: string;
};

function sendMetric(metric: Metric): void {
  const payload: InpEnvelope = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    metricId: metric.id,
    route: location.pathname,
    buildId: document.documentElement.dataset.buildId ?? 'unknown',
  };

  navigator.sendBeacon('/rum', JSON.stringify(payload));
}

onINP(sendMetric);
\`\`\`

Attribution builds of the library can expose additional diagnostic context. Pin the package in the application as you normally would and follow its official documentation at https://github.com/GoogleChrome/web-vitals rather than copying fields from an old blog post. The shape of optional attribution details can evolve, while the underlying diagnostic model remains stable.

Custom performance marks are also useful. Place them around application phases that may appear as one opaque handler in a browser trace. Use names that express product work, not implementation trivia.

\`\`\`ts
async function applyFilters(filters: FilterState): Promise<void> {
  performance.mark('filters:apply:start');

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(filters),
  });
  const data = await response.json();

  performance.mark('filters:render:start');
  renderResults(data);
  performance.mark('filters:apply:end');
  performance.measure(
    'filters:apply',
    'filters:apply:start',
    'filters:apply:end',
  );
}
\`\`\`

Marks do add tiny overhead, but their diagnostic value is high when names are bounded and collection is controlled. Do not create a mark for every list item or every keystroke in production. That can flood buffers and telemetry while making traces harder to read.

## Reproduce the slow interaction as a controlled user journey

Choose an interaction from field attribution or customer reports. Define its preconditions as carefully as a functional test: number of rows, account state, feature flag, viewport, previous navigation, and cache status. INP can happen late in a session, so opening the route and immediately clicking one button may omit the state buildup that causes the defect.

Create a short manual protocol before automating:

1. Open the target route with a production-like dataset.
2. Apply the same CPU constraint for every comparison.
3. Start a Performance recording after the page settles.
4. perform only the target interaction.
5. Wait for its visible result, then stop recording.
6. Save the trace with build ID and environment in the filename.

Automation helps recreate state, but a browser trace remains the primary diagnostic artifact. Playwright can navigate, prepare data, and place performance marks around the interaction. Avoid asserting a universal INP value from a single automated run because scheduling noise and hardware differ across workers.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('filter application remains visibly responsive', async ({ page }) => {
  await page.goto('/search?fixture=large-catalog');
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('checkbox', { name: 'In stock' }).check();

  await page.evaluate(() => performance.mark('qa:apply-click'));
  await page.getByRole('button', { name: 'Apply filters' }).click();

  await expect(page.getByRole('status')).toHaveText(/results updated/i);
  await page.evaluate(() => performance.mark('qa:results-visible'));
});
\`\`\`

For CI design, isolate performance-oriented journeys from a broad parallel functional suite. Heavy worker contention can create main-thread delays unrelated to the application. The [Playwright sharding and parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide) explains how to distribute functional coverage without letting runner topology invalidate the measurement.

## Read the interaction as three latency phases

An interaction's latency is easier to reason about when split into input delay, processing duration, and presentation delay. Each phase suggests different evidence and different fixes.

| Phase | What the browser is doing | Common causes | First evidence to inspect |
|---|---|---|---|
| Input delay | Waiting before event callbacks can run | Earlier long task, third-party script, timer work, hydration | Main-thread work immediately before the event |
| Processing duration | Running callbacks associated with the interaction | Expensive loops, synchronous parsing, framework updates, multiple handlers | Event log, bottom-up call tree, source map stacks |
| Presentation delay | Preparing and presenting the next frame | Large style recalculation, layout, paint, rendering queued behind work | Rendering events, invalidation scope, DOM size |

Input delay is frequently misdiagnosed. The clicked component may have a tiny handler, yet the interaction starts while an unrelated analytics task monopolizes the main thread. Optimizing the handler would not fix the queue. Inspect the timeline immediately before the event, not only the event callback.

Processing duration includes more than the function named in the listener. State updates can synchronously trigger selectors, derived data, component rendering, and layout reads. Expand the trace until you find code you own. If source maps are missing, fix the diagnostic build first; minified stack frames turn a performance investigation into guesswork.

Presentation delay often means the application changed too much DOM at once or forced layout by mixing reads and writes. It can also include work scheduled after handlers but before the browser gets a chance to paint. The visible symptom is that the click has logically completed, yet the user sees no confirmation.

## Find long tasks and prove their ownership

A long task is main-thread work that runs for more than 50 milliseconds. The portion beyond 50 milliseconds is often called blocking time. Long tasks are excellent leads, but not every long task belongs to the interaction, and splitting a 120 millisecond task into chunks does not automatically reduce total work.

In DevTools, select the interaction marker, inspect the related task, then use the bottom-up and call-tree views. Ask four questions:

- Did this work start before, during, or after the input?
- Is it first-party application code, framework code triggered by the app, or third-party code?
- Does it scale with data size, DOM size, or session duration?
- What visible result truly has to happen before the next paint?

The Long Animation Frames API can add field-oriented attribution for frames that block smooth presentation. Browser support and exposed details should be checked against current documentation before making it a required cross-browser signal. Feature-detect observation and treat it as supplemental evidence.

\`\`\`js
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration >= 50) {
        console.debug('Long animation frame', {
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    }
  });

  try {
    observer.observe({ type: 'long-animation-frame', buffered: true });
  } catch {
    // The browser does not expose this entry type.
  }
}
\`\`\`

What people get wrong is equating the largest function in a profile with the root cause. A function can be expensive because an earlier decision passed it 10,000 rows, caused it to run six times, or invalidated the entire page. The actionable cause may be the caller, the state model, or missing memoization. Prove causality by changing one variable and rerunning the same trace.

## Reduce handler work before reaching for scheduling tricks

Start with work elimination. Cache derived data that is stable, avoid parsing the same payload repeatedly, narrow state subscriptions, virtualize genuinely large collections, and update only affected nodes. Scheduling is valuable, but it should not disguise waste.

Suppose a filter handler synchronously normalizes every result before showing even a pressed state. Give the user immediate feedback, perform necessary critical work, and defer noncritical decoration. The exact framework mechanism differs, but the principle is browser-level: return control so a frame can be presented.

\`\`\`ts
function onApplyFilters(): void {
  setButtonState('working');

  requestAnimationFrame(() => {
    const visibleRows = computeVisibleRows(currentFilters, catalog);
    renderPrimaryResults(visibleRows);

    setTimeout(() => {
      enrichResultBadges(visibleRows);
    }, 0);
  });
}
\`\`\`

This example is illustrative, not a claim that timers guarantee an INP improvement. A zero-delay timer still waits for the event loop and can be delayed. Also, moving all work into one later callback can merely shift the long task. Measure whether the browser actually paints the meaningful feedback between chunks.

For CPU-heavy pure computation, consider a Web Worker if serialization and coordination costs are justified. Workers cannot directly manipulate the DOM, so return compact results for the main thread to render.

\`\`\`ts
// rank-worker.ts
self.onmessage = (event: MessageEvent<SearchInput>) => {
  const ranked = rankProducts(event.data.products, event.data.query);
  self.postMessage(ranked);
};

// search-controller.ts
const worker = new Worker(
  new URL('./rank-worker.ts', import.meta.url),
  { type: 'module' },
);

worker.addEventListener('message', (event: MessageEvent<RankedProduct[]>) => {
  renderResults(event.data);
  setSearchState('ready');
});

worker.postMessage({ products, query });
\`\`\`

Worker transfer is not free. Large structured clones, duplicated memory, and late results can make the experience worse. Profile the end-to-end interaction, including message preparation and final rendering.

## Diagnose presentation delay with layout evidence

When JavaScript callbacks are short but the next paint is late, inspect style recalculation, layout, layer work, and paint. A common failure mode is layout thrashing: code writes a style, immediately reads geometry, then repeats across many elements. Each read may force pending layout work.

Batch reads before writes. Better still, use layout systems and CSS classes so the browser can optimize a smaller set of changes.

\`\`\`js
function resizeCards(cards) {
  const widths = cards.map((card) => card.getBoundingClientRect().width);

  cards.forEach((card, index) => {
    card.style.setProperty('--measured-width', String(widths[index]));
    card.classList.add('is-measured');
  });
}
\`\`\`

Look for a layout event whose affected nodes are far broader than the component being updated. Trace invalidation back to the DOM or class change. A selector or container relationship can expand the scope. Also inspect fixed headers, sticky elements, shadows, filters, and large painted regions when paint dominates.

DOM size is a clue, not a verdict. A large document can be responsive when updates are isolated. A moderate document can be slow if every keystroke changes a class high in the tree. Use the trace's affected-node and rendering evidence to avoid cargo-cult limits.

## A realistic failure: the fast API with a slow filter button

Consider a commerce results page. Field INP is 420 milliseconds for mobile users who click Apply filters. Backend dashboards show a 70 millisecond response, so the API team cannot reproduce the complaint. Desktop developers see no obvious lag.

The QA engineer loads a 2,000-item fixture, applies a 4x CPU slowdown, and records one click. The trace shows 25 milliseconds of input delay, 240 milliseconds of processing, and 130 milliseconds of presentation delay. The handler parses a cached JSON string, sorts all results three times for separate widgets, updates the result grid, and then recalculates layout across a sidebar whose height depends on the grid.

The team first caches the parsed result model and computes the three widget summaries in one pass. It then renders the primary result count and button state before noncritical recommendation badges. Finally, it removes a container-level class toggle that invalidated the whole page. The controlled trace falls to 145 milliseconds for the same fixture and constraint.

The diagnostic lesson is not "always cache" or "always defer." It is that phase decomposition prevented an API investigation, the call tree revealed repeated computation, and layout scope explained the remaining delay. Each code change had a corresponding trace prediction.

## Build a regression check without manufacturing confidence

An INP regression suite should have layers. Unit benchmarks can protect a hot pure function. A browser journey can detect a large regression under fixed conditions. RUM confirms the user population improved. No single layer replaces the others.

| Layer | Example assertion | Catches | Does not prove |
|---|---|---|---|
| Unit or microbenchmark | Normalizing 2,000 records stays within team budget | Algorithmic regression | Browser paint responsiveness |
| Component test | Filter update touches expected components | Excess rendering scope | Field percentile |
| Controlled browser journey | Trace or custom span stays below lab budget | Major main-thread regression | All device and user variation |
| RUM release comparison | Mobile p75 improves with stable sample | Real population outcome | Exact causal stack by itself |

Store the fixture and test conditions beside the check. Use medians or repeated samples for noisy lab timings, and compare on equivalent runners. A single millisecond threshold in shared CI is likely to flap. Budget a meaningful margin and investigate distributions.

A GitHub Actions job can keep the performance journey separate and upload its artifacts. Use documented action versions chosen by your repository's maintenance policy rather than copying an unverified version from an article.

\`\`\`yaml
name: interaction-performance

on:
  workflow_dispatch:
  pull_request:

jobs:
  inp-lab:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:interaction-performance
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: interaction-performance-artifacts
          path: test-results/
\`\`\`

Do not run this alongside dozens of CPU-intensive jobs on the same machine and call the absolute time a product property. Dedicated or well-characterized workers give more stable trends. If infrastructure cannot be controlled, make CI diagnostic and reserve release gating for a stable environment plus field guardrails.

## Verify the fix across interaction types and session ages

Clicks are only part of INP. Keyboard interactions can be the worst path in search boxes, editors, grids, and command palettes. Test pointer and keyboard routes where the application implements different event handlers. Continuous gestures such as scrolling are not measured as INP interactions, though responsiveness during and after them can still affect the next discrete interaction.

Repeat the target journey at fresh load and after realistic session use. Memory growth, accumulated listeners, cached state, and detached nodes can make a late-session interaction worse. If the fifth modal opening is slow but the first is fast, capture both traces and compare listener count, DOM nodes, and retained objects.

Verify visible correctness too. An apparent INP win achieved by painting a spinner while delaying essential output may meet a narrow metric goal but fail the user's task. Define the first meaningful visual response for the component. For a toggle, that is often the toggled state. For a search action, it may be a busy state followed by results. Performance acceptance and functional acceptance should share that definition.

Finally, watch field segments for at least a representative collection period. Compare equivalent traffic and annotate releases. Check whether the p75 improved without worsening error rate, abandonment, memory, or interaction correctness. A fix is complete when the slow path is reduced and the workflow still behaves properly.

## Frequently Asked Questions

### Can Lighthouse reproduce a poor INP from field data?

Lighthouse can help exercise and diagnose interactions in a controlled flow, but a single lab run cannot reproduce a field percentile by definition. Field INP reflects real visits, devices, states, and interactions over time. Use field attribution to select the route and action, then use a Lighthouse user flow, DevTools trace, or controlled browser test to investigate that action. Keep device constraints and fixtures stable. After fixing the proven bottleneck, use RUM or Chrome UX Report data to determine whether the affected population improved.

### Why is input delay high when my click handler is fast?

Input delay happens before the handler gets its opportunity to run. The main thread may already be occupied by a long task from hydration, analytics, a timer, rendering, or unrelated application work. Inspect the Performance timeline immediately before the event marker and identify what prevented dispatch. If the blocking task is third-party code, test its loading and execution policy. If it is first-party work, reduce, move, or yield that work. Optimizing the click callback alone will not remove a queue that exists before it.

### Should an end-to-end test fail whenever measured INP exceeds 200 milliseconds?

Usually not from one sample on a shared CI runner. The 200 millisecond threshold is a user-experience boundary, while lab timings include machine and scheduling noise. Build a controlled journey, run multiple samples, use a fixture representative of the problem, and set a lab budget with enough margin to catch material regressions. Treat trace artifacts as evidence when the check fails. Use field p75 as the population-level release signal, and keep functional assertions so a scheduling shortcut cannot pass while breaking the interaction.

### What is the first trace detail to include in an INP bug report?

Include the interaction name and its phase breakdown: input delay, processing duration, and presentation delay. Add the route, fixture size, device or CPU constraint, browser build, application build, and a saved trace. Then name the dominant owned task or rendering event with its duration. This compact evidence tells reviewers whether the delay begins before the handler, inside application processing, or while preparing the frame. It also makes the proposed fix testable because the next trace should reduce the predicted phase rather than merely change an aggregate score.
`,
};
