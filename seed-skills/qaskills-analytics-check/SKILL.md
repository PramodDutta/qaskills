---
name: QASkills.sh Analytics Performance Check
description: Pull weekly/monthly performance metrics for qaskills.sh from Google Analytics 4 (GA4) and Google Search Console (GSC) via Claude in Chrome. Returns traffic, channels, top queries, top pages, growth deltas in a single report.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [analytics, ga4, search-console, seo, performance, qaskills, monitoring, reporting]
testingTypes: [monitoring, reporting]
frameworks: []
languages: []
domains: [web, seo, analytics]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# QASkills.sh Analytics Performance Check

You are an expert at pulling site performance data for **qaskills.sh** from Google Analytics 4 and Google Search Console. Use Claude in Chrome browser tools to navigate, capture, and synthesize metrics into a single weekly/monthly report. Goal: detect growth trends, traffic source health, ranking opportunities, and content gaps without manual clicking.

## Property Identifiers

| Tool | ID / URL |
|------|----------|
| **GA4 Property** | `qaskillssh` — property ID `528788664` (account `btc scrolltest` / 107190665) |
| **GA4 Measurement ID** | `G-DBRNT5VNQ3` |
| **Search Console** | Domain property `sc-domain:qaskills.sh` |
| **Site URL** | https://qaskills.sh |
| **Login email** | luckydutta96@gmail.com (or thetestingacademy@gmail.com for GSC if access needed) |

## Core Principles

1. **Always use last 28 days by default** — GA4 default. Comparable week-over-week and month-over-month.
2. **Capture 3 reports minimum** — Home (top-level), Traffic Acquisition (channel mix), Search Console Queries (ranking), Landing Pages (content perf).
3. **Use `browser_batch`** — Each report is navigate + wait + screenshot. Batch saves 3-5x time.
4. **Look for anomalies** — GA4 highlights anomalies (e.g. "Direct surged on May 19"). Capture them.
5. **Compute deltas** — Compare against prior-period if available. Surface % growth/decline.
6. **Brand vs non-brand split** — In GSC queries, brand = `qaskills*`, `qa skills*`. Non-brand reveals true SEO health.
7. **Output a markdown report** — Tables for channels, top queries, top pages. Never dump screenshots into report.

## Workflow

### Step 1: Open browser tab

```js
mcp__Claude_in_Chrome__tabs_context_mcp({ createIfEmpty: true })
```

### Step 2: GA4 Home — capture top-line + realtime

Navigate to:
```
https://analytics.google.com/analytics/web/#/a107190665p528788664/reports/intelligenthome
```

Wait 5s for chart to render, screenshot. Extract:
- **Active users (today)** + % change vs prior day
- **Event count (today)** + % change
- **Realtime active users (last 30 min)**
- **Top realtime countries**

### Step 3: GA4 Traffic Acquisition — channel mix (28d)

From Home, click "Traffic acquisition" tile (recently accessed) OR navigate sidebar: `Generate leads → Traffic acquisition`.

Wait 5s. Close any "Add annotations" or "Generate leads reports" popup with `X`. Scroll down to reveal data table.

Extract for each channel: **Sessions**, **Engaged sessions**, **Engagement rate**, **Avg engagement time**, **Events**:

| Channel | Sessions | % | Engagement Rate | Avg Time |
|---------|----------|---|-----------------|----------|
| Organic Search | ... | ... | ... | ... |
| Direct | ... | ... | ... | ... |
| Referral | ... | ... | ... | ... |
| Organic Social | ... | ... | ... | ... |
| Email | ... | ... | ... | ... |
| Unassigned | ... | ... | ... | ... |

Also capture any AI anomaly insight banner at top (e.g. "X surged on date Y").

### Step 4: Search Console Queries — top ranking queries (28d)

Click sidebar: `Search Console → Queries`. Wait 5s, scroll down to data table.

Extract top 10 queries with:

| # | Query | Clicks | Impressions | CTR | Avg Position |
|---|-------|--------|-------------|-----|--------------|
| 1 | ... | ... | ... | ... | ... |

Also note:
- **Total queries indexed** (top right of table, e.g. "1-10 of 1312")
- **Total clicks** + **Total impressions** + **Avg CTR** + **Avg position**
- **Brand vs non-brand split**: count clicks where query contains `qaskill` vs all others

### Step 5: Landing Page Report (28d)

Click sidebar: `Generate leads → Landing page`. Wait 5s. Scroll to data table.

Extract top 10 landing pages:

| # | Landing Page | Sessions | Active Users | Avg Time | Notes |
|---|--------------|----------|--------------|----------|-------|
| 1 | / | ... | ... | ... | homepage |

Flag pages with avg time < 20s as **possible bounce issue**.

### Step 6: Synthesize Report

Output single markdown report with sections:

```markdown
# QASkills.sh Performance Report — [Date Range]

## Top-Line Metrics (28d)
| Metric | Value | Δ vs Prior 28d |
|--------|-------|---------------|
| Active Users | ... | ... |
| Sessions | ... | ... |
| Engagement Rate | ... | ... |
| Total Events | ... | ... |

## Today's Snapshot
- Active users today: X (Y% vs yesterday)
- Realtime: N users
- Top countries: ...

## Traffic Channels (28d)
[channel table]

## Search Console (28d)
- Total clicks: ... | Impressions: ... | CTR: ...% | Avg pos: ...
- Total queries indexed: ...
- Brand share: X% | Non-brand share: Y%

### Top 10 Queries
[query table]

## Top Landing Pages
[landing page table]

## Anomalies & Insights
- [Anomaly 1 from GA4 banner]
- [Page with bounce signal]
- [Growing query opportunities]

## Next Actions
- [Specific SEO/content recommendations based on data]
```

