import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Concurrency Groups Deploy Safety: Serialize Releases Without Races',
  description: 'Use CI concurrency groups deploy safety patterns to serialize releases, cancel only stale validation, and prevent overlapping jobs from corrupting environments.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# CI Concurrency Groups Deploy Safety: Serialize Releases Without Races

CI concurrency groups improve deploy safety by ensuring that only one job or workflow sharing a deployment key runs at a time. The useful key is the resource being mutated, usually an environment such as production, not the branch, commit, or workflow file. Put deployment jobs for the same resource in the same group, keep production deployments queued instead of canceling an in-progress release, and use cancellation only for replaceable validation or preview work.

That sounds simple, but the group key is a distributed-systems boundary. A key that is too broad blocks unrelated regions. A key that is too narrow allows two workflows to update the same namespace, database migration state, or traffic router simultaneously. This guide turns CI concurrency groups deploy safety into a testable design for QA engineers, including GitHub Actions examples, failure injection, audit evidence, and a diagnosis of the classic race where a newer run cancels a deployment after it has already changed production.

GitHub documents current concurrency behavior at https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency. At the time of writing, a concurrency group permits at most one running member, group names are case-insensitive, ordering is not guaranteed, and the default queue keeps only one pending member unless a larger queue is selected. Those details must shape the release policy, not merely the YAML syntax.

## Define the protected resource before writing the group string

