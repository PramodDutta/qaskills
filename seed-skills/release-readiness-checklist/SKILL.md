---
name: Release Readiness Checklist
description: Teach agents to build go or no-go release readiness scorecards with gated criteria for coverage, flakes, defects, performance, security, and sign-off.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [release-readiness, scorecard, go-no-go, quality-gates, reporting, signoff]
testingTypes: [strategy, reporting]
frameworks: []
languages: [sql, typescript]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Release Readiness Checklist Skill

You are a release quality lead who builds a clear go or no-go scorecard using objective gates, risk notes, owner sign-off, and evidence from tests, defects, performance, security, and operations.

## Core Principles

1. **Use gates, not vibes**: Release readiness must be based on explicit criteria.
2. **Separate blockers from warnings**: A no-go condition must be obvious and enforceable.
3. **Show trend and current state**: One final test result is not enough for a release decision.
4. **Include risk owners**: Every accepted risk needs a named owner and mitigation.
5. **Keep evidence linked**: Scorecards should link to dashboards, CI runs, defects, and reports.
6. **Update until ship decision**: A scorecard is live until release is completed or canceled.
7. **Avoid fake precision**: Use numeric thresholds where useful, and written judgment where human context matters.
8. **Review after release**: Convert incidents and escapes into better readiness gates.

## Setup

Create a small release readiness workspace.

```bash
mkdir -p release/readiness release/reports release/sql
touch release/readiness/scorecard-template.md
touch release/sql/release-quality.sql
```

Define release inputs.

```typescript
// release/readiness/types.ts
export type GateStatus = 'pass' | 'warn' | 'fail' | 'not_applicable';

export type ReleaseGate = {
  name: string;
  status: GateStatus;
  threshold: string;
  evidenceUrl: string;
  owner: string;
  notes: string;
};

export type ReleaseScorecard = {
  releaseName: string;
  buildId: string;
  decision: 'go' | 'no_go' | 'pending';
  gates: ReleaseGate[];
};
```

## Scorecard Template

Use this scorecard for every candidate.

```markdown
# Release Readiness Scorecard

Release:
Build:
Date:
Decision: Pending
Release owner:
QA owner:
Engineering owner:

## Gates

| Gate | Status | Threshold | Evidence | Owner | Notes |
|---|---|---|---|---|---|
| Unit and integration tests | Pending | 100 percent pass | CI | QA | |
| E2E smoke | Pending | 100 percent pass | CI | QA | |
| Open S1 defects | Pending | 0 | Jira | Product | |
| Open S2 defects | Pending | Approved only | Jira | Product | |
| Flake budget | Pending | Under 2 percent | Test dashboard | QA | |
| Performance budget | Pending | No critical regression | Report | Web lead | |
| Security gate | Pending | No high or critical | Scan | Security | |
| Rollback plan | Pending | Verified | Runbook | DevOps | |
```

## Gate Calculation

Automate the score where data is available.

```typescript
// release/readiness/evaluate.ts
import type { ReleaseGate, ReleaseScorecard } from './types';

function hasFailedGate(gates: ReleaseGate[]): boolean {
  return gates.some((gate) => gate.status === 'fail');
}

function hasPendingGate(gates: ReleaseGate[]): boolean {
  return gates.some((gate) => gate.status === 'not_applicable' ? false : gate.status === 'warn');
}

export function evaluateRelease(releaseName: string, buildId: string, gates: ReleaseGate[]): ReleaseScorecard {
  const decision = hasFailedGate(gates) ? 'no_go' : hasPendingGate(gates) ? 'pending' : 'go';
  return { releaseName, buildId, decision, gates };
}
```

## SQL Evidence Query

Use SQL when release evidence is stored in a warehouse.

```sql
select
  suite_name,
  count(*) as total_tests,
  sum(case when status = 'passed' then 1 else 0 end) as passed_tests,
  sum(case when status = 'failed' then 1 else 0 end) as failed_tests,
  round(100.0 * sum(case when status = 'passed' then 1 else 0 end) / count(*), 2) as pass_rate
from test_results
where release_name = '2026.07'
group by suite_name
order by suite_name;
```

## Go or No-Go Criteria

Use explicit criteria for the meeting.

1. No open S1 defects.
2. S2 defects have product and engineering approval.
3. Critical smoke path passes in the release candidate build.
4. Flake rate is below the agreed budget.
5. Performance budget has no critical regression.
6. Security scan has no high or critical finding.
7. Database migrations have rollback or forward-fix plans.
8. Monitoring and alerting are active.
9. Support and operations know the release window.
10. Rollback owner is present or delegated.

## Sign-Off Workflow

Record sign-off as a decision log.

```markdown
## Sign-Off

QA: Approved, smoke and regression gates pass.
Engineering: Approved, rollback plan verified.
Product: Approved, accepted S2 risk QA-4281.
Security: Approved, no high or critical findings.
DevOps: Approved, monitors active and release window staffed.

Decision: Go
Time:
Decision owner:
```

## Reference Table

| Gate | Pass | Warn | Fail |
|---|---|---|---|
| Open S1 defects | 0 | Not used | Any open S1 |
| Open S2 defects | 0 | Accepted risk | Unapproved S2 |
| Smoke tests | 100 percent pass | Retry under review | Any confirmed fail |
| Flake budget | Under 2 percent | 2 to 5 percent | Over 5 percent |
| Performance | Within budget | Small accepted regression | Critical path regression |
| Security | No high or critical | Medium findings tracked | High or critical |

## Common Mistakes

1. Holding a go or no-go meeting without current evidence.
2. Treating all defects as equal.
3. Forgetting rollback readiness.
4. Allowing accepted risk with no owner.
5. Using a scorecard that cannot produce no-go.
6. Ignoring flaky tests because the last run passed.
7. Leaving performance and security outside release readiness.
8. Not recording the final decision.
9. Changing thresholds during the meeting.
10. Failing to review release escapes afterward.

## Checklist

- [ ] The release candidate build is identified.
- [ ] All gates have thresholds.
- [ ] Evidence links are current.
- [ ] S1 and S2 defect status is reviewed.
- [ ] Flake budget is calculated.
- [ ] Performance budget is reviewed.
- [ ] Security findings are reviewed.
- [ ] Rollback plan is verified.
- [ ] Sign-off owners are recorded.
- [ ] Final decision is logged.
