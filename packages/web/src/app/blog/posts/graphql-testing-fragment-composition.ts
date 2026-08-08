import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GraphQL Testing Fragment Composition: Validate the Whole Executable Document',
  description: 'Use GraphQL testing fragment composition to catch missing spreads, cycles, field conflicts, variable bugs, and response-shape drift before API calls run.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# GraphQL Testing Fragment Composition: Validate the Whole Executable Document

**GraphQL testing fragment composition** means assembling the operation and every transitively referenced fragment into one \`DocumentNode\`, then validating that complete document against the production schema before execution. Test the fragment graph, not isolated strings. A fragment can parse successfully and still fail because a spread is missing, a name is duplicated, a cycle exists, a type condition can never apply, two selections conflict, or an operation omitted a variable used inside a nested fragment.

The core workflow is deterministic: parse each source, compose definitions without changing them, run GraphQL validation, assert that every operation has a closed fragment dependency graph, execute representative operations against controlled resolvers, and verify response shapes at abstract-type boundaries. If the client persists or hashes documents, hash the same canonical composed document that is validated and sent.

This guide uses the official \`graphql\` JavaScript package with Node and Vitest. The examples create a small schema, real fragment graphs, validation tests, and executable fixtures. For HTTP transport assertions around a Node GraphQL endpoint, the [SuperTest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) covers request-level mechanics. When the boundary is between independently released services, use the [Pact contract testing guide](/blog/contract-testing-pact-complete-guide) to decide what belongs in a consumer contract.

## Model fragments as a directed dependency graph

A named fragment is a definition with a type condition and a selection set. A spread creates a directed edge from an operation or fragment to another fragment. The executable document must include each reachable definition exactly once, and fragment-to-fragment edges must not form a cycle.

| Graph condition | GraphQL validation concern | Typical symptom | Test assertion |
| --- | --- | --- | --- |
| spread points to absent node | known fragment names | unknown fragment error | every referenced name is defined |
| two nodes share one name | unique fragment names | duplicate-name error | definition names are unique |
| path returns to earlier node | no fragment cycles | cycle validation error | dependency graph is acyclic |
| node is never reached | fragments must be used | unused-fragment error | compose per operation, not global library dump |
| type sets never overlap | possible fragment spreads | impossible-spread error | type condition can apply in parent scope |

The GraphQL specification calls fragments the primary unit of composition. Its current released text is at https://spec.graphql.org/September2025/. GraphQL.js usage and API documentation is at https://www.graphql-js.org/docs/. Validation is schema-aware, so a parser or formatter alone cannot prove a document is executable.

Think of the final operation as the test artifact. Individual fragment files are source units. The server receives a document containing an operation plus definitions, not an import graph understood by JavaScript bundlers. A build tool may hide assembly, but QA still needs to inspect and validate what crosses the network.

## Build a schema fixture with abstract and concrete types

A useful composition fixture needs more than scalar fields. Interfaces and unions expose type-condition errors, while a field with arguments exposes response-key conflicts. Save this as \`tests/graphql/schema.ts\`.

\`\`\`typescript
import { buildSchema } from "graphql";

export const schema = buildSchema(\`
  interface Node {
    id: ID!
  }

  type User implements Node {
    id: ID!
    name: String!
    avatarUrl(size: Int!): String!
  }

  type Product implements Node {
    id: ID!
    sku: String!
    title: String!
  }

  union SearchResult = User | Product

  type Query {
    viewer: User!
    node(id: ID!): Node
    search(term: String!): [SearchResult!]!
  }
\`);

export const rootValue = {
  viewer: {
    __typename: "User",
    id: "user-1",
    name: "Ada",
    avatarUrl: ({ size }: { size: number }) =>
      "https://images.example.test/ada-" + size + ".png",
  },
  node: ({ id }: { id: string }) => ({
    __typename: "Product",
    id,
    sku: "SKU-100",
    title: "Test Design Workbook",
  }),
  search: ({ term }: { term: string }) => [
    {
      __typename: "User",
      id: "user-1",
      name: "Ada " + term,
      avatarUrl: ({ size }: { size: number }) =>
        "https://images.example.test/search-" + size + ".png",
    },
    {
      __typename: "Product",
      id: "product-1",
      sku: "SKU-100",
      title: "Workbook for " + term,
    },
  ],
};
\`\`\`

The fixture uses reserved \`.test\` URLs and deterministic data. Returning \`__typename\` lets GraphQL.js resolve the interface and union without an application-specific type resolver. Functions on root fields and nested fields receive argument objects through the default resolver, which makes the \`size\`, \`id\`, and \`term\` behavior executable.

Keep this schema fixture aligned with a checked-in schema artifact or an introspection result from an authorized environment. A handwritten schema that omits recently changed fields can make document validation pass locally while the deployed contract differs.

## Define fragments by the response needs they serve

Create small fragments with explicit type conditions and stable names. The examples use \`parse\` so each constant is an actual GraphQL AST rather than an undocumented client wrapper. Save these definitions in \`tests/graphql/documents.ts\`.

\`\`\`typescript
import { parse } from "graphql";

export const userIdentity = parse(\`
  fragment UserIdentity on User {
    id
    name
  }
\`);

export const userCard = parse(\`
  fragment UserCard on User {
    ...UserIdentity
    avatarUrl(size: 64)
  }
\`);

export const viewerOperation = parse(\`
  query ViewerPage {
    viewer {
      ...UserCard
    }
  }
\`);

export const searchResult = parse(\`
  fragment SearchResultRow on SearchResult {
    __typename
    ... on User {
      id
      name
    }
    ... on Product {
      id
      sku
      title
    }
  }
\`);

export const searchOperation = parse(\`
  query SearchPage($term: String!) {
    search(term: $term) {
      ...SearchResultRow
    }
  }
\`);
\`\`\`

The fragment name should describe a response contract, not merely a database entity. \`UserIdentity\` promises two identity fields. \`UserCard\` composes that contract and adds the exact avatar variant needed by a card. A giant \`AllUserFields\` fragment encourages over-fetching, hides which component owns each field, and makes unrelated schema changes ripple through many operations.

| Fragment shape | Useful when | Composition risk | Test focus |
| --- | --- | --- | --- |
| leaf fragment on object | repeated concrete response fields | name collision | field and argument stability |
| fragment containing spreads | component builds on child contracts | missing transitive definition | dependency closure |
| fragment on interface | common fields across implementers | implementer-only field selected directly | schema validation |
| fragment on union | branch by runtime type | direct field selection on union | inline fragments and \`__typename\` |
| conditional fragment | field group depends on variable | operation omits variable | variable closure per operation |

Selecting \`__typename\` at abstract boundaries is a practical discriminator for response assertions and typed consumers. It does not replace schema validation, but it makes runtime branch coverage visible.

## Compose AST definitions without string surgery

Composition does not require concatenating raw GraphQL strings. Merge the parsed definitions into a new \`DocumentNode\`. This preserves source ASTs and lets GraphQL's validator reason about the complete document.

Save this as \`tests/graphql/compose.ts\`.

\`\`\`typescript
import {
  Kind,
  type DefinitionNode,
  type DocumentNode,
} from "graphql";

export function composeDocuments(
  ...documents: readonly DocumentNode[]
): DocumentNode {
  const definitions: DefinitionNode[] = documents.flatMap(
    (document) => document.definitions,
  );
  return { kind: Kind.DOCUMENT, definitions };
}
\`\`\`

This helper deliberately does not deduplicate. Silent deduplication by name can hide two different definitions that should fail the uniqueness rule. If the same exact fragment object enters through two dependency paths, build a graph resolver that includes it once by source identity before this final assembly. If two files independently declare \`UserIdentity\`, validation should surface the collision.

Do not depend on JavaScript interpolation behavior from a particular GraphQL client unless that client documents it and the project tests it. Some tags flatten nested documents, some add metadata, and some build typed artifacts at compile time. The stable assertion is the final printed or transmitted GraphQL document and its validation result.

## Validate the complete viewer operation

GraphQL.js \`validate(schema, document)\` applies the standard validation rules. A valid viewer document needs the operation, \`UserCard\`, and its transitive \`UserIdentity\` dependency. Save this as \`tests/graphql/composition.spec.ts\`.

\`\`\`typescript
import { describe, expect, it } from "vitest";
import { validate } from "graphql";
import { composeDocuments } from "./compose";
import {
  userCard,
  userIdentity,
  viewerOperation,
} from "./documents";
import { schema } from "./schema";

describe("viewer fragment composition", () => {
  it("forms a valid closed document", () => {
    const document = composeDocuments(
      viewerOperation,
      userCard,
      userIdentity,
    );
    expect(validate(schema, document)).toEqual([]);
  });

  it("fails when a transitive fragment is absent", () => {
    const document = composeDocuments(viewerOperation, userCard);
    const messages = validate(schema, document).map((error) => error.message);
    expect(messages).toContain('Unknown fragment "UserIdentity".');
  });
});
\`\`\`

Asserting an exact standard error message is useful in a test pinned to the installed GraphQL.js behavior, but it can create upgrade noise. A repository supporting multiple versions can assert the error rule through a targeted predicate or snapshot a reviewed set. Never discard the errors and assert only that the array is nonempty, because a different validation failure could make the negative test pass for the wrong reason.

What people get wrong is validating a library file containing fragments with no operation. Standard validation requires fragment definitions to be used, so a bag of otherwise sound fragments can fail as unused. Conversely, parsing each fragment separately misses missing spreads and cross-fragment conflicts. Compose each production operation with its reachable graph and validate that executable unit.

## Detect duplicate names before one definition wins silently

Duplicate fragment names are invalid even if their selections happen to match. A loader that stores fragments in a map by name can overwrite the first definition and hide the defect. Validate before converting definitions to a name-keyed structure.

\`\`\`typescript
import { expect, it } from "vitest";
import { parse, validate } from "graphql";
import { composeDocuments } from "./compose";
import { schema } from "./schema";

it("rejects independently declared fragments with one name", () => {
  const operation = parse(\`
    query DuplicateFixture {
      viewer { ...UserSummary }
    }
  \`);
  const first = parse(\`
    fragment UserSummary on User { id }
  \`);
  const second = parse(\`
    fragment UserSummary on User { name }
  \`);

  const errors = validate(
    schema,
    composeDocuments(operation, first, second),
  );
  expect(errors.map((error) => error.message)).toContain(
    'There can be only one fragment named "UserSummary".',
  );
});
\`\`\`

Use globally distinctive names when fragments from many features share a document. A component or feature prefix can help, but naming alone is not a correctness control. The validation test is what prevents a later contributor or code generator from creating the same name.

When a fragment changes meaning, prefer changing the fragment fields and reviewing affected operations over creating vague suffixes such as \`V2Final\`. Version names are appropriate only when two response contracts must coexist intentionally and consumers migrate on a schedule.

## Catch field conflicts introduced through distant fragments

Selections with the same response key must be mergeable. Two fragments can each look valid in isolation yet conflict when spread into the same selection set. Arguments are a common source: one fragment aliases a 64-pixel avatar to \`picture\`, while another aliases a 128-pixel avatar to the same response key.

\`\`\`typescript
import { expect, it } from "vitest";
import { parse, validate } from "graphql";
import { schema } from "./schema";

it("rejects conflicting arguments behind the same response key", () => {
  const document = parse(\`
    query ConflictingPictures {
      viewer {
        ...CompactPicture
        ...ProfilePicture
      }
    }

    fragment CompactPicture on User {
      picture: avatarUrl(size: 64)
    }

    fragment ProfilePicture on User {
      picture: avatarUrl(size: 128)
    }
  \`);

  const messages = validate(schema, document).map((error) => error.message);
  expect(messages.some((message) => message.includes('Fields "picture" conflict'))).toBe(true);
});
\`\`\`

Possible fixes express product intent. Give the fields distinct aliases if both sizes are required, standardize the argument if they represent the same response contract, or stop composing both fragments in one scope. Do not suppress validation or let a client pick whichever field it processed last.

| Conflict source | Example | Correct resolution |
| --- | --- | --- |
| different arguments | same alias, two avatar sizes | distinct aliases or one agreed size |
| different fields | alias maps name and SKU to \`label\` | distinct response keys |
| incompatible subselections | same object key, conflicting child fields | align nested contract |
| nullability or type drift after schema change | fragments validated against different schema versions | validate all against one release schema |

Cross-fragment field merging is one of the strongest reasons to validate the final operation. Source-file unit tests do not see the shared response key.

## Prove cycles and impossible spreads fail before execution

A cycle can be indirect. Fragment A spreads B, B spreads C, and C spreads A. GraphQL execution must never expand that graph. Standard validation detects it.

\`\`\`typescript
import { expect, it } from "vitest";
import { parse, validate } from "graphql";
import { schema } from "./schema";

it("rejects an indirect fragment cycle", () => {
  const document = parse(\`
    query CycleFixture {
      viewer { ...UserA }
    }
    fragment UserA on User { id ...UserB }
    fragment UserB on User { name ...UserC }
    fragment UserC on User { avatarUrl(size: 64) ...UserA }
  \`);

  const messages = validate(schema, document).map((error) => error.message);
  expect(messages.some((message) => message.includes("Cannot spread fragment"))).toBe(true);
});

it("rejects a product fragment inside a user-only scope", () => {
  const document = parse(\`
    query ImpossibleFixture {
      viewer { ...ProductTitle }
    }
    fragment ProductTitle on Product { title }
  \`);

  const messages = validate(schema, document).map((error) => error.message);
  expect(messages.some((message) => message.includes("can never be of type"))).toBe(true);
});
\`\`\`

The substring assertions avoid coupling the test to an entire diagnostic sentence while still distinguishing the rules. If an upgrade changes wording substantially, inspect the actual validation errors and adjust intentionally. Do not catch parsing and validation exceptions under one generic "invalid GraphQL" label, because the repair path differs.

Impossible-spread tests are especially useful after interface and union membership changes. A fragment may remain syntactically correct while the parent and type-condition possible-type sets no longer overlap.

## Close variables over the whole fragment graph

Fragments cannot define their own operation variables. If a fragment uses \`$avatarSize\` or a conditional directive variable, every operation that reaches that fragment must define a compatible variable. This dependency can be several spreads away from the operation.

\`\`\`typescript
import { expect, it } from "vitest";
import { parse, validate } from "graphql";
import { schema } from "./schema";

it("requires the operation to define variables used by nested fragments", () => {
  const invalid = parse(\`
    query AvatarFixture {
      viewer { ...VariableAvatar }
    }
    fragment VariableAvatar on User {
      avatarUrl(size: $avatarSize)
    }
  \`);

  expect(
    validate(schema, invalid).some((error) =>
      error.message.includes('Variable "$avatarSize" is not defined'),
    ),
  ).toBe(true);

  const valid = parse(\`
    query AvatarFixture($avatarSize: Int!) {
      viewer { ...VariableAvatar }
    }
    fragment VariableAvatar on User {
      avatarUrl(size: $avatarSize)
    }
  \`);

  expect(validate(schema, valid)).toEqual([]);
});
\`\`\`

This is why a fragment's effective contract includes more than selected fields. It can impose variables and directives on every consuming operation. Document that dependency next to the fragment or, when practical, keep argument-bearing fields in the operation or immediate parent fragment where the variable is visible.

Test each operation that consumes a variable-dependent fragment. A valid admin operation does not prove a public operation defines the same variable.

## Execute valid documents against controlled resolvers

Validation proves structural compatibility with the schema. Execution proves variables, abstract-type branches, arguments, and response shape against resolver behavior. Test both layers so a valid document that receives surprising data does not escape.

\`\`\`typescript
import { describe, expect, it } from "vitest";
import { execute } from "graphql";
import { composeDocuments } from "./compose";
import {
  searchOperation,
  searchResult,
  userCard,
  userIdentity,
  viewerOperation,
} from "./documents";
import { rootValue, schema } from "./schema";

describe("composed operation execution", () => {
  it("executes transitive viewer fragments", async () => {
    const document = composeDocuments(viewerOperation, userCard, userIdentity);
    const result = await execute({ schema, document, rootValue });
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      viewer: {
        id: "user-1",
        name: "Ada",
        avatarUrl: "https://images.example.test/ada-64.png",
      },
    });
  });

  it("covers every union branch returned by the fixture", async () => {
    const document = composeDocuments(searchOperation, searchResult);
    const result = await execute({
      schema,
      document,
      rootValue,
      variableValues: { term: "QA" },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.search).toEqual([
      { __typename: "User", id: "user-1", name: "Ada QA" },
      {
        __typename: "Product",
        id: "product-1",
        sku: "SKU-100",
        title: "Workbook for QA",
      },
    ]);
  });
});
\`\`\`

These are exact contract assertions because the fixture is controlled. Against a shared environment, create test-owned records and avoid counts or ordering that other tests can change. Transport, authentication, caching, and HTTP status behavior belong in a separate endpoint test rather than being smuggled into a pure composition test.

## Keep document hashing aligned with validation

Persisted-query systems often identify an operation by a hash. Hashing only the operation source while sending additional fragments can create mismatches, and fragment-order differences can create multiple hashes for semantically similar documents. Define one canonical assembly order, print the composed AST, validate it, and hash that exact printed string.

\`\`\`typescript
import { createHash } from "node:crypto";
import { print, validate, type DocumentNode, type GraphQLSchema } from "graphql";

export function validatedDocumentId(
  schema: GraphQLSchema,
  document: DocumentNode,
): string {
  const errors = validate(schema, document);
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join("; "));
  }
  const source = print(document);
  return createHash("sha256").update(source).digest("hex");
}
\`\`\`

Do not claim that \`print\` provides universal semantic normalization. It provides a consistent representation for a given AST definition order. Your composition layer must keep that order deterministic. If the production client uses a different canonicalizer, test the client artifact rather than substituting this helper.

Store operation IDs as generated build outputs with provenance to the schema and source commit. A stale registry can reject a valid newly built operation, while a stale client can request an ID the server no longer recognizes. Composition tests should run before registry publication, and a deployment smoke test should verify representative IDs through the real gateway.

## Build a failure report that points to the composition edge

A realistic failure appears after a component adds \`...PriceBadge\` inside \`ProductCard\`. Its unit snapshot passes because the component test mocks the final object. CI's GraphQL validation fails with \`Unknown fragment "PriceBadge"\`. The operation builder included \`ProductCard\` but not the new transitive dependency.

Diagnose it in this order:

1. Print the final composed document from the failing build artifact.
2. Confirm that the spread exists and the named definition does not.
3. Inspect the fragment dependency resolver, not the server, because validation failed before execution.
4. Add \`PriceBadge\` to the dependency graph at its source and compose it once.
5. Add a regression that validates the specific production operation with all reachable fragments.
6. Recompute any persisted-document identifier from the corrected final document.

| Failure phase | Evidence | Owner to involve |
| --- | --- | --- |
| parsing | source location and syntax diagnostic | fragment author or generator owner |
| composition | missing or duplicate definitions in final AST | document loader owner |
| validation | schema-aware rule errors | schema and client contract owners |
| execution | \`errors\` with resolver paths | API implementation owner |
| transport | HTTP status, headers, serialized body | gateway or endpoint owner |
| persistence | unknown document ID or registry mismatch | build and registry owners |

Do not retry structural validation failures. They are deterministic for a schema and document. Retries add noise and delay the actionable error. Reserve retry policy for classified transient transport failures, and keep that policy outside the composition test.

## Put operation-level validation in CI

The CI gate should load the same schema and generated documents used by the application build. For each named operation, assemble only its reachable fragments, validate, print a readable diagnostic with operation and source names, and exit nonzero on any error. Also execute a smaller representative set against controlled resolvers or an authorized ephemeral service.

Track these invariants during review:

- every production operation has exactly one operation name;
- every spread target is present in its transmitted document;
- fragment names are unique within that document;
- validation passes against the intended release schema;
- variable definitions close over all nested fragment uses;
- abstract-type fixtures cover each expected runtime branch;
- the persisted identifier is derived from the validated transmitted form;
- logs do not print sensitive variables or production response data.

An AI coding agent can help trace spreads and generate operation fixtures, but require it to run the real validator. Text similarity is not enough to detect type overlap, field merge rules, or variable compatibility. Make the final \`DocumentNode\` an inspectable artifact in failed CI jobs, subject to data-handling policy.

## Frequently Asked Questions

### Should GraphQL fragments be tested independently or only through operations?

Test fragment source units for naming and intended fields, but make operation-level composition the authoritative check. A fragment alone cannot reveal missing transitive definitions, conflicts with sibling fragments, operation variable omissions, or impossible placement in a parent scope. Standard document validation also reports an unreferenced standalone fragment as unused. Compose each production operation with its reachable graph, validate against the release schema, then execute representative operations with controlled data. This keeps unit feedback while proving the artifact the server actually receives.

### How do we prevent duplicate fragment names across feature folders?

Use descriptive, feature-aware names and validate the final composed document before any loader converts definitions into a name-keyed map. A map can silently overwrite the first definition and conceal the duplicate. Keep a CI test that assembles every production operation and reports both source locations when one name appears twice. Do not silently deduplicate by name, because two equal-looking definitions may diverge later. Generated fragments should follow the same registry and validation path as handwritten fragments.

### Why does a fragment variable fail in one operation but work in another?

Fragments do not declare operation variables. Every operation that reaches a fragment using \`$avatarSize\`, \`$includeDetails\`, or another variable must define that variable with a compatible type. One operation may do so while another omits it, even though both include the same fragment definition. Validate each composed operation separately. Document variable dependencies near the fragment, and keep argument-bearing selections close to the consuming operation when that improves visibility. Parsing the fragment alone cannot catch this closure problem.

### What should we snapshot for GraphQL fragment composition tests?

Prefer semantic assertions first: validation has no errors, expected fragment names are present once, variables are defined, and controlled execution returns the required response shape. A printed final document can be a useful reviewed snapshot for catching accidental field or argument changes, especially before persisted-query hashing. Keep definition ordering deterministic so snapshots do not churn. Avoid snapshotting huge server responses or sensitive variable values. When a snapshot changes, still run schema validation, because textual approval alone cannot prove the selections are executable.
`,
};
