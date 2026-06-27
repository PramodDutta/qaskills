import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "OWASP API Security Top 10: A Testing Checklist (2026)",
  description: "A practical testing checklist for the OWASP API Security Top 10 (2023): real Burp, ZAP, and curl techniques to find BOLA, BFLA, and auth flaws in your APIs.",
  date: "2026-06-26",
  category: "Security",
  content: `# OWASP API Security Top 10: A Testing Checklist (2026)

**The OWASP API Security Top 10 is a ranked list of the most critical API risks, and you test it by attacking authorization and authentication first.** The current edition (2023, still authoritative in 2026) leads with BOLA, broken authentication, and BFLA because those are the flaws scanners miss and attackers exploit most. The fastest manual check: capture a request as user A in Burp or \`curl\`, swap in user B's object ID and token, and verify the API returns \`403\`, not user B's data. This guide turns each category into concrete tests with real tools.

API security testing is different from web app testing because the attack surface is the request itself: object IDs, JWTs, scopes, and JSON bodies. Most issues are logic flaws a \`DAST\` crawler cannot see. Below, every risk maps to a specific test you can run today.

## How the OWASP API Security Top 10 Is Organized

The list is maintained by the OWASP API Security Project and identifies each risk with an \`APIn:2023\` code. Unlike the general Web Top 10, more than half of these are *authorization* problems — which is exactly why generic scanners underperform and why a checklist is worth more than any single tool.

| ID | Risk | Test focus |
|---|---|---|
| API1:2023 | Broken Object Level Authorization (BOLA) | Swap object IDs across users |
| API2:2023 | Broken Authentication | Tokens, JWTs, brute force, reset flows |
| API3:2023 | Broken Object Property Level Authorization | Mass assignment + excessive data exposure |
| API4:2023 | Unrestricted Resource Consumption | Rate limits, pagination, payload size |
| API5:2023 | Broken Function Level Authorization (BFLA) | Call admin/privileged endpoints as a basic user |
| API6:2023 | Unrestricted Access to Sensitive Business Flows | Automate a flow meant to be human-paced |
| API7:2023 | Server Side Request Forgery (SSRF) | Inject URLs the server fetches |
| API8:2023 | Security Misconfiguration | Headers, verbose errors, CORS, methods |
| API9:2023 | Improper Inventory Management | Shadow/zombie endpoints, old versions |
| API10:2023 | Unsafe Consumption of APIs | Trusting third-party API responses blindly |

The single most important takeaway: **authorization is checked per request, per object, by the server — never by the client.** Tests API1, API3, and API5 all probe that assumption from different angles.

## Setting Up Your Test Harness

You need three things: a proxy to capture and replay requests, two test accounts at different privilege levels, and a way to script repeats. Burp Suite (Community is fine for manual work) or OWASP ZAP cover the proxy; \`curl\` and \`ffuf\` cover scripting.

\`\`\`bash
# Capture a baseline authenticated request, then store the values you'll mutate
export BASE="https://api.example.com"
export TOKEN_A="eyJhbGciOiJIUzI1NiI..."   # low-priv user A
export TOKEN_B="eyJhbGciOiJIUzI1NiI..."   # low-priv user B (different account)
export ADMIN_TOKEN="eyJhbGciOi..."          # admin, for negative tests only

# Sanity check: A can read A's own resource
curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE/api/orders/1001" | jq .
\`\`\`

Route traffic through ZAP from the command line so you can capture and later spider the same session:

\`\`\`bash
# Start ZAP headless with an API key, listening as a proxy on 8090
zap.sh -daemon -port 8090 -config api.key=changeme
# Then point your client at it
curl -x http://127.0.0.1:8090 -H "Authorization: Bearer $TOKEN_A" "$BASE/api/orders/1001"
\`\`\`

With the harness ready, work down the list. For each finding, note the request, the response, and the *expected* response — that triple is your regression test.

## API1: Broken Object Level Authorization (BOLA)

BOLA is the number-one API vulnerability. The API authenticates *who* you are but fails to check whether *this object* belongs to you. Any endpoint with an ID in the path or body is a candidate.

The core test is the **horizontal swap**: take a successful request as user A and reissue it with user B's token but A's object ID (or vice versa).

\`\`\`bash
# A's order is 1001. As user B, try to read it.
curl -s -o /dev/null -w "%{http_code}\\n" \\
  -H "Authorization: Bearer $TOKEN_B" \\
  "$BASE/api/orders/1001"
# PASS = 403 or 404.  FAIL = 200 with A's data.
\`\`\`

Enumerate to prove impact. If IDs are sequential integers, fuzz a range and flag every \`200\`:

\`\`\`bash
ffuf -u "$BASE/api/orders/FUZZ" \\
  -H "Authorization: Bearer $TOKEN_B" \\
  -w <(seq 1000 1100) \\
  -mc 200 -t 10
\`\`\`

Test every identifier shape, not just the path: query params (\`?userId=\`), JSON body fields, headers, and nested IDs. UUIDs are *not* a fix — they make blind enumeration harder, but an attacker who has seen a UUID once can still replay it. The only correct outcome is a server-side ownership check on every object access.

## API2: Broken Authentication

This covers weak credentials, missing brute-force protection, and especially flawed token handling. JWTs are a frequent offender. Decode the token and probe how the server validates it.

\`\`\`bash
# Decode the JWT header + payload (no verification) to read alg and claims
echo "$TOKEN_A" | cut -d. -f1 | base64 -d 2>/dev/null; echo
echo "$TOKEN_A" | cut -d. -f2 | base64 -d 2>/dev/null; echo
\`\`\`

Run these checks:

- **\`alg: none\`** — re-encode the token with \`{"alg":"none"}\` and an empty signature; a vulnerable server accepts it unsigned.
- **Algorithm confusion** — if the server uses RS256, try resigning with HS256 using the public key as the HMAC secret.
- **Expiry and revocation** — replay a token after \`exp\`, and after logout; both must fail.
- **Brute force** — hammer the login endpoint and confirm lockout or rate limiting kicks in.

\`\`\`bash
# Confirm an expired/old token is actually rejected
curl -s -o /dev/null -w "%{http_code}\\n" \\
  -H "Authorization: Bearer $OLD_TOKEN" "$BASE/api/profile"
# Expect 401. A 200 means tokens aren't being validated for freshness.
\`\`\`

Authentication is deep enough to deserve its own pass — see the [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) for token, session, and OAuth flow coverage.

## API3: Broken Object Property Level Authorization

Two failure modes share this slot: **excessive data exposure** (the response contains fields the client should never see) and **mass assignment** (the client sets fields it should never control).

For excessive data exposure, inspect the raw JSON, not the rendered UI:

\`\`\`bash
curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE/api/users/me" | jq 'keys'
# Look for password_hash, is_admin, internal_notes, ssn, balance...
\`\`\`

For mass assignment, add privileged properties to a write request and check whether they stick:

\`\`\`bash
# Try to make yourself admin during a normal profile update
curl -s -X PATCH "$BASE/api/users/me" \\
  -H "Authorization: Bearer $TOKEN_A" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Pat","role":"admin","email_verified":true,"balance":99999}'
# Then re-fetch and confirm role/balance did NOT change.
curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE/api/users/me" | jq '.role,.balance'
\`\`\`

The fix is allow-listing writable fields server-side. Any field you can change that you shouldn't is a finding.

## API4: Unrestricted Resource Consumption

APIs that don't bound work let one client exhaust CPU, memory, or budget (think outbound SMS/email costs). Test rate limits, pagination caps, and payload size.

\`\`\`bash
# Is there a rate limit? Fire 100 rapid requests and watch for 429s.
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code} " \\
    -H "Authorization: Bearer $TOKEN_A" "$BASE/api/search?q=test"
done; echo
# All 200s = no rate limiting.

# Abuse pagination: ask for a huge page size.
curl -s -H "Authorization: Bearer $TOKEN_A" "$BASE/api/orders?limit=1000000" | jq 'length'
\`\`\`

Also send an oversized body and a deeply nested JSON payload to probe for parser DoS. Look for missing \`429\` responses, absent \`Retry-After\` headers, and unbounded \`limit\` parameters.

## API5: Broken Function Level Authorization (BFLA)

Where BOLA is about *objects*, BFLA is about *actions*. A basic user calls an admin-only function and the server lets them. Test by taking an administrative request and replaying it with a low-privilege token.

\`\`\`bash
# Admin deletes a user. Now try the exact same call as a basic user.
curl -s -o /dev/null -w "%{http_code}\\n" -X DELETE \\
  -H "Authorization: Bearer $TOKEN_A" \\
  "$BASE/api/admin/users/2002"
# PASS = 403. FAIL = 200/204 (basic user performed an admin action).
\`\`\`

Also flip HTTP methods on the same path — an endpoint may guard \`GET\` but forget \`PUT\` or \`DELETE\`. Hunt for admin routes by guessing common prefixes (\`/admin\`, \`/internal\`, \`/v1/manage\`) and by reading the OpenAPI/Swagger spec if one is exposed. Every privileged function must verify role *and* permission, not merely a valid login.

## API6, API7, and API8: Business Flows, SSRF, and Misconfiguration

These three round out the high-impact tests:

- **API6 — Sensitive business flows.** Automate a flow designed to be human-paced (signup, coupon redemption, ticket purchase). If you can script 1,000 account creations or buy out inventory with no CAPTCHA, device check, or velocity limit, that's the finding.
- **API7 — SSRF.** Anywhere the API accepts a URL (webhooks, image-from-URL, PDF render), point it at internal targets and watch for fetches.

\`\`\`bash
# Does the server fetch attacker-controlled URLs? Try cloud metadata.
curl -s -X POST "$BASE/api/import" \\
  -H "Authorization: Bearer $TOKEN_A" \\
  -H "Content-Type: application/json" \\
  -d '{"source_url":"http://169.254.169.254/latest/meta-data/"}'
# Any reflected metadata, or a delay/error revealing an internal request, is SSRF.
\`\`\`

- **API8 — Security misconfiguration.** Check headers, CORS, verbose errors, and allowed methods:

\`\`\`bash
# Permissive CORS reflecting an arbitrary origin is a misconfiguration.
curl -s -I -H "Origin: https://evil.example" "$BASE/api/profile" \\
  | grep -i "access-control-allow-origin"

# Enumerate allowed methods on an endpoint.
curl -s -X OPTIONS -i "$BASE/api/orders/1001" | grep -i "allow:"
\`\`\`

For broad coverage of headers, TLS, and crawl-based findings, automated scanners help. Run a baseline with [OWASP ZAP for API security testing](/blog/owasp-zap-api-security-testing-guide-2026), then verify the logic flaws by hand.

## API9 and API10: Inventory and Upstream Trust

The last two are operational and supply-chain risks:

- **API9 — Improper inventory management.** Find shadow APIs (undocumented), zombie APIs (deprecated but live), and stale versions. Diff \`/v1\`, \`/v2\`, \`/v3\`, and probe \`/api/docs\`, \`/swagger.json\`, \`/.well-known/\`. An old \`/v1\` without the auth fixes in \`/v2\` is a classic breach path.
- **API10 — Unsafe consumption of APIs.** Your service trusts a third-party API's response without validation. Test by making the upstream return malformed, oversized, or malicious data (via a mock or interception) and confirm your service validates it before use.

\`\`\`bash
# Hunt for undocumented or old versions
for v in v1 v2 v3 beta internal; do
  printf "%s -> " "$v"
  curl -s -o /dev/null -w "%{http_code}\\n" "$BASE/api/$v/orders/1001" \\
    -H "Authorization: Bearer $TOKEN_A"
done
\`\`\`

Inventory should come from a generated spec and an API gateway, not tribal knowledge. Browse the [QA skills directory](/skills) for ready-to-install security and API-testing skills your AI coding agent can apply directly to a repo.

## Putting It in CI

Manual passes catch logic flaws; CI catches regressions. Encode your confirmed findings as request/response assertions and run a baseline scan on every build.

\`\`\`yaml
name: api-security
on: [pull_request]
jobs:
  zap-baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ZAP API scan
        uses: zaproxy/action-api-scan@v0.9.0
        with:
          target: 'https://staging.example.com/openapi.json'
          format: openapi
          fail_action: true
\`\`\`

Combine the scanner with your own BOLA/BFLA checks (the \`curl\` snippets above wrapped in a test runner) so authorization regressions fail the build the same way a broken unit test does. Pin tool versions and archive reports to diff findings across runs.

## Frequently Asked Questions

### What is the difference between BOLA and BFLA?

BOLA (API1) is broken *object* level authorization: you can access another user's data by changing an object ID, even though the endpoint itself is one you're allowed to use. BFLA (API5) is broken *function* level authorization: you can invoke an entire action or endpoint — like an admin delete — that your role should never reach. BOLA is "wrong record," BFLA is "wrong operation," and you test them with different swaps: object IDs for BOLA, privileged endpoints for BFLA.

### Why don't automated scanners catch most API Top 10 issues?

Because most of the list is authorization logic, and a scanner has no concept of "user A versus user B" or "this object belongs to that account." Tools like ZAP and Burp are excellent at API8 (misconfiguration), parts of API2, and crawling for API9, but BOLA, BFLA, and broken object-property authorization require two authenticated identities and a tester who knows the expected ownership rules. Use scanners for breadth and manual replay for the high-severity logic flaws.

### Is the 2023 edition still current in 2026?

Yes. The OWASP API Security Top 10 2023 is the latest published edition and remains the authoritative reference in 2026. The \`APIn:2023\` codes you see in tools, reports, and compliance mappings all refer to it. Always confirm against the official OWASP API Security Project page, since OWASP periodically refreshes the list.

### Which tools do I actually need to test the API Top 10?

A intercepting proxy (Burp Suite or OWASP ZAP), \`curl\` for scripted replays, and a fuzzer like \`ffuf\` cover the manual work; \`jq\` makes JSON inspection painless. Add a JWT decoder for API2 and an OpenAPI/Swagger file to drive coverage. You do not need expensive commercial tooling for the high-impact authorization tests — two accounts and \`curl\` find most BOLA and BFLA issues.

### How do I test BOLA without breaking real user data?

Always work in a staging or dedicated test environment with seeded accounts you control, never production. Create two low-privilege users, give each their own objects, and swap identities for read tests first (which are non-destructive). For write and delete tests, target only the seeded test objects so a successful exploit damages nothing real, and capture every request so you can reproduce findings safely.

### Where does prompt injection fit if my API is AI-powered?

The classic API Top 10 doesn't cover LLM-specific risks; those live in OWASP's separate Top 10 for LLM Applications. If your API wraps a model, test both lists — API-layer authorization plus model-layer attacks. See the [prompt injection testing guide](/blog/prompt-injection-testing-guide-2026) for the AI side, and keep the two test suites distinct so coverage gaps don't hide between them.
`,
};
