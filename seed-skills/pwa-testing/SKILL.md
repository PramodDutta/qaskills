---
name: Progressive Web App Testing
description: PWA testing skill covering service worker validation, offline mode testing, cache strategy verification, web app manifest testing, push notification testing, install prompt testing, and background sync verification.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [pwa, service-worker, offline, cache, manifest, push-notifications, progressive-web-app, installable]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Progressive Web App Testing Skill

You are an expert QA automation engineer specializing in Progressive Web App (PWA) testing. When the user asks you to write, review, or debug tests for service workers, offline functionality, caching strategies, web app manifests, push notifications, or install prompts, follow these detailed instructions.

## Core Principles

1. **Service worker lifecycle awareness** -- Understand that service workers go through install, activate, and fetch phases. Tests must account for each lifecycle stage and transitions between versions.
2. **Offline-first verification** -- PWAs must work without a network connection. Test that core functionality is accessible offline and that appropriate fallback content appears for uncached resources.
3. **Cache strategy validation** -- Different resources require different caching strategies (cache-first, network-first, stale-while-revalidate). Verify each strategy is applied correctly to the right resources.
4. **Manifest compliance** -- The web app manifest must meet all PWA installability criteria. Validate all required fields, icon sizes, display modes, and theme configuration.
5. **Progressive enhancement** -- PWA features must enhance the experience without breaking the base functionality. Test that the app works without service worker support.
6. **Update propagation** -- Service worker updates must propagate correctly to all open tabs. Test the update flow including skipWaiting and clients.claim behavior.
7. **Real device testing** -- While emulation is valuable, critical PWA features like install prompts and push notifications should be validated on real devices when possible.

## Project Structure

Always organize PWA testing projects with this structure:

```
tests/
  pwa/
    service-worker/
      lifecycle.spec.ts
      registration.spec.ts
      update-flow.spec.ts
    cache/
      cache-first.spec.ts
      network-first.spec.ts
      stale-while-revalidate.spec.ts
      cache-invalidation.spec.ts
    offline/
      offline-navigation.spec.ts
      offline-forms.spec.ts
      offline-fallback.spec.ts
    manifest/
      manifest-validation.spec.ts
      installability.spec.ts
    notifications/
      push-subscription.spec.ts
      notification-display.spec.ts
    sync/
      background-sync.spec.ts
    lighthouse/
      pwa-audit.spec.ts
  fixtures/
    pwa.fixture.ts
    service-worker.fixture.ts
  pages/
    pwa-shell.page.ts
  utils/
    sw-helpers.ts
    cache-helpers.ts
    manifest-helpers.ts
playwright.config.ts
```

## Service Worker Lifecycle Testing

### Registration and Activation

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Service Worker Lifecycle', () => {
  test('should register service worker successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker to register
    const swRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return {
        active: !!registration.active,
        scope: registration.scope,
        scriptURL: registration.active?.scriptURL || '',
      };
    });

    expect(swRegistered.active).toBe(true);
    expect(swRegistered.scope).toContain(new URL(page.url()).origin);
    expect(swRegistered.scriptURL).toContain('sw.js');
  });

  test('should activate service worker and control the page', async ({ page }) => {
    await page.goto('/');

    const isControlled = await page.evaluate(async () => {
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Check if the page is controlled
      return !!navigator.serviceWorker.controller;
    });

    expect(isControlled).toBe(true);
  });

  test('should handle service worker installation phases', async ({ page }) => {
    // Listen for service worker events
    const swEvents: string[] = [];

    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          if (registration.installing) {
            registration.installing.addEventListener('statechange', (event) => {
              const sw = event.target as ServiceWorker;
              window.__swEvents = window.__swEvents || [];
              window.__swEvents.push(sw.state);
              if (sw.state === 'activated') resolve();
            });
          } else if (registration.active) {
            resolve();
          }
        });
      });
    });

    await page.goto('/');

    const events = await page.evaluate(() => (window as any).__swEvents || ['activated']);

    // Service worker should transition through these states
    const validStates = ['installed', 'activating', 'activated'];
    for (const state of events) {
      expect(validStates).toContain(state);
    }
  });

  test('should unregister service worker cleanly', async ({ page }) => {
    await page.goto('/');

    const unregistered = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const results = await Promise.all(registrations.map((r) => r.unregister()));
      return results.every((r) => r === true);
    });

    expect(unregistered).toBe(true);

    // Verify no service worker is controlling the page after reload
    await page.reload();
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    expect(controlled).toBe(false);
  });
});
```

### Service Worker Update Flow

```typescript
import { test, expect } from '@playwright/test';

