import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'AsyncAPI Contract Testing for Kafka',
  description:
    'Build AsyncAPI contract testing for Kafka topics with schema validation, routing checks, sample events, and consumer compatibility gates in CI.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# AsyncAPI Contract Testing for Kafka

A Kafka event contract is broken long before a consumer throws a deserialization error. The topic name may drift from the AsyncAPI document, a payload field may switch from integer to string, a producer may stop sending the key that keeps ordering stable, or a new event version may appear without a consumer migration plan. AsyncAPI gives you the contract language. Contract testing turns that document into a build gate.

This guide covers practical AsyncAPI contract tests for Kafka systems: validating example messages against schemas, checking that declared topics exist in a test cluster, comparing producer output to the channel contract, and catching compatibility breaks before a consumer group is surprised in production. For a broader event testing map, read [AsyncAPI event-driven testing guide 2026](/blog/asyncapi-event-driven-testing-guide-2026). For running Kafka in repeatable Node integration tests, pair this with [Testcontainers Kafka Node complete guide](/blog/testcontainers-kafka-node-complete-guide).

## Contract boundaries that matter for Kafka

AsyncAPI can describe many protocol details, but Kafka teams should be explicit about which parts are enforced. A useful Kafka contract covers the channel, payload schema, message key semantics, headers, event version, retention assumptions, and consumer expectations. It should not only be a pretty document for portal users.

The key distinction is producer contract versus broker contract. AsyncAPI describes what the producer promises to publish. Kafka itself enforces topic existence and some broker-level configuration, but it does not validate JSON field types by default. Contract tests need to bridge that gap by checking both the static document and real messages emitted by producer code.

| Contract surface | AsyncAPI location | Test technique | Failure caught |
|---|---|---|---|
| Topic name | channels object | Compare document channel keys with expected deployment topics | Producer publishes to orders.created.v2 while docs still say orders.created.v1. |
| Payload fields | message payload schema | Validate fixtures or captured messages with JSON Schema | Consumer receives amount as a string instead of number. |
| Required headers | message headers schema | Assert produced record headers before sending | Event version header is missing during a deployment. |
| Message key | bindings or team convention | Assert producer record key format in an integration test | Ordering by order id is lost because key became random. |
| Operation direction | publish or subscribe operation | Static AsyncAPI lint or parser test | Service documented as consuming a topic it actually produces. |
| Example messages | examples array | Validate every example against the payload schema | Documentation sample cannot be consumed by generated clients. |
| Version compatibility | schema evolution policy | Run old consumer schema against new event samples | Optional field became required without a migration window. |

## Parsing AsyncAPI and validating message examples

The first contract test should fail when the AsyncAPI document is invalid or when its own examples do not satisfy its schemas. This is a fast test, no broker required. The example below uses a YAML parser to load the AsyncAPI contract and Ajv to validate an example payload against the JSON Schema payload from a Kafka channel.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import Ajv from 'ajv';

const asyncapi = parse(readFileSync('contracts/orders.asyncapi.yaml', 'utf8'));

function payloadSchemaFor(channelName: string, messageName: string) {
  const channel = asyncapi.channels[channelName];
  const messageRef = channel.publish.message.oneOf.find((item: any) =>
    item.$ref.endsWith('/' + messageName),
  );
  const componentName = messageRef.$ref.split('/').pop();
  return asyncapi.components.messages[componentName].payload;
}

