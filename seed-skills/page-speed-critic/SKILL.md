---
name: Page Speed Critic
description: Analyze page load performance using Core Web Vitals, Lighthouse scores, resource waterfall analysis, and performance budgets with automated regression detection.
version: 1.0.0
author: Pramod
license: MIT
tags: [performance, core-web-vitals, lighthouse, page-speed, lcp, cls, fid, ttfb]
testingTypes: [performance]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Page Speed Critic Skill

You are an expert QA performance engineer specializing in web page speed analysis, Core Web Vitals measurement, resource optimization auditing, and performance regression detection. When asked to analyze, benchmark, or improve page load performance for a web application, follow these comprehensive instructions to systematically measure, report, and enforce performance standards.

## Core Principles

1. **Measure What Matters to Users** -- Core Web Vitals (LCP, CLS, INP) are the primary metrics because they directly correlate with user experience. Time To First Byte (TTFB), First Contentful Paint (FCP), and Total Blocking Time (TBT) provide additional diagnostic value. Avoid fixating on synthetic scores that do not reflect real user experience.

2. **Performance Budgets Are Non-Negotiable** -- Every application must define explicit performance budgets: maximum JavaScript bundle size, maximum number of network requests, maximum LCP time, and maximum CLS score. Without budgets, performance degrades gradually and silently until users notice.

3. **Test on Realistic Hardware** -- Measuring performance on a developer's high-end laptop with gigabit Ethernet produces meaninglessly fast results. Performance testing must simulate the hardware and network conditions of the application's actual user base, which often means 4G mobile on mid-range Android devices.

4. **Automate Regression Detection** -- Performance regressions are introduced by individual commits, not by sudden catastrophic changes. Automated per-commit performance measurement with threshold enforcement catches regressions at the source, before they compound.

5. **Resource Loading Order Is Architecture** -- The order in which scripts, stylesheets, fonts, and images load determines perceived performance. A single render-blocking script in the document head can delay LCP by seconds. Audit the resource waterfall as carefully as you audit the code.

6. **Third-Party Scripts Are a Tax** -- Analytics trackers, A/B testing tools, chat widgets, and advertising scripts collectively add hundreds of kilobytes and dozens of network requests. Audit third-party impact separately and hold them to the same performance budgets as first-party code.

7. **Performance Is a Distribution, Not a Single Number** -- The p50 (median) performance might be acceptable while the p95 experience is catastrophic. Always measure and report performance at multiple percentiles: p50, p75, p90, and p95.

## Project Structure

Organize your page speed analysis suite with this directory structure:

```
tests/
  performance/
    core-web-vitals.spec.ts
    lighthouse-audit.spec.ts
    resource-waterfall.spec.ts
    bundle-size-budget.spec.ts
    third-party-impact.spec.ts
    performance-regression.spec.ts
    mobile-performance.spec.ts
  fixtures/
    performance-page.fixture.ts
  helpers/
    metrics-collector.ts
    budget-enforcer.ts
    waterfall-analyzer.ts
    lighthouse-runner.ts
    report-generator.ts
  budgets/
    performance-budget.json
  baselines/
    metrics-baseline.json
  reports/
    performance-report.json
    performance-report.html
playwright.config.ts
```

Each spec file targets a different performance dimension. The budgets directory contains the performance threshold definitions. Baselines store historical metrics for regression comparison.

## Detailed Guide

### Step 1: Build a Core Web Vitals Collector

The foundation of performance testing is collecting Core Web Vitals directly from the browser during automated page loads.

