import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing IDOR Enumeration Guide for API and Agent Workflows',
  description: 'Follow this security testing IDOR enumeration guide to find insecure direct object references with safe fixtures, authz matrices, and automatable proof cases.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Security Testing IDOR Enumeration Guide for API and Agent Workflows

This security testing IDOR enumeration guide shows how to find insecure direct object references by systematically varying object identifiers across users, roles, and tenants while holding authentication constant enough to prove authorization failure. The practical workflow is: seed two or more principals with disjoint object ownership, collect candidate object IDs from legitimate responses, replay the same requests as the wrong principal, and assert denials that do not leak existence details the product intends to hide. Enumeration is the disciplined expansion of that idea across ID spaces, endpoints, and methods.

IDOR remains common because feature teams ship CRUD endpoints quickly, share "get by id" helpers, and test only the happy path for the owning user. Automated scanners help, but they thrash production-like environments when ID spaces are large or sequential. QA and security engineering get better results from fixture-driven authorization matrices, targeted enumeration windows, and regression tests that lock every object-level rule next to the handler.

AI coding agents change the risk surface in two ways. They generate more endpoints with similar patterns, which can copy a vulnerable helper widely, and they can be instructed to "try nearby ids" during exploratory work if guardrails are weak. Pair authorization tests with identity material hygiene such as [testing JWT key rotation and JWKS cache behavior](/blog/testing-jwt-key-rotation-jwks-cache), and with broader process guidance in the [AI-augmented software testing 2026 guide](/blog/ai-augmented-software-testing-2026-guide).

## Restate IDOR as an authorization oracle problem

Insecure direct object reference is an authorization defect: the server accepts a reference (numeric id, UUID, filename, slug, job id) and returns or mutates the object without proving the caller may access it. Enumeration is the search strategy for those references.

Your test oracle must answer:

1. Does principal A access A's object? (positive control)
2. Does principal A access B's object? (negative control)
3. Does the denial match product policy for existence leakage?
4. Do list endpoints only return authorized objects?
5. Do write methods enforce the same rules as reads?

| Oracle question | Pass example | Fail example |
|---|---|---|
| Cross-user read | A gets 404/403 for B's invoice | A gets 200 with B's invoice body |
| Cross-user write | A cannot rename B's project | A renames B's project |
| Cross-tenant read | Tenant1 token never reads Tenant2 rows | Shared sequence ids return other tenant data |
| List isolation | A's list excludes B's objects | Pagination eventually shows B's objects |
| Create-confuse | A cannot attach B's object id to A's parent | Nested write accepts foreign child ids |

If you only test unauthenticated access, you will miss the majority of IDORs that require a valid login.

## Build safe fixtures before touching enumeration

Never begin with production data or production tokens. Create a disposable environment with explicit ownership graphs.

Minimum fixture set:

- User A and User B in the same tenant (peer IDOR)
- User C in another tenant (tenant IDOR)
- Optional privileged role R with documented break-glass access
- Objects of each sensitive type owned by A, B, and C
- Nested objects (comment on ticket, item in order) with mixed ownership edge cases
- Soft-deleted objects if the product supports deletion states

