import type { SeoClusterArticle } from './seo-cluster-article';

export const playwrightCoreChildren2026: SeoClusterArticle[] = [
  {
    slug: 'playwright-1-61-webauthn-passkeys-guide-2026',
    clusterId: 'playwright-core',
    post: {
      title: 'Playwright 1.61 WebAuthn Passkey Testing with Virtual Authenticators',
      description:
        'Test passkey registration and sign-in with the cross-browser Credentials virtual authenticator added in Playwright 1.61, including reuse and failure diagnosis.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/playwright-core.png',
      imageAlt: 'Playwright browser context connected to a virtual WebAuthn passkey authenticator',
      primaryKeyword: 'playwright webauthn passkey testing',
      keywords: [
        'playwright webauthn passkey testing',
        'playwright 1.61 credentials',
        'playwright virtual authenticator',
        'playwright passkey testing',
        'browserContext credentials',
        'webauthn e2e testing',
        'cross browser passkey testing',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-e2e-complete-guide',
      relatedSlugs: [
        'playwright-e2e-complete-guide',
        'playwright-1-61-web-storage-api-guide-2026',
        'playwright-locators-best-practices-2026',
        'playwright-browser-context-guide-2026',
      ],
      sources: [
        'https://playwright.dev/docs/release-notes#version-161',
        'https://playwright.dev/docs/api/class-credentials',
        'https://playwright.dev/docs/api/class-browsercontext',
        'https://playwright.dev/docs/auth#passkeys-webauthn',
      ],
      content: `Playwright 1.61 adds a first-class, cross-browser virtual WebAuthn authenticator at \`browserContext.credentials\`. For Playwright WebAuthn passkey testing, install that authenticator before the application calls \`navigator.credentials.create()\` or \`navigator.credentials.get()\`, drive the real registration or sign-in UI, and inspect its credentials with \`create()\`, \`get()\`, or \`delete()\`. Unlike the older Chromium-only CDP technique, the 1.61 API works across Chromium, Firefox, and WebKit. Start with the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) if context fixtures and setup projects are new to you.

This guide is specifically about replacing passkey stubs and browser-specific virtual-authenticator plumbing with the supported 1.61 \`Credentials\` API. It does not claim that a software authenticator reproduces biometric hardware, operating-system account pickers, cloud passkey synchronization, or every attestation format. The goal is reliable application-level coverage of enrollment, authentication, credential reuse, deletion, and fallback behavior.

## What Playwright 1.61 Changed for WebAuthn Testing

The [Playwright 1.61 release notes](https://playwright.dev/docs/release-notes#version-161) introduce \`browserContext.credentials\` as a virtual authenticator that answers page calls to \`navigator.credentials.create()\` and \`navigator.credentials.get()\`. No physical key is required, and Playwright states that the API works in all three supported browser engines. The authenticator is scoped to one \`BrowserContext\`, so passkeys do not leak into the fresh context Playwright Test creates for another test.

The distinction from older material is important. Before 1.61, a common Playwright pattern opened a Chrome DevTools Protocol session with \`context.newCDPSession(page)\` and sent commands from CDP's \`WebAuthn\` domain. That remains a possible Chromium-specific integration, and the [BrowserContext API reference](https://playwright.dev/docs/api/class-browsercontext) still documents that CDP sessions are Chromium-only. It is not the new 1.61 API and should not be presented as cross-browser.

| Testing need | Playwright 1.61 approach | Older supported approach | Practical consequence |
|---|---|---|---|
| Register or use a virtual passkey | \`context.credentials.install()\` | Chromium CDP \`WebAuthn\` commands | Prefer 1.61 for one test design across browser projects |
| Seed a known passkey | \`credentials.create(rpId, keyMaterial)\` | CDP credential commands or app-specific stubs | 1.61 accepts portable base64url key material |
| Read a passkey created by the page | \`credentials.get({ rpId })\` | CDP credential inspection | A setup project can capture and reuse enrollment |
| Remove a credential | \`credentials.delete(id)\` | CDP removal command | Test a registered account with no matching device credential |
| Configure transport or user-presence details | Not exposed by the 1.61 \`Credentials\` options | CDP has lower-level Chromium controls | Keep CDP only for a narrowly justified Chromium-only case |
| Save cookies and local storage | \`storageState\` | Same established API | Passkeys are separate and must be seeded imperatively |

That last row prevents a subtle setup failure. The official [authentication guide](https://playwright.dev/docs/auth#passkeys-webauthn) says passkeys are not loaded through the \`storageState\` option. Cookies and local storage can initialize a context declaratively; a passkey must be created and the virtual authenticator installed in a context fixture.

## Upgrade and Confirm the API Before Debugging the App

Pin Playwright 1.61 or newer in the project that executes these examples, then install the matching browser binaries:

\`\`\`bash
pnpm add -D @playwright/test@1.61.0
pnpm exec playwright install
pnpm exec playwright test --version
\`\`\`

Keep the \`@playwright/test\` package and downloaded browsers aligned. If TypeScript reports that \`credentials\` does not exist on \`BrowserContext\`, inspect the package resolved in the workspace rather than adding a type cast. A monorepo can easily execute an older hoisted package even after a different package.json was edited.

The [Credentials API reference](https://playwright.dev/docs/api/class-credentials) documents four methods in 1.61:

- \`install()\` intercepts WebAuthn creation and retrieval ceremonies in current and future pages in the context.
- \`create(rpId, options?)\` seeds a discoverable credential. With only an RP ID, Playwright generates an ECDSA P-256 key pair, credential ID, and user handle.
- \`get(options?)\` returns credentials held by the authenticator and can filter by RP ID or credential ID.
- \`delete(id)\` removes either a seeded credential or one registered by the application.

Call \`install()\` before the first page code touches \`navigator.credentials\`. Calling \`create()\` alone only fills the virtual authenticator; it does not intercept the page API.

## Understand the Credential and Server Relationship

A WebAuthn login succeeds only when two sides agree. The authenticator holds a credential ID and private key. The application's backend holds the matching credential ID and public key for the user and relying party. Seeding a randomly generated client credential does not magically register its public key with your server.

Choose one of two valid workflows:

1. Let the application perform a real enrollment ceremony, then read the resulting credential with \`credentials.get()\` and save it for later tests.
2. Provision the public credential on the test backend first, then seed its matching ID, user handle, private key, and public key into each test context.

The first workflow proves the registration UI and backend ceremony. The second makes sign-in tests faster and more focused, but only if backend provisioning is an explicit test-data operation. Passing just \`context.credentials.create('app.example.test')\` is useful when the page will register that credential after installation; it is insufficient for a backend that has never seen the generated public key.

The RP ID is normally the effective domain, not a full URL. For \`https://login.example.test/passkeys\`, the usual value is \`login.example.test\` or a parent domain deliberately selected by the server's WebAuthn options. Do not include \`https://\`, a port, or a path. Derive the host from the configured base URL when the deployment changes between local, staging, and CI environments.

## Example 1: Register a Passkey and Capture It

The following is a complete Playwright Test setup file. Set \`PASSKEY_BASE_URL\` to your test deployment and align the three user-facing locators with the application. It installs the authenticator before navigation, performs enrollment through the UI, verifies that exactly one RP credential was created, and writes the credential to Playwright's authentication directory.

\`\`\`typescript
// tests/passkey.setup.ts
import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.PASSKEY_BASE_URL ?? 'https://app.example.test';
const rpId = new URL(baseURL).hostname;
const passkeyFile = path.join(process.cwd(), 'playwright', '.auth', 'passkey.json');

setup('enroll a reusable passkey', async ({ context, page }) => {
  await context.credentials.install();

  await page.goto(new URL('/settings/security', baseURL).href);
  await page.getByRole('button', { name: 'Add a passkey' }).click();
  await expect(page.getByRole('status')).toHaveText('Passkey added');

  const credentials = await context.credentials.get({ rpId });
  expect(credentials).toHaveLength(1);
  expect(credentials[0].rpId).toBe(rpId);

  fs.mkdirSync(path.dirname(passkeyFile), { recursive: true });
  fs.writeFileSync(passkeyFile, JSON.stringify(credentials[0], null, 2), {
    mode: 0o600,
  });
});
\`\`\`

Run it as a setup project or directly while validating the integration:

\`\`\`bash
pnpm exec playwright test tests/passkey.setup.ts --project=chromium
\`\`\`

The visible success message proves the application completed its enrollment flow; \`credentials.get({ rpId })\` proves the virtual authenticator retained a credential for the intended relying party. Both checks are needed. A UI toast alone could hide a browser-side failure, while a credential alone does not prove the backend accepted and associated the public key.

The saved object includes \`id\`, \`rpId\`, \`userHandle\`, \`privateKey\`, and \`publicKey\`. The official authentication guide warns that this file contains the private key. Put \`playwright/.auth\` in \`.gitignore\`, restrict CI artifact publication, and regenerate test credentials if the file is exposed.

## Example 2: Seed the Captured Passkey in Every Test Context

Override the built-in \`context\` fixture so every test gets a fresh BrowserContext with the saved credential installed. This follows the structure in Playwright's [passkey authentication guidance](https://playwright.dev/docs/auth#passkeys-webauthn) and preserves normal per-test isolation.

\`\`\`typescript
// playwright/fixtures.ts
import { test as base } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type SavedPasskey = {
  id: string;
  rpId: string;
  userHandle: string;
  privateKey: string;
  publicKey: string;
};

const passkeyFile = path.join(process.cwd(), 'playwright', '.auth', 'passkey.json');

export const test = base.extend({
  context: async ({ context }, use) => {
    const credential = JSON.parse(fs.readFileSync(passkeyFile, 'utf8')) as SavedPasskey;

    await context.credentials.create(credential.rpId, credential);
    await context.credentials.install();
    await use(context);
  },
});

export { expect } from '@playwright/test';
\`\`\`

Now the sign-in specification starts with an enrolled virtual device but still exercises the application's real challenge, assertion, and session-establishment path:

\`\`\`typescript
// tests/passkey-login.spec.ts
import { test, expect } from '../playwright/fixtures';

const baseURL = process.env.PASSKEY_BASE_URL ?? 'https://app.example.test';

test('signs in with an enrolled passkey', async ({ page }) => {
  await page.goto(new URL('/login', baseURL).href);
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();

  await expect(page).toHaveURL(/\\/dashboard(?:\\/|$)/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

Use a setup-project dependency so the capture file exists before browser projects start. Do not make every parallel test rewrite one shared passkey file. Enrollment belongs in one setup phase; test contexts should read it. If the backend increments a signature counter or otherwise treats concurrent use of one credential specially, provision one passkey per worker or test account instead of serializing the whole suite.

For broader multi-user fixture design, continue to the [Playwright BrowserContext isolation guide](/blog/playwright-browser-context-guide-2026). It explains why separate pages in one context are not separate identities.

## Test a Missing Device Credential Without Mocking the App

Deleting the authenticator's credential while leaving the backend registration intact models a user whose account knows a passkey but whose current device does not hold it. Assert the product's documented recovery route rather than a browser-specific error string:

\`\`\`typescript
import { test, expect } from '../playwright/fixtures';

const baseURL = process.env.PASSKEY_BASE_URL ?? 'https://app.example.test';

test('offers account recovery when this device has no passkey', async ({ context, page }) => {
  const [credential] = await context.credentials.get();
  expect(credential).toBeDefined();
  await context.credentials.delete(credential.id);

  await page.goto(new URL('/login', baseURL).href);
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click();

  await expect(page.getByRole('link', { name: 'Use another sign-in method' })).toBeVisible();
});
\`\`\`

This test intentionally avoids asserting that every engine emits identical native dialog copy or DOM exception text. The 1.61 authenticator provides a cross-browser application boundary; the durable contract is how your product recovers when no credential can satisfy the request.

## Diagnose Passkey Test Failures by Boundary

Treat a failure as one of four boundaries instead of repeatedly changing selectors or adding timeouts.

### TypeScript says credentials does not exist

The executing package is older than 1.61 or workspace resolution is stale. Run the package manager's Playwright binary with \`--version\`, inspect the lockfile resolution, reinstall matching browsers, and restart the TypeScript language service. Do not hide a real version mismatch with \`as any\`.

### A native passkey prompt appears or the click hangs

The virtual authenticator was not installed before page code called WebAuthn. Place \`await context.credentials.install()\` before navigation or in the context fixture. Seeding with \`create()\` is not installation; the [API reference](https://playwright.dev/docs/api/class-credentials#credentials-install) explicitly separates the two operations.

### Registration UI succeeds but credentials.get returns an empty array

Check the RP ID first. Log \`new URL(page.url()).hostname\` and compare it with the RP ID returned by the backend's registration options. Then verify that the page really called \`navigator.credentials.create()\` rather than acknowledging a queued or mocked operation. Filter by the actual RP ID only after proving it is correct.

### Sign-in has a credential but the server rejects the assertion

The server and authenticator likely do not share the same credential. Confirm that the backend record contains the public key and credential ID paired with the saved private credential, that the test did not mix files from another environment, and that the RP ID matches. Re-enroll through the target environment when in doubt; do not edit base64url key strings by hand.

### The test passes in Chromium but fails in Firefox or WebKit

Confirm that the test uses \`context.credentials\`, not a retained \`newCDPSession\` helper. Then compare application behavior rather than assuming the Playwright API is browser-specific: conditional product code, unsupported browser detection, secure-context configuration, or different RP responses can still create engine-specific results. Capture a trace and the server's ceremony response while keeping private key material out of attachments.

### Reused credentials disappear between tests

That is expected when each test receives a fresh context. The authenticator is context-scoped. Seed and install the credential in every context fixture, or capture it in setup and read the file in the fixture. Do not share one context across unrelated tests to preserve the passkey; that trades a small setup step for state leakage.

### The test times out after the app reports success

Use web-first assertions and inspect the pending operation. A button click can finish while a server request, redirect, or status update remains incomplete. Wait for an observable URL, heading, response, or status owned by the application. Arbitrary sleeps only obscure whether the WebAuthn ceremony or the post-authentication transition is stuck. The [locator stability guide](/blog/playwright-locators-best-practices-2026) shows how to make those assertions specific.

## Migrate a Chromium CDP Helper Deliberately

Do not mechanically rename a CDP command. Replace the lifecycle:

1. Remove \`context.newCDPSession(page)\` and \`WebAuthn.enable\` from cross-browser tests.
2. Install \`context.credentials\` before navigation.
3. Let the page register a credential or seed a complete known credential.
4. Replace CDP credential listing with \`credentials.get()\`.
5. Replace CDP removal with \`credentials.delete(id)\`.
6. Run the same behavior in Chromium, Firefox, and WebKit projects.

Keep a CDP-only test only when it validates a lower-level Chromium behavior that the 1.61 API does not expose, such as a specific authenticator transport or user-verification control. Name and tag that test as Chromium-only. The existing [virtual authenticator article](/blog/playwright-webauthn-virtual-authenticator-testing) remains useful for that legacy CDP case; it should not be the default for new portable passkey coverage.

## Version Scope and Honest Limitations

This article targets Playwright 1.61, whose release notes list the new \`Credentials\` API and browser builds Chromium 149, Firefox 151, and WebKit 26.5. The high-level API is the new part. Browser contexts, fixtures, setup-project authentication, locators, and \`storageState\` existed earlier.

The API virtualizes the WebAuthn ceremony at the page/context boundary. Based on the public 1.61 method surface, it does not provide controls for biometric success versus failure, authenticator attachment, transport selection, attestation policy, operating-system account chooser UI, Bluetooth/NFC behavior, or cloud synchronization. Cover those risks with lower-level browser-specific automation where available, integration tests around server policy, and a small manual/device matrix. Do not infer hardware assurance from a passing virtual-authenticator test.

Saved credentials are test secrets. They include private keys, are not part of \`storageState\`, and should not appear in repositories, trace attachments, screenshots, or public CI artifacts. Also remember that BrowserContext isolation does not isolate backend accounts. Concurrent tests using the same enrolled user can still race on server-side credential lists, revocation, or audit state.

Keep one assertion at each ceremony boundary: the browser produced or selected a credential, the server accepted the response, and the application established the expected user session. This separation makes a failed trace actionable. If only the final dashboard is asserted, a cached cookie can make passkey login appear healthy even when no WebAuthn assertion occurred. Start the sign-in test without reusable cookie state, inspect the authenticator before the click, and verify the authenticated identity after the redirect. That is stronger evidence than merely observing that a login button disappeared.

For agent-assisted authoring, browse the [QA skills directory](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli). Use those tools to inspect and debug the application, but keep passkey provisioning and private-key handling in reviewed fixtures rather than prompts or logs. The sibling [Web Storage 1.61 guide](/blog/playwright-1-61-web-storage-api-guide-2026) covers the other major 1.61 browser-state addition.

## Frequently Asked Questions

### Does Playwright 1.61 support passkey testing in Firefox and WebKit?

Yes. The 1.61 release notes state that the new \`browserContext.credentials\` virtual authenticator works in all browsers. That cross-browser claim applies to the new Credentials API, not to \`browserContext.newCDPSession()\`, which remains Chromium-only.

### Must I call credentials.install before credentials.create?

You may seed a credential before installation, but the page cannot use the virtual authenticator until \`credentials.install()\` runs. The safest fixture sequence is create, install, then navigate. For application-driven registration, install first, navigate, and let the page call \`navigator.credentials.create()\`.

### Can storageState save a Playwright virtual passkey?

No. Playwright's authentication guide treats passkeys separately from cookie and local-storage state. Save the object returned by \`credentials.get()\`, then call \`credentials.create(credential.rpId, credential)\` and \`credentials.install()\` in each new context.

### What format does a seeded credential use?

The 1.61 reference requires base64url strings for the credential ID and user handle, a base64url PKCS#8 DER private key, and a base64url SPKI DER public key when importing a known credential. Supply all four together. If options are omitted, Playwright generates them.

### Why does a generated credential not sign in my existing user?

The backend does not know its public key and credential ID. Either enroll it through the application's real registration flow or provision the corresponding public credential on the backend. A private credential in the browser and an unrelated server record cannot complete the same assertion.

### Can the 1.61 API simulate a failed fingerprint or security-key touch?

Not through the documented \`Credentials\` options. The public API manages key material, installation, listing, and deletion; it does not expose user-presence or user-verification switches. Test product fallback with missing/deleted credentials, server responses, or a narrowly scoped Chromium CDP test when that exact lower-level behavior is essential.

### Should one passkey be shared by all parallel workers?

Only if the backend safely supports concurrent use of that test credential. Contexts remain isolated, but the server account is shared. For tests that enroll, rename, revoke, or inspect mutable credential state, allocate a user and passkey per worker or per scenario.

### Is mocking navigator.credentials directly equivalent?

No. A hand-written page mock can be useful for a unit-level error branch, but it bypasses the supported Playwright authenticator and can miss RP ID, challenge, credential, and browser-integration defects. Use \`context.credentials\` for the E2E ceremony and reserve direct mocks for deliberately smaller tests.
`,
    },
  },
  {
    slug: 'playwright-1-61-web-storage-api-guide-2026',
    clusterId: 'playwright-core',
    post: {
      title: 'Playwright localStorage and sessionStorage API Guide for Version 1.61',
      description:
        'Use Playwright 1.61 page.localStorage and page.sessionStorage to inspect, seed, clear, and diagnose origin-scoped browser state without page.evaluate boilerplate.',
      date: '2026-07-14',
      updated: '2026-07-14',
      category: 'Tutorial',
      image: '/blog/pillars/playwright-core.png',
      imageAlt: 'Playwright page reading separate localStorage and sessionStorage key-value stores',
      primaryKeyword: 'playwright localstorage sessionstorage api',
      keywords: [
        'playwright localstorage sessionstorage api',
        'playwright 1.61 webstorage',
        'page localStorage playwright',
        'page sessionStorage playwright',
        'playwright storageState sessionStorage',
        'playwright seed localStorage',
        'playwright clear browser storage',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-e2e-complete-guide',
      relatedSlugs: [
        'playwright-e2e-complete-guide',
        'playwright-1-61-webauthn-passkeys-guide-2026',
        'playwright-locators-best-practices-2026',
        'playwright-browser-context-guide-2026',
      ],
      sources: [
        'https://playwright.dev/docs/release-notes#version-161',
        'https://playwright.dev/docs/api/class-webstorage',
        'https://playwright.dev/docs/api/class-page',
        'https://playwright.dev/docs/api/class-browsercontext',
        'https://playwright.dev/docs/auth#session-storage',
        'https://playwright.dev/docs/best-practices',
      ],
      content: `Playwright 1.61 introduces \`page.localStorage\` and \`page.sessionStorage\`, two async \`WebStorage\` objects for the page's current origin. Use \`setItem()\`, \`getItem()\`, \`items()\`, \`removeItem()\`, and \`clear()\` after navigating to the target origin. This is the direct Playwright localStorage and sessionStorage API: it replaces routine \`page.evaluate()\` boilerplate, works consistently across browsers, and returns string values or \`null\`. It does not make session storage part of \`storageState\`. For the surrounding test-runner model, begin with the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide).

This guide focuses on state inspection and setup inside one running test: feature flags, onboarding markers, drafts, cart state, and storage-driven authentication diagnostics. It also explains when older \`browserContext.storageState()\` and \`browserContext.addInitScript()\` patterns remain the correct tools. The [1.61 release notes](https://playwright.dev/docs/release-notes#version-161) call Web Storage a new API; storage itself and Playwright's ability to save local storage are not new.

## The Complete Playwright 1.61 WebStorage Surface

Both page properties return the same \`WebStorage\` interface. The only difference is which browser store they address. The [official WebStorage reference](https://playwright.dev/docs/api/class-webstorage) marks every method below as added in 1.61.

| Method | Result | Best testing use | Important behavior |
|---|---|---|---|
| \`getItem(name)\` | \`Promise<string \| null>\` | Read one token, preference, or marker | Missing keys return \`null\`, not \`undefined\` |
| \`setItem(name, value)\` | \`Promise<void>\` | Seed or replace one value | Values are strings; existing values are overwritten |
| \`items()\` | Array of \`{ name, value }\` | Audit or snapshot all keys for the current origin | Normalize before order-insensitive comparisons |
| \`removeItem(name)\` | \`Promise<void>\` | Test one missing key | Removing an absent key is a no-op |
| \`clear()\` | \`Promise<void>\` | Test a first-visit or signed-out storage condition | Clears the selected store for the current origin |

The properties themselves are also new in 1.61: \`page.localStorage\` addresses local storage, while \`page.sessionStorage\` addresses session storage. The [Page API reference](https://playwright.dev/docs/api/class-page) defines each as access to storage for the current origin. That phrase is the main design constraint. Navigate first, then read or write.

\`items()\` returns name/value objects rather than a JavaScript \`Storage\` instance. That makes the result serializable and keeps test code outside the page execution environment. Convert it to a map with \`Object.fromEntries(items.map(({ name, value }) => [name, value]))\` when key-based assertions are clearer.

## What Is New and What Is an Older Supported Pattern

The 1.61 API makes direct access concise:

\`\`\`typescript
await page.goto('https://app.example.test/settings');
await page.localStorage.setItem('theme', 'dark');
expect(await page.localStorage.getItem('theme')).toBe('dark');
\`\`\`

Before 1.61, test code commonly used \`page.evaluate(() => localStorage.getItem('theme'))\`. That still works and remains necessary for browser APIs not represented by Playwright's public surface, but it is no longer the clearest default for basic Web Storage operations.

Two older APIs solve different jobs and were not replaced:

- \`browserContext.storageState()\` captures cookies and local storage, with optional IndexedDB, across origins represented in the context state.
- \`browserContext.addInitScript()\` runs before application scripts in new documents, so it can preseed storage that must exist before boot code reads it.

The 1.61 page properties act on the current origin after it exists. They do not add a context-wide session-storage persistence format, and they do not retroactively rerun application initialization after a value changes.

## Example 1: Seed and Clear localStorage Without page.evaluate

This complete spec is runnable without an application server. A context route fulfills a page at a stable HTTPS origin; the page reads a theme during boot. The test sets local storage through the 1.61 API, reloads to make the application consume it, and then verifies the cleared-state behavior.

\`\`\`typescript
// tests/local-storage.spec.ts
import { test, expect } from '@playwright/test';

const origin = 'https://preferences.example.test';

test('controls a persisted theme through page.localStorage', async ({ context, page }) => {
  await context.route(origin + '/**', async route => {
    await route.fulfill({
      contentType: 'text/html',
      body: [
        '<h1>Preferences</h1>',
        '<output data-testid="theme"></output>',
        '<script>',
        "document.querySelector('[data-testid=theme]').textContent = " +
          "localStorage.getItem('theme') || 'light';",
        '</script>',
      ].join(''),
    });
  });

  await page.goto(origin + '/settings');
  await expect(page.getByTestId('theme')).toHaveText('light');

  await page.localStorage.setItem('theme', 'dark');
  expect(await page.localStorage.getItem('theme')).toBe('dark');

  await page.reload();
  await expect(page.getByTestId('theme')).toHaveText('dark');

  await page.localStorage.clear();
  await page.reload();
  await expect(page.getByTestId('theme')).toHaveText('light');
});
\`\`\`

The reload is not a timing workaround. This sample application reads local storage once during its boot script, so a reload is the product event that makes the new value observable. A reactive application may listen for another event or expose a settings control; use the real product trigger rather than adding a delay.

When a stored value represents JSON, serialize it explicitly:

\`\`\`typescript
await page.localStorage.setItem('preferences', JSON.stringify({ theme: 'dark' }));
const raw = await page.localStorage.getItem('preferences');
expect(raw).not.toBeNull();
expect(JSON.parse(raw!)).toEqual({ theme: 'dark' });
\`\`\`

Web Storage stores strings. Passing an object is a TypeScript error in the new API and should remain one; silently coercing an object to \`[object Object]\` would make the fixture misleading.

## Example 2: Prove sessionStorage Is Page-Scoped

The next runnable spec uses two pages in the same context. It shows the testing difference directly: local storage is visible to both pages at the same origin, while the first page's session storage is not present in the second page. A reload of the first page retains its session value because the page session is still alive.

\`\`\`typescript
// tests/session-storage.spec.ts
import { test, expect } from '@playwright/test';

const origin = 'https://editor.example.test';

test('keeps a draft in one page session', async ({ context }) => {
  await context.route(origin + '/**', route =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>Editor</h1><output data-testid="draft"></output>' +
        '<script>document.querySelector("[data-testid=draft]").textContent=' +
        'sessionStorage.getItem("draft") || "empty"</script>',
    }),
  );

  const first = await context.newPage();
  await first.goto(origin + '/draft');
  await first.localStorage.setItem('workspace', 'quality');
  await first.sessionStorage.setItem('draft', 'release notes');

  await first.reload();
  await expect(first.getByTestId('draft')).toHaveText('release notes');

  const second = await context.newPage();
  await second.goto(origin + '/draft');

  expect(await second.localStorage.getItem('workspace')).toBe('quality');
  expect(await second.sessionStorage.getItem('draft')).toBeNull();
  await expect(second.getByTestId('draft')).toHaveText('empty');
});
\`\`\`

This is why two pages are not interchangeable with two contexts. Pages in one context can share origin-local state and cookies, yet each page has its own session storage. For completely independent users, use separate contexts as described in the [BrowserContext guide](/blog/playwright-browser-context-guide-2026).

## Inspect State Without Coupling to Item Order

Use \`items()\` when the set of keys matters more than one value. Convert the array into a deterministic representation before asserting:

\`\`\`typescript
await page.localStorage.setItem('locale', 'en-GB');
await page.localStorage.setItem('theme', 'dark');

const items = await page.localStorage.items();
const state = Object.fromEntries(items.map(({ name, value }) => [name, value]));

expect(state).toEqual({ locale: 'en-GB', theme: 'dark' });
\`\`\`

The official API promises an array of name/value pairs. It does not make array position part of the testing contract, so avoid assertions against \`items()[0]\` unless item order is independently meaningful to the application. A map also produces a more readable failure when one key is absent or has the wrong serialized value.

Do not dump entire stores into public logs by default. Authentication tokens, user identifiers, feature entitlements, and drafts can all live in Web Storage. Select and redact the fields needed for diagnosis, especially in CI traces and error attachments.

## Preload sessionStorage Before Application Code Runs

Direct \`page.sessionStorage.setItem()\` requires a current origin. If the application reads session storage during its first script and immediately redirects, setting a value after \`page.goto()\` is too late. The established solution is still \`browserContext.addInitScript()\`.

Playwright's [authentication guide](https://playwright.dev/docs/auth#session-storage) explicitly says \`storageState\` does not persist session storage and demonstrates saving it separately, then restoring it with an init script. In 1.61, \`items()\` makes capture cleaner while the restore timing remains the same:

\`\`\`typescript
import { test, expect } from '@playwright/test';

const origin = 'https://workspace.example.test';

test('restores session state before boot', async ({ browser }) => {
  const source = await browser.newContext();
  await source.route(origin + '/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<h1>Workspace</h1>',
  }));
  const sourcePage = await source.newPage();
  await sourcePage.goto(origin);
  await sourcePage.sessionStorage.setItem('activeProject', 'apollo');

  const items = await sourcePage.sessionStorage.items();
  const saved = Object.fromEntries(items.map(({ name, value }) => [name, value]));
  await source.close();

  const restored = await browser.newContext();
  await restored.addInitScript(
    ({ hostname, storage }) => {
      if (window.location.hostname === hostname) {
        for (const [name, value] of Object.entries(storage))
          window.sessionStorage.setItem(name, value);
      }
    },
    { hostname: new URL(origin).hostname, storage: saved },
  );
  await restored.route(origin + '/**', route => route.fulfill({
    contentType: 'text/html',
    body: '<output data-testid="project"></output>' +
      '<script>document.querySelector("[data-testid=project]").textContent=' +
      'sessionStorage.getItem("activeProject") || "none"</script>',
  }));

  const page = await restored.newPage();
  await page.goto(origin);
  await expect(page.getByTestId('project')).toHaveText('apollo');
  await restored.close();
});
\`\`\`

Restrict the init script by hostname or exact origin. An unrestricted restore can seed a token or flag into every domain the context visits, including third-party pages. If the stored state is authentication material, protect the separate file with the same controls used for cookie state.

## WebStorage Versus storageState

These APIs are complementary, not competing aliases.

| Goal | Use | Includes sessionStorage? | Timing and scope |
|---|---|---:|---|
| Read or mutate one current page origin | \`page.localStorage\` / \`page.sessionStorage\` | Directly, when selected | After the page has a target origin |
| Save reusable authenticated browser state | \`context.storageState()\` | No | Captures cookies and local storage; IndexedDB is optional |
| Initialize a new context from saved state | \`browser.newContext({ storageState })\` | No | Before pages are created |
| Replace state in an existing context | \`context.setStorageState()\` | No | Supported since 1.59, not new in 1.61 |
| Seed session data before boot scripts | \`context.addInitScript()\` | Manually | Runs in new documents before application scripts |

The [BrowserContext API](https://playwright.dev/docs/api/class-browsercontext) defines \`storageState()\` as cookies, local storage, and optional IndexedDB. The authentication guide separately documents that session storage needs manual persistence. The presence of \`page.sessionStorage.items()\` in 1.61 does not alter that file format.

Use direct page storage for surgical setup and assertions. Use storage state for reusable login or broad context initialization. Prefer a product API or UI action when storage is only an implementation detail and the behavior can be established naturally; direct storage setup is strongest when the state itself is the scenario.

## Define the Storage Contract Before Seeding Values

Direct access makes setup easy enough that a suite can accidentally encode undocumented keys everywhere. Before adding a call to \`setItem()\`, record five facts: which origin owns the key, whether its lifetime is local or page-session, how the value is serialized, what missing or malformed data means, and which product action removes it. Put repeated setup behind a small domain helper only after those facts are stable.

| Scenario | Initial store | User-visible assertion | Defect it can expose |
|---|---|---|---|
| First visit | Key absent | Default experience appears | App assumes a value always exists |
| Returning user | Valid current value | Saved preference or progress returns | Reader ignores or misparses persisted state |
| Schema upgrade | Older versioned JSON | App migrates or safely falls back | Deployment breaks existing browser profiles |
| Corrupt value | Invalid or incomplete string | Recovery path appears without a crash | Unhandled parse or validation error |
| Logout/reset | Auth or preference keys initially present | Product action removes only intended data | Sensitive state survives logout or unrelated preferences are erased |

Keep one test that creates the value through the real product UI and verifies the resulting behavior. Playwright's [best-practices guidance](https://playwright.dev/docs/best-practices#test-user-visible-behavior) recommends testing what users see instead of relying on implementation details. Direct WebStorage setup then earns its place in focused edge tests because it reaches difficult states without repeating a long journey.

Avoid helpers named only \`seedStorage\` that accept an arbitrary object. A helper such as \`setOnboardingVersion(page, 3)\` can validate origin, key, and serialization; a generic bag silently spreads typos and obsolete keys. Return to the page through an observable product event and assert the outcome, not just the stored string. Otherwise the test proves Playwright wrote a key but says nothing about whether the application uses it correctly.

Authentication values deserve stricter handling. Prefer an official login API plus \`storageState\` when possible. If a test must seed a token directly, obtain a short-lived test credential from controlled infrastructure, never hard-code it, and avoid printing \`items()\` wholesale on failure. A malformed-value test should use synthetic data that cannot authenticate anywhere.

## Failure Diagnosis

### page.localStorage is undefined or is not in the TypeScript type

The test is resolving Playwright older than 1.61. Run \`pnpm exec playwright test --version\` from the same package, inspect lockfile resolution, and reinstall matching browser binaries. Do not replace the new call with \`as any\`; either upgrade or use the older \`page.evaluate()\` pattern intentionally.

### getItem returns null even though DevTools showed a value

Check the current URL's scheme, host, and port. Web Storage is origin-scoped, and the page API addresses the current origin. A value at \`https://app.example.test\` is not the value at \`http://app.example.test\`, another port, or an identity subdomain. Also confirm the exact key and that a navigation did not move the page before the read.

### setItem succeeds but the UI does not change

The storage write and application state are separate. Many apps read storage only during boot or when a settings event fires. Reload, navigate, or invoke the product's real refresh action, then use a web-first assertion. Do not add \`waitForTimeout\`; elapsed time cannot cause code that never rereads storage to run.

### sessionStorage exists after reload but disappears in a second page

That is the expected page-session boundary, not flakiness. Keep the scenario in one page when it models a tab-scoped draft. Use \`addInitScript\` to initialize each new page deliberately, or use local storage/context state only if that matches the product design.

### storageState restores localStorage but not sessionStorage

That is also expected. The official auth guide says Playwright does not persist session storage in storage state. Save selected session values separately and restore them with an origin-restricted init script. Never change the storage-state JSON shape and assume Playwright will consume an invented \`sessionStorage\` field.

### A JSON assertion receives a string

Web Storage values are strings. Parse a known JSON value explicitly and fail with context when parsing is invalid. Do not globally parse every item; flags such as \`true\`, plain tokens, and version strings may not share one serialization contract.

### A cross-origin iframe has different storage

\`page.localStorage\` and \`page.sessionStorage\` target the page's current origin, not every frame origin. If storage inside an embedded origin is truly part of the product contract, work through that frame and its UI or use a narrowly scoped frame evaluation. Keep third-party origins mocked or controlled, following Playwright's recommendation not to test dependencies you do not own.

## Version Scope and Limitations

All five \`WebStorage\` methods and both Page properties require Playwright 1.61 or newer. The 1.61 release notes list Chromium 149, Firefox 151, and WebKit 26.5 as bundled browser versions and describe the API as browser-consistent. \`storageState\`, \`addInitScript\`, and browser contexts are older supported patterns; \`context.setStorageState()\` arrived in 1.59.

The direct API covers only local and session Web Storage. It does not expose IndexedDB, Cache Storage, service-worker caches, cookies, or passkeys through the same object. Use \`storageState({ indexedDB: true })\` where documented for IndexedDB-backed authentication, BrowserContext cookie methods for cookies, and the sibling [Playwright 1.61 passkey guide](/blog/playwright-1-61-webauthn-passkeys-guide-2026) for \`context.credentials\`.

Current-origin access is deliberately narrow. Navigate before use, account for redirects that change origins, and do not assume setting a value dispatches an application event. The API is a test-control surface, not a substitute for validating the user's settings UI. Keep at least one end-to-end path that writes preferences through the product and then use direct storage calls for focused edge states.

For reusable authoring and browser inspection guidance, browse [QA automation skills](/skills) and the [Playwright CLI skill](/skills/Pramod/playwright-cli). Pair storage setup with [stable Playwright locators](/blog/playwright-locators-best-practices-2026) so failures identify state boundaries instead of selector noise. The older [authentication-state guide](/blog/playwright-auth-state-multiple-user-roles) is useful when storage represents multiple signed-in roles rather than one page-level flag.

## Frequently Asked Questions

### Is page.localStorage new in Playwright 1.61?

Yes. The Page property and the \`WebStorage\` methods \`getItem\`, \`setItem\`, \`items\`, \`removeItem\`, and \`clear\` are marked as added in 1.61. Local storage support through evaluation and \`storageState\` existed earlier.

### Does page.sessionStorage persist through a reload?

It remains part of that page session, so a normal reload can read the same value. A separate page does not automatically receive it. Your app may clear or overwrite the value during boot, which is application behavior rather than a Playwright lifecycle rule.

### Does Playwright storageState include sessionStorage in 1.61?

No. The new direct session-storage API did not change \`storageState\`. Playwright's official authentication guide still requires separate capture and an init script when session storage must be reused.

### Should I replace every page.evaluate localStorage call?

Replace straightforward get, set, list, remove, and clear operations because the 1.61 API is clearer and typed. Keep evaluation when the test intentionally executes more complex application-side logic or accesses a frame/browser API not exposed by \`WebStorage\`.

### Can setItem accept an object or boolean?

No. Its documented \`value\` parameter is a string. Use \`JSON.stringify\` for structured values and parse them explicitly when reading. For flags, match the application's real encoding, such as \`'true'\` or \`'1'\`.

### Why must the page navigate before I use WebStorage?

The API addresses storage for the current origin. A test must establish the scheme, host, and port whose store it intends to manipulate. Navigating first also prevents accidentally seeding an initial or redirected origin.

### Does changing localStorage automatically update a React or Vue UI?

Not necessarily. The browser store changes, but application memory may not. Trigger the product behavior that rereads the value, commonly a reload or navigation, and assert the user-visible result. Avoid arbitrary sleeps.

### When should I use clear instead of a fresh BrowserContext?

Use \`clear()\` when the scenario specifically transitions one origin's selected store from populated to empty. Use a fresh context when the test needs a genuinely clean browser profile, including cookies, permissions, other origins, and unrelated storage mechanisms.
`,
    },
  },
  {
    slug: 'playwright-locators-best-practices-2026',
    clusterId: 'playwright-core',
    post: {
      title: 'Playwright Locators Best Practices: Roles, Strictness, and Stability',
      description:
        'Choose stable Playwright locators with roles, labels, scoped filters, strictness, and web-first assertions, then diagnose ambiguity without brittle shortcuts.',
      date: '2026-04-01',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-core.png',
      imageAlt: 'Playwright locator narrowing a page accessibility tree to one stable button',
      primaryKeyword: 'playwright locators best practices',
      keywords: [
        'playwright locators best practices',
        'playwright getByRole',
        'playwright strict mode violation',
        'playwright stable selectors',
        'playwright locator filter',
        'playwright test id locator',
        'playwright web first assertions',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-e2e-complete-guide',
      relatedSlugs: [
        'playwright-e2e-complete-guide',
        'playwright-1-61-webauthn-passkeys-guide-2026',
        'playwright-1-61-web-storage-api-guide-2026',
        'playwright-browser-context-guide-2026',
      ],
      sources: [
        'https://playwright.dev/docs/locators',
        'https://playwright.dev/docs/best-practices',
        'https://playwright.dev/docs/actionability',
        'https://playwright.dev/docs/test-assertions',
        'https://playwright.dev/docs/release-notes',
      ],
      content: `Playwright locator best practices are to select elements by user-facing semantics, make singular targets unique, and let strictness expose ambiguity. Prefer \`getByRole()\` with an accessible name, use \`getByLabel()\` for fields, scope repeated content with chaining and \`filter()\`, and use \`getByTestId()\` for an explicit product contract when semantics are insufficient. Pair locators with awaited web-first assertions. Avoid structural CSS/XPath, casual \`first()\` or \`nth()\`, forced actions, and arbitrary sleeps. The [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) supplies the broader runner and fixture foundation.

A good locator describes which user-visible control matters and why it is unique. It does not encode today's component wrapper hierarchy. This guide turns that principle into a repeatable selection order, shows two complete TypeScript examples, and diagnoses strictness and timeout failures without weakening the test.

## The Locator Selection Order That Holds Up

Playwright's [locator guide](https://playwright.dev/docs/locators) calls locators the central piece of auto-waiting and retryability. Its recommended built-ins cover role, text, label, placeholder, alt text, title, and test ID. The [official best-practices guide](https://playwright.dev/docs/best-practices#use-locators) recommends prioritizing user-facing attributes and explicit contracts rather than DOM implementation details.

Use this order as a decision process, not an absolute ranking detached from the UI:

| UI contract | Preferred locator | Example | Main failure signal |
|---|---|---|---|
| Interactive element with a meaningful role and name | \`getByRole(role, { name })\` | Submit button, navigation link, dialog | Semantics or accessible name changed |
| Labeled form control | \`getByLabel(label)\` | Email, password, consent checkbox | Label-control association is broken |
| Meaningful non-interactive copy | \`getByText(text)\` | Confirmation, empty-state message | Visible wording changed or is duplicated |
| Image with alternative text | \`getByAltText(text)\` | Product image, logo link | Alternative text changed or is missing |
| Stable explicit automation contract | \`getByTestId(id)\` | Canvas control, icon-only composite, translated UI | Product/test contract changed intentionally |
| Implementation detail with no better contract | \`locator(css)\` | Rare browser-specific or structural state | DOM refactor breaks the selector |

Role locators are usually the best first attempt because they match how users and assistive technology perceive the interface. Pass the accessible name in most cases: \`getByRole('button', { name: 'Save profile' })\` says much more than \`getByRole('button')\`. Native HTML usually supplies implicit roles, so a \`<button>\` should not need a redundant \`role="button"\` merely to satisfy a test.

Role locators are not a substitute for an accessibility audit. Playwright explicitly makes that limitation in its docs. They do, however, expose missing names, invalid role assumptions, and inaccessible custom controls early. If a button can be found only by a nested SVG class, first ask whether the control itself needs an accessible name.

## Accessible Name Matters More Than Visible Text Alone

The name matched by \`getByRole()\` is the computed accessible name, which can come from text content, a label, \`aria-label\`, or other accessibility relationships. That is why this may work even when the string is not rendered inside the button:

\`\`\`html
<button aria-label="Close cart"><svg aria-hidden="true"><!-- icon --></svg></button>
\`\`\`

\`\`\`typescript
await page.getByRole('button', { name: 'Close cart' }).click();
\`\`\`

Do not combine a guessed role with a visible string and assume the browser agrees. Inspect the accessibility tree with codegen, the Inspector, or a snapshot. The official docs recommend codegen because it prioritizes role, text, and test-ID locators and refines a candidate when multiple elements match.

If copy is translated, decide which contract should remain stable. A locale-specific E2E test can intentionally assert the translated accessible name. A behavior test spanning many locales may use a stable test ID while separately testing translation output. Hiding all copy changes behind test IDs makes localization regressions invisible; forcing every cross-locale action through English names makes the suite unusable. Split the concerns.

## Strictness Is a Diagnostic, Not an Obstacle

Playwright locators are strict for operations that require one element. The [strictness documentation](https://playwright.dev/docs/locators#strictness) says a click throws when the locator resolves to multiple elements, while multiple-element operations such as \`count()\` are valid. This is desirable: a test should not silently click whichever matching button happens to appear first.

When strictness fails, ask these questions in order:

1. Did the product accidentally render a duplicate control?
2. Is the accessible name too broad or missing context?
3. Can the locator be scoped to a dialog, row, card, region, or form?
4. Is a stable test ID the honest contract for this control?
5. Is selecting by position genuinely the behavior under test?

Only the final case normally justifies \`nth()\`. Playwright warns that \`first()\`, \`last()\`, and \`nth()\` can point at a different element after the page changes. Treat them as explicit list-position assertions, not universal strictness suppressors.

## Example 1: Scope a Repeated Action to Its Semantic Card

This complete spec runs with only \`@playwright/test\`. Two plan cards contain the same button name. The test identifies the card containing the \`Pro\` heading, then finds the button within that card. A DOM wrapper can be added or reordered without changing the user-facing contract.

\`\`\`typescript
// tests/pricing-locator.spec.ts
import { test, expect } from '@playwright/test';

test('chooses the Pro plan from repeated cards', async ({ page }) => {
  await page.setContent(\`
    <main>
      <h1>Plans</h1>
      <article>
        <h2>Starter</h2>
        <p>For personal projects</p>
        <button data-plan="Starter">Choose plan</button>
      </article>
      <article>
        <h2>Pro</h2>
        <p>For quality teams</p>
        <button data-plan="Pro">Choose plan</button>
      </article>
      <p role="status">No plan selected</p>
    </main>
    <script>
      for (const button of document.querySelectorAll('button')) {
        button.addEventListener('click', () => {
          document.querySelector('[role=status]').textContent =
            button.dataset.plan + ' selected';
        });
      }
    </script>
  \`);

  const proCard = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'Pro' }),
  });

  await expect(proCard).toHaveCount(1);
  await proCard.getByRole('button', { name: 'Choose plan' }).click();
  await expect(page.getByRole('status')).toHaveText('Pro selected');
});
\`\`\`

The parent locator and the \`has\` locator are evaluated relationally. This models “the article containing a heading named Pro,” then “the Choose plan button inside it.” It is stronger than a global text search followed by \`nth(1)\`, and more resilient than a selector such as \`.plans > div:nth-child(2) button\`.

The \`toHaveCount(1)\` assertion is optional for the click because strictness already requires one button. It is useful here as a diagnostic boundary: if the product duplicates the Pro card, the failure points at card identity before the action. Do not add uniqueness assertions to every obvious locator; add them where repeated structures have historically drifted.

## Example 2: Resolve a Strict Mode Violation in a Table

The next runnable example starts by proving that a broad Delete locator matches two controls. It then scopes to the invoice row a user intends to act on. No wait, position, or CSS class is needed.

\`\`\`typescript
// tests/invoice-locator.spec.ts
import { test, expect } from '@playwright/test';

test('deletes the intended invoice', async ({ page }) => {
  await page.setContent(\`
    <table>
      <caption>Invoices</caption>
      <thead><tr><th>Number</th><th>Customer</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td>INV-1041</td><td>Northwind</td><td><button>Delete</button></td></tr>
        <tr><td>INV-1042</td><td>Contoso</td><td><button>Delete</button></td></tr>
      </tbody>
    </table>
    <p role="status">No invoice deleted</p>
    <script>
      for (const button of document.querySelectorAll('button')) {
        button.addEventListener('click', () => {
          const row = button.closest('tr');
          document.querySelector('[role=status]').textContent =
            row.cells[0].textContent + ' deleted';
          row.remove();
        });
      }
    </script>
  \`);

  const broadDelete = page.getByRole('button', { name: 'Delete' });
  await expect(broadDelete).toHaveCount(2);

  const invoice = page.getByRole('row').filter({ hasText: 'INV-1042' });
  await invoice.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('status')).toHaveText('INV-1042 deleted');
  await expect(page.getByRole('row').filter({ hasText: 'INV-1042' })).toHaveCount(0);
});
\`\`\`

If customer names or invoice numbers can overlap, replace broad \`hasText\` with a child locator that expresses the stable cell contract. For example, give the invoice-number cell a test ID or use a link with the invoice number as its accessible name. Filtering is not permission to use an imprecise substring forever.

## Chaining, has, hasText, and Visible Filtering

Chaining keeps search context local:

\`\`\`typescript
const dialog = page.getByRole('dialog', { name: 'Edit profile' });
await dialog.getByLabel('Display name').fill('Asha');
await dialog.getByRole('button', { name: 'Save' }).click();
\`\`\`

Use \`filter({ has })\` when a descendant has a semantic identity, and \`filter({ hasText })\` for a stable text fragment within the candidate. Prefer \`has\` when it can express a role/name relationship because it narrows both meaning and scope.

Current Playwright also supports \`filter({ visible: true })\`, added before 1.61. The locator docs caution that a more reliable unique locator is usually better. Visible filtering is reasonable when the product deliberately keeps duplicate active/inactive templates in the DOM and visibility is the actual distinction. It is not a blanket fix for ambiguous component markup.

Locator operators such as \`and()\` and \`or()\` solve real compound or alternative states, but \`or()\` can itself become strict if both alternatives appear. If either a primary control or an interruption dialog may be present, observe the union, then branch based on the current UI and continue with a unique locator. Do not click the union blindly.

## Pair Locators with Web-First Assertions

Stable selection is only half of reliable automation. The [assertions guide](https://playwright.dev/docs/test-assertions) explains that async web matchers re-fetch and retry until the condition passes or times out. Use:

\`\`\`typescript
await expect(page.getByRole('status')).toHaveText('Saved');
\`\`\`

instead of:

\`\`\`typescript
expect(await page.getByRole('status').textContent()).toBe('Saved');
\`\`\`

The second form performs an immediate value assertion. It can fail during a legitimate asynchronous update even though the locator is excellent. Similarly, \`expect(await locator.isVisible()).toBe(true)\` checks once; \`await expect(locator).toBeVisible()\` retries.

Actions have their own [actionability checks](https://playwright.dev/docs/actionability). For \`click()\`, Playwright requires the locator to resolve to one element and checks visibility, stability, event reception, and enabled state. A locator timeout may therefore mean the element exists but is covered, moving, or disabled. Read the action log before changing the selector.

Avoid \`force: true\` unless the test intentionally bypasses a user-facing constraint. Force can turn “the overlay blocks checkout” into a passing click that no user could perform. Avoid \`waitForTimeout\` for the same reason: sleeping neither identifies the correct element nor proves it became actionable.

## Use Test IDs as a Designed Contract

Playwright's locator guide calls test IDs the most resilient testing method, while noting that they are not user-facing. Use them deliberately for interfaces whose stable identity is not available through semantics: a complex canvas toolbar, a translated composite widget, a virtualized cell, or two controls with intentionally identical names but different business identities.

\`\`\`typescript
const total = page.getByTestId('checkout-total');
await expect(total).toHaveText('$42.00');
\`\`\`

Name IDs by business meaning, not visual location: \`checkout-total\` is stronger than \`right-column-label-3\`. Treat removal or renaming as a contract change reviewed alongside tests. You can configure a different attribute through Playwright's test-ID configuration if the product already uses an established convention.

Do not add test IDs to compensate for broken HTML labels or unnamed buttons. Fix the semantic contract first when users and assistive technology need it. Then use a test ID only when it expresses information semantics cannot.

## Review Every New Locator as a Contract

Before merging a specification, read each action locator without looking at the DOM. A reviewer should be able to identify the control and its meaningful scope from the test code. Apply this short gate:

- The locator names a role, label, text, alternative text, or intentional test contract rather than a component class.
- A singular action resolves uniquely for a product reason, not because \`first()\` happens to select today's element.
- Repeated rows or cards are narrowed by a stable child identity before their action is selected.
- The locator targets the correct page or frame and is created after the flow that makes that surface available.
- The follow-up assertion is awaited and checks a user-visible result, not merely that the click promise resolved.
- \`force\`, positional selection, visible filtering, and test IDs each have a reason visible in the scenario or nearby code.
- Test data supplies deterministic business keys, so a good locator is not undermined by duplicate uncontrolled records.

Generated locators are candidates, not exemptions from this review. Codegen can see the current DOM and improve ambiguity, but it does not know which wording is contractually stable, whether a test ID represents business identity, or whether an experiment will render a second control in CI. Run the candidate against realistic data and at least the browser projects the suite supports.

When a locator must use CSS, keep the exception narrow and document the missing semantic contract in the application backlog. A short selector tied to a deliberate state attribute is preferable to a full ancestry path. Revisit exceptions when the component becomes accessible or gains a stable automation contract; otherwise temporary implementation detail becomes permanent suite architecture.

## Diagnose Locator Failures Systematically

### Strict mode violation

Count the matches and inspect each candidate in the Inspector or trace. Scope to a meaningful parent, add the accessible name, filter by a stable child, or introduce an explicit test ID. Do not append \`.first()\` until you can explain why first position is the requirement.

### Timeout waiting for a locator

Confirm the page URL and enclosing frame first. Then inspect role, name, and current DOM. A redirect, unopened dialog, wrong iframe, or failed setup often makes the correct locator absent. If the element exists, review actionability details such as visibility, stability, enabled state, and event interception.

### getByRole cannot find a visibly labeled control

The guessed role or computed accessible name differs from the visual impression. Inspect the accessibility snapshot. Check native element type, label association, \`aria-label\`, \`aria-labelledby\`, and hidden content. Fix application semantics rather than changing a button to \`getByText\` just to make the test green.

### The locator works locally but finds hidden duplicates in CI

Responsive markup, experiments, or server-rendered templates may differ. Run the same project/viewport and inspect the trace. Scope by active dialog or region. Use \`filter({ visible: true })\` only if visibility is the intended product distinction, not because the source of duplication is unknown.

### A locator selects the wrong item after data changes

Positional selection is the usual cause. Replace \`nth()\` with a stable row/card identity and a nested action. Control test data so business keys are deterministic. If position itself is the behavior, assert the complete ordered list before acting on an index.

### A good locator still flakes on the assertion

Check whether the assertion is web-first and awaited. Replace immediate DOM-value checks with locator matchers. If the state comes from a network request, assert the resulting UI or a specific response instead of sleeping. Keep selector diagnosis separate from asynchronous-state diagnosis.

The [Playwright debug-mode guide](/blog/playwright-debug-mode-inspector-guide) covers Inspector workflows, while the existing [Playwright locator best-practices article](/blog/playwright-best-practices-locators-2026) provides additional migration patterns.

## Version Scope and Limitations

These locator principles are current in Playwright 1.61, but they are not new 1.61 APIs. Role locators, strictness, chaining, filtering, auto-waiting, and web-first assertions are established Playwright behavior. The current release notes show that accessible-description matching for \`getByRole()\` arrived in 1.60, while visible filtering arrived earlier. Do not label either as a 1.61 feature.

Locators cannot make an unstable business identity stable. Duplicate names may be valid, virtualized content may not exist until scrolled into view, and canvas pixels do not expose ordinary DOM roles. Closed shadow roots are not pierced by normal locators, and cross-origin content still requires correct frame targeting. Use product contracts, controlled data, frame locators, visual assertions, or component-level tests as the UI requires.

Semantic locators also do not prove accessibility conformance. Add an accessibility testing layer for rules and manual evaluation. A passing \`getByRole('button')\` only proves Playwright found that role/name combination for this scenario.

Use the [Playwright BrowserContext guide](/blog/playwright-browser-context-guide-2026) when locator failures actually come from the wrong user session or state. Use the [Web Storage 1.61 guide](/blog/playwright-1-61-web-storage-api-guide-2026) when a feature flag or onboarding marker controls whether the element exists. For agent-ready conventions, browse the [QA skills directory](/skills) and install the [Playwright CLI skill](/skills/Pramod/playwright-cli); the CLI can help inspect current accessibility state, but generated candidates still need human review against the product contract.

## Frequently Asked Questions

### Is getByRole always the best Playwright locator?

It is usually the best first choice for interactive, semantic UI when paired with an accessible name. Use \`getByLabel\` for labeled fields and a stable test ID when user-facing semantics cannot uniquely express the product contract. There is no benefit in forcing a role locator onto non-semantic implementation detail.

### Why does Playwright throw a strict mode violation?

A singular operation such as \`click()\` resolved to more than one element. The failure protects the test from acting on an arbitrary match. Narrow by name, parent scope, child filter, or explicit contract instead of immediately using \`first()\`.

### Are first, last, and nth bad in every test?

No. They are valid when list position is itself the requirement, such as asserting the first search result after verifying the order. They are risky when used only to silence ambiguity because inserted or reordered elements can redirect the action silently.

### Should I use CSS or XPath locators in Playwright?

Use them only when the target has no suitable user-facing or explicit contract. Long CSS and XPath paths couple tests to DOM structure and break during harmless refactors. If the same structural selector appears repeatedly, improve the app's semantics or add a stable test ID.

### Does getByRole perform an accessibility audit?

No. It uses accessibility roles and names to locate elements and can reveal obvious semantic problems, but Playwright explicitly says role locators do not replace accessibility audits and conformance tests.

### How do I locate one button among repeated cards or rows?

Locate the card or row by its stable heading, key, or child element, then call \`getByRole('button', { name })\` inside that parent. This expresses the relationship and survives reordering better than \`nth()\`.

### Why should I avoid waitForTimeout with locators?

Playwright locators already re-resolve elements, actions auto-wait for actionability, and web-first assertions retry. A fixed sleep adds latency without proving the target is unique or ready. Wait for the specific user-visible state or network boundary instead.

### When is getByTestId preferable to a visible name?

Use it when the stable identity is a business or automation contract not reliably represented by role, label, or text, including heavily localized or non-DOM controls. Keep separate assertions for user-facing copy when that copy matters.
`,
    },
  },
  {
    slug: 'playwright-browser-context-guide-2026',
    clusterId: 'playwright-core',
    post: {
      title: 'Playwright BrowserContext Guide for Isolation and Parallel Sessions',
      description:
        'Use Playwright BrowserContext for clean test isolation, independent multi-user sessions, reusable auth state, context-wide controls, and safe parallel execution.',
      date: '2026-04-01',
      updated: '2026-07-14',
      category: 'Guide',
      image: '/blog/pillars/playwright-core.png',
      imageAlt:
        'One Playwright browser containing isolated admin and member BrowserContext sessions',
      primaryKeyword: 'playwright browser context',
      keywords: [
        'playwright browser context',
        'playwright browsercontext isolation',
        'playwright parallel sessions',
        'playwright multiple users',
        'playwright storageState context',
        'playwright context fixture',
        'playwright incognito context',
      ],
      contentKind: 'child',
      pillarSlug: 'playwright-e2e-complete-guide',
      relatedSlugs: [
        'playwright-e2e-complete-guide',
        'playwright-1-61-webauthn-passkeys-guide-2026',
        'playwright-1-61-web-storage-api-guide-2026',
        'playwright-locators-best-practices-2026',
      ],
      sources: [
        'https://playwright.dev/docs/browser-contexts',
        'https://playwright.dev/docs/api/class-browsercontext',
        'https://playwright.dev/docs/auth',
        'https://playwright.dev/docs/test-parallel',
        'https://playwright.dev/docs/test-fixtures',
        'https://playwright.dev/docs/release-notes',
      ],
      content: `A Playwright BrowserContext is an isolated, non-persistent browser session. Use the built-in \`context\` and \`page\` fixtures for ordinary tests; Playwright creates a fresh context per test, isolating cookies, local storage, session storage, and other browser profile state. Create additional contexts from the \`browser\` fixture only when one scenario needs independent users or configurations. Contexts share a browser process but not session state, so they are the correct boundary for admin/member, buyer/seller, or sender/receiver flows. See the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) for full project setup.

This guide answers the implementation questions that appear when a suite moves beyond one page: which object owns state, how to run two identities safely, when to reuse \`storageState\`, what parallel workers actually share, and why closing pages or clearing cookies is not equivalent to starting clean.

## What BrowserContext Is and Is Not

The [official isolation guide](https://playwright.dev/docs/browser-contexts) describes BrowserContexts as fast, isolated, incognito-like profiles. Playwright Test creates one context for each test and gives the test a default page inside it. With the library API, you create the same boundary manually through \`browser.newContext()\`, open pages, and close the context when finished.

\`Browser\`, \`BrowserContext\`, \`Page\`, and a test-runner worker solve different problems:

| Object | Owns or controls | Isolation implication | Typical lifecycle |
|---|---|---|---|
| \`Browser\` | Browser engine process and contexts | Contexts in one browser are independent sessions | Usually one per worker |
| \`BrowserContext\` | Cookies, origin storage, permissions, emulation, routes, pages | Security/session boundary between users | Fresh per Playwright Test test |
| \`Page\` | One tab, frames, navigation, page-scoped events | Pages in one context are not independent users | One default page plus popups/tabs |
| Worker process | Test files, worker fixtures, browser instance | Separate OS process; cannot share in-memory variables with other workers | Reused until failure or run completion |
| Backend account/data | Server-side identity and records | Not isolated by BrowserContext | Must be partitioned by test or worker |

The [BrowserContext API](https://playwright.dev/docs/api/class-browsercontext) says normal contexts created with \`browser.newContext()\` are non-persistent and do not write browsing data to disk. This does not mean they have no state while open. Pages in the context share cookies and local storage for the same origin, popups remain in the parent page's context, and context-level routes or permissions apply across its pages.

## Use the Built-In Fixtures by Default

Most tests should not call \`browser.newContext()\` at all:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('shows the account dashboard', async ({ page, context }) => {
  // context is fresh for this test; page belongs to it.
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(page.context()).toBe(context);
});
\`\`\`

The test runner handles creation and teardown. A second test receives a different context even if the worker process and browser are reused. That is the “start from scratch” strategy Playwright recommends over trying to clean every form of browser state between tests.

Do not put a BrowserContext in a module-level variable or a \`beforeAll\` merely to avoid login time. That changes unrelated tests into one ordered state machine. Save authenticated state once and initialize each fresh context from it instead. The official [authentication guide](https://playwright.dev/docs/auth) shows setup-project and per-worker patterns for this purpose.

Create manual contexts when one test genuinely requires two simultaneous identities, different context options, or explicit library-style lifecycle control. Close every manual context in \`finally\` or a fixture teardown so a failed assertion does not leak pages, videos, routes, or downloads.

## What State Crosses Pages and What Crosses Contexts

Use the ownership boundary to predict behavior:

| State or capability | Shared by pages in one context? | Shared by separate contexts? | Persistence tool |
|---|:---:|:---:|---|
| Cookies | Yes | No | \`storageState\` can save/restore them |
| localStorage for an origin | Yes | No | Included in \`storageState\` |
| sessionStorage | No, it is page-session scoped | No | Capture manually; not in \`storageState\` |
| Permissions and geolocation overrides | Context-level | No | Context options or methods, not storage state |
| Network routes | Context routes cover its pages | No | Re-register in each context/fixture |
| Pages and popups | Belong to the same context | No | Not persisted as browser state |
| Virtual WebAuthn passkeys | Context-scoped in 1.61 | No | Seed/install imperatively, not storage state |
| Server-side account records | External to the browser | Potentially yes | Provision unique data/accounts yourself |

The session-storage row is easy to misread. Two tabs in one signed-in context can share cookies and local storage yet have different session storage. Conversely, two contexts initialized from the same auth file have separate browser copies but can still mutate the same backend account.

For direct store manipulation in 1.61, see the [localStorage and sessionStorage API guide](/blog/playwright-1-61-web-storage-api-guide-2026). For passkeys, use the separate [WebAuthn Credentials guide](/blog/playwright-1-61-webauthn-passkeys-guide-2026); neither state type changes the underlying context boundary.

## Example 1: Run Two Independent Users in One Test

This complete TypeScript spec is runnable without an external server. Two contexts visit the same routed HTTPS origin. Each receives a different cookie and local-storage value, and each page renders only its own session. The same Browser instance owns both contexts.

\`\`\`typescript
// tests/multi-user-context.spec.ts
import { test, expect, type BrowserContext } from '@playwright/test';

const origin = 'https://sessions.example.test';
const html = \`
  <h1>Session</h1>
  <output data-testid="cookie"></output>
  <output data-testid="workspace"></output>
  <script>
    document.querySelector('[data-testid=cookie]').textContent = document.cookie;
    document.querySelector('[data-testid=workspace]').textContent =
      localStorage.getItem('workspace') || 'none';
  </script>
\`;

async function routeApp(context: BrowserContext) {
  await context.route(origin + '/**', route =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
}

test('keeps admin and member sessions isolated', async ({ browser }) => {
  const adminContext = await browser.newContext();
  const memberContext = await browser.newContext();

  try {
    await routeApp(adminContext);
    await routeApp(memberContext);

    await adminContext.addCookies([{ name: 'role', value: 'admin', url: origin }]);
    await memberContext.addCookies([{ name: 'role', value: 'member', url: origin }]);

    const adminPage = await adminContext.newPage();
    const memberPage = await memberContext.newPage();
    await Promise.all([adminPage.goto(origin), memberPage.goto(origin)]);

    await adminPage.localStorage.setItem('workspace', 'operations');
    await memberPage.localStorage.setItem('workspace', 'quality');
    await Promise.all([adminPage.reload(), memberPage.reload()]);

    await expect(adminPage.getByTestId('cookie')).toContainText('role=admin');
    await expect(adminPage.getByTestId('workspace')).toHaveText('operations');
    await expect(memberPage.getByTestId('cookie')).toContainText('role=member');
    await expect(memberPage.getByTestId('workspace')).toHaveText('quality');
  } finally {
    await adminContext.close();
    await memberContext.close();
  }
});
\`\`\`

The two \`goto()\` and reload operations can proceed together because the sessions are independent. \`Promise.all\` coordinates known operations; it is not a substitute for test-runner parallelism and it does not make shared backend data safe.

In a real admin/member scenario, initialize each context with a role-specific storage-state file and assert identity before authorization behavior. Never log in as admin in one page and member in another page of the same context. The second login changes shared cookies and can silently turn both pages into the same user. The existing [multiple-role auth-state guide](/blog/playwright-auth-state-multiple-user-roles) shows a typed fixture for that pattern.

## Example 2: Save State, Restore It, and Prove the Limits

The following offline-runnable spec captures a cookie and local-storage value from one context, initializes another context from the returned object, and proves that session storage was not restored.

\`\`\`typescript
// tests/context-storage-state.spec.ts
import { test, expect, type BrowserContext } from '@playwright/test';

const origin = 'https://state.example.test';

async function installPage(context: BrowserContext) {
  await context.route(origin + '/**', route =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>State probe</h1>',
    }),
  );
}

test('restores cookie and local storage into a fresh context', async ({ browser }) => {
  const source = await browser.newContext();
  await installPage(source);
  await source.addCookies([{ name: 'session', value: 'test-user', url: origin }]);
  const sourcePage = await source.newPage();
  await sourcePage.goto(origin);
  await sourcePage.localStorage.setItem('theme', 'dark');
  await sourcePage.sessionStorage.setItem('draft', 'not-persisted');

  const state = await source.storageState();
  await source.close();

  const restored = await browser.newContext({ storageState: state });
  try {
    await installPage(restored);
    const page = await restored.newPage();
    await page.goto(origin);

    expect(await restored.cookies(origin)).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'session', value: 'test-user' })]),
    );
    expect(await page.localStorage.getItem('theme')).toBe('dark');
    expect(await page.sessionStorage.getItem('draft')).toBeNull();
  } finally {
    await restored.close();
  }
});
\`\`\`

The [BrowserContext reference](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state) defines storage state as cookies, local storage, and an optional IndexedDB snapshot. The auth guide documents session storage separately. If Firebase or another login implementation stores tokens in IndexedDB, request it explicitly with \`storageState({ indexedDB: true })\`.

Treat a saved auth file as a credential. It can contain cookies and tokens that impersonate a test user. Keep it under \`playwright/.auth\` or the project's output directory, exclude it from version control, and avoid public report attachments. Delete or regenerate expired state rather than making every test tolerate anonymous redirects.

## Context Options Belong at Context Creation

Context options are ideal for scenarios that need consistent browser-level conditions across all pages:

\`\`\`typescript
const context = await browser.newContext({
  locale: 'en-GB',
  timezoneId: 'Europe/London',
  colorScheme: 'dark',
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
  serviceWorkers: 'block',
});
\`\`\`

Set these through project \`use\` options when every test in a project needs them. Create an additional context only when one test compares configurations side by side. Contexts are cheap relative to separate browser launches, but unnecessary manual lifecycle still increases setup code and the chance of leaks.

Permission support can differ by browser and browser version; the API reference explicitly warns about that. Test the user-visible fallback as well as the granted path. Locale, timezone, and geolocation are independent controls: changing coordinates does not automatically change timezone or language.

Context routes apply to requests from all pages in the context, making them preferable for popups or multi-page flows. Playwright notes that route interception does not see requests already intercepted by a service worker and recommends blocking service workers when routing behavior is the goal. If service-worker behavior is itself under test, keep it enabled and use the dedicated service-worker APIs and limitations.

## BrowserContext and Parallel Test Execution

Browser contexts provide test isolation; worker processes provide concurrency. The [parallelism guide](https://playwright.dev/docs/test-parallel) says test files run in parallel by default, tests within one file run in order by default, and each worker starts its own browser. Playwright reuses a worker where possible, but still creates a fresh context for every test using the standard fixtures.

Turning on \`fullyParallel\` allows individual tests in files to run across workers:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
});
\`\`\`

Do this only after tests and test data are independent. Context isolation prevents browser-state leakage, but it cannot stop two workers from editing the same database row, draining the same queue, or revoking the same user's session. Use unique resources or worker-specific accounts. The official auth guide uses \`test.info().parallelIndex\` to select or create one account per parallel worker and saves each worker's state separately.

Do not create a global browser yourself inside test files to “improve parallelism.” The runner already manages browsers, contexts, retries, projects, traces, and teardown. Manual browser ownership bypasses those integrations and usually makes failures harder to attribute.

## Choose the Smallest Context Pattern That Fits

Use one decision rule: keep the runner-owned context unless the scenario itself requires another independent browser session.

| Scenario | Context pattern |
|---|---|
| Ordinary one-user behavior | Built-in \`page\` and \`context\` fixtures |
| Same tests under several roles or browsers | Projects with role-specific \`storageState\` and device options |
| Two actors interacting in one scenario | Two manual contexts or typed context fixtures created from \`browser\` |
| Many parallel tests need reusable unique accounts | Worker fixture creates one auth file per \`parallelIndex\`; tests still get fresh contexts |
| Product explicitly depends on a disk profile | Deliberate persistent-context suite, separated from normal isolated tests |

This choice keeps reports and teardown aligned with Playwright Test. It also makes code review straightforward: every manual \`newContext()\` should correspond to a named actor or configuration that could not use the built-in context. If no such reason exists, remove it.

## Context-Level Events, Routes, and Cleanup

Use context events when behavior can happen in any page. A context \`page\` event captures a popup regardless of which page opened it, and context request/response events observe traffic across pages. Page-level listeners are better when the scenario intentionally concerns one tab.

Close the context, not just its currently visible page, when the session is finished. \`context.close()\` closes every page in that context and finalizes context-owned artifacts. A useful reason can be supplied to interrupted operations in supported versions:

\`\`\`typescript
await context.close({ reason: 'multi-user scenario finished' });
\`\`\`

Avoid closing the built-in \`context\` fixture manually; let the runner tear it down. Manual contexts created from \`browser\` are your responsibility. A fixture is often the cleanest owner because its code after \`await use(value)\` runs as teardown even when the test fails.

## Failure Diagnosis by Ownership Boundary

### Two pages unexpectedly become the same user

They are probably in one context. Pages share context cookies, so the most recent login changed both. Create one context per identity, initialize each with its own state, and assert an identity marker before testing collaboration or authorization.

### A fresh context is still affected by another test

Determine whether the state is actually browser-side. Shared database records, cache entries, feature flags, email inboxes, and test accounts survive context creation. Partition or reset the external resource. If the leak is browser-side, look for a manually reused context, persistent profile, or state file shared unintentionally.

### storageState loads but the app redirects to login

The cookie or token may have expired, the file may belong to another origin/environment, IndexedDB may have been omitted, or login completion may have been captured before redirects finished setting cookies. Regenerate state after an observable signed-in condition. Do not add retries around an invalid credential file.

### sessionStorage is missing after state restoration

That is expected. Save selected session values separately and restore them before application scripts with an origin-restricted init script. The [Web Storage guide](/blog/playwright-1-61-web-storage-api-guide-2026) includes a complete 1.61 capture/restore example.

### Context routing misses a request

Check whether a service worker handled it, whether the URL pattern is correct, and whether the route was registered before navigation/request creation. Page routes take precedence when both match. For general network mocking, block service workers unless their behavior is the subject of the test.

### target page, context, or browser has been closed

Find the lifecycle owner. A helper may close a context still used by another page, a \`finally\` block may run too early, or browser shutdown may interrupt contexts. Keep creation and closure in the same fixture/helper and avoid sharing manual contexts across concurrently running tests.

### Parallel tests pass alone but fail together

Browser context isolation is working, but external data is colliding. Include a run ID and \`parallelIndex\` in accounts or resource names, make cleanup idempotent, and avoid tests that mutate shared account-level settings. Reducing workers can confirm the diagnosis but is not the final fix.

## Version Scope and Limitations

BrowserContext isolation and the standard test fixtures long predate Playwright 1.61. Do not describe contexts, \`browser.newContext()\`, per-test isolation, parallel workers, or \`storageState\` as 1.61 additions. Relevant recent milestones in the current official docs are \`setStorageState()\` and \`isClosed()\` in 1.59, several context-wide page lifecycle events in 1.60, and \`browserContext.credentials\` in 1.61.

This guide targets non-persistent contexts and Playwright Test's normal runner lifecycle. Persistent profiles have different disk and single-profile constraints and should be used only when the product scenario genuinely requires a user data directory. BrowserContext isolation also does not emulate separate machines, IP addresses, browser processes, or backend tenants. Use projects, proxies, separate workers/machines, and isolated test infrastructure when those are the real boundaries.

Service-worker inspection is Chromium-specific in the current docs, and supported permissions vary. Storage-state files exclude session storage and passkeys; IndexedDB capture is optional. These are explicit limits, not reasons to abandon contexts.

For reliable actions inside each session, apply the [Playwright locator best practices](/blog/playwright-locators-best-practices-2026). The older [browser-context isolation article](/blog/playwright-browser-contexts-isolation-guide) offers additional fixture variations. Browse the [QA skills directory](/skills) or install the [Playwright CLI skill](/skills/Pramod/playwright-cli) for agent-assisted browser inspection, but keep context ownership, auth files, and parallel account allocation explicit in reviewed test code.

## Frequently Asked Questions

### Does Playwright create a new BrowserContext for every test?

Yes, when tests use the standard Playwright Test fixtures. Each test gets an isolated context and a default page. Manual library scripts must create and close contexts themselves.

### Are two pages in one context isolated users?

No. They share cookies and origin-local storage, and a login in one can change the other's identity. Use separate contexts for separate users. Page-specific session storage does not turn pages into secure identity boundaries.

### Is BrowserContext the same as an incognito window?

It is an incognito-like, isolated non-persistent profile. The analogy is useful for cookies and storage, but tests should rely on Playwright's documented API rather than browser UI assumptions.

### Can multiple contexts run in parallel in one browser?

Yes. A single scenario can operate several independent contexts, and Playwright Test workers also run tests concurrently. Parallel safety still depends on isolating backend accounts and data, not just browser state.

### Should I reuse one context to make tests faster?

Not across unrelated tests. The official isolation guidance favors a fresh context because cleanup is incomplete and easy to forget. Reuse authenticated \`storageState\` in fresh contexts instead of reusing the context itself.

### What does BrowserContext storageState save?

It saves cookies and local storage, plus IndexedDB when explicitly requested. It does not persist session storage or the 1.61 virtual WebAuthn authenticator. Protect auth-state files as credentials.

### When should I create a context from the browser fixture?

Create one when a single test needs another independent user, another set of context options, or explicit lifecycle control. Use the built-in context for ordinary one-user tests so the runner owns cleanup and artifacts.

### Why do parallel tests still interfere when contexts are isolated?

They are usually sharing something outside the browser: an account, database record, feature flag, queue, mailbox, or environment. Allocate unique external state by test or worker and make cleanup deterministic.
`,
    },
  },
];
