import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Elasticsearch Node.js — Complete Guide 2026',
  description:
    'Master Testcontainers for Elasticsearch in Node.js. Real search and indexing tests with Docker, mappings, analyzers, and CI/CD patterns.',
  date: '2026-05-03',
  category: 'Guide',
  content: `
# Testcontainers Elasticsearch Node.js Complete Guide

Elasticsearch and OpenSearch power full-text search, log aggregation, observability, vector search, and analytics across millions of applications. Testing Elasticsearch-dependent code is notoriously hard because the analyzer pipeline, scoring, and aggregation behavior depend on a real cluster — no in-memory mock can faithfully reproduce them. Teams have historically stood up shared dev clusters, accepted flaky tests, or skipped integration testing entirely. Testcontainers solves this by giving every test suite a fresh, real Elasticsearch container with one line of code.

This guide is a hands-on walkthrough of Testcontainers with Elasticsearch in Node.js for 2026. We cover the official Elasticsearch and OpenSearch modules, index mapping setup, analyzer testing, bulk indexing, search query validation, aggregation pipelines, container reuse for fast local iteration, and CI/CD configuration. Every code sample is working TypeScript with Vitest and the official @elastic/elasticsearch client.

---

## Key Takeaways

- **ElasticsearchContainer** provides one-line setup for real Elasticsearch 7.x or 8.x
- **OpenSearchContainer** is the drop-in equivalent for OpenSearch projects
- **Security is disabled by default** in the container to simplify test setup
- **Analyzer behavior** can only be tested faithfully against a real cluster
- **Bulk indexing** is essential for performant test setup
- **Container reuse** drops local startup from 30+ seconds to under 5 seconds

---

## Why Use Testcontainers for Elasticsearch

The standard alternatives are all flawed. In-memory mocks like elasticmock-js implement a small subset of the query DSL and are routinely outdated. Shared dev clusters bleed state, do not parallelize, and accumulate indices over time. Docker-compose works but couples test execution to environment setup.

Testcontainers gives you a fresh, real Elasticsearch cluster per test suite, with automatic cleanup and one-line configuration.

---

## Installation

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/elasticsearch
npm install --save-dev vitest @elastic/elasticsearch
\`\`\`

Or for OpenSearch:

\`\`\`bash
npm install --save-dev @testcontainers/opensearch @opensearch-project/opensearch
\`\`\`

Verify Docker. Elasticsearch is a heavy container — make sure your Docker is configured to allow at least 4 GB of RAM (\`docker info\` shows the limit).

Vitest config with longer timeouts:

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
  },
});
\`\`\`

---

## Your First Test

\`\`\`typescript
import { ElasticsearchContainer, StartedElasticsearchContainer } from '@testcontainers/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

describe('Elasticsearch integration', () => {
  let container: StartedElasticsearchContainer;
  let client: Client;

  beforeAll(async () => {
    container = await new ElasticsearchContainer('elasticsearch:8.13.0').start();
    client = new Client({ node: container.getHttpUrl() });
  });

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  it('indexes and searches a document', async () => {
    await client.index({
      index: 'articles',
      id: '1',
      document: { title: 'Hello Elasticsearch', tags: ['intro'] },
      refresh: 'wait_for',
    });
    const result = await client.search({
      index: 'articles',
      query: { match: { title: 'hello' } },
    });
    expect(result.hits.total).toEqual({ value: 1, relation: 'eq' });
  });
});
\`\`\`

Note \`refresh: 'wait_for'\` — Elasticsearch normally refreshes indices every second. In tests, we need synchronous visibility, so we wait for the refresh to complete.

---

## ElasticsearchContainer API Reference

| Method | Purpose |
|---|---|
| \`new ElasticsearchContainer(image)\` | Constructor; image like \`elasticsearch:8.13.0\` |
| \`.withReuse()\` | Reuse container across runs |
| \`.withExposedPorts(...)\` | Override exposed ports |
| \`.withEnvironment(env)\` | Set env vars |
| \`.withCommand(cmd)\` | Override CMD |
| \`.start()\` | Boot container |

After start:

| Method | Returns |
|---|---|
| \`getHost()\` | Hostname |
| \`getMappedPort(9200)\` | HTTP port |
| \`getHttpUrl()\` | http://host:port |

---

## Setting Up Mappings

Always define mappings explicitly. Dynamic mapping is convenient in dev but causes test flakiness because Elasticsearch guesses types based on first-seen values:

\`\`\`typescript
beforeAll(async () => {
  await client.indices.create({
    index: 'products',
    mappings: {
      properties: {
        name: { type: 'text', analyzer: 'standard' },
        price: { type: 'float' },
        category: { type: 'keyword' },
        in_stock: { type: 'boolean' },
        created_at: { type: 'date' },
      },
    },
  });
});
\`\`\`

---

## Testing Analyzers

Custom analyzers are notoriously fragile. Testcontainers lets you validate them against the real engine:

\`\`\`typescript
beforeAll(async () => {
  await client.indices.create({
    index: 'docs',
    settings: {
      analysis: {
        analyzer: {
          autocomplete: {
            tokenizer: 'autocomplete_tokenizer',
            filter: ['lowercase'],
          },
        },
        tokenizer: {
          autocomplete_tokenizer: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 10,
          },
        },
      },
    },
    mappings: {
      properties: {
        title: { type: 'text', analyzer: 'autocomplete' },
      },
    },
  });
});

it('tokenizes for autocomplete', async () => {
  const tokens = await client.indices.analyze({
    index: 'docs',
    analyzer: 'autocomplete',
    text: 'HelloWorld',
  });
  expect(tokens.tokens?.map(t => t.token)).toContain('he');
  expect(tokens.tokens?.map(t => t.token)).toContain('hello');
});
\`\`\`

---

## Bulk Indexing for Test Setup

Indexing one document at a time is slow. Use bulk for test fixtures:

\`\`\`typescript
async function seed(client: Client, docs: Array<{ id: string; doc: any }>) {
  const operations = docs.flatMap(({ id, doc }) => [
    { index: { _index: 'products', _id: id } },
    doc,
  ]);
  await client.bulk({ operations, refresh: 'wait_for' });
}

beforeEach(async () => {
  await seed(client, [
    { id: '1', doc: { name: 'Red Shirt', price: 20.0, category: 'apparel' } },
    { id: '2', doc: { name: 'Blue Shirt', price: 22.0, category: 'apparel' } },
    { id: '3', doc: { name: 'Hat', price: 15.0, category: 'accessories' } },
  ]);
});
\`\`\`

Bulk operations are 100x faster than one-at-a-time indexing for test seeding.

---

## Per-Test Isolation

Three approaches:

| Pattern | Speed | Use Case |
|---|---|---|
| Delete and recreate index per test | Slow | Schema mutations |
| Delete-by-query | Medium | Standard CRUD tests |
| Unique index name per test | Fast | Read-heavy tests |

Delete-by-query example:

\`\`\`typescript
afterEach(async () => {
  await client.deleteByQuery({
    index: 'products',
    query: { match_all: {} },
    refresh: true,
  });
});
\`\`\`

Unique index name per test:

\`\`\`typescript
let indexName: string;
beforeEach(() => {
  indexName = \`test_\${Date.now()}_\${Math.random().toString(36).slice(2)}\`;
});
afterEach(async () => {
  await client.indices.delete({ index: indexName });
});
\`\`\`

---

## Testing Aggregations

Aggregations are where mocks really fall down:

\`\`\`typescript
it('aggregates by category', async () => {
  const result = await client.search({
    index: 'products',
    size: 0,
    aggs: {
      categories: {
        terms: { field: 'category' },
        aggs: {
          avg_price: { avg: { field: 'price' } },
        },
      },
    },
  });
  const buckets = (result.aggregations?.categories as any).buckets;
  expect(buckets.length).toBe(2);
});
\`\`\`

---

## Testing Vector Search (8.x+)

Elasticsearch 8.x added dense vector indexing for semantic search:

\`\`\`typescript
beforeAll(async () => {
  await client.indices.create({
    index: 'embeddings',
    mappings: {
      properties: {
        text: { type: 'text' },
        vector: { type: 'dense_vector', dims: 384, index: true, similarity: 'cosine' },
      },
    },
  });
});

it('runs kNN search', async () => {
  await client.index({
    index: 'embeddings',
    document: { text: 'hello', vector: new Array(384).fill(0.1) },
    refresh: 'wait_for',
  });
  const result = await client.search({
    index: 'embeddings',
    knn: {
      field: 'vector',
      query_vector: new Array(384).fill(0.1),
      k: 5,
      num_candidates: 10,
    },
  });
  expect(result.hits.hits.length).toBeGreaterThan(0);
});
\`\`\`

---

## OpenSearch Equivalent

The OpenSearch container is API-compatible:

\`\`\`typescript
import { OpenSearchContainer } from '@testcontainers/opensearch';
import { Client } from '@opensearch-project/opensearch';

container = await new OpenSearchContainer('opensearchproject/opensearch:2.13.0').start();
const client = new Client({ node: container.getHttpUrl() });
\`\`\`

OpenSearch is mostly drop-in for Elasticsearch 7.10, but newer Elastic features (vector search syntax, ESQL) are not available.

---

## Container Reuse

\`\`\`typescript
container = await new ElasticsearchContainer('elasticsearch:8.13.0')
  .withReuse()
  .start();
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

First run takes 30 seconds (image pull + cluster startup). Subsequent runs reconnect in 1-2 seconds.

---

## CI/CD Configuration

\`\`\`yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest-large # Need more RAM for Elasticsearch
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
\`\`\`

Use a larger runner if your standard runners run out of memory. ubuntu-latest provides 7 GB which is enough for one ES container at a time.

---

## Common Pitfalls

**Refresh interval.** Index operations are not visible to search until the next refresh (every 1 second by default). Always use \`refresh: 'wait_for'\` in tests.

**Heap size.** Elasticsearch defaults to 1 GB heap. If your tests insert many docs, you may hit limits. Override with \`-e ES_JAVA_OPTS='-Xms512m -Xmx2g'\`.

**Security in 8.x.** Elasticsearch 8.x enables security by default. The ElasticsearchContainer disables it for tests; if you switch to GenericContainer, add \`-e xpack.security.enabled=false\`.

**Index creation race.** If your code creates an index and immediately indexes a doc, the doc may fail. Wait for green cluster status or use \`refresh: 'wait_for'\`.

---

## Conclusion

Testcontainers brings real Elasticsearch into Node.js test suites with one line of setup. Custom analyzers, aggregations, vector search, and bulk indexing all behave exactly like production. With container reuse, local iteration stays fast, and CI requires only a larger runner for memory headroom.

Browse the [QA skills directory](/skills) for related search and indexing patterns, or read our [Testcontainers Best Practices 2026](/blog/testcontainers-best-practices-2026) for architectural guidance.
`,
};
