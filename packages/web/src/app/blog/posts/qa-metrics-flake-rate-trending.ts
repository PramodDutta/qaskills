import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QA Metrics Flake Rate Trending That Reveals Test-Suite Risk',
  description: 'Build QA metrics flake rate trending with trustworthy denominators, retry-aware events, confidence intervals, and diagnosis that drives reliable test fixes.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# QA Metrics Flake Rate Trending That Reveals Test-Suite Risk

QA metrics flake rate trending should measure how often the same test produces inconsistent outcomes for the same relevant code and environment, then show that rate over stable time or run cohorts. The most practical operational signal is the retry-recovered test rate: tests that fail an initial attempt and pass a retry, divided by tests eligible to retry. Keep it separate from final failure rate, infrastructure abort rate, and known-defect rate.

A credible trend requires test identity, attempt order, source revision, runner configuration, environment, shard, and outcome. It also needs an explicit denominator and rules for skipped, quarantined, cancelled, and retried tests. Without that event contract, a chart can improve simply because more stable tests were added, retries were disabled, or failing jobs stopped producing reports.

This guide builds a retry-aware data model, calculates rates and uncertainty in TypeScript and SQL, explains rolling and release-based views, diagnoses a realistic shard-related spike, and turns the results into a repair queue for QA engineers and AI coding agents.

## Decide which flake signal you are trending

