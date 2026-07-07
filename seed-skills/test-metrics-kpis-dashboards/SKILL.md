---
name: Test Metrics KPIs and Dashboards
description: Define and build QA metrics that drive decisions, escape rate, flake rate, coverage of risk, MTTR for test failures, release readiness scorecards, anti-gaming rules, and dashboard layouts with SQL and query examples.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [test-metrics, kpis, dashboards, escape-rate, flake-rate, coverage, dora, reporting, quality-gates]
testingTypes: [reporting, strategy]
frameworks: []
languages: [sql, python, typescript]
domains: [web, api, backend, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Test Metrics, KPIs and Dashboards Skill

You are an expert QA lead who builds measurement systems for testing. When the user asks which QA metrics to track, how to compute them, or how to build a quality dashboard, follow these instructions.

## Core Principles

1. **A metric exists to change a decision.** Before adding one, name the weekly decision it feeds; otherwise it is decoration.
2. **Pair every metric with its anti-gaming partner.** Any single number optimized alone gets gamed (coverage% pairs with mutation score; test count pairs with escape rate).
3. **Trends beat snapshots.** Report 4-12 week trends with annotations for releases and process changes.
4. **Segment or drown.** Whole-org averages hide everything; slice by team, component, and severity.
5. **Never weaponize.** Metrics that rank individuals get gamed within a quarter; measure systems, not people.

## The Core Metric Set

| Metric | Definition | Decision it feeds | Gaming partner |
|---|---|---|---|
| Escape rate | Prod bugs / (prod + pre-prod bugs) per period | Where to add test depth | Severity-weight it |
| Flake rate | % CI test runs failing then passing on retry | Trust in the suite; quarantine budget | Track quarantined count too |
| Diff coverage | % changed lines covered in each PR | Merge gate | Mutation score sampling |
| Time to feedback | Commit -> first meaningful test signal | CI investment | Suite depth (smoke vs full) |
| MTTR (red build) | Red main -> green main duration | On-call and triage process | Revert-vs-fix ratio |
| Defect fix lead time | Bug Triaged -> Verified, by severity | SLA setting per severity | Reopen rate |
| Reopen rate | % bugs reopened after Resolved | Fix quality, verification rigor | none needed |
| Automation coverage of P1 flows | % of P1 user flows with green automated coverage | Regression risk before release | Flake rate of those tests |

Deliberately absent: raw test count, raw bug count found (rewards noise), coverage% as a target (Goodhart magnet; use as gap-finder).

## Computing Them (examples)

```sql
-- Escape rate, monthly, severity-weighted (Jira export or warehouse)
SELECT date_trunc('month', created_at) AS month,
       SUM(CASE WHEN label_found_in_prod THEN sev_weight ELSE 0 END)::float
         / NULLIF(SUM(sev_weight), 0) AS weighted_escape_rate
FROM bugs
CROSS JOIN LATERAL (SELECT CASE severity
     WHEN 'S1' THEN 8 WHEN 'S2' THEN 4 WHEN 'S3' THEN 2 ELSE 1 END AS sev_weight) w
GROUP BY 1 ORDER BY 1;

-- Flake rate from CI runs table (any CI that logs retries)
SELECT week, COUNT(*) FILTER (WHERE failed_then_passed)::float / COUNT(*) AS flake_rate
FROM test_runs GROUP BY week;
```

```typescript
// Time-to-feedback from GitHub Actions API
const runs = await octokit.actions.listWorkflowRuns({ owner, repo, workflow_id: 'ci.yml', per_page: 100 });
const feedback = runs.data.workflow_runs.map(r =>
  (new Date(r.updated_at).getTime() - new Date(r.run_started_at!).getTime()) / 60000);
console.log('p50/p90 minutes:', percentile(feedback, 50), percentile(feedback, 90));
```

Source-of-truth rules: metrics compute from systems of record (CI database, Jira/TestRail exports, coverage artifacts), never hand-maintained spreadsheets; the queries live in git next to the dashboard config.

## Release Readiness Scorecard

A go/no-go table, filled by queries not opinions:

```text
Release 2026.07 readiness
  P1 flow automation green:        24/24        PASS
  Open S1/S2 against fixVersion:   0            PASS
  Diff coverage this release:      86% (min 80) PASS
  Flake rate (7d):                 1.8% (max 2) PASS
  Escapes from LAST release fixed: 5/6          FAIL -> decision needed
  Perf budget (p95 checkout):      2.1s (max 3) PASS
Verdict: conditional GO; SHOP-991 accepted as known-issue by PM (link)
```

Every FAIL requires a named human accepting the risk in writing. The scorecard template is versioned; thresholds change by PR, not by meeting-room pressure.

## Dashboard Layout (one page, four rows)

1. **Now:** main branch status, open S1/S2 count, current flake rate (traffic lights)
2. **Trends (12 weeks):** escape rate, created-vs-resolved bugs, flake rate, time-to-feedback (line charts, release markers annotated)
3. **Segments:** escapes by component (bar), reopen rate by team (bar), slowest 10 CI suites (table)
4. **Aging:** bugs In Progress > 14d, quarantined tests > 30d (lists with owners)

Build it where the data lives: Grafana over the CI/warehouse DB, or Jira dashboards for issue-derived metrics; do not screenshot-and-paste into slides, link the live board.

## Rollout Playbook

1. Start with THREE: escape rate, flake rate, time-to-feedback. Baseline 4 weeks silently before publishing.
2. Add the release scorecard on the next release; run it retrospectively on the previous one for calibration.
3. Review ritual: 20 minutes weekly, trends only, one action item max per metric.
4. Quarterly metric audit: kill any metric that changed no decision in 12 weeks (this rule keeps the system honest).

## Common Mistakes

- Coverage% as an OKR; teams hit 90% with assertion-free tests. Use diff coverage as a gate and mutation sampling as audit
- Bug counts as tester productivity; you get duplicate-splitting and severity inflation
- Dashboards nobody is scheduled to look at; the review ritual IS the product
- Averages without segmentation; one flaky suite hides behind fifty clean ones
- Changing metric definitions silently; version them, annotate the chart at the change point

## Checklist

- [ ] Each metric mapped to a weekly decision and paired with its anti-gaming partner
- [ ] Queries in git, computed from systems of record
- [ ] Release scorecard with written thresholds; FAILs need named risk acceptance
- [ ] One-page dashboard: now / trends / segments / aging, with release annotations
- [ ] Weekly 20-minute review ritual; quarterly kill-unused-metrics audit
