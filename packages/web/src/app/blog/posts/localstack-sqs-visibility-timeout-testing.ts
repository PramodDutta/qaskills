import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test SQS Visibility Timeouts with LocalStack',
  description:
    'Test SQS visibility timeouts with LocalStack using real receive, redelivery, receipt-handle, deletion, extension, zero-timeout, and idempotency scenarios.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test SQS Visibility Timeouts with LocalStack

The worker receives order-17 and then crashes before deletion. The message has not left SQS; it is temporarily invisible. When its visibility timeout expires, another receive can obtain it with a new receipt handle. A queue mock that removes messages on receive turns this recovery mechanism into exactly-once fiction.

LocalStack gives integration tests an SQS-compatible endpoint, and Testcontainers can own its lifecycle. With a deliberately short queue timeout, a test can prove invisibility, redelivery, acknowledgement, per-message extension, and the consumer's idempotency behavior using the same AWS SDK commands as production.

## Model the three message states precisely

An SQS message is stored after SendMessage, in flight after ReceiveMessage, and removed only after DeleteMessage succeeds with a receipt handle. Visibility timeout affects receive eligibility. It is neither a processing lease with exactly-once guarantees nor automatic acknowledgement.

| Event | Queue state | What a consumer may safely conclude |
| --- | --- | --- |
| SendMessage succeeds | Stored and eligible, subject to delay | SQS accepted the message |
| ReceiveMessage returns it | Stored but temporarily invisible | This delivery may be processed |
| Visibility expires | Eligible for another receive | Previous worker did not delete in time |
| ChangeMessageVisibility succeeds | Current invisibility window changes | This receipt handle adjusted the active delivery |
| DeleteMessage succeeds | Message removal requested | Current delivery acknowledged |
| Worker process exits | No SQS acknowledgement occurs | Redelivery should eventually be expected |

Standard queues can deliver more than once even within ordinary operation. A test must not claim the timeout is a duplicate-prevention guarantee. The consumer needs idempotency independently of this fixture.

## Start LocalStack and create a queue with a two-second timeout

Use @testcontainers/localstack so the test process starts and stops the emulator. Require a pinned LOCALSTACK_IMAGE in CI. Newer authenticated images may also require LOCALSTACK_AUTH_TOKEN, which can be forwarded as an environment variable.

The setup below creates a unique standard queue and asks SQS for its URL. A two-second timeout keeps the suite fast while leaving enough room to make the immediate invisibility assertion without racing a one-second boundary.

