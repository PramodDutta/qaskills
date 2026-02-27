import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Monitoring and Testing -- Core Web Vitals, Lighthouse, and Alerts',
  description:
    'Complete guide to performance monitoring and testing. Covers Core Web Vitals, Lighthouse CI, real user monitoring, synthetic testing, performance budgets, and alerting.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Your application passes every functional test, handles edge cases gracefully, and deploys without a hitch. Then a user in São Paulo waits 8 seconds for your landing page to become interactive, bounces, and never comes back. **Performance monitoring** is the discipline that closes this blind spot -- measuring how your application actually performs for real users across real networks and devices, then alerting you before degradations reach the point of user impact.

Performance is not a feature you ship once. It is a continuous quality signal that degrades with every new dependency, every additional tracking script, and every feature that adds bytes to your bundle. Teams that treat performance as an afterthought inevitably face the same pattern: gradual degradation goes unnoticed until a sudden spike in bounce rates or a drop in search rankings forces an emergency response. The cost of retroactive performance fixes is orders of magnitude higher than the cost of proactive **web performance testing** built into your development workflow.

This guide covers the complete performance monitoring landscape in 2026. You will learn how to measure **Core Web Vitals**, set up **Lighthouse CI** in your pipeline, implement **real user monitoring**, define **performance budgets** that fail builds on violations, and configure alerting that catches regressions before users notice them. Whether you are a QA engineer adding performance coverage to your test suite or a developer who wants to keep your application fast, this guide gives you the tools and techniques to make performance a first-class quality gate.

---

## Key Takeaways

- **Core Web Vitals** -- LCP, INP, and CLS -- are the three metrics Google uses for search ranking signals, and they directly correlate with user experience and conversion rates
- **Lighthouse CI** integrates into your CI/CD pipeline to catch performance regressions on every pull request, with configurable assertions and budget enforcement
- **Real user monitoring (RUM)** captures how actual users experience your application across diverse devices, networks, and geographies -- data that synthetic testing alone cannot provide
- **Performance budgets** define quantitative thresholds for bundle size, load time, and Web Vitals metrics, turning performance from a subjective concern into an automated quality gate
- Combining **synthetic testing** (controlled, repeatable baselines) with RUM (real-world variability) gives you complete visibility into performance across both development and production
- AI coding agents can automate performance test creation and monitoring setup using installable QA skills from [QASkills.sh](/skills)

---

## Core Web Vitals in 2026

Google introduced Core Web Vitals as a ranking signal in 2021, and they have evolved significantly since then. In 2026, the three metrics that define a "good" user experience are **Largest Contentful Paint (LCP)**, **Interaction to Next Paint (INP)**, and **Cumulative Layout Shift (CLS)**. Understanding these metrics -- what they measure, how they are calculated, and what thresholds define "good" versus "poor" -- is the foundation of any performance monitoring strategy.

### The Three Core Web Vitals

| Metric | What It Measures | Good | Needs Improvement | Poor |
|---|---|---|---|---|
| **LCP** | Time until the largest visible content element renders | <= 2.5s | 2.5s -- 4.0s | > 4.0s |
| **INP** | Responsiveness -- delay between user interaction and visual update | <= 200ms | 200ms -- 500ms | > 500ms |
| **CLS** | Visual stability -- how much the page layout shifts unexpectedly | <= 0.1 | 0.1 -- 0.25 | > 0.25 |

**Largest Contentful Paint (LCP)** measures loading performance. It tracks the render time of the largest image, video, or text block visible within the viewport. Common LCP elements include hero images, above-the-fold headings, and featured video thumbnails. An LCP of 2.5 seconds or less is considered good. Poor LCP is almost always caused by slow server response times, render-blocking resources, large unoptimized images, or client-side rendering that delays content visibility.

