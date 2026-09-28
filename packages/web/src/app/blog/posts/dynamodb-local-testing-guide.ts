import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'DynamoDB Local Testing Guide: DynamoDB Local, moto, and LocalStack',
  description: 'A practical dynamodb local testing guide comparing DynamoDB Local, moto, and LocalStack so QA teams pick the right emulator and avoid cloud-parity traps.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# DynamoDB Local Testing Guide: DynamoDB Local, moto, and LocalStack

DynamoDB local testing in 2026 usually means choosing one of three tools: AWS DynamoDB Local for high-fidelity single-service tests, moto for fast Python unit tests, or LocalStack for workflows that need DynamoDB plus neighboring AWS services. None of them is a perfect replacement for real DynamoDB. The right setup is layered: fast mock tests for domain logic, containerized local tests for table behavior, and a small number of cloud tests for IAM, streams, backups, global tables, throttling, and production-like latency.

Current status matters. DynamoDB Local is an active AWS-supported downloadable and Docker-based local database with documented flags such as \`-inMemory\`, \`-sharedDb\`, \`-dbPath\`, \`-port\`, \`-delayTransientStatuses\`, and \`-disableTelemetry\`. Moto 5 replaced service-specific decorators with \`mock_aws\`, so old examples using \`mock_dynamodb2\` are stale. LocalStack is still active, but its old community GitHub repository is archived and read-only after the 2026 consolidation into the unified LocalStack for AWS image. Current LocalStack Docker and CI usage may require \`LOCALSTACK_AUTH_TOKEN\`, so pinning an old image tag is no longer the same operational choice as staying current.

This guide is written for QA and test-automation engineers who need tests that catch real DynamoDB mistakes: missing condition expressions, wrong key schemas, broken GSIs, bad serialization, unsafe retries, TTL assumptions, and code that quietly talks to real AWS from a developer laptop or CI runner.

## Choose The Local DynamoDB Layer By Test Intent

| Test intent | Best tool | Why it fits | What it will not prove |
|---|---|---|---|
| Pure Python unit test around repository logic | moto | In-process, very fast, no Docker dependency | Exact service parity, latency, IAM, Streams delivery |
| SDK integration against table definitions | DynamoDB Local | Official AWS local engine, real endpoint, Docker-friendly | IAM, PITR, real capacity behavior, complete cloud environment |
| Lambda plus DynamoDB plus SQS or EventBridge | LocalStack | Multi-service AWS emulation with one gateway endpoint | Full AWS parity, production quotas, exact failure timing |
| CI smoke test for table migrations | DynamoDB Local or LocalStack | Recreates tables and indexes from code | Cross-region global table behavior |
| Release confidence test | Real AWS test account | Exercises IAM, CloudWatch, Streams, TTL, backups, quotas | Fast local feedback |

The table should prevent the most common mistake: using one emulator for every test. A repository method that builds a \`PutItemCommand\` can be tested with moto or a narrow fake. A migration script that creates a table with a GSI should run against DynamoDB Local. A workflow that writes to DynamoDB and expects an SQS message from an event bridge needs LocalStack or real AWS, depending on how much parity the release gate requires.

## DynamoDB Local: Official Single-Service Fidelity

DynamoDB Local is the first tool to reach for when you want local tests to use the AWS SDK and a real HTTP endpoint without touching AWS. The Docker image is \`amazon/dynamodb-local\`, and AWS documents a Compose setup using \`-jar DynamoDBLocal.jar -sharedDb -dbPath ./data\`. The default service port is \`8000\`.

For disposable tests, \`-inMemory\` and \`-sharedDb\` are a clean combination. \`-inMemory\` avoids writing database files. \`-sharedDb\` makes every client use one local database instead of a database file derived from access key and Region. AWS notes that the SDK still requires an access key and Region, even though the values do not need to be valid for local use.

\`\`\`yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    command: '-jar DynamoDBLocal.jar -inMemory -sharedDb'
    ports:
      - '8000:8000'
    working_dir: /home/dynamodblocal
\`\`\`

For developer environments where you want to inspect data after a test run, use \`-dbPath\` instead of \`-inMemory\`. AWS documents that \`-dbPath\` and \`-inMemory\` cannot be used together.

\`\`\`yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    command: '-jar DynamoDBLocal.jar -sharedDb -dbPath ./data'
    ports:
      - '8000:8000'
    volumes:
      - './docker/dynamodb:/home/dynamodblocal/data'
    working_dir: /home/dynamodblocal
\`\`\`

Use \`-delayTransientStatuses\` when you want tests to experience slower GSI create and delete transitions. AWS documents that this flag currently introduces delays for global secondary indexes in \`CREATING\` or \`DELETING\` status. That makes it useful for migration code that polls table status instead of assuming indexes appear instantly.

| DynamoDB Local flag | Use it when | Test-design warning |
|---|---|---|
| \`-inMemory\` | You want isolated, disposable CI runs | Data disappears when the process exits |
| \`-sharedDb\` | Multiple tests or clients should see the same local database | Parallel test files can collide unless table names are unique |
| \`-dbPath ./data\` | You want persisted local state for debugging | Do not combine with \`-inMemory\` |
| \`-port 8000\` | You need a non-default port | Keep endpoint config centralized |
| \`-delayTransientStatuses\` | You test migration polling around GSIs | It is not a full simulation of service timing |
| \`-disableTelemetry\` | You need to suppress telemetry from the local process | Does not change DynamoDB behavior |

## A Minimal TypeScript Test Harness

The safest pattern is to create tables from the same schema code your app uses, wait until they exist, run tests, then delete or namespace them. Do not let tests depend on a manually created local table. That hides migration drift.

\`\`\`ts
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';

export function createLocalDynamoClient() {
  return new DynamoDBClient({
    endpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://127.0.0.1:8000',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'localtest',
      secretAccessKey: 'localtest',
    },
  });
}

export async function createOrdersTable(tableName: string) {
  const client = createLocalDynamoClient();
  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' },
        { AttributeName: 'gsi1pk', AttributeType: 'S' },
        { AttributeName: 'gsi1sk', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'gsi1',
          KeySchema: [
            { AttributeName: 'gsi1pk', KeyType: 'HASH' },
            { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );

  await waitUntilTableExists(
    { client, maxWaitTime: 20 },
    { TableName: tableName },
  );
}

export async function dropTable(tableName: string) {
  const client = createLocalDynamoClient();
  await client.send(new DeleteTableCommand({ TableName: tableName }));
}
\`\`\`

That code deliberately uses fake credentials. A local endpoint should never need production credentials. In CI, set \`AWS_ACCESS_KEY_ID\` and \`AWS_SECRET_ACCESS_KEY\` to harmless values if a library insists on reading environment variables.

\`\`\`bash
export AWS_ACCESS_KEY_ID=localtest
export AWS_SECRET_ACCESS_KEY=localtest
export AWS_REGION=us-east-1
export DYNAMODB_ENDPOINT=http://127.0.0.1:8000
npm test -- --runInBand
\`\`\`

The \`--runInBand\` flag is Jest-specific. If you run Vitest, filter a narrow test name with \`vitest -t "orders repository"\` or configure file-level isolation. If you run many integration tests in parallel, generate table names with a test worker suffix rather than sharing one table.

## Meaningful Assertions For DynamoDB Behavior

Local DynamoDB tests often pass while proving almost nothing. A weak test writes an item, checks for a status code, and stops. A useful test asserts the side effect, the key shape, the condition expression, and the query path your production code will use.

\`\`\`ts
import { afterAll, beforeAll, expect, test } from 'vitest';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createLocalDynamoClient, createOrdersTable, dropTable } from './dynamodb-testkit';

const tableName = 'orders_test_' + Math.random().toString(36).slice(2);
const doc = DynamoDBDocumentClient.from(createLocalDynamoClient());

beforeAll(async () => {
  await createOrdersTable(tableName);
});

afterAll(async () => {
  await dropTable(tableName);
});

test('creates an order once and exposes it through the customer index', async () => {
  const order = {
    pk: 'ORDER#1001',
    sk: 'META#1001',
    gsi1pk: 'CUSTOMER#42',
    gsi1sk: 'ORDER#2026-09-28#1001',
    status: 'created',
  };

  await doc.send(
    new PutCommand({
      TableName: tableName,
      Item: order,
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );

  const stored = await doc.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: 'ORDER#1001', sk: 'META#1001' },
    }),
  );
  expect(stored.Item).toMatchObject({ status: 'created', gsi1pk: 'CUSTOMER#42' });

  const byCustomer = await doc.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :customer and begins_with(gsi1sk, :prefix)',
      ExpressionAttributeValues: {
        ':customer': 'CUSTOMER#42',
        ':prefix': 'ORDER#2026-09-28',
      },
    }),
  );
  expect(byCustomer.Items?.map((item) => item.pk)).toEqual(['ORDER#1001']);

  await expect(
    doc.send(
      new PutCommand({
        TableName: tableName,
        Item: { ...order, status: 'duplicate' },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    ),
  ).rejects.toBeInstanceOf(ConditionalCheckFailedException);
});
\`\`\`

This test checks the side effect, not just the call. It also proves the GSI shape, which is where many DynamoDB regressions hide. The anchored date-like prefix in the query is specific enough to catch serialization mistakes without pretending local tests validate every production access pattern.

## Moto: Fast Python Tests With Clear Boundaries

Moto is not a DynamoDB server by default. It intercepts boto3 calls inside Python tests. That makes it excellent for repository logic, serializers, condition-expression construction, and code paths where you want no Docker dependency. Moto 5 changed the public testing surface: use \`from moto import mock_aws\`, not old service-specific decorators.

\`\`\`python
import boto3
import pytest
from botocore.exceptions import ClientError
from moto import mock_aws


def create_table(client, table_name):
    client.create_table(
        TableName=table_name,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "sk", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "pk", "KeyType": "HASH"},
            {"AttributeName": "sk", "KeyType": "RANGE"},
        ],
    )


@mock_aws(config={"core": {"service_whitelist": ["dynamodb"]}})
def test_put_item_requires_unique_primary_key():
    client = boto3.client("dynamodb", region_name="us-east-1")
    create_table(client, "orders")

    item = {
        "pk": {"S": "ORDER#1001"},
        "sk": {"S": "META#1001"},
        "status": {"S": "created"},
    }
    client.put_item(
        TableName="orders",
        Item=item,
        ConditionExpression="attribute_not_exists(pk)",
    )

    with pytest.raises(ClientError) as exc:
        client.put_item(
            TableName="orders",
            Item={**item, "status": {"S": "duplicate"}},
            ConditionExpression="attribute_not_exists(pk)",
        )

    assert exc.value.response["Error"]["Code"] == "ConditionalCheckFailedException"
    stored = client.get_item(
        TableName="orders",
        Key={"pk": {"S": "ORDER#1001"}, "sk": {"S": "META#1001"}},
    )
    assert stored["Item"]["status"]["S"] == "created"
\`\`\`

Moto's DynamoDB coverage is broad for core CRUD and table APIs, but its own implemented-services documentation marks gaps. For example, global table APIs are not fully implemented, some advanced APIs are missing, and PartiQL support has documented limitations such as incomplete pagination and experimental parsing. That is normal for a mock. Treat those gaps as routing rules: use moto for fast logic feedback, not for release confidence around unsupported DynamoDB features.

| Moto is good at | Prefer another layer when |
|---|---|
| Python unit tests around boto3 code | You need SDK behavior from TypeScript, Java, Go, or .NET |
| Fast condition-expression checks | You need exact HTTP endpoint behavior |
| Fake AWS credentials and isolation | You need IAM trust policy or OIDC validation |
| Repository methods that call one AWS service | You need Streams, Lambda triggers, SQS, or EventBridge |
| Running in restricted CI without Docker | You need parity for a table migration |

The failure mode to watch is accidental real AWS access. If boto3 clients are created before the \`mock_aws\` decorator starts, or if code holds global clients across tests, requests may bypass the mock. Diagnose by forcing fake credentials, blocking network egress in CI where possible, and creating clients inside the mock scope. If a test can pass only when a developer has real AWS credentials configured, it is not a local test.

## LocalStack: Multi-Service Workflows, With 2026 Auth Changes

LocalStack is the right local layer when DynamoDB is only one piece of the behavior. A common example is an API handler that writes a row, publishes an event, and expects a downstream consumer to process it. DynamoDB Local cannot emulate the whole AWS environment. Moto can emulate multiple services in Python, but it will not test a Node Lambda container talking over an AWS-compatible endpoint. LocalStack sits in the middle.

The 2026 operational change matters for CI. LocalStack's current docs and announcements describe a unified image, calendar-style version tags starting around the end-of-March 2026 release, and \`LOCALSTACK_AUTH_TOKEN\` for authenticated Docker and CI use. Teams can still pin older tags in some cases, but that means accepting stale emulator behavior. For a CI dependency, staying current and storing a CI auth token as a secret is usually cleaner than silently freezing the emulator forever.

\`\`\`yaml
services:
  localstack:
    image: localstack/localstack:2026.03.0
    ports:
      - '4566:4566'
      - '4510-4559:4510-4559'
    environment:
      - LOCALSTACK_AUTH_TOKEN=\${LOCALSTACK_AUTH_TOKEN}
      - PERSISTENCE=0
    volumes:
      - '/var/run/docker.sock:/var/run/docker.sock'
\`\`\`

The endpoint model is simple: AWS SDK clients point at \`http://localhost:4566\` from the host, or \`http://localstack:4566\` from another container on the same Compose network. Keep that mapping in one test config module so agents and humans do not scatter endpoints through the codebase.

\`\`\`ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';

const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://127.0.0.1:4566';
const region = process.env.AWS_REGION ?? 'us-east-1';
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
};

export const dynamodb = new DynamoDBClient({ endpoint, region, credentials });
export const sqs = new SQSClient({ endpoint, region, credentials });
\`\`\`

Use LocalStack for workflow assertions, not for checking every DynamoDB edge case. For example, after an API call, assert that the item exists in DynamoDB and that an SQS message was produced. Do not infer production capacity, exact retry behavior, or IAM enforcement unless the specific LocalStack plan and service coverage support that behavior and your test proves it.

## TTL, Streams, GSIs, And Parity Traps

DynamoDB has features that local tests commonly misunderstand. TTL is the best example. In real DynamoDB, TTL deletes are asynchronous. A test that expects an expired item to disappear immediately is wrong, even if a local emulator can be forced to delete it quickly. Test your code's TTL attribute calculation locally, then verify expiration behavior in a cloud canary or scheduled integration test if it matters to the product.

Streams are another trap. DynamoDB Local is useful for table operations, but workflows based on Streams, Lambda event source mappings, and downstream retries need a higher layer. LocalStack documents DynamoDB Streams support, but also documents service-specific coverage and plan details. Read coverage before turning a stream test into a release gate. If a payment, audit, or compliance workflow depends on stream ordering or retry behavior, run a small real AWS test too.

GSIs are worth testing locally because many production bugs are just wrong key design. DynamoDB Local can create and query GSIs, and \`-delayTransientStatuses\` can expose migration code that assumes immediate readiness. Moto can catch many GSI query mistakes in Python. Still, local tools will not model every production operational limit. Use local tests to prove your schema and query expressions, then use cloud tests for capacity, throttling, PITR, global tables, encryption, and IAM.

| Feature | DynamoDB Local | moto | LocalStack | Real AWS test still needed for |
|---|---|---|---|---|
| Primary key CRUD | Strong fit | Strong fit for Python | Strong fit | Latency and throttling |
| Conditional writes | Strong fit | Useful fit | Strong fit | Race behavior under concurrency |
| GSIs | Strong fit | Useful for supported paths | Strong fit | Backfill timing and limits |
| TTL | Attribute setup only for most local suites | Attribute setup only | Check current coverage | Asynchronous deletion behavior |
| Streams | Not the main fit | Limited workflow confidence | Better fit with coverage check | Event source mapping, ordering, retries |
| Global tables | Not a local confidence layer | Marked gaps in moto docs | Coverage-dependent | Cross-region replication |
| PITR and backups | DynamoDB Local docs note PITR is unsupported | Coverage-dependent | Coverage-dependent | Restore and compliance workflows |

What people get wrong: they ask whether the emulator "supports DynamoDB" instead of asking which DynamoDB promise their test needs. A local query test needs key-condition semantics. A migration test needs table and index creation semantics. A resilience test needs throttling, retry, and failure timing. Those are different promises.

## CI Setup For Local DynamoDB Tests

In GitHub Actions, run DynamoDB Local as a service container, point tests at \`localhost:8000\`, and upload failure evidence. The example uses current action majors and keeps cloud credentials fake.

\`\`\`yaml
name: dynamodb-local-tests

on:
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      dynamodb:
        image: amazon/dynamodb-local:latest
        ports:
          - 8000:8000
        options: >-
          --health-cmd "curl -f http://localhost:8000/shell/ || exit 0"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        command: '-jar DynamoDBLocal.jar -inMemory -sharedDb'
    env:
      AWS_ACCESS_KEY_ID: localtest
      AWS_SECRET_ACCESS_KEY: localtest
      AWS_REGION: us-east-1
      DYNAMODB_ENDPOINT: http://127.0.0.1:8000
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --runInBand
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: dynamodb-test-output-\${{ github.run_id }}
          path: |
            test-results/
            coverage/
\`\`\`

In GitLab CI, use a service alias and remember that the job container reaches the service by alias, not by localhost.

\`\`\`yaml
stages:
  - test

dynamodb-local:
  image: node:22-bookworm
  services:
    - name: amazon/dynamodb-local:latest
      alias: dynamodb
      command: ['-jar', 'DynamoDBLocal.jar', '-inMemory', '-sharedDb']
  variables:
    AWS_ACCESS_KEY_ID: localtest
    AWS_SECRET_ACCESS_KEY: localtest
    AWS_REGION: us-east-1
    DYNAMODB_ENDPOINT: http://dynamodb:8000
  script:
    - npm ci
    - npm test -- --runInBand
  artifacts:
    when: always
    expire_in: 7 days
    paths:
      - test-results/
    reports:
      junit: test-results/junit.xml
\`\`\`

If your suite uses Testcontainers instead of CI service containers, the same boundaries apply. Testcontainers is often better for developer machines because each test process can own a container lifecycle and random port. The patterns in [Testcontainers LocalStack AWS mocking guide](/blog/testcontainers-localstack-aws-mocking-guide) and [Testcontainers best practices 2026](/blog/testcontainers-best-practices-2026) are especially useful when agents generate integration tests and you want isolation by default.

## Diagnosing A Realistic Failure: The Phantom Missing Item

Imagine a CI failure where a test writes an order, queries the customer GSI, and receives no items. The write succeeded, and the table exists. A weak diagnosis blames DynamoDB Local. A better diagnosis follows the data shape.

First, fetch the item by primary key and assert the indexed attributes exist. If \`gsi1pk\` or \`gsi1sk\` is missing, the issue is serialization. Second, describe the table and assert the index name is exactly \`gsi1\`. If the name differs, the query is pointing at the wrong index. Third, check the query expression and values. An anchored prefix such as \`ORDER#2026-09-28\` catches date-format drift better than a loose contains assertion. Fourth, wait for table and index readiness if the test creates schema at runtime.

\`\`\`ts
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodbDocument, dynamodbRaw } from './clients';

export async function assertOrderIndexed(tableName: string, orderId: string) {
  const table = await dynamodbRaw.send(new DescribeTableCommand({ TableName: tableName }));
  const indexNames = table.Table?.GlobalSecondaryIndexes?.map((index) => index.IndexName) ?? [];
  expect(indexNames).toContain('gsi1');

  const item = await dynamodbDocument.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: 'ORDER#' + orderId, sk: 'META#' + orderId },
    }),
  );

  expect(item.Item).toBeDefined();
  expect(item.Item?.gsi1pk).toMatch(/^CUSTOMER#[A-Z0-9-]+$/);
  expect(item.Item?.gsi1sk).toMatch(/^ORDER#\\d{4}-\\d{2}-\\d{2}#[A-Z0-9-]+$/);
}
\`\`\`

Notice the presence check before reading indexed fields. That is not ceremony. It makes the failure message point to the missing item instead of throwing a confusing property-access error. Good local tests are diagnostic tools, not just pass/fail switches.

## The Layered Strategy I Recommend

Use moto for Python units where the important assertion is "our code sends the right DynamoDB operation." Use DynamoDB Local for SDK-level integration and schema behavior. Use LocalStack when the behavior crosses service boundaries. Use real AWS for anything involving IAM, OIDC, Streams event source mappings, global tables, PITR, backups, capacity, throttling, or operational alarms.

Keep table creation code close to application migrations. Generate unique table names for parallel tests. Use fake credentials for local endpoints. Block accidental real AWS calls in CI. Save JUnit and logs as artifacts. Let AI coding agents add new test cases, but make them reuse the central test harness instead of inventing endpoint config in every file.

The payoff is confidence without waiting for the cloud on every edit. Local tests should catch shape mistakes in seconds. Cloud tests should be smaller, more expensive, and tied to the risks only AWS can prove.

## Frequently Asked Questions

### Is DynamoDB Local the same as real DynamoDB?

No. DynamoDB Local is the best official local endpoint for many table, item, and index tests, but AWS documents differences. For example, DynamoDB Local always returns null for \`billingModeSummary\` and does not support Point-in-time recovery. It also cannot prove IAM, real regional behavior, production latency, or capacity limits. Use it to validate SDK usage, table schemas, keys, conditions, and query paths, then keep targeted real AWS tests for operational features.

### Should I use moto or DynamoDB Local for Python tests?

Use moto when speed and in-process isolation matter most, especially for repository methods that call boto3 directly. Use DynamoDB Local when you want a real endpoint, Docker-based parity, or language-neutral integration tests. Moto 5 uses \`mock_aws\`, and its DynamoDB documentation lists implemented and missing endpoints, so check coverage before relying on it for advanced behavior. Many mature suites use both: moto for unit feedback, DynamoDB Local for schema confidence.

### Does LocalStack replace DynamoDB Local?

Not exactly. LocalStack is broader, not automatically better for every DynamoDB test. If your test only needs a table endpoint, DynamoDB Local is simpler and official. If your workflow needs DynamoDB plus SQS, Lambda, EventBridge, IAM-like configuration, or other AWS services, LocalStack becomes more useful. In 2026, also account for LocalStack's unified image and auth-token requirements in CI. That operational dependency should be explicit in your pipeline.

### How do I prevent local tests from touching real AWS?

Centralize client creation and require an explicit local endpoint in test mode. Set fake \`AWS_ACCESS_KEY_ID\`, \`AWS_SECRET_ACCESS_KEY\`, and \`AWS_REGION\` in CI. For moto, create boto3 clients inside the \`mock_aws\` scope. For SDK integration tests, fail fast if \`DYNAMODB_ENDPOINT\` or \`AWS_ENDPOINT_URL\` is missing. Stronger teams also block network egress to AWS from local-test jobs so a misconfigured client fails loudly instead of mutating real infrastructure.
`,
};
