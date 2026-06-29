import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Contract Testing with Pact in Python: 2026 Guide',
  description:
    'A hands-on 2026 guide to consumer-driven contract testing with Pact in Python: consumer tests, provider verification, the Pact Broker, can-i-deploy, and CI.',
  date: '2026-06-29',
  category: 'Tutorial',
  content: `
# Contract Testing with Pact in Python: 2026 Guide

If your Python services talk to each other over HTTP, you have almost certainly felt the pain that contract testing exists to solve. A team ships a small change to an API: renames a field, makes an optional value required, tweaks a status code. Their own tests are green. Your consuming service, which depended on the old shape, breaks in production. No integration test caught it because integration tests are expensive to run across team boundaries, slow, flaky, and usually run too late. Contract testing fixes this by capturing the exact expectations a consumer has of a provider as a machine-readable **contract**, then verifying the provider against that contract independently, in each team's own pipeline.

**Pact** is the most widely used contract testing framework, and \`pact-python\` brings it to the Python ecosystem with clean integration into pytest. In this 2026 guide we will build a complete consumer-driven contract testing workflow in Python: writing a consumer test that generates a Pact contract, inspecting the generated JSON, verifying the provider against it, sharing contracts through the Pact Broker (or its hosted form, PactFlow), and using \`can-i-deploy\` to gate releases safely. We will wire it all into a CI pipeline so the contract becomes a living safety net rather than a document that rots.

This is a practical tutorial with runnable code. If you want broader background on the discipline, our [API contract testing for microservices guide](/blog/api-contract-testing-microservices) explains the architecture-level case, and the [Schemathesis API fuzzing guide](/blog/api-contract-testing-schemathesis-guide) covers a complementary, schema-driven approach. Contract testing and those techniques are friends, not rivals.

## What Contract Testing Solves (vs Integration Tests)

The instinct when two services must work together is to spin them both up and test them end to end. That works, but it scales terribly. With N services, the number of integration combinations explodes, the environment is slow and brittle, and a failure rarely points cleanly at which side broke the agreement. Worse, end-to-end integration tests run **late**, often only in a shared staging environment, so feedback arrives long after the offending commit.

Contract testing inverts the problem. Instead of testing the real provider, the **consumer** runs its tests against a lightweight **mock** of the provider that Pact stands up locally. While the consumer's tests run, Pact records every request the consumer makes and the response it expects. The recorded set of interactions becomes the contract. Separately, the **provider** replays those recorded requests against its real implementation and checks that it produces matching responses. Neither side needs the other running at the same time, and each side tests in its own fast, isolated pipeline.

| Aspect | Integration / E2E tests | Contract tests (Pact) |
|---|---|---|
| Both services running together | Required | Not required |
| Feedback speed | Slow (staging, late) | Fast (unit-test speed in each pipeline) |
| Which side broke? | Ambiguous | Pinpointed (consumer expectation vs provider) |
| Environment cost | High (full stack) | Low (local mocks) |
| Scales with service count | Poorly (combinatorial) | Well (per-pair contracts) |
| What it verifies | Real end-to-end behavior | The interface agreement |

Contract tests do **not** replace all integration testing. They verify the **shape and semantics of the interface**, not deep business logic spanning many services. But for catching breaking API changes early, they are dramatically cheaper and faster than full integration suites.

## Consumer-Driven Contracts in a Nutshell

Pact is **consumer-driven**. The consumer declares what it needs, and that need is the source of truth. This is a deliberate philosophy: providers should only worry about the parts of their API that consumers actually use. If a consumer only reads three fields from a response, the contract only asserts those three. The provider is free to add fields, restructure unused parts, and evolve, as long as the consumer's stated expectations keep passing. This is what makes Pact a tool for safe, independent evolution rather than a rigid schema lock.

The lifecycle has three repeating phases:

1. **Generate** a contract by running the consumer's tests against the Pact mock.
2. **Share** the contract by publishing it to a Pact Broker.
3. **Verify** the provider against the shared contract, and publish the verification result.

The Broker ties it together and answers the critical question before any deploy: is the version I am about to ship compatible with what is already running on the other side?

## Setting Up pact-python

Install the package into your consumer project. As of 2026, \`pact-python\` ships a v3 API backed by the shared Rust Pact core, which is the recommended path for new projects.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
pip install pact-python pytest requests
\`\`\`

A minimal project layout for the consumer side looks like this:

\`\`\`text
consumer/
  src/
    user_client.py        # the code that calls the provider
  tests/
    test_user_consumer.py # the Pact consumer test
  pacts/                  # generated contract JSON lands here
  pytest.ini
\`\`\`

Here is the client under test. It is the real production code that talks to the provider's API.

\`\`\`python
# src/user_client.py
import requests


class UserClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def get_user(self, user_id: int) -> dict:
        resp = requests.get(
            f"{self.base_url}/users/{user_id}",
            headers={"Accept": "application/json"},
            timeout=5,
        )
        resp.raise_for_status()
        return resp.json()
\`\`\`

## Writing a Consumer Test That Generates a Pact

The consumer test describes an interaction: given some provider state, when the consumer sends a request, then it expects a particular response. Pact stands up a mock server, the test points the real client at that mock, and Pact records the agreed interaction into a contract file.

\`\`\`python
# tests/test_user_consumer.py
import pytest
from pact import Pact, match
from src.user_client import UserClient


@pytest.fixture(scope="module")
def pact():
    pact = (
        Pact("user-web", "user-service")
        .with_specification("V4")
    )
    yield pact


def test_get_existing_user(pact):
    expected = {
        "id": match.int(101),
        "name": match.string("Ada Lovelace"),
        "email": match.regex(
            "ada@example.com",
            regex=r"^[^@]+@[^@]+\\.[^@]+$",
        ),
        "active": match.bool(True),
    }

    (
        pact.upon_receiving("a request for an existing user")
        .given("user 101 exists")
        .with_request(method="GET", path="/users/101")
        .will_respond_with(200)
        .with_body(expected, content_type="application/json")
    )

    with pact.serve() as srv:
        client = UserClient(str(srv.url))
        user = client.get_user(101)

        assert user["id"] == 101
        assert user["name"] == "Ada Lovelace"
        assert "@" in user["email"]
\`\`\`

The most important detail here is the **matchers** (\`match.int\`, \`match.string\`, \`match.regex\`, \`match.bool\`). They tell Pact "I expect an integer here, with this example value" rather than "I expect exactly the number 101." This keeps the contract about **type and shape**, not specific data, so the provider is not forced to return one magic hardcoded value. Matchers are what make Pact contracts robust instead of brittle. The \`given(...)\` clause declares **provider state**, a named precondition the provider will set up before replaying this interaction (for example, seeding a user with id 101).

Run the consumer test like any pytest:

\`\`\`bash
pytest tests/test_user_consumer.py -v
\`\`\`

When it passes, Pact writes a contract file, typically \`pacts/user-web-user-service.json\`.

## The Generated Contract JSON

It helps enormously to look at what Pact actually produces. The contract is plain JSON that describes the consumer, the provider, and every recorded interaction with its matching rules. A trimmed example:

\`\`\`json
{
  "consumer": { "name": "user-web" },
  "provider": { "name": "user-service" },
  "interactions": [
    {
      "description": "a request for an existing user",
      "providerStates": [{ "name": "user 101 exists" }],
      "request": {
        "method": "GET",
        "path": "/users/101"
      },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": {
          "id": 101,
          "name": "Ada Lovelace",
          "email": "ada@example.com",
          "active": true
        },
        "matchingRules": {
          "body": {
            "$.id": { "matchers": [{ "match": "integer" }] },
            "$.name": { "matchers": [{ "match": "type" }] },
            "$.email": {
              "matchers": [{ "match": "regex", "regex": "^[^@]+@[^@]+\\\\.[^@]+$" }]
            },
            "$.active": { "matchers": [{ "match": "type" }] }
          }
        }
      },
      "pactSpecification": { "version": "4.0" }
    }
  ]
}
\`\`\`

Notice the \`matchingRules\` block: the provider does not have to return \`101\` and \`"Ada Lovelace"\` exactly. It must return an integer \`id\`, a string \`name\`, an \`email\` matching the regex, and a boolean \`active\`. That is the agreement. This file is the artifact you share with the provider team.

## Verifying the Provider

Now the other side. The provider team takes the contract and replays its recorded requests against the real running service, asserting that responses match. Because Pact is consumer-driven, the provider never wrote these expectations; it inherits them from the consumer.

The key extra responsibility on the provider side is implementing **provider state handlers**. Each \`given(...)\` from the consumer maps to a setup hook that puts the provider's data into the required state before the interaction is replayed.

\`\`\`python
# provider/tests/test_provider_verify.py
from pact import Verifier


def test_user_service_honours_contracts():
    verifier = Verifier(
        provider="user-service",
        provider_base_url="http://localhost:8080",
    )

    # Map provider-state names to setup endpoints/handlers
    verifier.set_state(
        "http://localhost:8080/_pact/provider_states"
    )

    # Verify against a contract pulled from the broker
    success, logs = verifier.verify_with_broker(
        broker_url="https://yourorg.pactflow.io",
        broker_token="REPLACE_WITH_TOKEN",
        provider_version_branch="main",
        provider_app_version="1.4.2",
        publish_verification_results=True,
    )

    assert success == 0, logs
\`\`\`

The provider service exposes a small, test-only endpoint that Pact calls before each interaction to establish state:

\`\`\`python
# provider/app/provider_states.py (Flask example, test profile only)
from flask import Blueprint, request, jsonify

states = Blueprint("provider_states", __name__)


@states.route("/_pact/provider_states", methods=["POST"])
def setup_state():
    payload = request.get_json(force=True)
    state = payload.get("state")

    if state == "user 101 exists":
        db.seed_user(id=101, name="Ada Lovelace",
                     email="ada@example.com", active=True)
    elif state == "user 404 does not exist":
        db.delete_user(404)

    return jsonify({"result": f"state '{state}' set up"})
\`\`\`

When verification runs, Pact replays the GET to \`/users/101\`, the provider has seeded the data, and Pact checks that the live response satisfies the matching rules. If the provider renamed \`name\` to \`full_name\`, this verification fails immediately and points exactly at the broken expectation. That is the breaking change caught before deploy.

## The Pact Broker and PactFlow

So far the consumer generates a contract and the provider verifies it, but how do they exchange it? Emailing JSON files does not scale. The **Pact Broker** is a shared service that stores contracts and verification results and understands application versions. **PactFlow** is the commercial, hosted SaaS version of the Broker with extra governance, access control, and a polished UI.

The flow is:

1. Consumer publishes its contract to the broker, tagged with its version and branch.
2. Provider pulls contracts from the broker, verifies, and publishes results back.
3. The broker now knows, for any pair of versions, whether they are compatible.

Publishing a contract from the consumer side, using the CLI:

\`\`\`bash
pact-broker publish ./pacts \\
  --consumer-app-version "$(git rev-parse --short HEAD)" \\
  --branch "$(git rev-parse --abbrev-ref HEAD)" \\
  --broker-base-url https://yourorg.pactflow.io \\
  --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

The broker renders a network graph of every consumer-provider relationship and their verification status, which becomes the living documentation of how your services actually depend on each other.

## Versioning and can-i-deploy

This is the feature that makes Pact safe in continuous delivery. Before you deploy a service, you ask the broker a single question: given the version I am about to ship and the environment I am shipping to, is everything it talks to (and everything that talks to it) verified compatible? The \`can-i-deploy\` tool answers it.

\`\`\`bash
pact-broker can-i-deploy \\
  --pacticipant user-web \\
  --version "$(git rev-parse --short HEAD)" \\
  --to-environment production \\
  --broker-base-url https://yourorg.pactflow.io \\
  --broker-token "$PACT_BROKER_TOKEN" \\
  --retry-while-unknown 6 \\
  --retry-interval 10
\`\`\`

If the consumer version you are about to deploy has a contract that the currently-deployed provider has **not** verified, \`can-i-deploy\` exits non-zero and your pipeline stops the deploy. No more "we shipped and it broke the other team." The compatibility check is a hard gate. The \`--retry-while-unknown\` flags let the consumer wait briefly for an in-flight provider verification to finish.

| Tool / concept | Purpose |
|---|---|
| Provider states (\`given\`) | Set up data so an interaction can be replayed deterministically |
| Matchers (\`match.*\`) | Assert type and shape, not exact values, to avoid brittle contracts |
| Pact Broker / PactFlow | Store contracts and verification results; understand versions |
| Branches and versions | Tag contracts so the broker can reason about compatibility per env |
| \`can-i-deploy\` | Pre-deploy gate that blocks incompatible releases |
| \`publish_verification_results\` | Records that a provider version satisfied a contract |

## Pytest Integration and a CI Workflow

Both sides live naturally inside pytest, which means contract tests run alongside your existing suite with the same tooling. If you are new to structuring Python tests, our [pytest complete testing guide](/blog/pytest-testing-complete-guide) covers fixtures, markers, and parametrization that compose cleanly with Pact tests. A typical \`pytest.ini\` marks contract tests so they can be selected or skipped:

\`\`\`ini
[pytest]
markers =
    contract: consumer-driven contract tests (Pact)
\`\`\`

\`\`\`python
import pytest

@pytest.mark.contract
def test_get_existing_user(pact):
    ...
\`\`\`

Now the end-to-end CI. The consumer pipeline generates and publishes the contract, then asks \`can-i-deploy\` before shipping:

\`\`\`yaml
# .github/workflows/consumer-contract.yml
name: Consumer Contract
on: [push]
jobs:
  pact:
    runs-on: ubuntu-latest
    env:
      PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install pact-python pytest requests
      - name: Generate contract
        run: pytest -m contract -v
      - name: Publish contract
        run: |
          pact-broker publish ./pacts \\
            --consumer-app-version "$(git rev-parse --short HEAD)" \\
            --branch "\${{ github.ref_name }}" \\
            --broker-base-url https://yourorg.pactflow.io \\
            --broker-token "$PACT_BROKER_TOKEN"
      - name: Can I deploy?
        run: |
          pact-broker can-i-deploy \\
            --pacticipant user-web \\
            --version "$(git rev-parse --short HEAD)" \\
            --to-environment production \\
            --broker-base-url https://yourorg.pactflow.io \\
            --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

The provider pipeline verifies whatever contracts exist for it and publishes results, which in turn unblocks consumers waiting on \`can-i-deploy\`:

\`\`\`yaml
# .github/workflows/provider-verify.yml
name: Provider Verify
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install pact-python pytest flask
      - name: Start provider
        run: |
          python -m app.server &
          sleep 3
      - name: Verify contracts
        run: pytest provider/tests/test_provider_verify.py -v
\`\`\`

With both pipelines in place you have a closed loop: consumers state expectations, providers prove they meet them, and nobody deploys a breaking change without the broker stopping it first.

## Common Pitfalls

A few things trip up teams new to Pact in Python. First, **over-specifying the contract**: if you assert exact values instead of using matchers, the provider is forced to return that one value and your contract becomes brittle. Always prefer \`match.int\`, \`match.string\`, and friends. Second, **forgetting provider states**: an interaction with a \`given\` that the provider does not handle will fail verification because the data is not set up. Third, **treating contract tests as full integration tests**: they verify the interface, not deep cross-service business logic; keep a small set of true end-to-end tests for that. Finally, **not publishing verification results**, which leaves \`can-i-deploy\` permanently in the dark.

## Frequently Asked Questions

### What is the difference between contract testing and integration testing?

Integration testing runs multiple real services together and verifies end-to-end behavior, which is slow, environment-heavy, and runs late. Contract testing verifies only the interface agreement between a consumer and a provider, with each side tested in isolation against a mock or a recorded contract. Contract tests are faster, run per-pipeline, and pinpoint exactly which side broke the agreement.

### How does Pact work in Python specifically?

\`pact-python\` provides a consumer DSL that stands up a mock provider during pytest runs and records interactions into a JSON contract, plus a \`Verifier\` that replays those interactions against the real provider. The modern v3 API is backed by the shared Rust Pact core, so Python behaves consistently with Pact in other languages and supports the same matchers and broker workflows.

### What is consumer-driven contract testing?

Consumer-driven means the consumer defines what it needs from a provider, and that expectation is the source of truth. The provider then proves it satisfies every consumer's expectations. This lets providers evolve freely as long as the parts consumers actually use keep working, rather than locking the entire API behind a rigid schema.

### Do I need a Pact Broker to use Pact?

No, you can generate and verify contracts using local files for a quick start. But for real teams a broker (self-hosted Pact Broker or hosted PactFlow) is strongly recommended because it stores contracts, tracks verification results across versions, renders the dependency graph, and powers \`can-i-deploy\`, which is the feature that makes Pact safe in continuous delivery.

### What does can-i-deploy actually check?

It asks the broker whether the specific version you are about to deploy is verified compatible with the versions already running in the target environment, in both directions. If a consumer version has a contract the deployed provider has not verified (or vice versa), \`can-i-deploy\` exits non-zero and your pipeline halts the deploy, preventing a known breaking change from shipping.

### Are matchers necessary in Pact contracts?

In practice, yes. Matchers like \`match.int\` and \`match.regex\` make the contract assert types and shapes rather than exact literal values. Without them the provider would have to return one hardcoded magic value to pass verification, which is brittle and unrealistic. Matchers keep the contract focused on the interface structure that genuinely matters.

### Can I use Pact alongside schema-based API testing?

Absolutely, and many teams do. Schema-driven tools like Schemathesis fuzz an API against its OpenAPI spec to find edge cases, while Pact captures concrete consumer expectations and gates deploys. They cover different risks, so running both gives broader protection. See our Schemathesis guide for how that complements consumer-driven contracts.

### How do provider states keep tests deterministic?

A provider state is a named precondition declared with \`given(...)\` on the consumer side and implemented as a setup hook on the provider side. Before replaying an interaction, Pact calls the provider's state handler to seed exactly the data that interaction assumes (for example, "user 101 exists"). This guarantees the provider is in a known state, so verification is repeatable rather than dependent on whatever data happens to be present.

## Conclusion

Consumer-driven contract testing with Pact gives Python teams a fast, reliable way to catch breaking API changes before they reach production, without the cost and flakiness of full integration environments. The pattern is consistent: write a consumer test that records expectations as a contract using matchers, share that contract through a broker, have the provider verify it with proper provider states, publish the results, and gate every deploy with \`can-i-deploy\`. Each piece is small, runs at unit-test speed, and slots directly into pytest and your existing CI.

Start with one critical consumer-provider pair, get the loop working end to end, and expand from there. The dependency graph in your broker quickly becomes the most honest documentation of how your services actually rely on each other. For the wider picture, pair this with our [API contract testing for microservices guide](/blog/api-contract-testing-microservices).

Want to give your AI coding agents a ready-made contract testing skill, plus dozens of other QA capabilities? Explore the full directory at [qaskills.sh/skills](/skills) and install the skills that match your stack.
`,
};
