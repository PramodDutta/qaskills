import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Optimistic Concurrency Headers: ETag, If-Match, and Lost Updates',
  description:
    'API testing optimistic concurrency headers with ETag and If-Match: SuperTest cases, 412/428 paths, parallel races, and lost-update proofs that pass CI.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# API Testing Optimistic Concurrency Headers: ETag, If-Match, and Lost Updates

Optimistic concurrency is how many HTTP APIs avoid holding row locks across user think time. The client reads a resource, receives a version token (often an \`ETag\`), and sends that token back on write with \`If-Match\`. If another writer changed the resource first, the server rejects the stale write with \`412 Precondition Failed\` (or a close cousin). **API testing optimistic concurrency headers** means you prove that handshake end to end: tokens issued, tokens required, tokens rejected, and lost updates impossible under parallel clients.

This article is for QA and test-automation engineers who already write SuperTest or similar HTTP suites. You will leave with concrete cases for strong and weak validators, \`If-None-Match\` on reads, missing preconditions (\`428\` when you choose that profile), and a controlled race that fails the build if last-write-wins silently returns. We stay inside documented HTTP semantics (RFC 9110 precondition handling) and common API shapes, without inventing proprietary header names.

Wire these checks next to your broader HTTP suite. The [SuperTest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide) covers harness layout and auth helpers. When multiple services must agree on resource versions across boundaries, pair concurrency header tests with consumer-driven contracts from the [contract testing Pact complete guide](/blog/contract-testing-pact-complete-guide).

## The concurrency contract in plain terms

At minimum, a versioned resource API should behave like this:

1. \`GET /items/:id\` returns the body plus \`ETag: "v1"\` (quoted string; opaque to clients).
2. \`PUT /items/:id\` (or \`PATCH\`) without \`If-Match\` is either rejected (\`428 Precondition Required\` if you enforce preconditions) or accepted only if your documented policy allows blind writes (usually a mistake for shared editable resources).
3. \`PUT\` with \`If-Match: "v1"\` succeeds when the current version is still v1, returns a new \`ETag\`, and persists the body.
4. A second \`PUT\` still carrying \`"v1"\` after a successful first write fails with \`412\`.
5. \`If-None-Match: *\` on create-style \`PUT\` or \`GET\` follows your documented semantics for existence checks.

If any step is wrong, two users can overwrite each other without knowing, or clients can spin forever on false 412s.

## Header field reference for testers

| Header | Direction | Role in optimistic concurrency | Typical failure if ignored in tests |
| --- | --- | --- | --- |
| \`ETag\` | response | version token for resource representation | clients never learn version |
| \`If-Match\` | request | write only if server version is in the set | lost updates |
| \`If-None-Match\` | request | write/read only if version not matching | broken caching or create races |
| \`If-Unmodified-Since\` | request | time-based precondition (weaker cousin) | clock skew surprises |
| \`Last-Modified\` | response | time validator | coarse if updates share a second |

Prefer opaque ETags tied to a monotonic version column or content hash that changes on every logical write. Time-based validators are harder to test under parallel CI and can collide within the same second.

Strong vs weak ETags: a strong ETag (default quoted form without \`W/\` prefix) claims byte-for-byte equivalence of the representation. A weak ETag (\`W/"1"\`) claims semantic equivalence. Many JSON APIs use strong ETags over a canonical serialization or over a version number. Your tests must treat \`W/"1"\` and \`"1"\` as different tokens when the API emits weak validators.

## Minimal server semantics worth encoding in fixtures

Whether you own the API or mock it, document the rules the suite assumes:

- ETag changes on every successful mutating request, including no-op body replacements if the server still bumps version.
- ETag does **not** change on pure GET.
- \`If-Match: *\` means "any current representation exists" (useful for update-only).
- \`If-None-Match: *\` on PUT often means "create only if absent."
- DELETE may require \`If-Match\` for the same lost-delete reasons as PUT.

A tiny Express-style illustration (teaching fixture, not a production blueprint):

\`\`\`typescript
import express from "express";

type Item = { id: string; title: string; version: number };

const items = new Map<string, Item>();
items.set("a1", { id: "a1", title: "alpha", version: 1 });

export function buildApp() {
  const app = express();
  app.use(express.json());

  app.get("/items/:id", (req, res) => {
    const item = items.get(req.params.id);
    if (!item) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.setHeader("ETag", \`"\${item.version}"\`);
    res.json({ id: item.id, title: item.title });
  });

  app.put("/items/:id", (req, res) => {
    const item = items.get(req.params.id);
    if (!item) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const ifMatch = req.header("If-Match");
    if (!ifMatch) {
      res.status(428).json({ error: "precondition_required" });
      return;
    }

    const expected = \`"\${item.version}"\`;
    // RFC 9110 section 13.1.1: If-Match: * succeeds whenever a current
    // representation exists, so it must not be compared against the ETag.
    if (ifMatch !== "*" && ifMatch !== expected) {
      res.status(412).json({ error: "precondition_failed" });
      return;
    }

    item.title = String(req.body.title ?? item.title);
    item.version += 1;
    res.setHeader("ETag", \`"\${item.version}"\`);
    res.json({ id: item.id, title: item.title });
  });

  return app;
}
\`\`\`

## SuperTest baseline: issue, write, stale write

\`\`\`typescript
import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

describe("optimistic concurrency on /items/:id", () => {
  const app = buildApp();

  it("accepts If-Match for the current ETag and rejects the stale token", async () => {
    const get1 = await request(app).get("/items/a1").expect(200);
    const etag1 = get1.headers["etag"];
    expect(etag1).toMatch(/^"[0-9]+"$/);

    const putOk = await request(app)
      .put("/items/a1")
      .set("If-Match", etag1)
      .send({ title: "alpha-edited" })
      .expect(200);

    const etag2 = putOk.headers["etag"];
    expect(etag2).toBeDefined();
    expect(etag2).not.toEqual(etag1);
    expect(putOk.body.title).toBe("alpha-edited");

    await request(app)
      .put("/items/a1")
      .set("If-Match", etag1)
      .send({ title: "should-not-stick" })
      .expect(412);

    const get2 = await request(app).get("/items/a1").expect(200);
    expect(get2.body.title).toBe("alpha-edited");
    expect(get2.headers["etag"]).toEqual(etag2);
  });
});
\`\`\`

That single test already covers the happy path and the stale write. Expand with explicit cases for missing headers and wrong header shapes.

## Matrix of status codes your suite should pin

| Request shape | Expected status | Body / headers to assert |
| --- | --- | --- |
| GET existing | 200 | \`ETag\` present, stable across immediate re-GET |
| PUT with matching \`If-Match\` | 200 (or 204) | new \`ETag\`, body or Location per API |
| PUT with stale \`If-Match\` | 412 | resource unchanged on subsequent GET |
| PUT without \`If-Match\` (strict API) | 428 | no mutation |
| PUT with malformed ETag | 400 or 412 | documented; pick one and lock it |
| PUT \`If-Match: *\` when exists | 200 | version bumps |
| PUT \`If-None-Match: *\` when exists | 412 | create-if-absent denied |
| GET with \`If-None-Match\` current | 304 | empty body, ETag may repeat |

Lock the matrix in a table-driven test so product managers can read the expected policy without reverse-engineering specs.

\`\`\`typescript
type Case = {
  name: string;
  setup?: () => Promise<string | undefined>;
  method: "put";
  path: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  status: number;
};

const policyCases: Case[] = [
  {
    name: "missing If-Match is 428",
    method: "put",
    path: "/items/a1",
    headers: {},
    body: { title: "x" },
    status: 428,
  },
  {
    name: "wildcard If-Match updates existing",
    method: "put",
    path: "/items/a1",
    headers: { "If-Match": "*" },
    body: { title: "starred" },
    status: 200,
  },
];

describe("concurrency policy matrix", () => {
  const app = buildApp();

  for (const c of policyCases) {
    it(c.name, async () => {
      const res = await request(app)
        [c.method](c.path)
        .set(c.headers)
        .send(c.body);
      expect(res.status).toBe(c.status);
    });
  }
});
\`\`\`

## Conditional GET: cache validators are part of the same story

Clients and CDNs use \`If-None-Match\` on GET. If your API emits ETags for concurrency, those same tags usually drive 304 responses. Broken 304 behavior is a performance bug; broken ETag rotation after writes is a concurrency bug. Test both.

\`\`\`typescript
it("returns 304 when If-None-Match matches current ETag", async () => {
  const app = buildApp();
  const first = await request(app).get("/items/a1").expect(200);
  const etag = first.headers["etag"];

  const second = await request(app)
    .get("/items/a1")
    .set("If-None-Match", etag)
    .expect(304);

  expect(second.text === "" || second.body == null || Object.keys(second.body).length === 0).toBe(
    true,
  );
});

it("returns 200 after a successful write changes the ETag", async () => {
  const app = buildApp();
  const first = await request(app).get("/items/a1").expect(200);
  const etag = first.headers["etag"];

  await request(app)
    .put("/items/a1")
    .set("If-Match", etag)
    .send({ title: "new" })
    .expect(200);

  await request(app)
    .get("/items/a1")
    .set("If-None-Match", etag)
    .expect(200);
});
\`\`\`

## Parallel clients: the race you must force

Sequential tests cannot prove mutual exclusion of versions. Spawn two writers that both read version N and both attempt to write. Exactly one should succeed; the other should see 412; the stored title should match the winner.

\`\`\`typescript
it("allows only one of two concurrent stale-based writes to commit", async () => {
  const app = buildApp();
  const get = await request(app).get("/items/a1").expect(200);
  const etag = get.headers["etag"] as string;

  const [r1, r2] = await Promise.all([
    request(app)
      .put("/items/a1")
      .set("If-Match", etag)
      .send({ title: "writer-1" }),
    request(app)
      .put("/items/a1")
      .set("If-Match", etag)
      .send({ title: "writer-2" }),
  ]);

  const statuses = [r1.status, r2.status].sort();
  expect(statuses).toEqual([200, 412]);

  const winner =
    r1.status === 200 ? r1.body.title : r2.body.title;
  const final = await request(app).get("/items/a1").expect(200);
  expect(final.body.title).toBe(winner);
  expect(final.headers["etag"]).not.toEqual(etag);
});
\`\`\`

Flake note: if the server is a remote shared environment with heavy middleware, \`Promise.all\` may still serialize enough that both "should" not collide. Prefer an in-process app or a test double that delays the version check until both requests pass the read barrier. For real multi-node APIs, run this case in integration against a single row with application-level version column uniqueness (for example, optimistic lock column updated with \`WHERE version = $expected\`).

## Database-backed APIs: the header is only half the gate

HTTP preconditions that do not map to atomic storage checks are theater. The durable pattern is:

1. Read row with version (or compute ETag from version).
2. Update \`... WHERE id = $id AND version = $expected\`; check affected row count.
3. On zero rows, return 412 (or re-read and return 409 if you use that code).
4. On success, increment version and return new ETag.

SQL sketch:

\`\`\`sql
UPDATE items
SET title = $1,
    version = version + 1
WHERE id = $2
  AND version = $3
RETURNING id, title, version;
\`\`\`

API tests should still be HTTP-level. Add one repository test that two concurrent updates with the same expected version cannot both return a row. That closes the gap between "middleware checked If-Match once" and "another node wrote between check and update."

## What people get wrong

**Weak equality on ETags.** Comparing with loose parsers that strip quotes inconsistently (\`"1"\` vs \`1\` vs \`W/"1"\`) produces intermittent 412s. Normalize using the server's rules; in tests, always copy the header value **verbatim** from the previous response. Never rebuild the ETag in the client test from the body unless you are testing a documented hash algorithm.

**Using 409 for every conflict.** Many APIs return \`409 Conflict\` for business rules and \`412\` for failed preconditions. Mixing them confuses clients and caches. Your suite should treat 412 as the optimistic concurrency signal unless the public docs explicitly standardize on 409 for version mismatches. If docs say 409, lock 409 and do not "fix" tests to 412 for purity.

**ETag on collections.** Listing endpoints sometimes emit a single ETag for the whole page. Writers then send that token while updating one child. Define whether collection ETags are for cache only. Concurrency tokens should usually be **per resource**. Tests that PUT an item with a collection ETag should fail clearly.

**PATCH with partial bodies and silent version skips.** If PATCH applies no field changes, some implementations skip a version bump. Then two clients can believe they serialized writes that were no-ops. Decide: always bump on successful PATCH, or return 204 without bump only when no field changed **and** document it. Tests must cover no-op PATCH explicitly.

## Auth, multi-tenancy, and leaked validators

ETags should not become cross-tenant oracles. A tester with access to item A should not infer item B's version space if versions are global counters that leak through error timing. Prefer per-resource versions. Add a negative test: user in tenant T1 cannot GET or PUT tenant T2's id, with or without a guessed \`If-Match\`.

\`\`\`typescript
it("does not reveal another tenant resource via precondition errors", async () => {
  const app = buildApp(); // swap for tenant-aware fixture in real suites
  const res = await request(app)
    .put("/items/not-yours")
    .set("Authorization", "Bearer tenant-t1")
    .set("If-Match", '"1"')
    .send({ title: "nope" });

  // Prefer 404 over 412 for unknown / unauthorized ids to avoid existence leaks.
  expect([401, 403, 404]).toContain(res.status);
});
\`\`\`

## Contract testing the headers

Provider states in Pact (or similar) should include versioned resources. Consumer tests need example responses with \`ETag\` and interactions that send \`If-Match\`. That stops frontend teams from dropping preconditions when generating clients.

Illustrative interaction shape (Pact-like structure; align field names with your Pact major version):

\`\`\`typescript
// Consumer side: document that updates require If-Match
const interaction = {
  state: "item a1 exists at version 3",
  uponReceiving: "a PUT with matching If-Match",
  withRequest: {
    method: "PUT",
    path: "/items/a1",
    headers: {
      "If-Match": '"3"',
      "Content-Type": "application/json",
    },
    body: { title: "from-consumer" },
  },
  willRespondWith: {
    status: 200,
    headers: {
      ETag: '"4"',
      "Content-Type": "application/json",
    },
    body: { id: "a1", title: "from-consumer" },
  },
};
\`\`\`

Provider verification must seed version 3 for that state. Without state setup, contracts flap. Keep concurrency interactions as first-class provider states, not afterthoughts, and version those states alongside the rest of your consumer-driven contract suite.

## Idempotency keys vs optimistic concurrency

Teams often confuse \`Idempotency-Key\` (replay of the same request) with \`If-Match\` (version of the resource). They solve different races:

| Mechanism | Protects against | Does not protect against |
| --- | --- | --- |
| \`If-Match\` / version | two different writes based on same read | double submit of identical retry with new intent |
| \`Idempotency-Key\` | retries of the same client operation | two users editing different fields |
| DB unique constraint | duplicate rows | silent field overwrite on same row |
| \`SELECT FOR UPDATE\` | concurrent writers in one txn | long-lived offline clients |

Test them separately. An idempotent retry with the same key after a 200 should return the first result (or 409 per policy) even if \`If-Match\` would now be stale relative to a later writer. Write one suite for keys, one for ETags.

## Realistic failure mode: reverse proxies that strip or rewrite ETags

**Symptom:** Local SuperTest suite against the Node process is green. Staging behind a CDN shows intermittent 412 after clients receive \`ETag\` values that do not match origin, or GETs never 304.

**Diagnosis:**

1. Compare raw headers from origin (\`curl -i\` to the pod) vs through the edge.
2. Look for weak ETag conversion, gzip-related representation changes (content negotiation producing different bodies under the same token), or middleware that injects tracking fields into JSON after ETag computation.
3. Confirm \`Vary\` is correct when \`Accept-Encoding\` changes the bytes.
4. Check whether the edge caches PUT responses incorrectly (rare but catastrophic).

**Fix pattern:** compute ETag on the final bytes of the representation you actually send; include encoding in cache keys; add an integration test that hits the same path the client hits (staging gateway), not only the in-process app. If gzip changes bytes, either ETag the uncompressed canonical JSON and negotiate carefully, or vary tokens per encoding per your HTTP stack's rules.

## Client libraries and generated SDKs

Generated clients often omit custom headers unless OpenAPI lists parameters. Your API description should declare \`If-Match\` as required on mutating paths and \`ETag\` as a response header. Add a lint gate (Spectral or similar) that fails if PUT/PATCH on versioned resources lack the parameter. Then SuperTest remains the behavior proof while OpenAPI stays the discoverability proof.

OpenAPI fragment (illustrative):

\`\`\`yaml
paths:
  /items/{id}:
    put:
      parameters:
        - in: header
          name: If-Match
          required: true
          schema:
            type: string
      responses:
        "200":
          headers:
            ETag:
              schema:
                type: string
          description: Update applied
        "412":
          description: Stale version token
        "428":
          description: Missing If-Match
\`\`\`

## Soft deletes, restores, and version continuity

If DELETE sets \`deleted_at\` instead of removing the row, define whether version continues and whether GET returns 404 without ETag. Restores that reset version to 1 can revive stale clients that still hold old tokens. Prefer monotonic versions across delete/restore. Tests:

1. GET -> ETag \`"5"\` -> DELETE with \`If-Match: "5"\` -> 204.
2. GET -> 404.
3. POST restore -> ETag \`"6"\` (not \`"1"\`).
4. Stale PUT with \`"5"\` still 412.

## Load-adjacent checks without turning API tests into k6

You do not need a full performance suite to catch lost updates. A short Node script with 20 workers and one resource is enough as a nightly job. Keep assertions logical (counts of 200 vs 412 sum to attempts; final version equals 1 + number of 200s from a known start).

\`\`\`typescript
async function hammer(baseUrl: string, itemId: string, workers: number) {
  const first = await fetch(\`\${baseUrl}/items/\${itemId}\`);
  let etag = first.headers.get("etag");
  if (!etag) throw new Error("missing etag");

  let success = 0;
  let precondition = 0;

  await Promise.all(
    Array.from({ length: workers }, async (_, i) => {
      // Each worker re-reads then writes; counts validate serialization.
      const read = await fetch(\`\${baseUrl}/items/\${itemId}\`);
      const token = read.headers.get("etag");
      if (!token) throw new Error("missing etag on read");

      const write = await fetch(\`\${baseUrl}/items/\${itemId}\`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "If-Match": token,
        },
        body: JSON.stringify({ title: \`w-\${i}\` }),
      });

      if (write.status === 200) success += 1;
      else if (write.status === 412) precondition += 1;
      else throw new Error(\`unexpected status \${write.status}\`);
    }),
  );

  return { success, precondition };
}
\`\`\`

Note: the shared counters above need atomic updates in a real worker (Atomics or aggregate after await). The snippet prioritizes clarity of the HTTP pattern; productionize counters before CI.

## CI placement and flake control

| Suite | Environment | Frequency | Goal |
| --- | --- | --- | --- |
| Header unit matrix | in-process app | every PR | status codes + verbatim ETag reuse |
| Parallel dual-write | in-process or single-node docker | every PR | one winner |
| Gateway ETag integrity | staging URL | nightly | proxy does not corrupt validators |
| Multi-worker hammer | staging | nightly | version arithmetic |

Use Vitest name pattern when iterating: \`vitest run -t "stale token"\`. Keep concurrency tests away from shared mutable fixtures that other files also edit; use unique item ids per test file.

## Agent-assisted development note

When AI coding agents add new mutable endpoints, they often copy a controller without \`If-Match\`. A checklist skill or CI lint that greps OpenAPI for PUT/PATCH without \`If-Match\` catches that early. Ready-made QA skills install from qaskills.sh with the qaskills CLI if you want a reusable review checklist in-repo.

## End-to-end acceptance language for tickets

Replace "support optimistic locking" with testable acceptance:

- Given resource R at ETag T, when two clients PUT with T, then exactly one receives success and the other receives 412.
- Given a successful PUT, when the client GETs with \`If-None-Match\` equal to the previous T, then the response is 200 with a new body and new ETag.
- Given a client omits \`If-Match\` on PUT, then the API returns 428 and does not mutate.

Those lines map 1:1 to automated cases.

## Frequently Asked Questions

### Is If-Match required for every API write?

No. Blind writes are acceptable for purely additive endpoints, metrics ingest, or resources with single-writer guarantees. Shared editable resources (documents, profiles, configs, carts) should require preconditions or an equivalent version field in the JSON body. If you use a body field instead of headers, test it with the same stale/parallel cases; the HTTP-header form is preferred when intermediaries understand RFC preconditions.

### Should API testing optimistic concurrency headers include Last-Modified?

Include time-based validators only if the API documents them as authoritative. They are sensitive to clock resolution and formatting. Prefer ETag-centric suites as the primary gate, and add \`If-Unmodified-Since\` cases only when clients in the wild send them. Never assume sub-second uniqueness of \`Last-Modified\` under load.

### Why did we get 412 after our own write with the ETag we just received?

Common causes: writing through a proxy that returns a cached ETag from a previous representation; computing ETag on a different field set than the response body; concurrent writes from another tab; or normalizing quotes incorrectly when replaying the header. Log both the sent \`If-Match\` and the server current token on 412 in non-production to diagnose. Tests should always assign \`const etag = res.headers["etag"]\` and pass that string through unchanged.

### How do concurrency header tests relate to Pact contract tests?

Contract tests document that consumers send \`If-Match\` and understand 412 responses. They do not prove two parallel writers serialize correctly. Keep SuperTest (or equivalent) race tests for provider behavior, and Pact states for consumer compatibility. Together they prevent SDKs from dropping headers and backends from dropping atomic version checks.
`,
};
