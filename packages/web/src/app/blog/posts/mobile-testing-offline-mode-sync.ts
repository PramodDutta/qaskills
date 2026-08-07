import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mobile Testing Offline Mode Sync: A Deterministic Test Strategy',
  description: 'Master mobile testing offline mode sync with deterministic state models, conflict cases, network transitions, and evidence that prevents silent data loss.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Mobile Testing Offline Mode Sync: A Deterministic Test Strategy

Mobile testing offline mode sync should prove three properties: a user can keep working without connectivity, locally accepted actions survive process and device interruptions, and reconciliation produces an explainable server state when the network returns. A test that only toggles airplane mode and sees a “You are offline” banner does not verify synchronization.

The most reliable approach separates the sync engine from the screen, models queued operations as durable data, controls the server clock and responses, and tests transitions rather than static online or offline states. This article turns those ideas into runnable TypeScript workflows, conflict matrices, device scenarios, and diagnostics suitable for engineers and AI coding agents.

## Start with an explicit offline data contract

Before choosing test tools, define what the application promises when disconnected. “Works offline” is ambiguous. A notes app may allow create and edit but not sharing. A field-service app may capture inspections and photos but defer validation. A banking app may display cached balances while refusing money movement.

Write the promise as capabilities and visible outcomes:

| User action | Offline acceptance | Local result | Reconnect behavior |
|---|---:|---|---|
| Create inspection | Yes | Draft receives a stable local ID | Upload once, map local ID to server ID |
| Edit unsubmitted answer | Yes | Latest edit appears immediately | Merge or reject under documented rule |
| Attach photo | Yes, within storage limit | Thumbnail and pending state shown | Upload bytes, then reference attachment |
| Assign another technician | No | Control disabled with an explanation | User retries while online |
| View last route | Read-only | Cached data marked with its age | Refresh without erasing local work |

For every accepted action, define durability. Does “saved” mean held in memory, written to a local database, or acknowledged by the server? Use distinct UI words such as “Saved on this device,” “Waiting to sync,” and “Synced.” One generic checkmark makes support incidents almost impossible to reconstruct.

The sync contract should also define ordering, idempotency, conflict ownership, retry limits, attachment behavior, authentication expiry, and local retention. These are product decisions, not implementation details. Tests can enforce a decision, but they cannot invent the correct one.

## Represent local work as replayable operations

A durable operation log is easier to test than an implicit set of changed objects. Each accepted offline action becomes a record with a stable operation ID, entity identity, payload, sequence, and status. The exact storage technology can vary by mobile platform, but the behavioral shape remains useful.

