import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework RequestsLibrary Contract Testing Guide',
  description:
    'Robot Framework RequestsLibrary contract testing guide for schemas, status rules, error envelopes, and readable API suites that catch drift.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# Robot Framework RequestsLibrary Contract Testing Guide

A Robot Framework suite can make an API contract painfully visible. The keyword table shows the endpoint, the status code, the JSON field, and the schema assertion in a form that a QA lead, backend engineer, and release manager can all read. That readability is the reason RequestsLibrary still shows up in mature API test stacks, even when teams also use pytest, Postman, Pact, or Schemathesis.

Contract testing with RequestsLibrary is not about pretending Robot is a schema registry. It is about placing executable checks at the consumer boundary: what status codes are stable, which response fields are required, how error payloads are shaped, whether auth failures are consistent, and where version drift becomes a release blocker. Used well, the suite becomes a living acceptance layer for services that are otherwise tested mostly through unit and integration tests.

This guide focuses on Robot Framework API contract checks using RequestsLibrary and JSON Schema. For a broader RequestsLibrary introduction, see the [Robot Framework API testing guide](/blog/robot-framework-api-testing-requests-library). For consumer-driven and provider-side contract strategy across services, the [microservices API contract testing guide](/blog/api-contract-testing-microservices) covers the larger architecture.

## Contract scope that fits Robot Framework

RequestsLibrary gives Robot Framework a concise HTTP client: create a session, call an endpoint, inspect the response object, and assert values with normal Robot keywords. The contract part is the discipline around what you choose to assert. A contract suite should avoid mirroring every implementation detail. It should focus on promises that consumers depend on.

Useful Robot contract checks include response status families, content type, required JSON properties, enum values, error envelope shape, pagination metadata, idempotency behavior, and backward-compatible field additions. Poor checks include exact timestamps, database-generated IDs with no semantic meaning, response ordering when the API does not promise ordering, and every internal field returned by an admin endpoint.