```typescript
// helpers/metrics-collector.ts
import { Page } from '@playwright/test';

export interface CoreWebVitals {
  lcp: number | null;    // Largest Contentful Paint (ms)
  cls: number | null;    // Cumulative Layout Shift (score)
  inp: number | null;    // Interaction to Next Paint (ms)
  fcp: number | null;    // First Contentful Paint (ms)
  ttfb: number | null;   // Time to First Byte (ms)
  tbt: number | null;    // Total Blocking Time (ms)
  domContentLoaded: number;
  loadComplete: number;
  resourceCount: number;
  totalTransferSize: number;
}

export class MetricsCollector {
  async collectCoreWebVitals(page: Page): Promise<CoreWebVitals> {
    const metrics = await page.evaluate(async () => {
      return new Promise<{
        lcp: number | null;
        cls: number | null;
        fcp: number | null;
        ttfb: number | null;
        tbt: number | null;
        domContentLoaded: number;
        loadComplete: number;
        resourceCount: number;
        totalTransferSize: number;
      }>((resolve) => {
        const results: Record<string, number | null> = {
          lcp: null,
          cls: null,
          fcp: null,
          ttfb: null,
          tbt: null,
        };

        // Collect LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          results.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // Collect CLS
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as PerformanceEntry & {
              hadRecentInput: boolean;
              value: number;
            };
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
            }
          }
          results.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Collect FCP
        const fcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              results.fcp = entry.startTime;
            }
          }
        });
        fcpObserver.observe({ type: 'paint', buffered: true });

        // Collect TBT via Long Tasks
        let totalBlockingTime = 0;
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              totalBlockingTime += entry.duration - 50;
            }
          }
          results.tbt = totalBlockingTime;
        });
        longTaskObserver.observe({ type: 'longtask', buffered: true });

        // Wait for metrics to stabilize then collect navigation timing
        setTimeout(() => {
          const navEntry = performance.getEntriesByType(
            'navigation'
          )[0] as PerformanceNavigationTiming;

          const resourceEntries = performance.getEntriesByType(
            'resource'
          ) as PerformanceResourceTiming[];

          const totalTransfer = resourceEntries.reduce(
            (sum, r) => sum + (r.transferSize || 0),
            0
          );

          resolve({
            lcp: results.lcp,
            cls: results.cls ?? clsValue,
            fcp: results.fcp,
            ttfb: navEntry ? navEntry.responseStart - navEntry.requestStart : null,
            tbt: results.tbt ?? totalBlockingTime,
            domContentLoaded: navEntry
              ? navEntry.domContentLoadedEventEnd - navEntry.startTime
              : 0,
            loadComplete: navEntry ? navEntry.loadEventEnd - navEntry.startTime : 0,
            resourceCount: resourceEntries.length,
            totalTransferSize: totalTransfer,
          });
        }, 5000);
      });
    });

    return {
      ...metrics,
      inp: null, // INP requires user interaction, measured separately
    };
  }

  async measureInteractionLatency(
    page: Page,
    interactionFn: () => Promise<void>
  ): Promise<number> {
    await page.evaluate(() => {
      (window as Record<string, unknown>).__inpValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          if (duration > ((window as Record<string, number>).__inpValue || 0)) {
            (window as Record<string, number>).__inpValue = duration;
          }
        }
      });
      observer.observe({ type: 'event', buffered: true });
    });

    await interactionFn();
    await page.waitForTimeout(1000);

    const inp = await page.evaluate(
      () => (window as Record<string, number>).__inpValue || 0
    );
    return inp;
  }

  async collectResourceTimings(page: Page): Promise<
    Array<{
      name: string;
      type: string;
      transferSize: number;
      duration: number;
      startTime: number;
      protocol: string;
      renderBlocking: boolean;
    }>
  > {
    return page.evaluate(() => {
      const resources = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];

      return resources.map((r) => ({
        name: r.name,
        type: r.initiatorType,
        transferSize: r.transferSize || 0,
        duration: r.duration,
        startTime: r.startTime,
        protocol: r.nextHopProtocol || 'unknown',
        renderBlocking:
          (r as PerformanceResourceTiming & { renderBlockingStatus?: string })
            .renderBlockingStatus === 'blocking',
      }));
    });
  }
}
```

### Step 2: Define Performance Budgets

Performance budgets provide clear, enforceable thresholds for every metric.

