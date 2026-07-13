import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing an AWS Lambda Dead-Letter Queue Locally",
  description:
    "Test an AWS Lambda dead-letter queue locally with LocalStack, real failed asynchronous invocations, SQS assertions, retry-aware polling, and clean isolation.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Testing an AWS Lambda Dead-Letter Queue Locally

The function throws exactly as intended, yet the queue remains empty. The usual cause is that the test invoked Lambda synchronously. A Lambda dead-letter queue configured on the function handles exhausted asynchronous invocations, not a \`RequestResponse\` call whose error is returned directly to the caller.

A meaningful local test must deploy the function, create a destination queue, attach its ARN as the function's dead-letter configuration, invoke with \`InvocationType: 'Event'\`, and wait through the retry behavior until SQS receives the failed event. LocalStack makes this possible without an AWS account, but the test still needs to respect asynchronous and eventually consistent boundaries.

## Distinguish three failure-routing mechanisms

AWS has several concepts casually called a Lambda DLQ. They are not interchangeable. Function dead-letter configuration applies to asynchronous invocation and targets SQS or SNS. Event source mappings such as SQS have their own source redrive policy and partial batch handling. Lambda destinations can route asynchronous success or failure with richer invocation records.

| Mechanism | Input style | Failure destination content | Configure on |
|---|---|---|---|
| Function DLQ | Asynchronous Lambda invocation | Original event plus message attributes | Lambda function |
| On-failure destination | Asynchronous invocation | Invocation record with request and response context | Event invoke configuration |
| SQS source DLQ | Lambda polls an SQS source queue | Original SQS message after receive threshold | Source queue redrive policy |
| Stream failure destination | Kinesis or DynamoDB event source | Metadata/reference according to mapping behavior | Event source mapping |

This article tests the first row. If your architecture is SQS -> Lambda -> SQS DLQ, the redrive policy belongs to the source queue and the test must drive receive failures. Do not attach \`DeadLetterConfig\` to the function and assume it covers poll-based sources.

## Package a function that fails deterministically

Keep the handler small so the test isolates delivery rather than application branching.

\`\`\`javascript
// lambda/index.mjs
export const handler = async (event) => {
  if (event.shouldFail === true) {
    throw new Error(\`rejected order \${event.orderId}\`);
  }

  return { accepted: event.orderId };
};
\`\`\`

Zip \`index.mjs\` at the archive root. A deployment package with an extra directory layer produces a handler-not-found error, which also reaches the DLQ but does not prove the intended business failure. Assert CloudWatch-compatible logs or run one successful smoke invocation before the DLQ case to validate packaging.

## Start LocalStack and wire SQS to Lambda

The following Vitest setup uses Testcontainers for Node and AWS SDK v3. It creates real LocalStack clients against the container endpoint. Pin the LocalStack image used by CI rather than floating on \`latest\`.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { GenericContainer, Wait } from 'testcontainers';
import {
  CreateFunctionCommand,
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

let container: Awaited<ReturnType<GenericContainer['start']>>;
let lambda: LambdaClient;
let sqs: SQSClient;

beforeAll(async () => {
  container = await new GenericContainer('localstack/localstack:4.6')
    .withEnvironment({ SERVICES: 'lambda,sqs,iam,logs' })
    .withExposedPorts(4566)
    .withWaitStrategy(Wait.forLogMessage(/Ready\./))
    .start();

  const endpoint = \`http://127.0.0.1:\${container.getMappedPort(4566)}\`;
  const common = {
    region: 'us-east-1',
    endpoint,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  };
  lambda = new LambdaClient(common);
  sqs = new SQSClient(common);
});

afterAll(async () => {
  lambda.destroy();
  sqs.destroy();
  await container.stop();
});
\`\`\`

Image capabilities and licensing can change, so validate the pinned version in your environment. LocalStack announced authentication requirements for newer distributions in 2026; CI may need to pass \`LOCALSTACK_AUTH_TOKEN\`. Do not bake that token into the test file or container logs.

For a Java suite, Testcontainers has a dedicated \`LocalStackContainer\` that exposes endpoint, region, access key, and secret key. The architecture remains the same.

## Create the queue before applying dead-letter configuration

Lambda needs the queue ARN, not its URL. Ask SQS for \`QueueArn\`, then create or update the function configuration.

\`\`\`typescript
const queue = await sqs.send(
  new CreateQueueCommand({ QueueName: \`orders-dlq-\${crypto.randomUUID()}\` }),
);
const queueUrl = queue.QueueUrl!;

const attributes = await sqs.send(
  new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ['QueueArn'],
  }),
);
const queueArn = attributes.Attributes!.QueueArn!;

await lambda.send(
  new CreateFunctionCommand({
    FunctionName: 'reject-order',
    Runtime: 'nodejs22.x',
    Handler: 'index.handler',
    Role: 'arn:aws:iam::000000000000:role/lambda-role',
    Code: { ZipFile: await readFile('./dist/reject-order.zip') },
    DeadLetterConfig: { TargetArn: queueArn },
  }),
);

await waitUntil(async () => {
  const result = await lambda.send(new GetFunctionCommand({ FunctionName: 'reject-order' }));
  return result.Configuration?.State === 'Active';
});
\`\`\`

The IAM role ARN is accepted in local emulation, while AWS requires a real assumable role with permissions to send to the target. Maintain an infrastructure test or deployment policy check for that cloud-only concern. Local success cannot prove production IAM.

If the function already exists, \`UpdateFunctionConfigurationCommand\` accepts \`DeadLetterConfig: { TargetArn: queueArn }\`. Wait for \`LastUpdateStatus\` to become \`Successful\` before invoking. Racing configuration updates is a common source of empty-queue failures.

## Invoke asynchronously and poll the destination

\`\`\`typescript
test('moves an exhausted asynchronous invocation to SQS', async () => {
  const payload = { orderId: 'ord-417', shouldFail: true };

  const invocation = await lambda.send(
    new InvokeCommand({
      FunctionName: 'reject-order',
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
  expect(invocation.StatusCode).toBe(202);

  const message = await poll(async () => {
    const result = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
        MessageAttributeNames: ['All'],
      }),
    );
    return result.Messages?.[0];
  }, { timeoutMs: 30_000, intervalMs: 500 });

  expect(JSON.parse(message.Body!)).toEqual(payload);
  expect(message.MessageAttributes).toBeDefined();
});
\`\`\`

Status 202 means the event was accepted for asynchronous processing, not that execution succeeded. Poll with a hard deadline and include function logs in the timeout diagnostic. A fixed sleep either wastes time or fails on a slow runner.

Use unique queue and function names per test worker, or create the container once and purge between tests. Deleting resources provides stronger isolation but adds latency. Never let a prior failed test's DLQ message satisfy the next test.

## Assert the envelope you actually configured

A function DLQ message body contains the original event. Message attributes describe the failure, including request and error information depending on the target. An on-failure destination contains a richer invocation record instead. Write assertions against captured LocalStack output and AWS documentation for your chosen mechanism.

Avoid asserting the exact error stack, internal request IDs, or receive timestamps. Those are volatile. Assert the original business key, expected error classification if exposed by the mechanism, and absence of a DLQ message for successful input.

| Assertion | Value | Warning |
|---|---|---|
| Invocation response is 202 | Proves async admission | Does not prove handler completion |
| DLQ body equals original event | Proves failed event routing | Only for function DLQ semantics |
| Correlation ID preserved | Enables incident recovery | Put it in the event, not only logs |
| Successful event leaves queue empty | Detects over-routing | Observe for a bounded quiet period |
| Poison event appears once | Detects duplicate routing | SQS itself is at-least-once, consumers remain idempotent |

An empty-queue assertion is inherently temporal. Poll for a reasonable quiet window after successful completion evidence. Simply receiving once immediately after invocation proves little.

## Control retries without misrepresenting AWS

Asynchronous Lambda invokes can be retried before dead-letter delivery. Local emulation timing and completeness may differ by version. Tests should allow the process to exhaust rather than assume immediate routing. If your LocalStack version supports event invoke configuration, reduce retry attempts for the suite through the real API, but keep at least one cloud integration test with production configuration.

Do not call the handler directly three times and then send a message to SQS from test code. That tests your imitation of Lambda, not Lambda configuration. A fast unit test can call the handler and assert rejection; the LocalStack test should own the platform wiring.

Count handler attempts through a durable test side effect or logs only when retry count is part of the contract. Make the side effect idempotent because real asynchronous delivery can duplicate.

## Test the consumer, not only delivery

A DLQ exists for recovery. Add a separate test for the redrive or remediation consumer. Give it a representative message from the actual failed invocation, assert idempotency, and verify poison messages do not loop forever.

If operators redrive SQS messages, LocalStack's SQS implementation supports DLQ redrive and message move tasks for source-queue DLQs. That is a distinct scenario from function DLQ delivery. Model the operational runbook exactly: inspect, correct cause, redrive, and confirm removal or successful processing.

## Where local fidelity ends

LocalStack gives fast feedback on SDK calls, ARNs, event shape, async wiring, and basic queue delivery. It cannot prove AWS IAM policies, regional quotas, account service-control policies, encryption key access, or every retry timing detail. Run a small deployed smoke test in a non-production AWS account for those risks.

The [LocalStack with Testcontainers guide](/blog/testcontainers-localstack-aws-mocking-guide) covers container networking and SDK configuration. Use the [Testcontainers practices guide](/blog/testcontainers-best-practices-2026) for lifecycle, reuse, and parallel-worker isolation.

## Diagnose a DLQ that stays empty

Check invocation type first. Then retrieve the function configuration and compare \`DeadLetterConfig.TargetArn\` to the created queue ARN. Confirm the function is active and its update status succeeded. Invoke a known failing payload, inspect Lambda logs, and wait through retries. Finally, inspect SQS using long polling.

If the function never ran, investigate packaging, handler name, runtime, and container execution. If it ran but succeeded, the test payload missed the failure branch. If it exhausted but could not send, examine target support and permissions. If SQS contains a message but the test sees none, check queue URL, credentials, region, and competing consumers.

## SQS and SNS targets require different assertions

A function DLQ can target SQS or SNS. SQS lets the test long-poll a queue directly. SNS requires a subscription target, such as a test SQS queue, and introduces the SNS notification envelope unless raw message delivery is configured. Do not reuse the SQS body assertion unchanged.

For SNS, create the topic, subscribe a queue, confirm the subscription behavior supported by the emulator, allow the topic to send to the queue, and attach the topic ARN to Lambda. Parse the outer SNS JSON, then parse its \`Message\` field as the original event. Assert topic and subscription ARNs by stable values rather than LocalStack-generated timestamps.

Choose the target based on recovery workflow. SQS fits pull-based remediation and redrive. SNS fans out failure notifications but is not itself a durable work queue in the same manner. Local tests should reflect the actual consumer chain.

## Payload size and serialization failures

Asynchronous invoke payloads have service limits, and destination services have message limits. Local emulators may not enforce every AWS quota identically. Add a cloud contract test near documented boundaries if large events are plausible.

JSON serialization can fail before the SDK sends anything, which never exercises Lambda or the DLQ. Circular JavaScript objects are a client error. Binary \`Payload\` bytes that are not valid JSON may cause a handler parse or runtime behavior depending on invocation processing. Separate caller encoding tests from function failure delivery.

A DLQ message should contain enough correlation data to locate the original work. Put a stable job or order ID inside the event. Relying only on Lambda request metadata makes remediation harder and can differ across routing mechanisms.

## Prove the success path cannot contaminate the queue

After deploying, invoke \`{ shouldFail: false }\` asynchronously with a unique order ID. Wait for positive completion evidence, such as a test table write or log marker, then poll the DLQ for a bounded quiet period. If any message appears, verify its correlation ID before failing; another parallel scenario may share a misconfigured queue.

\`\`\`typescript
await lambda.send(
  new InvokeCommand({
    FunctionName: 'reject-order',
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify({ orderId: 'ord-ok-1', shouldFail: false })),
  }),
);

await waitForSuccessRecord('ord-ok-1');
const unexpected = await sqs.send(
  new ReceiveMessageCommand({ QueueUrl: queueUrl, WaitTimeSeconds: 2 }),
);
expect(unexpected.Messages ?? []).toHaveLength(0);
\`\`\`

The success record prevents the quiet wait from passing merely because the function has not executed yet.

## Container networking for Lambda code

The test process reaches LocalStack through a mapped host port. The Lambda runtime executes in a container managed by LocalStack and cannot necessarily use that same \`127.0.0.1\` endpoint for downstream calls. If the handler calls SQS, DynamoDB, or a test HTTP server, configure endpoints reachable from the Lambda container.

Avoid changing production code to hard-code \`localhost:4566\`. Inject service endpoints through environment only in local deployment. For SQS URLs used inside Lambda, LocalStack documents endpoint strategies intended to produce container-resolvable URLs. Test the network path with the same Docker engine used in CI, since host aliases differ across operating systems.

Parallel Testcontainers networks need unique names and ports. A shared static LocalStack instance is faster but permits cross-suite state. Prefer one container per test class or worker with reusable provisioning inside that boundary.

## Infrastructure configuration deserves a direct assertion

Behavioral delivery proves the pieces work together, but a fast configuration check gives a better failure when an ARN is missing. Retrieve the function and compare its target ARN to the queue created by the fixture. Also retrieve queue attributes to confirm it belongs to the expected account and region.

\`\`\`typescript
const deployed = await lambda.send(
  new GetFunctionCommand({ FunctionName: 'reject-order' }),
);
expect(deployed.Configuration?.DeadLetterConfig?.TargetArn).toBe(queueArn);
\`\`\`

Do not stop at this assertion. It would pass if the runtime never invokes, retry exhaustion is broken, or delivery fails. Configuration and behavioral tests answer different questions.

## IAM and encryption gaps to cover in AWS

In AWS, the Lambda execution role needs permission to publish to the DLQ target. An encrypted SQS queue can require KMS permissions and an appropriate key policy. Resource policies and organization controls can also deny delivery. LocalStack may accept a placeholder role and skip those enforcement details.

Use infrastructure-as-code policy tests to check the role statements, then deploy one failing event in a sandbox account. Alarm on asynchronous events dropped because the destination could not be reached. The DLQ is not protection if Lambda lacks permission to use it.

For cross-account targets, verify whether the chosen Lambda configuration is supported and model both resource and identity policies. Avoid making a local emulator test the sole release gate for access control.

## Cleanup must handle failed setup

If function creation succeeds and the test fails before queue deletion, a shared container accumulates resources. Register cleanup immediately after each creation. Delete the function before deleting its target to avoid background retries racing cleanup. Purge is asynchronous and can have cooldown behavior, so unique queues are safer than repeated purge in parallel suites.

Capture container logs before stopping on failure. The log often contains runtime startup, invocation attempts, and destination errors that disappear with the container. Limit the artifact to the relevant test and scan for secrets.

## Frequently Asked Questions

### Why does a synchronous Lambda invocation never reach the function DLQ?

Function dead-letter configuration applies to asynchronous invocation failures after retries. A synchronous caller receives the function error directly.

### Should I configure \`DeadLetterConfig\` for an SQS-triggered Lambda?

Not to control failed source messages. Configure the SQS source queue's redrive policy and test the event source mapping behavior.

### How long should the local test wait for a DLQ message?

Use polling with a bounded deadline based on the pinned emulator and retry configuration. Avoid one fixed sleep, and print logs when the deadline expires.

### Does LocalStack prove that the AWS execution role can send to SQS?

No. Validate IAM through infrastructure policy tests and a deployed AWS smoke test. Local emulation mainly verifies wiring and behavior.

### What is the clearest assertion for the failed event?

Parse the SQS body and assert stable business fields such as the order ID and failure trigger. Avoid volatile request IDs and exact stack traces.
`,
};
