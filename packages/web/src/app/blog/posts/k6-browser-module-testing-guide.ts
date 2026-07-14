import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'k6 Browser Module: Frontend Performance Testing Guide',
  description:
    'Learn the k6 browser module for real browser-level performance testing. Capture Web Vitals (LCP, CLS, INP), run hybrid load tests, set thresholds, and avoid pitfalls.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# k6 Browser Module: The Complete Frontend Performance Testing Guide

Protocol-level load testing answers one question very well: can your servers handle the traffic? You fire thousands of HTTP requests, watch response times, and confirm the API tier holds up under pressure. But that number — the time your backend takes to return a JSON payload — tells you almost nothing about what a real user actually experiences in their browser. A 90ms API response can still produce a page that feels broken: a layout that jumps around while fonts load, a hero image that arrives two seconds late, a button that does not respond to taps because the main thread is blocked parsing JavaScript. Those are frontend bottlenecks, and a classic protocol-level k6 script is completely blind to them.

The k6 browser module closes that gap. It is a module bundled into Grafana k6 that spins up a real Chromium browser, drives it with a Playwright-inspired API, and measures the metrics that correspond to genuine user experience: Largest Contentful Paint, Cumulative Layout Shift, Interaction to Next Paint, and friends. Instead of asking "how fast is the endpoint," it asks "how fast does the page become usable for a person." Even better, because it lives inside k6, you can mix browser virtual users (VUs) and protocol VUs in the same script — a hybrid load test where a handful of real browsers measure frontend quality while a flood of cheap protocol requests generates realistic backend load. This guide walks through setup, the core API, capturing Web Vitals, hybrid tests, thresholds, CI considerations, and the pitfalls that bite newcomers. If you already test the backend with k6, this is the missing half of the picture. If you are weighing options, our [k6 vs JMeter comparison](/blog/k6-vs-jmeter-2026) covers the broader landscape.

## What the k6 Browser Module Actually Is

