import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Network HAR Replay Testing for Fast, Deterministic Tests',
  description: 'Playwright network HAR replay testing makes browser tests faster and deterministic by recording API traffic, replaying it safely, and diagnosing misses.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Network HAR Replay Testing for Fast, Deterministic Tests

Playwright network HAR replay testing records HTTP exchanges in a HAR file and later serves matching responses to a browser test without calling the original backend. In Playwright, a page or browser context can install a HAR router with \`routeFromHAR\`. The test still drives a real browser and real frontend code, but selected network responses come from the recording. This makes the workflow useful for deterministic UI checks, hard-to-create data states, third-party dependency isolation, and faster diagnosis.

HAR replay is not a full backend emulator. Matching depends on the request URL and method, and POST requests also use the body. Responses are static snapshots unless another route handler supplies dynamic behavior. A good suite therefore uses HAR replay deliberately: record a narrow contract, remove sensitive material, pin the fixture to a scenario, and keep a smaller set of live integration tests to catch drift.

This guide shows how to capture, sanitize, replay, update, and debug HAR fixtures in TypeScript. It also explains when a JSON stub is a better fit, how service workers can interfere with interception, and how to review recorded traffic safely.

## Choose HAR Replay for the Right Test Boundary

A browser test can fail because the frontend is wrong, the backend is unavailable, test data changed, a third party throttled the environment, or a shared account was modified. HAR replay narrows that boundary. The browser, DOM, JavaScript bundle, accessibility tree, and client-side networking stay real. The recorded HTTP side becomes controlled.

That boundary is especially valuable when testing:

- Rendering and interaction for a known API response.
- Empty, error, pagination, or feature-flag states that are difficult to create reliably.
- Frontend behavior while a backend environment is offline.
- A third-party response whose sandbox is slow or rate-limited.
- A regression tied to a specific payload shape.

It is a poor fit when the purpose is to validate current server logic, authentication exchange, cache behavior across real systems, streaming semantics, or a consumer-provider contract. A replay can prove that the UI still handles yesterday’s bytes. It cannot prove that today’s provider returns them.

| Test goal | HAR replay fit | Better complement or alternative |
| --- | --- | --- |
| Verify UI for stable recorded responses | Strong | Component tests for faster local feedback |
| Exercise a dynamic state machine | Limited | Purpose-built fake server |
| Validate current API deployment | Wrong boundary | Live API or end-to-end test |
| Reproduce a production payload safely | Strong after sanitization | Contract fixture plus targeted assertions |
| Test WebSocket or streaming behavior | Weak | Protocol-aware test server |
| Remove a flaky third-party dependency | Strong | Small live canary for provider drift |

State the boundary in the test name or fixture documentation. "Order history renders from recorded API scenario" is honest. "Order history works" claims more than a replay proves.

## Understand What Playwright Matches

Playwright uses HAR entries to fulfill requests. A request is matched using the URL and HTTP method. For POST, the body participates in matching. When multiple entries match, Playwright selects the entry with the most matching headers. Redirects stored in the HAR can also be followed during replay.

This has practical consequences. A timestamp or random identifier in a query string creates a new URL and can cause a miss. A GraphQL endpoint may use one URL and method for many operations, so request bodies distinguish cases. Changing an authorization header usually does not require rewriting every entry, though headers may influence selection when several candidates otherwise match.

The \`url\` option limits which requests are served from the HAR. Use it whenever the recording contains more traffic than the test needs. Unmatched behavior is controlled by \`notFound\`: \`abort\` stops unmatched requests, while \`fallback\` lets later handlers or the network continue.

| Option | Purpose | Testing consequence |
| --- | --- | --- |
| \`url\` | Select requests eligible for HAR routing | Keeps documents, analytics, or unrelated APIs outside the fixture |
| \`notFound: 'abort'\` | Fail unmatched eligible requests | Reveals fixture drift immediately |
| \`notFound: 'fallback'\` | Continue routing or network for a miss | Supports hybrid tests but can hide unexpected live calls |
| \`update: true\` | Record actual traffic into the HAR | Useful for intentional refresh, risky in normal CI |
| \`updateContent\` | Choose embedded or attached resource storage | Affects reviewability and companion files |
| \`updateMode\` | Choose full or minimal recording detail during update | Minimal keeps replay-focused data |

Route order matters in hybrid setups. Specific request handlers should be installed with an understood precedence, and the suite should assert which requests were allowed to escape. Do not assume that a fallback is harmless simply because the page rendered.

## Record a Focused HAR With Browser Context Options

The most reproducible capture lives in code. Create a dedicated browser context with \`recordHar\`, navigate through one scenario, then close the context. The HAR is written when the context closes, so omitting \`context.close()\` can leave an incomplete or missing fixture.

\`\`\`ts
import { chromium } from '@playwright/test';

async function recordOrdersScenario() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordHar: {
      path: 'tests/hars/orders-with-two-items.har.zip',
      url: 'https://api.example.test/orders/**',
      mode: 'minimal',
      content: 'attach',
    },
  });

  const page = await context.newPage();
  await page.goto('https://app.example.test/orders');
  await page.getByRole('button', { name: 'Load history' }).click();
  await page.getByRole('heading', { name: 'Order history' }).waitFor();

  await context.close();
  await browser.close();
}

recordOrdersScenario();
\`\`\`

The URL glob should select only the API family required by this fixture. Review the resulting archive before committing it. If the app loads data only after a gesture, perform that gesture during capture. If pagination is part of the intended scenario, visit every page that replay will need.

Use a fresh, synthetic account with deliberate data. Capturing a random staging session produces an opaque fixture whose expected state is hard to explain. Seed "two orders, one refunded" first, record it, and name the file after that scenario.

The choice between \`minimal\` and \`full\` affects metadata, not response truth. Minimal capture contains information needed for routing. Full capture includes broader HAR information useful when inspecting network behavior outside replay. For ordinary fixtures, minimal is easier to review.

## Replay at Context Scope When the App Opens Pages

Install the HAR before navigating. Page-scoped routing works for one page. Context-scoped routing is safer when the application opens popups or creates other pages that need the same network behavior.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('renders a refunded order from the recorded scenario', async ({ context, page }) => {
  await context.routeFromHAR('tests/hars/orders-with-two-items.har.zip', {
    url: 'https://api.example.test/orders/**',
    notFound: 'abort',
  });

  await page.goto('https://app.example.test/orders');
  await page.getByRole('button', { name: 'Load history' }).click();

  await expect(page.getByRole('row', { name: /Order 1048/ })).toContainText('Refunded');
  await expect(page.getByRole('row', { name: /Order 1049/ })).toContainText('Delivered');
});
\`\`\`

Prefer web-first assertions over sleeps. The response may be immediate during replay, but the frontend still schedules state updates and renders asynchronously. Playwright locators retry within their timeout and express the visible contract. For selector design beyond network concerns, see the [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026).

Use \`notFound: 'abort'\` for a fully isolated replay. A newly introduced request then fails rather than silently reaching the network. This is the strongest default for deterministic CI. Switch to fallback only when the hybrid boundary is documented and monitored.

## Design One Fixture Around One Named Scenario

A giant HAR captured during a long exploratory session is convenient once and expensive forever. It contains unrelated requests, repeated resources, changing tokens, and ambiguous data. Reviewers cannot tell which entries matter. Matching can select a surprising duplicate.

Prefer one fixture per business state or narrow workflow:

| Fixture | Intended state | Core assertions |
| --- | --- | --- |
| \`orders-empty.har.zip\` | Account has no orders | Empty-state copy and new-order action |
| \`orders-refund-pending.har.zip\` | Refund is awaiting provider | Status, amount, and support path |
| \`orders-api-error.har.zip\` | History endpoint returns an error | Error message and retry control |
| \`orders-next-page.har.zip\` | First page includes a continuation | Page transition and deduplication |

Add a neighboring Markdown manifest if the archive is not self-explanatory. Record the synthetic account, seed procedure, capture date, selected URL scope, endpoints included, fields removed, and UI assertions that depend on it. This makes fixture updates reviewable.

Do not reuse the same HAR across unrelated tests merely to reduce file count. Shared fixtures couple tests to entries they do not own. Small archives make missing requests and data drift clearer.

## Prevent Secrets and Personal Data From Entering Git

HAR files may contain request and response headers, cookies, tokens, query parameters, submitted bodies, customer records, and internal hostnames. Treat a raw capture as sensitive until reviewed. Recording from a production session into a repository is rarely acceptable.

Use synthetic data and a restricted environment first. Limit the URL filter. Prefer test credentials with minimal privilege. After capture, inspect every entry and attached resource. Rotate a credential immediately if it was recorded accidentally, because deleting it from the latest commit does not erase exposure from history.

Sanitization must preserve matching. Replacing a POST body value with a placeholder changes the request body required during replay. The test must send that same sanitized value, or the fixture needs a more suitable boundary.

The following script performs a narrow JSON HAR transformation. It is intentionally explicit rather than a universal sanitizer.

\`\`\`ts
import { readFile, writeFile } from 'node:fs/promises';

type Header = { name: string; value: string };
type Har = {
  log: {
    entries: Array<{
      request: { headers: Header[] };
      response: { headers: Header[]; content: { text?: string } };
    }>;
  };
};

const secretHeaders = new Set(['authorization', 'cookie', 'set-cookie']);
const path = 'tests/hars/orders.json';
const har = JSON.parse(await readFile(path, 'utf8')) as Har;

for (const entry of har.log.entries) {
  entry.request.headers = entry.request.headers.filter(
    (header) => !secretHeaders.has(header.name.toLowerCase()),
  );
  entry.response.headers = entry.response.headers.filter(
    (header) => !secretHeaders.has(header.name.toLowerCase()),
  );
  if (entry.response.content.text) {
    entry.response.content.text = entry.response.content.text.replaceAll(
      'customer@example.test',
      'fixture-user@example.test',
    );
  }
}

await writeFile(path, JSON.stringify(har, null, 2));
\`\`\`

For ZIP archives with attached bodies, use a reviewed archive-processing step or capture from safe data so broad rewriting is unnecessary. Scan both the HAR document and attachments. Generic secret scanners help, but they cannot decide whether realistic personal data is allowed.

## Make Dynamic Inputs Stable Before Matching

Time, randomness, and per-run identifiers are the most common causes of HAR misses. Stabilize them at the application boundary when possible. Inject a known query value through the UI or test setup. Freeze application time only if the app already supports a safe clock seam. Avoid editing the product solely to satisfy a brittle fixture.

For dynamic query parameters that do not affect the response scenario, intercept and normalize the request before it reaches HAR routing, or scope the HAR to a more stable endpoint. Be cautious: removing a parameter that truly changes data makes the replay dishonest.

GraphQL needs special care. Many operations share one POST URL. Because POST data participates in matching, a changing operation payload or variable causes a miss. Capture canonical variables and make the test use them. If the workflow needs arbitrary variables and calculated responses, use a route handler or fake GraphQL server instead of accumulating near-duplicate HAR entries.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('replays a canonical product search', async ({ page }) => {
  await page.routeFromHAR('tests/hars/product-search.har', {
    url: 'https://api.example.test/graphql',
    notFound: 'abort',
  });

  await page.goto('https://app.example.test/search');
  await page.getByLabel('Search products').fill('travel mug');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByRole('list', { name: 'Search results' })).toContainText(
    'Insulated Travel Mug',
  );
});
\`\`\`

This test works only if its GraphQL request matches the recorded request body. If the client adds an unstable tracing field, fix or suppress that instability in the test environment, or choose explicit request mocking for that operation.

## Combine HAR Replay With Explicit Route Logic

HAR is strongest for recorded breadth. Code-based routes are strongest for dynamic behavior and visible intent. Combining them can make a small test matrix without duplicating a whole archive.

For example, use a HAR for catalog and account setup, then fulfill one error response in code. Install handlers in an order you have verified with your Playwright setup, and keep the explicit route narrow.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('offers retry when recommendations fail', async ({ context, page }) => {
  await context.routeFromHAR('tests/hars/product-page.har.zip', {
    url: 'https://api.example.test/**',
    notFound: 'abort',
  });

  await context.route('https://api.example.test/recommendations', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'temporarily unavailable' }),
    });
  });

  await page.goto('https://app.example.test/products/mug');
  await expect(page.getByRole('button', { name: 'Retry recommendations' })).toBeVisible();
});
\`\`\`

If route precedence becomes confusing, simplify the design. A test with several overlapping globs, fallback calls, and mutable counters is effectively a custom server hidden inside browser hooks. Move that behavior into a dedicated fake with explicit endpoints and tests.

## Update Fixtures as an Intentional Maintenance Operation

Playwright can update a HAR by setting \`update: true\` on \`routeFromHAR\`. When update is enabled, traffic is recorded and written when the browser context closes. This is convenient, but it should not run implicitly in normal CI because an outage, login redirect, or bad environment could overwrite expected evidence.

Create a separate update test or local maintenance script, point it at an approved environment, and require a diff review. Keep update mode and content storage explicit.

\`\`\`ts
import { test } from '@playwright/test';

test('refreshes the order history HAR intentionally', async ({ context, page }) => {
  test.skip(process.env.UPDATE_HAR !== '1', 'manual fixture maintenance only');

  await context.routeFromHAR('tests/hars/orders-with-two-items.har.zip', {
    url: 'https://api.example.test/orders/**',
    update: true,
    updateMode: 'minimal',
    updateContent: 'attach',
  });

  await page.goto('https://app.example.test/orders');
  await page.getByRole('button', { name: 'Load history' }).click();
  await page.getByRole('heading', { name: 'Order history' }).waitFor();
});
\`\`\`

After refreshing, inspect status codes, redirect destinations, payload schemas, identifiers, headers, and attachment changes. Run the consuming replay tests offline or with outbound access constrained where your CI supports it. A fixture update is a test expectation change, so reviewers should understand why it changed.

Commit fixture and assertion changes together when a product contract intentionally changes. If only the fixture changes and no assertion notices, ask whether the test actually checks the changed behavior.

## Detect Contract Drift Without Turning Replay Into Integration

Static replay can remain green after the real provider changes. Address this with a layered portfolio, not by letting every replay fall through to the live network.

Maintain provider contract checks or API tests against the current environment. Validate response schemas from both the fixture and provider where appropriate. Run a small live browser path on a schedule or deployment gate. Keep replay tests in pull requests for fast, deterministic frontend feedback.

| Layer | Frequency | Failure means |
| --- | --- | --- |
| HAR-backed UI scenarios | Every pull request | Frontend no longer handles recorded contract or expected state |
| Consumer contract or schema checks | Pull request and provider change | Consumer and provider expectations diverged |
| Live API checks | Deployment or scheduled | Current environment violates API behavior |
| Small live browser journey | Deployment or scheduled | Integrated user path is broken |

The [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026) can help position these checks across unit, component, integration, and browser layers. HAR replay occupies a specific slice, it does not collapse the pyramid into one tool.

## Diagnose a HAR Miss Systematically

A realistic failure looks like this: the orders test passes locally but fails in CI with an aborted request to \`/orders?requestedAt=...\`. The HAR contains the endpoint, so the first assumption is that routing is broken. Inspection reveals that the CI request includes a current timestamp while the recording includes yesterday’s timestamp. Exact URL matching makes these different requests.

Use a temporary request listener to expose what the browser sends. Do not leave secret headers in CI logs.

\`\`\`ts
test('diagnoses replay requests', async ({ page }) => {
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname === 'api.example.test') {
      console.log(request.method(), url.pathname, url.search);
    }
  });

  await page.routeFromHAR('tests/hars/orders.har', {
    url: 'https://api.example.test/orders**',
    notFound: 'abort',
  });

  await page.goto('https://app.example.test/orders');
});
\`\`\`

Compare method, full URL, and POST body with the HAR entry. Then check routing scope and installation timing. If the request never appears, a service worker may be serving it. Playwright documentation notes that routing does not intercept requests handled by a service worker and recommends blocking service workers when interception is required. Configure the browser context accordingly for this isolated suite.

Next, verify that the context closes during update or recording. Confirm attached resources exist beside the HAR or inside its archive. Check whether a redirect or authentication response was accidentally captured. Finally, reduce the case to one request and one assertion.

Do not "fix" a miss by changing \`abort\` to \`fallback\` without understanding it. That converts a deterministic replay into an environment-dependent test and often makes CI appear healed while calling a real backend.

## What People Get Wrong About HAR-Based Tests

The biggest misconception is that recording creates a complete mock automatically. A HAR is captured traffic, not a model of all possible server behavior. It knows only the exchanges in the file.

Another mistake is recording an entire session and asserting one line of text. Large fixtures add privacy and maintenance risk while the assertion provides little detection value. Scope capture to the behavior under test and verify meaningful outcomes.

Teams also confuse reproducibility with freshness. Replay is reproducible because the response is old and controlled. Freshness requires live checks or intentional updates. Both qualities matter, but no single run provides both completely.

A fourth mistake is storing credentials because "the test environment is fake." Tokens can grant access, internal hostnames can be sensitive, and synthetic accounts can still reach shared systems. Review recordings as security-relevant artifacts.

Finally, teams sometimes snapshot volatile display text and call the replay deterministic. Frontend clocks, randomized experiments, locale, and animation can still vary even when network bytes do not. Control those inputs separately and assert user-relevant behavior.

## Establish a Maintainable Repository Workflow

Keep HAR fixtures near the tests or in a clearly owned fixture directory. Give each an owner and scenario description. Add archive sizes to code review awareness, because binary ZIP diffs are hard to inspect. A JSON HAR may be easier to review, while attached content can keep the main file smaller. Choose according to payload size and security controls.

Run replay tests in a CI job that does not depend on the captured services. If network isolation is feasible, it proves the fixture is self-contained. Keep the application host and static assets available as required, or package them through the normal frontend test environment.

Track fixture age as information, not an automatic failure. A six-month-old stable contract may be fine. A week-old rapidly changing endpoint may already be stale. Update based on provider change, scenario intent, or a scheduled review appropriate to risk.

When an AI coding agent updates a HAR-backed test, require it to state the boundary, list changed endpoints, and preserve the no-secret review. Agents are good at comparing normalized JSON, locating unasserted response fields, and drafting scenario manifests. They should not upload a raw production recording or approve a changed contract without human review.

The durable pattern is simple: narrow recording, explicit matching, strong assertions, isolated replay, and separate live coverage. That combination gives fast UI feedback without pretending the backend disappeared.

## Frequently Asked Questions

### Does Playwright HAR replay prevent every network request?

No. It handles requests that match eligible entries and the configured URL scope. With \`notFound: 'abort'\`, an unmatched routed request is aborted, which makes unexpected dependencies visible. Requests outside the scope may still use the network, and service-worker-handled traffic can bypass ordinary routing. If full isolation is the goal, narrow and audit allowed hosts, block service workers for the context where needed, and run in an environment with outbound controls. Verify observed requests rather than assuming that installing one HAR route makes the browser completely offline.

### Should HAR files be committed to the test repository?

They can be, provided the recordings use synthetic data, have been reviewed for secrets and personal information, and remain reasonably sized. Repository storage versions fixture changes with assertions, which is valuable. Binary archives are harder to inspect, so maintain a scenario manifest and use an approved inspection process. Some organizations store large or sensitive fixtures in controlled artifact storage instead. The key requirements are reproducibility, access control, reviewability, and a reliable way for CI to fetch the exact fixture version associated with the test.

### When should a route handler replace a HAR fixture?

Use a route handler when the response must depend on changing request values, test-controlled state, counters, or branching behavior. It is also clearer for a single small response that reviewers can understand inline. HAR is better when faithfully recording a realistic cluster of HTTP exchanges would take substantial manual stubbing. If a test accumulates many overlapping routes and complicated mutable state, move to a dedicated fake server. Choose the smallest mechanism that makes the intended boundary and behavior obvious to a future maintainer.

### How do I know when a recorded scenario is stale?

A fixture is stale when it no longer represents a supported provider contract or a relevant user state, not merely when it reaches a certain age. Signals include provider schema changes, assertion updates that require new fields, live contract failures, removed endpoints, and product decisions that retire the scenario. Record capture metadata and ownership, then review high-risk fixtures after relevant provider changes. Refresh intentionally from controlled data, inspect the diff, and run both replay and live contract checks. Never enable automatic fallback as a substitute for recognizing staleness.
`,
};
