import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'gRPC Contract Testing With the Pact v4 Plugin: Complete Guide',
  description:
    'A complete guide to gRPC contract testing with the Pact v4 plugin: consumer-driven contracts over protobuf, provider verification, and broker publishing.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# gRPC Contract Testing With the Pact v4 Plugin: Complete Guide

Contract testing solved a real problem for REST microservices: it lets a consumer and a provider evolve independently without an expensive end-to-end suite, by pinning the exact shape of the messages they exchange. For a long time gRPC was left out. Pact spoke JSON over HTTP, and gRPC speaks protobuf over HTTP/2, so the two did not fit. The Pact v4 specification and its plugin framework changed that. With the protobuf/gRPC plugin, you can now write consumer-driven contracts for gRPC services, verify providers against them, and publish the results to a broker, exactly as you would for REST.

This guide covers how the Pact plugin framework enables gRPC, how to write a consumer test against a protobuf service, how to verify the provider, how protobuf messages are matched, and how to publish and manage contracts through a broker. If you are new to the underlying model, start with our [Pact contract testing complete guide](/blog/pact-contract-testing-complete-guide-2026), then come back here for the gRPC specifics.

## Why Contract Testing for gRPC

gRPC's protobuf schema already defines message structure, so a fair question is: why add contract testing on top of a typed schema? Because the schema tells you the shape of a message, not whether a specific consumer's expectations match a specific provider's behavior. A field can exist in the \`.proto\` yet be empty when the consumer needs it populated. A provider can add a field the consumer ignores (safe) or remove one the consumer depends on (breaking). The \`.proto\` compiles fine in both cases; the contract test is what catches the breaking one before deploy.

| Concern | Protobuf schema alone | Pact gRPC contract testing |
| --- | --- | --- |
| Message structure | Enforced | Enforced |
| Field population expectations | Not captured | Captured per consumer |
| Breaking-change detection | Compile-time only | Verified against real consumer expectations |
| Cross-team coordination | Manual | Broker-mediated |
| Independent deployability | Not guaranteed | Can-I-Deploy gate |

This is the same value proposition as [API contract testing for microservices](/blog/api-contract-testing-microservices) and [OpenAPI contract testing](/blog/openapi-contract-testing-guide), extended to the binary, HTTP/2 world of gRPC.

## The Pact Plugin Framework

