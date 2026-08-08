import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Open Redirect Patterns: Payloads, Oracles, and Automation',
  description: 'Learn security testing open redirect patterns with canonical URL checks, runnable probes, browser-level assertions, and fixes that stop redirect abuse.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing Open Redirect Patterns: Payloads, Oracles, and Automation

Security testing open redirect patterns requires more than replacing \`next=/dashboard\` with an external URL and checking for a 302. A complete test identifies every attacker-controlled redirect input, exercises alternate URL representations, observes the browser's final destination, and verifies the application applies a clear destination policy after parsing and canonicalization.

An open redirect exists when an attacker can make a trusted application send a user to an unintended destination. The redirect can be server-side through a Location header or client-side through JavaScript navigation. Impact depends on context: phishing links inherit trust from the application's domain, authentication codes or tokens may be exposed in badly designed flows, security controls may be bypassed, and chained vulnerabilities can turn a "low" severity redirect into a useful exploit primitive.

The strongest QA workflow combines three layers. First, enumerate redirect sources from routes, forms, scripts, and identity flows. Second, probe a structured payload matrix with an HTTP client and record the raw Location value. Third, use a real browser for cases involving parsing, JavaScript, multiple hops, or user interaction. This guide provides runnable Node and Playwright examples, diagnostic tables, and remediation-focused assertions.

## Build an inventory of redirect sources and destination rules

Search for parameters and fields that imply navigation: \`next\`, \`return\`, \`returnTo\`, \`redirect\`, \`redirect_uri\`, \`continue\`, \`url\`, \`target\`, \`destination\`, and callback values. Names are hints, not proof. Also inspect route handlers that set Location, framework redirect helpers, login middleware, logout pages, error handlers, invitation links, language selectors, and client-side assignments to \`window.location\`.

| Surface | Typical input source | Expected policy | High-value observation |
|---|---|---|---|
| Login return path | Query parameter or session | Same-origin relative path | Post-login final URL |
| Logout continuation | Query parameter | Fixed landing page or allowlist | Redirect before session cleanup |
| OAuth callback registration | Client configuration | Exact registered URI | Authorization server comparison behavior |
| Marketing outbound link | Database or query | Explicit external allowlist or warning page | Destination after tracking hop |
| Locale switcher | Current path plus locale | Same-origin generated route | Parser handling of encoded paths |
| Client-side router | Query, fragment, local storage | Application route only | DOM navigation sink |

For every source, write the intended rule without implementation language. Examples include "only a path beginning with one slash on the current origin," "exactly one of the registered callback URLs," or "an HTTPS URL whose hostname is in the partner allowlist." These are materially different policies. A generic \`isSafeUrl\` helper tends to become either too permissive or too restrictive when used for all three.

Capture the starting URL, input name, authentication state, request method, status code, raw Location header, every intermediate hop, and final browser URL. A redirect that looks safe in the first response may lead to an attacker-controlled second hop. Conversely, an external-looking string can remain harmless text if it is encoded into a local path rather than interpreted as a URL.

Open redirects often sit beside authentication and token handling. If a test path enters identity code, also assess algorithm and key-management boundaries rather than assuming redirect validation covers them. The [JWT algorithm confusion testing guide](/blog/security-testing-jwt-algorithm-confusion) addresses one of those separate trust decisions.

## Establish a controlled redirect target

Do not point security probes at arbitrary third-party sites. Use a local server or a domain your organization controls. The target should record a non-sensitive case identifier and return a plain response. Never place session cookies, authorization codes, real email addresses, or customer data in the marker.

This Node server provides a deliberately vulnerable login-return route, a safer relative-path route, and a controlled external target. It lets you run the test examples without touching production.

\`\`\`js
import { createServer } from "node:http";

function html(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8", ...headers });
  response.end(body);
}

function safeLocalPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/home";
  }
  const parsed = new URL(value, "http://127.0.0.1:4100");
  return parsed.origin === "http://127.0.0.1:4100" ? parsed.pathname + parsed.search + parsed.hash : "/home";
}

const applicationServer = createServer((request, response) => {
  const current = new URL(request.url ?? "/", "http://127.0.0.1:4100");

  if (current.pathname === "/unsafe-login") {
    response.writeHead(302, { location: current.searchParams.get("next") ?? "/home" });
    response.end();
    return;
  }

  if (current.pathname === "/safe-login") {
    response.writeHead(302, { location: safeLocalPath(current.searchParams.get("next")) });
    response.end();
    return;
  }

  html(response, 200, "<h1>local application</h1>");
});

const controlledTarget = createServer((request, response) => {
  const current = new URL(request.url ?? "/", "http://127.0.0.1:4200");
  if (current.pathname === "/external-marker") {
    html(response, 200, \`<h1 id="marker">controlled-target</h1><p>\${current.searchParams.get("case") ?? "none"}</p>\`);
    return;
  }
  html(response, 404, "<h1>unknown target route</h1>");
});

applicationServer.listen(4100, "127.0.0.1", () => console.log("application: http://127.0.0.1:4100"));
controlledTarget.listen(4200, "127.0.0.1", () => console.log("controlled target: http://127.0.0.1:4200"));
\`\`\`

The \`safeLocalPath\` example demonstrates a narrow same-origin rule, not a universal URL validator. Production applications should use their framework's well-reviewed navigation mechanisms and central policy, and should consider reverse proxies, public origins, path normalization, and application routing. The test target remains intentionally small so the observable behaviors are clear.

Launch the server and inspect the raw redirect without following it:

\`\`\`bash
node server.mjs &
server_pid=$!
trap 'kill "$server_pid"' EXIT

curl --silent --dump-header - --output /dev/null 'http://127.0.0.1:4100/unsafe-login?next=http%3A%2F%2F127.0.0.1%3A4200%2Fexternal-marker%3Fcase%3Dbasic'
\`\`\`

The response should contain a Location header pointing to the controlled marker. Use this vulnerable route only in an isolated test environment.

## Separate URL syntax families in the payload matrix

Random payload lists create noise. Organize cases by the parser ambiguity or policy boundary they exercise. Each family should have an expected outcome based on the route's destination rule.

| Family | Example input | Risk being tested | Expected result for local-only policy |
|---|---|---|---|
| Absolute URL | \`https://attacker.test/path\` | Direct external navigation | Reject or replace |
| Network-path reference | \`//attacker.test/path\` | Inherits current scheme | Reject |
| Backslash variant | platform-dependent crafted path | Parser disagreement | Reject ambiguous input |
| Userinfo confusion | \`https://trusted.test@attacker.test/\` | Visual host confusion | Reject because hostname is attacker.test |
| Subdomain suffix | \`https://trusted.test.attacker.test/\` | Weak prefix matching | Reject |
| Encoded delimiter | Encoded slash or colon | Decode-order mismatch | Normalize once under defined parser, then decide |
| Local absolute path | \`/account?tab=security\` | Intended navigation | Allow |
| Relative path | \`account/settings\` | Ambiguous base resolution | Allow only if policy explicitly supports it |
| Fragment | \`#billing\` | Client-only navigation | Allow if route semantics permit |

Do not assume every payload has identical meaning across browsers, server frameworks, languages, and proxies. That disagreement is itself the test hypothesis. Record how the component under test parses the value and what the browser ultimately does.

Generate cases as data so expected decisions are reviewed with the payload. This TypeScript module uses controlled local destinations and Node's standard URL parser.

\`\`\`ts
export type RedirectCase = {
  id: string;
  input: string;
  allowedByLocalPathPolicy: boolean;
};

export const redirectCases: RedirectCase[] = [
  { id: "absolute-external", input: "https://attacker.test/landing", allowedByLocalPathPolicy: false },
  { id: "network-path", input: "//attacker.test/landing", allowedByLocalPathPolicy: false },
  { id: "userinfo", input: "https://trusted.test@attacker.test/", allowedByLocalPathPolicy: false },
  { id: "prefix-host", input: "https://trusted.test.attacker.test/", allowedByLocalPathPolicy: false },
  { id: "local-account", input: "/account?tab=security", allowedByLocalPathPolicy: true },
  { id: "local-fragment", input: "/docs#install", allowedByLocalPathPolicy: true },
];

export function destination(urlText: string, base: string): URL {
  return new URL(urlText, base);
}
\`\`\`

Use reserved test domains such as \`.test\` for examples, and substitute an evaluator-controlled reachable domain in integration environments. A fake hostname is useful for unit tests, while browser end-to-end tests need a resolvable target or a second loopback port.

## Probe server redirects without automatically following them

HTTP clients often follow redirects by default or make it easy to enable that behavior. For the first layer, disable following so the test can assert the exact response and Location. Node's built-in \`fetch\` supports \`redirect: "manual"\`.

\`\`\`ts
import { strict as assert } from "node:assert";
import test from "node:test";

test("unsafe route reflects an external destination", async () => {
  const target = "http://127.0.0.1:4200/external-marker?case=server-probe";
  const endpoint = new URL("http://127.0.0.1:4100/unsafe-login");
  endpoint.searchParams.set("next", target);

  const response = await fetch(endpoint, { redirect: "manual" });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), target);
});

test("safe route replaces a network-path destination", async () => {
  const endpoint = new URL("http://127.0.0.1:4100/safe-login");
  endpoint.searchParams.set("next", "//attacker.test/landing");

  const response = await fetch(endpoint, { redirect: "manual" });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/home");
});
\`\`\`

Run it with Node's test runner after saving as \`redirect.test.mjs\`:

\`\`\`bash
node --test redirect.test.mjs
\`\`\`

For a local-only route, do not assert merely that the response is a 3xx. A safe implementation may ignore the parameter and redirect to a default. It may return 400. It may render an interstitial. Assert the approved behavior for that endpoint. Also include normal cases, because a security fix that blocks every return path can break login usability and encourage teams to disable the control.

Inspect status codes deliberately. The browser changes method behavior differently across 301, 302, 303, 307, and 308 according to HTTP semantics and user-agent behavior. If a POST endpoint redirects, test whether sensitive body data could be resent to another origin, particularly for redirects that preserve method and body. Do not infer this solely from the Location string.

## Parse the destination, then compare the right component

String checks are a frequent source of bypasses. \`startsWith("https://trusted.test")\` accepts \`https://trusted.test.attacker.test\`. Searching for a trusted substring accepts userinfo such as \`https://trusted.test@attacker.test\`. Checking only that the input starts with a slash accepts network-path references beginning with two slashes.

For an allowlist of external origins, parse with the platform URL parser and compare normalized origins or exact hostnames under a documented scheme policy. The following function accepts exactly HTTPS URLs on \`partner.test\` and its true subdomains. It does not accept an arbitrary host that merely ends with those letters.

\`\`\`ts
const partnerRoot = "partner.test";

export function isApprovedPartner(input: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username !== "" || parsed.password !== "") return false;

  const hostname = parsed.hostname.toLowerCase();
  return hostname === partnerRoot || hostname.endsWith("." + partnerRoot);
}

if (!isApprovedPartner("https://docs.partner.test/start")) {
  throw new Error("expected approved subdomain");
}
if (isApprovedPartner("https://partner.test.attacker.test/")) {
  throw new Error("suffix confusion was accepted");
}
\`\`\`

Even correct host comparison is only one layer. Decide whether ports are allowed, whether internationalized domain names are expected, whether DNS resolution introduces private-network risk, whether a permitted partner can redirect again, and whether credentials in the URL are forbidden. External allowlists also require ownership and lifecycle management. A once-trusted subdomain that becomes dangling can invalidate the assumption.

For local-only return paths, a stronger design is to avoid accepting full URLs. Accept an application route identifier and map it server-side, or accept a constrained relative path and resolve it against the known public origin. After parsing, compare origin and optionally restrict the path namespace.

\`\`\`ts
const applicationOrigin = "https://app.example.test";

export function localDestination(input: string | null): string {
  if (input === null || !input.startsWith("/") || input.startsWith("//")) {
    return "/home";
  }

  const parsed = new URL(input, applicationOrigin);
  if (parsed.origin !== applicationOrigin) return "/home";
  if (parsed.pathname.startsWith("/admin")) return "/home";

  return parsed.pathname + parsed.search + parsed.hash;
}

const accepted = localDestination("/account?tab=security#keys");
if (accepted !== "/account?tab=security#keys") throw new Error("valid local route rejected");
if (localDestination("//attacker.test/x") !== "/home") throw new Error("external route accepted");
\`\`\`

This function intentionally rejects admin paths as an example of route-level policy. It is not a substitute for authorization. A redirect control decides navigation, while the destination must independently enforce access.

## Exercise encoding and normalization in a controlled sequence

Many bypasses arise because different layers decode at different times. A proxy decodes once, an application framework decodes again, and a client-side script interprets the result as a URL. Tests should preserve the original input and record each observed representation rather than repeatedly decoding until something looks dangerous.

Create payloads with \`URLSearchParams\` so the outer request encoding is correct. Put the test value into the parameter once and let the API serialize it. Hand-concatenated query strings easily test a different value than intended because ampersands, hashes, plus signs, or percent sequences change structure.

\`\`\`ts
export function buildProbe(base: string, parameter: string, payload: string): string {
  const endpoint = new URL(base);
  endpoint.searchParams.set(parameter, payload);
  return endpoint.toString();
}

const probe = buildProbe(
  "https://app.example.test/login",
  "next",
  "https://attacker.test/landing?source=qa#marker",
);

const parsedProbe = new URL(probe);
if (parsedProbe.searchParams.get("next") !== "https://attacker.test/landing?source=qa#marker") {
  throw new Error("payload did not survive one query serialization round");
}
\`\`\`

When the application intentionally accepts an already encoded nested URL, document that contract and construct the nesting level explicitly. Avoid blanket double-decoding in production and in tests. Repeated decoding can turn inert data into delimiters that a later component treats as control syntax.

Test path normalization too. Dot segments, redundant slashes, and encoded separators may be normalized by the browser or server. The correct oracle is the final parsed origin and approved route, not a blacklist of suspicious characters. Blacklists miss variants and often block legitimate international or encoded paths.

What people get wrong is collecting a huge payload corpus without defining expected parser stages. When a payload "works," nobody knows whether the server, proxy, JavaScript, or browser performed the decisive interpretation. A smaller matrix with raw-request, raw-response, hop, and final-URL evidence produces a reproducible defect and a durable regression test.

## Use a real browser for client-side and multi-hop behavior

Server-level tests cannot observe JavaScript sinks such as \`location.assign\`, router navigation, meta refresh, or event-driven redirects after login. They also do not fully model browser URL parsing and cookie behavior. Add browser tests for routes whose destination depends on the DOM or crosses several hops.

The following Playwright test uses the local vulnerable route and asserts the controlled marker is reached. Install \`@playwright/test\` and its browser as documented at https://playwright.dev/docs/intro, keep the Node server running, and save the test in the configured test directory.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("browser follows the vulnerable return target", async ({ page }) => {
  const destination = "http://127.0.0.1:4200/external-marker?case=browser-hop";
  const start = new URL("http://127.0.0.1:4100/unsafe-login");
  start.searchParams.set("next", destination);

  await page.goto(start.toString());

  await expect(page).toHaveURL(destination);
  await expect(page.locator("#marker")).toHaveText("controlled-target");
});

test("safe route keeps the browser on the application origin", async ({ page }) => {
  const start = new URL("http://127.0.0.1:4100/safe-login");
  start.searchParams.set("next", "//attacker.test/landing");

  await page.goto(start.toString());

  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:4100");
  await expect(page).toHaveURL("http://127.0.0.1:4100/home");
});
\`\`\`

Prefer asserting the parsed origin and an exact approved final path. Avoid \`page.url().includes("trusted.test")\`, which recreates the same weak substring logic the application must avoid. Capture the redirect chain through network events or a trace when diagnosis requires intermediate responses.

For authentication flows, use synthetic accounts and an isolated identity environment. Never let a security test send live authorization codes to an untrusted endpoint. The goal is to verify comparison and navigation policy without creating actual credential leakage.

## Diagnose a realistic parser disagreement

Suppose \`/login?next=//controlled.example.test/capture\` returns \`Location: /home\` in an HTTP integration test, but a browser test still reaches the external host. The first response looks safe, so the team initially suspects a flaky test.

Inspect the DOM and client scripts. The server redirects to \`/home\`, but the page reads the original \`next\` value from session storage and calls \`window.location.assign(next)\` after rendering. The server validator worked. A second, client-side navigation path independently consumed the untrusted value without applying the same policy.

The defect is not fixed by expanding the server blacklist. Remove the duplicate client-controlled destination or route it through one central policy. Add a browser regression that asserts origin after page initialization, not merely the server's first Location. Clear storage between cases so one payload does not contaminate another test.

| Observation | Interpretation | Next diagnostic step |
|---|---|---|
| Safe first Location, external final URL | Later hop or client navigation | Record redirect chain and DOM navigation |
| External Location, browser remains local | Browser block, CSP, or unreachable target | Preserve raw header, console, and network failure |
| Only authenticated users redirect | Value stored before or during login | Inspect session and post-auth middleware |
| Only one encoded variant works | Decode-order mismatch | Record value at proxy, server, template, and client |
| Allowed partner redirects externally | Trust delegated to partner hop | Decide whether final destinations require enforcement |
| Test passes after rerun | Shared state or expiring payload | Reset cookies, storage, cache, and case marker |

This is why both raw and rendered observations matter. An HTTP assertion locates the responsible response; a browser assertion demonstrates the user-visible security boundary.

## Test redirect chains, OAuth callbacks, and related controls separately

A permitted destination can itself redirect elsewhere. Decide whether the original application is responsible for the final hop. For a local-only policy, any external final origin is suspect. For an outbound-link feature, an approved tracking service may legitimately forward to a destination that was separately validated. Your oracle must follow the product contract.

Limit hops in the test client and detect loops. Record each status and resolved URL. A chain can cross schemes, ports, or hosts even when the first Location is relative. Resolve every Location against the current response URL with a standards-based parser.

OAuth \`redirect_uri\` validation deserves its own cases. Authorization servers should compare callbacks according to the protocol and provider's documented registration rules, typically favoring exact registered values rather than a broad application redirect allowlist. Do not reuse a general post-login \`next\` validator for OAuth callbacks. Test missing values, exact registered values, altered scheme, altered host, altered port, subdomain variants, path changes, and query behavior according to the actual provider contract.

Similarly, a JWKS endpoint or key cache affects authentication trust but is not a redirect control. When the same evaluation covers token verification, use dedicated [JWKS cache and key rotation tests](/blog/testing-jwt-key-rotation-jwks-cache). Keeping the oracles separate prevents a successful redirect defense from masking a token-validation weakness.

Headers such as Content Security Policy can reduce some client-side navigation or script risks, but they are defense in depth, not a reason to accept an attacker-controlled destination. Referrer Policy may limit information placed in the Referer header, yet query parameters and fragments have different transmission behavior and should not carry secrets casually. Test the primary allowlist or local-path policy directly.

## Convert discoveries into durable regression tests

A useful defect report includes the exact start request, authentication preconditions, parameter source, raw Location values, final URL, hop chain, browser evidence, and the policy statement that was violated. Use a controlled destination and a non-sensitive marker. Explain impact in the application's context rather than assigning severity from the word "redirect" alone.

After remediation, retain at least one positive case for each supported navigation type and one negative case for each parser family that exposed a weakness. Unit-test the destination policy as a pure function, integration-test response headers, and browser-test client-side or multi-hop flows. These layers fail for different reasons and give faster feedback than one large end-to-end suite.

Run the negative suite in an isolated environment if payloads interact with authentication or external navigation. In CI, bind targets to loopback or approved test domains, prevent arbitrary egress, and redact cookies and codes from traces. Security automation should not create the exposure it is trying to detect.

The final release criterion should state the outcome: untrusted redirect input cannot cause navigation outside approved origins or routes, including after decoding, authentication, client initialization, and permitted intermediate hops. That is much stronger than "the common payload returned 400."

## Frequently Asked Questions

### Is every external redirect an open redirect vulnerability?

No. Some products intentionally redirect to external partners, payment providers, or user-selected links. The vulnerability is uncontrolled or insufficiently constrained destination choice. An intentional external redirect can be safe when the destination comes from server-side configuration, an exact allowlist, or a reviewed interstitial flow. Test against the endpoint's declared policy. Also consider whether approved destinations can be taken over or redirect again. The mere presence of a 302 to another origin is evidence to investigate, not a complete severity decision.

### Why should tests inspect both the Location header and the final browser URL?

They answer different questions. The raw Location header identifies what a particular server response instructed the client to do. The final browser URL captures later redirects, JavaScript navigation, URL parsing, storage-driven behavior, and user-agent effects. A safe first hop can be followed by an unsafe client-side hop, while an unsafe header may fail to navigate because another control blocks it. Keeping both observations makes diagnosis precise and prevents a passing integration test from hiding a browser-visible redirect.

### Are hostname allowlists enough to prevent redirect abuse?

They can be appropriate for an intentional external-redirect feature, but they must compare parsed hostnames or origins, enforce scheme and port rules, reject userinfo confusion, and manage domain ownership over time. They are unnecessary for local return paths, where accepting only constrained relative routes is simpler. An allowlisted host can also redirect onward, so the product must decide whether final-hop enforcement is required. No allowlist replaces authorization at the destination or safe handling of authentication codes and sensitive query data.

### How should an AI coding agent help with open redirect testing?

Use the agent to inventory redirect sinks, generate cases from an explicit policy, implement unit and browser tests, and summarize hop evidence. Require it to cite the exact route and parser behavior rather than labeling every redirect vulnerable. Give it controlled hosts, synthetic accounts, and strict egress limits. Review generated payloads and assertions because framework helpers and identity providers differ. The agent is most useful when the oracle is already clear: approved origins and routes, permitted encoding, authentication state, and expected behavior for rejected input.
`,
};