```typescript
// helpers/budget-enforcer.ts
import { CoreWebVitals } from './metrics-collector';

export interface PerformanceBudget {
  lcp: { good: number; poor: number };
  cls: { good: number; poor: number };
  inp: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
  tbt: { good: number; poor: number };
  maxJsBundleSizeKB: number;
  maxCssBundleSizeKB: number;
  maxImageSizeKB: number;
  maxTotalTransferSizeKB: number;
  maxResourceCount: number;
  maxThirdPartyRequests: number;
}

export const defaultBudget: PerformanceBudget = {
  lcp: { good: 2500, poor: 4000 },       // ms
  cls: { good: 0.1, poor: 0.25 },        // score
  inp: { good: 200, poor: 500 },          // ms
  fcp: { good: 1800, poor: 3000 },        // ms
  ttfb: { good: 800, poor: 1800 },        // ms
  tbt: { good: 200, poor: 600 },          // ms
  maxJsBundleSizeKB: 300,
  maxCssBundleSizeKB: 100,
  maxImageSizeKB: 200,
  maxTotalTransferSizeKB: 1500,
  maxResourceCount: 50,
  maxThirdPartyRequests: 10,
};

export interface BudgetViolation {
  metric: string;
  actual: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

export class BudgetEnforcer {
  constructor(private budget: PerformanceBudget = defaultBudget) {}

  check(metrics: CoreWebVitals): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    if (metrics.lcp !== null) {
      if (metrics.lcp > this.budget.lcp.poor) {
        violations.push({
          metric: 'LCP',
          actual: metrics.lcp,
          threshold: this.budget.lcp.poor,
          severity: 'critical',
          message: `LCP is ${metrics.lcp.toFixed(0)}ms (poor threshold: ${this.budget.lcp.poor}ms)`,
        });
      } else if (metrics.lcp > this.budget.lcp.good) {
        violations.push({
          metric: 'LCP',
          actual: metrics.lcp,
          threshold: this.budget.lcp.good,
          severity: 'warning',
          message: `LCP is ${metrics.lcp.toFixed(0)}ms (good threshold: ${this.budget.lcp.good}ms)`,
        });
      }
    }

    if (metrics.cls !== null) {
      if (metrics.cls > this.budget.cls.poor) {
        violations.push({
          metric: 'CLS',
          actual: metrics.cls,
          threshold: this.budget.cls.poor,
          severity: 'critical',
          message: `CLS is ${metrics.cls.toFixed(3)} (poor threshold: ${this.budget.cls.poor})`,
        });
      } else if (metrics.cls > this.budget.cls.good) {
        violations.push({
          metric: 'CLS',
          actual: metrics.cls,
          threshold: this.budget.cls.good,
          severity: 'warning',
          message: `CLS is ${metrics.cls.toFixed(3)} (good threshold: ${this.budget.cls.good})`,
        });
      }
    }

    if (metrics.tbt !== null) {
      if (metrics.tbt > this.budget.tbt.poor) {
        violations.push({
          metric: 'TBT',
          actual: metrics.tbt,
          threshold: this.budget.tbt.poor,
          severity: 'critical',
          message: `TBT is ${metrics.tbt.toFixed(0)}ms (poor threshold: ${this.budget.tbt.poor}ms)`,
        });
      } else if (metrics.tbt > this.budget.tbt.good) {
        violations.push({
          metric: 'TBT',
          actual: metrics.tbt,
          threshold: this.budget.tbt.good,
          severity: 'warning',
          message: `TBT is ${metrics.tbt.toFixed(0)}ms (good threshold: ${this.budget.tbt.good}ms)`,
        });
      }
    }

    if (metrics.fcp !== null && metrics.fcp > this.budget.fcp.poor) {
      violations.push({
        metric: 'FCP',
        actual: metrics.fcp,
        threshold: this.budget.fcp.poor,
        severity: 'critical',
        message: `FCP is ${metrics.fcp.toFixed(0)}ms (poor threshold: ${this.budget.fcp.poor}ms)`,
      });
    }

    if (metrics.ttfb !== null && metrics.ttfb > this.budget.ttfb.poor) {
      violations.push({
        metric: 'TTFB',
        actual: metrics.ttfb,
        threshold: this.budget.ttfb.poor,
        severity: 'critical',
        message: `TTFB is ${metrics.ttfb.toFixed(0)}ms (poor threshold: ${this.budget.ttfb.poor}ms)`,
      });
    }

    const transferSizeKB = metrics.totalTransferSize / 1024;
    if (transferSizeKB > this.budget.maxTotalTransferSizeKB) {
      violations.push({
        metric: 'Total Transfer Size',
        actual: transferSizeKB,
        threshold: this.budget.maxTotalTransferSizeKB,
        severity: 'critical',
        message: `Total transfer is ${transferSizeKB.toFixed(0)}KB (budget: ${this.budget.maxTotalTransferSizeKB}KB)`,
      });
    }

    if (metrics.resourceCount > this.budget.maxResourceCount) {
      violations.push({
        metric: 'Resource Count',
        actual: metrics.resourceCount,
        threshold: this.budget.maxResourceCount,
        severity: 'warning',
        message: `${metrics.resourceCount} resources loaded (budget: ${this.budget.maxResourceCount})`,
      });
    }

    return violations;
  }
}
```

### Step 3: Write Core Web Vitals Tests

