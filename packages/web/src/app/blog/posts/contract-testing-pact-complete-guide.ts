import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact Contract Testing: The Complete 2026 Guide (Pact JS)',
  description:
    'Master Pact contract testing in 2026: consumer-driven contracts, PactV4 and MatchersV3, provider verification, Pact Broker, can-i-deploy, provider states, and bi-directional contracts.',
  date: '2026-06-14',
  category: 'Guide',
  content: `
# Pact Contract Testing: The Complete Guide for 2026

Pact is the most widely used framework for consumer-driven contract testing, and in a microservices world it solves a problem that integration tests cannot solve cheaply: how do you know a provider change will break a consumer before you deploy it? Pact lets the consumer team express exactly what it needs from a provider as a machine-readable contract, then independently verifies that the provider can satisfy that contract. Crucially, the two services are never running at the same time. The consumer test produces a pact file describing expected interactions, and the provider test replays those interactions against the real provider code. If the provider can fulfill every expectation, the contract holds. If a field is renamed or a status code changes, verification fails loudly in the provider's own pipeline.

This is fundamentally different from schema validation or end-to-end testing. End-to-end tests require the whole system to be running, are slow, and are flaky. Schema testing checks that responses match a structure but cannot tell you whether a specific consumer actually relies on a specific field. Consumer-driven contracts encode real usage: the consumer only declares the fields and interactions it genuinely consumes, so the provider is free to add fields, change unused parts, and evolve, as long as it never breaks what a consumer depends on. That focus on real dependencies is what makes Pact scale to hundreds of services.

This guide walks through the full Pact JS workflow with the modern \`PactV4\` and \`MatchersV3\` API: writing a consumer test, generating the pact file, verifying it against the provider, sharing contracts through a Pact Broker or PactFlow, gating deployments with \`can-i-deploy\`, handling provider states, using matchers like \`like\`, \`eachLike\`, and \`regex\`, versioning with tags, and the newer bi-directional contract testing model. We close by comparing Pact against Spring Cloud Contract and plain schema testing. If you want the conceptual overview first, our [API contract testing for microservices](/blog/api-contract-testing-microservices) article is a gentler on-ramp, and this guide is the deep, code-first companion.

## Key Takeaways

- Consumer-driven contracts let the consumer declare exactly what it needs, and the provider verifies it can deliver it, without both services running together
- Pact JS uses \`PactV4\` and \`MatchersV3\` in 2026; matchers like \`like\`, \`eachLike\`, and \`regex\` assert on shape and type, not exact values
- The consumer test produces a pact file (JSON) that becomes the source of truth for provider verification
- Provider verification replays the pact against real provider code using the \`Verifier\`, with provider states setting up required data
- A Pact Broker (self-hosted) or PactFlow (hosted) shares contracts, tracks versions, and powers \`can-i-deploy\`
- \`can-i-deploy\` gates deployments by checking that every relevant consumer-provider pair has verified successfully
- Bi-directional contract testing lets providers verify against an OpenAPI spec instead of replaying consumer pacts, easing adoption for established providers

---

## What Consumer-Driven Contracts Actually Mean

In a consumer-driven contract, the consumer is in the driver's seat. Instead of the provider publishing a specification and hoping consumers conform, each consumer writes a test that says "when I call this endpoint with this request, I expect a response that looks like this." The set of those expectations, collected from a single consumer-provider relationship, is the contract, stored as a pact file.

The provider then takes that pact file and verifies it: for every interaction the consumer recorded, the provider sends the same request to its real handler code and checks that the real response satisfies the consumer's expectations. Because the consumer only recorded the fields and behaviors it actually uses, the provider has maximum freedom to change everything else. This is the inversion that makes Pact powerful. The people who know what is needed (consumers) define the contract, and the people who must not break it (providers) are automatically told the moment they do.

A few terms recur throughout this guide. An **interaction** is a single request/response pair. A **pact** is the full set of interactions between one consumer and one provider. A **provider state** is a precondition the provider must establish before an interaction can be verified, such as "user 42 exists." A **matcher** relaxes an expectation from an exact value to a type or pattern so contracts do not break on every changed timestamp. With those in hand, let us write a real consumer test.

## Writing a Consumer Test with PactV4 and MatchersV3

Install the modern Pact JS package as a dev dependency. The single \`@pact-foundation/pact\` package ships both the consumer DSL and the provider \`Verifier\`.

\`\`\`bash
npm install @pact-foundation/pact --save-dev
\`\`\`

A consumer test has three phases: declare the expected interaction, run your real client against the mock provider Pact spins up, and assert your client handled the response correctly. The \`PactV4\` builder is the current entry point, and \`MatchersV3\` provides the matchers.

\`\`\`typescript
import path from 'node:path';
import { PactV4, MatchersV3 } from '@pact-foundation/pact';
import { getUser } from '../src/userClient';

const { like, eachLike, regex, integer } = MatchersV3;

const pact = new PactV4({
  consumer: 'WebFrontend',
  provider: 'UserService',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('UserService consumer contract', () => {
  it('returns a user by id', () => {
    return pact
      .addInteraction()
      .given('a user with id 42 exists')
      .uponReceiving('a request for user 42')
      .withRequest('GET', '/users/42', (builder) => {
        builder.headers({ Accept: 'application/json' });
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' });
        builder.jsonBody({
          id: integer(42),
          name: like('Ada Lovelace'),
          email: regex('\\\\S+@\\\\S+\\\\.\\\\S+', 'ada@example.com'),
          roles: eachLike('admin'),
        });
      })
      .executeTest(async (mockServer) => {
        const user = await getUser(mockServer.url, 42);
        expect(user.id).toBe(42);
        expect(user.name).toBeDefined();
        expect(user.roles.length).toBeGreaterThan(0);
      });
  });
});
\`\`\`

Inside \`executeTest\`, Pact starts a mock provider on \`mockServer.url\` that responds according to your \`willRespondWith\` declaration. Your real \`getUser\` client points at that URL and must behave correctly. If the test passes, Pact writes a pact file to the \`pacts\` directory.

## Understanding Matchers: like, eachLike, and regex

Matchers are the difference between a useful contract and a brittle one. If you assert exact values, the contract breaks every time a name or timestamp changes, which is noise, not signal. Matchers say "I care about the type and shape, not the literal value."

| Matcher | Asserts | Example use |
|---|---|---|
| \`like(example)\` | Value has the same type as the example | A name is a string, an age is a number |
| \`eachLike(example)\` | An array where every element matches the example | A list of roles, items, or addresses |
| \`integer(example)\` | The value is an integer | An id, a count, a page number |
| \`decimal(example)\` | The value is a floating-point number | A price, a rating |
| \`regex(pattern, example)\` | The value matches a regular expression | Email, UUID, date format |
| \`datetime(format, example)\` | The value matches a date/time format | ISO 8601 timestamps |
| \`boolean(example)\` | The value is a boolean | Feature flags, active status |

Use \`eachLike\` with a \`min\` option when the consumer needs at least N elements, for example \`eachLike({ sku: like('ABC') }, { min: 1 })\`. The golden rule is to match on type for anything that can legitimately vary and to use exact values only when the literal value is part of the contract, such as an enum or a fixed status code.

## Generating and Inspecting the Pact File

When your consumer test suite passes, Pact serializes every interaction into a JSON pact file named \`<consumer>-<provider>.json\` in your configured \`dir\`. This file is the artifact that travels to the provider. It records the request, the expected response, the matching rules derived from your matchers, and the provider states.

\`\`\`json
{
  "consumer": { "name": "WebFrontend" },
  "provider": { "name": "UserService" },
  "interactions": [
    {
      "description": "a request for user 42",
      "providerStates": [{ "name": "a user with id 42 exists" }],
      "request": { "method": "GET", "path": "/users/42" },
      "response": {
        "status": 200,
        "body": { "id": 42, "name": "Ada Lovelace" },
        "matchingRules": {
          "body": { "$.name": { "matchers": [{ "match": "type" }] } }
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "4.0" } }
}
\`\`\`

You should not edit this file by hand; it is generated output. You can, however, read it to understand exactly what the consumer expects. In a real pipeline you do not commit pact files into the provider repo. Instead you publish them to a Pact Broker, which we cover next, so the provider always verifies against the latest contracts.

## Provider Verification with the Verifier

On the provider side, you stand up your real service (often pointed at a test database) and run the \`Verifier\`. It fetches the pact, replays each request against your running provider, and checks every response satisfies the consumer's matchers. There is no mocking here; this is your actual provider code answering real requests.

\`\`\`typescript
import { Verifier } from '@pact-foundation/pact';
import { app } from '../src/server';

let server;

beforeAll(() => {
  server = app.listen(8080);
});

afterAll(() => {
  server.close();
});

describe('UserService provider verification', () => {
  it('honors all consumer contracts', () => {
    return new Verifier({
      provider: 'UserService',
      providerBaseUrl: 'http://localhost:8080',
      // Fetch pacts from the broker rather than the filesystem in CI
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: true,
      providerVersion: process.env.GIT_COMMIT,
      providerVersionBranch: process.env.GIT_BRANCH,
    }).verifyProvider();
  });
});
\`\`\`

\`publishVerificationResult: true\` sends the pass/fail result back to the broker, which is what makes \`can-i-deploy\` work later. Always tie \`providerVersion\` to a real, unique value such as the git commit so the broker can reason about exactly which version verified which contract.

## Provider States: Setting Up the World Before Verification

A consumer interaction often assumes data exists, such as "user 42 exists" or "the cart is empty." The provider cannot verify a \`GET /users/42\` returning 200 unless user 42 is actually present. Provider states are named hooks that let the provider set up that precondition before each interaction is replayed. The consumer declares the state name with \`given(...)\`; the provider implements a handler for it.

\`\`\`typescript
return new Verifier({
  provider: 'UserService',
  providerBaseUrl: 'http://localhost:8080',
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  stateHandlers: {
    'a user with id 42 exists': async () => {
      await db.users.insert({ id: 42, name: 'Ada Lovelace', email: 'ada@example.com' });
      return 'user 42 seeded';
    },
    'the cart is empty': async () => {
      await db.carts.deleteAll();
    },
  },
}).verifyProvider();
\`\`\`

State handlers keep your provider tests deterministic without baking fixtures into the contract. The consumer says what world it assumes; the provider decides how to create it. Keep state names stable and descriptive, because they are part of the contract and renaming one requires coordinating both sides.

## Sharing Contracts with the Pact Broker and PactFlow

The Pact Broker is the integration point that turns Pact from a per-repo trick into a system-wide safety net. It stores pacts, records verification results, tracks which versions are deployed in which environment, and exposes the data that powers deployment gating. PactFlow is the hosted, commercial version with SSO, secrets, and bi-directional support; the open-source Pact Broker is self-hosted.

The consumer publishes its pacts after generating them; the provider fetches them during verification.

\`\`\`bash
# Publish consumer pacts to the broker after the consumer test passes
npx pact-broker publish ./pacts \\
  --broker-base-url=$PACT_BROKER_URL \\
  --broker-token=$PACT_BROKER_TOKEN \\
  --consumer-app-version=$GIT_COMMIT \\
  --branch=$GIT_BRANCH
\`\`\`

The broker connects the dots: it knows WebFrontend version abc123 produced this contract, UserService version def456 verified it, and both are deployed in production. That web of relationships is exactly what \`can-i-deploy\` queries to answer the only question that matters at release time.

## Gating Deployments with can-i-deploy

\`can-i-deploy\` is the payoff of the whole workflow. Before you deploy a service to an environment, you ask the broker: given the versions already in that environment, is it safe to deploy this version? The broker checks that every relevant consumer-provider pair has a successful verification. If anything is unverified or failed, the command exits non-zero and your pipeline stops the deploy.

\`\`\`bash
# Run in CI right before deploying UserService to production
npx pact-broker can-i-deploy \\
  --pacticipant UserService \\
  --version $GIT_COMMIT \\
  --to-environment production \\
  --broker-base-url $PACT_BROKER_URL \\
  --broker-token $PACT_BROKER_TOKEN \\
  --retry-while-unknown 6 \\
  --retry-interval 10
\`\`\`

The \`--retry-while-unknown\` flags handle the race where verification is still running; the command waits for results instead of failing immediately. This is the single most valuable command in Pact: it converts the abstract promise of contract testing into a hard gate that physically prevents a breaking deploy. Pairing it with a solid branching strategy is covered in our [microservices testing strategies](/blog/microservices-testing-strategies) guide.

## Versioning, Branches, and Tags

For \`can-i-deploy\` to be accurate, the broker needs to know which version of each service is where. The modern model uses **version branches** and **deployed/released environments** instead of the older free-form tags. You record a branch when publishing, and you tell the broker when a version is deployed.

\`\`\`bash
# Record that a version has been deployed to an environment
npx pact-broker record-deployment \\
  --pacticipant UserService \\
  --version $GIT_COMMIT \\
  --environment production \\
  --broker-base-url $PACT_BROKER_URL \\
  --broker-token $PACT_BROKER_TOKEN
\`\`\`

| Concept | Purpose | Example |
|---|---|---|
| Application version | Unique id for a build, ideally the git SHA | \`abc123def\` |
| Branch | Which line of development the version came from | \`main\`, \`feature/login\` |
| Environment | A real deploy target the broker tracks | \`test\`, \`staging\`, \`production\` |
| \`record-deployment\` | Tells the broker a version is now live somewhere | After a successful deploy |
| Pending pacts | New consumer contracts that should not fail the provider yet | A new consumer onboarding |

Using the git SHA as the version is the practice that makes everything else work, because it gives the broker an unambiguous, traceable identity for every artifact.

## Bi-Directional Contract Testing

Classic Pact requires the provider to replay consumer pacts, which means the provider's pipeline has to run consumer-generated tests. For large, established providers with many consumers, that can be a hard sell. Bi-directional contract testing, available in PactFlow, offers an alternative: the provider publishes its own contract, typically an OpenAPI specification verified by its existing API tests, and the broker statically cross-checks each consumer pact against that spec.

The consumer side is unchanged: it still produces a pact describing what it needs. The provider side, instead of running the consumer pacts, uploads its OpenAPI document plus evidence that its own tests pass against it. PactFlow then compares each consumer's expectations to the provider's published contract and reports compatibility. This decouples the two pipelines, lets the provider keep its existing API test suite, and still gives you \`can-i-deploy\` safety. The tradeoff is that static comparison is slightly less precise than replaying real requests, so it works best when the provider's OpenAPI spec is trustworthy. If you already invest in OpenAPI, our [OpenAPI contract testing guide](/blog/openapi-contract-testing-guide) explains how to keep that spec honest.

## Pact vs Spring Cloud Contract vs Schema Testing

Pact is not the only way to test contracts. The right choice depends on your stack and whether you want consumer-driven or provider-driven contracts.

| Aspect | Pact | Spring Cloud Contract | Schema Testing (OpenAPI/JSON Schema) |
|---|---|---|---|
| Contract origin | Consumer-driven | Provider-driven (provider writes contracts) | Provider-published schema |
| Language support | Polyglot (JS, Java, .NET, Go, Python, Ruby) | JVM-first (Java, Kotlin, Groovy) | Language-agnostic |
| Ecosystem | Pact Broker / PactFlow | Stub runner, Maven/Gradle | Spectral, Prism, Schemathesis |
| Captures real consumer usage | Yes | Partially | No |
| Deployment gating | \`can-i-deploy\` | Manual / CI scripting | Manual |
| Best for | Microservices across many teams and languages | Spring-heavy JVM shops | Validating structure and documentation |

Use Pact when you have multiple teams in multiple languages and want consumers to drive contracts with hard deployment gating. Use Spring Cloud Contract when you are deep in the Spring ecosystem and prefer providers to author contracts. Use schema testing as a complement, not a replacement; it verifies structure and is great for catching breaking schema changes, but it cannot tell you which consumer relies on which field, which is exactly the gap consumer-driven Pact fills.

## Conclusion

Pact turns the vague hope that your services still talk to each other into a verifiable, automated guarantee. Consumers declare what they need, providers prove they deliver it, the broker remembers who verified what and where it is deployed, and \`can-i-deploy\` refuses to let a breaking change ship. Layer in provider states for deterministic setup, matchers for resilient assertions, version branches for accurate tracking, and bi-directional contracts when you need to ease provider adoption, and you have a contract testing program that scales across dozens of teams and languages.

The fastest way to get this running on your stack is to start with the consumer test, publish to a broker, and add the \`can-i-deploy\` gate to one pipeline, then expand. To accelerate that, browse the curated, agent-ready QA skills at [/skills](/skills) and drop proven Pact, contract testing, and microservices testing workflows directly into your AI coding agent so your contracts are protecting production by the end of the week.

## Frequently Asked Questions

### What is consumer-driven contract testing?

Consumer-driven contract testing is an approach where the consumer of an API declares exactly the requests it sends and the responses it expects, producing a contract called a pact. The provider then independently verifies it can satisfy that contract by replaying the recorded interactions against its real code. The two services never run together, which makes the tests fast, isolated, and reliable compared to integration tests.

### What is the difference between Pact and a Pact Broker?

Pact is the testing framework you use in code to generate consumer contracts and verify them on the provider. The Pact Broker is a separate server that stores those contracts, records verification results, tracks which versions are deployed in which environments, and powers \`can-i-deploy\`. PactFlow is the hosted commercial broker with extra features like bi-directional contracts and SSO. You need a broker to coordinate contracts across teams.

### How does can-i-deploy prevent breaking changes?

\`can-i-deploy\` asks the broker whether a specific version of a service is compatible with the versions already deployed in a target environment. The broker checks that every relevant consumer-provider pair has a successful verification recorded. If any contract is unverified or failing, the command exits with a non-zero code, which stops the deployment in CI before the breaking change can reach the environment.

### When should I use matchers instead of exact values in Pact?

Use matchers like \`like\`, \`eachLike\`, and \`regex\` whenever a value can legitimately change between requests, such as names, timestamps, ids, or generated content. Matching on type or pattern keeps the contract focused on shape rather than literal data, so it does not break on every value change. Reserve exact values for things that are genuinely part of the contract, such as enums or fixed status codes.

### What are provider states in Pact?

Provider states are named preconditions that the provider must establish before verifying an interaction, such as "a user with id 42 exists." The consumer declares the state with \`given(...)\`, and the provider implements a state handler that sets up the required data, often by seeding a test database. This keeps provider verification deterministic without embedding fixtures into the contract itself.

### What is bi-directional contract testing?

Bi-directional contract testing, available in PactFlow, lets the provider publish its own contract, usually an OpenAPI specification verified by its existing tests, instead of replaying consumer pacts. The broker statically compares each consumer's pact against the provider's published spec to determine compatibility. This decouples the provider and consumer pipelines and is easier for established providers to adopt, at the cost of slightly less precise verification.

### How is Pact different from schema testing?

Schema testing verifies that an API response matches a defined structure, like an OpenAPI or JSON Schema document, but it cannot tell you which consumer actually depends on which field. Pact captures real consumer usage, so the provider learns the moment it breaks something a consumer relies on, while remaining free to change unused parts. Schema testing is a useful complement to Pact, not a replacement for it.

### Which Pact JS API should I use in 2026?

Use the \`PactV4\` builder for consumer tests and \`MatchersV3\` for matchers, both exported from \`@pact-foundation/pact\`. These align with version 4 of the Pact specification and support the modern interaction DSL, branches, and environment-based deployment tracking. Older \`PactV3\` and the legacy v2 DSL still work, but \`PactV4\` is the recommended baseline for new projects.
`,
};
