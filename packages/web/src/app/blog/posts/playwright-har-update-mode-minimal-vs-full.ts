import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright HAR Update Mode: Minimal vs Full',
  description:
    'Compare Playwright HAR update mode minimal vs full, understand exactly what each records, and choose stable, reviewable network fixtures for reliable tests.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# Playwright HAR Update Mode: Minimal vs Full

Open a HAR recorded with \`minimal\` and much of the familiar browser waterfall is gone. There may be no useful timing breakdown, cookie history, TLS detail, or page association. That is intentional. Playwright kept the request and response material needed to match and fulfill traffic, not the evidence a performance investigator expects from an archival HTTP trace.

The choice between \`minimal\` and \`full\` is therefore a purpose decision. Are you maintaining a deterministic replay fixture, or preserving a broadly useful network record? Both modes are real HAR output, but they optimize for different consumers. Treating them as interchangeable produces oversized fixtures on one side and disappointing diagnostics on the other.

## What update mode controls

\`browserContext.routeFromHAR()\` can serve matching requests from a HAR. When its \`update\` option is true, Playwright records actual network traffic back to the specified HAR instead of replaying it. The file is written when the browser context closes. \`updateMode\` selects how much metadata is retained during that update.

Playwright documents two values. \`minimal\` records only information necessary for HAR routing and omits sizes, timing, page, cookies, security, and other data unused by replay. \`full\` records a complete HAR. The default for update mode is \`minimal\`.

| Recorded concern | \`minimal\` | \`full\` |
|---|---|---|
| Request identity used for matching | Kept | Kept |
| Response status, headers, and content needed for fulfillment | Kept | Kept |
| Timing and size fields for waterfall analysis | Omitted when not needed for routing | Recorded |
| Page association and richer browser metadata | Omitted | Recorded |
| Cookies and connection security detail | Omitted | Recorded |
| Primary optimization | Small replay fixture | General HAR fidelity |

\`updateMode\` is not a compression level and does not decide whether bodies are inline. That separate choice is \`updateContent: 'embed' | 'attach'\`. It also does not control mismatch behavior. That is \`notFound: 'abort' | 'fallback'\`. Keeping these axes separate prevents confusing configurations.

## Recording a minimal replay fixture

This example updates only catalog API calls and stores content in the HAR. Closing the context is part of correctness because the updated file is flushed then.

\`\`\`typescript
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();

await context.routeFromHAR('./tests/har/catalog.har', {
  url: '**/api/catalog/**',
  update: true,
  updateMode: 'minimal',
  updateContent: 'embed',
});

const page = await context.newPage();
await page.goto('https://shop.example.test/catalog');
await page.getByRole('button', { name: 'Next page' }).click();

await context.close();
await browser.close();
\`\`\`

The URL filter is important. Without it, unrelated fonts, analytics calls, feature flags, and document navigations can enter the fixture. A replay test is easier to review when the HAR represents one service boundary rather than a browsing session.

Run update code deliberately, not on every CI test. A fixture that silently refreshes itself can convert an upstream regression into a new expected response. Many teams use a dedicated script or opt-in environment variable, inspect the diff, then commit it like a snapshot.

## When minimal produces the better test asset

Minimal mode is the default for good reason: routing does not need a performance waterfall. Smaller semantic surface means fewer changes when browser metadata or server timing varies. Reviewers can focus on URLs, payloads, status, headers, and bodies that actually affect replay.

It fits UI tests that isolate an unreliable third-party API, reproduce a response sequence, or run offline. It is also appropriate when HARs live in source control. Cookie and security metadata can carry sensitive or environment-specific values, so omitting unused fields reduces exposure, though teams must still scrub request and response data.

Minimal is not automatically tiny. A response body containing a multi-megabyte video is still large if replay requires it. Narrow the URL filter and decide whether that resource should be mocked with \`route.fulfill()\` instead. Mode removes unused metadata, not business payload.

## What full retains that minimal discards

Full mode matters when the HAR has a second job beyond Playwright routing. A performance engineer might import it into tooling to inspect wait time, transfer size, connection reuse, redirects, or page grouping. A support team might need the closest available record of an incident. Minimal mode cannot reconstruct details it never stored.

\`\`\`typescript
import { test } from '@playwright/test';

test('capture checkout network evidence', async ({ browser }) => {
  const context = await browser.newContext();
  await context.routeFromHAR('./artifacts/checkout.har', {
    update: true,
    updateMode: 'full',
    updateContent: 'attach',
  });

  const page = await context.newPage();
  await page.goto('https://shop.example.test/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.waitForURL('**/confirmation');

  await context.close();
});
\`\`\`

With \`attach\`, resource bodies are separate entries when the target is a ZIP archive, or separate files beside a plain HAR. This can keep the JSON readable and make binary resources manageable. With \`embed\`, content is stored in the HAR. Neither choice changes whether timing and security metadata are full or minimal.

Full mode is still not a packet capture. It records at the browser's HTTP abstraction, not raw TCP frames, DNS packets, or every implementation detail of a service worker. Playwright also notes that \`routeFromHAR\` does not serve requests intercepted by a service worker. Set \`serviceWorkers: 'block'\` when service-worker interception would bypass your replay routes.

## A decision matrix based on the artifact's consumer

Start with who will read the file after recording. If only Playwright will use it, minimal normally wins. If Chrome DevTools, an analyzer, or a human incident reviewer needs a conventional waterfall, use full. Do not select full merely because it sounds safer.

| Scenario | Recommended mode | Reason |
|---|---|---|
| Committed API replay for a component test | \`minimal\` | Removes metadata that cannot influence routing |
| Temporary network capture attached to a failed run | \`full\` | Diagnostic fields have value outside replay |
| Golden fixture for an OAuth provider response | \`minimal\`, carefully redacted | Replay fidelity matters, cookies and security detail usually do not |
| Frontend performance investigation | \`full\` | Timing, size, page, and connection facts are the subject |
| Reproducing one JSON endpoint offline | \`minimal\` with a URL filter | A narrow fixture is easier to understand and refresh |
| Evidence exchanged with a non-Playwright tool | \`full\` | External HAR consumers commonly expect richer fields |

There is no rule that all HARs in a project use the same mode. Replay fixtures under \`tests/har\` can be minimal, while short-lived diagnostic artifacts under a CI artifact directory can be full. Naming and documentation should reveal that distinction.

## How matching works, and why mode rarely fixes mismatches

Teams sometimes switch to full after a HAR miss, assuming more metadata improves matching. It generally does not. Playwright matches a request against recorded entries using URL and method, and for POST requests it considers the body. Multiple matching entries can be disambiguated by headers. Minimal retains what routing needs.

A miss more often comes from a changing query parameter, non-deterministic POST body, an unrecorded redirect, or a service worker. Inspect the outgoing request and recorded entries. Restrict or normalize dynamic inputs before recording. If a timestamp or nonce is part of the application contract, a hand-written route may be more maintainable than HAR replay.

Use \`notFound: 'abort'\` to make unrecorded traffic fail closed. \`fallback\` sends unmatched requests to the network, which is useful during staged adoption but can make an allegedly isolated test depend on production-like services.

\`\`\`typescript
test.beforeEach(async ({ context }) => {
  await context.routeFromHAR('./tests/har/account.zip', {
    url: '**/api/account/**',
    notFound: 'abort',
    update: false,
  });
});

test('renders an account from recorded traffic', async ({ page }) => {
  await page.goto('https://app.example.test/account');
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
});
\`\`\`

Notice that replay code does not specify \`updateMode\`. The mode controls what gets written while updating; it is irrelevant when \`update\` is false. The recorded content already determines what replay has available.

## Updating without blessing accidental changes

A safe refresh has three phases: record against a controlled environment, inspect semantic changes, and replay with network fallback disabled. Seed accounts and deterministic clocks reduce noise. If upstream data changes on every call, post-process only fields that are truly non-contractual or replace the HAR with an explicit route handler.

Close the context in a \`finally\` block in a production recording utility. If navigation or an assertion throws before close, the HAR may not be written. A standalone script can also launch a context with \`recordHar\` options, but \`routeFromHAR({ update: true })\` is convenient when refreshing the same asset used for replay.

Do not run Prettier over HAR JSON blindly. HAR content may be huge, and body text can be encoded. Use a HAR-aware scrubber with tests. Search for authorization headers, session cookies, email addresses, tokens in query strings, and personal response fields before committing either mode.

## Minimal versus full in code review

Minimal diffs are usually shorter, but reviewers still need a strategy. JSON line formatting can turn a small body change into noisy diffs. ZIP HARs are not meaningfully reviewable in a normal pull request. If auditability is the priority, an embedded plain HAR may be preferable despite its size. If binary payloads dominate, attached ZIP content may be operationally better.

For each fixture, store a short adjacent README or encode context in the recording script: source environment, account seed, URL filter, update command, expected redactions, and owner. The mode alone cannot make an unrepeatable capture maintainable.

Avoid editing generated request fields by hand unless the team understands Playwright matching. A harmless-looking method, header, or body modification may make the entry unreachable. Re-recording is generally safer. When only a response variant changes, an explicit \`page.route()\` handler can communicate intent more clearly than a manually altered HAR.

## Alternatives to HAR replay

HAR is one option among several network-control techniques. Pick it for realistic collections of exchanges that are tedious to encode by hand. Pick a programmable mock when requests need validation, state transitions, or conditional faults.

| Alternative | Strength compared with HAR | Limitation compared with HAR |
|---|---|---|
| \`page.route()\` and \`route.fulfill()\` | Precise logic, assertions, and small textual fixtures | More code for many endpoints and payloads |
| Mock Service Worker | Shared browser and Node request handlers | Service-worker routing interacts differently with Playwright HAR interception |
| WireMock | Stateful server-side stubs and rich request matching | Extra process and configuration to operate |
| Real sandbox service | Highest provider realism | Slower, mutable, rate-limited, and network-dependent |
| API contract fixture | Focused schema-level validation | Does not reproduce browser request sequencing |

The [Playwright network interception guide](/blog/playwright-network-mocking-route-handler-guide) covers programmable routing decisions. Project-wide controls such as service-worker policy, base URL, and timeouts belong in the [Playwright configuration reference](/blog/playwright-test-config-options-complete-reference).

## Operational rules for a HAR library

Separate replay assets from diagnostic captures. Default committed replay assets to minimal unless a documented consumer needs full. Filter recording to owned origins and endpoints. Fail closed during replay. Pin stable test data. Redact both headers and bodies. Refresh intentionally, and require the refreshed fixture to pass once with update disabled.

Track fixture age, but do not refresh solely because a calendar says so. A HAR should change when the provider contract or scenario changes. Automatic periodic refresh can conceal drift. Conversely, never let a years-old replay become the only integration evidence. Run a smaller real-service contract suite on a suitable cadence.

Finally, remember that a replay is a statement about a captured conversation. It is not proof that the live service still behaves that way. Minimal makes that statement lean; full makes the historical record richer. Neither removes the need to decide what boundary the test owns.

## Recording through \`recordHar\` versus updating a route

\`browser.newContext({ recordHar })\` records traffic for a context without first installing replay routes. Its options include path, URL filtering, content mode, and recording mode. This is a natural choice for an initial capture. \`routeFromHAR({ update: true })\` is convenient for refreshing an existing fixture through the same code path that later replays it.

The two workflows should not be casually combined in one context. One records broadly while the other installs a route with update semantics; overlapping ownership makes it unclear which capture produced the file. Create one documented recorder utility and test it against a small endpoint.

\`\`\`typescript
const context = await browser.newContext({
  recordHar: {
    path: './tests/har/profile.har',
    urlFilter: '**/api/profile/**',
    mode: 'minimal',
    content: 'embed',
  },
  serviceWorkers: 'block',
});

try {
  const page = await context.newPage();
  await page.goto('https://app.example.test/profile');
  await page.getByRole('button', { name: 'Refresh profile' }).click();
  await page.getByText('Profile updated').waitFor();
} finally {
  await context.close();
}
\`\`\`

The \`finally\` protects the flush. The UI wait also ensures the exchange of interest finished before closure. Closing immediately after a click can record an aborted request rather than the desired response.

## Headers, cookies, and secrets need their own policy

Minimal mode omits cookie structures and other unused metadata, but it is not a sanitization feature. Authorization headers, query tokens, request bodies, and response bodies needed for replay can remain. Full mode widens the inspection surface because richer cookie and security sections are present.

Record with purpose-built accounts containing synthetic data. Prefer short-lived credentials and revoke them after capture. Run an automated secret scanner, then manually inspect endpoints that carry personal or payment data. Redacting a bearer token is safe if it is not required for request matching. Redacting a request body field may change the POST match and make replay fail.

If the application generates a different authorization header every run, Playwright matching may still find the entry using stronger matches, but relying on volatile headers is risky. Mock authentication upstream, record after login, or use a stable test credential. Do not normalize all headers blindly because content negotiation or tenant headers may select the response.

## Version compatibility and reproducible refreshes

HAR is standardized as a format, but Playwright's routing behavior and recorded details belong to the installed Playwright version. Pin the package and browser binaries in the recording environment. A fixture refreshed on a developer's newer version can create a large metadata diff or behave differently in older CI.

Store the recorder version and target environment beside the asset. Run a replay check immediately after recording with \`update: false\` and \`notFound: 'abort'\`. That catches a fixture that looks valid but does not match the application request.

For full diagnostic HARs, avoid committing them by default. Upload them as access-controlled CI artifacts with an appropriate retention period. They are evidence tied to one run, not reusable test inputs. For minimal fixtures, code review should ask whether changed response data reflects an intentional contract change and whether the real integration has separate coverage.

## Frequently Asked Questions

### Does \`minimal\` omit response bodies?

No. It retains content required to fulfill recorded responses. Large bodies can therefore still make a minimal HAR large. Use URL filtering or a more focused mock when payload size is the problem.

### Is \`updateMode: 'full'\` required for accurate HAR replay?

No. Minimal is specifically designed to retain the information Playwright needs for routing and is the documented default. Full adds metadata useful to other HAR consumers.

### When is the updated HAR actually saved?

Playwright writes it when the browser context closes. Ensure cleanup closes the context even when the recording scenario fails.

### How is \`updateContent\` different from \`updateMode\`?

\`updateMode\` chooses minimal or full metadata. \`updateContent\` chooses whether resource content is embedded or attached separately. They are independent options.

### Can a full HAR replay requests handled by a service worker?

No. Recording more fields does not change the routing limitation. Playwright advises blocking service workers when their interception would prevent HAR serving.
`,
};
