import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Smoke Testing Dependency Health Checks That Catch Real Release Blockers',
  description: 'Build smoke testing dependency health checks that isolate DNS, TLS, API, queue, and database failures before they derail deployments or user journeys.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Smoke Testing Dependency Health Checks That Catch Real Release Blockers

Smoke testing dependency health checks should prove that a deployed service can reach and safely use every dependency required for its critical paths. A useful check does more than ask whether a URL returns 200. It distinguishes name resolution, connection, TLS, authentication, protocol, data freshness, and a minimal business operation, while staying read-only or automatically reversible.

The practical goal is fast release evidence. Within a small, explicit time budget, the suite should answer three questions: which dependency failed, at which layer, and whether the failure blocks the release. That makes a health smoke suite different from deep integration testing. It favors a few representative operations, stable assertions, bounded retries, and diagnostics that an engineer or AI coding agent can act on immediately.

This guide builds that workflow with TypeScript, Node.js, Playwright, and ordinary CI commands. It also shows where dependency checks commonly lie, how to diagnose a realistic TLS failure, and how to keep a transient vendor incident from turning every deployment into guesswork.

## Turn the dependency graph into a release contract

Start from user-visible capabilities, not from a list of infrastructure products. An application might have twenty network peers, but login, checkout, and account recovery may depend on only eight. Conversely, a seemingly minor service such as a feature-flag provider can sit directly on the startup path and deserve blocker status.

Map each critical journey to the dependencies it actually invokes. Then identify the smallest safe proof for each dependency.

| User capability | Direct dependencies | Minimal smoke proof | Release impact |
|---|---|---|---|
| Sign in | DNS, identity API, session store | Discover issuer metadata and read/write an expiring canary session | Blocker |
| View catalog | Product API, database replica, cache | Read a known synthetic product and compare its revision | Blocker |
| Checkout | Payment sandbox, orders database, queue | Create and void a sandbox authorization, publish a canary event | Blocker |
| Send receipt | Queue, email provider | Validate provider credentials and enqueue to a sink address | Degraded if orders remain safe |
| Recommendations | Model endpoint, feature flags | Read model metadata and evaluate a test flag | Non-blocking fallback |

The release contract should be versioned beside the tests. For every entry, record an owner, timeout, allowed status, expected schema, data safety rule, and severity. This prevents a common failure mode: a new external call enters the critical path, but nobody adds it to deployment smoke coverage.

A small TypeScript type makes that contract explicit:

\`\`\`ts
export type DependencyPolicy = {
  name: string;
  url: string;
  timeoutMs: number;
  required: boolean;
  expectedStatus: number;
};

export const dependencyPolicies: DependencyPolicy[] = [
  {
    name: 'catalog',
    url: 'https://catalog.test.example/health/ready',
    timeoutMs: 2_000,
    required: true,
    expectedStatus: 200,
  },
  {
    name: 'recommendations',
    url: 'https://recommendations.test.example/health/ready',
    timeoutMs: 1_500,
    required: false,
    expectedStatus: 200,
  },
];
\`\`\`

Do not confuse this inventory with a production readiness endpoint. A service's own readiness endpoint usually answers whether that instance should receive traffic. A release smoke suite answers whether a specific deployed environment can complete a business-critical dependency chain. The audiences and failure policies differ.

## Define evidence at seven connection layers

An HTTP status collapses several independent systems into one result. When a probe reports only \`request failed\`, responders lose the most valuable minutes determining whether the problem is local configuration, routing, a certificate, credentials, or application behavior.

Use layered evidence:

| Layer | What to prove | Useful diagnostic | Avoid claiming |
|---|---|---|---|
| Configuration | Required endpoint and secret references exist | Missing variable name, never its value | That a present credential is valid |
| DNS | Host resolves from the deployed network | Hostname, address family, lookup error | That the address accepts traffic |
| TCP | Target host and port accept a connection | Connect duration and error code | That TLS or HTTP is healthy |
| TLS | Certificate is trusted and hostname matches | Issuer, expiry date, authorization error | That the application is authorized |
| HTTP | Server returns an allowed status and media type | Status, headers, duration | That returned data is meaningful |
| Contract | Payload contains required fields and valid types | Field-level mismatch | That downstream data is current |
| Business sentinel | A known safe operation works | Canary ID, revision, observed state | Full workflow correctness |

Not every dependency needs custom code for all seven layers. Node's HTTPS stack already performs DNS, TCP, and certificate validation, but it may surface a combined error. Add lower-level probes only when the extra classification changes response actions.

For example, this DNS probe is intentionally separate and runnable:

\`\`\`ts
import { lookup } from 'node:dns/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('catalog hostname resolves', async () => {
  const hostname = new URL(
    process.env.CATALOG_URL ?? 'https://catalog.test.example',
  ).hostname;
  const result = await lookup(hostname);

  assert.ok(result.address.length > 0);
  assert.ok(result.family === 4 || result.family === 6);
});
\`\`\`

Use a real environment URL in CI. The default only makes local intent visible, it should not silently select an unintended target in a release job. A separate configuration assertion can require \`CATALOG_URL\` when \`CI\` is set.

## Build a bounded HTTP probe with useful output

Node's built-in \`fetch\` and \`AbortSignal.timeout\` are enough for a clear HTTP health probe on supported Node releases. Assert the status, content type, and a deliberately small response contract. Capture duration for diagnosis, but do not fail on a tight duration threshold unless the smoke test is explicitly a latency gate.

\`\`\`ts
import assert from 'node:assert/strict';

type ReadyPayload = {
  status: 'ready';
  revision: string;
};

export async function probeReady(
  name: string,
  url: string,
  timeoutMs: number,
): Promise<ReadyPayload> {
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const durationMs = Math.round(performance.now() - startedAt);

    assert.equal(
      response.status,
      200,
      name + ' returned HTTP ' + response.status + ' in ' + durationMs + ' ms',
    );
    assert.match(
      response.headers.get('content-type') ?? '',
      /^application\\/json(?:;|$)/,
    );

    const body: unknown = await response.json();
    assert.ok(body !== null && typeof body === 'object');
    assert.equal((body as Record<string, unknown>).status, 'ready');
    assert.equal(typeof (body as Record<string, unknown>).revision, 'string');
    return body as ReadyPayload;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(name + ' probe failed after ' + durationMs + ' ms: ' + message);
  }
}
\`\`\`

That response contract is intentionally modest. A health route should not return secrets, huge dependency trees, or unstable details such as process uptime that tests might accidentally pin. It should expose enough state to distinguish ready from merely alive and, when useful, the deployed revision.

Retries belong outside the probe so a single attempt remains observable. Retry only failure classes that can plausibly be transient, use a short fixed limit, and retain every attempt's evidence. A three-minute retry loop inside a ten-second smoke stage is not resilience. It is a hidden timeout.

\`\`\`ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  attempts: number,
  delayMs: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
\`\`\`

For release gates, two attempts separated by one second is often more interpretable than a large exponential schedule. The correct budget depends on the deployment platform and dependency recovery behavior, so measure rather than copy an arbitrary number.

## Probe authentication without leaking or mutating

An unauthenticated \`/health\` route can be green while production credentials are invalid. Test the actual authentication path with the least privilege possible. Prefer a dedicated smoke identity, a read-only scope, short-lived credentials, and a response that contains synthetic rather than customer data.

The credential should come from the CI secret store. Never print authorization headers, query tokens, or response bodies that may include personal data. Assert only the fields needed to prove access.

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

test('orders API accepts the smoke identity', async () => {
  const baseUrl = process.env.ORDERS_API_URL;
  const token = process.env.SMOKE_ORDERS_TOKEN;

  assert.ok(baseUrl, 'ORDERS_API_URL is required');
  assert.ok(token, 'SMOKE_ORDERS_TOKEN is required');

  const response = await fetch(
    new URL('/v1/orders/synthetic-smoke-order', baseUrl),
    {
      headers: {
        accept: 'application/json',
        authorization: 'Bearer ' + token,
      },
      signal: AbortSignal.timeout(3_000),
    },
  );

  assert.equal(response.status, 200);
  const order = (await response.json()) as Record<string, unknown>;
  assert.equal(order.id, 'synthetic-smoke-order');
  assert.equal(order.synthetic, true);
});
\`\`\`

If the provider supports token introspection or a harmless identity endpoint, that can prove credential validity without accessing a domain record. If the production flow requires additional audience or scope checks, make sure the smoke credential travels through those same checks. A special bypass token gives a deceptively green result.

Credential expiry deserves an explicit diagnostic. Report that authentication was rejected and identify the secret reference or workload identity, but never its value. When tokens are minted during the job, record the minting step separately from the dependency call. That distinction tells responders whether the identity provider or the target service failed.

## Exercise databases, queues, caches, and object stores safely

HTTP is only one dependency class. A complete smoke plan gives stateful systems a canary namespace and a cleanup policy.

| Dependency | Safe proof | Cleanup | Strong signal |
|---|---|---|---|
| SQL database | \`SELECT\` a seeded row, optionally transact an insert and rollback | Transaction rollback | Correct database, schema, and permissions |
| Queue | Publish a uniquely identified canary to a test topic and consume it | Consumer acknowledges canary | Producer, broker, routing, and consumer path |
| Cache | Set a namespaced key with a short TTL, then read it | TTL plus explicit delete | Write/read permissions and routing |
| Object store | Put and get a tiny object in a canary prefix | Delete in \`finally\` | Bucket, encryption policy, and credentials |
| Search index | Query a stable synthetic document | None | Alias, mapping compatibility, and freshness |

A transaction rollback is helpful only if it travels through the same database path as the application. If the application writes via an ORM and a connection proxy, a direct administrator connection proves the wrong route. Use the application's ordinary connection configuration with a dedicated low-risk statement.

This PostgreSQL example uses the standard \`psql\` client and fails on SQL errors:

\`\`\`bash
set -euo pipefail

: "\${DATABASE_URL:?DATABASE_URL is required}"

psql "\${DATABASE_URL}" \\
  --set ON_ERROR_STOP=1 \\
  --tuples-only \\
  --command "SELECT id FROM smoke_sentinels WHERE id = 'release-ready';"
\`\`\`

The seeded row should be managed like other environment fixtures. Assert its exact identifier and, if freshness matters, a revision maintained by deployment automation. Do not write a test that passes when the query returns zero rows simply because the database connection succeeded.

For queues, understand what the test proves. A successful publish confirms only the producer side. A consumed canary confirms routing and at least one consumer, but can disturb production metrics or trigger side effects if the routing key is wrong. Use a dedicated smoke topic or a message attribute that the consumer handles through a safe canary branch. Include a unique correlation ID and an expiry time.

## Connect browser smoke tests to dependency evidence

Browser smoke testing remains valuable because it exercises routing, cookies, frontend configuration, and the backend calls that a raw probe can miss. Use resilient locators and inspect the specific dependency response that supports the visible state. The [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) explains why roles, labels, and test IDs are more stable than CSS tied to presentation.

Here is a focused Playwright test that waits for the catalog response while asserting the rendered product:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('catalog dependency serves the seeded smoke product', async ({ page }) => {
  const responsePromise = page.waitForResponse((response) => {
    return (
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/products/smoke-product'
    );
  });

  await page.goto('/products/smoke-product');
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Smoke Test Product' }),
  ).toBeVisible();
  await expect(page.getByTestId('availability')).toHaveText('Available');
});
\`\`\`

This test does not mock the catalog call because its purpose is dependency health. In the larger regression suite, route interception may be appropriate for deterministic frontend scenarios. Label the two kinds clearly so nobody interprets a mocked test as evidence that the deployed dependency is reachable.

The frontend stack may use Jest, Vitest, Playwright, or another runner for other layers. Choose deliberately rather than forcing one runner to do every job. This [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) helps separate component, integration, and browser responsibilities.

## Run probes concurrently without creating a thundering herd

Independent probes can run concurrently, but unlimited parallelism can cause the outage the suite is meant to detect. A release job replicated across a large deployment matrix may multiply traffic unexpectedly. Set a global concurrency limit, keep each probe cheap, and use a distinct user agent where the protocol allows it.

\`Promise.allSettled\` is useful because it collects every result rather than discarding later evidence after the first rejection:

\`\`\`ts
import { dependencyPolicies } from './dependency-policies.js';
import { probeReady } from './probe-ready.js';

const results = await Promise.allSettled(
  dependencyPolicies.map((policy) =>
    probeReady(policy.name, policy.url, policy.timeoutMs),
  ),
);

let requiredFailures = 0;

for (let index = 0; index < results.length; index += 1) {
  const policy = dependencyPolicies[index];
  const result = results[index];

  if (result.status === 'fulfilled') {
    console.log('PASS ' + policy.name + ' revision=' + result.value.revision);
  } else {
    console.error('FAIL ' + policy.name + ' ' + String(result.reason));
    if (policy.required) requiredFailures += 1;
  }
}

if (requiredFailures > 0) process.exitCode = 1;
\`\`\`

This sample is appropriate for a small dependency set. For dozens of dependencies, add a real concurrency limiter or process them in batches. Keep ordering stable so output remains easy to compare between runs.

Separate required and optional results in the final summary. An optional dependency failure must still be visible and owned, but it should not accidentally block a release when the application has a verified fallback. Likewise, marking a dependency optional is safe only if another test proves the fallback.

## Put the suite at the correct deployment boundaries

Dependency smoke checks produce different evidence depending on where they run:

1. A pull-request environment proves configuration and basic integration before merge.
2. A post-deploy check inside the target network proves actual routing, identity, and environment bindings.
3. A pre-traffic check proves a new revision before it receives general traffic.
4. A post-traffic check proves the routed user path after load balancer and DNS changes.

One external CI runner cannot prove an internal service route, and one pod-local probe cannot prove public DNS. Run from the vantage points that users and services actually occupy.

A generic CI shell stage can preserve a concise machine-readable report while returning the correct exit status:

\`\`\`bash
set -euo pipefail

: "\${SMOKE_BASE_URL:?SMOKE_BASE_URL is required}"
: "\${SMOKE_ORDERS_TOKEN:?SMOKE_ORDERS_TOKEN is required}"

export ORDERS_API_URL="\${SMOKE_BASE_URL}"
export SMOKE_ORDERS_TOKEN

npm ci
npm run build
node --test dist/smoke/*.test.js
npx playwright test tests/smoke --project=chromium --workers=2
\`\`\`

Pin dependencies through the lockfile and use the repository's declared Playwright version. The commands assume matching scripts and paths exist in the project. They do not add hidden retries. If the deployment platform has a stabilization phase, model that phase explicitly before launching the suite.

Ready-made QA skills can also be installed from qaskills.sh with the qaskills CLI when you want an agent to follow a repeatable checking workflow. Treat any generated test as reviewed code: confirm target URLs, safety constraints, credentials, and failure policy before it reaches a release gate.

## Diagnose a green health route with a failing checkout

Consider a realistic incident. The deployment's service health endpoint returns 200, catalog pages load, but the checkout browser smoke fails while requesting the payment provider. The error is \`certificate has expired\`. A hurried response might add retries or temporarily disable TLS verification. Both actions obscure the cause and weaken protection.

The layered diagnosis is:

1. Resolve the provider hostname from the deployed workload. DNS succeeds and returns the expected addresses.
2. Test the TCP connection to port 443. It connects within the normal range.
3. Inspect the TLS handshake without sending credentials. The certificate presented for the hostname is expired.
4. Compare the provider hostname configured in the new revision with the previous revision. The new configuration points to an obsolete sandbox endpoint.
5. Restore the supported endpoint, rerun the TLS and authenticated business sentinel, then rerun checkout.

The failure was configuration drift, not provider instability. A generic 200 readiness route missed it because the application did not include payment in readiness, perhaps intentionally to preserve browsing during payment outages. The release smoke correctly blocked checkout without declaring the whole service dead.

Never set \`NODE_TLS_REJECT_UNAUTHORIZED=0\` as a diagnostic fix in CI. It can turn hostname mistakes and untrusted certificates into green checks. If a private environment uses an internal certificate authority, install that authority through the platform's supported trust configuration and verify the intended hostname.

## What teams get wrong about dependency health

The most damaging misconception is that more endpoints produce more confidence. A hundred shallow pings often create less actionable evidence than ten carefully chosen sentinels. They add noise, rate-limit pressure, and duplicate checks while missing authentication or stale data.

Other recurring mistakes include:

- Treating liveness as readiness. A process can run while its migrations, credentials, or required peers are broken.
- Accepting any 2xx response. A proxy-generated HTML login page can return 200 where JSON was expected.
- Checking from the wrong network. A laptop's successful request says nothing about a cluster egress policy.
- Retrying every error. Authentication denial, certificate expiry, and schema mismatch are not healed by immediate repetition.
- Using real customer records as sentinels. Deletion, privacy changes, or access controls make them unstable and risky.
- Logging whole responses. Diagnostic convenience can expose tokens and personal data.
- Making every dependency a release blocker. Optional services with tested fallbacks need a different severity.
- Ignoring cleanup failures. Canary objects and queue messages accumulate into operational noise.

Health checks should also avoid strict assertions on irrelevant details. If an endpoint's contract promises \`status\` and \`revision\`, do not snapshot every header and timestamp. Overly broad assertions create churn and teach teams to ignore failures.

## Give AI coding agents a constrained repair loop

AI coding agents are useful for maintaining the dependency inventory, generating small probes, and grouping failure logs, but they need boundaries. Supply the service map, approved endpoints, allowed operations, secret names without values, and the exact commands that validate changes.

A productive agent task is narrowly framed:

\`\`\`text
Add a required smoke check for the catalog dependency.
Use the existing CATALOG_URL environment variable.
Perform GET /health/ready with a 2 second timeout.
Require HTTP 200, application/json, status=ready, and a string revision.
Do not print headers or bodies. Do not add retries globally.
Run the Node smoke tests and report the changed files.
\`\`\`

Ask the agent to preserve existing test conventions and review its diff for accidental new internal links, network targets, or destructive operations. A generated queue probe that publishes to the default production topic is not acceptable merely because the code compiles.

Failure classification is another good agent-assisted task. Give it sanitized logs and have it label failures as configuration, DNS, connection, TLS, authentication, protocol, contract, data, or cleanup. Require quoted evidence from the log and allow \`unknown\`. That is safer than asking for a confident root cause from a single exception.

## Use a release decision matrix, not a wall of red

Convert probe results into an explicit decision. This keeps severity out of ad hoc test code and makes partial degradation understandable.

| Result | Required dependency | Optional dependency with tested fallback |
|---|---|---|
| Pass | Continue | Continue |
| One transient failure, retry passes | Continue, record instability | Continue, record instability |
| DNS, TLS, auth, or contract failure | Block and diagnose | Continue only if fallback smoke passes |
| Business sentinel fails | Block affected release | Degrade feature and alert owner |
| Cleanup fails after successful write | Block further canary writes, investigate | Alert and prevent accumulation |

Keep the original probe error, attempt count, target name, region, deployed revision, and correlation ID. These fields let operations compare failures across environments without exposing secrets. If a smoke test changes release state, retain its report with the deployment record.

Finally, review the inventory when architecture changes, not only after incidents. A service-map diff in pull requests can prompt a smoke policy update. Quarterly ownership checks catch abandoned vendor endpoints and expired canary identities. The suite stays small because every probe must justify the user capability and failure decision it protects.

## Frequently Asked Questions

### Should a dependency health smoke test call production services?

Post-deployment smoke tests often must call production dependencies to prove real routing and credentials, but the operation should be safe by design. Prefer read-only metadata, synthetic records, sandbox authorizations, dedicated canary topics, and namespaced objects with automatic expiry. Coordinate rate limits and monitoring so the traffic is identifiable. If no safe production operation exists, test the closest supported control-plane signal and separately validate the business path in a production-like environment. Never use a real customer record merely because it is convenient.

### How many retries should a smoke dependency check use?

Use the smallest retry policy that distinguishes brief rollout turbulence from a persistent fault. For a fast release gate, one additional attempt after a short delay is often enough, but that number is illustrative rather than universal. Do not retry deterministic failures such as invalid credentials, an expired certificate, an unexpected media type, or a schema mismatch. Preserve each attempt and enforce an overall suite deadline. If a dependency regularly needs many retries, investigate readiness, capacity, or routing instead of normalizing the instability.

### What is the difference between readiness and a dependency smoke check?

Readiness usually tells an orchestrator whether one service instance should receive traffic. It may intentionally ignore optional or remotely failing dependencies to avoid cascading removal of healthy instances. A dependency smoke check evaluates a deployed environment against release-critical journeys, from a relevant network vantage point, using real authentication and a small business sentinel. Readiness protects traffic routing continuously. Smoke checks support release decisions at chosen boundaries. They can share low-level code, but their scope, severity rules, and consumers should remain distinct.

### How should failures be reported to an AI coding agent?

Provide sanitized, structured evidence: dependency name, environment, deployed revision, layer, attempt number, duration, allowed status, observed status, and the exact non-secret error. Include the command needed to reproduce from an authorized environment and the files that define the probe. Ask the agent to classify evidence before proposing a change, and permit an unknown classification. Withhold tokens, authorization headers, customer payloads, and broad production access. Require the normal test command and a reviewed diff before accepting any suggested repair.
`,
};