\`\`\`ts
type PendingOperation = {
  operationId: string;
  entityType: 'inspection' | 'attachment';
  entityId: string;
  kind: 'create' | 'update' | 'upload';
  baseRevision?: number;
  payload: unknown;
  createdAt: string;
  sequence: number;
  status: 'pending' | 'sending' | 'blocked';
};

interface OperationStore {
  append(operation: PendingOperation): Promise<void>;
  listPending(): Promise<PendingOperation[]>;
  markComplete(operationId: string): Promise<void>;
}
\`\`\`

The operation ID must remain stable across retries. If the client creates a new identity after every timeout, the server cannot distinguish a retry from a second user action. Server endpoints that accept offline replay should use an idempotency mechanism or an operation identity with equivalent semantics. The precise HTTP header or field is an API design choice, so test the documented contract rather than assuming a universal name.

Sequence is not automatically wall-clock time. Mobile clocks can be wrong, jump after synchronization, or differ between devices. A per-client monotonic sequence provides a deterministic local order. Server ordering across devices still needs a separate conflict rule.

## Test the sync reducer without a radio or emulator

Most sync logic can run as a deterministic state machine in a fast unit-test environment. Inputs are queued operations, server responses, connectivity events, and authentication events. Outputs are local state changes, requests, retry decisions, and user-visible status.

Define a narrow response model:

\`\`\`ts
type SyncResponse =
  | { type: 'accepted'; operationId: string; serverRevision: number }
  | { type: 'duplicate'; operationId: string; serverRevision: number }
  | { type: 'conflict'; operationId: string; serverRevision: number; serverValue: unknown }
  | { type: 'unauthorized'; operationId: string }
  | { type: 'retryable'; operationId: string };

type SyncDecision =
  | { action: 'complete'; revision: number }
  | { action: 'prompt-conflict'; serverValue: unknown }
  | { action: 'pause-auth' }
  | { action: 'retry-later' };
\`\`\`

Then test decisions directly with Vitest or Jest. The assertion vocabulary below is supported by both styles, although imports depend on the chosen runner:

\`\`\`ts
it('treats a duplicate acknowledgement as completed', () => {
  const result = decideSyncOutcome({
    type: 'duplicate',
    operationId: 'op-17',
    serverRevision: 42
  });

  expect(result).toEqual({ action: 'complete', revision: 42 });
});

it('does not retry an authorization failure in a tight loop', () => {
  const result = decideSyncOutcome({
    type: 'unauthorized',
    operationId: 'op-18'
  });

  expect(result).toEqual({ action: 'pause-auth' });
});
\`\`\`

These tests catch logic errors faster than device tests and give an AI agent a constrained surface to modify. They do not prove storage survives termination or the operating system reports connectivity as expected. Those concerns belong to integration and device layers.

If the team is selecting a runner for this layer, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps compare execution models without coupling the sync design to one framework.

## Build a transition matrix instead of two online states

Offline sync failures occur at edges: connection drops after request bytes leave, a process dies between server acceptance and local acknowledgement, or connectivity returns while a token has expired. Cover those transitions deliberately.

| Initial state | Interrupt point | Recovery event | Expected invariant |
|---|---|---|---|
| Online | Before request starts | Network returns | Operation remains pending, then sends once |
| Sending | Server accepted, response lost | Retry | Server has one effect, client marks complete |
| Offline | After local commit | App terminated and relaunched | Operation remains visible and queued |
| Reconnecting | Token expired | User reauthenticates | Queue resumes without recreating operations |
| Sending attachment | Partial bytes transferred | Retry or resume per protocol | Final attachment appears once and is uncorrupted |
| Conflict blocked | User chooses server value | Next operation runs | Blocked entity resolves without stalling unrelated work |

Create named checkpoints in the fake transport so a test can stop at exact boundaries. Random network failure is useful later, but it is poor primary evidence because reproducing the critical point is difficult.

\`\`\`ts
class ControlledTransport {
  private releaseResponse!: () => void;
  readonly responseGate = new Promise<void>((resolve) => {
    this.releaseResponse = resolve;
  });

  async send(operation: PendingOperation): Promise<SyncResponse> {
    await fakeServer.accept(operation);
    await this.responseGate;
    return fakeServer.responseFor(operation.operationId);
  }

  allowResponse(): void {
    this.releaseResponse();
  }
}
\`\`\`

A test can start a send, wait until the fake server records acceptance, simulate process loss before \`allowResponse\`, reload persisted state, and retry. The expected server count remains one. That is the classic lost-acknowledgement test and one of the highest-value offline cases.

## Prove storage durability across application restarts

Mocking the operation store is appropriate for reducer tests, but at least one integration suite must use the real local storage adapter. The suite should write a pending action, discard all in-memory objects, recreate the application data layer, and show the action remains available.

Use a storage-agnostic test contract so native adapters share behavior:

\`\`\`ts
export function operationStoreContract(
  createStore: () => Promise<OperationStore>
): void {
  it('restores a pending operation after reopening storage', async () => {
    const first = await createStore();
    await first.append(makeOperation({ operationId: 'op-restart-1' }));

    const reopened = await createStore();
    const pending = await reopened.listPending();

    expect(pending.map((item) => item.operationId)).toContain('op-restart-1');
  });
}
\`\`\`

Real process termination on a device adds assurance that buffered writes and lifecycle handling behave correctly. Do not equate hiding and reopening a screen with process death. A warm process retains memory and can conceal a missing durable write.

Also test storage pressure and serialization errors. A photo may exceed available space. A schema migration may encounter an operation written by an older application release. The product should keep recoverable work visible and provide a safe next action rather than deleting a queue it cannot decode.

| Persistence risk | Test fixture | Required evidence |
|---|---|---|
| App killed after local save | Pending operation on disk | Relaunch restores edit and pending label |
| App upgraded with old queue | Previous storage schema fixture | Migration preserves or explicitly quarantines work |
| Storage quota reached | Adapter returns documented failure | User is warned before false “saved” status |
| Corrupt one record | Invalid serialized operation | Healthy records still load, incident is diagnosable |

## Make the server replay-safe before testing reconnection

The hardest client test cannot compensate for a non-idempotent server. A timeout means the client does not know whether the server applied the action. Retrying is safe only when the server recognizes the same operation.

A minimal in-memory example illustrates the expected semantics:

\`\`\`ts
const completed = new Map<string, { revision: number }>();

async function applyOperation(operation: PendingOperation) {
  const previous = completed.get(operation.operationId);
  if (previous) {
    return { type: 'duplicate' as const, ...previous };
  }

  const revision = await updateInspection(operation);
  completed.set(operation.operationId, { revision });
  return { type: 'accepted' as const, revision };
}
\`\`\`

A production implementation must make the domain update and operation-record write atomic enough for its database model. If the business update commits but the idempotency record does not, a retry can still duplicate the effect. Test the real transactional boundary at the API integration layer.

Do not delete a local operation merely because a request received any successful HTTP status. Validate that the response acknowledges the correct operation and contains the expected server identity or revision. Otherwise a proxy cache, incorrect response correlation, or client bug can silently discard unsynced work.

## Exercise conflicts with semantic examples

“Last write wins” sounds simple but hides which clock wins and what data can be overwritten. Field-service data often needs domain-specific rules. Two answers may merge, while two edits to the same regulated observation require review.

Create a conflict decision matrix with business owners:

| Local change | Remote change | Policy | User experience |
|---|---|---|---|
| Edit answer A | Edit answer B | Merge fields | Both changes appear after sync |
| Edit answer A | Edit same answer A | Manual choice | Show both values and authorship context |
| Add photo | Add different photo | Append set | Both attachments remain |
| Delete inspection | Add remote answer | Server rule | Block deletion and explain remote activity |
| Rename draft | Server closes inspection | Server state wins | Preserve local name in recoverable conflict details |

Test conflicts with base revisions rather than carefully timed sleeps. The client sends the revision it edited. The fake server responds with a newer revision and current value. That produces the same conflict on every run.

\`\`\`ts
it('blocks only the conflicted inspection', async () => {
  server.setRevision('inspection-7', 12, { temperature: 8 });
  store.seed(
    makeUpdate({ entityId: 'inspection-7', baseRevision: 11 }),
    makeUpdate({ entityId: 'inspection-8', baseRevision: 4 })
  );

  await syncEngine.drain();

  expect(await store.statusFor('inspection-7')).toBe('blocked');
  expect(await store.statusFor('inspection-8')).toBe('complete');
});
\`\`\`

This test also prevents head-of-line blocking. One conflicted entity should not necessarily stop independent work. Preserve ordering within an entity while allowing safe progress across entities.

## Use browser offline controls only for browser-based mobile experiences

For a responsive web app or installed PWA, Playwright can set a browser context offline. That is useful for proving browser behavior, service-worker caching, and request queuing. It is not evidence for native operating-system networking or a native database adapter.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('keeps an inspection draft visible through reconnect', async ({ page, context }) => {
  await page.goto('/inspections/new');
  await context.setOffline(true);

  await page.getByLabel('Temperature').fill('8');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Saved on this device')).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('Synced')).toBeVisible();
});
\`\`\`

Use user-facing roles and labels, not generated CSS classes. The [Playwright locator practices article](/blog/playwright-best-practices-locators-2026) explains how resilient locators keep transition tests focused on behavior.

Avoid waiting for an arbitrary number of seconds after reconnection. Wait for a user-visible state and, when possible, inspect the controlled server's received operations. The UI assertion proves communication to the user. The server assertion proves the side effect. Together they prevent a false positive where the label changes before persistence completes.

## Run a small native-device scenario set

Unit and integration tests should carry most combinations. A native-device suite should cover the platform boundaries that fakes cannot: actual connectivity notifications, background and foreground transitions, process termination, secure token storage, and local database behavior.

Use a compact scenario set:

1. Launch online, load a record, disconnect, edit, terminate the process, relaunch offline, and confirm the edit persists.
2. Reconnect with a valid token, confirm one server effect, and verify the pending indicator becomes synced.
3. Disconnect during an upload, background the app, restore connectivity, and verify the documented resume or restart behavior.
4. Let authentication expire while offline, reconnect, reauthenticate, and confirm the original operations retain their identities.
5. Create a server conflict from another client, reconnect the device, and complete the intended resolution flow.

Capture application logs, test-server request logs, the local operation list with sensitive payloads redacted, and screen evidence. A device video alone shows symptoms but rarely identifies whether the loss occurred before durable save, during selection, during transport, or after acknowledgement.

## Diagnose the disappearing-draft failure

Imagine a tester saves a draft offline, sees “Saved on this device,” kills the app, reconnects, and finds no draft locally or remotely. Diagnose from the first invariant, not from the final missing screen.

1. Check whether the save action committed an operation to durable storage before showing the label.
2. Reopen storage directly and query the operation identity.
3. Check migration logs if the application version changed.
4. If the operation exists, inspect whether the sync selector included it.
5. Match its operation ID against outgoing requests and server logs.
6. Inspect acknowledgement handling and local cleanup order.

A common bug is optimistic UI state written to an in-memory store while the durable write is started but not awaited. The label appears, process death interrupts the write, and nothing survives. Correct the ordering so durable acceptance precedes the saved claim:

\`\`\`ts
async function saveOfflineEdit(edit: PendingOperation): Promise<void> {
  await operationStore.append(edit);
  uiStore.markSavedOnDevice(edit.entityId);
  syncScheduler.requestRun();
}
\`\`\`

Another failure deletes the queue item before the server transaction is confirmed. Preserve the operation until a correlated acceptance or duplicate acknowledgement arrives. If local cleanup fails after server success, retrying with the same ID is safer than guessing.

## Verify attachments as content, metadata, and references

Attachments make offline sync more complicated than ordinary JSON updates. The client may persist a temporary file, queue metadata, upload bytes, receive a server attachment identity, and finally connect that identity to a parent record. A test that observes only the final thumbnail can miss corruption, duplication, or an orphaned upload.

Define separate invariants for the file and its relationship. The uploaded byte length and digest should match the local source where the product permits such verification. The media type and file name should survive normalization rules. The parent record should reference exactly one confirmed attachment, and a retry after lost acknowledgement should not create a second attachment. Local bytes should be removed only after the server acknowledgement and parent reference are durable.

Test interruption at each ownership transfer: after the local file copy, after metadata is queued, during byte upload, after server acceptance, and before local cleanup. Use small deterministic fixtures for most cases, plus a boundary-sized fixture that exercises the product's documented storage limit. Do not embed sensitive production images in the test repository.

Offline deletion needs an equally explicit rule. If a user removes a pending photo before it uploads, the client can cancel both local metadata and bytes. If the server has already accepted it but the response was lost, the same action may need to replay as a deletion after the duplicate acknowledgement reveals the server identity. Capture this as an operation dependency rather than guessing from whether a local file still exists.

Keep orphan cleanup separate from interactive sync. A scheduled server process may remove uploads never attached to a parent after a retention window, but the mobile client should not assume that cleanup completed. Integration tests can advance a controlled clock, create an orphan through an interrupted flow, and prove that the documented retention behavior does not delete a valid but delayed attachment.

## Observe sync without leaking customer data

Production telemetry should answer where operations stall while avoiding raw field values, notes, photos, tokens, or user identifiers. Emit structured lifecycle events with coarse reasons and safe identifiers.

\`\`\`json
{
  "event": "offline_sync_transition",
  "operationType": "inspection_update",
  "from": "pending",
  "to": "blocked",
  "reason": "revision_conflict",
  "queueAgeBucket": "1h_to_6h",
  "appRelease": "mobile-release-42"
}
\`\`\`

Useful aggregate signals include pending queue age, retry count distribution, duplicate acknowledgement rate, conflict rate by operation type, and percentage of locally accepted work eventually confirmed by the server. A growing old-queue population is more actionable than a raw count of offline events.

Give support tooling a safe correlation key that a user can share. It should locate lifecycle metadata without exposing the operation payload. Document retention and redaction with security and privacy stakeholders.

## Hand AI agents evidence, invariants, and a fault boundary

An AI coding agent is effective when asked to extend a deterministic matrix. Provide the operation schema, state transition table, one failing trace, relevant storage and transport adapters, and the exact invariant. Ask it to add the smallest failing test before changing implementation.

For example:

\`\`\`text
Failure: op-77 was accepted by the server, its response was lost, and retry created a second photo.
Invariant: one operation ID produces at most one stored attachment.
Scope: sync engine, fake server, attachment API integration test.
Do not: replace the real storage adapter in the integration test or loosen the final count assertion.
Evidence: redacted operation lifecycle and two server request correlations.
\`\`\`

Review whether the agent preserves stable operation identity, handles duplicate acknowledgement, and tests the interruption point. A generated sleep-based test or a mock that always succeeds removes the behavior you need to prove.

## Frequently Asked Questions

### How many offline sync scenarios belong in end-to-end mobile tests?

Keep the end-to-end set small and focused on native boundaries, typically representative restart, reconnect, interrupted transfer, expired authentication, and conflict flows. Put ordering combinations, response classes, retries, and merge rules into fast state-machine and integration tests. The exact count matters less than coverage allocation. If every conflict permutation requires a physical device, feedback becomes slow and flaky. If no test uses real persistence and lifecycle transitions, mocks can conceal data-loss defects.

### Should offline actions be replayed in the order users performed them?

Preserve order when operations on the same entity depend on one another, such as creating a draft before updating it. Independent entities can often synchronize concurrently or continue when one entity is blocked. Use a stable local sequence instead of device wall-clock time, then define server conflict behavior for actions from different devices. Tests should prove both properties: dependent operations do not reorder, and one conflicted record does not unnecessarily stall unrelated queued work.

### Can Playwright fully test offline behavior in a native mobile application?

No. Playwright's browser context offline control is appropriate for browser-based mobile sites and PWAs. It can verify web storage, service-worker behavior, locators, and browser network transitions. It does not exercise native operating-system connectivity callbacks, a native local database, background execution policies, or native secure storage. Reuse domain-level sync tests across clients, then add native integration and device tests for the platform-specific boundaries that a browser cannot represent.

### What is the most important assertion after connectivity returns?

Assert eventual convergence with no duplicate effect: the exact locally accepted operation is represented once on the server, the client records the correlated acknowledgement, and the pending state clears only afterward. A visible “Synced” label alone is insufficient, and a server record alone does not prove the client can safely clean its queue. For conflict cases, convergence may mean an explicit blocked state with both values preserved until the user or domain rule resolves it.
`,
};
