import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SQS Message Processing Testing Guide',
  description:
    'SQS message processing testing guide for retries, visibility timeouts, DLQs, idempotency, batch handling, local queues, and AWS SDK v3 consumers.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# SQS Message Processing Testing Guide

The consumer logs "processed order", the database row exists, and the same message becomes visible again thirty seconds later because the delete call never happened. SQS failures are often not in the business handler. They live in the edges: visibility timeout, receipt handles, retries, dead-letter queues, idempotency, and partial failure after side effects.

Testing SQS message processing means testing the protocol contract around your handler. A unit test for \`processOrder\` is necessary, but it does not prove the worker deletes only after success, extends visibility for slow work, survives duplicate delivery, or sends poison messages to a DLQ after the configured receive count. Those behaviors are the difference between a reliable event-driven service and a queue that hides incidents until backlog alarms fire.

This guide targets AWS SQS retries, DLQs, idempotency, and consumer test strategy. For event contract design across producers and consumers, read the [AsyncAPI event-driven testing guide](/blog/asyncapi-event-driven-testing-guide-2026). For architecture-level test planning, the [event-driven architecture testing guide](/blog/event-driven-architecture-testing-guide) is the broader companion.

## The SQS semantics your tests must respect

SQS is at-least-once delivery. Your consumer may receive the same message more than once. A message is hidden for the visibility timeout after receipt, not removed. It is removed only when the consumer calls \`DeleteMessage\` with the current receipt handle. If processing fails or the timeout expires before deletion, the message can be delivered again.

That model shapes the test suite. Success tests must assert deletion. Failure tests must assert no deletion. Slow-processing tests must verify visibility extension where needed. Duplicate tests must prove idempotency. DLQ tests must verify poison messages eventually leave the source queue according to redrive policy.

| SQS behavior | Test risk | Observable evidence |
|---|---|---|
| At-least-once delivery | Duplicate side effects | Idempotency key prevents second write |
| Visibility timeout | Message reappears during slow processing | Worker calls \`ChangeMessageVisibility\` or finishes in time |
| Receipt handle | Delete with stale handle fails | Delete uses handle from the current receive |
| Max receive count | Poison messages retry forever if misconfigured | DLQ receives failed payload |
| Long polling | Worker wastes CPU or misses timing assumptions | \`WaitTimeSeconds\` set intentionally |
| Batch receive | Partial success can lose messages | Delete only successfully processed entries |

Do not write tests that assume exactly-once delivery. That assumption is false for SQS and leads to fragile production behavior.

## Consumer loop with delete-after-success discipline

The core worker rule is simple: receive, process, delete only after durable success. The code below uses AWS SDK for JavaScript v3 commands. It handles one message at a time for clarity. Production workers often batch, but single-message tests are easier to reason about first.

\`\`\`ts
import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

type Handler = (message: { messageId: string; body: string }) => Promise<void>;

export async function pollOnce(options: {
  client: SQSClient;
  queueUrl: string;
  handler: Handler;
}) {
  const { client, queueUrl, handler } = options;

  const received = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
      AttributeNames: ['ApproximateReceiveCount'],
      MessageAttributeNames: ['All'],
    }),
  );

  const message = received.Messages?.[0];
  if (!message?.ReceiptHandle || !message.MessageId || !message.Body) {
    return { processed: false };
  }

  try {
    await handler({ messageId: message.MessageId, body: message.Body });
    await client.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
    return { processed: true, deleted: true };
  } catch (error) {
    await client.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
        VisibilityTimeout: 5,
      }),
    );
    throw error;
  }
}
\`\`\`

The failure branch sets a short visibility timeout so tests and retry loops do not wait for the queue default. In production you might not change visibility on every failure. You may rely on the queue timeout, apply exponential backoff, or send known unrecoverable payloads elsewhere. The test suite should match that policy.

## Idempotency is the main business assertion

Because SQS can deliver duplicates, the handler must tolerate repeated messages. Idempotency can be implemented with a processed-message table, a unique business key, conditional writes, or state-machine guards. The test should prove duplicate delivery does not duplicate the side effect.

For an order worker, the idempotency key might be \`orderId\` from the message body, not the SQS message ID. If the producer retries \`SendMessage\`, SQS can create different message IDs for the same business event. For FIFO queues, message deduplication helps within its deduplication window, but consumers still should protect side effects.

| Side effect | Idempotency strategy | Test assertion |
|---|---|---|
| Create order projection | Unique constraint on \`orderId\` | Two deliveries create one row |
| Send email | Outbox table with event key | One email job recorded |
| Charge payment | Provider idempotency key | Second attempt returns existing charge |
| Update search index | Deterministic document ID | Final document state is correct |
| Emit downstream event | Processed event ledger | One downstream event per business event |

Idempotency tests are often more valuable than mocks around \`DeleteMessage\`. A worker can call the right AWS command and still double-charge a customer if the handler is not idempotent.

## Integration testing with LocalStack or a test AWS account

For protocol behavior, use a real SQS-compatible endpoint. LocalStack is common for local and CI runs. A dedicated AWS test account is closer to production but slower and more expensive to manage. The example below assumes \`QUEUE_URL\` points to an existing queue and the SDK is configured for either LocalStack or AWS.

\`\`\`ts
import {
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { expect, test } from 'vitest';
import { pollOnce } from './worker';

const client = new SQSClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL,
});

test('worker deletes the message only after the handler succeeds', async () => {
  const queueUrl = process.env.QUEUE_URL;
  if (!queueUrl) {
    throw new Error('QUEUE_URL is required');
  }

  await client.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ orderId: 'ord_contract_1' }),
    }),
  );

  await pollOnce({
    client,
    queueUrl,
    handler: async (message) => {
      expect(JSON.parse(message.body).orderId).toBe('ord_contract_1');
    },
  });

  const attributes = await client.send(
    new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages'],
    }),
  );

  expect(attributes.Attributes?.ApproximateNumberOfMessages).toBe('0');

  const secondReceive = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 1,
    }),
  );

  expect(secondReceive.Messages ?? []).toHaveLength(0);
});
\`\`\`

Approximate queue attributes are eventually consistent, so use them as supporting evidence, not the only assertion in highly concurrent tests. In a single-message isolated queue, they are usually good enough. For parallel CI, create a queue per test run or include a run ID in message bodies and drain carefully.

## Retry tests without sleeping for minutes

Retry behavior depends on visibility timeout and redrive policy. Waiting for production timeouts in tests is wasteful. Use test queues with short visibility timeouts and low max receive counts. For example, a poison-message test queue might have a visibility timeout of two seconds and a redrive policy that moves messages to the DLQ after three receives.

The test should force the handler to fail, poll enough times for receive count to increment, then assert the message appears in the DLQ. Avoid asserting exact wall-clock timing. Cloud and local emulators can vary. Assert eventual state with a bounded retry helper.

Do not use the production queue's redrive policy as a test fixture. Test queues should be disposable and intentionally fast. Production redrive settings are operational controls, not test-speed controls.

## Batch processing and partial failure

SQS can return up to ten messages per receive call. Batch processing improves throughput but complicates correctness. If one message succeeds and another fails, the worker should delete only the successful message. Deleting the whole batch after partial success loses failed work. Deleting none after partial success creates duplicates for successful work.

For batch consumers, tests should inject mixed outcomes: valid message, transient failure, poison payload, and duplicate business key. Assert delete calls or queue state per message. If using Lambda event source mappings, partial batch response behavior depends on Lambda configuration and response shape, so test that integration separately from a hand-written worker.

The principle is the same: acknowledge only what is durable.

## DLQs are debugging tools, not garbage bins

A dead-letter queue is useful only if the team inspects it and can replay or resolve messages. Tests should verify that poison messages carry enough context for diagnosis. The body, message attributes, correlation IDs, and error logs should connect. A DLQ message with no schema version or source event ID creates manual work during incidents.

DLQ tests should also guard against secrets. If a poison message contains raw payment data or private tokens, the queue becomes a sensitive data store. Redact at the producer or encrypt appropriately. The consumer should not add secrets to failure metadata.

## Visibility timeout tests for slow handlers

A worker that normally finishes in two seconds may occasionally take forty seconds because it calls a slow dependency. If the queue visibility timeout is thirty seconds, another worker can receive the same message while the first worker is still running. That creates concurrent processing, not just a later retry. Tests should cover the slow path explicitly.

There are two acceptable designs. The worker can guarantee processing finishes inside the visibility timeout with margin, or it can extend visibility while work is in progress. The second design needs tests around extension timing and failure. If \`ChangeMessageVisibility\` fails, the worker should log clearly and avoid pretending the message is protected.

Use fake timers for unit tests around extension scheduling, and use a real SQS-compatible queue for one integration test that proves a long-running message does not reappear while the worker is extending visibility. Keep the integration timeout short by using a dedicated queue with small values. Do not copy production's long timeout into CI.

## Message attributes and schema version checks

SQS message bodies often carry JSON, but message attributes are useful for routing and validation. A producer can include \`eventType\`, \`schemaVersion\`, \`tenantId\`, or \`correlationId\` as attributes. The consumer test should assert that required attributes exist before the handler runs. Missing attributes should fail safely and, depending on policy, retry or move to a DLQ.

Schema version is especially important for event evolution. If the consumer supports \`order.created\` version 2 and 3, tests should send both. If version 1 is no longer supported, a test should prove it is rejected with a diagnostic error. Do not let unsupported old messages fall through to business logic where they fail with null pointer errors.

When attributes contain routing data, ensure the body and attributes agree. A message with body \`eventType: order.created\` and attribute \`eventType: order.cancelled\` should not be processed ambiguously. The test can assert rejection or a single source of truth, but the policy should be explicit.

## Producer and consumer tests should meet at the queue contract

SQS reliability is not only a consumer problem. Producers decide message body shape, attributes, delay seconds, FIFO group IDs, deduplication IDs, and correlation IDs. A consumer test with hand-written messages can drift from producer reality. A producer test that only asserts \`SendMessageCommand\` was called can still send unusable payloads.

Create shared contract fixtures for representative messages. Producers must be able to emit them. Consumers must be able to process them. If the producer changes the fixture, the consumer contract should run. This is where AsyncAPI or a JSON Schema can help, but even a versioned fixture directory is better than two teams inventing payloads separately.

For FIFO queues, include group and deduplication decisions in the contract. A bad \`MessageGroupId\` can serialize unrelated work and create throughput problems. A bad deduplication ID can drop legitimate events or fail to deduplicate retries. Those are testable producer behaviors.

## Operational alarms as testable assumptions

Queue tests should connect to operations. If a poison message reaches the DLQ, who is alerted? If \`ApproximateAgeOfOldestMessage\` rises, which dashboard shows it? If receive count spikes, does the team know whether it is a dependency outage or a bad deployment?

You do not need to test CloudWatch itself in every application suite, but you should test that the service emits enough logs and metrics to debug SQS behavior. Include correlation IDs in logs before and after processing. Record handler duration, success, failure reason, and delete outcome. A worker that fails after the side effect but before delete should be visible.

In pre-production, run a controlled poison-message drill. Send an invalid message, watch it retry, confirm DLQ movement, and verify the alert path. That drill proves the queue configuration and human process together, which is the real reliability boundary.

## Testing delayed messages and scheduled work

Some SQS workflows use \`DelaySeconds\` or per-message timers to schedule future processing. Tests for those workflows should not sleep for production delays. Use a queue configured for short delays in CI, and keep business scheduling rules separate from SQS waiting behavior. The business test can assert that a renewal reminder is scheduled for the correct timestamp. The SQS integration test only needs to prove the worker respects delayed visibility.

For retry backoff implemented through visibility changes or delayed requeueing, assert the policy in small units. A transient dependency failure might retry quickly, while a provider rate limit might delay longer. Poison messages should not be delayed forever if they can never succeed.

## Large payloads and S3 pointer contracts

SQS has message size limits, so some systems store large payloads in S3 and send a pointer through the queue. That pattern needs its own contract tests. The consumer must validate bucket, key, version, encryption expectations, and missing-object behavior. A malformed pointer should not turn into an unhandled exception that retries until DLQ without context.

For pointer messages, include a fixture with the smallest valid pointer and one with a missing object. If the consumer deletes the S3 object after processing, test that cleanup happens only after durable success. Otherwise a failed handler can lose the payload while the SQS message retries.

Keep pointer permissions in the test as well. A consumer role that can read the queue but not the referenced object will retry perfectly and process nothing.

## Frequently Asked Questions

### Should SQS consumer unit tests mock the AWS SDK?

Mock the SDK for narrow branching tests, but use SQS-compatible integration tests for visibility timeout, delete behavior, receive counts, and DLQ movement. Those are protocol behaviors.

### Do FIFO queues remove the need for idempotency?

No. FIFO queues reduce ordering and deduplication risks within their constraints, but consumers should still protect side effects with business-level idempotency.

### What should happen when processing fails?

Do not delete the message. Let it become visible again, optionally adjust visibility for backoff, and rely on redrive policy for poison messages after repeated failures.

### How do I test a DLQ without waiting too long?

Use a dedicated test queue with a short visibility timeout and low max receive count. Poll with a bounded retry helper until the DLQ receives the message.

### Should one test queue be shared by all CI jobs?

Prefer a queue per run or per worker shard. Shared queues create cross-test interference, approximate attribute confusion, and difficult cleanup.
`,
};
