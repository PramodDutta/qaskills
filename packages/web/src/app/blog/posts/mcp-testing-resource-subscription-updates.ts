import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Testing Resource Subscription Updates End to End',
  description: 'Master MCP testing resource subscription updates with wire-level checks for capabilities, invalidation, isolation, races, reconnects, and agent freshness.',
  date: '2026-08-08',
  category: 'AI Testing',
  content: `
# MCP Testing Resource Subscription Updates End to End

MCP testing resource subscription updates means proving the complete invalidation loop: a server advertises subscription support, a client subscribes to one exact resource URI, the server emits \`notifications/resources/updated\` after that resource changes, and the client reads the resource again before using it. The notification is not the new resource body. A robust test therefore checks both the wire message and the refreshed content that reaches the agent.

Test the feature as a stateful protocol, not as an isolated callback. Cover authorization, URI matching, duplicate subscriptions, update bursts, unsubscribe, disconnect, and the race between a read and a later mutation. These cases expose stale-context failures that a happy-path test cannot. For the wider quality model, see the [agentic AI testing guide](/blog/agentic-ai-testing-guide-2026). For transport, lifecycle, and server selection context, use the [MCP servers for test automation guide](/blog/mcp-servers-test-automation-2026).

## Turn the Protocol Exchange Into an Observable Contract

The resource capability has two independent optional features. \`subscribe\` says the server supports resource-specific update notifications. \`listChanged\` says it can report changes to the set of available resources. A server can advertise one, both, or neither. Your test must not infer subscription support merely because \`resources/list\` works.

The stable 2025-06-18 schema documents \`resources/subscribe\`, \`resources/unsubscribe\`, and \`notifications/resources/updated\` at https://modelcontextprotocol.io/specification/2025-06-18/schema. Pin the protocol revision exercised by a compatibility suite, because draft behavior can evolve.

| Stage | Message or observation | Required assertion | Failure meaning |
|---|---|---|---|
| Initialization | Server capabilities | \`resources.subscribe\` is explicitly true | Client must not offer subscriptions |
| Subscription | Request with one URI | Successful JSON-RPC result | Server accepted the requested target |
| Mutation | Domain action changes backing data | Revision or body actually changes | Test stimulus is real |
| Invalidation | Updated notification with same URI | Method and URI are exact | Correct subscribers are told to refresh |
| Refresh | Client sends \`resources/read\` | Read occurs after notification | Client did not treat notice as payload |
| Consumption | Agent-visible content | New revision is used | Fresh bytes reached the consumer |
| Unsubscribe | Unsubscribe request succeeds | Later mutation produces no notice | Subscription state was removed |

A canonical happy-path transcript gives reviewers a shared oracle. This JSON Lines fixture is valid JSON one object per line, which is convenient for a transport recorder:

\`\`\`json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"qa-probe","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"resources":{"subscribe":true}},"serverInfo":{"name":"fixture-server","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"resources/subscribe","params":{"uri":"qa://runbooks/deploy"}}
{"jsonrpc":"2.0","id":2,"result":{}}
{"jsonrpc":"2.0","method":"notifications/resources/updated","params":{"uri":"qa://runbooks/deploy"}}
{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"qa://runbooks/deploy"}}
{"jsonrpc":"2.0","id":3,"result":{"contents":[{"uri":"qa://runbooks/deploy","mimeType":"text/plain","text":"revision=2"}]}}
\`\`\`

Assert direction as well as shape. Subscribe and read are client-to-server requests with IDs. The update is a server-to-client notification without an ID. A fixture that puts an ID on the notification can accidentally turn it into a request and make one implementation wait for a response that should never exist.

## Build a State Model Before Writing Transport Tests

The smallest useful model has four pieces of state per connection: negotiated capability, authorized resource set, active subscription set, and the latest revision read by the client. Modeling these explicitly stops the test from confusing globally changed data with connection-local delivery.

| Connection state | Incoming action | Expected next state | Expected output |
|---|---|---|---|
| Initialized, not subscribed | Subscribe to allowed URI | URI becomes active | Empty success result |
| Initialized, active URI | Backing resource changes | Subscription stays active | One update notification |
| Initialized, active URI | Read same URI | Revision advances locally | Fresh resource contents |
| Initialized, active URI | Unsubscribe same URI | URI removed | Empty success result |
| Initialized, inactive URI | Unrelated resource changes | No change | No notification |
| Disconnected | Any later resource change | No connection state | No delivery on old channel |

Here is a self-contained Node test for that state model. It deliberately stores subscribers by URI and connection ID, rather than using a global boolean.

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

type Notice = { method: 'notifications/resources/updated'; params: { uri: string } };

class ResourceHub {
  private subscriptions = new Map<string, Set<string>>();
  private inboxes = new Map<string, Notice[]>();

  connect(connectionId: string): void {
    this.inboxes.set(connectionId, []);
  }

  subscribe(connectionId: string, uri: string): void {
    if (!this.inboxes.has(connectionId)) throw new Error('unknown connection');
    const members = this.subscriptions.get(uri) ?? new Set<string>();
    members.add(connectionId);
    this.subscriptions.set(uri, members);
  }

  update(uri: string): void {
    for (const connectionId of this.subscriptions.get(uri) ?? []) {
      this.inboxes.get(connectionId)?.push({
        method: 'notifications/resources/updated',
        params: { uri },
      });
    }
  }

  inbox(connectionId: string): Notice[] {
    return [...(this.inboxes.get(connectionId) ?? [])];
  }
}

test('notifies only the connection subscribed to the exact URI', () => {
  const hub = new ResourceHub();
  hub.connect('client-a');
  hub.connect('client-b');
  hub.subscribe('client-a', 'qa://runbooks/deploy');

  hub.update('qa://runbooks/deploy');

  assert.deepEqual(hub.inbox('client-a'), [{
    method: 'notifications/resources/updated',
    params: { uri: 'qa://runbooks/deploy' },
  }]);
  assert.deepEqual(hub.inbox('client-b'), []);
});
\`\`\`

This is not a substitute for testing the SDK or transport. It is a fast executable oracle. Run the same transitions through stdio or Streamable HTTP and compare the observed messages with the model. When a wire test fails, the model tells you whether the bug belongs to subscription bookkeeping or message serialization.

## Verify Capability Negotiation and Negative Behavior

The first dangerous assumption is that every resource server supports subscriptions. Test a client against capability variants and make unsupported behavior visible in the UI or agent trace. The client should fall back to an explicit read strategy if the product defines one. It should not send an undocumented subscription request and hope the server accepts it.

The following pure test validates the decision, including the important false and absent cases:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

type Capabilities = {
  resources?: { subscribe?: boolean; listChanged?: boolean };
};

function canSubscribe(capabilities: Capabilities): boolean {
  return capabilities.resources?.subscribe === true;
}

test('requires an explicit resource subscription capability', () => {
  assert.equal(canSubscribe({ resources: { subscribe: true } }), true);
  assert.equal(canSubscribe({ resources: { listChanged: true } }), false);
  assert.equal(canSubscribe({ resources: {} }), false);
  assert.equal(canSubscribe({}), false);
});
\`\`\`

Also test lying capability declarations. If a server advertises \`subscribe: true\` but returns method-not-found for \`resources/subscribe\`, record a compatibility defect against the server. Do not silently relabel this as an unsupported server, because the initialization response is part of the contract. Conversely, a server that implements the request but does not advertise it creates an interoperability problem: conforming clients will never discover the feature.

Authorization belongs in this layer. Use two principals with different resource visibility. An unauthorized subscribe request must not become a side channel that confirms whether a secret URI exists. Assert the implementation's documented error behavior without requiring sensitive detail in the error message. Then mutate the secret resource and prove the unauthorized connection receives nothing.

| Negative case | Stimulus | Safe result | Security assertion |
|---|---|---|---|
| Capability absent | Client considers subscribe | Request is not sent | No speculative protocol use |
| Unknown URI | Subscribe to nonexistent URI | Documented error or safe handling | No leaked metadata |
| Forbidden URI | Lower-privilege principal subscribes | Authorization failure | No later update notice |
| Malformed URI | Invalid value reaches handler | Invalid-params response | Server remains connected |
| Subscription repeated | Same connection subscribes twice | Idempotent set semantics or documented response | No accidental fan-out |
| Unsubscribe inactive URI | Cancel missing subscription | Stable documented behavior | Other subscriptions survive |

## Prove That an Update Causes a Fresh Read

The update notification carries a URI, not the new content. A client that merely updates an icon or reuses its cached resource can pass a notification-count assertion while feeding stale context to the model. Capture the causal sequence: notification observed, read issued, newer body stored, and only then next agent turn begins.

A small client-side cache makes that policy testable without a model call:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

type Reader = (uri: string) => Promise<string>;

class ResourceCache {
  private values = new Map<string, string>();

  constructor(private readonly read: Reader) {}

  async prime(uri: string): Promise<void> {
    this.values.set(uri, await this.read(uri));
  }

  async onUpdated(uri: string): Promise<void> {
    this.values.set(uri, await this.read(uri));
  }

  get(uri: string): string | undefined {
    return this.values.get(uri);
  }
}

test('re-reads the invalidated URI before exposing it', async () => {
  let revision = 1;
  const reads: string[] = [];
  const cache = new ResourceCache(async (uri) => {
    reads.push(uri);
    return \`revision=\${revision}\`;
  });

  await cache.prime('qa://runbooks/deploy');
  revision = 2;
  await cache.onUpdated('qa://runbooks/deploy');

  assert.deepEqual(reads, ['qa://runbooks/deploy', 'qa://runbooks/deploy']);
  assert.equal(cache.get('qa://runbooks/deploy'), 'revision=2');
});
\`\`\`

For an AI host, replace the final cache assertion with a deterministic prompt assembly assertion. Avoid asking an LLM whether the content looks fresh. Inspect the exact context bytes or a stable resource revision supplied to the model gateway. A model answer is probabilistic and can repeat old facts from prior messages even when the host refreshed correctly.

If the product keeps conversation memory, test both context layers. Updating a resource does not erase an earlier assistant message. Your oracle should state which wins when the new resource contradicts conversation history. That is an agent product decision, not an MCP transport guarantee.

## Exercise Bursts, Coalescing, and Read-Update Races

Updates rarely arrive one at a time in production. A repository watcher can produce several filesystem events for one save. A database transaction can modify related records. An operator can publish revision 8 while a client is still reading revision 7. The quality goal is freshness and bounded work, not necessarily one read per notification.

Choose and document a client policy:

| Burst policy | Behavior | Useful assertion | Tradeoff |
|---|---|---|---|
| Read every notice | One read per update message | Read count equals notice count | Simple, potentially wasteful |
| Coalesce while pending | One active read plus one trailing read | Concurrent reads never exceed one | Fresh final value with bounded load |
| Debounce | Read after quiet interval | One read after configured window | Adds intentional staleness |
| Revision-aware | Ignore notice already represented locally | Stored revision never decreases | Requires revision metadata in content or app layer |

The following coalescer is runnable and demonstrates the subtle trailing-read rule. If an update arrives during a read, finishing that read is not enough because its snapshot may predate the second update.

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

class RefreshCoalescer {
  private running = false;
  private dirty = false;

  constructor(private readonly refresh: () => Promise<void>) {}

  async invalidate(): Promise<void> {
    this.dirty = true;
    if (this.running) return;
    this.running = true;
    try {
      while (this.dirty) {
        this.dirty = false;
        await this.refresh();
      }
    } finally {
      this.running = false;
    }
  }
}

test('performs a trailing refresh after an update during a read', async () => {
  let releaseFirst: (() => void) | undefined;
  let calls = 0;
  const firstRead = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const coalescer = new RefreshCoalescer(async () => {
    calls += 1;
    if (calls === 1) await firstRead;
  });

  const first = coalescer.invalidate();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await coalescer.invalidate();
  assert.equal(calls, 1);
  releaseFirst?.();
  await first;

  assert.equal(calls, 2);
});
\`\`\`

Run burst tests with deterministic barriers, not sleeps. A test that waits 100 milliseconds and hopes the first read is in flight will flicker under CI load. The unresolved promise above creates the exact race and releases it deliberately.

## Keep URI Identity and Tenant Isolation Exact

Resource URIs are identifiers interpreted by the server. Do not normalize them in a generic test helper unless the server's URI rules explicitly require it. Case changes, percent decoding, query sorting, or dropping fragments can merge distinct resources. The strongest isolation suite uses identifiers that look deceptively similar.

Create subscriptions for \`tenant://acme/runbook\`, \`tenant://acme/runbook?locale=en\`, and \`tenant://acme-2/runbook\`. Mutate each in turn and assert an exact recipient matrix. Include two connections for one URI to prove fan-out, and two URIs on one connection to prove independent cancellation.

This self-contained recipient test catches both prefix matching and unsubscribe-all bugs:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

class Subscriptions {
  private byUri = new Map<string, Set<string>>();

  add(client: string, uri: string): void {
    const set = this.byUri.get(uri) ?? new Set<string>();
    set.add(client);
    this.byUri.set(uri, set);
  }

  remove(client: string, uri: string): void {
    this.byUri.get(uri)?.delete(client);
  }

  recipients(uri: string): string[] {
    return [...(this.byUri.get(uri) ?? [])].sort();
  }
}

test('uses exact URI identity and targeted unsubscribe', () => {
  const subscriptions = new Subscriptions();
  subscriptions.add('a', 'tenant://acme/runbook');
  subscriptions.add('b', 'tenant://acme/runbook');
  subscriptions.add('a', 'tenant://acme/runbook?locale=en');

  subscriptions.remove('a', 'tenant://acme/runbook');

  assert.deepEqual(subscriptions.recipients('tenant://acme/runbook'), ['b']);
  assert.deepEqual(
    subscriptions.recipients('tenant://acme/runbook?locale=en'),
    ['a'],
  );
  assert.deepEqual(subscriptions.recipients('tenant://acme-2/runbook'), []);
});
\`\`\`

On the server, disconnect cleanup deserves a resource-leak assertion. Open and close many test connections, then inspect a supported diagnostic such as active subscription count, heap profile, or test-only adapter state. Do not demand a production-only introspection endpoint. The externally visible requirement is that closed clients stop receiving messages and new clients do not inherit their subscriptions.

## Test Reconnect as a New Session

Subscriptions are associated with protocol connection state unless a particular product explicitly documents durable restoration. A network reconnect should therefore trigger a deliberate client decision: renegotiate capabilities, restore the desired subscription set, then refresh resources whose freshness is uncertain.

Use a controllable transport seam. Complete initialization and subscription, sever the channel without a graceful unsubscribe, mutate the resource, and connect again. Assert that no message is somehow delivered on the dead connection. After the new initialization completes, assert the client resubscribes exactly once and reads the current revision. If resubscription is a host feature, test it as host behavior rather than claiming the server preserved protocol state.

A reconnect ledger can be validated with a tiny executable reducer:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

type Event =
  | { kind: 'wanted'; uri: string }
  | { kind: 'connected' }
  | { kind: 'disconnected' };

function subscriptionCommands(events: Event[]): string[] {
  const wanted = new Set<string>();
  let connected = false;
  const sent: string[] = [];
  for (const event of events) {
    if (event.kind === 'wanted') {
      wanted.add(event.uri);
      if (connected) sent.push(event.uri);
    } else if (event.kind === 'connected') {
      connected = true;
      sent.push(...[...wanted].sort());
    } else {
      connected = false;
    }
  }
  return sent;
}

test('restores desired subscriptions after reconnect', () => {
  const sent = subscriptionCommands([
    { kind: 'wanted', uri: 'qa://a' },
    { kind: 'connected' },
    { kind: 'disconnected' },
    { kind: 'connected' },
  ]);
  assert.deepEqual(sent, ['qa://a', 'qa://a']);
});
\`\`\`

Add a generation number in a real client implementation so callbacks from an old transport cannot mutate the new session's cache. The test should hold an old read open, reconnect, complete a new read, then release the old one. The cache must retain the new session's result. This is a classic stale completion bug: message ordering looks correct in each connection, but asynchronous completion crosses the boundary.

## Diagnose the Failure Where the Chain Breaks

A realistic failure often looks like this: the server log says it emitted an update, the test recorder sees it, but the agent still answers from revision 12 after revision 13 was published. Counting notifications will produce a false green.

Diagnose it in order:

1. Confirm initialization advertised \`resources.subscribe: true\` on the same connection.
2. Compare the subscribed URI with the notified URI. Require byte-for-byte equality only when the server contract promises it, since a server may legitimately notify about a sub-resource of the URI you subscribed to; otherwise accept documented sub-resource URIs and re-read the URI that was actually notified.
3. Confirm the notification has no request ID and uses the documented method.
4. Confirm the client schedules a read after receiving it.
5. Confirm the read response contains revision 13.
6. Confirm the cache accepts revision 13 rather than losing a race to an older read.
7. Confirm prompt assembly uses revision 13 for the next model request.

Suppose step 4 is missing. The likely defect is that the host treated the notification as informational UI state rather than cache invalidation. Suppose step 5 succeeds but step 6 fails after reconnect. The likely defect is an old asynchronous read overwriting new state. Those diagnoses point to different owners and regression tests.

Another common failure is an update storm after one file save. Inspect the server's domain watcher before blaming MCP delivery. The notification protocol does not promise storage-event deduplication. Decide whether the server coalesces domain events or the client coalesces refreshes, then assert the chosen boundary.

## What Teams Get Wrong About Resource Updates

The most damaging misconception is “notification received equals current context.” It does not. The notification says a named resource changed; freshness requires another read and correct cache replacement. This distinction should appear in the test name and telemetry.

Teams also confuse resource-list changes with resource-content changes. \`notifications/resources/list_changed\` tells a client to discover the available set again. \`notifications/resources/updated\` identifies a subscribed resource whose contents changed. Testing one does not cover the other.

Avoid exact notification-count assertions unless the server contract promises them. Coalescing two rapid writes into one invalidation can be correct, and delivering two invalidations can also be correct, provided the client reaches the final state within the defined freshness target. Assert minimum necessary delivery, bounded amplification, and eventual final revision.

Finally, do not make the model response the only oracle. Keep a deterministic protocol transcript, resource revision, cache trace, and prompt-context record. The model layer can then have a small semantic test, while most defects receive precise and reproducible evidence.

## Operate the Suite in CI and Agent Workflows

Split the suite by scope. A fast state-model suite runs on every change. A wire compatibility suite launches the real server transport and checks exact JSON-RPC exchanges. A host integration suite validates refresh and prompt assembly. A short soak test creates update bursts and reconnects while watching memory and read amplification.

| Suite | Main evidence | Suggested trigger | Defects caught |
|---|---|---|---|
| State model | Transitions and recipients | Every commit | Bookkeeping and isolation |
| Protocol wire | Recorded JSON-RPC messages | Every server change | Shape, direction, capability drift |
| Host integration | Cache revision and context bytes | Every host change | Stale reads and prompt assembly |
| Reconnect race | Generation-aware final state | Nightly or targeted | Cross-session stale completion |
| Burst soak | Final revision, read count, memory | Scheduled | Amplification and cleanup leaks |

Use unique resource URIs per CI worker so parallel jobs cannot consume one another's events. Shell names must use braces around adjacent variables, for example \`RESOURCE_URI="qa://ci/\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"\`. Record the resolved URI in failure output, but never include secrets or access tokens in it.

An AI coding agent can help generate transition cases from the state table, but review every generated method name against the pinned protocol schema. Give the agent a captured initialization response and transcript rather than asking it to recall the protocol from memory. Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when a team wants a reusable workflow.

The release gate should answer one operational question: after any subscribed resource changes, can the next relevant agent turn be proven to use an authorized current representation without duplicate work growing unbounded? If the evidence covers every link in that sentence, the subscription feature is tested rather than merely exercised.

## Frequently Asked Questions

### Does an MCP resource update notification include the new content?

No. The resource update notification identifies the URI that changed. The client should treat it as invalidation and issue \`resources/read\` for that URI according to its refresh policy. Test the notification and the subsequent fresh read as separate observations. If a host immediately starts another agent turn without refreshing, it can still use stale context even though the protocol message arrived correctly. Keep a revision or content hash in test fixtures so the final cache and prompt context can be checked deterministically.

### Should every resource update produce exactly one client read?

Not necessarily. A client may coalesce notifications while a read is pending or debounce a burst, provided its documented behavior reaches the latest state within the freshness objective. Exact one-to-one counting can reject efficient implementations. A better oracle proves at least one refresh after invalidation, no unbounded concurrent reads, and eventual storage of the final revision. If your product contract explicitly promises one read per notice, then count them, but recognize that this is a product policy rather than the core invalidation meaning.

### How do I test subscriptions across a reconnect?

Treat the new transport connection as a new negotiated session. Disconnect after subscribing, mutate the resource, reconnect, initialize again, and observe whether the host restores its desired subscriptions. Then require a fresh read because notifications missed during disconnection may not be replayed. Hold an old read open during this flow to catch stale completion overwriting the new cache. The test should distinguish server protocol behavior from a host convenience feature that remembers and restores subscription intent.

### What is the most useful assertion for an AI agent using subscribed resources?

Assert the exact resource revision or content bytes included in the next model request. That is stronger than checking a notification counter and more deterministic than judging the model's natural-language answer. Pair it with authorization evidence, the notification URI, and the read response revision. This gives a causal record from domain mutation to agent context. A small end-to-end semantic check can remain, but it should complement the deterministic context assertion rather than replace it.
`,
};
