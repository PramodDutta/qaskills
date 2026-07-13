import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Report Flaky Tests with GitLab CI JUnit Reports',
  description:
    'Report flaky tests with GitLab CI JUnit artifacts, retry-aware test output, stable case identities, failure evidence, and actionable pipeline history.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Report Flaky Tests with GitLab CI JUnit Reports

A retried test passes on attempt two, the job turns green, and the first failure disappears into console output. GitLab cannot report instability it never receives. JUnit artifacts need to preserve a stable test identity and some evidence of the failed attempt, while the CI policy must distinguish a recovered test from an unquestionably clean pass.

GitLab parses JUnit XML to populate pipeline Tests and merge request summaries. The report artifact does not determine job success. The test command's exit code does. That separation lets teams upload useful results even on failure, but it also means retry policy and report generation must be designed together.

## Give every test a stable JUnit identity

GitLab uses JUnit fields such as \`testcase.classname\` and \`testcase.name\` to present and compare cases. Duplicate names in one report can cause later results to be ignored. Parameterized tests, browser projects, shards, and retries therefore need identities that are stable across pipelines and distinct within one pipeline.

| JUnit element or attribute | GitLab use | Flaky-test implication |
| --- | --- | --- |
| \`testcase@classname\` | Suite or category display | Include durable logical grouping |
| \`testcase@name\` | Individual case name | Keep stable, make parameters distinguishable |
| \`testcase@file\` | Source location and copy support | Emit repository-relative path when reporter supports it |
| \`testcase@time\` | Duration display | Recovered retries can otherwise hide total cost |
| \`failure\` | Failure detail | Preserve assertion and stack information |
| \`system-out\` | Output and attachment tags | Link failure evidence carefully |

Do not append a random retry ID to the canonical name. That prevents GitLab from relating the case across pipelines. If the framework emits each attempt separately, ensure the reporter deliberately consolidates or labels attempts without producing duplicate canonical entries that GitLab discards.

## Upload the report when the test command fails

Use \`artifacts:when: always\` so GitLab Runner uploads XML after a nonzero test exit. Declare the file under \`artifacts:reports:junit\` for parsing, and optionally under \`paths\` so engineers can download the raw report. The glob must match files, not merely a directory.

\`\`\`yaml
test:unit:
  image: node:22-bookworm-slim
  stage: test
  script:
    - npm ci
    - npm run test:ci
  artifacts:
    when: always
    expire_in: 14 days
    reports:
      junit:
        - reports/junit/*.xml
    paths:
      - reports/junit/
      - reports/flaky-evidence/
\`\`\`

This job still fails when \`npm run test:ci\` exits nonzero. JUnit is reporting metadata, not an override. Avoid \`npm run test:ci || true\` unless a deliberately non-blocking quarantine job is being built. That shell pattern turns infrastructure errors and real regressions into success along with known flakes.

Ensure the report directory exists or configure the framework reporter to create it. Check job logs for GitLab artifact warnings. An empty Tests tab may mean the glob matched nothing, XML was malformed, artifacts expired, duplicate cases were dropped, or the target branch has no baseline for merge request comparison.

## Generate retry-aware output from the test runner

The framework, not GitLab, knows that a case failed first and passed later. Use its supported retry feature and a JUnit reporter that records retry evidence. For Playwright, retries are configured in Playwright and the built-in JUnit reporter writes XML. A custom reporter can separately emit recovered test details using documented result data.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['line'],
    ['junit', { outputFile: 'reports/junit/playwright.xml' }],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

The JUnit report gives GitLab test visibility. The HTML report and trace retain attempt-level debugging detail. Whether a recovered Playwright result appears as a pass, flaky classification, or attached output depends on the reporter version, so validate the emitted XML in your installed release rather than assuming GitLab can infer retries from a final pass.

For pytest, use \`--junitxml=reports/junit/pytest.xml\` and a retry plugin only if it is an accepted dependency. For Jest or Vitest, choose a maintained JUnit reporter and inspect how it handles retried cases. GitLab accepts JUnit, but JUnit has no universally implemented flaky schema across all producers.

## Preserve recovered failures outside ambiguous XML

JUnit dialects vary. Some tools use \`flakyFailure\` elements, some put attempt output in \`system-out\`, and some report only the final status. GitLab documents a parsed subset and does not promise to interpret every vendor extension. Maintain a small retry ledger as a separate artifact when recovered flakes must be visible and queryable.

The ledger can be JSON containing canonical ID, file, first failure message, attempt count, duration, shard, and evidence paths. Generate it through a framework reporter API, not by regex-parsing colored console logs. A later CI step can print a concise summary, create metrics, or enforce a flake budget.

| Evidence channel | Advantage | Limitation |
| --- | --- | --- |
| GitLab Tests tab | Native failure browsing and MR comparison | May show only reporter's final JUnit state |
| Raw JUnit artifact | Portable machine-readable output | Retry extensions are inconsistent |
| Framework HTML report | Rich attempt and attachment detail | Not aggregated across long history by itself |
| Retry JSON ledger | Explicit recovered-flake data | Requires owned reporter integration |
| Central test analytics | Trends and ownership at scale | Additional service and governance |

Do not mutate passing JUnit cases into failures merely to make flakes visible unless the policy is intentionally “any retry fails the job.” If that is the policy, exit nonzero with an explicit explanation. Status should express governance, while evidence describes what happened.

## Separate test retries from GitLab job retries

A framework retry reruns the failed test, often in a fresh fixture or worker, and can identify the recovered case. A GitLab \`retry\` reruns the whole job. It is useful for runner failures under selected conditions, but it is a poor flaky-test detector because every case executes again and the relationship between attempts is coarse.

| Retry layer | Unit repeated | Best use | Reporting cost |
| --- | --- | --- | --- |
| Test framework | One failed case or group | Diagnose intermittent tests | Can preserve case identity |
| GitLab job retry | Entire CI job | Runner or network infrastructure incidents | Results live in separate job attempts |
| Application retry | Product operation | Verify resilience behavior | Must not be mistaken for test retry |
| Manual pipeline rerun | Whole selected pipeline scope | Human investigation | Weak structured flake signal |

Limit framework retries to one or another small documented number. Ten retries convert a low pass probability into a green pipeline and multiply runtime. Record every recovered case. A retry should collect evidence and reduce blocking noise temporarily, not certify reliability.

The [GitLab CI test automation guide](/blog/gitlab-ci-test-automation-guide-2026) covers stages, caches, parallel jobs, and artifact flow. Flake reporting adds identity and attempt history to that pipeline design.

## Make sharded reports merge safely

Parallel jobs should write unique report paths, often using \`CI_NODE_INDEX\` or a job-specific directory. GitLab can accept multiple XML files through a file pattern. Never let parallel processes write the same XML file on a shared filesystem.

Each shard must produce unique canonical test identities. If browser projects intentionally run the same title in Chromium and Firefox, include the project name in classname or name through the reporter's supported behavior. Otherwise GitLab may treat them as duplicates.

Keep artifact paths repository-relative and deterministic. GitLab's JUnit path accepts a filename, list, or suitable pattern, but directories alone are not parsed as reports. Validate the pattern in a pipeline and download artifacts once to confirm all shard files arrived.

Merging XML manually can be useful for downstream analytics, but naive concatenation creates invalid XML with several declarations or roots. Prefer multiple report files accepted by GitLab or use a real JUnit merge tool whose identity behavior is tested.

## Attach screenshots without losing portability

GitLab can recognize attachment tags in testcase-level \`system-out\` when the referenced file is uploaded as an artifact. The path must point to the artifact location expected by GitLab. Reporter support varies, so confirm a sample in the test detail dialog.

Keep attachments small and relevant. A recovered browser flake usually needs the first failed attempt's trace, screenshot, and concise error. Uploading videos for every passing test increases storage without helping diagnosis. Set expiration according to the time engineers need to triage.

Sanitize logs and screenshots. Authentication state, customer data, and access tokens can enter artifacts. A flaky test is not permission to retain sensitive evidence indefinitely.

## Turn pipeline history into a flake signal

GitLab merge request test summaries compare source and target branch results. GitLab can also show recent default-branch failure counts for cases it identifies consistently. Those features are useful, but a recovered retry may not register as a failed final case. Combine native history with the retry ledger.

Track observations, not a misleading percentage with no denominator. For each canonical test ID, retain executions, first-attempt failures, final failures, recovered runs, branch, runner class, and duration. Treat approximate flake rates carefully for rarely executed cases. Ten successes do not establish long-term stability, and correlated infrastructure outages can make many healthy tests fail together.

The [AI flaky test detection guide](/blog/ai-flaky-test-detection-guide) can help cluster failure messages and prioritize investigation. Automated classification should point engineers toward evidence, not auto-quarantine cases based on opaque confidence.

## Establish a quarantine policy that remains visible

A quarantined test should still run in a clearly named job, publish JUnit and evidence, have an owner, and carry an expiry date or issue. Removing it from discovery destroys the signal needed to fix it. Allow the quarantine job to fail without blocking only when product risk is accepted and visible.

Do not quarantine a deterministic regression because it happened near an intermittent one. Review the first failure signature and reproduce. Flakiness means outcomes vary under nominally equivalent conditions; a consistent assertion failure on a changed branch is not flaky.

A mature policy often blocks new flakes, budgets known recovered cases, and escalates tests whose recovery frequency rises. The exact thresholds depend on suite size and risk. State them as team policy rather than presenting arbitrary percentages as universal facts.

## Diagnose an empty or misleading GitLab report

Start in the job log. Confirm the test command ran, the XML file exists, and artifact upload found it even on failure. Download and parse the XML. Verify unique classname-name pairs, closed elements, failure contents, and testcase-level output. Check GitLab's current size and case limits for your deployment.

If the merge request shows no comparison, run the report-producing pipeline on the target or default branch. Without baseline test data, GitLab can show failures but cannot classify changes in the same way. If fewer cases appear than the runner executed, search for duplicate names.

When every recovered retry looks clean, inspect the reporter's actual XML. That may be accurate final-state JUnit behavior, not a GitLab defect. Add an explicit retry ledger or reporter output and surface it in the job summary or a dedicated analysis step.

## Parse and validate JUnit before upload

Treat reporter output as an interface. Add a small validation step that parses every XML file, checks for at least one testcase in required jobs, and detects duplicate classname-name pairs. This catches a reporter upgrade or path change before engineers discover an empty GitLab panel.

Do not validate only XML well-formedness. A perfectly valid file can contain zero cases, missing names, or the same identity hundreds of times. Compare the framework's reported case count with the XML count when the runner exposes both. Account for retries according to the reporter's consolidation policy.

Keep the validator from rewriting reports. GitLab should receive the original producer output so diagnosis is honest. If normalization is required for a legacy reporter, version the transformer, test it with passing, failing, skipped, parameterized, and retried fixtures, and retain both original and normalized artifacts.

## Distinguish a flaky case from flaky infrastructure

A browser assertion that alternates under the same environment differs from a job canceled by a runner or a registry timeout during dependency installation. Only the first belongs to case-level flake metrics. Capture job phase and failure category before assigning ownership.

Framework retries should begin after the test process starts and identifies a case. GitLab retry policies can target some runner failure reasons, but they cannot repair a deterministic product assertion. If many unrelated cases fail with connection reset at the same second, cluster them as a likely environment incident rather than opening individual test defects automatically.

Keep infrastructure incidents in the data because they affect delivery reliability, but label them separately. This gives platform teams evidence without contaminating a test's behavioral stability history.

## Surface ownership in the report workflow

JUnit itself has limited portable ownership metadata, and GitLab does not parse arbitrary properties for every UI need. Maintain a mapping from canonical test path or suite to team, then enrich the retry ledger or downstream analytics. Code ownership files can provide a reasonable starting point, but generated and shared suites may need explicit mapping.

An alert without an owner becomes background noise. The pipeline summary should list recovered cases, first failure signature, evidence link, responsible team, and existing issue if known. Deduplicate notifications by canonical case and signature so one widespread outage does not send hundreds of messages.

Ownership also controls quarantine approval and expiry. The team accepting risk should state why the test is non-blocking and what evidence will prove the fix.

## Prove a flaky-test fix before removing retry

Reproducing a timing failure a few times locally is useful but weak evidence of stability. Run the repaired case repeatedly under the CI-like browser, worker count, network dependencies, and data isolation that exposed it. Retain attempt results and compare the original failure signature.

Remove quarantine when the underlying race, shared state, or wait has been corrected, not merely because the test passed for a week at low execution count. Keep framework retry policy consistent while validating, then decide whether the whole suite still needs retries. A global retry setting can remain for diagnostic collection, provided every recovered case stays visible and governed.

Record the fixing commit or issue in the flake ledger. Historical failures should remain historical rather than being erased, while current dashboards can show the case as monitored or resolved.

## Keep merge request comparisons trustworthy

GitLab classifies newly failed, existing, and resolved cases by comparing source results with target-branch data. That comparison relies on stable identity and a recent baseline pipeline. Renaming a test can make one failure appear resolved and another appear new even though behavior did not change.

When refactoring names or moving files, retain a mapping in external analytics if long-term history matters. Within GitLab, accept that identity changes can reset comparison continuity and mention it in the merge request. Do not freeze misleading names forever solely for metrics, but avoid casual title edits that erase useful history.

Ensure default-branch pipelines publish the same report families as merge requests. A nightly suite cannot serve as a baseline for a pull-request-only suite if names, projects, or environments differ. Compare like with like, including browser or database variant in the canonical identity.

Skipped and quarantined results also need stable representation. A case that disappears from XML is not the same as a reported skip. Prefer reporters that emit the skip and reason so reviewers can distinguish intentional suppression from broken discovery.

## Frequently Asked Questions

### Does uploading a JUnit report make a failed GitLab job pass?

No. The test command's exit code controls job status. The JUnit artifact supplies structured results for the UI and remains useful when uploaded with \`when: always\`.

### Can GitLab always identify a test that passed on retry?

No. It sees what the JUnit producer emits and parses only supported fields. Validate your reporter's retry output and keep a separate recovered-flake ledger when the distinction is essential.

### Should I use GitLab job retry for flaky tests?

Prefer framework-level retries for case-level flakiness. Job retries are better reserved for selected infrastructure failures because they rerun everything and weaken test identity across attempts.

### Why are parameterized cases missing from the Tests tab?

Their reporter-generated classname and name pairs may collide. Ensure parameters or project identifiers create stable, unique case names within the report.

### How long should flaky-test artifacts be retained?

Long enough for the owning team to triage and compare failures, subject to storage and data-retention rules. Critical suites may need longer history in a dedicated analytics store rather than indefinitely retaining large raw traces.
`,
};
