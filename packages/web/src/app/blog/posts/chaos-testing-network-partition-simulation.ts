import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Chaos Testing Network Partition Simulation for Service Resilience',
  description:
    'Practice chaos testing network partition simulation with safe lab setups, failure assertions, recovery checks, and CI guardrails for distributed services.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Chaos Testing Network Partition Simulation for Service Resilience

Chaos testing network partition simulation answers a blunt question: when service A cannot reach service B (or can reach it only one way), does the product fail loudly, fail safely, or corrupt data quietly? Partitions are not the same as process crashes. The process is still "up," health checks may still pass locally, and clients may hang until timeouts cascade. If you only kill containers, you never see the half-open worlds that real networks produce.

This article is for QA and reliability-minded automation engineers who want runnable partition drills, not abstract resilience slogans. You will map partition types, build a lab with intentional network cuts, write automated assertions around timeouts and degradation, wire safe CI experiments, and diagnose the failure mode where retries amplify an outage. Adjacent stack choices for functional tests live in the [complete JavaScript testing frameworks guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026); when UI probes validate degraded modes in the browser, lean on [Playwright locator best practices for 2026](/blog/playwright-best-practices-locators-2026).

Partition simulation is a scalpel. Use it where the blast radius is understood, observability is in place, and you can stop the experiment in one command.

## Partition Types You Must Name Explicitly

Ambiguous experiments produce ambiguous learning. Name the cut.

| Partition type | What breaks | Typical symptom | Common false confidence |
| --- | --- | --- | --- |
| Full bidirectional cut | A cannot talk to B and vice versa | Timeouts both ways | "We tested downtime" via kill only |
| Unidirectional cut | A -> B blocked, B -> A open | One-sided hangs, weird retries | Assuming symmetric failure |
| Latency injection | Packets delayed | Tail latency spikes | Average latency still looks fine |
| Packet loss | Intermittent drops | Flaky success under retries | Success rate hides retries storm |
| DNS partition | Name resolution fails | Sudden unknown host errors | IP literals still work in lab |
| Partial membership | Some replicas isolated | Split brain risk | Load balancer still routes |

Write the experiment hypothesis in one sentence: "If checkout cannot reach payments for 30 seconds, users see a retryable error and no double charge."

## Where to Simulate: Layers of Control

You can induce partitions at different layers. Prefer the highest layer that still exercises production-like code paths.

### Comparison of induction layers

| Layer | Examples | Pros | Cons |
| --- | --- | --- | --- |
| Application fault hooks | Feature flag "payments_unreachable" | Safe, easy in CI | May not match real TCP behavior |
| Service mesh / proxy | Timeout and abort rules in a sidecar or gateway | Close to prod networking | Needs mesh in lab |
| Container network | Network disconnect between compose services | Realistic for multi-container apps | Host-specific |
| OS traffic control | latency/loss on interfaces | Very realistic | Privileges; careful cleanup |
| Cloud fault services | Vendor failure injection offerings | Prod-like regions | Cost; permissions; safety review |

For local automation, application hooks plus container network cuts cover most team needs. Reserve OS-level tools for advanced game days.

## A Compose Lab With Intentional Cuts

