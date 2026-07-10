import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GraphQL Contract Testing Guide',
  description:
    'Build GraphQL contract testing around schemas, operations, resolvers, and consumer expectations so API changes ship without breaking clients.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# GraphQL Contract Testing Guide

A frontend query can break even when the GraphQL endpoint still returns 200. Remove a nullable field that a mobile screen reads, rename an enum value, tighten an argument from optional to required, or change resolver behavior behind a stable field name, and the transport layer looks healthy while the client contract is gone. GraphQL contract testing lives in that gap between a valid server and a safe change.

The contract is not only the schema file. The schema describes what is possible. Consumers care about the operations they actually send, the variables they bind, the error shapes they handle, and the resolver semantics attached to fields. A useful GraphQL contract suite checks all of those layers without pretending that a single snapshot of introspection is enough.

This guide covers schema compatibility, persisted consumer operations, resolver-level contracts, federation and gateway considerations, and practical CI gates. It complements a broader [GraphQL testing complete guide](/blog/graphql-testing-complete-guide) and the service-level patterns in [API contract testing for microservices](/blog/api-contract-testing-microservices).

## Treat the schema as the public surface, not the whole promise

GraphQL gives teams a strongly typed API surface, which is a gift for testing. You can parse schemas, validate operations before runtime, inspect field nullability, and compare schema versions in CI. That does not remove the need for examples. A field can keep the same type and still change meaning. A resolver can start filtering rows differently. A list can change ordering. An error extension code can disappear.

Think of the contract as four artifacts: the published schema, the set of supported consumer operations, resolver behavior for business-critical fields, and error conventions. When all four are versioned and tested, a breaking change has fewer places to hide.

| Contract layer | What it catches | What it does not catch by itself |
|---|---|---|
| Schema diff | Removed fields, changed types, argument changes, enum changes | Wrong resolver data, authorization behavior, ordering semantics |
| Operation validation | Client query no longer valid against new schema | Resolver returns unexpected values for a still-valid query |
| Resolver contract tests | Field-specific business rules and error paths | Unused schema fields that are still broken |
| End-to-end client smoke | Integration across auth, transport, cache, and rendering | Precise source of schema incompatibility |

Schema compatibility should run early because it is cheap and deterministic. Resolver and operation contracts should run next because they prove the changes that matter to clients. UI smoke tests are still valuable, but they should not be the first time a removed GraphQL field is discovered.

## Validating consumer operations against the candidate schema

The most direct GraphQL contract test is simple: take the operations your clients use and validate them against the schema you plan to deploy. If the query no longer validates, the server change is breaking for that consumer. The graphql package gives you the primitives: parse the schema, parse the operation, and validate.

