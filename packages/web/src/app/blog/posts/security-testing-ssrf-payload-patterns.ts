import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing SSRF Payload Patterns for Safe, Repeatable Validation',
  description: 'Apply security testing SSRF payload patterns in a controlled harness to expose URL-parser, redirect, DNS, and network-policy gaps before release.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Security Testing SSRF Payload Patterns for Safe, Repeatable Validation

Security testing SSRF payload patterns should exercise how an application parses a destination, resolves its hostname, follows redirects, and enforces network policy, without sending probes toward real internal services. The most useful test suite is not a giant list of strange URLs. It is a compact, classified corpus executed against a controlled callback server, with an assertion at every decision boundary.

For QA engineers, the direct workflow is: map every feature that causes the server to fetch a user-influenced location, build local allowed and denied destinations, generate equivalence classes for URL ambiguity and address scope, observe whether any denied request reaches the sink, and repeat the check after redirects and DNS resolution. A correct result includes a stable client error, a useful audit event, and zero network contact with the blocked destination.

This guide stays on the defensive side of SSRF testing. Examples use loopback-bound fixtures, reserved example domains, and documentation address ranges. Do not aim payloads at cloud metadata services, corporate address space, or third-party hosts. The test is complete when the control is proven, not when a sensitive endpoint is reached.

## Model the server-side fetch path before generating payloads

Server-Side Request Forgery exists when an attacker can influence a server-side network request in a way that reaches a destination or protocol the application did not intend. The risky input may look like a URL field, but it can also be a webhook tester, image importer, document preview, feed reader, repository integration, PDF renderer, SSO metadata loader, or redirect callback verifier.

Start with a data-flow map. Identify where input enters, every normalization step, the URL parser, hostname resolution, redirect behavior, request library, proxy, egress gateway, and final response handling. If an AI coding agent helps trace the code, require it to cite concrete files and call sites. A plausible narrative is not evidence that all fetch paths share one guard.

| Fetch surface | User-controlled portion | Expected destination policy | High-value test |
|---|---|---|---|
| Avatar import | Full HTTPS URL | Public image hosts or any public HTTPS host | Redirect from allowed-looking URL to denied sink |
| Webhook test | Scheme, host, port, path | Customer-verified HTTPS origin | Alternate port and hostname normalization |
| Link preview | Page URL | Public HTTP or HTTPS | DNS answer in a non-public range |
| SSO metadata | Administrator-supplied URL | Pre-approved identity provider | User-info and suffix confusion |
| PDF rendering | Page URL plus subresources | Tenant application origin | HTML that causes secondary server-side fetches |
| Repository integration | Provider URL or clone target | Fixed provider domains | Scheme confusion and redirect handling |

Write the policy in positive terms. "Block localhost" is not a full policy because private, link-local, multicast, reserved, IPv6, and organization-specific ranges remain. An allowlist of exact schemes, normalized hosts, and expected ports is strongest when the business feature has a bounded partner set. When arbitrary public destinations are required, combine canonical parsing, resolved-address checks, redirect revalidation, egress controls, timeouts, response limits, and monitoring.

The OWASP SSRF Prevention Cheat Sheet at https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html is a useful design reference. Your tests should reflect the application's documented policy, not blindly encode every example from a generic checklist.

## Build a harmless two-server SSRF laboratory

Use two local servers: the application under test and a canary sink. The sink records requests but contains no secrets. A third local endpoint can issue controlled redirects. Run the harness in an isolated CI network with no access to production, cloud metadata, or corporate services.

This minimal Node server creates a permitted content route, a denied canary route, and a redirect route. It is deliberately bound to loopback for local testing.