A concurrency group is a lock name. The lock must represent the smallest real resource on which overlapping writes are unsafe. For a single production cluster, that can be \`deploy-production\`. For independently released regions, it can be \`deploy-production-us-east\` and \`deploy-production-eu-west\`. If every region shares one database migration stream, however, region-specific application locks alone are insufficient. The migration needs its own global lock or a separate migration workflow.

Start with an inventory of mutations. Include actions that teams often forget are deployments: schema migrations, feature-flag changes, CDN invalidation, mobile release promotion, infrastructure plans that apply changes, and rollback jobs. Then map each mutation to the resource whose state it changes.

| Operation | Shared mutable resource | Suitable group | Unsafe key |
|---|---|---|---|
| Deploy API to production | Production API cluster | \`deploy-api-production\` | Commit SHA |
| Deploy preview | One PR namespace | \`preview-pr-<number>\` | One global preview group |
| Apply global DB migration | Production database | \`migrate-db-production\` | Region name |
| Promote mobile artifact | App store release track | \`promote-android-production\` | Workflow run ID |
| Roll back production | Same target as forward deploy | \`deploy-api-production\` | Separate rollback group |

The unsafe keys all miss the conflict. Every commit SHA and run ID is unique, so those groups serialize nothing. A global preview key prevents harmless parallel work. A separate rollback group lets rollback and forward deployment race on the same target, precisely when the system is already unstable.

A concise design record makes review easier:

\`\`\`yaml
# .github/deployment-locks.yml
resources:
  api-production:
    group: deploy-api-production
    cancellation: queue
    owners: [platform-qa, release-engineering]
  api-staging:
    group: deploy-api-staging
    cancellation: replace-pending
    owners: [platform-qa]
  preview:
    group-template: preview-pr-<pull-request-number>
    cancellation: cancel-in-progress
    owners: [developer-experience]
\`\`\`

This file is documentation, not a GitHub Actions feature. Its value is an explicit contract that reviewers and coding agents can compare with workflow changes.

## Separate replaceable verification from irreversible release work

The most important policy split is not staging versus production. It is replaceable work versus state-changing work. A unit test for commit A becomes obsolete when commit B arrives. Canceling A saves capacity. A production rollout for commit A may have applied a migration, changed half the pods, or shifted ten percent of traffic. Canceling the runner does not undo those effects.

Use different groups and cancellation policies for these phases:

| Phase | Can a newer commit replace it safely? | Recommended behavior | Reason |
|---|---:|---|---|
| Lint and unit tests | Yes | Cancel stale run | Results for old code are obsolete |
| E2E against isolated preview | Usually | Cancel if teardown is guaranteed | Namespace belongs to one PR |
| Shared staging deployment | Sometimes | Serialize, decide cancellation deliberately | Other tests may consume staging |
| Production deployment | No | Queue, never cancel automatically | Partial mutation needs completion or explicit rollback |
| Post-deploy observation | No | Keep attached to release | It determines release health |
| Production rollback | No | Serialize with forward deploy | Both mutate the same target |

For stale tests, combine concurrency with [canceling stale E2E runs on a new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit). For capacity reduction before concurrency even becomes relevant, use [CI test selection by git diff](/blog/ci-test-selection-by-git-diff). Those two optimizations belong upstream of the production lock.

## Build a production workflow whose lock matches the environment

This workflow builds an immutable artifact first, then deploys it under a production resource group. The deployment job uses \`queue: max\`, the documented GitHub Actions option for retaining a larger pending queue, and does not set \`cancel-in-progress\`. If your GitHub plan or server version does not support that option, omit it and understand that the default retains only the newest pending member rather than a full release queue.

\`\`\`yaml
name: production-release

on:
  workflow_dispatch:
    inputs:
      image_digest:
        description: Immutable image digest, including sha256 prefix
        required: true
        type: string

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    name: deploy-production
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: deploy-api-production
      queue: max
    steps:
      - uses: actions/checkout@v4
      - name: Validate immutable digest
        env:
          IMAGE_DIGEST: \${{ inputs.image_digest }}
        run: |
          if [[ ! "$IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
            echo "Expected an immutable sha256 digest" >&2
            exit 1
          fi
      - name: Deploy exact artifact
        env:
          IMAGE_DIGEST: \${{ inputs.image_digest }}
        run: ./scripts/deploy-production.sh "$IMAGE_DIGEST"
      - name: Verify release health
        env:
          IMAGE_DIGEST: \${{ inputs.image_digest }}
        run: ./scripts/verify-production.sh "$IMAGE_DIGEST"
\`\`\`

The \`environment: production\` line can add environment protection, secrets, and approval rules. It is not a substitute for the concurrency group. Environment protection governs authorization and gates; the group governs overlapping execution. Use both when production needs approval and serialization.

Notice that the workflow takes an immutable digest, not a mutable tag such as \`latest\`. A queued release must deploy the artifact that was approved when it entered the queue. If the job resolves \`latest\` only when it eventually starts, waiting changes its meaning.

## Keep validation concurrency independent from deployment concurrency

Workflow-level concurrency is convenient, but it can accidentally hold a deployment lock while build and tests run for twenty minutes. Prefer job-level concurrency around the state-changing section. That reduces lock time and lets unrelated preparation proceed.

\`\`\`yaml
name: verify-and-release

on:
  workflow_dispatch:
    inputs:
      image_digest:
        required: true
        type: string

jobs:
  verify:
    runs-on: ubuntu-latest
    concurrency:
      group: verify-main-\${{ github.workflow }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test

  deploy:
    needs: verify
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: deploy-api-production
      queue: max
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy-production.sh "\${{ inputs.image_digest }}"
\`\`\`

This example assumes the deploy script can resolve an immutable artifact named for the full commit. In a real pipeline, pass a digest or artifact identifier from the build job. The key point is that cancellation on \`verify\` cannot terminate \`deploy\`, because they have different group names and policies.

What people get wrong is placing one workflow-level group on the whole file with \`cancel-in-progress: true\`. It makes the YAML shorter, but a push during production verification can cancel the current release job. Cancellation is a signal to stop the runner, not a transaction rollback.

## Prevent cross-workflow collisions deliberately

Concurrency groups are repository-scoped in GitHub Actions, and jobs from different workflow files collide when they use the same group name. That is useful for forward deploy and rollback because those operations must not overlap. It is surprising when unrelated workflows accidentally share \`production\`.

Choose either namespaced isolation or intentional shared locks:

\`\`\`yaml
# Forward deployment
concurrency:
  group: deploy-api-production
  queue: max

# Emergency rollback in another workflow
concurrency:
  group: deploy-api-production
  queue: max

# Independent documentation publishing
concurrency:
  group: publish-docs-production
  cancel-in-progress: true
\`\`\`

Forward deployment and rollback share a key because they update the same API environment. Documentation has a distinct key because it updates a separate site. Including \`github.workflow\` in every group would prevent accidental collisions, but it would also prevent the deliberate forward-versus-rollback exclusion. Name the resource explicitly instead.

Group names are case-insensitive. \`Deploy-API-Production\` and \`deploy-api-production\` are the same lock. Normalize to lowercase so dashboards and audit queries do not imply a distinction the scheduler ignores.

## Design multi-region locking as a hierarchy

Multi-region releases expose a limitation: one job can belong to one concurrency group. If a regional deploy needs both a global migration lock and a regional application lock, model the operation as separate jobs. Run the migration once under a global database group, then fan out regional application deployments with one regional group per matrix entry.

\`\`\`yaml
jobs:
  migrate:
    runs-on: ubuntu-latest
    concurrency:
      group: migrate-db-production
      queue: max
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/migrate.sh production

  deploy-region:
    needs: migrate
    strategy:
      fail-fast: false
      matrix:
        region: [us-east, eu-west]
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-api-production-\${{ matrix.region }}
      queue: max
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/deploy-region.sh production "\${{ matrix.region }}"
\`\`\`

The migration must be backward compatible with both the old and new application versions if regions can update independently. Concurrency prevents overlap; it does not make an incompatible schema rollout safe.

| Topology | Lock model | Parallelism retained | Remaining contract |
|---|---|---|---|
| One cluster, one database | One deploy group | None within production | Deploy is idempotent |
| Independent regional stacks | One group per region | Regions can run together | No shared mutation |
| Shared database, regional apps | Global migration plus regional groups | Regional app deploys | Expand-and-contract schema |
| Blue/green slots | Group per environment, not per color | Preparation may overlap | Traffic switch serialized |

For blue/green, two jobs can prepare separate colors, but the shared traffic router is still one production resource. Place the traffic switch in the production group even if image rollout to the inactive slot uses another key.

## Make deployment scripts cancellation-aware and idempotent

Even when production is configured not to cancel, operators can cancel manually, runners can disappear, and networks can fail. A safe deployment script records progress and can be rerun without guessing. It should check current state before mutation, apply one bounded transition, and verify the observed artifact.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

digest="\${1:?usage: deploy-production.sh <image-digest>}"
namespace="production"

current="$(kubectl -n "$namespace" get deploy api \\
  -o jsonpath='{.spec.template.spec.containers[0].image}')"

target="registry.example.test/api@$digest"
if [ "$current" = "$target" ]; then
  echo "Target is already deployed: $target"
else
  kubectl -n "$namespace" set image deployment/api "api=$target"
fi

kubectl -n "$namespace" rollout status deployment/api --timeout=10m
observed="$(kubectl -n "$namespace" get deploy api \\
  -o jsonpath='{.spec.template.spec.containers[0].image}')"
test "$observed" = "$target"
\`\`\`

The commands shown are standard \`kubectl\` operations. The example assumes a deployment named \`api\`, a container also named \`api\`, and an authenticated cluster context. Replace those identifiers with real inventory. Avoid adding automatic destructive rollback unless the application has a tested rollback contract, especially after database migrations.

The script is idempotent for the image update: running it again with the same digest converges on the same target. It also verifies the observed deployment image after rollout. A concurrency key without these properties only reduces the number of overlapping failures.

## Prove the lock with a controlled contention test

Reviewing YAML does not prove that the computed group names collide as intended. Add a non-production workflow that logs entry and exit times against a disposable environment. Dispatch it twice and assert that its critical sections do not overlap.

\`\`\`yaml
name: concurrency-probe

on:
  workflow_dispatch:
    inputs:
      target:
        required: true
        type: choice
        options: [qa-a, qa-b]

jobs:
  hold-lock:
    runs-on: ubuntu-latest
    concurrency:
      group: probe-\${{ inputs.target }}
      queue: max
    steps:
      - name: Record critical section
        env:
          TARGET: \${{ inputs.target }}
        run: |
          started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          echo "ENTER target=$TARGET at=$started"
          sleep 45
          finished="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          echo "EXIT target=$TARGET at=$finished"
\`\`\`

Two \`qa-a\` runs should serialize. A \`qa-a\` and \`qa-b\` run should be eligible to overlap. The 45-second hold is illustrative and belongs only in this diagnostic workflow. Capture run IDs and timestamps as evidence.

A stronger probe writes a lease row in a test database using a unique constraint on the target. If the second job ever acquires the resource during the first job's interval, fail the test. That checks the external resource boundary rather than trusting scheduler labels alone.

## Diagnose the partial-deploy cancellation failure

Consider this realistic incident:

1. Run A starts production deployment of commit A.
2. It applies a database migration and updates half the application replicas.
3. Commit B reaches \`main\` and starts run B.
4. Both workflows use \`group: production\` with \`cancel-in-progress: true\`.
5. GitHub cancels run A. Run B begins against mixed application versions and the already-migrated schema.
6. B fails its pre-deploy assumption that the old schema is present.

The visible symptom is two canceled or failed jobs, but the defect is policy, not flakiness. Diagnose it by correlating scheduler events with external deployment events:

| Evidence | Question | Expected safe result |
|---|---|---|
| Actions run timeline | Which run canceled which? | Production run was not auto-canceled |
| Computed group name | Did both jobs target the same lock? | Same resource maps to same key |
| Cluster rollout history | What mutation completed before cancellation? | Progress is known and resumable |
| Migration ledger | Was schema change committed? | Ledger identifies exact migration |
| Artifact digest | What code is actually serving? | One approved digest or documented mix |
| Health checks | Is rollback safer than resume? | Decision uses observed compatibility |

The immediate recovery is environment-specific: finish A, resume with the same artifact, or perform a tested rollback. Do not blindly rerun B. The durable fix is to queue production work, move replaceable verification into a cancelable group, and make migration transitions compatible and observable.

## Test group-key construction like application code

Dynamic keys deserve unit tests. A small pure function can document the normalization rules before equivalent expressions are copied into workflow YAML.

\`\`\`ts
import assert from 'node:assert/strict';
import test from 'node:test';

type Target = {
  service: string;
  environment: string;
  region?: string;
};

export function deploymentGroup(target: Target): string {
  const parts = ['deploy', target.service, target.environment, target.region]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
  return parts.join('-');
}

test('same production resource receives the same key', () => {
  assert.equal(
    deploymentGroup({ service: 'API', environment: 'Production' }),
    'deploy-api-production',
  );
});

test('independent regions receive different keys', () => {
  const east = deploymentGroup({
    service: 'api', environment: 'production', region: 'us-east',
  });
  const west = deploymentGroup({
    service: 'api', environment: 'production', region: 'eu-west',
  });
  assert.notEqual(east, west);
});
\`\`\`

Do not import this function directly into GitHub expression evaluation. The test is an executable specification for human review and for any generator that creates workflow files. If you generate YAML, test the generated output as well.

## Build release assertions around invariants

Concurrency is successful when operational invariants hold, not when jobs merely show a pending badge. Define assertions that can be observed in CI and in the target platform.

| Invariant | How to measure it | Failure response |
|---|---|---|
| At most one production mutator runs | Run timeline plus deployment lease | Stop newer mutator, inspect state |
| Every queued job preserves artifact identity | Digest logged at request and deploy | Reject mutable reference |
| Cancellation never interrupts irreversible phase automatically | Audit canceled runs by job name | Split groups and disable cancellation |
| Rollback and forward deploy cannot overlap | Shared resource group and external lease | Unify lock name |
| Independent preview targets can overlap | Dispatch two different PR targets | Narrow over-broad key |
| Lock wait is visible | Record queued and started timestamps | Alert on excessive queue age |

Ordering remains a key caveat. GitHub explicitly says ordering is not guaranteed, even though current queue behavior may process waiting work based on start-of-wait time. Do not encode a release dependency as “A was dispatched before B.” Encode it with \`needs\`, an artifact promotion record, or explicit version preconditions.

## Review every deployment change with a fixed checklist

When a human or AI coding agent edits deployment automation, require answers to these questions:

1. What exact external resource does this job mutate?
2. Which other workflows mutate the same resource?
3. Do all of them compute the same normalized group name?
4. Is cancellation safe at every instruction inside the grouped job?
5. Does a queued run preserve the approved immutable artifact?
6. Can the deploy be retried after runner loss?
7. Are migrations compatible with mixed application versions?
8. Is the environment approval gate independent from the lock?
9. Can unrelated targets still run concurrently?
10. Is queue age and active artifact identity observable?

Treat a changed concurrency key like a changed database lock. It can affect workflows outside the edited file because repository-level groups cross workflow boundaries. Search the entire \`.github/workflows\` directory for the old and new keys before approving the change.

## Coordinate deployers that live in different repositories

Repository-scoped concurrency cannot protect a resource when several repositories deploy to it independently. An application repository, infrastructure repository, and emergency-operations repository may all mutate the same cluster while their local schedulers see different queues. Copying the same group text into each repository looks consistent in review but does not create a cross-repository lock.

Move the final mutation behind one deployment controller when possible. Upstream repositories build and attest immutable artifacts, then submit a promotion request to the controller. The controller owns environment authorization, serialization, release state, and health verification. This also gives QA one place to assert that every production change follows the same state machine.

If centralization is not practical, acquire a lease in a shared durable system immediately before mutation. The lease record needs a unique resource name, holder identity, acquisition time, expiration, and fencing value. Expiration alone is dangerous: a paused old holder can resume after its lease expires and overlap the new holder. A fencing value lets the deployment service reject commands from an older holder. Implementing a correct distributed lock is specialized work, so prefer a deployment platform that already provides documented environment locking.

Cross-repository tests should submit two harmless promotions from different repositories to the same disposable target. Assert that their mutation intervals never overlap and that killing the first runner produces a defined lease-recovery path. Then submit requests to two independent targets and confirm that the external coordinator preserves useful parallelism.

## Decide whether queued releases should all execute

Serialization answers how many releases mutate an environment at once. It does not answer whether every waiting release still deserves deployment. If commits A, B, and C are approved while A is deploying, shipping B and then C may waste time and expose an intermediate version that nobody needs. Dropping B may be efficient, but only if no compliance, migration, or promotion rule requires it.

Define supersession outside the critical deployment step. A release request can be marked superseded while it is still waiting, but a release that has started should reach a known terminal state. Before skipping an intermediate artifact, verify that database migrations are cumulative, artifact C contains all intended changes, and audit records preserve the decision. Never implement supersession by turning on automatic cancellation for the grouped production job.

Use a small release state model:

| State | Mutated production? | May be superseded? | Required evidence |
|---|---:|---:|---|
| Requested | No | Yes | Artifact digest and requester |
| Approved | No | Policy dependent | Approval and test provenance |
| Waiting for lock | No | Usually | Queue timestamp and target |
| Deploying | Possibly | No | Holder, step, and observed state |
| Verifying | Yes | No | Health results and artifact identity |
| Completed or rolled back | Yes | No | Terminal outcome and timestamps |

The queue should expose age and desired artifact, not just a count. A long wait can invalidate temporary credentials, change a maintenance window, or make approval stale. Revalidate time-sensitive preconditions after acquiring the lock but before the first mutation. Keep artifact identity fixed while refreshing only the credentials needed to deliver it.

## Audit concurrency drift continuously

Workflow reviews catch intended changes, but group behavior can drift when a service is renamed, a new rollback workflow is added, or a matrix dimension changes. Add a repository audit that extracts deployment jobs, their environment targets, group expressions, and cancellation policies. Compare the result with the documented resource inventory. The audit can flag a production job with no group, a cancelable irreversible job, or two known mutators with different keys.

Dynamic expressions need scenario evaluation. For pull requests, pushes, manual dispatches, and reusable workflow calls, record which context properties exist and what group string results. A missing property can collapse several resources into one group or create an unexpectedly unique key. Test fallbacks with representative event payloads rather than relying on visual inspection.

Finally, review canceled production jobs as operational defects until proven harmless. For each cancellation, determine whether mutation had begun, whether external state converged, and why the scheduler or operator stopped it. This feedback loop turns concurrency from static YAML into an observed safety control.

## Frequently Asked Questions

### Should production deployments use cancel-in-progress?

Usually no. A production deployment can change external state before the CI runner receives a cancellation signal. Stopping the job does not reverse a migration, restore replaced pods, or move traffic back. Queue production releases and cancel only work that is genuinely replaceable, such as tests for an obsolete commit. If an organization deliberately uses cancellation, the deployment system must offer an atomic operation or a tested resume and rollback protocol, and the team should prove that behavior with failure injection rather than assuming the YAML provides transactionality.

### Should the concurrency group contain the branch name or environment name?

Use the environment or another actual mutable resource. A branch name works only when each branch owns an isolated target. Two release branches deploying to the same production cluster must collide, so branch-based keys are unsafe there. Conversely, two pull requests with separate preview namespaces should have different keys, usually based on the pull request number. Ask what must never be mutated simultaneously, then make every workflow targeting that resource calculate the same normalized key.

### Do GitHub environments automatically serialize deployments?

Environment protection and concurrency solve different problems. Environments can control secrets, reviewers, and deployment gates, while a concurrency group limits simultaneous jobs that share its key. Configure the production environment for authorization and the production resource group for serialization. Then test both: an unapproved run must not deploy, and two approved runs must not overlap. Do not infer one guarantee from the presence of the other feature in a workflow.

### How can QA verify concurrency without risking production?

Create a disposable probe workflow with the same key-building logic and a bounded critical section. Dispatch two runs for the same fake target and one for a different target. Same-target intervals must not overlap, while different targets should be able to run together. Record run IDs, computed keys, entry times, and exit times. Add controlled cancellation and runner-loss exercises against a test deployment script to confirm that retries converge on the requested artifact before applying the policy to production.
`,
};
