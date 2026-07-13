import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing Push-Notification Deep Links",
  description:
    "Test push-notification deep links across foreground, background, terminated, authenticated, expired, and invalid routes with reliable mobile test evidence.",
  date: "2026-07-13",
  category: "Guide",
  content: `
# Testing Push-Notification Deep Links

The device is locked when an order notification arrives. The user taps it, unlocks, and expects order 4821, not the home screen and not a second copy of the app. That cold-start route crosses the push provider, operating system, application lifecycle, authentication gate, and navigation stack.

## Draw the delivery-to-route pipeline

A notification deep link is not one feature. The backend selects a target, the provider transports a payload, the OS displays or delivers it, the app receives a tap callback, a parser validates the destination, and the router resolves it against current user state.

| Boundary | Evidence to capture | Typical defect |
|---|---|---|
| Backend event -> payload | Message ID, route type, entity ID | Wrong tenant or stale identifier |
| Provider acceptance | Provider response identifier | Accepted request confused with device delivery |
| OS presentation | Visible title and tap target | Data-only message not displayed as expected |
| Tap callback | Sanitized payload and lifecycle state | Callback registered too late on cold start |
| Route resolver | Typed internal destination | Unvalidated arbitrary URI accepted |
| Screen | Heading and entity identity | App opens default tab instead |

Separate transport assertions from navigation assertions. A provider returning success proves it accepted a message, not that a particular phone displayed it.

## Build the lifecycle matrix before automating

At minimum, exercise foreground, background, and terminated application states. Add locked device and permission states when they are product requirements.

| App state at receipt/tap | Expected presentation | Expected navigation risk |
|---|---|---|
| Foreground | In-app banner or handled callback | Duplicate routing from banner and push callback |
| Background | System notification | Existing navigation stack must resume correctly |
| Terminated | System notification | Initial payload can be consumed before router is ready |
| Locked device | System presentation | Protected content and unlock transition |
| Notification permission denied | No system alert | In-app inbox or graceful absence |

Test both receipt and tap. A foreground app may receive data without a tap, while a background notification route usually begins from user interaction.

## Use a typed internal destination

Avoid letting arbitrary URLs flow directly from a push payload into a web view or router. Parse an allowlisted route name plus constrained identifiers, or validate HTTPS universal links against owned hosts and known paths.

\`\`\`ts
type PushData = Record<string, string | undefined>;

type Destination =
  | { screen: 'OrderDetails'; orderId: string }
  | { screen: 'InboxMessage'; messageId: string }
  | { screen: 'Home' };

export function destinationFromPush(data: PushData): Destination {
  if (data.type === 'order' && /^ord_[a-z0-9]+$/.test(data.orderId ?? '')) {
    return { screen: 'OrderDetails', orderId: data.orderId! };
  }
  if (data.type === 'message' && /^msg_[a-z0-9]+$/.test(data.messageId ?? '')) {
    return { screen: 'InboxMessage', messageId: data.messageId! };
  }
  return { screen: 'Home' };
}
\`\`\`

Unit-test that parser aggressively:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { destinationFromPush } from './push-destination';

describe('destinationFromPush', () => {
  it('maps a valid order target', () => {
    expect(destinationFromPush({ type: 'order', orderId: 'ord_4821' })).toEqual({
      screen: 'OrderDetails',
      orderId: 'ord_4821',
    });
  });

  it.each([
    { type: 'order' },
    { type: 'order', orderId: '../admin' },
    { type: 'https://attacker.example' },
    { type: 'unknown', orderId: 'ord_4821' },
  ])('falls back safely for invalid data %j', (data) => {
    expect(destinationFromPush(data)).toEqual({ screen: 'Home' });
  });
});
\`\`\`

The fallback can be a notification inbox instead of Home. What matters is that invalid input never becomes arbitrary navigation or a crash.

## Test the backend payload contract independently

Provider APIs differ, but the application payload should have a versioned, testable schema. Do not make screen copy the sole route key because marketing edits can break navigation.

\`\`\`json
{
  "notification": {
    "title": "Order shipped",
    "body": "Order 4821 is on the way"
  },
  "data": {
    "schemaVersion": "2",
    "type": "order",
    "orderId": "ord_4821"
  }
}
\`\`\`

| Payload field | Contract check |
|---|---|
| \`schemaVersion\` | Supported version or safe fallback |
| \`type\` | Allowlisted route discriminator |
| Entity ID | Correct format and tenant ownership resolved server-side |
| Title/body | No sensitive lock-screen content beyond policy |
| Collapse or message key | Deduplication semantics documented |
| Expiry/TTL | Stale message behavior aligns with business event |

The [webhook testing guide](/blog/webhook-testing-complete-guide-2026) is useful for backend event delivery patterns, but a push provider and mobile tap are distinct boundaries. Do not label provider acceptance as an end-to-end mobile test.

## Foreground behavior needs a single routing owner

When the app is active, the push SDK callback may show an in-app banner. If the user taps that banner, only the banner handler should navigate. A generic notification-open listener should not process the same message again.

Inject a fake notification event into the app's adapter, assert one banner, tap it, and inspect the navigation spy. Also deliver the same message ID twice to verify deduplication if the provider can redeliver or your event bridge can reconnect.

\`\`\`ts
it('opens one order screen from a foreground banner', async () => {
  const navigate = vi.fn();
  const notifications = createFakeNotificationSource();
  const controller = createPushController({ notifications, navigate });
  controller.start();

  notifications.receive({
    id: 'push-77',
    data: { type: 'order', orderId: 'ord_4821' },
  });
  await controller.tapBanner('push-77');

  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 'ord_4821' });
});
\`\`\`

These controller names are application test seams, not vendor APIs. Wrap the provider SDK behind a narrow adapter so unit tests do not pretend to emulate the operating system.

## Background taps must preserve a sensible stack

If the app is already on Settings and a push opens an order, decide what Back does. Usually it should return to the prior authenticated screen or a stable app root, not exit unexpectedly and not reopen the order.

Assert the destination, selected tab, app bar title, and Back result. Also check that tapping the same notification from the system tray does not push duplicate detail screens when the app is already displaying that order.

| Starting screen | Push target | Expected Back destination |
|---|---|---|
| Home | Order details | Home |
| Settings | Inbox message | Product-defined prior screen or inbox root |
| Same order details | Same order | No duplicate route |
| Different order details | New order | Previous detail or list, based on navigation policy |

Navigation policy must be documented because iOS and Android task-stack conventions differ.

## Terminated launch exposes initialization races

On cold start, the initial notification payload may be available before authentication restoration, remote configuration, or the navigation container is ready. Queue one validated destination and consume it after prerequisites complete.

Test three timings: payload available immediately, payload callback delayed, and router readiness delayed. The final navigation should occur once. Restart the app process between cases; backgrounding is not a cold start.

For black-box mobile automation, use the platform's supported simulator or device tooling to terminate and launch the application, then send a test push through a non-production project. Emulator push support and commands vary by platform and provider, so keep provider-specific mechanics in a thin test harness rather than claiming one universal CLI.

## Authentication changes the target resolution

A deep link to private content cannot bypass login. Store a sanitized pending destination, authenticate, authorize access to the entity, then navigate. If login is cancelled, clear or retain the pending target according to product policy.

| User state | Target ownership | Expected result |
|---|---|---|
| Signed in | Authorized | Open target |
| Signed out | Potentially authorized | Login, then resolve target |
| Signed in as wrong tenant | Unauthorized | Safe error or home, no data leak |
| Account disabled | None | Authentication failure, no target metadata |
| Session expires during launch | Unknown | Reauthenticate before fetching entity |

Do not put sensitive entity names in an unauthorized error. Even confirming that an order ID exists can leak cross-tenant information.

## Stale, deleted, and malformed targets are normal inputs

Notifications can outlive the entity they reference. An order may be deleted, a message may expire, or an app version may not recognize a new route type. These are expected operational states, not exceptional crashes.

Test unknown version, missing ID, invalid ID characters, deleted entity, expired event, unsupported feature flag, and valid ID belonging to another user. The application should route to a stable fallback with clear copy and offer a path forward.

Expired transport TTL prevents some stale deliveries but cannot guarantee business freshness. Validate current authorization and existence when opening the target.

## Universal links and custom schemes need security cases

If push data carries a URL, constrain scheme, host, path, query length, and allowed parameters. Reject lookalike hosts, user-info tricks, encoded traversal, dangerous schemes, and open-redirect destinations.

| Input | Expected handling |
|---|---|
| \`https://app.example.com/orders/4821\` | Resolve allowed route |
| \`https://app.example.com.evil.test/orders/4821\` | Reject host |
| \`javascript:alert(1)\` | Reject scheme |
| \`myapp://orders/4821\` | Accept only if custom scheme is supported and parsed |
| Path with encoded traversal | Reject during canonical validation |

Use the URL parser provided by the platform or language, not substring matching.

## Permissions and device tokens belong in the wider suite

Navigation tests can inject tap intents without repeatedly contacting a push network. A smaller end-to-end suite should cover registration permission, device-token upload, token refresh, provider send, visible notification, and tap.

The [API testing best-practices guide](/blog/api-testing-best-practices-guide) helps structure backend checks. For push specifically, ensure test device tokens never enter production campaigns and production tokens never enter test logs.

## Capture useful evidence without leaking content

Assign a correlation ID from backend event to provider request and app receipt. Log lifecycle state, payload schema version, resolved route type, and fallback reason. Hash or omit device tokens and sensitive entity identifiers.

Screenshots show presentation and destination, while structured logs prove which message drove the route. Video is useful for cold-start races. Provider dashboards can support diagnosis but are not the sole source of truth.

## Keep automation layered

| Layer | Fast checks | What it cannot prove |
|---|---|---|
| Parser unit tests | Valid, malformed, hostile payloads | OS delivery |
| Navigation integration | Lifecycle queue and auth gating | Provider transport |
| Backend contract | Correct route data and privacy | Device receipt |
| Simulator/device E2E | Presentation, tap, final screen | All real-device vendor conditions |
| Small physical-device run | Production-like delivery path | Broad deterministic permutations |

Most permutations belong below end to end. Reserve real pushes for representative lifecycle and platform cases because provider delivery adds latency and external uncertainty.

## A release-focused scenario set

For each supported platform, cover foreground banner, background tap, cold-start tap, signed-out continuation, invalid target, unauthorized entity, duplicate message, and stale entity. Add notification permission denial and locked-screen privacy where required. Verify Back behavior and analytics exactly once per tap.

When navigation architecture changes, rerun the entire lifecycle matrix. A route that works from an in-app link can still fail when the app starts from no mounted navigator.

## Extend the plan across delivery and navigation edge cases

Notification replacement and collapse behavior can change which deep link survives. Send two updates with the same collapse identity but different order states, then verify the displayed notification opens the newest valid destination. If the product intentionally keeps both notifications, tapping each must open its own entity rather than a globally cached “last payload.”

Badge counts and notification-center state should reconcile with navigation. Opening one message may mark it read and decrement a badge. Assert idempotency when the same push is tapped twice or the app also fetches an unread-count update. A deep link that routes correctly but double-decrements state is still defective.

Localization affects payload length and truncation, not route identity. Send a supported non-Latin title and body while keeping typed data fields stable. Verify the destination and visible characters. Never parse the localized notification body to obtain an entity identifier.

App upgrades create schema compatibility risk. A notification sent before upgrade may be tapped after the new version launches, and a newer backend may send a route an older app does not know. Test N-1 payloads against the current app and current payloads against the oldest supported app where the release process allows it. Versioned fallback prevents crashes.

Multiple accounts on one device require explicit ownership. If the active account differs from the account targeted by the notification, decide whether to switch accounts, request authentication, or show a neutral message. Do not reveal the other account's order title on the lock screen or in an in-app error.

Device restoration and cloned installations can leave stale tokens registered. Backend tests should remove invalid provider tokens after terminal provider responses according to provider guidance, without deleting a newly refreshed token for the same installation. This is delivery hygiene, separate from route parsing.

Offline taps need a two-stage result. The app can parse and show a cached shell, but fetching the entity may fail. Display a recoverable offline state, retain the validated destination, and navigate once connectivity returns only if the user has not moved elsewhere. An automatic delayed navigation after the user abandons the screen is surprising.

Analytics should record one “notification opened” event with message campaign metadata and resolved route category. It should not include raw device tokens or sensitive message bodies. Cold-start initialization often causes duplicate analytics because both the initial-payload path and general open listener fire; include exact event-count assertions.

Accessibility coverage should check the in-app banner's announcement, focus behavior after navigation, and accessible screen title. System notification accessibility is largely owned by the OS, but the supplied title and body must remain meaningful without visual context. Do not rely only on an image or emoji to convey the event.

Finally, rehearse provider outage and delayed delivery. A delayed notification may refer to completed or cancelled work. The app must resolve current server state rather than rendering the payload as authoritative. Backend retries should use provider idempotency or message identifiers where available and should not create a notification storm after recovery.

Test action buttons separately from tapping the notification body. Approve, Reply, or Mark read can perform background work without following the standard destination. Every action needs authentication, idempotency, and stale-entity behavior.

Grouped notifications add a second route. Tapping a summary should open an inbox or group view, while tapping a child should open that entity. The summary must never inherit an arbitrary child's identifier.

Platform lifecycle details remain important. Android task launch modes can create duplicate activity instances, and iOS scenes can direct a URL to a particular window. Keep platform-specific assertions for instance count, final screen, and Back behavior around the shared parser tests.

Clear the tray and application data only where scenario isolation needs it. A duplicate-delivery test requires both events, while a cold-start test requires the process terminated but the registration token preserved.

Maintain exploratory coverage for OEM battery restrictions, focus modes, notification channels, and lock-screen policies that simulators cannot reproduce faithfully. Record the device model and OS build with evidence.

## Frequently Asked Questions

### Can an emulator provide a true push-notification end-to-end test?

It can cover much of the path when the platform and provider support emulator delivery, but device services and vendor behavior differ. Keep a small physical-device check for the release risks that require it.

### What should happen when a push targets an entity the user cannot access?

The app should navigate to a safe, non-revealing state and avoid confirming sensitive entity details. It must never treat possession of the deep link as authorization.

### How do I test a terminated-state notification reliably?

Terminate the application process, arrange the push, tap the system notification, and wait on a semantic destination assertion. Backgrounding alone does not exercise cold-start initialization.

### Should the payload contain a raw URL or a route name?

A typed route discriminator with validated identifiers is easier to constrain. If URLs are required, allowlist schemes, hosts, paths, and parameters through a real URL parser.

### How can I detect duplicate navigation from one notification?

Record a stable message ID, assert one route action and one analytics event, and verify that foreground, tap, and initial-payload handlers share deduplication ownership.
`,
};
