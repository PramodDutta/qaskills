import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Strategy Microservice Test Boundaries: An Ownership-First Guide',
  description: 'Use test strategy microservice test boundaries to assign contract ownership, limit brittle end-to-end tests, and catch integration failures before release.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Test Strategy Microservice Test Boundaries: An Ownership-First Guide

A test strategy for microservice test boundaries assigns each failure risk to the smallest test that has enough real infrastructure to detect it. Business rules belong inside the service, serialization and dependency assumptions belong at contracts, database semantics belong in component tests, and a short set of deployed journeys verifies wiring. The boundary is chosen by evidence needed, not by whether a test is called unit, integration, or end to end.

The practical payoff is independent release confidence. A service team should be able to change implementation details without coordinating every consumer, while consumers should learn about incompatible provider changes before deployment. That requires explicit ownership of synchronous APIs, asynchronous messages, persistence, retries, and cross-service workflows. It does not require reproducing the entire production estate in every pull request.

## Draw Boundaries Around Failure Ownership

Microservices distribute code and operational responsibility. Tests should follow that ownership. If the catalog team owns whether an item is sellable, catalog tests should exhaustively cover that decision. If checkout owns how it reacts when catalog is unavailable, checkout tests should simulate that failure at its catalog client boundary. A large shared staging scenario that notices only that checkout failed assigns neither team a precise signal.

For each interaction, write four facts:

1. Who produces the behavior or data?
2. Who consumes it?
3. Which compatibility promise crosses the boundary?
4. Which team receives and acts on a failure?

The resulting ledger prevents duplicate tests and missing ownership.

| Risk | Primary boundary | Owner | Evidence |
|---|---|---|---|
| Discount eligibility is calculated incorrectly | Service domain test | Pricing team | Inputs map to the approved decision |
| Provider removes a required JSON field | Consumer contract plus provider verification | Consumer defines, provider runs | Provider still satisfies used fields |
| Database unique constraint is absent | Service component test | Provider team | Concurrent writes cannot duplicate key |
| Message is redelivered | Consumer component test | Consumer team | Duplicate delivery has one durable effect |
| Gateway routes to the wrong service | Deployed smoke test | Platform or owning service | Public route reaches the intended health and API path |
| Multi-service compensation fails | Workflow test at orchestrator boundary | Workflow owner | Failed step triggers defined compensation |

Do not assign a risk to the broadest environment by default. Broad environments produce the least controlled evidence, have the largest blast radius, and are hardest to reproduce. Use them only for risks that genuinely depend on deployed topology, network policy, identity configuration, or multiple released services.

## Establish the Service Contract Inventory

An HTTP route list is not a complete contract inventory. Include events consumed and emitted, scheduled commands, database ownership, object storage formats, identity claims, error categories, retry expectations, rate limits that consumers act upon, and operational health signals. Mark whether each contract is public, internal but cross-team, or private to the service.