```typescript
// tests/performance/core-web-vitals.spec.ts
import { test, expect } from '@playwright/test';
import { MetricsCollector } from '../helpers/metrics-collector';
import { BudgetEnforcer, defaultBudget } from '../helpers/budget-enforcer';

const criticalPages = [
  { name: 'Homepage', path: '/' },
  { name: 'Product Listing', path: '/products' },
  { name: 'Product Detail', path: '/products/sample-product' },
  { name: 'Checkout', path: '/checkout' },
  { name: 'Dashboard', path: '/dashboard' },
];

test.describe('Core Web Vitals', () => {
  const collector = new MetricsCollector();
  const enforcer = new BudgetEnforcer(defaultBudget);

  for (const pageConfig of criticalPages) {
    test(`${pageConfig.name} meets LCP budget`, async ({ page }) => {
      await page.goto(pageConfig.path, { waitUntil: 'load' });
      const metrics = await collector.collectCoreWebVitals(page);

      if (metrics.lcp !== null) {
        expect(metrics.lcp).toBeLessThanOrEqual(defaultBudget.lcp.poor);
      }
    });

    test(`${pageConfig.name} meets CLS budget`, async ({ page }) => {
      await page.goto(pageConfig.path, { waitUntil: 'load' });
      await page.waitForTimeout(3000);

      const metrics = await collector.collectCoreWebVitals(page);

      if (metrics.cls !== null) {
        expect(metrics.cls).toBeLessThanOrEqual(defaultBudget.cls.poor);
      }
    });

    test(`${pageConfig.name} meets transfer size budget`, async ({ page }) => {
      await page.goto(pageConfig.path, { waitUntil: 'load' });
      const metrics = await collector.collectCoreWebVitals(page);

      const transferKB = metrics.totalTransferSize / 1024;
      expect(transferKB).toBeLessThanOrEqual(defaultBudget.maxTotalTransferSizeKB);
    });

    test(`${pageConfig.name} has no critical budget violations`, async ({ page }) => {
      await page.goto(pageConfig.path, { waitUntil: 'load' });
      await page.waitForTimeout(5000);

      const metrics = await collector.collectCoreWebVitals(page);
      const violations = enforcer.check(metrics);
      const critical = violations.filter((v) => v.severity === 'critical');

      if (critical.length > 0) {
        const messages = critical.map((v) => v.message).join('\n');
        expect.soft(critical.length, `Critical violations:\n${messages}`).toBe(0);
      }
    });
  }
});
```

### Step 4: Analyze the Resource Waterfall

The resource waterfall reveals render-blocking resources, unnecessary sequential loading, and oversized assets.

```typescript
// helpers/waterfall-analyzer.ts
export interface WaterfallIssue {
  resource: string;
  issue: string;
  severity: 'critical' | 'major' | 'minor';
  recommendation: string;
  impact: string;
}

export class WaterfallAnalyzer {
  analyze(
    resources: Array<{
      name: string;
      type: string;
      transferSize: number;
      duration: number;
      startTime: number;
      protocol: string;
      renderBlocking: boolean;
    }>
  ): WaterfallIssue[] {
    const issues: WaterfallIssue[] = [];

    // Check for render-blocking resources
    const blocking = resources.filter((r) => r.renderBlocking);
    for (const resource of blocking) {
      issues.push({
        resource: this.shortenUrl(resource.name),
        issue: 'Render-blocking resource delays first paint',
        severity: 'critical',
        recommendation: `Defer or async-load ${this.shortenUrl(resource.name)}`,
        impact: `Blocks rendering for ${resource.duration.toFixed(0)}ms`,
      });
    }

    // Check for oversized JavaScript bundles
    const jsResources = resources.filter(
      (r) => r.type === 'script' || r.name.endsWith('.js')
    );
    for (const js of jsResources) {
      const sizeKB = js.transferSize / 1024;
      if (sizeKB > 150) {
        issues.push({
          resource: this.shortenUrl(js.name),
          issue: `JavaScript bundle is ${sizeKB.toFixed(0)}KB`,
          severity: sizeKB > 300 ? 'critical' : 'major',
          recommendation: 'Apply code splitting or dynamic imports to reduce bundle size',
          impact: `${sizeKB.toFixed(0)}KB of JS blocks main thread during parse`,
        });
      }
    }

    // Check for resources not served over HTTP/2+
    for (const resource of resources) {
      if (
        resource.transferSize > 10240 &&
        resource.protocol !== 'h2' &&
        resource.protocol !== 'h3'
      ) {
        issues.push({
          resource: this.shortenUrl(resource.name),
          issue: 'Large resource not served over HTTP/2 or HTTP/3',
          severity: 'major',
          recommendation: 'Enable HTTP/2 on the server for multiplexed loading',
          impact: 'Sequential loading over HTTP/1.1 adds latency',
        });
      }
    }

    // Check for oversized images
    const images = resources.filter(
      (r) => r.type === 'img' || /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(r.name)
    );
    for (const img of images) {
      const sizeKB = img.transferSize / 1024;
      if (sizeKB > 200) {
        issues.push({
          resource: this.shortenUrl(img.name),
          issue: `Image is ${sizeKB.toFixed(0)}KB`,
          severity: sizeKB > 500 ? 'critical' : 'major',
          recommendation: 'Compress, resize, or convert to WebP/AVIF format',
          impact: `${sizeKB.toFixed(0)}KB image delays page load`,
        });
      }
    }

    // Check for late-loading fonts
    const fonts = resources.filter(
      (r) => r.type === 'font' || /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(r.name)
    );
    for (const font of fonts) {
      if (font.startTime > 2000) {
        issues.push({
          resource: this.shortenUrl(font.name),
          issue: `Font loaded ${font.startTime.toFixed(0)}ms after navigation start`,
          severity: 'major',
          recommendation: 'Preload critical fonts with <link rel="preload">',
          impact: 'Late font loading causes Flash of Unstyled Text (FOUT)',
        });
      }
    }

    // Check for excessive requests to the same domain
    const domainCounts = new Map<string, number>();
    for (const r of resources) {
      try {
        const domain = new URL(r.name).hostname;
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      } catch {
        // Skip invalid URLs
      }
    }

    for (const [domain, count] of domainCounts) {
      if (count > 20) {
        issues.push({
          resource: domain,
          issue: `${count} requests to ${domain}`,
          severity: 'major',
          recommendation: 'Bundle resources or use HTTP/2 server push',
          impact: 'Excessive requests add connection overhead',
        });
      }
    }

    return issues;
  }

  private shortenUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      return path.length > 60 ? '...' + path.slice(-57) : path;
    } catch {
      return url.length > 60 ? '...' + url.slice(-57) : url;
    }
  }
}
```

