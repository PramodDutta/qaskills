import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'NATS Event Stream Testing Guide',
  description:
    'Test NATS event streams and JetStream consumers for ordering, acknowledgments, retries, durability, subject contracts, and safe replay behavior.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# NATS Event Stream Testing Guide

A service publishes order.created, the fulfillment worker never sees it, and the API test still passes. That is the shape of many event-driven failures. The HTTP boundary accepted the command. The database row exists. The missing behavior lives in the stream: subject names, publish acknowledgment, consumer configuration, redelivery, ordering, and durable state.

NATS makes eventing feel simple, which is one of its strengths. Core NATS gives fast subject-based pub-sub. JetStream adds persistence, consumers, acknowledgments, replay, and durability. Testing needs to respect that distinction. A Core NATS subscriber test cannot prove a JetStream consumer will redeliver unacked messages. A JetStream publish acknowledgment cannot prove every downstream worker handled the event correctly.

This guide focuses on practical tests for NATS and JetStream: subject contracts, ordering from one publisher, durable consumer behavior, ack and redelivery, and event payload validation. For event schema governance, connect this with [AsyncAPI event-driven testing](/blog/asyncapi-event-driven-testing-guide-2026). For larger system design tradeoffs, see [event-driven architecture testing](/blog/event-driven-architecture-testing-guide).

## Know whether you are testing Core NATS or JetStream

Core NATS is a lightweight pub-sub transport. If a subscriber is offline, it does not receive messages published while it was away. JetStream stores messages in streams and delivers them to consumers according to configuration. Mixing these assumptions creates bad tests.

| Capability | Core NATS | JetStream | Testing implication |
|---|---|---|---|
| Offline delivery | No | Yes, through streams and consumers | Use JetStream for durability tests |
| Publish acknowledgment | Flush confirms server processed protocol commands | JetStream publish returns storage acknowledgment | Use JetStream publish when persistence matters |
| Redelivery after missing ack | No | Yes, with explicit ack policies | Test consumer retry behavior in JetStream |
| Replay historical messages | No | Yes, based on consumer deliver policy | Test catch-up consumers with stored fixtures |
| Very low-latency pub-sub | Yes | Yes, with persistence overhead | Keep realtime smoke tests small |

The first test design question should be: is this behavior about transport or persistence? If the product promise is "connected clients receive a live price update", Core NATS may be enough. If the promise is "billing eventually processes every invoice event", use JetStream.

## Subject names are contracts

NATS subjects are not just routing strings. They are the API surface for event consumers. A publisher changing orders.created to order.created can break downstream systems without changing a protobuf or OpenAPI file. Test subject naming intentionally.

| Subject pattern | Good use | Risk to test |
|---|---|---|
| orders.created | One event type | Publisher typo or pluralization drift |
| orders.* | Small family of order events | Consumer accidentally receives unsupported event |
| tenant.us.orders.created | Tenant or region partitioning | Wrong tenant segment leaks event |
| payments.failed.card | Specific failure domain | Consumers subscribe too broadly |
| internal.audit.> | Broad audit capture | Test tools accidentally consume sensitive internal traffic |

Keep subject patterns documented near event schemas. If the team uses AsyncAPI, make the NATS subject the channel name or an explicit binding. If not, at least maintain a small contract file listing subjects, payload schema, and owning service.

## Core NATS publish-subscribe smoke test

Start with a connected-client smoke test for subjects that are meant to be live only. The Go client makes the semantics clear: subscribe, publish, flush, and read from the subscription.

