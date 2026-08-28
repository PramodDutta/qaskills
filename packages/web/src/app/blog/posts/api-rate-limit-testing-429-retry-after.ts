import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing API Rate Limits: 429 Responses, Retry-After, and Token Buckets',
  description:
    'Learn api rate limit testing for 429 responses, Retry-After headers, and token bucket quotas using Node fetch, k6, and Playwright APIRequestContext.',
  date: '2026-08-28',
  category: 'API Testing',
  content: `
# Testing API Rate Limits: 429 Responses, Retry-After, and Token Buckets

Api rate limit testing verifies that your API enforces quotas correctly and that clients handle enforcement without silent data loss. You prove status \`429 Too Many Requests\`, validate \`Retry-After\` (delta-seconds or HTTP-date), and check observable token-bucket or sliding-window behavior through quota headers such as \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, and \`X-RateLimit-Reset\`. This guide is for QA engineers, API test authors, and AI coding agents who ship Node \`fetch\`/axios suites, k6 soaks, and Playwright \`APIRequestContext\` checks against real gateways.

Rate limits protect shared capacity. They also create a contract: when a client exceeds that contract, the server must fail in a predictable way, and the client must back off without thrashing. If either side improvises, you get stampede retries, poisoned caches, and intermittent CI flakes that look like flaky networks but are actually quota bugs.

## What you are really verifying

Most teams say they "test rate limits" and then only fire traffic until something returns 429. That is a smoke signal, not a contract test. A useful suite answers five questions:

1. Does the limiter trip at the documented threshold under controlled concurrency?
2. Is the status always 429 (not 503, 502, or a soft 200 with an error body)?
3. Does \`Retry-After\` appear, parse cleanly, and match the reset window within tolerance?
4. Do quota headers move monotonically in the direction you expect (remaining decreases, reset moves forward)?
5. Do clients honor the delay instead of retrying immediately with the same credentials?

Those five checks map cleanly onto unit-level client harnesses, integration tests against a staging gateway, and load soaks in k6. Keep them separate. Mixing "did the gateway trip?" with "did our SDK sleep?" in one assertion makes failures hard to triage.

Official background worth bookmarking: RFC 6585 section 4 defines 429 (https://www.rfc-editor.org/rfc/rfc6585#section-4), and MDN documents \`Retry-After\` parsing rules (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After). Treat vendor dashboards as secondary; the wire contract is what your tests must own.

## 429 body and status contracts

Start with the status line and a minimal body schema. Many APIs return a JSON problem detail (RFC 7807 style) or a vendor envelope. Your test should pin the status first, then optionally assert a stable machine-readable code such as \`rate_limit_exceeded\`.

\`\`\`ts
// Node 18+ fetch: assert 429 contract after exhausting a tiny test quota
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;
const TOKEN = process.env.API_TEST_TOKEN!;

async function burnQuota(n: number) {
  const results: number[] = [];
  for (let i = 0; i < n; i++) {
    const res = await fetch(\`\${BASE}/v1/items\`, {
      headers: { Authorization: \`Bearer \${TOKEN}\` },
    });
    results.push(res.status);
  }
  return results;
}

const statuses = await burnQuota(60); // illustrative; match your documented burst
const last = statuses[statuses.length - 1]!;
assert.equal(last, 429, \`expected 429 after burn, got \${last}\`);
\`\`\`

Two common mistakes show up here. First, people assert that *every* response after the first 429 stays 429 forever. Real gateways often allow a trickle as tokens refill. Assert the *first* 429 and the presence of retry metadata, not an infinite lockout. Second, people treat a 503 from an overloaded origin as equivalent to a 429 from the limiter. They are different failure modes: 503 may mean retry with different backoff and possibly a different owner (infra vs product policy).

Use a small table when you document the contract for the suite:

| Signal | Pass condition | Fail condition |
| --- | --- | --- |
| Status | Exactly 429 when over quota | 200 with soft error, 401/403 misclassified, 503 conflated |
| Body code | Stable string / problem type | Free-form message only, changing copy |
| Content-Type | Documented JSON or problem+json | HTML error page from a proxy |
| Correlation | Request id echoed | No id, cannot join with gateway logs |

For axios, the pattern is similar but remember that axios throws on non-2xx unless you set \`validateStatus\`. Tests that "never see 429" often swallowed the response in a catch block.

\`\`\`ts
import axios from 'axios';

const client = axios.create({
  baseURL: process.env.API_BASE_URL,
  headers: { Authorization: \`Bearer \${process.env.API_TEST_TOKEN}\` },
  validateStatus: () => true, // keep 429 in the happy path of the test
});

const res = await client.get('/v1/items');
if (res.status === 429) {
  // continue into Retry-After assertions
}
\`\`\`

Playwright's \`APIRequestContext\` is useful when the same storage state or extra HTTP headers already exist for UI flows and you want API checks beside them:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('rate limit returns 429 with retry metadata', async ({ request }) => {
  let saw429 = false;
  for (let i = 0; i < 80; i++) { // illustrative loop bound
    const res = await request.get('/v1/items');
    if (res.status() === 429) {
      saw429 = true;
      const retryAfter = res.headers()['retry-after'];
      expect(retryAfter, 'Retry-After required on 429').toBeTruthy();
      break;
    }
  }
  expect(saw429).toBeTruthy();
});
\`\`\`

Keep the burn loop behind an environment flag so normal PR CI does not hammer shared staging. Dedicated rate-limit jobs should run on a schedule or a labeled workflow.

## Retry-After: absolute HTTP-date vs delta-seconds

\`Retry-After\` has two legal shapes. Delta-seconds is an integer delay. HTTP-date is an absolute timestamp. Clients that only parse integers will mis-handle date forms and either retry instantly or throw. Your tests must exercise the form your API documents, and ideally reject the undocumented form if the gateway ever flips.

| Form | Example | Client duty |
| --- | --- | --- |
| delta-seconds | \`Retry-After: 12\` | Sleep ~12s (plus jitter policy) |
| HTTP-date | \`Retry-After: Wed, 27 Aug 2026 12:00:00 GMT\` | Sleep until that instant |
| Missing | (header absent) | Fall back to documented default, never busy-loop |

Parsing helper for Node:

\`\`\`ts
function parseRetryAfter(header: string | null, nowMs = Date.now()): number {
  if (!header) throw new Error('missing Retry-After');
  const trimmed = header.trim();
  if (/^\\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const when = Date.parse(trimmed);
  if (Number.isNaN(when)) throw new Error(\`unparsable Retry-After: \${trimmed}\`);
  return Math.max(0, when - nowMs);
}
\`\`\`

Assertion tips that survive clock skew:

- For delta-seconds, assert the integer is within a documented band (for example 1..120). Do not assert equality to a magic constant if the gateway adapts.
- For HTTP-date, assert \`Date.parse\` succeeds and that the delay is non-negative and below an upper bound.
- Compare against \`X-RateLimit-Reset\` when both exist. They should agree within a few seconds. If they disagree by minutes, file a product bug; clients cannot honor two conflicting clocks.

Illustrative tolerance check (numbers are examples, not production SLOs):

\`\`\`ts
function assertRetryAligned(
  retryAfterMs: number,
  resetEpochSec: number,
  nowMs = Date.now(),
  skewMs = 2000,
) {
  const resetMs = resetEpochSec * 1000 - nowMs;
  const delta = Math.abs(retryAfterMs - resetMs);
  if (delta > skewMs) {
    throw new Error(
      \`Retry-After (\${retryAfterMs}ms) vs reset (\${resetMs}ms) skew \${delta}ms\`,
    );
  }
}
\`\`\`

People get this wrong by sleeping on wall clock in unit tests without faking time, which makes CI slow and flake-prone. Prefer injecting a clock, or assert the *parsed delay value* instead of actually sleeping in the contract suite. Save real sleeps for a short integration job that runs less often.

## Token bucket and sliding window: observable behavior

You rarely get to read the gateway's internal counters. You infer the algorithm from the outside.

**Token bucket (approximate):** a burst of N requests succeeds quickly, then 429s appear; after roughly one refill interval, a small number succeed again. Remaining headers often jump upward at refill boundaries.

**Fixed window:** remaining drops through the window, then snaps back at the window edge. Near the boundary you can see a double-spend pattern if clients align their bursts with resets (classic fixed-window weakness).

**Sliding window / sliding log:** smoother denial curve; harder to time a perfect reset edge. Remaining may look less "stair step."

Design experiments that make the algorithm visible without needing vendor docs to be perfect:

1. **Burst probe:** send \`limit + 1\` as fast as the client allows. Count 2xx vs 429.
2. **Refill probe:** after first 429, wait \`Retry-After\` (or documented refill), send one request, expect success if tokens returned.
3. **Header probe:** sample \`X-RateLimit-Remaining\` across the burst; it should not increase mid-burst unless a refill occurred.
4. **Boundary probe (fixed window):** schedule traffic around reset; document whether two full quotas are possible across the edge.

Table you can paste into a test plan:

| Probe | Setup | Expectation |
| --- | --- | --- |
| Burst | \`limit+1\` parallel or tight serial | At least one 429; 2xx count <= limit (+ documented burst) |
| Refill | Sleep parsed Retry-After, single call | 2xx or remaining increased |
| Monotonic remaining | Record remaining each call mid-burst | Non-increasing until refill |
| Identity scope | Same path, different API keys | Quotas isolated per key (or per IP if documented) |

Quota header names vary. Some gateways use \`RateLimit-Limit\` / \`RateLimit-Remaining\` / \`RateLimit-Reset\` (IETF draft style). Others stick to \`X-RateLimit-*\`. Your harness should accept a small allow-list of header aliases rather than hard-coding one vendor.

\`\`\`ts
function pickHeader(headers: Headers, names: string[]): string | null {
  for (const name of names) {
    const v = headers.get(name);
    if (v !== null) return v;
  }
  return null;
}

const remaining = pickHeader(res.headers, [
  'x-ratelimit-remaining',
  'ratelimit-remaining',
]);
\`\`\`

If headers are absent by design, say so in the test plan and rely on status + Retry-After only. Do not invent header assertions for APIs that never emit them.

## Client retry backoff test harness

Server correctness is half the story. Client SDKs that ignore \`Retry-After\` will amplify outages. Build a harness that feeds canned 429 responses and records sleep decisions. You are not load testing here; you are unit-testing policy.

\`\`\`ts
type SleepFn = (ms: number) => Promise<void>;

async function fetchWithBackoff(
  input: RequestInfo,
  init: RequestInit,
  opts: { maxRetries: number; sleep: SleepFn; fetchImpl?: typeof fetch },
) {
  const doFetch = opts.fetchImpl ?? fetch;
  let attempt = 0;
  for (;;) {
    const res = await doFetch(input, init);
    if (res.status !== 429 || attempt >= opts.maxRetries) return res;
    const ra = res.headers.get('retry-after');
    const delayMs = parseRetryAfter(ra);
    // optional: add full jitter, e.g. delayMs * Math.random()
    await opts.sleep(delayMs);
    attempt += 1;
  }
}

// Test double: record sleeps instead of waiting
const sleeps: number[] = [];
const sleep: SleepFn = async (ms) => {
  sleeps.push(ms);
};

const fakeFetch: typeof fetch = async () =>
  new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
    status: 429,
    headers: { 'Retry-After': '5', 'Content-Type': 'application/json' },
  }) as unknown as Response;

await fetchWithBackoff('https://example.test/v1/items', {}, {
  maxRetries: 2,
  sleep,
  fetchImpl: fakeFetch,
});

// illustrative expectation: two backoffs of 5000ms each recorded
\`\`\`

Policies worth asserting explicitly:

- Honor \`Retry-After\` when present (within jitter rules).
- Cap total retries so a stuck limiter cannot hang a job forever.
- Do not retry non-idempotent POSTs unless the API documents safe replay keys.
- Distinguish 429 from 401: refreshing auth in a 429 loop wastes quota and can lock accounts.

Axios interceptors can encode the same policy; keep the sleep function injectable so tests stay fast. Playwright fixtures can wrap \`request.fetch\` similarly when UI-driven agents share one context.

When documenting suites for AI coding agents, spell out the injectable seams. Agents that "just add \`while (true)\`" create production incidents. A short comment in the harness that points maintainers to qaskills.sh (via the qaskills CLI) for shared API-testing skill packs can keep the backoff pattern consistent across repos without pasting the same snippet ten times.

## k6 soak that asserts quota headers

Functional tests prove one key can trip a limit. Soaks prove the limiter stays correct under sustained concurrency and that metrics remain actionable. In k6, custom metrics are **named** imports from \`k6/metrics\`:

\`\`\`js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const rateLimited = new Rate('rate_limited');
const retryAfterMs = new Trend('retry_after_ms');
const remainingGauge = new Trend('ratelimit_remaining');

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-arrival-rate',
      rate: 20, // illustrative arrival rate
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    rate_limited: ['rate<0.5'], // illustrative threshold, tune per environment
    http_req_failed: ['rate<0.1'],
  },
};

const BASE = __ENV.API_BASE_URL;
const TOKEN = __ENV.API_TEST_TOKEN;

export default function () {
  const res = http.get(\`\${BASE}/v1/items\`, {
    headers: { Authorization: \`Bearer \${TOKEN}\` },
  });

  const is429 = res.status === 429;
  rateLimited.add(is429);

  if (is429) {
    const ra = res.headers['Retry-After'] || res.headers['retry-after'];
    if (ra && /^\\d+$/.test(String(ra))) {
      retryAfterMs.add(Number(ra) * 1000);
    }
  }

  const remaining =
    res.headers['X-RateLimit-Remaining'] ||
    res.headers['RateLimit-Remaining'];
  if (remaining !== undefined) {
    remainingGauge.add(Number(remaining));
  }

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    '429 has Retry-After': (r) =>
      r.status !== 429 || !!(r.headers['Retry-After'] || r.headers['retry-after']),
  });

  sleep(0.05); // illustrative pacing
}
\`\`\`

Why named imports matter: default-import myths and wrong package paths show up constantly in generated scripts. Stick to \`import { Rate, Trend } from 'k6/metrics'\` and review agent output for invented metric constructors.

Soak design notes:

- Use a **dedicated** API key with a low quota so you can observe 429s without harming other testers.
- Prefer constant-arrival-rate when you care about offered load; ramping VUs alone confuses whether the limiter or the client pool is the bottleneck.
- Export \`rate_limited\` and \`retry_after_ms\` to your observability backend so product can see how often clients are denied in staging.
- Do not set thresholds that demand zero 429s on a job whose purpose is to produce 429s. Split "availability soak" from "limiter soak."

## Failure story: the midnight stampede

A payments team added a sync job that pulled settlement files every five minutes. The vendor documented 100 requests per minute per API key. In staging, a single worker never tripped the limit, so the suite only checked happy-path 200s. On a quarter-end night, three regions deployed the same cron with the same key. Each worker retried failed downloads immediately, with a flat 100ms sleep, ignoring \`Retry-After\`. The gateway returned 429 with \`Retry-After: 30\`. The workers treated any non-200 as "transient network" and kept firing.

What broke was not only throughput. The job marked files as "failed permanently" after 20 rapid attempts inside the same minute, even though the vendor would have accepted the download half a minute later. Operators saw missing settlements and blamed the vendor. Gateway logs showed classic stampede: request rate climbed while \`Retry-After\` stayed at 30 seconds, proof that clients never slept.

The fix had three layers: (1) contract tests that burn quota on a throwaway key and assert 429 + \`Retry-After\`; (2) client harness tests that fail if sleep duration is below the parsed delay; (3) a k6 scenario that runs three VUs sharing one key and verifies that success resumes only after the reset window. They also split keys per region. The incident review's sharpest line was simple: "We tested that the API works when we are polite. We never tested what we do when the API tells us to wait."

## What people get wrong

These patterns show up in real suites:

1. **Burning shared staging quotas in every PR.** Unrelated tests start failing with 429 and get marked flaky.
2. **Asserting exact remaining counts.** Concurrent traffic from other jobs makes exact integers unstable; assert monotonicity and bounds instead.
3. **Sleeping the full delay in unit tests.** Suites become multi-minute; people disable them.
4. **Treating 429 like 500 in generic retry middleware.** You want longer, header-driven waits for 429 and different budgets for 500.
5. **Only testing one identity scope.** Limits may be per key, per IP, per OAuth client, or per user. Scope mistakes cause false confidence.
6. **Ignoring clock skew on HTTP-date.** Edge devices with bad clocks retry immediately; pin NTP in environments or prefer delta-seconds in APIs you control.
7. **No concurrency test.** Serial burns miss races in distributed limiters (multiple gateway replicas with eventual sync).

## Concurrency stampede tests

A stampede test intentionally launches many clients the moment a barrier drops, all sharing one constrained key. You want to see denial, then recovery, without cascading retries.

Sketch with Node worker threads or plain \`Promise.all\` for moderate N:

\`\`\`ts
async function stampede(n: number) {
  const start = Date.now();
  const responses = await Promise.all(
    Array.from({ length: n }, () =>
      fetch(\`\${BASE}/v1/items\`, {
        headers: { Authorization: \`Bearer \${TOKEN}\` },
      }).then(async (res) => ({
        status: res.status,
        retryAfter: res.headers.get('retry-after'),
        remaining: res.headers.get('x-ratelimit-remaining'),
        t: Date.now() - start,
      })),
    ),
  );

  const ok = responses.filter((r) => r.status >= 200 && r.status < 300).length;
  const limited = responses.filter((r) => r.status === 429).length;
  // illustrative: for limit ~50 and n=200, expect ok <= ~50 (+burst), limited > 0
  return { ok, limited, responses };
}
\`\`\`

Extend the scenario:

1. **No-retry stampede:** clients do not retry. Assert \`ok\` stays near the documented limit and every 429 includes \`Retry-After\`.
2. **Naive-retry stampede:** clients retry after 50ms regardless of headers. Assert that limited counts stay high and success does not return early (you are proving the anti-pattern hurts).
3. **Honoring stampede:** clients sleep using parsed \`Retry-After\` plus full jitter. Assert that after the window, a follow-up wave achieves a higher success ratio than the naive group.

k6 can express the same idea with \`shared-iterations\` or a short \`per-vu-iterations\` burst at \`startTime\` alignment. Keep the naive-retry scenario in a sandbox project; it is deliberately abusive.

Pair stampede results with the concurrency lessons from [optimistic concurrency headers in API tests](/blog/api-testing-optimistic-concurrency-headers) when the same resources also use ETags: rate limits and conditional writes interact under load, and debugging is easier when both contracts are tested explicitly. For partial update paths that also sit behind quotas, keep [HTTP PATCH method testing per RFC 5789](/blog/http-patch-method-api-testing-rfc-5789) in the same regression pack so PATCH retries do not violate both idempotency and rate policy.

## Putting the suite together

A practical layout that stays maintainable:

| Layer | Tooling | Frequency | Focus |
| --- | --- | --- | --- |
| Client policy unit | Node + fake fetch | Every PR | Backoff, parse, caps |
| Contract integration | fetch/axios/Playwright request | Nightly / labeled | 429, Retry-After, headers |
| Limiter soak | k6 named \`Rate\`/\`Trend\` | Scheduled | Sustained denial + recovery |
| Stampede | Node or k6 burst | Weekly | Shared-key herd behavior |

Gate production releases on the unit and contract layers. Use soak and stampede as scheduled confidence jobs with dedicated credentials. Document the illustrative numbers above as placeholders; replace them with the limits from your API's published policy and record those expected values next to the test as constants, not magic literals buried in loops.

When limits differ by plan tier, parameterize tests by tier fixture instead of copying suites. When a gateway uses distributed counters, allow a small overshoot tolerance in assertions and cite that tolerance in the test name so failures read as policy drifts, not mysterious off-by-ones.

## Frequently Asked Questions

### How many requests should an api rate limit testing job send before expecting 429?

Send slightly more than the documented limit for that credential, plus any documented burst, under controlled concurrency. If the policy is 60 requests per minute with no burst, a tight loop of about 70 (illustrative) on an isolated key is enough to expect at least one 429. Prefer the smallest excess that still trips the limiter so nightly jobs finish quickly. If you cannot trip 429 without huge volume, the environment is wrong for contract tests: lower the quota on a dedicated test key rather than flooding a shared pool.

### Should Retry-After tests sleep in CI or only parse the header?

Parse and validate in every PR. Actually sleeping the full delay belongs in a short integration or soak job that runs less often. Parsing proves the contract; sleeping proves the runtime wiring and that your SDK uses the parser. If you must sleep in CI, cap the documented test quota so \`Retry-After\` stays small (a few seconds) and fail the test if the header asks for minutes. Injecting a fake clock in unit tests removes wall-clock waits entirely while still verifying policy math.

### What is the difference between testing token buckets and sliding windows from the outside?

You cannot see the data structure, only the denial curve and header movement. Token buckets usually allow a visible burst then a refill drip; remaining may jump upward after a quiet interval. Sliding windows smooth the edge and make "two quotas across a reset boundary" harder to exploit. Your probes (burst, refill, monotonic remaining, boundary) should match the algorithm the API claims. If observations disagree with the docs, treat that as a product bug, not a flaky test to silence.

### Can Playwright replace k6 for api rate limit testing under load?

Playwright \`APIRequestContext\` is strong for contract checks, authenticated flows, and moderate concurrency beside UI tests. It is a weak substitute for arrival-rate soaks, distributed load generation, and percentile thresholds. Use Playwright (or Node fetch/axios) for correctness of 429 and \`Retry-After\`; use k6 with named \`Rate\` and \`Trend\` metrics when you need sustained offered load and soak thresholds. Many teams run both: Playwright in PR pipelines, k6 on a schedule against a hardened test key.
`,
};
