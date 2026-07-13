import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Application Behavior During Read-Replica Lag',
  description:
    'Test application behavior during read-replica lag with paused PostgreSQL replay, read-after-write routing, stale-state assertions, fallback, and recovery checks.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing Application Behavior During Read-Replica Lag

The update commits on the primary, the API returns success, and the next GET shows the old email address. Nothing is corrupt: the read was routed to a replica that has not replayed the commit yet. To the user, though, a successful save appears to have been discarded.

Replica lag tests should create that exact visibility gap on demand. Random sleeps and overloaded CI databases are poor substitutes. With a PostgreSQL physical standby, \`pg_wal_replay_pause()\` freezes replay while the primary continues accepting writes. The test can then verify stale-read handling, primary fallback, session stickiness, and recovery before calling \`pg_wal_replay_resume()\`.

## Define the consistency promise before building the fault

Not every read needs the latest committed value. A product catalog may tolerate seconds-old descriptions, while a password change confirmation, permission update, or just-created resource usually needs read-your-writes behavior. Classify endpoints by user promise instead of applying a global “replicas are eventually consistent” disclaimer.

| Read category | Example | Acceptable behavior during lag | Unacceptable outcome |
|---|---|---|---|
| Read-after-write | GET profile immediately after PATCH | Primary read, session pin, or version-aware retry | Showing the previous value as if save failed |
| Security-sensitive | Authorization after role revocation | Consult authoritative primary or deny safely | Replica grants a revoked capability |
| Aggregate browsing | Daily analytics dashboard | Display timestamp or bounded staleness | Claiming data is real time when it is not |
| Resource discovery | Follow redirect to newly created order | Route by write token or fall back on not-found | Transient 404 presented as permanent |
| Background reconciliation | Worker scans pending rows | Designed delay may be fine | Duplicate irreversible action from stale status |
| Cacheable reference data | Country list | Replica read is normally fine | Complex primary fallback adds no user value |

Write the contract in observable terms. “Strong consistency” is too broad. “For 30 seconds after this session changes its profile, its reads go to the primary” is testable. “If replica replay position is behind the write token, query primary” is even more precise.

The [database testing automation guide](/blog/database-testing-automation-guide) covers schema isolation and transaction strategies. Lag scenarios differ because two database servers intentionally disagree for a bounded period; rolling every test into a single transaction can hide that behavior.

## Observe lag by WAL position, not wall-clock guessing

PostgreSQL primary and standby expose write-ahead log positions. On the primary, \`pg_current_wal_lsn()\` identifies a current WAL location. On a standby, \`pg_last_wal_replay_lsn()\` reports how far replay has progressed, and \`pg_last_xact_replay_timestamp()\` exposes the timestamp of the last replayed transaction record.

Time-based lag metrics can be misleading when the primary is idle: the last replay timestamp grows older even though there is no unapplied WAL. For deterministic tests, compare log sequence numbers and verify the particular test row's visibility. The business assertion remains authoritative.

\`\`\`sql
-- Run on the standby as a suitably privileged test role.
SELECT pg_is_in_recovery() AS is_standby;
SELECT pg_wal_replay_pause();
SELECT pg_get_wal_replay_pause_state() AS pause_state;

-- While replay is paused, inspect standby progress.
SELECT
  pg_last_wal_receive_lsn() AS received_lsn,
  pg_last_wal_replay_lsn() AS replayed_lsn,
  pg_last_xact_replay_timestamp() AS last_replayed_transaction;

-- Always resume in teardown.
SELECT pg_wal_replay_resume();
SELECT pg_get_wal_replay_pause_state() AS pause_state;
\`\`\`

\`pg_wal_replay_pause()\` and resume are recovery-control functions restricted to privileged roles by default. Grant only the necessary execute permission to an isolated test role, or run the scenario inside disposable infrastructure. Never pause a shared production standby for a test. Paused replay can consume WAL retention and disk capacity if left unattended.

## Build a deterministic profile-update scenario

Assume the application has separate PostgreSQL pools and a routing function. A session receives a consistency deadline after a successful write. Reads for that session use the primary until the deadline expires; anonymous reads continue using the replica. This is a common, understandable policy even when WAL-token routing is not implemented.

The integration test below talks to both databases to control and prove state, while HTTP requests exercise the deployed routing logic. Unique data prevents confusion with previous runs. Cleanup resumes replay in \`finally\` even when an assertion fails.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createApiClient } from './support/api-client';

const primary = new Pool({ connectionString: process.env.PRIMARY_DATABASE_URL });
const replica = new Pool({ connectionString: process.env.REPLICA_DATABASE_URL });
const api = createApiClient(process.env.APP_URL!);

beforeAll(async () => {
  const result = await replica.query<{ pg_is_in_recovery: boolean }>(
    'select pg_is_in_recovery()',
  );
  expect(result.rows[0].pg_is_in_recovery).toBe(true);
});

afterAll(async () => {
  await Promise.all([primary.end(), replica.end()]);
});

test('the writer reads its new profile while the replica is stale', async () => {
  const userId = randomUUID();
  const session = await api.createUser({ id: userId, email: 'old@example.test' });

  await expect
    .poll(async () => {
      const result = await replica.query('select email from users where id = $1', [userId]);
      return result.rows[0]?.email;
    })
    .toBe('old@example.test');

  await replica.query('select pg_wal_replay_pause()');
  try {
    await api.patchProfile(session, { email: 'new@example.test' });

    const stale = await replica.query('select email from users where id = $1', [userId]);
    expect(stale.rows[0].email).toBe('old@example.test');

    const profile = await api.getProfile(session);
    expect(profile.email).toBe('new@example.test');
    expect(profile.debugReadSource).toBe('primary');
  } finally {
    await replica.query('select pg_wal_replay_resume()');
  }
});
\`\`\`

\`debugReadSource\` represents a test-only header or diagnostic field in this sample application, not a PostgreSQL or framework API. If exposing route choice is undesirable, infer it by the returned version, then use database query telemetry in lower environments. The crucial assertion is that the writer sees the new value while a direct replica query proves staleness.

## Test the transient not-found trap

Newly created objects create a harsher symptom than stale fields. The replica may not contain the row at all. An API that converts that miss directly into \`404 Not Found\` teaches clients that the resource does not exist, even though the preceding POST returned it.

A practical policy is to route the Location URL to primary for the creating session, carry a signed consistency token, or retry the primary when a replica miss concerns a recently created identifier. Avoid falling back to primary for every arbitrary 404, which can double database load during scans and turn invalid IDs into primary traffic.

Test both sides of the policy:

1. Pause standby replay.
2. Create an order through the application.
3. Follow its returned Location using the same authenticated session and expect \`200\` from authoritative state.
4. Request the identifier through a context without the write marker and document whether temporary \`404\`, retry advice, or primary routing is promised.
5. Request a random old identifier and prove it does not trigger an unrestricted fallback storm.

This scenario often exposes a hidden architecture problem: the POST response contains an object assembled from the write command, but the redirect target uses a generic replica-backed repository. The test forces those two paths into the same user journey.

## Verify version-aware primary fallback

Time-based stickiness is simple but imprecise. A version-aware design returns a consistency token derived from a commit position or application version. Subsequent reads present that token. The router serves from a replica only after its replay or row version reaches the requirement; otherwise it chooses primary.

Do not expose raw WAL locations as casually forgeable load-amplification inputs. Sign tokens, bind them to relevant scope, cap their lifetime, and validate format. Alternatively, store a server-side session marker. Tests should include invalid, expired, and future tokens so clients cannot force all reads to primary indefinitely.

| Strategy | Strength | Operational tradeoff | Essential lag test |
|---|---|---|---|
| Fixed-duration primary pin | Easy to explain and deploy | Too long wastes primary capacity, too short leaks staleness | Read just inside and just outside the pin window |
| Primary fallback on recent miss | Targets create-then-read failures | Needs trustworthy “recent” context | New ID falls back, random missing ID does not |
| Commit-position token | Ends fallback as soon as replica catches up | Couples routing to replication metadata | Replica behind token uses primary, caught-up replica serves read |
| Row version comparison | Domain-oriented and portable | Replica must expose some row state first | Older version does not overwrite client state |
| Always-primary endpoint | Strong and predictable | Reduces read scaling | Endpoint never touches replica under lag |
| Client monotonic merge | Prevents UI moving backward | Does not fix missing authoritative actions | Older payload is ignored after newer version rendered |

Whichever scheme you use, inspect its behavior when the primary itself is unavailable. A fallback policy is not high availability unless the selected consistency and failure semantics are explicit.

## Assert monotonic user experience

Some applications poll a replica after an initial primary-backed write response. The first screen shows version 8, then polling returns version 7 and the UI moves backward. Even if temporary staleness is allowed, a client can enforce monotonic reads by refusing to replace known state with an older version.

Include a version, updated timestamp with a clear ordering rule, or sequence number in the representation. Test a response order of 7, 9, 8 and assert the visible state remains at 9 after the late stale response. Avoid relying on client wall-clock timestamps from different devices. Database-generated monotonically comparable versions are safer.

This client defense does not authorize security decisions and does not repair a server that rejects a valid follow-up command based on stale state. It is a presentation guarantee. Keep server-side authoritative paths for mutations and permission checks.

## Resume replay and prove convergence

Fault cleanup is part of the test, not an afterthought. Call resume in \`finally\`, then wait until the replica exposes the committed row or reaches the captured primary LSN. Do not sleep for “the usual replication delay.” Slow CI and busy WAL streams make that arbitrary.

\`\`\`ts
async function waitForReplicaProjectName(
  replica: Pool,
  projectId: string,
  expectedName: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const result = await replica.query<{ name: string }>(
          'select name from projects where id = $1',
          [projectId],
        );
        return result.rows[0]?.name;
      },
      { timeout: 15_000, interval: 100 },
    )
    .toBe(expectedName);
}

test('ordinary reads return to the replica after catch-up', async () => {
  await replica.query('select pg_wal_replay_pause()');
  try {
    await api.renameProject('project-81', 'Atlas');
    expect((await api.getProject('project-81')).debugReadSource).toBe('primary');
  } finally {
    await replica.query('select pg_wal_replay_resume()');
  }

  await waitForReplicaProjectName(replica, 'project-81', 'Atlas');
  await expect
    .poll(async () => (await api.getProject('project-81')).debugReadSource)
    .toBe('replica');
});
\`\`\`

The convergence helper polls the exact changed entity instead of relying on elapsed time. In production test code, capture the version or value written and verify that field. Also assert routing returns to the replica, otherwise a “fix” may silently pin every session forever.

## Use disposable replication infrastructure

A meaningful test needs a real primary and physical standby when validating PostgreSQL routing against replay state. Mock repositories can cover policy branches, but they cannot confirm connection roles, recovery state, or actual visibility. Build a disposable pair in CI with initialization scripts that configure streaming replication, or use a maintained environment image your team has reviewed.

Pin image versions. Wait for \`pg_is_in_recovery()\` on the standby and for initial data convergence before starting the fault. Generate unique credentials and remove the environment after the suite. The [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026) explains lifecycle, readiness, and parallel-safe resource naming.

Be cautious with network proxies as the only lag mechanism. Adding latency to application reads tests slow queries, not stale data. Interrupting WAL transport can produce lag, but a standby may continue replaying WAL already received. \`pg_wal_replay_pause()\` directly controls the state the application must handle and is easier to delimit. Network faults remain useful for replication-disconnect monitoring and reconnect behavior.

## Protect the suite from a paused-standby leak

The worst test failure leaves replay paused and contaminates everything afterward. Use several safeguards: \`try/finally\` in the test, an \`afterEach\` recovery check, disposable containers, and a suite timeout that destroys the environment. Before each lag scenario, assert replay state is \`not paused\` and both nodes agree on the baseline row.

Do not run unrelated integration tests concurrently against the same paused standby. Give the scenario an exclusive environment or scheduling lock. Otherwise valid tests become nondeterministically stale, and the lag test no longer knows which writes accumulated while paused.

Monitor retained WAL and disk in longer chaos exercises. A short functional test generates little data, but a hung pause in a busy shared environment can be operationally expensive. Privilege the pause role narrowly and prohibit it in production credentials.

## Review the result as a consistency matrix

A single happy fallback test is not enough. Cross the operation, caller context, replica state, and failure state. Include create then read, update then read, permission revocation, a genuinely absent object, catch-up, expired stickiness, and primary unavailability. Record both response content and selected source where diagnostic access exists.

The best outcome is not “all reads go primary during tests.” It is selective consistency: journeys that promised read-your-writes remain coherent, safely stale endpoints continue scaling on replicas, and the system returns to normal routing promptly after convergence.

## Put authorization revocation on the authoritative path

Replica lag becomes a security issue when the stale row grants access. Imagine an administrator removes a user's export permission on the primary while an API node evaluates authorization from a lagging replica. The next export can be accepted under a permission that has already been revoked.

Build a focused scenario: establish permission and allow it to replicate, pause replay, revoke on the primary, then call the protected operation as the affected user. The expected response should be denial if the product promises immediate revocation. Prove through a direct standby query that the old grant is still visible, otherwise the test has not exercised the dangerous state.

Do not solve this only in the UI. Hiding an Export button based on primary-backed profile data does not protect the API. The mutation endpoint must make its own authoritative authorization decision. This may mean routing selected permission checks to primary, maintaining a separate strongly consistent authorization store, or using short-lived capabilities whose revocation semantics are documented.

Grant propagation has a different risk direction. If a newly granted capability is briefly missing on a replica, the system may deny a legitimate action, which is inconvenient but fail-safe. Tests should distinguish stale deny from stale allow instead of applying symmetric fallback blindly. Some domains require immediate grants too, but that is a service promise rather than the safest default.

Also exercise connection pooling. A transaction that checks authorization on primary must not perform the protected write through an unrelated session after assumptions change. Keep the check and mutation within the atomic boundary appropriate to the domain, then test concurrent revocation where the threat model demands it.

## Frequently Asked Questions

### Is adding query latency the same as creating replica lag?

They are different faults. Query latency delays a response but may still return current data. Replica lag means the standby has not replayed a committed change, so it returns an older database state.

### Can I call pg_wal_replay_pause() on the primary?

It is a recovery-control function intended for a standby in recovery. Confirm \`pg_is_in_recovery()\` before using it, and restrict execution to disposable test infrastructure.

### Should every replica 404 fall back to the primary?

Usually not. That can double load for arbitrary missing IDs. Tie fallback to a recent write, a validated consistency token, or an endpoint whose contract requires authoritative existence.

### How do I know when the standby has caught up?

Poll the changed row or compare relevant WAL positions. Avoid a fixed sleep. Row visibility proves the business condition most directly.

### What if the replica returns an older version after the UI showed a newer one?

Enforce monotonic rendering with a comparable version and ignore regressions, while retaining primary-backed paths for mutations and security decisions.
`,
};
