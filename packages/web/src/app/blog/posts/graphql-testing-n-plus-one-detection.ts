import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GraphQL Testing N Plus One Detection With Query Budgets',
  description: 'Learn GraphQL testing N plus one detection with resolver counters, SQL traces, batching tests, and CI query budgets that catch performance regressions early.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# GraphQL Testing N Plus One Detection With Query Budgets

GraphQL testing N plus one detection works best when a test counts downstream operations as the result set grows. Execute the same query against one parent and many parents, record database or service calls, and fail when work scales per row instead of per request. This finds the structural defect without relying on noisy response-time comparisons.

An N+1 problem appears when one operation loads a parent collection and then performs another downstream lookup for each parent. Ten authors produce one author query plus ten book queries. A larger staging dataset makes the endpoint suddenly slow, even though every resolver returns correct data. The right regression test asserts both the GraphQL result and an intentional query budget.

This guide builds that workflow in TypeScript using GraphQL concepts, repository instrumentation, SQL recording, and request-scoped batching. The exact server framework is not important. Keep the test seam below GraphQL execution and above the database driver or remote client, then reuse it in unit, integration, and CI layers.

## Recognize Fan-Out in the Resolver Tree

GraphQL executes only fields selected by the client, which is powerful but makes work depend on query shape. A top-level resolver may load authors once while a nested \`books\` resolver runs for every author object. The response looks correct, and a test with one author cannot expose the scaling behavior because \`1 + N\` is only two calls.

\`\`\`graphql
query AuthorDirectory {
  authors {
    id
    name
    books {
      id
      title
    }
  }
}
\`\`\`

The problematic implementation is straightforward:

\`\`\`ts
export const resolvers = {
  Query: {
    authors: (_parent: unknown, _args: unknown, context: Context) =>
      context.authors.findAll(),
  },
  Author: {
    books: (author: Author, _args: unknown, context: Context) =>
      context.books.findByAuthorId(author.id),
  },
};
\`\`\`

Nothing here is functionally incorrect. The problem is multiplicative execution. GraphQL calls \`Author.books\` for each parent that survives the query. If \`findByAuthorId\` performs one SQL statement or HTTP request each time, total work grows with the number of authors.

| Parents returned | Parent loads | Child loads | Total downstream calls |
|---:|---:|---:|---:|
| 0 | 1 | 0 | 1 |
| 1 | 1 | 1 | 2 |
| 10 | 1 | 10 | 11 |
| 100 | 1 | 100 | 101 |

The signature is not merely “many queries.” Some features legitimately need several fixed queries. The signature is that a particular class of call increases linearly with parent cardinality for one GraphQL operation. Detection therefore needs at least two dataset sizes or a sufficiently large fixture plus an exact causal trace.

## Choose a Measurement Below Resolvers

Resolver invocation counts alone can mislead. A field resolver may run once per parent while its DataLoader batches all keys into one database query. That is healthy. Measure the expensive boundary you want to protect: SQL executions, repository calls that cross the network, REST requests, or cache misses.

| Measurement point | What it proves | Main limitation | Best use |
|---|---|---|---|
| Resolver counter | execution fan-out | does not prove I/O fan-out | unit diagnosis |
| Repository method counter | data-access fan-out | method may cache or batch internally | service tests |
| SQL statement recorder | actual database round trips | tied to database adapter | integration gate |
| Outbound HTTP recorder | remote service calls | must sanitize requests | federated/service tests |
| Wall-clock duration | user-visible latency | noisy and environment-dependent | performance environment |

Instrument at more than one level when diagnosing. A resolver counter of 50 paired with one SQL statement demonstrates batching. A resolver counter of 50 paired with 50 nearly identical statements demonstrates N+1. The relationship matters more than either number alone.

Do not use production logs as the primary pull-request assertion. Logs are useful evidence, but concurrent operations make attribution difficult. Give each test execution an operation identifier and collect calls in an isolated recorder attached to that request's repository or driver.

## Build a Counting Repository Without Changing Behavior

A thin decorator can count calls and arguments while delegating to the real repository. It preserves production behavior and produces a test-readable trace. Keep the trace request-scoped so parallel tests do not increment the same global counter.

\`\`\`ts
type Book = { id: string; authorId: string; title: string };

interface BookRepository {
  findByAuthorId(authorId: string): Promise<Book[]>;
  findByAuthorIds(authorIds: readonly string[]): Promise<Book[]>;
}

type BookCall =
  | { method: 'findByAuthorId'; authorId: string }
  | { method: 'findByAuthorIds'; authorIds: readonly string[] };

export class RecordingBookRepository implements BookRepository {
  readonly calls: BookCall[] = [];

  constructor(private readonly inner: BookRepository) {}

  findByAuthorId(authorId: string): Promise<Book[]> {
    this.calls.push({ method: 'findByAuthorId', authorId });
    return this.inner.findByAuthorId(authorId);
  }

  findByAuthorIds(authorIds: readonly string[]): Promise<Book[]> {
    this.calls.push({ method: 'findByAuthorIds', authorIds: [...authorIds] });
    return this.inner.findByAuthorIds(authorIds);
  }
}
\`\`\`

The recorder captures a copy of the batch keys so later mutations cannot rewrite test evidence. It counts semantic repository operations, which makes the test stable across SQL formatting changes. A separate database integration test should still prove that \`findByAuthorIds\` executes as one bounded query rather than looping internally.

If your GraphQL layer calls another HTTP service, apply the same decorator to that client. Count remote requests by operation and relevant normalized parameters. Avoid storing authorization headers or personal data in failure output.

## Execute GraphQL Through the Same Request Context

The N+1 regression lives in context construction as much as resolver code. A DataLoader created once for the whole process can leak cached data across users. A new DataLoader created inside every field resolver never batches. The test harness must construct context the same way a real request does.

The following pseudocode uses a server-agnostic execution function supplied by the application:

\`\`\`ts
type ExecuteOperation = (input: {
  query: string;
  context: Context;
}) => Promise<{
  data?: unknown;
  errors?: readonly { message: string }[];
}>;

export async function runAuthorQuery(
  executeOperation: ExecuteOperation,
  context: Context,
) {
  return executeOperation({
    query: \`
      query AuthorDirectory {
        authors {
          id
          name
          books { id title }
        }
      }
    \`,
    context,
  });
}
\`\`\`

The inner GraphQL query uses escaped template delimiters in this published TypeScript module. In the application test, prefer a parsed document or the server framework's documented test operation interface. The key requirement is that parsing, validation, context creation, resolver execution, and response formatting follow the real request path.

For transport-level concerns such as authentication headers and HTTP error handling, the [Supertest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide) can complement these execution-level checks. Keep the N+1 assertion close to the measured dependency so a failed budget reports calls, not merely a slow HTTP response.

## Write a Regression Test That Scales the Fixture

A robust test proves the query-count function. Seed one author, execute the operation with a fresh context, and record the calls. Then seed twenty authors, create another fresh context, and execute again. After batching, the child-load count should stay constant rather than rise from one to twenty.

\`\`\`ts
import { describe, expect, it } from 'vitest';

describe('AuthorDirectory query budget', () => {
  it.each([1, 20])(
    'loads books in one batch for %i authors',
    async (authorCount) => {
      const fixture = await seedAuthorsWithBooks(authorCount);
      const recordingBooks = new RecordingBookRepository(fixture.books);
      const context = createRequestContext({ books: recordingBooks });

      const result = await runAuthorQuery(executeOperation, context);

      expect(result.errors).toBeUndefined();
      expect((result.data as AuthorData).authors).toHaveLength(authorCount);

      expect(recordingBooks.calls).toEqual([
        {
          method: 'findByAuthorIds',
          authorIds: fixture.authorIds,
        },
      ]);
    },
  );
});
\`\`\`

An exact call trace is more informative than \`calls.length <= 2\`. It proves the batch method was used with all expected keys and exposes duplicates or missing IDs. If ordering is not part of the repository contract, compare sets or sort copies only at that assertion boundary. Do not mutate the recorded call.

Use deterministic fixture IDs. Random IDs make snapshots and traces hard to compare. The response assertion remains essential: an implementation could meet a one-query budget by returning no books. Performance constraints never replace correctness.

## Fix Fan-Out With Request-Scoped Batching

DataLoader is a common batching and memoization utility in JavaScript GraphQL servers. It collects loads scheduled in the same batching window and calls a batch function with multiple keys. The batch function must return one result for every input key in the same order. For one-to-many relationships, group rows by author ID and return an array for each author.

\`\`\`ts
import DataLoader from 'dataloader';

export function createBooksByAuthorLoader(repository: BookRepository) {
  return new DataLoader<string, Book[]>(async (authorIds) => {
    const books = await repository.findByAuthorIds(authorIds);
    const grouped = new Map<string, Book[]>();

    for (const authorId of authorIds) grouped.set(authorId, []);
    for (const book of books) grouped.get(book.authorId)?.push(book);

    return authorIds.map((authorId) => grouped.get(authorId) ?? []);
  });
}

export function createRequestContext(dependencies: Dependencies): Context {
  return {
    ...dependencies,
    loaders: {
      booksByAuthor: createBooksByAuthorLoader(dependencies.books),
    },
  };
}
\`\`\`

Create loaders once per request context. That scope permits batching across sibling resolver executions and caching within one operation while preventing data from one authenticated request leaking into another. If authorization changes results by tenant, user, locale, or permission set, include the relevant scope in the repository behavior and never share the cached loader across scopes.

The nested resolver becomes small:

\`\`\`ts
export const resolvers = {
  Query: {
    authors: (_parent: unknown, _args: unknown, context: Context) =>
      context.authors.findAll(),
  },
  Author: {
    books: (author: Author, _args: unknown, context: Context) =>
      context.loaders.booksByAuthor.load(author.id),
  },
};
\`\`\`

What people get wrong is adding DataLoader and assuming the problem is solved. If each resolver constructs its own loader, each has only one key and no batching occurs. If the batch function loops over keys and calls \`findByAuthorId\`, it merely moves N+1 into the loader. The regression test must count the actual repository or SQL boundary after the refactor.

## Test the Batch Function as a Contract

The batch function contains correctness rules that deserve direct tests. It must preserve key order, provide empty results for missing relationships, handle duplicate keys consistently with the loader's caching behavior, and keep one tenant's rows out of another tenant's result.

\`\`\`ts
it('maps unordered rows back to requested author order', async () => {
  const repository: BookRepository = {
    async findByAuthorIds() {
      return [
        { id: 'b-2', authorId: 'a-2', title: 'Second' },
        { id: 'b-1', authorId: 'a-1', title: 'First' },
      ];
    },
    async findByAuthorId() {
      throw new Error('single-key path must not be used');
    },
  };

  const loader = createBooksByAuthorLoader(repository);
  const [a1Books, missingBooks, a2Books] = await loader.loadMany([
    'a-1',
    'a-missing',
    'a-2',
  ]);

  expect(a1Books).toEqual([
    { id: 'b-1', authorId: 'a-1', title: 'First' },
  ]);
  expect(missingBooks).toEqual([]);
  expect(a2Books).toEqual([
    { id: 'b-2', authorId: 'a-2', title: 'Second' },
  ]);
});
\`\`\`

This test also makes a single-key fallback impossible. Add a repository call assertion if using a mock or recorder. When errors occur for individual keys, decide whether the GraphQL field should become null with a path-specific error or whether the whole operation should fail. That decision depends on field nullability in the schema and application policy.

Avoid snapshots for the only batch-function assertion. An explicit ordered expectation makes the key-to-result rule readable during review.

## Count SQL Statements in a Database Integration Test

Repository counters can pass even if the repository's batch method executes one statement per ID. Add one integration test at the database adapter level. Many SQL clients expose logging, hooks, events, or wrapper seams, but the API is library-specific. Use the documented mechanism for your chosen adapter rather than patching private methods.

A generic recorder interface keeps the test independent of log formatting:

\`\`\`ts
type SqlRecord = {
  text: string;
  parameterCount: number;
  operationId: string;
};

class SqlRecorder {
  private readonly records: SqlRecord[] = [];

  add(record: SqlRecord) {
    this.records.push(record);
  }

  forOperation(operationId: string) {
    return this.records.filter((record) => record.operationId === operationId);
  }
}

function normalizeSql(text: string): string {
  return text.replace(/\\s+/g, ' ').trim();
}
\`\`\`

Tag calls with a request or operation ID using the context facilities supported by the application. Filter out transaction setup, health checks, fixture insertion, and schema introspection before asserting the query budget. Otherwise an adapter upgrade that adds a session command could fail an unrelated N+1 test.

Prefer classifying statements by purpose over matching complete SQL text. Assert one author select and one batched book select, with an acceptable parameter count. Full SQL snapshots are brittle across quoting styles, aliases, and query planner hints. Still include normalized statements in the failure message because they make duplicate patterns obvious.

## Define Query Budgets Around Data-Access Intent

A budget is a maximum number or shape of downstream operations permitted for a specific GraphQL operation and fixture. It should be tight enough to catch fan-out but not so broad that regression tests tolerate ten extra calls. Express the budget in named categories.

| Operation | Fixture | Expected access pattern | Budget |
|---|---|---|---|
| AuthorDirectory | 20 authors | authors once, books once | 2 SQL reads |
| AuthorDetail | author with books and publisher | author, books, publishers | 3 SQL reads |
| SearchAuthors | no matches | search only | 1 SQL read |
| ViewerDashboard | cached preferences | viewer, panels, zero preference SQL | 2 SQL reads |

Do not impose one global number on every GraphQL request. A rich dashboard may legitimately require six bounded calls while a simple lookup should need one. Document the expected access pattern beside the test so a future engineer can judge whether a new call is intentional.

When a product change adds a field backed by another source, update the budget only after reviewing whether that source can batch, join, cache, or defer. A mechanical budget increase converts the test into an approval ritual. Require the pull request to explain the new operation and demonstrate that its count stays constant as parent cardinality grows.

## Cover Aliases, Fragments, and Duplicate Field Selection

Real GraphQL documents use fragments, aliases, and repeated fields. The execution engine may merge compatible selections, while resolvers and loaders may still see repeated key requests in patterns that differ from the simplest query. Add focused cases based on how clients actually query the schema.

\`\`\`graphql
query AuthorCards {
  authors {
    ...AuthorBooks
    featured: books {
      id
      title
    }
  }
}

fragment AuthorBooks on Author {
  books {
    id
  }
}
\`\`\`

Do not assert resolver internals unless the schema promises the behavior. The performance contract is that duplicate logical loads within one request do not cause duplicate expensive I/O. Execute the document and assert response aliases plus repository or SQL count.

Arguments matter. \`books(limit: 5)\` and \`books(limit: 20)\` are different loads. A loader key must include every input that changes the result, not only author ID. Encode a structured key or stable representation and test that identical arguments batch while different arguments remain distinct. Omitting an argument from the key creates a cache correctness bug that a pure query-count test may celebrate because it uses fewer calls.

## Protect Authorization While Batching

Batching expands the set of keys handled together, so authorization boundaries must remain explicit. If the repository accepts a tenant scope, pass it once with the batch. If authorization differs per parent, group only compatible keys or perform a set-based query that enforces row-level predicates.

| Unsafe shortcut | Failure | Safer design |
|---|---|---|
| process-wide loader | cross-request cached data | create loader per request |
| key contains only record ID | same ID collides across tenant scope | scope repository and key |
| fetch all, filter in resolver | unauthorized rows enter memory | enforce access in data query |
| cache errors indefinitely | transient denial reused | use request-bounded cache policy |

Write a two-request test with different authenticated contexts and overlapping identifiers. Execute request A, then request B, and verify B cannot receive A's cached row. This is both a security regression and a loader-scope regression.

Performance work must not bypass field-level authorization. A single fast query that fetches unauthorized records and filters most of them later is not an improvement. Count returned or scanned rows where practical, and inspect the query predicate in the database integration layer.

## Diagnose a Budget Failure With a Causal Trace

Suppose CI reports 52 SQL reads for the 50-author fixture. First verify the response is correct and isolate the statement categories. If 50 normalized statements differ only by \`author_id\`, the nested field is the likely fan-out point. Map that statement to the repository method, then to the resolver path using operation-scoped instrumentation.

Use this sequence:

1. Reproduce the exact document, variables, authentication scope, and fixture size.
2. Group normalized SQL or outbound calls by shape.
3. Compare counts for one, five, and fifty parents.
4. Record resolver paths for the repeated dependency call.
5. Check where the loader is instantiated and what its key contains.
6. Inspect whether the batch repository method loops internally.
7. Add the smallest failing regression test before changing code.

The classic hidden failure mode is an \`await\` that serializes loads before batching can collect them. Another is conditional loading where only some parents trigger the field. In that case, total calls may appear data-dependent rather than exactly N. The scaling test still reveals the slope. Record which parent keys caused each call.

Response-time assertions should come later. A fast local database can execute 50 queries within a generous time limit, and a busy CI worker can make two batched queries appear slow. Structural call evidence is stable enough for a pull-request gate.

## Add the Right Layers to CI

Run resolver and batch-function tests on every change because they are fast. Run database-backed query-budget tests for important operations in the integration job. Reserve broad load and latency testing for an environment with controlled data volume and observability.

\`\`\`yaml
name: graphql-regression-tests

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: test-password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: npm
      - run: npm ci
      - run: npm run test:graphql
\`\`\`

Adapt the database image and scripts to the versions committed by your project. The example illustrates service isolation and health checks, not a universal configuration. Seed only the records the operation needs, and clean them transactionally or with isolated schemas according to your test architecture.

If multiple independently deployed consumers rely on a GraphQL operation, query budgets do not replace interaction compatibility. The [Pact contract testing complete guide](/blog/contract-testing-pact-complete-guide) explains consumer-provider ownership and verification. Use compatibility checks for promised fields and examples, then retain N+1 detection as a provider performance-regression gate.

Before approving an AI-generated resolver refactor, ask the coding agent to show the call-count trace for small and large fixtures, the loader lifecycle, the batch key definition, and a cross-request authorization test. A plausible DataLoader snippet without those proofs is incomplete.

## Frequently Asked Questions

### How many parent records are enough to expose an N+1 query?

Use at least two cardinalities and make the larger one big enough that linear growth is unmistakable. One and twenty often work well for a fast integration fixture. The exact number matters less than the relationship: the expensive child-load count should remain constant after batching. Keep the fixture deterministic and small enough for rapid CI. For very deep trees, test each relationship independently before adding one representative full-operation budget.

### Should an N+1 test assert execution time?

Not as its primary signal. Local database speed, runner contention, connection warmup, and caches make timing noisy, while dozens of queries may still finish under a loose threshold. Assert repository, SQL, or outbound request counts and verify that they do not scale with parent count. Add latency measurements in a controlled performance environment for user-facing objectives. Structural call budgets and performance tests answer related but different questions, and both are useful when kept separate.

### Does DataLoader automatically remove every GraphQL N+1 problem?

No. The loader must be shared within one request, invoked during a compatible batching window, and backed by a true set-based operation. Creating it inside each resolver prevents batching. Implementing its batch function as a loop preserves N+1 below the abstraction. An incomplete cache key can also return incorrect data. Keep call-count regression tests at the real expensive boundary and direct unit tests for ordering, missing keys, arguments, and tenant scope.

### Can query budgets become too brittle for schema evolution?

They become brittle when expressed as unexplained global numbers or full SQL snapshots. Define a budget per important operation and fixture, classify expected calls by purpose, and document the access pattern. When a selected field adds a legitimate data source, review the design and update that operation's budget deliberately. Normalize diagnostic SQL but assert semantic categories where possible. The goal is to block accidental fan-out, not prevent the schema from gaining useful fields.
`,
};
