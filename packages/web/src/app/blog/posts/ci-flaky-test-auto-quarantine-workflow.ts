import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Flaky Test Auto Quarantine Workflow That Keeps Main Green',
  description: 'Design a CI flaky test auto quarantine workflow that isolates intermittent failures, preserves signal on main, and forces re-promotion with ownership.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# CI Flaky Test Auto Quarantine Workflow That Keeps Main Green

A CI flaky test auto quarantine workflow is a controlled pipeline policy that detects intermittently failing tests, moves them out of the critical path under explicit ownership, continues reporting their results, and requires evidence before they return to the blocking suite. Done well, it protects main-branch signal without turning quarantine into a junk drawer where broken tests go to be forgotten.

Flakes destroy trust faster than slow tests. When the deploy job fails one in five times for reasons unrelated to the change under review, engineers rerun until green, merge through noise, or disable entire folders. Auto quarantine is the middle path: the system recognizes statistical instability, opens a tracking item, labels the test as non-blocking for merges, and keeps the test running in a shadow lane so the failure mode stays visible.

This guide builds that workflow from signal collection through decision rules, GitHub Actions and GitLab CI wiring, re-promotion gates, and the failure modes that make quarantine lists grow forever. If your pipelines also waste capacity on superseded commits, combine this with [canceling stale e2e runs on new commits](/blog/ci-cancel-stale-e2e-runs-on-new-commit). For GitLab reporters that surface intermittent cases, see [GitLab CI JUnit report flaky tests](/blog/gitlab-ci-junit-report-flaky-tests).

## Separate blocking failures from intermittent instability

Not every red test is a flake, and not every flake deserves the same response. Classify outcomes before automation takes action.

| Outcome class | Observable pattern | Immediate response | Long-term response |
|---|---|---|---|
| Deterministic regression | Fails consistently on same commit across retries | Block merge | Fix product or test in the PR |
| Environment outage | Many unrelated tests fail with shared infra errors | Fail closed or pause pipeline | Repair runners, registries, secrets |
| True flake | Pass/fail across retries or recent history without code correlation | Retry, then quarantine candidate | Stabilize selectors, data, timing |
| New test instability | First week of a new spec shows high variance | Heightened retries, no silent ignore | Author owns stabilization window |
| Order-dependent failure | Fails only in full suite or specific shard | Quarantine candidate with suite-order notes | Fix shared state and isolation |

Auto quarantine should never swallow deterministic regressions. The workflow therefore needs retries and history, not a single failure counter. A test that fails three times in a row on the same commit is a blocker. A test that fails once, passes on retry, and has failed on retry across several recent main builds is a quarantine candidate.

## Collect the signals the decision engine needs

Minimum signals:

1. Test identity stable across renames as much as possible (file path plus full title).
2. Branch and commit SHA.
3. Attempt number within the job.
4. Final status per attempt.
5. Duration and timeout flags.
6. Suite shard or project name.
7. Historical flake rate over a sliding window on main.
8. Owner from CODEOWNERS or a test catalog annotation.

Optional but high value signals include screenshot or trace artifact URLs, failure error class fingerprints, and whether the job ran against flaky infrastructure (spot runners, shared staging).

Store results in a queryable place. Many teams start with JUnit XML plus a small warehouse table or a flake service. The schema can be boring:

