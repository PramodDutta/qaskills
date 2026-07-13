import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cancel Stale E2E Runs When a New Commit Arrives',
  description:
    'Cancel stale E2E runs on new commits with branch-scoped GitHub Actions concurrency and GitLab interruptible jobs while protecting deploys and cleanup.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Cancel Stale E2E Runs When a New Commit Arrives

Commit A starts forty browser shards. Six minutes later, commit B fixes the selector they are exercising, but B waits behind A on the same runner pool. Even if A finishes green, its result no longer describes the branch head. Canceling that stale run lets the newest evidence reach reviewers sooner and avoids spending browser capacity on a revision nobody can merge.

CI cancellation is a correctness policy as much as a cost control. The concurrency key must group revisions of the same branch without making unrelated branches cancel each other. E2E jobs must tolerate termination and clean their external resources. Deployment, migration, and publishing work often must not be interrupted. GitHub Actions and GitLab express these ideas differently, but both can discard superseded test work when configured at the right scope.

## Decide what "stale" means for the workflow

A run is stale when a newer revision makes its result irrelevant to the decision the pipeline supports. Pull-request E2E is a clear example: reviewers generally care about the latest commit on that source branch. A release certification run, a scheduled soak, or a test against an immutable release candidate may remain valuable even after another commit exists elsewhere.

Classify pipeline purposes before adding a global switch:

| Pipeline purpose | Cancel on newer same-ref commit? | Reason |
|---|---:|---|
| Pull-request E2E | Usually yes | Merge decision follows latest head |
| Feature-branch smoke | Usually yes | Fast feedback matters more than obsolete result |
| Default-branch validation | Context dependent | Newest head is important, but every revision may feed audit needs |
| Release-candidate certification | Usually no | Revision is immutable evidence |
| Scheduled cross-browser sweep | No | Schedule, not branch freshness, defines value |
| Production deployment | Rarely | Interruption can leave partial external state |
| Performance baseline | Often no | Historical comparisons may need every sampled revision |

Cancellation does not replace trigger deduplication. If one push creates both a branch pipeline and a pull-request pipeline for the same SHA, you are duplicating current work, not merely running stale work. Fix event rules as well.

## Group GitHub Actions by workflow and branch identity