| Contract class | Example | Stable promise | Usually not promised |
|---|---|---|---|
| Request-response | \`POST /reservations\` | Status, required fields, error codes | JSON property order |
| Published event | \`inventory.reserved\` | Event type, version, identifiers, semantic meaning | Broker partition chosen by platform unless documented |
| Consumed event | \`order.cancelled\` | Accepted versions and idempotency key | Producer implementation language |
| Data export | Daily settlement object | Naming convention, schema, completion signal | Temporary upload path |
| Identity | JWT claims | Issuer, audience, required subject and scopes | Token byte length |
| Operations | Readiness response | Ready only when service can receive traffic | Exact diagnostic prose |

Repository discovery can locate obvious edges. This command set is a starting point for a TypeScript service and runs without modifying the checkout.

\`\`\`bash
rg -n "fetch\\(|Request\\(|Response\\(|listen\\(" src test
rg -n "publish|subscribe|producer|consumer|topic|queue" src test
rg -n "DATABASE_URL|REDIS|BROKER|S3|BUCKET|JWT" . --glob '!node_modules/**'
rg -n "openapi|asyncapi|schema|contract" . --glob '!node_modules/**'
\`\`\`

Search cannot discover configuration injected only by deployment tooling or consumers maintained elsewhere. Compare the repository evidence with the service catalog, gateway configuration, broker administration, and tracing data. When an AI coding agent creates the inventory, require each row to cite a file, configuration location, or observed trace. An uncited dependency should be labeled as a hypothesis.

## Keep Domain Decisions Inside a Fast Service Boundary

Most rule combinations should be tested without a network or database. This is not an ideological demand for pure functions. It is a way to make the business state machine cheap to exercise. Parse external input at an adapter, translate it to a domain command, and make the domain result explicit.

The following self-contained Vitest example captures reservation policy without coupling to HTTP:

\`\`\`ts
import { describe, expect, it } from 'vitest';

type Stock = { available: number; discontinued: boolean };
type Decision =
  | { accepted: true; remaining: number }
  | { accepted: false; reason: 'invalid_quantity' | 'discontinued' | 'insufficient' };

function reserve(stock: Stock, quantity: number): Decision {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { accepted: false, reason: 'invalid_quantity' };
  }
  if (stock.discontinued) return { accepted: false, reason: 'discontinued' };
  if (quantity > stock.available) return { accepted: false, reason: 'insufficient' };
  return { accepted: true, remaining: stock.available - quantity };
}

describe('reservation policy', () => {
  it.each([
    { stock: { available: 3, discontinued: false }, quantity: 0, reason: 'invalid_quantity' },
    { stock: { available: 3, discontinued: true }, quantity: 1, reason: 'discontinued' },
    { stock: { available: 3, discontinued: false }, quantity: 4, reason: 'insufficient' },
  ] as const)('rejects with $reason', ({ stock, quantity, reason }) => {
    expect(reserve(stock, quantity)).toEqual({ accepted: false, reason });
  });

  it('accepts the exact available quantity', () => {
    expect(reserve({ available: 3, discontinued: false }, 3))
      .toEqual({ accepted: true, remaining: 0 });
  });
});
\`\`\`

The test owns pricing policy only if pricing is actually this service's responsibility. If another service owns the rule, do not copy the algorithm into the consumer's tests. Stub the dependency's documented outcomes and test how the consumer handles them. Duplicated business logic in tests creates false agreement until both copies diverge from the real provider.

## Make HTTP Adapter Tests About Translation

An HTTP adapter test should prove that protocol input becomes the correct domain command and that domain results become the documented response. It need not repeat every domain partition. Focus on parsing, validation, authentication context, status codes, headers, field omission, and error mapping.

This example uses the standard \`Request\` and \`Response\` APIs. The injected use case makes the boundary visible and keeps the test runnable without opening a port.

\`\`\`ts
import { expect, test } from 'vitest';

type ReserveResult = { ok: true; reservationId: string } | { ok: false; reason: string };
type ReserveUseCase = (sku: string, quantity: number) => Promise<ReserveResult>;

async function handleReserve(request: Request, execute: ReserveUseCase): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const body = await request.json() as { sku?: unknown; quantity?: unknown };
  if (typeof body.sku !== 'string' || !Number.isInteger(body.quantity)) {
    return Response.json({ code: 'invalid_request' }, { status: 400 });
  }
  const result = await execute(body.sku, body.quantity as number);
  if (!result.ok) return Response.json({ code: result.reason }, { status: 409 });
  return Response.json({ reservationId: result.reservationId }, { status: 201 });
}

test('translates a valid request and successful result', async () => {
  const calls: Array<{ sku: string; quantity: number }> = [];
  const execute: ReserveUseCase = async (sku, quantity) => {
    calls.push({ sku, quantity });
    return { ok: true, reservationId: 'res-7' };
  };
  const request = new Request('https://inventory.test/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: 'chair-blue', quantity: 2 }),
  });

  const response = await handleReserve(request, execute);

  expect(calls).toEqual([{ sku: 'chair-blue', quantity: 2 }]);
  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toEqual({ reservationId: 'res-7' });
});
\`\`\`

Test malformed JSON separately if the framework or adapter is responsible for mapping parse failures. Test transport concerns through the actual framework when middleware ordering, route configuration, or serialization could fail. The pure handler gives fast translation coverage, while a smaller framework-level set proves the wiring.

## Put Consumer Expectations in Executable Contracts

A consumer contract should describe the subset of provider behavior a real consumer uses. It is not a provider's complete schema dumped into every downstream repository. The consumer publishes an expectation, and the provider verifies that expectation against provider behavior before release.

Suppose checkout uses only \`sku\`, \`available\`, and a stable not-found code. Its contract should tolerate a new optional \`warehouse\` field and should not require unrelated provider fields. This local validator illustrates compatibility intent without claiming a specific contract-testing library API:

\`\`\`ts
import { expect, test } from 'vitest';

type CatalogView = { sku: string; available: boolean };

function readCatalogView(value: unknown): CatalogView {
  if (typeof value !== 'object' || value === null) throw new Error('body must be an object');
  const body = value as Record<string, unknown>;
  if (typeof body.sku !== 'string') throw new Error('sku must be a string');
  if (typeof body.available !== 'boolean') throw new Error('available must be a boolean');
  return { sku: body.sku, available: body.available };
}

test('consumer accepts required fields plus provider additions', () => {
  const providerResponse = {
    sku: 'chair-blue',
    available: true,
    warehouse: 'west',
  };

  expect(readCatalogView(providerResponse)).toEqual({
    sku: 'chair-blue',
    available: true,
  });
});

test('consumer rejects removal of a required field', () => {
  expect(() => readCatalogView({ sku: 'chair-blue' }))
    .toThrow('available must be a boolean');
});
\`\`\`

In a full contract workflow, provider verification must set up known provider states, execute the real adapter, and publish a result that release automation can evaluate. The contract broker or registry should retain consumer identity and version information. Do not let an old, abandoned consumer block releases forever. Establish a documented rule for which deployed or supported consumer versions count.

What people get wrong is treating schema compatibility as semantic compatibility. A provider can keep every field and still break a consumer by changing units from cents to whole currency, interpreting an empty list differently, or returning success before work is durable. Contract examples and descriptions must carry meaning, not just types.

## Test Message Consumers for Redelivery and Ordering

Asynchronous boundaries introduce delivery behavior that HTTP examples often omit. Unless the infrastructure and application contract explicitly provide stronger semantics, design consumers to tolerate redelivery. Test duplicate identifiers, out-of-order related events, poison messages, handler crashes after a durable write, and retry exhaustion.

An idempotent consumer usually needs a durable record of processed message identity in the same transaction as its business effect. This in-memory example demonstrates the logic but does not substitute for a database transaction test.

\`\`\`ts
import { expect, test } from 'vitest';

type OrderState = { cancelled: boolean; processed: Set<string> };
type Cancellation = { messageId: string; orderId: string };

function applyCancellation(state: OrderState, event: Cancellation): OrderState {
  if (state.processed.has(event.messageId)) return state;
  return {
    cancelled: true,
    processed: new Set([...state.processed, event.messageId]),
  };
}

test('redelivery does not create a second logical effect', () => {
  const initial: OrderState = { cancelled: false, processed: new Set() };
  const event = { messageId: 'msg-44', orderId: 'order-9' };

  const once = applyCancellation(initial, event);
  const twice = applyCancellation(once, event);

  expect(twice.cancelled).toBe(true);
  expect([...twice.processed]).toEqual(['msg-44']);
});
\`\`\`

At the component boundary, use the real serializer and the same broker protocol or a faithful local broker when broker-specific behavior matters. Verify acknowledgement timing. If the handler records a database change and crashes before acknowledgement, redelivery should not duplicate the effect. If acknowledgement occurs before the durable write, a crash can lose the message. That sequence deserves a targeted fault-injection test.

Version events deliberately. Additive fields are usually easier for tolerant consumers, but only if consumers truly ignore unknown fields. A versioned envelope does not solve semantic drift by itself. Document event meaning, producer timing, identity, and ordering key alongside the schema.

## Prove Persistence With the Production Database Engine

Repository mocks cannot demonstrate unique constraints, transaction boundaries, collation, lock behavior, generated defaults, or migration compatibility. A service component suite should start the production database engine in a disposable environment, apply migrations from zero, seed minimal state, call the real repository or service adapter, and verify durable outcomes.

Prioritize database tests for risks such as two concurrent reservations spending the same stock, an idempotency record and business update committing separately, or a migration failing on existing null values. The following model makes the concurrency expectation explicit and runnable, while the real suite must enforce it with a transaction and database constraint.

\`\`\`ts
import { expect, test } from 'vitest';

class Inventory {
  private available: number;

  constructor(available: number) {
    this.available = available;
  }

  reserve(quantity: number): boolean {
    if (quantity > this.available) return false;
    this.available -= quantity;
    return true;
  }

  remaining(): number {
    return this.available;
  }
}

test('stock cannot become negative', () => {
  const inventory = new Inventory(1);
  const results = [inventory.reserve(1), inventory.reserve(1)];

  expect(results.filter(Boolean)).toHaveLength(1);
  expect(inventory.remaining()).toBe(0);
});
\`\`\`

Do not infer that this synchronous model proves the database is safe. It defines the acceptance condition. The component test should launch concurrent database transactions and assert that only one succeeds or that conflict handling preserves nonnegative stock. That distinction between executable policy and infrastructure proof is central to useful test boundaries.

## Test Workflow Coordination Without Owning Every Service

A checkout, fulfillment, or onboarding workflow may span several services. The workflow owner should test orchestration decisions using controllable ports for collaborators: success, business rejection, timeout, ambiguous completion, and compensation. It should not import every provider's internal code into one test process.

This self-contained example tests a compensation decision at the orchestrator boundary:

\`\`\`ts
import { expect, test } from 'vitest';

type Payment = { charge(): Promise<string>; refund(id: string): Promise<void> };
type Stock = { reserve(): Promise<void> };

async function placeOrder(payment: Payment, stock: Stock): Promise<'confirmed' | 'compensated'> {
  const chargeId = await payment.charge();
  try {
    await stock.reserve();
    return 'confirmed';
  } catch {
    await payment.refund(chargeId);
    return 'compensated';
  }
}

test('refunds a completed charge when stock reservation fails', async () => {
  const refunded: string[] = [];
  const payment: Payment = {
    charge: async () => 'charge-3',
    refund: async (id) => { refunded.push(id); },
  };
  const stock: Stock = {
    reserve: async () => { throw new Error('out of stock'); },
  };

  await expect(placeOrder(payment, stock)).resolves.toBe('compensated');
  expect(refunded).toEqual(['charge-3']);
});
\`\`\`

A few deployed workflow tests should then prove route discovery, credentials, real serialization, and environment configuration. Keep their data isolated with unique identifiers, poll observable completion rather than sleeping a fixed interval, and attach correlation identifiers to failure artifacts. Those tests validate assembly, while service and contract suites carry combinatorial coverage.

## Select Deployed Checks by Topology Risk

End-to-end tests earn their cost when only a deployed environment can reveal the defect. Examples include gateway policy, service identity, network segmentation, certificate configuration, topic permissions, or a real browser's interaction with multiple origins. A duplicate domain rule does not earn an end-to-end test merely because it is important.

| Deployed check | Keep it small by asserting | Avoid expanding it into |
|---|---|---|
| Public checkout smoke | One purchasable item reaches confirmation | Every coupon and tax partition |
| Identity propagation | Expected subject and scope reach provider | All authorization policy combinations |
| Event wiring | One unique event reaches its consumer | Redelivery and poison-message matrix |
| Gateway routing | Stable public path reaches correct service | Provider's complete error catalog |
| Database migration rehearsal | Upgrade works on representative prior state | All domain behavior after upgrade |

Browser automation should locate elements through user-facing semantics so deployed checks survive harmless markup changes. The [Playwright locator practices guide](/blog/playwright-best-practices-locators-2026) provides concrete locator choices. For deciding which JavaScript runner fits domain, component, or browser responsibilities, consult the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026).

Environment health must be separate from product assertions. Before running a workflow, verify required services are reachable and the test tenant is prepared. If a dependency is unhealthy, classify the run as an environment failure rather than presenting a misleading checkout regression. Capture logs and traces for the single correlation identifier used by the scenario.

## Diagnose the Green Contracts and Red Production Release

Imagine the provider verification passes, consumer tests pass, and a production release causes checkout requests to time out. Traces show the provider completes in nine seconds, while checkout abandons the request after three seconds. The JSON shape is fully compatible, so schema-focused contracts never failed.

The missing boundary promise is temporal. Checkout relies on a response deadline and retry behavior, but the contract inventory recorded only fields and status codes. Diagnose the provider latency distribution for the affected operation, the client timeout, retries at gateway and client layers, and whether repeated requests are idempotent. Add a provider performance budget test at a controlled component boundary and a consumer test for timeout handling. Do not encode a single noisy staging timing as a contract.

Another common case is a message contract that passes while events are silently ignored. The schema is valid, but the producer changed the partition key and per-order ordering disappeared. The corrective contract must include ordering semantics and key selection if consumers depend on them. The provider test verifies how the key is derived, while consumer tests cover out-of-order delivery defensively where feasible.

## Use a Boundary Review Gate for AI-Generated Tests

An AI coding agent can inspect call graphs, propose a contract inventory, scaffold adapters, and enumerate failure outcomes. The review gate should ask questions that compilation and passing tests cannot answer:

- Does the test sit in the repository of the team that owns the behavior?
- Does it use the real implementation at the boundary it claims to verify?
- Is a provider algorithm copied into a consumer expectation?
- Would an additive compatible field break the test?
- Are timeouts, retries, redelivery, and partial failure represented where relevant?
- Does the failure point identify an owner and a likely defect class?

Have the agent first produce a boundary matrix with evidence, then approve the matrix before generating a large suite. This avoids a common failure where the agent writes many isolated mocks because they are easy, while database and protocol risks remain untouched. Require focused test commands and one deliberate negative change demonstrating that each important test can fail.

## Maintain Independence as Services and Consumers Evolve

Review the boundary ledger when a service adds a consumer, changes ownership, introduces an event, or moves logic between services. Delete redundant cross-service scenarios after contracts and component tests cover the same risk more precisely. Quarantine is not a permanent home for unreliable deployed checks. Assign a defect, owner, and expiry date, or remove the check if it cannot produce actionable evidence.

A balanced release pipeline typically progresses from domain and adapter tests, to component tests with real owned infrastructure, to provider verification of active consumer contracts, and finally to a compact deployed smoke set. Exact ordering depends on build time and deployment architecture, but fast ownership-specific failures should arrive before expensive environment-wide signals.

The strategy succeeds when teams can answer three questions during an incident: which promise failed, which boundary should have detected it, and who owns the repair. If the only answer is "the end-to-end suite went red," the system has tests but lacks a microservice test strategy.

## Frequently Asked Questions

### How many end-to-end tests should a microservice system have?

There is no universal count. Keep scenarios for risks that require deployed topology, such as routing, identity propagation, broker permissions, and a few critical workflows. Move rule combinations, error mappings, redelivery, and database invariants to service-owned boundaries. Each retained end-to-end test should have a named risk, isolated data, reliable completion signal, diagnostic artifacts, and an owner. If a narrower test can detect the same failure earlier and more precisely, prefer the narrower test.

### Are OpenAPI schema checks enough for service compatibility?

No. A schema can catch removed required fields or changed types, but compatibility also includes meaning, units, status behavior, omission versus null, authorization, idempotency, timing expectations, and ordering. Use schema validation as one layer. Add consumer examples for actually used behavior, provider verification against real adapters, and focused tests for non-structural promises. A response can be schema-valid and still break a consumer by changing cents to whole currency or returning before data is durable.

### Should microservice tests use mocks or real dependencies?

Use controllable substitutes for dependencies another team owns when testing your service's decisions, and use real infrastructure for technology your service owns when its semantics create risk. A repository mock cannot prove database constraints, while a real remote pricing service makes checkout policy tests slow and unstable. The key is stating what each test proves. Contract verification connects consumer assumptions to providers without requiring every consumer test to call a shared live environment.

### Who owns a test for a cross-service business workflow?

The team owning the workflow or orchestrator should own its decision tests and the small deployed journey that proves assembly. Each participating service owns its domain rules, adapters, persistence, and provider verification. Consumers own the expectations they rely upon. If no team owns the workflow, that governance gap will appear as neglected tests and unclear incidents. Assign ownership explicitly, including responsibility for test data, environment diagnosis, contract retirement, and compensation behavior.
`,
};
