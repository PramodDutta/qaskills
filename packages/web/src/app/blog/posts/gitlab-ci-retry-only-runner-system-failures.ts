import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Retry Only Runner-System Failures in GitLab CI',
  description:
    'Configure GitLab CI to retry only runner-system failures, keep genuine test defects red, audit failure reasons, and avoid flaky green pipelines.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Retry Only Runner-System Failures in GitLab CI

A test job exits because an assertion found the wrong total. GitLab starts it again, the second execution happens to pass, and the pipeline turns green. That is the behavior of an unqualified \`retry: 1\`: GitLab retries all failure types by default. Infrastructure resilience has accidentally become defect concealment.

Use the structured form with \`retry:when\` to define the failure reason eligible for another attempt. For the narrow policy in this guide, select \`runner_system_failure\` and leave \`script_failure\` out. A test command that returns nonzero then remains failed on its first execution, while a runner setup failure can receive a fresh attempt.

## Replace blanket retry with an explicit failure reason

The smallest safe job-level configuration is:

\`\`\`yaml
e2e_tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.55.0-noble
  script:
    - npm ci
    - npm run test:e2e
  retry:
    max: 1
    when: runner_system_failure
  artifacts:
    when: always
    paths:
      - test-results/
    reports:
      junit: test-results/junit.xml
\`\`\`

\`max: 1\` means one retry after the initial attempt, for at most two executions. GitLab permits zero, one, or two retries. The \`when\` value narrows eligibility. If the job fails because the script returned a failure, it is not retried under this policy.

Keep \`artifacts:when: always\` independent from retry. A test failure should still upload its report and diagnostics. Artifact collection does not make the job successful, and a runner failure that occurs before the job can upload artifacts may naturally have none.

| Configuration | Assertion failure | Runner system failure | Main risk |
|---|---:|---:|---|
| No \`retry\` | No retry | No retry | Transient runner faults require a manual rerun |
| \`retry: 1\` | Retried | Retried | Genuine test defects can disappear on attempt two |
| \`retry: { max: 1, when: runner_system_failure }\` | Fails once | Retried once | Narrow and auditable, but does not cover newer distinct infrastructure reasons |
| \`retry: { max: 2, when: always }\` | Up to two retries | Up to two retries | Costly masking and slow feedback |
| Manual retry by a person | Operator decides | Operator decides | Inconsistent policy and weak aggregate data |

The exact status classification is made by GitLab and the runner, not by reading words in your test log. An assertion failure is normally a \`script_failure\`. A failure before or around runner-managed job execution can be a runner system failure. Inspect actual job failure reasons in your GitLab version rather than inferring from a generic “runner” message.

## Understand the boundary around runner_system_failure

\`runner_system_failure\` describes a problem with the runner system, such as job setup failing. It does not mean “anything unexpected happened on a machine named runner.” Once your script is executing, exit status generally represents the script's outcome, even when the script talks to unreliable dependencies.

GitLab's documented \`retry:when\` set includes a few other reasons that describe infrastructure or timing rather than your script, such as \`stuck_or_timeout_failure\`, \`runner_unsupported\`, \`scheduler_failure\`, and \`stale_schedule\`. If your intent truly is only runner system failures, keep the single value. If your intent is “transient infrastructure outside the test,” evaluate each additional reason explicitly against the values your GitLab version actually accepts, because \`retry:when\` rejects any value not on that fixed list.

| Failure reason | What it represents in GitLab's model | Include in this narrow policy? |
|---|---|---:|
| \`runner_system_failure\` | Runner system could not execute the job normally | Yes |
| \`script_failure\` | Job script failed, including test command exit | No |
| \`stuck_or_timeout_failure\` | Job stuck with no available runner or exceeded its timeout | Separate decision based on version and cost |
| \`runner_unsupported\` | No runner matched the job's requirements | Usually no, configuration needs correction |
| \`scheduler_failure\` | GitLab scheduler could not dispatch the job | Separate decision for ephemeral fleets |
| \`api_failure\` | GitLab API failure | Not implied by runner-only intent |
| \`unknown_failure\` | Failure reason could not be determined | Avoid automatically unless evidence supports it |

Do not add a reason simply because it sounds transient. A bad container image name can appear infrastructure-shaped but will fail identically on every attempt. Retrying deterministic configuration errors adds delay and load without creating resilience.

The [GitLab CI test automation guide](/blog/gitlab-ci-test-automation-guide-2026) covers pipeline structure and test reporting. Retry policy should sit on top of reliable test exit codes, not compensate for scripts that misreport results.

## Put the default in the right scope

GitLab permits \`retry\` at a job or under \`default\`. A default reduces duplication, but it applies to jobs that do not override it. Consider whether build, security scan, migration, deploy, and test jobs have the same retry safety.

\`\`\`yaml
default:
  retry:
    max: 1
    when: runner_system_failure

unit_tests:
  stage: test
  script:
    - npm ci
    - npm test

database_migration:
  stage: deploy
  script:
    - ./scripts/migrate-production.sh
  retry:
    max: 0

publish_package:
  stage: release
  script:
    - npm publish
  retry:
    max: 0
\`\`\`

Explicitly disabling automatic retry for non-idempotent or externally mutating jobs documents the safety decision. A runner can disappear after a publish reaches the registry but before GitLab receives success. Retrying may issue the mutation again. The same concern applies to deployments, notifications, payments, and data migrations.

For test jobs, execution is usually repeatable if setup creates isolated data and artifacts use unique paths. Still, check external rate limits, shared test accounts, and environment reservations. “It only runs tests” does not guarantee side-effect freedom.

## Prove that assertion failures are not retried

Reviewing YAML is necessary but insufficient. Add a temporary branch pipeline or a dedicated policy-verification project with a test job that exits 1. Observe the job has one execution and a \`script_failure\` reason. Do not merge an intentionally failing test into the default branch.

\`\`\`yaml
verify_no_retry_for_script_failure:
  stage: test
  rules:
    - if: '$CI_COMMIT_BRANCH =~ /^verify-retry-policy\//'
  script:
    - echo 'Intentional script failure for retry policy verification'
    - exit 1
  retry:
    max: 1
    when: runner_system_failure
\`\`\`

The job should fail once. Its UI may offer a manual Retry button; that does not mean automatic retry occurred. Distinguish a user-triggered new job from an automatic retry attempt in audit data.

Generating a genuine runner system failure safely is harder because the classification belongs to runner infrastructure. Use a non-production runner pool and an approved fault exercise, such as interrupting the runner during setup, then confirm GitLab creates the eligible retry. Do not simulate it with \`exit 1\`; that proves the opposite category.

## Do not turn flaky tests into infrastructure failures

Some teams wrap the test command and translate selected exit codes, hoping GitLab will treat them as runner failures. A script exit code remains a script outcome unless GitLab's retry exit-code feature is deliberately configured. More importantly, relabeling a flaky assertion as infrastructure destroys diagnostic meaning.

Test retries belong inside the test runner only when the team intentionally measures and manages flakiness. Framework-level retry can preserve the failed attempt's trace and name the flaky test. Job-level retry reruns installation, build steps, every test, and setup, making it harder to isolate which test changed outcome.

| Retry layer | Unit of repetition | Evidence quality | Appropriate use |
|---|---|---|---|
| Assertion polling | One condition within a test | Call log and final mismatch | Expected eventual UI or service state |
| Test-runner retry | One failed test or worker scope | Can retain per-test traces and flaky label | Temporary diagnostic policy for timing-sensitive tests |
| GitLab job retry | Entire job | Separate full execution | Eligible runner-system failure |
| Pipeline retry | Multiple jobs or manually selected scope | Broad and operator-driven | Recovery after platform incident |

A failed test followed by a pass is still a quality event. Do not make the entire pipeline green without surfacing that flakiness in reports. The runner-only job policy prevents one major source of accidental laundering.

## Preserve evidence from every executable attempt

Automatic retry creates a new execution context for the job. If the first attempt reaches the script and produces diagnostics before a runner failure, those artifacts may not always be available depending on how the runner failed. Design logs to stream useful context early and push critical telemetry to an external, correlation-friendly system where appropriate.

Use unique identifiers such as pipeline ID, job ID, and job name in test data and server logs. Do not reuse a fixed artifact object key that attempt two overwrites. JUnit output should represent test outcomes, while runner fleet metrics represent provisioning and execution health.

When a job fails with a real assertion, keep screenshots, traces, request logs, and seed information. \`artifacts:when: always\` helps when the script reaches artifact upload. The [GitLab CI quality gates guide](/blog/gitlab-ci-quality-gates-guide-2026) explains how to keep reports and gate status aligned.

## Audit retries through the GitLab API

Pipeline analytics should distinguish eligible infrastructure recovery from masked script instability. GitLab's jobs API returns job records that include status and failure reason. Query your own instance with a project-scoped or appropriately limited token, and inspect failed and retried jobs according to the API version you operate.

\`\`\`bash
curl --fail --silent --show-error \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$CI_API_V4_URL/projects/$CI_PROJECT_ID/pipelines/$CI_PIPELINE_ID/jobs?include_retried=true" \
  | jq '.[] | {
      id,
      name,
      status,
      failure_reason,
      retried,
      runner_id: .runner.id
    }'
\`\`\`

\`include_retried=true\` is a documented parameter for listing pipeline jobs, and the standard response includes retry and failure metadata in supported GitLab versions. Verify fields against your server's API docs before building long-lived dashboards. Self-managed installations may lag the current documentation.

Track counts by runner ID, executor, failure reason, image, and time window. A spike isolated to one runner suggests fleet repair. A broad increase after a test change suggests the classification or script needs investigation. Do not publish percentages without a stable denominator: executions, original jobs, and pipelines answer different questions.

## Handle newer runner failure reasons intentionally

After upgrading GitLab or GitLab Runner, compare failure-reason distribution before and after. A policy containing only \`runner_system_failure\` may stop retrying cases that now surface as \`stuck_or_timeout_failure\` or \`scheduler_failure\`. That may be correct for the literal policy but surprising operationally.

If the approved intent expands, express an array using only documented \`retry:when\` values:

\`\`\`yaml
retry:
  max: 1
  when:
    - runner_system_failure
    - stuck_or_timeout_failure
    - scheduler_failure
\`\`\`

This is not a recommendation to add all three universally. A stuck job with no available runner may retry cheaply, but a scheduler failure during a publish job can be unsafe if the mutation already reached the registry. Apply arrays per job class when risk differs.

Read release notes and YAML reference for your exact release. Some older reasons have been deprecated or split in newer versions. Validate CI configuration with GitLab's CI Lint rather than assuming a value supported by current SaaS is accepted by an older self-managed server.

## Avoid retry storms during platform incidents

Even a maximum of one retry doubles demand for affected jobs. During a runner fleet or registry incident, thousands of immediate retries can compete with recovering capacity. GitLab's job retry setting is small by design, but concurrency and pipeline volume still matter.

Use runner autoscaling limits, pipeline auto-cancellation for superseded commits, resource groups for exclusive operations, and incident controls appropriate to your environment. The retry policy is a last-mile recovery attempt, not a substitute for healthy runners.

Measure whether eligible retries actually recover. If nearly every runner-system retry fails again, automatic retry is buying delay rather than resilience. Fix the fleet, reduce concurrency, or exclude a deterministic failure subtype. If recovery is high and cheap, the narrow policy is doing its job.

## Review includes, extends, and generated configuration

The effective retry setting may come from an included template or a parent definition via \`extends\`. A job that looks safe locally can inherit \`retry: 2\` from a central file. Inspect GitLab's merged CI configuration after changes.

Search for scalar retry declarations and \`when: always\` across local and included templates. Document overrides. If platform engineering owns the default, give application teams a clear way to set \`max: 0\` for unsafe jobs.

Be careful when generating YAML. A templating omission that drops \`when\` leaves the default behavior of retrying all failure types. Schema or policy checks should reject any positive retry maximum without an explicit eligible reason. That rule is simple enough to enforce before merge.

## A release-ready retry policy

For ordinary test jobs, start with one retry only on \`runner_system_failure\`. Keep test command failures red. Disable retries for non-idempotent jobs. Confirm the merged YAML, run a controlled script-failure proof, and review actual failure reasons after server or runner upgrades.

Then monitor the result. Infrastructure recovery should be visible as infrastructure recovery, not celebrated as test stability. A green pipeline produced by an eligible runner retry can be legitimate, but the runner fleet still owes an operational signal. A red assertion should remain red until code or the test is intentionally changed.

## Enforce explicit retry reasons as policy

Large repositories eventually reintroduce blanket retry through copied jobs or external templates. Add a CI configuration policy that examines the merged YAML and rejects positive retry counts lacking an explicit \`when\`. Linting only source fragments can miss inherited settings, so evaluate the effective configuration when your GitLab tier and workflow expose it.

The rule needs exceptions for \`max: 0\`, which disables retry. It should also flag \`when: always\` for human review, not silently rewrite it, because a rare job may have a documented reason to retry every failure. Store approved exceptions beside job ownership and expiry information.

Review changes semantically. Moving a narrow job-level block into \`default\` broadens scope even if the text is unchanged. Removing a job override can make it inherit a retry. An included template update can alter many projects without modifying their repositories. Treat central CI templates as production dependencies with versioned releases and compatibility tests.

Create policy fixtures representing a scalar retry, a runner-only mapping, an array of approved infrastructure reasons, a deploy override with zero, and a malformed value. Test the policy checker itself so it does not block valid configuration or miss YAML anchors and extensions. Use GitLab CI Lint as the parser of authority where possible rather than maintaining a partial YAML merge engine.

Policy enforcement complements runtime auditing. Static checks show declared intent; the jobs API shows how GitLab classified real failures and whether retries recovered. Compare both during quarterly reviews. If a runner-only rule produces no eligible recoveries but substantial duplicate cost, reconsider it. If manual retries of runner faults are common, inspect why automatic classification did not match the policy.

Include job owners in the report. Platform teams can repair executor health, while test owners can confirm that failures classified as scripts remain actionable. Clear ownership prevents retry configuration from becoming an anonymous global toggle. Any exception should name its side effects, maximum executions, evidence retention, and rollback condition before approval.

## Frequently Asked Questions

### Why did retry: 1 rerun my failed test job?

The scalar form uses the default failure eligibility, which is all failure types. Use the structured form with \`when: runner_system_failure\` to exclude script failures.

### Is an npm registry outage always a runner_system_failure?

Not necessarily. If \`npm ci\` in your script exits nonzero, it may be a script failure. Runner-managed dependency failures can receive a more specific classification in newer GitLab versions. Inspect the recorded reason.

### Does max: 1 mean the job can run once or twice?

It permits one retry after the original execution, so the job can execute at most twice.

### Should deployment jobs inherit the same runner retry default?

Only if the deployment is provably safe to repeat after an ambiguous interruption. Otherwise override with \`max: 0\` and design explicit idempotency or recovery.

### How can I confirm which failure reason GitLab assigned?

Inspect the job in the UI and query the jobs API for \`failure_reason\`. Use data from your GitLab version, particularly after runner or server upgrades.
`,
};
