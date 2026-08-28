import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mobile Offline Testing: Queues, Conflict Policies, and Sync Verification',
  description:
    'Mobile offline testing for queues, conflicts, and sync: simulate partitions, assert outbox drain, and catch LWW or merge bugs before release.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Mobile Offline Testing: Queues, Conflict Policies, and Sync Verification

Mobile offline testing means proving that a client can keep accepting user work when the network is gone, park those writes in an ordered mutation queue (outbox), survive reconnect with idempotent replay, resolve or surface conflicts against server state, and finish with a sync that leaves local and remote stores consistent. You are not only checking "airplane mode shows a banner." You are verifying queue ordering, conflict policies (last-write-wins, server-wins, merge, or prompt), partial sync and cursor behavior, tombstones for offline deletes, and the drain path that empties the outbox after connectivity returns. This guide is for QA engineers, mobile automation owners, and test-automation developers who need concrete Detox, Appium, and Playwright-adjacent harness patterns.

Offline looks like a UX checkbox until a field tech edits a work order with no signal, a second device edits the same record on Wi-Fi, and sync invents a third truth. Suites that win treat connectivity as a controllable fixture, the outbox as a first-class database, and sync as a state machine with asserted transitions.

## The outage that looked like "sync is flaky"

A field-service app shipped "full offline edit" for job notes and checklist items. Product signed off on a demo where a tester toggled airplane mode, typed a note, restored network, and watched the note appear on the web dashboard. Staging used one test account and one phone. Two weeks after launch, support tickets clustered around "my note vanished" and "the checklist flipped back." On-call charts showed successful \`POST /sync\` responses. Device logs showed the outbox draining to empty. Nobody could reproduce on a single device.

The defect was a conflict policy nobody had tested as a multi-writer scenario. Local mutations used client timestamps from the device clock. The server applied last-write-wins (LWW) on \`updated_at\`. Android devices in the fleet had clocks skewed several minutes behind NTP after long airplane sessions. A tech edited offline at 14:02 device time. A dispatcher edited the same job on the web at 14:00 real time while the tech was still offline. On reconnect, the tech's mutation carried \`updated_at: 14:02\` device-local, which the server treated as newer than the dispatcher's 14:00 UTC write even when wall clocks disagreed the other way after timezone normalization bugs in the client serializer. In other cases the opposite happened: a correct NTP catch-up on reconnect rewrote pending outbox timestamps just before flush, so the offline note lost to an earlier web edit.

What people get wrong is treating "outbox emptied" and "HTTP 200" as proof of correct merge. Mobile offline testing has to assert the final document body, the conflict audit row if you keep one, and the invariant that two writers cannot silently invent a third field mix unless your merge policy says so. Queue drain is necessary. Consistency of the domain record is the acceptance bar.

## A map of offline sync you can test in layers

Stop starting with "toggle airplane mode and tap around." Build layers and keep each green before you burn device-lab time:

1. Local store + schema version: seed SQLite/Realm/WatermelonDB (or equivalent) at a known schema, including older schema rows for upgrade paths.
2. Mutation outbox: enqueue, order, idempotency keys, retry metadata, and poison-message handling.
3. Connectivity fixture: airplane mode, proxy deny, OS offline flag, or app-level network shim with deterministic transitions.
4. Sync protocol: push outbox, pull remote pages with cursors, apply tombstones, acknowledge watermarks.
5. Conflict policy: LWW, server-wins, field merge, or user prompt with an explicit UI assertion.
6. Cross-signal paths: push notifications that arrive while offline and must reconcile after sync.

| Layer | Primary assert | Common false green |
|---|---|---|
| Connectivity | Writes still accepted; UI shows offline affordance | Banner shown but writes rejected |
| Outbox | Ordered rows, stable idempotency keys | Queue empty because writes were dropped |
| Sync push | Server receives each mutation once | Duplicate rows from retry without keys |
| Sync pull | Cursor advances; partial pages resume | Full rewind every reconnect |
| Conflict | Policy outcome on shared fields | HTTP success with silent field loss |
| Tombstone | Deletes win over stale offline edits | Deleted entity resurrected from outbox |

If you want ready-made QA skills you can install from [qaskills.sh](https://qaskills.sh) with the qaskills CLI, use them as checklists beside this harness rather than as a substitute for seeding a real local database.

## Network partition simulation that stays deterministic

Airplane mode is the product language. Automation needs something you can flip without flaky OS dialogs. Prefer an explicit offline seam in the app for CI, then validate airplane mode on a smaller device-lab matrix.

Useful partition styles:

- **App offline flag**: feature or debug setting that forces the HTTP stack to fail fast and mark the session offline. Best for PR gates.
- **Proxy deny**: route device traffic through a controllable proxy and reject API hosts while allowing app boot assets if needed. Good for "real socket failure" without full airplane.
- **OS airplane / network off**: closest to users; slower and more flaky in CI. Keep for nightly or lab jobs.
- **Partial allowlist**: deny mutation endpoints but allow auth refresh, or the reverse, to expose half-connected bugs.

\`\`\`ts
// Illustrative connectivity fixture for a Detox-style flow
type NetMode = 'online' | 'app_offline' | 'proxy_deny';

async function setNetworkMode(mode: NetMode): Promise<void> {
  // App exposes a test-only native module or deep link in debug builds.
  // Do not invent production flags; gate this behind __DEV__ / test builds.
  await device.launchApp({
    newInstance: false,
    url: \`myapp://test/network?mode=\${mode}\`,
  });
}

async function expectOfflineBanner(): Promise<void> {
  await expect(element(by.id('offline-banner'))).toBeVisible();
}

async function expectOnline(): Promise<void> {
  await expect(element(by.id('offline-banner'))).not.toBeVisible();
}
\`\`\`

Assert both directions. Going offline mid-flight should not corrupt an in-progress mutation. Coming online should trigger a single scheduled sync, not an unbounded storm of overlapping sync workers. If two sync workers can run, your suite should either prevent that in product code or assert locking.

| Simulation | What it proves | Watch for |
|---|---|---|
| App offline flag | Queue + UI under controlled fail | Flag left on in release builds |
| Proxy deny | TLS/socket error paths | DNS cache masking the deny |
| Airplane mode | Full radio loss | Flaky toggles; permission sheets |
| Endpoint allowlist | Partial connectivity | Auth OK / sync fail races |

Appium and Detox both work if the app under test exposes a stable seam. Playwright concepts map cleanly for hybrid WebViews: route.abort on API patterns while leaving the shell loaded. Keep hybrid cases honest: WebView local state and native outbox are not the same store.

## Outbox and mutation queue: ordering plus idempotency

The outbox is the heart of mobile offline testing. Every user write that must reach the server becomes a durable row before you paint success UI (or you consciously choose optimistic UI with a clear failure path).

Minimum fields worth asserting in tests:

- \`mutation_id\` (client UUID, also used as idempotency key)
- \`entity_type\` / \`entity_id\`
- \`base_version\` or \`base_etag\` read before the edit
- \`payload\` (intent, not only final snapshot, when merge matters)
- \`created_at_client\` plus a monotonic \`seq\` for local order
- \`status\`: pending | in_flight | acked | dead
- \`attempts\` / \`last_error\`

Ordering rules you should encode as tests:

1. FIFO per entity unless the product documents a priority lane.
2. A failed mutation should not permanently block unrelated entities (head-of-line policy is a product decision; test the one you claim).
3. Retries must send the same idempotency key.
4. Ack removes or tombstones the outbox row only after the server confirms apply.

\`\`\`ts
// Illustrative outbox model and enqueue invariants
type OutboxStatus = 'pending' | 'in_flight' | 'acked' | 'dead';

interface OutboxRow {
  mutationId: string;
  entityType: 'job' | 'note' | 'checklist_item';
  entityId: string;
  baseVersion: number;
  payload: Record<string, unknown>;
  seq: number;
  status: OutboxStatus;
  attempts: number;
}

function enqueue(
  rows: OutboxRow[],
  input: Omit<OutboxRow, 'seq' | 'status' | 'attempts'>,
): OutboxRow[] {
  const seq = rows.reduce((max, r) => Math.max(max, r.seq), 0) + 1;
  return [
    ...rows,
    { ...input, seq, status: 'pending', attempts: 0 },
  ];
}

function assertUniqueMutationIds(rows: OutboxRow[]): void {
  const ids = rows.map((r) => r.mutationId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('duplicate mutationId in outbox');
  }
}

function nextBatch(rows: OutboxRow[], limit: number): OutboxRow[] {
  return rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.seq - b.seq)
    .slice(0, limit);
}
\`\`\`

A practical Detox/Appium scenario:

1. Seed local DB with job \`job_100\` at \`version: 3\`.
2. Flip connectivity to offline.
3. Edit title, add note, toggle checklist item (three mutations).
4. Assert three pending outbox rows with increasing \`seq\` and distinct \`mutationId\` values.
5. Restore connectivity; wait for sync idle.
6. Assert outbox empty (or all \`acked\`) and server fixtures received three idempotent posts in order for that entity.

\`\`\`json
{
  "outbox": [
    {
      "mutationId": "11111111-1111-4111-8111-111111111111",
      "entityType": "job",
      "entityId": "job_100",
      "baseVersion": 3,
      "payload": { "op": "set", "path": "title", "value": "Pump inspect" },
      "seq": 1,
      "status": "pending",
      "attempts": 0
    },
    {
      "mutationId": "22222222-2222-4222-8222-222222222222",
      "entityType": "note",
      "entityId": "note_55",
      "baseVersion": 1,
      "payload": { "op": "create", "body": "Valve stuck" },
      "seq": 2,
      "status": "pending",
      "attempts": 0
    }
  ]
}
\`\`\`

Idempotency failures show up as duplicate notes or double checklist toggles after flaky networks. Your server test double should reject a second apply with the same key by returning success with the original result, and the client should treat that as ack, not as a new conflict.

## Conflict policies: name them, then assert them

"We sync" is not a policy. Spell the rule in the test title.

| Policy | Rule in one line | Best assert |
|---|---|---|
| LWW | Highest timestamp/version wins whole record or field | Skewed clocks; two devices |
| Server-wins | Offline mutation discarded on mismatch | UI error + local refresh |
| Client-wins | Server overwritten if auth allows | Audit log shows overwrite |
| Field merge | Non-overlapping fields combine | Overlap still conflicts |
| Prompt user | Surface both versions | Modal copy + chosen winner persisted |

\`\`\`ts
// Illustrative conflict resolver used by unit tests beside UI flows
type Job = {
  id: string;
  version: number;
  title: string;
  status: 'open' | 'done';
  note: string;
  updatedAt: string; // ISO-8601 UTC from server clock when possible
};

type Policy = 'lww' | 'server_wins' | 'merge_fields' | 'prompt';

type ConflictResult =
  | { kind: 'applied'; job: Job }
  | { kind: 'rejected'; server: Job }
  | { kind: 'merged'; job: Job; conflicts: string[] }
  | { kind: 'needs_user'; local: Job; server: Job };

function resolveJob(
  policy: Policy,
  base: Job, // snapshot the device last synced; without it, merge cannot work
  local: Job,
  server: Job,
  localTouched: (keyof Job)[],
): ConflictResult {
  if (local.version === server.version && local.updatedAt === server.updatedAt) {
    return { kind: 'applied', job: local };
  }

  if (policy === 'server_wins') {
    return { kind: 'rejected', server };
  }

  if (policy === 'lww') {
    const winner =
      Date.parse(local.updatedAt) >= Date.parse(server.updatedAt) ? local : server;
    return { kind: 'applied', job: { ...winner, version: server.version + 1 } };
  }

  if (policy === 'merge_fields') {
    // Three-way diff. Comparing local against server alone cannot tell
    // "server still holds the old value" apart from "server changed it",
    // so every local edit would flag as a conflict.
    const conflicts: string[] = [];
    const merged = { ...server };
    for (const key of localTouched) {
      if (key === 'id' || key === 'version') continue;
      const localChanged = local[key] !== base[key];
      const serverChanged = server[key] !== base[key];
      if (localChanged && serverChanged && server[key] !== local[key]) {
        conflicts.push(String(key));
        continue;
      }
      if (localChanged) {
        (merged as Record<string, unknown>)[key as string] = local[key];
      }
    }
    if (conflicts.length) return { kind: 'needs_user', local, server };
    return {
      kind: 'merged',
      job: { ...merged, version: server.version + 1 },
      conflicts: [],
    };
  }

  return { kind: 'needs_user', local, server };
}
\`\`\`

The base snapshot is whatever the device stored at its last successful sync; persist it beside the record, or the merge policy silently degrades into the broken two-way compare. UI automation should not only call the resolver unit. Drive two writers:

1. Device A offline edits \`title\`.
2. Server fixture (or Device B) changes \`status\` and/or \`title\` while A is offline.
3. Device A reconnects.
4. Assert the policy outcome: merged record, server record with error toast, or conflict screen with both bodies.

For LWW, inject known timestamps through the test seam. Never rely on wall clock alone in CI. Clock skew is a first-class input, not noise.

## Partial sync, pagination cursors, and offline gaps

Sync rarely means "download the world." Mobile clients pull pages with cursors or \`since\` watermarks. Offline testing must cover reconnect while a pull was half finished, and push while pull is in flight.

Cases that catch real bugs:

- Outbox push succeeds; pull fails mid-page; next launch resumes cursor, not zero.
- Pull completes; ack watermark persists across process death.
- Cursor token expires server-side; client recovers with a documented resync path.
- Large accounts: page size boundaries (illustrative: 100 rows/page) with an edit on page 2 while offline.

\`\`\`ts
// Illustrative pull loop with durable cursor
type Cursor = { token: string | null; drained: boolean };

async function pullAll(
  loadCursor: () => Promise<Cursor>,
  saveCursor: (c: Cursor) => Promise<void>,
  fetchPage: (token: string | null) => Promise<{
    items: unknown[];
    next: string | null;
  }>,
  applyPage: (items: unknown[]) => Promise<void>,
): Promise<void> {
  let cursor = await loadCursor();
  if (cursor.drained) return;

  for (;;) {
    const page = await fetchPage(cursor.token);
    await applyPage(page.items);
    if (page.next == null) {
      await saveCursor({ token: null, drained: true });
      return;
    }
    cursor = { token: page.next, drained: false };
    await saveCursor(cursor);
  }
}
\`\`\`

Harness tip: crash the app (process kill) after page 1 of 3 is applied, relaunch offline, then online, and assert you do not duplicate page 1 entities and you do not skip page 2. Seed server fixtures with stable ids so duplicates are obvious.

## Tombstones and deletes while offline

Deletes are mutations. If offline code only soft-hides a row locally without an outbox delete, sync will resurrect it from the next pull. If offline delete enqueues correctly but a stale offline edit for the same entity sits earlier or later in the queue, you need a defined order.

Rules to lock with tests:

1. Local delete creates a tombstone row (\`deleted_at\`, \`delete_mutation_id\`) and an outbox delete.
2. Pending edits for a deleted entity are cancelled or ordered before delete on purpose.
3. Pull applies server tombstones even when the local cache still has the entity.
4. Offline create then offline delete of the same temp id never reaches the server as a create (compaction), or reaches as create+delete intentionally; pick one and assert it.

\`\`\`ts
interface LocalEntity {
  id: string;
  body: string;
  deletedAt: string | null;
}

function applyTombstone(entities: LocalEntity[], id: string, at: string): LocalEntity[] {
  return entities.map((e) => (e.id === id ? { ...e, deletedAt: at } : e));
}

function visible(entities: LocalEntity[]): LocalEntity[] {
  return entities.filter((e) => e.deletedAt == null);
}

// Example assert pattern for a sync integration test
function assertDeletedNotResurrected(
  beforePull: LocalEntity[],
  afterPull: LocalEntity[],
  id: string,
): void {
  const row = afterPull.find((e) => e.id === id);
  if (row && row.deletedAt == null) {
    throw new Error(\`entity \${id} resurrected after pull\`);
  }
  if (!beforePull.some((e) => e.id === id)) {
    throw new Error('precondition failed: entity missing before pull');
  }
}
\`\`\`

Pair delete tests with conflict tests: offline delete versus online edit on another device is a classic prompt-or-server-wins moment.

## Schema version: local store versus server contracts

Offline clients live across app releases. The local DB schema version can lag the server API, or jump ahead after a store upgrade while the user is still offline. Tie your mobile checks to the same discipline you use for web local state. For hybrid shells and web companions that park drafts in browser storage, reuse the migration mindset from [localStorage schema migration testing](/blog/localstorage-schema-migration-testing): version the blob, migrate on read, refuse silent data loss, and prove idempotent upgrades.

Mobile-specific adds:

- Native SQLite migrations must run before outbox drain.
- A pending outbox payload shaped for schema v3 must not be replayed unchanged after a v4 migration that renamed fields; migrate outbox payloads too.
- Server rejecting \`schema_version\` should surface a hard "update required" path, not an infinite retry loop.

\`\`\`json
{
  "localMeta": {
    "schemaVersion": 4,
    "minServerVersion": 3,
    "outboxPayloadVersion": 4
  },
  "serverHello": {
    "apiVersion": 4,
    "minClientSchema": 3
  }
}
\`\`\`

Test matrix (illustrative combinations, not production metrics):

| Client schema | Outbox payload | Server API | Expected |
|---|---|---|---|
| 3 | 3 | 3 | Sync OK |
| 4 after migrate | 3 rows upgraded to 4 | 4 | Sync OK |
| 4 | 4 | 3 | Block with upgrade/compat message |
| 2 (skipped upgrade) | 2 | 4 | Migrate chain 2->3->4 then sync |

Seed an old DB file in the app sandbox for Appium/Detox, launch the new binary, assert migration counters, then go offline/online and drain.

## Push arriving while offline, then sync

Pushes do not pause because your outbox is full. A device can receive an FCM/APNs wake (or queue the notification until radio returns) while local state is stale. After reconnect, order matters: apply server pull and outbox push around notification intent so a deeplink does not open a conflicted or deleted entity.

Fold this into offline suites:

1. Go offline with dirty outbox.
2. Inject or schedule a push payload for an entity you will also edit locally (use the same fixtures described in [mobile push notification testing for FCM and APNs](/blog/mobile-push-notification-testing-fcm-apns)).
3. Come online; allow sync to idle.
4. Open the notification deeplink; assert the screen shows post-sync truth, not pre-sync cache.

Silent data pushes that write the local DB while an outbox mutate is pending are especially sharp. Your test should prove either the silent push lands as a pull applicator that respects \`base_version\`, or it is ignored until outbox drain finishes.

## Test harness: seed, flip, assert drain

A repeatable harness beats ad hoc manual airplane toggles.

Suggested loop for PR-quality mobile offline testing:

1. **Install / launch** debug build with test hooks.
2. **Seed** local DB + optional server mock state (entities, versions, cursors).
3. **Flip** connectivity to offline via app seam.
4. **Act** user flows: edits, creates, deletes.
5. **Assert cold state**: outbox rows, UI banners, local visible set.
6. **Flip** online.
7. **Wait** for sync idle (explicit ready signal beats fixed sleeps).
8. **Assert** outbox drain, server mock received payloads, local matches expected document.
9. **Kill and relaunch** once to prove durability.

\`\`\`ts
// Illustrative end-to-end harness sketch (Detox + app test hooks)
describe('job note offline sync', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
    await element(by.id('test-seed-job')).tap(); // seeds job_100 v3
    await setNetworkMode('app_offline');
  });

  it('drains outbox and keeps note body after reconnect', async () => {
    await element(by.id('job-row-job_100')).tap();
    await element(by.id('note-input')).typeText('Replaced seal');
    await element(by.id('note-save')).tap();

    await expect(element(by.id('offline-banner'))).toBeVisible();
    await expect(element(by.id('outbox-count'))).toHaveText('1');

    await setNetworkMode('online');
    await waitFor(element(by.id('sync-idle')))
      .toBeVisible()
      .withTimeout(15_000);

    await expect(element(by.id('outbox-count'))).toHaveText('0');
    await expect(element(by.id('note-body'))).toHaveText('Replaced seal');

    // Server mock exposed to the app test harness
    const posted = await fetch('http://127.0.0.1:7299/test/mutations').then((r) =>
      r.json(),
    );
    if (posted.length !== 1) throw new Error('expected one mutation');
    if (posted[0].idempotencyKey == null) throw new Error('missing key');
  });
});
\`\`\`

Prefer an explicit \`sync-idle\` signal (content description / testID) driven by the sync state machine. Fixed \`sleep(5000)\` is how flakes inherit your worst CI day.

## Flaky sync tests: clock skew and unordered events

When offline suites flap, the root cause is often time or event order, not "Detox is unstable."

Frequent flake sources:

- **Device clock skew** after airplane mode: LWW depends on timestamps; CI devices drift.
- **Unordered event handlers**: push callback, sync worker, and UI refetch race without barriers.
- ** overlapping sync triggers**: network listener fires twice on reconnect.
- **Non-deterministic iteration** of Maps/Sets when building multipart sync bodies.
- **Server mock shared state** across parallel device jobs.

Mitigations that belong in the suite design:

1. Freeze time through a test clock module for LWW unit and integration tests.
2. Use monotonic \`seq\` for outbox order; never sort only by wall clock.
3. Gate sync on a single-flight lock; assert concurrent enter attempts in a unit test.
4. Wait on named state, not duration.
5. Isolate server mock data per test run id.

\`\`\`ts
// Illustrative single-flight sync guard
export function createSyncLock() {
  let inFlight: Promise<void> | null = null;
  let rerunRequested = false;

  return async function runSync(work: () => Promise<void>): Promise<void> {
    if (inFlight) {
      // New work arrived mid-flight. Riding the current flight and returning
      // would drop it: mutations enqueued after the running drain started
      // would sit in the outbox until some future trigger. Request a re-run.
      rerunRequested = true;
      await inFlight;
      return;
    }
    inFlight = (async () => {
      try {
        do {
          rerunRequested = false;
          await work();
        } while (rerunRequested);
      } finally {
        inFlight = null;
      }
    })();
    await inFlight;
  };
}
\`\`\`

If a test fails only when push injection is enabled, treat it as an ordering bug between notification apply and outbox drain. Log a correlation id across outbox flush, pull apply, and notification open; assert monotonic phases in the test output.

## Putting the acceptance bar in writing

Before you close a ticket labeled "offline support," require evidence against this bar:

1. Offline writes enqueue durable, ordered, idempotent mutations.
2. Connectivity loss and restore are simulated without sleeping the flake budget away.
3. Conflict policy is named and exercised with two writers.
4. Partial pull cursors resume after kill.
5. Deletes produce tombstones that survive pull.
6. Schema migration runs before drain and rewrites outbox payloads when needed.
7. Notification deeplinks land on post-sync state.
8. Final local document equals the agreed server document, not merely "queue empty."

That list is the difference between a demo-friendly airplane toggle and mobile offline testing that protects field users.

## Frequently Asked Questions

### How is mobile offline testing different from "turn on airplane mode once"?

Airplane mode is one connectivity fixture, not the suite. Mobile offline testing asserts the outbox, idempotency keys, conflict policy outcomes, cursor resume, tombstones, and post-reconnect document equality. A single manual toggle can show a banner and still drop writes, duplicate posts on retry, or resurrect deletes. Automation should seed local state, flip an app-level offline seam for PR gates, reserve full radio loss for lab jobs, and wait for an explicit sync-idle signal. If your only assert is "no crash offline," you are not testing sync.

### Which conflict policy should QA demand for multi-device edits?

Demand a named policy per entity type, written into the ticket and mirrored in test titles. LWW needs injected clocks. Server-wins needs a visible rejection and refresh. Field merge needs overlapping versus non-overlapping field cases. Prompt-user needs UI that shows both bodies and persists the choice after kill. QA should reject "sync handles it" as acceptance criteria. Pick the policy that matches product risk: inventory counts rarely suit silent LWW; chat-style notes sometimes do. Then run two-writer scenarios every release.

### How do we keep offline sync tests from flaking in CI?

Replace wall-clock sleeps with sync state hooks, freeze time for LWW, enforce single-flight sync, and give each test an isolated server mock namespace. Use deterministic mutation ids from the harness when the app allows test overrides. Run airplane-mode OS toggles on a small nightly matrix; keep PR gates on app offline flags or proxy deny. Capture outbox snapshots on failure. Most "random" failures are double reconnect callbacks or timestamp skew. Fix the product races the tests expose instead of widening timeouts until green.

### Can hybrid apps reuse web localStorage migration tests for offline sync?

Reuse the migration ideas, not the storage engine. Versioned schemas, idempotent upgrades, and corrupt-state recovery apply to SQLite and to browser storage. Hybrid apps often have both a native outbox and WebView local state; test each store and the bridge between them. Web-only migration coverage will not catch native queue drain bugs. Align payload versions across bridges, and add one flow that edits offline in the WebView, reconnects, and asserts the native sync pipeline (or shared backend) saw a single idempotent mutation.
`,
};