Pact v4 introduced a plugin architecture so the core Pact tooling no longer has to understand every protocol itself. A plugin teaches Pact how to build and match messages for a specific transport or content type. The protobuf/gRPC plugin knows how to read \`.proto\` files, construct protobuf messages, start a mock gRPC server for the consumer test, and replay interactions during provider verification.

The plugin is installed once on each machine that runs Pact, and the language-specific Pact library talks to it over the plugin interface.

\`\`\`bash
# Install the Pact CLI plugin manager
# (bundled with recent Pact distributions as 'pact-plugin-cli')

# Install the protobuf/gRPC plugin
pact-plugin-cli install \\
  https://github.com/pactflow/pact-protobuf-plugin/releases/latest

# Confirm it is registered
pact-plugin-cli list
\`\`\`

| Component | Role |
| --- | --- |
| Pact core library | Manages the contract lifecycle in your language |
| Plugin framework | Bridges core to protocol-specific plugins |
| protobuf/gRPC plugin | Builds and matches protobuf messages, runs the gRPC mock |
| Pact broker | Stores contracts and verification results |

## A Sample Protobuf Service

Everything below is anchored to a small service. Assume this \`.proto\`:

\`\`\`protobuf
syntax = "proto3";

package routeguide;

service RouteGuide {
  rpc GetFeature (Point) returns (Feature) {}
}

message Point {
  int32 latitude = 1;
  int32 longitude = 2;
}

message Feature {
  string name = 1;
  Point location = 2;
}
\`\`\`

The consumer calls \`GetFeature\` with a \`Point\` and expects a \`Feature\` with a non-empty \`name\` and a \`location\` echoing the request.

## Writing the Consumer Contract

The consumer test declares the expected interaction: given a request message, what response message should come back. The plugin turns your expectation into a running gRPC mock server that your client code calls, and if the client's real request matches the expectation, Pact records the interaction as a contract. Here is a JavaScript consumer test using the plugin's config block.

\`\`\`js
const path = require('path');
const { PactV4, MatchersV3 } = require('@pact-foundation/pact');
const { like } = MatchersV3;

const pact = new PactV4({
  consumer: 'route-client',
  provider: 'route-guide-service',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('RouteGuide gRPC contract', () => {
  it('returns a feature for a point', () => {
    return pact
      .addInteraction()
      .description('a request for the feature at a point')
      .usingPlugin({
        plugin: 'protobuf',
        version: '0.5.4',
      })
      .withPluginContents(
        JSON.stringify({
          'pact:proto': path.resolve(__dirname, 'route_guide.proto'),
          'pact:content-type': 'application/grpc',
          'pact:proto-service': 'RouteGuide/GetFeature',
          request: {
            latitude: 'matching(number, 407838351)',
            longitude: 'matching(number, -746143763)',
          },
          response: {
            name: 'matching(type, "Berkshire Valley Management Area")',
            location: {
              latitude: 'matching(number, 407838351)',
              longitude: 'matching(number, -746143763)',
            },
          },
        }),
        'application/grpc',
      )
      .executeTest(async (mockServer) => {
        // point your gRPC client at mockServer.url / mockServer.port,
        // call GetFeature, and assert on the response
        const feature = await callGetFeature(mockServer.port, {
          latitude: 407838351,
          longitude: -746143763,
        });
        expect(feature.name).toBeTruthy();
      });
  });
});
\`\`\`

The \`pact:proto\` key points the plugin at the schema so it knows how to encode and decode the binary protobuf messages. The \`matching(...)\` expressions are matchers: they say "any number here" or "any string of this type" rather than pinning the exact value, which keeps the contract flexible. Running this test produces a pact file in \`pacts/\`.

## How Protobuf Messages Are Matched

REST Pact matchers describe JSON shapes. The gRPC plugin applies the same matcher philosophy to protobuf fields, using the \`.proto\` to know each field's type. You express expectations with matcher functions embedded in the message definition.

| Matcher | Meaning | Example |
| --- | --- | --- |
| \`matching(type, X)\` | Any value of the same type as X | \`matching(type, "name")\` |
| \`matching(number, N)\` | Any numeric value | \`matching(number, 42)\` |
| \`matching(boolean, B)\` | Any boolean | \`matching(boolean, true)\` |
| \`matching(regex, 'p', S)\` | String matching a regex | \`matching(regex, '\\\\d+', "123")\` |
| \`eachValue(...)\` | Applies a matcher to every element of a repeated field | repeated messages |

The key discipline: match on type and structure, not on exact business values, unless the exact value is genuinely part of the contract. A contract that pins \`name == "Berkshire Valley"\` will break the moment the provider legitimately returns a different feature, which is a false failure. A contract that requires \`name\` to be a non-empty string captures the real expectation.

## Verifying the Provider

The contract is only half the story. Provider verification replays the recorded interactions against the real provider and confirms it actually produces conforming responses. The provider side loads the pact (from a file or the broker), starts the real gRPC service, sends each recorded request, and checks the response against the contract's matchers.

\`\`\`js
const path = require('path');
const { VerifierV3 } = require('@pact-foundation/pact');

describe('RouteGuide provider verification', () => {
  it('honours the route-client contract', () => {
    const verifier = new VerifierV3({
      provider: 'route-guide-service',
      // the real gRPC server must be running on this port
      providerBaseUrl: 'http://127.0.0.1:50051',

      // pull contracts from the broker
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      // publish the verification result back
      publishVerificationResult: true,
      providerVersion: process.env.GIT_SHA,
    });

    return verifier.verifyProvider();
  });
});
\`\`\`

Before verification, start the real provider so it listens on the configured port. If a request needs specific state (say, a feature must exist at a coordinate), Pact provider states let you seed that data via a state-handler callback before the interaction runs. When verification passes, the provider is proven to satisfy every recorded consumer expectation.

## Using Provider States for Seeded Data

Many interactions only make sense against specific data. The contract for "get the feature at coordinate X" assumes a feature exists there. Provider states are Pact's mechanism for setting up that precondition before an interaction is replayed. The consumer names a state in the contract, and the provider registers a handler that seeds the matching data.

On the consumer side, attach a state to the interaction:

\`\`\`js
pact
  .addInteraction()
  .given('a feature exists at 407838351, -746143763')
  .description('a request for the feature at a point')
  .usingPlugin({ plugin: 'protobuf', version: '0.5.4' });
  // ... plugin contents as before
\`\`\`

On the provider side, register a handler that runs before that interaction, seeding the database or in-memory store so the real service returns a populated \`Feature\`:

\`\`\`js
const verifier = new VerifierV3({
  provider: 'route-guide-service',
  providerBaseUrl: 'http://127.0.0.1:50051',
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  stateHandlers: {
    'a feature exists at 407838351, -746143763': async () => {
      await seedFeature({
        name: 'Berkshire Valley Management Area',
        latitude: 407838351,
        longitude: -746143763,
      });
    },
  },
});
\`\`\`

Without a state handler, the provider would likely return an empty message and verification would fail on a matcher that expected a non-empty \`name\`. States keep provider verification deterministic without hard-coding fixtures into the service itself.

## Streaming RPCs and Message Contracts

The examples so far use a unary RPC (one request, one response), which maps cleanly onto request/response contract testing. gRPC also supports server-streaming, client-streaming, and bidirectional-streaming RPCs. Pact's model is fundamentally request/response and message-based, so streaming has practical limits worth understanding before you design contracts around it.

| RPC type | Contract-testing fit | Approach |
| --- | --- | --- |
| Unary | Strong | Standard request/response interaction |
| Server streaming | Partial | Contract on each message shape via message pacts |
| Client streaming | Partial | Contract on the request message shape |
| Bidirectional | Weak | Verify message shapes, not full interleaving |

For streaming, lean on Pact's asynchronous message contracts: rather than pinning the whole stream and its timing (which contract testing does not model well), pin the shape of the individual messages that flow across it. That still catches the common breaking change, a field removed or retyped in a streamed message, while leaving end-to-end streaming behavior to integration tests. Keep unary RPCs as the backbone of your contract suite and treat streaming shapes as a targeted supplement.

## Publishing Contracts to a Broker

Files on disk do not scale across teams. A Pact broker is the shared registry: consumers publish contracts to it, providers pull and verify against it, and it records who verified what at which version. This is what enables independent deployment. Our [PactFlow broker guide](/blog/pactflow-contract-testing-broker-guide) covers hosted brokers in depth; the mechanics below apply to any broker.

Publish the consumer contract after the consumer test generates it:

\`\`\`bash
pact-broker publish ./pacts \\
  --consumer-app-version "\${GIT_SHA}" \\
  --branch "\${GIT_BRANCH}" \\
  --broker-base-url "\${PACT_BROKER_URL}" \\
  --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

Then, before deploying either side, gate the deploy with \`can-i-deploy\`, which checks the broker for a verified contract between the versions you intend to ship:

\`\`\`bash
pact-broker can-i-deploy \\
  --pacticipant route-client \\
  --version "\${GIT_SHA}" \\
  --to-environment production \\
  --broker-base-url "\${PACT_BROKER_URL}" \\
  --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

If the consumer version has not been verified against the provider version currently in production, \`can-i-deploy\` exits non-zero and blocks the release. That single gate is the practical payoff of the whole workflow.

## The Full Workflow in CI

Putting the pieces together, the consumer and provider pipelines run independently and coordinate only through the broker.

| Stage | Consumer pipeline | Provider pipeline |
| --- | --- | --- |
| 1 | Run consumer test, generate pact | (waits) |
| 2 | Publish pact to broker with version + branch | Pull pacts from broker |
| 3 | (waits) | Start real gRPC service |
| 4 | (waits) | Verify against pacts, publish results |
| 5 | \`can-i-deploy\` gate before release | \`can-i-deploy\` gate before release |

Here is a consumer-side GitHub Actions job:

\`\`\`yaml
name: consumer-contract

on:
  push:
    branches: [main]

jobs:
  pact-consumer:
    runs-on: ubuntu-latest
    env:
      PACT_BROKER_URL: \${{ secrets.PACT_BROKER_URL }}
      PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
      GIT_SHA: \${{ github.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install deps and plugin
        run: |
          npm ci
          pact-plugin-cli install \\
            https://github.com/pactflow/pact-protobuf-plugin/releases/latest

      - name: Run consumer contract test
        run: npm run test:pact

      - name: Publish contract
        run: |
          npx pact-broker publish ./pacts \\
            --consumer-app-version "\${GIT_SHA}" \\
            --branch main \\
            --broker-base-url "\${PACT_BROKER_URL}" \\
            --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

## Common Pitfalls and How to Avoid Them

gRPC contract testing has a few sharp edges worth naming.

1. **Over-specific matchers.** Pinning exact business values makes contracts brittle. Match on type and required-ness; reserve exact-value matches for genuine invariants like enum codes.
2. **Forgetting the plugin on the provider machine.** Verification fails cryptically if the protobuf plugin is not installed where the provider runs. Install it in both pipelines.
3. **Mismatched \`.proto\` versions.** The consumer and provider must agree on the schema. Vendor the same \`.proto\` (or a shared package) into both so they encode messages identically.
4. **Skipping provider states.** If an interaction needs seeded data, wire a state handler. Without it, the provider returns an empty message and verification fails on a matcher that expected content.
5. **Publishing without a version and branch.** \`can-i-deploy\` needs accurate version and branch metadata to reason about compatibility. Always pass the git SHA and branch.

## Evolving the Schema Without Breaking Consumers

The whole point of contract testing is safe evolution, so it helps to map how common protobuf schema changes interact with your contracts. protobuf itself is designed for backward compatibility, but backward-compatible wire format is not the same as backward-compatible behavior, and the contract test is what enforces the behavioral half.

Adding a new optional field is safe. Existing consumers ignore it, their contracts still pass, and new consumers can start depending on it once the provider populates it. This is the everyday, low-risk change, and contract testing confirms it does not disturb anyone.

Removing a field, or changing its type, is the dangerous case. On the wire protobuf may tolerate it, but a consumer whose contract requires that field will fail provider verification the moment the provider stops populating it. That failure is the system working as intended: it surfaces the break in CI, against the exact consumer version that depends on the field, before the change reaches production. You then coordinate: either the consumer migrates first or the provider keeps the field until every consumer has moved off it.

| Schema change | Wire-compatible? | Contract impact |
| --- | --- | --- |
| Add optional field | Yes | Safe; existing contracts pass |
| Add required behavior to existing field | Yes | Safe if consumers already tolerate it |
| Remove a field | Often | Breaks consumers whose contract requires it |
| Change a field's type | Sometimes | Breaks contracts asserting the old type |
| Reuse a field number | No | Corrupts decoding; never do this |

The reason consumer-driven contracts are so effective here is that the provider is not guessing which fields matter. The broker holds the union of every live consumer's real expectations, and \`can-i-deploy\` checks a proposed provider version against all of them at once. Field-number reuse is the one change protobuf can never absorb, so treat proto field numbers as permanent even for deleted fields.

## Frequently Asked Questions

### Can Pact test gRPC services?

Yes, since Pact v4. The v4 specification plus the plugin framework allow a protobuf/gRPC plugin to teach Pact how to encode, decode, and match protobuf messages over HTTP/2. You write consumer-driven contracts, verify providers, and publish to a broker for gRPC exactly as you would for REST, using the same Pact libraries with the plugin installed.

### What is the Pact plugin framework?

The Pact plugin framework, introduced in Pact v4, lets the core Pact tooling delegate protocol- and content-specific work to plugins. Instead of the core understanding every transport, a plugin (such as the protobuf/gRPC plugin) handles building and matching messages for that format. This keeps the core small while extending Pact to gRPC, Avro, and other formats.

### How is gRPC contract testing different from REST?

The workflow is identical: consumer generates a contract, provider verifies it, broker mediates. The differences are the transport (HTTP/2 binary protobuf instead of JSON over HTTP/1.1), the need to install the protobuf plugin, and the requirement that both sides share the same \`.proto\` schema so messages encode consistently. Matchers apply to protobuf fields rather than JSON keys.

### Do I still need the .proto file if I have a Pact contract?

Yes. The plugin uses the \`.proto\` to encode and decode binary protobuf messages during both the consumer test and provider verification. The consumer and provider must reference the same schema, ideally a shared vendored copy or package, so they serialize messages identically. The Pact contract captures expectations on top of the schema, not instead of it.

### What does can-i-deploy do for gRPC contracts?

\`can-i-deploy\` queries the broker to confirm that the specific consumer version you want to ship has been successfully verified against the provider version currently in a target environment. If not, it exits non-zero and blocks the deploy. It works the same for gRPC as for REST, which is what enables the consumer and provider to release independently and safely.

### How do I match dynamic fields in protobuf responses?

Use matchers instead of literal values. \`matching(type, X)\` accepts any value of X's type, \`matching(number, N)\` accepts any number, and \`matching(regex, pattern, sample)\` accepts strings matching a pattern. Apply these to fields like generated IDs or timestamps so the contract asserts the field's type and presence without pinning a value that legitimately changes every response.

### Where should I run provider verification, in CI or locally?

Both, but CI is authoritative. Run it locally for fast feedback while developing, and run it in the provider pipeline so verification results are published to the broker with a real provider version. Only broker-recorded verification results feed \`can-i-deploy\`, so the CI run is the one that gates deployment and keeps the two teams coordinated.

## Conclusion

gRPC no longer has to sit outside the contract-testing world. With the Pact v4 plugin framework and the protobuf/gRPC plugin, you write consumer-driven contracts against protobuf services, verify providers against real behavior, and gate deployments through a broker with \`can-i-deploy\`, gaining the same independent deployability that made contract testing indispensable for REST. The keys are installing the plugin on every machine, sharing one \`.proto\` between consumer and provider, and matching on type rather than exact values.

Set up the plugin today, write one consumer test against your most-called gRPC method, and publish the contract to your broker. Then read the [Pact contract testing complete guide](/blog/pact-contract-testing-complete-guide-2026) and the [PactFlow broker guide](/blog/pactflow-contract-testing-broker-guide) on qaskills.sh, and grab a ready-made contract-testing skill from the catalog to standardize the workflow across your services.
`,
};
