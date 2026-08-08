import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'gRPC Testing Metadata Propagation Across Service Boundaries',
  description: 'Master gRPC testing metadata propagation with runnable Node tests for request headers, response headers, trailers, binary values, and multi-hop forwarding.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# gRPC Testing Metadata Propagation Across Service Boundaries

gRPC testing metadata propagation means proving that call-scoped context enters through client metadata, survives every intended service boundary, reaches the correct downstream RPC, and returns through response headers or trailers without leaking, duplicating, or mutating forbidden values. Test the complete path, not just a helper that calls \`metadata.set()\`. The bugs that matter happen at adapters, interceptors, retries, gateways, and asynchronous handoffs.

A strong test suite covers four channels: client request metadata, server initial response metadata, server trailing metadata, and binary metadata whose key ends in \`-bin\`. It also verifies policy. Authentication may be consumed and replaced, trace context may be forwarded, tenant context may be validated, and internal debug fields may be blocked at an external boundary.

This guide builds a runnable Node.js harness with \`@grpc/grpc-js\` and \`@grpc/proto-loader\`, then extends it to a two-service chain. The protocol overview is at https://grpc.io/docs/guides/metadata/. If you also test conventional Node HTTP endpoints, see the [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide). To govern request and response messages between teams, add [Pact contract testing](/blog/contract-testing-pact-complete-guide) alongside metadata tests.

## Model metadata as four observable channels

Metadata is associated with an RPC but is not part of the protobuf message. In gRPC it maps to HTTP/2 headers and trailers. That side channel is useful for credentials, tracing, routing hints, quotas, and diagnostic information, but it is easy to test incompletely.

| Channel | Direction | Typical contents | Node observation point |
|---|---|---|---|
| Request metadata | Client to server | Authorization, trace context, tenant | \`call.metadata\` in handler |
| Initial response metadata | Server to client before response | Request id, selected region | Client call \`metadata\` event |
| Trailing metadata | Server to client at completion | Quota, diagnostic detail | Client call \`status\` event metadata |
| Binary metadata | Either direction | Opaque correlation bytes | \`Buffer\` under a \`-bin\` key |

Custom keys are case-insensitive, and implementations normalize them. Keys beginning with \`grpc-\` are reserved. ASCII metadata values are strings; binary keys must end with \`-bin\` and use binary values. Servers may limit request-header size, so metadata is not a place for full user profiles or large serialized objects.

The most important architectural question is not "was the key copied?" It is "was this key allowed to cross this boundary?" A propagation policy needs an allowlist, validation rules, ownership, and a clear behavior for missing or malformed values.

## Build a small service that exposes metadata behavior

Start with a protobuf contract that keeps business data in messages. Metadata will carry only call context.

\`\`\`proto
// proto/catalog.proto
syntax = "proto3";

package catalog;

service Catalog {
  rpc GetItem(GetItemRequest) returns (GetItemResponse);
}

message GetItemRequest {
  string id = 1;
}

message GetItemResponse {
  string id = 1;
  string name = 2;
}
\`\`\`

Install the documented Node implementation and loader:

\`\`\`bash
npm install @grpc/grpc-js @grpc/proto-loader
\`\`\`

The server reads request metadata, sends an initial request id, and returns quota information as trailing metadata. This is a complete ES module that can be imported by tests.

\`\`\`js
// src/catalog-server.mjs
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'node:url';

const protoPath = fileURLToPath(new URL('../proto/catalog.proto', import.meta.url));
const definition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const loaded = grpc.loadPackageDefinition(definition);
export const CatalogClient = loaded.catalog.Catalog;

export async function startCatalogServer() {
  const server = new grpc.Server();

  server.addService(loaded.catalog.Catalog.service, {
    getItem(call, callback) {
      const requestIds = call.metadata.get('x-request-id');
      const tenantIds = call.metadata.get('x-tenant-id');

      if (requestIds.length !== 1 || tenantIds.length !== 1) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          details: 'Exactly one request id and tenant id are required',
        });
        return;
      }

      const initial = new grpc.Metadata();
      initial.set('x-request-id', String(requestIds[0]));
      initial.set('x-serving-region', 'test-region');
      call.sendMetadata(initial);

      const trailer = new grpc.Metadata();
      trailer.set('x-quota-remaining', '49');

      callback(null, {
        id: call.request.id,
        name: 'Mechanical keyboard',
      }, trailer);
    },
  });

  const port = await new Promise((resolve, reject) => {
    server.bindAsync(
      '127.0.0.1:0',
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => error ? reject(error) : resolve(boundPort),
    );
  });

  return {
    address: '127.0.0.1:' + port,
    close: () => server.forceShutdown(),
  };
}
\`\`\`

Binding to port zero asks the operating system for an available port, reducing collisions during parallel test execution. The handler validates cardinality before converting values, which prevents a duplicate header from silently becoming a comma-joined identity.

## Capture headers and trailers from one unary call

Unary client callbacks receive the response or error, but initial metadata arrives through the returned call's \`metadata\` event and final status arrives through \`status\`. Wrap all three signals in one promise so tests cannot finish before trailers arrive.

\`\`\`js
// test/call-unary.mjs
export function callUnary(startCall) {
  return new Promise((resolve) => {
    let initialMetadata;
    let response;
    let callbackError;

    const call = startCall((error, value) => {
      callbackError = error ?? undefined;
      response = value;
    });

    call.on('metadata', (metadata) => {
      initialMetadata = metadata;
    });

    call.on('status', (status) => {
      resolve({
        response,
        callbackError,
        initialMetadata,
        status,
      });
    });
  });
}
\`\`\`

This helper does not reject on a non-OK status because negative tests need to inspect the error and status. It does assume the supplied function starts a unary call and returns its client call object. That contract is explicit and exercised below.

\`\`\`js
// test/catalog-metadata.test.mjs
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import grpc from '@grpc/grpc-js';
import { CatalogClient, startCatalogServer } from '../src/catalog-server.mjs';
import { callUnary } from './call-unary.mjs';

let server;
let client;

before(async () => {
  server = await startCatalogServer();
  client = new CatalogClient(server.address, grpc.credentials.createInsecure());
});

after(() => {
  client.close();
  server.close();
});

test('propagates request id and returns headers plus trailers', async () => {
  const requestMetadata = new grpc.Metadata();
  requestMetadata.set('x-request-id', 'req-104');
  requestMetadata.set('x-tenant-id', 'tenant-blue');

  const result = await callUnary((callback) =>
    client.getItem({ id: 'sku-7' }, requestMetadata, callback));

  assert.equal(result.callbackError, undefined);
  assert.deepEqual(result.response, {
    id: 'sku-7',
    name: 'Mechanical keyboard',
  });
  assert.deepEqual(result.initialMetadata.get('x-request-id'), ['req-104']);
  assert.deepEqual(result.initialMetadata.get('x-serving-region'), ['test-region']);
  assert.equal(result.status.code, grpc.status.OK);
  assert.deepEqual(result.status.metadata.get('x-quota-remaining'), ['49']);
});
\`\`\`

Run the test with Node's built-in runner:

\`\`\`bash
node --test test/catalog-metadata.test.mjs
\`\`\`

This first test proves every observable channel used by the service. It does not yet prove multi-hop forwarding, rejection behavior, binary handling, or isolation across concurrent calls.

## Assert cardinality, absence, and mutation, not only equality

\`Metadata.get(key)\` returns all associated values. \`set\` replaces existing values, while \`add\` appends another value. Tests that compare only the first value miss duplicates, and duplicates can create security or routing ambiguity.

| Assertion | Defect detected | Example risk |
|---|---|---|
| Exactly one value | Duplicate injection | Two tenant identities |
| Key absent | Boundary leak | Authorization forwarded to analytics |
| Value preserved | Accidental rewrite | Trace id changes between services |
| Value replaced | Stale credential retained | Old and new tokens both present |
| Buffer equality | Encoding corruption | Binary context converted to text |

Add a negative test to the same file:

\`\`\`js
test('rejects duplicate tenant metadata', async () => {
  const requestMetadata = new grpc.Metadata();
  requestMetadata.set('x-request-id', 'req-duplicate');
  requestMetadata.add('x-tenant-id', 'tenant-blue');
  requestMetadata.add('x-tenant-id', 'tenant-red');

  const result = await callUnary((callback) =>
    client.getItem({ id: 'sku-7' }, requestMetadata, callback));

  assert.equal(result.response, undefined);
  assert.equal(result.callbackError.code, grpc.status.INVALID_ARGUMENT);
  assert.match(result.callbackError.details, /Exactly one request id and tenant id/);
  assert.equal(result.status.code, grpc.status.INVALID_ARGUMENT);
});
\`\`\`

What people get wrong is using \`getMap()\` for security-sensitive cardinality checks. That convenience method exposes a single value per key, so it does not express whether a sender supplied duplicates. Use \`get()\` when multiplicity matters.

## Encode propagation policy as an allowlist

Blindly cloning inbound metadata to a downstream client is easy and unsafe. Hop-by-hop diagnostics, external authorization, debugging flags, and oversized custom fields may cross a trust boundary. Instead, construct new metadata from an allowlist and define transformation rules.

\`\`\`js
// src/forward-metadata.mjs
import grpc from '@grpc/grpc-js';

const forwardedAsciiKeys = [
  'traceparent',
  'tracestate',
  'x-request-id',
  'x-tenant-id',
];

export function metadataForDownstream(inbound) {
  const outbound = new grpc.Metadata();

  for (const key of forwardedAsciiKeys) {
    const values = inbound.get(key);
    if (values.length > 1) {
      throw new Error('Multiple values are not allowed for ' + key);
    }
    if (values.length === 1) {
      const value = values[0];
      if (typeof value !== 'string') {
        throw new TypeError('Expected an ASCII value for ' + key);
      }
      outbound.set(key, value);
    }
  }

  outbound.set('x-caller-service', 'orders-api');
  return outbound;
}
\`\`\`

This helper creates a new object, rejects duplicates, preserves selected trace and tenant fields, and adds a service-owned identity. It intentionally does not forward \`authorization\`. In a real system, Orders might authenticate inbound credentials and acquire a separate credential for Catalog through a supported credential mechanism.

Unit tests make the boundary rule visible:

\`\`\`js
// test/forward-metadata.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import grpc from '@grpc/grpc-js';
import { metadataForDownstream } from '../src/forward-metadata.mjs';

test('forwards allowlisted context and blocks credentials', () => {
  const inbound = new grpc.Metadata();
  inbound.set('x-request-id', 'req-901');
  inbound.set('x-tenant-id', 'tenant-green');
  inbound.set('traceparent', '00-0123456789abcdef0123456789abcdef-0123456789abcdef-01');
  inbound.set('authorization', 'Bearer secret-value');
  inbound.set('x-debug-mode', 'true');

  const outbound = metadataForDownstream(inbound);

  assert.deepEqual(outbound.get('x-request-id'), ['req-901']);
  assert.deepEqual(outbound.get('x-tenant-id'), ['tenant-green']);
  assert.equal(outbound.get('authorization').length, 0);
  assert.equal(outbound.get('x-debug-mode').length, 0);
  assert.deepEqual(outbound.get('x-caller-service'), ['orders-api']);
});
\`\`\`

This unit test is fast, but it is not sufficient. The next level must prove that the Orders handler actually uses the policy result when it invokes Catalog.

## Test a real two-service hop without mocking metadata away

For an integration test, run both servers in process on ephemeral ports. Have Catalog record a safe snapshot of metadata for the assertion, then call Orders and verify what arrived. Keep the recording store per test or keyed by request id so parallel calls cannot overwrite each other.

The essential flow is:

\`\`\`text
test client -> Orders request metadata -> allowlist transform -> Catalog request metadata
            <- Orders response       <- Catalog response metadata and status
\`\`\`

Your assertion matrix should distinguish values at each boundary:

| Key | Client to Orders | Orders to Catalog | Reason |
|---|---:|---:|---|
| \`x-request-id\` | Present | Same value | Cross-service correlation |
| \`traceparent\` | Present | Same or valid child context per tracing design | Distributed trace continuity |
| \`x-tenant-id\` | Present | Validated value | Tenant routing |
| \`authorization\` | Present | Absent or replaced | Credential boundary |
| \`x-caller-service\` | Absent | \`orders-api\` | Downstream caller identity |
| \`x-debug-mode\` | Present in negative test | Absent | Internal policy denial |

Do not replace the downstream client with a mock whose assertion only checks the metadata object passed by Orders. That misses serialization, key normalization, client overload selection, and the actual server observation point. A unit mock is useful in addition to, not instead of, one real transport test.

## Verify binary metadata with byte equality

Binary metadata must use a key ending in \`-bin\` and a \`Buffer\` value in Node. It is not safe to coerce arbitrary bytes through UTF-8 strings. Test exact bytes and multiple-value policy.

\`\`\`js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import grpc from '@grpc/grpc-js';

test('preserves opaque binary correlation bytes', () => {
  const metadata = new grpc.Metadata();
  const expected = Buffer.from([0, 1, 2, 127, 128, 255]);

  metadata.set('x-correlation-bin', expected);

  const values = metadata.get('x-correlation-bin');
  assert.equal(values.length, 1);
  assert.ok(Buffer.isBuffer(values[0]));
  assert.deepEqual(values[0], expected);
});
\`\`\`

A binary unit test should be paired with a transport test if your proxies, language boundaries, or gateways touch that metadata. A Java producer and Node consumer may agree at the gRPC layer while an intermediary applies an unexpected header rule.

## Exercise missing, malformed, oversized, and repeated context

Happy-path equality catches only a small portion of propagation defects. Create a negative matrix before an AI agent generates cases, otherwise it may produce many cosmetic variations of the same successful call.

| Case | Expected behavior | Assertion target |
|---|---|---|
| Missing required tenant | Reject with a documented status | Error code and no downstream call |
| Duplicate singleton key | Reject before authorization or routing | Cardinality error |
| Malformed trace context | Reject or start new trace per policy | Explicit trace behavior |
| Forbidden key | Drop at boundary | Downstream absence |
| Oversized metadata | Reject at configured boundary | Stable status, no retry storm |
| Retry | Preserve logical request id | All attempts correlate without duplication |
| Concurrent tenants | Keep call contexts isolated | Per-request downstream observations |

Avoid asserting an exact transport error message for oversize behavior across every environment. Proxies and servers may enforce different limits and return different details. Assert the contract your service owns, such as validation before forwarding, a documented status code, and the absence of a downstream call.

## Test propagation across async jobs as a new trust boundary

An RPC often validates a request and publishes work to a queue. The eventual worker then calls another gRPC service. That is not automatic gRPC propagation because the original call has ended. Treat the job message as a separate, durable context carrier with its own schema, retention policy, and authenticity controls.

Do not serialize the complete \`Metadata\` object into the job. Extract approved values into named fields, then reconstruct fresh metadata when the worker starts its downstream RPC. This keeps authorization and hop-specific fields from becoming long-lived queue data.

| RPC metadata | Durable job field | Worker behavior |
|---|---|---|
| \`x-request-id\` | \`originRequestId\` | Preserve for correlation |
| \`x-tenant-id\` | \`tenantId\` after validation | Revalidate job authorization context |
| \`traceparent\` | Trace link or approved context field | Follow tracing policy for delayed work |
| \`authorization\` | None | Acquire worker identity separately |
| \`x-debug-mode\` | None | Do not persist an ephemeral control |

A pure adapter makes the policy testable:

\`\`\`js
// src/job-context.mjs
export function jobContextFromMetadata(metadata) {
  const requestIds = metadata.get('x-request-id');
  const tenantIds = metadata.get('x-tenant-id');

  if (requestIds.length !== 1 || tenantIds.length !== 1) {
    throw new Error('Job context requires one request id and one tenant id');
  }
  if (typeof requestIds[0] !== 'string' || typeof tenantIds[0] !== 'string') {
    throw new TypeError('Job context values must be ASCII strings');
  }

  return {
    originRequestId: requestIds[0],
    tenantId: tenantIds[0],
  };
}
\`\`\`

Test queue serialization and deserialization with the real serializer used in production. Then assert that a worker creates a new metadata instance and sends only the permitted fields. Include replay, delayed delivery, and tenant-deletion cases. A tenant that was valid when work was queued may no longer be valid when it executes.

This boundary also changes tracing expectations. A long-delayed job may create a new trace linked to the originating operation instead of pretending one RPC span remained active for hours. Your test should assert the system's documented tracing model, not force byte-for-byte \`traceparent\` equality when the design intentionally creates a new context.

## Cover streaming metadata lifecycle separately

Streaming RPCs add temporal behavior. Initial metadata still arrives before response messages, while final status and trailers arrive after the stream completes. Tests should prove ordering as well as values. For a server-streaming call, record events such as \`metadata\`, every \`data\` message, \`end\`, and \`status\`, then assert the contract your implementation exposes. Do not assume a unary promise helper covers streams.

For client-streaming and bidirectional calls, request metadata belongs to the call, not to each message. If business context can change per item, put that field in the protobuf message rather than trying to mutate call metadata midway. Add cancellation tests so trailers or status are interpreted correctly when the client stops early. Also test backpressure and long-lived streams for accidental context sharing, especially when an interceptor stores current metadata in a module-level variable.

The isolation oracle is straightforward: start two overlapping streams with different tenant and request ids, interleave messages, and verify every server observation remains attached to its own call. A sequential test cannot reveal a shared-global context bug.

## Diagnose a missing trace id at the second hop

A realistic failure looks like this: the test client sends \`traceparent\`, Orders logs it correctly, but Catalog starts an unrelated trace. Unit tests for \`metadataForDownstream\` pass. The initial theory blames the tracing backend.

Work from observation points:

1. Assert \`call.metadata.get('traceparent')\` inside Orders.
2. Record the exact outbound \`Metadata\` object immediately before the Catalog call.
3. Assert metadata at the Catalog handler, using the same request id to correlate evidence.
4. Check the generated client's overload. A call written as \`client.getItem(request, callback)\` cannot transmit the constructed metadata object.
5. Check interceptor order if interceptors rebuild or replace metadata.
6. Inspect whether a gateway permits the key across its boundary.

The common defect is step four: code created correct outbound metadata but called the client overload without it. A mock that only tested the transformer stayed green. The real two-service test fails and points to the adapter.

Another failure mode is shared mutable metadata. One concurrent request calls \`set('x-tenant-id', ...)\` on an object reused by another request. Build a fresh \`Metadata\` per RPC and add a concurrency test with distinct request and tenant pairs.

## Keep observability assertions safe and deterministic

Metadata tests tempt teams to log every header. That can leak bearer tokens and inflate CI output. Record only allowlisted test fields, redact credential values, and store observations in memory for the duration of a test. If a trace id is generated dynamically, assert its format and cross-hop equality rather than a fixed literal.

For retries, define two identifiers if needed: one logical request id stable across attempts, and one attempt id that changes. Do not assume the trace or request policy. Write it down and assert it. Retrying with duplicated metadata values can be as damaging as dropping them.

Finally, keep protocol metadata tests beside service integration tests and keep message compatibility tests beside the protobuf contract. Metadata is usually outside the message schema, so a protobuf compatibility check alone will not detect a removed tenant header or a newly leaked credential.

## Frequently Asked Questions

### What metadata should a gRPC propagation test verify?

Verify request metadata at the receiving handler, initial response metadata at the client's \`metadata\` event, and trailing metadata on final status. For each key, assert cardinality, value, and whether it should exist at that boundary. Include at least one negative case for missing or duplicate singleton keys. If binary metadata is used, compare \`Buffer\` bytes under a key ending in \`-bin\`. Multi-service systems also need a real transport test proving the downstream handler receives the approved subset.

### Should services forward all incoming gRPC metadata automatically?

No. Build new outbound metadata from an explicit allowlist. Some context, such as trace and validated tenant identifiers, may be intended to propagate. Other values, especially external authorization, debug controls, hop-specific diagnostics, and large custom fields, should be consumed, replaced, or dropped. Blind cloning turns an internal convenience into a trust-boundary vulnerability. Unit-test the policy helper, then verify through a real downstream RPC that forbidden keys are absent and service-owned keys are present.

### How do I test gRPC trailers in Node.js?

Start the unary call, retain its returned client call object, and listen for the \`status\` event. The status object includes final metadata, where custom trailers are available. Do not resolve your test promise only from the unary callback, because the final status observation may not have been asserted yet. On the server, pass a \`Metadata\` instance as the trailer argument to the unary callback. Assert both the status code and the trailer's complete value array.

### Why does my metadata helper pass while end-to-end propagation fails?

The helper may correctly create metadata while the adapter never sends it. In Node generated clients, verify that the method call uses the overload that includes the metadata argument. Also inspect interceptor order, gateway allowlists, duplicate handling, and shared mutable objects. Add observation points at inbound handler, immediately before the downstream call, and at the downstream handler. A real in-process two-server test catches serialization and invocation mistakes that a transformer unit test or a mocked client can hide.
`,
};