### Step 5: Test Resource Waterfall

```typescript
// tests/performance/resource-waterfall.spec.ts
import { test, expect } from '@playwright/test';
import { MetricsCollector } from '../helpers/metrics-collector';
import { WaterfallAnalyzer } from '../helpers/waterfall-analyzer';

test.describe('Resource Waterfall Analysis', () => {
  const collector = new MetricsCollector();
  const analyzer = new WaterfallAnalyzer();

  test('homepage has no critical waterfall issues', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const resources = await collector.collectResourceTimings(page);
    const issues = analyzer.analyze(resources);

    const critical = issues.filter((i) => i.severity === 'critical');
    if (critical.length > 0) {
      const details = critical.map((i) => `${i.resource}: ${i.issue}`).join('\n');
      expect.soft(critical.length, `Critical waterfall issues:\n${details}`).toBe(0);
    }
  });

  test('no JavaScript bundle exceeds 300KB', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const resources = await collector.collectResourceTimings(page);

    const jsResources = resources.filter(
      (r) => r.type === 'script' || r.name.endsWith('.js')
    );

    for (const js of jsResources) {
      const sizeKB = js.transferSize / 1024;
      expect
        .soft(sizeKB, `JS bundle ${js.name} is ${sizeKB.toFixed(0)}KB`)
        .toBeLessThanOrEqual(300);
    }
  });

  test('no single image exceeds 200KB', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const resources = await collector.collectResourceTimings(page);

    const images = resources.filter(
      (r) => r.type === 'img' || /\.(jpg|jpeg|png|gif|webp|avif)/i.test(r.name)
    );

    for (const img of images) {
      const sizeKB = img.transferSize / 1024;
      expect
        .soft(sizeKB, `Image ${img.name} is ${sizeKB.toFixed(0)}KB`)
        .toBeLessThanOrEqual(200);
    }
  });

  test('critical fonts are preloaded within 1 second', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const resources = await collector.collectResourceTimings(page);

    const fonts = resources.filter(
      (r) => r.type === 'font' || /\.(woff2?|ttf|otf)(\?|$)/i.test(r.name)
    );

    for (const font of fonts) {
      expect
        .soft(
          font.startTime,
          `Font ${font.name} started loading at ${font.startTime.toFixed(0)}ms`
        )
        .toBeLessThan(1500);
    }
  });
});
```

### Step 6: Test Third-Party Script Impact

