import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'gRPC Streaming Contract Testing Guide',
  description:
    'Build gRPC streaming contract tests for server, client, and bidirectional streams so ordering, metadata, completion, and retries stay reliable.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# gRPC Streaming Contract Testing Guide

The bug report says the map stopped updating after the third vehicle, but unary contract tests are green. That is the moment streaming gRPC becomes different from ordinary API testing. The response is not a single object. It is a sequence, a timing relationship, a completion signal, metadata, cancellation behavior, and sometimes backpressure. If your contract only checks the first message, you are not testing the contract users actually depend on.

Streaming contracts need more care than snapshotting protobuf messages. A server-streaming method can return valid messages in the wrong order. A client-streaming method can accept the first write and ignore the rest. A bidirectional stream can work in happy-path demos and fail when one side closes early. These are contract problems, not just integration bugs.

This guide uses Node with @grpc/grpc-js because it exposes the core stream shapes clearly and is common in test harnesses. The same contract ideas apply in Java, Go, Python, and .NET: define the observable stream behavior, exercise the stream through a real client, and assert message sequence, status, metadata, deadlines, and close behavior. For broader gRPC API coverage, use this with [the complete gRPC API testing guide](/blog/grpc-api-testing-complete-guide-2026). For manual probing and shell-level checks, [the grpcurl guide](/blog/grpcurl-api-testing-guide-2026) is a useful companion.

## Streaming contracts are sequence contracts

Unary gRPC contract tests usually assert request schema, response schema, status code, and selected fields. Streaming adds temporal obligations. The consumer may rely on the first message being a snapshot, later messages being deltas, and end-of-stream meaning the server finished scanning. None of that is captured by a single protobuf descriptor.

| Stream type | Contract question | Failure that schema tests miss |
|---|---|---|
| Server streaming | What messages are emitted, in what order, and when does the server end? | Server sends all valid records but sorts them incorrectly |
| Client streaming | How does the server aggregate writes before responding? | Server acknowledges after first message and drops later writes |
| Bidirectional streaming | Which side can write, read, half-close, or cancel at each phase? | Client and server deadlock because both wait for the other side |
| Long-lived subscription | What heartbeat, resume, or cancellation behavior is promised? | Stream stays open but silently stops sending updates |
| Erroring stream | Which status and trailers are returned after partial output? | Consumer receives data then an unexpected UNKNOWN status |

The word contract should mean "what a consumer can safely build on." For streaming APIs, that includes ordering, lifecycle, and status semantics. Do not let the proto file be the whole contract.

## A small route guide contract to test

The classic route guide shape is still useful because it contains all three streaming modes. A map service lists features in a rectangle, records a route from client-sent points, and exchanges chat notes in both directions.

