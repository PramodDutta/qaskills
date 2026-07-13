import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing GraphQL Partial Data and Errors Together',
  description:
    'Test GraphQL partial data and errors together by asserting null propagation, error paths, extensions, and client behavior without discarding useful fields.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing GraphQL Partial Data and Errors Together

The product page renders its title and price, but the recommendations panel is empty. The GraphQL response is HTTP 200, \`data.product\` is populated, and \`errors[0].path\` points into \`product.recommendations\`. A test that expects either complete success or total failure cannot describe this valid GraphQL outcome.

GraphQL execution can return a response containing both \`data\` and \`errors\`. Field errors are reported while unaffected sibling fields remain usable. Whether a null stays at the failing field or propagates upward depends on schema nullability. Senior API tests therefore assert the response as one coherent execution result: retained data, null placement, error path, error classification, and consumer behavior.

## Start with a schema that makes failure boundaries visible

Consider a commerce query where core product data should survive a recommendation outage:

\`\`\`graphql
type Query {
  product(id: ID!): Product
}

type Product {
  id: ID!
  name: String!
  price: Money!
  recommendations: [Product!]
}

type Money {
  amount: Int!
  currency: String!
}

query ProductPage($id: ID!) {
  product(id: $id) {
    id
    name
    price {
      amount
      currency
    }
    recommendations {
      id
      name
    }
  }
}
\`\`\`

\`recommendations\` is nullable, so its resolver may fail while \`product\` remains. The list permits a null list but, when present, requires every item to be non-null. This is not merely type notation. It defines how execution errors reshape \`data\`.

| Field type | Item failure consequence | Data shape to assert |
|---|---|---|
| \`[Product]\` | Failed nullable item can become null | List may contain a null element |
| \`[Product!]\` | Failed item invalidates the nullable list | Entire list becomes null |
| \`[Product]!\` | Individual nullable item may be null | List remains, possibly with null entry |
| \`[Product!]!\` | Failed item propagates beyond the non-null list | Parent nullable field may become null |

The schema is the oracle for null propagation. Do not write an expected shape based solely on what the current resolver happens to return.

## Assert data and errors in one integration test

The example below uses Apollo Server's documented \`executeOperation\` testing API. The recommendations resolver throws, while the core product fields resolve. The assertion inspects the single-result body and verifies both sides of the response.

\`\`\`typescript
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';

const typeDefs = gql\`
  type Query { product(id: ID!): Product }
  type Product {
    id: ID!
    name: String!
    recommendations: [Product!]
  }
\`;

const resolvers = {
  Query: {
    product: (_parent: unknown, { id }: { id: string }) => ({ id, name: 'Keyboard' }),
  },
  Product: {
    recommendations: () => {
      throw new Error('recommendation service unavailable');
    },
  },
};

test('retains product fields when nullable recommendations fail', async () => {
  const server = new ApolloServer({ typeDefs, resolvers });
  const response = await server.executeOperation({
    query: gql\`
      query Product($id: ID!) {
        product(id: $id) {
          id
          name
          recommendations { id name }
        }
      }
    \`,
    variables: { id: 'p-17' },
  });

  expect(response.body.kind).toBe('single');
  if (response.body.kind !== 'single') throw new Error('Expected a single GraphQL result');

  expect(response.body.singleResult.data).toEqual({
    product: {
      id: 'p-17',
      name: 'Keyboard',
      recommendations: null,
    },
  });
  expect(response.body.singleResult.errors).toHaveLength(1);
  expect(response.body.singleResult.errors?.[0]).toMatchObject({
    message: 'recommendation service unavailable',
    path: ['product', 'recommendations'],
  });
});
\`\`\`

This is an execution test, not a snapshot of Apollo's entire error object. Locations, stack traces, and extension details can vary with server configuration. Assert the pieces your API promises and your clients depend on.

## Drive failures through resolver boundaries

A useful partial-data test injects failure at a dependency boundary, not by adding \`if (test)\` logic to production resolvers. Stub the recommendation service, authorization service, or database adapter supplied through GraphQL context. Let the real resolver translate that failure into the server's normal error shape.

Test at least three modes when the dependency supports them: a thrown transport error, a domain result representing unavailable data, and a timeout or cancellation. They may produce different GraphQL semantics. A domain-level “no recommendations” should often be an empty list, not an error. An outage may be null plus an error. Mixing those outcomes trains clients to treat absence as failure.

Avoid making every resolver throw simultaneously. A response with ten unrelated errors is difficult to diagnose and rarely resembles one production incident. Choose a failure boundary and assert which siblings continue to resolve. Then add a separate case for a parent-level failure if its propagation behavior matters.

DataLoader complicates isolation usefully. If two fields share a batch and one key fails, confirm whether the loader returns an \`Error\` per key or rejects the entire batch. A rejected batch can create broader errors than intended. Your test should express the desired field-level blast radius.

## Verify null bubbling through non-null fields

Change \`recommendations\` in the sample to \`[Product!]!\`. Now a recommendation failure cannot produce null at that field. GraphQL propagates null to the nearest nullable ancestor, which is \`Query.product\` in the sample. The expected data becomes \`{ product: null }\`, while the error path still identifies the field where execution failed.

This distinction catches schema changes with large user impact. Tightening a field from nullable to non-null looks attractive to type consumers but can turn a degraded panel into a missing page. Contract review should include failure propagation, not only generated type diffs.

| Failure location | Nullable boundary | Surviving useful data |
|---|---|---|
| \`product.recommendations\` where field is nullable | Recommendations field | Product identity and core details |
| Non-null recommendation item inside nullable list | Recommendations list | Product fields, list becomes null |
| Non-null recommendations list | Nullable product field | Other top-level query fields only |
| Non-null top-level field | No nullable boundary before root | Response data can become null |

Write an explicit test for the most important nullability chain. Relying on a generic schema validator will not show whether the UI can still render its critical content.

## Treat the error path as a machine-readable locator

GraphQL errors may include \`path\`, an array of field names and list indexes locating the response position associated with the error. For a failure in the third recommendation's price, a path can look like \`['product', 'recommendations', 2, 'price']\`.

Assert path values when clients use them to attach inline errors or telemetry. Do not parse the human message to determine which component failed. Messages change through wrapping, localization, and security hardening; paths derive from execution structure.

Aliases appear in response paths. If the query requests \`related: recommendations\`, expect \`related\` in the path, not the schema field name. Add an alias test when your client relies on path mapping. List indexes are zero-based and refer to response positions.

An error produced before execution, such as query validation failure, usually has no useful partial \`data\` and may not have an execution path. Keep parse and validation tests separate from resolver partial-data cases. Their consumer handling should differ.

## Standardize extensions without leaking internals

Many servers add structured values under \`errors[].extensions\`, commonly a stable code, correlation identifier, or retryability indicator. GraphQL does not prescribe your business codes. Define a small public taxonomy and test it at the formatting boundary.

\`\`\`typescript
expect(result.errors?.[0]).toMatchObject({
  path: ['account', 'invoices'],
  extensions: {
    code: 'UPSTREAM_UNAVAILABLE',
    retryable: true,
  },
});

expect(result.errors?.[0].extensions).not.toHaveProperty('stacktrace');
expect(result.errors?.[0].extensions).not.toHaveProperty('upstreamToken');
\`\`\`

The negative assertions are important at the HTTP boundary, especially in production configuration. Integration tests run in a test environment may intentionally expose stack traces, so exercise the same error formatter and environment mode used for deployment.

Correlation IDs should be checked for presence and format, not a fixed random value. If the client sends a request ID, assert the documented propagation rule. Never expose raw database errors or upstream response bodies merely to simplify testing.

## Exercise the response over HTTP too

\`executeOperation\` is fast and bypasses HTTP details. Keep it for resolver and execution semantics, then add focused transport tests using your server's actual endpoint. Validate content type, authentication behavior, status policy, headers, and serialized JSON.

GraphQL-over-HTTP behavior has evolved, and servers can differ in status handling for request errors versus field errors. A field error with a well-formed executed operation commonly arrives with a successful HTTP status. Do not convert every non-empty \`errors\` array into an HTTP failure assertion. Instead, document your server's transport contract and test it with its supported media types.

At the HTTP layer, avoid a client helper that throws on GraphQL errors before returning \`data\`. Such a helper makes it impossible to assert partial results. Use a raw HTTP response or configure the GraphQL client to expose both. The [complete GraphQL testing guide](/blog/graphql-testing-complete-guide) covers the broader layering of schema, resolver, transport, and end-to-end checks.

## Make client tests consume degraded responses

Server correctness is only half the feature. A client may discard \`data\` whenever \`errors\` exists, show a full-page alert, or cache a null too aggressively. Build a fixture containing both fields and pass it through the real client boundary.

For a product page, assert that name and price render, recommendations show an unavailable state, retry targets only the affected operation when supported, and telemetry records the error code without the raw stack. If the client library has an error policy setting, make it explicit in configuration and test the selected behavior. Defaults can change across clients or major versions.

Cache tests deserve special attention. A partial response can merge into normalized entities and preserve stale fields from an earlier successful request. Decide whether that is desired. Test a sequence: full success, partial failure, then recovery. One isolated response cannot reveal stale-data behavior.

For incremental delivery with \`@defer\` or \`@stream\`, results may arrive as multiple payloads rather than one object. Do not force those cases through a single-response assertion. Test initial data, subsequent patches, patch paths, errors in deferred work, completion, and client merge behavior using server and client APIs that explicitly support incremental results.

## Contract tests for partial-result promises

A schema contract test can catch nullability changes, removed error codes, and renamed fields, but it must describe behavior as well as structure. Consumer expectations might state: core product fields survive recommendation unavailability; the failed field is null; the error code is retryable; no secret details escape.

Provider tests should trigger the real failure translation and satisfy that expectation. A mocked JSON snapshot alone can drift away from resolver behavior. The [GraphQL contract testing guide](/blog/graphql-contract-testing-guide) goes deeper into provider and consumer ownership.

Keep message text out of public contracts unless it is explicitly user-facing and versioned. Prefer path plus extension code. If error ordering is not promised, compare errors by path or code rather than array position. Parallel resolver execution can make incidental ordering brittle.

Security rules still apply during degradation. If one sibling field is unauthorized, verify no forbidden data leaks through another resolver or through error details. An authorization error is not a license to return a partially populated protected object. Model the nullable boundary around the authorization domain deliberately.

## A focused partial-data test matrix

Do not multiply every query by every failure. Select operations where partial rendering has product value and where nullability creates meaningful boundaries. For each, cover normal success, expected absence, dependency failure at a nullable field, failure below a non-null chain, and recovery if the client caches data.

Capture the exact query document used by the consumer because aliases and fragments affect paths and selected siblings. Seed deterministic IDs and lists so index paths are stable. Assert meaningful values in surviving fields, not just \`toBeDefined()\`. That proves execution continued correctly rather than returning an unrelated fallback.

When a test fails, report the trio that drives diagnosis: expected nullable boundary, actual \`data\` subtree, and actual error path/code. Huge snapshots hide this relationship. A compact custom assertion helper can normalize error output, but keep the GraphQL concepts visible in the test name and failure message.

## Model multi-error responses without brittle snapshots

One operation can produce more than one field error. Suppose product inventory and recommendations depend on separate unavailable services while name and price remain local. The expected response may retain the product, set both nullable fields to null, and include two errors. A whole-object snapshot makes this look easy but couples the test to error ordering, source locations, formatting details, and framework extensions.

Instead, assert the data tree exactly and normalize errors into the public contract fields. Map each error to path, stable extension code, and any explicitly promised retry flag. Sort that normalized representation by a serialized path only for comparison, not because the API promises ordering. Then assert both expected errors are present and no unexpected error leaked from an unaffected resolver.

The same root cause can also appear in several fields. If a shared account service fails, separate resolvers might emit duplicate errors. Decide whether the server intentionally reports each field failure or wraps the shared dependency at a parent boundary. Tests should follow the chosen execution model. Do not deduplicate errors in a test helper merely to make a noisy server look stable, because clients may receive every entry and display repeated messages.

List fields need special cases. If the second item fails and items are nullable, assert a null at index one and an error path containing that index. If items are non-null, assert the list or parent nulls according to the schema. Use at least three items so an off-by-one path assertion is visible. Seed different values around the failing item to prove successful siblings were not reordered.

Aliases and fragments deserve one consumer-shaped test. A fragment does not appear in the error path, while an alias does. When two aliases request the same schema field with different arguments, their failures should be attributable to their response keys. This matters for clients that place field-level banners or retry only one panel.

Cancellation adds another boundary. If the client disconnects or an operation deadline expires, some resolvers may have completed while the server chooses not to deliver a partial payload. Test cancellation through the server mechanism you actually support rather than assuming it behaves like an ordinary resolver error. Ensure abandoned work releases database connections and does not write after the request is no longer valid.

For federated graphs, record which layer owns public error translation. A subgraph may return a structured error that the router masks, rewrites, or attaches to a different path after entity resolution. Provider tests should cover the subgraph behavior, and router-level tests should assert the final consumer shape. Do not expose internal service names as stable API codes unless that is a deliberate observability contract.

This focused approach keeps partial-result tests readable: exact retained data, schema-derived nulls, path-located errors, stable classifications, and a clear absence of sensitive internals. When the schema changes, a failing assertion then explains the user-visible blast radius rather than presenting a wall of snapshot diff. Preserve the failing query and variables in sanitized test output so the response shape can be reproduced without exposing credentials or protected field values.

## Frequently Asked Questions

### Is HTTP 200 correct when the GraphQL response contains errors?

It can be correct for field errors encountered while executing a valid operation. Transport status policy depends on the failure phase, server, and GraphQL-over-HTTP behavior you support. Test field errors separately from malformed requests and validation errors.

### Why did one resolver error make the entire product null?

A non-null field failed and null propagated upward until GraphQL found a nullable ancestor. Follow the schema types from the failing field toward the root and assert that chain explicitly.

### Should a missing optional value appear in errors?

Usually not when absence is an expected domain outcome. Return null or an empty collection according to the schema. Reserve errors for conditions consumers should distinguish from normal absence, such as unavailable dependencies or forbidden access.

### Can error array order be asserted?

Only if your API explicitly guarantees it. Resolver execution may be parallel, so matching by path and stable extension code is more resilient than assuming the first error always belongs to one field.

### How should tests handle partial results with deferred fields?

Use an incremental-response-aware API and assert the initial payload plus later patches. Verify patch paths, errors, merge behavior, and completion instead of flattening the exchange into one ordinary response.
`,
};