\`\`\`ts
import { buildSchema, parse, validate, specifiedRules } from 'graphql';
import { readFileSync } from 'node:fs';

const schema = buildSchema(readFileSync('schema.graphql', 'utf8'));

const mobileCheckoutQuery = parse(\`
  query MobileCheckout($cartId: ID!) {
    cart(id: $cartId) {
      id
      total {
        amount
        currency
      }
      availablePaymentMethods {
        id
        label
      }
    }
  }
\`);

test('mobile checkout operation remains valid', () => {
  const errors = validate(schema, mobileCheckoutQuery, specifiedRules);
  expect(errors.map((error) => error.message)).toEqual([]);
});
\`\`\`

This test does not call the server. That is a feature. It fails fast when a developer removes total.currency or changes cart(id:) to require a different argument. You can run hundreds of operation validations without booting the app.

The difficult part is collecting real operations. Do not ask every team to manually paste queries into a test folder and hope they remember. Use persisted queries, client build artifacts, GraphQL code generator output, or gateway telemetry to maintain a corpus. For web clients using compiled documents, publish the operation documents as part of the client package. For mobile clients, store operation manifests per released app version because older app versions remain in the field.

## Schema diff rules: breaking, dangerous, and acceptable

Not every schema change deserves the same response. Removing a field is breaking. Adding a nullable field is usually safe. Adding a required argument to an existing field is breaking for existing callers. Adding an enum value can be dangerous for clients that exhaustively switch on known values. A good contract gate classifies changes so reviewers can make conscious decisions.

| Schema change | Compatibility | Recommended gate |
|---|---|---|
| Add nullable field to an object | Usually safe | Allow, with generated client update optional |
| Remove object field | Breaking | Block unless no supported operation uses it and deprecation window is complete |
| Change field from nullable to non-null | Potentially breaking for server implementation | Require resolver proof that null cannot occur |
| Change field from non-null to nullable | Breaking for clients that assume presence | Block or version the field |
| Add required argument to existing field | Breaking | Block for all supported operations |
| Add enum value | Dangerous | Warn and require client handling review |
| Remove enum value | Breaking | Block unless no stored data or clients can receive it |

Many teams use schema registry tools or GraphQL Inspector for this layer. The tool choice matters less than the policy. The gate should know which consumers are supported, which operations are active, and what deprecation agreement the organization follows. A schema diff that screams about fields nobody has used in two years is noisy. A diff that ignores a mobile app still using an older query is unsafe.

Deprecation deserves automation. A deprecated field should have an owner, a replacement, usage telemetry, and a planned removal date. Contract tests should keep deprecated fields working until the supported consumer set has moved away from them.

## Resolver contracts for behavior that types cannot express

GraphQL types can say that an Order has a status field. They cannot say that cancelled orders must not expose a payment capture action, or that an account manager can see customer notes while a standard user cannot. Those are resolver contracts.

Apollo Server's executeOperation is useful for resolver-level tests because it runs GraphQL operations without making an HTTP request. The exact server setup in your app may differ, but the pattern is stable: create the server with real typeDefs and resolvers, pass a context that represents the caller, execute the operation, and assert the data and errors.

\`\`\`ts
import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/graphql/typeDefs';
import { resolvers } from '../src/graphql/resolvers';

const server = new ApolloServer({ typeDefs, resolvers });

test('viewer cannot read another customer private note', async () => {
  const response = await server.executeOperation(
    {
      query: \`
        query CustomerNote($id: ID!) {
          customer(id: $id) {
            id
            privateNote
          }
        }
      \`,
      variables: { id: 'customer-42' },
    },
    {
      contextValue: {
        user: { id: 'user-7', role: 'viewer', customerIds: ['customer-7'] },
      },
    },
  );

  expect(response.body.kind).toBe('single');
  if (response.body.kind !== 'single') throw new Error('unexpected incremental response');

  expect(response.body.singleResult.data?.customer).toBeNull();
  expect(response.body.singleResult.errors?.[0].extensions?.code).toBe('FORBIDDEN');
});
\`\`\`

This is a contract test because it specifies what a consumer can rely on: unauthorized access returns a null customer with a FORBIDDEN error code. If your product contract is different, such as returning a customer object with privateNote set to null, test that instead. The important part is to pin the behavior intentionally.

Avoid using resolver contracts as broad snapshots of entire objects. Snapshots make it easy to approve accidental changes. Prefer targeted assertions around fields whose meaning matters: money values, permission-gated fields, pagination cursors, default sorting, and error extension codes.

## Consumer-owned contracts without duplicating the server suite

In REST, consumer-driven contract tests often use request and response examples. GraphQL consumers can do something more precise: publish their actual operation documents and expected assumptions. A checkout client might publish that cart.total.amount is required for rendering, cart.availablePaymentMethods can be empty, and a CART_NOT_FOUND error sends the user back to the cart page.

The provider should validate those operation documents against the candidate schema and run a small set of fixtures through resolvers. The consumer should not dictate every backend detail. It should state the behaviors it depends on. That keeps the contract from becoming a second implementation of the server.

For organizations with many consumers, store contracts by consumer name and version. Web current, iOS 8.4, Android 8.1, partner API batch importer, and internal admin console may all have different lifetimes. A change that is safe for the web app may still break a mobile version that will be supported for six more months.

## Pagination, filtering, and ordering contracts

GraphQL pagination bugs often pass schema tests because the types remain valid. Relay-style connections, offset pagination, and custom cursor models all need behavioral contracts. Test empty lists, a single item, page boundaries, stable ordering, and invalid cursors. If the field accepts filters, test how filters interact with pagination. A common defect is applying pagination before filtering, which returns short or inconsistent pages.

Cursor format should usually be opaque to clients, but cursor behavior is a contract. A client should be able to request after a cursor and receive the next page without duplicates or missing rows under the documented ordering. If your product supports live inserts while paging, define whether results are snapshot-stable or best effort. Tests should assert that chosen behavior instead of assuming a perfect world.

Ordering is another hidden contract. If orders defaults to createdAt descending, write that down in a resolver test. If search relevance can change as ranking models evolve, do not assert exact global order unless the product guarantees it. Use fixtures with clear tie breakers so failures are interpretable.

## Error shapes and nullability are part of the API

GraphQL's partial response model is powerful, but it can surprise teams that only test happy paths. A field error can produce data for other fields and an errors array at the same time. Nullability controls how far an error bubbles. If a non-null child fails, the parent may become null. Clients need to know which errors are recoverable and which remove the whole object.

Contract tests should cover the error extension codes your clients branch on. If the web app checks FORBIDDEN, CART_NOT_FOUND, PAYMENT_REQUIRED, or RATE_LIMITED, those codes are API surface. Changing the human-readable message may be fine. Changing extensions.code without coordination is a breaking change.

Do not overfit on error message text unless the message is displayed directly and product-owned. Messages often change for clarity or localization. Codes, paths, nullability, and HTTP status behavior at the GraphQL endpoint are better contract anchors.

## Federation and gateway contracts

Federated GraphQL adds another contract boundary: subgraph schemas compose into a supergraph, and the gateway query plan depends on entity keys and field ownership. A subgraph change can be locally valid but fail composition or break an entity resolver used by another subgraph.

Test subgraph composition in CI before deploying a subgraph. Validate important consumer operations against the composed schema, not only the subgraph schema. If the gateway adds auth, rate limiting, persisted query lookup, or response formatting, keep gateway-level contract tests separate from resolver unit tests. They answer different questions.

Entity contracts deserve special attention. If Product is resolved by sku in one subgraph and another subgraph changes the key fields, operations that cross inventory, pricing, and catalog may fail even though each subgraph's local tests pass. Include cross-subgraph operations in the operation corpus.

## Release workflow for GraphQL contract gates

A practical CI flow has three stages. First, schema diff the proposed schema against the published schema and classify changes. Second, validate supported consumer operations against the proposed schema. Third, run resolver contract fixtures for high-risk behavior. Only after those pass should broad integration and UI tests run.

Store the generated schema artifact from each build. Do not rely on developers remembering to update schema.graphql manually. For code-first GraphQL, generate the schema in CI and compare the artifact. For schema-first systems, lint and validate the checked-in schema before booting the server.

Make exceptions explicit. Sometimes a breaking change is intentional because a version is being retired. The contract gate should require a documented override, not a silent skip. Good overrides mention the consumer version being removed, the telemetry proving it is unused, and the release that completed migration.

## Contracts for mutations and side effects

GraphQL mutation contracts deserve separate attention because they combine validation, authorization, side effects, and return payload shape. A mutation may remain valid in the schema while changing the idempotency rule or error behavior that clients rely on. For example, createInvite might previously return the existing pending invite when called twice, then later start throwing an error. Both behaviors can be defensible, but switching between them is a contract change.

Write mutation contract tests around business outcomes, not only returned fields. If updateBillingEmail succeeds, assert that the stored email changed and that the response includes the updated value. If cancelSubscription is forbidden for a viewer, assert the error code and prove no subscription state changed. If a mutation publishes an event, use a test double at the event boundary and assert the event payload your consumers depend on.

Idempotency is especially important for mobile and network-unreliable clients. A mutation that can be retried after a timeout should document whether repeated calls are safe. Contract tests can run the same mutation twice with the same idempotency key and assert the second response. That turns retry behavior into an API promise instead of folklore.

## Versioning GraphQL contracts without versioned URLs

Many GraphQL APIs avoid versioned endpoints, which means compatibility discipline has to live in schema evolution. Add fields instead of changing meanings in place. Deprecate old fields with clear reasons. Keep old fields working until supported consumers have moved. For behavior changes that cannot be represented as a new field, use capability flags, explicit arguments with safe defaults, or a new mutation name.

The hardest part is mobile support. A web client can deploy quickly. A mobile app version may remain active for months. Your contract gate should know which operation manifests belong to supported mobile versions. Removing a field because the latest app stopped using it is unsafe if older versions still send that operation.

For partner APIs, treat contract communication as part of the release. A deprecation comment in the schema is not enough if partners do not monitor it. Provide migration examples, timelines, and a test environment where partners can validate their operations before the breaking change window closes.

Contract ownership should be visible in code review. When a schema change touches a shared field, the review should show which consumer operations were checked and which resolver contracts were updated. If no consumer owns the field, say that explicitly and back it with usage data. Silent assumptions are how unused-looking fields break batch jobs and older clients.

Keep schema artifacts reproducible. A generated schema should come from the same code that will deploy, not from a developer's local server with uncommitted changes. Store the artifact or regenerate it in CI, then run contract gates from that artifact. Reproducibility makes disputes about breaking changes much easier to resolve.

## Frequently Asked Questions

### Is GraphQL contract testing just schema diffing?

No. Schema diffing catches structural breaking changes, but it cannot prove resolver behavior, pagination semantics, authorization, or error codes. Use schema diffing as the first gate, then validate real consumer operations and targeted resolver contracts.

### Where should consumer GraphQL operations come from?

Use generated client artifacts, persisted query manifests, mobile release bundles, or gateway telemetry. Manual copies drift quickly. The operation corpus should represent supported clients, not only the latest web branch.

### Should contract tests assert entire GraphQL responses?

Usually no. Whole-response snapshots are brittle and easy to approve without thought. Assert the fields, nullability, ordering, and error codes that consumers depend on. Keep broad snapshots for narrow cases where the response itself is the contract.

### How do contract tests work with federated GraphQL?

Run composition checks for subgraphs, validate consumer operations against the composed supergraph, and add gateway-level tests for behavior introduced at the gateway. Subgraph-only tests are necessary but not sufficient.

### Can adding an enum value break clients?

It can. Some generated clients or application code use exhaustive switches. Treat new enum values as dangerous changes that require consumer handling review, even though they are not the same as removing a value.
`,
};
