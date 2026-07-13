import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Clean Up Pact Provider-State Test Data',
  description:
    'Clean up Pact provider-state test data with deterministic identities, setup and teardown handlers, transaction-aware isolation, and leak detection.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Clean Up Pact Provider-State Test Data

“A product with SKU PACT-RED-1 exists” is invoked again, but yesterday's verification already left that row behind. The setup insert now violates a unique constraint, or worse, it silently reuses stale data whose price no longer matches the interaction. Provider states are executable preconditions, and their data lifecycle needs the same discipline as any integration fixture.

Pact verification can call a state handler before the provider request and, in supported implementations, a teardown after it. Cleanup is not merely database housekeeping. It prevents one interaction from satisfying another, keeps repeated and parallel verification deterministic, and exposes whether the state description truly creates everything the provider needs.

## Provider states describe facts, not setup scripts

A consumer interaction might declare \`a product with SKU PACT-RED-1 exists\`. During provider verification, the verifier asks the provider test harness to establish that fact, sends the interaction request to the running provider, and compares the actual response with the pact.

Keep the state name at domain level. Names such as \`truncate products then insert row 42\` expose storage mechanics and become brittle when the provider changes persistence. The handler owns mechanics and returns any state values supported by the Pact implementation.

| State phrase | Data it should own | Data it should not assume |
| --- | --- | --- |
| A product with the requested SKU exists | Exact product and required category | A row left by another interaction |
| Customer 7 has no saved cards | Customer plus verified empty card relation | Global card table is empty |
| Order 91 is ready to ship | Order, lines, inventory reservation | Background seed job already ran |
| The access token is expired | Token record and controlled expiry | Current wall clock happens to be later |
| Search has no matching products | Run-specific catalog boundary | Shared environment contains no unrelated products |

The [Pact contract testing guide](/blog/pact-contract-testing-guide-2026) covers interaction design and verification broadly. Here the emphasis is isolating the provider-side facts behind those interactions.

## Use setup and teardown handlers in Pact JS

Pact JS provider verification accepts \`stateHandlers\` in \`Verifier\` options. A handler may be a function for setup-only behavior, or an object with \`setup\` and \`teardown\` functions. Teardown runs after the provider request for that state, giving the handler a symmetrical lifecycle.

This example uses a repository with real application methods. The state takes parameters from the consumer pact, creates a uniquely identifiable product, and records the created ID for teardown.

\`\`\`typescript
import { Verifier } from '@pact-foundation/pact';
import { randomUUID } from 'node:crypto';
import { productRepository } from '../src/products/product-repository';

let createdProductId: string | undefined;

const verifier = new Verifier({
  provider: 'Catalog API',
  providerBaseUrl: 'http://127.0.0.1:3000',
  pactUrls: ['./pacts/storefront-catalog-api.json'],
  stateHandlers: {
    'a product with the requested SKU exists': {
      setup: async parameters => {
        const sku = String(parameters.sku);
        const product = await productRepository.create({
          sku,
          name: 'Red verification mug',
          priceInCents: 1800,
          verificationRunId: randomUUID(),
        });
        createdProductId = product.id;
        return { productId: product.id, sku: product.sku };
      },
      teardown: async () => {
        if (createdProductId) {
          await productRepository.deleteById(createdProductId);
          createdProductId = undefined;
        }
      },
    },
  },
});

await verifier.verifyProvider();
\`\`\`

The API surface shown is the Pact JS \`Verifier\` and its \`stateHandlers\` option. Repository methods are application code, not Pact APIs. In a real suite, place lifecycle state in a handler factory rather than a module global if verification can execute interactions concurrently.

Returning state values is useful when the pact uses generators or expressions supported by the Pact specification and implementation. It does not replace cleanup ownership. The handler should still retain the exact internal identity needed to remove what it created.

## Avoid shared mutable IDs in parallel verification

The previous minimal example illustrates the lifecycle but its single \`createdProductId\` variable assumes one active instance of that state. Parallel verification or nested invocations could overwrite it. Prefer deterministic cleanup derived from state parameters or a run-scoped namespace.

One design generates a verification run ID before invoking the verifier, tags every inserted row, and deletes only rows with that tag. If states share a fixed consumer-visible SKU, combine the run ID with a separate internal ownership field rather than changing the pact-visible value.

\`\`\`typescript
import { Verifier } from '@pact-foundation/pact';
import { randomUUID } from 'node:crypto';
import { db } from '../src/db';

const verificationRunId = randomUUID();

await new Verifier({
  provider: 'Orders API',
  providerBaseUrl: 'http://127.0.0.1:3001',
  pactUrls: ['./pacts/checkout-orders-api.json'],
  stateHandlers: {
    'order 91 is ready to ship': {
      setup: async () => {
        await db.transaction(async transaction => {
          await transaction.insertOrder({
            id: 91,
            status: 'READY_TO_SHIP',
            verificationRunId,
          });
          await transaction.insertOrderLine({
            orderId: 91,
            sku: 'PACT-BOX-4',
            quantity: 2,
            verificationRunId,
          });
        });
        return { orderId: 91 };
      },
      teardown: async () => {
        await db.transaction(async transaction => {
          await transaction.deleteOrderLinesByRun(verificationRunId);
          await transaction.deleteOrdersByRun(verificationRunId);
        });
      },
    },
  },
}).verifyProvider();
\`\`\`

Deletion order follows foreign keys: child lines before their order. If the database supports cascading deletion and production schema relies on it, deleting the parent may be the more faithful operation. The test should use the provider's supported data access layer where possible, not a parallel cleanup path that violates real constraints.

## Make setup repeatable even after an abandoned run

Teardown cannot run after a hard process kill, machine loss, or forced CI cancellation. A handler that requires a pristine fixed ID will eventually encounter residue. Setup needs a defined reconciliation policy.

For a test-only database, deleting the exact known fixture identity before insertion can be reasonable. In a shared environment, it is dangerous unless ownership is proven. Never issue “delete all products with this SKU” when another verification or manual tester may own it.

| Setup collision policy | Appropriate context | Risk |
| --- | --- | --- |
| Fail on existing row | Dedicated ephemeral database | Reveals leaks immediately but blocks recovery |
| Delete row tagged to an expired run | Shared test database with ownership metadata | Requires trustworthy run age and tag |
| Upsert exact desired values | Read-only lookup interaction | Can hide that previous teardown failed |
| Generate unique domain identifier | Pact supports state-supplied value | Consumer contract must not require fixed identity |
| Recreate schema per verification | Containerized database | Higher startup cost, strongest isolation |

An excellent pattern is ephemeral infrastructure per provider verification job. Run migrations, verify pacts, and discard the database or container. State teardown still matters because interactions within the same run can contaminate one another, but environment disposal handles catastrophic interruption.

## Transaction rollback is powerful but often incompatible

Wrapping each state and provider request in one database transaction would make rollback attractive. The obstacle is connection ownership: the verifier calls the provider over HTTP, and the provider usually opens a different database connection. It cannot see another connection's uncommitted setup, and its writes do not participate in the test harness transaction.

Transaction rollback works when the provider and verification harness share an injectable connection or when verification is performed in-process with a framework test server that propagates the transaction context. Confirm this architecture rather than assuming it.

For a normal out-of-process provider, commit setup data, send the request, then delete through committed teardown. If the interaction triggers asynchronous workers, wait for their relevant effects or stop them before deletion. Otherwise a worker may recreate a projection after the handler has “cleaned” the source row.

## Clean external effects as part of the state boundary

Provider requests may enqueue messages, write blobs, send email through a fake, or update a search index. Database deletion alone can leave those effects available to later interactions.

Map each provider state to every system it mutates:

| Effect | Setup strategy | Teardown or isolation strategy |
| --- | --- | --- |
| SQL rows | Insert tagged aggregate graph | Delete by exact IDs in constraint order |
| Message queue | Use run-specific queue or correlation ID | Purge only dedicated queue or consume tagged messages |
| Object storage | Prefix keys with run ID | Delete that prefix after interaction |
| Search index | Dedicated index alias per run | Drop the index after verification |
| Email | Fake transport with per-test mailbox | Clear the named mailbox and assert send count |
| Cache | Namespaced keys | Delete exact namespace, not global flush in shared systems |

If contract verification should not exercise a real side effect, replace it at the provider's boundary with a test double and assert the provider response only. Pact verifies the HTTP contract, not every downstream integration. Keep a separate integration test for message publication or storage behavior.

This boundary decision is discussed further in [microservice API contract testing](/blog/api-contract-testing-microservices). A provider-state handler should prepare the provider, not quietly become an end-to-end environment orchestrator.

## Teardown must survive a failed interaction

The value of a teardown handler appears when the provider returns the wrong status or body. Cleanup should run after the verifier sends the request, regardless of whether matching succeeds. Still, protect the teardown implementation itself against partial absence.

Delete operations should be idempotent for test-owned resources. A 404 after the interaction deleted its own entity may mean the desired state is already achieved. Authentication errors, wrong database selection, and unexpected referential failures must remain visible.

When several independent cleanup calls are required, attempt all of them and aggregate failures. One failed cache deletion should not prevent removal of the database rows if the two operations are safe independently. Log correlation fields without dumping pact bodies or credentials.

Do not rely only on a global \`afterAll\` cleanup. It runs too late to prevent interaction-to-interaction leakage, and it lacks a precise association between a state and its effects. Global cleanup is useful as a final audit and abandoned-run recovery, not as primary ownership.

## Parameterized states need parameter-aware cleanup

Provider state parameters let a consumer request variants such as SKU, role, or balance. Validate parameters before mutating storage. A malformed value should fail setup with an actionable message rather than create a surprising default record.

Store the normalized parameters used for creation, or preferably the server-generated IDs returned by repositories. Cleanup queries reconstructed from raw consumer parameters can miss canonicalization. For example, setup may lowercase an email while teardown searches the original mixed-case value.

Avoid consumers controlling arbitrary table names, SQL fragments, filesystem paths, or cleanup prefixes through state parameters. Treat pact content as input to the verification harness. Validate against the domain schema and use parameterized repository operations.

## Audit the database after verification

A run-level audit catches states whose teardown was omitted or incomplete. Tag records with a verification run identifier and query for residue after \`verifyProvider()\` returns, including the failure path.

\`\`\`typescript
let verificationError: unknown;

try {
  await verifier.verifyProvider();
} catch (error) {
  verificationError = error;
} finally {
  const leftovers = await productRepository.findByVerificationRun(verificationRunId);
  if (leftovers.length > 0) {
    await productRepository.deleteByVerificationRun(verificationRunId);
    throw new Error(
      \`Pact verification leaked \${leftovers.length} product records\`,
      { cause: verificationError },
    );
  }
}

if (verificationError) throw verificationError;
\`\`\`

This fallback cleanup prevents persistent pollution while still failing the build to expose the lifecycle bug. Be careful not to replace the original verification mismatch with an unconnected audit error. Preserve it as a cause or report both through the test framework.

Audits should cover the resources the harness owns and no others. A global assertion that the products table is empty is invalid in a shared environment and prevents realistic baseline seed data.

## State-handler alternatives across Pact implementations

Pact language implementations expose provider-state setup differently. Some call an HTTP state-change endpoint, some use test-framework annotations, and some provide callbacks in verifier configuration. Teardown support may require an option or a handler action value. Use the official documentation for the implementation and version in the provider repository.

The lifecycle principles remain consistent: setup one named fact, capture ownership, verify the interaction, tear down that fact, and audit residue. Do not paste Pact JS option names into a JVM or Python verifier and assume equivalent syntax.

| Harness style | Strength | Operational concern |
| --- | --- | --- |
| In-process callbacks | Direct repository access and typed setup | Can diverge from deployed wiring |
| HTTP state-change endpoint | Language-neutral, works with remote provider | Must be secured and disabled in production |
| Framework annotations | Integrates with dependency injection | Lifecycle can be hidden across test hooks |
| Ephemeral seeded database per run | Strong environment isolation | Still needs per-interaction reset |

An HTTP state endpoint should accept only known state names and validated parameters. Never expose generic SQL or arbitrary command execution. Bind it to loopback or an isolated verification network and ensure production deployment excludes it.

## Review provider states as test production code

State code deserves code review for uniqueness, foreign-key direction, external effects, and failure paths. A state that silently catches insert errors can let an old record satisfy a new contract. A teardown that catches every error makes the next interaction unreliable.

Keep state builders close to provider domain test utilities and reuse them in provider integration tests where that improves consistency. Do not share mutable fixtures between consumer pact generation and provider verification, since those run in different ownership contexts and often different repositories.

Measure maintainability by diagnosis time. When verification fails, output should identify consumer, interaction, provider state, run ID, and cleanup result. It should not require searching a shared database for rows named “test.”

## Keep state setup compatible with provider evolution

Provider-state builders often bypass the public API so they can create otherwise impossible boundary states. That is legitimate, but it couples them to domain persistence. Route setup through domain-focused test builders or repositories rather than raw SQL scattered through handler maps. When the schema adds a required column, one builder changes and every state remains valid.

Do not reuse production seed scripts indiscriminately. A seed may create broad baseline data, invoke asynchronous jobs, or use fixed identifiers that collide across interactions. Build the smallest aggregate that makes the named state true. If the provider now requires a category or permission record, add it explicitly and give teardown ownership of that dependency.

Run provider-state handlers in a test that does not invoke Pact: call setup, inspect the fact through the provider's read path, call teardown, and prove absence. Then inject a failure after each created child to verify partial rollback. This fast suite complements verification mismatches and makes lifecycle defects easier to localize.

When an interaction changes its state parameters, review whether old pacts can still be verified during the broker's compatibility window. A handler that assumes a new parameter exists may break verification for an older consumer. Supply a safe documented default only when the old state meaning remains unambiguous; otherwise version the state phrase or handler behavior. Compatibility applies to executable test setup as well as HTTP fields.

## Frequently Asked Questions

### Does Pact JS support a teardown function for provider states?

Yes. A \`stateHandlers\` entry can be an object with \`setup\` and \`teardown\` functions in current Pact JS provider verification. Confirm the installed implementation version because other languages expose state changes differently.

### Should a provider-state setup use upsert to avoid duplicate rows?

Only when reuse is part of the intended state semantics. Upsert can conceal a leaked or stale record. Dedicated databases can fail fast; shared environments need run ownership, exact cleanup, or unique generated identities.

### Can I roll back one transaction after each Pact interaction?

Only if the HTTP provider participates in that transaction or can see its connection. An out-of-process provider normally uses a separate committed connection, so setup must commit and teardown must delete afterward.

### How should parallel provider verification isolate fixed IDs?

Prefer separate databases or schemas. If the consumer contract requires a fixed visible ID, add an internal run ownership field and ensure each parallel job has an isolated namespace. A single module-level created ID is unsafe under concurrency.

### What if CI is killed before provider-state teardown runs?

Use ephemeral infrastructure where possible, tag resources with a run ID and creation time, and run a narrowly scoped stale-run janitor. Per-interaction teardown remains necessary to stop leakage inside a normal verification run.
`,
};
