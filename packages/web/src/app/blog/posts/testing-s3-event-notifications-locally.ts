import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing S3 Event Notifications Locally',
  description:
    'Test S3 event notifications locally with LocalStack, SQS, AWS SDK v3, and Testcontainers while asserting filters, duplicate tolerance, and payload shape.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing S3 Event Notifications Locally

Uploading \`incoming/report.csv\` succeeds, yet the worker queue stays empty. The object store, notification configuration, queue policy, suffix filter, and consumer are five separate failure points hidden behind one apparently simple operation. A useful local test observes the S3 event at the queue boundary before involving Lambda or application processing.

LocalStack can emulate S3 and SQS on one local endpoint, while Testcontainers gives each test run a disposable instance. AWS SDK for JavaScript v3 configures the bucket notification using the same command objects used against AWS. The result is an integration test with realistic request and event shapes, without a shared cloud account.

## Choose SQS as the first observable destination

S3 notifications can target SQS, SNS, Lambda, and EventBridge in AWS, subject to service rules and region constraints. For local verification, SQS is particularly inspectable: the test can receive, parse, assert, and delete messages without deploying function code.

| Destination | Local test advantage | Main complication |
| --- | --- | --- |
| SQS | Pull-based assertion and visible retry state | Queue policy and nested message envelopes |
| SNS | Tests fan-out topology | Subscribers add another moving part |
| Lambda | Exercises handler integration | Runtime startup and invocation diagnostics |
| EventBridge | Flexible routing rules | Event envelope differs from direct notifications |
| In-memory fake | Very fast unit feedback | Does not validate S3 notification configuration |

Start with S3 to SQS to prove the infrastructure edge. Test the message handler separately with captured event JSON. Add an end-to-end Lambda or worker test only where wiring risk justifies the extra runtime.

The [Testcontainers LocalStack guide](/blog/testcontainers-localstack-aws-mocking-guide) covers container lifecycle and endpoint configuration in more depth. This walkthrough concentrates on object event delivery.

## Start LocalStack with Testcontainers

The Node Testcontainers package can run the official LocalStack image as a generic container. Pin the image version in a production suite rather than tracking \`latest\`, because emulator behavior changes. LocalStack's edge port is 4566.

\`\`\`typescript
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { after, before } from 'node:test';

let localstack: StartedTestContainer;
let endpoint: string;

before(async () => {
  localstack = await new GenericContainer('localstack/localstack:4.5.0')
    .withEnvironment({
      SERVICES: 's3,sqs',
      AWS_DEFAULT_REGION: 'us-east-1',
    })
    .withExposedPorts(4566)
    .start();

  endpoint = \`http://\${localstack.getHost()}:\${localstack.getMappedPort(4566)}\`;
});

after(async () => {
  await localstack.stop();
});
\`\`\`

The version is an example pin, not a claim that it is the newest release. Update deliberately after running the notification suite. Dynamic host-port mapping prevents collisions between parallel CI jobs.

When the application runs in another container, \`localhost\` from that application points to itself, not LocalStack. Put containers on a shared Testcontainers network and use a network alias, or inject the reachable host and mapped port. Endpoint confusion is more common than an S3 emulator defect.

## Create clients, a queue, and a bucket

AWS SDK v3 clients accept a local endpoint and dummy credentials. S3 also needs path-style addressing in many local setups so the bucket name does not become a hostname that local DNS cannot resolve.

\`\`\`typescript
import {
  CreateBucketCommand,
  PutBucketNotificationConfigurationCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

const credentials = {
  accessKeyId: 'test',
  secretAccessKey: 'test',
};

function makeClients(localEndpoint: string) {
  return {
    s3: new S3Client({
      region: 'us-east-1',
      endpoint: localEndpoint,
      forcePathStyle: true,
      credentials,
    }),
    sqs: new SQSClient({
      region: 'us-east-1',
      endpoint: localEndpoint,
      credentials,
    }),
  };
}
\`\`\`

Create unique names per run. The account ID used by LocalStack is commonly \`000000000000\`, but avoid constructing the queue ARN when the service can return it. Ask SQS for the \`QueueArn\` attribute and use that exact value in the bucket configuration.

## Configure an ObjectCreated suffix filter

The next test creates a queue and bucket, reads the queue ARN, and installs an S3 notification configuration for object-created events whose key ends in \`.csv\`.

\`\`\`typescript
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

test('publishes a CSV object-created notification to SQS', async () => {
  const { s3, sqs } = makeClients(endpoint);
  const suffix = randomUUID();
  const bucket = \`uploads-\${suffix}\`;
  const queueName = \`upload-events-\${suffix}\`;

  const queue = await sqs.send(new CreateQueueCommand({ QueueName: queueName }));
  assert.ok(queue.QueueUrl);

  const attributes = await sqs.send(
    new GetQueueAttributesCommand({
      QueueUrl: queue.QueueUrl,
      AttributeNames: ['QueueArn'],
    }),
  );
  const queueArn = attributes.Attributes?.QueueArn;
  assert.ok(queueArn);

  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  await s3.send(
    new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: {
        QueueConfigurations: [
          {
            Id: 'csv-created',
            QueueArn: queueArn,
            Events: ['s3:ObjectCreated:*'],
            Filter: {
              Key: {
                FilterRules: [{ Name: 'suffix', Value: '.csv' }],
              },
            },
          },
        ],
      },
    }),
  );

  const key = 'incoming/quarterly report.csv';
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: 'account,total\\nA-17,42.00\\n',
      ContentType: 'text/csv',
    }),
  );

  const message = await receiveS3Message(sqs, queue.QueueUrl);
  assert.equal(message.eventName.startsWith('ObjectCreated:'), true);
  assert.equal(message.s3.bucket.name, bucket);
  assert.equal(decodeURIComponent(message.s3.object.key.replace(/\\+/g, ' ')), key);
});
\`\`\`

In AWS, S3 requires permission to publish to the destination queue. Production infrastructure should configure an SQS resource policy constrained by the source bucket ARN and account as appropriate. LocalStack configurations may accept local delivery without the full policy depending on version and setup. Keep an infrastructure-as-code test against AWS for IAM correctness; do not claim the emulator proves cloud authorization.

## Poll the queue with a bounded deadline

Event delivery is asynchronous. A single immediate \`ReceiveMessage\` call creates a race. Poll with long polling and a test deadline, preserving received diagnostics on timeout.

\`\`\`typescript
type S3Record = {
  eventName: string;
  eventSource: string;
  awsRegion: string;
  s3: {
    bucket: { name: string; arn: string };
    object: { key: string; size?: number; eTag?: string; sequencer?: string };
  };
};

async function receiveS3Message(
  sqs: SQSClient,
  queueUrl: string,
  timeoutMs = 10_000,
): Promise<S3Record> {
  const deadline = Date.now() + timeoutMs;
  const observed: string[] = [];

  while (Date.now() < deadline) {
    const result = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      }),
    );

    for (const message of result.Messages ?? []) {
      if (!message.Body || !message.ReceiptHandle) continue;
      observed.push(message.Body);
      const envelope = JSON.parse(message.Body) as { Records?: S3Record[] };
      const record = envelope.Records?.find(
        candidate => candidate.eventSource === 'aws:s3',
      );
      if (record) {
        await sqs.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
        return record;
      }
    }
  }

  throw new Error(\`No S3 record received. Observed: \${JSON.stringify(observed)}\`);
}
\`\`\`

Deleting after successful parsing mirrors consumer acknowledgement. For a negative filter test, do not delete unrelated messages blindly; use a dedicated queue per scenario so an empty receive has a clear meaning.

## Assert semantics without overfitting the event

S3 event JSON contains useful fields, but exact snapshots are brittle. Version identifiers, event time, request IDs, sequencers, ETags, and emulator-specific details can vary. Assert the contract consumed by the application.

For an import worker, that might be event source, event-name family, bucket, decoded key, and optional size. Event object keys are URL encoded. In form-style encoding, spaces commonly appear as plus signs, so replacing plus with a space before \`decodeURIComponent\` is a practical decoder for the notification key.

Do not compare the sequencer lexicographically across different object keys. AWS documents it for ordering events for the same key, and values may have unequal length. If ordering matters, normalize lengths before comparison according to AWS guidance and retain same-key scope.

| Field | Strong assertion | Brittle assertion to avoid |
| --- | --- | --- |
| \`eventSource\` | Equals \`aws:s3\` | Entire record snapshot |
| \`eventName\` | Starts with expected family | Exact subtype when upload mechanism may change |
| Bucket | Exact run-created name | Fixed shared bucket |
| Object key | Decoded value equals uploaded key | Raw encoded string for names with spaces |
| Object size | Equals known byte length when consumed | Assuming it always exists for every event type |
| ETag | Present if application uses it | Treating ETag as a universal content hash |

## Test filter boundaries with positive and negative objects

A suffix filter is not proven by receiving a CSV event. Upload a near miss such as \`report.csv.tmp\` and assert no matching record arrives during a short, justified observation window. Then upload \`report.csv\` and assert delivery. Keep the same bucket and configuration so only the key differs.

Prefix and suffix rules operate on the object key. Test case sensitivity, nested prefixes, spaces, and characters that are encoded in notification JSON. Avoid overlapping filter configurations that AWS rejects for the same event types. Local emulation may not enforce every cloud-side validation rule, which is another reason for a small deployed infrastructure check.

Negative asynchronous assertions are inherently bounded, not absolute. State the window as a test engineering choice and keep the queue dedicated. A five-second absence on an empty local queue is meaningful; absence on a shared queue after aggressive message deletion is not.

## Model at-least-once delivery in the consumer

Amazon S3 event notifications are designed for at-least-once delivery and can be delayed or arrive out of order. LocalStack may produce one tidy message, but the application must tolerate duplicates.

After extracting a real record, invoke the handler twice with the identical event and assert one durable import. This is a consumer test rather than an S3 configuration test, and keeping them separate helps diagnosis.

\`\`\`typescript
test('the importer ignores a repeated S3 record', async () => {
  const event = {
    eventName: 'ObjectCreated:Put',
    eventSource: 'aws:s3',
    awsRegion: 'us-east-1',
    s3: {
      bucket: { name: 'uploads-test', arn: 'arn:aws:s3:::uploads-test' },
      object: { key: 'incoming%2Forders.csv', sequencer: '0065A1' },
    },
  } satisfies S3Record;

  await importHandler(event);
  await importHandler(event);

  const jobs = await importRepository.findByBucketAndKey(
    'uploads-test',
    'incoming/orders.csv',
  );
  assert.equal(jobs.length, 1);
});
\`\`\`

The application methods in this snippet are illustrative seams, not AWS APIs. A durable idempotency key can combine bucket, object key, version ID where enabled, and event sequencer or business identity. Choose it based on overwrite semantics.

For event-contract design across producers and consumers, see the [AsyncAPI event-driven testing guide](/blog/asyncapi-event-driven-testing-guide-2026).

## Cover creation, deletion, copy, and multipart behavior intentionally

\`s3:ObjectCreated:*\` covers multiple creation subtypes. A plain SDK \`PutObject\` commonly yields \`ObjectCreated:Put\`; copy and multipart completion can yield other names. If the consumer accepts every object-created event, parameterize realistic upload mechanisms rather than hard-coding only Put.

Deletion notifications require a separate event configuration. Versioned buckets distinguish delete markers and permanent version deletion. Do not add those cases unless the product consumes them, but document the absence so a later feature does not assume coverage.

Notification configuration replaces the bucket's current configuration when sent. A test or deployment that writes only its own queue rule can accidentally remove existing Lambda or topic rules. In isolated buckets this is fine; shared infrastructure code should manage the complete desired configuration.

## Local fidelity boundaries

LocalStack is valuable for API wiring, payload parsing, filters, and consumer flow. It is not proof of AWS IAM, service quotas, regional restrictions, eventual timing, or every edge of S3's distributed delivery.

Maintain a thin cloud test that deploys the real queue policy and notification configuration, uploads a uniquely named harmless object, and observes delivery. Run it less frequently if cost or duration requires, but keep it separate from fast pull-request integration tests.

| Concern | LocalStack test | AWS environment test |
| --- | --- | --- |
| SDK command construction | Strong evidence | Strong evidence |
| Event parser compatibility | Strong evidence | Final confirmation |
| Prefix and suffix behavior | Fast regression | Check critical rules |
| IAM source restrictions | Limited | Required |
| Service quotas | Not representative | Required where risk exists |
| Delivery latency distribution | Not representative | Measure with attributed observations |
| Application duplicate handling | Inject duplicates locally | Optional resilience confirmation |

Do not weaken local assertions because the emulator is “only a mock.” Instead, assert what it faithfully models and assign the remaining risks to the correct test layer.

## Cleanup and parallel execution

Use unique bucket and queue names for each test or worker. S3 bucket names have stricter naming requirements than arbitrary test titles, so use lowercase UUID-derived suffixes. Delete received messages and dispose of the container after the suite.

One container per test gives strongest isolation but can be slow. One container per worker plus unique resources is usually a good balance. Never purge a shared queue while another test may be waiting on it.

If a test fails before explicit resource deletion, container disposal removes local state. That is a major advantage over a long-lived developer LocalStack instance, where old messages can make new tests pass falsely. When using a persistent instance for manual debugging, include a run token in both resource names and object keys.

## Separate infrastructure failures from consumer failures

When one end-to-end test uploads a file and waits for a transformed database row, a timeout gives little direction. Retain three narrower checks. The first reads the bucket notification configuration after writing it and confirms the expected queue ARN, event family, and filter. The second uploads an object and inspects the raw SQS message, as shown above. The third calls the consumer with a fixed event and verifies application state. A small full-path test can sit above them.

This layering produces fast triage. Missing raw messages point to S3, SQS, endpoint, or filter wiring. A correct message with no database change points to parsing or consumer behavior. A correct database result with a failing full-path test suggests process startup, queue polling, visibility timeout, or credentials.

Preserve the raw body as a test attachment on parsing failure, after redacting anything sensitive. Do not log every queue message in successful CI runs because event payloads and object keys may contain customer-derived names. On timeout, report the bucket, key, notification configuration ID, queue URL host, and number of nonmatching messages observed. Those fields turn a generic “condition not met” into an actionable infrastructure diagnosis.

If the consumer changes message visibility while processing, test retry behavior with an intentionally short queue visibility timeout in a dedicated scenario. That is an SQS consumer concern rather than an S3 delivery concern, so it should not complicate the basic notification test. The same separation applies to dead-letter queues: verify redrive configuration and poison-message handling independently from object-created routing.

## Check notification replacement and removal

Configuration updates deserve a regression because \`PutBucketNotificationConfiguration\` replaces the bucket's notification document. Create two queue configurations in the isolated bucket, update one through the same infrastructure code used by deployment, then read the configuration back and prove both remain. This catches helper code that unintentionally preserves only its newest destination.

Also test disabling the feature. Apply an empty notification configuration or the product's intended removal operation, upload a matching object, and observe no queue event within a bounded local window. Then restore the configuration and prove delivery resumes. The pair distinguishes a genuine negative result from a broken poller.

If infrastructure as code owns the bucket, prefer testing its rendered plan and deployed result over maintaining a separate SDK configuration path solely for tests. The SDK test remains useful for application-created notifications, such as per-tenant buckets. In both cases, identify configurations by stable IDs and assert destination ARN plus filters. Array position is not a meaningful contract.

Local deletion should target the unique bucket and queue created by the current case. Before disposing the container, optionally list messages and objects on failure for diagnostics. Do not perform that inventory on every green run, since extra API traffic lengthens the suite and can obscure the event under test.

## Frequently Asked Questions

### Why does my LocalStack S3 upload succeed but SQS receives nothing?

Check that the bucket notification references the queue's actual ARN, both clients use the same region and reachable endpoint, the object key passes prefix or suffix filters, and polling waits for asynchronous delivery. In AWS, also verify the SQS resource policy.

### Do I need forcePathStyle for S3 local tests?

It is commonly needed because virtual-hosted bucket URLs require local DNS to resolve bucket-specific hostnames. Setting \`forcePathStyle: true\` makes the SDK address the configured LocalStack endpoint with the bucket in the path.

### Why is the object key in the event URL encoded?

S3 notification records encode object keys. Decode the value before comparing or fetching, accounting for plus signs representing spaces in the notification form-style encoding.

### Can this local test prove the production queue policy is correct?

No. Emulator authorization behavior is not a substitute for AWS IAM evaluation. Validate the queue policy and source restrictions with infrastructure tests in an AWS test account.

### Should the consumer expect exactly one notification per upload?

No. Design for at-least-once delivery and possible reordering. Test the handler with duplicate records and make the resulting business operation idempotent.
`,
};