**Interaction to Next Paint (INP)** replaced First Input Delay (FID) as a Core Web Vital in March 2024 and remains the responsiveness metric in 2026. While FID only measured the delay of the first interaction, INP measures the latency of **all** interactions throughout the page lifecycle and reports the worst interaction (at the 98th percentile). This is a much more demanding metric because it captures the full user experience, not just the first click. An INP of 200ms or less is considered good.

INP is the metric that catches the problems FID missed. A page could have excellent FID because the first click happened before heavy JavaScript executed, but terrible INP because subsequent interactions -- expanding accordions, filtering lists, submitting forms -- were blocked by long tasks on the main thread. If your application relies heavily on client-side JavaScript for interactivity, INP is likely your most challenging Core Web Vital to optimize.

**Cumulative Layout Shift (CLS)** measures visual stability. Every time a visible element shifts position without user interaction -- an ad loading above content, a web font replacing fallback text, an image without explicit dimensions -- it contributes to the CLS score. A CLS of 0.1 or less is considered good. Layout shifts are particularly frustrating for users because they cause misclicks, disorientation, and a general feeling that the page is broken.

### Why Core Web Vitals Matter Beyond SEO

Google uses Core Web Vitals as a ranking signal, which gets most of the attention. But the real reason to care about these metrics is their direct impact on business outcomes. Research consistently shows that:

- A 100ms improvement in LCP correlates with a **0.7% increase in conversion rate** for e-commerce sites
- Pages with good INP scores have **22% lower bounce rates** than pages with poor INP
- Sites with CLS above 0.25 see **15% higher cart abandonment** on mobile devices

Core Web Vitals are not arbitrary benchmarks. They are empirically derived thresholds that represent the point at which user behavior measurably changes. Treating them as a checklist for SEO misses the larger opportunity -- they are proxy metrics for the user experience that directly drives your business outcomes.

---

## Lighthouse for Performance Testing

**Lighthouse** is Google's open-source tool for auditing web page quality, including performance, accessibility, best practices, and SEO. While most developers know Lighthouse as a Chrome DevTools panel, its real power for QA teams lies in **Lighthouse CI** -- a suite of tools that integrates Lighthouse audits into your CI/CD pipeline so that every pull request is automatically tested for performance regressions.

### Running Lighthouse Programmatically

You can run Lighthouse from the command line or programmatically in Node.js. The CLI approach is the simplest way to get started:

