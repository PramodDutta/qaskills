import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Self Hosted Runner Isolation for Trustworthy Test Automation',
  description: 'Design CI self hosted runner isolation with ephemeral workers, least privilege, clean workspaces, network controls, and probes that expose state leakage.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# CI Self Hosted Runner Isolation for Trustworthy Test Automation

CI self hosted runner isolation is the practice of giving each job a clean execution boundary for files, processes, credentials, network access, caches, devices, and infrastructure. The strongest general design is one ephemeral runner per job, created from an immutable image and destroyed after the job. Persistent runners require compensating controls, but a cleanup script alone cannot reliably reverse arbitrary code that had the same privileges as the runner account.

For QA teams, isolation is also a correctness requirement. A leaked test server can make the next build talk to old code. A warm browser profile can preserve authentication. A dirty workspace can supply generated fixtures that the current commit never created. A shared emulator can retain permissions and database state. The suite may go green because the previous job prepared its environment, or go red because another job consumed its port or device.

The practical goal is not the vague instruction “clean up after tests.” Define the assets a job can reach, provision them for one trust level and one lifetime, verify that the boundary holds, retain external diagnostics, then dispose of the worker. This guide develops that model for test automation on self-hosted CI.

## Define isolation across every state channel

Workspace deletion covers only one channel. Inventory all state that can survive or cross a job boundary. Include both intentional sharing, such as a dependency cache, and accidental sharing, such as a daemon left listening on localhost.

| State channel | Typical QA residue | Risk in the next job | Strong boundary |
|---|---|---|---|
| Filesystem | screenshots, generated config, browser profiles | stale artifact or secret reuse | fresh disk or disposable volume |
| Processes | web server, Appium, emulator, proxy | port conflict or old service accepted | worker destruction |
| Credentials | cloud token, signing key, session cookie | unauthorized later use | short-lived scoped identity |
| Network | open tunnel, test database route | lateral movement or cross-environment access | segmented network and egress policy |
| Containers | running service, volume, image layer | data and privilege persist | per-job runtime and volume lifecycle |
| Caches | package archive, compiler output | poisoning or incorrect dependency reuse | content-addressed, scoped cache |
| Devices | permissions, app data, orientation | order-dependent mobile tests | reset snapshot or dedicated device lease |
| Host configuration | DNS entry, certificate, kernel setting | invisible machine drift | immutable worker image |

Turn each row into an explicit decision: isolated, shared read-only, shared with validation, or prohibited. “Shared because it is on the runner” is not a decision. A package cache may be shared across trusted branches if entries are integrity checked and cache writers are constrained. A browser user-data directory containing authenticated sessions should be unique per job and destroyed.

GitHub documents that self-hosted machines do not inherently need a clean instance for every job, which means the platform does not promise cleanliness for persistent hosts. Its self-hosted runner reference recommends ephemeral runners for autoscaling and explains that an ephemeral runner receives one job: https://docs.github.com/en/actions/reference/runners/self-hosted-runners. Other CI products have their own executors, but the boundary question is the same: what is rebuilt between two untrusted command streams?

## Start the threat model with repository trust

The runner executes repository-controlled code. Test scripts, package lifecycle scripts, build tools, downloaded browser binaries, and third-party actions can all run commands. A pull request that changes a test can read whatever the runner account can read and connect wherever the host can connect. Labels and branch names do not sandbox that code.

Classify workload sources before assigning runner groups:

| Workload source | Example | Appropriate runner posture |
|---|---|---|
| trusted protected branch | reviewed release commit | ephemeral internal runner with scoped deployment access |
| same-repository feature branch | employee-authored change | ephemeral test runner without production access |
| fork pull request | code from outside trust boundary | hosted sandbox or isolated pool with no internal reach |
| scheduled dependency job | executes updated third-party packages | ephemeral restricted network and credentials |
| mobile hardware test | signed app on physical device | exclusive device lease plus ephemeral coordinator |
| deployment verification | post-deploy read-only probes | dedicated identity and environment-specific network policy |

