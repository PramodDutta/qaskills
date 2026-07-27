import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'CSP nonce reuse detection tests',
  description:
    'CSP nonce reuse detection tests: use repo fixtures, edge cases, and CI assertions to expose failures and protect the intended test contract.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Security Testing',
  primaryKeyword: 'CSP nonce reuse detection tests',
  keywords: [
    'CSP nonce reuse detection tests',
    'CSP nonce reuse test',
    'unique nonce per response',
    'cached CSP nonce vulnerability',
    'concurrent session nonce check',
    'CSP error page security',
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
  content: `CSP nonce reuse detection tests fetch two or more fresh HTML replies and match each header nonce with the script tags in that same reply. They must also prove that no nonce comes back in a later, parallel, cached, or error reply, while raw values stay out of the saved log.

## What does CSP nonce reuse detection tests verify?

The test asks two plain things: do the header and page use the same nonce, and is that nonce new for this reply? It checks the main page, fast calls, cache path, and error page because each path can build or serve HTML in a new way.

- A nonce is a one-response authorization token for a script or style under Content Security Policy. It is not a stable application identifier and should not be reused as a build constant.

- The [CSP Level 3 specification](https://www.w3.org/TR/CSP3/) defines nonce sources and nonce matching. It is the authority for policy syntax and browser checks used by this article.

- Uniqueness alone is insufficient. A new header nonce with an old script attribute blocks the intended script, while matching reused values preserve the security weakness.

- Header-to-document agreement alone is also insufficient. A cached page can carry a perfectly matched nonce pair that has already appeared in another response.

- Sequential cases expose process-wide constants and template startup values. Two independent responses for the same route should produce different nonce fingerprints.

- Concurrent cases expose unsafe shared mutable state. Parallel renders must not overwrite one request's nonce or copy one generated value into every response.

- Cache cases expose stored nonce-bearing HTML and policy headers. A safe design can avoid caching that representation, regenerate both parts per delivery, or use a policy that does not need per-response nonces.

- Error cases expose fallback renderers, framework defaults, and proxy-generated pages. A page with no inline script may need no nonce, while a nonce-bearing error template needs a fresh matched value.

- The repository file seed-skills/security-best-practices/SKILL.md defines a general security review format with evidence and remediation. It does not implement nonce generation, so the detailed checks below are recommendations grounded in the approved specifications.

- The file seed-skills/owasp-security/SKILL.md checks Content-Security-Policy presence and advises isolated security testing. Its broad header check becomes one setup assertion in this deeper response-level matrix.

- The [complete security testing guide](/blog/security-testing-complete-guide) covers related browser controls. This article owns nonce equality, uniqueness, cache provenance, concurrency, and fallback response paths.

- A useful artifact stores route, status class, policy identifier, script count, cache marker, response sequence, and a run-salted nonce fingerprint. It should not print the raw policy or full HTML by default.

CSP nonce reuse detection tests need a match within each reply and a new value across all fresh replies. A check for the CSP field alone is too weak, since the field may hold one fixed value or may not match the script tag at all.

## How do you build a CSP nonce reuse test?

Build one small page with two allowed scripts, one blocked script, and a new reply ID from the server. Fetch it through the real web path, read the policy and page, then compare fresh replies with a run key that masks each raw nonce.

- Use a dedicated nonproduction route whose template behavior matches the production renderer. Keep content fixed so nonce generation is the only expected response-level difference.

- Add two script tags that receive the request nonce through the actual template helper. Different approved tags in one response should use the same policy value unless the application deliberately declares several nonce sources.

- Add one inline control without a nonce that attempts to set a harmless marker. A browser check should confirm that marker remains absent while approved scripts execute.

- Emit a synthetic response ID in a safe header. This lets the test separate two real responses even when a cache or retry changes network behavior.

- Return a defined Cache-Control policy for the fixture. The test needs to know whether a response was intended for storage before classifying repeated bytes.

- Extract the Content-Security-Policy header before parsing the body. Require exactly one intended nonce source for this simple fixture, or adapt the oracle to an explicitly documented multi-nonce policy.

- Extract script nonce attributes from raw response HTML for server consistency. Browser DOM APIs can hide nonce attributes, so a browser execution check should read the element's nonce property when needed.

- The first code example adapts the security-header checks in seed-skills/security-best-practices/SKILL.md. It compares two real responses and retains only a salted fingerprint outside the assertion scope.

\`\`\`typescript
import { createHash, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';

const policyNonce = (policy: string) =>
  [...policy.matchAll(/'nonce-([^']+)'/g)].map((match) => match[1]);

const scriptNonces = (html: string) =>
  [...html.matchAll(/<script\\b[^>]*\\bnonce="([^"]+)"[^>]*>/gi)]
    .map((match) => match[1]);

const fingerprint = (salt: Buffer, value: string) =>
  createHash('sha256').update(salt).update(value).digest('hex');

test('uses one fresh matched nonce for each response', async ({ request }) => {
  const salt = randomBytes(32);
  const responses = await Promise.all([
    request.get('/__security/nonce-page?case=first'),
    request.get('/__security/nonce-page?case=second'),
  ]);

  const evidence = await Promise.all(responses.map(async (response) => {
    const policies = policyNonce(
      response.headers()['content-security-policy'] ?? '',
    );
    const scripts = scriptNonces(await response.text());
    expect(policies).toHaveLength(1);
    expect(new Set(scripts)).toEqual(new Set(policies));
    return fingerprint(salt, policies[0]);
  }));

  expect(new Set(evidence)).toHaveLength(2);
});
\`\`\`

- The regular expression is acceptable for a controlled fixture with fixed double-quoted attributes. A general HTML audit should use a parser rather than treating arbitrary HTML as this narrow fixture.

- Generate the reporting salt in memory for each run and discard it afterward. The fingerprint then supports equality checks inside the run without becoming a reusable nonce lookup table.

- Confirm both responses reached the intended renderer by checking response IDs and route markers. Two cached client objects must not be mistaken for two generated server responses.

- Use the [API security checklist](/blog/api-security-testing-checklist-2026) for broader response checks. Keep this fixture focused on nonce sources and the scripts they authorize.

## What breaks unique nonce per response?

The rule breaks when a nonce is made at app start, kept in a file scope, shared by two calls, or served from old HTML. It can also break on an error page, and the test itself is unsafe if it writes each raw nonce to a long lived report.

- Startup generation often looks random in one response but stays constant until the process restarts. Sequential requests in one process expose that defect directly.

- A module-scoped mutable nonce can create a race. One request writes the value, another overwrites it, and either header or document can receive the wrong request's data.

- Generating twice inside one response creates a mismatch rather than reuse. The header and every intended script must receive the same request-owned value.

- A fragment cache can store a script tag with an old nonce even when the outer response header is fresh. Compare every nonce-bearing element, not only the first script.

- A full-page cache can replay both header and body with the same value. Local equality passes, so the cross-response fingerprint set must still fail.

- A CDN can cache HTML despite application assumptions. Record cache-status headers or an equivalent test marker, then verify the delivered representation follows the reviewed policy.

- Error middleware may render from a separate static template. Trigger controlled 404 and 500 paths so normal-page success does not hide stale or absent security policy.

- Redirects can move the check to another response. Record the final URL and each relevant response status rather than inspecting only the first network object.

- A test can also create false reuse by retrying the same response object or saving one body twice. Distinct server response IDs and network events prove fixture independence.

- Raw nonce logging weakens the handling model and makes security artifacts unnecessarily sensitive. Emit only counts, equality relations, and run-local fingerprints.

- The [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) provides broader CSP header guidance. It supports reviewing policy deployment but does not replace response-by-response nonce tests.

- The [OWASP ZAP API security guide](/blog/owasp-zap-api-security-testing-guide-2026) helps inspect exposed headers. Active browser and renderer tests remain necessary for nonce freshness across requests.

## cached CSP nonce vulnerability fixtures and controls

Mark if the full page, policy field, or small page part came from a cache. The test grid should cover fresh HTML, safe cache rules, old byte replay, calls made at once, error replies, repeat runs, and a clean cache when the work is done.

- The positive direct-render case requests one nonce page with cache bypass enabled. Require one policy nonce, matching approved script values, and no blocked-control marker.

- The sequential case requests the same route twice through the normal edge. Require distinct response IDs and distinct nonce fingerprints while all ordinary page content remains stable.

- The parallel case sends many requests from separate contexts or API clients. Require one unique fingerprint per response and no header-to-script mismatch.

- The full-page cache case warms the route, then requests it again through a cache-observable path. Replayed nonce-bearing HTML is a failure unless the delivery layer rewrites both policy and document with a fresh request value.

- The fragment case warms only the component containing inline scripts. Require every returned script nonce to equal the current outer policy value, which catches a stored inner attribute.

- The safe static case can use no inline nonce at all. A hash-based or external-script policy may be valid, so the oracle should follow the page's declared design rather than demand a nonce universally.

- The 404 case requests an unknown HTML route. If the response includes inline scripts, require a fresh matched nonce; otherwise require a CSP that blocks unapproved inline code.

- The 500 case triggers a controlled server error before the normal page renderer completes. Inspect the final fallback response instead of assuming middleware copied the normal policy.

- The mismatch mutation sets the policy nonce to A and one script nonce to B. A real browser should block that script, and the static consistency check should name the mismatched element.

- The reuse mutation injects one fixed nonce into two independent responses. The cross-response uniqueness assertion should fail even though each response is locally consistent.

- Repeat all cases after clearing test caches and restarting the renderer. This separates per-process constants, stored representations, and cleanup defects.

- Cleanup removes warmed test keys, closes browser contexts, and verifies that the cache probe no longer lists the test ID. Retain only sanitized counts and fingerprints after that confirmation.

## How should concurrent session nonce check be asserted?

Send many calls at once with a new test ID for each one, then count reply IDs and masked nonce prints. Each policy must match its own script tags, and a real browser must run the allowed code while the test script with no nonce stays blocked.

- Use a barrier so requests overlap at the renderer rather than merely entering a client queue. A test-only delay after generation can widen the race window without changing production logic.

- Give each request a distinct session cookie or anonymous context ID only when the application template uses session state. Nonce freshness should not depend on login identity.

- Capture response evidence by request ID, not completion order. Parallel results can finish in any order, and sorting by arrival can pair the wrong header with a body.

- Require result cardinality before uniqueness. A set of nine unique fingerprints cannot pass a ten-request test when one response disappeared.

- Compare the policy nonce with all approved scripts inside each response first. Then compare fingerprints across responses, which keeps local mismatch and global reuse as separate failure classes.

- Load selected responses in real browser contexts and check allowed markers. Static parsing proves values match, while execution proves the browser accepted the policy syntax and blocked the control.

- Do not require nonce values to differ between retries of the same stored response unless the server actually generated a new response representation. Record retry and cache provenance before classifying the observation.

- The second example adapts the isolated security workflow in seed-skills/owasp-security/SKILL.md. It checks parallel result count and uniqueness without writing raw values to the artifact.

\`\`\`typescript
import { createHmac, randomBytes } from 'node:crypto';

type NonceResult = {
  responseId: string;
  policyNonce: string;
  scriptNonces: string[];
};

function summarize(results: NonceResult[]) {
  const key = randomBytes(32);
  const fingerprints = results.map((result) => {
    expect(new Set(result.scriptNonces))
      .toEqual(new Set([result.policyNonce]));
    return createHmac('sha256', key)
      .update(result.policyNonce)
      .digest('hex');
  });

  return {
    responses: new Set(results.map((result) => result.responseId)).size,
    uniqueNonces: new Set(fingerprints).size,
  };
}

it('keeps parallel response nonces independent', async () => {
  const results = await Promise.all(
    Array.from({ length: 16 }, (_, index) =>
      fetchNonceResult({ session: \`session-\${index}\` }),
    ),
  );
  expect(summarize(results)).toEqual({
    responses: 16,
    uniqueNonces: 16,
  });
});
\`\`\`

- The placeholder fetchNonceResult belongs to the test harness and must return evidence from one response only. Its implementation should reject redirects or missing response IDs before parsing nonce fields.

- Run a mutation with a module constant and confirm the uniqueness count becomes one. This proves the check detects reuse instead of merely collecting values.

- Run another mutation that swaps one script nonce between two responses. The local equality assertion should fail before the global uniqueness report.

- The strongest concurrent oracle therefore combines cardinality, per-response equality, cross-response uniqueness, browser execution, and request provenance. No single set-size check covers all five.

## CSP error page security in CI

CI should run the main page, cache path, fast call set, not-found page, and safe error route on one fixed build. The CSP nonce reuse detection tests job should name a missing rule, bad match, reused value, old page, wrong script block, or raw leak; see the [security FAQ](/faq).

- Pin runtime, framework build, template revision, cache mode, proxy image, browser version, and CSP policy identifier. These values explain behavior changes without storing the policy nonce.

- Give each worker a separate cache namespace and route token. Shared warming can replay another worker's page and produce confusing reuse evidence.

- Run a direct-render baseline before cache and error paths. If local header-to-script equality fails there, stop and repair renderer setup.

- Require known route and response counts. A swallowed 500 or skipped browser project must not yield an apparently clean uniqueness set.

- Use a run-local HMAC or salted hash for comparisons, then destroy its key. Report duplicate groups by response ID rather than printing the source nonce.

- Record cache status, response age, policy identifier, status class, approved script count, blocked-control result, and fingerprint equality. Exclude full HTML and sensitive headers.

- Trigger errors through a test-only dependency or route. Never corrupt shared data or force production failures merely to reach a fallback template.

- Check redirects and framework error overlays are disabled in the release-mode fixture. A development overlay has different scripts and policy behavior from the deployed error page.

- Treat a nonce-free error page as valid only when its policy and markup need no nonce. The test should reject unapproved inline script, not require one mechanism on every page.

- Block release for repeated nonce-bearing responses, policy-to-script mismatch, unprotected inline execution, missing intended policy, or incomplete evidence. Route cache provenance defects to the delivery owner.

- The [authentication and authorization guide](/blog/authentication-authorization-testing-guide) covers session controls that may share these pages. A nonce protects script authorization, not user authorization.

- CSP nonce reuse detection tests should run without third-party scripts or live analytics. External variation adds noise and can expose test fingerprints beyond the controlled environment.

## CSP nonce reuse detection tests comparison matrix

Each table row checks both the match in one reply and the new value in the next reply. Use fixed page marks and masked prints, then move to the [API security guide](/blog/api-security-testing-checklist-2026) for the rest of the web response checks.

| Scenario | Controlled setup | Expected observation | Failure signal | Evidence source |
|---|---|---|---|---|
| Two sequential responses | Same route, clean direct renders | Each header matches its scripts, and fingerprints differ | Same fingerprint or local mismatch | [CSP Level 3](https://www.w3.org/TR/CSP3/) |
| Parallel separate sessions | Sixteen overlapping requests | Complete response count and one fingerprint per response | Duplicate, missing result, or crossed body | seed-skills/security-best-practices/SKILL.md |
| Cached HTML response | Warm and revisit a nonce-bearing route | Cache bypass or fresh matched representation follows policy | Stored matched nonce pair is replayed | [Fetch Standard](https://fetch.spec.whatwg.org/) |
| Server error page | Controlled 500 release template | Fresh matched nonce, or no inline script under strict policy | Old nonce, missing policy, or allowed control | seed-skills/owasp-security/SKILL.md |
| Header and script mismatch | Policy nonce A with script nonce B | Static check fails and browser blocks the script | Approved marker executes or mismatch is hidden | [OWASP header guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) |

- The first row catches both startup constants and accidental double generation. Distinct fingerprints and local equality must pass together.

- The second row widens request overlap and requires exact cardinality. Missing responses are failures even if every returned fingerprint is unique.

- The cache row follows the reviewed delivery design. It rejects replayed nonce-bearing bytes without claiming that all HTML caching is unsafe.

- The error row allows a nonce-free design when no inline code needs authorization. It still requires an effective CSP and a blocked control where the fixture provides one.

- The mismatch row is a mutation control. If it passes, the parser, browser assertion, or policy delivery is not testing the intended mechanism.

- Add fragment-cache and redirect rows when those paths exist in production. Keep response identity and cache markers so each observation has a clear source.

## How do you implement CSP nonce reuse detection tests?

Start with a reply ID, one local match, one masked cross-reply check, cache source, and a real browser run. Prove the good page first, add one fault per row, and use the [security blog](/blog) to link a fail to the next broad test.

1. Read seed-skills/security-best-practices/SKILL.md and seed-skills/owasp-security/SKILL.md. Record their CSP presence, isolation, evidence, and remediation guidance while labeling detailed nonce behavior as this article's recommended test contract.
2. Build a release-mode fixture with approved inline markers, one blocked control, response IDs, cache markers, and test-only 404 and 500 paths. Keep ordinary HTML stable across generated responses.
3. Fetch two direct responses, extract CSP nonce sources and controlled script attributes, assert local equality, execute one page in a browser, and compare run-salted fingerprints. Stop if this positive path fails.
4. Run sequential, parallel, full-page cache, fragment cache, error, redirect, mismatch, and fixed-nonce cases separately. Prove each renderer and cache branch executed before classifying its result.
5. Compare observations with the five-row matrix, distinguishing missing policy, local mismatch, cross-response reuse, stale content, browser block, setup failure, and raw-value leakage. Report only sanitized evidence.
6. Run fixed deployment checks in CI, clear test caches, close contexts, destroy fingerprint keys, and verify cleanup. Require renderer, cache, and security owners to review any policy or template change.

- Generate nonce values with a cryptographic source inside the request-owned path. The test should observe that behavior through responses rather than duplicating generation code as its oracle.

- Parse the controlled fixture strictly and fail on unexpected nonce-bearing elements. Silent extra scripts can broaden the policy without entering the equality check.

- Keep the browser execution assertion beside static extraction. One catches value drift, while the other catches malformed policy syntax and unexpected inline execution.

- Add cache markers at the layer under test. An application header cannot prove whether a CDN served stored bytes unless the delivery path preserves trustworthy provenance.

- The OAuth [security practice](https://www.rfc-editor.org/info/rfc9700) addresses token replay and authorization controls, not CSP nonce syntax. Use it only to reinforce that these ephemeral values do not replace session or access controls.

- Browse verified [security skills](/skills) for the repository workflows used here. The application team still owns its renderer, cache, fallback template, and policy.

- Use the [blog index](/blog) for related scanner and authorization tests. Keep this gate centered on nonce-bearing response behavior.

Nonce validation should correlate response identity, policy serialization, parsed element attributes, cache provenance, execution results, and cryptographic fingerprints for every delivered representation. This evidence separates generation reuse from header-document mismatch, fragment caching, parser failure, concurrency races, or unexpected fallback rendering without retaining the ephemeral authorization value itself.

Deterministic security verification also requires isolated cache namespaces, controlled error templates, exact response cardinality, independent session contexts, and audited cleanup of all fingerprint keys. Those safeguards prevent network retries, shared fixtures, stale delivery artifacts, incomplete collection, or mixed response bodies from being misclassified as nonce duplication during release analysis.

## Frequently Asked Questions

### How can security tests detect CSP nonce reuse across requests, cached HTML, concurrent sessions, and error pages?

Read policy and script nonce values from fresh replies, match them within each reply, then compare masked prints across replies. Add cache marks, reply IDs, calls made at once, and safe error routes; run allowed and blocked page marks in a browser, but do not keep raw nonce text.

### What should an CSP nonce reuse test fixture record?

Save the route, status, reply ID, rule ID, allowed script count, cache mark, call order, browser build, local match, and masked print match. Add the test branch and clean end state, but leave out full HTML, raw policy text, cookies, logins, and nonce values.

### Which failure proves unique nonce per response is broken?

Two fresh nonce pages with the same masked print prove reuse once reply IDs and cache marks show they are distinct. A policy value that does not match its script proves a second fault; require the full reply count and one good row so a retry or lost call cannot fake either result.

### How do teams isolate cached CSP nonce vulnerability?

Use one test cache key, warm one known route, save the cache marks, and call it again through the real edge. Check both the match in each page and the masked prints across pages, then clear the key; the pass must fit the chosen no-store, fresh-write, or nonce-free page plan.

### Which assertion is strongest for concurrent session nonce check?

Require the full reply count, a new reply ID, one local nonce match, one new masked print, and the right browser script result for each call. Group by test ID, not finish time; this catches a fixed value, crossed pages, lost calls, bad policy text, and code with no grant.

### How should CI report CSP error page security failures?

Report route, status, page and rule IDs, cache mark, planned script mode, local match, blocked test result, and any copy of a reply ID. Keep no-rule, bad-match, reuse, and setup faults apart; save masked prints for this run only, drop the key, and check cache cleanup.

## Conclusion

CSP nonce reuse detection tests need two clear facts: the policy and scripts match in one reply, and fresh replies do not share a nonce. Test one-by-one, at-once, cache, and error paths, since each path may skip the code that makes the main page safe.

Read the [security testing guide](/blog/security-testing-complete-guide), then open verified [QA skills](/skills) and run this grid on a clean release build. Keep masked prints, reply IDs, and cache marks with the test, so the next page or cache change can be checked with no raw nonce leak.`,
};
