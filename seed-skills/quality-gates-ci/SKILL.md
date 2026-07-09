---
name: Quality Gates CI
description: Teach agents to define and enforce CI quality gates for diff coverage, flaky tests, performance budgets, security thresholds, and regression health.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [ci, quality-gates, diff-coverage, flaky-tests, performance-budget, security-thresholds]
testingTypes: [code-quality, regression, strategy]
frameworks: []
languages: [typescript, bash]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Quality Gates CI Skill

You are a CI quality architect who turns quality expectations into pass or fail gates for code coverage, regression health, flake budgets, performance budgets, security thresholds, and review discipline.

## Core Principles

1. **Make gates objective**: A gate should produce pass, fail, or warn from observable evidence.
2. **Gate the diff first**: New code should meet a higher bar even when legacy coverage is low.
3. **Fail on confirmed risk**: Critical regressions, security findings, and broken smoke paths should block merge.
4. **Avoid noisy gates**: A gate that fails randomly will be bypassed.
5. **Publish evidence**: Every failure must link to logs, reports, or artifacts.
6. **Use budgets**: Coverage, flakes, performance, and vulnerabilities need numeric limits.
7. **Version the rules**: CI gate config should live in the repository.
8. **Review exceptions**: Temporary bypasses need owner, reason, and expiry.

## Setup

Create a CI quality directory.

```bash
mkdir -p ci/quality-gates ci/reports scripts
touch ci/quality-gates/policy.json
touch scripts/check-quality-gates.sh
chmod +x scripts/check-quality-gates.sh
```

Define a policy file.

```json
{
  "diffCoverage": 80,
  "flakeRate": 2,
  "maxHighSecurityFindings": 0,
  "maxCriticalSecurityFindings": 0,
  "maxLcpMs": 2500,
  "maxBundleKb": 300
}
```

## Gate Script

Use one wrapper to make gate behavior consistent.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gates"

npm run lint
npm run test:unit -- --coverage
npm run test:e2e -- --reporter=line
npm run security:scan
npm run perf:budget

echo "Quality gates passed"
```

## Diff Coverage Gate

Require new or changed code to meet a threshold.

```typescript
// ci/quality-gates/check-diff-coverage.ts
type CoverageSummary = {
  changedLines: number;
  coveredChangedLines: number;
};

export function diffCoveragePercent(summary: CoverageSummary): number {
  if (summary.changedLines === 0) return 100;
  return Math.round((summary.coveredChangedLines / summary.changedLines) * 10000) / 100;
}

export function assertDiffCoverage(summary: CoverageSummary, threshold: number): void {
  const percent = diffCoveragePercent(summary);
  if (percent < threshold) {
    throw new Error(`Diff coverage ${percent}% is below ${threshold}%`);
  }
}

assertDiffCoverage({ changedLines: 20, coveredChangedLines: 18 }, 80);
```

## Flake Budget Gate

Track flaky tests as a first-class signal.

```typescript
// ci/quality-gates/check-flake-budget.ts
type TestAttempt = {
  testId: string;
  attempt: number;
  status: 'passed' | 'failed';
};

export function calculateFlakeRate(attempts: TestAttempt[]): number {
  const byTest = new Map<string, TestAttempt[]>();
  for (const attempt of attempts) {
    byTest.set(attempt.testId, [...(byTest.get(attempt.testId) || []), attempt]);
  }
  const flaky = [...byTest.values()].filter((items) => {
    const statuses = new Set(items.map((item) => item.status));
    return statuses.has('passed') && statuses.has('failed');
  }).length;
  return Math.round((flaky / Math.max(byTest.size, 1)) * 10000) / 100;
}
```

## GitHub Actions Workflow

Run gates in parallel where possible, then require the aggregate result.

```yaml
name: quality-gates
on:
  pull_request:
jobs:
  gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: bash scripts/check-quality-gates.sh
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: quality-gate-reports
          path: ci/reports
```

## Gate Decision Table

| Gate | Pass | Fail | Evidence |
|---|---|---|---|
| Lint | No errors | Any error | Lint log |
| Unit tests | Required suites pass | Confirmed failure | Coverage report |
| Diff coverage | At or above threshold | Below threshold | Coverage diff |
| E2E smoke | Critical paths pass | Any critical fail | Playwright report |
| Flake budget | Under budget | Over budget | Retry history |
| Security | No high or critical | High or critical | Scanner report |
| Performance | Within budget | Budget exceeded | Trace or metrics |

## Common Mistakes

1. Adding a gate without an owner.
2. Failing builds on noisy experimental checks.
3. Measuring total coverage while new code is untested.
4. Letting flaky tests pass through retries with no budget.
5. Hiding performance regressions in separate dashboards.
6. Allowing security warnings to pile up without thresholds.
7. Not uploading artifacts.
8. Using manual comments as gates.
9. Bypassing gates with no expiry.
10. Making local commands differ from CI commands.

## Checklist

- [ ] Gate policy is stored in the repository.
- [ ] Diff coverage threshold is defined.
- [ ] Flake budget is measured.
- [ ] Smoke regression gate is required.
- [ ] Security thresholds are explicit.
- [ ] Performance budgets are explicit.
- [ ] Artifacts are uploaded on failure.
- [ ] Exceptions have owners and expiry dates.
- [ ] Local and CI commands match.
- [ ] Branch protection requires the gate.
