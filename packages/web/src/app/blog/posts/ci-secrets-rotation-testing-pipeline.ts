import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CI Secrets Rotation Testing Pipeline: How to Prove Rotation Without Leaking Values',
  description: 'Build a ci secrets rotation testing pipeline that validates old and new credentials, catches stale consumers, and prevents secret leaks in logs.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# CI Secrets Rotation Testing Pipeline: How to Prove Rotation Without Leaking Values

A ci secrets rotation testing pipeline proves that credentials can move from old value to new value without breaking deployments, leaving stale consumers behind, or leaking the secret during verification. Rotation is not complete when somebody updates a value in GitHub Actions, GitLab CI, Vault, a cloud secret manager, or a Kubernetes Secret. Rotation is complete when every consumer uses the new credential, the old credential is rejected or revoked, and CI evidence shows the transition happened safely.

QA engineers are well suited to own the test design because secret rotation is a release workflow with hidden failure modes. The application may pass unit tests while a scheduled job still uses an old API key. A deployment may succeed while a rollback points at a revoked database password. A debug log may print the first characters of a token during a failed smoke test. The pipeline must test behavior, not expose values.

For teams using AI coding agents, this topic deserves extra discipline. Agents can add helpful diagnostics that accidentally echo environment variables, write temporary secrets to artifacts, or hard-code placeholders into test fixtures. A ci secrets rotation testing pipeline should constrain what agents generate: no secret values in code, no token previews in logs, and no assertions that require printing sensitive material.

## Define rotation as a contract, not a ticket

Treat each secret as a contract with producers, consumers, allowed overlap, and revocation evidence. A ticket that says "rotate Stripe key" or "rotate database password" is too vague for QA. The testable version states which systems should accept the new credential, whether the old credential remains valid during a grace window, and what observable signal proves a consumer moved.