```typescript
// tests/performance/third-party-impact.spec.ts
import { test, expect } from '@playwright/test';
import { MetricsCollector } from '../helpers/metrics-collector';

test.describe('Third-Party Script Impact', () => {
  const collector = new MetricsCollector();

  test('page without third-party scripts has fast LCP', async ({ page }) => {
    const firstPartyDomain = new URL(
      process.env.BASE_URL || 'http://localhost:3000'
    ).hostname;

    await page.route('**/*', async (route) => {
      try {
        const domain = new URL(route.request().url()).hostname;
        if (domain !== firstPartyDomain && domain !== 'localhost') {
          await route.abort();
          return;
        }
      } catch {}
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'load' });
    const metrics = await collector.collectCoreWebVitals(page);

    if (metrics.lcp !== null) {
      expect(metrics.lcp).toBeLessThan(2500);
    }
  });

  test('third-party overhead adds less than 500ms to LCP', async ({ browser }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const firstPartyDomain = new URL(baseUrl).hostname;

    // Measure without third-party scripts
    const cleanCtx = await browser.newContext();
    const cleanPage = await cleanCtx.newPage();
    await cleanPage.route('**/*', async (route) => {
      try {
        const domain = new URL(route.request().url()).hostname;
        if (domain !== firstPartyDomain && domain !== 'localhost') {
          await route.abort();
          return;
        }
      } catch {}
      await route.continue();
    });
    await cleanPage.goto('/', { waitUntil: 'load' });
    const cleanMetrics = await collector.collectCoreWebVitals(cleanPage);
    await cleanCtx.close();

    // Measure with all scripts
    const fullCtx = await browser.newContext();
    const fullPage = await fullCtx.newPage();
    await fullPage.goto('/', { waitUntil: 'load' });
    const fullMetrics = await collector.collectCoreWebVitals(fullPage);
    await fullCtx.close();

    if (cleanMetrics.lcp !== null && fullMetrics.lcp !== null) {
      const overhead = fullMetrics.lcp - cleanMetrics.lcp;
      expect(overhead).toBeLessThan(500);
    }
  });

  test('third-party request count within budget', async ({ page }) => {
    const firstPartyDomain = new URL(
      process.env.BASE_URL || 'http://localhost:3000'
    ).hostname;

    const thirdPartyRequests: string[] = [];
    page.on('request', (req) => {
      try {
        const domain = new URL(req.url()).hostname;
        if (domain !== firstPartyDomain && domain !== 'localhost') {
          thirdPartyRequests.push(req.url());
        }
      } catch {}
    });

    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(5000);

    expect(thirdPartyRequests.length).toBeLessThanOrEqual(10);
  });
});
```

### Step 7: Test Mobile Performance with CPU Throttling

```typescript
// tests/performance/mobile-performance.spec.ts
import { test, expect, devices } from '@playwright/test';
import { MetricsCollector } from '../helpers/metrics-collector';
import { BudgetEnforcer, defaultBudget } from '../helpers/budget-enforcer';

test.describe('Mobile Performance', () => {
  test.use({ ...devices['Pixel 7'] });

  const collector = new MetricsCollector();

  test('homepage LCP on mobile under 4 seconds', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.goto('/', { waitUntil: 'load' });
    const metrics = await collector.collectCoreWebVitals(page);

    if (metrics.lcp !== null) {
      expect(metrics.lcp).toBeLessThan(4000);
    }

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });

  test('mobile CLS under 0.1', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(5000);

    const metrics = await collector.collectCoreWebVitals(page);
    if (metrics.cls !== null) {
      expect(metrics.cls).toBeLessThan(0.1);
    }
  });

  test('no image exceeds 200KB on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const resources = await collector.collectResourceTimings(page);

    const images = resources.filter(
      (r) => r.type === 'img' || /\.(jpg|jpeg|png|gif|webp|avif)/i.test(r.name)
    );

    for (const img of images) {
      const sizeKB = img.transferSize / 1024;
      expect
        .soft(sizeKB, `Image ${img.name} is ${sizeKB.toFixed(0)}KB`)
        .toBeLessThanOrEqual(200);
    }
  });

  test('total transfer size under 1.5MB on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    const metrics = await collector.collectCoreWebVitals(page);

    const transferKB = metrics.totalTransferSize / 1024;
    expect(transferKB).toBeLessThan(1500);
  });
});
```

### Step 8: Build Performance Report Generator

