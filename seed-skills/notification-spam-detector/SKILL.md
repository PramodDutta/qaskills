---
name: Notification Spam Detector
description: Test notification systems for spam behavior including duplicate alerts, missing throttling, incorrect delivery channels, and notification preference violations
version: 1.0.0
author: Pramod
license: MIT
tags: [notifications, spam-detection, push-notifications, email-notifications, throttling, deduplication, notification-preferences]
testingTypes: [integration, e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Notification Spam Detector Skill

You are an expert QA automation engineer specializing in testing notification systems for spam behavior, duplicate delivery, throttling compliance, and preference enforcement. When the user asks you to write, review, or debug notification spam detection tests, follow these detailed instructions.

## Core Principles

1. **Deduplication is non-negotiable** -- The same notification must never be delivered twice to the same user within a single event trigger. Every notification system must have deduplication logic, and every test suite must verify it.
2. **Throttling protects users** -- Rate limiting and throttling exist to prevent notification fatigue. Tests must verify that throttling is applied consistently across all channels and that burst scenarios do not overwhelm users.
3. **User preferences are law** -- If a user has opted out of a notification channel or category, the system must never violate that preference. Test every combination of preference settings against every notification type.
4. **Cross-channel awareness** -- A notification delivered via push should not also be delivered via email and in-app simultaneously unless the user has explicitly configured that behavior. Test cross-channel deduplication rigorously.
5. **Timing matters** -- Notifications should respect quiet hours, batching windows, and timezone-aware delivery schedules. Tests must verify temporal behavior under various clock configurations.
6. **Content integrity** -- Every notification must contain accurate, properly formatted content with correct personalization tokens resolved. Template rendering failures should never reach users.
7. **Graceful degradation** -- When a notification channel is unavailable (push service down, email provider rate-limited), the system should fall back gracefully without creating duplicates or losing notifications entirely.

## Project Structure

Organize notification spam detection tests with this structure:

```
tests/
  notifications/
    spam-detection/
      duplicate-detection.spec.ts
      throttling-verification.spec.ts
      rate-limit-compliance.spec.ts
    preferences/
      opt-out-enforcement.spec.ts
      channel-preferences.spec.ts
      category-preferences.spec.ts
    cross-channel/
      deduplication.spec.ts
      fallback-behavior.spec.ts
      channel-routing.spec.ts
    timing/
      quiet-hours.spec.ts
      batching-behavior.spec.ts
      timezone-handling.spec.ts
    content/
      template-rendering.spec.ts
      personalization.spec.ts
      content-validation.spec.ts
  fixtures/
    notification.fixture.ts
    user-preferences.fixture.ts
    mock-channels.fixture.ts
  helpers/
    notification-interceptor.ts
    channel-monitor.ts
    timing-utils.ts
  pages/
    notification-center.page.ts
    preferences.page.ts
    notification-settings.page.ts
playwright.config.ts
```

## Setting Up the Notification Test Infrastructure

Before writing individual tests, establish a robust infrastructure for intercepting and analyzing notifications across all channels.

### Notification Interceptor

Build a central interceptor that captures all outbound notifications regardless of channel:

```typescript
import { Page, Route } from '@playwright/test';

interface CapturedNotification {
  id: string;
  userId: string;
  channel: 'email' | 'push' | 'in-app' | 'sms';
  category: string;
  subject: string;
  body: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export class NotificationInterceptor {
  private captured: CapturedNotification[] = [];
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async startCapturing(): Promise<void> {
    await this.page.route('**/api/notifications/send', async (route: Route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      this.captured.push({
        id: postData.notificationId,
        userId: postData.userId,
        channel: postData.channel,
        category: postData.category,
        subject: postData.subject,
        body: postData.body,
        timestamp: Date.now(),
        metadata: postData.metadata || {},
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: postData.notificationId }),
      });
    });

    await this.page.route('**/api/notifications/batch', async (route: Route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      for (const notification of postData.notifications) {
        this.captured.push({
          id: notification.notificationId,
          userId: notification.userId,
          channel: notification.channel,
          category: notification.category,
          subject: notification.subject,
          body: notification.body,
          timestamp: Date.now(),
          metadata: notification.metadata || {},
        });
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: postData.notifications.length }),
      });
    });
  }

  getAll(): CapturedNotification[] {
    return [...this.captured];
  }

  getByChannel(channel: CapturedNotification['channel']): CapturedNotification[] {
    return this.captured.filter((n) => n.channel === channel);
  }

  getByUser(userId: string): CapturedNotification[] {
    return this.captured.filter((n) => n.userId === userId);
  }

  getByCategory(category: string): CapturedNotification[] {
    return this.captured.filter((n) => n.category === category);
  }

  getDuplicates(): CapturedNotification[][] {
    const groups = new Map<string, CapturedNotification[]>();

    for (const notification of this.captured) {
      const key = `${notification.userId}:${notification.channel}:${notification.category}:${notification.subject}`;
      const existing = groups.get(key) || [];
      existing.push(notification);
      groups.set(key, existing);
    }

    return Array.from(groups.values()).filter((group) => group.length > 1);
  }

  getNotificationsInWindow(startMs: number, endMs: number): CapturedNotification[] {
    return this.captured.filter((n) => n.timestamp >= startMs && n.timestamp <= endMs);
  }

  clear(): void {
    this.captured = [];
  }
}
```

### Custom Test Fixture

Create a Playwright fixture that provides the interceptor and common notification test utilities:

```typescript
import { test as base, expect } from '@playwright/test';
import { NotificationInterceptor } from '../helpers/notification-interceptor';

interface NotificationFixtures {
  notificationInterceptor: NotificationInterceptor;
  triggerEvent: (eventType: string, payload: Record<string, unknown>) => Promise<void>;
  setUserPreferences: (
    userId: string,
    preferences: Record<string, boolean>
  ) => Promise<void>;
  waitForNotifications: (count: number, timeoutMs?: number) => Promise<void>;
}

export const test = base.extend<NotificationFixtures>({
  notificationInterceptor: async ({ page }, use) => {
    const interceptor = new NotificationInterceptor(page);
    await interceptor.startCapturing();
    await use(interceptor);
    interceptor.clear();
  },

  triggerEvent: async ({ page }, use) => {
    const trigger = async (eventType: string, payload: Record<string, unknown>) => {
      await page.evaluate(
        async ({ eventType, payload }) => {
          const response = await fetch('/api/events/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: eventType, ...payload }),
          });
          if (!response.ok) {
            throw new Error(`Failed to trigger event: ${response.statusText}`);
          }
        },
        { eventType, payload }
      );
    };
    await use(trigger);
  },

  setUserPreferences: async ({ page }, use) => {
    const setPrefs = async (userId: string, preferences: Record<string, boolean>) => {
      await page.evaluate(
        async ({ userId, preferences }) => {
          await fetch(`/api/users/${userId}/notification-preferences`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences),
          });
        },
        { userId, preferences }
      );
    };
    await use(setPrefs);
  },

  waitForNotifications: async ({ notificationInterceptor }, use) => {
    const waiter = async (count: number, timeoutMs = 5000) => {
      const startTime = Date.now();
      while (notificationInterceptor.getAll().length < count) {
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(
            `Timed out waiting for ${count} notifications. ` +
              `Received ${notificationInterceptor.getAll().length}.`
          );
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    };
    await use(waiter);
  },
});

export { expect };
```

## Duplicate Notification Detection

The most critical class of notification spam is duplicate delivery. Build tests that verify deduplication under various conditions.

### Basic Duplicate Detection Tests

```typescript
import { test, expect } from '../fixtures/notification.fixture';

test.describe('Duplicate Notification Detection', () => {
  test('same event does not trigger duplicate notifications', async ({
    notificationInterceptor,
    triggerEvent,
    waitForNotifications,
  }) => {
    const userId = 'user-123';

    await triggerEvent('order.shipped', { userId, orderId: 'order-456' });
    await waitForNotifications(1);

    // Trigger the exact same event again
    await triggerEvent('order.shipped', { userId, orderId: 'order-456' });

    // Wait a reasonable time for any duplicate to arrive
    await new Promise((r) => setTimeout(r, 2000));

    const userNotifications = notificationInterceptor.getByUser(userId);
    expect(userNotifications).toHaveLength(1);

    const duplicates = notificationInterceptor.getDuplicates();
    expect(duplicates).toHaveLength(0);
  });

  test('rapid identical events produce only one notification', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-rapid';

    // Fire the same event 10 times in rapid succession
    const promises = Array.from({ length: 10 }, () =>
      triggerEvent('comment.added', { userId, commentId: 'comment-789' })
    );
    await Promise.all(promises);

    // Allow processing time
    await new Promise((r) => setTimeout(r, 3000));

    const userNotifications = notificationInterceptor.getByUser(userId);
    expect(userNotifications).toHaveLength(1);
  });

  test('similar but distinct events each produce one notification', async ({
    notificationInterceptor,
    triggerEvent,
    waitForNotifications,
  }) => {
    const userId = 'user-distinct';

    await triggerEvent('comment.added', { userId, commentId: 'comment-001' });
    await triggerEvent('comment.added', { userId, commentId: 'comment-002' });
    await triggerEvent('comment.added', { userId, commentId: 'comment-003' });

    await waitForNotifications(3);

    const userNotifications = notificationInterceptor.getByUser(userId);
    // Could be 3 individual notifications or 1 batched notification depending on config
    expect(userNotifications.length).toBeGreaterThanOrEqual(1);
    expect(userNotifications.length).toBeLessThanOrEqual(3);
  });

  test('idempotency keys prevent duplicate delivery after retry', async ({
    page,
    notificationInterceptor,
  }) => {
    const idempotencyKey = 'idem-key-unique-001';

    // Send with idempotency key
    await page.evaluate(
      async ({ key }) => {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': key,
          },
          body: JSON.stringify({
            userId: 'user-idem',
            channel: 'email',
            category: 'order-update',
            subject: 'Your order shipped',
            body: 'Order 123 is on the way.',
          }),
        });

        // Retry with the same idempotency key
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': key,
          },
          body: JSON.stringify({
            userId: 'user-idem',
            channel: 'email',
            category: 'order-update',
            subject: 'Your order shipped',
            body: 'Order 123 is on the way.',
          }),
        });
      },
      { key: idempotencyKey }
    );

    await new Promise((r) => setTimeout(r, 2000));

    const userNotifications = notificationInterceptor.getByUser('user-idem');
    expect(userNotifications).toHaveLength(1);
  });
});
```

## Throttling and Rate Limiting Verification

Throttling prevents notification overload. Tests must verify that rate limits are applied per user, per channel, and per category.

```typescript
import { test, expect } from '../fixtures/notification.fixture';

test.describe('Throttling and Rate Limiting', () => {
  test('per-user rate limit caps notifications within time window', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-throttle';
    const maxNotificationsPerHour = 10;

    // Trigger more events than the rate limit allows
    for (let i = 0; i < 20; i++) {
      await triggerEvent('activity.update', {
        userId,
        activityId: `activity-${i}`,
      });
    }

    await new Promise((r) => setTimeout(r, 5000));

    const userNotifications = notificationInterceptor.getByUser(userId);
    expect(userNotifications.length).toBeLessThanOrEqual(maxNotificationsPerHour);
  });

  test('per-channel rate limit is enforced independently', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-channel-throttle';

    // Trigger events that should go to both email and push
    for (let i = 0; i < 15; i++) {
      await triggerEvent('system.alert', {
        userId,
        alertId: `alert-${i}`,
        channels: ['email', 'push'],
      });
    }

    await new Promise((r) => setTimeout(r, 5000));

    const emailNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'email');
    const pushNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'push');

    // Each channel should independently enforce its rate limit
    expect(emailNotifications.length).toBeLessThanOrEqual(10);
    expect(pushNotifications.length).toBeLessThanOrEqual(10);
  });

  test('throttled notifications are queued not dropped', async ({
    page,
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-queue-test';

    // Trigger a burst that exceeds the rate limit
    for (let i = 0; i < 25; i++) {
      await triggerEvent('task.assigned', {
        userId,
        taskId: `task-${i}`,
      });
    }

    // Wait for the initial window
    await new Promise((r) => setTimeout(r, 3000));

    const initialCount = notificationInterceptor.getByUser(userId).length;
    expect(initialCount).toBeGreaterThan(0);
    expect(initialCount).toBeLessThan(25);

    // Verify queued notifications are delivered in next window
    // Simulate time advancement or wait for the next delivery window
    await page.evaluate(async () => {
      await fetch('/api/admin/notifications/flush-queue', { method: 'POST' });
    });

    await new Promise((r) => setTimeout(r, 3000));

    const finalCount = notificationInterceptor.getByUser(userId).length;
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('cooldown period between same-type notifications is respected', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-cooldown';

    await triggerEvent('price.drop', { userId, productId: 'prod-100', newPrice: 49.99 });

    await new Promise((r) => setTimeout(r, 500));

    // Second price drop for the same product within cooldown window
    await triggerEvent('price.drop', { userId, productId: 'prod-100', newPrice: 44.99 });

    await new Promise((r) => setTimeout(r, 2000));

    const notifications = notificationInterceptor.getByUser(userId);
    const priceDropNotifications = notifications.filter((n) => n.category === 'price-drop');

    // Should only have 1 notification due to cooldown
    expect(priceDropNotifications).toHaveLength(1);
  });
});
```

## Notification Preference Honoring

User preferences must be treated as inviolable constraints. Test every preference combination to ensure the system never sends unwanted notifications.

```typescript
import { test, expect } from '../fixtures/notification.fixture';

test.describe('Notification Preference Enforcement', () => {
  test('user who opted out of email receives no emails', async ({
    notificationInterceptor,
    setUserPreferences,
    triggerEvent,
  }) => {
    const userId = 'user-no-email';

    await setUserPreferences(userId, {
      emailEnabled: false,
      pushEnabled: true,
      inAppEnabled: true,
    });

    await triggerEvent('order.confirmed', { userId, orderId: 'order-999' });
    await new Promise((r) => setTimeout(r, 2000));

    const emailNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'email');
    const pushNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'push');

    expect(emailNotifications).toHaveLength(0);
    expect(pushNotifications.length).toBeGreaterThan(0);
  });

  test('category-level opt-out is respected', async ({
    notificationInterceptor,
    setUserPreferences,
    triggerEvent,
  }) => {
    const userId = 'user-no-marketing';

    await setUserPreferences(userId, {
      emailEnabled: true,
      pushEnabled: true,
      categories: {
        marketing: false,
        transactional: true,
        security: true,
      },
    });

    await triggerEvent('marketing.campaign', { userId, campaignId: 'camp-001' });
    await triggerEvent('order.confirmed', { userId, orderId: 'order-001' });

    await new Promise((r) => setTimeout(r, 2000));

    const marketingNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.category === 'marketing');
    const transactionalNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.category === 'order-update' || n.category === 'transactional');

    expect(marketingNotifications).toHaveLength(0);
    expect(transactionalNotifications.length).toBeGreaterThan(0);
  });

  test('global unsubscribe blocks all non-security notifications', async ({
    notificationInterceptor,
    setUserPreferences,
    triggerEvent,
  }) => {
    const userId = 'user-unsubscribed';

    await setUserPreferences(userId, {
      globalUnsubscribe: true,
    });

    await triggerEvent('marketing.campaign', { userId, campaignId: 'camp-002' });
    await triggerEvent('order.confirmed', { userId, orderId: 'order-002' });
    await triggerEvent('security.password-changed', { userId });

    await new Promise((r) => setTimeout(r, 2000));

    const allNotifications = notificationInterceptor.getByUser(userId);
    const securityNotifications = allNotifications.filter(
      (n) => n.category === 'security'
    );
    const nonSecurityNotifications = allNotifications.filter(
      (n) => n.category !== 'security'
    );

    // Security notifications must always be delivered
    expect(securityNotifications.length).toBeGreaterThan(0);
    // All other notifications must be blocked
    expect(nonSecurityNotifications).toHaveLength(0);
  });

  test('preference changes take effect immediately', async ({
    notificationInterceptor,
    setUserPreferences,
    triggerEvent,
  }) => {
    const userId = 'user-pref-change';

    // Initially subscribed to email
    await setUserPreferences(userId, { emailEnabled: true });

    await triggerEvent('comment.reply', { userId, commentId: 'c-1' });
    await new Promise((r) => setTimeout(r, 1000));

    const initialEmails = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'email');
    expect(initialEmails.length).toBeGreaterThan(0);

    // Disable email
    await setUserPreferences(userId, { emailEnabled: false });

    notificationInterceptor.clear();

    await triggerEvent('comment.reply', { userId, commentId: 'c-2' });
    await new Promise((r) => setTimeout(r, 1000));

    const postChangeEmails = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'email');
    expect(postChangeEmails).toHaveLength(0);
  });
});
```

## Cross-Channel Deduplication

When a notification can be delivered on multiple channels, the system must coordinate to avoid overwhelming the user.

```typescript
import { test, expect } from '../fixtures/notification.fixture';

test.describe('Cross-Channel Deduplication', () => {
  test('single event does not produce duplicate across email and push', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-cross-channel';

    await triggerEvent('invoice.ready', { userId, invoiceId: 'inv-001' });
    await new Promise((r) => setTimeout(r, 2000));

    const userNotifications = notificationInterceptor.getByUser(userId);
    const channels = new Set(userNotifications.map((n) => n.channel));

    // Verify the notification was sent to different channels, not duplicated within one
    for (const channel of channels) {
      const channelNotifications = userNotifications.filter(
        (n) => n.channel === channel
      );
      const subjects = channelNotifications.map((n) => n.subject);
      const uniqueSubjects = new Set(subjects);
      expect(subjects.length).toBe(uniqueSubjects.size);
    }
  });

  test('in-app notification suppresses push for active users', async ({
    page,
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-active-session';

    // Simulate active user session
    await page.evaluate(async (uid) => {
      await fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, status: 'active' }),
      });
    }, userId);

    await triggerEvent('message.received', { userId, messageId: 'msg-001' });
    await new Promise((r) => setTimeout(r, 2000));

    const pushNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'push');
    const inAppNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'in-app');

    // Active users should receive in-app only, not push
    expect(inAppNotifications.length).toBeGreaterThan(0);
    expect(pushNotifications).toHaveLength(0);
  });

  test('fallback to email when push delivery fails', async ({
    page,
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-push-fail';

    // Mock push service failure
    await page.route('**/api/push/send', (route) =>
      route.fulfill({ status: 503, body: 'Service Unavailable' })
    );

    await triggerEvent('reminder.due', { userId, reminderId: 'rem-001' });
    await new Promise((r) => setTimeout(r, 3000));

    const emailNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'email');

    // Should fall back to email
    expect(emailNotifications.length).toBeGreaterThan(0);

    // Should not duplicate on push retry
    const pushNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'push');
    expect(pushNotifications).toHaveLength(0);
  });
});
```

## Timing, Batching, and Quiet Hours

Verify that the notification system respects temporal constraints including batching windows, quiet hours, and timezone-aware scheduling.

```typescript
import { test, expect } from '../fixtures/notification.fixture';

test.describe('Timing and Batching Behavior', () => {
  test('notifications are batched within configured window', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-batch';

    // Trigger multiple events in quick succession
    for (let i = 0; i < 5; i++) {
      await triggerEvent('file.shared', {
        userId,
        fileId: `file-${i}`,
        sharedBy: `user-sharer-${i}`,
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    await new Promise((r) => setTimeout(r, 5000));

    const userNotifications = notificationInterceptor.getByUser(userId);
    const emailNotifications = userNotifications.filter((n) => n.channel === 'email');

    // Should batch into a single digest email rather than 5 separate ones
    expect(emailNotifications.length).toBeLessThanOrEqual(2);
  });

  test('quiet hours are respected based on user timezone', async ({
    page,
    notificationInterceptor,
    setUserPreferences,
    triggerEvent,
  }) => {
    const userId = 'user-quiet-hours';

    await setUserPreferences(userId, {
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      timezone: 'America/New_York',
    });

    // Mock the server time to be within quiet hours for the user
    await page.evaluate(() => {
      // Override Date to simulate 2:00 AM Eastern Time
      const mockDate = new Date('2025-01-15T07:00:00.000Z'); // 2 AM ET
      const originalDate = Date;
      globalThis.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) return new originalDate(mockDate);
          return new (originalDate as any)(...args);
        }
        static now() {
          return mockDate.getTime();
        }
      } as any;
    });

    await triggerEvent('comment.mention', { userId, commentId: 'c-quiet' });
    await new Promise((r) => setTimeout(r, 2000));

    const pushNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'push');

    // Push notifications should be suppressed during quiet hours
    expect(pushNotifications).toHaveLength(0);
  });

  test('deferred notifications are delivered after quiet hours end', async ({
    page,
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-deferred';

    // Trigger during quiet hours
    await triggerEvent('team.invite', { userId, teamId: 'team-001' });
    await new Promise((r) => setTimeout(r, 1000));

    const duringQuietHours = notificationInterceptor.getByUser(userId);
    const pushDuringQuiet = duringQuietHours.filter((n) => n.channel === 'push');
    expect(pushDuringQuiet).toHaveLength(0);

    // Simulate time advancing past quiet hours
    await page.evaluate(async () => {
      await fetch('/api/admin/notifications/process-deferred', { method: 'POST' });
    });

    await new Promise((r) => setTimeout(r, 2000));

    const afterQuietHours = notificationInterceptor.getByUser(userId);
    expect(afterQuietHours.length).toBeGreaterThan(0);
  });
});
```

## Unsubscribe Flow Testing

The unsubscribe flow is legally required in many jurisdictions (CAN-SPAM, GDPR). Test that it works flawlessly.

```typescript
import { test, expect } from '../fixtures/notification.fixture';

test.describe('Unsubscribe Flow', () => {
  test('one-click unsubscribe link works from email', async ({ page }) => {
    // Navigate to unsubscribe URL with token
    const unsubscribeUrl = '/unsubscribe?token=valid-test-token&category=marketing';

    await page.goto(unsubscribeUrl);
    await page.waitForLoadState('networkidle');

    // Should show confirmation page
    await expect(page.getByText(/unsubscribed/i)).toBeVisible();
    await expect(page.getByText(/marketing/i)).toBeVisible();
  });

  test('unsubscribe actually prevents future notifications', async ({
    page,
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-unsub-test';

    // Perform unsubscribe
    await page.goto(`/unsubscribe?token=valid-token-${userId}&category=marketing`);
    await page.waitForLoadState('networkidle');

    // Try to trigger a marketing notification
    notificationInterceptor.clear();
    await triggerEvent('marketing.weekly-digest', { userId });
    await new Promise((r) => setTimeout(r, 2000));

    const marketingNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.category === 'marketing');

    expect(marketingNotifications).toHaveLength(0);
  });

  test('unsubscribe from one category does not affect others', async ({
    page,
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-partial-unsub';

    // Unsubscribe from marketing only
    await page.goto(`/unsubscribe?token=valid-token-${userId}&category=marketing`);
    await page.waitForLoadState('networkidle');

    notificationInterceptor.clear();
    await triggerEvent('marketing.promo', { userId });
    await triggerEvent('order.shipped', { userId, orderId: 'order-partial' });

    await new Promise((r) => setTimeout(r, 2000));

    const marketing = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.category === 'marketing');
    const transactional = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.category !== 'marketing');

    expect(marketing).toHaveLength(0);
    expect(transactional.length).toBeGreaterThan(0);
  });

  test('invalid unsubscribe token shows error', async ({ page }) => {
    await page.goto('/unsubscribe?token=invalid-garbage-token&category=marketing');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/invalid|expired/i)).toBeVisible();
  });
});
```

## Notification Content Validation

Ensure notification content is correctly rendered, personalized, and free of template artifacts.

```typescript
import { test, expect } from '../fixtures/notification.fixture';

test.describe('Notification Content Validation', () => {
  test('personalization tokens are resolved', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-personalized';

    await triggerEvent('welcome.new-user', {
      userId,
      userName: 'Alice Johnson',
    });

    await new Promise((r) => setTimeout(r, 2000));

    const notifications = notificationInterceptor.getByUser(userId);
    for (const notification of notifications) {
      // Should not contain unresolved template tokens
      expect(notification.body).not.toContain('{{');
      expect(notification.body).not.toContain('}}');
      expect(notification.subject).not.toContain('{{');

      // Should contain the actual personalized value
      expect(notification.body).toContain('Alice');
    }
  });

  test('notification body does not contain HTML in plain text channels', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-content-check';

    await triggerEvent('report.ready', { userId, reportId: 'rpt-001' });
    await new Promise((r) => setTimeout(r, 2000));

    const pushNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'push');

    for (const notification of pushNotifications) {
      expect(notification.body).not.toMatch(/<[^>]+>/);
    }
  });

  test('notification links are absolute URLs', async ({
    notificationInterceptor,
    triggerEvent,
  }) => {
    const userId = 'user-links';

    await triggerEvent('task.assigned', { userId, taskId: 'task-link-test' });
    await new Promise((r) => setTimeout(r, 2000));

    const emailNotifications = notificationInterceptor
      .getByUser(userId)
      .filter((n) => n.channel === 'email');

    for (const notification of emailNotifications) {
      const urlPattern = /https?:\/\/[^\s"<]+/g;
      const urls = notification.body.match(urlPattern) || [];
      for (const url of urls) {
        expect(url).toMatch(/^https?:\/\//);
        expect(url).not.toContain('localhost');
      }
    }
  });
});
```

## Configuration

### Playwright Configuration for Notification Testing

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/notifications',
  timeout: 30000,
  retries: 1,
  workers: 1, // Sequential to avoid notification interference between tests
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'notification-spam',
      testMatch: '**/spam-detection/**',
    },
    {
      name: 'notification-preferences',
      testMatch: '**/preferences/**',
    },
    {
      name: 'cross-channel',
      testMatch: '**/cross-channel/**',
    },
    {
      name: 'timing',
      testMatch: '**/timing/**',
    },
  ],
});
```

### Environment Variables

```bash
# .env.test
BASE_URL=http://localhost:3000
NOTIFICATION_THROTTLE_WINDOW_MS=3600000
NOTIFICATION_MAX_PER_WINDOW=10
NOTIFICATION_BATCH_DELAY_MS=5000
NOTIFICATION_QUIET_HOURS_ENABLED=true
NOTIFICATION_COOLDOWN_MS=300000
```

## Best Practices

1. **Run notification tests sequentially** -- Parallel execution can cause cross-test contamination when notifications from one test leak into another test's assertions. Use `workers: 1` in the Playwright configuration for notification test suites.

2. **Clear notification state between tests** -- Always reset the notification interceptor, user preferences, and any queued notifications between test runs. Use the fixture teardown to ensure clean state.

3. **Test at the API level first** -- Before writing full E2E notification tests, build integration tests that exercise the notification service directly. This catches logic bugs faster than browser-based tests.

4. **Use deterministic time** -- Mock the system clock when testing time-dependent behavior like quiet hours, batching windows, and cooldown periods. Do not rely on real-time waits for time-sensitive logic.

5. **Verify both positive and negative cases** -- For every "notification should be delivered" test, write a corresponding "notification should NOT be delivered" test. Spam detection is as much about absence as presence.

6. **Test preference migration** -- When adding new notification categories or channels, verify that existing users receive sensible defaults and that their existing preferences are not overwritten.

7. **Monitor notification counts in CI** -- Add assertions that verify the total number of notifications sent during a test suite run. A sudden increase often indicates a deduplication regression.

8. **Test with multiple users simultaneously** -- Verify that throttling and deduplication work correctly when multiple users trigger the same event. Per-user isolation must not leak across user boundaries.

9. **Validate notification metadata** -- Beyond subject and body, verify that notifications carry correct metadata such as category, priority, action URLs, and tracking identifiers.

10. **Test notification delivery order** -- When multiple notifications are queued, verify they are delivered in the expected order (typically chronological or priority-based).

11. **Include load testing for notification pipelines** -- The spam detection logic itself can become a bottleneck. Verify that deduplication, throttling, and preference lookups perform within latency budgets under load.

12. **Test across notification service restarts** -- Ensure that in-flight notifications, queued deliveries, and throttle counters survive service restarts without causing duplicates or drops.

## Anti-Patterns to Avoid

1. **Relying on sleep-based timing** -- Do not use `await new Promise(r => setTimeout(r, 10000))` to wait for notifications. Build proper polling or event-based waiting mechanisms that check for the expected notification count.

2. **Testing only the happy path** -- If you only test "notification arrives," you miss the entire purpose of spam detection testing. The majority of your tests should verify that unwanted notifications are suppressed.

3. **Hardcoding rate limits in tests** -- Do not hardcode throttle values like `expect(notifications).toHaveLength(10)`. Read the configuration from the same source as the application to keep tests in sync with production settings.

4. **Ignoring cross-channel interactions** -- Testing email deduplication in isolation while ignoring that push and in-app notifications may also be sent is a common oversight. Always verify the complete notification footprint across all channels.

5. **Sharing user state across tests** -- Using the same user ID across multiple test files without cleanup creates flaky tests because throttle counters, preference caches, and notification history persist. Generate unique user IDs or clean up thoroughly.

6. **Skipping unsubscribe verification** -- Unsubscribe is a legal requirement in many jurisdictions. Treating it as a low-priority test is a compliance risk. Always include unsubscribe flow tests in your notification test suite.

7. **Not testing notification content** -- Verifying that a notification was delivered is only half the job. If the notification body contains unresolved template variables like `{{user.name}}` or raw HTML, it is still a bug.

## Debugging Tips

1. **Enable notification service logging** -- Set the notification service log level to DEBUG in test environments. Every decision point (deduplicated, throttled, queued, delivered, suppressed) should produce a log entry with the notification ID and reason.

2. **Add trace IDs to notifications** -- Include a unique trace ID in every notification that links back to the triggering event. When debugging duplicate deliveries, the trace ID reveals whether two notifications came from the same event or different events.

3. **Inspect the deduplication cache** -- Most deduplication systems use a cache (Redis, in-memory) to track recently sent notifications. When duplicates slip through, check whether the cache key format is correct and whether the TTL is appropriate.

4. **Check throttle counter state** -- When throttling appears to malfunction, inspect the raw counter values in the backing store. Common issues include counters not resetting at window boundaries, race conditions in counter increments, and timezone mismatches in window calculations.

5. **Verify event ordering** -- When batching produces unexpected results, log the timestamps of all events in the batch window. Out-of-order event delivery can cause the batching algorithm to create incorrect groups.

6. **Use Playwright's trace viewer** -- Enable `trace: 'on'` to capture a full timeline of network requests, including notification API calls. The trace viewer shows request/response payloads and timing, making it easy to spot duplicate sends.

7. **Monitor the dead letter queue** -- Failed notifications typically end up in a dead letter queue. If notifications appear to be missing, check whether they failed delivery and were moved to the DLQ instead of being dropped silently.

8. **Test preference cache invalidation** -- When preference changes do not take effect immediately, the issue is almost always cache invalidation. Verify that the preference cache is cleared or updated when the user modifies their settings.

9. **Compare event counts vs notification counts** -- Maintain counters for events received and notifications sent. The ratio between these numbers should be predictable based on your deduplication and throttling configuration. A deviation indicates a logic bug.

10. **Isolate channel-specific failures** -- When debugging cross-channel issues, temporarily disable all channels except one. This isolates whether the problem is in the routing logic, the channel adapter, or the deduplication layer.
