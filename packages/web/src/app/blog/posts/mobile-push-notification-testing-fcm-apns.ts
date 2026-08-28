import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Mobile Push: FCM, APNs, Token Refresh, and Silent Pushes',
  description:
    'Ship mobile push notification testing for FCM and APNs with token lifecycle checks, silent vs alert payloads, and CI fixtures without flaky delivery.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Mobile Push: FCM, APNs, Token Refresh, and Silent Pushes

Mobile push notification testing is the practice of proving that your backend can mint, store, refresh, and invalidate device registration tokens, that outbound payloads match the FCM and APNs contracts your clients expect, and that alert versus silent deliveries, deeplinks, badges, and permission-denied paths behave under controlled fixtures instead of hoping a physical phone rings in CI. You treat Firebase Cloud Messaging and Apple Push Notification service as HTTP providers with recorded responses, then optionally verify receipt on a device lab. This guide is for QA engineers, mobile platform owners, and backend teams who own the send path.

Push looks simple from a product ticket ("send a badge and open the order screen") and becomes a distributed system the moment you touch tokens, sandbox versus production credentials, collapse identifiers, and provider error codes like Unregistered. The suites that survive are the ones that separate contract proof from delivery theater.

## A failure that looked like "Android is broken"

A marketplace team shipped a new "order ready" push. Product demos on two company phones looked perfect. Staging had a small device allowlist. On launch day, Android complaint volume spiked while iOS looked fine. The on-call dashboard showed FCM HTTP 200s. Support screenshots showed no notification shade entries. Engineering spent half a day blaming OEM battery savers.

