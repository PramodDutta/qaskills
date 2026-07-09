---
name: Chrome DevTools MCP Performance
description: Teach agents to use the Chrome DevTools MCP server for performance testing with traces, Core Web Vitals, throttling, and evidence-based analysis.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [chrome-devtools, mcp, performance, core-web-vitals, tracing, throttling]
testingTypes: [performance]
frameworks: []
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Chrome DevTools MCP Performance Skill

You are a web performance engineer who drives Chrome DevTools through an MCP server to capture traces, measure Core Web Vitals, analyze network and CPU bottlenecks, and turn observations into targeted fixes.

## Core Principles

1. **Measure before changing code**: Every optimization starts with a reproducible trace or metric snapshot.
2. **Throttle like real users**: Use network and CPU profiles that match the target user base.
3. **Separate lab and field data**: DevTools traces explain causes, while real-user monitoring confirms customer impact.
4. **Optimize the critical path**: Prioritize LCP resources, render blocking scripts, hydration, and long tasks.
5. **Keep evidence attached**: Save trace files, screenshots, and metric summaries with the issue.
6. **Compare against a baseline**: A single trace is less useful than before and after evidence.
7. **Avoid vanity tuning**: Improve user-visible waits, not only synthetic scores.
8. **Turn findings into budgets**: Convert recurring problems into CI or monitoring thresholds.

## Setup

Install the MCP server and prepare a local performance target.

```bash
npm install --save-dev @playwright/test typescript
npm pkg set scripts.perf:serve='vite --host 127.0.0.1'
npm pkg set scripts.perf:smoke='tsx scripts/perf-smoke.ts'
```

Configure your agent to expose Chrome DevTools MCP according to your MCP client.

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

## Project Structure

Keep performance evidence and scripts outside normal E2E tests.

```text
performance/
  traces/
  budgets/
    web-vitals.json
  notes/
    checkout-lcp.md
scripts/
  perf-smoke.ts
  summarize-trace.ts
```

## Agent Workflow

Use this loop when asked to investigate performance.

1. Open the target URL in Chrome through the MCP tool.
2. Clear cache or define whether the run is warm or cold.
3. Apply network and CPU throttling.
4. Start a performance trace.
5. Reload or perform the critical journey.
6. Stop the trace and export it.
7. Extract LCP, CLS, INP-related long tasks, requests, and main-thread blocks.
8. Identify the largest contributor.
9. Make one focused code change.
10. Capture the same trace again.
11. Compare before and after.
12. Recommend a budget if the issue can regress.

## Metric Smoke Script

Use Playwright to collect browser-side performance entries for quick checks.

```typescript
// scripts/perf-smoke.ts
import { chromium } from '@playwright/test';

const url = process.env.PERF_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return {
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    load: Math.round(nav.loadEventEnd - nav.startTime),
    transferKb: Math.round(resources.reduce((sum, item) => sum + item.transferSize, 0) / 1024),
    resourceCount: resources.length,
  };
});

console.log(JSON.stringify(metrics, null, 2));
await browser.close();
```

## Budget Check

Turn repeated findings into a simple local budget.

```typescript
// scripts/check-performance-budget.ts
type Metrics = {
  domContentLoaded: number;
  load: number;
  transferKb: number;
  resourceCount: number;
};

const budget = {
  domContentLoaded: 2000,
  load: 3500,
  transferKb: 900,
  resourceCount: 90,
};

export function assertBudget(metrics: Metrics): void {
  const failures = Object.entries(budget).filter(([key, limit]) => {
    return metrics[key as keyof Metrics] > limit;
  });

  if (failures.length > 0) {
    throw new Error(`Performance budget failed: ${JSON.stringify(failures)}`);
  }
}
```

## Trace Review Guide

When reviewing a trace, inspect these areas in order.

1. Largest Contentful Paint element and its resource.
2. Render blocking CSS and synchronous scripts.
3. Main-thread long tasks over 50 ms.
4. Hydration work and repeated layout.
5. Image sizing, compression, and priority.
6. Font loading behavior.
7. Third-party script cost.
8. Cache headers.
9. JavaScript bundle chunks.
10. Network waterfall gaps.

## Reference Table

| Signal | DevTools Evidence | Likely Fix |
|---|---|---|
| Slow LCP | LCP element and waterfall | Preload image, reduce server time, optimize hero |
| High CLS | Layout shift records | Reserve dimensions, avoid late banners |
| Poor INP | Long tasks near input | Split JavaScript and reduce handler work |
| High TTFB | Navigation timing | Cache, optimize backend, use edge |
| Large JS | Coverage and network | Code split and remove unused libraries |
| Slow fonts | Waterfall and rendering | Preload, swap, subset fonts |

## Common Mistakes

1. Taking one unthrottled trace on a fast laptop and calling it done.
2. Optimizing Lighthouse score without checking user journeys.
3. Ignoring third-party scripts.
4. Comparing cold cache before with warm cache after.
5. Missing the actual LCP element.
6. Shipping a budget without stakeholder agreement.
7. Treating Playwright timing as Core Web Vitals field data.
8. Forgetting mobile CPU cost.
9. Making many changes before retesting.
10. Not saving trace artifacts.

## Checklist

- [ ] The run used a documented URL and environment.
- [ ] Cache state was defined.
- [ ] Network and CPU throttling were selected intentionally.
- [ ] A trace was captured before changes.
- [ ] LCP, CLS, and input-related long tasks were reviewed.
- [ ] One primary bottleneck was identified.
- [ ] A focused change was made.
- [ ] A matching after trace was captured.
- [ ] Results were compared against baseline.
- [ ] A recurring risk was converted into a budget.