## Reference Snapshot (May 21, 2026)

For comparison/sanity check — this is what healthy growth looked like:

| Metric | 28d (Mar 16 - Apr 12) | 28d (Apr 23 - May 20) | Growth |
|--------|----------------------|----------------------|--------|
| Sessions | 5,945 | 9,101 | **+53%** |
| Organic Search | 1,384 | 4,399 | **+218%** |
| Direct | 3,811 | 3,844 | flat |
| Referral | 534 | 512 | flat |
| GSC clicks | 717 | 869 | +21% |
| GSC impressions | ~8,800 | 14,869 | +69% |
| GSC queries indexed | 134 | 1,312 | **+879%** |

**Top GSC queries (28d, May 20):**
1. qaskills.sh — 160 clicks, 91% CTR, pos 1.0
2. qa skills — 81 clicks, 21% CTR, pos 3.88
3. qaskills — 81, 74%, 1.01
4. qa skills claude — 68, 51%, 1.39
5. claude qa skill — 45, 27%, 2.72
6. claude qa skills — 34, 34%, 2.38
7. qa skill claude — 32, 39%, 1.59
8. claude skills for qa — 27, 35%, 1.86
9. qaskill — 27, 69%, 1.31
10. qa skills sh — 26, 79%, 1.00

**Top landing pages (28d, May 20):**
1. / (homepage) — 1,828 sessions, 1m 23s
2. (not set) — 1,357
3. /skills — 982, 1m 05s
4. /skills/thetestingacademy/playwright-e2e — 735, 23s (bounce signal)
5. /agents/claude-code — 715, 1m 10s
6. /blog/must-have-qa-skills-claude-code-2026 — 538, 59s
7. /blog/state-of-ai-powered-testing-2026 — 133, 20s
8. /blog/ai-qa-skills-directory-2026 — 108, 1m 11s
9. /categories/e2e-testing — 95, 1m 04s
10. /how-to-publish — 85, 4s (broken/bounce)

## Direct Report URLs (Bookmarkable)

```
# GA4 Home
https://analytics.google.com/analytics/web/#/a107190665p528788664/reports/intelligenthome

# Traffic Acquisition
https://analytics.google.com/analytics/web/#/a107190665p528788664/reports/explorer?r=lifecycle-traffic-acquisition-v2

# Pages and Screens
https://analytics.google.com/analytics/web/#/a107190665p528788664/reports/explorer?r=all-pages-and-screens&collectionId=business-objectives

# Landing Page
https://analytics.google.com/analytics/web/#/a107190665p528788664/reports/explorer?r=landing-page&collectionId=business-objectives

# Search Console Queries (in GA4)
https://analytics.google.com/analytics/web/#/a107190665p528788664/reports/explorer?r=search-query&collectionId=search-console

# Google Search Console (native)
https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Aqaskills.sh
```

## Best Practices

1. **Run weekly** — Same day each week (Monday recommended) for consistent comparisons.
2. **Compare 28d not 7d** — Less noise. Weekly periods are too volatile for trend detection.
3. **Always include AI Insights banner** — GA4's anomaly detection is genuinely useful.
4. **Highlight bounce signals** — Pages with avg time < 20s on top 10 landing list are red flags.
5. **Track query position changes** — Position movement from 4 → 2 is bigger win than +5 clicks.
6. **Separate brand from non-brand** — `qaskill*` traffic is brand recall. Non-brand is true SEO health.
7. **Cross-check GA4 Search Console widget with native GSC** — Sometimes counts differ due to indexing.
8. **Note today's realtime** — Live signal for whether banner/launch traffic is flowing.
9. **Use `browser_batch` for navigation** — Cuts wall time by 3-5x vs individual clicks.
10. **Save report to file** — `/Users/promode/qaskills/.analytics-reports/YYYY-MM-DD.md` for history.

## Anti-Patterns

1. **Reporting only 7d** — Too noisy. Use 28d for trends.
2. **Dumping raw screenshots** — Always extract numbers into markdown tables.
3. **Ignoring "(not set)" landing pages** — Often means missing UTMs from social/email. Worth flagging.
4. **Treating brand and non-brand the same** — Brand traffic doesn't measure SEO health.
5. **Skipping prior-period delta** — A number without context is useless.
6. **Manual clicking through reports** — Slow. Use `browser_batch` or direct deeplinks.
7. **Trusting realtime as a daily metric** — Realtime is for spot-check only, not trend.
8. **Reporting impressions without position** — Impressions without position context is misleading.
9. **Capturing 100+ landing pages** — Top 10 is enough. Note the long-tail total.
10. **Missing the popups** — Close annotation/feedback popups before screenshotting tables.

## Quick Commands

```bash
# Save analytics report to dated file
mkdir -p ~/qaskills/.analytics-reports
date_today=$(date +%Y-%m-%d)
# (paste markdown report content here)
```

## When to Trigger This Skill

Use when user asks:
- "How is qaskills doing?"
- "Show me last week's analytics"
- "Search Console performance"
- "Top queries / top pages"
- "Traffic report"
- "GA4 check"
- "SEO performance"
