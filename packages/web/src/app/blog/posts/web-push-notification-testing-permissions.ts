import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Web Push: Permission Prompts, Delivery, and Expired Subscriptions',
  description: 'Web push testing guide for permission prompts, service worker delivery, expired subscriptions, and reliable notification QA workflows in CI.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Web Push: Permission Prompts, Delivery, and Expired Subscriptions

Web push testing means proving that permission state, subscription creation, server delivery, service worker handling, notification display, click behavior, and expired-subscription cleanup all work together. The direct workflow is: control browser permissions, create or mock a push subscription, send a known payload, assert the service worker processed it, and verify the app handles denied, default, and expired states without trapping the user.

If your test only clicks "Allow" once and looks for a toast, it is not enough. Push is a chain. Permission UI, browser APIs, VAPID keys, service workers, push services, backend storage, payload schemas, and notification events can each fail independently.

## The Push Chain You Actually Have to Test

Web push has more moving parts than most browser features. A user grants notification permission. The page asks a service worker registration for a \`PushSubscription\`. The backend stores the endpoint and keys. Later, the server sends an encrypted message through the browser vendor's push service. The service worker receives a \`push\` event and usually calls \`showNotification\`. A click on that notification returns through \`notificationclick\`.

That means a complete web push testing plan covers at least seven contracts:

| Contract | What to verify | Typical bug |
| --- | --- | --- |
| Permission | Default, granted, denied, and prompt timing | App keeps prompting after denial |
| Registration | Service worker is active before subscribing | Subscribe fails because no active worker exists |
| Subscription | Endpoint and keys are stored correctly | Backend saves duplicate or malformed subscription |
| Delivery | Server can send to the endpoint | VAPID mismatch or expired endpoint |
| Push handling | Worker parses payload and shows notification | Worker throws on missing field |
| Click handling | Notification opens or focuses the right page | Multiple tabs open for one click |
| Cleanup | Gone or expired subscriptions are deleted | Server retries dead endpoints forever |

The browser APIs are documented at https://developer.mozilla.org/en-US/docs/Web/API/Push_API, https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API, and https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API. Use those as the baseline, then test your product's policy decisions on top.

Push testing belongs near service worker coverage. If cache updates can break an active worker, push delivery can break too. The same lifecycle thinking from [service worker testing cache update flows](/blog/service-worker-testing-cache-update-flows) applies here, and payload validation should line up with [notification event schema testing and dedup](/blog/notification-event-schema-testing-dedup) so the client and server agree on notification identity.

## Permission States Without Manual Browser Clicking

Permission prompts are bad automation targets. Real prompt UI belongs to the browser, not your DOM, and different engines expose it differently. Good tests set permission state through the automation context, then assert how your app behaves.

For Playwright, grant notification permission before opening the page when you want the granted path. For denied behavior, clear permissions and drive the app into a denied state where the browser supports it, or isolate the permission-dependent code behind a small adapter that can be tested with controlled return values.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('shows enabled state when notifications are granted', async ({ browser }) => {
  const context = await browser.newContext();
  await context.grantPermissions(['notifications'], {
    origin: 'http://localhost:3000'
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/settings/notifications');

  await expect(page.getByRole('status')).toContainText('Notifications are enabled');
  await expect(page.getByRole('button', { name: 'Enable notifications' })).toBeDisabled();

  await context.close();
});
\`\`\`

Do not ask the browser to show a real permission prompt in every CI run. That path is worth a small exploratory check, but your regression suite should control permission state. The product behavior matters more than the pixels of the prompt.

For unit tests, wrap browser permission reads. This avoids scattering \`Notification.permission\` checks across components and gives you one place to handle unsupported browsers.

\`\`\`ts
export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function readNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
}

export function notificationCtaLabel(state: NotificationPermissionState): string {
  if (state === 'granted') {
    return 'Notifications enabled';
  }

  if (state === 'denied') {
    return 'Enable notifications in browser settings';
  }

  if (state === 'unsupported') {
    return 'Notifications are not supported';
  }

  return 'Enable notifications';
}
\`\`\`

Then test the adapter logic without pretending Node can show browser permission UI:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { notificationCtaLabel } from './notification-permission';

describe('notificationCtaLabel', () => {
  it('explains denied permission without asking again', () => {
    expect(notificationCtaLabel('denied')).toBe('Enable notifications in browser settings');
  });

  it('uses a direct enable label before the user has decided', () => {
    expect(notificationCtaLabel('default')).toBe('Enable notifications');
  });
});
\`\`\`

Use Vitest \`-t\` or \`--testNamePattern\` to filter those unit tests. Use Playwright \`--grep\` or \`-g\` for browser tests. Mixing those flags is a small mistake that wastes real debugging time.

## Subscription Creation and Storage

A push subscription is not just an endpoint string. It includes an endpoint and cryptographic key material. Your server needs enough data to send later, associate the subscription with the right user or browser installation, and replace duplicates without losing consent history.

The browser's \`PushManager.subscribe\` requires an active service worker registration and an application server key for standards-based web push. Test the shape you store. Do not log real keys in CI output.

| Field | Why it matters | Test assertion |
| --- | --- | --- |
| Endpoint | Destination for the push service | Present, HTTPS in real environments |
| \`p256dh\` key | Message encryption | Present and non-empty |
| \`auth\` secret | Message encryption | Present and non-empty |
| User or device id | Subscription ownership | Tied to signed-in account or anonymous install |
| Created timestamp | Cleanup and audit | Stored once for new subscription |
| Last seen timestamp | Expiry heuristics | Updated on resubscribe or heartbeat |

Here is a browser-level test that stubs subscription creation at the app boundary. It verifies the POST body without depending on a real push service in CI.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('stores a push subscription after the user enables notifications', async ({ page }) => {
  await page.addInitScript(() => {
    const fakeSubscription = {
      endpoint: 'https://push.example.test/subscriptions/browser-123',
      expirationTime: null,
      keys: {
        p256dh: 'public-key-example',
        auth: 'auth-secret-example'
      },
      toJSON() {
        return {
          endpoint: this.endpoint,
          expirationTime: this.expirationTime,
          keys: this.keys
        };
      }
    };

    Object.defineProperty(Notification, 'permission', {
      configurable: true,
      get: () => 'granted'
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            subscribe: async () => fakeSubscription
          }
        })
      }
    });
  });

  let postedBody: unknown = null;

  await page.route('/api/push/subscriptions', async (route) => {
    postedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    });
  });

  await page.goto('/settings/notifications');
  await page.getByRole('button', { name: 'Enable notifications' }).click();

  expect(postedBody).toEqual({
    endpoint: 'https://push.example.test/subscriptions/browser-123',
    expirationTime: null,
    keys: {
      p256dh: 'public-key-example',
      auth: 'auth-secret-example'
    }
  });
});
\`\`\`

That test is intentionally not a full cryptographic delivery test. It is a product contract test: when permission is granted and subscribe succeeds, the app sends the subscription to your backend in the expected shape.

## Testing Service Worker Push Handling

Service worker push handling is easiest to test when the parsing logic is separated from the event wrapper. Put payload validation in a pure function, then keep the worker event small. This makes malformed payloads cheap to test and leaves one browser test for integration.

\`\`\`ts
export type PushPayload = {
  id: string;
  title: string;
  body: string;
  url: string;
};

export function parsePushPayload(rawJson: string): PushPayload {
  const parsed = JSON.parse(rawJson) as Partial<PushPayload>;

  if (!parsed.id || !parsed.title || !parsed.body || !parsed.url) {
    throw new Error('Push payload is missing a required field');
  }

  return {
    id: parsed.id,
    title: parsed.title,
    body: parsed.body,
    url: parsed.url
  };
}
\`\`\`

\`\`\`ts
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const data = event.data ? event.data.text() : '{}';
      const payload = parsePushPayload(data);

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.id,
        data: {
          url: payload.url,
          id: payload.id
        }
      });
    })()
  );
});
\`\`\`

The pure parser gets ordinary unit tests:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { parsePushPayload } from './push-payload';

describe('parsePushPayload', () => {
  it('returns a complete payload', () => {
    const payload = parsePushPayload(JSON.stringify({
      id: 'invoice-paid-101',
      title: 'Invoice paid',
      body: 'Customer ACME paid invoice 101.',
      url: '/invoices/101'
    }));

    expect(payload).toEqual({
      id: 'invoice-paid-101',
      title: 'Invoice paid',
      body: 'Customer ACME paid invoice 101.',
      url: '/invoices/101'
    });
  });

  it('rejects a payload without a URL', () => {
    expect(() => parsePushPayload(JSON.stringify({
      id: 'invoice-paid-101',
      title: 'Invoice paid',
      body: 'Customer ACME paid invoice 101.'
    }))).toThrow('missing a required field');
  });
});
\`\`\`

For browser integration, you can expose a test-only message path in local builds that asks the worker to process a sample payload. Keep it behind a build flag or non-production route. Do not create a public endpoint that lets anyone trigger notifications for users.

## Delivery Tests Without Depending on Vendor Push Services

End-to-end push delivery through real browser push services is valuable but not something every pull request should depend on. It can be slow, account-dependent, and awkward in headless environments. Split the suite:

| Layer | What it proves | Frequency |
| --- | --- | --- |
| Unit | Payload parsing, permission labels, cleanup rules | Every PR |
| Browser integration | Subscribe flow, UI state, worker click handling | Every PR or smoke gate |
| Backend contract | Send request shape and response handling | Every PR |
| Real delivery canary | Browser receives vendor-delivered push | Scheduled or pre-release |

Backend send logic should be tested with a fake web push client. You do not need to hit a real push service to prove that expired endpoints are removed or transient failures are retried.

\`\`\`ts
type StoredSubscription = {
  id: string;
  endpoint: string;
};

type PushClient = {
  send(subscription: StoredSubscription, payload: string): Promise<{ status: number }>;
};

export async function sendAccountAlert(
  client: PushClient,
  subscription: StoredSubscription,
  payload: { id: string; title: string; body: string; url: string }
) {
  const response = await client.send(subscription, JSON.stringify(payload));

  if (response.status === 404 || response.status === 410) {
    return { action: 'delete-subscription' as const, subscriptionId: subscription.id };
  }

  if (response.status >= 500) {
    return { action: 'retry-later' as const, subscriptionId: subscription.id };
  }

  return { action: 'sent' as const, subscriptionId: subscription.id };
}
\`\`\`

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { sendAccountAlert } from './send-account-alert';

describe('sendAccountAlert', () => {
  it('marks expired subscriptions for deletion', async () => {
    const client = {
      send: async () => ({ status: 410 })
    };

    const result = await sendAccountAlert(
      client,
      { id: 'sub-1', endpoint: 'https://push.example.test/expired' },
      {
        id: 'security-alert-1',
        title: 'Security alert',
        body: 'A new sign-in was detected.',
        url: '/security'
      }
    );

    expect(result).toEqual({
      action: 'delete-subscription',
      subscriptionId: 'sub-1'
    });
  });
});
\`\`\`

This is where many QA teams get tangled. They try to prove every push behavior through real delivery. That makes the suite slow and still does not give good branch coverage for errors. Test the protocol boundaries with fakes, then keep one real delivery canary to catch integration drift.

## Expired Subscriptions and Cleanup Rules

Expired subscriptions are normal. Users clear browser data, uninstall browsers, revoke permission, change profiles, or let endpoints expire. Your backend should treat permanent push failures as cleanup signals, not as noise.

The key statuses depend on the library and push service, but the principle is stable: permanent "gone" style failures should remove or disable the subscription; transient server or network failures should retry with backoff; malformed payload errors should page the owning team or fail the job that produced the message.

| Failure type | Server action | Test case |
| --- | --- | --- |
| Endpoint gone | Delete or disable subscription | Fake send returns permanent gone status |
| Unauthorized or bad keys | Mark configuration error | Assert alert or failed job |
| Temporary service failure | Retry later | Assert retry event is scheduled |
| Payload too large | Reject before send | Assert validation error |
| User permission denied later | Stop offering silent resubscribe | Assert UI explains browser settings |

For cleanup jobs, test idempotency. Deleting an already-deleted subscription should not fail the whole batch. A cleanup worker that dies on the second row leaves dead endpoints behind forever.

\`\`\`ts
type SubscriptionRecord = {
  id: string;
  status: 'active' | 'disabled';
  failedPermanentlyAt: string | null;
};

export function markSubscriptionExpired(
  record: SubscriptionRecord,
  timestamp: string
): SubscriptionRecord {
  if (record.status === 'disabled') {
    return record;
  }

  return {
    ...record,
    status: 'disabled',
    failedPermanentlyAt: timestamp
  };
}
\`\`\`

Simple code, important behavior. If this function changes to always overwrite \`failedPermanentlyAt\`, audit evidence becomes less useful. If it throws for already-disabled rows, batch cleanup becomes fragile.

## Notification Clicks, Deduplication, and Focus

Delivery is only half of push. A notification click should take the user somewhere sensible. If a matching tab is open, many apps should focus it and navigate. If no tab is open, the worker should open a new window. If the same event arrives twice, the user should not get duplicate notifications unless the product intentionally allows it.

\`\`\`ts
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const url = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : '/';

      const windows = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(url);
          }
          return;
        }
      }

      await clients.openWindow(url);
    })()
  );
});
\`\`\`

Testing this in a real browser can require service worker instrumentation because OS-level notification surfaces are not always available in CI. Keep the routing logic small and test it with worker-friendly abstractions. Then run manual or scheduled browser checks for the actual notification surface on supported platforms.

Deduplication belongs in both payload design and display behavior. The \`tag\` option can replace existing notifications with the same tag in browsers that support the behavior. Your backend should also avoid sending duplicate event IDs for the same user unless the product expects repeated reminders.

## A Failure Story: The Notifications That Looked Sent

Symptom: the backend dashboard showed thousands of successful push send attempts, but support tickets said users stopped receiving renewal reminders after changing laptops.

Wrong theory: engineers blamed the browser vendor's push service. They increased retries and added logging around network calls.

Actual cause: the server treated permanent gone responses as temporary failures. Dead endpoints stayed active. The send job spent most of its time retrying subscriptions that could never receive a message. Worse, users who returned on a new browser were sometimes associated with old disabled-looking records because the dedupe key was only user id, not endpoint plus user id.

Fix: permanent failures disabled the exact subscription endpoint, resubscribe updated \`lastSeenAt\`, and the send job skipped disabled rows. QA added tests for 410-style cleanup, duplicate endpoint replacement, and a scheduled canary that verified at least one controlled browser profile received a real notification.

The lesson: "send accepted" is not the same as "user can receive." Your tests need to inspect cleanup and resubscribe paths, not just the happy send call.

## CI Strategy for Web Push Testing

Do not put every push concern in one giant end-to-end test. Split the checks by failure speed and determinism:

| Suite | Runs | Examples |
| --- | --- | --- |
| Unit | Every PR | Permission label logic, payload parsing, expiry state transitions |
| Browser smoke | Every PR | Granted permission UI, subscribe POST, disabled state |
| Worker integration | Every PR or nightly | Push handler and click routing through test hook |
| Real delivery | Nightly or pre-release | Vendor push service can reach a controlled browser |

A GitHub Actions job for the deterministic parts looks like this:

\`\`\`yaml
name: web-push-tests

on:
  pull_request:

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test -- --testNamePattern "push|notification"
      - run: npx playwright install --with-deps
      - run: npx playwright test --grep "web push|notifications"
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: web-push-artifacts
          path: |
            test-results
            playwright-report
\`\`\`

Notice the filter syntax: Vitest receives \`--testNamePattern\`, Playwright receives \`--grep\`. That small detail keeps CI scripts honest.

## Browser Support and Product Policy

Web push behavior differs by browser, platform, and installation context. QA does not need to memorize every platform wrinkle, but the test plan must reflect the product's support statement. Desktop Chromium support is not the same promise as mobile Safari support. Installed progressive web app behavior is not the same as an ordinary browser tab.

Document the support matrix in terms product owners understand:

| Environment | Product promise | Test expectation |
| --- | --- | --- |
| Desktop Chromium | Full subscribe and receive | Automated smoke plus scheduled delivery |
| Desktop Firefox | Full subscribe and receive if supported by product | Browser smoke before release |
| Desktop Safari | Product-specific support statement | Manual or automated coverage based on priority |
| Mobile browser | May require installation or platform support | Device-level release check |
| Unsupported browser | Clear explanation, no broken CTA | Unit and browser UI check |

The unsupported path is not optional. Users on unsupported environments should see a truthful state, not a button that spins forever. A simple test can protect that behavior by forcing the app's capability adapter to return \`unsupported\` and asserting that subscription code is never called.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('does not offer subscription when push is unsupported', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: undefined
    });
  });

  await page.goto('/settings/notifications');

  await expect(page.getByText('Notifications are not supported')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable notifications' })).toBeHidden();
});
\`\`\`

That test is small, but it catches an embarrassing class of bugs. A broken enable button is worse than no feature because it teaches users not to trust settings.

## Permission Prompt Timing

The best push permission test is often a product-behavior test, not a browser prompt test. Ask when the app requests permission. A prompt on first page load is usually a bad product decision and a poor test target. A prompt after a user chooses a specific notification feature is easier to explain, easier to test, and less likely to be denied reflexively.

Build a timing matrix:

| Moment | Good behavior | Bad behavior |
| --- | --- | --- |
| First anonymous visit | No permission prompt | Browser prompt appears before value is clear |
| User opens notification settings | Explain choices | Silent subscribe attempt |
| User clicks enable | Request permission or subscribe | Multiple prompts or duplicate POST |
| User denies | Show settings guidance | Keep asking on every visit |
| User signs out | Stop user-specific sends | Keep sending private account notifications |

The sign-out case is easy to miss. If a shared computer receives account notifications after logout, the bug is both privacy-sensitive and hard to diagnose from ordinary UI tests. Add a backend or integration test that disables or disassociates user-specific subscriptions when the product requires it.

\`\`\`ts
type SubscriptionOwner = {
  subscriptionId: string;
  userId: string;
  receivesAccountAlerts: boolean;
};

export function disableAccountAlertsOnSignOut(owner: SubscriptionOwner): SubscriptionOwner {
  return {
    ...owner,
    receivesAccountAlerts: false
  };
}
\`\`\`

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { disableAccountAlertsOnSignOut } from './subscription-owner';

describe('disableAccountAlertsOnSignOut', () => {
  it('stops account alerts for the signed-out browser subscription', () => {
    const updated = disableAccountAlertsOnSignOut({
      subscriptionId: 'sub-123',
      userId: 'user-9',
      receivesAccountAlerts: true
    });

    expect(updated).toEqual({
      subscriptionId: 'sub-123',
      userId: 'user-9',
      receivesAccountAlerts: false
    });
  });
});
\`\`\`

If your product intentionally keeps generic marketing notifications after sign-out, write that down and test the distinction. Account alerts and public announcements should not share a vague "enabled" flag.

## Payload Size, Privacy, and Redaction

Push payloads should be small and careful. Even though web push payloads are encrypted for delivery, notification text can appear on lock screens, shared monitors, and notification centers. QA should test privacy policy through examples, not just through legal copy.

Classify payload fields before automation:

| Field type | Example | Safer notification text |
| --- | --- | --- |
| Sensitive financial detail | Exact balance or card number | "Your billing status changed" |
| Private message content | Full message body | "You have a new message" |
| Security event | IP address and location | "Review a new sign-in" |
| Operational alert | Job name and failure count | Specific text may be acceptable for internal tools |

Write tests that assert redaction. This is not overreach from QA. A notification is a product surface that can leak information before the app is opened.

\`\`\`ts
type BillingEvent = {
  customerName: string;
  invoiceId: string;
  amount: string;
};

export function buildBillingNotification(event: BillingEvent) {
  return {
    title: 'Billing update',
    body: 'Open the app to review a billing change.',
    url: '/billing',
    eventId: 'billing-' + event.invoiceId
  };
}
\`\`\`

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { buildBillingNotification } from './billing-notification';

describe('buildBillingNotification', () => {
  it('does not place customer name or amount in lock-screen text', () => {
    const notification = buildBillingNotification({
      customerName: 'ACME Ltd',
      invoiceId: 'inv-9',
      amount: '$4,200.00'
    });

    expect(notification.title).toBe('Billing update');
    expect(notification.body).not.toContain('ACME');
    expect(notification.body).not.toContain('$4,200.00');
  });
});
\`\`\`

This kind of test catches policy drift. A developer may add "helpful" detail to a notification without realizing it appears outside the authenticated app. The test makes the product's privacy stance executable.

## Observability for Push Failures

Push failures are hard to debug when every layer logs a different identifier. Give each notification event an id and carry it through payload creation, send attempt, service worker display, click handling, and backend cleanup. The id should not contain private data. It should let support and QA trace one event without guessing.

At minimum, capture:

| Signal | Where it helps |
| --- | --- |
| Event id | Connects backend send to client behavior |
| Subscription id | Identifies dead endpoints |
| Send status | Separates permanent and transient failures |
| Worker display result | Shows whether payload parsing succeeded |
| Click route | Confirms the user landed in the intended view |

Do not rely on push vendor dashboards alone. They may show accepted delivery while the service worker still fails to parse the payload. Add app-owned logs or analytics events for display and click handling, with sampling if volume is high.

For automated tests, assert that the event id is preserved:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('preserves notification event id in click route', async ({ page }) => {
  await page.goto('/notifications/test-harness');

  await page.getByRole('button', { name: 'Simulate notification click' }).click();

  await expect(page).toHaveURL('/inbox?notificationId=message-123');
});
\`\`\`

A test harness route like this should exist only in non-production builds or require internal authorization. The point is to make the click contract testable without depending on an operating-system notification tray in every PR.

## What People Get Wrong About Web Push Testing

The common mistake is treating web push as a frontend feature. It is not. The browser UI is only the last visible piece of a distributed system. If QA only tests the settings page, expired endpoints pile up. If backend tests only assert that a send function was called, users may never see or click the notification. If service worker tests only parse a happy payload, malformed event data can break all notifications until the worker updates.

Another mistake is ignoring negative consent. Denied permission is a durable state from the user's point of view. The app should respect it, explain it, and avoid dark-pattern loops. A retry button can be fine when permission is still default. It is usually wrong after denial unless the user has changed browser settings.

Treat each push notification as a contract with the user: they asked for a specific kind of interruption, on a specific browser, for a specific account or topic. Your tests should prove the product honors that contract and stops when the contract no longer applies.

## Frequently Asked Questions

### Can web push be fully tested in headless CI?

You can test most web push behavior in headless CI, including permission-state UI, subscription POST shape, payload parsing, expired-subscription cleanup, and service worker routing through test hooks. Full vendor delivery to an operating-system notification surface is less deterministic. Keep that as a scheduled canary or pre-release check, while PR runs cover the contracts that fail most often and are easiest to diagnose.

### How should I test denied notification permission?

Do not repeatedly trigger the real browser prompt. Control permission state where your automation framework supports it, and isolate permission-reading code behind a small adapter for unit tests. The important assertion is product behavior: the app should stop asking, explain that permission is blocked in browser settings, and avoid calling subscribe again. Denied permission is a user decision, not a retry loop.

### What should happen when a push subscription expires?

The backend should disable or delete the exact expired subscription endpoint after a permanent failure, then continue sending to other active subscriptions for the same user. It should not keep retrying forever, and it should not disable the entire user account. Tests should cover permanent failure cleanup, transient retry behavior, and resubscribe replacement when the same user returns with a new browser subscription.

### Do I need a real push service for every automated test?

No. Use fakes for most tests because they give deterministic coverage of error handling, payload shape, retries, and cleanup. Add one real delivery canary against a controlled browser profile to catch integration drift in keys, service worker registration, and vendor delivery. Running every PR through a real push service usually slows feedback and still misses important branch coverage in failure paths.
`,
};
