import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Request Context Dispose Leaks: Ownership Patterns That Keep Suites Stable',
  description: 'Diagnose playwright request context dispose leaks with explicit ownership, fixture teardown, response cleanup, and memory-focused regression workflows.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Request Context Dispose Leaks: Ownership Patterns That Keep Suites Stable

**Playwright request context dispose leaks** occur when a suite creates \`APIRequestContext\` instances and lets their response resources survive longer than the intended test, file, or worker lifetime. Playwright retains response bodies so callers can later read them. The direct fix is to assign each created context a clear owner and call \`await apiContext.dispose()\` in that owner's teardown, preferably in a fixture or a \`finally\` block.

Not every request context is yours to dispose independently. The built-in Playwright Test \`request\` fixture is runner-managed. A context returned by \`playwright.request.newContext()\` is caller-managed. \`page.request\` and \`browserContext.request\` share cookie storage with their browser context, so their practical lifetime belongs to that browser context. Correct cleanup begins with provenance, not with scattering \`dispose()\` calls until memory graphs improve.

This guide creates a local payload server, reproduces retention, defines test-scoped and worker-scoped fixtures, handles large responses, and shows a diagnosis path for CI workers that grow until they are killed. For stack selection around Playwright, see the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026). For browser element strategy, use [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Map each context to the component that owns its lifetime

Resource bugs usually start in setup code that returns a convenient client without recording who must close it. Put ownership into the design review. A request context should have one creation site, one intended scope, and one cleanup path.

| Context source | Cookie relationship | Typical owner | Cleanup rule |
| --- | --- | --- | --- |
| Playwright Test \`request\` fixture | isolated for that test | Playwright Test | let fixture teardown manage it |
| \`request.newContext()\` | isolated unless storage state is supplied | the code that called the factory | call \`dispose()\` in the same abstraction |
| \`browserContext.request\` | shares cookies with browser context | browser context | close the browser context at its boundary |
| \`page.request\` | shares cookies with page's browser context | browser context | close the owning context, not just the page reference |
| custom test fixture returning \`APIRequestContext\` | chosen by fixture setup | custom fixture | dispose after \`await use(value)\` |

The official API documents that responses from methods such as \`get()\` are stored in memory so callers can later obtain their bodies, and that \`dispose()\` discards all resources. The current reference is https://playwright.dev/docs/api/class-apirequestcontext. Fixture lifecycle is documented at https://playwright.dev/docs/test-fixtures.

An ownership rule can be stated in one sentence: the layer that successfully creates an isolated request context must either dispose it or transfer that obligation through an explicit fixture contract. Returning a raw client from an unstructured helper silently transfers responsibility and is where leaks thrive.

## Create a deterministic payload server for memory experiments

Do not diagnose retention against a changing staging API. Response compression, cache hits, redirects, rate limits, and variable payload sizes can hide the pattern. Use a local HTTP server that returns a predictable body and a health response.

Save this as \`tests/payload-server.ts\`.

\`\`\`typescript
import { createServer, type Server } from "node:http";

export interface PayloadServer {
  baseURL: string;
  close(): Promise<void>;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Expected a TCP address"));
        return;
      }
      resolve(address.port);
    });
  });
}

export async function startPayloadServer(): Promise<PayloadServer> {
  const body = JSON.stringify({ payload: "x".repeat(512 * 1024) });
  const server = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"ok":true}');
      return;
    }
    if (request.url === "/payload") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(body);
      return;
    }
    response.writeHead(404);
    response.end();
  });

  const port = await listen(server);
  return {
    baseURL: "http://127.0.0.1:" + port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
}
\`\`\`

The payload size is illustrative, not a statement about Playwright overhead. It is large enough to make retention visible without requiring an external service. The server binds to loopback and an ephemeral port, so parallel local runs avoid a hard-coded port collision.

## Reproduce retained responses without creating a permanent leak

A useful reproducer demonstrates growth during the context lifetime and still cleans up after itself. Save the following as \`tests/observe-retention.ts\` and run it through a TypeScript execution setup already used by the project, or compile it with the project's TypeScript configuration.

\`\`\`typescript
import { request } from "@playwright/test";
import { startPayloadServer } from "./payload-server";

function rssMiB(): string {
  return (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
}

const server = await startPayloadServer();
const api = await request.newContext({ baseURL: server.baseURL });

try {
  console.log("before requests", rssMiB(), "MiB RSS");
  for (let index = 1; index <= 30; index += 1) {
    const response = await api.get("/payload");
    if (!response.ok()) throw new Error("Payload request failed");
    if (index % 10 === 0) {
      console.log("after", index, "responses", rssMiB(), "MiB RSS");
    }
  }
} finally {
  await api.dispose();
  await server.close();
}
\`\`\`

Resident set size is noisy. The allocator, garbage collector, runtime, operating system, and concurrent work all influence it. Look for repeatable slope across multiple isolated runs, not an exact release to the starting number. Disposal makes the resources eligible for release; it does not promise that the process RSS instantly shrinks.

Run a second experiment that disposes each response after validating it. If the slope changes materially while request count and payload remain fixed, response retention is a strong explanation. If it does not, investigate other owners such as browser contexts, traces, videos, application servers, report attachments, or an ever-growing in-memory data fixture.

## Use try and finally for one-off clients

For setup scripts, global preparation utilities, or a helper that creates and consumes a client entirely within one function, \`try/finally\` keeps cleanup adjacent to creation. The \`finally\` block executes whether an assertion, JSON parse, or network request throws.

\`\`\`typescript
import { request } from "@playwright/test";

export async function readServiceHealth(baseURL: string): Promise<boolean> {
  const api = await request.newContext({ baseURL });
  try {
    const response = await api.get("/health");
    if (!response.ok()) return false;
    const body: unknown = await response.json();
    return (
      typeof body === "object" &&
      body !== null &&
      "ok" in body &&
      body.ok === true
    );
  } finally {
    await api.dispose();
  }
}
\`\`\`

Do not write cleanup only after the last happy-path assertion. This is the broken shape:

\`\`\`typescript
import { request } from "@playwright/test";

export async function brokenHealthCheck(baseURL: string): Promise<void> {
  const api = await request.newContext({ baseURL });
  const response = await api.get("/health");
  if (!response.ok()) {
    throw new Error("Health endpoint failed before cleanup");
  }
  await api.dispose();
}
\`\`\`

The code is syntactically runnable, but it intentionally exhibits the failure: any error before the final line skips disposal. A code review should reject it even if the endpoint almost always passes. Reliability work focuses on exceptional paths because that is where CI failures spend their time.

If context creation itself rejects, there is no context to dispose. Create first, then enter \`try\`. If server setup and client setup are both involved, use nested ownership or a small resource fixture so every successfully created resource gains a corresponding cleanup step.

## Encode test-scoped ownership in a Playwright fixture

Fixtures are safer than scattered \`beforeEach\` and \`afterEach\` variables because setup and teardown live in the same function. Code after \`await use(api)\` is the teardown phase. It runs when the test no longer uses the fixture, including failed tests.

Save this as \`tests/api-test.ts\`.

\`\`\`typescript
import {
  test as base,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";

type ApiFixtures = {
  serviceApi: APIRequestContext;
};

export const test = base.extend<ApiFixtures>({
  serviceApi: async ({ baseURL }, use) => {
    if (baseURL === undefined) {
      throw new Error("Set use.baseURL in playwright.config.ts");
    }
    const api = await request.newContext({ baseURL });
    try {
      await use(api);
    } finally {
      await api.dispose();
    }
  },
});

export { expect };
\`\`\`

A test imports this extended \`test\`, not the base one. The following assumes the application configured by \`baseURL\` exposes \`GET /health\`, which is the explicit contract under test.

\`\`\`typescript
import { test, expect } from "./api-test";

test("health response has an explicit boolean contract", async ({ serviceApi }) => {
  const response = await serviceApi.get("/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
\`\`\`

What people get wrong is importing \`test\` from \`@playwright/test\` in some files and from the extended fixture module in others. The direct import silently bypasses custom setup and teardown. Enforce a project import convention with lint rules, code review, or a path alias that becomes the only approved test entry point.

Do not dispose \`serviceApi\` inside a test. That violates fixture ownership and can make teardown report a secondary error or break subsequent steps that legitimately use the fixture. Consumers borrow the resource. The fixture owns it.

## Choose worker scope only when state sharing is intentional

A worker-scoped API context can reduce authentication and connection setup, but it retains all response resources until that worker stops unless individual responses are disposed. It also shares cookies and other request-context state across tests in the worker. Use it only when those semantics are acceptable.

| Scope | Creation frequency | State isolation | Retention window | Suitable use |
| --- | --- | --- | --- | --- |
| test | once per consuming test | strongest default | one test | independent API scenarios |
| worker | once per worker | shared within worker | worker lifetime | read-only shared client or costly login |
| manual module singleton | import-dependent | difficult to reason about | often entire process | avoid for test clients |

This worker fixture owns both the local server and the API client. Save it as \`tests/worker-api-test.ts\`.

\`\`\`typescript
import {
  test as base,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { startPayloadServer } from "./payload-server";

type WorkerFixtures = {
  workerApi: APIRequestContext;
};

export const test = base.extend<{}, WorkerFixtures>({
  workerApi: [
    async ({}, use) => {
      const server = await startPayloadServer();
      const api = await request.newContext({ baseURL: server.baseURL });
      try {
        await use(api);
      } finally {
        await api.dispose();
        await server.close();
      }
    },
    { scope: "worker" },
  ],
});

export { expect };
\`\`\`

Cleanup order is deliberate: stop using and dispose the client, then close the server. If server startup succeeds but client creation fails, this exact version would skip the \`try\` block and leak the server. Harden multi-resource setup by acquiring the client inside a \`try\` whose \`finally\` always closes the server.

\`\`\`typescript
import { request, type APIRequestContext } from "@playwright/test";
import { startPayloadServer } from "./payload-server";

export async function withWorkerResources(
  use: (api: APIRequestContext) => Promise<void>,
): Promise<void> {
  const server = await startPayloadServer();
  let api: APIRequestContext | undefined;
  try {
    api = await request.newContext({ baseURL: server.baseURL });
    await use(api);
  } finally {
    if (api !== undefined) await api.dispose();
    await server.close();
  }
}
\`\`\`

The same acquisition rule applies to databases, mock servers, browser contexts, and temporary files. Every successful acquisition changes what teardown must do. A stack of fixture-owned resources is easier to audit than a collection of unrelated global hooks.

## Dispose large responses when the context must stay alive

\`APIResponse.dispose()\` releases that response body's resources without ending the request context. It is useful for a worker-scoped client that downloads many large payloads but needs cookies or authentication across requests. The API reference is at https://playwright.dev/docs/api/class-apiresponse.

\`\`\`typescript
import { expect, type APIRequestContext } from "@playwright/test";

export async function verifyPayloadBatch(
  api: APIRequestContext,
  count: number,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const response = await api.get("/payload");
    try {
      expect(response.status()).toBe(200);
      const body: unknown = await response.json();
      expect(body).toEqual({ payload: "x".repeat(512 * 1024) });
    } finally {
      await response.dispose();
    }
  }
}
\`\`\`

Consume the body before disposal. Calling \`body()\`, \`json()\`, or \`text()\` afterward is outside the valid lifetime. Do not return a disposed response from a helper. Return the validated domain data, status, or headers the caller needs.

| Need after helper returns | Safe return value | Unsafe return value |
| --- | --- | --- |
| parsed account record | validated plain object | disposed \`APIResponse\` |
| status assertion | number or boolean | response with released body |
| selected headers | copied string map | borrowed response object |
| streaming large content | purpose-built stream client | assumption that Playwright response streams |

For concurrent requests, wait for every started operation to settle before disposing the shared context. Disposing while requests are active interrupts them. A cancellation path may choose that behavior intentionally, but routine cleanup should not manufacture network errors that obscure the original failure.

## Diagnose a worker that grows until CI kills it

A realistic incident looks like this: individual API tests pass, each file is quick, but a shard's RSS rises across hundreds of cases. Near the end, Linux kills the worker or Node reports an allocation failure. Retrying a single failed test passes, which makes the product endpoint look flaky.

Use a controlled diagnosis sequence:

1. Record process RSS at worker start, after a fixed request count, and before worker teardown. Use trends, not a magic threshold.
2. Count calls to \`request.newContext()\` and calls to \`dispose()\` in the same worker. Instrument the factory wrapper if necessary.
3. Inspect whether clients live in module variables, page objects, service singletons, or \`beforeAll\` blocks without paired cleanup.
4. Separate browser-heavy tests from API-only tests to determine which resource family drives the slope.
5. Run the local fixed-payload reproducer with context-level cleanup, then with response-level cleanup.
6. Capture a heap snapshot only in an authorized diagnostic job, because snapshots can contain response data and credentials.

The common root cause is not the number of HTTP calls by itself. It is the combination of retained responses and a lifetime that is broader than intended. A worker-scoped context processing many medium or large bodies can show growth even though it is eventually disposed correctly. Response-level disposal narrows that retention window.

Another failure mode is an \`afterAll\` hook that closes whichever client remains in a mutable variable. If setup partially fails, the variable may be undefined. If a later helper overwrites it, the original client loses its only reference without being disposed. Fixture closures bind teardown to the exact object they created and remove this aliasing problem.

## Verify cleanup behavior without brittle memory assertions

End-to-end memory limits vary by operating system and runtime, so avoid a unit test that expects RSS to fall by an exact number of megabytes. Verify the deterministic contract first: the owner calls disposal, post-disposal use rejects, fixture teardown runs after failure, and response cleanup is reached through \`finally\`.

\`\`\`typescript
import { expect, request, test } from "@playwright/test";
import { startPayloadServer } from "./payload-server";

test("a disposed context rejects later operations", async () => {
  const server = await startPayloadServer();
  const api = await request.newContext({ baseURL: server.baseURL });
  try {
    const response = await api.get("/health");
    expect(response.ok()).toBe(true);
    await api.dispose();
    let disposedError: unknown;
    try {
      await api.get("/health");
    } catch (error) {
      disposedError = error;
    }
    expect(disposedError).toBeInstanceOf(Error);
  } finally {
    await server.close();
  }
});
\`\`\`

This test intentionally disposes before the rejection assertion. It does not call \`dispose()\` again in \`finally\`, avoiding dependence on whether repeated disposal is tolerated. In production fixtures, the context should not escape to code that might dispose it early.

Add an illustrative soak job after deterministic tests. Hold endpoint, payload, request count, workers, retries, tracing, and reporters constant. Compare the slope across several runs before and after the ownership fix. Attach summarized metrics, not heap snapshots containing sensitive response bodies. A slope reduction supports the diagnosis, while exact RSS values remain environment-specific.

## Review request helpers as resource boundaries

AI coding agents frequently generate thin API client classes. Review those classes for lifetime semantics, not just endpoint correctness. A constructor that accepts an \`APIRequestContext\` borrows it and should not dispose it. A static \`create()\` method that internally calls \`request.newContext()\` should expose a matching \`dispose()\` or return a fixture-owned wrapper.

| Review question | Healthy answer | Warning sign |
| --- | --- | --- |
| Who called \`newContext()\`? | named fixture or factory | module import side effect |
| Who disposes it? | same fixture or explicit wrapper | "the process exits eventually" |
| Can the client escape its scope? | only through typed fixture lifetime | stored in global cache |
| Are large bodies retained? | response disposed after parsing when needed | worker loop keeps every response |
| What happens on assertion failure? | \`finally\` or fixture teardown runs | cleanup is last happy-path line |
| Is the context borrowed? | consumer never disposes it | page object closes shared browser API context |

Ask an agent to show creation and teardown in the same diff. If it introduces \`request.newContext()\`, require a test or fixture that proves cleanup. This simple review invariant catches more leaks than adding an arbitrary global cleanup hook after the suite has already become unstable.

Also review retry behavior. Playwright may run a failed test in a fresh worker, so a leak can disappear during retry while the original worker has already been discarded. That does not make the ownership defect harmless. Compare first-attempt worker metrics with retry metrics, and keep resource diagnostics labeled by worker index and test ID. If a helper caches authentication data, ensure the cached object is plain storage state or domain data rather than the live request context. Serializable state can be transferred intentionally; a live client carries sockets, cookies, retained responses, and an unresolved cleanup obligation.

## Frequently Asked Questions

### Does Playwright Test automatically dispose the built-in request fixture?

Yes, the built-in \`request\` fixture is managed by Playwright Test as an isolated test fixture. Test code should use it without independently owning its teardown. The distinction matters when code calls \`request.newContext()\` itself, because that factory result is caller-managed and must be disposed. If a custom fixture wraps a new context, put \`dispose()\` after \`await use(api)\` in a \`finally\` block. Review imports carefully so tests do not accidentally bypass the custom fixture module.

### Should every APIResponse be disposed after an assertion?

Not always. Disposing the owning \`APIRequestContext\` releases all its response resources, which is usually sufficient for short test-scoped contexts. Per-response disposal is valuable when a context has a long lifetime or processes many large bodies. Parse or copy everything needed before disposal, then release the response in \`finally\`. Do not return the disposed response to callers. Measure with a controlled payload because small responses, allocator behavior, and unrelated fixtures can make process-level memory trends noisy.

### Is closing a Page enough to clean up page.request?

Think in terms of the owning browser context. \`page.request\` and \`browserContext.request\` are associated with that context and share its cookie storage. Closing one page does not necessarily end the browser context if other pages or references remain. Let the Playwright fixture close its test context, or explicitly close a browser context you created. Avoid disposing a borrowed request context from a page object, because doing so can break other consumers that share the same browser-context lifetime.

### How can we catch request-context leaks in code generated by an AI agent?

Search the diff for every \`request.newContext()\` call and require a nearby ownership story: a fixture teardown, a \`finally\` block, or a wrapper with explicit disposal. Test failure paths, not only successful requests. Run a deterministic local payload loop and compare memory slope with context-level and response-level cleanup. Reject module singletons and mutable global clients unless their process lifetime is intentional. Also ensure helpers that accept a context treat it as borrowed and do not close resources owned by the test runner.
`,
};