\`\`\`go
package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

type OrderCreated struct {
	OrderID string \`json:"orderId"\`
	Total  int    \`json:"totalCents"\`
}

func main() {
	nc, err := nats.Connect("nats://127.0.0.1:4222")
	if err != nil {
		panic(err)
	}
	defer nc.Drain()

	sub, err := nc.SubscribeSync("orders.created")
	if err != nil {
		panic(err)
	}

	event := OrderCreated{OrderID: "ord-1001", Total: 4900}
	body, _ := json.Marshal(event)

	if err := nc.Publish("orders.created", body); err != nil {
		panic(err)
	}
	if err := nc.Flush(); err != nil {
		panic(err)
	}

	msg, err := sub.NextMsg(2 * time.Second)
	if err != nil {
		panic(err)
	}

	var received OrderCreated
	if err := json.Unmarshal(msg.Data, &received); err != nil {
		panic(err)
	}
	if received.OrderID != "ord-1001" {
		panic("wrong order id")
	}

	fmt.Println("received " + received.OrderID)
}
\`\`\`

This test proves the subject and payload can move through a running NATS server with a connected subscriber. It does not prove durability. That is acceptable if the event is live-only. It is inadequate for invoice processing, fulfillment, audit, or anything else that must survive a consumer restart.

## JetStream stream and durable consumer test

For durable processing, test JetStream explicitly. A stream stores matching subjects. A durable consumer tracks delivery and acknowledgment state. The following Go example creates a stream, publishes an event, pulls it through a durable consumer, and acknowledges it.

\`\`\`go
package main

import (
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

func main() {
	nc, err := nats.Connect("nats://127.0.0.1:4222")
	if err != nil {
		panic(err)
	}
	defer nc.Drain()

	js, err := nc.JetStream()
	if err != nil {
		panic(err)
	}

	_, _ = js.AddStream(&nats.StreamConfig{
		Name:     "ORDERS",
		Subjects: []string{"orders.*"},
	})

	_, _ = js.AddConsumer("ORDERS", &nats.ConsumerConfig{
		Durable:       "qa_processor",
		AckPolicy:     nats.AckExplicitPolicy,
		FilterSubject: "orders.created",
		AckWait:       500 * time.Millisecond,
	})

	ack, err := js.Publish("orders.created", []byte(\`{"orderId":"ord-2001","totalCents":9900}\`))
	if err != nil {
		panic(err)
	}
	if ack.Stream != "ORDERS" {
		panic("message was not stored in ORDERS stream")
	}

	sub, err := js.PullSubscribe("orders.created", "qa_processor")
	if err != nil {
		panic(err)
	}

	msgs, err := sub.Fetch(1, nats.MaxWait(2*time.Second))
	if err != nil {
		panic(err)
	}
	if len(msgs) != 1 {
		panic("expected one message")
	}

	if err := msgs[0].Ack(); err != nil {
		panic(err)
	}

	fmt.Println("acked durable order event")
}
\`\`\`

The publish acknowledgment proves the server stored the event in the stream. The consumer fetch proves the durable can receive it. The explicit ack proves the consumer completed processing. That is the minimum path for a JetStream contract test.

## Redelivery tests for missed acknowledgments

At-least-once delivery means consumers must tolerate duplicates. JetStream can redeliver when a message is not acknowledged within the configured wait. Your tests should prove both sides of that rule: unacked messages return, and acked messages do not.

\`\`\`go
package main

import (
	"time"

	"github.com/nats-io/nats.go"
)

func main() {
	nc, err := nats.Connect("nats://127.0.0.1:4222")
	if err != nil {
		panic(err)
	}
	defer nc.Drain()

	js, err := nc.JetStream()
	if err != nil {
		panic(err)
	}

	_, _ = js.AddStream(&nats.StreamConfig{Name: "PAYMENTS", Subjects: []string{"payments.*"}})
	_, _ = js.AddConsumer("PAYMENTS", &nats.ConsumerConfig{
		Durable:       "qa_redelivery",
		AckPolicy:     nats.AckExplicitPolicy,
		FilterSubject: "payments.failed",
		AckWait:       250 * time.Millisecond,
	})

	_, err = js.Publish("payments.failed", []byte(\`{"paymentId":"pay-1"}\`))
	if err != nil {
		panic(err)
	}

	sub, err := js.PullSubscribe("payments.failed", "qa_redelivery")
	if err != nil {
		panic(err)
	}

	first, err := sub.Fetch(1, nats.MaxWait(time.Second))
	if err != nil || len(first) != 1 {
		panic("expected first delivery")
	}

	time.Sleep(400 * time.Millisecond)

	second, err := sub.Fetch(1, nats.MaxWait(time.Second))
	if err != nil || len(second) != 1 {
		panic("expected redelivery after missing ack")
	}

	if err := second[0].Ack(); err != nil {
		panic(err)
	}
}
\`\`\`

This test should run in an isolated stream or namespace. Redelivery tests deliberately leave a message unacked, which can pollute shared consumers if you run them against a common development stream.

## Ordering expectations without overclaiming

NATS preserves order from a single publisher to a single subject under normal connected operation. Distributed systems still need precision. Do not claim global ordering across multiple publishers unless your design enforces it. JetStream sequences are stream-level storage positions, not a business guarantee that two producers coordinated.

| Ordering claim | Reasonable test | Warning |
|---|---|---|
| One publisher emits order lifecycle events in order | Publish created, paid, fulfilled from one connection and assert sequence | Does not prove ordering across services |
| One consumer processes a durable stream sequentially | Pull messages and ack one at a time | Parallel workers may reorder side effects |
| Per-order ordering | Partition subject by order ID or enforce sequence field | Plain wildcard subjects do not create per-key ordering |
| Replay order | Check JetStream sequence or business sequence on replay | Retention and consumer config affect what is replayed |
| Cross-region ordering | Test with explicit design constraints | Do not assume it from subject names |

If ordering matters to the business, put a sequence number or version in the event. Then test that consumers reject, buffer, or handle out-of-order versions according to policy.

## Payload validation at the stream boundary

NATS does not impose JSON, Avro, protobuf, or schema validation by itself. Your publishers and consumers must agree. Testing should validate payloads before publish and after receive. If the organization uses AsyncAPI, generate validators or at least keep schemas close to the tests.

For JSON payloads, a contract test can unmarshal into a typed struct and check required fields. That catches missing orderId or totalCents before downstream code fails later. For protobuf, decode with the generated message type. The exact encoding matters less than the discipline: event payloads are contracts.

## Test environment design

Use disposable streams when possible. Prefix subjects with a test run ID or use account-level isolation. Clean up durable consumers after tests if they are not meant to persist. Avoid running destructive stream tests against shared developer streams.

A reliable local setup usually starts NATS with JetStream enabled in Docker or a local binary. Tests should wait for the server to accept connections before publishing. If the NATS server is part of your app's docker compose file, expose a test subject namespace so contract tests do not interfere with developers.

## Failure reporting that helps operators

When a NATS stream test fails, include the subject, stream name, durable name, expected payload key, and whether the failure occurred before publish ack, before delivery, or after processing. "Expected event not found" is not enough.

Useful failure facts:

1. Published subject and payload key.
2. JetStream stream that accepted or rejected the publish.
3. Consumer durable and filter subject.
4. Ack policy and AckWait for redelivery tests.
5. Last message data or sequence seen by the test.

This information shortens the path from QA failure to broker configuration or application fix.

## Testing queue groups and competing workers

Core NATS queue groups and JetStream durable consumers are common ways to distribute work. They introduce a different testing question: did one worker process the message, not all workers, and did failed work become available again? A pub-sub smoke test with one subscriber cannot answer that.

For Core NATS queue groups, start two subscribers on the same queue group, publish several messages, and assert that each message is handled once by the group. Do not assert perfectly even distribution. Load balancing is not a fairness guarantee. Assert no duplicate side effect for the same message key.

For JetStream workers, use a durable pull consumer and multiple workers fetching from it. The application must be idempotent because redelivery can happen after timeout, crash, or nack. Your test should simulate one worker receiving a message and failing before ack, then another worker receiving the redelivery and completing it. The pass condition is the business side effect once, not simply "a message was redelivered."

## Headers and correlation IDs

NATS messages can carry headers. Many production systems use them for correlation IDs, tenant IDs, schema versions, causation IDs, or trace propagation. If consumers rely on headers, make them part of the event contract. A payload-only test can pass while distributed tracing, tenant routing, or schema dispatch fails.

Test required headers at the boundary. Publish a valid payload without the schema version header and assert the consumer rejects or dead-letters it according to policy. Publish with a correlation ID and assert the downstream command or log entry preserves it. Keep header names consistent and avoid spreading string literals across every test.

## Replay and retention checks

JetStream replay is powerful, but retention policies decide what is available. A test that creates a stream with unlimited retention says little about production if production uses max age, max messages, or interest-based retention. Include at least one configuration-level test or deployment check that verifies critical streams have the intended retention and storage policy.

Replay tests should use a small sequence: publish three events, create a new consumer with the expected deliver policy, fetch the messages, and assert the business keys in order. Then document what should happen after retention expires. If the product promises seven-day replay, a deployment validation should check that stream configuration supports that promise.

## Dead-letter and poison-message behavior

Every event system eventually receives a message the consumer cannot process: invalid schema, unknown enum, missing tenant, or downstream dependency failure. NATS itself will not invent your dead-letter policy. Your application and JetStream configuration need one.

Tests should distinguish transient failure from poison data. A transient database timeout may deserve nack or no ack so redelivery occurs. An invalid payload may deserve ack plus publish to a dead-letter subject so it does not block the consumer forever. Assert the subject, payload key, error reason, and original correlation ID on the dead-letter event. This turns a production mystery into a visible contract.

## Consumer lag as a test signal

Consumer lag is not only an operations metric. It can be a regression signal when a code change slows processing or stops acknowledgments. In test environments, publish a bounded set of messages, let the worker process them, and check that the durable consumer catches up. If lag remains, the worker may be failing silently, holding messages without ack, or filtering the wrong subject.

Do not assert production-scale throughput in a contract test. Assert that a small batch drains within a practical window and that each business key is processed once. Throughput belongs in performance testing. Lag-to-zero belongs in integration testing because it proves the worker can make progress.

For scheduled jobs that replay JetStream history, add a catch-up scenario. Create a consumer after messages already exist, fetch the stored sequence, and verify the worker handles historical messages the same way it handles live ones. Many defects appear only during replay because code assumes "now" instead of using event time.

## Schema evolution on NATS subjects

Subject stability does not remove payload evolution. If orders.created version two adds taxCents, old consumers may ignore it safely. If it renames orderId, old consumers break. Put schema version in the payload or headers and test both old and new consumers during migration.

During rollout, publish compatibility fixtures for both versions into an isolated stream. Consumers should either process supported versions or reject unsupported versions through the documented dead-letter path. Silent acceptance of an unknown version is worse than a clear failure because it creates corrupted downstream state.

## Frequently Asked Questions

### Should I use Core NATS or JetStream for tests?

Use Core NATS tests for live pub-sub behavior where offline delivery is not required. Use JetStream tests when persistence, replay, acknowledgment, redelivery, or durable consumers are part of the product promise.

### How do I test that a message was really persisted?

Publish through the JetStream context and check the publish acknowledgment. Then fetch the message through a consumer. A plain Core NATS publish plus flush does not prove persistence.

### Can I rely on exactly-once processing with JetStream?

Design consumers as idempotent. JetStream gives durable delivery and acknowledgment controls, but at-least-once workflows can redeliver. Your application should tolerate duplicate messages.

### Why do redelivery tests sometimes affect later tests?

They intentionally leave messages unacked. If the stream or durable consumer is shared, that state remains. Use isolated streams, unique durable names, or cleanup routines for redelivery scenarios.

### What should be in a NATS event contract?

Include subject, payload schema, encoding, required headers if any, ordering expectations, durability expectations, and consumer acknowledgment behavior. The subject alone is not enough.
`,
};
