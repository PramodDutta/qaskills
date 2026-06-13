import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Schemathesis Tutorial: OpenAPI Fuzzing & Contract Testing',
  description:
    'Learn Schemathesis for API property-based testing and OpenAPI fuzzing. Run the CLI, use the pytest plugin, add stateful testing, hooks, checks, and CI.',
  date: '2026-06-13',
  category: 'Guide',
  content: `
# Schemathesis Tutorial: OpenAPI Fuzzing & Contract Testing

Most API test suites only check the cases the developer thought of. You write a test that sends a valid payload, asserts a 200, sends one obviously-bad payload, and asserts a 400. That covers maybe a dozen of the billions of inputs your endpoint will actually receive in production. Schemathesis flips this model on its head. Instead of asking you to enumerate examples, it reads your OpenAPI (or GraphQL) schema, understands the shape of every parameter and request body, and then generates a flood of valid and invalid inputs automatically, hunting for the requests that crash your server, violate your own contract, or return responses that do not match what your schema promises. This is property-based testing applied to APIs, and it routinely finds bugs that hand-written tests never would: the integer field that overflows, the optional parameter that returns a 500 when omitted, the endpoint that claims to return JSON but returns an HTML error page under load.

This tutorial is a complete, runnable walkthrough of Schemathesis from first install to CI integration. We start with the one-line CLI that points at a live OpenAPI document and immediately starts fuzzing. Then we move into the pytest plugin, where \`schemathesis.from_uri\` and the \`@schema.parametrize\` decorator turn your entire API surface into a parametrized test suite you control. We cover the built-in checks that define what "passing" means, the hooks that let you inject authentication and shape the generated data, stateful testing that chains requests together using the links declared in your schema, and the Hypothesis settings that tune how hard Schemathesis searches. Finally we wire the whole thing into a CI pipeline so every pull request gets fuzzed automatically. Every command and code block here is real and runs against any OpenAPI 3.x or Swagger 2.0 service.

## What Schemathesis Actually Does

Schemathesis is a Python tool built on top of Hypothesis, the most established property-based testing library in the Python ecosystem. Where a traditional test asserts a specific input produces a specific output, a property-based test asserts that some property holds for all inputs in a domain, and the framework generates a wide sample of that domain to try to falsify the property. Schemathesis specializes this idea for HTTP APIs. It treats your OpenAPI schema as the specification of the input domain: the parameters, their types, their formats, their constraints, the required fields, the enums. From that, it derives a generator that can produce any valid request and a great many invalid ones, then sends them and inspects the responses against a set of contract properties.

The properties it checks are the things every well-behaved API should satisfy regardless of input. The server should never return a 500. The response should conform to the response schema declared for that status code. The \`Content-Type\` header should match what the schema says it returns. If the schema says a field is an integer between 1 and 100, sending 101 should produce a documented 4xx, not an unhandled exception. These are exactly the invariants that hand-written example tests tend to miss, because nobody writes a test for "what happens when this optional string is twelve thousand characters long." This is the natural complement to specification-first workflows; for the design side of that practice, see the [OpenAPI contract testing guide](/blog/openapi-contract-testing-guide) and the broader [API testing complete guide](/blog/api-testing-complete-guide).

## Installation and First Run

Schemathesis installs from PyPI like any other Python package. It ships both a command-line tool (\`st\`, with \`schemathesis\` as an alias) and a pytest plugin, both from the same install.

\`\`\`bash
# Install into a fresh virtual environment
python -m venv .venv
source .venv/bin/activate
pip install schemathesis

# Verify the CLI is available
st --version
\`\`\`

With that in place, the fastest possible smoke test is to point the CLI at a running service's OpenAPI document. Schemathesis fetches the schema, enumerates every operation, and starts generating requests.

\`\`\`bash
# Fuzz a live API described by its OpenAPI document
st run http://localhost:8000/openapi.json

# Or against a remote service
st run https://api.example.com/openapi.json --base-url https://api.example.com
\`\`\`

That single command will, for every endpoint in the schema, generate a batch of inputs, send them, and report any request that triggered a failing check. The output groups failures by the check that failed and prints a minimal reproducing \`curl\` command for each one, so you can paste it into a terminal and watch the bug happen. This is the entire value proposition in one line: zero example-writing, immediate coverage of every documented operation.

## Reading the CLI Output

The CLI output is dense but readable once you know the structure. Each operation gets a line showing how many examples were generated and whether any check failed. A failing operation expands into a section per failed check, each with the exact request, the response, and a reproduction command. Common flags shape the run.

\`\`\`bash
# Limit examples per operation to keep runs fast in CI
st run http://localhost:8000/openapi.json --max-examples 50

# Run only specific operations by path and method
st run http://localhost:8000/openapi.json --include-path /users --include-method POST

# Pass authentication and a base URL
st run http://localhost:8000/openapi.json \\
  --base-url http://localhost:8000 \\
  --header "Authorization: Bearer \${API_TOKEN}"

# Enable every built-in check explicitly
st run http://localhost:8000/openapi.json --checks all
\`\`\`

The table below summarizes the flags you will reach for most often when running the CLI day to day.

| Flag | Purpose | Typical value |
|---|---|---|
| \`--base-url\` | Where to send requests if it differs from the schema host | \`http://localhost:8000\` |
| \`--max-examples\` | Cap generated inputs per operation | \`50\` to \`200\` |
| \`--checks\` | Which contract checks to run | \`all\` |
| \`--include-path\` | Restrict to matching paths | \`/users\` |
| \`--header\` | Inject auth or other headers | \`Authorization: Bearer ...\` |
| \`--workers\` | Parallelize across operations | number of CPUs |
| \`--hypothesis-seed\` | Reproduce a run deterministically | any integer |

## Using Schemathesis as a Pytest Plugin

The CLI is perfect for smoke tests and CI gates, but for serious test suites you want the pytest plugin. It gives you full control: you can add assertions, set up and tear down fixtures, inject authentication per test, and integrate with your existing test infrastructure. The entry point is loading the schema and using the \`@schema.parametrize()\` decorator, which turns one test function into a parametrized test that runs once per operation in the schema.

\`\`\`python
import schemathesis

# Load the schema once at module import
schema = schemathesis.from_uri("http://localhost:8000/openapi.json")


@schema.parametrize()
def test_api(case):
    # 'case' is a single generated request for one operation
    response = case.call()
    # Run every built-in contract check against the response
    case.validate_response(response)
\`\`\`

When you run \`pytest\`, this single function expands into one test per API operation, and Hypothesis drives many examples through each. \`case.call()\` sends the generated request using \`requests\` under the hood, and \`case.validate_response(response)\` runs the full battery of checks: status-code validity, response-schema conformance, content-type matching, and more. If you are testing an ASGI or WSGI app in-process (FastAPI, Flask, Starlette), you can skip the network entirely.

\`\`\`python
import schemathesis
from myapp.main import app  # a FastAPI/Starlette ASGI app

# Test the app in-process, no running server needed
schema = schemathesis.from_asgi("/openapi.json", app)


@schema.parametrize()
def test_api(case):
    response = case.call_asgi()
    case.validate_response(response)
\`\`\`

Loading the app in-process is dramatically faster and removes an entire class of flakiness from network and port management, which makes it the preferred mode for unit-level contract testing. If you are new to pytest itself, the [pytest patterns skill](/skills) and surrounding testing playbooks cover fixtures and parametrization in depth.

## Built-in Checks Explained

A "check" in Schemathesis is a function that inspects a response and decides whether the contract was honored. By default several run, and \`--checks all\` (or \`validate_response\`) runs the full set. Understanding what each one asserts tells you what kind of bug a failure represents.

| Check | What it verifies | Bug it catches |
|---|---|---|
| \`not_a_server_error\` | No 5xx status code | Unhandled exceptions, crashes |
| \`status_code_conformance\` | Status code is documented in the schema | Undocumented error paths |
| \`content_type_conformance\` | Response Content-Type matches the schema | HTML error page where JSON promised |
| \`response_schema_conformance\` | Response body validates against the response schema | Missing fields, wrong types in output |
| \`response_headers_conformance\` | Declared response headers are present | Missing required headers |

You can select a subset in the CLI with \`--checks not_a_server_error,response_schema_conformance\`, or in code by passing explicit checks to \`validate_response\`. Most teams start with \`all\` and only narrow it down if a specific check produces noise they have a deliberate reason to ignore. The \`not_a_server_error\` check alone justifies adopting the tool, because it finds the inputs that crash your service, which are precisely the inputs an attacker or a buggy client will eventually send. For the contract-stability angle across services, the [API contract testing for microservices guide](/blog/api-contract-testing-microservices) covers consumer-driven approaches that pair well with schema fuzzing.

## Authentication and Hooks

Real APIs require authentication, and generated data often needs shaping to be useful. Schemathesis exposes hooks for exactly this. The simplest authentication approach passes a header through the schema loader so every generated case carries it.

\`\`\`python
import schemathesis

schema = schemathesis.from_uri(
    "http://localhost:8000/openapi.json",
    headers={"Authorization": "Bearer test-token"},
)
\`\`\`

For more control, register hooks that run at specific points in the generation and call lifecycle. A common need is to replace generated values for a particular field with realistic ones, because a random string is not a valid user ID. The \`map_query\`, \`map_body\`, and related hooks let you transform the generated data before it is sent.

\`\`\`python
import schemathesis

schema = schemathesis.from_uri("http://localhost:8000/openapi.json")


@schema.hook
def before_call(context, case):
    # Inject a fresh auth token on every request
    case.headers = case.headers or {}
    case.headers["Authorization"] = f"Bearer {get_fresh_token()}"


@schema.hook
def map_body(context, body):
    # Force a valid, existing email domain into generated bodies
    if isinstance(body, dict) and "email" in body:
        local = str(body["email"]).split("@")[0] or "user"
        body["email"] = f"{local}@example.com"
    return body


def get_fresh_token() -> str:
    # Call your auth endpoint, cache, refresh as needed
    return "test-token"
\`\`\`

Hooks are how you go from "fuzzing returns mostly 401s because nothing is authenticated" to "fuzzing actually exercises the business logic behind your auth wall," which is where the interesting bugs live. Register them once and every generated case for every operation benefits.

## Stateful Testing with API Links

Single-request fuzzing is powerful, but many real bugs only appear in sequences: create a resource, then fetch it, then delete it, then try to fetch it again. Schemathesis supports stateful testing by reading the \`links\` declared in your OpenAPI schema, which describe how the output of one operation feeds the input of another. From those links it builds chains of requests and explores them as state machines, catching bugs like a resource that remains fetchable after deletion or an ID returned by a create call that the get call rejects.

\`\`\`python
import schemathesis
from schemathesis.stateful import Stateful

schema = schemathesis.from_uri("http://localhost:8000/openapi.json")


@schema.parametrize()
@schema.given(data=schemathesis.stateful)  # illustrative; see config below
def test_stateful(case):
    case.call_and_validate()
\`\`\`

In practice the cleanest way to run stateful tests is the test-suite generator the library exposes, or the CLI flag, which requires no extra code at all.

\`\`\`bash
# Run stateful, link-driven sequences from the CLI
st run http://localhost:8000/openapi.json --stateful=links --checks all
\`\`\`

For stateful testing to find sequence bugs, your schema needs \`links\` defined on the relevant operations. If you have not declared them, single-request fuzzing still runs, you just do not get the chained exploration. Adding links is a one-time schema investment that pays off every run, and it doubles as living documentation of how your endpoints relate.

## Tuning with Hypothesis Settings

Because Schemathesis is built on Hypothesis, you control how hard it searches using Hypothesis settings: how many examples per operation, how long to spend, what to do about slow generation, and how to make runs deterministic. In the pytest plugin you apply settings with the standard \`@settings\` decorator.

\`\`\`python
import schemathesis
from hypothesis import settings, HealthCheck

schema = schemathesis.from_uri("http://localhost:8000/openapi.json")


@schema.parametrize()
@settings(
    max_examples=100,             # inputs generated per operation
    deadline=None,                # disable per-example time limit for slow APIs
    suppress_health_check=[HealthCheck.too_slow],
    derandomize=False,            # set True for reproducible CI runs
)
def test_api(case):
    case.call_and_validate()
\`\`\`

The two settings you will adjust most are \`max_examples\` and \`deadline\`. More examples means a deeper search and a better chance of finding a rare bug, at the cost of time. Disabling the deadline is often necessary because a real API call can legitimately take longer than Hypothesis's default per-example budget, and you do not want a slow-but-correct endpoint flagged as a failure. For CI you may want \`derandomize=True\` or a fixed seed so a failure is reproducible by a teammate.

| Setting | Effect | When to change it |
|---|---|---|
| \`max_examples\` | Inputs generated per operation | Raise for nightly deep runs, lower for fast PR gates |
| \`deadline\` | Per-example time limit | Set \`None\` for slow real-network APIs |
| \`suppress_health_check\` | Silence Hypothesis warnings | Add \`too_slow\` for slow generation |
| \`derandomize\` | Deterministic example generation | \`True\` for reproducible CI failures |

## Integrating Schemathesis into CI

The payoff of all this is automated contract fuzzing on every pull request. The CLI is the easiest entry point because it returns a non-zero exit code when any check fails, which is exactly what a CI gate needs. Here is a GitHub Actions job that boots the service, waits for it, and fuzzes it.

\`\`\`yaml
name: API Contract Fuzzing
on: [push, pull_request]
jobs:
  schemathesis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install deps
        run: |
          pip install -r requirements.txt
          pip install schemathesis
      - name: Start API
        run: |
          uvicorn myapp.main:app --port 8000 &
          for i in $(seq 1 30); do curl -sf http://localhost:8000/openapi.json && break || sleep 1; done
      - name: Run Schemathesis
        run: |
          st run http://localhost:8000/openapi.json \\
            --checks all \\
            --stateful=links \\
            --max-examples 100 \\
            --report
\`\`\`

For teams that prefer the pytest plugin, the CI step is simply \`pytest\`, and the contract tests run alongside your unit and integration tests with the same reporting and the same exit-code semantics. Either way, the result is a gate that catches a server-crashing input or a schema-violating response before it merges. This is the property-based complement to consumer-driven contract testing; the [Pact contract testing complete guide](/blog/pact-contract-testing-complete-guide-2026) covers that consumer-provider side, and the two together give you both directions of contract confidence.

## Triaging and Fixing Failures

When Schemathesis reports a failure it gives you everything needed to reproduce it: the operation, the failing check, the exact generated request, the response, and a copy-paste \`curl\` command. The triage workflow is mechanical. Reproduce the request locally with the provided \`curl\`. Read which check failed to know the category of bug. If \`not_a_server_error\` failed, you have an unhandled input crashing the service, so add validation or error handling. If \`response_schema_conformance\` failed, either your handler returns the wrong shape or your schema is wrong, so fix whichever is actually incorrect. If \`status_code_conformance\` failed, your API returns an undocumented status, so either document it or stop returning it.

A useful discipline is that every Schemathesis failure resolves to one of two actions: fix the implementation to honor the contract, or fix the contract to match reality. Both make your API more honest. Crucially, never silently ignore a failure by narrowing the checks, because a check you turned off is a class of bug you stopped looking for. When a generated input is genuinely invalid for a reason your schema cannot express, the right fix is to tighten the schema with the missing constraint, which also improves the documentation every consumer relies on.

## Frequently Asked Questions

### What is Schemathesis and how does it work?

Schemathesis is a Python tool that performs property-based testing of web APIs. It reads your OpenAPI or GraphQL schema, derives the input domain for every operation, and uses Hypothesis to generate large numbers of valid and invalid requests. It sends them and checks each response against contract properties such as "no 5xx errors" and "the body matches the declared response schema," surfacing the inputs that crash your service or violate your own specification.

### How do I run Schemathesis from the command line?

Install it with \`pip install schemathesis\`, then run \`st run http://localhost:8000/openapi.json\` against a live service. Add \`--checks all\` to enable every contract check, \`--base-url\` if the host differs from the schema, \`--header\` for authentication, and \`--max-examples\` to cap generated inputs. The CLI returns a non-zero exit code on failure, so it works directly as a CI gate without extra scripting.

### How do I use Schemathesis with pytest?

Load your schema with \`schema = schemathesis.from_uri("http://localhost:8000/openapi.json")\`, then decorate a test function with \`@schema.parametrize()\`. Inside, call \`case.call()\` to send the generated request and \`case.validate_response(response)\` to run the checks. When you run \`pytest\`, the one function expands into a parametrized test per API operation, with Hypothesis driving many examples through each one.

### What is the difference between Schemathesis and example-based API tests?

Example-based tests assert that specific inputs produce specific outputs, so they only cover the cases you thought to write. Schemathesis is property-based: it generates a broad sample of inputs from your schema and checks that universal properties hold for all of them. This finds edge cases hand-written tests miss, such as boundary integers, oversized strings, and omitted optional fields that trigger unhandled 500 errors.

### What is stateful testing in Schemathesis?

Stateful testing exercises sequences of requests rather than single calls. Schemathesis reads the \`links\` declared in your OpenAPI schema, which describe how one operation's output feeds another's input, and builds chains such as create then fetch then delete. Run it with \`st run ... --stateful=links\`. It catches sequence bugs like a resource that stays fetchable after deletion, which single-request fuzzing cannot find.

### How do I add authentication to Schemathesis tests?

Pass a header through the loader with \`schemathesis.from_uri(url, headers={"Authorization": "Bearer token"})\`, which applies it to every generated request. For dynamic tokens, register a \`before_call\` hook that injects a fresh token on each request. Without authentication, fuzzing mostly returns 401s and never reaches your business logic, so wiring in auth is what lets Schemathesis exercise the interesting code paths.

### How do I make Schemathesis runs faster or more thorough?

Tune the underlying Hypothesis settings. Lower \`max_examples\` (for example to 30) for fast pull-request gates, and raise it (to 200 or more) for deep nightly runs. Set \`deadline=None\` so slow but correct real-network calls are not flagged. Use \`--workers\` in the CLI to parallelize across operations, and set a fixed \`--hypothesis-seed\` when you need a failure to be reproducible by a teammate.

## Conclusion

Schemathesis closes the gap between what your API claims to do and what it actually does. By reading your OpenAPI schema and generating a flood of inputs no human would think to write, it finds the crashing requests, the contract violations, and the undocumented error paths that example-based tests systematically miss. The adoption path is gentle: start with the one-line CLI (\`st run http://localhost:8000/openapi.json\`) for an instant smoke test, graduate to the pytest plugin with \`schemathesis.from_uri\` and \`@schema.parametrize\` when you want assertions and fixtures, add hooks for authentication and data shaping, turn on stateful testing once your schema declares its links, and tune Hypothesis settings to balance speed against depth. Wire the CLI into CI and every pull request gets fuzzed automatically, catching server-crashing inputs before they merge. Pair it with consumer-driven approaches from the [API contract testing for microservices guide](/blog/api-contract-testing-microservices) and browse the [QA skills directory](/skills) for ready-to-use testing playbooks to round out a contract-testing strategy that covers both directions of trust between your services.
`,
};
