import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Use Mock Service Worker in Vitest Browser Mode',
  description:
    'Use Mock Service Worker in Vitest Browser Mode to test real fetch behavior, per-test API scenarios, failures, and request contracts in a browser.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Use Mock Service Worker in Vitest Browser Mode

The component calls \`fetch('/api/invoices')\` inside a real Chromium page. There is no Node request object for a test double to intercept, and replacing \`window.fetch\` would bypass response streaming, headers, and the browser's service-worker path. Mock Service Worker (MSW) meets the request where the browser actually sends it.

Vitest Browser Mode runs test modules in a browser iframe, while a provider such as Playwright controls that browser. MSW's browser integration registers a service worker and routes matching network requests through declarative handlers. The application continues to use its production HTTP client. Tests control only the server responses.

That division gives component and browser-level tests a useful middle ground: more fidelity than mocking an imported API function, much less infrastructure than starting every backend service. It does bring service-worker lifecycle and URL-scope rules that Node-only MSW tests never encounter.

## Wire the worker into the browser test lifecycle

Install compatible versions of \`msw\`, \`vitest\`, and a Browser Mode provider. Current Vitest configurations require an enabled browser, a provider, and at least one browser instance. Generate MSW's worker script into a directory served by Vite, conventionally \`public/\`:

\`\`\`bash
npx msw init public/ --save
\`\`\`

The command writes \`mockServiceWorker.js\`. Commit that generated file if the test environment expects a clean checkout to run without regeneration. When MSW is upgraded, rerun the init command so the worker script stays compatible with the library.

Create browser handlers and a worker singleton:

\`\`\`ts
// test/mocks/browser.ts
import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';

export const handlers = [
  http.get('/api/invoices', () => {
    return HttpResponse.json([
      { id: 'inv-101', customer: 'Northwind', total: 8400, status: 'open' },
    ]);
  }),
];

export const worker = setupWorker(...handlers);
\`\`\`

Then start and reset it from a Browser Mode setup file. The setup runs in the browser test context, which is essential because \`setupWorker\` needs \`navigator.serviceWorker\`.

\`\`\`ts
// test/browser.setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { worker } from './mocks/browser';

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  worker.resetHandlers();
});

afterAll(() => {
  worker.stop();
});
\`\`\`

| Lifecycle call | Purpose | Failure it prevents |
| --- | --- | --- |
| \`worker.start()\` | Registers and activates interception before tests | Real requests escaping during initial render |
| \`worker.resetHandlers()\` | Removes runtime overrides after each test | One scenario contaminating the next |
| \`worker.stop()\` | Stops request interception after the run | Worker state lingering in interactive browser sessions |
| \`onUnhandledRequest: 'error'\` | Fails unexpected application calls | A new endpoint silently reaching a dev or external server |

Strict unhandled-request behavior is valuable in CI. During migration, a custom callback or \`'warn'\` may be less disruptive, but treat every warning as technical debt. Silence only known non-API assets if the worker sees them.

## Configure Vitest to serve the worker script

The public directory must be available at the browser origin. A straightforward configuration uses the Playwright provider and loads the setup module:

\`\`\`ts
// vitest.config.ts
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/browser.setup.ts'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
});
\`\`\`

If the application uses a Vite framework plugin, include it just as the development build does. React JSX, Vue single-file components, and framework aliases should resolve through the same transformation pipeline. The [Vitest Browser Mode guide](/blog/vitest-browser-mode-guide-2026) covers provider selection and project separation when Node tests and browser tests live in one repository.

A non-root Vite \`base\` complicates the worker URL. MSW normally requests \`/mockServiceWorker.js\`; an application hosted below a subpath may need \`serviceWorker.url\` in \`worker.start\`. Check the browser network panel for a 404 before changing unrelated handlers.

Service-worker scope also matters. A worker served from the origin root can generally control requests across that origin. A worker beneath a narrow directory may not control pages outside its scope unless headers or registration options expand it. Keep the conventional root-served script unless the production-like base path requires something else.

## Test loading, empty, and error states through HTTP

Runtime handlers added with \`worker.use()\` should describe the scenario that differs from the default. MSW prepends runtime handlers, so they take precedence until reset.

Consider an invoice table that renders a progress indicator, then rows, an empty message, or an error alert. The test should interact with the rendered component and let its own query library issue the request.

\`\`\`tsx
import { HttpResponse, delay, http } from 'msw';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import { worker } from './mocks/browser';
import { InvoiceTable } from '../src/InvoiceTable';

test('keeps the progress state until invoices arrive', async () => {
  worker.use(
    http.get('/api/invoices', async () => {
      await delay(150);
      return HttpResponse.json([
        { id: 'inv-204', customer: 'Contoso', total: 1250, status: 'paid' },
      ]);
    }),
  );

  render(<InvoiceTable />);

  await expect.element(page.getByRole('progressbar')).toBeVisible();
  await expect.element(page.getByText('Contoso')).toBeVisible();
  await expect.element(page.getByRole('progressbar')).not.toBeInTheDocument();
});

test('renders a recoverable message for a gateway failure', async () => {
  worker.use(
    http.get('/api/invoices', () => {
      return HttpResponse.json(
        { code: 'upstream_unavailable', message: 'Try again shortly' },
        { status: 502 },
      );
    }),
  );

  render(<InvoiceTable />);

  await expect.element(page.getByRole('alert')).toHaveTextContent('Try again shortly');
  await expect.element(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
\`\`\`

\`delay(150)\` models an asynchronous boundary, not network realism. Keep delays short and purposeful. Waiting several seconds makes the suite slow without increasing confidence. For timeout behavior, inject the timeout policy into the client or use a dedicated test with controlled fake time where the browser integration supports it.

An empty response should normally be a successful \`200\` with an empty array if that matches the contract, not \`204\` followed by JSON parsing. Handler fidelity includes status and body shape.

## Inspect request bodies and headers inside handlers

Handlers are executable assertions at the mock server boundary. A mutation test can examine the genuine \`Request\` created by the application, then return a domain-specific response.

\`\`\`tsx
test('sends the edited due date with the anti-forgery header', async () => {
  let captured: { id: string; dueDate: string } | undefined;

  worker.use(
    http.put('/api/invoices/:invoiceId', async ({ params, request }) => {
      expect(request.headers.get('x-csrf-token')).toBe('browser-test-token');
      captured = (await request.json()) as { id: string; dueDate: string };
      expect(params.invoiceId).toBe('inv-101');
      return HttpResponse.json({ ...captured, status: 'scheduled' });
    }),
  );

  render(<InvoiceTable csrfToken="browser-test-token" />);
  await page.getByRole('button', { name: 'Edit inv-101' }).click();
  await page.getByLabelText('Due date').fill('2026-08-01');
  await page.getByRole('button', { name: 'Save invoice' }).click();

  await expect.element(page.getByText('Scheduled for 2026-08-01')).toBeVisible();
  expect(captured).toEqual({ id: 'inv-101', dueDate: '2026-08-01' });
});
\`\`\`

Do not make every handler an assertion minefield. When a request mismatch should produce an application-visible server error, return a \`400\` and assert the UI. When it represents a programmer error, throwing an assertion gives faster diagnosis. Be consistent about which layer owns schema validation.

The request body is a stream and can be consumed once. Parse it once, store the serializable result if the test needs it later, and avoid two helpers both calling \`request.json()\`.

For a larger handler architecture, shared response builders, and component API patterns, read the [Vitest MSW component API mocking guide](/blog/vitest-msw-component-api-mocking-guide). Browser Mode adds registration concerns, but handler composition remains the same MSW model.

## Choosing an interception strategy deliberately

Not every browser test should use MSW. Match the substitute to the question.

| Technique | Interception point | Strong fit | Tradeoff |
| --- | --- | --- | --- |
| MSW \`setupWorker\` | Browser service worker | Component flows that should exercise real \`fetch\` and Request/Response behavior | Requires worker script, activation, and same-origin awareness |
| \`vi.mock\` API module | JavaScript import boundary | Isolated component branching with no interest in HTTP serialization | Can pass while production client construction is broken |
| Playwright route interception | Browser automation provider | Full-page navigation and request control from outside the iframe | Couples Vitest Browser tests to provider-specific plumbing |
| Real test server | Network process | Authentication, middleware, persistence, or protocol integration | Slower setup and more state management |
| Node MSW server | Node request interception | Node-environment unit and integration tests | Does not register a browser service worker |

The browser worker cannot intercept cross-origin requests unless its handler matches them, but CORS behavior can still differ from a real remote server because the service worker returns the response locally. Use a real service for critical preflight, TLS, cookie-domain, and gateway behavior.

Likewise, MSW should not be used to claim backend contract compatibility. Handlers are examples maintained by the consumer team. Validate them against an OpenAPI schema, shared types, or provider contract tests if drift is costly.

## Avoid service-worker races and state leaks

Await \`worker.start()\`. Without the await, the first component can fetch before activation and hit the network. This race may appear only on clean CI browsers because a local browser already has the worker installed.

Reset runtime handlers after each test. A handler returning \`500\` for one scenario must not remain active for the next success case. MSW's initial handlers are restored by \`resetHandlers()\`; one-off runtime handlers disappear.

Browser Mode can run files concurrently. A single service worker controls an origin, so globally changing handlers can conflict if independent test contexts share that origin and execute simultaneously. Understand the isolation model of the provider and Vitest version. If collision appears, separate instances or projects, avoid concurrent tests that mutate global handler state, or give scenarios distinct URLs or request identifiers.

Do not call \`worker.use()\` after the component has already issued its request. Register the scenario first, render second. For user-triggered requests, install the handler before clicking.

An unhandled request error may be an asset, analytics beacon, or Vite development endpoint rather than an API call. Inspect the URL. Add a narrow bypass policy for known infrastructure, not a blanket wildcard that allows actual application endpoints to escape.

## Debugging a worker that appears inactive

Open the Browser Mode UI and inspect the controlled iframe, not only the Vitest parent page. Confirm \`navigator.serviceWorker.controller\` exists after startup. In the network panel, request \`/mockServiceWorker.js\` directly and verify it returns JavaScript rather than the application's HTML fallback.

MSW logs a startup message unless quiet behavior is configured. Absence of that message usually points to setup execution or registration. A handler mismatch instead produces an unhandled request message. Distinguishing those two cases saves time.

Relative URLs resolve against the browser origin. A handler for \`http://localhost:3000/api/invoices\` will not match a request sent to Vitest's own origin unless the application client uses that absolute base URL. Prefer path handlers when the app uses same-origin APIs; use the full origin when cross-origin identity is part of the behavior.

If tests fail after upgrading MSW, regenerate the public worker script. If they fail only under HTTPS or a subpath, inspect scope and the configured worker URL. If they fail in WebKit but not Chromium, reduce the case to registration and one handler before suspecting the component.

## Keeping handlers credible over time

Name domain fixtures by scenario, not by random nouns. A paid invoice, an overdue invoice, and a malformed invoice produce clearer reviews than \`mockData1\`. Keep handler defaults minimal so tests add only the records they assert.

Validate response objects with the same generated TypeScript types the client uses where possible. Types do not catch semantic drift or runtime fields, but they reduce accidental shape errors. Runtime schema parsing in the application should remain enabled in tests so a bad mock fails as a bad server would.

Review MSW handlers when backend endpoints change. A consumer suite that mocks yesterday's URL can remain green while production calls tomorrow's route incorrectly. Contract verification and a small number of real-environment tests provide the missing feedback.

Finally, test failure behavior as carefully as success. Browser APIs expose aborts, offline errors, malformed JSON, non-2xx status, and slow responses differently. MSW can represent many of these, but use its documented response and network-error primitives rather than throwing arbitrary JavaScript errors that the browser would never produce.

## Model sequential responses for retrying clients

Retry interfaces need a handler whose response changes by attempt. Keep the counter local to the test and install the handler before render. The first call can return \`503\` with a \`Retry-After\` header, while the second returns the invoice. Then assert one visible recovery state and the final data, plus the observed request count.

Resetting handlers does not reset arbitrary variables captured by a test module. Define the counter inside the test so another case cannot inherit it. If the application retry delay is long, inject a short policy for browser tests rather than asking MSW to make multi-second waiting cheap. The server mock controls responses; the client still owns scheduling.

For pagination, handlers can read \`new URL(request.url).searchParams\` and return a page based on the cursor. This exercises real URL encoding and catches clients that send \`undefined\` as text. Avoid one handler that accepts every possible query without inspection, because it will let a broken request receive a valid response.

## Make worker scope visible in multi-project configurations

Vitest projects often split \`*.browser.test.tsx\` from Node unit tests. Load \`browser.setup.ts\` only in the browser project. Importing \`msw/browser\` in a Node worker fails because service-worker globals do not exist, while importing a Node server setup into the browser defeats the intended interception path.

If Chromium, Firefox, and WebKit instances run together, treat each as a distinct execution environment. Registration behavior, clean profiles, and timing can differ. A handler file may be shared, but worker lifecycle should occur inside each browser context. Diagnose a browser-specific failure with one instance and one request before widening concurrency.

Hot reload adds another wrinkle during interactive development. Setup files can execute again when edited. MSW handles normal registration, but duplicated lifecycle hooks or module singletons can make logs confusing. Stop the old worker when appropriate and reload the controlled frame after changing the generated worker script.

## Test downloads, streams, and non-JSON responses honestly

MSW is not limited to JSON. Return text, blobs, headers, redirects, and status-only responses through documented \`HttpResponse\` APIs. A CSV export test should verify \`content-type\`, \`content-disposition\`, and decoded bytes in the component's download path rather than wrapping the payload in JSON for convenience.

Streaming cases need special care. A synthetic stream can validate incremental UI rendering, but it does not reproduce every proxy buffer, connection reset, or HTTP/2 behavior. Keep the browser test focused on consuming chunks and cancellation. Put gateway and transport characteristics in a deployed integration environment.

For malformed JSON, return text with an application/json media type. That reaches the actual parser failure path. Throwing inside the MSW handler represents a handler problem, not necessarily the network failure the browser client would observe.

These distinctions keep the mock credible: status, headers, media type, and body are part of the contract, while physical network topology is outside the service worker's fidelity.

## Frequently Asked Questions

### Should Vitest Browser Mode use setupWorker or setupServer?

Use \`setupWorker\` from \`msw/browser\` for test code running in the browser. \`setupServer\` is for Node processes and does not register a service worker in the controlled page.

### Why does the first request sometimes bypass MSW?

The worker likely was not fully activated before rendering. Await \`worker.start()\` in the browser setup lifecycle and ensure no module starts fetching at import time before setup completes.

### Where should mockServiceWorker.js live with Vite?

Place the generated script in Vite's public directory so it is served as a root asset. For a custom base path, supply the correct registration URL and verify the resulting worker scope.

### Can MSW verify CORS preflight behavior accurately?

It can model responses used by the client, but a locally intercepted response is not a complete substitute for a remote origin, proxy, TLS, and browser preflight exchange. Keep a real integration test for high-risk CORS rules.

### Why do handlers leak between browser tests?

Runtime handlers are stateful. Call \`worker.resetHandlers()\` after every test, and check whether concurrent files share a browser origin before using per-test global overrides.
`,
};
