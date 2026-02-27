import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GraphQL Testing — Queries, Mutations, Subscriptions, and Schema Validation',
  description:
    'Complete guide to GraphQL testing. Covers query and mutation testing, schema validation, subscription testing, mocking, performance testing, and CI/CD integration.',
  date: '2026-02-23',
  category: 'Tutorial',
  content: `
GraphQL testing requires a fundamentally different approach than REST API testing. With a single endpoint, a flexible type system, and client-controlled queries, the surface area for bugs shifts from endpoint behavior to resolver logic, schema integrity, and query complexity. Whether you are validating that a nested query returns the correct shape, ensuring a mutation enforces authorization rules, or catching breaking schema changes before they reach production, GraphQL test automation demands purpose-built strategies. This guide walks you through every dimension of GraphQL API testing -- from writing your first query test to load-testing complex operations with k6 -- with practical code examples you can adapt for your own projects.

## Key Takeaways

- GraphQL testing targets a single endpoint, so you test **operations** (queries, mutations, subscriptions) rather than URL paths
- Query testing must validate response shape, null handling, nested resolver behavior, pagination cursors, and error responses -- not just status codes
- GraphQL mutation testing should cover input validation, authorization enforcement, side effects, and optimistic response shapes
- GraphQL schema validation with tools like graphql-inspector and graphql-schema-linter catches breaking changes in CI before they ship
- Subscription testing requires WebSocket-based tooling and strategies for verifying real-time event delivery
- Performance testing must account for query complexity, depth limits, N+1 resolver patterns, and batching attacks unique to GraphQL

---

## Why GraphQL Testing Is Different

If you have experience testing REST APIs, your instincts will serve you well -- but GraphQL introduces several testing challenges that REST does not have.

**Single endpoint, infinite operations.** A REST API might have 50 endpoints, each testable in isolation. A GraphQL API has one endpoint (\`POST /graphql\`) that accepts any valid query the schema allows. You cannot enumerate every possible query, so your testing strategy must focus on the operations your clients actually use plus edge cases around the type system.

**Client-controlled response shape.** In REST, the server determines what fields are returned. In GraphQL, the client specifies exactly which fields it wants. This means the same resolver can return different shapes depending on the query, and your tests must account for partial selections, aliased fields, and fragment spreads.

**Nested resolvers and the N+1 problem.** A single GraphQL query can traverse multiple levels of your data graph. A \`users\` query that includes \`posts\` and each post's \`comments\` might trigger dozens of database calls if your resolvers are not optimized with DataLoader or similar batching. **Testing for N+1 queries** is a GraphQL-specific concern that has no direct REST equivalent.

**Schema as a contract.** The GraphQL schema is a strongly typed contract between client and server. Unlike REST, where OpenAPI specs are often out of sync with the actual API, the GraphQL schema is the API. This creates an opportunity for powerful schema validation testing, but also means that any schema change can break clients in subtle ways.

**Error handling is different.** REST uses HTTP status codes to signal errors. GraphQL always returns \`200 OK\` (even for errors) and places error details in an \`errors\` array in the response body. Your assertions must check the \`errors\` field, not the status code, and you need to test both full errors and **partial errors** where some fields resolve successfully while others fail.

These differences mean you cannot simply point a REST testing framework at a GraphQL endpoint and expect meaningful coverage. You need a testing strategy built around operations, resolvers, schema integrity, and query complexity.

---

## Testing GraphQL Queries

Query testing is the foundation of any GraphQL test automation strategy. You are verifying that a given query returns the correct data in the correct shape, handles null values gracefully, paginates correctly, and returns useful error messages when things go wrong.

### Setting Up a Query Test Suite

Here is a complete test suite for a \`users\` query using a testing framework like Jest with supertest. This pattern works with any Node.js GraphQL server (Apollo Server, Mercurius, Yoga):

\`\`\`typescript
import request from 'supertest';
import { app } from '../src/app';

describe('Users Query', () => {
  const USERS_QUERY = \\\`
    query GetUsers(\$first: Int, \$after: String) {
      users(first: \$first, after: \$after) {
        edges {
          node {
            id
            name
            email
            role
            createdAt
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  \\\`;

  it('returns a paginated list of users', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: USERS_QUERY,
        variables: { first: 10 },
      })
      .expect(200);

    const { data, errors } = response.body;
    expect(errors).toBeUndefined();
    expect(data.users.edges).toBeInstanceOf(Array);
    expect(data.users.edges.length).toBeLessThanOrEqual(10);
    expect(data.users.pageInfo).toHaveProperty('hasNextPage');
    expect(data.users.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('validates response shape for each user node', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: USERS_QUERY,
        variables: { first: 5 },
      });

    const { edges } = response.body.data.users;
    for (const edge of edges) {
      expect(edge.node).toHaveProperty('id');
      expect(edge.node).toHaveProperty('name');
      expect(edge.node).toHaveProperty('email');
      expect(typeof edge.node.id).toBe('string');
      expect(typeof edge.cursor).toBe('string');
    }
  });

  it('handles cursor-based pagination correctly', async () => {
    const firstPage = await request(app)
      .post('/graphql')
      .send({
        query: USERS_QUERY,
        variables: { first: 2 },
      });

    const { endCursor, hasNextPage } = firstPage.body.data.users.pageInfo;

    if (hasNextPage) {
      const secondPage = await request(app)
        .post('/graphql')
        .send({
          query: USERS_QUERY,
          variables: { first: 2, after: endCursor },
        });

      const firstIds = firstPage.body.data.users.edges.map(
        (e: any) => e.node.id
      );
      const secondIds = secondPage.body.data.users.edges.map(
        (e: any) => e.node.id
      );

      // No overlap between pages
      expect(firstIds.filter((id: string) => secondIds.includes(id))).toHaveLength(0);
    }
  });

  it('returns error for invalid pagination arguments', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: USERS_QUERY,
        variables: { first: -1 },
      });

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toContain('must be positive');
  });

  it('handles null fields gracefully', async () => {
    const NULLABLE_QUERY = \\\`
      query {
        user(id: "user-without-bio") {
          id
          name
          bio
        }
      }
    \\\`;

    const response = await request(app)
      .post('/graphql')
      .send({ query: NULLABLE_QUERY });

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.user.bio).toBeNull();
  });
});
\`\`\`

### What to Assert in Every Query Test

For each query operation you test, verify these dimensions:

- **Response shape matches the selection set** -- every requested field is present, no extra fields leak through
- **Null handling** -- nullable fields return \`null\` without errors when data is absent
- **Pagination** -- cursor integrity, no duplicate items across pages, correct \`hasNextPage\` value on the last page
- **Error responses** -- the \`errors\` array contains meaningful messages with proper \`extensions.code\` values
- **Authorization** -- queries that require authentication return \`UNAUTHENTICATED\` errors without auth tokens
- **Nested resolvers** -- child fields resolve correctly and do not return stale or incorrect data from parent context

---

## Testing Mutations

GraphQL mutation testing goes beyond verifying return values. You need to confirm that mutations validate inputs, enforce authorization, produce the correct side effects, and return usable response shapes for optimistic UI updates.

### CRUD Mutation Test Examples

\`\`\`typescript
describe('Post Mutations', () => {
  let authToken: string;
  let createdPostId: string;

  beforeAll(async () => {
    authToken = await getTestAuthToken('author@example.com');
  });

  it('creates a post with valid input', async () => {
    const CREATE_POST = \\\`
      mutation CreatePost(\$input: CreatePostInput!) {
        createPost(input: \$input) {
          id
          title
          content
          status
          author { id name }
        }
      }
    \\\`;

    const response = await request(app)
      .post('/graphql')
      .set('Authorization', \\\`Bearer \${authToken}\\\`)
      .send({
        query: CREATE_POST,
        variables: {
          input: {
            title: 'GraphQL Testing Guide',
            content: 'A comprehensive guide to testing GraphQL APIs.',
            status: 'DRAFT',
          },
        },
      });

    expect(response.body.errors).toBeUndefined();
    const post = response.body.data.createPost;
    expect(post.title).toBe('GraphQL Testing Guide');
    expect(post.status).toBe('DRAFT');
    expect(post.author).toBeDefined();
    createdPostId = post.id;
  });

  it('rejects creation with invalid input', async () => {
    const CREATE_POST = \\\`
      mutation CreatePost(\$input: CreatePostInput!) {
        createPost(input: \$input) { id }
      }
    \\\`;

    const response = await request(app)
      .post('/graphql')
      .set('Authorization', \\\`Bearer \${authToken}\\\`)
      .send({
        query: CREATE_POST,
        variables: {
          input: {
            title: '', // Empty title should fail validation
            content: 'Some content',
          },
        },
      });

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
  });

  it('prevents unauthorized mutation', async () => {
    const DELETE_POST = \\\`
      mutation DeletePost(\$id: ID!) {
        deletePost(id: \$id) { id }
      }
    \\\`;

    // No auth token
    const response = await request(app)
      .post('/graphql')
      .send({
        query: DELETE_POST,
        variables: { id: createdPostId },
      });

    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('verifies update mutation side effects', async () => {
    const UPDATE_POST = \\\`
      mutation UpdatePost(\$id: ID!, \$input: UpdatePostInput!) {
        updatePost(id: \$id, input: \$input) {
          id
          title
          updatedAt
        }
      }
    \\\`;

    const response = await request(app)
      .post('/graphql')
      .set('Authorization', \\\`Bearer \${authToken}\\\`)
      .send({
        query: UPDATE_POST,
        variables: {
          id: createdPostId,
          input: { title: 'Updated Title' },
        },
      });

    expect(response.body.data.updatePost.title).toBe('Updated Title');

    // Verify side effect: updatedAt timestamp changed
    const updatedAt = new Date(response.body.data.updatePost.updatedAt);
    expect(updatedAt.getTime()).toBeGreaterThan(Date.now() - 5000);
  });
});
\`\`\`

### Mutation Testing Checklist

When designing your GraphQL mutation testing suite, cover these scenarios for every mutation:

- **Happy path** -- valid input produces the expected result and side effects
- **Input validation** -- missing required fields, empty strings, values out of range, invalid enum values
- **Authorization** -- unauthenticated requests, insufficient permissions, cross-tenant access attempts
- **Idempotency** -- repeated identical mutations either produce the same result or return appropriate conflict errors
- **Optimistic response shape** -- the mutation response includes all fields a client needs for optimistic UI updates without a follow-up query
- **Concurrent mutations** -- two simultaneous updates to the same resource resolve correctly (last-write-wins or conflict detection)

---

## Schema Validation and Breaking Changes

Your GraphQL schema is a contract with every client that consumes your API. **GraphQL schema validation** in CI is one of the highest-value testing investments you can make because it catches breaking changes before they are merged -- not after a client app crashes in production.

### Schema Linting with graphql-schema-linter

graphql-schema-linter enforces consistent conventions across your schema definition:

\`\`\`bash
npm install --save-dev graphql-schema-linter
\`\`\`

Create a \`.graphql-schema-linterrc\` configuration file:

\`\`\`json
{
  "rules": [
    "defined-types-are-used",
    "deprecations-have-a-reason",
    "descriptions-are-capitalized",
    "enum-values-all-caps",
    "fields-are-camel-cased",
    "input-object-fields-sorted-alphabetically",
    "relay-connection-types-spec",
    "types-are-capitalized"
  ],
  "schemaPaths": ["src/schema/**/*.graphql"]
}
\`\`\`

Run the linter in your CI pipeline:

\`\`\`bash
npx graphql-schema-linter src/schema/**/*.graphql
\`\`\`

### Breaking Change Detection with graphql-inspector

graphql-inspector compares two versions of your schema and reports breaking changes, dangerous changes, and safe changes:

\`\`\`bash
npm install --save-dev @graphql-inspector/cli
\`\`\`

Compare the current branch schema against the main branch:

\`\`\`bash
# Compare schemas from files
npx graphql-inspector diff schema-main.graphql schema-branch.graphql

# Compare against a live endpoint
npx graphql-inspector diff https://api.example.com/graphql schema-local.graphql
\`\`\`

Sample output:

\`\`\`
Detected 3 changes:

  BREAKING: Field 'User.email' was removed
  DANGEROUS: Optional argument 'limit' on field 'Query.users' changed default value from '20' to '50'
  SAFE: Field 'User.avatarUrl' was added
\`\`\`

### CI Integration Example

Add schema validation to your GitHub Actions workflow so that every pull request is checked for accidental breaking changes:

\`\`\`yaml
name: GraphQL Schema Validation
on: [pull_request]

jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Lint schema
        run: npx graphql-schema-linter src/schema/**/*.graphql

      - name: Check for breaking changes
        run: |
          git show origin/main:src/schema/schema.graphql > /tmp/schema-main.graphql
          npx graphql-inspector diff /tmp/schema-main.graphql src/schema/schema.graphql --fail-on-breaking
\`\`\`

The \`--fail-on-breaking\` flag causes the CI job to fail if any breaking changes are detected, blocking the merge until the team explicitly reviews and approves the change.

---

## Subscription Testing

GraphQL subscriptions deliver real-time updates over WebSocket connections. Testing them requires a different approach than queries and mutations because you need to establish a persistent connection, trigger an event, and verify the subscription payload arrives correctly.

### Testing Subscriptions with graphql-ws

The \`graphql-ws\` library is the modern standard for GraphQL subscriptions. Here is how to test a subscription end-to-end:

\`\`\`typescript
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import request from 'supertest';
import { app, httpServer } from '../src/app';

describe('Comment Subscription', () => {
  let wsClient: ReturnType<typeof createClient>;
  let serverUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const port = (httpServer.address() as any).port;
        serverUrl = \\\`ws://localhost:\${port}/graphql\\\`;
        resolve();
      });
    });
  });

  beforeEach(() => {
    wsClient = createClient({
      url: serverUrl,
      webSocketImpl: WebSocket,
    });
  });

  afterEach(() => {
    wsClient.dispose();
  });

  afterAll(() => {
    httpServer.close();
  });

  it('receives new comments in real time', async () => {
    const COMMENT_SUBSCRIPTION = \\\`
      subscription OnNewComment(\$postId: ID!) {
        commentAdded(postId: \$postId) {
          id
          text
          author { name }
          createdAt
        }
      }
    \\\`;

    const receivedComments: any[] = [];

    // Start the subscription
    const subscriptionPromise = new Promise<void>((resolve, reject) => {
      const unsubscribe = wsClient.subscribe(
        {
          query: COMMENT_SUBSCRIPTION,
          variables: { postId: 'post-1' },
        },
        {
          next: (result) => {
            receivedComments.push(result.data.commentAdded);
            if (receivedComments.length === 1) {
              unsubscribe();
              resolve();
            }
          },
          error: reject,
          complete: () => {},
        }
      );
    });

    // Give the subscription time to establish
    await new Promise((r) => setTimeout(r, 100));

    // Trigger the event via a mutation
    await request(app)
      .post('/graphql')
      .set('Authorization', 'Bearer test-token')
      .send({
        query: \\\`
          mutation {
            addComment(postId: "post-1", text: "Great article!") {
              id
            }
          }
        \\\`,
      });

    // Wait for the subscription to receive the event
    await subscriptionPromise;

    expect(receivedComments).toHaveLength(1);
    expect(receivedComments[0].text).toBe('Great article!');
    expect(receivedComments[0].author).toBeDefined();
  });
});
\`\`\`

### Subscription Testing Challenges

Subscription testing introduces timing complexities that do not exist in request/response testing:

- **Connection lifecycle** -- you must handle connect, disconnect, reconnect, and connection errors
- **Race conditions** -- the subscription must be fully established before the triggering event occurs, or you miss the payload
- **Timeout handling** -- tests need explicit timeouts to avoid hanging indefinitely when a subscription never fires
- **Filtering** -- verify that subscriptions with filter arguments only receive relevant events and ignore unrelated ones
- **Authentication** -- WebSocket connections typically authenticate via \`connectionParams\`, which requires separate auth testing from HTTP header-based auth

A robust subscription test suite should include tests for all five of these scenarios, not just the happy path of receiving an event.

---

## Mocking GraphQL APIs

When testing frontend applications or services that consume a GraphQL API, you often need to mock the API rather than run a real server. **Mocking GraphQL** enables fast, isolated tests that do not depend on backend availability.

### MSW (Mock Service Worker) for GraphQL

MSW intercepts network requests at the service worker level, making it ideal for both browser and Node.js environments:

\`\`\`typescript
import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  graphql.query('GetUsers', () => {
    return HttpResponse.json({
      data: {
        users: {
          edges: [
            {
              node: {
                id: '1',
                name: 'Alice',
                email: 'alice@example.com',
                role: 'ADMIN',
              },
              cursor: 'cursor-1',
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: 'cursor-1' },
          totalCount: 1,
        },
      },
    });
  }),

  graphql.mutation('CreatePost', ({ variables }) => {
    const { input } = variables;

    if (!input.title) {
      return HttpResponse.json({
        errors: [
          {
            message: 'Title is required',
            extensions: { code: 'BAD_USER_INPUT' },
          },
        ],
      });
    }

    return HttpResponse.json({
      data: {
        createPost: {
          id: 'new-post-id',
          title: input.title,
          status: input.status || 'DRAFT',
        },
      },
    });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

### Faker-Based Mock Resolvers with graphql-tools

For more dynamic mocking that respects your schema types, use \`@graphql-tools/mock\` with faker:

\`\`\`typescript
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from '@graphql-tools/mock';
import { faker } from '@faker-js/faker';
import { graphql } from 'graphql';

const typeDefs = \\\`
  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
  }
  enum Role { ADMIN EDITOR VIEWER }
  type Query {
    user(id: ID!): User
    users(first: Int): [User!]!
  }
\\\`;

const schema = makeExecutableSchema({ typeDefs });

const mockedSchema = addMocksToSchema({
  schema,
  mocks: {
    User: () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: faker.helpers.arrayElement(['ADMIN', 'EDITOR', 'VIEWER']),
    }),
  },
});

// Use in tests
const result = await graphql({
  schema: mockedSchema,
  source: '{ users(first: 5) { id name email role } }',
});

expect(result.data.users).toHaveLength(2); // default list length
expect(result.data.users[0].email).toContain('@');
\`\`\`

The advantage of schema-aware mocking is that your mocks stay in sync with your schema. If a field is renamed or a type changes, the mock automatically reflects that -- or fails, alerting you to the discrepancy.

---

## Performance Testing GraphQL

GraphQL introduces performance concerns that do not exist in REST APIs. A single query can request deeply nested data, trigger hundreds of resolver calls, and consume significant server resources. **Performance testing** for GraphQL must account for these unique characteristics.

### Query Complexity Analysis

Most production GraphQL servers implement query complexity analysis to prevent expensive queries. Your performance tests should verify that complexity limits are enforced:

\`\`\`typescript
it('rejects queries exceeding complexity limit', async () => {
  const COMPLEX_QUERY = \\\`
    query {
      users(first: 100) {
        edges {
          node {
            posts(first: 100) {
              comments(first: 100) {
                author {
                  posts(first: 100) {
                    title
                  }
                }
              }
            }
          }
        }
      }
    }
  \\\`;

  const response = await request(app)
    .post('/graphql')
    .send({ query: COMPLEX_QUERY });

  expect(response.body.errors).toBeDefined();
  expect(response.body.errors[0].message).toContain('complexity');
});

it('rejects queries exceeding depth limit', async () => {
  // 10 levels of nesting
  const DEEP_QUERY = \\\`
    query {
      user(id: "1") {
        friends {
          friends {
            friends {
              friends {
                friends {
                  friends {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  \\\`;

  const response = await request(app)
    .post('/graphql')
    .send({ query: DEEP_QUERY });

  expect(response.body.errors[0].message).toContain('depth');
});
\`\`\`

### Testing for N+1 Queries

The N+1 problem is the most common GraphQL performance issue. For each item in a list, a naive resolver makes a separate database query. Your tests should detect this:

\`\`\`typescript
import { getQueryCount, resetQueryCount } from '../src/db/query-counter';

it('resolves users with posts without N+1 queries', async () => {
  resetQueryCount();

  await request(app)
    .post('/graphql')
    .send({
      query: \\\`
        query {
          users(first: 50) {
            edges {
              node {
                id
                name
                posts(first: 10) { title }
              }
            }
          }
        }
      \\\`,
    });

  // With DataLoader: should be ~2 queries (users + posts batch)
  // Without DataLoader: would be 51 queries (1 + 50)
  expect(getQueryCount()).toBeLessThan(5);
});
\`\`\`

### Load Testing with k6

k6 is well-suited for GraphQL load testing because you write JavaScript scripts that can construct dynamic queries. For a thorough comparison of k6 with other load testing tools, see our [k6 vs JMeter](/blog/k6-vs-jmeter-performance-testing) deep dive.

\`\`\`javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const QUERY = \\\`
  query GetUserDashboard(\$userId: ID!) {
    user(id: \$userId) {
      name
      recentPosts(first: 10) {
        title
        commentCount
      }
      notifications(unreadOnly: true) {
        message
        createdAt
      }
    }
  }
\\\`;

export default function () {
  const payload = JSON.stringify({
    query: QUERY,
    variables: { userId: \\\`user-\${Math.floor(Math.random() * 1000)}\\\` },
  });

  const response = http.post('https://api.example.com/graphql', payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer load-test-token',
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'no GraphQL errors': (r) => {
      const body = JSON.parse(r.body);
      return !body.errors || body.errors.length === 0;
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
\`\`\`

Key GraphQL-specific metrics to track during load testing:

- **Resolver execution time** -- per-field timing to identify slow resolvers
- **Database query count per operation** -- detect N+1 regressions under load
- **Query complexity distribution** -- ensure clients are not sending excessively complex queries
- **Error rate by operation** -- some operations may degrade faster than others
- **Connection pool exhaustion** -- deeply nested queries hold connections longer

---

## GraphQL vs REST Testing

Understanding how GraphQL testing compares to REST testing helps you adapt your existing skills and tooling. Here is a side-by-side comparison of the key differences:

| Testing Aspect | GraphQL Approach | REST Approach |
|---|---|---|
| **Endpoint count** | Single \`/graphql\` endpoint; test by operation name | Multiple endpoints; test each URL/method combination |
| **Response validation** | Validate against selection set; shape varies per query | Validate against fixed JSON schema per endpoint |
| **Error handling** | Check \`errors\` array in 200 response body | Check HTTP status codes (400, 401, 404, 500) |
| **Versioning** | Schema evolution with \`@deprecated\` directives | URL versioning (\`/v1\`, \`/v2\`) or header-based |
| **Documentation testing** | Schema introspection is always accurate | OpenAPI spec may drift from implementation |
| **Mocking** | Schema-aware mocks auto-generate valid responses | Endpoint-specific mock definitions required |
| **Contract testing** | Schema diffing with graphql-inspector | Pact consumer-driven contracts or OpenAPI validation |
| **Performance testing** | Must test query complexity, depth, and N+1 patterns | Test per-endpoint throughput and latency |
| **Auth testing** | Resolver-level and field-level authorization | Endpoint-level and middleware-based authorization |
| **Over/under-fetching** | Client controls fields; test that resolvers handle partial selection | Server controls response; not applicable |

For a comprehensive breakdown of REST API testing strategies, see our [API testing complete guide](/blog/api-testing-complete-guide). Many of the foundational principles -- like testing authentication, input validation, and error handling -- apply equally to both paradigms. The difference is **where** you apply them.

In GraphQL, authorization is often enforced at the **resolver level** rather than the endpoint level. This means your test matrix is larger: you need to test every field and resolver combination against every role, not just every endpoint. Tools like GraphQL Shield or custom directive-based authorization add a layer of complexity that your test suite must account for.

For teams working with both GraphQL and REST APIs (which is increasingly common in microservices architectures), [API contract testing](/blog/api-contract-testing-microservices) provides strategies for maintaining consistency across both paradigms.

---

## Automate GraphQL Testing with AI Agents

Writing comprehensive GraphQL test suites is time-intensive. AI coding agents can accelerate this process significantly when equipped with the right QA skills. Instead of manually writing boilerplate test cases for every query, mutation, and subscription, you can use specialized skills to generate production-grade tests that follow the patterns described in this guide.

Install testing skills that cover GraphQL API testing:

\`\`\`bash
npx @qaskills/cli add playwright-api
\`\`\`

\`\`\`bash
npx @qaskills/cli add api-test-suite-generator
\`\`\`

These skills teach your AI agent to generate query tests with proper response shape validation, mutation tests with input validation and authorization checks, and schema validation pipelines for CI. The agent learns the patterns once and applies them consistently across your entire GraphQL API surface.

Browse the full directory of 95+ QA testing skills at [/skills](/skills) to find skills for your specific testing needs. If you are new to the platform, our [getting started guide](/getting-started) walks you through installation and configuration in under five minutes.

For teams that use GraphQL alongside microservices, our guide on [API contract testing for microservices](/blog/api-contract-testing-microservices) covers how to integrate schema validation into your broader contract testing strategy.

---

## Frequently Asked Questions

### What is the best framework for GraphQL testing?

There is no single best framework -- the right choice depends on your server technology and testing goals. For **server-side testing** of a Node.js GraphQL API, Jest or Vitest with supertest provides the most straightforward setup. For **client-side testing** of a frontend that consumes a GraphQL API, MSW (Mock Service Worker) intercepts network requests without requiring a running server. For **end-to-end testing** that exercises the full stack, Playwright with its API request context handles both browser interactions and GraphQL calls in one test. For **schema validation**, graphql-inspector and graphql-schema-linter run independently of your test framework and integrate directly into CI.

### How do you test GraphQL subscriptions reliably?

Subscription testing requires a WebSocket client, a mechanism to trigger the subscribed event, and careful handling of timing. Use the \`graphql-ws\` library to establish a WebSocket connection, subscribe to an event, then trigger the event via a mutation or direct database manipulation. The key to reliability is ensuring the subscription is fully established before triggering the event -- add a small delay or use a connection acknowledgment callback. Always include explicit timeouts in your tests to prevent them from hanging indefinitely when a subscription fails to fire. Test both the happy path and error scenarios like connection drops and authentication failures.

### Should I test every field in my GraphQL schema?

You should test every **resolver** in your schema, but not necessarily every field. Fields that are simple property accesses on a parent object (like \`user.name\` mapping directly to a database column) generally do not need individual tests. Focus your testing effort on fields that involve **custom resolver logic** -- computed fields, fields that make external calls, fields with authorization checks, and fields that transform data. Also test every nullable field to verify it returns \`null\` gracefully rather than throwing an error. Schema linting and introspection tests can catch structural issues across all fields without testing each one individually.

### How do I prevent breaking changes in a GraphQL schema?

Use graphql-inspector in your CI pipeline to compare every pull request's schema against the main branch schema. Configure it with the \`--fail-on-breaking\` flag so that breaking changes block the merge. Supplement this with graphql-schema-linter to enforce naming conventions, require deprecation reasons, and ensure schema consistency. For coordinated changes across teams, use a **schema registry** that tracks schema versions and consumer dependencies. Mark fields as \`@deprecated(reason: "Use newField instead")\` and monitor usage metrics before removal. The combination of automated CI checks, deprecation policies, and usage monitoring makes accidental breaking changes nearly impossible.

### What is the difference between GraphQL testing and REST API testing?

The core difference is that GraphQL testing focuses on **operations and resolvers** while REST testing focuses on **endpoints and HTTP methods**. In REST, you test each URL path with each HTTP method and validate the fixed response structure. In GraphQL, you test named operations (queries, mutations, subscriptions) against a single endpoint and validate dynamic response shapes that change based on the client's field selection. GraphQL testing also introduces concerns that REST does not have: query complexity limits, depth restrictions, N+1 resolver performance, field-level authorization, and schema evolution without versioned URLs. However, many fundamentals -- input validation, error handling, authentication, and performance -- apply equally to both. Teams transitioning from REST to GraphQL should keep their existing testing mindset but adapt their assertions from status-code-based to response-body-based validation.
`,
};
