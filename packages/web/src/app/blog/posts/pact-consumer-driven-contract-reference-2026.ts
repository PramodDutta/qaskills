import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact Consumer-Driven Contract Testing Reference 2026',
  description:
    'Pact reference: write consumer contracts, run provider verification, publish to the Pact Broker, gate deploys with can-i-deploy, use matchers. JS and Java.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Pact Consumer-Driven Contract Testing Reference 2026

When you split a system into services, integration testing gets expensive fast. The classic approach — spin up every service and exercise the whole graph end to end — is slow, brittle, and impossible to run on every commit once you have more than a handful of services. Consumer-driven contract testing flips the problem. Instead of testing services together, you test the *contract* between each consumer and provider in isolation. The consumer records exactly which requests it makes and which responses it expects; the provider independently proves it can satisfy every one of those expectations. If both sides honor the shared contract, they will work together in production without ever being deployed together in a test. Pact is the de facto standard tool for this, and this is its reference.

This guide is a complete 2026 reference to Pact. We cover the consumer side (writing a pact with the JavaScript DSL), the generated pact file, provider verification (in Java), the Pact Broker that brokers contracts between teams, the \`can-i-deploy\` deployment gate, and matchers that keep contracts flexible. Examples span both JavaScript and Java because real systems are polyglot — a TypeScript front end consuming a Spring Boot service is the canonical Pact case. Whether you searched for "pact consumer driven contract testing," "pact provider verification java," "pact broker can-i-deploy," or "pact matchers," this is the reference you want.

If you test distributed systems broadly, the [skills directory](/skills) has installable QA skills for AI coding agents, and the [blog](/blog) has guides on API contract testing for microservices and broader API strategies. The core idea to anchor on: a Pact contract is a concrete, executable artifact — a JSON file of interactions — that both sides reference, so neither team has to guess what the other expects.

## How Consumer-Driven Contract Testing Works

In consumer-driven contract testing the consumer leads. The consumer's test suite runs against a Pact mock server that stands in for the real provider. As the consumer code makes the HTTP calls it would make in production, Pact records each request and the response the consumer was told to expect. The result is a *pact file*: a JSON document listing every interaction (request + expected response) between this specific consumer and provider pair. That file is the contract.

The pact file is then shared with the provider team, usually via a Pact Broker. The provider runs *verification*: Pact replays each recorded request against the real running provider and checks that the actual response matches what the consumer expected — same status, same headers, same body shape. If verification passes, the provider has proven it satisfies this consumer. If it fails, the provider learns it would break that consumer *before* deploying.

The asymmetry is the point. The consumer defines expectations based on what it actually uses, so the contract covers real usage and nothing more. The provider proves it meets those expectations without needing to know about the consumer's internals. Neither side runs the other's code; they meet only at the contract.

| Stage | Who runs it | What it produces / checks |
|---|---|---|
| Consumer test | Consumer team | Records interactions → pact file |
| Publish | Consumer CI | Uploads pact file to the Broker |
| Verification | Provider team | Replays requests, checks responses |
| Publish results | Provider CI | Reports pass/fail to the Broker |
| can-i-deploy | Either team | Gates deploy on verified compatibility |

## Writing a Consumer Pact (JavaScript)

The consumer side uses the Pact DSL to declare interactions and run the consumer's API client against a local mock. Here is a complete consumer test for a front end that fetches a user from a backend "user-service." It uses the modern \`@pact-foundation/pact\` V3/V4 \`PactV3\` API.

\`\`\`javascript
// user-api.consumer.spec.js
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, integer, string } = MatchersV3;
const axios = require('axios');
const path = require('path');

// The real consumer client we are testing
const getUser = (baseUrl, id) =>
  axios.get(\`\${baseUrl}/users/\${id}\`).then((r) => r.data);

const provider = new PactV3({
  consumer: 'web-frontend',
  provider: 'user-service',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('GET /users/:id', () => {
  it('returns a user', async () => {
    provider
      .given('a user with id 10 exists')        // provider state
      .uponReceiving('a request for user 10')
      .withRequest({ method: 'GET', path: '/users/10' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: integer(10),
          name: string('Ada Lovelace'),
          email: like('ada@example.com'),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const user = await getUser(mockServer.url, 10);
      expect(user.id).toBe(10);
      expect(user.name).toBeDefined();
    });
  });
});
\`\`\`

Two ideas are doing the heavy lifting. The \`given(...)\` clause declares a *provider state* — a named precondition ("a user with id 10 exists") that the provider must set up before verification. The matchers (\`integer\`, \`string\`, \`like\`) say "match the *type/shape* here, not the exact value," which we will expand on shortly. When this test runs, Pact writes \`pacts/web-frontend-user-service.json\`.

Run it with your normal test runner.

\`\`\`bash
npx jest user-api.consumer.spec.js
# On success, a pact file appears under ./pacts/
\`\`\`

## The Generated Pact File

The pact file is plain JSON and worth understanding because it is the artifact everything else operates on. Each interaction records the request, the expected response, the provider state, and — crucially — the matching rules derived from your matchers.

\`\`\`json
{
  "consumer": { "name": "web-frontend" },
  "provider": { "name": "user-service" },
  "interactions": [
    {
      "description": "a request for user 10",
      "providerStates": [{ "name": "a user with id 10 exists" }],
      "request": { "method": "GET", "path": "/users/10" },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": { "id": 10, "name": "Ada Lovelace", "email": "ada@example.com" },
        "matchingRules": {
          "body": {
            "$.id": { "matchers": [{ "match": "integer" }] },
            "$.email": { "matchers": [{ "match": "type" }] }
          }
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "3.0.0" } }
}
\`\`\`

Notice the \`matchingRules\`: \`$.id\` must be an integer and \`$.email\` must be the same *type* as the example, but their exact values are not pinned. This is what lets the provider return \`id: 42\` and a different email and still pass — the contract is about structure, not specific data. You commit this file to the consumer repo and/or publish it to the Broker; you never hand-edit it.

## Provider Verification (Java)

The provider proves it satisfies the contract by running verification. In a Spring Boot / JUnit 5 project, Pact's JUnit5 provider support starts your provider, fetches the pact(s), replays each request, and asserts the response matches. Provider states map to setup methods.

\`\`\`java
// UserServiceProviderTest.java
import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactBroker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@Provider("user-service")
@PactBroker(url = "https://broker.example.com")   // fetch pacts from the Broker
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserServiceProviderTest {

  @LocalServerPort
  int port;

  @BeforeEach
  void setTarget(PactVerificationContext context) {
    context.setTarget(new HttpTestTarget("localhost", port));
  }

  // Satisfies the provider state declared by the consumer's given(...)
  @State("a user with id 10 exists")
  void userTenExists() {
    // seed the DB / set up a fixture so GET /users/10 returns a user
    userRepository.save(new User(10L, "Ada Lovelace", "ada@example.com"));
  }

  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void verifyPacts(PactVerificationContext context) {
    context.verifyInteraction();   // replays each interaction and asserts
  }
}
\`\`\`

The \`@State\` method is the bridge from the consumer's \`given(...)\` clause to real provider setup: before replaying "a request for user 10," Pact calls \`userTenExists()\` so the provider is in the right state. Run verification with your build tool.

\`\`\`bash
./mvnw test -Dtest=UserServiceProviderTest
# Pact replays the consumer's recorded requests against the live provider
\`\`\`

If the provider's response shape drifts — a renamed field, a changed status — verification fails here, on the provider's CI, telling the provider team they are about to break \`web-frontend\` before they ship.

## The Pact Broker

For two teams in two repos, passing JSON files around by hand does not scale. The Pact Broker is a service that stores pacts and verification results, versions them by application version and git branch, and exposes the deployment-gate API. The consumer publishes its pact after a green build; the provider fetches pacts from the Broker (as the \`@PactBroker\` annotation above does) and publishes verification results back.

\`\`\`bash
# Consumer publishes its pact, tagged with the version and branch
npx pact-broker publish ./pacts \\
  --consumer-app-version "$GIT_SHA" \\
  --branch "$GIT_BRANCH" \\
  --broker-base-url https://broker.example.com \\
  --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

The Broker's value is the matrix it maintains: which consumer version expects what, which provider version has verified it, and on which branches/environments each is deployed. That matrix is what powers safe deployment decisions. It also renders a network diagram of your services and their contracts, which is often the only accurate, living map of who-calls-whom in a microservices estate.

| Broker concept | Meaning |
|---|---|
| Pacticipant | A consumer or provider application |
| Version | An app version, usually the git SHA |
| Tag / Branch | Labels a version (e.g. \`main\`, \`feature-x\`) |
| Verification result | Pass/fail of a provider against a pact |
| Deployed environment | Records what version is live where |
| Matrix | The cross-product of all of the above |

## can-i-deploy: Gating Deploys

The payoff of the whole workflow is \`can-i-deploy\`, a Broker query you run in CI right before deploying. It asks: "for the version I am about to deploy, has every contract it participates in been verified against the versions currently in the target environment?" If yes, it exits zero and you deploy. If a consumer expects something the deployed provider has not verified, it exits non-zero and blocks the release.

\`\`\`bash
# Before deploying the provider to production, check it won't break
# any consumer already live in production
npx pact-broker can-i-deploy \\
  --pacticipant user-service \\
  --version "$GIT_SHA" \\
  --to-environment production \\
  --broker-base-url https://broker.example.com \\
  --broker-token "$PACT_BROKER_TOKEN" \\
  --retry-while-unknown 12 --retry-interval 10
\`\`\`

\`\`\`bash
# After a successful deploy, tell the Broker what is now live
npx pact-broker record-deployment \\
  --pacticipant user-service \\
  --version "$GIT_SHA" \\
  --environment production \\
  --broker-base-url https://broker.example.com
\`\`\`

This is what makes contract testing a *deployment* safety net rather than just a test. The consumer and provider deploy independently, each gated by \`can-i-deploy\`, and neither can ship a change that would break a partner currently running in the target environment. The \`--retry-while-unknown\` flags handle the race where a verification is still in flight.

## Matchers: Keeping Contracts Flexible

If a contract pinned exact values, it would be useless — the provider could never return a real database ID different from the example, and every dynamic field (timestamps, UUIDs) would break verification. Matchers solve this by asserting *shape* instead of *value*. The most-used matchers, with their JavaScript names, are below.

\`\`\`javascript
const { MatchersV3 } = require('@pact-foundation/pact');
const {
  like, eachLike, integer, decimal, string, boolean,
  regex, datetime, uuid, fromProviderState,
} = MatchersV3;

const body = {
  id: integer(10),                       // any integer
  active: boolean(true),                 // any boolean
  name: string('Ada'),                   // any string
  score: decimal(9.5),                   // any decimal
  uuid: uuid('e2490de5-...'),            // any UUID
  createdAt: datetime("yyyy-MM-dd'T'HH:mm:ssZ", '2026-06-04T10:00:00+0000'),
  sku: regex('^SKU-\\\\d{6}$', 'SKU-000123'), // matches the regex
  // An array with AT LEAST one element of this shape:
  roles: eachLike(string('admin'), { min: 1 }),
  // A nested object matched by type:
  address: like({ city: string('Pune'), zip: string('411001') }),
};
\`\`\`

The equivalents exist in Java's Pact DSL (\`PactDslJsonBody\` with \`integerType\`, \`stringType\`, \`eachLike\`, \`stringMatcher\`, etc.), so both sides speak the same matching vocabulary. The guiding rule: pin a value only when the value itself is part of the contract (an enum, a fixed status string); otherwise match by type. Over-pinning makes contracts fragile; under-pinning (matching everything loosely) lets real breaking changes slip through. The table lists the workhorse matchers.

| Matcher | Asserts |
|---|---|
| \`like\` / \`type\` | Same type as the example |
| \`integer\` / \`decimal\` | Numeric type |
| \`string\` / \`boolean\` | String / boolean type |
| \`eachLike\` | Array where each item matches a shape (with \`min\`) |
| \`regex\` | String matching a regular expression |
| \`datetime\` / \`uuid\` | A timestamp in a format / a UUID |
| \`fromProviderState\` | Value injected from provider state |

For deeper microservices contract patterns, see the API contract testing guide on the [blog](/blog) and the agent-installable contract-testing skills in the [directory](/skills).

## Writing a Consumer Pact in Java

The consumer side is not JavaScript-only. A Java consumer — say one service calling another over HTTP — writes pacts with the JUnit5 consumer support and \`PactDslJsonBody\`, the Java equivalent of the JavaScript matchers. The structure parallels the JS test exactly: declare an interaction with a provider state, define the request and the matched response body, then run your real HTTP client against the Pact mock.

\`\`\`java
// UserClientConsumerTest.java
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.junit.jupiter.api.Assertions.assertEquals;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service")
class UserClientConsumerTest {

  @Pact(consumer = "billing-service")
  RequestResponsePact getUser(PactDslWithProvider builder) {
    return builder
        .given("a user with id 10 exists")        // provider state
        .uponReceiving("a request for user 10")
        .path("/users/10").method("GET")
        .willRespondWith()
        .status(200)
        .headers(java.util.Map.of("Content-Type", "application/json"))
        .body(new PactDslJsonBody()
            .integerType("id", 10)                // match type, not value
            .stringType("name", "Ada Lovelace")
            .stringType("email", "ada@example.com"))
        .toPact();
  }

  @Test
  @PactTestFor(pactMethod = "getUser")
  void verifiesUserShape(au.com.dius.pact.consumer.MockServer mockServer) {
    // Run your real HTTP client against the Pact mock server
    var user = new UserClient(mockServer.getUrl()).getUser(10);
    assertEquals(10, user.id());
  }
}
\`\`\`

Note the symmetry with the JavaScript consumer earlier: \`given\`, \`uponReceiving\`, the request, and a response body built from type matchers (\`integerType\`, \`stringType\`). This is the polyglot promise in action — a Java consumer and a JavaScript consumer produce equivalent pact files that any provider, in any language, can verify. Mixing consumer languages against one provider is routine.

## Bi-Directional Contracts and the Wider Workflow

Classic Pact is consumer-driven: the consumer's recorded expectations *are* the contract. A newer model, bi-directional contract testing, lets the provider publish its own contract (typically derived from an OpenAPI spec) and the Broker compares the consumer's pact against that provider contract rather than replaying requests against a running provider. This trades some fidelity for speed and decoupling — the provider does not have to run a live verification job — and suits teams that already maintain a strong OpenAPI definition.

Whichever model you use, the operational backbone is the same: contracts and results flow through the Broker, and \`can-i-deploy\` gates releases. A complete CI sequence for a consumer looks like this, tying together the pieces from earlier sections.

\`\`\`bash
# Consumer CI pipeline
npx jest                                   # 1. run consumer tests -> pact file
npx pact-broker publish ./pacts \\           # 2. publish to the Broker
  --consumer-app-version "$GIT_SHA" --branch "$GIT_BRANCH" \\
  --broker-base-url "$BROKER_URL" --broker-token "$PACT_BROKER_TOKEN"
npx pact-broker can-i-deploy \\              # 3. gate the deploy
  --pacticipant web-frontend --version "$GIT_SHA" \\
  --to-environment production --broker-base-url "$BROKER_URL"
# 4. deploy, then record it
npx pact-broker record-deployment \\
  --pacticipant web-frontend --version "$GIT_SHA" \\
  --environment production --broker-base-url "$BROKER_URL"
\`\`\`

The provider runs the mirror image: verify pacts (publishing results to the Broker), then \`can-i-deploy\`, then \`record-deployment\`. With both pipelines in place, the two services deploy on their own schedules, each protected by the Broker's matrix from shipping a change that breaks the other.

| Model | Provider step | Trade-off |
|---|---|---|
| Consumer-driven (classic) | Replays requests against live provider | Highest fidelity, needs running provider |
| Bi-directional | Publishes OpenAPI-derived contract | Faster/decoupled, relies on spec accuracy |

## Frequently Asked Questions

### What does "consumer-driven" actually mean in Pact?

It means the consumer defines the contract based on what it genuinely uses, and the provider's job is to satisfy it. The consumer's test records the specific requests it makes and the response shapes it depends on, producing a pact file; the provider then verifies it can meet exactly those expectations. This keeps contracts focused on real usage — the provider is never asked to honor fields no consumer reads — and shifts the discovery of breaking changes left, onto the provider's CI before deployment.

### How is contract testing different from end-to-end integration testing?

End-to-end tests deploy and run multiple real services together, which is slow, flaky, and hard to scale past a few services. Contract testing verifies each consumer-provider pair in isolation against a shared contract, so neither service runs the other. The consumer tests against a Pact mock; the provider replays recorded requests against itself. If both honor the contract they are guaranteed to integrate, giving you most of the confidence of E2E at a fraction of the cost and far faster feedback.

### What is a provider state and why do I need it?

A provider state is a named precondition the consumer declares with \`given(...)\`, such as "a user with id 10 exists." During verification, Pact invokes a matching setup method on the provider (a \`@State\` method in Java) to put the provider into that state before replaying the request. Without provider states, a request like \`GET /users/10\` might return 404 because the data was never seeded, failing verification for the wrong reason. States make verification deterministic and data-driven.

### What does can-i-deploy do and when should I run it?

\`can-i-deploy\` queries the Pact Broker to confirm that the application version you are about to deploy has every contract it participates in verified against the versions currently live in the target environment. Run it in CI immediately before deploying. If a consumer expects behavior the deployed provider has not verified, it exits non-zero and blocks the release, letting consumer and provider deploy independently without either breaking a partner already running in production.

### Why use matchers instead of pinning exact values?

Because real responses contain dynamic data — database IDs, timestamps, UUIDs — that differs from your example, and pinning exact values would make verification fail on every legitimate response. Matchers assert the *shape* (type, format, array structure) rather than the literal value, so the provider can return a real \`id: 42\` and still satisfy a contract written with \`integer(10)\`. Pin exact values only when the value is genuinely part of the contract, such as an enum or a fixed status string.

### Do I have to use the Pact Broker?

For a single team owning both sides in one repo, you can pass pact files around on the filesystem. But once the consumer and provider live in separate repos or teams, the Broker becomes essential: it versions pacts by application version and branch, stores verification results, renders the service dependency graph, and — most importantly — powers \`can-i-deploy\`. The Broker is what turns Pact from a testing tool into an independent-deployment safety net across teams.

### Can Pact handle a polyglot stack, like a JavaScript consumer and a Java provider?

Yes, and that is one of its primary strengths. The pact file is a language-agnostic JSON contract, so a TypeScript or JavaScript consumer can publish a pact that a Java, .NET, Go, or Python provider verifies, and vice versa. Each language has a Pact implementation with the same DSL concepts — interactions, provider states, and matchers — so both sides speak the same contract vocabulary. The canonical case of a JS front end consuming a Spring Boot service is exactly what Pact is built for.

## Conclusion

Pact makes microservices testable without the cost of running everything together. The consumer records what it uses into a pact file, the provider verifies it can satisfy every interaction, the Pact Broker stores those contracts and verification results across teams, and \`can-i-deploy\` gates every release on proven compatibility with whatever is live. Matchers keep the contracts flexible by asserting shape over value. Wire those pieces into CI and your services can deploy independently with confidence that no change will break a partner in production.

Ready to adopt contract testing? Browse installable QA skills for your AI coding agent in the [QASkills directory](/skills) and read the microservices and API contract testing guides on the [blog](/blog). Drop a Pact skill into Claude Code or Cursor and let your agent scaffold consumer pacts, provider verification, Broker publishing, and can-i-deploy gates across your services.
`,
};