| Contract concern | RequestsLibrary role | Good assertion | Bad assertion |
|---|---|---|---|
| Endpoint availability | Sends the real request | \`GET /v1/products/{id}\` returns 200 for a seeded product | Page-load timing from a browser journey |
| Response shape | Exposes JSON body to Robot | Required fields match JSON Schema | Every key appears in a fixed order |
| Error behavior | Exercises negative requests | Invalid quantity returns 400 with stable code | Full prose error message equals one sentence |
| Auth boundary | Sends headers per session | Missing token returns 401 and no private fields | Token signing internals |
| Pagination | Checks metadata and links | \`nextCursor\` exists when more records remain | Exact record count in a mutable dataset |

Robot's keyword syntax is a strength when contracts are owned by QA and service teams together. The file should read like a release checklist, not like a hidden programming puzzle. Put complex parsing in small custom keywords or Python helper libraries, then keep the suite itself declarative.

## Session setup without hiding the contract

\`Create Session\` defines the base URL, common headers, and connection behavior for subsequent \`GET On Session\`, \`POST On Session\`, and related keywords. For contract testing, create one session per role or authentication shape. Do not mutate headers mid-test unless the mutation is the behavior being tested.

A common pattern is to define variables for the API URL and token, then create a suite-level session. Keep environment-specific values outside the suite so the same contract runs against local, staging, and a deployed test environment.

\`\`\`robotframework
*** Settings ***
Library           RequestsLibrary
Library           Collections

Suite Setup       Create Catalog Session

*** Variables ***
\${API_BASE_URL}   http://localhost:8080
\${API_TOKEN}      local-contract-token

*** Keywords ***
Create Catalog Session
    &{headers}=    Create Dictionary
    ...    Authorization=Bearer \${API_TOKEN}
    ...    Accept=application/json
    ...    X-Consumer=qa-contract-suite
    Create Session    catalog    \${API_BASE_URL}    headers=&{headers}

Response JSON Should Match Schema
    [Arguments]    \${response}    \${schema}
    \${body}=      Call Method    \${response}    json
    Evaluate       jsonschema.validate($body, $schema)    modules=jsonschema

*** Test Cases ***
Product Detail Contract Includes Stable Commercial Fields
    \${response}=    GET On Session    catalog    /v1/products/sku-1001    expected_status=200
    Should Be Equal    \${response.headers}[Content-Type]    application/json
    &{schema}=    Evaluate
    ...    {
    ...      "type": "object",
    ...      "required": ["id", "name", "price", "currency", "availability"],
    ...      "additionalProperties": True,
    ...      "properties": {
    ...        "id": {"type": "string"},
    ...        "name": {"type": "string", "minLength": 1},
    ...        "price": {"type": "integer", "minimum": 0},
    ...        "currency": {"enum": ["USD", "EUR", "INR"]},
    ...        "availability": {"enum": ["in_stock", "backorder", "discontinued"]}
    ...      }
    ...    }
    Response JSON Should Match Schema    \${response}    \${schema}
\`\`\`

The schema allows additional properties. That matters. A provider can add a new optional field without breaking consumers. If your contract rejects every unknown field by default, the suite becomes a change-prevention tool rather than a compatibility gate. Use \`additionalProperties: False\` only when the consumer genuinely cannot tolerate extra data, such as strict signed payloads or exported files with fixed columns.

## Schema assertions that catch drift but allow evolution

JSON Schema is the cleanest way to express response shape in Robot without writing dozens of field-level assertions. The choice of schema strictness is where teams usually go wrong. Contract tests should detect breaking changes: removed required fields, type changes, enum changes, incompatible nullability, and changed error structures. They should usually allow additive optional fields.

For response schemas, required fields should reflect what consumers actually read. If a mobile client only needs \`id\`, \`name\`, and \`price\`, do not require internal merchandising fields just because the service returns them today. For provider-owned admin APIs, it may be reasonable to assert more fields, but that is still a consumer decision.

Keep schemas close to the suite when they are small. Move them to files when they are shared, versioned, or reused by multiple suites. If you load schema files, validate that the file exists and is non-empty before running HTTP calls. A missing schema should fail setup, not silently skip the contract.

| Schema decision | Backward-compatible default | When to be stricter | Example |
|---|---|---|---|
| Additional properties | Allow | Signed payloads, exact export formats | Invoice webhook with HMAC body |
| Nullable fields | Only allow when documented | Consumer assumes value is always present | \`currency\` should not be null |
| String formats | Use for meaningful formats | Date, email, URI, UUID contracts | \`createdAt\` as \`date-time\` |
| Numeric bounds | Assert business limits | Quantity, price, percentage | \`quantity\` minimum 1 |
| Enums | Assert stable consumer values | Status fields and type discriminators | \`availability\` values |

When a provider intentionally breaks a contract, change the schema and version the endpoint or consumer agreement in the same pull request. The Robot diff should tell reviewers exactly what changed. A contract suite that only says "schema failed" without naming the field is frustrating, so prefer a JSON Schema validator that returns clear paths in error output.

## Negative contracts for errors and validation

Many API suites over-focus on happy paths. Consumers often depend more heavily on error contracts: a payment form expects \`INVALID_CARD\`, a checkout screen expects \`OUT_OF_STOCK\`, and an agentic workflow might branch on \`RATE_LIMITED\`. If error envelopes drift, clients can degrade in ways that do not show up as provider failures.

RequestsLibrary makes negative checks readable. Use explicit \`expected_status\` so a 400 response is treated as the expected HTTP result, then assert the body shape. Keep negative payloads minimal and targeted. One test should explain one invalid condition.

\`\`\`robotframework
*** Settings ***
Library           RequestsLibrary
Library           Collections

*** Variables ***
\${API_BASE_URL}   http://localhost:8080

*** Test Cases ***
Create Order Rejects Zero Quantity With Stable Error Code
    Create Session    orders    \${API_BASE_URL}    headers=&{EMPTY}
    &{line}=       Create Dictionary    sku=sku-1001    quantity=0
    @{lines}=      Create List    \${line}
    &{payload}=    Create Dictionary    customerId=cust-contract-1    lines=\${lines}

    \${response}=  POST On Session
    ...    orders
    ...    /v1/orders
    ...    json=\${payload}
    ...    expected_status=400

    \${problem}=   Call Method    \${response}    json
    Should Be Equal    \${problem}[code]        INVALID_QUANTITY
    Should Be Equal    \${problem}[field]       lines[0].quantity
    Should Contain     \${problem}              requestId
    Should Not Contain \${problem}              stackTrace
\`\`\`

This is a contract, not a generic validation test. It checks the status, machine-readable code, field path, presence of a request ID, and absence of implementation leakage. It does not assert the exact English wording. Product copy can change without breaking an API consumer, but the code and field path are part of the integration agreement.

For auth errors, use separate sessions: anonymous, valid user, expired token, and insufficient role. That layout makes the contract readable and prevents header state from leaking between tests.

## Data setup that keeps Robot contracts deterministic

API contract suites need stable data. If the suite depends on whatever product happened to be created yesterday, failures become archaeology. There are three workable options: seed records before the suite, use provider-owned test fixtures, or create data through public APIs in setup and clean it afterward.

For read-only contracts, seeded fixtures are usually best. The service owns a known product, customer, or policy in a test environment. The contract suite asserts against stable identifiers and shape, not volatile counts. For write contracts, create unique data per run. Use a test-specific prefix and idempotency key so reruns do not collide.

Robot can create data in suite setup, but do not let setup become a second application. If setup needs ten HTTP calls and special ordering, consider a provider fixture endpoint restricted to test environments. The goal is not to hide complexity, it is to keep contract checks understandable.

Be cautious with cleanup. A failed test should leave enough evidence for debugging. Instead of deleting everything immediately, some teams mark records with a run ID and run a scheduled cleanup. That is safer for contract debugging than tearing down the only payload that reproduced the failure.

## CI gates and failure ownership

A RequestsLibrary contract suite can run in several places: consumer CI against a mock provider, provider CI against a deployed service, nightly against staging, and pre-release against a production-like environment. Do not give all of those runs the same blocking power.

The most useful blocking gate is provider CI for consumer contracts that are expected to remain compatible. If a backend pull request removes \`availability\` or changes \`price\` from integer cents to a formatted string, the provider should know before merge. A staging nightly run is still useful, but it finds drift later.

Failure ownership must be explicit. If a schema fails because the provider removed a field, the provider owns the fix or versioning decision. If the suite required a field no consumer actually uses, the test owner should relax the contract. If the environment is missing seed data, platform or test data ownership needs attention. "Robot failed" is not a useful category.

## Robot Framework versus other contract tools

Robot is not the only way to test API contracts, and it should not be forced into every role. Its advantage is readable executable specification and broad QA team accessibility. Its weakness is that it does not inherently broker consumer-provider contracts the way Pact does, and it does not automatically explore schemas the way fuzzing tools do.

| Tooling option | Best fit | What it catches well | What it does not replace |
|---|---|---|---|
| Robot Framework plus RequestsLibrary | Human-readable API acceptance contracts | Stable fields, status codes, error envelopes | Provider verification broker workflows |
| Pact | Consumer-driven contracts between independently deployed services | Provider breaks against recorded consumer expectations | Broad exploratory API validation |
| Schemathesis | OpenAPI-driven generated API tests | Schema violations and unexpected server errors | Business-specific workflow assertions |
| Postman/Newman | Collection-based API checks and manual-friendly workflows | Request examples and environment smoke checks | Keyword-driven readable test design |

The strongest setups often combine tools. Robot covers release-critical examples in a format QA owns. Pact protects service-to-service consumer promises. OpenAPI validation and generated tests explore broader surfaces. The important part is avoiding duplicate suites that assert the same field in five places with five different fixtures.

## Keeping keywords honest as contracts evolve

Robot suites become hard to trust when custom keywords hide too much. A keyword named \`Product Should Be Valid\` might contain twenty assertions, a schema file load, a database lookup, and a retry loop. That reads nicely until it fails. Contract keywords should expose the contract boundary in their names: \`Response JSON Should Match Schema\`, \`Problem Details Code Should Be\`, \`Pagination Cursor Should Be Present\`, or \`Auth Failure Should Not Leak User Data\`.

Prefer a thin keyword layer. Use Python helper libraries for reusable technical work, such as loading schemas, formatting validator errors, or comparing headers case-insensitively. Keep business expectations in the Robot file where reviewers can see them. If the contract says \`INVALID_QUANTITY\`, that code should be visible in the test case, not buried in a helper that only the automation owner reads.

Version contract keywords when behavior changes meaningfully. If \`Validate Product V1 Schema\` and \`Validate Product V2 Schema\` exist side by side during migration, reviewers immediately understand that two contracts are being supported. A single keyword that switches based on environment variables can hide accidental drift between staging and production.

Also make failure messages precise. JSON Schema validators can return paths such as \`/price\` or \`/items/0/sku\`; preserve that output. Robot's default failure from a generic \`Evaluate\` can be terse, so wrap validation in a helper if you need better diagnostics. The goal is for the failure to say "required field \`currency\` missing from product response", not "keyword failed."

## Contract review in pull requests

Treat Robot contract files as API artifacts. A pull request that changes a required field, expected status, or error code should be reviewed by someone who owns the consumer impact. Test-only approval is not enough when the test represents an external promise.

When a contract changes, require three pieces of context: what consumer behavior changed, whether old clients still work, and which environment first enforces the new expectation. For additive fields, that note may be short. For removed fields or narrowed enums, it should include a migration plan. This discipline prevents Robot suites from becoming either stale documentation or unilateral blockers.

Tag tests by contract area so CI can run targeted subsets. A payment service change should run payment contracts quickly. A full nightly can still run every RequestsLibrary suite, but pull request feedback should be close to the changed surface. Robot tags such as \`catalog-contract\`, \`orders-negative\`, and \`auth-boundary\` are simple but effective.

## Frequently Asked Questions

### Can RequestsLibrary tests be real contract tests?

Yes, if they assert consumer-visible promises rather than incidental response details. Use schemas, status checks, headers, and error codes that represent compatibility requirements.

### Should Robot Framework schemas reject unknown JSON fields?

Usually no. Allow additional properties unless the consumer cannot tolerate them. Rejecting every new optional field turns a compatibility test into an unnecessary change blocker.

### How do I validate JSON Schema from Robot Framework?

Use RequestsLibrary to get the response, call the response object's \`json\` method, and run \`jsonschema.validate\` through Robot's \`Evaluate\` keyword or a small Python keyword library.

### Where should API test data live?

Prefer provider-owned seeded fixtures for read contracts and unique per-run data for write contracts. Avoid depending on mutable records created manually in a shared environment.

### Is Robot Framework better than Pact for contracts?

They solve different problems. Robot is strong for readable API acceptance contracts. Pact is stronger for consumer-driven provider verification between independently released services.
`,
};