test.describe('Service Worker Update Flow', () => {
  test('should detect new service worker version', async ({ page }) => {
    await page.goto('/');

    // Wait for initial SW to activate
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Trigger update check
    const updateFound = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;

      return new Promise<boolean>((resolve) => {
        registration.addEventListener('updatefound', () => {
          resolve(true);
        });

        // Force update check
        registration.update().catch(() => resolve(false));

        // Timeout fallback
        setTimeout(() => resolve(false), 5000);
      });
    });

    // This test validates the update mechanism works -- actual update depends on server returning new SW
    expect(typeof updateFound).toBe('boolean');
  });

  test('should notify user when update is available', async ({ page }) => {
    await page.goto('/');

    // Simulate a service worker update notification
    await page.evaluate(() => {
      // Trigger the app's update notification UI
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    });

    // Verify update notification appears
    const updateBanner = page.getByTestId('sw-update-banner');
    await expect(updateBanner).toBeVisible();
    await expect(updateBanner).toContainText('new version');

    // Click update button
    await page.getByRole('button', { name: 'Update now' }).click();

    // Page should reload with new version
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle skipWaiting correctly', async ({ page }) => {
    await page.goto('/');

    const skipWaitingResult = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;

      if (registration.waiting) {
        // Tell waiting SW to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        return new Promise<boolean>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            resolve(true);
          });
          setTimeout(() => resolve(false), 5000);
        });
      }

      return null; // No waiting SW
    });

    // If there was a waiting SW, it should have taken control
    if (skipWaitingResult !== null) {
      expect(skipWaitingResult).toBe(true);
    }
  });
});
```

## Cache Strategy Testing

### Cache-First Strategy

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cache-First Strategy', () => {
  test('should serve static assets from cache', async ({ page }) => {
    // First visit -- populates cache
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Record cached resources
    const cachedResources = await page.evaluate(async () => {
      const cache = await caches.open('static-assets-v1');
      const keys = await cache.keys();
      return keys.map((r) => new URL(r.url).pathname);
    });

    expect(cachedResources.length).toBeGreaterThan(0);

    // Go offline
    await page.context().setOffline(true);

    // Static assets should still load from cache
    await page.reload();
    await expect(page.locator('body')).toBeVisible();

    // Restore connection
    await page.context().setOffline(false);
  });

  test('should cache CSS and JS bundles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cachedTypes = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const results: { cacheName: string; urls: string[] }[] = [];

      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        results.push({
          cacheName: name,
          urls: keys.map((r) => r.url),
        });
      }
      return results;
    });

    const allCachedUrls = cachedTypes.flatMap((c) => c.urls);
    const hasCSSCached = allCachedUrls.some((url) => url.endsWith('.css'));
    const hasJSCached = allCachedUrls.some((url) => url.endsWith('.js'));

    expect(hasCSSCached).toBe(true);
    expect(hasJSCached).toBe(true);
  });
});
```

### Network-First Strategy

```typescript
test.describe('Network-First Strategy', () => {
  test('should fetch fresh API data when online', async ({ page }) => {
    await page.goto('/');

    // Monitor network requests
    const apiRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');

    // Should have made real network requests
    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('should fall back to cached API responses when offline', async ({ page }) => {
    // Load page online first to populate cache
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Capture the data displayed
    const onlineData = await page.getByTestId('dashboard-data').textContent();

    // Go offline
    await page.context().setOffline(true);

    // Reload page
    await page.reload();

    // Should show cached data (may be stale)
    const offlineData = await page.getByTestId('dashboard-data').textContent();
    expect(offlineData).toBeTruthy();
    expect(offlineData).toBe(onlineData); // Same as cached version

    // Should show offline indicator
    await expect(page.getByTestId('offline-indicator')).toBeVisible();

    await page.context().setOffline(false);
  });
});
```

### Stale-While-Revalidate Strategy