\`\`\`bash
npm install -g lighthouse
lighthouse https://your-app.com --output=json --output-path=./report.json
\`\`\`

For programmatic use in your test suite:

\`\`\`javascript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runAudit(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const result = await lighthouse(url, {
    port: chrome.port,
    output: 'json',
    onlyCategories: ['performance'],
  });

  const { lhr } = result;
  console.log('Performance score:', lhr.categories.performance.score * 100);
  console.log('LCP:', lhr.audits['largest-contentful-paint'].numericValue);
  console.log('INP:', lhr.audits['interaction-to-next-paint']?.numericValue ?? 'N/A');
  console.log('CLS:', lhr.audits['cumulative-layout-shift'].numericValue);

  await chrome.kill();
  return lhr;
}
\`\`\`

### Setting Up Lighthouse CI

**Lighthouse CI (LHCI)** provides three core capabilities: collecting Lighthouse results across multiple runs, asserting that results meet defined thresholds, and uploading results to a server for historical tracking. Install it as a dev dependency:

\`\`\`bash
npm install --save-dev @lhci/cli
\`\`\`

Create a \`lighthouserc.js\` configuration file at your project root:

\`\`\`javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/dashboard'],
      startServerCommand: 'npm run start',
      numberOfRuns: 3, // Run 3 times to reduce variance
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-byte-weight': ['error', { maxNumericValue: 500000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage', // Free, 7-day retention
    },
  },
};
\`\`\`

The \`assert\` block is where Lighthouse CI becomes a quality gate. Each assertion defines a metric, a severity level (\`error\` fails the build, \`warn\` logs without failing), and a threshold. The \`numberOfRuns: 3\` setting runs Lighthouse three times and uses the median result, which reduces variance from network and CPU fluctuations in CI environments.

### Budget Configuration

Lighthouse also supports a dedicated \`budget.json\` file for resource budgets:

\`\`\`json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "image", "budget": 200 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "font", "budget": 100 },
      { "resourceType": "total", "budget": 700 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 15 },
      { "resourceType": "third-party", "budget": 5 },
      { "resourceType": "total", "budget": 50 }
    ]
  }
]
\`\`\`

The sizes are in kilobytes. This budget says your total page weight should not exceed 700 KB, with no more than 300 KB of JavaScript, and no more than 5 third-party resources. These are aggressive but achievable targets for most applications and will catch the common pattern of bundle size creep that happens when dependencies accumulate without oversight.

---

## Real User Monitoring vs Synthetic Testing

Performance testing broadly falls into two categories: **synthetic testing** (also called lab testing) and **real user monitoring (RUM)** (also called field testing). Each approach has distinct strengths, and a mature performance monitoring strategy uses both.

### Synthetic Testing

**Synthetic testing** runs automated performance tests in a controlled environment -- a specific device, network speed, and location. Lighthouse, WebPageTest, and similar tools are synthetic testing tools. They give you repeatable, consistent results that are ideal for detecting regressions in CI and comparing before-and-after performance of specific changes.

The limitation of synthetic testing is that it cannot capture the diversity of real user experiences. Your synthetic test might run on a fast desktop with a wired connection, while 60% of your users are on mid-range Android phones on 4G networks. The gap between synthetic results and real user experience can be enormous.

### Real User Monitoring (RUM)

**Real user monitoring** collects performance data from actual users as they interact with your production application. It captures the full spectrum of devices, networks, geographies, and usage patterns. RUM data is the ground truth of your application's performance -- it tells you what users actually experience, not what they would experience under ideal conditions.

The \`web-vitals\` JavaScript library is the standard way to collect Core Web Vitals from real users:

\`\`\`javascript
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToAnalytics(metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good', 'needs-improvement', or 'poor'
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };

  // Send to your analytics endpoint
  navigator.sendBeacon('/api/telemetry/vitals', JSON.stringify(payload));
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
\`\`\`

### When to Use Each Approach

| Aspect | Synthetic Testing | Real User Monitoring |
|---|---|---|
| **When to use** | CI/CD pipelines, pre-deployment checks | Production monitoring, user experience tracking |
| **Environment** | Controlled lab conditions | Real user devices, networks, locations |
| **Consistency** | Highly repeatable | Varies by user context |
| **Coverage** | Specific pages and scenarios | All pages, all users |
| **Regression detection** | Excellent -- catches changes in PRs | Slower -- requires traffic to surface issues |
| **Cost** | CI compute time | Analytics infrastructure |
| **Tools** | Lighthouse CI, WebPageTest, Calibre | web-vitals, SpeedCurve, Datadog RUM |

The best strategy is to use **synthetic testing in CI** to catch regressions before they ship, and **RUM in production** to verify that real users experience the performance you expect. When RUM data diverges significantly from synthetic results, it usually means your synthetic tests are not representative of your actual user base -- you may need to adjust throttling settings, test on more representative device profiles, or add tests for pages that synthetic testing misses.

### Tools for RUM and Synthetic Testing

- **web-vitals library**: Free, open-source JavaScript library for collecting Core Web Vitals from real users. Lightweight (< 2 KB) and the same library Google uses internally
- **SpeedCurve**: Combines synthetic monitoring with RUM, provides performance budgets and visual comparisons over time
- **Calibre**: Focused on synthetic monitoring with excellent Lighthouse integration and team collaboration features
- **Datadog RUM**: Enterprise-grade RUM with session replay, error tracking, and performance dashboards
- **Chrome UX Report (CrUX)**: Free dataset of real user performance data from Chrome users, aggregated by origin. Powers PageSpeed Insights

---

## Performance Budgets

A **performance budget** is a quantitative threshold that defines the maximum acceptable value for a performance metric. When a budget is exceeded, the build fails -- just like a test failure. Performance budgets transform performance from a vague aspiration ("we should be fast") into an enforceable quality gate with the same rigor as functional tests.

### What to Budget

Effective **performance budgets** cover multiple dimensions:

| Budget Type | Metric | Example Target | Why It Matters |
|---|---|---|---|
| **Loading** | LCP | <= 2.5s | Largest Contentful Paint directly affects perceived speed |
| **Interactivity** | INP | <= 200ms | Responsiveness determines whether the app feels snappy |
| **Stability** | CLS | <= 0.1 | Layout shifts frustrate users and cause misclicks |
| **Bundle size** | Total JS | <= 300 KB (compressed) | JavaScript is the single largest contributor to poor performance |
| **Requests** | Total requests | <= 50 | Each request adds latency, especially on mobile networks |
| **Fonts** | Web font size | <= 100 KB | Font loading blocks text rendering |

### Practical Budget Examples by App Type

Different applications have different performance profiles. A content-heavy blog should be much faster than a complex SaaS dashboard:

**Content site / marketing page:**
- LCP: <= 1.5s
- INP: <= 100ms
- CLS: <= 0.05
- Total JS: <= 100 KB
- Total page weight: <= 500 KB

**E-commerce product page:**
- LCP: <= 2.0s
- INP: <= 150ms
- CLS: <= 0.1
- Total JS: <= 250 KB
- Total page weight: <= 800 KB

**SaaS dashboard:**
- LCP: <= 2.5s
- INP: <= 200ms
- CLS: <= 0.1
- Total JS: <= 400 KB
- Total page weight: <= 1.2 MB

### Failing Builds on Budget Violations

The \`budget.json\` file you define for Lighthouse CI (shown in the previous section) is one enforcement mechanism. You can also enforce budgets directly in your build tool. For example, with webpack:

\`\`\`javascript
// webpack.config.js
module.exports = {
  performance: {
    maxAssetSize: 250000, // 250 KB per asset
    maxEntrypointSize: 500000, // 500 KB per entry point
    hints: 'error', // Fail the build on violations
  },
};
\`\`\`

For Next.js applications, you can use the built-in bundle analyzer and set budgets in your Lighthouse CI config. The key principle is that **budget violations should fail the build**, not just produce warnings. Warnings get ignored; build failures get fixed.

---

## Automated Performance Testing in CI

The highest-value integration point for **web performance testing** is your CI/CD pipeline. Every pull request should be automatically tested for performance regressions so that degradations are caught before they merge to main. Here is a complete GitHub Actions workflow that runs Lighthouse CI on every pull request.

\`\`\`yaml
name: Performance Testing

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - run: npm run build

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: './lighthouserc.js'
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Check bundle size
        run: |
          MAX_SIZE=307200  # 300 KB
          BUNDLE_SIZE=\$(stat -f%z .next/static/chunks/*.js 2>/dev/null | awk '{s+=\$1} END {print s}')
          if [ "\$BUNDLE_SIZE" -gt "\$MAX_SIZE" ]; then
            echo "Bundle size \$BUNDLE_SIZE exceeds budget \$MAX_SIZE"
            exit 1
          fi

      - name: Comment PR with results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(
              fs.readFileSync('.lighthouseci/manifest.json', 'utf8')
            );
            // Post performance summary as PR comment
\`\`\`

This workflow builds your application, runs Lighthouse CI with your configured assertions, checks bundle size against a budget, and posts results as a PR comment. The \`treosh/lighthouse-ci-action\` handles starting a local server, running multiple Lighthouse audits, and uploading results to temporary public storage where team members can inspect detailed reports.

For more advanced CI/CD pipeline patterns including parallel test execution and caching strategies, see our [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions).

### WebPageTest API Integration

For teams that need more granular control than Lighthouse CI provides, the **WebPageTest API** offers performance testing from real browsers in real locations worldwide:

\`\`\`javascript
import WebPageTest from 'webpagetest';

const wpt = new WebPageTest('www.webpagetest.org', process.env.WPT_API_KEY);

const testResult = await wpt.runTestAndWait('https://your-app.com', {
  location: 'Dulles:Chrome',
  connectivity: '4G',
  runs: 3,
  firstViewOnly: false,
});

const metrics = testResult.data.median.firstView;
console.log('LCP:', metrics.chromeUserTiming.LargestContentfulPaint);
console.log('CLS:', metrics.chromeUserTiming.CumulativeLayoutShift);
console.log('Total bytes:', metrics.bytesIn);
\`\`\`

### Performance Regression Detection

The most sophisticated approach to **performance monitoring** in CI is regression detection -- comparing the current PR's performance against the baseline from main. Rather than using fixed thresholds, regression detection flags changes that are statistically worse than the previous baseline. This catches gradual degradation that stays within absolute thresholds but represents a meaningful decline from the prior state. Tools like SpeedCurve and Calibre offer built-in regression detection, or you can build your own by storing Lighthouse results and comparing across runs.

---

## Frontend Performance Patterns

Understanding which frontend patterns impact performance -- and how to test that they are working correctly -- is essential for any QA engineer doing **web performance testing**. Here are the patterns that have the largest impact on Core Web Vitals.

### Code Splitting and Lazy Loading

**Code splitting** breaks your JavaScript bundle into smaller chunks that are loaded on demand. Without code splitting, users download your entire application's JavaScript before anything becomes interactive -- even for pages they may never visit.

\`\`\`javascript
// Before: everything loads upfront
import { HeavyDashboard } from './HeavyDashboard';

// After: loaded only when needed
const HeavyDashboard = lazy(() => import('./HeavyDashboard'));
\`\`\`

To verify code splitting is working, use Playwright to check that only expected chunks load on a given page:

\`\`\`javascript
import { test, expect } from '@playwright/test';

test('homepage loads only essential chunks', async ({ page }) => {
  const jsRequests = [];
  page.on('response', (response) => {
    if (response.url().endsWith('.js')) {
      jsRequests.push({
        url: response.url(),
        size: Number(response.headers()['content-length'] || 0),
      });
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const totalJsSize = jsRequests.reduce((sum, req) => sum + req.size, 0);
  expect(totalJsSize).toBeLessThan(300 * 1024); // 300 KB budget
  expect(jsRequests.length).toBeLessThan(15); // Max 15 JS files
});
\`\`\`

### Image Optimization

Images are typically the largest resources on a page and the primary driver of LCP. Use modern formats (WebP, AVIF), responsive sizes, and lazy loading for below-the-fold images. The LCP image should **never** be lazy-loaded -- it should be eagerly loaded with a \`fetchpriority="high"\` attribute.

### Critical CSS and Font Loading

Render-blocking CSS delays LCP. Inline critical CSS for above-the-fold content and defer the rest. For web fonts, use \`font-display: swap\` to prevent invisible text during font loading, and preload the fonts used in your LCP element:

\`\`\`html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
\`\`\`

These patterns are all testable. You can write Playwright tests that verify preload hints exist, that images have explicit dimensions (preventing CLS), and that no render-blocking resources delay content rendering. Making these checks automated ensures that performance optimizations are not accidentally removed in future PRs.

---

## Database and API Performance

Frontend performance gets the most attention, but backend performance is often the root cause of poor LCP and slow API responses. A page cannot render fast if the server takes 3 seconds to respond.

### Slow Query Detection

Slow database queries are the most common backend performance problem. Set up slow query logging in your database and alert on queries that exceed a threshold:

\`\`\`sql
-- PostgreSQL: log queries slower than 500ms
ALTER DATABASE your_db SET log_min_duration_statement = 500;
\`\`\`

In your test suite, you can instrument your ORM to detect slow queries during integration tests:

\`\`\`javascript
// Detect slow queries during tests
const SLOW_QUERY_THRESHOLD = 100; // ms

db.\$on('query', (event) => {
  if (event.duration > SLOW_QUERY_THRESHOLD) {
    console.warn(
      \\\`Slow query detected (\\\${event.duration}ms): \\\${event.query}\\\`
    );
  }
});
\`\`\`

### API Response Time Budgets

Define response time budgets for your API endpoints and enforce them in integration tests:

\`\`\`javascript
test('GET /api/skills responds within budget', async () => {
  const start = performance.now();
  const response = await fetch('http://localhost:3000/api/skills');
  const duration = performance.now() - start;

  expect(response.status).toBe(200);
  expect(duration).toBeLessThan(200); // 200ms budget
});
\`\`\`

### N+1 Query Prevention

**N+1 queries** are a performance anti-pattern where a list page executes one query for the list and then N additional queries for each item's related data. A page listing 50 skills that each requires a separate query for categories, reviews, and author data turns into 151 database queries instead of 4 well-crafted joins.

Detect N+1 queries by counting database queries during test execution. If a page that lists N items consistently executes more than a small constant number of queries, you likely have an N+1 problem. Tools like \`pg-query-stream\` for PostgreSQL and query logging middleware for your ORM can automate this detection.

For comprehensive database testing strategies, see our [database testing automation guide](/blog/database-testing-automation-guide).

---

## Alerting and Incident Response

**Performance monitoring** is only valuable if someone acts on the data. Without alerting, dashboards become expensive screensavers that nobody checks. Your alerting strategy should surface performance degradations fast enough to respond before users are significantly impacted.

### Setting Up Performance Alerts

Effective performance alerts follow a tiered approach:

**Warning alerts** (Slack notification):
- LCP p75 exceeds 3.0s for 5 consecutive minutes
- INP p75 exceeds 250ms for 5 consecutive minutes
- Error rate exceeds 1% for 3 consecutive minutes
- Bundle size increases by more than 10% compared to previous deploy

**Critical alerts** (PagerDuty / on-call escalation):
- LCP p75 exceeds 4.0s for 5 consecutive minutes
- INP p75 exceeds 500ms for 5 consecutive minutes
- Error rate exceeds 5% for 2 consecutive minutes
- API response time p99 exceeds 5s for 3 consecutive minutes

The key principle is **alert on user impact, not on system metrics**. A server running at 90% CPU is not necessarily a problem if response times are still within budget. An LCP that exceeds 4 seconds is always a problem, regardless of what the CPU looks like.

### Slack Integration Example

Most monitoring tools support Slack webhooks natively. For custom alerts based on your RUM data:

\`\`\`javascript
async function checkVitalsAndAlert() {
  const vitals = await getRecentVitals(); // Your RUM data endpoint

  if (vitals.lcp.p75 > 3000) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: \\\`Performance Alert: LCP p75 is \\\${vitals.lcp.p75}ms (threshold: 3000ms). Dashboard: https://your-monitoring.com/vitals\\\`,
      }),
    });
  }
}
\`\`\`

### Performance Incident Runbooks

When a performance alert fires, your team needs a clear, repeatable process. A performance incident runbook should include:

1. **Triage**: Check if the degradation correlates with a recent deploy. If yes, consider rollback
2. **Identify the metric**: Which Core Web Vital is affected? LCP points to server/resource issues, INP points to JavaScript execution, CLS points to layout/resource loading
3. **Check recent changes**: Review merged PRs in the last 24 hours for bundle size changes, new dependencies, or database query changes
4. **Profile in production**: Use Chrome DevTools Performance panel or server-side profiling to identify the bottleneck
5. **Mitigate**: Apply the fix or rollback, verify metrics recover, then write a post-mortem

The goal of the runbook is to reduce mean time to resolution (MTTR). A team with a clear runbook can go from alert to mitigation in minutes. A team without one wastes the first 30 minutes just figuring out where to look.

---

## Automate Performance Testing with AI Agents

Setting up comprehensive **performance monitoring** and testing from scratch is time-consuming. AI coding agents can accelerate this process dramatically when equipped with specialized QA skills. The [QASkills.sh](/skills) directory includes several performance-focused skills that teach your AI agent expert-level performance testing patterns.

Install the **page-speed-critic** skill to give your agent deep knowledge of Core Web Vitals optimization and Lighthouse auditing:

\`\`\`bash
npx @qaskills/cli add page-speed-critic
\`\`\`

For detecting memory leaks that degrade performance over time, install the **memory-leak-detector** skill:

\`\`\`bash
npx @qaskills/cli add memory-leak-detector
\`\`\`

Additional performance-focused skills include:

- **performance-test-scenario-generator**: Teaches your agent to design realistic load test scenarios with proper think times, ramp patterns, and representative data distributions
- **n-plus-one-query-detector**: Gives your agent the ability to identify and fix N+1 query patterns in your ORM code

These skills work with Claude Code, Cursor, Windsurf, Copilot, and other AI coding agents. Once installed, your agent can set up Lighthouse CI pipelines, write performance-focused Playwright tests, configure RUM collection, and create alerting rules -- all following the expert patterns described in this guide.

Browse all available QA skills at [qaskills.sh/skills](/skills), read the [getting started guide](/getting-started) to install your first skill in under a minute, or explore our [load testing guide](/blog/load-testing-beginners-guide) for deeper coverage of backend performance testing with k6 and JMeter.

---

## Frequently Asked Questions

### How often should I run Lighthouse CI in my pipeline?

Run Lighthouse CI on **every pull request** that changes frontend code. For main branch monitoring, run it on every merge to track performance trends over time. Running on PRs catches regressions before they merge, which is far cheaper than detecting them in production. If Lighthouse CI adds too much time to your pipeline (it typically adds 2-4 minutes), consider running it as a separate job that does not block the merge but posts results as a PR comment.

### What is the difference between INP and FID?

**First Input Delay (FID)** measured only the delay of the very first interaction on a page. **Interaction to Next Paint (INP)** measures the responsiveness of all interactions throughout the entire page lifecycle and reports the worst one at the 98th percentile. INP replaced FID as a Core Web Vital in March 2024 because FID gave an incomplete picture -- a page could score well on FID but be sluggish for subsequent interactions. If your FID scores were good but users complain about responsiveness, INP will reveal the problem.

### Can I use performance budgets without Lighthouse CI?

Yes. **Performance budgets** can be enforced at multiple levels. Webpack and other bundlers have built-in size limit configurations that fail the build. Tools like \`bundlesize\` and \`size-limit\` provide standalone bundle size checking. For runtime metrics, you can write custom assertions in your test framework that check API response times or page load metrics via Playwright. Lighthouse CI is the most comprehensive option because it covers both resource budgets and runtime metrics, but it is not the only approach.

### How do I improve INP on a JavaScript-heavy application?

The most effective strategies for improving INP are: **break up long tasks** using \`requestIdleCallback\` or \`scheduler.yield()\` so the main thread is not blocked for more than 50ms at a time; **defer non-critical JavaScript** by moving analytics, chat widgets, and third-party scripts to load after the page is interactive; **use web workers** for CPU-intensive computations that do not need DOM access; and **virtualize long lists** so that rendering 10,000 items does not block interactions. Measure INP in production with the \`web-vitals\` library to identify which specific interactions are slow before optimizing.

### Should I monitor Core Web Vitals in staging or only production?

Monitor Core Web Vitals in **both environments**, but understand the limitations. Staging gives you synthetic results under controlled conditions -- useful for catching regressions but not representative of real user experience. Production RUM gives you the ground truth. The most common mistake is optimizing only for synthetic scores. A page that scores 100 in Lighthouse on a fast CI server may have an LCP of 4 seconds for users on mobile networks in emerging markets. Use staging for regression detection and production RUM for understanding actual user experience.
`,
};