Do not route public fork code to a runner that can reach internal services, even if secrets are withheld by the CI platform. Network position, metadata services, cached credentials, device connections, and host files can still be valuable. GitHub's guidance warns about the security implications of self-hosted runners for public repositories: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions.

Runner groups and labels are routing controls. They help select a pool, but they are not a security boundary by themselves. Enforce which repositories and workflows can use a group, protect workflow files and environments, and make the underlying worker incapable of reaching resources outside its assigned tier.

## Prefer one ephemeral worker for one job

An ephemeral runner registers, accepts one job, deregisters, and is then destroyed by the surrounding provisioning system. Destruction must include the compute instance or pod and any writable volumes. Deregistration alone removes the runner from CI scheduling but does not erase the machine.

For GitHub Actions, the registration command supports \`--ephemeral\`. Actions Runner Controller is GitHub's Kubernetes-based reference implementation for runner scale sets: https://docs.github.com/en/actions/concepts/runners/actions-runner-controller. The exact provisioning implementation may be a virtual machine scale set, Kubernetes runner pod, or internal orchestration service. Preserve runner application logs outside the worker because the worker disappears during failure analysis.

A workflow can route to the isolated pool with explicit labels and minimal token permissions:

\`\`\`yaml
name: qa-browser-tests

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  browser-tests:
    runs-on: [self-hosted, linux, x64, qa-ephemeral]
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm test
\`\`\`

This selects a pool but does not create isolation by itself. The pool controller must launch a clean worker for that job and dispose of it afterward. The top-level \`permissions\` block gives the workflow token read access to repository contents only. Add narrowly scoped permissions to individual jobs only when required.

The action major tags shown are documented public actions, but a high-assurance organization may pin actions to reviewed commit SHAs through policy. Dependency pinning and runner isolation solve different problems. A pristine worker still executes the action code it is given.

| Ephemeral lifecycle point | Control | Evidence |
|---|---|---|
| image build | patched, scanned, versioned base | immutable image digest and build log |
| registration | one-job or just-in-time registration | runner record tied to job ID |
| job startup | empty writable workspace and volume | boundary probe results |
| execution | constrained identity and network | audit logs and policy decision |
| completion | logs exported before teardown | external artifact and log location |
| teardown | compute and volumes destroyed | controller event and absence check |

## Treat containers as a boundary with known limits

A job container improves filesystem and process separation from the host, especially when it receives a new writable layer for each job. It does not create a new kernel. Privileged mode, host path mounts, device access, and a mounted container-engine socket can effectively hand the job control of the host.

GitHub Actions supports job containers for Linux runners. This example executes test commands inside a declared Node container and keeps token permissions narrow:

\`\`\`yaml
name: isolated-node-tests

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    runs-on: [self-hosted, linux, qa-ephemeral]
    container:
      image: node:22-bookworm-slim
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
\`\`\`

The ephemeral host label remains important. A per-job container on a long-lived host reduces ordinary residue but may leave engine state, volumes, images, logs, networks, or host modifications if privileged paths are exposed. It also shares the host kernel. Choose virtual machines when kernel separation and hostile code are in scope, or use a sandboxed runtime evaluated by the security team.

Avoid mounting \`/var/run/docker.sock\` into test jobs just to launch service containers. Access to a powerful engine socket commonly permits host-level actions. If browser tests need application dependencies, provision them through the CI executor's controlled service mechanism, a per-job remote environment, or a rootless isolated runtime whose threat model is documented.

## Give each job a private filesystem namespace

Even on an ephemeral worker, structure scripts so they cannot collide accidentally. Create a job root with restrictive permissions, place browser profiles and artifacts underneath it, and validate the path before cleanup. The following Bash harness is runnable on Linux and scopes deletion to the directory returned by \`mktemp\`.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
umask 077

temp_parent="\${RUNNER_TEMP:-/tmp}"
job_root="$(mktemp -d "\${temp_parent%/}/qa-job.XXXXXX")"

cleanup() {
  case "$job_root" in
    "\${temp_parent%/}"/qa-job.*) rm -rf -- "$job_root" ;;
    *) echo "Refusing unsafe cleanup path: $job_root" >&2; return 1 ;;
  esac
}
trap cleanup EXIT

export QA_BROWSER_PROFILE_DIR="$job_root/browser-profile"
export npm_config_cache="$job_root/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$job_root/browsers"
mkdir -p "$QA_BROWSER_PROFILE_DIR" "$npm_config_cache" "$PLAYWRIGHT_BROWSERS_PATH"

npm ci
npm test
\`\`\`

Inside an isolated job process, task-specific cache, browser, and profile directories prevent participating tools from reusing long-lived state. Configure the browser launcher to use \`QA_BROWSER_PROFILE_DIR\` when a persistent profile is required by the test. On a persistent runner, this is useful hygiene but not a complete boundary: the job can still read other host paths allowed to the runner account and can deliberately escape the convention.

Do not run \`rm -rf\` against a broadly expanded variable. Validate a narrow prefix created for the job, quote every path, and prefer worker destruction over complex cleanup. Cleanup should remain idempotent because cancellation, timeout, and process termination can interrupt it.

## Isolate caches from workspaces and secrets

Caches deliberately cross job boundaries, so treat them as an input supply chain. Key entries by dependency lockfile and relevant toolchain, verify package integrity through the package manager, and do not place tokens, browser profiles, test databases, or generated environment files in a shared cache.

Separate four concepts that teams often merge:

| Storage kind | Lifetime | May contain secrets? | Restore policy |
|---|---|---|---|
| workspace | one job | only while needed | never restore from another job |
| test artifact | retained by policy | redact or prohibit sensitive data | downloaded by authorized reviewers |
| dependency cache | multiple trusted jobs | no | key and integrity validate |
| runner diagnostic log | retained externally | redact tokens | restricted operational access |

A cache hit should affect speed, not correctness. Periodically run a cold-cache lane. If tests fail only without cache, the build omitted a declared dependency. If tests pass only with cache, stale generated output may be hiding a missing build step.

Cross-fork cache access deserves special review. An untrusted job that can write a key later restored by a privileged job creates a poisoning path. Use the CI product's documented cache isolation behavior and organization policy, and avoid restore-key patterns that allow an untrusted branch to influence a trusted release.

## Scope credentials to job, environment, and time

Long-lived credentials on the runner filesystem defeat ephemeral workspace cleanup. Prefer CI-issued identity and short-lived cloud credentials scoped to one job and environment. Restrict the workflow token through the permissions model. Store deployment secrets behind protected environments rather than making them available to general test jobs.

A browser test rarely needs repository write permission. An API integration test may need access only to a disposable test tenant. A mobile signing job should not share a runner pool or account with fork-based unit tests. Express these as separate runner groups, identities, and network policies.

Masking a secret in logs does not prevent the job from exfiltrating it. Secret redaction is a logging safeguard, not isolation. Likewise, deleting an environment variable after a command does not revoke a credential already copied to a file or remote endpoint. Keep the credential's power and lifetime small enough that a leak has bounded impact.

If a test requires a service password, provision a per-run test account where feasible and revoke it during environment teardown. Make teardown server-side, not dependent only on the runner surviving long enough to execute \`afterAll\`.

## Segment test networks and constrain egress

Self-hosted runners are often chosen because they can reach private staging systems or hardware labs. That connectivity increases the impact of executing repository code. Place each pool in a network segment that reaches only its assigned services. Deny cloud metadata endpoints and administrative planes unless explicitly required. Control egress so a compromised dependency cannot connect anywhere on the internet without observation.

Network isolation should distinguish environments. A staging browser runner should not be able to connect to a production database simply because both live on the corporate network. Use service identities and application-layer authorization in addition to firewall rules.

For parallel E2E jobs, assign unique test tenants, namespaces, ports, or database schemas. Worker isolation does not prevent two workers from mutating the same remote account. Include the CI run ID and matrix index with braces when building shell identifiers so variable parsing is unambiguous:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

: "\${CI_RUN_ID:?CI_RUN_ID is required}"
: "\${CI_NODE_INDEX:?CI_NODE_INDEX is required}"

test_namespace="qa_\${CI_RUN_ID}_\${CI_NODE_INDEX}"
export TEST_NAMESPACE="$test_namespace"

npm run test:e2e
\`\`\`

The environment variable names here are an application-neutral example and must be mapped from the chosen CI system. The important shell behavior is \`\${CI_RUN_ID}_\${CI_NODE_INDEX}\`, which delimits each name. A remote namespace must also be validated and deleted through the test environment's control plane.

## Detect leaked processes and occupied ports

Persistent runners often fail through process residue. Imagine job A starts an application server on port 4173, its test crashes, and the server survives. Job B's start command fails with “address already in use,” but its health check reaches job A's server. The browser suite runs against the previous commit and passes. Workspace cleaning does nothing because the stale process already holds executable code and open files.

A simple preflight can refuse to continue when the required port is occupied. This Node script attempts an exclusive listen on loopback, closes it, and exits nonzero with a useful error if another process owns the port:

\`\`\`js
import net from 'node:net';

const port = Number.parseInt(process.env.TEST_PORT ?? '4173', 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('TEST_PORT must be an integer from 1 to 65535');
}

const server = net.createServer();

server.once('error', (error) => {
  console.error(\`Port \${port} is not isolated: \${error.message}\`);
  process.exitCode = 1;
});

server.once('listening', () => {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    } else {
      console.log(\`Port \${port} is available\`);
    }
  });
});

server.listen({ host: '127.0.0.1', port, exclusive: true });
\`\`\`

This detects one symptom, not all leakage. It cannot prove that no rogue process exists, and a malicious job could wait before binding. On an ephemeral worker, the strongest check is that the worker identity is new and its writable resources are newly provisioned. On a persistent host, collect process, socket, container, mount, and workspace inventories before and after a controlled canary job.

When diagnosing this failure, identify the listening PID, its parent, start time, command path, working directory, and owning prior job. Preserve those facts before killing it. The root cause may be a test runner that detached a child, a shell trap that never ran on cancellation, or a service manager configured at host scope.

## Prove isolation with paired canary jobs

Policy documents do not prove the executor behaves as designed. Create an infrastructure-level test that deliberately leaves harmless markers through each state channel on worker A, then schedules a verification job on the next worker and expects those markers to be absent. Run it in a dedicated pool with no secrets or production access.

The producer can create a file and launch a short-lived sentinel server under a unique identifier:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

: "\${ISOLATION_CANARY_ID:?ISOLATION_CANARY_ID is required}"
marker="/tmp/qa-isolation-\${ISOLATION_CANARY_ID}"

printf '%s\n' "$ISOLATION_CANARY_ID" > "$marker"
node -e 'setInterval(() => {}, 1000)' >/dev/null 2>&1 &
printf '%s\n' "$!" > "\${marker}.pid"

echo "Created canary marker for controlled executor validation"
\`\`\`

This script intentionally leaves residue and must run only on a disposable canary worker. The surrounding harness records the worker identity, finishes the CI job without local cleanup, and then proves that the infrastructure destroyed the worker. Do not run it on a general shared host.

The verifier receives the same canary ID, confirms both files are absent, and compares the current worker identity with the producer's recorded identity. The exact identity source depends on the provisioning platform, so implement that assertion in the controller integration rather than inventing a generic environment key.

Canary coverage should include a temporary file, environment-specific process, writable container volume, browser profile, cached item in a prohibited path, and short-lived credential revocation. Never use real secrets as canaries. A random non-sensitive token is sufficient to detect residue.

## Separate scheduling freshness from machine cleanliness

Canceling a superseded workflow saves resources and prevents an older commit from publishing a late result. It does not clean a runner that already executed code. Conversely, an ephemeral runner can be clean while CI still wastes time testing obsolete commits. Treat these as two independent controls.

GitHub Actions concurrency can group workflow runs and cancel an in-progress run when a newer one enters the group:

\`\`\`yaml
name: pull-request-e2e

on:
  pull_request:

concurrency:
  group: e2e-\${{ github.workflow }}-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  e2e:
    runs-on: [self-hosted, linux, qa-ephemeral]
    steps:
      - uses: actions/checkout@v4
      - run: ./ci/run-e2e.sh
\`\`\`

For a deeper workflow design, use the [guide to canceling stale E2E runs](/blog/ci-cancel-stale-e2e-runs-on-new-commit). Cancellation must trigger infrastructure teardown even if ordinary job cleanup does not finish. Test that path by canceling a canary job while it owns a worker and verifying that the worker and remote test namespace disappear.

Test selection is another independent optimization. Selecting a subset from changed files can lower queue time, but selected tests still need a clean environment. The [CI test selection by Git diff guide](/blog/ci-test-selection-by-git-diff) covers that decision boundary. Never use a “small change” classification to route untrusted code onto a more privileged persistent runner.

## Reset mobile devices and browsers as leased resources

Mobile infrastructure adds state beyond the runner. The coordinator VM may be ephemeral while a physical phone persists for months. Give each job an exclusive lease, record the device ID and starting condition, install only the assigned build, and reset application data, permissions, orientation, locale, proxy configuration, and captured media according to policy.

An emulator created from a read-only golden snapshot can be discarded with the worker. A physical device needs a verified sanitation workflow and quarantine when cleanup fails. Do not return it to the pool after a failed reset merely because the CI job itself ended.

Browser tests should use a unique user-data directory or fresh browser context. A new Playwright browser context gives strong browser-level session isolation for cookies, local storage, and similar state, but it does not isolate host processes, downloads outside the context, proxy configuration, or code execution. Keep browser isolation nested inside worker isolation.

Hardware labs also need network separation. A test device with a development certificate or internal Wi-Fi route can be an access bridge. Treat the device and attached host as one security zone, and do not expose that zone to fork-controlled jobs.

## Make observability survive worker destruction

Ephemeral workers disappear precisely when operators need evidence. Stream runner logs to an external system, upload test reports and safe screenshots through the CI artifact mechanism, and collect provisioning events keyed by job ID. Redact tokens and avoid retaining customer data.

Record at least the immutable image identifier, worker ID, runner group, repository and commit, job ID, start and destruction times, network policy identity, credential issuance and revocation result, device lease if any, and teardown outcome. These facts let operators distinguish a test failure from an executor failure.

Set an alert for workers that remain after their job reaches a terminal state, volumes that outlive their owner, persistent offline runner registrations, and cleanup controllers with growing retry queues. Garbage collection is a safety net, not the primary lifecycle.

If log export fails, decide whether the pool should accept jobs. GitHub specifically recommends forwarding ephemeral runner application logs externally for troubleshooting. A production isolation design should not trade all diagnostic ability for disposability.

## Avoid the cleanup script fallacy

What people get wrong is treating \`git clean\` as runner isolation. It may remove untracked workspace files, but it cannot revoke copied credentials, stop arbitrary processes, unmount filesystems, remove scheduled tasks, undo network changes, reset devices, or prove the host was not modified outside the repository. Code running as the runner user can also sabotage the cleanup that follows it.

Another mistake is calling a container ephemeral while mounting the host workspace, engine socket, SSH directory, and device nodes. The container lifetime is short, yet its authority reaches long-lived state. Draw the privilege graph, not only the process tree.

Persistent runners can be acceptable for tightly trusted, specialized work, such as a fixed hardware bench, but acknowledge the residual risk. Use a dedicated account and host, one job at a time, strict repository allowlists, minimal network reach, no ambient secrets, per-job directories, process supervision, device reset verification, drift detection, and periodic rebuilds. If one job can modify the cleanup mechanism with equal privilege, the control is administrative hygiene rather than a hard security boundary.

| Claim | Evidence required |
|---|---|
| every job gets a new worker | unique worker identity and lifecycle event |
| disks are disposable | new volume ID and confirmed deletion |
| secrets are short-lived | issuance scope, expiry, and revocation record |
| network is restricted | enforced policy plus denied-path probe |
| caches cannot influence trusted jobs | writer/read scope and integrity validation |
| devices are clean | exclusive lease and reset attestation |
| cancellation tears down | canceled canary leaves no worker or namespace |

## Use a release checklist that can fail closed

Before enabling a repository on a self-hosted pool, review trust source, workflow permissions, runner-group authorization, image provenance, network routes, secret sources, cache policy, artifact data classification, and teardown. Run canaries for normal success, test failure, timeout, manual cancellation, and controller restart.

A job should fail closed when it cannot obtain a unique namespace, exclusive device, scoped credential, or verified clean worker. Quietly falling back to a shared tenant or different runner group converts an infrastructure incident into misleading test evidence.

Review queue behavior too. Ephemeral autoscaling needs a safe maximum, but an unavailable matching runner should not cause workflows to reroute to a broader privileged label. Capacity controls and isolation policy must agree.

Finally, rehearse compromise response. Operators should be able to stop scheduling, revoke runner registrations and issued identities, quarantine images and caches, identify jobs that ran on affected workers, rebuild the pool, and preserve logs. Isolation reduces blast radius, while response procedures address the possibility that a boundary fails.

## Frequently Asked Questions

### Are ephemeral self-hosted runners automatically secure?

No. Ephemeral lifetime removes much cross-job residue, but the worker can still have excessive network reach, powerful credentials, vulnerable images, privileged mounts, or an unsafe container-engine socket during its one job. Build the worker from a reviewed image, restrict repository access to the pool, issue minimal short-lived identity, segment the network, avoid host-control mounts, export logs, and destroy writable volumes. Ephemerality is the strongest lifecycle foundation, not a substitute for least privilege or supply-chain controls.

### Can a persistent runner be isolated well enough for QA hardware?

Sometimes, with explicitly accepted residual risk. Dedicate the host and account to one trusted workload class, prohibit untrusted pull requests, allow one job at a time, minimize network reach, create per-job workspaces and browser profiles, supervise child processes, verify device resets, and rebuild the host regularly. A cleanup script cannot form a hard boundary against code with equal host privilege. For a physical-device lab, treat exclusive device leasing and sanitation as separate from coordinator cleanup, and quarantine any device whose reset cannot be verified.

### Does running a job in Docker prevent state leakage?

It reduces ordinary process and filesystem leakage when every job receives a fresh container and writable layer. It does not isolate the kernel, and privileged mode, host path mounts, device access, persistent volumes, or a mounted container-engine socket can expose the host. Engine metadata and caches can also persist after the container exits. Combine a per-job container with an ephemeral host or a carefully evaluated sandbox for hostile workloads. Document every mount and capability, then use canary tests to verify the actual executor behavior.

### How can we prove runner cleanup works after cancellation?

Use a dedicated non-sensitive canary job that creates identifiable disposable state, then cancel it at controlled stages. The infrastructure test should verify that the runner deregisters, compute and writable volumes disappear, short-lived credentials are revoked, remote test namespaces are deleted, device leases return only after sanitation, and external logs remain available. Repeat during controller failure and restart scenarios. Do not rely on an \`afterEach\` step because cancellation may prevent it from running. The provisioning controller must own teardown independently of the test process.
`,
};