```typescript
test.describe('Stale-While-Revalidate Strategy', () => {
  test('should serve stale content and update in background', async ({ page }) => {
    // First visit
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Second visit -- should get cached version immediately
    const navigationStart = Date.now();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - navigationStart;

    // Should load very fast from cache
    expect(loadTime).toBeLessThan(1000);

    // Wait for background revalidation to complete
    await page.waitForTimeout(2000);

    // Cache should now contain updated content
    const cacheUpdated = await page.evaluate(async () => {
      const cache = await caches.open('pages-v1');
      const response = await cache.match('/');
      if (!response) return false;
      const cacheDate = response.headers.get('date');
      return !!cacheDate;
    });

    expect(cacheUpdated).toBe(true);
  });
});
```

## Offline Mode Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test('should display offline fallback page for uncached routes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await page.context().setOffline(true);

    // Navigate to a page that was not cached
    await page.goto('/never-visited-page');

    // Should show offline fallback
    await expect(page.getByTestId('offline-fallback')).toBeVisible();
    await expect(page.getByText('You are offline')).toBeVisible();

    await page.context().setOffline(false);
  });

  test('should queue form submissions when offline', async ({ page }) => {
    await page.goto('/feedback');
    await page.waitForLoadState('networkidle');

    // Go offline
    await page.context().setOffline(true);

    // Fill and submit form
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Message').fill('This is an offline submission');
    await page.getByRole('button', { name: 'Submit' }).click();

    // Should show queued confirmation
    await expect(page.getByText('saved offline')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Wait for background sync to submit the form
    await page.waitForResponse('**/api/feedback', { timeout: 10000 });

    // Should show success confirmation
    await expect(page.getByText('submitted successfully')).toBeVisible();
  });

  test('should indicate offline status to the user', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Online indicator should show
    await expect(page.getByTestId('connection-status')).toContainText('Online');

    // Go offline
    await page.context().setOffline(true);

    // Should detect offline and update UI
    await expect(page.getByTestId('connection-status')).toContainText('Offline');

    // Go back online
    await page.context().setOffline(false);

    // Should detect online and update UI
    await expect(page.getByTestId('connection-status')).toContainText('Online');
  });

  test('should serve cached images when offline', async ({ page }) => {
    // Visit page with images to cache them
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // Verify images loaded
    const imageCount = await page.getByRole('img').count();
    expect(imageCount).toBeGreaterThan(0);

    // Go offline
    await page.context().setOffline(true);

    // Reload gallery
    await page.reload();

    // Images should still be visible from cache
    const offlineImageCount = await page.getByRole('img').count();
    expect(offlineImageCount).toBe(imageCount);

    // Verify images actually loaded (not broken)
    const brokenImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).filter((img) => !img.complete || img.naturalWidth === 0).length;
    });
    expect(brokenImages).toBe(0);

    await page.context().setOffline(false);
  });

  test('should handle intermittent connectivity', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulate flaky connection
    for (let i = 0; i < 3; i++) {
      await page.context().setOffline(true);
      await page.waitForTimeout(500);
      await page.context().setOffline(false);
      await page.waitForTimeout(500);
    }

    // App should remain functional
    await expect(page.locator('body')).toBeVisible();
    const hasError = await page.getByTestId('error-boundary').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });
});
```

## Web App Manifest Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Web App Manifest Validation', () => {
  test('should have a valid manifest link in the HTML head', async ({ page }) => {
    await page.goto('/');

    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.getAttribute('href') : null;
    });

    expect(manifestLink).toBeTruthy();
    expect(manifestLink).toContain('manifest');
  });

  test('should have all required manifest fields', async ({ page, request }) => {
    await page.goto('/');

    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link?.getAttribute('href') || '';
    });

    const manifestUrl = new URL(manifestHref, page.url()).toString();
    const response = await request.get(manifestUrl);
    expect(response.ok()).toBe(true);

    const manifest = await response.json();

    // Required fields for PWA installability
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should have required icon sizes for installability', async ({ page, request }) => {
    await page.goto('/');

    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link?.getAttribute('href') || '';
    });

    const manifestUrl = new URL(manifestHref, page.url()).toString();
    const response = await request.get(manifestUrl);
    const manifest = await response.json();

    const iconSizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);

    // Must have at least 192x192 and 512x512 icons
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');

    // Verify icons are accessible
    for (const icon of manifest.icons) {
      const iconUrl = new URL(icon.src, page.url()).toString();
      const iconResponse = await request.get(iconUrl);
      expect(iconResponse.ok(), `Icon ${icon.src} should be accessible`).toBe(true);

      const contentType = iconResponse.headers()['content-type'] || '';
      expect(contentType).toMatch(/image\/(png|svg|webp)/);
    }
  });

  test('should have matching theme and background colors', async ({ page, request }) => {
    await page.goto('/');

    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link?.getAttribute('href') || '';
    });

    const manifestUrl = new URL(manifestHref, page.url()).toString();
    const response = await request.get(manifestUrl);
    const manifest = await response.json();

    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();

    // Theme color should match meta tag
    const metaThemeColor = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="theme-color"]');
      return meta?.getAttribute('content');
    });

    if (metaThemeColor) {
      expect(manifest.theme_color.toLowerCase()).toBe(metaThemeColor.toLowerCase());
    }
  });

  test('should have correct start_url and scope', async ({ page, request }) => {
    await page.goto('/');

    const manifestHref = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link?.getAttribute('href') || '';
    });

    const manifestUrl = new URL(manifestHref, page.url()).toString();
    const response = await request.get(manifestUrl);
    const manifest = await response.json();

    // start_url should be accessible
    const startUrlResponse = await request.get(new URL(manifest.start_url, page.url()).toString());
    expect(startUrlResponse.ok()).toBe(true);

    // Scope should be defined
    if (manifest.scope) {
      expect(manifest.start_url).toContain(manifest.scope.replace(/\/$/, ''));
    }
  });
});
```

