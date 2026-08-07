import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Artifact Retention Cost Optimization Without Losing Debug Evidence',
  description: 'Use CI artifact retention cost optimization to cut storage and transfer waste while preserving the test evidence engineers need to diagnose failures.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# CI Artifact Retention Cost Optimization Without Losing Debug Evidence

CI artifact retention cost optimization is the discipline of keeping each build output for the shortest period that still serves a defined consumer. The practical answer is not one global expiration number. Classify artifacts by purpose, upload fewer artifacts on successful runs, give failures a diagnosis window, and preserve only release or compliance evidence for long periods. Measure stored bytes by artifact class and access age before changing policy.

For QA teams, screenshots, videos, traces, coverage reports, test logs, JUnit XML, packaged applications, and performance results have very different value curves. A Playwright trace from a failed pull request is valuable today and almost useless after the branch is merged. A signed release bundle may need durable, separately governed retention. Treating both alike either wastes money or destroys evidence.

This guide turns that idea into an auditable workflow for GitHub Actions and GitLab CI. It shows how to inventory storage, model cost drivers, change upload conditions safely, validate expiration behavior, and diagnose the common failure where a "small" test suite quietly produces gigabytes of duplicate media.

## Start with consumers, not a blanket number of days

Every retained file should have an answer to three questions: who will retrieve it, what decision will it support, and by when? If a team cannot name a consumer, stop uploading it or keep it briefly while collecting access evidence. Do not begin by declaring that all artifacts expire after seven or thirty days. That hides important distinctions and invites exceptions that become permanent.

Build an inventory from workflow files and the CI provider's storage reports or API. Include artifacts created inside archives, because a 20 MB ZIP may unpack into thousands of duplicate logs, and include reports the CI platform ingests separately from downloadable artifacts.

| Artifact class | Primary consumer | High-value window | Typical disposition |
|---|---|---|---|
| Failed UI trace | Engineer fixing the current commit | Hours to a few days | Short retention, failure only |
| Failed screenshot | Engineer or product reviewer | Current investigation | Short retention, failure only |
| Full test video | Rarely needed unless failure is visual | Short diagnosis window | Record on failure or retain briefly |
| JUnit XML | CI test-report parser and flaky-test analysis | Pipeline plus trend window | Publish report, retain compact source as needed |
| Coverage output | Reviewer and coverage service | Pull request lifetime | Keep summary, avoid redundant HTML archives |
| Release package | Deployment and rollback systems | Release lifecycle | Govern outside transient test evidence |
| Performance result | Performance owner comparing baselines | Defined trend horizon | Store compact metrics long-term, raw samples briefly |
| Security evidence | Security and compliance reviewer | Policy-defined period | Explicit controlled class, not default CI debris |

Artifact is an overloaded term. A CI job artifact is not automatically a release artifact, backup, legal record, or analytics store. Moving long-lived outputs into a purpose-built registry or object store can improve lifecycle control, but it also changes access, integrity, and audit responsibilities. Make that migration an explicit architecture decision.

## Measure the three cost multipliers

Stored bytes are only one driver. Upload and download transfer, runner time spent compressing, developer wait time, and API listing overhead can dominate. The useful measurement unit is artifact class per pipeline outcome, not only total account storage.

For each class, collect:

- Compressed bytes uploaded per job.
- Upload frequency and success versus failure ratio.
- Retention duration configured and effective.
- Download count and age at last download.
- Compression and upload time in the critical path.
- Duplication across shards, retries, and matrix jobs.
- Whether the same data is already sent to a report service.

A simple monthly approximation helps prioritize work:

