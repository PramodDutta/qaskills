import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Puppeteer Performance Tracing Guide',
  description:
    'Use Puppeteer performance tracing to capture Chrome traces, inspect Web Vitals, and turn page speed regressions into repeatable CI evidence.',
  date: '2026-07-10',
  category: 'Performance',
  content: `
# Puppeteer Performance Tracing Guide

A checkout page can feel instant in a Puppeteer smoke test and still ship a 900 ms main-thread stall. The browser clicked the button, the assertion passed, and the user paid the cost later when a promotion banner, consent manager, and analytics bundle all fought for the same CPU slice. Chrome already records that story in trace events. Puppeteer gives you a programmable way to collect the evidence.

Performance tracing with Puppeteer is not a replacement for field data, Lighthouse, or production monitoring. It is a lab instrument. You use it when you need a repeatable browser session, a known viewport, a controlled interaction, and a trace artifact that engineers can inspect in Chrome DevTools. For QA teams, that makes it useful in three places: profiling a risky flow before release, creating a regression guard around a known slowdown, and capturing enough detail to make a performance bug actionable.

The important habit is to treat a trace as diagnostic data first and a pass/fail signal second. A raw trace is too detailed to become a stable test by itself. The reliable pattern is to collect the trace, extract a small number of meaningful measurements, and keep the full trace as evidence when a threshold fails.

This guide focuses on Puppeteer because many teams already use it for Chrome automation, PDF generation, scraping checks, or targeted browser probes. If you are deciding whether a broader test runner would fit your team better, compare the tradeoffs in [Playwright vs Puppeteer in 2026](/blog/playwright-vs-puppeteer-2026-deep-dive). For a wider performance strategy that includes load, synthetic, and monitoring layers, keep [the complete performance testing guide](/blog/performance-testing-complete-guide) nearby.

## What Chrome trace gives you that page timing does not

Navigation timing tells you when milestones happened. A trace tells you what the browser was doing between those milestones. That distinction matters when a page misses its target by 300 ms and every owner sees a different explanation.

Chrome trace data can show JavaScript tasks, style recalculation, layout, paint, screenshots, CPU slices, network activity, and user timing marks. Puppeteer starts and stops the trace around the section you care about, then writes a JSON artifact. You can open that artifact in Chrome DevTools Performance panel or process it in your own script.

| Signal | What it can reveal | Why QA should care |
|---|---|---|
| Main-thread task duration | Long JavaScript execution, parser work, layout, paint | Explains interaction delay and jank that simple assertions miss |
| User Timing marks | App-specific phases such as cart hydration or search render | Lets teams measure business flows instead of only browser milestones |
| Screenshot frames | Visual progress during load or interaction | Helps reviewers see blank screens, late hero content, or spinner stalls |
| Network records | Request timing and transfer cost visible during the trace window | Connects frontend delay with slow APIs or oversized assets |
| Layout and paint events | Expensive style recalculation, layout shifts, repaint bursts | Identifies UI changes that look correct but cost too much |

The trace is especially useful when a failure is intermittent. If a route occasionally has a long task after hydration, a trace captures the timing context. A normal end-to-end failure might only say that a locator was not ready soon enough.

## Starting a trace around one expensive journey

Puppeteer exposes tracing through page.tracing. The core API is small: start tracing, run browser actions, stop tracing. The options matter. The categories decide which event streams Chrome records. The path decides where the artifact is written. Screenshots make the trace larger, but they are useful when debugging perceived performance.

\`\`\`ts
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const tracePath = path.resolve('artifacts', 'checkout-trace.json');

async function traceCheckout() {
  await fs.mkdir(path.dirname(tracePath), { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });

  await page.tracing.start({
    path: tracePath,
    screenshots: true,
    categories: [
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'v8.execute',
      'blink.user_timing',
      'loading',
    ],
  });

  await page.goto('https://shop.example.test/cart', { waitUntil: 'networkidle0' });
  await page.click('[data-testid="checkout"]');
  await page.waitForSelector('[data-testid="payment-form"]', { visible: true });

  await page.tracing.stop();
  await browser.close();

  console.log('Trace written to ' + tracePath);
}

traceCheckout().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

The scenario is intentionally narrow. Do not trace an entire suite. Trace the journey that has a known risk: checkout rendering after cart data loads, document preview generation, search result hydration, dashboard filter application, or another flow where performance changes without functional breakage.

Use a stable environment. CPU throttling is tempting, but it can make CI noise worse unless the machines are well controlled. If the test runs in a shared CI runner, keep thresholds loose and use traces primarily as artifacts. If it runs on a dedicated performance worker, you can enforce tighter budgets.

## Marking application phases before tracing

Browser-level events are useful, but business systems need names that product teams recognize. Add User Timing marks in the application code or through page.evaluate during the test. Chrome trace includes blink.user_timing events, so those marks appear alongside browser work.

For example, a checkout app can mark when the shell is visible, when cart totals are calculated, and when the payment form is interactive. The trace then answers a better question than "was the page slow?" It shows whether the delay is before cart data, during rendering, or after the user clicks checkout.

| Mark name | Place it near | Common defect exposed |
|---|---|---|
| checkout:shell-visible | First stable checkout container render | Client bundle or route transition regression |
| checkout:cart-ready | Cart API response has updated totals in UI | Slow totals service, bad caching, repeated fetch |
| checkout:payment-ready | Card fields are visible and enabled | Third-party script delay, validation bundle cost |
| checkout:submit-clicked | Immediately before user action | Separates pre-action cost from post-action handling |
| checkout:confirmation-visible | Receipt state appears | Captures payment confirmation delay after submit |

If you cannot modify application code, inject marks from Puppeteer at known boundaries. They will not be as precise as app-owned marks, but they still help frame the trace.

\`\`\`ts
import puppeteer from 'puppeteer';

async function collectMarkedSearchTrace() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.tracing.start({
    path: 'artifacts/search-filter-trace.json',
    screenshots: false,
    categories: ['devtools.timeline', 'blink.user_timing', 'loading'],
  });

  await page.goto('https://app.example.test/search', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => performance.mark('qa:search-page-dom-ready'));

  await page.type('#query', 'wireless keyboard');
  await page.evaluate(() => performance.mark('qa:query-typed'));

  await page.click('[data-testid="apply-filters"]');
  await page.waitForSelector('[data-testid="result-card"]');
  await page.evaluate(() => performance.mark('qa:first-result-visible'));

  await page.tracing.stop();
  await browser.close();
}

collectMarkedSearchTrace();
\`\`\`

That snippet avoids a test-runner assertion because the goal is profiling, not pass/fail execution. In a real test, wrap the sequence with assertions so a missing selector fails clearly before you analyze trace timing. Also note that Puppeteer uses page.type for typing. If you see examples using page.fill, that belongs to Playwright, not Puppeteer.

## Extracting a usable metric from trace JSON

A trace file is a JSON document with traceEvents. Many teams stop at opening the file manually, which is useful during investigation but weak for regression control. For automation, extract a narrow metric. Long task time is a practical example because main-thread stalls are visible in trace events and correlate with sluggish interactions.

Chrome trace event names and categories can vary across versions, so keep the parser defensive. Do not build a fragile parser around one exact event from one local Chrome version and then treat it as universal. For CI, parse the specific signals you have validated against your own traces.

\`\`\`ts
import fs from 'node:fs/promises';

type TraceEvent = {
  name?: string;
  cat?: string;
  ph?: string;
  dur?: number;
  ts?: number;
};

type TraceFile = {
  traceEvents?: TraceEvent[];
};

async function summarizeLongTasks(traceFile: string) {
  const raw = await fs.readFile(traceFile, 'utf8');
  const parsed = JSON.parse(raw) as TraceFile;
  const events = parsed.traceEvents ?? [];

  const tasks = events
    .filter((event) => event.name === 'RunTask' && event.ph === 'X' && typeof event.dur === 'number')
    .map((event) => ({
      startMs: Math.round((event.ts ?? 0) / 1000),
      durationMs: Math.round((event.dur ?? 0) / 1000),
    }))
    .filter((task) => task.durationMs >= 50)
    .sort((a, b) => b.durationMs - a.durationMs);

  const totalLongTaskMs = tasks.reduce((sum, task) => sum + task.durationMs, 0);

  return {
    count: tasks.length,
    totalLongTaskMs,
    worst: tasks.slice(0, 5),
  };
}

summarizeLongTasks('artifacts/checkout-trace.json').then((summary) => {
  console.log(JSON.stringify(summary, null, 2));
});
\`\`\`

The 50 ms boundary follows the common long-task concept, but the exact threshold you enforce should reflect the journey and the hardware. A search page with heavy rendering may need a different budget than a static content page. The important part is consistency. Same journey, same viewport, same environment, same parser, and an artifact when the number moves.

## Measuring Web Vitals in the same Puppeteer session

Trace events are detailed, but Web Vitals are easier to communicate. Puppeteer can run browser-side JavaScript, so you can collect values from the PerformanceObserver API or from a small helper package in your test bundle. For lab checks, Largest Contentful Paint and Cumulative Layout Shift are often the first two to capture. Interaction to Next Paint is harder to measure in short automation because it depends on a real interaction and observer support.

Use Web Vitals as a companion signal, not as a substitute for trace analysis. When LCP regresses, the trace explains why. When the trace shows a long task but LCP stays stable, the issue may be interaction responsiveness rather than load.

\`\`\`ts
import puppeteer from 'puppeteer';

async function readVitals() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    window.__qaVitals = { cls: 0, lcp: 0 };

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        window.__qaVitals.lcp = entry.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__qaVitals.cls += entry.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto('https://app.example.test/product/sku-123', { waitUntil: 'networkidle0' });

  const vitals = await page.evaluate(() => window.__qaVitals);
  await browser.close();

  console.log(vitals);
}

readVitals();
\`\`\`

In TypeScript, you would add a global window declaration for __qaVitals in a test support file. The example keeps the measurement visible in one place. It also avoids pretending that lab Web Vitals are field Web Vitals. Lab values are useful for catching code changes under controlled conditions. Field values decide whether real users improved.

## Choosing what to automate and what to inspect manually

Puppeteer tracing becomes noisy when every trace becomes a gate. A mature setup separates artifacts from assertions.

| Use case | Automate threshold? | Keep trace artifact? | Practical note |
|---|---:|---:|---|
| Known regression after a fix | Yes | Yes | Budget the exact flow that failed before |
| Release profiling for a new page | Usually no | Yes | Compare traces across builds before deciding budgets |
| Third-party script investigation | No | Yes | Trace helps isolate blocking work, but vendors add variance |
| Core checkout or login journey | Yes, with generous limits | Yes | Fail only on clear movement, not tiny timing drift |
| Local developer debugging | No | Optional | Manual DevTools inspection is faster than CI loops |

The biggest mistake is copying Lighthouse thresholds into Puppeteer tests without checking variance. A hard LCP threshold that fails one in ten runs will be ignored quickly. Start by collecting ten to twenty traces on the target environment, calculate a practical baseline, then set a threshold that catches meaningful movement.

## Reading the trace without drowning in events

When you open the JSON file in DevTools Performance, start with the visual timeline. Look for large blank areas, long yellow scripting blocks, repeated layout work, and late network responses. Then correlate those with your User Timing marks. The marks turn a browser timeline into a product timeline.

For a frontend regression, I usually inspect in this order:

1. Is the delay before the first useful content, after content, or after a click?
2. Are long tasks clustered around hydration, state updates, or third-party scripts?
3. Does the network panel show a slow API that forced the browser to wait?
4. Are screenshots showing a blank shell, a spinner, or visible content that is not interactive?
5. Did a new layout or animation create repeated style and paint work?

That order keeps the conversation grounded. Instead of "the page is slow", you can say "the payment form waits 420 ms after cart totals are visible because a third-party script creates a long task before the iframe is ready." Developers can act on that.

## CI storage and failure reporting

Trace files can be large. Store them only on failure or for selected scheduled profiling jobs. If every pull request uploads every trace, artifact storage gets expensive and reviewers stop opening the files.

A practical CI pattern is:

1. Run the focused Puppeteer scenario.
2. Write the trace to a known artifacts folder.
3. Parse one or two metrics.
4. Fail only when a metric crosses a meaningful threshold.
5. Upload the trace and metric summary when the test fails.

Do not hide the full trace behind a custom dashboard too early. Chrome DevTools already understands the format. A small JSON summary plus the trace file is enough for most teams.

## Common Puppeteer tracing traps

Puppeteer performance tests often fail for reasons unrelated to the application. Headless Chrome version changes can move trace details. Shared CI runners create timing noise. Waiting for network idle can hide late client work or wait too long on analytics. Screenshots increase trace size. Service workers and caches can make local runs faster than fresh-user runs.

Control what you can. Create a fresh browser context when state matters. Use deterministic test data. Disable or isolate third-party calls when the objective is application code. Keep a separate test when the objective is the third-party integration itself.

Also be careful with selectors during performance profiling. If a selector waits for a late element, your trace window may include more than the target interaction. Sometimes that is correct. Sometimes you need a mark immediately before the action and another mark immediately after the target UI state appears, then measure between those marks.

## Frequently Asked Questions

### Should Puppeteer tracing replace Lighthouse in CI?

No. Lighthouse audits a page through a broader scoring model and offers recommendations. Puppeteer tracing is better when you need to profile a specific scripted journey, such as filtering a dashboard or opening a payment form. Many teams use Lighthouse for page-level budgets and Puppeteer traces for interaction-level investigations.

### Which trace categories should I start with?

Start with devtools.timeline, disabled-by-default-devtools.timeline, blink.user_timing, loading, and v8.execute. Add more only when you know what you need. Extra categories increase file size and parsing work.

### Can I compare trace files from different Chrome versions?

You can compare broad behavior, but avoid strict automated comparisons across Chrome versions. Event names, categories, and timing behavior can shift. Keep CI Chrome stable when enforcing budgets.

### Why does my Puppeteer performance test pass locally and fail in CI?

The usual causes are CPU contention, different Chrome builds, different network path, missing cache state, or running inside a constrained container. Collect several CI samples before setting thresholds, and upload the trace on failure so you can distinguish app regressions from environment noise.

### What should I attach to a performance bug?

Attach the trace JSON, the metric summary, the Puppeteer script or test name, the environment details, and the exact commit or build. Include the User Timing marks or screenshots that show where the user-visible delay happened.
`,
};
