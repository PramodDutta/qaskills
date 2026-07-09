---
name: CI Test Sharding Parallelization
description: Teach agents to shard and parallelize Playwright, Jest, and pytest suites in CI to reduce wall-clock time while merging reports reliably.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [ci, sharding, parallelization, playwright, jest, pytest, test-performance]
testingTypes: [e2e, regression, performance]
frameworks: [playwright, jest, pytest]
languages: [typescript, python]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# CI Test Sharding Parallelization Skill

You are a test infrastructure engineer who reduces CI wall-clock time by sharding and parallelizing test suites while preserving deterministic results, useful reports, and clear failure ownership.

## Core Principles

1. **Optimize wall-clock, not only CPU**: The goal is faster feedback for developers.
2. **Shard deterministically**: The same commit and shard config should run the same test distribution unless balancing is intentional.
3. **Merge reports reliably**: Parallel jobs must produce one readable result for humans and machines.
4. **Keep setup cost visible**: Too many shards can waste time on repeated install and boot steps.
5. **Balance long tests**: Historical timing can prevent one slow shard from dominating.
6. **Fail clearly**: A failure should identify shard, test file, project, and artifact.
7. **Avoid hidden order dependencies**: Sharding exposes tests that rely on shared state.
8. **Tune gradually**: Increase shard count only after measuring queue time and overhead.

## Setup

Create scripts for each framework.

```bash
npm install --save-dev @playwright/test jest jest-junit
python -m venv .venv
. .venv/bin/activate
pip install pytest pytest-xdist pytest-json-report
mkdir -p test-results merged-reports
```

Use consistent environment variables.

```bash
export SHARD_INDEX=1
export SHARD_TOTAL=4
export CI_NODE_INDEX=1
export CI_NODE_TOTAL=4
```

## Project Structure

```text
ci/
  sharding/
    playwright.yml
    jest.yml
    pytest.yml
scripts/
  run-playwright-shard.sh
  run-jest-shard.ts
  run-pytest-shard.sh
  merge-reports.sh
test-results/
merged-reports/
```

## Playwright Sharding

Use the built-in Playwright shard flag.

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${SHARD_INDEX:?SHARD_INDEX is required}"
: "${SHARD_TOTAL:?SHARD_TOTAL is required}"

npx playwright test \
  --shard="${SHARD_INDEX}/${SHARD_TOTAL}" \
  --reporter=blob \
  --output="test-results/playwright-${SHARD_INDEX}"
```

Merge Playwright blob reports after all shards finish.

```bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p merged-reports/playwright
npx playwright merge-reports --reporter html ./blob-report
```

## Jest Sharding

Use Jest shard support when available.

```typescript
// scripts/run-jest-shard.ts
import { spawnSync } from 'node:child_process';

const shardIndex = process.env.SHARD_INDEX || '1';
const shardTotal = process.env.SHARD_TOTAL || '1';

const result = spawnSync(
  'npx',
  [
    'jest',
    `--shard=${shardIndex}/${shardTotal}`,
    '--runInBand',
    '--ci',
    '--reporters=default',
    '--reporters=jest-junit',
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
```

## Pytest Parallelization

Use xdist for process-level parallelism and CI matrix for sharding.

```bash
#!/usr/bin/env bash
set -euo pipefail

PYTEST_WORKERS="${PYTEST_WORKERS:-auto}"
REPORT_FILE="test-results/pytest-${SHARD_INDEX:-1}.json"

pytest tests \
  -n "$PYTEST_WORKERS" \
  --json-report \
  --json-report-file="$REPORT_FILE"
```

## GitHub Actions Matrix

Use matrix jobs for Playwright shards.

```yaml
name: sharded-tests
on:
  pull_request:
jobs:
  playwright:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: bash scripts/run-playwright-shard.sh
        env:
          SHARD_INDEX: ${{ matrix.shard }}
          SHARD_TOTAL: 4
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-blob-${{ matrix.shard }}
          path: blob-report
```

## Tuning Workflow

Measure before and after.

1. Capture current test duration by suite and file.
2. Identify setup time, test time, and queue time.
3. Start with two or four shards.
4. Compare total wall-clock time.
5. Inspect slowest shard.
6. Split slow files or rebalance.
7. Check report merge quality.
8. Confirm failure artifacts are still visible.
9. Update branch protection names if required.
10. Revisit shard count monthly.

## Reference Table

| Framework | Sharding Method | Report Merge |
|---|---|---|
| Playwright | `--shard=1/4` | Blob report merge |
| Jest | `--shard=1/4` | JUnit aggregation |
| pytest | Matrix plus xdist | JSON or JUnit merge |
| Cypress | Dashboard or spec split | Dashboard report |
| Large monorepo | Package filters | Per-package reports |
| Slow E2E | Historical timing split | Custom manifest |

## Common Mistakes

1. Increasing shard count without measuring setup overhead.
2. Losing artifacts from failing shards.
3. Using fail-fast and canceling useful failure evidence.
4. Forgetting to merge reports.
5. Hiding order-dependent tests instead of fixing them.
6. Running every shard against the same mutable account.
7. Making branch protection require old job names.
8. Creating more shards than available runners.
9. Ignoring the slowest shard.
10. Mixing parallel workers with unsafe shared database state.

## Checklist

- [ ] Baseline wall-clock time is recorded.
- [ ] Shard count is justified by measurements.
- [ ] Test data is safe for parallel runs.
- [ ] Playwright shards use blob reports.
- [ ] Jest or pytest reports are merged.
- [ ] Artifacts include shard identifiers.
- [ ] Fail-fast is disabled where evidence matters.
- [ ] Slow shard is monitored.
- [ ] Branch protection uses the correct checks.
- [ ] Shard strategy is reviewed regularly.