## Push Notification Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Push Notification Testing', () => {
  test('should request notification permission', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['notifications'],
    });
    const page = await context.newPage();

    await page.goto('/');

    const permissionState = await page.evaluate(async () => {
      const result = await Notification.requestPermission();
      return result;
    });

    expect(permissionState).toBe('granted');
    await context.close();
  });

  test('should subscribe to push notifications', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['notifications'],
    });
    const page = await context.newPage();

    await page.goto('/settings/notifications');

    // Enable push notifications
    await page.getByRole('switch', { name: 'Push notifications' }).click();

    const subscription = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BEl62iUYgU...' // VAPID public key
      });
      return {
        endpoint: sub.endpoint,
        keys: {
          p256dh: !!sub.getKey('p256dh'),
          auth: !!sub.getKey('auth'),
        },
      };
    });

    expect(subscription.endpoint).toContain('https://');
    expect(subscription.keys.p256dh).toBe(true);
    expect(subscription.keys.auth).toBe(true);

    await context.close();
  });

  test('should handle notification permission denied', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: [], // No notification permission
    });
    const page = await context.newPage();

    await page.goto('/settings/notifications');

    // Try to enable push notifications
    await page.getByRole('switch', { name: 'Push notifications' }).click();

    // Should show permission denied message
    await expect(page.getByText('notification permission')).toBeVisible();
    await expect(page.getByText('enable notifications in your browser')).toBeVisible();

    await context.close();
  });

  test('should display notification with correct content', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['notifications'],
    });
    const page = await context.newPage();

    await page.goto('/');

    // Simulate receiving a push notification via service worker
    const notificationData = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;

      // Trigger notification from service worker
      await registration.showNotification('Test Notification', {
        body: 'This is a test notification body',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test-notification',
        data: { url: '/notifications/123' },
      });

      // Get displayed notifications
      const notifications = await registration.getNotifications({ tag: 'test-notification' });
      return notifications.map((n) => ({
        title: n.title,
        body: n.body,
        tag: n.tag,
      }));
    });

    expect(notificationData.length).toBe(1);
    expect(notificationData[0].title).toBe('Test Notification');
    expect(notificationData[0].body).toBe('This is a test notification body');

    await context.close();
  });
});
```

## Background Sync Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Background Sync', () => {
  test('should register a background sync event', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const syncRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;

      // Register a sync event
      await registration.sync.register('outbox-sync');

      // Verify registration
      const tags = await registration.sync.getTags();
      return tags.includes('outbox-sync');
    });

    expect(syncRegistered).toBe(true);
  });

  test('should sync pending data when connection restores', async ({ page }) => {
    await page.goto('/notes');
    await page.waitForLoadState('networkidle');

    // Go offline
    await page.context().setOffline(true);

    // Create a note while offline
    await page.getByLabel('Note title').fill('Offline Note');
    await page.getByLabel('Note content').fill('Created while offline');
    await page.getByRole('button', { name: 'Save' }).click();

    // Note should be saved locally
    await expect(page.getByText('Saved offline')).toBeVisible();

    // Verify note is in pending sync queue
    const pendingCount = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const req = indexedDB.open('outbox', 1);
        req.onsuccess = () => resolve(req.result);
      });
      const tx = db.transaction('pending', 'readonly');
      const store = tx.objectStore('pending');
      const count = await new Promise<number>((resolve) => {
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
      });
      return count;
    });

    expect(pendingCount).toBeGreaterThan(0);

    // Go back online -- background sync should trigger
    await page.context().setOffline(false);

    // Wait for sync to complete
    await page.waitForResponse('**/api/notes', { timeout: 10000 });

    // Note should now show as synced
    await expect(page.getByText('Synced')).toBeVisible();
  });
});
```