test('orders.created example matches the AsyncAPI payload schema', () => {
  const schema = payloadSchemaFor('orders.created.v1', 'OrderCreated');
  const example = {
    orderId: 'ord_123',
    customerId: 'cus_456',
    totalCents: 1299,
    currency: 'USD',
    createdAt: '2026-07-10T08:30:00.000Z',
  };

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  expect(validate(example)).toBe(true);
  expect(validate.errors).toBeNull();
});
\`\`\`

This intentionally avoids pretending that the parser validates every business rule. The parser can tell you the document is structurally valid. Ajv checks whether a concrete event conforms to the payload schema. You need both because a syntactically valid AsyncAPI file can still contain examples that lie.

## Modeling Kafka topics as channels

Kafka channels usually map to topics. Keep the channel name equal to the actual topic unless you have a strong reason not to. An alias such as OrderCreatedEvents may read nicely, but it forces every contract test to maintain a second mapping table. The cost shows up during incident review when the failing topic in broker logs does not match the contract path.

If you need environment prefixes, keep them out of the AsyncAPI channel. The contract should say orders.created.v1, not dev.orders.created.v1. Apply prefixes in deployment configuration and test that the deployment mapping is correct separately. Otherwise, the same event contract will appear to change across environments.

| Naming choice | Effect on tests | Recommendation |
|---|---|---|
| Channel equals topic | Contract tests can directly compare AsyncAPI keys to Kafka metadata | Prefer this for most product topics. |
| Channel is a friendly alias | Tests need a mapping layer before broker checks | Use only when documenting multiple physical topics behind one domain event. |
| Environment in channel name | Contract changes per environment | Avoid, use deployment mapping instead. |
| Version in topic name | Consumers can opt into versions explicitly | Useful when breaking event versions run side by side. |
| Version only in payload | Topic stays stable but consumers must branch inside messages | Useful for additive evolution, risky for breaking changes. |
| Operation id includes service name | Generated docs become easier to scan | Good, but do not rely on it for routing assertions. |

## Checking topic availability with KafkaJS

Contract tests that never touch a broker miss simple deployment failures. The following test uses KafkaJS admin APIs to verify that every AsyncAPI channel expected for the orders service exists in the test Kafka cluster. In a real suite, run this against a Testcontainers Kafka instance or a dedicated integration environment, not a shared production broker.

\`\`\`typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'contract-test-orders',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

test('AsyncAPI Kafka channels exist as topics', async () => {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const topics = await admin.listTopics();
    expect(topics).toEqual(expect.arrayContaining(['orders.created.v1', 'orders.cancelled.v1']));
  } finally {
    await admin.disconnect();
  }
});
\`\`\`

This is not a replacement for payload validation. It catches a different class of error: the contract says the service emits a topic, but the environment was not provisioned correctly. Keep broker checks short and deterministic. Topic existence, partitions, and maybe retention policy are reasonable. Full end-to-end consumer behavior belongs in integration tests.

## Testing the producer record, not only the JSON body

Kafka records have more than payloads. Keys, headers, timestamps, and partitioning strategy affect consumers. AsyncAPI teams often validate the JSON body and ignore the key. Then a producer refactor switches from order id to UUID as the record key, and consumers that rely on ordered events per order start seeing state regressions.

Write a producer contract test around the function that builds the Kafka record before it calls producer.send. The test should assert topic, key, headers, and value shape. If the producer sends Avro or Protobuf, replace JSON validation with the relevant schema registry checks. The principle stays the same: inspect the record that Kafka will receive.

\`\`\`typescript
import Ajv from 'ajv';
import { buildOrderCreatedRecord } from '../src/order-events';
import orderCreatedSchema from '../contracts/order-created.schema.json';

test('order created producer emits the contracted Kafka record', () => {
  const record = buildOrderCreatedRecord({
    id: 'ord_123',
    customerId: 'cus_456',
    totalCents: 1299,
    currency: 'USD',
  });

  expect(record.topic).toBe('orders.created.v1');
  expect(record.messages).toHaveLength(1);
  expect(record.messages[0].key).toBe('ord_123');
  expect(record.messages[0].headers).toMatchObject({
    eventType: Buffer.from('OrderCreated'),
    eventVersion: Buffer.from('1'),
  });

  const payload = JSON.parse(record.messages[0].value.toString('utf8'));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(orderCreatedSchema);

  expect(validate(payload)).toBe(true);
  expect(validate.errors).toBeNull();
});
\`\`\`

The buildOrderCreatedRecord function is your boundary. If your code constructs Kafka records inline in application services, extract that construction. Contract tests become simpler, and production code becomes easier to review for event changes.

## Compatibility checks for consumers

Kafka consumers rarely upgrade at exactly the same time as producers. Contract testing should model that lag. A new producer event sample should be validated against the current consumer parser. An older event sample should still be accepted if the consumer claims backward compatibility. These tests are not AsyncAPI syntax tests. They are compatibility tests driven by the contract examples.

Additive optional fields are usually safe. Removing fields, changing types, renaming enum values, or changing the key are breaking changes. Making a previously optional field required can also break replay scenarios where old events are read from a compacted or retained topic.

| Change | Producer view | Consumer risk | Contract gate |
|---|---|---|---|
| Add optional payload field | Usually safe | Old consumers ignore it if parsers are tolerant | Validate new sample against old consumer parser. |
| Add required payload field | Can be safe for new events | Replay of older events may fail | Keep field optional until retention window passes. |
| Rename field | Breaking | Consumers read undefined or default value | Require new topic or versioned message. |
| Change number to string | Breaking | Arithmetic and schema validation fail | Reject in schema diff review. |
| Remove header | Breaking if consumers route on it | Consumer cannot classify event | Header contract test blocks change. |
| Change record key | Operationally breaking | Per-entity ordering changes | Producer record test blocks change. |

## Where contract tests sit in the pipeline

Put static AsyncAPI validation and example schema checks in the normal unit test stage. They are fast and do not need Kafka. Put producer record tests near service tests because they import application code. Put broker metadata checks in integration tests where a Kafka broker is available. Do not make every pull request wait for a shared Kafka environment if the same signal can be produced locally with Testcontainers.

The contract should also be reviewed as a product artifact. When a breaking event change is necessary, the pull request should include the AsyncAPI update, migration notes, producer code, and consumer plan. A green test suite only proves the declared rules were followed. It does not decide whether the rollout is acceptable for every downstream team.

## Contract review checklist for Kafka pull requests

Reviewers should read event changes like API changes. The checklist is short but concrete: topic name unchanged or intentionally versioned, key semantics preserved, required fields justified, examples updated, headers still documented, consumer compatibility covered, and broker metadata aligned with deployment configuration. If any item is unclear, the change is not ready.

Do not rely on generated documentation screenshots as the review artifact. Generated docs are useful after the contract is correct. The source AsyncAPI diff tells you exactly which channel, message, schema, or header changed. That is where QA, developers, and platform engineers should focus.

## Handling schema references and shared components

AsyncAPI files often use shared components for messages and schemas. That is healthy, but it changes how tests should be written. A test that reads only the channel object may miss the referenced schema under components. Resolve references before validating examples, or keep a helper that follows local references consistently. Do not copy component schemas into test fixtures by hand. The copied version will drift from the contract.

Shared components also create blast radius. If AddressChanged is used by customer.updated.v1 and billing.customer.changed.v1, changing a required field affects both channels. Contract review should identify every channel that imports the component. Automated tests can load the document, find references to the changed component, and require examples for each affected message.

| Component change | Hidden risk | Test response |
|---|---|---|
| Add optional property to shared payload | Usually low, but generated clients may expose new field | Validate examples for every referencing message. |
| Add required property to shared payload | Old producers may not send it on all channels | Run producer fixture validation for all affected producers. |
| Change enum values | Consumers may reject unknown value | Add compatibility sample for old and new enum values. |
| Rename component | References can break silently in review | Parser test must resolve every local reference. |
| Split component into versions | Some channels may still point to old schema | Diff channel-to-component mapping in review output. |

## Consumer-driven examples for event contracts

Provider examples are necessary, but they can be too optimistic. Consumer-driven examples add messages that downstream services actually rely on: minimum payload, maximum realistic payload, optional fields absent, unknown optional fields present, historical enum values, and replayed old events. These examples should live near the contract so producer teams can see what compatibility means.

For Kafka, replay compatibility matters because consumers may reprocess retained messages. A new consumer should be tested against old event samples. A new producer should be tested against current consumer expectations. This two-way pressure prevents teams from treating event contracts as only forward-looking documentation.

Do not let consumer-driven examples become private test data hidden in one service repository. If the producer cannot see them, the contract is incomplete. A practical compromise is to store canonical examples in the contract repository and let consumers add service-specific edge cases in their own suites.

## Testing partition and ordering assumptions

AsyncAPI does not automatically protect Kafka ordering assumptions. If a consumer depends on all events for an order being processed in order, the contract must state the key rule and tests must assert it. The producer record test should verify that order-related events use orderId as the key. If one event uses customerId instead, ordering becomes inconsistent across partitions.

Partition count also affects assumptions. Increasing partitions can change key distribution but should preserve ordering for the same key. Removing or recreating topics can disrupt offsets and retention behavior. These are platform concerns, but QA should include them in contract review when an event stream carries workflow state.

| Ordering assumption | Contract phrase | Test check |
|---|---|---|
| All events for one order are ordered | Record key is orderId for order lifecycle topics | Producer record key equals order id for created, paid, cancelled. |
| Customer events can be parallelized by customer | Record key is customerId | Consumer handles independent customers concurrently. |
| Audit topic accepts all versions | Audit consumer treats eventVersion as data | Unknown version is stored, not rejected. |
| Payment events must not be compacted away | Retention policy keeps history for investigation | Broker metadata check covers cleanup policy in integration environment. |
| Snapshot events replace previous state | Compacted topic uses entity id key | Producer key remains stable across snapshots. |

## Versioning without surprise migrations

Versioning is not only a suffix. It is an operating agreement. If orders.created.v2 is introduced, who publishes both versions, for how long, and which consumers move first? Contract tests should reflect the migration stage. During dual publish, tests should require both v1 and v2 records from the producer. During consumer migration, tests should prove the consumer rejects unsupported versions clearly or supports both.

Avoid pretending that every breaking change can be hidden behind an optional field. If the meaning of a field changes, create a new field or version. If a consumer must compute a different business rule, document that in the contract notes and add examples that show old and new behavior. Event contracts fail when semantics drift while schemas still validate.

## Frequently Asked Questions

### Should AsyncAPI contract tests require a running Kafka broker?

Not all of them. Schema validation, example checks, and producer record assertions can run without Kafka. Broker metadata checks need Kafka, and they are best placed in an integration stage with an isolated broker.

### Is JSON Schema enough for Kafka event contracts?

It is enough for JSON payload shape, but not for Kafka-specific behavior. You still need assertions for topic, key, headers, versioning, and compatibility expectations. If you use Avro or Protobuf, use the schema tooling for that format instead of JSON Schema.

### Should every Kafka topic get a version suffix?

Use versioned topics when you need breaking versions to run side by side. For additive changes, a stable topic with schema evolution rules can be simpler. The important point is to make the compatibility policy explicit in the contract.

### How do I test that examples in AsyncAPI stay valid?

Load each example payload, resolve the message payload schema, and validate with the matching schema validator. Fail the build when an example does not satisfy the same schema consumers are expected to follow.

### What is the biggest blind spot in Kafka contract testing?

The record key. Teams validate payloads and forget that key changes can break ordering and partition locality. Treat the key as part of the contract, not as an implementation detail.
`,
};
