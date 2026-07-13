import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Use Playwright expect.poll() for an Eventually Consistent API',
  description:
    'Use Playwright expect.poll() to verify eventually consistent API status changes with bounded retries, useful diagnostics, and no fragile manual sleep loops.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Use Playwright expect.poll() for an Eventually Consistent API

The POST returned 202, the job identifier is valid, and the worker will update the resource when it finishes. At that exact moment, a direct assertion against GET /exports/exp-42 is more likely to observe \`queued\` than \`ready\`. Nothing is necessarily broken. The test has reached the consistency window between accepting work and publishing its result.

Playwright's \`expect.poll()\` is designed for this boundary. It repeatedly invokes an asynchronous or synchronous producer, feeds the returned value to a matcher, and stops when the matcher passes or the polling timeout expires. That gives an API test the retry semantics of a web-first assertion without hiding the wait in a home-grown loop.

This tutorial uses an export service because the lifecycle is concrete: create an export, receive \`202 Accepted\`, poll its status endpoint, then download the artifact. The same design applies to search indexing, webhook processing, replicated reads, delayed fraud decisions, and any workflow where the product contract explicitly promises eventual completion.

## Model the API transition before polling it

Polling is only defensible when the system contract permits intermediate observations. Write the state transition down first. If an endpoint promises synchronous creation with \`201 Created\`, polling until the object appears would conceal a defect. If it promises asynchronous acceptance with a status URL, an immediate terminal assertion would be the incorrect test.

For an export API, the useful contract might be:

| Observation | Permitted values | Test consequence |
|---|---|---|
| Create response | HTTP 202 plus an export id | Fail immediately if acceptance is malformed |
| Status during processing | \`queued\` or \`running\` | Continue observing within the service objective |
| Successful terminal state | \`ready\` plus \`downloadUrl\` | Stop polling and test the artifact |
| Failed terminal state | \`failed\` plus an error code | Abort early, do not burn the full timeout |
| Unknown export | HTTP 404 | Treat as a defect after a valid create response |

This distinction separates retryable observations from terminal failures. A simplistic poll that returns only a status string cannot express that \`failed\` should end the test now. Later we will preserve the entire response model so the matcher and diagnostics remain useful.

Also decide which read path matters. If production clients read through an API gateway, poll through that gateway. Calling an internal database or worker endpoint may prove that processing finished while missing stale gateway caches, projection lag, or authorization defects.

## A minimal expect.poll() status check

The most direct form returns one value from the polling callback and applies a normal Playwright matcher to it. The callback can await \`APIRequestContext.get()\`; \`expect.poll()\` handles the retry schedule.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('an accepted export eventually becomes ready', async ({ request }) => {
  const createResponse = await request.post('/api/exports', {
    data: { report: 'quarterly-revenue', format: 'csv' },
  });

  expect(createResponse.status()).toBe(202);
  const { id } = (await createResponse.json()) as { id: string };

  await expect
    .poll(
      async () => {
        const response = await request.get(\`/api/exports/\${id}\`);
        expect(response.status()).toBe(200);
        const body = (await response.json()) as { status: string };
        return body.status;
      },
      {
        message: \`export \${id} should reach ready\`,
        intervals: [250, 500, 1_000, 2_000],
        timeout: 15_000,
      },
    )
    .toBe('ready');
});
\`\`\`

The assertion inside the callback is deliberate but narrow: every valid status lookup must return 200. If the created resource disappears, retrying a 404 for fifteen seconds adds noise. The callback returns only the evolving business value, which makes the final matcher failure say what was last observed.

Playwright's default polling intervals are 100, 250, 500, and 1,000 milliseconds. After the supplied list is exhausted, the last interval continues to be used. Choose intervals based on the system's expected completion curve, not on a desire to make the test look fast. A worker that normally runs for eight seconds does not need ten queries in its first second.

The polling timeout belongs to \`expect.poll()\`. It is separate from the per-request timeout and should fit within the overall Playwright test timeout. If a request itself can hang for thirty seconds while the poll budget is fifteen seconds, failure timing becomes hard to reason about. Give the request a smaller explicit timeout when necessary.

## Keep transient transport errors distinct from business state

An eventually consistent state is not permission to retry everything. A \`running\` payload is a valid business observation. A DNS error, expired credential, invalid JSON document, or unexpected 500 response is a different class of failure.


| Condition observed by callback | Usually retry? | Reason |
|---|---:|---|
| 200 with \`queued\` | Yes | Documented nonterminal state |
| 200 with \`running\` | Yes | Work is progressing |
| 429 with \`Retry-After\` | Sometimes | Only if throttling is part of the client contract |
| 401 or 403 | No | More attempts will not repair authorization |
| 404 after successful creation | Usually no | Violates lifecycle continuity unless documented |
| Invalid JSON or missing \`status\` | No | Response contract is broken |
| Connection reset | Policy decision | A transport retry may be reasonable, but track it separately |


\`APIRequestContext\` returns an \`APIResponse\` for HTTP error status codes by default, so inspect the status explicitly. Its \`maxRetries\` request option covers network errors only in a limited way, currently retrying \`ECONNRESET\`; it does not turn 503 responses into automatic retries. Do not confuse request transport retries with state polling.

If the service explicitly documents a brief 404 while a read model is created, encode that exception visibly. Return a discriminated observation such as \`{ kind: 'not-visible-yet' }\` and make the expectation accept only the allowed transition. A comment should name the contract or incident that justifies it. Otherwise a permissive callback becomes an invisibility cloak for regressions.

## Poll a rich observation and fail fast on terminal states

Returning the full observation gives better timeout output and enables early rejection of impossible progress. The following helper records attempt count, validates each payload, and throws immediately for a terminal \`failed\` state. It uses only Playwright and ordinary TypeScript.

\`\`\`typescript
import { expect, test, type APIRequestContext } from '@playwright/test';

type ExportStatus = {
  status: 'queued' | 'running' | 'ready' | 'failed';
  downloadUrl?: string;
  errorCode?: string;
};

async function readExport(request: APIRequestContext, id: string): Promise<ExportStatus> {
  const response = await request.get(\`/api/exports/\${id}\`, { timeout: 2_000 });
  if (response.status() !== 200) {
    throw new Error(\`status lookup for \${id} returned \${response.status()}\`);
  }

  const body = (await response.json()) as Partial<ExportStatus>;
  if (!['queued', 'running', 'ready', 'failed'].includes(body.status ?? '')) {
    throw new Error(\`export \${id} returned an invalid status\`);
  }
  return body as ExportStatus;
}

test('export publishes a downloadable CSV', async ({ request }) => {
  const created = await request.post('/api/exports', {
    data: { report: 'inventory-aging', format: 'csv' },
  });
  expect(created.status()).toBe(202);
  const { id } = (await created.json()) as { id: string };
  let attempts = 0;

  await expect
    .poll(
      async () => {
        attempts += 1;
        const snapshot = await readExport(request, id);
        if (snapshot.status === 'failed') {
          throw new Error(\`export failed with \${snapshot.errorCode ?? 'unknown error'}\`);
        }
        return snapshot;
      },
      {
        message: \`export \${id} should publish a download URL\`,
        intervals: [200, 500, 1_000, 2_000, 3_000],
        timeout: 20_000,
      },
    )
    .toMatchObject({ status: 'ready', downloadUrl: expect.any(String) });

  const finalStatus = await readExport(request, id);
  const download = await request.get(finalStatus.downloadUrl!);
  expect(download.status()).toBe(200);
  expect(download.headers()['content-type']).toContain('text/csv');
});
\`\`\`

The stable export id in the custom message connects a failure to service logs. If attempt count is important, include it in the returned observation rather than interpolating mutable state into the options object, which is constructed before polling begins.

The final read after the poll avoids smuggling the successful object out through mutable closure state. That costs one request but keeps the assertion straightforward. In a high-volume test, you could assign the last snapshot to a typed variable inside the callback, then carefully assert that it was set. Prefer clarity until request cost proves material.

## Pick a timeout from the product promise

A polling budget is an executable statement about acceptable latency. If the public contract says exports complete within sixty seconds, a five-second test does not validate that promise. Conversely, setting every poll to five minutes can turn a service slowdown into a painfully slow pipeline.

Use three inputs:

1. The externally stated completion objective, if one exists.
2. The known performance envelope of the test environment.
3. The CI job's failure budget and parallel load.

The test does not have to wait through the maximum promise in every commit build. A sensible portfolio can run a shorter correctness check on pull requests and a full service-objective check in a scheduled environment with production-like capacity. Name them differently so a fifteen-second functional test is not reported as proof of a sixty-second SLO.

Do not add \`page.waitForTimeout()\` between probes. Fixed sleeps always pay their full cost, fail when the delay exceeds the guess, and obscure the value being awaited. A manual \`while\` loop can be made correct, but then your team owns deadline arithmetic, interval scheduling, assertion messages, and error preservation. For a single returned value, \`expect.poll()\` already provides those mechanics.

If you need multiple assertions to pass together, consider \`expect.toPass()\`, which retries a block of assertions. \`expect.poll()\` is clearer when one produced value has one matcher. This article stays with polling because the export lifecycle can be expressed as a single structured observation.

## Preserve evidence from every attempt without flooding output

An eventual-state failure needs more than "expected ready, received running." Was every attempt \`queued\`? Did it alternate between \`running\` and \`queued\`, suggesting replica inconsistency? Did latency increase? Capture a compact timeline locally, then include it only when the test fails.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('search document becomes queryable', async ({ request }, testInfo) => {
  const observations: Array<{ atMs: number; status: number; found: boolean }> = [];
  const startedAt = Date.now();

  try {
    await expect
      .poll(
        async () => {
          const response = await request.get('/api/search', {
            params: { q: 'poll-marker-841' },
            timeout: 1_500,
          });
          const body = (await response.json()) as { ids: string[] };
          const found = body.ids.includes('doc-841');
          observations.push({ atMs: Date.now() - startedAt, status: response.status(), found });
          return { httpStatus: response.status(), found };
        },
        { intervals: [300, 700, 1_500], timeout: 12_000 },
      )
      .toEqual({ httpStatus: 200, found: true });
  } catch (error) {
    await testInfo.attach('poll-observations.json', {
      body: Buffer.from(JSON.stringify(observations, null, 2)),
      contentType: 'application/json',
    });
    throw error;
  }
});
\`\`\`

Attaching only on failure keeps ordinary reports quiet. Never put authorization headers, raw cookies, or sensitive payload fields in the observation. The polling callback can execute many times, so a careless console log multiplies both noise and leakage risk.

A monotonic lifecycle deserves an additional assertion in a dedicated test. Record states and verify the sequence never goes from \`running\` back to \`queued\`. That is distinct from eventually reaching \`ready\`; combining every temporal property into one test often produces unreadable failures.

## Avoid accidental load and synchronized polling

One test polling every 100 milliseconds seems harmless. Two hundred parallel workers doing it against the same shared service are a synthetic traffic generator. CI can then cause the latency it is trying to measure.

Use increasing intervals, limit parallelism for expensive workflows, and delete created resources when the API supports cleanup. If the server returns \`Retry-After\`, a fixed \`expect.poll()\` interval list cannot dynamically adopt it. At that point a domain-specific polling helper may be justified, especially for a public client library whose retry compliance is itself under test.

The choice among waiting mechanisms should follow the observable contract:

| Mechanism | Best fit | Main limitation |
|---|---|---|
| \`expect.poll(producer).matcher()\` | One changing value observed through any async API | Fixed configured interval sequence |
| \`expect(callback).toPass()\` | Several assertions must become true together | Retries a block, so side effects require care |
| Locator web-first assertion | Browser DOM state such as text or visibility | Not intended for backend-only state |
| Domain polling helper | Server-directed backoff, jitter, cancellation, or rich history | More code and policy to maintain |
| Fixed timeout | Demonstrations where no condition exists | Slow and intrinsically flaky for real state |

Use [Playwright soft assertions](/blog/playwright-soft-assertions-expect-guide) for independent checks you want to collect before failing, but do not make a critical terminal-state poll soft merely to continue. For setup and backend calls, the [Playwright API request context guide](/blog/playwright-api-testing-context-request-guide) explains cookie sharing and isolated contexts.

## Prove readiness is stable when the contract requires it

Reaching a terminal label once is not always enough. A read served by replicas might report \`ready\`, then return \`running\` from a lagging replica on the next request. If clients require monotonic reads, add a separate stability check after the eventual assertion.

Do not bury this inside the same poll by requiring two consecutive successes unless consecutive success is the stated contract. That changes the completion rule and can make the final diagnostic obscure. First prove time to readiness, then issue several bounded reads and assert none regress. Capture response headers that identify a replica only when they are non-sensitive and officially supported.

Likewise, a search-index test should not stop at finding the document if deletion consistency matters. Create and appearance are one lifecycle; delete and disappearance are another. Use separate resource ids and timeout policies so a slow cleanup failure does not masquerade as slow indexing.

Eventual assertions also need an idempotent observation. If reading status advances the workflow, acknowledges a message, or consumes a one-time result, retries change the system. Test through a non-consuming status endpoint or build a domain helper that understands the destructive read. \`expect.poll()\` assumes the producer is safe to invoke repeatedly; Playwright cannot enforce that property for you.

## Review checklist for an eventual API assertion

Before merging, ask whether the callback is safe to repeat. GET and HEAD normally are, but teams sometimes poll by replaying a POST that starts new work. Create once, extract the identifier once, and repeat only the read.

Confirm that the matcher describes success, not mere absence of failure. \`.not.toBe('queued')\` would pass for \`failed\`; \`.toBe('ready')\` names the required outcome. Validate the terminal payload, not just the state label. A ready export without a download URL is incomplete.

Finally, force the failure path locally by using an impossible id or a deliberately short timeout. Read the report as if you were on call. It should identify the resource, final observation, and elapsed policy without requiring a rerun. Good polling makes asynchronous behavior explicit. Bad polling merely delays an ambiguous red build.

## Frequently Asked Questions

### Does expect.poll() retry exceptions thrown by its callback?

Treat callback exceptions as failures, not as normal returned observations. If a condition is legitimately transient, represent it as a value that the matcher can reject and retry. Throw for broken response contracts, forbidden statuses, and terminal failure states so the cause remains visible.

### What intervals does Playwright use when I omit them?

The documented default sequence is 100, 250, 500, and 1,000 milliseconds. Custom intervals are useful for slower workers, but the poll timeout still caps the overall assertion.

### Can I poll an APIResponse object directly?

You can return any value that a Playwright matcher understands, but returning an \`APIResponse\` usually produces less useful comparisons. Extract a stable object containing the status code and business fields you intend to assert.

### Should a 404 be retried after the create call succeeds?

Only when the service contract explicitly allows delayed read visibility. Otherwise, the status resource disappearing after acceptance is a lifecycle defect and should fail immediately.

### How do I test that processing does not exceed an SLO?

Set a poll timeout aligned with that SLO and retain observation timestamps. Run the check in an environment whose capacity is representative, and keep it separate from a shorter pull-request correctness test when necessary.
`,
};
