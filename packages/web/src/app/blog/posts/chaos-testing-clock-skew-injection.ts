import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chaos Testing Clock Skew Injection for Time-Sensitive Systems',
  description: 'Master chaos testing clock skew injection with safe experiments that expose expiry, ordering, lease, and authentication failures before production.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Chaos Testing Clock Skew Injection for Time-Sensitive Systems

Chaos testing clock skew injection deliberately makes one process, service, browser, or host perceive a different time from its peers, then checks whether the system preserves its safety guarantees. The practical workflow is to define a time-dependent invariant, inject a bounded positive or negative offset at the narrowest useful boundary, observe both customer behavior and internal signals, and restore normal time automatically.

The payoff is larger than finding a date-format bug. Clock skew can invalidate authentication tokens, reorder events, extend distributed locks, expire cache entries early, corrupt last-write-wins decisions, and make retry deadlines behave inconsistently. A useful experiment therefore measures business outcomes and protocol behavior, not merely whether a process stays alive. The examples below use Node.js, Vitest, Playwright, and Linux-compatible test environments, but the design applies to any stack with explicit time boundaries.

## Define the Time Contract Before Moving Any Clock

A clock experiment needs a claim that can be proved or disproved. “The application handles skew” is too vague. “A worker that is 90 seconds ahead cannot process the same lease concurrently with the current owner” is testable. So is “a browser 5 minutes behind can refresh an access token without entering a redirect loop.”

