import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CORS preflight cache policy testing',
  description:
    'CORS preflight cache policy testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Security Testing',
  primaryKeyword: 'CORS preflight cache policy testing',
  keywords: [
    'CORS preflight cache policy testing',
    'CORS preflight cache test',
    'Access-Control-Max-Age validation',
    'origin separated preflight cache',
    'CORS policy change invalidation',
    'OPTIONS request cache behavior',
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
  content: `CORS preflight cache policy testing uses two web origins and one API while the API counts each OPTIONS call. Run the same request twice, then change just one key fact; a new origin, method, header name, credential mode, or old grant must make the browser ask again.

## What does CORS preflight cache policy testing verify?

This test checks when the web browser may reuse a past yes from the API. It links each OPTIONS call to one real request, so the team can see a cache hit, a new check, a browser block, or a server block.

- A preflight is an OPTIONS request sent before certain cross-origin requests. Its response tells the browser which origin, methods, headers, and credential behavior the server permits.

- The [Fetch Standard](https://fetch.spec.whatwg.org/) defines CORS-preflight fetch and its cache. That specification is the primary source for cache entries, max age, method, header name, origin, and credentials behavior.

- The observable cache-hit signal is no new OPTIONS request before an actual request with the same controlled tuple. A server-side counter is stronger than inferring a hit from page timing.

- A cache-miss signal is a new OPTIONS request carrying the expected Origin, Access-Control-Request-Method, and requested-header list. The test should then observe whether the actual request follows.

- Origin separation means approval for one requesting origin must not automatically authorize another origin. Give each origin a distinct host or port and record the Origin value at the API.

- Method and non-safelisted request headers belong in the tuple. Changing POST to PUT or adding X-Test-Mode should create a new permission question for the browser.

- Credentials affect CORS rules and wildcard handling. Keep credentials mode explicit, and use synthetic cookies only in an isolated test system when that branch matters.

- Access-Control-Max-Age gives a server-advertised cache duration, but user agents can impose their own limits. Assert bounded reuse and eventual revalidation rather than assuming every browser honors one exact long duration.

- The repository path seed-skills/security-best-practices/SKILL.md supplies a security review workflow with explicit evidence, severity, and remediation. It does not contain a browser preflight cache implementation, so this article marks the harness as a recommended regression design.

- The path seed-skills/owasp-security/SKILL.md includes restrictive CORS header checks and says security tests should run in isolated environments. Its header assertion is a starting point, while this matrix adds browser cache behavior.

- The [security testing guide](/blog/security-testing-complete-guide) covers broader header and access checks. This article owns preflight reuse, separation, expiry, and policy-change observations.

- A passing baseline needs one OPTIONS request, one successful actual request, and matching identifiers in browser and server logs. If that control fails, do not interpret later request counts as cache evidence.

CORS preflight cache policy testing needs one clear pass and one clear miss for each key in scope. It must also show that the server still guards its work, since a CORS rule in the browser is not a user or access check.

## How do you build a CORS preflight cache test?

Serve two small pages from two true origins and let both call one test API. Start each row in a new browser, use a short cache time, save safe request facts, and change just one fact after the first OPTIONS and real call both pass.

- Serve origin A and origin B from different origins, even if both use loopback. Distinct ports are enough for browser origin comparison when scheme and host stay fixed.

- Give the API a configurable allowlist for origins, methods, request headers, and credentials. Changes should be versioned by a test-only policy identifier that never appears in production.

- Record OPTIONS and actual events at the API with test ID, sequence, origin, method, requested method, requested header names, policy version, and monotonic server time.

- Return explicit Access-Control-Allow-Origin values for credentialed cases. Avoid a wildcard fixture when the goal is origin separation because it answers a different policy question.

- Use one custom header such as X-Test-Mode to guarantee a preflight. Keep its value stable because preflight permission concerns the header name, not each ordinary value.

- Reset counters before navigation and verify the reset response. A stale event from another worker can make the first request look like a cache miss.

- The first code example adapts the isolation and evidence guidance in seed-skills/security-best-practices/SKILL.md. It drives a real browser page and reads an isolated server probe after two equivalent calls.

\`\`\`typescript
import { expect, test } from '@playwright/test';

type Probe = {
  options: Array<{ origin: string; method: string; headers: string[] }>;
  actual: Array<{ origin: string; method: string; testId: string }>;
};

test('reuses an approved preflight for the same request tuple', async ({
  browser,
  request,
}) => {
  const testId = 'same-tuple-01';
  await request.post(\`\${process.env.API_URL}/__probe/reset\`, {
    data: { testId, maxAge: 60, allowedOrigins: [process.env.APP_A_URL] },
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(process.env.APP_A_URL!);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const status = await page.evaluate(
      async ({ apiUrl, id }) => {
        const response = await fetch(\`\${apiUrl}/records\`, {
          method: 'PUT',
          headers: { 'X-Test-Mode': 'cache', 'X-Test-Id': id },
          body: JSON.stringify({ attempt: id }),
        });
        return response.status;
      },
      { apiUrl: process.env.API_URL!, id: testId },
    );
    expect(status).toBe(204);
  }

  const probe = await request
    .get(\`\${process.env.API_URL}/__probe/\${testId}\`)
    .then((response) => response.json() as Promise<Probe>);

  expect(probe.options).toHaveLength(1);
  expect(probe.actual).toHaveLength(2);
  await context.close();
});
\`\`\`

- This example assumes the test server emits correct CORS responses and groups events by X-Test-Id. The production endpoint should never expose the probe or accept test policy controls.

- The second request must use the same page context. A new context has separate browser state and cannot prove reuse inside one preflight cache.

- Assert event contents before counts. One OPTIONS event for the wrong origin or method is not a valid baseline even if the total looks correct.

- Use the [API security checklist](/blog/api-security-testing-checklist-2026) for adjacent authorization coverage. Keep bearer-token and permission decisions on the server, beyond this browser gate.

## What breaks Access-Control-Max-Age validation?

The check is weak if it counts the wrong call, shares old browser state, or waits on a sharp time edge. It is also weak if it claims that a server rule change can wipe a cache held by the browser, or if a proxy hides where OPTIONS went.

- An exact sleep at the declared boundary is unstable because scheduling, network delay, and clock choice affect which side of expiry the request reaches. Use an inside window and an outside window with clear margins.

- Count OPTIONS by HTTP method at the API. An actual PUT with a 204 response is not evidence that a preflight happened on that attempt.

- Record Access-Control-Request-Method and requested-header names from OPTIONS. These values prove which actual request the browser was asking to send.

- A changed server allowlist does not push an invalidation event into browser memory. A browser may reuse an unexpired approval, so the actual endpoint must still enforce its own current access policy.

- A shared context can retain approval from a prior test. Start each scenario with a new context and a unique API URL or test identifier when the runner executes cases in parallel.

- A reverse proxy can answer or cache OPTIONS independently from the application. Record a server marker at each layer, or bypass the proxy for the focused cache test.

- A browser can cap a large Access-Control-Max-Age. Treat the observed cap as runtime behavior and keep a compatibility matrix instead of declaring the server value universally honored.

- Zero max age should produce fresh validation on the next qualifying request, but event ordering still matters. Wait for the first actual request to finish before starting the second one.

- Changing a custom header value alone should not be confused with adding a custom header name. Build separate fixtures because the preflight header list contains names.

- A failed actual fetch can represent a denied preflight, an actual response lacking CORS approval, DNS failure, or application rejection. Correlate browser error with server OPTIONS and actual events before assigning ownership.

- The [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) provides wider response-header guidance. It does not replace the Fetch algorithm or define a browser's chosen cache cap.

- The [OWASP ZAP API guide](/blog/owasp-zap-api-security-testing-guide-2026) can scan exposed policy. A scanner alone cannot prove that one browser context reused or separated a cache entry.

## origin separated preflight cache fixtures and controls

Give each request a short test ID and give each origin its own page and port. The grid should prove one good call, same-key reuse, a new origin check, a new header check, time based expiry, a denied rule, repeat runs, and clean end state.

- The baseline uses origin A, PUT, X-Test-Mode, omitted credentials, and max age 60. Expect one matching OPTIONS event followed by one successful actual event.

- The reuse case repeats that request in the same context. Expect a second actual event with no second OPTIONS event while the observed cache entry remains valid.

- The origin case sends the same request from origin B. Expect an OPTIONS event carrying origin B, regardless of origin A's prior approved request.

- The header case adds X-Trace-Mode while retaining the origin and method. Expect a new OPTIONS request whose requested-header list contains both custom names.

- The method case changes PUT to DELETE and changes nothing else. Expect a fresh preflight for DELETE, then follow the configured allow or deny result.

- The credentials case creates a separate context with a synthetic cookie and credentials include. Record the mode in the test input because it is not directly present as one simple request header.

- The zero-age case returns Access-Control-Max-Age: 0 and performs two serialized calls. Expect two OPTIONS events and two actual requests when both policy checks allow access.

- The expiry case uses a small accepted duration and an outside margin. Confirm elapsed server time between the first approval and the next OPTIONS rather than trusting a page-side timestamp alone.

- The denied case removes origin B from the allowlist before its first call. Expect OPTIONS to reach the server, no successful actual request, and a browser-visible fetch rejection.

- The policy-change case first approves a tuple, then changes the server policy during that entry's lifetime. Accept that the browser may send the actual request without a new preflight, but require the server's current authorization to reject protected work.

- The repeat control reruns each case in a fresh context and expects the same event sequence. Different counts usually point to cleanup, worker collision, or a runtime cache cap.

- Cleanup closes contexts, clears test policy, and deletes synthetic events after artifacts are written. Verify cleanup state so later cases cannot inherit the prior allowlist.

## How should CORS policy change invalidation be asserted?

Check what the browser and server did, not a cache flush that the server cannot send. Save the rule version on both OPTIONS and real calls, then ask again after the time ends and make sure the server blocks newly banned work at once.

- Before the change, require one approved OPTIONS response and one successful actual request for the selected tuple. Save the policy version and server sequence.

- Change the allowlist through an isolated control endpoint and wait for its confirmed version. Do not infer activation from the control request's status alone.

- Repeat inside the prior cache window. The browser may omit OPTIONS, so inspect whether the actual request arrives under the new server policy.

- For a protected operation, require the application to reject the newly denied actual request even if CORS preflight permission remains cached. CORS is not the server's authorization check.

- After the cache window plus a safe margin, repeat again and require a new OPTIONS carrying the same tuple. Its response should reflect the new policy version.

- If no actual request reaches the server inside the window, capture the page error and browser version. That can still be valid runtime behavior, but it is not proof of server-triggered invalidation.

- The OAuth 2.0 [security best current practice](https://www.rfc-editor.org/info/rfc9700) concerns authorization threats and token protections. It supports keeping access controls independent from browser CORS policy, rather than treating an allowed origin as identity.

- The [CSP Level 3 specification](https://www.w3.org/TR/CSP3/) defines a different browser-enforced response policy. Cite it to keep CSP directives and CORS preflight cache claims separate, not to infer CORS behavior from CSP.

- The second example adapts negative security cases from seed-skills/owasp-security/SKILL.md. It compares event traces and proves a policy change did not silently authorize protected work.

\`\`\`typescript
type Event = {
  kind: 'OPTIONS' | 'ACTUAL';
  origin: string;
  policy: number;
  status: number;
};

function eventsAfterPolicy(events: Event[], policy: number) {
  return events.filter((event) => event.policy >= policy);
}

it('rejects protected work after the allowlist changes', () => {
  const trace: Event[] = [
    { kind: 'OPTIONS', origin: 'https://a.test', policy: 1, status: 204 },
    { kind: 'ACTUAL', origin: 'https://a.test', policy: 1, status: 204 },
    { kind: 'ACTUAL', origin: 'https://a.test', policy: 2, status: 403 },
    { kind: 'OPTIONS', origin: 'https://a.test', policy: 2, status: 403 },
  ];

  const changed = eventsAfterPolicy(trace, 2);
  expect(changed[0]).toMatchObject({
    kind: 'ACTUAL',
    policy: 2,
    status: 403,
  });
  expect(changed.at(-1)).toMatchObject({
    kind: 'OPTIONS',
    policy: 2,
    status: 403,
  });
  expect(changed.some((event) => event.status === 204)).toBe(false);
});
\`\`\`

- The trace uses status for test clarity, but browsers can hide CORS response details from page code. Server logs remain the authoritative source for received requests and policy decisions.

- Never weaken server authorization so this browser test can observe a cached grant. Use a harmless synthetic operation and require the current policy at the application boundary.

- The strongest result reports two facts: whether the browser sent OPTIONS and whether the current server policy accepted actual work. Combining those facts into one pass flag hides the important distinction.

## OPTIONS request cache behavior in CI

Run one fixed browser build and save a short list of safe events. The CORS preflight cache policy testing job should fail on wrong reuse, shared state, stale access, no test rows, or an OPTIONS call that cannot be tied to the real call; see the [security FAQ](/faq) for triage.

- Pin browser name, browser version, operating system image, test runner, server revision, and proxy mode. Cache caps and network behavior can vary across runtime families.

- Give every worker separate origins, API state, and test identifiers. Reusing one loopback port across workers can mix event traces even when browser contexts are distinct.

- Synchronize on server events instead of arbitrary page sleeps. Poll for a known sequence with a deadline, then report the missing event when time expires.

- Run the same-tuple baseline before negative rows. If one request unexpectedly creates two OPTIONS events, stop and report runtime or setup drift.

- Keep timing cases in a dedicated serial group. Concurrent load can move a boundary request beyond the intended window and make a correct cache look wrong.

- Report request tuple, policy version, relative server time, OPTIONS count, actual count, statuses, and browser error category. Omit tokens, cookies, bodies, and real user origins.

- Distinguish a browser refusal from a server rejection. The first may have OPTIONS but no actual event, while the second has an actual event with a denied status.

- Set expected case and event counts. A browser crash with no traces must not produce a green policy report.

- Run one Chromium project on every change and a cross-browser schedule for compatibility. Do not force all browsers to exhibit an identical implementation cap beyond the standard's required behavior.

- Keep the proxy path as a separate project if production uses one. Direct and proxied traces reveal whether hidden intermediary caching changes OPTIONS behavior.

- The [authentication and authorization guide](/blog/authentication-authorization-testing-guide) owns server access checks. Link failures there when protected work succeeds under a newly denied policy.

- CORS preflight cache policy testing should remain an isolated browser integration gate. API clients that do not implement browser CORS cannot substitute for it.

## CORS preflight cache policy testing comparison matrix

Each row changes one key or one time rule and keeps the rest of the call fixed. Start from a clean browser and a known server rule, then use the [API security guide](/blog/api-security-testing-checklist-2026) for checks that sit past this small grid.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Same tuple inside max age | Repeat origin A, PUT, and X-Test-Mode | One OPTIONS and two successful actual events | A fresh OPTIONS appears without an explained cap | [Fetch Standard](https://fetch.spec.whatwg.org/) |
| Different requesting origin | Repeat from origin B | A new OPTIONS records origin B | Origin A approval suppresses origin B policy check | seed-skills/owasp-security/SKILL.md |
| New custom header | Add X-Trace-Mode only | A new OPTIONS lists the added header name | Prior entry covers an unapproved header name | seed-skills/security-best-practices/SKILL.md |
| Policy changes in window | Remove origin A after approval | Trace separates cached browser behavior from current server denial | Protected actual work succeeds under denied policy | [OAuth security practice](https://www.rfc-editor.org/info/rfc9700) |
| Zero or expired max age | Serialize two calls after no-cache or expiry | A fresh OPTIONS uses the current policy | Old approval remains beyond the observed window | [OWASP header guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) |

- Row one proves reuse rather than merely proving two calls succeed. Both actual events and the single matching OPTIONS event are required evidence.

- Row two proves origin separation with a distinct Origin value at the server. A new page at the same origin does not test this condition.

- Row three changes the requested-header name, not only its value. The event should show the full normalized requested-header list.

- Row four has two oracles because browser permission and server authorization are different controls. The test records both without claiming that policy activation clears cache.

- Row five uses clear timing margins and server time. If a browser applies a lower cap, record that runtime result and adjust only the compatibility expectation.

- Add method and credentials rows when the application uses those branches. Keep the five core rows stable so reports remain comparable across releases.

## How do you implement CORS preflight cache policy testing?

Use two known web origins, one test API, a real browser, and a safe server log. Prove the good path first, change one key per row, and keep browser cache facts apart from the server access result; the [security blog](/blog) can guide the next test layer.

1. Read seed-skills/security-best-practices/SKILL.md and seed-skills/owasp-security/SKILL.md. Record their isolation, CORS, evidence, and cleanup guidance while labeling the detailed cache harness as this article's recommended test design.
2. Start two page origins and one API origin with test-only policy controls and an event probe. Assign unique ports, policy state, and test identifiers to each worker before opening a browser context.
3. Run origin A with one preflighted PUT request, then verify the exact OPTIONS tuple, approved response fields, actual request, policy version, and safe event count. Stop if this positive control fails.
4. Repeat the tuple, change origin, add a header name, change method, set zero max age, cross expiry, and activate a denied policy in separate cases. Keep unrelated request data fixed.
5. Compare each trace with the scenario matrix, distinguishing cache hit, cache miss, browser denial, server denial, setup failure, and missing evidence. Preserve the first differing event and browser metadata.
6. Run fixed-runtime checks in CI, close every context, remove policy controls, verify probe cleanup, and schedule cross-browser compatibility runs. Route protected-access failures to the server authorization owner.

- Keep max-age windows short enough for CI but wide enough to avoid boundary races. One inside request and one clearly outside request give better evidence than many tight sleeps.

- Use a monotonic server clock for relative event timing. Wall-clock changes should not alter whether a request fell inside the test window.

- Reject test endpoints in production builds. Their policy controls and request probes exist only for a sealed test environment.

- Validate response policy fields as well as counts. One OPTIONS event with the wrong allowed origin should not be accepted as a useful cache miss.

- Compare browser and server identifiers for every actual call. This catches retries or hidden requests that inflate counts without belonging to the selected step.

- Browse [QA security skills](/skills) for the repository workflows used by this design. The product still needs its own origin, method, header, and credentials policy.

- Use the [blog index](/blog) to connect scanner, header, and authorization results. Keep this gate responsible for browser preflight reuse and invalidation observations only.

Preflight cache analysis should retain the normalized request tuple, credential mode, policy revision, response directives, and monotonic timestamps for every correlated event. That structured evidence separates browser cache reuse from proxy behavior, application authorization, network failure, or instrumentation loss without depending on inaccessible internal browser state.

Deterministic validation also requires isolated browser contexts, independent origin servers, unique worker namespaces, bounded timing windows, and verified cleanup after every scenario. Recording runtime-specific cache limits as compatibility data prevents a user-agent optimization from being mislabeled as a server policy regression.

## Frequently Asked Questions

### How can QA validate CORS preflight cache duration, invalidation, origin separation, and changed server policy?

Drive a real web browser from two known origins and count OPTIONS plus real calls at the API. Repeat one request in its time span, then change origin, method, header name, login mode, rule, and age one by one; judge the safe event list, not hidden browser state.

### What should an CORS preflight cache test fixture record?

Save the test ID, browser build, page origin, API path, method, asked-for header names, login mode, rule version, max age, server time, OPTIONS result, real result, and clean end state. Leave out keys, cookies, bodies, and all real user origins from the report.

### Which failure proves Access-Control-Max-Age validation is broken?

A known request that asks again too soon, or an old grant that never asks again, can prove a fault once the good row passes. Use wide time gaps and server facts; if one browser uses a shorter cap, test that known cap instead of calling it an app bug.

### How do teams isolate origin separated preflight cache?

Use two true origins, two pages, fresh worker ports, and one API log keyed by test ID. Let origin A pass, then send the same call from origin B; a new OPTIONS with origin B must come before any allowed real call, no matter what A cached.

### Which assertion is strongest for CORS policy change invalidation?

Check both the browser call list and the rule now used by the server. OPTIONS may be gone while an old grant lives, but banned work must still fail; once that grant is old, require a new OPTIONS call that bears the new rule version.

### How should CI report OPTIONS request cache behavior failures?

Report the request key, browser build, rule version, short event times, planned and seen OPTIONS counts, real call count, status, and web error type. Keep setup, browser block, and server block apart; fail a short run, mask keys, and save only fake test events.

## Conclusion

CORS preflight cache policy testing works when the browser and server logs agree on reuse, new origins, new header names, login mode, and age. A server rule change must also block banned work, since a CORS pass is not proof of who the user is.

Read the [security testing guide](/blog/security-testing-complete-guide), then open verified [QA skills](/skills) and run this five-row grid in a clean browser. Keep the safe request log with the test, so a new browser or server build can be checked against the same known facts.`,
};
