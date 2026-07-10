import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Kafka Contract Testing with Schema Registry',
  description:
    'Kafka contract testing with Schema Registry guide for safe Avro evolution, producer checks, consumer compatibility gates, and cleaner CI releases.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# Kafka Contract Testing with Schema Registry

A Kafka topic can look healthy while the product is already broken. Brokers accept bytes, producers keep publishing, consumers keep polling, and the first visible failure may be a deserializer exception buried in a retry loop. Schema Registry gives event teams a better contract boundary: schemas become versioned, compatibility can be checked before deployment, and the contract is enforced where producers and consumers actually meet.

Kafka contract testing is different from HTTP contract testing. There is no request-response pair to replay. Consumers may lag by hours. Multiple services may read the same topic with different release cadences. An event that is safe for one consumer can still break another if it changes semantics behind a compatible schema.

This guide focuses on Avro with Confluent-compatible Schema Registry because that is the common enterprise setup for event compatibility. The same testing discipline applies to Protobuf and JSON Schema, but the compatibility rules differ. If you need a runnable broker in test suites, pair this with the [Testcontainers Kafka Java Spring Boot guide](/blog/testcontainers-kafka-java-spring-boot-guide). If your concern is ownership and governance across systems, read the [data contract testing guide](/blog/data-contract-testing-guide-2026).

## The Contract Lives at the Subject

