import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MSW vs Nock for Node.js API Tests',
  description:
    'Compare MSW and Nock for Node.js API tests through real handlers, interception models, request assertions, isolation, unmatched traffic, and migration tradeoffs.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# MSW vs Nock for Node.js API Tests

One test wants an API server that returns a user-shaped response regardless of whether the application uses \`fetch\` today and Axios tomorrow. Another test wants to prove that exactly one \`POST /charges\` request carried a particular header and body. MSW and Nock can both intercept Node.js traffic, but they encourage different test contracts.

Mock Service Worker models network behavior with request handlers shared across Node and browser environments. Nock models expected Node HTTP interactions with scopes and interceptors. Choosing between them is less about syntax and more about whether the test's center of gravity is a reusable fake API or an outbound-call expectation.

## The interception models are not interchangeable

MSW's Node setup registers handlers such as \`http.get()\` and returns \`HttpResponse\` objects. Tests call ordinary application code, and matching requests receive those responses. The same handler vocabulary can support browser mocking through MSW's worker setup.

Nock starts with an origin scope, adds method/path/body/header expectations, and supplies a reply. Interceptors are consumed by default. A scope can assert that every required interaction occurred. This makes request cardinality part of the primitive.

| Decision factor | MSW | Nock |
|---|---|---|
| Primary abstraction | Declarative API behavior | Expected Node HTTP exchange |
| Browser handler reuse | Yes, with browser setup | No, Node focused |
| Unused handler fails by default | No | Pending required interceptor can fail via \`done()\` or \`isDone()\` |
| Repeated matching calls | Handler remains available | Interceptor is consumed unless repeated or persisted |
| GraphQL support | First-class GraphQL handlers | Match HTTP requests manually |
| Failure emphasis | Unhandled request or returned scenario | Unexpected or missing exact call |

Neither tool launches the real dependency. Both are process-level interception, so they cannot validate TLS termination, actual server parsing, deployment networking, or the provider's behavior.

## The same client tested with MSW

Consider a client that fetches a customer record and maps upstream errors.

\`\`\`ts
// customer-client.ts
export async function loadCustomer(id: string): Promise<{ id: string; tier: string }> {
  const response = await fetch(\`https://crm.example.test/customers/\${id}\`, {
    headers: { authorization: 'Bearer integration-token' },
  });
  if (!response.ok) {
    throw new Error(\`CRM returned \${response.status}\`);
  }
  return response.json() as Promise<{ id: string; tier: string }>;
}
\`\`\`

\`\`\`ts
// customer-client.msw.test.ts
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadCustomer } from './customer-client';

const server = setupServer(
  http.get('https://crm.example.test/customers/:id', ({ params, request }) => {
    if (request.headers.get('authorization') !== 'Bearer integration-token') {
      return HttpResponse.json({ code: 'unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ id: params.id, tier: 'gold' });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('maps the CRM customer response', async () => {
  await expect(loadCustomer('C-72')).resolves.toEqual({
    id: 'C-72',
    tier: 'gold',
  });
});

it('reports a temporary CRM outage', async () => {
  server.use(
    http.get('https://crm.example.test/customers/:id', () =>
      HttpResponse.json({ code: 'maintenance' }, { status: 503 }),
    ),
  );
  await expect(loadCustomer('C-72')).rejects.toThrow('CRM returned 503');
});
\`\`\`

The default handler describes a reusable healthy CRM. \`server.use()\` prepends a test-specific override, and \`resetHandlers()\` removes runtime overrides after every case. \`onUnhandledRequest: 'error'\` prevents accidental real calls from silently passing through.

This style scales well when frontend component tests, Node integration tests, and local development need the same scenarios. Put handlers in a transport-focused module, not in assertions that know component internals.

## The equivalent test with Nock

Nock makes request expectations explicit in the scope.

\`\`\`ts
// customer-client.nock.test.ts
import { afterEach, beforeAll, expect, it } from 'vitest';
import nock from 'nock';
import { loadCustomer } from './customer-client';

beforeAll(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  const pending = nock.pendingMocks();
  nock.cleanAll();
  if (pending.length > 0) {
    throw new Error(\`Unused HTTP mocks: \${pending.join(', ')}\`);
  }
});

it('sends credentials and loads the requested customer', async () => {
  const crm = nock('https://crm.example.test', {
    reqheaders: { authorization: 'Bearer integration-token' },
  })
    .get('/customers/C-72')
    .reply(200, { id: 'C-72', tier: 'gold' });

  await expect(loadCustomer('C-72')).resolves.toEqual({
    id: 'C-72',
    tier: 'gold',
  });
  crm.done();
});
\`\`\`

Calling \`done()\` asserts that the interceptor was consumed. The global cleanup check is valuable when a test throws before reaching \`done()\`, but structure it so cleanup always occurs and the pending diagnostic is not lost. Restore network settings after the suite if other tests in the same process require connections.

Nock interceptors are one-shot by default. A second identical request becomes an unexpected request unless the test declares another interceptor, uses \`.times(n)\`, or chooses persistence. That behavior catches accidental retries and duplicate sends naturally.

## Request assertions: behavior versus expectation

With Nock, matching a body or header is part of whether the interceptor can respond. A mismatch often fails the client request and leaves the expected mock pending. With MSW, a handler can inspect the request and return an error response, or the test can record observations in a spy. Prefer returning domain-realistic errors when the provider would reject malformed input.

\`\`\`ts
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';

const observedCharge = vi.fn();

const chargeHandler = http.post(
  'https://payments.example.test/charges',
  async ({ request }) => {
    const body = (await request.json()) as { cents?: number; currency?: string };
    observedCharge({
      body,
      idempotencyKey: request.headers.get('idempotency-key'),
    });
    if (!body.cents || !body.currency) {
      return HttpResponse.json({ error: 'invalid_charge' }, { status: 422 });
    }
    return HttpResponse.json({ id: 'ch_test_1' }, { status: 201 });
  },
);
\`\`\`

Reset \`observedCharge\` between tests. Shared mutable observation is easy to leak under concurrent execution, so keep such tests sequential or create isolated server state per test file. When exact request count is the main contract, Nock usually expresses it with less auxiliary state.

## Unmatched traffic is a safety decision

Tests should not reach public services accidentally. MSW can error on unhandled requests through \`server.listen({ onUnhandledRequest: 'error' })\`. Nock can call \`nock.disableNetConnect()\`. Local application integration may require a narrow exception:

\`\`\`ts
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');
\`\`\`

Broadly enabling localhost can still permit unintended calls to other local services. Prefer the most specific host and test architecture available. MSW's unhandled strategy also supports warning or bypass, but strict error behavior is the better default for automated tests.

| Unmatched-request policy | Benefit | Failure mode |
|---|---|---|
| Error or disabled network | Deterministic, prevents credentialed leakage | Every intentional integration must be allowed explicitly |
| Warning | Helps migration without immediate breakage | CI can remain green while real traffic occurs |
| Bypass | Useful for hybrid local development | Tests depend on network and provider state |
| Predicate-based exception | Supports local server plus mocked vendors | An overly broad predicate creates holes |

The [API mocking and service virtualization guide](/blog/api-mocking-service-virtualization-guide) covers where process interception fits relative to simulators and deployed stubs.

## Retries, ordering, and cardinality

Nock is particularly expressive for a client retry algorithm:

\`\`\`ts
it('retries one 503 and then returns the customer', async () => {
  const crm = nock('https://crm.example.test')
    .get('/customers/C-72')
    .reply(503, { code: 'busy' })
    .get('/customers/C-72')
    .reply(200, { id: 'C-72', tier: 'gold' });

  await expect(loadCustomerWithRetry('C-72')).resolves.toMatchObject({ id: 'C-72' });
  crm.done();
});
\`\`\`

In MSW, a closure counter or one-time runtime override can return different responses across calls. That is flexible, but concurrency can make global counters brittle. Scope scenario state to the test and restore handlers.

Do not use persisted Nock interceptors by default. A persisted scope is considered done after its first match and continues intercepting later calls, which can mask an unexpected loop. Declare \`.times()\` when exact repetition is known.

## Client compatibility and runtime boundaries

Both projects have evolved with Node's networking ecosystem. Verify interception with the actual client, Node version, test environment, and module format in your repository. An HTTP mock that works with one adapter may not prove another adapter uses the same interception path. This is especially relevant when a client library switches between Node HTTP, Undici-based fetch, browser-like adapters, or worker threads.

Do not infer support from a toy \`http.get\` if production uses a different transport. Add one canary test using the real client and fail strict on unmatched network.

Interception is process-local. Child processes, separate worker processes, and external containers do not automatically inherit handlers or Nock state. Use a real stub server when the system under test crosses process boundaries.

## Lifecycle and test isolation

MSW's reliable pattern is \`listen\` once, \`resetHandlers\` after each test, and \`close\` after the suite. Nock needs pending expectation checks, \`cleanAll\`, and careful restoration of network policy. \`abortPendingRequests()\` can stop current pending work when necessary.

Do not let one test install a broad handler or persistent interceptor that another test consumes. Parallel files sharing one process can turn global interception state into order dependence. Prefer runner isolation, narrowly scoped handlers, and suite-local cleanup.

## Migration without rewriting the assertion strategy

When moving Nock tests to MSW, distinguish response fixtures from call expectations. Response fixtures translate naturally into handlers. Exact cardinality expectations need explicit observation or output assertions. Do not mechanically convert every \`scope.done()\` into a spy if the call count was never business-relevant.

When moving MSW tests to Nock, reusable scenario handlers may become repetitive one-shot scopes. Extract small scope builders, but preserve visible cardinality. Avoid a giant persistent Nock setup that recreates an always-on fake server and loses Nock's strongest expectation semantics.

## A practical selection matrix

| Testing situation | Better starting choice | Reason |
|---|---|---|
| React component and Node service share API scenarios | MSW | Handler vocabulary can be reused across environments |
| SDK must send one exact signed request | Nock | Header, body, path, and consumption form one expectation |
| GraphQL query scenarios | MSW | GraphQL operation handlers express intent directly |
| Retry and duplicate-request protection | Nock | One-shot interceptors expose extra calls naturally |
| Large fake REST surface for many consumers | MSW | Resource-oriented handlers remain readable |
| Multi-process end-to-end test | Neither alone | Run a reachable stub or simulator |

The [MSW API mocking guide](/blog/msw-api-mocking-guide) goes deeper on handler organization and browser reuse. The best choice can be both at different layers, but avoid activating both interceptors in the same process for the same host. Debugging which library captured a request is not worth the apparent convenience.

## JSON matching reveals the core tradeoff

Nock can make a body part of interceptor selection. This is concise when an exact outbound representation is the contract.

\`\`\`ts
const payment = nock('https://payments.example.test')
  .post('/charges', { cents: 2500, currency: 'USD' })
  .matchHeader('idempotency-key', /^[0-9a-f-]{36}$/)
  .reply(201, { id: 'ch_42' });

await createCharge({ cents: 2500, currency: 'USD' });
payment.done();
\`\`\`

A mismatch produces “no matching interceptor” behavior and leaves the expectation pending. MSW handlers more naturally parse a request and return the provider's realistic 422 response. Decide whether malformed traffic should fail the harness immediately or exercise client error mapping.

## Transport failures are not HTTP errors

A 503 is an HTTP response. Connection refusal, an aborted body, and a client timeout exercise different branches. Both libraries have documented mechanisms for delays and network failures, but use the API supported by the installed version rather than inventing a timeout status.

| Scenario | Client behavior worth asserting |
|---|---|
| 429 with retry header | Backoff and maximum attempts |
| 503 JSON response | Error mapping and retry eligibility |
| Connection failure | Transport exception normalization |
| Body stalls after headers | Body-read timeout and cancellation |
| Malformed JSON with 200 | Parse failure never becomes success |
| Abort signal | Underlying work stops and resources release |

Fake timers can speed retry cases, but timer advancement and intercepted promises need coordination. Inject a retry-delay function when possible and retain one real-timer integration test.

## Treat recordings as discovery material

Nock recording helps discover an unfamiliar client's calls. Captured tokens, dates, IDs, and provider payloads make unsafe, brittle fixtures. Sanitize recordings, minimize them to fields the test owns, and disable recording before mocks run. A cassette is not evidence of the provider's current contract.

MSW encourages hand-authored behaviors. When provider fidelity matters, validate against a published schema or sandbox in a separate contract suite. Process interception should keep unit and integration tests deterministic, not masquerade as provider certification.

## GraphQL favors operation-aware handlers

GraphQL puts many operations behind one URL. Nock must distinguish them through request-body predicates, while MSW's GraphQL handlers name operations directly. MSW is generally clearer for shared GraphQL scenarios. Nock remains valuable when exact HTTP serialization, persisted-query hashes, and transport headers are the subject.

Do not assume ordinary HTTP mocks cover subscriptions or WebSockets. Use a protocol-aware fake server or an explicitly supported interception feature for those transports.

## Helpers must preserve library semantics

A Nock helper should return its scope so the test can call \`done()\` and observe cardinality. An MSW helper should return handlers or scenario data, not mutate a hidden global server unpredictably. Neither helper should silently persist all routes, bypass unmatched requests, or swallow pending expectations.

Name helpers by provider behavior: \`crmCustomerFound\` or \`paymentDeclined\` communicates more than \`mockGet\`. Reviewers should see the host, resource, response scenario, and whether request consumption is asserted.

## Contract drift requires a separate signal

Both tools happily return a response shape that production no longer serves. Validate handler fixtures against checked-in JSON Schema or generated types where trustworthy, and run a small provider contract suite against a controlled environment. Do not couple every fast test to live traffic.

When a schema changes, update the adapter, contract fixture, and mock together in one review. A handler library cannot prevent coordinated mistakes, but schema validation makes drift visible.

## Parallel test files need explicit ownership

Both libraries install interception state within a process. Test runners may isolate files in workers, but hooks inside one file still share the server or Nock registry. Do not depend on file execution order or a handler installed by another suite. Each file should own setup and teardown, or import a setup module whose lifecycle is registered once per worker.

MSW runtime overrides are stack-like in effect: a later matching handler can take precedence until \`resetHandlers()\`. Give every test a reset even if it currently uses only default handlers. Nock should check pending mocks before cleanup, otherwise \`cleanAll()\` erases the evidence that an expected call never happened.

## Diagnose interception misses from the URL outward

Compare protocol, hostname, port, path, query encoding, method, body, and headers in that order. A client configured with \`http://\` will not match an \`https://\` scope. Default ports and trailing slashes can also matter. Log sanitized request metadata, never authorization values.

With Nock, inspect \`pendingMocks()\` when a scope is incomplete. With MSW strict unhandled behavior, use the reported request and handler list. Resist broad regular expressions added only to make a failure disappear. Relax matching when variation is part of the provider contract, and retain exact checks for signatures, tenant headers, and idempotency keys.

## Frequently Asked Questions

### Does MSW assert that a handler was called?

Not as its default handler contract. It focuses on returning mocked network behavior. Record requests with a test-local spy or assert the application outcome when call occurrence matters. Nock's consumed interceptor and \`done()\` are more direct for mandatory calls.

### Why does a second request fail in Nock?

Nock consumes an interceptor after one match by default. Declare a second response, use \`.times(n)\`, or persist the interceptor only when repeated calls are intended. The default often catches duplicate traffic usefully.

### Can MSW handlers be shared between Node and browser tests?

Yes, request handlers can be shared, while setup differs: Node uses \`setupServer\` and browser execution uses \`setupWorker\`. Keep environment lifecycle code separate from the handler definitions.

### Will either library mock requests from a child process?

No. Their interception state lives in the process where it is installed. A spawned service or container needs a network-reachable fake server, proxy, or service virtualization component.

### Which tool is safer against accidental real network calls?

Both can be strict when configured: use MSW's \`onUnhandledRequest: 'error'\` or Nock's \`disableNetConnect()\`. The safer suite is the one that enables strict mode consistently and grants only narrow, reviewed exceptions.
`,
};