| Contract field | Example | Test implication |
|---|---|---|
| Secret name | \`PAYMENTS_API_KEY\` | Identify every CI and runtime consumer |
| Owner | Payments platform team | Know who can revoke and debug |
| Rotation mode | Dual-write overlap for 24 hours | Test old and new during overlap, then old rejection |
| Consumer list | API, worker, nightly reconciliation job | Build smoke checks for each path |
| Leak policy | No value, prefix, suffix, or hash in logs | Scan logs and artifacts |
| Rollback rule | Previous deployment must receive current secret alias | Test rollback before revocation |

This contract should live near infrastructure code or a runbook. Do not make CI guess. The pipeline should consume metadata such as the secret name, owning service, and validation command, then produce evidence that a reviewer can understand without seeing the secret.

## Separate value validation from value disclosure

The central testing challenge is proving a secret works without revealing it. Avoid printing values, prefixes, suffixes, base64 forms, hashes, or "masked" previews. Masking systems are useful, but they are not a license to echo credentials. Logs, artifacts, screenshots, and test reports may be copied into systems with different access controls.

A safe validation command uses the secret to perform a minimal operation and prints only a result label. For an API key, that might be a call to a test endpoint. For a database password, it might be a connection and read-only query. For a webhook signing secret, it might be verifying a local fixture signature. The command returns zero on success and nonzero on failure.

\`\`\`ts
type SecretProbeResult = {
  name: string;
  consumer: string;
  ok: boolean;
  checkedAt: string;
};

export async function probePaymentsKey(): Promise<SecretProbeResult> {
  const apiKey = process.env.PAYMENTS_API_KEY;
  if (!apiKey) {
    return {
      name: 'PAYMENTS_API_KEY',
      consumer: 'payments-api',
      ok: false,
      checkedAt: new Date().toISOString(),
    };
  }

  const response = await fetch('https://payments.example.test/health/key', {
    headers: { authorization: 'Bearer ' + apiKey },
  });

  return {
    name: 'PAYMENTS_API_KEY',
    consumer: 'payments-api',
    ok: response.ok,
    checkedAt: new Date().toISOString(),
  };
}
\`\`\`

The result object does not include the key or any transformation of it. If you need correlation, use a non-secret key version identifier from the secret manager, not a derived value from the secret itself.

## Model the rotation states explicitly

Most rotation failures happen because the team does not name the states. There is a before state, an overlap state, a cutover state, and a revoked state. Each state has different expected results.

| State | Old secret | New secret | Expected tests |
|---|---|---|---|
| Before rotation | Accepted | Not configured | Baseline consumers pass |
| Overlap | Accepted | Accepted | Both versions work where dual acceptance is designed |
| Cutover | Not used by consumers | Accepted | All consumers prove new path |
| Revoked | Rejected | Accepted | Old credential fails safely |

Do not skip the revoked-state test. A rotation that leaves the old credential valid forever is not a rotation. It is credential duplication.

For a service that can accept two webhook signing secrets during overlap, the test should be table-driven:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { verifyWebhook } from './webhook-verifier';
import { signFixture } from './webhook-test-signing';

describe('webhook secret rotation states', () => {
  it.each([
    ['old secret during overlap', 'old', true],
    ['new secret during overlap', 'new', true],
    ['unknown secret during overlap', 'unknown', false],
  ])('%s', async (_name, keyName, expected) => {
    const fixture = await signFixture({ keyName });
    await expect(verifyWebhook(fixture)).resolves.toBe(expected);
  });
});
\`\`\`

After revocation, change the fixture expectations so old signatures fail. Keep the state transition obvious in commit history and test names.

## Build a consumer matrix before touching CI variables

Secret rotation breaks when hidden consumers exist. CI jobs, scheduled tasks, one-off scripts, preview environments, smoke tests, and rollback workflows may all read the same credential. Build a matrix and make it part of the pipeline.

| Consumer | Runtime | Validation method | Rotation risk |
|---|---|---|---|
| Web API | Production deployment | Authenticated health probe | New deployment misses updated env |
| Worker | Queue consumer | Test job processes synthetic event | Background process still uses old secret |
| Scheduled reconciliation | CI cron or scheduler | Dry-run command | Schedule has separate variable store |
| Preview environment | Pull-request deployment | Smoke test with test tenant | Preview inherits stale secret |
| Rollback release | Previous artifact | Rollback smoke test | Old artifact expects removed variable name |

The validation method should be specific. "Run smoke tests" is too broad. "Process a synthetic queue event using the current secret alias and assert a non-sensitive success marker" is testable.

\`\`\`json
{
  "secrets": [
    {
      "name": "PAYMENTS_API_KEY",
      "owner": "payments-platform",
      "consumers": [
        { "id": "web-api", "probe": "npm run probe:payments:web" },
        { "id": "worker", "probe": "npm run probe:payments:worker" },
        { "id": "reconciliation", "probe": "npm run probe:payments:reconcile" }
      ]
    }
  ]
}
\`\`\`

Store metadata like this without values. The pipeline reads the matrix, runs probes, and reports which consumer failed. That is enough to route the incident without leaking a credential.

## Pipeline stages for safe rotation evidence

A robust CI pipeline has five stages:

1. Preflight: confirm required secret names exist in the environment without printing values.
2. New credential probe: prove the new credential works in a safe test operation.
3. Consumer probe: prove each listed consumer can perform its minimal behavior.
4. Leak scan: inspect logs and artifacts for forbidden patterns and accidental env dumps.
5. Revocation probe: after cutover, prove old credential no longer works.

A GitHub Actions skeleton can look like this:

\`\`\`yaml
name: secret-rotation-validation

on:
  workflow_dispatch:
  schedule:
    - cron: '17 3 * * *'

jobs:
  validate-rotation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - name: Preflight secret names
        run: npm run secrets:preflight
      - name: Probe consumers
        run: npm run secrets:probe-consumers
      - name: Scan generated logs
        run: npm run secrets:scan-logs
\`\`\`

The schedule is not a replacement for manual rotation evidence. It is drift detection. It tells you whether a secret-dependent path silently broke after a deployment or infrastructure change.

For GitLab CI, keep artifacts useful but non-sensitive:

\`\`\`yaml
secret_rotation_validation:
  image: node:22
  script:
    - npm ci
    - npm run secrets:preflight
    - npm run secrets:probe-consumers
    - npm run secrets:scan-logs
  artifacts:
    when: always
    reports:
      junit: reports/secret-rotation-junit.xml
    paths:
      - reports/secret-rotation-summary.json
\`\`\`

The summary should contain secret names, consumer ids, timestamps, and pass-fail status. It should not contain values, partial values, encoded values, or request headers.

## Preflight checks should verify presence without echoing values

The preflight step catches missing variables and misnamed secrets. It should never print the value. It can print the variable name and whether it is present.

\`\`\`ts
const required = [
  'PAYMENTS_API_KEY',
  'PAYMENTS_WEBHOOK_SECRET',
  'RECONCILIATION_DB_PASSWORD',
];

const missing = required.filter((name) => !process.env[name]);

for (const name of required) {
  console.log(name + ': ' + (process.env[name] ? 'present' : 'missing'));
}

if (missing.length > 0) {
  console.error('Missing required secrets: ' + missing.join(', '));
  process.exit(1);
}
\`\`\`

This is safe because it prints only names and state. Do not add convenience output such as length, prefix, suffix, or decoded JSON claims. Length can reveal useful information for some secrets, and decoded claims may include account identifiers.

## Leak scanning must include artifacts, not only stdout

Secret leaks often appear outside the main log. Test reports, HTTP trace files, screenshots, debug JSON, failed request dumps, and dependency tool output can all capture sensitive headers. A pipeline that validates rotation should scan the files it creates.

The safest rule is to avoid collecting sensitive data in the first place. The second rule is to scan for known dangerous output patterns: full environment dumps, authorization headers, cookie headers, private key markers, and accidental token labels. Pattern scanning does not prove absence, but it catches common mistakes.

\`\`\`ts
import fs from 'node:fs';
import path from 'node:path';

const forbiddenPhrases = [
  'Authorization:',
  'authorization:',
  'Cookie:',
  'Set-Cookie:',
  'BEGIN PRIVATE KEY',
  'PAYMENTS_API_KEY=',
  'PAYMENTS_WEBHOOK_SECRET=',
];

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const reportFiles = fs.existsSync('reports') ? walk('reports') : [];
const offenders = reportFiles.filter((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return forbiddenPhrases.some((phrase) => text.includes(phrase));
});

if (offenders.length > 0) {
  console.error('Potential secret material found in generated reports:');
  for (const file of offenders) console.error(file);
  process.exit(1);
}
\`\`\`

This example avoids regex so it is easy to audit in a template-literal article and easy for teams to customize. In a real repository, extend it with your secret-scanning tool of choice and make sure generated artifacts are included.

## Revocation tests prove the old credential is actually dead

A rotation pipeline without old-secret rejection can produce false comfort. During overlap, both old and new credentials may pass. After cutover, every consumer should use the new credential. After revocation, the old credential should fail in a controlled probe. That failure is success.

The old credential should be stored only in a tightly controlled validation context during revocation testing, and removed afterward. Do not keep a permanent "old secret" variable around because it becomes another secret to rotate.

\`\`\`ts
type Probe = {
  label: string;
  token: string | undefined;
  expected: 'accepted' | 'rejected';
};

async function callProbe(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const response = await fetch('https://payments.example.test/health/key', {
    headers: { authorization: 'Bearer ' + token },
  });
  return response.ok;
}

const probes: Probe[] = [
  { label: 'new credential', token: process.env.PAYMENTS_API_KEY, expected: 'accepted' },
  { label: 'old credential', token: process.env.PAYMENTS_API_KEY_OLD_FOR_REVOCATION_TEST, expected: 'rejected' },
];

for (const probe of probes) {
  const accepted = await callProbe(probe.token);
  if (probe.expected === 'accepted' && !accepted) throw new Error(probe.label + ' was rejected');
  if (probe.expected === 'rejected' && accepted) throw new Error(probe.label + ' was still accepted');
  console.log(probe.label + ': ' + probe.expected);
}
\`\`\`

Notice that the output prints labels and expected states, not values. If this test fails because the old credential is accepted, the rotation should remain open until revocation is complete.

## Rollback is part of the secret test, not an afterthought

Rotation can break rollback in two ways. First, the previous application version may expect the old variable name. Second, the previous version may not understand dual-secret validation. If you revoke the old credential immediately after a successful deploy, then roll back to an artifact that still needs it, the rollback can fail during an incident.

Before revocation, test rollback compatibility in a staging or preview environment. The rollback does not need to process production data. It needs to prove the previous artifact starts, reads the current secret alias, and completes a minimal probe. If it cannot, either delay revocation until rollback risk expires or prepare a forward-only recovery plan.

| Rollback question | Evidence to collect | Failure response |
|---|---|---|
| Does previous artifact start with new secret names? | Deployment smoke result | Add compatibility env alias |
| Does previous verifier accept overlap state? | Synthetic request result | Delay revocation or patch previous release |
| Are old secrets required for rollback? | Config diff | Keep controlled overlap until rollback window closes |
| Are rollback logs clean? | Artifact scan | Remove debug output before release |

This is where CI cost can grow. If end-to-end jobs pile up on every commit, use stale-run cancellation for long smoke suites. The pattern described in [cancel stale E2E runs on new commit](/blog/ci-cancel-stale-e2e-runs-on-new-commit) keeps rotation validation from competing with obsolete pipeline runs.

## What people get wrong about testing secret rotation

The first mistake is testing that a variable exists and calling that rotation. Presence is only preflight. It does not prove the value works, every consumer uses it, or the old value is revoked.

The second mistake is printing too much during failure diagnosis. A developer adds \`console.log(process.env)\` to understand CI, and the log becomes the incident. Rotation tests should be boring and non-revealing under failure.

The third mistake is ignoring scheduled and background consumers. Web smoke tests pass while the nightly reconciliation job fails three days later. Every secret contract needs a consumer matrix.

| Mistake | Symptom | Better control |
|---|---|---|
| Presence-only validation | Rotation passes with wrong value | Run a minimal authenticated probe |
| Secret previews in logs | Masking hides some but not all output | Never print values or derivatives |
| No revoked-state test | Old credential remains valid | Add explicit old-secret rejection evidence |
| Missing consumer inventory | Background jobs break later | Maintain a probe matrix |
| No rollback validation | Incident rollback fails | Test previous artifact before revocation |

## Reporting results for auditors and engineering teams

A good rotation report is useful without being sensitive. It should show who owns the secret, which consumers were checked, when each probe ran, and whether the old credential was rejected after revocation. It should include links to CI jobs and deployment versions, but not request headers or values.

\`\`\`json
{
  "rotationId": "payments-api-key-2026-08",
  "checkedAt": "2026-08-07T03:17:00.000Z",
  "secretName": "PAYMENTS_API_KEY",
  "owner": "payments-platform",
  "consumers": [
    { "id": "web-api", "status": "passed" },
    { "id": "worker", "status": "passed" },
    { "id": "reconciliation", "status": "passed" }
  ],
  "oldCredentialRevoked": true,
  "leakScan": "passed"
}
\`\`\`

If your CI publishes JUnit, map each consumer probe to a test case. That makes failures visible in merge requests and historical reports. The same reporting habits used for [GitLab CI JUnit flaky test reporting](/blog/gitlab-ci-junit-report-flaky-tests) help here: named cases, retained artifacts, and enough metadata to distinguish product failure from infrastructure failure.

## Agent guardrails for rotation work

When asking an AI coding agent to help with secret rotation, constrain its output. Tell it not to print environment variables, not to create files containing secret values, and not to add broad debug logging. Ask for probes that return pass-fail status only. Ask for tests that scan artifacts.

A useful prompt:

\`\`\`text
Add a secret rotation validation workflow for PAYMENTS_API_KEY.

Do not print, hash, truncate, encode, or store the secret value.
Create probes for web-api, worker, and reconciliation consumers.
The workflow should fail if a required secret is missing, a consumer probe fails,
generated reports include authorization headers, or the old credential is still
accepted during the revoked-state check.
\`\`\`

Review the generated diff for accidental disclosure paths. Look at logs, artifacts, error messages, snapshots, and helper scripts. Secret safety is a property of the whole workflow, not only the place where the credential is read.

## A rollout plan for real teams

Start with one secret that has clear ownership and a safe probe. Build the metadata file, preflight, consumer probe, and leak scan. Run it manually during the next planned rotation. After the team trusts the evidence, add a scheduled drift check. Then expand to secrets with more consumers.

Do not automate revocation before people understand the failure modes. It is reasonable for the first version to produce evidence and require a human owner to revoke. Later, mature teams can connect the pipeline to secret-manager APIs with approvals and audit logs.

Keep the scope small enough that failures are diagnosable. A single job that validates 80 unrelated secrets will become noisy. Group secrets by owner and system. Make each report answer one operational question: "Can this credential rotate safely now?"

## Rehearse rotation in a non-production lane first

The first time a team tests rotation should not be during an emergency credential leak. Create a non-production lane that uses the same mechanics as production: the same variable names, the same deployment path, the same consumer probes, and the same report format. The values can be test-only, but the workflow should match reality closely enough to expose missing consumers and unsafe logging before pressure is high.

A rehearsal has three outputs. First, it proves the pipeline can distinguish old, new, overlap, and revoked states. Second, it measures how long each stage takes so the team can plan a real rotation window. Third, it gives reviewers a sample report that can be checked for accidental disclosure. Treat the rehearsal report as a test artifact and inspect it manually the first few times.

| Rehearsal step | What it proves | Common surprise |
|---|---|---|
| Create test-only old and new credentials | Rotation metadata can represent both versions | Secret names differ from production convention |
| Run overlap probes | Consumers tolerate planned dual acceptance | One worker reads a separate variable store |
| Deploy cutover candidate | New value reaches runtime | Preview and production use different injection paths |
| Scan reports and logs | Evidence is non-sensitive | HTTP client dumps headers on failure |
| Revoke old test credential | Rejection probe works | Old value remains accepted by a cache |

Use the rehearsal to tune timeouts and ownership. If the worker probe takes ten minutes because it waits for a scheduled loop, add a direct synthetic event path. If revocation evidence depends on a person clicking through a console, document the handoff and add the timestamp to the report. The goal is not to remove humans from the process immediately. The goal is to make each human decision visible and testable.

\`\`\`json
{
  "rotationId": "payments-api-key-rehearsal",
  "environment": "staging",
  "state": "revoked",
  "consumerProbeSeconds": 92,
  "leakScan": "passed",
  "manualApproval": {
    "step": "revoke-old-test-credential",
    "recorded": true
  }
}
\`\`\`

After the rehearsal, update the runbook with the failures you actually saw. Generic rotation docs rarely mention your odd scheduled job, your preview deployment exception, or your rollback alias. The rehearsal turns those local facts into test cases.

## Handle secret versions and aliases deliberately

Many secret managers support versions, labels, aliases, or staged values. Even when the exact product differs, the testing concept is the same: consumers should read the intended current version, not a hard-coded historical version. Rotation fails quietly when a deployment pins a version id for stability and nobody moves it during cutover.

QA can test this without reading secret values. Expose a non-sensitive version label through deployment metadata or a controlled health endpoint. The endpoint should never return the secret. It can return the configured alias name, the deployment revision, and whether the credential probe passed. If returning version metadata is not acceptable in your threat model, collect the same information as a restricted CI artifact.

\`\`\`ts
type SecretRuntimeMetadata = {
  consumer: string;
  secretName: string;
  configuredAlias: 'current' | 'next';
  probeStatus: 'passed' | 'failed';
};

export function assertCurrentAlias(metadata: SecretRuntimeMetadata): void {
  if (metadata.configuredAlias !== 'current') {
    throw new Error(metadata.consumer + ' is not using the current secret alias');
  }
  if (metadata.probeStatus !== 'passed') {
    throw new Error(metadata.consumer + ' failed its secret probe');
  }
}
\`\`\`

This test catches stale consumers that still point at \`next\` after cutover or a historical version after rollback. It also gives developers a safe diagnostic target. They can inspect aliases and probe status without seeing the credential.

## Diagnose partial rotation with timeline evidence

The hardest rotation failures are partial. The web API uses the new value, the worker still uses the old value, and the reconciliation job fails only at 2 a.m. A single pass-fail status hides this pattern. Add timeline evidence that records when each consumer last proved the current credential.

The report can stay non-sensitive:

\`\`\`json
{
  "secretName": "PAYMENTS_API_KEY",
  "currentAliasActivatedAt": "2026-08-07T02:00:00.000Z",
  "consumers": [
    { "id": "web-api", "lastCurrentProbe": "2026-08-07T02:04:12.000Z" },
    { "id": "worker", "lastCurrentProbe": "2026-08-07T02:05:30.000Z" },
    { "id": "reconciliation", "lastCurrentProbe": null }
  ]
}
\`\`\`

When a consumer has no current probe, treat rotation as incomplete. Do not assume absence means the job has not run yet unless the runbook explicitly allows a delayed check. If a scheduled job cannot be probed on demand, the rotation window must account for that delay or the job must gain a safe dry-run mode.

Timeline evidence is also useful after incidents. It answers when the new credential became usable, when each consumer moved, and when the old credential was rejected. That is exactly the information engineering leaders and auditors ask for after a secret event.

## Keep human approvals narrow and auditable

Some rotations should not be fully automatic. Production database passwords, payment provider credentials, and incident-driven revocations may require human approval. That does not weaken the testing pipeline if the approval is narrow. Humans should approve a clearly named transition, such as "revoke old payments API key after all probes passed", not manually interpret raw logs.

| Approval point | Automated evidence before approval | Automated evidence after approval |
|---|---|---|
| Enter overlap | New credential probe passed | Both old and new accepted where expected |
| Cut over consumers | All deployment probes passed | Consumers report current alias |
| Revoke old value | Rollback risk accepted or expired | Old credential rejection passed |
| Close rotation | Leak scan passed | Final report archived |

This separation keeps the workflow accountable. CI gathers evidence, humans approve risk transitions, and CI verifies the result. No person needs to paste a secret into a chat thread or issue comment to prove progress.

## Frequently Asked Questions

### What should a ci secrets rotation testing pipeline prove?

It should prove that required secret names exist, the new credential works for each listed consumer, generated logs and artifacts do not expose sensitive material, rollback remains possible during the overlap window, and the old credential is rejected after revocation. Presence checks alone are not enough. The pipeline needs behavioral probes and evidence that can be reviewed without revealing values.

### Is it safe to test old credentials in CI?

It can be safe if the old credential is available only in a controlled revocation test, never printed, and removed after validation. Do not keep permanent old-secret variables around for convenience. During overlap, tests may prove both old and new credentials work where dual acceptance is intended. After revocation, the old credential should fail. Treat the old value as sensitive until it is destroyed.

### How do we avoid leaking secrets during failed tests?

Design probes so they print only secret names, consumer ids, timestamps, and pass-fail status. Do not print values, prefixes, suffixes, hashes, decoded payloads, request headers, cookies, or environment dumps. Add a leak-scan step over generated reports and artifacts. Review AI-generated debugging code carefully because convenience logs are a common disclosure path during CI troubleshooting.

### Should rotation validation block every pull request?

Usually no. Preflight and consumer probes can run on infrastructure changes, scheduled workflows, and manual rotation workflows. Some lightweight checks may run on pull requests touching secret-consuming code. Full revocation validation belongs to the rotation event itself because it depends on external credential state. Keep the feedback tied to the risk: fast checks for code changes, complete evidence for planned rotations.
`,
};
