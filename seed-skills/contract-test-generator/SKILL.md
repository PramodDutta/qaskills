---
name: Contract Test Generator
description: Generate consumer-driven contract tests using Pact framework to verify API provider-consumer compatibility and prevent integration breaking changes
version: 1.0.0
author: Pramod
license: MIT
tags: [contract-testing, pact, consumer-driven, provider-verification, api-compatibility, pact-broker, integration-testing]
testingTypes: [contract, api]
frameworks: [pact]
languages: [typescript, javascript, java]
domains: [api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Contract Test Generator

Contract testing bridges the gap between unit tests and full integration tests by verifying that services can communicate correctly without requiring all services to be running simultaneously. Consumer-driven contract testing, pioneered by the Pact framework, inverts the traditional approach: consumers define what they expect from providers, and providers verify they can satisfy those expectations. This skill guides AI coding agents through generating robust contract tests that catch integration breaking changes before they reach production.

## Core Principles

1. **Consumer-Driven Design**: Consumers define the contract based on what they actually use, not what the provider offers. This ensures contracts are minimal, focused, and reflect real usage patterns rather than hypothetical API surfaces.

2. **Provider Verification Independence**: Provider tests verify contracts independently without needing the consumer running. This decouples deployment schedules and enables teams to work autonomously while maintaining integration guarantees.

3. **Contract as Shared Artifact**: The contract (pact file) serves as a living specification between consumer and provider. It is versioned, stored centrally, and referenced by both sides during their respective CI pipelines.

4. **Minimal Assertion Surface**: Contracts should assert only what the consumer needs, not the full provider response. Testing for specific fields rather than entire response bodies prevents brittle contracts that break on harmless provider changes.

5. **Versioning Alignment with Deployability**: Every contract must be associated with a specific consumer version and verified against a specific provider version. The combination of these versions determines whether a deployment is safe.

6. **Fail-Fast in CI**: Contract verification failures must block deployments. The can-i-deploy tool provides a definitive answer about deployment safety based on the latest verification matrix.

7. **Incremental Adoption**: Contract tests can be introduced for the most critical interactions first, then expanded. There is no requirement to cover every endpoint immediately; focus on high-risk integration points.

## Project Structure

```
project-root/
├── consumer/
│   ├── src/
│   │   ├── api-client.ts
│   │   └── types.ts
│   ├── tests/
│   │   └── contract/
│   │       ├── user-service.consumer.pact.ts
│   │       ├── order-service.consumer.pact.ts
│   │       └── helpers/
│   │           ├── pact-setup.ts
│   │           └── matchers.ts
│   ├── pacts/                          # Generated pact files (JSON)
│   │   └── consumer-user_service.json
│   └── pact-config.ts
├── provider/
│   ├── src/
│   │   └── controllers/
│   ├── tests/
│   │   └── contract/
│   │       ├── provider-verification.pact.ts
│   │       └── state-handlers/
│   │           ├── user-states.ts
│   │           └── order-states.ts
│   └── pact-config.ts
├── pact-broker/
│   └── docker-compose.yml
└── ci/
    ├── publish-pacts.sh
    ├── verify-provider.sh
    └── can-i-deploy.sh
```

## Consumer Test Generation

### Basic Consumer Test in TypeScript

Consumer tests define the expectations a consumer has of a provider API. The Pact mock server simulates the provider during consumer tests.

```typescript
// consumer/tests/contract/user-service.consumer.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { resolve } from 'path';
import { UserApiClient } from '../../src/api-client';

const { like, eachLike, regex, integer, string, timestamp } = MatchersV3;

const provider = new PactV4({
  consumer: 'frontend-app',
  provider: 'user-service',
  dir: resolve(__dirname, '../../pacts'),
  logLevel: 'warn',
});

describe('User Service Contract', () => {
  describe('GET /api/users/:id', () => {
    it('returns a user when one exists', async () => {
      await provider
        .addInteraction()
        .given('a user with ID 42 exists')
        .uponReceiving('a request for user 42')
        .withRequest('GET', '/api/users/42', (builder) => {
          builder.headers({
            Accept: 'application/json',
            Authorization: regex(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/, 'Bearer eyJ.test.token'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            id: integer(42),
            name: string('Jane Doe'),
            email: regex(/^[\w.]+@[\w.]+\.\w+$/, 'jane@example.com'),
            role: regex(/^(admin|user|moderator)$/, 'user'),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2024-01-15T10:30:00.000Z'),
            preferences: like({
              theme: string('dark'),
              notifications: like(true),
            }),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);
          const user = await client.getUser(42);

          expect(user.id).toBe(42);
          expect(user.name).toBeDefined();
          expect(user.email).toContain('@');
        });
    });

    it('returns 404 when user does not exist', async () => {
      await provider
        .addInteraction()
        .given('no user with ID 999 exists')
        .uponReceiving('a request for non-existent user 999')
        .withRequest('GET', '/api/users/999', (builder) => {
          builder.headers({
            Accept: 'application/json',
            Authorization: regex(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/, 'Bearer eyJ.test.token'),
          });
        })
        .willRespondWith(404, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            error: string('Not Found'),
            message: string('User with ID 999 not found'),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);
          await expect(client.getUser(999)).rejects.toThrow('User not found');
        });
    });
  });

  describe('POST /api/users', () => {
    it('creates a new user', async () => {
      await provider
        .addInteraction()
        .given('the user creation endpoint is available')
        .uponReceiving('a request to create a user')
        .withRequest('POST', '/api/users', (builder) => {
          builder.headers({
            'Content-Type': 'application/json',
            Authorization: regex(/^Bearer\s.+$/, 'Bearer eyJ.admin.token'),
          });
          builder.jsonBody({
            name: string('John Smith'),
            email: regex(/^[\w.]+@[\w.]+\.\w+$/, 'john@example.com'),
            role: regex(/^(admin|user|moderator)$/, 'user'),
          });
        })
        .willRespondWith(201, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            id: integer(1),
            name: string('John Smith'),
            email: string('john@example.com'),
            role: string('user'),
            createdAt: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2024-06-01T12:00:00.000Z'),
          });
        })
        .executeTest(async (mockServer) => {
          const client = new UserApiClient(mockServer.url);
          const created = await client.createUser({
            name: 'John Smith',
            email: 'john@example.com',
            role: 'user',
          });

          expect(created.id).toBeDefined();
          expect(created.name).toBe('John Smith');
        });
    });
  });
});
```

### Consumer Test in Java

```java
// consumer/src/test/java/com/example/contract/UserServiceConsumerPactTest.java
package com.example.contract;

import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.core.model.V4Pact;
import au.com.dius.pact.core.model.annotations.Pact;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service", port = "8080")
public class UserServiceConsumerPactTest {

    @Pact(consumer = "order-service")
    public V4Pact getUserPact(PactDslWithProvider builder) {
        return builder
            .given("a user with ID 42 exists")
            .uponReceiving("a request for user 42")
                .path("/api/users/42")
                .method("GET")
                .headers("Accept", "application/json")
            .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                    .integerType("id", 42)
                    .stringType("name", "Jane Doe")
                    .stringMatcher("email", "^[\\w.]+@[\\w.]+\\.\\w+$", "jane@example.com")
                    .stringType("role", "user")
                    .object("address")
                        .stringType("city", "Portland")
                        .stringType("state", "OR")
                    .closeObject()
                )
            .toPact(V4Pact.class);
    }

    @Test
    @PactTestFor(pactMethod = "getUserPact")
    void testGetUser(MockServer mockServer) {
        UserApiClient client = new UserApiClient(mockServer.getUrl());
        User user = client.getUser(42);

        assertThat(user.getId()).isEqualTo(42);
        assertThat(user.getName()).isNotBlank();
        assertThat(user.getEmail()).contains("@");
    }
}
```

## Provider Verification Setup

### TypeScript Provider Verification

```typescript
// provider/tests/contract/provider-verification.pact.ts
import { Verifier } from '@pact-foundation/pact';
import { resolve } from 'path';
import { app } from '../../src/app';
import { Server } from 'http';

let server: Server;
const PORT = 8081;

beforeAll(async () => {
  server = app.listen(PORT);
});

afterAll(async () => {
  server.close();
});

describe('Provider Verification', () => {
  it('validates the expectations of all consumers', async () => {
    const verifier = new Verifier({
      providerBaseUrl: `http://localhost:${PORT}`,
      provider: 'user-service',

      // Option A: Verify from Pact Broker
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_COMMIT_SHA,
      providerVersionBranch: process.env.GIT_BRANCH,

      // Enable pending pacts (new contracts won't break provider builds)
      enablePending: true,
      includeWipPactsSince: '2024-01-01',

      // State handlers set up test data for each provider state
      stateHandlers: {
        'a user with ID 42 exists': async () => {
          await seedDatabase({
            users: [{ id: 42, name: 'Jane Doe', email: 'jane@example.com', role: 'user' }],
          });
        },
        'no user with ID 999 exists': async () => {
          await clearDatabase('users');
        },
        'the user creation endpoint is available': async () => {
          await clearDatabase('users');
          await resetSequences('users');
        },
      },

      // Request filter to add auth headers the provider requires
      requestFilter: (req, _res, next) => {
        req.headers['Authorization'] = `Bearer ${generateTestToken()}`;
        next();
      },
    });

    await verifier.verifyProvider();
  });
});
```

### Java Provider Verification

```java
@Provider("user-service")
@PactBroker(
    url = "${PACT_BROKER_BASE_URL}",
    authentication = @PactBrokerAuth(token = "${PACT_BROKER_TOKEN}")
)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class UserServiceProviderPactTest {

    @LocalServerPort
    private int port;

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyPact(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @BeforeEach
    void setUp(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @State("a user with ID 42 exists")
    void userExists() {
        userRepository.save(new User(42L, "Jane Doe", "jane@example.com", "user"));
    }

    @State("no user with ID 999 exists")
    void userDoesNotExist() {
        userRepository.deleteAll();
    }
}
```

## Pact Broker Integration

### Docker Compose Setup

```yaml
# pact-broker/docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pact_broker
      POSTGRES_USER: pact_broker
      POSTGRES_PASSWORD: pact_broker_password
    volumes:
      - pact-db:/var/lib/postgresql/data

  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgres://pact_broker:pact_broker_password@postgres/pact_broker
      PACT_BROKER_BASIC_AUTH_USERNAME: admin
      PACT_BROKER_BASIC_AUTH_PASSWORD: admin
      PACT_BROKER_ALLOW_PUBLIC_READ: "true"
      PACT_BROKER_WEBHOOK_SCHEME_WHITELIST: https
      PACT_BROKER_CHECK_FOR_POTENTIAL_DUPLICATE_PACTICIPANT_NAMES: "true"
    depends_on:
      - postgres

volumes:
  pact-db:
```

### Publishing Pacts to Broker

```typescript
// scripts/publish-pacts.ts
import { Publisher } from '@pact-foundation/pact';
import { resolve } from 'path';
import { execSync } from 'child_process';

const gitCommitSha = execSync('git rev-parse HEAD').toString().trim();
const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

async function publishPacts() {
  const publisher = new Publisher({
    pactBroker: process.env.PACT_BROKER_BASE_URL || 'http://localhost:9292',
    pactBrokerToken: process.env.PACT_BROKER_TOKEN,
    pactFilesOrDirs: [resolve(__dirname, '../pacts')],
    consumerVersion: gitCommitSha,
    branch: gitBranch,
    tags: [gitBranch],
    buildUrl: process.env.CI_BUILD_URL,
  });

  await publisher.publishPacts();
  console.log('Pacts published successfully');
}

publishPacts().catch((err) => {
  console.error('Failed to publish pacts:', err);
  process.exit(1);
});
```

## Can-I-Deploy Workflow

The can-i-deploy tool queries the Pact Broker to determine whether it is safe to deploy a particular version of an application.

```bash
#!/bin/bash
# ci/can-i-deploy.sh

PACTICIPANT=$1
VERSION=$(git rev-parse HEAD)
ENVIRONMENT=${2:-production}

echo "Checking if $PACTICIPANT version $VERSION can be deployed to $ENVIRONMENT..."

pact-broker can-i-deploy \
  --pacticipant "$PACTICIPANT" \
  --version "$VERSION" \
  --to-environment "$ENVIRONMENT" \
  --broker-base-url "$PACT_BROKER_BASE_URL" \
  --broker-token "$PACT_BROKER_TOKEN" \
  --retry-while-unknown 30 \
  --retry-interval 10

if [ $? -eq 0 ]; then
  echo "Safe to deploy. Recording deployment..."
  pact-broker record-deployment \
    --pacticipant "$PACTICIPANT" \
    --version "$VERSION" \
    --environment "$ENVIRONMENT" \
    --broker-base-url "$PACT_BROKER_BASE_URL" \
    --broker-token "$PACT_BROKER_TOKEN"
else
  echo "BLOCKED: Cannot deploy $PACTICIPANT to $ENVIRONMENT"
  exit 1
fi
```

### GitHub Actions CI Pipeline

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:contract:consumer
      - name: Publish pacts
        if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
        run: npx ts-node scripts/publish-pacts.ts
        env:
          PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

  provider-verification:
    runs-on: ubuntu-latest
    needs: consumer-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:contract:provider
        env:
          PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          GIT_COMMIT_SHA: ${{ github.sha }}
          GIT_BRANCH: ${{ github.ref_name }}

  can-i-deploy:
    runs-on: ubuntu-latest
    needs: [consumer-tests, provider-verification]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: |
          docker run --rm \
            pactfoundation/pact-cli:latest \
            pact-broker can-i-deploy \
            --pacticipant frontend-app \
            --version ${{ github.sha }} \
            --to-environment production \
            --broker-base-url ${{ secrets.PACT_BROKER_BASE_URL }} \
            --broker-token ${{ secrets.PACT_BROKER_TOKEN }}
```

## Webhook-Triggered Verification

Configure Pact Broker webhooks to trigger provider verification whenever a consumer publishes a new pact.

```typescript
// scripts/setup-webhooks.ts
import axios from 'axios';

const BROKER_URL = process.env.PACT_BROKER_BASE_URL;
const BROKER_TOKEN = process.env.PACT_BROKER_TOKEN;

async function createWebhook() {
  await axios.post(
    `${BROKER_URL}/webhooks`,
    {
      description: 'Trigger provider verification on new pact',
      events: [
        { name: 'contract_content_changed' },
        { name: 'contract_requiring_verification_published' },
      ],
      request: {
        method: 'POST',
        url: 'https://api.github.com/repos/OWNER/REPO/dispatches',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
          Authorization: 'Bearer ${user.githubToken}',
        },
        body: {
          event_type: 'pact_changed',
          client_payload: {
            pact_url: '${pactbroker.pactUrl}',
            consumer: '${pactbroker.consumerName}',
            provider: '${pactbroker.providerName}',
            consumer_version: '${pactbroker.consumerVersionNumber}',
          },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${BROKER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}
```

## Pending Pacts and WIP Pacts

Pending pacts prevent new consumers from breaking existing provider builds. WIP (Work in Progress) pacts allow verification of contracts from feature branches.

```typescript
// provider/pact-config.ts
export const providerVerificationConfig = {
  // Pending pacts: new contracts won't fail the provider build
  // Once a pact is successfully verified, it transitions out of pending
  enablePending: true,

  // WIP pacts: include pacts from consumer feature branches
  // Only pacts published after this date are considered
  includeWipPactsSince: '2024-01-01',

  // Consumer version selectors determine which pacts to verify
  consumerVersionSelectors: [
    { mainBranch: true },                    // Pacts from consumers' main branch
    { deployedOrReleased: true },            // Pacts from currently deployed consumers
    { matchingBranch: true },                // Pacts from same-named feature branch
    { branch: 'develop' },                   // Always verify develop branch pacts
  ],
};
```

## Bi-Directional Contract Testing

Bi-directional contract testing allows providers to publish their own OpenAPI specification rather than running consumer pact tests directly. The Pact Broker compares the consumer pact with the provider specification.

```typescript
// provider/scripts/publish-provider-contract.ts
import { execSync } from 'child_process';

const gitSha = execSync('git rev-parse HEAD').toString().trim();
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

// Publish the provider's OpenAPI spec as its contract
execSync(`
  pactflow publish-provider-contract \
    ./openapi/user-service.yaml \
    --provider user-service \
    --provider-app-version ${gitSha} \
    --branch ${branch} \
    --content-type application/yaml \
    --verification-exit-code 0 \
    --verification-results ./test-results/provider-tests.json \
    --verification-results-content-type application/json \
    --verifier pactflow-self-verification \
    --broker-base-url ${process.env.PACT_BROKER_BASE_URL} \
    --broker-token ${process.env.PACT_BROKER_TOKEN}
`);
```

## GraphQL Contract Testing

```typescript
// consumer/tests/contract/graphql.consumer.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
const { like, eachLike, string, integer } = MatchersV3;

const provider = new PactV4({
  consumer: 'graphql-client',
  provider: 'graphql-gateway',
});

describe('GraphQL Contract', () => {
  it('fetches user with orders via GraphQL', async () => {
    await provider
      .addInteraction()
      .given('user 42 has orders')
      .uponReceiving('a GraphQL query for user with orders')
      .withRequest('POST', '/graphql', (builder) => {
        builder.headers({ 'Content-Type': 'application/json' });
        builder.jsonBody({
          query: string(`
            query GetUser($id: ID!) {
              user(id: $id) {
                id
                name
                orders {
                  id
                  total
                  status
                }
              }
            }
          `),
          variables: like({ id: '42' }),
        });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody({
          data: {
            user: {
              id: string('42'),
              name: string('Jane Doe'),
              orders: eachLike({
                id: string('order-1'),
                total: like(99.99),
                status: string('SHIPPED'),
              }),
            },
          },
        });
      })
      .executeTest(async (mockServer) => {
        const client = new GraphQLClient(mockServer.url + '/graphql');
        const result = await client.query(GET_USER_WITH_ORDERS, { id: '42' });
        expect(result.data.user.orders.length).toBeGreaterThan(0);
      });
  });
});
```

## Message-Based Contract Testing

For asynchronous event-driven systems, message pact testing validates the structure of messages published to queues or topics.

```typescript
// consumer/tests/contract/order-events.consumer.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
const { like, string, integer, timestamp, regex } = MatchersV3;

const provider = new PactV4({
  consumer: 'notification-service',
  provider: 'order-service',
});

describe('Order Event Contract', () => {
  it('handles order.completed events', async () => {
    await provider
      .addInteraction()
      .given('an order has been completed')
      .expectsToReceive('an order.completed event')
      .withContentV4((builder) => {
        builder.jsonBody({
          eventType: string('order.completed'),
          timestamp: timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2024-06-01T12:00:00.000Z'),
          payload: {
            orderId: string('ord-12345'),
            customerId: integer(42),
            total: like(149.99),
            currency: regex(/^[A-Z]{3}$/, 'USD'),
            items: [
              {
                productId: string('prod-001'),
                quantity: integer(2),
                price: like(74.99),
              },
            ],
            shippingAddress: {
              street: string('123 Main St'),
              city: string('Portland'),
              state: regex(/^[A-Z]{2}$/, 'OR'),
              zip: regex(/^\d{5}(-\d{4})?$/, '97201'),
            },
          },
        });
      })
      .executeTest(async (message) => {
        const handler = new OrderCompletedHandler();
        const result = await handler.handle(JSON.parse(message.contents.toString()));

        expect(result.notificationSent).toBe(true);
        expect(result.recipientId).toBe(42);
      });
  });
});

// provider/tests/contract/message-provider-verification.ts
import { MessageProviderPact } from '@pact-foundation/pact';

describe('Message Provider Verification', () => {
  it('verifies order event messages', async () => {
    const messageProvider = new MessageProviderPact({
      provider: 'order-service',
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_COMMIT_SHA,

      messageProviders: {
        'an order.completed event': async () => {
          // Return the actual message your service would produce
          return {
            eventType: 'order.completed',
            timestamp: new Date().toISOString(),
            payload: {
              orderId: 'ord-12345',
              customerId: 42,
              total: 149.99,
              currency: 'USD',
              items: [{ productId: 'prod-001', quantity: 2, price: 74.99 }],
              shippingAddress: {
                street: '123 Main St',
                city: 'Portland',
                state: 'OR',
                zip: '97201',
              },
            },
          };
        },
      },

      stateHandlers: {
        'an order has been completed': async () => {
          // Set up state as needed
        },
      },
    });

    await messageProvider.verify();
  });
});
```

## Configuration

### Consumer Pact Configuration

```typescript
// consumer/pact-config.ts
import { LogLevel } from '@pact-foundation/pact';
import { resolve } from 'path';

export const pactConfig = {
  // Pact file output directory
  dir: resolve(__dirname, 'pacts'),

  // Logging level: trace, debug, info, warn, error
  logLevel: (process.env.PACT_LOG_LEVEL as LogLevel) || 'warn',

  // Pact specification version
  spec: 4,

  // Timeout for pact mock server (milliseconds)
  timeout: 30000,
};
```

### Provider Verification Configuration

```typescript
// provider/pact-config.ts
export const providerConfig = {
  providerBaseUrl: process.env.PROVIDER_BASE_URL || 'http://localhost:3000',
  provider: 'user-service',

  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,

  publishVerificationResult: process.env.CI === 'true',
  providerVersion: process.env.GIT_COMMIT_SHA || 'local',
  providerVersionBranch: process.env.GIT_BRANCH || 'local',

  enablePending: true,
  includeWipPactsSince: '2024-01-01',

  consumerVersionSelectors: [
    { mainBranch: true },
    { deployedOrReleased: true },
    { matchingBranch: true },
  ],

  // Timeout for provider state setup (milliseconds)
  stateHandlerTimeout: 10000,

  // Request timeout for each interaction verification
  requestTimeout: 15000,
};
```

### Package.json Scripts

```json
{
  "scripts": {
    "test:contract:consumer": "jest --testPathPattern=consumer.pact",
    "test:contract:provider": "jest --testPathPattern=provider-verification",
    "pact:publish": "ts-node scripts/publish-pacts.ts",
    "pact:can-i-deploy": "bash ci/can-i-deploy.sh",
    "pact:broker": "docker compose -f pact-broker/docker-compose.yml up -d"
  }
}
```

## Best Practices

1. **Use Pact matchers instead of exact values.** Matchers like `like()`, `regex()`, and `eachLike()` validate structure and type rather than specific values, making contracts resilient to data changes.

2. **Keep provider states minimal and descriptive.** Each `given()` state should describe a precondition clearly (e.g., "a user with ID 42 exists") and the state handler should set up only what is needed.

3. **Version pacts with git commit SHA.** Using the git commit SHA as the consumer version ensures traceability and enables the can-i-deploy tool to accurately determine deployment safety.

4. **Enable pending pacts in provider verification.** This prevents new consumers or new interactions from immediately breaking the provider build while still tracking verification status.

5. **Run can-i-deploy before every deployment.** This is the single most important practice for preventing integration breakages; it should gate every production deployment.

6. **Test only what the consumer uses.** If the consumer only reads the `id` and `name` fields from a 20-field response, the contract should only assert on those two fields.

7. **Use consumer version selectors wisely.** Always verify pacts from `mainBranch` and `deployedOrReleased`; add `matchingBranch` for feature branch coordination between teams.

8. **Publish verification results from CI only.** Set `publishVerificationResult: true` only when running in CI to avoid polluting the broker with local verification results.

9. **Implement proper state handlers.** Provider state handlers should seed the database or configure mocks to satisfy each consumer expectation reproducibly.

10. **Tag environments with record-deployment.** After successful deployment, record the deployment in the broker so can-i-deploy knows which versions are in which environments.

11. **Include request headers in contracts when they affect behavior.** If the provider returns different responses based on Accept headers or API versions, include those in the contract.

12. **Use separate CI jobs for consumer and provider.** Consumer tests and provider verification should run independently, connected only through the Pact Broker.

## Anti-Patterns to Avoid

1. **Asserting on entire response bodies.** Never match every field in a provider response. This creates brittle contracts that break when the provider adds a new field, which should be a non-breaking change.

2. **Using exact matchers for dynamic data.** Dates, IDs, and timestamps should use type matchers or regex matchers, not exact values. Using `like(42)` is correct; using the literal `42` is fragile.

3. **Sharing a single provider state across unrelated tests.** Each test should declare its own provider state. Reusing states like "default state" leads to hidden coupling and test fragility.

4. **Running provider verification against a shared staging environment.** Provider verification must run against a locally started provider instance to ensure reproducibility and speed.

5. **Skipping can-i-deploy because it is slow.** If can-i-deploy is too slow, configure retry parameters rather than bypassing it. The `--retry-while-unknown` flag handles asynchronous verification gracefully.

6. **Coupling consumer and provider test suites.** Consumer and provider tests must live in their respective repositories. The pact file (or broker) is the only connection between them.

7. **Using contract tests as functional tests.** Contract tests verify the shape and structure of interactions, not business logic. Do not test complex business scenarios through contracts.

## Debugging Tips

1. **Enable verbose logging.** Set `logLevel: 'debug'` in the Pact configuration or use the environment variable `PACT_LOG_LEVEL=debug` to see detailed request/response matching output.

2. **Inspect generated pact files.** The JSON pact files in the output directory contain the exact interactions defined. Reviewing these files helps identify matcher misconfigurations before publishing.

3. **Use the Pact Broker UI.** The broker provides a visual matrix showing which consumer versions are verified against which provider versions. This is invaluable for diagnosing can-i-deploy failures.

4. **Check provider state handler execution.** If verification fails with unexpected data, add logging to state handlers to confirm they execute and set up data correctly.

5. **Verify the mock server URL.** A common failure is the consumer test using a hardcoded URL instead of `mockServer.url`. Always construct the API client with the dynamic mock server URL.

6. **Compare pact specification versions.** If consumer and provider use different Pact specification versions (v2 vs v3 vs v4), certain matchers may not be supported. Align on the same specification version.

7. **Check for port conflicts.** When running multiple Pact tests in parallel, ensure each test uses a unique port or let Pact assign random ports automatically.

8. **Validate webhook configuration.** If provider verification does not trigger after pact publication, check the broker webhook configuration and review the webhook execution logs in the broker UI.

9. **Review the verification output diff.** When provider verification fails, the output shows an expected vs actual diff. Focus on the specific field or header that mismatched rather than the entire interaction.

10. **Test state handlers in isolation.** Before running full verification, run state handler functions independently to confirm they produce the expected database state or mock configuration.
