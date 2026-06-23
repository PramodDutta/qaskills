import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Schemathesis: Property-Based API Fuzzing From Your OpenAPI Spec',
  description:
    'Learn how Schemathesis auto-generates thousands of test cases from your OpenAPI or GraphQL schema to catch 500s, schema violations, and crashes. CLI + pytest.',
  date: '2026-06-23',
  category: 'Guide',
  content: `
# Schemathesis: Property-Based API Fuzzing From Your OpenAPI Spec

Most API test suites are a handful of happy-path requests written by hand: send a valid payload, assert a 200, move on. That coverage looks reassuring on a dashboard, but it tells you almost nothing about how your service behaves when a client sends a negative integer where you expected a positive one, an empty string where you expected an email, a deeply nested object that blows your parser's recursion limit, or a Unicode null byte in a query parameter. Those are exactly the inputs that produce unhandled exceptions, leaked stack traces, and 500 errors in production -- and they are exactly the inputs no one writes a test for, because there are effectively infinite of them.

Schemathesis attacks this problem from the other direction. Instead of asking you to enumerate test cases, it reads your OpenAPI (formerly Swagger) or GraphQL schema, understands the shape of every parameter and request body you have declared, and then generates hundreds or thousands of valid and invalid inputs automatically. It throws them at your running service and checks every response against a set of universal properties: did the server crash, did it return a status code the schema never promised, did the response body actually match the schema you published? This guide walks through what Schemathesis is, how property-based fuzzing derives test cases from a spec, how to run it from the command line and inside pytest, how to handle auth and stateful flows, and how it compares to tools like Dredd and RESTler. If you already write [API tests by hand](/blog/api-testing-complete-guide), think of Schemathesis as the layer that finds the bugs your hand-written tests will never reach.

## What Is Schemathesis and Why Property-Based Fuzzing Matters

Schemathesis is an open-source tool, written in Python, that performs automated property-based testing and fuzzing of web APIs described by a machine-readable schema. The "schema" is the contract: an OpenAPI document (JSON or YAML) or a GraphQL SDL that declares your endpoints, parameters, request bodies, and response shapes. Schemathesis treats that contract as the source of truth for generating inputs and as the oracle for validating outputs.

Property-based testing is the key idea. In example-based testing -- the kind most engineers write -- you pick a specific input and assert a specific output. In property-based testing you instead state a *property* that should hold for *all* valid inputs, and let a generator produce many inputs to try to falsify it. The classic property library in Python is Hypothesis, and Schemathesis is built directly on top of it. The properties Schemathesis checks are deliberately general: "the server should never return a 500 for input my schema says is valid," or "every response should conform to the schema I declared for that status code." Because these properties are universal, Schemathesis can verify them across thousands of generated inputs without you writing a single assertion. That combination -- automatic input generation plus automatic output validation -- is what makes it a fuzzer for APIs rather than just another test runner.

## How Schemathesis Derives Test Cases From OpenAPI and GraphQL

The magic is in the translation from schema to generators. Every parameter and schema object in OpenAPI uses JSON Schema vocabulary: \`type\`, \`format\`, \`minimum\`, \`maximum\`, \`minLength\`, \`maxLength\`, \`pattern\`, \`enum\`, \`required\`, and so on. Schemathesis reads these constraints and builds a Hypothesis strategy that generates values satisfying them. A field declared \`{ "type": "integer", "minimum": 1, "maximum": 100 }\` yields integers across that range, including the boundary values 1 and 100 that humans routinely forget to test. A \`{ "type": "string", "format": "email" }\` yields email-shaped strings; a \`pattern\` regex yields strings that match it.

Crucially, Schemathesis does not only generate *valid* data. With negative testing enabled it deliberately mutates inputs to violate the schema -- wrong types, missing required fields, values outside declared bounds, malformed formats -- so it can verify your service rejects bad input gracefully with a 4xx rather than crashing with a 5xx. For GraphQL, Schemathesis parses the SDL, understands the type system and available queries and mutations, and generates queries that exercise fields and arguments. If you are new to that ecosystem, our [GraphQL testing guide](/blog/graphql-testing-complete-guide) covers the schema concepts Schemathesis relies on. In both cases the workflow is the same: parse the contract, build generators from declared constraints, and explore the input space far more thoroughly than any hand-written suite.

## Installing Schemathesis

Schemathesis ships as a Python package on PyPI and requires Python 3.8 or newer. Install it into a virtual environment so it does not pollute your system packages:

\`\`\`bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # On Windows: .venv\\Scripts\\activate

# Install Schemathesis
pip install schemathesis

# Verify the installation
schemathesis --version
st --version
\`\`\`

The package installs two command-line entry points: the full \`schemathesis\` command and a short \`st\` alias. They are identical, so use whichever you prefer. Installing the package also makes the \`schemathesis\` Python module importable, which is what you need for the pytest integration covered later. If you only want the CLI and want to keep it isolated from your project's dependencies, \`pipx install schemathesis\` is a clean alternative that puts the binary on your PATH without touching any project environment.

## Running the CLI Against a Spec URL or File

The fastest way to get value is the command line. Point \`st run\` at a schema -- either a live URL serving your OpenAPI JSON or a local file -- and Schemathesis discovers every operation and starts generating cases. Against a remote spec it infers the base URL from the schema's server entry; against a local file you supply the target with \`--url\`.

\`\`\`bash
# Run against a live OpenAPI schema served by your API
schemathesis run https://example.com/openapi.json --checks all

# Run against a local schema file, pointing at a running server
st run ./openapi.yaml --url http://localhost:8000

# Limit how many examples are generated per operation (faster feedback)
st run https://example.com/openapi.json --max-examples 50

# Increase verbosity to see each generated request
st run https://example.com/openapi.json --checks all --show-trace
\`\`\`

The \`--checks all\` flag enables every built-in property check rather than the default subset, which is what you want when you are hunting bugs. By default Schemathesis generates 100 examples per operation; \`--max-examples\` lets you trade thoroughness for speed during local iteration. As it runs, the CLI prints a live summary per operation and, on failure, the exact request that broke the property -- method, path, headers, and body -- so you can reproduce it immediately.

## The Built-In Checks Schemathesis Runs

Every generated request is validated against a set of built-in checks. These are the "properties" of property-based testing, and they encode assumptions that should hold for any well-behaved API. You enable all of them with \`--checks all\`, or pick specific ones with \`--checks not_a_server_error,response_schema_conformance\`.

| Check | What it catches |
| --- | --- |
| \`not_a_server_error\` | Any 5xx response, or a connection error / unhandled exception. The single most valuable check -- a 500 on schema-valid input is almost always a real bug. |
| \`status_code_conformance\` | The server returned a status code that is not documented for that operation in the schema. Catches undocumented error paths and drift between code and contract. |
| \`response_schema_conformance\` | The response body does not match the schema declared for that status code -- missing required fields, wrong types, extra unexpected properties. |
| \`content_type_conformance\` | The \`Content-Type\` header of the response is not one the operation declared it could return. Catches a JSON endpoint accidentally returning HTML error pages. |
| \`response_headers_conformance\` | Required response headers declared in the schema are missing from the actual response. |

The first check, \`not_a_server_error\`, is where most teams find their first crop of bugs in the opening minutes. The conformance checks are subtler and arguably more valuable long-term: they enforce that your implementation and your published contract stay in agreement, which is the heart of [API contract testing for microservices](/blog/api-contract-testing-microservices).

## Python and pytest Integration With Hypothesis

The CLI is great for CI and exploratory runs, but sometimes you want generated cases inside your existing pytest suite, where you can add custom assertions, share fixtures, and integrate with the rest of your test code. Schemathesis exposes a \`parametrize\` decorator that turns each API operation into a pytest test, with Hypothesis driving the case generation under the hood.

\`\`\`python
import schemathesis

# Load the schema once, from a URI or a local file
schema = schemathesis.from_uri("https://example.com/openapi.json")
# Or: schema = schemathesis.from_path("./openapi.yaml", base_url="http://localhost:8000")


@schema.parametrize()
def test_api(case):
    # case represents one generated request for one operation.
    # call_and_validate() sends it and runs all built-in checks.
    case.call_and_validate()


@schema.parametrize()
def test_api_with_custom_assertions(case):
    response = case.call()
    # Built-in conformance checks
    case.validate_response(response)
    # Your own domain-specific property
    assert response.elapsed.total_seconds() < 2.0, "Endpoint too slow"
\`\`\`

When you run \`pytest\` against this file, Schemathesis expands \`@schema.parametrize()\` into one parametrized test per operation in the schema. Each test invocation receives a freshly generated \`case\`, and Hypothesis runs each one many times with different inputs. \`case.call_and_validate()\` is the one-liner that sends the request and asserts every built-in check; \`case.call()\` plus \`case.validate_response()\` splits those steps so you can interleave your own assertions, exactly as in \`test_api_with_custom_assertions\` above. Because it is all standard pytest underneath, you get the usual fixtures, markers, parallelization with \`pytest-xdist\`, and reporting for free.

## Authentication, Headers, and Custom Configuration

Real APIs are rarely open. Schemathesis lets you attach credentials and custom headers both from the CLI and in code. For the CLI, \`--header\` (repeatable) injects a header into every request, which covers bearer tokens and API keys, and \`--auth\` handles HTTP Basic.

\`\`\`bash
# Bearer token via a header
st run https://example.com/openapi.json \\
  --checks all \\
  --header "Authorization: Bearer \${API_TOKEN}"

# HTTP Basic auth
st run https://example.com/openapi.json --auth username:password
\`\`\`

Notice the token is read from an environment variable (\`\${API_TOKEN}\`) rather than hard-coded -- never commit secrets into a test command. In Python you have finer control: a custom auth implementation can refresh expiring tokens automatically.

\`\`\`python
import schemathesis

schema = schemathesis.from_uri("https://example.com/openapi.json")


@schemathesis.auth()
class TokenAuth:
    def get(self, case, context):
        # Fetch or refresh a token; runs before each request
        return obtain_access_token()

    def set(self, case, data, context):
        # Attach the token to the outgoing request
        case.headers = case.headers or {}
        case.headers["Authorization"] = f"Bearer {data}"


@schema.parametrize()
def test_api(case):
    case.call_and_validate()
\`\`\`

The \`get\` method produces the credential and \`set\` applies it to each generated case, so even short-lived tokens stay valid across a long fuzzing run.

## Targeting Specific Endpoints

Fuzzing your entire surface on every run is slow, and during development you usually care about the operation you just changed. Schemathesis filters by path, method, tag, or operation ID so you can scope a run tightly.

\`\`\`bash
# Only test endpoints whose path includes /users
st run https://example.com/openapi.json --include-path-regex "/users"

# Only test POST and PUT operations
st run https://example.com/openapi.json --include-method POST --include-method PUT

# Only test operations tagged "billing" in the schema
st run https://example.com/openapi.json --include-tag billing

# Exclude a flaky or expensive endpoint
st run https://example.com/openapi.json --exclude-path-regex "/admin/reindex"
\`\`\`

These filters compose, so you can narrow a run to "all POST operations under /orders except the bulk import" in a single command. In CI you might fuzz everything nightly but run a targeted subset on each pull request, keeping feedback fast while still catching regressions on the code under review.

## Reproducing and Minimizing Failing Cases

A fuzzer that finds a bug but cannot tell you how to reproduce it is useless. This is where Hypothesis's shrinking comes in. When a generated input falsifies a property, Hypothesis does not just report that random input -- it automatically *minimizes* it, repeatedly simplifying the value while preserving the failure, until it finds the smallest input that still breaks your API. Instead of "the 4,182-character string with mixed Unicode crashed your endpoint," you get "the empty string crashes your endpoint," which is far easier to debug.

Schemathesis then hands you a ready-to-run reproduction. Every failure report includes the exact request, and the CLI prints a cURL command you can paste straight into a terminal:

\`\`\`bash
# Schemathesis prints something like this on failure:
curl -X POST "http://localhost:8000/users" \\
  -H "Content-Type: application/json" \\
  -d '{"age": -1}'

# In Python, you can also get the cURL command programmatically:
# print(case.as_curl_command())
\`\`\`

That single-line repro is the bridge between an automated finding and a filed ticket. You drop it into a [bug report](/skills), confirm it reproduces by hand, and your developer has everything they need to fix it without ever running Schemathesis themselves.

## Stateful Testing With OpenAPI Links

Individual-operation fuzzing finds crashes, but many real bugs only appear in *sequences*: create a resource, then read it, then delete it, then try to read it again. Schemathesis supports stateful testing driven by OpenAPI \`links\`, which declare how the output of one operation feeds the input of another (for example, the \`id\` returned by \`POST /users\` becomes the path parameter for \`GET /users/{id}\`).

\`\`\`python
import schemathesis

schema = schemathesis.from_uri("https://example.com/openapi.json")

# Build a stateful test that chains operations via declared links
TestAPISequences = schema.as_state_machine().TestCase
\`\`\`

\`\`\`bash
# Run stateful (link-based) testing from the CLI
st run https://example.com/openapi.json --checks all --experimental=stateful-test-runner
\`\`\`

The state machine explores chains of operations: it creates entities, captures the IDs your API returns, and uses them in subsequent calls, hunting for inconsistencies like a resource that still returns 200 after you deleted it, or pagination cursors that point at nothing. If your schema does not yet declare \`links\`, adding them is a one-time investment that pays off in this much deeper class of test.

## Integrating Schemathesis Into CI

Schemathesis earns its keep when it runs automatically on every change. Because the CLI exits non-zero when any check fails, wiring it into CI is straightforward -- start your API, run \`st run\`, and let the exit code gate the build.

\`\`\`yaml
# .github/workflows/api-fuzz.yml
name: API Fuzzing
on: [push, pull_request]

jobs:
  schemathesis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install Schemathesis
        run: pip install schemathesis
      - name: Start the API
        run: |
          docker compose up -d
          # Wait for the health endpoint to respond
          timeout 60 sh -c 'until curl -sf http://localhost:8000/health; do sleep 2; done'
      - name: Run Schemathesis
        run: |
          st run http://localhost:8000/openapi.json \\
            --checks all \\
            --max-examples 100 \\
            --report junit \\
            --report-junit-path schemathesis.xml
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: schemathesis-report
          path: schemathesis.xml
\`\`\`

The \`--report junit\` flags emit a JUnit XML file that most CI systems render as a test report, so failures show up in the same place as the rest of your suite. For pull requests you might cap \`--max-examples\` lower for speed and run a heavier scheduled job nightly. Either way, a failing property now blocks a merge -- the same discipline you would apply to AI-generated code, which we cover in [security testing AI-generated code](/blog/security-testing-ai-generated-code).

## Schemathesis vs Dredd vs RESTler

Schemathesis is not the only schema-driven API testing tool. Dredd validates that an API matches its description by replaying documented examples, and Microsoft's RESTler is a stateful REST fuzzer focused on security. They overlap but optimize for different things.

| Dimension | Schemathesis | Dredd | RESTler |
| --- | --- | --- | --- |
| Core approach | Property-based fuzzing from schema constraints | Example replay / contract verification | Grammar-based stateful security fuzzing |
| Input generation | Auto-generates valid + invalid data via Hypothesis | Uses examples declared in the schema | Infers a fuzzing grammar from the spec |
| Negative / malformed inputs | Yes, first-class | Limited | Yes, security-oriented |
| Stateful sequences | Yes, via OpenAPI links | No | Yes, core feature |
| Language / runtime | Python (CLI + pytest) | Node.js | Python (research tool) |
| Best for | Finding 500s and schema drift fast | Verifying docs match implementation | Deep security fuzzing of REST services |
| Learning curve | Low (one command to start) | Low | Higher (more setup) |

In practice many teams run more than one. Schemathesis is the easiest to adopt and the fastest to find unhandled-exception bugs, Dredd keeps your published examples honest, and RESTler is the heavy artillery when you need adversarial security fuzzing with stateful sequence inference.

## Limitations and Best Practices

Schemathesis is only as good as your schema. If your OpenAPI document is loose -- everything typed as \`string\` with no constraints, no \`format\`, no \`required\` arrays -- the generated data is correspondingly shallow and the conformance checks have little to enforce. The single highest-leverage thing you can do is tighten your schema: declare formats, bounds, patterns, required fields, and accurate response schemas per status code. Fuzzing also needs a real running instance with a database in a known state; a non-idempotent suite can leave junk data behind, so run it against a disposable environment or reset state between runs. Generation is randomized, so set a fixed Hypothesis seed in CI when you need reproducibility, and use \`--max-examples\` to balance depth against runtime. Finally, Schemathesis finds *crashes and contract violations*, not *business-logic bugs* -- it cannot know that a discount should never exceed the order total. Pair it with hand-written assertions for the rules only you know, and treat it as a powerful complement to, not a replacement for, your existing suite.

## Frequently Asked Questions

### What is Schemathesis used for?

Schemathesis automatically generates and runs API test cases from an OpenAPI or GraphQL schema to find crashes, unhandled 500 errors, and schema-conformance bugs. It is a property-based fuzzer: instead of you writing individual test cases, it derives valid and invalid inputs from your schema's constraints and verifies that every response honors the contract you published.

### Is Schemathesis free and open source?

Yes. Schemathesis is open source under a permissive license and is freely available on PyPI -- install it with \`pip install schemathesis\`. There is an optional commercial SaaS offering with extra reporting and team features, but the full fuzzing engine, CLI, and pytest integration are free and require no account to use locally or in CI.

### Does Schemathesis support GraphQL as well as REST?

Yes. Alongside OpenAPI and Swagger for REST APIs, Schemathesis can load a GraphQL schema, understand its type system, and generate queries and mutations that exercise fields and arguments. The same core idea applies: it reads the schema as the contract, generates inputs from declared types, and checks responses for errors and conformance.

### How is Schemathesis different from Postman?

Postman is primarily for manually authored, example-based requests and collections that you write and curate by hand. Schemathesis is automated and property-based: it generates hundreds of inputs per endpoint from your schema and validates universal properties like "no 500s" and "response matches schema." They are complementary -- Postman documents and exercises specific flows, Schemathesis explores the input space exhaustively.

### What does the not_a_server_error check do?

The \`not_a_server_error\` check fails whenever the API returns any 5xx status, a connection error, or an unhandled exception for a schema-valid request. It is the highest-value built-in check because a server error on input your own schema declares valid is almost always a genuine bug -- a missing null check, an unguarded type cast, or an unhandled edge case.

### How do I reproduce a failure Schemathesis found?

Every failure report includes the exact generated request, minimized by Hypothesis's shrinking to the simplest input that still triggers the bug. The CLI prints a ready-to-run cURL command, and in Python you can call \`case.as_curl_command()\`. Paste that command into a terminal to reproduce the failure by hand and attach it to your bug ticket so developers can fix it directly.

### Can I run Schemathesis inside my existing pytest suite?

Yes. Import \`schemathesis\`, load your schema with \`schemathesis.from_uri()\` or \`from_path()\`, and decorate a test with \`@schema.parametrize()\`. Each operation becomes a parametrized pytest test, and calling \`case.call_and_validate()\` sends the generated request and runs every built-in check. You can add your own assertions, fixtures, and markers exactly as in any other pytest test.

### How do I handle authentication with Schemathesis?

For the CLI, pass credentials with \`--header "Authorization: Bearer \${TOKEN}"\` (read the token from an environment variable, never hard-code it) or \`--auth user:pass\` for HTTP Basic. In Python, register a custom auth class with the \`@schemathesis.auth()\` decorator whose \`get\` and \`set\` methods fetch and attach a token before each request -- ideal for refreshing short-lived tokens during long runs.

## Conclusion

Schemathesis flips API testing on its head: rather than enumerating a few inputs and hoping they are representative, it reads your contract and explores the input space for you, finding the 500s, undocumented status codes, and schema-conformance failures that hand-written suites systematically miss. The entry cost is genuinely low -- \`pip install schemathesis\` and one \`st run\` command against your spec will often surface real bugs in minutes -- and it scales smoothly from a developer's laptop into a CI gate that blocks regressions on every pull request. The trade-off is that its power tracks the quality of your schema and it targets crashes and contract drift rather than business logic, so it works best alongside, not instead of, your existing tests and a tightened OpenAPI document.

If you want a curated, agent-ready set of QA skills -- including API fuzzing, contract testing, and CI integration patterns you can drop straight into your AI coding agent -- explore the [QASkills directory](/skills) and start building a sturdier testing stack today.
`,
};
