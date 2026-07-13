import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Configure a Different Proxy per Playwright Project',
  description:
    'Configure a different Playwright proxy per project for regional, tenant, and network-path coverage without leaking credentials or duplicating test suites.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Configure a Different Proxy per Playwright Project

London traffic reaches the storefront directly, Frankfurt passes through a corporate gateway, and a US browser must exit from a residential test endpoint. Those are three network paths through one test suite. Playwright projects are the clean place to model them because each project can own its own \`use.proxy\` configuration while sharing specs, fixtures, and assertions.

The configuration is small; the operational details are not. Proxy credentials need safe injection, bypass rules need validation, project names must reach reports, and a failed gateway must not look like a product regression. This tutorial builds the setup from a two-project example into a maintainable regional test matrix.

## Put the proxy inside each project's use object

Playwright accepts proxy settings in browser launch options through the test runner's \`use\` configuration. At project level, this means every browser launched for that project uses its assigned proxy. The supported shape includes \`server\` and optional \`username\`, \`password\`, and \`bypass\` values.

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'chromium-direct',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium-eu-proxy',
      use: {
        ...devices['Desktop Chrome'],
        proxy: {
          server: 'http://proxy.eu.example.test:8080',
          username: process.env.EU_PROXY_USERNAME,
          password: process.env.EU_PROXY_PASSWORD,
          bypass: 'localhost,127.0.0.1',
        },
      },
    },
  ],
});
\`\`\`

Run the whole matrix with the normal test command, or select one project with \`--project=chromium-eu-proxy\`. The direct project intentionally omits \`proxy\` rather than specifying a fake direct URL.

Do not place secrets in the checked-in config. Environment variables can be undefined at runtime, so production CI should validate required values before Playwright starts. A missing password that causes an HTTP 407 halfway through the suite is much harder to diagnose than a clear configuration error.

| Proxy field | Example | Review concern |
|---|---|---|
| \`server\` | \`http://proxy.example.test:8080\` | Include scheme and port expected by the provider |
| \`username\` | CI secret or short-lived credential | Never embed it in a project name or attachment |
| \`password\` | CI secret | Prevent command echo and report serialization |
| \`bypass\` | \`localhost,127.0.0.1\` | Confirm the list matches routes that should avoid the gateway |

## Build projects from an explicit route inventory

When the number of routes grows, repeated object literals drift. One project quietly misses \`trace\`, another has the wrong locale, and a third uses a stale hostname. Generate project objects from a typed inventory while keeping the resulting Playwright configuration ordinary and inspectable.

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

type Route = {
  name: string;
  server?: string;
  bypass?: string;
  usernameEnv?: string;
  passwordEnv?: string;
};

const routes: Route[] = [
  { name: 'direct' },
  {
    name: 'eu-corporate',
    server: 'http://eu-gateway.example.test:8080',
    bypass: 'localhost,127.0.0.1,.internal.example.test',
    usernameEnv: 'EU_PROXY_USERNAME',
    passwordEnv: 'EU_PROXY_PASSWORD',
  },
  {
    name: 'us-egress',
    server: 'socks5://us-egress.example.test:1080',
    usernameEnv: 'US_PROXY_USERNAME',
    passwordEnv: 'US_PROXY_PASSWORD',
  },
];

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}

const projects = routes.map((route) => ({
  name: 'chromium-' + route.name,
  use: {
    ...devices['Desktop Chrome'],
    locale: 'en-GB',
    trace: 'retain-on-failure',
    ...(route.server
      ? {
          proxy: {
            server: route.server,
            bypass: route.bypass,
            username: required(route.usernameEnv!),
            password: required(route.passwordEnv!),
          },
        }
      : {}),
  },
}));

export default defineConfig({
  testDir: './tests',
  projects,
});
\`\`\`

This factory evaluates environment variables while loading the config. That is desirable in a CI job intended to run every route because it fails before browser startup. If developers commonly run only the direct route without proxy secrets, make validation conditional on an explicit environment switch or keep a separate CI configuration. Avoid a design where merely listing tests demands credentials nobody needs.

The \`Project\` type is optional but useful. It catches misspelled configuration keys and ensures the generated object remains compatible with Playwright.

## Prove the egress path before testing the product

A green checkout test does not prove it traversed the intended gateway. DNS split-horizon rules, transparent corporate proxies, a provider outage, or an overbroad bypass entry can silently change the route. Add a small network identity check that asks a controlled endpoint what source address or route marker it observed.

The best endpoint belongs to your organization and returns a non-sensitive identifier such as \`{ "region": "eu", "gateway": "qa-eu-1" }\`. Public “what is my IP” services add an external dependency, may rate-limit CI, and expose your infrastructure addresses. A dedicated endpoint can also validate a provider-added header at the trusted edge without returning that header to arbitrary clients.

Keep this smoke check separate from business assertions. If the gateway is misrouted, fail with “expected eu gateway, received direct” and stop that project's shard. Otherwise hundreds of downstream failures may blame localization, feature flags, or compliance behavior that never actually saw EU traffic.

| Observation | Likely network issue | First evidence to collect |
|---|---|---|
| \`407 Proxy Authentication Required\` | Missing, expired, or incorrectly encoded credentials | Response headers and credential secret version |
| \`ERR_PROXY_CONNECTION_FAILED\` | Host unreachable, port closed, or provider unavailable | TCP reachability from the same CI runner |
| Direct public address from proxied project | Bypass match or proxy ignored for that traffic | Controlled egress endpoint result |
| TLS certificate issued by corporate CA | Intentional TLS inspection or wrong network path | Certificate chain from the runner |
| Only WebSocket features fail | Gateway lacks or blocks upgrade support | Handshake status and proxy capability statement |
| Local app becomes unreachable | Local hostname was not bypassed | Effective bypass list and resolved address |

## Keep browser, API, and service traffic distinctions clear

The project proxy controls browser traffic associated with the Playwright browser context. Teams often assume every packet generated by a test follows it. That assumption becomes risky when a fixture uses Node's native \`fetch\`, a database client, or a third-party SDK. Those processes have their own networking behavior.

Playwright's \`request\` fixture is configured through test options and can use the project's proxy-related context configuration, but a separately constructed library client needs its own agent or proxy mechanism. Document which calls are part of the browser path and which are test-runner control traffic. Setup APIs that create test data often should remain on the internal route even when the browser represents an external customer.

This distinction also affects assertions. If a setup request sees internal feature flags and the proxied browser sees region-specific flags, the test may create an entity under one policy and view it under another. Make that intentional or provision through an API exposed in the same region.

## Combine routes with browsers without exploding the matrix

Projects are frequently used for Chromium, Firefox, WebKit, mobile emulation, authenticated roles, and deployment targets. Multiplying all of those by every proxy route can turn six valuable cases into sixty expensive ones. Start from risk, not Cartesian completeness.

Use one browser engine to validate network routing on every gateway, then run cross-browser coverage on the direct or highest-value route. Add combinations where proxy behavior is engine-sensitive, such as authentication negotiation, WebSocket handling, or certificate trust. The [Playwright projects and multi-browser guide](/blog/playwright-projects-multi-browser-guide-2026) covers the broader project model.

| Coverage question | Economical project selection |
|---|---|
| Does each region receive the correct catalog and legal copy? | Chromium on every regional route |
| Does checkout work across rendering engines? | Chromium, Firefox, and WebKit on one stable route |
| Does the corporate proxy support WebSocket upgrades? | One engine through that corporate route, focused spec |
| Does mobile layout vary by geography? | One mobile profile for the affected regions only |
| Is certificate inspection compatible with all engines? | All supported engines through the inspecting gateway |

Project dependencies can prepare shared state, but avoid making one route depend on another route's success. A US gateway outage should not prevent the EU route from producing evidence. Shard or tag expensive regional suites so each network path is visible in CI.

## Authentication and secret handling at the proxy boundary

Username and password fields cover basic proxy authentication. Some enterprise gateways require integrated authentication, client certificates, an allowlisted runner address, or a provider-specific session encoded in the username. Those requirements are operational constraints, not values to improvise in Playwright config.

Prefer short-lived credentials issued to the CI workload. Mask both values in job logs. Be cautious with debug logging because launch arguments, environment dumps, or custom reporter output can accidentally serialize secrets. Playwright reports do not need proxy passwords to explain a 407.

If a provider uses a username to choose country, session, or sticky endpoint, build it from validated non-secret parameters plus a secret base identity. Keep the route label in project metadata, not the credential itself. Rotate secrets independently of source changes and verify that revoked credentials genuinely stop working in a dedicated infrastructure test.

## Bypass rules deserve their own tests

The bypass string is easy to treat as punctuation, yet a broad suffix can route sensitive internal traffic directly and a missing hostname can send local development through an external provider. Inventory why each entry exists. Typical candidates are loopback names and controlled internal setup services.

Test both sides of the boundary. A local health endpoint should report that the external gateway never saw it, while the public egress probe should report the expected route. Domain matching rules can vary by proxy implementation and browser stack, so validate actual behavior instead of extrapolating from a shell's \`NO_PROXY\` semantics.

Remember that DNS resolution can occur at a different point depending on the proxy protocol. With a SOCKS endpoint, name resolution expectations may differ from an HTTP CONNECT proxy. If geo-DNS behavior matters, observe which resolver selected the address and confirm it matches the scenario being tested.

## Diagnose gateway failures without weakening the suite

Retries are useful for brief network faults, but they can conceal a systematically unhealthy proxy. Report retry outcomes per project and keep gateway errors distinguishable from application assertions. Capture the Playwright trace on first retry or retained failure, and supplement it with gateway-side request IDs when your provider exposes them.

Do not respond to flaky routing by increasing every navigation timeout. First separate latency from connection establishment, proxy authentication, DNS, TLS negotiation, and origin response time. A navigation that spends 20 seconds before any origin request has a different owner from an API that returns slowly after successful tunneling.

For stable diagnosis, record these non-secret facts: project name, gateway label, target environment, runner region, observed egress identity, protocol, and failure phase. The [Playwright configuration options reference](/blog/playwright-test-config-options-complete-reference) helps align navigation, action, and test deadlines once the network path is known.

## Maintain a route contract

Treat each proxy project as a test environment with an owner and an expected capability set. Record whether it supports HTTP/2, WebSockets, TLS inspection, particular destinations, and an approximate operational latency band. Mark a route unavailable only from an independent health signal, not because product assertions happened to fail.

Before adding a new gateway to the main regression matrix, run a focused certification suite: egress identity, DNS behavior, TLS trust, authentication rejection, bypass behavior, HTTP redirect handling, upload/download, and WebSocket upgrade if the product uses it. This prevents a network limitation from being discovered through an unrelated user journey.

The configuration file should stay boring. Route inventories, early secret validation, and small probe tests make that possible. Complex logic inside the config is a warning that proxy provisioning or environment ownership needs a clearer interface.

## Handle proxy trust certificates outside the route object

An intercepting corporate proxy may issue origin certificates from an internal certificate authority. Proxy credentials do not make the browser trust that authority. Install the approved CA into the runner or browser trust mechanism used by your environment. Resorting to \`ignoreHTTPSErrors\` weakens the scenario and can hide an expired, mismatched, or malicious certificate.

Keep a separate negative test for certificate failures if TLS inspection is part of the production route. A gateway that unexpectedly stops inspecting traffic might indicate a policy gap even though pages load. Conversely, a certificate error after CA rotation belongs to infrastructure, and the report should name the gateway and certificate issuer without exposing private key material.

Browser engines can use trust stores differently on particular operating systems. Certify the exact runner image and engine combination you ship in CI. Container image updates should trigger the focused gateway suite before the full product matrix.

## Test proxy rotation and session affinity

Some providers rotate exit nodes per connection or per credential-encoded session. That behavior can break flows where fraud controls expect a stable source address from login through payment. Decide whether a project represents a sticky user session or a pool of changing egress nodes, then assert it with repeated observations from the same browser context.

Do not assert one permanent IP when the provider contract promises only a country or region. Instead, ask the controlled probe for the stable property you purchased. If session affinity is promised, record an opaque session label and verify it remains consistent across navigation, fetch, and WebSocket traffic that the product uses.

Browser restarts between tests may create new proxy connections and therefore new exits. A worker-scoped browser does not automatically mean the provider preserves affinity, and serializing tests to keep an IP stable creates hidden coupling. Prefer a provider-supported session identifier whose lifetime matches the scenario.

## Separate proxy health from application health in CI

Give the gateway probe its own test or setup project and publish its result even when business specs fail. A health check should cover authentication, expected egress, DNS, and a small HTTPS request to a controlled origin. It should not rely on the storefront being healthy, because that collapses two ownership domains into one signal.

When the probe fails, skip or quarantine downstream route-specific tests only if your release policy explicitly permits infrastructure blockage. Preserve a red or blocked status rather than reporting green. When the probe succeeds and checkout fails, the application team receives a cleaner incident with route evidence already attached.

Track gateway latency separately from page latency. A slow probe indicates network overhead; a fast probe beside a slow origin points elsewhere. This separation prevents a regional project from accumulating generous timeouts that later mask an application regression.

Archive the probe response as sanitized JSON beside the project report. During an incident, that artifact confirms the route observed during the same run, not the route an engineer happened to inspect afterward. Give it a short retention period if even coarse region and gateway identifiers are operationally sensitive.

## Frequently Asked Questions

### Can different projects use the same browser with different proxies?

Each Playwright project gets its own configured browser execution. Give the projects the same device settings and different \`use.proxy\` objects. They share test source, not a single live browser process that changes proxy mid-session.

### Should the proxy server URL contain credentials?

Use the separate \`username\` and \`password\` fields. This reduces accidental exposure in project names, error strings, and copied configuration. Inject their values from a secret manager or CI environment.

### Why does a Node helper bypass the project's proxy?

The helper may use a networking library outside Playwright's browser context and request fixtures. Configure that client explicitly or decide that control-plane setup traffic should remain direct. Do not infer its path from what the browser uses.

### How can I test localhost while an external proxy is enabled?

Add the required loopback hostnames or addresses to \`bypass\` and verify them with a local endpoint. Include every form your tests actually navigate to, because \`localhost\` and \`127.0.0.1\` are not interchangeable in all routing setups.

### Is a proxy project enough to prove geographic behavior?

Configuration alone cannot prove geography. Assert the observed egress or region through a controlled endpoint, then assert the product behavior. A configured hostname describes intent; a server-side observation proves the request arrived through the intended path.
`,
};
