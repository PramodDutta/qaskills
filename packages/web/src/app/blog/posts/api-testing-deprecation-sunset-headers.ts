import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Deprecation Sunset Headers: Prove Every Migration Signal',
  description: 'Master API testing deprecation sunset headers with RFC-aware assertions, timeline checks, migration links, proxy coverage, and CI-ready contract tests.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# API Testing Deprecation Sunset Headers: Prove Every Migration Signal

**API testing deprecation sunset headers** means verifying three separate promises: when an API becomes deprecated, when it is expected to stop responding, and where a consumer can find migration instructions. A good test does not merely check that two response headers exist. It parses each field according to its own specification, checks their chronological relationship, confirms the scope is correct, and proves that gateways, caches, error paths, and alternate methods preserve the signal.

The practical contract is simple. \`Deprecation\` is an HTTP Structured Field date such as \`@1782864000\`. \`Sunset\` is an HTTP-date such as \`Tue, 30 Jun 2026 00:00:00 GMT\`. A \`Link\` response field can point to migration documentation with \`rel="deprecation"\` and to sunset policy information with \`rel="sunset"\`. RFC 9745 defines \`Deprecation\`; RFC 8594 defines \`Sunset\`. They complement one another, but they are not interchangeable countdown headers.

This guide builds a runnable Node.js and Vitest test harness around those rules. If you need the surrounding request setup, authentication helpers, and app factory patterns, use the [SuperTest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide). If the same lifecycle promise must be enforced between independently deployed consumers and providers, the [contract testing Pact complete guide](/blog/contract-testing-pact-complete-guide) shows where these assertions fit in a consumer contract.

## Translate the two fields into a testable timeline

Deprecation and shutdown are different events. Deprecation says that consumers should plan a transition and must not assume behavior will remain unchanged after the stated date. Sunset says the URI is likely to become unresponsive at the stated date. Deprecation itself does not authorize a server to break the resource immediately. That distinction drives the first test matrix.

| Signal | Example wire value | Meaning to a client | Core assertion |
| --- | --- | --- | --- |
| \`Deprecation\` | \`@1782864000\` | Deprecation starts at a Unix timestamp | Valid Structured Field date |
| \`Sunset\` | \`Tue, 30 Jun 2026 00:00:00 GMT\` | URI is expected to become unresponsive then | Valid HTTP-date |
| \`Link\` with \`deprecation\` | \`<https://docs.example.test/migrate>; rel="deprecation"\` | Human-readable deprecation guidance | HTTPS target and correct relation |
| \`Link\` with \`sunset\` | \`<https://docs.example.test/policy>; rel="sunset"\` | Sunset policy or mitigation details | Relation remains discoverable |

The chronological invariant is mandatory: the \`Sunset\` instant must not be earlier than the \`Deprecation\` instant. Equality can be syntactically valid, although a zero-length migration window is usually a product-policy defect. Decide separately whether your organization requires an illustrative minimum notice window such as 90 days. Do not present that organizational threshold as an RFC requirement.

Use explicit UTC instants in fixtures. Calendar arithmetic such as "three months" is ambiguous around month lengths. Store the policy dates as ISO strings, derive both field formats from those instants, and compare epoch milliseconds in tests.

\`\`\`typescript
export const lifecycle = {
  deprecatedAt: new Date("2026-03-31T00:00:00Z"),
  sunsetAt: new Date("2026-06-30T00:00:00Z"),
  migrationUrl: "https://docs.example.test/migrations/orders-v1",
};

export function deprecationField(date: Date): string {
  return \`@\${Math.floor(date.getTime() / 1000)}\`;
}

export function sunsetField(date: Date): string {
  return date.toUTCString();
}

console.log(deprecationField(lifecycle.deprecatedAt));
console.log(sunsetField(lifecycle.sunsetAt));
\`\`\`

This single source of truth prevents a common release error where one deployment variable updates \`Sunset\` but a hard-coded \`Deprecation\` value remains unchanged.

## Parse the wire values instead of comparing decorative strings

An exact string assertion is useful when your provider contract fixes the value, but it is not enough. It can approve a field that looks date-like yet has the wrong grammar. It can also fail harmlessly if a legal date representation changes. Parse first, then assert the business instant.

The \`Deprecation\` field is not an HTTP-date. RFC 9745 registers it as a Structured Field Item whose value is a date, represented on the wire by \`@\` followed by an integer number of seconds since the Unix epoch. The following small parser is intentionally strict enough for a test oracle. It rejects parameters and non-integer input because this suite expects a bare date item.

\`\`\`typescript
export function parseDeprecation(value: string | undefined): Date {
  if (value === undefined) {
    throw new Error("Deprecation header is missing");
  }

  const match = /^@(-?[0-9]+)$/.exec(value.trim());
  if (match === null) {
    throw new Error(\`Invalid Deprecation field: \${value}\`);
  }

  const seconds = Number(match[1]);
  if (!Number.isSafeInteger(seconds)) {
    throw new Error("Deprecation timestamp is outside the safe integer range");
  }

  const parsed = new Date(seconds * 1000);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Deprecation timestamp cannot be represented as a Date");
  }
  return parsed;
}

export function parseSunset(value: string | undefined): Date {
  if (value === undefined) {
    throw new Error("Sunset header is missing");
  }
  const normalized = value.trim();
  const imfFixdate =
    /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [0-9]{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT$/;
  if (!imfFixdate.test(normalized)) {
    throw new Error("Sunset is not an IMF-fixdate: " + value);
  }
  const milliseconds = Date.parse(normalized);
  if (Number.isNaN(milliseconds)) {
    throw new Error(\`Invalid Sunset HTTP-date: \${value}\`);
  }
  const parsed = new Date(milliseconds);
  if (parsed.toUTCString() !== normalized) {
    throw new Error("Sunset contains an impossible calendar date: " + value);
  }
  return parsed;
}
\`\`\`

For protocol conformance beyond this focused oracle, use a maintained HTTP Structured Fields parser rather than growing a home-built general parser. The source of truth is RFC 9745 at https://www.rfc-editor.org/rfc/rfc9745.html and RFC 8594 at https://www.rfc-editor.org/rfc/rfc8594.html.

What people get wrong is parsing both fields with \`Date.parse\`. JavaScript will not interpret \`@1782864000\` as the Structured Field date it represents. Another mistake is emitting an ISO 8601 value in \`Sunset\`. ISO 8601 is excellent for configuration, but the field uses HTTP-date syntax. Tests should catch both substitutions.

## Build a provider fixture that makes lifecycle scope visible

A lifecycle announcement might apply to one endpoint, a subtree, a version, or an entire service. The response itself identifies the resource in context, so the provider must consistently attach the signal wherever its declared scope requires. A centralized middleware can reduce omissions, but only route-level tests prove the final behavior.

This Express fixture exposes a deprecated v1 order route and an active v2 route. Save it as \`app.ts\` in a test project with Express installed.

\`\`\`typescript
import express from "express";
import { deprecationField, lifecycle, sunsetField } from "./lifecycle";

export function buildApp() {
  const app = express();

  app.use("/v1/orders", (_request, response, next) => {
    response.setHeader("Deprecation", deprecationField(lifecycle.deprecatedAt));
    response.setHeader("Sunset", sunsetField(lifecycle.sunsetAt));
    response.setHeader(
      "Link",
      \`<\${lifecycle.migrationUrl}>; rel="deprecation"; type="text/html"\`,
    );
    next();
  });

  app.get("/v1/orders/:id", (request, response) => {
    response.json({ id: request.params.id, apiVersion: 1 });
  });

  app.get("/v2/orders/:id", (request, response) => {
    response.json({ id: request.params.id, apiVersion: 2 });
  });

  app.use((_request, response) => {
    response.status(404).json({ error: "not_found" });
  });

  return app;
}
\`\`\`

The middleware is mounted narrowly. That matters because globally attaching deprecation fields can train consumers to ignore them and falsely imply that v2 is also retiring.

## Assert dates, order, links, and unaffected replacements in Vitest

The central provider test should cover positive presence, semantic parsing, ordering, documentation discovery, and absence on the replacement route. Keep the expected policy instant in test data, not reconstructed from the response.

\`\`\`typescript
import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { lifecycle } from "./lifecycle";
import { parseDeprecation, parseSunset } from "./parsers";

describe("orders v1 lifecycle fields", () => {
  const app = buildApp();

  it("announces a coherent migration window", async () => {
    const response = await request(app).get("/v1/orders/42").expect(200);

    const deprecatedAt = parseDeprecation(response.headers.deprecation);
    const sunsetAt = parseSunset(response.headers.sunset);

    expect(deprecatedAt.toISOString()).toBe(lifecycle.deprecatedAt.toISOString());
    expect(sunsetAt.toISOString()).toBe(lifecycle.sunsetAt.toISOString());
    expect(sunsetAt.getTime()).toBeGreaterThanOrEqual(deprecatedAt.getTime());
    expect(response.headers.link).toContain('rel="deprecation"');
    expect(response.headers.link).toContain(lifecycle.migrationUrl);
  });

  it("does not mark the replacement version as deprecated", async () => {
    const response = await request(app).get("/v2/orders/42").expect(200);
    expect(response.headers.deprecation).toBeUndefined();
    expect(response.headers.sunset).toBeUndefined();
  });
});
\`\`\`

Run the focused case with \`vitest run -t "coherent migration window"\`. Vitest uses \`-t\` or \`--testNamePattern\` for this selection. Do not copy a \`--grep\` flag from a Mocha command into a Vitest workflow.

Add an organizational notice-window assertion only when the policy is explicit. This example uses 90 days as an illustrative policy value, not a universal recommendation.

\`\`\`typescript
import { expect, it } from "vitest";
import { lifecycle } from "./lifecycle";

it("provides the illustrative policy notice window", () => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const noticeDays =
    (lifecycle.sunsetAt.getTime() - lifecycle.deprecatedAt.getTime()) /
    millisecondsPerDay;

  expect(noticeDays).toBeGreaterThanOrEqual(90);
});
\`\`\`

Use an integer-day assertion only when both instants are aligned to UTC day boundaries. If the organization measures business days or local calendar dates, encode that rule explicitly rather than rounding a millisecond difference.

## Cover every response path where clients learn about retirement

Happy-path GET coverage misses the places where real integrations often live. Some consumers issue \`HEAD\` for health or metadata. Others learn that an old endpoint is deprecated only after receiving \`401\`, \`403\`, \`404\`, \`405\`, or a validation error. Decide whether lifecycle metadata applies to those responses and lock the decision into a route matrix.

| Path or response | Expected fields | Reason to test |
| --- | --- | --- |
| Existing v1 resource, \`200\` | Deprecation, Sunset, migration Link | Normal discovery path |
| Invalid v1 input, \`400\` | Usually same lifecycle signal | Consumer can migrate despite bad payload |
| Unauthenticated v1 request, \`401\` | Policy decision | Auth layer may short-circuit middleware |
| v1 \`HEAD\` | Same metadata as GET policy | SDK or monitor may inspect headers only |
| v2 success | No v1 lifecycle signal | Prevent scope leakage |
| Unknown unrelated path, \`404\` | No v1 signal | Avoid global false announcements |

Turn that table into parameterized tests. The sample below uses only routes that the fixture defines, so it runs without hidden dependencies.

\`\`\`typescript
import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

describe.each([
  { path: "/v1/orders/7", deprecated: true },
  { path: "/v2/orders/7", deprecated: false },
  { path: "/missing", deprecated: false },
])("lifecycle scope for $path", ({ path, deprecated }) => {
  it("matches the route policy", async () => {
    const response = await request(buildApp()).get(path);
    if (deprecated) {
      expect(response.headers.deprecation).toBeDefined();
      expect(response.headers.sunset).toBeDefined();
    } else {
      expect(response.headers.deprecation).toBeUndefined();
      expect(response.headers.sunset).toBeUndefined();
    }
  });
});
\`\`\`

Extend the matrix with your actual POST, PUT, PATCH, DELETE, HEAD, error, and authentication flows. The expected scope is a product decision; inconsistency across equivalent v1 operations is almost always a defect.

## Treat Link as structured metadata, not a substring hunt

A response can carry more than one link-value in one \`Link\` field, and a server or intermediary may combine field lines. Commas inside quoted parameters make naive \`split(",")\` parsing unsafe. For production client behavior, choose a maintained RFC-compliant Link parser. In focused provider tests, you can either assert the complete known field or use a narrow parser that supports the exact shape your service emits.

The following strict helper validates the single-link form produced by the fixture. It refuses unknown shapes instead of pretending to be a full parser.

\`\`\`typescript
type ParsedLink = { target: URL; relation: string; mediaType?: string };

export function parseSingleLifecycleLink(value: string | undefined): ParsedLink {
  if (value === undefined) throw new Error("Link header is missing");

  const match = /^<([^>]+)>; rel="([^"]+)"(?:; type="([^"]+)")?$/.exec(
    value.trim(),
  );
  if (match === null) throw new Error(\`Unexpected lifecycle Link: \${value}\`);

  return {
    target: new URL(match[1]),
    relation: match[2],
    mediaType: match[3],
  };
}

const parsed = parseSingleLifecycleLink(
  '<https://docs.example.test/migrate>; rel="deprecation"; type="text/html"',
);
if (parsed.target.protocol !== "https:") throw new Error("Documentation must use HTTPS");
\`\`\`

Do more than prove that a URL parses. Check that the relation is exactly \`deprecation\`, the host is approved, HTTPS is used, and the page responds in the environment where link checking is allowed. Do not make every unit test depend on an external documentation host. Put availability checks in a scheduled integration job with an explicit timeout and ownership route.

## Diagnose the realistic gateway-stripping failure

Consider this failure: the in-process SuperTest suite passes, but a consumer reports that production responses contain no lifecycle fields. A direct request to the application pod includes them. A request through the public gateway does not. The application is correct; the deployed HTTP path is not.

Start with evidence at each hop:

1. Capture response headers from the app container or service address.
2. Capture them through the ingress, CDN, and public hostname.
3. Compare status, cache status, age, and lifecycle fields.
4. Inspect gateway response-header allowlists and transformation rules.
5. Purge or bypass an old cached representation, then repeat.

\`\`\`bash
set -eu

PUBLIC_URL="https://api.example.test/v1/orders/42"
headers_file="\${TMPDIR:-/tmp}/orders_headers.txt"

curl --fail-with-body --silent --show-error \\
  --dump-header "\${headers_file}" \\
  --output /dev/null \\
  "\${PUBLIC_URL}"

grep -i '^Deprecation:' "\${headers_file}"
grep -i '^Sunset:' "\${headers_file}"
grep -i '^Link:' "\${headers_file}"
\`\`\`

This probe is deliberately public-path oriented. It catches reverse proxies that drop unfamiliar fields, edge functions that reconstruct responses from an allowlist, and caches containing a representation created before the lifecycle rollout. If the field appears only with a cache-busting query, the diagnosis points to cache invalidation or cache-key policy, not the application middleware.

Another subtle failure is header duplication. Two layers may append different \`Sunset\` values. Node may expose a combined string, and a permissive date parser might accept only a prefix. Assert one authoritative value at the public boundary and remove competing injection points.

## Separate protocol conformance from lifecycle policy

The fastest suites distinguish what the RFC requires from what your organization promises. Otherwise a policy revision looks like a protocol regression, or a malformed field slips through because its date is roughly correct.

| Test layer | Example assertion | Change owner | Recommended cadence |
| --- | --- | --- | --- |
| Syntax | \`Deprecation\` matches a Structured Field date | API platform | Every pull request |
| Temporal coherence | Sunset is not before deprecation | API owner | Every pull request |
| Notice policy | Window is at least illustrative threshold | Product governance | Every pull request |
| Scope | Only retiring routes announce retirement | API owner | Every pull request |
| Public propagation | CDN and gateway preserve fields | Platform operations | Deployment and scheduled |
| Documentation | Migration target resolves and is current | Documentation owner | Scheduled |

This split also makes failures actionable. A syntax error belongs to the response implementation. A short notice period may be intentional but needs product approval. A broken migration page belongs to the documentation release, even if the API binary did not change.

## Make the migration guide itself testable

A perfect header pointing to an empty document does not help a consumer. The linked page should identify the affected operation or version, replacement, behavioral differences, authentication changes, rollout dates, and a support path. Test stable machine-observable facts without coupling to prose punctuation.

For example, a scheduled checker can request the migration URL, require a successful status, enforce HTTPS after redirects, and search for the old and replacement version identifiers. Keep this check out of isolated provider unit tests. Documentation may deploy independently, and network failures should not make local controller tests flaky.

\`\`\`typescript
export async function verifyMigrationPage(url: string): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(\`Migration page returned \${response.status}\`);
  }
  if (!response.url.startsWith("https://")) {
    throw new Error("Migration page did not finish on HTTPS");
  }

  const body = await response.text();
  for (const requiredText of ["Orders API v1", "Orders API v2", "June 30, 2026"]) {
    if (!body.includes(requiredText)) {
      throw new Error(\`Migration page is missing: \${requiredText}\`);
    }
  }
}

const target = process.env.MIGRATION_URL;
if (target === undefined) throw new Error("MIGRATION_URL is required");
await verifyMigrationPage(target);
\`\`\`

The date in that list is fixture-specific. Derive it from the same release policy if the documentation generator supports structured input. If not, a duplicated date is acceptable when the scheduled check explicitly detects drift.

## Give AI coding agents invariants, not vague header tasks

An instruction such as "add sunset headers" invites several plausible mistakes: using the same date syntax for both fields, attaching them globally, placing an ISO timestamp in \`Sunset\`, or omitting documentation. Give an agent a compact acceptance contract instead:

- v1 order responses carry a bare \`Deprecation\` Structured Field date.
- v1 order responses carry a valid \`Sunset\` HTTP-date at or after deprecation.
- a deprecation Link uses HTTPS and the registered relation.
- equivalent methods and documented error paths preserve the metadata.
- v2 and unrelated routes carry none of the v1 lifecycle fields.
- public-gateway smoke tests prove propagation after deployment.

Ask the agent to run the test matrix and show the parsed instants, not just paste a middleware diff. Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when you want the review invariant available to multiple coding agents.

## Release gate for a deprecation announcement

Before shipping the announcement, record the expected evidence in the release ticket:

1. The effective deprecation and sunset instants are approved in UTC.
2. The \`Deprecation\` value is generated as an \`@\` date item.
3. The \`Sunset\` value is generated as an HTTP-date.
4. Sunset is not earlier than deprecation, and the internal notice policy passes.
5. The migration link uses the intended registered relation and HTTPS.
6. All in-scope methods, statuses, and representations carry consistent metadata.
7. Replacement and unrelated routes remain unmarked.
8. A public-host probe passes through every production intermediary.
9. Cached pre-announcement responses are expired or invalidated.
10. Monitoring groups requests to deprecated routes without logging credentials or sensitive payloads.

That gate turns lifecycle metadata from a decorative release note into an observable compatibility feature. The consumer gets time, a destination, and a trustworthy signal on the exact traffic that needs migration.

## Frequently Asked Questions

### Is the Deprecation header a boolean or a date?

Under RFC 9745, \`Deprecation\` communicates a date as an HTTP Structured Field Item. On the wire, the date uses an at sign followed by epoch seconds, for example \`@1782864000\`. Older drafts and pre-standard implementations may use different forms, so inventory existing consumers before changing a live API. For a current conformance test, parse the standardized date, compare it with the approved instant, and reject ISO strings or HTTP-date values placed in this field.

### Must every deprecated response also include Sunset?

No. A provider can announce deprecation without committing to a shutdown instant. \`Sunset\` is appropriate when the provider expects the URI to become unresponsive at a known time. When both are present, Sunset must not be earlier than Deprecation. Your tests should reflect the published lifecycle policy: require both only for APIs with an approved retirement date, and require \`Deprecation\` plus migration documentation when the final shutdown remains undecided.

### Should a test fail when the migration document is temporarily unavailable?

Yes at the right layer, but usually not in every unit run. Provider tests should validate the Link value, relation, scheme, and approved target deterministically. A deployment or scheduled integration check should fetch the page with a bounded timeout, follow redirects, and verify stable content markers. This division keeps controller tests fast while still making a broken guide visible. Route the scheduled failure to the documentation owner and the API owner because consumers need both teams to restore the migration path.

### What happens to these assertions after the sunset date passes?

Do not simply delete them on the date. First verify the approved post-sunset behavior, such as a deliberate \`410 Gone\`, replacement redirect, or endpoint removal at the gateway. Keep a test that proves the old route cannot silently return its former success response. Also retain a documentation check for any promised archive or migration page. Remove the original date-field assertions only after traffic, support policy, and rollback plans confirm that the retirement phase has genuinely ended.
`,
};