\`Flake rate\` is not one universally defined formula. Name each metric by its numerator and denominator so readers can reproduce it.

| Metric | Numerator | Denominator | What it reveals |
|---|---|---|---|
| Retry-recovered test rate | Tests that fail before passing in the same run | Tests with an initial attempt and retry eligibility | Visible inconsistent outcomes masked by retry |
| Repeated-run inconsistency rate | Test and revision pairs producing both pass and fail across controlled repetitions | Test and revision pairs repeated enough to evaluate | Flakes that may pass on the first CI attempt |
| Flaky-test prevalence | Distinct tests classified flaky during the window | Distinct tests executed during the window | Breadth of instability across inventory |
| Flake-attributed attempt rate | Failed attempts classified as flaky | Completed test attempts | Runner cost and noise, sensitive to retry count |
| Infrastructure disruption rate | Tests or jobs invalidated by environment failure | Started tests or jobs | Lab instability, not test-level flakiness |

For a daily CI dashboard, retry-recovered test rate is observable and easy to explain. It undercounts flakes that pass first time and overstates flakiness if retries pass because code or environment changed during the run. Pair it with controlled repeated runs for important suites and with failure classification.

Do not put all five measures on one unlabeled line. A team may reduce flaky-test prevalence by deleting or quarantining tests while infrastructure disruption rises. Separate trends preserve the actual story.

## Define the unit: logical test, attempt, and run

A logical test is one declared test case under a fully qualified identity. An attempt is one execution of that logical test. A run is one invocation or coordinated shard group against a source revision and environment.

The hierarchy is:

\`\`\`text
run: source revision + workflow + environment + runner configuration
  logical test: project + file + suite path + test title + parameters
    attempt 0: failed
    attempt 1: passed
\`\`\`

The test in this example is retry-recovered. It contributes one to the numerator and one to the eligible-test denominator. It does not contribute two tests or a 50% flake rate. Attempts are useful for cost analysis, but the operational inconsistency occurred at the logical-test level.

Stable identity is hard when tests are renamed, generated dynamically, or moved. Store both a human-readable full title and a source-oriented key. Do not rely only on line number because ordinary edits move lines. Do not rely only on title because two projects or parameter values may share it.

A practical event type is:

\`\`\`ts
export type TestAttemptEvent = {
  runId: string;
  revision: string;
  workflow: string;
  environment: string;
  project: string;
  shard: string | null;
  testFile: string;
  suitePath: string[];
  title: string;
  parameterKey: string | null;
  attemptIndex: number;
  startedAt: string;
  durationMs: number;
  outcome: 'passed' | 'failed' | 'timed_out' | 'skipped' | 'interrupted';
  failureClass: string | null;
};
\`\`\`

Keep raw runner output as evidence and transform it into this normalized model. The transformation should be versioned because runner schemas and organizational classifications can change.

## Write denominator rules before calculating percentages

The denominator is where most misleading flake dashboards begin. Decide what counts as an eligible logical test for each metric.

For retry-recovered rate, a defensible default is:

- Include logical tests with a completed initial attempt in a run where retries were configured for that test.
- Count a test once per coordinated run, even if it has several retry attempts.
- Count it in the numerator if an earlier attempt failed or timed out and a later attempt passed without a relevant code or configuration change.
- Exclude tests skipped before execution.
- Report interrupted tests and incomplete jobs separately.
- Keep quarantined tests in a separate series unless they execute under equivalent conditions.
- Do not label a fail-then-pass sequence flaky if the environment was repaired between attempts.

The last rule requires event context. If a database is restarted between attempts, the behavior may reflect infrastructure recovery rather than nondeterministic test logic. Both are reliability problems, but they have different owners and fixes.

| Situation | Main flake numerator? | Separate reporting |
|---|---:|---|
| Assertion fails, immediate retry passes | Yes, pending classification | Test identity, failure signature, shard |
| Browser process crashes, retry passes | No by default | Infrastructure disruption |
| Test fails on revision A, passes on revision B | No | Code-change result |
| Test is skipped by conditional logic | No | Skip rate and reason |
| Job cancelled before test completes | No | Incomplete-run rate |
| Quarantined test alternates under repeated run | Separate quarantine series | Aging, owner, failure signature |

Publish these rules next to the chart. A trend without a metric definition is a decoration.

## Normalize retry sequences into logical outcomes

The transformer must group attempts by run and logical identity, order them by \`attemptIndex\`, and reject impossible sequences. A passed initial attempt with an unexplained second attempt may reflect runner repetition rather than retry. Keep modes distinct.

This dependency-free TypeScript code classifies a logical test's attempt sequence:

\`\`\`ts
type Outcome = 'passed' | 'failed' | 'timed_out' | 'skipped' | 'interrupted';

export type LogicalOutcome =
  | 'first_pass'
  | 'retry_recovered'
  | 'final_failure'
  | 'skipped'
  | 'incomplete';

export function classifyAttempts(attempts: Outcome[]): LogicalOutcome {
  if (attempts.length === 0) return 'incomplete';
  if (attempts[0] === 'skipped') return 'skipped';
  if (attempts.includes('interrupted')) return 'incomplete';
  if (attempts[0] === 'passed') return 'first_pass';

  const last = attempts[attempts.length - 1];
  if (last === 'passed') return 'retry_recovered';
  return 'final_failure';
}

console.log(classifyAttempts(['failed', 'passed']));
console.log(classifyAttempts(['timed_out', 'failed']));
\`\`\`

This function assumes its input already contains attempts for one logical test in index order. Validate that attempt indexes are unique and contiguous during ingestion. Also preserve failure signatures. A timeout followed by an assertion failure may involve more than one fault.

The rate calculator then works on logical classifications:

\`\`\`ts
import { classifyAttempts, type LogicalOutcome } from './classify-attempts.js';

export function retryRecoveredRate(outcomes: LogicalOutcome[]): number {
  const eligible = outcomes.filter((outcome) => {
    return (
      outcome === 'first_pass' ||
      outcome === 'retry_recovered' ||
      outcome === 'final_failure'
    );
  });

  if (eligible.length === 0) return Number.NaN;
  const recovered = eligible.filter(
    (outcome) => outcome === 'retry_recovered',
  ).length;
  return recovered / eligible.length;
}

const sequences = [
  ['passed'],
  ['failed', 'passed'],
  ['failed', 'failed'],
  ['skipped'],
] as const;

const outcomes = sequences.map((sequence) =>
  classifyAttempts([...sequence]),
);
console.log(retryRecoveredRate(outcomes));
\`\`\`

Returning \`Number.NaN\` for an empty denominator is deliberate. Zero would falsely claim perfect stability when no eligible tests ran. Dashboards should display \`no data\` and trigger a data-quality check if execution was expected.

## Store one row per attempt, aggregate one row per test run

An append-only attempt table makes recalculation possible. A separate normalized logical-outcome view prevents every dashboard from reinventing retry grouping.

A PostgreSQL query can aggregate ordered outcomes when the source table has one row per attempt:

\`\`\`sql
WITH sequences AS (
  SELECT
    run_id,
    test_identity,
    ARRAY_AGG(outcome ORDER BY attempt_index) AS outcomes
  FROM test_attempts
  WHERE started_at >= TIMESTAMPTZ '2026-07-01T00:00:00Z'
    AND started_at < TIMESTAMPTZ '2026-08-01T00:00:00Z'
  GROUP BY run_id, test_identity
), classified AS (
  SELECT
    run_id,
    test_identity,
    CASE
      WHEN outcomes[1] = 'skipped' THEN 'skipped'
      WHEN 'interrupted' = ANY(outcomes) THEN 'incomplete'
      WHEN outcomes[1] = 'passed' THEN 'first_pass'
      WHEN outcomes[CARDINALITY(outcomes)] = 'passed' THEN 'retry_recovered'
      ELSE 'final_failure'
    END AS logical_outcome
  FROM sequences
)
SELECT
  COUNT(*) FILTER (WHERE logical_outcome = 'retry_recovered')
    AS retry_recovered_tests,
  COUNT(*) FILTER (
    WHERE logical_outcome IN ('first_pass', 'retry_recovered', 'final_failure')
  ) AS eligible_tests
FROM classified;
\`\`\`

This query demonstrates the aggregation, not a complete platform schema. In production, filter by workflow and retry policy, validate coordinated shard completion, and join infrastructure classification before placing events in the main numerator.

Keep the source revision and runner configuration at the run level. If a retry executes after a new deployment, it is not evidence about the same code. Likewise, a browser project change or feature-flag change can alter relevant conditions.

## Capture Playwright retry evidence without scraping console text

Playwright supports configured reporters, including a JSON reporter. Prefer a structured report over regular expressions against human-readable console output. The configuration below selects a line reporter for the terminal and JSON output for ingestion:

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
  ],
  use: {
    trace: 'on-first-retry',
  },
});
\`\`\`

The JSON report should be treated as runner-specific input. Write a tested adapter that maps its suites, specs, tests, results, retry indexes, projects, statuses, and attachments into your event model. Preserve the original report as a build artifact for a defined retention period.

Retries expose flakes but do not repair them. One retry is usually enough to surface a fail-then-pass signal while controlling cost, though that value is illustrative. Some critical investigations use repeated execution separately. Do not silently increase retries to make the final pipeline greener.

The choice of runner affects result semantics, configuration, and reporter APIs. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps teams choose and separate unit, integration, and browser responsibilities. Normalize only after respecting each runner's documented model.

## Trend rates with counts and uncertainty

A rate from twenty tests is much noisier than a rate from twenty thousand. Plot numerator, denominator, and interval alongside the point estimate. Confidence intervals do not correct biased classification, but they prevent overreaction to small samples.

The Wilson score interval is useful for a binomial proportion and avoids some weaknesses of the simple normal approximation near zero. This runnable implementation uses a 1.96 z value for an illustrative 95% interval:

\`\`\`ts
export function wilsonInterval(
  successes: number,
  trials: number,
  z = 1.96,
): { lower: number; upper: number } {
  if (!Number.isInteger(successes) || !Number.isInteger(trials)) {
    throw new TypeError('Counts must be integers');
  }
  if (trials <= 0 || successes < 0 || successes > trials) {
    throw new RangeError('Expected 0 <= successes <= trials and trials > 0');
  }

  const p = successes / trials;
  const zSquared = z * z;
  const denominator = 1 + zSquared / trials;
  const center = (p + zSquared / (2 * trials)) / denominator;
  const margin =
    (z / denominator) *
    Math.sqrt((p * (1 - p) + zSquared / (4 * trials)) / trials);

  return { lower: center - margin, upper: center + margin };
}

console.log(wilsonInterval(8, 400));
\`\`\`

The binomial independence assumption is imperfect because the same tests run repeatedly and failures can cluster during one incident. Treat the interval as descriptive, and use more appropriate hierarchical or time-series methods when formal inference matters.

Choose trend buckets based on release cadence and volume:

| View | Advantage | Risk | Recommended companion |
|---|---|---|---|
| Per CI run | Immediate diagnosis | Very noisy, suite composition varies | Run metadata and shard completion |
| Daily | Fast operational feedback | Weekday and workload effects | Seven-day rolling counts |
| Weekly | Stable for moderate volume | Can hide short incidents | Daily incident overlay |
| Per release | Matches decisions | Releases differ in size | Test and project mix |
| Fixed number of executions | Comparable denominator | Calendar spacing varies | Deployment timeline |

Never average daily percentages to produce a monthly rate unless daily denominators are equal. Sum numerators and denominators, then divide. A day with one flaky result among ten tests should not carry the same weight as a day with ten among ten thousand.

## Use rolling windows without erasing incidents

A seven-day or twenty-run rolling rate can reveal direction, but smoothing hides onset and recovery. Plot raw daily points faintly, rolling rate prominently, and mark runner upgrades, shard changes, environment incidents, and quarantine policy changes.

This TypeScript helper calculates a count-weighted rolling rate:

\`\`\`ts
type RatePoint = {
  bucket: string;
  recovered: number;
  eligible: number;
};

export function rollingRates(points: RatePoint[], windowSize: number) {
  if (!Number.isInteger(windowSize) || windowSize < 1) {
    throw new RangeError('windowSize must be a positive integer');
  }

  return points.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = points.slice(start, index + 1);
    const recovered = window.reduce((sum, item) => sum + item.recovered, 0);
    const eligible = window.reduce((sum, item) => sum + item.eligible, 0);

    return {
      bucket: point.bucket,
      recovered,
      eligible,
      rate: eligible === 0 ? Number.NaN : recovered / eligible,
    };
  });
}

console.log(
  rollingRates(
    [
      { bucket: '2026-08-01', recovered: 2, eligible: 200 },
      { bucket: '2026-08-02', recovered: 8, eligible: 400 },
      { bucket: '2026-08-03', recovered: 3, eligible: 300 },
    ],
    2,
  ),
);
\`\`\`

Do not use a rolling window as the only alert input. A sudden large spike may remain diluted by six stable days. Pair an absolute threshold with a change detector or compare the current bucket against a documented baseline, while requiring a minimum denominator.

Thresholds should reflect cost and risk, not an industry-wide magic percentage. A single flaky payment test may matter more than ten unstable visual experiments. Add criticality and ownership to prioritization, but keep the raw rate objective.

## Segment the trend before assigning a fix

The suite-level rate tells you whether reliability changed. Segments tell you where. Slice by project, browser, operating system, runner version, test type, owner, shard, worker count, retry index, duration band, failure signature, and environment.

Avoid a dashboard with dozens of permanent slices. Start with dimensions connected to a hypothesis. If instability rose after enabling parallel workers, compare serial-sensitive tests, shard, worker count, and resource pressure. If only WebKit changes, inspect browser-specific behavior and environment rather than rewriting every assertion.

Useful segment table:

| Segment | Recovered / eligible | Rate | Interpretation prompt |
|---|---:|---:|---|
| Chromium, shard 1 | 4 / 2,100 | 0.19% | Within baseline? |
| Chromium, shard 4 | 31 / 1,980 | 1.57% | Resource or data collision? |
| Firefox, all shards | 6 / 1,850 | 0.32% | Browser-specific signatures? |
| WebKit, all shards | 7 / 1,700 | 0.41% | Any platform concentration? |

These values are illustrative. Counts expose why the fourth shard deserves attention without declaring its cause.

For browser tests, selector failures are a common signature. Stable user-facing locators reduce false timing and structure dependencies, but even good locators cannot fix shared-state races. The [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) helps distinguish locator design problems from synchronization and isolation problems.

## Diagnose a flake spike after changing shard count

Consider a realistic failure. The seven-day retry-recovered rate jumps from an illustrative 0.4% to 1.8% after CI changes from two shards to eight. The final pass rate barely changes because retries recover most failures. Teams first blame the runner upgrade that happened in the same week.

A disciplined diagnosis follows the event data:

1. Confirm ingestion completeness. All eight shards uploaded reports, and run grouping recognizes them as one coordinated run.
2. Compare failures by project and signature. Most are API responses reporting \`email already exists\` during account creation.
3. Compare by shard. Failures concentrate where tests start at nearly the same time, not in a particular browser.
4. Inspect test data generation. Email addresses use the source revision and test title, so identical tests across retries and some parameter cases collide.
5. Inspect cleanup. Deletion happens in \`afterEach\`, but a timed-out test can leave the record until asynchronous cleanup completes.
6. Run a controlled repetition with unique run, worker, and test identifiers. The collision disappears without changing the runner version.

The increased shard count exposed a data-isolation defect. The tests were always capable of collision, but lower concurrency made it rare. The correct fix is unique, traceable test data plus reliable cleanup, not extra waiting or more retries.

A safe identifier helper can combine run and worker context passed by the caller:

\`\`\`ts
import { createHash } from 'node:crypto';

export function testEmail(
  runId: string,
  workerId: string,
  testIdentity: string,
): string {
  const input = runId + ':' + workerId + ':' + testIdentity;
  const suffix = createHash('sha256').update(input).digest('hex').slice(0, 16);
  return 'qa+' + suffix + '@example.test';
}

console.log(testEmail('run-481', 'worker-3', 'signup accepts invited user'));
\`\`\`

The reserved \`.test\` top-level domain prevents accidental real delivery. In an application that rejects that domain, use an owned sink domain. The helper is deterministic for one identity, so callers that create the same entity twice in a single test should also pass an explicit case or sequence identifier.

After the fix, monitor the exact failure signature and the overall segment. A drop in \`email already exists\` combined with stable denominators supports the diagnosis. If total flake remains high, investigate the next signatures rather than claiming the suite is repaired.

## Classify failures with evidence and allow unknown

Retry-recovered is an observed sequence, not a root-cause label. Add a classification workflow that groups by normalized signature and uses trace, logs, screenshot, environment events, and reproduction.

Useful top-level classes include:

- Product race or eventual-consistency behavior.
- Test synchronization or assertion timing.
- Test data collision or leaked state.
- Locator instability.
- External dependency instability.
- Runner or browser crash.
- Capacity or environment exhaustion.
- Order dependence.
- Unclassified.

Do not force every failure into \`test bug\` or \`product bug\`. A timeout can be the first symptom of either, and the distinction may require investigation. Store classifier, evidence link, confidence, and timestamp. Reclassification should not overwrite history.

AI coding agents are effective at clustering sanitized stack traces and mapping recurring signatures to known owners. Ask the agent to quote the matching evidence and to return unknown for weak matches. Do not let it close issues or quarantine tests based solely on text similarity. A shared \`Timeout 30000ms exceeded\` line often groups unrelated causes.

## Prioritize by interruption cost and product risk

Raw rate finds frequent flakes, but priority should include how much they obstruct delivery and what behavior they protect. A low-frequency failure in a payment or authorization test may deserve faster attention than a frequent non-blocking experiment.

Construct a transparent queue with:

| Field | Purpose |
|---|---|
| Test identity and owner | Direct responsibility |
| Recovered count and eligible count | Frequency with denominator |
| First seen and last seen | Age and current activity |
| Failure signatures | Evidence of one or several causes |
| Blocked pipeline minutes | Operational interruption |
| Product criticality | Consequence if the test is ignored |
| Quarantine state and expiry | Temporary containment visibility |
| Reproduction status | Confidence in proposed repair |

Any composite score uses organizational judgment. Publish its formula and show raw fields. Avoid decimal precision that implies more certainty than the inputs support.

Ready-made QA skills install from qaskills.sh with the qaskills CLI if you want an AI agent to follow a consistent triage procedure. Review the workflow against your runner reports, privacy policy, and issue process before using it in automation.

## Quarantine without laundering the trend

Quarantine can restore delivery flow while a known flaky test is repaired, but removing quarantined tests from all reporting makes the main chart look better by definition. Keep three series:

1. Required-suite retry-recovered rate.
2. Quarantined-suite inconsistency rate.
3. Combined flaky-test prevalence across all tests that executed.

Every quarantine entry needs an owner, reason, evidence, creation date, repair issue, expiry or review date, and behavior for the pipeline. Some quarantined tests should continue running non-blockingly to collect evidence. Others may need temporary disabling if they mutate shared state or consume significant resources.

Quarantine is not appropriate for a reproducible product defect. If the test correctly catches a known release blocker, mark the product outcome and fix or consciously accept that defect through the normal process. Calling it flaky because a retry sometimes lands on a healthy instance can hide a real distributed failure.

Audit the quarantine queue regularly. Report tests entering, leaving through repair, leaving through deletion, and aging past policy. Deleting an obsolete test may be correct, but it is not a flake fix and should not be counted as one.

## What people get wrong about flake-rate charts

The most common analytical mistake is dividing recovered attempts by all attempts. Increasing retries then increases the denominator and may change the rate even if logical-test instability is constant. Define a logical-test metric and an attempt-cost metric separately.

Other frequent errors include:

- Counting final failures as flakes without evidence of inconsistent behavior.
- Treating every retry pass as a test-code fault when infrastructure changed.
- Dropping cancelled jobs, which can hide the worst reliability incidents.
- Averaging percentages across projects with unequal execution counts.
- Ignoring new, removed, renamed, or quarantined tests in the denominator.
- Comparing a full regression day with a small pull-request suite day.
- Adding waits until retries pass and calling that a fix.
- Ranking authors by flaky tests, which discourages honest ownership.
- Using one suite-wide threshold for critical and experimental coverage.
- Forgetting to annotate runner, browser, worker, and environment changes.

A green final pipeline can coexist with a deteriorating first-attempt signal. That is exactly why retry-aware trending is valuable. It surfaces hidden cost before teams normalize rerunning jobs.

## Establish an operating loop for reliable suites

Make the trend actionable through a regular loop:

1. Ingest every completed and incomplete run with source revision and configuration.
2. Validate expected shard and report counts before publishing rates.
3. Normalize attempts into logical outcomes with versioned rules.
4. Publish numerator, denominator, uncertainty, and data-quality warnings.
5. Detect meaningful changes and annotate known system events.
6. Segment by failure signature and the smallest useful environmental dimensions.
7. Assign a bounded investigation with reproduction evidence.
8. Contain severe disruption through time-limited quarantine when necessary.
9. Verify the fix through controlled repetition and subsequent CI trend.
10. Record what class of prevention should change fixtures, helpers, infrastructure, or review guidance.

For a test repaired by synchronization, add a focused stress run against the unchanged product behavior. For a data collision, vary worker and shard counts. For an external dependency, introduce a supported stub at lower layers while retaining a smaller real contract check. Fix verification should target the diagnosed mechanism.

The healthiest trend is not necessarily zero. A nonzero signal may remain because rare environmental conditions are difficult to eliminate, while a reported zero can mean retries or telemetry disappeared. Track collection coverage and controlled repeated-run results so silence is not mistaken for stability.

## Frequently Asked Questions

### Is every fail-then-pass test definitely flaky?

It is an inconsistent observed sequence, but classification still needs context. If code, configuration, credentials, deployment state, or infrastructure changed between attempts, the pass may reflect recovery rather than test nondeterminism. Preserve attempt timing, revision, environment events, failure signature, and attachments. Put the sequence in the retry-recovered numerator only under your documented eligibility rules, then classify its likely cause separately. Allow unknown until evidence supports a diagnosis. The operational cost is real even when the root cause is not yet known.

### Should skipped and quarantined tests be included in the denominator?

Tests skipped before an initial attempt should not enter a retry-recovered denominator because no pass or failure was observed. Report skip rate and reasons separately. Quarantined tests should usually form their own executed series so containment does not cosmetically improve the required-suite trend. A combined prevalence view can retain visibility across both populations. Publish counts for disabled tests too, since a test that never runs supplies no reliability evidence and can otherwise disappear from every chart.

### What time window is best for flake rate trending?

Match the window to execution volume and response speed. High-volume suites can support daily points plus a short rolling view. Lower-volume release suites may need weekly or fixed-execution cohorts. Always show raw counts and mark changes to suite composition, retries, shards, and environments. Keep an unsmoothed view for incident onset because rolling windows dilute spikes. There is no universal seven-day or thirty-day answer. Choose the smallest window with a useful denominator, then preserve longer history for seasonality and structural change.

### How do we prove that a flaky-test fix worked?

First reproduce the diagnosed mechanism under controlled conditions. Apply the fix, rerun the same revision and environment enough times to exercise that mechanism, and compare failure signatures rather than only final pass rate. Then observe ordinary CI with stable denominators and configuration. For concurrency defects, vary workers and shards. For order dependence, randomize or deliberately reverse order. For timing defects, use traces and explicit state assertions. A disappearing test, increased retries, or broader timeout does not prove repair. Record the verification evidence with the issue.
`,
};
