import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GraphQL Subscriptions Testing Guide',
  description:
    'Test GraphQL subscriptions with WebSocket clients, async assertions, event ordering, auth refresh, cleanup, and real-time failure diagnostics.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# GraphQL Subscriptions Testing Guide

The mutation passed, the database row changed, and the browser still never received the update. GraphQL subscription failures live between layers: WebSocket handshake, connection init payload, authentication, async iterator wiring, pub/sub filtering, resolver payload shape, client unsubscribe behavior, and timing. A normal GraphQL query test does not exercise those paths.

This guide is about testing subscription behavior with real WebSocket clients and server-side event sources. It assumes you already know GraphQL schema basics and want reliable assertions for real-time flows. For query and mutation coverage, read [GraphQL testing complete guide](/blog/graphql-testing-complete-guide). For lower-level socket behavior, close frames, and protocol diagnostics, use [WebSocket testing guide](/blog/websocket-testing-guide).

## Subscription tests need a live protocol boundary

A subscription resolver can be unit-tested as an async iterator, but that is not enough. The client does not call the resolver directly. It connects over WebSocket, sends a connection initialization message, starts an operation, receives next payloads, and eventually completes or closes. Bugs in any of those steps can make a production real-time UI stale.

The most valuable automated test opens a real WebSocket subscription against a test server, triggers the event through the same mutation or service path production uses, and asserts the received payload. That sounds slower than a resolver unit test, but it covers the integration boundary that actually breaks.

| Risk | Resolver unit test catches it | WebSocket subscription test catches it | Example failure |
|---|---:|---:|---|
| Resolver returns wrong field | Yes | Yes | commentAdded.author is null. |
| Connection init auth rejected | No | Yes | Client connects but receives unauthorized close. |
| Pub/sub topic typo | Sometimes | Yes | Mutation publishes COMMENT_ADDED while subscription listens to COMMENTS_ADDED. |
| Filter logic wrong | Yes if isolated carefully | Yes | User receives events for a different project. |
| Protocol mismatch | No | Yes | Client uses graphql-transport-ws but server expects legacy protocol. |
| Cleanup leak after unsubscribe | No | Yes | Server keeps listener after client completes operation. |
| Event ordering issue | Not usually | Yes | Two updates arrive reversed under real async dispatch. |

## A real graphql-ws client test

The graphql-ws client exposes a subscribe function that works well in tests. Wrap it in a Promise so the test waits for the expected event and rejects on timeout. The example below assumes the server already exposes a subscription named commentAdded and a mutation named addComment.

