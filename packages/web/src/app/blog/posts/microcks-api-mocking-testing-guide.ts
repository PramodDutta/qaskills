import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Microcks: API Mocking and Contract Testing for OpenAPI, AsyncAPI, and gRPC',
  description: 'A practical microcks guide for turning OpenAPI, AsyncAPI, gRPC, and GraphQL artifacts into mocks, contract tests, and CI checks agents can trust.',
  date: '2026-09-28',
  category: 'API Testing',
  content: `
# Microcks: API Mocking and Contract Testing for OpenAPI, AsyncAPI, and gRPC

Microcks is an open source, CNCF incubating API mocking and contract testing platform for teams that want one contract repository to drive mock endpoints, conformance tests, and service sandboxing. The official GitHub release page shows Microcks 1.15.0 published on August 5, 2026, and the project remains active. Its own repository describes it as cloud native and lists stable container tags, while the documentation covers Docker, Docker Compose, Helm, Kubernetes Operator, CLI automation, and Testcontainers modules.

The short answer for QA engineers is this: use Microcks when the contract artifact should be the operational source of truth. If your team already keeps OpenAPI, AsyncAPI, GraphQL, gRPC protobuf, Postman, or SoapUI artifacts in source control, Microcks can import those artifacts, expose mocks from their examples, and then run tests that compare a deployed implementation with the same contract. That makes it a good fit for AI coding agents because the agent can change a handler, run a Microcks conformance test, and get a precise report instead of guessing from a brittle hand-written mock.

Microcks is not a tiny local-only stub server. It is a repository, UI, runtime, and automation surface. For a single frontend developer who wants a fast JSON stub, a narrower tool like [Mockoon](/blog/mockoon-api-mocking-tool-guide) may be easier. For a contract-first team that wants mocks and contract checks to evolve together, Microcks deserves a serious look, especially when compared with lighter OpenAPI mock runners such as [Stoplight Prism](/blog/stoplight-prism-api-mocking-guide-2026).

## Current Status and What Microcks Actually Runs

Microcks 1.15.0 (August 5, 2026) is the current release. The official documentation also states that the CLI is released independently of the server components, so treat the server image, Helm chart, Operator, CLI, and Testcontainers modules as related but separately versioned pieces. Pin each one in CI instead of assuming that \`latest\` means the same thing everywhere.

The product model is simple once you separate four ideas:

| Concept | What Microcks stores | What QA engineers get |
| --- | --- | --- |
| API or service | Name, version, protocol, operations | A searchable catalog of contracts and mock endpoints |
| Artifact | OpenAPI, AsyncAPI, GraphQL, protobuf, Postman, SoapUI, or other supported file | Imported operations, schemas, examples, and test metadata |
| Mock | Generated endpoint based on examples and dispatch rules | A dependency replacement for local dev, component tests, and demos |
| Test | A conformance run against an implementation endpoint | Evidence that a deployed service still matches the contract |

That split matters because many teams make the first Microcks mistake: they import a contract with no useful examples and expect a rich mock. Microcks can parse the structure, but mocks need examples, operation metadata, or companion artifacts that describe what response should be returned. The official import docs describe primary and secondary artifacts. In practice, the OpenAPI file is often the primary artifact, while a Postman collection or additional examples file acts as secondary data for richer mocks and tests.

The supported test runners are also not interchangeable. The official test endpoint reference lists runner names such as \`HTTP\`, \`OPEN_API_SCHEMA\`, \`ASYNC_API_SCHEMA\`, \`GRPC_PROTOBUF\`, \`GRAPHQL_SCHEMA\`, \`POSTMAN\`, \`SOAP\`, \`SOAP_UI\`, and related strategies. Use the runner that matches the artifact and the failure you want to catch. A smoke runner tells you less than an OpenAPI schema runner. A Postman runner can validate scripted assertions, but it also depends on the quality of those scripts.

## Import Strategy: Push for Local Work, Pull for Teams

Microcks supports three practical import paths: upload through the UI, push through the API or CLI, and scheduled importer jobs where Microcks pulls artifacts from a remote location. For a QA engineer working with an AI agent, the local push flow is fastest. For a platform team, the pull flow is usually more reliable because it keeps contracts in Git and lets Microcks refresh from a stable location.

| Import path | Best use | Weakness to plan for |
| --- | --- | --- |
| UI Quick Import | Exploration, demos, one-off verification | Easy to forget and hard to reproduce |
| API or CLI import | Agent workflows, pre-merge checks, local contract experiments | Needs service account roles and secret handling |
| Importer job | Shared environments and contract catalog governance | Requires reachable artifact URLs and dependency resolution |
| Kubernetes \`APISource\` | GitOps-managed Microcks instances | Requires Operator deployment and cluster discipline |

The official docs call out a dependency resolution issue that QA teams should not ignore: direct upload is convenient, but relative \`$ref\` references in OpenAPI or AsyncAPI files may not resolve unless Microcks can reach a default artifact repository. If your contract imports cleanly in the UI but fails in CI, check whether the CI import path can see the same referenced files.

Here is a small OpenAPI artifact that has enough examples to support a useful mock. It is intentionally boring because the goal is a stable test contract, not a clever schema demo.

\`\`\`yaml
openapi: 3.1.0
info:
  title: Billing Status API
  version: 1.0.0
paths:
  /billing/accounts/{accountId}/status:
    get:
      operationId: getBillingStatus
      parameters:
        - name: accountId
          in: path
          required: true
          schema:
            type: string
            pattern: '^acct_[a-z0-9]{8}$'
          examples:
            activeAccount:
              value: acct_a1b2c3d4
      responses:
        '200':
          description: Account billing status
          content:
            application/json:
              schema:
                type: object
                required:
                  - accountId
                  - status
                  - checkedAt
                properties:
                  accountId:
                    type: string
                  status:
                    type: string
                    enum:
                      - active
                      - past_due
                      - blocked
                  checkedAt:
                    type: string
                    format: date-time
              examples:
                active:
                  value:
                    accountId: acct_a1b2c3d4
                    status: active
                    checkedAt: '2026-09-28T10:00:00Z'
\`\`\`

Notice the anchored account identifier pattern. It is better than a loose contains check because it prevents a generated client, test, or agent-authored handler from accepting accidental prefixes and suffixes. When agents update this file, ask them to preserve specific examples and operation ids. Microcks can only give you deterministic mocks if the contract data is deterministic.

## Local Setup Options That Do Not Fight Your Test Loop

For the fastest local tour, Microcks documents an all-in-one Docker command using the \`quay.io/microcks/microcks-uber:latest-native\` image and port \`8585\`. For a fuller local environment, Docker Compose starts the app, database, Keycloak, and Postman runtime. Docker Compose does not enable asynchronous API features by default, but the docs show an \`async-addon.yml\` profile that adds Kafka and the async minion.

\`\`\`bash
docker run -p 8585:8080 -it --rm quay.io/microcks/microcks-uber:1.15.0-native
\`\`\`

For a team environment, use Helm or the Kubernetes Operator instead of a long-lived laptop container. The Operator is particularly useful when you want the Microcks instance and its imported APIs to be controlled by Kubernetes resources. The official Operator guide shows \`Microcks\`, \`APISource\`, \`SecretSource\`, and \`Test\` custom resources in the newer operator flow.

\`\`\`yaml
apiVersion: microcks.io/v1alpha1
kind: Microcks
metadata:
  name: microcks
spec:
  version: 1.15.0
  microcks:
    url: microcks.qa.example.test
  keycloak:
    url: keycloak.qa.example.test
\`\`\`

The deployment choice should follow the feedback loop:

| Loop | Recommended runtime | Why |
| --- | --- | --- |
| Agent edits one service locally | Uber container or Testcontainers | Disposable and cheap to reset |
| QA validates several services before merge | Docker Compose or ephemeral namespace | Keeps auth and companion runtimes available |
| Shared sandbox for many teams | Helm or Operator | Stable URLs, RBAC, importer jobs, and secrets |
| GitOps platform | Operator plus \`APISource\` | Contracts and instance state can be reviewed as code |

Do not start with the heaviest option just because Microcks is cloud native. Start with the runtime that matches the loop you need to improve. Then make the path to production more reproducible as confidence grows.

## CLI Conformance Tests in CI

The Microcks CLI supports a \`test\` command with arguments for service name and version, test endpoint URL, runner type, and connection credentials. The official docs show \`--microcksURL\`, \`--keycloakClientId\`, \`--keycloakClientSecret\`, \`--operationsHeaders\`, \`--insecure-tls\`, and \`--waitFor\`. Older examples may show \`--insecure\`; the current CLI guide I verified uses \`--insecure-tls\`.

\`\`\`bash
docker run --rm --add-host=host.docker.internal:host-gateway quay.io/microcks/microcks-cli:latest microcks test \\
  'Billing Status API:1.0.0' \\
  http://host.docker.internal:3000 \\
  OPEN_API_SCHEMA \\
  --microcksURL=http://host.docker.internal:8585/api/ \\
  --keycloakClientId=microcks-serviceaccount \\
  --keycloakClientSecret='local-development-secret' \\
  --waitFor=10sec \\
  --insecure-tls
\`\`\`

In GitHub Actions, separate three concerns: start the system under test, make sure Microcks can reach it, then run the conformance command. The example below pins current action majors and keeps credentials in secrets. It also uploads reports or logs as artifacts, because a failed schema conformance test without the detailed result URL is painful to debug after the runner disappears.

\`\`\`yaml
name: contract

on:
  pull_request:

jobs:
  microcks-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22

      - run: npm ci

      - run: npm run build

      - run: npm run start:test-server
        env:
          PORT: 3000

      - name: Run Microcks OpenAPI conformance
        run: |
          docker run --rm --add-host=host.docker.internal:host-gateway quay.io/microcks/microcks-cli:latest microcks test \\
            'Billing Status API:1.0.0' \\
            http://host.docker.internal:3000 \\
            OPEN_API_SCHEMA \\
            --microcksURL='\${{ secrets.MICROCKS_API_URL }}' \\
            --keycloakClientId='\${{ secrets.MICROCKS_CLIENT_ID }}' \\
            --keycloakClientSecret='\${{ secrets.MICROCKS_CLIENT_SECRET }}' \\
            --waitFor=20sec \\
            --insecure-tls

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: microcks-contract-\${{ github.run_id }}
          path: |
            logs
            reports
\`\`\`

The most common CI failure is not a schema mismatch. It is reachability. The CLI runs in a container, your app may run on the host network, and Microcks may be a remote service behind TLS and Keycloak. Diagnose in this order: can the CLI reach Microcks, can Microcks reach the test endpoint, does the service account have enough rights, and only then inspect contract failures. If the test endpoint is local to the runner, use an address that the container and Microcks can actually resolve.

## Testcontainers for Agent-Friendly Inner Loops

The official Microcks documentation lists Testcontainers modules for Java, Node.js and TypeScript, Go, and .NET, with a community Python module tracked separately. For AI coding agents, the Node module is especially useful because the agent can spin up Microcks, import artifacts, call the mock, and verify that the mock was invoked inside a normal unit or integration test.

\`\`\`typescript
import { afterAll, describe, expect, it } from 'vitest';
import { MicrocksContainer, type TestRequest, TestRunnerType } from '@microcks/microcks-testcontainers';
import path from 'node:path';

const resourcesDir = path.resolve(process.cwd(), 'test-resources');

describe('billing contract with Microcks', () => {
  let container: MicrocksContainer;

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  });

  it('serves a mock and records the dependency call', async () => {
    container = await new MicrocksContainer()
      .withMainArtifacts([path.resolve(resourcesDir, 'billing-openapi.yaml')])
      .start();

    const baseUrl = container.getRestMockEndpoint('Billing Status API', '1.0.0');
    const response = await fetch(\`\${baseUrl}/billing/accounts/acct_a1b2c3d4/status\`);
    const body = await response.json() as { status?: string; accountId?: string };

    expect(response.status).toBe(200);
    expect(body.accountId).toBe('acct_a1b2c3d4');
    expect(['active', 'past_due', 'blocked']).toContain(body.status);
    expect(await container.verify('Billing Status API', '1.0.0')).toBe(true);
  });

  it('reports useful conformance details for a deployed endpoint', async () => {
    container = await new MicrocksContainer()
      .withMainArtifacts([path.resolve(resourcesDir, 'billing-openapi.yaml')])
      .start();

    const request: TestRequest = {
      serviceId: 'Billing Status API:1.0.0',
      runnerType: TestRunnerType.OPEN_API_SCHEMA,
      testEndpoint: 'http://localhost:3000',
      timeout: 5000
    };

    const result = await container.testEndpoint(request);

    expect(result.testedEndpoint).toBe('http://localhost:3000');
    expect(result.testCaseResults.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });
});
\`\`\`

That sample asserts side effects, not just status codes. It checks the response body, then uses \`verify\` to prove the service mock was actually invoked. This is where Microcks is stronger than a hand-written stub: the same artifact can provide the mock, the invocation evidence, and a later conformance test against the real implementation.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI, but keep the Microcks workflow in source control. The skill should help an agent run the same repeatable command your developers run, not hide a one-off sequence in chat history.

## AsyncAPI and gRPC Are Different Enough to Plan Separately

Microcks can handle REST OpenAPI, AsyncAPI, GraphQL, gRPC, SOAP, and Postman-based workflows, but the test mechanics differ. AsyncAPI tests often require a broker endpoint and a single operation per test because endpoints and bindings may differ by operation. The official test parameter docs explicitly call out that an \`ASYNC_API_SCHEMA\` test on an event-based API selects one operation at a time.

For gRPC, Microcks uses protobuf definitions, and the official gRPC conventions explain that Microcks needs both the protobuf service definition and Postman collection examples for mock request and response data. It supports \`proto3\`, and because gRPC does not have a native service version concept, Microcks derives version information from package conventions.

| API style | Artifact foundation | Runner to consider | Watch out for |
| --- | --- | --- | --- |
| REST | OpenAPI plus examples | \`OPEN_API_SCHEMA\` | Missing examples produce thin mocks |
| Async events | AsyncAPI plus broker details | \`ASYNC_API_SCHEMA\` | One operation per test and broker reachability |
| GraphQL | GraphQL schema and examples | \`GRAPHQL_SCHEMA\` or \`POSTMAN\` | Query examples must reflect real client behavior |
| gRPC | \`proto3\` plus Postman examples | \`GRPC_PROTOBUF\` | Version conventions and sample coverage |
| REST with scripts | Postman collection | \`POSTMAN\` | Script quality determines failure quality |

What people get wrong is treating every API style as an HTTP endpoint with a different file extension. Async tests need time windows, broker credentials, and clear trigger steps. gRPC mocks need binary protocol tooling and service naming discipline. If you ask an AI coding agent to "add Microcks coverage," require it to state which artifact is primary, which artifacts provide examples, which runner is used, and how the endpoint is reachable from the runner.

## Failure Mode: The Mock Works Locally but CI Conformance Fails

Here is a realistic failure. A team imports an OpenAPI file and sees the Microcks mock return \`200\` locally. The agent then changes the service implementation, CI runs \`OPEN_API_SCHEMA\`, and Microcks reports that the response body is missing \`checkedAt\`. The developer argues that the mock passed, so CI must be wrong.

The diagnosis is usually that the local mock exercised one example, while the conformance test validated the implementation against the schema. Mocks answer from examples. Schema conformance checks the implementation response against required properties, response codes, and operation definitions. The fix is not to loosen the schema. The fix is to update the implementation or, if the contract has changed, update examples and schema together.

Use this triage checklist:

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Import succeeds but mock returns generic data | Contract lacks concrete examples | Add operation examples or secondary artifacts |
| CLI cannot authenticate | Service account role or secret mismatch | Verify Keycloak client id, secret, and roles |
| Test hangs | Microcks cannot reach the endpoint or async broker | Test network reachability from the Microcks side |
| \`OPEN_API_SCHEMA\` fails but mock worked | Example coverage differs from schema coverage | Inspect required fields and response content type |
| Async test sees no messages | System under test was not triggered while Microcks listened | Start the test, trigger the event, then await the result |

For agents, make that checklist part of the prompt. "Fix the Microcks failure" is too vague. "Read the Microcks test result, identify whether this is artifact import, reachability, auth, schema, or trigger timing, then change only the contract or implementation needed" produces better work.

## Choosing Microcks Over Smaller Mocking Tools

Microcks earns its keep when you need contract reuse across roles. Developers get mocks. QA gets conformance reports. Architects get a catalog. Platform engineers get Kubernetes deployment options. AI agents get a stable automation target with CLI and Testcontainers surfaces.

Choose Microcks when:

| Situation | Microcks fit |
| --- | --- |
| Multiple teams consume the same APIs | Strong, because contract versions become visible and reusable |
| You need REST plus AsyncAPI or gRPC | Strong, because one platform handles several styles |
| You want local tests generated from the same artifacts as CI | Strong, especially with Testcontainers |
| You only need a one-file fake server | Usually too much platform |
| Your examples are poor and nobody owns contracts | Fix ownership first, then add Microcks |

The decision guidance is direct: if your bottleneck is "we cannot trust whether this service still matches the contract," Microcks is on target. If your bottleneck is "we need a quick fake endpoint for a prototype," it may be heavier than necessary. The best teams use both categories deliberately instead of forcing every mock into one tool.

## Frequently Asked Questions

### Is Microcks only for OpenAPI?

No. Microcks supports OpenAPI for REST, but the official docs also cover AsyncAPI, GraphQL, gRPC with protobuf, SOAP, Postman, and SoapUI workflows. The important detail is that each API style has different artifact and runner needs. REST conformance commonly uses \`OPEN_API_SCHEMA\`. Event APIs use \`ASYNC_API_SCHEMA\` with broker endpoints and one operation per test. gRPC uses \`GRPC_PROTOBUF\` and needs protobuf plus example data.

### Should QA teams run Microcks in every pull request?

Run it where the contract is relevant to the change. For a service handler change, an OpenAPI schema conformance test in CI is valuable. For frontend-only copy changes, it is probably noise. A good pattern is to run Testcontainers-based Microcks checks in component tests and run the CLI against a deployed preview when API behavior changed. Keep the command deterministic so AI agents and humans see the same result.

### What is the biggest Microcks adoption mistake?

The biggest mistake is importing a schema and calling the job done. A schema without useful examples gives you weak mocks. A Postman collection without maintained assertions gives you weak conformance. Microcks amplifies the quality of your artifacts, for better or worse. Assign ownership to operation ids, examples, versions, and secondary artifacts before you make Microcks a required gate.

### How should AI coding agents use Microcks safely?

Give the agent a narrow contract task: import artifacts, run the relevant runner, read the failure, and patch either implementation or contract with justification. Do not let it blindly relax schemas to make CI pass. Require meaningful assertions, anchored patterns, reachable endpoint checks, and artifact diffs. Microcks is most useful when the agent treats it as evidence, not as a box to silence.
`,
};
