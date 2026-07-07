import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Schemathesis Property-Based API Testing From an OpenAPI Spec',
  description:
    'Learn Schemathesis property-based API testing from an OpenAPI spec: auto-generate tests, run Hypothesis fuzzing, stateful testing, and catch schema drift in CI.',
  date: '2026-07-07',
  category: 'Guide',
  content: `
# Schemathesis Property-Based API Testing From an OpenAPI Spec

Most API test suites are a long list of examples a human thought of on a good day. They pass because they only ever exercise the paths the author remembered. Schemathesis flips that model. It reads your OpenAPI (or GraphQL) specification, treats the spec as an executable contract, and then generates thousands of test cases that probe the space of inputs your API claims to accept. Instead of asserting "GET /users/42 returns 200", it asserts a property: "for every request the schema says is valid, the response must conform to the schema and the server must not crash".

This is property-based testing applied to HTTP APIs, powered underneath by the Python Hypothesis library. In this guide you will learn how Schemathesis turns a spec into tests, how to run it from the CLI and from pytest, how stateful testing chains operations together, how to wire it into CI, and how it surfaces the single most valuable class of API bug: drift between what your spec promises and what your implementation actually does.

## Why Property-Based Testing Beats Example Tests

An example-based test encodes one concrete input and one expected output. A property-based test encodes an invariant that must hold across a whole family of inputs, then lets the framework search that family for a counterexample. When it finds one, Hypothesis shrinks it to the smallest input that still fails, so instead of a 4KB random JSON blob you get a two-field payload that reproduces the bug.

For APIs this matters because the input space is enormous. A single endpoint with three optional query parameters, a nullable body field, and a string with a \`maxLength\` already has more meaningful combinations than anyone writes by hand. Schemathesis reads those constraints straight from the spec and generates boundary values, empty strings, huge integers, unicode, and nulls automatically.

| Aspect | Example-based tests | Schemathesis property tests |
| --- | --- | --- |
| Input coverage | Only what the author wrote | Generated across the spec's input space |
| Boundary values | Manual, often forgotten | Automatic (min, max, empty, null) |
| Maintenance | Every case hand-maintained | Regenerated from the spec each run |
| Failure output | The failing assertion | Minimal shrunk reproducer + curl command |
| Best at finding | Known regressions | Unknown crashes and schema drift |

The two styles are complementary. Keep your example tests for business-critical flows and let Schemathesis carpet-bomb the edges. See our [API testing best practices guide](/blog/api-testing-best-practices-guide) for how to balance the two in one suite.

## Installing Schemathesis

Schemathesis is a Python package. It ships both a standalone CLI and a pytest integration, and both come from the same install.

\`\`\`bash
# Create an isolated environment
python -m venv .venv
source .venv/bin/activate

# Install the CLI and pytest integration
pip install schemathesis

# Verify the install
schemathesis --version
st --version   # 'st' is the short alias
\`\`\`

You need Python 3.8 or newer. If you only want the CLI and never touch pytest, you can also run it through Docker without polluting your environment:

\`\`\`bash
docker run --rm -it \\
  schemathesis/schemathesis:stable \\
  run https://api.example.com/openapi.json
\`\`\`

## Running Your First Test From the CLI

The fastest way to see value is to point the CLI at a running API and its spec. Schemathesis fetches the schema, enumerates every operation, and generates cases for each one.

\`\`\`bash
st run \\
  --url https://api.example.com \\
  https://api.example.com/openapi.json
\`\`\`

If your spec lives on disk and the base URL differs, pass them separately:

\`\`\`bash
st run \\
  --url http://localhost:8000 \\
  ./openapi.yaml
\`\`\`

By default Schemathesis runs a set of built-in checks against every generated response. The most important ones are listed below.

| Check | What it asserts |
| --- | --- |
| \`not_a_server_error\` | The API never returns a 5xx for a spec-valid request |
| \`status_code_conformance\` | The returned status code is documented in the spec |
| \`content_type_conformance\` | The response Content-Type matches the spec |
| \`response_schema_conformance\` | The response body validates against the declared schema |
| \`response_headers_conformance\` | Required response headers are present |

You can select a subset with \`--checks\` when you want a focused run:

\`\`\`bash
st run \\
  --checks response_schema_conformance,not_a_server_error \\
  --url http://localhost:8000 \\
  ./openapi.yaml
\`\`\`

## Understanding Hypothesis-Driven Fuzzing

Under the hood, each Schemathesis test is a Hypothesis strategy derived from the JSON Schema of a request. If a query parameter is \`{ "type": "integer", "minimum": 0, "maximum": 100 }\`, Hypothesis will generate zero, one hundred, values in between, and deliberately probe the edges. If a body field is a string with \`format: email\`, it generates plausible and implausible emails alike.

You control the generation budget with \`--max-examples\`. More examples means deeper search and slower runs.

\`\`\`bash
st run \\
  --max-examples 200 \\
  --url http://localhost:8000 \\
  ./openapi.yaml
\`\`\`

When a case fails, Hypothesis shrinks it. Consider a handler that crashes on an empty \`name\`. Schemathesis might first hit the bug with a 300-character unicode string, but the report shows you the minimal reproducer:

\`\`\`bash
Falsifying example:
  POST /users
  Body: {"name": ""}

Reproduce with:
  curl -X POST http://localhost:8000/users \\
    -H 'Content-Type: application/json' \\
    -d '{"name": ""}'
\`\`\`

That curl line is the payoff. You hand it to a backend engineer and they reproduce the bug in one command, no test framework required.

## Writing pytest Tests With Schemathesis

The CLI is great for CI gates, but pytest integration gives you fine-grained control: custom assertions, auth setup via fixtures, and the ability to run one operation in isolation while you debug it.

\`\`\`python
import schemathesis

# Load the schema once at module level
schema = schemathesis.from_uri("http://localhost:8000/openapi.json")


@schema.parametrize()
def test_api(case):
    # 'case' is a generated request for one operation.
    # calling it sends the request and runs built-in checks.
    response = case.call()
    case.validate_response(response)
\`\`\`

The \`@schema.parametrize()\` decorator explodes into one pytest test per operation in the spec, and Hypothesis then feeds many generated cases into each. You run it like any other test:

\`\`\`bash
pytest test_api.py -v
\`\`\`

To add your own invariants, assert on the response object directly. Here we require that every successful list endpoint returns a JSON array and never leaks an internal field:

\`\`\`python
@schema.parametrize()
def test_no_internal_leak(case):
    response = case.call()
    case.validate_response(response)

    if response.status_code == 200:
        body = response.json()
        if isinstance(body, list):
            for item in body:
                assert "password_hash" not in item
                assert "_internal" not in item
\`\`\`

### Handling Authentication

Real APIs need credentials. Set a header on every generated case with a hook or by configuring the schema loader:

\`\`\`python
import schemathesis

schema = schemathesis.from_uri(
    "http://localhost:8000/openapi.json",
)


@schema.parametrize()
@schema.hooks.apply
def test_authenticated(case):
    case.headers = case.headers or {}
    case.headers["Authorization"] = "Bearer test-token-123"
    response = case.call()
    case.validate_response(response)
\`\`\`

For the CLI, pass auth inline:

\`\`\`bash
st run \\
  --header 'Authorization: Bearer test-token-123' \\
  --url http://localhost:8000 \\
  ./openapi.yaml
\`\`\`

## Stateful Testing: Chaining Operations Together

Single-operation fuzzing finds crashes, but many real bugs live in sequences: create a resource, read it back, delete it, then read it again and expect a 404. Schemathesis reads OpenAPI \`links\` (and can infer some links heuristically) to build these chains automatically. It uses the output of one operation, say the \`id\` returned by \`POST /users\`, as the input to the next, \`GET /users/{id}\`.

Enable stateful testing on the CLI:

\`\`\`bash
st run \\
  --experimental=stateful-test-suite \\
  --url http://localhost:8000 \\
  ./openapi.yaml
\`\`\`

To make this work well, declare links in your spec so Schemathesis knows how outputs feed inputs:

\`\`\`yaml
paths:
  /users:
    post:
      operationId: createUser
      responses:
        '201':
          description: Created
          links:
            GetUserById:
              operationId: getUser
              parameters:
                userId: '\$response.body#/id'
  /users/{userId}:
    get:
      operationId: getUser
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
\`\`\`

With that link declared, Schemathesis will create a user, capture the returned \`id\`, and immediately fetch it, verifying the round trip holds. Stateful runs regularly surface bugs like "the create response says 201 but the resource is not actually persisted" that no single-operation test can catch.

## Catching Schema and Implementation Drift

The highest-value bug Schemathesis finds is drift. Your spec is the contract your clients, mobile apps, and partner integrations rely on. Over time the implementation moves: a field becomes nullable, a status code changes, an error shape gets a new key. If the spec is not updated in lockstep, every consumer breaks in production while your example tests stay green because they never checked the schema.

\`response_schema_conformance\` is the check that catches this. It validates every real response body against the declared schema. When the implementation returns a field the spec never mentioned, or omits a required one, the check fails:

\`\`\`bash
1. Received a response with a status code, which is not defined
   in the schema: 500

2. Response violates the schema:
   'created_at' is a required property
   Missing at: $
\`\`\`

This is the same discipline that [OpenAPI contract testing](/blog/openapi-contract-testing-guide) and [Swagger and OpenAPI spec validation](/blog/swagger-openapi-spec-validation-guide) enforce, but Schemathesis validates the live server rather than just the document. Treat any conformance failure as either a spec bug or an implementation bug, never as noise.

## Wiring Schemathesis Into CI

Schemathesis earns its keep as a merge gate. The pattern is: start your API, wait for it to be healthy, run the CLI against it, and fail the build on any check failure. Here is a GitHub Actions job that does exactly that.

\`\`\`yaml
name: api-contract-tests

on:
  pull_request:
    paths:
      - 'src/**'
      - 'openapi.yaml'

jobs:
  schemathesis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install schemathesis
          pip install -r requirements.txt

      - name: Start the API
        run: |
          uvicorn src.main:app --host 0.0.0.0 --port 8000 &
          # Wait until the health endpoint responds
          for i in $(seq 1 30); do
            curl -sf http://localhost:8000/health && break
            sleep 1
          done

      - name: Run Schemathesis
        run: |
          st run \\
            --checks all \\
            --max-examples 100 \\
            --url http://localhost:8000 \\
            ./openapi.yaml
\`\`\`

For flaky-free runs, pin \`--max-examples\` so the budget is deterministic, and consider \`--hypothesis-seed\` if you want fully reproducible generation. Keep the example count modest on pull requests (fast feedback) and run a heavier nightly job with thousands of examples.

## Tuning, Filtering, and Reducing Noise

Not every generated case is meaningful for every API. Schemathesis gives you levers to focus the run.

| Flag | Purpose |
| --- | --- |
| \`--include-path\` | Only test operations whose path matches |
| \`--exclude-path\` | Skip noisy or destructive endpoints |
| \`--include-method\` | Restrict to GET/POST/etc. |
| \`--max-examples\` | Set the Hypothesis generation budget per operation |
| \`--hypothesis-seed\` | Fix the seed for reproducible runs |
| \`--report\` | Emit a machine-readable report (JUnit, VCR) |

A common recipe is to exclude destructive endpoints from broad fuzzing while still stateful-testing the safe CRUD paths:

\`\`\`bash
st run \\
  --exclude-path '/admin/reset' \\
  --exclude-method DELETE \\
  --max-examples 150 \\
  --url http://localhost:8000 \\
  ./openapi.yaml
\`\`\`

When a check produces a false positive, the fix is almost always to correct the spec so it accurately describes the implementation, not to suppress the check. A suppressed conformance failure is a lie your consumers will discover in production.

## Testing Against an In-Process App

Sending real HTTP requests to a running server is the highest-fidelity mode, but it is also the slowest and needs the server managed separately. For fast unit-style contract runs, Schemathesis can drive an ASGI (FastAPI, Starlette) or WSGI (Flask, Django) application in-process, with no socket and no port. The requests travel through the framework's test client, so a full run finishes in seconds and slots naturally into a normal pytest suite.

\`\`\`python
import schemathesis
from myapp.main import app  # a FastAPI/Starlette instance

# Load the schema straight from the ASGI app
schema = schemathesis.from_asgi("/openapi.json", app)


@schema.parametrize()
def test_asgi(case):
    # 'app' is passed so the call goes in-process, no network
    response = case.call_asgi()
    case.validate_response(response)
\`\`\`

For WSGI apps the pattern is \`from_wsgi\` and \`case.call_wsgi()\`. The trade-off is fidelity: in-process runs skip the real network, TLS, and any reverse proxy, so keep a smaller live-server run in CI for the checks that depend on the full stack (content types set by a gateway, for example). A common split is fast in-process runs on every push and a heavier live run nightly.

## Generating Cases From Examples in the Spec

If your OpenAPI spec includes \`example\` or \`examples\` values, Schemathesis can seed generation with them so realistic, hand-authored payloads are always exercised alongside the fuzzed ones. This matters when a field is technically "any string" in the schema but only a narrow set of values is meaningful, like a currency code or a country. Enable it explicitly:

\`\`\`bash
st run \\
  --hypothesis-phases explicit,generate \\
  --url http://localhost:8000 \\
  ./openapi.yaml
\`\`\`

The \`explicit\` phase replays every example embedded in the spec; the \`generate\` phase adds the fuzzed cases on top. Keeping realistic examples in the spec therefore does double duty: it documents the API for humans and steers the fuzzer toward valid, meaningful inputs.

## Reading and Acting on Results

A Schemathesis run ends with a summary grouping failures by check and by operation. Work through them in this order:

1. **Server errors first.** A 5xx on a spec-valid input is almost always a real bug. Reproduce with the printed curl command.
2. **Schema conformance next.** Decide per failure whether the spec is wrong or the code is wrong, and fix the correct side.
3. **Status and content-type mismatches.** These break typed clients and SDKs generated from the spec.
4. **Header conformance last.** Often a spec-tightening exercise.

Every failure includes the exact request, the response, and a one-line reproduction, so the loop from "CI is red" to "backend engineer has a repro" is seconds, not hours.

## When Schemathesis Is the Wrong Tool

Property-based API testing is powerful, but it is not a universal answer, and knowing its limits keeps you from over-trusting a green run. Schemathesis verifies that your API conforms to its spec and does not crash on spec-valid input. It does not verify business correctness. It cannot know that transferring money should debit one account and credit another, only that the transfer endpoint returns a schema-valid response. That semantic layer is still yours to test with example-based and end-to-end tests.

It is also only as good as your spec. If your OpenAPI document is thin, missing constraints, formats, and required flags, then the generated inputs are correspondingly shallow and the conformance checks have little to assert. In that situation the highest-leverage move is not more fuzzing but enriching the spec: add \`minLength\`, \`maximum\`, \`format\`, \`enum\`, and \`required\`, and declare error responses. Every constraint you add sharpens both the generation and the validation. Schemathesis effectively rewards teams that invest in an accurate spec, which is a healthy incentive.

Finally, be deliberate about destructive and stateful side effects. Fuzzing a \`POST\` that sends emails, charges cards, or writes to a shared database will do exactly that, thousands of times. Point Schemathesis at a disposable environment with a reset-able database, exclude genuinely dangerous operations, and never run a broad fuzz campaign against production. Used this way, it is a scalpel for conformance; used carelessly, it is a load generator with side effects.

## Frequently Asked Questions

### What is Schemathesis used for?

Schemathesis is a tool for property-based and contract testing of web APIs. It reads an OpenAPI or GraphQL specification, automatically generates thousands of test cases across the input space the spec describes, and verifies that responses conform to the schema and that the server never crashes on valid input. It is used mainly to catch schema drift and unhandled edge cases.

### How is Schemathesis different from Postman?

Postman runs example-based requests you write by hand and assert on individually. Schemathesis generates cases automatically from your spec using the Hypothesis engine, covering boundary values and edge cases no human enumerates. Postman is better for curated end-to-end flows and manual exploration; Schemathesis is better for exhaustive conformance and finding unknown crashes.

### Do I need a running server to use Schemathesis?

Yes for the most valuable checks. Schemathesis sends real requests to a live instance of your API and validates the actual responses, which is how it catches implementation drift. You can also run it against an in-process ASGI or WSGI app in pytest without a network, which is faster and ideal for CI.

### What is stateful testing in Schemathesis?

Stateful testing chains multiple API operations into sequences, using the output of one call as the input to the next, guided by OpenAPI \`links\`. For example it can create a resource, capture the returned ID, fetch it, and delete it, then verify the resource is gone. This catches lifecycle bugs that single-operation fuzzing cannot see.

### How do I reproduce a Schemathesis failure?

Every failure prints a minimal, Hypothesis-shrunk reproducer plus a ready-to-run curl command containing the exact method, URL, headers, and body. You copy that curl line, run it against the same server, and reproduce the bug in one step without any test framework, which makes handing bugs to backend engineers trivial.

### Can Schemathesis test GraphQL APIs?

Yes. Alongside OpenAPI, Schemathesis supports GraphQL: it introspects the schema and generates queries and mutations to fuzz the API. The property-based approach is the same, generating a wide range of inputs and asserting that responses conform to the declared types and that the server does not error on valid queries.

### How do I stop Schemathesis from testing destructive endpoints?

Use \`--exclude-path\` and \`--exclude-method\` to filter out endpoints like \`/admin/reset\` or all \`DELETE\` operations. In pytest you can filter the parametrized schema similarly. Excluding destructive operations from broad fuzzing while still stateful-testing safe CRUD paths is a common and recommended pattern.

## Conclusion

Schemathesis moves API testing from "the cases a human remembered" to "everything the spec claims is valid". By deriving Hypothesis strategies from your OpenAPI schema, it fuzzes each operation, chains operations statefully, and, most importantly, validates every live response against the contract so schema drift is caught before your consumers hit it in production. The setup cost is minimal: one \`pip install\`, one CLI command, and a CI job that starts your API and runs \`st run --checks all\`.

Start today. Point the CLI at your staging API and its spec, run a hundred examples per operation, and triage the first batch of server errors and conformance failures. Then browse the property-based and [performance testing complete guide](/blog/performance-testing-complete-guide) on qaskills.sh and grab a ready-made Schemathesis workflow from the [skills catalog](/skills) to drop straight into your pipeline.
`,
};
