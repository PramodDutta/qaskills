import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Contract Testing Provider State Management Without Shared-Fixture Chaos',
  description: 'Learn contract testing provider state management with idempotent fixtures, scoped cleanup, parallel-safe data, and diagnostics that make provider verification reliable.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# Contract Testing Provider State Management Without Shared-Fixture Chaos

Contract testing provider state management is the controlled setup of provider data and dependencies required by each interaction before verification runs. The reliable design maps every human-readable provider state to an idempotent handler, creates only records owned by that verification case, returns useful setup metadata, and cleans up without touching unrelated data. The verifier should receive the same observable API behavior a real consumer would see.

Provider states are preconditions, not a second test script. “Customer 42 exists with an active subscription” is a useful state because it describes a business condition. “Insert these seven rows, stub this repository method, then return HTTP 200” leaks implementation and duplicates the interaction expectation. Good state management keeps contracts readable while making setup deterministic across developer machines, CI workers, and provider deployments.

## Treat state names as a domain vocabulary

A provider state is part of the contract shared by consumer and provider teams. Name it in business language and keep implementation details in the provider-side handler. The interaction still specifies the request and expected response, while the state explains what must already be true.

| Weak state name | Stronger state name | Why the stronger name helps |
|---|---|---|
| “insert user row” | “customer exists” | Survives storage changes |
| “mock billing 200” | “customer has an active subscription” | Describes business behavior |
| “set balance to 0” | “account has no available funds” | Captures meaning, not representation |
| “return no orders” | “customer has no orders” | Separates setup from assertion |
| “seed error object” | “catalog dependency is unavailable” | Makes failure mode explicit |

Parameterize only the dimensions that materially improve reuse. A state such as “an order exists” can accept an order identifier when the interaction path contains it. Avoid a universal state with dozens of optional fields, because it becomes an untyped fixture API whose valid combinations nobody understands.

Write a small state catalog beside the verification code. For every name, document parameters, records created, external dependencies controlled, cleanup scope, and whether parallel execution is supported. This catalog is a review surface when a consumer introduces a new interaction.

## Separate the state registry from framework wiring

The most maintainable architecture has three layers: a registry maps state names to functions, fixture services create domain data, and the contract verifier adapter calls the registry. This keeps provider-state logic testable without running a broker, verifier process, or real HTTP server.