GitHub Actions uses the \`concurrency\` key at workflow or job level. A group allows at most one running member at a time. With \`cancel-in-progress: true\`, a newly queued member cancels the running member in the same group. The group name is case-insensitive and shared across workflows in the repository, so include the workflow identity unless cross-workflow cancellation is deliberate.

A workflow-level configuration for pull requests and branch pushes looks like this:

\`\`\`yaml
name: Browser E2E

on:
  pull_request:
  push:
    branches:
      - main

concurrency:
  group: e2e-\${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
\`\`\`

For a pull request, the PR number stays stable across pushes and groups every revision of that PR. For a push, the fallback uses \`github.ref\`, so pushes to \`main\` cancel earlier main runs. Including \`github.workflow\` prevents a Browser E2E run from colliding with a different workflow that happens to use the same ref expression.

Choose identifiers based on events you actually accept:

| GitHub value | Shape | Useful for | Trap |
|---|---|---|---|
| \`github.ref\` | Full ref such as \`refs/heads/main\` | Push workflows | Pull request ref may be synthetic |
| \`github.head_ref\` | PR source branch name | Pull requests | Empty outside PR events |
| PR number | Repository-local integer | All revisions of one PR | Not present on push |
| \`github.sha\` | Exact commit | Immutable grouping | Every revision gets a different group, so nothing cancels |
| \`github.run_id\` | Unique run | Fallback that avoids collision | Also disables cancellation if used alone |
| \`github.workflow\` | Workflow display name | Namespace groups | Renaming changes the group |

Using the commit SHA in the concurrency group is the most common conceptual mistake. The requirement is to group competing revisions; a unique SHA separates them.

## Workflow-level or E2E-job-level cancellation

Workflow-level concurrency cancels build, lint, unit, and browser jobs together. Job-level concurrency can cancel only the expensive E2E portion while cheap deterministic checks finish and publish their result.

\`\`\`yaml
name: Pull Request Checks

on:
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./ci/run-unit-tests.sh

  e2e:
    runs-on: ubuntu-latest
    concurrency:
      group: pr-e2e-\${{ github.event.pull_request.number }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - run: ./ci/run-browser-tests.sh
\`\`\`

Job-level grouping means the obsolete workflow may remain visible while its E2E job is canceled. That can be desirable when unit results are independently useful. It can also produce confusing overall statuses if branch protection expects the workflow rather than a specific latest-run check.

| Scope | Cancellation reach | Best fit | Operational caution |
|---|---|---|---|
| Workflow \`concurrency\` | Every pending/running job in run | Entire CI result is revision-specific | Cleanup and noninterruptible work also stop |
| Job \`concurrency\` | Named job only | E2E dominates capacity | Other jobs from stale revisions continue |
| Reusable workflow caller | Depends on caller configuration | Centralized E2E orchestration | Group contexts differ by call site |
| Environment protection | Serializes deployment behavior | Deployment safety | Not a substitute for stale test cancellation |

If build artifacts from the same workflow feed E2E, workflow cancellation avoids producing artifacts no current run will consume. If unit feedback is fast and useful for detecting a flaky test across revisions, job-level cancellation may preserve evidence.

## Do not cancel release and manual investigations blindly

\`cancel-in-progress\` can be an expression. You can preserve release branches while canceling ordinary branch work:

\`\`\`yaml
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: \${{ !startsWith(github.ref, 'refs/heads/release/') }}
\`\`\`

Manual \`workflow_dispatch\` runs need a stated policy. If an engineer launches a reproduction against the same branch, should a push cancel it? If no, include the event name or a manual input in the group, or give manual runs a unique fallback. If yes, keep them grouped and explain the behavior in the workflow description.

Do not write a fallback expression without testing each trigger's context. An undefined pull-request field can collapse several push runs into an empty or constant group, causing unrelated cancellation. A unique \`run_id\` fallback is safe from collision but intentionally prevents those fallback runs from canceling one another.

## GitHub matrix shards cancel as part of their owner

At workflow scope, canceling the run stops all matrix jobs. At job scope, a concurrency group inside a matrix can behave differently depending on whether matrix values are included.

If every shard shares \`pr-e2e-42\`, concurrency serializes or cancels shards against each other, which destroys parallelism. The group should identify the run family at workflow scope, or include the shard identity if applied per matrix job:

\`\`\`yaml
jobs:
  e2e:
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    concurrency:
      group: pr-e2e-\${{ github.event.pull_request.number }}-shard-\${{ matrix.shard }}
      cancel-in-progress: true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./ci/run-e2e-shard.sh \${{ matrix.shard }} 4
\`\`\`

Now shard 1 of the new revision cancels shard 1 of the old revision, while four shards within one revision can run together. Workflow-level concurrency is simpler when the entire run shares freshness.

## Configure GitLab auto-cancel and interruptible jobs

GitLab can auto-cancel redundant pipelines for new changes on the same ref. The YAML-level \`workflow:auto_cancel:on_new_commit\` setting defines behavior. With \`interruptible\`, only jobs marked \`interruptible: true\` are canceled.

\`\`\`yaml
workflow:
  auto_cancel:
    on_new_commit: interruptible

stages:
  - build
  - test
  - deploy

build_test_bundle:
  stage: build
  interruptible: true
  script:
    - ./ci/build-test-bundle.sh
  artifacts:
    paths:
      - dist/

browser_e2e:
  stage: test
  interruptible: true
  needs:
    - build_test_bundle
  script:
    - ./ci/run-browser-tests.sh

deploy_review_app:
  stage: deploy
  interruptible: false
  script:
    - ./ci/deploy-review-app.sh
\`\`\`

The E2E and its disposable build can stop when a newer pipeline starts for the ref. The deployment job is protected from auto-cancellation once running. Whether a review-app deployment is truly noninterruptible depends on the script; some teams make review deployments idempotent and safely cancelable. Production deployment deserves a conservative default.

GitLab's supported on-new-commit modes have different reach:

| Mode | Behavior |
|---|---|
| \`conservative\` | Cancels the pipeline only if no \`interruptible: false\` job has started; this is the default |
| \`interruptible\` | Cancels only jobs marked \`interruptible: true\` |
| \`none\` | Disables new-commit auto-cancel behavior |

The project-level Auto-cancel redundant pipelines setting must also be considered. Keep configuration ownership documented so an administrator changing the UI does not silently invalidate expectations.

## Interruptible means safe to terminate at any instruction

Marking a job interruptible is a claim about side effects, not a hint that the job is long. Browser tests often create users, orders, files, queues, or namespaces. A cancellation can bypass test framework teardown and shell code after the test command.

Evaluate each resource:

| Resource created by E2E | Cancellation-safe design |
|---|---|
| Browser process | Runner/container termination reclaims it |
| Test database rows | Namespaced data plus scheduled garbage collection |
| Cloud object | Run-ID prefix and lifecycle expiration |
| Review environment | Separate reconciler deletes environments not tied to live heads |
| External sandbox account | Lease with expiry, not only \`afterAll\` cleanup |
| Port-forward or tunnel | Job-scoped process and runner cleanup |
| Shared feature flag | Avoid mutable shared state or use compare-and-set restoration |

Framework teardown is useful for normal completion, but infrastructure cleanup must survive SIGTERM, runner loss, and platform cancellation. Prefer expiring leases and idempotent reconcilers over a single fragile finalizer.

An E2E job that performs a schema migration against a shared environment may not be interruptible even if the tests themselves are. Split environment mutation into a protected job, or provision an isolated environment whose partial state can be discarded wholesale.

## Make the latest status the one branch protection reads

Cancellation can expose status-integration assumptions. Some dashboards show the last completed run, which may be a canceled old revision, while merge protection checks the latest commit. Verify the repository's required checks and merge queue behavior after enabling concurrency.

Run a controlled experiment:

1. Push commit A with a test that lasts several minutes.
2. Confirm its E2E job is running.
3. Push commit B to the same source branch.
4. Verify A transitions to canceled promptly.
5. Verify B begins without waiting for A's runner reservation.
6. Confirm the pull request shows B's required check, not A's canceled state.
7. Push to a different branch and prove neither run cancels.

Repeat for fork pull requests if supported. Event contexts and permissions differ, and secrets may be absent. Cancellation should not turn an untrusted fork into a privileged execution path.

## Observe cancellation latency and reclaimed capacity

The CI platform sends cancellation, but the runner and child processes must respond. A shell that traps signals incorrectly or launches detached containers can keep consuming resources. Measure time from newer-run creation to old runner release.

Useful operational measures include:

- Number of superseded E2E jobs canceled.
- Runner-minutes consumed before cancellation.
- Cancellation-to-runner-release latency.
- Newest-commit queue time.
- Orphaned test environments found by the reconciler.
- Percentage of cancellations caused by a newer same-ref revision versus manual action.
- Flaky-test evidence lost because all failures were canceled before reporting.

The purpose is shorter relevant feedback, not maximizing a vanity cancellation count. If most jobs finish within seconds of being canceled, startup or shard scheduling changes may save more.

## Preserve enough diagnostics from a canceled run

Canceled work is obsolete for merge status, but it can still reveal a reproducible failure. Artifact upload steps may not execute after cancellation. Decide whether partial traces are worth preserving and whether your platform supports an always-run finalization window under cancellation.

Do not make cleanup depend on uploading a large report. Write essential shard and resource identifiers early to an external control plane if they are needed for reconciliation. Keep browser traces on first retry or on failure according to your framework configuration, understanding that hard cancellation can interrupt file finalization.

If cancellation repeatedly hides a failure that occurs before new commits, reproduce it on the latest revision or launch a non-canceling diagnostic workflow. Do not disable stale-run cancellation across the project just to preserve one investigation path.

## Avoid cross-branch and cross-workflow collisions

A constant group such as \`e2e\` ensures only one E2E run exists in the entire repository. That may be intentional for a scarce shared environment, but it also lets a documentation change on one branch cancel a release test on another. Name the actual resource or freshness domain.

Good groups often contain:

- Workflow or test-suite name.
- Repository-local pull request number or full ref.
- Shared environment name if exclusivity is required.
- Matrix shard only when concurrency is job-scoped.

Do not put secrets or user-supplied arbitrary text in group names. Normalize identifiers when case differences could surprise you, remembering GitHub treats concurrency names case-insensitively.

For comprehensive GitHub workflow design, see the [GitHub Actions testing CI/CD guide](/blog/github-actions-testing-ci-cd-guide). Teams using GitLab can extend the examples with the [GitLab CI test automation guide](/blog/gitlab-ci-test-automation-guide-2026).

## Compare cancellation controls across platforms

The concepts align, but translation is not literal:

| Concern | GitHub Actions | GitLab CI/CD |
|---|---|---|
| Grouping | Explicit \`concurrency.group\` expression | Newer pipeline on same ref |
| Stop running work | \`cancel-in-progress: true\` | Auto-cancel mode plus \`interruptible\` |
| Scope | Workflow or individual job | Pipeline behavior with per-job interruptibility |
| Protect a job | Put outside canceling scope or conditional policy | \`interruptible: false\` |
| Cross-workflow collision | Same group can collide repository-wide | Ref pipeline model and project settings |
| Matrix concern | Group must not serialize sibling shards | Parallel jobs inherit individual interruptibility |

Do not build a custom API cancellation script until native controls are proven insufficient. A polling script needs tokens, races with run creation, can cancel the wrong event type, and adds another service to maintain.

## Roll out without hiding pipeline defects

Enable cancellation on one expensive, side-effect-safe E2E workflow. Push successive commits intentionally and inspect job termination, artifacts, required checks, and cleanup. Then widen the policy.

Common rollout findings include:

- A background process ignores termination and holds the runner.
- A stale review namespace remains because teardown never runs.
- The group uses SHA, so no runs collide.
- A constant group cancels unrelated branches.
- Matrix shards cancel one another.
- A deployment was incorrectly labeled interruptible.
- Manual diagnostic runs disappear on the next push.
- Required checks remain pending because the expected job never reports for the latest SHA.

Each is easier to correct in a controlled trial than during a busy pull request.

## Account for merge queues and generated commits

A merge queue can test a generated commit that combines the pull request with the target branch. That run is not interchangeable with the latest source-branch pipeline because it answers a different question: whether the queued integration revision is safe to merge. Give queue-triggered workflows a group derived from the queue ref or queue entry, and do not let an ordinary source-branch push cancel another pull request's integration evidence.

Required checks should name the workflow that evaluates the generated commit. If a new source push invalidates the queue entry, let the platform remove or replace that entry through its supported mechanism. A broad repository-level concurrency constant can fight the queue scheduler and serialize unrelated candidates.

Bots that regenerate snapshots or lockfiles create the same distinction. Decide whether their commit supersedes the human commit on the same branch, which usually means it belongs in the same freshness group. If the bot opens a separate branch or verification workflow, namespace it separately. Test these event paths rather than assuming the pull-request context fields are populated identically.

## Frequently Asked Questions

### Should the concurrency group include the commit SHA?

Usually no. Each commit has a unique SHA, so stale and current revisions land in different groups and cannot cancel each other. Group by the PR or branch freshness domain.

### Will GitHub Actions concurrency cancel every matrix shard?

Workflow-level concurrency cancels the run and its shards. For job-level concurrency inside a matrix, include the shard identity or sibling shards may compete within the same group.

### What does interruptible mean in GitLab?

It declares that a running job can be canceled safely when the configured auto-cancel policy applies. Mark it true only when termination at any point will not leave unacceptable external state.

### How do I protect deployment while canceling browser tests?

Use job-level cancellation scope or a separate workflow on GitHub. On GitLab, use the \`interruptible\` auto-cancel mode and leave deployment \`interruptible: false\`.

### Can canceled E2E jobs still leak test data?

Yes. Test teardown may never execute. Namespace resources by run, attach expirations where possible, and operate an idempotent cleanup process independent of normal job completion.
`,
};