```typescript
// helpers/report-generator.ts
import * as fs from 'fs';
import { CoreWebVitals } from './metrics-collector';
import { BudgetViolation } from './budget-enforcer';
import { WaterfallIssue } from './waterfall-analyzer';

export interface PerformanceReport {
  timestamp: string;
  pages: Array<{
    url: string;
    metrics: CoreWebVitals;
    violations: BudgetViolation[];
    waterfallIssues: WaterfallIssue[];
  }>;
  summary: {
    totalPages: number;
    totalViolations: number;
    criticalViolations: number;
    averageLCP: number;
    averageCLS: number;
    overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
}

export class ReportGenerator {
  private pages: PerformanceReport['pages'] = [];

  addPageResult(
    url: string,
    metrics: CoreWebVitals,
    violations: BudgetViolation[],
    waterfallIssues: WaterfallIssue[]
  ): void {
    this.pages.push({ url, metrics, violations, waterfallIssues });
  }

  generate(): PerformanceReport {
    const totalViolations = this.pages.reduce((s, p) => s + p.violations.length, 0);
    const criticalViolations = this.pages.reduce(
      (s, p) => s + p.violations.filter((v) => v.severity === 'critical').length,
      0
    );

    const lcpValues = this.pages.map((p) => p.metrics.lcp).filter((v): v is number => v !== null);
    const clsValues = this.pages.map((p) => p.metrics.cls).filter((v): v is number => v !== null);

    const avgLCP = lcpValues.length ? lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length : 0;
    const avgCLS = clsValues.length ? clsValues.reduce((a, b) => a + b, 0) / clsValues.length : 0;

    let grade: PerformanceReport['summary']['overallGrade'];
    if (criticalViolations === 0 && avgLCP < 2500 && avgCLS < 0.1) grade = 'A';
    else if (criticalViolations <= 1 && avgLCP < 4000 && avgCLS < 0.25) grade = 'B';
    else if (criticalViolations <= 3 && avgLCP < 6000) grade = 'C';
    else if (criticalViolations <= 5) grade = 'D';
    else grade = 'F';

    return {
      timestamp: new Date().toISOString(),
      pages: this.pages,
      summary: { totalPages: this.pages.length, totalViolations, criticalViolations, averageLCP: avgLCP, averageCLS: avgCLS, overallGrade: grade },
    };
  }

  writeJSON(path: string): void {
    fs.writeFileSync(path, JSON.stringify(this.generate(), null, 2));
  }

  writeHTML(path: string): void {
    const report = this.generate();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Performance Report - Grade: ${report.summary.overallGrade}</title>
  <style>
    body { font-family: system-ui; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
    .grade { font-size: 3rem; font-weight: bold; }
    .grade-A, .grade-B { color: #16a34a; }
    .grade-C { color: #d97706; }
    .grade-D, .grade-F { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .critical { color: #dc2626; } .warning { color: #d97706; }
  </style>
</head>
<body>
  <h1>Performance Report</h1>
  <p class="grade grade-${report.summary.overallGrade}">Grade: ${report.summary.overallGrade}</p>
  <p>Pages: ${report.summary.totalPages} | Violations: ${report.summary.totalViolations} (${report.summary.criticalViolations} critical)</p>
  <p>Avg LCP: ${report.summary.averageLCP.toFixed(0)}ms | Avg CLS: ${report.summary.averageCLS.toFixed(3)}</p>
  ${report.pages.map((p) => `
  <h2>${p.url}</h2>
  <table>
    <tr><td>LCP</td><td>${p.metrics.lcp?.toFixed(0) ?? 'N/A'}ms</td></tr>
    <tr><td>CLS</td><td>${p.metrics.cls?.toFixed(3) ?? 'N/A'}</td></tr>
    <tr><td>FCP</td><td>${p.metrics.fcp?.toFixed(0) ?? 'N/A'}ms</td></tr>
    <tr><td>TTFB</td><td>${p.metrics.ttfb?.toFixed(0) ?? 'N/A'}ms</td></tr>
    <tr><td>TBT</td><td>${p.metrics.tbt?.toFixed(0) ?? 'N/A'}ms</td></tr>
    <tr><td>Resources</td><td>${p.metrics.resourceCount}</td></tr>
    <tr><td>Transfer</td><td>${(p.metrics.totalTransferSize / 1024).toFixed(0)}KB</td></tr>
  </table>
  ${p.violations.length ? `<h3>Violations</h3><ul>${p.violations.map((v) => `<li class="${v.severity}">${v.message}</li>`).join('')}</ul>` : '<p>No violations.</p>'}
  `).join('')}
</body>
</html>`;
    fs.writeFileSync(path, html);
  }
}
```

## Configuration

### Playwright Configuration for Performance Testing

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/performance',
  timeout: 120000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/performance-results.json' }],
  ],
  projects: [
    {
      name: 'perf-desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'perf-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
```

### Performance Budget JSON File

