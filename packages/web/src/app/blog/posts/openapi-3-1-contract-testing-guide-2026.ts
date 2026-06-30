import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'OpenAPI 3.1 Contract Testing Guide: Spec-Driven QA in 2026',
  description:
    'A practical OpenAPI 3.1 contract testing guide with YAML spec examples, Schemathesis, Dredd, openapi-examples-validator, Spectral linting, and CI pipelines.',
  date: '2026-06-30',
  category: 'Guide',
  content: `
# OpenAPI 3.1 Contract Testing Guide: Spec-Driven QA in 2026

An API contract is a promise. Your OpenAPI document says "POST /orders returns a 201 with this body shape," and every consumer — the mobile app, the partner integration, the internal dashboard — builds against that promise. **OpenAPI 3.1 contract testing** is the discipline of automatically verifying that your running service keeps that promise. Instead of hand-writing assertions for every endpoint, you treat the OpenAPI spec as the single source of truth and let tooling generate, drive, and validate tests against it.

OpenAPI 3.1 matters specifically because it is the first release fully aligned with **JSON Schema 2020-12**. Earlier versions (3.0.x) used a divergent subset of JSON Schema, which meant your spec validation and your runtime validation could disagree. With 3.1 you get real \`oneOf\`/\`anyOf\` semantics, nullable handled via \`type: [string, "null"]\`, true \`$ref\` resolution across documents, and \`examples\` arrays that tools can validate against their own schemas. This alignment is what makes modern contract-testing tools like Schemathesis, Dredd, and openapi-examples-validator so powerful. In this guide you will write a 3.1 YAML spec, lint it, validate its examples, run property-based contract tests against a live server, and wire the whole thing into CI. If you are coming from consumer-driven contract testing, our [Pact contract testing in Python guide](/blog/contract-testing-pact-python-guide) and [Pact vs Spring Cloud Contract comparison](/blog/contract-testing-pact-vs-spring-cloud-contract-2026) cover the complementary approach.

---

## Spec-First vs Consumer-Driven Contracts

There are two dominant philosophies in API contract testing, and OpenAPI sits firmly in the spec-first camp. Knowing the difference tells you which tools to reach for.

| Aspect | Spec-First (OpenAPI 3.1) | Consumer-Driven (Pact) |
|---|---|---|
| Source of truth | The OpenAPI document | Consumer expectations |
| Who writes the contract | Provider / API designer | Each consumer |
| Verification direction | Server matches spec | Server matches consumer pacts |
| Best for | Public APIs, many unknown consumers | Internal microservices, known consumers |
| Tooling | Schemathesis, Dredd, Spectral | Pact, Spring Cloud Contract |
| Breaking-change detection | Diff the spec | Broker can-i-deploy |

Spec-first shines when you publish an API to consumers you do not control. The OpenAPI document is the contract, and your job is to prove the running service never violates it. That is exactly what this guide automates.

---

## Writing an OpenAPI 3.1 Specification

Here is a focused OpenAPI 3.1 document for an orders API. Note the version pin, the JSON Schema 2020-12 features, and the inline \`examples\`.

\`\`\`yaml
openapi: 3.1.0
info:
  title: Orders API
  version: 1.2.0
  description: Create and retrieve customer orders.
servers:
  - url: https://api.example.com/v1
paths:
  /orders/{orderId}:
    get:
      operationId: getOrder
      summary: Fetch a single order
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: The requested order
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
              examples:
                sample:
                  value:
                    id: 7c9e6679-7425-40de-944b-e07fc1f90ae7
                    status: shipped
                    total: 4999
                    note: null
        '404':
          description: Order not found
components:
  schemas:
    Order:
      type: object
      required: [id, status, total]
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
          enum: [pending, shipped, delivered, cancelled]
        total:
          type: integer
          minimum: 0
          description: Amount in minor units (cents)
        note:
          type: [string, "null"]
          description: 3.1 nullable via JSON Schema union type
\`\`\`

Two 3.1-specific details are worth calling out. First, nullability is expressed as \`type: [string, "null"]\` — the old \`nullable: true\` keyword from 3.0 is gone. Second, the \`examples\` object under a media type is a map of named examples, each with a \`value\`. Tools can validate those example values against the \`Order\` schema, catching drift between docs and reality.

---

## Linting the Spec with Spectral

Before testing the running server, validate the document itself. **Spectral** is the de facto OpenAPI linter. Install it and run the built-in ruleset:

\`\`\`bash
npm install -D @stoplight/spectral-cli
npx spectral lint openapi.yaml --ruleset spectral:oas
\`\`\`

You can extend the default rules with a project ruleset, \`.spectral.yaml\`, to enforce house style such as requiring descriptions and operation IDs:

\`\`\`yaml
extends: ["spectral:oas"]
rules:
  operation-operationId: error
  operation-description: warn
  oas3-valid-media-example: error
  info-contact: off
\`\`\`

The \`oas3-valid-media-example\` rule is the one that catches a malformed example before it ever reaches a consumer. Treat lint errors as a hard CI gate.

---

## Validating Examples Against the Schema

Linting checks structure; **openapi-examples-validator** specifically proves that every \`example\` and \`examples.value\` in your document actually conforms to its declared schema. This is the cheapest, fastest contract check you can run.

\`\`\`bash
npm install -D openapi-examples-validator
npx openapi-examples-validator openapi.yaml
\`\`\`

If you change the \`Order\` schema to make \`total\` a string but forget to update the example, this tool fails immediately:

\`\`\`text
Error: #/paths/~1orders~1{orderId}/get/responses/200/...
  Schema validation error: /total must be string
1 invalid example(s) found.
\`\`\`

Catching that locally costs milliseconds. Catching it after a consumer integrates costs a support ticket and a hotfix.

---

## Property-Based Contract Testing with Schemathesis

Static checks are necessary but not sufficient — they never touch the running service. **Schemathesis** reads your OpenAPI document and generates hundreds of test cases per endpoint using property-based testing, then asserts that every real response conforms to the spec. It finds the edge cases you would never think to write.

\`\`\`bash
pip install schemathesis

schemathesis run openapi.yaml \\
  --url https://staging.api.example.com/v1 \\
  --checks all \\
  --hypothesis-max-examples 200
\`\`\`

The \`--checks all\` flag enables every built-in contract check: status code conformance, response schema conformance, content-type correctness, and header validation. Schemathesis fuzzes path parameters, query strings, and request bodies derived from your schemas, then verifies the server never returns something the spec disallows.

For richer control you can write a Python test using the Schemathesis pytest integration:

\`\`\`python
import schemathesis

schema = schemathesis.from_uri(
    "https://staging.api.example.com/v1/openapi.json"
)

@schema.parametrize()
def test_api_conforms_to_spec(case):
    response = case.call()
    case.validate_response(response)
\`\`\`

\`case.validate_response()\` runs all the conformance checks. Each generated \`case\` is one fuzzed request. Run it under pytest and Schemathesis expands it into hundreds of concrete tests. This is the layer that catches a 500 on a boundary value or a response that drops a required field under load.

---

## Example-Based Verification with Dredd

Where Schemathesis is property-based and exploratory, **Dredd** is deterministic: it takes the concrete \`examples\` in your spec and replays them against the live server, asserting the responses match. The two tools are complementary — Dredd proves your documented examples work, Schemathesis proves the undocumented inputs do not break the contract.

\`\`\`bash
npm install -D dredd
npx dredd openapi.yaml https://staging.api.example.com/v1
\`\`\`

A \`dredd.yml\` config file lets you add hooks for auth and test ordering:

\`\`\`yaml
reporter: [cli, junit]
output: [dredd-report.xml]
header:
  - "Authorization: Bearer \${API_TOKEN}"
hookfiles: ./hooks.js
\`\`\`

Dredd hooks (in \`hooks.js\`) let you seed data before a transaction and tear it down after, which is how you keep example-based tests independent:

\`\`\`javascript
const hooks = require('hooks');

hooks.beforeEach((transaction) => {
  transaction.request.headers['Authorization'] =
    'Bearer ' + process.env.API_TOKEN;
});

hooks.before('/orders/{orderId} > GET', (transaction) => {
  // ensure the example order exists in staging
  transaction.skip = false;
});
\`\`\`

The \`junit\` reporter writes \`dredd-report.xml\`, which CI systems render natively.

---

## Choosing the Right Tool

Each tool answers a different question. Layer them rather than picking one.

| Tool | Type | Touches live server | Catches |
|---|---|---|---|
| Spectral | Linter | No | Spec quality, style, structure |
| openapi-examples-validator | Validator | No | Examples that violate their schema |
| Dredd | Example replay | Yes | Documented behavior that broke |
| Schemathesis | Property-based | Yes | Edge cases, schema violations under fuzzing |
| oasdiff | Diff | No | Breaking changes between spec versions |

A robust pipeline runs all five: lint and validate examples first (fast, no server), then Dredd and Schemathesis against staging (slower, needs a server), and oasdiff on every PR to flag breaking changes before merge.

---

## Detecting Breaking Changes with oasdiff

A contract is only useful if you notice when it changes incompatibly. **oasdiff** compares two OpenAPI documents and classifies changes as breaking or non-breaking.

\`\`\`bash
oasdiff breaking openapi-main.yaml openapi-pr.yaml
\`\`\`

Removing a required response field, narrowing an enum, or adding a required request parameter all surface as breaking. Wire this into a PR check so that a breaking change requires an explicit approval and, ideally, a new API version. This is the spec-first equivalent of Pact's can-i-deploy gate. For the broader picture on versioning microservice contracts, see our [API contract testing for microservices](/skills) resources.

---

## Wiring It All Into CI

Here is a GitHub Actions workflow that runs the full ladder: lint, validate examples, diff for breaking changes, then run Dredd and Schemathesis against staging.

\`\`\`yaml
name: OpenAPI Contract Tests

on: [pull_request]

jobs:
  static-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Lint spec
        run: npx spectral lint openapi.yaml --ruleset spectral:oas
      - name: Validate examples
        run: npx openapi-examples-validator openapi.yaml

  live-contract-tests:
    runs-on: ubuntu-latest
    needs: static-checks
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install Schemathesis
        run: pip install schemathesis
      - name: Property-based contract test
        env:
          API_TOKEN: \${{ secrets.STAGING_API_TOKEN }}
        run: |
          schemathesis run openapi.yaml \\
            --url https://staging.api.example.com/v1 \\
            --checks all \\
            --header "Authorization: Bearer \${API_TOKEN}"
      - name: Example replay with Dredd
        run: npx dredd openapi.yaml https://staging.api.example.com/v1
\`\`\`

The \`needs: static-checks\` dependency ensures the cheap, server-free checks act as a gate before you spend time hitting staging. This ordering keeps the feedback loop fast: a malformed example fails in seconds, not minutes.

A few hardening touches make this pipeline production-grade. Cache your dependencies with \`actions/setup-node\`'s built-in npm cache and pip's cache directory so installs do not dominate run time. Publish the Schemathesis and Dredd reports as artifacts with \`if: always()\` so a failing run still leaves you something to inspect. Pin \`--hypothesis-max-examples\` to a modest number on pull requests (say 100) for speed, and run a larger nightly job with 500+ examples that fuzzes more aggressively — property-based testing finds more bugs the longer it runs, so a deeper scheduled job catches the rare boundary case without slowing every PR. Finally, gate deployment on the contract job: if the spec no longer matches the service, the deploy should not proceed. That single rule prevents the most expensive class of API incident, the silent breaking change that ships on a Friday.

---

## Mocking Against the Spec with Prism

Contract testing is not only about verifying a running server — you can also stand the spec up as a mock so consumers can build before the provider exists. **Prism** turns any OpenAPI 3.1 document into a live mock server that returns spec-conformant responses, including the \`examples\` you defined.

\`\`\`bash
npm install -D @stoplight/prism-cli
npx prism mock openapi.yaml --port 4010
\`\`\`

Now a consumer can hit \`http://localhost:4010/orders/123\` and receive the documented example response. Prism also has a proxy mode that sits in front of a real server and validates live traffic against the spec, flagging any response that violates the contract:

\`\`\`bash
npx prism proxy openapi.yaml https://staging.api.example.com/v1 --errors
\`\`\`

The \`--errors\` flag makes Prism return a \`5xx\` whenever the upstream response does not match the schema, which is a powerful way to surface contract violations during exploratory or integration testing. Mock-first development means front-end and back-end teams build in parallel against the same contract, eliminating the integration surprises that plague API projects.

---

## Generating Type-Safe Clients from the Spec

A subtle but high-value benefit of a rigorous OpenAPI 3.1 spec is that it doubles as a code generator input. Generating a typed client guarantees your consumer code cannot drift from the contract at compile time.

\`\`\`bash
npx openapi-typescript openapi.yaml --output src/api-types.ts
\`\`\`

This emits TypeScript types for every schema, path, and response. A request that omits a required field, or reads a field the spec never declared, becomes a compile error rather than a runtime surprise:

\`\`\`typescript
import type { paths } from './api-types';

type GetOrder = paths['/orders/{orderId}']['get'];
type OrderResponse =
  GetOrder['responses']['200']['content']['application/json'];

function renderOrder(order: OrderResponse) {
  // order.status is typed as the enum union, order.note is string | null
  return \`\${order.id}: \${order.status}\`;
}
\`\`\`

When the spec changes — say \`status\` gains a new enum value — regenerating the types immediately flags every place in the codebase that needs updating. This closes the loop: the same document that drives your contract tests also enforces type safety in consumers, so the contract is honored at both runtime and compile time.

---

## Best Practices for Spec-Driven QA

- **Pin \`openapi: 3.1.0\`** and use JSON Schema 2020-12 features deliberately — union types for nullability, real \`$ref\` resolution.
- **Store the spec in version control next to the code** so it evolves in the same PR as the implementation.
- **Run static checks (Spectral, examples-validator) as a pre-commit hook** for instant feedback.
- **Treat \`oasdiff breaking\` as a required PR check** so no breaking change merges silently.
- **Combine Dredd and Schemathesis** — deterministic example replay plus property-based fuzzing covers both documented and undocumented behavior.
- **Validate against staging, not production**, and seed test data through hooks so tests stay independent.

For teams comparing tooling at the framework level, our [Postman vs Playwright for API testing](/blog/postman-vs-playwright-api-testing) breakdown is a useful companion to spec-driven approaches.

---

## Server-Side Validation Middleware

Contract tests prove conformance in CI, but you can also enforce the contract at runtime in the service itself. Express-based services can mount **express-openapi-validator**, which validates every incoming request and outgoing response against the spec on the fly, rejecting anything that violates it before it reaches your handlers.

\`\`\`javascript
const express = require('express');
const OpenApiValidator = require('express-openapi-validator');

const app = express();
app.use(express.json());

app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true,
    validateResponses: true,
  })
);

app.get('/v1/orders/:orderId', (req, res) => {
  // req.params.orderId is already validated as a UUID by the middleware
  res.json({
    id: req.params.orderId,
    status: 'shipped',
    total: 4999,
    note: null,
  });
});

// Spec-aware error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});
\`\`\`

With \`validateResponses: true\`, the middleware throws if your handler ever returns a body that violates the \`Order\` schema — for example, omitting the required \`total\` field. This turns the spec into a runtime guardrail, not just a CI artifact. It is the strongest possible guarantee that documentation and behavior never diverge, because divergence becomes an immediate \`500\` in development.

The trade-off is a small per-request validation cost, so many teams enable \`validateResponses\` only in development and staging while keeping \`validateRequests\` on in production. Either way, pairing runtime validation with the CI ladder above means a contract violation has nowhere to hide: it fails the linter, fails the property-based tests, and fails at runtime. That defense-in-depth is exactly what spec-driven QA aims for, and it complements consumer-side guarantees described in our [Pact contract testing in Python guide](/blog/contract-testing-pact-python-guide).

---

## Frequently Asked Questions

### What is OpenAPI 3.1 contract testing?

OpenAPI 3.1 contract testing treats your OpenAPI document as the single source of truth and automatically verifies that your running API never violates it. Tools read the spec to generate requests, then assert every response matches the declared schemas, status codes, and content types. It catches drift between documentation and the real service before consumers do.

### What changed between OpenAPI 3.0 and 3.1?

OpenAPI 3.1 fully aligns with JSON Schema 2020-12. The biggest practical changes are that nullability is now expressed as a union type like \`type: [string, "null"]\` instead of \`nullable: true\`, \`$ref\` resolves like standard JSON Schema, and webhooks plus richer \`examples\` support arrive. This alignment makes spec validation and runtime validation agree.

### Is Schemathesis or Dredd better for contract testing?

They solve different problems, so use both. Dredd replays the concrete \`examples\` in your spec against a live server to confirm documented behavior works. Schemathesis uses property-based testing to fuzz hundreds of generated inputs per endpoint, finding edge cases your examples never cover. Together they verify both documented and undocumented behavior.

### How is OpenAPI contract testing different from Pact?

OpenAPI testing is spec-first: the provider's OpenAPI document is the contract and tools prove the server matches it. Pact is consumer-driven: each consumer records its expectations and the provider verifies against those pacts. OpenAPI suits public APIs with unknown consumers; Pact suits internal microservices with known consumers.

### What does openapi-examples-validator do?

It checks that every \`example\` and \`examples.value\` embedded in your OpenAPI document actually conforms to the schema it is attached to. It runs without a server in milliseconds, so it is the cheapest contract check available. It catches the common mistake of changing a schema but forgetting to update the matching example.

### How do I detect breaking API changes automatically?

Use oasdiff to compare the spec on your pull request against the spec on the main branch. It classifies each change as breaking or non-breaking — removing a required field, narrowing an enum, or adding a required parameter all register as breaking. Run \`oasdiff breaking\` as a required PR check to block breaking changes from merging silently.

### Can I run OpenAPI contract tests in CI/CD?

Yes, and you should. Run server-free checks (Spectral linting, examples validation, oasdiff) first as a fast gate, then run Dredd and Schemathesis against a staging environment. A GitHub Actions workflow with a \`needs:\` dependency between the static and live jobs keeps feedback fast and prevents wasted runs against staging.

### Do I need a live server to do contract testing?

Not for every layer. Linting with Spectral, validating examples with openapi-examples-validator, and diffing with oasdiff all work purely from the spec file. You only need a running server for Dredd and Schemathesis, which actually issue HTTP requests and verify real responses. Run the static layers locally and the live layers against staging.

---

## Conclusion

OpenAPI 3.1 turns your API documentation into an executable contract. By layering five tools — Spectral for spec quality, openapi-examples-validator for example correctness, oasdiff for breaking-change detection, Dredd for deterministic example replay, and Schemathesis for property-based fuzzing — you get coverage that no hand-written assertion suite can match. The fast, server-free checks gate every commit; the live checks prove the running service honors its promises against staging.

Spec-driven QA scales precisely because the spec is the source of truth: write it once, and the entire testing pipeline derives from it automatically. Start with linting and example validation today, then add property-based testing against staging as your confidence grows. To equip your AI coding agent with ready-to-use contract testing, API validation, and OpenAPI workflows, browse the curated, agent-ready [QA skills on qaskills.sh](/skills) and ship APIs that keep their promises.
`,
};
