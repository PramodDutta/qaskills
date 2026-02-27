import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Microservices Testing Strategies -- From Unit to Production',
  description:
    'Complete guide to testing microservices. Covers the testing honeycomb, contract testing, service virtualization, Testcontainers, and end-to-end strategies for distributed systems.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Microservices testing is fundamentally different from testing a monolith. You are no longer verifying a single application -- you are verifying a distributed system where services communicate over unreliable networks, deploy independently, and fail in ways that are impossible to reproduce locally. The monolith testing playbook of unit tests at the bottom and a handful of E2E tests at the top falls apart when your system spans dozens of services, each with its own database, message queue, and deployment schedule. This guide walks you through a complete microservices testing strategy -- from the testing honeycomb model that replaces the traditional pyramid, to contract testing between services, service virtualization, Testcontainers for integration testing, and observability-driven testing in production.

## Key Takeaways

- **Microservices testing** requires a fundamentally different approach than monolith testing because of network boundaries, independent deployments, and distributed data ownership
- The **testing honeycomb** model prioritizes integration tests over unit and E2E tests, reflecting the reality that most microservices bugs occur at service boundaries
- **Contract testing** with tools like Pact catches breaking API changes between services without requiring both services to run simultaneously
- **Testcontainers** provide real databases and message brokers for integration tests, eliminating the false confidence of mocked dependencies
- **Service virtualization** with WireMock or Mountebank lets you simulate unreliable third-party dependencies and test failure scenarios that are impossible to reproduce with real services
- **Observability-driven testing** using traces, metrics, and synthetic monitoring extends your testing strategy into production where real distributed failures occur

---

## Why Microservices Testing Is Different

Testing a monolith is conceptually simple. You have one codebase, one database, and one deployment. Your tests start the application, hit its endpoints, and assert on the results. When something breaks, you look at one stack trace in one log file.

Microservices shatter this simplicity. Instead of one application, you have a network of services that communicate through HTTP APIs, message queues, and event streams. Each service owns its data, deploys on its own schedule, and can fail independently. This introduces testing challenges that do not exist in monolithic architectures.

**Distributed complexity.** A single user action -- placing an order, for example -- might traverse the API gateway, order service, inventory service, payment service, and notification service. Testing this flow requires either running all five services simultaneously or finding ways to test each service in isolation while still verifying the interactions between them.

**Network boundaries.** Every service-to-service call crosses a network boundary. Networks introduce latency, timeouts, retries, partial failures, and ordering issues that in-process function calls never have. A test that works perfectly when services communicate in-memory will fail in surprising ways when real HTTP calls are involved.

**Independent deployments.** Service A can deploy a breaking change to its API while service B is still using the old version. In a monolith, this is a compile error. In microservices, it is a runtime failure that only surfaces when the two services interact in production. Your testing strategy must catch these incompatibilities before deployment.

**Data consistency.** Each microservice typically owns its own database. There is no single transaction that spans services. Operations that were atomic in a monolith become eventually consistent sagas that can fail partway through. Testing these partial-failure scenarios requires deliberate effort.

**Service discovery and configuration.** Services find each other through service registries, DNS, load balancers, or hardcoded URLs. Tests need to account for service discovery failures, version mismatches, and configuration drift between environments.

The monolith testing playbook -- write lots of unit tests, a few integration tests, and a handful of E2E tests -- does not work for microservices. You need a strategy that specifically addresses service boundary failures, contract compatibility, and distributed system behavior.

---

## The Testing Honeycomb

The **testing honeycomb** is a model proposed by Spotify that better reflects the economics of microservices testing. Instead of the traditional testing pyramid (many unit tests, fewer integration tests, fewest E2E tests), the honeycomb inverts the emphasis: **integration tests are the most valuable layer** for microservices.

Here is how the two models compare:

| Aspect | Testing Pyramid | Testing Honeycomb |
|---|---|---|
| **Most tests** | Unit tests | Integration tests |
| **Middle layer** | Integration tests | Unit tests + E2E tests |
| **Fewest tests** | E2E tests | (balanced at edges) |
| **Best for** | Monoliths with rich business logic | Microservices with many integrations |
| **Core assumption** | Most bugs are in business logic | Most bugs are at service boundaries |