\`\`\`proto
syntax = "proto3";

package routeguide;

service RouteGuide {
  rpc ListFeatures(Rectangle) returns (stream Feature);
  rpc RecordRoute(stream Point) returns (RouteSummary);
  rpc RouteChat(stream RouteNote) returns (stream RouteNote);
}

message Point {
  int32 latitude = 1;
  int32 longitude = 2;
}

message Rectangle {
  Point lo = 1;
  Point hi = 2;
}

message Feature {
  string name = 1;
  Point location = 2;
}

message RouteSummary {
  int32 point_count = 1;
  int32 feature_count = 2;
}

message RouteNote {
  Point location = 1;
  string message = 2;
}
\`\`\`

That proto defines message shapes and method streaming direction. It does not define whether ListFeatures is sorted, whether RecordRoute counts duplicate points, whether RouteChat echoes old notes at a location, or what happens when the client deadline expires. Those decisions belong in contract examples.

## Testing a server-streaming method through the real client

A server-streaming contract should collect the stream to completion unless the scenario intentionally cancels. In Node, a server-streaming client call returns a readable stream. The test listens for data, error, and end. The contract below asserts that a rectangle query returns features ordered west to east and then ends successfully.

\`\`\`ts
import assert from 'node:assert/strict';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const packageDefinition = protoLoader.loadSync('route_guide.proto', {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
const client = new loaded.routeguide.RouteGuide(
  '127.0.0.1:50051',
  grpc.credentials.createInsecure(),
);

function listFeatures(rectangle: unknown): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const messages: any[] = [];
    const call = client.ListFeatures(rectangle);

    call.on('data', (feature: any) => messages.push(feature));
    call.on('error', reject);
    call.on('end', () => resolve(messages));
  });
}

async function contract_listFeatures_ordersResultsAndCompletes() {
  const features = await listFeatures({
    lo: { latitude: 400000000, longitude: -750000000 },
    hi: { latitude: 420000000, longitude: -730000000 },
  });

  assert.deepEqual(
    features.map((feature) => feature.name),
    ['Delaware River Marker', 'Hamilton Station', 'Liberty Harbor'],
  );
  assert.ok(features.every((feature) => feature.location.longitude >= -750000000));
}

contract_listFeatures_ordersResultsAndCompletes().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

The assertion is intentionally about sequence, not just membership. If the consumer renders the first feature as the nearest marker, order is part of the contract. If order is not promised, the test should sort before comparing and the contract should say ordering is undefined. Ambiguity is where streaming tests become flaky.

## Client-streaming contracts for aggregation behavior

Client streaming reverses the risk. The client sends multiple messages and receives one response. The contract must prove the server waits for the intended close signal and aggregates all writes. In @grpc/grpc-js, the client gets a writable stream and calls end when finished.

\`\`\`ts
import assert from 'node:assert/strict';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const packageDefinition = protoLoader.loadSync('route_guide.proto');
const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
const client = new loaded.routeguide.RouteGuide(
  '127.0.0.1:50051',
  grpc.credentials.createInsecure(),
);

function recordRoute(points: Array<{ latitude: number; longitude: number }>): Promise<any> {
  return new Promise((resolve, reject) => {
    const call = client.RecordRoute((error: grpc.ServiceError | null, summary: any) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(summary);
    });

    for (const point of points) {
      call.write(point);
    }

    call.end();
  });
}

async function contract_recordRoute_countsEveryClientMessage() {
  const summary = await recordRoute([
    { latitude: 409146138, longitude: -746188906 },
    { latitude: 411733222, longitude: -744228360 },
    { latitude: 413628156, longitude: -749015468 },
  ]);

  assert.equal(summary.pointCount, 3);
  assert.equal(summary.featureCount, 2);
}

contract_recordRoute_countsEveryClientMessage().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

This test catches a server that responds after the first write, forgets to count points without named features, or mishandles field casing from the proto loader. It also documents that duplicates and unknown points should still contribute to pointCount if that is the agreed behavior.

## Bidirectional streams need a conversation script

Bidirectional streaming can be full-duplex, but tests should still define a conversation. Without a script, assertions become race-prone. Decide whether the server echoes immediately, batches messages, sends historical notes first, or waits for client completion.

| Conversation rule | Test technique | Example assertion |
|---|---|---|
| Server sends prior notes for a location | Write one note, wait for all returned notes for that location | First response contains existing message before new echo |
| Server echoes only matching locations | Write notes to two points | Responses for point A do not include point B |
| Client half-close ends response stream | Write notes, call end | end event occurs after final expected response |
| Cancellation stops server work | Cancel after first response | Server returns CANCELLED or stops producing messages |
| Deadline is enforced | Set call deadline in metadata/options | Error code is DEADLINE_EXCEEDED |

Bidirectional tests often need a small helper that collects messages until a predicate is met. Avoid sleeping for an arbitrary number of milliseconds. Instead, resolve when the expected count arrives, when the stream ends, or when a timeout fails the test.

\`\`\`ts
import assert from 'node:assert/strict';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const packageDefinition = protoLoader.loadSync('route_guide.proto');
const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
const client = new loaded.routeguide.RouteGuide(
  '127.0.0.1:50051',
  grpc.credentials.createInsecure(),
);

async function contract_routeChat_returnsNotesForMatchingLocations() {
  const received: any[] = [];
  const call = client.RouteChat();

  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for notes')), 3000);

    call.on('data', (note: any) => {
      received.push(note);
      if (received.length === 2) {
        clearTimeout(timer);
        resolve();
      }
    });

    call.on('error', (error: grpc.ServiceError) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  call.write({
    location: { latitude: 409146138, longitude: -746188906 },
    message: 'driver arrived at marker',
  });
  call.write({
    location: { latitude: 409146138, longitude: -746188906 },
    message: 'passenger boarded',
  });

  await done;
  call.end();

  assert.deepEqual(
    received.map((note) => note.message),
    ['driver arrived at marker', 'passenger boarded'],
  );
}

contract_routeChat_returnsNotesForMatchingLocations().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
\`\`\`

That contract says something precise: the server returns notes for the same location in the order written. If the real service promises a different rule, write that rule instead. The danger is leaving the bidirectional interaction implicit and then accepting any two messages as success.

## Metadata and deadlines are part of the stream contract

Many streaming APIs require metadata for tenant, authorization, trace IDs, or feature gates. Contract tests should prove required metadata is enforced. They should also cover deadlines because streams that never end are expensive failures.

In Node, metadata is created with new grpc.Metadata and passed to the call. Deadlines can be passed through call options. The exact method overload differs by unary, readable stream, writable stream, and duplex stream, so keep small helpers per stream type.

\`\`\`ts
import assert from 'node:assert/strict';
import grpc from '@grpc/grpc-js';

async function expectUnauthenticatedListFeatures(client: any) {
  const metadata = new grpc.Metadata();

  await new Promise<void>((resolve, reject) => {
    const call = client.ListFeatures(
      { lo: { latitude: 0, longitude: 0 }, hi: { latitude: 1, longitude: 1 } },
      metadata,
    );

    call.on('data', () => reject(new Error('Expected no feature without tenant metadata')));
    call.on('error', (error: grpc.ServiceError) => {
      try {
        assert.equal(error.code, grpc.status.UNAUTHENTICATED);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
    call.on('end', () => reject(new Error('Stream ended without auth error')));
  });
}
\`\`\`

Do not only test happy streams. Consumers care how streams fail after partial output. If the server emits three messages and then returns RESOURCE_EXHAUSTED, the client behavior is different than a clean end. That should be a named contract scenario.

## Provider and consumer ownership

Streaming contract tests can be provider-owned, consumer-owned, or shared. Provider-owned tests run against the service and prove advertised behavior. Consumer-owned tests run against a fake or a contract test server and prove client handling. Shared tests are useful when multiple clients depend on the same sequencing rules.

| Ownership model | Strength | Weakness | Use it when |
|---|---|---|---|
| Provider-owned stream contracts | Catches server regressions before release | May miss client interpretation bugs | Service team owns the gRPC API |
| Consumer-owned client contracts | Documents what the client truly needs | Can drift from provider if not verified | Client has strict ordering or retry assumptions |
| Shared contract fixtures | Aligns examples across teams | Requires governance over fixture updates | Many clients consume the same stream |
| End-to-end stream tests | Exercises real network and deployment config | Slower and harder to diagnose | Deadlines, metadata, and infrastructure matter |

For most organizations, provider-owned examples are the minimum. Add consumer tests when the stream drives complex UI state, financial calculations, device control, or anything else where a valid message sequence can still be misinterpreted.

## Test data for stream contracts

Streaming tests need deterministic data. If ListFeatures reads from a database that changes during the test, ordering assertions become noise. Seed a known dataset or run the service against a fixture store. For long-lived streams, provide a test-only publisher that emits known events in a known order.

Avoid using production-like high volume in contract tests. Volume belongs in performance and soak tests. Contract tests should be small enough that a failed sequence is obvious. Three messages can prove ordering. Two locations can prove filtering. One deadline can prove timeout behavior.

## Versioning streamed behavior

Protobuf compatibility rules protect field evolution, but they do not protect behavioral changes. A provider can add a new message type, change sort order, or stop sending heartbeats without breaking proto compatibility. Consumers may still break.

Document behavioral versioning near the contract examples. If a new server version changes the initial snapshot rule, add a new scenario and keep the old one while old consumers exist. If a field becomes optional in practice, contract tests should include the missing-field case.

## Cancellation and partial-output contracts

Streaming APIs also need cancellation contracts. Consumers cancel when a user leaves a page, a mobile connection drops, a deadline expires, or an upstream workflow no longer needs results. The provider should stop expensive work promptly and return a status the client handles deliberately. If cancellation is not tested, servers often keep scanning, keep holding locks, or log noisy UNKNOWN errors that hide real failures.

For server-streaming calls, add a scenario that reads the first valid message and then cancels the call. The assertion may be on server metrics, a test double around the repository, or a logged cancellation status in an integration harness. For client-streaming calls, test what happens when the client closes without sending required minimum input. For bidirectional streams, test half-close separately from full cancellation because they mean different things to many protocols.

Partial output deserves its own example. If a route service emits two features and then hits a permission error, can the client render partial data, or must it discard everything? Both choices can be valid. The contract must name the choice. Tests should assert the status code, the messages received before error, and whether trailers include the diagnostic metadata the client needs. Without that, every consumer invents its own policy after the first production failure.

## Contract fixtures for streaming data

Keep stream fixtures small and named by behavior. A fixture called three_points_two_features is more useful than route_fixture_1. Put the expected sequence beside the input, not in a separate spreadsheet. When a consumer depends on interleaving messages, encode the interleaving explicitly.

For generated clients, run the same contract fixtures after regenerating code from proto changes. This catches field casing, default value, and oneof interpretation problems that do not appear in the proto compiler output. It also protects teams using different languages. A Java client and a Node client can both satisfy protobuf compatibility while still exposing different runtime defaults to application code.

## Frequently Asked Questions

### Is the proto file enough for a gRPC streaming contract?

No. The proto defines method shape and message fields, but it does not define ordering, completion, partial failure, retry semantics, heartbeat rules, or deadline behavior. Streaming contract tests should cover those observable behaviors.

### Should I assert every streamed message field?

Assert fields that define the consumer contract. For a map stream, location and name may matter while an internal source label does not. Over-asserting makes tests brittle when harmless fields change.

### How do I test streams that are intended to stay open?

Use a bounded contract scenario. Subscribe, trigger a known event, assert the received message, then cancel or close the client side. Keep unbounded soak behavior in a separate reliability test.

### What is the best way to test stream ordering?

Seed a small deterministic dataset and assert the exact sequence of business keys. Do not rely on timestamps generated during the test unless the timestamp order is the contract.

### Can grpcurl test streaming contracts?

grpcurl is excellent for manual probing and scripted smoke checks, including streaming calls. For richer contract assertions around ordering, deadlines, and partial failures, a language-level test harness is usually easier to maintain.
`,
};
