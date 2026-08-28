import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing GraphQL Error Handling: Partial Data, Error Paths, and Nulls',
  description: 'graphql error handling testing proves partial data survives, error paths stay stable, and null behavior is safe before clients ship broken retries in production.',
  date: '2026-08-28',
  category: 'API Testing',
  content: `
# Testing GraphQL Error Handling: Partial Data, Error Paths, and Nulls

graphql error handling testing means proving that a GraphQL operation returns the right mix of \`data\`, \`errors\`, nulls, and error paths when one resolver fails and others still succeed. A good test does not only check that an error exists. It checks which field became null, whether sibling fields survived, whether the \`errors[].path\` points to the failing field, and whether sensitive server details stayed out of the response.

The practical payoff is simple: clients can render partial screens without guessing, retries can target the right operation, and backend teams can change resolver internals without breaking the user-visible error contract.

GraphQL makes API error handling different from REST. A 200 HTTP status can contain a business failure. A response can be both successful and failed. A non-null child can force its parent to null. An error path can include list indexes. Those details are easy to miss if a test suite only validates happy-path JSON.

This article treats GraphQL errors as a contract. The contract has four parts:

| Contract piece | What the test proves | Common bug it catches |
|---|---|---|
| Partial data | Healthy sibling fields still return values | One failing resolver aborts the whole operation |
| Error path | \`errors[].path\` names the exact failed field or list item | Clients attach the message to the wrong UI region |
| Null behavior | Nullable and non-null fields propagate null according to schema | A schema change turns a small failure into a blank page |
| Message safety | Error text is useful but not a stack trace or SQL detail | Internal implementation leaks to browsers, logs, or AI agents |

Official references worth keeping nearby are the GraphQL specification at https://spec.graphql.org/October2021/ and the GraphQL over HTTP draft at https://graphql.github.io/graphql-over-http/draft/. Your tests should match the behavior of your server implementation, but the field names \`data\`, \`errors\`, \`message\`, \`path\`, and \`locations\` come from the GraphQL response model, not from a local convention.

## Start With The Response Contract, Not The Resolver

The strongest GraphQL error tests are written against the operation response. Resolver unit tests still have value, especially for domain logic, but they cannot prove what a client receives after GraphQL execution has applied null bubbling, list indexing, extensions, masking, and formatting.

Use a concrete operation and a realistic failure trigger. Do not mock the whole GraphQL execution layer unless you are testing a formatter in isolation. A test that calls a resolver function directly can pass while production still returns the wrong path or nulls the wrong parent.

Consider this trimmed schema for an account dashboard:

\`\`\`graphql
type Query {
  viewer: Viewer!
}

type Viewer {
  id: ID!
  name: String!
  billing: BillingSummary
  projects: [Project!]!
}

type BillingSummary {
  plan: String!
  nextInvoiceCents: Int!
}

type Project {
  id: ID!
  name: String!
  riskScore: Int
}
\`\`\`

The contract says billing is nullable, while projects are a non-null list of non-null project objects. A billing service failure should set \`viewer.billing\` to null and add an error path of \`["viewer", "billing"]\`. It should not erase \`viewer.name\` or \`viewer.projects\`. A failure inside \`Project.name\`, however, is much more destructive because \`Project.name\` is non-null and the list does not allow null project items.

Here is the operation a client might use:

\`\`\`graphql
query Dashboard {
  viewer {
    id
    name
    billing {
      plan
      nextInvoiceCents
    }
    projects {
      id
      name
      riskScore
    }
  }
}
\`\`\`

Before writing code, name the behaviors you expect:

| Failure trigger | Expected data | Expected error path | Client reaction |
|---|---|---|---|
| Billing service timeout | \`viewer.billing\` is null, viewer and projects remain | \`["viewer", "billing"]\` | Show account page with billing panel error |
| Risk service timeout | Each affected \`riskScore\` is null | \`["viewer", "projects", 0, "riskScore"]\` | Render project row with unknown risk |
| Project name missing | Depending on execution, the containing project cannot satisfy non-null name | Path includes list index and \`name\` | Treat project list as unreliable |
| Auth denied at viewer | \`data\` may be null because \`viewer\` is non-null | \`["viewer"]\` | Send user to sign-in or permission screen |

This table is more than documentation. It is a test plan. QA engineers can pair it with fixtures, and AI coding agents can convert it into tests without inventing behavior.

## Build A Minimal Harness That Exercises Real GraphQL Execution

For local contract tests, a small GraphQL execution harness is often enough. The example below uses the \`graphql\` package directly. It runs as a Vitest test and avoids server transport so the assertions focus on GraphQL semantics.

\`\`\`ts
import { describe, expect, test } from "vitest";
import { buildSchema, graphql } from "graphql";

const schema = buildSchema(\`
  type Query {
    viewer: Viewer!
  }

  type Viewer {
    id: ID!
    name: String!
    billing: BillingSummary
    projects: [Project!]!
  }

  type BillingSummary {
    plan: String!
    nextInvoiceCents: Int!
  }

  type Project {
    id: ID!
    name: String!
    riskScore: Int
  }
\`);

const query = \`
  query Dashboard {
    viewer {
      id
      name
      billing {
        plan
        nextInvoiceCents
      }
      projects {
        id
        name
        riskScore
      }
    }
  }
\`;

function rootValueWithBillingFailure() {
  return {
    viewer: () => ({
      id: "user-1",
      name: "Rina",
      billing: () => {
        throw new Error("Billing service unavailable");
      },
      projects: [
        { id: "project-1", name: "Checkout", riskScore: 7 },
        { id: "project-2", name: "Search", riskScore: 3 }
      ]
    })
  };
}

describe("Dashboard GraphQL errors", () => {
  test("keeps sibling data when nullable billing fails", async () => {
    const result = await graphql({
      schema,
      source: query,
      rootValue: rootValueWithBillingFailure()
    });

    expect(result.data).toEqual({
      viewer: {
        id: "user-1",
        name: "Rina",
        billing: null,
        projects: [
          { id: "project-1", name: "Checkout", riskScore: 7 },
          { id: "project-2", name: "Search", riskScore: 3 }
        ]
      }
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]?.path).toEqual(["viewer", "billing"]);
  });
});
\`\`\`

This is not a substitute for HTTP tests, but it is fast and specific. It catches null bubbling bugs early, and it gives an AI coding agent a small feedback loop while it works on schema or resolver changes.

Add an HTTP-level test when you need to verify status codes, headers, auth, request parsing, response masking, tracing IDs, or gateway behavior. Most teams need both layers because the GraphQL executor and the HTTP adapter can fail in different ways.

\`\`\`ts
import { describe, expect, test } from "vitest";

const endpoint = "http://127.0.0.1:4000/graphql";

describe("GraphQL HTTP error contract", () => {
  test("returns partial dashboard data with a GraphQL errors array", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "query Dashboard { viewer { id name billing { plan nextInvoiceCents } projects { id name riskScore } } }"
      })
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.viewer.name).toBe("Rina");
    expect(body.data.viewer.billing).toBeNull();
    expect(body.errors[0].path).toEqual(["viewer", "billing"]);
    expect(body.errors[0].message).not.toContain("stack");
  });
});
\`\`\`

Notice that this test does not assert the entire error object unless the whole object is part of your public contract. Many frameworks add \`locations\` or \`extensions\). Gateways may add a code. The test should be strict about client behavior and tolerant about internal metadata that your team has not promised.

## Assert Partial Data With Positive And Negative Checks

A weak partial-data test says \`expect(errors).toBeDefined()\`. That proves almost nothing. A useful partial-data test has positive checks for surviving fields and negative checks for the damaged field.

Use this response as a target:

\`\`\`json
{
  "data": {
    "viewer": {
      "id": "user-1",
      "name": "Rina",
      "billing": null,
      "projects": [
        { "id": "project-1", "name": "Checkout", "riskScore": 7 },
        { "id": "project-2", "name": "Search", "riskScore": 3 }
      ]
    }
  },
  "errors": [
    {
      "message": "Billing service unavailable",
      "path": ["viewer", "billing"]
    }
  ]
}
\`\`\`

Then assert it in layers:

| Assertion layer | Example | Reason |
|---|---|---|
| Operation shape | \`data.viewer\` exists | Proves the operation was not treated as a total failure |
| Failed field | \`data.viewer.billing === null\` | Proves the nullable boundary is honored |
| Sibling survival | \`data.viewer.projects.length === 2\` | Proves unrelated resolvers are not discarded |
| Error precision | \`errors[0].path\` equals the exact path | Proves the client can place the error correctly |
| Message policy | Message is allowed text, not raw internals | Proves the formatter protects implementation details |

Here is a small helper that keeps those expectations readable without hiding the important parts:

\`\`\`ts
import { expect } from "vitest";

type GraphQLErrorLike = {
  message: string;
  path?: Array<string | number>;
};

type GraphQLResponseLike = {
  data?: unknown;
  errors?: GraphQLErrorLike[];
};

export function expectGraphQLErrorPath(
  response: GraphQLResponseLike,
  expectedPath: Array<string | number>
) {
  expect(response.errors, "GraphQL errors should be present").toBeDefined();
  expect(response.errors?.some((error) => {
    return JSON.stringify(error.path) === JSON.stringify(expectedPath);
  })).toBe(true);
}
\`\`\`

That helper is intentionally boring. It does not parse messages. It does not assume error ordering. It only proves that at least one error points to the field the UI needs to mark. This matters when a query can produce multiple resolver errors.

What people get wrong in practice: they test a single error and then ship a query where three list items can fail independently. Error order is not a stable business concept. Path membership is. When a test expects \`errors[0]\` for every case, it becomes noisy as soon as execution order, batching, or a gateway changes. Prefer matching by path and by public \`extensions.code\` when your API defines one.

## Test Null Propagation Where The Schema Makes It Painful

Null propagation is where GraphQL error handling turns from "an error array exists" into real client risk. A nullable field can fail locally. A non-null field cannot be null, so GraphQL replaces the nearest nullable parent with null. If there is no nullable parent before the root, the whole \`data\` value can become null.

That is not a bug. It is the contract your schema wrote.

Use a matrix when testing schema changes:

| Schema shape | Resolver failure at child | Expected result | Risk level |
|---|---|---|---|
| \`billing: BillingSummary\` | Billing resolver throws | \`billing: null\` | Local panel failure |
| \`billing: BillingSummary!\` inside nullable viewer | Billing resolver throws | \`viewer: null\` | Whole page section lost |
| \`projects: [Project]\` | One item resolver fails | That item can be null | Row-level gap |
| \`projects: [Project!]!\` | One project object cannot satisfy non-null field | Null may bubble through the list | Full list loss |

The following test shows a non-null field failure inside a list item. The exact output depends on the schema boundary. The important part is that the test names the boundary.

\`\`\`ts
import { describe, expect, test } from "vitest";
import { buildSchema, graphql } from "graphql";

const schema = buildSchema(\`
  type Query {
    projects: [Project!]!
  }

  type Project {
    id: ID!
    name: String!
  }
\`);

const query = "query Projects { projects { id name } }";

describe("GraphQL null propagation through lists", () => {
  test("nulls the root field when a non-null list item field fails", async () => {
    const result = await graphql({
      schema,
      source: query,
      rootValue: {
        projects: [
          {
            id: "project-1",
            name: () => {
              throw new Error("Name service failed");
            }
          }
        ]
      }
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.path).toEqual(["projects", 0, "name"]);
  });
});
\`\`\`

This test surprises teams because the path points to \`projects[0].name\`, while the data loss is larger than that field. That gap is the point. The path tells where the failure happened. Null propagation tells how much data the schema permits the response to keep.

For app teams, the schema review question is not "should fields be nullable or non-null by default?" It is "what area of the UI should disappear when this dependency fails?" Non-null is a promise that the server can keep the value present. If the value is backed by a network call, a vendor integration, or a permission check, the promise has a cost.

## Verify Error Codes Without Turning Messages Into Golden Files

Messages are for people. Codes are for programs. If your GraphQL server uses \`extensions.code\`, test it as a stable contract. If it does not, consider adding a small set of documented codes before your clients start scraping English messages.

Here is a response with a public code:

\`\`\`json
{
  "data": {
    "viewer": {
      "id": "user-1",
      "billing": null
    }
  },
  "errors": [
    {
      "message": "Billing is temporarily unavailable.",
      "path": ["viewer", "billing"],
      "extensions": {
        "code": "BILLING_UNAVAILABLE",
        "requestId": "req_123"
      }
    }
  ]
}
\`\`\`

A good assertion checks the code and the path. It treats the message as policy text, not an implementation dump.

\`\`\`ts
import { expect, test } from "vitest";

test("billing errors expose a public code", () => {
  const body = {
    data: {
      viewer: {
        id: "user-1",
        billing: null
      }
    },
    errors: [
      {
        message: "Billing is temporarily unavailable.",
        path: ["viewer", "billing"],
        extensions: {
          code: "BILLING_UNAVAILABLE",
          requestId: "req_123"
        }
      }
    ]
  };

  const error = body.errors.find((item) => {
    return JSON.stringify(item.path) === JSON.stringify(["viewer", "billing"]);
  });

  expect(error?.extensions.code).toBe("BILLING_UNAVAILABLE");
  expect(error?.message).toBe("Billing is temporarily unavailable.");
  expect(error?.message).not.toContain("ECONNREFUSED");
});
\`\`\`

Do not overfit the message unless your product requires exact copy. For most API tests, assert that the message is non-empty, safe, and maybe equal to a known user-facing sentence for high-value flows. Exact matching every low-level message creates brittle test churn without improving behavior.

## Add Transport Tests For Status, Headers, And Masking

GraphQL execution tests answer "what does the operation produce?" HTTP tests answer "what does the client receive over the wire?" You need HTTP tests for bad JSON, missing auth, unsupported methods, variables parsing, content type handling, persisted query failures, and gateway-level masking.

Common cases:

| Scenario | Typical HTTP status | Body expectation | Test focus |
|---|---:|---|---|
| Valid query with resolver error | 200 | \`data\` plus \`errors\` | Partial result contract |
| Syntax or validation error | Often 400 or 200 depending on server policy | \`errors\`, usually no useful \`data\` | Client request defect |
| Missing authentication | 401 or 200 with GraphQL error depending on boundary | Public auth error code | Product auth contract |
| Server cannot parse JSON | 400 | Non-GraphQL or GraphQL-formatted error | HTTP adapter behavior |

The status code policy varies by stack. Do not invent one during QA. Read your server policy, write it down, then test it. If your company has multiple GraphQL services, align them or document the difference. Client teams pay for inconsistency.

Here is a transport smoke test that checks malformed JSON without pretending the response shape is universal:

\`\`\`ts
import { describe, expect, test } from "vitest";

describe("GraphQL HTTP transport errors", () => {
  test("rejects malformed JSON requests", async () => {
    const response = await fetch("http://127.0.0.1:4000/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });

    const text = await response.text();

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain("SyntaxError:");
    expect(text).not.toContain("node_modules");
  });
});
\`\`\`

This test is intentionally modest. It does not assert a GraphQL \`errors\` array because malformed JSON may be rejected before the GraphQL operation exists. That distinction prevents a common false failure where the test demands GraphQL semantics from a plain HTTP parser.

For security-heavy GraphQL APIs, pair error tests with introspection and schema exposure checks. The risks overlap: verbose error responses often reveal types, resolver names, data source names, or hints that make schema probing easier. The related guide on [security testing GraphQL introspection exposure](/blog/security-testing-graphql-introspection-exposure) goes deeper on that surface.

## Create Failure Fixtures That Are Boring To Maintain

The best fixture is the one future maintainers understand in ten seconds. Avoid magical test servers where the failure mode is hidden in a long setup file. Name the dependency and the failure plainly.

Good fixture names:

| Fixture name | Meaning | Better than |
|---|---|---|
| \`billingTimeoutFixture\` | Billing resolver throws a timeout-shaped error | \`errorFixture1\` |
| \`riskScorePartialFixture\` | One project risk score is unavailable | \`projectMock\` |
| \`viewerPermissionDeniedFixture\` | Root viewer access is denied | \`authBad\` |
| \`unsafeSqlErrorFixture\` | Formatter must mask database details | \`serverError\` |

When using an AI coding agent, give it the matrix and fixture naming rule before asking it to generate tests. Agents are good at producing many cases, but they will often create broad mocks unless the contract is explicit. A good instruction is:

\`\`\`txt
Generate Vitest tests for the Dashboard GraphQL operation.
Use one fixture per dependency failure.
Each test must assert data survival, the exact GraphQL error path, and message masking.
Do not assert error array order when multiple errors are expected.
\`\`\`

Ready-made QA skills install from qaskills.sh with the qaskills CLI, but for a GraphQL service I still prefer keeping the operation-specific matrices in the repo. The skill can provide the checklist. The repo must own the contract.

## A Failure Story: The Blank Dashboard That Looked Like A Frontend Bug

The symptom was a blank dashboard after a billing provider incident. The wrong theory was that the React error boundary swallowed a rejected promise. Frontend logs showed a GraphQL response with an \`errors\` array, and the team assumed the component failed because it did not handle \`billing: null\`.

The actual cause was a schema change from \`billing: BillingSummary\` to \`billing: BillingSummary!\`. The resolver still depended on an external billing call. When that call threw, GraphQL could not put null in \`billing\`, so it nulled the nearest nullable parent. In that schema, the parent was the dashboard viewer object used by the whole page. The UI did not receive "viewer with missing billing." It received "no viewer data."

The fix had two parts. First, the team changed \`billing\` back to nullable because the product could render the rest of the dashboard without billing. Second, QA added a contract test that killed the billing fixture and asserted that \`viewer.name\` and \`viewer.projects\` remained present. The test failed before the schema fix and passed after it.

The diagnosis mattered. If the team had only patched the frontend, the next external dependency failure would have blanked a different page. Nullability was the root cause, not component state.

## Map Client UI States To GraphQL Paths

GraphQL paths are not just server metadata. They are routing information for UI error states. A dashboard can show a billing card warning, a single row badge, or a full-page permission state depending on the path.

Create a small path map for important operations:

| Error path pattern | UI target | Retry action |
|---|---|---|
| \`["viewer", "billing"]\` | Billing summary card | Refresh billing section or whole query |
| \`["viewer", "projects", number, "riskScore"]\` | Project risk badge | Refresh project risk data |
| \`["viewer"]\` | Page shell | Re-authenticate or show access denied |
| Validation error with no path | Developer or client request error | Fix query, persisted document, or variables |

Then test the client mapping with plain data. You do not need a browser for every case.

\`\`\`ts
import { expect, test } from "vitest";

type UiErrorTarget = "billing-card" | "project-risk" | "page" | "request";

function targetForPath(path: Array<string | number> | undefined): UiErrorTarget {
  if (!path) return "request";
  if (JSON.stringify(path) === JSON.stringify(["viewer", "billing"])) {
    return "billing-card";
  }
  if (
    path[0] === "viewer" &&
    path[1] === "projects" &&
    typeof path[2] === "number" &&
    path[3] === "riskScore"
  ) {
    return "project-risk";
  }
  if (JSON.stringify(path) === JSON.stringify(["viewer"])) {
    return "page";
  }
  return "request";
}

test("maps GraphQL error paths to dashboard UI targets", () => {
  expect(targetForPath(["viewer", "billing"])).toBe("billing-card");
  expect(targetForPath(["viewer", "projects", 1, "riskScore"])).toBe("project-risk");
  expect(targetForPath(["viewer"])).toBe("page");
  expect(targetForPath(undefined)).toBe("request");
});
\`\`\`

This is where QA engineers can prevent vague product bugs. "The dashboard showed an error" is not enough. Which card, which row, which retry, and which fallback data? Error paths give you the coordinates.

## Test Multi-Error Responses Without Depending On Order

A single GraphQL operation can produce more than one field error. If two project risk scores fail, the response should include two paths. Execution order can vary with batching, async scheduling, or gateway composition. Tests that assume array order will flicker.

Use set comparison:

\`\`\`ts
import { expect, test } from "vitest";

function pathKey(path: Array<string | number> | undefined) {
  return JSON.stringify(path ?? []);
}

test("matches multiple GraphQL errors by path", () => {
  const errors = [
    { message: "Risk unavailable", path: ["viewer", "projects", 1, "riskScore"] },
    { message: "Risk unavailable", path: ["viewer", "projects", 0, "riskScore"] }
  ];

  const actual = new Set(errors.map((error) => pathKey(error.path)));
  const expected = new Set([
    pathKey(["viewer", "projects", 0, "riskScore"]),
    pathKey(["viewer", "projects", 1, "riskScore"])
  ]);

  expect(actual).toEqual(expected);
});
\`\`\`

For list-heavy queries, this is the difference between a contract test and a scheduling test. You care that every failed item is identified. You do not care which failure reached the array first unless your server explicitly documents that order.

## Include Problem Details When GraphQL Meets REST

Many systems wrap REST services behind GraphQL. The upstream service might speak RFC 7807 problem details while the GraphQL API speaks \`errors\`. Your test should prove the translation preserves useful codes and hides upstream noise. The companion article on [RFC 7807 problem details API error testing](/blog/rfc-7807-problem-details-api-error-testing) covers the REST side.

A practical mapping looks like this:

| Upstream problem detail | GraphQL extension | Keep? |
|---|---|---|
| \`type\` | \`extensions.problemType\` or mapped public code | Keep if public and stable |
| \`title\` | \`message\` after product copy review | Maybe |
| \`detail\` | Usually masked | Rarely |
| \`instance\` | \`extensions.requestId\` or trace reference | Keep if it helps support |

Do not dump an upstream problem body into \`extensions\` by default. It may include URLs, vendor IDs, or details that were safe inside a private service boundary but unsafe for browsers.

## A Compact Checklist For Pull Requests

Use this checklist when reviewing GraphQL error-handling changes:

| Check | Pass condition |
|---|---|
| Nullable dependency failure | Only the intended field or parent becomes null |
| Non-null propagation | Tests document the blast radius |
| Error path | Path includes field names and list indexes where applicable |
| Multiple errors | Test matches by path, not array order |
| Transport boundary | HTTP status policy is tested separately from execution errors |
| Message safety | No stack traces, SQL fragments, hostnames, or module paths leak |
| Client mapping | UI target or retry behavior is tied to path and code |

The highest-value test usually kills one real dependency and asserts the exact partial response. Start there. Add broader matrices for operations that drive checkout, auth, admin actions, or data loss workflows.

## Frequently Asked Questions

### Should GraphQL resolver errors return HTTP 200?

Often, yes, when the HTTP request was valid and GraphQL execution produced a response with partial data and an \`errors\` array. That does not mean every GraphQL failure must be 200. Malformed JSON, unsupported methods, failed authentication at the HTTP boundary, and invalid request envelopes may use 4xx status codes depending on your server policy. Test your documented policy instead of copying another stack. The key is consistency, because clients and monitoring rules need to classify transport failures separately from field execution failures.

### What should I assert first in graphql error handling testing?

Start with the user-visible contract: surviving data, the field that became null, and the exact \`errors[].path\`. Those three assertions catch more production bugs than checking the message text first. After that, assert any public \`extensions.code\`, masking policy, and transport status. For operations with multiple possible resolver failures, build a small matrix from schema nullability and dependency ownership. That keeps the tests focused on behavior instead of framework implementation details.

### Should clients parse GraphQL error messages?

Clients should avoid parsing English messages for control flow. Messages change during copy edits, localization, or incident response. Use \`errors[].path\` to place the error and a documented \`extensions.code\` for program decisions. Exact message assertions still make sense for a few high-value user-facing flows where the copy is part of the product contract, but most tests should only check that the message is safe, non-empty, and not leaking internals.

### How do I test GraphQL partial data with AI coding agents?

Give the agent a table with failure trigger, expected data, expected path, and expected UI reaction. Ask it to generate one test per row, matching errors by path rather than array position. Review the generated fixtures carefully because agents often mock below the GraphQL executor and miss null propagation. Keep at least one test that runs real GraphQL execution or an HTTP request, so the response shape is proven at the boundary your client actually consumes.
`,
};
