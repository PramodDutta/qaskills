import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Kafka Java Spring Boot — Complete Guide 2026',
  description:
    'Master Testcontainers with Kafka in Java and Spring Boot. Real producer, consumer, and stream tests with Docker, KRaft mode, and CI/CD patterns.',
  date: '2026-05-04',
  category: 'Guide',
  content: `
# Testcontainers Kafka Java Spring Boot Complete Guide

Apache Kafka is the backbone of event-driven architectures at virtually every large software company. Testing Kafka-dependent code reliably has been a long-standing challenge — embedded Kafka brokers via spring-kafka-test or kafka-junit work, but they consume significant heap memory, often pin to outdated Kafka versions, and behave subtly differently from real brokers in areas like offset management, consumer group coordination, and Streams topology. Testcontainers solves this by spinning up a real Apache Kafka broker in a Docker container, programmatically managed by your test runner, with one-line setup.

This guide is a hands-on walkthrough of Testcontainers with Kafka for Java and Spring Boot in 2026. We cover the official KafkaContainer module with KRaft mode (no Zookeeper required), Spring Boot integration via @DynamicPropertySource, producer and consumer testing, Kafka Streams testing, schema registry integration, container reuse for fast local dev, and CI/CD configuration. Every code sample is working Java with JUnit 5 and Spring Boot 3.

---

## Key Takeaways

- **KafkaContainer** provides one-line setup for real Apache Kafka in KRaft mode (no Zookeeper)
- **@DynamicPropertySource** is the Spring Boot integration mechanism for injecting broker URL into the application context
- **Producer tests** should use synchronous send to verify offset assignment
- **Consumer tests** need careful poll timeout configuration
- **Streams tests** can use Testcontainers or the topology test driver — both have their place
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Why Testcontainers for Kafka

The traditional alternatives all have issues. spring-kafka-test's EmbeddedKafkaBroker uses an outdated Kafka version, consumes 500 MB+ of JVM heap, and lacks fidelity for newer features (KRaft, tiered storage). kafka-junit has the same problems plus is largely unmaintained. The Kafka Topology Test Driver works for Streams unit tests but cannot test full producer-broker-consumer flows.

Testcontainers gives you a real Kafka broker per test suite, with the exact version you deploy to production, automatic cleanup, and one-line setup.

---

## Installation

Maven:

\`\`\`xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>kafka</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.springframework.kafka</groupId>
  <artifactId>spring-kafka</artifactId>
</dependency>
\`\`\`

Gradle:

\`\`\`gradle
testImplementation 'org.testcontainers:junit-jupiter:1.20.4'
testImplementation 'org.testcontainers:kafka:1.20.4'
implementation 'org.springframework.kafka:spring-kafka'
\`\`\`

Verify Docker with \`docker info\`.

---

## Your First Test

\`\`\`java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Properties;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class KafkaIntegrationTest {

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.1")
    );

    @Test
    void producesAndConsumes() {
        // Producer
        Properties producerProps = new Properties();
        producerProps.put("bootstrap.servers", KAFKA.getBootstrapServers());
        producerProps.put("key.serializer", StringSerializer.class.getName());
        producerProps.put("value.serializer", StringSerializer.class.getName());

        try (Producer<String, String> producer = new KafkaProducer<>(producerProps)) {
            producer.send(new ProducerRecord<>("test-topic", "key1", "hello")).get();
            producer.flush();
        } catch (Exception e) {
            fail(e);
        }

        // Consumer
        Properties consumerProps = new Properties();
        consumerProps.put("bootstrap.servers", KAFKA.getBootstrapServers());
        consumerProps.put("group.id", "test-group");
        consumerProps.put("auto.offset.reset", "earliest");
        consumerProps.put("key.deserializer", StringDeserializer.class.getName());
        consumerProps.put("value.deserializer", StringDeserializer.class.getName());

        try (Consumer<String, String> consumer = new KafkaConsumer<>(consumerProps)) {
            consumer.subscribe(Collections.singleton("test-topic"));
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(5));
            assertEquals(1, records.count());
            assertEquals("hello", records.iterator().next().value());
        }
    }
}
\`\`\`

The \`@Testcontainers\` annotation manages container lifecycle. The container starts before tests and stops after.

---

## Spring Boot Integration

Use \`@DynamicPropertySource\` to inject the broker URL into Spring's environment:

\`\`\`java
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.beans.factory.annotation.Autowired;

@SpringBootTest
@Testcontainers
class OrderEventTest {

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.1")
    );

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Test
    void publishesOrderEvent() {
        kafkaTemplate.send("orders", "order-1", "{\\"id\\":1}");
    }
}
\`\`\`

---

## KafkaContainer API Reference

| Method | Purpose |
|---|---|
| \`new KafkaContainer(image)\` | Constructor |
| \`.withKraft()\` | Enable KRaft mode (default in newer images) |
| \`.withReuse(true)\` | Reuse container across runs |
| \`.withEnv(name, value)\` | Set env vars |
| \`.start()\` | Boot container |

After start:

| Method | Returns |
|---|---|
| \`getBootstrapServers()\` | bootstrap.servers value like \`PLAINTEXT://localhost:32768\` |
| \`getHost()\` | Hostname |
| \`getMappedPort(9093)\` | Kafka port |

---

## Testing Producer

\`\`\`java
@Test
void producesWithKey() throws Exception {
    Properties props = new Properties();
    props.put("bootstrap.servers", KAFKA.getBootstrapServers());
    props.put("key.serializer", StringSerializer.class.getName());
    props.put("value.serializer", StringSerializer.class.getName());
    props.put("acks", "all");
    props.put("enable.idempotence", "true");

    try (Producer<String, String> producer = new KafkaProducer<>(props)) {
        RecordMetadata metadata = producer.send(
            new ProducerRecord<>("orders", "order-1", "data")
        ).get();
        assertNotNull(metadata);
        assertEquals(0, metadata.partition());
        assertTrue(metadata.offset() >= 0);
    }
}
\`\`\`

---

## Testing Consumer

\`\`\`java
@Test
void consumesWithCommit() {
    Properties props = new Properties();
    props.put("bootstrap.servers", KAFKA.getBootstrapServers());
    props.put("group.id", "test-consumer-" + System.currentTimeMillis());
    props.put("auto.offset.reset", "earliest");
    props.put("enable.auto.commit", "false");
    props.put("key.deserializer", StringDeserializer.class.getName());
    props.put("value.deserializer", StringDeserializer.class.getName());

    try (Consumer<String, String> consumer = new KafkaConsumer<>(props)) {
        consumer.subscribe(Collections.singleton("orders"));

        // Wait for messages
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(10));

        for (ConsumerRecord<String, String> record : records) {
            // process
        }
        consumer.commitSync();
    }
}
\`\`\`

Use unique group IDs per test to avoid offset interference between tests.

---

## Testing Kafka Streams

For full streams tests, wire up a real broker:

\`\`\`java
@Test
void streamsTopologyWorks() {
    Properties props = new Properties();
    props.put("application.id", "test-app-" + System.currentTimeMillis());
    props.put("bootstrap.servers", KAFKA.getBootstrapServers());
    props.put("default.key.serde", Serdes.String().getClass().getName());
    props.put("default.value.serde", Serdes.String().getClass().getName());

    StreamsBuilder builder = new StreamsBuilder();
    builder.stream("input")
        .mapValues(v -> v.toUpperCase())
        .to("output");

    try (KafkaStreams streams = new KafkaStreams(builder.build(), props)) {
        streams.start();
        // produce to input, consume from output, assert
    }
}
\`\`\`

For unit-style topology tests where you don't need a real broker, prefer TopologyTestDriver — it's faster.

---

## Schema Registry

For Avro/Protobuf with Confluent Schema Registry, run it as a separate container:

\`\`\`java
static Network network = Network.newNetwork();

@Container
static final KafkaContainer KAFKA = new KafkaContainer(
    DockerImageName.parse("confluentinc/cp-kafka:7.6.1")
).withNetwork(network).withNetworkAliases("kafka");

@Container
static final GenericContainer<?> SCHEMA_REGISTRY = new GenericContainer<>(
    DockerImageName.parse("confluentinc/cp-schema-registry:7.6.1")
).withNetwork(network)
 .withEnv("SCHEMA_REGISTRY_HOST_NAME", "schema-registry")
 .withEnv("SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS", "PLAINTEXT://kafka:9092")
 .withExposedPorts(8081);
\`\`\`

---

## Per-Test Isolation

Use unique topics or consumer groups per test:

\`\`\`java
String topic = "test-" + UUID.randomUUID();
\`\`\`

Or delete topics between tests using AdminClient:

\`\`\`java
@AfterEach
void cleanup() throws Exception {
    Properties props = new Properties();
    props.put("bootstrap.servers", KAFKA.getBootstrapServers());
    try (AdminClient admin = AdminClient.create(props)) {
        admin.deleteTopics(Set.of(topic)).all().get();
    }
}
\`\`\`

---

## Container Reuse

\`\`\`java
@Container
static final KafkaContainer KAFKA = new KafkaContainer(
    DockerImageName.parse("confluentinc/cp-kafka:7.6.1")
).withReuse(true);
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
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - uses: actions/cache@v4
        with:
          path: ~/.m2/repository
          key: \${{ runner.os }}-maven-\${{ hashFiles('**/pom.xml') }}
      - run: ./mvnw test
\`\`\`

---

## Common Pitfalls

**Bootstrap servers format.** Kafka in Testcontainers exposes \`PLAINTEXT://host:port\`. Don't strip the \`PLAINTEXT://\` prefix when configuring producers/consumers.

**Consumer group offsets.** Without auto.offset.reset=earliest, new consumer groups start at the latest offset and may miss messages produced before the consumer started.

**Polling timeouts.** Use generous poll timeouts (5-10 seconds) because container-based Kafka can be slow on first poll.

**KRaft vs Zookeeper.** Recent KafkaContainer versions default to KRaft (no Zookeeper). If you need Zookeeper for legacy reasons, use \`confluentinc/cp-kafka:6.x\` images.

---

## Conclusion

Testcontainers with Kafka transforms event-driven Java testing. Real brokers, real producer-consumer flows, real Streams topologies — all isolated per test suite with one-line setup. Spring Boot integration via @DynamicPropertySource is trivial. CI/CD requires no configuration.

Explore the [QA skills directory](/skills) for related event-driven testing patterns, or check our [RabbitMQ guide](/blog/testcontainers-rabbitmq-node-integration-testing) for AMQP-based messaging.
`,
};
