import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact Contract Testing Complete Guide 2026',
  description:
    'Complete guide to consumer-driven contract testing with Pact. Setup in JS, Java, Python, broker workflow, provider verification, can-i-deploy, and CI patterns.',
  date: '2026-05-22',
  category: 'API Testing',
  content: `
# Pact Contract Testing Complete Guide 2026

Pact is the most widely adopted consumer-driven contract testing framework, designed to solve the integration test problem in microservices architectures. Instead of running slow, brittle end-to-end tests that require multiple services running together, Pact lets each consumer publish a contract describing the requests it makes and the responses it expects. Providers then verify they can satisfy these contracts. The result: each team can independently develop and deploy services with high confidence that they won't break consumers - or be broken by changes from providers.

This complete guide covers consumer-driven contract testing with Pact in 2026 across JavaScript, Java, and Python. You'll learn the core consumer/provider workflow, how to use the Pact Broker (or Pactflow), how to integrate with CI/CD via the can-i-deploy tool, how to handle versioning and tags, common pitfalls, and patterns from production microservice teams. Real code examples illustrate consumer tests, provider verifications, and full CI workflows. By the end you'll have the patterns needed to introduce Pact at your organization.

## Key Takeaways

- Pact is consumer-driven contract testing for HTTP APIs
- Consumer tests generate JSON contracts that describe expected behavior
- Provider tests verify the real provider can satisfy those contracts
- Pact Broker (or Pactflow) hosts contracts and verification results
- can-i-deploy checks whether deploying a version is safe
- Eliminates the need for end-to-end integration tests in many cases
- Works across languages - consumer and provider can be different stacks

---

## The Pact Workflow

1. Consumer team writes a contract test that records expected requests and responses
2. The contract is saved as JSON and published to the Pact Broker
3. Provider team pulls the latest contract from the Broker
4. Provider runs verification against its real implementation
5. Verification results are published back to the Broker
6. can-i-deploy queries the Broker to confirm safe deployments

## Consumer Test (Node.js)

\`\`\`bash
npm install --save-dev @pact-foundation/pact
\`\`\`

\`\`\`javascript
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const path = require('path');
const axios = require('axios');

const { like, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'web-app',
  provider: 'user-service',
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'info',
});

describe('User API consumer', () => {
  it('gets a user by id', () => {
    provider
      .given('user 42 exists')
      .uponReceiving('a request for user 42')
      .withRequest({
        method: 'GET',
        path: '/users/42',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({
          id: 42,
          name: 'Alice',
          email: 'alice@example.com',
        }),
      });

    return provider.executeTest(async (mockServer) => {
      const response = await axios.get(\`\${mockServer.url}/users/42\`, {
        headers: { Accept: 'application/json' },
      });
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(42);
    });
  });
});
\`\`\`

When this test runs, Pact starts a mock server, your code calls it, and Pact records the interaction in a JSON file in pacts/.

## Matchers

| Matcher | Purpose |
|---------|---------|
| like(value) | Any value of the same type |
| eachLike(value) | Array of items matching value |
| string('regex') | String matching regex |
| integer(value) | Any integer |
| boolean(value) | Any boolean |
| iso8601DateTime() | ISO 8601 timestamp |
| uuid() | UUID string |

## Provider Verification (Node.js)

\`\`\`bash
npm install --save-dev @pact-foundation/pact
\`\`\`

\`\`\`javascript
const { Verifier } = require('@pact-foundation/pact');
const path = require('path');

describe('User Service provider', () => {
  it('satisfies all consumer contracts', () => {
    const opts = {
      provider: 'user-service',
      providerBaseUrl: 'http://localhost:3000',
      pactBrokerUrl: 'https://broker.example.com',
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: true,
      providerVersion: process.env.GIT_SHA,
      stateHandlers: {
        'user 42 exists': () => {
          // Setup: insert user 42 into test DB
          return Promise.resolve('User 42 setup complete');
        },
      },
    };
    return new Verifier(opts).verifyProvider();
  });
});
\`\`\`

The stateHandlers map provider states (referenced via .given() in consumer tests) to setup functions.

## Java (REST Assured + Pact)

Consumer:

\`\`\`java
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service")
class UserConsumerTest {

    @Pact(consumer = "web-app")
    public RequestResponsePact getUser(PactDslWithProvider builder) {
        return builder
            .given("user 42 exists")
            .uponReceiving("a request for user 42")
            .path("/users/42")
            .method("GET")
            .willRespondWith()
            .status(200)
            .body("{\\"id\\": 42, \\"name\\": \\"Alice\\"}")
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "getUser")
    void getUserConsumer(MockServer mockServer) {
        given()
            .baseUri(mockServer.getUrl())
        .when()
            .get("/users/42")
        .then()
            .statusCode(200)
            .body("id", equalTo(42));
    }
}
\`\`\`

Provider:

\`\`\`java
@Provider("user-service")
@PactBroker(host = "broker.example.com", scheme = "https",
            authentication = @PactBrokerAuth(token = "\${PACT_BROKER_TOKEN}"))
class UserProviderTest {
    @LocalServerPort int port;

    @BeforeEach
    void setup(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verify(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("user 42 exists")
    void setupUser42() {
        userRepository.save(new User(42, "Alice", "alice@example.com"));
    }
}
\`\`\`

## Python

\`\`\`bash
pip install pact-python
\`\`\`

\`\`\`python
import atexit
import unittest
from pact import Consumer, Provider

pact = Consumer('web-app').has_pact_with(Provider('user-service'), pact_dir='./pacts')
pact.start_service()
atexit.register(pact.stop_service)

class UserConsumerTest(unittest.TestCase):
    def test_get_user(self):
        expected = {'id': 42, 'name': 'Alice'}

        (pact
            .given('user 42 exists')
            .upon_receiving('a request for user 42')
            .with_request('get', '/users/42')
            .will_respond_with(200, body=expected))

        with pact:
            import requests
            response = requests.get(f'{pact.uri}/users/42')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), expected)
\`\`\`

## Publishing To Broker

\`\`\`bash
pact-broker publish ./pacts \\
  --consumer-app-version=\${GIT_SHA} \\
  --branch=main \\
  --broker-base-url=https://broker.example.com \\
  --broker-token=\${PACT_BROKER_TOKEN}
\`\`\`

## Provider Verification In CI

\`\`\`bash
pact-provider-verifier \\
  --provider=user-service \\
  --provider-base-url=http://localhost:3000 \\
  --pact-broker-base-url=https://broker.example.com \\
  --broker-token=\${PACT_BROKER_TOKEN} \\
  --provider-version=\${GIT_SHA} \\
  --publish-verification-results
\`\`\`

## can-i-deploy

Before deploying, ask the broker if it's safe:

\`\`\`bash
pact-broker can-i-deploy \\
  --pacticipant user-service \\
  --version \${GIT_SHA} \\
  --to-environment production
\`\`\`

Returns exit 0 (safe to deploy) or non-zero (not safe).

## Pactflow vs Self-Hosted Broker

| Aspect | Pact Broker (OSS) | Pactflow (Paid) |
|--------|-------------------|-----------------|
| Cost | Free | Paid SaaS |
| Hosting | Self-hosted | Hosted |
| WebHooks | Yes | Yes |
| Bi-directional contracts | Limited | Yes |
| UI dashboards | Basic | Rich |
| Maintenance | Manual | None |

## CI Pipeline

\`\`\`yaml
name: Pact CI
on: [push, pull_request]

jobs:
  consumer-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:pact
      - run: npx pact-broker publish ./pacts \\
          --consumer-app-version=\${{ github.sha }} \\
          --branch=\${{ github.ref_name }} \\
          --broker-base-url=https://broker.example.com \\
          --broker-token=\${{ secrets.PACT_TOKEN }}

  provider-verify:
    runs-on: ubuntu-latest
    needs: consumer-test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm start &
      - run: sleep 5
      - run: npm run test:pact-provider
        env:
          PACT_BROKER_TOKEN: \${{ secrets.PACT_TOKEN }}
          GIT_SHA: \${{ github.sha }}

  can-i-deploy:
    runs-on: ubuntu-latest
    needs: provider-verify
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npx pact-broker can-i-deploy \\
          --pacticipant user-service \\
          --version \${{ github.sha }} \\
          --to-environment production \\
          --broker-base-url=https://broker.example.com \\
          --broker-token=\${{ secrets.PACT_TOKEN }}
\`\`\`

## Provider States

Provider states are setup conditions referenced from consumer contracts:

\`\`\`javascript
// Consumer
.given('user 42 exists')

// Provider state handler
stateHandlers: {
  'user 42 exists': async () => {
    await db.users.insert({ id: 42, name: 'Alice' });
    return 'Setup done';
  },
  'user 42 does not exist': async () => {
    await db.users.delete({ id: 42 });
    return 'Setup done';
  },
}
\`\`\`

## Versioning

Use semantic versions and Git SHAs:

\`\`\`bash
pact-broker publish ./pacts --consumer-app-version=1.2.3+\${GIT_SHA}
\`\`\`

Tag releases with environment names:

\`\`\`bash
pact-broker create-version-tag \\
  --pacticipant user-service \\
  --version 1.2.3 \\
  --tag production
\`\`\`

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Mocking instead of contract | Test through your client code |
| Embedding business logic in contract | Use matchers for flexibility |
| Sharing contracts across consumers | Each consumer owns its contract |
| Not pushing verification results | Always --publish-verification-results |
| Forgetting can-i-deploy | Gate deploys on it |

## When To Use Pact

- Microservices with multiple consumers per provider
- Cross-team API contracts
- Reducing brittle end-to-end tests
- Versioning APIs across deployments
- Backwards compatibility verification

## When Not To Use Pact

- Public APIs with unknown consumers
- One-team monoliths (overkill)
- GraphQL-only systems (use schema diffs)
- Event-driven (use Pact Async for AMQP/Kafka)

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Testing all fields with exact match | Use like() for flexibility |
| Provider knows about consumer | Consumer drives the contract |
| Consumer tests against real provider | Consumer tests against Pact mock |
| Skipping broker | Use broker for collaboration |
| No CI integration | Always publish and verify in CI |

## Real Workflow

A 50-engineer e-commerce company with 20 microservices:

1. Each consumer team writes Pact tests in their service repo
2. CI publishes contracts to Pactflow on every PR
3. Provider team CI pulls contracts and verifies on every PR
4. Provider deployment gated on can-i-deploy passing
5. Pactflow dashboard shows the dependency graph across services
6. End-to-end tests reduced from hundreds to dozens (only critical paths)

## Conclusion

Pact contract testing is the most important investment a microservices organization can make in test infrastructure. By replacing slow, brittle end-to-end tests with fast, deterministic contract tests, teams can deploy independently with high confidence. The initial setup is non-trivial - you need a broker, provider state handlers, and CI integration - but the long-term gains are massive: faster CI, fewer integration bugs, and clear ownership of contracts.

Start with one consumer/provider pair where you currently have flaky integration tests. Replace those tests with Pact. Stand up a broker (Pactflow free tier or self-hosted Docker). Wire CI to publish and verify. Within a quarter you'll have a model for the rest of the organization to follow. Visit our [skills directory](/skills) or the [API contract testing microservices guide](/blog/api-contract-testing-microservices) for adjacent reading.
`,
};
