import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SameSite cookie navigation matrix testing',
  description:
    'SameSite cookie navigation matrix testing: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Security Testing',
  primaryKeyword: 'SameSite cookie navigation matrix testing',
  keywords: [
    'SameSite cookie navigation matrix testing',
    'SameSite cookie navigation test',
    'Lax POST redirect cookie',
    'Strict cross site navigation',
    'SameSite None Secure test',
    'cookie request context matrix',
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
  content: `SameSite cookie navigation matrix testing proves which cookies reach a server when site status, request method, page move type, hop path, and transport change. It compares Strict, Lax, and None through clean browser contexts and server logs. The result is a request-level contract that separates browser rule from app defects.

## What does SameSite cookie navigation matrix testing verify?

SameSite cookie navigation matrix testing verifies Strict, Lax, and None use across same-site and cross-site requests, top-level actions, subresources, methods, hops, and secure transport. The decisive proof is the cookie header observed by each server hop, paired with browser cookie state and the request context that produced it.

The word "site" does not mean the same thing as origin. Ports and subdomains can change origins while a request remains within one site status, so a fixture must name both values instead of inferring one from the other.

The [Fetch Standard](https://fetch.spec.whatwg.org/) describes cookie attachment as a request operation that first determines a same-site mode, then retrieves fit cookies for the current URL and safety state. That edge makes server logs essential because a cookie stored by the browser might still be excluded from one request.

Strict is the narrow control in this matrix. The expected row allows use for same-site activity and excludes it when the tested page move remains cross-site, subject to the browser version and cookie rules recorded by the suite.

Lax adds a context-sensitive branch. A top-level page move using a safe method can differ from a form POST, fetch call, image load, or hop chain, so one successful page load cannot stand for all Lax flow.

None is tested with secure transport and an clear Secure field. The repo file \`seed-skills/security-best-practices/SKILL.md\` recommends secure, HttpOnly, SameSite cookies, while \`seed-skills/owasp-security/SKILL.md\` includes an automated Secure-flag check for session or token cookies.

Those repo facts support the safety setup, but they do not define each browser use branch. This article treats the request grid as a recommended regression design and keeps the browser build beside each expected result.

The [CSP Level 3 specification](https://www.w3.org/TR/CSP3/) describes CSP as defense in depth rather than a replacement for careful check. The same edge applies here: a passing [cookie matrix](/blog/testing-cookie-consent-regional-behavior) does not replace CSRF tokens, access checks, output handling, or a wider [security testing workflow](/blog/security-testing-complete-guide).

## How do you build an SameSite cookie navigation test?

A SameSite cookie navigation test needs two controlled sites and one target service that records each request before responding. Start with a fresh browser context, set three uniquely named cookies over HTTPS, then exercise top-level GET, form POST, fetch, image, and hop actions on its own.

Use hostnames that make the intended site status obvious. For case, \`app.test.example\` and \`start.test.example\` can represent related hosts, while \`outside.test.invalid\` represents a other site under the fixture's chosen registrable-domain model.

Do not use \`localhost\` aliases without documenting how the selected browser classifies them. A DNS or hosts-file fixture with trusted test TLS certs gives the report stable host, scheme, port, and TLS cert facts.

The target endpoint should return a compact JSON record containing case ID, hop ID, method, URL, Origin, Referer, and parsed cookie names. It should never echo real cookie values because test values are enough to prove use and avoid leaking session material.

Create one browser context per case and clear all server records by case ID. This prevents an old default cookie, service worker, cached hop, or prior login state from changing a later result.

The first good check should be simple: a same-site top-level GET over HTTPS delivers the three valid test cookies to the target. Then check that the browser still stores the expected fields, because server use alone cannot prove which stored cookie produced a header.

The first bad case should change only the start site. Keep the target path, method, browser context settings, cookie age, hop flow, and transport fixed, then compare observed cookie names with the row's exact set.

Record both the action and the final page state. A page move can finish successfully even when an expected cookie was withheld, and an app may hop to login while the browser behaved exactly as configured.

Use the [authentication and authorization guide](/blog/authentication-authorization-testing-guide) for the surrounding session checks. The narrow fixture should remain test so account rule, MFA, and production identity data cannot obscure use proof.

This baseline code adapts the Playwright cookie checks shown in \`seed-skills/owasp-security/SKILL.md\` and the clean state advice in \`seed-skills/security-best-practices/SKILL.md\`. It makes the request logger, not client-side storage, the final use rule.

\`\`\`typescript
import { test, expect } from '@playwright/test';

const target = 'https://app.test.case/record';

test('records clear SameSite cookies on a same-site GET', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addCookies([
    { name: 'strict_id', value: 'S', domain: '.test.case', path: '/', sameSite: 'Strict', secure: true },
    { name: 'lax_id', value: 'L', domain: '.test.case', path: '/', sameSite: 'Lax', secure: true },
    { name: 'none_id', value: 'N', domain: '.test.case', path: '/', sameSite: 'None', secure: true },
  ]);

  const page = await context.newPage();
  await page.goto('https://start.test.case/case/same-site-get');
  await page.getByRole('link', { name: 'Open target' }).click();
  await expect(page).toHaveURL(target);

  const record = await page.locator('body').evaluate((node) => JSON.parse(node.textContent || '{}'));
  expect(record.cookieNames).toEqual(['lax_id', 'none_id', 'strict_id']);
  await context.close();
});
\`\`\`

The exact array order should come from the logger's planned sort, not raw Cookie-header order. That small normalization keeps the check about set while preserving the first header in failure-only diagnostics.

## What breaks Lax POST redirect cookie?

A Lax POST redirect cookie case breaks when the suite labels only the final GET and forgets how the chain began. Capture each hop's method, URL, status, location, site status, and cookie names so method rewriting cannot hide the first excluded request.

A common setup error confuses origin with site. Moving from one subdomain to one more may be cross-origin, yet the cookie rule can still evaluate a same-site status, which makes an expected cross-site exclusion incorrect.

An insecure None cookie is one more setup fault. If the browser rejects the cookie when it is created, its absence on a later request proves storage check, not the page move branch that the case intended to test.

Browser defaults can also distort the comparison. A cookie without an clear SameSite value may receive browser support treatment that differs by browser and cookie age, so it belongs in a split default-rule case rather than the clear Lax row.

Hop responses need their own records. A POST that becomes a GET after a hop presents other method proof, while a status that preserves the method creates one more path through the matrix.

Cookie age matters when a browser applies a temporary browser support path. Set clear fields for the main contract, create cookies at once before each case, and report creation time if a default-value experiment is included.

Shared test profiles produce the hardest false pass. A prior case may leave an older cookie with the same name but a other domain, path, or field, and the resulting header can look correct unless stored records are captured.

Server latency is not a cookie rule. Waiting longer might allow a page transition to finish, but it cannot change a request header already sent, so retries should repeat the clean action instead of extending arbitrary sleeps.

The [API security checklist](/blog/api-security-testing-checklist-2026) helps assess CSRF, session, and access controls around this case. Keep its broader findings split from the first request-context mismatch so ownership remains clear.

The [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700) covers hop-based safety threats and stronger client protections. It does not define this cookie grid, so cite it for hop threat context rather than using it as the source of a SameSite expected value.

## Strict cross site navigation fixtures and controls

Strict cross site navigation needs good, bad, edge, repeat, and cleanup controls that vary one request fact. Each row should use the same cookie names, target path, response body, TLS cert trust, browser build, and server logger.

The good control begins on the target site and opens one more target page. It proves the Strict cookie exists, the logger reads headers, and the expected path and domain allow use.

The bad control starts on the other site and opens the same target page. It should exclude Strict under the recorded cross-site status while preserving enough proof to show that the request reached the target.

The edge control changes only the action type. Compare a top-level link, form POST, fetch call, and image request from the same initiator, then name their page move and target fields rather than grouping all browser traffic together.

The hop control records the first target hit and each following location. A final authenticated page cannot erase a missing cookie on the initial request, and an intermediate cookie update must appear as a split state change.

The repeat control runs the same case twice with a new context and a new case ID. Equal server records prove that stale storage, history, or a service worker did not become an undeclared input.

The cleanup control closes the context, clears fixture logs, stops both site servers, and removes generated TLS certs or host mappings. A follow-up probe should find no old case records under the next identifier.

Add a planned fault by changing the Strict field to Lax while retaining the cookie name. The cross-site top-level GET row must fail, which proves the test checks rule flow rather than only cookie presence.

Add one more fault by moving the cookie path away from the target endpoint. The same-site good row should fail first and report a path mismatch, preventing the suite from mislabeling ordinary scope as a SameSite defect.

The [OWASP ZAP API guide](/blog/owasp-zap-api-security-testing-guide-2026) can cover header scanning around the fixture. Do not let a clean scan replace the browser action and server-observed cookie set required by this grid.

## How should SameSite None Secure test be asserted?

A SameSite None Secure test should assert storage acceptance first, then exact use for each request context. Pair cookie name, SameSite value, Secure flag, domain, path, and expiry with the server record, page move type, method, site status, and hop hop.

Use exact set equality for cookies expected at one hop. A filled header or a matching count is weak because the wrong cookie can replace the intended one while the test remains green.

Use partial ordering for hop proof. The start request must occur before its response and the next hop, but other browser requests do not need one global order.

Use bounded timing only for waiting on the fixture's completion marker. Cookie use is a discrete header fact, so a broad response-time threshold cannot prove the use rule.

Use a state-transition check when a response sets or deletes a cookie. The report should show stored state before the action, the Set-Cookie response event, and stored state after the browser processes it.

Use a browser support check for browser differences. Pin the primary build, keep a reviewed rule per support build, and fail with the browser version when a planned run differs instead of silently widening each result.

The server record must be authoritative for use. Browser cookie APIs show what may be fit, while only the received request proves what crossed the network edge for that hop.

The [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) explains several response-header defenses and their limits. It does not define SameSite request processing, so use it to review adjacent headers without importing claims into this cookie rule.

Report rejected setup on its own from an excluded request. A None cookie missing at once after creation indicates an field or transport problem, while a stored cookie absent only on one request points to context evaluation.

Use the broader [blog index](/blog) to find related browser and safety checks, but keep this check focused. A small exact record is easier to reproduce than a full trace containing other traffic and private values.

The following bad check makes the setup phase clear and redacts values before saving proof. It also proves that a rejected insecure cookie cannot be counted as a page move result.

\`\`\`typescript
test('separates insecure None rejection from request use', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: 'none_insecure',
      value: 'redacted',
      domain: 'app.test.case',
      path: '/',
      sameSite: 'None',
      secure: false,
    },
  ]);

  const stored = await context.cookies('https://app.test.case/');
  expect(stored.map(({ name }) => name)).not.toContain('none_insecure');

  const page = await context.newPage();
  await page.goto('https://outside.test.invalid/open-target');
  await page.getByRole('link', { name: 'Open target' }).click();
  const record = await page.locator('body').evaluate((node) => JSON.parse(node.textContent || '{}'));
  expect(record.cookieNames).not.toContain('none_insecure');
  await context.close();
});
\`\`\`

If a supported browser stores this fixture differently, preserve the observed build and mark the rule for review. Do not convert a real browser support difference into a universal pass by accepting either result.

## cookie request context matrix in CI

A cookie request context matrix should run in a small HTTPS job with fixed host mappings, a pinned browser, and one worker unless ports are allocated per case. The job should fail on the first mismatched cookie set while retaining all hop records for that case.

Store fixture revision, browser version, operating system, TLS cert fingerprint, start URL, target URL, method, target, top-level flag, hop status, and cookie names. Values should stay test and be omitted from normal and failure reports.

Split setup, storage, action, server, check, and cleanup phases. This phase label tells a reviewer whether a TLS cert failed, the cookie was rejected, the click missed, the request differed, or the expected set was wrong.

Use a short completion marker returned by the target logger. Wait for that marker instead of network silence because analytics, browser updates, or development tools can keep other connections active.

Retain the first request sequence only for failed cases. A compact JSON artifact with one line per hop is enough to compare methods and cookies without uploading a complete browser profile.

Run a clean good case before fault injection. If that baseline fails, stop the matrix because bad results cannot be interpreted while the logger, TLS cert, or cookie creation path is broken.

For parallel CI, assign each worker unique host ports and case namespaces. Never share a browser context or logger bucket, since either shared resource can make test order affect use.

Use the [site FAQ](/faq) for QASkills usage questions and keep browser-rule decisions in the case report. The report must name the approved source, repo practice, and observed proof rather than claim one tool proves each browser.

The CI summary should read like a request diff: expected \`strict_id\` absent, observed \`lax_id,none_id\`, at hop \`redirect-1\`, for cross-site POST, browser build X. That message leads directly to the first differing state.

SameSite cookie navigation matrix testing is most useful as a pull-request smoke grid plus a planned cross-browser run. The smoke job protects the app contract, while the planned job identifies browser support changes that deserve an clear rule review.

## SameSite cookie navigation matrix testing comparison matrix

The SameSite cookie navigation matrix testing table fixes the action and expected proof for five high-value cases. Each row records stored fields before the action and cookie names received at each server hop afterward.

| Scenario | Controlled setup | Expected observation | Failure signal | Proof source |
|---|---|---|---|---|
| Same-site top-level page move | HTTPS target link from a related controlled host | Strict, Lax, and secure None names appear in the target record | Good control lacks a stored or received cookie | Repo safety skills and Fetch |
| Cross-site top-level GET | Same target link from the other controlled site | Reviewed build excludes Strict and records the expected Lax and None set | Site relation or cookie set differs from the case | Fetch request cookie processing |
| Cross-site form POST | Other site submits one form to the same target path | Each hop records method and exact reviewed cookie set | Final GET hides the initial POST result | Fetch and request logger |
| Cross-site subresource or fetch | Other page requests one image and one JSON endpoint | Records identify target and expected cookie exclusions | Successful resource load replaces header proof | Repo safety skills |
| Hop chain for all three values | One start URL emits reviewed hop statuses | Hop order, methods, locations, and cookie sets remain correlated | Chain is collapsed into final page state | RFC 9700 threat context and Fetch |

The first row validates setup and should run before each other row. If it fails, the suite should report cookie creation, domain, path, Secure flag, or TLS cert state rather than produce five misleading rule failures.

The GET and POST rows share all inputs except action and method. This pairing exposes a weak test that labels both cases from the final URL instead of recording the request that entered the chain.

The subresource row needs split target labels for image and fetch. Both are not top-level navigations, but transport credentials, CORS flow, and app code can still create other observable failures.

The hop row should preserve one record per hop. Compare the first missing or extra cookie, then inspect any method rewrite and Set-Cookie response before blaming the final handler.

Do not treat this table as a universal browser conformance chart. It is a reviewed app matrix whose expected sets are tied to clear fields, fixture facts, and named browser builds.

Link each changed rule to the source or browser release proof reviewed by the team. An unexplained "accept both" branch removes the regression value that the table was built to provide.

## How do you implement SameSite cookie navigation matrix testing?

Implement SameSite cookie navigation matrix testing by proving one same-site HTTPS path, then changing one request-context field per case. Keep server-side records and browser storage snapshots together so each exclusion has a visible cause.

1. Read \`seed-skills/security-best-practices/SKILL.md\` and \`seed-skills/owasp-security/SKILL.md\`, then record their session-cookie, Secure-flag, focused-testing, reporting, and cleanup practices.
2. Create two controlled sites and a target logger that records top-level GET, form POST, subresource, fetch, and hop requests over trusted test HTTPS.
3. Run the same-site good case and capture stored fields, server cookie names, page move type, method, site status, Secure state, and each hop hop.
4. Inject origin-versus-site confusion, insecure None, default fields, method-changing hops, stale cookies, and shared-profile state one fault at a time.
5. Compare each result with the five-row matrix and report the first storage, action, request, response, or cleanup value that differs.
6. Run the focused job in CI, retain redacted failure records, close each context, clear logger state, and link the finding to the matching repo path.

Begin with an endpoint that sorts cookie names and echoes no values. This keeps exact equality easy to read while the raw header remains available inside protected, failure-only logs.

Add the same-site case before testing exclusions. A bad-only suite can pass because no cookie was ever stored, the target domain was wrong, or the TLS cert prevented the browser from reaching the service.

Inject a wrong domain next. The good case should fail during storage or first use, which proves that setup errors receive a other diagnosis from cross-site rule exclusions.

Inject a stale cookie with the same name under one more path. The report should list both stored records, then show which one reached the target without exposing either value.

Change one hop status so the method is preserved instead of rewritten. The first hop that changes method or cookie set should identify the fault without depending on final page text.

Run the matrix once with a clean context per row and once with all rows shuffled. Results should match, or cleanup and namespace clean state are not strong enough for reliable CI.

Pin the pull-request browser build and schedule other supported builds. If a secondary browser differs, reproduce the same test row locally and review its expected record instead of weakening the primary gate.

The [API security checklist](/blog/api-security-testing-checklist-2026) should run after this focused suite. It can assess CSRF defenses and access flow while the cookie grid continues to own only request attachment facts.

Use the [authentication guide](/blog/authentication-authorization-testing-guide) when the test matrix is mapped to a real login flow. Preserve the same logger fields and redaction rules, but add account state only after the clean rule branch is stable.

At review time, require the case ID, changed input, expected cookie names, observed names, first differing hop, browser build, and cleanup result. Those fields make a failure actionable without a large trace or speculative explanation.

## Frequently Asked Questions

### How do SameSite Strict, Lax, and None cookies behave across top-level page move, subresources, hops, and methods?

Strict is the narrow same-site control, Lax adds context for top-level safe page move, and None targets cross-site use with secure transport. Exact results must be tested per clear field, request method, target, hop hop, and browser build. Server-received headers, not storage alone, provide the use proof.

### What should an SameSite cookie navigation test fixture record?

Record case ID, browser build, stored fields, cookie creation time, initiator and target sites, origins, method, target, top-level state, transport, hop status, and received cookie names. Preserve one line per hop and a cleanup result. Use test values, and never publish real session tokens in CI artifacts.

### Which failure proves Lax POST redirect cookie is broken?

The strongest failure shows the expected and observed Lax cookie set on the first POST and each hop hop, with methods and locations preserved. A final login page or final GET is insufficient. First exclude bad storage, wrong domain, insecure transport, stale profiles, and an unrecorded method rewrite.

### How do teams isolate Strict cross site navigation?

Teams use two controlled sites, one HTTPS target, a new browser context, clear cookie fields, and a server logger. They run the same-site good control first, then change only the start site. Repeating the case after cleanup detects old cookies, history, service workers, and shared logger state.

### Which check is strongest for SameSite None Secure test?

Assert that the browser stores the clear None cookie with Secure over HTTPS, then compare the exact received cookie-name set at each intended hop. Split rejected storage from request exclusion. Include browser build and transport proof because accepting either result without context turns a useful rule check into a weak presence test.

### How should CI report cookie request context matrix failures?

CI should report case, phase, browser build, changed input, expected names, observed names, method, target, site status, and first differing hop hop. Attach a redacted request sequence only for failures and confirm cleanup. This format separates setup, browser browser support, app handling, and an incorrect test rule.

## Conclusion

SameSite cookie navigation matrix testing works when clear Strict, Lax, and None records are compared across site status, method, target, hop, and transport. A clean good control proves storage and logging, while one-variable bad cases show the first request where expected set changes.

Keep the gate tied to a named browser build and preserve redacted server proof for failed rows. Review the [security testing guide](/blog/security-testing-complete-guide), then open the [QA skills directory](/skills) and implement the SameSite cookie navigation matrix testing matrix in the next test run.`,
};
