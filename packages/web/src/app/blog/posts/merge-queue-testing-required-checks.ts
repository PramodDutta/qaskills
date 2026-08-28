import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Merge Queues and Required Checks Without Shipping Broken Batches',
  description: 'Merge queue CI testing guide for batching, required checks, flake handling, and bypass controls so protected branches stay releasable.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Merge Queues and Required Checks Without Shipping Broken Batches

Merge queue CI testing means proving that a queued batch of pull requests is tested as the code that will actually land on the protected branch, with every required check enforced before merge. The goal is simple: no PR should pass alone, fail when combined with neighbors, then still reach main because the queue, required checks, or bypass rules were misconfigured.

A merge queue is not just a faster merge button. It is a release gate with batching, speculative integration branches, CI status aggregation, retry behavior, and human override paths. QA engineers should test it like any other critical workflow: define state transitions, inject failures, measure flakes, and verify that a passing status belongs to the exact synthetic commit that will be merged.

Official GitHub documentation for merge queues and protected branches is useful background: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue

## The Contract You Are Really Testing

The core contract has four parts. A pull request enters the queue only when it satisfies branch protection. The queue creates a grouped candidate, often called a merge group. CI runs on that candidate, not only on the original pull request head. The candidate merges only if every required check succeeds on the candidate commit.

That sounds obvious until you inspect real CI history. Many teams have required checks that run on pull_request but not merge_group. Others run quick checks on the merge group and full checks on PRs, which means the queue can approve a composition that never ran integration tests. Some queues are configured correctly but allow administrators to bypass after a red run. Those bypasses are sometimes acceptable, but they must be visible, rare, and audited.

| Risk | Symptom In CI | Test To Add | Release Impact |
|---|---|---|---|
| Required check missing on merge group | PR shows green, merge group has fewer jobs | Compare required check names against merge group jobs | Untested candidate can land |
| Batch interaction failure | Two PRs pass alone, fail together | Queue two conflicting changes and expect batch rejection | Main receives code nobody tested together |
| Flaky required check | Queue churns, PRs leave and reenter | Track attempt count and failure signatures | Long lead time, hidden risk |
| Manual bypass | Red candidate lands after approval | Audit protected branch events and merge actor | Policy can be avoided silently |
| Stale status reuse | Check attached to PR head, not synthetic commit | Assert check SHA equals merge group SHA | Old green status grants new merge |

I prefer testing the queue with intentionally small fixtures. Do not start by asking an AI coding agent to simulate your whole monorepo. Give it a three-file repository, a required test, and two changes that conflict only when combined. Once that proof works, port the same idea to the real repository.

## Build A Queue Fixture That Can Fail Only In Combination

A good merge queue fixture proves something a normal PR test cannot. The most useful case is two independent PRs that pass alone but break a shared invariant together. For example, one PR adds a new required field to an API request and the other changes the server default. Each branch is internally consistent, but the combined result violates a contract test.

Here is a tiny Node test target. The important part is not the code. The important part is that two isolated edits can both appear safe while the queue candidate fails.

