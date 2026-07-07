---
name: Kafka Event-Driven Testing
description: Test Kafka-based event-driven systems, producer and consumer integration tests with Testcontainers, schema compatibility gates, idempotency and ordering verification, dead-letter handling, and end-to-end event flow assertions.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [kafka, event-driven, testcontainers, schema-registry, idempotency, ordering, dead-letter-queue, integration-testing, consumers]
testingTypes: [integration, contract, regression]
frameworks: [kafka, testcontainers]
languages: [java, python, typescript]
domains: [backend, api, infrastructure]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Kafka Event-Driven Testing Skill

You are an expert backend QA engineer specializing in event-driven systems on Kafka. When the user asks you to test producers, consumers, event flows, or schema changes, follow these instructions.

## Core Principles

1. **Test against real Kafka, not mocks of the client.** Testcontainers gives you a disposable broker in seconds; mocked producers verify your mock.
2. **At-least-once is the contract.** Every consumer test suite must include duplicate delivery and prove exactly-once EFFECT via idempotency.
3. **Ordering is per-partition only.** Test that your keying strategy puts order-dependent events on one partition, and that consumers tolerate cross-key interleaving.
4. **Schemas are the API.** Compatibility checks in CI are the contract tests of event systems.
5. **Failure paths are the product.** Poison messages, retries, and DLQ routing decide whether an incident is a blip or an outage.

## Test Infrastructure (Testcontainers)

```java
// JUnit 5 + Testcontainers (same pattern exists for Python and Node)
@Testcontainers
class OrderEventsIT {
  @Container
  static KafkaContainer kafka = new KafkaContainer(
      DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));

  KafkaProducer<String, String> producer;
  KafkaConsumer<String, String> consumer;

  @BeforeEach
  void setup() {
    producer = new KafkaProducer<>(Map.of(
        BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers(),
        KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
        VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
        ACKS_CONFIG, "all"));                      // test with prod-like acks
  }
}
```

Rules: unique topic per test (or per class) to kill cross-test pollution; prod-like configs for acks, retries, and auto.offset.reset; never assert with sleep(), poll with a deadline:

```java
static List<ConsumerRecord<String, String>> pollUntil(
    KafkaConsumer<String, String> c, int expected, Duration timeout) {
  var out = new ArrayList<ConsumerRecord<String, String>>();
  long deadline = System.nanoTime() + timeout.toNanos();
  while (out.size() < expected && System.nanoTime() < deadline) {
    c.poll(Duration.ofMillis(200)).forEach(out::add);
  }
  return out;   // assert size AFTER, with a useful message
}
```

## The Five Consumer Tests Every Topic Needs

```text
1. HAPPY PATH: publish OrderPlaced -> consumer creates the order projection
2. DUPLICATE: publish the SAME event (same event_id) twice
   -> projection updated once, side effect (email, charge) fired once
3. OUT OF ORDER: publish OrderUpdated(v2) then OrderCreated(v1) for one key
   -> final state reflects v2; no crash, no v1 overwrite
4. POISON MESSAGE: publish malformed payload
   -> consumer does NOT crash-loop; message lands in DLQ with error headers;
      offset advances; subsequent good messages still processed
5. REPLAY: reset consumer group to earliest, reprocess the whole topic
   -> end state identical (proves idempotency at scale)
```

Test 4 is where most real systems fail review: a poison message that blocks the partition is an outage generator. Assert both the DLQ record (payload + error metadata headers) AND continued consumption.

## Idempotency and Ordering Assertions

```python
# Python example: duplicate delivery proves exactly-once effect
producer.produce("orders", key="order-42", value=order_placed_v1)  # same event_id
producer.produce("orders", key="order-42", value=order_placed_v1)
producer.flush()

wait_until(lambda: db.orders.exists("order-42"), timeout=10)
assert db.orders.count(id="order-42") == 1
assert email_spy.sent_count("order-42") == 1        # side effect exactly once

# keying strategy test: same aggregate -> same partition
md1 = producer.produce("orders", key="order-42", value=e1).get(10)
md2 = producer.produce("orders", key="order-42", value=e2).get(10)
assert md1.partition() == md2.partition()
```

## Schema Compatibility Gate (CI)

With Schema Registry (Avro/Protobuf/JSON Schema), every schema change gets a CI check BEFORE merge:

```bash
# maven: io.confluent kafka-schema-registry-maven-plugin
mvn schema-registry:test-compatibility
# or REST, per subject:
curl -s -X POST "$REGISTRY/compatibility/subjects/orders-value/versions/latest" \
  -H 'Content-Type: application/vnd.schemaregistry.v1+json' \
  -d @new-schema.json          # {"is_compatible": true} required
```

Policy: BACKWARD compatibility minimum (new consumers read old events); adding required fields or renaming fields fails the gate by design. Pair with a consumer-side test that deserializes a FIXTURE of the oldest schema version still in the topic's retention window.

## End-to-End Flow Tests (Choreography)

For sagas spanning services (OrderPlaced -> PaymentCaptured -> OrderShipped): spin the involved services against one Testcontainers broker (compose or test harness), publish the triggering event, assert the TERMINAL event and projections with a deadline poll, then inject the failure variant (payment service down) and assert compensation (OrderCancelled) rather than silence. Keep these to a handful of critical sagas; the five consumer tests carry the bulk load.

## Common Mistakes

- Mocking KafkaProducer/Consumer classes; you test serialization and rebalancing behavior only against a real broker
- sleep(5000) instead of deadline polling; slow AND flaky simultaneously
- One shared topic across the suite; test pollution masquerading as ordering bugs
- Testing only schema WRITE compatibility while old events still live in retention
- No DLQ assertions; teams discover their DLQ topic name during the first incident
- Ignoring consumer group rebalancing: at least one test kills and restarts a consumer mid-stream and asserts no loss, no double-effect

## Checklist

- [ ] Testcontainers broker per suite; unique topics per test; prod-like producer configs
- [ ] Five consumer tests (happy, duplicate, out-of-order, poison->DLQ, replay) per topic
- [ ] Keying strategy asserted for order-dependent aggregates
- [ ] Schema compatibility gate in CI + oldest-retained-version deserialization fixture
- [ ] Critical sagas covered end-to-end incl. compensation path; rebalance test present
