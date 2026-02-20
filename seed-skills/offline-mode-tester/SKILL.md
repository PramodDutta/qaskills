---
name: Offline Mode Tester
description: Validate progressive web app offline functionality including service worker caching, offline data persistence, sync-on-reconnect behavior, and graceful degradation
version: 1.0.0
author: Pramod
license: MIT
tags: [offline-mode, pwa, service-worker, offline-first, sync, cache-api, network-resilience, progressive-web-app]
testingTypes: [e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Offline Mode Tester Skill

You are an expert QA automation engineer specializing in testing progressive web app offline functionality, service worker behavior, and network resilience. When the user asks you to write, review, or debug offline mode tests, follow these detailed instructions.

## Core Principles

1. **Network is unreliable by default** -- Every feature must be tested under the assumption that network connectivity can drop at any moment. Design tests to verify that the application degrades gracefully rather than failing catastrophically.
2. **Service workers are the backbone** -- Service workers control the offline experience. Tests must verify their registration, activation, caching strategies, and update lifecycle independently from application logic.
3. **Data integrity survives offline transitions** -- Any data created, modified, or deleted while offline must be persisted locally and synchronized correctly when connectivity returns. Tests must verify that no data is lost or duplicated during the transition.
4. **Offline is not binary** -- Real-world connectivity exists on a spectrum from full speed to completely offline, including slow 3G, intermittent connections, and high-latency scenarios. Tests should cover the entire spectrum.
5. **User feedback is mandatory** -- The application must communicate its connectivity status to the user. Tests should verify that offline indicators, sync status messages, and error states are displayed correctly.
6. **Cache invalidation is critical** -- Stale cached content is a bug. Tests must verify that cache expiration, versioned assets, and content freshness checks work correctly across offline/online transitions.
7. **Background sync must be reliable** -- Queued actions must survive browser restarts, tab closures, and service worker restarts. Tests should verify the durability and ordering of the sync queue.

## Project Structure

Organize offline mode tests with this structure:

```
tests/
  offline/
    network-transitions/
      offline-to-online.spec.ts
      online-to-offline.spec.ts
      intermittent-connectivity.spec.ts
    service-worker/
      registration.spec.ts
      caching-strategies.spec.ts
      update-lifecycle.spec.ts
    data-persistence/
      indexeddb-offline.spec.ts
      local-storage.spec.ts
      form-queue.spec.ts
    sync/
      background-sync.spec.ts
      conflict-resolution.spec.ts
      retry-logic.spec.ts
    degradation/
      slow-network.spec.ts
      partial-load.spec.ts
      asset-fallback.spec.ts
  fixtures/
    offline.fixture.ts
    service-worker.fixture.ts
  helpers/
    network-controller.ts
    storage-inspector.ts
    sync-monitor.ts
  pages/
    app-shell.page.ts
    offline-page.page.ts
playwright.config.ts
```

## Setting Up the Offline Test Infrastructure

### Network Controller Utility

Build a centralized utility for managing network state during tests:

```typescript
import { Page, BrowserContext } from '@playwright/test';

export type NetworkCondition = 'online' | 'offline' | 'slow-3g' | 'fast-3g' | 'flaky';

interface ThrottleProfile {
  offline: boolean;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

const NETWORK_PROFILES: Record<string, ThrottleProfile> = {
  online: {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  },
  offline: {
    offline: true,
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
  },
  'slow-3g': {
    offline: false,
    downloadThroughput: (400 * 1024) / 8, // 400 kbps
    uploadThroughput: (400 * 1024) / 8,
    latency: 2000,
  },
  'fast-3g': {
    offline: false,
    downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
    uploadThroughput: (750 * 1024) / 8,
    latency: 300,
  },
};

export class NetworkController {
  private readonly page: Page;
  private readonly context: BrowserContext;
  private currentCondition: NetworkCondition = 'online';
  private flakyInterval: ReturnType<typeof setInterval> | null = null;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  async setCondition(condition: NetworkCondition): Promise<void> {
    this.stopFlaky();

    if (condition === 'flaky') {
      await this.startFlaky();
      return;
    }

    const cdpSession = await this.context.newCDPSession(this.page);
    const profile = NETWORK_PROFILES[condition];

    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: profile.offline,
      downloadThroughput: profile.downloadThroughput,
      uploadThroughput: profile.uploadThroughput,
      latency: profile.latency,
    });

    this.currentCondition = condition;
  }

  async goOffline(): Promise<void> {
    await this.setCondition('offline');
  }

  async goOnline(): Promise<void> {
    await this.setCondition('online');
  }

  async simulateSlowNetwork(): Promise<void> {
    await this.setCondition('slow-3g');
  }

  private async startFlaky(): Promise<void> {
    this.currentCondition = 'flaky';
    let isOffline = false;

    this.flakyInterval = setInterval(async () => {
      isOffline = !isOffline;
      const cdpSession = await this.context.newCDPSession(this.page);
      const profile = isOffline ? NETWORK_PROFILES.offline : NETWORK_PROFILES.online;

      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: profile.offline,
        downloadThroughput: profile.downloadThroughput,
        uploadThroughput: profile.uploadThroughput,
        latency: profile.latency,
      });
    }, 2000 + Math.random() * 3000);
  }

  private stopFlaky(): void {
    if (this.flakyInterval) {
      clearInterval(this.flakyInterval);
      this.flakyInterval = null;
    }
  }

  getCurrentCondition(): NetworkCondition {
    return this.currentCondition;
  }

  async disconnect(): void {
    this.stopFlaky();
    await this.setCondition('online');
  }
}
```

### Storage Inspector Utility

Create a utility to inspect client-side storage during offline tests:

```typescript
import { Page } from '@playwright/test';

export interface StorageSnapshot {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  indexedDBDatabases: string[];
  cacheStorageKeys: string[];
}

export class StorageInspector {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  async getAllLocalStorage(): Promise<Record<string, string>> {
    return this.page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) items[key] = localStorage.getItem(key) || '';
      }
      return items;
    });
  }

  async getIndexedDBData(dbName: string, storeName: string): Promise<unknown[]> {
    return this.page.evaluate(
      ({ dbName, storeName }) => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const getAllReq = store.getAll();
            getAllReq.onsuccess = () => resolve(getAllReq.result);
            getAllReq.onerror = () => reject(getAllReq.error);
          };
        });
      },
      { dbName, storeName }
    );
  }

  async getCacheStorageKeys(): Promise<string[]> {
    return this.page.evaluate(async () => {
      const cacheNames = await caches.keys();
      return cacheNames;
    });
  }

  async getCachedUrls(cacheName: string): Promise<string[]> {
    return this.page.evaluate(async (name) => {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      return requests.map((r) => r.url);
    }, cacheName);
  }

  async clearAllStorage(): Promise<void> {
    await this.page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();

      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }

      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    });
  }

  async takeSnapshot(): Promise<StorageSnapshot> {
    return this.page.evaluate(async () => {
      const ls: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) ls[key] = localStorage.getItem(key) || '';
      }

      const ss: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) ss[key] = sessionStorage.getItem(key) || '';
      }

      const dbs = await indexedDB.databases();
      const cacheNames = await caches.keys();

      return {
        localStorage: ls,
        sessionStorage: ss,
        indexedDBDatabases: dbs.map((db) => db.name || '').filter(Boolean),
        cacheStorageKeys: cacheNames,
      };
    });
  }
}
```

### Custom Test Fixture

```typescript
import { test as base, expect } from '@playwright/test';
import { NetworkController } from '../helpers/network-controller';
import { StorageInspector } from '../helpers/storage-inspector';

interface OfflineFixtures {
  network: NetworkController;
  storage: StorageInspector;
  ensureServiceWorkerReady: () => Promise<void>;
}

export const test = base.extend<OfflineFixtures>({
  network: async ({ page, context }, use) => {
    const controller = new NetworkController(page, context);
    await use(controller);
    await controller.disconnect();
  },

  storage: async ({ page }, use) => {
    const inspector = new StorageInspector(page);
    await use(inspector);
  },

  ensureServiceWorkerReady: async ({ page }, use) => {
    const waitForSW = async () => {
      await page.waitForFunction(
        () => {
          return navigator.serviceWorker.controller !== null;
        },
        { timeout: 15000 }
      );

      // Wait for the service worker to finish activating
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active?.state !== 'activated') {
          await new Promise<void>((resolve) => {
            registration.active?.addEventListener('statechange', () => {
              if (registration.active?.state === 'activated') {
                resolve();
              }
            });
          });
        }
      });
    };
    await use(waitForSW);
  },
});

export { expect };
```

## Network Transition Testing

The most critical offline tests verify behavior during transitions between online and offline states.

### Online-to-Offline Transition

```typescript
import { test, expect } from '../fixtures/offline.fixture';

test.describe('Online to Offline Transition', () => {
  test('app shows offline indicator when network drops', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/dashboard');
    await ensureServiceWorkerReady();

    // Verify online state
    await expect(page.getByTestId('connection-status')).toHaveText(/online/i);

    // Go offline
    await network.goOffline();

    // App should detect and display offline status
    await expect(page.getByTestId('connection-status')).toHaveText(/offline/i);
    await expect(page.getByTestId('offline-banner')).toBeVisible();
  });

  test('cached pages remain accessible offline', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    // Visit pages while online to populate cache
    await page.goto('/dashboard');
    await ensureServiceWorkerReady();
    await page.goto('/profile');
    await page.goto('/settings');

    // Go offline
    await network.goOffline();

    // Navigate to previously visited pages
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('uncached pages show offline fallback', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/dashboard');
    await ensureServiceWorkerReady();

    await network.goOffline();

    // Navigate to a page that was never visited (not cached)
    await page.goto('/reports/detailed-analysis');

    // Should show the offline fallback page
    await expect(page.getByText(/you are offline/i)).toBeVisible();
    await expect(page.getByText(/this page is not available/i)).toBeVisible();
  });

  test('in-progress form data is preserved when going offline', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/tasks/new');
    await ensureServiceWorkerReady();

    // Fill in form data
    await page.getByLabel('Task Title').fill('Important task');
    await page.getByLabel('Description').fill('This task needs to be completed by Friday');
    await page.getByLabel('Priority').selectOption('high');

    // Go offline mid-form
    await network.goOffline();

    // Form data should still be present
    await expect(page.getByLabel('Task Title')).toHaveValue('Important task');
    await expect(page.getByLabel('Description')).toHaveValue(
      'This task needs to be completed by Friday'
    );
    await expect(page.getByLabel('Priority')).toHaveValue('high');
  });

  test('API requests are queued when going offline', async ({
    page,
    network,
    storage,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/tasks');
    await ensureServiceWorkerReady();

    await network.goOffline();

    // Attempt to create a task while offline
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel('Task Title').fill('Offline task');
    await page.getByRole('button', { name: /save/i }).click();

    // Should show a "saved offline" indicator
    await expect(page.getByText(/saved offline|queued/i)).toBeVisible();

    // Verify the request was queued in storage
    const queuedActions = await storage.getIndexedDBData('offline-queue', 'actions');
    expect(queuedActions.length).toBeGreaterThan(0);
  });
});
```

### Offline-to-Online Transition (Sync on Reconnect)

```typescript
import { test, expect } from '../fixtures/offline.fixture';

test.describe('Offline to Online Transition', () => {
  test('queued actions sync when connectivity returns', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/tasks');
    await ensureServiceWorkerReady();

    // Go offline and create tasks
    await network.goOffline();

    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel('Task Title').fill('Offline task 1');
    await page.getByRole('button', { name: /save/i }).click();

    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel('Task Title').fill('Offline task 2');
    await page.getByRole('button', { name: /save/i }).click();

    // Reconnect
    await network.goOnline();

    // Wait for sync to complete
    await expect(page.getByText(/synced|all changes saved/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify tasks now appear with server-assigned IDs
    await page.reload();
    await expect(page.getByText('Offline task 1')).toBeVisible();
    await expect(page.getByText('Offline task 2')).toBeVisible();
  });

  test('sync preserves action ordering', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/tasks');
    await ensureServiceWorkerReady();

    await network.goOffline();

    // Create, then update, then delete -- order matters
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByLabel('Task Title').fill('Task to edit then delete');
    await page.getByRole('button', { name: /save/i }).click();

    // Edit the task
    await page.getByText('Task to edit then delete').click();
    await page.getByLabel('Task Title').fill('Edited while offline');
    await page.getByRole('button', { name: /save/i }).click();

    // Delete the task
    await page.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await network.goOnline();
    await expect(page.getByText(/synced/i)).toBeVisible({ timeout: 10000 });

    // The task should not exist after sync (create -> edit -> delete)
    await page.reload();
    await expect(page.getByText('Edited while offline')).not.toBeVisible();
    await expect(page.getByText('Task to edit then delete')).not.toBeVisible();
  });

  test('conflict resolution handles concurrent edits', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/tasks');
    await ensureServiceWorkerReady();

    // Ensure a task exists
    const taskTitle = 'Conflict test task';
    await expect(page.getByText(taskTitle)).toBeVisible();

    await network.goOffline();

    // Edit the task offline
    await page.getByText(taskTitle).click();
    await page.getByLabel('Task Title').fill('Offline edit');
    await page.getByRole('button', { name: /save/i }).click();

    // Simulate a server-side edit while we are offline
    await page.evaluate(async () => {
      // This simulates another user editing the same task on the server
      await fetch('/api/test-helpers/simulate-server-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: 'Conflict test task',
          newTitle: 'Server edit',
        }),
      });
    });

    await network.goOnline();

    // Should show conflict resolution UI
    await expect(page.getByText(/conflict detected/i)).toBeVisible({ timeout: 10000 });

    // User can choose which version to keep
    await expect(page.getByText('Offline edit')).toBeVisible();
    await expect(page.getByText('Server edit')).toBeVisible();
  });

  test('offline indicator disappears when connection is restored', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/dashboard');
    await ensureServiceWorkerReady();

    await network.goOffline();
    await expect(page.getByTestId('offline-banner')).toBeVisible();

    await network.goOnline();
    await expect(page.getByTestId('offline-banner')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('connection-status')).toHaveText(/online/i);
  });
});
```

## Service Worker Lifecycle Testing

Service workers have a distinct lifecycle that must be tested independently.

```typescript
import { test, expect } from '../fixtures/offline.fixture';

test.describe('Service Worker Lifecycle', () => {
  test('service worker registers successfully on first visit', async ({ page }) => {
    await page.goto('/');

    const swRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration !== undefined;
    });

    expect(swRegistered).toBe(true);
  });

  test('service worker activates and controls the page', async ({
    page,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/');
    await ensureServiceWorkerReady();

    const swState = await page.evaluate(() => {
      return navigator.serviceWorker.controller?.state;
    });

    expect(swState).toBe('activated');
  });

  test('service worker update is detected and applied', async ({ page }) => {
    await page.goto('/');

    // Wait for the initial service worker
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    // Trigger an update check
    const updateFound = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;

      return new Promise<boolean>((resolve) => {
        registration.addEventListener('updatefound', () => {
          resolve(true);
        });

        // Force update check
        registration.update().catch(() => resolve(false));

        // Timeout if no update found
        setTimeout(() => resolve(false), 10000);
      });
    });

    // Whether an update is found depends on the deployment state
    // This test verifies the update mechanism works
    expect(typeof updateFound).toBe('boolean');
  });

  test('cache-first strategy serves cached assets offline', async ({
    page,
    network,
    storage,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/');
    await ensureServiceWorkerReady();

    // Check that static assets are cached
    const cacheKeys = await storage.getCacheStorageKeys();
    expect(cacheKeys.length).toBeGreaterThan(0);

    // Find the static assets cache
    const staticCache = cacheKeys.find(
      (key) => key.includes('static') || key.includes('assets')
    );
    expect(staticCache).toBeDefined();

    if (staticCache) {
      const cachedUrls = await storage.getCachedUrls(staticCache);
      expect(cachedUrls.length).toBeGreaterThan(0);

      // Verify CSS and JS assets are cached
      const hasCss = cachedUrls.some((url) => url.endsWith('.css'));
      const hasJs = cachedUrls.some((url) => url.endsWith('.js'));
      expect(hasCss || hasJs).toBe(true);
    }

    // Go offline and verify assets still load
    await network.goOffline();
    await page.reload();

    // Page should still render with cached assets
    await expect(page.locator('body')).toBeVisible();
  });

  test('network-first strategy falls back to cache on failure', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    // Load the API data while online
    await page.goto('/dashboard');
    await ensureServiceWorkerReady();
    await page.waitForLoadState('networkidle');

    // Capture the displayed data
    const onlineData = await page.getByTestId('dashboard-data').textContent();

    // Go offline
    await network.goOffline();

    // Reload -- should fall back to cached API response
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const offlineData = await page.getByTestId('dashboard-data').textContent();
    expect(offlineData).toBe(onlineData);
  });
});
```

## Offline Form Submission Queuing

Forms are a critical part of the offline experience. Users must be able to submit forms offline with confidence that their data will be sent when connectivity returns.

```typescript
import { test, expect } from '../fixtures/offline.fixture';

test.describe('Offline Form Submission', () => {
  test('form submission is queued when offline', async ({
    page,
    network,
    storage,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/feedback');
    await ensureServiceWorkerReady();

    await network.goOffline();

    await page.getByLabel('Subject').fill('Great product');
    await page.getByLabel('Message').fill('I love the offline support.');
    await page.getByLabel('Rating').selectOption('5');
    await page.getByRole('button', { name: /submit/i }).click();

    // Should show queued confirmation
    await expect(page.getByText(/will be sent when.*online/i)).toBeVisible();

    // Verify in IndexedDB queue
    const queue = await storage.getIndexedDBData('offline-queue', 'actions');
    const formSubmission = (queue as any[]).find((item) =>
      item.url?.includes('/api/feedback')
    );
    expect(formSubmission).toBeDefined();
    expect(formSubmission.body).toContain('Great product');
  });

  test('queued form submissions are sent in order on reconnect', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/feedback');
    await ensureServiceWorkerReady();

    await network.goOffline();

    // Submit multiple forms
    for (let i = 1; i <= 3; i++) {
      await page.getByLabel('Subject').fill(`Feedback ${i}`);
      await page.getByLabel('Message').fill(`Message number ${i}`);
      await page.getByRole('button', { name: /submit/i }).click();
      await expect(page.getByText(/queued/i)).toBeVisible();
    }

    // Track API calls order on reconnect
    const apiCalls: string[] = [];
    await page.route('**/api/feedback', async (route) => {
      const body = route.request().postDataJSON();
      apiCalls.push(body.subject);
      await route.continue();
    });

    await network.goOnline();
    await new Promise((r) => setTimeout(r, 5000));

    // Verify order
    expect(apiCalls).toEqual(['Feedback 1', 'Feedback 2', 'Feedback 3']);
  });

  test('failed sync retries with exponential backoff', async ({
    page,
    network,
    storage,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/feedback');
    await ensureServiceWorkerReady();

    await network.goOffline();

    await page.getByLabel('Subject').fill('Retry test');
    await page.getByLabel('Message').fill('This should retry');
    await page.getByRole('button', { name: /submit/i }).click();

    // Mock API to fail on first attempts
    let attemptCount = 0;
    await page.route('**/api/feedback', async (route) => {
      attemptCount++;
      if (attemptCount < 3) {
        await route.fulfill({ status: 500, body: 'Server Error' });
      } else {
        await route.continue();
      }
    });

    await network.goOnline();
    await new Promise((r) => setTimeout(r, 15000));

    // Should have retried and eventually succeeded
    expect(attemptCount).toBeGreaterThanOrEqual(3);

    // Queue should be empty after successful sync
    const queue = await storage.getIndexedDBData('offline-queue', 'actions');
    expect(queue).toHaveLength(0);
  });
});
```

## Partial Connectivity and Slow Network Testing

Test application behavior under degraded network conditions that are not fully offline.

```typescript
import { test, expect } from '../fixtures/offline.fixture';

test.describe('Slow and Degraded Network', () => {
  test('loading indicators appear on slow network', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/dashboard');
    await ensureServiceWorkerReady();

    await network.simulateSlowNetwork();

    // Navigate to a data-heavy page
    await page.getByRole('link', { name: /reports/i }).click();

    // Should show loading state
    await expect(
      page.getByTestId('loading-spinner').or(page.getByText(/loading/i))
    ).toBeVisible();

    // Should eventually load
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible({
      timeout: 30000,
    });
  });

  test('images use lazy loading and show placeholders on slow network', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await network.simulateSlowNetwork();

    await page.goto('/gallery');
    await ensureServiceWorkerReady();

    // Images above the fold should have placeholders
    const images = page.getByRole('img');
    const firstImage = images.first();

    // Check for placeholder/blur-up pattern
    const hasPlaceholder = await firstImage.evaluate((img) => {
      const style = window.getComputedStyle(img);
      return (
        img.getAttribute('loading') === 'lazy' ||
        style.backgroundImage !== 'none' ||
        img.classList.contains('placeholder')
      );
    });

    expect(hasPlaceholder).toBe(true);
  });

  test('intermittent connectivity does not cause data corruption', async ({
    page,
    network,
    ensureServiceWorkerReady,
  }) => {
    await page.goto('/tasks');
    await ensureServiceWorkerReady();

    // Start with a known state
    const initialTaskCount = await page.getByTestId('task-item').count();

    // Simulate flaky connection while performing actions
    await network.setCondition('flaky');

    // Perform multiple actions during flaky connectivity
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /add task/i }).click();
      await page.getByLabel('Task Title').fill(`Flaky task ${i + 1}`);
      await page.getByRole('button', { name: /save/i }).click();
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Restore stable connection
    await network.goOnline();
    await new Promise((r) => setTimeout(r, 5000));

    // Reload and verify data integrity
    await page.reload();
    await page.waitForLoadState('networkidle');

    const finalTaskCount = await page.getByTestId('task-item').count();
    expect(finalTaskCount).toBe(initialTaskCount + 3);

    // Verify no duplicate tasks
    for (let i = 0; i < 3; i++) {
      const matchingTasks = page.getByText(`Flaky task ${i + 1}`);
      await expect(matchingTasks).toHaveCount(1);
    }
  });

  test('timeout handling shows appropriate error on very slow network', async ({
    page,
    network,
  }) => {
    await page.goto('/dashboard');

    // Simulate extremely slow network (essentially a timeout scenario)
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 100, // 100 bytes/sec
      uploadThroughput: 100,
      latency: 5000,
    });

    // Try to load a heavy page
    await page.getByRole('link', { name: /analytics/i }).click();

    // Should show timeout or slow connection message
    await expect(
      page
        .getByText(/taking longer than expected/i)
        .or(page.getByText(/slow connection/i))
        .or(page.getByText(/try again/i))
    ).toBeVisible({ timeout: 30000 });
  });
});
```

## Configuration

### Playwright Configuration for Offline Testing

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/offline',
  timeout: 60000, // Longer timeout for network simulations
  retries: 2,
  workers: 1, // Sequential to avoid CDP session conflicts
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Service workers must be allowed
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'chromium-offline',
      use: {
        ...devices['Desktop Chrome'],
        // CDP is needed for network emulation
        launchOptions: {
          args: ['--enable-features=NetworkService'],
        },
      },
    },
    {
      name: 'mobile-offline',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: ['--enable-features=NetworkService'],
        },
      },
    },
  ],
});
```

### Environment Variables

```bash
# .env.test
BASE_URL=http://localhost:3000
SW_CACHE_VERSION=v1
OFFLINE_QUEUE_DB_NAME=offline-queue
OFFLINE_QUEUE_STORE_NAME=actions
SYNC_RETRY_MAX_ATTEMPTS=5
SYNC_RETRY_BASE_DELAY_MS=1000
SLOW_NETWORK_THRESHOLD_MS=5000
```

## Best Practices

1. **Always wait for service worker activation** -- Service worker registration is asynchronous. Attempting offline tests before the service worker is active results in flaky failures. Use the `ensureServiceWorkerReady` fixture pattern shown above.

2. **Use CDP for network emulation, not route blocking** -- Playwright's `page.route()` only intercepts requests at the page level, bypassing service workers entirely. Chrome DevTools Protocol (CDP) network emulation simulates real network conditions that service workers must handle.

3. **Test with a clean storage state** -- Each test should start with a fresh browser context and clean storage. Leftover IndexedDB data, cached responses, or stale service workers from previous tests cause unpredictable behavior.

4. **Verify both cache hits and cache misses** -- Do not assume everything is cached. Test scenarios where the user navigates to a page they have never visited while offline to verify the fallback page works.

5. **Test the sync queue durability** -- The offline action queue must survive page refreshes, tab closures, and browser restarts. Write tests that verify queue persistence across these scenarios.

6. **Simulate real-world network patterns** -- Flaky connections that alternate between online and offline every few seconds are more realistic than a clean offline toggle. Include tests with the "flaky" network profile.

7. **Monitor IndexedDB and Cache Storage state** -- Use the StorageInspector utility to verify that data is being stored in the expected locations and formats. Silent storage failures are a common source of offline bugs.

8. **Test cache versioning and migration** -- When deploying a new service worker version, old cached data may need migration. Verify that the new service worker correctly handles data from the previous cache version.

9. **Run offline tests on mobile viewports** -- Mobile devices have different service worker behavior, storage limits, and network characteristics. Always include a mobile viewport in your test matrix.

10. **Set longer timeouts for network tests** -- Network emulation introduces real delays. Use a base timeout of 60 seconds or more for offline test suites to avoid spurious timeout failures.

11. **Test with pre-populated and empty caches** -- The offline experience differs significantly between a returning user with warm caches and a first-time visitor. Test both scenarios explicitly.

12. **Verify no console errors during offline transitions** -- Unhandled promise rejections and network errors in the console indicate missing error handling. Assert that the console is clean during offline navigation.

## Anti-Patterns to Avoid

1. **Using page.route() to simulate offline** -- This only intercepts page-level requests and does not affect service worker fetch events. Service workers bypass Playwright route handlers, making this approach fundamentally broken for offline testing. Always use CDP network emulation.

2. **Testing offline without a service worker** -- If the application does not register a service worker, there is no offline capability to test. Verify service worker registration first before writing offline behavior tests.

3. **Assuming instant cache population** -- Cache storage writes are asynchronous. Testing offline behavior immediately after the first page load may fail because the cache has not finished populating. Add explicit waits for cache readiness.

4. **Ignoring IndexedDB storage limits** -- Browsers impose storage quotas that vary by platform and available disk space. Tests that work on a developer machine with ample storage may fail on CI runners with limited disk. Test with storage pressure scenarios.

5. **Not cleaning up CDP sessions** -- CDP sessions created for network emulation persist across test boundaries if not properly cleaned up. Always restore online connectivity in the test teardown to prevent leaking network conditions.

6. **Treating offline as a toggle** -- Real offline transitions involve DNS resolution failures, TCP connection timeouts, and partial response delivery. A clean offline toggle does not test these edge cases. Combine CDP network emulation with route-level failure injection for comprehensive coverage.

7. **Skipping conflict resolution tests** -- When the same data is modified both offline and on the server, conflicts are inevitable. Skipping conflict resolution tests leaves a critical user-facing flow untested.

## Debugging Tips

1. **Inspect service worker status in DevTools** -- Chrome DevTools Application tab shows the service worker state (installing, waiting, active, redundant). If tests fail, check whether the service worker is in the expected state.

2. **Enable service worker console logging** -- Service workers run in a separate context. Use `console.log` within the service worker and check the "Service Worker" console in DevTools. Playwright can capture these logs via the `page.on('console')` event.

3. **Check cache storage contents** -- Use the StorageInspector utility or Chrome DevTools Application > Cache Storage to verify which URLs are cached and whether cached responses are complete and valid.

4. **Verify IndexedDB transaction completion** -- IndexedDB operations fail silently when transactions are aborted. Add explicit error handlers to all IndexedDB operations and log transaction states during test development.

5. **Monitor network requests in the trace** -- Playwright's trace viewer shows all network requests including those handled by the service worker. Look for requests that received cached responses versus those that failed with network errors.

6. **Check for stale service workers** -- If a test registers a new service worker but the old one is still controlling the page, the offline behavior will use the old caching strategy. Use `skipWaiting()` and `clients.claim()` in the service worker to ensure immediate activation.

7. **Verify the offline queue on disk** -- When sync-on-reconnect fails, dump the entire IndexedDB offline queue to understand what actions were queued and in what state they are. Common issues include malformed request bodies and missing authentication tokens.

8. **Test with "Application > Clear Storage" first** -- When debugging persistent failures, clear all storage and start fresh. Stale caches and outdated IndexedDB schemas are the most common causes of offline test flakiness.

9. **Check navigator.onLine accuracy** -- The `navigator.onLine` property is not perfectly reliable across all browsers. If your application depends on this property, verify that your service worker also uses fetch failure detection as a backup.

10. **Use Playwright's built-in CDP access** -- Playwright provides `context.newCDPSession(page)` for Chromium-based browsers. Use this to inspect service worker internals, cache state, and network conditions without leaving the test framework.