The browser module ships as part of the main k6 binary — there is no separate install, no plugin to compile. You import it from \`k6/browser\` and it controls a Chromium instance via the Chrome DevTools Protocol. The API deliberately mirrors Playwright: pages, contexts, locators, \`waitFor\`, and auto-waiting all feel familiar if you have written Playwright tests. The difference is the runtime. Where Playwright is a functional end-to-end testing tool, k6 wraps that browser automation in its load-generation engine, so you get aggregated metrics, thresholds, ramping stages, and the ability to run many browser sessions concurrently as part of a performance test.

A critical design decision: every browser API call is asynchronous and returns a Promise. You must \`await\` them. This is the single biggest source of confusion for people coming from synchronous k6 protocol scripts, and we will return to it repeatedly.

## Installation and a First Browser Test

Install k6 the usual way (Homebrew, the official apt/yum repos, the Windows installer, or Docker). Confirm your version supports the stable browser module — anything reasonably current does.

\`\`\`bash
# macOS
brew install k6

# Verify
k6 version

# Run a browser script (browser tests need a real Chromium;
# k6 will use a bundled/installed Chromium automatically)
k6 run browser-test.js
\`\`\`

Here is the smallest meaningful browser test. Note the scenario configuration — browser tests require a scenario with the browser \`type\` set to \`chromium\`.

\`\`\`javascript
import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://quickpizza.grafana.com/', {
      waitUntil: 'networkidle',
    });

    const title = await page.locator('h1').textContent();
    check(title, {
      'heading is present': (t) => t != null && t.length > 0,
    });
  } finally {
    await page.close();
  }
}
\`\`\`

Three things are doing heavy lifting here. The \`options.scenarios.ui.options.browser.type\` field tells k6 this scenario drives a browser. The \`async function\` plus \`await\` everywhere is mandatory. And the \`try/finally\` with \`page.close()\` ensures you do not leak browser pages between iterations — leaked pages are a common cause of memory blowups in long runs.

## Scenarios, Executors, and Browser Options

The \`scenarios\` block is where you control load shape. Browser scenarios use the same executors as protocol scenarios — \`shared-iterations\`, \`per-vu-iterations\`, \`constant-vus\`, \`ramping-vus\`, and so on — but each scenario that uses a browser must declare \`options.browser.type: 'chromium'\`. A ramping browser test looks like this:

\`\`\`javascript
export const options = {
  scenarios: {
    browser_ui: {
      executor: 'ramping-vus',
      exec: 'browserFlow',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '20s', target: 0 },
      ],
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

export async function browserFlow() {
  const page = await browser.newPage();
  try {
    await page.goto('https://quickpizza.grafana.com/');
    await page.locator('button[name="pizza-please"]').click();
    await page.locator('div[data-test="recommendations"]').waitFor();
  } finally {
    await page.close();
  }
}
\`\`\`

A few notes. \`browser.newPage()\` is a convenience that creates a context and a page in one call; use \`browser.newContext()\` when you want an isolated session (its own cookies, storage, and permissions) per VU or per iteration. The \`exec\` field names the exported function the scenario runs, which lets one file hold several scenarios pointing at different functions — essential for hybrid tests later.

## Navigating Pages: goto and waitUntil

\`page.goto(url, options)\` loads a URL and returns when the chosen lifecycle event fires. The \`waitUntil\` option is the lever that decides "loaded enough":

\`\`\`javascript
// Resolve as soon as the DOM is parsed (fastest, least complete)
await page.goto('https://example.com/', { waitUntil: 'domcontentloaded' });

// Resolve on the window 'load' event (default)
await page.goto('https://example.com/', { waitUntil: 'load' });

// Resolve when network has been idle for ~500ms (best for SPAs / async data)
await page.goto('https://example.com/', { waitUntil: 'networkidle' });
\`\`\`

For single-page apps that fetch content after the initial document, \`networkidle\` gives the most realistic "page is actually ready" signal, though it is the slowest. For server-rendered pages, \`load\` is usually enough. Choosing the right value matters because Web Vitals like LCP are measured against the real paint timeline, and a too-early resolution can cut your measurement short.

## The Locator API: Finding and Acting on Elements

Locators are the heart of browser interaction. \`page.locator(selector)\` returns a lazy handle — it does not query the DOM until you act on it, and it auto-waits for the element to be actionable (visible, enabled, stable) before clicking or typing. This auto-waiting eliminates most of the flaky \`sleep\` calls that plague naive scripts.

\`\`\`javascript
export async function interactionFlow() {
  const page = await browser.newPage();
  try {
    await page.goto('https://quickpizza.grafana.com/', { waitUntil: 'load' });

    // Click — auto-waits for the element to be clickable
    await page.locator('button[name="pizza-please"]').click();

    // Type into an input
    await page.locator('#customer-name').type('Load Test User');

    // Wait for an element to appear / reach a state
    await page.locator('div[data-test="recommendations"]').waitFor({
      state: 'visible',
    });

    // Read text back for an assertion
    const recommendation = await page
      .locator('div[data-test="pizza-name"]')
      .textContent();

    check(recommendation, {
      'a pizza was recommended': (r) => r !== null && r.length > 3,
    });
  } finally {
    await page.close();
  }
}
\`\`\`

Common locator methods include \`.click()\`, \`.type(text)\`, \`.fill(text)\` (clears then sets value), \`.textContent()\`, \`.getAttribute(name)\`, \`.isVisible()\`, \`.isEnabled()\`, and \`.waitFor(options)\`. The \`waitFor\` states are \`attached\`, \`detached\`, \`visible\`, and \`hidden\`. Prefer stable selectors — \`data-test\` attributes, ARIA roles, or IDs — over brittle CSS chains. If you already write Playwright tests, this is exactly the muscle memory from our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide).

## Assertions with check

k6's \`check\` from the core \`k6\` module is how you express functional assertions inside a performance test. Unlike a failing assertion in a unit test, a failed \`check\` does not stop the iteration — it records a pass/fail rate you can later gate with a threshold. This is intentional: under load you want to keep measuring, then judge the aggregate.

\`\`\`javascript
import { check } from 'k6';

// ...
const ok = check(page, {
  'logged in': async (p) =>
    (await p.locator('[data-test="user-menu"]').isVisible()) === true,
});

if (!ok) {
  // optionally branch your flow when a critical step failed
}
\`\`\`

Because browser calls are async, the predicate functions inside \`check\` can be async and awaited. Keep checks meaningful — a check that always passes adds noise without value.

## Capturing Web Vitals and Browser Metrics

This is the payoff. When a browser scenario runs, k6 automatically emits frontend performance metrics, including the Core Web Vitals. You do not have to instrument anything — load the page, interact, and the metrics appear in the end-of-test summary. The key metric names are prefixed \`browser_web_vital_\`:

| Metric | What it measures | Good target |
|---|---|---|
| \`browser_web_vital_lcp\` | Largest Contentful Paint — when the main content renders | < 2500 ms |
| \`browser_web_vital_fid\` | First Input Delay — delay before first interaction is handled | < 100 ms |
| \`browser_web_vital_cls\` | Cumulative Layout Shift — visual stability (unitless) | < 0.1 |
| \`browser_web_vital_inp\` | Interaction to Next Paint — responsiveness across the session | < 200 ms |
| \`browser_web_vital_fcp\` | First Contentful Paint — first pixel of content | < 1800 ms |
| \`browser_web_vital_ttfb\` | Time To First Byte — server + network latency | < 800 ms |

INP has effectively replaced FID as the responsiveness metric in the Core Web Vitals, so prioritize \`browser_web_vital_inp\` in new tests, but the module still reports both. A minimal script that produces these metrics needs no extra code beyond navigation and interaction:

\`\`\`javascript
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    vitals: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 5,
      options: { browser: { type: 'chromium' } },
    },
  },
};

export default async function () {
  const page = await browser.newPage();
  try {
    // LCP, FCP, TTFB, CLS captured automatically during navigation
    await page.goto('https://quickpizza.grafana.com/', {
      waitUntil: 'networkidle',
    });

    // Interactions feed INP / FID
    await page.locator('button[name="pizza-please"]').click();
    await page.locator('div[data-test="recommendations"]').waitFor();
  } finally {
    await page.close();
  }
}
\`\`\`

After the run, the summary shows aggregated values (avg, min, med, max, p90, p95) for each \`browser_web_vital_*\` metric, plus standard browser timing metrics like \`browser_http_req_duration\` and \`browser_http_req_failed\`. You can also export everything to Grafana Cloud, InfluxDB, or Prometheus for trend dashboards.

## Taking Screenshots

Screenshots are invaluable for debugging why a flow failed under load — a half-rendered page or an error banner tells you more than a stack trace. The \`page.screenshot()\` method writes a PNG:

\`\`\`javascript
export default async function () {
  const page = await browser.newPage();
  try {
    await page.goto('https://quickpizza.grafana.com/');
    await page.locator('button[name="pizza-please"]').click();

    // Full element or full page capture
    await page.screenshot({ path: \`screenshots/result-\${__VU}-\${__ITER}.png\` });
  } finally {
    await page.close();
  }
}
\`\`\`

Use the built-in \`__VU\` and \`__ITER\` variables to make filenames unique so concurrent VUs do not overwrite each other. Be sparing: writing a screenshot every iteration in a heavy run produces a flood of files and adds I/O overhead. Capture on failure, or sample a small percentage of iterations.

## Hybrid Tests: Protocol VUs and Browser VUs Together

The most powerful pattern the browser module unlocks is the hybrid test. Real browsers are expensive — each one consumes meaningful CPU and memory — so you cannot generate thousands of them on a single machine. But you can run a small number of browser VUs to measure frontend quality while simultaneously running a large pool of cheap protocol VUs to create realistic backend load. The browsers then measure how the frontend behaves while the system is genuinely stressed.

\`\`\`javascript
import http from 'k6/http';
import { browser } from 'k6/browser';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // Cheap protocol load — generate stress on the backend
    api_load: {
      executor: 'ramping-vus',
      exec: 'apiTraffic',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
    // A few real browsers — measure UX under that load
    browser_ux: {
      executor: 'constant-vus',
      exec: 'browserJourney',
      vus: 3,
      duration: '3m',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    browser_web_vital_lcp: ['p(95)<3000'],
    browser_web_vital_cls: ['p(95)<0.1'],
  },
};

export function apiTraffic() {
  const res = http.get('https://quickpizza.grafana.com/api/pizza');
  check(res, { 'api 200': (r) => r.status === 200 });
  sleep(1);
}

export async function browserJourney() {
  const page = await browser.newPage();
  try {
    await page.goto('https://quickpizza.grafana.com/', {
      waitUntil: 'networkidle',
    });
    await page.locator('button[name="pizza-please"]').click();
    await page.locator('div[data-test="recommendations"]').waitFor();
  } finally {
    await page.close();
  }
}
\`\`\`

Two scenarios, two \`exec\` functions, one file. The protocol scenario is synchronous and uses \`http\`; the browser scenario is async and uses \`browser\`. The thresholds block judges both sides at once. This is the realistic shape of a frontend performance test: heavy load from the cheap path, precise UX measurement from the expensive path.

## Thresholds on Browser Web Vital Metrics

Thresholds turn a test into a pass/fail gate — exactly what you want in CI. You set them in \`options.thresholds\`, keyed by metric name with an array of conditions. For browser tests, gate on the Web Vitals:

\`\`\`javascript
export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 2,
      iterations: 10,
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    // 95th percentile LCP under 2.5s
    browser_web_vital_lcp: ['p(95)<2500'],
    // Median INP under 200ms
    browser_web_vital_inp: ['p(50)<200'],
    // 90th percentile CLS under 0.1
    browser_web_vital_cls: ['p(90)<0.1'],
    // No more than 1% of browser requests may fail
    browser_http_req_failed: ['rate<0.01'],
    // Functional checks must pass 99% of the time
    checks: ['rate>0.99'],
  },
};
\`\`\`

When any threshold is breached, k6 exits with a non-zero status code, which fails your CI pipeline automatically. If you want the full mental model of how checks and thresholds interact — including \`abortOnFail\` and delayed abort — see our [k6 thresholds and checks complete guide](/blog/k6-thresholds-checks-complete-guide).

## Headless vs Headful and the K6_BROWSER_HEADLESS Variable

By default the browser module runs headless — no visible window — which is what you want in CI and on servers without a display. During local development it is often useful to watch the browser drive the page so you can see where a flow goes wrong. Control this with the \`K6_BROWSER_HEADLESS\` environment variable:

\`\`\`bash
# Watch the browser locally (headful)
K6_BROWSER_HEADLESS=false k6 run browser-test.js

# Default: headless (CI, servers)
k6 run browser-test.js
\`\`\`

Other useful browser env vars include \`K6_BROWSER_TIMEOUT\` (default navigation/action timeout), \`K6_BROWSER_ARGS\` (extra Chromium launch flags, e.g. \`--no-sandbox\` in containers), and \`K6_BROWSER_DEBUG\` for verbose protocol logging. Headful mode measures slightly differently and costs more resources, so always run your gating tests headless to keep numbers consistent.

## Running and Reading the Output

You run a browser test exactly like any k6 script — \`k6 run script.js\`. The console summary at the end groups metrics. Browser-specific ones are prefixed \`browser_\`, and you will see the Web Vitals alongside HTTP timing and your custom checks. To ship results somewhere durable:

\`\`\`bash
# Local run
k6 run browser-test.js

# Override VUs/iterations from the CLI
k6 run --vus 3 --iterations 30 browser-test.js

# Stream to Grafana Cloud k6
k6 cloud browser-test.js

# Output to other backends
k6 run --out json=results.json browser-test.js
k6 run --out experimental-prometheus-rw browser-test.js
\`\`\`

For trend analysis — is LCP getting worse release over release? — push to a time-series backend and chart the \`browser_web_vital_lcp\` p95 over time. A single run is a snapshot; the value compounds when you track the trend.

## Resource Cost: Browser vs Protocol Tests

The defining tradeoff of the browser module is cost. A protocol VU is a lightweight goroutine making HTTP calls; you can run thousands per machine. A browser VU is a full Chromium tab consuming hundreds of megabytes of RAM and real CPU. Plan capacity accordingly.

| Aspect | Protocol test | Browser test |
|---|---|---|
| Resource per VU | Very low (KBs–MBs) | High (hundreds of MB RAM, CPU) |
| Max VUs / machine | Thousands+ | Single to low double digits |
| What it measures | Server response, throughput | Real UX, Web Vitals, rendering |
| Execution model | Synchronous \`http\` calls | Async \`await\` browser API |
| Best for | Backend capacity, scaling | Frontend quality, regressions |
| Speed to write | Fast | Moderate (selectors, waits) |
| CI cost | Cheap | Expensive (needs Chromium) |

The takeaway: do not try to generate your entire load with browsers. Use the hybrid pattern — many protocol VUs for stress, a few browser VUs for measurement. If you find a Web Vital regressing, you reproduce and debug it with a small headful browser run, not a 100-VU swarm.

## CI Considerations

Running browser tests in CI requires a Chromium binary and enough resources to launch it. In container-based runners you typically need a couple of extra flags and dependencies.

\`\`\`yaml
# GitHub Actions example
jobs:
  browser-perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        run: |
          sudo gpg -k
          sudo apt-get update && sudo apt-get install -y k6
      - name: Run browser performance test
        env:
          K6_BROWSER_HEADLESS: 'true'
          K6_BROWSER_ARGS: 'no-sandbox'
        run: k6 run browser-test.js
\`\`\`

Key CI practices: always run headless, pass \`no-sandbox\` when running as root in a container, give the runner enough memory (browser VUs are hungry), keep the number of browser VUs small so the test finishes quickly and reliably, and rely on thresholds to produce the non-zero exit code that fails the build. Consider running browser tests on a schedule or on release branches rather than every commit, since they are slower and heavier than protocol tests.

## Common Pitfalls

**Forgetting \`await\`.** Every browser API call returns a Promise. Omitting \`await\` means actions fire out of order, metrics come back empty, and the test passes for the wrong reasons. If your script behaves erratically, audit for missing \`await\` first.

**Not closing pages.** Without \`page.close()\` in a \`finally\` block, pages accumulate across iterations and memory climbs until the run crashes. Always close in \`finally\` so cleanup happens even when a step throws.

**Wrong \`waitUntil\`.** Using \`domcontentloaded\` on an SPA resolves before content renders, truncating LCP measurement. Match the lifecycle event to how the page actually loads.

**Brittle selectors.** Long CSS chains break on the smallest markup change. Prefer \`data-test\` attributes, IDs, or roles.

**Over-screenshotting.** Capturing every iteration floods disk and slows the run. Sample or capture on failure only.

**Treating browser VUs like protocol VUs.** Cranking browser VUs into the hundreds will exhaust the machine. Keep them low and use protocol VUs for volume.

**Ignoring INP.** FID is legacy; INP is the current responsiveness signal. Gate on \`browser_web_vital_inp\`.

## Best Practices Summary

Structure each flow with \`try/finally\` and \`page.close()\`. Use \`browser.newContext()\` for isolation when a flow needs a clean session. Set explicit thresholds on the Web Vitals you care about so the test is a real gate. Run headless in CI, headful locally for debugging. Combine a small browser scenario with a large protocol scenario for realistic hybrid load. Export metrics to a time-series backend and track p95 Web Vitals across releases. Keep selectors stable. And always \`await\`. Ready-made k6 and Playwright skill recipes for AI coding agents live in our [skills directory](/skills) if you want a starting template.

## Frequently Asked Questions

### What is the k6 browser module?

It is a module bundled into Grafana k6 (imported from \`k6/browser\`) that launches a real Chromium browser and drives it with a Playwright-inspired API. It measures genuine frontend performance — Web Vitals like LCP, CLS, and INP — instead of just protocol-level response times, letting you test the user experience under load, not only backend capacity.

### Do I need to install anything extra for k6 browser testing?

No separate plugin is required — the browser module ships inside the standard k6 binary. You do need a Chromium browser available; k6 uses an installed or bundled Chromium automatically. In containers you typically add the \`no-sandbox\` launch flag via \`K6_BROWSER_ARGS\` and ensure the runner has enough memory to launch a browser.

### Which Web Vitals does the k6 browser module capture?

It automatically emits \`browser_web_vital_lcp\` (Largest Contentful Paint), \`browser_web_vital_cls\` (Cumulative Layout Shift), \`browser_web_vital_inp\` (Interaction to Next Paint), \`browser_web_vital_fid\` (First Input Delay), \`browser_web_vital_fcp\` (First Contentful Paint), and \`browser_web_vital_ttfb\` (Time To First Byte). No manual instrumentation is needed — they appear in the summary after navigation and interaction.

### What is a hybrid load test in k6?

A hybrid test runs protocol VUs and browser VUs in the same script. A large pool of cheap protocol VUs generates realistic backend stress, while a small number of expensive browser VUs measure frontend UX under that load. You define two scenarios with separate \`exec\` functions and set thresholds on both \`http_req_duration\` and \`browser_web_vital_*\` metrics.

### How do I run k6 browser tests in headful mode?

Set the environment variable \`K6_BROWSER_HEADLESS=false\` before running, for example \`K6_BROWSER_HEADLESS=false k6 run script.js\`. This opens a visible Chromium window so you can watch the flow during local debugging. In CI and on servers, keep it headless (the default) for consistent measurements and lower resource usage.

### Why are k6 browser tests more expensive than protocol tests?

Each browser VU is a full Chromium tab consuming hundreds of megabytes of RAM and real CPU, so a single machine can only run a handful. Protocol VUs are lightweight HTTP clients you can run by the thousands. That is why the recommended pattern is hybrid: many protocol VUs for load, a few browser VUs for measurement.

### Can I set thresholds on Web Vitals to fail my CI build?

Yes. In \`options.thresholds\`, add conditions keyed by metric name, such as \`browser_web_vital_lcp: ['p(95)<2500']\` or \`browser_web_vital_cls: ['p(90)<0.1']\`. If any threshold is breached, k6 exits with a non-zero status code, which fails the pipeline automatically. This turns the browser test into an enforceable frontend performance gate.

### Why does my k6 browser script return empty metrics?

The most common cause is missing \`await\` on browser API calls — every call returns a Promise, and without \`await\` actions fire out of order and measurements never complete. Make your test function \`async\`, await every \`page\`/\`locator\` call, use the correct \`waitUntil\`, and close pages in a \`finally\` block.

## Conclusion

Protocol-level load testing proves your servers survive traffic; the k6 browser module proves your users actually have a good experience while that traffic flows. With a Playwright-style API, automatic Web Vitals capture, and the ability to blend browser and protocol VUs in one hybrid script, k6 gives you both halves of performance testing in a single tool and a single CI gate. Start small: write one browser scenario, capture LCP and CLS, add a threshold, and watch it fail when the frontend regresses. Then layer in protocol load for realism.

Ready to go deeper? Browse battle-tested k6 and Playwright recipes in the [QASkills directory](/skills), compare your options in our [k6 vs JMeter guide](/blog/k6-vs-jmeter-2026), and master gating logic with the [k6 thresholds and checks guide](/blog/k6-thresholds-checks-complete-guide). Your frontend performance deserves the same rigor you already give the backend.
`,
};