\`\`\`sql
CREATE TABLE test_attempt (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  repo TEXT NOT NULL,
  branch TEXT NOT NULL,
  commit_sha CHAR(40) NOT NULL,
  job_name TEXT NOT NULL,
  test_id TEXT NOT NULL,
  attempt INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'timed_out', 'skipped')),
  duration_ms INT,
  error_fingerprint TEXT
);

CREATE INDEX test_attempt_test_time ON test_attempt (test_id, recorded_at DESC);
\`\`\`

Emit one row per attempt, not only the final retry result. If your runner collapses retries into a single JUnit case, you lose the flake signal. Configure the test runner to preserve attempt history or parse job logs for retry sections.

\`\`\`ts
export type AttemptStatus = 'passed' | 'failed' | 'timed_out' | 'skipped';

export type TestAttempt = {
  testId: string;
  attempt: number;
  status: AttemptStatus;
  durationMs: number;
  errorFingerprint?: string;
};

export function summarizeCase(attempts: TestAttempt[]): {
  finalStatus: AttemptStatus;
  flakyInJob: boolean;
  attempts: number;
} {
  if (attempts.length === 0) {
    throw new Error('no attempts');
  }
  const finalStatus = attempts[attempts.length - 1].status;
  const sawFail = attempts.some((a) => a.status === 'failed' || a.status === 'timed_out');
  const sawPass = attempts.some((a) => a.status === 'passed');
  return {
    finalStatus,
    flakyInJob: sawFail && sawPass,
    attempts: attempts.length,
  };
}
\`\`\`

## Decision matrix for automatic quarantine

Encode policy as an explicit matrix so humans can argue about thresholds instead of tribal knowledge.

| Condition | PR pipeline | Main pipeline | Action |
|---|---|---|---|
| Deterministic fail, new in this PR | Block PR | Block deploy | No quarantine |
| Passes on retry, first flake in 14 days | Soft warn annotation | Count toward history | No quarantine yet |
| Flake rate >= 20% over last 30 main runs, at least 5 data points | Non-blocking label if already quarantined | Auto-quarantine propose | Open or update tracking issue |
| Quarantined test fails | Do not block merge | Record shadow failure | Notify owner daily digest |
| Quarantined test passes 20 consecutive main runs | Offer re-promotion | Auto create re-promotion PR or checklist | Human confirms removal of quarantine |
| Entire shard red with infra signature | Fail pipeline as infra | Pause quarantine mutations | Page platform on-call |

Threshold numbers above are starting points. High-volume suites may use Bayesian estimates or require tighter bounds. The important part is that automation never quarantines on a single PR failure without history.

\`\`\`ts
export type FlakeStats = {
  testId: string;
  mainRuns: number;
  flakeEvents: number; // jobs where both pass and fail attempts occurred, or intermittent across jobs
  lastOwner: string;
};

export type QuarantineDecision =
  | { type: 'none' }
  | { type: 'propose'; reason: string }
  | { type: 'keep'; reason: string }
  | { type: 'repromote_candidate'; reason: string };

export function decideQuarantine(
  stats: FlakeStats,
  currentlyQuarantined: boolean,
  consecutivePassesWhileQuarantined: number,
): QuarantineDecision {
  if (currentlyQuarantined && consecutivePassesWhileQuarantined >= 20) {
    return {
      type: 'repromote_candidate',
      reason: 'stable on main while quarantined',
    };
  }
  if (currentlyQuarantined) {
    return { type: 'keep', reason: 'still inside quarantine window' };
  }
  if (stats.mainRuns < 5) {
    return { type: 'none' };
  }
  const rate = stats.flakeEvents / stats.mainRuns;
  if (rate >= 0.2) {
    return {
      type: 'propose',
      reason: \`flake rate \${rate.toFixed(2)} over \${stats.mainRuns} main runs\`,
    };
  }
  return { type: 'none' };
}
\`\`\`

## Represent quarantine as data the suite reads

Quarantine must be explicit in repository data, not a silent dashboard flag nobody can grep. A YAML or JSON catalog checked into the repo works for many teams:

\`\`\`yaml
# test-quarantine.yml
version: 1
entries:
  - testId: "e2e/checkout.spec.ts:pays with saved card"
    reason: "Intermittent session expiry on shared staging"
    owner: "@payments-qa"
    opened: "2026-07-12"
    expires: "2026-08-12"
    issue: "https://github.com/example/app/issues/8421"
    branchPolicy:
      blockMain: false
      blockPullRequest: false
      stillRun: true
\`\`\`

Rules for the catalog:

- Every entry needs owner, reason, issue link, and expiry.
- Expired entries fail a lint job until removed or renewed with a new expiry and comment.
- \`stillRun: true\` is the default. Quarantine means non-blocking, not deleted.
- Changing quarantine should go through normal code review.

Load the catalog in the test runner or a wrapper:

\`\`\`ts
import fs from 'node:fs';
import path from 'node:path';

export type QuarantineEntry = {
  testId: string;
  reason: string;
  owner: string;
  opened: string;
  expires: string;
  issue: string;
  branchPolicy: {
    blockMain: boolean;
    blockPullRequest: boolean;
    stillRun: boolean;
  };
};

export function loadQuarantine(file = 'test-quarantine.yml'): QuarantineEntry[] {
  // Parse with your YAML library of choice in real code.
  const raw = fs.readFileSync(path.resolve(file), 'utf8');
  if (!raw.includes('entries:')) return [];
  // Placeholder: replace with safe YAML parse in production.
  return JSON.parse(process.env.QUARANTINE_JSON || '[]') as QuarantineEntry[];
}

export function isQuarantined(testId: string, entries: QuarantineEntry[]): QuarantineEntry | undefined {
  return entries.find((e) => e.testId === testId);
}
\`\`\`

In Playwright, you can map catalog entries to annotations or project-level grep invert patterns. Prefer annotations that still execute the test and mark the job outcome based on policy, rather than permanently skipping, if your goal is continued visibility.

\`\`\`ts
import { test, expect } from '@playwright/test';

const quarantine = new Map(
  (JSON.parse(process.env.QUARANTINE_JSON || '[]') as { testId: string; owner: string }[]).map((e) => [
    e.testId,
    e,
  ]),
);

function applyQuarantinePolicy(fullTitle: string) {
  const entry = quarantine.get(fullTitle);
  if (!entry) return;
  test.info().annotations.push({ type: 'quarantine', description: entry.owner });
  // Policy handling often lives in a reporter that demotes failure to warning for quarantined cases.
}

test('pays with saved card', async ({ page }) => {
  applyQuarantinePolicy('e2e/checkout.spec.ts:pays with saved card');
  await page.goto('/checkout');
  // ...
  await expect(page.getByText('Order confirmed')).toBeVisible();
});
\`\`\`

If you use Jest or Vitest retries, keep attempt-level reporting enabled so the warehouse still sees intermittency after quarantine.

## Wire auto-quarantine into GitHub Actions without hiding red builds

A practical shape:

1. \`e2e\` job runs the suite with retries, uploads JUnit and traces.
2. \`ingest-flakes\` job parses artifacts, writes attempts, computes decisions.
3. \`propose-quarantine\` job opens a PR or issue when policy says propose. Prefer PRs that edit \`test-quarantine.yml\` so review stays in git.
4. Merge of quarantine PR is human approved.
5. Deploy job blocks only on non-quarantined failures.

\`\`\`yaml
name: e2e
on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e -- --reporter=junit
        env:
          QUARANTINE_JSON: \${{ vars.QUARANTINE_JSON }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-artifacts
          path: |
            test-results/**
            artifacts/junit/**

  ingest-flakes:
    needs: e2e
    if: always() && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: e2e-artifacts
      - run: node scripts/ingest-flakes.js
      - run: node scripts/propose-quarantine.js
\`\`\`

Important: the PR that introduces a deterministic break must still fail. Only tests already cataloged as quarantined, or being proposed after main history thresholds, leave the blocking set. Auto-merging quarantine PRs without human review is how buggy tests silently leave the safety net.

For GitLab CI, mirror the same stages with artifacts and a scheduled job that consumes JUnit. Many teams already parse JUnit for flaky trends; hook the decision script into that path rather than inventing a second report format.

## Shadow execution and reporting after quarantine

Quarantined tests should keep running on main and preferably on nightly full builds. If you stop running them, you cannot re-promote with evidence, and you lose diagnostic traces when the product area drifts further.

Report shadow results to:

- A dashboard tile of open quarantine entries with age and owner
- Daily Slack or email digests for owners with failing quarantined tests
- PR comments only when a PR touches files related to the quarantined test's path (optional, reduce noise)

\`\`\`ts
export type DigestRow = {
  testId: string;
  owner: string;
  ageDays: number;
  lastStatus: string;
  issue: string;
};

export function buildOwnerDigest(rows: DigestRow[]): string {
  const byOwner = new Map<string, DigestRow[]>();
  for (const row of rows) {
    const list = byOwner.get(row.owner) || [];
    list.push(row);
    byOwner.set(row.owner, list);
  }
  const lines: string[] = ['# Quarantine digest', ''];
  for (const [owner, items] of byOwner) {
    lines.push(\`## \${owner}\`);
    for (const item of items) {
      lines.push(
        \`- \${item.testId} (\${item.ageDays}d, last=\${item.lastStatus}) \${item.issue}\`,
      );
    }
    lines.push('');
  }
  return lines.join('\\n');
}
\`\`\`

## Re-promotion gates that force the list to shrink

Quarantine without re-promotion is technical debt with ceremony. Define exit criteria up front.

Suggested exit criteria:

1. Twenty consecutive passes on main shadow runs, or two weeks with zero flake events, whichever requires more evidence for your volume.
2. Root cause note in the tracking issue (test fix, product fix, or environment fix).
3. Removal PR that deletes the catalog entry and, if needed, tightens the test.
4. CI lint that rejects renewals longer than a maximum window without escalation.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
# scripts/lint-quarantine.sh
node scripts/lint-quarantine.js --max-age-days 30 --require-issue --require-owner
\`\`\`

\`\`\`ts
export function lintQuarantine(
  entries: { expires: string; owner: string; issue: string; opened: string }[],
  today = new Date(),
  maxAgeDays = 30,
): string[] {
  const errors: string[] = [];
  for (const e of entries) {
    if (!e.owner.startsWith('@')) errors.push(\`owner missing handle: \${e.owner}\`);
    if (!/^https?:\\/\\//.test(e.issue)) errors.push(\`issue must be URL: \${e.issue}\`);
    const opened = new Date(e.opened);
    const age = (today.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
    if (age > maxAgeDays) {
      errors.push(\`entry older than \${maxAgeDays} days without resolution\`);
    }
    if (new Date(e.expires) < today) {
      errors.push(\`expired quarantine must be removed or explicitly renewed: \${e.issue}\`);
    }
  }
  return errors;
}
\`\`\`

When a test is re-promoted, watch it for a probation period with extra retries if needed, then return retries to normal. Permanent elevated retries for a "fixed" test hide residual instability.

## Failure mode: quarantine lists that never shrink

The realistic failure mode of a CI flaky test auto quarantine workflow is entropy. Automation proposes entries, humans approve them to unblock releases, owners rotate teams, and six months later fifty tests run as theater. Diagnosis looks like this:

- Median quarantine age exceeds your sprint length.
- Same owners appear on dozens of entries.
- Shadow failures are ignored in digests.
- Expiry dates are renewed in bulk the day CI lint fails.
- New engineers cannot tell which quarantines map to real product risk.

Countermeasures:

1. Cap total quarantined tests per team (for example 5). New proposals require resolving an old entry first.
2. Make expired entries block main, not just lint warn.
3. Review the quarantine catalog in the same weekly meeting as production incidents for a month until hygiene improves.
4. Budget stabilization time proportional to flake rate, not only feature velocity.
5. Delete tests that no longer map to user risk instead of eternally quarantining them. Dead tests are not a museum.

## What people get wrong about auto quarantine dashboards

Dashboards that show a green "mergeable" badge while fifty e2e tests burn in a corner train the organization to celebrate the wrong metric. The metric that matters is time-to-stabilization and the count of open quarantine entries, not how rarely main is red.

Another mistake is quarantining by file path wildcards (\`e2e/checkout/**\`) because one test flakes. That hides deterministic regressions in neighboring specs. Quarantine at the test identity level.

A third mistake is equating retries with quarantine. Retries are a shock absorber for rare intermittency. Quarantine is an explicit risk acceptance record. If everything needs five retries, you do not have a retry strategy; you have an unstable system.

Also avoid machine-only quarantine without code review. Fully automatic edits to \`test-quarantine.yml\` on main can race with legitimate test renames and create catalogs that never match real titles. Prefer bot-opened PRs.

## Coordinating with shards, retries, and cancel-in-progress

Large suites shard by timing or file weight. Flake stats must key by test identity, not shard index, because shard layout changes. When a job is canceled due to a newer commit, do not ingest partial attempts as flake evidence unless you mark the job as canceled. Canceled runs otherwise look like intermittent failures.

Pipeline concurrency settings that cancel superseded e2e runs reduce queue noise and improve the quality of flake history by focusing on terminal runs of each commit. Keep cancel-in-progress for PR workflows, and still run a full main pipeline on the merged result.

## Ownership models that make the workflow human

CODEOWNERS on product directories is a start, but flaky e2e tests often span multiple packages. Maintain an optional \`owner\` field in the test catalog or a header comment convention:

\`\`\`ts
// @owner @checkout-team
test('applies regional tax', async ({ page }) => {
  // ...
});
\`\`\`

Parse owners at ingest time when quarantine is proposed so the PR description @-mentions the right people. Without owners, quarantine becomes platform-team debt.

## Measuring whether the workflow is working

Track these operational metrics monthly:

| Metric | Healthy trend | Unhealthy trend |
|---|---|---|
| Open quarantine count | Flat or down | Monotonic up |
| Median age of entries | Below two sprints | Multi-quarter ages |
| Main blocked by flakes | Near zero | Spikes despite quarantine |
| Deterministic bugs escaped | Not rising | Rising as tests leave blocking set |
| Re-promotions per month | Non-zero | Zero while opens accumulate |
| Mean time from flake detect to owner ack | Days | Weeks |

If main is green but escaped defects rise in areas covered only by quarantined tests, your workflow optimized for merge speed at the expense of quality. Tighten quarantine caps and invest in stabilization.

## Example end-to-end policy narrative

Imagine \`e2e/checkout.spec.ts:pays with saved card\` fails on attempt 1 and passes on attempt 2 on three of the last ten main pipelines. The ingest job records attempts, \`decideQuarantine\` returns \`propose\`, and a bot opens a PR adding a catalog entry with owner \`@payments-qa\`, a linked issue, and a 30-day expiry. A reviewer confirms the test is not a deterministic break from a recent feature, merges the quarantine PR, and the deploy pipeline stops blocking on that test id.

Nightly, the test still runs. Traces show a race on session refresh. The team fixes token refresh, the test passes for twenty consecutive main runs, and the bot opens a re-promotion PR deleting the entry. After merge, the test blocks again. That is a successful CI flaky test auto quarantine workflow: temporary risk acceptance with memory and an exit.

If instead the team renews expiry four times with no root cause note, the workflow has failed socially even if the YAML remains valid. Tooling cannot replace ownership; it can only make the lack of ownership visible.

## Implementation checklist for the first two weeks

Week one: emit attempt-level results, build the warehouse or log index, compute flake rates for main, and publish a read-only report of top intermittent tests. Do not auto-edit quarantine yet.

Week two: introduce \`test-quarantine.yml\`, wire non-blocking policy for listed tests, add lint for owner/issue/expiry, and allow bot-proposed PRs for candidates above threshold. Cap the list. Schedule the first re-promotion review.

Only after those pieces work should you expand to multi-repo catalogs or cross-project flake services. Complexity is easy to add and hard to staff.

Teams that already install agent-oriented QA helpers from qaskills.sh with the qaskills CLI can use those skills to scaffold reporters and catalog linters, then adapt thresholds to local suite volume. The policy decisions still belong to your org.

## Frequently Asked Questions

### When should a CI flaky test auto quarantine workflow quarantine automatically without a human PR?

Prefer human review for the first version of the workflow. Fully automatic quarantine on main is only reasonable after you trust identity matching, infra failure detection, and owner routing, and even then many organizations keep a thin review step. Automatic proposals with one-click approve still preserve auditability. If you auto-merge, restrict it to tests already marked as known intermittent by prior history and never to brand new failures on a PR commit.

### How is quarantine different from increasing retry counts?

Retries absorb rare intermittency inside a single job and still treat a final failure as a failure. Quarantine changes merge policy for a specific test identity across jobs after risk acceptance. Retries without quarantine leave main noisy. Quarantine without retries can catalog tests that only needed a single rerun. Use short retries for everyone, and quarantine only when history shows persistent intermittency that is not yet fixed.

### Should quarantined tests run on pull requests?

Yes, in most systems, so authors see failures related to their changes. Mark the job outcome according to policy: quarantined failures should not block merge, but should still annotate the PR. If the PR modifies the quarantined test or its primary product area, some teams temporarily re-block on that test to prevent silent breakage during active work. Document that exception so authors are not surprised.

### What if the flaky test is covering a critical payment path?

Critical paths should rarely remain quarantined for long. Lower the expiry ceiling, raise visibility in digests, and pair quarantine with compensatory controls such as heightened monitoring, canary checks, or manual test plans for releases. If a payment test is too unstable to block merges, that is a product risk conversation, not only a CI convenience feature. Auto quarantine is acceptable as a short bridge while stabilization work is staffed, not as permanent silence on revenue paths.
`,
};
