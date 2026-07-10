import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GraphQL Federation Contract Testing Guide',
  description:
    'GraphQL Federation contract testing guide for catching subgraph compatibility breaks before composition, routing, and client queries fail in CI.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# GraphQL Federation Contract Testing Guide

A subgraph change can look harmless in a pull request: one field renamed, one key removed, one return type tightened. The service still starts. Its local resolver tests still pass. Then composition fails in CI, or worse, the supergraph composes but a router plan can no longer satisfy a client query that crosses Product, Inventory, and Pricing.

GraphQL Federation contract testing exists to catch that class of failure near the team making the change. The contract is not only the SDL of one service. It is the relationship between subgraphs, entity keys, external fields, shareable fields, ownership rules, and the operations clients actually execute through the federated graph.

This guide focuses on Apollo Federation style subgraphs and the practical tests that protect compatibility. It is not a generic GraphQL primer. For single-schema test strategy, see [the complete GraphQL testing guide](/blog/graphql-testing-complete-guide). For service boundary thinking outside GraphQL, [the microservices API contract testing guide](/blog/api-contract-testing-microservices) is the companion piece.

## The contract surface in a federated graph

In a monolithic GraphQL API, the contract is mostly the schema plus resolver behavior. Federation adds a second layer: the composed graph contract. A subgraph can be internally valid and still be a bad federation citizen. It can define an entity key that no longer resolves, mark a field external without another subgraph providing it, or change a field in a way that breaks query planning.

Think of the contract in four layers:

| Layer | What can break | Test signal |
|---|---|---|
| Subgraph SDL validity | Invalid directive usage or malformed type definitions | Subgraph schema build fails |
| Federation semantics | Bad @key, @external, @requires, @provides, or ownership | Composition reports errors |
| Operation compatibility | Existing client operations cannot be planned or executed | Persisted query tests fail |
| Resolver entity behavior | _entities lookup returns incomplete or wrong representations | Entity resolver contract tests fail |

All four layers matter. SDL checks are fast, but they do not prove entity resolution. Resolver tests prove local behavior, but they do not prove composition. Persisted operation tests prove high-value client flows, but they may miss unused parts of the schema. A serious pipeline combines them.

## Building a subgraph schema test

Start with a test that builds the subgraph schema using the same SDL and resolvers the service uses in production. If this fails, there is no point running downstream federation checks.

The example below uses Apollo Server's subgraph helper. The important part is that the test imports the real typeDefs and resolvers, then asserts a query against the executable schema. This catches resolver wiring errors before composition enters the picture.

