import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers LocalStack AWS Mocking — Complete Guide 2026',
  description:
    'Master Testcontainers with LocalStack for AWS integration tests. S3, DynamoDB, SQS, Lambda, SNS, and IAM tests with Docker and Node.js.',
  date: '2026-05-04',
  category: 'Guide',
  content: `
# Testcontainers LocalStack AWS Mocking Complete Guide

LocalStack is a fully functional local AWS cloud emulator that runs as a single Docker container. It implements over 80 AWS services with high fidelity to the real AWS API behavior. Combined with Testcontainers, it gives Node.js (and other language) teams the ability to write integration tests against S3, DynamoDB, SQS, SNS, Lambda, IAM, and dozens of other services without spending a single dollar on AWS, and without the network latency of hitting real AWS endpoints.

This guide is a hands-on walkthrough of Testcontainers with LocalStack for AWS integration testing in 2026. We cover the official @testcontainers/localstack module, AWS SDK v3 configuration, service-by-service patterns (S3, DynamoDB, SQS, SNS, Lambda), Pro vs Community feature differences, container reuse, and CI/CD setup. Every code sample is working TypeScript with Vitest and the AWS SDK v3.

---

## Key Takeaways

- **LocalStackContainer** provides one-line setup for the LocalStack AWS emulator
- **AWS SDK v3** needs three overrides to talk to LocalStack: endpoint, credentials, region
- **Most services work in Community edition** — only ~10 services require Pro
- **Container reuse** drops startup from 15 seconds to under 2 seconds
- **CI/CD setup is trivial** because Docker is available on GitHub Actions runners

---

## Why Use Testcontainers with LocalStack

The standard alternatives for AWS testing have severe drawbacks. Manual mocks with aws-sdk-mock or aws-sdk-client-mock cover only a subset of API behavior and require ongoing maintenance as the AWS SDK evolves. Test against real AWS and you incur costs, hit rate limits, depend on network availability, and cannot parallelize across PRs without account-wide contention. Test against staging environments and you have all the same problems as a shared dev database.

LocalStack-via-Testcontainers gives you a fresh AWS cloud per test suite, runs offline, is free, and reproduces real AWS behavior with very high fidelity.

---

## Installation

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/localstack
npm install --save-dev vitest @aws-sdk/client-s3 @aws-sdk/client-dynamodb @aws-sdk/client-sqs
\`\`\`

Verify Docker. LocalStack uses about 1-2 GB of RAM per container.

Vitest config:

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
  },
});
\`\`\`

---

## Your First Test (S3)

\`\`\`typescript
import { LocalstackContainer, StartedLocalStackContainer } from '@testcontainers/localstack';
import { S3Client, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

describe('S3 integration', () => {
  let container: StartedLocalStackContainer;
  let s3: S3Client;

  beforeAll(async () => {
    container = await new LocalstackContainer('localstack/localstack:3.5').start();
    s3 = new S3Client({
      endpoint: container.getConnectionUri(),
      region: 'us-east-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      forcePathStyle: true,
    });
  });

  afterAll(async () => {
    s3.destroy();
    await container.stop();
  });

  it('uploads and downloads a file', async () => {
    await s3.send(new CreateBucketCommand({ Bucket: 'my-bucket' }));
    await s3.send(new PutObjectCommand({
      Bucket: 'my-bucket',
      Key: 'hello.txt',
      Body: 'Hello, World!',
    }));
    const result = await s3.send(new GetObjectCommand({
      Bucket: 'my-bucket',
      Key: 'hello.txt',
    }));
    const body = await result.Body!.transformToString();
    expect(body).toBe('Hello, World!');
  });
});
\`\`\`

Three things to note: \`endpoint\` points at the container, \`credentials\` are dummy (\`test\`/\`test\`), and \`forcePathStyle: true\` is required because LocalStack uses path-style URLs by default.

---

## LocalstackContainer API Reference

| Method | Purpose |
|---|---|
| \`new LocalstackContainer(image)\` | Constructor; \`localstack/localstack:3.5\` recommended |
| \`.withServices(...names)\` | Pre-enable services to speed up first call |
| \`.withReuse()\` | Reuse container across runs |
| \`.withEnvironment(env)\` | Set env vars (e.g., LOCALSTACK_API_KEY for Pro) |
| \`.start()\` | Boot container |

After start:

| Method | Returns |
|---|---|
| \`getHost()\` | Hostname |
| \`getMappedPort(4566)\` | Edge port |
| \`getConnectionUri()\` | Full URL like http://localhost:32768 |

---

## DynamoDB Pattern

\`\`\`typescript
import {
  DynamoDBClient,
  CreateTableCommand,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({
  endpoint: container.getConnectionUri(),
  region: 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

beforeAll(async () => {
  await ddb.send(new CreateTableCommand({
    TableName: 'users',
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
    BillingMode: 'PAY_PER_REQUEST',
  }));
});

it('stores and retrieves user', async () => {
  await ddb.send(new PutItemCommand({
    TableName: 'users',
    Item: {
      userId: { S: 'alice' },
      email: { S: 'alice@example.com' },
    },
  }));
  const result = await ddb.send(new GetItemCommand({
    TableName: 'users',
    Key: { userId: { S: 'alice' } },
  }));
  expect(result.Item?.email.S).toBe('alice@example.com');
});
\`\`\`

---

## SQS Pattern

\`\`\`typescript
import {
  SQSClient,
  CreateQueueCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';

const sqs = new SQSClient({
  endpoint: container.getConnectionUri(),
  region: 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

it('sends and receives a message', async () => {
  const create = await sqs.send(new CreateQueueCommand({ QueueName: 'my-queue' }));
  const queueUrl = create.QueueUrl!;

  await sqs.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify({ orderId: '123' }),
  }));

  const receive = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    WaitTimeSeconds: 1,
  }));
  expect(receive.Messages).toHaveLength(1);
  expect(JSON.parse(receive.Messages![0].Body!).orderId).toBe('123');
});
\`\`\`

---

## SNS Pattern

\`\`\`typescript
import { SNSClient, CreateTopicCommand, SubscribeCommand, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({ /* ...config */ });

it('publishes to a topic with SQS subscriber', async () => {
  const topic = await sns.send(new CreateTopicCommand({ Name: 'events' }));
  const queue = await sqs.send(new CreateQueueCommand({ QueueName: 'subscriber' }));

  const queueArn = \`arn:aws:sqs:us-east-1:000000000000:subscriber\`;
  await sns.send(new SubscribeCommand({
    TopicArn: topic.TopicArn!,
    Protocol: 'sqs',
    Endpoint: queueArn,
    Attributes: { RawMessageDelivery: 'true' },
  }));

  await sns.send(new PublishCommand({
    TopicArn: topic.TopicArn!,
    Message: 'hello',
  }));

  const receive = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: queue.QueueUrl!,
    WaitTimeSeconds: 2,
  }));
  expect(receive.Messages).toHaveLength(1);
});
\`\`\`

---

## Lambda Pattern

\`\`\`typescript
import { LambdaClient, CreateFunctionCommand, InvokeCommand } from '@aws-sdk/client-lambda';
import { readFileSync } from 'fs';

const lambda = new LambdaClient({ /* ...config */ });

it('invokes a Lambda function', async () => {
  const code = readFileSync('./fixtures/handler.zip');

  await lambda.send(new CreateFunctionCommand({
    FunctionName: 'my-fn',
    Runtime: 'nodejs20.x',
    Role: 'arn:aws:iam::000000000000:role/lambda-role',
    Handler: 'index.handler',
    Code: { ZipFile: code },
  }));

  const result = await lambda.send(new InvokeCommand({
    FunctionName: 'my-fn',
    Payload: Buffer.from(JSON.stringify({ name: 'world' })),
  }));

  const payload = JSON.parse(new TextDecoder().decode(result.Payload));
  expect(payload.message).toBe('Hello, world');
});
\`\`\`

Lambda requires Docker-in-Docker because LocalStack runs Lambda functions in their own containers. On Mac and Linux this works out of the box; on Windows you may need to enable WSL2.

---

## Pre-Enabling Services

LocalStack lazy-loads services on first API call, which adds 2-3 seconds per service. Pre-enable to avoid this:

\`\`\`typescript
container = await new LocalstackContainer('localstack/localstack:3.5')
  .withEnvironment({
    SERVICES: 's3,dynamodb,sqs,sns,lambda',
  })
  .start();
\`\`\`

---

## Service Support Matrix

| Service | Community | Pro Required | Notes |
|---|---|---|---|
| S3 | Yes | No | Full API |
| DynamoDB | Yes | No | Full API |
| SQS | Yes | No | Full API |
| SNS | Yes | No | Full API |
| Lambda | Yes | No | Requires Docker-in-Docker |
| IAM | Yes | No | Basic permissions |
| Kinesis | Yes | No | Streams + Firehose |
| Step Functions | Yes | No | State machines |
| ECS | Partial | Pro | Pro required for full |
| EKS | No | Pro | Pro only |
| RDS | No | Pro | Pro only |
| CloudFront | No | Pro | Pro only |
| Route 53 | No | Pro | Pro only |
| AppSync | No | Pro | Pro only |

The Community edition covers about 80% of typical AWS testing needs.

---

## Per-Test Isolation

LocalStack does not provide a built-in reset endpoint in Community. Two patterns:

**Pattern 1: Delete and recreate resources.** Slow but reliable:

\`\`\`typescript
afterEach(async () => {
  await s3.send(new DeleteBucketCommand({ Bucket: 'my-bucket' }));
});
\`\`\`

**Pattern 2: Use unique names per test.** Faster:

\`\`\`typescript
const bucketName = \`test-\${Date.now()}-\${Math.random().toString(36).slice(2)}\`;
\`\`\`

For Pro users, hit the \`/_localstack/state/reset\` endpoint to wipe all state instantly.

---

## Container Reuse

\`\`\`typescript
container = await new LocalstackContainer('localstack/localstack:3.5')
  .withReuse()
  .start();
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

---

## CI/CD Configuration

\`\`\`yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
\`\`\`

For Pro features, pass the API key:

\`\`\`yaml
      - run: npm test
        env:
          LOCALSTACK_API_KEY: \${{ secrets.LOCALSTACK_API_KEY }}
\`\`\`

---

## Common Pitfalls

**forcePathStyle.** Always set \`forcePathStyle: true\` for S3 with LocalStack.

**Dummy credentials.** Use \`test\`/\`test\` consistently. Real-looking credentials confuse LocalStack.

**Region selection.** Stick with \`us-east-1\` to avoid surprises. LocalStack supports multi-region but it adds complexity.

**Resource leaks.** Always cleanup created resources or use unique names.

**Lambda Docker-in-Docker.** Lambda requires Docker socket access. On Mac and Linux this is automatic; on Windows enable WSL2.

---

## Conclusion

LocalStack with Testcontainers brings AWS integration testing into the realm of fast, free, deterministic tests. S3, DynamoDB, SQS, SNS, and Lambda all work locally exactly like production. Setup is one line, CI is trivial, and the result is dramatically faster feedback loops for teams building on AWS.

Browse the [QA skills directory](/skills) for related cloud testing patterns, or read our [Testcontainers Best Practices 2026](/blog/testcontainers-best-practices-2026) for architectural patterns.
`,
};