Schema Registry stores schemas under subjects. A subject is the versioned contract name that producers and consumers use through serializers and deserializers. The common default for Kafka value schemas is \`<topic>-value\`, for example \`orders-value\`. Key schemas typically use \`<topic>-key\`.

That subject naming choice is not cosmetic. It defines the blast radius of a compatibility check. If every producer on a topic uses the same \`orders-value\` subject, all records on that topic must evolve under one schema line. If producers use record-name strategies, the same topic can carry multiple record contracts. That can be useful, but consumers must then understand what they are subscribing to.

| Subject strategy | What it couples | Testing consequence |
|---|---|---|
| Topic name value | One value schema lineage per topic | CI checks are simple, but mixed event types are awkward |
| Record name | One schema lineage per fully qualified Avro record | Topic can carry different record types, but consumers need clearer filtering |
| Topic record name | Record lineage scoped by topic | Safer for reused record names, more subjects to govern |
| Key subject | Key format for partitioning and lookups | Breaking key changes can disrupt ordering and compaction |

Most teams should start with topic value subjects unless they intentionally run multi-event topics. The test suite should reflect the chosen strategy. A compatibility test that posts to the wrong subject gives false confidence.

## Compatibility Modes Are Release Policy

Schema Registry compatibility modes are not abstract Avro theory. They encode how producers and consumers may deploy independently.

| Mode | Practical meaning | Common use |
|---|---|---|
| \`BACKWARD\` | New consumers can read data written with the previous schema | Default for many Schema Registry setups |
| \`BACKWARD_TRANSITIVE\` | New consumers can read data from all previous schema versions | Long retention topics and slow backfills |
| \`FORWARD\` | Old consumers can read data written with the new schema | Producer-first releases where consumers lag |
| \`FORWARD_TRANSITIVE\` | Old consumers can read data from all future-compatible versions | Rare, strict producer evolution |
| \`FULL\` | Both backward and forward with the previous version | Tighter rolling upgrade safety |
| \`FULL_TRANSITIVE\` | Both directions across all versions | Strongest evolution discipline, harder to change |
| \`NONE\` | Registry stores schemas without compatibility checks | Only acceptable for isolated experiments |

The key question is deployment order. If consumers deploy first, backward compatibility usually fits. If producers deploy first while old consumers keep running, forward or full compatibility may be needed. For compacted topics and replay-heavy systems, transitive modes are often worth the friction because very old data can still be consumed.

Do not treat \`BACKWARD\` as a universal default without checking retention and replay requirements. A consumer rebuilding state from a year of events may hit schema versions older than the latest previous version.

## Avro Changes That Usually Break or Pass

Avro compatibility has precise rules, but reviewers need a practical mental model. Adding an optional field with a default is usually safe. Removing a field can be safe for backward compatibility if readers do not require it. Renaming a field is dangerous unless aliases are used correctly. Changing a type is often breaking unless Avro supports a promotion path.

| Proposed change | Compatibility risk | Safer approach |
|---|---|---|
| Add field without default | Breaks readers using older data under backward checks | Add a default or make the field nullable with a default |
| Add nullable field with default null | Usually safe | Use a union such as \`["null", "string"]\` with \`default: null\` |
| Remove field | Depends on direction and readers | Keep field until consumers stop using it, then remove under policy |
| Rename field | Often breaking | Add alias and test real deserialization behavior |
| Change \`int\` to \`long\` | Often promotable for readers | Confirm with registry compatibility and consumer tests |
| Change enum symbols | High risk | Add symbols carefully, avoid removing active symbols |

Compatibility is necessary but not sufficient. A schema can be compatible while semantics break. Changing \`status\` from \`PAID\` to \`SETTLED\` may pass if both are strings, but consumers can still misroute events. That is where consumer examples and semantic contract tests matter.

## A Minimal Avro Event Contract

Start with a schema that reflects the event, not an internal database row. The event should describe something that happened or a state snapshot that consumers need. Here is an \`OrderCreated\` value schema with explicit defaults for evolvable fields.

\`\`\`json
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.qaskills.orders",
  "fields": [
    { "name": "order_id", "type": "string" },
    { "name": "customer_id", "type": "string" },
    { "name": "total_cents", "type": "long" },
    { "name": "currency", "type": "string", "default": "USD" },
    {
      "name": "coupon_code",
      "type": ["null", "string"],
      "default": null
    }
  ]
}
\`\`\`

The default on \`currency\` matters if older records did not include it. The nullable \`coupon_code\` field gives the producer room to publish absence without inventing an empty string convention. Consumers still need semantic tests for currency handling, but the schema is evolvable.

## Checking Compatibility Through the Registry API

The compatibility endpoint is the most direct CI gate. Post the proposed schema to \`/compatibility/subjects/{subject}/versions/latest\` and fail the build if the response says it is not compatible. This example assumes Schema Registry is running locally on port 8081 and the subject is \`orders-value\`.

\`\`\`bash
cat > /tmp/order-created-v2.avsc <<'JSON'
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.qaskills.orders",
  "fields": [
    { "name": "order_id", "type": "string" },
    { "name": "customer_id", "type": "string" },
    { "name": "total_cents", "type": "long" },
    { "name": "currency", "type": "string", "default": "USD" },
    { "name": "coupon_code", "type": ["null", "string"], "default": null },
    { "name": "sales_channel", "type": ["null", "string"], "default": null }
  ]
}
JSON

jq -Rs '{schema: .}' /tmp/order-created-v2.avsc \
  | curl -sS -X POST \
      -H 'Content-Type: application/vnd.schemaregistry.v1+json' \
      --data @- \
      http://localhost:8081/compatibility/subjects/orders-value/versions/latest
\`\`\`

A compatible response contains \`"is_compatible": true\`. If the field is added without a default, a backward compatibility policy should reject it. Put this check in CI before image build or deployment. It is cheaper to fail a schema pull request than to discover a consumer crash after records are already written.

## Registering Schemas Is Not the Same as Testing Them

Registration stores a schema version and, depending on configuration, may enforce compatibility. Compatibility testing asks whether a proposed schema would be accepted. CI should usually test compatibility first, then allow deployment or controlled registration through a release pipeline.

\`\`\`bash
jq -Rs '{schema: .}' /tmp/order-created-v2.avsc \
  | curl -sS -X POST \
      -H 'Content-Type: application/vnd.schemaregistry.v1+json' \
      --data @- \
      http://localhost:8081/subjects/orders-value/versions
\`\`\`

Do not let every local test run register new schema versions against a shared development registry. That creates noisy version history and makes failures hard to reproduce. Use a disposable registry for integration tests, or use the compatibility endpoint in CI without registration when the goal is a gate.

## Producer Serialization Test With the Real Avro Serializer

Compatibility checks do not prove that producer code actually emits the expected record. Add a focused serialization test that uses the same serializer configuration as production. The following JUnit example uses Confluent's \`KafkaAvroSerializer\` with a mock registry URL scope.

\`\`\`java
import static org.assertj.core.api.Assertions.assertThat;

import io.confluent.kafka.serializers.KafkaAvroSerializer;
import java.util.HashMap;
import java.util.Map;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericData;
import org.apache.avro.generic.GenericRecord;
import org.junit.jupiter.api.Test;

class OrderCreatedSerializationTest {
  @Test
  void serializesOrderCreatedWithRegisteredSubject() {
    String schemaJson = """
      {
        "type": "record",
        "name": "OrderCreated",
        "namespace": "com.qaskills.orders",
        "fields": [
          { "name": "order_id", "type": "string" },
          { "name": "customer_id", "type": "string" },
          { "name": "total_cents", "type": "long" },
          { "name": "currency", "type": "string", "default": "USD" },
          { "name": "coupon_code", "type": ["null", "string"], "default": null }
        ]
      }
      """;

    Schema schema = new Schema.Parser().parse(schemaJson);
    GenericRecord record = new GenericData.Record(schema);
    record.put("order_id", "ord_123");
    record.put("customer_id", "cus_456");
    record.put("total_cents", 1299L);
    record.put("currency", "USD");
    record.put("coupon_code", null);

    Map<String, Object> config = new HashMap<>();
    config.put("schema.registry.url", "mock://order-contract-test");
    config.put("auto.register.schemas", true);

    KafkaAvroSerializer serializer = new KafkaAvroSerializer();
    serializer.configure(config, false);

    byte[] bytes = serializer.serialize("orders", record);

    assertThat(bytes).isNotEmpty();
    assertThat(bytes[0]).isZero();
  }
}
\`\`\`

The first byte assertion checks Confluent's wire format magic byte. This is not a full consumer test, but it catches common mistakes: wrong serializer, missing field values, invalid schema JSON, and configuration drift.

## Consumer Contract Examples Catch Semantic Breaks

Consumers need examples, not just schema validation. A fraud service may require \`total_cents\`, while an analytics service may care about \`sales_channel\`. Both consume \`orders-value\`, but their contract risk differs.

Create consumer-owned fixture events and deserialize them with the consumer's real reader code. Store fixtures as Avro JSON or binary fixtures produced through the same serializer path. The important part is ownership: the consumer team defines examples that represent what they need from the event.

For semantic compatibility, test expectations such as:

| Consumer expectation | Example assertion |
|---|---|
| Missing optional coupon means no discount | Consumer maps null coupon to empty discount state |
| Currency defaults to USD for older records | Reader handles records created before currency existed |
| Unknown sales channel does not crash analytics | Consumer stores unknown value in fallback bucket |
| Removed enum symbol is still observed in retained data | Consumer can process historical records or migration is planned |

Schema Registry will not know that \`coupon_code: ""\` is semantically different from \`coupon_code: null\`. Your consumer tests must.

## CI Design for Kafka Contract Checks

A useful Kafka contract pipeline has separate gates:

1. Lint schema files for formatting and naming.
2. Check compatibility against the target subject and environment policy.
3. Run producer serialization tests with the real serializer.
4. Run consumer example tests for events the consumer claims to support.
5. Register or promote schemas through a controlled release job.

Avoid connecting feature branch tests to production Schema Registry with write permissions. Read-only compatibility checks may be acceptable if credentials and subject names are controlled. For many teams, a staging registry seeded from production schema history is safer.

| Pipeline stage | Fails when | Owner |
|---|---|---|
| Schema lint | Namespace, field names, or defaults violate local standards | Event platform or producer team |
| Registry compatibility | Proposed schema violates subject compatibility mode | Producer team |
| Producer serialization | Code cannot serialize the claimed event | Producer team |
| Consumer examples | Consumer cannot read required event shapes | Consumer team |
| Schema promotion | Approved schema cannot be registered in target registry | Release owner |

This structure prevents a common anti-pattern: a producer says "the registry accepted it" while consumers say "the event broke us." Both checks matter, and they answer different questions.

## Handling Tombstones, Keys, and Compacted Topics

Compacted topics add contract risk beyond the value schema. A tombstone is a record with a key and a null value. Consumers of compacted topics must handle null values intentionally. Producers must keep key schemas stable enough that records for the same entity compact correctly.

Test key schemas with the same seriousness as value schemas. A change from \`customer_id\` to \`account_id\` can be schema-compatible if both are strings, but it may destroy compaction behavior. For compacted topics, add tests that publish two records with the same logical key and verify the consumer's final state.

If your serializer permits null values for tombstones, make that explicit in producer tests. Do not let a null pointer exception be the first tombstone test.

## Multi-Format Registries

Schema Registry supports Avro, JSON Schema, and Protobuf in Confluent-compatible deployments, but their compatibility details differ. Avro defaults and unions are not the same as Protobuf field numbering. JSON Schema can express constraints that have no Avro equivalent.

Do not copy an Avro compatibility checklist into a Protobuf project. For Protobuf, field numbers and reserved fields are central. For JSON Schema, required properties and additional properties deserve close review. The testing architecture can be similar, but the review criteria must match the format.

## Operational Signals From Contract Failures

When a compatibility check fails, the error should reach the people who can decide on release order. Sometimes the schema is simply wrong. Sometimes the compatibility mode is too weak or too strong for the topic. Sometimes a breaking change is intentional and needs a new subject, new topic, migration plan, or coordinated release.

Do not bypass the registry by disabling compatibility on a subject unless the topic is disposable. A better pattern is to create a new event type, introduce a parallel field, or publish both old and new events until consumers migrate. Kafka makes it easy to keep publishing. It does not make it easy to repair bad historical events.

## Testing Event Meaning Beyond Avro Shape

The registry can tell you whether a record can be read. It cannot tell you whether the record still means what consumers think it means. That gap is where many Kafka contract incidents happen. A field named \`state\` may remain a string while the producer silently changes values from \`pending\` and \`paid\` to \`created\` and \`settled\`. Avro compatibility passes, but downstream dashboards, fraud rules, and support workflows can drift.

For important events, add semantic examples owned by the producer and reviewed by consumers. These examples should include the business vocabulary, not only syntactic field coverage. If an order can be cancelled after payment, include that event. If refunds can be partial, include one. If \`total_cents\` excludes tax in one region and includes it in another, the schema needs documentation and the tests need examples.

| Semantic risk | Contract example to add | Reviewer |
|---|---|---|
| Status vocabulary changes | Event with every active status value | Consumer teams using status branches |
| Money field meaning shifts | Event with subtotal, tax, discount, and total | Finance or billing owner |
| Identifier changes | Event using legacy and new identifier formats | Data platform and downstream owners |
| Optional field becomes operationally required | Event without the optional field | Slowest-moving consumer |
| Timestamp interpretation changes | Event around timezone or daylight boundary | Analytics owner |

Keep these examples close to the schema. A schema repository that includes only \`.avsc\` files tells reviewers too little. A schema repository with examples, compatibility tests, and owner metadata becomes a real contract workspace.

## Ownership Metadata Prevents Orphaned Subjects

Schema subjects need owners. Without ownership metadata, a breaking change review turns into archaeology. Add a small manifest for each event family that names the producing service, consumer contacts, compatibility mode, retention expectation, and replay requirement. This is not for bureaucracy. It tells the CI gate which subject to check and tells humans who must approve a semantic change.

The manifest does not need to be complex. A few fields are enough: subject, topic, format, owner, consumers, compatibility, retention, and examples path. Review the manifest whenever a new consumer is added. Otherwise the producer may believe a change has one downstream reader when it has seven.

## Frequently Asked Questions

### Should Kafka contract tests hit a real Schema Registry?

At least one CI gate should check the same compatibility rules as the target registry. That can be a staging registry seeded with production schemas or a real registry endpoint with read-only compatibility checks. Unit tests can use mocks, but release gates should exercise registry behavior.

### Is Avro backward compatibility enough for Kafka consumers?

Not always. Backward compatibility says a new reader can read older data for the checked version scope. It does not prove old consumers can read new producer data, and it does not validate semantic expectations such as enum meaning or currency behavior.

### Should producers auto-register schemas in production?

Many teams disable automatic registration in production and promote schemas through CI or release automation. Auto-registration is convenient during development, but controlled registration gives better review, auditability, and rollback planning.

### How do I test a breaking event change safely?

Use a new subject or topic, or run a parallel field or event version while consumers migrate. Keep contract tests for both old and new shapes during the transition. Turning compatibility to \`NONE\` should be a last resort for non-critical topics.

### Do Kafka contract tests replace end-to-end event tests?

No. Contract tests protect schema and consumer expectations cheaply. End-to-end event tests still matter for broker configuration, topic permissions, partitioning, retries, and the actual producer-consumer path. Keep the end-to-end set small and representative.
`,
};
