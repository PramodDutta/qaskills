import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Core Web Vitals Testing: LCP, INP & CLS Automation (2026)',
  description:
    'Core Web Vitals testing guide for 2026 — automate LCP, INP and CLS measurement with the web-vitals library, Lighthouse CI, Playwright and the CrUX API.',
  date: '2026-06-26',
  category: 'Performance',
  content: `# Core Web Vitals Testing: LCP, INP & CLS Automation (2026)

Core Web Vitals testing means measuring three field-anchored metrics — **Largest Contentful Paint (LCP)**, **Interaction to Next Paint (INP)**, and **Cumulative Layout Shift (CLS)** — and failing your pipeline when a release regresses them. You collect them two ways: **lab** (synthetic, reproducible runs via Lighthouse or Playwright) and **field** (real-user data from the \`web-vitals\` JavaScript library and the Chrome UX Report). This guide shows the exact APIs, flags, and CI wiring to automate all three, plus the "good / needs improvement / poor" thresholds Google publishes, so you can gate pull requests on performance instead of discovering regressions after they ship.

A quick reality check before any code: Google updates the Core Web Vitals metric set and its thresholds over time — INP replaced First Input Delay (FID) as a Core Web Vital in March 2024, for example. Always confirm the current metric list and threshold values against the official \`web.dev/vitals\` reference for the date you read this, and pin the tool versions you install so your numbers stay reproducible.

## The Three Core Web Vitals and Their Thresholds

Each metric is assessed at the **75th percentile** of page loads across mobile and desktop. A page passes the assessment only when all three metrics are in the "good" band at that percentile — one poor metric fails the whole page.

| Metric | What it measures | Good | Needs improvement | Poor |
|---|---|---|---|---|
| **LCP** | Time until the largest content element renders | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| **INP** | Latency from interaction to the next painted frame | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| **CLS** | Sum of unexpected layout shift scores (unitless) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

Three supporting diagnostics show up constantly in tooling and are worth knowing even though they are not themselves Core Web Vitals: **TTFB** (Time to First Byte), **FCP** (First Contentful Paint), and the deprecated **FID** (First Input Delay), which INP superseded. The \`web-vitals\` library still exposes \`onTTFB\` and \`onFCP\` because they help you explain *why* LCP or INP is slow.

## Field Measurement with the web-vitals Library

The canonical way to capture real-user vitals in the browser is Google's \`web-vitals\` library. It wraps the underlying \`PerformanceObserver\` entries and emits a value the moment each metric is final. INP and CLS are only final at page lifecycle end, so the library reports them on visibility change or \`pagehide\`.

\`\`\`bash
npm install web-vitals
\`\`\`

\`\`\`js
// rum.js — load this on every page
import { onLCP, onINP, onCLS, onTTFB, onFCP } from 'web-vitals';

function sendToAnalytics(metric) {
  // metric = { name, value, rating, delta, id, navigationType }
  const body = JSON.stringify(metric);

  // navigator.sendBeacon survives the unload that finalizes INP/CLS
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/analytics', body);
  } else {
    fetch('/analytics', { body, method: 'POST', keepalive: true });
  }
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onTTFB(sendToAnalytics);
onFCP(sendToAnalytics);
\`\`\`

Each callback receives a \`Metric\` object whose \`rating\` is already bucketed as \`'good' | 'needs-improvement' | 'poor'\` using the thresholds above — you do not recompute the bands yourself. The \`delta\` field lets you send incremental updates (CLS, for instance, can grow over a session). Use \`id\` to deduplicate multiple reports for the same page load on the server.

### The Attribution Build for Debugging

Knowing INP is 480 ms is useless without knowing *which element* and *which phase* caused it. The \`web-vitals/attribution\` entry point returns the same metrics with an \`attribution\` payload that pinpoints the culprit.

\`\`\`js
import { onINP, onLCP } from 'web-vitals/attribution';

onINP((metric) => {
  const a = metric.attribution;
  console.log('INP target:', a.interactionTarget);     // e.g. "button#buy"
  console.log('Input delay:', a.inputDelay);           // queueing time (ms)
  console.log('Processing duration:', a.processingDuration);
  console.log('Presentation delay:', a.presentationDelay);
});

onLCP((metric) => {
  const a = metric.attribution;
  console.log('LCP element:', a.element);              // CSS selector of the LCP node
  console.log('Resource load delay:', a.resourceLoadDelay);
  console.log('Element render delay:', a.elementRenderDelay);
});
\`\`\`

INP attribution splits the total into **input delay**, **processing duration**, and **presentation delay** — that breakdown tells you whether the fix is reducing main-thread contention, trimming an event handler, or cutting rendering work. This is the single most useful upgrade you can make to a RUM setup, and it ships in the same package. If you are wiring vitals into an end-to-end suite, the [Playwright locator best practices guide](/blog/playwright-locators-best-practices-2026) pairs well with the synthetic approach below.

## Lab Measurement with Lighthouse

Lighthouse is the reproducible, synthetic side of the story. It runs the page under simulated throttling and reports lab proxies for the vitals. **The critical caveat: Lighthouse cannot measure INP at all** — INP requires real interactions over a session, so lab tooling reports **Total Blocking Time (TBT)** as its interactivity proxy instead. LCP and CLS *are* measured directly in the lab.

\`\`\`bash
# One-off run, JSON output you can assert on in a script
npx lighthouse https://example.com \\
  --only-categories=performance \\
  --output=json \\
  --output-path=./lh.json \\
  --chrome-flags="--headless=new"
\`\`\`

The metric values live under \`audits\` in the JSON. The numeric value of each metric is in \`numericValue\` (milliseconds for timings, unitless for CLS):

\`\`\`json
{
  "audits": {
    "largest-contentful-paint": { "numericValue": 2310.4, "score": 0.92 },
    "cumulative-layout-shift":  { "numericValue": 0.04,   "score": 1.0 },
    "total-blocking-time":      { "numericValue": 180,    "score": 0.88 }
  }
}
\`\`\`

A small Node script can read \`lh.json\` and exit non-zero when \`largest-contentful-paint.numericValue\` exceeds 2500 — that alone gives you a lab gate. But you rarely want to hand-roll the assertion layer when Lighthouse CI does it for you.

### Gating CI with Lighthouse CI

\`@lhci/cli\` runs Lighthouse N times per URL, takes the median, and asserts against budgets you declare in \`lighthouserc.js\`. It exits non-zero on a breach, which is exactly what a CI step needs.

\`\`\`bash
npm install -D @lhci/cli
\`\`\`

\`\`\`js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      numberOfRuns: 5, // median of 5 runs reduces lab variance
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift':  ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time':      ['error', { maxNumericValue: 200 }],
        'categories:performance':   ['warn',  { minScore: 0.9 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
\`\`\`

\`\`\`bash
# CI step
npx lhci autorun
\`\`\`

Running five times and taking the median is the cheapest defense against lab flakiness — a single Lighthouse run can swing several hundred milliseconds on shared CI runners. For a deeper treatment of budgets, assertion levels, and result storage, see the dedicated [Lighthouse CI performance budgets guide](/blog/lighthouse-ci-performance-budgets-guide-2026).

## Lab Measurement with Playwright and PerformanceObserver

When you already own a Playwright suite, you can read LCP and CLS straight from the browser's performance entries without adding Lighthouse — useful for asserting vitals on authenticated or interaction-heavy flows that Lighthouse cannot reach. You inject a \`PerformanceObserver\` for the buffered entries.

\`\`\`ts
// vitals.spec.ts
import { test, expect } from '@playwright/test';

test('home page LCP and CLS stay within budget', async ({ page }) => {
  await page.goto('https://example.com');

  const vitals = await page.evaluate(() => {
    return new Promise<{ lcp: number; cls: number }>((resolve) => {
      let lcp = 0;
      let cls = 0;

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        lcp = entries[entries.length - 1].startTime; // last LCP candidate wins
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          // ignore shifts that follow recent user input
          if (!(entry as any).hadRecentInput) cls += (entry as any).value;
        }
      }).observe({ type: 'layout-shift', buffered: true });

      // give the page a moment to settle, then report
      setTimeout(() => resolve({ lcp, cls }), 3000);
    });
  });

  expect(vitals.lcp).toBeLessThan(2500);
  expect(vitals.cls).toBeLessThan(0.1);
});
\`\`\`

Two details matter for correctness. First, the **last** \`largest-contentful-paint\` entry is the real LCP — the browser emits a new candidate each time a larger element paints, so you take the final one. Second, layout-shift entries carry a \`hadRecentInput\` flag; CLS deliberately *excludes* shifts within 500 ms of a user interaction, so you must filter those out or your CLS will be inflated by legitimate, user-triggered movement. To approximate INP in Playwright you would script a real click and measure the time to the next frame, but treat that as a smoke signal, not a substitute for field INP.

## Field Data at Scale: The CrUX API

The Chrome UX Report (CrUX) is Google's public dataset of *real* Chrome user measurements, aggregated at the 75th percentile — the same data that feeds Search ranking signals. The CrUX API lets you pull a URL's or origin's field vitals in CI without instrumenting a single user yourself. You need a Google API key.

\`\`\`bash
curl -s "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$CRUX_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "url": "https://example.com/",
    "metrics": ["largest_contentful_paint", "interaction_to_next_paint", "cumulative_layout_shift"]
  }'
\`\`\`

The response gives you each metric's \`percentiles.p75\` plus a histogram of the good/needs-improvement/poor distribution. Because CrUX requires a URL to have enough traffic to be in the dataset, it returns a \`404\` for low-traffic pages — handle that gracefully and fall back to lab data. CrUX is the only source that reflects your actual users' devices and networks, so it is the metric of record for "did this page pass," while Lighthouse and Playwright tell you *why* in a controlled environment.

## A Practical Layered Strategy

No single tool covers everything. The robust setup layers them so each compensates for the others' blind spots.

| Layer | Tool | Measures | Catches |
|---|---|---|---|
| Pre-merge gate | Lighthouse CI | LCP, CLS, TBT | Regressions before they ship |
| Flow-specific lab | Playwright + PerformanceObserver | LCP, CLS | Vitals on authed / interactive pages |
| Real-user monitoring | \`web-vitals\` (attribution) | LCP, INP, CLS | What real users actually feel + culprit element |
| Field source of truth | CrUX API | LCP, INP, CLS (p75) | The pass/fail Google's ranking uses |

Run Lighthouse CI on every pull request as a hard gate, ship the \`web-vitals\` attribution build to production for continuous INP visibility, and poll CrUX weekly to confirm field numbers track your lab numbers. When a metric drifts, attribution tells you the element and the phase, and Lighthouse reproduces it deterministically so you can verify the fix. Browse the [QA skills directory](/skills) for ready-made Playwright, Lighthouse, and RUM skills that drop these checks into an AI coding agent's workflow.

## Frequently Asked Questions

### Why can't Lighthouse measure INP?

INP is a field metric: it summarizes the latency of *all* a user's interactions across an entire page visit and reports a high percentile of them. Lighthouse runs a single synthetic load with no real interaction stream, so there is nothing to aggregate. Lighthouse reports **Total Blocking Time (TBT)** instead, which correlates with INP because both are driven by main-thread blocking, but TBT is a proxy — only the \`web-vitals\` library or CrUX gives you a true INP value.

### What's the difference between lab and field Core Web Vitals data?

Lab data comes from synthetic, controlled runs (Lighthouse, Playwright) on a fixed device profile and throttled network, so it is reproducible and great for catching regressions in CI. Field data comes from real users on their own devices and networks (the \`web-vitals\` library and CrUX), aggregated at the 75th percentile, and it is what Google actually uses for the page experience signal. You need both: lab to debug deterministically, field to know whether real users are happy.

### Which percentile should I gate on?

Google assesses Core Web Vitals at the **75th percentile** of page loads, so that is the number that determines whether a URL passes. In CI lab gating you typically assert on a single median run rather than a percentile, because a synthetic run is not a distribution. The percentile only becomes meaningful once you have many real-user samples, which is why CrUX and your RUM pipeline report p75 while Lighthouse CI reports a median of N runs.

### How do I stop layout shifts from user interactions inflating CLS?

CLS is designed to exclude shifts that happen within 500 ms of a user input, and the browser marks those \`layout-shift\` entries with \`hadRecentInput: true\`. If you compute CLS yourself from \`PerformanceObserver\` entries, you must skip any entry where \`hadRecentInput\` is true — otherwise legitimate movement like opening an accordion counts against you. The \`web-vitals\` library and Lighthouse handle this filtering automatically, so prefer them over hand-rolled math.

### Do I need the web-vitals attribution build in production?

Yes, if you want actionable RUM. The standard build tells you a metric is poor; the attribution build tells you *which element and which phase* caused it — for INP that is the target selector plus the input-delay / processing / presentation breakdown. The attribution data adds a small payload to each report but turns "INP is 450 ms somewhere" into "the buy button's click handler spent 300 ms processing," which is the difference between a fix and a guess.

### Can I compare performance testing tools to pick a CI gate?

For load and throughput testing the tooling choice is separate from vitals; for example, the [k6 vs JMeter comparison](/compare/k6-vs-jmeter) covers backend performance gates, while Lighthouse CI and the \`web-vitals\` library cover front-end Core Web Vitals. In practice you run both kinds of gate: a load tool to protect server latency (which feeds TTFB and therefore LCP) and a vitals tool to protect the rendered experience. They answer different questions and belong in different CI stages.
`,
};