\`\`\`ts
export type StateContext = {
  runId: string;
  parameters: Record<string, unknown>;
};

export type StateResult = {
  values?: Record<string, string>;
  cleanup?: () => Promise<void>;
};

export type StateHandler = (context: StateContext) => Promise<StateResult>;

export class StateRegistry {
  private readonly handlers = new Map<string, StateHandler>();

  register(name: string, handler: StateHandler): void {
    if (this.handlers.has(name)) throw new Error(\`Duplicate provider state: \${name}\`);
    this.handlers.set(name, handler);
  }

  async enter(name: string, context: StateContext): Promise<StateResult> {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(\`Unknown provider state: \${name}\`);
    return handler(context);
  }
}
\`\`\`

This is an application-owned abstraction, not a claim about one verifier's API. Connect it to the state-handler hook documented by your contract tool. That thin adapter should translate the verifier's state name and parameters into \`enter\`, register returned cleanup, and surface errors without hiding their cause.

The registry rejects duplicate names and unknown states. Silently falling back to an empty default makes verification deceptive: a request might pass because old shared data happens to satisfy it. An unknown state must fail before the interaction is sent.

## Give every verification run an ownership boundary

Parallel safety begins with ownership. Generate a run identifier in the test coordinator and tag every created record, fake response, and temporary resource with it. A handler may delete or update records owned by that run. It must not truncate shared tables or reset an entire mock server used by another worker.

| Resource | Ownership technique | Safe cleanup |
|---|---|---|
| Relational row | \`test_run_id\` column or unique key prefix | Delete by exact run id |
| Object storage | Prefix such as \`contract/<runId>/\` | Remove owned prefix |
| Message topic | Correlation header or dedicated namespace | Purge matching messages when supported |
| Stubbed dependency | Per-run server instance or scenario namespace | Stop instance or clear namespace |
| Cache entry | Run-scoped key | Delete exact keys |

When the production schema cannot carry a test-run column, use naturally unique consumer-visible identifiers. For example, an email can include the run id in its local part, and an order reference can use a validated prefix. Keep values within real format limits so the contract still exercises production validation.

\`\`\`ts
import { randomUUID } from "node:crypto";

export type CustomerSeed = {
  id: string;
  email: string;
  status: "active" | "suspended";
  owner: string;
};

export function buildCustomerSeed(runId = randomUUID()): CustomerSeed {
  const compact = runId.replaceAll("-", "").slice(0, 16);
  return {
    id: \`ctr_\${compact}\`,
    email: \`contract+\${compact}@example.test\`,
    status: "active",
    owner: runId,
  };
}
\`\`\`

The values are deterministic for a supplied run id and unique for normal generated ids. Tests can pass a known id to assert exact output. In production verification, store the full owner separately from shortened domain keys so cleanup remains precise.

## Make setup idempotent and conflict-aware

CI retries, verifier retries, and cleanup failures mean a state handler may run more than once. Idempotent setup produces the same precondition when repeated with the same run identifier and parameters. That does not mean ignoring every error. A pre-existing record owned by another run is a conflict and should fail.

One simple in-memory fixture service demonstrates the rules. A database implementation would use a transaction and a uniqueness constraint rather than relying on process memory.

\`\`\`ts
type Customer = { id: string; status: "active" | "suspended"; owner: string };

export class CustomerFixtures {
  private readonly customers = new Map<string, Customer>();

  ensureActive(id: string, owner: string): Customer {
    const existing = this.customers.get(id);
    if (existing && existing.owner !== owner) {
      throw new Error(\`Customer \${id} is owned by another verification run\`);
    }

    const customer = { id, status: "active" as const, owner };
    this.customers.set(id, customer);
    return customer;
  }

  find(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  removeOwned(id: string, owner: string): void {
    if (this.customers.get(id)?.owner === owner) this.customers.delete(id);
  }
}
\`\`\`

Idempotency is especially important for compound states. If the handler creates a customer and then fails while creating a subscription, the retry must reconcile the customer rather than colliding with it. Prefer a database transaction when all records share a transactional store. Across systems, record completed setup steps and make each compensation safe to repeat.

## Parse state parameters as an API

State parameters cross a team boundary and require the same care as endpoint input. Validate missing keys, types, formats, allowed values, and unknown keys. Do not cast a verifier-provided object directly into a domain type.

\`\`\`ts
import assert from "node:assert/strict";

type OrderStateParameters = { orderId: string; itemCount: number };

export function parseOrderStateParameters(input: unknown): OrderStateParameters {
  assert(input !== null && typeof input === "object", "state parameters must be an object");
  const value = input as Record<string, unknown>;
  const allowed = new Set(["orderId", "itemCount"]);
  for (const key of Object.keys(value)) {
    assert(allowed.has(key), \`unknown state parameter: \${key}\`);
  }

  assert(typeof value.orderId === "string" && /^ord_[a-z0-9]+$/.test(value.orderId), "invalid orderId");
  assert(Number.isInteger(value.itemCount), "itemCount must be an integer");
  assert((value.itemCount as number) >= 1 && (value.itemCount as number) <= 20, "itemCount is out of range");
  return { orderId: value.orderId, itemCount: value.itemCount as number };
}
\`\`\`

Keep the parameter set small. If a consumer needs to describe the entire database row, the state abstraction is at the wrong level. Introduce a meaningful named condition or a controlled variant, such as “order exists with three physical items,” and let provider code choose fields that are irrelevant to the response.

## Register concrete handlers with scoped cleanup

Handlers should return values that help the verifier substitute dynamic data when the tool supports that concept, plus a cleanup callback owned by the local coordinator. Even if the verification tool does not consume returned values, the coordinator can record non-sensitive identifiers for diagnostics.

\`\`\`ts
import { StateRegistry } from "./state-registry.js";
import { CustomerFixtures } from "./customer-fixtures.js";

const fixtures = new CustomerFixtures();
export const states = new StateRegistry();

states.register("customer exists and is active", async ({ runId, parameters }) => {
  const customerId = parameters.customerId;
  if (typeof customerId !== "string" || customerId === "") {
    throw new Error("customerId is required");
  }

  const customer = fixtures.ensureActive(customerId, runId);
  return {
    values: { customerId: customer.id },
    cleanup: async () => fixtures.removeOwned(customer.id, runId),
  };
});
\`\`\`

The cleanup closure captures exact ownership information. It does not issue “delete all customers where email contains contract,” which could match another worker or a manually created record. Run cleanup in a \`finally\` block and aggregate cleanup errors without replacing the original verification failure.

If the provider is verified against a deployed environment, an authenticated state-management endpoint may be necessary. Restrict it to non-production environments, require strong authorization, log every operation, and limit commands to named states. A general-purpose SQL or arbitrary fixture endpoint is too powerful.

## Verify state handlers independently

A contract run is an expensive way to discover a typo in fixture setup. Unit-test each handler's postcondition, repeat behavior, ownership conflict, invalid parameters, and cleanup. Then add a smaller number of integration tests against the real database or dependency sandbox.

\`\`\`ts
import test from "node:test";
import assert from "node:assert/strict";
import { CustomerFixtures } from "./customer-fixtures.js";

test("active customer setup is repeatable for one owner", () => {
  const fixtures = new CustomerFixtures();
  const first = fixtures.ensureActive("ctr_100", "run-a");
  const second = fixtures.ensureActive("ctr_100", "run-a");
  assert.deepEqual(second, first);
  assert.equal(fixtures.find("ctr_100")?.status, "active");
});

test("one run cannot take another run's customer", () => {
  const fixtures = new CustomerFixtures();
  fixtures.ensureActive("ctr_100", "run-a");
  assert.throws(
    () => fixtures.ensureActive("ctr_100", "run-b"),
    /owned by another verification run/
  );
});

test("cleanup removes only the owning run's customer", () => {
  const fixtures = new CustomerFixtures();
  fixtures.ensureActive("ctr_100", "run-a");
  fixtures.removeOwned("ctr_100", "run-b");
  assert.ok(fixtures.find("ctr_100"));
  fixtures.removeOwned("ctr_100", "run-a");
  assert.equal(fixtures.find("ctr_100"), undefined);
});
\`\`\`

These tests prove state semantics without an HTTP call. An integration test should additionally prove that the provider endpoint reads the seeded record through its normal repository path. If setup writes one database while the running provider reads another, unit tests pass and verification still returns 404.

## Control dependency states at the right boundary

Not every provider state is database data. “Payment gateway is unavailable” requires controlled dependency behavior. Prefer a dedicated sandbox, a process-local fake injected through the application's supported dependency boundary, or a run-scoped stub server. Avoid patching the endpoint handler to return the desired response, because that bypasses provider logic the contract is supposed to verify.

| Dependency condition | Useful control | Dangerous shortcut |
|---|---|---|
| Timeout | Stub server delays a run-scoped request | Sleep inside provider endpoint |
| 503 response | Sandbox or stub returns 503 | Force final API response to 503 |
| Empty catalog | Seed sandbox with no owned products | Mock controller result directly |
| Expired token | Issue an expired sandbox credential | Disable authentication globally |
| Message pending | Publish correlated test message | Read another run's shared queue |

State setup must finish before the verification request starts. If a fake dependency exposes configuration over HTTP, wait for its acknowledgment and, when possible, read back the active scenario. A fire-and-forget setup request creates a race that appears only under CI load.

## Compose multiple preconditions deliberately

Some interactions require several facts: a customer exists, the customer has a subscription, and the catalog contains a plan. You can expose one compound business state or support multiple states, depending on the contract tool and team vocabulary. Either way, define ordering and rollback.

A compound handler can call smaller fixture operations inside one transaction. If independent state handlers run in sequence, the coordinator should collect cleanup callbacks and execute them in reverse order. Reverse cleanup mirrors resource dependencies: remove the subscription before its customer.

\`\`\`ts
import { states } from "./provider-states.js";
import type { StateContext } from "./state-registry.js";

export async function withProviderStates<T>(
  entries: Array<{ name: string; context: StateContext }>,
  run: () => Promise<T>,
): Promise<T> {
  const cleanups: Array<() => Promise<void>> = [];
  try {
    for (const entry of entries) {
      const result = await states.enter(entry.name, entry.context);
      if (result.cleanup) cleanups.push(result.cleanup);
    }
    return await run();
  } finally {
    const errors: unknown[] = [];
    for (const cleanup of cleanups.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      console.error("Provider-state cleanup failures", errors);
    }
  }
}
\`\`\`

This helper preserves the interaction error because cleanup logging does not throw over it. In a stricter suite, aggregate cleanup failures when the interaction succeeded. Never make cleanup invisible, since leaked data eventually causes collisions and misleading passes.

## Diagnose the 404 that only happens in parallel

A common incident has three interactions using “customer exists.” Each handler deletes a fixed customer id, inserts it, and returns. Sequential verification passes. With three CI workers, worker A inserts the customer, worker B deletes it during its own reset, and worker A's request receives 404. Retrying changes timing and the failure moves between interactions.

The diagnostic evidence is an interleaved state log: identical customer id, different run ids, and broad delete operations. The provider endpoint is correct. The contract is correct. State ownership is broken.

Fix it by deriving a unique customer id per run or passing a unique interaction parameter, tagging the created record with its owner, and removing only that record. Then run a concurrency test that enters the same state for multiple run ids, calls the provider, and cleans each one independently. Do not solve the problem by globally disabling parallelism unless a real shared dependency cannot be isolated. Serial execution can be a temporary containment measure, not proof of reliable state management.

## What people get wrong about clean databases

An empty database at suite start does not guarantee isolation. Tests still overlap during the run, retries still encounter leftovers, and a broad reset can delete another process's fixtures. Cleanliness is a point-in-time property. Ownership is a continuing invariant.

Another error is seeding directly into tables with fields that production code normally derives through domain services. Direct inserts are fast, but they can omit an event, cache entry, search index, or normalized child record needed for observable behavior. Choose the lowest setup layer that creates a valid domain state. That may be a fixture repository designed for tests, a domain service, or a public setup API. Verify the resulting state through the provider's normal read path.

For request-level Node examples around the provider boundary, use the [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide). For interaction design, matching rules, broker workflows, and verification concepts, continue with the [complete Pact contract testing guide](/blog/contract-testing-pact-complete-guide).

## Build observability into state transitions

Log state entry and exit as structured events. Include verification run id, interaction identifier, state name, parameter keys, created resource identifiers, duration, and outcome. Redact values that may contain personal data or credentials. Keep the logs correlated with provider request logs through a header or request id where your stack supports it.

On failure, report whether state setup started, completed, and cleaned up. A verifier message saying “expected 200, received 404” is incomplete when the fixture write went to the wrong schema. Database name, dependency endpoint identity, and provider build revision are valuable environment metadata, provided they do not expose secrets.

Track leaked fixtures as suite defects. A scheduled janitor can remove old, unmistakably test-owned data after a retention window, but it is a backstop rather than the normal cleanup strategy. Use a timestamp and owner tag so the janitor cannot touch recent or unowned records.

## Establish a provider-state review checklist

Before accepting a consumer contract, confirm that each state name expresses a domain condition, parameters are necessary and validated, setup is repeatable, records have a run owner, dependency controls are scoped, cleanup is exact, and parallel behavior is known. Confirm that the state does not predetermine the expected response by bypassing provider logic.

Run fast handler tests on every provider change, database-backed state integration tests in CI, and full contract verification before deployment. When schema migrations change fixture requirements, update the fixture service and retain the same domain state names when their meaning has not changed. This separation is the payoff: consumers keep a stable vocabulary while provider implementation evolves.

A well-managed state should be unremarkable. Given its name and parameters, it establishes one clear world, the provider responds through production code, and cleanup restores only what the run owns. When that invariant holds, contract failures point to genuine compatibility issues instead of fixture roulette.

## Frequently Asked Questions

### Should provider states create data through the public API?

Not always. Public API setup gives high fidelity but can be slow, may require unrelated contracts, and cannot easily create exceptional conditions. Direct fixture services are appropriate when they produce a valid domain state and the verification request still travels through normal provider code. Use domain services or repositories designed for testing rather than brittle raw inserts when important side effects exist. The key is to verify the postcondition through the same read path the provider uses and keep setup outside the interaction being verified.

### How should provider states work in parallel CI jobs?

Assign every verification run a unique identifier and derive unique resource keys or namespaces from it. Tag all created records and dependency scenarios with that owner, pass consumer-visible identifiers through supported state parameters, and clean only exact owned resources. Avoid fixed ids, table truncation, global mock resets, and shared mutable scenario names. Add a concurrency test for the state handlers themselves. If one dependency truly cannot isolate tenants, serialize only the affected verification group and document that constraint rather than disabling parallelism for the entire suite.

### Are provider-state parameters part of the contract?

Yes, they are a shared setup interface even though consumers do not send them to the production endpoint. Providers should validate their names, types, formats, ranges, and combinations, and consumers should keep them minimal. A renamed or newly required parameter can break verification just like an endpoint change breaks a client. Prefer domain-oriented state names with a few identifiers over large parameter objects that mirror database rows. Review parameter changes with both teams and preserve compatible defaults when practical.

### What should happen when provider-state cleanup fails?

Record the cleanup failure with run id, state name, and owned resource identifiers, while preserving any original interaction failure. If verification succeeded, the suite should still surface cleanup failure because leaked data threatens later runs. Retry only operations designed to be idempotent, and use a narrowly scoped janitor as a safety net for old test-owned resources. Never respond by broadening deletion criteria. A cleanup problem is evidence that ownership, dependency availability, or teardown sequencing needs repair.
`,
};
