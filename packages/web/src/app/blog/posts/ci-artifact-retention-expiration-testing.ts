import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI artifact retention expiration testing',
  description:
    'CI artifact retention expiration testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'CI/CD',
  primaryKeyword: 'CI artifact retention expiration testing',
  keywords: [
    'CI artifact retention expiration testing',
    'CI artifact retention test',
    'GitHub artifact expires_at',
    'retention-days validation',
    'test report expiration check',
    'artifact lifecycle monitoring',
  ],
  relatedSlugs: [
    'cicd-testing-pipeline-github-actions',
    'github-actions-playwright-matrix-guide-2026',
    'ci-cache-pnpm-store-github-actions',
    'ci-upload-artifacts-only-on-test-failure',
  ],
  sources: [
    'https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching',
    'https://docs.github.com/en/actions/tutorials/store-and-share-data',
    'https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs',
  ],
  repoEvidence: [
    'seed-skills/github-actions-testing/SKILL.md',
    'seed-skills/quality-gates-ci/SKILL.md',
  ],
  content: `CI artifact retention expiration testing uploads a unique test report with a known retention-days value, saves its artifact ID and expires_at metadata, and proves it can be fetched before expiry. A later monitor checks the same ID after the due time. Policy caps, reruns, deleted runs, clock edges, and cleanup stay separate in the report.

## What does CI artifact retention expiration testing verify?

CI artifact retention expiration testing verifies that one uploaded report remains tied to the chosen run, has an expiry that fits policy, downloads during its live window, and becomes unavailable after that window. Upload success alone proves none of the later steps.

GitHub calls these files workflow artifacts. The approved [artifact guide](https://docs.github.com/en/actions/tutorials/store-and-share-data) says artifacts can share data between jobs and keep data after a workflow has finished.

The same guide shows \`retention-days\` on \`actions/upload-artifact\`. It also says that value cannot exceed the limit set at repository, organization, or enterprise level.

The test contract needs both config and service facts. Save the requested days, run ID, run attempt, artifact name, artifact ID, creation time, \`expires_at\`, current expired state, size, and a safe file hash.

Use a tiny text or JSON report with a unique nonce. A download pass should compare the name, byte count, and hash, because a same-name artifact from another run can otherwise create a false green result.

The after-expiry check cannot run inside the short upload job. It needs a later workflow or service that keeps the artifact ID and due time in a store that does not expire with the artifact being tested.

Repository evidence supplies the CI frame. \`seed-skills/github-actions-testing/SKILL.md\` calls for CI setup, quality gates, published test reports, async care, independent checks, and clean resources.

\`seed-skills/quality-gates-ci/SKILL.md\` asks for objective pass, fail, or warn results, owned limits, evidence, versioned rules, and expiry dates for exceptions. It also includes an upload-artifact step for gate reports.

Neither file defines this exact lifetime monitor or GitHub API shape. This article proposes that layer while keeping every repository claim within the actual seed content.

Read the [CI/CD testing guide](/blog/cicd-testing-pipeline-github-actions) for a full pipeline. Keep this probe small so it does not add large storage cost merely to test storage policy.

## How do you build a CI artifact retention test?

A CI artifact retention test starts with a disposable workflow run and one small report named from the run ID and attempt. The unique name prevents a rerun from looking like the first upload.

Put a fixed schema in the report. Include a probe version, run ID, attempt, requested days, generated UTC time, and random test nonce, then hash the finished file before upload.

Use an explicit \`retention-days\` value in the clean case. Keep it well below the known repository cap so the first run proves upload and metadata without testing a policy edge.

Capture the upload action's artifact ID. Query metadata by that ID, not by the newest artifact with a shared name, and save the safe fields needed by the later check.

The immediate download should use a new directory. Compare the file hash with the pre-upload hash, then remove the directory so a stale local report cannot satisfy another run.

This workflow shows the baseline. It uploads a tiny JSON probe, records its ID, fetches current metadata, downloads into a clean path, and checks the same bytes.

\`\`\`yaml
name: artifact-retention-probe
on:
  workflow_dispatch:

permissions:
  actions: read
  contents: read

jobs:
  upload-and-check:
    runs-on: ubuntu-latest
    steps:
      - name: Build probe report
        shell: bash
        run: |
          mkdir -p retention-probe
          printf '{"runId":"%s","attempt":"%s","retentionDays":5}\\n' \
            "$GITHUB_RUN_ID" "$GITHUB_RUN_ATTEMPT" > retention-probe/report.json
          sha256sum retention-probe/report.json > retention-probe/report.sha256

      - name: Upload probe
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: retention-probe-\${{ github.run_id }}-\${{ github.run_attempt }}
          path: retention-probe/
          retention-days: 5

      - name: Capture metadata
        env:
          GH_TOKEN: \${{ github.token }}
          ARTIFACT_ID: \${{ steps.upload.outputs.artifact-id }}
        run: |
          gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$ARTIFACT_ID" \
            --jq '{id,name,created_at,expires_at,expired,size_in_bytes}'

      - name: Prove current download
        uses: actions/download-artifact@v5
        with:
          artifact-ids: \${{ steps.upload.outputs.artifact-id }}
          path: downloaded-probe

      - name: Compare report hash
        run: |
          cd downloaded-probe
          sha256sum --check report.sha256
\`\`\`

The workflow log is not the durable monitor registry. Send the artifact ID, expected due time, run facts, and hash to an approved small store, then restrict it to synthetic probe data.

Do not store that registry only inside the probe artifact. Once the target expires, the monitor would lose the very ID and expected facts needed to prove expiry.

Use UTC for all saved times and parse the service value as an instant. Local time zones and daylight changes should never decide a retention boundary.

The [artifact-on-failure article](/blog/ci-upload-artifacts-only-on-test-failure) covers normal report policy. This probe should run on a small schedule or manual trigger, not after every product test failure.

## What breaks GitHub artifact expires_at?

GitHub artifact expires_at checks break when policy caps, name reuse, deleted runs, weak tokens, clock math, or stale list results change the expected item. The report must show which artifact ID was queried and why that ID belongs to the probe.

A repository cap can make a requested value invalid. Test one legal baseline before trying a value above the maximum, and keep the action error or service result as its own policy case.

Organization or enterprise owners can change the effective cap outside the workflow file. Capture the known policy source with each probe so a shorter expiry is not filed as random service drift.

Reruns have a new attempt number and can create a new artifact. A name that uses only the workflow name may match several items, so the artifact ID remains the primary key.

Deleting a workflow run can remove its artifacts before the planned expiry. That is an early deletion path, not a clock fault, and the monitor should report the missing run beside the missing artifact.

Token scope can also mimic expiry. A request with no Actions read access may fail even while the artifact is live. Run a metadata control with the same token before classifying any download error.

Clock math must use the returned \`expires_at\` value rather than adding days to the monitor's current time. Creation and upload completion can differ, and a scheduled worker may start late.

Do not demand deletion at one exact second. Schedule a pre-expiry check with a safe lead, then an after-expiry check with a stated grace window that matches the team's service rule.

List endpoints may paginate or return several same-name records. Query the saved ID for decisions and use lists only for search or cleanup, with every page handled.

A failed download needs metadata beside it. If metadata says the item is live, inspect auth, network, and API use; if it says expired, compare the check time with the saved due time.

The [matrix workflow guide](/blog/github-actions-playwright-matrix-guide-2026) helps with unique report names across job cells. Keep run ID, attempt, and matrix key in any probe name made by more than one job.

## Which fixtures support retention-days validation?

Retention-days validation needs a legal explicit value, repository default, value above the cap, rerun, and before-or-after expiry case. Each row uses a new artifact ID and the same small report schema.

The legal value case should be short enough for routine monitor runs but long enough to allow one clear pre-expiry check. It proves metadata, download, hash, and registry write before any edge work.

The default case omits \`retention-days\`. Capture the resulting expiry and compare it with the current policy, but do not infer the default from a prior repository or an old run.

The over-cap case should run in a disposable workflow and expect the versioned action or service to refuse the unsupported request. Save the exact safe error class without relying on a long free-text match.

The rerun case uses the same source commit and base label but adds \`github.run_attempt\` to the artifact name. Require two distinct IDs and ensure each metadata record points to its own run facts.

The boundary cases run before and after the returned due time. The early check needs a safe lead, while the late check needs the product's grace rule and a record of actual monitor start time.

Add a deleted-run case apart from normal expiry. Delete only a disposable test run, record the action, and require the monitor to label it \`run_deleted\` rather than \`expired_on_schedule\`.

Add an auth case with a token that lacks the required read scope only in a safe test repository. It should fail the control request too, which proves the monitor can separate access from lifetime.

Repeat the legal case across several days and check for orphaned probes. Cleanup should delete only expired test artifacts or records selected by the known prefix and registry ID.

The registry must not contain real report content, branch secrets, actor email, or token values. Artifact ID, safe name, hash, times, run keys, and final state are enough.

Use the [pnpm cache article](/blog/ci-cache-pnpm-store-github-actions) only for dependency cache checks. A cache hit or cache age cannot prove artifact retention.

## How should test report expiration check be asserted?

A test report expiration check should assert identity, availability, integrity, metadata, and time state together. Before expiry, the exact ID must download and match its hash; after the allowed window, that same ID must no longer provide the report.

Identity comes first. Compare artifact ID, name, run ID, attempt, and probe nonce before looking at dates, because a fresh same-name item can be available while the target has expired.

For metadata, require parseable creation and expiry times and an expiry later than creation. Compare the interval with the requested value and effective policy using a stated tolerance for service timestamp precision.

For availability, run a metadata call and a download call. Save status classes, not response bodies that may include extra service detail, and never print an authorization header.

For integrity, unpack into a new temp directory and check the stored hash. Delete the directory in an always-run cleanup step even when the hash fails.

The pre-expiry assertion should run far enough before the due time to avoid crossing the boundary during download. If the check starts inside the edge band, label it inconclusive and schedule the next phase.

The after-expiry assertion should use the saved due time plus the approved grace. It should not create a replacement artifact or query by newest name when the target lookup fails.

This later workflow accepts facts from a safe monitor registry. It classifies metadata and download results without using an artifact list as the final oracle.

\`\`\`yaml
name: artifact-lifecycle-check
on:
  workflow_dispatch:
    inputs:
      artifact_id:
        required: true
        type: string
      expected_expires_at:
        required: true
        type: string
      expected_state:
        required: true
        type: choice
        options: [available, expired]

permissions:
  actions: read
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Query exact artifact
        id: query
        continue-on-error: true
        env:
          GH_TOKEN: \${{ github.token }}
          ARTIFACT_ID: \${{ inputs.artifact_id }}
        run: |
          gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$ARTIFACT_ID" \
            > metadata.json

      - name: Check requested lifecycle state
        env:
          EXPECTED: \${{ inputs.expected_state }}
          QUERY_OUTCOME: \${{ steps.query.outcome }}
          EXPECTED_EXPIRY: \${{ inputs.expected_expires_at }}
        run: |
          printf 'expected=%s query=%s expiry=%s\\n' \
            "$EXPECTED" "$QUERY_OUTCOME" "$EXPECTED_EXPIRY"
          if [ "$EXPECTED" = available ] && [ "$QUERY_OUTCOME" != success ]; then
            exit 1
          fi
          if [ "$EXPECTED" = expired ] && [ "$QUERY_OUTCOME" = success ]; then
            node -e '
              const item = require("./metadata.json");
              if (!item.expired) process.exit(1);
            '
          fi
\`\`\`

A production monitor should also attempt the exact download in the available phase and compare the file hash. The small example keeps the expiry decision clear while the baseline already shows download integrity.

Do not assert one specific not-found text after expiry unless the API contract promises it. Use status class, current metadata, saved due time, and target ID to decide the named state.

The [artifact-on-failure article](/blog/ci-upload-artifacts-only-on-test-failure) can shape real test-report uploads. Keep the lifecycle probe separate so its planned expiry does not remove a report still needed for an incident.

## How does artifact lifecycle monitoring run in CI?

Artifact lifecycle monitoring is a two-run process. The first run creates and registers a probe, while one or more later runs check the same ID before and after its returned expiry.

Store monitor records outside workflow artifacts. A small database, approved issue-backed queue, or CI control service can hold synthetic IDs and times, provided access and cleanup rules are clear.

At each monitor start, claim due records so two workers do not check and update the same item at once. Save the worker run ID, check time, outcome, and next due phase.

Use three states for the simple flow: pending_precheck, pending_expiry, and complete. Add explicit auth_error, run_deleted, policy_error, and cleanup_error states rather than moving them into complete.

The precheck proves that retention did not end too early. The expiry check proves the service no longer serves the item after the due time and grace, while a cleanup pass closes any old registry row.

Schedule workers more often than the smallest lead or grace band. A daily job cannot prove an hourly edge with useful bounds, so align the chosen probe duration and worker rate.

Keep the gate nonblocking while the service is inside a defined grace band. Block only after the late bound, or warn and open an owned task if retention is a cost policy rather than a release safety rule.

Publish counts for created, live, expired, early-missing, late-live, deleted-run, auth-error, and orphan states. A single total pass rate can hide a monitor that never reaches its after-expiry phase.

The seed quality-gate file says exceptions need an owner and expiry date. Apply that rule to any muted service fault, with the probe ID and next review time attached.

Open the [CI/CD guide](/blog/cicd-testing-pipeline-github-actions) for job structure and the [FAQ](/faq) for catalog details. Keep lifecycle state names in versioned test code so dashboard labels cannot redefine a pass.

## CI artifact retention expiration testing comparison matrix

This matrix separates policy, identity, and time. Every row saves a new artifact ID, so no result can borrow availability from another run.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Repository default | Omit retention-days on unique probe | Returned expiry fits current policy | Old assumed default drives the check | GitHub artifact guide |
| Explicit short retention | Legal value below known cap | ID downloads early and has due time | Missing metadata or early loss | GitHub artifact guide |
| Value above maximum | Disposable run requests over-cap value | Named policy refusal is recorded | Silent unowned change or false pass | GitHub artifact guide |
| Rerun with same base label | Same commit, new run attempt in name | Two IDs and run facts stay distinct | New item masks the old target | Product fixture |
| Before and after expires_at | Same saved ID checked in both phases | Hash passes early, item expires late | Early loss, late access, or wrong ID | API observation |

The default row reads current service output instead of copying a number into the test. Policy can differ by repository and can change without a workflow edit.

The explicit row is the core health case. It must register the monitor record only after metadata, immediate download, and hash checks all pass.

The over-cap row owns validation. Keep it away from the main test report so its expected refusal cannot stop normal artifact upload or hide an app failure.

The rerun row uses the artifact ID as truth. Include run attempt in the name for people, yet never choose the target only by that display label.

The final row needs two actual monitor times and one saved due time. It should show the lead and late offset, not just the date on which each job happened.

CI artifact retention expiration testing passes when all five rows reach their named states without orphan records. Cleanup is part of the contract because test probes should not become their own storage leak.

The [matrix guide](/blog/github-actions-playwright-matrix-guide-2026) helps make job-specific names unique. Add the matrix key after run ID and attempt when several cells upload probes.

## How do you implement CI artifact retention expiration testing?

Implement CI artifact retention expiration testing as a short producer and a durable, idempotent monitor. Prove a legal upload and immediate download first, then add policy and time edges without placing real reports at risk.

1. Read \`seed-skills/github-actions-testing/SKILL.md\` and \`seed-skills/quality-gates-ci/SKILL.md\`, then record their report, evidence, objective-gate, owner, version, isolation, and cleanup rules.
2. Create a tiny uniquely named report from run ID and attempt, set a legal retention-days value, hash the file, and upload it from a disposable workflow.
3. Save artifact ID, safe name, run keys, requested days, created time, expires_at, hash, and next check time in an approved store outside that artifact.
4. Run a pre-expiry metadata and download check, then add default policy, over-cap, rerun, auth, deleted-run, clock-edge, and late-expiry cases one at a time.
5. Run the later expiry check against the same ID, compare it with the five-row matrix, and label early loss, late access, auth error, deleted run, or policy error.
6. Publish safe state counts, remove temp downloads and old probe records, delete only owned disposable items, and link each failed gate to its repository practice.

Add a mutation that looks up the newest matching name. The rerun row must fail, showing that a fresh artifact cannot hide expiry of the saved ID.

Add a mutation that stores the monitor registry in the probe itself. A design review should reject it before runtime because the after-expiry check would lose its source facts.

Run with a token control before each batch. If the control cannot read a known live probe, mark auth_error and do not call every target expired.

Keep all time math in UTC and compare parsed instants. Save actual worker start time and query finish time so an edge that crosses during the call can be classed without guesswork.

Use the [dependency cache guide](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching) to keep cache policy separate. GitHub documents cache key matching and its own last-access eviction rules, which do not test artifact \`retention-days\`.

Review the [job matrix documentation](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs) before a matrix emits probes. A matrix creates several job runs, so each cell needs its own safe key in the name and registry.

Browse the [QA skills directory](/skills) for more CI and report checks. Keep this probe versioned, cheap, and free of product data so scheduled evidence remains safe to retain.

## Frequently Asked Questions

### How can a pipeline verify test artifacts remain available for the configured retention period and disappear on schedule?

Upload a unique hashed probe, save its artifact ID and returned expires_at outside the artifact, and download that exact ID during a safe pre-expiry window. A later worker checks the same ID after the due time plus approved grace. It reports early loss, late access, auth error, or deleted run separately.

### What should a CI artifact retention test fixture record?

Record probe version, artifact ID, safe name, run ID, run attempt, requested retention days, effective policy source, created time, expires_at, expired state, size, file hash, actual check times, token-control result, and cleanup state. Keep the record outside the artifact and exclude report content, secrets, actor email, and raw credentials.

### Which failure proves GitHub artifact expires_at is broken?

The strongest signal is an exact artifact ID whose returned expiry conflicts with a legal requested value and known policy, or whose availability falls outside the measured early and late windows. First rule out wrong IDs, reruns, deleted workflow runs, weak token scope, time-zone math, pagination, and monitor delay.

### How do teams isolate retention-days validation?

Use a disposable workflow, tiny synthetic report, unique run-and-attempt name, one artifact per case, and a fixed legal baseline below the cap. Add default, over-cap, and rerun cases separately. Query by saved ID, download into a new folder, compare the hash, and remove all temp files after each check.

### Which assertion is strongest for test report expiration check?

Before expiry, require identity metadata, a successful exact-ID download, and the original file hash. After expiry and grace, require that same ID to be expired or unavailable under the service contract. Pair both phases with a live token control, saved due time, actual check time, and run-deletion state.

### How should CI report artifact lifecycle monitoring failures?

Report artifact ID, run keys, requested policy, created and expiry times, actual check offset, metadata class, download class, hash result, token control, run state, and cleanup result. Use named outcomes such as early_missing, late_live, auth_error, run_deleted, policy_error, or orphaned instead of one generic artifact failure.

## Conclusion

CI artifact retention expiration testing is sound when one known ID tells a full story from upload through expiry. Unique names help people, but saved IDs, hashes, returned times, later checks, token controls, and clean state provide the evidence needed for a release or policy decision.

Review the [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions), then open the [QA skills directory](/skills) and implement the CI artifact retention expiration testing matrix in the next test run. Start with one cheap probe, store its monitor facts outside the artifact, and keep cache rules in another suite.`,
};