\`\`\`typescript
export type SignupPolicy = {
  requireCompanyName: boolean;
  defaultPlan: 'free' | 'team';
};

export function validateSignup(input: { email: string; companyName?: string }, policy: SignupPolicy) {
  if (!input.email.includes('@')) {
    return { ok: false, reason: 'invalid_email' };
  }

  if (policy.requireCompanyName && !input.companyName) {
    return { ok: false, reason: 'company_required' };
  }

  return { ok: true, plan: policy.defaultPlan };
}
\`\`\`

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { validateSignup } from './signup';

describe('signup policy', () => {
  it('accepts a basic email under the free plan policy', () => {
    const result = validateSignup(
      { email: 'qa@example.com' },
      { requireCompanyName: false, defaultPlan: 'free' }
    );

    expect(result).toEqual({ ok: true, plan: 'free' });
  });

  it('rejects missing company when team plan requires it', () => {
    const result = validateSignup(
      { email: 'qa@example.com' },
      { requireCompanyName: true, defaultPlan: 'team' }
    );

    expect(result).toEqual({ ok: false, reason: 'company_required' });
  });
});
\`\`\`

In branch A, change the default plan to team. In branch B, change the product rule so team signups require a company name. If each branch updates only the tests it sees, both may pass alone. The queue candidate should run the combined result and fail if the final contract is inconsistent.

That fixture catches the most expensive category of queue misconfiguration: testing the PR head instead of the merge group. It is also easy for AI agents to generate repeatedly because the state space is small.

## Required Checks Need Stable Names

Required checks are matched by name. If the job name in CI changes, branch protection may no longer enforce the check you think it enforces. Matrix jobs make this sharper because "test" is not the same check as "test (20, ubuntu-latest)" in many providers.

Use names that are stable across pull request and merge group events. Avoid embedding random shard counts, package names that churn every week, or agent-generated phrases. If a job must split dynamically, keep one stable required aggregator that depends on the dynamic jobs.

| Check Type | Good Required Name | Fragile Required Name | Reason |
|---|---|---|---|
| Unit test gate | ci-unit-required | unit tests for changed packages | Dynamic wording drifts |
| Browser smoke gate | ci-browser-smoke-required | playwright chromium shard 3 | Shards are implementation details |
| Security gate | ci-security-required | scan generated at 10:32 | Generated names cannot be protected reliably |
| Merge queue gate | ci-merge-group-required | pull request validation | Name hides event scope |

For GitHub Actions, include the merge_group event when using merge queues. Keep pull_request too, because developers still need feedback before queue entry.

\`\`\`yaml
name: ci

on:
  pull_request:
  merge_group:

jobs:
  unit-required:
    name: ci-unit-required
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --run
\`\`\`

The subtle test is to inspect a real merge group run and confirm that the required check appears on that run. A green pull request is not enough. A green workflow file in review is not enough. You need evidence from the provider.

## Make CI Prove Its Event Context

Add one short diagnostic step to required workflows. It should print the event name, commit SHA, base ref, and workflow run URL. This is not vanity logging. When a queue bug happens, that small record tells you whether the failed run was on pull_request, push, merge_group, or a stale branch.

\`\`\`yaml
- name: Print CI context
  run: |
    echo "event=\${GITHUB_EVENT_NAME}"
    echo "sha=\${GITHUB_SHA}"
    echo "ref=\${GITHUB_REF}"
    echo "base=\${GITHUB_BASE_REF}"
    echo "run=https://github.com/\${GITHUB_REPOSITORY}/actions/runs/\${GITHUB_RUN_ID}"
\`\`\`

Then add an automated assertion around the provider API if your governance requires it. The exact API client depends on your stack, but the data model is stable: commit SHA, check name, conclusion, event, and required status.

\`\`\`typescript
type CheckRun = {
  name: string;
  headSha: string;
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
};

export function missingRequiredChecks(required: string[], runs: CheckRun[], mergeGroupSha: string) {
  const successfulNames = new Set(
    runs
      .filter((run) => run.headSha === mergeGroupSha)
      .filter((run) => run.conclusion === 'success')
      .map((run) => run.name)
  );

  return required.filter((name) => !successfulNames.has(name));
}
\`\`\`

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { missingRequiredChecks } from './required-checks';

describe('required check matching', () => {
  it('does not reuse success from the pull request head', () => {
    const missing = missingRequiredChecks(
      ['ci-unit-required', 'ci-browser-smoke-required'],
      [
        { name: 'ci-unit-required', headSha: 'pr-sha', conclusion: 'success' },
        { name: 'ci-browser-smoke-required', headSha: 'merge-sha', conclusion: 'success' }
      ],
      'merge-sha'
    );

    expect(missing).toEqual(['ci-unit-required']);
  });
});
\`\`\`

That example is deliberately small, but it encodes a real policy: success must belong to the candidate being merged. This same idea powers bigger dashboards and branch protection audits.

## Batch Size Is A Test Variable

Batching makes queues faster, but it changes failure diagnosis. With a batch size of one, failures map cleanly to a PR. With a batch size of five, one incompatible PR can eject four innocent neighbors or force the queue to bisect. That is not wrong. It is a tradeoff you should test and tune.

| Batch Size | Throughput | Diagnosis Cost | Suggested Use |
|---:|---|---|---|
| 1 | Lowest | Lowest | High-risk repositories, migration windows |
| 2 to 3 | Balanced | Manageable | Most product repositories with moderate CI time |
| 4 to 8 | Higher when tests are stable | Higher | Repositories with low interaction risk and strong ownership |
| Dynamic | Best when well instrumented | Requires queue analytics | Mature teams with historical failure data |

Do not choose batch size by opinion. Replay the last few weeks of PR arrivals and CI durations if you have the data. If you do not, run a trial with conservative limits and measure queue wait, batch failure rate, and requeue count.

\`\`\`sql
select
  date_trunc('day', queued_at) as day,
  count(*) as queued_prs,
  avg(extract(epoch from merged_at - queued_at) / 60.0) as avg_queue_minutes,
  sum(case when batch_conclusion = 'failure' then 1 else 0 end) as failed_batches
from merge_queue_runs
where queued_at >= now() - interval '14 days'
group by 1
order by 1;
\`\`\`

The QA question is not "is batching good?" It is "which batch policy keeps main green without making engineers wait so long that they bypass the process?"

## Flakes Need A Queue-Specific Policy

Flaky tests are annoying on PRs. In a merge queue, they become a throughput problem and a trust problem. If the queue retries every red batch automatically, it may hide real integration failures. If it ejects every PR on the first red attempt, developers will stop trusting the queue.

Track flaky failures separately from deterministic failures. A deterministic failure repeats with the same test and same error on the same candidate. A likely flake disappears on retry without code change and has a historical pattern across unrelated commits. The classification should never be purely vibes.

| Signal | Deterministic Failure | Likely Flake |
|---|---|---|
| Reproduces on same candidate | Yes | Often no |
| Appears across unrelated branches | Rare | Common |
| Failure message | Stable | Often timeout or external dependency |
| Owner action | Fix code or tests before merge | Quarantine, deflake, or isolate |
| Queue behavior | Remove bad PR or split batch | Retry within budget, then stop |

Use retry budgets. For example, allow one automatic retry for a known flaky browser job, but require a human decision after the budget is spent. The budget should be visible in the queue UI or comment trail.

\`\`\`javascript
function classifyQueueFailure(history, currentFailure) {
  const sameSignature = history.filter((item) =>
    item.testName === currentFailure.testName &&
    item.errorFingerprint === currentFailure.errorFingerprint
  );

  const unrelatedCommits = new Set(sameSignature.map((item) => item.commitSha));
  const recentPassAfterRetry = sameSignature.some((item) => item.failedAttempt === 1 && item.finalStatus === 'passed');

  if (unrelatedCommits.size >= 3 && recentPassAfterRetry) {
    return 'likely_flake';
  }

  return 'needs_triage';
}
\`\`\`

This connects directly to [CI test impact caching strategy](/blog/ci-test-impact-caching-strategy): caching and test selection can reduce queue time, but they must not remove the required evidence for the merge group candidate.

## Dependency Graph Ordering Prevents Waste

In a monorepo, not all PRs interact equally. A docs-only change and an isolated package change should not wait behind a risky database migration if the queue can separate lanes. A queue lane is only useful if it maps to real dependency boundaries, not team names written in a meeting.

The dependency graph should answer three questions. Which projects must test when a file changes? Which merge queue lane should receive the PR? Which shared checks always run because the blast radius crosses boundaries?

\`\`\`json
{
  "lanes": [
    {
      "name": "frontend",
      "paths": ["apps/web/**", "packages/ui/**"],
      "requiredChecks": ["ci-unit-required", "ci-browser-smoke-required"]
    },
    {
      "name": "backend",
      "paths": ["services/api/**", "packages/db/**"],
      "requiredChecks": ["ci-unit-required", "ci-contract-required"]
    },
    {
      "name": "shared",
      "paths": ["packages/config/**"],
      "requiredChecks": ["ci-unit-required", "ci-browser-smoke-required", "ci-contract-required"]
    }
  ]
}
\`\`\`

If your repo already computes affected projects, feed that signal into queue policy. If it does not, start with a conservative path map and refine it as failures teach you. For deeper ordering work, see [monorepo testing dependency graph ordering](/blog/monorepo-testing-dependency-graph-ordering).

## Bypass Testing Is Not Cynical

Bypass controls exist for outages, incident recovery, and emergency fixes. QA should still test them. The requirement is not "nobody can ever bypass." The requirement is "bypass is limited, intentional, recorded, and reviewed."

Create a bypass checklist that covers actor, reason, linked incident, skipped checks, candidate SHA, and post-merge verification. If your platform exposes audit events, ingest them into the same warehouse as CI results. A bypass without an audit trail is a policy hole.

\`\`\`sql
create table merge_queue_bypass_events (
  event_id text primary key,
  repository text not null,
  actor text not null,
  pull_request_number integer not null,
  candidate_sha text not null,
  bypassed_at timestamptz not null,
  reason text not null,
  incident_url text,
  skipped_required_checks text[] not null
);

create index merge_queue_bypass_repo_time_idx
  on merge_queue_bypass_events (repository, bypassed_at desc);
\`\`\`

One practical rule: bypass can merge emergency code, but it should not erase the required tests. Run them after merge and attach the result to the incident. If they fail, the incident is not closed.

## A Plain Failure Story

The symptom was ugly: main broke twice in one week even though every PR had a green required check. The first theory was flaky integration tests. Engineers reran the suite locally and found nothing. The second theory was that reviewers missed a shared contract change.

The actual cause was smaller and more embarrassing. The required check named "api-contract" ran on pull_request, but the workflow did not include merge_group. The merge queue ran a different job named "api-contract-queue" that was not required by branch protection. PRs entered the queue with a real green signal, then candidates merged with an informational green signal that branch protection did not enforce.

The fix had three parts. The workflow added merge_group to the same required job. Branch protection required exactly one stable job name. A nightly audit compared required check names against recent merge group runs and opened an issue when a required check had zero merge group executions. The team also added a fixture where two PRs passed alone and failed together. That test would have caught the original configuration drift.

## What People Get Wrong

People treat merge queue testing as a CI speed problem. Speed matters, but correctness comes first. A queue that lands untested batches faster is worse than no queue because it gives everyone a false sense of safety.

The other mistake is hiding queue failures behind automatic retries. Retrying once can be sensible. Retrying until green trains engineers to ignore red evidence. A required check should mean the candidate satisfied a known policy, not that persistence eventually found a green minute.

AI coding agents make both mistakes easier. They can add a workflow trigger but forget branch protection. They can rename a job while "cleaning up" CI labels. They can add selective testing that skips the only package affected by a generated file. Use agents for inventory and patch generation, then make them produce auditable evidence: event names, SHAs, required check lists, and failure reproduction steps.

Ready-made QA skills install from qaskills.sh with the qaskills CLI, but the important habit is the same whether you use a packaged skill or your own scripts: every queue rule needs a testable artifact.

## A Runnable Merge Queue Audit

This small script checks a saved JSON payload of check runs. It is intentionally provider-neutral. Export recent check data from your CI system, normalize it, and fail the audit if required checks are missing for the merge group SHA.

\`\`\`json
{
  "mergeGroupSha": "abc123",
  "required": ["ci-unit-required", "ci-browser-smoke-required"],
  "runs": [
    { "name": "ci-unit-required", "headSha": "abc123", "conclusion": "success" },
    { "name": "ci-browser-smoke-required", "headSha": "abc123", "conclusion": "success" }
  ]
}
\`\`\`

\`\`\`javascript
import fs from 'node:fs';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node audit-merge-checks.mjs checks.json');
}

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const successful = new Set(
  payload.runs
    .filter((run) => run.headSha === payload.mergeGroupSha)
    .filter((run) => run.conclusion === 'success')
    .map((run) => run.name)
);

const missing = payload.required.filter((name) => !successful.has(name));
if (missing.length > 0) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}

console.log('all required checks passed on merge group candidate');
\`\`\`

Run it in CI after fetching provider data, or run it nightly as a drift detector.

\`\`\`bash
node audit-merge-checks.mjs merge-group-checks.json
\`\`\`

The script does not replace branch protection. It tests the assumptions around branch protection. That distinction matters because branch rules are often changed in a UI, outside normal code review.

## Queue Metrics Worth Keeping

Store queue history even if your provider has a UI. Provider dashboards are built for the current run. QA needs trend questions: is batch failure rising, did a required check rename reduce coverage, did selective testing change queue confidence, and who bypassed last month?

| Metric | Definition | Bad Smell |
|---|---|---|
| Queue wait time | Time from enqueue to merge or removal | Engineers avoid the queue |
| Candidate CI time | Time required checks take on merge group | Batch size or test selection needs tuning |
| Batch failure rate | Failed candidates divided by all candidates | Interaction risk or flakes are high |
| Retry budget spent | Automatic retries used per candidate | Flakes are taxing release flow |
| Required check coverage | Required checks present on merge group SHA | Protection drift |
| Bypass count | Manual merges around queue policy | Governance or outage process issue |

Measure by lane if you have lanes. A single average hides the fact that frontend browser tests may dominate queue time while backend contract tests rarely fail, or that one shared package creates most requeues.

## Frequently Asked Questions

### Should merge queue CI run the full test suite?

It should run every check required to prove the candidate is safe for the protected branch. That may be the full suite in a small repository. In a monorepo, it may be affected tests plus stable shared gates and contract checks. The line I would not cross is skipping a required behavior because the PR already passed alone. The merge group is different code, so it needs its own evidence.

### How do I test a merge queue without disrupting developers?

Use a sandbox repository first, then a low-risk protected branch in the real repository. Create two small PRs that pass alone but fail together. Confirm that the queue candidate runs required checks and blocks the batch. After that, test bypass, retries, and check name drift during a scheduled window. Keep the fixture branches around so the same test can be repeated after CI changes.

### Are flaky tests worse in a merge queue?

Yes, because a flaky required check can block unrelated pull requests and create pressure to bypass branch protection. The answer is not unlimited retries. Track failure signatures, set a retry budget, quarantine known flaky tests only with owner and expiry, and keep deterministic failures separate from likely flakes. A queue should expose test health problems, not cover them with repeated reruns.

### What evidence should QA attach to a merge queue signoff?

Attach the merge group SHA, required check names, workflow event names, batch size policy, retry policy, bypass audit path, and at least one combination-failure test result. Include screenshots only as supporting material. The stronger evidence is machine-readable: provider run URLs, check conclusions tied to the candidate SHA, and a drift audit that fails when required checks stop running on merge groups.
`,
};