\`\`\`typescript
import { LocalstackContainer, type StartedLocalStackContainer } from '@testcontainers/localstack';
import {
  CreateQueueCommand,
  DeleteQueueCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll } from 'vitest';

export let container: StartedLocalStackContainer;
export let sqs: SQSClient;
export let queueUrl: string;

beforeAll(async () => {
  const image = process.env.LOCALSTACK_IMAGE;
  if (!image) throw new Error('LOCALSTACK_IMAGE must identify a pinned image');

  let definition = new LocalstackContainer(image);
  if (process.env.LOCALSTACK_AUTH_TOKEN) {
    definition = definition.withEnvironment({
      LOCALSTACK_AUTH_TOKEN: process.env.LOCALSTACK_AUTH_TOKEN,
    });
  }
  container = await definition.start();
  sqs = new SQSClient({
    endpoint: container.getConnectionUri(),
    region: 'us-east-1',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  const created = await sqs.send(
    new CreateQueueCommand({
      QueueName: 'visibility-' + randomUUID(),
      Attributes: { VisibilityTimeout: '2' },
    }),
  );
  queueUrl = created.QueueUrl!;
}, 60_000);

afterAll(async () => {
  if (queueUrl) await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
  sqs?.destroy();
  await container?.stop();
});
\`\`\`

Create a queue per test file or worker instead of purging a shared queue. Purge behavior has timing constraints in AWS, and shared URLs let one test consume another test's message. Unique queues turn isolation into naming rather than timing.

The [Testcontainers LocalStack AWS mocking guide](/blog/testcontainers-localstack-aws-mocking-guide) covers container configuration across services. For this suite, keep setup SQS-specific so an unrelated emulated service cannot delay or contaminate it.

## Prove invisible now and redelivered later

The core scenario sends one message, receives it without deleting, immediately polls again, then waits until it becomes eligible. Use a bounded polling helper for the redelivery phase. A single sleep followed by one receive can fail under scheduler load even when SQS is correct.

\`\`\`typescript
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, test } from 'vitest';
import { queueUrl, sqs } from './sqs-fixture';

async function receiveOne(): Promise<Message | undefined> {
  const result = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 0,
      MessageSystemAttributeNames: ['ApproximateReceiveCount'],
    }),
  );
  return result.Messages?.[0];
}

async function receiveUntil(deadlineMs: number): Promise<Message> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const message = await receiveOne();
    if (message) return message;
    await delay(100);
  }
  throw new Error('message was not redelivered before the test deadline');
}

test('redelivers an unacknowledged message after visibility expires', async () => {
  const sent = await sqs.send(
    new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: '{"orderId":"order-17"}' }),
  );
  const first = await receiveOne();
  expect(first?.MessageId).toBe(sent.MessageId);
  expect(first?.Attributes?.ApproximateReceiveCount).toBe('1');

  expect(await receiveOne()).toBeUndefined();

  const second = await receiveUntil(5_000);
  expect(second.MessageId).toBe(first?.MessageId);
  expect(second.ReceiptHandle).not.toBe(first?.ReceiptHandle);
  expect(Number(second.Attributes?.ApproximateReceiveCount)).toBeGreaterThanOrEqual(2);
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: second.ReceiptHandle!,
    }),
  );
});
\`\`\`

The five-second value is an assertion deadline, not the configured queue timeout. It allows the emulator and runner to schedule operations after the two-second threshold. The test still proves immediate invisibility and eventual redelivery without pretending millisecond precision that SQS does not promise.

ApproximateReceiveCount is, as named, approximate service metadata. In an isolated LocalStack queue, it is useful for diagnosing the scenario. Production logic should not assume an exact count for correctness.

## Delete with the receipt handle from the active delivery

DeleteMessage requires a receipt handle, not MessageId. Each receive can produce a new handle. Retaining the first handle after redelivery is a consumer bug and can cause confusing behavior. The acknowledgement test should delete using the handle returned by the current receive, wait beyond the original visibility window, and prove there is no later delivery.

\`\`\`typescript
import { DeleteMessageCommand, SendMessageCommand } from '@aws-sdk/client-sqs';

test('does not redeliver after the active receipt is deleted', async () => {
  await sqs.send(
    new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: '{"jobId":"job-81"}' }),
  );
  const message = await receiveUntil(2_000);
  expect(message.ReceiptHandle).toBeTruthy();

  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle!,
    }),
  );

  await delay(2_500);
  expect(await receiveOne()).toBeUndefined();
});
\`\`\`

One empty receive cannot prove permanent absence in a distributed standard queue. In this isolated emulator test it is a practical assertion after the relevant timeout. A production integration test should use bounded repeated receives and isolate its message by queue or correlation attributes.

Do not delete in a finally block before the redelivery assertion completes. Cleanup that acknowledges the message can make a failed invisibility test look green. Delete or destroy the whole unique queue only after evidence has been collected.

## Extend a busy delivery with ChangeMessageVisibility

Long tasks should either choose an appropriate queue default or extend individual messages before their current timeout expires. ChangeMessageVisibility starts a new timeout from the moment the action is called. It does not permanently change the queue default, and the redelivered message returns to the queue's normal timeout unless changed again.

Build the extension test with two phases. Receive a message, wait part of the original two seconds, set its visibility to four seconds, then prove it stays hidden past the point where the original timeout would have expired. Finally poll for redelivery after the extended window.

\`\`\`typescript
import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

test('extends the current delivery without changing queue defaults', async () => {
  await sqs.send(
    new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: '{"task":"render"}' }),
  );
  const first = await receiveUntil(2_000);

  await delay(1_000);
  await sqs.send(
    new ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: first.ReceiptHandle!,
      VisibilityTimeout: 4,
    }),
  );

  await delay(1_500);
  expect(await receiveOne()).toBeUndefined();

  const redelivered = await receiveUntil(5_000);
  expect(redelivered.MessageId).toBe(first.MessageId);
  expect(redelivered.ReceiptHandle).not.toBe(first.ReceiptHandle);
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: redelivered.ReceiptHandle!,
    }),
  );
});
\`\`\`

This test takes real seconds because SQS visibility is service time, not a JavaScript timer the test runner can fake. Keep only a few lifecycle cases at this layer. Unit-test heartbeat scheduling with a controllable clock, then use one LocalStack case to prove the AWS command and receipt handle are wired correctly.

The extension should happen with safety margin in production. A heartbeat sent at the exact expiry boundary can lose a race. Test application configuration and telemetry for failed extensions rather than inferring reliability from one local run.

## Set visibility to zero for explicit early release

ChangeMessageVisibility with VisibilityTimeout: 0 makes the message immediately available for another receive. This is useful when a worker discovers it cannot process the message and wants to release it instead of waiting. It is not the same as deletion and can create a hot retry loop.

Write a focused test: receive, change to zero using the active receipt handle, then poll and assert the same MessageId returns with a different receipt handle. Follow it with consumer policy assertions such as backoff metadata or dead-letter routing at the appropriate layer.

Never use zero visibility as a generic error handler. Poison messages can cycle rapidly and consume capacity. A redrive policy and idempotent handler are production controls that LocalStack lifecycle tests should complement, not replace.

| Processing outcome | SQS action | Next observable state | Main testing risk |
| --- | --- | --- | --- |
| Completed successfully | DeleteMessage | No expected redelivery | Wrong or stale receipt handle |
| Needs more time | ChangeMessageVisibility to positive value | Hidden for new interval | Heartbeat races expiry |
| Cannot process now | ChangeMessageVisibility to zero | Quickly eligible | Tight retry loop |
| Worker crashes | No action | Eligible after current timeout | Lost idempotency |
| Permanent poison condition | Let redrive policy count receives | Eventually moves to DLQ | Emulator parity and policy config |

## Test the worker's side effects, not only queue mechanics

An SQS test becomes valuable to the product when it drives the actual consumer. Arrange a message with a stable operation ID, let the worker write one domain record, interrupt it before delete, and allow redelivery. The final domain state must contain one logical effect even though the handler ran at least twice.

Implement idempotency with a unique operation key, conditional write, transactional inbox, or another domain-appropriate mechanism. Do not claim MessageId alone always serves as the business idempotency key. A producer retry or duplicate business event can create a different SQS message ID.

Useful probes include handler-attempt count, unique ledger row count, outgoing event count, and acknowledgement count. The outcome should distinguish “redelivery happened” from “duplicate side effect happened.” A test that only sees ApproximateReceiveCount increasing can pass while the customer is charged twice.

Cancellation of the worker process is more realistic than throwing before DeleteMessage in a mocked callback, but it costs complexity. Use a controllable barrier inside the handler: pause after the durable write, terminate or abort the worker, wait for visibility expiry, start another worker, and inspect final state. Run that smaller set in an integration lane.

## Cover FIFO queues with their own expectations

FIFO queues add message-group ordering and deduplication behavior. Visibility still applies, but an in-flight message can block later messages in the same group. Reusing a standard-queue scenario without MessageGroupId and deduplication setup does not test FIFO semantics.

For FIFO, send two messages in one group. Receive the first and withhold deletion. Verify the second is not delivered as though it could overtake the first. After the first becomes visible, process and delete it with its current receipt, then receive the second. Use a distinct MessageDeduplicationId unless content-based deduplication is deliberately enabled.

Do not mix groups if the requirement is head-of-line blocking within one group. Conversely, add a separate case showing another group can progress while the first group has an in-flight message. These are ordering contracts, not generic visibility cases.

## Know where LocalStack stops being authoritative

LocalStack is strong for SDK wiring and fast state transitions. AWS is authoritative for distributed delivery behavior, quota enforcement, long polling at scale, eventual metrics, redrive policy details, and edge races. Standard queues explicitly permit duplicates, so a perfectly deterministic emulator cannot prove the consumer is safe in production.

Pin the LocalStack version and keep a small AWS canary that sends a synthetic message, receives without deletion, observes later eligibility, deletes with the current receipt, and cleans its queue. Avoid asserting exact timestamps. The [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026) helps keep container lifecycle and CI resource use predictable.

When a visibility test fails, report MessageId, masked receipt-handle identity, receive count, queue URL suffix, configured timeout, and elapsed monotonic time. Do not print message bodies if they could contain production-derived data. These tests should always use synthetic payloads.

## Drive a dead-letter transition through actual receives

Configuring a redrive policy is not evidence that poison messages reach the dead-letter queue. Create a DLQ, obtain its ARN, and attach a \`RedrivePolicy\` to the source with a low \`maxReceiveCount\`. Send one uniquely identified body, repeatedly receive it without deleting, and let each visibility lease expire. Poll the DLQ until that same message appears.

Assert that the source no longer delivers it, the body and relevant message attributes survived, and receive count crossed the configured policy. Avoid asserting the transfer at one exact timestamp. Redrive is asynchronous, and LocalStack timing is not a service-level guarantee for AWS.

Test standard and FIFO queues separately. A FIFO source requires a FIFO-compatible DLQ and carries message-group concerns. A standard-queue redrive scenario says nothing about group blocking, ordering, or deduplication.

Your worker's malformed-payload policy must align with redrive. If it deletes poison messages after logging, the queue can never apply its redrive policy. If it immediately resets visibility to zero, it can create a hot loop. Name which failures are retryable, which are acknowledged into an application quarantine, and which are left for SQS redrive.

## Coordinate graceful shutdown with the current lease

Deployments frequently terminate a worker while it owns an invisible message. The consumer should stop polling first, then either finish and delete current work, extend the lease for a bounded drain period, or explicitly release it according to policy. Deleting merely because shutdown began can lose unfinished work.

Use a controlled processor that signals when business work starts and blocks until the test releases it. Trigger the worker's shutdown signal, verify no second receive begins, and inspect the SQS action. For a finish-on-shutdown design, release processing and require delete with the active handle. For an abandon design, require no delete and prove eventual redelivery.

This is a worker lifecycle test, not just an SDK adapter check. Run it with the actual consumer loop against LocalStack so cancellation, heartbeat timers, and acknowledgement order interact as they do in the service. Keep business repositories synthetic and assert whether side effects committed before acknowledgement.

Set the test deadline longer than the deliberately short queue lease, but synchronize on processor and queue events. A five-second sleep followed by a queue-size assertion will be both slower and less informative.

## Separate queue defaults from per-message overrides

The queue's \`VisibilityTimeout\` is the default for receives. \`ReceiveMessage\` can request a visibility timeout for returned messages, and \`ChangeMessageVisibility\` changes an individual in-flight delivery. Tests should identify which layer owns the value under examination.

Create one queue with a recognizable default, receive without an override, and prove redelivery around that lease. In a different scenario, supply the receive-level override and show that it takes precedence for that delivery. Keep extension coverage focused on the current receipt handle.

Configuration drift is easier to catch by reading queue attributes at startup and failing with a clear message than by waiting for an unexpected redelivery. Still retain behavior tests because an attribute value alone does not prove the worker uses receipt handles or extensions correctly.

Do not shorten production timeouts in application code simply because tests would otherwise wait. The container queue is a separate fixture and can use one or two seconds. Verify production configuration through deployment checks, while the integration suite exercises the same consumer algorithm against compact time values.

## Inspect duplicate side effects with an idempotency ledger

Redelivery is expected, so the strongest consumer assertion is often one business effect after two deliveries. Seed an event with a stable domain event ID, let the first handler commit and simulate failure before delete, then receive it again. The second handler should recognize the committed event and acknowledge without repeating the mutation.

Store idempotency state atomically with the business change when the architecture permits. A test double that remembers an ID in process memory cannot validate database transaction boundaries. For high-value workflows, run the consumer and repository against disposable real infrastructure and assert the ledger row, account balance, or emitted outbox entry.

Message ID may be useful but is not always the correct domain key. Publishers can send semantically duplicate messages with different SQS IDs. Prefer an event identifier defined by the producer contract, and test the missing-ID policy rather than silently substituting payload hashes.

## Frequently Asked Questions

### Does receiving a message remove it from SQS?

No. ReceiveMessage makes it temporarily invisible. DeleteMessage with the active receipt handle removes it. If deletion never happens, the message becomes eligible again after visibility expires.

### Why did the receipt handle change after redelivery?

Receipt handles identify a particular receive action, not the message's permanent identity. Use the latest handle to change visibility or delete the current delivery, and use MessageId or a domain key for correlation.

### Can fake timers accelerate a LocalStack visibility timeout?

Not through the Node test clock. Visibility is measured inside the SQS service process. Keep emulator timeouts short, use bounded polling, and unit-test your worker's heartbeat scheduler separately with fake time.

### Does visibility timeout prevent every duplicate delivery?

No. Standard SQS uses at-least-once delivery and can return a message more than once. Visibility reduces simultaneous processing in the normal path, while consumer idempotency protects domain effects.

### What happens after ChangeMessageVisibility on the next receive?

The change applies to the current delivery. If the message is later redelivered, its visibility timeout returns to the queue default unless the consumer changes it again.
`,
};