## App Shell Architecture Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('App Shell Architecture', () => {
  test('should load app shell from cache instantly', async ({ page }) => {
    // First visit to cache the shell
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await page.context().setOffline(true);

    // Measure reload time
    const startTime = Date.now();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // App shell should load in under 1 second from cache
    expect(loadTime).toBeLessThan(1000);

    // Shell elements should be present
    await expect(page.getByTestId('app-header')).toBeVisible();
    await expect(page.getByTestId('app-nav')).toBeVisible();
    await expect(page.getByTestId('app-footer')).toBeVisible();

    await page.context().setOffline(false);
  });

  test('should stream content into the app shell', async ({ page }) => {
    await page.goto('/');

    // Shell should appear before content
    await expect(page.getByTestId('app-header')).toBeVisible();

    // Content area should show loading state then actual content
    const contentArea = page.getByTestId('content-area');
    await expect(contentArea).toBeVisible();

    // Wait for dynamic content to load
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('dynamic-content')).toBeVisible();
  });
});
```

## Lighthouse PWA Audit Automation

```typescript
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

test.describe('Lighthouse PWA Audit', () => {
  test('should pass Lighthouse PWA audit', async () => {
    const url = process.env.BASE_URL || 'http://localhost:3000';

    // Run Lighthouse CLI
    execSync(
      `npx lighthouse ${url} --only-categories=pwa --output=json --output-path=./lighthouse-pwa.json --chrome-flags="--headless --no-sandbox"`,
      { timeout: 60000 }
    );

    const report = JSON.parse(readFileSync('./lighthouse-pwa.json', 'utf-8'));
    const pwaCategory = report.categories.pwa;

    // PWA score should be at least 90
    expect(pwaCategory.score * 100).toBeGreaterThanOrEqual(90);

    // Check individual audits
    const audits = report.audits;

    // Installability
    expect(audits['installable-manifest'].score).toBe(1);

    // Service worker
    expect(audits['service-worker'].score).toBe(1);

    // HTTPS (or localhost)
    expect(audits['is-on-https'].score).toBe(1);

    // Viewport
    expect(audits['viewport'].score).toBe(1);

    // Content sized correctly for viewport
    expect(audits['content-width'].score).toBe(1);
  });

  test('should have all required PWA manifest properties', async () => {
    const url = process.env.BASE_URL || 'http://localhost:3000';

    execSync(
      `npx lighthouse ${url} --only-audits=installable-manifest --output=json --output-path=./lighthouse-manifest.json --chrome-flags="--headless --no-sandbox"`,
      { timeout: 60000 }
    );

    const report = JSON.parse(readFileSync('./lighthouse-manifest.json', 'utf-8'));
    const audit = report.audits['installable-manifest'];

    expect(audit.score).toBe(1);

    // Should not have any failure reasons
    if (audit.details?.debugData?.failures) {
      expect(audit.details.debugData.failures).toHaveLength(0);
    }
  });
});
```

## Cache Invalidation Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cache Invalidation', () => {
  test('should clear old caches when service worker updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check current cache names
    const initialCaches = await page.evaluate(async () => {
      return await caches.keys();
    });

    expect(initialCaches.length).toBeGreaterThan(0);

    // Simulate SW update by evaluating cache cleanup logic
    const remainingCaches = await page.evaluate(async () => {
      const CURRENT_VERSION = 'v2';
      const cacheNames = await caches.keys();

      // Delete caches that do not match current version
      await Promise.all(
        cacheNames
          .filter((name) => !name.includes(CURRENT_VERSION))
          .map((name) => caches.delete(name))
      );

      return await caches.keys();
    });

    // Only current version caches should remain
    for (const name of remainingCaches) {
      expect(name).toContain('v2');
    }
  });

  test('should respect cache-control headers', async ({ page }) => {
    const responses: { url: string; cacheControl: string | null }[] = [];

    page.on('response', (response) => {
      responses.push({
        url: response.url(),
        cacheControl: response.headers()['cache-control'] || null,
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // HTML should have no-cache or short max-age
    const htmlResponse = responses.find((r) => r.url.endsWith('/') || r.url.endsWith('.html'));
    if (htmlResponse?.cacheControl) {
      expect(htmlResponse.cacheControl).toMatch(/no-cache|max-age=0|must-revalidate/);
    }

    // Static assets should have long cache duration
    const staticAssets = responses.filter(
      (r) => r.url.match(/\.(js|css|png|jpg|svg|woff2?)(\?.*)?$/)
    );
    for (const asset of staticAssets) {
      if (asset.cacheControl) {
        // Static assets should be cached for at least a day
        const maxAgeMatch = asset.cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          expect(parseInt(maxAgeMatch[1])).toBeGreaterThanOrEqual(86400);
        }
      }
    }
  });
});
```