**Why the pyramid fails for microservices.** In a monolith, business logic is complex and integrations are relatively simple (one database, one deployment). Unit tests cover the complex part. In microservices, individual services often have straightforward business logic -- a service that translates between two data formats, routes events, or aggregates data from other services. The complexity lives at the **boundaries between services**: serialization, HTTP status code handling, message schema evolution, timeout behavior, and error propagation. Unit tests that mock these boundaries test the least interesting part of the system.

**When each layer applies:**

- **Unit tests** -- Still valuable for services with complex business logic like pricing engines, rule evaluators, or data transformation pipelines. Less valuable for thin services that primarily coordinate other services.
- **Integration tests** -- The primary workhorse. Test your service with real databases, real message brokers, and real HTTP clients against contract mocks. This is where you catch serialization errors, query bugs, transaction issues, and message handling failures.
- **E2E tests** -- Keep this layer small and focused on critical business flows. Test the top 5-10 user journeys that generate revenue or are contractually required. Every additional E2E test increases maintenance cost and execution time disproportionately.

The honeycomb does not prescribe exact ratios. It is a mental model that says: **invest your testing effort where the bugs actually are**, and in microservices, that is at the integration boundaries.

---

## Unit Testing Microservices

Unit testing in microservices focuses on isolating business logic from external dependencies. The **ports and adapters pattern** (also called hexagonal architecture) is the most effective way to structure your services for testability.

The idea is simple: your business logic (the core) communicates with the outside world through interfaces (ports). Concrete implementations (adapters) handle HTTP calls, database queries, and message publishing. In tests, you swap real adapters for test doubles.