\`\`\`ts
// product-subgraph/schema.test.ts
import { describe, expect, it } from 'vitest';
import { graphql } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { resolvers } from './resolvers';
import { typeDefs } from './typeDefs';

describe('product subgraph schema contract', () => {
  it('exposes Product as an entity with sku lookup behavior', async () => {
    const schema = buildSubgraphSchema({
      typeDefs: gql(typeDefs),
      resolvers,
    });

    const result = await graphql({
      schema,
      source: \`
        query EntityLookup($representations: [_Any!]!) {
          _entities(representations: $representations) {
            ... on Product {
              sku
              name
            }
          }
        }
      \`,
      variableValues: {
        representations: [
          {
            __typename: 'Product',
            sku: 'SKU-123',
          },
        ],
      },
      contextValue: {
        productRepository: {
          findBySku: async (sku: string) => ({
            sku,
            name: 'Noise Cancelling Headphones',
          }),
        },
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      _entities: [
        {
          sku: 'SKU-123',
          name: 'Noise Cancelling Headphones',
        },
      ],
    });
  });
});
\`\`\`

This is a contract test because it verifies the federated entity lookup behavior expected by other subgraphs and the router. A resolver unit test for findBySku is not enough. The federated contract includes the representation shape and the _entities entry point.

## Composition checks as pull request gates

Composition is the cheapest high-value federation test. Every subgraph pull request should compose the candidate SDL with the current published SDL of the other subgraphs. If composition fails, block the change. If composition succeeds, continue to operation checks.

Apollo provides composition utilities through federation packages. The exact packaging can vary by major version, but the core idea is stable: pass subgraph names, URLs, and type definitions to composeServices, then assert that errors are absent.

\`\`\`ts
// federation/composition.test.ts
import { describe, expect, it } from 'vitest';
import { composeServices } from '@apollo/composition';
import { parse } from 'graphql';
import { inventorySdl } from './fixtures/current-inventory';
import { pricingSdl } from './fixtures/current-pricing';
import { productSdl } from '../product-subgraph/typeDefs';

describe('supergraph composition contract', () => {
  it('composes product changes with current inventory and pricing subgraphs', () => {
    const result = composeServices([
      {
        name: 'products',
        url: 'http://products/graphql',
        typeDefs: parse(productSdl),
      },
      {
        name: 'inventory',
        url: 'http://inventory/graphql',
        typeDefs: parse(inventorySdl),
      },
      {
        name: 'pricing',
        url: 'http://pricing/graphql',
        typeDefs: parse(pricingSdl),
      },
    ]);

    expect(result.errors).toBeUndefined();
    expect(result.supergraphSdl).toContain('join__Graph');
  });
});
\`\`\`

Keep the fixtures honest. Pull the current SDLs from your registry, artifact store, or a controlled fixture update job. Do not let every repository hand-maintain stale copies. Stale SDL fixtures create false confidence because they test compatibility with a graph nobody runs.

## Operation contracts from persisted queries

Composition success does not mean users are safe. A field can remain valid while a key client operation loses data semantics. Operation contract tests replay important GraphQL documents against the candidate supergraph or against a test router with subgraph doubles.

Use persisted operations when possible. They represent actual client dependencies and prevent the federation suite from becoming a collection of imagined queries. Classify operations by owner and business risk. Checkout, login, account recovery, and high-volume catalog paths deserve more attention than a rarely used admin filter.

| Operation source | Strength | Weakness | Best use |
|---|---|---|---|
| Persisted query registry | Mirrors real clients | May lag brand-new client work | Regression gate for deployed clients |
| Contract fixtures in subgraph repo | Easy to review with schema change | Can become wishful if not linked to clients | New field or migration coverage |
| Router access logs | Finds high-volume operations | Requires sanitization and sampling | Prioritizing which contracts matter |
| Consumer-owned contract tests | Client team controls expectations | Needs cross-team maintenance | Critical partner or app flows |

For operation tests, decide whether you need planning only or execution. Planning catches missing ownership and impossible entity hops. Execution catches resolver behavior and data shape. Many pipelines run fast planning checks on every pull request and execute a smaller set against ephemeral subgraphs before merge.

## Entity keys and representation drift

Entity keys are where federation contracts often fail quietly. A subgraph may add a new compound key, remove an old key, or change resolver assumptions. Another subgraph may still send representations using the old key. The schema might compose, but _entities returns null or partial data.

Write explicit tests for every key shape you support. If Product has @key(fields: "sku") and @key(fields: "upc"), test both representations. If a key is being deprecated, keep the contract test until all known consumers stop sending it. Do not remove key support just because the local service no longer uses it internally.

Representation tests should also cover not-found behavior. Returning null for an entity can be valid, but the team should know what the router and clients see. If missing entities should produce a domain error elsewhere, test that path at the operation layer.

## Directive changes that need extra review

Federation directives are not documentation. They affect composition and query planning. Certain directive changes deserve mandatory contract review:

| Directive change | Why it is risky | Contract test to add |
|---|---|---|
| Removing @key | Other subgraphs may still reference the entity by that representation | _entities test for old key plus composition with consumers |
| Adding @requires | Router must fetch additional fields before resolving | Operation test that crosses the requiring subgraph |
| Changing @external field type | Provider and consumer may disagree on nullability or scalar | Composition test plus resolver fixture |
| Moving field ownership | Clients may see changed resolver semantics | Persisted operation execution comparison |
| Adding @shareable | Multiple subgraphs can resolve a field | Test consistency for shared field values |

The review question is always practical: what existing query plan changes? If nobody can answer, generate a plan in a test environment or run an operation through a router with query plan output enabled in a controlled diagnostic run.

## Negative contracts are useful

Most teams write only happy-path federation tests. Negative tests are equally useful because they protect the gate itself. Keep a tiny intentionally broken SDL fixture and assert that composition reports an error. Keep an entity representation missing a key and assert the resolver returns null or a clear error. Keep an operation that asks for a removed field and assert validation fails.

These negative tests are not about breaking production. They verify that your contract harness would catch the class of problem it claims to catch. Without them, a misconfigured composition test can pass forever while checking nothing meaningful.

## Schema diffing without noisy gates

Schema diffs are useful, but a raw diff is not a contract policy. Some changes are safe: adding a nullable field, adding a new enum value if clients handle unknowns properly, or adding a new type. Some changes are risky: removing fields, tightening nullability, changing scalar semantics, or removing entity keys.

Implement a small policy layer around schema checks. The policy can classify changes as allowed, warning, or blocked. For blocked changes, require either a migration plan or evidence that no registered operation uses the affected field. This prevents teams from ignoring contract output because it cries about every harmless addition.

## CI topology for federated contracts

The fastest useful pull request pipeline usually looks like this:

1. Build the subgraph schema from real SDL and resolvers.
2. Run subgraph resolver contract tests for entity representations.
3. Compose the candidate subgraph with current SDLs for the graph.
4. Validate high-priority persisted operations against the candidate supergraph.
5. Optionally execute a small operation suite against ephemeral subgraph instances.

Nightly jobs can go deeper: full persisted query replay, router-level execution with service doubles, schema drift reports, and cross-version migration checks. Do not push all of that into the pull request path unless it stays fast enough for developers to trust.

## Contract fixtures for resolver ownership

Resolver ownership is where federated teams often talk past each other. One team says Product owns name. Another team says Search denormalizes name for ranking. A third team reads name through a composed operation and does not care who resolves it until the value changes. Contract fixtures make that ownership visible.

Create fixtures that represent the representations a subgraph expects to receive and the fields it promises to resolve. For an Inventory subgraph extending Product, the fixture should include the Product key it receives, the stock fields it owns, and any external fields it requires. The fixture should not import Product's database model or duplicate Product resolver internals. It should exercise Inventory's federated boundary.

Name these fixtures after the federation relationship, not after implementation details. inventory-resolves-product-availability is more useful than product-test-3. When a directive changes, the fixture name helps reviewers understand which relationship is affected.

Ownership fixtures also help with onboarding. A new engineer can see which subgraphs rely on a representation and which fields are intentionally shared. In a large graph, that knowledge is often buried in SDL comments and Slack history.

## Router-level tests with subgraph doubles

Some bugs appear only when the router builds a query plan. A subgraph unit test will not show the router fetching Product first, then sending representations to Reviews, then merging fields into one response. For critical operations, run a router-level test with lightweight subgraph doubles. The doubles should implement only the fields needed by the operation and should record the representations they receive.

This style of test is slower than composition, but it catches high-value failures: a required external field not fetched, a representation missing a compound key, or a query plan that starts calling a subgraph unexpectedly. Use it for checkout, account, entitlement, search, and other flows where cross-subgraph behavior is the product.

Do not try to mirror every subgraph in these tests. Keep the doubles small and deterministic. A double that implements an entire service becomes another service to maintain. The goal is to verify the contract between router planning and subgraph boundaries for selected operations.

## Coordinating breaking changes

Federation does not remove the need for migration discipline. It gives teams a path to evolve independently, but only if contract checks and rollout order are respected. Breaking changes should have a staged plan: add new field or key, release consumers, measure usage, deprecate old path, then remove after contract evidence says it is safe.

The contract suite should reflect the stage. During dual support, tests should prove both old and new keys work. During deprecation, tests should prove current persisted operations avoid the old field. At removal, tests should prove composition and operation validation still pass without it. This creates objective evidence for the change instead of relying on calendar-based cleanup.

For fields with external consumers, publish the planned removal in schema documentation and consumer channels. Internal CI can prove technical compatibility with known operations, but it cannot prove every partner read the deprecation notice. Use contract tests as the engineering gate and communication as the adoption gate.

## Handling nullability changes

Nullability is one of the most dangerous GraphQL changes because it looks local but affects query execution. Tightening a nullable field to non-null can be safe only when the resolver can truly guarantee the value. Loosening non-null to nullable can break generated clients that rely on non-null types. In federation, the risk expands because a non-null field resolved by one subgraph may sit inside a response assembled across several services.

Test nullability changes with real operations. If a field becomes non-null, include a resolver fixture where the backing data is missing and decide whether the service should error, synthesize a value, or keep the field nullable. If a field becomes nullable, validate generated client operations or typed documents if your clients use code generation. Schema composition may accept the change while consumers still fail at compile time or runtime.

The safest rule is to treat nullability as a contract migration, not as a cleanup edit. Add tests that demonstrate why the new nullability is safe for the clients and subgraphs that depend on it.

## Frequently Asked Questions

### Is composition testing enough for Apollo Federation contracts?

No. Composition proves the subgraphs can form a supergraph. It does not prove entity resolvers return the expected data, and it does not prove important client operations still behave correctly. Use composition as a gate, then add entity and operation contracts for high-risk paths.

### Where should current subgraph SDL fixtures come from?

Use a registry, artifact store, or automated export from the deployed subgraphs. Manual copies in each repository drift quickly. If you must commit fixtures, update them with a controlled script and review the diff like production contract data.

### Should every client query become a contract test?

Usually no. Start with persisted operations that are high-volume, revenue-sensitive, or owned by external consumers. Add targeted fixtures for migrations. Full query replay belongs in nightly or pre-release checks unless it is fast enough for every pull request.

### How do I test a field that moved between subgraphs?

Compose the candidate graph, run the persisted operations that use the field, and execute at least one router-level scenario that crosses the old and new ownership boundary. Also test any entity representation that the new owner depends on.

### What is the safest way to deprecate an entity key?

Keep the old key in the schema and resolver while you measure usage. Add contract tests for both old and new representations. Remove the old key only after known consumers and subgraphs have migrated, then let composition and operation checks prove the removal is safe.
`,
};
