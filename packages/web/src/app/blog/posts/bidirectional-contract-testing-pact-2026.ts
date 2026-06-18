import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Bi-Directional Contract Testing with Pact (2026 Guide)',
  description:
    'Understand bi-directional contract testing (BDCT) vs consumer-driven contracts (CDCT), the PactFlow workflow, can-i-deploy gating, and migrating from CDCT.',
  date: '2026-06-18',
  category: 'Guide',
  content: `
# Bi-Directional Contract Testing with Pact (2026 Guide)

Contract testing solved one of the hardest problems in microservices: how do you know a deploy will not break the services that depend on you, without spinning up the entire system and running slow, flaky end-to-end suites? For years the answer was consumer-driven contract testing (CDCT) with Pact. In 2026, a second approach has matured alongside it: bi-directional contract testing (BDCT), where the provider publishes its OpenAPI spec, each consumer publishes the subset it actually uses, and a broker statically compares the two without ever running a shared test.

This guide explains both models, exactly how they differ, when to pick each one, the full BDCT workflow with PactFlow, can-i-deploy gating in CI, and a practical path for migrating from CDCT. If you want the foundational background first, read our [complete guide to Pact contract testing](/blog/pact-contract-testing-complete-guide-2026) and the [API contract testing for microservices](/blog/api-contract-testing-microservices) overview.

## The Core Problem Contract Testing Solves

In a system of dozens of services, integration bugs cluster at the seams: a provider renames a field, drops a property, or changes a status code, and a consumer three teams away breaks in production. Full end-to-end tests catch these, but they are slow, require every dependency to be deployed together, and are notoriously flaky. Contract testing replaces that with fast, isolated verification: each side proves its expectations independently, and a central broker confirms the two halves are compatible before anyone deploys.

The contract is the artifact at the heart of it: a machine-readable description of the interactions between a consumer and a provider. The disagreement between CDCT and BDCT is not about whether to have contracts, but about who authors them and how they get verified.

## Consumer-Driven Contract Testing (CDCT) Recap

In CDCT, the consumer is in charge. The consumer writes tests against a Pact mock server. As those tests run, Pact records every request the consumer makes and the response it expects, generating a contract (a "pact file"). That contract is published to the broker. The provider then downloads the contract and runs **provider verification**: Pact replays each recorded request against the real provider and asserts the actual response matches what the consumer expected.

\`\`\`javascript
// CDCT consumer test (Pact JS) - the consumer DEFINES expectations
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like } = MatchersV3;
const axios = require('axios');

const provider = new PactV3({
  consumer: 'WebApp',
  provider: 'OrdersAPI',
});

describe('Orders API contract', () => {
  it('returns an order by id', () => {
    provider
      .given('an order with id 42 exists')
      .uponReceiving('a request for order 42')
      .withRequest({ method: 'GET', path: '/orders/42' })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({ id: 42, total: 99.5, status: 'PAID' }),
      });

    return provider.executeTest(async (mockServer) => {
      const res = await axios.get(\\\`\${mockServer.url}/orders/42\\\`);
      expect(res.data.id).toBe(42);
    });
  });
});
\`\`\`

The strength of CDCT is precision: the contract reflects exactly what consumers use, and provider verification executes against the real provider code, catching behavioral mismatches, not just shape mismatches. The cost is coordination: the provider must be able to run the consumer's recorded interactions, which means installing Pact tooling, managing provider states (the "given" setup), and running a verification job in the provider's pipeline.

## Bi-Directional Contract Testing (BDCT) Explained

BDCT flips the verification model. Instead of replaying consumer interactions against the provider, the broker performs a **static comparison** of two independently produced specifications:

1. The **provider** publishes its full API description, an OpenAPI (Swagger) document, as the "provider contract." Crucially, the provider must prove this spec is accurate by self-verifying its real implementation against its own OpenAPI document.
2. Each **consumer** publishes a "consumer contract" describing only the subset of the API it actually consumes. With Pact, this consumer contract is still generated from the consumer's tests against a mock.
3. The **broker (PactFlow)** statically compares each consumer contract against the provider's OpenAPI spec. If everything the consumer needs is present and compatible in the provider's spec, they are deemed compatible.

The defining property: **there is no shared test execution between consumer and provider.** The two sides never run each other's tests. The provider's only obligation is to keep its OpenAPI spec honest by self-verifying it. The broker does the cross-checking on paper.

\`\`\`javascript
// BDCT consumer side still produces a Pact contract from tests,
// but it is compared STATICALLY against the provider's OpenAPI spec,
// never replayed against the running provider.
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like } = MatchersV3;
const axios = require('axios');

const provider = new PactV3({ consumer: 'MobileApp', provider: 'OrdersAPI' });

it('reads only the fields the mobile app uses', () => {
  provider
    .uponReceiving('a request for order 42')
    .withRequest({ method: 'GET', path: '/orders/42' })
    .willRespondWith({
      status: 200,
      // mobile app only reads id + status, so that is all it claims
      body: like({ id: 42, status: 'PAID' }),
    });

  return provider.executeTest(async (mock) => {
    const res = await axios.get(\\\`\${mock.url}/orders/42\\\`);
    expect(res.data.status).toBe('PAID');
  });
});
\`\`\`

## Provider Self-Verification: The Critical Step

The whole BDCT model rests on one assumption: the provider's published OpenAPI spec must actually match what the provider does. A lying spec breaks everything, because the broker trusts it as ground truth. So the provider must run a self-verification step that proves its real API conforms to its own OpenAPI document before publishing it.

Several tools do this. **Schemathesis** generates property-based test cases directly from your OpenAPI schema and fires them at your running service, flagging any response that violates the spec. **Dredd** reads the OpenAPI document and checks each documented endpoint against the live implementation. You can also use your existing API test suite combined with a recording proxy that validates responses against the schema.

\`\`\`bash
# Provider self-verification with Schemathesis (property-based, from the spec)
schemathesis run openapi.yaml \\
  --base-url http://localhost:8080 \\
  --checks all \\
  --report

# Or with Dredd (endpoint-by-endpoint against the spec)
dredd openapi.yaml http://localhost:8080
\`\`\`

Only after self-verification passes do you publish the OpenAPI spec to the broker as a verified provider contract. PactFlow records the verification result alongside the spec so it knows the contract is trustworthy.

## CDCT vs BDCT: A Direct Comparison

| Dimension | CDCT (consumer-driven) | BDCT (bi-directional) |
|---|---|---|
| Who authors provider contract | Derived from consumer tests | Provider owns its OpenAPI spec |
| Verification method | Replay consumer interactions on real provider | Static comparison of two specs |
| Shared test execution | Yes (provider runs consumer pacts) | No |
| Provider tooling burden | High (Pact + provider states) | Low (self-verify own spec) |
| Catches behavioral bugs | Yes (runs real provider code) | Only what self-verification covers |
| Catches shape/schema mismatches | Yes | Yes |
| Provider state setup | Required | Not required |
| Best when | Teams collaborate closely, few providers | Provider already has OpenAPI, many consumers, org silos |
| Onboarding new consumer | Provider must re-verify | No provider action needed |

The single most important row is "shared test execution." CDCT couples the two pipelines; BDCT decouples them. That decoupling is the reason teams adopt BDCT, and also the source of its main weakness.

## When to Choose BDCT vs CDCT

Reach for **BDCT** when:

- The provider already maintains an accurate OpenAPI spec (so self-verification is cheap to add).
- The provider has many consumers, possibly across organizational boundaries, and cannot run every consumer's pacts in its pipeline.
- Teams are siloed and you want to remove the coordination requirement entirely. A new consumer can onboard without the provider doing anything.
- The provider is a third party or a platform team that will not install Pact verification.

Reach for **CDCT** when:

- Consumer and provider teams collaborate closely and can coordinate pipelines.
- You need to catch behavioral mismatches that a static schema comparison misses, such as conditional logic, computed fields, or state-dependent responses.
- The provider does not have a reliable OpenAPI spec and is unlikely to maintain one.
- You want the contract to capture realistic example data and provider states, not just types.

Many mature organizations run both: BDCT for cross-team and third-party boundaries where decoupling matters most, and CDCT for the high-collaboration core where behavioral fidelity is worth the coupling.

## The BDCT Workflow Step by Step

| Step | Actor | Action | Tooling |
|---|---|---|---|
| 1 | Provider | Maintain accurate OpenAPI spec | OpenAPI / Swagger |
| 2 | Provider | Self-verify implementation against spec | Schemathesis / Dredd |
| 3 | Provider | Publish verified provider contract | Pact CLI / PactFlow |
| 4 | Consumer | Generate consumer contract from tests | Pact JS |
| 5 | Consumer | Publish consumer contract | Pact CLI / PactFlow |
| 6 | Broker | Statically compare consumer vs provider spec | PactFlow |
| 7 | Either | Gate deploy on can-i-deploy result | pact-broker CLI |

The publishing commands tie the artifacts to a version and the deployment environments. Here is the provider publishing its self-verified OpenAPI spec:

\`\`\`bash
# Provider publishes its OpenAPI spec as a verified provider contract
pactflow publish-provider-contract openapi.yaml \\
  --provider OrdersAPI \\
  --provider-app-version "\${GIT_SHA}" \\
  --branch "\${GIT_BRANCH}" \\
  --content-type application/yaml \\
  --verification-exit-code 0 \\
  --verification-results schemathesis-report.json \\
  --verifier schemathesis
\`\`\`

And the consumer publishing the contract its tests generated:

\`\`\`bash
# Consumer publishes the contract produced by its Pact tests
pact-broker publish ./pacts \\
  --consumer-app-version "\${GIT_SHA}" \\
  --branch "\${GIT_BRANCH}" \\
  --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
  --broker-token "\${PACT_BROKER_TOKEN}"
\`\`\`

As soon as both contracts exist for a given pair, PactFlow runs the static comparison automatically and records whether they are compatible.

## can-i-deploy: Gating Deployments in CI

The payoff of contract testing is the deployment gate. Before you ship a new version of any service, you ask the broker a simple question: given everything currently deployed in the target environment, is this version safe to release? The \`can-i-deploy\` command answers it by walking the verified compatibility matrix.

\`\`\`bash
# Ask the broker before deploying the consumer to production
pact-broker can-i-deploy \\
  --pacticipant MobileApp \\
  --version "\${GIT_SHA}" \\
  --to-environment production \\
  --broker-base-url "\${PACT_BROKER_BASE_URL}" \\
  --broker-token "\${PACT_BROKER_TOKEN}" \\
  --retry-while-unknown 12 \\
  --retry-interval 10
\`\`\`

If every consumer/provider pair the service participates in is verified compatible for production, the command exits 0 and the deploy proceeds. If any pair is incompatible or unverified, it exits non-zero and the pipeline stops. Wiring it into GitHub Actions looks like this:

\`\`\`yaml
name: Deploy MobileApp
on:
  push:
    branches: [main]

jobs:
  contract-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run consumer Pact tests
        run: npm test -- --testPathPattern=pact

      - name: Publish consumer contract
        run: |
          npx pact-broker publish ./pacts \\
            --consumer-app-version "\${GITHUB_SHA}" \\
            --branch "\${GITHUB_REF_NAME}" \\
            --broker-base-url "\${{ secrets.PACT_BROKER_BASE_URL }}" \\
            --broker-token "\${{ secrets.PACT_BROKER_TOKEN }}"

      - name: can-i-deploy gate
        run: |
          npx pact-broker can-i-deploy \\
            --pacticipant MobileApp \\
            --version "\${GITHUB_SHA}" \\
            --to-environment production \\
            --broker-base-url "\${{ secrets.PACT_BROKER_BASE_URL }}" \\
            --broker-token "\${{ secrets.PACT_BROKER_TOKEN }}"

      - name: Deploy
        run: ./deploy.sh production

      - name: Record deployment
        run: |
          npx pact-broker record-deployment \\
            --pacticipant MobileApp \\
            --version "\${GITHUB_SHA}" \\
            --environment production \\
            --broker-base-url "\${{ secrets.PACT_BROKER_BASE_URL }}" \\
            --broker-token "\${{ secrets.PACT_BROKER_TOKEN }}"
\`\`\`

The \`record-deployment\` step at the end is essential: it tells the broker what is actually running in each environment, which is the data \`can-i-deploy\` relies on for the next service's gate. Skip it and your compatibility matrix drifts out of sync with reality.

## Pros and Cons of BDCT

**Pros:**

- **Decoupled pipelines.** Provider and consumer never run each other's tests, so neither team blocks the other.
- **Low provider burden.** If the provider already has an OpenAPI spec, adding self-verification is the only new work; no provider states, no replaying consumer pacts.
- **Effortless consumer onboarding.** A new consumer publishes its contract and gets compared immediately; the provider does nothing.
- **Reuses existing artifacts.** OpenAPI specs and existing API test suites do double duty.

**Cons:**

- **Static comparison has blind spots.** It verifies shape and schema compatibility, not behavior. Conditional responses, computed values, and state-dependent logic are only as covered as the provider's self-verification.
- **Spec accuracy is load-bearing.** If the provider's OpenAPI spec is wrong and self-verification is weak, the broker happily approves broken integrations. Strong self-verification is non-negotiable.
- **Less rich contracts.** Consumer contracts describe types and structure more than concrete examples and provider states.

## Migrating from CDCT to BDCT

You do not need a big-bang switch. The recommended migration is incremental and runs both models side by side during the transition.

1. **Stand up the provider's OpenAPI spec and self-verification first.** Add Schemathesis or Dredd to the provider pipeline and get the spec verified. Until this is solid, BDCT results are untrustworthy.
2. **Publish the provider contract to PactFlow** alongside the existing CDCT verification. The broker can hold both a CDCT verification and a BDCT comparison for the same pair.
3. **Migrate one consumer at a time.** Point a low-risk consumer at the BDCT comparison while leaving the rest on CDCT. Confirm the compatibility matrix and \`can-i-deploy\` results agree with what CDCT was reporting.
4. **Watch for divergence.** If BDCT passes where CDCT failed, you have found a behavioral gap that static comparison misses; decide whether that pair should stay on CDCT.
5. **Decommission provider verification jobs** only after every consumer for that provider is confidently on BDCT and the provider's self-verification is comprehensive.

The healthiest end state is rarely 100 percent BDCT. Keep CDCT on the boundaries where behavioral fidelity matters and use BDCT to remove coupling everywhere else. For a deeper look at how these models compare with other API testing approaches, our [Postman vs Playwright](/blog/postman-vs-playwright) comparison covers complementary tooling for the same problem space.

## Frequently Asked Questions

### What is the difference between consumer-driven and bi-directional contract testing?

In consumer-driven contract testing (CDCT) the consumer's tests generate a contract that the provider then verifies by replaying those interactions against its real implementation, which couples the two pipelines. In bi-directional contract testing (BDCT) the provider publishes a self-verified OpenAPI spec and each consumer publishes its own subset contract, and a broker statically compares them. The defining difference is that BDCT involves no shared test execution between the two sides.

### When should I use BDCT instead of CDCT?

Choose BDCT when the provider already maintains an accurate OpenAPI spec, has many consumers across organizational boundaries, or is a third party that will not install Pact verification. BDCT removes the coordination requirement so consumers onboard without provider involvement. Stick with CDCT when teams collaborate closely and you need to catch behavioral mismatches, such as conditional or state-dependent responses, that a static schema comparison cannot detect.

### Why does the provider need to self-verify its OpenAPI spec in BDCT?

Because the broker treats the provider's OpenAPI spec as ground truth when comparing it against consumer contracts. If the spec does not match the real implementation, the broker will approve integrations that actually break in production. Self-verification, using tools like Schemathesis or Dredd, proves the live API conforms to its own spec before publishing. Without strong self-verification, BDCT gives false confidence, so this step is mandatory rather than optional.

### What tools do I need for bi-directional contract testing?

You need a broker that supports BDCT, which in practice means PactFlow. On the provider side you need an OpenAPI spec and a self-verification tool such as Schemathesis or Dredd. On the consumer side you use a Pact library like Pact JS to generate the consumer contract from tests. The Pact CLI and pact-broker CLI handle publishing contracts and running the can-i-deploy deployment gate in your pipeline.

### How does can-i-deploy prevent breaking changes?

The can-i-deploy command queries the broker's compatibility matrix to check whether a specific service version is compatible with everything currently deployed in a target environment. If every consumer-provider pair is verified compatible it exits zero and the deploy proceeds; if any pair is incompatible or unverified it exits non-zero and stops the pipeline. Pairing it with record-deployment keeps the matrix synchronized with what is actually running in each environment.

### Can I run CDCT and BDCT at the same time?

Yes, and that is the recommended approach during migration and often as a permanent strategy. The broker can hold both a CDCT verification and a BDCT comparison for the same consumer-provider pair, so you can migrate one consumer at a time and compare results. Many organizations settle on a hybrid: BDCT for cross-team and third-party boundaries where decoupling matters, and CDCT for the high-collaboration core where behavioral fidelity is worth the coupling.

### What are the main limitations of BDCT?

The biggest limitation is that BDCT performs a static comparison of schemas, so it verifies shape and structure but not behavior. Conditional logic, computed fields, and state-dependent responses are only covered to the extent the provider's self-verification covers them. It also makes spec accuracy load-bearing: a wrong OpenAPI spec with weak self-verification leads the broker to approve broken integrations. CDCT, by running real provider code, catches more behavioral issues.

### Do I have to rewrite my consumer tests to adopt BDCT?

Usually not. With Pact, the consumer side of BDCT still generates a contract from your existing consumer tests against a mock, the same way CDCT does. What changes is the verification model on the broker, which compares that contract statically against the provider's OpenAPI spec instead of having the provider replay it. The bulk of new work falls on the provider, which must publish and self-verify its OpenAPI spec.

## Conclusion

Bi-directional contract testing is not a replacement for consumer-driven contracts; it is a different tradeoff. BDCT buys you fully decoupled pipelines and near-zero provider coordination at the cost of behavioral coverage, while CDCT buys you behavioral fidelity at the cost of tighter coupling. The right answer for most organizations is a deliberate mix: BDCT on the silos and third-party seams, CDCT in the collaborative core, with can-i-deploy gating every deployment in both cases.

Want to build a contract testing practice that scales across your services and AI coding agents? Explore the [QASkills directory](/skills) to find ready-to-install Pact, OpenAPI, and contract testing skills, and give your agents the patterns they need to keep your microservices safe to deploy.
`,
};
