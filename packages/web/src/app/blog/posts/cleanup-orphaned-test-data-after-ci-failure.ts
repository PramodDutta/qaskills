import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Clean Up Orphaned Test Data After CI Failures',
  description:
    'Clean up orphaned test data after cancelled or crashed CI jobs using ownership markers, leases, idempotent sweepers, retention windows, and safety guards.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Clean Up Orphaned Test Data After CI Failures

The test runner receives a cancellation signal halfway through creating an organization, three users, an object-store upload, and a search index entry. Its \`afterAll\` hook never completes. The next build encounters the same email address, while a nightly environment slowly fills with unreachable objects. Cleanup that depends exclusively on the process which created data cannot survive process death.

Reliable cleanup uses two paths. The fast path removes resources during normal teardown. The recovery path runs independently, finds expired resources by an unambiguous ownership marker, and deletes them idempotently after a safety window. Designing that marker and deletion boundary is more important than writing another \`finally\` block.

## Make every resource attributable

Before a test creates data, allocate a run identity. Include CI provider, pipeline ID, job ID, retry attempt, and a random suffix where parallel workers might collide. Store the canonical value in a searchable field, not only in a human-readable name that product code truncates.

| Store | Useful ownership location | Weak alternative |
|---|---|---|
| Relational database | \`test_run_id\` column or metadata JSON | Prefix buried in display name |
| Object storage | Object tags or a dedicated run prefix | Original filename only |
| Search index | Exact-match \`testRunId\` field | Tokenized description text |
| Message broker | Header plus run-specific queue/topic | Payload substring |
| External SaaS sandbox | Supported metadata or deterministic label | Creation timestamp alone |
| Kubernetes | Labels with run and expiry | Pod-name convention only |

A timestamp identifies age, not ownership. Production data can be old too. A name beginning with \`test-\` is insufficient when developers or fixtures can create similar names. Use a cryptographically unguessable run token or a signed marker if deletion endpoints are broadly reachable.

## Record a manifest as creation succeeds

Tag-based discovery is the recovery baseline, but a manifest makes cleanup precise and gives failure diagnostics. Append each successfully created resource immediately after receiving its identifier. Do not wait until the end of setup.

\`\`\`ts
import { appendFile, readFile } from 'node:fs/promises';

type Resource = {
  kind: 'organization' | 'user' | 'object';
  id: string;
  runId: string;
};

const manifestPath = process.env.CLEANUP_MANIFEST ?? '.test-resources.jsonl';

export async function remember(resource: Resource): Promise<void> {
  await appendFile(manifestPath, JSON.stringify(resource) + '\\n', 'utf8');
}

export async function readManifest(): Promise<Resource[]> {
  const text = await readFile(manifestPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  return text
    .split('\\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Resource);
}
\`\`\`

JSON Lines tolerates an interrupted final write better than repeatedly rewriting one large JSON array. For multi-process workers, give each worker its own manifest and merge artifacts later, or write to a transactional registry service. Concurrent appends to a shared file are not a portable coordination protocol.

Upload the manifest as a CI artifact with an \`always\` or non-cancelled condition when possible. It helps investigation, but the sweeper must not depend on artifact upload because hard termination can prevent that too.

## Teardown should be idempotent and dependency-aware

Deleting the same resource twice must be safe. Treat “not found” as success, while surfacing authentication, permission, rate-limit, and server errors. Delete children before parents unless the platform guarantees cascading cleanup that covers every external side effect.

\`\`\`ts
type CleanupClient = {
  deleteUser(id: string): Promise<Response>;
  deleteOrganization(id: string): Promise<Response>;
  deleteObject(id: string): Promise<Response>;
};

async function acceptDeleted(response: Response, label: string): Promise<void> {
  if (response.ok || response.status === 404) return;
  throw new Error(\`Could not delete \${label}: HTTP \${response.status}\`);
}

export async function cleanup(resources: Resource[], client: CleanupClient) {
  const rank = { object: 0, user: 1, organization: 2 } as const;
  const ordered = [...resources].sort((a, b) => rank[a.kind] - rank[b.kind]);

  const failures: string[] = [];
  for (const resource of ordered) {
    try {
      if (resource.kind === 'object') {
        await acceptDeleted(await client.deleteObject(resource.id), \`object \${resource.id}\`);
      } else if (resource.kind === 'user') {
        await acceptDeleted(await client.deleteUser(resource.id), \`user \${resource.id}\`);
      } else {
        await acceptDeleted(
          await client.deleteOrganization(resource.id),
          \`organization \${resource.id}\`,
        );
      }
    } catch (error) {
      failures.push(String(error));
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, 'cleanup incomplete');
}
\`\`\`

Continue after individual failures so one stuck object does not prevent every independent deletion. Preserve all failures. Blindly swallowing teardown errors converts operational debt into future test flakiness.

## A lease separates active from abandoned

Age-based sweepers can delete data belonging to a long-running job. A lease makes liveness explicit. The test run creates a registry record with \`expires_at\` and renews it periodically. Normal completion marks the run complete and performs immediate cleanup. A recovery worker only claims expired runs.

| Run state | Lease | Sweeper action |
|---|---|---|
| Starting | Not expired | Leave resources alone |
| Active | Heartbeat extends expiry | Ignore |
| Finished and clean | Terminal, manifest empty | Retain audit briefly, then purge registry |
| Finished but cleanup failed | Terminal, resources remain | Retry deletion |
| Job crashed | Expired | Claim and sweep after grace period |
| Sweeper working | Cleanup lock held | Other sweepers skip |

Use database time for lease decisions when possible, avoiding skew between runner clocks. The lease duration must exceed normal heartbeat jitter and temporary network loss. The grace period should cover delayed CI jobs and investigation needs without permitting unlimited accumulation.

## Claim work before deleting

Two scheduled sweepers may overlap. Claim an expired run atomically with a lock owner and lock expiry, or use row locking supported by the registry database. Deletion remains idempotent, but claims reduce duplicate calls and rate-limit pressure.

\`\`\`sql
UPDATE test_run_registry
SET cleanup_owner = $1,
    cleanup_lock_until = NOW() + INTERVAL '10 minutes'
WHERE run_id = $2
  AND expires_at < NOW()
  AND status IN ('active', 'cleanup_failed')
  AND (cleanup_lock_until IS NULL OR cleanup_lock_until < NOW())
RETURNING run_id, environment, manifest;
\`\`\`

The sweeper must verify the environment encoded in the registry. Credentials for a QA environment should be incapable of deleting production data. Defense in depth includes separate accounts, separate projects or buckets, scoped IAM, and an explicit allowlist in the cleanup program.

## CI hooks are fast paths, not guarantees

GitHub Actions \`if: always()\`, GitLab \`when: always\`, shell traps, and runner teardown hooks improve ordinary failure cleanup. They still cannot execute after a machine disappears, a process is force-killed, credentials expire, or the CI control plane cancels pending steps.

\`\`\`yaml
test:
  stage: test
  script:
    - node scripts/register-run.mjs
    - npm test
  after_script:
    - node scripts/cleanup-manifest.mjs
  artifacts:
    when: always
    paths:
      - .test-resources.jsonl
    expire_in: 7 days
\`\`\`

GitLab's \`after_script\` is valuable, but recovery still belongs to an independent schedule. Test cancellation semantics in the actual runner version and executor because graceful termination timing varies.

The [test data management strategies guide](/blog/test-data-management-strategies) helps decide when disposable environments, synthetic tenants, or shared sandboxes are appropriate before cleanup is added.

## Deleting by query needs guardrails

Sometimes an external service cannot store a manifest-friendly ID, so the sweeper queries by marker. Apply all of these checks before bulk deletion:

1. Marker matches the exact test-run format.
2. Resource environment equals an approved non-production value.
3. Creation time is older than the grace cutoff.
4. Registry lease is expired or terminal.
5. Maximum deletion count per run is below a circuit-breaker threshold.
6. Dry-run output is logged before destructive mode.
7. The service account cannot access unrelated tenants.

A circuit breaker should halt and alert, not delete the first thousand matches because the query returned more than expected. Paginated APIs require stable iteration. Deleting while using offset pagination can skip records as the result set shrinks; use cursors documented to tolerate deletion or collect IDs first.

## External systems dictate deletion order

A single test entity can fan out into systems with different consistency models. Disable asynchronous producers before deleting their outputs, otherwise a background consumer can recreate an index document after the database row is gone.

| Resource relationship | Safer sequence | Verification |
|---|---|---|
| Scheduled job creates messages | Cancel schedule, drain run messages | No pending messages with run ID |
| Database row indexes to search | Stop or tombstone source, remove index | Query both stores |
| Parent owns object uploads | Abort multipart sessions, delete objects, delete parent | List prefix returns empty |
| User belongs to tenant | Delete sessions and users, then tenant | Auth lookup and tenant lookup fail |
| Webhooks target test receiver | Disable subscription, delete queued deliveries | No delivery after cutoff |

Eventual consistency means “delete returned 204” may not equal “resource is no longer discoverable.” Poll the read paths that affect later tests, using a bounded deadline. Do not sleep an arbitrary fixed duration.

## Prefer expiration where the platform supports it

TTL columns, bucket lifecycle rules, ephemeral namespaces, and expiring sandbox resources provide another recovery layer. They are not substitutes for prompt teardown because expiry may take hours and linked systems may not share the same lifecycle. They are excellent last-resort containment.

Set lifecycle rules only on dedicated test prefixes or buckets. A broad “delete objects older than seven days” rule is dangerous in a mixed bucket. Validate the rule by creating a short-lived canary in a safe environment and monitoring deletion.

For infrastructure that is itself disposable, [Testcontainers best practices](/blog/testcontainers-best-practices-2026) can eliminate many shared-state cleanup problems. Containers do not automatically clean external SaaS resources, cloud objects, or data sent to a persistent service.

## Test the cleanup system as a product

Do not wait for a real cancellation. Build controlled failure drills:

\`\`\`ts
import { expect, it, vi } from 'vitest';

it('retries an expired run and preserves undeleted resources', async () => {
  const client = {
    deleteUser: vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })),
    deleteOrganization: vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    deleteObject: vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
  };
  const manifest: Resource[] = [
    { kind: 'object', id: 'obj-1', runId: 'run-8' },
    { kind: 'user', id: 'user-1', runId: 'run-8' },
    { kind: 'organization', id: 'org-1', runId: 'run-8' },
  ];

  await expect(cleanup(manifest, client)).rejects.toThrow('cleanup incomplete');
  await expect(cleanup(manifest, client)).resolves.toBeUndefined();
  expect(client.deleteObject).toHaveBeenCalledTimes(2);
});
\`\`\`

At integration level, terminate a worker after resource creation, allow its lease to expire in a shortened test configuration, invoke the real sweeper, and verify every store. Also test an active heartbeat so the sweeper proves it will not delete live data.

## Monitor backlog rather than celebrating successful invocations

Useful cleanup signals include count and age of expired runs, resources remaining by kind, deletion failures by service, sweep duration, circuit-breaker activations, and oldest orphan. “Cron executed successfully” is weak if every deletion returned a permission error that code logged and ignored.

Alert on sustained backlog and age, with thresholds derived from environment capacity and retention policy. Keep audit records long enough to connect a deletion to its CI run, then expire the audit separately so the registry does not become the next orphan problem.

## A safe operational design

The mature flow is:

1. Register a run with environment, owner, commit, and lease.
2. Mark every created resource with the run ID and append it to a manifest.
3. Renew the lease while tests remain active.
4. Attempt dependency-aware cleanup in normal teardown.
5. Mark complete only after verification, not merely after sending delete calls.
6. Let a separately credentialed sweeper claim expired or failed runs.
7. Apply environment, age, ownership, and count guards before deletion.
8. Retry idempotently and expose any remaining resources.

This design accepts that CI processes die. It moves recovery from wishful teardown into an auditable lifecycle with ownership and expiry.

## Transactions and isolated tenants reduce the cleanup surface

Database setup can often run in a transaction and roll back if fixture creation fails. Browser tests spanning service requests cannot usually keep that transaction open, and external services cannot join it. Treat transactions as one containment layer, not universal recovery.

| Technique | Survives runner death | External resources | Primary value |
|---|---|---|---|
| Transaction rollback | Connection cleanup may roll back | No | Atomic database fixture setup |
| Per-run database schema | Yes, with independent dropper | No | Strong relational isolation |
| Dedicated product tenant | Yes, if deletion cascades correctly | Sometimes | Product-level boundary |
| Manifest plus sweeper | Yes | Yes through adapters | Cross-system recovery |
| Randomized names | Leaves everything behind | No | Collision avoidance only |

Random names do not constitute cleanup. A provisioning endpoint that creates a complete scenario atomically can improve consistency, but it must record compensating work if an external side effect succeeds before the operation fails.

## Protect cleanup in forked pipelines

Untrusted pull requests should not receive broad deletion credentials. If they can create sandbox data, route creation through a broker that records ownership and let a trusted independent sweeper delete it. Keep destructive credentials outside fork jobs.

An old pipeline's delayed cleanup must not delete a newer run's reused fixture. Check the resource's current run marker or version immediately before deletion. Conditional deletes are preferable when supported. A stable display name never proves current ownership.

## Drill failures at specific checkpoints

Terminate a test worker after registry creation, after the first child record, during object upload, after publishing a message, and halfway through ordinary teardown. For every checkpoint, verify lease expiry, atomic sweeper claim, dependency-aware deletion, and harmless repeated cleanup.

Inject partial service outages too. If object deletion returns 503 after the database row disappears, keep the object in the manifest and mark the run \`cleanup_failed\`. A later attempt must retry outstanding work without requiring the parent row. This is why the cleanup registry cannot live only inside the tenant it deletes.

Separate product-data deletion from audit retention. Retain minimal run identity, timestamps, counts, and error codes for operations, then expire that audit on its own schedule. Avoid preserving payloads solely to explain sweeper metrics.

## Put deletion adapters under contract tests

Every sweeper adapter should classify the external service's outcomes consistently: deleted, already absent, retryable failure, permanent authorization failure, and rate limited with a retry hint. Test pagination, batch partial success, and credential expiry. An adapter that treats every non-2xx as retryable can loop forever on a forbidden resource, while one that treats 429 as permanent strands data unnecessarily.

Bound retry attempts within one invocation and release the cleanup claim before its lock expires. Persist the next eligible attempt time with jitter so many expired runs do not hammer a recovering service simultaneously. Keep the oldest orphan visible even when newer runs clean successfully.

## Measure resource debt by kind and age

A single “orphan count” hides costly objects behind cheap rows. Report outstanding database tenants, object bytes, index documents, queues, and external accounts separately. Age buckets reveal whether the sweeper is merely keeping pace with new failures while one permanent orphan remains untouched.

Reconcile the registry against discovery queries periodically. A manifest can be lost before creation is recorded, and a resource marker can be malformed. The reconciliation job should report unmatched test-marked resources for review, not immediately delete them through a looser rule. Promote a safe discovery rule only after examining false matches.

Document an emergency stop and manual recovery procedure. Operators need to disable destructive runs, inspect the dry-run set, rotate credentials, and resume from retained manifests. Automation without a controlled stop becomes dangerous precisely when a query or environment variable is wrong.

## Frequently Asked Questions

### Is an \`afterAll\` or \`after_script\` hook enough?

No. It handles ordinary assertion failures but cannot run reliably after hard termination, runner loss, or some cancellations. Keep it for fast cleanup and add an independent lease-based recovery sweep.

### How long should the orphan grace period be?

Choose a period longer than the maximum expected job duration, heartbeat interruption, and CI scheduling delay, then align it with environment capacity. There is no universal value. Active leases are safer than age alone.

### Should a 404 during cleanup fail the job?

Usually treat not found as successful idempotent deletion. The resource may already have been removed by teardown, a retry, or cascade. Authentication, authorization, throttling, and server failures should remain visible.

### Can I delete everything with a \`test-\` name prefix?

That is too weak for automated destruction. Require an exact run marker, non-production environment, expired lease, age cutoff, scoped credentials, and a deletion-count circuit breaker.

### What if the external API offers no tags or metadata?

Store returned IDs in a durable run registry as creation succeeds. If IDs can be lost before recording, isolate tests in a dedicated account and use a deterministic, exact naming scheme plus conservative age and count guards for discovery.
`,
};
