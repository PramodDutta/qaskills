import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Pact Contract Testing in Python: Consumer-Driven Guide',
  description:
    'Learn consumer-driven contract testing with Pact in Python: write consumer tests, generate pact files, verify providers, use the Pact Broker and can-i-deploy.',
  date: '2026-07-06',
  category: 'Guide',
  content: `
# Pact Contract Testing in Python: Consumer-Driven Guide

Microservices promise independent deployment, but they deliver a hidden coupling problem. The moment one service calls another over HTTP, an implicit contract is born: the consumer expects a certain response shape, and the provider promises to deliver it. Nothing enforces that contract at build time. A provider team renames a field, ships on Friday, and three consumer teams discover the breakage in production on Monday. End-to-end tests catch some of this, but they are slow, flaky, and require every service to be running at once, which defeats the whole point of independent deployment.

Consumer-driven contract testing solves this without spinning up the entire system. Instead of integration tests that exercise real services together, each consumer writes a test describing exactly what it needs from a provider. That expectation is captured as a machine-readable contract, called a pact. The provider then replays those expectations against its real implementation to prove it still satisfies every consumer. If the provider breaks a promise, its own test suite fails before the change ever merges. No shared environment, no flaky network, just fast unit-level tests on both sides that together guarantee the integration holds.

Pact is the de facto standard for this approach, and pact-python brings it to Python teams. In this guide you will build a complete workflow: a consumer test that generates a pact file, provider verification that replays it, a Pact Broker to share contracts between teams, the can-i-deploy safety check, and CI integration that ties it all together. The examples are runnable and assume a typical Python stack with requests on the consumer side and a web framework on the provider side. By the end you will understand not just the mechanics but why consumer-driven contracts change how independent teams collaborate safely.

## Why Contract Testing Instead of End-to-End Tests

The instinct when integrating services is to write an end-to-end test that starts both services and checks the interaction. This works for a handful of services and collapses beyond that. End-to-end suites are combinatorially expensive: every service must be deployed, seeded with data, and healthy at once. They are slow because real network calls and databases are slow. They are flaky because any transient failure anywhere fails the whole run. And they give poor feedback: when they fail, you often cannot tell which service broke the contract.

Contract testing decomposes the problem. The consumer proves it can handle a specific response by testing against a mock provider that returns exactly the promised shape. The provider proves it produces that shape by replaying the recorded expectations against its real code. Neither test needs the other service running. Both are fast, deterministic unit-style tests.

| Dimension | End-to-End Tests | Contract Tests (Pact) |
|---|---|---|
| Services required at test time | All of them | One at a time |
| Speed | Slow (real network, real data) | Fast (mocked, in-process) |
| Flakiness | High | Low |
| Failure diagnosis | Ambiguous | Points to the exact broken promise |
| Independent deployability | Undermined | Preserved |
| Feedback location | Late, shared environment | Early, in each team's CI |

Contract testing does not replace all end-to-end testing. You still want a small number of smoke tests for critical journeys. But it removes the need for large, brittle integration suites by shifting integration confidence into fast tests each team owns. If you are moving an AI-driven test suite toward this model, our guide on [how AI agents are changing QA testing](/blog/how-ai-agents-changing-qa-testing) covers the broader shift toward faster, more isolated feedback loops.

## Installing pact-python and Project Layout

Start by installing pact-python. It ships the mock service and provider verifier binaries alongside the Python library, so a single install gives you both sides of the workflow.

\`\`\`bash
pip install pact-python
# or, pinned in requirements.txt / pyproject.toml
# pact-python==2.2.0
\`\`\`

A clean layout keeps consumer and provider concerns separate. In a monorepo you might have both; in polyrepos each service owns its half.

\`\`\`text
project/
  consumer/
    order_client.py          # the HTTP client under test
    tests/
      test_order_client_pact.py
    pacts/                    # generated pact files land here
  provider/
    app.py                   # the provider API
    tests/
      test_provider_verification.py
\`\`\`

The consumer produces pact files into a directory; the provider consumes them. In a real setup those files travel between teams through a Pact Broker rather than a shared folder, which we cover later. For now, a local directory keeps the first example simple and fully runnable on one machine.

## Writing the Consumer Test

The consumer is whichever service makes the HTTP call. Here is a small client that fetches an order from an order service. It is deliberately plain so the contract test stays focused on the interaction, not the client internals.

\`\`\`python
# consumer/order_client.py
import requests


class OrderClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def get_order(self, order_id: int) -> dict:
        response = requests.get(f"{self.base_url}/orders/{order_id}")
        response.raise_for_status()
        return response.json()
\`\`\`

Now the consumer test. It stands up a Pact mock provider, declares the expected interaction (given a provider state, upon a request, the provider will respond with a body), points the client at the mock, and asserts the client handles the response. Running this test records the interaction into a pact file.

\`\`\`python
# consumer/tests/test_order_client_pact.py
import atexit

import pytest
from pact import Consumer, Provider, Like, Term

from consumer.order_client import OrderClient

PACT_MOCK_HOST = "localhost"
PACT_MOCK_PORT = 1234
PACT_DIR = "consumer/pacts"

pact = Consumer("OrderConsumer").has_pact_with(
    Provider("OrderService"),
    host_name=PACT_MOCK_HOST,
    port=PACT_MOCK_PORT,
    pact_dir=PACT_DIR,
)
pact.start_service()
atexit.register(pact.stop_service)


def test_get_existing_order():
    expected_body = {
        "id": Like(42),
        "status": Term(r"pending|shipped|delivered", "shipped"),
        "total": Like(129.95),
        "currency": Like("USD"),
    }

    (
        pact.given("an order with ID 42 exists")
        .upon_receiving("a request for order 42")
        .with_request("get", "/orders/42")
        .will_respond_with(200, body=expected_body)
    )

    with pact:
        client = OrderClient(f"http://{PACT_MOCK_HOST}:{PACT_MOCK_PORT}")
        order = client.get_order(42)

        assert order["id"] == 42
        assert order["status"] == "shipped"
        assert order["currency"] == "USD"
\`\`\`

Two matchers do the heavy lifting here. \`Like\` (type matcher) says the field must be the same type as the example, not the exact value, so the provider is free to return any integer id or any float total. \`Term\` (regex matcher) constrains a string to a pattern, which is perfect for enumerations like order status. Using matchers instead of literal values keeps the contract about structure and type, not brittle exact data. That distinction is what makes contracts stable as real data varies.

## Understanding the Generated Pact File

When the consumer test passes, Pact writes a JSON pact file into the pact directory, named for the consumer and provider pair. This file is the contract. It is not something you edit by hand; it is generated, versioned, and shared.

\`\`\`json
{
  "consumer": { "name": "OrderConsumer" },
  "provider": { "name": "OrderService" },
  "interactions": [
    {
      "description": "a request for order 42",
      "providerState": "an order with ID 42 exists",
      "request": { "method": "GET", "path": "/orders/42" },
      "response": {
        "status": 200,
        "body": { "id": 42, "status": "shipped", "total": 129.95, "currency": "USD" },
        "matchingRules": {
          "$.body.status": { "match": "regex", "regex": "pending|shipped|delivered" }
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "2.0.0" } }
}
\`\`\`

Notice the \`providerState\` field: "an order with ID 42 exists". This is the crucial handshake. The consumer does not care how the provider makes that state true; it only names the precondition. During verification, the provider is responsible for setting up that state (seeding the database, mocking a repository) before replaying the request. The \`matchingRules\` block encodes the matchers so the provider verification enforces the regex on status while allowing flexible values elsewhere. This generated artifact is the single source of truth both teams verify against.

## Verifying the Provider

The provider side takes the pact file and replays every interaction against the real running provider. Before each interaction, it applies the named provider state. Below is a provider verification test using pact-python's Verifier. It assumes the provider app is started (or startable) at a known URL and exposes a state-setup endpoint that maps state names to setup actions.

\`\`\`python
# provider/tests/test_provider_verification.py
import pytest
from pact import Verifier

PROVIDER_BASE_URL = "http://localhost:8000"
PROVIDER_STATES_URL = "http://localhost:8000/_pact/provider_states"
PACT_FILE = "consumer/pacts/orderconsumer-orderservice.json"


def test_provider_honors_pact():
    verifier = Verifier(
        provider="OrderService",
        provider_base_url=PROVIDER_BASE_URL,
    )

    success, logs = verifier.verify_pacts(
        PACT_FILE,
        provider_states_setup_url=PROVIDER_STATES_URL,
    )

    assert success == 0, f"Provider verification failed:\\n{logs}"
\`\`\`

The provider must implement the state-setup endpoint. It receives the state name from the pact and puts the system into that state. Here is a minimal Flask example; the same idea applies to FastAPI or Django.

\`\`\`python
# provider/app.py (excerpt)
from flask import Flask, jsonify, request

app = Flask(__name__)
ORDERS = {}


@app.route("/_pact/provider_states", methods=["POST"])
def provider_states():
    state = request.get_json()["state"]
    if state == "an order with ID 42 exists":
        ORDERS[42] = {"id": 42, "status": "shipped", "total": 129.95, "currency": "USD"}
    return jsonify({"result": state})


@app.route("/orders/<int:order_id>")
def get_order(order_id):
    order = ORDERS.get(order_id)
    if order is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(order)
\`\`\`

When verification runs, Pact posts each state to the setup endpoint, then replays the recorded request and checks the real response against the contract's matching rules. If the provider renamed \`currency\` to \`currency_code\`, verification fails immediately with a clear diff, in the provider's own CI, before the change can break the consumer. That early, specific failure is the entire payoff of contract testing.

## The Pact Broker: Sharing Contracts Between Teams

Passing pact files through a shared folder works on one machine but not across teams that deploy independently. The Pact Broker is a service that stores pacts and verification results, versioned by application version and tagged by environment. The consumer publishes its pact to the broker; the provider pulls the latest relevant pacts to verify; both record results the broker can reason about.

You can run the open-source broker yourself or use PactFlow, the hosted commercial broker. Either way, the consumer publishes after its test passes.

\`\`\`bash
# Publish consumer pacts to the broker, tagged with the git commit and branch
pact-broker publish consumer/pacts \\
  --consumer-app-version "$(git rev-parse --short HEAD)" \\
  --branch "$(git rev-parse --abbrev-ref HEAD)" \\
  --broker-base-url "$PACT_BROKER_URL" \\
  --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

The provider verification then pulls pacts from the broker instead of a local file and publishes its results back, so the broker knows which provider versions satisfy which consumer versions.

\`\`\`python
# provider verification against the broker
from pact import Verifier

verifier = Verifier(provider="OrderService", provider_base_url="http://localhost:8000")

success, logs = verifier.verify_with_broker(
    broker_url="https://your-org.pactflow.io",
    broker_token="REDACTED_TOKEN",
    provider_version="abc1234",
    provider_version_branch="main",
    publish_verification_results=True,
    provider_states_setup_url="http://localhost:8000/_pact/provider_states",
)

assert success == 0, logs
\`\`\`

With the broker in place, the two teams never coordinate manually. The consumer publishes what it needs, the provider verifies it can deliver, and the broker becomes the shared record of which versions are compatible. That record is exactly what the next step, can-i-deploy, queries to make deployment safe.

## can-i-deploy: The Deployment Safety Gate

The broker knows which consumer and provider versions have verified against each other. The can-i-deploy tool turns that knowledge into a yes-or-no deployment decision. Before you deploy a service to an environment, you ask the broker: are all the integrations this version participates in verified as compatible with what is already deployed there? If yes, deploy. If no, the command exits non-zero and blocks the release.

\`\`\`bash
# Before deploying OrderService to production, confirm every consumer is satisfied
pact-broker can-i-deploy \\
  --pacticipant "OrderService" \\
  --version "abc1234" \\
  --to-environment production \\
  --broker-base-url "$PACT_BROKER_URL" \\
  --broker-token "$PACT_BROKER_TOKEN" \\
  --retry-while-unknown 6 \\
  --retry-interval 10
\`\`\`

This is the piece that makes contract testing safe for continuous deployment. Instead of hoping nothing broke, you get a deterministic gate backed by real verification results. If a provider change would break a consumer that is live in production, can-i-deploy says no and the pipeline stops. The retry flags handle the race where verification is still running when the deploy job asks.

| Command | Runs Where | Purpose |
|---|---|---|
| \`pytest\` (consumer test) | Consumer CI | Generates the pact from real client expectations |
| \`pact-broker publish\` | Consumer CI | Shares the pact with all provider teams |
| \`verify_with_broker\` | Provider CI | Proves the provider satisfies every consumer pact |
| \`can-i-deploy\` | Before any deploy | Blocks releases that would break a live integration |

## Integrating Pact into CI/CD

Wiring the pieces into CI makes the whole system automatic. The consumer pipeline runs its Pact tests, publishes the pact, and gates its own deploy with can-i-deploy. The provider pipeline verifies against the broker on every change and gates its deploy the same way. A webhook from the broker can even trigger provider verification automatically whenever a new consumer pact is published, closing the loop so a consumer change gets validated by the provider without manual coordination.

Here is a representative GitHub Actions job for the consumer side. The provider side mirrors it, swapping the test step for verification.

\`\`\`yaml
name: consumer-contract
on: [push]

jobs:
  contract:
    runs-on: ubuntu-latest
    env:
      PACT_BROKER_URL: \${{ secrets.PACT_BROKER_URL }}
      PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install pact-python
      - name: Run consumer contract tests
        run: pytest consumer/tests -q
      - name: Publish pact to broker
        run: |
          pact-broker publish consumer/pacts \\
            --consumer-app-version "\${{ github.sha }}" \\
            --branch "\${{ github.ref_name }}" \\
            --broker-base-url "$PACT_BROKER_URL" \\
            --broker-token "$PACT_BROKER_TOKEN"
      - name: can-i-deploy gate
        run: |
          pact-broker can-i-deploy \\
            --pacticipant OrderConsumer \\
            --version "\${{ github.sha }}" \\
            --to-environment production \\
            --broker-base-url "$PACT_BROKER_URL" \\
            --broker-token "$PACT_BROKER_TOKEN"
\`\`\`

The design principle is that each team's pipeline is independent but the broker connects them. No team waits on a shared environment; each proves its half and consults the broker before deploying. For teams pairing this with AI-generated tests, the same review discipline from our [TDD with AI agents guide](/blog/tdd-ai-agents-best-practices) applies: let agents draft consumer expectations, but keep human review on the contract before it becomes the shared source of truth.

## Common Pitfalls and Best Practices

The most common mistake is over-specifying the contract with literal values instead of matchers. If your consumer test asserts an exact total of 129.95, the provider must return exactly that number forever, which is absurd. Use \`Like\` for types and \`Term\` for patterns so the contract constrains structure, not data. A contract should describe what the consumer needs to function, nothing more. Every unnecessary field you assert becomes a promise the provider cannot change.

A second pitfall is treating provider states carelessly. Each state must be reliably reproducible in isolation, and state names must match exactly between consumer and provider. Keep them descriptive and stable. A third pitfall is forgetting that only the fields the consumer actually uses belong in the contract. Consumer-driven means the consumer defines its needs; adding provider fields the consumer ignores just creates false coupling.

| Pitfall | Consequence | Best Practice |
|---|---|---|
| Literal values instead of matchers | Brittle contracts break on data changes | Use \`Like\` and \`Term\` for flexible matching |
| Vague or mismatched provider states | Verification fails or is unreproducible | Name states clearly, set them up in isolation |
| Asserting unused fields | False coupling, needless breakage | Only include what the consumer consumes |
| Skipping can-i-deploy | Breaking changes reach production | Gate every deploy on the broker's verdict |
| No branch or version tagging | Broker cannot reason about environments | Tag with git sha and branch on publish |

Follow these and Pact becomes a quiet safety net rather than a maintenance burden. Browse the [QA skills directory](/skills) for reusable contract-testing and API-testing patterns your team and AI agents can standardize on.

## Frequently Asked Questions

### What is consumer-driven contract testing?

Consumer-driven contract testing is an approach where the consumer of an API defines exactly what it needs from a provider as a machine-readable contract, called a pact. The provider then verifies it can satisfy every consumer's expectations by replaying them against its real implementation. This catches breaking changes early, in each team's own CI, without requiring both services to run together.

### How does Pact differ from end-to-end testing?

End-to-end tests require every service running at once, making them slow, flaky, and hard to diagnose. Pact tests run each side in isolation: the consumer tests against a mock provider, and the provider replays recorded expectations against its own code. Both are fast, deterministic unit-style tests. Together they guarantee the integration holds while preserving each team's ability to deploy independently.

### What is a Pact Broker and do I need one?

A Pact Broker is a service that stores pacts and verification results, versioned by application version and tagged by environment. It lets independent teams share contracts without passing files manually and powers the can-i-deploy safety check. For a single repo you can start with local files, but any real multi-team setup needs a broker, either the open-source version or the hosted PactFlow.

### What does can-i-deploy do?

can-i-deploy asks the Pact Broker whether a specific version of a service is verified as compatible with everything currently deployed in a target environment. If every relevant integration has passed verification, it returns success and you deploy. If any contract is unsatisfied, it exits non-zero and blocks the release, turning contract verification into a deterministic deployment safety gate.

### How do provider states work in pact-python?

A provider state is a named precondition the consumer declares, such as "an order with ID 42 exists." During verification, Pact posts each state name to a provider state-setup endpoint before replaying the request. The provider uses that hook to seed data or configure mocks so the interaction can succeed. State names must match exactly between the consumer pact and the provider setup.

### Should I use Like and Term matchers or exact values?

Prefer matchers. \`Like\` enforces that a field is the correct type without pinning an exact value, and \`Term\` constrains strings to a regex pattern, which is ideal for enumerations like status. Exact values create brittle contracts that break whenever real data changes. A good contract describes structure and type, capturing what the consumer needs to function rather than a specific data snapshot.

### Can I use Pact with FastAPI or Django, not just Flask?

Yes. Pact is framework-agnostic on the provider side because verification is just HTTP replay against a running provider plus a state-setup endpoint. The examples here use Flask, but the same pattern works with FastAPI, Django, or any web framework: expose a provider-states route that maps state names to setup actions, then run the Pact Verifier against your app's base URL.

## Conclusion

Consumer-driven contract testing with Pact gives independent teams the confidence to deploy on their own schedules without breaking each other. The consumer defines what it needs, the provider proves it delivers, the broker records who is compatible with whom, and can-i-deploy turns that record into a safe, automatic deployment gate. You get the integration confidence of end-to-end tests with the speed and reliability of unit tests, and every breakage surfaces early in the responsible team's CI with a precise diff.

Start small: write one consumer test, generate one pact, verify it against your provider, then add the broker and can-i-deploy once the loop feels natural. To equip your team and your AI coding agents with reusable contract-testing and API patterns, explore the [QASkills directory](/skills) and give your agents the standards that keep generated tests trustworthy at scale.
`,
};
