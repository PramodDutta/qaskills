import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Use Playwright bypassCSP to Test Third-Party Widgets',
  description:
    'Use Playwright bypassCSP safely to test third-party widgets, isolate injection behavior, and distinguish CSP blocking from genuine integration failures.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Use Playwright bypassCSP to Test Third-Party Widgets

A support-chat bootstrapper works on the vendor's demo page but never creates its iframe in your staging application. DevTools reports that Content Security Policy refused the injected script. You need to determine whether the widget itself is broken, whether your policy is incomplete, or whether the test harness is introducing code that production would never execute.

Playwright's \`bypassCSP\` browser-context option is useful for that isolation experiment. It tells the browser context to bypass page Content Security Policy enforcement. It does not repair a policy, approve the vendor, modify response headers, or prove that production users can load the integration. Used deliberately, it separates “the widget can function” from “the deployed security policy permits it to function.”

The strongest test design keeps those claims separate. One project runs with real CSP enforcement and verifies production compatibility. A diagnostic project runs with CSP bypassed and exercises the widget's behavior. The difference between their results is evidence about the policy boundary.

## Build two contexts with different security claims

\`bypassCSP\` is configured when a browser context is created. In Playwright Test, set it under \`use\` for a project or test configuration. A project split makes the intent visible and avoids toggling security behavior unpredictably within a suite.

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/widgets',
  projects: [
    {
      name: 'chromium-csp-enforced',
      use: {
        ...devices['Desktop Chrome'],
        bypassCSP: false,
      },
    },
    {
      name: 'chromium-csp-bypassed',
      use: {
        ...devices['Desktop Chrome'],
        bypassCSP: true,
      },
    },
  ],
});
\`\`\`

The enforced project represents the user-facing security posture. The bypassed project is a diagnostic lens. Giving them explicit names matters because screenshots, traces, and CI reports otherwise make a bypassed pass look indistinguishable from a production-compatible pass.

For direct library usage, pass the option to \`browser.newContext({ bypassCSP: true })\`. A context is the right isolation boundary because CSP behavior belongs to browsing state and page execution, not to an individual locator action.

| Result with CSP | Result with bypass | Most likely interpretation |
|---|---|---|
| Widget works | Widget works | Policy permits the tested path |
| Widget fails | Widget works | CSP is implicated, inspect violated directive and resource URL |
| Widget fails | Widget fails | Widget, network, consent, configuration, or test logic is still broken |
| Widget works | Widget fails | Test contamination or project-specific setup differs |

This matrix is a diagnosis aid, not a mathematical proof. The two projects must otherwise use equivalent data, routes, browser version, consent state, and network conditions.

## Inject the real loader, then observe its boundary

Third-party widgets arrive through several mechanisms: a static script tag in the application shell, a tag manager, a consent manager callback, or test-only injection. Match the production mechanism whenever possible. If the purpose is specifically to test dynamic integration, inject the actual vendor loader URL with \`page.addScriptTag({ url })\`, not a handwritten imitation of its global object.

The following example uses a deliberately local fixture so it is runnable without depending on a commercial vendor. The fixture page serves a strict CSP header that blocks scripts from a second local origin. The test starts both servers, injects the external widget loader, and confirms the behavioral difference between normal and bypassed contexts.

\`\`\`typescript
// tests/widgets/csp-widget.spec.ts
import { test, expect } from '@playwright/test';
import http from 'node:http';

const listen = (server: http.Server, port: number) =>
  new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));

const close = (server: http.Server) =>
  new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

const app = http.createServer((_request, response) => {
  response.writeHead(200, {
    'content-type': 'text/html',
    'content-security-policy': "default-src 'self'; script-src 'self'; frame-src 'self'",
  });
  response.end('<main><h1>Checkout</h1><div id="widget-slot"></div></main>');
});

const vendor = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/javascript' });
  response.end(
    "document.querySelector('#widget-slot').textContent = 'Support is ready';",
  );
});

test.beforeAll(async () => {
  await listen(app, 4173);
  await listen(vendor, 4174);
});

test.afterAll(async () => {
  await close(app);
  await close(vendor);
});

test('external widget follows the project CSP setting', async ({ page }, testInfo) => {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') violations.push(message.text());
  });

  await page.goto('http://127.0.0.1:4173');

  let injectionFailed = false;
  try {
    await page.addScriptTag({ url: 'http://127.0.0.1:4174/widget.js' });
  } catch {
    injectionFailed = true;
  }

  const slot = page.locator('#widget-slot');
  if (testInfo.project.name === 'chromium-csp-bypassed') {
    await expect(slot).toHaveText('Support is ready');
    expect(injectionFailed).toBe(false);
  } else {
    await expect(slot).toBeEmpty();
    expect(injectionFailed || violations.some((line) => line.includes('Content Security Policy')))
      .toBe(true);
  }
});
\`\`\`

The assertion accommodates a browser-version detail: a blocked external script may reject the injection operation, emit a console error, or both. The user-visible outcome remains the primary assertion. Console text is supporting evidence and can vary, so avoid asserting an entire browser message verbatim.

## Read the directive, not just the red console line

CSP is a collection of resource-specific rules. A widget may load its bootstrap JavaScript successfully and then fail when it creates an iframe, opens a WebSocket, fetches configuration, loads a font, or applies inline styles. Bypassing CSP makes all those restrictions disappear, which is why a green bypassed test does not identify the missing directive by itself.

Map the blocked operation to its governing directive. Browsers can fall back to \`default-src\` when a more specific directive is absent. Widget documentation often lists domains, but the application team must decide whether each origin and scheme is acceptable.

| Widget operation | Common governing directive | Evidence to inspect |
|---|---|---|
| Download bootstrap JavaScript | \`script-src\` or \`script-src-elem\` | Script request and CSP console report |
| Render a hosted iframe | \`frame-src\` | Missing frame plus blocked frame URL |
| Call REST or GraphQL endpoint | \`connect-src\` | Failed fetch/XHR request |
| Open live-chat socket | \`connect-src\` | WebSocket handshake absent or blocked |
| Load vendor images | \`img-src\` | Broken avatar, icon, or tracking pixel |
| Apply hosted stylesheet | \`style-src\` or \`style-src-elem\` | Stylesheet rejected, unstyled controls |
| Submit a form to vendor | \`form-action\` | Navigation or submission refusal |

Do not expand \`default-src\` to accommodate one widget if a narrower directive describes the need. A policy change is a security design decision, not merely a way to make an end-to-end test pass.

## Test the widget's meaningful behavior after injection

Once bypass mode proves the loader can execute, assertions should move beyond “an iframe exists.” The integration's contract is usually behavioral: opening a launcher exposes a panel, a prefilled identity reaches the widget, an error boundary preserves the host page, or a consent choice prevents loading.

Cross-origin iframes require Playwright's frame-aware locators. If the widget iframe has a stable URL or accessible title, \`page.frameLocator()\` or \`page.locator('iframe').contentFrame()\` can target its contents. Prefer user-visible roles and labels inside the frame. Avoid reaching for private globals supplied by the vendor unless their public SDK documents them.

Network assertions should also respect ownership. It is reasonable to verify that the host initiates one documented bootstrap request after consent. It is brittle to freeze every analytics call a vendor may change independently. Route interception can validate your application's request or provide deterministic responses, but interception itself can mask CSP behavior if it changes origins or fulfills resources locally.

For widgets that inject shadow DOM rather than frames, Playwright locators pierce open shadow roots by default for normal CSS matching. Closed shadow roots remain intentionally inaccessible. In that case, assert public behavior at the host boundary and use the vendor's supported test mode rather than attempting to break encapsulation.

## Keep bypassCSP out of the production-compatibility verdict

The most dangerous failure is semantic: the suite passes, but only because every context bypasses the policy that production enforces. Prevent that with naming, tagging, and CI separation.

The enforced project should be required for release. Its test can assert the widget becomes usable under the deployed CSP. The bypass project can run on demand when diagnosing a regression, or remain in CI with a report label that clearly says diagnostic. Never combine their results into a single undifferentiated success metric.

Configuration inheritance deserves scrutiny. A top-level \`use: { bypassCSP: true }\` flows into every project unless overridden. That is convenient for a short experiment and risky as a committed default. Place the option only on the diagnostic project. The [Playwright configuration options reference](/blog/playwright-test-config-options-complete-reference) is useful when checking how top-level and project-level \`use\` values merge.

Context reuse can also contaminate conclusions. Playwright Test normally provides isolated contexts, but manually created contexts must be closed. Do not create one bypassed context in \`beforeAll\` and assume an enforced test using its pages is representative. Security options are fixed at context creation.

## Distinguish CSP from CORS and frame restrictions

Several browser controls produce similar symptoms but need different remedies. CSP decides which resources a document may load or execute. CORS controls whether script can read certain cross-origin responses. \`X-Frame-Options\` and CSP \`frame-ancestors\` control who may embed a document. Cookie \`SameSite\` and third-party cookie policies affect session state. Mixed-content rules block insecure resources on secure pages.

\`bypassCSP\` addresses CSP enforcement only. It does not disable CORS, make third-party cookies available, override frame-ancestor protection on a vendor page, or upgrade an HTTP resource. If the bypassed project still fails, inspect the network request, response headers, cookie warnings, and frame console separately.

| Browser control | Typical symptom | Does \`bypassCSP\` remove it? |
|---|---|---|
| Content Security Policy | Resource refused by a named CSP directive | Yes, within the configured context |
| CORS | Request occurs but response is unreadable to page script | No |
| \`frame-ancestors\` or \`X-Frame-Options\` | Vendor document refuses embedding | Do not rely on bypass for a production solution |
| Mixed content | HTTPS page rejects HTTP resource | No |
| Third-party cookie policy | Widget loads but loses identity or session | No |
| Consent manager rule | Loader is never requested before consent | No |

This classification prevents a common wasteful loop: adding more CSP origins when the blocked behavior is actually a cookie or embedding restriction.

## Use report-only policy to gather safer evidence

If the application is still designing its policy, \`Content-Security-Policy-Report-Only\` can report violations without enforcing them. That server-side choice is different from Playwright bypass. Report-only behavior exercises the browser's policy parsing and produces violation signals while allowing resources to load.

A practical rollout has an enforced baseline policy, a stricter report-only candidate, and tests that exercise every supported widget path. Collect reports at a controlled endpoint, remove noisy or irrelevant sources, and review required origins with the security owner. Playwright can assert visible widget behavior while server logs confirm whether the candidate policy would have blocked it.

Do not assert that zero reports exist if browser extensions, development tooling, or unrelated third-party scripts can contribute noise. Filter by document URL, violated directive, blocked origin, and a test correlation identifier when the reporting pipeline supports it.

## A review checklist for third-party test projects

Before accepting a bypassed test, state the question it answers. “Can the vendor loader initialize with this account and fixture?” is valid. “Does our production CSP support the vendor?” is not answered by bypass mode.

Record the vendor origins actually observed, not only those copied from setup documentation. Check subresources after interaction because chat, payment, map, and analytics widgets often lazy-load endpoints. Exercise denied consent, revoked consent, offline bootstrap, slow response, and vendor error paths. The host application must remain operable when the third party is unavailable.

Use traces judiciously because third-party frames can contain personal or account data. Redact secrets from test accounts, avoid real customer conversations, and apply the same retention controls used for screenshots and videos. If you need stronger context isolation or direct context creation, the [Playwright BrowserContext guide](/blog/playwright-browser-context-guide-2026) covers lifecycle and per-context options.

Finally, keep a minimal local fixture like the example above. Vendor sandboxes sometimes change or become unavailable. A local cross-origin server proves that the browser and configuration still differentiate CSP enforcement, while a smaller number of live-vendor tests validate the current external integration. The two layers fail for different reasons and are easier to triage than one oversized end-to-end case.

## Diagnose a real widget with a controlled experiment

When a live integration fails, begin with the enforced project and save a trace plus the browser console and relevant network failures. Identify the first blocked resource, not the last cascade error. A bootstrap script rejected by script-src can prevent every later API call, while a blocked avatar image may be cosmetically important but unrelated to initialization.

Run the same test in the bypassed project without changing credentials, consent state, routes, or mocks. If the widget now becomes usable, reproduce the failure in the enforced project once more to rule out a transient vendor outage. Compare request lists by origin and resource type. The resource that appears only under bypass is a strong candidate, although lazy behavior means user interaction must be identical.

Next, create the smallest policy candidate that permits the documented resource. Test it in an isolated staging response header rather than weakening the suite globally. A script origin does not automatically justify its wildcard subdomains, unsafe inline execution, data URLs, or unrelated connection endpoints. Ask the security reviewer to evaluate the vendor's redirect behavior and whether a compromised vendor origin would gain execution in the host page.

Widget loaders sometimes create an inline script or style after the external bootstrap loads. Allowing the vendor's script origin will not necessarily permit that inline content. Prefer a vendor integration that supports nonces or hashes if the host policy uses them. Do not add unsafe-inline based only on a green experiment, because it changes the protection offered to all matching content on the page.

Validate route transitions too. A single-page application can receive different CSP headers on a hard navigation than on client-side routing, and an embedded checkout may run on another origin with its own policy. Start the test from the same entry path users take, then navigate through the actual interaction. If the widget persists across routes, verify it does not inject duplicate launchers or retain an authenticated frame after logout.

After the policy fix, the enforced project should pass and the bypass project should still pass. The meaningful change is that their outcomes converge for the supported flow. Keep one negative fixture whose external origin remains forbidden. That guards against a future configuration accidentally disabling CSP enforcement in the enforced project or removing the header from the test server.

Document the result as a list of required capabilities rather than a copied console transcript: bootstrap script origin, frame origin, connection origins, image sources, and any nonce behavior. Vendor endpoints evolve, so assign ownership for reviewing changes. A test should fail visibly when a new origin appears, but the resolution must still be an explicit security decision rather than an automatic allowlist update.

## Frequently Asked Questions

### Does bypassCSP change the CSP response header?

No. The server can still send the header, and network inspection can still show it. The configured browser context bypasses enforcement. Other clients and normal contexts remain subject to the policy.

### Can I enable bypassCSP after page.goto?

Treat it as a browser-context creation option. In Playwright Test, configure it under the project's \`use\` settings before the context and page fixtures are created. Create a new context when you need different behavior.

### Why does the widget still fail when bypassCSP is true?

The cause may be CORS, frame embedding protection, mixed content, cookies, consent state, bad vendor credentials, network failure, or application logic. Inspect the failed operation instead of assuming every browser security error is CSP.

### Should our required CI suite use bypassCSP?

Not for a test claiming production compatibility. Keep at least one enforced project that uses the deployed security posture. A bypassed project is appropriate for diagnosis or for testing behavior deliberately injected by a trusted harness.

### How can I test a vendor without making CI depend on its uptime?

Maintain a local cross-origin fixture for policy mechanics and host-side failure handling, then keep a focused live sandbox check for the real vendor contract. This preserves deterministic coverage without pretending a mock proves the external service works.
`,
};
