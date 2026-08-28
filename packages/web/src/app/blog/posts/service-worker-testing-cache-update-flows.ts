import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Service Workers: Cache Strategies, Updates, and Kill Switches',
  description:
    'A practical guide to service worker testing that covers cache strategies, update flows, and kill switches so stale assets never outlive a deploy.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Service Workers: Cache Strategies, Updates, and Kill Switches

Service worker testing means proving three things still work after every change: which cache strategy each URL class uses, how a new worker moves from installing to controlling clients, and whether a kill switch can unregister and clear caches when production goes wrong. Skip any surface and you ship "works on my machine" confidence that collapses the next time a deploy leaves a waiting worker or a versioned cache name behind. This guide walks through contracts you can assert in CI, Playwright recipes for update and unregister paths, and the failure modes that masquerade as application bugs.

## The Three Surfaces Service Worker Tests Must Cover

Most teams only unit-test the fetch handler with fake \`Request\` objects. That is necessary and nowhere near enough. A service worker is a process with its own lifecycle, its own storage, and a loose coupling to the pages it controls. Tests that ignore those boundaries pass in CI and fail for users who keep a tab open across a deploy.

Treat every serious suite as covering three surfaces:

1. **Lifecycle**: \`install\`, \`activate\`, and the moment a worker becomes the controller for open clients.
2. **Cache contracts**: which strategy applies to HTML, hashed assets, APIs, and offline fallbacks, plus how cache names are versioned and deleted.
3. **Control plane**: update discovery (\`registration.update\`, \`updatefound\`, waiting workers), \`skipWaiting\` policy, and unregister / cache-clear kill switches.

| Surface | What you assert | What breaks if you skip it |
| --- | --- | --- |
| Lifecycle | Install precache completes; activate deletes old caches; clients get a controller | Half-installed caches; zombie old workers |
| Cache contracts | Strategy per URL class; versioned names; offline fallback body | Stale HTML after deploy; broken SPA boots |
| Control plane | Waiting worker appears; claim/skip policy; unregister clears state | Users stuck on old bundles for days |

A useful mental model: the page under test is not the system under test. The system is the registration, the worker script, the Cache Storage entries, and the controller relationship. Playwright (or any browser automation) is valuable here because it can observe those objects the way a user session would, not the way a Node unit test pretends they work.

When you sketch coverage, write the questions you need answered in plain language before you write locators:

- After first visit, is there exactly one active worker and a known set of cache names?
- After a second deploy of the worker file, is there a waiting worker until we allow activation?
- After kill-switch activation, do \`getRegistrations()\` and \`caches.keys()\` both return empty (or only allowlisted) results?
- After offline mode, does navigation to a known route still return the fallback document you intended?

Those questions map cleanly onto assertions. If your suite cannot answer them, you do not yet have service worker testing; you have fetch-handler unit tests with a comforting name.

Write the three surfaces into your test plan the same way you would write API contract tests. Each surface gets fixtures, positive cases, and at least one failure case. Lifecycle failures look like missing controllers after install. Cache contract failures look like the wrong body winning when network and cache disagree. Control-plane failures look like a waiting worker that never becomes active, or a kill switch that unregisters but leaves poisoned cache entries behind. Naming the surface in the test title (\`lifecycle:\`, \`cache:\`, \`control:\`) makes triage faster when CI goes red after a worker refactor.

Budget time for observability inside the worker during tests. A build id constant, a \`self.__SW_META\` object, or a \`message\` handler that returns cache keys helps Playwright assert without scraping the DOM. Keep those hooks read-oriented in production builds, or compile them out, so you do not ship a debugging backdoor. The point is not clever tooling. The point is that service worker testing fails when the only signal you trust is painted UI that can lie while Cache Storage tells the truth.

## Cache Strategy Contracts You Can Assert

Cache strategy is a product decision expressed in code. Tests should lock the decision so a "quick fix" does not silently change HTML from network-first to cache-first and strand users on yesterday's shell.

### Strategy cheat sheet

| Strategy | Read path | Write path | Typical use |
| --- | --- | --- | --- |
| Cache-first | \`cache.match\`, else network; often \`cache.put\` on miss | Precache on install or runtime put | Hashed JS/CSS/fonts |
| Network-first | Network, else \`cache.match\` | Put successful network responses | HTML navigations, critical API GETs |
| Stale-while-revalidate | Return cache immediately; revalidate in background | Put revalidation result | Semi-fresh JSON, non-hashed images |

Do not invent a fourth name for the same behavior. Keep the vocabulary boring so assertions stay readable.

### Versioned cache names

Hard-coding \`caches.open('app-shell')\` without a version is how stale assets survive a week of deploys. Prefer explicit version tokens in the name, and delete any cache that is not in the current allowlist during \`activate\`.

\`\`\`js
const VERSION = '2026-08-27-a';
const PRECACHE = \`precache-\${VERSION}\`;
const RUNTIME = \`runtime-\${VERSION}\`;
const ALLOWLIST = new Set([PRECACHE, RUNTIME]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await cache.addAll(['/', '/offline.html', '/assets/app.abc123.js']);
      // Prefer explicit activate timing in tests; see update section.
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (ALLOWLIST.has(key) ? undefined : caches.delete(key)))
      );
    })()
  );
});
\`\`\`

### Asserting strategy behavior

You do not need a framework-specific helper to prove strategy choice. Drive the browser, seed Cache Storage, stub or shape network responses, then read what the controlled page received and what landed in the cache.

For cache-first hashed assets:

1. Precache (or manually \`cache.put\`) a known body for \`/assets/app.abc123.js\`.
2. Route the network to fail or return a different body.
3. Reload a page that imports that script.
4. Assert the executed or fetched body matches the cached value, not the network stub.

For network-first HTML:

1. Put an old shell in the cache under the navigation URL.
2. Let the network return a new shell (Playwright \`route\` is enough).
3. Navigate.
4. Assert the document matches the network body, and that a subsequent offline navigation can still fall back to whatever you intentionally stored.

For stale-while-revalidate:

1. Seed cache with body A.
2. Set network to body B.
3. First fetch in a controlled client should expose A quickly.
4. Allow the revalidate to finish; a second fetch should expose B (or assert \`cache.match\` now equals B).

\`\`\`js
// Inside a Playwright page.evaluate: inspect cache state without guessing UI.
async function readCacheBody(cacheName, url) {
  const cache = await caches.open(cacheName);
  const res = await cache.match(url);
  if (!res) return null;
  return res.text();
}
\`\`\`

Keep strategy tests data-driven. A small table in code (URL pattern, mode, expectation) beats three near-copy suites that drift apart. When someone changes the fetch handler, the table failure tells them which contract they broke.

Offline fallbacks belong in the same contract bucket. An offline fallback is not "whatever was last cached." It is a deliberate document or image you can name in an assertion. If your worker serves a blank 503 page when \`cache.match('/offline.html')\` misses, your test should fail long before a customer sees a white screen on the subway.

One more contract worth stating out loud: only cache responses you understand. Opaque responses, error statuses, and personalized API payloads are common footguns. If you filter with \`response.ok\` and \`response.type === 'basic'\` before \`cache.put\`, assert that a 500 or an opaque CDN response did not enter Cache Storage.

A practical fetch handler that stays testable keeps routing decisions boring and side effects obvious:

\`\`\`js
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, PRECACHE, '/offline.html'));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request, PRECACHE));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, RUNTIME));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) await cache.put(request, fresh.clone());
  return fresh;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw new Error('no-response');
  }
}
\`\`\`

You do not need to assert the private helpers directly. Assert outcomes: navigations prefer network when online, assets prefer cache when seeded, APIs do not store 500s, and offline navigations return the named fallback document. If a future change inlines Workbox-style strategies or a different helper shape, those outcome tests still protect users. Resist copying library method names into assertions unless you truly depend on that library's public API in production.

## Update Flows: Waiting Workers and Controllers

Updates are where most production pain lives. A new \`sw.js\` bytes-on-the-wire does not mean users are running that code. Browsers install the new worker, then often leave it in the \`waiting\` state until all controlled clients release the old one, unless you call \`skipWaiting\` and follow through with \`clients.claim\`.

If your team only tests "register on first load," you are blind to the steady state every long-running session lives in. Real users leave dashboards open overnight. They wander between tabs. They ignore refresh prompts. Service worker testing that never opens a second client, never leaves a controller alive across an update, and never asserts \`waiting\` is not testing updates; it is testing install once.

### The happy path you should be able to diagram

1. Client registers \`/sw.js\`.
2. Worker installs (precache) and activates (claim / cleanup).
3. Client becomes controlled (\`navigator.serviceWorker.controller\` is non-null).
4. You deploy a new \`sw.js\`.
5. \`registration.update()\` (or browser periodic check) finds a byte-different script.
6. \`updatefound\` fires; \`registration.installing\` becomes the new worker.
7. New worker installs; if another worker still controls clients and you did not \`skipWaiting\`, it sits in \`waiting\`.
8. On activate (after skip or after old clients go away), new worker takes control according to your claim policy.

### What to assert in automation

\`\`\`ts
import { test, expect } from '@playwright/test';

test('new worker waits until skipWaiting policy allows activation', async ({ page, context }) => {
  await page.goto('/');

  // Wait until the page is controlled.
  await page.waitForFunction(() => navigator.serviceWorker.controller != null);

  const before = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      scriptURL: reg?.active?.scriptURL ?? null,
      hasWaiting: reg?.waiting != null,
    };
  });
  expect(before.hasWaiting).toBe(false);

  // Deploy is simulated by serving a different sw.js byte stream, then:
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.update();
  });

  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.waiting != null || reg?.installing != null;
  });

  const workers = context.serviceWorkers();
  expect(workers.length).toBeGreaterThan(0);
});
\`\`\`

Playwright exposes \`context.serviceWorkers()\` and can wait on context events for worker creation. Still prefer dual assertions: browser-context worker list for process presence, and \`navigator.serviceWorker.getRegistration()\` inside \`page.evaluate\` for \`installing\` / \`waiting\` / \`active\` semantics. Those states are what your UX banners should key off.

### \`skipWaiting\` is a product decision with test implications

Calling \`skipWaiting()\` during \`install\` activates the new worker as soon as it finishes installing, even if old tabs still exist. Pairing it with \`clients.claim()\` in \`activate\` makes the new worker control those tabs without a reload. That is powerful and dangerous.

Risks to document in the suite (and in the product):

- In-memory app state assumes old bundle shapes while new script code runs under the hood.
- Long-lived tabs can mix old HTML with new API expectations if HTML was cache-first.
- Users mid-checkout may see abrupt controller changes if you claim aggressively.

A safer pattern many teams test explicitly:

- Do **not** call \`skipWaiting\` by default.
- Post a message to the waiting worker when the user accepts a "Refresh to update" banner.
- Waiting worker calls \`skipWaiting()\`; page reloads on \`controllerchange\`.

\`\`\`js
// Page: prompt user, then tell the waiting worker to activate.
async function acceptWaitingWorker() {
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

// sw.js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
\`\`\`

On the page (not inside the worker):

\`\`\`js
navigator.serviceWorker.addEventListener('controllerchange', () => {
  window.location.reload();
});
\`\`\`

Your Playwright recipe should cover both policies if you support a kill-the-wait path for emergencies and a polite path for normal deploys. Assert that without the message, \`waiting\` remains non-null across a navigation that does not close all clients. Assert that with the message, \`controllerchange\` fires and the new \`scriptURL\` (or a build id you expose on \`self\`) matches the deploy under test.

### Race: stale assets after deploy

The classic failure is not "worker did not update." It is "worker updated, but HTML or import map still points at unhashed URLs that remain cache-first forever." Versioned filenames plus cache-first is safe. \`app.js\` without a hash plus cache-first is a trap. Network-first for navigations plus cache-first for hashed assets is the usual solid baseline; lock it with tests that deploy twice and prove the second HTML references the second asset hash while the old hash may still exist on disk unused.

If you need a single regression test that catches this class of bug: publish build A, load the app, publish build B with different HTML and different hashed assets, force \`registration.update()\`, accept the waiting worker, reload, and assert both the document build stamp and the script URL changed. Then go offline and assert you still get a coherent shell, not a mix of A HTML and missing B assets.

## Kill Switches and Controlled Unregister Paths

When a bad worker ships, you need a path that does not depend on the bad worker behaving politely. Kill switches are part of service worker testing because an untested unregister path is fiction.

### Layers of a real kill switch

| Layer | Mechanism | Effect | Caveat |
| --- | --- | --- | --- |
| Remote config flag | Page checks flag, calls \`registration.unregister()\`, clears caches | Stops future control after tabs refresh | Bad worker may still control until unload |
| Kill-switch worker | Deploy a tiny \`sw.js\` that skips waiting, claims, deletes caches, unregisters | Forces cleanup even for stuck clients | Must itself be trustworthy and tested |
| Server headers / CDN | Serve \`Clear-Site-Data\` or stop serving \`sw.js\` with 404/4xx carefully | Helps browsers drop registrations over time | Nuanced per browser; do not rely on 404 alone without verification |
| Support runbook | Instructions to clear site data | Last resort for individuals | Does not scale |

A minimal page-side escape hatch:

\`\`\`ts
export async function emergencyDisableServiceWorker(): Promise<void> {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}
\`\`\`

Test it like a feature, not a comment in Notion:

1. Install a normal worker and confirm \`controller\` is set and caches are non-empty.
2. Flip the flag (route your config endpoint, or inject).
3. Run the escape hatch.
4. Assert \`getRegistrations()\` is empty.
5. Assert \`caches.keys()\` is empty (or only contains unrelated origins you intentionally ignore).
6. Reload and assert no controller appears unless you intentionally re-enable.

A kill-switch worker variant is worth a dedicated fixture. Serve a worker whose \`activate\` handler deletes caches and calls \`registration.unregister()\` on itself after claiming. Automate: start with a broken worker that cache-firsts a poisoned \`/\`, deploy the kill worker, \`update()\`, skip waiting, and prove subsequent navigations hit the network and that Cache Storage is clean.

Never build a kill switch that only clears caches but leaves the broken worker registered. The worker will refill the caches on the next fetch. Never unregister without clearing caches if the next page load can race and see stale entries before a new registration decides what to do. Pair the operations and assert both.

Document the expected user-visible effect in the same test file: after kill switch, hard navigations hit the network, offline mode may stop working until you intentionally re-enable, and any update banner should disappear. Product and support need that honesty. A kill switch that "works" in Cache Storage but leaves the UI claiming you are still offline-ready will generate a second incident on top of the first.

Optional ops note: some teams keep a tiny script named \`qaskills.sh\` in the repo to regenerate fixture worker variants (healthy, waiting-only, poisoned cache-first, kill-switch) so local and CI use the same bytes. Whether you use a script or a fixture folder, pin the bytes; flaky SW tests are often just non-deterministic asset hashes.

## Playwright Recipes for SW Lifecycle Assertions

Playwright is a strong fit because it can isolate browser contexts, seed storage, intercept network, and evaluate in the page. Pair it with disciplined fixture servers that can flip which \`sw.js\` body is returned.

Think of each recipe as a state machine test. You set an initial registration and cache graph, apply one event (\`update\`, skip message, unregister, offline toggle, route failure), then assert the next legal state. Tests that click around the app hoping the worker "did something" are how flakes enter the suite. Explicit events and explicit mirrors (registration, caches, controller, build stamp) keep failures local.

Fixture servers matter as much as the assertions. If \`sw.js\` is built by your webpack/vite pipeline with a content hash in the filename, your registration URL may change every build and break update comparisons. Prefer a stable registration URL whose body changes, which is how browsers detect updates in production anyway. Serve \`/sw.js\` from the fixture with \`Cache-Control: no-cache\`, and select body A or B with a header or query that only the fixture understands. That gives you deterministic \`registration.update()\` behavior without fighting a bundler mid-test.

### Isolate state per test

Use a fresh context (or explicit clear) so Cache Storage and registrations do not leak between cases. Clearing only cookies is not enough.

\`\`\`ts
import { test, expect, type Page } from '@playwright/test';

async function resetClientSideSwState(page: Page) {
  await page.goto('about:blank');
  await page.goto('/'); // must be on origin before touching storage
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });
}

test.beforeEach(async ({ page }) => {
  await resetClientSideSwState(page);
});
\`\`\`

### Force an update

Two moving pieces: the bytes served for \`sw.js\`, and the client calling \`registration.update()\`. In tests, control both. Use a query param or header on your fixture server to select worker version A or B. Then:

\`\`\`ts
test('forces update from A to B', async ({ page, context }) => {
  await page.goto('/?sw=A');
  await page.waitForFunction(() => navigator.serviceWorker.controller != null);

  // Flip CDN/fixture to B before asking for update.
  await page.goto('/?sw=B');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await reg.update();
  });

  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(reg?.waiting || reg?.installing || reg?.active);
  });

  const urls = context.serviceWorkers().map((sw) => sw.url);
  expect(urls.some((u) => u.includes('sw.js'))).toBe(true);
});
\`\`\`

If your polite update flow requires a UI click to \`postMessage({ type: 'SKIP_WAITING' })\`, click it and assert reload or build-id text. If your aggressive flow auto-skips, assert \`controllerchange\` without a click and make sure that test is labeled as the aggressive policy so nobody "fixes" it by adding a prompt.

### Network shaping with \`route\`

Service worker + Playwright routing can surprise you: workers may intercept requests before your page-level assumptions hold. Prefer patterns you can explain:

- Use \`context.route\` for origin-wide control when seeding failure modes.
- Assert via Cache Storage and controlled fetches inside \`page.evaluate\`, not only via visible text.
- For network-first vs cache-first proofs, fail the network deliberately and read either UI or \`fetch\` results from evaluate.

Cross-link your broader routing toolkit here if you already maintain one: [Playwright network mocking with route handlers](/blog/playwright-network-mocking-route-handler-guide). The same route handler discipline applies, with the added rule that a controlled page may never see your mock if the worker short-circuited from cache.

### Reading controller and cache mirrors

Avoid sleeping. Wait on conditions:

- \`navigator.serviceWorker.controller\`
- \`registration.waiting\`
- \`caches.has(name)\`
- specific \`cache.match(url)\` body

Expose a tiny test-only helper on \`window\` in non-production builds if that keeps evaluate code short, but keep the helper read-only. A helper that calls \`skipWaiting\` for you hides the path users take.

### Parallelism and origins

Service workers are origin-scoped. Parallel Playwright workers on the same origin and port will stomp each other if they share a profile. Use isolated contexts, distinct origins (port per worker), or serialize SW suites. Flakes that look like "waiting was null" are often another test's unregister racing yours.

Put the SW suite in its own Playwright project with stricter isolation defaults when the main suite runs highly parallel. The cost is wall-clock time; the benefit is signal you can trust after worker changes. When a test fails, dump \`caches.keys()\`, registration states, and \`controller.scriptURL\` into the error message. Failures that only say "expected true, received false" waste half an hour every time.

One more recipe worth keeping: assert that a controlled client cannot be "half updated." After accepting a waiting worker and reloading, read both the document build stamp and the active worker script URL (or meta build id) in one \`page.evaluate\`. If they disagree, you found the mixed-version race that produces ghost bugs in production.

## Staging Deployments Where Stale Caches Survive

Staging is where cache survival stories get dismissed as "we cleared site data," which production users will not do.

### Why staging lies to you

- Engineers hard-refresh; customers do not.
- Staging domains may differ (\`staging.example.com\` vs \`www.example.com\`), so workers never shared state with production and never taught you about cross-tab waiting behavior on the real origin.
- Feature flags disable the worker on staging "for convenience."
- HTTP caching of \`sw.js\` itself differs: if \`sw.js\` is cached by a CDN longer than you think, \`update()\` keeps seeing old bytes.

Checklist for a staging environment that tells the truth:

1. Worker registration enabled the same way as production.
2. \`sw.js\` served with conservative cache headers (often \`Cache-Control: no-cache\` or very short max-age with revalidation).
3. At least one long-lived tab scenario in a manual or automated ritual: open app, deploy, prove banner or waiting state, accept update, prove new build.
4. A second scenario: deploy, do nothing, come back tomorrow (or advance clocks carefully), prove periodic update still works.
5. Cache name allowlist deletion verified by shipping a renamed precache and confirming old names disappear after activate.

### Deploy dance test (automated against staging)

Script a thin smoke:

1. Hit staging, record \`controller.scriptURL\` and a build meta tag.
2. Trigger pipeline deploy (or install already-queued newer build).
3. Call \`registration.update()\`.
4. Accept waiting worker if required.
5. Confirm build meta tag changed.
6. Confirm old precache name is gone from \`caches.keys()\`.
7. Go offline; confirm offline fallback still loads.

This is not a substitute for local deterministic fixtures, but it catches misconfigured CDN headers that local mocks never will.

Stale caches survive staging for social reasons as much as technical ones. People treat staging as disposable, so they accept weird reload behavior as ambient noise. Production users treat your origin as durable state. If staging shares no worker with production and never keeps tabs open across deploys, you have never rehearsed the only update path that matters. Make the rehearsal boring and scheduled: one automated smoke after each staging deploy, plus a weekly long-tab drill where someone leaves a session open, deploys twice, and files a bug if the banner or waiting worker path misbehaves.

Also verify how your app behaves when the waiting worker exists but the user ignores it. That is the default human behavior. The tab should remain functional on the old controller. New tabs or soft navigations should not randomly flip controllers unless you claimed aggressively. Mixed-version fleets are normal for hours after a deploy; your API and feature flags must tolerate that, and your tests should include at least one "user ignored the banner" path so product managers see the constraint.

Layout stability after a controlled reload matters too. When \`controllerchange\` forces a refresh, users may see a flash or shift if the new shell differs. If you track visual stability budgets, connect those reload paths to your existing debugging notes on [CLS and layout shift debugging](/blog/web-vitals-cls-layout-shift-debugging). An update banner that pushes content without a reserved region shows up as CLS and as support tickets about a "jumpy" app after deploys.

## Failure Modes That Look Like App Bugs

### Failure story: the checkout that forgot the new total

We shipped a pricing change behind a normal frontend deploy. Hashed JS bundles were correct on the CDN. About eight percent of sessions kept paying old totals. Support blamed "cached browsers." Engineering blamed "CDN purge lag."

Root cause: the navigation request for \`/checkout\` was answered cache-first by an older worker that still controlled long-lived tabs. The old HTML referenced an old unhashed helper and an old inline config blob. The new hashed bundles sat unused on the CDN. \`registration.update()\` had found a new worker, but the app never called \`skipWaiting\`, and the update banner had a CSS bug that hid it on mobile. Desktop engineers clicked hard refresh during QA; mobile users never saw a prompt.

What fixed it was not another purge. We:

1. Changed HTML to network-first with cache fallback.
2. Added an integration test that deploys A then B without closing the tab, asserts waiting state, asserts banner visible, accepts update, asserts new total.
3. Added a kill-switch flag test that unregisters and clears caches.
4. Stopped unhashed mutable JS from being cache-first anywhere.

The bug looked like application logic ("total wrong") and was entirely a worker control-plane failure.

### What people get wrong

1. **Testing only the fetch handler in Node.** Fake \`Request\`/\`Response\` objects never prove activate cleanup or waiting behavior.
2. **Calling \`skipWaiting\` by default without product intent.** Convenient for developers; rough for users mid-flow.
3. **Versioning assets but not cache names.** Old caches linger forever, confusing debugging and leaking storage.
4. **Assuming \`unregister()\` fixes users immediately.** Existing controlled pages may need reload; caches may remain until deleted.
5. **Hard-refresh QA as the update test.** Hard refresh bypasses the path customers take.
6. **Ignoring \`sw.js\` HTTP caching.** If the script response is stale at the HTTP layer, the browser will not install your new worker no matter how good your client code is.
7. **Treating opaque or error responses as cacheable.** You store failure and replay it "successfully."
8. **Mixing strategies across navigations and asset graphs.** New HTML that points at new hashes must not be stuck behind an old cache-first document.
9. **No kill switch rehearsal.** The first time you need it is a poor time to learn your flag is read only after the worker boots.
10. **Flaky Playwright sleeps instead of waiting on \`waiting\` / \`controller\`.** Timing tests become noise and get muted.

When an issue smells like "only some users," "fixed by clear site data," or "fixed by closing all tabs," put service worker control and Cache Storage at the top of the investigation list before rewriting business logic.

A second pattern shows up in analytics: bounce spikes after deploys with no matching server error rate. The HTML shell came from an old cache-first navigation handler, referenced a newly purged hashed asset, and the page died during boot. Server logs look clean because the HTML never hit the origin. Your Playwright deploy-A-then-B test should assert not only that new HTML appears after update acceptance, but that the referenced script URLs return 200 while controlled, and that a forced offline boot still renders a deliberate offline page instead of a half-broken shell.

If you need a single triage script for on-call, teach engineers to check four mirrors in DevTools before touching business logic: Application > Service Workers (who is active/waiting), Cache Storage keys and a sample of bodies, Network with "Update on reload" off (to mirror customers), and the page's \`navigator.serviceWorker.controller\` in the console. Matching those four against what CI asserts closes the loop between service worker testing and production incident response.

## Frequently Asked Questions

### What counts as enough service worker testing for a small SPA?

Enough means you can prove first install controls the page, precache contents match the allowlist, activate deletes unknown cache names, HTML uses the strategy you intend, a second deploy produces a waiting or activated worker according to policy, and an emergency unregister clears registrations plus caches. That is usually fewer than ten focused Playwright tests plus a couple of unit tests around URL matching. If you only unit-test \`cache.match\` branching, you are below the bar for production.

### How do I simulate a waiting worker without flaky sleeps?

Serve two byte-different worker scripts from your fixture server. Load with version A until \`controller\` is set. Flip the server to version B and call \`registration.update()\`. Wait for \`registration.waiting\` (or \`installing\` then \`waiting\`) with \`page.waitForFunction\`. Keep at least one controlled client open and avoid \`skipWaiting\` in the polite-path worker so the browser must park the new worker in \`waiting\`. Deterministic bytes plus explicit state waits remove most flakes.

### Should tests call \`skipWaiting\` directly or go through the UI banner?

Prefer the UI (or the same \`postMessage\` the UI sends) for the path users take. Add a separate, explicitly named test for emergency auto-skip if your kill path uses it. Calling \`skipWaiting\` from evaluate in every test hides banner regressions like the checkout story above. Dual coverage costs little and documents the product policy in the suite itself. Keep the evaluate shortcut only in setup helpers that intentionally skip UI chrome.

### Can Playwright clear service workers reliably between tests?

Yes, if you unregister all registrations and delete cache keys on the origin inside \`page.evaluate\`, and you isolate browser contexts so parallel workers do not share profiles. Navigate to your origin first; storage APIs will not run correctly from a blank context with the wrong security origin. If tests still leak, serialize the SW project or give each Playwright worker a unique origin. Assert emptiness at the start of each case so failures point at cleanup, not at your feature assertions.
`,
};