```json
{
  "budgets": {
    "lcp": { "good": 2500, "poor": 4000 },
    "cls": { "good": 0.1, "poor": 0.25 },
    "inp": { "good": 200, "poor": 500 },
    "fcp": { "good": 1800, "poor": 3000 },
    "ttfb": { "good": 800, "poor": 1800 },
    "tbt": { "good": 200, "poor": 600 },
    "maxJsBundleSizeKB": 300,
    "maxCssBundleSizeKB": 100,
    "maxImageSizeKB": 200,
    "maxTotalTransferSizeKB": 1500,
    "maxResourceCount": 50,
    "maxThirdPartyRequests": 10
  },
  "criticalPages": ["/", "/products", "/checkout", "/dashboard"]
}
```

## Best Practices

1. **Run performance tests in isolation.** Other tests consume CPU and memory, skewing results. Use a dedicated CI job with workers: 1.

2. **Disable Playwright tracing and video during performance tests.** Recording adds overhead that inflates all timing metrics.

3. **Measure at multiple network speeds.** Test on broadband (50Mbps), 4G (12Mbps), and slow 3G (1.5Mbps) using Chrome DevTools Protocol network emulation.

4. **Throttle CPU to simulate real devices.** Use CDPSession to set CPU throttle rate of 4x for mid-range mobile simulation.

5. **Warm the cache before measuring repeat-visit performance.** Navigate twice and capture metrics on the second visit for cache-warm measurements.

6. **Take multiple samples and report the median.** Single measurements have high variance. Take 3-5 samples per page and use the median.

7. **Track metrics over time in CI.** Store results from every run. Graph trends to catch gradual degradation before it crosses thresholds.

8. **Audit the critical rendering path.** Identify the LCP element and trace every resource that must load before it renders. Each resource in that chain is a bottleneck.

9. **Serve images in modern formats.** WebP and AVIF provide superior compression. A single unoptimized PNG hero image can double total page weight.

10. **Preload critical resources.** Fonts, above-the-fold images, and critical CSS should use link rel="preload" to eliminate discovery delay.

11. **Lazy-load below-the-fold content.** Images and iframes below the viewport should use loading="lazy" or Intersection Observer.

12. **Break long tasks into smaller chunks.** Use requestIdleCallback or setTimeout to yield the main thread and reduce Total Blocking Time.

## Anti-Patterns to Avoid

1. **Testing only on developer hardware.** Developer machines are not representative. Always use CPU and network throttling.

2. **Using Lighthouse score as the sole metric.** Lighthouse is useful but synthetic. Real-page Core Web Vitals under realistic conditions matter more.

3. **Ignoring third-party script impact.** Third-party scripts often account for 50%+ of page weight. Audit them separately.

4. **No performance budget.** Without explicit budgets, performance degrades silently. Define and enforce budgets from day one.

5. **Measuring only first-visit performance.** Repeat visitors rely on caching. Measure cache-warm performance separately.

6. **Loading all JavaScript upfront.** A single massive bundle forces the browser to parse megabytes before rendering anything.

7. **Unoptimized images.** Serving 2MB PNGs when 50KB WebP suffices is the most common web performance problem.

8. **Render-blocking CSS in the head.** All CSS in the head blocks rendering. Inline critical CSS and defer the rest.

9. **Synchronous third-party scripts.** A blocking script tag halts the parser. Always use async or defer.

10. **No font-display strategy.** Fonts without font-display: swap cause invisible text until the font loads.

## Debugging Tips

1. **Use Chrome DevTools Performance tab** to record page loads and identify the longest tasks, the critical rendering path, and the LCP moment.

2. **Enable the Web Vitals Chrome extension** for real-time Core Web Vitals overlay during manual testing.

3. **Use the Coverage tab** to find unused JavaScript and CSS. If over 50% of a bundle is unused, it needs splitting.

4. **Inspect the Network waterfall** to find sequential request chains where each request depends on the previous one completing.

5. **Use Lighthouse's Treemap** to visualize which libraries contribute most to JavaScript bundle size.

6. **Check PerformanceObserver layout-shift entries** to identify which elements shift and when. The hadRecentInput property distinguishes user-initiated from unexpected shifts.

7. **Experience the page on Slow 3G.** Use the DevTools network preset to feel what mobile users experience.

8. **Profile server response time separately.** TTFB problems originate on the server. Use APM tools to find slow queries and missing caches.

9. **Test with an adblocker.** If performance improves dramatically, the third-party scripts need optimization or removal.

10. **Compare bundle sizes across releases.** Use bundlewatch or size-limit in CI to detect commits that increase bundle size beyond thresholds.