\`\`\`ts
import http from 'node:http';

const events: Array<{ method: string; url: string }> = [];

export const fixtureServer = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1:4310');

  if (url.pathname === '/public/image.png') {
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(Buffer.from([137, 80, 78, 71]));
    return;
  }

  if (url.pathname === '/canary') {
    events.push({ method: req.method ?? 'GET', url: url.pathname });
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/redirect-to-canary') {
    res.writeHead(302, { location: 'http://127.0.0.1:4310/canary' });
    res.end();
    return;
  }

  if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(events));
    return;
  }

  res.writeHead(404);
  res.end();
});

fixtureServer.listen(4310, '127.0.0.1');
\`\`\`

In a real test, the allowed host and denied host should be distinguishable at the network policy layer. Loopback alone cannot represent every range, but it proves that the application rejects a known internal destination before making contact. Container networks can add multiple named fixtures without exposing anything beyond the test environment.

Record a unique correlation token in each case's path, such as \`/canary/case-017\`, then query the sink after the application responds. A blocked HTTP status alone is insufficient. The application might fetch the destination, inspect the response, and only then return a denial. The canary proves whether contact occurred.

## Organize payloads by the control they challenge

A maintainable corpus attaches intent and expected stage to each input. Avoid opaque lists copied from penetration-testing repositories. They grow stale, repeat equivalent cases, and make failures hard to triage.

| Pattern family | Example shape | Control under test | Expected outcome |
|---|---|---|---|
| Scheme | \`file:\` or another unsupported scheme | Exact scheme allowlist | Reject before resolution |
| Credentials | \`https://trusted.example@denied.example/\` | Parser uses hostname, not visual prefix | Reject normalized host |
| Host suffix | \`https://trusted.example.denied.example/\` | Exact or boundary-aware host comparison | Reject lookalike host |
| Alternate address text | Noncanonical IP representation | Canonical address validation | Reject if resolved scope is denied |
| IPv6 | Bracketed loopback or mapped address | IPv4 and IPv6 policy parity | Reject denied address class |
| Port | Allowed host with unexpected port | Port allowlist | Reject before request |
| Redirect | Allowed first hop to denied second hop | Revalidation on every hop | Stop before denied contact |
| DNS answer | Public-looking name resolving internally | Post-resolution address check | Reject all denied answers |
| Response size | Allowed destination streams excessive bytes | Download limit | Abort safely and report limit |
| Secondary resource | Allowed HTML references denied subresource | Renderer-wide egress policy | Prevent subresource contact |

The strings in the corpus are less important than placement. A scheme case must fail before DNS. A denied resolved address must fail before connect. A redirect case must validate the new location, not trust the first URL. Your telemetry or injected test doubles should make these boundaries observable.

Represent cases as data so the same corpus can drive unit, integration, and end-to-end checks.

\`\`\`ts
type SsrfCase = {
  id: string;
  family: string;
  input: string;
  expected: 'allow' | 'deny';
  expectedStage: 'parse' | 'policy' | 'resolve' | 'redirect' | 'response';
};

export const ssrfCases: SsrfCase[] = [
  {
    id: 'scheme-file',
    family: 'scheme',
    input: 'file:///tmp/qa-fixture.txt',
    expected: 'deny',
    expectedStage: 'policy',
  },
  {
    id: 'userinfo-confusion',
    family: 'credentials',
    input: 'https://assets.example@127.0.0.1:4310/canary/userinfo',
    expected: 'deny',
    expectedStage: 'policy',
  },
  {
    id: 'ipv6-loopback',
    family: 'IPv6',
    input: 'http://[::1]:4310/canary/ipv6',
    expected: 'deny',
    expectedStage: 'resolve',
  },
  {
    id: 'unexpected-port',
    family: 'port',
    input: 'https://assets.example:8443/image.png',
    expected: 'deny',
    expectedStage: 'policy',
  },
];
\`\`\`

The \`.example\` top-level domain is reserved for documentation. It will not provide a useful allowed integration target by itself, so map fixture names inside the isolated test environment or inject resolution. Do not add public DNS records merely to make a unit suite work.

## Challenge URL parsing without writing your own parser

URL ambiguity appears when validation and request execution interpret the same string differently. The safest architecture uses one standards-based parser, reads structured properties, rejects credentials and fragments when irrelevant, normalizes the host, then passes the parsed representation into the request layer. String prefix, suffix, and substring checks are fragile.

The WHATWG \`URL\` class gives tests a consistent view of protocol, hostname, port, username, and password. It does not decide whether a destination is safe. That is the policy layer's responsibility.

\`\`\`ts
type ParsedTarget = {
  protocol: 'http:' | 'https:';
  hostname: string;
  port: number;
  pathname: string;
};

export function parseTarget(raw: string): ParsedTarget {
  const url = new URL(raw);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('unsupported_scheme');
  }
  if (url.username || url.password) {
    throw new Error('credentials_not_allowed');
  }

  const defaultPort = url.protocol === 'https:' ? 443 : 80;
  return {
    protocol: url.protocol,
    hostname: url.hostname.toLowerCase(),
    port: url.port ? Number(url.port) : defaultPort,
    pathname: url.pathname,
  };
}
\`\`\`

Useful parser cases include leading or trailing whitespace, mixed-case scheme and hostname, a trailing dot in the hostname, percent-encoded characters, credentials, fragments, bracketed IPv6, empty ports, and malformed delimiters. Do not assume the expected normalization. Run the actual parser, document the resulting structured values, then assert policy on those values.

What people get wrong is testing only strings that their validator recognizes as IP addresses. A hostname can resolve to a denied address, and a permitted-looking hostname can redirect elsewhere. Conversely, rejecting any string containing \`127\` creates false confidence while breaking legitimate paths. The network destination after canonical parsing and resolution is the security-relevant object.

## Assert hostname allowlists at label boundaries

When the feature supports a finite partner set, allowlisting is simpler than classifying every public address. Exact host comparison is preferable. If subdomains are necessary, match DNS labels, not raw suffixes. The string \`nottrusted.example\` ends with \`trusted.example\` but is not its subdomain.

\`\`\`ts
const exactHosts = new Set(['images.partner.example', 'hooks.partner.example']);

export function isAllowedPartnerHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\\.$/, '');
  return exactHosts.has(normalized);
}

export function isWithinDomain(hostname: string, parent: string): boolean {
  const host = hostname.toLowerCase().replace(/\\.$/, '');
  const domain = parent.toLowerCase().replace(/\\.$/, '');
  return host === domain || host.endsWith(\`.\${domain}\`);
}
\`\`\`

This example demonstrates label-aware comparison, not a complete SSRF defense. It does not validate resolved addresses or protect against a compromised allowed domain. Tests should cover the exact host, one valid child if supported, a prefix lookalike, a suffix lookalike, case normalization, and a trailing dot. Add internationalized domain cases only after defining whether the application accepts them and where ASCII conversion occurs.

An allowlist also needs ownership and lifecycle. A retired partner domain can be re-registered or misconfigured. QA should ask who reviews entries, whether ports and schemes are stored with the host, and how emergency removal propagates.

## Validate every DNS answer and guard the connection boundary

For features that can fetch arbitrary public hosts, resolve the normalized hostname and inspect every returned address. Do not accept the first public answer while ignoring another denied answer. Apply both IPv4 and IPv6 classification. Revalidation must be close to connection establishment to reduce time-of-check versus time-of-use gaps.

Node's DNS promises API can return all resolved addresses. Address classification should use a well-maintained, reviewed library or a centralized network service rather than hand-written regular expressions.

\`\`\`ts
import { lookup } from 'node:dns/promises';

export type Resolution = { address: string; family: number };

export async function resolveAll(hostname: string): Promise<Resolution[]> {
  const answers = await lookup(hostname, { all: true, verbatim: true });
  if (answers.length === 0) {
    throw new Error('dns_no_answers');
  }
  return answers;
}

export async function assertPublicResolution(
  hostname: string,
  isDeniedAddress: (address: string) => boolean,
): Promise<Resolution[]> {
  const answers = await resolveAll(hostname);
  if (answers.some((answer) => isDeniedAddress(answer.address))) {
    throw new Error('dns_answer_denied');
  }
  return answers;
}
\`\`\`

Unit tests should inject answers rather than depend on live DNS. Cover all-public, all-denied, mixed public and denied, no answers, IPv6-only, and transient resolution failure. An integration test can run a DNS fixture inside the isolated environment. DNS rebinding tests require control over resolution timing and connection behavior; a static hosts-file entry cannot prove that protection.

Application checks are one layer. Egress firewalls, service meshes, or forward proxies should independently prevent workloads from connecting to sensitive ranges and unnecessary ports. A bug in URL validation should encounter a second barrier. QA can verify this in a dedicated environment by attempting only connections to harmless canary services placed in denied network segments.

## Treat redirects as a fresh request decision

Many HTTP clients follow redirects automatically. If the application validates only the first URL, an allowed endpoint can redirect to a denied destination. Configure the request layer so the application can inspect each new location, or enforce the policy through a trusted egress component that evaluates every connection.

Test same-host redirects, allowed-host to allowed-host redirects, allowed-host to denied-host redirects, relative locations, redirect loops, missing locations, and chains that exceed the product's documented limit. Do not invent a limit in the test if the product has not defined one. Make that ambiguity a requirement question.

The following sketch uses the standard \`fetch\` redirect mode that returns redirect responses to application code. It resolves a relative \`Location\` against the current URL and calls the same validation function for the next hop.

\`\`\`ts
export async function fetchWithPolicy(
  initial: URL,
  validate: (url: URL) => Promise<void>,
  remainingRedirects: number,
): Promise<Response> {
  await validate(initial);
  const response = await fetch(initial, { redirect: 'manual' });

  if (response.status < 300 || response.status >= 400) {
    return response;
  }
  if (remainingRedirects === 0) {
    throw new Error('redirect_limit');
  }

  const location = response.headers.get('location');
  if (!location) {
    throw new Error('redirect_without_location');
  }

  const next = new URL(location, initial);
  return fetchWithPolicy(next, validate, remainingRedirects - 1);
}
\`\`\`

This is a teaching example, not a production downloader. A production implementation also needs method semantics, credential stripping, request-header policy, timeouts, response limits, content validation, cancellation, logging, and protection against resolution changes at connection time.

## Test alternate address forms through normalization, not guesswork

Attackers use noncanonical textual representations because weak filters compare strings. Depending on the runtime and parser, numeric IPv4 variants, IPv4-mapped IPv6, compressed IPv6, hexadecimal-looking text, or trailing-dot hostnames may normalize or reject differently. Your suite should capture the actual behavior of the exact parser and request library in production.

Create a characterization test that logs structured parser output and whether the networking layer accepts the destination. Review the results, then convert them into explicit pass or deny assertions. Never treat a parser crash as a secure denial; the API should return a controlled client error and avoid a fetch.

| Case result | Security meaning | Test action |
|---|---|---|
| Parser rejects before policy | No destination exists | Assert stable error and zero canary requests |
| Parser canonicalizes to denied IP | Policy must classify normalized address | Assert denial at address stage |
| Parser preserves hostname text | DNS stage still determines address | Inject denied resolution and assert no connect |
| Validator and client disagree | Potential parser differential | Block release until one representation is used |
| Runtime behavior changes after upgrade | Security contract may have shifted | Review characterization diff before accepting |

This is a valuable place for dependency-upgrade testing. A runtime or HTTP client upgrade can change accepted URL syntax or redirect behavior without touching application code. Keep the characterization corpus deterministic and require security review for meaningful diffs.

## Cover indirect fetchers and secondary requests

An endpoint may validate the top-level URL correctly while a renderer, media processor, XML parser, or browser engine fetches embedded resources. HTML can reference images, stylesheets, fonts, frames, and scripts. A document converter may follow those references from its own process with different proxy settings.

Build a benign allowed page that embeds a canary URL classified as denied. Request the page through the feature, then assert the canary remains untouched. Repeat for each supported resource type that the component actually loads. If the business feature does not need network subresources, disable them or render from downloaded, sanitized content under an isolated policy.

Out-of-band jobs deserve the same attention. A webhook may be queued and delivered seconds later, so an immediate API response cannot prove denial. Carry the case ID through the job payload, wait within a bounded test window, inspect worker audit events, and query the canary. The assertion belongs at the eventual network boundary.

Features that validate JWT issuers or retrieve remote key sets can also perform server-side requests, but their trust and caching model needs its own threat analysis. The [JWT key rotation and JWKS cache testing guide](/blog/testing-jwt-key-rotation-jwks-cache) covers correctness and resilience for that specialized path.

## Make failures diagnosable without leaking sensitive destinations

A secure denial should be observable to operators but restrained for callers. Return a stable error such as \`destination_not_allowed\` rather than echoing resolved internal addresses or low-level socket details. Internally, record a correlation ID, policy stage, normalized scheme, host classification, port decision, redirect hop, and rule identifier. Apply your log-retention and privacy requirements.

Make the audit event distinguish policy rejection from ordinary connectivity failure. A rejected scheme, disallowed host, denied DNS answer, blocked redirect hop, connection timeout, and oversized response are different conditions. If they collapse into one generic exception, QA cannot prove that the expected barrier acted. At the same time, avoid turning logs into a destination-discovery channel. Store normalized classifications and protected diagnostic detail, restrict access, and rate-limit repetitive events. Alert on changes in family distribution, such as a sudden cluster of credential-confusion URLs or allowed hosts redirecting into denied scope. These signals can expose both hostile probing and a broken partner integration.

Test failure handling when telemetry is unavailable. Security policy must fail closed even if the audit exporter, metrics backend, or tracing system is slow. Inject a logging failure in an integration environment and assert that the destination remains blocked, the API finishes within its error budget, and a local fallback signal is available. Observability supports the control; it must not become a prerequisite for enforcing it.

An integration test can assert both the API and the canary:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

test('redirect to denied canary is blocked before contact', async () => {
  const before = await fetch('http://127.0.0.1:4310/events').then((r) => r.json());

  const response = await fetch('http://127.0.0.1:4300/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: 'http://fixture.test:4310/redirect-to-canary',
    }),
  });

  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.code, 'destination_not_allowed');

  const after = await fetch('http://127.0.0.1:4310/events').then((r) => r.json());
  assert.deepEqual(after, before);
});
\`\`\`

A frequent realistic failure is an image-import endpoint that validates the submitted hostname, then calls a client configured to follow redirects. The test receives a 422 because the final content type is rejected, so the team assumes the control worked. The canary log shows a GET arrived before the 422. Diagnosis reveals that validation happened only at submission and response validation happened after the fetch. Switching to per-hop destination validation and adding egress denial fixes the actual flaw.

## Convert the corpus into release evidence

Run fast parser and policy tests on every change. Run network integration cases in an isolated CI job when fetch code, runtime dependencies, proxy configuration, or egress policy changes. Schedule the broader indirect-fetch suite because renderers and asynchronous jobs take longer.

| Suite | Trigger | Fixture | Required artifact |
|---|---|---|---|
| Parser characterization | Runtime or URL-library change | Static case data | Normalized output diff |
| Policy unit tests | Every pull request | Injected parsed URLs and DNS answers | Rule and stage assertions |
| Redirect integration | Fetch-client or proxy change | Local redirect plus canary servers | API result and zero-contact proof |
| Egress verification | Network-policy change | Canary in denied test segment | Connection-denial event |
| Indirect fetch suite | Renderer or importer change | Allowed document with denied subresources | Per-resource canary log |
| Asynchronous delivery | Worker or queue change | Correlated job and canary | Audit timeline and sink query |

Security tests are good candidates for agent assistance, but review generated cases against the threat model. An agent can vary syntax rapidly, yet it may duplicate cases, assert parser behavior that is not true in your runtime, or suggest contacting sensitive addresses. Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a reviewed workflow matches your stack; keep destination policy and test-environment boundaries under human ownership.

For a broader view of where agents help and where they need verification, see the [AI-augmented software testing guide](/blog/ai-augmented-software-testing-2026-guide). SSRF coverage is strongest when an agent expands a human-designed matrix, while deterministic fixtures and network evidence decide pass or fail.

## Frequently Asked Questions

### Is a blocklist of private IPv4 ranges enough for SSRF testing?

No. A complete defensive test must consider IPv6, loopback, link-local, reserved and organization-specific networks, hostname resolution, mixed DNS answers, redirects, alternate textual forms, and secondary fetches. Even a correct application classifier should be backed by egress restrictions. If the business feature permits only known partners, an exact scheme-host-port allowlist is easier to reason about. Tests should prove denial before connection by checking a harmless canary, rather than accepting a returned error as evidence that no request occurred.

### How can QA test DNS rebinding without touching real infrastructure?

Use an isolated DNS fixture that you control and a test HTTP service with no secrets. Configure the fixture to return different test-network answers across resolution events, then observe whether the application validates the address used for the actual connection. Static host mappings cannot model the timing issue. Keep the environment disconnected from production and corporate networks. If reproducing connection-level behavior is too costly in regular CI, unit-test injected answer sequences and run the full DNS scenario in a dedicated security environment after resolver or networking changes.

### Should an SSRF test expect a particular HTTP status code?

Expect the status documented by your API contract, not a universal security status. A validation failure might reasonably be represented as a client error, while an upstream timeout has different semantics. More important assertions are a stable non-sensitive error code, an audit event at the correct policy stage, and zero contact with the denied canary. Avoid exposing normalized internal addresses or socket errors to the caller. Consistent responses also prevent clients from depending on library-specific error text that can change during runtime upgrades.

### What is the smallest useful SSRF regression corpus?

Start with one valid allowed destination and denied cases for unsupported scheme, credentials, hostname lookalike, unexpected port, loopback IPv4, loopback IPv6, a mixed DNS answer, and an allowed first hop redirecting to a denied canary. Add response-size and secondary-resource cases when the feature downloads or renders content. Each item needs an expected rejection stage and a canary assertion. This small classified set provides more value than hundreds of unexplained strings because failures immediately identify which decision boundary regressed.
`,
};