\`\`\`typescript
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';

function waitForCommentAdded(projectId: string, token: string) {
  const client = createClient({
    url: 'ws://localhost:4000/graphql',
    webSocketImpl: WebSocket,
    connectionParams: {
      Authorization: 'Bearer ' + token,
    },
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      dispose();
      reject(new Error('Timed out waiting for commentAdded'));
    }, 5000);

    const dispose = client.subscribe(
      {
        query: [
          'subscription CommentAdded($projectId: ID!) {',
          '  commentAdded(projectId: $projectId) {',
          '    id',
          '    body',
          '    projectId',
          '  }',
          '}',
        ].join('\\n'),
        variables: { projectId },
      },
      {
        next: (result) => {
          clearTimeout(timeout);
          dispose();
          resolve(result);
        },
        error: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        complete: () => undefined,
      },
    );
  });
}

test('subscriber receives the comment created for the same project', async () => {
  const token = await testTokenForUser('user-1');
  const eventPromise = waitForCommentAdded('project-123', token);

  await request(app)
    .post('/graphql')
    .set('Authorization', 'Bearer ' + token)
    .send({
      query: [
        'mutation AddComment($projectId: ID!, $body: String!) {',
        '  addComment(projectId: $projectId, body: $body) { id }',
        '}',
      ].join('\\n'),
      variables: { projectId: 'project-123', body: 'Ready for review' },
    })
    .expect(200);

  await expect(eventPromise).resolves.toMatchObject({
    data: {
      commentAdded: {
        body: 'Ready for review',
        projectId: 'project-123',
      },
    },
  });
});
\`\`\`

The test subscribes before it triggers the mutation. This ordering matters. If the mutation runs first, a fast pub/sub implementation can emit before the subscription is active, and the test becomes a race disguised as an integration check.

## Testing authentication at connection init

Subscription authentication often happens during connection initialization, not per event. That changes the test plan. You need to cover valid token, missing token, expired token, and user-permission filtering after the connection is accepted. A connection can be valid while a specific subscription operation is forbidden.

Keep auth tests separate from payload tests. A payload test should not debug token shape. An auth test should not need a complex domain mutation. Use the smallest subscription that proves the server enforces the rule.

| Auth scenario | Expected behavior | Useful assertion |
|---|---|---|
| Missing token | Connection rejected or operation error | Client receives an error before any next payload. |
| Expired token | Rejected with auth-specific reason | Close or error message is classified as unauthorized. |
| Valid token, wrong project | Operation succeeds but emits no forbidden event | Trigger another project's event and assert timeout plus no payload. |
| Token expires after connect | Depends on policy | Document whether long-lived sockets are rechecked. |
| Role changes while connected | Depends on policy | Test if the server must revoke or stop events. |
| Malformed connectionParams | Rejected | Server does not throw unhandled exception. |

Do not assume the browser client and test client serialize connectionParams the same way. Use the same protocol package and connection payload shape whenever possible. A common production bug is an auth header that works for HTTP GraphQL but is never sent during WebSocket connection init.

## Server-side test server with useServer

For isolated subscription tests, start a real WebSocket server around your executable schema. The graphql-ws package provides useServer for the graphql-transport-ws protocol. The example below uses ws and @graphql-tools/schema. It is intentionally small so tests can own server startup and teardown.

\`\`\`typescript
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { execute, subscribe } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';

const events = new EventEmitter();

const typeDefs = [
  'type Comment { id: ID!, projectId: ID!, body: String! }',
  'type Query { ping: String! }',
  'type Mutation { addComment(projectId: ID!, body: String!): Comment! }',
  'type Subscription { commentAdded(projectId: ID!): Comment! }',
].join('\\n');

const resolvers = {
  Query: { ping: () => 'pong' },
  Mutation: {
    addComment: (_parent: unknown, args: any) => {
      const comment = { id: 'c1', projectId: args.projectId, body: args.body };
      events.emit('comment', comment);
      return comment;
    },
  },
  Subscription: {
    commentAdded: {
      subscribe: async function* (_parent: unknown, args: any) {
        const queue: any[] = [];
        const listener = (comment: any) => {
          if (comment.projectId === args.projectId) {
            queue.push(comment);
          }
        };

        events.on('comment', listener);
        try {
          while (true) {
            if (queue.length > 0) {
              yield { commentAdded: queue.shift() };
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        } finally {
          events.off('comment', listener);
        }
      },
    },
  },
};

export async function startSubscriptionServer() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const httpServer = createServer();
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const cleanup = useServer({ schema, execute, subscribe }, wsServer);

  await new Promise<void>((resolve) => httpServer.listen(4000, resolve));

  return async () => {
    await cleanup.dispose();
    wsServer.close();
    httpServer.close();
  };
}
\`\`\`

Production code should use a better async iterator abstraction than a polling queue, but the example demonstrates the pieces that the test must exercise: schema, execute, subscribe, WebSocket server, and cleanup.

## Event ordering and multiple payloads

Many subscription tests stop at the first payload. That misses ordering bugs and duplicate events. When the product depends on event order, collect several payloads and assert the sequence. For collaborative editing, counters, notifications, and status timelines, order is part of the behavior.

The test should trigger events through the production path and wait until it has received the expected count. Do not assert strict timing between events unless timing is the feature. Assert order by event data.

| Feature | Payload sequence to assert | Ordering mistake to catch |
|---|---|---|
| Task status timeline | queued, running, completed | completed arrives before running due to async publish ordering. |
| Chat room | message 1, message 2, message 3 | Duplicate delivery or reversed message order. |
| Notification badge | count 1, count 2 | Client receives stale count after fresh count. |
| Auction bid feed | lower bid, higher bid, winner update | Winner event emitted before final bid event. |
| Document collaboration | patch version 4, patch version 5 | Version gap or duplicate patch. |

## Unsubscribe and resource cleanup

A subscription that delivers the right event can still leak. Each active client may register a listener, database cursor, Redis subscription, or pub/sub handler. Tests should verify that cleanup runs when the client disposes the operation and when the socket closes unexpectedly.

Expose listener counts in test-only instrumentation if necessary. Do not expose them in production APIs. The point is to catch a server that keeps per-client listeners forever. In Node, EventEmitter listenerCount can help for local test doubles. In Redis or Kafka-backed pub/sub, use wrapper metrics around subscribe and unsubscribe calls.

A leak test should open a subscription, wait until the server confirms registration, dispose the client operation, then wait until the listener count returns to baseline. This is more valuable than a heap snapshot for normal CI. Heap analysis can follow if the listener-count test fails.

## Handling timeouts without hiding missing events

Every subscription test needs a timeout. Without one, a missing event hangs the test process. The timeout should fail with the subscription name, variables, and trigger action. A generic Jest timeout tells you almost nothing.

Avoid using long timeouts as a substitute for deterministic event triggering. If a local subscription event needs 30 seconds to appear, the system under test is probably doing too much for a normal integration test. Separate the real-time contract from slow background processing by emitting a domain event after the slow work completes, then testing the slow work separately.

## Protocol errors deserve their own tests

GraphQL subscription clients and servers must agree on the WebSocket subprotocol. A server using graphql-transport-ws will not behave like a server using the older subscriptions-transport-ws package. Tests should cover the protocol you support and reject unsupported clients predictably. Otherwise, a frontend upgrade can fail as a mysterious connection close in production.

Protocol tests should stay small. Connect with the expected protocol and confirm a simple subscription starts. Connect with missing connection init data and confirm the server rejects or errors according to your policy. If the server supports keepalive or ping-pong behavior, assert that an idle connection remains healthy for the required window. These tests belong closer to the subscription server than to product feature tests.

| Protocol behavior | Test setup | Expected result |
|---|---|---|
| Correct graphql-transport-ws client | Client sends connection init and subscribe | Server accepts and can deliver next payload. |
| Missing auth in connection params | Client connects without token | Server rejects connection or returns operation error. |
| Unsupported subprotocol | Raw WebSocket uses wrong protocol | Connection closes without starting operation. |
| Duplicate operation id | Client starts two operations with same id | Server returns protocol error or closes as specified. |
| Client completes operation | Client calls dispose | Server stops sending events and releases listener. |
| Socket closes abruptly | Client terminates connection | Server cleanup runs without unhandled exception. |

## Filtering tests for tenant and project boundaries

Subscription filters are security boundaries when events contain tenant, project, or role-specific data. A filter bug can leak information even if queries and mutations are protected correctly. Test positive delivery and negative non-delivery side by side.

For a project-scoped subscription, create two subscribers with different project permissions. Trigger an event for project A. Subscriber A should receive it. Subscriber B should not. The negative assertion needs a short timeout, but it should be deliberate and named. A passing no-event test means the forbidden payload did not arrive within the agreed window after the trigger.

Do not rely on client-side filtering for sensitive events. If the server sends every event and the browser filters by project id, the data already crossed the boundary. Subscription tests should inspect what arrives over the socket, not only what the UI chooses to render.

| Boundary | Positive case | Negative case |
|---|---|---|
| Tenant | User in tenant 1 receives tenant 1 alert | User in tenant 2 receives no tenant 1 alert. |
| Project | Maintainer receives project comment | Viewer from another project receives no payload. |
| Role | Admin receives moderation event | Member receives no moderation event. |
| Feature flag | Flagged user receives beta event | Unflagged user receives no beta event. |
| Direct message | Participant receives message | Nonparticipant receives no payload. |

## Payload shape, nullability, and schema drift

Subscriptions use the same GraphQL schema as queries, but real-time payloads often come from different code paths. A mutation may return a fully hydrated object while the subscription resolver publishes a thinner object from a queue. If a non-null field is missing in the subscription payload, GraphQL execution can null the parent field or return an error to subscribers.

Add tests for fields the UI needs immediately. If the notification bell renders id, title, severity, and createdAt, the subscription test should request those fields and assert they are non-null. Do not only request id because it is easy. A subscription can pass the thin test and still break the real component.

Schema drift also happens when backend teams add a field to query resolvers but forget subscription payload construction. A good regression test uses the same fragment as the frontend component. Importing GraphQL documents from the client package can be worth the dependency if it prevents the server test from requesting a weaker shape than production.

## Backpressure and burst behavior

Real-time systems do not only deliver single events. A user may reconnect after being offline, a job may emit many progress updates, or a chat room may receive a burst. Subscription tests should include at least one burst scenario for important feeds. The assertion should verify count, order, and absence of duplicates.

Keep burst tests bounded. Five to ten events are enough to catch queue draining and ordering mistakes in normal CI. Load testing the subscription server is a separate exercise. For correctness tests, you want a small sequence where every event has a distinct version or sequence number.

If the server intentionally drops intermediate events and sends only the latest state, test that policy explicitly. A progress subscription may send 10, 40, 100 and skip 20 or 30. That is fine if clients only need the latest state. It is not fine for audit, chat, or financial event streams.

## Reconnect behavior after a dropped socket

Real clients reconnect. A useful subscription suite includes one test where the socket closes after the operation starts, then the client reconnects and starts a fresh operation. The server should not keep the old listener alive, and the client should not receive duplicate events after reconnect. If the product promises missed-event recovery, the reconnect test also needs a cursor, timestamp, or version argument. Without an explicit recovery token, a subscription can only deliver future events.

Document that policy in the schema description or client contract. Otherwise users will assume reconnect means replay, while the server only means resume listening from now. That expectation mismatch causes support incidents.

## Frequently Asked Questions

### Should I unit test subscription resolvers or only test WebSockets?

Use both, but for different risk. Resolver unit tests are good for filter logic and payload construction. WebSocket tests prove protocol setup, authentication, operation start, event delivery, and cleanup.

### Which GraphQL WebSocket protocol should tests use?

Use the same protocol as production clients. For new systems that is often graphql-transport-ws through the graphql-ws package. Avoid mixing it with the older subscriptions-transport-ws protocol unless your server intentionally supports both.

### How do I prevent subscription tests from racing the event?

Create the subscription first, wait until the operation is active if your server exposes a hook, then trigger the mutation or domain action. Starting the mutation before subscribing can lose fast events.

### Should a test assert that no forbidden event arrives?

Yes, but keep the timeout short and specific. Trigger an event the user must not receive, wait for a bounded interval, and fail if any payload arrives. This is important for project, tenant, and role-based filtering.

### How can I detect subscription listener leaks in CI?

Add test-only instrumentation around the pub/sub registration layer. Assert that listener or subscription counts return to baseline after client dispose and socket close paths.
`,
};