The real bug was quieter. A client release had started storing the FCM registration token in an encrypted preference keyed by install id. After a force-stop plus clear-data path used by a large OEM "optimize storage" job, the app minted a new token and posted it to \`/devices/register\`, but the backend upsert used \`user_id\` alone as the primary key and overwrote the previous row. That part was intended. The defect was that the old token remained subscribed to a topic used for broadcast-style "order ready" fanout, and the send job still preferred the topic path for a subset of restaurants. Topic membership outlived the device row. New installs received nothing useful on the personal path; stale tokens either no-oped or produced Unregistered that nobody correlated to the user.

What people get wrong in that story is treating "provider accepted the message" as "the right human saw the right UI." Acceptance at FCM or APNs is only one hop. Token ownership, topic hygiene, payload shape, and client permission state are separate hops. Mobile push notification testing has to name each hop and give it an owner, or incidents keep looking like platform flakiness.

## Unique map: contracts first, phones last

Most push "test plans" start with a checklist phone and a console send button. Invert that. Use this order and keep each layer green before you spend device time:

1. Payload schema contracts for notification versus data messages, platform-specific keys, and deeplink fields.
2. Provider response stubs for success, invalid token / Unregistered, auth failures, and rate or quota style rejections with backoff.
3. Token lifecycle tests: mint, refresh on reinstall, invalidate, multi-device same user, topic subscribe and unsubscribe bookkeeping.
4. Staging sends to a named allowlist of test devices with recorded correlation ids.
5. Optional device-lab receipt checks (UI shade, silent handler side effects) via tooling such as Appium, never as the only PR gate.

Official references worth keeping in plain text beside the suite: Firebase Cloud Messaging HTTP docs (https://firebase.google.com/docs/cloud-messaging) and Apple Push Notification service docs (https://developer.apple.com/documentation/usernotifications). Prefer describing HTTP contracts and well-known concepts over inventing SDK method names or pinning fake library versions.

For a broader mobile automation context when you do need on-device receipt checks, see [/blog/appium-mobile-testing-complete-guide](/blog/appium-mobile-testing-complete-guide). For the browser permission parallel (grant, deny, blocked, quiet failures), see [/blog/web-push-notification-testing-permissions](/blog/web-push-notification-testing-permissions).

## Payload schema contracts: data versus notification

FCM distinguishes notification messages (the SDK or system may present UI) from data messages (your app code is expected to handle the map). APNs uses an \`aps\` dictionary with alert content, or omits visible alert fields when you intend a silent update with \`content-available\`. Your contract tests should freeze the JSON your sender emits before any network call, then separately freeze how you interpret provider responses.

Define a single canonical outbound DTO in the backend and assert serialization for both platforms. Do not let Android and iOS teams invent parallel envelope shapes that drift.

\`\`\`ts
// Contract: canonical send intent -> platform envelopes (illustrative shapes)
import assert from 'node:assert/strict';

type PushIntent = {
  userId: string;
  collapseId: string;
  title?: string;
  body?: string;
  deeplink: string;
  badge?: number;
  silent: boolean;
  data: Record<string, string>;
};

function toFcmMessage(intent: PushIntent) {
  if (intent.silent) {
    return {
      token: 'TEST_REGISTRATION_TOKEN',
      android: { priority: 'normal', collapseKey: intent.collapseId },
      data: {
        ...intent.data,
        deeplink: intent.deeplink,
        silent: '1',
      },
    };
  }
  return {
    token: 'TEST_REGISTRATION_TOKEN',
    android: { priority: 'high', collapseKey: intent.collapseId },
    notification: { title: intent.title, body: intent.body },
    data: { ...intent.data, deeplink: intent.deeplink },
  };
}

function toApnsPayload(intent: PushIntent) {
  const aps = intent.silent
    ? { 'content-available': 1 }
    : {
        alert: { title: intent.title, body: intent.body },
        sound: 'default',
        badge: intent.badge ?? 1,
      };
  return {
    aps,
    deeplink: intent.deeplink,
    ...intent.data,
  };
}

const intent: PushIntent = {
  userId: 'u_1',
  collapseId: 'order-ready-42',
  title: 'Order ready',
  body: 'Pickup at bay 3',
  deeplink: 'app://orders/42',
  badge: 2,
  silent: false,
  data: { orderId: '42' },
};

const fcm = toFcmMessage(intent);
assert.equal(fcm.android?.collapseKey, 'order-ready-42');
assert.equal(fcm.data?.deeplink, 'app://orders/42');
assert.ok(fcm.notification);

const silent = toApnsPayload({ ...intent, silent: true, title: undefined, body: undefined });
assert.equal((silent.aps as { 'content-available': number })['content-available'], 1);
assert.equal('alert' in (silent.aps as object), false);
\`\`\`

Add negative schema cases the product will actually hit: missing deeplink, empty title with a non-silent flag, non-string data values (FCM data maps are stringly), badge below zero, collapse id longer than your policy allows. Contract tests fail in milliseconds and catch the class of bugs that demos never show.

| Envelope field | Alert push expectation | Silent push expectation |
| --- | --- | --- |
| FCM \`notification\` block | Present with title/body when you want system UI | Usually omitted; put signals in \`data\` |
| FCM \`data\` map | String values only; include deeplink | String values; include explicit silent marker if clients need it |
| APNs \`aps.alert\` | Present for user-visible alerts | Absent for true silent updates |
| APNs \`content-available\` | Optional | \`1\` for background fetch style silent |
| Collapse / collapse id | Same logical event shares id | Same; silent storms still need coalescing |
| Priority headers (concept) | High when user-visible urgency matters | Normal / conserving when background sync |

Keep a second table for provider-facing headers and identifiers you must not invent in clients:

| Concept | FCM side (conceptual) | APNs side (conceptual) |
| --- | --- | --- |
| Device address | Registration token | Device token (hex) |
| Environment | Project / app config | Sandbox vs production host and cert/key |
| Coalesce | Collapse key | \`apns-collapse-id\` |
| Push type | Implied by payload | \`apns-push-type\` (alert vs background, etc.) |
| Priority | Android priority / HTTP options | \`apns-priority\` (10 vs 5 conceptually) |
| Failure: dead token | Unregistered / invalid token style errors | Gone / BadDeviceToken class outcomes |

## Stubbing provider responses (and why raw 200 is not enough)

Your send service should depend on a narrow HTTP port. In tests, stub that port with recorded fixtures. Assert that your code maps provider failures into domain outcomes: drop token, mark device inactive, retry with backoff, or route to dead-letter with operator visibility.

\`\`\`ts
// Illustrative provider port + stubbed outcomes (no invented SDK calls)
type ProviderResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; kind: 'unregistered' | 'rate_limited' | 'auth' | 'payload'; retryAfterMs?: number };

type PushProvider = {
  send(input: { platform: 'fcm' | 'apns'; token: string; body: unknown }): Promise<ProviderResult>;
};

async function deliverWithPolicy(
  provider: PushProvider,
  device: { platform: 'fcm' | 'apns'; token: string; body: unknown },
  hooks: { invalidateToken: (t: string) => Promise<void>; sleep: (ms: number) => Promise<void> },
) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await provider.send(device);
    if (result.ok) return result;
    if (result.kind === 'unregistered') {
      await hooks.invalidateToken(device.token);
      return result;
    }
    if (result.kind === 'rate_limited') {
      const delay = result.retryAfterMs ?? 250 * attempt * attempt;
      await hooks.sleep(delay);
      continue;
    }
    return result; // auth/payload: do not spin
  }
  return { ok: false as const, kind: 'rate_limited' as const };
}

const calls: string[] = [];
const provider: PushProvider = {
  async send() {
    calls.push('send');
    if (calls.length < 3) return { ok: false, kind: 'rate_limited', retryAfterMs: 1 };
    return { ok: true, providerMessageId: 'msg_test_1' };
  },
};

const out = await deliverWithPolicy(
  provider,
  { platform: 'fcm', token: 't1', body: {} },
  {
    invalidateToken: async () => undefined,
    sleep: async () => undefined,
  },
);
\`\`\`

Record fixtures as JSON files checked into the repo. Name them by provider and outcome so CI is deterministic:

\`\`\`json
{
  "name": "fcm-unregistered",
  "httpStatus": 404,
  "body": {
    "error": {
      "status": "NOT_FOUND",
      "details": [{ "errorCode": "UNREGISTERED" }]
    }
  },
  "expectedDomain": {
    "invalidateToken": true,
    "retry": false
  }
}
\`\`\`

\`\`\`json
{
  "name": "apns-gone-device",
  "httpStatus": 410,
  "headers": { "apns-id": "00000000-0000-0000-0000-000000000001" },
  "body": { "reason": "Unregistered" },
  "expectedDomain": {
    "invalidateToken": true,
    "retry": false
  }
}
\`\`\`

People often stub only the happy path and then "test errors" by turning off Wi-Fi on a laptop. That confuses transport failures with provider semantics. Unregistered means delete or rotate the token row. Auth failures mean stop the job and page credentials. Rate-style rejection means backoff. Payload errors mean fix the sender, not the phone.

## Token lifecycle: mint, refresh, invalidate

Tokens are not stable device serial numbers. They change on reinstall, backup restore quirks, OS updates in some paths, and explicit app data clears. Your backend must treat token rows as leased credentials with last-seen metadata.

Test these lifecycle events as first-class API cases:

1. First install registers a token for \`(userId, platform, installId)\`.
2. Second register with a new token for the same installId updates the row and retires the old token from topics.
3. Reinstall creates a new installId (or equivalent) and a new token; old token is invalidated when provider says so or after TTL policy.
4. Logout unlinks the user from the device without necessarily deleting the hardware row if you still allow anonymous marketing opt-in (product policy; test both).
5. Provider Unregistered on send marks the token inactive immediately.

\`\`\`ts
// Token store contract tests (in-memory illustrative model)
import assert from 'node:assert/strict';

type DeviceRow = {
  userId: string;
  platform: 'ios' | 'android';
  installId: string;
  token: string;
  active: boolean;
  topics: string[];
};

class DeviceRegistry {
  rows: DeviceRow[] = [];
  upsert(input: Omit<DeviceRow, 'active' | 'topics'> & { topics?: string[] }) {
    const existing = this.rows.find((r) => r.installId === input.installId);
    if (existing) {
      if (existing.token !== input.token) {
        existing.token = input.token;
        existing.topics = []; // force resubscribe after refresh
      }
      existing.userId = input.userId;
      existing.active = true;
      return existing;
    }
    const row: DeviceRow = { ...input, active: true, topics: input.topics ?? [] };
    this.rows.push(row);
    return row;
  }
  markInactive(token: string) {
    for (const r of this.rows) if (r.token === token) r.active = false;
  }
}

const reg = new DeviceRegistry();
reg.upsert({
  userId: 'u1',
  platform: 'android',
  installId: 'install_a',
  token: 'token_v1',
  topics: ['order-ready'],
});
reg.upsert({
  userId: 'u1',
  platform: 'android',
  installId: 'install_a',
  token: 'token_v2',
});
const row = reg.rows[0]!;
assert.equal(row.token, 'token_v2');
assert.deepEqual(row.topics, []);
reg.markInactive('token_v2');
assert.equal(row.active, false);
\`\`\`

Multi-device same user is where product and QA disagree. A user with a phone and a tablet should receive on both, or on a preferred device, according to an explicit rule. Encode that rule in tests: create two active rows for one \`userId\`, send a user-targeted alert, and assert the sender expands to two provider calls (or one per preferred device). Never assume "latest token wins" unless product wrote that down.

| Lifecycle event | Backend assertion | Client assertion |
| --- | --- | --- |
| Fresh install | New active row; topics empty or default set | Permission prompt path documented |
| Token refresh | Token updated; topics resubscribed | Refresh handler calls register API |
| Reinstall | New install id; old token inactive on evidence | No silent reuse of stale local cache as truth |
| Provider Unregistered | Row inactive; no further sends | Next open remints and registers |
| Logout | User unlink per policy | Local token may remain for re-login |

Sandbox versus production APNs deserves an explicit environment guard in staging. Sending a production device token to the sandbox host (or the reverse) produces confusing failures that look like "iOS push is down." Tag every test device record with \`apnsEnv: 'sandbox' | 'production'\` and fail fast in the sender if the credential set does not match.

## Silent pushes versus alert pushes

Silent pushes (background updates) exist so you can wake logic without a banner: sync a badge count, prefetch an order ticket, invalidate a cache. They are not a free always-on IPC channel. OS policies throttle them. Testing must separate "we composed a silent payload" from "the OS delivered it promptly."

For APNs, a silent style payload uses \`content-available: 1\` and omits alert UI fields, with push type and priority chosen for background delivery. For FCM, prefer data-oriented messages and document whether your Android clients handle them in foreground, background, or killed states. Your contract suite asserts composition. Your device lab asserts side effects (local DB row updated, badge set) when you choose to spend that budget.

\`\`\`ts
// Distinguish alert vs silent composition in one shared helper
type Kind = 'alert' | 'silent';

function assertApsContract(kind: Kind, aps: Record<string, unknown>) {
  if (kind === 'silent') {
    if (aps['content-available'] !== 1) throw new Error('silent requires content-available=1');
    if ('alert' in aps) throw new Error('silent must not include alert');
    if ('sound' in aps) throw new Error('silent must not include sound');
  } else {
    if (!aps.alert) throw new Error('alert push requires aps.alert');
  }
}

assertApsContract('silent', { 'content-available': 1 });
assertApsContract('alert', { alert: { title: 'Hi', body: 'There' }, sound: 'default', badge: 1 });
\`\`\`

Failure story pattern for silent pushes: a team used silent pushes to "guarantee" inventory sync every few minutes. Staging phones on power chargers worked. Production phones in Low Power Mode dropped most silent deliveries. The fix was not more silent pushes; it was server-driven sync on app foreground plus a user-visible alert only when human attention was required. Tests should document the product promise honestly: silent is best-effort.

## Collapse keys and apns-collapse-id

Collapse identifiers coalesce multiple notifications that represent the same logical slot (one "order status" tile, not twelve). Contract tests should send three intents with the same collapse id and assert the outbound messages share that id. Device-lab tests, when run, assert that the shade shows one coalesced item after rapid sends, understanding that timing is OS-dependent and flaky under load.

Do not reuse one global collapse id for unrelated events. That produces baffling UI where a payment failure replaces a shipping update. Namespace collapse ids: \`order:{id}:status\`, \`chat:{threadId}\`, and put examples in fixtures.

## Deeplink payload testing

Deeplinks are where push meets navigation. Test three layers:

1. Envelope includes the deeplink string in the agreed field (\`data.deeplink\`, custom APNs key, etc.).
2. Client router accepts the string and rejects open redirects or foreign schemes per policy.
3. Cold start, warm start, and killed start open the same destination (device lab or deep integration).

\`\`\`ts
// Router policy unit tests for push deeplinks
import assert from 'node:assert/strict';

function parseAppDeeplink(raw: string): { ok: true; path: string } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (url.protocol !== 'app:') return { ok: false, reason: 'scheme' };
  if (url.hostname !== 'orders' && url.hostname !== 'inbox') {
    return { ok: false, reason: 'host' };
  }
  return { ok: true, path: \`\${url.hostname}\${url.pathname}\` };
}

assert.equal(parseAppDeeplink('app://orders/42').ok, true);
assert.equal(parseAppDeeplink('https://evil.example/orders/42').ok, false);
assert.equal(parseAppDeeplink('app://admin/delete').ok, false);
\`\`\`

Include a malicious or malformed deeplink fixture in every contract pack. Push is an untrusted input channel even when your own server sent it, because tokens, relays, and future code paths change.

## Permission denied and provisional states

If the user denies notification permission, your client should still register a device row for silent-capable paths only when the OS allows, or skip push registration entirely per policy. The backend should tolerate users with zero active alert-capable devices. Tests must cover:

- Permission denied: no crash loops on token APIs; analytics event recorded once.
- Permission later granted: token mint and register run; a test send can succeed on staging allowlist.
- iOS provisional / quiet presentation styles if you use them: assert your UX copy and badge rules.

This is the same mental model as browser notification permissions, just with different system UI. Keep product copy and QA scripts aligned so "notifications are broken" tickets include permission state first.

## Staging sends with test devices

Maintain an allowlist table: device label, platform, token handle reference (not raw token in tickets), owner, apns environment, last successful receipt. Staging send jobs should refuse to target production tokens. Include a correlation id in data payloads so device logs and provider consoles can be joined.

\`\`\`shell
# Illustrative staging send against your own HTTP facade (tokens via env, not shell history)
export STAGING_PUSH_URL="https://staging.example.com/internal/push/test-send"
export TEST_DEVICE_ID="device_lab_android_01"

curl -sS -X POST "\$STAGING_PUSH_URL" \\
  -H "authorization: Bearer \$STAGING_INTERNAL_TOKEN" \\
  -H "content-type: application/json" \\
  -d "{
    \\"deviceId\\": \\"\$TEST_DEVICE_ID\\",
    \\"template\\": \\"order_ready\\",
    \\"correlationId\\": \\"corr_demo_001\\",
    \\"deeplink\\": \\"app://orders/42\\"
  }"
\`\`\`

Human-in-the-loop staging is fine for release candidates. It is not a substitute for PR-level contract tests. When you automate staging, store provider response bodies as artifacts keyed by correlation id.

## Rate limits, rejection, and backoff

Providers and your own edge will reject bursts. Tests should prove that a 429-like or quota-like provider result schedules retry with jittered exponential backoff, caps attempts, and does not invalidate tokens. Separately prove that Unregistered does not retry. Mixing those policies is a common production footgun: retrying dead tokens creates load and delays cleanup.

Use fake clocks in unit tests for backoff math. Use recorded fixtures for HTTP mapping. Reserve live provider soaks for a scheduled job with dedicated credentials.

| Rejection class | Token action | Retry | Page someone? |
| --- | --- | --- | --- |
| Invalid / Unregistered / Gone | Invalidate | No | No (unless rate of invalids spikes) |
| Auth / credential | None | No | Yes |
| Rate / quota / unavailable transient | None | Yes with backoff + cap | If sustained |
| Bad payload | None | No | Yes (sender bug) |

## CI that does not depend on flaky physical delivery

PR pipelines should run:

1. Schema serialization tests for FCM and APNs envelopes.
2. Provider client tests against recorded HTTP fixtures.
3. Token registry tests for refresh and multi-device expansion.
4. Deeplink router policy tests.
5. Lint that staging send code paths cannot be imported into production binaries without flags.

Optional nightly:

1. Staging allowlist send with correlation id capture.
2. Device lab receipt via Appium (notification shade text, or silent side-effect probe).
3. Topic subscribe round-trip against a non-production Firebase project or APNs key set.

If a PR is red only when a phone is offline, your gate is wrong. Move that check out of the critical path. Teams that want a lightweight checklist runner sometimes wire suite metadata through qaskills.sh / qaskills CLI so agents and humans share the same case ids; keep that as orchestration sugar, not as a replacement for assertions.

## What good coverage looks like in one sprint

Week one: freeze the outbound DTO and provider port; add fixture JSON for success, Unregistered, auth failure, and rate limit; wire invalidate versus retry policy tests.

Week two: token registry refresh and multi-device expansion; collapse id namespacing; deeplink policy tests; sandbox/production guard.

Week three: staging allowlist tooling; one Appium receipt path for alert text on a single Android and single iOS lab device; dashboards for invalidate rates.

That sequence produces trustworthy mobile push notification testing without waiting on OEM-specific shade UI for every commit.

## Operational signals worth asserting in tests or monitors

Emit metrics your tests can approximate with fakes: send attempts, provider success, invalidate counts, retry exhaustions, silent versus alert ratio, and deeplink parse failures. A sudden rise in invalidates after an app store release often means token refresh bugs, not "FCM outage." A sudden rise in payload errors after a backend deploy means schema drift. Bake those interpretations into runbooks next to the fixtures.

## Client responsibilities the backend cannot test alone

Even perfect backend contracts fail if the client mishandles:

- Showing a local notification for a data message that was already displayed by the system notification block (duplicate banners).
- Ignoring \`collapse\` semantics by posting unique local notifications for every data message.
- Hard-coding production APNs environment in debug builds.
- Caching tokens in a process global that survives user logout in memory but not in your API model.

Add thin client unit tests around those branches. Use device lab for end-to-end only when the branch involves OS permission sheets or shade rendering. Appium-based shade and cold-start routing checks belong in an optional quarantined job when the lab is unavailable, not in the default PR gate.

## Permission UX parallels from web push

Mobile and web differ in APIs, but QA language should stay aligned: granted, denied, blocked, ignored prompts, and "user said yes but OS still suppressed." Shared acceptance language for permission matrices helps when the same product org owns mobile and browser notification surfaces.

## Putting the pieces together: a minimal PR checklist

Before you merge a change to push sending or token registration:

1. Did envelope contract tests change in the same PR as payload fields?
2. Did fixture JSON cover the new provider error you handle?
3. Did token refresh clear topic state or explicitly resubscribe?
4. Did collapse ids stay namespaced?
5. Did deeplink parsing reject new schemes you did not intend?
6. Did CI remain free of physical device requirements?

If you answer no to the last question, move the device assertion to nightly and keep the PR green on fixtures.

## Frequently Asked Questions

### What belongs in PR CI for mobile push notification testing versus nightly device labs?

PR CI should prove payload schema, provider HTTP mapping with recorded fixtures, token lifecycle rules, deeplink policy, and backoff versus invalidate branching. Those checks are deterministic and fast. Nightly or labeled jobs may send to staging allowlisted devices and use Appium to assert shade text or silent side effects. If a physical radio path is required for every commit, flakes will train the team to ignore failures. Keep receipt proof valuable but non-blocking unless you have a stable device farm and retry budget.

### How should tests treat FCM registration token refresh after reinstall?

Treat reinstall as a new lease: a new token arrives, register upserts by install identifier, and old topic subscriptions tied to the previous token are not assumed to still target the human. Assert that send expansion uses only active tokens for the user, and that an Unregistered response on a stale token marks it inactive without blocking the new token. Client tests should show the refresh callback posts to your backend. Backend tests should show topic resubscribe after token mutation rather than silently inheriting stale membership.

### Why do silent pushes pass contract tests but fail to update production clients?

Because composition success is not OS delivery success. Contract tests prove \`content-available\` and the absence of alert fields, or prove an FCM data message shape. Devices in low power modes, background app refresh limits, and OEM battery policies may defer or drop silent work. Product promises should call silent delivery best-effort, with alert pushes for human-critical moments and foreground sync as the reliable path. Use device lab sampling to measure side effects, not to guarantee wall-clock delivery in CI.

### When a provider returns invalid token or Unregistered, should senders retry?

No. Invalidate or deactivate that token row, remove topic associations, and wait for the client to register a fresh token. Retrying dead tokens wastes quota and can hide cleanup bugs. Reserve retries for transient rate, timeout, or availability class responses with capped exponential backoff and jitter. Auth and payload failures also should not retry until credentials or schema are fixed. Encode each class in fixtures so policy regressions fail loudly in unit tests instead of in incident channels.
`,
};