\`\`\`ts
type Principal = {
  id: string;
  token: string;
  tenantId: string;
};

type SeedObject = {
  type: 'invoice' | 'project' | 'report';
  id: string;
  ownerId: string;
  tenantId: string;
};

export async function seedIdorFixtures(api: {
  createUser(input: { email: string; tenantId: string }): Promise<Principal>;
  createInvoice(input: { ownerToken: string; label: string }): Promise<SeedObject>;
}): Promise<{ users: Record<string, Principal>; invoices: Record<string, SeedObject> }> {
  const tenant1 = 'tenant-t1';
  const tenant2 = 'tenant-t2';
  const userA = await api.createUser({ email: 'a@example.test', tenantId: tenant1 });
  const userB = await api.createUser({ email: 'b@example.test', tenantId: tenant1 });
  const userC = await api.createUser({ email: 'c@example.test', tenantId: tenant2 });

  const invA = await api.createInvoice({ ownerToken: userA.token, label: 'A-1' });
  const invB = await api.createInvoice({ ownerToken: userB.token, label: 'B-1' });
  const invC = await api.createInvoice({ ownerToken: userC.token, label: 'C-1' });

  return {
    users: { A: userA, B: userB, C: userC },
    invoices: { A: invA, B: invB, C: invC },
  };
}
\`\`\`

Document whether ids are sequential integers, UUIDs, or opaque tokens. Sequential ids make accidental discovery easy and make bounded enumeration tests more realistic as attack simulations. UUIDs reduce casual guessing but do not fix missing authorization checks.

## Collect candidate references from legitimate channels

Enumeration that invents random ids is noisy. Prefer candidates harvested from authorized responses:

- List endpoints
- Create responses
- Search results
- Webhook payloads in test harnesses
- Export jobs
- Agent tool outputs that echo object ids

\`\`\`ts
async function harvestInvoiceIds(token: string, baseUrl: string): Promise<string[]> {
  const res = await fetch(\`\${baseUrl}/api/invoices?limit=50\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  });
  if (!res.ok) {
    throw new Error(\`list failed: \${res.status}\`);
  }
  const body = (await res.json()) as { items: Array<{ id: string }> };
  return body.items.map((item) => item.id);
}
\`\`\`

Store harvested ids with their owner principal. The cross-access matrix becomes a cartesian product of principals and foreign ids, not an infinite scan of the integer space.

## Run the cross-principal matrix on each sensitive operation

For every object type and method (GET, PATCH, DELETE, download, share), execute:

- Owner positive control
- Peer negative control
- Cross-tenant negative control
- Optional privileged control

\`\`\`ts
import { describe, expect, it } from 'vitest';

type ApiResult = { status: number; bodyText: string };

async function getInvoice(
  baseUrl: string,
  token: string,
  invoiceId: string,
): Promise<ApiResult> {
  const res = await fetch(\`\${baseUrl}/api/invoices/\${invoiceId}\`, {
    headers: { Authorization: \`Bearer \${token}\` },
  });
  return { status: res.status, bodyText: await res.text() };
}

describe('invoice IDOR matrix', () => {
  it('denies peer read of foreign invoice', async () => {
    const baseUrl = process.env.BASE_URL!;
    const fixtures = await loadFixtures(); // seeded earlier in test global setup
    const foreignId = fixtures.invoices.B.id;
    const asA = await getInvoice(baseUrl, fixtures.users.A.token, foreignId);

    expect([401, 403, 404]).toContain(asA.status);
    expect(asA.bodyText).not.toMatch(/B-1/);
    expect(asA.bodyText.toLowerCase()).not.toContain('amount');
  });

  it('allows owner read', async () => {
    const baseUrl = process.env.BASE_URL!;
    const fixtures = await loadFixtures();
    const asB = await getInvoice(
      baseUrl,
      fixtures.users.B.token,
      fixtures.invoices.B.id,
    );
    expect(asB.status).toBe(200);
    expect(asB.bodyText).toContain('B-1');
  });
});
\`\`\`

Keep expected denial statuses aligned with product policy. Some teams prefer 404 for foreign objects to reduce existence leakage; others use 403. What matters for security is consistent enforcement plus no body leakage. Your tests should enforce the chosen policy explicitly.

## Bound enumeration so tests stay ethical and stable

Unbounded id scanning is a bad default in shared environments. Use bounded strategies:

| Strategy | How it works | Good for | Risk if misused |
|---|---|---|---|
| Fixture foreign ids | Only known B/C ids | Regression CI | Misses hidden objects not in fixtures |
| Neighbor window | Try id-1..id+N for sequential ids | Attack simulation | Noise if N large |
| Harvest-only | Only ids seen in legitimate flows | Least privilege testing | Misses direct-object endpoints without lists |
| Canary objects | Plant objects with unique markers | Detecting leakage quickly | Requires cleanup |
| Shadow tenant crawl | Limited crawl as tenant admin vs user | Multi-tenant apps | Dangerous in prod |

\`\`\`ts
function neighborIds(numericId: number, radius: number): number[] {
  const out: number[] = [];
  for (let delta = -radius; delta <= radius; delta += 1) {
    if (delta === 0) continue;
    const candidate = numericId + delta;
    if (candidate > 0) out.push(candidate);
  }
  return out;
}

async function boundedNeighborProbe(args: {
  baseUrl: string;
  token: string;
  centerId: number;
  radius: number;
}): Promise<Array<{ id: number; status: number }>> {
  const results = [];
  for (const id of neighborIds(args.centerId, args.radius)) {
    const res = await fetch(\`\${args.baseUrl}/api/invoices/\${id}\`, {
      headers: { Authorization: \`Bearer \${args.token}\` },
    });
    results.push({ id, status: res.status });
    // Always bound concurrency and rate in real runners.
  }
  return results;
}
\`\`\`

In CI, prefer fixture foreign ids. Reserve neighbor windows for scheduled security labs with explicit allowlists.

## Cover method confusion and nested references

IDOR is not only GET by id. High-yield cases include:

- PATCH/DELETE on foreign ids
- Bulk endpoints that accept arrays of ids
- "Add existing child" nested routes
- File download paths that use storage keys
- Export and preview links
- Admin endpoints called with non-admin tokens
- GraphQL node interfaces that resolve global ids
- Agent tools that accept raw object ids from chat

\`\`\`ts
async function attachComment(args: {
  baseUrl: string;
  token: string;
  projectId: string;
  body: string;
}): Promise<ApiResult> {
  const res = await fetch(
    \`\${args.baseUrl}/api/projects/\${args.projectId}/comments\`,
    {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${args.token}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: args.body }),
    },
  );
  return { status: res.status, bodyText: await res.text() };
}

async function proveNestedWriteIsolation(baseUrl: string, fixtures: Awaited<ReturnType<typeof seedIdorFixtures>>) {
  // Attempt to comment on B's project using A's token.
  const result = await attachComment({
    baseUrl,
    token: fixtures.users.A.token,
    projectId: fixtures.invoices.B.id, // wrong object on purpose if ids shared space; use project fixtures in real suites
    body: 'idor-probe',
  });
  if (![401, 403, 404].includes(result.status)) {
    throw new Error(\`nested write may be vulnerable: \${result.status}\`);
  }
}
\`\`\`

For bulk endpoints, send a mixed array: one owned id and one foreign id. Assert the foreign id is rejected and does not partially apply unless the API documents partial success with per-id errors that still enforce authz.

## Compare response policies without flaky over-assertion

| Policy goal | Safer response pattern | Test focus |
|---|---|---|
| Hide existence from peers | Uniform 404 for foreign and missing | Status uniformity + no body secrets |
| Explain denial to owner-like roles | 403 with stable error code | Code stable, message has no foreign fields |
| Tenant wall | Always 404 across tenants | Cross-tenant matrix |
| Admin auditability | 403 with audit log entry | Security log assertion in harness |

Avoid asserting exact error prose if product changes copy often. Assert status class, machine-readable error code, and absence of sensitive fields.

\`\`\`json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Invoice not found"
  }
}
\`\`\`

If foreign access returns a different code than missing ids, attackers can enumerate valid ids even when bodies are empty. Decide whether that is acceptable for the threat model, then test the decision.

## Diagnose the realistic failure mode: list vs detail inconsistency

A frequent defect pattern:

- List endpoints filter by owner correctly
- Detail endpoints use a shared \`findById\` without owner check
- Search is safe, direct link is not

### Symptoms

- UI appears safe because it only navigates from lists
- API clients and agents that guess or reuse ids retrieve foreign objects
- Support tools paste ids across tenants and accidentally succeed

### Diagnosis steps

1. Capture a legitimate list for user A; confirm B's object is absent
2. Obtain B's id from B's session fixtures
3. Call A's token on B's detail route
4. If 200, you have IDOR despite a safe list
5. Repeat for export, PDF, and download routes often missed by UI tests

\`\`\`ts
async function listVsDetailCheck(baseUrl: string, fixtures: {
  users: Record<string, Principal>;
  invoices: Record<string, SeedObject>;
}) {
  const listRes = await fetch(\`\${baseUrl}/api/invoices\`, {
    headers: { Authorization: \`Bearer \${fixtures.users.A.token}\` },
  });
  const listJson = (await listRes.json()) as { items: Array<{ id: string }> };
  const listedIds = new Set(listJson.items.map((x) => x.id));
  if (listedIds.has(fixtures.invoices.B.id)) {
    throw new Error('list endpoint already leaks foreign ids');
  }

  const detail = await getInvoice(
    baseUrl,
    fixtures.users.A.token,
    fixtures.invoices.B.id,
  );
  if (detail.status === 200) {
    throw new Error('detail endpoint IDOR despite safe list');
  }
}
\`\`\`

Add this as a permanent regression once fixed. It is cheap and catches a class of refactors that "reuse repository getById."

## What people get wrong in IDOR testing

**Wrong: only testing numeric id increments in production.** You may harm real users, trigger rate limits, and still miss UUID endpoints. Use fixtures.

**Wrong: treating 401 everywhere as success.** If a test user token expired, every case "passes" without exercising authz. Always include owner positive controls in the same run.

**Wrong: ignoring writes.** Read-only probes miss destructive IDORs that matter more.

**Wrong: trusting client-side filtering.** Mobile and web apps may hide foreign objects while APIs remain open.

**Wrong: assuming UUIDs equal authorization.** UUIDs are not access control.

**Wrong: letting AI agents free-probe ids on shared staging.** Constrain agent tools to fixture namespaces and deny raw cross-tenant fetches without an explicit security test mode.

## Automate authorization unit tests next to handlers

Transport-level tests are necessary but not sufficient. Also test the authorization policy function with pure unit tests so rules stay readable.

\`\`\`ts
type AuthzContext = {
  userId: string;
  tenantId: string;
  roles: string[];
};

type Invoice = {
  id: string;
  ownerId: string;
  tenantId: string;
  amountCents: number;
};

export function canReadInvoice(ctx: AuthzContext, invoice: Invoice): boolean {
  if (ctx.roles.includes('support-break-glass')) return true;
  if (ctx.tenantId !== invoice.tenantId) return false;
  return ctx.userId === invoice.ownerId;
}

// unit tests
// expect(canReadInvoice(aCtx, bInvoice)).toBe(false)
// expect(canReadInvoice(bCtx, bInvoice)).toBe(true)
\`\`\`

Then ensure the HTTP layer calls the same function before serialization. Integration tests catch wiring mistakes; unit tests catch rule mistakes.

## Expand to GraphQL, jobs, and files

### GraphQL

Global object identifiers and node queries are classic IDOR magnets. Test \`node(id:)\` and direct field resolvers with foreign ids. Ensure mutations that accept ids re-check authz even if the client only learned the id from a previous authorized query in another session.

### Async jobs

Create export jobs as user A, attempt to download the job result as user B using the job id. Job status endpoints often lag behind primary CRUD hardening.

### Files

Object storage keys in URLs must not be guessable without authz, and even unguessable keys should typically be authorized if the product maps files to owners. Test both signed URL issuance and direct key access paths.

\`\`\`bash
# Example authorized flow check with curl-like steps in a hermetic env
# 1) Create as A, capture file id
# 2) Attempt download as B
# 3) Expect denial status
curl -s -o /tmp/b.pdf -w "%{http_code}" \\
  -H "Authorization: Bearer \$USER_B_TOKEN" \\
  "\$BASE_URL/api/files/\$FILE_ID_OWNED_BY_A/content"
\`\`\`

Remember to escape properly in real scripts and never log tokens.

## Build a CI gate that cannot be skipped quietly

Suggested pipeline pieces:

1. Seed job creates tenants and objects
2. Authz matrix tests run on every PR that touches API routes
3. Nightly bounded neighbor probe in a security lab environment
4. Artifact of failing request/response pairs with redaction
5. Break-glass role tests proving admin paths still audit

\`\`\`yaml
name: idor-matrix
on:
  pull_request:
  push:
    branches: [main]

jobs:
  authz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - name: Start hermetic API
        run: npm run test:api:up
      - name: Seed IDOR fixtures
        run: npm run test:seed:idor
      - name: Run authorization matrix
        run: npm test -- -t 'IDOR matrix'
\`\`\`

If your organization distributes QA skills through qaskills.sh and the qaskills CLI, use them to bootstrap matrix harnesses, then encode your tenant rules in first-party tests. Skills cannot know which objects are sensitive in your domain.

## Threat modeling shortcuts for busy teams

When time is limited, rank object types by impact:

| Object type | Impact if IDOR | Enumerability | Test priority |
|---|---|---|---|
| Invoices, PII exports | High | Medium | P0 |
| Auth tokens, API keys | Critical | Low if random | P0 |
| Project metadata | Medium | High | P1 |
| Public marketing assets | Low | High | P3 |
| Internal feature flags | Medium | Medium | P1 |

Spend the first week of testing on P0 write+read matrices for two principals and two tenants. Expand after the harness works.

## Agent-specific controls for IDOR-prone tools

If coding agents call internal MCP tools or admin APIs:

- Scope tool credentials to the invoking user's permissions
- Reject tool arguments that include cross-tenant ids after server-side authz
- Log tool object access for audit
- Include foreign-id negative cases in MCP/tool integration tests
- Do not let evaluation prompts instruct unconstrained id scanning against shared systems

Agents amplify whatever authorization model you expose.

## Proof packaging for security tickets

When you find a candidate IDOR, file evidence that developers can reproduce without debate:

1. Environment and build id
2. Principal A and B fixture identifiers (not real users)
3. Exact request method, path, and redacted headers
4. Expected vs actual status and body snippets
5. Impact statement (read, mutate, delete)
6. Suggested fix location (handler, policy function)
7. Regression test name you will add

Avoid dramatic language. A tight reproduction is more persuasive.

## Retest after refactors that look unrelated

Authorization bugs often reappear when someone introduces a new read model, caches detail responses, or adds a "convenience" admin bypass for support tooling. Any change to repository methods named like get-by-id, to serialization layers that load related objects, or to middleware order should re-run the matrix. A cache that keys only on object id without principal identity can reintroduce cross-user reads even when the primary handler is correct. Include at least one cached-detail case if your stack caches authenticated GETs.

Also retest when pagination, search, or export formats change. CSV and PDF exporters frequently reuse internal fetchers that skip the policy layer applied to JSON APIs. Add one export-format foreign-id case for each new serializer.

## End-to-end mini playbook

1. Seed A/B same tenant, C other tenant
2. Create sensitive objects for each
3. Harvest ids through legitimate lists
4. Cross-play all read/write methods
5. Run list-vs-detail inconsistency check
6. Add bulk and nested id cases
7. Lock denials in CI
8. Schedule bounded neighbor probes only in lab envs
9. Retest after every authz middleware change
10. Review agent tools for the same oracles
11. Re-run after cache, export, or support-bypass changes
12. Keep positive owner controls in every job so expired tokens cannot fake a green build

IDOR enumeration done this way is not a chaotic scan. It is a structured proof that object references are never trusted alone. The teams that win treat object-level authorization as a product contract with fixtures and CI, not as an occasional penetration-test surprise.

## Frequently Asked Questions

### Is returning 404 for foreign objects better than 403?

It depends on whether existence of the id is sensitive. Uniform 404 responses reduce existence oracle risk for peers and other tenants, while 403 can be clearer for legitimate users hitting a known-but-forbidden object. Pick a policy per product area, apply it consistently, and write tests for that policy rather than copying another company's choice blindly.

### Do UUIDs remove the need for IDOR tests?

No. UUIDs make blind guessing harder but do not authorize anything. Ids leak through logs, screenshots, support tickets, browser history, and collaborating users. Authorization checks remain mandatory for every direct object operation.

### How many neighbor ids should a sequential enumeration probe try?

Use the smallest radius that demonstrates risk, often single digits around a fixture id in a lab environment. Large radii create load and noise without improving regression value. CI should rely on known foreign fixture ids; neighbor windows are supplemental attack simulations.

### Can I rely on a web application scanner instead of a matrix?

Scanners are useful assistants, not complete oracles. They may miss nested writes, job downloads, GraphQL node queries, or method-specific flaws, and they can be rough on environments. Keep a first-party authorization matrix for sensitive objects and treat scanner findings as additional candidates to convert into fixture-based regressions.
`,
};