\`\`\`text
stored byte-days = compressed bytes per run
                 x runs per day
                 x average retained days

monthly transfer = uploaded bytes + downloaded bytes

runner overhead = compression seconds + upload seconds + download seconds
\`\`\`

Do not present this as an invoice formula. Providers price storage and transfer differently, may include allowances, and can change billing rules. Use current provider billing data for financial forecasts. The byte-day model is a stable engineering comparison: if two policy options use the same provider, their relative storage pressure becomes visible.

| Cost multiplier | Signal to capture | Optimization lever | Regression risk |
|---|---|---|---|
| Artifact size | Compressed bytes by name | Exclude noise, reduce media, split classes | Missing diagnostic file |
| Upload rate | Artifacts per workflow outcome | Upload heavy evidence only on failure | Intermittent pass loses useful baseline |
| Retention | Byte-days by class | Shorten transient classes | Evidence expires before triage |
| Duplication | Hash or path overlap across jobs | Merge once, avoid shard bundles | Aggregation job becomes bottleneck |
| Download volume | Count and age of retrieval | Publish summaries, selective bundles | Engineers cannot self-serve details |
| Runner time | Step duration and CPU | Avoid compression of unused output | Larger uncompressed transfer |

Record a baseline for at least one representative development cycle if possible. A release week, dependency update, or incident can distort failure rates. If urgency requires an immediate change, begin with obviously redundant success media and retain rollback data for the policy itself.

## Make test output intentional before tuning expiration

Retention cannot fix an artifact that is unnecessarily huge at creation. First reduce what the test runner emits. For browser tests, capture traces and videos according to the diagnosis policy supported by the runner. Avoid copying the entire working directory into every shard. Remove dependency caches, source checkouts, downloaded browsers, secrets, and temporary server data from artifact paths.

Create a manifest before upload so reviewers can see what is included. This Bash example inventories a known results directory without modifying it:

\`\`\`bash
set -euo pipefail

results_dir="test-results"
if [ ! -d "$results_dir" ]; then
  echo "No test results directory"
  exit 0
fi

du -sh "$results_dir"
find "$results_dir" -type f -print0 \\
  | xargs -0 du -k \\
  | sort -n \\
  | tail -n 30
\`\`\`

The command is diagnostic, not a deletion step. Review the largest files and their consumers before adding exclusions.

Common sources of accidental growth include videos recorded for passing tests, one trace per retry and shard, network payload dumps, repeated screenshots in polling loops, HTML reports that embed images while also uploading the image folder, heap dumps, and server logs with unbounded request bodies. Fix the producer where possible. A cleanup script after the fact can hide excessive test behavior and makes local reproduction differ from CI.

## Define a tiered retention policy with ownership

A tier is useful only when it has entry criteria and an owner. Name tiers after purpose rather than vague importance. For example: ephemeral diagnostics, active-branch evidence, trend data, release deliverables, and governed records.

| Retention tier | Entry criteria | Format strategy | Owner and review trigger |
|---|---|---|---|
| Ephemeral diagnostics | Reproducible failure evidence | Detailed trace, log, screenshot | QA platform, review when median triage time changes |
| Active-change evidence | Needed through pull request review | Compact report and selected diagnostics | Repository maintainers, review when merge cycle changes |
| Trend metrics | Used for longitudinal analysis | Structured, aggregated records | Quality analytics owner, review with dashboard needs |
| Release deliverables | Deployable or rollback output | Immutable package plus provenance | Release engineering, review with support window |
| Governed records | Explicit compliance or security requirement | Access-controlled, integrity protected | Policy owner, review on policy change |

Set a default tier for new artifacts, preferably short-lived. Require the workflow author to opt into longer retention with a reason in code review. Add a periodic report that identifies artifact names without a recognized class.

The key distinction is raw versus derived data. A load test may emit millions of samples, but the long-term consumer may need percentiles, thresholds, environment metadata, and a link to the commit. Keep the compact result for trends and raw samples only through the investigation window. Similarly, JUnit XML can feed test analytics while full console output expires sooner.

## Configure GitHub Actions uploads around outcomes

GitHub's official \`actions/upload-artifact\` action supports a \`retention-days\` input, subject to repository or organization retention settings. Use the maintained action documentation at https://github.com/actions/upload-artifact for current behavior. Do not hardcode a number copied from another organization without confirming the allowed policy range.

Separate compact reports from heavy failure evidence so each can have its own condition and retention value.

\`\`\`yaml
name: browser-tests
on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run test:e2e

      - name: Upload compact test report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: e2e-report-\${{ github.run_attempt }}
          path: reports/junit.xml
          retention-days: 14

      - name: Upload failure diagnostics
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: e2e-failure-\${{ github.run_attempt }}
          path: test-results/
          retention-days: 5
\`\`\`

The example values illustrate tiering, not universal recommendations. Align the diagnosis window with actual time to first triage, weekend and holiday coverage, and whether pull requests commonly stay open longer.

\`if: always()\` needs thought. It makes the step run after preceding failures, which is useful for reports, but the expected file may not exist if installation or setup failed. The artifact action can be configured for missing-file behavior according to its documented inputs, or you can guard report production. Do not let an absent report turn the original infrastructure failure into a confusing upload failure.

Matrix and shard jobs need unique names. Include stable dimensions such as browser and shard index, not timestamps that defeat grouping. A later aggregation job can download and merge compact reports, but do not download gigabytes of traces merely to re-upload them as one archive.

## Apply the same lifecycle reasoning in GitLab CI

GitLab CI job artifacts support an \`expire_in\` setting under \`artifacts\`, and report artifacts such as JUnit can be declared under \`artifacts:reports\`. Consult the current official documentation at https://docs.gitlab.com/ci/jobs/job_artifacts/ because instance policy and project settings affect effective behavior.

\`\`\`yaml
browser_tests:
  stage: test
  script:
    - npm ci
    - npm run test:e2e
  artifacts:
    when: on_failure
    expire_in: 5 days
    paths:
      - test-results/
    reports:
      junit: reports/junit.xml

unit_tests:
  stage: test
  script:
    - npm ci
    - npm run test:unit -- --reporter=junit --outputFile=reports/unit.xml
  artifacts:
    when: always
    expire_in: 14 days
    reports:
      junit: reports/unit.xml
\`\`\`

Verify the exact test-runner arguments in the repository before using the illustrative unit command. The retention design does not depend on a particular runner flag.

GitLab can ingest JUnit report artifacts for test reporting. A compact report may serve UI and flaky-test analysis even when a downloadable browser evidence bundle expires sooner. The relationship between GitLab reports and repeat failures is explored in [GitLab CI JUnit reporting for flaky tests](/blog/gitlab-ci-junit-report-flaky-tests).

Be aware that platform features which keep artifacts from selected pipelines can extend effective retention beyond the job's nominal \`expire_in\`. Review project and instance settings, protected references, release links, and manual keep actions before forecasting savings. The test for a policy is observation of actual artifacts over time, not only YAML inspection.

## Cancel superseded pipelines before they manufacture waste

Retention deals with stored output after a run. Cancellation prevents stale work from creating output at all. Pull requests often receive several commits while long browser suites are running. If every obsolete run completes, it consumes runner time and uploads evidence no one will inspect.

Use the CI provider's supported concurrency or interruptibility controls based on workflow semantics. Cancellation is safe only when the job has no required external side effect and cleanup remains reliable. Deployment, migration, and stateful environment jobs require separate design.

On GitHub Actions, a concurrency group can identify runs for the same workflow and pull request or reference:

\`\`\`yaml
concurrency:
  group: e2e-\${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
\`\`\`

Test the expression for every event that triggers the workflow. Pull request fields are not present on every event, which is why a reference fallback is shown. A complete cancellation strategy, including teardown and reporting, is covered in [canceling stale E2E runs on a new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit).

After enabling cancellation, track canceled jobs separately from failures. Do not upload full failure diagnostics for an expected cancellation unless they are needed to debug cleanup. Confirm that partially written archives do not remain and temporary test environments are reclaimed.

## Preserve diagnosis value with selective packaging

Smaller artifacts should still answer the first triage questions: what failed, with which inputs and environment, at what step, and where can the engineer reproduce it? Create a compact manifest that points to the relevant media and excludes unrelated passing cases.

\`\`\`json
{
  "schema": 1,
  "commit": "COMMIT_SHA_FROM_CI",
  "runAttempt": "RUN_ATTEMPT_FROM_CI",
  "suite": "checkout-chromium",
  "failedTests": [
    {
      "id": "apply-expired-coupon",
      "trace": "traces/apply-expired-coupon.zip",
      "screenshot": "screenshots/apply-expired-coupon.png"
    }
  ]
}
\`\`\`

Populate CI metadata from trusted environment variables using a script, not by literally uploading placeholders. Avoid secrets, access tokens, cookies, authorization headers, and customer data. Browser traces can capture DOM content and network information, so short retention does not remove the need for sanitization and access control.

A deterministic packaging script can copy files referenced by failed test results into a staging directory. Fail closed on paths outside the known result root, and keep the original runner output until packaging is validated. Do not use broad recursive deletion in CI cleanup logic.

\`\`\`ts
import path from 'node:path';

export function safeArtifactPath(root: string, candidate: string): string {
  const absoluteRoot = path.resolve(root);
  const absoluteCandidate = path.resolve(root, candidate);
  const prefix = absoluteRoot.endsWith(path.sep)
    ? absoluteRoot
    : absoluteRoot + path.sep;

  if (!absoluteCandidate.startsWith(prefix)) {
    throw new Error(\`Artifact path escapes result root: \${candidate}\`);
  }
  return absoluteCandidate;
}
\`\`\`

This boundary check is about packaging integrity. Follow symbolic links and platform-specific paths only according to a reviewed policy. An even simpler design is for the test runner to write all eligible evidence under one dedicated directory with no untrusted filenames.

## Validate retention as a behavior, not a configuration review

A YAML diff proves intent, not outcome. Validate the lifecycle in a non-critical repository or with clearly named canary artifacts. Upload one artifact per tier, record provider ID, creation time, configured expiration, branch or tag context, and whether any keep or release reference applies. Query or inspect them after the expected boundary.

| Validation question | Evidence | Failure interpretation |
|---|---|---|
| Did the job create only expected classes? | Artifact names and sizes per run | Upload conditions or paths are broad |
| Is configured expiry visible? | Provider metadata or UI | Setting rejected, capped, or overridden |
| Does failure-only evidence skip passes? | Successful canary run | Conditional is wrong if heavy bundle exists |
| Are canceled runs clean? | Canceled canary plus environment inventory | Finalization or teardown is incomplete |
| Can a developer diagnose before expiry? | Timed retrieval exercise | Retention window or manifest is inadequate |
| Does deletion match policy? | Observation after lifecycle boundary | Keep rule, release association, or sweeper lag |

Allow for documented asynchronous cleanup. Expiration metadata and physical deletion may not occur at the exact same second. For cost reporting, use provider-reported billable storage rather than assuming a file disappears instantly.

Add policy tests that parse workflow configuration for recognized artifact names and retention inputs. These tests catch accidental omission, but keep them flexible enough for platform syntax. A repository linter can flag uploads of \`./\`, dependency directories, or test results on all successful shards. It should report a reviewable warning before becoming a hard gate.

\`\`\`ts
type ArtifactObservation = {
  name: string;
  bytes: number;
  outcome: 'success' | 'failure' | 'cancelled';
};

export function summarize(observations: ArtifactObservation[]) {
  return observations.reduce<Record<string, { count: number; bytes: number }>>(
    (totals, artifact) => {
      const key = \`\${artifact.outcome}:\${artifact.name.replace(/[0-9]+/g, '#')}\`;
      totals[key] ??= { count: 0, bytes: 0 };
      totals[key].count += 1;
      totals[key].bytes += artifact.bytes;
      return totals;
    },
    {},
  );
}
\`\`\`

Normalize names carefully. The illustrative expression groups numeric suffixes, but it can collapse meaningful browser versions or shard dimensions. Prefer explicit class labels in artifact metadata when the platform and collection process allow them.

## Diagnose the duplicate-media storage spike

A realistic incident starts with a sudden storage alert even though test count barely changed. The workflow has eight shards. Each shard uploads its own \`test-results\` folder on every outcome. A report-generation step also embeds all screenshots and then uploads the HTML directory. Retries produce a second trace while the first remains. One failure therefore creates several copies of the same media, and passing runs retain video too.

Diagnose methodically:

1. Compare artifact bytes by workflow, job, shard, outcome, and run attempt.
2. List the largest archive members without extracting into an uncontrolled path.
3. Hash candidate files in a safe working directory to estimate exact duplication.
4. Compare runner configuration with workflow upload paths.
5. Check whether a report embeds media, references it, or copies it.
6. Inspect retry and cancellation behavior.
7. Confirm effective retention in provider metadata, including keep rules.

The fix may combine failure-only recording, narrower paths, one compact per-shard report, and a single aggregation job. Change one lever at a time or maintain a before-and-after table, so the team knows which optimization produced savings and whether diagnosis time worsened.

What people get wrong is optimizing the visible ZIP instead of the evidence pipeline. Stronger compression can reduce storage but increase runner time, delay test feedback, and still retain redundant content. Deleting all traces after one day can reduce byte-days but make Monday triage impossible for Friday failures. Optimize cost per useful diagnosis, not bytes in isolation.

## Review results with engineering and governance signals

Track both efficiency and safety after rollout. Useful metrics include bytes uploaded per pipeline, artifact byte-days by class, upload duration, failure artifact download rate, median age at first download, percentage of downloads after the proposed expiry, and incidents where evidence had already expired.

Compare by outcome. A rising failure rate legitimately increases failure-only storage and signals a test-quality or product problem, not necessarily retention regression. Likewise, a lower download rate might mean better inline reporting, or it might mean artifacts are hard to find. Pair telemetry with short developer interviews.

Review long-lived exceptions quarterly or at a cadence that fits the organization. Every exception should name the artifact, owner, purpose, access boundary, expiration or review date, and replacement plan. Release and compliance records deserve explicit governance, not an arbitrary test-artifact setting.

The mature result is simple to explain: successful pipelines retain compact machine-readable summaries, current failures retain enough evidence for the team's actual triage window, canceled stale runs produce little or nothing, trend systems store aggregates, and release outputs follow their own lifecycle. That structure reduces cost while making the remaining artifacts easier to trust.

## Frequently Asked Questions

### What retention period should a QA team use for failed test artifacts?

Derive it from diagnosis behavior rather than copying a universal number. Measure time from artifact creation to first useful download, include weekends and team response patterns, and add a small operational margin. Keep failure evidence long enough for the majority of investigations, then provide an approved extension path for incidents. If artifacts are rarely downloaded, first confirm that inline reports are sufficient and that discoverability is not the real problem.

### Should JUnit XML and browser traces share the same policy?

Usually not. JUnit XML is compact and can feed CI test reports or flaky-test trends, while browser traces are larger, potentially sensitive, and most valuable during immediate diagnosis. Publish or retain the compact report for the analysis horizon and keep detailed traces for a shorter failure window. Confirm whether the CI platform stores ingested report data separately from downloadable artifacts so your forecast does not double-count or accidentally remove a required source.

### Does compressing artifacts always reduce CI cost?

Compression lowers transferred and stored bytes, but it consumes runner CPU and extends the job's critical path. Media such as video and many image formats may already be compressed, so another archive layer can save little. Measure compression time, resulting size, upload duration, and retrieval experience for each artifact class. Removing duplicate or unnecessary files usually produces a clearer gain than choosing an aggressive compression level for an oversized directory.

### How can we prove that a retention change is safe?

Run canary pipelines for each tier, inspect the files, ask an engineer to diagnose a seeded failure, and observe provider metadata through the expiration boundary. Monitor late download attempts and expired-evidence incidents after rollout. Keep release and governed records outside the experiment unless their owners approve it. Configuration review is necessary, but proof comes from artifact creation, retrieval, effective expiry, cancellation cleanup, and preserved diagnosis outcomes.
`,
};
