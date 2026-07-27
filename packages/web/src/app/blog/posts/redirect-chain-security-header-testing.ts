import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'redirect chain security header testing',
  description:
    'redirect chain security header testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Security Testing',
  primaryKeyword: 'redirect chain security header testing',
  keywords: [
    'redirect chain security header testing',
    'security headers redirect chain',
    'HSTS redirect hop test',
    'CSP on redirect response',
    'redirect Referrer-Policy test',
    'header audit every location',
  ],
  relatedSlugs: [
    'security-testing-complete-guide',
    'api-security-testing-checklist-2026',
    'owasp-zap-api-security-testing-guide-2026',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://www.w3.org/TR/CSP3/',
    'https://fetch.spec.whatwg.org/',
    'https://www.rfc-editor.org/info/rfc9700',
    'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'seed-skills/security-best-practices/SKILL.md',
    'seed-skills/owasp-security/SKILL.md',
  ],
  content: `- Redirect chain security header testing records every response without automatic following, then applies a protocol-aware policy to each hop. No universal header set belongs on every redirect: HSTS matters on secure responses, Referrer-Policy can affect onward requests, CSP does not transfer to another origin, and sensitive credentials must not cross an unapproved boundary.

## What does redirect chain security header testing verify?

- The contract is per-response policy continuity, not blind header duplication. Every hop has an expected status, parsed Location, source and target origin, transport, credential rule, security-header profile, and final destination.

- The [Fetch Standard](https://fetch.spec.whatwg.org/) defines redirect modes as follow, error, or manual, with follow as the default. It also defines Location parsing and updates request referrer policy while redirect processing continues.

- Automatic following hides the intermediate response that redirect chain security header testing needs. A manual client should record the response first, validate it, resolve Location against the current URL, apply an origin policy, and only then issue the next request.

- The [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) describes HSTS, Referrer-Policy, CSP, and related response protections. It recommends HSTS for HTTPS enforcement and a deliberate Referrer-Policy rather than relying on every client default.

Those sources lead to several distinct assertions:

- An HTTP entry hop must point to an approved HTTPS URL without reflecting an arbitrary target. HSTS received over insecure transport is not the proof for that first upgrade.

- Each HTTPS response in the owned chain follows the product's HSTS policy. The test validates directive syntax and intended scope, not only header presence.

- Referrer-Policy is evaluated on every response where the product requires it. A missing intermediate policy can change what the next cross-origin request receives.

- CSP is evaluated against the response it protects. A policy on one origin must not be treated as inherited by the final document at another URL.

- Location must parse against the current response URL, use an allowed scheme, stay within the hop limit, and satisfy the origin allowlist for that route.

- Cookies, Authorization, and other credentials follow an explicit forwarding rule. The walker strips them before any unapproved origin transition.

- A redirect response cannot add a weaker cookie or expose server details merely because its body is not the final page. Header policy still applies to that response profile.

- Loops, missing Location, malformed Location, unsupported schemes, excessive hops, and unexpected final status all fail with the first offending URL.

- The repository file seed-skills/security-best-practices/SKILL.md requires stack-aware checks, safe error handling, validation at system boundaries, and proof tied to a location. The file seed-skills/owasp-security/SKILL.md includes HTTPS, security-header, restrictive CORS, cookie, and evidence patterns.

- The OWASP repository example checks common headers on a successful response. This article extends that evidence model to every redirect while keeping header requirements specific to response purpose and transport.

- Use the [security testing complete guide](/blog/security-testing-complete-guide) for the wider program. This page owns redirect visibility, per-hop policy, and safe continuation.

## How do you build a security headers redirect chain?

- A security headers redirect chain fixture needs two local HTTPS origins plus one HTTP entry server. Give each route a fixed response profile and a test-only control that can omit one header, change Location, or add an unsafe credential target.

- Create named chains for HTTP upgrade, same-origin temporary movement, same-origin permanent movement, approved cross-origin handoff, missing policy, malformed Location, and loop. Keep response bodies tiny so header evidence remains the focus.

- Use certificates trusted by the test environment. Disabling TLS verification would remove the transport assurance that the HTTP-to-HTTPS case is meant to examine.

- Build a policy manifest before execution. Each expected hop should define allowed statuses, allowed target origins, whether HSTS is required, which Referrer-Policy values are accepted, whether CSP is required for that response, and which credentials may continue.

- Run a two-hop same-origin positive case first. It proves manual following, relative Location resolution, response capture, TLS, header normalization, hop limits, and final status before fault injection.

- This TypeScript walker adapts boundary validation and evidence guidance from seed-skills/security-best-practices/SKILL.md. It does not forward credentials across an origin change.

\`\`\`typescript
type Hop = {
  url: string;
  status: number;
  location: string | null;
  target: string | null;
  headers: Record<string, string | null>;
};

export async function walkRedirects(
  startUrl: string,
  allowedOrigins: Set<string>,
  maxHops = 6,
): Promise<Hop[]> {
  const hops: Hop[] = [];
  const visited = new Set<string>();
  let current = new URL(startUrl);

  for (let index = 0; index <= maxHops; index += 1) {
    if (visited.has(current.href)) {
      throw new Error('redirect loop at ' + current.href);
    }
    visited.add(current.href);

    const response = await fetch(current, {
      redirect: 'manual',
      headers: { Accept: 'text/html' },
    });
    const location = response.headers.get('location');
    const isRedirect = response.status >= 300 && response.status < 400;
    const target = isRedirect && location ? new URL(location, current) : null;

    hops.push({
      url: current.href,
      status: response.status,
      location,
      target: target ? target.href : null,
      headers: {
        hsts: response.headers.get('strict-transport-security'),
        csp: response.headers.get('content-security-policy'),
        referrerPolicy: response.headers.get('referrer-policy'),
        setCookie: response.headers.get('set-cookie'),
      },
    });

    if (!isRedirect) return hops;
    if (!target) throw new Error('redirect response has no valid Location');
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('redirect uses an unsupported scheme');
    }
    if (!allowedOrigins.has(target.origin)) {
      throw new Error('redirect target origin is not approved');
    }
    current = target;
  }

  throw new Error('redirect hop limit exceeded');
}
\`\`\`

- A production client might need controlled cookies or Authorization on same-origin hops. Add them through a credential policy object rather than a shared default header bag, and record only redacted presence in artifacts.

- Browser fetch with manual cross-origin redirects can expose filtered responses, so a server-side test client is better for raw intermediate headers. A browser-level companion test can verify actual referrer and cookie behavior through the destination server's request log.

- The [API security checklist](/blog/api-security-testing-checklist-2026) covers additional transport and authorization checks. Keep this walker focused on the chain manifest and per-hop evidence.

## What breaks an HSTS redirect hop test?

- An HSTS redirect hop test breaks when it expects the header on the initial plaintext response as the primary control. HSTS is an HTTPS response policy, while the HTTP entry must still redirect directly to an approved secure origin.

- Presence-only checks are weak. Parse max-age as a nonnegative integer, compare it with the product policy, and evaluate includeSubDomains or preload only when those directives are intentionally deployed.

- A same-origin redirect can omit HSTS because middleware adds headers only to successful documents. Record every HTTPS 3xx response so status-specific configuration gaps become visible.

A proxy can add HSTS at the edge while an origin integration test sees none. Run the public-route gate against the deployed edge, and keep a separate component test for application middleware.

- Certificate errors invalidate the secure-hop premise. Do not use an insecure client option to make the test pass, because that turns HTTPS presence into cosmetic evidence.

An HTTPS hop that redirects back to HTTP creates a downgrade even if both responses contain familiar headers. Reject the target scheme before issuing the request.

- Different subdomains can have different ownership and HSTS scope. The manifest must say whether an approved cross-origin handoff remains under the same policy or needs its own secure response checks.

- Caching can hide a changed redirect response. Use a unique fixture token or controlled cache policy when testing deployment changes, and record cache-related response fields when they affect observation.

- Header names are case-insensitive, but directive values still require parsing. Normalize names in the client and preserve the original value for failure evidence.

- The security repository skill says reports need severity, impact, location, and specific remediation. A failure should identify the exact hop and expected secure profile rather than saying security headers are missing.

The [OWASP ZAP API security guide](/blog/owasp-zap-api-security-testing-guide-2026) can scan wider endpoint sets. Keep the manual walker as the deterministic oracle for one known chain.

## CSP on redirect response fixtures and controls

- CSP on redirect response tests must avoid claiming that an intermediate policy protects the destination. The [CSP Level 3 specification](https://www.w3.org/TR/CSP3/) defines policies attached to responses and integrates navigation checks with Fetch.

- The final HTML control requires the application's full CSP and confirms its directives parse under the expected deployment profile.

- The same-origin redirect control applies the product's intermediate-response policy. If CSP is required there, its value is asserted independently from the final page policy.

- The cross-origin handoff control records CSP on both origins. It never carries the first origin's policy forward as evidence for the second.

- The report-only control distinguishes Content-Security-Policy-Report-Only from enforcing CSP. A report-only value cannot satisfy an enforcing requirement.

- The missing-header control removes CSP from one owned hop. It should identify that response without claiming every redirect on the public web needs the same header.

- The multiple-policy control preserves every CSP field value available through the client. Joining values incorrectly can change directive interpretation.

- The invalid-directive control supplies a malformed or unexpectedly weak policy. The test checks the approved directive profile rather than only nonempty text.

- The final non-HTML control follows a separate profile. An API redirect ending in JSON may require different protections than a rendered document.

- The intermediate-cookie control sets a synthetic cookie on one secure redirect. The next owned server records its name and flags, while the test rejects a broad Domain value, an insecure attribute set, or delivery to the second origin.

- The method control sends a synthetic POST through each status used by the product. It records the next method and body digest, then applies a status-specific rule before any credential is allowed to move with that request.

- The relative-target control uses parent paths, query text, and fragments that are safe for logs. The walker resolves each value against the current URL, then checks the normalized target origin and route rather than matching raw Location text.

- The cache control repeats one redirect with an owned response version. It records whether a cache served the hop, prevents an old target from hiding a deployment change, and keeps cache evidence separate from the security-header result.

- Use a policy manifest keyed by route and response class. Global rules are useful only where the product has actually adopted one uniform requirement.

- Capture status, content type, CSP values, target origin, and final document policy. That evidence separates a missing intermediate header from a destination configuration defect.

- The [authentication and authorization guide](/blog/authentication-authorization-testing-guide) covers protected handoffs. Redirect tests should add token and cookie forwarding controls when authentication participates in the chain.

## How should a redirect Referrer-Policy test be asserted?

- A redirect Referrer-Policy test needs two evidence channels. Record the header on each response, then inspect the next destination's server log to see the Referer value that the client actually sent.

- Exact equality fits the configured policy string when the product mandates one value. A normalized allowlist can support equivalent approved values if the deployment permits several policies.

- State transition fits the onward request. The current response supplies a policy, the redirect changes URL or origin, and the destination records the resulting referrer according to that policy.

- Cross-origin and downgrade cases need separate expectations. A same-origin request may include more detail than a cross-origin request, while a secure-to-insecure transition should not leak a sensitive source URL.

- Do not put secrets in source query strings during the fixture. The test should demonstrate policy behavior with synthetic paths, not intentionally expose real tokens to learn whether filtering works.

- The OWASP header guidance recommends strict-origin-when-cross-origin as a practical explicit policy. A project may choose a stricter value, so the manifest should enforce the documented product decision.

- Automatic browser behavior is important because a server-side walker does not reproduce a browser's referrer calculation by itself. Use the walker for headers and a browser navigation to the same fixture for destination evidence.

- Parse Location before sending any onward request. An attacker-controlled target must fail origin validation even if Referrer-Policy would reduce what it receives.

- Store only the synthetic path category and whether origin, path, or no referrer arrived. Full URLs are unnecessary in shared artifacts and can expose unrelated test parameters.

- The [authentication guide](/blog/authentication-authorization-testing-guide) explains session boundaries. Apply its credential model beside the referrer model when redirects leave an authenticated origin.

## header audit every location in CI

- A header audit every location should execute a table of public entry URLs and expected chain manifests against the deployed edge. Use a controlled fixture environment for negative cases that intentionally weaken headers or produce loops.

- Save client version, environment, start URL label, hop index, status, normalized source and target origins, Location parse result, selected safe headers, policy profile, final status, elapsed time, and cleanup result.

- Do not store Authorization values, cookie contents, OAuth codes, or sensitive query strings. Record credential presence, forwarding decision, and a safe run identifier instead.

- Fail CI for an unexpected status, missing or malformed Location, unsupported scheme, downgrade, unapproved origin, loop, excessive hops, per-hop header mismatch, leaked credential, unexpected referrer detail, or wrong final destination.

- RFC 9700 is relevant when redirects participate in OAuth. The [OAuth 2.0 security best current practice](https://www.rfc-editor.org/info/rfc9700) requires strict redirect handling and says clients must not expose open redirectors that can leak codes, tokens, or user trust.

- Run open-redirect and credential cases only against owned fixtures. Active probing of arbitrary targets can send test data outside the approved environment.

- The repository security skill emphasizes generic production errors and safe security logging. Failure artifacts should expose the first policy mismatch without copying response bodies or credentials.

- Open the [QA skills directory](/skills) for reusable security checks. Keep the positive deployed-chain gate fast, while destructive negative fixtures run in an isolated environment.

## redirect chain security header testing comparison matrix

- The matrix gives each response a transport and policy context. Redirect chain security header testing fails at the first invalid hop and does not continue toward an unapproved target.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| HTTP to HTTPS entry redirect | Plain HTTP entry points to owned HTTPS URL | Direct upgrade with valid Location and no downgrade | HTTP target, arbitrary origin, or malformed Location | [Fetch Standard](https://fetch.spec.whatwg.org/) |
| Same-origin temporary redirect | HTTPS 302 between owned routes | Per-hop HSTS and referrer profile, approved target | Headers exist only on final 200 | seed-skills/owasp-security/SKILL.md |
| Cross-origin redirect | Approved HTTPS origin handoff | Credentials stripped and both origins checked separately | Token, cookie, or inherited policy crosses boundary | [OAuth security BCP](https://www.rfc-editor.org/info/rfc9700) |
| Multi-hop chain missing one policy | One controlled HTTPS 3xx omits required header | Exact hop fails before final success can hide it | Final response alone determines pass | seed-skills/security-best-practices/SKILL.md |
| Redirect loop or invalid Location | Repeated URL or unparsable target | Loop, parse, scheme, or hop-limit diagnostic | Client follows until generic timeout | [OWASP header guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) |

- The HTTP row and HTTPS header rows have different expectations. Requiring the same HSTS evidence from plaintext and secure responses would obscure the actual upgrade contract.

- The cross-origin row stops before sending data when the origin is absent from the manifest. Header strength cannot make an unapproved destination safe.

- Use the [blog index](/blog) when the matrix exposes a broader OAuth, proxy, TLS, or application middleware issue. Preserve the exact hop evidence in the linked finding.

## How do you implement redirect chain security header testing?

- Implementation should separate collection from policy evaluation. The collector records raw safe evidence, while an assertion function applies a reviewed manifest and returns one finding per violated hop.

- This evaluator adapts explicit security-header checks from seed-skills/owasp-security/SKILL.md. It requires HSTS only on manifest hops that are both HTTPS and marked as owned secure responses.

\`\`\`typescript
type HopPolicy = {
  statuses: number[];
  allowedTargetOrigins: string[];
  requireHsts: boolean;
  acceptedReferrerPolicies: string[];
  requireCsp: boolean;
};

export function auditHop(hop: Hop, policy: HopPolicy): string[] {
  const failures: string[] = [];
  const source = new URL(hop.url);

  if (!policy.statuses.includes(hop.status)) {
    failures.push('unexpected status');
  }
  if (policy.requireHsts && source.protocol === 'https:' && !hop.headers.hsts) {
    failures.push('required HSTS is absent');
  }
  if (
    policy.acceptedReferrerPolicies.length > 0 &&
    !policy.acceptedReferrerPolicies.includes(
      (hop.headers.referrerPolicy || '').toLowerCase(),
    )
  ) {
    failures.push('Referrer-Policy is outside the approved profile');
  }
  if (policy.requireCsp && !hop.headers.csp) {
    failures.push('required CSP is absent for this response');
  }
  if (hop.target) {
    const target = new URL(hop.target);
    if (!policy.allowedTargetOrigins.includes(target.origin)) {
      failures.push('target origin is outside the approved profile');
    }
    if (source.protocol === 'https:' && target.protocol !== 'https:') {
      failures.push('secure response redirects to an insecure target');
    }
  }
  return failures;
}
\`\`\`

Follow this procedure for redirect chain security header testing:

1. Read seed-skills/security-best-practices/SKILL.md and seed-skills/owasp-security/SKILL.md, then document transport, header, credential, evidence, CI, and cleanup duties.
2. Create HTTP, same-origin HTTPS, and second-origin HTTPS fixtures with controllable temporary, permanent, cross-origin, malformed, looped, and error-ending chains.
3. Run the positive manual-follow case, recording status, Location, origin, HSTS, CSP, Referrer-Policy, cookie presence, and final destination at every hop.
4. Inject one missing policy, downgrade, arbitrary target, credential leak, malformed Location, loop, report-only CSP, or unexpected final status per run.
5. Compare transport, target, header profile, destination referrer, credential forwarding, hop count, and final state with the five-row matrix.
6. Run safe public chains in CI, retain redacted findings, close owned clients and fixture servers, and repeat the positive chain after cleanup.

- Add a browser companion case when actual navigation behavior matters. Its destination server should capture the synthetic Referer category and cookie names without retaining values.

- Do not follow an invalid target merely to gather more evidence. The safe first divergence is the failed allowlist or parser check before an outbound request occurs.

The [security testing guide](/blog/security-testing-complete-guide) can place this gate beside TLS, CSP, authentication, and API scanning. Keep each finding tied to one response profile.

## Frequently Asked Questions

### Must every redirect response contain the same security headers?

- No. Requirements depend on transport, content, route ownership, and product policy. Assert HSTS on intended HTTPS responses, evaluate Referrer-Policy where onward requests matter, and check CSP for the response it protects. Use a per-hop manifest instead of treating one final page header set as universal.

### Why should a security test disable automatic redirect following?

- Automatic following can hide intermediate statuses, Location values, security headers, cookie changes, and origin transitions. A manual client records and validates each response before continuing. A separate browser navigation can then confirm real referrer and cookie behavior without sacrificing raw per-hop evidence.

### Should HSTS be required on the first HTTP redirect?

- The important first-hop contract is a direct redirect to an approved HTTPS target without downgrade or arbitrary destination. HSTS is learned from secure responses, so validate it on the owned HTTPS hops and final response according to policy rather than using a plaintext header as primary proof.

### Does CSP on one redirect protect the final document?

- Do not assume so. Evaluate each response's CSP independently and require the final document to supply its own approved policy. For cross-origin handoffs, policies belong to different response contexts. Record report-only and enforcing fields separately because they serve different purposes.

### How should redirect tests handle Authorization and cookies?

- Start with no credentials, then add controlled synthetic values through an explicit forwarding policy. Preserve them only for approved same-origin transitions, strip them before other origins, and verify destination logs contain no forbidden values. Artifacts should record presence and decisions, never secret contents.

### What evidence identifies the first unsafe redirect hop?

- Record environment, start label, hop index, status, source and target origins, raw Location category, transport, selected header values, credential decision, referrer observation, policy profile, final state, and client version. Stop before contacting any unapproved target and report that validation failure directly.

## Conclusion

- Redirect chain security header testing is sound when every response is visible, every Location is parsed before use, and a transport-aware manifest defines the expected policy. HSTS, CSP, Referrer-Policy, cookies, credentials, loops, and final state require separate evidence rather than one final-response checklist.

Begin with a two-hop owned HTTPS chain, then add the HTTP upgrade and one approved cross-origin handoff. Inject a single missing header, downgrade, unsafe target, or loop per case and stop at the first invalid transition.

- Review the [security testing complete guide](/blog/security-testing-complete-guide), then open the [QA skills directory](/skills) and implement the redirect chain security header testing matrix in the next test run.`,
};