Imagine a minimal system: \`web\`, \`api\`, \`payments\`, \`redis\`. The experiment blocks \`api\` from reaching \`payments\`.

\`\`\`yaml
services:
  web:
    image: ghcr.io/example/web:stable
    ports: ["3000:3000"]
    depends_on: [api]
  api:
    image: ghcr.io/example/api:stable
    environment:
      PAYMENTS_URL: http://payments:8080
      REDIS_URL: redis://redis:6379
    depends_on: [payments, redis]
  payments:
    image: ghcr.io/example/payments:stable
  redis:
    image: redis:7
\`\`\`

Exact image names are yours; keep them pinned. The partition can be applied with docker network disconnect/connect patterns documented by Docker, or with a proxy service that can blackhole traffic. Avoid undocumented flags.

### Operator script sketch

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

ACTION="\${1:-}"
case "\$ACTION" in
  cut)
    docker network disconnect lab_backend api || true
    docker network connect lab_isolated api
    echo "api moved to isolated network"
    ;;
  heal)
    docker network disconnect lab_isolated api || true
    docker network connect lab_backend api
    echo "api restored to backend network"
    ;;
  *)
    echo "usage: \$0 cut|heal" >&2
    exit 2
    ;;
esac
\`\`\`

Use dedicated networks so you do not brick unrelated containers. Always implement \`heal\` before \`cut\` in reviews.

## Automated Experiment Shape

A good automated partition test has five phases:

1. **Steady state**: prove the happy path works.
2. **Inject**: apply the cut.
3. **Observe**: assert degraded behavior within SLO of detection.
4. **Heal**: remove the cut.
5. **Recover**: assert return to steady state without manual reboot (or document if reboot is required).

\`\`\`ts
import { setTimeout as sleep } from 'node:timers/promises';

type HttpResult = { status: number; body: unknown; ms: number };

async function httpJson(url: string, init?: RequestInit): Promise<HttpResult> {
  const start = Date.now();
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, ms: Date.now() - start };
}

export async function runPaymentsPartitionExperiment(opts: {
  apiBase: string;
  cut: () => Promise<void>;
  heal: () => Promise<void>;
}) {
  // 1. Steady state
  const ok = await httpJson(\`\${opts.apiBase}/checkout/quote\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: 'SKU-100', qty: 1 }),
  });
  if (ok.status !== 200) {
    throw new Error(\`steady state failed: \${ok.status}\`);
  }

  // 2. Inject
  await opts.cut();

  // 3. Observe: expect fast failure mode, not infinite hang
  const degraded = await httpJson(\`\${opts.apiBase}/checkout/quote\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: 'SKU-100', qty: 1 }),
  });
  if (degraded.status !== 503 && degraded.status !== 504) {
    throw new Error(\`expected gateway error, got \${degraded.status}\`);
  }
  if (degraded.ms > 5_000) {
    throw new Error(\`degraded path too slow: \${degraded.ms}ms\`);
  }

  // 4. Heal
  await opts.heal();
  await sleep(1_000);

  // 5. Recover
  const recovered = await httpJson(\`\${opts.apiBase}/checkout/quote\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: 'SKU-100', qty: 1 }),
  });
  if (recovered.status !== 200) {
    throw new Error(\`recovery failed: \${recovered.status}\`);
  }
}
\`\`\`

Tune status codes to what your API actually returns. The assertion that matters is **bounded time to a clear error**, plus **clean recovery**.

## Timeouts, Retries, and the Amplification Failure Mode

### Realistic failure mode: retry storms during a partition

Symptom: payments is partitioned from api; api retries aggressively; thread pools or connection pools exhaust; unrelated endpoints fail; metrics show elevated error rates everywhere.

Diagnosis:

1. Inspect client retry configuration for the payments SDK or HTTP client.
2. Check max concurrent requests and circuit breaker state if you use one.
3. Compare request rate to payments before and during the experiment.
4. Read logs for repeated identical correlation ids or missing ones.
5. Watch queue depth if async work buffers calls.

Mitigations to validate in follow-up experiments:

- Fail fast with short timeouts on dependency calls.
- Exponential backoff with jitter (use documented options of your client library).
- Circuit breaking after a threshold of failures.
- Bulkheads so checkout cannot starve catalog.
- Idempotency keys so retries cannot double charge after heal.

### What people get wrong

People celebrate "we retried until success" without measuring cost. During a partition, infinite patience is not resilience; it is a self-inflicted denial of service. Chaos tests should assert **resource caps**, not only eventual success after heal.

## UI and API Probes Together

Backend assertions prove the service contract. UI probes prove the user message. When the API returns a retryable error, the browser should show a stable degraded state, not a spinner forever.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('checkout shows retryable error when payments partitioned', async ({ page }) => {
  // Assume a lab endpoint or admin hook arms the partition for this test user
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('alert')).toContainText(/temporarily unavailable|try again/i);
  // no unbounded spinner
  await expect(page.getByTestId('full-page-spinner')).toHaveCount(0);
});
\`\`\`

Keep locators resilient with roles and test ids as discussed in [Playwright locator best practices for 2026](/blog/playwright-best-practices-locators-2026). Visual noise is secondary; clarity of the error is primary.

## Experiment Catalog for Network Partitions

Maintain a living catalog, not a single demo script.

| Experiment id | Cut | Hypothesis | Abort condition | Cadence |
| --- | --- | --- | --- | --- |
| CHK-PAY-FULL | api/payments bidirectional | 503 within 3s; no charge | Error rate > 50% on non-checkout | Weekly lab |
| CHK-PAY-ONEWAY | api -> payments only | Same as full; logs show direction | Latency > 10s p95 checkout | Monthly |
| API-REDIS-LOSS | 20% loss api/redis | Degraded cache; core reads ok | Memory growth unbounded | Monthly |
| WEB-API-LATENCY | +2s latency web/api | UI shows pending; no double submit | Client timeouts exceed SLO | Sprint game day |
| DNS-PAY | payments DNS blocked | Clear config error metrics | Fallback to stale IP if any | Quarterly |

Each row needs an owner and a link to dashboards.

## Safety Rails Before You Touch Shared Environments

Never run partition chaos on production without organizational approval, progressive blast radius, and a kill switch. Most teams should start in ephemeral environments.

### Safety checklist

| Control | Required in shared env? | Notes |
| --- | --- | --- |
| Explicit allowlist of targets | Yes | No random pod kills |
| Time-boxed experiment | Yes | Auto-heal timer |
| Observable golden signals | Yes | Latency, traffic, errors, saturation |
| Customer impact estimate | Yes | Support informed |
| One-command heal | Yes | Tested before cut |
| Change window | Often | Avoid peak traffic |
| Audit log of injection | Yes | Who/when/what |

Local compose and preview environments should still auto-heal in \`finally\` blocks so a failed test does not leave the lab broken for the next job.

\`\`\`ts
export async function withPartition(
  cut: () => Promise<void>,
  heal: () => Promise<void>,
  fn: () => Promise<void>,
) {
  await cut();
  try {
    await fn();
  } finally {
    await heal();
  }
}
\`\`\`

## Application-Level Fault Hooks for CI

CI runners often cannot rewire docker networks freely. Application hooks make partition tests portable.

Example: payments client wrapper checks an env var or metadata header.

\`\`\`ts
export class PaymentsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fault: { partition: boolean; latencyMs: number } = {
      partition: process.env.FAULT_PAYMENTS_PARTITION === '1',
      latencyMs: Number(process.env.FAULT_PAYMENTS_LATENCY_MS ?? '0'),
    },
  ) {}

  async charge(input: { orderId: string; amount: number; idempotencyKey: string }) {
    if (this.fault.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.fault.latencyMs));
    }
    if (this.fault.partition) {
      const err = new Error('payments partition fault injected');
      (err as Error & { code?: string }).code = 'PAYMENTS_PARTITION';
      throw err;
    }
    const res = await fetch(\`\${this.baseUrl}/charge\`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': input.idempotencyKey,
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(\`charge failed: \${res.status}\`);
    }
    return res.json();
  }
}
\`\`\`

Gate fault hooks so they cannot activate in production builds without a remote config system that is itself tightly controlled. Many teams compile them out or require a non-prod environment marker.

## Assertions Beyond HTTP Status

Status codes are necessary but not sufficient. Assert:

- **Idempotency**: repeating a charge after heal does not double bill.
- **Data consistency**: order remains \`pending_payment\` not \`paid\` if charge never confirmed.
- **Metrics**: counter for dependency errors increments.
- **Logs/traces**: error includes dependency name and correlation id.
- **User messaging**: stable copy, no stack traces.

SQL-oriented consistency check example (schema is yours):

\`\`\`sql
SELECT status, payment_ref
FROM orders
WHERE id = $1;
\`\`\`

In the test harness:

\`\`\`ts
import assert from 'node:assert/strict';

export async function assertOrderNotPaid(orderId: string, query: (sql: string, params: unknown[]) => Promise<Array<{ status: string }>>) {
  const rows = await query('SELECT status FROM orders WHERE id = $1', [orderId]);
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].status, 'paid');
}
\`\`\`

## Integrating Partition Tests Into Delivery

### Suggested pyramid

1. **Unit**: client timeout and circuit breaker logic with fake clocks if available.
2. **Integration**: API process with fault hook on payments.
3. **Contract**: error payload shape for degraded mode.
4. **Lab chaos**: real network cut in compose weekly.
5. **Game day**: multi-team partition with UI, support, and runbooks quarterly.

Functional frameworks (Jest, Vitest, Playwright) host many of these layers; choose based on language and browser needs with help from the [complete JavaScript testing frameworks guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026).

### CI job policy

- PR: fault-hook integration tests only (fast, no privileged networking).
- Nightly: compose network cut experiments.
- Manual workflow_dispatch: larger game day scripts.

\`\`\`yaml
name: chaos-lab
on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:
jobs:
  partition:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f compose.lab.yml up -d
      - run: npm ci
      - run: npm run test:chaos:partition
      - if: always()
        run: docker compose -f compose.lab.yml down -v
\`\`\`

## Observability Requirements for Meaningful Chaos

If you cannot see the blast, you cannot learn.

Minimum signals:

- RED metrics per dependency (rate, errors, duration)
- Saturation (pool usage, queue depth)
- Distributed traces spanning web -> api -> payments
- Structured logs with \`dependency\`, \`fault_injected\`, \`experiment_id\` fields

Emit an experiment annotation event when cut and heal fire so dashboards can mark the window.

\`\`\`ts
export async function annotate(experimentId: string, phase: 'cut' | 'heal') {
  await fetch(process.env.ANNOTATION_URL ?? 'http://localhost:9090/annotations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      experimentId,
      phase,
      at: new Date().toISOString(),
    }),
  }).catch(() => {
    // never fail the experiment solely because annotation sink is down
  });
}
\`\`\`

## Split Brain and Multi-Primary Risks

Network partitions are dangerous when two sides can accept writes. If you run clustered data stores, partition experiments must include data integrity checks after heal:

- Compare document versions or raft terms if exposed.
- Ensure only one side accepted writes for strongly consistent keys.
- Verify conflict resolution policies for AP systems.

Do not claim "we survived the partition" because both nodes stayed up. Staying up with divergent data is often worse.

## Team Workflow: From Hypothesis to Runbook

1. Write hypothesis and abort conditions.
2. Implement detection and degraded UX if missing.
3. Automate the experiment in lab.
4. Run and capture timelines (metrics + logs + traces).
5. File gaps as product or platform tickets.
6. Update runbooks with symptoms and heal steps.
7. Re-run until hypothesis holds.
8. Schedule regression cadence.

AI coding agents help scaffold fault hooks and tests, but humans own blast radius decisions. A short skill that encodes "always heal in finally" and "never enable FAULT_* in production" prevents careless generations. Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want that policy packaged for multiple repos.

## Mapping Experiments to SLOs

Chaos without SLOs becomes theater. Link each experiment to a service level objective:

| SLO | Partition experiment | Pass rule |
| --- | --- | --- |
| Checkout availability 99.9% | payments cut 30s | User-facing success path fails fast; other browse paths intact |
| p95 checkout < 400ms | latency +2s on payments | Fast fail path < 3s total |
| Zero double charges | cut during charge, heal, retry | Single payment_ref |

If the experiment cannot map to an SLO or a safety property, question why you are running it.

## Game Day Facilitation Notes

For human game days:

- Appoint a safety officer who only watches abort conditions.
- Appoint a scribe for timeline notes.
- Keep customer support in the loop if the environment is shared.
- Start with a tabletop walkthrough of expected signals.
- Inject once; avoid stacking three partitions at once on day one.
- End with a 30-minute retro and ticket filing, not heroics.

## Anti-Patterns Specific to Partition Chaos

1. **Killing the process and calling it a partition.** Different failure class.
2. **No auto-heal.** The next CI job inherits a broken network.
3. **Asserting only that an error occurred.** Misses hang and corruption.
4. **Running only in production.** Learning is expensive there.
5. **Ignoring client-side double submit.** UI may retry as well as server.
6. **Skipping idempotency keys.** Heal + retry becomes a finance incident.
7. **Unlimited experiment duration.** Partitions should be time-boxed.
8. **No unique experiment id in logs.** You cannot correlate later.

## Documenting Evidence Packs After Each Run

An experiment without an evidence pack teaches only the people who watched the graphs live. Store a lightweight bundle next to the test id:

- Experiment id, start and end timestamps, and the person or pipeline that triggered it
- Hypothesis and pass/fail against each assertion
- Links or exported screenshots of latency, error rate, and saturation panels
- A sample of structured logs with correlation ids from the cut window
- Whether auto-heal ran cleanly or required manual intervention
- Follow-up tickets with owners and due dates

A markdown template keeps the pack consistent:

\`\`\`markdown
# Experiment CHK-PAY-FULL - 2026-08-07

Hypothesis: checkout returns 503 within 3s; no paid orders without payment_ref
Result: PASS (degraded 482ms p95; recovery 1.2s after heal)
Abort fired: no
Tickets: PLAT-441 circuit breaker defaults too high on payments client
\`\`\`

Review evidence packs in the same forum where you review production incidents. That social loop is how chaos testing network partition simulation becomes culture instead of a lonely script in CI.

## Coordinating With Load and Functional Suites

Partition chaos is not a substitute for load testing. A system can survive a quiet partition and still collapse when the same cut happens under peak traffic. Sequence complementary runs:

1. Functional suite proves the degraded error contract in isolation.
2. Partition experiment under baseline traffic proves detection and recovery.
3. Optional combined run: steady synthetic load, then inject the cut, then heal while load continues.

If you already use k6, JMeter, Gatling, or Locust for traffic generation, keep generation scripts separate from the cut controller so either can fail independently. Assert both sides: generators should see elevated errors without hanging workers, and the system under test should shed load according to policy. Avoid inventing vendor-specific flags here; wire whatever CLI or API your pinned load tool documents.

## Bringing It Back to Everyday QA

You do not need a dedicated chaos team to start. One partition experiment on the most expensive dependency path, automated weekly, already outperforms annual outages as a teacher. Expand the catalog as the architecture grows. Keep functional suites for correctness, load tools for capacity, and partition chaos for dependency truth.

When you wire UI validation for degraded modes, reuse solid locator strategy from [Playwright locator best practices for 2026](/blog/playwright-best-practices-locators-2026). When you place chaos tests among unit and e2e jobs, use a coherent framework map from the [complete JavaScript testing frameworks guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026).

## Frequently Asked Questions

### Is network partition simulation the same as shutting down a dependency container?

No. Shutting down a container usually produces immediate connection failures or refused connections. A partition can leave processes healthy while paths between them fail, time out, or drop packets. Clients, load balancers, and health checks behave differently under each case. You need both classes of experiments, but you should label them separately and write different hypotheses for each so the suite does not give false confidence about timeout handling and retry policy.

### How long should an injected partition last in automated tests?

Long enough to exceed your dependency timeout and short enough to keep the job fast. Many suites use 5 to 30 seconds for CI fault-hook tests, and slightly longer for full compose network cuts. The upper bound should be enforced by an auto-heal timer even if the test process crashes. If detection itself takes minutes, fix observability and timeouts before extending the partition window.

### Can we run partition chaos inside every pull request?

Usually not for privileged network cuts. Prefer in-process fault hooks or stubbed clients on pull requests so developers get fast signal without docker network surgery. Reserve real network partitions for nightly lab jobs and scheduled game days. This split keeps feedback quick while still validating realistic transport behavior on a cadence the team can afford.

### What should we assert first if our system has no circuit breakers yet?

Assert bounded response time and a clear error contract under partition, plus data integrity after heal (no paid orders without payment confirmation). Those assertions expose user pain and financial risk immediately. Circuit breakers, bulkheads, and sophisticated retry policies become follow-up work justified by the experiment results rather than prerequisites for starting chaos testing network partition simulation.
`,
};
