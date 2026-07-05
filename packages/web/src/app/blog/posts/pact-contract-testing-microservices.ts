import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact Contract Testing for Microservices: A Practical Guide',
  description:
    'A hands-on guide to Pact contract testing for microservices: consumer-driven contracts, provider verification, Pact Broker, can-i-deploy gates, and real JS/TS code.',
  date: '2026-07-05',
  category: 'Guide',
  content: `
# Pact Contract Testing for Microservices: A Practical Guide

Microservices trade one big deployment problem for many small integration problems. The moment you split a monolith into services that talk over HTTP or messaging, you inherit a new risk: a provider service changes a field name, drops a property, or tightens a validation rule, and a consumer service that depended on the old shape breaks in production. The traditional answer is end-to-end testing, spinning up every service together and driving requests through the whole graph. That works until it doesn't. E2E suites across microservices are slow, flaky, expensive to maintain, and they fail late, after both services are already deployed to a shared environment. By the time the E2E test goes red, the breaking change has already merged. Contract testing solves this earlier and cheaper by verifying the agreement between two services in isolation, before either one ships.

This guide is a practical, code-first walkthrough of contract testing with Pact, the most widely used consumer-driven contract testing framework. You will learn what problem contract testing actually solves, the core Pact concepts (consumer, provider, pact file, Pact Broker, and the \`can-i-deploy\` gate), how to write a consumer test in TypeScript that generates a pact file, how to verify that contract on the provider side, how to publish contracts to a Pact Broker, how to wire the \`can-i-deploy\` check into CI so a breaking change cannot merge, how provider states work, the difference between HTTP pacts and message pacts, and, importantly, when you should not reach for Pact at all. Every example is runnable JavaScript or TypeScript using \`@pact-foundation/pact\`. If you want the conceptual foundations of contracts across services first, read our companion piece on [API contract testing for microservices](/blog/api-contract-testing-microservices).

## What Contract Testing Solves

Consider two services: a \`web-frontend\` (the consumer) that calls a \`user-service\` (the provider) to fetch \`GET /users/123\`. The consumer expects a JSON body with \`id\`, \`name\`, and \`email\`. One sprint later, a provider developer renames \`email\` to \`emailAddress\` because it reads better. Every unit test on the provider still passes: the field is renamed consistently, the code is internally correct. Every unit test on the consumer still passes too, because the consumer mocks the provider response and the mock was never updated. Both teams merge, both deploy, and production breaks, because the mock lied.

The root cause is that the mock on the consumer side and the real response on the provider side are two independent copies of the same assumption, and nothing keeps them in sync. Contract testing fixes exactly this. The consumer's expectations become a shared, machine-readable artifact (the pact file), and the provider is forced to verify against it. If the provider renames \`email\`, provider verification fails immediately, in the provider's own pipeline, before it can deploy. The breaking change is caught at the source.

Crucially, contract tests run in isolation. The consumer test does not need a real provider running; it runs against a Pact mock server. The provider verification does not need the real consumer; it replays the recorded interactions. This is what makes contract testing fast and stable where E2E is slow and flaky.

## Consumer-Driven Contracts

Pact is **consumer-driven**, which is a specific and important choice. In consumer-driven contract testing, the consumer defines what it needs, and only what it needs, and the provider promises to keep providing it. The consumer does not test the provider's entire API; it tests only the fields and endpoints it actually uses.

This has two big consequences. First, providers get a precise map of what their real consumers depend on. If no consumer's contract references a field, the provider is free to change or remove it without fear. Second, contracts stay small and focused. A consumer that only reads \`id\` and \`name\` writes a contract about \`id\` and \`name\`; it does not care that the provider also returns \`createdAt\` and \`preferences\`. This keeps contracts from becoming brittle mirrors of the full API and lets providers evolve freely everywhere no consumer is looking.

The alternative, provider-driven contracts (where the provider publishes a schema and consumers conform), exists too, but Pact's model is consumer-driven, and that is what we use throughout this guide.

## Core Pact Concepts

A handful of terms carry the whole workflow. Learn these and the rest follows.

| Term | Meaning |
|---|---|
| Consumer | The service that initiates a request and depends on the response shape. |
| Provider | The service that receives the request and returns the response. |
| Interaction | A single request/response pair the consumer expects. |
| Pact file | A JSON document of all interactions a consumer expects from one provider. |
| Pact mock server | A local server that stands in for the provider during the consumer test. |
| Pact Broker | A central service that stores pact files and verification results and answers deployment questions. |
| Provider verification | Replaying the pact's interactions against the real provider to confirm it still holds. |
| Provider state | A named precondition the provider sets up before an interaction (e.g. "user 123 exists"). |
| can-i-deploy | A CLI/API check that asks the broker whether a version is safe to deploy given all contracts. |

The flow is: the consumer test generates a pact file, the file is published to the broker, the provider pulls it and verifies against its real implementation, verification results go back to the broker, and \`can-i-deploy\` reads those results to gate deployments. Everything else is detail.

## Writing a Consumer Test

Install the library and write a consumer test. The test starts a Pact mock server, declares the interaction you expect, points your real client code at the mock, and asserts the client behaves correctly. When the test passes, Pact writes a pact file.

\`\`\`bash
npm install --save-dev @pact-foundation/pact
\`\`\`

\`\`\`typescript
// test/user-client.consumer.spec.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

const { like, string } = MatchersV3;

const provider = new PactV3({
  consumer: 'web-frontend',
  provider: 'user-service',
  dir: path.resolve(process.cwd(), 'pacts'),
});

// The real client code under test
async function getUser(baseUrl: string, id: number) {
  const res = await axios.get(\\\`\\\${baseUrl}/users/\\\${id}\\\`);
  return res.data;
}

describe('user-service consumer contract', () => {
  it('returns a user by id', async () => {
    provider
      .given('user 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest({ method: 'GET', path: '/users/123' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: like(123),
          name: string('Ada Lovelace'),
          email: string('ada@example.com'),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const user = await getUser(mockServer.url, 123);
      expect(user.name).toBe('Ada Lovelace');
      expect(user.email).toBe('ada@example.com');
    });
  });
});
\`\`\`

Two things deserve attention. First, the matchers: \`like(123)\` and \`string('Ada Lovelace')\` tell Pact to match on type, not exact value. The contract says "id is a number, name is a string," so the provider passes verification as long as it returns the right types, not the literal example values. Using matchers instead of hardcoded values is the single most important habit for writing non-brittle contracts. Second, \`given('user 123 exists')\` declares a provider state, which the provider must set up before verification. Running this test writes \`pacts/web-frontend-user-service.json\`.

## Verifying on the Provider Side

The provider pulls the pact file and replays every interaction against its real, running service. If any response does not match, verification fails.

\`\`\`typescript
// test/user-service.provider.spec.ts
import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { app, seedUser, clearUsers } from '../src/server';

describe('user-service provider verification', () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(8080);
  });
  afterAll(() => server.close());

  it('honours the web-frontend contract', () => {
    return new Verifier({
      provider: 'user-service',
      providerBaseUrl: 'http://localhost:8080',
      pactUrls: [
        path.resolve(process.cwd(), 'pacts', 'web-frontend-user-service.json'),
      ],
      stateHandlers: {
        'user 123 exists': async () => {
          await clearUsers();
          await seedUser({ id: 123, name: 'Ada Lovelace', email: 'ada@example.com' });
        },
      },
    }).verifyProvider();
  });
});
\`\`\`

The \`stateHandlers\` map is where provider states come alive: for each named state the consumer declared, you write a function that puts the provider into that state, usually by seeding the database. Before Pact replays "a request for user 123," it runs the \`user 123 exists\` handler to seed that user. This is how the provider verifies against realistic data without the consumer ever knowing how the provider stores it.

## Publishing to a Pact Broker

Passing a pact file around by hand does not scale. The Pact Broker is a central service that stores contracts and verification results, versions them by application and git commit, and answers the deployment question. You can self-host it with Docker or use the hosted PactFlow.

\`\`\`bash
# Run a broker locally
docker run -d --name pact-broker -p 9292:9292 \\
  -e PACT_BROKER_DATABASE_URL=postgres://user:pass@host/pactbroker \\
  pactfoundation/pact-broker
\`\`\`

Publish the consumer's pact using the Pact CLI, tagging it with the version and branch:

\`\`\`bash
npx pact-broker publish ./pacts \\
  --consumer-app-version=\\\$(git rev-parse --short HEAD) \\
  --branch=main \\
  --broker-base-url=http://localhost:9292
\`\`\`

On the provider side, instead of reading the pact from a local file, fetch it from the broker so you always verify the latest contract, and publish the verification result back:

\`\`\`typescript
new Verifier({
  provider: 'user-service',
  providerBaseUrl: 'http://localhost:8080',
  pactBrokerUrl: 'http://localhost:9292',
  publishVerificationResult: true,
  providerVersion: process.env.GIT_SHA,
  consumerVersionSelectors: [{ mainBranch: true }],
  stateHandlers: { /* ... as above ... */ },
}).verifyProvider();
\`\`\`

Now the broker knows both sides: which consumer versions expect what, and which provider versions have verified them. That two-sided knowledge is what powers the deployment gate.

## The can-i-deploy Gate in CI

\`can-i-deploy\` is the payoff. Before deploying a service, you ask the broker: given all the contracts and verification results it knows about, is this version compatible with everything already in the target environment? If the answer is no, the deploy is blocked.

\`\`\`bash
# In the provider or consumer deploy pipeline, before shipping:
npx pact-broker can-i-deploy \\
  --pacticipant=user-service \\
  --version=\\\$(git rev-parse --short HEAD) \\
  --to-environment=production \\
  --broker-base-url=http://localhost:9292 \\
  --retry-while-unknown=6 \\
  --retry-interval=10
\`\`\`

Wired into GitHub Actions, the gate looks like this:

\`\`\`yaml
# .github/workflows/deploy.yml
- name: Contract compatibility gate
  run: |
    npx pact-broker can-i-deploy \\
      --pacticipant=user-service \\
      --version=\\\${{ github.sha }} \\
      --to-environment=production \\
      --broker-base-url=\\\${{ secrets.PACT_BROKER_URL }}
  # A non-zero exit here fails the job and blocks the deploy.
\`\`\`

If a provider change would break a consumer whose contract has not been re-verified, \`can-i-deploy\` returns a non-zero exit code and the pipeline stops. The breaking change is caught before deployment, in the deploying service's own pipeline, which is exactly where you want the failure to happen. This gate is the reason to adopt Pact; without it you have contracts but no enforcement.

## Provider States in Depth

Provider states deserve a closer look because they are where teams most often stumble. A provider state is a named precondition, declared by the consumer with \`given(...)\` and implemented by the provider in a \`stateHandlers\` map. The consumer says "for this interaction, assume user 123 exists"; the provider decides how to make that true.

Keep states coarse and behavioral, not implementation-specific. \`given('user 123 exists')\` is good. \`given('row with id 123 in the users table with email column set')\` leaks the provider's storage into the contract and makes the contract brittle. States can also carry parameters:

\`\`\`typescript
// Consumer
provider.given('a user exists', { id: 123, name: 'Ada' });

// Provider handler receives the params
stateHandlers: {
  'a user exists': async (params) => {
    await seedUser({ id: params.id, name: params.name, email: 'x@example.com' });
  },
}
\`\`\`

Parameterized states let one handler serve many interactions and keep the provider's setup logic in one place. Always reset state between interactions (clear the table, then seed) so one interaction's data never bleeds into the next.

## Message Pacts vs HTTP Pacts

Everything so far assumed synchronous HTTP. But microservices also communicate asynchronously through message brokers like Kafka, RabbitMQ, or SQS, and Pact supports those too, through **message pacts**. The idea is the same, but the unit of the contract is a message rather than a request/response pair.

In a message pact, the consumer is the message handler (the code that processes a message), and the provider is the producer that emits it. The consumer test asserts that its handler can process a message of the expected shape; the provider test asserts that its producer emits a message matching that shape. Neither test touches the real broker; Pact verifies the message body and metadata directly.

\`\`\`typescript
import { MessageConsumerPact, MatchersV3 } from '@pact-foundation/pact';
const { like } = MatchersV3;

const messagePact = new MessageConsumerPact({
  consumer: 'order-processor',
  provider: 'order-events',
  dir: './pacts',
});

// The handler under test
const handleOrderCreated = (msg: any) => {
  if (!msg.orderId) throw new Error('missing orderId');
  return { processed: true };
};

describe('order-created message contract', () => {
  it('processes an order-created event', () => {
    return messagePact
      .expectsToReceive('an order-created event')
      .withContent({ orderId: like('ord-1'), total: like(4200) })
      .verify(async (message) => {
        const result = handleOrderCreated(message.contents);
        expect(result.processed).toBe(true);
      });
  });
});
\`\`\`

The workflow (broker, verification, \`can-i-deploy\`) is identical; only the interaction shape differs. Reach for message pacts whenever the integration is event-driven rather than request/response.

## When Not to Use Pact

Contract testing is a sharp tool, not a universal one. Using it in the wrong place adds cost without value. Here is an honest comparison against the neighboring techniques.

| Aspect | Pact (contract) | End-to-end | Schema testing (OpenAPI) |
|---|---|---|---|
| What it verifies | Real consumer expectations vs real provider | Full flow across deployed services | Response matches a published schema |
| Runs in isolation | Yes (per service) | No (needs all services) | Yes |
| Catches breaking changes | Before deploy, at source | After deploy, in shared env | If schema is enforced |
| Speed / stability | Fast, stable | Slow, flaky | Fast, stable |
| Knows real consumer usage | Yes (consumer-driven) | Indirectly | No |
| Best for | Team-owned services with known consumers | Critical user journeys | Public APIs with many unknown clients |

Do not use Pact when you do not control or know the consumers, such as a public API consumed by anonymous third parties; there, publish an OpenAPI schema and test against that instead. Skip Pact for a single monolith with no service boundaries; there is no consumer/provider split to contract. Avoid it for pure UI rendering or business-logic bugs, which contract tests never see. And do not treat Pact as a replacement for a thin layer of real end-to-end tests on your most critical journeys; contracts verify the shape of each pairwise integration, not that the whole system produces the right end-to-end outcome. Use Pact for the many internal service-to-service integrations where you know your consumers, and keep a small E2E suite for the handful of flows where an end-to-end guarantee genuinely matters. For a broader survey of testing approaches, see the [best AI testing tools of 2026](/blog/best-ai-testing-tools-2026).

## Frequently Asked Questions

### What is contract testing in microservices?

Contract testing verifies the agreement between two services (a consumer that makes requests and a provider that answers them) in isolation, without running both together. The consumer's expectations are captured as a machine-readable contract, and the provider verifies it independently. This catches breaking API changes before deployment, replacing slow, flaky end-to-end tests for the integration layer.

### What is consumer-driven contract testing?

Consumer-driven contract testing means the consumer defines what it needs from a provider, and only that, and the provider promises to keep providing it. The consumer records only the fields and endpoints it actually uses, so contracts stay small. Providers get a precise map of real dependencies and can freely change anything no consumer's contract references. Pact implements this model.

### How is Pact different from end-to-end testing?

E2E tests run every service together and drive requests through the whole graph, which is slow, flaky, and fails after both services are already deployed. Pact tests each pairwise integration in isolation using a mock server and recorded interactions, so it is fast, stable, and catches breaking changes in each service's own pipeline before deployment, at the source rather than downstream.

### What is a Pact Broker?

A Pact Broker is a central service that stores contract files and provider verification results, versions them by application and git commit, and answers deployment questions. Consumers publish their pacts to it, providers fetch pacts and publish verification results back, and the \`can-i-deploy\` command queries it to decide whether a version is safe to ship. You can self-host it or use hosted PactFlow.

### What does can-i-deploy do?

\`can-i-deploy\` asks the Pact Broker whether a specific service version is compatible with everything already running in a target environment, based on all known contracts and verification results. If a change would break a consumer whose contract has not been re-verified, it returns a non-zero exit code and blocks the deploy. It is the enforcement gate that makes contract testing worthwhile.

### What is a provider state in Pact?

A provider state is a named precondition the consumer declares with \`given(...)\`, such as "user 123 exists," that the provider sets up before verifying an interaction. The provider implements a \`stateHandlers\` map where each state seeds the necessary data, usually in the database. Keep states behavioral rather than storage-specific, reset between interactions, and use parameters to reuse handlers across many interactions.

### Can Pact test asynchronous message queues?

Yes. Pact supports message pacts for event-driven communication over brokers like Kafka, RabbitMQ, or SQS. The consumer is the message handler and the provider is the producer; the contract describes the message body and metadata rather than an HTTP request/response. Neither test touches the real broker, and the broker, verification, and \`can-i-deploy\` workflow is identical to HTTP pacts.

## Conclusion

Contract testing with Pact gives microservice teams what end-to-end suites promise but rarely deliver: fast, stable, early detection of breaking changes, caught in each service's own pipeline before anything deploys. Write consumer tests with type matchers so contracts describe shape rather than exact values, verify on the provider side with realistic provider states, publish everything to a Pact Broker, and let \`can-i-deploy\` be the gate that no breaking change can slip past. Reserve Pact for the internal service-to-service integrations where you know your consumers, use schema testing for public APIs, and keep a thin E2E layer for your most critical user journeys.

Ready to add contract testing to your stack? Explore the QA skills directory at [/skills](/skills) to install Pact, contract testing, and API testing skills directly into Claude Code, Cursor, or Copilot, so your AI coding agent scaffolds consumer tests, provider verification, and CI gates the right way.
`,
};