Inventory every place where wall time influences a decision. Separate wall time, such as a UTC timestamp, from elapsed time, such as a 30-second timeout. Elapsed time should normally use a monotonic clock because wall time can jump. A test that changes \`Date.now()\` will reveal wall-time coupling, but it does not emulate monotonic clock behavior or CPU suspension.

| Time-sensitive mechanism | Safety or availability invariant | Evidence to capture |
|---|---|---|
| Access token validation | Valid tokens are accepted within the agreed tolerance | Status code, validator reason, issuer and verifier time |
| Distributed lease | At most one owner performs the protected action | Lease owner history, fencing token, duplicate side effects |
| Cache expiry | Stale data is not served beyond policy | Entry age, cache result, origin request count |
| Event ordering | Equal or skewed timestamps do not silently discard events | Event IDs, sequence numbers, final aggregate |
| Retry deadline | Attempts stop within the defined elapsed-time budget | Attempt timestamps, final error, duration |
| Signed request | Tolerance rejects replays without rejecting healthy clients | Signature result, request age, nonce state |

Classify each invariant as safety or availability. Safety means something bad must never happen, such as two writers entering a critical section. Availability means a legitimate operation completes within a bound. Positive skew may threaten safety by making a lease appear expired. Negative skew may threaten availability by making a freshly issued token appear not yet valid. Test both directions because they exercise different branches.

Write the experiment card in plain language:

\`\`\`yaml
name: verifier-clock-plus-90s
hypothesis: valid checkout requests remain accepted during bounded verifier skew
steady_state:
  checkout_success: true
  duplicate_orders: 0
fault:
  target: payment-token-verifier
  offset_seconds: 90
  duration_seconds: 120
abort_when:
  error_rate_percent: 2
  duplicate_orders: 1
recovery:
  verifier_offset_seconds: 0
\`\`\`

Those thresholds are illustrative, not universal recommendations. Choose limits from your service objective and data-loss tolerance. A duplicate financial operation should usually stop the test immediately, while a temporary rise in rejected synthetic requests might be acceptable in an isolated environment.

## Build a Controllable Clock Boundary in Application Code

The safest first injection point is an application-owned clock interface. It changes one component without requiring privileged host operations, and it works in unit, integration, and contract tests. Do not scatter \`Date.now()\` throughout domain code. Pass a clock to the logic that makes time decisions.

\`\`\`ts
export interface Clock {
  nowMs(): number;
}

export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
}

export class OffsetClock implements Clock {
  constructor(
    private readonly base: Clock,
    private readonly offsetMs: number,
  ) {}

  nowMs(): number {
    return this.base.nowMs() + this.offsetMs;
  }
}

export type Token = {
  subject: string;
  issuedAtMs: number;
  expiresAtMs: number;
};

export function validateToken(token: Token, clock: Clock, toleranceMs: number): boolean {
  const now = clock.nowMs();
  const notIssuedYet = token.issuedAtMs > now + toleranceMs;
  const alreadyExpired = token.expiresAtMs < now - toleranceMs;
  return !notIssuedYet && !alreadyExpired;
}
\`\`\`

This boundary makes direction and tolerance visible. The validator accepts a token when the perceived time is within the permitted window. Whether your real token library exposes clock tolerance, and its exact option name, depends on that library. Verify its official documentation instead of assuming a configuration key.

A Vitest table can cover the boundary without sleeping:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { OffsetClock, type Clock, validateToken } from './clock';

const base: Clock = { nowMs: () => Date.parse('2026-08-08T12:00:00Z') };
const token = {
  subject: 'user-42',
  issuedAtMs: Date.parse('2026-08-08T11:59:30Z'),
  expiresAtMs: Date.parse('2026-08-08T12:05:00Z'),
};

describe('token validation under verifier skew', () => {
  it.each([
    { offsetMs: -60_000, toleranceMs: 30_000, accepted: true },
    { offsetMs: -61_000, toleranceMs: 30_000, accepted: false },
    { offsetMs: 330_000, toleranceMs: 30_000, accepted: true },
    { offsetMs: 331_000, toleranceMs: 30_000, accepted: false },
  ])('evaluates offset $offsetMs', ({ offsetMs, toleranceMs, accepted }) => {
    const clock = new OffsetClock(base, offsetMs);
    expect(validateToken(token, clock, toleranceMs)).toBe(accepted);
  });
});
\`\`\`

Vitest uses \`-t\` or \`--testNamePattern\` when you want to select a named test. For example, \`npx vitest run -t "token validation"\` runs this group. That is useful while refining the matrix, but the complete suite should run in CI because boundary failures often occur only in one skew direction.

## Choose an Injection Layer That Matches the Risk

An injected clock inside business logic is precise, but it cannot expose every integration failure. Select the smallest layer capable of reproducing the risk. A browser clock catches client-side expiry behavior. A process shim can reach code that is hard to refactor. A container or virtual machine clock experiment can exercise TLS, databases, and system libraries, but it carries more operational risk.

| Injection layer | What it represents | Strength | Important limitation |
|---|---|---|---|
| Dependency-injected clock | One decision boundary | Deterministic and fast | Misses third-party libraries using system time |
| Browser clock control | One page or browser context | Exercises UI timers and dates | Does not change server time |
| Protocol test doubles | Skewed timestamps in messages | Portable across environments | Does not alter local clock reads |
| Process-level interception | One process sees shifted wall time | Broad application coverage | Native components may bypass it |
| Isolated host or VM | Operating system clock differs | Highest realism | Privileged and capable of disrupting infrastructure |

Avoid changing the clock of a shared CI runner. Time changes can break TLS validation, log correlation, package downloads, other jobs, and the CI control plane itself. If an operating-system experiment is necessary, use an ephemeral isolated host or virtual machine with no shared workload. Confirm that the platform permits the operation, install an automatic rollback, and verify synchronization after recovery.

Do not confuse network delay with clock skew. Delaying packets changes arrival time and often increases elapsed duration. Clock skew changes the timestamp a participant believes. Real incidents may combine both, but separate them first so a failure has a diagnosable cause.

## Exercise Browser Expiry Without Waiting in Real Time

Playwright exposes clock controls for page-level time. Install the clock before application code initializes, then render a realistic session countdown and move browser time. This test checks the UI reaction to a browser that jumps forward while keeping the server response controlled.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('expires the local session after a forward browser jump', async ({ page }) => {
  const start = new Date('2026-08-08T10:00:00Z');
  await page.clock.install({ time: start });

  await page.setContent([
    '<p data-testid="session">Active</p>',
    '<script>',
    'const expiresAt = Date.now() + 60_000;',
    'const element = document.querySelector("[data-testid=session]");',
    'setInterval(() => {',
    '  element.textContent = Date.now() >= expiresAt ? "Expired" : "Active";',
    '}, 1_000);',
    '</script>',
  ].join(''));

  await expect(page.getByTestId('session')).toHaveText('Active');
  await page.clock.runFor(61_000);
  await expect(page.getByTestId('session')).toHaveText('Expired');
});
\`\`\`

The Clock API documentation is at https://playwright.dev/docs/clock. Use documented behavior for the Playwright version in your repository. A UI clock test proves browser behavior only. If the backend independently accepts an expired credential, this test will not catch it. Pair it with API validation at the trust boundary.

Stable assertions matter when time changes cause rerenders. Prefer role, label, and explicit test-id locators over DOM traversal. The [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) explain how to keep those assertions resilient. If your team is still deciding which layers belong in Vitest, Playwright, or another runner, use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) to divide responsibilities.

## Test Leases With Fencing, Not Hope

Clock skew is especially dangerous in distributed locks. Imagine worker A obtains a lease for 30 seconds. A pauses. Worker B, whose clock is ahead, concludes that the lease expired and begins work. Worker A resumes and also writes. Extending the lease duration reduces probability but does not prove exclusive access.

Fencing tokens address the safety problem. Each successful lease acquisition receives a strictly increasing token. The protected resource rejects writes with a token older than the highest one already seen. The clock can influence who thinks they own the lease, but it cannot authorize a stale owner to overwrite newer work.

\`\`\`ts
type Write = { worker: string; fencingToken: number; value: string };

export class FencedRegister {
  private highestToken = 0;
  private storedValue = '';

  write(command: Write): void {
    if (command.fencingToken < this.highestToken) {
      throw new Error('stale fencing token');
    }
    this.highestToken = command.fencingToken;
    this.storedValue = command.value;
  }

  value(): string {
    return this.storedValue;
  }
}

const register = new FencedRegister();
register.write({ worker: 'worker-b', fencingToken: 12, value: 'new result' });

try {
  register.write({ worker: 'worker-a', fencingToken: 11, value: 'stale result' });
  throw new Error('expected the stale write to fail');
} catch (error) {
  if (!(error instanceof Error) || error.message !== 'stale fencing token') {
    throw error;
  }
}

if (register.value() !== 'new result') {
  throw new Error('newer value was overwritten');
}
\`\`\`

The critical assertion is not “only one worker believed it held the lease.” Under partitions, pauses, and skew, that belief may temporarily diverge. Assert that only the holder of the newest fencing token can mutate the protected resource. Also record the acquisition token in logs and traces so an incident can be reconstructed.

## Inject Skew Into Message Timestamps

Many teams cannot change clocks in an integration environment, but they can generate messages with controlled timestamps. This is often the most portable way to test ordering, freshness, and replay protection. The consumer should distinguish event time, ingestion time, and a durable sequence when order matters.

\`\`\`ts
import { expect, test } from 'vitest';

type Event = {
  id: string;
  aggregateId: string;
  sequence: number;
  occurredAt: string;
  value: string;
};

function reduceEvents(events: Event[]): string {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  let expected = 1;
  let value = '';
  for (const event of ordered) {
    if (event.sequence !== expected) throw new Error('sequence gap');
    value = event.value;
    expected += 1;
  }
  return value;
}

test('uses sequence rather than skewed wall timestamps', () => {
  const events: Event[] = [
    { id: 'e2', aggregateId: 'a1', sequence: 2, occurredAt: '2026-08-08T09:58:00Z', value: 'paid' },
    { id: 'e1', aggregateId: 'a1', sequence: 1, occurredAt: '2026-08-08T10:00:00Z', value: 'created' },
  ];

  expect(reduceEvents(events)).toBe('paid');
});
\`\`\`

This test intentionally makes the later sequence carry an earlier wall timestamp. A consumer that sorts only by \`occurredAt\` returns the wrong final state. The remedy is not to pretend timestamps are perfectly synchronized. Use causal metadata, a broker offset, or an aggregate sequence for decisions that require order.

## Observe the Experiment From More Than One Clock

Logs alone can become deceptive during a clock fault because their timestamps inherit the fault. Preserve at least one observer whose clock is outside the injection target, such as the test controller or telemetry backend. Add stable identifiers and duration measurements so records can be correlated without relying solely on timestamp order.

| Signal | Useful fields | Failure it distinguishes |
|---|---|---|
| Structured application log | request ID, perceived time, offset, decision reason | Expected rejection versus unexpected exception |
| Distributed trace | trace ID, span duration, peer service, status | Cross-service latency versus timestamp disagreement |
| Counter | outcome, fault cohort, component | Error-rate change during the experiment |
| Lease audit record | owner, fencing token, acquired and released state | Stale owner attempt versus duplicate accepted write |
| Business ledger | idempotency key, operation ID, final status | Customer-visible duplication or loss |

Label metrics with a small bounded experiment identifier or cohort, not raw offsets, token subjects, timestamps, or request IDs. Those high-cardinality labels can overload a monitoring system and obscure the very failure you need to see. Keep detailed values in logs or traces.

For every fault, compare a control path with an injected path. Send the same synthetic request through an unskewed verifier and a skewed verifier. If both fail, the incident may be unrelated to time. If only the skewed cohort fails at the predicted boundary, the diagnosis is much stronger.

## Diagnose the Token Refresh Loop Failure Mode

A realistic failure begins with a client clock five minutes behind. The server issues an access token and returns an absolute expiry. The browser calculates that plenty of time remains, even after the server starts rejecting the token. The API returns 401, the client refreshes, calculates the same misleading lifetime, retries, and receives another 401. An eager interceptor can create a high-volume loop.

Diagnose it in this order:

1. Correlate the initial request, refresh, and retry with one operation ID.
2. Record the server rejection reason without exposing the credential.
3. Compare issuer time, verifier time, and the browser's perceived time.
4. Count refresh attempts and ensure a per-operation ceiling exists.
5. Confirm whether the client used its local wall clock for a server-authoritative decision.

The expected recovery is bounded. The client may refresh once, update its session state, and either proceed or require authentication. It must not retry indefinitely. Test the cap directly:

\`\`\`ts
import { expect, test } from 'vitest';

async function requestWithOneRefresh(
  send: () => Promise<number>,
  refresh: () => Promise<void>,
): Promise<number> {
  const firstStatus = await send();
  if (firstStatus !== 401) return firstStatus;
  await refresh();
  return send();
}

test('bounds refresh behavior when skew keeps causing rejection', async () => {
  let sends = 0;
  let refreshes = 0;
  const status = await requestWithOneRefresh(
    async () => {
      sends += 1;
      return 401;
    },
    async () => {
      refreshes += 1;
    },
  );

  expect(status).toBe(401);
  expect(sends).toBe(2);
  expect(refreshes).toBe(1);
});
\`\`\`

The test does not claim the skew is harmless. It proves the client fails in a controlled way. A separate contract test should prove the server's accepted tolerance and the refresh endpoint's behavior.

## What People Get Wrong About Clock Skew

The most common mistake is adding a generous tolerance and declaring the problem solved. Tolerance trades availability against the security or consistency window. A wider signed-request window may admit replays for longer. A longer token grace period may accept a credential after revocation expectations. The value needs a threat model and a documented protocol contract.

Another mistake is testing only a clock that moves forward. Backward movement can make a new token appear premature, produce negative ages, delay cache expiry, and cause timestamp-based IDs to collide or sort incorrectly. Include positive skew, negative skew, and a discrete jump after normal operation begins.

Teams also treat timestamp ordering as causality. Synchronized clocks reduce error but do not create a total order across distributed work. If correctness requires ordering, encode ordering explicitly. Finally, broad host clock mutation is often chosen too early. Start at the application or protocol boundary, and escalate realism only when the unresolved risk requires it.

## Turn the Experiment Into a Safe CI Gate

Keep the deterministic boundary tests in every pull request. Run broader service experiments on an ephemeral environment, either on a schedule or before changes to identity, caching, leases, billing, or event processing. A good gate reports the exact invariant that failed, the offset, direction, affected component, and evidence artifact.

| CI tier | Fault scope | Runtime target | Gate condition |
|---|---|---|---|
| Pull request | Injected clock and timestamp fixtures | Seconds | All boundary matrices and safety assertions pass |
| Service integration | One process or container dependency | Minutes | Error and retry behavior stay within contract |
| Ephemeral system | Selected services with control cohort | Minutes | Business invariant and recovery checks pass |
| Operational exercise | Isolated production-like infrastructure | Planned window | Abort criteria, observability, and rollback all work |

A minimal shell runner can preserve evidence and guarantee cleanup for an application-level fault endpoint in a disposable test environment:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

base_url="http://127.0.0.1:8080"
experiment_id="clock-skew-ci-42"

cleanup() {
  curl --fail --silent --show-error \\
    -X DELETE "\${base_url}/test-only/clock-offset" >/dev/null
}
trap cleanup EXIT

curl --fail --silent --show-error \\
  -H 'content-type: application/json' \\
  -X PUT \\
  -d '{"offsetMs":90000,"experimentId":"clock-skew-ci-42"}' \\
  "\${base_url}/test-only/clock-offset" >/dev/null

curl --fail --silent --show-error \\
  -H "x-experiment-id: \${experiment_id}" \\
  "\${base_url}/synthetic/checkout" > result.json

node -e '
  const fs = require("node:fs");
  const result = JSON.parse(fs.readFileSync("result.json", "utf8"));
  if (result.duplicateOrders !== 0) process.exit(1);
  if (result.status !== "accepted") process.exit(1);
'
\`\`\`

The endpoint in this example is explicitly test-only and must not be exposed in production. Protect it through environment-level controls and fail startup if it is enabled in a production configuration. Notice the shell variables use braces, which keeps names unambiguous when adjacent text is added.

The rollback is part of the test, not an afterthought. After cleanup, verify that perceived time is back within the expected synchronization bound and that normal synthetic traffic succeeds. A test that finds a bug but leaves an environment skewed has created a second incident.

## Preserve Reproducible Evidence for Every Offset

A clock failure is difficult to reconstruct when the report contains only an assertion message. Store the experiment definition, target build identifier, injected offset, injection start and stop as observed by the controller, synthetic operation IDs, and the outcome of each invariant. Include the target's perceived timestamp as data, but order the experiment timeline using the external controller or monotonic durations.

Make failure output comparative. For example, report that the control verifier accepted operation \`op-42\` while the plus-90-second verifier rejected the identical token as expired. Include token issuance and expiry timestamps without storing the token itself. For lease tests, retain fencing tokens and accepted write IDs. This evidence lets a reviewer distinguish a genuine clock boundary from a fixture mistake.

Replay should require only a build and a manifest, not manual clock changes. Fix random seeds, use explicit UTC instants, and avoid dates near daylight-saving transitions unless calendar behavior is the subject of the test. Then add separate calendar cases for local-time risks. This division keeps distributed-clock failures distinct from timezone and calendar calculations while ensuring neither is ignored.

## Expand From Boundary Tests to a Clock-Fault Matrix

A single offset at one instant can leave important transitions untested. Build a matrix across direction, magnitude, injection timing, component role, and recovery method. Inject before process startup to find initialization assumptions. Inject after a token, lease, or cache entry is created to reproduce a clock jump during active work. Restore time gradually only if the real synchronization mechanism slews; otherwise use a discrete return and observe how the application handles a backward or forward correction.

The component role changes the expected failure. A skewed issuer can create credentials that verifiers consider premature. A skewed verifier can reject otherwise valid credentials. A skewed lease contender may acquire too early, while a skewed current owner may hold work too long. A browser offset affects presentation and local scheduling but should not override server-authoritative authorization. Preserve these roles in the scenario name so a failure report is unambiguous.

Magnitude should include four categories: normal synchronization error, the documented tolerance boundary, just beyond the boundary, and a clearly invalid extreme used to prove controlled failure. The extreme case is not a resilience promise. It confirms that the system rejects safely, limits retries, avoids duplicate effects, and produces a diagnosable reason. Do not broaden a security tolerance merely to make that case pass.

Run each meaningful scenario against a control cohort and repeat it enough times to expose nondeterministic races. Repetition counts are experiment-specific, so report the actual count rather than implying statistical certainty. If a lease test fails once in a repeated run, retain the precise acquisition and fencing history. Safety violations do not become acceptable because the aggregate success percentage looks high.

Finally, test recovery with work already in flight. Restore the clock while a request waits on a deadline, a refresh is pending, or a lease renewal is scheduled. Assert that timers do not fire in an uncontrolled burst, retry budgets remain intact, and the next clean operation succeeds. This transition often reveals more than a test that resets the process after every offset, because production synchronization usually changes time without conveniently discarding application state.

## Frequently Asked Questions

### What offset should a clock skew experiment inject?

Start with the maximum offset your protocol explicitly claims to tolerate, then test just inside and just outside that boundary in both directions. For example, a documented 30-second tolerance suggests cases at negative 29, negative 31, positive 29, and positive 31 seconds. Add larger offsets only to validate controlled failure and recovery. Do not copy an arbitrary value from another system, because token, lease, signature, and cache risks have different limits.

### Can Playwright change the server clock?

No. Playwright clock controls affect time inside the browser page, which is ideal for countdowns, polling, browser-side token handling, and date presentation. They do not alter the API server, database, or identity provider. To test disagreement between browser and server, control the page clock while keeping server responses deterministic. To test two backend services with different perceived time, inject clocks into those services or use isolated infrastructure designed for the experiment.

### Is network latency equivalent to clock skew?

No. Network latency delays delivery and increases observed elapsed time, while clock skew makes participants disagree about timestamps at the same real moment. Both can cause deadline and lease failures, but through different mechanisms. Test each fault independently first, with identical workload and observability, so the failing invariant has a clear cause. A later combined experiment can represent a more realistic outage after the individual behaviors and rollback paths are understood.

### How do I prevent clock chaos tests from damaging CI?

Prefer dependency-injected clocks, controlled message timestamps, or browser clock APIs for routine CI. If system time must change, use a dedicated ephemeral virtual machine with no shared jobs, automatic rollback, strict duration limits, and an external observer. Never modify a shared runner's clock. Keep credentials synthetic, define abort thresholds before injection, and verify both time synchronization and a normal business transaction after recovery. Store experiment evidence even when cleanup succeeds.
`,
};