\`\`\`typescript
// ports/order-repository.ts -- the port (interface)
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// ports/payment-gateway.ts -- the port (interface)
interface PaymentGateway {
  charge(amount: number, currency: string, token: string): Promise<PaymentResult>;
}

// core/order-service.ts -- business logic depends only on ports
class OrderService {
  constructor(
    private orders: OrderRepository,
    private payments: PaymentGateway,
  ) {}

  async placeOrder(dto: PlaceOrderDTO): Promise<Order> {
    const order = Order.create(dto.items, dto.shippingAddress);

    if (order.total <= 0) {
      throw new InvalidOrderError('Order total must be positive');
    }

    const payment = await this.payments.charge(
      order.total,
      order.currency,
      dto.paymentToken,
    );

    if (!payment.success) {
      throw new PaymentFailedError(payment.declineReason);
    }

    order.markAsPaid(payment.transactionId);
    await this.orders.save(order);
    return order;
  }
}
\`\`\`

\`\`\`typescript
// order-service.test.ts -- unit test with test doubles
describe('OrderService', () => {
  let service: OrderService;
  let mockRepo: OrderRepository;
  let mockPayments: PaymentGateway;

  beforeEach(() => {
    mockRepo = { findById: vi.fn(), save: vi.fn() };
    mockPayments = { charge: vi.fn() };
    service = new OrderService(mockRepo, mockPayments);
  });

  it('rejects orders with zero total', async () => {
    const dto = createOrderDTO({ items: [] });
    await expect(service.placeOrder(dto)).rejects.toThrow(InvalidOrderError);
    expect(mockPayments.charge).not.toHaveBeenCalled();
  });

  it('saves order after successful payment', async () => {
    vi.mocked(mockPayments.charge).mockResolvedValue({
      success: true,
      transactionId: 'txn_123',
    });

    const dto = createOrderDTO({ items: [{ sku: 'WIDGET', qty: 2, price: 25 }] });
    const order = await service.placeOrder(dto);

    expect(order.status).toBe('paid');
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'txn_123' }),
    );
  });

  it('throws PaymentFailedError when charge is declined', async () => {
    vi.mocked(mockPayments.charge).mockResolvedValue({
      success: false,
      declineReason: 'insufficient_funds',
    });

    const dto = createOrderDTO({ items: [{ sku: 'WIDGET', qty: 1, price: 50 }] });
    await expect(service.placeOrder(dto)).rejects.toThrow(PaymentFailedError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
\`\`\`

The key insight is that unit tests for microservices should test **business decisions**, not HTTP serialization or database queries. If your unit test is mocking an HTTP response body and asserting on JSON parsing, that test belongs in the integration layer.

---

## Integration Testing with Testcontainers

Integration tests verify that your service works correctly with its real infrastructure dependencies -- databases, message brokers, caches, and external APIs. **Testcontainers** is a library that spins up real Docker containers for these dependencies during your test suite, giving you the confidence of testing against real infrastructure with the isolation of throwaway environments.

\`\`\`typescript
// order-repository.integration.test.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

describe('OrderRepository (Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let db: ReturnType<typeof drizzle>;
  let repo: PostgresOrderRepository;

  beforeAll(async () => {
    // Spin up a real Postgres container
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('testdb')
      .start();

    const client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();
    db = drizzle(client);

    // Run real migrations against the container
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    repo = new PostgresOrderRepository(db);
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  it('persists and retrieves an order with line items', async () => {
    const order = Order.create(
      [{ sku: 'WIDGET-A', qty: 3, price: 1999 }],
      { city: 'Portland', zip: '97201' },
    );
    order.markAsPaid('txn_abc');

    await repo.save(order);
    const found = await repo.findById(order.id);

    expect(found).not.toBeNull();
    expect(found!.items).toHaveLength(1);
    expect(found!.items[0].sku).toBe('WIDGET-A');
    expect(found!.transactionId).toBe('txn_abc');
  });

  it('returns null for non-existent order', async () => {
    const found = await repo.findById('non-existent-id');
    expect(found).toBeNull();
  });
});
\`\`\`

**Why Testcontainers over mocks?** Mocking your database means you are testing your mock, not your queries. A mocked repository will not catch SQL syntax errors, missing migrations, incorrect column types, or N+1 query problems. Testcontainers give you a real Postgres (or MySQL, MongoDB, Redis, Kafka, RabbitMQ) that behaves exactly like production -- because it is the same software.

**Testing with real message brokers** follows the same pattern. If your service consumes Kafka events, spin up a Kafka container, publish test events, and verify your consumer processes them correctly:

\`\`\`typescript
import { KafkaContainer } from '@testcontainers/kafka';

describe('OrderEventConsumer (Kafka)', () => {
  let kafkaContainer: StartedKafkaContainer;

  beforeAll(async () => {
    kafkaContainer = await new KafkaContainer().withExposedPorts(9093).start();
  }, 120_000);

  it('processes inventory-reserved events and updates order status', async () => {
    const producer = createProducer(kafkaContainer.getBootstrapServers());
    await producer.send({
      topic: 'inventory.events',
      messages: [{ value: JSON.stringify({ type: 'RESERVED', orderId: 'ord_1' }) }],
    });

    // Wait for consumer to process
    await waitForCondition(() => repo.findById('ord_1').then(o => o?.status === 'reserved'));
  });
});
\`\`\`

For a deeper dive into testing against real databases with Testcontainers, see our [database testing automation guide](/blog/database-testing-automation-guide).

---

## Contract Testing Between Services

**Contract testing** verifies that two services can communicate correctly by testing each service independently against a shared contract. Instead of deploying both services and running integration tests, you test the consumer and provider separately -- the consumer defines what it expects, and the provider verifies it can deliver.

**Consumer-driven contracts with Pact** are the most widely adopted approach for microservices. Here is a minimal example:

\`\`\`typescript
// order-service (consumer) -- defines what it expects from inventory-service
import { PactV4, MatchersV3 } from '@pact-foundation/pact';

const provider = new PactV4({
  consumer: 'order-service',
  provider: 'inventory-service',
});

describe('Inventory Service Contract', () => {
  it('returns stock availability for a SKU', async () => {
    await provider
      .addInteraction()
      .given('SKU WIDGET-A has 50 units in stock')
      .uponReceiving('a request for stock availability')
      .withRequest('GET', '/api/inventory/WIDGET-A')
      .willRespondWith(200, (builder) => {
        builder.jsonBody({
          sku: MatchersV3.string('WIDGET-A'),
          available: MatchersV3.integer(50),
          warehouse: MatchersV3.string('US-WEST'),
        });
      })
      .executeTest(async (mockServer) => {
        const client = new InventoryClient(mockServer.url);
        const stock = await client.checkAvailability('WIDGET-A');

        expect(stock.available).toBe(50);
        expect(stock.warehouse).toBe('US-WEST');
      });
  });
});
\`\`\`

When this consumer test runs, Pact generates a contract JSON file. The inventory service (provider) then verifies it can satisfy this contract by replaying the interactions against its real API.

**When to use contract testing vs. integration testing:**

| Scenario | Use Contract Testing | Use Integration Testing |
|---|---|---|
| Verifying API compatibility between teams | Yes | Overkill |
| Testing database queries and migrations | No | Yes |
| Catching serialization/deserialization bugs | Yes | Also yes |
| Validating message schema evolution | Yes | Supplementary |
| Testing complex multi-service workflows | Supplementary | Yes |

Contract testing is fast -- tests run in milliseconds because they do not require real network calls. It is also **decoupled** -- the consumer and provider teams can run their tests independently, at different times, without coordinating schedules or environments. For a comprehensive deep dive, see our [API contract testing guide](/blog/api-contract-testing-microservices).

---

## Service Virtualization

**Service virtualization** lets you simulate the behavior of dependent services that are unavailable, unstable, or expensive to run. While mocking replaces a function call in your code, service virtualization stands up an actual HTTP server that responds according to predefined rules. This makes it invaluable for testing against third-party APIs, services owned by other teams, and failure scenarios that are difficult to reproduce.

**WireMock** is the most popular service virtualization tool for HTTP-based microservices. Here is how to use it to simulate a payment gateway:

\`\`\`java
// WireMock setup for payment gateway simulation
import static com.github.tomakehurst.wiremock.client.WireMock.*;

public class PaymentGatewayVirtualization {

    @RegisterExtension
    static WireMockExtension paymentApi = WireMockExtension.newInstance()
        .options(wireMockConfig().dynamicPort())
        .build();

    @Test
    void handlesSuccessfulPayment() {
        paymentApi.stubFor(
            post(urlEqualTo("/v1/charges"))
                .withRequestBody(matchingJsonPath("\$.amount"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", "application/json")
                    .withBody("""
                        {
                          "id": "ch_test_123",
                          "status": "succeeded",
                          "amount": 5000
                        }
                    """))
        );

        PaymentResult result = paymentService.charge(5000, "usd", "tok_visa");
        assertThat(result.isSuccessful()).isTrue();
    }

    @Test
    void handlesGatewayTimeout() {
        paymentApi.stubFor(
            post(urlEqualTo("/v1/charges"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withFixedDelay(15_000))  // 15-second delay
        );

        // Verify the service times out and handles it gracefully
        assertThatThrownBy(() -> paymentService.charge(5000, "usd", "tok_visa"))
            .isInstanceOf(PaymentTimeoutException.class);
    }

    @Test
    void handlesIntermittentFailures() {
        paymentApi.stubFor(
            post(urlEqualTo("/v1/charges"))
                .inScenario("flaky-gateway")
                .whenScenarioStateIs(Scenario.STARTED)
                .willReturn(aResponse().withStatus(503))
                .willSetStateTo("recovered")
        );

        paymentApi.stubFor(
            post(urlEqualTo("/v1/charges"))
                .inScenario("flaky-gateway")
                .whenScenarioStateIs("recovered")
                .willReturn(aResponse()
                    .withStatus(200)
                    .withBody("{\"id\": \"ch_retry\", \"status\": \"succeeded\"}"))
        );

        // Verify retry logic works: first call fails, second succeeds
        PaymentResult result = paymentService.chargeWithRetry(5000, "usd", "tok_visa");
        assertThat(result.isSuccessful()).isTrue();
        paymentApi.verify(2, postRequestedFor(urlEqualTo("/v1/charges")));
    }
}
\`\`\`

**When to use service virtualization vs. real services vs. mocks:**

| Approach | Best For | Drawbacks |
|---|---|---|
| **Real services** | Final validation in staging/production | Slow, flaky, expensive, hard to control |
| **Service virtualization** | Simulating third-party APIs, failure scenarios, rate limits | Requires maintaining stubs, can drift from reality |
| **In-code mocks** | Unit testing business logic | Does not test HTTP layer, serialization, or network behavior |

Service virtualization shines for testing **failure modes** that are impossible or impractical to reproduce with real services: 503 errors, network timeouts, rate limiting, malformed responses, and partial outages. These are exactly the scenarios that cause production incidents and are hardest to catch without deliberate testing.

---

## End-to-End Testing Strategies

End-to-end tests for microservices verify critical user journeys across multiple services. They are the most expensive tests to write, run, and maintain -- but they are also the only tests that verify the entire system works together. The key is keeping the E2E suite **small, focused, and stable**.

**Rule of thumb: Test 5-10 critical paths, not 500.** Identify the user journeys that generate revenue, are contractually required, or would cause the most damage if broken. For an e-commerce system, your E2E suite might cover:

1. User registration and login
2. Product search and browsing
3. Add to cart and checkout
4. Payment processing
5. Order confirmation and email notification

Everything else should be covered by integration tests and contract tests at the individual service level.

**Environment management** is the hardest part of microservices E2E testing. You need all services running, configured to talk to each other, with databases seeded with test data. Docker Compose is the most common approach for local and CI environments:

\`\`\`yaml
# docker-compose.test.yml
services:
  api-gateway:
    build: ./services/api-gateway
    depends_on: [order-service, inventory-service, payment-service]
    environment:
      ORDER_SERVICE_URL: http://order-service:3001
      INVENTORY_SERVICE_URL: http://inventory-service:3002

  order-service:
    build: ./services/order-service
    depends_on: [order-db, kafka]
    environment:
      DATABASE_URL: postgres://test:test@order-db:5432/orders
      KAFKA_BROKERS: kafka:9092

  inventory-service:
    build: ./services/inventory-service
    depends_on: [inventory-db, kafka]

  payment-service:
    build: ./services/payment-service
    depends_on: [payment-db]

  order-db:
    image: postgres:16
  inventory-db:
    image: postgres:16
  payment-db:
    image: postgres:16
  kafka:
    image: confluentinc/cp-kafka:7.6.0
\`\`\`

**Test data across services** is another challenge. In a monolith, you seed one database. In microservices, you need consistent test data across multiple databases. Use a **test data setup API** or seed scripts that run against each service's database before the test suite:

\`\`\`typescript
// e2e/setup.ts
async function seedTestData() {
  // Each service exposes a test-only seeding endpoint
  await fetch('http://localhost:3001/test/seed', {
    method: 'POST',
    body: JSON.stringify({ users: testUsers, orders: [] }),
  });
  await fetch('http://localhost:3002/test/seed', {
    method: 'POST',
    body: JSON.stringify({ products: testProducts, stock: testInventory }),
  });
}
\`\`\`

**Keep E2E tests deterministic.** Avoid relying on timing, polling, or sleep-based waits. Use event-driven assertions: wait for a specific message on Kafka, poll an API until a state change is observed, or use WebSocket notifications. Flaky E2E tests erode trust faster than no tests at all.

---

## Observability-Driven Testing

Traditional testing stops at the staging environment boundary. **Observability-driven testing** extends your testing strategy into production by using traces, metrics, and logs to detect failures that only manifest under real traffic patterns, data volumes, and service interactions.

**Distributed tracing** is the foundation. Tools like Jaeger, Zipkin, and OpenTelemetry let you follow a request as it traverses multiple services. In a testing context, you can use traces to verify that:

- Requests follow the expected path through services
- No service adds unexpected latency
- Error rates stay below thresholds after deployments
- Retry and fallback mechanisms activate correctly

**Canary deployments** are a testing strategy disguised as a deployment strategy. By routing a small percentage of production traffic (1-5%) to the new version while monitoring key metrics, you are running a real-world test with real users and real data. If error rates increase or latency spikes, you roll back automatically before the canary affects more users.

**Feature flags** extend this concept further. Instead of deploying new code to a canary instance, you deploy the code everywhere but gate it behind a feature flag. You enable the flag for internal users first, then a small percentage of real users, then gradually ramp up. At each stage, you monitor metrics and can instantly disable the flag if something goes wrong.

**Synthetic monitoring** runs scripted test scenarios against production on a recurring schedule. Unlike your CI/CD E2E tests that run against staging, synthetic monitors hit your actual production endpoints:

\`\`\`typescript
// synthetic/checkout-flow.ts
// Runs every 5 minutes against production
async function syntheticCheckoutTest() {
  const startTime = Date.now();

  // Use a dedicated test account and test payment method
  const session = await login('synthetic-test@example.com', SYNTHETIC_PASSWORD);
  const cart = await addToCart(session, TEST_PRODUCT_SKU, 1);
  const order = await checkout(session, cart.id, TEST_PAYMENT_TOKEN);

  const duration = Date.now() - startTime;

  // Report metrics
  metrics.gauge('synthetic.checkout.duration_ms', duration);
  metrics.increment('synthetic.checkout.success');

  // Clean up -- cancel the test order
  await cancelOrder(session, order.id);

  if (duration > 10_000) {
    alerts.warn('Synthetic checkout took over 10 seconds', { duration, orderId: order.id });
  }
}
\`\`\`

Observability-driven testing is not a replacement for pre-production testing -- it is an extension. You still need unit tests, integration tests, and contract tests to catch issues before deployment. But production testing catches the long tail of failures that no pre-production environment can replicate: real concurrency patterns, data skew, third-party API behavior, and cascading failures under load. For more on testing in production through controlled failure injection, see our [chaos engineering guide](/blog/chaos-engineering-resilience-testing).

---

## Automate Microservices Testing with AI Agents

AI coding agents can accelerate your microservices testing strategy by generating contract tests, integration test scaffolding, and service virtualization stubs. QASkills provides specialized skills that encode expert microservices testing knowledge.

**Contract testing automation:**

\`\`\`bash
npx @qaskills/cli add contract-testing-pact
\`\`\`

This skill teaches your AI agent to generate consumer-driven contract tests with Pact, set up provider verification, and integrate contract testing into CI/CD pipelines.

**API contract validation:**

\`\`\`bash
npx @qaskills/cli add api-contract-validator
\`\`\`

This skill focuses on OpenAPI schema validation, ensuring your service implementations match their API specifications and catching drift between documentation and reality.

**Additional microservices testing skills:**

\`\`\`bash
# REST API testing patterns for service endpoints
npx @qaskills/cli add api-testing-rest

# Database migration and query testing
npx @qaskills/cli add database-migration-test-generator
\`\`\`

The **api-testing-rest** skill is particularly valuable for microservices because it teaches agents to test HTTP status codes, content negotiation, pagination, and error response formats -- the exact integration points where microservices fail.

The **database-migration-test-generator** skill helps verify that each service's database migrations apply cleanly, roll back safely, and maintain data integrity across schema changes.

Browse all available testing skills at [qaskills.sh/skills](/skills). For a guided setup that detects your AI agent and installs the right skills for your stack, visit [getting started](/getting-started).

---

## Frequently Asked Questions

### What is the best testing strategy for microservices?

The best microservices testing strategy follows the **testing honeycomb** model: invest heavily in integration tests that verify service boundaries, use unit tests for complex business logic, and keep end-to-end tests limited to critical business flows. Complement this with contract testing between services and observability-driven testing in production. The exact mix depends on your architecture -- services with rich business logic need more unit tests, while thin orchestration services need more integration and contract tests.

### How do you test communication between microservices?

You test inter-service communication primarily through **contract testing** and **integration testing**. Contract testing (using Pact or similar tools) verifies that the consumer and provider agree on request/response formats without requiring both services to run simultaneously. Integration tests with service virtualization (WireMock, Mountebank) verify that your service handles real HTTP responses correctly, including error codes, timeouts, and malformed payloads. Reserve end-to-end tests for validating the most critical multi-service workflows.

### Should I use mocks or real services in microservices tests?

Use both, but at different layers. **Unit tests** should mock external dependencies to test business logic in isolation. **Integration tests** should use real infrastructure (databases, message brokers via Testcontainers) and service virtualization (WireMock for HTTP dependencies). **Contract tests** use Pact mock servers on the consumer side and real APIs on the provider side. **E2E tests** should use real services. The mistake most teams make is over-mocking at the integration layer, which gives false confidence that services work together.

### How do you handle test data in a microservices architecture?

Test data management in microservices is challenging because data is distributed across service-owned databases. Three common approaches: **1)** Each service exposes a test-only seeding API that pre-production tests call during setup. **2)** A shared test data generation library creates consistent entities across services using each service's public API. **3)** Event-driven seeding where you publish domain events that services consume to build their local state. Avoid sharing databases between services for testing -- it couples services and breaks the data ownership boundary.

### How many end-to-end tests should a microservices system have?

Keep your E2E test suite to **5-15 critical business flows** regardless of how many services you have. E2E tests for microservices are exponentially more expensive than for monoliths because they require all services running, coordinated test data, and complex environment management. Every additional E2E test increases maintenance burden, execution time, and flakiness. Push coverage down to integration and contract tests wherever possible, and reserve E2E tests for flows where a failure would directly impact revenue or user safety.
`,
};