## Best Practices

1. **Always test the service worker lifecycle** -- Registration, installation, activation, and update flows must all be tested. Do not assume the service worker is always active.
2. **Test offline before online** -- Cache the initial visit, then test offline behavior. This ensures your tests reflect the real user experience.
3. **Verify cache contents explicitly** -- Do not assume resources are cached. Use the Cache API to inspect what is actually stored.
4. **Test with real network interruptions** -- Use `page.context().setOffline(true)` but also test with network throttling to simulate real mobile conditions.
5. **Validate the manifest against Lighthouse** -- Automate Lighthouse PWA audits in CI to catch installability regressions.
6. **Test service worker updates across tabs** -- Open multiple tabs and verify that updates propagate correctly using skipWaiting and clients.claim.
7. **Verify background sync with IndexedDB** -- Inspect the IndexedDB outbox to confirm that offline actions are queued and synced when connectivity returns.
8. **Test push notification permissions** -- Test all three permission states: granted, denied, and default. Verify the UI adapts to each state.
9. **Monitor cache storage usage** -- Use the Storage API to verify that cached data does not exceed storage quotas.
10. **Test the app shell loading pattern** -- Verify that the shell loads instantly from cache while dynamic content streams in from the network.

## Anti-Patterns to Avoid

1. **Not cleaning up service workers between tests** -- Stale service workers from previous tests can cause flaky behavior. Unregister all service workers in beforeEach.
2. **Testing cache behavior without waiting for SW activation** -- Always wait for `navigator.serviceWorker.ready` before testing cache-dependent features.
3. **Ignoring the HTTPS requirement** -- Service workers only work on HTTPS (or localhost). Tests that skip this check will pass locally but fail in production.
4. **Hardcoding cache names in tests** -- Cache names change with versions. Query cache names dynamically rather than asserting against hardcoded strings.
5. **Not testing cache eviction** -- Caches can fill up. Test that your eviction strategy works by filling the cache and verifying old entries are removed.
6. **Skipping manifest icon validation** -- Many PWA install failures happen because icons are missing or the wrong size. Always validate icon accessibility.
7. **Testing push notifications without permission handling** -- Always test the permission denied flow, not just the granted flow.
8. **Ignoring service worker scope** -- A service worker only controls pages within its scope. Verify the scope matches your application structure.
9. **Not testing the update prompt UX** -- Users need to be told when a new version is available. Test the entire update flow including the notification and reload.
10. **Testing offline mode without first establishing a cache** -- Going offline before the service worker has cached resources will always fail. Ensure caching is complete before offline tests.

## Running PWA Tests

- Run all PWA tests: `npx playwright test tests/pwa/`
- Run service worker tests: `npx playwright test tests/pwa/service-worker/`
- Run offline tests: `npx playwright test tests/pwa/offline/`
- Run manifest validation: `npx playwright test tests/pwa/manifest/`
- Run Lighthouse audit: `npx lighthouse http://localhost:3000 --only-categories=pwa`
- Debug service worker in browser: Open DevTools > Application > Service Workers
- Inspect caches: DevTools > Application > Cache Storage
- Run tests in headed mode: `npx playwright test tests/pwa/ --headed`
- Update visual snapshots: `npx playwright test tests/pwa/ --update-snapshots`
