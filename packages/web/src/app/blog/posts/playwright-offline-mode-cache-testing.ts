import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Offline Cache Behavior with Playwright',
  description:
    'Test offline cache behavior with Playwright across first load, service-worker fallback, queued writes, and reliable reconnection without false positives.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test Offline Cache Behavior with Playwright

Pull the network cable after the dashboard has loaded. The shell should remain usable, yesterday's orders should still be readable, and a newly entered note should wait for synchronization. Those are three separate promises, even though product requirements often compress them into “works offline.” A Playwright test needs to separate the browser's transport state, the service worker's cache decisions, the application's local persistence, and the server reconciliation that follows.

Playwright exposes the essential switch as \`browserContext.setOffline(true)\`. That switch emulates an offline network for every page in the context. It does not seed a cache, install a service worker, decide which requests should have fallbacks, or prove that queued data reached the backend later. The test must arrange those states deliberately.

This tutorial builds a lifecycle-based suite: establish a clean online visit, verify cache priming, cut connectivity, exercise an offline read or mutation, restore connectivity, and assert the final server-visible result.

## Define the offline contract before automating it

“Offline support” can mean anything from a static error page to a fully editable local-first workspace. Write expected behavior per resource instead of giving the entire application one label.

| Resource or action | First visit while offline | Revisit after online priming | Expected after reconnection |
|---|---|---|---|
| App shell HTML, CSS, JavaScript | Browser error or explicit offline page | Shell loads from service-worker cache | A newer shell may update under the worker's policy |
| Previously viewed order | Usually unavailable unless preloaded | Cached snapshot remains readable | Background refresh replaces stale data |
| New note | Editor may be unavailable | Stored locally with pending state | One server record is created |
| Destructive payment action | Must be blocked | Must remain blocked | User retries with fresh server validation |
| Avatar image | Placeholder is acceptable | Cached image may render | Normal fetch resumes |

This matrix prevents a misleading test that merely sees a heading and declares success. Decide whether stale content needs a visible timestamp, which commands can be queued, how conflicts are resolved, and what the user sees during the transition. An offline indicator is evidence of state communication, not evidence that data is safe.

Keep cache layers distinct. The HTTP disk cache is managed by the browser. The Cache Storage API is commonly controlled by a service worker. IndexedDB may hold domain records and an outbox. Local storage may contain small preferences. A navigation could succeed from any of these paths. Your assertions should identify the path that matters to the product.

## Prime a fresh browser context and confirm worker control

Playwright Test creates an isolated browser context for each test by default. That clean slate is ideal for proving a first visit, but it means one test cannot silently depend on another having warmed a cache. Prime within the same test, or create an explicit reusable setup artifact only when the cache state itself is controlled and versioned.

Service-worker activation has a timing boundary. A first navigation can install a worker without being controlled by it until a later navigation, depending on the worker lifecycle and application code. Test the actual readiness signal. If the application exposes no visible readiness, \`navigator.serviceWorker.ready\` waits for an active registration, and \`navigator.serviceWorker.controller\` tells you whether the current page is controlled.



\`\`\`ts
import { expect, test } from '@playwright/test';

test('loads a primed orders page while offline', async ({ context, page }) => {
  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  await expect(page.getByText('Order #A-1042')).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      throw new Error('The orders page is not controlled by a service worker');
    }
  });

  await page.reload();
  await expect(page.getByText('Order #A-1042')).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('status')).toHaveText(/offline/i);
  await expect(page.getByText('Order #A-1042')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Capture payment' })).toBeDisabled();
});
\`\`\`



The online reload is intentional. It ensures the controlled page has an opportunity to exercise the worker fetch path before the network is removed. Adapt it if the application's worker calls \`skipWaiting()\` and \`clients.claim()\` or uses a different lifecycle, but never assume installation and control are identical.

The \`waitUntil\` choice also matters. An offline navigation served by a worker may not behave like an online page with analytics and streaming requests. \`domcontentloaded\` plus assertions on required UI is usually more meaningful than waiting for a network-idle heuristic.

## Inspect Cache Storage without making it the only oracle

User-facing behavior is the primary assertion, but cache inspection makes setup failures understandable. Browser-context evaluation can list cache names and keys through the standard Cache Storage API. Use that to prove that priming produced expected entries, not to duplicate the service worker's implementation in every end-to-end test.



\`\`\`ts
import { expect, test } from '@playwright/test';

test('primes the documented shell assets', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();

  const cacheInventory = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries: Record<string, string[]> = {};

    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      entries[name] = requests.map((request) => new URL(request.url).pathname);
    }

    return entries;
  });

  const allPaths = Object.values(cacheInventory).flat();
  expect(allPaths).toContain('/offline.html');
  expect(allPaths).toContain('/assets/app.css');
  expect(allPaths).not.toContain('/api/session');
});
\`\`\`



Exact cache names often include build hashes, so asserting a permanent literal name can create churn without protecting behavior. Paths can also be revisioned. Choose stable expectations owned by the product: an offline fallback exists, authenticated session responses are not cached, and the minimum shell is available.

Cache inspection cannot prove the worker will serve an entry for a navigation. Request mode, URL normalization, query strings, method, cache policy, and worker code affect the match. Keep at least one true offline reload test.

## Avoid route interception when validating the browser cache

Playwright's \`page.route()\` and \`browserContext.route()\` are excellent for API mocking, but enabling routing disables the HTTP cache. In addition, browser-context routing does not intercept requests handled inside a service worker. Those properties make a route-abort simulation different from setting the context offline.

| Technique | What it simulates | Suitable assertion | Important limitation |
|---|---|---|---|
| \`context.setOffline(true)\` | Browser context has no network | Whole-page offline behavior | Does not prove a particular request was attempted |
| \`route.abort('failed')\` | Selected matching request fails | One endpoint's error handling | Routing changes caching behavior |
| \`route.fulfill()\` | Deterministic synthetic response | UI logic for chosen payloads | Does not exercise the real worker or server |
| Server shutdown or proxy fault | Origin becomes unreachable | Integration behavior close to production | Slower and harder to isolate |
| DevTools network throttling | Constrained connection | Slow-response and timeout UX | Offline and slow are different states |

Use offline emulation for cache acceptance. Use route failure in separate tests for a single dependency, such as an avatar CDN failing while the main API remains reachable. If you need to observe service-worker-owned traffic, listen for request events on the browser context and consult Playwright's service-worker support limitations for the browser engine in use.

For broader request mocking patterns, see the [Playwright network interception guide](/blog/playwright-network-mocking-route-handler-guide). Do not combine every network technique into one test, because it becomes unclear which layer caused the outcome.

## Verify a cold offline visit separately

A primed-cache scenario should not conceal the first-visit experience. Create a new context, go offline before navigation, then attempt the URL. What counts as correct depends on architecture. A browser-native connection error may be acceptable for a non-PWA. An installable PWA might provide a navigational fallback only after a prior visit, so a truly cold profile cannot have it.

The valuable assertion is that the product does not claim impossible guarantees. If documentation says the workspace is available offline after one successful visit, test both halves: a cold profile cannot load it, and a warmed profile can. Avoid making the cold case dependent on exact Chromium error text, which is browser-specific. Assert the navigation rejection or a stable application fallback.

Use a separate [browser context isolation strategy](/blog/playwright-browser-context-guide-2026) for each cache history. Clearing cookies does not clear Cache Storage or service-worker registrations. A fresh context is a clearer boundary than trying to delete every storage mechanism manually.

## Test queued writes as an outbox state machine

Offline mutation testing is not finished when a pending badge appears. A serious test proves four facts:

1. The user's input survives a reload while still offline.
2. No server mutation succeeds during the disconnected period.
3. Reconnection sends the queued command once.
4. The pending item becomes a confirmed server record without duplication.

Prepare server state through an API fixture before opening the page. Prime the workspace, switch offline, submit a note, and assert its “Pending sync” state. Reload offline and assert the note persists, which distinguishes durable IndexedDB storage from an in-memory array. Restore connectivity with \`context.setOffline(false)\`. Then wait for the application's confirmed state and query the backend through \`context.request\` or a dedicated API client to verify exactly one record.

Do not assert that synchronization begins the instant connectivity returns unless that is the explicit contract. Browsers and applications differ in how they detect reconnection. Some listen to the window \`online\` event, some run periodic retries, and some require a user action. Expose an observable sync status and give the test a bounded web-first wait.

Idempotency deserves its own case. Toggle offline to online twice, or reload while a command is being acknowledged, and verify that the idempotency key prevents duplicate creation. A UI with one row can hide two server records if it deduplicates client-side.

## Exercise stale data and reconnection refresh

A cache can be available and still be wrong. Test staleness as a sequence with two actors. The browser primes order A-1042 as “Processing.” While that browser is offline, an API fixture changes the server record to “Shipped.” The offline page must continue showing the cached value with whatever stale marker the product promises. Once online, it should refresh to “Shipped” and update its last-synced indicator.

This case catches stale-while-revalidate implementations that never revalidate, UI stores that ignore worker responses, and timestamps accidentally generated from the current clock rather than the cached record's freshness metadata.

Conflict behavior requires a similar sequence. If an offline user edits a note while another client edits it on the server, reconnection may choose last-write-wins, reject with a conflict, or present a merge UI. The test should assert the documented policy. There is no universally correct resolution, but silently losing either edit is usually unacceptable.

## Make connectivity transitions observable and deterministic

The browser's \`navigator.onLine\` value is a coarse signal, not proof that the application origin is reachable. It is fine to use it as supporting evidence after \`setOffline()\`, but the business assertion should concern content, status, or a completed sync.

Avoid listening for an event after it may already have fired. Register page-side observers before changing the context if the test needs to capture \`offline\` or \`online\` events. Better still, assert the application's status region because that is what a user receives.

When tests fail, collect evidence from several layers:

- Playwright trace with screenshots and actions.
- Browser-context request and request-failed events.
- Page console errors, especially rejected IndexedDB transactions.
- Cache Storage inventory and service-worker registration scope.
- Application outbox entries, exposed through a test-only diagnostic API when appropriate.
- Server records and idempotency logs after reconnection.

Do not dump sensitive cached responses into CI attachments. Sanitize diagnostics and explicitly verify that authentication tokens, private API payloads, and personalized HTML are not stored in shared caches.

## Browser projects and service-worker boundaries

Service-worker behavior is a web-platform feature, but engine support and Playwright observability are not identical. Run the core offline acceptance scenario in every browser project the product supports. Keep deeper worker instrumentation in Chromium if a Playwright API is documented as Chromium-only, and label that limitation rather than implying equivalent coverage.

Use HTTPS or localhost in realistic tests because service workers require a secure context, with localhost treated specially by browsers. A test that uses \`page.setContent()\` cannot validate service-worker registration for a real origin. Serve the built application or a production-like preview.

Parallel execution can create interference if all workers share backend accounts or fixed outbox identifiers. Give each test a unique user and record key. Browser contexts isolate browser storage, but they do not isolate the server database.

## A release-focused offline suite

A compact but credible release gate contains more than one happy path:

| Scenario | Primary risk caught | Final oracle |
|---|---|---|
| Cold profile starts offline | False claim of first-visit availability | Stable fallback or expected navigation failure |
| Warmed shell reloads offline | Missing precache or worker control | Required navigation and controls render |
| Cached record is read offline | API-only implementation | Known record plus stale indication appears |
| Safe mutation queues offline | Volatile outbox | Pending item survives offline reload |
| Reconnection flushes once | Duplicate or lost writes | Exactly one server-side entity exists |
| Server changed while client offline | Refresh path is broken | New server value replaces stale display |
| Sensitive endpoint inspected | Private data cached | Forbidden URL absent from Cache Storage |
| Worker update deployed | Old shell traps clients | Defined update flow reaches new version |

Keep each row as a separate test or a small focused group. A single thirty-step offline journey is expensive to diagnose and likely to leave the context offline after an early failure. Playwright discards the context after the test, but fixtures and shared services may still need cleanup.

Offline quality is a lifecycle property. The strongest test does not merely flip a boolean. It proves what was cached, what remains usable, what is intentionally forbidden, what persists locally, and what the server finally accepts.

## Verify worker upgrades without trapping stale clients

Offline releases introduce a versioning case that ordinary page tests miss. Prime version A in a long-lived context, deploy or switch the test server to version B, then navigate online and observe the worker update policy. If the product waits for open tabs to close, assert the update prompt and the continue-on-A behavior. If it activates immediately, prove that versioned assets are compatible with the already loaded page.

After accepting the update, go offline again and require the B shell rather than a mixture of B HTML and deleted A chunks. Keep cache names and build identifiers visible through diagnostics, but assert user-facing version evidence too. Finally, verify obsolete caches are removed only after no controlled client needs them. An aggressive activation strategy can turn a routine deployment into an offline blank screen, so this scenario belongs beside the normal warmed-cache test.

## Frequently Asked Questions

### Does browserContext.setOffline(true) automatically use my service-worker cache?

It only emulates loss of network connectivity. The browser and active service worker decide whether cached responses satisfy requests. Prime the application online, confirm the page is controlled, then perform a real offline navigation and assert user-visible results.

### Why does my offline test fail after I add page.route()?

Enabling Playwright request routing disables the HTTP cache, and service-worker-handled requests have interception limitations. Keep cache acceptance tests free of routing. Put endpoint mocks and selective aborts in separate scenarios.

### Should offline state be shared through Playwright storageState?

\`storageState\` is useful for cookies, local storage, and optionally IndexedDB in supported versions, but it is not a general snapshot of service-worker registrations and Cache Storage. Priming in the test is slower but more faithful. If you optimize setup, verify exactly which storage layers are restored.

### How can I prove a queued action was not sent twice?

Assert against the backend, not only the rendered list. Give the command a stable idempotency key, reconnect through retry or reload boundaries, then query the server and require exactly one matching record.

### Must every offline test run in Chromium, Firefox, and WebKit?

Run user-facing promises in every supported engine. Keep engine-specific service-worker diagnostics in the browser where Playwright documents support, while still checking visible fallback, persistence, and reconnection behavior elsewhere.
`,
};
