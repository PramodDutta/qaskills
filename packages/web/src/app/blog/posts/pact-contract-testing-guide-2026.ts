import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact Contract Testing: A Complete Consumer-Driven Guide (2026)',
  description:
    'Master Pact consumer-driven contract testing in 2026: write consumer tests, verify providers, run a Pact Broker, and gate deploys with can-i-deploy in CI.',
  date: '2026-06-23',
  category: 'Guide',
  content: `
# Pact Contract Testing: A Complete Consumer-Driven Guide (2026)

If you build microservices, you have probably felt the pain: a provider team ships a "harmless" change to a JSON field, every consumer integration test passes in isolation, and then production breaks at 2 a.m. because the API a downstream service depended on quietly changed shape. Unit tests do not catch it because they mock the network. End-to-end tests might catch it, but only if you spin up every service together, in the right versions, in a shared environment that is slow, flaky, and expensive to maintain. There is a whole class of bugs that lives in the gap between "my service works alone" and "everything works together." That gap is exactly what contract testing fills, and **Pact** is the most widely adopted consumer-driven contract testing tool in 2026.

This guide is a practical, end-to-end walkthrough of Pact for a real microservices workflow. We will explain what contract testing actually solves, why "consumer-driven" matters, and how Pact's two-phase model works: the consumer generates a contract (a "pact") from its own expectations, and the provider verifies that it can satisfy that contract. We will write a runnable Pact JS consumer test against a mock provider, look at the generated pact file, verify it on the provider side, then connect everything through a **Pact Broker** with versioning, webhooks, \`can-i-deploy\` deployment gating, and pending/WIP pacts so you can roll Pact out without blocking teams. We will compare Pact to Spring Cloud Contract and OpenAPI/schema testing, cover message and event-driven contracts, wire it into CI/CD, and close with the pitfalls that bite teams in real life. By the end you should be able to add Pact to a consumer and a provider, publish to a broker, and safely gate a deploy.

## What Contract Testing Solves: The Integration-Test Gap

Most test suites have two ends and a hole in the middle. **Unit tests** verify a single function or class with all collaborators mocked. They are fast and deterministic, but they prove nothing about how two deployed services talk to each other. **End-to-end (E2E) tests** stand up the whole system and exercise real flows. They are the most realistic, but they are slow, flaky, hard to debug, and they scale terribly: with N services, the number of integration combinations explodes, and a single team cannot reason about the whole topology.

In between sits the **integration boundary** — the actual HTTP request a consumer sends and the response a provider returns. This is where most cross-team breakages happen, and it is exactly what neither unit nor E2E tests cover cheaply. Contract testing targets this boundary directly. Instead of testing "does the whole system work," it tests a far more tractable question: **does the consumer's expectation of the API still match what the provider actually delivers?**

The key insight is that you do not need both services running at the same time. The consumer records what it expects in a contract; the provider replays that contract against itself. Each side tests independently, in its own pipeline, at unit-test speed. You get most of the integration confidence of E2E tests without the combinatorial cost, the shared environments, or the flakiness. For a broader treatment of where this fits, see our [microservices testing strategies](/blog/microservices-testing-strategies) guide.

## Consumer-Driven Contracts Explained

There are two broad philosophies for contract testing. In a **provider-driven** approach, the provider publishes a specification (often an OpenAPI document) and consumers are expected to conform to it. In a **consumer-driven** approach — the model Pact uses — the contract is generated from what consumers actually need, and the provider must satisfy the union of all consumer expectations.

Consumer-driven contracts (CDC) flip the usual direction of authority. The consumer says, in effect: "When I send this request, I expect a response that contains at least these fields with these types." Crucially, the consumer only asserts on the parts of the response it actually uses. If the provider returns 30 fields but the consumer reads 4, the contract covers only those 4. This is powerful: it means the provider can freely add fields, reorder them, or change parts no consumer touches, without breaking anyone. The contract encodes real coupling, not aspirational schema completeness.

This also changes team dynamics in a healthy way. Providers get a precise, machine-checkable list of what every consumer depends on. Before deleting a field or tightening a type, a provider can look at the aggregated contracts and know exactly who will break. That conversation happens in CI, before deploy — not in an incident channel afterward.

## How Pact Works: Two Phases

Pact splits contract testing into two phases that run in separate pipelines:

1. **Consumer phase (generation).** In the consumer's test suite, you describe expected interactions against a **mock provider** that Pact spins up locally. Your real consumer client code makes requests to this mock. When the tests pass, Pact writes a **pact file** — a JSON document describing every request/response interaction your consumer relies on.

2. **Provider phase (verification).** The pact file is handed to the provider (directly, or via a Pact Broker). The provider runs a **verifier** that replays each recorded request against the real provider service and checks that the actual response matches the contract. If it does, the provider is "compatible" with that consumer version.

The pact file is the artifact that links the two. Neither side ever needs the other running. The consumer trusts the mock; the verifier guarantees the mock was an honest stand-in for the real provider. The table below clarifies who owns what.

| Concern | Consumer responsibility | Provider responsibility |
| --- | --- | --- |
| Defining expectations | Declares interactions (request + minimal expected response) | None — receives them |
| Running tests | Tests its client against Pact's mock provider | Replays interactions against the real service |
| Generating the contract | Produces the pact file | Consumes the pact file |
| Provider state setup | Names required states (e.g. "user 123 exists") | Implements state handlers to set up data |
| Publishing | Publishes pact + version + git SHA to broker | Publishes verification results to broker |
| Deployment safety | Calls \`can-i-deploy\` before release | Calls \`can-i-deploy\` before release |

## Writing a Consumer Test (Pact JS)

Let's write a real consumer test using \`@pact-foundation/pact\` and the V3/V4 \`PactV3\` API, which is the recommended interface in 2026. Imagine an \`orders-ui\` service that calls an \`orders-api\` provider to fetch an order by id.

\`\`\`javascript
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike, integer, string } = MatchersV3;
const axios = require('axios');

// The consumer's real client code under test
async function getOrder(baseUrl, id) {
  const res = await axios.get(\`\${baseUrl}/orders/\${id}\`);
  return res.data;
}

const provider = new PactV3({
  consumer: 'orders-ui',
  provider: 'orders-api',
  dir: './pacts',
});

describe('orders-api contract', () => {
  it('returns an order when it exists', async () => {
    provider
      .given('an order with id 123 exists')
      .uponReceiving('a request for order 123')
      .withRequest({
        method: 'GET',
        path: '/orders/123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({
          id: integer(123),
          status: string('CONFIRMED'),
          total: like(49.99),
          items: eachLike({
            sku: string('SKU-001'),
            qty: integer(2),
          }),
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const order = await getOrder(mockServer.url, 123);

      expect(order.id).toBe(123);
      expect(order.status).toBe('CONFIRMED');
      expect(Array.isArray(order.items)).toBe(true);
      expect(order.items[0].sku).toBeDefined();
    });
  });
});
\`\`\`

Notice three things. First, \`.given(...)\` declares a **provider state** — a precondition the provider must set up before verification (we will use it later). Second, the request is described declaratively with \`.withRequest(...)\` and \`.willRespondWith(...)\`. Third, \`executeTest\` starts the mock server, gives you its URL, runs your real client against it, and tears it down. If your client sends a request the contract did not describe, the mock fails the test — so the contract stays honest.

Run it with your normal test runner (Jest, Vitest, Mocha). If you are new to JavaScript test runners, our [API testing complete guide](/blog/api-testing-complete-guide) covers the basics of asserting on HTTP responses.

## The Generated Pact File

When the consumer test passes, Pact writes \`./pacts/orders-ui-orders-api.json\`. A trimmed version looks like this:

\`\`\`json
{
  "consumer": { "name": "orders-ui" },
  "provider": { "name": "orders-api" },
  "interactions": [
    {
      "description": "a request for order 123",
      "providerStates": [{ "name": "an order with id 123 exists" }],
      "request": {
        "method": "GET",
        "path": "/orders/123",
        "headers": { "Accept": "application/json" }
      },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": {
          "id": 123,
          "status": "CONFIRMED",
          "total": 49.99,
          "items": [{ "sku": "SKU-001", "qty": 2 }]
        },
        "matchingRules": {
          "body": {
            "$.id": { "matchers": [{ "match": "integer" }] },
            "$.status": { "matchers": [{ "match": "type" }] },
            "$.items": { "matchers": [{ "match": "type", "min": 1 }] }
          }
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "3.0.0" } }
}
\`\`\`

The interesting part is \`matchingRules\`. The example values (\`123\`, \`"CONFIRMED"\`) are just samples; the matchers say "any integer," "any string," "an array of at least one item shaped like this." That is what makes a pact robust: it does not pin the provider to literal values it was never meant to guarantee. This file is the contract you publish and verify against.

## Provider Verification

On the provider side, the verifier replays each interaction against the running provider and checks the responses. Using the JS \`Verifier\`:

\`\`\`javascript
const { Verifier } = require('@pact-foundation/pact');
const app = require('../src/app'); // your real Express/Fastify app
let server;

beforeAll(() => {
  server = app.listen(8080);
});
afterAll(() => server.close());

describe('Pact provider verification', () => {
  it('validates the orders-api contract', () => {
    return new Verifier({
      provider: 'orders-api',
      providerVersion: process.env.GIT_COMMIT,
      providerBaseUrl: 'http://localhost:8080',

      // Fetch pacts from the broker instead of local files in CI
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      consumerVersionSelectors: [{ mainBranch: true }, { deployedOrReleased: true }],
      publishVerificationResult: true,

      // Provider states: set up data the contract requires
      stateHandlers: {
        'an order with id 123 exists': async () => {
          await db.orders.upsert({ id: 123, status: 'CONFIRMED', total: 49.99 });
        },
      },
    }).verifyProvider();
  });
});
\`\`\`

The \`stateHandlers\` map is how provider states from \`.given(...)\` get realized: before replaying the matching interaction, Pact calls the handler so the database (or mocks) are in the expected state. \`publishVerificationResult: true\` reports back to the broker whether this provider version satisfies each consumer's contract — which is what powers \`can-i-deploy\` later. For local development you can point at \`pactUrls: ['./pacts/orders-ui-orders-api.json']\` instead of the broker.

## The Pact Broker: Publishing, Versioning, Webhooks

Passing files around by hand does not scale. The **Pact Broker** (self-hosted open source, or the hosted **PactFlow** SaaS) is the central exchange where consumers publish pacts and providers publish verification results. It tracks which versions are compatible, draws a network graph of your services, and exposes the data \`can-i-deploy\` needs.

Publish a pact from the consumer pipeline with the Pact CLI:

\`\`\`bash
pact-broker publish ./pacts \\
  --consumer-app-version "\${GIT_COMMIT}" \\
  --branch "\${GIT_BRANCH}" \\
  --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
  --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

Always use the **git commit SHA** as the application version and pass the branch. The broker keys everything off versions, so meaningful, unique versions are what make \`can-i-deploy\` trustworthy. **Webhooks** close the loop: when a consumer publishes a new pact (a \`contract_content_changed\` event), a broker webhook can trigger the provider's verification build automatically, so the provider always learns about new expectations without manual coordination. The same works in reverse to notify consumers when verification results change.

## can-i-deploy and Deployment Gating

This is the payoff. Before you deploy a service to an environment, you ask the broker a single question: *given everything I integrate with, is the version I am about to ship compatible with what is already deployed there?* That question is \`can-i-deploy\`:

\`\`\`bash
pact-broker can-i-deploy \\
  --pacticipant orders-ui \\
  --version "\${GIT_COMMIT}" \\
  --to-environment production \\
  --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
  --broker-token "\${PACT_BROKER_TOKEN}" \\
  --retry-while-unknown 6 \\
  --retry-interval 10
\`\`\`

It exits \`0\` (and prints a compatibility matrix) only if every relevant contract between your version and the currently deployed counterparts has been verified successfully. If a provider has not yet verified your new pact, \`--retry-while-unknown\` waits for the verification build to finish rather than failing immediately. After a successful deploy, record it so the broker knows what is actually live:

\`\`\`bash
pact-broker record-deployment \\
  --pacticipant orders-ui \\
  --version "\${GIT_COMMIT}" \\
  --environment production \\
  --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
  --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

Putting \`can-i-deploy\` between "tests passed" and "deploy" turns contract testing from a nice report into an actual safety gate. A breaking change physically cannot reach production unless every dependency has been verified against it.

## Pending Pacts and WIP Pacts

The first objection teams raise is: "If a consumer adds a new expectation, won't it instantly break the provider's build?" That is what **pending pacts** and **WIP (work-in-progress) pacts** solve, and they are the secret to a non-disruptive rollout.

With **pending pacts** enabled (\`enablePending: true\` in the verifier), a pact that has never been successfully verified by the provider is verified *but does not fail the provider build* if it fails. The provider sees the new expectation as feedback ("heads up, a consumer wants this") without being blocked from deploying. Once the provider implements the change and verification passes, the pact graduates out of pending and any future regression *will* fail the build.

**WIP pacts** go further: they automatically include pacts from the consumer's feature branches that the provider has not seen, so a provider proactively gets early warning about changes still in development. Together these let consumer and provider teams move at independent speeds. New contracts flow in as non-blocking signals first, then become hard gates once both sides agree.

## Matchers: like, eachLike, regex, and More

Matchers are what separate a brittle contract from a durable one. Instead of asserting exact values, you assert **shape and type**. The common Pact JS matchers:

- **\`like(example)\`** / **\`type(example)\`** — match any value of the same type as the example. \`like(42)\` matches any number, \`like("x")\` any string.
- **\`eachLike(example, { min })\`** — match an array where every element has the shape of \`example\`. \`min\` sets the minimum length (default 1) so the provider must return at least that many during verification.
- **\`integer()\`**, **\`number()\`**, **\`decimal()\`**, **\`boolean()\`**, **\`string()\`** — primitive type matchers.
- **\`regex(pattern, example)\`** — match a string against a regular expression, e.g. \`regex('\\\\d{4}-\\\\d{2}-\\\\d{2}', '2026-06-23')\` for an ISO date.
- **\`datetime(format, example)\`** and **\`uuid()\`** — common specialized matchers.

\`\`\`javascript
const { like, eachLike, integer, regex } = MatchersV3;

body: like({
  orderId: integer(123),
  createdAt: regex('\\\\d{4}-\\\\d{2}-\\\\d{2}T.*', '2026-06-23T10:00:00Z'),
  lineItems: eachLike({ sku: regex('SKU-\\\\d+', 'SKU-001') }, { min: 1 }),
})
\`\`\`

The rule of thumb: assert types and formats, not literal values, and assert *only the fields your consumer actually reads*. Over-asserting couples you to provider details you do not depend on and creates false breakages.

## Pact vs Spring Cloud Contract vs OpenAPI/Schema Testing

Pact is not the only option. The right tool depends on your stack and how you want authority to flow.

| Dimension | Pact | Spring Cloud Contract | OpenAPI / schema testing |
| --- | --- | --- | --- |
| Contract direction | Consumer-driven | Provider-driven (consumer-aware) | Provider-driven (spec-first) |
| Primary ecosystem | Polyglot (JS, JVM, .NET, Go, Python, Ruby) | JVM / Spring-centric | Any (HTTP + OpenAPI) |
| Contract artifact | Pact JSON generated from consumer tests | Groovy/YAML contracts + generated stubs | OpenAPI document |
| Who verifies | Provider replays consumer pacts | Provider tests generated from contracts | Validate responses against schema |
| Captures real usage | Yes — only fields consumers use | Partially | No — whole schema, no usage signal |
| Deployment gating | \`can-i-deploy\` via broker | Manual / custom | Manual / custom |
| Async messaging support | Yes (message pacts) | Yes | Limited (AsyncAPI separately) |

In short: choose **Pact** when you have many independent consumer teams and want consumer-driven contracts with broker-based deployment gating across a polyglot fleet. Choose **Spring Cloud Contract** if you are deeply in the Spring ecosystem and prefer provider-authored contracts that also generate consumer stubs. Use **OpenAPI/schema validation** as a complement — it is excellent for documentation and for catching gross schema violations, but it tells you nothing about which fields are actually depended upon. Many teams run both: OpenAPI for the published spec, Pact for the real coupling. See our [API contract testing for microservices](/blog/api-contract-testing-microservices) deep dive for more on combining these.

## Message and Event-Driven Contracts

Contract testing is not just for synchronous HTTP. In event-driven systems, a producer publishes a message to a queue or topic and a consumer processes it — and the *message body* is a contract too. Pact supports **message pacts** for exactly this. Instead of describing requests and responses, the consumer describes the message it expects to handle, and the provider verifies that the function which produces messages emits something matching that contract.

\`\`\`javascript
const { MessageConsumerPact, MatchersV3 } = require('@pact-foundation/pact');
const { like, integer } = MatchersV3;

const messagePact = new MessageConsumerPact({
  consumer: 'inventory-service',
  provider: 'orders-events',
  dir: './pacts',
});

it('handles an OrderCreated event', () => {
  return messagePact
    .expectsToReceive('an OrderCreated event')
    .withContent(like({ orderId: integer(123), sku: 'SKU-001', qty: integer(2) }))
    .verify(async (message) => {
      // your real message handler
      await handleOrderCreated(message.contents);
    });
});
\`\`\`

The contract here covers the *payload shape* the consumer relies on, decoupled from the transport (Kafka, SQS, RabbitMQ). The provider then verifies that its event-producing code emits a matching message. This brings the same independent, broker-gated safety to async architectures that synchronous pacts bring to REST. The principles also extend to other protocols — see our [GraphQL testing complete guide](/blog/graphql-testing-complete-guide) for contract considerations in GraphQL APIs.

## Wiring Pact Into CI/CD

A mature Pact setup has distinct jobs in both pipelines. Here is a GitHub Actions sketch for the consumer:

\`\`\`yaml
jobs:
  consumer-contract:
    runs-on: ubuntu-latest
    env:
      PACT_BROKER_BASE_URL: \${{ secrets.PACT_BROKER_BASE_URL }}
      PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
      GIT_COMMIT: \${{ github.sha }}
      GIT_BRANCH: \${{ github.ref_name }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:pact            # generates ./pacts
      - run: |
          npx pact-broker publish ./pacts \\
            --consumer-app-version "\${GIT_COMMIT}" \\
            --branch "\${GIT_BRANCH}" \\
            --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
            --broker-token "\${PACT_BROKER_TOKEN}"
      - run: |
          npx pact-broker can-i-deploy \\
            --pacticipant orders-ui \\
            --version "\${GIT_COMMIT}" \\
            --to-environment production \\
            --retry-while-unknown 6 --retry-interval 10 \\
            --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
            --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

The provider pipeline mirrors this: run the verifier (which publishes results), then \`can-i-deploy\`, then \`record-deployment\` after release. A broker webhook ties them together so publishing a new consumer pact triggers provider verification automatically. For a general CI/CD foundation to build on, our [CI/CD testing pipeline with GitHub Actions](/blog/cicd-testing-pipeline-github-actions) guide walks through the pipeline mechanics.

## Pitfalls and Best Practices

A few lessons that consistently separate smooth Pact adoptions from painful ones:

- **Use the git SHA as the application version, always.** Reused or ambiguous versions corrupt the compatibility matrix and make \`can-i-deploy\` lie.
- **Only assert on fields you consume.** Over-specifying the response couples you to provider internals and generates false breakages. Let matchers handle types, not literals.
- **Do not test business logic with Pact.** Pact verifies the *shape and protocol* of the conversation, not whether the provider's computation is correct. Keep functional assertions in unit/integration tests.
- **Implement provider states carefully.** State handlers must set up exactly the data each interaction needs, and clean up after. Leaky state is a top cause of flaky provider verification.
- **Roll out with pending + WIP pacts on.** Never make a new consumer expectation an instant hard gate. Let it flow in as non-blocking feedback first.
- **Treat the broker as production infrastructure.** Back it up, secure it with tokens, and monitor it — your deploy gate depends on it being available.
- **Avoid contract bloat.** A consumer should publish one focused pact per provider, not dozens of near-duplicate interactions. Curate.

Follow these and Pact becomes a quiet, reliable safety net rather than a source of CI noise.

## Frequently Asked Questions

### What is the difference between contract testing and integration testing?
Integration testing typically runs two or more real services together and exercises flows end to end, which is slow and requires a shared environment. Contract testing checks only the boundary — the request/response shape between a consumer and provider — and lets each side test independently against a recorded contract, so you get most of the integration confidence at unit-test speed without standing up the whole system.

### Is Pact only for REST APIs?
No. Pact supports synchronous HTTP (REST and HTTP-based RPC) and asynchronous **message pacts** for event-driven systems using Kafka, SQS, RabbitMQ, and similar. Message pacts verify the payload shape a consumer expects against the messages a provider actually produces, bringing the same broker-gated safety to queues and topics that HTTP pacts bring to REST endpoints.

### Do I still need end-to-end tests if I use Pact?
Usually yes, but far fewer. Pact verifies that services agree on the API contract, not that a full business workflow behaves correctly across many hops. Keep a small suite of critical-path E2E tests for the highest-value journeys, and let contract tests cover the breadth of integration points that E2E tests are too slow and brittle to cover exhaustively.

### What does can-i-deploy actually check?
\`can-i-deploy\` asks the Pact Broker whether the specific version you intend to deploy is compatible with the versions currently deployed in the target environment. It passes only if every relevant contract between your version and its counterparts has a successful verification result. This makes it a real deployment gate: a breaking change cannot reach the environment until all dependencies have verified against it.

### What are pending and WIP pacts for?
They let you adopt Pact without instantly breaking provider builds. A **pending pact** is verified but does not fail the provider's build the first time it appears, so a new consumer expectation arrives as feedback rather than a blocker. **WIP pacts** automatically pull in pacts from consumer feature branches the provider has not seen, giving providers early warning of in-progress changes.

### Pact vs OpenAPI — should I pick one?
They solve different problems and pair well. OpenAPI is a provider-authored spec that is great for documentation and catching gross schema violations, but it does not capture which fields consumers actually use. Pact captures real consumer usage and adds deployment gating via the broker. Many teams publish an OpenAPI spec for documentation and run Pact for the actual coupling and safety gate.

### How do I handle provider states in Pact?
Provider states are preconditions a consumer declares with \`.given(...)\`, such as "an order with id 123 exists." On the provider side you register \`stateHandlers\` that set up exactly that data (seed the database, configure mocks) before Pact replays the matching interaction. Keep handlers focused and clean up afterward, since leaky or incomplete state is one of the most common causes of flaky provider verification.

### Can Pact replace my unit tests?
No. Pact verifies the shape and protocol of the conversation between services — it does not check that your business logic computes the right answer. You still need unit tests for internal logic and edge cases, and integration tests for database and framework wiring. Pact complements them by covering the cross-service boundary that unit tests deliberately mock away.

## Conclusion

Contract testing fills the most expensive gap in microservices testing: the integration boundary that unit tests mock away and E2E tests cover too slowly to scale. Pact makes that boundary explicit and checkable. The consumer records exactly what it depends on in a pact, the provider verifies it can deliver, the broker tracks compatibility across versions, and \`can-i-deploy\` turns all of it into a real safety gate that blocks breaking changes before they ship. Add pending and WIP pacts and you can roll this out across independent teams without grinding anyone's pipeline to a halt.

Start small: pick one consumer/provider pair, write a single consumer test against the mock, verify it on the provider, stand up a broker, and put \`can-i-deploy\` in front of one deploy. Once you feel the difference, expand outward. To go deeper on related testing skills and ready-to-use agent skills for your QA workflow, explore the full [QA skills directory](/skills), and pair this with our guides on [API contract testing for microservices](/blog/api-contract-testing-microservices) and overall [microservices testing strategies](/blog/microservices-testing-strategies).
`,
};
